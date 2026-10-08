// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use predicates::prelude::*;
use serde_json::{json, Value};

mod fixture;
use fixture::{proof_manager_cmd, TEST_PRIVATE_KEY};

#[test]
fn test_sign_stakes_with_private_key() {
    proof_manager_cmd()
        .arg("sign")
        .arg("--type")
        .arg("stakes")
        .arg("--input-file")
        .arg("tests/vectors/unsigned_stakes.json")
        .arg("--private-key")
        .arg(TEST_PRIVATE_KEY)
        .arg("--commitment")
        .arg("tests/vectors/commitment_proof.json")
        .assert()
        .success()
        .stdout(predicate::str::contains("signature"));
}

#[test]
fn test_sign_proof_with_private_key() {
    proof_manager_cmd()
        .arg("sign")
        .arg("--type")
        .arg("proof")
        .arg("--input-file")
        .arg("tests/vectors/unsigned_proof.json")
        .arg("--private-key")
        .arg("12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f747")
        .assert()
        .success()
        .stdout(predicate::str::contains("signature"));
}

#[test]
fn test_sign_delegation_with_private_key() {
    proof_manager_cmd()
        .arg("sign")
        .arg("--type")
        .arg("delegation")
        .arg("--input-file")
        .arg("tests/vectors/unsigned_delegation.json")
        .arg("--private-key")
        .arg(TEST_PRIVATE_KEY)
        .assert()
        .success()
        .stdout(predicate::str::contains("signature"));
}

#[test]
fn test_invalid_private_key() {
    proof_manager_cmd()
        .arg("sign")
        .arg("--type")
        .arg("stakes")
        .arg("--input-file")
        .arg("tests/vectors/unsigned_stakes.json")
        .arg("--private-key")
        .arg("invalid_key")
        .arg("--commitment")
        .arg("tests/vectors/commitment_proof.json")
        .assert()
        .failure()
        .stderr(predicate::str::contains("Invalid private key"));
}

fn sample_stake_json(amount: Value, height: u64) -> String {
    let txid =
        "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    let pubkey =
        "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798";
    serde_json::json!({
        "stakes": [{
            "txid": txid,
            "vout": 0,
            "amount": amount,
            "height": height,
            "iscoinbase": false,
            "pubkey": pubkey
        }]
    })
    .to_string()
}

#[test]
fn test_sign_rejects_height_with_top_bit() {
    let input = fixture::create_temp_file(&sample_stake_json(
        json!(100000000),
        1 << 31,
    ));

    proof_manager_cmd()
        .arg("sign")
        .arg("--type")
        .arg("stakes")
        .arg("--input-file")
        .arg(input.path())
        .arg("--private-key")
        .arg(TEST_PRIVATE_KEY)
        .arg("--commitment")
        .arg("tests/vectors/commitment_proof.json")
        .assert()
        .failure()
        .stderr(predicate::str::contains("exceeds maximum encodable value"));
}

#[test]
fn test_sign_rejects_negative_amount() {
    let input =
        fixture::create_temp_file(&sample_stake_json(json!(-1), 800000));

    proof_manager_cmd()
        .arg("sign")
        .arg("--type")
        .arg("stakes")
        .arg("--input-file")
        .arg(input.path())
        .arg("--private-key")
        .arg(TEST_PRIVATE_KEY)
        .arg("--commitment")
        .arg("tests/vectors/commitment_proof.json")
        .assert()
        .failure()
        .stderr(predicate::str::contains("Amount cannot be negative"));
}

#[test]
fn test_sign_multiple_stakes_in_batch() {
    // Test signing several stakes at once with the same private key
    let output = proof_manager_cmd()
        .arg("sign")
        .arg("--type")
        .arg("stakes")
        .arg("--input-file")
        .arg("tests/vectors/multiple_unsigned_stakes.json")
        .arg("--private-key")
        .arg(TEST_PRIVATE_KEY)
        .arg("--commitment")
        .arg("tests/vectors/commitment_proof.json")
        .output()
        .unwrap();

    assert!(output.status.success());
    let json_str = String::from_utf8(output.stdout).unwrap();
    let json: Value = serde_json::from_str(&json_str).unwrap();

    // Verify all stakes are signed
    assert!(json.get("stakes").is_some());
    let stakes = json["stakes"].as_array().unwrap();
    assert_eq!(stakes.len(), 3);

    // Check that each stake has a signature
    for stake in stakes {
        assert!(stake.get("signature").is_some());
        assert!(stake["signature"].is_string());
        assert!(!stake["signature"].as_str().unwrap().is_empty());
    }
}
