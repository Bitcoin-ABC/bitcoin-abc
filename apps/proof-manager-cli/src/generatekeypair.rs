// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::path::PathBuf;

use anyhow::Result;
use avalanche_lib_wasm::key::{derive_public_key, generate_private_key};
use serde_json::json;

use crate::wif::encode_private_key_to_wif;
use crate::write_output;

pub fn generate_keypair_command(output: Option<PathBuf>) -> Result<()> {
    // Generate a secure random private key
    let private_key_bytes = generate_private_key().map_err(|e| {
        anyhow::anyhow!("Failed to generate private key: {}", e)
    })?;

    // Derive the public key from the private key
    let public_key_bytes = derive_public_key(&private_key_bytes)
        .map_err(|e| anyhow::anyhow!("Failed to derive public key: {}", e))?;

    // Convert to hex strings
    let private_key_hex = hex::encode(&private_key_bytes);
    let public_key_hex = hex::encode(&public_key_bytes);

    // Generate WIF format for private key (compressed)
    let private_key_wif = encode_private_key_to_wif(&private_key_bytes, true)
        .map_err(|e| {
        anyhow::anyhow!("Failed to encode private key to WIF: {}", e)
    })?;

    // Generate JSON output
    let keypair_json = json!({
        "private_key_hex": private_key_hex,
        "private_key_wif": private_key_wif,
        "public_key": public_key_hex
    });
    let output_content = serde_json::to_string_pretty(&keypair_json)?;

    // Write output
    write_output(&output_content, output)?;

    Ok(())
}
