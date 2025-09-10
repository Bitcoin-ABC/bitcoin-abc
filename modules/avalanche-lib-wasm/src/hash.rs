// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Hash utilities for avalanche proofs and stakes.

use sha2::{Digest, Sha256};
use wasm_bindgen::prelude::*;

use crate::compactsize::write_compact_size;

/// A 256-bit hash value.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
#[wasm_bindgen]
pub struct Hash256 {
    data: [u8; 32],
}

#[wasm_bindgen]
impl Hash256 {
    /// Create a new Hash256 from bytes.
    #[wasm_bindgen(constructor)]
    pub fn new(data: &[u8]) -> Result<Hash256, String> {
        if data.len() != 32 {
            return Err(format!(
                "Invalid hash length: expected 32, got {}",
                data.len()
            ));
        }
        let mut hash_data = [0u8; 32];
        hash_data.copy_from_slice(data);
        Ok(Hash256 { data: hash_data })
    }

    /// Create a Hash256 from a hex string.
    #[wasm_bindgen(js_name = fromHex)]
    pub fn from_hex(hex: &str) -> Result<Hash256, String> {
        let hex = hex.trim_start_matches("0x");
        if hex.len() != 64 {
            return Err(format!(
                "Invalid hex length: expected 64, got {}",
                hex.len()
            ));
        }

        let mut data = [0u8; 32];
        for (i, chunk) in hex.as_bytes().chunks(2).enumerate() {
            let hex_str = std::str::from_utf8(chunk)
                .map_err(|_| "Invalid hex character")?;
            data[i] = u8::from_str_radix(hex_str, 16)
                .map_err(|_| "Invalid hex character")?;
        }

        Ok(Hash256 { data })
    }

    /// Convert to hex string.
    #[wasm_bindgen(js_name = toHex)]
    pub fn to_hex(&self) -> String {
        hex::encode(&self.data)
    }

    /// Convert to hex string with bytes in reverse order (little-endian).
    #[wasm_bindgen(js_name = toHexLe)]
    pub fn to_hex_le(&self) -> String {
        let mut reversed_data = self.data;
        reversed_data.reverse();
        hex::encode(&reversed_data)
    }

    /// Get the raw bytes.
    #[wasm_bindgen(js_name = toBytes)]
    pub fn to_bytes(&self) -> Vec<u8> {
        self.data.to_vec()
    }

    /// Check if this hash is zero.
    #[wasm_bindgen(js_name = isZero)]
    pub fn is_zero(&self) -> bool {
        self.data.iter().all(|&b| b == 0)
    }
}

impl Hash256 {
    /// Create from array.
    pub fn from_array(data: [u8; 32]) -> Self {
        Self { data }
    }

    /// Get as array.
    pub fn as_array(&self) -> &[u8; 32] {
        &self.data
    }
}

impl From<[u8; 32]> for Hash256 {
    fn from(data: [u8; 32]) -> Self {
        Self { data }
    }
}

impl AsRef<[u8]> for Hash256 {
    fn as_ref(&self) -> &[u8] {
        &self.data
    }
}

impl PartialOrd for Hash256 {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for Hash256 {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        for i in 0..32 {
            match self.data[i].cmp(&other.data[i]) {
                std::cmp::Ordering::Equal => continue,
                ordering => return ordering,
            }
        }
        std::cmp::Ordering::Equal
    }
}

/// Double SHA256 hash, as used in Bitcoin and eCash.
pub fn sha256d(data: &[u8]) -> [u8; 32] {
    let first_hash = Sha256::digest(data);
    let second_hash = Sha256::digest(&first_hash);
    second_hash.into()
}

/// Single SHA256 hash.
pub fn sha256(data: &[u8]) -> [u8; 32] {
    Sha256::digest(data).into()
}

/// Hash writer for building hashes incrementally.
#[derive(Default)]
pub struct HashWriter {
    hasher: Sha256,
}

impl HashWriter {
    /// Create a new hash writer.
    pub fn new() -> Self {
        Self::default()
    }

    /// Write data to the hash.
    pub fn write(&mut self, data: &[u8]) {
        self.hasher.update(data);
    }

    /// Write a u8 value.
    pub fn write_u8(&mut self, value: u8) {
        self.write(&[value]);
    }

    /// Write a u32 value in little-endian format.
    pub fn write_u32_le(&mut self, value: u32) {
        self.write(&value.to_le_bytes());
    }

    /// Write a u64 value in little-endian format.
    pub fn write_u64_le(&mut self, value: u64) {
        self.write(&value.to_le_bytes());
    }

    /// Write an i64 value in little-endian format.
    pub fn write_i64_le(&mut self, value: i64) {
        self.write(&value.to_le_bytes());
    }

    /// Write a compact size value (Bitcoin's variable-length integer encoding).
    pub fn write_compact_size(&mut self, value: u64) {
        let bytes = write_compact_size(value);
        self.write(&bytes);
    }

    /// Write a byte slice with its length as a compact size prefix.
    pub fn write_bytes_with_size(&mut self, data: &[u8]) {
        self.write_compact_size(data.len() as u64);
        self.write(data);
    }

    /// Finalize the hash and return the result.
    pub fn finalize(self) -> [u8; 32] {
        self.hasher.finalize().into()
    }

    /// Finalize with double SHA256.
    pub fn finalize_double(self) -> [u8; 32] {
        let first_hash = self.hasher.finalize();
        let second_hash = Sha256::digest(&first_hash);
        second_hash.into()
    }
}

/// WebAssembly-exposed hash functions.
#[wasm_bindgen]
pub struct Hash;

#[wasm_bindgen]
impl Hash {
    /// Compute double SHA256 hash.
    #[wasm_bindgen(js_name = sha256d)]
    pub fn sha256d_js(data: &[u8]) -> Vec<u8> {
        sha256d(data).to_vec()
    }

    /// Compute single SHA256 hash.
    #[wasm_bindgen(js_name = sha256)]
    pub fn sha256_js(data: &[u8]) -> Vec<u8> {
        sha256(data).to_vec()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sha256d() {
        let data = b"hello world";
        let hash = sha256d(data);
        assert_eq!(hash.len(), 32);
        assert_eq!(
            hex::encode(hash),
            "bc62d4b80d9e36da29c16c5d4d9f11731f36052c72401a76c23c0fb5a9b74423"
        );
    }

    #[test]
    fn test_hash_writer() {
        let mut writer = HashWriter::new();
        writer.write(b"hello");
        writer.write(b" ");
        writer.write(b"world");
        let hash = writer.finalize();

        // Should match single SHA256 of "hello world"
        let expected = sha256(b"hello world");
        assert_eq!(hash, expected);
    }

    #[test]
    fn test_compact_size() {
        let mut writer = HashWriter::new();

        // Test small values
        writer.write_compact_size(0);
        writer.write_compact_size(252);
        writer.write_compact_size(253);
        writer.write_compact_size(65535);
        writer.write_compact_size(65536);

        // Just ensure it doesn't panic
        let _hash = writer.finalize();
    }

    #[test]
    fn test_hash256() {
        let data = [1u8; 32];
        let hash = Hash256::from_array(data);
        assert_eq!(hash.as_array(), &data);
        assert!(!hash.is_zero());

        let zero_hash = Hash256::from_array([0u8; 32]);
        assert!(zero_hash.is_zero());
    }

    #[test]
    fn test_hash256_to_hex_le() {
        // Test with a known pattern to verify byte reversal
        let data = [
            0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
            0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16,
            0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20,
        ];
        let hash = Hash256::from_array(data);

        // Regular hex (big-endian)
        let hex_be = hash.to_hex();
        assert_eq!(
            hex_be,
            "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20"
        );

        // Little-endian hex (bytes reversed)
        let hex_le = hash.to_hex_le();
        assert_eq!(
            hex_le,
            "201f1e1d1c1b1a191817161514131211100f0e0d0c0b0a090807060504030201"
        );

        // Verify that the LE version is indeed the reverse of the byte array
        let mut reversed_data = data;
        reversed_data.reverse();
        let expected_le = hex::encode(&reversed_data);
        assert_eq!(hex_le, expected_le);
    }
}
