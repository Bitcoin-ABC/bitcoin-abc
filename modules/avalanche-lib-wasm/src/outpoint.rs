// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Transaction outpoint types for avalanche proofs and stakes.

use wasm_bindgen::prelude::*;

use crate::hash::Hash256;

/// A transaction ID (Hash256 wrapper).
pub type TxId = Hash256;

/// A transaction outpoint (txid + output index).
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
#[wasm_bindgen]
pub struct OutPoint {
    txid: TxId,
    vout: u32,
}

#[wasm_bindgen]
impl OutPoint {
    /// Create a new outpoint from bytes.
    #[wasm_bindgen(constructor)]
    pub fn new(txid_bytes: &[u8], vout: u32) -> Result<OutPoint, String> {
        let txid = TxId::new(txid_bytes)?;
        Ok(Self { txid, vout })
    }

    /// Get the transaction ID.
    #[wasm_bindgen(getter)]
    pub fn txid(&self) -> TxId {
        self.txid.clone()
    }

    /// Get the output index.
    #[wasm_bindgen(getter)]
    pub fn vout(&self) -> u32 {
        self.vout
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_outpoint() {
        let txid = TxId::from_array([1u8; 32]);
        let outpoint = OutPoint::new(&txid.to_bytes(), 0).unwrap();
        assert_eq!(outpoint.txid(), txid);
        assert_eq!(outpoint.vout(), 0);
    }
}
