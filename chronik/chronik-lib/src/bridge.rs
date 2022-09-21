// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Rust side of the bridge; these structs and functions are exposed to C++.

use chronik_util::{log, log_chronik};

/// Setup the Chronik bridge. Currently only logs to bitcoind.
pub fn setup_bridge() {
    log!("Starting Chronik...\n");
    log_chronik!(
        "Note: Chronik is not implemented yet. These logs are just for \
         testing.\n"
    );
}
