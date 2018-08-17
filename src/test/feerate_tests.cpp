// Copyright (c) 2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "amount.h"
#include "test/test_bitcoin.h"

#include <boost/test/unit_test.hpp>

#include <array>

BOOST_FIXTURE_TEST_SUITE(feerate_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(GetFeeTest) {
    CFeeRate feeRate;

    feeRate = CFeeRate(Amount(0));
    // Must always return 0
    BOOST_CHECK_EQUAL(feeRate.GetFee(0), Amount(0));
    BOOST_CHECK_EQUAL(feeRate.GetFee(1e5), Amount(0));

    feeRate = CFeeRate(Amount(1000));
    // Must always just return the arg
    BOOST_CHECK_EQUAL(feeRate.GetFee(0), Amount(0));
    BOOST_CHECK_EQUAL(feeRate.GetFee(1), Amount(1));
    BOOST_CHECK_EQUAL(feeRate.GetFee(121), Amount(121));
    BOOST_CHECK_EQUAL(feeRate.GetFee(999), Amount(999));
    BOOST_CHECK_EQUAL(feeRate.GetFee(1000), Amount(1000));
    BOOST_CHECK_EQUAL(feeRate.GetFee(9000), Amount(9000));

    feeRate = CFeeRate(Amount(-1000));
    // Must always just return -1 * arg
    BOOST_CHECK_EQUAL(feeRate.GetFee(0), Amount(0));
    BOOST_CHECK_EQUAL(feeRate.GetFee(1), Amount(-1));
    BOOST_CHECK_EQUAL(feeRate.GetFee(121), Amount(-121));
    BOOST_CHECK_EQUAL(feeRate.GetFee(999), Amount(-999));
    BOOST_CHECK_EQUAL(feeRate.GetFee(1000), Amount(-1000));
    BOOST_CHECK_EQUAL(feeRate.GetFee(9000), Amount(-9000));

    feeRate = CFeeRate(Amount(123));
    // Truncates the result, if not integer
    BOOST_CHECK_EQUAL(feeRate.GetFee(0), Amount(0));
    // Special case: returns 1 instead of 0
    BOOST_CHECK_EQUAL(feeRate.GetFee(8), Amount(1));
    BOOST_CHECK_EQUAL(feeRate.GetFee(9), Amount(1));
    BOOST_CHECK_EQUAL(feeRate.GetFee(121), Amount(14));
    BOOST_CHECK_EQUAL(feeRate.GetFee(122), Amount(15));
    BOOST_CHECK_EQUAL(feeRate.GetFee(999), Amount(122));
    BOOST_CHECK_EQUAL(feeRate.GetFee(1000), Amount(123));
    BOOST_CHECK_EQUAL(feeRate.GetFee(9000), Amount(1107));

    feeRate = CFeeRate(Amount(-123));
    // Truncates the result, if not integer
    BOOST_CHECK_EQUAL(feeRate.GetFee(0), Amount(0));
    // Special case: returns -1 instead of 0
    BOOST_CHECK_EQUAL(feeRate.GetFee(8), Amount(-1));
    BOOST_CHECK_EQUAL(feeRate.GetFee(9), Amount(-1));

    // Check ceiling results
    feeRate = CFeeRate(Amount(18));
    // Truncates the result, if not integer
    BOOST_CHECK_EQUAL(feeRate.GetFeeCeiling(0), Amount(0));
    BOOST_CHECK_EQUAL(feeRate.GetFeeCeiling(100), Amount(2));
    BOOST_CHECK_EQUAL(feeRate.GetFeeCeiling(200), Amount(4));
    BOOST_CHECK_EQUAL(feeRate.GetFeeCeiling(1000), Amount(18));

    // Check full constructor
    // default value
    BOOST_CHECK(CFeeRate(Amount(-1), 1000) == CFeeRate(Amount(-1)));
    BOOST_CHECK(CFeeRate(Amount(0), 1000) == CFeeRate(Amount(0)));
    BOOST_CHECK(CFeeRate(Amount(1), 1000) == CFeeRate(Amount(1)));
    // lost precision (can only resolve satoshis per kB)
    BOOST_CHECK(CFeeRate(Amount(1), 1001) == CFeeRate(Amount(0)));
    BOOST_CHECK(CFeeRate(Amount(2), 1001) == CFeeRate(Amount(1)));
    // some more integer checks
    BOOST_CHECK(CFeeRate(Amount(26), 789) == CFeeRate(Amount(32)));
    BOOST_CHECK(CFeeRate(Amount(27), 789) == CFeeRate(Amount(34)));
    // Maximum size in bytes, should not crash
    CFeeRate(MAX_MONEY, std::numeric_limits<size_t>::max() >> 1).GetFeePerK();
}

BOOST_AUTO_TEST_SUITE_END()
