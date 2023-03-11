// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Foreign-function interface to bitcoind. Bridges C++ to Rust.
//!
//! The bridge is split into two crates, `chronik-bridge` and `chronik-lib`.
//!
//! In this crate `chronik-bridge` we define:
//! 1. Shared types (like `Tx`, `Block`, etc.)
//! 2. Functions accessing the node, which are defined in C++ (like `log_print`)
//!
//! The crate can be used as a dependency by other crates to call into the node.

abc_rust_lint::lint! {
    pub mod ffi;
    pub mod util;
}
