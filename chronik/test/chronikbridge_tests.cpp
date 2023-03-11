// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chainparams.h>
#include <chronik-bridge/src/ffi.rs.h>
#include <chronik-cpp/chronik_bridge.h>
#include <chronik-cpp/util/hash.h>
#include <config.h>
#include <validation.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

BOOST_AUTO_TEST_SUITE(chronikbridge_tests)

BOOST_FIXTURE_TEST_CASE(test_get_chain_tip_empty, ChainTestingSetup) {
    // Setup chainstate
    {
        LOCK(::cs_main);
        m_node.chainman->InitializeChainstate(m_node.mempool.get());
    }
    // Chain has no blocks yet:
    // get_chain_tip returns hash=000...000, height=-1
    const chronik_bridge::ChronikBridge bridge(m_node);
    chronik_bridge::BlockInfo block = bridge.get_chain_tip();
    chronik_bridge::BlockInfo expected_block{.hash = {}, .height = -1};
    BOOST_CHECK(block == expected_block);
}

BOOST_FIXTURE_TEST_CASE(test_get_chain_tip_genesis, TestingSetup) {
    const chronik_bridge::ChronikBridge bridge(m_node);
    // Check for genesis block
    chronik_bridge::BlockInfo block = bridge.get_chain_tip();
    chronik_bridge::BlockInfo expected_block{
        .hash = chronik::util::HashToArray(
            GetConfig().GetChainParams().GenesisBlock().GetHash()),
        .height = 0};
    BOOST_CHECK(block == expected_block);
}

BOOST_FIXTURE_TEST_CASE(test_get_chain_tip_100, TestChain100Setup) {
    // Generate new block (at height 101)
    CBlock tip_block = CreateAndProcessBlock(
        {}, CScript() << std::vector<uint8_t>(33) << OP_CHECKSIG);
    const chronik_bridge::ChronikBridge bridge(m_node);
    // Check if block is 101th
    chronik_bridge::BlockInfo block = bridge.get_chain_tip();
    chronik_bridge::BlockInfo expected_block{
        .hash = chronik::util::HashToArray(tip_block.GetHash()), .height = 101};
    BOOST_CHECK(block == expected_block);
}

BOOST_FIXTURE_TEST_CASE(test_lookup_block_index, TestChain100Setup) {
    const chronik_bridge::ChronikBridge bridge(m_node);
    BlockHash genesis_hash =
        GetConfig().GetChainParams().GenesisBlock().GetHash();
    const CBlockIndex &bindex_genesis =
        bridge.lookup_block_index(chronik::util::HashToArray(genesis_hash));
    BOOST_CHECK_EQUAL(bindex_genesis.GetBlockHash(), genesis_hash);

    // Generate new block (at height 101)
    CBlock tip_block = CreateAndProcessBlock(
        {}, CScript() << std::vector<uint8_t>(33) << OP_CHECKSIG);
    // Query block
    const CBlockIndex &bindex_tip = bridge.lookup_block_index(
        chronik::util::HashToArray(tip_block.GetHash()));
    BOOST_CHECK_EQUAL(bindex_tip.GetBlockHash(), tip_block.GetHash());

    // Block 000...000 doesn't exist
    BOOST_CHECK_THROW(bridge.lookup_block_index({}),
                      chronik_bridge::block_index_not_found);
}

BOOST_FIXTURE_TEST_CASE(test_find_fork, TestChain100Setup) {
    const chronik_bridge::ChronikBridge bridge(m_node);
    ChainstateManager &chainman = *Assert(m_node.chainman);
    CBlockIndex *tip = chainman.ActiveTip();

    // Fork of the tip is the tip
    BOOST_CHECK_EQUAL(bridge.find_fork(*tip).GetBlockHash(),
                      tip->GetBlockHash());
    // Fork of the genesis block is the genesis block
    BOOST_CHECK_EQUAL(bridge.find_fork(*tip->GetAncestor(0)).GetBlockHash(),
                      GetConfig().GetChainParams().GenesisBlock().GetHash());

    // Invalidate block in the middle of the chain
    BlockValidationState state;
    chainman.ActiveChainstate().InvalidateBlock(GetConfig(), state,
                                                tip->GetAncestor(50));

    // Mine 100 blocks, up to height 150
    mineBlocks(100);

    // Fork of old tip is block 49
    BOOST_CHECK_EQUAL(bridge.find_fork(*tip).GetBlockHash(),
                      chainman.ActiveTip()->GetAncestor(49)->GetBlockHash());
}

BOOST_FIXTURE_TEST_CASE(test_get_block_ancestor, TestChain100Setup) {
    ChainstateManager &chainman = *Assert(m_node.chainman);
    const CBlockIndex &tip = *chainman.ActiveTip();

    // Block 100 is the tip
    BOOST_CHECK_EQUAL(
        chronik_bridge::get_block_ancestor(tip, 100).GetBlockHash(),
        tip.GetBlockHash());

    // Block 99 is the prev of the tip
    BOOST_CHECK_EQUAL(
        chronik_bridge::get_block_ancestor(tip, 99).GetBlockHash(),
        tip.GetBlockHeader().hashPrevBlock);

    // Genesis block is block 0
    BOOST_CHECK_EQUAL(chronik_bridge::get_block_ancestor(tip, 0).GetBlockHash(),
                      GetConfig().GetChainParams().GenesisBlock().GetHash());

    // Block -1 doesn't exist
    BOOST_CHECK_THROW(chronik_bridge::get_block_ancestor(tip, -1),
                      chronik_bridge::block_index_not_found);

    // Block 101 doesn't exist
    BOOST_CHECK_THROW(chronik_bridge::get_block_ancestor(tip, tip.nHeight + 1),
                      chronik_bridge::block_index_not_found);
}

BOOST_AUTO_TEST_SUITE_END()
