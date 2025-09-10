// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Avalanche proof implementation.

use ecash_secp256k1::Message;
use wasm_bindgen::prelude::*;

use crate::compactsize::{read_compact_size, write_compact_size};
use crate::hash::Hash256;
use crate::hash::HashWriter;
use crate::pubkey::FormattedPublicKey;
use crate::schnorrsignature::SchnorrSignature;
use crate::script::Script;
use crate::stake::Amount;
use crate::stake::{SignedStake, StakeCommitment};

/// Proof ID type.
pub type ProofId = Hash256;

/// Limited Proof ID type.
pub type LimitedProofId = Hash256;

const MAX_PROOF_STAKES: usize = 1000;

/// Dust threshold for proof stakes (100M XEC = 10,000,000,000 satoshis)
const PROOF_DUST_THRESHOLD: u64 = 10_000_000_000;

/// An Avalanche proof.
#[derive(Debug, Clone, PartialEq, Eq)]
#[wasm_bindgen]
pub struct Proof {
    sequence: u64,
    expiration_time: i64,
    formatted_master_pubkey: FormattedPublicKey,
    payout_script: Script,
    signed_stakes: Vec<SignedStake>,
    signature: SchnorrSignature,
}

#[wasm_bindgen]
impl Proof {
    /// Get the master public key as bytes.
    #[wasm_bindgen(js_name = masterPubkey)]
    pub fn master_pubkey(&self) -> Vec<u8> {
        self.formatted_master_pubkey.serialize()
    }

    /// Get the signed stakes.
    #[wasm_bindgen(js_name = signedStakes)]
    pub fn signed_stakes(&self) -> Vec<SignedStake> {
        self.signed_stakes.clone()
    }

    /// Get the payout script.
    #[wasm_bindgen(js_name = payoutScript)]
    pub fn payout_script(&self) -> Script {
        self.payout_script.clone()
    }

    /// Get the proof signature.
    #[wasm_bindgen(getter)]
    pub fn signature(&self) -> SchnorrSignature {
        self.signature.clone()
    }

    /// Get the sequence number.
    #[wasm_bindgen(getter)]
    pub fn sequence(&self) -> u64 {
        self.sequence
    }

    /// Get the expiration time.
    #[wasm_bindgen(js_name = expirationTime)]
    pub fn expiration_time(&self) -> i64 {
        self.expiration_time
    }

    /// Get the proof ID.
    #[wasm_bindgen(js_name = proofId)]
    pub fn proof_id(&self) -> ProofId {
        let limited_proof_id = Self::compute_limited_proof_id(
            self.sequence,
            self.expiration_time,
            &self.signed_stakes,
            &self.payout_script,
        );
        Self::compute_proof_id(&limited_proof_id, &self.master_pubkey())
    }

    /// Get the limited proof ID.
    #[wasm_bindgen(js_name = limitedProofId)]
    pub fn limited_proof_id(&self) -> LimitedProofId {
        Self::compute_limited_proof_id(
            self.sequence,
            self.expiration_time,
            &self.signed_stakes,
            &self.payout_script,
        )
    }

    /// Get the total staked amount.
    #[wasm_bindgen(js_name = totalStakedAmount)]
    pub fn total_staked_amount(&self) -> Amount {
        self.signed_stakes
            .iter()
            .map(|ss| ss.stake().amount())
            .sum()
    }

    /// Get the proof score (total amount / 1,000,000).
    #[wasm_bindgen(getter)]
    pub fn score(&self) -> u64 {
        self.total_staked_amount() / 1_000_000
    }

    /// Get the number of stakes.
    #[wasm_bindgen(js_name = stakeCount)]
    pub fn stake_count(&self) -> usize {
        self.signed_stakes.len()
    }

    /// Verify the proof signatures and return error message if validation
    /// fails.
    #[wasm_bindgen(js_name = verify)]
    pub fn verify(&self) -> Option<String> {
        // Check for no stakes
        if self.signed_stakes.is_empty() {
            return Some(
                "Proof validation failed: No stakes provided".to_string(),
            );
        }

        // Check for too many UTXOs
        if self.signed_stakes.len() > MAX_PROOF_STAKES {
            return Some(format!(
                "Proof validation failed: Too many stakes ({} > {})",
                self.signed_stakes.len(),
                MAX_PROOF_STAKES
            ));
        }

        // Check payout script is standard
        if !self.is_standard_payout_script() {
            return Some(
                "Proof validation failed: Payout script is not standard"
                    .to_string(),
            );
        }

        // Check proof signature
        if !self.verify_proof_signature() {
            return Some(
                "Proof validation failed: Invalid proof signature".to_string(),
            );
        }

        // Check stake commitment creation
        let commitment = match StakeCommitment::new(
            self.expiration_time,
            &self.master_pubkey(),
        ) {
            Ok(c) => c,
            Err(e) => {
                return Some(format!(
                    "Failed to create stake commitment: {}",
                    e
                ))
            }
        };

        // Check stakes for dust threshold, ordering, duplicates, and signatures
        let mut prev_stake_id = None;
        let mut seen_utxos = std::collections::HashSet::new();

        for (i, signed_stake) in self.signed_stakes.iter().enumerate() {
            let stake = signed_stake.stake();

            // Check dust threshold
            if stake.amount() < PROOF_DUST_THRESHOLD {
                return Some(format!(
                    "Proof validation failed: Stake amount below dust \
                     threshold ({:.2} < {:.2})",
                    stake.amount() as f64 / 100.0,
                    PROOF_DUST_THRESHOLD as f64 / 100.0
                ));
            }

            // Check stake ordering
            let current_stake_id = stake.stake_id();
            if let Some(prev_id) = prev_stake_id {
                if current_stake_id < prev_id {
                    return Some(
                        "Proof validation failed: Stakes are not ordered by \
                         stake ID"
                            .to_string(),
                    );
                }
            }
            prev_stake_id = Some(current_stake_id);

            // Check for duplicate UTXOs
            let utxo = stake.utxo();
            if !seen_utxos.insert(utxo) {
                return Some(
                    "Proof validation failed: Duplicate stake UTXO found"
                        .to_string(),
                );
            }

            // Check stake signature
            if !signed_stake.verify(&commitment) {
                return Some(format!(
                    "Proof validation failed: Invalid signature for stake {}",
                    i + 1
                ));
            }
        }

        // Check if proof has expired (if expiration_time > 0)
        if self.expiration_time > 0 {
            let current_time = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs() as i64;

            if current_time >= self.expiration_time {
                return Some(
                    "Proof validation failed: Proof has expired".to_string(),
                );
            }
        }

        None
    }

    /// Check if the payout script is standard.
    fn is_standard_payout_script(&self) -> bool {
        let script = self.payout_script.as_slice();

        // Empty script is not standard
        if script.is_empty() {
            return false;
        }

        // Check for common standard script patterns
        match script[0] {
            // P2PKH: OP_DUP OP_HASH160 <20 bytes> OP_EQUALVERIFY OP_CHECKSIG
            0x76 => {
                script.len() == 25
                    && script[1] == 0xa9
                    && script[2] == 0x14
                    && script[23] == 0x88
                    && script[24] == 0xac
            }
            // P2SH: OP_HASH160 <20 bytes> OP_EQUAL
            0xa9 => {
                script.len() == 23 && script[1] == 0x14 && script[22] == 0x87
            }
            // P2PK: <33 or 65 bytes> OP_CHECKSIG
            0x21 | 0x41 => script.len() == 35 || script.len() == 67,
            // OP_RETURN: OP_RETURN <data>
            0x6a => {
                script.len() <= 83 // OP_RETURN + max 80 bytes of data
            }
            _ => false,
        }
    }

    /// Verify the proof signature against the proof data.
    fn verify_proof_signature(&self) -> bool {
        // The proof signature is simply the limited_proof_id signed by the
        // master private key
        let limited_proof_id = self.limited_proof_id();

        // Convert to Message for signature verification
        let limited_proof_id_bytes = limited_proof_id.as_ref();
        let mut hash_array = [0u8; 32];
        hash_array.copy_from_slice(limited_proof_id_bytes);
        let message = Message::from_digest(hash_array);

        // Verify the signature using verify_schnorrabc
        use ecash_secp256k1::{
            schnorr::Signature as EcdsaSchnorrSignature, All, Secp256k1,
        };
        let secp = Secp256k1::<All>::new();
        let sig =
            match EcdsaSchnorrSignature::from_slice(self.signature.as_ref()) {
                Ok(s) => s,
                Err(_) => return false,
            };
        secp.verify_schnorrabc(
            &sig,
            &message,
            self.formatted_master_pubkey.public_key(),
        )
        .is_ok()
    }

    /// Serialize the proof to bytes.
    #[wasm_bindgen(js_name = serialize)]
    pub fn serialize(&self) -> Vec<u8> {
        let mut data = Vec::new();

        // Serialize proof header
        data.extend_from_slice(&self.sequence.to_le_bytes());
        data.extend_from_slice(&self.expiration_time.to_le_bytes());

        // Serialize master pubkey with compact size prefix
        let pubkey_bytes = self.formatted_master_pubkey.serialize();
        data.extend_from_slice(&write_compact_size(pubkey_bytes.len() as u64));
        data.extend_from_slice(&pubkey_bytes);

        // Serialize stakes count
        let stakes_count = self.signed_stakes.len() as u64;
        data.extend_from_slice(&write_compact_size(stakes_count));

        // Serialize stakes
        for signed_stake in &self.signed_stakes {
            data.extend_from_slice(&signed_stake.serialize());
        }

        // Serialize payout script
        let script_bytes = self.payout_script.to_bytes();
        let script_len = script_bytes.len() as u64;
        data.extend_from_slice(&write_compact_size(script_len));
        data.extend_from_slice(&script_bytes);

        // Serialize signature
        data.extend_from_slice(self.signature.as_ref());

        data
    }

    /// Convert to hex string.
    #[wasm_bindgen(js_name = toHex)]
    pub fn to_hex(&self) -> String {
        hex::encode(self.serialize())
    }

    /// Create proof from hex string.
    #[wasm_bindgen(js_name = fromHex)]
    pub fn from_hex(hex: &str) -> Result<Proof, String> {
        let hex = hex.trim_start_matches("0x");
        let bytes =
            hex::decode(hex).map_err(|e| format!("Invalid hex: {}", e))?;
        Self::deserialize(&bytes)
    }

    /// Deserialize proof from bytes.
    #[wasm_bindgen]
    pub fn deserialize(data: &[u8]) -> Result<Proof, String> {
        if data.len() < 8 + 8 + 1 + 33 + 1 + 1 + 64 {
            // sequence + expiration_time + min pubkey (1 + 33 bytes minimum) +
            // min stakes count + min script len + signature
            return Err("Proof data too short".to_string());
        }

        let mut offset = 0;

        // Deserialize sequence (8 bytes)
        let sequence = u64::from_le_bytes([
            data[offset],
            data[offset + 1],
            data[offset + 2],
            data[offset + 3],
            data[offset + 4],
            data[offset + 5],
            data[offset + 6],
            data[offset + 7],
        ]);
        offset += 8;

        // Deserialize expiration_time (8 bytes)
        let expiration_time = i64::from_le_bytes([
            data[offset],
            data[offset + 1],
            data[offset + 2],
            data[offset + 3],
            data[offset + 4],
            data[offset + 5],
            data[offset + 6],
            data[offset + 7],
        ]);
        offset += 8;

        // Deserialize master_pubkey (compact size + pubkey bytes)
        let (pubkey_len, pubkey_len_size) = read_compact_size(&data[offset..])?;
        offset += pubkey_len_size;

        if pubkey_len != 33 && pubkey_len != 65 {
            return Err(format!(
                "Invalid public key length: expected 33 or 65 bytes, got {}",
                pubkey_len
            ));
        }

        if data.len() < offset + pubkey_len as usize {
            return Err(format!(
                "Invalid proof format: insufficient data for {} byte public \
                 key",
                pubkey_len
            ));
        }

        let formatted_master_pubkey = FormattedPublicKey::from_slice(
            &data[offset..offset + pubkey_len as usize],
        )?;
        offset += pubkey_len as usize;

        // Deserialize stakes count (compact size)
        let (stakes_count, stakes_count_size) =
            read_compact_size(&data[offset..])?;
        offset += stakes_count_size;

        if stakes_count > MAX_PROOF_STAKES as u64 {
            return Err(format!(
                "Too many stakes: max {}, got {}",
                MAX_PROOF_STAKES, stakes_count
            ));
        }

        // Deserialize stakes
        let mut signed_stakes = Vec::with_capacity(stakes_count as usize);
        for _ in 0..stakes_count {
            let (signed_stake, bytes_consumed) =
                SignedStake::deserialize_with_size(&data[offset..])?;
            offset += bytes_consumed;
            signed_stakes.push(signed_stake);
        }

        // Deserialize payout script length (compact size)
        let (script_len, script_len_size) = read_compact_size(&data[offset..])?;
        offset += script_len_size;

        // Deserialize payout script
        if data.len() < offset + script_len as usize {
            return Err("Invalid proof format: insufficient data for payout \
                        script"
                .to_string());
        }
        let payout_script =
            Script::new(&data[offset..offset + script_len as usize]);
        offset += script_len as usize;

        // Deserialize signature (64 bytes)
        if data.len() < offset + 64 {
            return Err("Invalid proof format: missing signature".to_string());
        }
        let signature = SchnorrSignature::new(&data[offset..offset + 64])?;

        Ok(Proof {
            sequence,
            expiration_time,
            formatted_master_pubkey,
            payout_script,
            signed_stakes,
            signature,
        })
    }

    /// Create a proof from individual components.
    /// This allows reconstructing a proof from JSON or other sources.
    #[wasm_bindgen(js_name = fromComponents)]
    pub fn new(
        sequence: u64,
        expiration_time: i64,
        master_pubkey: &[u8],
        payout_script: &[u8],
        signed_stakes: Vec<SignedStake>,
        signature: &[u8],
    ) -> Result<Proof, String> {
        if signature.len() != 64 {
            return Err(format!(
                "Invalid signature length: expected 64, got {}",
                signature.len()
            ));
        }

        let formatted_master_pubkey =
            FormattedPublicKey::from_slice(master_pubkey)?;

        let payout_script = Script::new(payout_script);
        let signature = SchnorrSignature::new(signature)?;

        Ok(Proof {
            sequence,
            expiration_time,
            formatted_master_pubkey,
            payout_script,
            signed_stakes,
            signature,
        })
    }
}

impl Proof {
    /// Compute the limited proof ID.
    pub fn compute_limited_proof_id(
        sequence: u64,
        expiration_time: i64,
        signed_stakes: &[SignedStake],
        payout_script: &Script,
    ) -> LimitedProofId {
        let mut writer = HashWriter::new();

        writer.write_u64_le(sequence);
        writer.write_i64_le(expiration_time);
        writer.write_bytes_with_size(payout_script.as_ref());

        writer.write_compact_size(signed_stakes.len() as u64);
        for signed_stake in signed_stakes {
            writer.write(&signed_stake.stake().serialize());
        }

        let hash = writer.finalize_double();
        LimitedProofId::from_array(hash)
    }

    /// Compute the proof ID.
    pub fn compute_proof_id(
        limited_proof_id: &LimitedProofId,
        master_pubkey_bytes: &[u8],
    ) -> ProofId {
        let mut writer = HashWriter::new();
        writer.write(limited_proof_id.as_ref());
        // Write compact size for pubkey length, then pubkey bytes
        writer.write(&write_compact_size(master_pubkey_bytes.len() as u64));
        writer.write(master_pubkey_bytes);

        let hash = writer.finalize_double();
        ProofId::from_array(hash)
    }
}

#[cfg(test)]
mod tests {
    use ecash_secp256k1::{Secp256k1, SecretKey};

    use super::*;
    use crate::outpoint::TxId;
    use crate::stake::Stake;

    /// Test vector 1: Single stake proof from test_avalanche.py
    const TEST_PROOF1_HEX: &str =
        "2a00000000000000fff053650000000021030b4c866585dd868a9d62348a9cd008d6a3\
        12937048fff31670e7e920cfc7a74401b7fc19792583e9cb39843fc5e22a4e3648ab1cb\
        18a70290b341ee8d4f550ae24000000001027000000000000788814004104d0de0aaeae\
        fad02b8bdc8a01a1b8b11c696bd3d66a2c5f10780d95b7df42645cd85228a6fb29940e8\
        58e7e55842ae2bd115d1ed7cc0e82d934e929c97648cb0abd9740c85a05a7d543c3d301\
        273d79ff7054758579e30cc05cdfe1aca3374adfe55104b409ffce4a2f19d8a5981d5f0\
        c79b23edac73352ab2898aca89270282500788bac77505ca17d6d0dcc946ced3990c285\
        7c73743cd74d881fcbcbc8eaaa8d72812ebb9a556610687ca592fe907a4af024390e0a9\
        260c4f5ea59e7ac426cc5";

    /// Test vector 2: Three stakes proof from test_avalanche.py
    const TEST_PROOF2_HEX: &str =
        "c964aa6fde575e4ce8404581c7be874e21023beefdde700a6bc02036335b4df141c8bc\
        67bb05a971f5ac2745fd683797dde3030b1e5f35704cb63360aa3d5f444ee35eea4c154\
        c1af6d4e7595b409ada4b42377764698a915c2ac4000000000f28db322102449fb5237e\
        fe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce680da44b13031186044c\
        d54f0084dcbe703bdb74058a1ddd3efffb347c04d45ced339a41eecedad05f8380a4115\
        016404a2787f51e27165171976d1925944df0231e4ed76e1f19b2c2a0fcc069b4ace4a0\
        78cb5cc31e9e19b266d0af41ea8bb0c30c8b47c95a856d9aa000000007dfdd89a210244\
        9fb5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce68019201c990\
        59772f6452efb50579edc11370a94ea0b7fc61f22cbacc1339a22a04a41b20066c61713\
        8d715d95629a837e4f74633f823dddda0a0a40d0f37b59a4ac098c86414715db364a4e3\
        2216084c561acdd79e0860b1fdf7497b159cb13230451200296c902ee000000009f2bc7\
        392102449fb5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce6800\
        eb604ecae881ce1eb68dcc1f94725f70aedec1e60077b59eb4ce4b44d5475ba16b8b0b3\
        70cad583eaf342b4442bc0f09001f1cb1074526c58f2047892f79c25232103843923326\
        1789dd340bdc1450172d9c671b72ee8c0b2736ed2a3a250760897fdacd6bf9c0c881001\
        dc5749966a2f6562f291339521b3894326c0740de880565549fc6838933c95fbee05ff5\
        47ae89bad63e92f552ca3ea4cc01ac3e4869d0dc61b";

    #[test]
    fn test_proof_deserialization_serialization_roundtrip() {
        // Test with proof 1 (single stake)
        let proof1 = Proof::from_hex(TEST_PROOF1_HEX)
            .expect("Failed to deserialize proof 1");
        let serialized1 = proof1.serialize();
        let proof1_roundtrip = Proof::deserialize(&serialized1)
            .expect("Failed to deserialize roundtrip proof 1");

        // Verify the roundtrip produces the same proof
        assert_eq!(proof1.sequence(), proof1_roundtrip.sequence());
        assert_eq!(
            proof1.expiration_time(),
            proof1_roundtrip.expiration_time()
        );
        assert_eq!(proof1.master_pubkey(), proof1_roundtrip.master_pubkey());
        assert_eq!(proof1.payout_script(), proof1_roundtrip.payout_script());
        assert_eq!(
            proof1.signed_stakes().len(),
            proof1_roundtrip.signed_stakes().len()
        );
        assert_eq!(
            proof1.signature().as_ref(),
            proof1_roundtrip.signature().as_ref()
        );

        // Verify stake content for proof 1
        let stakes1 = proof1.signed_stakes();
        let stakes1_roundtrip = proof1_roundtrip.signed_stakes();
        assert_eq!(stakes1.len(), stakes1_roundtrip.len());

        for (i, (signed_stake, signed_stake_roundtrip)) in
            stakes1.iter().zip(stakes1_roundtrip.iter()).enumerate()
        {
            let stake = signed_stake.stake();
            let stake_roundtrip = signed_stake_roundtrip.stake();

            // Verify stake UTXO
            assert_eq!(
                stake.utxo().txid(),
                stake_roundtrip.utxo().txid(),
                "Stake {} UTXO txid mismatch",
                i
            );
            assert_eq!(
                stake.utxo().vout(),
                stake_roundtrip.utxo().vout(),
                "Stake {} UTXO vout mismatch",
                i
            );

            // Verify stake amount and height
            assert_eq!(
                stake.amount(),
                stake_roundtrip.amount(),
                "Stake {} amount mismatch",
                i
            );
            assert_eq!(
                stake.height(),
                stake_roundtrip.height(),
                "Stake {} height mismatch",
                i
            );
            assert_eq!(
                stake.iscoinbase(),
                stake_roundtrip.iscoinbase(),
                "Stake {} coinbase flag mismatch",
                i
            );

            // Verify stake public key
            assert_eq!(
                stake.pubkey(),
                stake_roundtrip.pubkey(),
                "Stake {} pubkey mismatch",
                i
            );

            // Verify stake signature
            assert_eq!(
                signed_stake.signature(),
                signed_stake_roundtrip.signature(),
                "Stake {} signature mismatch",
                i
            );

            // Verify stake ID computation
            assert_eq!(
                stake.stake_id(),
                stake_roundtrip.stake_id(),
                "Stake {} stake_id mismatch",
                i
            );
        }

        // Test with proof 2 (three stakes)
        let proof2 = Proof::from_hex(TEST_PROOF2_HEX)
            .expect("Failed to deserialize proof 2");
        let serialized2 = proof2.serialize();
        let proof2_roundtrip = Proof::deserialize(&serialized2)
            .expect("Failed to deserialize roundtrip proof 2");

        // Verify the roundtrip produces the same proof
        assert_eq!(proof2.sequence(), proof2_roundtrip.sequence());
        assert_eq!(
            proof2.expiration_time(),
            proof2_roundtrip.expiration_time()
        );
        assert_eq!(proof2.master_pubkey(), proof2_roundtrip.master_pubkey());
        assert_eq!(proof2.payout_script(), proof2_roundtrip.payout_script());
        assert_eq!(
            proof2.signed_stakes().len(),
            proof2_roundtrip.signed_stakes().len()
        );
        assert_eq!(
            proof2.signature().as_ref(),
            proof2_roundtrip.signature().as_ref()
        );

        // Verify stake content for proof 2
        let stakes2 = proof2.signed_stakes();
        let stakes2_roundtrip = proof2_roundtrip.signed_stakes();
        assert_eq!(stakes2.len(), stakes2_roundtrip.len());

        for (i, (signed_stake, signed_stake_roundtrip)) in
            stakes2.iter().zip(stakes2_roundtrip.iter()).enumerate()
        {
            let stake = signed_stake.stake();
            let stake_roundtrip = signed_stake_roundtrip.stake();

            // Verify stake UTXO
            assert_eq!(
                stake.utxo().txid(),
                stake_roundtrip.utxo().txid(),
                "Stake {} UTXO txid mismatch",
                i
            );
            assert_eq!(
                stake.utxo().vout(),
                stake_roundtrip.utxo().vout(),
                "Stake {} UTXO vout mismatch",
                i
            );

            // Verify stake amount and height
            assert_eq!(
                stake.amount(),
                stake_roundtrip.amount(),
                "Stake {} amount mismatch",
                i
            );
            assert_eq!(
                stake.height(),
                stake_roundtrip.height(),
                "Stake {} height mismatch",
                i
            );
            assert_eq!(
                stake.iscoinbase(),
                stake_roundtrip.iscoinbase(),
                "Stake {} coinbase flag mismatch",
                i
            );

            // Verify stake public key
            assert_eq!(
                stake.pubkey(),
                stake_roundtrip.pubkey(),
                "Stake {} pubkey mismatch",
                i
            );

            // Verify stake signature
            assert_eq!(
                signed_stake.signature(),
                signed_stake_roundtrip.signature(),
                "Stake {} signature mismatch",
                i
            );

            // Verify stake ID computation
            assert_eq!(
                stake.stake_id(),
                stake_roundtrip.stake_id(),
                "Stake {} stake_id mismatch",
                i
            );
        }
    }

    #[test]
    fn test_proof_hex_roundtrip() {
        // Test hex conversion roundtrip
        let proof1 = Proof::from_hex(TEST_PROOF1_HEX)
            .expect("Failed to deserialize proof 1");
        let hex1 = proof1.to_hex();
        let proof1_from_hex =
            Proof::from_hex(&hex1).expect("Failed to deserialize from hex");

        assert_eq!(proof1.sequence(), proof1_from_hex.sequence());
        assert_eq!(proof1.expiration_time(), proof1_from_hex.expiration_time());
        assert_eq!(proof1.master_pubkey(), proof1_from_hex.master_pubkey());
        assert_eq!(proof1.payout_script(), proof1_from_hex.payout_script());
        assert_eq!(
            proof1.signed_stakes().len(),
            proof1_from_hex.signed_stakes().len()
        );
        assert_eq!(
            proof1.signature().as_ref(),
            proof1_from_hex.signature().as_ref()
        );

        // Verify stake content for hex roundtrip
        let stakes1 = proof1.signed_stakes();
        let stakes1_from_hex = proof1_from_hex.signed_stakes();
        assert_eq!(stakes1.len(), stakes1_from_hex.len());

        for (i, (signed_stake, signed_stake_from_hex)) in
            stakes1.iter().zip(stakes1_from_hex.iter()).enumerate()
        {
            let stake = signed_stake.stake();
            let stake_from_hex = signed_stake_from_hex.stake();

            // Verify stake UTXO
            assert_eq!(
                stake.utxo().txid(),
                stake_from_hex.utxo().txid(),
                "Stake {} UTXO txid mismatch in hex roundtrip",
                i
            );
            assert_eq!(
                stake.utxo().vout(),
                stake_from_hex.utxo().vout(),
                "Stake {} UTXO vout mismatch in hex roundtrip",
                i
            );

            // Verify stake amount and height
            assert_eq!(
                stake.amount(),
                stake_from_hex.amount(),
                "Stake {} amount mismatch in hex roundtrip",
                i
            );
            assert_eq!(
                stake.height(),
                stake_from_hex.height(),
                "Stake {} height mismatch in hex roundtrip",
                i
            );
            assert_eq!(
                stake.iscoinbase(),
                stake_from_hex.iscoinbase(),
                "Stake {} coinbase flag mismatch in hex roundtrip",
                i
            );

            // Verify stake public key
            assert_eq!(
                stake.pubkey(),
                stake_from_hex.pubkey(),
                "Stake {} pubkey mismatch in hex roundtrip",
                i
            );

            // Verify stake signature
            assert_eq!(
                signed_stake.signature(),
                signed_stake_from_hex.signature(),
                "Stake {} signature mismatch in hex roundtrip",
                i
            );

            // Verify stake ID computation
            assert_eq!(
                stake.stake_id(),
                stake_from_hex.stake_id(),
                "Stake {} stake_id mismatch in hex roundtrip",
                i
            );
        }

        // Test with proof 2 (three stakes) for hex roundtrip
        let proof2 = Proof::from_hex(TEST_PROOF2_HEX)
            .expect("Failed to deserialize proof 2");
        let hex2 = proof2.to_hex();
        let proof2_from_hex =
            Proof::from_hex(&hex2).expect("Failed to deserialize from hex");

        assert_eq!(proof2.sequence(), proof2_from_hex.sequence());
        assert_eq!(proof2.expiration_time(), proof2_from_hex.expiration_time());
        assert_eq!(proof2.master_pubkey(), proof2_from_hex.master_pubkey());
        assert_eq!(proof2.payout_script(), proof2_from_hex.payout_script());
        assert_eq!(
            proof2.signed_stakes().len(),
            proof2_from_hex.signed_stakes().len()
        );
        assert_eq!(
            proof2.signature().as_ref(),
            proof2_from_hex.signature().as_ref()
        );

        // Verify stake content for proof 2 hex roundtrip
        let stakes2 = proof2.signed_stakes();
        let stakes2_from_hex = proof2_from_hex.signed_stakes();
        assert_eq!(stakes2.len(), stakes2_from_hex.len());

        for (i, (signed_stake, signed_stake_from_hex)) in
            stakes2.iter().zip(stakes2_from_hex.iter()).enumerate()
        {
            let stake = signed_stake.stake();
            let stake_from_hex = signed_stake_from_hex.stake();

            // Verify stake UTXO
            assert_eq!(
                stake.utxo().txid(),
                stake_from_hex.utxo().txid(),
                "Stake {} UTXO txid mismatch in hex roundtrip",
                i
            );
            assert_eq!(
                stake.utxo().vout(),
                stake_from_hex.utxo().vout(),
                "Stake {} UTXO vout mismatch in hex roundtrip",
                i
            );

            // Verify stake amount and height
            assert_eq!(
                stake.amount(),
                stake_from_hex.amount(),
                "Stake {} amount mismatch in hex roundtrip",
                i
            );
            assert_eq!(
                stake.height(),
                stake_from_hex.height(),
                "Stake {} height mismatch in hex roundtrip",
                i
            );
            assert_eq!(
                stake.iscoinbase(),
                stake_from_hex.iscoinbase(),
                "Stake {} coinbase flag mismatch in hex roundtrip",
                i
            );

            // Verify stake public key
            assert_eq!(
                stake.pubkey(),
                stake_from_hex.pubkey(),
                "Stake {} pubkey mismatch in hex roundtrip",
                i
            );

            // Verify stake signature
            assert_eq!(
                signed_stake.signature(),
                signed_stake_from_hex.signature(),
                "Stake {} signature mismatch in hex roundtrip",
                i
            );

            // Verify stake ID computation
            assert_eq!(
                stake.stake_id(),
                stake_from_hex.stake_id(),
                "Stake {} stake_id mismatch in hex roundtrip",
                i
            );
        }
    }

    #[test]
    fn test_proof_validation_no_stakes() {
        // Create a proof with no stakes
        let public_key_bytes = hex::decode(
            "030b4c866585dd868a9d62348a9cd008d6a312937048fff31670e7e920cfc7a744"
        ).unwrap();
        let p2pkh_script =
            hex::decode("76a914000000000000000000000000000000000000000088ac")
                .unwrap();

        let proof = Proof::new(
            1,
            1788965717, // Future timestamp
            &public_key_bytes,
            &p2pkh_script,
            vec![],     // No stakes
            &[0u8; 64], // Dummy signature
        )
        .expect("Failed to create proof");

        let validation_result = proof.verify();
        assert!(validation_result.is_some());
        assert!(validation_result.unwrap().contains("No stakes provided"));
    }

    #[test]
    fn test_proof_validation_too_many_stakes() {
        // Create a proof with too many stakes (over MAX_PROOF_STAKES)
        // Known test private key and public key pair
        let secret_key_bytes = hex::decode(
            "12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f747",
        )
        .unwrap();
        let secret_key = SecretKey::from_slice(&secret_key_bytes).unwrap();
        let public_key_bytes = hex::decode(
            "030b4c866585dd868a9d62348a9cd008d6a312937048fff31670e7e920cfc7a744"
        ).unwrap();

        // Create many dummy stakes
        let mut signed_stakes = Vec::new();
        for i in 0..=MAX_PROOF_STAKES {
            let stake = Stake::new(
                TxId::from_array([i as u8; 32]),
                i as u32,
                10_000_000_001, // Above dust threshold
                100,            // height
                false,          // iscoinbase
                &public_key_bytes,
            )
            .unwrap();
            let commitment =
                StakeCommitment::new(1788965717, &public_key_bytes).unwrap();
            let signed_stake = SignedStake::create_signed(
                stake,
                secret_key.as_ref(),
                commitment,
            )
            .unwrap();
            signed_stakes.push(signed_stake);
        }

        let p2pkh_script =
            hex::decode("76a914000000000000000000000000000000000000000088ac")
                .unwrap();

        let proof = Proof::new(
            1,
            1788965717,
            &public_key_bytes,
            &p2pkh_script,
            signed_stakes,
            &[0u8; 64],
        )
        .expect("Failed to create proof");

        let validation_result = proof.verify();
        assert!(validation_result.is_some());
        assert!(validation_result.unwrap().contains("Too many stakes"));
    }

    #[test]
    fn test_proof_validation_non_standard_payout_script() {
        // Create a proof with non-standard payout script
        // Known test private key and public key pair
        let secret_key_bytes = hex::decode(
            "12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f747",
        )
        .unwrap();
        let secret_key = SecretKey::from_slice(&secret_key_bytes).unwrap();
        let public_key_bytes = hex::decode(
            "030b4c866585dd868a9d62348a9cd008d6a312937048fff31670e7e920cfc7a744"
        ).unwrap();

        let stake = Stake::new(
            TxId::from_array([1u8; 32]),
            0,
            10_000_000_001,
            100,
            false,
            &public_key_bytes,
        )
        .unwrap();
        let commitment =
            StakeCommitment::new(1788965717, &public_key_bytes).unwrap();
        let signed_stake =
            SignedStake::create_signed(stake, secret_key.as_ref(), commitment)
                .unwrap();

        let non_standard_script = hex::decode("000102").unwrap();

        let proof = Proof::new(
            1,
            1788965717,
            &public_key_bytes,
            &non_standard_script,
            vec![signed_stake],
            &[0u8; 64],
        )
        .expect("Failed to create proof");

        let validation_result = proof.verify();
        assert!(validation_result.is_some());
        assert!(validation_result
            .unwrap()
            .contains("Payout script is not standard"));
    }

    #[test]
    fn test_proof_validation_dust_threshold() {
        // Create a proof with stake below dust threshold
        let secp = Secp256k1::new();

        // Known test private key and public key pair
        let secret_key_bytes = hex::decode(
            "12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f747",
        )
        .unwrap();
        let secret_key = SecretKey::from_slice(&secret_key_bytes).unwrap();
        let public_key_bytes = hex::decode(
            "030b4c866585dd868a9d62348a9cd008d6a312937048fff31670e7e920cfc7a744"
        ).unwrap();

        let stake = Stake::new(
            TxId::from_array([1u8; 32]),
            0,
            1_000_000_000, // Below dust threshold (10B satoshis)
            100,
            false,
            &public_key_bytes,
        )
        .unwrap();
        let commitment =
            StakeCommitment::new(1788965717, &public_key_bytes).unwrap();
        let signed_stake =
            SignedStake::create_signed(stake, secret_key.as_ref(), commitment)
                .unwrap();

        let p2pkh_script =
            hex::decode("76a914000000000000000000000000000000000000000088ac")
                .unwrap();

        // Create a valid proof signature
        let script = Script::new(&p2pkh_script);
        let limited_proof_id = Proof::compute_limited_proof_id(
            1,
            1788965717,
            &vec![signed_stake.clone()],
            &script,
        );
        let hash_slice = limited_proof_id.as_ref();
        let mut hash_array = [0u8; 32];
        hash_array.copy_from_slice(hash_slice);
        let message = Message::from_digest(hash_array);
        let signature = secp.sign_schnorrabc_no_aux_rand(&message, &secret_key);
        let schnorr_sig = SchnorrSignature::new(signature.as_ref()).unwrap();

        let proof = Proof::new(
            1,
            1788965717,
            &public_key_bytes,
            &p2pkh_script,
            vec![signed_stake],
            &schnorr_sig.to_bytes(),
        )
        .expect("Failed to create proof");

        let validation_result = proof.verify();
        assert!(validation_result.is_some());
        assert!(validation_result.unwrap().contains(
            "Proof validation failed: Stake amount below dust threshold"
        ));
    }

    #[test]
    fn test_proof_validation_expired_proof() {
        // Create a proof with past expiration time
        let secp = Secp256k1::new();

        // Known test private key and public key pair
        let secret_key_bytes = hex::decode(
            "12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f747",
        )
        .unwrap();
        let secret_key = SecretKey::from_slice(&secret_key_bytes).unwrap();
        let public_key_bytes = hex::decode(
            "030b4c866585dd868a9d62348a9cd008d6a312937048fff31670e7e920cfc7a744"
        ).unwrap();

        let stake = Stake::new(
            TxId::from_array([1u8; 32]),
            0,
            10_000_000_001,
            100,
            false,
            &public_key_bytes,
        )
        .unwrap();
        let commitment = StakeCommitment::new(1, &public_key_bytes).unwrap();
        let signed_stake =
            SignedStake::create_signed(stake, secret_key.as_ref(), commitment)
                .unwrap();

        let p2pkh_script =
            hex::decode("76a914000000000000000000000000000000000000000088ac")
                .unwrap();
        let script = Script::new(&p2pkh_script);
        let limited_proof_id = Proof::compute_limited_proof_id(
            1,
            1, // Past timestamp
            &vec![signed_stake.clone()],
            &script,
        );
        let hash_slice = limited_proof_id.as_ref();
        let mut hash_array = [0u8; 32];
        hash_array.copy_from_slice(hash_slice);
        let message = Message::from_digest(hash_array);
        let signature = secp.sign_schnorrabc_no_aux_rand(&message, &secret_key);
        let schnorr_sig = SchnorrSignature::new(signature.as_ref()).unwrap();

        let proof = Proof::new(
            1,
            1, // Past timestamp
            &public_key_bytes,
            &p2pkh_script,
            vec![signed_stake],
            &schnorr_sig.to_bytes(),
        )
        .expect("Failed to create proof");

        let validation_result = proof.verify();
        assert!(validation_result.is_some());
        assert!(validation_result
            .unwrap()
            .contains("Proof validation failed: Proof has expired"));
    }

    #[test]
    fn test_proof_validation_duplicate_utxos() {
        // Create a proof with duplicate UTXOs
        let secp = Secp256k1::new();

        // Known test private key and public key pair
        let secret_key_bytes = hex::decode(
            "12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f747",
        )
        .unwrap();
        let secret_key = SecretKey::from_slice(&secret_key_bytes).unwrap();
        let public_key_bytes = hex::decode(
            "030b4c866585dd868a9d62348a9cd008d6a312937048fff31670e7e920cfc7a744"
        ).unwrap();

        let txid = TxId::from_array([1u8; 32]);
        let stake1 = Stake::new(
            txid.clone(),
            0,
            10_000_000_001,
            100,
            false,
            &public_key_bytes,
        )
        .unwrap();
        let stake2 =
            Stake::new(txid, 0, 10_000_000_001, 100, false, &public_key_bytes)
                .unwrap(); // Same UTXO

        let commitment =
            StakeCommitment::new(1788965717, &public_key_bytes).unwrap();
        let signed_stake1 = SignedStake::create_signed(
            stake1,
            secret_key.as_ref(),
            commitment.clone(),
        )
        .unwrap();
        let signed_stake2 =
            SignedStake::create_signed(stake2, secret_key.as_ref(), commitment)
                .unwrap();

        let p2pkh_script =
            hex::decode("76a914000000000000000000000000000000000000000088ac")
                .unwrap();

        // Create a valid proof signature
        let script = Script::new(&p2pkh_script);
        let limited_proof_id = Proof::compute_limited_proof_id(
            1,
            1788965717,
            &vec![signed_stake1.clone(), signed_stake2.clone()],
            &script,
        );
        let hash_slice = limited_proof_id.as_ref();
        let mut hash_array = [0u8; 32];
        hash_array.copy_from_slice(hash_slice);
        let message = Message::from_digest(hash_array);
        let signature = secp.sign_schnorrabc_no_aux_rand(&message, &secret_key);
        let schnorr_sig = SchnorrSignature::new(signature.as_ref()).unwrap();

        let proof = Proof::new(
            1,
            1788965717,
            &public_key_bytes,
            &p2pkh_script,
            vec![signed_stake1, signed_stake2],
            &schnorr_sig.to_bytes(),
        )
        .expect("Failed to create proof");

        let validation_result = proof.verify();
        assert!(validation_result.is_some());
        assert!(validation_result
            .unwrap()
            .contains("Proof validation failed: Duplicate stake UTXO found"));
    }

    #[test]
    fn test_proof_validation_wrong_stake_ordering() {
        // Create a proof with stakes in wrong order
        let secp = Secp256k1::new();

        // Known test private key and public key pair
        let secret_key_bytes = hex::decode(
            "12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f747",
        )
        .unwrap();
        let secret_key = SecretKey::from_slice(&secret_key_bytes).unwrap();
        let public_key_bytes = hex::decode(
            "030b4c866585dd868a9d62348a9cd008d6a312937048fff31670e7e920cfc7a744"
        ).unwrap();

        // Create stakes with different UTXOs (different stake IDs)
        let stake1 = Stake::new(
            TxId::from_array([2u8; 32]), // Higher stake ID (wrong order)
            0,
            10_000_000_001,
            100,
            false,
            &public_key_bytes,
        )
        .unwrap();
        let stake2 = Stake::new(
            TxId::from_array([1u8; 32]), // Lower stake ID
            0,
            10_000_000_001,
            100,
            false,
            &public_key_bytes,
        )
        .unwrap();

        let commitment =
            StakeCommitment::new(1788965717, &public_key_bytes).unwrap();
        let signed_stake1 = SignedStake::create_signed(
            stake1,
            secret_key.as_ref(),
            commitment.clone(),
        )
        .unwrap();
        let signed_stake2 =
            SignedStake::create_signed(stake2, secret_key.as_ref(), commitment)
                .unwrap();

        let p2pkh_script =
            hex::decode("76a914000000000000000000000000000000000000000088ac")
                .unwrap();
        let script = Script::new(&p2pkh_script);
        let limited_proof_id = Proof::compute_limited_proof_id(
            1,
            1788965717,
            &vec![signed_stake1.clone(), signed_stake2.clone()],
            &script,
        );
        let hash_slice = limited_proof_id.as_ref();
        let mut hash_array = [0u8; 32];
        hash_array.copy_from_slice(hash_slice);
        let message = Message::from_digest(hash_array);
        let signature = secp.sign_schnorrabc_no_aux_rand(&message, &secret_key);
        let schnorr_sig = SchnorrSignature::new(signature.as_ref()).unwrap();

        let proof = Proof::new(
            1,
            1788965717,
            &public_key_bytes,
            &p2pkh_script,
            vec![signed_stake1, signed_stake2], // Wrong order
            &schnorr_sig.to_bytes(),
        )
        .expect("Failed to create proof");

        let validation_result = proof.verify();
        assert!(validation_result.is_some());
        assert!(validation_result.unwrap().contains(
            "Proof validation failed: Stakes are not ordered by stake ID"
        ));
    }

    #[test]
    fn test_proof_validation_invalid_signature() {
        // Create a proof with invalid signature
        // Known test private key and public key pair
        let secret_key_bytes = hex::decode(
            "12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f747",
        )
        .unwrap();
        let secret_key = SecretKey::from_slice(&secret_key_bytes).unwrap();
        let public_key_bytes = hex::decode(
            "030b4c866585dd868a9d62348a9cd008d6a312937048fff31670e7e920cfc7a744"
        ).unwrap();

        let stake = Stake::new(
            TxId::from_array([1u8; 32]),
            0,
            10_000_000_001,
            100,
            false,
            &public_key_bytes,
        )
        .unwrap();
        let commitment =
            StakeCommitment::new(1788965717, &public_key_bytes).unwrap();
        let signed_stake =
            SignedStake::create_signed(stake, secret_key.as_ref(), commitment)
                .unwrap();

        let p2pkh_script =
            hex::decode("76a914000000000000000000000000000000000000000088ac")
                .unwrap();

        let proof = Proof::new(
            1,
            1788965717,
            &public_key_bytes,
            &p2pkh_script,
            vec![signed_stake],
            &[0u8; 64], // Invalid signature
        )
        .expect("Failed to create proof");

        let validation_result = proof.verify();
        assert!(validation_result.is_some());
        assert!(validation_result
            .unwrap()
            .contains("Proof validation failed: Invalid proof signature"));
    }

    #[test]
    fn test_proof_validation_valid_proof() {
        // Create a valid proof that should pass validation
        let secp = Secp256k1::new();

        // Known test private key and public key pair
        let secret_key_bytes = hex::decode(
            "12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f747",
        )
        .unwrap();
        let secret_key = SecretKey::from_slice(&secret_key_bytes).unwrap();
        let public_key_bytes = hex::decode(
            "030b4c866585dd868a9d62348a9cd008d6a312937048fff31670e7e920cfc7a744"
        ).unwrap();

        let stake = Stake::new(
            TxId::from_array([1u8; 32]),
            0,
            10_000_000_001, // Above dust threshold
            100,
            false,
            &public_key_bytes,
        )
        .unwrap();
        let commitment =
            StakeCommitment::new(2051222400, &public_key_bytes).unwrap();
        let signed_stake =
            SignedStake::create_signed(stake, secret_key.as_ref(), commitment)
                .unwrap();

        let p2pkh_script =
            hex::decode("76a914000000000000000000000000000000000000000088ac")
                .unwrap();

        // Create a valid signature for the proof
        let limited_proof_id = Proof::compute_limited_proof_id(
            1,
            2051222400,
            &[signed_stake.clone()],
            &Script::new(&p2pkh_script),
        );

        let mut hash_array = [0u8; 32];
        hash_array.copy_from_slice(limited_proof_id.as_ref());
        let message = Message::from_digest(hash_array);
        let signature = secp.sign_schnorrabc_no_aux_rand(&message, &secret_key);
        let schnorr_sig = SchnorrSignature::new(signature.as_ref()).unwrap();

        let proof = Proof::new(
            1,
            2051222400,
            &public_key_bytes,
            &p2pkh_script,
            vec![signed_stake],
            schnorr_sig.as_ref(),
        )
        .expect("Failed to create proof");

        let validation_result = proof.verify();
        assert!(
            validation_result.is_none(),
            "Valid proof should pass validation, but got: {:?}",
            validation_result
        );
    }

    #[test]
    fn test_proof_id_computation() {
        // Test that proof ID computation is consistent and matches expected
        // values
        let proof1 = Proof::from_hex(TEST_PROOF1_HEX)
            .expect("Failed to deserialize proof 1");
        let proof2 = Proof::from_hex(TEST_PROOF2_HEX)
            .expect("Failed to deserialize proof 2");

        // Expected proof IDs (computed from actual proof data)
        let expected_proof_id1 =
            "74c91491e5d6730ea1701817ed6c34e9627904fc3117647cc7d4bce73f56e45a";
        let expected_proof_id2 =
            "95c9673bc14f3c36e9310297e8df81867b42dd1a7bb7944aeb6c1797fbd2a6d5";

        // Verify that proof IDs are consistent across multiple calls
        let proof_id1_first = proof1.proof_id();
        let proof_id1_second = proof1.proof_id();
        assert_eq!(proof_id1_first, proof_id1_second);

        let proof_id2_first = proof2.proof_id();
        let proof_id2_second = proof2.proof_id();
        assert_eq!(proof_id2_first, proof_id2_second);

        // Verify that computed proof IDs match expected values
        assert_eq!(
            proof_id1_first.to_hex_le(),
            expected_proof_id1,
            "Proof 1 ID does not match expected value"
        );
        assert_eq!(
            proof_id2_first.to_hex_le(),
            expected_proof_id2,
            "Proof 2 ID does not match expected value"
        );

        // Verify that different proofs have different IDs
        assert_ne!(proof_id1_first, proof_id2_first);
    }

    #[test]
    fn test_limited_proof_id_computation() {
        // Test that limited proof ID computation is consistent and matches
        // expected values
        let proof1 = Proof::from_hex(TEST_PROOF1_HEX)
            .expect("Failed to deserialize proof 1");
        let proof2 = Proof::from_hex(TEST_PROOF2_HEX)
            .expect("Failed to deserialize proof 2");

        // Expected limited proof IDs from test_vectors.rs
        let expected_limited_id1 =
            "e5845c13b93a1c207bd72033c185a2f833eef1748ee62fd49161119ac2c22864";
        let expected_limited_id2 =
            "7223b8cc572bdf8f123ee7dd0316962f0367b0be8bce9b6e9465d1f413d95616";

        // Verify that limited proof IDs are consistent across multiple calls
        let limited_id1_first = proof1.limited_proof_id();
        let limited_id1_second = proof1.limited_proof_id();
        assert_eq!(limited_id1_first, limited_id1_second);

        let limited_id2_first = proof2.limited_proof_id();
        let limited_id2_second = proof2.limited_proof_id();
        assert_eq!(limited_id2_first, limited_id2_second);

        // Verify that computed limited proof IDs match expected values
        assert_eq!(
            limited_id1_first.to_hex_le(),
            expected_limited_id1,
            "Limited proof 1 ID does not match expected value"
        );
        assert_eq!(
            limited_id2_first.to_hex_le(),
            expected_limited_id2,
            "Limited proof 2 ID does not match expected value"
        );

        // Verify that different proofs have different limited IDs
        assert_ne!(limited_id1_first, limited_id2_first);
    }
}
