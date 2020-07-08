// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/proof.h>

#include <streams.h>
#include <util/strencodings.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

using namespace avalanche;

BOOST_FIXTURE_TEST_SUITE(proof_tests, BasicTestingSetup)

struct TestVector {
    std::string name;
    std::string hex;
    ProofId proofid;
    uint32_t score;
};

BOOST_AUTO_TEST_CASE(deserialization) {
    std::vector<TestVector> testcases{
        {"No utxo staked",
         "96527eae083f1f24625f049d9e54bb9a2102a93d98bf42ab90cfc0bf9e7c634ed76a7"
         "3e95b02cacfd357b64e4fb6c92e92dd00",
         ProofId::fromHex("df721b6e2a857ce8abac63d8d5eca35f3bdb0293b6e8295942c7"
                          "6274c5418c0c"),
         0},
        {"1 utxo staked",
         "a6d66db9fe9378fdd37a0ad2c01c2acd2103648144bb6a0c1d09b0f04d0df6d55f914"
         "fd81efc65f23a718b68b7c9e42bd5430145a4d07798547464daa53acefb7c97c0c415"
         "ed8e81e549ff56a0ef6f847fcc9ca855b36200fe38dce5060000e707d7274104fb662"
         "6e21dbd1cc9feeecdefc9213fdce2b51ac4bb44e1f8dc6f14c2052f5dd7bfaeb2267a"
         "97ca2bec6e0dd4acf50a66204bde1ebb5d6c551684cff2f939920f7fbb2efd860d6d5"
         "926bf425eb47b78bf6979cdcd67eb705e2c9a4d45a0930ba25463178a3fb99cb28c8b"
         "77d8fcf68c54ebfadf08b9a446c251a0088301c50d53",
         ProofId::fromHex("048235ee870030f11c287d898dd3ec184f9b38cf4fb274334966"
                          "c6aad83b769d"),
         7584312},
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
         ProofId::fromHex("7319126f0d4efc188440dd50105ea30d792687b65e9cdde6c4d6"
                          "08ed226cba00"),
         15610172},
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
         ProofId::fromHex("3b3204993240ab338324310ecadc5f234da1dac0627029cef63e"
                          "1169a049d18f"),
         29026903},
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
         ProofId::fromHex("62f256d73411fe69bf0db6083248e4efb75be9788850851468ac"
                          "c913c5c14360"),
         44059793},
    };

    for (auto &c : testcases) {
        CDataStream stream(ParseHex(c.hex), SER_NETWORK, 0);
        Proof p;
        stream >> p;
        BOOST_CHECK_EQUAL(p.getId(), c.proofid);
        BOOST_CHECK_EQUAL(p.getScore(), c.score);
    }
}

BOOST_AUTO_TEST_CASE(proof_random) {
    for (int i = 0; i < 1000; i++) {
        const uint32_t score = InsecureRand32();
        const Proof p = Proof::makeRandom(score);
        BOOST_CHECK_EQUAL(p.getScore(), score);
    }
}

BOOST_AUTO_TEST_SUITE_END()
