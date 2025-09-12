// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::path::PathBuf;

use anyhow::Result;
use avalanche_lib_wasm::{
    delegation::Delegation, proof::Proof, stake::SignedStake,
};

use crate::io::{process_input_and_detect_type, write_output};
use crate::json::delegation::{delegation_to_json, json_to_delegation};
use crate::json::proof::{json_to_proof, proof_to_json};
use crate::json::stake::{json_to_signed_stakes, signed_stakes_to_json};

pub fn decode_command(
    object_type: Option<String>,
    input: Option<String>,
    input_file: Option<PathBuf>,
    output: Option<PathBuf>,
    format: String,
) -> Result<()> {
    // Process input and detect type
    let (input_content, detected_type, is_hex_input) =
        process_input_and_detect_type(input, input_file, object_type)?;

    // Use unified WASM object decoding
    let output_content =
        decode_unified(&detected_type, &input_content, &format, is_hex_input)?;

    write_output(&output_content, output)?;
    Ok(())
}

fn decode_unified(
    object_type: &str,
    input_content: &str,
    output_format: &str,
    is_hex_input: bool,
) -> Result<String> {
    // Step 1: Always decode to WASM types first, regardless of input format
    let (wasm_proof, wasm_stakes, wasm_delegation) = match object_type
        .to_lowercase()
        .as_str()
    {
        "proof" => {
            let proof = if is_hex_input {
                Proof::from_hex(input_content.trim()).map_err(|e| {
                    anyhow::anyhow!("Failed to parse proof from hex: {}", e)
                })?
            } else {
                json_to_proof(input_content).map_err(|e| {
                    anyhow::anyhow!("Failed to parse proof from JSON: {}", e)
                })?
            };
            (Some(proof), None, None)
        }
        "stakes" => {
            let stakes = if is_hex_input {
                let mut stakes_vec = Vec::new();
                for line in input_content.lines() {
                    let line = line.trim();
                    if line.is_empty() {
                        continue;
                    }
                    let signed_stake =
                        SignedStake::from_hex(line).map_err(|e| {
                            anyhow::anyhow!(
                                "Failed to parse signed stake: {}",
                                e
                            )
                        })?;
                    stakes_vec.push(signed_stake);
                }
                stakes_vec
            } else {
                json_to_signed_stakes(input_content).map_err(|e| {
                    anyhow::anyhow!("Failed to parse stakes from JSON: {}", e)
                })?
            };
            (None, Some(stakes), None)
        }
        "delegation" => {
            let delegation = if is_hex_input {
                Delegation::from_hex(input_content.trim()).map_err(|e| {
                    anyhow::anyhow!(
                        "Failed to parse delegation from hex: {}",
                        e
                    )
                })?
            } else {
                json_to_delegation(input_content).map_err(|e| {
                    anyhow::anyhow!(
                        "Failed to parse delegation from JSON: {}",
                        e
                    )
                })?
            };
            (None, None, Some(delegation))
        }
        _ => anyhow::bail!(
            "Invalid object type: {}. Must be 'proof', 'stakes', or \
             'delegation'",
            object_type
        ),
    };

    // Step 2: Serialize to the requested output format(s)
    let mut hex_result = String::new();
    let mut json_result = String::new();

    if output_format == "hex" || output_format == "both" {
        hex_result = if let Some(ref proof) = wasm_proof {
            proof.to_hex()
        } else if let Some(ref stakes) = wasm_stakes {
            let hex_lines: Vec<String> =
                stakes.iter().map(|stake| stake.to_hex()).collect();
            hex_lines.join("\n")
        } else if let Some(ref delegation) = wasm_delegation {
            delegation.to_hex()
        } else {
            unreachable!()
        };
    }

    if output_format == "json" || output_format == "both" {
        json_result = if let Some(ref proof) = wasm_proof {
            proof_to_json(proof)?
        } else if let Some(ref stakes) = wasm_stakes {
            signed_stakes_to_json(stakes)?
        } else if let Some(ref delegation) = wasm_delegation {
            delegation_to_json(delegation)?
        } else {
            unreachable!()
        };
    }

    // Return the appropriate result based on format
    match output_format {
        "hex" => Ok(hex_result),
        "json" => Ok(json_result),
        "both" => Ok(format!("Hex:\n{}\n\nJSON:\n{}", hex_result, json_result)),
        _ => anyhow::bail!(
            "Invalid output format: {}. Must be 'hex', 'json', or 'both'",
            output_format
        ),
    }
}
