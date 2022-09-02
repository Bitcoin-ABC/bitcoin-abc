// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module containing the cxx definitions for the bridge from Rust to C++.

pub use self::ffi_inner::*;
use crate::bridge::setup_bridge;

#[allow(unsafe_code)]
#[cxx::bridge(namespace = "chronik_bridge")]
mod ffi_inner {
    extern "Rust" {
        fn setup_bridge();
    }
}
