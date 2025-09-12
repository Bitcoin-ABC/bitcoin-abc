// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

use super::serdes::{
    deserialize_pubkey_from_hex, deserialize_signature_from_base64,
    deserialize_uint256_from_le_hex, serialize_pubkey_as_hex,
    serialize_signature_as_base64, serialize_uint256_to_le_hex,
};

// Wrapper type for self-describing JSON format
#[derive(Debug, Serialize, Deserialize)]
pub struct WrappedDelegation {
    pub delegation: DelegationJson,
}

// Mixed delegation level that can be either signed or unsigned
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DelegationLevelJson {
    #[serde(
        serialize_with = "serialize_pubkey_as_hex",
        deserialize_with = "deserialize_pubkey_from_hex"
    )]
    pub pubkey: Vec<u8>,
    #[serde(
        serialize_with = "serialize_signature_as_base64",
        deserialize_with = "deserialize_signature_from_base64",
        skip_serializing_if = "Vec::is_empty",
        default
    )]
    // Empty for unsigned levels, populated for signed levels
    pub signature: Vec<u8>,
}

// Delegation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DelegationJson {
    #[serde(
        serialize_with = "serialize_uint256_to_le_hex",
        deserialize_with = "deserialize_uint256_from_le_hex"
    )]
    pub limitedid: Vec<u8>,
    #[serde(
        serialize_with = "serialize_pubkey_as_hex",
        deserialize_with = "deserialize_pubkey_from_hex"
    )]
    pub master: Vec<u8>,
    pub levels: Vec<DelegationLevelJson>,
}

/// Convert JSON delegation to WASM Delegation object
pub fn json_to_delegation(
    json_content: &str,
) -> Result<avalanche_lib_wasm::delegation::Delegation> {
    let wrapped: WrappedDelegation = serde_json::from_str(json_content)
        .with_context(|| "Failed to parse delegation JSON")?;

    let delegation_config = wrapped.delegation;

    // Parse limitedid
    let limited_proof_id =
        avalanche_lib_wasm::hash::Hash256::new(&delegation_config.limitedid)
            .map_err(|e| anyhow::anyhow!("Invalid limited proof ID: {}", e))?;

    // Parse master (it's now Vec<u8> in DelegationJson, so we can use it
    // directly)
    let proof_master_bytes = &delegation_config.master;

    // Convert delegation levels
    let mut levels = Vec::new();
    for level_config in delegation_config.levels {
        let pubkey_bytes = &level_config.pubkey;
        let signature_bytes = &level_config.signature;

        // Reject unsigned delegation levels - decode command only works with
        // signed objects
        if signature_bytes.is_empty() {
            anyhow::bail!(
                "Cannot decode unsigned delegation. The command only works \
                 with signed objects."
            );
        }

        let level = avalanche_lib_wasm::delegation::DelegationLevel::new(
            pubkey_bytes,
            signature_bytes,
        )
        .map_err(|e| {
            anyhow::anyhow!("Failed to create delegation level: {}", e)
        })?;

        levels.push(level);
    }

    // Create delegation using the main constructor
    avalanche_lib_wasm::delegation::Delegation::new(
        &limited_proof_id,
        &proof_master_bytes,
        levels,
    )
    .map_err(|e| anyhow::anyhow!("Failed to create delegation: {}", e))
}

/// Convert WASM Delegation to JSON
pub fn delegation_to_json(
    delegation: &avalanche_lib_wasm::delegation::Delegation,
) -> Result<String> {
    let decoded = DelegationJson {
        limitedid: delegation.limited_proof_id().to_bytes(),
        master: delegation.proof_master().serialize().to_vec(),
        levels: delegation
            .levels()
            .into_iter()
            .map(|level| DelegationLevelJson {
                pubkey: level.pubkey_bytes(),
                signature: level.signature().as_ref().to_vec(),
            })
            .collect(),
    };

    let wrapped = WrappedDelegation {
        delegation: decoded,
    };

    serde_json::to_string_pretty(&wrapped)
        .with_context(|| "Failed to serialize delegation to JSON")
}

/// Create a delegation JSON from a proof
pub fn delegate_from_proof(
    proof: &avalanche_lib_wasm::proof::Proof,
    delegated_pubkey_hex: &str,
) -> Result<DelegationJson> {
    // For a proof, we create a single level without signature (unsigned)
    let unsigned_delegation = DelegationJson {
        limitedid: proof.limited_proof_id().to_bytes(),
        master: proof.master_pubkey(),
        levels: vec![DelegationLevelJson {
            pubkey: hex::decode(&delegated_pubkey_hex).unwrap_or_default(),
            signature: Vec::new(), // Empty signature for unsigned level
        }],
    };

    Ok(unsigned_delegation)
}

/// Create a delegation JSON from an existing delegation
pub fn delegate_from_delegation(
    delegation: &avalanche_lib_wasm::delegation::Delegation,
    delegated_pubkey_hex: &str,
) -> Result<DelegationJson> {
    // Validate that the delegation is signed (all levels must have signatures)
    for (i, level) in delegation.delegation_levels().iter().enumerate() {
        let sig_bytes = level.signature().to_bytes();
        if sig_bytes.iter().all(|&b| b == 0) {
            anyhow::bail!(
                "Delegation level {} is missing a signature. The delegate \
                 command only accepts signed delegations.",
                i
            );
        }
    }

    // Verify the delegation signatures are valid
    if let Some(error) = delegation.verify() {
        anyhow::bail!(
            "Delegation signature verification failed: {}. The delegate \
             command only accepts valid signed delegations.",
            error
        );
    }

    // Create an unsigned delegation that extends the existing delegation
    let mut levels = Vec::new();

    // Add all existing levels WITH their signatures (they are signed)
    for level in delegation.delegation_levels() {
        levels.push(DelegationLevelJson {
            pubkey: level.pubkey_bytes(),
            signature: level.signature().to_bytes().to_vec(),
        });
    }

    // Add the new level WITHOUT signature (it's unsigned)
    levels.push(DelegationLevelJson {
        pubkey: hex::decode(&delegated_pubkey_hex).unwrap_or_default(),
        signature: Vec::new(), // Empty signature for unsigned level
    });

    let unsigned_delegation = DelegationJson {
        limitedid: delegation.limited_proof_id().to_bytes(),
        master: delegation.proof_master().serialize().to_vec(),
        levels,
    };

    Ok(unsigned_delegation)
}
