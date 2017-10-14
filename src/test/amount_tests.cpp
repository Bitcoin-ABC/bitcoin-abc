// Copyright (c) 2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "amount.h"
#include "test/test_bitcoin.h"

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(amount_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(CAmountTests) {
    BOOST_CHECK(Amount(2) <= Amount(2));
    BOOST_CHECK(Amount(2) <= Amount(3));

    BOOST_CHECK(Amount(2) >= Amount(2));
    BOOST_CHECK(Amount(3) >= Amount(2));

    BOOST_CHECK(Amount(1) < Amount(2));
    BOOST_CHECK(Amount(-1) < Amount(0));

    BOOST_CHECK(Amount(2) > Amount(1));
    BOOST_CHECK(Amount(0) > Amount(-1));

    BOOST_CHECK(Amount(1) < Amount(2));
    BOOST_CHECK(Amount(-1) < Amount(0));

    BOOST_CHECK(Amount(2) > Amount(1));
    BOOST_CHECK(Amount(0) > Amount(-1));

    BOOST_CHECK(Amount(0) == Amount(0));
    BOOST_CHECK(Amount(0) != Amount(1));

    Amount amount(0);
    BOOST_CHECK_EQUAL(amount += Amount(1), Amount(1));
    BOOST_CHECK_EQUAL(amount += Amount(-1), Amount(0));
    BOOST_CHECK_EQUAL(amount -= Amount(1), Amount(-1));
    BOOST_CHECK_EQUAL(amount -= Amount(-1), Amount(0));

    BOOST_CHECK_EQUAL(COIN + COIN, Amount(2 * COIN));
    BOOST_CHECK_EQUAL(2 * COIN + COIN, Amount(3 * COIN));
    BOOST_CHECK_EQUAL(-1 * COIN + COIN, Amount(0));

    BOOST_CHECK_EQUAL(COIN - COIN, Amount(0));
    BOOST_CHECK_EQUAL(COIN - 2 * COIN, -1 * COIN);

    BOOST_CHECK_EQUAL(10 * Amount(10), Amount(100));
    BOOST_CHECK_EQUAL(-1 * Amount(1), Amount(-1));

    BOOST_CHECK_EQUAL(Amount(10) / 3, Amount(3));
    BOOST_CHECK_EQUAL(10 * COIN / COIN, 10.0);
    BOOST_CHECK_EQUAL(Amount(10) / -3, Amount(-3));
    BOOST_CHECK_EQUAL(-10 * COIN / (-1 * COIN), 10.0);

    BOOST_CHECK_EQUAL(Amount(100).GetSatoshis() / 10, 10);
    // This should probably be Banker's rounding,
    // but that's a large change
    BOOST_CHECK_EQUAL(Amount(100).GetSatoshis() / 3, 33);
    BOOST_CHECK_EQUAL(Amount(101).GetSatoshis() / 3, 33);

    // Modulus
    BOOST_CHECK_EQUAL(COIN.GetSatoshis() % 1, Amount(0));
    BOOST_CHECK_EQUAL((3 * COIN.GetSatoshis()) % (2 * COIN.GetSatoshis()),
                      COIN);
}

BOOST_AUTO_TEST_CASE(GetFeeTest) {
    CFeeRate feeRate;

    feeRate = CFeeRate(0);
    // Must always return 0
    BOOST_CHECK_EQUAL(feeRate.GetFee(0), 0);
    BOOST_CHECK_EQUAL(feeRate.GetFee(1e5), 0);

    feeRate = CFeeRate(1000);
    // Must always just return the arg
    BOOST_CHECK_EQUAL(feeRate.GetFee(0), 0);
    BOOST_CHECK_EQUAL(feeRate.GetFee(1), 1);
    BOOST_CHECK_EQUAL(feeRate.GetFee(121), 121);
    BOOST_CHECK_EQUAL(feeRate.GetFee(999), 999);
    BOOST_CHECK_EQUAL(feeRate.GetFee(1000), 1000);
    BOOST_CHECK_EQUAL(feeRate.GetFee(9000), 9000);

    feeRate = CFeeRate(-1000);
    // Must always just return -1 * arg
    BOOST_CHECK_EQUAL(feeRate.GetFee(0), 0);
    BOOST_CHECK_EQUAL(feeRate.GetFee(1), -1);
    BOOST_CHECK_EQUAL(feeRate.GetFee(121), -121);
    BOOST_CHECK_EQUAL(feeRate.GetFee(999), -999);
    BOOST_CHECK_EQUAL(feeRate.GetFee(1000), -1000);
    BOOST_CHECK_EQUAL(feeRate.GetFee(9000), -9000);

    feeRate = CFeeRate(123);
    // Truncates the result, if not integer
    BOOST_CHECK_EQUAL(feeRate.GetFee(0), 0);
    BOOST_CHECK_EQUAL(feeRate.GetFee(8),
                      1); // Special case: returns 1 instead of 0
    BOOST_CHECK_EQUAL(feeRate.GetFee(9), 1);
    BOOST_CHECK_EQUAL(feeRate.GetFee(121), 14);
    BOOST_CHECK_EQUAL(feeRate.GetFee(122), 15);
    BOOST_CHECK_EQUAL(feeRate.GetFee(999), 122);
    BOOST_CHECK_EQUAL(feeRate.GetFee(1000), 123);
    BOOST_CHECK_EQUAL(feeRate.GetFee(9000), 1107);

    feeRate = CFeeRate(-123);
    // Truncates the result, if not integer
    BOOST_CHECK_EQUAL(feeRate.GetFee(0), 0);
    BOOST_CHECK_EQUAL(feeRate.GetFee(8),
                      -1); // Special case: returns -1 instead of 0
    BOOST_CHECK_EQUAL(feeRate.GetFee(9), -1);

    // Check full constructor
    // default value
    BOOST_CHECK(CFeeRate(Amount(-1), 1000) == CFeeRate(-1));
    BOOST_CHECK(CFeeRate(Amount(0), 1000) == CFeeRate(0));
    BOOST_CHECK(CFeeRate(Amount(1), 1000) == CFeeRate(1));
    // lost precision (can only resolve satoshis per kB)
    BOOST_CHECK(CFeeRate(Amount(1), 1001) == CFeeRate(0));
    BOOST_CHECK(CFeeRate(Amount(2), 1001) == CFeeRate(1));
    // some more integer checks
    BOOST_CHECK(CFeeRate(Amount(26), 789) == CFeeRate(32));
    BOOST_CHECK(CFeeRate(Amount(27), 789) == CFeeRate(34));
    // Maximum size in bytes, should not crash
    CFeeRate(MAX_MONEY.GetSatoshis(), std::numeric_limits<size_t>::max() >> 1)
        .GetFeePerK();
}

BOOST_AUTO_TEST_SUITE_END()
