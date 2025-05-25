// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for public key cryptography, mostly for verifying X509 certificates.

use ring::signature::{self, VerificationAlgorithm};
use thiserror::Error;
use wasm_bindgen::prelude::*;

use crate::public_key_crypto::PkcError::*;

/// Errors indicating something went wrong with public key cryptography.
#[derive(Error, Debug, PartialEq, Eq)]
pub enum PkcError {
    /// Algorithm known, but considered insecure.
    /// SHA1 is not considered insecure, despite existing collisions:
    /// security.googleblog.com/2017/02/announcing-first-sha1-collision.html
    #[error("Insecure algorithm: {0}")]
    Insecure(&'static str),

    /// Algorithm known, but not supported by our implementation
    #[error("Algorithm not supported: {0}")]
    NotSupported(&'static str),

    /// Algorithm requires "params" to be set
    #[error("Missing params for EC")]
    MissingParams,

    /// Algorithm unknown
    #[error("Unknown algorithm")]
    UnknownAlgorithm,

    /// Invalid signature or public key
    #[error("Invalid signature or public key")]
    InvalidSignatureOrPublicKey,
}

fn get_algorithm(
    oid: &str,
    params: Option<&str>,
) -> Result<&'static dyn VerificationAlgorithm, PkcError> {
    enum Ec {
        /// `openssl ecparam -genkey -out key.pem -name prime256v1`
        P256,
        /// `openssl ecparam -genkey -out key.pem -name secp384r1`
        P384,
    }

    let ec = match params {
        Some("1.3.132.0.33") => return Err(NotSupported("ansip224r1")),
        Some("1.2.840.10045.3.1.7") => Some(Ec::P256),
        Some("1.3.132.0.34") => Some(Ec::P384),
        Some("1.3.132.0.35") => return Err(NotSupported("ansip521r1")),
        Some(_) => return Err(UnknownAlgorithm),
        _ => None,
    };

    match oid {
        "1.2.840.10040.4.1" => Err(Insecure("dsa")),
        "1.2.840.10040.4.2" => Err(Insecure("dsaMatch")),
        "1.2.840.10040.4.3" => Err(Insecure("dsaWithSha1")),
        "1.2.840.113549.1.1.1" => Err(NotSupported("rsaEncryption")),
        "1.2.840.113549.1.1.2" => Err(Insecure("md2WithRSAEncryption")),
        "1.2.840.113549.1.1.3" => Err(Insecure("md4WithRSAEncryption")),
        "1.2.840.113549.1.1.4" => Err(Insecure("md5WithRSAEncryption")),
        "1.2.840.113549.1.1.5" => {
            Ok(&signature::RSA_PKCS1_2048_8192_SHA1_FOR_LEGACY_USE_ONLY)
        }
        "1.2.840.113549.1.1.11" => Ok(&signature::RSA_PKCS1_2048_8192_SHA256),
        "1.2.840.113549.1.1.12" => Ok(&signature::RSA_PKCS1_2048_8192_SHA384),
        "1.2.840.113549.1.1.13" => Ok(&signature::RSA_PKCS1_2048_8192_SHA512),
        "1.2.840.113549.1.1.14" => Err(NotSupported("sha224WithRSAEncryption")),
        "2.16.840.1.101.3.4.2.8" => Err(NotSupported("sha3-256")),
        "2.16.840.1.101.3.4.2.9" => Err(NotSupported("sha3-384")),
        "2.16.840.1.101.3.4.2.10" => Err(NotSupported("sha3-512")),
        "1.2.840.10045.2.1" => Err(NotSupported("ecPublicKey")),
        "1.2.840.10045.4.1" => Err(Insecure("ecdsaWithSHA1")),
        "1.2.840.10045.4.3.1" => Err(NotSupported("ecdsaWithSHA224")),
        "1.2.840.10045.4.3.2" => match ec {
            Some(Ec::P256) => Ok(&signature::ECDSA_P256_SHA256_ASN1),
            Some(Ec::P384) => Ok(&signature::ECDSA_P384_SHA256_ASN1),
            None => Err(MissingParams),
        },
        "1.2.840.10045.4.3.3" => match ec {
            Some(Ec::P256) => Ok(&signature::ECDSA_P256_SHA384_ASN1),
            Some(Ec::P384) => Ok(&signature::ECDSA_P384_SHA384_ASN1),
            None => Err(MissingParams),
        },
        "1.2.840.10045.4.3.4" => Err(NotSupported("ecdsaWithSHA512")),
        _ => Err(UnknownAlgorithm),
    }
}

/// Throw an exception if the given algo is not supported, otherwise do nothing.
#[wasm_bindgen(js_name = publicKeyCryptoAlgoSupported)]
pub fn public_key_crypto_algo_supported(
    algo_oid: String,
    params: Option<String>,
) -> Result<(), String> {
    get_algorithm(&algo_oid, params.as_deref())
        .map_err(|err| err.to_string())?;
    Ok(())
}

/// Verify a signature for the given cryptographic algorithm.
/// Intended to be used in X509 certificate verification.
/// Throw an exception if the algorithm is not supported.
#[wasm_bindgen(js_name = publicKeyCryptoVerify)]
pub fn public_key_crypto_verify(
    algo_oid: String,
    params: Option<String>,
    sig: &[u8],
    msg: &[u8],
    pk: &[u8],
) -> Result<(), String> {
    let algo = get_algorithm(&algo_oid, params.as_deref())
        .map_err(|err| err.to_string())?;
    let pk = ring::signature::UnparsedPublicKey::new(algo, pk);
    pk.verify(msg, sig)
        .map_err(|_| InvalidSignatureOrPublicKey.to_string())
}
