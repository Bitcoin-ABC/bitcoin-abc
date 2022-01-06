// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <seeder/options.h>

#include <boost/test/unit_test.hpp>

BOOST_AUTO_TEST_SUITE(options_tests)

BOOST_AUTO_TEST_CASE(options_basic_test) {
    CDnsSeedOpts opts;
    const char *argv[] = {"ignored", "-host=seeder.bitcoinabc.org",
                          "-ns=localhost", "-mbox=email@bitcoinabc.org",
                          "-port=5555"};
    BOOST_CHECK(opts.ParseCommandLine(5, argv) == CONTINUE_EXECUTION);
    BOOST_CHECK(opts.host == "seeder.bitcoinabc.org");
    BOOST_CHECK(opts.ns == "localhost");
    BOOST_CHECK(opts.mbox == "email@bitcoinabc.org");
    BOOST_CHECK(opts.nPort == 5555);
}

BOOST_AUTO_TEST_SUITE_END()
