// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Avalanche delegation types and functionality.
//!
//! This module provides the ability to create and manage avalanche delegations,
//! which allow transferring control of a proof from the master key to other
//! keys.

use ecash_secp256k1::{Message, PublicKey, Secp256k1};
use wasm_bindgen::prelude::*;

use crate::compactsize::{read_compact_size, write_compact_size};
use crate::hash;
use crate::hash::Hash256;
use crate::proof::{LimitedProofId, Proof};
use crate::pubkey::FormattedPublicKey;
use crate::schnorrsignature::SchnorrSignature;

/// Maximum number of delegation levels allowed (matches C++ implementation).
pub const MAX_DELEGATION_LEVELS: usize = 20;

/// A delegation ID uniquely identifies a delegation.
pub type DelegationId = Hash256;

/// A single level in a delegation chain.
#[derive(Debug, Clone, PartialEq, Eq)]
#[wasm_bindgen]
pub struct DelegationLevel {
    formatted_pubkey: FormattedPublicKey,
    signature: SchnorrSignature,
}

#[wasm_bindgen]
impl DelegationLevel {
    /// Create a new delegation level.
    #[wasm_bindgen(constructor)]
    pub fn new(
        pubkey: &[u8],
        signature: &[u8],
    ) -> Result<DelegationLevel, String> {
        let formatted_pubkey = FormattedPublicKey::from_slice(pubkey)?;
        let signature = SchnorrSignature::new(signature)?;

        Ok(DelegationLevel {
            formatted_pubkey,
            signature,
        })
    }

    /// Get the public key bytes in original format (compressed or
    /// uncompressed).
    #[wasm_bindgen(js_name = pubkeyBytes)]
    pub fn pubkey_bytes(&self) -> Vec<u8> {
        self.formatted_pubkey.serialize()
    }

    /// Get the signature.
    #[wasm_bindgen(getter)]
    pub fn signature(&self) -> SchnorrSignature {
        self.signature.clone()
    }
}

/// An avalanche delegation that transfers control from a proof's master key to
/// other keys.
#[derive(Debug, Clone, PartialEq, Eq)]
#[wasm_bindgen]
pub struct Delegation {
    limited_proof_id: LimitedProofId,
    formatted_proof_master: FormattedPublicKey,
    delegation_id: DelegationId,
    levels: Vec<DelegationLevel>,
}

#[wasm_bindgen]
impl Delegation {
    /// Create a new delegation.
    #[wasm_bindgen(constructor)]
    pub fn new(
        limited_proof_id: &LimitedProofId,
        proof_master: &[u8],
        levels: Vec<DelegationLevel>,
    ) -> Result<Delegation, String> {
        if levels.len() > MAX_DELEGATION_LEVELS {
            return Err(format!(
                "Too many delegation levels: max {}, got {}",
                MAX_DELEGATION_LEVELS,
                levels.len()
            ));
        }

        let formatted_proof_master =
            FormattedPublicKey::from_slice(proof_master)?;

        let levels = levels;
        let delegation_id = Self::compute_delegation_id(
            limited_proof_id,
            &formatted_proof_master,
            &levels,
        )?;

        Ok(Delegation {
            limited_proof_id: limited_proof_id.clone(),
            formatted_proof_master,
            delegation_id,
            levels,
        })
    }

    /// Get the delegation ID.
    #[wasm_bindgen(js_name = delegationId)]
    pub fn delegation_id(&self) -> DelegationId {
        self.delegation_id.clone()
    }

    /// Get the limited proof ID.
    #[wasm_bindgen(js_name = limitedProofId)]
    pub fn limited_proof_id(&self) -> LimitedProofId {
        self.limited_proof_id.clone()
    }

    /// Get the proof master public key bytes.
    #[wasm_bindgen(js_name = proofMasterBytes)]
    pub fn proof_master_bytes(&self) -> Vec<u8> {
        self.formatted_proof_master.serialize()
    }

    /// Get the delegation levels.
    #[wasm_bindgen(js_name = delegationLevels)]
    pub fn delegation_levels(&self) -> Vec<DelegationLevel> {
        self.levels.clone()
    }

    /// Get the number of delegation levels.
    #[wasm_bindgen(js_name = levelCount)]
    pub fn level_count(&self) -> usize {
        self.levels.len()
    }

    /// Get the delegated public key (the final key in the chain).
    #[wasm_bindgen(js_name = delegatedPubkeyBytes)]
    pub fn delegated_pubkey_bytes(&self) -> Vec<u8> {
        if let Some(last_level) = self.levels.last() {
            last_level.pubkey_bytes()
        } else {
            self.proof_master_bytes()
        }
    }

    /// Verify the delegation signatures and return error message if validation
    /// fails.
    #[wasm_bindgen]
    pub fn verify(&self) -> Option<String> {
        if self.levels.len() > MAX_DELEGATION_LEVELS {
            return Some(format!(
                "Delegation validation failed: Too many delegation levels \
                 (max: {})",
                MAX_DELEGATION_LEVELS
            ));
        }

        let initial_hash = Proof::compute_proof_id(
            &self.limited_proof_id,
            &self.proof_master_bytes(),
        )
        .to_bytes();
        let mut current_pubkey =
            self.formatted_proof_master.public_key().clone();

        // Use reduce_levels with a closure for verification
        let _final_hash = match Self::reduce_levels(
            &initial_hash,
            &self.levels,
            |level, new_hash| {
                // Verify the signature using secp256k1
                let secp = Secp256k1::verification_only();
                let hash_array: [u8; 32] = new_hash
                    .try_into()
                    .map_err(|_| "Invalid hash length".to_string())?;
                let message = Message::from_digest(hash_array);

                // Convert SchnorrSignature to secp256k1 signature
                let sig_bytes = level.signature().to_bytes();
                let signature =
                    ecash_secp256k1::schnorr::Signature::from_slice(&sig_bytes)
                        .map_err(|_| "Invalid signature".to_string())?;

                // Verify the signature
                if secp
                    .verify_schnorrabc(&signature, &message, &current_pubkey)
                    .is_err()
                {
                    return Ok(false); // Stop verification
                }

                // Move to the next level
                current_pubkey = level.formatted_pubkey.public_key().clone();
                Ok(true) // Continue to next level
            },
        ) {
            Ok(_) => None,
            Err(_) => Some(
                "Delegation validation failed: Invalid signature".to_string(),
            ),
        };

        None
    }

    /// Serialize the delegation to bytes.
    #[wasm_bindgen]
    pub fn serialize(&self) -> Vec<u8> {
        let mut result = Vec::new();

        // Limited proof ID (32 bytes)
        result.extend_from_slice(&self.limited_proof_id.to_bytes());

        // Proof master key (compact size + pubkey bytes)
        let proof_master_bytes = self.proof_master_bytes();
        result.extend_from_slice(&write_compact_size(
            proof_master_bytes.len() as u64
        ));
        result.extend_from_slice(&proof_master_bytes);

        // Number of levels (compact size)
        result.extend_from_slice(&write_compact_size(self.levels.len() as u64));

        // Each level: compact size + pubkey + signature
        for level in &self.levels {
            let level_pubkey_bytes = level.pubkey_bytes();
            result.extend_from_slice(&write_compact_size(
                level_pubkey_bytes.len() as u64,
            ));
            result.extend_from_slice(&level_pubkey_bytes);
            result.extend_from_slice(&level.signature().to_bytes());
        }

        result
    }

    /// Convert to hex string.
    #[wasm_bindgen(js_name = toHex)]
    pub fn to_hex(&self) -> String {
        hex::encode(self.serialize())
    }

    /// Create delegation from hex string.
    #[wasm_bindgen(js_name = fromHex)]
    pub fn from_hex(hex: &str) -> Result<Delegation, String> {
        let hex = hex.trim_start_matches("0x");
        let bytes =
            hex::decode(hex).map_err(|e| format!("Invalid hex: {}", e))?;

        Self::deserialize(&bytes)
    }

    /// Deserialize delegation from bytes.
    #[wasm_bindgen]
    pub fn deserialize(data: &[u8]) -> Result<Delegation, String> {
        if data.len() < 67 {
            // 32 (limited_proof_id) + 34 (1 + 33 for proof_master) + 1
            // (level_count) minimum
            return Err("Delegation data too short".to_string());
        }

        let mut offset = 0;

        // Limited proof ID (32 bytes)
        let limited_proof_id = LimitedProofId::new(&data[offset..offset + 32])?;
        offset += 32;

        // Proof master key (compact size + pubkey bytes)
        let (pubkey_len, pubkey_len_size) = read_compact_size(&data[offset..])?;
        offset += pubkey_len_size;

        if pubkey_len != 33 && pubkey_len != 65 {
            return Err(format!(
                "Invalid proof master key length: expected 33 or 65, got {}",
                pubkey_len
            ));
        }

        let formatted_proof_master = FormattedPublicKey::from_slice(
            &data[offset..offset + pubkey_len as usize],
        )?;
        offset += pubkey_len as usize;

        // Number of levels (compact size)
        let (level_count, level_count_size) =
            read_compact_size(&data[offset..])?;
        offset += level_count_size;

        if level_count > MAX_DELEGATION_LEVELS as u64 {
            return Err(format!(
                "Too many delegation levels: max {}, got {}",
                MAX_DELEGATION_LEVELS, level_count
            ));
        }

        // Deserialize each level (compact size + pubkey + signature)
        let mut levels = Vec::with_capacity(level_count as usize);
        for _ in 0..level_count {
            // Check if we have enough data for at least compact size + 33 bytes
            // + 64 bytes
            if data.len() < offset + 1 + 33 + 64 {
                return Err("Invalid delegation format: insufficient data \
                            for level"
                    .to_string());
            }

            // Level pubkey (compact size + pubkey bytes)
            let (level_pubkey_len, level_pubkey_len_size) =
                read_compact_size(&data[offset..])?;
            offset += level_pubkey_len_size;

            if level_pubkey_len != 33 && level_pubkey_len != 65 {
                return Err(format!(
                    "Invalid level pubkey length: expected 33 or 65, got {}",
                    level_pubkey_len
                ));
            }

            // Check if we have enough data for pubkey + signature
            if data.len() < offset + level_pubkey_len as usize + 64 {
                return Err("Invalid delegation format: insufficient data \
                            for level pubkey and signature"
                    .to_string());
            }

            let pubkey_bytes =
                &data[offset..offset + level_pubkey_len as usize];
            offset += level_pubkey_len as usize;

            // Signature (64 bytes)
            let signature_bytes = &data[offset..offset + 64];
            offset += 64;

            levels.push(DelegationLevel::new(pubkey_bytes, signature_bytes)?);
        }

        let delegation_id = Self::compute_delegation_id(
            &limited_proof_id,
            &formatted_proof_master,
            &levels,
        )?;

        Ok(Delegation {
            limited_proof_id,
            formatted_proof_master,
            delegation_id,
            levels,
        })
    }
}

impl Delegation {
    /// Reduce delegation levels to compute the final hash result.
    /// This function applies the same logic used in compute_delegation_id
    /// to ensure consistency between delegation ID computation and
    /// verification.
    ///
    /// The closure `f` is called for each level with the level and the new
    /// hash. If the closure returns `Ok(false)`, processing stops and an
    /// error is returned. If the closure returns `Ok(true)`, processing
    /// continues to the next level.
    fn reduce_levels<F>(
        initial_hash: &[u8],
        levels: &[DelegationLevel],
        mut f: F,
    ) -> Result<Vec<u8>, String>
    where
        F: FnMut(&DelegationLevel, &[u8]) -> Result<bool, String>,
    {
        let mut hash_result = initial_hash.to_vec();

        // Reduce levels: hash = Hash(hash || pubkey) for each level
        for level in levels {
            let mut level_data = Vec::new();
            level_data.extend_from_slice(&hash_result);

            // Use the same format as serialization: compact size + pubkey bytes
            let pubkey_bytes = level.pubkey_bytes();
            level_data.extend_from_slice(&write_compact_size(
                pubkey_bytes.len() as u64,
            ));
            level_data.extend_from_slice(&pubkey_bytes);

            hash_result = hash::sha256d(&level_data).to_vec();

            // Call the closure with the current level and new hash
            match f(level, &hash_result) {
                Ok(true) => continue, // Continue to next level
                // Stop and fail
                Ok(false) => return Err("Verification failed".to_string()),
                Err(e) => return Err(e), // Propagate error
            }
        }

        Ok(hash_result)
    }

    /// Compute the delegation ID.
    pub fn compute_delegation_id(
        limited_proof_id: &LimitedProofId,
        formatted_proof_master: &FormattedPublicKey,
        levels: &[DelegationLevel],
    ) -> Result<DelegationId, String> {
        // Use Proof::compute_proof_id to ensure consistency
        let proof_master_bytes = formatted_proof_master.serialize();
        let proof_id =
            Proof::compute_proof_id(limited_proof_id, &proof_master_bytes);
        let hash_result =
            Self::reduce_levels(&proof_id.to_bytes(), levels, |_, _| Ok(true))
                .unwrap();

        Ok(DelegationId::from_array(
            hash_result.try_into().map_err(|_| "Invalid hash length")?,
        ))
    }

    /// Get the proof master key.
    pub fn proof_master(&self) -> &PublicKey {
        self.formatted_proof_master.public_key()
    }

    /// Get the levels.
    pub fn levels(&self) -> &[DelegationLevel] {
        &self.levels
    }
}

#[cfg(test)]
mod tests {

    #[test]
    fn test_empty_delegation() {
        use super::{Delegation, LimitedProofId};

        let limited_proof_id = LimitedProofId::from_array([1u8; 32]);
        let public_key_bytes = hex::decode(
            "030b4c866585dd868a9d62348a9cd008d6a312937048fff31670e7e920cfc7a744"
        ).unwrap();

        let delegation =
            Delegation::new(&limited_proof_id, &public_key_bytes, vec![])
                .unwrap();

        assert_eq!(delegation.level_count(), 0);
        assert_eq!(delegation.delegated_pubkey_bytes(), public_key_bytes);
        assert!(delegation.verify().is_none());
    }

    #[test]
    fn test_single_level_delegation() {
        use super::LimitedProofId;
        use crate::delegationbuilder::DelegationBuilder;

        let limited_proof_id = LimitedProofId::from_array([1u8; 32]);
        let master_secret_bytes = hex::decode(
            "12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f747",
        )
        .unwrap();
        let master_public_bytes = hex::decode(
            "030b4c866585dd868a9d62348a9cd008d6a312937048fff31670e7e920cfc7a744"
        ).unwrap();
        let delegated_public_bytes = hex::decode(
            "04d0de0aaeaefad02b8bdc8a01a1b8b11c696bd3d66a2c5f10780d95b7df42645c\
            d85228a6fb29940e858e7e55842ae2bd115d1ed7cc0e82d934e929c97648cb0a"
        ).unwrap();

        let mut builder =
            DelegationBuilder::new(limited_proof_id, &master_public_bytes)
                .unwrap();

        builder
            .add_level(&master_secret_bytes, &delegated_public_bytes)
            .unwrap();

        let delegation = builder.build().unwrap();
        assert_eq!(delegation.level_count(), 1);
        assert_eq!(delegation.delegated_pubkey_bytes(), delegated_public_bytes);
        assert!(delegation.verify().is_none());
    }

    #[test]
    fn test_delegation_serialization() {
        use super::{Delegation, LimitedProofId};
        use crate::delegationbuilder::DelegationBuilder;

        let limited_proof_id = LimitedProofId::from_array([1u8; 32]);
        let master_secret_bytes = hex::decode(
            "12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f747",
        )
        .unwrap();
        let master_public_bytes = hex::decode(
            "030b4c866585dd868a9d62348a9cd008d6a312937048fff31670e7e920cfc7a744"
        ).unwrap();
        let delegated_public_bytes = hex::decode(
            "04d0de0aaeaefad02b8bdc8a01a1b8b11c696bd3d66a2c5f10780d95b7df42645c\
            d85228a6fb29940e858e7e55842ae2bd115d1ed7cc0e82d934e929c97648cb0a"
        ).unwrap();

        let mut builder =
            DelegationBuilder::new(limited_proof_id, &master_public_bytes)
                .unwrap();

        builder
            .add_level(&master_secret_bytes, &delegated_public_bytes)
            .unwrap();

        let delegation = builder.build().unwrap();

        // Test serialization round trip
        let serialized = delegation.serialize();
        let deserialized = Delegation::deserialize(&serialized).unwrap();

        assert_eq!(
            delegation.delegation_id().to_hex(),
            deserialized.delegation_id().to_hex()
        );
        assert_eq!(delegation.level_count(), deserialized.level_count());
        assert!(deserialized.verify().is_none());
    }

    #[test]
    fn test_delegation_roundtrip_with_known_vector() {
        use super::Delegation;

        // Use the 1-level delegation hex from test_avalanche.py
        const KNOWN_DELEGATION_HEX: &str =
            "6428c2c29a116191d42fe68e74f1ee33f8a285c13320d77b201c3ab9135c84e521\
            030b4c866585dd868a9d62348a9cd008d6a312937048fff31670e7e920cfc7a7440\
            12103e49f9df52de2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e645\
            ef22c1dd0a15c32d251dd993dde979e8f2751a468d622ca7db10bfc11180497d0ff\
            4be928f362fd8fcd5259cef923bb471840c307e9bc4f89e5426b4e67b72d90e";

        // Step 1: Deserialize the known hex delegation
        let delegation = Delegation::from_hex(KNOWN_DELEGATION_HEX)
            .expect("Failed to deserialize known delegation hex");

        // Step 2: Check its content
        assert_eq!(delegation.level_count(), 1, "Expected 1 delegation level");

        // Check the limited proof ID (first 32 bytes of the hex)
        let expected_limited_proof_id =
            "6428c2c29a116191d42fe68e74f1ee33f8a285c13320d77b201c3ab9135c84e5";
        assert_eq!(
            delegation.limited_proof_id().to_hex(),
            expected_limited_proof_id,
            "Limited proof ID mismatch"
        );

        // Check the proof master public key (compressed format starting with
        // 02/03)
        let proof_master_hex = hex::encode(delegation.proof_master_bytes());
        assert_eq!(
            proof_master_hex,
            "030b4c866585dd868a9d62348a9cd008\
            d6a312937048fff31670e7e920cfc7a744",
            "Proof master public key mismatch"
        );

        // Check the delegated public key (should be the last level's pubkey)
        let delegated_pubkey_hex =
            hex::encode(delegation.delegated_pubkey_bytes());
        assert_eq!(
            delegated_pubkey_hex,
            "03e49f9df52de2dea81cf7838b82521b\
            69f2ea360f1c4eed9e6c89b7d0f9e645ef",
            "Delegated public key mismatch"
        );

        // Check that we have exactly one delegation level
        let levels = delegation.delegation_levels();
        assert_eq!(levels.len(), 1, "Expected exactly 1 delegation level");

        // Check the level's public key
        let level_pubkey_hex = hex::encode(levels[0].pubkey_bytes());
        assert_eq!(
            level_pubkey_hex,
            "03e49f9df52de2dea81cf7838b82521b\
            69f2ea360f1c4eed9e6c89b7d0f9e645ef",
            "Level public key mismatch"
        );

        // Step 3: Run verify to make sure it's valid
        let verification_result = delegation.verify();
        assert!(
            verification_result.is_none(),
            "Delegation verification failed: {:?}",
            verification_result
        );

        // Step 4: Serialize it again
        let reserialized_hex = delegation.to_hex();

        // Step 5: Check it matches the original hex
        assert_eq!(
            reserialized_hex.to_lowercase(),
            KNOWN_DELEGATION_HEX.to_lowercase(),
            "Reserialized delegation hex does not match original"
        );

        // Additional verification: deserialize the reserialized version and
        // verify again
        let reserialized_delegation = Delegation::from_hex(&reserialized_hex)
            .expect("Failed to deserialize reserialized delegation");

        assert_eq!(
            delegation.delegation_id().to_hex(),
            reserialized_delegation.delegation_id().to_hex(),
            "Delegation ID changed after roundtrip"
        );

        let reserialized_verification = reserialized_delegation.verify();
        assert!(
            reserialized_verification.is_none(),
            "Reserialized delegation verification failed: {:?}",
            reserialized_verification
        );
    }
}
