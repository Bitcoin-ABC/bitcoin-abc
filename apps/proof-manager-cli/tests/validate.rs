// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use predicates::prelude::*;

mod fixture;
use fixture::proof_manager_cmd;

#[test]
fn test_validate_stakes_json() {
    proof_manager_cmd()
        .arg("validate")
        .arg("--type")
        .arg("stakes")
        .arg("--input-file")
        .arg("tests/vectors/signed_stakes.json")
        .assert()
        .success()
        .stdout(predicate::str::contains("\"valid\":true"));
}

#[test]
fn test_validate_proof_json() {
    proof_manager_cmd()
        .arg("validate")
        .arg("--type")
        .arg("proof")
        .arg("--input-file")
        .arg("tests/vectors/proof_with_single_stake.json")
        .assert()
        .success()
        .stdout(predicate::str::contains("\"valid\":true"));
}

#[test]
fn test_validate_delegation_json() {
    proof_manager_cmd()
        .arg("validate")
        .arg("--type")
        .arg("delegation")
        .arg("--input-file")
        .arg("tests/vectors/single_level_delegation.json")
        .assert()
        .success()
        .stdout(predicate::str::contains("\"valid\":true"));
}

#[test]
fn test_validate_unsigned_stakes_fails() {
    proof_manager_cmd()
        .arg("validate")
        .arg("--type")
        .arg("stakes")
        .arg("--input-file")
        .arg("tests/vectors/unsigned_stakes.json")
        .assert()
        .failure()
        .stdout(predicate::str::contains("\"valid\":false"))
        .stdout(predicate::str::contains("Cannot decode unsigned stake"));
}

#[test]
fn test_validate_unsigned_proof_fails() {
    proof_manager_cmd()
        .arg("validate")
        .arg("--type")
        .arg("proof")
        .arg("--input-file")
        .arg("tests/vectors/unsigned_proof.json")
        .assert()
        .failure()
        .stdout(predicate::str::contains("\"valid\":false"))
        .stdout(predicate::str::contains("Cannot decode unsigned proof"));
}

#[test]
fn test_validate_unsigned_delegation_fails() {
    proof_manager_cmd()
        .arg("validate")
        .arg("--type")
        .arg("delegation")
        .arg("--input-file")
        .arg("tests/vectors/unsigned_delegation.json")
        .assert()
        .failure()
        .stdout(predicate::str::contains("\"valid\":false"))
        .stdout(predicate::str::contains(
            "Cannot decode unsigned delegation",
        ));
}
