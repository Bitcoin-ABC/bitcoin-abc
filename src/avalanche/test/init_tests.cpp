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
    const Amount tenBillion =
        int64_t(10'000'000'000) * Currency::get().baseunit;

    auto getAvaMinQuorumStakeAmount = [](const ArgsManager &args,
                                         const Amount defaultAmount) {
        Amount avaminquorumstake;
        BOOST_CHECK(ParseMoney(
            args.GetArg("-avaminquorumstake", FormatMoney(defaultAmount)),
            avaminquorumstake));
        return avaminquorumstake;
    };

    {
        // Check the feature flags when avalanche is set
        ArgsManager args;
        args.ForceSetArg("-avalanche", "1");
        InitParameterInteraction(args);

        BOOST_CHECK_EQUAL(args.GetBoolArg("-enableavalanche", false), true);
        BOOST_CHECK_EQUAL(args.GetBoolArg("-legacyavaproof", true), false);
        BOOST_CHECK_EQUAL(
            args.GetBoolArg("-enableavalanchepeerdiscovery", false), true);
        BOOST_CHECK_EQUAL(
            args.GetBoolArg("-enableavalancheproofreplacement", false), true);
        BOOST_CHECK_EQUAL(args.GetBoolArg("-automaticunparking", true), false);
        BOOST_CHECK_EQUAL(getAvaMinQuorumStakeAmount(args, 42 * COIN),
                          tenBillion);
        BOOST_CHECK_EQUAL(
            args.GetArg("-avaminquorumconnectedstakeratio", "0.42"), "0.8");
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
            args.GetBoolArg("-enableavalanchepeerdiscovery", true), false);
        BOOST_CHECK_EQUAL(
            args.GetBoolArg("-enableavalancheproofreplacement", true), false);
        BOOST_CHECK_EQUAL(args.GetBoolArg("-automaticunparking", false), true);
        BOOST_CHECK_EQUAL(getAvaMinQuorumStakeAmount(args, tenBillion),
                          AVALANCHE_DEFAULT_MIN_QUORUM_STAKE);
        BOOST_CHECK_EQUAL(
            args.GetArg("-avaminquorumconnectedstakeratio", "0.8"),
            ToString(AVALANCHE_DEFAULT_MIN_QUORUM_CONNECTED_STAKE_RATIO));
    }

    {
        // Check the feature flags can always be overridden
        ArgsManager args;
        args.ForceSetArg("-avalanche", "1");
        args.ForceSetArg("-legacyavaproof", "1");
        args.ForceSetArg("-enableavalancheproofreplacement", "0");
        args.ForceSetArg("-automaticunparking", "1");
        args.ForceSetArg("-avaminquorumstake", FormatMoney(123 * COIN));
        InitParameterInteraction(args);

        BOOST_CHECK_EQUAL(args.GetBoolArg("-enableavalanche", false), true);
        BOOST_CHECK_EQUAL(args.GetBoolArg("-legacyavaproof", false), true);
        BOOST_CHECK_EQUAL(
            args.GetBoolArg("-enableavalanchepeerdiscovery", false), true);
        BOOST_CHECK_EQUAL(
            args.GetBoolArg("-enableavalancheproofreplacement", true), false);
        BOOST_CHECK_EQUAL(args.GetBoolArg("-automaticunparking", false), true);
        BOOST_CHECK_EQUAL(getAvaMinQuorumStakeAmount(args, tenBillion),
                          123 * COIN);
        BOOST_CHECK_EQUAL(
            args.GetArg("-avaminquorumconnectedstakeratio", "0.42"), "0.8");
    }

    gArgs.ClearForcedArg("-ecash");
}

BOOST_AUTO_TEST_SUITE_END()
