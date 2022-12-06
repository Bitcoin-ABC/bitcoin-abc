// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Foreign-function interface to bitcoind. Bridges Rust to C++.
//!
//! The bridge is split into two crates, `chronik-bridge` and `chronik-lib`.
//!
//! In this crate `chronik-lib`, we define a library that can be statically
//! linked to by the node.
//!
//! We define all the functions that the C++ side needs to call:
//! 1. Methods in CValidationInterface notifying the indexer of added/removed
//!    blocks/transactions.
//! 2. `setup_bridge`, to instantiate the bridge connecting to C++.

abc_rust_lint::lint! {
    pub mod bridge;
    pub mod ffi;
}
