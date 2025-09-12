// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use predicates::prelude::*;
use serde_json::{json, Value};

mod fixture;
use fixture::{
    create_temp_file, load_test_vector, proof_manager_cmd,
    EXPECTED_1LEVEL_DELEGATION_HEX, EXPECTED_2LEVEL_DELEGATION_HEX,
    EXPECTED_DELEGATION_HEX, EXPECTED_DELEGATION_ID, EXPECTED_LIMITED_ID1,
    EXPECTED_LIMITED_ID2, EXPECTED_PROOF1, EXPECTED_PROOF2, EXPECTED_PROOF_ID1,
    EXPECTED_PROOF_ID2, EXPECTED_STAKES_HEX, EXPECTED_STAKE_ID,
    PROOF_MASTER_PRIVATE_KEY, STAKES_PRIVATE_KEY, TEST_PRIVATE_KEY,
};

#[test]
fn test_workflow_sign_and_validate() {
    // First, sign the stakes
    let signed_output = proof_manager_cmd()
        .arg("sign")
        .arg("--type")
        .arg("stakes")
        .arg("--input-file")
        .arg("tests/vectors/unsigned_stakes.json")
        .arg("--private-key")
        .arg(TEST_PRIVATE_KEY)
        .arg("--commitment")
        .arg("tests/vectors/commitment_proof.json")
        .output()
        .unwrap();

    assert!(signed_output.status.success());
    let signed_json = String::from_utf8(signed_output.stdout).unwrap();

    // Then validate the signed stakes
    let signed_file = create_temp_file(&signed_json);
    proof_manager_cmd()
        .arg("validate")
        .arg("--type")
        .arg("stakes")
        .arg("--input-file")
        .arg(signed_file.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("\"valid\":true"));
}

#[test]
fn test_create_delegation_and_sign() {
    // First, convert proof JSON to hex
    let hex_output = proof_manager_cmd()
        .arg("decode")
        .arg("--input-file")
        .arg("tests/vectors/proof_with_single_stake.json")
        .arg("--format")
        .arg("hex")
        .output()
        .unwrap();

    assert!(hex_output.status.success());
    let proof_hex = String::from_utf8(hex_output.stdout)
        .unwrap()
        .trim()
        .to_string();

    // Then create a delegation from hex
    let delegation_output = proof_manager_cmd()
        .arg("delegate")
        .arg(&proof_hex)
        .arg("--pubkey")
        .arg("0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b\
16f81798")
        .output()
        .unwrap();

    assert!(delegation_output.status.success());
    let delegation_json = String::from_utf8(delegation_output.stdout).unwrap();

    // Then sign the delegation
    let delegation_file = create_temp_file(&delegation_json);
    proof_manager_cmd()
        .arg("sign")
        .arg("--type")
        .arg("delegation")
        .arg("--input-file")
        .arg(delegation_file.path())
        .arg("--private-key")
        .arg(PROOF_MASTER_PRIVATE_KEY)
        .assert()
        .success()
        .stdout(predicate::str::contains("signature"));
}

#[test]
fn test_add_stake_to_existing_proof() {
    // This test simulates adding a stake to an existing proof by:
    // 1. Starting with unsigned stakes
    // 2. Signing the stakes first
    // 3. Creating a proof with the signed stakes
    // 4. Adding another stake
    // 5. Signing the proof

    // Step 1: Start with unsigned stakes
    let commitment_file =
        create_temp_file(&load_test_vector("commitment_proof.json"));

    // Step 2: Sign the stakes first
    let sign_stakes_output = proof_manager_cmd()
        .arg("sign")
        .arg("--type")
        .arg("stakes")
        .arg("--input-file")
        .arg("tests/vectors/unsigned_stakes.json")
        .arg("--private-key")
        .arg(STAKES_PRIVATE_KEY)
        .arg("--commitment")
        .arg(commitment_file.path())
        .output()
        .unwrap();

    assert!(sign_stakes_output.status.success());
    let signed_stakes_json =
        String::from_utf8(sign_stakes_output.stdout).unwrap();

    // Step 3: Create a proof with the signed stakes
    // Read the unsigned proof file directly and parse it as JSON
    let existing_json_str =
        std::fs::read_to_string("tests/vectors/unsigned_proof.json").unwrap();
    let mut existing_json: Value =
        serde_json::from_str(&existing_json_str).unwrap();

    // Replace the stakes in the proof with the signed stakes
    let signed_stakes: Value =
        serde_json::from_str(&signed_stakes_json).unwrap();
    existing_json["proof"]["stakes"] = signed_stakes["stakes"].clone();

    // Step 4: Parse the additional stake and sign it
    // Create unsigned version of additional stake
    let additional_stake_json: Value = serde_json::from_str(
        &std::fs::read_to_string("tests/vectors/additional_stake.json")
            .unwrap(),
    )
    .unwrap();
    let mut additional_stake = additional_stake_json["stakes"][0].clone();
    additional_stake
        .as_object_mut()
        .unwrap()
        .remove("signature");

    let unsigned_additional_stake = json!({
        "stakes": [additional_stake]
    });
    let unsigned_additional_stake_file = create_temp_file(
        &serde_json::to_string(&unsigned_additional_stake).unwrap(),
    );

    // Sign the additional stake
    let sign_additional_stake_output = proof_manager_cmd()
        .arg("sign")
        .arg("--type")
        .arg("stakes")
        .arg("--input-file")
        .arg(unsigned_additional_stake_file.path())
        .arg("--private-key")
        .arg(STAKES_PRIVATE_KEY)
        .arg("--commitment")
        .arg(commitment_file.path())
        .output()
        .unwrap();

    assert!(sign_additional_stake_output.status.success());
    let signed_additional_stake_json =
        String::from_utf8(sign_additional_stake_output.stdout).unwrap();
    let signed_additional_stake: Value =
        serde_json::from_str(&signed_additional_stake_json).unwrap();

    // Step 5: Add the new signed stake to the existing proof
    existing_json["proof"]["stakes"]
        .as_array_mut()
        .unwrap()
        .push(signed_additional_stake["stakes"][0].clone());

    // Step 6: Remove the signature from the proof to make it unsigned
    let mut unsigned_proof = existing_json["proof"].clone();
    unsigned_proof.as_object_mut().unwrap().remove("signature");

    let unsigned_json = json!({
        "proof": unsigned_proof
    });

    // Step 7: Create a temporary file with the updated unsigned proof
    let updated_proof_json =
        serde_json::to_string_pretty(&unsigned_json).unwrap();
    let updated_proof_file = create_temp_file(&updated_proof_json);

    // Step 8: Sign the updated proof with the master private key
    let sign_output = proof_manager_cmd()
        .arg("sign")
        .arg("--type")
        .arg("proof")
        .arg("--input-file")
        .arg(updated_proof_file.path())
        .arg("--private-key")
        .arg(PROOF_MASTER_PRIVATE_KEY)
        .output()
        .unwrap();

    assert!(sign_output.status.success());
    let signed_proof_json = String::from_utf8(sign_output.stdout).unwrap();
    let signed_proof_file = create_temp_file(&signed_proof_json);

    // Step 9: Validate the signed proof
    let validation_output = proof_manager_cmd()
        .arg("validate")
        .arg("--type")
        .arg("proof")
        .arg("--input-file")
        .arg(signed_proof_file.path())
        .output()
        .unwrap();

    assert!(validation_output.status.success());
    let validation_str = String::from_utf8(validation_output.stdout).unwrap();

    // The proof should be valid and contain both stakes
    assert!(validation_str.contains("\"valid\":true"));

    // Step 10: Verify the proof now has 2 stakes
    let final_decode_output = proof_manager_cmd()
        .arg("decode")
        .arg("--input-file")
        .arg(signed_proof_file.path())
        .arg("--format")
        .arg("json")
        .output()
        .unwrap();

    assert!(final_decode_output.status.success());
    let final_json_str = String::from_utf8(final_decode_output.stdout).unwrap();
    let final_json: Value = serde_json::from_str(&final_json_str).unwrap();

    let final_stakes = final_json["proof"]["stakes"].as_array().unwrap();
    assert_eq!(final_stakes.len(), 2);
}

#[test]
fn test_proof_vector_1_get_id() {
    // Test get-id command with proof vector 1
    let output = proof_manager_cmd()
        .arg("get-id")
        .arg(EXPECTED_PROOF1)
        .output()
        .unwrap();

    assert!(output.status.success());
    let output_str = String::from_utf8(output.stdout).unwrap();
    let json: Value = serde_json::from_str(&output_str).unwrap();

    // Check proof ID and limited proof ID match expected values
    assert_eq!(
        json["proof_id"].as_str().unwrap(),
        EXPECTED_PROOF_ID1,
        "Proof ID mismatch for vector 1"
    );

    assert_eq!(
        json["limitedid"].as_str().unwrap(),
        EXPECTED_LIMITED_ID1,
        "Limited proof ID mismatch for vector 1"
    );
}

#[test]
fn test_proof_vector_1_decode() {
    // Test decode command with proof vector 1
    let output = proof_manager_cmd()
        .arg("decode")
        .arg(EXPECTED_PROOF1)
        .output()
        .unwrap();

    assert!(output.status.success());
    let output_str = String::from_utf8(output.stdout).unwrap();
    let json: Value = serde_json::from_str(&output_str).unwrap();

    let proof = &json["proof"];

    // Check basic proof fields match expected values from test_avalanche.py
    assert_eq!(
        proof["sequence"].as_u64().unwrap(),
        42,
        "Sequence mismatch for vector 1"
    );

    assert_eq!(
        proof["expiration"].as_u64().unwrap(),
        1699999999,
        "Expiration time mismatch for vector 1"
    );

    assert_eq!(
        proof["master"].as_str().unwrap(),
        "030b4c866585dd868a9d62348a9cd008d6a312937048fff31670e7e920cfc7a744",
        "Master public key mismatch for vector 1"
    );

    assert_eq!(
        proof["payoutscript"].as_str().unwrap(),
        "",
        "Payout script mismatch for vector 1"
    );

    // Check stake details
    let stakes = proof["stakes"].as_array().unwrap();
    assert_eq!(stakes.len(), 1, "Expected 1 stake for vector 1");

    let stake = &stakes[0];
    assert_eq!(
        stake["txid"].as_str().unwrap(),
        "24ae50f5d4e81e340b29708ab11cab48364e2ae2c53f8439cbe983257919fcb7",
        "Stake txid mismatch for vector 1"
    );

    assert_eq!(
        stake["vout"].as_u64().unwrap(),
        0,
        "Stake vout mismatch for vector 1"
    );

    assert_eq!(
        stake["amount"].as_f64().unwrap(),
        100.00,
        "Stake amount mismatch for vector 1"
    );

    assert_eq!(
        stake["height"].as_u64().unwrap(),
        672828,
        "Stake height mismatch for vector 1"
    );

    assert_eq!(
        stake["iscoinbase"].as_bool().unwrap(),
        false,
        "Stake iscoinbase mismatch for vector 1"
    );

    // Check that the stake public key is in uncompressed format (starts with
    // 04)
    let pubkey = stake["pubkey"].as_str().unwrap();
    assert!(
        pubkey.starts_with("04"),
        "Stake public key should be uncompressed (start with 04) for vector 1"
    );
    assert_eq!(
        pubkey,
        "04d0de0aaeaefad02b8bdc8a01a1b8b11c696bd3d66a2c5f10780d95b7df42645cd852\
        28a6fb29940e858e7e55842ae2bd115d1ed7cc0e82d934e929c97648cb0a",
        "Stake public key mismatch for vector 1"
    );

    // Check signature is base64 encoded
    let signature = stake["signature"].as_str().unwrap();
    assert_eq!(
        signature,
        "vZdAyFoFp9VDw9MBJz15/3BUdYV54wzAXN/hrKM3St/lUQS0Cf/\
         OSi8Z2KWYHV8MebI+2sczUqsomKyoknAoJQ==",
        "Stake signature mismatch for vector 1"
    );
}

#[test]
fn test_proof_vector_2_get_id() {
    // Test get-id command with proof vector 2 (3 stakes)
    let output = proof_manager_cmd()
        .arg("get-id")
        .arg(EXPECTED_PROOF2)
        .output()
        .unwrap();

    assert!(output.status.success());
    let output_str = String::from_utf8(output.stdout).unwrap();
    let json: Value = serde_json::from_str(&output_str).unwrap();

    // Check proof ID and limited proof ID match expected values
    assert_eq!(
        json["proof_id"].as_str().unwrap(),
        EXPECTED_PROOF_ID2,
        "Proof ID mismatch for vector 2"
    );

    assert_eq!(
        json["limitedid"].as_str().unwrap(),
        EXPECTED_LIMITED_ID2,
        "Limited proof ID mismatch for vector 2"
    );
}

#[test]
fn test_stakes_get_id() {
    // Test get-id command with stakes hex
    let output = proof_manager_cmd()
        .arg("get-id")
        .arg("--type")
        .arg("stakes")
        .arg(EXPECTED_STAKES_HEX)
        .output()
        .unwrap();

    assert!(output.status.success());
    let output_str = String::from_utf8(output.stdout).unwrap();
    let json: Value = serde_json::from_str(&output_str).unwrap();

    // Check stake ID matches expected value
    assert_eq!(
        json["stake_id"].as_str().unwrap(),
        EXPECTED_STAKE_ID,
        "Stake ID mismatch"
    );
}
#[test]
fn test_proof_vector_2_decode() {
    // Test decode command with proof vector 2 (3 stakes)
    let output = proof_manager_cmd()
        .arg("decode")
        .arg(EXPECTED_PROOF2)
        .output()
        .unwrap();

    assert!(output.status.success());
    let output_str = String::from_utf8(output.stdout).unwrap();
    let json: Value = serde_json::from_str(&output_str).unwrap();

    let proof = &json["proof"];

    // Check basic proof fields match expected values from test_avalanche.py
    assert_eq!(
        proof["sequence"].as_u64().unwrap(),
        5502932407561118921,
        "Sequence mismatch for vector 2"
    );

    assert_eq!(
        proof["expiration"].as_u64().unwrap(),
        5658701220890886376,
        "Expiration time mismatch for vector 2"
    );

    assert_eq!(
        proof["master"].as_str().unwrap(),
        "023beefdde700a6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3",
        "Master public key mismatch for vector 2"
    );

    // Check that we have 3 stakes
    let stakes = proof["stakes"].as_array().unwrap();
    assert_eq!(stakes.len(), 3, "Expected 3 stakes for vector 2");

    // Check first stake details
    let stake1 = &stakes[0];
    assert_eq!(
        stake1["txid"].as_str().unwrap(),
        "37424bda9a405b59e7d4f61a4c154cea5ee34e445f3daa6033b64c70355f1e0b",
        "Stake 1 txid mismatch for vector 2"
    );
    assert_eq!(
        stake1["vout"].as_u64().unwrap(),
        2322162807,
        "Stake 1 vout mismatch for vector 2"
    );
    assert_eq!(
        stake1["amount"].as_f64().unwrap(),
        32911105.45,
        "Stake 1 amount mismatch for vector 2"
    );
    assert_eq!(
        stake1["height"].as_u64().unwrap(),
        426611719,
        "Stake 1 height mismatch for vector 2"
    );
    assert_eq!(
        stake1["iscoinbase"].as_bool().unwrap(),
        true,
        "Stake 1 iscoinbase mismatch for vector 2"
    );

    // Check second stake details
    let stake2 = &stakes[1];
    assert_eq!(
        stake2["txid"].as_str().unwrap(),
        "300cbba81ef40a6d269be1e931ccb58c074ace4a9b06cc0f2a2c9bf1e176ede4",
        "Stake 2 txid mismatch for vector 2"
    );
    assert_eq!(
        stake2["vout"].as_u64().unwrap(),
        2507977928,
        "Stake 2 vout mismatch for vector 2"
    );
    assert_eq!(
        stake2["amount"].as_f64().unwrap(),
        28663702.16,
        "Stake 2 amount mismatch for vector 2"
    );
    assert_eq!(
        stake2["height"].as_u64().unwrap(),
        1298955966,
        "Stake 2 height mismatch for vector 2"
    );
    assert_eq!(
        stake2["iscoinbase"].as_bool().unwrap(),
        true,
        "Stake 2 iscoinbase mismatch for vector 2"
    );

    // Check third stake details
    let stake3 = &stakes[2];
    assert_eq!(
        stake3["txid"].as_str().unwrap(),
        "2313cb59b19774df1f0b86e079ddac61c5846021324e4a36db154741868c09ac",
        "Stake 3 txid mismatch for vector 2"
    );
    assert_eq!(
        stake3["vout"].as_u64().unwrap(),
        35672324,
        "Stake 3 vout mismatch for vector 2"
    );
    assert_eq!(
        stake3["amount"].as_f64().unwrap(),
        39931600.86,
        "Stake 3 amount mismatch for vector 2"
    );
    assert_eq!(
        stake3["height"].as_u64().unwrap(),
        484677071,
        "Stake 3 height mismatch for vector 2"
    );
    assert_eq!(
        stake3["iscoinbase"].as_bool().unwrap(),
        true,
        "Stake 3 iscoinbase mismatch for vector 2"
    );

    // All stakes in vector 2 should have compressed public keys (start with 02
    // or 03)
    for (i, stake) in stakes.iter().enumerate() {
        let pubkey = stake["pubkey"].as_str().unwrap();
        assert!(
            pubkey.starts_with("02") || pubkey.starts_with("03"),
            "Stake {} public key should be compressed for vector 2",
            i + 1
        );
        assert_eq!(
            pubkey.len(),
            66,
            "Compressed public key should be 66 hex chars"
        );
    }
}

#[test]
fn test_delegation_vector() {
    // Test get-id command with delegation
    let output = proof_manager_cmd()
        .arg("get-id")
        .arg("--type")
        .arg("delegation")
        .arg(EXPECTED_DELEGATION_HEX)
        .output()
        .unwrap();

    assert!(output.status.success());
    let output_str = String::from_utf8(output.stdout).unwrap();
    let json: Value = serde_json::from_str(&output_str).unwrap();

    // Check delegation ID matches expected value
    assert_eq!(
        json["delegation_id"].as_str().unwrap(),
        EXPECTED_DELEGATION_ID,
        "Delegation ID mismatch"
    );
}

/// Test the validate command with proof vector 1
#[test]
fn test_proof_vector_1_validate() {
    // Run the validate command - expecting it to fail because payout script is
    // not standard
    let result = proof_manager_cmd()
        .arg("validate")
        .arg(EXPECTED_PROOF1)
        .output()
        .unwrap();

    let output = String::from_utf8(result.stdout)
        .expect("Command output should be valid UTF-8");

    // Parse the JSON output
    let validation_result: serde_json::Value = serde_json::from_str(&output)
        .expect("validate command should return valid JSON");

    // Check that we get a validation result with valid field
    assert!(
        validation_result.get("valid").is_some(),
        "Validation result should have 'valid' field, got: {}",
        output
    );

    let is_valid = validation_result["valid"]
        .as_bool()
        .expect("Valid field should be a boolean");

    // The test proof should be invalid
    assert!(
        !is_valid,
        "Test proof vector should be invalid, but validation passed. Output: \
         {}",
        output
    );

    // Should have an error field for invalid proofs
    assert!(
        validation_result.get("error").is_some(),
        "Invalid proof should have error field, got: {}",
        output
    );

    // Check that the error message contains the expected reason
    let error_msg = validation_result["error"]
        .as_str()
        .expect("Error field should be a string");

    assert!(
        error_msg.contains("Payout script is not standard"),
        "Expected error about payout script not being standard, but got: {}",
        error_msg
    );

    // Check that exit code is non-zero for invalid proofs
    assert_ne!(
        result.status.code(),
        Some(0),
        "Invalid proof should exit with non-zero code"
    );
}

#[test]
fn test_proof_vector_2_validate() {
    // Test validate command with proof vector 2 - expecting it to fail because
    // stake amounts are below dust threshold
    let result = proof_manager_cmd()
        .arg("validate")
        .arg(EXPECTED_PROOF2)
        .output()
        .unwrap();

    let output = String::from_utf8(result.stdout)
        .expect("Command output should be valid UTF-8");

    let validation_result: serde_json::Value = serde_json::from_str(&output)
        .expect("validate command should return valid JSON");

    let is_valid = validation_result["valid"]
        .as_bool()
        .expect("Valid field should be a boolean");

    // The test proof should be invalid
    assert!(
        !is_valid,
        "Test proof vector 2 should be invalid, but validation passed. \
         Output: {}",
        output
    );

    // Should have an error field for invalid proofs
    assert!(
        validation_result.get("error").is_some(),
        "Invalid proof should have error field, got: {}",
        output
    );

    // Check that the error message contains the expected reason
    let error_msg = validation_result["error"]
        .as_str()
        .expect("Error field should be a string");

    assert!(
        error_msg.contains("Stake amount below dust threshold"),
        "Expected error about stake amount below dust threshold, but got: {}",
        error_msg
    );

    // Check that exit code is non-zero for invalid proofs
    assert_ne!(
        result.status.code(),
        Some(0),
        "Invalid proof should exit with non-zero code"
    );
}

#[test]
fn test_stakes_roundtrip() {
    // Step 1: Decode hex to JSON
    let output = proof_manager_cmd()
        .arg("decode")
        .arg(EXPECTED_STAKES_HEX)
        .output()
        .unwrap();
    assert!(output.status.success());
    let json_output = String::from_utf8(output.stdout).unwrap();

    // Step 2: Save JSON to temporary file
    let temp_json_file = "temp_stakes_roundtrip.json";
    std::fs::write(temp_json_file, &json_output)
        .expect("Failed to write temporary JSON file");

    // Step 3: Decode JSON back to hex
    let hex_output = proof_manager_cmd()
        .arg("decode")
        .arg("-i")
        .arg(temp_json_file)
        .arg("-f")
        .arg("hex")
        .output()
        .unwrap();
    assert!(hex_output.status.success());
    let hex_output = String::from_utf8(hex_output.stdout).unwrap();

    // Step 4: Clean up temporary file
    std::fs::remove_file(temp_json_file)
        .expect("Failed to remove temporary JSON file");

    // Step 5: Compare hex outputs
    let expected_hex = EXPECTED_STAKES_HEX.to_lowercase();
    let actual_hex = hex_output.trim().to_lowercase();

    assert_eq!(
        actual_hex, expected_hex,
        "Stakes roundtrip failed: expected '{}', got '{}'",
        expected_hex, actual_hex
    );
}

#[test]
fn test_proof_roundtrip() {
    // Step 1: Decode hex to JSON
    let output = proof_manager_cmd()
        .arg("decode")
        .arg(EXPECTED_PROOF1)
        .output()
        .unwrap();
    assert!(output.status.success());
    let json_output = String::from_utf8(output.stdout).unwrap();

    // Step 2: Save JSON to temporary file
    let temp_json_file = "temp_proof_roundtrip.json";
    std::fs::write(temp_json_file, &json_output)
        .expect("Failed to write temporary JSON file");

    // Step 3: Decode JSON back to hex
    let hex_output = proof_manager_cmd()
        .arg("decode")
        .arg("-i")
        .arg(temp_json_file)
        .arg("-f")
        .arg("hex")
        .output()
        .unwrap();
    assert!(hex_output.status.success());
    let hex_output = String::from_utf8(hex_output.stdout).unwrap();

    // Step 4: Clean up temporary file
    std::fs::remove_file(temp_json_file)
        .expect("Failed to remove temporary JSON file");

    // Step 5: Compare hex outputs
    let expected_hex = EXPECTED_PROOF1.to_lowercase();
    let actual_hex = hex_output.trim().to_lowercase();

    assert_eq!(
        actual_hex, expected_hex,
        "Proof roundtrip failed: expected '{}', got '{}'",
        expected_hex, actual_hex
    );
}

#[test]
fn test_delegation_roundtrip() {
    // Step 1: Decode hex to JSON
    let output = proof_manager_cmd()
        .arg("decode")
        .arg(EXPECTED_DELEGATION_HEX)
        .output()
        .unwrap();
    assert!(output.status.success());
    let json_output = String::from_utf8(output.stdout).unwrap();

    // Step 2: Save JSON to temporary file
    let temp_json_file = "temp_delegation_roundtrip.json";
    std::fs::write(temp_json_file, &json_output)
        .expect("Failed to write temporary JSON file");

    // Step 3: Decode JSON back to hex
    let hex_output = proof_manager_cmd()
        .arg("decode")
        .arg("-i")
        .arg(temp_json_file)
        .arg("-f")
        .arg("hex")
        .output()
        .unwrap();
    assert!(hex_output.status.success());
    let hex_output = String::from_utf8(hex_output.stdout).unwrap();

    // Step 4: Clean up temporary file
    std::fs::remove_file(temp_json_file)
        .expect("Failed to remove temporary JSON file");

    // Step 5: Compare hex outputs
    let expected_hex = EXPECTED_DELEGATION_HEX.to_lowercase();
    let actual_hex = hex_output.trim().to_lowercase();

    assert_eq!(
        actual_hex, expected_hex,
        "Delegation roundtrip failed: expected '{}', got '{}'",
        expected_hex, actual_hex
    );
}

/// Helper function to run CLI command with file paths (replaces
/// run_cli_command_with_files)
fn run_cli_command_with_files(args: &[&str]) -> Result<String, String> {
    let output = proof_manager_cmd()
        .args(args)
        .output()
        .map_err(|e| format!("Failed to run command: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "Command failed with exit code {:?}: {}",
            output.status.code(),
            stderr
        ));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

/// Test stake and proof signing via the sign command
#[test]
fn test_stake_and_proof_signing() {
    // Step 1: Sign a stake
    let stakes_file = "tests/vectors/stakes_test.json";
    let proof_file = "tests/vectors/proof_test.json";

    // Test with hex private key
    let stake_sign_output_hex = run_cli_command_with_files(&[
        "sign",
        "--type",
        "stakes",
        "--input-file",
        stakes_file,
        "--commitment",
        proof_file,
        "--private-key",
        "0c28fca386c7a227600b2fe50b7cae11ec86d3bf1fbe471be89827e19d72aa1d",
    ])
    .expect("Failed to sign stake with hex key");

    // Test with WIF private key
    let stake_sign_output_wif = run_cli_command_with_files(&[
        "sign",
        "--type",
        "stakes",
        "--input-file",
        stakes_file,
        "--commitment",
        proof_file,
        "--private-key",
        "5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ",
    ])
    .expect("Failed to sign stake with WIF key");

    // Verify hex and WIF produce identical results
    assert_eq!(
        stake_sign_output_hex, stake_sign_output_wif,
        "Hex and WIF private keys produced different stake signing results"
    );

    // Use hex result for rest of test
    let stake_sign_output = stake_sign_output_hex;

    // Step 2: Validate the signed stake (as JSON)
    let signed_stake_file = create_temp_file(&stake_sign_output);
    let stake_validate_json_output = run_cli_command_with_files(&[
        "validate",
        "--type",
        "stakes",
        "--input-file",
        signed_stake_file.path().to_str().unwrap(),
    ])
    .expect("Failed to validate signed stake JSON");

    // The validate command should return {"valid": true} for valid stakes
    assert!(
        stake_validate_json_output.contains("\"valid\":true"),
        "Signed stake JSON validation failed: {}",
        stake_validate_json_output
    );

    // Step 3: Decode the signed stake to hex and validate it
    let stake_hex_output = run_cli_command_with_files(&[
        "decode",
        "--type",
        "stakes",
        "--input-file",
        signed_stake_file.path().to_str().unwrap(),
        "--format",
        "hex",
    ])
    .expect("Failed to convert signed stake to hex");

    let stake_hex = stake_hex_output.trim();

    // Validate the hex
    let stake_hex_file = create_temp_file(&stake_hex);
    let stake_validate_hex_output = run_cli_command_with_files(&[
        "validate",
        "--type",
        "stakes",
        "--input-file",
        stake_hex_file.path().to_str().unwrap(),
    ])
    .expect("Failed to validate signed stake hex");

    assert!(
        stake_validate_hex_output.contains("\"valid\":true"),
        "Signed stake hex validation failed: {}",
        stake_validate_hex_output
    );

    // Step 4: Create tobesigned_proof.json by filling the stake with the result
    // of the stake sign command
    let signed_stake_json: Value = serde_json::from_str(&stake_sign_output)
        .expect("Failed to parse signed stake JSON");

    let signed_stakes = signed_stake_json["stakes"]
        .as_array()
        .expect("Failed to get stakes array from signed stake JSON");

    // Read the original proof_test.json to get the correct structure
    let proof_content = std::fs::read_to_string(proof_file)
        .expect("Failed to read proof_test.json");
    let original_proof: serde_json::Value =
        serde_json::from_str(&proof_content)
            .expect("Failed to parse original proof JSON");
    let mut proof_to_sign = original_proof.clone();
    proof_to_sign["proof"]["stakes"] =
        serde_json::Value::Array(signed_stakes.clone());

    // Write the proof to sign to a temporary file
    let proof_to_sign_str = serde_json::to_string_pretty(&proof_to_sign)
        .expect("Failed to serialize proof to sign");

    std::fs::write("tobesigned_proof.json", &proof_to_sign_str)
        .expect("Failed to write proof to sign file");

    // Step 5: Sign the proof
    // Input: tobesigned_proof.json, private key:
    // 12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f747 (WIF:
    // Kwr371tjA9u2rFSMZjTNun2PXXP3WPZu2afRHTcta6KxEUdm1vEw)
    let proof_to_sign_file = create_temp_file(&proof_to_sign_str);
    // Test with hex private key
    let proof_sign_output_hex = run_cli_command_with_files(&[
        "sign",
        "--type",
        "proof",
        "--input-file",
        proof_to_sign_file.path().to_str().unwrap(),
        "--private-key",
        "12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f747",
    ])
    .expect("Failed to sign proof with hex key");

    // Test with WIF private key
    let proof_sign_output_wif = run_cli_command_with_files(&[
        "sign",
        "--type",
        "proof",
        "--input-file",
        proof_to_sign_file.path().to_str().unwrap(),
        "--private-key",
        "Kwr371tjA9u2rFSMZjTNun2PXXP3WPZu2afRHTcta6KxEUdm1vEw",
    ])
    .expect("Failed to sign proof with WIF key");

    // Verify hex and WIF produce identical results
    assert_eq!(
        proof_sign_output_hex, proof_sign_output_wif,
        "Hex and WIF private keys produced different proof signing results"
    );

    // Use hex result for rest of test
    let proof_sign_output = proof_sign_output_hex;

    // Step 6: Validate the signed proof (as JSON)
    let signed_proof_file = create_temp_file(&proof_sign_output);
    let proof_validate_json_output = run_cli_command_with_files(&[
        "validate",
        "--type",
        "proof",
        "--input-file",
        signed_proof_file.path().to_str().unwrap(),
    ])
    .expect("Failed to validate signed proof JSON");

    assert!(
        proof_validate_json_output.contains("\"valid\":true"),
        "Signed proof JSON validation failed: {}",
        proof_validate_json_output
    );

    // Step 7: Decode the signed proof to hex and validate it
    let proof_hex_output = run_cli_command_with_files(&[
        "decode",
        "--type",
        "proof",
        "--input-file",
        signed_proof_file.path().to_str().unwrap(),
        "--format",
        "hex",
    ])
    .expect("Failed to convert signed proof to hex");

    let proof_hex = proof_hex_output.trim();

    // Validate the hex
    let proof_hex_file = create_temp_file(&proof_hex);
    let proof_validate_hex_output = run_cli_command_with_files(&[
        "validate",
        "--type",
        "proof",
        "--input-file",
        proof_hex_file.path().to_str().unwrap(),
    ])
    .expect("Failed to validate signed proof hex");

    assert!(
        proof_validate_hex_output.contains("\"valid\":true"),
        "Signed proof hex validation failed: {}",
        proof_validate_hex_output
    );

    // Clean up temporary files
    std::fs::remove_file("tobesigned_proof.json").unwrap_or_else(|_| {});
    std::fs::remove_file(&signed_stake_file).unwrap_or_else(|_| {});
    std::fs::remove_file(&stake_hex_file).unwrap_or_else(|_| {});
    std::fs::remove_file(&proof_to_sign_file).unwrap_or_else(|_| {});
    std::fs::remove_file(&signed_proof_file).unwrap_or_else(|_| {});
    std::fs::remove_file(&proof_hex_file).unwrap_or_else(|_| {});
}

#[test]
fn test_delegation_signing() {
    const EXPECTED_DELEGATION_HEX: &str =
        "02d49e9dcfbb4739baa04d6e5291cecc3c5b15a1b7115a2a8b4078c8843028c121023b\
        eefdde700a6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3012103e49\
        f9df52de2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e645effa701924fe\
        7367835b3a0fb30bcc706f00624633980f601987400bb24551cf57bd9f2d106f5c584e4\
        e0efa2069a606cf1aa64f776ccb3304f8486eb3d1ce3acf";

    // Use the unsigned delegation file directly
    let unsigned_delegation_file =
        "tests/vectors/unsigned_delegation_test.json";

    // Step 1: Sign the delegation with hex private key
    let private_key_hex =
        "d31e78a596830a967458f5d8c5117842af0366a1484b5c84bd521b2d61a6915a";
    let sign_output_hex = run_cli_command_with_files(&[
        "sign",
        "--type",
        "delegation",
        "--input-file",
        unsigned_delegation_file,
        "--private-key",
        private_key_hex,
    ])
    .expect("Delegation signing with hex key failed");

    // Sign the delegation with WIF private key
    let private_key_wif =
        "L4J6gEE4wL9ji2EQbzS5dPMTTsw8LRvcMst1Utij4e3X5ccUSdqW";
    let sign_output_wif = run_cli_command_with_files(&[
        "sign",
        "--type",
        "delegation",
        "--input-file",
        unsigned_delegation_file,
        "--private-key",
        private_key_wif,
    ])
    .expect("Delegation signing with WIF key failed");

    // Verify hex and WIF produce identical results
    assert_eq!(
        sign_output_hex, sign_output_wif,
        "Hex and WIF private keys produced different delegation signing \
         results"
    );

    // Use hex result for rest of test
    let sign_output = sign_output_hex;

    let signed_delegation_json = sign_output;

    // Create temporary file for signed delegation
    let signed_delegation_file = create_temp_file(&signed_delegation_json);

    // Step 2: Validate the signed delegation JSON
    let validate_json_result = run_cli_command_with_files(&[
        "validate",
        "--type",
        "delegation",
        "--input-file",
        &signed_delegation_file.path().to_str().unwrap(),
    ])
    .expect("JSON validation failed");

    // The validate command should return {"valid": true} for valid delegations
    assert!(
        validate_json_result.contains("\"valid\":true"),
        "Signed delegation JSON validation failed: {}",
        validate_json_result
    );

    // Step 3: Decode the signed delegation to hex
    let decode_output = run_cli_command_with_files(&[
        "decode",
        "--type",
        "delegation",
        "--input-file",
        &signed_delegation_file.path().to_str().unwrap(),
        "--format",
        "hex",
    ])
    .expect("Delegation decode failed");

    let signed_delegation_hex = decode_output.trim().to_string();

    // Create temporary file for hex
    let delegation_hex_file = create_temp_file(&signed_delegation_hex);

    // Step 4: Validate the hex
    let validate_hex_result = run_cli_command_with_files(&[
        "validate",
        "--type",
        "delegation",
        "--input-file",
        &delegation_hex_file.path().to_str().unwrap(),
    ])
    .expect("Hex validation failed");

    // The validate command should return {"valid": true} for valid delegations
    assert!(
        validate_hex_result.contains("\"valid\":true"),
        "Signed delegation hex validation failed: {}",
        validate_hex_result
    );

    // Step 5: Check the signed delegation hex matches expected value
    assert_eq!(
        signed_delegation_hex, EXPECTED_DELEGATION_HEX,
        "Signed delegation hex does not match expected value"
    );

    // Cleanup temporary files
    std::fs::remove_file(&signed_delegation_file).unwrap_or_else(|_| {});
    std::fs::remove_file(&delegation_hex_file).unwrap_or_else(|_| {});
}

#[test]
fn test_delegation_incremental_signing() {
    // Step 1: Call the delegate command on EXPECTED_PROOF1 to delegated pubkey
    // 03e49f9df52de2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e645ef
    let proof_hex_file = create_temp_file(EXPECTED_PROOF1);
    let delegate_output = run_cli_command_with_files(&[
        "delegate",
        "--input-file",
        proof_hex_file.path().to_str().unwrap(),
        "--pubkey",
        "03e49f9df52de2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e645ef",
    ])
    .expect("Failed to delegate proof");

    // Step 2: Sign the delegation using the privkey
    // 12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f747 (WIF:
    // Kwr371tjA9u2rFSMZjTNun2PXXP3WPZu2afRHTcta6KxEUdm1vEw) and
    // store the result. We will call it 1level_delegation.
    let unsigned_delegation_file = create_temp_file(&delegate_output);
    // Test with hex private key
    let sign_output_hex = run_cli_command_with_files(&[
        "sign",
        "--type",
        "delegation",
        "--input-file",
        &unsigned_delegation_file.path().to_str().unwrap(),
        "--private-key",
        "12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f747",
    ])
    .expect("Failed to sign 1level delegation with hex key");

    // Test with WIF private key
    let sign_output_wif = run_cli_command_with_files(&[
        "sign",
        "--type",
        "delegation",
        "--input-file",
        &unsigned_delegation_file.path().to_str().unwrap(),
        "--private-key",
        "Kwr371tjA9u2rFSMZjTNun2PXXP3WPZu2afRHTcta6KxEUdm1vEw",
    ])
    .expect("Failed to sign 1level delegation with WIF key");

    // Verify hex and WIF produce identical results
    assert_eq!(
        sign_output_hex, sign_output_wif,
        "Hex and WIF private keys produced different 1level delegation \
         signing results"
    );

    // Use hex result for rest of test
    let sign_output = sign_output_hex;

    let level1_delegation_json = sign_output;

    // Step 3: Validate 1level_delegation using the json output, it should be
    // valid
    let level1_delegation_file = create_temp_file(&level1_delegation_json);
    let validate_json_result = run_cli_command_with_files(&[
        "validate",
        "--type",
        "delegation",
        "--input-file",
        &level1_delegation_file.path().to_str().unwrap(),
    ])
    .expect("Failed to validate 1level delegation JSON");

    assert!(
        validate_json_result.contains("\"valid\":true"),
        "1level delegation JSON validation failed: {}",
        validate_json_result
    );

    // Step 4: Decode the 1level_delegation and convert to hex
    let decode_output = run_cli_command_with_files(&[
        "decode",
        "--type",
        "delegation",
        "--input-file",
        &level1_delegation_file.path().to_str().unwrap(),
        "--format",
        "hex",
    ])
    .expect("Failed to decode 1level delegation");

    let level1_delegation_hex = decode_output.trim().to_string();

    // Step 5: Validate against 1level_delegation as hex, it should also be
    // valid.
    let level1_hex_file = create_temp_file(&level1_delegation_hex);
    let validate_hex_result = run_cli_command_with_files(&[
        "validate",
        "--type",
        "delegation",
        "--input-file",
        &level1_hex_file.path().to_str().unwrap(),
    ])
    .expect("Failed to validate 1level delegation hex");

    assert!(
        validate_hex_result.contains("\"valid\":true"),
        "1level delegation hex validation failed: {}",
        validate_hex_result
    );

    // Step 6: Check that 1level_delegation as hex exactly matches
    // EXPECTED_1LEVEL_DELEGATION_HEX
    assert_eq!(
        level1_delegation_hex, EXPECTED_1LEVEL_DELEGATION_HEX,
        "1level delegation hex does not match expected value: expected '{}', \
         got '{}'",
        EXPECTED_1LEVEL_DELEGATION_HEX, level1_delegation_hex
    );

    // Step 7: Call the delegate command on the 1level_delegation, using the
    // delegated pubkey
    // 03aac52f4cfca700e7e9824298e0184755112e32f359c832f5f6ad2ef62a2c024a
    let delegate2_output = run_cli_command_with_files(&[
        "delegate",
        "--input-file",
        &level1_delegation_file.path().to_str().unwrap(),
        "--pubkey",
        "03aac52f4cfca700e7e9824298e0184755112e32f359c832f5f6ad2ef62a2c024a",
    ])
    .expect("Failed to delegate 1level delegation");

    // Step 8: Sign the resulting unsigned delegation using the private key
    // 7077da4a47f6c85a21fe6c6cf1285c0fa06915871744ab1e5a5b741027884d00 (WIF:
    // KzzLLtiYiyFcTXPWUzywt2yEKk5FxkGbMfKhWgBd4oZdt8t8kk77). Store
    // the result, it will be called 2level_delegation.
    let unsigned_2level_file = create_temp_file(&delegate2_output);
    // Test with hex private key
    let sign2_output_hex = run_cli_command_with_files(&[
        "sign",
        "--type",
        "delegation",
        "--input-file",
        &unsigned_2level_file.path().to_str().unwrap(),
        "--private-key",
        "7077da4a47f6c85a21fe6c6cf1285c0fa06915871744ab1e5a5b741027884d00",
    ])
    .expect("Failed to sign 2level delegation with hex key");

    // Test with WIF private key
    let sign2_output_wif = run_cli_command_with_files(&[
        "sign",
        "--type",
        "delegation",
        "--input-file",
        &unsigned_2level_file.path().to_str().unwrap(),
        "--private-key",
        "KzzLLtiYiyFcTXPWUzywt2yEKk5FxkGbMfKhWgBd4oZdt8t8kk77",
    ])
    .expect("Failed to sign 2level delegation with WIF key");

    // Verify hex and WIF produce identical results
    assert_eq!(
        sign2_output_hex, sign2_output_wif,
        "Hex and WIF private keys produced different 2level delegation \
         signing results"
    );

    // Use hex result for rest of test
    let sign2_output = sign2_output_hex;

    let level2_delegation_json = sign2_output;

    // Step 9: Run the validate command against the 2level_delegation as json,
    // it should be valid
    let level2_delegation_file = create_temp_file(&level2_delegation_json);
    let validate2_json_result = run_cli_command_with_files(&[
        "validate",
        "--type",
        "delegation",
        "--input-file",
        &level2_delegation_file.path().to_str().unwrap(),
    ])
    .expect("Failed to validate 2level delegation JSON");

    assert!(
        validate2_json_result.contains("\"valid\":true"),
        "2level delegation JSON validation failed: {}",
        validate2_json_result
    );

    // Step 10: Decode the 2level_delegation and convert it to hex.
    let decode2_output = run_cli_command_with_files(&[
        "decode",
        "--type",
        "delegation",
        "--input-file",
        &level2_delegation_file.path().to_str().unwrap(),
        "--format",
        "hex",
    ])
    .expect("Failed to decode 2level delegation");

    let level2_delegation_hex = decode2_output.trim().to_string();

    // Step 11: Run the validate command against the 2level_delegation as hex,
    // it should also be valid
    let level2_hex_file = create_temp_file(&level2_delegation_hex);
    let validate2_hex_result = run_cli_command_with_files(&[
        "validate",
        "--type",
        "delegation",
        "--input-file",
        &level2_hex_file.path().to_str().unwrap(),
    ])
    .expect("Failed to validate 2level delegation hex");

    assert!(
        validate2_hex_result.contains("\"valid\":true"),
        "2level delegation hex validation failed: {}",
        validate2_hex_result
    );

    // Step 12: Check the 2level_delegation hex exactly matches
    // EXPECTED_2LEVEL_DELEGATION_HEX
    assert_eq!(
        level2_delegation_hex, EXPECTED_2LEVEL_DELEGATION_HEX,
        "2level delegation hex does not match expected value: expected '{}', \
         got '{}'",
        EXPECTED_2LEVEL_DELEGATION_HEX, level2_delegation_hex
    );

    // Cleanup temporary files
    std::fs::remove_file(&proof_hex_file).unwrap_or_else(|_| {});
    std::fs::remove_file(&unsigned_delegation_file).unwrap_or_else(|_| {});
    std::fs::remove_file(&level1_delegation_file).unwrap_or_else(|_| {});
    std::fs::remove_file(&level1_hex_file).unwrap_or_else(|_| {});
    std::fs::remove_file(&unsigned_2level_file).unwrap_or_else(|_| {});
    std::fs::remove_file(&level2_delegation_file).unwrap_or_else(|_| {});
    std::fs::remove_file(&level2_hex_file).unwrap_or_else(|_| {});
}
