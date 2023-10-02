// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <consensus/amount.h>
#include <feerate.h>
#include <policy/fees.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(policy_fee_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(FeeRounder) {
    FastRandomContext rng{/*fDeterministic=*/true};
    FeeFilterRounder fee_rounder{CFeeRate{1000 * SATOSHI}, rng};

    // check that 1000 rounds to 974 or 1071
    std::set<Amount> results;
    while (results.size() < 2) {
        results.emplace(fee_rounder.round(1000 * SATOSHI));
    }
    BOOST_CHECK_EQUAL(*results.begin(), 974 * SATOSHI);
    BOOST_CHECK_EQUAL(*++results.begin(), 1071 * SATOSHI);

    // check that negative amounts rounds to 0
    BOOST_CHECK_EQUAL(fee_rounder.round(-0 * SATOSHI), Amount::zero());
    BOOST_CHECK_EQUAL(fee_rounder.round(-1 * SATOSHI), Amount::zero());

    // check that MAX_MONEY rounds to 9170997
    BOOST_CHECK_EQUAL(fee_rounder.round(MAX_MONEY), 9170997 * SATOSHI);
}

BOOST_AUTO_TEST_SUITE_END()
