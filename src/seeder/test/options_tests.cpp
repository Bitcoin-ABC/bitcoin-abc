// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <seeder/options.h>
#include <util/system.h>

#include <boost/test/unit_test.hpp>

class ArgsTestingSetup {
public:
    ArgsManager argsManager;
    seeder::CDnsSeedOpts opts = seeder::CDnsSeedOpts(&argsManager);

    ArgsTestingSetup() { opts.SetupSeederArgs(); }
};

BOOST_AUTO_TEST_SUITE(options_tests)

BOOST_FIXTURE_TEST_CASE(options_defaults_test, ArgsTestingSetup) {
    const char *argv[] = {"ignored"};
    BOOST_CHECK(opts.ParseCommandLine(1, argv) == seeder::CONTINUE_EXECUTION);
    BOOST_CHECK(opts.nPort == seeder::DEFAULT_PORT);
    BOOST_CHECK(opts.nThreads == seeder::DEFAULT_NUM_THREADS);
    BOOST_CHECK(opts.nDnsThreads == seeder::DEFAULT_NUM_DNS_THREADS);
    BOOST_CHECK(opts.fWipeBan == seeder::DEFAULT_WIPE_BAN);
    BOOST_CHECK(opts.fWipeIgnore == seeder::DEFAULT_WIPE_IGNORE);
}

BOOST_FIXTURE_TEST_CASE(options_basic_test, ArgsTestingSetup) {
    const char *argv[] = {"ignored", "-host=seeder.bitcoinabc.org",
                          "-ns=localhost", "-mbox=email@bitcoinabc.org",
                          "-port=5555"};
    BOOST_CHECK(opts.ParseCommandLine(5, argv) == seeder::CONTINUE_EXECUTION);
    BOOST_CHECK(opts.host == "seeder.bitcoinabc.org");
    BOOST_CHECK(opts.ns == "localhost");
    BOOST_CHECK(opts.mbox == "email@bitcoinabc.org");
    BOOST_CHECK(opts.nPort == 5555);
}

BOOST_AUTO_TEST_SUITE_END()
