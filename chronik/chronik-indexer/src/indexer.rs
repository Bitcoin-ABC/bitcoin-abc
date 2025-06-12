// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module containing [`ChronikIndexer`] to index blocks and txs.

use std::{collections::BTreeMap, io::Write, path::PathBuf, sync::Arc};

use abc_rust_error::{Result, WrapErr};
use bitcoinsuite_core::{
    block::BlockHash,
    tx::{Tx, TxId},
};
use bytes::Bytes;
use chronik_bridge::{ffi, util::expect_unique_ptr};
use chronik_db::{
    db::{Db, WriteBatch},
    groups::{
        LokadIdGroup, LokadIdHistoryReader, LokadIdHistoryWriter, ScriptGroup,
        ScriptHistoryWriter, ScriptUtxoWriter, TokenIdGroup, TokenIdGroupAux,
        TokenIdHistoryWriter, TokenIdUtxoWriter,
    },
    index_tx::{
        prepare_indexed_txs_cached, PrepareUpdateMode, TxNumCacheSettings,
    },
    io::{
        merge,
        token::{ProcessedTokenTxBatch, TokenWriter},
        BlockHeight, BlockReader, BlockStatsWriter, BlockTxs, BlockWriter,
        DbBlock, GroupHistoryMemData, GroupHistorySettings, GroupUtxoMemData,
        MetadataReader, MetadataWriter, SchemaVersion, SpentByWriter, TxEntry,
        TxNum, TxReader, TxWriter, UpgradeWriter,
    },
    mem::{MemData, MemDataConf, Mempool, MempoolTx},
    plugins::{PluginMeta, PluginsGroup, PluginsReader, PluginsWriter},
};
use chronik_plugin::{
    context::PluginContext, data::PluginNameMap, plugin::Plugin,
};
use chronik_util::{log, log_chronik};
use thiserror::Error;
use tokio::sync::{Mutex, RwLock};

use crate::{
    avalanche::Avalanche,
    indexer::ChronikIndexerError::*,
    merkle::MerkleTree,
    query::{
        QueryBlocks, QueryBroadcast, QueryGroupHistory, QueryGroupUtxos,
        QueryPlugins, QueryTxs, UtxoProtobufOutput, UtxoProtobufValue,
    },
    subs::{BlockMsg, BlockMsgType, Subs},
    subs_group::TxMsgType,
};

const CURRENT_INDEXER_VERSION: SchemaVersion = 13;
const LAST_UPGRADABLE_VERSION: SchemaVersion = 10;

/// Function ptr to decompress script scripts
pub type DecompressScriptFn = fn(&[u8]) -> Result<Vec<u8>>;

/// Params for setting up a [`ChronikIndexer`] instance.
#[derive(Clone)]
pub struct ChronikIndexerParams {
    /// Folder where the node stores its data, net-dependent.
    pub datadir_net: PathBuf,
    /// Whether to clear the DB before opening the DB, e.g. when reindexing.
    pub wipe_db: bool,
    /// Whether Chronik should index SLP/ALP token txs.
    pub enable_token_index: bool,
    /// Whether Chronik should index txs by LOKAD ID.
    pub enable_lokad_id_index: bool,
    /// Whether Chronik should index scripts by script hash.
    pub enable_scripthash_index: bool,
    /// Whether to output Chronik performance statistics into a perf/ folder
    pub enable_perf_stats: bool,
    /// Settings for tuning TxNumCache.
    pub tx_num_cache: TxNumCacheSettings,
    /// Plugin context
    pub plugin_ctx: Arc<PluginContext>,
    /// Settings for script history indexing
    pub script_history: GroupHistorySettings,
    /// Function to decompress scripts
    pub decompress_script_fn: DecompressScriptFn,
}

/// Struct for indexing blocks and txs. Maintains db handles and mempool.
#[derive(Debug)]
pub struct ChronikIndexer {
    db: Db,
    mem_data: MemData,
    mempool: Mempool,
    script_group: ScriptGroup,
    avalanche: Avalanche,
    subs: RwLock<Subs>,
    perf_path: Option<PathBuf>,
    is_token_index_enabled: bool,
    is_lokad_id_index_enabled: bool,
    /// Whether the LOKAD ID index needs to be reindexed, will be set to
    /// `false` after it caught up with the rest of Chronik.
    needs_lokad_id_reindex: bool,
    is_scripthash_index_enabled: bool,
    needs_scripthash_reindex: bool,
    plugin_ctx: Arc<PluginContext>,
    plugin_name_map: PluginNameMap,
    block_merkle_tree: Mutex<MerkleTree>,
    /// Function that can decompress the compressed scripts used as keys in
    /// the script db. We inject it via the indexer struct to avoid
    /// introducing a dependency on chronik_bridge in other crates.
    pub decompress_script_fn: DecompressScriptFn,
}

/// Access to the bitcoind node.
#[derive(Debug)]
pub struct Node {
    /// FFI bridge to the node.
    pub bridge: cxx::UniquePtr<ffi::ChronikBridge>,
}

/// Block to be indexed by Chronik.
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct ChronikBlock {
    /// Data about the block (w/o txs)
    pub db_block: DbBlock,
    /// Txs in the block, with locations of where they are stored on disk.
    pub block_txs: BlockTxs,
    /// Block size in bytes.
    pub size: u64,
    /// Txs in the block, with inputs/outputs so we can group them.
    pub txs: Vec<Tx>,
}

/// Errors for [`BlockWriter`] and [`BlockReader`].
#[derive(Debug, Eq, Error, PartialEq)]
pub enum ChronikIndexerError {
    /// Failed creating the folder for the indexes
    #[error("Failed creating path {0}")]
    CreateDirFailed(PathBuf),

    /// Cannot rewind blocks that bitcoind doesn't have
    #[error(
        "Cannot rewind Chronik, it contains block {0} that the node doesn't \
         have. You may need to use -reindex/-chronikreindex, or delete \
         indexes/chronik and restart"
    )]
    CannotRewindChronik(BlockHash),

    /// Lower block doesn't exist but higher block does
    #[error(
        "Inconsistent DB: Block {missing} doesn't exist, but {exists} does"
    )]
    BlocksBelowMissing {
        /// Lower height that is missing
        missing: BlockHeight,
        /// Higher height that exists
        exists: BlockHeight,
    },

    /// Corrupted schema version
    #[error(
        "Corrupted schema version in the Chronik database, consider running \
         -reindex/-chronikreindex"
    )]
    CorruptedSchemaVersion,

    /// Missing schema version for non-empty database
    #[error(
        "Missing schema version in non-empty Chronik database, consider \
         running -reindex/-chronikreindex"
    )]
    MissingSchemaVersion,

    /// This Chronik instance is outdated
    #[error(
        "Chronik outdated: Chronik has version {current_indexer_version}, \
         but the database has version {0}. Upgrade your node to the \
         appropriate version.",
        current_indexer_version = CURRENT_INDEXER_VERSION,
    )]
    ChronikOutdated(SchemaVersion),

    /// Database is outdated
    #[error(
        "DB outdated: Chronik has version {CURRENT_INDEXER_VERSION}, but the \
         database has version {0}. The last upgradable version is \
         {LAST_UPGRADABLE_VERSION}. -reindex/-chronikreindex to reindex the \
         database to the new version."
    )]
    DatabaseOutdated(SchemaVersion),

    /// Cannot enable token index on a DB that previously had it disabled
    #[error(
        "Cannot enable -chroniktokenindex on a DB that previously had it \
         disabled. Provide -reindex/-chronikreindex to reindex the database \
         with token data, or specify -chroniktokenindex=0 to disable the \
         token index again."
    )]
    CannotEnableTokenIndex,

    /// Must enable -chroniklokadidindex
    #[error(
        "Plugin system requires the LOKAD ID index to be enabled, enable it \
         via -chroniklokadidindex"
    )]
    PluginSystemRequiresLokadIdIndex,

    /// Currently, plugins must match their version exactly
    #[error(
        "Cannot use different version for plugin {plugin_name:?}. Previously, \
         we indexed using version {db_version}, but now version \
         {loaded_version} has been loaded. This version of Chronik doesn't \
         support automatically updating plugins; either downgrade the plugin \
         or use -chronikreindex to reindex using the new version."
    )]
    PluginVersionMismatch {
        /// Name of the plugin that has a version mismatch
        plugin_name: String,
        /// Previously used version in the DB
        db_version: String,
        /// New version of the loaded plugin
        loaded_version: String,
    },

    /// Cannot load plugins as there's already matching txs in the DB
    #[error(
        "Loading plugins failed, there are already matching txs in the DB for \
         their LOKAD IDs, the earliest is in transaction {desync_txid} in \
         block {desync_hash} (height {desync_height}). Chronik is synced to \
         height {db_height}, but this version of Chronik doesn't support \
         automatically re-syncing plugins. Either disable the desynced \
         plugins, use -chronikreindex to reindex, or park the block and index \
         again."
    )]
    PluginsAlreadyHaveTxs {
        /// Height Chronik is synced to
        db_height: BlockHeight,
        /// TxId of the tx that has the LOKAD ID
        desync_txid: TxId,
        /// First block that has a LOKAD ID of a plugin
        desync_height: BlockHeight,
        /// Hash of the min LOKAD ID height
        desync_hash: BlockHash,
    },

    /// Inconsistent DB: Tx doesn't exist
    #[error("Inconsistent DB: Tx with tx_num {0} doesn't exist")]
    TxNotFound(TxNum),

    /// Inconsistent DB: Block doesn't exist
    #[error("Inconsistent DB: Block with height {0} doesn't exist")]
    BlockNotFound(BlockHeight),
}

impl ChronikIndexer {
    /// Setup the indexer with the given parameters, e.g. open the DB etc.
    pub fn setup(
        params: ChronikIndexerParams,
        load_tx: impl Fn(u32, u32, u32) -> Result<Tx>,
        shutdown_requested: impl Fn() -> bool,
    ) -> Result<Self> {
        let indexes_path = params.datadir_net.join("indexes");
        let perf_path = params.datadir_net.join("perf");
        if !indexes_path.exists() {
            std::fs::create_dir(&indexes_path)
                .wrap_err_with(|| CreateDirFailed(indexes_path.clone()))?;
        }
        if params.enable_perf_stats && !perf_path.exists() {
            std::fs::create_dir(&perf_path)
                .wrap_err_with(|| CreateDirFailed(perf_path.clone()))?;
        }
        let db_path = indexes_path.join("chronik");
        if params.wipe_db {
            log!("Wiping Chronik at {}\n", db_path.to_string_lossy());
            Db::destroy(&db_path)?;
        }

        log_chronik!("Opening Chronik at {}\n", db_path.to_string_lossy());
        let db = Db::open(&db_path)?;
        let is_db_empty = db.is_db_empty()?;
        let schema_version = verify_schema_version(&db)?;
        verify_enable_token_index(&db, params.enable_token_index)?;
        let needs_lokad_id_reindex = verify_lokad_id_index(
            &db,
            is_db_empty,
            params.enable_lokad_id_index,
        )?;
        let needs_scripthash_reindex = verify_scripthash_index(
            &db,
            is_db_empty,
            params.enable_scripthash_index,
        )?;
        upgrade_db_if_needed(
            &db,
            schema_version,
            params.enable_token_index,
            &load_tx,
            &shutdown_requested,
        )?;

        let plugin_name_map = update_plugins_index(
            &db,
            &params.plugin_ctx,
            params.enable_lokad_id_index,
        )?;

        let mempool = Mempool::new(
            ScriptGroup,
            params.enable_token_index,
            params.enable_lokad_id_index,
        );
        let mem_data = MemData::new(MemDataConf {
            tx_num_cache: params.tx_num_cache,
            script_history: params.script_history,
        });
        Ok(ChronikIndexer {
            db,
            mempool,
            mem_data,
            script_group: ScriptGroup,
            avalanche: Avalanche::default(),
            subs: RwLock::new(Subs::new(ScriptGroup)),
            perf_path: params.enable_perf_stats.then_some(perf_path),
            is_token_index_enabled: params.enable_token_index,
            is_lokad_id_index_enabled: params.enable_lokad_id_index,
            needs_lokad_id_reindex,
            is_scripthash_index_enabled: params.enable_scripthash_index,
            needs_scripthash_reindex,
            plugin_ctx: params.plugin_ctx,
            plugin_name_map,
            block_merkle_tree: Mutex::new(MerkleTree::new()),
            decompress_script_fn: params.decompress_script_fn,
        })
    }

    /// Resync Chronik index to the node
    pub fn resync_indexer(
        &mut self,
        bridge: &ffi::ChronikBridge,
    ) -> Result<()> {
        let block_reader = BlockReader::new(&self.db)?;
        let indexer_tip = block_reader.tip()?;
        let Ok(node_tip_index) = bridge.get_chain_tip() else {
            if let Some(indexer_tip) = &indexer_tip {
                return Err(
                    CannotRewindChronik(indexer_tip.hash.clone()).into()
                );
            }
            return Ok(());
        };
        let node_tip_info = ffi::get_block_info(node_tip_index);
        let node_height = node_tip_info.height;
        let node_tip_hash = BlockHash::from(node_tip_info.hash);
        let start_height = match indexer_tip {
            Some(tip) if tip.hash != node_tip_hash => {
                let indexer_tip_hash = tip.hash.clone();
                let indexer_height = tip.height;
                log!(
                    "Node and Chronik diverged, node is on block \
                     {node_tip_hash} at height {node_height}, and Chronik is \
                     on block {indexer_tip_hash} at height {indexer_height}.\n"
                );
                let indexer_tip_index = bridge
                    .lookup_block_index(tip.hash.to_bytes())
                    .map_err(|_| CannotRewindChronik(tip.hash.clone()))?;
                self.rewind_indexer(bridge, indexer_tip_index, &tip)?
            }
            Some(tip) => tip.height,
            None => {
                log!(
                    "Chronik database empty, syncing to block {node_tip_hash} \
                     at height {node_height}.\n"
                );
                -1
            }
        };
        if self.needs_lokad_id_reindex {
            self.reindex_lokad_id_index(bridge, node_tip_index, start_height)?;
            self.needs_lokad_id_reindex = false;
        }
        if self.needs_scripthash_reindex {
            self.reindex_scripthash_index(bridge)?;
            self.needs_scripthash_reindex = false;
        }
        let tip_height = node_tip_info.height;
        for height in start_height + 1..=tip_height {
            if bridge.shutdown_requested() {
                log!("Stopped re-sync adding blocks\n");
                return Ok(());
            }
            let block_index = ffi::get_block_ancestor(node_tip_index, height)?;
            let block = self.load_chronik_block(bridge, block_index)?;
            let hash = block.db_block.hash.clone();
            self.handle_block_connected(block)?;
            log_chronik!(
                "Added block {hash}, height {height}/{tip_height} to Chronik\n"
            );
            if height % 100 == 0 {
                log!(
                    "Synced Chronik up to block {hash} at height \
                     {height}/{tip_height}\n"
                );
            }
        }
        log!(
            "Chronik completed re-syncing with the node, both are now at \
             block {node_tip_hash} at height {node_height}.\n"
        );
        if let Some(perf_path) = &self.perf_path {
            let mut resync_stats =
                std::fs::File::create(perf_path.join("resync_stats.txt"))?;
            write!(&mut resync_stats, "{:#.3?}", self.mem_data.stats())?;
        }
        Ok(())
    }

    fn rewind_indexer(
        &mut self,
        bridge: &ffi::ChronikBridge,
        indexer_tip_index: &ffi::CBlockIndex,
        indexer_db_tip: &DbBlock,
    ) -> Result<BlockHeight> {
        let indexer_height = indexer_db_tip.height;
        let fork_block_index = bridge
            .find_fork(indexer_tip_index)
            .map_err(|_| CannotRewindChronik(indexer_db_tip.hash.clone()))?;
        let fork_info = ffi::get_block_info(fork_block_index);
        let fork_block_hash = BlockHash::from(fork_info.hash);
        let fork_height = fork_info.height;
        let revert_height = fork_height + 1;
        log!(
            "The last common block is {fork_block_hash} at height \
             {fork_height}.\n"
        );
        log!("Reverting Chronik blocks {revert_height} to {indexer_height}.\n");
        for height in (revert_height..indexer_height).rev() {
            if bridge.shutdown_requested() {
                log!("Stopped re-sync rewinding blocks\n");
                // return MAX here so we don't add any blocks
                return Ok(BlockHeight::MAX);
            }
            let db_block = BlockReader::new(&self.db)?
                .by_height(height)?
                .ok_or(BlocksBelowMissing {
                    missing: height,
                    exists: indexer_height,
                })?;
            let block_index = bridge
                .lookup_block_index(db_block.hash.to_bytes())
                .map_err(|_| CannotRewindChronik(db_block.hash))?;
            let block = self.load_chronik_block(bridge, block_index)?;
            self.handle_block_disconnected(block)?;
        }
        Ok(fork_info.height)
    }

    fn reindex_lokad_id_index(
        &mut self,
        bridge: &ffi::ChronikBridge,
        node_tip_index: &ffi::CBlockIndex,
        end_height: BlockHeight,
    ) -> Result<()> {
        let lokad_id_writer =
            LokadIdHistoryWriter::new(&self.db, LokadIdGroup)?;
        let tx_reader = TxReader::new(&self.db)?;
        let metadata_writer = MetadataWriter::new(&self.db)?;

        // First, wipe the LOKAD ID index
        let mut batch = WriteBatch::default();
        lokad_id_writer.wipe(&mut batch);
        self.db.write_batch(batch)?;

        for height in 0..=end_height {
            if bridge.shutdown_requested() {
                log!("Stopped reindexing LOKAD ID index\n");
                return Ok(());
            }
            let block_index = ffi::get_block_ancestor(node_tip_index, height)?;
            let block = self.load_chronik_block(bridge, block_index)?;
            let first_tx_num = tx_reader
                .first_tx_num_by_block(block.db_block.height)?
                .unwrap();
            let index_txs = prepare_indexed_txs_cached(
                &self.db,
                first_tx_num,
                &block.txs,
                &mut self.mem_data.tx_num_cache,
                PrepareUpdateMode::Add,
            )?;
            let hash = block.db_block.hash.clone();
            let mut batch = WriteBatch::default();
            lokad_id_writer.insert(
                &mut batch,
                &index_txs,
                &(),
                &mut GroupHistoryMemData::default(),
            )?;
            self.db.write_batch(batch)?;
            if height % 100 == 0 {
                log!(
                    "Synced Chronik LOKAD ID index up to block {hash} at \
                     height {height}/{end_height} (-chroniklokadidindex=0 to \
                     disable)\n"
                );
            }
        }

        let mut batch = WriteBatch::default();
        metadata_writer.update_is_lokad_id_index_enabled(&mut batch, true)?;
        self.db.write_batch(batch)?;

        Ok(())
    }

    fn reindex_scripthash_index(
        &mut self,
        bridge: &ffi::ChronikBridge,
    ) -> Result<()> {
        let script_history_writer =
            ScriptHistoryWriter::new(&self.db, ScriptGroup)?;
        let metadata_writer = MetadataWriter::new(&self.db)?;

        // First, wipe the scripthash index
        let mut batch = WriteBatch::default();
        script_history_writer.wipe_member_hash(&mut batch);
        self.db.write_batch(batch)?;

        script_history_writer
            .reindex_member_hash(self.decompress_script_fn, || {
                bridge.shutdown_requested()
            })?;

        let mut batch = WriteBatch::default();
        // If the user requested a shutdown, it is very unlikely that the
        // reindexing completed successfully. We don't set the flag to true,
        // to trigger a full scripthash reindex on next restart if
        // -chronikscripthashindex=1 is still set.
        // We also wipe the db now to be sure to not keep a useless partial
        // index on disk in case -chronikscripthashindex=0 is set on next
        // restart.
        if bridge.shutdown_requested() {
            script_history_writer.wipe_member_hash(&mut batch);
            self.db.write_batch(batch)?;
            return Ok(());
        }

        metadata_writer.update_is_scripthash_index_enabled(&mut batch, true)?;
        self.db.write_batch(batch)?;
        Ok(())
    }

    /// Add transaction to the indexer's mempool.
    pub fn handle_tx_added_to_mempool(
        &mut self,
        mempool_tx: MempoolTx,
    ) -> Result<()> {
        let result = self.mempool.insert(
            &self.db,
            mempool_tx,
            &self.plugin_ctx,
            &self.plugin_name_map,
        )?;
        self.subs.get_mut().handle_tx_event(
            &result.mempool_tx.tx,
            TxMsgType::AddedToMempool,
            &result.token_id_aux,
            &result.plugin_outputs,
        );
        Ok(())
    }

    /// Remove tx from the indexer's mempool, e.g. by a conflicting tx, expiry
    /// etc. This is not called when the transaction has been mined (and thus
    /// also removed from the mempool).
    pub fn handle_tx_removed_from_mempool(&mut self, txid: TxId) -> Result<()> {
        let result = self.mempool.remove(txid)?;
        self.subs.get_mut().handle_tx_event(
            &result.mempool_tx.tx,
            TxMsgType::RemovedFromMempool,
            &result.token_id_aux,
            &result.plugin_outputs,
        );
        Ok(())
    }

    /// Add the block to the index.
    pub fn handle_block_connected(
        &mut self,
        block: ChronikBlock,
    ) -> Result<()> {
        let height = block.db_block.height;
        let mut batch = WriteBatch::default();
        let block_writer = BlockWriter::new(&self.db)?;
        let tx_writer = TxWriter::new(&self.db)?;
        let block_stats_writer = BlockStatsWriter::new(&self.db)?;
        let script_history_writer =
            ScriptHistoryWriter::new(&self.db, self.script_group.clone())?;
        let script_utxo_writer =
            ScriptUtxoWriter::new(&self.db, self.script_group.clone())?;
        let spent_by_writer = SpentByWriter::new(&self.db)?;
        let token_writer = TokenWriter::new(&self.db)?;
        let token_id_history_writer =
            TokenIdHistoryWriter::new(&self.db, TokenIdGroup)?;
        let token_id_utxo_writer =
            TokenIdUtxoWriter::new(&self.db, TokenIdGroup)?;
        let lokad_id_history_writer =
            LokadIdHistoryWriter::new(&self.db, LokadIdGroup)?;
        let plugins_writer = PluginsWriter::new(&self.db, &self.plugin_ctx)?;
        block_writer.insert(&mut batch, &block.db_block)?;
        let first_tx_num = tx_writer.insert(
            &mut batch,
            &block.block_txs,
            &mut self.mem_data.txs,
        )?;
        let index_txs = prepare_indexed_txs_cached(
            &self.db,
            first_tx_num,
            &block.txs,
            &mut self.mem_data.tx_num_cache,
            PrepareUpdateMode::Add,
        )?;
        block_stats_writer
            .insert(&mut batch, height, block.size, &index_txs)?;
        script_history_writer.insert(
            &mut batch,
            &index_txs,
            &(),
            &mut self.mem_data.script_history,
        )?;
        script_utxo_writer.insert(
            &mut batch,
            &index_txs,
            &(),
            &mut self.mem_data.script_utxos,
        )?;
        spent_by_writer.insert(
            &mut batch,
            &index_txs,
            &mut self.mem_data.spent_by,
        )?;
        if self.is_lokad_id_index_enabled {
            lokad_id_history_writer.insert(
                &mut batch,
                &index_txs,
                &(),
                &mut GroupHistoryMemData::default(),
            )?;
        }
        let token_id_aux;
        let processed_token_batch;
        if self.is_token_index_enabled {
            processed_token_batch =
                token_writer.insert(&mut batch, &index_txs)?;
            token_id_aux =
                TokenIdGroupAux::from_batch(&index_txs, &processed_token_batch);
            token_id_history_writer.insert(
                &mut batch,
                &index_txs,
                &token_id_aux,
                &mut GroupHistoryMemData::default(),
            )?;
            token_id_utxo_writer.insert(
                &mut batch,
                &index_txs,
                &token_id_aux,
                &mut GroupUtxoMemData::default(),
            )?;
        } else {
            processed_token_batch = ProcessedTokenTxBatch::default();
            token_id_aux = TokenIdGroupAux::default();
        }
        let plugin_outputs = plugins_writer.insert(
            &mut batch,
            &index_txs,
            &processed_token_batch,
            &self.plugin_name_map,
        )?;
        plugins_writer.update_sync_height(
            &mut batch,
            block.db_block.height,
            &self.plugin_name_map,
        )?;
        self.db.write_batch(batch)?;
        for tx in &block.block_txs.txs {
            self.mempool.remove_mined(&tx.txid)?;
        }
        merge::check_for_errors()?;
        let subs = self.subs.get_mut();
        subs.broadcast_block_msg(BlockMsg {
            msg_type: BlockMsgType::Connected,
            hash: block.db_block.hash,
            height: block.db_block.height,
            timestamp: block.db_block.timestamp,
            coinbase_tx: None,
        });
        subs.handle_block_tx_events(
            &block.txs,
            TxMsgType::Confirmed,
            &token_id_aux,
            &plugin_outputs,
        );
        Ok(())
    }

    /// Remove the block from the index.
    pub fn handle_block_disconnected(
        &mut self,
        block: ChronikBlock,
    ) -> Result<()> {
        let mut batch = WriteBatch::default();
        let block_writer = BlockWriter::new(&self.db)?;
        let tx_writer = TxWriter::new(&self.db)?;
        let block_stats_writer = BlockStatsWriter::new(&self.db)?;
        let script_history_writer =
            ScriptHistoryWriter::new(&self.db, self.script_group.clone())?;
        let script_utxo_writer =
            ScriptUtxoWriter::new(&self.db, self.script_group.clone())?;
        let spent_by_writer = SpentByWriter::new(&self.db)?;
        let token_writer = TokenWriter::new(&self.db)?;
        let token_id_history_writer =
            TokenIdHistoryWriter::new(&self.db, TokenIdGroup)?;
        let token_id_utxo_writer =
            TokenIdUtxoWriter::new(&self.db, TokenIdGroup)?;
        let lokad_id_history_writer =
            LokadIdHistoryWriter::new(&self.db, LokadIdGroup)?;
        let plugins_writer = PluginsWriter::new(&self.db, &self.plugin_ctx)?;
        block_writer.delete(&mut batch, &block.db_block)?;
        let first_tx_num = tx_writer.delete(
            &mut batch,
            &block.block_txs,
            &mut self.mem_data.txs,
        )?;
        let index_txs = prepare_indexed_txs_cached(
            &self.db,
            first_tx_num,
            &block.txs,
            &mut self.mem_data.tx_num_cache,
            PrepareUpdateMode::Delete,
        )?;
        block_stats_writer.delete(&mut batch, block.db_block.height);
        script_history_writer.delete(
            &mut batch,
            &index_txs,
            &(),
            &mut self.mem_data.script_history,
        )?;
        script_utxo_writer.delete(
            &mut batch,
            &index_txs,
            &(),
            &mut self.mem_data.script_utxos,
        )?;
        spent_by_writer.delete(
            &mut batch,
            &index_txs,
            &mut self.mem_data.spent_by,
        )?;
        if self.is_lokad_id_index_enabled {
            // Skip delete if rewinding indexer; will be wiped later anyway
            if !self.needs_lokad_id_reindex {
                lokad_id_history_writer.delete(
                    &mut batch,
                    &index_txs,
                    &(),
                    &mut GroupHistoryMemData::default(),
                )?;
            }
        }
        if self.is_token_index_enabled {
            let token_id_aux = TokenIdGroupAux::from_db(&index_txs, &self.db)?;
            token_id_history_writer.delete(
                &mut batch,
                &index_txs,
                &token_id_aux,
                &mut GroupHistoryMemData::default(),
            )?;
            token_id_utxo_writer.delete(
                &mut batch,
                &index_txs,
                &token_id_aux,
                &mut GroupUtxoMemData::default(),
            )?;
            token_writer.delete(&mut batch, &index_txs)?;
        }
        plugins_writer.delete(&mut batch, &index_txs)?;
        plugins_writer.update_sync_height(
            &mut batch,
            block.db_block.height - 1,
            &self.plugin_name_map,
        )?;
        self.avalanche.disconnect_block(block.db_block.height)?;
        self.db.write_batch(batch)?;
        let subs = self.subs.get_mut();
        subs.broadcast_block_msg(BlockMsg {
            msg_type: BlockMsgType::Disconnected,
            hash: block.db_block.hash,
            height: block.db_block.height,
            timestamp: block.db_block.timestamp,
            coinbase_tx: Some({
                let mut block_txs = block.txs;
                block_txs.remove(0)
            }),
        });
        self.block_merkle_tree
            .get_mut()
            .invalidate_block(block.db_block.height as usize);
        Ok(())
    }

    /// Block finalized with Avalanche.
    pub fn handle_block_finalized(
        &mut self,
        block: ChronikBlock,
    ) -> Result<()> {
        self.avalanche.finalize_block(block.db_block.height)?;
        let subs = self.subs.get_mut();
        subs.broadcast_block_msg(BlockMsg {
            msg_type: BlockMsgType::Finalized,
            hash: block.db_block.hash,
            height: block.db_block.height,
            timestamp: block.db_block.timestamp,
            coinbase_tx: None,
        });
        let tx_reader = TxReader::new(&self.db)?;
        let first_tx_num = tx_reader
            .first_tx_num_by_block(block.db_block.height)?
            .unwrap();
        let index_txs = prepare_indexed_txs_cached(
            &self.db,
            first_tx_num,
            &block.txs,
            &mut self.mem_data.tx_num_cache,
            PrepareUpdateMode::Read,
        )?;
        let token_id_aux = if self.is_token_index_enabled {
            TokenIdGroupAux::from_db(&index_txs, &self.db)?
        } else {
            TokenIdGroupAux::default()
        };
        let plugin_outputs = if !self.plugin_ctx.plugins().is_empty() {
            let plugin_reader = PluginsReader::new(&self.db)?;
            plugin_reader.txs_plugin_outputs(&index_txs)?
        } else {
            BTreeMap::new()
        };
        subs.handle_block_tx_events(
            &block.txs,
            TxMsgType::Finalized,
            &token_id_aux,
            &plugin_outputs,
        );
        Ok(())
    }

    /// Block invalidated with Avalanche.
    pub fn handle_block_invalidated(
        &mut self,
        block: ChronikBlock,
    ) -> Result<()> {
        let subs = self.subs.get_mut();
        subs.broadcast_block_msg(BlockMsg {
            msg_type: BlockMsgType::Invalidated,
            hash: block.db_block.hash,
            height: block.db_block.height,
            timestamp: block.db_block.timestamp,
            coinbase_tx: Some({
                let mut block_txs = block.txs;
                block_txs.remove(0)
            }),
        });
        Ok(())
    }

    /// Return [`QueryBroadcast`] to broadcast tx to the network.
    pub fn broadcast<'a>(&'a self, node: &'a Node) -> QueryBroadcast<'a> {
        QueryBroadcast {
            db: &self.db,
            avalanche: &self.avalanche,
            mempool: &self.mempool,
            node,
            is_token_index_enabled: self.is_token_index_enabled,
            plugin_name_map: &self.plugin_name_map,
        }
    }

    /// Return [`QueryBlocks`] to read blocks from the DB.
    pub fn blocks<'a>(&'a self, node: &'a Node) -> QueryBlocks<'a> {
        QueryBlocks {
            db: &self.db,
            avalanche: &self.avalanche,
            mempool: &self.mempool,
            node,
            is_token_index_enabled: self.is_token_index_enabled,
            plugin_name_map: &self.plugin_name_map,
            block_merkle_tree: &self.block_merkle_tree,
        }
    }

    /// Return [`QueryTxs`] to return txs from mempool/DB.
    pub fn txs<'a>(&'a self, node: &'a Node) -> QueryTxs<'a> {
        QueryTxs {
            db: &self.db,
            avalanche: &self.avalanche,
            mempool: &self.mempool,
            node,
            is_token_index_enabled: self.is_token_index_enabled,
            plugin_name_map: &self.plugin_name_map,
        }
    }

    /// Return [`QueryGroupHistory`] for scripts to query the tx history of
    /// scripts.
    pub fn script_history<'a>(
        &'a self,
        node: &'a Node,
    ) -> Result<QueryGroupHistory<'a, ScriptGroup>> {
        Ok(QueryGroupHistory {
            db: &self.db,
            avalanche: &self.avalanche,
            mempool: &self.mempool,
            mempool_history: self.mempool.script_history(),
            group: self.script_group.clone(),
            node,
            is_token_index_enabled: self.is_token_index_enabled,
            is_scripthash_index_enabled: self.is_scripthash_index_enabled,
            plugin_name_map: &self.plugin_name_map,
        })
    }

    /// Return [`QueryGroupUtxos`] for scripts to query the utxos of scripts.
    pub fn script_utxos(
        &self,
    ) -> Result<QueryGroupUtxos<'_, ScriptGroup, UtxoProtobufValue>> {
        Ok(QueryGroupUtxos {
            db: &self.db,
            avalanche: &self.avalanche,
            mempool: &self.mempool,
            mempool_utxos: self.mempool.script_utxos(),
            group: self.script_group.clone(),
            utxo_mapper: UtxoProtobufValue,
            is_token_index_enabled: self.is_token_index_enabled,
            is_scripthash_index_enabled: self.is_scripthash_index_enabled,
            plugin_name_map: &self.plugin_name_map,
        })
    }

    /// Return [`QueryGroupHistory`] for token IDs to query the tx history of
    /// token IDs.
    pub fn token_id_history<'a>(
        &'a self,
        node: &'a Node,
    ) -> QueryGroupHistory<'a, TokenIdGroup> {
        QueryGroupHistory {
            db: &self.db,
            avalanche: &self.avalanche,
            mempool: &self.mempool,
            mempool_history: self.mempool.token_id_history(),
            group: TokenIdGroup,
            node,
            is_token_index_enabled: self.is_token_index_enabled,
            is_scripthash_index_enabled: self.is_scripthash_index_enabled,
            plugin_name_map: &self.plugin_name_map,
        }
    }

    /// Return [`QueryGroupUtxos`] for token IDs to query the utxos of token IDs
    pub fn token_id_utxos(
        &self,
    ) -> QueryGroupUtxos<'_, TokenIdGroup, UtxoProtobufOutput> {
        QueryGroupUtxos {
            db: &self.db,
            avalanche: &self.avalanche,
            mempool: &self.mempool,
            mempool_utxos: self.mempool.token_id_utxos(),
            group: TokenIdGroup,
            utxo_mapper: UtxoProtobufOutput,
            is_token_index_enabled: self.is_token_index_enabled,
            is_scripthash_index_enabled: self.is_scripthash_index_enabled,
            plugin_name_map: &self.plugin_name_map,
        }
    }

    /// Return [`QueryGroupHistory`] for LOKAD IDs to query the tx history of
    /// LOKAD IDs.
    pub fn lokad_id_history<'a>(
        &'a self,
        node: &'a Node,
    ) -> QueryGroupHistory<'a, LokadIdGroup> {
        QueryGroupHistory {
            db: &self.db,
            avalanche: &self.avalanche,
            mempool: &self.mempool,
            mempool_history: self.mempool.lokad_id_history(),
            group: LokadIdGroup,
            node,
            is_token_index_enabled: self.is_token_index_enabled,
            is_scripthash_index_enabled: self.is_scripthash_index_enabled,
            plugin_name_map: &self.plugin_name_map,
        }
    }

    /// Return [`QueryPlugins`] to query plugin data
    pub fn plugins(&self) -> QueryPlugins<'_> {
        QueryPlugins {
            db: &self.db,
            avalanche: &self.avalanche,
            mempool: &self.mempool,
            is_token_index_enabled: self.is_token_index_enabled,
            plugin_name_map: &self.plugin_name_map,
        }
    }

    /// Return [`QueryGroupHistory`] to query plugin group history
    pub fn plugin_history<'a>(
        &'a self,
        node: &'a Node,
    ) -> QueryGroupHistory<'a, PluginsGroup> {
        QueryGroupHistory {
            db: &self.db,
            avalanche: &self.avalanche,
            mempool: &self.mempool,
            mempool_history: self.mempool.plugins().group_history(),
            group: PluginsGroup,
            node,
            is_token_index_enabled: self.is_token_index_enabled,
            is_scripthash_index_enabled: self.is_scripthash_index_enabled,
            plugin_name_map: &self.plugin_name_map,
        }
    }

    /// Subscribers, behind read/write lock
    pub fn subs(&self) -> &RwLock<Subs> {
        &self.subs
    }

    /// Map plugin names and plugin idx
    pub fn plugin_name_map(&self) -> &PluginNameMap {
        &self.plugin_name_map
    }

    /// Build a ChronikBlock from a ffi::Block.
    pub fn make_chronik_block(&self, block: ffi::Block) -> ChronikBlock {
        let db_block = DbBlock {
            hash: BlockHash::from(block.hash),
            prev_hash: BlockHash::from(block.prev_hash),
            height: block.height,
            n_bits: block.n_bits,
            timestamp: block.timestamp,
            file_num: block.file_num,
            data_pos: block.data_pos,
        };
        let block_txs = BlockTxs {
            block_height: block.height,
            txs: block
                .txs
                .iter()
                .map(|tx| {
                    let txid = TxId::from(tx.tx.txid);
                    TxEntry {
                        txid,
                        data_pos: tx.data_pos,
                        undo_pos: tx.undo_pos,
                        time_first_seen: match self.mempool.tx(&txid) {
                            Some(tx) => tx.time_first_seen,
                            None => 0,
                        },
                        is_coinbase: tx.undo_pos == 0,
                    }
                })
                .collect(),
        };
        let txs = block
            .txs
            .into_iter()
            .map(|block_tx| Tx::from(block_tx.tx))
            .collect::<Vec<_>>();
        ChronikBlock {
            db_block,
            block_txs,
            size: block.size,
            txs,
        }
    }

    /// Load a ChronikBlock from the node given the CBlockIndex.
    pub fn load_chronik_block(
        &self,
        bridge: &ffi::ChronikBridge,
        block_index: &ffi::CBlockIndex,
    ) -> Result<ChronikBlock> {
        let ffi_block = bridge.load_block(block_index)?;
        let ffi_block = expect_unique_ptr("load_block", &ffi_block);
        let ffi_block_undo = bridge.load_block_undo(block_index)?;
        let ffi_block_undo =
            expect_unique_ptr("load_block_undo", &ffi_block_undo);
        let block = ffi::bridge_block(ffi_block, ffi_block_undo, block_index)?;
        Ok(self.make_chronik_block(block))
    }

    /// Mempool, behind read/write lock
    pub fn mempool(&self) -> &Mempool {
        &self.mempool
    }
}

fn verify_schema_version(db: &Db) -> Result<u64> {
    let metadata_reader = MetadataReader::new(db)?;
    let metadata_writer = MetadataWriter::new(db)?;
    let is_empty = db.is_db_empty()?;
    let schema_version = match metadata_reader
        .schema_version()
        .wrap_err(CorruptedSchemaVersion)?
    {
        Some(schema_version) => {
            assert!(!is_empty, "Empty DB can't have a schema version");
            if schema_version > CURRENT_INDEXER_VERSION {
                return Err(ChronikOutdated(schema_version).into());
            }
            if schema_version < LAST_UPGRADABLE_VERSION {
                return Err(DatabaseOutdated(schema_version).into());
            }
            log!(
                "Chronik has version {CURRENT_INDEXER_VERSION}, DB has \
                 version {schema_version}\n"
            );
            schema_version
        }
        None => {
            if !is_empty {
                return Err(MissingSchemaVersion.into());
            }
            let mut batch = WriteBatch::default();
            metadata_writer
                .update_schema_version(&mut batch, CURRENT_INDEXER_VERSION)?;
            db.write_batch(batch)?;
            log!(
                "Chronik has version {CURRENT_INDEXER_VERSION}, initialized \
                 DB with that version\n"
            );
            CURRENT_INDEXER_VERSION
        }
    };
    Ok(schema_version)
}

fn verify_enable_token_index(db: &Db, enable_token_index: bool) -> Result<()> {
    let metadata_reader = MetadataReader::new(db)?;
    let metadata_writer = MetadataWriter::new(db)?;
    let token_writer = TokenWriter::new(db)?;
    let is_empty = db.is_db_empty()?;
    let is_token_index_enabled = metadata_reader.is_token_index_enabled()?;
    let mut batch = WriteBatch::default();
    if !is_empty {
        // Cannot enable token index if not already previously enabled
        if enable_token_index && !is_token_index_enabled {
            return Err(CannotEnableTokenIndex.into());
        }
        // Wipe token index if previously enabled and now disabled
        if !enable_token_index && is_token_index_enabled {
            log!(
                "Warning: Wiping existing token index, since \
                 -chroniktokenindex=0\n"
            );
            log!("You will need to -reindex/-chronikreindex to restore\n");
            token_writer.wipe(&mut batch);
        }
    }
    metadata_writer
        .update_is_token_index_enabled(&mut batch, enable_token_index)?;
    db.write_batch(batch)?;
    Ok(())
}

fn upgrade_db_if_needed(
    db: &Db,
    mut schema_version: u64,
    enable_token_index: bool,
    load_tx: impl Fn(u32, u32, u32) -> Result<Tx>,
    shutdown_requested: impl Fn() -> bool,
) -> Result<()> {
    // DB has version 10, upgrade to 11
    if schema_version == 10 {
        upgrade_10_to_11(db, enable_token_index)?;
        schema_version = 11;
    }
    // DB has version 11, upgrade to 12
    if schema_version == 11 {
        upgrade_11_to_12(db, enable_token_index, &load_tx)?;
        schema_version = 12;
    }
    // DB has version 12, upgrade to 13
    if schema_version == 12 {
        upgrade_12_to_13(
            db,
            enable_token_index,
            &load_tx,
            &shutdown_requested,
        )?;
    }
    Ok(())
}

fn upgrade_10_to_11(db: &Db, enable_token_index: bool) -> Result<()> {
    log!("Upgrading Chronik DB from version 10 to 11...\n");
    let script_utxo_writer = ScriptUtxoWriter::new(db, ScriptGroup)?;
    script_utxo_writer.upgrade_10_to_11()?;
    if enable_token_index {
        let token_id_utxo_writer = TokenIdUtxoWriter::new(db, TokenIdGroup)?;
        token_id_utxo_writer.upgrade_10_to_11()?;
    }
    let mut batch = WriteBatch::default();
    let metadata_writer = MetadataWriter::new(db)?;
    metadata_writer.update_schema_version(&mut batch, 11)?;
    db.write_batch(batch)?;
    log!("Successfully upgraded Chronik DB from version 10 to 11.\n");
    Ok(())
}

fn upgrade_11_to_12(
    db: &Db,
    enable_token_index: bool,
    load_tx: impl Fn(u32, u32, u32) -> Result<Tx>,
) -> Result<()> {
    log!("Upgrading Chronik DB from version 11 to 12...\n");
    if enable_token_index {
        let token_writer = TokenWriter::new(db)?;
        token_writer.upgrade_11_to_12(load_tx)?;
    }
    let mut batch = WriteBatch::default();
    let metadata_writer = MetadataWriter::new(db)?;
    metadata_writer.update_schema_version(&mut batch, 12)?;
    db.write_batch(batch)?;
    log!("Successfully upgraded Chronik DB from version 11 to 12.\n");
    Ok(())
}

fn upgrade_12_to_13(
    db: &Db,
    enable_token_index: bool,
    load_tx: impl Fn(u32, u32, u32) -> Result<Tx>,
    shutdown_requested: impl Fn() -> bool,
) -> Result<()> {
    log!("Upgrading Chronik DB from version 12 to 13...\n");
    let upgrade_writer = UpgradeWriter::new(db)?;
    if enable_token_index {
        upgrade_writer.fix_mint_vault_txs(&load_tx)?;
    }
    upgrade_writer.fix_p2pk_compression(&load_tx, &shutdown_requested)?;
    upgrade_writer.remove_opreturn_scripts()?;
    let mut batch = WriteBatch::default();
    let metadata_writer = MetadataWriter::new(db)?;
    metadata_writer.update_schema_version(&mut batch, 13)?;
    db.write_batch(batch)?;
    log!("Successfully upgraded Chronik DB from version 12 to 13.\n");
    Ok(())
}

/// Verify user config and DB are in sync. Returns whether the LOKAD ID index
/// needs to be reindexed.
fn verify_lokad_id_index(
    db: &Db,
    is_db_empty: bool,
    enable: bool,
) -> Result<bool> {
    let metadata_reader = MetadataReader::new(db)?;
    let metadata_writer = MetadataWriter::new(db)?;
    let lokad_id_writer = LokadIdHistoryWriter::new(db, LokadIdGroup)?;
    let is_enabled_db = metadata_reader
        .is_lokad_id_index_enabled()?
        .unwrap_or(false);
    let mut batch = WriteBatch::default();
    if !is_db_empty {
        if enable && !is_enabled_db {
            // DB non-empty without LOKAD ID index, but index enabled -> reindex
            return Ok(true);
        }
        if !enable && is_enabled_db {
            // Otherwise, the LOKAD ID index has been enabled and now
            // specified to be disabled, so we wipe the index.
            log!(
                "Warning: Wiping existing LOKAD ID index, since \
                 -chroniklokadidindex=0\n"
            );
            log!(
                "You will need to specify -chroniklokadidindex=1 to restore\n"
            );
            lokad_id_writer.wipe(&mut batch);
        }
    }
    metadata_writer.update_is_lokad_id_index_enabled(&mut batch, enable)?;
    db.write_batch(batch)?;
    Ok(false)
}

/// Verify user config and DB are in sync. Returns whether the scripthash index
/// needs to be reindexed.
fn verify_scripthash_index(
    db: &Db,
    is_db_empty: bool,
    enable: bool,
) -> Result<bool> {
    let metadata_reader = MetadataReader::new(db)?;
    let metadata_writer = MetadataWriter::new(db)?;
    let script_history_writer = ScriptHistoryWriter::new(db, ScriptGroup)?;
    let is_enabled_db = metadata_reader
        .is_scripthash_index_enabled()?
        .unwrap_or(false);
    let mut batch = WriteBatch::default();
    if !is_db_empty {
        if enable && !is_enabled_db {
            // DB non-empty without scripthash index, but index enabled ->
            // reindex
            return Ok(true);
        }
        if !enable && is_enabled_db {
            // Otherwise, the scripthash index has been enabled and now
            // specified to be disabled, so we wipe the index.
            log!(
                "Warning: Wiping existing scripthash index, since \
                 -chronikscripthashindex=0\n"
            );
            log!(
                "You will need to specify -chronikscripthashindex=1 to \
                 restore\n"
            );
            script_history_writer.wipe_member_hash(&mut batch);
        }
    }
    metadata_writer.update_is_scripthash_index_enabled(&mut batch, enable)?;
    db.write_batch(batch)?;
    Ok(false)
}

fn update_plugins_index(
    db: &Db,
    plugin_ctx: &PluginContext,
    enable_lokad_id_index: bool,
) -> Result<PluginNameMap> {
    if !plugin_ctx.plugins().is_empty() && !enable_lokad_id_index {
        return Err(PluginSystemRequiresLokadIdIndex.into());
    }
    let plugins_reader = PluginsReader::new(db)?;
    let plugins_writer = PluginsWriter::new(db, plugin_ctx)?;
    let block_reader = BlockReader::new(db)?;
    let tx_reader = TxReader::new(db)?;
    let db_plugins = plugins_reader
        .metas()?
        .into_iter()
        .collect::<BTreeMap<_, _>>();
    let mut next_plugin_idx = db_plugins
        .values()
        .map(|plugin| plugin.plugin_idx)
        .max()
        .map(|max_idx| max_idx + 1)
        .unwrap_or_default();
    let db_block_height = block_reader.height()?;

    let mut name_mapping = Vec::with_capacity(plugin_ctx.plugins().len());
    let mut batch = WriteBatch::default();
    let mut desynced_min_tx_num = TxNum::MAX;
    for plugin in plugin_ctx.plugins() {
        let plugin_lokad_ids = plugin
            .lokad_ids
            .iter()
            .map(|lokad_id| Bytes::from(lokad_id.to_vec()))
            .collect::<Vec<_>>();
        // Plugins are identified by module name
        match db_plugins.get(&plugin.module_name) {
            Some(db_plugin) => {
                // In this initial version, plugins must match exactly otherwise
                // reindex is required
                if plugin.version.to_string() != db_plugin.version {
                    return Err(PluginVersionMismatch {
                        plugin_name: plugin.module_name.clone(),
                        db_version: db_plugin.version.clone(),
                        loaded_version: plugin.version.to_string(),
                    }
                    .into());
                }
                if db_block_height != -1
                    && db_plugin.sync_height != db_block_height
                {
                    // If the plugin is out-of-sync, allow if there's no txs yet
                    // for the required LOKAD IDs
                    if let Some(min_tx_num) =
                        verify_plugin_desynced_tx_num(db, plugin)?
                    {
                        log!(
                            "Plugin {:?} desynced, DB is on height \
                             {db_block_height} but plugin is on height {} \
                             with existing transactions for the plugin's \
                             LOKAD IDs {plugin_lokad_ids:?}\n",
                            plugin.module_name,
                            db_plugin.sync_height,
                        );
                        if min_tx_num < desynced_min_tx_num {
                            desynced_min_tx_num = min_tx_num;
                            continue;
                        }
                    }
                }
                // Mark plugin as synced to the current height
                plugins_writer.write_meta(
                    &mut batch,
                    &plugin.module_name,
                    &PluginMeta {
                        plugin_idx: db_plugin.plugin_idx,
                        sync_height: db_block_height,
                        version: plugin.version.to_string(),
                    },
                )?;
                name_mapping
                    .push((db_plugin.plugin_idx, plugin.module_name.clone()));
            }
            None => {
                if db_block_height != -1 {
                    // Allow new plugin if there's no txs yet for the required
                    // LOKAD IDs
                    if let Some(min_tx_num) =
                        verify_plugin_desynced_tx_num(db, plugin)?
                    {
                        log!(
                            "Cannot load plugin {:?}, DB is on height \
                             {db_block_height} but plugin has existing \
                             transactions for the plugin's LOKAD IDs \
                             {plugin_lokad_ids:?}\n",
                            plugin.module_name,
                        );
                        if min_tx_num < desynced_min_tx_num {
                            desynced_min_tx_num = min_tx_num;
                            continue;
                        }
                    }
                }
                plugins_writer.write_meta(
                    &mut batch,
                    &plugin.module_name,
                    &PluginMeta {
                        plugin_idx: next_plugin_idx,
                        sync_height: -1,
                        version: plugin.version.to_string(),
                    },
                )?;
                name_mapping
                    .push((next_plugin_idx, plugin.module_name.clone()));
                next_plugin_idx += 1;
            }
        }
    }
    if desynced_min_tx_num != TxNum::MAX {
        let txid = tx_reader
            .txid_by_tx_num(desynced_min_tx_num)?
            .ok_or(TxNotFound(desynced_min_tx_num))?;
        let block_height =
            tx_reader.block_height_by_tx_num(desynced_min_tx_num)?;
        let block_hash = block_reader
            .by_height(block_height)?
            .ok_or(BlockNotFound(block_height))?
            .hash;
        return Err(PluginsAlreadyHaveTxs {
            db_height: db_block_height,
            desync_txid: txid,
            desync_height: block_height,
            desync_hash: block_hash,
        }
        .into());
    }
    db.write_batch(batch)?;
    Ok(PluginNameMap::new(name_mapping))
}

fn verify_plugin_desynced_tx_num(
    db: &Db,
    plugin: &Plugin,
) -> Result<Option<TxNum>> {
    let lokad_id_reader = LokadIdHistoryReader::new(db)?;

    let mut min_tx_num = None;
    for lokad_id in &plugin.lokad_ids {
        let page_tx_nums = lokad_id_reader.page_txs(lokad_id, 0)?;
        let Some(tx_nums) = page_tx_nums else {
            continue;
        };
        let Some(&first_tx_num) = tx_nums.first() else {
            continue;
        };
        min_tx_num = Some(min_tx_num.unwrap_or(TxNum::MAX).min(first_tx_num));
    }

    Ok(min_tx_num)
}

impl Node {
    /// If `result` is [`Err`], logs and aborts the node.
    pub fn ok_or_abort<T>(&self, func_name: &str, result: Result<T>) {
        if let Err(report) = result {
            log_chronik!("{report:?}\n");
            self.bridge.abort_node(
                &format!("ERROR Chronik in {func_name}"),
                &format!("{report:#}"),
            );
        }
    }
}

impl std::fmt::Debug for ChronikIndexerParams {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("ChronikIndexerParams")
            .field("datadir_net", &self.datadir_net)
            .field("wipe_db", &self.wipe_db)
            .field("fn_compress_script", &"..")
            .finish()
    }
}

#[cfg(test)]
mod tests {
    use abc_rust_error::Result;
    use bitcoinsuite_core::block::BlockHash;
    use chronik_db::{
        db::{Db, WriteBatch, CF_META},
        io::{BlockReader, BlockTxs, DbBlock, MetadataReader, MetadataWriter},
        plugins::{PluginMeta, PluginsReader},
    };
    use chronik_plugin::{context::PluginContext, plugin::Plugin};
    use pretty_assertions::assert_eq;

    use crate::indexer::{
        update_plugins_index, ChronikBlock, ChronikIndexer,
        ChronikIndexerError, ChronikIndexerParams, CURRENT_INDEXER_VERSION,
    };

    /// A mock "decompression" that just prefixes with "DECOMPRESS:".
    fn mock_decompress(script: &[u8]) -> Result<Vec<u8>> {
        Ok([b"DECOMPRESS:".as_ref(), script.as_ref()].concat())
    }

    #[test]
    fn test_indexer() -> Result<()> {
        use bitcoinsuite_core::tx::{Tx, TxId, TxMut};

        let load_tx = |_, _, _| unreachable!();
        let shutdown_requested = || false;

        let tempdir = tempdir::TempDir::new("chronik-indexer--indexer")?;
        let datadir_net = tempdir.path().join("regtest");
        let params = ChronikIndexerParams {
            datadir_net: datadir_net.clone(),
            wipe_db: false,
            enable_token_index: false,
            enable_lokad_id_index: false,
            enable_scripthash_index: false,
            enable_perf_stats: false,
            tx_num_cache: Default::default(),
            plugin_ctx: Default::default(),
            script_history: Default::default(),
            decompress_script_fn: mock_decompress,
        };
        // regtest folder doesn't exist yet -> error
        assert_eq!(
            ChronikIndexer::setup(params.clone(), load_tx, shutdown_requested)
                .unwrap_err()
                .downcast::<ChronikIndexerError>()?,
            ChronikIndexerError::CreateDirFailed(datadir_net.join("indexes")),
        );

        // create regtest folder, setup will work now
        std::fs::create_dir(&datadir_net)?;
        let mut indexer =
            ChronikIndexer::setup(params.clone(), load_tx, shutdown_requested)?;
        // indexes and indexes/chronik folder now exist
        assert!(datadir_net.join("indexes").exists());
        assert!(datadir_net.join("indexes").join("chronik").exists());

        // DB is empty
        assert_eq!(BlockReader::new(&indexer.db)?.by_height(0)?, None);
        let coinbase = TxMut {
            ..Default::default()
        };
        let block = ChronikBlock {
            db_block: DbBlock {
                hash: BlockHash::from([4; 32]),
                prev_hash: BlockHash::from([0; 32]),
                height: 0,
                n_bits: 0x1deadbef,
                timestamp: 1234567890,
                file_num: 0,
                data_pos: 1337,
            },
            block_txs: BlockTxs {
                block_height: 0,
                txs: vec![],
            },
            size: 285,
            txs: vec![Tx::with_txid(TxId::from_tx(&coinbase), coinbase)],
        };

        // Add block
        indexer.handle_block_connected(block.clone())?;
        assert_eq!(
            BlockReader::new(&indexer.db)?.by_height(0)?,
            Some(block.db_block.clone())
        );

        // Remove block again
        indexer.handle_block_disconnected(block.clone())?;
        assert_eq!(BlockReader::new(&indexer.db)?.by_height(0)?, None);

        // Add block then wipe, block not there
        indexer.handle_block_connected(block)?;
        std::mem::drop(indexer);
        let indexer = ChronikIndexer::setup(
            ChronikIndexerParams {
                wipe_db: true,
                ..params
            },
            load_tx,
            shutdown_requested,
        )?;
        assert_eq!(BlockReader::new(&indexer.db)?.by_height(0)?, None);

        Ok(())
    }

    #[test]
    fn test_schema_version() -> Result<()> {
        let load_tx = |_, _, _| unreachable!();
        let shutdown_requested = || false;
        let dir = tempdir::TempDir::new("chronik-indexer--schema_version")?;
        let chronik_path = dir.path().join("indexes").join("chronik");
        let params = ChronikIndexerParams {
            datadir_net: dir.path().to_path_buf(),
            wipe_db: false,
            enable_token_index: false,
            enable_lokad_id_index: false,
            enable_scripthash_index: false,
            enable_perf_stats: false,
            tx_num_cache: Default::default(),
            plugin_ctx: Default::default(),
            script_history: Default::default(),
            decompress_script_fn: mock_decompress,
        };

        // Setting up DB first time sets the schema version
        ChronikIndexer::setup(params.clone(), load_tx, shutdown_requested)?;
        {
            let db = Db::open(&chronik_path)?;
            assert_eq!(
                MetadataReader::new(&db)?.schema_version()?,
                Some(CURRENT_INDEXER_VERSION)
            );
        }
        // Opening DB again works fine
        ChronikIndexer::setup(params.clone(), load_tx, shutdown_requested)?;

        // Override DB schema version to 0
        {
            let db = Db::open(&chronik_path)?;
            let mut batch = WriteBatch::default();
            MetadataWriter::new(&db)?.update_schema_version(&mut batch, 0)?;
            db.write_batch(batch)?;
        }
        // -> DB too old
        assert_eq!(
            ChronikIndexer::setup(params.clone(), load_tx, shutdown_requested)
                .unwrap_err()
                .downcast::<ChronikIndexerError>()?,
            ChronikIndexerError::DatabaseOutdated(0),
        );

        // Override DB schema version to CURRENT_INDEXER_VERSION + 1
        {
            let db = Db::open(&chronik_path)?;
            let mut batch = WriteBatch::default();
            MetadataWriter::new(&db)?.update_schema_version(
                &mut batch,
                CURRENT_INDEXER_VERSION + 1,
            )?;
            db.write_batch(batch)?;
        }
        // -> Chronik too old
        assert_eq!(
            ChronikIndexer::setup(params.clone(), load_tx, shutdown_requested)
                .unwrap_err()
                .downcast::<ChronikIndexerError>()?,
            ChronikIndexerError::ChronikOutdated(CURRENT_INDEXER_VERSION + 1),
        );

        // Corrupt schema version
        {
            let db = Db::open(&chronik_path)?;
            let cf_meta = db.cf(CF_META)?;
            let mut batch = WriteBatch::default();
            batch.put_cf(cf_meta, b"SCHEMA_VERSION", [0xff]);
            db.write_batch(batch)?;
        }
        assert_eq!(
            ChronikIndexer::setup(params.clone(), load_tx, shutdown_requested)
                .unwrap_err()
                .downcast::<ChronikIndexerError>()?,
            ChronikIndexerError::CorruptedSchemaVersion,
        );

        // New db path, but has existing data
        let new_dir = dir.path().join("new");
        let new_chronik_path = new_dir.join("indexes").join("chronik");
        std::fs::create_dir_all(&new_chronik_path)?;
        let new_params = ChronikIndexerParams {
            datadir_net: new_dir,
            wipe_db: false,
            ..params
        };
        {
            // new db with obscure field in meta
            let db = Db::open(&new_chronik_path)?;
            let mut batch = WriteBatch::default();
            batch.put_cf(db.cf(CF_META)?, b"FOO", b"BAR");
            db.write_batch(batch)?;
        }
        // Error: non-empty DB without schema version
        assert_eq!(
            ChronikIndexer::setup(
                new_params.clone(),
                load_tx,
                shutdown_requested
            )
            .unwrap_err()
            .downcast::<ChronikIndexerError>()?,
            ChronikIndexerError::MissingSchemaVersion,
        );
        // with wipe it works
        ChronikIndexer::setup(
            ChronikIndexerParams {
                wipe_db: true,
                ..new_params
            },
            load_tx,
            shutdown_requested,
        )?;

        Ok(())
    }

    #[test]
    fn test_plugin_versions() -> Result<()> {
        let dir = tempdir::TempDir::new("chronik-indexer--plugin_versions")?;
        let db = Db::open(dir.path())?;
        let plugin_reader = PluginsReader::new(&db)?;

        // Disabled LOKAD ID index is fine if plugin context is empty
        update_plugins_index(&db, &PluginContext::default(), false)?;

        // Must have LOKAD ID index if we have plugins
        assert_eq!(
            update_plugins_index(
                &db,
                &PluginContext {
                    plugins: vec![Plugin::default()]
                },
                false,
            )
            .unwrap_err()
            .downcast::<ChronikIndexerError>()?,
            ChronikIndexerError::PluginSystemRequiresLokadIdIndex,
        );

        update_plugins_index(
            &db,
            &PluginContext {
                plugins: vec![Plugin {
                    module_name: "plg1".to_string(),
                    class_name: "Plg1".to_string(),
                    version: "0.1.0".parse()?,
                    lokad_ids: vec![],
                }],
            },
            true,
        )?;
        assert_eq!(
            plugin_reader.metas()?,
            vec![(
                "plg1".to_string(),
                PluginMeta {
                    plugin_idx: 0,
                    version: "0.1.0".to_string(),
                    sync_height: -1,
                },
            )],
        );

        update_plugins_index(
            &db,
            &PluginContext {
                plugins: vec![Plugin {
                    module_name: "plg2".to_string(),
                    class_name: "Plg2".to_string(),
                    version: "0.2.0".parse()?,
                    lokad_ids: vec![],
                }],
            },
            true,
        )?;
        assert_eq!(
            plugin_reader.metas()?,
            vec![
                (
                    "plg1".to_string(),
                    PluginMeta {
                        plugin_idx: 0,
                        version: "0.1.0".to_string(),
                        sync_height: -1,
                    },
                ),
                (
                    "plg2".to_string(),
                    PluginMeta {
                        plugin_idx: 1,
                        version: "0.2.0".to_string(),
                        sync_height: -1,
                    },
                ),
            ],
        );

        update_plugins_index(
            &db,
            &PluginContext {
                plugins: vec![
                    Plugin {
                        module_name: "plg1".to_string(),
                        class_name: "Plg1".to_string(),
                        version: "0.1.0".parse()?,
                        lokad_ids: vec![],
                    },
                    Plugin {
                        module_name: "plg2".to_string(),
                        class_name: "Plg2".to_string(),
                        version: "0.2.0".parse()?,
                        lokad_ids: vec![],
                    },
                ],
            },
            true,
        )?;
        assert_eq!(
            plugin_reader.metas()?,
            vec![
                (
                    "plg1".to_string(),
                    PluginMeta {
                        plugin_idx: 0,
                        version: "0.1.0".to_string(),
                        sync_height: -1,
                    },
                ),
                (
                    "plg2".to_string(),
                    PluginMeta {
                        plugin_idx: 1,
                        version: "0.2.0".to_string(),
                        sync_height: -1,
                    },
                ),
            ],
        );

        assert_eq!(
            update_plugins_index(
                &db,
                &PluginContext {
                    plugins: vec![Plugin {
                        module_name: "plg1".to_string(),
                        class_name: "Plg1".to_string(),
                        version: "0.2.0".parse()?,
                        lokad_ids: vec![],
                    }],
                },
                true,
            )
            .unwrap_err()
            .downcast::<ChronikIndexerError>()?,
            ChronikIndexerError::PluginVersionMismatch {
                plugin_name: "plg1".to_string(),
                db_version: "0.1.0".to_string(),
                loaded_version: "0.2.0".to_string(),
            },
        );

        Ok(())
    }
}
