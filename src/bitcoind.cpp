// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#if defined(HAVE_CONFIG_H)
#include <config/bitcoin-config.h>
#endif

#include <chainparams.h>
#include <clientversion.h>
#include <common/args.h>
#include <common/init.h>
#include <common/system.h>
#include <compat.h>
#include <config.h>
#include <httprpc.h>
#include <init.h>
#include <interfaces/chain.h>
#include <node/context.h>
#include <node/ui_interface.h>
#include <noui.h>
#include <shutdown.h>
#include <util/check.h>
#include <util/exception.h>
#include <util/strencodings.h>
#include <util/syserror.h>
#include <util/threadnames.h>
#include <util/tokenpipe.h>
#include <util/translation.h>

#include <any>
#include <functional>

using node::NodeContext;

const std::function<std::string(const char *)> G_TRANSLATION_FUN = nullptr;

#if HAVE_DECL_FORK

/**
 * Custom implementation of daemon(). This implements the same order of
 * operations as glibc.
 * Opens a pipe to the child process to be able to wait for an event to occur.
 *
 * @returns 0 if successful, and in child process.
 *          >0 if successful, and in parent process.
 *          -1 in case of error (in parent process).
 *
 *          In case of success, endpoint will be one end of a pipe from the
 *          child to parent process, which can be used with TokenWrite (in
 *          the child) or TokenRead (in the parent).
 */
int fork_daemon(bool nochdir, bool noclose, TokenPipeEnd &endpoint) {
    // communication pipe with child process
    std::optional<TokenPipe> umbilical = TokenPipe::Make();
    if (!umbilical) {
        // pipe or pipe2 failed.
        return -1;
    }

    int pid = fork();
    if (pid < 0) {
        // fork failed.
        return -1;
    }
    if (pid != 0) {
        // Parent process gets read end, closes write end.
        endpoint = umbilical->TakeReadEnd();
        umbilical->TakeWriteEnd().Close();

        int status = endpoint.TokenRead();
        // Something went wrong while setting up child process.
        if (status != 0) {
            endpoint.Close();
            return -1;
        }

        return pid;
    }
    // Child process gets write end, closes read end.
    endpoint = umbilical->TakeWriteEnd();
    umbilical->TakeReadEnd().Close();

#if HAVE_DECL_SETSID
    if (setsid() < 0) {
        // setsid failed.
        exit(1);
    }
#endif

    if (!nochdir) {
        if (chdir("/") != 0) {
            // chdir failed.
            exit(1);
        }
    }
    if (!noclose) {
        // Open /dev/null, and clone it into STDIN, STDOUT and STDERR to detach
        // from terminal.
        int fd = open("/dev/null", O_RDWR);
        if (fd >= 0) {
            bool err = dup2(fd, STDIN_FILENO) < 0 ||
                       dup2(fd, STDOUT_FILENO) < 0 ||
                       dup2(fd, STDERR_FILENO) < 0;
            // Don't close if fd<=2 to try to handle the case where the program
            // was invoked without any file descriptors open.
            if (fd > 2) {
                close(fd);
            }
            if (err) {
                // dup2 failed.
                exit(1);
            }
        } else {
            // open /dev/null failed.
            exit(1);
        }
    }
    // Success
    endpoint.TokenWrite(0);
    return 0;
}

#endif

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
    std::any context{&node};

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
            strprintf("Error parsing command line arguments: %s", error)));
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

#if HAVE_DECL_FORK
    // Communication with parent after daemonizing. This is used for signalling
    // in the following ways:
    // - a boolean token is sent when the initialization process (all the Init*
    //   functions) have finished to indicate that the parent process can quit,
    //   and whether it was successful/unsuccessful.
    // - an unexpected shutdown of the child process creates an unexpected end
    //   of stream at the parent end, which is interpreted as failure to start.
    TokenPipeEnd daemon_ep;
#endif
    try {
        if (auto err = common::InitConfig(args)) {
            return InitError(err->message, err->details);
        }

        // Make sure we create the net-specific data directory early on: if it
        // is new, this has a side effect of also creating
        // <datadir>/<net>/wallets/.
        //
        // TODO: this should be removed once gArgs.GetDataDirNet() no longer
        // creates the wallets/ subdirectory. See more info at:
        // https://reviews.bitcoinabc.org/D3312
        gArgs.GetDataDirNet();

        // Error out when loose non-argument tokens are encountered on command
        // line
        for (int i = 1; i < argc; i++) {
            if (!IsSwitchChar(argv[i][0])) {
                return InitError(Untranslated(
                    strprintf("Command line contains unexpected token '%s', "
                              "see bitcoind -h for a list of options.",
                              argv[i])));
            }
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

        node.kernel = std::make_unique<kernel::Context>();
        if (!AppInitSanityChecks(*node.kernel)) {
            // InitError will have been called with detailed error, which ends
            // up on console
            return false;
        }

        if (args.GetBoolArg("-daemon", DEFAULT_DAEMON) ||
            args.GetBoolArg("-daemonwait", DEFAULT_DAEMONWAIT)) {
#if HAVE_DECL_FORK
            tfm::format(std::cout, PACKAGE_NAME " starting\n");

            // Daemonize
            // don't chdir (1), do close FDs (0)
            switch (fork_daemon(1, 0, daemon_ep)) {
                case 0:
                    // Child: continue.
                    // If -daemonwait is not enabled, immediately send a success
                    // token the parent.
                    if (!args.GetBoolArg("-daemonwait", DEFAULT_DAEMONWAIT)) {
                        daemon_ep.TokenWrite(1);
                        daemon_ep.Close();
                    }
                    break;
                case -1:
                    // Error happened.
                    return InitError(Untranslated(strprintf(
                        "fork_daemon() failed: %s", SysErrorString(errno))));
                default: {
                    // Parent: wait and exit.
                    int token = daemon_ep.TokenRead();
                    if (token) {
                        // Success
                        exit(EXIT_SUCCESS);
                    } else {
                        // fRet = false or token read error (premature exit).
                        tfm::format(std::cerr, "Error during initialization - "
                                               "check debug.log for details\n");
                        exit(EXIT_FAILURE);
                    }
                }
            }
#else
            return InitError(Untranslated(
                "-daemon is not supported on this operating system"));
#endif // HAVE_DECL_FORK
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

#if HAVE_DECL_FORK
    if (daemon_ep.IsOpen()) {
        // Signal initialization status to parent, then close pipe.
        daemon_ep.TokenWrite(fRet);
        daemon_ep.Close();
    }
#endif
    if (fRet) {
        WaitForShutdown();
    }
    Interrupt(node);
    Shutdown(node);

    return fRet;
}

int main(int argc, char *argv[]) {
#ifdef WIN32
    common::WinCmdLineArgs winArgs;
    std::tie(argc, argv) = winArgs.get();
#endif
    SetupEnvironment();

    // Connect bitcoind signal handlers
    noui_connect();

    return (AppInit(argc, argv) ? EXIT_SUCCESS : EXIT_FAILURE);
}
