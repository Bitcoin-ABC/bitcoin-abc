// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for cryptographic hashes

use sha2::Digest;
use wasm_bindgen::prelude::wasm_bindgen;

/// Calculate RIPEMD160(SHA256(data)), commonly used as address hash.
#[wasm_bindgen(js_name = shaRmd160)]
pub fn sha_rmd160(data: &[u8]) -> Vec<u8> {
    ripemd::Ripemd160::digest(sha2::Sha256::digest(data)).to_vec()
}

/// Calculate SHA256(data).
#[wasm_bindgen]
pub fn sha256(data: &[u8]) -> Vec<u8> {
    sha2::Sha256::digest(data).to_vec()
}

/// Calculate SHA256(SHA256(data)).
#[wasm_bindgen]
pub fn sha256d(data: &[u8]) -> Vec<u8> {
    sha2::Sha256::digest(sha2::Sha256::digest(data)).to_vec()
}
