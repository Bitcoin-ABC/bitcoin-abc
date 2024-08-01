// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Chronik indexer, sorts all the data coming from bitcoind into Chronik's db.

abc_rust_lint::lint! {
    pub mod avalanche;
    pub mod subs_group;
    pub mod indexer;
    pub mod pause;
    pub mod query;
    pub mod subs;
    pub mod merkle;
}
