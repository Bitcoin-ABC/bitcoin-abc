// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/avalanche.h>
#include <avalanche/proof.h>
#include <common/system.h>
#include <init.h>
#include <util/moneystr.h>
#include <util/string.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

#include <cstdint>

BOOST_FIXTURE_TEST_SUITE(init_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(avalanche_flag_tests) {
    gArgs.ForceSetArg("-ecash", "1");

    {
        // Check the feature flags when avalanche is set
        ArgsManager args;
        args.ForceSetArg("-avalanche", "1");
        InitParameterInteraction(args);

        BOOST_CHECK_EQUAL(args.GetBoolArg("-automaticunparking", true), false);
    }

    {
        // Check the feature flags when avalanche is reset
        ArgsManager args;
        args.ForceSetArg("-avalanche", "0");
        InitParameterInteraction(args);

        BOOST_CHECK_EQUAL(args.GetBoolArg("-automaticunparking", false), true);
    }

    {
        // Check the feature flags can always be overridden
        ArgsManager args;
        args.ForceSetArg("-avalanche", "1");
        args.ForceSetArg("-automaticunparking", "1");
        InitParameterInteraction(args);

        BOOST_CHECK_EQUAL(args.GetBoolArg("-automaticunparking", false), true);
    }

    gArgs.ClearForcedArg("-ecash");
}

BOOST_AUTO_TEST_SUITE_END()
