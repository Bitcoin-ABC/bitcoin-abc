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
    const chronik_bridge::ChronikBridge bridge(m_node);
    BOOST_CHECK_THROW(bridge.get_chain_tip(),
                      chronik_bridge::block_index_not_found);
}

BOOST_FIXTURE_TEST_CASE(test_get_chain_tip_genesis, TestingSetup) {
    const chronik_bridge::ChronikBridge bridge(m_node);
    // Check for genesis block
    const CBlockIndex &bindex = bridge.get_chain_tip();
    BOOST_CHECK_EQUAL(bindex.GetBlockHash(),
                      m_node.chainman->GetParams().GenesisBlock().GetHash());
}

BOOST_FIXTURE_TEST_CASE(test_get_chain_tip_100, TestChain100Setup) {
    // Generate new block (at height 101)
    CBlock tip_block = CreateAndProcessBlock(
        {}, CScript() << std::vector<uint8_t>(33) << OP_CHECKSIG);
    const chronik_bridge::ChronikBridge bridge(m_node);
    // Check if block is 101th
    const CBlockIndex &bindex = bridge.get_chain_tip();
    BOOST_CHECK_EQUAL(bindex.GetBlockHash(), tip_block.GetHash());
}

BOOST_FIXTURE_TEST_CASE(test_lookup_block_index, TestChain100Setup) {
    const chronik_bridge::ChronikBridge bridge(m_node);
    BlockHash genesis_hash =
        m_node.chainman->GetParams().GenesisBlock().GetHash();
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
    CBlockIndex *tip =
        WITH_LOCK(chainman.GetMutex(), return chainman.ActiveTip());

    // Fork of the tip is the tip
    BOOST_CHECK_EQUAL(bridge.find_fork(*tip).GetBlockHash(),
                      tip->GetBlockHash());
    // Fork of the genesis block is the genesis block
    BOOST_CHECK_EQUAL(bridge.find_fork(*tip->GetAncestor(0)).GetBlockHash(),
                      chainman.GetParams().GenesisBlock().GetHash());

    // Invalidate block in the middle of the chain
    BlockValidationState state;
    chainman.ActiveChainstate().InvalidateBlock(state, tip->GetAncestor(50));

    // Mine 100 blocks, up to height 150
    mineBlocks(100);

    // Fork of old tip is block 49
    auto new_tip = WITH_LOCK(chainman.GetMutex(), return chainman.ActiveTip());
    BOOST_REQUIRE(new_tip);
    BOOST_CHECK_EQUAL(bridge.find_fork(*tip).GetBlockHash(),
                      new_tip->GetAncestor(49)->GetBlockHash());
}

BOOST_FIXTURE_TEST_CASE(test_lookup_spent_coin, TestChain100Setup) {
    ChainstateManager &chainman = *Assert(m_node.chainman);
    LOCK(cs_main);
    const chronik_bridge::ChronikBridge bridge(m_node);
    CCoinsViewCache &coins_cache = chainman.ActiveChainstate().CoinsTip();

    CScript anyoneScript = CScript() << OP_1;
    CScript anyoneP2sh = GetScriptForDestination(ScriptHash(anyoneScript));
    CBlock coinsBlock =
        CreateAndProcessBlock({}, anyoneP2sh, &chainman.ActiveChainstate());
    mineBlocks(100);

    const CTransactionRef coinTx = coinsBlock.vtx[0];

    CScript scriptPad = CScript() << OP_RETURN << std::vector<uint8_t>(100);
    CMutableTransaction tx;
    tx.vin = {CTxIn(
        coinTx->GetId(), 0,
        CScript() << std::vector(anyoneScript.begin(), anyoneScript.end()))};
    tx.vout = {
        CTxOut(1000 * SATOSHI, anyoneP2sh),
        CTxOut(coinTx->vout[0].nValue - 10000 * SATOSHI, anyoneP2sh),
    };
    const MempoolAcceptResult result =
        m_node.chainman->ProcessTransaction(MakeTransactionRef(tx));
    BOOST_CHECK_EQUAL(result.m_result_type,
                      MempoolAcceptResult::ResultType::VALID);
    TxId txid = tx.GetId();

    // Tx we look up coins for. Only the prev_out field is relevant so the other
    // ones are default
    chronik_bridge::Tx query_tx = {
        .txid = {},
        .inputs =
            {
                {.prev_out = {chronik::util::HashToArray(txid), 0},
                 .script = {},
                 .sequence = 0,
                 .coin = {}},
                {.prev_out = {chronik::util::HashToArray(txid), 1},
                 .script = {},
                 .sequence = 0,
                 .coin = {}},
                {.prev_out = {{}, 0x12345678},
                 .script = {},
                 .sequence = 0,
                 .coin = {}},
            },
        .outputs = {},
        .locktime = 0,
    };

    // Do lookup
    rust::Vec<chronik_bridge::OutPoint> not_found;
    rust::Vec<chronik_bridge::OutPoint> coins_to_uncache;
    bridge.lookup_spent_coins(query_tx, not_found, coins_to_uncache);

    // One of the coins was not found
    BOOST_CHECK_EQUAL(not_found.size(), 1);
    BOOST_CHECK(not_found[0] == query_tx.inputs[2].prev_out);

    // Mempool UTXOs aren't in the cache, so lookup_spent_coins thinks they need
    // to be uncached, which seems weird but is intended behavior.
    BOOST_CHECK_EQUAL(coins_to_uncache.size(), 2);
    BOOST_CHECK(coins_to_uncache[0] == query_tx.inputs[0].prev_out);
    BOOST_CHECK(coins_to_uncache[1] == query_tx.inputs[1].prev_out);
    BOOST_CHECK(!coins_cache.HaveCoinInCache(COutPoint(txid, 0)));
    BOOST_CHECK(!coins_cache.HaveCoinInCache(COutPoint(txid, 1)));

    // lookup_spent_coins mutates our query_tx to set the queried coins
    const rust::Vec<uint8_t> &script0 = query_tx.inputs[0].coin.output.script;
    const rust::Vec<uint8_t> &script1 = query_tx.inputs[1].coin.output.script;
    BOOST_CHECK_EQUAL(query_tx.inputs[0].coin.output.sats, 1000);
    BOOST_CHECK(CScript(script0.data(), script0.data() + script0.size()) ==
                anyoneP2sh);
    BOOST_CHECK_EQUAL(query_tx.inputs[1].coin.output.sats,
                      coinTx->vout[0].nValue / SATOSHI - 10000);
    BOOST_CHECK(CScript(script1.data(), script1.data() + script1.size()) ==
                anyoneP2sh);

    // Mine tx
    CreateAndProcessBlock({tx}, CScript() << OP_1,
                          &chainman.ActiveChainstate());
    // Coins are now in the cache
    BOOST_CHECK(coins_cache.HaveCoinInCache(COutPoint(txid, 0)));
    BOOST_CHECK(coins_cache.HaveCoinInCache(COutPoint(txid, 1)));

    // Write cache to DB & clear cache
    coins_cache.Flush();
    BOOST_CHECK(!coins_cache.HaveCoinInCache(COutPoint(txid, 0)));
    BOOST_CHECK(!coins_cache.HaveCoinInCache(COutPoint(txid, 1)));

    // lookup puts the coins back into the cache
    bridge.lookup_spent_coins(query_tx, not_found, coins_to_uncache);
    BOOST_CHECK_EQUAL(coins_to_uncache.size(), 2);
    BOOST_CHECK(coins_to_uncache[0] == query_tx.inputs[0].prev_out);
    BOOST_CHECK(coins_to_uncache[1] == query_tx.inputs[1].prev_out);
    BOOST_CHECK(coins_cache.HaveCoinInCache(COutPoint(txid, 0)));
    BOOST_CHECK(coins_cache.HaveCoinInCache(COutPoint(txid, 1)));

    // Now, we don't get any coins_to_uncache (because the call didn't add
    // anything to it)
    bridge.lookup_spent_coins(query_tx, not_found, coins_to_uncache);
    BOOST_CHECK_EQUAL(coins_to_uncache.size(), 0);

    // Call uncache_coins to uncache the 1st coin
    const std::vector<chronik_bridge::OutPoint> uncache_outpoints{
        query_tx.inputs[0].prev_out};
    bridge.uncache_coins(
        rust::Slice(uncache_outpoints.data(), uncache_outpoints.size()));
    // Only the 2nd coin is now in cache
    BOOST_CHECK(!coins_cache.HaveCoinInCache(COutPoint(txid, 0)));
    BOOST_CHECK(coins_cache.HaveCoinInCache(COutPoint(txid, 1)));
}

BOOST_FIXTURE_TEST_CASE(test_load_block, TestChain100Setup) {
    const chronik_bridge::ChronikBridge bridge(m_node);
    ChainstateManager &chainman = *Assert(m_node.chainman);
    const CBlockIndex &tip =
        WITH_LOCK(chainman.GetMutex(), return *chainman.ActiveTip());

    BOOST_CHECK_EQUAL(bridge.load_block(tip)->GetHash(), tip.GetBlockHash());

    {
        CDataStream expected(SER_NETWORK, PROTOCOL_VERSION);
        CDataStream actual(SER_NETWORK, PROTOCOL_VERSION);
        expected << chainman.GetParams().GenesisBlock();
        actual << *bridge.load_block(*tip.GetAncestor(0));
        BOOST_CHECK_EQUAL(HexStr(actual), HexStr(expected));
    }
}

BOOST_FIXTURE_TEST_CASE(test_get_block_ancestor, TestChain100Setup) {
    ChainstateManager &chainman = *Assert(m_node.chainman);
    const CBlockIndex &tip =
        WITH_LOCK(chainman.GetMutex(), return *chainman.ActiveTip());

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
                      chainman.GetParams().GenesisBlock().GetHash());

    // Block -1 doesn't exist
    BOOST_CHECK_THROW(chronik_bridge::get_block_ancestor(tip, -1),
                      chronik_bridge::block_index_not_found);

    // Block 101 doesn't exist
    BOOST_CHECK_THROW(chronik_bridge::get_block_ancestor(tip, tip.nHeight + 1),
                      chronik_bridge::block_index_not_found);
}

BOOST_FIXTURE_TEST_CASE(test_get_block_info, TestChain100Setup) {
    const chronik_bridge::ChronikBridge bridge(m_node);
    ChainstateManager &chainman = *Assert(m_node.chainman);
    const CBlockIndex &tip =
        WITH_LOCK(chainman.GetMutex(), return *chainman.ActiveTip());

    chronik_bridge::BlockInfo expected_genesis_info{
        .hash = chronik::util::HashToArray(
            chainman.GetParams().GenesisBlock().GetHash()),
        .height = 0};
    BOOST_CHECK(chronik_bridge::get_block_info(*tip.GetAncestor(0)) ==
                expected_genesis_info);

    chronik_bridge::BlockInfo expected_tip_info{
        .hash = chronik::util::HashToArray(tip.GetBlockHash()),
        .height = tip.nHeight};
    BOOST_CHECK(chronik_bridge::get_block_info(tip) == expected_tip_info);
}

BOOST_FIXTURE_TEST_CASE(test_get_block_header, TestChain100Setup) {
    LOCK(::cs_main);
    ChainstateManager &chainman = *Assert(m_node.chainman);
    const CBlockIndex &tip = *chainman.ActiveTip();

    BOOST_CHECK_EQUAL(
        HexStr(chronik_bridge::get_block_header(*tip.GetAncestor(0))),
        "0100000000000000000000000000000000000000000000000000000000000000000000"
        "003ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4adae5"
        "494dffff7f2002000000");
    BOOST_CHECK_EQUAL(HexStr(chronik_bridge::get_block_header(tip)),
                      "00000020e0d8e43b1b228a5e07415ea057c06b3a8caf4e9d82c9af6c"
                      "f04aa87229fa3e507c4ada19c5746e61699678baa1edc97f3258c613"
                      "64d4f8614e6a0801896ee66773184d5fffff7f2000000000");
}

BOOST_FIXTURE_TEST_CASE(test_bridge_broadcast_tx, TestChain100Setup) {
    ChainstateManager &chainman = *Assert(m_node.chainman);
    const chronik_bridge::ChronikBridge bridge(m_node);

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

BOOST_FIXTURE_TEST_CASE(test_calc_fee, BasicTestingSetup) {
    // 0.1 BCHA/kB or 100'000 XEC/kB
    BOOST_CHECK_EQUAL(chronik_bridge::default_max_raw_tx_fee_rate_per_kb(),
                      10'000'000);

    BOOST_CHECK_EQUAL(chronik_bridge::calc_fee(1000, 1000), 1000);
    BOOST_CHECK_EQUAL(chronik_bridge::calc_fee(1000'000, 1000'000),
                      1000'000'000);
    BOOST_CHECK_EQUAL(chronik_bridge::calc_fee(123456789, 100), 12345678);
    BOOST_CHECK_EQUAL(chronik_bridge::calc_fee(2, 1), 1);
    BOOST_CHECK_EQUAL(chronik_bridge::calc_fee(0xdeadbeef, 0xcafe),
                      0xdeadbeefll * 0xcafell / 1000);
}

BOOST_AUTO_TEST_SUITE_END()
