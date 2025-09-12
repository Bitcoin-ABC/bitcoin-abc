// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

use super::serdes::{
    deserialize_pubkey_from_hex, deserialize_signature_from_base64,
    serialize_pubkey_as_hex, serialize_signature_as_base64,
};
use super::stake::StakeJson;

// Wrapper type for self-describing JSON format
#[derive(Debug, Serialize, Deserialize)]
pub struct WrappedProof {
    pub proof: ProofJson,
}

// Proof for both signing workflow and proof creation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProofJson {
    pub sequence: u64,
    pub expiration: u64,
    #[serde(
        serialize_with = "serialize_pubkey_as_hex",
        deserialize_with = "deserialize_pubkey_from_hex"
    )]
    pub master: Vec<u8>,
    pub payoutscript: String,
    // IMPORTANT: Proofs contain SIGNED stakes, not unsigned ones
    // Each stake must be signed individually before being included in a proof
    pub stakes: Vec<StakeJson>,
    #[serde(
        default, // Make signature optional for deserialization
        skip_serializing_if = "Vec::is_empty",
        serialize_with = "serialize_signature_as_base64",
        deserialize_with = "deserialize_signature_from_base64"
    )]
    pub signature: Vec<u8>, // Optional signature
}

/// Convert JSON proof to WASM Proof object
pub fn json_to_proof(
    json_content: &str,
) -> Result<avalanche_lib_wasm::proof::Proof> {
    let wrapped: WrappedProof = serde_json::from_str(json_content)
        .with_context(|| "Failed to parse proof JSON")?;

    let proof_config = wrapped.proof;

    // Convert signed stakes
    let mut signed_stakes = Vec::new();
    for stake_config in proof_config.stakes {
        let signed_stake = super::stake::json_to_signed_stake(&stake_config)?;
        signed_stakes.push(signed_stake);
    }

    // Convert other components
    let master_pubkey = &proof_config.master;
    let payout_script = hex::decode(&proof_config.payoutscript)
        .with_context(|| "Invalid payoutscript hex")?;

    // Reject unsigned proofs - decode command only works with signed objects
    if proof_config.signature.is_empty() {
        anyhow::bail!(
            "Cannot decode unsigned proof. The command only works with signed \
             objects."
        );
    }

    let signature = proof_config.signature;

    // Use the new method
    let result = avalanche_lib_wasm::proof::Proof::new(
        proof_config.sequence,
        proof_config.expiration as i64,
        &master_pubkey,
        &payout_script,
        signed_stakes,
        &signature,
    );

    result.map_err(|e| {
        anyhow::anyhow!("Failed to create proof from components: {}", e)
    })
}

/// Convert WASM Proof to JSON
pub fn proof_to_json(
    proof: &avalanche_lib_wasm::proof::Proof,
) -> Result<String> {
    let decoded = ProofJson {
        sequence: proof.sequence(),
        expiration: proof.expiration_time() as u64,
        master: proof.master_pubkey(),
        payoutscript: hex::encode(proof.payout_script().to_bytes()),
        stakes: proof
            .signed_stakes()
            .into_iter()
            .map(|stake| {
                let stake_data = stake.stake();
                StakeJson {
                    txid: stake_data.utxo().txid().to_bytes(),
                    vout: stake_data.utxo().vout(),
                    amount: stake_data.amount(),
                    height: stake_data.height(),
                    iscoinbase: stake_data.iscoinbase(),
                    pubkey: stake_data.pubkey(),
                    signature: stake.signature().to_vec(),
                }
            })
            .collect(),
        signature: proof.signature().as_ref().to_vec(),
    };

    let wrapped = WrappedProof { proof: decoded };

    serde_json::to_string_pretty(&wrapped)
        .with_context(|| "Failed to serialize proof to JSON")
}
