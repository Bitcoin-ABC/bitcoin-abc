// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2017 The Bitcoin Core developers
// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "init.h"
#include "config.h"
#include "net.h"
#include "util.h"
#include "utilmoneystr.h"
#include "validation.h"
#include "wallet/rpcwallet.h"
#include "wallet/wallet.h"
#include "wallet/walletutil.h"
#include "walletinitinterface.h"

class WalletInit : public WalletInitInterface {
public:
    //! Return the wallets help message.
    std::string GetHelpString(bool showDebug) override;

    //! Wallets parameter interaction
    bool ParameterInteraction() override;

    //! Register wallet RPCs.
    void RegisterRPC(CRPCTable &tableRPC) override;

    //! Responsible for reading and validating the -wallet arguments and
    //! verifying the wallet database.
    //  This function will perform salvage on the wallet if requested, as long
    //  as only one wallet is being loaded (WalletParameterInteraction forbids
    //  -salvagewallet, -zapwallettxes or -upgradewallet with multiwallet).
    bool Verify(const CChainParams &chainParams) override;

    //! Load wallet databases.
    bool Open(const CChainParams &chainParams) override;

    //! Complete startup of wallets.
    void Start(CScheduler &scheduler) override;

    //! Flush all wallets in preparation for shutdown.
    void Flush() override;

    //! Stop all wallets. Wallets will be flushed first.
    void Stop() override;

    //! Close all wallets.
    void Close() override;
};

static WalletInit g_wallet_init;
WalletInitInterface *const g_wallet_init_interface = &g_wallet_init;

std::string WalletInit::GetHelpString(bool showDebug) {
    std::string strUsage = HelpMessageGroup(_("Wallet options:"));
    strUsage += HelpMessageOpt(
        "-disablewallet",
        _("Do not load the wallet and disable wallet RPC calls"));
    strUsage += HelpMessageOpt(
        "-keypool=<n>", strprintf(_("Set key pool size to <n> (default: %u)"),
                                  DEFAULT_KEYPOOL_SIZE));
    strUsage += HelpMessageOpt(
        "-fallbackfee=<amt>",
        strprintf(_("A fee rate (in %s/kB) that will be used when fee "
                    "estimation has insufficient data (default: %s)"),
                  CURRENCY_UNIT, FormatMoney(DEFAULT_FALLBACK_FEE)));
    strUsage += HelpMessageOpt(
        "-paytxfee=<amt>",
        strprintf(
            _("Fee (in %s/kB) to add to transactions you send (default: %s)"),
            CURRENCY_UNIT, FormatMoney(payTxFee.GetFeePerK())));
    strUsage += HelpMessageOpt(
        "-rescan",
        _("Rescan the block chain for missing wallet transactions on startup"));
    strUsage += HelpMessageOpt(
        "-salvagewallet",
        _("Attempt to recover private keys from a corrupt wallet on startup"));

    strUsage +=
        HelpMessageOpt("-spendzeroconfchange",
                       strprintf(_("Spend unconfirmed change when sending "
                                   "transactions (default: %d)"),
                                 DEFAULT_SPEND_ZEROCONF_CHANGE));
    strUsage +=
        HelpMessageOpt("-txconfirmtarget=<n>",
                       strprintf(_("If paytxfee is not set, include enough fee "
                                   "so transactions begin confirmation on "
                                   "average within n blocks (default: %u)"),
                                 DEFAULT_TX_CONFIRM_TARGET));
    strUsage += HelpMessageOpt(
        "-usehd",
        _("Use hierarchical deterministic key generation (HD) after BIP32. "
          "Only has effect during wallet creation/first start") +
            " " + strprintf(_("(default: %d)"), DEFAULT_USE_HD_WALLET));
    strUsage += HelpMessageOpt("-upgradewallet",
                               _("Upgrade wallet to latest format on startup"));
    strUsage +=
        HelpMessageOpt("-wallet=<file>",
                       _("Specify wallet file (within data directory)") + " " +
                           strprintf(_("(default: %s)"), DEFAULT_WALLET_DAT));
    strUsage += HelpMessageOpt(
        "-walletbroadcast",
        _("Make the wallet broadcast transactions") + " " +
            strprintf(_("(default: %d)"), DEFAULT_WALLETBROADCAST));
    strUsage += HelpMessageOpt(
        "-walletdir=<dir>",
        _("Specify directory to hold wallets (default: <datadir>/wallets if it "
          "exists, otherwise <datadir>)"));
    strUsage += HelpMessageOpt("-walletnotify=<cmd>",
                               _("Execute command when a wallet transaction "
                                 "changes (%s in cmd is replaced by TxID)"));
    strUsage += HelpMessageOpt(
        "-zapwallettxes=<mode>",
        _("Delete all wallet transactions and only recover those parts of the "
          "blockchain through -rescan on startup") +
            " " +
            _("(1 = keep tx meta data e.g. account owner and payment "
              "request information, 2 = drop tx meta data)"));

    if (showDebug) {
        strUsage += HelpMessageGroup(_("Wallet debugging/testing options:"));

        strUsage += HelpMessageOpt(
            "-dblogsize=<n>",
            strprintf("Flush wallet database activity from memory to disk log "
                      "every <n> megabytes (default: %u)",
                      DEFAULT_WALLET_DBLOGSIZE));
        strUsage += HelpMessageOpt(
            "-flushwallet",
            strprintf("Run a thread to flush wallet periodically (default: %d)",
                      DEFAULT_FLUSHWALLET));
        strUsage += HelpMessageOpt(
            "-privdb", strprintf("Sets the DB_PRIVATE flag in the wallet db "
                                 "environment (default: %d)",
                                 DEFAULT_WALLET_PRIVDB));
        strUsage += HelpMessageOpt(
            "-walletrejectlongchains",
            strprintf(_("Wallet will not create transactions that violate "
                        "mempool chain limits (default: %d)"),
                      DEFAULT_WALLET_REJECT_LONG_CHAINS));
    }

    return strUsage;
}

bool WalletInit::ParameterInteraction() {
    CFeeRate minRelayTxFee = GetConfig().GetMinFeePerKB();

    gArgs.SoftSetArg("-wallet", DEFAULT_WALLET_DAT);
    const bool is_multiwallet = gArgs.GetArgs("-wallet").size() > 1;

    if (gArgs.GetBoolArg("-disablewallet", DEFAULT_DISABLE_WALLET)) {
        return true;
    }

    if (gArgs.GetBoolArg("-blocksonly", DEFAULT_BLOCKSONLY) &&
        gArgs.SoftSetBoolArg("-walletbroadcast", false)) {
        LogPrintf("%s: parameter interaction: -blocksonly=1 -> setting "
                  "-walletbroadcast=0\n",
                  __func__);
    }

    if (gArgs.GetBoolArg("-salvagewallet", false) &&
        gArgs.SoftSetBoolArg("-rescan", true)) {
        if (is_multiwallet) {
            return InitError(
                strprintf("%s is only allowed with a single wallet file",
                          "-salvagewallet"));
        }
        // Rewrite just private keys: rescan to find transactions
        LogPrintf("%s: parameter interaction: -salvagewallet=1 -> setting "
                  "-rescan=1\n",
                  __func__);
    }

    int zapwallettxes = gArgs.GetArg("-zapwallettxes", 0);
    // -zapwallettxes implies dropping the mempool on startup
    if (zapwallettxes != 0 && gArgs.SoftSetBoolArg("-persistmempool", false)) {
        LogPrintf("%s: parameter interaction: -zapwallettxes=%s -> setting "
                  "-persistmempool=0\n",
                  __func__, zapwallettxes);
    }

    // -zapwallettxes implies a rescan
    if (zapwallettxes != 0) {
        if (is_multiwallet) {
            return InitError(
                strprintf("%s is only allowed with a single wallet file",
                          "-zapwallettxes"));
        }
        if (gArgs.SoftSetBoolArg("-rescan", true)) {
            LogPrintf("%s: parameter interaction: -zapwallettxes=%s -> setting "
                      "-rescan=1\n",
                      __func__, zapwallettxes);
        }
        LogPrintf("%s: parameter interaction: -zapwallettxes=<mode> -> setting "
                  "-rescan=1\n",
                  __func__);
    }

    if (is_multiwallet) {
        if (gArgs.GetBoolArg("-upgradewallet", false)) {
            return InitError(
                strprintf("%s is only allowed with a single wallet file",
                          "-upgradewallet"));
        }
    }

    if (gArgs.GetBoolArg("-sysperms", false)) {
        return InitError("-sysperms is not allowed in combination with enabled "
                         "wallet functionality");
    }

    if (gArgs.GetArg("-prune", 0) && gArgs.GetBoolArg("-rescan", false)) {
        return InitError(
            _("Rescans are not possible in pruned mode. You will need to use "
              "-reindex which will download the whole blockchain again."));
    }

    if (minRelayTxFee.GetFeePerK() > HIGH_TX_FEE_PER_KB) {
        InitWarning(
            AmountHighWarn("-minrelaytxfee") + " " +
            _("The wallet will avoid paying less than the minimum relay fee."));
    }

    if (gArgs.IsArgSet("-fallbackfee")) {
        Amount nFeePerK = Amount::zero();
        if (!ParseMoney(gArgs.GetArg("-fallbackfee", ""), nFeePerK)) {
            return InitError(
                strprintf(_("Invalid amount for -fallbackfee=<amount>: '%s'"),
                          gArgs.GetArg("-fallbackfee", "")));
        }

        if (nFeePerK > HIGH_TX_FEE_PER_KB) {
            InitWarning(AmountHighWarn("-fallbackfee") + " " +
                        _("This is the transaction fee you may pay when fee "
                          "estimates are not available."));
        }

        CWallet::fallbackFee = CFeeRate(nFeePerK);
    }

    if (gArgs.IsArgSet("-paytxfee")) {
        Amount nFeePerK = Amount::zero();
        if (!ParseMoney(gArgs.GetArg("-paytxfee", ""), nFeePerK)) {
            return InitError(
                AmountErrMsg("paytxfee", gArgs.GetArg("-paytxfee", "")));
        }

        if (nFeePerK > HIGH_TX_FEE_PER_KB) {
            InitWarning(AmountHighWarn("-paytxfee") + " " +
                        _("This is the transaction fee you will pay if you "
                          "send a transaction."));
        }

        payTxFee = CFeeRate(nFeePerK, 1000);
        if (payTxFee < minRelayTxFee) {
            return InitError(strprintf(
                _("Invalid amount for -paytxfee=<amount>: '%s' (must "
                  "be at least %s)"),
                gArgs.GetArg("-paytxfee", ""), minRelayTxFee.ToString()));
        }
    }

    if (gArgs.IsArgSet("-maxtxfee")) {
        Amount nMaxFee = Amount::zero();
        if (!ParseMoney(gArgs.GetArg("-maxtxfee", ""), nMaxFee)) {
            return InitError(
                AmountErrMsg("maxtxfee", gArgs.GetArg("-maxtxfee", "")));
        }

        if (nMaxFee > HIGH_MAX_TX_FEE) {
            InitWarning(_("-maxtxfee is set very high! Fees this large could "
                          "be paid on a single transaction."));
        }

        maxTxFee = nMaxFee;
        if (CFeeRate(maxTxFee, 1000) < minRelayTxFee) {
            return InitError(strprintf(
                _("Invalid amount for -maxtxfee=<amount>: '%s' (must "
                  "be at least the minrelay fee of %s to prevent "
                  "stuck transactions)"),
                gArgs.GetArg("-maxtxfee", ""), minRelayTxFee.ToString()));
        }
    }

    nTxConfirmTarget =
        gArgs.GetArg("-txconfirmtarget", DEFAULT_TX_CONFIRM_TARGET);
    bSpendZeroConfChange =
        gArgs.GetBoolArg("-spendzeroconfchange", DEFAULT_SPEND_ZEROCONF_CHANGE);

    return true;
}

void WalletInit::RegisterRPC(CRPCTable &t) {
    if (gArgs.GetBoolArg("-disablewallet", false)) {
        return;
    }

    RegisterWalletRPCCommands(t);
}

bool WalletInit::Verify(const CChainParams &chainParams) {
    if (gArgs.GetBoolArg("-disablewallet", DEFAULT_DISABLE_WALLET)) {
        return true;
    }

    if (gArgs.IsArgSet("-walletdir")) {
        fs::path wallet_dir = gArgs.GetArg("-walletdir", "");
        if (!fs::exists(wallet_dir)) {
            return InitError(
                strprintf(_("Specified -walletdir \"%s\" does not exist"),
                          wallet_dir.string()));
        } else if (!fs::is_directory(wallet_dir)) {
            return InitError(
                strprintf(_("Specified -walletdir \"%s\" is not a directory"),
                          wallet_dir.string()));
        } else if (!wallet_dir.is_absolute()) {
            return InitError(
                strprintf(_("Specified -walletdir \"%s\" is a relative path"),
                          wallet_dir.string()));
        }
    }

    LogPrintf("Using wallet directory %s\n", GetWalletDir().string());

    uiInterface.InitMessage(_("Verifying wallet(s)..."));

    // Keep track of each wallet absolute path to detect duplicates.
    std::set<fs::path> wallet_paths;

    for (const std::string &walletFile : gArgs.GetArgs("-wallet")) {
        if (fs::path(walletFile).filename() != walletFile) {
            return InitError(
                strprintf(_("Error loading wallet %s. -wallet parameter must "
                            "only specify a filename (not a path)."),
                          walletFile));
        }

        if (SanitizeString(walletFile, SAFE_CHARS_FILENAME) != walletFile) {
            return InitError(strprintf(_("Error loading wallet %s. Invalid "
                                         "characters in -wallet filename."),
                                       walletFile));
        }

        fs::path wallet_path = fs::absolute(walletFile, GetWalletDir());

        if (fs::exists(wallet_path) && (!fs::is_regular_file(wallet_path) ||
                                        fs::is_symlink(wallet_path))) {
            return InitError(strprintf(_("Error loading wallet %s. -wallet "
                                         "filename must be a regular file."),
                                       walletFile));
        }

        if (!wallet_paths.insert(wallet_path).second) {
            return InitError(strprintf(_("Error loading wallet %s. Duplicate "
                                         "-wallet filename specified."),
                                       walletFile));
        }

        std::string strError;
        if (!CWalletDB::VerifyEnvironment(walletFile, GetWalletDir().string(),
                                          strError)) {
            return InitError(strError);
        }

        if (gArgs.GetBoolArg("-salvagewallet", false)) {
            // Recover readable keypairs:
            CWallet dummyWallet(chainParams);
            std::string backup_filename;
            if (!CWalletDB::Recover(walletFile, (void *)&dummyWallet,
                                    CWalletDB::RecoverKeysOnlyFilter,
                                    backup_filename)) {
                return false;
            }
        }

        std::string strWarning;
        bool dbV = CWalletDB::VerifyDatabaseFile(
            walletFile, GetWalletDir().string(), strWarning, strError);
        if (!strWarning.empty()) {
            InitWarning(strWarning);
        }
        if (!dbV) {
            InitError(strError);
            return false;
        }
    }

    return true;
}

bool WalletInit::Open(const CChainParams &chainParams) {
    if (gArgs.GetBoolArg("-disablewallet", DEFAULT_DISABLE_WALLET)) {
        LogPrintf("Wallet disabled!\n");
        return true;
    }

    for (const std::string &walletFile : gArgs.GetArgs("-wallet")) {
        CWallet *const pwallet =
            CWallet::CreateWalletFromFile(chainParams, walletFile);
        if (!pwallet) {
            return false;
        }
        vpwallets.push_back(pwallet);
    }

    return true;
}

void WalletInit::Start(CScheduler &scheduler) {
    for (CWalletRef pwallet : vpwallets) {
        pwallet->postInitProcess(scheduler);
    }
}

void WalletInit::Flush() {
    for (CWalletRef pwallet : vpwallets) {
        pwallet->Flush(false);
    }
}

void WalletInit::Stop() {
    for (CWalletRef pwallet : vpwallets) {
        pwallet->Flush(true);
    }
}

void WalletInit::Close() {
    for (CWalletRef pwallet : vpwallets) {
        delete pwallet;
    }
    vpwallets.clear();
}
