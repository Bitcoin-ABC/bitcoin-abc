// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/avalanche.h>
#include <avalanche/proof.h>
#include <init.h>
#include <util/moneystr.h>
#include <util/string.h>
#include <util/system.h>

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

        BOOST_CHECK_EQUAL(args.GetBoolArg("-enableavalanche", false), true);
        BOOST_CHECK_EQUAL(args.GetBoolArg("-legacyavaproof", true), false);
        BOOST_CHECK_EQUAL(
            args.GetBoolArg("-enableavalancheproofreplacement", false), true);
        BOOST_CHECK_EQUAL(args.GetBoolArg("-automaticunparking", true), false);
        BOOST_CHECK_EQUAL(
            args.GetArg("-avaminquorumconnectedstakeratio", "0.42"), "0.8");
        BOOST_CHECK_EQUAL(args.GetArg("-avaminavaproofsnodecount", 42), 8);
    }

    {
        // Check the feature flags when avalanche is reset
        ArgsManager args;
        args.ForceSetArg("-avalanche", "0");
        InitParameterInteraction(args);

        BOOST_CHECK_EQUAL(args.GetBoolArg("-enableavalanche", true), false);
        BOOST_CHECK_EQUAL(args.GetBoolArg("-legacyavaproof", false),
                          AVALANCHE_DEFAULT_LEGACY_PROOF);
        BOOST_CHECK_EQUAL(
            args.GetBoolArg("-enableavalancheproofreplacement", true), false);
        BOOST_CHECK_EQUAL(args.GetBoolArg("-automaticunparking", false), true);
        BOOST_CHECK_EQUAL(
            args.GetArg("-avaminquorumconnectedstakeratio", "0.8"),
            ToString(AVALANCHE_DEFAULT_MIN_QUORUM_CONNECTED_STAKE_RATIO));
        BOOST_CHECK_EQUAL(args.GetArg("-avaminavaproofsnodecount", 42),
                          AVALANCHE_DEFAULT_MIN_AVAPROOFS_NODE_COUNT);
    }

    {
        // Check the feature flags can always be overridden
        ArgsManager args;
        args.ForceSetArg("-avalanche", "1");
        args.ForceSetArg("-legacyavaproof", "1");
        args.ForceSetArg("-enableavalancheproofreplacement", "0");
        args.ForceSetArg("-automaticunparking", "1");
        args.ForceSetArg("-avaminavaproofsnodecount", "42");
        InitParameterInteraction(args);

        BOOST_CHECK_EQUAL(args.GetBoolArg("-enableavalanche", false), true);
        BOOST_CHECK_EQUAL(args.GetBoolArg("-legacyavaproof", false), true);
        BOOST_CHECK_EQUAL(
            args.GetBoolArg("-enableavalancheproofreplacement", true), false);
        BOOST_CHECK_EQUAL(args.GetBoolArg("-automaticunparking", false), true);
        BOOST_CHECK_EQUAL(
            args.GetArg("-avaminquorumconnectedstakeratio", "0.42"), "0.8");
        BOOST_CHECK_EQUAL(args.GetArg("-avaminavaproofsnodecount", 0), 42);
    }

    gArgs.ClearForcedArg("-ecash");
}

BOOST_AUTO_TEST_SUITE_END()
