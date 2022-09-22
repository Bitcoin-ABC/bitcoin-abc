// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module containing the cxx definitions for the bridge from Rust to C++.

pub use self::ffi_inner::*;
use crate::bridge::{setup_bridge, Chronik};

#[allow(unsafe_code)]
#[cxx::bridge(namespace = "chronik_bridge")]
mod ffi_inner {
    extern "Rust" {
        type Chronik;
        fn setup_bridge() -> Result<Box<Chronik>>;

        fn handle_tx_added_to_mempool(&self);
        fn handle_tx_removed_from_mempool(&self);
        fn handle_block_connected(&self);
        fn handle_block_disconnected(&self);
    }
}
