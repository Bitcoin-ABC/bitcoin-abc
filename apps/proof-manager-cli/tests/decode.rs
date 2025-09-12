// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::fs;

use predicates::prelude::*;
use serde_json::Value;
use tempfile::NamedTempFile;

mod fixture;
use fixture::{create_temp_file, proof_manager_cmd};

#[test]
fn test_decode_json_stakes() {
    proof_manager_cmd()
        .arg("decode")
        .arg("--input-file")
        .arg("tests/vectors/signed_stakes.json")
        .arg("--format")
        .arg("json")
        .assert()
        .success()
        .stdout(predicate::str::contains("stakes"));
}

#[test]
fn test_decode_json_to_hex_stakes() {
    proof_manager_cmd()
        .arg("decode")
        .arg("--input-file")
        .arg("tests/vectors/signed_stakes.json")
        .arg("--format")
        .arg("hex")
        .assert()
        .success()
        .stdout(predicate::str::is_match(r"^[0-9a-f]+\s*$").unwrap());
}

#[test]
fn test_decode_auto_detection_json() {
    proof_manager_cmd()
        .arg("decode")
        .arg("--input-file")
        .arg("tests/vectors/signed_stakes.json")
        .assert()
        .success()
        .stdout(predicate::str::contains("stakes"));
}

#[test]
fn test_invalid_json_input() {
    let temp_file = create_temp_file("invalid json");

    proof_manager_cmd()
        .arg("decode")
        .arg("--input-file")
        .arg(temp_file.path())
        .assert()
        .failure()
        .stderr(predicate::str::contains("Invalid JSON format"));
}

#[test]
fn test_nonexistent_file() {
    proof_manager_cmd()
        .arg("decode")
        .arg("--input-file")
        .arg("/nonexistent/file.json")
        .assert()
        .failure()
        .stderr(predicate::str::contains("Failed to read"));
}

#[test]
fn test_output_to_file() {
    let output_file = NamedTempFile::new().unwrap();

    proof_manager_cmd()
        .arg("decode")
        .arg("--input-file")
        .arg("tests/vectors/signed_stakes.json")
        .arg("--output")
        .arg(output_file.path())
        .assert()
        .success();

    let output_content = fs::read_to_string(output_file.path()).unwrap();
    assert!(output_content.contains("stakes"));
}

#[test]
fn test_both_format_output() {
    proof_manager_cmd()
        .arg("decode")
        .arg("--input-file")
        .arg("tests/vectors/signed_stakes.json")
        .arg("--format")
        .arg("both")
        .assert()
        .success()
        .stdout(predicate::str::contains("JSON:"))
        .stdout(predicate::str::contains("Hex:"));
}

#[test]
fn test_json_output_structure() {
    let output = proof_manager_cmd()
        .arg("decode")
        .arg("--input-file")
        .arg("tests/vectors/signed_stakes.json")
        .arg("--format")
        .arg("json")
        .output()
        .unwrap();

    assert!(output.status.success());
    let json_str = String::from_utf8(output.stdout).unwrap();
    let json: Value = serde_json::from_str(&json_str).unwrap();

    // Verify the JSON structure
    assert!(json.get("stakes").is_some());
    assert!(json["stakes"].is_array());
    assert!(json["stakes"].as_array().unwrap().len() > 0);
}
