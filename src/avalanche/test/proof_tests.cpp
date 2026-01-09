// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/proof.h>

#include <avalanche/proofbuilder.h>
#include <avalanche/test/util.h>
#include <avalanche/validation.h>
#include <coins.h>
#include <script/standard.h>
#include <util/strencodings.h>
#include <util/translation.h>
#include <validation.h>

#include <test/util/random.h>
#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

using namespace avalanche;

BOOST_FIXTURE_TEST_SUITE(proof_tests, TestChain100Setup)

BOOST_AUTO_TEST_CASE(proof_random) {
    Chainstate &active_chainstate = Assert(m_node.chainman)->ActiveChainstate();

    for (int i = 0; i < 1000; i++) {
        const uint32_t score = m_rng.rand32();
        auto p = buildRandomProof(active_chainstate, score);
        BOOST_CHECK_EQUAL(p->getScore(), score);

        ProofValidationResult expected_state =
            hasDustStake(p) ? ProofValidationResult::DUST_THRESHOLD
                            : ProofValidationResult::NONE;

        ProofValidationState state;
        const bool ret = p->verify(PROOF_DUST_THRESHOLD, state);
        BOOST_CHECK_EQUAL(ret,
                          state.GetResult() == ProofValidationResult::NONE);
        BOOST_CHECK(state.GetResult() == expected_state);
    }
}

BOOST_AUTO_TEST_CASE(proofbuilder) {
    // Master key.
    auto key = CKey::MakeCompressedKey();
    const CPubKey master = key.GetPubKey();

    const uint64_t sequence = m_rng.randbits(64);
    const int64_t expiration = m_rng.randbits(64);

    ProofBuilder pb(sequence, expiration, key, UNSPENDABLE_ECREG_PAYOUT_SCRIPT);

    for (int i = 0; i < 3; i++) {
        key.MakeNewKey(true);
        BOOST_CHECK(pb.addUTXO(COutPoint(TxId(GetRandHash()), m_rng.rand32()),
                               int64_t(m_rng.rand32()) * COIN / 100,
                               m_rng.rand32(), m_rng.randbool(), key));
    }

    ProofRef p = pb.build();

    ProofValidationState state;
    BOOST_CHECK(p->verify(PROOF_DUST_THRESHOLD, state));

    BOOST_CHECK_EQUAL(p->getSequence(), sequence);
    BOOST_CHECK_EQUAL(p->getExpirationTime(), expiration);
    BOOST_CHECK(p->getMaster() == master);

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
    // Proof master key:
    // privkey L4J6gEE4wL9ji2EQbzS5dPMTTsw8LRvcMst1Utij4e3X5ccUSdqW
    const std::vector<TestVector> testCases{
        // Using P2PK payout to
        // 023beefdde700a6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3
        {"No utxo staked",
         "96527eae083f1f24625f049d9e54bb9a21023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde3002321023beefdde700a6bc02036335b4df141"
         "c8bc67bb05a971f5ac2745fd683797dde3ac135da984db510334abe41134e3d4ef09a"
         "d006b1152be8bc413182bf6f947eac1f8580fe265a382195aa2d73935cabf86d90a8f"
         "666d0a62385ae24732eca51575",
         ProofId::fromHex("979dbc3b1351ee12f91f537e04e61fdf93a73d5ebfc317bccd12"
                          "643b8be87b02"),
         0, ProofValidationResult::NO_STAKE},
        {"1 utxo staked",
         "a6d66db9fe9378fdd37a0ad2c01c2acd21023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30145a4d07798547464daa53acefb7c97c0c415"
         "ed8e81e549ff56a0ef6f847fcc9ca855b36200fe38dce5060000e707d7274104fb662"
         "6e21dbd1cc9feeecdefc9213fdce2b51ac4bb44e1f8dc6f14c2052f5dd7bfaeb2267a"
         "97ca2bec6e0dd4acf50a66204bde1ebb5d6c551684cff2f939920f7fbb2efd860d6d5"
         "926bf425eb47b78bf6979cdcd67eb705e2c9a4d45a0930ba25463178a3fb99cb28c8b"
         "77d8fcf68c54ebfadf08b9a446c251a0088301c50d532321023beefdde700a6bc0203"
         "6335b4df141c8bc67bb05a971f5ac2745fd683797dde3ac845148594a3067f06bc2cf"
         "495a1191c00e012dd3d0e4b0c393b3e46c2adcebc3df50f1a203f02e445a0101f4675"
         "26becb0aa4c64400a10bbde83b3f0290bdeaa",
         ProofId::fromHex("e01bac293ed39e8d5e06214e7fe0bceb9646ef253ce501dcd7a4"
                          "75f802ab07f1"),
         7584312, ProofValidationResult::INVALID_STAKE_SIGNATURE},
        {"2 utxo staked",
         "872379ab64f55b4166ca0e79639999ec21023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde302fabf3ad5b875840e7813a66d5ea8a1288a49"
         "b6222b59fcbe6249f94e5927f9f4b884b0b040a534b3ba040000d045d5d021036830e"
         "697b0ee89866da798a8945bd85b352545ec1bcace7e04909ea54c134f16d5fe4e972b"
         "7acd29ebfc2b7b11c26974b84e5f21a45bbe8372472f59e5dfdea7e9e5857c6aebe5d"
         "bc5e646dfbf4e7cee380afaddb15d06153bf1755b9ef00a616d4c8c3c3a662b5eddc1"
         "926564a488e3e68e334291078001480f7fa5144ef3a606a41e85c0218dd377090000e"
         "41099912102ebfcea8e1864c1273c41e0d7c1e9097be5c491bbbf5fe31161d8e5589b"
         "9d6b5b12f3b963c7fc7614d56d83af907e5cb18ac2f4c3e70a8c4253995f6bc002ec5"
         "e350491c965cba4dbc11c210979217f1ac3ece7a748f5b2fcf5cced40a5d4c40e2321"
         "023beefdde700a6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3ace"
         "a8c988e488eaeef3dc441eb8ede93d2e249ecac3a4277d0347bb1abfdb79b7ebc507e"
         "5447309db034983b38bd663242834b89026424472e192220863274b266",
         ProofId::fromHex("ebf52f8d3c845761e55ef145a37537162e5fbbcc87c58a5b0040"
                          "d0a9c89003c4"),
         15610172, ProofValidationResult::INVALID_STAKE_SIGNATURE},
        {"3 utxo staked",
         "525e2aa04af0e2457c66ac9e7f66257f21023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde3039ce8d3b77938e49ce3bc9824e90b72c65542"
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
         "91b185e2321023beefdde700a6bc02036335b4df141c8bc67bb05a971f5ac2745fd68"
         "3797dde3acf3c32376092a751c432eb727544e6e5caab7e9be1c947ece79995ddc883"
         "e6e1d48c6865554267cd8f388af277e4fa7a4ad6801f17db36074985ac477e250702"
         "b",
         ProofId::fromHex("8542635d83f8020bc781d9e8a3de53c23f5e3f77c21588719b58"
                          "b6618ee1782b"),
         29026903, ProofValidationResult::INVALID_STAKE_SIGNATURE},
        {"4 utxo staked",
         "eef33172651f752ac255c85a4e13749921023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde304295de5ebf9fbbbb65fc1d9a71587c5284cff"
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
         "14a348c80ca1833d68b3d7b2321023beefdde700a6bc02036335b4df141c8bc67bb05"
         "a971f5ac2745fd683797dde3ac157f7621dd2ce427c07dc0da1fc46412edd5c78b10c"
         "e70e7e6010c65d22de2f434e4f08c158af3c9f5a2411677bd69adbaec068cbb04e79f"
         "90dbdcb6be2b437f",
         ProofId::fromHex("6ba2a3ff986d5bc4457da693096bab408cfd8cf4e988e5ac013f"
                          "e48a4e2961c9"),
         44059793, ProofValidationResult::INVALID_STAKE_SIGNATURE},
        {"Properly signed 1 UTXO proof",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce68099f1e258ab"
         "54f960102c8b480e1dd5795422791bb8a7a19e5542fe8b6a76df7fa09a3fd4be62db7"
         "50131f1fbea6f7bb978288f7fe941c39ef625aa80576e19fc43410469ab5a892ffa4b"
         "b104a3d5760dd893a5502512eea4ba32a6d6672767be4959c0f70489b803a47a3abf8"
         "3f30e8d9da978de4027c70ce7e0d3b0ad62eb08edd8f9ac05a9ea3a5333926249331f"
         "34a41a3519bab179ce9228dc940019ee80f754da0499379229f9b49f1bccc6566a734"
         "7227299f775939444505952f920ccea8b9f18",
         ProofId::fromHex("cdcdd71605139f49d4884b0c3d9a6be309f07b008a760bb3b25f"
                          "cfcb7a3ffc46"),
         444638638, ProofValidationResult::NONE},
        {"Duplicated UTXO",
         "c964aa6fde575e4ce8404581c7be874e21023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde302d1e26c2287948bc6ab2b55945c591b8ba3ff"
         "a237f5d9164d30a4f10145a61f788e639b1480731e2aead30500bf8462872102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce6806b8111af77"
         "e1076caba7cb76de29abae963b7f6a1879318e8e37ff488d5843b783215fe9561431a"
         "c55ecef78ce214869aac0c271d35bee7fdb0858a7ddffe3b0d1e26c2287948bc6ab2b"
         "55945c591b8ba3ffa237f5d9164d30a4f10145a61f788e639b1480731e2aead30500b"
         "f8462872102449fb5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8"
         "bce6802f5c4b2a2ab7fb315d3b9e0318e4e90faa997f28ea6fb31c3487332718079c1"
         "0131da1acd028a093be651330679bb02bd471053e18a590e373a08c2e60ca15f92321"
         "038439233261789dd340bdc1450172d9c671b72ee8c0b2736ed2a3a250760897fdac3"
         "dfb66133d94674a3a6565d8f84e1a31e2f79a4bb399c04adc802abcf8b395f62315d3"
         "ad8450ba57e11dfb61b1f5a7325094d5ffda1f5830e0990dcc2ebb9be8",
         ProofId::fromHex("5d4919b43a1afb6acdeddaf1678397eaa10562125db6b911ec4e"
                          "35fd8598ad73"),
         3280755132, ProofValidationResult::DUPLICATE_STAKE},
        {"Properly signed 3 UTXO proof",
         "c964aa6fde575e4ce8404581c7be874e21023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde3030b1e5f35704cb63360aa3d5f444ee35eea4c"
         "154c1af6d4e7595b409ada4b42377764698aaa9da7a9070000000f28db322102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce680bff436d745"
         "ad2517f048748d49425db654ad2db24a89cbf91221f3d2e8833cbc63395b0b6f25e54"
         "3bc4c081e57dd7c29e271d0245230077eddfa991e418a9cceac098c86414715db364a"
         "4e32216084c561acdd79e0860b1fdf7497b159cb132304512002dcdf1b4c090000009"
         "f2bc7392102449fb5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8"
         "bce680cbfabd2e54169fa88efc205505dca2bd65baf893eb38dfa2bc5a691569ed660"
         "6873d8abc9b68951f8a76db379fb1244d0a1e005d310774f3dbd7863c5f6b060ce4ed"
         "76e1f19b2c2a0fcc069b4ace4a078cb5cc31e9e19b266d0af41ea8bb0c30c8b47c959"
         "0627dac060000007dfdd89a2102449fb5237efe8f647d32e8b64f06c22d1d40368eac"
         "a2a71ffc6a13ecc8bce6800d930fdf810c20955b67deb1b7db92a1e4f835da7b48495"
         "4ab1c0b982b3821d627a99fc244c9f9556a3b2b2db0098b5c4ef4578de2df3df6b744"
         "249d456987881976a914f8172c51efbf34413a308a030fd4b164c5bfcd8f88ac87b98"
         "97ce7b037539f910559fc8ddf69edd509484119f39a344cad40b4b7655438dabf7142"
         "7a37b92e0e6e29226b6474022ea16be6108ab0f9075f0cd391e746",
         ProofId::fromHex("526e0e5aef9d857d8c4c15208cc30b5a00818627eebe06098055"
                          "a88d57d461b0"),
         101506, ProofValidationResult::NONE},
        {"Changing sequence affect ProofId but not the stake signature",
         "d87587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce68099f1e258ab"
         "54f960102c8b480e1dd5795422791bb8a7a19e5542fe8b6a76df7fa09a3fd4be62db7"
         "50131f1fbea6f7bb978288f7fe941c39ef625aa80576e19fc43410469ab5a892ffa4b"
         "b104a3d5760dd893a5502512eea4ba32a6d6672767be4959c0f70489b803a47a3abf8"
         "3f30e8d9da978de4027c70ce7e0d3b0ad62eb08edd8f9ac80bdeb2ada22b35856fa25"
         "d2fe7a145b4ce09c6332b72925dbf2b09140d6163863437a8076f7836fcbb7154b831"
         "65a65910d1b2a8c3655d111f008a57315f5a0",
         ProofId::fromHex("8b0640e7bf81f487d90d6b5c3ead4bc41eae418da4e6874618b2"
                          "89124e52ba1e"),
         444638638, ProofValidationResult::NONE},
        {"Changing expiration affect ProofId",
         "d97587e6c882615797011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce68099f1e258ab"
         "54f960102c8b480e1dd5795422791bb8a7a19e5542fe8b6a76df7fa09a3fd4be62db7"
         "50131f1fbea6f7bb978288f7fe941c39ef625aa80576e19fc43410469ab5a892ffa4b"
         "b104a3d5760dd893a5502512eea4ba32a6d6672767be4959c0f70489b803a47a3abf8"
         "3f30e8d9da978de4027c70ce7e0d3b0ad62eb08edd8f9ac5995555107107e656abd8e"
         "2852f311ff0f5c4f606695b63ec44e04303e3378a2e21e16bf05727240ebee1334d2f"
         "858c6c2e3bdd8d289400b99d7f70b35f9d2fa",
         ProofId::fromHex("26ce40e7b5dfc8d3d48d743ed23fa6ff32ca269a59c4fb101b3b"
                          "48e5d8450465"),
         444638638, ProofValidationResult::INVALID_STAKE_SIGNATURE},
        {"Changing the TxId affect the ProofId",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30179a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce68099f1e258ab"
         "54f960102c8b480e1dd5795422791bb8a7a19e5542fe8b6a76df7fa09a3fd4be62db7"
         "50131f1fbea6f7bb978288f7fe941c39ef625aa80576e19fc43410469ab5a892ffa4b"
         "b104a3d5760dd893a5502512eea4ba32a6d6672767be4959c0f70489b803a47a3abf8"
         "3f30e8d9da978de4027c70ce7e0d3b0ad62eb08edd8f9acaefee33b8b7a0ce4d5d1ab"
         "92ea8d08dd2538102a4dde790f6317558ceb68e5d2267aac97a0f313dccec827d0401"
         "a3095b4e862068077ce942380b474c30b64e0",
         ProofId::fromHex("4b57e163adc5174820ce21eb0e0e9d6565bc00d51bf9f86c58c5"
                          "6947428c2d84"),
         444638638, ProofValidationResult::INVALID_STAKE_SIGNATURE},
        {"Changing the outpoint index change the ProofId",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91df00cf21804712806594010038e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce68099f1e258ab"
         "54f960102c8b480e1dd5795422791bb8a7a19e5542fe8b6a76df7fa09a3fd4be62db7"
         "50131f1fbea6f7bb978288f7fe941c39ef625aa80576e19fc43410469ab5a892ffa4b"
         "b104a3d5760dd893a5502512eea4ba32a6d6672767be4959c0f70489b803a47a3abf8"
         "3f30e8d9da978de4027c70ce7e0d3b0ad62eb08edd8f9acecc6e78166848efad9772b"
         "a11ed0a8b1e9e844cbc2727c69c5e1898430548c9062a52ca9dc1dbe614213d9f7d54"
         "65dc297d0dc1880adb7daf088f6927a4d6a51",
         ProofId::fromHex("b569969b77b683904a89c3364c667ac434602936548c80352a85"
                          "ffed4c934cbc"),
         444638638, ProofValidationResult::INVALID_STAKE_SIGNATURE},
        {"Changing the amount changes the ProofId",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21814712806594010038e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce68099f1e258ab"
         "54f960102c8b480e1dd5795422791bb8a7a19e5542fe8b6a76df7fa09a3fd4be62db7"
         "50131f1fbea6f7bb978288f7fe941c39ef625aa80576e19fc43410469ab5a892ffa4b"
         "b104a3d5760dd893a5502512eea4ba32a6d6672767be4959c0f70489b803a47a3abf8"
         "3f30e8d9da978de4027c70ce7e0d3b0ad62eb08edd8f9acefbdde03c4cc7065075d06"
         "6c693086c0df0b6b349ec9300ff1333cca65d076364560fb2cbb1365240cdd6c9c323"
         "d73fc17576da71a5c336a170f76a1b52ffc89",
         ProofId::fromHex("6989ce300064196c177eae6fd73cf3f89719ddedf068e757eb39"
                          "eb2030baa846"),
         444638638, ProofValidationResult::INVALID_STAKE_SIGNATURE},
        {"Changing the height changes the ProofId",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21804712806594010028e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce68099f1e258ab"
         "54f960102c8b480e1dd5795422791bb8a7a19e5542fe8b6a76df7fa09a3fd4be62db7"
         "50131f1fbea6f7bb978288f7fe941c39ef625aa80576e19fc43410469ab5a892ffa4b"
         "b104a3d5760dd893a5502512eea4ba32a6d6672767be4959c0f70489b803a47a3abf8"
         "3f30e8d9da978de4027c70ce7e0d3b0ad62eb08edd8f9ac4fc8c51b5a993c0a8f3a53"
         "c88fb49f228305da66d20b8c73e7e9de55300ac1de52c898fa73e8c5f54a727edc4a6"
         "76a66dc8bb89bd6c54d41053edceaead6d7b1",
         ProofId::fromHex("81d217bbfa019439ab6dfbe02b8b703b93eb26e6047a7ee3cc4a"
                          "ba1366286d8d"),
         444638638, ProofValidationResult::INVALID_STAKE_SIGNATURE},
        {"Changing the pubkey changes the ProofId",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102459fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce68099f1e258ab"
         "54f960102c8b480e1dd5795422791bb8a7a19e5542fe8b6a76df7fa09a3fd4be62db7"
         "50131f1fbea6f7bb978288f7fe941c39ef625aa80576e19fc43410469ab5a892ffa4b"
         "b104a3d5760dd893a5502512eea4ba32a6d6672767be4959c0f70489b803a47a3abf8"
         "3f30e8d9da978de4027c70ce7e0d3b0ad62eb08edd8f9ac893ad17cf6a17016f35337"
         "f6a10f85357689be2760734137c51225cbe0eca4fa00b671f50deacfb86afd61d9cdf"
         "ae24aa1e9ced62954c4f8eb8114bb4fb852fe",
         ProofId::fromHex("e33e02f3d608b4a6447c3b3ee283763718716fff02f3a79e3251"
                          "417bd03b9834"),
         444638638, ProofValidationResult::INVALID_STAKE_SIGNATURE},
        {"Changing the signature does NOT change the ProofId",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce68099f1e258ab"
         "54f960102c8b480e1dd5795422791bb8a7a19e5542fe8b6a76df7fa09a3fd4be62db7"
         "50131f1fbea6f7bb978288f7fe941c39ef625aa80576e19fd43410469ab5a892ffa4b"
         "b104a3d5760dd893a5502512eea4ba32a6d6672767be4959c0f70489b803a47a3abf8"
         "3f30e8d9da978de4027c70ce7e0d3b0ad62eb08edd8f9ac3359ba425e0084157ca510"
         "e30865693578e3f5eb426d97597ccbd7766db411abaf653aea59c34861cbafeaee076"
         "8ae58fa2b68a7bfdcdbdc041c50ea59cf1b22",
         ProofId::fromHex("cdcdd71605139f49d4884b0c3d9a6be309f07b008a760bb3b25f"
                          "cfcb7a3ffc46"),
         444638638, ProofValidationResult::INVALID_STAKE_SIGNATURE},
        {"1 utxo staked but zero coins",
         "a6d6852ffa70b172d37a0ad2c01c2acd21023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30145a4d07798547464daa53acefb7c97c0c415"
         "ed8e81e549ff56a0ef6f847fcc9ca855b3620000000000000000e707d7272102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce680061c669954"
         "f964a68b43b1b354b65b651f349a3ff310a1dcb862aa285f26fc7f6fd0b9cb766f1e1"
         "f90fc63ce03c956b3dac9a4ac2fff963f643ae1326b08d33c2321023beefdde700a6b"
         "c02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3ac6ad76de70caa0fb07"
         "12a44e24f791244f733017920ef42c876220a9c50f0239d97414829fe9103741aba28"
         "7579d8ea26ca28162e3091d53cc51fd58be9b18d22",
         ProofId::fromHex("c95e3c6417a799dd3085af689ea12fb3d2e1130870fef9f0bdc6"
                          "d10a27df746a"),
         0, ProofValidationResult::DUST_THRESHOLD},
        {"Properly signed 1 UTXO proof, P2PK payout script",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce6804534ca1f5e"
         "22670be3df5cbd5957d8dd83d05c8f17eae391f0e7ffdce4fb3defadb7c079473ebec"
         "cf88c1f8ce87c61e451447b89c445967335ffd1aadef429982321023beefdde700a6b"
         "c02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3ac7b0b7865200f63052"
         "ff980b93f965f398dda04917d411dd46e3c009a5fef35661fac28779b6a22760c0000"
         "4f5ddf7d9865c7fead7e4a840b947939590261640f",
         ProofId::fromHex("455f34eb8a00b0799630071c0728481bdb1653035b1484ac33e9"
                          "74aa4ae7db6d"),
         444638638, ProofValidationResult::NONE},
        {"Properly signed 1 UTXO proof, P2PKH payout script",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce6804848a02e2b"
         "1c8aa1d21c31b056ab6a63f08e07bb0b56258d1c58b87f3ff472b7b5b9a5907142a04"
         "041e95e6874ae0874d0f7bbe266f7c4606af315711d0f49341976a914f8172c51efbf"
         "34413a308a030fd4b164c5bfcd8f88ac2d805b078f5efe022304f8c6ccd0ef5255d80"
         "6a473fc85a5ad1caf1aa94a4e49ef7625b9dc85d263b2829d5822af62226bc50a4a83"
         "76a3a6e1cd0a37ea2fbbf9",
         ProofId::fromHex("8a2fcc5700a89f37a3726cdf3202353bf61f280815a9df744e3c"
                          "9de6215a745a"),
         444638638, ProofValidationResult::NONE},
        {"Properly signed 1 UTXO proof, P2SH payout script",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce680575db01b67"
         "5b042bf1ab89aa6ad3842804bb57bf87ebf2bfbcb169debdbf9c51e5d2638eb981bfd"
         "0e7465a5f3edd152d52b2f6d0108fcd277168be362e849e1f17a914da1745e9b549bd"
         "0bfa1a569971c77eba30cd5a4b87fea0a245528a4aadfc1dd5731c0cfe738e276c938"
         "15c69789fe97b15a5fb5b4f75b598ed94096205561e8d16203b8ef21763891d8e79a5"
         "9862bccbbd5bdf3a58",
         ProofId::fromHex("c61ee0416eb9549ea0e09dfd2c6062a11aa5d3ab0adcdf59abcc"
                          "02dd0de401fc"),
         444638638, ProofValidationResult::NONE},
        {"Properly signed 1 UTXO proof, 1-of-1 multisig payout script",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce680ea4c55850f"
         "587c7839fe254880547049a8be7c27cf511e440fa46237db32dced28e0c10edcf5ddb"
         "31e2f61e5c749e7324e7edf9aa09547810d64a12fb960a206255121023beefdde700a"
         "6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde351ae29eaecb058c9b"
         "b74eef68dbeaa5da8b96aacc00bc89c911095ad016cfbdc53b1eeb10a9f29d6c48a5f"
         "b3a1e6e30d332a05bdc67062f94acffbe6d6c909bb5643",
         ProofId::fromHex("29deedc94713bbc4d4f88fe96fae6801b91c5ae50601f158fa76"
                          "a036e18ea468"),
         444638638, ProofValidationResult::NONE},
        {"Properly signed 1 UTXO proof, 2-of-3 multisig payout script",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce680edf24d6c6e"
         "1ed44a0e0d651d5d2611f80e5c921778c3cbc2923fade878d7d9c69e5f4f7ff0c8dd9"
         "985ff427011c5cf0cac854c607e1d788d140f8b6d6010aad8695221023beefdde700a"
         "6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde321023beefdde700a6"
         "bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde321023beefdde700a6b"
         "c02036335b4df141c8bc67bb05a971f5ac2745fd683797dde353ae34814734c1bd2c4"
         "76fdae6fb1145530c3244878f3c2e0c2e5c05da14f17456aedee6beb80f68f42248fd"
         "89042346be54beaef7da8e549d7d5ff07f9a2cc63c83",
         ProofId::fromHex("c24dc13d98d0e0a80c19346b9590368557a66f0f65c0088c179d"
                          "89eca25107c8"),
         444638638, ProofValidationResult::NONE},
        {"Properly signed 1 UTXO proof, OP_RETURN payout script",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce680b746fe5c9d"
         "10002880169f03c69456f57d60589cd451c2fa078fc0241a022f2c6f1736b4bb49ea0"
         "d7b878e581de9625f301c68defeda9d506f9b128dbccb08481b6a19492077616e7420"
         "746f206275726e206d792072657761726473f42ae2e5fa253a700e5dcb3970a894db4"
         "48b61960b45c84723bf769d4dab0370994d0163e235b688da2fabc8e5b57e24805dce"
         "3baa62e064c32266a723c6adb6",
         ProofId::fromHex("bfc250ca1986177acc779f26eaff80aa8916d23cb3e7e0ce6d35"
                          "89c4f5ea364c"),
         444638638, ProofValidationResult::NONE},
        {"Invalid payout script (OP_FALSE)",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce68082a5aec394"
         "b2a25fedc70a81f93bb08b46a51bd1259f3f10fa421a4989039d74d30cf449de3b8b4"
         "6551b8ec927a83d16caaf8fc32636110407cfc9effbaf8c210100b71f0e77b4ad5d73"
         "d5a872ab43699309b5c194f72be5ee0812236c1a46a5b2c22ddd71d909cf52143f487"
         "54a61dfe0c6566342fa50b7d62c40fb44d1ff5abed3",
         ProofId::fromHex("046e75fa2d7f0868dcfa683bbdf657fc6a49b8f8b0d5c2dfdf90"
                          "736ded26b076"),
         444638638, ProofValidationResult::INVALID_PAYOUT_SCRIPT},
        {"Invalid payout script (1-of-5 multisig)",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce6804d972714d8"
         "bcdeb680cd736ee6252c92453d7de362b97007c77abe1d76c80c41b502aa331a94d50"
         "fb2d709b66a679e2b4b2385dd2f4fad13c85015fc4c6ae7e4ad5121023beefdde700a"
         "6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde321023beefdde700a6"
         "bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde321023beefdde700a6b"
         "c02036335b4df141c8bc67bb05a971f5ac2745fd683797dde321023beefdde700a6bc"
         "02036335b4df141c8bc67bb05a971f5ac2745fd683797dde321023beefdde700a6bc0"
         "2036335b4df141c8bc67bb05a971f5ac2745fd683797dde355ae005dfe80b01bc99f9"
         "3ae1d1c2d7176f7ea54a7f7c76b6eabb1aec5d31de170b0690282f624d01070fb2700"
         "18694aea6a73ac5b7a96e30ed69df9b7684298b986",
         ProofId::fromHex("e66b0ab11de5e2f358d2e1f65b1ebe608e4a1f10a9f5d42f1173"
                          "b262e1a218a6"),
         444638638, ProofValidationResult::INVALID_PAYOUT_SCRIPT},
        {"Changing the payout address changes the proof signature (P2PK) but "
         "not the stake signature",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce6804534ca1f5e"
         "22670be3df5cbd5957d8dd83d05c8f17eae391f0e7ffdce4fb3defadb7c079473ebec"
         "cf88c1f8ce87c61e451447b89c445967335ffd1aadef429982321023beefdde700a6b"
         "c02036335b4df141c8bc67bb05a971f5ac2745fd683797dde4ac7b0b7865200f63052"
         "ff980b93f965f398dda04917d411dd46e3c009a5fef35661fac28779b6a22760c0000"
         "4f5ddf7d9865c7fead7e4a840b947939590261640f",
         ProofId::fromHex("ce2812a1decdef0267e0266c68ab53c5ecad292f7b7d0fbd3db9"
                          "285a08ccd2a1"),
         444638638, ProofValidationResult::INVALID_PROOF_SIGNATURE},
        // The following tests are based on the valid 1 UTXO proof (P2PK script)
        {"Changing the sequence changes the proof signature",
         "da7587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce6808ef3a5bb64"
         "dc73a757aba041f348e7bc93c9c96f53a3d48a9a9df6f505f37283834788bad9370e9"
         "e6e702f8ba5323d38cb3b720adfefee6af4187ee6d9bed2482321023beefdde700a6b"
         "c02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3ac7b0b7865200f63052"
         "ff980b93f965f398dda04917d411dd46e3c009a5fef35661fac28779b6a22760c0000"
         "4f5ddf7d9865c7fead7e4a840b947939590261640f",
         ProofId::fromHex("37a08e004f35d6410b24a5724b8351b41d4e3ac04f285cd76d73"
                          "a023b2ae5519"),
         444638638, ProofValidationResult::INVALID_PROOF_SIGNATURE},
        {"Changing the expiration time changes the proof signature",
         "d97587e6c882615797011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce680e475b4323a"
         "a8775b6b0ab82985f515bd95fb1cc18389d40c7a59a49df1ffa788ae68cfcc21e60c0"
         "e39806e935ce19b71f1182f4ca83f51d654a95b2e9b021ea12321023beefdde700a6b"
         "c02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3ac7b0b7865200f63052"
         "ff980b93f965f398dda04917d411dd46e3c009a5fef35661fac28779b6a22760c0000"
         "4f5ddf7d9865c7fead7e4a840b947939590261640f",
         ProofId::fromHex("1312eff53594f63e61f044c36b2cf2d3e7e44c706f17bfabcf49"
                          "954741380bbc"),
         444638638, ProofValidationResult::INVALID_PROOF_SIGNATURE},
        {"Changing the master pubkey does NOT change the proof signature (but "
         "signature verification obviously fails)",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde40169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce680306b113bd2"
         "fc0e5c4f0cc46aed8a6c8efb0b5bcdc214ad78a29e00b1174c67d1c4576f4d815ba74"
         "ef6bdd0d8243402f6c4c8dcf71a4eb24d97f6d6b1d4a65b912321023beefdde700a6b"
         "c02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3ac7b0b7865200f63052"
         "ff980b93f965f398dda04917d411dd46e3c009a5fef35661fac28779b6a22760c0000"
         "4f5ddf7d9865c7fead7e4a840b947939590261640f",
         ProofId::fromHex("de837b44ae2df5408f89dc42039ae53a61ea508a15e214e69a50"
                          "d940b72e7713"),
         444638638, ProofValidationResult::INVALID_PROOF_SIGNATURE},
        {"Changing the TxId changes the proof signature",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde3016aa79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce680e0d7f1933e"
         "b1e4f9011b9cf363f198f764ff5d65f471f4e4568beeed834d15f6917378fc9f84a3a"
         "5c3e445329dbfed556d82ba43e74619e32baad4b3437e2f482321023beefdde700a6b"
         "c02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3ac7b0b7865200f63052"
         "ff980b93f965f398dda04917d411dd46e3c009a5fef35661fac28779b6a22760c0000"
         "4f5ddf7d9865c7fead7e4a840b947939590261640f",
         ProofId::fromHex("2c90b8359740d675952b570cca76ffb7c1a225984b8c7f47bc27"
                          "607c58a613b5"),
         444638638, ProofValidationResult::INVALID_PROOF_SIGNATURE},
        {"Changing the outpoint index changes the proof signature",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91df00cf21804712806594010038e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce6803671ac4cd4"
         "928d9db4be75e0213709e903855369c90f2bd8459ad24ad936a09c550b87d2ab7c7c0"
         "f1e7b18c484c65aa175e3fc10088b198334d9b2846d7c19272321023beefdde700a6b"
         "c02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3ac7b0b7865200f63052"
         "ff980b93f965f398dda04917d411dd46e3c009a5fef35661fac28779b6a22760c0000"
         "4f5ddf7d9865c7fead7e4a840b947939590261640f",
         ProofId::fromHex("289c082f835c2edd24b95e1aee7dbb353dff30cdcaab02d5dc2a"
                          "c44c57181468"),
         444638638, ProofValidationResult::INVALID_PROOF_SIGNATURE},
        {"Changing the amount changes the proof signature",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21814712806594010038e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce680c4a8d2cbb3"
         "ef086b41da91cbf99404c4970fee9cd8dff8c82d4169751e1049fb2506a194e14ef96"
         "4f308f1afdbb3853df59f58fa88cedcf71722f8130f89e6ef2321023beefdde700a6b"
         "c02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3ac7b0b7865200f63052"
         "ff980b93f965f398dda04917d411dd46e3c009a5fef35661fac28779b6a22760c0000"
         "4f5ddf7d9865c7fead7e4a840b947939590261640f",
         ProofId::fromHex("8d97d3ed1884462122976da4706778593fc4b5eaafb859bec0b4"
                          "5f590219f5ba"),
         444638638, ProofValidationResult::INVALID_PROOF_SIGNATURE},
        {"Changing the height changes the proof signature",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf2180471280659401003ae168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce6804fb8adfb4e"
         "08ad2e6284042968f65dfe365b975492fdac597c75ae91edcb3b0d7ad9352d0cff1b2"
         "7577eb5fc4646f0106d57d214f71ce21272eb31af09482f2b2321023beefdde700a6b"
         "c02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3ac7b0b7865200f63052"
         "ff980b93f965f398dda04917d411dd46e3c009a5fef35661fac28779b6a22760c0000"
         "4f5ddf7d9865c7fead7e4a840b947939590261640f",
         ProofId::fromHex("690cb3d74b5add1cfb7d4cf186426d41117586c57d59da330cc9"
                          "50e2d18d613c"),
         444638638, ProofValidationResult::INVALID_PROOF_SIGNATURE},
        {"Changing the coinbase flag changes the proof signature",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21804712806594010039e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce6807b0eeab05c"
         "31d69c288fab140311274530dea518a7b62846c33e6a087b489210fed85b8a18017d4"
         "30751e81e276aecdb565a3cd5c58b5a0f81cbf5af33196dfd2321023beefdde700a6b"
         "c02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3ac7b0b7865200f63052"
         "ff980b93f965f398dda04917d411dd46e3c009a5fef35661fac28779b6a22760c0000"
         "4f5ddf7d9865c7fead7e4a840b947939590261640f",
         ProofId::fromHex("f713dec5d2f798360748914face171d5a45706b9c5f0bc4d561f"
                          "6e80e098beef"),
         444638638, ProofValidationResult::INVALID_PROOF_SIGNATURE},
        {"Changing the stake pubkey changes the proof signature",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce6814534ca1f5e"
         "22670be3df5cbd5957d8dd83d05c8f17eae391f0e7ffdce4fb3defadb7c079473ebec"
         "cf88c1f8ce87c61e451447b89c445967335ffd1aadef429982321023beefdde700a6b"
         "c02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3ac7b0b7865200f63052"
         "ff980b93f965f398dda04917d411dd46e3c009a5fef35661fac28779b6a22760c0000"
         "4f5ddf7d9865c7fead7e4a840b947939590261640f",
         ProofId::fromHex("df84548b3a085e29d58ba5e83ad2fd1c9ecbe8595d4240f3f588"
                          "e52af84cc65b"),
         444638638, ProofValidationResult::INVALID_PROOF_SIGNATURE},
        {"Changing the stake signature does NOT change the proof signature",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce6804534ca1f5e"
         "22670be3df5cbd5957d8dd83d05c8f17eae391f0e7ffdce4fb3defadb7c079473ebec"
         "cf88c1f8ce87c61e451447b89c445967335ffd1aadef429992321023beefdde700a6b"
         "c02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3ac7b0b7865200f63052"
         "ff980b93f965f398dda04917d411dd46e3c009a5fef35661fac28779b6a22760c0000"
         "4f5ddf7d9865c7fead7e4a840b947939590261640f",
         ProofId::fromHex("455f34eb8a00b0799630071c0728481bdb1653035b1484ac33e9"
                          "74aa4ae7db6d"),
         444638638, ProofValidationResult::INVALID_STAKE_SIGNATURE},
        {"Adding a stake changes the proof signature but does not involve "
         "changing the previous stake signature",
         "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
         "c67bb05a971f5ac2745fd683797dde3026aa79ff23e1d58c64afad42ad81cffe53967"
         "e16beb692fc5776bb442c79c5d91df00cf2180471280659401003be168a32102449fb"
         "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce680f2adfb4bcb"
         "14bf1f6aa38a44994419bd34e9da07d972d3f092cd3ef037fe7bcd92e3d7073faa7e6"
         "e0697b9fab8670417959ab0b0958fdc576a11dffe599e851269a79ff23e1d58c64afa"
         "d42ad81cffe53967e16beb692fc5776bb442c79c5d91de00cf2180471280659401003"
         "8e168a32102449fb5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8"
         "bce6804534ca1f5e22670be3df5cbd5957d8dd83d05c8f17eae391f0e7ffdce4fb3de"
         "fadb7c079473ebeccf88c1f8ce87c61e451447b89c445967335ffd1aadef429982321"
         "023beefdde700a6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3ac9"
         "32ce54c4d405de52399cf48b4b10038d1bbbd65206f0934b2bdfc7b6a4a2e1cff1803"
         "a69bd03dd3897d4cfde46c2ee2cf17895880770c8b49089a26b6b5ff1e",
         ProofId::fromHex("96bd9fee759d81f9bc30e26015d979df3f6046c7a8764582d1a2"
                          "c5c3d61c2f44"),
         2 * 444638638, ProofValidationResult::NONE},
    };

    for (const auto &c : testCases) {
        Proof p;
        bilingual_str error;
        BOOST_CHECK(Proof::FromHex(p, c.hex, error));
        BOOST_CHECK_EQUAL(p.getId(), c.proofid);
        BOOST_CHECK_EQUAL(p.getScore(), c.score);

        ProofValidationState state;
        BOOST_CHECK_EQUAL(p.verify(PROOF_DUST_THRESHOLD, state),
                          c.result == ProofValidationResult::NONE);
        BOOST_CHECK(state.GetResult() == c.result);
        BOOST_TEST_MESSAGE(c.proofid);
    }
}

BOOST_AUTO_TEST_CASE(verify) {
    gArgs.ForceSetArg("-avaproofstakeutxoconfirmations", "1");

    auto key = CKey::MakeCompressedKey();
    const CPubKey pubkey = key.GetPubKey();

    const Amount value = 2 * PROOF_DUST_THRESHOLD;
    const uint32_t height = 10;

    ChainstateManager &chainman = *Assert(m_node.chainman);
    LOCK(cs_main);
    CCoinsViewCache &coins = chainman.ActiveChainstate().CoinsTip();

    COutPoint pkh_outpoint(TxId(m_rng.rand256()), m_rng.rand32());
    CTxOut pkh_output(value, GetScriptForRawPubKey(pubkey));
    coins.AddCoin(pkh_outpoint, Coin(pkh_output, height, false), false);

    COutPoint nonstd_outpoint(TxId(m_rng.rand256()), m_rng.rand32());
    CTxOut nonstd_output(value, CScript() << OP_TRUE);
    coins.AddCoin(nonstd_outpoint, Coin(nonstd_output, height, false), false);

    COutPoint p2sh_outpoint(TxId(m_rng.rand256()), m_rng.rand32());
    CTxOut p2sh_output(value,
                       GetScriptForDestination(ScriptHash(m_rng.rand160())));
    coins.AddCoin(p2sh_outpoint, Coin(p2sh_output, height, false), false);

    const auto runCheck = [&](const ProofValidationResult result,
                              const COutPoint &o, const Amount v,
                              const uint32_t h, const bool is_coinbase,
                              const CKey &k, int64_t expirationTime = 0) {
        // Generate a proof that match the UTXO.
        ProofBuilder pb(0, expirationTime, key,
                        UNSPENDABLE_ECREG_PAYOUT_SCRIPT);
        BOOST_CHECK(pb.addUTXO(o, v, h, is_coinbase, k));
        ProofRef p = pb.build();

        ProofValidationState state;
        BOOST_CHECK(p->verify(PROOF_DUST_THRESHOLD, state));
        LOCK(cs_main);
        BOOST_CHECK(p->verify(PROOF_DUST_THRESHOLD, chainman, state) ==
                    (result == ProofValidationResult::NONE));
        BOOST_CHECK(state.GetResult() == result);
    };

    const int64_t currentTipMTP = chainman.ActiveTip()->GetMedianTimePast();

    // Valid proof
    runCheck(ProofValidationResult::NONE, pkh_outpoint, value, height, false,
             key);

    // Expiration checks

    // Negative or zero expiration times means no expiration
    runCheck(ProofValidationResult::NONE, pkh_outpoint, value, height, false,
             key, -1);
    runCheck(ProofValidationResult::NONE, pkh_outpoint, value, height, false,
             key, 0);
    runCheck(ProofValidationResult::NONE, pkh_outpoint, value, height, false,
             key, std::numeric_limits<int64_t>::min());

    // The future
    runCheck(ProofValidationResult::NONE, pkh_outpoint, value, height, false,
             key, std::numeric_limits<int64_t>::max());
    runCheck(ProofValidationResult::NONE, pkh_outpoint, value, height, false,
             key, currentTipMTP + 1);

    // Expired proofs
    runCheck(ProofValidationResult::EXPIRED, pkh_outpoint, value, height, false,
             key, 1);
    runCheck(ProofValidationResult::EXPIRED, pkh_outpoint, value, height, false,
             key, currentTipMTP - 1);
    runCheck(ProofValidationResult::EXPIRED, pkh_outpoint, value, height, false,
             key, currentTipMTP);

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
             COutPoint(TxId(m_rng.rand256()), pkh_outpoint.GetN()), value,
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
        ProofRef p =
            ProofBuilder(0, 0, key, UNSPENDABLE_ECREG_PAYOUT_SCRIPT).build();

        ProofValidationState state;
        BOOST_CHECK(!p->verify(PROOF_DUST_THRESHOLD, chainman, state));
        BOOST_CHECK(state.GetResult() == ProofValidationResult::NO_STAKE);
    }

    // Dust thresold
    {
        // tuple<utxo value, dust threshold, result>
        const std::vector<std::tuple<Amount, Amount, ProofValidationResult>>
            testCases = {
                // Defaults
                {Amount::zero(), PROOF_DUST_THRESHOLD,
                 ProofValidationResult::DUST_THRESHOLD},
                {PROOF_DUST_THRESHOLD - 1 * SATOSHI, PROOF_DUST_THRESHOLD,
                 ProofValidationResult::DUST_THRESHOLD},
                {value, PROOF_DUST_THRESHOLD, ProofValidationResult::NONE},
                // Modified threshold
                {Amount::zero(), value, ProofValidationResult::DUST_THRESHOLD},
                {value - 1 * SATOSHI, value,
                 ProofValidationResult::DUST_THRESHOLD},
                {value, value, ProofValidationResult::NONE},
            };

        for (const auto &[utxoValue, dustThreshold, expectedResult] :
             testCases) {
            ProofBuilder pb(0, 0, key, UNSPENDABLE_ECREG_PAYOUT_SCRIPT);
            BOOST_CHECK(
                pb.addUTXO(pkh_outpoint, utxoValue, height, false, key));
            ProofRef p = pb.build();

            ProofValidationState state;
            BOOST_CHECK(p->verify(dustThreshold, chainman, state) ==
                        (expectedResult == ProofValidationResult::NONE));
            BOOST_CHECK(state.GetResult() == expectedResult);
        }
    }

    // Duplicated input
    {
        ProofBuilder pb(0, 0, key, UNSPENDABLE_ECREG_PAYOUT_SCRIPT);
        BOOST_CHECK(pb.addUTXO(pkh_outpoint, value, height, false, key));
        ProofRef p = TestProofBuilder::buildDuplicatedStakes(pb);

        ProofValidationState state;
        BOOST_CHECK(!p->verify(PROOF_DUST_THRESHOLD, chainman, state));
        BOOST_CHECK(state.GetResult() ==
                    ProofValidationResult::DUPLICATE_STAKE);
    }

    // Wrong stake ordering
    {
        COutPoint other_pkh_outpoint(TxId(m_rng.rand256()), m_rng.rand32());
        CTxOut other_pkh_output(value, GetScriptForRawPubKey(pubkey));
        coins.AddCoin(other_pkh_outpoint, Coin(other_pkh_output, height, false),
                      false);

        ProofBuilder pb(0, 0, key, UNSPENDABLE_ECREG_PAYOUT_SCRIPT);
        BOOST_CHECK(pb.addUTXO(pkh_outpoint, value, height, false, key));
        BOOST_CHECK(pb.addUTXO(other_pkh_outpoint, value, height, false, key));
        ProofRef p = TestProofBuilder::buildWithReversedOrderStakes(pb);

        ProofValidationState state;
        BOOST_CHECK(!p->verify(PROOF_DUST_THRESHOLD, chainman, state));
        BOOST_CHECK(state.GetResult() ==
                    ProofValidationResult::WRONG_STAKE_ORDERING);
    }

    // Immature stake
    {
        uint32_t chaintipHeight = chainman.ActiveHeight();

        // A proof where the UTXO is both missing and immature gives
        // MISSING_UTXO
        {
            gArgs.ForceSetArg("-avaproofstakeutxoconfirmations", "11");
            for (auto h = chaintipHeight; h > chaintipHeight - 10; h--) {
                COutPoint outpoint(TxId(m_rng.rand256()), m_rng.rand32());
                CTxOut output(value, GetScriptForRawPubKey(pubkey));
                runCheck(ProofValidationResult::MISSING_UTXO, outpoint, value,
                         h, false, key);

                // Add the coin to the UTXO set to verify it's immature
                coins.AddCoin(outpoint, Coin(output, h, false), false);
                runCheck(ProofValidationResult::IMMATURE_UTXO, outpoint, value,
                         h, false, key);
            }
        }

        // tuple<stake utxo confs, avaproofstakeutxoconfirmations, result>
        const std::vector<
            std::tuple<uint32_t, std::string, ProofValidationResult>>
            testCases = {
                // Require less or equal the number of confirmations the stake
                // has
                {chaintipHeight, "1", ProofValidationResult::NONE},
                {50, "1", ProofValidationResult::NONE},
                {50, "50", ProofValidationResult::NONE},
                {50, "51", ProofValidationResult::NONE},
                // Require more than the number of confirmations the stake has
                {chaintipHeight, "2", ProofValidationResult::IMMATURE_UTXO},
                {50, "52", ProofValidationResult::IMMATURE_UTXO},
                {50, "100", ProofValidationResult::IMMATURE_UTXO},
            };

        for (const auto &[stakeConfs, configuredStakeConfs, expectedResult] :
             testCases) {
            COutPoint outpoint(TxId(m_rng.rand256()), m_rng.rand32());
            CTxOut output(value, GetScriptForRawPubKey(pubkey));
            coins.AddCoin(outpoint, Coin(output, stakeConfs, false), false);

            gArgs.ForceSetArg("-avaproofstakeutxoconfirmations",
                              configuredStakeConfs);
            runCheck(expectedResult, outpoint, value, stakeConfs, false, key);
        }
        gArgs.ClearForcedArg("-avaproofstakeutxoconfirmations");
    }
}

BOOST_AUTO_TEST_CASE(deterministic_proofid) {
    auto key = CKey::MakeCompressedKey();

    const Amount value = 12345 * COIN;
    const uint32_t height = 10;

    std::vector<COutPoint> outpoints(10);
    for (size_t i = 0; i < 10; i++) {
        outpoints[i] = COutPoint(TxId(m_rng.rand256()), m_rng.rand32());
    }

    auto computeProofId = [&]() {
        ProofBuilder pb(0, 0, key, UNSPENDABLE_ECREG_PAYOUT_SCRIPT);
        for (const COutPoint &outpoint : outpoints) {
            BOOST_CHECK(pb.addUTXO(outpoint, value, height, false, key));
        }
        ProofRef p = pb.build();

        return p->getId();
    };

    const ProofId proofid = computeProofId();
    Shuffle(outpoints.begin(), outpoints.end(), FastRandomContext());
    BOOST_CHECK_EQUAL(proofid, computeProofId());
}

BOOST_AUTO_TEST_CASE(get_staked_amount) {
    auto key = CKey::MakeCompressedKey();
    ProofBuilder pb(10, 11, key, UNSPENDABLE_ECREG_PAYOUT_SCRIPT);

    {
        ProofRef p = pb.build();
        BOOST_CHECK_EQUAL(p->getStakedAmount(), Amount::zero());
    }

    for (int i = 1; i <= 10; i++) {
        BOOST_CHECK(pb.addUTXO(COutPoint(TxId(GetRandHash()), 0), i * COIN, 42,
                               false, key));
    }

    {
        ProofRef p = pb.build();
        BOOST_CHECK_EQUAL(p->getStakedAmount(), 55 * COIN);
    }
}

BOOST_AUTO_TEST_SUITE_END()
