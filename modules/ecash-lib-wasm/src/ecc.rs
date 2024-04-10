// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`Ecc`] for signing secp256k1 signatures.

use secp256k1_abc::{
    constants::SECRET_KEY_SIZE, All, Message, PublicKey, Secp256k1, SecretKey,
};
use thiserror::Error;
use wasm_bindgen::prelude::*;

use crate::ecc::EccError::*;

/// ECC signatures with libsecp256k1.
#[derive(Debug)]
#[wasm_bindgen]
pub struct Ecc {
    curve: Secp256k1<All>,
}

/// Errors indicating something went wrong with [`Ecc`].
#[derive(Error, Debug, PartialEq, Eq)]
pub enum EccError {
    /// Invalid secret key size
    #[error("Invalid secret key size, expected 32 bytes but got {0}")]
    InvalidSeckeySize(usize),

    /// Invalid secret key for signing
    #[error("Secret key not valid for secp256k1")]
    InvalidSeckey,

    /// Invalid message size
    #[error("Invalid message size, expected 32 bytes but got {0}")]
    InvalidMessageSize(usize),
}

impl From<EccError> for String {
    fn from(ecc: EccError) -> Self {
        ecc.to_string()
    }
}

fn parse_secret_key(seckey: &[u8]) -> Result<SecretKey, String> {
    Ok(SecretKey::from_slice(seckey).map_err(|_| {
        if seckey.len() != SECRET_KEY_SIZE {
            return InvalidSeckeySize(seckey.len());
        }
        InvalidSeckey
    })?)
}

fn parse_msg(msg: &[u8]) -> Result<Message, String> {
    Ok(Message::from_slice(msg).map_err(|_| InvalidMessageSize(msg.len()))?)
}

#[wasm_bindgen]
impl Ecc {
    /// Create a new Ecc instance.
    #[allow(clippy::new_without_default)]
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Ecc {
            curve: Secp256k1::default(),
        }
    }

    /// Derive a public key from secret key.
    #[wasm_bindgen(js_name = derivePubkey)]
    pub fn derive_pubkey(&self, seckey: &[u8]) -> Result<Vec<u8>, String> {
        let seckey = parse_secret_key(seckey)?;
        let pubkey = PublicKey::from_secret_key(&self.curve, &seckey);
        Ok(pubkey.serialize().to_vec())
    }

    /// Sign an ECDSA signature.
    #[wasm_bindgen(js_name = ecdsaSign)]
    pub fn ecdsa_sign(
        &self,
        seckey: &[u8],
        msg: &[u8],
    ) -> Result<Vec<u8>, String> {
        let seckey = parse_secret_key(seckey)?;
        let msg = parse_msg(msg)?;
        let sig = self.curve.sign(&msg, &seckey);
        Ok(sig.serialize_der().to_vec())
    }

    /// Sign a Schnorr signature.
    #[wasm_bindgen(js_name = schnorrSign)]
    pub fn schnorr_sign(
        &self,
        seckey: &[u8],
        msg: &[u8],
    ) -> Result<Vec<u8>, String> {
        let seckey = parse_secret_key(seckey)?;
        let msg = parse_msg(msg)?;
        let sig = self.curve.schnorrabc_sign_no_aux_rand(&msg, &seckey);
        Ok(sig.as_ref().to_vec())
    }
}
