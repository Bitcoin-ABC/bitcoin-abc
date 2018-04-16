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

BOOST_AUTO_TEST_CASE(parse_push_test) {
    BOOST_CHECK_NO_THROW(ParseScript("0x01 0x01"));
    BOOST_CHECK_NO_THROW(ParseScript("0x01 XOR"));
    BOOST_CHECK_NO_THROW(ParseScript("0x01 1"));
    BOOST_CHECK_NO_THROW(ParseScript("0x01 ''"));
    BOOST_CHECK_NO_THROW(ParseScript("0x02 0x0101"));
    BOOST_CHECK_NO_THROW(ParseScript("0x02 42"));
    BOOST_CHECK_NO_THROW(ParseScript("0x02 'a'"));

    BOOST_CHECK_THROW(ParseScript("0x01 0x0101"), std::runtime_error);
    BOOST_CHECK_THROW(ParseScript("0x01 42"), std::runtime_error);
    BOOST_CHECK_THROW(ParseScript("0x02 0x01"), std::runtime_error);
    BOOST_CHECK_THROW(ParseScript("0x02 XOR"), std::runtime_error);
    BOOST_CHECK_THROW(ParseScript("0x02 1"), std::runtime_error);
    BOOST_CHECK_THROW(ParseScript("0x02 ''"), std::runtime_error);
    BOOST_CHECK_THROW(ParseScript("0x02 0x010101"), std::runtime_error);
    BOOST_CHECK_THROW(ParseScript("0x02 'ab'"), std::runtime_error);
}

BOOST_AUTO_TEST_SUITE_END()
