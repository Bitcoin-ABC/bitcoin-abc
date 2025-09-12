// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use predicates::prelude::*;
use serde_json::Value;

mod fixture;
use fixture::proof_manager_cmd;

#[test]
fn test_get_id_from_stakes() {
    proof_manager_cmd()
        .arg("get-id")
        .arg("--type")
        .arg("stakes")
        .arg("--input-file")
        .arg("tests/vectors/signed_stakes.json")
        .assert()
        .success()
        .stdout(predicate::str::contains("stake_id"));
}

#[test]
fn test_get_id_auto_detection() {
    proof_manager_cmd()
        .arg("get-id")
        .arg("--input-file")
        .arg("tests/vectors/signed_stakes.json")
        .assert()
        .success()
        .stdout(predicate::str::contains("stake_id"));
}

#[test]
fn test_get_id_json_structure() {
    let output = proof_manager_cmd()
        .arg("get-id")
        .arg("--type")
        .arg("stakes")
        .arg("--input-file")
        .arg("tests/vectors/signed_stakes.json")
        .output()
        .unwrap();

    assert!(output.status.success());
    let json_str = String::from_utf8(output.stdout).unwrap();
    let json: Value = serde_json::from_str(&json_str).unwrap();

    // Verify the JSON structure for stake ID
    assert!(json.get("stake_id").is_some());
    assert!(json["stake_id"].is_string());
}

#[test]
fn test_get_id_from_proof() {
    proof_manager_cmd()
        .arg("get-id")
        .arg("--type")
        .arg("proof")
        .arg("--input-file")
        .arg("tests/vectors/proof_with_single_stake.json")
        .assert()
        .success()
        .stdout(predicate::str::contains("proof_id"));
}

#[test]
fn test_get_id_from_delegation() {
    proof_manager_cmd()
        .arg("get-id")
        .arg("--type")
        .arg("delegation")
        .arg("--input-file")
        .arg("tests/vectors/single_level_delegation.json")
        .assert()
        .success()
        .stdout(predicate::str::contains("delegation_id"));
}
