// Copyright (c) 2018-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <boost/test/unit_test.hpp>

#include <chain.h>
#include <chainparams.h>
#include <config.h>
#include <consensus/merkle.h>
#include <consensus/validation.h>
#include <miner.h>
#include <pow/pow.h>
#include <random.h>
#include <script/standard.h>
#include <test/util/setup_common.h>
#include <util/time.h>
#include <validation.h>
#include <validationinterface.h>

#include <thread>

namespace validation_block_tests {
struct MinerTestingSetup : public RegTestingSetup {
    std::shared_ptr<CBlock> Block(const Config &config,
                                  const BlockHash &prev_hash);
    std::shared_ptr<const CBlock> GoodBlock(const Config &config,
                                            const BlockHash &prev_hash);
    std::shared_ptr<const CBlock> BadBlock(const Config &config,
                                           const BlockHash &prev_hash);
    std::shared_ptr<CBlock> FinalizeBlock(const Consensus::Params &params,
                                          std::shared_ptr<CBlock> pblock);
    void BuildChain(const Config &config, const BlockHash &root, int height,
                    const unsigned int invalid_rate,
                    const unsigned int branch_rate, const unsigned int max_size,
                    std::vector<std::shared_ptr<const CBlock>> &blocks);
};
} // namespace validation_block_tests

BOOST_FIXTURE_TEST_SUITE(validation_block_tests, MinerTestingSetup)

struct TestSubscriber final : public CValidationInterface {
    uint256 m_expected_tip;

    explicit TestSubscriber(uint256 tip) : m_expected_tip(tip) {}

    void UpdatedBlockTip(const CBlockIndex *pindexNew,
                         const CBlockIndex *pindexFork,
                         bool fInitialDownload) override {
        BOOST_CHECK_EQUAL(m_expected_tip, pindexNew->GetBlockHash());
    }

    void BlockConnected(const std::shared_ptr<const CBlock> &block,
                        const CBlockIndex *pindex) override {
        BOOST_CHECK_EQUAL(m_expected_tip, block->hashPrevBlock);
        BOOST_CHECK_EQUAL(m_expected_tip, pindex->pprev->GetBlockHash());

        m_expected_tip = block->GetHash();
    }

    void BlockDisconnected(const std::shared_ptr<const CBlock> &block,
                           const CBlockIndex *pindex) override {
        BOOST_CHECK_EQUAL(m_expected_tip, block->GetHash());
        BOOST_CHECK_EQUAL(m_expected_tip, pindex->GetBlockHash());

        m_expected_tip = block->hashPrevBlock;
    }
};

std::shared_ptr<CBlock> MinerTestingSetup::Block(const Config &config,
                                                 const BlockHash &prev_hash) {
    static int i = 0;
    static uint64_t time = config.GetChainParams().GenesisBlock().nTime;

    CScript pubKey;
    pubKey << i++ << OP_TRUE;

    auto ptemplate =
        BlockAssembler(config, *m_node.mempool).CreateNewBlock(pubKey);
    auto pblock = std::make_shared<CBlock>(ptemplate->block);
    pblock->hashPrevBlock = prev_hash;
    pblock->nTime = ++time;

    pubKey.clear();
    {
        pubKey << OP_HASH160 << ToByteVector(CScriptID(CScript() << OP_TRUE))
               << OP_EQUAL;
    }
    // Make the coinbase transaction with two outputs:
    // One zero-value one that has a unique pubkey to make sure that blocks at
    // the same height can have a different hash. Another one that has the
    // coinbase reward in a P2SH with OP_TRUE as scriptPubKey to make it easy to
    // spend
    CMutableTransaction txCoinbase(*pblock->vtx[0]);
    txCoinbase.vout.resize(2);
    txCoinbase.vout[1].scriptPubKey = pubKey;
    txCoinbase.vout[1].nValue = txCoinbase.vout[0].nValue;
    txCoinbase.vout[0].nValue = Amount::zero();
    pblock->vtx[0] = MakeTransactionRef(std::move(txCoinbase));

    return pblock;
}

std::shared_ptr<CBlock>
MinerTestingSetup::FinalizeBlock(const Consensus::Params &params,
                                 std::shared_ptr<CBlock> pblock) {
    pblock->hashMerkleRoot = BlockMerkleRoot(*pblock);

    while (!CheckProofOfWork(pblock->GetHash(), pblock->nBits, params)) {
        ++(pblock->nNonce);
    }

    return pblock;
}

// construct a valid block
std::shared_ptr<const CBlock>
MinerTestingSetup::GoodBlock(const Config &config, const BlockHash &prev_hash) {
    return FinalizeBlock(config.GetChainParams().GetConsensus(),
                         Block(config, prev_hash));
}

// construct an invalid block (but with a valid header)
std::shared_ptr<const CBlock>
MinerTestingSetup::BadBlock(const Config &config, const BlockHash &prev_hash) {
    auto pblock = Block(config, prev_hash);

    CMutableTransaction coinbase_spend;
    coinbase_spend.vin.push_back(
        CTxIn(COutPoint(pblock->vtx[0]->GetId(), 0), CScript(), 0));
    coinbase_spend.vout.push_back(pblock->vtx[0]->vout[0]);

    CTransactionRef tx = MakeTransactionRef(coinbase_spend);
    pblock->vtx.push_back(tx);

    auto ret = FinalizeBlock(config.GetChainParams().GetConsensus(), pblock);
    return ret;
}

void MinerTestingSetup::BuildChain(
    const Config &config, const BlockHash &root, int height,
    const unsigned int invalid_rate, const unsigned int branch_rate,
    const unsigned int max_size,
    std::vector<std::shared_ptr<const CBlock>> &blocks) {
    if (height <= 0 || blocks.size() >= max_size) {
        return;
    }

    bool gen_invalid = InsecureRandRange(100) < invalid_rate;
    bool gen_fork = InsecureRandRange(100) < branch_rate;

    const std::shared_ptr<const CBlock> pblock =
        gen_invalid ? BadBlock(config, root) : GoodBlock(config, root);
    blocks.push_back(pblock);
    if (!gen_invalid) {
        BuildChain(config, pblock->GetHash(), height - 1, invalid_rate,
                   branch_rate, max_size, blocks);
    }

    if (gen_fork) {
        blocks.push_back(GoodBlock(config, root));
        BuildChain(config, blocks.back()->GetHash(), height - 1, invalid_rate,
                   branch_rate, max_size, blocks);
    }
}

BOOST_AUTO_TEST_CASE(processnewblock_signals_ordering) {
    GlobalConfig config;
    const CChainParams &chainParams = config.GetChainParams();

    // build a large-ish chain that's likely to have some forks
    std::vector<std::shared_ptr<const CBlock>> blocks;
    while (blocks.size() < 50) {
        blocks.clear();
        BuildChain(config, chainParams.GenesisBlock().GetHash(), 100, 15, 10,
                   500, blocks);
    }

    bool ignored;
    BlockValidationState state;
    std::vector<CBlockHeader> headers;
    std::transform(
        blocks.begin(), blocks.end(), std::back_inserter(headers),
        [](std::shared_ptr<const CBlock> b) { return b->GetBlockHeader(); });

    // Process all the headers so we understand the toplogy of the chain
    BOOST_CHECK(Assert(m_node.chainman)
                    ->ProcessNewBlockHeaders(config, headers, state));

    // Connect the genesis block and drain any outstanding events
    BOOST_CHECK(Assert(m_node.chainman)
                    ->ProcessNewBlock(
                        config,
                        std::make_shared<CBlock>(chainParams.GenesisBlock()),
                        true, &ignored));
    SyncWithValidationInterfaceQueue();

    // subscribe to events (this subscriber will validate event ordering)
    const CBlockIndex *initial_tip = nullptr;
    {
        LOCK(cs_main);
        initial_tip = ::ChainActive().Tip();
    }
    auto sub = std::make_shared<TestSubscriber>(initial_tip->GetBlockHash());
    RegisterSharedValidationInterface(sub);

    // create a bunch of threads that repeatedly process a block generated above
    // at random this will create parallelism and randomness inside validation -
    // the ValidationInterface will subscribe to events generated during block
    // validation and assert on ordering invariance
    std::vector<std::thread> threads;
    for (int i = 0; i < 10; i++) {
        threads.emplace_back([&]() {
            bool tlignored;
            FastRandomContext insecure;
            for (int j = 0; j < 1000; j++) {
                auto block = blocks[insecure.randrange(blocks.size() - 1)];
                Assert(m_node.chainman)
                    ->ProcessNewBlock(config, block, true, &tlignored);
            }

            // to make sure that eventually we process the full chain - do it
            // here
            for (auto block : blocks) {
                if (block->vtx.size() == 1) {
                    bool processed =
                        Assert(m_node.chainman)
                            ->ProcessNewBlock(config, block, true, &tlignored);
                    assert(processed);
                }
            }
        });
    }

    for (auto &t : threads) {
        t.join();
    }
    SyncWithValidationInterfaceQueue();

    UnregisterSharedValidationInterface(sub);

    LOCK(cs_main);
    BOOST_CHECK_EQUAL(sub->m_expected_tip,
                      ::ChainActive().Tip()->GetBlockHash());
}

/**
 * Test that mempool updates happen atomically with reorgs.
 *
 * This prevents RPC clients, among others, from retrieving
 * immediately-out-of-date mempool data during large reorgs.
 *
 * The test verifies this by creating a chain of `num_txs` blocks, matures their
 * coinbases, and then submits txns spending from their coinbase to the mempool.
 * A fork chain is then processed, invalidating the txns and evicting them from
 * the mempool.
 *
 * We verify that the mempool updates atomically by polling it continuously
 * from another thread during the reorg and checking that its size only changes
 * once. The size changing exactly once indicates that the polling thread's
 * view of the mempool is either consistent with the chain state before reorg,
 * or consistent with the chain state after the reorg, and not just consistent
 * with some intermediate state during the reorg.
 */
BOOST_AUTO_TEST_CASE(mempool_locks_reorg) {
    GlobalConfig config;
    const CChainParams &chainParams = config.GetChainParams();

    bool ignored;
    auto ProcessBlock = [&](std::shared_ptr<const CBlock> block) -> bool {
        return Assert(m_node.chainman)
            ->ProcessNewBlock(config, block, /* fForceProcessing */ true,
                              /* fNewBlock */ &ignored);
    };

    // Process all mined blocks
    BOOST_REQUIRE(
        ProcessBlock(std::make_shared<CBlock>(chainParams.GenesisBlock())));
    auto last_mined = GoodBlock(config, chainParams.GenesisBlock().GetHash());
    BOOST_REQUIRE(ProcessBlock(last_mined));

    // Run the test multiple times
    for (int test_runs = 3; test_runs > 0; --test_runs) {
        BOOST_CHECK_EQUAL(last_mined->GetHash(),
                          ::ChainActive().Tip()->GetBlockHash());

        // Later on split from here
        const BlockHash split_hash{last_mined->hashPrevBlock};

        // Create a bunch of transactions to spend the miner rewards of the
        // most recent blocks
        std::vector<CTransactionRef> txs;
        for (int num_txs = 22; num_txs > 0; --num_txs) {
            CMutableTransaction mtx;
            mtx.vin.push_back(
                CTxIn(COutPoint(last_mined->vtx[0]->GetId(), 1),
                      CScript() << ToByteVector(CScript() << OP_TRUE)));
            // Two outputs to make sure the transaction is larger than 100 bytes
            for (int i = 1; i < 3; ++i) {
                mtx.vout.emplace_back(
                    CTxOut(50000 * SATOSHI,
                           CScript() << OP_DUP << OP_HASH160
                                     << ToByteVector(CScriptID(CScript() << i))
                                     << OP_EQUALVERIFY << OP_CHECKSIG));
            }
            txs.push_back(MakeTransactionRef(mtx));
            last_mined = GoodBlock(config, last_mined->GetHash());
            BOOST_REQUIRE(ProcessBlock(last_mined));
        }

        // Mature the inputs of the txs
        for (int j = COINBASE_MATURITY; j > 0; --j) {
            last_mined = GoodBlock(config, last_mined->GetHash());
            BOOST_REQUIRE(ProcessBlock(last_mined));
        }

        // Mine a reorg (and hold it back) before adding the txs to the mempool
        const BlockHash tip_init{last_mined->GetHash()};

        std::vector<std::shared_ptr<const CBlock>> reorg;
        last_mined = GoodBlock(config, split_hash);
        reorg.push_back(last_mined);
        for (size_t j = COINBASE_MATURITY + txs.size() + 1; j > 0; --j) {
            last_mined = GoodBlock(config, last_mined->GetHash());
            reorg.push_back(last_mined);
        }

        // Add the txs to the tx pool
        {
            LOCK(cs_main);
            TxValidationState state;
            for (const auto &tx : txs) {
                BOOST_REQUIRE_MESSAGE(
                    AcceptToMemoryPool(config, *m_node.mempool, state, tx,
                                       /* bypass_limits */ false,
                                       /* nAbsurdFee */ Amount::zero()),
                    state.GetRejectReason());
            }
        }

        // Check that all txs are in the pool
        {
            LOCK(m_node.mempool->cs);
            BOOST_CHECK_EQUAL(m_node.mempool->mapTx.size(), txs.size());
        }

        // Run a thread that simulates an RPC caller that is polling while
        // validation is doing a reorg
        std::thread rpc_thread{[&]() {
            // This thread is checking that the mempool either contains all of
            // the transactions invalidated by the reorg, or none of them, and
            // not some intermediate amount.
            while (true) {
                LOCK(m_node.mempool->cs);
                if (m_node.mempool->mapTx.size() == 0) {
                    // We are done with the reorg
                    break;
                }
                // Internally, we might be in the middle of the reorg, but
                // externally the reorg to the most-proof-of-work chain should
                // be atomic. So the caller assumes that the returned mempool
                // is consistent. That is, it has all txs that were there
                // before the reorg.
                assert(m_node.mempool->mapTx.size() == txs.size());
                continue;
            }
            LOCK(cs_main);
            // We are done with the reorg, so the tip must have changed
            assert(tip_init != ::ChainActive().Tip()->GetBlockHash());
        }};

        // Make sure we disable reorg protection.
        gArgs.ForceSetArg("-parkdeepreorg", "false");

        // Submit the reorg in this thread to invalidate and remove the txs from
        // the tx pool
        for (const auto &b : reorg) {
            ProcessBlock(b);
        }
        // Check that the reorg was eventually successful
        BOOST_CHECK_EQUAL(last_mined->GetHash(),
                          ::ChainActive().Tip()->GetBlockHash());

        // We can join the other thread, which returns when the reorg was
        // successful
        rpc_thread.join();
    }
}
BOOST_AUTO_TEST_SUITE_END()
