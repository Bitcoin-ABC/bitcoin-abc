// Copyright (c) 2014-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chainparams.h>
#include <net.h>
#include <validation.h>

#include <test/test_bitcoin.h>

#include <boost/signals2/signal.hpp>
#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(main_tests, TestingSetup)

static void TestBlockSubsidyHalvings(const Consensus::Params &consensusParams) {
    int maxHalvings = 64;
    Amount nInitialSubsidy = INITIAL_REWARD;

    Amount nPreviousSubsidy = nInitialSubsidy;
    BOOST_CHECK_EQUAL(nPreviousSubsidy,  nInitialSubsidy);
    for (int nHalvings = 1; nHalvings < maxHalvings; nHalvings++) {
        int nHeight = nHalvings * consensusParams.nSubsidyHalvingInterval;
        Amount nSubsidy = GetBlockSubsidy(nHeight, consensusParams);
        BOOST_CHECK(nSubsidy <= nInitialSubsidy);
        if (nHalvings >= LAST_HALVING) {
            BOOST_CHECK_EQUAL(nSubsidy, Amount(23058428));
        } else {
            BOOST_CHECK_EQUAL(nSubsidy, 4 * nPreviousSubsidy / 5);
        }
        nPreviousSubsidy = nSubsidy;
    }
    BOOST_CHECK_EQUAL(
        GetBlockSubsidy(maxHalvings * consensusParams.nSubsidyHalvingInterval,
                        consensusParams),
        Amount(23058428));
}

static void TestBlockSubsidyHalvings(int nSubsidyHalvingInterval) {
    Consensus::Params consensusParams;
    consensusParams.nSubsidyHalvingInterval = nSubsidyHalvingInterval;
    TestBlockSubsidyHalvings(consensusParams);
}

BOOST_AUTO_TEST_CASE(block_subsidy_test) {
    const auto chainParams = CreateChainParams(CBaseChainParams::MAIN);
    TestBlockSubsidyHalvings(chainParams->GetConsensus()); // As in main
    TestBlockSubsidyHalvings(150);                         // As in regtest
    TestBlockSubsidyHalvings(1000); // Just another interval
}

BOOST_AUTO_TEST_CASE(subsidy_limit_test) {
    const auto chainParams = CreateChainParams(CBaseChainParams::MAIN);
    Amount nSum = Amount::zero();
    for (int nHeight = 0; nHeight < 40000000; nHeight += 1000) {
        Amount nSubsidy = GetBlockSubsidy(nHeight, chainParams->GetConsensus());
        BOOST_CHECK(nSubsidy <= INITIAL_REWARD);
        nSum += 1000 * nSubsidy;
    }
    BOOST_CHECK_EQUAL(nSum, int64_t(7777014086144000ULL) * SATOSHI);
}

BOOST_AUTO_TEST_SUITE_END()
