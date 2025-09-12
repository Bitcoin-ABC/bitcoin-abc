// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::path::PathBuf;

use anyhow::{Context, Result};
use avalanche_lib_wasm::{delegation::Delegation, proof::Proof};

use crate::io::{process_input_and_detect_type, write_output};
use crate::json::delegation::{
    delegate_from_delegation, delegate_from_proof, json_to_delegation,
    WrappedDelegation,
};
use crate::json::proof::json_to_proof;

pub fn delegate_command(
    r#type: Option<String>,
    input: Option<String>,
    input_file: Option<PathBuf>,
    pubkey: String,
    output: Option<PathBuf>,
) -> Result<()> {
    // Process input and detect type
    let (input_content, detected_type, is_hex_input) =
        process_input_and_detect_type(input, input_file, r#type)?;

    let unsigned_delegation = match detected_type.as_str() {
        "proof" => {
            if is_hex_input {
                let proof = Proof::from_hex(&input_content).map_err(|e| {
                    anyhow::anyhow!("Failed to parse hex proof: {}", e)
                })?;
                delegate_from_proof(&proof, &pubkey)?
            } else {
                let proof =
                    json_to_proof(&input_content).with_context(|| {
                        "Failed to convert JSON proof to WASM object"
                    })?;
                delegate_from_proof(&proof, &pubkey)?
            }
        }
        "delegation" => {
            if is_hex_input {
                let delegation =
                    Delegation::from_hex(&input_content).map_err(|e| {
                        anyhow::anyhow!("Failed to parse hex delegation: {}", e)
                    })?;
                delegate_from_delegation(&delegation, &pubkey)?
            } else {
                let delegation = json_to_delegation(&input_content)
                    .with_context(|| {
                        "Failed to convert JSON delegation to WASM object"
                    })?;
                delegate_from_delegation(&delegation, &pubkey)?
            }
        }
        _ => anyhow::bail!(
            "Input must be a proof or delegation, got: {}",
            detected_type
        ),
    };

    // Output the unsigned delegation
    let wrapped_output = WrappedDelegation {
        delegation: unsigned_delegation,
    };
    let output_json = serde_json::to_string_pretty(&wrapped_output)?;

    write_output(&output_json, output)?;

    Ok(())
}
