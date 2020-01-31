// Copyright (c) 2012-2015 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <util/system.h>

#include <test/test_bitcoin.h>

#include <boost/algorithm/string.hpp>
#include <boost/test/unit_test.hpp>

#include <string>
#include <vector>

BOOST_FIXTURE_TEST_SUITE(getarg_tests, BasicTestingSetup)

static void ResetArgs(ArgsManager &am, const std::string &strArg) {
    std::vector<std::string> vecArg;
    if (strArg.size()) {
        boost::split(vecArg, strArg, boost::is_space(),
                     boost::token_compress_on);
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

static void SetupArgs(ArgsManager &am, const std::vector<std::string> &args) {
    for (const std::string &arg : args) {
        am.AddArg(arg, "", false, OptionsCategory::OPTIONS);
    }
}

BOOST_AUTO_TEST_CASE(boolarg) {
    ArgsManager am;
    SetupArgs(am, {"-foo"});
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
    SetupArgs(am, {"-foo", "-bar"});
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
    SetupArgs(am, {"-foo", "-bar"});
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
    SetupArgs(am, {"-foo", "-bar"});
    ResetArgs(am, "--foo");
    BOOST_CHECK_EQUAL(am.GetBoolArg("-foo", false), true);

    ResetArgs(am, "--foo=verbose --bar=1");
    BOOST_CHECK_EQUAL(am.GetArg("-foo", ""), "verbose");
    BOOST_CHECK_EQUAL(am.GetArg("-bar", 0), 1);
}

BOOST_AUTO_TEST_CASE(boolargno) {
    ArgsManager am;
    SetupArgs(am, {"-foo", "-bar"});
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

BOOST_AUTO_TEST_SUITE_END()
