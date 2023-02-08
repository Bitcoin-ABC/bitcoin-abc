// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <minerfund.h>

#include <blockindex.h>
#include <chainparams.h>
#include <key_io.h> // For DecodeDestination

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(minerfund_tests, BasicTestingSetup)

static void
CheckWhitelist(const Consensus::Params &consensusParams,
               const CBlockIndex *pindexPrev,
               const std::unordered_set<CTxDestination, TxDestinationHasher>
                   expectedWhitelist) {
    auto whitelist = GetMinerFundWhitelist(consensusParams, pindexPrev);
    BOOST_CHECK_EQUAL(whitelist.size(), expectedWhitelist.size());
    for (const auto &expectedDest : expectedWhitelist) {
        BOOST_CHECK_EQUAL(whitelist.count(expectedDest), 1);
    }
}

BOOST_AUTO_TEST_CASE(minerfund_whitelist) {
    const CChainParams &chainparams = Params();
    const Consensus::Params &consensusParams = chainparams.GetConsensus();

    CBlockIndex block;

    // Consensus whitelist has not activated yet
    block.nHeight = consensusParams.axionHeight - 1;
    CheckWhitelist(consensusParams, &block, {});

    // Axion whitelist is active
    const std::unordered_set<CTxDestination, TxDestinationHasher>
        expectedAxion = {DecodeDestination(
            "ecash:pqnqv9lt7e5vjyp0w88zf2af0l92l8rxdg2jj94l5j", chainparams)};
    block.nHeight = consensusParams.axionHeight;
    CheckWhitelist(consensusParams, &block, expectedAxion);

    // Does not change up to Gluon activation
    block.nHeight = consensusParams.gluonHeight - 1;
    CheckWhitelist(consensusParams, &block, expectedAxion);

    // Miner fund address changed with Gluon
    const std::unordered_set<CTxDestination, TxDestinationHasher>
        expectedMinerFund = {DecodeDestination(
            "ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07", chainparams)};
    block.nHeight = consensusParams.gluonHeight;
    CheckWhitelist(consensusParams, &block, expectedMinerFund);
}

BOOST_AUTO_TEST_SUITE_END()
