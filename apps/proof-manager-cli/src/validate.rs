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

pub fn validate_command(
    object_type: Option<String>,
    input: Option<String>,
    input_file: Option<PathBuf>,
) -> Result<()> {
    // Process input and detect type
    let (input_content, detected_type, is_hex_input) =
        process_input_and_detect_type(input, input_file, object_type)?;

    // Use unified WASM object validation with detailed results
    let validation_result =
        validate_unified(&detected_type, &input_content, is_hex_input)?;

    // Build and output JSON result based on validation outcome
    match validation_result {
        None => {
            // Valid - output success JSON and exit with code 0
            let success_json = serde_json::to_string(&serde_json::json!({
                "valid": true
            }))?;
            write_output(&success_json, None)?;
        }
        Some(error_message) => {
            // Invalid - output error JSON and exit with code 1
            let error_json = serde_json::to_string(&serde_json::json!({
                "valid": false,
                "error": error_message
            }))?;
            write_output(&error_json, None)?;
            std::process::exit(1);
        }
    }

    Ok(())
}

/// Unified validation using WASM objects
fn validate_unified(
    object_type: &str,
    input_content: &str,
    is_hex_input: bool,
) -> Result<Option<String>> {
    match (object_type.to_lowercase().as_str(), is_hex_input) {
        ("proof", false) => match json_to_proof(input_content) {
            Ok(proof) => Ok(proof.verify()),
            Err(e) => Ok(Some(format!("JSON conversion error: {}", e))),
        },
        ("proof", true) => match Proof::from_hex(input_content.trim()) {
            Ok(proof) => Ok(proof.verify()),
            Err(e) => Ok(Some(format!("Decode error: {}", e))),
        },
        ("stakes", false) => match json_to_signed_stakes(input_content) {
            Ok(_stakes) => Ok(None),
            Err(e) => Ok(Some(format!("JSON conversion error: {}", e))),
        },
        ("stakes", true) => {
            // Parse multiple hex lines
            let mut errors = Vec::new();
            let mut stake_count = 0;

            for line in input_content.lines() {
                let line = line.trim();
                if line.is_empty() {
                    continue;
                }

                stake_count += 1;
                if let Err(e) = SignedStake::from_hex(line) {
                    errors.push(format!("Stake {}: {}", stake_count, e));
                }
            }

            if stake_count == 0 {
                Ok(Some("No stakes found".to_string()))
            } else if errors.is_empty() {
                Ok(None)
            } else {
                Ok(Some(errors.join("; ")))
            }
        }
        ("delegation", false) => match json_to_delegation(input_content) {
            Ok(delegation) => Ok(delegation.verify()),
            Err(e) => Ok(Some(format!("JSON conversion error: {}", e))),
        },
        ("delegation", true) => {
            match Delegation::from_hex(input_content.trim()) {
                Ok(delegation) => Ok(delegation.verify()),
                Err(e) => Ok(Some(format!("Decode error: {}", e))),
            }
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
