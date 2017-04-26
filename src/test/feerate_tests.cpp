// Copyright (c) 2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <amount.h>

#include <test/test_bitcoin.h>

#include <boost/test/unit_test.hpp>

#include <array>

BOOST_FIXTURE_TEST_SUITE(feerate_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(GetFeeTest) {
    CFeeRate feeRate, altFeeRate;

    feeRate = CFeeRate(Amount::zero());
    // Must always return 0
    BOOST_CHECK_EQUAL(feeRate.GetFee(0), Amount::zero());
    BOOST_CHECK_EQUAL(feeRate.GetFee(1e5), Amount::zero());

    feeRate = CFeeRate(1000 * SATOSHI);
    // Must always just return the arg
    BOOST_CHECK_EQUAL(feeRate.GetFee(0), Amount::zero());
    BOOST_CHECK_EQUAL(feeRate.GetFee(1), SATOSHI);
    BOOST_CHECK_EQUAL(feeRate.GetFee(121), 121 * SATOSHI);
    BOOST_CHECK_EQUAL(feeRate.GetFee(999), 999 * SATOSHI);
    BOOST_CHECK_EQUAL(feeRate.GetFee(1000), 1000 * SATOSHI);
    BOOST_CHECK_EQUAL(feeRate.GetFee(9000), 9000 * SATOSHI);

    feeRate = CFeeRate(-1000 * SATOSHI);
    // Must always just return -1 * arg
    BOOST_CHECK_EQUAL(feeRate.GetFee(0), Amount::zero());
    BOOST_CHECK_EQUAL(feeRate.GetFee(1), -SATOSHI);
    BOOST_CHECK_EQUAL(feeRate.GetFee(121), -121 * SATOSHI);
    BOOST_CHECK_EQUAL(feeRate.GetFee(999), -999 * SATOSHI);
    BOOST_CHECK_EQUAL(feeRate.GetFee(1000), -1000 * SATOSHI);
    BOOST_CHECK_EQUAL(feeRate.GetFee(9000), -9000 * SATOSHI);

    feeRate = CFeeRate(123 * SATOSHI);
    // Truncates the result, if not integer
    BOOST_CHECK_EQUAL(feeRate.GetFee(0), Amount::zero());
    // Special case: returns 1 instead of 0
    BOOST_CHECK_EQUAL(feeRate.GetFee(8), SATOSHI);
    BOOST_CHECK_EQUAL(feeRate.GetFee(9), SATOSHI);
    BOOST_CHECK_EQUAL(feeRate.GetFee(121), 14 * SATOSHI);
    BOOST_CHECK_EQUAL(feeRate.GetFee(122), 15 * SATOSHI);
    BOOST_CHECK_EQUAL(feeRate.GetFee(999), 122 * SATOSHI);
    BOOST_CHECK_EQUAL(feeRate.GetFee(1000), 123 * SATOSHI);
    BOOST_CHECK_EQUAL(feeRate.GetFee(9000), 1107 * SATOSHI);

    feeRate = CFeeRate(-123 * SATOSHI);
    // Truncates the result, if not integer
    BOOST_CHECK_EQUAL(feeRate.GetFee(0), Amount::zero());
    // Special case: returns -1 instead of 0
    BOOST_CHECK_EQUAL(feeRate.GetFee(8), -SATOSHI);
    BOOST_CHECK_EQUAL(feeRate.GetFee(9), -SATOSHI);

    // Check ceiling results
    feeRate = CFeeRate(18 * SATOSHI);
    // Truncates the result, if not integer
    BOOST_CHECK_EQUAL(feeRate.GetFeeCeiling(0), Amount::zero());
    BOOST_CHECK_EQUAL(feeRate.GetFeeCeiling(100), 2 * SATOSHI);
    BOOST_CHECK_EQUAL(feeRate.GetFeeCeiling(200), 4 * SATOSHI);
    BOOST_CHECK_EQUAL(feeRate.GetFeeCeiling(1000), 18 * SATOSHI);

    // Check alternate constructor
    feeRate = CFeeRate(1000 * SATOSHI);
    altFeeRate = CFeeRate(feeRate);
    BOOST_CHECK_EQUAL(feeRate.GetFee(100), altFeeRate.GetFee(100));

    // Check full constructor
    // default value
    BOOST_CHECK(CFeeRate(-SATOSHI, 1000) == CFeeRate(-SATOSHI));
    BOOST_CHECK(CFeeRate(Amount::zero(), 1000) == CFeeRate(Amount::zero()));
    BOOST_CHECK(CFeeRate(SATOSHI, 1000) == CFeeRate(SATOSHI));
    // lost precision (can only resolve satoshis per kB)
    BOOST_CHECK(CFeeRate(SATOSHI, 1001) == CFeeRate(Amount::zero()));
    BOOST_CHECK(CFeeRate(2 * SATOSHI, 1001) == CFeeRate(SATOSHI));
    // some more integer checks
    BOOST_CHECK(CFeeRate(26 * SATOSHI, 789) == CFeeRate(32 * SATOSHI));
    BOOST_CHECK(CFeeRate(27 * SATOSHI, 789) == CFeeRate(34 * SATOSHI));
    // Maximum size in bytes, should not crash
    CFeeRate(MAX_MONEY, std::numeric_limits<size_t>::max() >> 1).GetFeePerK();
}

BOOST_AUTO_TEST_SUITE_END()
