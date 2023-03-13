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

    extern "Rust" {
        type Chronik;
        fn setup_chronik(params: SetupParams) -> bool;

        fn handle_tx_added_to_mempool(&self);
        fn handle_tx_removed_from_mempool(&self);
        fn handle_block_connected(&self, block: &CBlock, bindex: &CBlockIndex);
        fn handle_block_disconnected(
            &self,
            block: &CBlock,
            bindex: &CBlockIndex,
        );
    }

    unsafe extern "C++" {
        include!("blockindex.h");
        include!("chronik-cpp/chronik_validationinterface.h");
        include!("primitives/block.h");

        /// CBlockIndex from blockindex.h
        #[namespace = ""]
        type CBlockIndex = chronik_bridge::ffi::CBlockIndex;

        /// ::CBlock from primitives/block.h
        #[namespace = ""]
        type CBlock = chronik_bridge::ffi::CBlock;

        /// Register the Chronik instance as CValidationInterface to receive
        /// chain updates from the node.
        #[namespace = "chronik"]
        fn StartChronikValidationInterface(node: Box<Chronik>);
    }
}
