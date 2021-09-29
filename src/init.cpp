// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#if defined(HAVE_CONFIG_H)
#include <config/bitcoin-config.h>
#endif

#include <init.h>

#include <addrman.h>
#include <amount.h>
#include <avalanche/avalanche.h>
#include <avalanche/processor.h>
#include <avalanche/proof.h> // For AVALANCHE_LEGACY_PROOF_DEFAULT
#include <avalanche/validation.h>
#include <banman.h>
#include <blockdb.h>
#include <blockfilter.h>
#include <chain.h>
#include <chainparams.h>
#include <checkpoints.h>
#include <compat/sanity.h>
#include <config.h>
#include <consensus/validation.h>
#include <currencyunit.h>
#include <flatfile.h>
#include <fs.h>
#include <hash.h>
#include <httprpc.h>
#include <httpserver.h>
#include <index/blockfilterindex.h>
#include <index/txindex.h>
#include <interfaces/chain.h>
#include <interfaces/node.h>
#include <key.h>
#include <miner.h>
#include <net.h>
#include <net_permissions.h>
#include <net_processing.h>
#include <netbase.h>
#include <network.h>
#include <node/context.h>
#include <node/ui_interface.h>
#include <policy/mempool.h>
#include <policy/policy.h>
#include <policy/settings.h>
#include <rpc/blockchain.h>
#include <rpc/register.h>
#include <rpc/server.h>
#include <rpc/util.h>
#include <scheduler.h>
#include <script/scriptcache.h>
#include <script/sigcache.h>
#include <script/standard.h>
#include <shutdown.h>
#include <sync.h>
#include <timedata.h>
#include <torcontrol.h>
#include <txdb.h>
#include <txmempool.h>
#include <util/asmap.h>
#include <util/check.h>
#include <util/moneystr.h>
#include <util/string.h>
#include <util/threadnames.h>
#include <util/translation.h>
#include <validation.h>
#include <validationinterface.h>
#include <walletinitinterface.h>

#include <boost/algorithm/string/replace.hpp>
#include <boost/signals2/signal.hpp>
#include <boost/thread/thread.hpp>

#if ENABLE_ZMQ
#include <zmq/zmqabstractnotifier.h>
#include <zmq/zmqnotificationinterface.h>
#include <zmq/zmqrpc.h>
#endif

#ifndef WIN32
#include <attributes.h>
#include <cerrno>
#include <csignal>
#include <sys/stat.h>
#endif
#include <cstdint>
#include <cstdio>
#include <functional>
#include <set>

static const bool DEFAULT_PROXYRANDOMIZE = true;
static const bool DEFAULT_REST_ENABLE = false;
static const bool DEFAULT_STOPAFTERBLOCKIMPORT = false;

#ifdef WIN32
// Win32 LevelDB doesn't use filedescriptors, and the ones used for accessing
// block files don't count towards the fd_set size limit anyway.
#define MIN_CORE_FILEDESCRIPTORS 0
#else
#define MIN_CORE_FILEDESCRIPTORS 150
#endif

static const char *DEFAULT_ASMAP_FILENAME = "ip_asn.map";

/**
 * The PID file facilities.
 */
static const char *BITCOIN_PID_FILENAME = "bitcoind.pid";

static fs::path GetPidFile(const ArgsManager &args) {
    return AbsPathForConfigVal(
        fs::path(args.GetArg("-pid", BITCOIN_PID_FILENAME)));
}

NODISCARD static bool CreatePidFile(const ArgsManager &args) {
    fsbridge::ofstream file{GetPidFile(args)};
    if (file) {
#ifdef WIN32
        tfm::format(file, "%d\n", GetCurrentProcessId());
#else
        tfm::format(file, "%d\n", getpid());
#endif
        return true;
    } else {
        return InitError(strprintf(_("Unable to create the PID file '%s': %s"),
                                   GetPidFile(args).string(),
                                   std::strerror(errno)));
    }
}

//////////////////////////////////////////////////////////////////////////////
//
// Shutdown
//

//
// Thread management and startup/shutdown:
//
// The network-processing threads are all part of a thread group created by
// AppInit() or the Qt main() function.
//
// A clean exit happens when StartShutdown() or the SIGTERM signal handler sets
// fRequestShutdown, which makes main thread's WaitForShutdown() interrupts the
// thread group.
// And then, WaitForShutdown() makes all other on-going threads in the thread
// group join the main thread.
// Shutdown() is then called to clean up database connections, and stop other
// threads that should only be stopped after the main network-processing threads
// have exited.
//
// Shutdown for Qt is very similar, only it uses a QTimer to detect
// ShutdownRequested() getting set, and then does the normal Qt shutdown thing.
//

static std::unique_ptr<ECCVerifyHandle> globalVerifyHandle;

static std::thread g_load_block;

static boost::thread_group threadGroup;

void Interrupt(NodeContext &node) {
    InterruptHTTPServer();
    InterruptHTTPRPC();
    InterruptRPC();
    InterruptREST();
    InterruptTorControl();
    InterruptMapPort();
    if (g_avalanche) {
        // Avalanche needs to be stopped before we interrupt the thread group as
        // the scheduler will stop working then.
        g_avalanche->stopEventLoop();
    }
    if (node.connman) {
        node.connman->Interrupt();
    }
    if (g_txindex) {
        g_txindex->Interrupt();
    }
    ForEachBlockFilterIndex([](BlockFilterIndex &index) { index.Interrupt(); });
}

void Shutdown(NodeContext &node) {
    static Mutex g_shutdown_mutex;
    TRY_LOCK(g_shutdown_mutex, lock_shutdown);
    if (!lock_shutdown) {
        return;
    }
    LogPrintf("%s: In progress...\n", __func__);
    Assert(node.args);

    /// Note: Shutdown() must be able to handle cases in which initialization
    /// failed part of the way, for example if the data directory was found to
    /// be locked. Be sure that anything that writes files or flushes caches
    /// only does this if the respective module was initialized.
    util::ThreadRename("shutoff");
    if (node.mempool) {
        node.mempool->AddTransactionsUpdated(1);
    }

    StopHTTPRPC();
    StopREST();
    StopRPC();
    StopHTTPServer();
    for (const auto &client : node.chain_clients) {
        client->flush();
    }
    StopMapPort();

    // Because avalanche and the network depend on each other, it is important
    // to shut them down in this order:
    // 1. Stop avalanche event loop.
    // 2. Shutdown network processing.
    // 3. Destroy avalanche::Processor.
    // 4. Destroy CConnman
    if (g_avalanche) {
        g_avalanche->stopEventLoop();
    }

    // Because these depend on each-other, we make sure that neither can be
    // using the other before destroying them.
    if (node.peerman) {
        UnregisterValidationInterface(node.peerman.get());
    }
    // Follow the lock order requirements:
    // * CheckForStaleTipAndEvictPeers locks cs_main before indirectly calling
    //   GetExtraOutboundCount which locks cs_vNodes.
    // * ProcessMessage locks cs_main and g_cs_orphans before indirectly calling
    //   ForEachNode which locks cs_vNodes.
    // * CConnman::Stop calls DeleteNode, which calls FinalizeNode, which locks
    //   cs_main and calls EraseOrphansFor, which locks g_cs_orphans.
    //
    // Thus the implicit locking order requirement is:
    // (1) cs_main, (2) g_cs_orphans, (3) cs_vNodes.
    if (node.connman) {
        node.connman->StopThreads();
        LOCK2(::cs_main, ::g_cs_orphans);
        node.connman->StopNodes();
    }

    StopTorControl();

    // After everything has been shut down, but before things get flushed, stop
    // the CScheduler/checkqueue, threadGroup and load block thread.
    if (node.scheduler) {
        node.scheduler->stop();
    }
    if (g_load_block.joinable()) {
        g_load_block.join();
    }
    threadGroup.interrupt_all();
    threadGroup.join_all();

    // After the threads that potentially access these pointers have been
    // stopped, destruct and reset all to nullptr.
    node.peerman.reset();

    // Destroy various global instances
    g_avalanche.reset();
    node.connman.reset();
    node.banman.reset();

    if (node.mempool && node.mempool->IsLoaded() &&
        node.args->GetArg("-persistmempool", DEFAULT_PERSIST_MEMPOOL)) {
        DumpMempool(*node.mempool);
    }

    // FlushStateToDisk generates a ChainStateFlushed callback, which we should
    // avoid missing
    if (node.chainman) {
        LOCK(cs_main);
        for (CChainState *chainstate : node.chainman->GetAll()) {
            if (chainstate->CanFlushToDisk()) {
                chainstate->ForceFlushStateToDisk();
            }
        }
    }

    // After there are no more peers/RPC left to give us new data which may
    // generate CValidationInterface callbacks, flush them...
    GetMainSignals().FlushBackgroundCallbacks();

    // Stop and delete all indexes only after flushing background callbacks.
    if (g_txindex) {
        g_txindex->Stop();
        g_txindex.reset();
    }
    ForEachBlockFilterIndex([](BlockFilterIndex &index) { index.Stop(); });
    DestroyAllBlockFilterIndexes();

    // Any future callbacks will be dropped. This should absolutely be safe - if
    // missing a callback results in an unrecoverable situation, unclean
    // shutdown would too. The only reason to do the above flushes is to let the
    // wallet catch up with our current chain to avoid any strange pruning edge
    // cases and make next startup faster by avoiding rescan.

    if (node.chainman) {
        LOCK(cs_main);
        for (CChainState *chainstate : node.chainman->GetAll()) {
            if (chainstate->CanFlushToDisk()) {
                chainstate->ForceFlushStateToDisk();
                chainstate->ResetCoinsViews();
            }
        }
        pblocktree.reset();
    }
    for (const auto &client : node.chain_clients) {
        client->stop();
    }

#if ENABLE_ZMQ
    if (g_zmq_notification_interface) {
        UnregisterValidationInterface(g_zmq_notification_interface);
        delete g_zmq_notification_interface;
        g_zmq_notification_interface = nullptr;
    }
#endif

    node.chain_clients.clear();
    UnregisterAllValidationInterfaces();
    GetMainSignals().UnregisterBackgroundSignalScheduler();
    globalVerifyHandle.reset();
    ECC_Stop();
    node.mempool.reset();
    node.chainman = nullptr;
    node.scheduler.reset();

    try {
        if (!fs::remove(GetPidFile(*node.args))) {
            LogPrintf("%s: Unable to remove PID file: File does not exist\n",
                      __func__);
        }
    } catch (const fs::filesystem_error &e) {
        LogPrintf("%s: Unable to remove PID file: %s\n", __func__,
                  fsbridge::get_filesystem_error_message(e));
    }

    node.args = nullptr;
    LogPrintf("%s: done\n", __func__);
}

/**
 * Signal handlers are very limited in what they are allowed to do.
 * The execution context the handler is invoked in is not guaranteed,
 * so we restrict handler operations to just touching variables:
 */
#ifndef WIN32
static void HandleSIGTERM(int) {
    StartShutdown();
}

static void HandleSIGHUP(int) {
    LogInstance().m_reopen_file = true;
}
#else
static BOOL WINAPI consoleCtrlHandler(DWORD dwCtrlType) {
    StartShutdown();
    Sleep(INFINITE);
    return true;
}
#endif

#ifndef WIN32
static void registerSignalHandler(int signal, void (*handler)(int)) {
    struct sigaction sa;
    sa.sa_handler = handler;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = 0;
    sigaction(signal, &sa, NULL);
}
#endif

static boost::signals2::connection rpc_notify_block_change_connection;
static void OnRPCStarted() {
    rpc_notify_block_change_connection = uiInterface.NotifyBlockTip_connect(
        std::bind(RPCNotifyBlockChange, std::placeholders::_2));
}

static void OnRPCStopped() {
    rpc_notify_block_change_connection.disconnect();
    RPCNotifyBlockChange(nullptr);
    g_best_block_cv.notify_all();
    LogPrint(BCLog::RPC, "RPC stopped.\n");
}

void SetupServerArgs(NodeContext &node) {
    assert(!node.args);
    node.args = &gArgs;
    ArgsManager &argsman = *node.args;

    SetupHelpOptions(argsman);
    SetupCurrencyUnitOptions(argsman);
    // server-only for now
    argsman.AddArg("-help-debug",
                   "Print help message with debugging options and exit", false,
                   OptionsCategory::DEBUG_TEST);

    const auto defaultBaseParams =
        CreateBaseChainParams(CBaseChainParams::MAIN);
    const auto testnetBaseParams =
        CreateBaseChainParams(CBaseChainParams::TESTNET);
    const auto regtestBaseParams =
        CreateBaseChainParams(CBaseChainParams::REGTEST);
    const auto defaultChainParams = CreateChainParams(CBaseChainParams::MAIN);
    const auto testnetChainParams =
        CreateChainParams(CBaseChainParams::TESTNET);
    const auto regtestChainParams =
        CreateChainParams(CBaseChainParams::REGTEST);

    // Hidden Options
    std::vector<std::string> hidden_args = {
        "-dbcrashratio", "-forcecompactdb", "-parkdeepreorg",
        "-automaticunparking", "-replayprotectionactivationtime",
        "-enableminerfund",
        // GUI args. These will be overwritten by SetupUIArgs for the GUI
        "-allowselfsignedrootcertificates", "-choosedatadir", "-lang=<lang>",
        "-min", "-resetguisettings", "-rootcertificates=<file>", "-splash",
        "-uiplatform",
        // TODO remove after the November 2020 upgrade
        "-axionactivationtime"};

    // Set all of the args and their help
    // When adding new options to the categories, please keep and ensure
    // alphabetical ordering. Do not translate _(...) -help-debug options, Many
    // technical terms, and only a very small audience, so is unnecessary stress
    // to translators.
    argsman.AddArg("-version", "Print version and exit", ArgsManager::ALLOW_ANY,
                   OptionsCategory::OPTIONS);
#if defined(HAVE_SYSTEM)
    argsman.AddArg(
        "-alertnotify=<cmd>",
        "Execute command when a relevant alert is received or we see "
        "a really long fork (%s in cmd is replaced by message)",
        ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
#endif
    argsman.AddArg(
        "-assumevalid=<hex>",
        strprintf(
            "If this block is in the chain assume that it and its ancestors "
            "are valid and potentially skip their script verification (0 to "
            "verify all, default: %s, testnet: %s)",
            defaultChainParams->GetConsensus().defaultAssumeValid.GetHex(),
            testnetChainParams->GetConsensus().defaultAssumeValid.GetHex()),
        ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsman.AddArg("-blocksdir=<dir>",
                   "Specify directory to hold blocks subdirectory for *.dat "
                   "files (default: <datadir>)",
                   ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
#if defined(HAVE_SYSTEM)
    argsman.AddArg("-blocknotify=<cmd>",
                   "Execute command when the best block changes (%s in cmd is "
                   "replaced by block hash)",
                   ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
#endif
    argsman.AddArg("-blockreconstructionextratxn=<n>",
                   strprintf("Extra transactions to keep in memory for compact "
                             "block reconstructions (default: %u)",
                             DEFAULT_BLOCK_RECONSTRUCTION_EXTRA_TXN),
                   ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsman.AddArg(
        "-blocksonly",
        strprintf("Whether to reject transactions from network peers.  "
                  "Automatic broadcast and rebroadcast of any transactions "
                  "from inbound peers is disabled, unless the peer has the "
                  "'forcerelay' permission. RPC transactions are"
                  " not affected. (default: %u)",
                  DEFAULT_BLOCKSONLY),
        ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsman.AddArg(
        "-conf=<file>",
        strprintf("Specify path to read-only configuration file. Relative "
                  "paths will be prefixed by datadir location. (default: %s)",
                  BITCOIN_CONF_FILENAME),
        ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsman.AddArg("-datadir=<dir>", "Specify data directory",
                   ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsman.AddArg(
        "-dbbatchsize",
        strprintf("Maximum database write batch size in bytes (default: %u)",
                  DEFAULT_DB_BATCH_SIZE),
        ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
        OptionsCategory::OPTIONS);
    argsman.AddArg(
        "-dbcache=<n>",
        strprintf("Set database cache size in MiB (%d to %d, default: %d)",
                  MIN_DB_CACHE_MB, MAX_DB_CACHE_MB, DEFAULT_DB_CACHE_MB),
        ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsman.AddArg(
        "-debuglogfile=<file>",
        strprintf("Specify location of debug log file. Relative paths "
                  "will be prefixed by a net-specific datadir "
                  "location. (0 to disable; default: %s)",
                  DEFAULT_DEBUGLOGFILE),
        ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsman.AddArg("-feefilter",
                   strprintf("Tell other nodes to filter invs to us by our "
                             "mempool min fee (default: %d)",
                             DEFAULT_FEEFILTER),
                   ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
                   OptionsCategory::OPTIONS);
    argsman.AddArg(
        "-finalizationdelay=<n>",
        strprintf("Set the minimum amount of time to wait between a "
                  "block header reception and the block finalization. "
                  "Unit is seconds (default: %d)",
                  DEFAULT_MIN_FINALIZATION_DELAY),
        ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsman.AddArg(
        "-includeconf=<file>",
        "Specify additional configuration file, relative to the -datadir path "
        "(only useable from configuration file, not command line)",
        ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsman.AddArg("-maxreorgdepth=<n>",
                   strprintf("Configure at what depth blocks are considered "
                             "final (default: %d). Use -1 to disable.",
                             DEFAULT_MAX_REORG_DEPTH),
                   ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsman.AddArg("-loadblock=<file>",
                   "Imports blocks from external file on startup",
                   ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsman.AddArg("-maxmempool=<n>",
                   strprintf("Keep the transaction memory pool below <n> "
                             "megabytes (default: %u)",
                             DEFAULT_MAX_MEMPOOL_SIZE),
                   ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsman.AddArg("-maxorphantx=<n>",
                   strprintf("Keep at most <n> unconnectable transactions in "
                             "memory (default: %u)",
                             DEFAULT_MAX_ORPHAN_TRANSACTIONS),
                   ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsman.AddArg("-mempoolexpiry=<n>",
                   strprintf("Do not keep transactions in the mempool longer "
                             "than <n> hours (default: %u)",
                             DEFAULT_MEMPOOL_EXPIRY),
                   ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsman.AddArg(
        "-minimumchainwork=<hex>",
        strprintf(
            "Minimum work assumed to exist on a valid chain in hex "
            "(default: %s, testnet: %s)",
            defaultChainParams->GetConsensus().nMinimumChainWork.GetHex(),
            testnetChainParams->GetConsensus().nMinimumChainWork.GetHex()),
        ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
        OptionsCategory::OPTIONS);
    argsman.AddArg(
        "-par=<n>",
        strprintf("Set the number of script verification threads (%u to %d, 0 "
                  "= auto, <0 = leave that many cores free, default: %d)",
                  -GetNumCores(), MAX_SCRIPTCHECK_THREADS,
                  DEFAULT_SCRIPTCHECK_THREADS),
        ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsman.AddArg("-persistmempool",
                   strprintf("Whether to save the mempool on shutdown and load "
                             "on restart (default: %u)",
                             DEFAULT_PERSIST_MEMPOOL),
                   ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsman.AddArg(
        "-pid=<file>",
        strprintf("Specify pid file. Relative paths will be prefixed "
                  "by a net-specific datadir location. (default: %s)",
                  BITCOIN_PID_FILENAME),
        ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsman.AddArg(
        "-prune=<n>",
        strprintf("Reduce storage requirements by enabling pruning (deleting) "
                  "of old blocks. This allows the pruneblockchain RPC to be "
                  "called to delete specific blocks, and enables automatic "
                  "pruning of old blocks if a target size in MiB is provided. "
                  "This mode is incompatible with -txindex and -rescan. "
                  "Warning: Reverting this setting requires re-downloading the "
                  "entire blockchain. (default: 0 = disable pruning blocks, 1 "
                  "= allow manual pruning via RPC, >=%u = automatically prune "
                  "block files to stay under the specified target size in MiB)",
                  MIN_DISK_SPACE_FOR_BLOCK_FILES / 1024 / 1024),
        ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsman.AddArg(
        "-reindex-chainstate",
        "Rebuild chain state from the currently indexed blocks. When "
        "in pruning mode or if blocks on disk might be corrupted, use "
        "full -reindex instead.",
        ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsman.AddArg(
        "-reindex",
        "Rebuild chain state and block index from the blk*.dat files on disk",
        ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsman.AddArg(
        "-settings=<file>",
        strprintf(
            "Specify path to dynamic settings data file. Can be disabled with "
            "-nosettings. File is written at runtime and not meant to be "
            "edited by users (use %s instead for custom settings). Relative "
            "paths will be prefixed by datadir location. (default: %s)",
            BITCOIN_CONF_FILENAME, BITCOIN_SETTINGS_FILENAME),
        ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
#ifndef WIN32
    argsman.AddArg(
        "-sysperms",
        "Create new files with system default permissions, instead of umask "
        "077 (only effective with disabled wallet functionality)",
        ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
#else
    hidden_args.emplace_back("-sysperms");
#endif
    argsman.AddArg("-txindex",
                   strprintf("Maintain a full transaction index, used by the "
                             "getrawtransaction rpc call (default: %d)",
                             DEFAULT_TXINDEX),
                   ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsman.AddArg(
        "-blockfilterindex=<type>",
        strprintf("Maintain an index of compact filters by block "
                  "(default: %s, values: %s).",
                  DEFAULT_BLOCKFILTERINDEX, ListBlockFilterTypes()) +
            " If <type> is not supplied or if <type> = 1, indexes for "
            "all known types are enabled.",
        ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsman.AddArg(
        "-usecashaddr",
        "Use Cash Address for destination encoding instead of base58 "
        "(activate by default on Jan, 14)",
        ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);

    argsman.AddArg(
        "-addnode=<ip>",
        "Add a node to connect to and attempt to keep the connection "
        "open (see the `addnode` RPC command help for more info)",
        ArgsManager::ALLOW_ANY | ArgsManager::NETWORK_ONLY,
        OptionsCategory::CONNECTION);
    argsman.AddArg("-asmap=<file>",
                   strprintf("Specify asn mapping used for bucketing of the "
                             "peers (default: %s). Relative paths will be "
                             "prefixed by the net-specific datadir location.",
                             DEFAULT_ASMAP_FILENAME),
                   ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsman.AddArg("-bantime=<n>",
                   strprintf("Default duration (in seconds) of manually "
                             "configured bans (default: %u)",
                             DEFAULT_MISBEHAVING_BANTIME),
                   ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsman.AddArg("-bind=<addr>",
                   "Bind to given address and always listen on it. Use "
                   "[host]:port notation for IPv6",
                   ArgsManager::ALLOW_ANY | ArgsManager::NETWORK_ONLY,
                   OptionsCategory::CONNECTION);
    argsman.AddArg(
        "-connect=<ip>",
        "Connect only to the specified node(s); -connect=0 disables automatic "
        "connections (the rules for this peer are the same as for -addnode)",
        ArgsManager::ALLOW_ANY | ArgsManager::NETWORK_ONLY,
        OptionsCategory::CONNECTION);
    argsman.AddArg(
        "-discover",
        "Discover own IP addresses (default: 1 when listening and no "
        "-externalip or -proxy)",
        ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsman.AddArg("-dns",
                   strprintf("Allow DNS lookups for -addnode, -seednode and "
                             "-connect (default: %d)",
                             DEFAULT_NAME_LOOKUP),
                   ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsman.AddArg(
        "-dnsseed",
        "Query for peer addresses via DNS lookup, if low on addresses "
        "(default: 1 unless -connect used)",
        ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);

    argsman.AddArg("-externalip=<ip>", "Specify your own public address",
                   ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsman.AddArg(
        "-forcednsseed",
        strprintf(
            "Always query for peer addresses via DNS lookup (default: %d)",
            DEFAULT_FORCEDNSSEED),
        ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsman.AddArg("-overridednsseed",
                   "If set, only use the specified DNS seed when "
                   "querying for peer addresses via DNS lookup.",
                   ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsman.AddArg(
        "-listen",
        "Accept connections from outside (default: 1 if no -proxy or -connect)",
        ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsman.AddArg(
        "-listenonion",
        strprintf("Automatically create Tor onion service (default: %d)",
                  DEFAULT_LISTEN_ONION),
        ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsman.AddArg(
        "-maxconnections=<n>",
        strprintf("Maintain at most <n> connections to peers. The effective "
                  "limit depends on system limitations and might be lower than "
                  "the specified value (default: %u)",
                  DEFAULT_MAX_PEER_CONNECTIONS),
        ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsman.AddArg("-maxreceivebuffer=<n>",
                   strprintf("Maximum per-connection receive buffer, <n>*1000 "
                             "bytes (default: %u)",
                             DEFAULT_MAXRECEIVEBUFFER),
                   ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsman.AddArg(
        "-maxsendbuffer=<n>",
        strprintf(
            "Maximum per-connection send buffer, <n>*1000 bytes (default: %u)",
            DEFAULT_MAXSENDBUFFER),
        ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsman.AddArg(
        "-maxtimeadjustment",
        strprintf("Maximum allowed median peer time offset adjustment. Local "
                  "perspective of time may be influenced by peers forward or "
                  "backward by this amount. (default: %u seconds)",
                  DEFAULT_MAX_TIME_ADJUSTMENT),
        ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsman.AddArg("-onion=<ip:port>",
                   strprintf("Use separate SOCKS5 proxy to reach peers via Tor "
                             "onion services (default: %s)",
                             "-proxy"),
                   ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsman.AddArg(
        "-onlynet=<net>",
        "Make outgoing connections only through network <net> (ipv4, ipv6 or "
        "onion). Incoming connections are not affected by this option. This "
        "option can be specified multiple times to allow multiple networks.",
        ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsman.AddArg("-peerbloomfilters",
                   strprintf("Support filtering of blocks and transaction with "
                             "bloom filters (default: %d)",
                             DEFAULT_PEERBLOOMFILTERS),
                   ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsman.AddArg(
        "-peerblockfilters",
        strprintf(
            "Serve compact block filters to peers per BIP 157 (default: %u)",
            DEFAULT_PEERBLOCKFILTERS),
        ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsman.AddArg("-permitbaremultisig",
                   strprintf("Relay non-P2SH multisig (default: %d)",
                             DEFAULT_PERMIT_BAREMULTISIG),
                   ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsman.AddArg("-port=<port>",
                   strprintf("Listen for connections on <port> (default: %u, "
                             "testnet: %u, regtest: %u)",
                             defaultChainParams->GetDefaultPort(),
                             testnetChainParams->GetDefaultPort(),
                             regtestChainParams->GetDefaultPort()),
                   ArgsManager::ALLOW_ANY | ArgsManager::NETWORK_ONLY,
                   OptionsCategory::CONNECTION);
    argsman.AddArg("-proxy=<ip:port>", "Connect through SOCKS5 proxy",
                   ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsman.AddArg(
        "-proxyrandomize",
        strprintf("Randomize credentials for every proxy connection. "
                  "This enables Tor stream isolation (default: %d)",
                  DEFAULT_PROXYRANDOMIZE),
        ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsman.AddArg(
        "-seednode=<ip>",
        "Connect to a node to retrieve peer addresses, and disconnect",
        ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    gArgs.AddArg("-networkactive",
                 "Enable all P2P network activity (default: 1). Can be changed "
                 "by the setnetworkactive RPC command",
                 ArgsManager::ALLOW_BOOL, OptionsCategory::CONNECTION);
    argsman.AddArg("-timeout=<n>",
                   strprintf("Specify connection timeout in milliseconds "
                             "(minimum: 1, default: %d)",
                             DEFAULT_CONNECT_TIMEOUT),
                   ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsman.AddArg(
        "-peertimeout=<n>",
        strprintf("Specify p2p connection timeout in seconds. This option "
                  "determines the amount of time a peer may be inactive before "
                  "the connection to it is dropped. (minimum: 1, default: %d)",
                  DEFAULT_PEER_CONNECT_TIMEOUT),
        true, OptionsCategory::CONNECTION);
    argsman.AddArg(
        "-torcontrol=<ip>:<port>",
        strprintf(
            "Tor control port to use if onion listening enabled (default: %s)",
            DEFAULT_TOR_CONTROL),
        ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsman.AddArg("-torpassword=<pass>",
                   "Tor control port password (default: empty)",
                   ArgsManager::ALLOW_ANY | ArgsManager::SENSITIVE,
                   OptionsCategory::CONNECTION);
#ifdef USE_UPNP
#if USE_UPNP
    argsman.AddArg("-upnp",
                   "Use UPnP to map the listening port (default: 1 when "
                   "listening and no -proxy)",
                   ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
#else
    argsman.AddArg(
        "-upnp",
        strprintf("Use UPnP to map the listening port (default: %u)", 0),
        ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
#endif
#else
    hidden_args.emplace_back("-upnp");
#endif
    argsman.AddArg(
        "-whitebind=<[permissions@]addr>",
        "Bind to the given address and add permission flags to the peers "
        "connecting to it."
        "Use [host]:port notation for IPv6. Allowed permissions: " +
            Join(NET_PERMISSIONS_DOC, ", ") +
            ". "
            "Specify multiple permissions separated by commas (default: "
            "download,noban,mempool,relay). Can be specified multiple times.",
        ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);

    argsman.AddArg("-whitelist=<[permissions@]IP address or network>",
                   "Add permission flags to the peers connecting from the "
                   "given IP address (e.g. 1.2.3.4) or CIDR-notated network "
                   "(e.g. 1.2.3.0/24). "
                   "Uses the same permissions as -whitebind. Can be specified "
                   "multiple times.",
                   ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsman.AddArg(
        "-maxuploadtarget=<n>",
        strprintf("Tries to keep outbound traffic under the given target (in "
                  "MiB per 24h). Limit does not apply to peers with 'download' "
                  "permission. 0 = no limit (default: %d)",
                  DEFAULT_MAX_UPLOAD_TARGET),
        ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);

    g_wallet_init_interface.AddWalletOptions(argsman);

#if ENABLE_ZMQ
    argsman.AddArg("-zmqpubhashblock=<address>",
                   "Enable publish hash block in <address>",
                   ArgsManager::ALLOW_ANY, OptionsCategory::ZMQ);
    argsman.AddArg("-zmqpubhashtx=<address>",
                   "Enable publish hash transaction in <address>",
                   ArgsManager::ALLOW_ANY, OptionsCategory::ZMQ);
    argsman.AddArg("-zmqpubrawblock=<address>",
                   "Enable publish raw block in <address>",
                   ArgsManager::ALLOW_ANY, OptionsCategory::ZMQ);
    argsman.AddArg("-zmqpubrawtx=<address>",
                   "Enable publish raw transaction in <address>",
                   ArgsManager::ALLOW_ANY, OptionsCategory::ZMQ);
    argsman.AddArg(
        "-zmqpubhashblockhwm=<n>",
        strprintf("Set publish hash block outbound message high water "
                  "mark (default: %d)",
                  CZMQAbstractNotifier::DEFAULT_ZMQ_SNDHWM),
        false, OptionsCategory::ZMQ);
    argsman.AddArg(
        "-zmqpubhashtxhwm=<n>",
        strprintf("Set publish hash transaction outbound message high "
                  "water mark (default: %d)",
                  CZMQAbstractNotifier::DEFAULT_ZMQ_SNDHWM),
        false, OptionsCategory::ZMQ);
    argsman.AddArg(
        "-zmqpubrawblockhwm=<n>",
        strprintf("Set publish raw block outbound message high water "
                  "mark (default: %d)",
                  CZMQAbstractNotifier::DEFAULT_ZMQ_SNDHWM),
        false, OptionsCategory::ZMQ);
    argsman.AddArg(
        "-zmqpubrawtxhwm=<n>",
        strprintf("Set publish raw transaction outbound message high "
                  "water mark (default: %d)",
                  CZMQAbstractNotifier::DEFAULT_ZMQ_SNDHWM),
        false, OptionsCategory::ZMQ);
#else
    hidden_args.emplace_back("-zmqpubhashblock=<address>");
    hidden_args.emplace_back("-zmqpubhashtx=<address>");
    hidden_args.emplace_back("-zmqpubrawblock=<address>");
    hidden_args.emplace_back("-zmqpubrawtx=<address>");
    hidden_args.emplace_back("-zmqpubhashblockhwm=<n>");
    hidden_args.emplace_back("-zmqpubhashtxhwm=<n>");
    hidden_args.emplace_back("-zmqpubrawblockhwm=<n>");
    hidden_args.emplace_back("-zmqpubrawtxhwm=<n>");
#endif

    argsman.AddArg(
        "-checkblocks=<n>",
        strprintf("How many blocks to check at startup (default: %u, 0 = all)",
                  DEFAULT_CHECKBLOCKS),
        ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
        OptionsCategory::DEBUG_TEST);
    argsman.AddArg("-checklevel=<n>",
                   strprintf("How thorough the block verification of "
                             "-checkblocks is: %s (0-4, default: %u)",
                             Join(CHECKLEVEL_DOC, ", "), DEFAULT_CHECKLEVEL),
                   ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
                   OptionsCategory::DEBUG_TEST);
    argsman.AddArg("-checkblockindex",
                   strprintf("Do a consistency check for the block tree, "
                             "chainstate, and other validation data structures "
                             "occasionally. (default: %u, regtest: %u)",
                             defaultChainParams->DefaultConsistencyChecks(),
                             regtestChainParams->DefaultConsistencyChecks()),
                   ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
                   OptionsCategory::DEBUG_TEST);
    argsman.AddArg(
        "-checkmempool=<n>",
        strprintf(
            "Run checks every <n> transactions (default: %u, regtest: %u)",
            defaultChainParams->DefaultConsistencyChecks(),
            regtestChainParams->DefaultConsistencyChecks()),
        ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
        OptionsCategory::DEBUG_TEST);
    argsman.AddArg("-checkpoints",
                   strprintf("Only accept block chain matching built-in "
                             "checkpoints (default: %d)",
                             DEFAULT_CHECKPOINTS_ENABLED),
                   ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
                   OptionsCategory::DEBUG_TEST);
    argsman.AddArg("-deprecatedrpc=<method>",
                   "Allows deprecated RPC method(s) to be used",
                   ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
                   OptionsCategory::DEBUG_TEST);
    argsman.AddArg("-dropmessagestest=<n>",
                   "Randomly drop 1 of every <n> network messages",
                   ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
                   OptionsCategory::DEBUG_TEST);
    argsman.AddArg(
        "-stopafterblockimport",
        strprintf("Stop running after importing blocks from disk (default: %d)",
                  DEFAULT_STOPAFTERBLOCKIMPORT),
        ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
        OptionsCategory::DEBUG_TEST);
    argsman.AddArg("-stopatheight",
                   strprintf("Stop running after reaching the given height in "
                             "the main chain (default: %u)",
                             DEFAULT_STOPATHEIGHT),
                   ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
                   OptionsCategory::DEBUG_TEST);
    argsman.AddArg(
        "-limitancestorcount=<n>",
        strprintf("Do not accept transactions if number of in-mempool "
                  "ancestors is <n> or more (default: %u)",
                  DEFAULT_ANCESTOR_LIMIT),
        ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
        OptionsCategory::DEBUG_TEST);
    argsman.AddArg(
        "-limitancestorsize=<n>",
        strprintf("Do not accept transactions whose size with all in-mempool "
                  "ancestors exceeds <n> kilobytes (default: %u)",
                  DEFAULT_ANCESTOR_SIZE_LIMIT),
        ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
        OptionsCategory::DEBUG_TEST);
    argsman.AddArg(
        "-limitdescendantcount=<n>",
        strprintf("Do not accept transactions if any ancestor would have <n> "
                  "or more in-mempool descendants (default: %u)",
                  DEFAULT_DESCENDANT_LIMIT),
        ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
        OptionsCategory::DEBUG_TEST);
    argsman.AddArg(
        "-limitdescendantsize=<n>",
        strprintf("Do not accept transactions if any ancestor would have more "
                  "than <n> kilobytes of in-mempool descendants (default: %u).",
                  DEFAULT_DESCENDANT_SIZE_LIMIT),
        ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
        OptionsCategory::DEBUG_TEST);
    argsman.AddArg("-addrmantest", "Allows to test address relay on localhost",
                   ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
                   OptionsCategory::DEBUG_TEST);

    argsman.AddArg("-debug=<category>",
                   strprintf("Output debugging information (default: %u, "
                             "supplying <category> is optional)",
                             0) +
                       ". " +
                       "If <category> is not supplied or if <category> = 1, "
                       "output all debugging information. <category> can be: " +
                       LogInstance().LogCategoriesString() + ".",
                   ArgsManager::ALLOW_ANY, OptionsCategory::DEBUG_TEST);
    argsman.AddArg(
        "-debugexclude=<category>",
        strprintf("Exclude debugging information for a category. Can be used "
                  "in conjunction with -debug=1 to output debug logs for all "
                  "categories except one or more specified categories."),
        ArgsManager::ALLOW_ANY, OptionsCategory::DEBUG_TEST);
    argsman.AddArg(
        "-logips",
        strprintf("Include IP addresses in debug output (default: %d)",
                  DEFAULT_LOGIPS),
        ArgsManager::ALLOW_ANY, OptionsCategory::DEBUG_TEST);
    argsman.AddArg(
        "-logtimestamps",
        strprintf("Prepend debug output with timestamp (default: %d)",
                  DEFAULT_LOGTIMESTAMPS),
        ArgsManager::ALLOW_ANY, OptionsCategory::DEBUG_TEST);
#ifdef HAVE_THREAD_LOCAL
    argsman.AddArg(
        "-logthreadnames",
        strprintf(
            "Prepend debug output with name of the originating thread (only "
            "available on platforms supporting thread_local) (default: %u)",
            DEFAULT_LOGTHREADNAMES),
        ArgsManager::ALLOW_ANY, OptionsCategory::DEBUG_TEST);
#else
    hidden_args.emplace_back("-logthreadnames");
#endif
    argsman.AddArg(
        "-logtimemicros",
        strprintf("Add microsecond precision to debug timestamps (default: %d)",
                  DEFAULT_LOGTIMEMICROS),
        ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
        OptionsCategory::DEBUG_TEST);
    argsman.AddArg("-mocktime=<n>",
                   "Replace actual time with " + UNIX_EPOCH_TIME +
                       " (default: 0)",
                   ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
                   OptionsCategory::DEBUG_TEST);
    argsman.AddArg(
        "-maxsigcachesize=<n>",
        strprintf("Limit size of signature cache to <n> MiB (default: %u)",
                  DEFAULT_MAX_SIG_CACHE_SIZE),
        ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
        OptionsCategory::DEBUG_TEST);
    argsman.AddArg(
        "-maxscriptcachesize=<n>",
        strprintf("Limit size of script cache to <n> MiB (default: %u)",
                  DEFAULT_MAX_SCRIPT_CACHE_SIZE),
        ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
        OptionsCategory::DEBUG_TEST);
    argsman.AddArg("-maxtipage=<n>",
                   strprintf("Maximum tip age in seconds to consider node in "
                             "initial block download (default: %u)",
                             DEFAULT_MAX_TIP_AGE),
                   ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
                   OptionsCategory::DEBUG_TEST);

    argsman.AddArg(
        "-printtoconsole",
        "Send trace/debug info to console instead of debug.log file (default: "
        "1 when no -daemon. To disable logging to file, set debuglogfile=0)",
        ArgsManager::ALLOW_ANY, OptionsCategory::DEBUG_TEST);
    argsman.AddArg("-printpriority",
                   strprintf("Log transaction priority and fee per kB when "
                             "mining blocks (default: %d)",
                             DEFAULT_PRINTPRIORITY),
                   ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
                   OptionsCategory::DEBUG_TEST);
    argsman.AddArg(
        "-shrinkdebugfile",
        "Shrink debug.log file on client startup (default: 1 when no -debug)",
        ArgsManager::ALLOW_ANY, OptionsCategory::DEBUG_TEST);

    argsman.AddArg("-uacomment=<cmt>",
                   "Append comment to the user agent string",
                   ArgsManager::ALLOW_ANY, OptionsCategory::DEBUG_TEST);
    argsman.AddArg("-uaclientname=<clientname>", "Set user agent client name",
                   ArgsManager::ALLOW_ANY, OptionsCategory::DEBUG_TEST);
    argsman.AddArg("-uaclientversion=<clientversion>",
                   "Set user agent client version", ArgsManager::ALLOW_ANY,
                   OptionsCategory::DEBUG_TEST);

    SetupChainParamsBaseOptions(argsman);

    argsman.AddArg(
        "-acceptnonstdtxn",
        strprintf(
            "Relay and mine \"non-standard\" transactions (%sdefault: %u)",
            "testnet/regtest only; ", defaultChainParams->RequireStandard()),
        ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
        OptionsCategory::NODE_RELAY);
    argsman.AddArg("-excessiveblocksize=<n>",
                   strprintf("Do not accept blocks larger than this limit, in "
                             "bytes (default: %d)",
                             DEFAULT_MAX_BLOCK_SIZE),
                   ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
                   OptionsCategory::NODE_RELAY);
    const auto &ticker = Currency::get().ticker;
    argsman.AddArg(
        "-dustrelayfee=<amt>",
        strprintf("Fee rate (in %s/kB) used to define dust, the value of an "
                  "output such that it will cost about 1/3 of its value in "
                  "fees at this fee rate to spend it. (default: %s)",
                  ticker, FormatMoney(DUST_RELAY_TX_FEE)),
        ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
        OptionsCategory::NODE_RELAY);

    argsman.AddArg("-bytespersigop",
                   strprintf("Equivalent bytes per sigop in transactions for "
                             "relay and mining (default: %u)",
                             DEFAULT_BYTES_PER_SIGOP),
                   ArgsManager::ALLOW_ANY, OptionsCategory::NODE_RELAY);
    argsman.AddArg(
        "-datacarrier",
        strprintf("Relay and mine data carrier transactions (default: %d)",
                  DEFAULT_ACCEPT_DATACARRIER),
        ArgsManager::ALLOW_ANY, OptionsCategory::NODE_RELAY);
    argsman.AddArg(
        "-datacarriersize",
        strprintf("Maximum size of data in data carrier transactions "
                  "we relay and mine (default: %u)",
                  MAX_OP_RETURN_RELAY),
        ArgsManager::ALLOW_ANY, OptionsCategory::NODE_RELAY);
    argsman.AddArg(
        "-minrelaytxfee=<amt>",
        strprintf("Fees (in %s/kB) smaller than this are rejected for "
                  "relaying, mining and transaction creation (default: %s)",
                  ticker, FormatMoney(DEFAULT_MIN_RELAY_TX_FEE_PER_KB)),
        ArgsManager::ALLOW_ANY, OptionsCategory::NODE_RELAY);
    argsman.AddArg(
        "-whitelistrelay",
        strprintf("Add 'relay' permission to whitelisted inbound peers "
                  "with default permissions. This will accept relayed "
                  "transactions even when not relaying transactions "
                  "(default: %d)",
                  DEFAULT_WHITELISTRELAY),
        ArgsManager::ALLOW_ANY, OptionsCategory::NODE_RELAY);
    argsman.AddArg(
        "-whitelistforcerelay",
        strprintf("Add 'forcerelay' permission to whitelisted inbound peers"
                  " with default permissions. This will relay transactions "
                  "even if the transactions were already in the mempool "
                  "(default: %d)",
                  DEFAULT_WHITELISTFORCERELAY),
        ArgsManager::ALLOW_ANY, OptionsCategory::NODE_RELAY);

    // Not sure this really belongs here, but it will do for now.
    // FIXME: This doesn't work anyways.
    argsman.AddArg("-excessutxocharge=<amt>",
                   strprintf("Fees (in %s/kB) to charge per utxo created for "
                             "relaying, and mining (default: %s)",
                             ticker, FormatMoney(DEFAULT_UTXO_FEE)),
                   ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
                   OptionsCategory::NODE_RELAY);

    argsman.AddArg("-blockmaxsize=<n>",
                   strprintf("Set maximum block size in bytes (default: %d)",
                             DEFAULT_MAX_GENERATED_BLOCK_SIZE),
                   ArgsManager::ALLOW_ANY, OptionsCategory::BLOCK_CREATION);
    argsman.AddArg(
        "-blockmintxfee=<amt>",
        strprintf("Set lowest fee rate (in %s/kB) for transactions to "
                  "be included in block creation. (default: %s)",
                  ticker, FormatMoney(DEFAULT_BLOCK_MIN_TX_FEE_PER_KB)),
        ArgsManager::ALLOW_ANY, OptionsCategory::BLOCK_CREATION);

    argsman.AddArg("-blockversion=<n>",
                   "Override block version to test forking scenarios",
                   ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
                   OptionsCategory::BLOCK_CREATION);

    argsman.AddArg("-server", "Accept command line and JSON-RPC commands",
                   ArgsManager::ALLOW_ANY, OptionsCategory::RPC);
    argsman.AddArg("-rest",
                   strprintf("Accept public REST requests (default: %d)",
                             DEFAULT_REST_ENABLE),
                   ArgsManager::ALLOW_ANY, OptionsCategory::RPC);
    argsman.AddArg(
        "-rpcbind=<addr>[:port]",
        "Bind to given address to listen for JSON-RPC connections. Do not "
        "expose the RPC server to untrusted networks such as the public "
        "internet! This option is ignored unless -rpcallowip is also passed. "
        "Port is optional and overrides -rpcport.  Use [host]:port notation "
        "for IPv6. This option can be specified multiple times (default: "
        "127.0.0.1 and ::1 i.e., localhost)",
        ArgsManager::ALLOW_ANY | ArgsManager::NETWORK_ONLY |
            ArgsManager::SENSITIVE,
        OptionsCategory::RPC);
    argsman.AddArg(
        "-rpccookiefile=<loc>",
        "Location of the auth cookie. Relative paths will be prefixed "
        "by a net-specific datadir location. (default: data dir)",
        ArgsManager::ALLOW_ANY, OptionsCategory::RPC);
    argsman.AddArg("-rpcuser=<user>", "Username for JSON-RPC connections",
                   ArgsManager::ALLOW_ANY | ArgsManager::SENSITIVE,
                   OptionsCategory::RPC);
    argsman.AddArg("-rpcpassword=<pw>", "Password for JSON-RPC connections",
                   ArgsManager::ALLOW_ANY | ArgsManager::SENSITIVE,
                   OptionsCategory::RPC);
    argsman.AddArg(
        "-rpcwhitelist=<whitelist>",
        "Set a whitelist to filter incoming RPC calls for a specific user. The "
        "field <whitelist> comes in the format: <USERNAME>:<rpc 1>,<rpc "
        "2>,...,<rpc n>. If multiple whitelists are set for a given user, they "
        "are set-intersected. See -rpcwhitelistdefault documentation for "
        "information on default whitelist behavior.",
        ArgsManager::ALLOW_ANY, OptionsCategory::RPC);
    argsman.AddArg(
        "-rpcwhitelistdefault",
        "Sets default behavior for rpc whitelisting. Unless "
        "rpcwhitelistdefault is set to 0, if any -rpcwhitelist is set, the rpc "
        "server acts as if all rpc users are subject to "
        "empty-unless-otherwise-specified whitelists. If rpcwhitelistdefault "
        "is set to 1 and no -rpcwhitelist is set, rpc server acts as if all "
        "rpc users are subject to empty whitelists.",
        ArgsManager::ALLOW_BOOL, OptionsCategory::RPC);
    argsman.AddArg(
        "-rpcauth=<userpw>",
        "Username and HMAC-SHA-256 hashed password for JSON-RPC connections. "
        "The field <userpw> comes in the format: <USERNAME>:<SALT>$<HASH>. A "
        "canonical python script is included in share/rpcauth. The client then "
        "connects normally using the rpcuser=<USERNAME>/rpcpassword=<PASSWORD> "
        "pair of arguments. This option can be specified multiple times",
        ArgsManager::ALLOW_ANY | ArgsManager::SENSITIVE, OptionsCategory::RPC);
    argsman.AddArg("-rpcport=<port>",
                   strprintf("Listen for JSON-RPC connections on <port> "
                             "(default: %u, testnet: %u, regtest: %u)",
                             defaultBaseParams->RPCPort(),
                             testnetBaseParams->RPCPort(),
                             regtestBaseParams->RPCPort()),
                   ArgsManager::ALLOW_ANY | ArgsManager::NETWORK_ONLY,
                   OptionsCategory::RPC);
    argsman.AddArg(
        "-rpcallowip=<ip>",
        "Allow JSON-RPC connections from specified source. Valid for "
        "<ip> are a single IP (e.g. 1.2.3.4), a network/netmask (e.g. "
        "1.2.3.4/255.255.255.0) or a network/CIDR (e.g. 1.2.3.4/24). "
        "This option can be specified multiple times",
        ArgsManager::ALLOW_ANY, OptionsCategory::RPC);
    argsman.AddArg(
        "-rpcthreads=<n>",
        strprintf(
            "Set the number of threads to service RPC calls (default: %d)",
            DEFAULT_HTTP_THREADS),
        ArgsManager::ALLOW_ANY, OptionsCategory::RPC);
    argsman.AddArg(
        "-rpccorsdomain=value",
        "Domain from which to accept cross origin requests (browser enforced)",
        ArgsManager::ALLOW_ANY, OptionsCategory::RPC);

    argsman.AddArg("-rpcworkqueue=<n>",
                   strprintf("Set the depth of the work queue to service RPC "
                             "calls (default: %d)",
                             DEFAULT_HTTP_WORKQUEUE),
                   ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
                   OptionsCategory::RPC);
    argsman.AddArg("-rpcservertimeout=<n>",
                   strprintf("Timeout during HTTP requests (default: %d)",
                             DEFAULT_HTTP_SERVER_TIMEOUT),
                   ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
                   OptionsCategory::RPC);

#if HAVE_DECL_DAEMON
    argsman.AddArg("-daemon",
                   "Run in the background as a daemon and accept commands",
                   ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
#else
    hidden_args.emplace_back("-daemon");
#endif

    // Avalanche options.
    argsman.AddArg(
        "-enableavalanche",
        strprintf("Enable avalanche (default: %u)", AVALANCHE_DEFAULT_ENABLED),
        ArgsManager::ALLOW_ANY, OptionsCategory::AVALANCHE);
    argsman.AddArg("-enableavalanchepeerdiscovery",
                   strprintf("Enable avalanche peer discovery (default: %u)",
                             AVALANCHE_DEFAULT_PEER_DISCOVERY_ENABLED),
                   ArgsManager::ALLOW_ANY, OptionsCategory::AVALANCHE);
    argsman.AddArg(
        "-avacooldown",
        strprintf("Mandatory cooldown between two avapoll (default: %u)",
                  AVALANCHE_DEFAULT_COOLDOWN),
        ArgsManager::ALLOW_ANY, OptionsCategory::AVALANCHE);
    argsman.AddArg(
        "-avadelegation",
        "Avalanche proof delegation to the master key used by this node "
        "(default: none). Should be used in conjunction with -avaproof and "
        "-avamasterkey",
        ArgsManager::ALLOW_ANY, OptionsCategory::AVALANCHE);
    argsman.AddArg("-avaproof",
                   "Avalanche proof to be used by this node (default: none)",
                   ArgsManager::ALLOW_ANY, OptionsCategory::AVALANCHE);
    argsman.AddArg(
        "-legacyavaproof",
        strprintf("Use the legacy avalanche proof format (default: %u)",
                  AVALANCHE_DEFAULT_LEGACY_PROOF),
        ArgsManager::ALLOW_BOOL, OptionsCategory::AVALANCHE);
    argsman.AddArg("-avamasterkey",
                   "Master key associated with the proof. If a proof is "
                   "required, this is mandatory.",
                   ArgsManager::ALLOW_ANY, OptionsCategory::AVALANCHE);
    argsman.AddArg("-avasessionkey", "Avalanche session key (default: random)",
                   ArgsManager::ALLOW_ANY, OptionsCategory::AVALANCHE);

    // Add the hidden options
    argsman.AddHiddenArgs(hidden_args);
}

std::string LicenseInfo() {
    const std::string URL_SOURCE_CODE =
        "<https://github.com/Bitcoin-ABC/bitcoin-abc>";
    const std::string URL_WEBSITE = "<https://www.bitcoinabc.org>";

    return CopyrightHolders(strprintf(_("Copyright (C) %i-%i").translated, 2009,
                                      COPYRIGHT_YEAR) +
                            " ") +
           "\n" + "\n" +
           strprintf(_("Please contribute if you find %s useful. "
                       "Visit %s for further information about the software.")
                         .translated,
                     PACKAGE_NAME, URL_WEBSITE) +
           "\n" +
           strprintf(_("The source code is available from %s.").translated,
                     URL_SOURCE_CODE) +
           "\n" + "\n" + _("This is experimental software.").translated + "\n" +
           strprintf(_("Distributed under the MIT software license, see the "
                       "accompanying file %s or %s")
                         .translated,
                     "COPYING", "<https://opensource.org/licenses/MIT>") +
           "\n" + "\n" +
           strprintf(_("This product includes software developed by the "
                       "OpenSSL Project for use in the OpenSSL Toolkit %s and "
                       "cryptographic software written by Eric Young and UPnP "
                       "software written by Thomas Bernard.")
                         .translated,
                     "<https://www.openssl.org>") +
           "\n";
}

static bool fHaveGenesis = false;
static Mutex g_genesis_wait_mutex;
static std::condition_variable g_genesis_wait_cv;

static void BlockNotifyGenesisWait(const CBlockIndex *pBlockIndex) {
    if (pBlockIndex != nullptr) {
        {
            LOCK(g_genesis_wait_mutex);
            fHaveGenesis = true;
        }
        g_genesis_wait_cv.notify_all();
    }
}

struct CImportingNow {
    CImportingNow() {
        assert(fImporting == false);
        fImporting = true;
    }

    ~CImportingNow() {
        assert(fImporting == true);
        fImporting = false;
    }
};

// If we're using -prune with -reindex, then delete block files that will be
// ignored by the reindex.  Since reindexing works by starting at block file 0
// and looping until a blockfile is missing, do the same here to delete any
// later block files after a gap. Also delete all rev files since they'll be
// rewritten by the reindex anyway. This ensures that vinfoBlockFile is in sync
// with what's actually on disk by the time we start downloading, so that
// pruning works correctly.
static void CleanupBlockRevFiles() {
    std::map<std::string, fs::path> mapBlockFiles;

    // Glob all blk?????.dat and rev?????.dat files from the blocks directory.
    // Remove the rev files immediately and insert the blk file paths into an
    // ordered map keyed by block file index.
    LogPrintf("Removing unusable blk?????.dat and rev?????.dat files for "
              "-reindex with -prune\n");
    const auto directoryIterator = fs::directory_iterator{GetBlocksDir()};
    for (const auto &file : directoryIterator) {
        const auto fileName = file.path().filename().string();
        if (fs::is_regular_file(file) && fileName.length() == 12 &&
            fileName.substr(8, 4) == ".dat") {
            if (fileName.substr(0, 3) == "blk") {
                mapBlockFiles[fileName.substr(3, 5)] = file.path();
            } else if (fileName.substr(0, 3) == "rev") {
                remove(file.path());
            }
        }
    }

    // Remove all block files that aren't part of a contiguous set starting at
    // zero by walking the ordered map (keys are block file indices) by keeping
    // a separate counter. Once we hit a gap (or if 0 doesn't exist) start
    // removing block files.
    int contiguousCounter = 0;
    for (const auto &item : mapBlockFiles) {
        if (atoi(item.first) == contiguousCounter) {
            contiguousCounter++;
            continue;
        }
        remove(item.second);
    }
}

static void ThreadImport(const Config &config, ChainstateManager &chainman,
                         std::vector<fs::path> vImportFiles,
                         const ArgsManager &args) {
    ScheduleBatchPriority();

    {
        const CChainParams &chainParams = config.GetChainParams();

        CImportingNow imp;

        // -reindex
        if (fReindex) {
            int nFile = 0;
            while (true) {
                FlatFilePos pos(nFile, 0);
                if (!fs::exists(GetBlockPosFilename(pos))) {
                    // No block files left to reindex
                    break;
                }
                FILE *file = OpenBlockFile(pos, true);
                if (!file) {
                    // This error is logged in OpenBlockFile
                    break;
                }
                LogPrintf("Reindexing block file blk%05u.dat...\n",
                          (unsigned int)nFile);
                LoadExternalBlockFile(config, file, &pos);
                if (ShutdownRequested()) {
                    LogPrintf("Shutdown requested. Exit %s\n", __func__);
                    return;
                }
                nFile++;
            }
            pblocktree->WriteReindexing(false);
            fReindex = false;
            LogPrintf("Reindexing finished\n");
            // To avoid ending up in a situation without genesis block, re-try
            // initializing (no-op if reindexing worked):
            LoadGenesisBlock(chainParams);
        }

        // -loadblock=
        for (const fs::path &path : vImportFiles) {
            FILE *file = fsbridge::fopen(path, "rb");
            if (file) {
                LogPrintf("Importing blocks file %s...\n", path.string());
                LoadExternalBlockFile(config, file);
                if (ShutdownRequested()) {
                    LogPrintf("Shutdown requested. Exit %s\n", __func__);
                    return;
                }
            } else {
                LogPrintf("Warning: Could not open blocks file %s\n",
                          path.string());
            }
        }

        // Reconsider blocks we know are valid. They may have been marked
        // invalid by, for instance, running an outdated version of the node
        // software.
        const MapCheckpoints &checkpoints =
            chainParams.Checkpoints().mapCheckpoints;
        for (const MapCheckpoints::value_type &i : checkpoints) {
            const BlockHash &hash = i.second;

            LOCK(cs_main);
            CBlockIndex *pblockindex = LookupBlockIndex(hash);
            if (pblockindex && !pblockindex->nStatus.isValid()) {
                LogPrintf("Reconsidering checkpointed block %s ...\n",
                          hash.GetHex());
                ResetBlockFailureFlags(pblockindex);
            }
        }

        // scan for better chains in the block chain database, that are not yet
        // connected in the active best chain

        // We can't hold cs_main during ActivateBestChain even though we're
        // accessing the chainman unique_ptrs since ABC requires us not to be
        // holding cs_main, so retrieve the relevant pointers before the ABC
        // call.
        for (CChainState *chainstate :
             WITH_LOCK(::cs_main, return chainman.GetAll())) {
            BlockValidationState state;
            if (!chainstate->ActivateBestChain(config, state, nullptr)) {
                LogPrintf("Failed to connect best block (%s)\n",
                          state.ToString());
                StartShutdown();
                return;
            }
        }

        if (args.GetBoolArg("-stopafterblockimport",
                            DEFAULT_STOPAFTERBLOCKIMPORT)) {
            LogPrintf("Stopping after block import\n");
            StartShutdown();
            return;
        }
    } // End scope of CImportingNow
    chainman.ActiveChainstate().LoadMempool(config, args);
}

/** Sanity checks
 *  Ensure that Bitcoin is running in a usable environment with all
 *  necessary library support.
 */
static bool InitSanityCheck() {
    if (!ECC_InitSanityCheck()) {
        return InitError(Untranslated(
            "Elliptic curve cryptography sanity check failure. Aborting."));
    }

    if (!glibcxx_sanity_test()) {
        return false;
    }

    if (!Random_SanityCheck()) {
        return InitError(Untranslated(
            "OS cryptographic RNG sanity check failure. Aborting."));
    }

    return true;
}

static bool AppInitServers(Config &config,
                           HTTPRPCRequestProcessor &httpRPCRequestProcessor,
                           NodeContext &node) {
    const ArgsManager &args = *Assert(node.args);
    RPCServerSignals::OnStarted(&OnRPCStarted);
    RPCServerSignals::OnStopped(&OnRPCStopped);
    if (!InitHTTPServer(config)) {
        return false;
    }

    StartRPC();
    node.rpc_interruption_point = RpcInterruptionPoint;

    if (!StartHTTPRPC(httpRPCRequestProcessor)) {
        return false;
    }
    if (args.GetBoolArg("-rest", DEFAULT_REST_ENABLE)) {
        StartREST(httpRPCRequestProcessor.context);
    }

    StartHTTPServer();
    return true;
}

// Parameter interaction based on rules
void InitParameterInteraction(ArgsManager &args) {
    // when specifying an explicit binding address, you want to listen on it
    // even when -connect or -proxy is specified.
    if (args.IsArgSet("-bind")) {
        if (args.SoftSetBoolArg("-listen", true)) {
            LogPrintf(
                "%s: parameter interaction: -bind set -> setting -listen=1\n",
                __func__);
        }
    }
    if (args.IsArgSet("-whitebind")) {
        if (args.SoftSetBoolArg("-listen", true)) {
            LogPrintf("%s: parameter interaction: -whitebind set -> setting "
                      "-listen=1\n",
                      __func__);
        }
    }

    if (args.IsArgSet("-connect")) {
        // when only connecting to trusted nodes, do not seed via DNS, or listen
        // by default.
        if (args.SoftSetBoolArg("-dnsseed", false)) {
            LogPrintf("%s: parameter interaction: -connect set -> setting "
                      "-dnsseed=0\n",
                      __func__);
        }
        if (args.SoftSetBoolArg("-listen", false)) {
            LogPrintf("%s: parameter interaction: -connect set -> setting "
                      "-listen=0\n",
                      __func__);
        }
    }

    if (args.IsArgSet("-proxy")) {
        // to protect privacy, do not listen by default if a default proxy
        // server is specified.
        if (args.SoftSetBoolArg("-listen", false)) {
            LogPrintf(
                "%s: parameter interaction: -proxy set -> setting -listen=0\n",
                __func__);
        }
        // to protect privacy, do not use UPNP when a proxy is set. The user may
        // still specify -listen=1 to listen locally, so don't rely on this
        // happening through -listen below.
        if (args.SoftSetBoolArg("-upnp", false)) {
            LogPrintf(
                "%s: parameter interaction: -proxy set -> setting -upnp=0\n",
                __func__);
        }
        // to protect privacy, do not discover addresses by default
        if (args.SoftSetBoolArg("-discover", false)) {
            LogPrintf("%s: parameter interaction: -proxy set -> setting "
                      "-discover=0\n",
                      __func__);
        }
    }

    if (!args.GetBoolArg("-listen", DEFAULT_LISTEN)) {
        // do not map ports or try to retrieve public IP when not listening
        // (pointless)
        if (args.SoftSetBoolArg("-upnp", false)) {
            LogPrintf(
                "%s: parameter interaction: -listen=0 -> setting -upnp=0\n",
                __func__);
        }
        if (args.SoftSetBoolArg("-discover", false)) {
            LogPrintf(
                "%s: parameter interaction: -listen=0 -> setting -discover=0\n",
                __func__);
        }
        if (args.SoftSetBoolArg("-listenonion", false)) {
            LogPrintf("%s: parameter interaction: -listen=0 -> setting "
                      "-listenonion=0\n",
                      __func__);
        }
    }

    if (args.IsArgSet("-externalip")) {
        // if an explicit public IP is specified, do not try to find others
        if (args.SoftSetBoolArg("-discover", false)) {
            LogPrintf("%s: parameter interaction: -externalip set -> setting "
                      "-discover=0\n",
                      __func__);
        }
    }

    // disable whitelistrelay in blocksonly mode
    if (args.GetBoolArg("-blocksonly", DEFAULT_BLOCKSONLY)) {
        if (args.SoftSetBoolArg("-whitelistrelay", false)) {
            LogPrintf("%s: parameter interaction: -blocksonly=1 -> setting "
                      "-whitelistrelay=0\n",
                      __func__);
        }
    }

    // Forcing relay from whitelisted hosts implies we will accept relays from
    // them in the first place.
    if (args.GetBoolArg("-whitelistforcerelay", DEFAULT_WHITELISTFORCERELAY)) {
        if (args.SoftSetBoolArg("-whitelistrelay", true)) {
            LogPrintf("%s: parameter interaction: -whitelistforcerelay=1 -> "
                      "setting -whitelistrelay=1\n",
                      __func__);
        }
    }
}

/**
 * Initialize global loggers.
 *
 * Note that this is called very early in the process lifetime, so you should be
 * careful about what global state you rely on here.
 */
void InitLogging(const ArgsManager &args) {
    LogInstance().m_print_to_file = !args.IsArgNegated("-debuglogfile");
    LogInstance().m_file_path =
        AbsPathForConfigVal(args.GetArg("-debuglogfile", DEFAULT_DEBUGLOGFILE));

    LogInstance().m_print_to_console =
        args.GetBoolArg("-printtoconsole", !args.GetBoolArg("-daemon", false));
    LogInstance().m_log_timestamps =
        args.GetBoolArg("-logtimestamps", DEFAULT_LOGTIMESTAMPS);
    LogInstance().m_log_time_micros =
        args.GetBoolArg("-logtimemicros", DEFAULT_LOGTIMEMICROS);
#ifdef HAVE_THREAD_LOCAL
    LogInstance().m_log_threadnames =
        args.GetBoolArg("-logthreadnames", DEFAULT_LOGTHREADNAMES);
#endif

    fLogIPs = args.GetBoolArg("-logips", DEFAULT_LOGIPS);

    std::string version_string = FormatFullVersion();
#ifdef DEBUG
    version_string += " (debug build)";
#else
    version_string += " (release build)";
#endif
    LogPrintf("%s version %s\n", CLIENT_NAME, version_string);
}

namespace { // Variables internal to initialization process only

int nMaxConnections;
int nUserMaxConnections;
int nFD;
ServiceFlags nLocalServices = ServiceFlags(NODE_NETWORK | NODE_NETWORK_LIMITED);
int64_t peer_connect_timeout;
std::set<BlockFilterType> g_enabled_filter_types;

} // namespace

[[noreturn]] static void new_handler_terminate() {
    // Rather than throwing std::bad-alloc if allocation fails, terminate
    // immediately to (try to) avoid chain corruption. Since LogPrintf may
    // itself allocate memory, set the handler directly to terminate first.
    std::set_new_handler(std::terminate);
    LogPrintf("Error: Out of memory. Terminating.\n");

    // The log was successful, terminate now.
    std::terminate();
};

bool AppInitBasicSetup(ArgsManager &args) {
// Step 1: setup
#ifdef _MSC_VER
    // Turn off Microsoft heap dump noise
    _CrtSetReportMode(_CRT_WARN, _CRTDBG_MODE_FILE);
    _CrtSetReportFile(_CRT_WARN, CreateFileA("NUL", GENERIC_WRITE, 0, nullptr,
                                             OPEN_EXISTING, 0, 0));
    // Disable confusing "helpful" text message on abort, Ctrl-C
    _set_abort_behavior(0, _WRITE_ABORT_MSG | _CALL_REPORTFAULT);
#endif
#ifdef WIN32
    // Enable Data Execution Prevention (DEP)
    SetProcessDEPPolicy(PROCESS_DEP_ENABLE);
#endif

    if (!SetupNetworking()) {
        return InitError(Untranslated("Initializing networking failed"));
    }

#ifndef WIN32
    if (!args.GetBoolArg("-sysperms", false)) {
        umask(077);
    }

    // Clean shutdown on SIGTERM
    registerSignalHandler(SIGTERM, HandleSIGTERM);
    registerSignalHandler(SIGINT, HandleSIGTERM);

    // Reopen debug.log on SIGHUP
    registerSignalHandler(SIGHUP, HandleSIGHUP);

    // Ignore SIGPIPE, otherwise it will bring the daemon down if the client
    // closes unexpectedly
    signal(SIGPIPE, SIG_IGN);
#else
    SetConsoleCtrlHandler(consoleCtrlHandler, true);
#endif

    std::set_new_handler(new_handler_terminate);

    return true;
}

bool AppInitParameterInteraction(Config &config, const ArgsManager &args) {
    const CChainParams &chainparams = config.GetChainParams();
    // Step 2: parameter interactions

    // also see: InitParameterInteraction()

    // Error if network-specific options (-addnode, -connect, etc) are
    // specified in default section of config file, but not overridden
    // on the command line or in this network's section of the config file.
    std::string network = args.GetChainName();
    bilingual_str errors;
    for (const auto &arg : args.GetUnsuitableSectionOnlyArgs()) {
        errors += strprintf(_("Config setting for %s only applied on %s "
                              "network when in [%s] section.") +
                                Untranslated("\n"),
                            arg, network, network);
    }

    if (!errors.empty()) {
        return InitError(errors);
    }

    // Warn if unrecognized section name are present in the config file.
    bilingual_str warnings;
    for (const auto &section : args.GetUnrecognizedSections()) {
        warnings += strprintf(Untranslated("%s:%i ") +
                                  _("Section [%s] is not recognized.") +
                                  Untranslated("\n"),
                              section.m_file, section.m_line, section.m_name);
    }

    if (!warnings.empty()) {
        InitWarning(warnings);
    }

    if (!fs::is_directory(GetBlocksDir())) {
        return InitError(
            strprintf(_("Specified blocks directory \"%s\" does not exist."),
                      args.GetArg("-blocksdir", "")));
    }

    // parse and validate enabled filter types
    std::string blockfilterindex_value =
        args.GetArg("-blockfilterindex", DEFAULT_BLOCKFILTERINDEX);
    if (blockfilterindex_value == "" || blockfilterindex_value == "1") {
        g_enabled_filter_types = AllBlockFilterTypes();
    } else if (blockfilterindex_value != "0") {
        const std::vector<std::string> names =
            args.GetArgs("-blockfilterindex");
        for (const auto &name : names) {
            BlockFilterType filter_type;
            if (!BlockFilterTypeByName(name, filter_type)) {
                return InitError(
                    strprintf(_("Unknown -blockfilterindex value %s."), name));
            }
            g_enabled_filter_types.insert(filter_type);
        }
    }

    // Signal NODE_COMPACT_FILTERS if peerblockfilters and basic filters index
    // are both enabled.
    if (gArgs.GetBoolArg("-peerblockfilters", DEFAULT_PEERBLOCKFILTERS)) {
        if (g_enabled_filter_types.count(BlockFilterType::BASIC) != 1) {
            return InitError(
                _("Cannot set -peerblockfilters without -blockfilterindex."));
        }

        nLocalServices = ServiceFlags(nLocalServices | NODE_COMPACT_FILTERS);
    }

    // if using block pruning, then disallow txindex
    if (args.GetArg("-prune", 0)) {
        if (args.GetBoolArg("-txindex", DEFAULT_TXINDEX)) {
            return InitError(_("Prune mode is incompatible with -txindex."));
        }
        if (!g_enabled_filter_types.empty()) {
            return InitError(
                _("Prune mode is incompatible with -blockfilterindex."));
        }
    }

    // -bind and -whitebind can't be set when not listening
    size_t nUserBind =
        args.GetArgs("-bind").size() + args.GetArgs("-whitebind").size();
    if (nUserBind != 0 && !args.GetBoolArg("-listen", DEFAULT_LISTEN)) {
        return InitError(Untranslated(
            "Cannot set -bind or -whitebind together with -listen=0"));
    }

    // Make sure enough file descriptors are available
    int nBind = std::max(nUserBind, size_t(1));
    nUserMaxConnections =
        args.GetArg("-maxconnections", DEFAULT_MAX_PEER_CONNECTIONS);
    nMaxConnections = std::max(nUserMaxConnections, 0);

    // Trim requested connection counts, to fit into system limitations
    // <int> in std::min<int>(...) to work around FreeBSD compilation issue
    // described in #2695
    nFD = RaiseFileDescriptorLimit(nMaxConnections + nBind +
                                   MIN_CORE_FILEDESCRIPTORS +
                                   MAX_ADDNODE_CONNECTIONS);
#ifdef USE_POLL
    int fd_max = nFD;
#else
    int fd_max = FD_SETSIZE;
#endif
    nMaxConnections =
        std::max(std::min<int>(nMaxConnections, fd_max - nBind -
                                                    MIN_CORE_FILEDESCRIPTORS -
                                                    MAX_ADDNODE_CONNECTIONS),
                 0);
    if (nFD < MIN_CORE_FILEDESCRIPTORS) {
        return InitError(_("Not enough file descriptors available."));
    }
    nMaxConnections =
        std::min(nFD - MIN_CORE_FILEDESCRIPTORS - MAX_ADDNODE_CONNECTIONS,
                 nMaxConnections);

    if (nMaxConnections < nUserMaxConnections) {
        // Not categorizing as "Warning" because this is the normal behavior for
        // platforms using the select() interface for which FD_SETSIZE is
        // usually 1024.
        LogPrintf("Reducing -maxconnections from %d to %d, because of system "
                  "limitations.\n",
                  nUserMaxConnections, nMaxConnections);
    }

    // Step 3: parameter-to-internal-flags
    if (args.IsArgSet("-debug")) {
        // Special-case: if -debug=0/-nodebug is set, turn off debugging
        // messages
        const std::vector<std::string> &categories = args.GetArgs("-debug");
        if (std::none_of(
                categories.begin(), categories.end(),
                [](std::string cat) { return cat == "0" || cat == "none"; })) {
            for (const auto &cat : categories) {
                if (!LogInstance().EnableCategory(cat)) {
                    InitWarning(
                        strprintf(_("Unsupported logging category %s=%s."),
                                  "-debug", cat));
                }
            }
        }
    }

    // Now remove the logging categories which were explicitly excluded
    for (const std::string &cat : args.GetArgs("-debugexclude")) {
        if (!LogInstance().DisableCategory(cat)) {
            InitWarning(strprintf(_("Unsupported logging category %s=%s."),
                                  "-debugexclude", cat));
        }
    }

    fCheckBlockIndex = args.GetBoolArg("-checkblockindex",
                                       chainparams.DefaultConsistencyChecks());
    fCheckpointsEnabled =
        args.GetBoolArg("-checkpoints", DEFAULT_CHECKPOINTS_ENABLED);
    if (fCheckpointsEnabled) {
        LogPrintf("Checkpoints will be verified.\n");
    } else {
        LogPrintf("Skipping checkpoint verification.\n");
    }

    hashAssumeValid = BlockHash::fromHex(
        args.GetArg("-assumevalid",
                    chainparams.GetConsensus().defaultAssumeValid.GetHex()));
    if (!hashAssumeValid.IsNull()) {
        LogPrintf("Assuming ancestors of block %s have valid signatures.\n",
                  hashAssumeValid.GetHex());
    } else {
        LogPrintf("Validating signatures for all blocks.\n");
    }

    if (args.IsArgSet("-minimumchainwork")) {
        const std::string minChainWorkStr =
            args.GetArg("-minimumchainwork", "");
        if (!IsHexNumber(minChainWorkStr)) {
            return InitError(strprintf(
                Untranslated(
                    "Invalid non-hex (%s) minimum chain work value specified"),
                minChainWorkStr));
        }
        nMinimumChainWork = UintToArith256(uint256S(minChainWorkStr));
    } else {
        nMinimumChainWork =
            UintToArith256(chainparams.GetConsensus().nMinimumChainWork);
    }
    LogPrintf("Setting nMinimumChainWork=%s\n", nMinimumChainWork.GetHex());
    if (nMinimumChainWork <
        UintToArith256(chainparams.GetConsensus().nMinimumChainWork)) {
        LogPrintf("Warning: nMinimumChainWork set below default value of %s\n",
                  chainparams.GetConsensus().nMinimumChainWork.GetHex());
    }

    // mempool limits
    int64_t nMempoolSizeMax =
        args.GetArg("-maxmempool", DEFAULT_MAX_MEMPOOL_SIZE) * 1000000;
    int64_t nMempoolSizeMin =
        args.GetArg("-limitdescendantsize", DEFAULT_DESCENDANT_SIZE_LIMIT) *
        1000 * 40;
    if (nMempoolSizeMax < 0 || nMempoolSizeMax < nMempoolSizeMin) {
        return InitError(strprintf(_("-maxmempool must be at least %d MB"),
                                   std::ceil(nMempoolSizeMin / 1000000.0)));
    }

    // Configure excessive block size.
    const int64_t nProposedExcessiveBlockSize =
        args.GetArg("-excessiveblocksize", DEFAULT_MAX_BLOCK_SIZE);
    if (nProposedExcessiveBlockSize <= 0 ||
        !config.SetMaxBlockSize(nProposedExcessiveBlockSize)) {
        return InitError(
            _("Excessive block size must be > 1,000,000 bytes (1MB)"));
    }

    // Check blockmaxsize does not exceed maximum accepted block size.
    const int64_t nProposedMaxGeneratedBlockSize =
        args.GetArg("-blockmaxsize", DEFAULT_MAX_GENERATED_BLOCK_SIZE);
    if (nProposedMaxGeneratedBlockSize <= 0) {
        return InitError(_("Max generated block size must be greater than 0"));
    }
    if (uint64_t(nProposedMaxGeneratedBlockSize) > config.GetMaxBlockSize()) {
        return InitError(_("Max generated block size (blockmaxsize) cannot "
                           "exceed the excessive block size "
                           "(excessiveblocksize)"));
    }

    // block pruning; get the amount of disk space (in MiB) to allot for block &
    // undo files
    int64_t nPruneArg = args.GetArg("-prune", 0);
    if (nPruneArg < 0) {
        return InitError(
            _("Prune cannot be configured with a negative value."));
    }
    nPruneTarget = (uint64_t)nPruneArg * 1024 * 1024;
    if (nPruneArg == 1) {
        // manual pruning: -prune=1
        LogPrintf("Block pruning enabled.  Use RPC call "
                  "pruneblockchain(height) to manually prune block and undo "
                  "files.\n");
        nPruneTarget = std::numeric_limits<uint64_t>::max();
        fPruneMode = true;
    } else if (nPruneTarget) {
        if (nPruneTarget < MIN_DISK_SPACE_FOR_BLOCK_FILES) {
            return InitError(
                strprintf(_("Prune configured below the minimum of %d MiB. "
                            "Please use a higher number."),
                          MIN_DISK_SPACE_FOR_BLOCK_FILES / 1024 / 1024));
        }
        LogPrintf("Prune configured to target %u MiB on disk for block and "
                  "undo files.\n",
                  nPruneTarget / 1024 / 1024);
        fPruneMode = true;
    }

    nConnectTimeout = args.GetArg("-timeout", DEFAULT_CONNECT_TIMEOUT);
    if (nConnectTimeout <= 0) {
        nConnectTimeout = DEFAULT_CONNECT_TIMEOUT;
    }

    peer_connect_timeout =
        args.GetArg("-peertimeout", DEFAULT_PEER_CONNECT_TIMEOUT);
    if (peer_connect_timeout <= 0) {
        return InitError(Untranslated(
            "peertimeout cannot be configured with a negative value."));
    }

    // Obtain the amount to charge excess UTXO
    if (args.IsArgSet("-excessutxocharge")) {
        Amount n = Amount::zero();
        auto parsed = ParseMoney(args.GetArg("-excessutxocharge", ""), n);
        if (!parsed || Amount::zero() > n) {
            return InitError(AmountErrMsg(
                "excessutxocharge", args.GetArg("-excessutxocharge", "")));
        }
        config.SetExcessUTXOCharge(n);
    } else {
        config.SetExcessUTXOCharge(DEFAULT_UTXO_FEE);
    }

    if (args.IsArgSet("-minrelaytxfee")) {
        Amount n = Amount::zero();
        auto parsed = ParseMoney(args.GetArg("-minrelaytxfee", ""), n);
        if (!parsed || n == Amount::zero()) {
            return InitError(AmountErrMsg("minrelaytxfee",
                                          args.GetArg("-minrelaytxfee", "")));
        }
        // High fee check is done afterward in CWallet::CreateWalletFromFile()
        ::minRelayTxFee = CFeeRate(n);
    }

    // Sanity check argument for min fee for including tx in block
    // TODO: Harmonize which arguments need sanity checking and where that
    // happens.
    if (args.IsArgSet("-blockmintxfee")) {
        Amount n = Amount::zero();
        if (!ParseMoney(args.GetArg("-blockmintxfee", ""), n)) {
            return InitError(AmountErrMsg("blockmintxfee",
                                          args.GetArg("-blockmintxfee", "")));
        }
    }

    // Feerate used to define dust.  Shouldn't be changed lightly as old
    // implementations may inadvertently create non-standard transactions.
    if (args.IsArgSet("-dustrelayfee")) {
        Amount n = Amount::zero();
        auto parsed = ParseMoney(args.GetArg("-dustrelayfee", ""), n);
        if (!parsed || Amount::zero() == n) {
            return InitError(
                AmountErrMsg("dustrelayfee", args.GetArg("-dustrelayfee", "")));
        }
        dustRelayFee = CFeeRate(n);
    }

    fRequireStandard =
        !args.GetBoolArg("-acceptnonstdtxn", !chainparams.RequireStandard());
    if (!chainparams.IsTestChain() && !fRequireStandard) {
        return InitError(strprintf(
            Untranslated(
                "acceptnonstdtxn is not currently supported for %s chain"),
            chainparams.NetworkIDString()));
    }
    nBytesPerSigOp = args.GetArg("-bytespersigop", nBytesPerSigOp);

    if (!g_wallet_init_interface.ParameterInteraction()) {
        return false;
    }

    fIsBareMultisigStd =
        args.GetBoolArg("-permitbaremultisig", DEFAULT_PERMIT_BAREMULTISIG);
    fAcceptDatacarrier =
        args.GetBoolArg("-datacarrier", DEFAULT_ACCEPT_DATACARRIER);

    // Option to startup with mocktime set (used for regression testing):
    SetMockTime(args.GetArg("-mocktime", 0)); // SetMockTime(0) is a no-op

    if (args.GetBoolArg("-peerbloomfilters", DEFAULT_PEERBLOOMFILTERS)) {
        nLocalServices = ServiceFlags(nLocalServices | NODE_BLOOM);
    }

    nMaxTipAge = args.GetArg("-maxtipage", DEFAULT_MAX_TIP_AGE);

    return true;
}

static bool LockDataDirectory(bool probeOnly) {
    // Make sure only a single Bitcoin process is using the data directory.
    fs::path datadir = GetDataDir();
    if (!DirIsWritable(datadir)) {
        return InitError(strprintf(
            _("Cannot write to data directory '%s'; check permissions."),
            datadir.string()));
    }
    if (!LockDirectory(datadir, ".lock", probeOnly)) {
        return InitError(strprintf(_("Cannot obtain a lock on data directory "
                                     "%s. %s is probably already running."),
                                   datadir.string(), PACKAGE_NAME));
    }
    return true;
}

bool AppInitSanityChecks() {
    // Step 4: sanity checks

    // Initialize elliptic curve code
    std::string sha256_algo = SHA256AutoDetect();
    LogPrintf("Using the '%s' SHA256 implementation\n", sha256_algo);
    RandomInit();
    ECC_Start();
    globalVerifyHandle.reset(new ECCVerifyHandle());

    // Sanity check
    if (!InitSanityCheck()) {
        return InitError(strprintf(
            _("Initialization sanity check failed. %s is shutting down."),
            PACKAGE_NAME));
    }

    // Probe the data directory lock to give an early error message, if possible
    // We cannot hold the data directory lock here, as the forking for daemon()
    // hasn't yet happened, and a fork will cause weird behavior to it.
    return LockDataDirectory(true);
}

bool AppInitLockDataDirectory() {
    // After daemonization get the data directory lock again and hold on to it
    // until exit. This creates a slight window for a race condition to happen,
    // however this condition is harmless: it will at most make us exit without
    // printing a message to console.
    if (!LockDataDirectory(false)) {
        // Detailed error printed inside LockDataDirectory
        return false;
    }
    return true;
}

bool AppInitInterfaces(NodeContext &node) {
    node.chain = interfaces::MakeChain(node, Params());
    // Create client interfaces for wallets that are supposed to be loaded
    // according to -wallet and -disablewallet options. This only constructs
    // the interfaces, it doesn't load wallet data. Wallets actually get loaded
    // when load() and start() interface methods are called below.
    g_wallet_init_interface.Construct(node);
    return true;
}

bool AppInitMain(Config &config, RPCServer &rpcServer,
                 HTTPRPCRequestProcessor &httpRPCRequestProcessor,
                 NodeContext &node,
                 interfaces::BlockAndHeaderTipInfo *tip_info) {
    // Step 4a: application initialization
    const ArgsManager &args = *Assert(node.args);
    const CChainParams &chainparams = config.GetChainParams();

    if (!CreatePidFile(args)) {
        // Detailed error printed inside CreatePidFile().
        return false;
    }

    BCLog::Logger &logger = LogInstance();
    if (logger.m_print_to_file) {
        if (args.GetBoolArg("-shrinkdebugfile",
                            logger.DefaultShrinkDebugFile())) {
            // Do this first since it both loads a bunch of debug.log into
            // memory, and because this needs to happen before any other
            // debug.log printing.
            logger.ShrinkDebugFile();
        }
    }

    if (!logger.StartLogging()) {
        return InitError(
            strprintf(Untranslated("Could not open debug log file %s"),
                      logger.m_file_path.string()));
    }

    if (!logger.m_log_timestamps) {
        LogPrintf("Startup time: %s\n", FormatISO8601DateTime(GetTime()));
    }
    LogPrintf("Default data directory %s\n", GetDefaultDataDir().string());
    LogPrintf("Using data directory %s\n", GetDataDir().string());

    // Only log conf file usage message if conf file actually exists.
    fs::path config_file_path =
        GetConfigFile(args.GetArg("-conf", BITCOIN_CONF_FILENAME));
    if (fs::exists(config_file_path)) {
        LogPrintf("Config file: %s\n", config_file_path.string());
    } else if (args.IsArgSet("-conf")) {
        // Warn if no conf file exists at path provided by user
        InitWarning(
            strprintf(_("The specified config file %s does not exist\n"),
                      config_file_path.string()));
    } else {
        // Not categorizing as "Warning" because it's the default behavior
        LogPrintf("Config file: %s (not found, skipping)\n",
                  config_file_path.string());
    }

    // Log the config arguments to debug.log
    args.LogArgs();

    LogPrintf("Using at most %i automatic connections (%i file descriptors "
              "available)\n",
              nMaxConnections, nFD);

    // Warn about relative -datadir path.
    if (args.IsArgSet("-datadir") &&
        !fs::path(args.GetArg("-datadir", "")).is_absolute()) {
        LogPrintf("Warning: relative datadir option '%s' specified, which will "
                  "be interpreted relative to the current working directory "
                  "'%s'. This is fragile, because if bitcoin is started in the "
                  "future from a different location, it will be unable to "
                  "locate the current data files. There could also be data "
                  "loss if bitcoin is started while in a temporary "
                  "directory.\n",
                  args.GetArg("-datadir", ""), fs::current_path().string());
    }

    InitSignatureCache();
    InitScriptExecutionCache();

    int script_threads = args.GetArg("-par", DEFAULT_SCRIPTCHECK_THREADS);
    if (script_threads <= 0) {
        // -par=0 means autodetect (number of cores - 1 script threads)
        // -par=-n means "leave n cores free" (number of cores - n - 1 script
        // threads)
        script_threads += GetNumCores();
    }

    // Subtract 1 because the main thread counts towards the par threads
    script_threads = std::max(script_threads - 1, 0);

    // Number of script-checking threads <= MAX_SCRIPTCHECK_THREADS
    script_threads = std::min(script_threads, MAX_SCRIPTCHECK_THREADS);

    LogPrintf("Script verification uses %d additional threads\n",
              script_threads);
    if (script_threads >= 1) {
        for (int i = 0; i < script_threads; ++i) {
            threadGroup.create_thread([i]() { return ThreadScriptCheck(i); });
        }
    }

    assert(!node.scheduler);
    node.scheduler = std::make_unique<CScheduler>();

    // Start the lightweight task scheduler thread
    CScheduler::Function serviceLoop = [&node] {
        node.scheduler->serviceQueue();
    };
    threadGroup.create_thread(std::bind(&TraceThread<CScheduler::Function>,
                                        "scheduler", serviceLoop));

    // Gather some entropy once per minute.
    node.scheduler->scheduleEvery(
        [] {
            RandAddPeriodic();
            return true;
        },
        std::chrono::minutes{1});

    GetMainSignals().RegisterBackgroundSignalScheduler(*node.scheduler);

    /**
     * Register RPC commands regardless of -server setting so they will be
     * available in the GUI RPC console even if external calls are disabled.
     */
    RegisterAllRPCCommands(config, rpcServer, tableRPC);
    for (const auto &client : node.chain_clients) {
        client->registerRpcs();
    }
#if ENABLE_ZMQ
    RegisterZMQRPCCommands(tableRPC);
#endif

    /**
     * Start the RPC server.  It will be started in "warmup" mode and not
     * process calls yet (but it will verify that the server is there and will
     * be ready later).  Warmup mode will be completed when initialisation is
     * finished.
     */
    if (args.GetBoolArg("-server", false)) {
        uiInterface.InitMessage_connect(SetRPCWarmupStatus);
        if (!AppInitServers(config, httpRPCRequestProcessor, node)) {
            return InitError(
                _("Unable to start HTTP server. See debug log for details."));
        }
    }

    // Step 5: verify wallet database integrity
    for (const auto &client : node.chain_clients) {
        if (!client->verify()) {
            return false;
        }
    }

    // Step 6: network initialization

    // Note that we absolutely cannot open any actual connections
    // until the very end ("start node") as the UTXO/block state
    // is not yet setup and may end up being set up twice if we
    // need to reindex later.

    assert(!node.banman);
    node.banman = std::make_unique<BanMan>(
        GetDataDir() / "banlist.dat", config.GetChainParams(), &uiInterface,
        args.GetArg("-bantime", DEFAULT_MISBEHAVING_BANTIME));
    assert(!node.connman);
    node.connman = std::make_unique<CConnman>(
        config, GetRand(std::numeric_limits<uint64_t>::max()),
        GetRand(std::numeric_limits<uint64_t>::max()),
        gArgs.GetBoolArg("-networkactive", true));

    // Make mempool generally available in the node context. For example the
    // connection manager, wallet, or RPC threads, which are all started after
    // this, may use it from the node context.
    assert(!node.mempool);
    node.mempool = std::make_unique<CTxMemPool>();
    if (node.mempool) {
        int ratio = std::min<int>(
            std::max<int>(
                args.GetArg("-checkmempool",
                            chainparams.DefaultConsistencyChecks() ? 1 : 0),
                0),
            1000000);
        if (ratio != 0) {
            node.mempool->setSanityCheck(1.0 / ratio);
        }
    }

    assert(!node.chainman);
    node.chainman = &g_chainman;
    ChainstateManager &chainman = *Assert(node.chainman);

    node.peerman.reset(new PeerManager(chainparams, *node.connman,
                                       node.banman.get(), *node.scheduler,
                                       chainman, *node.mempool));
    RegisterValidationInterface(node.peerman.get());

    // sanitize comments per BIP-0014, format user agent and check total size
    std::vector<std::string> uacomments;
    for (const std::string &cmt : args.GetArgs("-uacomment")) {
        if (cmt != SanitizeString(cmt, SAFE_CHARS_UA_COMMENT)) {
            return InitError(strprintf(
                _("User Agent comment (%s) contains unsafe characters."), cmt));
        }
        uacomments.push_back(cmt);
    }
    const std::string client_name = args.GetArg("-uaclientname", CLIENT_NAME);
    const std::string client_version =
        args.GetArg("-uaclientversion", FormatVersion(CLIENT_VERSION));
    if (client_name != SanitizeString(client_name, SAFE_CHARS_UA_COMMENT)) {
        return InitError(strprintf(
            _("-uaclientname (%s) contains invalid characters."), client_name));
    }
    if (client_version !=
        SanitizeString(client_version, SAFE_CHARS_UA_COMMENT)) {
        return InitError(
            strprintf(_("-uaclientversion (%s) contains invalid characters."),
                      client_version));
    }
    const std::string strSubVersion =
        FormatUserAgent(client_name, client_version, uacomments);
    if (strSubVersion.size() > MAX_SUBVERSION_LENGTH) {
        return InitError(strprintf(
            _("Total length of network version string (%i) exceeds maximum "
              "length (%i). Reduce the number or size of uacomments."),
            strSubVersion.size(), MAX_SUBVERSION_LENGTH));
    }

    if (args.IsArgSet("-onlynet")) {
        std::set<enum Network> nets;
        for (const std::string &snet : args.GetArgs("-onlynet")) {
            enum Network net = ParseNetwork(snet);
            if (net == NET_UNROUTABLE) {
                return InitError(strprintf(
                    _("Unknown network specified in -onlynet: '%s'"), snet));
            }
            nets.insert(net);
        }
        for (int n = 0; n < NET_MAX; n++) {
            enum Network net = (enum Network)n;
            if (!nets.count(net)) {
                SetReachable(net, false);
            }
        }
    }

    // Check for host lookup allowed before parsing any network related
    // parameters
    fNameLookup = args.GetBoolArg("-dns", DEFAULT_NAME_LOOKUP);

    bool proxyRandomize =
        args.GetBoolArg("-proxyrandomize", DEFAULT_PROXYRANDOMIZE);
    // -proxy sets a proxy for all outgoing network traffic
    // -noproxy (or -proxy=0) as well as the empty string can be used to not set
    // a proxy, this is the default
    std::string proxyArg = args.GetArg("-proxy", "");
    SetReachable(NET_ONION, false);
    if (proxyArg != "" && proxyArg != "0") {
        CService proxyAddr;
        if (!Lookup(proxyArg, proxyAddr, 9050, fNameLookup)) {
            return InitError(strprintf(
                _("Invalid -proxy address or hostname: '%s'"), proxyArg));
        }

        proxyType addrProxy = proxyType(proxyAddr, proxyRandomize);
        if (!addrProxy.IsValid()) {
            return InitError(strprintf(
                _("Invalid -proxy address or hostname: '%s'"), proxyArg));
        }

        SetProxy(NET_IPV4, addrProxy);
        SetProxy(NET_IPV6, addrProxy);
        SetProxy(NET_ONION, addrProxy);
        SetNameProxy(addrProxy);
        // by default, -proxy sets onion as reachable, unless -noonion later
        SetReachable(NET_ONION, true);
    }

    // -onion can be used to set only a proxy for .onion, or override normal
    // proxy for .onion addresses.
    // -noonion (or -onion=0) disables connecting to .onion entirely. An empty
    // string is used to not override the onion proxy (in which case it defaults
    // to -proxy set above, or none)
    std::string onionArg = args.GetArg("-onion", "");
    if (onionArg != "") {
        if (onionArg == "0") {
            // Handle -noonion/-onion=0
            SetReachable(NET_ONION, false);
        } else {
            CService onionProxy;
            if (!Lookup(onionArg, onionProxy, 9050, fNameLookup)) {
                return InitError(strprintf(
                    _("Invalid -onion address or hostname: '%s'"), onionArg));
            }
            proxyType addrOnion = proxyType(onionProxy, proxyRandomize);
            if (!addrOnion.IsValid()) {
                return InitError(strprintf(
                    _("Invalid -onion address or hostname: '%s'"), onionArg));
            }
            SetProxy(NET_ONION, addrOnion);
            SetReachable(NET_ONION, true);
        }
    }

    // see Step 2: parameter interactions for more information about these
    fListen = args.GetBoolArg("-listen", DEFAULT_LISTEN);
    fDiscover = args.GetBoolArg("-discover", true);
    g_relay_txes = !args.GetBoolArg("-blocksonly", DEFAULT_BLOCKSONLY);

    for (const std::string &strAddr : args.GetArgs("-externalip")) {
        CService addrLocal;
        if (Lookup(strAddr, addrLocal, GetListenPort(), fNameLookup) &&
            addrLocal.IsValid()) {
            AddLocal(addrLocal, LOCAL_MANUAL);
        } else {
            return InitError(ResolveErrMsg("externalip", strAddr));
        }
    }

    // Read asmap file if configured
    if (args.IsArgSet("-asmap")) {
        fs::path asmap_path = fs::path(args.GetArg("-asmap", ""));
        if (asmap_path.empty()) {
            asmap_path = DEFAULT_ASMAP_FILENAME;
        }
        if (!asmap_path.is_absolute()) {
            asmap_path = GetDataDir() / asmap_path;
        }
        if (!fs::exists(asmap_path)) {
            InitError(strprintf(_("Could not find asmap file %s"), asmap_path));
            return false;
        }
        std::vector<bool> asmap = CAddrMan::DecodeAsmap(asmap_path);
        if (asmap.size() == 0) {
            InitError(
                strprintf(_("Could not parse asmap file %s"), asmap_path));
            return false;
        }
        const uint256 asmap_version = SerializeHash(asmap);
        node.connman->SetAsmap(std::move(asmap));
        LogPrintf("Using asmap version %s for IP bucketing\n",
                  asmap_version.ToString());
    } else {
        LogPrintf("Using /16 prefix for IP bucketing\n");
    }

#if ENABLE_ZMQ
    g_zmq_notification_interface = CZMQNotificationInterface::Create();

    if (g_zmq_notification_interface) {
        RegisterValidationInterface(g_zmq_notification_interface);
    }
#endif
    // unlimited unless -maxuploadtarget is set
    uint64_t nMaxOutboundLimit = 0;
    uint64_t nMaxOutboundTimeframe = MAX_UPLOAD_TIMEFRAME;

    if (args.IsArgSet("-maxuploadtarget")) {
        nMaxOutboundLimit =
            args.GetArg("-maxuploadtarget", DEFAULT_MAX_UPLOAD_TARGET) * 1024 *
            1024;
    }

    // Step 6.5 (I guess ?): Initialize Avalanche.
    bilingual_str avalancheError;
    g_avalanche = avalanche::Processor::MakeProcessor(
        args, *node.chain, node.connman.get(), avalancheError);
    if (!g_avalanche) {
        InitError(avalancheError);
        return false;
    }

    if (isAvalancheEnabled(args) &&
        g_avalanche->isAvalancheServiceAvailable()) {
        nLocalServices = ServiceFlags(nLocalServices | NODE_AVALANCHE);
    }

    // Step 7: load block chain

    fReindex = args.GetBoolArg("-reindex", false);
    bool fReindexChainState = args.GetBoolArg("-reindex-chainstate", false);

    // cache size calculations
    int64_t nTotalCache = (args.GetArg("-dbcache", DEFAULT_DB_CACHE_MB) << 20);
    // total cache cannot be less than MIN_DB_CACHE_MB
    nTotalCache = std::max(nTotalCache, MIN_DB_CACHE_MB << 20);
    // total cache cannot be greater than MAX_DB_CACHE_MB
    nTotalCache = std::min(nTotalCache, MAX_DB_CACHE_MB << 20);
    int64_t nBlockTreeDBCache =
        std::min(nTotalCache / 8, MAX_BLOCK_DB_CACHE_MB << 20);
    nTotalCache -= nBlockTreeDBCache;
    int64_t nTxIndexCache =
        std::min(nTotalCache / 8, args.GetBoolArg("-txindex", DEFAULT_TXINDEX)
                                      ? MAX_TX_INDEX_CACHE_MB << 20
                                      : 0);
    nTotalCache -= nTxIndexCache;
    int64_t filter_index_cache = 0;
    if (!g_enabled_filter_types.empty()) {
        size_t n_indexes = g_enabled_filter_types.size();
        int64_t max_cache =
            std::min(nTotalCache / 8, MAX_FILTER_INDEX_CACHE_MB << 20);
        filter_index_cache = max_cache / n_indexes;
        nTotalCache -= filter_index_cache * n_indexes;
    }
    // use 25%-50% of the remainder for disk cache
    int64_t nCoinDBCache =
        std::min(nTotalCache / 2, (nTotalCache / 4) + (1 << 23));
    // cap total coins db cache
    nCoinDBCache = std::min(nCoinDBCache, MAX_COINS_DB_CACHE_MB << 20);
    nTotalCache -= nCoinDBCache;
    // the rest goes to in-memory cache
    int64_t nCoinCacheUsage = nTotalCache;
    int64_t nMempoolSizeMax =
        args.GetArg("-maxmempool", DEFAULT_MAX_MEMPOOL_SIZE) * 1000000;
    LogPrintf("Cache configuration:\n");
    LogPrintf("* Using %.1f MiB for block index database\n",
              nBlockTreeDBCache * (1.0 / 1024 / 1024));
    if (args.GetBoolArg("-txindex", DEFAULT_TXINDEX)) {
        LogPrintf("* Using %.1f MiB for transaction index database\n",
                  nTxIndexCache * (1.0 / 1024 / 1024));
    }
    for (BlockFilterType filter_type : g_enabled_filter_types) {
        LogPrintf("* Using %.1f MiB for %s block filter index database\n",
                  filter_index_cache * (1.0 / 1024 / 1024),
                  BlockFilterTypeName(filter_type));
    }
    LogPrintf("* Using %.1f MiB for chain state database\n",
              nCoinDBCache * (1.0 / 1024 / 1024));
    LogPrintf("* Using %.1f MiB for in-memory UTXO set (plus up to %.1f MiB of "
              "unused mempool space)\n",
              nCoinCacheUsage * (1.0 / 1024 / 1024),
              nMempoolSizeMax * (1.0 / 1024 / 1024));

    bool fLoaded = false;
    while (!fLoaded && !ShutdownRequested()) {
        const bool fReset = fReindex;
        auto is_coinsview_empty =
            [&](CChainState *chainstate) EXCLUSIVE_LOCKS_REQUIRED(::cs_main) {
                return fReset || fReindexChainState ||
                       chainstate->CoinsTip().GetBestBlock().IsNull();
            };
        bilingual_str strLoadError;

        uiInterface.InitMessage(_("Loading block index...").translated);
        do {
            bool failed_verification = false;
            const int64_t load_block_index_start_time = GetTimeMillis();
            try {
                LOCK(cs_main);
                chainman.InitializeChainstate(*Assert(node.mempool));
                chainman.m_total_coinstip_cache = nCoinCacheUsage;
                chainman.m_total_coinsdb_cache = nCoinDBCache;

                UnloadBlockIndex(node.mempool.get(), chainman);

                // new CBlockTreeDB tries to delete the existing file, which
                // fails if it's still open from the previous loop. Close it
                // first:
                pblocktree.reset();
                pblocktree.reset(
                    new CBlockTreeDB(nBlockTreeDBCache, false, fReset));

                if (fReset) {
                    pblocktree->WriteReindexing(true);
                    // If we're reindexing in prune mode, wipe away unusable
                    // block files and all undo data files
                    if (fPruneMode) {
                        CleanupBlockRevFiles();
                    }
                }

                const Consensus::Params &params = chainparams.GetConsensus();

                // If necessary, upgrade from older database format.
                // This is a no-op if we cleared the block tree db with -reindex
                // or -reindex-chainstate
                if (!pblocktree->Upgrade(params)) {
                    strLoadError = _("Error upgrading block index database");
                    break;
                }

                if (ShutdownRequested()) {
                    break;
                }

                // LoadBlockIndex will load fHavePruned if we've ever removed a
                // block file from disk.
                // Note that it also sets fReindex based on the disk flag!
                // From here on out fReindex and fReset mean something
                // different!
                if (!chainman.LoadBlockIndex(params)) {
                    if (ShutdownRequested()) {
                        break;
                    }
                    strLoadError = _("Error loading block database");
                    break;
                }

                // If the loaded chain has a wrong genesis, bail out immediately
                // (we're likely using a testnet datadir, or the other way
                // around).
                if (!chainman.BlockIndex().empty() &&
                    !LookupBlockIndex(params.hashGenesisBlock)) {
                    return InitError(_("Incorrect or no genesis block found. "
                                       "Wrong datadir for network?"));
                }

                // Check for changed -prune state.  What we are concerned about
                // is a user who has pruned blocks in the past, but is now
                // trying to run unpruned.
                if (fHavePruned && !fPruneMode) {
                    strLoadError =
                        _("You need to rebuild the database using -reindex to "
                          "go back to unpruned mode.  This will redownload the "
                          "entire blockchain");
                    break;
                }

                // At this point blocktree args are consistent with what's on
                // disk. If we're not mid-reindex (based on disk + args), add a
                // genesis block on disk (otherwise we use the one already on
                // disk).
                // This is called again in ThreadImport after the reindex
                // completes.
                if (!fReindex && !LoadGenesisBlock(chainparams)) {
                    strLoadError = _("Error initializing block database");
                    break;
                }

                // At this point we're either in reindex or we've loaded a
                // useful block tree into BlockIndex()!

                bool failed_chainstate_init = false;

                for (CChainState *chainstate : chainman.GetAll()) {
                    LogPrintf("Initializing chainstate %s\n",
                              chainstate->ToString());
                    chainstate->InitCoinsDB(
                        /* cache_size_bytes */ nCoinDBCache,
                        /* in_memory */ false,
                        /* should_wipe */ fReset || fReindexChainState);

                    chainstate->CoinsErrorCatcher().AddReadErrCallback([]() {
                        uiInterface.ThreadSafeMessageBox(
                            _("Error reading from database, shutting down."),
                            "", CClientUIInterface::MSG_ERROR);
                    });

                    // If necessary, upgrade from older database format.
                    // This is a no-op if we cleared the coinsviewdb with
                    // -reindex or -reindex-chainstate
                    if (!chainstate->CoinsDB().Upgrade()) {
                        strLoadError = _("Error upgrading chainstate database");
                        failed_chainstate_init = true;
                        break;
                    }

                    // ReplayBlocks is a no-op if we cleared the coinsviewdb
                    // with -reindex or -reindex-chainstate
                    if (!chainstate->ReplayBlocks(params)) {
                        strLoadError = _(
                            "Unable to replay blocks. You will need to rebuild "
                            "the database using -reindex-chainstate.");
                        failed_chainstate_init = true;
                        break;
                    }

                    // The on-disk coinsdb is now in a good state, create the
                    // cache
                    chainstate->InitCoinsCache(nCoinCacheUsage);
                    assert(chainstate->CanFlushToDisk());

                    if (!is_coinsview_empty(chainstate)) {
                        // LoadChainTip initializes the chain based on
                        // CoinsTip()'s best block
                        if (!chainstate->LoadChainTip(chainparams)) {
                            strLoadError =
                                _("Error initializing block database");
                            failed_chainstate_init = true;
                            // out of the per-chainstate loop
                            break;
                        }
                        assert(chainstate->m_chain.Tip() != nullptr);
                    }
                }

                if (failed_chainstate_init) {
                    // out of the chainstate activation do-while
                    break;
                }

                for (CChainState *chainstate : chainman.GetAll()) {
                    if (!is_coinsview_empty(chainstate)) {
                        uiInterface.InitMessage(
                            _("Verifying blocks...").translated);
                        if (fHavePruned &&
                            args.GetArg("-checkblocks", DEFAULT_CHECKBLOCKS) >
                                MIN_BLOCKS_TO_KEEP) {
                            LogPrintf(
                                "Prune: pruned datadir may not have more than "
                                "%d blocks; only checking available blocks\n",
                                MIN_BLOCKS_TO_KEEP);
                        }

                        const CBlockIndex *tip = chainstate->m_chain.Tip();
                        RPCNotifyBlockChange(tip);
                        if (tip &&
                            tip->nTime > GetAdjustedTime() + 2 * 60 * 60) {
                            strLoadError =
                                _("The block database contains a block which "
                                  "appears to be from the future. "
                                  "This may be due to your computer's date and "
                                  "time being set incorrectly. "
                                  "Only rebuild the block database if you are "
                                  "sure that your computer's date and time are "
                                  "correct");
                            failed_verification = true;
                            break;
                        }

                        // Only verify the DB of the active chainstate. This is
                        // fixed in later work when we allow VerifyDB to be
                        // parameterized by chainstate.
                        if (&::ChainstateActive() == chainstate &&
                            !CVerifyDB().VerifyDB(
                                config, &chainstate->CoinsDB(),
                                args.GetArg("-checklevel", DEFAULT_CHECKLEVEL),
                                args.GetArg("-checkblocks",
                                            DEFAULT_CHECKBLOCKS))) {
                            strLoadError =
                                _("Corrupted block database detected");
                            failed_verification = true;
                            break;
                        }
                    }
                }
            } catch (const std::exception &e) {
                LogPrintf("%s\n", e.what());
                strLoadError = _("Error opening block database");
                failed_verification = true;
                break;
            }

            if (!failed_verification) {
                fLoaded = true;
                LogPrintf(" block index %15dms\n",
                          GetTimeMillis() - load_block_index_start_time);
            }
        } while (false);

        if (!fLoaded && !ShutdownRequested()) {
            // first suggest a reindex
            if (!fReset) {
                bool fRet = uiInterface.ThreadSafeQuestion(
                    strLoadError + Untranslated(".\n\n") +
                        _("Do you want to rebuild the block database now?"),
                    strLoadError.original +
                        ".\nPlease restart with -reindex or "
                        "-reindex-chainstate to recover.",
                    "",
                    CClientUIInterface::MSG_ERROR |
                        CClientUIInterface::BTN_ABORT);
                if (fRet) {
                    fReindex = true;
                    AbortShutdown();
                } else {
                    LogPrintf("Aborted block database rebuild. Exiting.\n");
                    return false;
                }
            } else {
                return InitError(strLoadError);
            }
        }
    }

    // As LoadBlockIndex can take several minutes, it's possible the user
    // requested to kill the GUI during the last operation. If so, exit.
    // As the program has not fully started yet, Shutdown() is possibly
    // overkill.
    if (ShutdownRequested()) {
        LogPrintf("Shutdown requested. Exiting.\n");
        return false;
    }

    // Encoded addresses using cashaddr instead of base58.
    // We do this by default to avoid confusion with BTC addresses.
    config.SetCashAddrEncoding(args.GetBoolArg("-usecashaddr", true));

    // Step 8: load indexers
    if (args.GetBoolArg("-txindex", DEFAULT_TXINDEX)) {
        g_txindex = std::make_unique<TxIndex>(nTxIndexCache, false, fReindex);
        g_txindex->Start();
    }

    for (const auto &filter_type : g_enabled_filter_types) {
        InitBlockFilterIndex(filter_type, filter_index_cache, false, fReindex);
        GetBlockFilterIndex(filter_type)->Start();
    }

    // Step 9: load wallet
    for (const auto &client : node.chain_clients) {
        if (!client->load()) {
            return false;
        }
    }

    // Step 10: data directory maintenance

    // if pruning, unset the service bit and perform the initial blockstore
    // prune after any wallet rescanning has taken place.
    if (fPruneMode) {
        LogPrintf("Unsetting NODE_NETWORK on prune mode\n");
        nLocalServices = ServiceFlags(nLocalServices & ~NODE_NETWORK);
        if (!fReindex) {
            LOCK(cs_main);
            for (CChainState *chainstate : chainman.GetAll()) {
                uiInterface.InitMessage(_("Pruning blockstore...").translated);
                chainstate->PruneAndFlush();
            }
        }
    }

    // Step 11: import blocks
    if (!CheckDiskSpace(GetDataDir())) {
        InitError(
            strprintf(_("Error: Disk space is low for %s"), GetDataDir()));
        return false;
    }
    if (!CheckDiskSpace(GetBlocksDir())) {
        InitError(
            strprintf(_("Error: Disk space is low for %s"), GetBlocksDir()));
        return false;
    }

    // Either install a handler to notify us when genesis activates, or set
    // fHaveGenesis directly.
    // No locking, as this happens before any background thread is started.
    boost::signals2::connection block_notify_genesis_wait_connection;
    if (::ChainActive().Tip() == nullptr) {
        block_notify_genesis_wait_connection =
            uiInterface.NotifyBlockTip_connect(
                std::bind(BlockNotifyGenesisWait, std::placeholders::_2));
    } else {
        fHaveGenesis = true;
    }

#if defined(HAVE_SYSTEM)
    const std::string block_notify = args.GetArg("-blocknotify", "");
    if (!block_notify.empty()) {
        uiInterface.NotifyBlockTip_connect([block_notify](
                                               SynchronizationState sync_state,
                                               const CBlockIndex *pBlockIndex) {
            if (sync_state != SynchronizationState::POST_INIT || !pBlockIndex) {
                return;
            }
            std::string command = block_notify;
            boost::replace_all(command, "%s",
                               pBlockIndex->GetBlockHash().GetHex());
            std::thread t(runCommand, command);
            // thread runs free
            t.detach();
        });
    }
#endif

    std::vector<fs::path> vImportFiles;
    for (const std::string &strFile : args.GetArgs("-loadblock")) {
        vImportFiles.push_back(strFile);
    }

    g_load_block =
        std::thread(&TraceThread<std::function<void()>>, "loadblk",
                    [=, &config, &chainman, &args] {
                        ThreadImport(config, chainman, vImportFiles, args);
                    });

    // Wait for genesis block to be processed
    {
        WAIT_LOCK(g_genesis_wait_mutex, lock);
        // We previously could hang here if StartShutdown() is called prior to
        // ThreadImport getting started, so instead we just wait on a timer to
        // check ShutdownRequested() regularly.
        while (!fHaveGenesis && !ShutdownRequested()) {
            g_genesis_wait_cv.wait_for(lock, std::chrono::milliseconds(500));
        }
        block_notify_genesis_wait_connection.disconnect();
    }

    if (ShutdownRequested()) {
        return false;
    }

    // Step 12: start node

    int chain_active_height;

    //// debug print
    {
        LOCK(cs_main);
        LogPrintf("block tree size = %u\n", chainman.BlockIndex().size());
        chain_active_height = chainman.ActiveChain().Height();
        if (tip_info) {
            tip_info->block_height = chain_active_height;
            tip_info->block_time =
                chainman.ActiveChain().Tip()
                    ? chainman.ActiveChain().Tip()->GetBlockTime()
                    : Params().GenesisBlock().GetBlockTime();
            tip_info->verification_progress = GuessVerificationProgress(
                Params().TxData(), chainman.ActiveChain().Tip());
        }
        if (tip_info && ::pindexBestHeader) {
            tip_info->header_height = ::pindexBestHeader->nHeight;
            tip_info->header_time = ::pindexBestHeader->GetBlockTime();
        }
    }
    LogPrintf("nBestHeight = %d\n", chain_active_height);

    if (args.GetBoolArg("-listenonion", DEFAULT_LISTEN_ONION)) {
        StartTorControl();
    }

    Discover();

    // Map ports with UPnP
    if (args.GetBoolArg("-upnp", DEFAULT_UPNP)) {
        StartMapPort();
    }

    CConnman::Options connOptions;
    connOptions.nLocalServices = nLocalServices;
    connOptions.nMaxConnections = nMaxConnections;
    connOptions.m_max_outbound_full_relay = std::min(
        MAX_OUTBOUND_FULL_RELAY_CONNECTIONS, connOptions.nMaxConnections);
    connOptions.m_max_outbound_block_relay = std::min(
        MAX_BLOCK_RELAY_ONLY_CONNECTIONS,
        connOptions.nMaxConnections - connOptions.m_max_outbound_full_relay);
    connOptions.nMaxAddnode = MAX_ADDNODE_CONNECTIONS;
    connOptions.nMaxFeeler = MAX_FEELER_CONNECTIONS;
    connOptions.nBestHeight = chain_active_height;
    connOptions.uiInterface = &uiInterface;
    connOptions.m_banman = node.banman.get();
    connOptions.m_msgproc = node.peerman.get();
    connOptions.nSendBufferMaxSize =
        1000 * args.GetArg("-maxsendbuffer", DEFAULT_MAXSENDBUFFER);
    connOptions.nReceiveFloodSize =
        1000 * args.GetArg("-maxreceivebuffer", DEFAULT_MAXRECEIVEBUFFER);
    connOptions.m_added_nodes = args.GetArgs("-addnode");

    connOptions.nMaxOutboundTimeframe = nMaxOutboundTimeframe;
    connOptions.nMaxOutboundLimit = nMaxOutboundLimit;
    connOptions.m_peer_connect_timeout = peer_connect_timeout;

    for (const std::string &strBind : args.GetArgs("-bind")) {
        CService addrBind;
        if (!Lookup(strBind, addrBind, GetListenPort(), false)) {
            return InitError(ResolveErrMsg("bind", strBind));
        }
        connOptions.vBinds.push_back(addrBind);
    }

    for (const std::string &strBind : args.GetArgs("-whitebind")) {
        NetWhitebindPermissions whitebind;
        bilingual_str error;
        if (!NetWhitebindPermissions::TryParse(strBind, whitebind, error)) {
            return InitError(error);
        }
        connOptions.vWhiteBinds.push_back(whitebind);
    }

    for (const auto &net : args.GetArgs("-whitelist")) {
        NetWhitelistPermissions subnet;
        bilingual_str error;
        if (!NetWhitelistPermissions::TryParse(net, subnet, error)) {
            return InitError(error);
        }
        connOptions.vWhitelistedRange.push_back(subnet);
    }

    connOptions.vSeedNodes = args.GetArgs("-seednode");

    // Initiate outbound connections unless connect=0
    connOptions.m_use_addrman_outgoing = !args.IsArgSet("-connect");
    if (!connOptions.m_use_addrman_outgoing) {
        const auto connect = args.GetArgs("-connect");
        if (connect.size() != 1 || connect[0] != "0") {
            connOptions.m_specified_outgoing = connect;
        }
    }
    if (!node.connman->Start(*node.scheduler, connOptions)) {
        return false;
    }

    // Step 13: finished

    SetRPCWarmupFinished();
    uiInterface.InitMessage(_("Done loading").translated);

    for (const auto &client : node.chain_clients) {
        client->start(*node.scheduler);
    }

    BanMan *banman = node.banman.get();
    node.scheduler->scheduleEvery(
        [banman] {
            banman->DumpBanlist();
            return true;
        },
        DUMP_BANS_INTERVAL);

    // Start Avalanche's event loop.
    g_avalanche->startEventLoop(*node.scheduler);

    return true;
}
