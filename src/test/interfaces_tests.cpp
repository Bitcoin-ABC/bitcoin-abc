// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chainparams.h>
#include <config.h>
#include <consensus/validation.h>
#include <interfaces/chain.h>
#include <script/standard.h>
#include <test/util/setup_common.h>
#include <validation.h>

#include <boost/test/unit_test.hpp>

using interfaces::FoundBlock;

BOOST_FIXTURE_TEST_SUITE(interfaces_tests, TestChain100Setup)

BOOST_AUTO_TEST_CASE(findBlock) {
    auto chain = interfaces::MakeChain(m_node, Params());
    auto &active = ChainActive();

    BlockHash hash;
    BOOST_CHECK(
        chain->findBlock(active[10]->GetBlockHash(), FoundBlock().hash(hash)));
    BOOST_CHECK_EQUAL(hash, active[10]->GetBlockHash());

    int height = -1;
    BOOST_CHECK(chain->findBlock(active[20]->GetBlockHash(),
                                 FoundBlock().height(height)));
    BOOST_CHECK_EQUAL(height, active[20]->nHeight);

    CBlock data;
    BOOST_CHECK(
        chain->findBlock(active[30]->GetBlockHash(), FoundBlock().data(data)));
    BOOST_CHECK_EQUAL(data.GetHash(), active[30]->GetBlockHash());

    int64_t time = -1;
    BOOST_CHECK(
        chain->findBlock(active[40]->GetBlockHash(), FoundBlock().time(time)));
    BOOST_CHECK_EQUAL(time, active[40]->GetBlockTime());

    int64_t max_time = -1;
    BOOST_CHECK(chain->findBlock(active[50]->GetBlockHash(),
                                 FoundBlock().maxTime(max_time)));
    BOOST_CHECK_EQUAL(max_time, active[50]->GetBlockTimeMax());

    int64_t mtp_time = -1;
    BOOST_CHECK(chain->findBlock(active[60]->GetBlockHash(),
                                 FoundBlock().mtpTime(mtp_time)));
    BOOST_CHECK_EQUAL(mtp_time, active[60]->GetMedianTimePast());

    BOOST_CHECK(!chain->findBlock(BlockHash(), FoundBlock()));
}

BOOST_AUTO_TEST_CASE(findFirstBlockWithTimeAndHeight) {
    auto chain = interfaces::MakeChain(m_node, Params());
    auto &active = ChainActive();
    BlockHash hash;
    int height;
    BOOST_CHECK(chain->findFirstBlockWithTimeAndHeight(
        /* min_time= */ 0, /* min_height= */ 5,
        FoundBlock().hash(hash).height(height)));
    BOOST_CHECK_EQUAL(hash, active[5]->GetBlockHash());
    BOOST_CHECK_EQUAL(height, 5);
    BOOST_CHECK(!chain->findFirstBlockWithTimeAndHeight(
        /* min_time= */ active.Tip()->GetBlockTimeMax() + 1,
        /* min_height= */ 0));
}

BOOST_AUTO_TEST_CASE(findNextBlock) {
    auto chain = interfaces::MakeChain(m_node, Params());
    auto &active = ChainActive();
    bool reorg;
    BlockHash hash;
    BOOST_CHECK(chain->findNextBlock(active[20]->GetBlockHash(), 20,
                                     FoundBlock().hash(hash), &reorg));
    BOOST_CHECK_EQUAL(hash, active[21]->GetBlockHash());
    BOOST_CHECK_EQUAL(reorg, false);
    BOOST_CHECK(!chain->findNextBlock(BlockHash(), 20, {}, &reorg));
    BOOST_CHECK_EQUAL(reorg, true);
    BOOST_CHECK(!chain->findNextBlock(active.Tip()->GetBlockHash(),
                                      active.Height(), {}, &reorg));
    BOOST_CHECK_EQUAL(reorg, false);
}

BOOST_AUTO_TEST_CASE(findAncestorByHeight) {
    auto chain = interfaces::MakeChain(m_node, Params());
    auto &active = ChainActive();
    BlockHash hash;
    BOOST_CHECK(chain->findAncestorByHeight(active[20]->GetBlockHash(), 10,
                                            FoundBlock().hash(hash)));
    BOOST_CHECK_EQUAL(hash, active[10]->GetBlockHash());
    BOOST_CHECK(!chain->findAncestorByHeight(active[10]->GetBlockHash(), 20));
}

BOOST_AUTO_TEST_CASE(findAncestorByHash) {
    auto chain = interfaces::MakeChain(m_node, Params());
    auto &active = ChainActive();
    int height = -1;
    BOOST_CHECK(chain->findAncestorByHash(active[20]->GetBlockHash(),
                                          active[10]->GetBlockHash(),
                                          FoundBlock().height(height)));
    BOOST_CHECK_EQUAL(height, 10);
    BOOST_CHECK(!chain->findAncestorByHash(active[10]->GetBlockHash(),
                                           active[20]->GetBlockHash()));
}

BOOST_AUTO_TEST_CASE(findCommonAncestor) {
    auto chain = interfaces::MakeChain(m_node, Params());
    auto &active = ChainActive();
    auto *orig_tip = active.Tip();
    for (int i = 0; i < 10; ++i) {
        BlockValidationState state;
        ChainstateActive().InvalidateBlock(GetConfig(), state, active.Tip());
    }
    BOOST_CHECK_EQUAL(active.Height(), orig_tip->nHeight - 10);
    coinbaseKey.MakeNewKey(true);
    for (int i = 0; i < 20; ++i) {
        CreateAndProcessBlock({},
                              GetScriptForRawPubKey(coinbaseKey.GetPubKey()));
    }
    BOOST_CHECK_EQUAL(active.Height(), orig_tip->nHeight + 10);
    BlockHash fork_hash;
    int fork_height;
    int orig_height;
    BOOST_CHECK(chain->findCommonAncestor(
        orig_tip->GetBlockHash(), active.Tip()->GetBlockHash(),
        FoundBlock().height(fork_height).hash(fork_hash),
        FoundBlock().height(orig_height)));
    BOOST_CHECK_EQUAL(orig_height, orig_tip->nHeight);
    BOOST_CHECK_EQUAL(fork_height, orig_tip->nHeight - 10);
    BOOST_CHECK_EQUAL(fork_hash, active[fork_height]->GetBlockHash());

    BlockHash active_hash, orig_hash;
    BOOST_CHECK(!chain->findCommonAncestor(active.Tip()->GetBlockHash(),
                                           BlockHash(), {},
                                           FoundBlock().hash(active_hash), {}));
    BOOST_CHECK(!chain->findCommonAncestor(BlockHash(),
                                           orig_tip->GetBlockHash(), {}, {},
                                           FoundBlock().hash(orig_hash)));
    BOOST_CHECK_EQUAL(active_hash, active.Tip()->GetBlockHash());
    BOOST_CHECK_EQUAL(orig_hash, orig_tip->GetBlockHash());
}

BOOST_AUTO_TEST_CASE(hasBlocks) {
    auto chain = interfaces::MakeChain(m_node, Params());
    auto &active = ChainActive();

    // Test ranges
    BOOST_CHECK(chain->hasBlocks(active.Tip()->GetBlockHash(), 10, 90));
    BOOST_CHECK(chain->hasBlocks(active.Tip()->GetBlockHash(), 10, {}));
    BOOST_CHECK(chain->hasBlocks(active.Tip()->GetBlockHash(), 0, 90));
    BOOST_CHECK(chain->hasBlocks(active.Tip()->GetBlockHash(), 0, {}));
    BOOST_CHECK(chain->hasBlocks(active.Tip()->GetBlockHash(), -1000, 1000));
    active[5]->nStatus = active[5]->nStatus.withData(false);
    BOOST_CHECK(chain->hasBlocks(active.Tip()->GetBlockHash(), 10, 90));
    BOOST_CHECK(chain->hasBlocks(active.Tip()->GetBlockHash(), 10, {}));
    BOOST_CHECK(!chain->hasBlocks(active.Tip()->GetBlockHash(), 0, 90));
    BOOST_CHECK(!chain->hasBlocks(active.Tip()->GetBlockHash(), 0, {}));
    BOOST_CHECK(!chain->hasBlocks(active.Tip()->GetBlockHash(), -1000, 1000));
    active[95]->nStatus = active[95]->nStatus.withData(false);
    BOOST_CHECK(chain->hasBlocks(active.Tip()->GetBlockHash(), 10, 90));
    BOOST_CHECK(!chain->hasBlocks(active.Tip()->GetBlockHash(), 10, {}));
    BOOST_CHECK(!chain->hasBlocks(active.Tip()->GetBlockHash(), 0, 90));
    BOOST_CHECK(!chain->hasBlocks(active.Tip()->GetBlockHash(), 0, {}));
    BOOST_CHECK(!chain->hasBlocks(active.Tip()->GetBlockHash(), -1000, 1000));
    active[50]->nStatus = active[50]->nStatus.withData(false);
    BOOST_CHECK(!chain->hasBlocks(active.Tip()->GetBlockHash(), 10, 90));
    BOOST_CHECK(!chain->hasBlocks(active.Tip()->GetBlockHash(), 10, {}));
    BOOST_CHECK(!chain->hasBlocks(active.Tip()->GetBlockHash(), 0, 90));
    BOOST_CHECK(!chain->hasBlocks(active.Tip()->GetBlockHash(), 0, {}));
    BOOST_CHECK(!chain->hasBlocks(active.Tip()->GetBlockHash(), -1000, 1000));

    // Test edge cases
    BOOST_CHECK(chain->hasBlocks(active.Tip()->GetBlockHash(), 6, 49));
    BOOST_CHECK(!chain->hasBlocks(active.Tip()->GetBlockHash(), 5, 49));
    BOOST_CHECK(!chain->hasBlocks(active.Tip()->GetBlockHash(), 6, 50));
}

BOOST_AUTO_TEST_SUITE_END()
