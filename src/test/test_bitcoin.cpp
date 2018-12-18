// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <test/test_bitcoin.h>

#include <banman.h>
#include <chain.h>
#include <chainparams.h>
#include <config.h>
#include <consensus/consensus.h>
#include <consensus/validation.h>
#include <crypto/sha256.h>
#include <fs.h>
#include <key.h>
#include <logging.h>
#include <miner.h>
#include <net_processing.h>
#include <noui.h>
#include <pow.h>
#include <pubkey.h>
#include <random.h>
#include <rpc/register.h>
#include <rpc/server.h>
#include <script/scriptcache.h>
#include <script/sigcache.h>
#include <txdb.h>
#include <txmempool.h>
#include <ui_interface.h>
#include <validation.h>

#include <memory>

const std::function<std::string(const char *)> G_TRANSLATION_FUN = nullptr;

FastRandomContext g_insecure_rand_ctx;

std::ostream &operator<<(std::ostream &os, const uint256 &num) {
    os << num.ToString();
    return os;
}

BasicTestingSetup::BasicTestingSetup(const std::string &chainName)
    : m_path_root(fs::temp_directory_path() / "test_bitcoin" /
                  strprintf("%lu_%i", static_cast<unsigned long>(GetTime()),
                            int(InsecureRandRange(1 << 30)))) {
    SHA256AutoDetect();
    ECC_Start();
    SetupEnvironment();
    SetupNetworking();
    InitSignatureCache();
    InitScriptExecutionCache();

    // Don't want to write to debug.log file.
    GetLogger().m_print_to_file = false;

    fCheckBlockIndex = true;
    SelectParams(chainName);
    noui_connect();
}

BasicTestingSetup::~BasicTestingSetup() {
    fs::remove_all(m_path_root);
    ECC_Stop();
}

fs::path BasicTestingSetup::SetDataDir(const std::string &name) {
    fs::path ret = m_path_root / name;
    fs::create_directories(ret);
    gArgs.ForceSetArg("-datadir", ret.string());
    return ret;
}

TestingSetup::TestingSetup(const std::string &chainName)
    : BasicTestingSetup(chainName) {
    SetDataDir("tempdir");
    const Config &config = GetConfig();
    const CChainParams &chainparams = config.GetChainParams();

    // Ideally we'd move all the RPC tests to the functional testing framework
    // instead of unit tests, but for now we need these here.
    RPCServer rpcServer;
    RegisterAllRPCCommands(config, rpcServer, tableRPC);

    /**
     * RPC does not come out of the warmup state on its own. Normally, this is
     * handled in bitcoind's init path, but unit tests do not trigger this
     * codepath, so we call it explicitly as part of setup.
     */
    std::string rpcWarmupStatus;
    if (RPCIsInWarmup(&rpcWarmupStatus)) {
        SetRPCWarmupFinished();
    }

    ClearDatadirCache();

    // We have to run a scheduler thread to prevent ActivateBestChain
    // from blocking due to queue overrun.
    threadGroup.create_thread(std::bind(&CScheduler::serviceQueue, &scheduler));
    GetMainSignals().RegisterBackgroundSignalScheduler(scheduler);

    g_mempool.setSanityCheck(1.0);
    pblocktree.reset(new CBlockTreeDB(1 << 20, true));
    pcoinsdbview.reset(new CCoinsViewDB(1 << 23, true));
    pcoinsTip.reset(new CCoinsViewCache(pcoinsdbview.get()));
    if (!LoadGenesisBlock(chainparams)) {
        throw std::runtime_error("LoadGenesisBlock failed.");
    }
    {
        CValidationState state;
        if (!ActivateBestChain(config, state)) {
            throw std::runtime_error(strprintf("ActivateBestChain failed. (%s)",
                                               FormatStateMessage(state)));
        }
    }
    nScriptCheckThreads = 3;
    for (int i = 0; i < nScriptCheckThreads - 1; i++) {
        threadGroup.create_thread(&ThreadScriptCheck);
    }

    g_banman =
        std::make_unique<BanMan>(GetDataDir() / "banlist.dat", chainparams,
                                 nullptr, DEFAULT_MISBEHAVING_BANTIME);
    // Deterministic randomness for tests.
    g_connman = std::make_unique<CConnman>(config, 0x1337, 0x1337);
}

TestingSetup::~TestingSetup() {
    threadGroup.interrupt_all();
    threadGroup.join_all();
    GetMainSignals().FlushBackgroundCallbacks();
    GetMainSignals().UnregisterBackgroundSignalScheduler();
    g_connman.reset();
    g_banman.reset();
    UnloadBlockIndex();
    pcoinsTip.reset();
    pcoinsdbview.reset();
    pblocktree.reset();
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
        m_coinbase_txns.push_back(b.vtx[0]);
    }
}

//
// Create a new block with just given transactions, coinbase paying to
// scriptPubKey, and try to add it to the current chain.
//
CBlock TestChain100Setup::CreateAndProcessBlock(
    const std::vector<CMutableTransaction> &txns, const CScript &scriptPubKey) {
    const Config &config = GetConfig();
    std::unique_ptr<CBlockTemplate> pblocktemplate =
        BlockAssembler(config, g_mempool).CreateNewBlock(scriptPubKey);
    CBlock &block = pblocktemplate->block;

    // Replace mempool-selected txns with just coinbase plus passed-in txns:
    block.vtx.resize(1);
    for (const CMutableTransaction &tx : txns) {
        block.vtx.push_back(MakeTransactionRef(tx));
    }

    // Order transactions by canonical order
    std::sort(std::begin(block.vtx) + 1, std::end(block.vtx),
              [](const std::shared_ptr<const CTransaction> &txa,
                 const std::shared_ptr<const CTransaction> &txb) -> bool {
                  return txa->GetId() < txb->GetId();
              });

    // IncrementExtraNonce creates a valid coinbase and merkleRoot
    {
        LOCK(cs_main);
        unsigned int extraNonce = 0;
        IncrementExtraNonce(&block, chainActive.Tip(), config.GetMaxBlockSize(),
                            extraNonce);
    }

    const Consensus::Params &params = config.GetChainParams().GetConsensus();
    while (!CheckProofOfWork(block.GetHash(), block.nBits, params)) {
        ++block.nNonce;
    }

    std::shared_ptr<const CBlock> shared_pblock =
        std::make_shared<const CBlock>(block);
    ProcessNewBlock(config, shared_pblock, true, nullptr);

    CBlock result = block;
    return result;
}

TestChain100Setup::~TestChain100Setup() {}

CTxMemPoolEntry TestMemPoolEntryHelper::FromTx(const CMutableTransaction &tx,
                                               CTxMemPool *pool) {
    return FromTx(MakeTransactionRef(tx), pool);
}

CTxMemPoolEntry TestMemPoolEntryHelper::FromTx(const CTransactionRef &tx,
                                               CTxMemPool *pool) {
    // Hack to assume either it's completely dependent on other mempool txs or
    // not at all.
    Amount inChainValue =
        pool && pool->HasNoInputsOf(*tx) ? tx->GetValueOut() : Amount::zero();

    return CTxMemPoolEntry(tx, nFee, nTime, dPriority, nHeight, inChainValue,
                           spendsCoinbase, sigOpCost, lp);
}
