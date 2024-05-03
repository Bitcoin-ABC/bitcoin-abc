// Copyright (c) 2011-2019 The Bitcoin Core developers
// Copyright (c) 2017-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <validation.h>

#include <chainparams.h>
#include <clientversion.h>
#include <config.h>
#include <consensus/amount.h>
#include <consensus/consensus.h>
#include <net.h>
#include <primitives/transaction.h>
#include <streams.h>
#include <uint256.h>
#include <util/system.h>
#include <validation.h>

#include <test/util/setup_common.h>

#include <boost/signals2/signal.hpp>
#include <boost/test/unit_test.hpp>

#include <cstdint>
#include <cstdio>
#include <vector>

BOOST_FIXTURE_TEST_SUITE(validation_tests, TestingSetup)

static void TestBlockSubsidyHalvings(const Consensus::Params &consensusParams) {
    int maxHalvings = 64;
    Amount nInitialSubsidy = 50 * COIN;

    // for height == 0
    Amount nPreviousSubsidy = 2 * nInitialSubsidy;
    BOOST_CHECK_EQUAL(nPreviousSubsidy, 2 * nInitialSubsidy);
    for (int nHalvings = 0; nHalvings < maxHalvings; nHalvings++) {
        int nHeight = nHalvings * consensusParams.nSubsidyHalvingInterval;
        Amount nSubsidy = GetBlockSubsidy(nHeight, consensusParams);
        BOOST_CHECK(nSubsidy <= nInitialSubsidy);
        BOOST_CHECK_EQUAL(nSubsidy, nPreviousSubsidy / 2);
        nPreviousSubsidy = nSubsidy;
    }
    BOOST_CHECK_EQUAL(
        GetBlockSubsidy(maxHalvings * consensusParams.nSubsidyHalvingInterval,
                        consensusParams),
        Amount::zero());
}

static void TestBlockSubsidyHalvings(int nSubsidyHalvingInterval) {
    Consensus::Params consensusParams;
    consensusParams.nSubsidyHalvingInterval = nSubsidyHalvingInterval;
    TestBlockSubsidyHalvings(consensusParams);
}

BOOST_AUTO_TEST_CASE(block_subsidy_test) {
    const auto chainParams =
        CreateChainParams(*m_node.args, CBaseChainParams::MAIN);
    // As in main
    TestBlockSubsidyHalvings(chainParams->GetConsensus());
    // As in regtest
    TestBlockSubsidyHalvings(150);
    // Just another interval
    TestBlockSubsidyHalvings(1000);
}

BOOST_AUTO_TEST_CASE(subsidy_limit_test) {
    const auto chainParams =
        CreateChainParams(*m_node.args, CBaseChainParams::MAIN);
    Amount nSum = Amount::zero();
    for (int nHeight = 0; nHeight < 14000000; nHeight += 1000) {
        Amount nSubsidy = GetBlockSubsidy(nHeight, chainParams->GetConsensus());
        BOOST_CHECK(nSubsidy <= 50 * COIN);
        nSum += 1000 * nSubsidy;
        BOOST_CHECK(MoneyRange(nSum));
    }
    BOOST_CHECK_EQUAL(nSum, int64_t(2099999997690000LL) * SATOSHI);
}

static CBlock makeLargeDummyBlock(const size_t num_tx) {
    CBlock block;
    block.vtx.reserve(num_tx);

    CTransaction tx;
    for (size_t i = 0; i < num_tx; i++) {
        block.vtx.push_back(MakeTransactionRef(tx));
    }
    return block;
}

/**
 * Test that LoadExternalBlockFile works with the buffer size set below the
 * size of a large block. Currently, LoadExternalBlockFile has the buffer size
 * for CBufferedFile set to 2 * MAX_TX_SIZE. Test with a value of
 * 10 * MAX_TX_SIZE.
 */
BOOST_AUTO_TEST_CASE(validation_load_external_block_file) {
    fs::path tmpfile_name = gArgs.GetDataDirNet() / "block.dat";

    FILE *fp = fopen(fs::PathToString(tmpfile_name).c_str(), "wb+");

    BOOST_CHECK(fp != nullptr);

    const CChainParams &chainparams = m_node.chainman->GetParams();

    // serialization format is:
    // message start magic, size of block, block

    size_t nwritten = fwrite(std::begin(chainparams.DiskMagic()),
                             CMessageHeader::MESSAGE_START_SIZE, 1, fp);

    BOOST_CHECK_EQUAL(nwritten, 1UL);

    CTransaction empty_tx;
    size_t empty_tx_size = GetSerializeSize(empty_tx, CLIENT_VERSION);

    size_t num_tx = (10 * MAX_TX_SIZE) / empty_tx_size;

    CBlock block = makeLargeDummyBlock(num_tx);

    BOOST_CHECK(GetSerializeSize(block, CLIENT_VERSION) > 2 * MAX_TX_SIZE);

    unsigned int size = GetSerializeSize(block, CLIENT_VERSION);
    {
        CAutoFile outs(fp, SER_DISK, CLIENT_VERSION);
        outs << size;
        outs << block;
        outs.release();
    }

    fseek(fp, 0, SEEK_SET);
    BOOST_CHECK_NO_THROW(
        { m_node.chainman->ActiveChainstate().LoadExternalBlockFile(fp, 0); });
}

//! Test retrieval of valid assumeutxo values.
BOOST_AUTO_TEST_CASE(test_assumeutxo) {
    const auto params =
        CreateChainParams(*m_node.args, CBaseChainParams::REGTEST);

    // These heights don't have assumeutxo configurations associated, per the
    // contents of chainparams.cpp.
    std::vector<int> bad_heights{0, 100, 111, 115, 209, 211};

    for (auto empty : bad_heights) {
        const auto out = ExpectedAssumeutxo(empty, *params);
        BOOST_CHECK(!out);
    }

    const auto out110 = *ExpectedAssumeutxo(110, *params);
    BOOST_CHECK_EQUAL(
        out110.hash_serialized.ToString(),
        "d754ca97ef24c5132f8d2147c19310b7a6bd136766430304735a73372fe36213");
    BOOST_CHECK_EQUAL(out110.nChainTx, (unsigned int)110);

    const auto out210 = *ExpectedAssumeutxo(210, *params);
    BOOST_CHECK_EQUAL(
        out210.hash_serialized.ToString(),
        "73b4bc8dd69649c6e9ede39b156713109bf044d2466661a3fe8a8b91ba601849");
    BOOST_CHECK_EQUAL(out210.nChainTx, (unsigned int)210);
}

BOOST_AUTO_TEST_SUITE_END()
