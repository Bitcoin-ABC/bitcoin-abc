// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <wallet/load.h>

#include <fs.h>
#include <interfaces/chain.h>
#include <scheduler.h>
#include <util/string.h>
#include <util/system.h>
#include <util/translation.h>
#include <wallet/spend.h>
#include <wallet/wallet.h>
#include <wallet/walletdb.h>

#include <univalue.h>

#include <system_error>

bool VerifyWallets(interfaces::Chain &chain) {
    if (gArgs.IsArgSet("-walletdir")) {
        const fs::path wallet_dir{gArgs.GetPathArg("-walletdir")};
        std::error_code error;
        // The canonical path cleans the path, preventing >1 Berkeley
        // environment instances for the same directory
        fs::path canonical_wallet_dir = fs::canonical(wallet_dir, error);
        if (error || !fs::exists(canonical_wallet_dir)) {
            chain.initError(
                strprintf(_("Specified -walletdir \"%s\" does not exist"),
                          fs::PathToString(wallet_dir)));
            return false;
        } else if (!fs::is_directory(canonical_wallet_dir)) {
            chain.initError(
                strprintf(_("Specified -walletdir \"%s\" is not a directory"),
                          fs::PathToString(wallet_dir)));
            return false;
            // The canonical path transforms relative paths into absolute ones,
            // so we check the non-canonical version
        } else if (!wallet_dir.is_absolute()) {
            chain.initError(
                strprintf(_("Specified -walletdir \"%s\" is a relative path"),
                          fs::PathToString(wallet_dir)));
            return false;
        }
        gArgs.ForceSetArg("-walletdir", fs::PathToString(canonical_wallet_dir));
    }

    LogPrintf("Using wallet directory %s\n", fs::PathToString(GetWalletDir()));

    chain.initMessage(_("Verifying wallet(s)...").translated);

    // For backwards compatibility if an unnamed top level wallet exists in the
    // wallets directory, include it in the default list of wallets to load.
    if (!gArgs.IsArgSet("wallet")) {
        DatabaseOptions options;
        DatabaseStatus status;
        bilingual_str error_string;
        options.require_existing = true;
        options.verify = false;
        if (MakeWalletDatabase("", options, status, error_string)) {
            util::SettingsValue wallets(util::SettingsValue::VARR);
            wallets.push_back(""); // Default wallet name is ""
            // Pass write=false because no need to write file and probably
            // better not to. If unnamed wallet needs to be added next startup
            // and the setting is empty, this code will just run again.
            chain.updateRwSetting("wallet", wallets, /* write= */ false);
        }
    }

    // Keep track of each wallet absolute path to detect duplicates.
    std::set<fs::path> wallet_paths;

    for (const auto &wallet : chain.getSettingsList("wallet")) {
        const auto &wallet_file = wallet.get_str();
        const fs::path path = fsbridge::AbsPathJoin(
            GetWalletDir(), fs::PathFromString(wallet_file));

        if (!wallet_paths.insert(path).second) {
            chain.initWarning(
                strprintf(_("Ignoring duplicate -wallet %s."), wallet_file));
            continue;
        }

        DatabaseOptions options;
        DatabaseStatus status;
        options.require_existing = true;
        options.verify = true;
        bilingual_str error_string;
        if (!MakeWalletDatabase(wallet_file, options, status, error_string)) {
            if (status == DatabaseStatus::FAILED_NOT_FOUND) {
                chain.initWarning(Untranslated(
                    strprintf("Skipping -wallet path that doesn't exist. %s\n",
                              error_string.original)));
            } else {
                chain.initError(error_string);
                return false;
            }
        }
    }

    return true;
}

bool LoadWallets(interfaces::Chain &chain) {
    try {
        std::set<fs::path> wallet_paths;
        for (const auto &wallet : chain.getSettingsList("wallet")) {
            const auto &name = wallet.get_str();
            if (!wallet_paths.insert(fs::PathFromString(name)).second) {
                continue;
            }
            DatabaseOptions options;
            DatabaseStatus status;
            options.require_existing = true;
            // No need to verify, assuming verified earlier in VerifyWallets()
            options.verify = false;
            bilingual_str error;
            std::vector<bilingual_str> warnings;
            std::unique_ptr<WalletDatabase> database =
                MakeWalletDatabase(name, options, status, error);
            if (!database && status == DatabaseStatus::FAILED_NOT_FOUND) {
                continue;
            }
            std::shared_ptr<CWallet> pwallet =
                database
                    ? CWallet::Create(chain, name, std::move(database),
                                      options.create_flags, error, warnings)
                    : nullptr;

            if (!warnings.empty()) {
                chain.initWarning(Join(warnings, Untranslated("\n")));
            }
            if (!pwallet) {
                chain.initError(error);
                return false;
            }
            AddWallet(pwallet);
        }
        return true;
    } catch (const std::runtime_error &e) {
        chain.initError(Untranslated(e.what()));
        return false;
    }
}

void StartWallets(CScheduler &scheduler, const ArgsManager &args) {
    for (const std::shared_ptr<CWallet> &pwallet : GetWallets()) {
        pwallet->postInitProcess();
    }

    // Schedule periodic wallet flushes and tx rebroadcasts
    if (args.GetBoolArg("-flushwallet", DEFAULT_FLUSHWALLET)) {
        scheduler.scheduleEvery(
            [] {
                MaybeCompactWalletDB();
                return true;
            },
            std::chrono::milliseconds{500});
    }
    scheduler.scheduleEvery(
        [] {
            MaybeResendWalletTxs();
            return true;
        },
        std::chrono::milliseconds{1000});
}

void FlushWallets() {
    for (const std::shared_ptr<CWallet> &pwallet : GetWallets()) {
        pwallet->Flush();
    }
}

void StopWallets() {
    for (const std::shared_ptr<CWallet> &pwallet : GetWallets()) {
        pwallet->Close();
    }
}

void UnloadWallets() {
    auto wallets = GetWallets();
    while (!wallets.empty()) {
        auto wallet = wallets.back();
        wallets.pop_back();
        std::vector<bilingual_str> warnings;
        RemoveWallet(wallet, std::nullopt, warnings);
        UnloadWallet(std::move(wallet));
    }
}
