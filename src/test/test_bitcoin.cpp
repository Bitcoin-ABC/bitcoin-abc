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
#include <script/script_error.h>
#include <script/scriptcache.h>
#include <script/sigcache.h>
#include <streams.h>
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

std::ostream &operator<<(std::ostream &os, const ScriptError &err) {
    os << ScriptErrorString(err);
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

    fCheckBlockIndex = true;
    SelectParams(chainName);
    static bool noui_connected = false;
    if (!noui_connected) {
        noui_connect();
        noui_connected = true;
    }
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
        IncrementExtraNonce(&block, ::ChainActive().Tip(),
                            config.GetMaxBlockSize(), extraNonce);
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

CTxMemPoolEntry TestMemPoolEntryHelper::FromTx(const CMutableTransaction &tx) {
    return FromTx(MakeTransactionRef(tx));
}

CTxMemPoolEntry TestMemPoolEntryHelper::FromTx(const CTransactionRef &tx) {
    return CTxMemPoolEntry(tx, nFee, nTime, nHeight, spendsCoinbase,
                           nSigOpCount, LockPoints());
}

/**
 * @returns a real block
 * (0000000000013b8ab2cd513b0261a14096412195a72a0c4827d229dcc7e0f7af) with 9
 * txs.
 */
CBlock getBlock13b8a() {
    CBlock block;
    CDataStream stream(
        ParseHex(
            "0100000090f0a9f110702f808219ebea1173056042a714bad51b916cb680000000"
            "0000005275289558f51c9966699404ae2294730c3c9f9bda53523ce50e9b95e558"
            "da2fdb261b4d4c86041b1ab1bf9309010000000100000000000000000000000000"
            "00000000000000000000000000000000000000ffffffff07044c86041b0146ffff"
            "ffff0100f2052a01000000434104e18f7afbe4721580e81e8414fc8c24d7cfacf2"
            "54bb5c7b949450c3e997c2dc1242487a8169507b631eb3771f2b425483fb13102c"
            "4eb5d858eef260fe70fbfae0ac00000000010000000196608ccbafa16abada9027"
            "80da4dc35dafd7af05fa0da08cf833575f8cf9e836000000004a493046022100da"
            "b24889213caf43ae6adc41cf1c9396c08240c199f5225acf45416330fd7dbd0221"
            "00fe37900e0644bf574493a07fc5edba06dbc07c311b947520c2d514bc5725dcb4"
            "01ffffffff0100f2052a010000001976a914f15d1921f52e4007b146dfa60f369e"
            "d2fc393ce288ac000000000100000001fb766c1288458c2bafcfec81e48b24d98e"
            "c706de6b8af7c4e3c29419bfacb56d000000008c493046022100f268ba165ce0ad"
            "2e6d93f089cfcd3785de5c963bb5ea6b8c1b23f1ce3e517b9f022100da7c0f21ad"
            "c6c401887f2bfd1922f11d76159cbc597fbd756a23dcbb00f4d7290141042b4e86"
            "25a96127826915a5b109852636ad0da753c9e1d5606a50480cd0c40f1f8b8d8982"
            "35e571fe9357d9ec842bc4bba1827daaf4de06d71844d0057707966affffffff02"
            "80969800000000001976a9146963907531db72d0ed1a0cfb471ccb63923446f388"
            "ac80d6e34c000000001976a914f0688ba1c0d1ce182c7af6741e02658c7d4dfcd3"
            "88ac000000000100000002c40297f730dd7b5a99567eb8d27b78758f607507c522"
            "92d02d4031895b52f2ff010000008b483045022100f7edfd4b0aac404e5bab4fd3"
            "889e0c6c41aa8d0e6fa122316f68eddd0a65013902205b09cc8b2d56e1cd1f7f2f"
            "afd60a129ed94504c4ac7bdc67b56fe67512658b3e014104732012cb962afa90d3"
            "1b25d8fb0e32c94e513ab7a17805c14ca4c3423e18b4fb5d0e676841733cb83aba"
            "f975845c9f6f2a8097b7d04f4908b18368d6fc2d68ecffffffffca5065ff9617cb"
            "cba45eb23726df6498a9b9cafed4f54cbab9d227b0035ddefb000000008a473044"
            "022068010362a13c7f9919fa832b2dee4e788f61f6f5d344a7c2a0da6ae7406056"
            "58022006d1af525b9a14a35c003b78b72bd59738cd676f845d1ff3fc25049e0100"
            "3614014104732012cb962afa90d31b25d8fb0e32c94e513ab7a17805c14ca4c342"
            "3e18b4fb5d0e676841733cb83abaf975845c9f6f2a8097b7d04f4908b18368d6fc"
            "2d68ecffffffff01001ec4110200000043410469ab4181eceb28985b9b4e895c13"
            "fa5e68d85761b7eee311db5addef76fa8621865134a221bd01f28ec9999ee3e021"
            "e60766e9d1f3458c115fb28650605f11c9ac000000000100000001cdaf2f758e91"
            "c514655e2dc50633d1e4c84989f8aa90a0dbc883f0d23ed5c2fa010000008b4830"
            "4502207ab51be6f12a1962ba0aaaf24a20e0b69b27a94fac5adf45aa7d2d18ffd9"
            "236102210086ae728b370e5329eead9accd880d0cb070aea0c96255fae6c4f1ddc"
            "ce1fd56e014104462e76fd4067b3a0aa42070082dcb0bf2f388b6495cf33d78990"
            "4f07d0f55c40fbd4b82963c69b3dc31895d0c772c812b1d5fbcade15312ef1c0e8"
            "ebbb12dcd4ffffffff02404b4c00000000001976a9142b6ba7c9d796b75eef7942"
            "fc9288edd37c32f5c388ac002d3101000000001976a9141befba0cdc1ad5652937"
            "1864d9f6cb042faa06b588ac000000000100000001b4a47603e71b61bc3326efd9"
            "0111bf02d2f549b067f4c4a8fa183b57a0f800cb010000008a4730440220177c37"
            "f9a505c3f1a1f0ce2da777c339bd8339ffa02c7cb41f0a5804f473c9230220585b"
            "25a2ee80eb59292e52b987dad92acb0c64eced92ed9ee105ad153cdb12d0014104"
            "43bd44f683467e549dae7d20d1d79cbdb6df985c6e9c029c8d0c6cb46cc1a4d3cf"
            "7923c5021b27f7a0b562ada113bc85d5fda5a1b41e87fe6e8802817cf69996ffff"
            "ffff0280651406000000001976a9145505614859643ab7b547cd7f1f5e7e2a1232"
            "2d3788ac00aa0271000000001976a914ea4720a7a52fc166c55ff2298e07baf70a"
            "e67e1b88ac00000000010000000586c62cd602d219bb60edb14a3e204de0705176"
            "f9022fe49a538054fb14abb49e010000008c493046022100f2bc2aba2534becbdf"
            "062eb993853a42bbbc282083d0daf9b4b585bd401aa8c9022100b1d7fd7ee0b956"
            "00db8535bbf331b19eed8d961f7a8e54159c53675d5f69df8c014104462e76fd40"
            "67b3a0aa42070082dcb0bf2f388b6495cf33d789904f07d0f55c40fbd4b82963c6"
            "9b3dc31895d0c772c812b1d5fbcade15312ef1c0e8ebbb12dcd4ffffffff03ad0e"
            "58ccdac3df9dc28a218bcf6f1997b0a93306faaa4b3a28ae83447b217901000000"
            "8b483045022100be12b2937179da88599e27bb31c3525097a07cdb52422d165b3c"
            "a2f2020ffcf702200971b51f853a53d644ebae9ec8f3512e442b1bcb6c315a5b49"
            "1d119d10624c83014104462e76fd4067b3a0aa42070082dcb0bf2f388b6495cf33"
            "d789904f07d0f55c40fbd4b82963c69b3dc31895d0c772c812b1d5fbcade15312e"
            "f1c0e8ebbb12dcd4ffffffff2acfcab629bbc8685792603762c921580030ba144a"
            "f553d271716a95089e107b010000008b483045022100fa579a840ac258871365dd"
            "48cd7552f96c8eea69bd00d84f05b283a0dab311e102207e3c0ee9234814cfbb1b"
            "659b83671618f45abc1326b9edcc77d552a4f2a805c0014104462e76fd4067b3a0"
            "aa42070082dcb0bf2f388b6495cf33d789904f07d0f55c40fbd4b82963c69b3dc3"
            "1895d0c772c812b1d5fbcade15312ef1c0e8ebbb12dcd4ffffffffdcdc6023bbc9"
            "944a658ddc588e61eacb737ddf0a3cd24f113b5a8634c517fcd2000000008b4830"
            "450221008d6df731df5d32267954bd7d2dda2302b74c6c2a6aa5c0ca64ecbabc1a"
            "f03c75022010e55c571d65da7701ae2da1956c442df81bbf076cdbac25133f99d9"
            "8a9ed34c014104462e76fd4067b3a0aa42070082dcb0bf2f388b6495cf33d78990"
            "4f07d0f55c40fbd4b82963c69b3dc31895d0c772c812b1d5fbcade15312ef1c0e8"
            "ebbb12dcd4ffffffffe15557cd5ce258f479dfd6dc6514edf6d7ed5b21fcfa4a03"
            "8fd69f06b83ac76e010000008b483045022023b3e0ab071eb11de2eb1cc3a67261"
            "b866f86bf6867d4558165f7c8c8aca2d86022100dc6e1f53a91de3efe8f6351285"
            "0811f26284b62f850c70ca73ed5de8771fb451014104462e76fd4067b3a0aa4207"
            "0082dcb0bf2f388b6495cf33d789904f07d0f55c40fbd4b82963c69b3dc31895d0"
            "c772c812b1d5fbcade15312ef1c0e8ebbb12dcd4ffffffff01404b4c0000000000"
            "1976a9142b6ba7c9d796b75eef7942fc9288edd37c32f5c388ac00000000010000"
            "000166d7577163c932b4f9690ca6a80b6e4eb001f0a2fa9023df5595602aae96ed"
            "8d000000008a4730440220262b42546302dfb654a229cefc86432b89628ff259dc"
            "87edd1154535b16a67e102207b4634c020a97c3e7bbd0d4d19da6aa2269ad9dded"
            "4026e896b213d73ca4b63f014104979b82d02226b3a4597523845754d44f13639e"
            "3bf2df5e82c6aab2bdc79687368b01b1ab8b19875ae3c90d661a3d0a33161dab29"
            "934edeb36aa01976be3baf8affffffff02404b4c00000000001976a9144854e695"
            "a02af0aeacb823ccbc272134561e0a1688ac40420f00000000001976a914abee93"
            "376d6b37b5c2940655a6fcaf1c8e74237988ac0000000001000000014e3f8ef2e9"
            "1349a9059cb4f01e54ab2597c1387161d3da89919f7ea6acdbb371010000008c49"
            "304602210081f3183471a5ca22307c0800226f3ef9c353069e0773ac76bb580654"
            "d56aa523022100d4c56465bdc069060846f4fbf2f6b20520b2a80b08b168b31e66"
            "ddb9c694e240014104976c79848e18251612f8940875b2b08d06e6dc73b9840e88"
            "60c066b7e87432c477e9a59a453e71e6d76d5fe34058b800a098fc1740ce3012e8"
            "fc8a00c96af966ffffffff02c0e1e400000000001976a9144134e75a6fcb604203"
            "4aab5e18570cf1f844f54788ac404b4c00000000001976a9142b6ba7c9d796b75e"
            "ef7942fc9288edd37c32f5c388ac00000000"),
        SER_NETWORK, PROTOCOL_VERSION);
    stream >> block;
    return block;
}
