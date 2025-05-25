// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! WebAssembly module for ECC and cryptographic hashes.

abc_rust_lint::lint! {
    pub mod ecc;
    pub mod hash;
    pub mod public_key_crypto;
}
