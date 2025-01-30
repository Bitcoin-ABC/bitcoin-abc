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

/// Calculate SHA512(data).
#[wasm_bindgen]
pub fn sha512(data: &[u8]) -> Vec<u8> {
    sha2::Sha512::digest(data).to_vec()
}

/// Instance to calculate SHA256 in a streaming fashion
#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct Sha256H {
    hasher: Option<sha2::Sha256>,
}

#[wasm_bindgen]
impl Sha256H {
    /// Create new hasher instance
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Sha256H {
            hasher: Some(sha2::Sha256::new()),
        }
    }

    /// Feed bytes into the hasher
    pub fn update(&mut self, data: &[u8]) {
        if let Some(hasher) = &mut self.hasher {
            hasher.update(data);
        }
    }

    /// Finalize the hash and return the result
    pub fn finalize(&mut self) -> Vec<u8> {
        if let Some(hasher) = self.hasher.take() {
            hasher.finalize().to_vec()
        } else {
            vec![]
        }
    }

    /// Clone the hasher
    pub fn clone(&self) -> Self {
        <Self as Clone>::clone(self)
    }
}

/// Instance to calculate SHA512 in a streaming fashion
#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct Sha512H {
    hasher: Option<sha2::Sha512>,
}

#[wasm_bindgen]
impl Sha512H {
    /// Create new hasher instance
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Sha512H {
            hasher: Some(sha2::Sha512::new()),
        }
    }

    /// Feed bytes into the hasher
    pub fn update(&mut self, data: &[u8]) {
        if let Some(hasher) = &mut self.hasher {
            hasher.update(data);
        }
    }

    /// Finalize the hash and return the result
    pub fn finalize(&mut self) -> Vec<u8> {
        if let Some(hasher) = self.hasher.take() {
            hasher.finalize().to_vec()
        } else {
            vec![]
        }
    }

    /// Clone the hasher
    pub fn clone(&self) -> Self {
        <Self as Clone>::clone(self)
    }
}
