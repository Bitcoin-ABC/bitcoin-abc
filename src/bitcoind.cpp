// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#if defined(HAVE_CONFIG_H)
#include <config/bitcoin-config.h>
#endif

#include <chainparams.h>
#include <clientversion.h>
#include <compat.h>
#include <config.h>
#include <httprpc.h>
#include <init.h>
#include <interfaces/chain.h>
#include <network.h>
#include <node/context.h>
#include <node/ui_interface.h>
#include <noui.h>
#include <shutdown.h>
#include <util/ref.h>
#include <util/strencodings.h>
#include <util/system.h>
#include <util/threadnames.h>
#include <util/translation.h>

#include <functional>

const std::function<std::string(const char *)> G_TRANSLATION_FUN = nullptr;

static void WaitForShutdown(NodeContext &node) {
    while (!ShutdownRequested()) {
        UninterruptibleSleep(std::chrono::milliseconds{200});
    }
    Interrupt(node);
}

//////////////////////////////////////////////////////////////////////////////
//
// Start
//
static bool AppInit(int argc, char *argv[]) {
    // FIXME: Ideally, we'd like to build the config here, but that's currently
    // not possible as the whole application has too many global state. However,
    // this is a first step.
    auto &config = const_cast<Config &>(GetConfig());

    RPCServer rpcServer;

    NodeContext node;
    util::Ref context{node};

    HTTPRPCRequestProcessor httpRPCRequestProcessor(config, rpcServer, context);

    bool fRet = false;

    util::ThreadSetInternalName("init");

    // If Qt is used, parameters/bitcoin.conf are parsed in qt/bitcoin.cpp's
    // main()
    SetupServerArgs(node);
    ArgsManager &args = *Assert(node.args);
    std::string error;
    if (!args.ParseParameters(argc, argv, error)) {
        return InitError(Untranslated(
            strprintf("Error parsing command line arguments: %s\n", error)));
    }

    // Process help and version before taking care about datadir
    if (HelpRequested(args) || args.IsArgSet("-version")) {
        std::string strUsage =
            PACKAGE_NAME " version " + FormatFullVersion() + "\n";

        if (args.IsArgSet("-version")) {
            strUsage += FormatParagraph(LicenseInfo()) + "\n";
        } else {
            strUsage += "\nUsage:  bitcoind [options]                     "
                        "Start " PACKAGE_NAME "\n";
            strUsage += "\n" + args.GetHelpMessage();
        }

        tfm::format(std::cout, "%s", strUsage);
        return true;
    }

    try {
        if (!CheckDataDirOption()) {
            return InitError(Untranslated(
                strprintf("Specified data directory \"%s\" does not exist.\n",
                          args.GetArg("-datadir", ""))));
        }
        if (!args.ReadConfigFiles(error, true)) {
            return InitError(Untranslated(
                strprintf("Error reading configuration file: %s\n", error)));
        }
        // Check for -chain, -testnet or -regtest parameter (Params() calls are
        // only valid after this clause)
        try {
            SelectParams(args.GetChainName());
        } catch (const std::exception &e) {
            return InitError(Untranslated(strprintf("%s\n", e.what())));
        }

        // Make sure we create the net-specific data directory early on: if it
        // is new, this has a side effect of also creating
        // <datadir>/<net>/wallets/.
        //
        // TODO: this should be removed once GetDataDir() no longer creates the
        // wallets/ subdirectory.
        // See more info at:
        // https://reviews.bitcoinabc.org/D3312
        GetDataDir(true);

        // Error out when loose non-argument tokens are encountered on command
        // line
        for (int i = 1; i < argc; i++) {
            if (!IsSwitchChar(argv[i][0])) {
                return InitError(Untranslated(
                    strprintf("Command line contains unexpected token '%s', "
                              "see bitcoind -h for a list of options.\n",
                              argv[i])));
            }
        }

        if (!args.InitSettings(error)) {
            InitError(Untranslated(error));
            return false;
        }

        // -server defaults to true for bitcoind but not for the GUI so do this
        // here
        args.SoftSetBoolArg("-server", true);
        // Set this early so that parameter interactions go to console
        InitLogging(args);
        InitParameterInteraction(args);
        if (!AppInitBasicSetup(args)) {
            // InitError will have been called with detailed error, which ends
            // up on console
            return false;
        }
        if (!AppInitParameterInteraction(config, args)) {
            // InitError will have been called with detailed error, which ends
            // up on console
            return false;
        }
        if (!AppInitSanityChecks()) {
            // InitError will have been called with detailed error, which ends
            // up on console
            return false;
        }
        if (args.GetBoolArg("-daemon", false)) {
#if HAVE_DECL_DAEMON
#if defined(MAC_OSX)
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wdeprecated-declarations"
#endif
            tfm::format(std::cout, PACKAGE_NAME " starting\n");

            // Daemonize
            if (daemon(1, 0)) {
                // don't chdir (1), do close FDs (0)
                return InitError(Untranslated(
                    strprintf("daemon() failed: %s\n", strerror(errno))));
            }
#if defined(MAC_OSX)
#pragma GCC diagnostic pop
#endif
#else
            return InitError(Untranslated(
                "-daemon is not supported on this operating system\n"));
#endif // HAVE_DECL_DAEMON
        }

        // Lock data directory after daemonization
        if (!AppInitLockDataDirectory()) {
            // If locking the data directory failed, exit immediately
            return false;
        }
        fRet = AppInitInterfaces(node) &&
               AppInitMain(config, rpcServer, httpRPCRequestProcessor, node);
    } catch (const std::exception &e) {
        PrintExceptionContinue(&e, "AppInit()");
    } catch (...) {
        PrintExceptionContinue(nullptr, "AppInit()");
    }

    if (!fRet) {
        Interrupt(node);
    } else {
        WaitForShutdown(node);
    }
    Shutdown(node);

    return fRet;
}

int main(int argc, char *argv[]) {
#ifdef WIN32
    util::WinCmdLineArgs winArgs;
    std::tie(argc, argv) = winArgs.get();
#endif
    SetupEnvironment();

    // Connect bitcoind signal handlers
    noui_connect();

    return (AppInit(argc, argv) ? EXIT_SUCCESS : EXIT_FAILURE);
}
