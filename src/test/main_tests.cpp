// Copyright (c) 2014-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "chainparams.h"
#include "net.h"
#include "validation.h"

#include "test/test_bitcoin.h"

#include <boost/signals2/signal.hpp>
#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(main_tests, TestingSetup)

static void TestBlockRewards(const Consensus::Params &consensusParams) {
    const int maxYears = 4;
    const int nMaxReward = consensusParams.nMaxMiningRewardInCoins;
    const int nBlocksPerYear = consensusParams.nBlocksPerYear;
    Amount nInitialSubsidy = (nMaxReward/2) * COIN;

    for (int n = 0; n < maxYears; n++) {
      int nHeight = n*nBlocksPerYear;
      Amount nSubsidy = GetBlockSubsidy(nHeight, consensusParams);
      if (n < 2)
        BOOST_CHECK(nSubsidy >= nInitialSubsidy);
      else
        BOOST_CHECK(nSubsidy <= nMaxReward*COIN);
    }
    BOOST_CHECK_EQUAL(
        GetBlockSubsidy(nBlocksPerYear, consensusParams),
        nMaxReward * COIN);
}

BOOST_AUTO_TEST_CASE(block_subsidy_test) {
    const auto chainParams = CreateChainParams(CBaseChainParams::MAIN);
    TestBlockRewards(chainParams->GetConsensus()); // As in main
}

BOOST_AUTO_TEST_CASE(subsidy_limit_test) {
    const auto chainParams = CreateChainParams(CBaseChainParams::MAIN);
    const int nMaxReward = chainParams->GetConsensus().nMaxMiningRewardInCoins;
    Amount nSum = Amount::zero();
    for (int nHeight = 0; nHeight < 14000000; nHeight += 1000) {
        Amount nSubsidy = GetBlockSubsidy(nHeight, chainParams->GetConsensus());
        BOOST_CHECK(nSubsidy <= nMaxReward * COIN);
        nSum += nSubsidy;
        BOOST_CHECK(MoneyRange(nSum));
    }
    BOOST_CHECK_EQUAL(nSum, int64_t(429417300000000LL) * SATOSHI);
}

BOOST_AUTO_TEST_SUITE_END()
