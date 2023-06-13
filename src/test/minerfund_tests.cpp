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

    std::array<CBlockIndex, 3> blocks;

    blocks[0].nHeight = 1;
    blocks[1].nHeight = consensusParams.wellingtonHeight;
    blocks[2].nHeight = consensusParams.wellingtonHeight + 1;

    for (size_t i = 1; i < blocks.size(); ++i) {
        blocks[i].pprev = &blocks[i - 1];
    }

    const std::unordered_set<CTxDestination, TxDestinationHasher>
        expectedMinerFund = {DecodeDestination(
            "ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07", chainparams)};
    CheckWhitelist(consensusParams, &blocks[0], expectedMinerFund);

    // Test address does not change around Wellington activation
    BOOST_CHECK(!IsWellingtonEnabled(consensusParams, blocks[1].pprev));
    CheckWhitelist(consensusParams, &blocks[1], expectedMinerFund);

    BOOST_CHECK(IsWellingtonEnabled(consensusParams, blocks[2].pprev));
    CheckWhitelist(consensusParams, &blocks[2], expectedMinerFund);
}

BOOST_AUTO_TEST_SUITE_END()
