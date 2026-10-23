// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::fs;
#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;

use serde_json::Value;

mod fixture;
use fixture::proof_manager_cmd;

#[test]
fn test_generate_keypair_stdout() {
    let output = proof_manager_cmd()
        .arg("generate-keypair")
        .assert()
        .success()
        .get_output()
        .stdout
        .clone();

    let keypair: Value =
        serde_json::from_slice(&output).expect("Valid keypair JSON");
    assert!(keypair.get("private_key_hex").is_some());
    assert!(keypair.get("private_key_wif").is_some());
    assert!(keypair.get("public_key").is_some());

    // Mainnet compressed WIF starts with K or L
    let wif = keypair["private_key_wif"].as_str().unwrap();
    assert!(
        wif.starts_with('K') || wif.starts_with('L'),
        "mainnet compressed WIF should start with K or L, got {}",
        wif
    );
}

#[test]
fn test_generate_keypair_testnet() {
    let output = proof_manager_cmd()
        .arg("generate-keypair")
        .arg("--testnet")
        .assert()
        .success()
        .get_output()
        .stdout
        .clone();

    let keypair: Value =
        serde_json::from_slice(&output).expect("Valid keypair JSON");
    assert!(keypair.get("private_key_hex").is_some());
    assert!(keypair.get("private_key_wif").is_some());
    assert!(keypair.get("public_key").is_some());

    // Testnet compressed WIF starts with c
    let wif = keypair["private_key_wif"].as_str().unwrap();
    assert!(
        wif.starts_with('c'),
        "testnet compressed WIF should start with c, got {}",
        wif
    );
}

#[cfg(unix)]
#[test]
fn test_generate_keypair_output_permissions() {
    let temp_dir = tempfile::tempdir().unwrap();
    let output_path = temp_dir.path().join("keypair.json");

    // Pre-create with world-readable mode to ensure overwrite also enforces
    // 0600.
    fs::write(&output_path, "{}").unwrap();
    let mut perms = fs::metadata(&output_path).unwrap().permissions();
    perms.set_mode(0o644);
    fs::set_permissions(&output_path, perms).unwrap();

    proof_manager_cmd()
        .arg("generate-keypair")
        .arg("--output")
        .arg(&output_path)
        .assert()
        .success();

    let mode = fs::metadata(&output_path).unwrap().permissions().mode() & 0o777;
    assert_eq!(mode, 0o600, "keypair file must be mode 0600");

    let content = fs::read_to_string(&output_path).unwrap();
    let keypair: Value =
        serde_json::from_str(&content).expect("Valid keypair JSON");
    assert!(keypair.get("private_key_hex").is_some());
    assert!(keypair.get("private_key_wif").is_some());
    assert!(keypair.get("public_key").is_some());
}
