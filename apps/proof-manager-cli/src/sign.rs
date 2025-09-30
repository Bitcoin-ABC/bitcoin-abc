// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::fs;
use std::io::{self, Write};
use std::path::PathBuf;

use anyhow::{Context, Result};
use avalanche_lib_wasm::{
    delegation::{Delegation, DelegationLevel},
    delegationbuilder::DelegationBuilder,
    outpoint::TxId,
    proof::LimitedProofId,
    proofbuilder::ProofBuilder,
    schnorrsignature::SchnorrSignature,
    stake::{SignedStake, Stake, StakeCommitment},
};

use crate::io::process_input_and_detect_type;
use crate::json::delegation::{delegation_to_json, WrappedDelegation};
use crate::json::proof::{proof_to_json, WrappedProof};
use crate::json::stake::{signed_stakes_to_json, StakeJson, WrappedStakes};
use crate::privacy::attempt_history_cleanup;
use crate::wif::decode_private_key;
use crate::write_output;

#[allow(clippy::too_many_arguments)]
pub fn sign_command(
    object_type: Option<String>,
    input: Option<String>,
    input_file: Option<PathBuf>,
    output: Option<PathBuf>,
    format: String,
    commitment: Option<String>,
    private_key: Option<String>,
    no_history_cleanup: bool,
) -> Result<()> {
    // Process input and detect type (JSON only)
    let (config_content, detected_type, _is_hex_input) =
        process_input_and_detect_type(input, input_file, object_type)?;

    // Get private key from command line or prompt securely via stdin
    let private_key_provided_via_cli = private_key.is_some();
    let private_key_hex = match private_key {
        Some(key) => key,
        None => {
            eprint!("Enter private key (hex or WIF): ");
            io::stderr().flush()?;
            let mut private_key_input = String::new();
            io::stdin().read_line(&mut private_key_input)?;
            private_key_input.trim().to_string()
        }
    };

    let private_key_bytes = decode_private_key(&private_key_hex)
        .with_context(|| "Invalid private key format (hex or WIF)")?;

    // Step 1: Sign the object and get the WASM object
    let (wasm_proof, wasm_stakes, wasm_delegation): (
        Option<avalanche_lib_wasm::proof::Proof>,
        Option<Vec<SignedStake>>,
        Option<avalanche_lib_wasm::delegation::Delegation>,
    ) = match detected_type.to_lowercase().as_str() {
        "proof" => {
            // Parse proof json (signature is optional)
            let wrapped: WrappedProof = serde_json::from_str(&config_content)
                .with_context(|| {
                "Failed to parse proof json. Expected format: {\"proof\": \
                 {...}} with all stakes already signed"
            })?;

            let unsigned_proof = wrapped.proof;

            // Parse payout script
            let payout_script_bytes = hex::decode(&unsigned_proof.payoutscript)
                .with_context(|| "Invalid payout script hex")?;

            // Create ProofBuilder with the master pubkey from the unsigned
            // proof
            let mut proof_builder = ProofBuilder::new_with_master_pubkey(
                unsigned_proof.sequence,
                unsigned_proof.expiration as i64,
                &private_key_bytes,
                &unsigned_proof.master,
                &payout_script_bytes,
            )
            .map_err(|e| {
                anyhow::anyhow!("Failed to create proof builder: {}", e)
            })?;

            // Add signed stakes to the proof builder (preserve existing
            // signatures)
            for stake_config in &unsigned_proof.stakes {
                // Parse stake data
                let txid_bytes = stake_config.txid.clone();
                let txid = TxId::new(&txid_bytes).map_err(|e| {
                    anyhow::anyhow!("Invalid txid for stake: {}", e)
                })?;

                let pubkey_bytes = &stake_config.pubkey;
                let signature_bytes = &stake_config.signature;

                // Create stake with format preservation
                let stake = Stake::new(
                    txid,
                    stake_config.vout,
                    stake_config.amount,
                    stake_config.height,
                    stake_config.iscoinbase,
                    pubkey_bytes,
                )
                .map_err(|e| {
                    anyhow::anyhow!(
                        "Failed to create stake {}: {}",
                        hex::encode(&stake_config.txid),
                        e
                    )
                })?;

                // Create signed stake with existing signature
                let signature = SchnorrSignature::new(signature_bytes)
                    .map_err(|e| {
                        anyhow::anyhow!(
                            "Invalid signature for stake {}: {}",
                            hex::encode(&stake_config.txid),
                            e
                        )
                    })?;

                let signed_stake = SignedStake::new(stake, signature);

                // Add signed stake to builder (without re-signing)
                proof_builder.add_signed_stake(signed_stake).map_err(|e| {
                    anyhow::anyhow!(
                        "Failed to add signed stake {}: {}",
                        hex::encode(&stake_config.txid),
                        e
                    )
                })?;
            }

            // Build the proof (this will sign it automatically)
            let proof = proof_builder
                .build()
                .map_err(|e| anyhow::anyhow!("Failed to build proof: {}", e))?;

            // Return the signed proof WASM object
            (Some(proof), None, None)
        }
        "stakes" => {
            let wrapped: WrappedStakes = serde_json::from_str(&config_content)
                .with_context(|| {
                    "Failed to parse stakes json. Expected format: \
                     {\"stakes\": [...]}"
                })?;
            let stakes = wrapped.stakes;

            // For stakes signing, we need the commitment parameter (proof JSON)
            let commitment_json = commitment.ok_or_else(|| {
                anyhow::anyhow!(
                    "Commitment parameter is required for stakes signing. Use \
                     --commitment <proof_json_file_path> or provide proof \
                     JSON directly"
                )
            })?;

            // Parse commitment as proof JSON (either file path or direct JSON)
            let proof_json_content = if commitment_json.starts_with('{') {
                // Direct JSON string
                commitment_json
            } else {
                // File path
                fs::read_to_string(&commitment_json).with_context(|| {
                    format!(
                        "Failed to read commitment proof file: {}",
                        commitment_json
                    )
                })?
            };

            // Parse the proof JSON to extract expiration and master_pubkey
            let wrapped_proof: WrappedProof = serde_json::from_str(
                &proof_json_content,
            )
            .with_context(|| {
                "Failed to parse commitment proof JSON. Expected format: \
                 {\"proof\": {...}}"
            })?;

            let expiration_time = wrapped_proof.proof.expiration as i64;
            let master_pubkey_bytes = &wrapped_proof.proof.master;

            let commitment =
                StakeCommitment::new(expiration_time, master_pubkey_bytes)
                    .map_err(|e| {
                        anyhow::anyhow!("Failed to create commitment: {}", e)
                    })?;

            // Decode private key once for all stakes
            let private_key_bytes = decode_private_key(&private_key_hex)
                .with_context(|| "Invalid private key format (hex or WIF)")?;

            // Sign all stakes with the same private key
            let mut signed_stakes_json = Vec::new();
            for stake in stakes {
                // Create the stake
                let txid_bytes = stake.txid.clone();
                let txid = TxId::new(&txid_bytes).map_err(|e| {
                    anyhow::anyhow!("Invalid txid for stake: {}", e)
                })?;

                let pubkey_bytes = &stake.pubkey;

                let stake_wasm = Stake::new(
                    txid,
                    stake.vout,
                    stake.amount,
                    stake.height,
                    stake.iscoinbase,
                    pubkey_bytes,
                )
                .map_err(|e| {
                    anyhow::anyhow!(
                        "Failed to create stake {}: {}",
                        hex::encode(&stake.txid),
                        e
                    )
                })?;

                // Sign the stake
                let signed_stake = SignedStake::create_signed(
                    stake_wasm,
                    &private_key_bytes,
                    commitment.clone(),
                )
                .map_err(|e| {
                    anyhow::anyhow!(
                        "Failed to sign stake {}: {}",
                        hex::encode(&stake.txid),
                        e
                    )
                })?;

                // Convert to signed stake json
                let signed_stake_json = StakeJson {
                    txid: stake.txid,
                    vout: stake.vout,
                    amount: stake.amount,
                    height: stake.height,
                    iscoinbase: stake.iscoinbase,
                    pubkey: stake.pubkey,
                    signature: signed_stake.signature().to_vec(),
                };

                signed_stakes_json.push(signed_stake_json);
            }

            // Convert to WASM SignedStakes
            let mut signed_stakes_wasm = Vec::new();
            for stake_json in signed_stakes_json {
                let txid = TxId::new(&stake_json.txid).unwrap();
                let stake = Stake::new(
                    txid,
                    stake_json.vout,
                    stake_json.amount,
                    stake_json.height,
                    stake_json.iscoinbase,
                    &stake_json.pubkey,
                )
                .unwrap();
                let signature = SchnorrSignature::new(&stake_json.signature)
                    .map_err(|e| anyhow::anyhow!("Invalid signature: {}", e))?;
                signed_stakes_wasm.push(SignedStake::new(stake, signature));
            }

            (None, Some(signed_stakes_wasm), None)
        }
        "delegation" => {
            let wrapped: WrappedDelegation =
                serde_json::from_str(&config_content).with_context(|| {
                    "Failed to parse unsigned delegation json. Expected \
                     format: {\"delegation\": {...}}"
                })?;
            let config = wrapped.delegation;

            // Parse limitedid
            let limited_proof_id = LimitedProofId::new(&config.limitedid)
                .map_err(|e| anyhow::anyhow!("Invalid limitedid: {}", e))?;

            // Parse master_pubkey
            let master_pubkey_bytes = &config.master;

            // Decode private key
            let private_key_bytes = decode_private_key(&private_key_hex)
                .with_context(|| "Invalid private key format (hex or WIF)")?;

            // Check if this is an unsigned delegation (all levels signed
            // except last)
            let mut signed_levels = Vec::new();
            let mut unsigned_level_index = None;

            for (i, level_config) in config.levels.iter().enumerate() {
                if level_config.signature.is_empty() {
                    // This level is unsigned
                    if unsigned_level_index.is_some() {
                        anyhow::bail!(
                            "Invalid delegation: multiple unsigned levels \
                             found. Only the last level should be unsigned."
                        );
                    }
                    unsigned_level_index = Some(i);
                } else {
                    // This level is signed
                    signed_levels.push((i, level_config));
                }
            }

            // Ensure only the last level is unsigned
            if let Some(unsigned_idx) = unsigned_level_index {
                if unsigned_idx != config.levels.len() - 1 {
                    anyhow::bail!(
                        "Invalid delegation: unsigned level found at index {} \
                         but only the last level should be unsigned.",
                        unsigned_idx
                    );
                }
            } else {
                anyhow::bail!(
                    "Invalid delegation: no unsigned level found. The last \
                     level should be unsigned for signing."
                );
            }

            // Create delegation levels from existing signed levels
            let mut existing_levels = Vec::new();
            for (i, level_config) in config.levels.iter().enumerate() {
                if !level_config.signature.is_empty() {
                    // This is a signed level - create DelegationLevel from it
                    let delegation_level = DelegationLevel::new(
                        &level_config.pubkey,
                        &level_config.signature,
                    )
                    .map_err(|e| {
                        anyhow::anyhow!(
                            "Failed to create delegation level {} from \
                             existing signature: {}",
                            i,
                            e
                        )
                    })?;
                    existing_levels.push(delegation_level);
                }
            }

            // Check if this is the first level (no existing signed levels)
            let is_first_level = existing_levels.is_empty();

            // Create delegation from existing signed levels
            let existing_delegation = if is_first_level {
                // No existing signed levels, create empty delegation
                Delegation::new(&limited_proof_id, master_pubkey_bytes, vec![])
                    .map_err(|e| {
                        anyhow::anyhow!(
                            "Failed to create empty delegation: {}",
                            e
                        )
                    })?
            } else {
                // Create delegation from existing signed levels
                Delegation::new(
                    &limited_proof_id,
                    master_pubkey_bytes,
                    existing_levels,
                )
                .map_err(|e| {
                    anyhow::anyhow!(
                        "Failed to create delegation from existing levels: {}",
                        e
                    )
                })?
            };

            // Create delegation builder from existing delegation
            let mut builder =
                DelegationBuilder::from_delegation(existing_delegation)
                    .map_err(|e| {
                        anyhow::anyhow!(
                            "Failed to create delegation builder from \
                             existing delegation: {}",
                            e
                        )
                    })?;

            // Add the unsigned level (last level) and sign it
            let last_level = &config.levels[config.levels.len() - 1];

            builder
                .add_level(&private_key_bytes, &last_level.pubkey)
                .map_err(|e| {
                    anyhow::anyhow!(
                        "Failed to sign the last delegation level: {}",
                        e
                    )
                })?;

            // Build the delegation to get all signatures
            let delegation = builder.build().map_err(|e| {
                anyhow::anyhow!("Failed to build delegation: {}", e)
            })?;

            // Return the signed delegation WASM object
            (None, None, Some(delegation))
        }
        _ => {
            anyhow::bail!(
                "Invalid object type: {}. Must be 'proof', 'stakes', or \
                 'delegation'",
                detected_type
            );
        }
    };

    // Step 2: Serialize to the requested output format(s)
    let mut hex_result = String::new();
    let mut json_result = String::new();

    if format == "hex" || format == "both" {
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

    if format == "json" || format == "both" {
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
    let signed_output = match format.as_str() {
        "hex" => hex_result,
        "json" => json_result,
        "both" => format!("Hex:\n{}\n\nJSON:\n{}", hex_result, json_result),
        _ => anyhow::bail!(
            "Invalid output format: {}. Must be 'hex', 'json', or 'both'",
            format
        ),
    };

    write_output(&signed_output, output)?;

    // Attempt to clean up shell history if private key was provided via command
    // line
    if !no_history_cleanup && private_key_provided_via_cli {
        let _ = attempt_history_cleanup();
    }

    Ok(())
}
