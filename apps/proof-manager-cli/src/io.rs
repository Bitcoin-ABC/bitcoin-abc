// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::fs;
use std::path::PathBuf;

use anyhow::{Context, Result};

use crate::typedetect::determine_type;

pub fn read_input(
    input: Option<String>,
    input_file: Option<PathBuf>,
) -> Result<String> {
    match (input, input_file) {
        (Some(input_str), None) => Ok(input_str),
        (None, Some(path)) => {
            if path.to_str() == Some("-") {
                // Read from stdin
                use std::io::Read;
                let mut buffer = String::new();
                std::io::stdin()
                    .read_to_string(&mut buffer)
                    .with_context(|| "Failed to read from stdin")?;
                Ok(buffer.trim().to_string())
            } else {
                let content = fs::read_to_string(&path).with_context(|| {
                    format!("Failed to read input file: {:?}", path)
                })?;
                Ok(content.trim().to_string())
            }
        }
        (Some(_), Some(_)) => {
            anyhow::bail!(
                "Cannot specify both direct input and --input-file options"
            );
        }
        (None, None) => {
            anyhow::bail!(
                "Must specify either direct input or --input-file option"
            );
        }
    }
}

pub fn write_output(content: &str, output: Option<PathBuf>) -> Result<()> {
    match output {
        Some(path) => {
            fs::write(&path, content).with_context(|| {
                format!("Failed to write output file: {:?}", path)
            })?;
            println!("Output written to: {:?}", path);
        }
        None => {
            println!("{}", content);
        }
    }
    Ok(())
}

/// Process command input and determine if it's hex or JSON and what type it
/// represents This function combines input reading, format detection, and type
/// detection to avoid code duplication across commands.
/// Returns (input_content, detected_type, is_hex_input)
pub fn process_input_and_detect_type(
    input: Option<String>,
    input_file: Option<PathBuf>,
    explicit_type: Option<String>,
) -> Result<(String, String, bool)> {
    // Read the input content
    let input_content = read_input(input, input_file)?;

    // Determine if input is hex or JSON (needed for both explicit and
    // auto-detected types)
    let is_hex_input = input_content
        .trim()
        .chars()
        .all(|c| c.is_ascii_hexdigit() || c.is_whitespace())
        && !input_content.trim().starts_with('{')
        && !input_content.trim().starts_with('[');

    // If type is explicitly provided, use it directly
    if let Some(explicit_type) = explicit_type {
        return Ok((input_content, explicit_type, is_hex_input));
    }

    // Auto-detect the object type
    let detected_type = determine_type(&input_content, is_hex_input)?;

    Ok((input_content, detected_type, is_hex_input))
}

#[cfg(test)]
mod tests {
    use std::io::Write;

    use tempfile::NamedTempFile;

    use super::*;

    #[test]
    fn test_process_hex_input_with_explicit_type() {
        let hex_input = "0123456789abcdef";
        let result = process_input_and_detect_type(
            Some(hex_input.to_string()),
            None,
            Some("proof".to_string()),
        )
        .unwrap();

        assert_eq!(result.0, hex_input);
        assert_eq!(result.1, "proof");
        assert!(result.2); // Should be hex input
    }

    #[test]
    fn test_process_hex_input_auto_detect() {
        // Use a real proof hex from test vectors
        let hex_input =
            "2a00000000000000fff053650000000021030b4c866585dd868a9d62348a9cd008\
            d6a312937048fff31670e7e920cfc7a74401b7fc19792583e9cb39843fc5e22a4e3\
            648ab1cb18a70290b341ee8d4f550ae240000000010270000000000007888140041\
            04d0de0aaeaefad02b8bdc8a01a1b8b11c696bd3d66a2c5f10780d95b7df42645cd\
            85228a6fb29940e858e7e55842ae2bd115d1ed7cc0e82d934e929c97648cb0abd97\
            40c85a05a7d543c3d301273d79ff7054758579e30cc05cdfe1aca3374adfe55104b\
            409ffce4a2f19d8a5981d5f0c79b23edac73352ab2898aca89270282500788bac77\
            505ca17d6d0dcc946ced3990c2857c73743cd74d881fcbcbc8eaaa8d72812ebb9a5\
            56610687ca592fe907a4af024390e0a9260c4f5ea59e7ac426cc5";
        let result = process_input_and_detect_type(
            Some(hex_input.to_string()),
            None,
            None,
        )
        .unwrap();

        assert_eq!(result.0, hex_input);
        assert_eq!(result.1, "proof"); // Should auto-detect as proof for hex
        assert!(result.2); // Should be hex input
    }

    #[test]
    fn test_process_json_input_with_explicit_type() {
        let json_input =
            r#"{"proof": {"sequence": 1, "expiration_time": 1234567890}}"#;
        let result = process_input_and_detect_type(
            Some(json_input.to_string()),
            None,
            Some("proof".to_string()),
        )
        .unwrap();

        assert_eq!(result.0, json_input);
        assert_eq!(result.1, "proof");
        assert!(!result.2); // Should be JSON input
    }

    #[test]
    fn test_process_json_file_input() {
        let json_content =
            r#"{"proof": {"sequence": 1, "expiration_time": 1234567890}}"#;
        let mut temp_file = NamedTempFile::new().unwrap();
        temp_file.write_all(json_content.as_bytes()).unwrap();
        temp_file.flush().unwrap();

        let result = process_input_and_detect_type(
            None,
            Some(temp_file.path().to_path_buf()),
            None,
        )
        .unwrap();

        assert_eq!(result.0, json_content);
        assert_eq!(result.1, "proof");
        assert!(!result.2); // Should be JSON input
    }

    #[test]
    fn test_process_stakes_json_file() {
        let json_content =
            r#"{"stakes": [{"txid": "0123456789abcdef", "vout": 0}]}"#;
        let mut temp_file = NamedTempFile::new().unwrap();
        temp_file.write_all(json_content.as_bytes()).unwrap();
        temp_file.flush().unwrap();

        let result = process_input_and_detect_type(
            None,
            Some(temp_file.path().to_path_buf()),
            None,
        )
        .unwrap();

        assert_eq!(result.0, json_content);
        assert_eq!(result.1, "stakes");
        assert!(!result.2); // Should be JSON input
    }

    #[test]
    fn test_process_delegation_json_file() {
        let json_content = r#"{
            "delegation": {
                "limitedid": "0123456789abcdef",
                "master": "fedcba9876543210"
            }
        }"#;
        let mut temp_file = NamedTempFile::new().unwrap();
        temp_file.write_all(json_content.as_bytes()).unwrap();
        temp_file.flush().unwrap();

        let result = process_input_and_detect_type(
            None,
            Some(temp_file.path().to_path_buf()),
            None,
        )
        .unwrap();

        assert_eq!(result.0, json_content);
        assert_eq!(result.1, "delegation");
        assert!(!result.2); // Should be JSON input
    }

    #[test]
    fn test_process_hex_with_whitespace() {
        // Use a real proof hex with whitespace
        let hex_input =
            "2a00000000000000fff053650000000021030b4c866585dd868a9d62348a9cd008\
            d6a312937048fff31670e7e920cfc7a74401b7fc19792583e9cb39843fc5e22a4e3\
            648ab1cb18a70290b341ee8d4f550ae240000000010270000000000007888140041\
            04d0de0aaeaefad02b8bdc8a01a1b8b11c696bd3d66a2c5f10780d95b7df42645cd\
            85228a6fb29940e858e7e55842ae2bd115d1ed7cc0e82d934e929c97648cb0abd97\
            40c85a05a7d543c3d301273d79ff7054758579e30cc05cdfe1aca3374adfe55104b\
            409ffce4a2f19d8a5981d5f0c79b23edac73352ab2898aca89270282500788bac77\
            505ca17d6d0dcc946ced3990c2857c73743cd74d881fcbcbc8eaaa8d72812ebb9a5\
            56610687ca592fe907a4af024390e0a9260c4f5ea59e7ac426cc5  ";
        let result = process_input_and_detect_type(
            Some(hex_input.to_string()),
            None,
            None,
        )
        .unwrap();

        assert_eq!(result.0, hex_input);
        assert_eq!(result.1, "proof");
        assert!(result.2); // Should be hex input
    }

    #[test]
    fn test_process_ambiguous_input_treated_as_json() {
        // Should be treated as JSON and fail with proper error
        let ambiguous_input = "invalid json";
        let result = process_input_and_detect_type(
            Some(ambiguous_input.to_string()),
            None,
            None,
        );

        // Should fail because it's treated as JSON but invalid
        assert!(result.is_err());
    }

    #[test]
    fn test_process_hex_that_starts_with_brace() {
        // Even if it's all hex chars, if it starts with { it should be treated
        // as JSON
        let hex_like_json = "{0123456789abcdef}";
        let result = process_input_and_detect_type(
            Some(hex_like_json.to_string()),
            None,
            None,
        );

        // Should fail because it's treated as JSON but invalid
        assert!(result.is_err());
    }

    #[test]
    fn test_process_hex_that_starts_with_bracket() {
        // Even if it's all hex chars, if it starts with [ it should be treated
        // as JSON
        let hex_like_json = "[0123456789abcdef]";
        let result = process_input_and_detect_type(
            Some(hex_like_json.to_string()),
            None,
            None,
        );

        // Should fail because it's treated as JSON but invalid
        assert!(result.is_err());
    }

    #[test]
    fn test_process_both_hex_and_input_error() {
        let result = process_input_and_detect_type(
            Some("0123456789abcdef".to_string()),
            Some(PathBuf::from("test.json")),
            None,
        );

        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains(
            "Cannot specify both direct input and --input-file options"
        ));
    }

    #[test]
    fn test_process_nonexistent_file() {
        let result = process_input_and_detect_type(
            None,
            Some(PathBuf::from("nonexistent.json")),
            None,
        );

        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Failed to read input file"));
    }

    #[test]
    fn test_process_empty_hex_input() {
        let result =
            process_input_and_detect_type(Some("".to_string()), None, None);

        // Empty hex input should be treated as JSON and fail
        assert!(result.is_err());
    }

    #[test]
    fn test_process_whitespace_only_hex_input() {
        let result = process_input_and_detect_type(
            Some("   \n  ".to_string()),
            None,
            None,
        );

        // Whitespace-only input should be treated as JSON and fail
        assert!(result.is_err());
    }

    #[test]
    fn test_process_malformed_json() {
        let malformed_json =
            r#"{"proof": {"sequence": 1, "expiration_time": 1234567890"#;
        let mut temp_file = NamedTempFile::new().unwrap();
        temp_file.write_all(malformed_json.as_bytes()).unwrap();
        temp_file.flush().unwrap();

        let result = process_input_and_detect_type(
            None,
            Some(temp_file.path().to_path_buf()),
            None,
        );

        // Should fail because JSON is malformed
        assert!(result.is_err());
    }

    #[test]
    fn test_process_hex_with_mixed_case() {
        // Use a real proof hex with mixed case (convert to mixed case for
        // testing)
        let hex_input =
            "2A00000000000000FFF053650000000021030B4C866585DD868A9D62348A9CD008\
            D6A312937048FFF31670E7E920CFC7A74401B7FC19792583E9CB39843FC5E22A4E3\
            648AB1CB18A70290B341EE8D4F550AE240000000010270000000000007888140041\
            04D0DE0AAEAEFAD02B8BDC8A01A1B8B11C696BD3D66A2C5F10780D95B7DF42645CD\
            85228A6FB29940E858E7E55842AE2BD115D1ED7CC0E82D934E929C97648CB0ABD97\
            40C85A05A7D543C3D301273D79FF7054758579E30CC05CDFE1ACA3374ADFE55104B\
            409FFCE4A2F19D8A5981D5F0C79B23EDAC73352AB2898ACA89270282500788BAC77\
            505CA17D6D0DCC946CED3990C2857C73743CD74D881FCBCBC8EAAA8D72812EBB9A5\
            56610687CA592FE907A4AF024390E0A9260C4F5EA59E7AC426CC5";
        let result = process_input_and_detect_type(
            Some(hex_input.to_string()),
            None,
            None,
        )
        .unwrap();

        assert_eq!(result.0, hex_input);
        assert_eq!(result.1, "proof");
        assert!(result.2); // Should be hex input
    }

    #[test]
    fn test_process_hex_with_newlines_and_spaces() {
        // Use a real proof hex with newlines and spaces
        let hex_input =
            "2a00000000000000fff053650000000021030b4c866585dd868a9d62348a9cd008\
            d6a312937048fff31670e7e920cfc7a74401b7fc19792583e9cb39843fc5e22a4e3\
            648ab1cb18a70290b341ee8d4f550ae240000000010270000000000007888140041\
            04d0de0aaeaefad02b8bdc8a01a1b8b11c696bd3d66a2c5f10780d95b7df42645cd\
            85228a6fb29940e858e7e55842ae2bd115d1ed7cc0e82d934e929c97648cb0abd97\
            40c85a05a7d543c3d301273d79ff7054758579e30cc05cdfe1aca3374adfe55104b\
            409ffce4a2f19d8a5981d5f0c79b23edac73352ab2898aca89270282500788bac77\
            505ca17d6d0dcc946ced3990c2857c73743cd74d881fcbcbc8eaaa8d72812ebb9a5\
            56610687ca592fe907a4af024390e0a9260c4f5ea59e7ac426cc5  ";
        let result = process_input_and_detect_type(
            Some(hex_input.to_string()),
            None,
            None,
        )
        .unwrap();

        assert_eq!(result.0, hex_input);
        assert_eq!(result.1, "proof");
        assert!(result.2); // Should be hex input
    }
}
