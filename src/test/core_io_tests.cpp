// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "core_io.h"
#include "test/test_bitcoin.h"

#include <boost/test/unit_test.hpp>
#include <string>

BOOST_FIXTURE_TEST_SUITE(core_io_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(parse_hex_test) {
    std::string s = "0x";
    BOOST_CHECK_THROW(ParseScript(s), std::runtime_error);

    for (int numZeroes = 1; numZeroes <= 32; numZeroes++) {
        s += "0";
        if (numZeroes % 2 == 0) {
            BOOST_CHECK_NO_THROW(ParseScript(s));
        } else {
            BOOST_CHECK_THROW(ParseScript(s), std::runtime_error);
        }
    }
}

BOOST_AUTO_TEST_SUITE_END()
