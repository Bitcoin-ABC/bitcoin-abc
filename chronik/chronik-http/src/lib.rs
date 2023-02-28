// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Crate for the HTTP endpoint for Chronik.

abc_rust_lint::lint! {
    pub mod error;
    pub mod protobuf;
    pub mod server;
    pub(crate) mod validation;

    /// Protobuf structs/enums for the Chronik HTTP server
    pub mod proto {
        include!(concat!(env!("OUT_DIR"), "/chronik.rs"));
    }
}
