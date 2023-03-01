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
    }

    /// Block coming from bitcoind to Chronik.
    ///
    /// We don't index all fields (e.g. hashMerkleRoot), only those that are
    /// needed when querying a range of blocks.
    ///
    /// Instead of storing all the block data for Chronik again, we only store
    /// file_num, data_pos and undo_pos of the block data of the node.
    ///
    /// This makes the index relatively small, as it's mostly just pointing to
    /// the data the node already stores.
    ///
    /// Note that this prohibits us from using Chronik in pruned mode.
    #[derive(Debug, Clone, PartialEq, Eq)]
    pub struct Block {
        /// Block hash
        pub hash: [u8; 32],
        /// hashPrevBlock, hash of the previous block in the chain
        pub prev_hash: [u8; 32],
        /// nBits, difficulty of the header
        pub n_bits: u32,
        /// Timestamp of the block
        pub timestamp: i64,
        /// Height of the block in the chain.
        pub height: i32,
        /// File number of the block file this block is stored in.
        /// This can be used to later slice out transactions, so we don't have
        /// to index txs twice.
        pub file_num: u32,
        /// Position of the block within the block file, starting at the block
        /// header.
        pub data_pos: u32,
        /// Position of the undo data within the undo file.
        pub undo_pos: u32,
    }

    extern "Rust" {
        type Chronik;
        fn setup_chronik(params: SetupParams) -> bool;

        fn handle_tx_added_to_mempool(&self);
        fn handle_tx_removed_from_mempool(&self);
        fn handle_block_connected(&self, block: Block);
        fn handle_block_disconnected(&self, block: Block);
    }

    unsafe extern "C++" {
        include!("chronik-cpp/chronik_validationinterface.h");
        /// Register the Chronik instance as CValidationInterface to receive
        /// chain updates from the node.
        #[namespace = "chronik"]
        fn StartChronikValidationInterface(node: Box<Chronik>);
    }
}
