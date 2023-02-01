// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <util/hasher.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(hasher_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(hasher_txdestinationhasher) {
    const auto hasher1 = TxDestinationHasher();
    const auto hasher2 = TxDestinationHasher();

    const std::vector<uint8_t> hash = {118, 160, 64,  83,  189, 160, 168,
                                       139, 218, 81,  119, 184, 106, 21,
                                       195, 178, 159, 85,  152, 115};

    const CTxDestination dstNone = CNoDestination{};
    const CTxDestination dstKey = PKHash(uint160(hash));
    const CTxDestination dstScript = ScriptHash(uint160(hash));

    // A hasher should return the same hash for a given tx destination
    BOOST_CHECK(hasher1(dstNone) == hasher1(CNoDestination{}));
    BOOST_CHECK(hasher1(dstKey) == hasher1(PKHash(uint160(hash))));
    BOOST_CHECK(hasher1(dstScript) == hasher1(ScriptHash(uint160(hash))));

    // Two hashers should not return the same output for given input
    BOOST_CHECK(hasher1(dstNone) != hasher2(dstNone));
    BOOST_CHECK(hasher1(dstKey) != hasher2(dstKey));
    BOOST_CHECK(hasher1(dstScript) != hasher2(dstScript));
}

BOOST_AUTO_TEST_SUITE_END()
