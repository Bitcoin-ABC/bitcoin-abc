// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/avalanche.h>
#include <avalanche/processor.h>
#include <chainparams.h>
#include <consensus/activation.h>
#include <net_processing.h>
#include <policy/block/stakingrewards.h>

#include <test/util/blockindex.h>
#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

struct StakingRewardsActivationTestingSetup : public TestingSetup {
    void checkStakingRewardsActivation(const std::string &net,
                                       const bool expectActivation) {
        SelectParams(net);
        const Consensus::Params &params = Params().GetConsensus();

        gArgs.ForceSetArg("-avalanche", "1");

        BOOST_CHECK(isAvalancheEnabled(gArgs));

        // Before Cowperthwaite activation
        const auto activationHeight = params.cowperthwaiteHeight;

        CBlockIndex block;
        block.nHeight = activationHeight - 1;
        BOOST_CHECK(!IsStakingRewardsActivated(params, &block));

        block.nHeight = activationHeight;
        BOOST_CHECK_EQUAL(IsStakingRewardsActivated(params, &block),
                          expectActivation);

        block.nHeight = activationHeight + 1;
        BOOST_CHECK_EQUAL(IsStakingRewardsActivated(params, &block),
                          expectActivation);

        // If avalanche is disabled, staking rewards are disabled
        gArgs.ForceSetArg("-avalanche", "0");
        BOOST_CHECK(!isAvalancheEnabled(gArgs));
        BOOST_CHECK(!IsStakingRewardsActivated(params, &block));

        gArgs.ForceSetArg("-avalanche", "1");
        BOOST_CHECK(isAvalancheEnabled(gArgs));
        BOOST_CHECK_EQUAL(IsStakingRewardsActivated(params, &block),
                          expectActivation);

        gArgs.ClearForcedArg("-avalanche");
    }
};

BOOST_FIXTURE_TEST_SUITE(stakingrewards_tests,
                         StakingRewardsActivationTestingSetup)

BOOST_AUTO_TEST_CASE(isstakingrewardsactivated) {
    checkStakingRewardsActivation("regtest", false);
    checkStakingRewardsActivation("test", false);
    checkStakingRewardsActivation("main", true);
}

BOOST_AUTO_TEST_SUITE_END()
