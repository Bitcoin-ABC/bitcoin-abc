// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::path::PathBuf;

use anyhow::Result;
use avalanche_lib_wasm::{
    delegation::Delegation, proof::Proof, stake::SignedStake,
};

use crate::io::{process_input_and_detect_type, write_output};
use crate::json::delegation::json_to_delegation;
use crate::json::proof::json_to_proof;
use crate::json::stake::json_to_signed_stakes;

/// Helper function to convert uint256 bytes to little endian hex string for
/// JSON (Bitcoin standard display)
fn uint256_to_le_hex(bytes: &[u8]) -> String {
    let mut reversed = bytes.to_vec();
    reversed.reverse();
    hex::encode(reversed)
}

pub fn getid_command(
    object_type: Option<String>,
    input: Option<String>,
    input_file: Option<PathBuf>,
    output: Option<PathBuf>,
) -> Result<()> {
    // Process input and detect type
    let (input_content, detected_type, _is_hex_input) =
        process_input_and_detect_type(input, input_file, object_type)?;

    // Use unified WASM object ID extraction
    let ids_json =
        getid_unified(&detected_type, &input_content, _is_hex_input)?;

    // Output the IDs
    let output_json = serde_json::to_string_pretty(&ids_json)?;
    write_output(&output_json, output)?;

    Ok(())
}

/// Unified ID extraction using WASM objects
fn getid_unified(
    object_type: &str,
    input_content: &str,
    is_hex_input: bool,
) -> Result<serde_json::Value> {
    match (object_type.to_lowercase().as_str(), is_hex_input) {
        ("proof", false) => match json_to_proof(input_content) {
            Ok(proof) => Ok(serde_json::json!({
                "proof_id": uint256_to_le_hex(&proof.proof_id().to_bytes()),
                "limitedid": uint256_to_le_hex(
                    &proof.limited_proof_id().to_bytes()
                )
            })),
            Err(e) => {
                anyhow::bail!(
                    "Getting IDs from JSON proof configs failed: {}. This may \
                     be due to avalanche-lib-wasm API limitations for signed \
                     proofs.",
                    e
                );
            }
        },
        ("proof", true) => {
            let proof = Proof::from_hex(input_content.trim())
                .map_err(|e| anyhow::anyhow!("Failed to parse proof: {}", e))?;

            Ok(serde_json::json!({
                "proof_id": uint256_to_le_hex(&proof.proof_id().to_bytes()),
                "limitedid": uint256_to_le_hex(
                    &proof.limited_proof_id().to_bytes()
                )
            }))
        }
        ("stakes", false) => match json_to_signed_stakes(input_content) {
            Ok(stakes) => {
                let stake_ids: Vec<String> = stakes
                    .iter()
                    .map(|stake| {
                        uint256_to_le_hex(&stake.stake().stake_id().to_bytes())
                    })
                    .collect();

                if stake_ids.len() == 1 {
                    Ok(serde_json::json!({
                        "stake_id": stake_ids[0]
                    }))
                } else {
                    Ok(serde_json::json!({ "stake_ids": stake_ids }))
                }
            }
            Err(e) => {
                anyhow::bail!("Failed to get IDs from JSON stakes: {}", e);
            }
        },
        ("stakes", true) => {
            // Handle multiple hex lines
            let mut stake_ids = Vec::new();

            for line in input_content.lines() {
                let line = line.trim();
                if line.is_empty() {
                    continue;
                }

                let signed_stake =
                    SignedStake::from_hex(line).map_err(|e| {
                        anyhow::anyhow!("Failed to parse signed stake: {}", e)
                    })?;

                stake_ids.push(uint256_to_le_hex(
                    &signed_stake.stake().stake_id().to_bytes(),
                ));
            }

            if stake_ids.len() == 1 {
                Ok(serde_json::json!({
                    "stake_id": stake_ids[0]
                }))
            } else {
                Ok(serde_json::json!({ "stake_ids": stake_ids }))
            }
        }
        ("delegation", false) => match json_to_delegation(input_content) {
            Ok(delegation) => Ok(serde_json::json!({
                "delegation_id": uint256_to_le_hex(
                    &delegation.delegation_id().to_bytes()
                )
            })),
            Err(e) => {
                anyhow::bail!(
                    "Getting IDs from JSON delegation configs failed: {}. \
                     This may be due to avalanche-lib-wasm API limitations.",
                    e
                );
            }
        },
        ("delegation", true) => {
            let delegation = Delegation::from_hex(input_content.trim())
                .map_err(|e| {
                    anyhow::anyhow!("Failed to parse delegation: {}", e)
                })?;

            Ok(serde_json::json!({
                "delegation_id": uint256_to_le_hex(
                    &delegation.delegation_id().to_bytes()
                )
            }))
        }
        _ => {
            anyhow::bail!(
                "Invalid object type: {}. Must be 'proof', 'stakes', or \
                 'delegation'",
                object_type
            );
        }
    }
}
