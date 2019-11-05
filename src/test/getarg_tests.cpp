// Copyright (c) 2012-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <util/strencodings.h>
#include <util/system.h>

#include <test/util/setup_common.h>

#include <univalue.h>

#include <boost/algorithm/string.hpp>
#include <boost/test/unit_test.hpp>

#include <string>
#include <utility>
#include <vector>

BOOST_FIXTURE_TEST_SUITE(getarg_tests, BasicTestingSetup)

static void ResetArgs(ArgsManager &am, const std::string &strArg) {
    std::vector<std::string> vecArg;
    if (strArg.size()) {
        boost::split(vecArg, strArg, IsSpace, boost::token_compress_on);
    }

    // Insert dummy executable name:
    vecArg.insert(vecArg.begin(), "testbitcoin");

    // Convert to char*:
    std::vector<const char *> vecChar;
    for (const std::string &s : vecArg) {
        vecChar.push_back(s.c_str());
    }

    std::string error;
    BOOST_CHECK(am.ParseParameters(vecChar.size(), vecChar.data(), error));
}

static void
SetupArgs(ArgsManager &am,
          const std::vector<std::pair<std::string, unsigned int>> &args) {
    am.ClearArgs();
    for (const auto &arg : args) {
        am.AddArg(arg.first, "", arg.second, OptionsCategory::OPTIONS);
    }
}

BOOST_AUTO_TEST_CASE(boolarg) {
    ArgsManager am;
    const auto foo = std::make_pair("-foo", ArgsManager::ALLOW_ANY);
    SetupArgs(am, {foo});
    ResetArgs(am, "-foo");
    BOOST_CHECK(am.GetBoolArg("-foo", false));
    BOOST_CHECK(am.GetBoolArg("-foo", true));

    BOOST_CHECK(!am.GetBoolArg("-fo", false));
    BOOST_CHECK(am.GetBoolArg("-fo", true));

    BOOST_CHECK(!am.GetBoolArg("-fooo", false));
    BOOST_CHECK(am.GetBoolArg("-fooo", true));

    ResetArgs(am, "-foo=0");
    BOOST_CHECK(!am.GetBoolArg("-foo", false));
    BOOST_CHECK(!am.GetBoolArg("-foo", true));

    ResetArgs(am, "-foo=1");
    BOOST_CHECK(am.GetBoolArg("-foo", false));
    BOOST_CHECK(am.GetBoolArg("-foo", true));

    // New 0.6 feature: auto-map -nosomething to !-something:
    ResetArgs(am, "-nofoo");
    BOOST_CHECK(!am.GetBoolArg("-foo", false));
    BOOST_CHECK(!am.GetBoolArg("-foo", true));

    ResetArgs(am, "-nofoo=1");
    BOOST_CHECK(!am.GetBoolArg("-foo", false));
    BOOST_CHECK(!am.GetBoolArg("-foo", true));

    // -nofoo should win
    ResetArgs(am, "-foo -nofoo");
    BOOST_CHECK(!am.GetBoolArg("-foo", false));
    BOOST_CHECK(!am.GetBoolArg("-foo", true));

    // -nofoo should win
    ResetArgs(am, "-foo=1 -nofoo=1");
    BOOST_CHECK(!am.GetBoolArg("-foo", false));
    BOOST_CHECK(!am.GetBoolArg("-foo", true));

    // -nofoo=0 should win
    ResetArgs(am, "-foo=0 -nofoo=0");
    BOOST_CHECK(am.GetBoolArg("-foo", false));
    BOOST_CHECK(am.GetBoolArg("-foo", true));

    // New 0.6 feature: treat -- same as -:
    ResetArgs(am, "--foo=1");
    BOOST_CHECK(am.GetBoolArg("-foo", false));
    BOOST_CHECK(am.GetBoolArg("-foo", true));

    ResetArgs(am, "--nofoo=1");
    BOOST_CHECK(!am.GetBoolArg("-foo", false));
    BOOST_CHECK(!am.GetBoolArg("-foo", true));
}

BOOST_AUTO_TEST_CASE(stringarg) {
    ArgsManager am;
    const auto foo = std::make_pair("-foo", ArgsManager::ALLOW_ANY);
    const auto bar = std::make_pair("-bar", ArgsManager::ALLOW_ANY);
    SetupArgs(am, {foo, bar});
    ResetArgs(am, "");
    BOOST_CHECK_EQUAL(am.GetArg("-foo", ""), "");
    BOOST_CHECK_EQUAL(am.GetArg("-foo", "eleven"), "eleven");

    ResetArgs(am, "-foo -bar");
    BOOST_CHECK_EQUAL(am.GetArg("-foo", ""), "");
    BOOST_CHECK_EQUAL(am.GetArg("-foo", "eleven"), "");

    ResetArgs(am, "-foo=");
    BOOST_CHECK_EQUAL(am.GetArg("-foo", ""), "");
    BOOST_CHECK_EQUAL(am.GetArg("-foo", "eleven"), "");

    ResetArgs(am, "-foo=11");
    BOOST_CHECK_EQUAL(am.GetArg("-foo", ""), "11");
    BOOST_CHECK_EQUAL(am.GetArg("-foo", "eleven"), "11");

    ResetArgs(am, "-foo=eleven");
    BOOST_CHECK_EQUAL(am.GetArg("-foo", ""), "eleven");
    BOOST_CHECK_EQUAL(am.GetArg("-foo", "eleven"), "eleven");
}

BOOST_AUTO_TEST_CASE(intarg) {
    ArgsManager am;
    const auto foo = std::make_pair("-foo", ArgsManager::ALLOW_ANY);
    const auto bar = std::make_pair("-bar", ArgsManager::ALLOW_ANY);
    SetupArgs(am, {foo, bar});
    ResetArgs(am, "");
    BOOST_CHECK_EQUAL(am.GetArg("-foo", 11), 11);
    BOOST_CHECK_EQUAL(am.GetArg("-foo", 0), 0);

    ResetArgs(am, "-foo -bar");
    BOOST_CHECK_EQUAL(am.GetArg("-foo", 11), 0);
    BOOST_CHECK_EQUAL(am.GetArg("-bar", 11), 0);

    ResetArgs(am, "-foo=11 -bar=12");
    BOOST_CHECK_EQUAL(am.GetArg("-foo", 0), 11);
    BOOST_CHECK_EQUAL(am.GetArg("-bar", 11), 12);

    ResetArgs(am, "-foo=NaN -bar=NotANumber");
    BOOST_CHECK_EQUAL(am.GetArg("-foo", 1), 0);
    BOOST_CHECK_EQUAL(am.GetArg("-bar", 11), 0);
}

BOOST_AUTO_TEST_CASE(doubledash) {
    ArgsManager am;
    const auto foo = std::make_pair("-foo", ArgsManager::ALLOW_ANY);
    const auto bar = std::make_pair("-bar", ArgsManager::ALLOW_ANY);
    SetupArgs(am, {foo, bar});
    ResetArgs(am, "--foo");
    BOOST_CHECK_EQUAL(am.GetBoolArg("-foo", false), true);

    ResetArgs(am, "--foo=verbose --bar=1");
    BOOST_CHECK_EQUAL(am.GetArg("-foo", ""), "verbose");
    BOOST_CHECK_EQUAL(am.GetArg("-bar", 0), 1);
}

BOOST_AUTO_TEST_CASE(boolargno) {
    ArgsManager am;
    const auto foo = std::make_pair("-foo", ArgsManager::ALLOW_ANY);
    const auto bar = std::make_pair("-bar", ArgsManager::ALLOW_ANY);
    SetupArgs(am, {foo, bar});
    ResetArgs(am, "-nofoo");
    BOOST_CHECK(!am.GetBoolArg("-foo", true));
    BOOST_CHECK(!am.GetBoolArg("-foo", false));

    ResetArgs(am, "-nofoo=1");
    BOOST_CHECK(!am.GetBoolArg("-foo", true));
    BOOST_CHECK(!am.GetBoolArg("-foo", false));

    ResetArgs(am, "-nofoo=0");
    BOOST_CHECK(am.GetBoolArg("-foo", true));
    BOOST_CHECK(am.GetBoolArg("-foo", false));

    // --nofoo should win
    ResetArgs(am, "-foo --nofoo");
    BOOST_CHECK(!am.GetBoolArg("-foo", true));
    BOOST_CHECK(!am.GetBoolArg("-foo", false));

    // foo always wins:
    ResetArgs(am, "-nofoo -foo");
    BOOST_CHECK(am.GetBoolArg("-foo", true));
    BOOST_CHECK(am.GetBoolArg("-foo", false));
}

BOOST_AUTO_TEST_CASE(logargs) {
    const auto okaylog_bool =
        std::make_pair("-okaylog-bool", ArgsManager::ALLOW_BOOL);
    const auto okaylog_negbool =
        std::make_pair("-okaylog-negbool", ArgsManager::ALLOW_BOOL);
    const auto okaylog = std::make_pair("-okaylog", ArgsManager::ALLOW_ANY);
    const auto dontlog = std::make_pair("-dontlog", ArgsManager::ALLOW_ANY |
                                                        ArgsManager::SENSITIVE);
    ArgsManager am;
    SetupArgs(am, {okaylog_bool, okaylog_negbool, okaylog, dontlog});
    ResetArgs(
        am,
        "-okaylog-bool -nookaylog-negbool -okaylog=public -dontlog=private");

    // Everything logged to debug.log will also append to str
    std::string str;
    auto print_connection = LogInstance().PushBackCallback(
        [&str](const std::string &s) { str += s; });

    // Log the arguments
    am.LogArgs();

    LogInstance().DeleteCallback(print_connection);
    // Check that what should appear does, and what shouldn't doesn't.
    BOOST_CHECK(str.find("Command-line arg: okaylog-bool=\"\"") !=
                std::string::npos);
    BOOST_CHECK(str.find("Command-line arg: okaylog-negbool=false") !=
                std::string::npos);
    BOOST_CHECK(str.find("Command-line arg: okaylog=\"public\"") !=
                std::string::npos);
    BOOST_CHECK(str.find("dontlog=****") != std::string::npos);
    BOOST_CHECK(str.find("private") == std::string::npos);
}

BOOST_AUTO_TEST_SUITE_END()
