// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Public key wrapper that preserves the original format
//! (compressed/uncompressed).

use ecash_secp256k1::PublicKey;
use wasm_bindgen::prelude::*;

/// Format of a public key
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[wasm_bindgen]
pub enum PublicKeyFormat {
    /// Compressed format (33 bytes)
    Compressed,
    /// Uncompressed format (65 bytes)
    Uncompressed,
}

/// Wrapper around PublicKey that preserves the original format
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FormattedPublicKey {
    pubkey: PublicKey,
    format: PublicKeyFormat,
}

impl FormattedPublicKey {
    /// Create a new FormattedPublicKey from bytes, detecting the format
    pub fn from_slice(data: &[u8]) -> Result<Self, String> {
        let format = match data.len() {
            33 => PublicKeyFormat::Compressed,
            65 => PublicKeyFormat::Uncompressed,
            len => {
                return Err(format!(
                    "Invalid public key length: expected 33 or 65 bytes, got \
                     {}",
                    len
                ))
            }
        };

        let pubkey = PublicKey::from_slice(data)
            .map_err(|e| format!("Invalid public key: {}", e))?;

        Ok(FormattedPublicKey { pubkey, format })
    }

    /// Create a new FormattedPublicKey from a PublicKey with specified format
    pub fn new(pubkey: PublicKey, format: PublicKeyFormat) -> Self {
        FormattedPublicKey { pubkey, format }
    }

    /// Get the underlying PublicKey
    pub fn public_key(&self) -> &PublicKey {
        &self.pubkey
    }

    /// Get the format
    pub fn format(&self) -> PublicKeyFormat {
        self.format
    }

    /// Serialize the public key in its original format
    pub fn serialize(&self) -> Vec<u8> {
        match self.format {
            PublicKeyFormat::Compressed => self.pubkey.serialize().to_vec(),
            PublicKeyFormat::Uncompressed => {
                self.pubkey.serialize_uncompressed().to_vec()
            }
        }
    }

    /// Serialize the public key in compressed format (33 bytes)
    pub fn serialize_compressed(&self) -> Vec<u8> {
        self.pubkey.serialize().to_vec()
    }

    /// Serialize the public key in uncompressed format (65 bytes)
    pub fn serialize_uncompressed(&self) -> Vec<u8> {
        self.pubkey.serialize_uncompressed().to_vec()
    }

    /// Get the serialized length
    pub fn serialized_len(&self) -> usize {
        match self.format {
            PublicKeyFormat::Compressed => 33,
            PublicKeyFormat::Uncompressed => 65,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // This is the same public key, in both compressed and uncompressed formats
    const COMPRESSED_PUBKEY_HEX: &str =
        "030b4c866585dd868a9d62348a9cd008d6a312937048fff31670e7e920cfc7a744";
    const UNCOMPRESSED_PUBKEY_HEX: &str =
        "040b4c866585dd868a9d62348a9cd008d6a312937048fff31670e7e920cfc7a7447b5f\
        0bba9e01e6fe4735c8383e6e7a3347a0fd72381b8f797a19f694054e5a69";

    #[test]
    fn test_compressed_format_preservation() {
        let compressed_bytes = hex::decode(COMPRESSED_PUBKEY_HEX).unwrap();

        // Create FormattedPublicKey from compressed bytes
        let formatted =
            FormattedPublicKey::from_slice(&compressed_bytes).unwrap();
        assert_eq!(formatted.format(), PublicKeyFormat::Compressed);
        assert_eq!(formatted.serialized_len(), 33);

        // Verify serialization preserves format
        let serialized = formatted.serialize();
        assert_eq!(serialized, compressed_bytes);
        assert_eq!(serialized.len(), 33);
    }

    #[test]
    fn test_uncompressed_format_preservation() {
        let uncompressed_bytes = hex::decode(UNCOMPRESSED_PUBKEY_HEX).unwrap();

        // Create FormattedPublicKey from uncompressed bytes
        let formatted =
            FormattedPublicKey::from_slice(&uncompressed_bytes).unwrap();
        assert_eq!(formatted.format(), PublicKeyFormat::Uncompressed);
        assert_eq!(formatted.serialized_len(), 65);

        // Verify serialization preserves format
        let serialized = formatted.serialize();
        assert_eq!(serialized, uncompressed_bytes);
        assert_eq!(serialized.len(), 65);
    }

    #[test]
    fn test_invalid_length_error() {
        let invalid_short = vec![0x02; 32]; // 32 bytes (too short)
        let invalid_long = vec![0x04; 66]; // 66 bytes (too long)

        // Test too short
        let result_short = FormattedPublicKey::from_slice(&invalid_short);
        assert!(result_short.is_err());
        assert!(result_short
            .unwrap_err()
            .contains("Invalid public key length"));

        // Test too long
        let result_long = FormattedPublicKey::from_slice(&invalid_long);
        assert!(result_long.is_err());
        assert!(result_long
            .unwrap_err()
            .contains("Invalid public key length"));
    }

    #[test]
    fn test_serialize_compressed() {
        let compressed_bytes = hex::decode(COMPRESSED_PUBKEY_HEX).unwrap();
        let uncompressed_bytes = hex::decode(UNCOMPRESSED_PUBKEY_HEX).unwrap();

        // Test with compressed key
        let compressed_formatted =
            FormattedPublicKey::from_slice(&compressed_bytes).unwrap();
        let serialized = compressed_formatted.serialize_compressed();
        assert_eq!(serialized, compressed_bytes);
        assert_eq!(serialized.len(), 33);

        // Test with uncompressed key - should still serialize as compressed
        let uncompressed_formatted =
            FormattedPublicKey::from_slice(&uncompressed_bytes).unwrap();
        let serialized = uncompressed_formatted.serialize_compressed();
        assert_eq!(serialized.len(), 33);
        assert_eq!(serialized, compressed_bytes);
    }

    #[test]
    fn test_serialize_uncompressed() {
        let compressed_bytes = hex::decode(COMPRESSED_PUBKEY_HEX).unwrap();
        let uncompressed_bytes = hex::decode(UNCOMPRESSED_PUBKEY_HEX).unwrap();

        // Test with uncompressed key
        let uncompressed_formatted =
            FormattedPublicKey::from_slice(&uncompressed_bytes).unwrap();
        let serialized = uncompressed_formatted.serialize_uncompressed();
        assert_eq!(serialized, uncompressed_bytes);
        assert_eq!(serialized.len(), 65);

        // Test with compressed key - should still serialize as uncompressed
        let compressed_formatted =
            FormattedPublicKey::from_slice(&compressed_bytes).unwrap();
        let serialized = compressed_formatted.serialize_uncompressed();
        assert_eq!(serialized.len(), 65);
        assert_eq!(serialized, uncompressed_bytes);
    }
}
