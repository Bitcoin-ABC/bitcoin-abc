// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Avalanche delegation builder implementation.

use ecash_secp256k1::{Message, Secp256k1, SecretKey};
use wasm_bindgen::prelude::*;

use super::delegation::{Delegation, DelegationId, DelegationLevel};
use crate::compactsize::write_compact_size;
use crate::hash;
use crate::proof::LimitedProofId;
use crate::pubkey::FormattedPublicKey;
use crate::schnorrsignature::SchnorrSignature;

/// Internal level structure for the builder (matches C++ implementation)
#[derive(Debug, Clone)]
struct BuilderLevel {
    formatted_pubkey: FormattedPublicKey,
    sig: Option<SchnorrSignature>,
}

/// Builder for creating avalanche delegations.
#[derive(Debug, Clone)]
#[wasm_bindgen]
pub struct DelegationBuilder {
    limited_proof_id: LimitedProofId,
    dgid: DelegationId,
    levels: Vec<BuilderLevel>,
}

#[wasm_bindgen]
impl DelegationBuilder {
    /// Create a new delegation builder from limited proof ID and proof master.
    #[wasm_bindgen(constructor)]
    pub fn new(
        limited_proof_id: LimitedProofId,
        proof_master: &[u8],
    ) -> Result<DelegationBuilder, String> {
        let formatted_proof_master =
            FormattedPublicKey::from_slice(proof_master)?;

        // Compute initial delegation ID (matches C++
        // DelegationId(ltdProofId.computeProofId(proofMaster)))
        let dgid = Delegation::compute_delegation_id(
            &limited_proof_id,
            &formatted_proof_master,
            &vec![],
        )?;

        Ok(DelegationBuilder {
            limited_proof_id,
            dgid,
            levels: vec![BuilderLevel {
                formatted_pubkey: formatted_proof_master,
                sig: None,
            }],
        })
    }

    /// Create a delegation builder from a Proof.
    /// This matches the C++ constructor: explicit DelegationBuilder(const Proof
    /// &p)
    #[wasm_bindgen(js_name = fromProof)]
    pub fn from_proof(
        proof: crate::proof::Proof,
    ) -> Result<DelegationBuilder, String> {
        let limited_proof_id = proof.limited_proof_id();
        let proof_master = proof.master_pubkey();
        Self::new(limited_proof_id, &proof_master)
    }

    /// Create a delegation builder from an existing Delegation.
    /// This matches the C++ constructor: explicit DelegationBuilder(const
    /// Delegation &dg)
    #[wasm_bindgen(js_name = fromDelegation)]
    pub fn from_delegation(
        delegation: Delegation,
    ) -> Result<DelegationBuilder, String> {
        let mut builder = Self::new(
            delegation.limited_proof_id().clone(),
            &delegation.proof_master_bytes(),
        )?;
        builder.dgid = delegation.delegation_id().clone();

        // Add all existing levels (matches C++ logic)
        for level in delegation.levels() {
            let current_level = builder.levels.last_mut().unwrap();
            current_level.sig = Some(level.signature().clone());
            builder.levels.push(BuilderLevel {
                formatted_pubkey: FormattedPublicKey::from_slice(
                    &level.pubkey_bytes(),
                )?,
                sig: None,
            });
        }

        Ok(builder)
    }

    /// Add a delegation level by signing with the current key.
    #[wasm_bindgen(js_name = addLevel)]
    pub fn add_level(
        &mut self,
        delegator_secret_key: &[u8],
        delegated_pubkey: &[u8],
    ) -> Result<(), String> {
        if delegator_secret_key.len() != 32 {
            return Err(format!(
                "Invalid secret key length: expected 32, got {}",
                delegator_secret_key.len()
            ));
        }

        let delegator_key = SecretKey::from_slice(delegator_secret_key)
            .map_err(|e| format!("Invalid delegator secret key: {}", e))?;

        let formatted_delegated_pubkey =
            FormattedPublicKey::from_slice(delegated_pubkey)?;

        // Verify that the secret key matches the current public key (last
        // level's pubkey)
        let expected_pubkey = delegator_key.public_key(&Secp256k1::new());
        let current_pubkey =
            self.levels.last().unwrap().formatted_pubkey.public_key();
        if expected_pubkey != *current_pubkey {
            return Err("Delegator secret key does not match current public \
                        key"
            .to_string());
        }

        // Create the message to sign: Hash(dgid || delegated_pubkey) (matches
        // C++ logic)
        let mut message_data = Vec::new();
        message_data.extend_from_slice(&self.dgid.to_bytes());

        // Serialize the pubkey in its original format with compact size prefix
        let pubkey_bytes = formatted_delegated_pubkey.serialize();

        // Add compact size prefix for the pubkey length
        message_data
            .extend_from_slice(&write_compact_size(pubkey_bytes.len() as u64));
        message_data.extend_from_slice(&pubkey_bytes);

        let message_hash = hash::sha256d(&message_data);

        // Sign the message
        let secp = Secp256k1::new();
        let message = Message::from_digest(message_hash);
        let signature =
            secp.sign_schnorrabc_no_aux_rand(&message, &delegator_key);
        let schnorr_sig = SchnorrSignature::new(signature.as_ref())?;

        // Update the signature of the current level and add the new level
        // (matches C++ logic)
        let current_level = self.levels.last_mut().unwrap();
        current_level.sig = Some(schnorr_sig);

        // Update dgid and add new level
        self.dgid = DelegationId::from_array(message_hash);
        self.levels.push(BuilderLevel {
            formatted_pubkey: formatted_delegated_pubkey,
            sig: None,
        });

        Ok(())
    }

    /// Build the final delegation (matches C++ build logic).
    #[wasm_bindgen]
    pub fn build(&self) -> Result<Delegation, String> {
        // Convert BuilderLevel to DelegationLevel (matches C++ logic)
        let mut delegation_levels = Vec::new();
        for i in 1..self.levels.len() {
            let level = &self.levels[i];
            let sig = self.levels[i - 1]
                .sig
                .as_ref()
                .ok_or("Missing signature for delegation level")?;
            delegation_levels.push(DelegationLevel::new(
                &level.formatted_pubkey.serialize(),
                &sig.to_bytes(),
            )?);
        }

        Ok(Delegation::new(
            &self.limited_proof_id,
            &self.levels[0].formatted_pubkey.serialize(),
            delegation_levels,
        )?)
    }
}

#[cfg(test)]
mod tests {
    use ecash_secp256k1::SecretKey;

    use super::*;
    use crate::outpoint::TxId;
    use crate::proof::{LimitedProofId, Proof};
    use crate::schnorrsignature::SchnorrSignature;
    use crate::script::Script;
    use crate::stake::{SignedStake, Stake};

    // Test vectors from test_avalanche.py
    const EXPECTED_LIMITED_ID1: &str =
        "e5845c13b93a1c207bd72033c185a2f833eef1748ee62fd49161119ac2c22864";

    // Test keys from test_avalanche.py
    const PROOF_MASTER_PRIVKEY: &str =
        "12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f747";
    const PROOF_MASTER_PUBKEY: &str =
        "030b4c866585dd868a9d62348a9cd008d6a312937048fff31670e7e920cfc7a744";
    const DELEGATED_PUBKEY_1: &str =
        "03e49f9df52de2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e645ef";
    const DELEGATED_PRIVKEY_1: &str =
        "7077da4a47f6c85a21fe6c6cf1285c0fa06915871744ab1e5a5b741027884d00";

    fn create_test_proof() -> Proof {
        // Create a minimal test proof using the test vector data
        let master_pubkey_bytes = hex::decode(PROOF_MASTER_PUBKEY).unwrap();
        let payout_script = Script::new(&[]);

        // Create a test stake
        let txid = TxId::from_hex(
            "24ae50f5d4e81e340b29708ab11cab48364e2ae2c53f8439cbe983257919fcb7",
        )
        .unwrap();
        let stake_pubkey_bytes = hex::decode(
            "04d0de0aaeaefad02b8bdc8a01a1b8b11c696bd3d66a2c5f10780d95b7df42645c\
            d85228a6fb29940e858e7e55842ae2bd115d1ed7cc0e82d934e929c97648cb0a"
        ).unwrap();
        let stake = Stake::new(
            txid,
            0,      // vout
            10000,  // 100.00 XEC in satoshis
            672828, // height
            false,
            &stake_pubkey_bytes,
        )
        .unwrap();

        // Create a test signature (dummy for testing)
        let dummy_sig = SchnorrSignature::new(&[0u8; 64]).unwrap();
        let signed_stake = SignedStake::new(stake, dummy_sig.clone());

        Proof::new(
            42,
            1699999999,
            &master_pubkey_bytes,
            &payout_script.to_bytes(),
            vec![signed_stake],
            &dummy_sig.to_bytes(),
        )
        .unwrap()
    }

    #[test]
    fn test_delegation_builder_from_proof() {
        let proof = create_test_proof();
        let limited_proof_id = proof.limited_proof_id();

        // Test creating a delegation builder from a proof
        let builder = DelegationBuilder::from_proof(proof).unwrap();
        assert_eq!(builder.limited_proof_id, limited_proof_id);

        // The dgid should be equal to the proofid when there is no delegation
        // levels
        let expected_dgid = Proof::compute_proof_id(
            &limited_proof_id,
            &hex::decode(PROOF_MASTER_PUBKEY).unwrap(),
        );
        assert_eq!(builder.dgid, expected_dgid);
    }

    #[test]
    fn test_delegation_builder_new() {
        let limited_proof_id =
            LimitedProofId::from_hex(EXPECTED_LIMITED_ID1).unwrap();
        let master_pubkey_bytes = hex::decode(PROOF_MASTER_PUBKEY).unwrap();

        // Test creating a delegation builder directly
        let builder = DelegationBuilder::new(
            limited_proof_id.clone(),
            &master_pubkey_bytes,
        )
        .unwrap();

        assert_eq!(builder.limited_proof_id, limited_proof_id);

        // The dgid should be equal to the proofid when there is no delegation
        // levels
        let expected_dgid =
            Proof::compute_proof_id(&limited_proof_id, &master_pubkey_bytes);
        assert_eq!(builder.dgid, expected_dgid);
    }

    #[test]
    fn test_delegation_builder_add_level() {
        let limited_proof_id =
            LimitedProofId::from_hex(EXPECTED_LIMITED_ID1).unwrap();
        let master_pubkey_bytes = hex::decode(PROOF_MASTER_PUBKEY).unwrap();
        let mut builder = DelegationBuilder::new(
            limited_proof_id.clone(),
            &master_pubkey_bytes,
        )
        .unwrap();

        // Test adding a delegation level
        let delegator_privkey =
            SecretKey::from_slice(&hex::decode(PROOF_MASTER_PRIVKEY).unwrap())
                .unwrap();
        let delegated_pubkey_bytes = hex::decode(DELEGATED_PUBKEY_1).unwrap();

        builder
            .add_level(delegator_privkey.as_ref(), &delegated_pubkey_bytes)
            .unwrap();

        let delegation = builder.build().unwrap();
        assert_eq!(delegation.limited_proof_id(), limited_proof_id);
        assert_eq!(delegation.proof_master_bytes(), master_pubkey_bytes);
        assert_eq!(delegation.levels().len(), 1);
        assert_eq!(delegation.verify().is_none(), true);
    }

    #[test]
    fn test_delegation_builder_from_delegation() {
        // First create a delegation
        let limited_proof_id =
            LimitedProofId::from_hex(EXPECTED_LIMITED_ID1).unwrap();
        let master_pubkey_bytes = hex::decode(PROOF_MASTER_PUBKEY).unwrap();
        let mut builder = DelegationBuilder::new(
            limited_proof_id.clone(),
            &master_pubkey_bytes,
        )
        .unwrap();

        let delegator_privkey =
            SecretKey::from_slice(&hex::decode(PROOF_MASTER_PRIVKEY).unwrap())
                .unwrap();
        let delegated_pubkey_bytes = hex::decode(DELEGATED_PUBKEY_1).unwrap();

        builder
            .add_level(delegator_privkey.as_ref(), &delegated_pubkey_bytes)
            .unwrap();

        let delegation = builder.build().unwrap();

        // Now create a new builder from the delegation
        let new_builder =
            DelegationBuilder::from_delegation(delegation.clone()).unwrap();

        assert_eq!(new_builder.limited_proof_id, delegation.limited_proof_id());
        assert_eq!(new_builder.dgid, delegation.delegation_id());
    }

    #[test]
    fn test_delegation_builder_multiple_levels() {
        let limited_proof_id =
            LimitedProofId::from_hex(EXPECTED_LIMITED_ID1).unwrap();
        let master_pubkey_bytes = hex::decode(PROOF_MASTER_PUBKEY).unwrap();
        let mut builder = DelegationBuilder::new(
            limited_proof_id.clone(),
            &master_pubkey_bytes,
        )
        .unwrap();

        // Add first level
        let delegator_privkey1 =
            SecretKey::from_slice(&hex::decode(PROOF_MASTER_PRIVKEY).unwrap())
                .unwrap();
        let delegated_pubkey1_bytes = hex::decode(DELEGATED_PUBKEY_1).unwrap();

        builder
            .add_level(delegator_privkey1.as_ref(), &delegated_pubkey1_bytes)
            .unwrap();

        // Add second level
        let delegator_privkey2 =
            SecretKey::from_slice(&hex::decode(DELEGATED_PRIVKEY_1).unwrap())
                .unwrap();
        let delegated_pubkey2_bytes = hex::decode(DELEGATED_PUBKEY_1).unwrap();

        builder
            .add_level(delegator_privkey2.as_ref(), &delegated_pubkey2_bytes)
            .unwrap();

        // Build the delegation
        let delegation = builder.build().unwrap();
        assert_eq!(delegation.limited_proof_id(), limited_proof_id);
        assert_eq!(delegation.proof_master_bytes(), master_pubkey_bytes);
        assert_eq!(delegation.levels().len(), 2);
        assert_eq!(delegation.verify().is_none(), true);
    }

    #[test]
    fn test_delegation_builder_invalid_privkey_length() {
        let limited_proof_id =
            LimitedProofId::from_hex(EXPECTED_LIMITED_ID1).unwrap();
        let master_pubkey_bytes = hex::decode(PROOF_MASTER_PUBKEY).unwrap();
        let mut builder = DelegationBuilder::new(
            limited_proof_id.clone(),
            &master_pubkey_bytes,
        )
        .unwrap();

        // Test with invalid private key length
        let result = builder.add_level(
            &[0u8; 16], // Invalid length
            &hex::decode(DELEGATED_PUBKEY_1).unwrap(),
        );

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Invalid secret key length"));
    }

    #[test]
    fn test_delegation_builder_wrong_privkey() {
        let limited_proof_id =
            LimitedProofId::from_hex(EXPECTED_LIMITED_ID1).unwrap();
        let master_pubkey_bytes = hex::decode(PROOF_MASTER_PUBKEY).unwrap();
        let mut builder = DelegationBuilder::new(
            limited_proof_id.clone(),
            &master_pubkey_bytes,
        )
        .unwrap();

        // Test with wrong private key (doesn't match current public key)
        let wrong_privkey =
            SecretKey::from_slice(&hex::decode(DELEGATED_PRIVKEY_1).unwrap())
                .unwrap();
        let delegated_pubkey_bytes = hex::decode(DELEGATED_PUBKEY_1).unwrap();

        let result =
            builder.add_level(wrong_privkey.as_ref(), &delegated_pubkey_bytes);

        assert!(result.is_err());
        assert!(result.unwrap_err().contains(
            "Delegator secret key does not match current public key"
        ));
    }

    #[test]
    fn test_delegation_builder_build_without_levels() {
        let limited_proof_id =
            LimitedProofId::from_hex(EXPECTED_LIMITED_ID1).unwrap();
        let master_pubkey_bytes = hex::decode(PROOF_MASTER_PUBKEY).unwrap();
        let builder = DelegationBuilder::new(
            limited_proof_id.clone(),
            &master_pubkey_bytes,
        )
        .unwrap();

        // Build delegation without any levels (should work)
        let delegation = builder.build().unwrap();

        assert_eq!(delegation.limited_proof_id(), limited_proof_id);
        assert_eq!(delegation.proof_master_bytes(), master_pubkey_bytes);
        assert_eq!(delegation.levels().len(), 0);
        assert_eq!(delegation.verify().is_none(), true);
    }
}
