// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * See
 * https://www.boost.org/doc/libs/1_78_0/libs/test/doc/html/boost_test/adv_scenarios/single_header_customizations/multiple_translation_units.html
 */
#define BOOST_TEST_MODULE Bitcoin ABC unit tests

#include <common/system.h>

#include <test/util/setup_common.h>

#include <boost/test/included/unit_test.hpp>

#include <optional>
#include <string>

namespace utf = boost::unit_test::framework;

/**
 * Global fixture for passing custom arguments, and clearing them all after each
 * test case.
 */
struct CustomArgumentsFixture {
    CustomArgumentsFixture() {
        auto &master_test_suite = utf::master_test_suite();

        for (int i = 1; i < master_test_suite.argc; i++) {
            std::string key(master_test_suite.argv[i]);
            std::optional<std::string> val;

            if (!ParseKeyValue(key, val) || !val.has_value()) {
                break;
            }

            if (key == "-testsuitename") {
                master_test_suite.p_name.value = *val;
                continue;
            }

            fixture_extra_args.push_back(master_test_suite.argv[i]);
        }
    }

    ~CustomArgumentsFixture(){};
};

BOOST_TEST_GLOBAL_FIXTURE(CustomArgumentsFixture);
