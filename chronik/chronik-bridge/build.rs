// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

fn main() {
    // Build the C++ sources and headers for bridging Rust and C++.
    let _build = cxx_build::bridge("src/ffi.rs");
    println!("cargo:rerun-if-changed=src/ffi.rs");
}
