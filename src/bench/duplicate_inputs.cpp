// Copyright (c) 2011-2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <bench/bench.h>
#include <chain.h>
#include <chainparams.h>
#include <coins.h>
#include <config.h>
#include <consensus/merkle.h>
#include <consensus/validation.h>
#include <miner.h>
#include <policy/policy.h>
#include <pow.h>
#include <scheduler.h>
#include <script/scriptcache.h>
#include <txdb.h>
#include <txmempool.h>
#include <util/time.h>
#include <validation.h>
#include <validationinterface.h>

#include <boost/thread.hpp>

#include <list>
#include <vector>

static void DuplicateInputs(benchmark::State &state) {
    const CScript SCRIPT_PUB{CScript(OP_TRUE)};

    // Switch to regtest so we can mine faster
    SelectParams(CBaseChainParams::REGTEST);
    const Config &config = GetConfig();

    InitScriptExecutionCache();

    boost::thread_group thread_group;
    CScheduler scheduler;
    const CChainParams &chainparams = config.GetChainParams();
    {
        LOCK(cs_main);
        ::pblocktree.reset(new CBlockTreeDB(1 << 20, true));
        ::pcoinsdbview.reset(new CCoinsViewDB(1 << 23, true));
        ::pcoinsTip.reset(new CCoinsViewCache(pcoinsdbview.get()));
    }
    {
        thread_group.create_thread(
            std::bind(&CScheduler::serviceQueue, &scheduler));
        GetMainSignals().RegisterBackgroundSignalScheduler(scheduler);
        LoadGenesisBlock(chainparams);
        CValidationState cvstate;
        ActivateBestChain(config, cvstate);
        assert(::ChainActive().Tip() != nullptr);
    }

    CBlock block{};
    CMutableTransaction coinbaseTx{};
    CMutableTransaction naughtyTx{};

    CBlockIndex *pindexPrev = ::ChainActive().Tip();
    assert(pindexPrev != nullptr);
    block.nBits =
        GetNextWorkRequired(pindexPrev, &block, chainparams.GetConsensus());
    block.nNonce = 0;
    auto nHeight = pindexPrev->nHeight + 1;

    // Make a coinbase TX
    coinbaseTx.vin.resize(1);
    coinbaseTx.vin[0].prevout = COutPoint();
    coinbaseTx.vout.resize(1);
    coinbaseTx.vout[0].scriptPubKey = SCRIPT_PUB;
    coinbaseTx.vout[0].nValue =
        GetBlockSubsidy(nHeight, chainparams.GetConsensus());
    coinbaseTx.vin[0].scriptSig = CScript() << nHeight << OP_0;

    naughtyTx.vout.resize(1);
    naughtyTx.vout[0].nValue = Amount::zero();
    naughtyTx.vout[0].scriptPubKey = SCRIPT_PUB;

    uint64_t n_inputs =
        ((MAX_TX_SIZE - CTransaction(naughtyTx).GetTotalSize()) / 41) - 100;
    for (uint64_t x = 0; x < (n_inputs - 1); ++x) {
        naughtyTx.vin.emplace_back(TxId(GetRandHash()), 0, CScript(), 0);
    }
    naughtyTx.vin.emplace_back(naughtyTx.vin.back());

    block.vtx.push_back(MakeTransactionRef(std::move(coinbaseTx)));
    block.vtx.push_back(MakeTransactionRef(std::move(naughtyTx)));

    block.hashMerkleRoot = BlockMerkleRoot(block);

    while (state.KeepRunning()) {
        CValidationState cvstate{};
        assert(!CheckBlock(block, cvstate, chainparams.GetConsensus(),
                           BlockValidationOptions(config)
                               .withCheckPoW(false)
                               .withCheckMerkleRoot(false)));
        assert(cvstate.GetRejectReason() == "bad-txns-inputs-duplicate");
    }

    thread_group.interrupt_all();
    thread_group.join_all();
    GetMainSignals().FlushBackgroundCallbacks();
    GetMainSignals().UnregisterBackgroundSignalScheduler();
}

BENCHMARK(DuplicateInputs, 10);
