// Copyright (c) 2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <boost/test/unit_test.hpp>

#include <chain.h>
#include <chainparams.h>
#include <config.h>
#include <consensus/merkle.h>
#include <consensus/validation.h>
#include <miner.h>
#include <pow.h>
#include <random.h>
#include <test/test_bitcoin.h>
#include <util/time.h>
#include <validation.h>
#include <validationinterface.h>

struct RegtestingSetup : public TestingSetup {
    RegtestingSetup() : TestingSetup(CBaseChainParams::REGTEST) {}
};

BOOST_FIXTURE_TEST_SUITE(validation_block_tests, RegtestingSetup)

struct TestSubscriber : public CValidationInterface {
    uint256 m_expected_tip;

    TestSubscriber(uint256 tip) : m_expected_tip(tip) {}

    void UpdatedBlockTip(const CBlockIndex *pindexNew,
                         const CBlockIndex *pindexFork,
                         bool fInitialDownload) override {
        BOOST_CHECK_EQUAL(m_expected_tip, pindexNew->GetBlockHash());
    }

    void
    BlockConnected(const std::shared_ptr<const CBlock> &block,
                   const CBlockIndex *pindex,
                   const std::vector<CTransactionRef> &txnConflicted) override {
        BOOST_CHECK_EQUAL(m_expected_tip, block->hashPrevBlock);
        BOOST_CHECK_EQUAL(m_expected_tip, pindex->pprev->GetBlockHash());

        m_expected_tip = block->GetHash();
    }

    void
    BlockDisconnected(const std::shared_ptr<const CBlock> &block) override {
        BOOST_CHECK_EQUAL(m_expected_tip, block->GetHash());

        m_expected_tip = block->hashPrevBlock;
    }
};

std::shared_ptr<CBlock> Block(const Config &config,
                              const BlockHash &prev_hash) {
    static int i = 0;
    static uint64_t time = config.GetChainParams().GenesisBlock().nTime;

    CScript pubKey;
    pubKey << i++ << OP_TRUE;

    auto ptemplate = BlockAssembler(config, g_mempool).CreateNewBlock(pubKey);
    auto pblock = std::make_shared<CBlock>(ptemplate->block);
    pblock->hashPrevBlock = prev_hash;
    pblock->nTime = ++time;

    CMutableTransaction txCoinbase(*pblock->vtx[0]);
    txCoinbase.vout.resize(1);
    pblock->vtx[0] = MakeTransactionRef(std::move(txCoinbase));

    return pblock;
}

std::shared_ptr<CBlock> FinalizeBlock(const Consensus::Params &params,
                                      std::shared_ptr<CBlock> pblock) {
    pblock->hashMerkleRoot = BlockMerkleRoot(*pblock);

    while (!CheckProofOfWork(pblock->GetHash(), pblock->nBits, params)) {
        ++(pblock->nNonce);
    }

    return pblock;
}

// construct a valid block
const std::shared_ptr<const CBlock> GoodBlock(const Config &config,
                                              const BlockHash &prev_hash) {
    return FinalizeBlock(config.GetChainParams().GetConsensus(),
                         Block(config, prev_hash));
}

// construct an invalid block (but with a valid header)
const std::shared_ptr<const CBlock> BadBlock(const Config &config,
                                             const BlockHash &prev_hash) {
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

void BuildChain(const Config &config, const BlockHash &root, int height,
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
    CValidationState state;
    std::vector<CBlockHeader> headers;
    std::transform(
        blocks.begin(), blocks.end(), std::back_inserter(headers),
        [](std::shared_ptr<const CBlock> b) { return b->GetBlockHeader(); });

    // Process all the headers so we understand the toplogy of the chain
    BOOST_CHECK(ProcessNewBlockHeaders(config, headers, state));

    // Connect the genesis block and drain any outstanding events
    ProcessNewBlock(config,
                    std::make_shared<CBlock>(chainParams.GenesisBlock()), true,
                    &ignored);
    SyncWithValidationInterfaceQueue();

    // subscribe to events (this subscriber will validate event ordering)
    const CBlockIndex *initial_tip = nullptr;
    {
        LOCK(cs_main);
        initial_tip = ::ChainActive().Tip();
    }
    TestSubscriber sub(initial_tip->GetBlockHash());
    RegisterValidationInterface(&sub);

    // create a bunch of threads that repeatedly process a block generated above
    // at random this will create parallelism and randomness inside validation -
    // the ValidationInterface will subscribe to events generated during block
    // validation and assert on ordering invariance
    std::vector<std::thread> threads;
    for (int i = 0; i < 10; i++) {
        threads.emplace_back([&config, &blocks]() {
            bool tlignored;
            FastRandomContext insecure;
            for (int j = 0; j < 1000; j++) {
                auto block = blocks[insecure.randrange(blocks.size() - 1)];
                ProcessNewBlock(config, block, true, &tlignored);
            }

            // to make sure that eventually we process the full chain - do it
            // here
            for (auto block : blocks) {
                if (block->vtx.size() == 1) {
                    bool processed =
                        ProcessNewBlock(config, block, true, &tlignored);
                    assert(processed);
                }
            }
        });
    }

    for (auto &t : threads) {
        t.join();
    }
    while (GetMainSignals().CallbacksPending() > 0) {
        MilliSleep(100);
    }

    UnregisterValidationInterface(&sub);

    BOOST_CHECK_EQUAL(sub.m_expected_tip,
                      ::ChainActive().Tip()->GetBlockHash());
}

BOOST_AUTO_TEST_SUITE_END()
