// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Avalanche proof builder implementation.

use std::collections::BTreeSet;

use ecash_secp256k1::{Message, Secp256k1, SecretKey};
use wasm_bindgen::prelude::*;

use crate::key::parse_secret_key;
use crate::proof::{LimitedProofId, Proof, ProofId};
use crate::pubkey::{FormattedPublicKey, PublicKeyFormat};
use crate::schnorrsignature::SchnorrSignature;
use crate::script::Script;
use crate::stake::Amount;
use crate::stake::{SignedStake, Stake};

/// Maximum number of stakes allowed in a proof
const MAX_PROOF_STAKES: usize = 1000;

/// Proof builder for creating avalanche proofs.
#[derive(Debug)]
#[wasm_bindgen]
pub struct ProofBuilder {
    sequence: u64,
    expiration_time: i64,
    master_secret_key: SecretKey,
    formatted_master_pubkey: FormattedPublicKey,
    payout_script: Script,
    stakes: BTreeSet<SignedStake>,
}

#[wasm_bindgen]
impl ProofBuilder {
    /// Create a new proof builder.
    #[wasm_bindgen(constructor)]
    pub fn new(
        sequence: u64,
        expiration_time: i64,
        master_secret_key: &[u8],
        payout_script: &[u8],
    ) -> Result<ProofBuilder, String> {
        let master_secret_key = parse_secret_key(master_secret_key)?;
        let payout_script = Script::new(payout_script);

        // Derive the public key from the secret key (default to compressed
        // format)
        let public_key = master_secret_key.public_key(&Secp256k1::new());
        let formatted_master_pubkey =
            FormattedPublicKey::new(public_key, PublicKeyFormat::Compressed);

        Ok(ProofBuilder {
            sequence,
            expiration_time,
            master_secret_key,
            formatted_master_pubkey,
            payout_script,
            stakes: BTreeSet::new(),
        })
    }

    /// Create a new proof builder with a specific master pubkey format.
    #[wasm_bindgen(js_name = newWithMasterPubkey)]
    pub fn new_with_master_pubkey(
        sequence: u64,
        expiration_time: i64,
        master_secret_key: &[u8],
        master_pubkey: &[u8],
        payout_script: &[u8],
    ) -> Result<ProofBuilder, String> {
        let master_secret_key = parse_secret_key(master_secret_key)?;
        let payout_script = Script::new(payout_script);

        let formatted_master_pubkey =
            FormattedPublicKey::from_slice(master_pubkey)?;

        // Validate that the private key corresponds to the provided master
        // pubkey
        let derived_pubkey = master_secret_key.public_key(&Secp256k1::new());

        // Compare in the same format as the provided pubkey
        let derived_pubkey_bytes = match formatted_master_pubkey.format() {
            PublicKeyFormat::Compressed => derived_pubkey.serialize().to_vec(),
            PublicKeyFormat::Uncompressed => {
                derived_pubkey.serialize_uncompressed().to_vec()
            }
        };

        let provided_pubkey_bytes = formatted_master_pubkey.serialize();

        if derived_pubkey_bytes != provided_pubkey_bytes {
            return Err("Private key does not correspond to the provided \
                        master public key"
                .to_string());
        }

        Ok(ProofBuilder {
            sequence,
            expiration_time,
            master_secret_key,
            formatted_master_pubkey,
            payout_script,
            stakes: BTreeSet::new(),
        })
    }

    /// Add a signed stake to the proof.
    #[wasm_bindgen(js_name = addStake)]
    pub fn add_stake(
        &mut self,
        signed_stake: SignedStake,
    ) -> Result<(), String> {
        if self.stakes.len() >= MAX_PROOF_STAKES {
            return Err(format!(
                "Cannot add more than {} stakes to a proof",
                MAX_PROOF_STAKES
            ));
        }

        self.stakes.insert(signed_stake);
        Ok(())
    }

    /// Add a stake and sign it with the provided private key.
    #[wasm_bindgen(js_name = addStakeWithKey)]
    pub fn add_stake_with_key(
        &mut self,
        stake: Stake,
        private_key: &[u8],
    ) -> Result<(), String> {
        let private_key = parse_secret_key(private_key)?;

        // Create stake commitment
        let commitment = crate::stake::StakeCommitment::new(
            self.expiration_time,
            &self.formatted_master_pubkey.serialize(),
        )?;

        // Sign the stake
        let signed_stake = SignedStake::create_signed(
            stake,
            private_key.as_ref(),
            commitment,
        )?;

        self.add_stake(signed_stake)
    }

    /// Get the number of stakes.
    #[wasm_bindgen(js_name = stakeCount)]
    pub fn stake_count(&self) -> usize {
        self.stakes.len()
    }

    /// Get the total staked amount.
    #[wasm_bindgen(js_name = totalStakedAmount)]
    pub fn total_staked_amount(&self) -> Amount {
        self.stakes
            .iter()
            .map(|signed_stake| signed_stake.stake().amount())
            .sum()
    }

    /// Build the proof by signing it with the master private key.
    pub fn build(self) -> Result<Proof, String> {
        if self.stakes.is_empty() {
            return Err("Cannot build proof with no stakes".to_string());
        }

        // Convert stakes to signed stakes
        let signed_stakes: Vec<SignedStake> = self.stakes.into_iter().collect();

        // Compute the limited proof ID
        let limited_proof_id = Proof::compute_limited_proof_id(
            self.sequence,
            self.expiration_time,
            &signed_stakes,
            &self.payout_script,
        );

        // Sign the limited proof ID with the master private key
        let limited_proof_id_bytes = limited_proof_id.as_ref();
        let mut hash_array = [0u8; 32];
        hash_array.copy_from_slice(limited_proof_id_bytes);
        let message = Message::from_digest(hash_array);

        let secp = Secp256k1::new();
        let signature =
            secp.sign_schnorrabc_no_aux_rand(&message, &self.master_secret_key);
        let schnorr_signature = SchnorrSignature::new(signature.as_ref())?;

        Proof::new(
            self.sequence,
            self.expiration_time,
            &self.formatted_master_pubkey.serialize(),
            &self.payout_script.to_bytes(),
            signed_stakes,
            schnorr_signature.as_ref(),
        )
    }

    /// Get the limited proof ID.
    #[wasm_bindgen(js_name = getLimitedProofId)]
    pub fn get_limited_proof_id(&self) -> LimitedProofId {
        let signed_stakes: Vec<SignedStake> = self
            .stakes
            .iter()
            .map(|signed_stake| signed_stake.clone())
            .collect();

        Proof::compute_limited_proof_id(
            self.sequence,
            self.expiration_time,
            &signed_stakes,
            &self.payout_script,
        )
    }

    /// Get the proof ID.
    #[wasm_bindgen(js_name = getProofId)]
    pub fn get_proof_id(&self) -> ProofId {
        let limited_proof_id = self.get_limited_proof_id();

        // Master pubkey is always available since it's derived from secret key
        let master_pubkey_bytes = self.formatted_master_pubkey.serialize();

        Proof::compute_proof_id(&limited_proof_id, &master_pubkey_bytes)
    }

    /// Add a presigned stake to the proof.
    #[wasm_bindgen(js_name = addPresignedStake)]
    pub fn add_signed_stake(
        &mut self,
        signed_stake: SignedStake,
    ) -> Result<(), String> {
        if self.stakes.len() >= MAX_PROOF_STAKES {
            return Err(format!(
                "Cannot add more than {} stakes to a proof",
                MAX_PROOF_STAKES
            ));
        }

        self.stakes.insert(signed_stake);
        Ok(())
    }

    /// Build the proof with a provided signature.
    #[wasm_bindgen(js_name = buildWithSignature)]
    pub fn build_with_signature(
        self,
        signature: SchnorrSignature,
    ) -> Result<Proof, String> {
        if self.stakes.is_empty() {
            return Err("Cannot build proof with no stakes".to_string());
        }

        // Master pubkey is always available since it's derived from secret key
        let formatted_master_pubkey = self.formatted_master_pubkey;

        // Convert stakes to signed stakes
        let signed_stakes: Vec<SignedStake> = self.stakes.into_iter().collect();

        Proof::new(
            self.sequence,
            self.expiration_time,
            &formatted_master_pubkey.serialize(),
            &self.payout_script.to_bytes(),
            signed_stakes,
            signature.as_ref(),
        )
    }
}

#[cfg(test)]
mod tests {
    use ecash_secp256k1::SecretKey;
    use hex;

    use super::*;
    use crate::outpoint::TxId;
    use crate::schnorrsignature::SchnorrSignature;
    use crate::stake::{SignedStake, Stake, StakeCommitment};

    // Test constants from test_vectors.rs
    const PROOF_MASTER_PRIVKEY: &str =
        "12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f747";
    const PROOF_MASTER_PUBKEY: &str =
        "030b4c866585dd868a9d62348a9cd008d6a312937048fff31670e7e920cfc7a744";
    const PROOF_MASTER_PUBKEY_UNCOMPRESSED: &str =
        "040b4c866585dd868a9d62348a9cd008d6a312937048fff31670e7e920cfc7a7447b5f\
        0bba9e01e6fe4735c8383e6e7a3347a0fd72381b8f797a19f694054e5a69";
    const STAKE_PRIVKEY: &str =
        "0c28fca386c7a227600b2fe50b7cae11ec86d3bf1fbe471be89827e19d72aa1d";
    const STAKE_PUBKEY: &str =
        "04d0de0aaeaefad02b8bdc8a01a1b8b11c696bd3d66a2c5f10780d95b7df42645cd852\
        28a6fb29940e858e7e55842ae2bd115d1ed7cc0e82d934e929c97648cb0a";
    const STAKE_TXID: &str =
        "24ae50f5d4e81e340b29708ab11cab48364e2ae2c53f8439cbe983257919fcb7";
    const P2PKH_SCRIPT: &str =
        "76a91489abcdefabbaabbaabbaabbaabbaabbaabbaabba88ac";

    fn create_test_stake() -> Stake {
        let txid = TxId::from_hex(STAKE_TXID).unwrap();
        let amount = 10_000_000_000; // 100M XEC or 10B satoshis
        let height = 672828u32;
        let iscoinbase = false;
        let pubkey_bytes = hex::decode(STAKE_PUBKEY).unwrap();

        Stake::new(txid, 0, amount, height, iscoinbase, &pubkey_bytes).unwrap()
    }

    fn create_test_signed_stake() -> SignedStake {
        let stake = create_test_stake();
        let secret_key =
            SecretKey::from_slice(&hex::decode(STAKE_PRIVKEY).unwrap())
                .unwrap();
        let commitment = StakeCommitment::new(
            2051222400,
            &hex::decode(PROOF_MASTER_PUBKEY).unwrap(),
        )
        .unwrap();

        SignedStake::create_signed(stake, secret_key.as_ref(), commitment)
            .unwrap()
    }

    #[test]
    fn test_proof_builder_new() {
        let master_privkey = hex::decode(PROOF_MASTER_PRIVKEY).unwrap();
        let payout_script = hex::decode(P2PKH_SCRIPT).unwrap();

        let builder =
            ProofBuilder::new(42, 1699999999, &master_privkey, &payout_script)
                .unwrap();

        assert_eq!(builder.sequence, 42);
        assert_eq!(builder.expiration_time, 1699999999);
        assert_eq!(builder.stake_count(), 0);
        assert_eq!(builder.total_staked_amount(), 0);
        assert_eq!(
            builder.formatted_master_pubkey.serialize(),
            hex::decode(PROOF_MASTER_PUBKEY).unwrap()
        );
    }

    #[test]
    fn test_proof_builder_new_with_master_pubkey() {
        let master_privkey = hex::decode(PROOF_MASTER_PRIVKEY).unwrap();
        let master_pubkey =
            hex::decode(PROOF_MASTER_PUBKEY_UNCOMPRESSED).unwrap();
        let payout_script = hex::decode(P2PKH_SCRIPT).unwrap();

        let builder = ProofBuilder::new_with_master_pubkey(
            42,
            1699999999,
            &master_privkey,
            &master_pubkey,
            &payout_script,
        )
        .unwrap();

        assert_eq!(builder.sequence, 42);
        assert_eq!(builder.expiration_time, 1699999999);
        assert_eq!(builder.stake_count(), 0);
        assert_eq!(builder.total_staked_amount(), 0);
        assert_eq!(
            builder.formatted_master_pubkey.serialize(),
            hex::decode(PROOF_MASTER_PUBKEY_UNCOMPRESSED).unwrap()
        );
    }

    #[test]
    fn test_proof_builder_new_with_wrong_pubkey() {
        let master_privkey = hex::decode(PROOF_MASTER_PRIVKEY).unwrap();
        let wrong_pubkey = hex::decode(
            "030000000000000000000000000000000000000000000000000000000000000000"
        ).unwrap();
        let payout_script = hex::decode(P2PKH_SCRIPT).unwrap();

        let result = ProofBuilder::new_with_master_pubkey(
            42,
            1699999999,
            &master_privkey,
            &wrong_pubkey,
            &payout_script,
        );

        assert!(result.is_err());
        let error_msg = result.unwrap_err();
        assert!(
            error_msg.contains("Invalid public key")
                || error_msg.contains("malformed public key")
        );
    }

    #[test]
    fn test_proof_builder_add_stake() {
        let master_privkey = hex::decode(PROOF_MASTER_PRIVKEY).unwrap();
        let payout_script = hex::decode(P2PKH_SCRIPT).unwrap();

        let mut builder =
            ProofBuilder::new(42, 1699999999, &master_privkey, &payout_script)
                .unwrap();
        let signed_stake = create_test_signed_stake();

        builder.add_stake(signed_stake).unwrap();

        assert_eq!(builder.stake_count(), 1);
        assert_eq!(builder.total_staked_amount(), 10_000_000_000);
    }

    #[test]
    fn test_proof_builder_add_stake_with_key() {
        let master_privkey = hex::decode(PROOF_MASTER_PRIVKEY).unwrap();
        let payout_script = hex::decode(P2PKH_SCRIPT).unwrap();

        let mut builder =
            ProofBuilder::new(42, 1699999999, &master_privkey, &payout_script)
                .unwrap();
        let stake = create_test_stake();
        let stake_privkey = hex::decode(STAKE_PRIVKEY).unwrap();

        builder.add_stake_with_key(stake, &stake_privkey).unwrap();

        assert_eq!(builder.stake_count(), 1);
        assert_eq!(builder.total_staked_amount(), 10_000_000_000);
    }

    #[test]
    fn test_proof_builder_max_stakes() {
        let master_privkey = hex::decode(PROOF_MASTER_PRIVKEY).unwrap();
        let payout_script = hex::decode(P2PKH_SCRIPT).unwrap();

        let mut builder =
            ProofBuilder::new(42, 1699999999, &master_privkey, &payout_script)
                .unwrap();

        // Add maximum number of stakes
        for i in 0..MAX_PROOF_STAKES {
            let txid = TxId::from_hex(&format!("{:064x}", i)).unwrap();
            let stake = Stake::new(
                txid,
                0,
                1000,
                (100000 + i) as u32,
                false,
                &hex::decode(STAKE_PUBKEY).unwrap(),
            )
            .unwrap();
            let signed_stake = SignedStake::create_signed(
                stake,
                SecretKey::from_slice(&hex::decode(STAKE_PRIVKEY).unwrap())
                    .unwrap()
                    .as_ref(),
                StakeCommitment::new(
                    1699999999,
                    &hex::decode(PROOF_MASTER_PUBKEY).unwrap(),
                )
                .unwrap(),
            )
            .unwrap();
            builder.add_stake(signed_stake).unwrap();
        }

        assert_eq!(builder.stake_count(), MAX_PROOF_STAKES);

        // Try to add one more stake - should fail
        let txid = TxId::from_hex(
            "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        )
        .unwrap();
        let stake = Stake::new(
            txid,
            0,
            1000,
            200000u32,
            false,
            &hex::decode(STAKE_PUBKEY).unwrap(),
        )
        .unwrap();
        let signed_stake = SignedStake::create_signed(
            stake,
            SecretKey::from_slice(&hex::decode(STAKE_PRIVKEY).unwrap())
                .unwrap()
                .as_ref(),
            StakeCommitment::new(
                1699999999,
                &hex::decode(PROOF_MASTER_PUBKEY).unwrap(),
            )
            .unwrap(),
        )
        .unwrap();

        let result = builder.add_stake(signed_stake);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains(
            format!("Cannot add more than {MAX_PROOF_STAKES} stakes").as_str()
        ));
    }

    #[test]
    fn test_proof_builder_build() {
        let master_privkey = hex::decode(PROOF_MASTER_PRIVKEY).unwrap();
        let payout_script = hex::decode(P2PKH_SCRIPT).unwrap();

        let mut builder =
            ProofBuilder::new(42, 2051222400, &master_privkey, &payout_script)
                .unwrap();
        let signed_stake = create_test_signed_stake();
        builder.add_stake(signed_stake).unwrap();

        let proof = builder.build().unwrap();

        assert_eq!(proof.sequence(), 42);
        assert_eq!(proof.expiration_time(), 2051222400);
        assert_eq!(proof.signed_stakes().len(), 1);
        assert_eq!(proof.verify().is_none(), true);
    }

    #[test]
    fn test_proof_builder_build_no_stakes() {
        let master_privkey = hex::decode(PROOF_MASTER_PRIVKEY).unwrap();
        let payout_script = hex::decode(P2PKH_SCRIPT).unwrap();

        let builder =
            ProofBuilder::new(42, 1699999999, &master_privkey, &payout_script)
                .unwrap();

        let result = builder.build();
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .contains("Cannot build proof with no stakes"));
    }

    #[test]
    fn test_proof_builder_build_with_signature() {
        let master_privkey = hex::decode(PROOF_MASTER_PRIVKEY).unwrap();
        let payout_script = hex::decode(P2PKH_SCRIPT).unwrap();

        let mut builder =
            ProofBuilder::new(42, 2051222400, &master_privkey, &payout_script)
                .unwrap();
        let signed_stake = create_test_signed_stake();
        builder.add_stake(signed_stake).unwrap();

        // Create a dummy signature
        let dummy_sig = [0u8; 64];
        let signature = SchnorrSignature::new(&dummy_sig).unwrap();

        let proof = builder.build_with_signature(signature).unwrap();

        assert_eq!(proof.sequence(), 42);
        assert_eq!(proof.expiration_time(), 2051222400);
        assert_eq!(proof.signed_stakes().len(), 1);
        assert_eq!(
            proof.verify(),
            Some("Proof validation failed: Invalid proof signature".into())
        );
    }

    #[test]
    fn test_proof_builder_multiple_stakes() {
        let master_privkey = hex::decode(PROOF_MASTER_PRIVKEY).unwrap();
        let payout_script = hex::decode(P2PKH_SCRIPT).unwrap();

        let mut builder =
            ProofBuilder::new(42, 2051222400, &master_privkey, &payout_script)
                .unwrap();

        // Add multiple stakes
        for i in 0..5 {
            let txid = TxId::from_hex(&format!("{:064x}", i)).unwrap();
            let stake = Stake::new(
                txid,
                0,
                10_000_000_000 + i * 1_000_000_000,
                (100000 + i) as u32,
                false,
                &hex::decode(STAKE_PUBKEY).unwrap(),
            )
            .unwrap();
            let signed_stake = SignedStake::create_signed(
                stake,
                SecretKey::from_slice(&hex::decode(STAKE_PRIVKEY).unwrap())
                    .unwrap()
                    .as_ref(),
                StakeCommitment::new(
                    2051222400,
                    &hex::decode(PROOF_MASTER_PUBKEY).unwrap(),
                )
                .unwrap(),
            )
            .unwrap();
            builder.add_stake(signed_stake).unwrap();
        }

        assert_eq!(builder.stake_count(), 5);
        assert_eq!(
            builder.total_staked_amount(),
            10_000_000_000
                + 11_000_000_000
                + 12_000_000_000
                + 13_000_000_000
                + 14_000_000_000
        );

        let proof = builder.build().unwrap();
        assert_eq!(proof.signed_stakes().len(), 5);
        assert_eq!(proof.verify().is_none(), true);
    }
}
