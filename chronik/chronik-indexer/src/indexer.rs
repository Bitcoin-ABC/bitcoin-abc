// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module containing [`ChronikIndexer`] to index blocks and txs.

use std::{io::Write, path::PathBuf};

use abc_rust_error::{Result, WrapErr};
use bitcoinsuite_core::{
    block::BlockHash,
    tx::{Tx, TxId},
};
use chronik_bridge::{ffi, util::expect_unique_ptr};
use chronik_db::{
    db::{Db, WriteBatch},
    groups::{
        ScriptGroup, ScriptHistoryWriter, ScriptUtxoWriter, TokenIdGroup,
        TokenIdGroupAux, TokenIdHistoryWriter, TokenIdUtxoWriter,
    },
    index_tx::prepare_indexed_txs,
    io::{
        merge, token::TokenWriter, BlockHeight, BlockReader, BlockStatsWriter,
        BlockTxs, BlockWriter, DbBlock, GroupHistoryMemData, GroupUtxoMemData,
        MetadataReader, MetadataWriter, SchemaVersion, SpentByWriter, TxEntry,
        TxReader, TxWriter,
    },
    mem::{MemData, MemDataConf, Mempool, MempoolTx},
};
use chronik_util::{log, log_chronik};
use thiserror::Error;
use tokio::sync::RwLock;

use crate::{
    avalanche::Avalanche,
    indexer::ChronikIndexerError::*,
    query::{
        QueryBlocks, QueryBroadcast, QueryGroupHistory, QueryGroupUtxos,
        QueryTxs, UtxoProtobufOutput, UtxoProtobufValue,
    },
    subs::{BlockMsg, BlockMsgType, Subs},
    subs_group::TxMsgType,
};

const CURRENT_INDEXER_VERSION: SchemaVersion = 10;

/// Params for setting up a [`ChronikIndexer`] instance.
#[derive(Clone)]
pub struct ChronikIndexerParams {
    /// Folder where the node stores its data, net-dependent.
    pub datadir_net: PathBuf,
    /// Whether to clear the DB before opening the DB, e.g. when reindexing.
    pub wipe_db: bool,
    /// Whether Chronik should index SLP/ALP token txs.
    pub enable_token_index: bool,
    /// Whether to output Chronik performance statistics into a perf/ folder
    pub enable_perf_stats: bool,
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
        "Chronik outdated: Chronik has version {}, but the database has \
         version {0}. Upgrade your node to the appropriate version.",
        CURRENT_INDEXER_VERSION
    )]
    ChronikOutdated(SchemaVersion),

    /// Database is outdated
    #[error(
        "DB outdated: Chronik has version {}, but the database has version \
         {0}. -reindex/-chronikreindex to reindex the database to the new \
         version.",
        CURRENT_INDEXER_VERSION
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
}

impl ChronikIndexer {
    /// Setup the indexer with the given parameters, e.g. open the DB etc.
    pub fn setup(params: ChronikIndexerParams) -> Result<Self> {
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
        verify_schema_version(&db)?;
        verify_enable_token_index(&db, params.enable_token_index)?;
        let mempool = Mempool::new(ScriptGroup, params.enable_token_index);
        Ok(ChronikIndexer {
            db,
            mempool,
            mem_data: MemData::new(MemDataConf {}),
            script_group: ScriptGroup,
            avalanche: Avalanche::default(),
            subs: RwLock::new(Subs::new(ScriptGroup)),
            perf_path: params.enable_perf_stats.then_some(perf_path),
            is_token_index_enabled: params.enable_token_index,
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
        let tip_height = node_tip_info.height;
        for height in start_height + 1..=tip_height {
            if ffi::shutdown_requested() {
                log!("Stopped re-sync adding blocks\n");
                return Ok(());
            }
            let block_index = ffi::get_block_ancestor(node_tip_index, height)?;
            let ffi_block = bridge.load_block(block_index)?;
            let ffi_block = expect_unique_ptr("load_block", &ffi_block);
            let block = self.make_chronik_block(ffi_block, block_index)?;
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
            if ffi::shutdown_requested() {
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
            let ffi_block = bridge.load_block(block_index)?;
            let ffi_block = expect_unique_ptr("load_block", &ffi_block);
            let block = self.make_chronik_block(ffi_block, block_index)?;
            self.handle_block_disconnected(block)?;
        }
        Ok(fork_info.height)
    }

    /// Add transaction to the indexer's mempool.
    pub fn handle_tx_added_to_mempool(
        &mut self,
        mempool_tx: MempoolTx,
    ) -> Result<()> {
        let result = self.mempool.insert(&self.db, mempool_tx)?;
        self.subs.get_mut().handle_tx_event(
            &result.mempool_tx.tx,
            TxMsgType::AddedToMempool,
            &result.token_id_aux,
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
        block_writer.insert(&mut batch, &block.db_block)?;
        let first_tx_num = tx_writer.insert(
            &mut batch,
            &block.block_txs,
            &mut self.mem_data.txs,
        )?;
        let index_txs =
            prepare_indexed_txs(&self.db, first_tx_num, &block.txs)?;
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
        let token_id_aux;
        if self.is_token_index_enabled {
            let processed_token_batch =
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
            token_id_aux = TokenIdGroupAux::default();
        }
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
        });
        for tx in &block.txs {
            subs.handle_tx_event(tx, TxMsgType::Confirmed, &token_id_aux);
        }
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
        block_writer.delete(&mut batch, &block.db_block)?;
        let first_tx_num = tx_writer.delete(
            &mut batch,
            &block.block_txs,
            &mut self.mem_data.txs,
        )?;
        let index_txs =
            prepare_indexed_txs(&self.db, first_tx_num, &block.txs)?;
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
        self.avalanche.disconnect_block(block.db_block.height)?;
        self.db.write_batch(batch)?;
        let subs = self.subs.get_mut();
        subs.broadcast_block_msg(BlockMsg {
            msg_type: BlockMsgType::Disconnected,
            hash: block.db_block.hash,
            height: block.db_block.height,
        });
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
        });
        let tx_reader = TxReader::new(&self.db)?;
        let first_tx_num = tx_reader
            .first_tx_num_by_block(block.db_block.height)?
            .unwrap();
        let index_txs =
            prepare_indexed_txs(&self.db, first_tx_num, &block.txs)?;
        let token_id_aux = if self.is_token_index_enabled {
            TokenIdGroupAux::from_db(&index_txs, &self.db)?
        } else {
            TokenIdGroupAux::default()
        };
        for tx in &block.txs {
            subs.handle_tx_event(tx, TxMsgType::Finalized, &token_id_aux);
        }
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
        }
    }

    /// Return [`QueryBlocks`] to read blocks from the DB.
    pub fn blocks(&self) -> QueryBlocks<'_> {
        QueryBlocks {
            db: &self.db,
            avalanche: &self.avalanche,
            mempool: &self.mempool,
            is_token_index_enabled: self.is_token_index_enabled,
        }
    }

    /// Return [`QueryTxs`] to return txs from mempool/DB.
    pub fn txs(&self) -> QueryTxs<'_> {
        QueryTxs {
            db: &self.db,
            avalanche: &self.avalanche,
            mempool: &self.mempool,
            is_token_index_enabled: self.is_token_index_enabled,
        }
    }

    /// Return [`QueryGroupHistory`] for scripts to query the tx history of
    /// scripts.
    pub fn script_history(&self) -> Result<QueryGroupHistory<'_, ScriptGroup>> {
        Ok(QueryGroupHistory {
            db: &self.db,
            avalanche: &self.avalanche,
            mempool: &self.mempool,
            mempool_history: self.mempool.script_history(),
            group: self.script_group.clone(),
            is_token_index_enabled: self.is_token_index_enabled,
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
        })
    }

    /// Return [`QueryGroupHistory`] for token IDs to query the tx history of
    /// token IDs.
    pub fn token_id_history(&self) -> QueryGroupHistory<'_, TokenIdGroup> {
        QueryGroupHistory {
            db: &self.db,
            avalanche: &self.avalanche,
            mempool: &self.mempool,
            mempool_history: self.mempool.token_id_history(),
            group: TokenIdGroup,
            is_token_index_enabled: self.is_token_index_enabled,
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
        }
    }

    /// Subscribers, behind read/write lock
    pub fn subs(&self) -> &RwLock<Subs> {
        &self.subs
    }

    /// Build the ChronikBlock from the CBlockIndex
    pub fn make_chronik_block(
        &self,
        block: &ffi::CBlock,
        bindex: &ffi::CBlockIndex,
    ) -> Result<ChronikBlock> {
        let block = ffi::bridge_block(block, bindex)?;
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
        Ok(ChronikBlock {
            db_block,
            block_txs,
            size: block.size,
            txs,
        })
    }
}

fn verify_schema_version(db: &Db) -> Result<()> {
    let metadata_reader = MetadataReader::new(db)?;
    let metadata_writer = MetadataWriter::new(db)?;
    let is_empty = db.is_db_empty()?;
    match metadata_reader
        .schema_version()
        .wrap_err(CorruptedSchemaVersion)?
    {
        Some(schema_version) => {
            assert!(!is_empty, "Empty DB can't have a schema version");
            if schema_version > CURRENT_INDEXER_VERSION {
                return Err(ChronikOutdated(schema_version).into());
            }
            if schema_version < CURRENT_INDEXER_VERSION {
                return Err(DatabaseOutdated(schema_version).into());
            }
        }
        None => {
            if !is_empty {
                return Err(MissingSchemaVersion.into());
            }
            let mut batch = WriteBatch::default();
            metadata_writer
                .update_schema_version(&mut batch, CURRENT_INDEXER_VERSION)?;
            db.write_batch(batch)?;
        }
    }
    log!("Chronik has version {CURRENT_INDEXER_VERSION}\n");
    Ok(())
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
    };
    use pretty_assertions::assert_eq;

    use crate::indexer::{
        ChronikBlock, ChronikIndexer, ChronikIndexerError,
        ChronikIndexerParams, CURRENT_INDEXER_VERSION,
    };

    #[test]
    fn test_indexer() -> Result<()> {
        let tempdir = tempdir::TempDir::new("chronik-indexer--indexer")?;
        let datadir_net = tempdir.path().join("regtest");
        let params = ChronikIndexerParams {
            datadir_net: datadir_net.clone(),
            wipe_db: false,
            enable_token_index: false,
            enable_perf_stats: false,
        };
        // regtest folder doesn't exist yet -> error
        assert_eq!(
            ChronikIndexer::setup(params.clone())
                .unwrap_err()
                .downcast::<ChronikIndexerError>()?,
            ChronikIndexerError::CreateDirFailed(datadir_net.join("indexes")),
        );

        // create regtest folder, setup will work now
        std::fs::create_dir(&datadir_net)?;
        let mut indexer = ChronikIndexer::setup(params.clone())?;
        // indexes and indexes/chronik folder now exist
        assert!(datadir_net.join("indexes").exists());
        assert!(datadir_net.join("indexes").join("chronik").exists());

        // DB is empty
        assert_eq!(BlockReader::new(&indexer.db)?.by_height(0)?, None);
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
            txs: vec![],
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
        let indexer = ChronikIndexer::setup(ChronikIndexerParams {
            wipe_db: true,
            ..params
        })?;
        assert_eq!(BlockReader::new(&indexer.db)?.by_height(0)?, None);

        Ok(())
    }

    #[test]
    fn test_schema_version() -> Result<()> {
        let dir = tempdir::TempDir::new("chronik-indexer--schema_version")?;
        let chronik_path = dir.path().join("indexes").join("chronik");
        let params = ChronikIndexerParams {
            datadir_net: dir.path().to_path_buf(),
            wipe_db: false,
            enable_token_index: false,
            enable_perf_stats: false,
        };

        // Setting up DB first time sets the schema version
        ChronikIndexer::setup(params.clone())?;
        {
            let db = Db::open(&chronik_path)?;
            assert_eq!(
                MetadataReader::new(&db)?.schema_version()?,
                Some(CURRENT_INDEXER_VERSION)
            );
        }
        // Opening DB again works fine
        ChronikIndexer::setup(params.clone())?;

        // Override DB schema version to 0
        {
            let db = Db::open(&chronik_path)?;
            let mut batch = WriteBatch::default();
            MetadataWriter::new(&db)?.update_schema_version(&mut batch, 0)?;
            db.write_batch(batch)?;
        }
        // -> DB too old
        assert_eq!(
            ChronikIndexer::setup(params.clone())
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
            ChronikIndexer::setup(params.clone())
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
            ChronikIndexer::setup(params.clone())
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
            ChronikIndexer::setup(new_params.clone())
                .unwrap_err()
                .downcast::<ChronikIndexerError>()?,
            ChronikIndexerError::MissingSchemaVersion,
        );
        // with wipe it works
        ChronikIndexer::setup(ChronikIndexerParams {
            wipe_db: true,
            ..new_params
        })?;

        Ok(())
    }
}
