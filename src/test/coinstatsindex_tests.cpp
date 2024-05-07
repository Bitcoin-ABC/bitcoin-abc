// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chainparams.h>
#include <config.h>
#include <index/coinstatsindex.h>
#include <test/util/setup_common.h>
#include <test/util/validation.h>
#include <util/time.h>
#include <validation.h>

#include <boost/test/unit_test.hpp>

#include <chrono>

using kernel::CCoinsStats;
using kernel::CoinStatsHashType;

BOOST_AUTO_TEST_SUITE(coinstatsindex_tests)

static void IndexWaitSynced(BaseIndex &index) {
    // Allow the CoinStatsIndex to catch up with the block index that is syncing
    // in a background thread.
    const auto timeout = GetTime<std::chrono::seconds>() + 120s;
    while (!index.BlockUntilSyncedToCurrentChain()) {
        BOOST_REQUIRE(timeout > GetTime<std::chrono::milliseconds>());
        UninterruptibleSleep(100ms);
    }
}

BOOST_FIXTURE_TEST_CASE(coinstatsindex_initial_sync, TestChain100Setup) {
    CoinStatsIndex coin_stats_index{1 << 20, true};

    const CBlockIndex *block_index;
    {
        LOCK(cs_main);
        block_index = m_node.chainman->ActiveTip();
    }

    // CoinStatsIndex should not be found before it is started.
    BOOST_CHECK(!coin_stats_index.LookUpStats(block_index));

    // BlockUntilSyncedToCurrentChain should return false before CoinStatsIndex
    // is started.
    BOOST_CHECK(!coin_stats_index.BlockUntilSyncedToCurrentChain());

    BOOST_REQUIRE(coin_stats_index.Start(m_node.chainman->ActiveChainstate()));

    IndexWaitSynced(coin_stats_index);

    // Check that CoinStatsIndex works for genesis block.
    const CBlockIndex *genesis_block_index;
    {
        LOCK(cs_main);
        genesis_block_index = m_node.chainman->ActiveChain().Genesis();
    }
    BOOST_CHECK(coin_stats_index.LookUpStats(genesis_block_index));

    // Check that CoinStatsIndex updates with new blocks.
    BOOST_CHECK(coin_stats_index.LookUpStats(block_index));

    const CScript script_pub_key{
        CScript() << ToByteVector(coinbaseKey.GetPubKey()) << OP_CHECKSIG};
    std::vector<CMutableTransaction> noTxns;
    CreateAndProcessBlock(noTxns, script_pub_key);

    // Let the CoinStatsIndex to catch up again.
    BOOST_CHECK(coin_stats_index.BlockUntilSyncedToCurrentChain());

    const CBlockIndex *new_block_index;
    {
        LOCK(cs_main);
        new_block_index = m_node.chainman->ActiveTip();
    }
    BOOST_CHECK(coin_stats_index.LookUpStats(new_block_index));

    BOOST_CHECK(block_index != new_block_index);

    // Shutdown sequence (c.f. Shutdown() in init.cpp)
    coin_stats_index.Stop();

    // Rest of shutdown sequence and destructors happen in ~TestingSetup()
}

// Test shutdown between BlockConnected and ChainStateFlushed notifications,
// make sure index is not corrupted and is able to reload.
BOOST_FIXTURE_TEST_CASE(coinstatsindex_unclean_shutdown, TestChain100Setup) {
    Chainstate &chainstate = Assert(m_node.chainman)->ActiveChainstate();
    const Config &config = m_node.chainman->GetConfig();
    {
        CoinStatsIndex index{1 << 20};
        BOOST_REQUIRE(index.Start(chainstate));
        IndexWaitSynced(index);
        std::shared_ptr<const CBlock> new_block;
        CBlockIndex *new_block_index = nullptr;
        {
            const CScript script_pub_key{
                CScript() << ToByteVector(coinbaseKey.GetPubKey())
                          << OP_CHECKSIG};
            const CBlock block =
                this->CreateBlock({}, script_pub_key, chainstate);

            new_block = std::make_shared<CBlock>(block);

            LOCK(cs_main);
            BlockValidationState state;
            BlockValidationOptions options{config};
            BOOST_CHECK(CheckBlock(
                block, state, config.GetChainParams().GetConsensus(), options));
            BOOST_CHECK(chainstate.AcceptBlock(new_block, state, true, nullptr,
                                               nullptr, true));

            // Get the block index (not returned by AcceptBlock since D2127)
            auto it{m_node.chainman->m_blockman.m_block_index.find(
                new_block->GetHash())};
            if (it != m_node.chainman->m_blockman.m_block_index.end()) {
                new_block_index = &(it->second);
            }

            CCoinsViewCache view(&chainstate.CoinsTip());
            BOOST_CHECK(chainstate.ConnectBlock(block, state, new_block_index,
                                                view, options));
        }
        // Send block connected notification, then stop the index without
        // sending a chainstate flushed notification. Prior to #24138, this
        // would cause the index to be corrupted and fail to reload.
        ValidationInterfaceTest::BlockConnected(index, new_block,
                                                new_block_index);
        index.Stop();
    }

    {
        CoinStatsIndex index{1 << 20};
        // Make sure the index can be loaded.
        BOOST_REQUIRE(index.Start(chainstate));
        index.Stop();
    }
}

BOOST_AUTO_TEST_SUITE_END()
