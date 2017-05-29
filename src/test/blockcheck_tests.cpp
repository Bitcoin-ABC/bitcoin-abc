// Copyright (c) 2013-2015 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "chainparams.h"
#include "config.h"
#include "consensus/consensus.h"
#include "consensus/validation.h"
#include "validation.h"

#include "test/test_bitcoin.h"

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(blockcheck_tests, BasicTestingSetup)

static void RunCheckOnBlockImpl(const CBlock &block, CValidationState &state,
                                const Consensus::Params &params,
                                bool expected) {
    block.fChecked = false;

    GlobalConfig config;
    bool fValid = CheckBlock(config, block, state, params, false, false);

    BOOST_CHECK_EQUAL(fValid, expected);
    BOOST_CHECK_EQUAL(fValid, state.IsValid());
}

static void RunCheckOnBlock(const CBlock &block,
                            const Consensus::Params &params) {
    CValidationState state;
    RunCheckOnBlockImpl(block, state, params, true);
}

static void RunCheckOnBlock(const CBlock &block,
                            const Consensus::Params &params,
                            const std::string &reason) {
    CValidationState state;
    RunCheckOnBlockImpl(block, state, params, false);

    BOOST_CHECK_EQUAL(state.GetRejectCode(), REJECT_INVALID);
    BOOST_CHECK_EQUAL(state.GetRejectReason(), reason);
}

BOOST_AUTO_TEST_CASE(blockfail) {
    SelectParams(CBaseChainParams::MAIN);
    const Consensus::Params &params = Params().GetConsensus();

    CBlock block;
    RunCheckOnBlock(block, params, "bad-cb-missing");

    CMutableTransaction tx;

    // Coinbase only.
    tx.vin.resize(1);
    tx.vin[0].scriptSig.resize(10);
    tx.vout.resize(1);
    tx.vout[0].nValue = 42;
    auto coinbaseTx = CTransaction(tx);

    block.vtx.resize(1);
    block.vtx[0] = MakeTransactionRef(tx);
    RunCheckOnBlock(block, params);

    // No coinbase
    tx.vin[0].prevout.hash = GetRandHash();
    tx.vin[0].prevout.n = 0;
    block.vtx[0] = MakeTransactionRef(tx);

    RunCheckOnBlock(block, params, "bad-cb-missing");

    // Invalid coinbase
    tx = CMutableTransaction(coinbaseTx);
    tx.vin[0].scriptSig.resize(0);
    block.vtx[0] = MakeTransactionRef(tx);

    RunCheckOnBlock(block, params, "bad-cb-length");

    // Oversize block.
    tx = CMutableTransaction(coinbaseTx);
    block.vtx[0] = MakeTransactionRef(tx);
    tx.vin[0].prevout.n = 0;
    auto txSize = ::GetSerializeSize(tx, SER_NETWORK, PROTOCOL_VERSION);
    auto maxTxCount = ((DEFAULT_MAX_BLOCK_SIZE - 1) / txSize) - 1;

    for (size_t i = 1; i < maxTxCount; i++) {
        tx.vin[0].prevout.hash = GetRandHash();
        block.vtx.push_back(MakeTransactionRef(tx));
        RunCheckOnBlock(block, params);
    }

    tx.vin[0].prevout.hash = GetRandHash();
    block.vtx.push_back(MakeTransactionRef(tx));
    RunCheckOnBlock(block, params, "bad-blk-length");
}

BOOST_AUTO_TEST_SUITE_END()
