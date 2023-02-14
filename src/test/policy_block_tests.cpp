// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <policy/block/minerfund.h>

#include <blockindex.h>
#include <chainparams.h>
#include <consensus/activation.h>
#include <key_io.h>
#include <minerfund.h>
#include <util/vector.h>
#include <validation.h>

#include <test/util/blockindex.h>
#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(policy_block_tests, BasicTestingSetup)

static CBlock Block(const Amount &amount, const CScript &script) {
    CBlock block;
    CMutableTransaction coinbaseTx;

    coinbaseTx.vout.resize(1);
    coinbaseTx.vout[0].nValue = amount;
    coinbaseTx.vout[0].scriptPubKey = script;
    block.vtx.push_back(MakeTransactionRef(std::move(coinbaseTx)));

    return block;
}

static CBlock BlockWithoutMinerFund(const Amount &amount) {
    return Block(amount, CScript() << OP_TRUE);
}

static CBlock BlockWithMinerFund(const CChainParams &chainparams,
                                 const Amount &minerFundAmount) {
    const auto minerFund = DecodeDestination(
        "ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07", chainparams);
    return Block(minerFundAmount, GetScriptForDestination(minerFund));
}

BOOST_AUTO_TEST_CASE(policy_minerfund) {
    const CChainParams &chainparams = Params();
    const Consensus::Params &consensusParams = chainparams.GetConsensus();

    std::array<CBlockIndex, 12> blocks;
    for (size_t i = 1; i < blocks.size(); ++i) {
        blocks[i].pprev = &blocks[i - 1];
        blocks[i].nHeight = consensusParams.gluonHeight + i;
    }
    CBlockIndex &lastBlockIndexRef = blocks.back();

    const Amount blockReward =
        GetBlockSubsidy(lastBlockIndexRef.nHeight, consensusParams);
    const Amount minerFund = GetMinerFundAmount(blockReward);

    const auto wellingtonActivation = gArgs.GetIntArg(
        "-wellingtonactivationtime", consensusParams.wellingtonActivationTime);

    auto checkEarlyBlocks = [&]() {
        // Check genesis block (pprev is nullptr) and early blocks before
        // Wellington rules are enforced. We skip the last block index
        // because we explicitly test activation cases with it.
        BOOST_CHECK(!blocks[0].pprev);
        for (size_t i = 0; i < blocks.size() - 2; i++) {
            const CBlockIndex &blockIndex = blocks[i];
            BOOST_CHECK(
                !IsWellingtonEnabled(consensusParams, blockIndex.pprev));
            CBlock block = BlockWithoutMinerFund(blockReward);
            MinerFundPolicy check(consensusParams, blockIndex, block,
                                  blockReward);
            BOOST_CHECK(check());
        }
    };

    auto checkMinerFundPolicy = [&](CBlock block, bool expected) {
        BOOST_CHECK_EQUAL(MinerFundPolicy(consensusParams, lastBlockIndexRef,
                                          block, blockReward)(),
                          expected);
    };

    const std::vector<Amount> minerFundsTooSmall = {1 * SATOSHI, minerFund / 2,
                                                    minerFund - 1 * SATOSHI};
    const std::vector<Amount> minerFundsSufficient = {
        minerFund, minerFund + 1 * SATOSHI, blockReward};

    // Miner fund policy always passes prior to Wellington rules enforcement.
    // Note that Wellington rules are enforced on the block after activation.
    for (auto activation : {wellingtonActivation - 1, wellingtonActivation}) {
        SetMTP(blocks, activation);
        BOOST_CHECK_EQUAL(
            IsWellingtonEnabled(consensusParams, &lastBlockIndexRef),
            activation == wellingtonActivation);
        checkEarlyBlocks();
        checkMinerFundPolicy(BlockWithoutMinerFund(blockReward), true);

        // Blocks with miner fund of various amounts
        for (const Amount &amount :
             Cat(minerFundsTooSmall, minerFundsSufficient)) {
            checkMinerFundPolicy(BlockWithMinerFund(chainparams, amount), true);
        }
    }

    // Wellington rules are now enforced. Miner fund checks are now applied.
    SetMTP(blocks, wellingtonActivation + 1);
    BOOST_CHECK(IsWellingtonEnabled(consensusParams, &lastBlockIndexRef));
    checkEarlyBlocks();
    checkMinerFundPolicy(BlockWithoutMinerFund(blockReward), false);

    // Blocks with not enough miner fund
    for (const Amount &amount : minerFundsTooSmall) {
        checkMinerFundPolicy(BlockWithMinerFund(chainparams, amount), false);
    }

    // Blocks with sufficient miner fund
    for (const Amount &amount : minerFundsSufficient) {
        checkMinerFundPolicy(BlockWithMinerFund(chainparams, amount), true);
    }
}

BOOST_AUTO_TEST_SUITE_END()
