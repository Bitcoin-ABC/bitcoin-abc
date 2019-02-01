// Copyright (c) 2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "test/lcg.h"

#include <boost/test/unit_test.hpp>

BOOST_AUTO_TEST_CASE(lcg_tests) {
    {
        MMIXLinearCongruentialGenerator lcg;
        // We want that the first iteration is 0 which is a helpful special
        // case.
        BOOST_CHECK_EQUAL(lcg.next(), 0x00000000);
        for (int i = 0; i < 99; i++) {
            lcg.next();
        }
        // Make sure the LCG is producing expected value after many iterations.
        // This ensures mul and add overflows are acting as expected on this
        // architecture.
        BOOST_CHECK_EQUAL(lcg.next(), 0xf306b780);
    }
    {
        MMIXLinearCongruentialGenerator lcg(42);
        // We this also should make first iteration as 0.
        BOOST_CHECK_EQUAL(lcg.next(), 0x00000000);
        for (int i = 0; i < 99; i++) {
            lcg.next();
        }
        // Make sure the LCG is producing expected value after many iterations.
        // This ensures mul and add overflows are acting as expected on this
        // architecture.
        BOOST_CHECK_EQUAL(lcg.next(), 0x3b96faf3);
    }
    {
        // just some big seed
        MMIXLinearCongruentialGenerator lcg(0xdeadbeef00000000);
        BOOST_CHECK_EQUAL(lcg.next(), 0xdeadbeef);
        for (int i = 0; i < 99; i++) {
            lcg.next();
        }
        // Make sure the LCG is producing expected value after many iterations.
        // This ensures mul and add overflows are acting as expected on this
        // architecture.
        BOOST_CHECK_EQUAL(lcg.next(), 0x6b00b1df);
    }
}
