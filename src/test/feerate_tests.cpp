// Copyright (c) 2016-present The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <consensus/amount.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

#include <array>

BOOST_FIXTURE_TEST_SUITE(feerate_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(GetFeeTest) {
    CFeeRate feeRate{Amount::zero()};

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
    // Rounds up the result, if not integer
    BOOST_CHECK_EQUAL(feeRate.GetFee(0), Amount::zero());
    BOOST_CHECK_EQUAL(feeRate.GetFee(1), SATOSHI);
    BOOST_CHECK_EQUAL(feeRate.GetFee(8), SATOSHI);
    BOOST_CHECK_EQUAL(feeRate.GetFee(9), 2 * SATOSHI);
    BOOST_CHECK_EQUAL(feeRate.GetFee(121), 15 * SATOSHI);
    BOOST_CHECK_EQUAL(feeRate.GetFee(122), 16 * SATOSHI);
    BOOST_CHECK_EQUAL(feeRate.GetFee(999), 123 * SATOSHI);
    BOOST_CHECK_EQUAL(feeRate.GetFee(1000), 123 * SATOSHI);
    BOOST_CHECK_EQUAL(feeRate.GetFee(9000), 1107 * SATOSHI);

    feeRate = CFeeRate(-123 * SATOSHI);
    // Rounds up the result, if not integer
    BOOST_CHECK_EQUAL(feeRate.GetFee(0), Amount::zero());
    // Special case: returns -1 instead of 0
    BOOST_CHECK_EQUAL(feeRate.GetFee(1), -SATOSHI);
    BOOST_CHECK_EQUAL(feeRate.GetFee(8), -SATOSHI);
    // Back to the normal case
    BOOST_CHECK_EQUAL(feeRate.GetFee(9), -SATOSHI);
    BOOST_CHECK_EQUAL(feeRate.GetFee(121), -14 * SATOSHI);
    BOOST_CHECK_EQUAL(feeRate.GetFee(122), -15 * SATOSHI);
    BOOST_CHECK_EQUAL(feeRate.GetFee(999), -122 * SATOSHI);
    BOOST_CHECK_EQUAL(feeRate.GetFee(1000), -123 * SATOSHI);
    BOOST_CHECK_EQUAL(feeRate.GetFee(9000), -1107 * SATOSHI);

    // Check ceiling results
    feeRate = CFeeRate(18 * SATOSHI);
    // Rounds up the result, if not integer
    BOOST_CHECK_EQUAL(feeRate.GetFee(0), Amount::zero());
    BOOST_CHECK_EQUAL(feeRate.GetFee(100), 2 * SATOSHI);
    BOOST_CHECK_EQUAL(feeRate.GetFee(200), 4 * SATOSHI);
    BOOST_CHECK_EQUAL(feeRate.GetFee(1000), 18 * SATOSHI);

    // Check alternate constructor
    feeRate = CFeeRate(1000 * SATOSHI);
    auto altFeeRate = CFeeRate(feeRate);
    BOOST_CHECK_EQUAL(feeRate.GetFee(100), altFeeRate.GetFee(100));

    // Check full constructor
    BOOST_CHECK(CFeeRate(-SATOSHI, 0) == CFeeRate(Amount::zero()));
    BOOST_CHECK(CFeeRate(Amount::zero(), 0) == CFeeRate(Amount::zero()));
    BOOST_CHECK(CFeeRate(SATOSHI, 0) == CFeeRate(Amount::zero()));
    BOOST_CHECK(CFeeRate(SATOSHI, -1000) == CFeeRate(Amount::zero()));
    // default value
    BOOST_CHECK(CFeeRate(-SATOSHI, 1000) == CFeeRate(-SATOSHI));
    BOOST_CHECK(CFeeRate(Amount::zero(), 1000) == CFeeRate(Amount::zero()));
    BOOST_CHECK(CFeeRate(SATOSHI, 1000) == CFeeRate(SATOSHI));
    // Previously, precision was limited to three decimal digits
    // due to only supporting satoshis per kB, so CFeeRate(SATOSHI, 1001) was
    // equal to CFeeRate(0).
    // Since CFeeRate uses FeeFrac internally, higher precision is maintained.
    BOOST_CHECK(CFeeRate(SATOSHI, 1001) > CFeeRate(Amount::zero()) &&
                CFeeRate(SATOSHI, 1001) < CFeeRate(SATOSHI));
    BOOST_CHECK(CFeeRate(2 * SATOSHI, 1001) > CFeeRate(SATOSHI) &&
                CFeeRate(2 * SATOSHI, 1001) < CFeeRate(2 * SATOSHI));
    // some more integer checks
    BOOST_CHECK(CFeeRate(26 * SATOSHI, 789) > CFeeRate(32 * SATOSHI) &&
                CFeeRate(26 * SATOSHI, 789) < CFeeRate(33 * SATOSHI));
    BOOST_CHECK(CFeeRate(27 * SATOSHI, 789) > CFeeRate(34 * SATOSHI) &&
                CFeeRate(27 * SATOSHI, 789) < CFeeRate(35 * SATOSHI));
    // Maximum size in bytes, should not crash
    CFeeRate(MAX_MONEY, std::numeric_limits<int32_t>::max()).GetFeePerK();
}

BOOST_AUTO_TEST_CASE(FeeAddTests) {
    auto zero = CFeeRate(Amount::zero());
    auto a = CFeeRate(SATOSHI);
    a += zero;
    BOOST_CHECK(a == CFeeRate(SATOSHI));
    a += a;
    BOOST_CHECK(a == CFeeRate(2000 * SATOSHI, 1'000'000));

    // Below 1 sat / 1000 bytes, we run into rounding issues when adding
    auto b = CFeeRate(SATOSHI, 1001);
    b += zero;
    BOOST_CHECK(b == zero);
}

BOOST_AUTO_TEST_SUITE_END()
