// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#define BOOST_TEST_MODULE Avalanche Test Suite
#include <boost/test/unit_test.hpp>

#include <test/util/setup_common.h>

/** Redirect debug log to boost log */
const std::function<void(const std::string &)> G_TEST_LOG_FUN =
    [](const std::string &s) {
        if (s.back() == '\n') {
            // boost will insert the new line
            BOOST_TEST_MESSAGE(s.substr(0, s.size() - 1));
        } else {
            BOOST_TEST_MESSAGE(s);
        }
    };
