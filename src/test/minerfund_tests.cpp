// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <minerfund.h>

#include <blockindex.h>
#include <chainparams.h>
#include <consensus/activation.h>
#include <key_io.h> // For DecodeDestination

#include <test/util/blockindex.h>
#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(minerfund_tests, BasicTestingSetup)

static void
CheckWhitelist(const Consensus::Params &consensusParams,
               const CBlockIndex *pindexPrev,
               const std::unordered_set<CTxDestination, TxDestinationHasher>
                   &expectedWhitelist) {
    auto whitelist = GetMinerFundWhitelist(consensusParams);
    BOOST_CHECK_EQUAL(whitelist.size(), expectedWhitelist.size());
    for (const auto &expectedDest : expectedWhitelist) {
        BOOST_CHECK_EQUAL(whitelist.count(expectedDest), 1);
    }
}

BOOST_AUTO_TEST_CASE(minerfund_whitelist) {
    const CChainParams &chainparams = Params();
    const Consensus::Params &consensusParams = chainparams.GetConsensus();

    std::array<CBlockIndex, 12> blocks;
    for (size_t i = 1; i < blocks.size(); ++i) {
        blocks[i].pprev = &blocks[i - 1];
    }
    CBlockIndex &block = blocks.back();

    const auto activation = gArgs.GetIntArg(
        "-wellingtonactivationtime", consensusParams.wellingtonActivationTime);
    SetMTP(blocks, activation - 100000);

    const std::unordered_set<CTxDestination, TxDestinationHasher>
        expectedMinerFund = {DecodeDestination(
            "ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07", chainparams)};
    CheckWhitelist(consensusParams, &block, expectedMinerFund);

    // Test address does not change around Wellington activation
    SetMTP(blocks, activation - 1);
    BOOST_CHECK(!IsWellingtonEnabled(consensusParams, &blocks.back()));
    CheckWhitelist(consensusParams, &block, expectedMinerFund);

    SetMTP(blocks, activation);
    BOOST_CHECK(IsWellingtonEnabled(consensusParams, &blocks.back()));
    CheckWhitelist(consensusParams, &block, expectedMinerFund);
}

BOOST_AUTO_TEST_SUITE_END()
