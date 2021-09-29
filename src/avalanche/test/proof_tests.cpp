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

    ProofBuilder pb(sequence, expiration, key);

    for (int i = 0; i < 3; i++) {
        key.MakeNewKey(true);
        BOOST_CHECK(pb.addUTXO(COutPoint(TxId(GetRandHash()), InsecureRand32()),
                               int64_t(InsecureRand32()) * COIN / 100,
                               InsecureRand32(), InsecureRandBool(), key));
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
    // All stakes signed using the key:
    // KydYrKDNsVnY5uhpLyC4UmazuJvUjNoKJhEEv9f1mdK1D5zcnMSM
    std::vector<TestVector> legacyFormatTestCases{
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
         7584312, ProofValidationResult::INVALID_STAKE_SIGNATURE},
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
         15610172, ProofValidationResult::INVALID_STAKE_SIGNATURE},
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
         29026903, ProofValidationResult::INVALID_STAKE_SIGNATURE},
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
         44059793, ProofValidationResult::INVALID_STAKE_SIGNATURE},
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
         "c964aa6fde575e4ce8404581c7be874e21038439233261789dd340bdc1450172d9c67"
         "1b72ee8c0b2736ed2a3a250760897fd03e4ed76e1f19b2c2a0fcc069b4ace4a078cb5"
         "cc31e9e19b266d0af41ea8bb0c30c8b47c95a856d9aa000000007dfdd89a21030f588"
         "3ac0b61082277ad94d9f5f979baffc49d516167aeda0eb7de30db319a411f97bc976e"
         "0490468f2f6d552c8cf87e8def1492b8ac81df0b4448a3c212e9000f9e753b97c93e0"
         "2fbe8976c95488b54a24f7df00d3cfed308701e6d690c394cac098c86414715db364a"
         "4e32216084c561acdd79e0860b1fdf7497b159cb13230451200296c902ee000000009"
         "f2bc7392102a397e8e1f737cae7d8c41ec68445261e9201ed36bc694d753095f716b3"
         "97319d5c5ef9a7712ec77b6826b29bf53691bbcb6873a326f313efb8cdb8911715bc6"
         "7d61a3b804f9ac9162374c6df42dc918b0ba3f05d0578cd9f96d5078c903b89f30b1e"
         "5f35704cb63360aa3d5f444ee35eea4c154c1af6d4e7595b409ada4b42377764698a9"
         "15c2ac4000000000f28db3221039f1ae9bbeeafa63abdc362f0a2c00e6c0582615b79"
         "61745180c47a0b7800abc1e97c016b9e99625394b738643e8ef0d3d4936165caff79c"
         "1070d36ca432ba04dbbb54474a42f9e72587d05ba6353ce1be41a0e80e2d2257bc444"
         "99fa26f5c1d7",
         ProofId::fromHex("317289c8d2f4fb7b4fea5195e4dbc9804018c6aab71606b50e27"
                          "ddd8e2d985db"),
         10150, ProofValidationResult::NONE},
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
         444638638, ProofValidationResult::INVALID_STAKE_SIGNATURE},
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
         444638638, ProofValidationResult::INVALID_STAKE_SIGNATURE},
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
         444638638, ProofValidationResult::INVALID_STAKE_SIGNATURE},
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
         444638638, ProofValidationResult::INVALID_STAKE_SIGNATURE},
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
         444638638, ProofValidationResult::INVALID_STAKE_SIGNATURE},
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
         444638638, ProofValidationResult::INVALID_STAKE_SIGNATURE},
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
         444638638, ProofValidationResult::INVALID_STAKE_SIGNATURE},
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
         444638638, ProofValidationResult::INVALID_STAKE_SIGNATURE},
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
         444638638, ProofValidationResult::INVALID_STAKE_SIGNATURE},
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

    std::vector<TestVector> regularFormatTestCases{
        {"Properly signed 1 UTXO proof, P2PK payout script",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce680baa8704cc7"
         "97482ae7b673f04fec50be1cdcefdffc3863029352aef07b16336d57a6036c0c62782"
         "780fb12051839ac46328040bffe675bfbcdd15f5f6a5acbda2321023beefdde700a6b"
         "c02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3ac",
         ProofId::fromHex("455f34eb8a00b0799630071c0728481bdb1653035b1484ac33e9"
                          "74aa4ae7db6d"),
         444638638, ProofValidationResult::NONE},
        {"Properly signed 1 UTXO proof, P2PKH payout script",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce6802ddcceb12b"
         "f6fa6f3b5001e0c7a60dd79ae373bb83d52630a11691b62a9c32e43a3003f6c13ca22"
         "8e33add06fafba4c76ce91bab15171b0c53aef732e824f78b1976a914f8172c51efbf"
         "34413a308a030fd4b164c5bfcd8f88ac",
         ProofId::fromHex("8a2fcc5700a89f37a3726cdf3202353bf61f280815a9df744e3c"
                          "9de6215a745a"),
         444638638, ProofValidationResult::NONE},
        {"Properly signed 1 UTXO proof, P2SH payout script",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce680091c7780f8"
         "981eb8edbdf98aae9a9072cb2f0af1a87b426c734e79e32704b02878086b5e933ba5d"
         "3fc6948ab24b14669e1f670ff0ac2965cce03dcd315e9322a17a914da1745e9b549bd"
         "0bfa1a569971c77eba30cd5a4b87",
         ProofId::fromHex("c61ee0416eb9549ea0e09dfd2c6062a11aa5d3ab0adcdf59abcc"
                          "02dd0de401fc"),
         444638638, ProofValidationResult::NONE},
        {"Properly signed 1 UTXO proof, 1-of-1 multisig payout script",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce680e669fa3d48"
         "1cce63ddf4dd4f1bc486f7294f4d3fa06bf3e03185423d614aeba8b8577aaca91b0d6"
         "212a335e4977523c54d701db772ac5a16b352efc085fb0741255121023beefdde700a"
         "6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde351ae",
         ProofId::fromHex("29deedc94713bbc4d4f88fe96fae6801b91c5ae50601f158fa76"
                          "a036e18ea468"),
         444638638, ProofValidationResult::NONE},
        {"Properly signed 1 UTXO proof, 2-of-3 multisig payout script",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce6808d8b48717e"
         "f23eafb7254c8bdb79cec84b259d023f973c6a086fb6c369671c97c93d2a22c698d17"
         "5b4c37c30f5b681a6b019106dd1fab54dc6212e8eb12c500f695221023beefdde700a"
         "6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde321023beefdde700a6"
         "bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde321023beefdde700a6b"
         "c02036335b4df141c8bc67bb05a971f5ac2745fd683797dde353ae",
         ProofId::fromHex("c24dc13d98d0e0a80c19346b9590368557a66f0f65c0088c179d"
                          "89eca25107c8"),
         444638638, ProofValidationResult::NONE},
        {"Properly signed 1 UTXO proof, OP_RETURN payout script",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce680a89393513c"
         "b33ef4c1941f19e25e5cc9d75f648e89b91b748598d9966de35a0781c4e0409765bdf"
         "896f53f8430b7150077e1952c118d374bdfaab1c37713cdb01b6a19492077616e7420"
         "746f206275726e206d792072657761726473",
         ProofId::fromHex("bfc250ca1986177acc779f26eaff80aa8916d23cb3e7e0ce6d35"
                          "89c4f5ea364c"),
         444638638, ProofValidationResult::NONE},
        {"Invalid payout script (OP_FALSE)",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce680176d115007"
         "f81be4be87ae2883fda15d87a7991645f00c8acf79b7f31501ee823604df88d29acfb"
         "4d911c02294d5157191ebcf6657926764757da69dad2897540100",
         ProofId::fromHex("046e75fa2d7f0868dcfa683bbdf657fc6a49b8f8b0d5c2dfdf90"
                          "736ded26b076"),
         444638638, ProofValidationResult::INVALID_PAYOUT_SCRIPT},
        {"Invalid payout script (1-of-5 multisig)",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce680a90f09c643"
         "edc82a5babbd25c446fe22df502eba5c9eff4dee2c471fb8c9cc8e5142d71583ac970"
         "d5dc717f5cd4969a1089f9b74ac558afe94398022422fce0cad5121023beefdde700a"
         "6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde321023beefdde700a6"
         "bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde321023beefdde700a6b"
         "c02036335b4df141c8bc67bb05a971f5ac2745fd683797dde321023beefdde700a6bc"
         "02036335b4df141c8bc67bb05a971f5ac2745fd683797dde321023beefdde700a6bc0"
         "2036335b4df141c8bc67bb05a971f5ac2745fd683797dde355ae",
         ProofId::fromHex("e66b0ab11de5e2f358d2e1f65b1ebe608e4a1f10a9f5d42f1173"
                          "b262e1a218a6"),
         444638638, ProofValidationResult::INVALID_PAYOUT_SCRIPT},
        {"Changing the payout address changes the ProofId (P2PK)",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce680baa8704cc7"
         "97482ae7b673f04fec50be1cdcefdffc3863029352aef07b16336d57a6036c0c62782"
         "780fb12051839ac46328040bffe675bfbcdd15f5f6a5acbda2321023beefdde700a6b"
         "c02036335b4df141c8bc67bb05a971f5ac2745fd683797dde4ac",
         ProofId::fromHex("ce2812a1decdef0267e0266c68ab53c5ecad292f7b7d0fbd3db9"
                          "285a08ccd2a1"),
         444638638, ProofValidationResult::INVALID_STAKE_SIGNATURE},
    };

    auto checkCases = [&](const std::vector<TestVector> &testcases) {
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
    };

    checkCases(legacyFormatTestCases);

    gArgs.ForceSetArg("-legacyavaproof", "0");
    BOOST_CHECK(!Proof::useLegacy(gArgs));
    checkCases(regularFormatTestCases);
    gArgs.ClearForcedArg("-legacyavaproof");
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
        ProofBuilder pb(0, 0, key);
        BOOST_CHECK(pb.addUTXO(o, v, h, is_coinbase, k));
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
        Proof p = ProofBuilder(0, 0, key).build();

        ProofValidationState state;
        BOOST_CHECK(!p.verify(state, coins));
        BOOST_CHECK(state.GetResult() == ProofValidationResult::NO_STAKE);
    }

    // Dust thresold
    {
        ProofBuilder pb(0, 0, key);
        BOOST_CHECK(
            pb.addUTXO(pkh_outpoint, Amount::zero(), height, false, key));
        Proof p = pb.build();

        ProofValidationState state;
        BOOST_CHECK(!p.verify(state, coins));
        BOOST_CHECK(state.GetResult() == ProofValidationResult::DUST_THRESOLD);
    }

    {
        ProofBuilder pb(0, 0, key);
        BOOST_CHECK(pb.addUTXO(pkh_outpoint, PROOF_DUST_THRESHOLD - 1 * SATOSHI,
                               height, false, key));
        Proof p = pb.build();

        ProofValidationState state;
        BOOST_CHECK(!p.verify(state, coins));
        BOOST_CHECK(state.GetResult() == ProofValidationResult::DUST_THRESOLD);
    }

    // Duplicated input
    {
        ProofBuilder pb(0, 0, key);
        BOOST_CHECK(pb.addUTXO(pkh_outpoint, value, height, false, key));
        Proof p = TestProofBuilder::buildDuplicatedStakes(pb);

        ProofValidationState state;
        BOOST_CHECK(!p.verify(state, coins));
        BOOST_CHECK(state.GetResult() ==
                    ProofValidationResult::DUPLICATE_STAKE);
    }

    // Wrong stake ordering
    {
        COutPoint other_pkh_outpoint(TxId(InsecureRand256()), InsecureRand32());
        CTxOut other_pkh_output(value, GetScriptForRawPubKey(pubkey));
        coins.AddCoin(other_pkh_outpoint, Coin(other_pkh_output, height, false),
                      false);

        ProofBuilder pb(0, 0, key);
        BOOST_CHECK(pb.addUTXO(pkh_outpoint, value, height, false, key));
        BOOST_CHECK(pb.addUTXO(other_pkh_outpoint, value, height, false, key));
        Proof p = TestProofBuilder::buildWithReversedOrderStakes(pb);

        ProofValidationState state;
        BOOST_CHECK(!p.verify(state, coins));
        BOOST_CHECK(state.GetResult() ==
                    ProofValidationResult::WRONG_STAKE_ORDERING);
    }
}

BOOST_AUTO_TEST_CASE(deterministic_proofid) {
    CCoinsView coinsDummy;
    CCoinsViewCache coins(&coinsDummy);

    auto key = CKey::MakeCompressedKey();

    const Amount value = 12345 * COIN;
    const uint32_t height = 10;

    std::vector<COutPoint> outpoints(10);
    for (size_t i = 0; i < 10; i++) {
        outpoints[i] = COutPoint(TxId(InsecureRand256()), InsecureRand32());
    }

    auto computeProofId = [&]() {
        ProofBuilder pb(0, 0, key);
        for (const COutPoint &outpoint : outpoints) {
            BOOST_CHECK(pb.addUTXO(outpoint, value, height, false, key));
        }
        Proof p = pb.build();

        return p.getId();
    };

    const ProofId proofid = computeProofId();
    Shuffle(outpoints.begin(), outpoints.end(), FastRandomContext());
    BOOST_CHECK_EQUAL(proofid, computeProofId());
}

BOOST_AUTO_TEST_SUITE_END()
