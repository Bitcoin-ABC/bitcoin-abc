// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Schnorr signature types for avalanche proofs and stakes.

use wasm_bindgen::prelude::*;

/// A Schnorr signature (64 bytes).
#[derive(Debug, Clone, PartialEq, Eq)]
#[wasm_bindgen]
pub struct SchnorrSignature {
    data: [u8; 64],
}

#[wasm_bindgen]
impl SchnorrSignature {
    /// Create a new signature from bytes.
    #[wasm_bindgen(constructor)]
    pub fn new(data: &[u8]) -> Result<SchnorrSignature, String> {
        if data.len() != 64 {
            return Err(format!(
                "Invalid signature length: expected 64, got {}",
                data.len()
            ));
        }
        let mut sig_data = [0u8; 64];
        sig_data.copy_from_slice(data);
        Ok(SchnorrSignature { data: sig_data })
    }

    /// Create from hex string.
    #[wasm_bindgen(js_name = fromHex)]
    pub fn from_hex(hex: &str) -> Result<SchnorrSignature, String> {
        let hex = hex.trim_start_matches("0x");
        if hex.len() != 128 {
            return Err(format!(
                "Invalid hex length: expected 128, got {}",
                hex.len()
            ));
        }

        let mut data = [0u8; 64];
        for (i, chunk) in hex.as_bytes().chunks(2).enumerate() {
            let hex_str = std::str::from_utf8(chunk)
                .map_err(|_| "Invalid hex character")?;
            data[i] = u8::from_str_radix(hex_str, 16)
                .map_err(|_| "Invalid hex character")?;
        }

        Ok(SchnorrSignature { data })
    }

    /// Convert to hex string.
    #[wasm_bindgen(js_name = toHex)]
    pub fn to_hex(&self) -> String {
        hex::encode(self.data)
    }

    /// Get the raw bytes.
    #[wasm_bindgen(js_name = toBytes)]
    pub fn to_bytes(&self) -> Vec<u8> {
        self.data.to_vec()
    }
}

impl SchnorrSignature {
    /// Create from array.
    pub fn from_array(data: [u8; 64]) -> Self {
        Self { data }
    }

    /// Get as array.
    pub fn as_array(&self) -> &[u8; 64] {
        &self.data
    }
}

impl From<[u8; 64]> for SchnorrSignature {
    fn from(data: [u8; 64]) -> Self {
        Self { data }
    }
}

impl AsRef<[u8]> for SchnorrSignature {
    fn as_ref(&self) -> &[u8] {
        &self.data
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_schnorr_signature() {
        // Test with a 64-byte signature
        let sig_data = [0x12u8; 64];
        let sig = SchnorrSignature::new(&sig_data).unwrap();
        assert_eq!(sig.as_array(), &sig_data);
        assert_eq!(sig.to_bytes(), sig_data.to_vec());

        // Test hex conversion
        let hex_str = "12".repeat(64); // 64 * 2 = 128 characters for 64 bytes
        let sig_from_hex = SchnorrSignature::from_hex(&hex_str).unwrap();
        assert_eq!(sig_from_hex.as_array(), &sig_data);
        assert_eq!(sig_from_hex.to_hex(), hex_str);

        // Test from_array
        let sig_from_array = SchnorrSignature::from_array(sig_data);
        assert_eq!(sig_from_array.as_array(), &sig_data);

        // Test From trait
        let sig_from_trait = SchnorrSignature::from(sig_data);
        assert_eq!(sig_from_trait.as_array(), &sig_data);
    }

    #[test]
    fn test_schnorr_signature_errors() {
        // Test invalid length
        let short_data = [0x12u8; 32];
        let result = SchnorrSignature::new(&short_data);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Invalid signature length"));

        // Test invalid hex length (too short)
        let short_hex = "12".repeat(32);
        let result = SchnorrSignature::from_hex(&short_hex);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Invalid hex length"));
    }
}
