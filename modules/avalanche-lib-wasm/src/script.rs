// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Script types for avalanche proofs and stakes.

use wasm_bindgen::prelude::*;

/// Script data.
#[derive(Debug, Clone, PartialEq, Eq)]
#[wasm_bindgen]
pub struct Script {
    data: Vec<u8>,
}

#[wasm_bindgen]
impl Script {
    /// Create a new script from bytes.
    #[wasm_bindgen(constructor)]
    pub fn new(data: &[u8]) -> Self {
        Self {
            data: data.to_vec(),
        }
    }

    /// Create a script from hex string.
    #[wasm_bindgen(js_name = fromHex)]
    pub fn from_hex(hex: &str) -> Result<Script, String> {
        let hex = hex.trim_start_matches("0x");
        let data = hex::decode(hex).map_err(|_| "Invalid hex string")?;
        Ok(Script { data })
    }

    /// Convert to hex string.
    #[wasm_bindgen(js_name = toHex)]
    pub fn to_hex(&self) -> String {
        hex::encode(&self.data)
    }

    /// Get the raw bytes.
    #[wasm_bindgen(js_name = toBytes)]
    pub fn to_bytes(&self) -> Vec<u8> {
        self.data.clone()
    }

    /// Get the script length.
    #[wasm_bindgen(getter)]
    pub fn length(&self) -> usize {
        self.data.len()
    }
}

impl Script {
    /// Get as slice.
    pub fn as_slice(&self) -> &[u8] {
        &self.data
    }
}

impl From<Vec<u8>> for Script {
    fn from(data: Vec<u8>) -> Self {
        Self { data }
    }
}

impl AsRef<[u8]> for Script {
    fn as_ref(&self) -> &[u8] {
        &self.data
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_script() {
        let data = vec![0x76, 0xa9, 0x14]; // Start of P2PKH script
        let script = Script::new(&data);
        assert_eq!(script.as_slice(), &data);
        assert_eq!(script.length(), 3);
    }
}
