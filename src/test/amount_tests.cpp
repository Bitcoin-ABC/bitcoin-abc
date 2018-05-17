// Copyright (c) 2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "amount.h"
#include "test/test_bitcoin.h"

#include <boost/test/unit_test.hpp>

#include <array>

BOOST_FIXTURE_TEST_SUITE(amount_tests, BasicTestingSetup)

static void CheckAmounts(int64_t aval, int64_t bval) {
    Amount a(aval), b(bval);

    // Equality
    BOOST_CHECK_EQUAL(a == b, aval == bval);
    BOOST_CHECK_EQUAL(b == a, aval == bval);

    BOOST_CHECK_EQUAL(a != b, aval != bval);
    BOOST_CHECK_EQUAL(b != a, aval != bval);

    // Comparison
    BOOST_CHECK_EQUAL(a < b, aval < bval);
    BOOST_CHECK_EQUAL(b < a, bval < aval);

    BOOST_CHECK_EQUAL(a > b, aval > bval);
    BOOST_CHECK_EQUAL(b > a, bval > aval);

    BOOST_CHECK_EQUAL(a <= b, aval <= bval);
    BOOST_CHECK_EQUAL(b <= a, bval <= aval);

    BOOST_CHECK_EQUAL(a >= b, aval >= bval);
    BOOST_CHECK_EQUAL(b >= a, bval >= aval);

    // Unary minus
    BOOST_CHECK_EQUAL(-a, Amount(-aval));
    BOOST_CHECK_EQUAL(-b, Amount(-bval));

    // Addition and subtraction.
    BOOST_CHECK_EQUAL(a + b, b + a);
    BOOST_CHECK_EQUAL(a + b, Amount(aval + bval));

    BOOST_CHECK_EQUAL(a - b, -(b - a));
    BOOST_CHECK_EQUAL(a - b, Amount(aval - bval));

    // Multiplication
    BOOST_CHECK_EQUAL(aval * b, bval * a);
    BOOST_CHECK_EQUAL(aval * b, Amount(aval * bval));

    // Division
    if (b != Amount(0)) {
        BOOST_CHECK_EQUAL(a / b, aval / bval);
        BOOST_CHECK_EQUAL(a / bval, Amount(a / b));
    }

    if (a != Amount(0)) {
        BOOST_CHECK_EQUAL(b / a, bval / aval);
        BOOST_CHECK_EQUAL(b / aval, Amount(b / a));
    }

    // Modulus
    if (b != Amount(0)) {
        BOOST_CHECK_EQUAL(a % b, aval % bval);
        BOOST_CHECK_EQUAL(a % bval, Amount(a % b));
    }

    if (a != Amount(0)) {
        BOOST_CHECK_EQUAL(b % a, bval % aval);
        BOOST_CHECK_EQUAL(b % aval, Amount(b % a));
    }

    // OpAssign
    Amount v(0);
    v += a;
    BOOST_CHECK_EQUAL(v, a);
    v += b;
    BOOST_CHECK_EQUAL(v, a + b);
    v += b;
    BOOST_CHECK_EQUAL(v, a + 2 * b);
    v -= 2 * a;
    BOOST_CHECK_EQUAL(v, 2 * b - a);
}

BOOST_AUTO_TEST_CASE(AmountTests) {
    std::array<int64_t, 8> values = {{-23, -1, 0, 1, 2, 3, 42, 99999999}};

    for (int64_t i : values) {
        for (int64_t j : values) {
            CheckAmounts(i, j);
        }
    }

    BOOST_CHECK_EQUAL(COIN + COIN, Amount(2 * COIN));
    BOOST_CHECK_EQUAL(2 * COIN + COIN, Amount(3 * COIN));
    BOOST_CHECK_EQUAL(-1 * COIN + COIN, Amount(0));

    BOOST_CHECK_EQUAL(COIN - COIN, Amount(0));
    BOOST_CHECK_EQUAL(COIN - 2 * COIN, -1 * COIN);
}

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
