// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! # avalanche-lib-wasm
//!
//! WebAssembly library for eCash Avalanche proof, stake, and delegation
//! management.
//!
//! This library provides functionality to:
//! - Create and manage avalanche stakes
//! - Build and verify avalanche proofs
//! - Handle proof delegations
//! - Serialize/deserialize proof data
//!
//! Based on the eCash Avalanche technical specification and the C++
//! implementation in Bitcoin ABC.

#![deny(unsafe_code)]

// Re-export ecash-secp256k1 types we need
pub use ecash_secp256k1::{PublicKey, SecretKey};
use wasm_bindgen::prelude::*;

// Internal modules
pub mod compactsize;
pub mod delegation;
pub mod delegationbuilder;
pub mod hash;
pub mod key;
pub mod outpoint;
pub mod proof;
pub mod proofbuilder;
pub mod pubkey;
pub mod schnorrsignature;
pub mod script;
pub mod stake;

/// Initialize the library for WebAssembly usage.
/// This should be called once when the module is loaded.
#[wasm_bindgen(start)]
pub fn init() {
    // WASM initialization
    // Currently no initialization is needed but the function is there as a
    // placeholder for future use.
}
