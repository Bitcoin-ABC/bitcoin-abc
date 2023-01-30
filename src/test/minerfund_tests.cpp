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

BOOST_AUTO_TEST_CASE(minerfund_whitelist) {
    const CChainParams &chainparams = Params();
    const Consensus::Params &consensusParams = chainparams.GetConsensus();

    CBlockIndex block;

    // Consensus whitelist has not activated yet
    const std::vector<CTxDestination> emptyWhitelist;
    block.nHeight = consensusParams.axionHeight - 1;
    BOOST_CHECK(GetMinerFundWhitelist(consensusParams, &block) ==
                emptyWhitelist);

    // Axion whitelist is active
    const std::vector<CTxDestination> expectedAxion = {DecodeDestination(
        "ecash:pqnqv9lt7e5vjyp0w88zf2af0l92l8rxdg2jj94l5j", chainparams)};
    block.nHeight = consensusParams.axionHeight;
    BOOST_CHECK(GetMinerFundWhitelist(consensusParams, &block) ==
                expectedAxion);

    // Does not change up to Gluon activation
    block.nHeight = consensusParams.gluonHeight - 1;
    BOOST_CHECK(GetMinerFundWhitelist(consensusParams, &block) ==
                expectedAxion);

    // Miner fund address changed with Gluon
    const std::vector<CTxDestination> expectedMinerFund = {DecodeDestination(
        "ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07", chainparams)};
    block.nHeight = consensusParams.gluonHeight;
    BOOST_CHECK(GetMinerFundWhitelist(consensusParams, &block) ==
                expectedMinerFund);
}

BOOST_AUTO_TEST_SUITE_END()
