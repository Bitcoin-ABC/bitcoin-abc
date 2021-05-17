// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/delegation.h>
#include <avalanche/delegationbuilder.h>
#include <avalanche/test/util.h>
#include <avalanche/validation.h>
#include <streams.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

#include <streams.h>
#include <util/strencodings.h>

using namespace avalanche;

BOOST_FIXTURE_TEST_SUITE(delegation_tests, TestingSetup)

static void CheckDelegation(const Delegation &dg, const Proof &p,
                            const CPubKey &expected_pubkey) {
    DelegationState state;
    CPubKey pubkey;
    BOOST_CHECK(dg.verify(state, p, pubkey));
    BOOST_CHECK(state.GetResult() == DelegationResult::NONE);
    BOOST_CHECK(pubkey == expected_pubkey);

    const Proof altp = buildRandomProof(654321);
    BOOST_CHECK(!dg.verify(state, altp, pubkey));
    BOOST_CHECK(state.GetResult() == DelegationResult::INCORRECT_PROOF);
}

BOOST_AUTO_TEST_CASE(verify_random) {
    CKey key;
    key.MakeNewKey(true);

    const Proof p = buildRandomProof(123456, key.GetPubKey());
    DelegationBuilder dgb(p);

    {
        Delegation dg = dgb.build();
        BOOST_CHECK_EQUAL(dg.getId(), p.getId());
        CheckDelegation(dg, p, p.getMaster());
    }

    CKey l1key;
    l1key.MakeNewKey(true);
    BOOST_CHECK(!dgb.addLevel(l1key, key.GetPubKey()));

    dgb.addLevel(key, l1key.GetPubKey());
    CheckDelegation(dgb.build(), p, l1key.GetPubKey());

    CKey l2key;
    l2key.MakeNewKey(true);
    BOOST_CHECK(!dgb.addLevel(key, l2key.GetPubKey()));
    BOOST_CHECK(!dgb.addLevel(l2key, l2key.GetPubKey()));

    dgb.addLevel(l1key, l2key.GetPubKey());
    CheckDelegation(dgb.build(), p, l2key.GetPubKey());
}

// Proof master priv:
//     L4J6gEE4wL9ji2EQbzS5dPMTTsw8LRvcMst1Utij4e3X5ccUSdqW
// Proof master pub:
//     023beefdde700a6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3
// Stake priv:
//     KydYrKDNsVnY5uhpLyC4UmazuJvUjNoKJhEEv9f1mdK1D5zcnMSM
// Stake pub:
//     02449fb5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce680
// Level 1 priv:
//     KzzLLtiYiyFcTXPWUzywt2yEKk5FxkGbMfKhWgBd4oZdt8t8kk77
// Level 1 pub:
//     03e49f9df52de2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e645ef
// Level 2 priv:
//     KwM6hV6hxZt3Kt4NHMtWQGH5T2SwhpyswodUQC2zmSjg6KWFWkQU
// Level 2 pub:
//     03aac52f4cfca700e7e9824298e0184755112e32f359c832f5f6ad2ef62a2c024a

static Proof getProof() {
    Proof p;
    CDataStream stream(
        ParseHex(
            "0000000000000000ffffffff0000000021023beefdde700a6bc02036335b4df141"
            "c8bc67bb05a971f5ac2745fd683797dde301bee72758084395310b5a7ccc98a836"
            "11dff786f0a469d1d66626ba286b0423870000000000108dbe1c000000a4090000"
            "2102449fb5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce6"
            "8069c539018ac799848811fb44a4b987faa71a634970d35976c5e766fb98502432"
            "aaec53034bd7df23767e7e695203599cf4a6a71569bdf03e90f0f91c8760faae"),
        SER_NETWORK, 0);
    stream >> p;
    BOOST_CHECK_EQUAL(p.getId(),
                      ProofId::fromHex("afc74900c1f28b69e466461fb1e0663352da615"
                                       "3be0fcd59280e27f2446391d5"));
    return p;
}

struct TestVector {
    std::string name;
    std::string hex;
    std::string dgid;
    std::string pubkey;
    DelegationResult result;
};

BOOST_AUTO_TEST_CASE(deserialization) {
    Proof p = getProof();

    std::vector<TestVector> testcases{
        {"Empty delegation",
         "d5916344f2270e2859cd0fbe5361da523366e0b11f4666e4698bf2c10049c7af00",
         "afc74900c1f28b69e466461fb1e0663352da6153be0fcd59280e27f2446391d5",
         "023beefdde700a6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3",
         DelegationResult::NONE},
        {"One delegation",
         "d5916344f2270e2859cd0fbe5361da523366e0b11f4666e4698bf2c10049c7af01210"
         "3e49f9df52de2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e645ef7d51"
         "2ddbea7c88dcf38412b58374856a466e165797a69321c0928a89c64521f7e2e767c93"
         "de645ef5125ec901dcd51347787ca29771e7786bbe402d2d5ead0dc",
         "ffcd49dc98ebdbc90e731a7b0c89939bfe082f15f3aa82aca657176b83669185",
         "03e49f9df52de2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e645ef",
         DelegationResult::NONE},
        {"Two delegation",
         "d5916344f2270e2859cd0fbe5361da523366e0b11f4666e4698bf2c10049c7af02210"
         "3e49f9df52de2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e645ef7d51"
         "2ddbea7c88dcf38412b58374856a466e165797a69321c0928a89c64521f7e2e767c93"
         "de645ef5125ec901dcd51347787ca29771e7786bbe402d2d5ead0dc2103aac52f4cfc"
         "a700e7e9824298e0184755112e32f359c832f5f6ad2ef62a2c024a5cddd0ffe84e12e"
         "4bf49e4c0af7c8548e618a24e12495d659f5ba75e114e1526a618aa305b1e69bf6ae2"
         "0b2557999f2e3fec25d5f2271f8b9de0d06ba7344550",
         "a3f98e6b5ec330219493d109e5c11ed8e302315df4604b5462e9fb80cb0fde89",
         "03aac52f4cfca700e7e9824298e0184755112e32f359c832f5f6ad2ef62a2c024a",
         DelegationResult::NONE},
        {"Incorrect proof",
         "721dd411cda4225be5d810b23d2e6df0ba41f9b730f9fb122e8cb25ff0aa4c0000",
         "004caaf05fb28c2e12fbf930b7f941baf06d2e3db210d8e55b22a4cd11d41d72", "",
         DelegationResult::INCORRECT_PROOF},
        {"Invalid pubkey",
         "d5916344f2270e2859cd0fbe5361da523366e0b11f4666e4698bf2c10049c7af01210"
         "3e49f9df53de2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e645ef7d51"
         "2ddbea7c88dcf38412b58374856a466e165797a69321c0928a89c64521f7e2e767c93"
         "de645ef5125ec901dcd51347787ca29771e7786bbe402d2d5ead0dc",
         "af7e82716489c3cf3f361d449ed815112ff619f7fc34a4803bd958c68d1e2684",
         "023beefdde700a6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3",
         DelegationResult::INVALID_SIGNATURE},
        {"Invalid signature",
         "d5916344f2270e2859cd0fbe5361da523366e0b11f4666e4698bf2c10049c7af01210"
         "3e49f9df52de2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e645ef7d51"
         "2ddbea7c88dcf38412c58374856a466e165797a69321c0928a89c64521f7e2e767c93"
         "de645ef5125ec901dcd51347787ca29771e7786bbe402d2d5ead0dc",
         "ffcd49dc98ebdbc90e731a7b0c89939bfe082f15f3aa82aca657176b83669185",
         "023beefdde700a6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3",
         DelegationResult::INVALID_SIGNATURE},
        {"Second invalid key",
         "d5916344f2270e2859cd0fbe5361da523366e0b11f4666e4698bf2c10049c7af02210"
         "3e49f9df52de2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e645ef7d51"
         "2ddbea7c88dcf38412b58374856a466e165797a69321c0928a89c64521f7e2e767c93"
         "de645ef5125ec901dcd51347787ca29771e7786bbe402d2d5ead0dc2103aac52f4dfc"
         "a700e7e9824298e0184755112e32f359c832f5f6ad2ef62a2c024a5cddd0ffe84e12e"
         "4bf49e4c0af7c8548e618a24e12495d659f5ba75e114e1526a618aa305b1e69bf6ae2"
         "0b2557999f2e3fec25d5f2271f8b9de0d06ba7344550",
         "b474512f71a3f5a6e94cc3b958fd658ece0d0632ace58c8c8f9f65c2b9ad5fad",
         "03e49f9df52de2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e645ef",
         DelegationResult::INVALID_SIGNATURE},
        {"Second invalid signature",
         "d5916344f2270e2859cd0fbe5361da523366e0b11f4666e4698bf2c10049c7af02210"
         "3e49f9df52de2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e645ef7d51"
         "2ddbea7c88dcf38412b58374856a466e165797a69321c0928a89c64521f7e2e767c93"
         "de645ef5125ec901dcd51347787ca29771e7786bbe402d2d5ead0dc2103aac52f4cfc"
         "a700e7e9824298e0184755112e32f359c832f5f6ad2ef62a2c024a5cddd0ffe84e12e"
         "4bf49e4c0af7c8548e618a24e12495d659f5ba75e114e1526a618aa305b1e69bf6ae2"
         "0b2557999f2e3fec25d5f2271f8b9de0d06ba7344551",
         "a3f98e6b5ec330219493d109e5c11ed8e302315df4604b5462e9fb80cb0fde89",
         "03e49f9df52de2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e645ef",
         DelegationResult::INVALID_SIGNATURE},
    };

    for (auto &c : testcases) {
        CDataStream stream(ParseHex(c.hex), SER_NETWORK, 0);
        Delegation dg;
        stream >> dg;
        BOOST_CHECK_EQUAL(dg.getId(), DelegationId::fromHex(c.dgid));

        DelegationState state;
        CPubKey pubkey;
        BOOST_CHECK_EQUAL(dg.verify(state, p, pubkey),
                          c.result == DelegationResult::NONE);
        BOOST_CHECK(state.GetResult() == c.result);
        BOOST_CHECK(pubkey == CPubKey(ParseHex(c.pubkey)));
    }
}

BOOST_AUTO_TEST_SUITE_END()
