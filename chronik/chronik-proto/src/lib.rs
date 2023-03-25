// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Protobuf structs/enums for Chronik.

abc_rust_lint::lint! {
    pub mod proto {
        //! Module with protobuf structs/enums for the Chronik HTTP server.
        include!(concat!(env!("OUT_DIR"), "/chronik.rs"));
    }
}
