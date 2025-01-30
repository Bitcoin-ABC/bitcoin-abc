// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`Ecc`] for signing secp256k1 signatures.

use ecash_secp256k1::{All, Message, PublicKey, Scalar, Secp256k1, SecretKey};
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

    /// Invalid public key size
    #[error("Invalid public key size, expected 33 bytes but got {0}")]
    InvalidPubkeySize(usize),

    /// Invalid pubkey key for signing
    #[error("Pubkey key not valid for secp256k1")]
    InvalidPubkey,

    /// Invalid scalar size
    #[error("Invalid scalar size, expected 32 bytes but got {0}")]
    InvalidScalarSize(usize),

    /// Invalid scalar in range
    #[error("Scalar not valid for secp256k1")]
    InvalidScalar,

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
    Ok(SecretKey::from_byte_array(
        &seckey
            .try_into()
            .map_err(|_| InvalidSeckeySize(seckey.len()))?,
    )
    .map_err(|_| InvalidSeckey)?)
}

fn parse_public_key(pubkey: &[u8]) -> Result<PublicKey, String> {
    Ok(PublicKey::from_byte_array_compressed(
        pubkey
            .try_into()
            .map_err(|_| InvalidPubkeySize(pubkey.len()))?,
    )
    .map_err(|_| InvalidPubkey)?)
}

fn parse_scalar(scalar: &[u8]) -> Result<Scalar, String> {
    Ok(Scalar::from_be_bytes(
        scalar
            .try_into()
            .map_err(|_| InvalidScalarSize(scalar.len()))?,
    )
    .map_err(|_| InvalidScalar)?)
}

fn parse_msg(msg: &[u8]) -> Result<Message, String> {
    Ok(Message::from_digest(
        msg.try_into().map_err(|_| InvalidMessageSize(msg.len()))?,
    ))
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
        let sig = self.curve.sign_ecdsa(&msg, &seckey);
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
        let sig = self.curve.sign_schnorrabc_no_aux_rand(&msg, &seckey);
        Ok(sig.as_ref().to_vec())
    }

    /// Return whether the given secret key is valid, i.e. whether is of correct
    /// length (32 bytes) and is on the curve.
    #[wasm_bindgen(js_name = isValidSeckey)]
    pub fn is_valid_seckey(&self, seckey: &[u8]) -> bool {
        parse_secret_key(seckey).is_ok()
    }

    /// Add a scalar to a secret key.
    #[wasm_bindgen(js_name = seckeyAdd)]
    pub fn seckey_add(&self, a: &[u8], b: &[u8]) -> Result<Vec<u8>, String> {
        let a = parse_secret_key(a)?;
        let b = parse_scalar(b)?;
        Ok(a.add_tweak(&b)
            .map_err(|_| InvalidSeckey)?
            .secret_bytes()
            .to_vec())
    }

    /// Add a scalar to a public key (adding G*b).
    #[wasm_bindgen(js_name = pubkeyAdd)]
    pub fn pubkey_add(&self, a: &[u8], b: &[u8]) -> Result<Vec<u8>, String> {
        let a = parse_public_key(a)?;
        let b = parse_scalar(b)?;
        Ok(a.add_exp_tweak(&self.curve, &b)
            .map_err(|_| InvalidPubkey)?
            .serialize()
            .to_vec())
    }
}
