// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#define BOOST_TEST_MODULE Bitcoin ABC unit tests

#include <util/system.h>

#include <boost/test/unit_test.hpp>

namespace utf = boost::unit_test::framework;

/**
 * Global fixture for passing custom arguments, and clearing them all after each
 * test case.
 */
struct CustomArgumentsFixture {
    std::string error;

    CustomArgumentsFixture() {
        const std::string testsuitename = "-testsuitename";

        const std::set<std::string> testArgs = {
            testsuitename,
            "-axionactivationtime",
        };

        for (const auto &arg : testArgs) {
            gArgs.AddArg(arg, "", ArgsManager::ALLOW_ANY,
                         OptionsCategory::HIDDEN);
        }

        auto &master_test_suite = utf::master_test_suite();
        if (!gArgs.ParseParameters(master_test_suite.argc,
                                   master_test_suite.argv, error)) {
            throw utf::setup_error(error);
        }

        master_test_suite.p_name.value =
            gArgs.GetArg(testsuitename, master_test_suite.p_name.value);
    }

    ~CustomArgumentsFixture(){};
};

BOOST_TEST_GLOBAL_FIXTURE(CustomArgumentsFixture);
