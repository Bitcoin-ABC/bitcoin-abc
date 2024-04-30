// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module containing the cxx definitions for the bridge from Rust to C++.

pub use self::ffi_inner::*;
use crate::bridge::{setup_chronik, Chronik};

#[allow(unsafe_code)]
#[cxx::bridge(namespace = "chronik_bridge")]
mod ffi_inner {
    /// Params for setting up Chronik
    #[derive(Debug)]
    pub struct SetupParams {
        /// Where the data of the blockchain is stored, dependent on network
        /// (mainnet, testnet, regtest)
        pub datadir_net: String,
        /// Host addresses where the Chronik HTTP endpoint will be served
        pub hosts: Vec<String>,
        /// Default port for `hosts` if only an IP address is given
        pub default_port: u16,
        /// Whether to clear the DB before proceeding, e.g. when reindexing
        pub wipe_db: bool,
        /// Whether Chronik should index SLP/ALP token transactions
        pub enable_token_index: bool,
        /// Whether Chronik should index transactions by LOKAD ID
        pub enable_lokad_id_index: bool,
        /// Whether pausing Chronik indexing is allowed
        pub is_pause_allowed: bool,
        /// Whether to output Chronik performance statistics into a perf/
        /// folder
        pub enable_perf_stats: bool,
        /// Duration between WebSocket pings initiated by Chronik.
        pub ws_ping_interval_secs: u64,
        /// Enable permissive CORS on Chronik's HTTP endpoint
        pub enable_cors: bool,
        /// Tuning settings for the TxNumCache.
        pub tx_num_cache: TxNumCacheSettings,
    }

    /// Settings for tuning the TxNumCache.
    #[derive(Debug)]
    pub struct TxNumCacheSettings {
        /// How many buckets are on the belt
        pub num_buckets: usize,
        /// How many txs are cached in each bucket
        pub bucket_size: usize,
    }

    extern "Rust" {
        type Chronik;
        fn setup_chronik(
            params: SetupParams,
            config: &Config,
            node: &NodeContext,
        ) -> bool;

        fn handle_tx_added_to_mempool(
            &self,
            ptx: &CTransaction,
            spent_coins: &CxxVector<CCoin>,
            time_first_seen: i64,
        );
        fn handle_tx_removed_from_mempool(&self, txid: [u8; 32]);
        fn handle_block_connected(&self, block: &CBlock, bindex: &CBlockIndex);
        fn handle_block_disconnected(
            &self,
            block: &CBlock,
            bindex: &CBlockIndex,
        );
        fn handle_block_finalized(&self, bindex: &CBlockIndex);
    }

    unsafe extern "C++" {
        include!("blockindex.h");
        include!("chronik-cpp/chronik_validationinterface.h");
        include!("coins.h");
        include!("config.h");
        include!("node/context.h");
        include!("primitives/block.h");
        include!("primitives/transaction.h");

        /// CBlockIndex from blockindex.h
        #[namespace = ""]
        type CBlockIndex = chronik_bridge::ffi::CBlockIndex;

        /// ::CBlock from primitives/block.h
        #[namespace = ""]
        type CBlock = chronik_bridge::ffi::CBlock;

        /// ::Coin from coins.h (renamed to CCoin to prevent a name clash)
        #[namespace = ""]
        #[cxx_name = "Coin"]
        type CCoin = chronik_bridge::ffi::CCoin;

        /// ::Config from config.h
        #[namespace = ""]
        type Config = chronik_bridge::ffi::Config;

        /// ::CTransaction from primitives/transaction.h
        #[namespace = ""]
        type CTransaction = chronik_bridge::ffi::CTransaction;

        /// NodeContext from node/context.h
        #[namespace = "node"]
        type NodeContext = chronik_bridge::ffi::NodeContext;

        /// Bridge to bitcoind to access the node
        type ChronikBridge = chronik_bridge::ffi::ChronikBridge;

        /// Register the Chronik instance as CValidationInterface to receive
        /// chain updates from the node.
        #[namespace = "chronik"]
        fn StartChronikValidationInterface(
            node: &NodeContext,
            chronik: Box<Chronik>,
        );
    }
}
