// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Crate for the HTTP endpoint for Chronik.

abc_rust_lint::lint! {
    pub mod error;
    pub mod handlers;
    pub mod electrum;
    pub(crate) mod electrum_codec;
    pub mod parse;
    pub mod protobuf;
    pub mod server;
    pub(crate) mod validation;
    pub mod ws;
}
