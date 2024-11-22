// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Rust side of the bridge; these structs and functions are exposed to C++.

use std::{
    net::{AddrParseError, IpAddr, SocketAddr},
    path::PathBuf,
    sync::Arc,
    time::Duration,
};

use abc_rust_error::Result;
use bitcoinsuite_core::{
    net::Net,
    tx::{Tx, TxId},
};
use chronik_bridge::{ffi::init_error, util::expect_unique_ptr};
use chronik_db::{
    index_tx::TxNumCacheSettings, io::GroupHistorySettings, mem::MempoolTx,
};
use chronik_http::electrum::{
    ChronikElectrumServer, ChronikElectrumServerParams,
};
use chronik_http::server::{
    ChronikServer, ChronikServerParams, ChronikSettings,
};
use chronik_indexer::{
    indexer::{ChronikIndexer, ChronikIndexerParams, Node},
    pause::Pause,
};
use chronik_plugin::{context::PluginContext, params::PluginParams};
use chronik_util::{log, log_chronik, mount_loggers, Loggers};
use thiserror::Error;
use tokio::sync::RwLock;

use crate::ffi::{self, StartChronikValidationInterface};

/// Errors for [`Chronik`] and [`setup_chronik`].
#[derive(Debug, Eq, Error, PartialEq)]
pub enum ChronikError {
    /// Chronik host address failed to parse
    #[error("Invalid Chronik host address {0:?}: {1}")]
    InvalidChronikHost(String, AddrParseError),

    /// Unknown net repr
    #[error("Unknown net repr {0}")]
    UnknownNetRepr(u8),
}

use self::ChronikError::*;

/// Setup the Chronik bridge. Returns a ChronikIndexer object.
pub fn setup_chronik(
    params: ffi::SetupParams,
    node: &ffi::NodeContext,
) -> bool {
    match try_setup_chronik(params, node) {
        Ok(()) => true,
        Err(report) => {
            log_chronik!("{report:?}\n");
            init_error(&report.to_string())
        }
    }
}

fn try_setup_chronik(
    params: ffi::SetupParams,
    node_context: &ffi::NodeContext,
) -> Result<()> {
    abc_rust_error::install();
    mount_loggers(Loggers {
        log: chronik_bridge::ffi::log_print,
        log_chronik: chronik_bridge::ffi::log_print_chronik,
    });
    let hosts = params
        .hosts
        .into_iter()
        .map(|host| parse_socket_addr(host, params.default_port))
        .collect::<Result<Vec<_>>>()?;
    let datadir: PathBuf = params.datadir.into();
    let net = match params.net {
        ffi::Net::Mainnet => Net::Mainnet,
        ffi::Net::Testnet => Net::Testnet,
        ffi::Net::Regtest => Net::Regtest,
        _ => return Err(UnknownNetRepr(params.net.repr).into()),
    };
    let plugin_ctx = PluginContext::setup(PluginParams {
        net,
        plugins_dir: datadir.join("plugins"),
        plugins_conf: datadir.join("plugins.toml"),
    })?;
    log!("Starting Chronik bound to {:?}\n", hosts);
    let bridge = chronik_bridge::ffi::make_bridge(node_context);
    let bridge_ref = expect_unique_ptr("make_bridge", &bridge);
    let (pause, pause_notify) = Pause::new_pair(params.is_pause_allowed);
    let mut indexer = ChronikIndexer::setup(
        ChronikIndexerParams {
            datadir_net: params.datadir_net.into(),
            wipe_db: params.wipe_db,
            enable_token_index: params.enable_token_index,
            enable_lokad_id_index: params.enable_lokad_id_index,
            enable_scripthash_index: params.enable_scripthash_index,
            enable_perf_stats: params.enable_perf_stats,
            tx_num_cache: TxNumCacheSettings {
                bucket_size: params.tx_num_cache.bucket_size,
                num_buckets: params.tx_num_cache.num_buckets,
            },
            plugin_ctx: Arc::new(plugin_ctx),
            script_history: GroupHistorySettings {
                is_member_hash_index_enabled: params.enable_scripthash_index,
            },
            decompress_script_fn: decompress_script,
        },
        |file_num, data_pos, undo_pos| {
            Ok(Tx::from(bridge_ref.load_tx(file_num, data_pos, undo_pos)?))
        },
        || bridge_ref.shutdown_requested(),
    )?;
    indexer.resync_indexer(bridge_ref)?;
    if bridge.shutdown_requested() {
        // Don't setup Chronik if the user requested shutdown during resync
        return Ok(());
    }
    let indexer = Arc::new(RwLock::new(indexer));
    let node = Arc::new(Node { bridge });
    let runtime = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()?;
    let server = runtime.block_on({
        let indexer = Arc::clone(&indexer);
        let node = Arc::clone(&node);
        async move {
            // try_bind requires a Runtime
            ChronikServer::setup(ChronikServerParams {
                hosts,
                indexer,
                node,
                pause_notify: Arc::new(pause_notify),
                settings: ChronikSettings {
                    ws_ping_interval: Duration::from_secs(
                        params.ws_ping_interval_secs,
                    ),
                    enable_cors: params.enable_cors,
                },
            })
        }
    })?;
    runtime.spawn({
        let node = Arc::clone(&node);
        async move {
            node.ok_or_abort("ChronikServer::serve", server.serve().await);
        }
    });

    if !params.electrum_hosts.is_empty() {
        let electrum_hosts = params
            .electrum_hosts
            .into_iter()
            .map(|host| parse_socket_addr(host, params.electrum_default_port))
            .collect::<Result<Vec<_>>>()?;
        log!(
            "Starting Chronik Electrum interface bound to {:?}\n",
            electrum_hosts
        );
        let electrum_server =
            ChronikElectrumServer::setup(ChronikElectrumServerParams {
                hosts: electrum_hosts,
                indexer: indexer.clone(),
                node: node.clone(),
            })?;
        runtime.spawn({
            let node = Arc::clone(&node);
            async move {
                node.ok_or_abort(
                    "ChronikElectrumServer::serve",
                    electrum_server.serve().await,
                );
            }
        });
    }

    let chronik = Box::new(Chronik {
        node: Arc::clone(&node),
        indexer,
        pause,
        runtime,
    });
    StartChronikValidationInterface(node_context, chronik);
    Ok(())
}

fn parse_socket_addr(host: String, default_port: u16) -> Result<SocketAddr> {
    if let Ok(addr) = host.parse::<SocketAddr>() {
        return Ok(addr);
    }
    let ip_addr = host
        .parse::<IpAddr>()
        .map_err(|err| InvalidChronikHost(host, err))?;
    Ok(SocketAddr::new(ip_addr, default_port))
}

fn decompress_script(script: &[u8]) -> Result<Vec<u8>> {
    Ok(chronik_bridge::ffi::decompress_script(script)?)
}

/// Contains all db, runtime, tpc, etc. handles needed by Chronik.
/// This makes it so when this struct is dropped, all handles are relased
/// cleanly.
pub struct Chronik {
    node: Arc<Node>,
    indexer: Arc<RwLock<ChronikIndexer>>,
    pause: Pause,
    // Having this here ensures HTTP server, outstanding requests etc. will get
    // stopped when `Chronik` is dropped.
    runtime: tokio::runtime::Runtime,
}

impl Chronik {
    /// Tx added to the bitcoind mempool
    pub fn handle_tx_added_to_mempool(
        &self,
        ptx: &ffi::CTransaction,
        spent_coins: &cxx::CxxVector<ffi::CCoin>,
        time_first_seen: i64,
    ) {
        self.block_if_paused();
        self.node.ok_or_abort(
            "handle_tx_added_to_mempool",
            self.add_tx_to_mempool(ptx, spent_coins, time_first_seen),
        );
    }

    /// Tx removed from the bitcoind mempool
    pub fn handle_tx_removed_from_mempool(&self, txid: [u8; 32]) {
        self.block_if_paused();
        let mut indexer = self.indexer.blocking_write();
        let txid = TxId::from(txid);
        self.node.ok_or_abort(
            "handle_tx_removed_from_mempool",
            indexer.handle_tx_removed_from_mempool(txid),
        );
        log_chronik!("Chronik: transaction {} removed from mempool\n", txid);
    }

    /// Block connected to the longest chain
    pub fn handle_block_connected(
        &self,
        block: &ffi::CBlock,
        bindex: &ffi::CBlockIndex,
    ) {
        self.block_if_paused();
        self.node.ok_or_abort(
            "handle_block_connected",
            self.connect_block(block, bindex),
        );
    }

    /// Block disconnected from the longest chain
    pub fn handle_block_disconnected(
        &self,
        block: &ffi::CBlock,
        bindex: &ffi::CBlockIndex,
    ) {
        self.block_if_paused();
        self.node.ok_or_abort(
            "handle_block_disconnected",
            self.disconnect_block(block, bindex),
        );
    }

    /// Block finalized with Avalanche
    pub fn handle_block_finalized(&self, bindex: &ffi::CBlockIndex) {
        self.block_if_paused();
        self.node
            .ok_or_abort("handle_block_finalized", self.finalize_block(bindex));
    }

    /// Block invalidated with Avalanche
    pub fn handle_block_invalidated(
        &self,
        block: &ffi::CBlock,
        bindex: &ffi::CBlockIndex,
    ) {
        self.block_if_paused();
        self.node.ok_or_abort(
            "handle_block_invalidated",
            self.invalidate_block(block, bindex),
        );
    }

    fn add_tx_to_mempool(
        &self,
        ptx: &ffi::CTransaction,
        spent_coins: &cxx::CxxVector<ffi::CCoin>,
        time_first_seen: i64,
    ) -> Result<()> {
        let mut indexer = self.indexer.blocking_write();
        let tx = chronik_bridge::ffi::bridge_tx(ptx, spent_coins)?;
        let txid = TxId::from(tx.txid);
        indexer.handle_tx_added_to_mempool(MempoolTx {
            tx: Tx::from(tx),
            time_first_seen,
        })?;
        log_chronik!("Chronik: transaction {} added to mempool\n", txid);
        Ok(())
    }

    fn connect_block(
        &self,
        block: &ffi::CBlock,
        bindex: &ffi::CBlockIndex,
    ) -> Result<()> {
        let block_undo = self.node.bridge.load_block_undo(bindex)?;
        let block =
            chronik_bridge::ffi::bridge_block(block, &block_undo, bindex)?;
        let mut indexer = self.indexer.blocking_write();
        let block = indexer.make_chronik_block(block);
        let block_hash = block.db_block.hash.clone();
        let num_txs = block.block_txs.txs.len();
        indexer.handle_block_connected(block)?;
        log_chronik!(
            "Chronik: block {} connected with {} txs\n",
            block_hash,
            num_txs,
        );
        Ok(())
    }

    fn disconnect_block(
        &self,
        block: &ffi::CBlock,
        bindex: &ffi::CBlockIndex,
    ) -> Result<()> {
        let block_undo = self.node.bridge.load_block_undo(bindex)?;
        let block =
            chronik_bridge::ffi::bridge_block(block, &block_undo, bindex)?;
        let mut indexer = self.indexer.blocking_write();
        let block = indexer.make_chronik_block(block);
        let block_hash = block.db_block.hash.clone();
        let num_txs = block.block_txs.txs.len();
        indexer.handle_block_disconnected(block)?;
        log_chronik!(
            "Chronik: block {} disconnected with {} txs\n",
            block_hash,
            num_txs,
        );
        Ok(())
    }

    fn finalize_block(&self, bindex: &ffi::CBlockIndex) -> Result<()> {
        let mut indexer = self.indexer.blocking_write();
        let block = indexer.load_chronik_block(&self.node.bridge, bindex)?;
        let block_hash = block.db_block.hash.clone();
        let num_txs = block.block_txs.txs.len();
        indexer.handle_block_finalized(block)?;
        log_chronik!(
            "Chronik: block {} finalized with {} txs\n",
            block_hash,
            num_txs,
        );
        Ok(())
    }

    fn invalidate_block(
        &self,
        block: &ffi::CBlock,
        bindex: &ffi::CBlockIndex,
    ) -> Result<()> {
        // If there is no block undo for this block, skip the processing.
        // This behavior can only occur for blocks building on a parked chain,
        // and we don't have any interest for these blocks. This might as well
        // be another chain.
        let Ok(block_undo) = self.node.bridge.load_block_undo(bindex) else {
            return Ok(());
        };
        let block =
            chronik_bridge::ffi::bridge_block(block, &block_undo, bindex)?;
        let mut indexer = self.indexer.blocking_write();
        let block = indexer.make_chronik_block(block);
        let block_hash = block.db_block.hash.clone();
        let num_txs = block.block_txs.txs.len();
        indexer.handle_block_invalidated(block)?;
        log_chronik!(
            "Chronik: block {block_hash} invalidated with {num_txs} txs\n",
        );
        Ok(())
    }

    fn block_if_paused(&self) {
        self.pause.block_if_paused(&self.runtime);
    }
}

impl std::fmt::Debug for Chronik {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Chronik {{ .. }}")
    }
}
