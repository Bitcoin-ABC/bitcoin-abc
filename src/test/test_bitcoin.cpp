// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#define BOOST_TEST_MODULE Bitcoin Test Suite

#include "test_bitcoin.h"

#include "chainparams.h"
#include "config.h"
#include "consensus/consensus.h"
#include "consensus/validation.h"
#include "key.h"
#include "miner.h"
#include "net_processing.h"
#include "pubkey.h"
#include "random.h"
#include "rpc/register.h"
#include "rpc/server.h"
#include "script/scriptcache.h"
#include "script/sigcache.h"
#include "txdb.h"
#include "txmempool.h"
#include "ui_interface.h"
#include "validation.h"

#include "test/testutil.h"

#include <cstdio>
#include <iostream>

#include <atomic>
#include <chrono>
#include <condition_variable>
#include <functional>
#include <list>
#include <memory>
#include <thread>

#include <boost/filesystem.hpp>
#include <boost/test/unit_test.hpp>
#include <boost/thread.hpp>

std::unique_ptr<CConnman> g_connman;
uint256 insecure_rand_seed = GetRandHash();
FastRandomContext insecure_rand_ctx(insecure_rand_seed);

extern bool fPrintToConsole;
extern void noui_connect();

BasicTestingSetup::BasicTestingSetup(const std::string &chainName) {
    ECC_Start();
    SetupEnvironment();
    SetupNetworking();
    InitSignatureCache();
    InitScriptExecutionCache();
    // Don't want to write to debug.log file.
    fPrintToDebugLog = false;
    fCheckBlockIndex = true;
    SelectParams(chainName);
    noui_connect();

    // Set config parameters to default.
    GlobalConfig config;
    config.SetMaxBlockSize(DEFAULT_MAX_BLOCK_SIZE);
}

BasicTestingSetup::~BasicTestingSetup() {
    ECC_Stop();
    g_connman.reset();
}

TestingSetup::TestingSetup(const std::string &chainName)
    : BasicTestingSetup(chainName) {

    // Ideally we'd move all the RPC tests to the functional testing framework
    // instead of unit tests, but for now we need these here.
    const Config &config = GetConfig();
    RegisterAllRPCCommands(tableRPC);
    ClearDatadirCache();
    pathTemp = GetTempPath() / strprintf("test_bitcoin_%lu_%i",
                                         (unsigned long)GetTime(),
                                         (int)(GetRand(100000)));
    boost::filesystem::create_directories(pathTemp);
    ForceSetArg("-datadir", pathTemp.string());
    mempool.setSanityCheck(1.0);
    pblocktree = new CBlockTreeDB(1 << 20, true);
    pcoinsdbview = new CCoinsViewDB(1 << 23, true);
    pcoinsTip = new CCoinsViewCache(pcoinsdbview);
    InitBlockIndex(config);
    {
        CValidationState state;
        bool ok = ActivateBestChain(config, state);
        BOOST_CHECK(ok);
    }
    nScriptCheckThreads = 3;
    for (int i = 0; i < nScriptCheckThreads - 1; i++) {
        threadGroup.create_thread(&ThreadScriptCheck);
    }

    // Deterministic randomness for tests.
    g_connman = std::unique_ptr<CConnman>(new CConnman(config, 0x1337, 0x1337));
    connman = g_connman.get();
    RegisterNodeSignals(GetNodeSignals());
}

TestingSetup::~TestingSetup() {
    UnregisterNodeSignals(GetNodeSignals());
    threadGroup.interrupt_all();
    threadGroup.join_all();
    UnloadBlockIndex();
    delete pcoinsTip;
    delete pcoinsdbview;
    delete pblocktree;
    boost::filesystem::remove_all(pathTemp);
}

TestChain100Setup::TestChain100Setup()
    : TestingSetup(CBaseChainParams::REGTEST) {
    // Generate a 100-block chain:
    coinbaseKey.MakeNewKey(true);
    CScript scriptPubKey = CScript() << ToByteVector(coinbaseKey.GetPubKey())
                                     << OP_CHECKSIG;
    for (int i = 0; i < COINBASE_MATURITY; i++) {
        std::vector<CMutableTransaction> noTxns;
        CBlock b = CreateAndProcessBlock(noTxns, scriptPubKey);
        coinbaseTxns.push_back(*b.vtx[0]);
    }
}

//
// Create a new block with just given transactions, coinbase paying to
// scriptPubKey, and try to add it to the current chain.
//
CBlock TestChain100Setup::CreateAndProcessBlock(
    const std::vector<CMutableTransaction> &txns, const CScript &scriptPubKey) {
    const CChainParams &chainparams = Params();
    const Config &config = GetConfig();
    std::unique_ptr<CBlockTemplate> pblocktemplate =
        BlockAssembler(config, chainparams).CreateNewBlock(scriptPubKey);
    CBlock &block = pblocktemplate->block;

    // Replace mempool-selected txns with just coinbase plus passed-in txns:
    block.vtx.resize(1);
    for (const CMutableTransaction &tx : txns) {
        block.vtx.push_back(MakeTransactionRef(tx));
    }
    // IncrementExtraNonce creates a valid coinbase and merkleRoot
    unsigned int extraNonce = 0;
    IncrementExtraNonce(config, &block, chainActive.Tip(), extraNonce);

    while (!CheckProofOfWork(block.GetHash(), block.nBits,
                             chainparams.GetConsensus())) {
        ++block.nNonce;
    }

    std::shared_ptr<const CBlock> shared_pblock =
        std::make_shared<const CBlock>(block);
    ProcessNewBlock(GetConfig(), shared_pblock, true, nullptr);

    CBlock result = block;
    return result;
}

TestChain100Setup::~TestChain100Setup() {}

CTxMemPoolEntry TestMemPoolEntryHelper::FromTx(const CMutableTransaction &tx,
                                               CTxMemPool *pool) {
    CTransaction txn(tx);
    return FromTx(txn, pool);
}

CTxMemPoolEntry TestMemPoolEntryHelper::FromTx(const CTransaction &txn,
                                               CTxMemPool *pool) {
    // Hack to assume either it's completely dependent on other mempool txs or
    // not at all.
    Amount inChainValue =
        pool && pool->HasNoInputsOf(txn) ? txn.GetValueOut() : Amount(0);

    return CTxMemPoolEntry(MakeTransactionRef(txn), nFee, nTime, dPriority,
                           nHeight, inChainValue.GetSatoshis(), spendsCoinbase,
                           sigOpCost, lp);
}

void Shutdown(void *parg) {
    exit(0);
}

void StartShutdown() {
    exit(0);
}

bool ShutdownRequested() {
    return false;
}

namespace {
// A place to put misc. setup code eg "the travis workaround" that needs to run
// at program startup and exit
struct Init {
    Init();
    ~Init();

    std::list<std::function<void(void)>> cleanup;
};

Init init;

Init::Init() {

    if (getenv("TRAVIS_NOHANG_WORKAROUND")) {
        // This is a workaround for MinGW/Win32 builds on Travis sometimes
        // hanging due to no output received by Travis after a 10-minute
        // timeout.
        // The strategy here is to let the jobs finish however long they take
        // on Travis, by feeding Travis output.  We start a parallel thread
        // that just prints out '.' once per second.
        struct Private {
            Private() : stop(false) {}
            std::atomic_bool stop;
            std::thread thr;
            std::condition_variable cond;
            std::mutex mut;
        } *p = new Private;

        p->thr = std::thread([p] {
            // thread func.. print dots
            std::unique_lock<std::mutex> lock(p->mut);
            unsigned ctr = 0;
            while (!p->stop) {
                if (ctr) {
                    // skip first period to allow app to print first
                    std::cerr << "." << std::flush;
                }
                if (!(++ctr % 79)) {
                    // newline once in a while to keep travis happy
                    std::cerr << std::endl;
                }
                p->cond.wait_for(lock, std::chrono::milliseconds(1000));
            }
        });

        cleanup.emplace_back([p]() {
            // cleanup function to kill the thread and delete the struct
            p->mut.lock();
            p->stop = true;
            p->cond.notify_all();
            p->mut.unlock();
            if (p->thr.joinable()) {
                p->thr.join();
            }
            delete p;
        });
    }
}

Init::~Init() {
    for (auto &f : cleanup) {
        if (f) {
            f();
        }
    }
}
} // end anonymous namespace
