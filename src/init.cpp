// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#if defined(HAVE_CONFIG_H)
#include <config/bitcoin-config.h>
#endif

#include <init.h>

#include <kernel/mempool_persist.h>
#include <kernel/validation_cache_sizes.h>

#include <addrman.h>
#include <avalanche/avalanche.h>
#include <avalanche/processor.h>
#include <avalanche/proof.h> // For AVALANCHE_LEGACY_PROOF_DEFAULT
#include <avalanche/validation.h>
#include <avalanche/voterecord.h> // For AVALANCHE_VOTE_STALE_*
#include <banman.h>
#include <blockfilter.h>
#include <chain.h>
#include <chainparams.h>
#include <common/args.h>
#include <compat/sanity.h>
#include <config.h>
#include <consensus/amount.h>
#include <currencyunit.h>
#include <flatfile.h>
#include <hash.h>
#include <httprpc.h>
#include <httpserver.h>
#include <index/blockfilterindex.h>
#include <index/coinstatsindex.h>
#include <index/txindex.h>
#include <init/common.h>
#include <interfaces/chain.h>
#include <interfaces/node.h>
#include <mapport.h>
#include <mempool_args.h>
#include <net.h>
#include <net_permissions.h>
#include <net_processing.h>
#include <netbase.h>
#include <node/blockmanager_args.h>
#include <node/blockstorage.h>
#include <node/caches.h>
#include <node/chainstate.h>
#include <node/chainstatemanager_args.h>
#include <node/context.h>
#include <node/kernel_notifications.h>
#include <node/mempool_persist_args.h>
#include <node/miner.h>
#include <node/ui_interface.h>
#include <node/validation_cache_args.h>
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
#include <util/fs.h>
#include <util/fs_helpers.h>
#include <util/moneystr.h>
#include <util/string.h>
#include <util/syserror.h>
#include <util/thread.h>
#include <util/threadnames.h>
#include <util/translation.h>
#include <validation.h>
#include <validationinterface.h>
#include <walletinitinterface.h>

#include <boost/signals2/signal.hpp>

#if ENABLE_CHRONIK
#include <chronik-cpp/chronik.h>
#endif

#if ENABLE_ZMQ
#include <zmq/zmqabstractnotifier.h>
#include <zmq/zmqnotificationinterface.h>
#include <zmq/zmqrpc.h>
#endif

#ifndef WIN32
#include <cerrno>
#include <csignal>
#include <sys/stat.h>
#endif
#include <algorithm>
#include <condition_variable>
#include <cstdint>
#include <cstdio>
#include <fstream>
#include <functional>
#include <set>
#include <string>
#include <thread>
#include <vector>

using kernel::DEFAULT_STOPAFTERBLOCKIMPORT;
using kernel::DumpMempool;
using kernel::ValidationCacheSizes;

using node::ApplyArgsManOptions;
using node::BlockManager;
using node::CacheSizes;
using node::CalculateCacheSizes;
using node::DEFAULT_PERSIST_MEMPOOL;
using node::fReindex;
using node::KernelNotifications;
using node::LoadChainstate;
using node::MempoolPath;
using node::NodeContext;
using node::ShouldPersistMempool;
using node::ThreadImport;
using node::VerifyLoadedChainstate;

static const bool DEFAULT_PROXYRANDOMIZE = true;
static const bool DEFAULT_REST_ENABLE = false;
static constexpr bool DEFAULT_CHRONIK = false;

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
    return AbsPathForConfigVal(args,
                               args.GetPathArg("-pid", BITCOIN_PID_FILENAME));
}

[[nodiscard]] static bool CreatePidFile(const ArgsManager &args) {
    std::ofstream file{GetPidFile(args)};
    if (file) {
#ifdef WIN32
        tfm::format(file, "%d\n", GetCurrentProcessId());
#else
        tfm::format(file, "%d\n", getpid());
#endif
        return true;
    } else {
        return InitError(strprintf(_("Unable to create the PID file '%s': %s"),
                                   fs::PathToString(GetPidFile(args)),
                                   SysErrorString(errno)));
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
    if (g_coin_stats_index) {
        g_coin_stats_index->Interrupt();
    }
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
    if (node.connman) {
        node.connman->Stop();
    }

    StopTorControl();

    // After everything has been shut down, but before things get flushed, stop
    // the CScheduler/checkqueue, scheduler and load block thread.
    if (node.scheduler) {
        node.scheduler->stop();
    }
    if (node.chainman && node.chainman->m_load_block.joinable()) {
        node.chainman->m_load_block.join();
    }
    StopScriptCheckWorkerThreads();

    // After the threads that potentially access these pointers have been
    // stopped, destruct and reset all to nullptr.
    node.peerman.reset();

    // Destroy various global instances
    g_avalanche.reset();
    node.connman.reset();
    node.banman.reset();
    node.addrman.reset();

    if (node.mempool && node.mempool->GetLoadTried() &&
        ShouldPersistMempool(*node.args)) {
        DumpMempool(*node.mempool, MempoolPath(*node.args));
    }

    // FlushStateToDisk generates a ChainStateFlushed callback, which we should
    // avoid missing
    if (node.chainman) {
        LOCK(cs_main);
        for (Chainstate *chainstate : node.chainman->GetAll()) {
            if (chainstate->CanFlushToDisk()) {
                chainstate->ForceFlushStateToDisk();
            }
        }
    }

    // After there are no more peers/RPC left to give us new data which may
    // generate CValidationInterface callbacks, flush them...
    GetMainSignals().FlushBackgroundCallbacks();

#if ENABLE_CHRONIK
    if (node.args->GetBoolArg("-chronik", DEFAULT_CHRONIK)) {
        chronik::Stop();
    }
#endif

    // Stop and delete all indexes only after flushing background callbacks.
    if (g_txindex) {
        g_txindex->Stop();
        g_txindex.reset();
    }
    if (g_coin_stats_index) {
        g_coin_stats_index->Stop();
        g_coin_stats_index.reset();
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
        for (Chainstate *chainstate : node.chainman->GetAll()) {
            if (chainstate->CanFlushToDisk()) {
                chainstate->ForceFlushStateToDisk();
                chainstate->ResetCoinsViews();
            }
        }
    }
    for (const auto &client : node.chain_clients) {
        client->stop();
    }

#if ENABLE_ZMQ
    if (g_zmq_notification_interface) {
        UnregisterValidationInterface(g_zmq_notification_interface.get());
        g_zmq_notification_interface.reset();
    }
#endif

    node.chain_clients.clear();
    UnregisterAllValidationInterfaces();
    GetMainSignals().UnregisterBackgroundSignalScheduler();
    init::UnsetGlobals();
    node.mempool.reset();
    node.chainman.reset();
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

    init::AddLoggingArgs(argsman);

    const auto defaultBaseParams =
        CreateBaseChainParams(CBaseChainParams::MAIN);
    const auto testnetBaseParams =
        CreateBaseChainParams(CBaseChainParams::TESTNET);
    const auto regtestBaseParams =
        CreateBaseChainParams(CBaseChainParams::REGTEST);
    const auto defaultChainParams =
        CreateChainParams(argsman, CBaseChainParams::MAIN);
    const auto testnetChainParams =
        CreateChainParams(argsman, CBaseChainParams::TESTNET);
    const auto regtestChainParams =
        CreateChainParams(argsman, CBaseChainParams::REGTEST);

    // Hidden Options
    std::vector<std::string> hidden_args = {
        "-dbcrashratio",
        "-forcecompactdb",
        "-maxaddrtosend",
        "-parkdeepreorg",
        "-automaticunparking",
        "-replayprotectionactivationtime",
        "-enableminerfund",
        "-chronikallowpause",
        "-chronikcors",
        // GUI args. These will be overwritten by SetupUIArgs for the GUI
        "-allowselfsignedrootcertificates",
        "-choosedatadir",
        "-lang=<lang>",
        "-min",
        "-resetguisettings",
        "-rootcertificates=<file>",
        "-splash",
        "-uiplatform",
        // TODO remove after the Nov. 2024 upgrade
        "-augustoactivationtime",
    };

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
    argsman.AddArg("-fastprune",
                   "Use smaller block files and lower minimum prune height for "
                   "testing purposes",
                   ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
                   OptionsCategory::DEBUG_TEST);
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
    argsman.AddArg("-coinstatsindex",
                   strprintf("Maintain coinstats index used by the "
                             "gettxoutsetinfo RPC (default: %u)",
                             DEFAULT_COINSTATSINDEX),
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
        "-includeconf=<file>",
        "Specify additional configuration file, relative to the -datadir path "
        "(only useable from configuration file, not command line)",
        ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsman.AddArg("-loadblock=<file>",
                   "Imports blocks from external file on startup",
                   ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsman.AddArg("-maxmempool=<n>",
                   strprintf("Keep the transaction memory pool below <n> "
                             "megabytes (default: %u)",
                             DEFAULT_MAX_MEMPOOL_SIZE_MB),
                   ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsman.AddArg("-maxorphantx=<n>",
                   strprintf("Keep at most <n> unconnectable transactions in "
                             "memory (default: %u)",
                             DEFAULT_MAX_ORPHAN_TRANSACTIONS),
                   ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsman.AddArg("-mempoolexpiry=<n>",
                   strprintf("Do not keep transactions in the mempool longer "
                             "than <n> hours (default: %u)",
                             DEFAULT_MEMPOOL_EXPIRY_HOURS),
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
                  "This mode is incompatible with -txindex, -coinstatsindex "
                  "and -rescan. Warning: Reverting this setting requires "
                  "re-downloading the entire blockchain. (default: 0 = disable "
                  "pruning blocks, 1 = allow manual pruning via RPC, >=%u = "
                  "automatically prune block files to stay under the specified "
                  "target size in MiB)",
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
#if HAVE_SYSTEM
    argsman.AddArg("-startupnotify=<cmd>", "Execute command on startup.",
                   ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
#endif
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
#if ENABLE_CHRONIK
    argsman.AddArg(
        "-chronik",
        strprintf("Enable the Chronik indexer, which can be read via a "
                  "dedicated HTTP/Protobuf interface (default: %d)",
                  DEFAULT_CHRONIK),
        ArgsManager::ALLOW_BOOL, OptionsCategory::CHRONIK);
    argsman.AddArg(
        "-chronikbind=<addr>[:port]",
        strprintf(
            "Bind the Chronik indexer to the given address to listen for "
            "HTTP/Protobuf connections to access the index. Unlike the "
            "JSON-RPC, it's ok to have this publicly exposed on the internet. "
            "This option can be specified multiple times (default: %s; default "
            "port: %u, testnet: %u, regtest: %u)",
            Join(chronik::DEFAULT_BINDS, ", "),
            defaultBaseParams->ChronikPort(), testnetBaseParams->ChronikPort(),
            regtestBaseParams->ChronikPort()),
        ArgsManager::ALLOW_STRING | ArgsManager::NETWORK_ONLY,
        OptionsCategory::CHRONIK);
    argsman.AddArg("-chroniktokenindex",
                   "Enable token indexing in Chronik (default: 1)",
                   ArgsManager::ALLOW_BOOL, OptionsCategory::CHRONIK);
    argsman.AddArg("-chroniklokadidindex",
                   "Enable LOKAD ID indexing in Chronik (default: 1)",
                   ArgsManager::ALLOW_BOOL, OptionsCategory::CHRONIK);
    argsman.AddArg("-chronikreindex",
                   "Reindex the Chronik indexer from genesis, but leave the "
                   "other indexes untouched",
                   ArgsManager::ALLOW_BOOL, OptionsCategory::CHRONIK);
    argsman.AddArg(
        "-chroniktxnumcachebuckets",
        strprintf(
            "Tuning param of the TxNumCache, specifies how many buckets "
            "to use on the belt. Caution against setting this too high, "
            "it may slow down indexing. Set to 0 to disable. (default: %d)",
            chronik::DEFAULT_TX_NUM_CACHE_BUCKETS),
        ArgsManager::ALLOW_INT, OptionsCategory::CHRONIK);
    argsman.AddArg(
        "-chroniktxnumcachebucketsize",
        strprintf(
            "Tuning param of the TxNumCache, specifies the size of each bucket "
            "on the belt. Unlike the number of buckets, this may be increased "
            "without much danger of slowing the indexer down. The total cache "
            "size will be `num_buckets * bucket_size * 40B`, so by default the "
            "cache will require %dkB of memory. (default: %d)",
            chronik::DEFAULT_TX_NUM_CACHE_BUCKETS *
                chronik::DEFAULT_TX_NUM_CACHE_BUCKET_SIZE * 40 / 1000,
            chronik::DEFAULT_TX_NUM_CACHE_BUCKET_SIZE),
        ArgsManager::ALLOW_INT, OptionsCategory::CHRONIK);
    argsman.AddArg("-chronikperfstats",
                   "Output some performance statistics (e.g. num cache hits, "
                   "seconds spent) into a <datadir>/perf folder. (default: 0)",
                   ArgsManager::ALLOW_BOOL, OptionsCategory::CHRONIK);
#endif
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
    argsman.AddArg(
        "-bind=<addr>[:<port>][=onion]",
        strprintf("Bind to given address and always listen on it (default: "
                  "0.0.0.0). Use [host]:port notation for IPv6. Append =onion "
                  "to tag any incoming connections to that address and port as "
                  "incoming Tor connections (default: 127.0.0.1:%u=onion, "
                  "testnet: 127.0.0.1:%u=onion, regtest: 127.0.0.1:%u=onion)",
                  defaultBaseParams->OnionServiceTargetPort(),
                  testnetBaseParams->OnionServiceTargetPort(),
                  regtestBaseParams->OnionServiceTargetPort()),
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
        strprintf(
            "Query for peer addresses via DNS lookup, if low on addresses "
            "(default: %u unless -connect used)",
            DEFAULT_DNSSEED),
        ArgsManager::ALLOW_BOOL, OptionsCategory::CONNECTION);
    argsman.AddArg("-externalip=<ip>", "Specify your own public address",
                   ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsman.AddArg(
        "-fixedseeds",
        strprintf(
            "Allow fixed seeds if DNS seeds don't provide peers (default: %u)",
            DEFAULT_FIXEDSEEDS),
        ArgsManager::ALLOW_BOOL, OptionsCategory::CONNECTION);
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
    argsman.AddArg("-i2psam=<ip:port>",
                   "I2P SAM proxy to reach I2P peers and accept I2P "
                   "connections (default: none)",
                   ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsman.AddArg(
        "-i2pacceptincoming",
        "If set and -i2psam is also set then incoming I2P connections are "
        "accepted via the SAM proxy. If this is not set but -i2psam is set "
        "then only outgoing connections will be made to the I2P network. "
        "Ignored if -i2psam is not set. Listening for incoming I2P connections "
        "is done through the SAM proxy, not by binding to a local address and "
        "port (default: 1)",
        ArgsManager::ALLOW_BOOL, OptionsCategory::CONNECTION);

    argsman.AddArg(
        "-onlynet=<net>",
        "Make outgoing connections only through network <net> (" +
            Join(GetNetworkNames(), ", ") +
            "). Incoming connections are not affected by this option. This "
            "option can be specified multiple times to allow multiple "
            "networks. Warning: if it is used with non-onion networks "
            "and the -onion or -proxy option is set, then outbound onion "
            "connections will still be made; use -noonion or -onion=0 to "
            "disable outbound onion connections in this case",
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
    // TODO: remove the sentence "Nodes not using ... incoming connections."
    // once the changes from https://github.com/bitcoin/bitcoin/pull/23542 have
    // become widespread.
    argsman.AddArg("-port=<port>",
                   strprintf("Listen for connections on <port>. Nodes not "
                             "using the default ports (default: %u, "
                             "testnet: %u, regtest: %u) are unlikely to get "
                             "incoming connections.  Not relevant for I2P (see "
                             "doc/i2p.md).",
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
    argsman.AddArg(
        "-networkactive",
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
#ifdef USE_NATPMP
    argsman.AddArg(
        "-natpmp",
        strprintf("Use NAT-PMP to map the listening port (default: %s)",
                  DEFAULT_NATPMP ? "1 when listening and no -proxy" : "0"),
        ArgsManager::ALLOW_BOOL, OptionsCategory::CONNECTION);
#else
    hidden_args.emplace_back("-natpmp");
#endif // USE_NATPMP
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
    argsman.AddArg("-zmqpubsequence=<address>",
                   "Enable publish hash block and tx sequence in <address>",
                   ArgsManager::ALLOW_ANY, OptionsCategory::ZMQ);
    argsman.AddArg(
        "-zmqpubhashblockhwm=<n>",
        strprintf("Set publish hash block outbound message high water "
                  "mark (default: %d)",
                  CZMQAbstractNotifier::DEFAULT_ZMQ_SNDHWM),
        ArgsManager::ALLOW_ANY, OptionsCategory::ZMQ);
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
        ArgsManager::ALLOW_ANY, OptionsCategory::ZMQ);
    argsman.AddArg(
        "-zmqpubrawtxhwm=<n>",
        strprintf("Set publish raw transaction outbound message high "
                  "water mark (default: %d)",
                  CZMQAbstractNotifier::DEFAULT_ZMQ_SNDHWM),
        ArgsManager::ALLOW_ANY, OptionsCategory::ZMQ);
    argsman.AddArg("-zmqpubsequencehwm=<n>",
                   strprintf("Set publish hash sequence message high water mark"
                             " (default: %d)",
                             CZMQAbstractNotifier::DEFAULT_ZMQ_SNDHWM),
                   ArgsManager::ALLOW_ANY, OptionsCategory::ZMQ);
#else
    hidden_args.emplace_back("-zmqpubhashblock=<address>");
    hidden_args.emplace_back("-zmqpubhashtx=<address>");
    hidden_args.emplace_back("-zmqpubrawblock=<address>");
    hidden_args.emplace_back("-zmqpubrawtx=<address>");
    hidden_args.emplace_back("-zmqpubsequence=<n>");
    hidden_args.emplace_back("-zmqpubhashblockhwm=<n>");
    hidden_args.emplace_back("-zmqpubhashtxhwm=<n>");
    hidden_args.emplace_back("-zmqpubrawblockhwm=<n>");
    hidden_args.emplace_back("-zmqpubrawtxhwm=<n>");
    hidden_args.emplace_back("-zmqpubsequencehwm=<n>");
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
    argsman.AddArg("-checkaddrman=<n>",
                   strprintf("Run addrman consistency checks every <n> "
                             "operations. Use 0 to disable. (default: %u)",
                             DEFAULT_ADDRMAN_CONSISTENCY_CHECKS),
                   ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
                   OptionsCategory::DEBUG_TEST);
    argsman.AddArg(
        "-checkmempool=<n>",
        strprintf("Run mempool consistency checks every <n> transactions. Use "
                  "0 to disable. (default: %u, regtest: %u)",
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
    argsman.AddArg("-addrmantest", "Allows to test address relay on localhost",
                   ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
                   OptionsCategory::DEBUG_TEST);
    argsman.AddArg("-capturemessages", "Capture all P2P messages to disk",
                   ArgsManager::ALLOW_BOOL | ArgsManager::DEBUG_ONLY,
                   OptionsCategory::DEBUG_TEST);
    argsman.AddArg("-mocktime=<n>",
                   "Replace actual time with " + UNIX_EPOCH_TIME +
                       " (default: 0)",
                   ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
                   OptionsCategory::DEBUG_TEST);
    argsman.AddArg(
        "-maxsigcachesize=<n>",
        strprintf("Limit size of signature cache to <n> MiB (default: %u)",
                  DEFAULT_MAX_SIG_CACHE_BYTES >> 20),
        ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
        OptionsCategory::DEBUG_TEST);
    argsman.AddArg(
        "-maxscriptcachesize=<n>",
        strprintf("Limit size of script cache to <n> MiB (default: %u)",
                  DEFAULT_MAX_SCRIPT_CACHE_BYTES >> 20),
        ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
        OptionsCategory::DEBUG_TEST);
    argsman.AddArg("-maxtipage=<n>",
                   strprintf("Maximum tip age in seconds to consider node in "
                             "initial block download (default: %u)",
                             Ticks<std::chrono::seconds>(DEFAULT_MAX_TIP_AGE)),
                   ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
                   OptionsCategory::DEBUG_TEST);

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

    argsman.AddArg(
        "-bytespersigcheck",
        strprintf("Equivalent bytes per sigCheck in transactions for relay and "
                  "mining (default: %u).",
                  DEFAULT_BYTES_PER_SIGCHECK),
        ArgsManager::ALLOW_ANY, OptionsCategory::NODE_RELAY);
    argsman.AddArg(
        "-bytespersigop",
        strprintf("DEPRECATED: Equivalent bytes per sigCheck in transactions "
                  "for relay and mining (default: %u). This has been "
                  "deprecated since v0.26.8 and will be removed in the future, "
                  "please use -bytespersigcheck instead.",
                  DEFAULT_BYTES_PER_SIGCHECK),
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
        "-rpcdoccheck",
        strprintf("Throw a non-fatal error at runtime if the documentation for "
                  "an RPC is incorrect (default: %u)",
                  DEFAULT_RPC_DOC_CHECK),
        ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY, OptionsCategory::RPC);
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

#if HAVE_DECL_FORK
    argsman.AddArg("-daemon",
                   strprintf("Run in the background as a daemon and accept "
                             "commands (default: %d)",
                             DEFAULT_DAEMON),
                   ArgsManager::ALLOW_BOOL, OptionsCategory::OPTIONS);
    argsman.AddArg("-daemonwait",
                   strprintf("Wait for initialization to be finished before "
                             "exiting. This implies -daemon (default: %d)",
                             DEFAULT_DAEMONWAIT),
                   ArgsManager::ALLOW_BOOL, OptionsCategory::OPTIONS);
#else
    hidden_args.emplace_back("-daemon");
    hidden_args.emplace_back("-daemonwait");
#endif

    // Avalanche options.
    argsman.AddArg("-avalanche",
                   strprintf("Enable the avalanche feature (default: %u)",
                             AVALANCHE_DEFAULT_ENABLED),
                   ArgsManager::ALLOW_ANY, OptionsCategory::AVALANCHE);
    argsman.AddArg(
        "-avalanchestakingrewards",
        strprintf("Enable the avalanche staking rewards feature (default: %u, "
                  "testnet: %u, regtest: %u)",
                  defaultChainParams->GetConsensus().enableStakingRewards,
                  testnetChainParams->GetConsensus().enableStakingRewards,
                  regtestChainParams->GetConsensus().enableStakingRewards),
        ArgsManager::ALLOW_BOOL, OptionsCategory::AVALANCHE);
    argsman.AddArg("-avalancheconflictingproofcooldown",
                   strprintf("Mandatory cooldown before a proof conflicting "
                             "with an already registered one can be considered "
                             "in seconds (default: %u)",
                             AVALANCHE_DEFAULT_CONFLICTING_PROOF_COOLDOWN),
                   ArgsManager::ALLOW_INT, OptionsCategory::AVALANCHE);
    argsman.AddArg("-avalanchepeerreplacementcooldown",
                   strprintf("Mandatory cooldown before a peer can be replaced "
                             "in seconds (default: %u)",
                             AVALANCHE_DEFAULT_PEER_REPLACEMENT_COOLDOWN),
                   ArgsManager::ALLOW_INT, OptionsCategory::AVALANCHE);
    argsman.AddArg(
        "-avaminquorumstake",
        strprintf(
            "Minimum amount of known stake for a usable quorum (default: %s)",
            FormatMoney(AVALANCHE_DEFAULT_MIN_QUORUM_STAKE)),
        ArgsManager::ALLOW_ANY, OptionsCategory::AVALANCHE);
    argsman.AddArg(
        "-avaminquorumconnectedstakeratio",
        strprintf("Minimum proportion of known stake we"
                  " need nodes for to have a usable quorum (default: %s)",
                  AVALANCHE_DEFAULT_MIN_QUORUM_CONNECTED_STAKE_RATIO),
        ArgsManager::ALLOW_STRING, OptionsCategory::AVALANCHE);
    argsman.AddArg(
        "-avaminavaproofsnodecount",
        strprintf("Minimum number of node that needs to send us an avaproofs"
                  " message before we consider we have a usable quorum"
                  " (default: %s)",
                  AVALANCHE_DEFAULT_MIN_AVAPROOFS_NODE_COUNT),
        ArgsManager::ALLOW_INT, OptionsCategory::AVALANCHE);
    argsman.AddArg(
        "-avastalevotethreshold",
        strprintf("Number of avalanche votes before a voted item goes stale "
                  "when voting confidence is low (default: %u)",
                  AVALANCHE_VOTE_STALE_THRESHOLD),
        ArgsManager::ALLOW_INT, OptionsCategory::AVALANCHE);
    argsman.AddArg(
        "-avastalevotefactor",
        strprintf(
            "Factor affecting the number of avalanche votes before a voted "
            "item goes stale when voting confidence is high (default: %u)",
            AVALANCHE_VOTE_STALE_FACTOR),
        ArgsManager::ALLOW_INT, OptionsCategory::AVALANCHE);
    argsman.AddArg("-avacooldown",
                   strprintf("Mandatory cooldown between two avapoll in "
                             "milliseconds (default: %u)",
                             AVALANCHE_DEFAULT_COOLDOWN),
                   ArgsManager::ALLOW_ANY, OptionsCategory::AVALANCHE);
    argsman.AddArg(
        "-avatimeout",
        strprintf("Avalanche query timeout in milliseconds (default: %u)",
                  AVALANCHE_DEFAULT_QUERY_TIMEOUT.count()),
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
        "-avaproofstakeutxoconfirmations",
        strprintf(
            "Minimum number of confirmations before a stake utxo is mature"
            " enough to be included into a proof. Utxos in the mempool are not "
            "accepted (i.e this value must be greater than 0) (default: %s)",
            AVALANCHE_DEFAULT_STAKE_UTXO_CONFIRMATIONS),
        ArgsManager::ALLOW_INT, OptionsCategory::HIDDEN);
    argsman.AddArg("-avaproofstakeutxodustthreshold",
                   strprintf("Minimum value each stake utxo must have to be "
                             "considered valid (default: %s)",
                             avalanche::PROOF_DUST_THRESHOLD),
                   ArgsManager::ALLOW_ANY, OptionsCategory::HIDDEN);
    argsman.AddArg("-avamasterkey",
                   "Master key associated with the proof. If a proof is "
                   "required, this is mandatory.",
                   ArgsManager::ALLOW_ANY | ArgsManager::SENSITIVE,
                   OptionsCategory::AVALANCHE);
    argsman.AddArg("-avasessionkey", "Avalanche session key (default: random)",
                   ArgsManager::ALLOW_ANY | ArgsManager::SENSITIVE,
                   OptionsCategory::HIDDEN);
    argsman.AddArg(
        "-maxavalancheoutbound",
        strprintf(
            "Set the maximum number of avalanche outbound peers to connect to. "
            "Note that this option takes precedence over the -maxconnections "
            "option (default: %u).",
            DEFAULT_MAX_AVALANCHE_OUTBOUND_CONNECTIONS),
        ArgsManager::ALLOW_INT, OptionsCategory::AVALANCHE);
    argsman.AddArg(
        "-persistavapeers",
        strprintf("Whether to save the avalanche peers upon shutdown and load "
                  "them upon startup (default: %u).",
                  DEFAULT_PERSIST_AVAPEERS),
        ArgsManager::ALLOW_BOOL, OptionsCategory::AVALANCHE);

    hidden_args.emplace_back("-avalanchepreconsensus");

    // Add the hidden options
    argsman.AddHiddenArgs(hidden_args);
}

static bool fHaveGenesis = false;
static GlobalMutex g_genesis_wait_mutex;
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

#if HAVE_SYSTEM
static void StartupNotify(const ArgsManager &args) {
    std::string cmd = args.GetArg("-startupnotify", "");
    if (!cmd.empty()) {
        std::thread t(runCommand, cmd);
        // thread runs free
        t.detach();
    }
}
#endif

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
        StartREST(&node);
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
        // to protect privacy, do not map ports when a proxy is set. The user
        // may still specify -listen=1 to listen locally, so don't rely on this
        // happening through -listen below.
        if (args.SoftSetBoolArg("-upnp", false)) {
            LogPrintf(
                "%s: parameter interaction: -proxy set -> setting -upnp=0\n",
                __func__);
        }
        if (args.SoftSetBoolArg("-natpmp", false)) {
            LogPrintf(
                "%s: parameter interaction: -proxy set -> setting -natpmp=0\n",
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
        if (args.SoftSetBoolArg("-natpmp", false)) {
            LogPrintf(
                "%s: parameter interaction: -listen=0 -> setting -natpmp=0\n",
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
        if (args.SoftSetBoolArg("-i2pacceptincoming", false)) {
            LogPrintf("%s: parameter interaction: -listen=0 -> setting "
                      "-i2pacceptincoming=0\n",
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

    // If avalanche is set, soft set all the feature flags accordingly.
    if (args.IsArgSet("-avalanche")) {
        const bool fAvalanche =
            args.GetBoolArg("-avalanche", AVALANCHE_DEFAULT_ENABLED);
        args.SoftSetBoolArg("-automaticunparking", !fAvalanche);
    }
}

/**
 * Initialize global loggers.
 *
 * Note that this is called very early in the process lifetime, so you should be
 * careful about what global state you rely on here.
 */
void InitLogging(const ArgsManager &args) {
    init::SetLoggingOptions(args);
    init::LogPackageVersion();
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

bool AppInitBasicSetup(const ArgsManager &args) {
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
    if (!InitShutdownState()) {
        return InitError(
            Untranslated("Initializing wait-for-shutdown state failed."));
    }

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

    if (!fs::is_directory(args.GetBlocksDirPath())) {
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
    if (args.GetBoolArg("-peerblockfilters", DEFAULT_PEERBLOCKFILTERS)) {
        if (g_enabled_filter_types.count(BlockFilterType::BASIC) != 1) {
            return InitError(
                _("Cannot set -peerblockfilters without -blockfilterindex."));
        }

        nLocalServices = ServiceFlags(nLocalServices | NODE_COMPACT_FILTERS);
    }

    // if using block pruning, then disallow txindex, coinstatsindex and chronik
    if (args.GetIntArg("-prune", 0)) {
        if (args.GetBoolArg("-txindex", DEFAULT_TXINDEX)) {
            return InitError(_("Prune mode is incompatible with -txindex."));
        }
        if (args.GetBoolArg("-coinstatsindex", DEFAULT_COINSTATSINDEX)) {
            return InitError(
                _("Prune mode is incompatible with -coinstatsindex."));
        }
        if (args.GetBoolArg("-chronik", DEFAULT_CHRONIK)) {
            return InitError(_("Prune mode is incompatible with -chronik."));
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
        args.GetIntArg("-maxconnections", DEFAULT_MAX_PEER_CONNECTIONS);
    nMaxConnections = std::max(nUserMaxConnections, 0);

    // -maxavalancheoutbound takes precedence over -maxconnections
    const int maxAvalancheOutbound = args.GetIntArg(
        "-maxavalancheoutbound", DEFAULT_MAX_AVALANCHE_OUTBOUND_CONNECTIONS);
    const bool fAvalanche =
        args.GetBoolArg("-avalanche", AVALANCHE_DEFAULT_ENABLED);
    if (fAvalanche && maxAvalancheOutbound > nMaxConnections) {
        nMaxConnections = std::max(maxAvalancheOutbound, nMaxConnections);
        // Indicate the value set by the user
        LogPrintf("Increasing -maxconnections from %d to %d to comply with "
                  "-maxavalancheoutbound\n",
                  nUserMaxConnections, nMaxConnections);
    }

    // Trim requested connection counts, to fit into system limitations
    // <int> in std::min<int>(...) to work around FreeBSD compilation issue
    // described in #2695
    nFD = RaiseFileDescriptorLimit(
        nMaxConnections + nBind + MIN_CORE_FILEDESCRIPTORS +
        MAX_ADDNODE_CONNECTIONS + NUM_FDS_MESSAGE_CAPTURE);
#ifdef USE_POLL
    int fd_max = nFD;
#else
    int fd_max = FD_SETSIZE;
#endif
    nMaxConnections = std::max(
        std::min<int>(nMaxConnections,
                      fd_max - nBind - MIN_CORE_FILEDESCRIPTORS -
                          MAX_ADDNODE_CONNECTIONS - NUM_FDS_MESSAGE_CAPTURE),
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
    init::SetLoggingCategories(args);

    // Configure excessive block size.
    const int64_t nProposedExcessiveBlockSize =
        args.GetIntArg("-excessiveblocksize", DEFAULT_MAX_BLOCK_SIZE);
    if (nProposedExcessiveBlockSize <= 0 ||
        !config.SetMaxBlockSize(nProposedExcessiveBlockSize)) {
        return InitError(
            _("Excessive block size must be > 1,000,000 bytes (1MB)"));
    }

    // Check blockmaxsize does not exceed maximum accepted block size.
    const int64_t nProposedMaxGeneratedBlockSize =
        args.GetIntArg("-blockmaxsize", DEFAULT_MAX_GENERATED_BLOCK_SIZE);
    if (nProposedMaxGeneratedBlockSize <= 0) {
        return InitError(_("Max generated block size must be greater than 0"));
    }
    if (uint64_t(nProposedMaxGeneratedBlockSize) > config.GetMaxBlockSize()) {
        return InitError(_("Max generated block size (blockmaxsize) cannot "
                           "exceed the excessive block size "
                           "(excessiveblocksize)"));
    }

    nConnectTimeout = args.GetIntArg("-timeout", DEFAULT_CONNECT_TIMEOUT);
    if (nConnectTimeout <= 0) {
        nConnectTimeout = DEFAULT_CONNECT_TIMEOUT;
    }

    peer_connect_timeout =
        args.GetIntArg("-peertimeout", DEFAULT_PEER_CONNECT_TIMEOUT);
    if (peer_connect_timeout <= 0) {
        return InitError(Untranslated(
            "peertimeout cannot be configured with a negative value."));
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

    nBytesPerSigCheck =
        args.IsArgSet("-bytespersigcheck")
            ? args.GetIntArg("-bytespersigcheck", nBytesPerSigCheck)
            : args.GetIntArg("-bytespersigop", nBytesPerSigCheck);

    if (!g_wallet_init_interface.ParameterInteraction()) {
        return false;
    }

    // Option to startup with mocktime set (used for regression testing):
    SetMockTime(args.GetIntArg("-mocktime", 0)); // SetMockTime(0) is a no-op

    if (args.GetBoolArg("-peerbloomfilters", DEFAULT_PEERBLOOMFILTERS)) {
        nLocalServices = ServiceFlags(nLocalServices | NODE_BLOOM);
    }

    if (args.IsArgSet("-proxy") && args.GetArg("-proxy", "").empty()) {
        return InitError(_(
            "No proxy server specified. Use -proxy=<ip> or -proxy=<ip:port>."));
    }

    // Avalanche parameters
    const int64_t stakeUtxoMinConfirmations =
        args.GetIntArg("-avaproofstakeutxoconfirmations",
                       AVALANCHE_DEFAULT_STAKE_UTXO_CONFIRMATIONS);

    if (!chainparams.IsTestChain() &&
        stakeUtxoMinConfirmations !=
            AVALANCHE_DEFAULT_STAKE_UTXO_CONFIRMATIONS) {
        return InitError(_("Avalanche stake UTXO minimum confirmations can "
                           "only be set on test chains."));
    }

    if (stakeUtxoMinConfirmations <= 0) {
        return InitError(_("Avalanche stake UTXO minimum confirmations must be "
                           "a positive integer."));
    }

    if (args.IsArgSet("-avaproofstakeutxodustthreshold")) {
        Amount amount = Amount::zero();
        auto parsed = ParseMoney(
            args.GetArg("-avaproofstakeutxodustthreshold", ""), amount);
        if (!parsed || Amount::zero() == amount) {
            return InitError(AmountErrMsg(
                "avaproofstakeutxodustthreshold",
                args.GetArg("-avaproofstakeutxodustthreshold", "")));
        }

        if (!chainparams.IsTestChain() &&
            amount != avalanche::PROOF_DUST_THRESHOLD) {
            return InitError(_("Avalanche stake UTXO dust threshold can "
                               "only be set on test chains."));
        }
    }

    // This is a staking node
    if (fAvalanche && args.IsArgSet("-avaproof")) {
        if (!args.GetBoolArg("-listen", true)) {
            return InitError(_("Running a staking node requires accepting "
                               "inbound connections. Please enable -listen."));
        }
        if (args.IsArgSet("-proxy")) {
            return InitError(_("Running a staking node behind a proxy is not "
                               "supported. Please disable -proxy."));
        }
        if (args.IsArgSet("-i2psam")) {
            return InitError(_("Running a staking node behind I2P is not "
                               "supported. Please disable -i2psam."));
        }
        if (args.IsArgSet("-onlynet")) {
            return InitError(
                _("Restricting the outbound network is not supported when "
                  "running a staking node. Please disable -onlynet."));
        }
    }

    // Also report errors from parsing before daemonization
    {
        KernelNotifications notifications{};
        ChainstateManager::Options chainman_opts_dummy{
            .config = config,
            .datadir = args.GetDataDirNet(),
            .notifications = notifications,
        };
        if (const auto error{ApplyArgsManOptions(args, chainman_opts_dummy)}) {
            return InitError(*error);
        }
        BlockManager::Options blockman_opts_dummy{
            .chainparams = chainman_opts_dummy.config.GetChainParams(),
            .blocks_dir = args.GetBlocksDirPath(),
        };
        if (const auto error{ApplyArgsManOptions(args, blockman_opts_dummy)}) {
            return InitError(*error);
        }
    }

    return true;
}

static bool LockDataDirectory(bool probeOnly) {
    // Make sure only a single Bitcoin process is using the data directory.
    fs::path datadir = gArgs.GetDataDirNet();
    if (!DirIsWritable(datadir)) {
        return InitError(strprintf(
            _("Cannot write to data directory '%s'; check permissions."),
            fs::PathToString(datadir)));
    }
    if (!LockDirectory(datadir, ".lock", probeOnly)) {
        return InitError(strprintf(_("Cannot obtain a lock on data directory "
                                     "%s. %s is probably already running."),
                                   fs::PathToString(datadir), PACKAGE_NAME));
    }
    return true;
}

bool AppInitSanityChecks() {
    // Step 4: sanity checks

    init::SetGlobals();

    // Sanity check
    if (!init::SanityChecks()) {
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
    if (!init::StartLogging(args)) {
        // Detailed error printed inside StartLogging().
        return false;
    }

    LogPrintf("Using at most %i automatic connections (%i file descriptors "
              "available)\n",
              nMaxConnections, nFD);

    // Warn about relative -datadir path.
    if (args.IsArgSet("-datadir") &&
        !args.GetPathArg("-datadir").is_absolute()) {
        LogPrintf("Warning: relative datadir option '%s' specified, which will "
                  "be interpreted relative to the current working directory "
                  "'%s'. This is fragile, because if bitcoin is started in the "
                  "future from a different location, it will be unable to "
                  "locate the current data files. There could also be data "
                  "loss if bitcoin is started while in a temporary "
                  "directory.\n",
                  args.GetArg("-datadir", ""),
                  fs::PathToString(fs::current_path()));
    }

    ValidationCacheSizes validation_cache_sizes{};
    ApplyArgsManOptions(args, validation_cache_sizes);

    if (!InitSignatureCache(validation_cache_sizes.signature_cache_bytes)) {
        return InitError(strprintf(
            _("Unable to allocate memory for -maxsigcachesize: '%s' MiB"),
            args.GetIntArg("-maxsigcachesize",
                           DEFAULT_MAX_SIG_CACHE_BYTES >> 20)));
    }
    if (!InitScriptExecutionCache(
            validation_cache_sizes.script_execution_cache_bytes)) {
        return InitError(strprintf(
            _("Unable to allocate memory for -maxscriptcachesize: '%s' MiB"),
            args.GetIntArg("-maxscriptcachesize",
                           DEFAULT_MAX_SCRIPT_CACHE_BYTES >> 20)));
    }

    int script_threads = args.GetIntArg("-par", DEFAULT_SCRIPTCHECK_THREADS);
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
        StartScriptCheckWorkerThreads(script_threads);
    }

    assert(!node.scheduler);
    node.scheduler = std::make_unique<CScheduler>();

    // Start the lightweight task scheduler thread
    node.scheduler->m_service_thread =
        std::thread(&util::TraceThread, "scheduler",
                    [&] { node.scheduler->serviceQueue(); });

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

    fListen = args.GetBoolArg("-listen", DEFAULT_LISTEN);
    fDiscover = args.GetBoolArg("-discover", true);

    {
        // Initialize addrman
        assert(!node.addrman);

        // Read asmap file if configured
        std::vector<bool> asmap;
        if (args.IsArgSet("-asmap")) {
            fs::path asmap_path =
                args.GetPathArg("-asmap", DEFAULT_ASMAP_FILENAME);
            if (!asmap_path.is_absolute()) {
                asmap_path = args.GetDataDirNet() / asmap_path;
            }
            if (!fs::exists(asmap_path)) {
                InitError(strprintf(_("Could not find asmap file %s"),
                                    fs::quoted(fs::PathToString(asmap_path))));
                return false;
            }
            asmap = DecodeAsmap(asmap_path);
            if (asmap.size() == 0) {
                InitError(strprintf(_("Could not parse asmap file %s"),
                                    fs::quoted(fs::PathToString(asmap_path))));
                return false;
            }
            const uint256 asmap_version = SerializeHash(asmap);
            LogPrintf("Using asmap version %s for IP bucketing\n",
                      asmap_version.ToString());
        } else {
            LogPrintf("Using /16 prefix for IP bucketing\n");
        }

        uiInterface.InitMessage(_("Loading P2P addresses...").translated);
        auto addrman{LoadAddrman(chainparams, asmap, args)};
        if (!addrman) {
            return InitError(util::ErrorString(addrman));
        }
        node.addrman = std::move(*addrman);
    }

    assert(!node.banman);
    node.banman = std::make_unique<BanMan>(
        args.GetDataDirNet() / "banlist.dat", config.GetChainParams(),
        &uiInterface, args.GetIntArg("-bantime", DEFAULT_MISBEHAVING_BANTIME));
    assert(!node.connman);
    node.connman = std::make_unique<CConnman>(
        config, GetRand<uint64_t>(), GetRand<uint64_t>(), *node.addrman,
        args.GetBoolArg("-networkactive", true));

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

    for (const std::string &strAddr : args.GetArgs("-externalip")) {
        CService addrLocal;
        if (Lookup(strAddr, addrLocal, GetListenPort(), fNameLookup) &&
            addrLocal.IsValid()) {
            AddLocal(addrLocal, LOCAL_MANUAL);
        } else {
            return InitError(ResolveErrMsg("externalip", strAddr));
        }
    }

#if ENABLE_ZMQ
    g_zmq_notification_interface = CZMQNotificationInterface::Create(
        [&chainman = node.chainman](CBlock &block, const CBlockIndex &index) {
            assert(chainman);
            return chainman->m_blockman.ReadBlockFromDisk(block, index);
        });

    if (g_zmq_notification_interface) {
        RegisterValidationInterface(g_zmq_notification_interface.get());
    }
#endif

    // Step 7: load block chain

    node.notifications = std::make_unique<KernelNotifications>();
    fReindex = args.GetBoolArg("-reindex", false);
    bool fReindexChainState = args.GetBoolArg("-reindex-chainstate", false);

    ChainstateManager::Options chainman_opts{
        .config = config,
        .datadir = args.GetDataDirNet(),
        .adjusted_time_callback = GetAdjustedTime,
        .notifications = *node.notifications,
    };
    // no error can happen, already checked in AppInitParameterInteraction
    Assert(!ApplyArgsManOptions(args, chainman_opts));

    if (chainman_opts.checkpoints_enabled) {
        LogPrintf("Checkpoints will be verified.\n");
    } else {
        LogPrintf("Skipping checkpoint verification.\n");
    }

    BlockManager::Options blockman_opts{
        .chainparams = chainman_opts.config.GetChainParams(),
        .blocks_dir = args.GetBlocksDirPath(),
    };
    // no error can happen, already checked in AppInitParameterInteraction
    Assert(!ApplyArgsManOptions(args, blockman_opts));

    // cache size calculations
    CacheSizes cache_sizes =
        CalculateCacheSizes(args, g_enabled_filter_types.size());

    LogPrintf("Cache configuration:\n");
    LogPrintf("* Using %.1f MiB for block index database\n",
              cache_sizes.block_tree_db * (1.0 / 1024 / 1024));
    if (args.GetBoolArg("-txindex", DEFAULT_TXINDEX)) {
        LogPrintf("* Using %.1f MiB for transaction index database\n",
                  cache_sizes.tx_index * (1.0 / 1024 / 1024));
    }
    for (BlockFilterType filter_type : g_enabled_filter_types) {
        LogPrintf("* Using %.1f MiB for %s block filter index database\n",
                  cache_sizes.filter_index * (1.0 / 1024 / 1024),
                  BlockFilterTypeName(filter_type));
    }
    LogPrintf("* Using %.1f MiB for chain state database\n",
              cache_sizes.coins_db * (1.0 / 1024 / 1024));

    assert(!node.mempool);
    assert(!node.chainman);

    CTxMemPool::Options mempool_opts{
        .check_ratio = chainparams.DefaultConsistencyChecks() ? 1 : 0,
    };
    if (const auto err{ApplyArgsManOptions(args, chainparams, mempool_opts)}) {
        return InitError(*err);
    }
    mempool_opts.check_ratio =
        std::clamp<int>(mempool_opts.check_ratio, 0, 1'000'000);

    // FIXME: this legacy limit comes from the DEFAULT_DESCENDANT_SIZE_LIMIT
    // (101) that was enforced before the wellington activation. While it's
    // still a good idea to have some minimum mempool size, using this value as
    // a threshold is no longer relevant.
    int64_t nMempoolSizeMin = 101 * 1000 * 40;
    if (mempool_opts.max_size_bytes < 0 ||
        (!chainparams.IsTestChain() &&
         mempool_opts.max_size_bytes < nMempoolSizeMin)) {
        return InitError(strprintf(_("-maxmempool must be at least %d MB"),
                                   std::ceil(nMempoolSizeMin / 1000000.0)));
    }
    LogPrintf("* Using %.1f MiB for in-memory UTXO set (plus up to %.1f MiB of "
              "unused mempool space)\n",
              cache_sizes.coins * (1.0 / 1024 / 1024),
              mempool_opts.max_size_bytes * (1.0 / 1024 / 1024));

    for (bool fLoaded = false; !fLoaded && !ShutdownRequested();) {
        node.mempool = std::make_unique<CTxMemPool>(mempool_opts);

        node.chainman =
            std::make_unique<ChainstateManager>(chainman_opts, blockman_opts);
        ChainstateManager &chainman = *node.chainman;

        node::ChainstateLoadOptions options;
        options.mempool = Assert(node.mempool.get());
        options.reindex = node::fReindex;
        options.reindex_chainstate = fReindexChainState;
        options.prune = chainman.m_blockman.IsPruneMode();
        options.check_blocks =
            args.GetIntArg("-checkblocks", DEFAULT_CHECKBLOCKS);
        options.check_level = args.GetIntArg("-checklevel", DEFAULT_CHECKLEVEL);
        options.require_full_verification =
            args.IsArgSet("-checkblocks") || args.IsArgSet("-checklevel");
        options.check_interrupt = ShutdownRequested;
        options.coins_error_cb = [] {
            uiInterface.ThreadSafeMessageBox(
                _("Error reading from database, shutting down."), "",
                CClientUIInterface::MSG_ERROR);
        };

        uiInterface.InitMessage(_("Loading block index...").translated);

        const int64_t load_block_index_start_time = GetTimeMillis();
        auto catch_exceptions = [](auto &&f) {
            try {
                return f();
            } catch (const std::exception &e) {
                LogPrintf("%s\n", e.what());
                return std::make_tuple(node::ChainstateLoadStatus::FAILURE,
                                       _("Error opening block database"));
            }
        };
        auto [status, error] = catch_exceptions(
            [&] { return LoadChainstate(chainman, cache_sizes, options); });
        if (status == node::ChainstateLoadStatus::SUCCESS) {
            uiInterface.InitMessage(_("Verifying blocks...").translated);
            if (chainman.m_blockman.m_have_pruned &&
                options.check_blocks > MIN_BLOCKS_TO_KEEP) {
                LogPrintf("Prune: pruned datadir may not have more than %d "
                          "blocks; only checking available blocks\n",
                          MIN_BLOCKS_TO_KEEP);
            }
            std::tie(status, error) = catch_exceptions(
                [&] { return VerifyLoadedChainstate(chainman, options); });
            if (status == node::ChainstateLoadStatus::SUCCESS) {
                fLoaded = true;
                LogPrintf(" block index %15dms\n",
                          GetTimeMillis() - load_block_index_start_time);
            }
        }

        if (status == node::ChainstateLoadStatus::FAILURE_FATAL ||
            status == node::ChainstateLoadStatus::FAILURE_INCOMPATIBLE_DB ||
            status ==
                node::ChainstateLoadStatus::FAILURE_INSUFFICIENT_DBCACHE) {
            return InitError(error);
        }

        if (!fLoaded && !ShutdownRequested()) {
            // first suggest a reindex
            if (!options.reindex) {
                bool fRet = uiInterface.ThreadSafeQuestion(
                    error + Untranslated(".\n\n") +
                        _("Do you want to rebuild the block database now?"),
                    error.original + ".\nPlease restart with -reindex or "
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
                return InitError(error);
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

    ChainstateManager &chainman = *Assert(node.chainman);

    if (args.GetBoolArg("-avalanche", AVALANCHE_DEFAULT_ENABLED)) {
        // Initialize Avalanche.
        bilingual_str avalancheError;
        g_avalanche = avalanche::Processor::MakeProcessor(
            args, *node.chain, node.connman.get(), chainman, node.mempool.get(),
            *node.scheduler, avalancheError);
        if (!g_avalanche) {
            InitError(avalancheError);
            return false;
        }

        if (g_avalanche->isAvalancheServiceAvailable()) {
            nLocalServices = ServiceFlags(nLocalServices | NODE_AVALANCHE);
        }
    }

    assert(!node.peerman);
    node.peerman =
        PeerManager::make(*node.connman, *node.addrman, node.banman.get(),
                          chainman, *node.mempool, g_avalanche.get(),
                          args.GetBoolArg("-blocksonly", DEFAULT_BLOCKSONLY));
    RegisterValidationInterface(node.peerman.get());

    // Encoded addresses using cashaddr instead of base58.
    // We do this by default to avoid confusion with BTC addresses.
    config.SetCashAddrEncoding(args.GetBoolArg("-usecashaddr", true));

    // Step 8: load indexers
    if (args.GetBoolArg("-txindex", DEFAULT_TXINDEX)) {
        auto result{
            WITH_LOCK(cs_main, return CheckLegacyTxindex(*Assert(
                                   chainman.m_blockman.m_block_tree_db)))};
        if (!result) {
            return InitError(util::ErrorString(result));
        }

        g_txindex =
            std::make_unique<TxIndex>(cache_sizes.tx_index, false, fReindex);
        if (!g_txindex->Start(chainman.ActiveChainstate())) {
            return false;
        }
    }

    for (const auto &filter_type : g_enabled_filter_types) {
        InitBlockFilterIndex(filter_type, cache_sizes.filter_index, false,
                             fReindex);
        if (!GetBlockFilterIndex(filter_type)
                 ->Start(chainman.ActiveChainstate())) {
            return false;
        }
    }

    if (args.GetBoolArg("-coinstatsindex", DEFAULT_COINSTATSINDEX)) {
        g_coin_stats_index = std::make_unique<CoinStatsIndex>(
            /* cache size */ 0, false, fReindex);
        if (!g_coin_stats_index->Start(chainman.ActiveChainstate())) {
            return false;
        }
    }

#if ENABLE_CHRONIK
    if (args.GetBoolArg("-chronik", DEFAULT_CHRONIK)) {
        const bool fReindexChronik =
            fReindex || args.GetBoolArg("-chronikreindex", false);
        if (!chronik::Start(config, node, fReindexChronik)) {
            return false;
        }
    }
#endif

    // Step 9: load wallet
    for (const auto &client : node.chain_clients) {
        if (!client->load()) {
            return false;
        }
    }

    // Step 10: data directory maintenance

    // if pruning, unset the service bit and perform the initial blockstore
    // prune after any wallet rescanning has taken place.
    if (chainman.m_blockman.IsPruneMode()) {
        LogPrintf("Unsetting NODE_NETWORK on prune mode\n");
        nLocalServices = ServiceFlags(nLocalServices & ~NODE_NETWORK);
        if (!fReindex) {
            LOCK(cs_main);
            for (Chainstate *chainstate : chainman.GetAll()) {
                uiInterface.InitMessage(_("Pruning blockstore...").translated);
                chainstate->PruneAndFlush();
            }
        }
    }

    // Step 11: import blocks
    if (!CheckDiskSpace(args.GetDataDirNet())) {
        InitError(
            strprintf(_("Error: Disk space is low for %s"),
                      fs::quoted(fs::PathToString(args.GetDataDirNet()))));
        return false;
    }
    if (!CheckDiskSpace(args.GetBlocksDirPath())) {
        InitError(
            strprintf(_("Error: Disk space is low for %s"),
                      fs::quoted(fs::PathToString(args.GetBlocksDirPath()))));
        return false;
    }

    // Either install a handler to notify us when genesis activates, or set
    // fHaveGenesis directly.
    // No locking, as this happens before any background thread is started.
    boost::signals2::connection block_notify_genesis_wait_connection;
    if (WITH_LOCK(chainman.GetMutex(),
                  return chainman.ActiveChain().Tip() == nullptr)) {
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
            ReplaceAll(command, "%s", pBlockIndex->GetBlockHash().GetHex());
            std::thread t(runCommand, command);
            // thread runs free
            t.detach();
        });
    }
#endif

    std::vector<fs::path> vImportFiles;
    for (const std::string &strFile : args.GetArgs("-loadblock")) {
        vImportFiles.push_back(fs::PathFromString(strFile));
    }

    chainman.m_load_block =
        std::thread(&util::TraceThread, "loadblk", [=, &chainman, &args] {
            ThreadImport(chainman, g_avalanche.get(), vImportFiles,
                         ShouldPersistMempool(args) ? MempoolPath(args)
                                                    : fs::path{});
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
                    : chainman.GetParams().GenesisBlock().GetBlockTime();
            tip_info->verification_progress = GuessVerificationProgress(
                chainman.GetParams().TxData(), chainman.ActiveChain().Tip());
        }
        if (tip_info && chainman.m_best_header) {
            tip_info->header_height = chainman.m_best_header->nHeight;
            tip_info->header_time = chainman.m_best_header->GetBlockTime();
        }
    }
    LogPrintf("nBestHeight = %d\n", chain_active_height);
    if (node.peerman) {
        node.peerman->SetBestHeight(chain_active_height);
    }

    // Map ports with UPnP or NAT-PMP.
    StartMapPort(args.GetBoolArg("-upnp", DEFAULT_UPNP),
                 args.GetBoolArg("-natpmp", DEFAULT_NATPMP));

    CConnman::Options connOptions;
    connOptions.nLocalServices = nLocalServices;
    connOptions.nMaxConnections = nMaxConnections;
    connOptions.m_max_avalanche_outbound =
        g_avalanche ? args.GetIntArg("-maxavalancheoutbound",
                                     DEFAULT_MAX_AVALANCHE_OUTBOUND_CONNECTIONS)
                    : 0;
    connOptions.m_max_outbound_full_relay = std::min(
        MAX_OUTBOUND_FULL_RELAY_CONNECTIONS,
        connOptions.nMaxConnections - connOptions.m_max_avalanche_outbound);
    connOptions.m_max_outbound_block_relay = std::min(
        MAX_BLOCK_RELAY_ONLY_CONNECTIONS,
        connOptions.nMaxConnections - connOptions.m_max_avalanche_outbound -
            connOptions.m_max_outbound_full_relay);
    connOptions.nMaxAddnode = MAX_ADDNODE_CONNECTIONS;
    connOptions.nMaxFeeler = MAX_FEELER_CONNECTIONS;
    connOptions.uiInterface = &uiInterface;
    connOptions.m_banman = node.banman.get();
    connOptions.m_msgproc.push_back(node.peerman.get());
    connOptions.m_msgproc.push_back(g_avalanche.get());
    connOptions.nSendBufferMaxSize =
        1000 * args.GetIntArg("-maxsendbuffer", DEFAULT_MAXSENDBUFFER);
    connOptions.nReceiveFloodSize =
        1000 * args.GetIntArg("-maxreceivebuffer", DEFAULT_MAXRECEIVEBUFFER);
    connOptions.m_added_nodes = args.GetArgs("-addnode");

    connOptions.nMaxOutboundLimit =
        1024 * 1024 *
        args.GetIntArg("-maxuploadtarget", DEFAULT_MAX_UPLOAD_TARGET);
    connOptions.m_peer_connect_timeout = peer_connect_timeout;

    // Port to bind to if `-bind=addr` is provided without a `:port` suffix.
    const uint16_t default_bind_port = static_cast<uint16_t>(
        args.GetIntArg("-port", config.GetChainParams().GetDefaultPort()));

    const auto BadPortWarning = [](const char *prefix, uint16_t port) {
        return strprintf(_("%s request to listen on port %u. This port is "
                           "considered \"bad\" and "
                           "thus it is unlikely that any Bitcoin ABC peers "
                           "connect to it. See "
                           "doc/p2p-bad-ports.md for details and a full list."),
                         prefix, port);
    };

    for (const std::string &bind_arg : args.GetArgs("-bind")) {
        CService bind_addr;
        const size_t index = bind_arg.rfind('=');
        if (index == std::string::npos) {
            if (Lookup(bind_arg, bind_addr, default_bind_port,
                       /*fAllowLookup=*/false)) {
                connOptions.vBinds.push_back(bind_addr);
                if (IsBadPort(bind_addr.GetPort())) {
                    InitWarning(BadPortWarning("-bind", bind_addr.GetPort()));
                }
                continue;
            }
        } else {
            const std::string network_type = bind_arg.substr(index + 1);
            if (network_type == "onion") {
                const std::string truncated_bind_arg =
                    bind_arg.substr(0, index);
                if (Lookup(truncated_bind_arg, bind_addr,
                           BaseParams().OnionServiceTargetPort(), false)) {
                    connOptions.onion_binds.push_back(bind_addr);
                    continue;
                }
            }
        }
        return InitError(ResolveErrMsg("bind", bind_arg));
    }

    for (const std::string &strBind : args.GetArgs("-whitebind")) {
        NetWhitebindPermissions whitebind;
        bilingual_str error;
        if (!NetWhitebindPermissions::TryParse(strBind, whitebind, error)) {
            return InitError(error);
        }
        connOptions.vWhiteBinds.push_back(whitebind);
    }

    // If the user did not specify -bind= or -whitebind= then we bind
    // on any address - 0.0.0.0 (IPv4) and :: (IPv6).
    connOptions.bind_on_any =
        args.GetArgs("-bind").empty() && args.GetArgs("-whitebind").empty();

    // Emit a warning if a bad port is given to -port= but only if -bind and
    // -whitebind are not given, because if they are, then -port= is ignored.
    if (connOptions.bind_on_any && args.IsArgSet("-port")) {
        const uint16_t port_arg = args.GetIntArg("-port", 0);
        if (IsBadPort(port_arg)) {
            InitWarning(BadPortWarning("-port", port_arg));
        }
    }

    CService onion_service_target;
    if (!connOptions.onion_binds.empty()) {
        onion_service_target = connOptions.onion_binds.front();
    } else {
        onion_service_target = DefaultOnionServiceTarget();
        connOptions.onion_binds.push_back(onion_service_target);
    }

    if (args.GetBoolArg("-listenonion", DEFAULT_LISTEN_ONION)) {
        if (connOptions.onion_binds.size() > 1) {
            InitWarning(strprintf(
                _("More than one onion bind address is provided. Using %s "
                  "for the automatically created Tor onion service."),
                onion_service_target.ToStringIPPort()));
        }
        StartTorControl(onion_service_target);
    }

    if (connOptions.bind_on_any) {
        // Only add all IP addresses of the machine if we would be listening on
        // any address - 0.0.0.0 (IPv4) and :: (IPv6).
        Discover();
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

    const std::string &i2psam_arg = args.GetArg("-i2psam", "");
    if (!i2psam_arg.empty()) {
        CService addr;
        if (!Lookup(i2psam_arg, addr, 7656, fNameLookup) || !addr.IsValid()) {
            return InitError(strprintf(
                _("Invalid -i2psam address or hostname: '%s'"), i2psam_arg));
        }
        SetReachable(NET_I2P, true);
        SetProxy(NET_I2P, proxyType{addr});
    } else {
        SetReachable(NET_I2P, false);
    }

    connOptions.m_i2p_accept_incoming =
        args.GetBoolArg("-i2pacceptincoming", true);

    if (!node.connman->Start(*node.scheduler, connOptions)) {
        return false;
    }

    // Step 13: finished

    // At this point, the RPC is "started", but still in warmup, which means it
    // cannot yet be called. Before we make it callable, we need to make sure
    // that the RPC's view of the best block is valid and consistent with
    // ChainstateManager's active tip.
    //
    // If we do not do this, RPC's view of the best block will be height=0 and
    // hash=0x0. This will lead to erroroneous responses for things like
    // waitforblockheight.
    RPCNotifyBlockChange(
        WITH_LOCK(chainman.GetMutex(), return chainman.ActiveTip()));
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

    if (node.peerman) {
        node.peerman->StartScheduledTasks(*node.scheduler);
    }

#if HAVE_SYSTEM
    StartupNotify(args);
#endif

    return true;
}
