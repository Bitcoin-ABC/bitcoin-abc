// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Core primitives for dealing with Bitcoin-like chains.
//!
//! Note: This is a general purpose library, but has been optimized for the
//! usage in Chronik, an indexer for Bitcoin ABC.

abc_rust_lint::lint! {
    pub mod address;
    pub mod block;
    pub mod bytes;
    pub mod error;
    pub mod hash;
    pub mod net;
    pub mod script;
    pub mod ser;
    pub mod tx;
}
