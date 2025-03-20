// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/delegation.h>
#include <avalanche/delegationbuilder.h>
#include <avalanche/test/util.h>
#include <avalanche/validation.h>
#include <util/strencodings.h>
#include <util/translation.h>
#include <validation.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

using namespace avalanche;

BOOST_FIXTURE_TEST_SUITE(delegation_tests, TestingSetup)

static void CheckDelegation(const Delegation &dg, const ProofRef &p,
                            const CPubKey &expected_pubkey) {
    DelegationState state;
    CPubKey pubkey;
    BOOST_CHECK(dg.verify(state, pubkey));
    BOOST_CHECK(state.GetResult() == DelegationResult::NONE);
    BOOST_CHECK(pubkey == expected_pubkey);

    BOOST_CHECK(dg.getProofId() == p->getId());
}

BOOST_AUTO_TEST_CASE(verify_random) {
    auto key = CKey::MakeCompressedKey();

    auto p = buildRandomProof(Assert(m_node.chainman)->ActiveChainstate(),
                              123456, 1234, key);
    DelegationBuilder dgb(*p);

    {
        Delegation dg = dgb.build();
        BOOST_CHECK_EQUAL(dg.getId(), p->getId());
        CheckDelegation(dg, p, p->getMaster());
    }

    auto l1key = CKey::MakeCompressedKey();
    BOOST_CHECK(!dgb.addLevel(l1key, key.GetPubKey()));

    dgb.addLevel(key, l1key.GetPubKey());
    CheckDelegation(dgb.build(), p, l1key.GetPubKey());

    auto l2key = CKey::MakeCompressedKey();
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

struct TestVector {
    std::string name;
    std::string hex;
    std::string dgid;
    std::string pubkey;
    DelegationResult result;
};

BOOST_AUTO_TEST_CASE(deserialization) {
    std::vector<TestVector> testcases{
        {"Empty delegation",
         "46116afa1abaab88b96c115c248b77c7d8e099565c5fb40731482c6655ca450d21"
         "023beefdde700a6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3"
         "00",
         "afc74900c1f28b69e466461fb1e0663352da6153be0fcd59280e27f2446391d5",
         "023beefdde700a6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3",
         DelegationResult::NONE},
        {"One delegation",
         "46116afa1abaab88b96c115c248b77c7d8e099565c5fb40731482c6655ca450d21"
         "023beefdde700a6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3"
         "012103e49f9df52de2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e645e"
         "f7d51"
         "2ddbea7c88dcf38412b58374856a466e165797a69321c0928a89c64521f7e2e767c93"
         "de645ef5125ec901dcd51347787ca29771e7786bbe402d2d5ead0dc",
         "ffcd49dc98ebdbc90e731a7b0c89939bfe082f15f3aa82aca657176b83669185",
         "03e49f9df52de2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e645ef",
         DelegationResult::NONE},
        {"Two delegation",
         "46116afa1abaab88b96c115c248b77c7d8e099565c5fb40731482c6655ca450d21"
         "023beefdde700a6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3"
         "022103e49f9df52de2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e645e"
         "f7d512ddbea7c88dcf38412b58374856a466e165797a69321c0928a89c64521f7e2e7"
         "67c93de645ef5125ec901dcd51347787ca29771e7786bbe402d2d5ead0dc2103aac52"
         "f4cfca700e7e9824298e0184755112e32f359c832f5f6ad2ef62a2c024a5cddd0ffe8"
         "4e12e4bf49e4c0af7c8548e618a24e12495d659f5ba75e114e1526a618aa305b1e69b"
         "f6ae20b2557999f2e3fec25d5f2271f8b9de0d06ba7344550",
         "a3f98e6b5ec330219493d109e5c11ed8e302315df4604b5462e9fb80cb0fde89",
         "03aac52f4cfca700e7e9824298e0184755112e32f359c832f5f6ad2ef62a2c024a",
         DelegationResult::NONE},
        {"Invalid pubkey",
         "46116afa1abaab88b96c115c248b77c7d8e099565c5fb40731482c6655ca450d21"
         "023beefdde700a6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3012"
         "103e49f9df53de2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e645ef7d"
         "512ddbea7c88dcf38412b58374856a466e165797a69321c0928a89c64521f7e2e767c"
         "93de645ef5125ec901dcd51347787ca29771e7786bbe402d2d5ead0dc",
         "af7e82716489c3cf3f361d449ed815112ff619f7fc34a4803bd958c68d1e2684",
         "023beefdde700a6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3",
         DelegationResult::INVALID_SIGNATURE},
        {"Invalid signature",
         "46116afa1abaab88b96c115c248b77c7d8e099565c5fb40731482c6655ca450d21"
         "023beefdde700a6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3"
         "012103e49f9df52de2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e645e"
         "f7d512ddbea7c88dcf38412c58374856a466e165797a69321c0928a89c64521f7e2e7"
         "67c93de645ef5125ec901dcd51347787ca29771e7786bbe402d2d5ead0dc",
         "ffcd49dc98ebdbc90e731a7b0c89939bfe082f15f3aa82aca657176b83669185",
         "023beefdde700a6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3",
         DelegationResult::INVALID_SIGNATURE},
        {"Second invalid key",
         "46116afa1abaab88b96c115c248b77c7d8e099565c5fb40731482c6655ca450d21"
         "023beefdde700a6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3"
         "022103e49f9df52de2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e645e"
         "f7d512ddbea7c88dcf38412b58374856a466e165797a69321c0928a89c64521f7e2e7"
         "67c93de645ef5125ec901dcd51347787ca29771e7786bbe402d2d5ead0dc2103aac52"
         "f4dfca700e7e9824298e0184755112e32f359c832f5f6ad2ef62a2c024a5cddd0ffe8"
         "4e12e4bf49e4c0af7c8548e618a24e12495d659f5ba75e114e1526a618aa305b1e69b"
         "f6ae20b2557999f2e3fec25d5f2271f8b9de0d06ba7344550",
         "b474512f71a3f5a6e94cc3b958fd658ece0d0632ace58c8c8f9f65c2b9ad5fad",
         "03e49f9df52de2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e645ef",
         DelegationResult::INVALID_SIGNATURE},
        {"Second invalid signature",
         "46116afa1abaab88b96c115c248b77c7d8e099565c5fb40731482c6655ca450d21"
         "023beefdde700a6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3"
         "022103e49f9df52de2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e645e"
         "f7d512ddbea7c88dcf38412b58374856a466e165797a69321c0928a89c64521f7e2e7"
         "67c93de645ef5125ec901dcd51347787ca29771e7786bbe402d2d5ead0dc2103aac52"
         "f4cfca700e7e9824298e0184755112e32f359c832f5f6ad2ef62a2c024a5cddd0ffe8"
         "4e12e4bf49e4c0af7c8548e618a24e12495d659f5ba75e114e1526a618aa305b1e69b"
         "f6ae20b2557999f2e3fec25d5f2271f8b9de0d06ba7344551",
         "a3f98e6b5ec330219493d109e5c11ed8e302315df4604b5462e9fb80cb0fde89",
         "03e49f9df52de2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e645ef",
         DelegationResult::INVALID_SIGNATURE},
    };

    for (auto &c : testcases) {
        Delegation dg;
        bilingual_str error;
        BOOST_CHECK(Delegation::FromHex(dg, c.hex, error));
        BOOST_CHECK_EQUAL(dg.getId(), DelegationId::fromHex(c.dgid));

        DelegationState state;
        CPubKey pubkey;
        BOOST_CHECK_EQUAL(dg.verify(state, pubkey),
                          c.result == DelegationResult::NONE);
        BOOST_CHECK(state.GetResult() == c.result);
        BOOST_CHECK(pubkey == CPubKey(ParseHex(c.pubkey)));
    }
}

BOOST_AUTO_TEST_CASE(level_limit) {
    auto proofKey = CKey::MakeCompressedKey();
    auto p = buildRandomProof(Assert(m_node.chainman)->ActiveChainstate(),
                              123456, 1234, proofKey);

    DelegationBuilder dgb(*p);

    CKey delegatorKey = proofKey;
    for (size_t i = 0; i < MAX_DELEGATION_LEVELS; i++) {
        CKey delegatedKey = CKey::MakeCompressedKey();
        BOOST_CHECK(dgb.addLevel(delegatorKey, delegatedKey.GetPubKey()));
        delegatorKey = delegatedKey;
    }

    Delegation dgGood = dgb.build();
    // Up to MAX_DELEGATION_LEVELS the delegation is verified valid
    CheckDelegation(dgGood, p, delegatorKey.GetPubKey());

    // Let's add one more delegation level
    DelegationBuilder dgb2(dgGood);
    CKey delegatedKey = CKey::MakeCompressedKey();
    BOOST_CHECK(dgb2.addLevel(delegatorKey, delegatedKey.GetPubKey()));
    Delegation dgBad = dgb2.build();

    // The delegation is now expected to fail due to too many levels
    DelegationState state;
    CPubKey auth;
    BOOST_CHECK(!dgBad.verify(state, auth));
    BOOST_CHECK(state.GetResult() == DelegationResult::TOO_MANY_LEVELS);
}

BOOST_AUTO_TEST_SUITE_END()
