// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Key management utilities for avalanche-lib-wasm

use ecash_secp256k1::{PublicKey, SecretKey};
use wasm_bindgen::prelude::*;

/// Helper function to parse secret key from bytes
pub fn parse_secret_key(seckey: &[u8]) -> Result<SecretKey, String> {
    let key_array: [u8; 32] = seckey.try_into().map_err(|_| {
        format!(
            "Invalid secret key size: expected 32 bytes, got {}",
            seckey.len()
        )
    })?;
    SecretKey::from_byte_array(&key_array)
        .map_err(|_| "Invalid secret key".to_string())
}

/// Derive compressed public key from private key using ecash-secp256k1.
#[wasm_bindgen(js_name = derivePublicKey)]
pub fn derive_public_key(private_key: &[u8]) -> Result<Vec<u8>, String> {
    let secret_key = parse_secret_key(private_key)?;
    let secp = ecash_secp256k1::Secp256k1::new();
    let public_key = PublicKey::from_secret_key(&secp, &secret_key);
    Ok(public_key.serialize().to_vec())
}

/// Generate a random private key using ecash-secp256k1.
#[wasm_bindgen(js_name = generatePrivateKey)]
pub fn generate_private_key() -> Result<Vec<u8>, String> {
    use ecash_secp256k1::rand::thread_rng;
    let secp = ecash_secp256k1::Secp256k1::new();
    let (secret_key, _) = secp.generate_keypair(&mut thread_rng());
    Ok(secret_key.secret_bytes().to_vec())
}

/// Validate that a private key is valid for secp256k1.
#[wasm_bindgen(js_name = validatePrivateKey)]
pub fn validate_private_key(private_key: &[u8]) -> bool {
    parse_secret_key(private_key).is_ok()
}

/// Validate that a public key is valid secp256k1 public key (compressed or
/// uncompressed).
#[wasm_bindgen(js_name = validatePublicKey)]
pub fn validate_public_key(public_key: &[u8]) -> bool {
    match public_key.len() {
        33 => {
            // Compressed format
            let key_array: [u8; 33] = match public_key.try_into() {
                Ok(arr) => arr,
                Err(_) => return false,
            };
            PublicKey::from_byte_array_compressed(&key_array).is_ok()
        }
        65 => {
            // Uncompressed format
            let key_array: [u8; 65] = match public_key.try_into() {
                Ok(arr) => arr,
                Err(_) => return false,
            };
            PublicKey::from_byte_array_uncompressed(&key_array).is_ok()
        }
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_secret_key_valid() {
        let valid_key = [1u8; 32];
        let result = parse_secret_key(&valid_key);
        assert!(result.is_ok());
    }

    #[test]
    fn test_parse_secret_key_invalid_size() {
        let invalid_key = [1u8; 31]; // Wrong size
        let result = parse_secret_key(&invalid_key);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Invalid secret key size"));
    }

    #[test]
    fn test_derive_public_key() {
        // Test with a known private key
        let private_key = hex::decode(
            "12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f747",
        )
        .unwrap();
        let result = derive_public_key(&private_key);
        assert!(result.is_ok());

        let public_key = result.unwrap();
        assert_eq!(public_key.len(), 33); // Should be compressed format
        assert_eq!(public_key, hex::decode(
            "030b4c866585dd868a9d62348a9cd008d6a312937048fff31670e7e920cfc7a744"
        ).unwrap());
    }

    #[test]
    fn test_derive_public_key_invalid() {
        let invalid_key = [1u8; 31]; // Wrong size
        let result = derive_public_key(&invalid_key);
        assert!(result.is_err());
    }

    #[test]
    fn test_generate_private_key() {
        let result = generate_private_key();
        assert!(result.is_ok());

        let private_key = result.unwrap();
        assert_eq!(private_key.len(), 32);
    }

    #[test]
    fn test_validate_private_key_valid() {
        let valid_key = [1u8; 32];
        assert!(validate_private_key(&valid_key));
    }

    #[test]
    fn test_validate_private_key_invalid_size() {
        let invalid_key = [1u8; 31];
        assert!(!validate_private_key(&invalid_key));
    }

    #[test]
    fn test_validate_public_key_compressed() {
        // Valid compressed public key (33 bytes)
        let valid_compressed = hex::decode(
            "030b4c866585dd868a9d62348a9cd008d6a312937048fff31670e7e920cfc7a744"
        ).unwrap();
        assert!(validate_public_key(&valid_compressed));

        // Invalid compressed public key (wrong length)
        let invalid_compressed = hex::decode(
            "030b4c866585dd868a9d62348a9cd008d6a312937048fff31670e7e920cfc7a7",
        )
        .unwrap();
        assert!(!validate_public_key(&invalid_compressed));

        // Invalid compressed public key (wrong prefix)
        let invalid_compressed = hex::decode(
            "040b4c866585dd868a9d62348a9cd008d6a312937048fff31670e7e920cfc7a7",
        )
        .unwrap();
        assert!(!validate_public_key(&invalid_compressed));
    }

    #[test]
    fn test_validate_public_key_uncompressed() {
        // Valid uncompressed public key (65 bytes)
        let valid_uncompressed = hex::decode(
            "04d0de0aaeaefad02b8bdc8a01a1b8b11c696bd3d66a2c5f10780d95b7df42645c\
            d85228a6fb29940e858e7e55842ae2bd115d1ed7cc0e82d934e929c97648cb0a"
        ).unwrap();
        assert!(validate_public_key(&valid_uncompressed));

        // Invalid uncompressed public key (wrong length)
        let invalid_uncompressed = hex::decode(
            "04d0de0aaeaefad02b8bdc8a01a1b8b11c696bd3d66a2c5f10780d95b7df42645c\
            d85228a6fb29940e858e7e55842ae2bd115d1ed7cc0e82d934e929c97648cb00"
        ).unwrap();
        assert!(!validate_public_key(&invalid_uncompressed));

        // Invalid uncompressed public key (wrong prefix)
        let invalid_uncompressed = hex::decode(
            "03d0de0aaeaefad02b8bdc8a01a1b8b11c696bd3d66a2c5f10780d95b7df42645c\
            d85228a6fb29940e858e7e55842ae2bd115d1ed7cc0e82d934e929c97648cb00"
        ).unwrap();
        assert!(!validate_public_key(&invalid_uncompressed));
    }

    #[test]
    fn test_validate_public_key_invalid_lengths() {
        // Test various invalid lengths
        assert!(!validate_public_key(&[]));
        assert!(!validate_public_key(&[1u8; 32]));
        assert!(!validate_public_key(&[1u8; 34]));
        assert!(!validate_public_key(&[1u8; 64]));
        assert!(!validate_public_key(&[1u8; 66]));
    }

    #[test]
    fn test_validate_public_key_invalid_format() {
        // Test with invalid public key data (wrong format)
        let invalid_compressed = [0u8; 33]; // All zeros
        assert!(!validate_public_key(&invalid_compressed));

        let invalid_uncompressed = [0u8; 65]; // All zeros
        assert!(!validate_public_key(&invalid_uncompressed));
    }
}
