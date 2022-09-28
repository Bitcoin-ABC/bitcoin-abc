// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chainparams.h>
#include <chronik-bridge/src/ffi.rs.h>
#include <chronik-cpp/chronik_bridge.h>
#include <config.h>
#include <validation.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

BOOST_AUTO_TEST_SUITE(chronikbridge_tests)

BOOST_FIXTURE_TEST_CASE(test_get_chain_tip_empty, ChainTestingSetup) {
    // Setup chainstate
    {
        LOCK(::cs_main);
        m_node.chainman->InitializeChainstate(*m_node.mempool);
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
        .hash =
            HashToArray(GetConfig().GetChainParams().GenesisBlock().GetHash()),
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
        .hash = HashToArray(tip_block.GetHash()), .height = 101};
    BOOST_CHECK(block == expected_block);
}

BOOST_AUTO_TEST_SUITE_END()
