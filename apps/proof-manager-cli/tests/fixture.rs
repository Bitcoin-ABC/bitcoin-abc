// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::fs;

use assert_cmd::Command;
use tempfile::NamedTempFile;

/// Helper function to create a test command
#[allow(dead_code)]
pub fn proof_manager_cmd() -> Command {
    Command::cargo_bin("proof-manager").unwrap()
}

/// Helper function to create a temporary file with content
#[allow(dead_code)]
pub fn create_temp_file(content: &str) -> NamedTempFile {
    let temp_file = NamedTempFile::new().unwrap();
    fs::write(temp_file.path(), content).unwrap();
    temp_file
}

/// Helper function to load JSON test vectors from files
#[allow(dead_code)]
pub fn load_test_vector(filename: &str) -> String {
    let path = format!("tests/vectors/{}", filename);
    std::fs::read_to_string(&path).unwrap_or_else(|e| {
        panic!("Failed to read test vector {}: {}", path, e)
    })
}

/// Common test constants
#[allow(dead_code)]
pub const TEST_PRIVATE_KEY: &str =
    "0000000000000000000000000000000000000000000000000000000000000002";
#[allow(dead_code)]
pub const PROOF_MASTER_PRIVATE_KEY: &str =
    "12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f747";
#[allow(dead_code)]
pub const STAKES_PRIVATE_KEY: &str =
    "0c28fca386c7a227600b2fe50b7cae11ec86d3bf1fbe471be89827e19d72aa1d";

// Test vectors from electrum-abc test_avalanche.py
// This section replicates the test vectors from
// electrum/electrumabc/tests/test_avalanche.py to ensure the proof-manager CLI
// returns the same values as the Python implementation.

/// Test vector 1: Single stake proof from test_avalanche.py
#[allow(dead_code)]
pub const EXPECTED_PROOF1: &str =
    "2a00000000000000fff053650000000021030b4c866585dd868a9d62348a9cd008d6a31293\
    7048fff31670e7e920cfc7a74401b7fc19792583e9cb39843fc5e22a4e3648ab1cb18a70290\
    b341ee8d4f550ae24000000001027000000000000788814004104d0de0aaeaefad02b8bdc8a\
    01a1b8b11c696bd3d66a2c5f10780d95b7df42645cd85228a6fb29940e858e7e55842ae2bd1\
    15d1ed7cc0e82d934e929c97648cb0abd9740c85a05a7d543c3d301273d79ff7054758579e3\
    0cc05cdfe1aca3374adfe55104b409ffce4a2f19d8a5981d5f0c79b23edac73352ab2898aca\
    89270282500788bac77505ca17d6d0dcc946ced3990c2857c73743cd74d881fcbcbc8eaaa8d\
    72812ebb9a556610687ca592fe907a4af024390e0a9260c4f5ea59e7ac426cc5";
#[allow(dead_code)]
pub const EXPECTED_LIMITED_ID1: &str =
    "e5845c13b93a1c207bd72033c185a2f833eef1748ee62fd49161119ac2c22864";
#[allow(dead_code)]
pub const EXPECTED_PROOF_ID1: &str =
    "74c91491e5d6730ea1701817ed6c34e9627904fc3117647cc7d4bce73f56e45a";

/// Test vector 2: Three stakes proof from test_avalanche.py
#[allow(dead_code)]
pub const EXPECTED_PROOF2: &str =
    "c964aa6fde575e4ce8404581c7be874e21023beefdde700a6bc02036335b4df141c8bc67bb\
    05a971f5ac2745fd683797dde3030b1e5f35704cb63360aa3d5f444ee35eea4c154c1af6d4e\
    7595b409ada4b42377764698a915c2ac4000000000f28db322102449fb5237efe8f647d32e8\
    b64f06c22d1d40368eaca2a71ffc6a13ecc8bce680da44b13031186044cd54f0084dcbe703b\
    db74058a1ddd3efffb347c04d45ced339a41eecedad05f8380a4115016404a2787f51e27165\
    171976d1925944df0231e4ed76e1f19b2c2a0fcc069b4ace4a078cb5cc31e9e19b266d0af41\
    ea8bb0c30c8b47c95a856d9aa000000007dfdd89a2102449fb5237efe8f647d32e8b64f06c2\
    2d1d40368eaca2a71ffc6a13ecc8bce68019201c99059772f6452efb50579edc11370a94ea0\
    b7fc61f22cbacc1339a22a04a41b20066c617138d715d95629a837e4f74633f823dddda0a0a\
    40d0f37b59a4ac098c86414715db364a4e32216084c561acdd79e0860b1fdf7497b159cb132\
    30451200296c902ee000000009f2bc7392102449fb5237efe8f647d32e8b64f06c22d1d4036\
    8eaca2a71ffc6a13ecc8bce6800eb604ecae881ce1eb68dcc1f94725f70aedec1e60077b59e\
    b4ce4b44d5475ba16b8b0b370cad583eaf342b4442bc0f09001f1cb1074526c58f2047892f7\
    9c252321038439233261789dd340bdc1450172d9c671b72ee8c0b2736ed2a3a250760897fda\
    cd6bf9c0c881001dc5749966a2f6562f291339521b3894326c0740de880565549fc6838933c\
    95fbee05ff547ae89bad63e92f552ca3ea4cc01ac3e4869d0dc61b";
#[allow(dead_code)]
pub const EXPECTED_LIMITED_ID2: &str =
    "7223b8cc572bdf8f123ee7dd0316962f0367b0be8bce9b6e9465d1f413d95616";
#[allow(dead_code)]
pub const EXPECTED_PROOF_ID2: &str =
    "95c9673bc14f3c36e9310297e8df81867b42dd1a7bb7944aeb6c1797fbd2a6d5";

// Test delegation from test_avalanche.py
#[allow(dead_code)]
pub const EXPECTED_DELEGATION_HEX: &str =
    "46116afa1abaab88b96c115c248b77c7d8e099565c5fb40731482c6655ca450d21023beefd\
    de700a6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3012103e49f9df52de\
    2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e645ef7d512ddbea7c88dcf38412\
    b58374856a466e165797a69321c0928a89c64521f7e2e767c93de645ef5125ec901dcd51347\
    787ca29771e7786bbe402d2d5ead0dc";
#[allow(dead_code)]
pub const EXPECTED_DELEGATION_ID: &str =
    "ffcd49dc98ebdbc90e731a7b0c89939bfe082f15f3aa82aca657176b83669185";

// Test delegation from Electrum test_avalanche.py
// TestAvalancheDelegationBuilder test case
#[allow(dead_code)]
pub const EXPECTED_1LEVEL_DELEGATION_HEX: &str =
    "6428c2c29a116191d42fe68e74f1ee33f8a285c13320d77b201c3ab9135c84e521030b4c86\
    6585dd868a9d62348a9cd008d6a312937048fff31670e7e920cfc7a744012103e49f9df52de\
    2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e645ef22c1dd0a15c32d251dd993\
    dde979e8f2751a468d622ca7db10bfc11180497d0ff4be928f362fd8fcd5259cef923bb4718\
    40c307e9bc4f89e5426b4e67b72d90e";

#[allow(dead_code)]
pub const EXPECTED_2LEVEL_DELEGATION_HEX: &str =
    "6428c2c29a116191d42fe68e74f1ee33f8a285c13320d77b201c3ab9135c84e521030b4c86\
    6585dd868a9d62348a9cd008d6a312937048fff31670e7e920cfc7a744022103e49f9df52de\
    2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e645ef22c1dd0a15c32d251dd993\
    dde979e8f2751a468d622ca7db10bfc11180497d0ff4be928f362fd8fcd5259cef923bb4718\
    40c307e9bc4f89e5426b4e67b72d90e2103aac52f4cfca700e7e9824298e0184755112e32f3\
    59c832f5f6ad2ef62a2c024a77c153340bb951e56df134c66042426f4fe33b670bb2d485f6d\
    96f9d0d1db525dfa449565b8f424d71615d5f6c9399334b2550d554577ffa2ee8d758eb8ded\
    88";

/// Test vector for stakes roundtrip
#[allow(dead_code)]
pub const EXPECTED_STAKES_HEX: &str =
    "b7fc19792583e9cb39843fc5e22a4e3648ab1cb18a70290b341ee8d4f550ae240000000010\
    27000000000000788814004104d0de0aaeaefad02b8bdc8a01a1b8b11c696bd3d66a2c5f107\
    80d95b7df42645cd85228a6fb29940e858e7e55842ae2bd115d1ed7cc0e82d934e929c97648\
    cb0abd9740c85a05a7d543c3d301273d79ff7054758579e30cc05cdfe1aca3374adfe55104b\
    409ffce4a2f19d8a5981d5f0c79b23edac73352ab2898aca892702825";
#[allow(dead_code)]
pub const EXPECTED_STAKE_ID: &str =
    "6a7c6d1790a370ba1324e3d49e23d7eaf5850988437111a0a1b51433ceb4183e";
