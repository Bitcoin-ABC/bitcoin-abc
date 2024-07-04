// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Plugin interface using Python for Chronik.
//!
//! Allows users to specify scripts in a `plugins` folder for indexing novel
//! protocols.

abc_rust_lint::lint! {
    pub use chronik_plugin_common::*;

    // When the plugin system is enabled, we simply re-export the impl
    #[cfg(feature = "enabled")]
    pub use chronik_plugin_impl::*;

    // Otherwise we use fallback modules
    #[cfg(not(feature = "enabled"))]
    pub mod context;
}
