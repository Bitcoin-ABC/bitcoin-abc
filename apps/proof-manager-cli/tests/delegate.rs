// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use predicates::prelude::*;

mod fixture;
use fixture::proof_manager_cmd;

#[test]
fn test_delegate_from_proof() {
    // Create delegation directly from JSON file
    proof_manager_cmd()
        .arg("delegate")
        .arg("--input-file")
        .arg("tests/vectors/proof_with_single_stake.json")
        .arg("--pubkey")
        .arg("0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b\
16f81798")
        .assert()
        .success()
        .stdout(predicate::str::contains("delegation"));
}

#[test]
fn test_delegate_from_delegation() {
    // Create delegation from another delegation (2-level delegation)
    proof_manager_cmd()
        .arg("delegate")
        .arg("--input-file")
        .arg("tests/vectors/single_level_delegation.json")
        .arg("--pubkey")
        .arg(
                "03e49f9df52de2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e6\
                45ef"
        )
        .assert()
        .success()
        .stdout(predicate::str::contains("delegation"));
}
