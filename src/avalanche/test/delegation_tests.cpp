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

static Proof getProof() {
    Proof p;
    CDataStream stream(
        ParseHex(
            "0000000000000000ffffffff000000002103717ba63ac0a84495aca04d0cbffea2"
            "684d2306ec53f3b90c064989f9d0e8761701bee72758084395310b5a7ccc98a836"
            "11dff786f0a469d1d66626ba286b0423870000000000108dbe1c000000a4090000"
            "21021a766cd1dc8bd54252a61592c9c3b1c06495f2f6965ad950dbe9f8b1890670"
            "bdb68872cb4bea3a981986a6a6b5d84636d4adc8f8c0e956392dd114b2241ec8df"
            "a79ff1580d8b4fd6bfdecea98a164ee2fd23157a97f31624cc740063a7b69b4f"),
        SER_NETWORK, 0);
    stream >> p;
    BOOST_CHECK_EQUAL(p.getId(),
                      ProofId::fromHex("004caaf05fb28c2e12fbf930b7f941baf06d2e3"
                                       "db210d8e55b22a4cd11d41d71"));
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
         "711dd411cda4225be5d810b23d2e6df0ba41f9b730f9fb122e8cb25ff0aa4c0000",
         "004caaf05fb28c2e12fbf930b7f941baf06d2e3db210d8e55b22a4cd11d41d71",
         "03717ba63ac0a84495aca04d0cbffea2684d2306ec53f3b90c064989f9d0e87617",
         DelegationResult::NONE},
        {"One delegation",
         "711dd411cda4225be5d810b23d2e6df0ba41f9b730f9fb122e8cb25ff0aa4c0001210"
         "3e1f0e1af2f5cd09bb0b37be8c4e100788dda36b2aa8c9b45fac54728177aaaab0347"
         "5811c001c4c7cccccc38bb3308917c116187cd2becd4a0158072a5b8f3b64fcd8667c"
         "cb06beed29b48dd4cd113570779136e1dba6892343c104832675c78",
         "70aa515da27335d39db7a7a721d14a3dce07bc5d919982e2082d2fa6c5cc4652",
         "03e1f0e1af2f5cd09bb0b37be8c4e100788dda36b2aa8c9b45fac54728177aaaab",
         DelegationResult::NONE},
        {"Two delegation",
         "711dd411cda4225be5d810b23d2e6df0ba41f9b730f9fb122e8cb25ff0aa4c0002210"
         "3e1f0e1af2f5cd09bb0b37be8c4e100788dda36b2aa8c9b45fac54728177aaaab0347"
         "5811c001c4c7cccccc38bb3308917c116187cd2becd4a0158072a5b8f3b64fcd8667c"
         "cb06beed29b48dd4cd113570779136e1dba6892343c104832675c782103068e41c1a9"
         "4a095cc0fcda08cf2add169e00d39f126d9dfa0c6f4bdfb397819f3a8ebb3ef304147"
         "087f7fa3b2ae60921a241a503bcbd844bf63cf88f75380aebeae9ef0592fab2c66730"
         "bc64d09387d97ac7019171b83a3cac43c3350c85d61a",
         "232cb4c5c9261ba92b885ba1af63212c0b9b9d1e0e0bc68c80e22b05a7a48887",
         "03068e41c1a94a095cc0fcda08cf2add169e00d39f126d9dfa0c6f4bdfb397819f",
         DelegationResult::NONE},
        {"Incorrect proof",
         "721dd411cda4225be5d810b23d2e6df0ba41f9b730f9fb122e8cb25ff0aa4c0000",
         "004caaf05fb28c2e12fbf930b7f941baf06d2e3db210d8e55b22a4cd11d41d72", "",
         DelegationResult::INCORRECT_PROOF},
        {"Invalid pubkey",
         "711dd411cda4225be5d810b23d2e6df0ba41f9b730f9fb122e8cb25ff0aa4c0001210"
         "3e1f0e1af3f5cd09bb0b37be8c4e100788dda36b2aa8c9b45fac54728177aaaab0347"
         "5811c001c4c7cccccc38bb3308917c116187cd2becd4a0158072a5b8f3b64fcd8667c"
         "cb06beed29b48dd4cd113570779136e1dba6892343c104832675c78",
         "101319ff1c4153492a0b14d4e2539396b2da92452756bbf8069f28690cbdba4e",
         "03717ba63ac0a84495aca04d0cbffea2684d2306ec53f3b90c064989f9d0e87617",
         DelegationResult::INVALID_SIGNATURE},
        {"Invalid signature",
         "711dd411cda4225be5d810b23d2e6df0ba41f9b730f9fb122e8cb25ff0aa4c0001210"
         "3e1f0e1af2f5cd09bb0b37be8c4e100788dda36b2aa8c9b45fac54728177aaaab0347"
         "5811c001c4c7ccccccc8bb3308917c116187cd2becd4a0158072a5b8f3b64fcd8667c"
         "cb06beed29b48dd4cd113570779136e1dba6892343c104832675c78",
         "70aa515da27335d39db7a7a721d14a3dce07bc5d919982e2082d2fa6c5cc4652",
         "03717ba63ac0a84495aca04d0cbffea2684d2306ec53f3b90c064989f9d0e87617",
         DelegationResult::INVALID_SIGNATURE},
        {"Second invalid key",
         "711dd411cda4225be5d810b23d2e6df0ba41f9b730f9fb122e8cb25ff0aa4c0002210"
         "3e1f0e1af2f5cd09bb0b37be8c4e100788dda36b2aa8c9b45fac54728177aaaab0347"
         "5811c001c4c7cccccc38bb3308917c116187cd2becd4a0158072a5b8f3b64fcd8667c"
         "cb06beed29b48dd4cd113570779136e1dba6892343c104832675c782103068e41c2a9"
         "4a095cc0fcda08cf2add169e00d39f126d9dfa0c6f4bdfb397819f3a8ebb3ef304147"
         "087f7fa3b2ae60921a241a503bcbd844bf63cf88f75380aebeae9ef0592fab2c66730"
         "bc64d09387d97ac7019171b83a3cac43c3350c85d61a",
         "78c9222e1031fd85f0efe619de1f58c78ad4497a23693bc38c3fd20466215b1a",
         "03e1f0e1af2f5cd09bb0b37be8c4e100788dda36b2aa8c9b45fac54728177aaaab",
         DelegationResult::INVALID_SIGNATURE},
        {"Second invalid signature",
         "711dd411cda4225be5d810b23d2e6df0ba41f9b730f9fb122e8cb25ff0aa4c0002210"
         "3e1f0e1af2f5cd09bb0b37be8c4e100788dda36b2aa8c9b45fac54728177aaaab0347"
         "5811c001c4c7cccccc38bb3308917c116187cd2becd4a0158072a5b8f3b64fcd8667c"
         "cb06beed29b48dd4cd113570779136e1dba6892343c104832675c782103068e41c1a9"
         "4a095cc0fcda08cf2add169e00d39f126d9dfa0c6f4bdfb397819f3a8ebb3ef304147"
         "087f7fa3b2ae60921a241a504bcbd844bf63cf88f75380aebeae9ef0592fab2c66730"
         "bc64d09387d97ac7019171b83a3cac43c3350c85d61a",
         "232cb4c5c9261ba92b885ba1af63212c0b9b9d1e0e0bc68c80e22b05a7a48887",
         "03e1f0e1af2f5cd09bb0b37be8c4e100788dda36b2aa8c9b45fac54728177aaaab",
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
