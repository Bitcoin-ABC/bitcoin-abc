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

    std::array<BlockHash, 12> blockhashes;
    std::array<CBlockIndex, 12> blocks;
    for (size_t i = 1; i < blocks.size(); ++i) {
        blockhashes[i] = BlockHash(uint256(i));
        blocks[i].phashBlock = &blockhashes[i];
        blocks[i].pprev = &blocks[i - 1];
        blocks[i].nHeight = consensusParams.wellingtonHeight - 5 + i;
    }
    CBlockIndex &firstBlockIndexRef = blocks[1];
    CBlockIndex &lastBlockIndexRef = blocks.back();

    const Amount blockReward =
        GetBlockSubsidy(lastBlockIndexRef.nHeight, consensusParams);

    auto checkMinerFundPolicy = [&](CBlock block, const CBlockIndex &blockIndex,
                                    bool expected) {
        BlockPolicyValidationState state;
        BOOST_CHECK_EQUAL(MinerFundPolicy(consensusParams, blockIndex, block,
                                          blockReward)(state),
                          expected);
        BOOST_CHECK_EQUAL(state.IsValid(), expected);
        if (!expected) {
            BOOST_CHECK_EQUAL(state.GetRejectReason(), "policy-bad-miner-fund");
        }
    };

    // Before wellington activation, the block policy is not enforced
    BOOST_CHECK(
        !IsWellingtonEnabled(consensusParams, firstBlockIndexRef.pprev));
    checkMinerFundPolicy(BlockWithoutMinerFund(blockReward), firstBlockIndexRef,
                         true);

    // After wellington activation, the block policy is enforced
    BOOST_CHECK(IsWellingtonEnabled(consensusParams, lastBlockIndexRef.pprev));
    checkMinerFundPolicy(BlockWithoutMinerFund(blockReward), lastBlockIndexRef,
                         false);

    Amount minerFund = GetMinerFundAmount(consensusParams, blockReward,
                                          lastBlockIndexRef.pprev);
    const std::vector<Amount> minerFundsTooSmall = {1 * SATOSHI, minerFund / 2,
                                                    minerFund - 1 * SATOSHI};
    std::vector<Amount> minerFundsSufficient = {minerFund,
                                                minerFund + 1 * SATOSHI};
    const std::vector<Amount> minerFundsAlwaysSufficient = {blockReward};

    // Blocks with not enough miner fund are always rejected
    for (const Amount &amount : minerFundsTooSmall) {
        checkMinerFundPolicy(BlockWithMinerFund(chainparams, amount),
                             lastBlockIndexRef, false);
    }
    // Blocks with enough miner fund are always accepted
    for (const Amount &amount : minerFundsAlwaysSufficient) {
        checkMinerFundPolicy(BlockWithMinerFund(chainparams, amount),
                             lastBlockIndexRef, true);
    }

    // Blocks with sufficient miner fund before Cowperthwaite activation...
    for (const Amount &amount : minerFundsSufficient) {
        checkMinerFundPolicy(BlockWithMinerFund(chainparams, amount),
                             lastBlockIndexRef, true);
    }

    // ... but not after Cowperthwaite activation
    CBlockIndex cowperthwaiteBlockIndex;
    BlockHash cowperthwaiteBlockHash = BlockHash(uint256(13));
    cowperthwaiteBlockIndex.phashBlock = &cowperthwaiteBlockHash;
    cowperthwaiteBlockIndex.pprev = &lastBlockIndexRef;

    SetMTP(blocks, consensusParams.cowperthwaiteActivationTime);
    BOOST_CHECK(
        IsCowperthwaiteEnabled(consensusParams, cowperthwaiteBlockIndex.pprev));

    for (const Amount &amount : minerFundsSufficient) {
        checkMinerFundPolicy(BlockWithMinerFund(chainparams, amount),
                             cowperthwaiteBlockIndex, false);
    }

    // Update the miner fund values
    minerFund = GetMinerFundAmount(consensusParams, blockReward,
                                   cowperthwaiteBlockIndex.pprev);
    minerFundsSufficient = {minerFund, minerFund + 1 * SATOSHI};

    // Blocks with sufficient miner fund after Cowperthwaite activation
    for (const Amount &amount : minerFundsSufficient) {
        checkMinerFundPolicy(BlockWithMinerFund(chainparams, amount),
                             cowperthwaiteBlockIndex, true);
    }

    // Sanity check the always rejected/accepted blocks are unchanged
    // Blocks with not enough miner fund are always rejected
    for (const Amount &amount : minerFundsTooSmall) {
        checkMinerFundPolicy(BlockWithMinerFund(chainparams, amount),
                             cowperthwaiteBlockIndex, false);
    }
    // Blocks with enough miner fund are always accepted
    for (const Amount &amount : minerFundsAlwaysSufficient) {
        checkMinerFundPolicy(BlockWithMinerFund(chainparams, amount),
                             cowperthwaiteBlockIndex, true);
    }
}

BOOST_AUTO_TEST_SUITE_END()
