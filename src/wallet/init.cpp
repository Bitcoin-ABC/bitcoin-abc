// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2017 The Bitcoin Core developers
// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <config.h>
#include <init.h>
#include <net.h>
#include <scheduler.h>
#include <util.h>
#include <utilmoneystr.h>
#include <validation.h>
#include <wallet/rpcdump.h>
#include <wallet/rpcwallet.h>
#include <wallet/wallet.h>
#include <wallet/walletutil.h>
#include <walletinitinterface.h>

class WalletInit : public WalletInitInterface {
public:
    //! Return the wallets help message.
    void AddWalletOptions() const override;

    //! Wallets parameter interaction
    bool ParameterInteraction() const override;

    //! Register wallet RPCs.
    void RegisterRPC(CRPCTable &tableRPC) const override;

    //! Responsible for reading and validating the -wallet arguments and
    //! verifying the wallet database.
    //  This function will perform salvage on the wallet if requested, as long
    //  as only one wallet is being loaded (WalletParameterInteraction forbids
    //  -salvagewallet, -zapwallettxes or -upgradewallet with multiwallet).
    bool Verify(const CChainParams &chainParams) const override;

    //! Load wallet databases.
    bool Open(const CChainParams &chainParams) const override;

    //! Complete startup of wallets.
    void Start(CScheduler &scheduler) const override;

    //! Flush all wallets in preparation for shutdown.
    void Flush() const override;

    //! Stop all wallets. Wallets will be flushed first.
    void Stop() const override;

    //! Close all wallets.
    void Close() const override;
};

const WalletInitInterface &g_wallet_init_interface = WalletInit();

void WalletInit::AddWalletOptions() const {
    gArgs.AddArg(
        "-avoidpartialspends",
        strprintf(_("Group outputs by address, selecting all or none, instead "
                    "of selecting on a per-output basis. Privacy is improved "
                    "as an address is only used once (unless someone sends to "
                    "it after spending from it), but may result in slightly "
                    "higher fees as suboptimal coin selection may result due "
                    "to the added limitation (default: %u)"),
                  DEFAULT_AVOIDPARTIALSPENDS),
        false, OptionsCategory::WALLET);

    gArgs.AddArg("-disablewallet",
                 _("Do not load the wallet and disable wallet RPC calls"),
                 false, OptionsCategory::WALLET);
    gArgs.AddArg("-fallbackfee=<amt>",
                 strprintf(_("A fee rate (in %s/kB) that will be used when fee "
                             "estimation has insufficient data (default: %s)"),
                           CURRENCY_UNIT, FormatMoney(DEFAULT_FALLBACK_FEE)),
                 false, OptionsCategory::WALLET);
    gArgs.AddArg("-keypool=<n>",
                 strprintf(_("Set key pool size to <n> (default: %u)"),
                           DEFAULT_KEYPOOL_SIZE),
                 false, OptionsCategory::WALLET);
    gArgs.AddArg(
        "-maxtxfee=<amt>",
        strprintf(_("Maximum total fees (in %s) to use in a single wallet "
                    "transaction or raw transaction; setting this too low may "
                    "abort large transactions (default: %s)"),
                  CURRENCY_UNIT, FormatMoney(DEFAULT_TRANSACTION_MAXFEE)),
        false, OptionsCategory::DEBUG_TEST);
    gArgs.AddArg("-mintxfee=<amt>",
                 strprintf(_("Fees (in %s/kB) smaller than this are considered "
                             "zero fee for transaction creation (default: %s)"),
                           CURRENCY_UNIT,
                           FormatMoney(DEFAULT_TRANSACTION_MINFEE_PER_KB)),
                 false, OptionsCategory::WALLET);
    gArgs.AddArg(
        "-paytxfee=<amt>",
        strprintf(
            _("Fee (in %s/kB) to add to transactions you send (default: %s)"),
            CURRENCY_UNIT,
            FormatMoney(CFeeRate{DEFAULT_PAY_TX_FEE}.GetFeePerK())),
        false, OptionsCategory::WALLET);
    gArgs.AddArg(
        "-rescan",
        _("Rescan the block chain for missing wallet transactions on startup"),
        false, OptionsCategory::WALLET);
    gArgs.AddArg(
        "-salvagewallet",
        _("Attempt to recover private keys from a corrupt wallet on startup"),
        false, OptionsCategory::WALLET);

    gArgs.AddArg("-spendzeroconfchange",
                 strprintf(_("Spend unconfirmed change when sending "
                             "transactions (default: %d)"),
                           DEFAULT_SPEND_ZEROCONF_CHANGE),
                 false, OptionsCategory::WALLET);
    gArgs.AddArg("-upgradewallet",
                 _("Upgrade wallet to latest format on startup"), false,
                 OptionsCategory::WALLET);
    gArgs.AddArg(
        "-wallet=<path>",
        _("Specify wallet database path. Can be specified multiple times to "
          "load multiple wallets. Path is interpreted relative to <walletdir> "
          "if it is not absolute, and will be created if it does not exist (as "
          "a directory containing a wallet.dat file and log files). For "
          "backwards compatibility this will also accept names of existing "
          "data files in <walletdir>.)"),
        false, OptionsCategory::WALLET);
    gArgs.AddArg("-walletbroadcast",
                 _("Make the wallet broadcast transactions") + " " +
                     strprintf(_("(default: %d)"), DEFAULT_WALLETBROADCAST),
                 false, OptionsCategory::WALLET);
    gArgs.AddArg("-walletdir=<dir>",
                 _("Specify directory to hold wallets (default: "
                   "<datadir>/wallets if it exists, otherwise <datadir>)"),
                 false, OptionsCategory::WALLET);
    gArgs.AddArg("-walletnotify=<cmd>",
                 _("Execute command when a wallet transaction changes (%s in "
                   "cmd is replaced by TxID)"),
                 false, OptionsCategory::WALLET);
    gArgs.AddArg("-zapwallettxes=<mode>",
                 _("Delete all wallet transactions and only recover those "
                   "parts of the blockchain through -rescan on startup") +
                     " " +
                     _("(1 = keep tx meta data e.g. account owner and payment "
                       "request information, 2 = drop tx meta data)"),
                 false, OptionsCategory::WALLET);

    gArgs.AddArg("-dblogsize=<n>",
                 strprintf("Flush wallet database activity from memory to disk "
                           "log every <n> megabytes (default: %u)",
                           DEFAULT_WALLET_DBLOGSIZE),
                 true, OptionsCategory::WALLET_DEBUG_TEST);
    gArgs.AddArg(
        "-flushwallet",
        strprintf("Run a thread to flush wallet periodically (default: %d)",
                  DEFAULT_FLUSHWALLET),
        true, OptionsCategory::WALLET_DEBUG_TEST);
    gArgs.AddArg("-privdb",
                 strprintf("Sets the DB_PRIVATE flag in the wallet db "
                           "environment (default: %d)",
                           DEFAULT_WALLET_PRIVDB),
                 true, OptionsCategory::WALLET_DEBUG_TEST);
    gArgs.AddArg("-walletrejectlongchains",
                 strprintf(_("Wallet will not create transactions that violate "
                             "mempool chain limits (default: %d)"),
                           DEFAULT_WALLET_REJECT_LONG_CHAINS),
                 true, OptionsCategory::WALLET_DEBUG_TEST);
}

bool WalletInit::ParameterInteraction() const {
    gArgs.SoftSetArg("-wallet", "");
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

    return true;
}

void WalletInit::RegisterRPC(CRPCTable &t) const {
    if (gArgs.GetBoolArg("-disablewallet", DEFAULT_DISABLE_WALLET)) {
        return;
    }

    RegisterWalletRPCCommands(t);
    RegisterDumpRPCCommands(t);
}

bool WalletInit::Verify(const CChainParams &chainParams) const {
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

    std::vector<std::string> wallet_files = gArgs.GetArgs("-wallet");

    // Parameter interaction code should have thrown an error if -salvagewallet
    // was enabled with more than wallet file, so the wallet_files size check
    // here should have no effect.
    bool salvage_wallet =
        gArgs.GetBoolArg("-salvagewallet", false) && wallet_files.size() <= 1;

    // Keep track of each wallet absolute path to detect duplicates.
    std::set<fs::path> wallet_paths;

    for (const auto wallet_file : wallet_files) {
        fs::path wallet_path = fs::absolute(wallet_file, GetWalletDir());

        if (!wallet_paths.insert(wallet_path).second) {
            return InitError(strprintf(_("Error loading wallet %s. Duplicate "
                                         "-wallet filename specified."),
                                       wallet_file));
        }

        std::string error_string;
        std::string warning_string;
        bool verify_success =
            CWallet::Verify(chainParams, wallet_file, salvage_wallet,
                            error_string, warning_string);
        if (!error_string.empty()) {
            InitError(error_string);
        }
        if (!warning_string.empty()) {
            InitWarning(warning_string);
        }
        if (!verify_success) {
            return false;
        }
    }

    return true;
}

bool WalletInit::Open(const CChainParams &chainParams) const {
    if (gArgs.GetBoolArg("-disablewallet", DEFAULT_DISABLE_WALLET)) {
        LogPrintf("Wallet disabled!\n");
        return true;
    }

    for (const std::string &walletFile : gArgs.GetArgs("-wallet")) {
        CWallet *const pwallet = CWallet::CreateWalletFromFile(
            chainParams, walletFile, fs::absolute(walletFile, GetWalletDir()));
        if (!pwallet) {
            return false;
        }
        AddWallet(pwallet);
    }

    return true;
}

void WalletInit::Start(CScheduler &scheduler) const {
    for (CWallet *pwallet : GetWallets()) {
        pwallet->postInitProcess();
    }

    // Run a thread to flush wallet periodically
    scheduler.scheduleEvery(
        [] {
            MaybeCompactWalletDB();
            return true;
        },
        500);
}

void WalletInit::Flush() const {
    for (CWallet *pwallet : GetWallets()) {
        pwallet->Flush(false);
    }
}

void WalletInit::Stop() const {
    for (CWallet *pwallet : GetWallets()) {
        pwallet->Flush(true);
    }
}

void WalletInit::Close() const {
    for (CWallet *pwallet : GetWallets()) {
        RemoveWallet(pwallet);
        delete pwallet;
    }
}
