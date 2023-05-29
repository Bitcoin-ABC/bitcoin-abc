// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2017 The Bitcoin Core developers
// Copyright (c) 2018-2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <config.h>
#include <init.h>
#include <interfaces/chain.h>
#include <interfaces/wallet.h>
#include <net.h>
#include <node/context.h>
#include <node/ui_interface.h>
#include <univalue.h>
#include <util/check.h>
#include <util/moneystr.h>
#include <util/system.h>
#include <util/translation.h>
#include <wallet/coincontrol.h>
#include <wallet/rpc/backup.h>
#include <wallet/wallet.h>
#include <walletinitinterface.h>

using node::NodeContext;

class WalletInit : public WalletInitInterface {
public:
    //! Was the wallet component compiled in.
    bool HasWalletSupport() const override { return true; }

    //! Return the wallets help message.
    void AddWalletOptions(ArgsManager &argsman) const override;

    //! Wallets parameter interaction
    bool ParameterInteraction() const override;

    //! Add wallets that should be opened to list of chain clients.
    void Construct(NodeContext &node) const override;
};

const WalletInitInterface &g_wallet_init_interface = WalletInit();

void WalletInit::AddWalletOptions(ArgsManager &argsman) const {
    argsman.AddArg(
        "-avoidpartialspends",
        strprintf("Group outputs by address, selecting all or none, instead of "
                  "selecting on a per-output basis. Privacy is improved as an "
                  "address is only used once (unless someone sends to it after "
                  "spending from it), but may result in slightly higher fees "
                  "as suboptimal coin selection may result due to the added "
                  "limitation (default: %u (always enabled for wallets with "
                  "\"avoid_reuse\" enabled))",
                  DEFAULT_AVOIDPARTIALSPENDS),
        ArgsManager::ALLOW_ANY, OptionsCategory::WALLET);

    argsman.AddArg("-disablewallet",
                   "Do not load the wallet and disable wallet RPC calls",
                   ArgsManager::ALLOW_ANY, OptionsCategory::WALLET);
    const auto &ticker = Currency::get().ticker;
    argsman.AddArg("-fallbackfee=<amt>",
                   strprintf("A fee rate (in %s/kB) that will be used when fee "
                             "estimation has insufficient data. 0 to entirely "
                             "disable the fallbackfee feature. (default: %s)",
                             ticker, FormatMoney(DEFAULT_FALLBACK_FEE)),
                   ArgsManager::ALLOW_ANY, OptionsCategory::WALLET);
    argsman.AddArg(
        "-keypool=<n>",
        strprintf("Set key pool size to <n> (default: %u). Warning: Smaller "
                  "sizes may increase the risk of losing funds when restoring "
                  "from an old backup, if none of the addresses in the "
                  "original keypool have been used.",
                  DEFAULT_KEYPOOL_SIZE),
        ArgsManager::ALLOW_ANY, OptionsCategory::WALLET);
    argsman.AddArg(
        "-maxapsfee=<n>",
        strprintf(
            "Spend up to this amount in additional (absolute) fees (in %s) if "
            "it allows the use of partial spend avoidance (default: %s)",
            ticker, FormatMoney(DEFAULT_MAX_AVOIDPARTIALSPEND_FEE)),
        ArgsManager::ALLOW_ANY, OptionsCategory::WALLET);
    argsman.AddArg(
        "-maxtxfee=<amt>",
        strprintf("Maximum total fees (in %s) to use in a single wallet "
                  "transaction or raw transaction; setting this too low may "
                  "abort large transactions (default: %s)",
                  ticker, FormatMoney(DEFAULT_TRANSACTION_MAXFEE)),
        ArgsManager::ALLOW_ANY, OptionsCategory::DEBUG_TEST);
    argsman.AddArg("-mintxfee=<amt>",
                   strprintf("Fees (in %s/kB) smaller than this are considered "
                             "zero fee for transaction creation (default: %s)",
                             ticker,
                             FormatMoney(DEFAULT_TRANSACTION_MINFEE_PER_KB)),
                   ArgsManager::ALLOW_ANY, OptionsCategory::WALLET);
    argsman.AddArg(
        "-paytxfee=<amt>",
        strprintf(
            "Fee (in %s/kB) to add to transactions you send (default: %s)",
            ticker, FormatMoney(CFeeRate{DEFAULT_PAY_TX_FEE}.GetFeePerK())),
        ArgsManager::ALLOW_ANY, OptionsCategory::WALLET);
    argsman.AddArg(
        "-rescan",
        "Rescan the block chain for missing wallet transactions on startup",
        ArgsManager::ALLOW_ANY, OptionsCategory::WALLET);
    argsman.AddArg(
        "-spendzeroconfchange",
        strprintf(
            "Spend unconfirmed change when sending transactions (default: %d)",
            DEFAULT_SPEND_ZEROCONF_CHANGE),
        ArgsManager::ALLOW_ANY, OptionsCategory::WALLET);
    argsman.AddArg(
        "-wallet=<path>",
        "Specify wallet database path. Can be specified multiple "
        "times to load multiple wallets. Path is interpreted relative "
        "to <walletdir> if it is not absolute, and will be created if "
        "it does not exist (as a directory containing a wallet.dat "
        "file and log files). For backwards compatibility this will "
        "also accept names of existing data files in <walletdir>.)",
        ArgsManager::ALLOW_ANY | ArgsManager::NETWORK_ONLY,
        OptionsCategory::WALLET);
    argsman.AddArg(
        "-walletbroadcast",
        strprintf("Make the wallet broadcast transactions (default: %d)",
                  DEFAULT_WALLETBROADCAST),
        ArgsManager::ALLOW_ANY, OptionsCategory::WALLET);
    argsman.AddArg("-walletdir=<dir>",
                   "Specify directory to hold wallets (default: "
                   "<datadir>/wallets if it exists, otherwise <datadir>)",
                   ArgsManager::ALLOW_ANY | ArgsManager::NETWORK_ONLY,
                   OptionsCategory::WALLET);
#if defined(HAVE_SYSTEM)
    argsman.AddArg(
        "-walletnotify=<cmd>",
        "Execute command when a wallet transaction changes. %s in cmd "
        "is replaced by TxID and %w is replaced by wallet name. %w is "
        "not currently implemented on windows. On systems where %w is "
        "supported, it should NOT be quoted because this would break "
        "shell escaping used to invoke the command.",
        ArgsManager::ALLOW_ANY, OptionsCategory::WALLET);
#endif
    argsman.AddArg(
        "-dblogsize=<n>",
        strprintf("Flush wallet database activity from memory to disk "
                  "log every <n> megabytes (default: %u)",
                  DEFAULT_WALLET_DBLOGSIZE),
        ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
        OptionsCategory::WALLET_DEBUG_TEST);
    argsman.AddArg(
        "-flushwallet",
        strprintf("Run a thread to flush wallet periodically (default: %d)",
                  DEFAULT_FLUSHWALLET),
        ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
        OptionsCategory::WALLET_DEBUG_TEST);
    argsman.AddArg("-privdb",
                   strprintf("Sets the DB_PRIVATE flag in the wallet db "
                             "environment (default: %d)",
                             DEFAULT_WALLET_PRIVDB),
                   ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
                   OptionsCategory::WALLET_DEBUG_TEST);

    argsman.AddHiddenArgs({"-zapwallettxes"});
}

bool WalletInit::ParameterInteraction() const {
    if (gArgs.GetBoolArg("-disablewallet", DEFAULT_DISABLE_WALLET)) {
        for (const std::string &wallet : gArgs.GetArgs("-wallet")) {
            LogPrintf("%s: parameter interaction: -disablewallet -> ignoring "
                      "-wallet=%s\n",
                      __func__, wallet);
        }

        return true;
    }

    if (gArgs.GetBoolArg("-blocksonly", DEFAULT_BLOCKSONLY) &&
        gArgs.SoftSetBoolArg("-walletbroadcast", false)) {
        LogPrintf("%s: parameter interaction: -blocksonly=1 -> setting "
                  "-walletbroadcast=0\n",
                  __func__);
    }

    if (gArgs.IsArgSet("-zapwallettxes")) {
        return InitError(
            Untranslated("-zapwallettxes has been removed. If you are "
                         "attempting to remove a stuck transaction from your "
                         "wallet, please use abandontransaction instead."));
    }

    if (gArgs.GetBoolArg("-sysperms", false)) {
        return InitError(
            Untranslated("-sysperms is not allowed in combination with enabled "
                         "wallet functionality"));
    }

    return true;
}

void WalletInit::Construct(NodeContext &node) const {
    ArgsManager &args = *Assert(node.args);
    if (args.GetBoolArg("-disablewallet", DEFAULT_DISABLE_WALLET)) {
        LogPrintf("Wallet disabled!\n");
        return;
    }
    auto wallet_client = interfaces::MakeWalletClient(*node.chain, args);
    node.wallet_client = wallet_client.get();
    node.chain_clients.emplace_back(std::move(wallet_client));
}
