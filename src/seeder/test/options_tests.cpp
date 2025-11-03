// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <common/args.h>
#include <seeder/options.h>
#include <util/string.h>

#include <boost/test/unit_test.hpp>

static const char *TEST_HOST = "-host=seeder.bitcoinabc.org";
static const char *TEST_NAMESERVER = "-ns=localhost";
static const char *TEST_EMAIL = "-mbox=email@bitcoinabc.org";

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
    BOOST_CHECK(opts.dumpInterval ==
                std::chrono::seconds(seeder::DEFAULT_DUMP_INTERVAL_SECONDS));
    BOOST_CHECK(opts.nPort == seeder::DEFAULT_PORT);
    BOOST_CHECK(opts.nThreads == seeder::DEFAULT_NUM_THREADS);
    BOOST_CHECK(opts.nDnsThreads == seeder::DEFAULT_NUM_DNS_THREADS);
    BOOST_CHECK(opts.fWipeBan == seeder::DEFAULT_WIPE_BAN);
    BOOST_CHECK(opts.fWipeIgnore == seeder::DEFAULT_WIPE_IGNORE);
}

BOOST_FIXTURE_TEST_CASE(options_basic_test, ArgsTestingSetup) {
    const char *argv[] = {"ignored", TEST_HOST, TEST_NAMESERVER, TEST_EMAIL,
                          "-port=5555"};
    BOOST_CHECK(opts.ParseCommandLine(5, argv) == seeder::CONTINUE_EXECUTION);
    BOOST_CHECK(opts.host == "seeder.bitcoinabc.org");
    BOOST_CHECK(opts.ns == "localhost");
    BOOST_CHECK(opts.mbox == "email@bitcoinabc.org");
    BOOST_CHECK(opts.nPort == 5555);
}

BOOST_FIXTURE_TEST_CASE(options_dumpinterval_test, ArgsTestingSetup) {
    const std::map<int, int> expectedResults = {
        {-9999, EXIT_FAILURE},
        {-1, EXIT_FAILURE},
        {0, EXIT_FAILURE},
        {1, seeder::CONTINUE_EXECUTION},
        {seeder::DEFAULT_DUMP_INTERVAL_SECONDS, seeder::CONTINUE_EXECUTION},
        {9999, seeder::CONTINUE_EXECUTION}};

    for (const auto &[dump_interval, code] : expectedResults) {
        const std::string testArg = "-dumpinterval=" + ToString(dump_interval);
        const char *argv[] = {"ignored", TEST_HOST, TEST_NAMESERVER, TEST_EMAIL,
                              testArg.c_str()};
        BOOST_CHECK(opts.ParseCommandLine(5, argv) == code);
        if (code == seeder::CONTINUE_EXECUTION) {
            BOOST_CHECK(opts.dumpInterval ==
                        std::chrono::seconds(dump_interval));
        }
    }
}

BOOST_FIXTURE_TEST_CASE(options_threads_test, ArgsTestingSetup) {
    const std::map<int, int> expectedResults = {
        {-9999, EXIT_FAILURE},
        {-1, EXIT_FAILURE},
        {0, EXIT_FAILURE},
        {1, seeder::CONTINUE_EXECUTION},
        {seeder::DEFAULT_NUM_THREADS, seeder::CONTINUE_EXECUTION},
        {9999, seeder::CONTINUE_EXECUTION}};

    for (const auto &[num_threads, code] : expectedResults) {
        const std::string testArg = "-threads=" + ToString(num_threads);
        const char *argv[] = {"ignored", TEST_HOST, TEST_NAMESERVER, TEST_EMAIL,
                              testArg.c_str()};
        BOOST_CHECK(opts.ParseCommandLine(5, argv) == code);
        if (code == seeder::CONTINUE_EXECUTION) {
            BOOST_CHECK(opts.nThreads == num_threads);
        }
    }
}

BOOST_FIXTURE_TEST_CASE(options_dns_threads_test, ArgsTestingSetup) {
    const std::map<int, int> expectedResults = {
        {-9999, EXIT_FAILURE},
        {-1, EXIT_FAILURE},
        {0, EXIT_FAILURE},
        {1, seeder::CONTINUE_EXECUTION},
        {seeder::DEFAULT_NUM_DNS_THREADS, seeder::CONTINUE_EXECUTION},
        {9999, seeder::CONTINUE_EXECUTION}};

    for (const auto &[num_threads, code] : expectedResults) {
        const std::string testArg = "-dnsthreads=" + ToString(num_threads);
        const char *argv[] = {"ignored", TEST_HOST, TEST_NAMESERVER, TEST_EMAIL,
                              testArg.c_str()};
        BOOST_CHECK(opts.ParseCommandLine(5, argv) == code);
        if (code == seeder::CONTINUE_EXECUTION) {
            BOOST_CHECK(opts.nDnsThreads == num_threads);
        }
    }
}

BOOST_FIXTURE_TEST_CASE(options_port_test, ArgsTestingSetup) {
    const std::map<int, int> expectedResults = {
        {-9999, EXIT_FAILURE},
        {-1, EXIT_FAILURE},
        // Note: port 0 indicates to the kernel that a random unused port should
        // be assigned
        {0, seeder::CONTINUE_EXECUTION},
        {1, seeder::CONTINUE_EXECUTION},
        {seeder::DEFAULT_PORT, seeder::CONTINUE_EXECUTION},
        {53, seeder::CONTINUE_EXECUTION},
        {15353, seeder::CONTINUE_EXECUTION},
        {65535, seeder::CONTINUE_EXECUTION},
        {65536, EXIT_FAILURE},
        {999999, EXIT_FAILURE}};

    for (const auto &[port, code] : expectedResults) {
        const std::string testArg = "-port=" + ToString(port);
        const char *argv[] = {"ignored", TEST_HOST, TEST_NAMESERVER, TEST_EMAIL,
                              testArg.c_str()};
        BOOST_CHECK(opts.ParseCommandLine(5, argv) == code);
        if (code == seeder::CONTINUE_EXECUTION) {
            BOOST_CHECK(opts.nPort == port);
        }
    }
}

BOOST_AUTO_TEST_SUITE_END()
