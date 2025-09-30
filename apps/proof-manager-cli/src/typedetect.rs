// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use anyhow::{Context, Result};
use avalanche_lib_wasm::{
    delegation::Delegation, proof::Proof, stake::SignedStake,
};

/// Auto-detection functions for determining object type from content
pub fn detect_json_type(json_content: &str) -> Result<String> {
    let value: serde_json::Value = serde_json::from_str(json_content)
        .with_context(|| "Invalid JSON format")?;

    if value.get("proof").is_some() {
        return Ok("proof".to_string());
    }

    if value.get("stakes").is_some() {
        return Ok("stakes".to_string());
    }

    if value.get("delegation").is_some() {
        return Ok("delegation".to_string());
    }

    anyhow::bail!(
        "Could not auto-detect type from JSON. JSON must have a top-level \
         'proof', 'stakes', or 'delegation' object. Use --type to specify \
         explicitly."
    )
}

pub fn detect_hex_type(hex_string: &str) -> Result<String> {
    // Try parsing as each type and see which succeeds
    if Proof::from_hex(hex_string).is_ok() {
        return Ok("proof".to_string());
    }

    if SignedStake::from_hex(hex_string).is_ok() {
        return Ok("stakes".to_string());
    }

    if Delegation::from_hex(hex_string).is_ok() {
        return Ok("delegation".to_string());
    }

    anyhow::bail!(
        "Could not auto-detect type from hex data. The hex string does not \
         appear to be a valid proof, stake, or delegation. Use --type to \
         specify explicitly."
    )
}

pub fn determine_type(
    input_content: &str,
    is_hex_input: bool,
) -> Result<String> {
    // Auto-detect based on input format
    if is_hex_input {
        // Clean the hex string by removing all whitespace and "0x" prefix
        let cleaned_hex = input_content
            .chars()
            .filter(|c| c.is_ascii_hexdigit())
            .collect::<String>();
        detect_hex_type(&cleaned_hex)
    } else {
        detect_json_type(input_content)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_json_type_stakes() {
        let json_content = r#"{"stakes": [{"txid": "abc", "vout": 0}]}"#;
        let result = detect_json_type(json_content).unwrap();
        assert_eq!(result, "stakes");
    }

    #[test]
    fn test_detect_json_type_proof() {
        let json_content = r#"{"proof": {"sequence": 1, "master": "abc"}}"#;
        let result = detect_json_type(json_content).unwrap();
        assert_eq!(result, "proof");
    }

    #[test]
    fn test_detect_json_type_delegation() {
        let json_content =
            r#"{"delegation": {"limitedid": "abc", "levels": []}}"#;
        let result = detect_json_type(json_content).unwrap();
        assert_eq!(result, "delegation");
    }

    #[test]
    fn test_detect_json_type_invalid() {
        let json_content = r#"{"invalid": "data"}"#;
        let result = detect_json_type(json_content);
        assert!(result.is_err());
    }

    #[test]
    fn test_detect_json_type_malformed() {
        let json_content = r#"{"invalid json"#;
        let result = detect_json_type(json_content);
        assert!(result.is_err());
    }
}
