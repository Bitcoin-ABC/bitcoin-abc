// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Foreign-function interface to bitcoind. Bridges Rust to and from C++.

abc_rust_lint::lint! {
    pub mod bridge;
    pub mod ffi;
}
