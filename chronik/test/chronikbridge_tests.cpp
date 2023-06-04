// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chainparams.h>
#include <chronik-bridge/src/ffi.rs.h>
#include <chronik-cpp/chronik_bridge.h>
#include <chronik-cpp/util/hash.h>
#include <config.h>
#include <streams.h>
#include <util/strencodings.h>
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
    // get_chain_tip throws block_index_not_found
    const CChainParams &params = GetConfig().GetChainParams();
    const chronik_bridge::ChronikBridge bridge(params.GetConsensus(), m_node);
    BOOST_CHECK_THROW(bridge.get_chain_tip(),
                      chronik_bridge::block_index_not_found);
}

BOOST_FIXTURE_TEST_CASE(test_get_chain_tip_genesis, TestingSetup) {
    const CChainParams &params = GetConfig().GetChainParams();
    const chronik_bridge::ChronikBridge bridge(params.GetConsensus(), m_node);
    // Check for genesis block
    const CBlockIndex &bindex = bridge.get_chain_tip();
    BOOST_CHECK_EQUAL(bindex.GetBlockHash(), params.GenesisBlock().GetHash());
}

BOOST_FIXTURE_TEST_CASE(test_get_chain_tip_100, TestChain100Setup) {
    const CChainParams &params = GetConfig().GetChainParams();
    // Generate new block (at height 101)
    CBlock tip_block = CreateAndProcessBlock(
        {}, CScript() << std::vector<uint8_t>(33) << OP_CHECKSIG);
    const chronik_bridge::ChronikBridge bridge(params.GetConsensus(), m_node);
    // Check if block is 101th
    const CBlockIndex &bindex = bridge.get_chain_tip();
    BOOST_CHECK_EQUAL(bindex.GetBlockHash(), tip_block.GetHash());
}

BOOST_FIXTURE_TEST_CASE(test_lookup_block_index, TestChain100Setup) {
    const CChainParams &params = GetConfig().GetChainParams();
    const chronik_bridge::ChronikBridge bridge(params.GetConsensus(), m_node);
    BlockHash genesis_hash = params.GenesisBlock().GetHash();
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
    const CChainParams &params = GetConfig().GetChainParams();
    const chronik_bridge::ChronikBridge bridge(params.GetConsensus(), m_node);
    ChainstateManager &chainman = *Assert(m_node.chainman);
    CBlockIndex *tip = chainman.ActiveTip();

    // Fork of the tip is the tip
    BOOST_CHECK_EQUAL(bridge.find_fork(*tip).GetBlockHash(),
                      tip->GetBlockHash());
    // Fork of the genesis block is the genesis block
    BOOST_CHECK_EQUAL(bridge.find_fork(*tip->GetAncestor(0)).GetBlockHash(),
                      params.GenesisBlock().GetHash());

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

BOOST_FIXTURE_TEST_CASE(test_load_block, TestChain100Setup) {
    const CChainParams &params = GetConfig().GetChainParams();
    const chronik_bridge::ChronikBridge bridge(params.GetConsensus(), m_node);
    ChainstateManager &chainman = *Assert(m_node.chainman);
    const CBlockIndex &tip = *chainman.ActiveTip();

    BOOST_CHECK_EQUAL(bridge.load_block(tip)->GetHash(), tip.GetBlockHash());

    {
        CDataStream expected(SER_NETWORK, PROTOCOL_VERSION);
        CDataStream actual(SER_NETWORK, PROTOCOL_VERSION);
        expected << params.GenesisBlock();
        actual << *bridge.load_block(*tip.GetAncestor(0));
        BOOST_CHECK_EQUAL(HexStr(actual), HexStr(expected));
    }
}

BOOST_FIXTURE_TEST_CASE(test_get_block_ancestor, TestChain100Setup) {
    const CChainParams &params = GetConfig().GetChainParams();
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
                      params.GenesisBlock().GetHash());

    // Block -1 doesn't exist
    BOOST_CHECK_THROW(chronik_bridge::get_block_ancestor(tip, -1),
                      chronik_bridge::block_index_not_found);

    // Block 101 doesn't exist
    BOOST_CHECK_THROW(chronik_bridge::get_block_ancestor(tip, tip.nHeight + 1),
                      chronik_bridge::block_index_not_found);
}

BOOST_FIXTURE_TEST_CASE(test_get_block_info, TestChain100Setup) {
    const CChainParams &params = GetConfig().GetChainParams();
    const chronik_bridge::ChronikBridge bridge(params.GetConsensus(), m_node);
    ChainstateManager &chainman = *Assert(m_node.chainman);
    const CBlockIndex &tip = *chainman.ActiveTip();

    chronik_bridge::BlockInfo expected_genesis_info{
        .hash = chronik::util::HashToArray(params.GenesisBlock().GetHash()),
        .height = 0};
    BOOST_CHECK(chronik_bridge::get_block_info(*tip.GetAncestor(0)) ==
                expected_genesis_info);

    chronik_bridge::BlockInfo expected_tip_info{
        .hash = chronik::util::HashToArray(tip.GetBlockHash()),
        .height = tip.nHeight};
    BOOST_CHECK(chronik_bridge::get_block_info(tip) == expected_tip_info);
}

BOOST_FIXTURE_TEST_CASE(test_bridge_broadcast_tx, TestChain100Setup) {
    ChainstateManager &chainman = *Assert(m_node.chainman);
    const CChainParams &params = GetConfig().GetChainParams();
    const chronik_bridge::ChronikBridge bridge(params.GetConsensus(), m_node);

    CScript anyoneScript = CScript() << OP_1;
    CScript anyoneP2sh = GetScriptForDestination(ScriptHash(anyoneScript));
    CBlock coinsBlock =
        CreateAndProcessBlock({}, anyoneP2sh, &chainman.ActiveChainstate());
    mineBlocks(100);

    const CTransactionRef coinTx = coinsBlock.vtx[0];

    CScript scriptPad = CScript() << OP_RETURN << std::vector<uint8_t>(100);
    CMutableTransaction tx;
    tx.vin = {CTxIn(coinTx->GetId(), 0)};
    tx.vout = {
        CTxOut(coinTx->vout[0].nValue - 10000 * SATOSHI, scriptPad),
    };

    {
        // Failed broadcast: mempool rejected tx
        CDataStream ss(SER_NETWORK, PROTOCOL_VERSION);
        ss << tx;
        rust::Slice<const uint8_t> raw_tx{(const uint8_t *)ss.data(),
                                          ss.size()};
        BOOST_CHECK_EXCEPTION(
            bridge.broadcast_tx(raw_tx, 10000), std::runtime_error,
            [](const std::runtime_error &ex) {
                BOOST_CHECK_EQUAL(
                    ex.what(), "Transaction rejected by mempool: "
                               "mandatory-script-verify-flag-failed (Operation "
                               "not valid with the current stack size)");
                return true;
            });
    }

    tx.vin[0].scriptSig =
        CScript() << std::vector(anyoneScript.begin(), anyoneScript.end());

    {
        // Failed broadcast from excessive fee (10000 > 9999).
        CDataStream ss(SER_NETWORK, PROTOCOL_VERSION);
        ss << tx;
        rust::Slice<const uint8_t> raw_tx{(const uint8_t *)ss.data(),
                                          ss.size()};
        BOOST_CHECK_EXCEPTION(
            bridge.broadcast_tx(raw_tx, 9999), std::runtime_error,
            [](const std::runtime_error &ex) {
                BOOST_CHECK_EQUAL(ex.what(),
                                  "Fee exceeds maximum configured by user "
                                  "(e.g. -maxtxfee, maxfeerate)");
                return true;
            });
    }

    {
        // Successful broadcast
        CDataStream ss(SER_NETWORK, PROTOCOL_VERSION);
        ss << tx;
        rust::Slice<const uint8_t> raw_tx{(const uint8_t *)ss.data(),
                                          ss.size()};
        BOOST_CHECK_EQUAL(HexStr(bridge.broadcast_tx(raw_tx, 10000)),
                          HexStr(chronik::util::HashToArray(tx.GetId())));
        // Broadcast again simply returns the hash (fee check skipped here)
        BOOST_CHECK_EQUAL(HexStr(bridge.broadcast_tx(raw_tx, 9999)),
                          HexStr(chronik::util::HashToArray(tx.GetId())));
    }
}

BOOST_AUTO_TEST_SUITE_END()
