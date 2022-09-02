// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Rust side of the bridge; these structs and functions are exposed to C++.

/// Setup the Chronik bridge. Currently only logs to bitcoind.
pub fn setup_bridge() {
    chronik_bridge::ffi::log_println("Starting Chronik...");
}
