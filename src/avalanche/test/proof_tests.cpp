// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/proof.h>

#include <avalanche/proofbuilder.h>
#include <avalanche/test/util.h>
#include <avalanche/validation.h>
#include <coins.h>
#include <script/standard.h>
#include <streams.h>
#include <util/strencodings.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

using namespace avalanche;

BOOST_FIXTURE_TEST_SUITE(proof_tests, TestingSetup)

BOOST_AUTO_TEST_CASE(proof_random) {
    for (int i = 0; i < 1000; i++) {
        const uint32_t score = InsecureRand32();
        const Proof p = buildRandomProof(score);
        BOOST_CHECK_EQUAL(p.getScore(), score);

        ProofValidationResult expected_state =
            hasDustStake(p) ? ProofValidationResult::DUST_THRESOLD
                            : ProofValidationResult::NONE;

        ProofValidationState state;
        BOOST_CHECK_EQUAL(p.verify(state),
                          state.GetResult() == ProofValidationResult::NONE);
        BOOST_CHECK(state.GetResult() == expected_state);
    }
}

BOOST_AUTO_TEST_CASE(proofbuilder) {
    // Master key.
    auto key = CKey::MakeCompressedKey();
    const CPubKey master = key.GetPubKey();

    const uint64_t sequence = InsecureRandBits(64);
    const int64_t expiration = InsecureRandBits(64);

    ProofBuilder pb(sequence, expiration, master);

    for (int i = 0; i < 3; i++) {
        key.MakeNewKey(true);
        pb.addUTXO(COutPoint(TxId(GetRandHash()), InsecureRand32()),
                   int64_t(InsecureRand32()) * COIN / 100, InsecureRand32(),
                   InsecureRandBool(), key);
    }

    Proof p = pb.build();

    ProofValidationState state;
    BOOST_CHECK(p.verify(state));

    BOOST_CHECK_EQUAL(p.getSequence(), sequence);
    BOOST_CHECK_EQUAL(p.getExpirationTime(), expiration);
    BOOST_CHECK(p.getMaster() == master);

    BOOST_CHECK(state.GetResult() == ProofValidationResult::NONE);
}

struct TestVector {
    std::string name;
    std::string hex;
    ProofId proofid;
    uint32_t score;
    ProofValidationResult result;
};

BOOST_AUTO_TEST_CASE(deserialization) {
    std::vector<TestVector> testcases{
        {"No utxo staked",
         "96527eae083f1f24625f049d9e54bb9a2102a93d98bf42ab90cfc0bf9e7c634ed76a7"
         "3e95b02cacfd357b64e4fb6c92e92dd00",
         ProofId::fromHex("19f6631738a5a0196bf6152dcdb40de4675954567b444631cdec"
                          "52d4c39b5316"),
         0, ProofValidationResult::NO_STAKE},
        {"1 utxo staked",
         "a6d66db9fe9378fdd37a0ad2c01c2acd2103648144bb6a0c1d09b0f04d0df6d55f914"
         "fd81efc65f23a718b68b7c9e42bd5430145a4d07798547464daa53acefb7c97c0c415"
         "ed8e81e549ff56a0ef6f847fcc9ca855b36200fe38dce5060000e707d7274104fb662"
         "6e21dbd1cc9feeecdefc9213fdce2b51ac4bb44e1f8dc6f14c2052f5dd7bfaeb2267a"
         "97ca2bec6e0dd4acf50a66204bde1ebb5d6c551684cff2f939920f7fbb2efd860d6d5"
         "926bf425eb47b78bf6979cdcd67eb705e2c9a4d45a0930ba25463178a3fb99cb28c8b"
         "77d8fcf68c54ebfadf08b9a446c251a0088301c50d53",
         ProofId::fromHex("82754c0d4170521b19360c6862483ad435b7b95f078aedf781d6"
                          "9a6c5b89a916"),
         7584312, ProofValidationResult::INVALID_SIGNATURE},
        {"2 utxo staked",
         "872379ab64f55b4166ca0e79639999ec4104a66861de557a54eefc0375264cc17c3a3"
         "50ccabca6fd9c91883e899ab55bb140517aa56c5b4041908e7027a786b99f66488a04"
         "135ce5fe189a99a7bc541ddfe602fabf3ad5b875840e7813a66d5ea8a1288a49b6222"
         "b59fcbe6249f94e5927f9f4b884b0b040a534b3ba040000d045d5d021036830e697b0"
         "ee89866da798a8945bd85b352545ec1bcace7e04909ea54c134f16d5fe4e972b7acd2"
         "9ebfc2b7b11c26974b84e5f21a45bbe8372472f59e5dfdea7e9e5857c6aebe5dbc5e6"
         "46dfbf4e7cee380afaddb15d06153bf1755b9ef00a616d4c8c3c3a662b5eddc192656"
         "4a488e3e68e334291078001480f7fa5144ef3a606a41e85c0218dd377090000e41099"
         "912102ebfcea8e1864c1273c41e0d7c1e9097be5c491bbbf5fe31161d8e5589b9d6b5"
         "b12f3b963c7fc7614d56d83af907e5cb18ac2f4c3e70a8c4253995f6bc002ec5e3504"
         "91c965cba4dbc11c210979217f1ac3ece7a748f5b2fcf5cced40a5d4c40e",
         ProofId::fromHex("ba5aba9be72c9c2c52f857b81245e1ec85c879bbc8e111008673"
                          "d78c26610b05"),
         15610172, ProofValidationResult::INVALID_SIGNATURE},
        {"3 utxo staked",
         "525e2aa04af0e2457c66ac9e7f66257f210252db8e3ceea6fca44a7696e82f7b77e5a"
         "4025e60ac60271b174e91ffbb6ce01f039ce8d3b77938e49ce3bc9824e90b72c65542"
         "2fb502f137e03a4499e5223d10096fe541eb80316ce3c80800000285f59341044fd7e"
         "95de7c7bb30e7f60434a3e1a414a9e5d9c383c7b27396b1b84355a32e2996ecb98dc2"
         "0143089932fa1b905a60fc3cfefeea193c91d1405f7c03de494fa4de065c067d64606"
         "0e9270281c316d5c4c01d7e43d009151a72bf647794ce1727cbefaeb19719f916cd4d"
         "d176c376a4da72431b61736d4a3e01c25ba057eac0af8f2988b78d1b75e02281fac56"
         "2357a06353bf7f214c883e65add05b3a616300cb99cc963c0f4ded8c00e0000b03aab"
         "f82103172b4f1890594508ab1e0cc5e9728b8a249660da4df724762a8fd888e8ece1b"
         "d6fe923ed17ad0fd77a90d31e3877de1a8cdb4e95bcf2cdd6fb9768f86789f253b432"
         "f3b5058b2d1892e90882529055fdedf8ae5d3280b2404a65321cf7f7229202db300ff"
         "2897e33259a81dfc4bf296c3a156dc8dbfa074c602dd2250cc531b346fc28bb80ddf2"
         "9ddc020000a713a5bb21035615635d449988a4eea03fd317e44481bde2e34a2489f3f"
         "b24f0b0ea1cbfc4030bec095a8d3e9c2a233778535dc1fcc07755149b23ea8c17931a"
         "37e9377eaa2f45bafb8d0bb9ba1700aab88fd6a53ea3e83d95ad2d84e7abe828f5570"
         "91b185e",
         ProofId::fromHex("9ea64e9760f2c7832f1c9840923947915361acb22dcc0bae4404"
                          "94be0d51842d"),
         29026903, ProofValidationResult::INVALID_SIGNATURE},
        {"4 utxo staked",
         "eef33172651f752ac255c85a4e1374992102c12b37ff6139157865fc4c3a9d7ad999b"
         "686ade45d453545d04e76f6e14793b404295de5ebf9fbbbb65fc1d9a71587c5284cff"
         "b2e834addefe090b8200435668c8f02c0b0100689a117e0e000007d801582102a682d"
         "9d12d53b0eb37a3af2838510f079041905a75f82b6a3fb5558728d781fbf868d1d968"
         "27b273f5a79f84ebe23add967a98f472fb80323439d0a65d546fc3745806f6d7f3381"
         "24a7a2573864e97a26246644a7d7b05d97943dfcdb4b694df631e6dc5f87e28c1fe3e"
         "5ba021f38c471638769041db81ffcf8c9887d078419f97fe2a2c408fee822c0600001"
         "689b9cd2102e38d0adddcd7c88e3c87b8babcae10647e2862fb719839fc8890e42aeb"
         "929b85e1a3f14e2cdc65e2b1396f2dae41b047958cdc7e4d2f6fa051065829e26797c"
         "5b882e45bb9fea32c0b0e0ad90f8ac1e5d8d0b16a9b74d77614b7fd99e56b6091aca3"
         "67f8f7a68d1b654e51dd00733bd191dc9bea2ba750e063b05d962aaf9c4d2088ce4f0"
         "03e73e253040000a5eebe222103a20dd85b66b44b22fdd17a93762194c9bedb442c7f"
         "fd7f08a9f82c42a8c1d9a0443f700cb8a40c8cf7f840b5137b6d019efed961771d095"
         "88b0eb3c5e1672bb95b06ca7e2068e564001aa75b8c37bb6601117c286b6b0c9728d1"
         "e928ab02e3b67e9422b484ef2624ce5de974b5bd616874ec39d03d32ed0bf114759b7"
         "0bf5dcef51534b100515301140f0000950121754104d66dba1569164a134111961133"
         "4bad5e2d398823f1454ceecb9c4266fd3ba4b969ac4d4f6c4b3975d19c2f7dcbbca09"
         "6af5395780a2d3c42505146c095bc861fab15238fb8aa1fb82c7ad28b0ee5d1335348"
         "76dc7887490c7c6e61103b2cd221f1991826a73fecf08e0b5a0a7d357a5431eee032d"
         "14a348c80ca1833d68b3d7b",
         ProofId::fromHex("ae60f62b336c6a948f95af123bc25574b0c5f423d1cab8f795d3"
                          "bf8f895457f3"),
         44059793, ProofValidationResult::INVALID_SIGNATURE},
        {"Properly signed 1 UTXO proof",
         "d97587e6c882615796011ec8f9a7b1c6410469ab5a892ffa4bb104a3d5760dd893a55"
         "02512eea4ba32a6d6672767be4959c0f70489b803a47a3abf83f30e8d9da978de4027"
         "c70ce7e0d3b0ad62eb08edd8f90169a79ff23e1d58c64afad42ad81cffe53967e16be"
         "b692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb5237e"
         "fe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce6800a7b4811c6412ad"
         "f94b0d6bb5227aeec27f49b2948b6e3da564d12d96ff00779f113d52c82093e101323"
         "4440ad829030c685ca03d4fd9ce95b298e79c5eee6e2",
         ProofId::fromHex("cbd77dad2ebc525c591ab44a0f6a25803c1d934c3e5caa61f9f4"
                          "c63c9f29a4e6"),
         444638638, ProofValidationResult::NONE},
        {"Duplicated UTXO",
         "60f8332a3ff3430a4f3c9010160cc63e21023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde302d1e26c2287948bc6ab2b55945c591b8ba3ff"
         "a237f5d9164d30a4f10145a61f788e639b1480731e2aead30500bf8462872102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce680f43f437a2d"
         "8910aa81ff6c5619dd7b27a1e4b794841e3ab60a3878cf00cff8c0135dc85e451e179"
         "34b252b51b44db5a8761d215565cc9533cdecfda0870ef079d1e26c2287948bc6ab2b"
         "55945c591b8ba3ffa237f5d9164d30a4f10145a61f788e639b1480731e2aead30500b"
         "f8462872102449fb5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8"
         "bce680f43f437a2d8910aa81ff6c5619dd7b27a1e4b794841e3ab60a3878cf00cff8c"
         "0135dc85e451e17934b252b51b44db5a8761d215565cc9533cdecfda0870ef079",
         ProofId::fromHex("a7cd6e76b5766cf4fc2251da4a01668682a1786d4b76539e04d7"
                          "f79cebeb5983"),
         3280755132, ProofValidationResult::DUPLICATE_STAKE},
        {"Properly signed 3 UTXO proof",
         "c964aa6fde575e4ce8404581c7be874e21023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30305d427b706705a5d4b6a368a231d6db62aba"
         "cf8c29bc32b61e7f65a0a6976aa8b86b687bc0260e821e4f0200b9d3bf6d2102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce68052365271b6"
         "c71189f5cd7e3b694b77b579080f0b35bae567b96590ab6aa3019b018ff9f061f52f1"
         "426bdb195d4b6d4dff5114cee90e33dabf0c588ebadf7774418f54247f6390791706a"
         "f36fac782302479898b5273f9e51a92cb1fb5af43deeb6c8c269403d30ffcb3803001"
         "34398c42103e49f9df52de2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9"
         "e645efa08e97ea0c60e1f0a064fbf08989c084707082727e85dcb9f79bb503f76ee6c"
         "8dad42a07ef15c89b3750a5631d604b21fafff0f4de354ade95c2f28160ae549af0d4"
         "ce48c4ca9d0714b1fa51920270f8575e0af610f07b4e602a018ecdbb649b64fff614c"
         "0026e9fc8e0030092533d422103aac52f4cfca700e7e9824298e0184755112e32f359"
         "c832f5f6ad2ef62a2c024af812d6d7f2ecc6223a774e19bce1fb20d94d6b01ea69363"
         "8f55c74fdaa5358fa9239d03e4caf3d817e8f748ccad55a27b9d365db06ad5a0b779a"
         "c385f3dc8710",
         ProofId::fromHex("39488854a79a87a37a5042f3934983d116337f0a38cfa0c78712"
                          "26ba8edf6a15"),
         2648393347, ProofValidationResult::NONE},
        {"Changing sequence affect ProofId",
         "d87587e6c882615796011ec8f9a7b1c6410469ab5a892ffa4bb104a3d5760dd893a55"
         "02512eea4ba32a6d6672767be4959c0f70489b803a47a3abf83f30e8d9da978de4027"
         "c70ce7e0d3b0ad62eb08edd8f90169a79ff23e1d58c64afad42ad81cffe53967e16be"
         "b692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb5237e"
         "fe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce6800a7b4811c6412ad"
         "f94b0d6bb5227aeec27f49b2948b6e3da564d12d96ff00779f113d52c82093e101323"
         "4440ad829030c685ca03d4fd9ce95b298e79c5eee6e2",
         ProofId::fromHex("333c462a0161e9146da55d77733a2d4ccd022217a70beb004742"
                          "5069f1d32ed5"),
         444638638, ProofValidationResult::INVALID_SIGNATURE},
        {"Changing expiration affect ProofId",
         "d97587e6c882615797011ec8f9a7b1c6410469ab5a892ffa4bb104a3d5760dd893a55"
         "02512eea4ba32a6d6672767be4959c0f70489b803a47a3abf83f30e8d9da978de4027"
         "c70ce7e0d3b0ad62eb08edd8f90169a79ff23e1d58c64afad42ad81cffe53967e16be"
         "b692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb5237e"
         "fe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce6800a7b4811c6412ad"
         "f94b0d6bb5227aeec27f49b2948b6e3da564d12d96ff00779f113d52c82093e101323"
         "4440ad829030c685ca03d4fd9ce95b298e79c5eee6e2",
         ProofId::fromHex("6b7d6b32a88e68e830454bb0189ac14dc938917bdc64f22ef11d"
                          "d41535ede85a"),
         444638638, ProofValidationResult::INVALID_SIGNATURE},
        {"Changing the master key affect ProofId",
         "d97587e6c882615796011ec8f9a7b1c6410469aa5a892ffa4bb104a3d5760dd893a55"
         "02512eea4ba32a6d6672767be4959c0f70489b803a47a3abf83f30e8d9da978de4027"
         "c70ce7e0d3b0ad62eb08edd8f90169a79ff23e1d58c64afad42ad81cffe53967e16be"
         "b692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb5237e"
         "fe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce6800a7b4811c6412ad"
         "f94b0d6bb5227aeec27f49b2948b6e3da564d12d96ff00779f113d52c82093e101323"
         "4440ad829030c685ca03d4fd9ce95b298e79c5eee6e2",
         ProofId::fromHex("d4e2673f9df2e5c506892f3794b986910c77aa9b0c292cdcfea8"
                          "3dd804008b00"),
         444638638, ProofValidationResult::INVALID_SIGNATURE},
        {"Changing the TxId affect the ProofId",
         "d97587e6c882615796011ec8f9a7b1c6410469ab5a892ffa4bb104a3d5760dd893a55"
         "02512eea4ba32a6d6672767be4959c0f70489b803a47a3abf83f30e8d9da978de4027"
         "c70ce7e0d3b0ad62eb08edd8f90179a79ff23e1d58c64afad42ad81cffe53967e16be"
         "b692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb5237e"
         "fe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce6800a7b4811c6412ad"
         "f94b0d6bb5227aeec27f49b2948b6e3da564d12d96ff00779f113d52c82093e101323"
         "4440ad829030c685ca03d4fd9ce95b298e79c5eee6e2",
         ProofId::fromHex("fefa0e3d8f76358431caba523ac71faaf57921bb6f1049f74a3e"
                          "8bebd512c20b"),
         444638638, ProofValidationResult::INVALID_SIGNATURE},
        {"Changing the outpoint index change the ProofId",
         "d97587e6c882615796011ec8f9a7b1c6410469ab5a892ffa4bb104a3d5760dd893a55"
         "02512eea4ba32a6d6672767be4959c0f70489b803a47a3abf83f30e8d9da978de4027"
         "c70ce7e0d3b0ad62eb08edd8f90169a79ff23e1d58c64afad42ad81cffe53967e16be"
         "b692fc5776bb442c79c5d91df00cf21804712806594010038e168a32102449fb5237e"
         "fe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce6800a7b4811c6412ad"
         "f94b0d6bb5227aeec27f49b2948b6e3da564d12d96ff00779f113d52c82093e101323"
         "4440ad829030c685ca03d4fd9ce95b298e79c5eee6e2",
         ProofId::fromHex("a9f6b78b97a01d21d47b834bb8bf5d9397f50bfac115ec3da05b"
                          "695189aef040"),
         444638638, ProofValidationResult::INVALID_SIGNATURE},
        {"Changing the amount changes the ProofId",
         "d97587e6c882615796011ec8f9a7b1c6410469ab5a892ffa4bb104a3d5760dd893a55"
         "02512eea4ba32a6d6672767be4959c0f70489b803a47a3abf83f30e8d9da978de4027"
         "c70ce7e0d3b0ad62eb08edd8f90169a79ff23e1d58c64afad42ad81cffe53967e16be"
         "b692fc5776bb442c79c5d91de00cf21814712806594010038e168a32102449fb5237e"
         "fe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce6800a7b4811c6412ad"
         "f94b0d6bb5227aeec27f49b2948b6e3da564d12d96ff00779f113d52c82093e101323"
         "4440ad829030c685ca03d4fd9ce95b298e79c5eee6e2",
         ProofId::fromHex("89796be200e6eeeefdb894e47f16653afc572310d5f94c859cac"
                          "628ffc0d9781"),
         444638638, ProofValidationResult::INVALID_SIGNATURE},
        {"Changing the height changes the ProofId",
         "d97587e6c882615796011ec8f9a7b1c6410469ab5a892ffa4bb104a3d5760dd893a55"
         "02512eea4ba32a6d6672767be4959c0f70489b803a47a3abf83f30e8d9da978de4027"
         "c70ce7e0d3b0ad62eb08edd8f90169a79ff23e1d58c64afad42ad81cffe53967e16be"
         "b692fc5776bb442c79c5d91de00cf21804712806594010028e168a32102449fb5237e"
         "fe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce6800a7b4811c6412ad"
         "f94b0d6bb5227aeec27f49b2948b6e3da564d12d96ff00779f113d52c82093e101323"
         "4440ad829030c685ca03d4fd9ce95b298e79c5eee6e2",
         ProofId::fromHex("77db71b3099331de1e09262d03ee4a5f2d2c21f5abc48f68e28d"
                          "456cecc822ce"),
         444638638, ProofValidationResult::INVALID_SIGNATURE},
        {"Changing the pubkey changes the ProofId",
         "d97587e6c882615796011ec8f9a7b1c6410469ab5a892ffa4bb104a3d5760dd893a55"
         "02512eea4ba32a6d6672767be4959c0f70489b803a47a3abf83f30e8d9da978de4027"
         "c70ce7e0d3b0ad62eb08edd8f90169a79ff23e1d58c64afad42ad81cffe53967e16be"
         "b692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102459fb5237e"
         "fe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce6800a7b4811c6412ad"
         "f94b0d6bb5227aeec27f49b2948b6e3da564d12d96ff00779f113d52c82093e101323"
         "4440ad829030c685ca03d4fd9ce95b298e79c5eee6e2",
         ProofId::fromHex("3663e72aae7fe4dacde5aa6d5e6f2a3041171d9e7756a47662e1"
                          "e0a11e82621c"),
         444638638, ProofValidationResult::INVALID_SIGNATURE},
        {"Changing the signature does NOT change the ProofId",
         "d97587e6c882615796011ec8f9a7b1c6410469ab5a892ffa4bb104a3d5760dd893a55"
         "02512eea4ba32a6d6672767be4959c0f70489b803a47a3abf83f30e8d9da978de4027"
         "c70ce7e0d3b0ad62eb08edd8f90169a79ff23e1d58c64afad42ad81cffe53967e16be"
         "b692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb5237e"
         "fe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce6800a7b4811c6412ad"
         "f94b0d6bb5227aeec27f49b2948b6e3da564d12d96ff00779f113d52c82093e101323"
         "4440ad829030c685ca03d4fd9ce95b298e79c5eee6e3",
         ProofId::fromHex("cbd77dad2ebc525c591ab44a0f6a25803c1d934c3e5caa61f9f4"
                          "c63c9f29a4e6"),
         444638638, ProofValidationResult::INVALID_SIGNATURE},
        {"1 utxo staked but zero coins",
         "a6d6852ffa70b172d37a0ad2c01c2acd21023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30145a4d07798547464daa53acefb7c97c0c415"
         "ed8e81e549ff56a0ef6f847fcc9ca855b3620000000000000000e707d7272102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce68065cd42e0e6"
         "9d511ad24ecb3c3af07176bcf890caa7cfc64039dc65e51014dd99d11bd00ffbfbcc1"
         "9619ca502bfd4dd6dbc0967692ff6d2211b0bd9b9f05e1298",
         ProofId::fromHex("38f7c9696f9c2c07db3f23024d550a6b0b7f851013074280dbe3"
                          "49f42a2a5a00"),
         0, ProofValidationResult::DUST_THRESOLD},
    };

    for (auto &c : testcases) {
        CDataStream stream(ParseHex(c.hex), SER_NETWORK, 0);
        Proof p;
        stream >> p;
        BOOST_CHECK_EQUAL(p.getId(), c.proofid);
        BOOST_CHECK_EQUAL(p.getScore(), c.score);

        ProofValidationState state;
        BOOST_CHECK_EQUAL(p.verify(state),
                          c.result == ProofValidationResult::NONE);
        BOOST_CHECK(state.GetResult() == c.result);
        BOOST_TEST_MESSAGE(c.proofid);
    }
}

BOOST_AUTO_TEST_CASE(verify) {
    CCoinsView coinsDummy;
    CCoinsViewCache coins(&coinsDummy);

    auto key = CKey::MakeCompressedKey();
    const CPubKey pubkey = key.GetPubKey();

    const Amount value = 12345 * COIN;
    const uint32_t height = 10;

    COutPoint pkh_outpoint(TxId(InsecureRand256()), InsecureRand32());
    CTxOut pkh_output(value, GetScriptForRawPubKey(pubkey));
    coins.AddCoin(pkh_outpoint, Coin(pkh_output, height, false), false);

    COutPoint nonstd_outpoint(TxId(InsecureRand256()), InsecureRand32());
    CTxOut nonstd_output(value, CScript() << OP_TRUE);
    coins.AddCoin(nonstd_outpoint, Coin(nonstd_output, height, false), false);

    COutPoint p2sh_outpoint(TxId(InsecureRand256()), InsecureRand32());
    CTxOut p2sh_output(value,
                       GetScriptForDestination(ScriptHash(InsecureRand160())));
    coins.AddCoin(p2sh_outpoint, Coin(p2sh_output, height, false), false);

    const auto runCheck = [&](const ProofValidationResult result,
                              const COutPoint &o, const Amount v,
                              const uint32_t h, const bool is_coinbase,
                              const CKey &k) {
        // Generate a proof that match the UTXO.
        ProofBuilder pb(0, 0, pubkey);
        pb.addUTXO(o, v, h, is_coinbase, k);
        Proof p = pb.build();

        ProofValidationState state;
        BOOST_CHECK(p.verify(state));
        BOOST_CHECK(p.verify(state, coins) ==
                    (result == ProofValidationResult::NONE));
        BOOST_CHECK(state.GetResult() == result);
    };

    // Valid proof
    runCheck(ProofValidationResult::NONE, pkh_outpoint, value, height, false,
             key);

    // Coinbase mismatch
    runCheck(ProofValidationResult::COINBASE_MISMATCH, pkh_outpoint, value,
             height, true, key);

    // Height mismatch
    runCheck(ProofValidationResult::HEIGHT_MISMATCH, pkh_outpoint, value,
             height + 1, false, key);

    // Amount mismatch
    runCheck(ProofValidationResult::AMOUNT_MISMATCH, pkh_outpoint,
             value + 1 * SATOSHI, height, false, key);

    // Invalid outpoints
    runCheck(ProofValidationResult::MISSING_UTXO,
             COutPoint(pkh_outpoint.GetTxId(), pkh_outpoint.GetN() + 1), value,
             height, false, key);
    runCheck(ProofValidationResult::MISSING_UTXO,
             COutPoint(TxId(InsecureRand256()), pkh_outpoint.GetN()), value,
             height, false, key);

    // Non standard script
    runCheck(ProofValidationResult::NON_STANDARD_DESTINATION, nonstd_outpoint,
             value, height, false, key);

    // Non PKHhash destination
    runCheck(ProofValidationResult::DESTINATION_NOT_SUPPORTED, p2sh_outpoint,
             value, height, false, key);

    // Mismatching key
    {
        runCheck(ProofValidationResult::DESTINATION_MISMATCH, pkh_outpoint,
                 value, height, false, CKey::MakeCompressedKey());
    }

    // No stake
    {
        Proof p = ProofBuilder(0, 0, pubkey).build();

        ProofValidationState state;
        BOOST_CHECK(!p.verify(state, coins));
        BOOST_CHECK(state.GetResult() == ProofValidationResult::NO_STAKE);
    }

    // Dust thresold
    {
        ProofBuilder pb(0, 0, pubkey);
        pb.addUTXO(pkh_outpoint, Amount::zero(), height, false, key);
        Proof p = pb.build();

        ProofValidationState state;
        BOOST_CHECK(!p.verify(state, coins));
        BOOST_CHECK(state.GetResult() == ProofValidationResult::DUST_THRESOLD);
    }

    {
        ProofBuilder pb(0, 0, pubkey);
        pb.addUTXO(pkh_outpoint, PROOF_DUST_THRESHOLD - 1 * SATOSHI, height,
                   false, key);
        Proof p = pb.build();

        ProofValidationState state;
        BOOST_CHECK(!p.verify(state, coins));
        BOOST_CHECK(state.GetResult() == ProofValidationResult::DUST_THRESOLD);
    }

    // Duplicated input
    {
        ProofBuilder pb(0, 0, pubkey);
        pb.addUTXO(pkh_outpoint, value, height, false, key);
        pb.addUTXO(pkh_outpoint, value, height, false, key);
        Proof p = pb.build();

        ProofValidationState state;
        BOOST_CHECK(!p.verify(state, coins));
        BOOST_CHECK(state.GetResult() ==
                    ProofValidationResult::DUPLICATE_STAKE);
    }
}

BOOST_AUTO_TEST_SUITE_END()
