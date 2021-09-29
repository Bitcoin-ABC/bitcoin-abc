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

namespace getarg_tests {
class LocalTestingSetup : BasicTestingSetup {
protected:
    void
    SetupArgs(const std::vector<std::pair<std::string, unsigned int>> &args);
    void ResetArgs(const std::string &strArg);
    ArgsManager m_args;
};
} // namespace getarg_tests

BOOST_FIXTURE_TEST_SUITE(getarg_tests, LocalTestingSetup)

void LocalTestingSetup::ResetArgs(const std::string &strArg) {
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
    BOOST_CHECK(m_args.ParseParameters(vecChar.size(), vecChar.data(), error));
}

void LocalTestingSetup::SetupArgs(
    const std::vector<std::pair<std::string, unsigned int>> &args) {
    m_args.ClearArgs();
    for (const auto &arg : args) {
        m_args.AddArg(arg.first, "", arg.second, OptionsCategory::OPTIONS);
    }
}

BOOST_AUTO_TEST_CASE(boolarg) {
    const auto foo = std::make_pair("-foo", ArgsManager::ALLOW_ANY);
    SetupArgs({foo});
    ResetArgs("-foo");
    BOOST_CHECK(m_args.GetBoolArg("-foo", false));
    BOOST_CHECK(m_args.GetBoolArg("-foo", true));

    BOOST_CHECK(!m_args.GetBoolArg("-fo", false));
    BOOST_CHECK(m_args.GetBoolArg("-fo", true));

    BOOST_CHECK(!m_args.GetBoolArg("-fooo", false));
    BOOST_CHECK(m_args.GetBoolArg("-fooo", true));

    ResetArgs("-foo=0");
    BOOST_CHECK(!m_args.GetBoolArg("-foo", false));
    BOOST_CHECK(!m_args.GetBoolArg("-foo", true));

    ResetArgs("-foo=1");
    BOOST_CHECK(m_args.GetBoolArg("-foo", false));
    BOOST_CHECK(m_args.GetBoolArg("-foo", true));

    // New 0.6 feature: auto-map -nosomething to !-something:
    ResetArgs("-nofoo");
    BOOST_CHECK(!m_args.GetBoolArg("-foo", false));
    BOOST_CHECK(!m_args.GetBoolArg("-foo", true));

    ResetArgs("-nofoo=1");
    BOOST_CHECK(!m_args.GetBoolArg("-foo", false));
    BOOST_CHECK(!m_args.GetBoolArg("-foo", true));

    // -nofoo should win
    ResetArgs("-foo -nofoo");
    BOOST_CHECK(!m_args.GetBoolArg("-foo", false));
    BOOST_CHECK(!m_args.GetBoolArg("-foo", true));

    // -nofoo should win
    ResetArgs("-foo=1 -nofoo=1");
    BOOST_CHECK(!m_args.GetBoolArg("-foo", false));
    BOOST_CHECK(!m_args.GetBoolArg("-foo", true));

    // -nofoo=0 should win
    ResetArgs("-foo=0 -nofoo=0");
    BOOST_CHECK(m_args.GetBoolArg("-foo", false));
    BOOST_CHECK(m_args.GetBoolArg("-foo", true));

    // New 0.6 feature: treat -- same as -:
    ResetArgs("--foo=1");
    BOOST_CHECK(m_args.GetBoolArg("-foo", false));
    BOOST_CHECK(m_args.GetBoolArg("-foo", true));

    ResetArgs("--nofoo=1");
    BOOST_CHECK(!m_args.GetBoolArg("-foo", false));
    BOOST_CHECK(!m_args.GetBoolArg("-foo", true));
}

BOOST_AUTO_TEST_CASE(stringarg) {
    const auto foo = std::make_pair("-foo", ArgsManager::ALLOW_ANY);
    const auto bar = std::make_pair("-bar", ArgsManager::ALLOW_ANY);
    SetupArgs({foo, bar});
    ResetArgs("");
    BOOST_CHECK_EQUAL(m_args.GetArg("-foo", ""), "");
    BOOST_CHECK_EQUAL(m_args.GetArg("-foo", "eleven"), "eleven");

    ResetArgs("-foo -bar");
    BOOST_CHECK_EQUAL(m_args.GetArg("-foo", ""), "");
    BOOST_CHECK_EQUAL(m_args.GetArg("-foo", "eleven"), "");

    ResetArgs("-foo=");
    BOOST_CHECK_EQUAL(m_args.GetArg("-foo", ""), "");
    BOOST_CHECK_EQUAL(m_args.GetArg("-foo", "eleven"), "");

    ResetArgs("-foo=11");
    BOOST_CHECK_EQUAL(m_args.GetArg("-foo", ""), "11");
    BOOST_CHECK_EQUAL(m_args.GetArg("-foo", "eleven"), "11");

    ResetArgs("-foo=eleven");
    BOOST_CHECK_EQUAL(m_args.GetArg("-foo", ""), "eleven");
    BOOST_CHECK_EQUAL(m_args.GetArg("-foo", "eleven"), "eleven");
}

BOOST_AUTO_TEST_CASE(intarg) {
    const auto foo = std::make_pair("-foo", ArgsManager::ALLOW_ANY);
    const auto bar = std::make_pair("-bar", ArgsManager::ALLOW_ANY);
    SetupArgs({foo, bar});
    ResetArgs("");
    BOOST_CHECK_EQUAL(m_args.GetArg("-foo", 11), 11);
    BOOST_CHECK_EQUAL(m_args.GetArg("-foo", 0), 0);

    ResetArgs("-foo -bar");
    BOOST_CHECK_EQUAL(m_args.GetArg("-foo", 11), 0);
    BOOST_CHECK_EQUAL(m_args.GetArg("-bar", 11), 0);

    ResetArgs("-foo=11 -bar=12");
    BOOST_CHECK_EQUAL(m_args.GetArg("-foo", 0), 11);
    BOOST_CHECK_EQUAL(m_args.GetArg("-bar", 11), 12);

    ResetArgs("-foo=NaN -bar=NotANumber");
    BOOST_CHECK_EQUAL(m_args.GetArg("-foo", 1), 0);
    BOOST_CHECK_EQUAL(m_args.GetArg("-bar", 11), 0);
}

BOOST_AUTO_TEST_CASE(doubledash) {
    const auto foo = std::make_pair("-foo", ArgsManager::ALLOW_ANY);
    const auto bar = std::make_pair("-bar", ArgsManager::ALLOW_ANY);
    SetupArgs({foo, bar});
    ResetArgs("--foo");
    BOOST_CHECK_EQUAL(m_args.GetBoolArg("-foo", false), true);

    ResetArgs("--foo=verbose --bar=1");
    BOOST_CHECK_EQUAL(m_args.GetArg("-foo", ""), "verbose");
    BOOST_CHECK_EQUAL(m_args.GetArg("-bar", 0), 1);
}

BOOST_AUTO_TEST_CASE(boolargno) {
    const auto foo = std::make_pair("-foo", ArgsManager::ALLOW_ANY);
    const auto bar = std::make_pair("-bar", ArgsManager::ALLOW_ANY);
    SetupArgs({foo, bar});
    ResetArgs("-nofoo");
    BOOST_CHECK(!m_args.GetBoolArg("-foo", true));
    BOOST_CHECK(!m_args.GetBoolArg("-foo", false));

    ResetArgs("-nofoo=1");
    BOOST_CHECK(!m_args.GetBoolArg("-foo", true));
    BOOST_CHECK(!m_args.GetBoolArg("-foo", false));

    ResetArgs("-nofoo=0");
    BOOST_CHECK(m_args.GetBoolArg("-foo", true));
    BOOST_CHECK(m_args.GetBoolArg("-foo", false));

    // --nofoo should win
    ResetArgs("-foo --nofoo");
    BOOST_CHECK(!m_args.GetBoolArg("-foo", true));
    BOOST_CHECK(!m_args.GetBoolArg("-foo", false));

    // foo always wins:
    ResetArgs("-nofoo -foo");
    BOOST_CHECK(m_args.GetBoolArg("-foo", true));
    BOOST_CHECK(m_args.GetBoolArg("-foo", false));
}

BOOST_AUTO_TEST_CASE(logargs) {
    const auto okaylog_bool =
        std::make_pair("-okaylog-bool", ArgsManager::ALLOW_BOOL);
    const auto okaylog_negbool =
        std::make_pair("-okaylog-negbool", ArgsManager::ALLOW_BOOL);
    const auto okaylog = std::make_pair("-okaylog", ArgsManager::ALLOW_ANY);
    const auto dontlog = std::make_pair("-dontlog", ArgsManager::ALLOW_ANY |
                                                        ArgsManager::SENSITIVE);
    SetupArgs({okaylog_bool, okaylog_negbool, okaylog, dontlog});
    ResetArgs(
        "-okaylog-bool -nookaylog-negbool -okaylog=public -dontlog=private");

    // Everything logged to debug.log will also append to str
    std::string str;
    auto print_connection = LogInstance().PushBackCallback(
        [&str](const std::string &s) { str += s; });

    // Log the arguments
    m_args.LogArgs();

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
