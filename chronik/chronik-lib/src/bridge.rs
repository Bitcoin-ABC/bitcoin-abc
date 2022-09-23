// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Rust side of the bridge; these structs and functions are exposed to C++.

use abc_rust_error::Result;
use chronik_util::{log, log_chronik};

/// Setup the Chronik bridge. Returns a ChronikIndexer object.
pub fn setup_chronik() -> Result<Box<Chronik>> {
    log!("Starting Chronik...\n");
    Ok(Box::new(Chronik))
}

/// Contains all db, runtime, tpc, etc. handles needed by Chronik.
/// This makes it so when this struct is dropped, all handles are relased
/// cleanly.
#[derive(Debug)]
pub struct Chronik;

impl Chronik {
    /// Tx added to the bitcoind mempool
    pub fn handle_tx_added_to_mempool(&self) {
        log_chronik!("Chronik: transaction added to mempool\n");
    }

    /// Tx removed from the bitcoind mempool
    pub fn handle_tx_removed_from_mempool(&self) {
        log_chronik!("Chronik: transaction removed from mempool\n");
    }

    /// Block connected to the longest chain
    pub fn handle_block_connected(&self) {
        log_chronik!("Chronik: block connected\n");
    }

    /// Block disconnected from the longest chain
    pub fn handle_block_disconnected(&self) {
        log_chronik!("Chronik: block disconnected\n");
    }
}
