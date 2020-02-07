// Copyright (c) 2017-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <script/script.h>

#include <chainparams.h>
#include <config.h>
#include <consensus/validation.h>
#include <validation.h>

#include <test/test_bitcoin.h>

#include <boost/test/unit_test.hpp>

#include <string>
#include <vector>

BOOST_FIXTURE_TEST_SUITE(script_commitment_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(test_is_commitment) {
    std::vector<uint8_t> data{};

    // Empty commitment.
    auto s = CScript() << OP_RETURN << data;
    BOOST_CHECK(s.IsCommitment(data));

    // Commitment to a value of the wrong size.
    data.push_back(42);
    BOOST_CHECK(!s.IsCommitment(data));

    // Not a commitment.
    s = CScript() << data;
    BOOST_CHECK(!s.IsCommitment(data));

    // Non empty commitment.
    s = CScript() << OP_RETURN << data;
    BOOST_CHECK(s.IsCommitment(data));

    // Commitment to the wrong value.
    data[0] = 0x42;
    BOOST_CHECK(!s.IsCommitment(data));

    // Commitment to a larger value.
    std::string str = "Bitcoin: A peer-to-peer Electronic Cash System";
    data = std::vector<uint8_t>(str.begin(), str.end());
    BOOST_CHECK(!s.IsCommitment(data));

    s = CScript() << OP_RETURN << data;
    BOOST_CHECK(s.IsCommitment(data));

    // 64 bytes commitment, still valid.
    data.resize(64);
    s = CScript() << OP_RETURN << data;
    BOOST_CHECK(s.IsCommitment(data));

    // Commitment is too large.
    data.push_back(23);
    s = CScript() << OP_RETURN << data;
    BOOST_CHECK(!s.IsCommitment(data));
}

BOOST_AUTO_TEST_SUITE_END()
