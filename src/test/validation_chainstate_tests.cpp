// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
//
#include <chainparams.h>
#include <config.h>
#include <consensus/validation.h>
#include <random.h>
#include <rpc/blockchain.h>
#include <sync.h>
#include <test/util/chainstate.h>
#include <test/util/setup_common.h>
#include <uint256.h>
#include <validation.h>

#include <vector>

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(validation_chainstate_tests, TestingSetup)

//! Test resizing coins-related Chainstate caches during runtime.
//!
BOOST_AUTO_TEST_CASE(validation_chainstate_resize_caches) {
    const Config &config = GetConfig();
    ChainstateManager manager(config);
    WITH_LOCK(::cs_main, manager.m_blockman.m_block_tree_db =
                             std::make_unique<CBlockTreeDB>(1 << 20, true));
    CTxMemPool &mempool = *Assert(m_node.mempool);

    //! Create and add a Coin with DynamicMemoryUsage of 80 bytes to the given
    //! view.
    auto add_coin = [](CCoinsViewCache &coins_view) -> COutPoint {
        TxId txid{InsecureRand256()};
        COutPoint outp{txid, 0};
        Amount nValue = static_cast<int64_t>(InsecureRand32()) * SATOSHI;
        CScript scriptPubKey;
        scriptPubKey.assign((uint32_t)56, 1);
        Coin newcoin(CTxOut(nValue, std::move(scriptPubKey)), 1, false);
        coins_view.AddCoin(outp, std::move(newcoin), false);

        return outp;
    };

    Chainstate &c1 =
        WITH_LOCK(cs_main, return manager.InitializeChainstate(&mempool));
    c1.InitCoinsDB(
        /* cache_size_bytes */ 1 << 23, /* in_memory */ true,
        /* should_wipe */ false);
    WITH_LOCK(::cs_main, c1.InitCoinsCache(1 << 23));
    // Need at least one block loaded to be able to flush caches
    BOOST_REQUIRE(c1.LoadGenesisBlock());

    // Add a coin to the in-memory cache, upsize once, then downsize.
    {
        LOCK(::cs_main);
        auto outpoint = add_coin(c1.CoinsTip());

        // Set a meaningless bestblock value in the coinsview cache - otherwise
        // we won't flush during ResizecoinsCaches() and will subsequently hit
        // an assertion.
        c1.CoinsTip().SetBestBlock(BlockHash{InsecureRand256()});

        BOOST_CHECK(c1.CoinsTip().HaveCoinInCache(outpoint));

        c1.ResizeCoinsCaches(/* upsizing the coinsview cache */ 1 << 24,
                             /* downsizing the coinsdb cache */ 1 << 22);

        // View should still have the coin cached, since we haven't destructed
        // the cache on upsize.
        BOOST_CHECK(c1.CoinsTip().HaveCoinInCache(outpoint));

        c1.ResizeCoinsCaches(/* upsizing the coinsview cache */ 1 << 22,
                             /* downsizing the coinsdb cache */ 1 << 23);

        // The view cache should be empty since we had to destruct to downsize.
        BOOST_CHECK(!c1.CoinsTip().HaveCoinInCache(outpoint));
    }
}

//! Test UpdateTip behavior for both active and background chainstates.
//!
//! When run on the background chainstate, UpdateTip should do a subset
//! of what it does for the active chainstate.
BOOST_FIXTURE_TEST_CASE(chainstate_update_tip, TestChain100Setup) {
    ChainstateManager &chainman = *Assert(m_node.chainman);
    BlockHash curr_tip = BlockHash{::g_best_block};

    // Mine 10 more blocks, putting at us height 110 where a valid assumeutxo
    // value can be found.
    mineBlocks(10);

    // After adding some blocks to the tip, best block should have changed.
    BOOST_CHECK(::g_best_block != curr_tip);

    BOOST_REQUIRE(CreateAndActivateUTXOSnapshot(this, NoMalleation,
                                                /*reset_chainstate=*/true));

    // Ensure our active chain is the snapshot chainstate.
    BOOST_CHECK(WITH_LOCK(::cs_main, return chainman.IsSnapshotActive()));

    curr_tip = BlockHash{::g_best_block};

    // Mine a new block on top of the activated snapshot chainstate.
    // Defined in TestChain100Setup.
    mineBlocks(1);

    // After adding some blocks to the snapshot tip, best block should have
    // changed.
    BOOST_CHECK(::g_best_block != curr_tip);

    curr_tip = BlockHash{::g_best_block};

    Chainstate *background_cs = nullptr;

    auto chainstates = chainman.GetAll();
    BOOST_CHECK_EQUAL(chainstates.size(), 2);
    for (Chainstate *cs : chainman.GetAll()) {
        BOOST_CHECK(cs);
        if (cs != &chainman.ActiveChainstate()) {
            background_cs = cs;
        }
    }
    BOOST_CHECK(background_cs);

    // Create a block to append to the validation chain.
    std::vector<CMutableTransaction> noTxns;
    CScript scriptPubKey = CScript() << ToByteVector(coinbaseKey.GetPubKey())
                                     << OP_CHECKSIG;
    CBlock validation_block =
        this->CreateBlock(noTxns, scriptPubKey, *background_cs);
    auto pblock = std::make_shared<const CBlock>(validation_block);
    BlockValidationState state;
    bool newblock = false;

    const Config &config = GetConfig();
    // TODO: much of this is inlined from ProcessNewBlock(); just reuse PNB()
    // once it is changed to support multiple chainstates.
    {
        LOCK(::cs_main);
        BlockValidationOptions options{config};
        bool checked = CheckBlock(
            *pblock, state, config.GetChainParams().GetConsensus(), options);
        BOOST_CHECK(checked);
        bool accepted = background_cs->AcceptBlock(config, pblock, state, true,
                                                   nullptr, &newblock);
        BOOST_CHECK(accepted);
    }
    // UpdateTip is called here
    bool block_added = background_cs->ActivateBestChain(config, state, pblock);

    // Ensure tip is as expected
    BOOST_CHECK_EQUAL(background_cs->m_chain.Tip()->GetBlockHash(),
                      validation_block.GetHash());

    // g_best_block should be unchanged after adding a block to the background
    // validation chain.
    BOOST_CHECK(block_added);
    BOOST_CHECK_EQUAL(curr_tip, ::g_best_block);
}

BOOST_AUTO_TEST_SUITE_END()
