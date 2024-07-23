// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Plugin interface using Python for Chronik.
//!
//! Allows users to specify scripts in a `plugins` folder for indexing novel
//! protocols.

abc_rust_lint::lint! {
    pub mod context;
    pub mod module;
    mod plugin;
    pub mod script;
    pub mod token;
    pub mod tx;
    mod util;
}
