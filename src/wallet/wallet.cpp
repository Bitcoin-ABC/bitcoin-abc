// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <wallet/wallet.h>

#include <chain.h>
#include <chainparams.h>
#include <config.h>
#include <consensus/amount.h>
#include <consensus/consensus.h>
#include <consensus/validation.h>
#include <fs.h>
#include <interfaces/wallet.h>
#include <key.h>
#include <key_io.h>
#include <policy/policy.h>
#include <primitives/transaction.h>
#include <random.h>
#include <script/descriptor.h>
#include <script/script.h>
#include <script/sighashtype.h>
#include <script/sign.h>
#include <script/signingprovider.h>
#include <support/cleanse.h>
#include <txmempool.h>
#include <univalue.h>
#include <util/bip32.h>
#include <util/check.h>
#include <util/error.h>
#include <util/moneystr.h>
#include <util/string.h>
#include <util/translation.h>
#include <wallet/coincontrol.h>
#include <wallet/fees.h>

#include <variant>

using interfaces::FoundBlock;

const std::map<uint64_t, std::string> WALLET_FLAG_CAVEATS{
    {WALLET_FLAG_AVOID_REUSE,
     "You need to rescan the blockchain in order to correctly mark used "
     "destinations in the past. Until this is done, some destinations may "
     "be considered unused, even if the opposite is the case."},
};

RecursiveMutex cs_wallets;
static std::vector<std::shared_ptr<CWallet>> vpwallets GUARDED_BY(cs_wallets);
static std::list<LoadWalletFn> g_load_wallet_fns GUARDED_BY(cs_wallets);

bool AddWalletSetting(interfaces::Chain &chain,
                      const std::string &wallet_name) {
    util::SettingsValue setting_value = chain.getRwSetting("wallet");
    if (!setting_value.isArray()) {
        setting_value.setArray();
    }
    for (const util::SettingsValue &value : setting_value.getValues()) {
        if (value.isStr() && value.get_str() == wallet_name) {
            return true;
        }
    }
    setting_value.push_back(wallet_name);
    return chain.updateRwSetting("wallet", setting_value);
}

bool RemoveWalletSetting(interfaces::Chain &chain,
                         const std::string &wallet_name) {
    util::SettingsValue setting_value = chain.getRwSetting("wallet");
    if (!setting_value.isArray()) {
        return true;
    }
    util::SettingsValue new_value(util::SettingsValue::VARR);
    for (const util::SettingsValue &value : setting_value.getValues()) {
        if (!value.isStr() || value.get_str() != wallet_name) {
            new_value.push_back(value);
        }
    }
    if (new_value.size() == setting_value.size()) {
        return true;
    }
    return chain.updateRwSetting("wallet", new_value);
}

static void UpdateWalletSetting(interfaces::Chain &chain,
                                const std::string &wallet_name,
                                std::optional<bool> load_on_startup,
                                std::vector<bilingual_str> &warnings) {
    if (!load_on_startup) {
        return;
    }
    if (load_on_startup.value() && !AddWalletSetting(chain, wallet_name)) {
        warnings.emplace_back(
            Untranslated("Wallet load on startup setting could not be updated, "
                         "so wallet may not be loaded next node startup."));
    } else if (!load_on_startup.value() &&
               !RemoveWalletSetting(chain, wallet_name)) {
        warnings.emplace_back(
            Untranslated("Wallet load on startup setting could not be updated, "
                         "so wallet may still be loaded next node startup."));
    }
}

bool AddWallet(const std::shared_ptr<CWallet> &wallet) {
    LOCK(cs_wallets);
    assert(wallet);
    std::vector<std::shared_ptr<CWallet>>::const_iterator i =
        std::find(vpwallets.begin(), vpwallets.end(), wallet);
    if (i != vpwallets.end()) {
        return false;
    }
    vpwallets.push_back(wallet);
    wallet->ConnectScriptPubKeyManNotifiers();
    wallet->NotifyCanGetAddressesChanged();
    return true;
}

bool RemoveWallet(const std::shared_ptr<CWallet> &wallet,
                  std::optional<bool> load_on_start,
                  std::vector<bilingual_str> &warnings) {
    assert(wallet);

    interfaces::Chain &chain = wallet->chain();
    std::string name = wallet->GetName();

    // Unregister with the validation interface which also drops shared ponters.
    wallet->m_chain_notifications_handler.reset();
    LOCK(cs_wallets);
    std::vector<std::shared_ptr<CWallet>>::iterator i =
        std::find(vpwallets.begin(), vpwallets.end(), wallet);
    if (i == vpwallets.end()) {
        return false;
    }
    vpwallets.erase(i);

    // Write the wallet setting
    UpdateWalletSetting(chain, name, load_on_start, warnings);

    return true;
}

bool RemoveWallet(const std::shared_ptr<CWallet> &wallet,
                  std::optional<bool> load_on_start) {
    std::vector<bilingual_str> warnings;
    return RemoveWallet(wallet, load_on_start, warnings);
}

std::vector<std::shared_ptr<CWallet>> GetWallets() {
    LOCK(cs_wallets);
    return vpwallets;
}

std::shared_ptr<CWallet> GetWallet(const std::string &name) {
    LOCK(cs_wallets);
    for (const std::shared_ptr<CWallet> &wallet : vpwallets) {
        if (wallet->GetName() == name) {
            return wallet;
        }
    }
    return nullptr;
}

std::unique_ptr<interfaces::Handler>
HandleLoadWallet(LoadWalletFn load_wallet) {
    LOCK(cs_wallets);
    auto it = g_load_wallet_fns.emplace(g_load_wallet_fns.end(),
                                        std::move(load_wallet));
    return interfaces::MakeHandler([it] {
        LOCK(cs_wallets);
        g_load_wallet_fns.erase(it);
    });
}

static Mutex g_loading_wallet_mutex;
static Mutex g_wallet_release_mutex;
static std::condition_variable g_wallet_release_cv;
static std::set<std::string>
    g_loading_wallet_set GUARDED_BY(g_loading_wallet_mutex);
static std::set<std::string>
    g_unloading_wallet_set GUARDED_BY(g_wallet_release_mutex);

// Custom deleter for shared_ptr<CWallet>.
static void ReleaseWallet(CWallet *wallet) {
    const std::string name = wallet->GetName();
    wallet->WalletLogPrintf("Releasing wallet\n");
    wallet->Flush();
    delete wallet;
    // Wallet is now released, notify UnloadWallet, if any.
    {
        LOCK(g_wallet_release_mutex);
        if (g_unloading_wallet_set.erase(name) == 0) {
            // UnloadWallet was not called for this wallet, all done.
            return;
        }
    }
    g_wallet_release_cv.notify_all();
}

void UnloadWallet(std::shared_ptr<CWallet> &&wallet) {
    // Mark wallet for unloading.
    const std::string name = wallet->GetName();
    {
        LOCK(g_wallet_release_mutex);
        auto it = g_unloading_wallet_set.insert(name);
        assert(it.second);
    }
    // The wallet can be in use so it's not possible to explicitly unload here.
    // Notify the unload intent so that all remaining shared pointers are
    // released.
    wallet->NotifyUnload();

    // Time to ditch our shared_ptr and wait for ReleaseWallet call.
    wallet.reset();
    {
        WAIT_LOCK(g_wallet_release_mutex, lock);
        while (g_unloading_wallet_set.count(name) == 1) {
            g_wallet_release_cv.wait(lock);
        }
    }
}

namespace {
std::shared_ptr<CWallet>
LoadWalletInternal(interfaces::Chain &chain, const std::string &name,
                   std::optional<bool> load_on_start,
                   const DatabaseOptions &options, DatabaseStatus &status,
                   bilingual_str &error, std::vector<bilingual_str> &warnings) {
    try {
        std::unique_ptr<WalletDatabase> database =
            MakeWalletDatabase(name, options, status, error);
        if (!database) {
            error = Untranslated("Wallet file verification failed.") +
                    Untranslated(" ") + error;
            return nullptr;
        }

        std::shared_ptr<CWallet> wallet =
            CWallet::Create(chain, name, std::move(database),
                            options.create_flags, error, warnings);
        if (!wallet) {
            error = Untranslated("Wallet loading failed.") + Untranslated(" ") +
                    error;
            status = DatabaseStatus::FAILED_LOAD;
            return nullptr;
        }
        AddWallet(wallet);
        wallet->postInitProcess();

        // Write the wallet setting
        UpdateWalletSetting(chain, name, load_on_start, warnings);

        return wallet;
    } catch (const std::runtime_error &e) {
        error = Untranslated(e.what());
        status = DatabaseStatus::FAILED_LOAD;
        return nullptr;
    }
}
} // namespace

std::shared_ptr<CWallet>
LoadWallet(interfaces::Chain &chain, const std::string &name,
           std::optional<bool> load_on_start, const DatabaseOptions &options,
           DatabaseStatus &status, bilingual_str &error,
           std::vector<bilingual_str> &warnings) {
    auto result = WITH_LOCK(g_loading_wallet_mutex,
                            return g_loading_wallet_set.insert(name));
    if (!result.second) {
        error = Untranslated("Wallet already being loading.");
        status = DatabaseStatus::FAILED_LOAD;
        return nullptr;
    }
    auto wallet = LoadWalletInternal(chain, name, load_on_start, options,
                                     status, error, warnings);
    WITH_LOCK(g_loading_wallet_mutex, g_loading_wallet_set.erase(result.first));
    return wallet;
}

std::shared_ptr<CWallet>
CreateWallet(interfaces::Chain &chain, const std::string &name,
             std::optional<bool> load_on_start, const DatabaseOptions &options,
             DatabaseStatus &status, bilingual_str &error,
             std::vector<bilingual_str> &warnings) {
    uint64_t wallet_creation_flags = options.create_flags;
    const SecureString &passphrase = options.create_passphrase;

    // Indicate that the wallet is actually supposed to be blank and not just
    // blank to make it encrypted
    bool create_blank = (wallet_creation_flags & WALLET_FLAG_BLANK_WALLET);

    // Born encrypted wallets need to be created blank first.
    if (!passphrase.empty()) {
        wallet_creation_flags |= WALLET_FLAG_BLANK_WALLET;
    }

    // Wallet::Verify will check if we're trying to create a wallet with a
    // duplicate name.
    std::unique_ptr<WalletDatabase> database =
        MakeWalletDatabase(name, options, status, error);
    if (!database) {
        error = Untranslated("Wallet file verification failed.") +
                Untranslated(" ") + error;
        status = DatabaseStatus::FAILED_VERIFY;
        return nullptr;
    }

    // Do not allow a passphrase when private keys are disabled
    if (!passphrase.empty() &&
        (wallet_creation_flags & WALLET_FLAG_DISABLE_PRIVATE_KEYS)) {
        error = Untranslated(
            "Passphrase provided but private keys are disabled. A passphrase "
            "is only used to encrypt private keys, so cannot be used for "
            "wallets with private keys disabled.");
        status = DatabaseStatus::FAILED_CREATE;
        return nullptr;
    }

    // Make the wallet
    std::shared_ptr<CWallet> wallet =
        CWallet::Create(chain, name, std::move(database), wallet_creation_flags,
                        error, warnings);
    if (!wallet) {
        error =
            Untranslated("Wallet creation failed.") + Untranslated(" ") + error;
        status = DatabaseStatus::FAILED_CREATE;
        return nullptr;
    }

    // Encrypt the wallet
    if (!passphrase.empty() &&
        !(wallet_creation_flags & WALLET_FLAG_DISABLE_PRIVATE_KEYS)) {
        if (!wallet->EncryptWallet(passphrase)) {
            error =
                Untranslated("Error: Wallet created but failed to encrypt.");
            status = DatabaseStatus::FAILED_ENCRYPT;
            return nullptr;
        }
        if (!create_blank) {
            // Unlock the wallet
            if (!wallet->Unlock(passphrase)) {
                error = Untranslated(
                    "Error: Wallet was encrypted but could not be unlocked");
                status = DatabaseStatus::FAILED_ENCRYPT;
                return nullptr;
            }

            // Set a seed for the wallet
            {
                LOCK(wallet->cs_wallet);
                if (wallet->IsWalletFlagSet(WALLET_FLAG_DESCRIPTORS)) {
                    wallet->SetupDescriptorScriptPubKeyMans();
                } else {
                    for (auto spk_man : wallet->GetActiveScriptPubKeyMans()) {
                        if (!spk_man->SetupGeneration()) {
                            error =
                                Untranslated("Unable to generate initial keys");
                            status = DatabaseStatus::FAILED_CREATE;
                            return nullptr;
                        }
                    }
                }
            }

            // Relock the wallet
            wallet->Lock();
        }
    }
    AddWallet(wallet);
    wallet->postInitProcess();

    // Write the wallet settings
    UpdateWalletSetting(chain, name, load_on_start, warnings);

    status = DatabaseStatus::SUCCESS;
    return wallet;
}

/** @defgroup mapWallet
 *
 * @{
 */

const CChainParams &CWallet::GetChainParams() const {
    // Get CChainParams from interfaces::Chain, unless wallet doesn't have a
    // chain (i.e. bitcoin-wallet), in which case return global Params()
    return m_chain ? m_chain->params() : Params();
}

const CWalletTx *CWallet::GetWalletTx(const TxId &txid) const {
    AssertLockHeld(cs_wallet);
    std::map<TxId, CWalletTx>::const_iterator it = mapWallet.find(txid);
    if (it == mapWallet.end()) {
        return nullptr;
    }

    return &(it->second);
}

void CWallet::UpgradeKeyMetadata() {
    if (IsLocked() || IsWalletFlagSet(WALLET_FLAG_KEY_ORIGIN_METADATA)) {
        return;
    }

    auto spk_man = GetLegacyScriptPubKeyMan();
    if (!spk_man) {
        return;
    }

    spk_man->UpgradeKeyMetadata();
    SetWalletFlag(WALLET_FLAG_KEY_ORIGIN_METADATA);
}

bool CWallet::Unlock(const SecureString &strWalletPassphrase,
                     bool accept_no_keys) {
    CCrypter crypter;
    CKeyingMaterial _vMasterKey;

    {
        LOCK(cs_wallet);
        for (const MasterKeyMap::value_type &pMasterKey : mapMasterKeys) {
            if (!crypter.SetKeyFromPassphrase(
                    strWalletPassphrase, pMasterKey.second.vchSalt,
                    pMasterKey.second.nDeriveIterations,
                    pMasterKey.second.nDerivationMethod)) {
                return false;
            }
            if (!crypter.Decrypt(pMasterKey.second.vchCryptedKey,
                                 _vMasterKey)) {
                // try another master key
                continue;
            }
            if (Unlock(_vMasterKey, accept_no_keys)) {
                // Now that we've unlocked, upgrade the key metadata
                UpgradeKeyMetadata();
                return true;
            }
        }
    }

    return false;
}

bool CWallet::ChangeWalletPassphrase(
    const SecureString &strOldWalletPassphrase,
    const SecureString &strNewWalletPassphrase) {
    bool fWasLocked = IsLocked();

    LOCK(cs_wallet);
    Lock();

    CCrypter crypter;
    CKeyingMaterial _vMasterKey;
    for (MasterKeyMap::value_type &pMasterKey : mapMasterKeys) {
        if (!crypter.SetKeyFromPassphrase(
                strOldWalletPassphrase, pMasterKey.second.vchSalt,
                pMasterKey.second.nDeriveIterations,
                pMasterKey.second.nDerivationMethod)) {
            return false;
        }

        if (!crypter.Decrypt(pMasterKey.second.vchCryptedKey, _vMasterKey)) {
            return false;
        }

        if (Unlock(_vMasterKey)) {
            int64_t nStartTime = GetTimeMillis();
            crypter.SetKeyFromPassphrase(strNewWalletPassphrase,
                                         pMasterKey.second.vchSalt,
                                         pMasterKey.second.nDeriveIterations,
                                         pMasterKey.second.nDerivationMethod);
            pMasterKey.second.nDeriveIterations = static_cast<unsigned int>(
                pMasterKey.second.nDeriveIterations *
                (100 / ((double)(GetTimeMillis() - nStartTime))));

            nStartTime = GetTimeMillis();
            crypter.SetKeyFromPassphrase(strNewWalletPassphrase,
                                         pMasterKey.second.vchSalt,
                                         pMasterKey.second.nDeriveIterations,
                                         pMasterKey.second.nDerivationMethod);
            pMasterKey.second.nDeriveIterations =
                (pMasterKey.second.nDeriveIterations +
                 static_cast<unsigned int>(
                     pMasterKey.second.nDeriveIterations * 100 /
                     double(GetTimeMillis() - nStartTime))) /
                2;

            if (pMasterKey.second.nDeriveIterations < 25000) {
                pMasterKey.second.nDeriveIterations = 25000;
            }

            WalletLogPrintf(
                "Wallet passphrase changed to an nDeriveIterations of %i\n",
                pMasterKey.second.nDeriveIterations);

            if (!crypter.SetKeyFromPassphrase(
                    strNewWalletPassphrase, pMasterKey.second.vchSalt,
                    pMasterKey.second.nDeriveIterations,
                    pMasterKey.second.nDerivationMethod)) {
                return false;
            }

            if (!crypter.Encrypt(_vMasterKey,
                                 pMasterKey.second.vchCryptedKey)) {
                return false;
            }

            WalletBatch(*database).WriteMasterKey(pMasterKey.first,
                                                  pMasterKey.second);
            if (fWasLocked) {
                Lock();
            }

            return true;
        }
    }

    return false;
}

void CWallet::chainStateFlushed(const CBlockLocator &loc) {
    WalletBatch batch(*database);
    batch.WriteBestBlock(loc);
}

void CWallet::SetMinVersion(enum WalletFeature nVersion, WalletBatch *batch_in,
                            bool fExplicit) {
    LOCK(cs_wallet);
    if (nWalletVersion >= nVersion) {
        return;
    }

    // When doing an explicit upgrade, if we pass the max version permitted,
    // upgrade all the way.
    if (fExplicit && nVersion > nWalletMaxVersion) {
        nVersion = FEATURE_LATEST;
    }

    nWalletVersion = nVersion;

    if (nVersion > nWalletMaxVersion) {
        nWalletMaxVersion = nVersion;
    }

    WalletBatch *batch = batch_in ? batch_in : new WalletBatch(*database);
    if (nWalletVersion > 40000) {
        batch->WriteMinVersion(nWalletVersion);
    }
    if (!batch_in) {
        delete batch;
    }
}

bool CWallet::SetMaxVersion(int nVersion) {
    LOCK(cs_wallet);

    // Cannot downgrade below current version
    if (nWalletVersion > nVersion) {
        return false;
    }

    nWalletMaxVersion = nVersion;

    return true;
}

std::set<TxId> CWallet::GetConflicts(const TxId &txid) const {
    std::set<TxId> result;
    AssertLockHeld(cs_wallet);

    std::map<TxId, CWalletTx>::const_iterator it = mapWallet.find(txid);
    if (it == mapWallet.end()) {
        return result;
    }

    const CWalletTx &wtx = it->second;

    std::pair<TxSpends::const_iterator, TxSpends::const_iterator> range;

    for (const CTxIn &txin : wtx.tx->vin) {
        if (mapTxSpends.count(txin.prevout) <= 1) {
            // No conflict if zero or one spends.
            continue;
        }

        range = mapTxSpends.equal_range(txin.prevout);
        for (TxSpends::const_iterator _it = range.first; _it != range.second;
             ++_it) {
            result.insert(_it->second);
        }
    }

    return result;
}

bool CWallet::HasWalletSpend(const TxId &txid) const {
    AssertLockHeld(cs_wallet);
    auto iter = mapTxSpends.lower_bound(COutPoint(txid, 0));
    return (iter != mapTxSpends.end() && iter->first.GetTxId() == txid);
}

void CWallet::Flush() {
    database->Flush();
}

void CWallet::Close() {
    database->Close();
}

void CWallet::SyncMetaData(
    std::pair<TxSpends::iterator, TxSpends::iterator> range) {
    // We want all the wallet transactions in range to have the same metadata as
    // the oldest (smallest nOrderPos).
    // So: find smallest nOrderPos:

    int nMinOrderPos = std::numeric_limits<int>::max();
    const CWalletTx *copyFrom = nullptr;
    for (TxSpends::iterator it = range.first; it != range.second; ++it) {
        const CWalletTx *wtx = &mapWallet.at(it->second);
        if (wtx->nOrderPos < nMinOrderPos) {
            nMinOrderPos = wtx->nOrderPos;
            copyFrom = wtx;
        }
    }

    if (!copyFrom) {
        return;
    }

    // Now copy data from copyFrom to rest:
    for (TxSpends::iterator it = range.first; it != range.second; ++it) {
        const TxId &txid = it->second;
        CWalletTx *copyTo = &mapWallet.at(txid);
        if (copyFrom == copyTo) {
            continue;
        }

        assert(
            copyFrom &&
            "Oldest wallet transaction in range assumed to have been found.");

        if (!copyFrom->IsEquivalentTo(*copyTo)) {
            continue;
        }

        copyTo->mapValue = copyFrom->mapValue;
        copyTo->vOrderForm = copyFrom->vOrderForm;
        // fTimeReceivedIsTxTime not copied on purpose nTimeReceived not copied
        // on purpose.
        copyTo->nTimeSmart = copyFrom->nTimeSmart;
        copyTo->fFromMe = copyFrom->fFromMe;
        // nOrderPos not copied on purpose cached members not copied on purpose.
    }
}

/**
 * Outpoint is spent if any non-conflicted transaction, spends it:
 */
bool CWallet::IsSpent(const COutPoint &outpoint) const {
    AssertLockHeld(cs_wallet);

    std::pair<TxSpends::const_iterator, TxSpends::const_iterator> range =
        mapTxSpends.equal_range(outpoint);

    for (TxSpends::const_iterator it = range.first; it != range.second; ++it) {
        const TxId &wtxid = it->second;
        std::map<TxId, CWalletTx>::const_iterator mit = mapWallet.find(wtxid);
        if (mit != mapWallet.end()) {
            int depth = GetTxDepthInMainChain(mit->second);
            if (depth > 0 || (depth == 0 && !mit->second.isAbandoned())) {
                // Spent
                return true;
            }
        }
    }

    return false;
}

void CWallet::AddToSpends(const COutPoint &outpoint, const TxId &wtxid) {
    mapTxSpends.insert(std::make_pair(outpoint, wtxid));

    setLockedCoins.erase(outpoint);

    std::pair<TxSpends::iterator, TxSpends::iterator> range;
    range = mapTxSpends.equal_range(outpoint);
    SyncMetaData(range);
}

void CWallet::AddToSpends(const TxId &wtxid) {
    auto it = mapWallet.find(wtxid);
    assert(it != mapWallet.end());
    const CWalletTx &thisTx = it->second;
    // Coinbases don't spend anything!
    if (thisTx.IsCoinBase()) {
        return;
    }

    for (const CTxIn &txin : thisTx.tx->vin) {
        AddToSpends(txin.prevout, wtxid);
    }
}

bool CWallet::EncryptWallet(const SecureString &strWalletPassphrase) {
    if (IsCrypted()) {
        return false;
    }

    CKeyingMaterial _vMasterKey;

    _vMasterKey.resize(WALLET_CRYPTO_KEY_SIZE);
    GetStrongRandBytes(&_vMasterKey[0], WALLET_CRYPTO_KEY_SIZE);

    CMasterKey kMasterKey;

    kMasterKey.vchSalt.resize(WALLET_CRYPTO_SALT_SIZE);
    GetStrongRandBytes(&kMasterKey.vchSalt[0], WALLET_CRYPTO_SALT_SIZE);

    CCrypter crypter;
    int64_t nStartTime = GetTimeMillis();
    crypter.SetKeyFromPassphrase(strWalletPassphrase, kMasterKey.vchSalt, 25000,
                                 kMasterKey.nDerivationMethod);
    kMasterKey.nDeriveIterations = static_cast<unsigned int>(
        2500000 / double(GetTimeMillis() - nStartTime));

    nStartTime = GetTimeMillis();
    crypter.SetKeyFromPassphrase(strWalletPassphrase, kMasterKey.vchSalt,
                                 kMasterKey.nDeriveIterations,
                                 kMasterKey.nDerivationMethod);
    kMasterKey.nDeriveIterations =
        (kMasterKey.nDeriveIterations +
         static_cast<unsigned int>(kMasterKey.nDeriveIterations * 100 /
                                   double(GetTimeMillis() - nStartTime))) /
        2;

    if (kMasterKey.nDeriveIterations < 25000) {
        kMasterKey.nDeriveIterations = 25000;
    }

    WalletLogPrintf("Encrypting Wallet with an nDeriveIterations of %i\n",
                    kMasterKey.nDeriveIterations);

    if (!crypter.SetKeyFromPassphrase(strWalletPassphrase, kMasterKey.vchSalt,
                                      kMasterKey.nDeriveIterations,
                                      kMasterKey.nDerivationMethod)) {
        return false;
    }

    if (!crypter.Encrypt(_vMasterKey, kMasterKey.vchCryptedKey)) {
        return false;
    }

    {
        LOCK(cs_wallet);
        mapMasterKeys[++nMasterKeyMaxID] = kMasterKey;
        WalletBatch *encrypted_batch = new WalletBatch(*database);
        if (!encrypted_batch->TxnBegin()) {
            delete encrypted_batch;
            encrypted_batch = nullptr;
            return false;
        }
        encrypted_batch->WriteMasterKey(nMasterKeyMaxID, kMasterKey);

        for (const auto &spk_man_pair : m_spk_managers) {
            auto spk_man = spk_man_pair.second.get();
            if (!spk_man->Encrypt(_vMasterKey, encrypted_batch)) {
                encrypted_batch->TxnAbort();
                delete encrypted_batch;
                encrypted_batch = nullptr;
                // We now probably have half of our keys encrypted in memory,
                // and half not... die and let the user reload the unencrypted
                // wallet.
                assert(false);
            }
        }

        // Encryption was introduced in version 0.4.0
        SetMinVersion(FEATURE_WALLETCRYPT, encrypted_batch, true);

        if (!encrypted_batch->TxnCommit()) {
            delete encrypted_batch;
            encrypted_batch = nullptr;
            // We now have keys encrypted in memory, but not on disk...
            // die to avoid confusion and let the user reload the unencrypted
            // wallet.
            assert(false);
        }

        delete encrypted_batch;
        encrypted_batch = nullptr;

        Lock();
        Unlock(strWalletPassphrase);

        // If we are using descriptors, make new descriptors with a new seed
        if (IsWalletFlagSet(WALLET_FLAG_DESCRIPTORS) &&
            !IsWalletFlagSet(WALLET_FLAG_BLANK_WALLET)) {
            SetupDescriptorScriptPubKeyMans();
        } else if (auto spk_man = GetLegacyScriptPubKeyMan()) {
            // if we are using HD, replace the HD seed with a new one
            if (spk_man->IsHDEnabled()) {
                if (!spk_man->SetupGeneration(true)) {
                    return false;
                }
            }
        }
        Lock();

        // Need to completely rewrite the wallet file; if we don't, bdb might
        // keep bits of the unencrypted private key in slack space in the
        // database file.
        database->Rewrite();

        // BDB seems to have a bad habit of writing old data into
        // slack space in .dat files; that is bad if the old data is
        // unencrypted private keys. So:
        database->ReloadDbEnv();
    }

    NotifyStatusChanged(this);
    return true;
}

DBErrors CWallet::ReorderTransactions() {
    LOCK(cs_wallet);
    WalletBatch batch(*database);

    // Old wallets didn't have any defined order for transactions. Probably a
    // bad idea to change the output of this.

    // First: get all CWalletTx into a sorted-by-time
    // multimap.
    TxItems txByTime;

    for (auto &entry : mapWallet) {
        CWalletTx *wtx = &entry.second;
        txByTime.insert(std::make_pair(wtx->nTimeReceived, wtx));
    }

    nOrderPosNext = 0;
    std::vector<int64_t> nOrderPosOffsets;
    for (TxItems::iterator it = txByTime.begin(); it != txByTime.end(); ++it) {
        CWalletTx *const pwtx = (*it).second;
        int64_t &nOrderPos = pwtx->nOrderPos;

        if (nOrderPos == -1) {
            nOrderPos = nOrderPosNext++;
            nOrderPosOffsets.push_back(nOrderPos);

            if (!batch.WriteTx(*pwtx)) {
                return DBErrors::LOAD_FAIL;
            }
        } else {
            int64_t nOrderPosOff = 0;
            for (const int64_t &nOffsetStart : nOrderPosOffsets) {
                if (nOrderPos >= nOffsetStart) {
                    ++nOrderPosOff;
                }
            }

            nOrderPos += nOrderPosOff;
            nOrderPosNext = std::max(nOrderPosNext, nOrderPos + 1);

            if (!nOrderPosOff) {
                continue;
            }

            // Since we're changing the order, write it back.
            if (!batch.WriteTx(*pwtx)) {
                return DBErrors::LOAD_FAIL;
            }
        }
    }

    batch.WriteOrderPosNext(nOrderPosNext);

    return DBErrors::LOAD_OK;
}

int64_t CWallet::IncOrderPosNext(WalletBatch *batch) {
    AssertLockHeld(cs_wallet);
    int64_t nRet = nOrderPosNext++;
    if (batch) {
        batch->WriteOrderPosNext(nOrderPosNext);
    } else {
        WalletBatch(*database).WriteOrderPosNext(nOrderPosNext);
    }

    return nRet;
}

void CWallet::MarkDirty() {
    LOCK(cs_wallet);
    for (std::pair<const TxId, CWalletTx> &item : mapWallet) {
        item.second.MarkDirty();
    }
}

void CWallet::SetSpentKeyState(WalletBatch &batch, const TxId &txid,
                               unsigned int n, bool used,
                               std::set<CTxDestination> &tx_destinations) {
    AssertLockHeld(cs_wallet);
    const CWalletTx *srctx = GetWalletTx(txid);
    if (!srctx) {
        return;
    }

    CTxDestination dst;
    if (ExtractDestination(srctx->tx->vout[n].scriptPubKey, dst)) {
        if (IsMine(dst)) {
            if (used && !GetDestData(dst, "used", nullptr)) {
                // p for "present", opposite of absent (null)
                if (AddDestData(batch, dst, "used", "p")) {
                    tx_destinations.insert(dst);
                }
            } else if (!used && GetDestData(dst, "used", nullptr)) {
                EraseDestData(batch, dst, "used");
            }
        }
    }
}

bool CWallet::IsSpentKey(const TxId &txid, unsigned int n) const {
    AssertLockHeld(cs_wallet);
    const CWalletTx *srctx = GetWalletTx(txid);
    if (srctx) {
        assert(srctx->tx->vout.size() > n);
        CTxDestination dest;
        if (!ExtractDestination(srctx->tx->vout[n].scriptPubKey, dest)) {
            return false;
        }
        if (GetDestData(dest, "used", nullptr)) {
            return true;
        }
        if (IsLegacy()) {
            LegacyScriptPubKeyMan *spk_man = GetLegacyScriptPubKeyMan();
            assert(spk_man != nullptr);
            for (const auto &keyid :
                 GetAffectedKeys(srctx->tx->vout[n].scriptPubKey, *spk_man)) {
                PKHash pkh_dest(keyid);
                if (GetDestData(pkh_dest, "used", nullptr)) {
                    return true;
                }
            }
        }
    }
    return false;
}

CWalletTx *CWallet::AddToWallet(CTransactionRef tx,
                                const CWalletTx::Confirmation &confirm,
                                const UpdateWalletTxFn &update_wtx,
                                bool fFlushOnClose) {
    LOCK(cs_wallet);

    WalletBatch batch(*database, fFlushOnClose);

    const TxId &txid = tx->GetId();

    if (IsWalletFlagSet(WALLET_FLAG_AVOID_REUSE)) {
        // Mark used destinations
        std::set<CTxDestination> tx_destinations;

        for (const CTxIn &txin : tx->vin) {
            const COutPoint &op = txin.prevout;
            SetSpentKeyState(batch, op.GetTxId(), op.GetN(), true,
                             tx_destinations);
        }

        MarkDestinationsDirty(tx_destinations);
    }

    // Inserts only if not already there, returns tx inserted or tx found.
    auto ret =
        mapWallet.emplace(std::piecewise_construct, std::forward_as_tuple(txid),
                          std::forward_as_tuple(tx));
    CWalletTx &wtx = (*ret.first).second;
    bool fInsertedNew = ret.second;
    bool fUpdated = update_wtx && update_wtx(wtx, fInsertedNew);
    if (fInsertedNew) {
        wtx.m_confirm = confirm;
        wtx.nTimeReceived = chain().getAdjustedTime();
        wtx.nOrderPos = IncOrderPosNext(&batch);
        wtx.m_it_wtxOrdered =
            wtxOrdered.insert(std::make_pair(wtx.nOrderPos, &wtx));
        wtx.nTimeSmart = ComputeTimeSmart(wtx);
        AddToSpends(txid);
    }

    if (!fInsertedNew) {
        if (confirm.status != wtx.m_confirm.status) {
            wtx.m_confirm.status = confirm.status;
            wtx.m_confirm.nIndex = confirm.nIndex;
            wtx.m_confirm.hashBlock = confirm.hashBlock;
            wtx.m_confirm.block_height = confirm.block_height;
            fUpdated = true;
        } else {
            assert(wtx.m_confirm.nIndex == confirm.nIndex);
            assert(wtx.m_confirm.hashBlock == confirm.hashBlock);
            assert(wtx.m_confirm.block_height == confirm.block_height);
        }
    }

    //// debug print
    WalletLogPrintf("AddToWallet %s  %s%s\n", txid.ToString(),
                    (fInsertedNew ? "new" : ""), (fUpdated ? "update" : ""));

    // Write to disk
    if ((fInsertedNew || fUpdated) && !batch.WriteTx(wtx)) {
        return nullptr;
    }

    // Break debit/credit balance caches:
    wtx.MarkDirty();

    // Notify UI of new or updated transaction.
    NotifyTransactionChanged(this, txid, fInsertedNew ? CT_NEW : CT_UPDATED);

#if defined(HAVE_SYSTEM)
    // Notify an external script when a wallet transaction comes in or is
    // updated.
    std::string strCmd = gArgs.GetArg("-walletnotify", "");

    if (!strCmd.empty()) {
        ReplaceAll(strCmd, "%s", txid.GetHex());
#ifndef WIN32
        // Substituting the wallet name isn't currently supported on windows
        // because windows shell escaping has not been implemented yet:
        // https://github.com/bitcoin/bitcoin/pull/13339#issuecomment-537384875
        // A few ways it could be implemented in the future are described in:
        // https://github.com/bitcoin/bitcoin/pull/13339#issuecomment-461288094
        ReplaceAll(strCmd, "%w", ShellEscape(GetName()));
#endif

        std::thread t(runCommand, strCmd);
        // Thread runs free.
        t.detach();
    }
#endif

    return &wtx;
}

bool CWallet::LoadToWallet(const TxId &txid, const UpdateWalletTxFn &fill_wtx) {
    const auto &ins =
        mapWallet.emplace(std::piecewise_construct, std::forward_as_tuple(txid),
                          std::forward_as_tuple(nullptr));
    CWalletTx &wtx = ins.first->second;
    if (!fill_wtx(wtx, ins.second)) {
        return false;
    }
    // If wallet doesn't have a chain (e.g wallet-tool), don't bother to update
    // txn.
    if (HaveChain()) {
        bool active;
        int height;
        if (chain().findBlock(
                wtx.m_confirm.hashBlock,
                FoundBlock().inActiveChain(active).height(height)) &&
            active) {
            // Update cached block height variable since it not stored in the
            // serialized transaction.
            wtx.m_confirm.block_height = height;
        } else if (wtx.isConflicted() || wtx.isConfirmed()) {
            // If tx block (or conflicting block) was reorged out of chain
            // while the wallet was shutdown, change tx status to UNCONFIRMED
            // and reset block height, hash, and index. ABANDONED tx don't have
            // associated blocks and don't need to be updated. The case where a
            // transaction was reorged out while online and then reconfirmed
            // while offline is covered by the rescan logic.
            wtx.setUnconfirmed();
            wtx.m_confirm.hashBlock = BlockHash();
            wtx.m_confirm.block_height = 0;
            wtx.m_confirm.nIndex = 0;
        }
    }
    if (/* insertion took place */ ins.second) {
        wtx.m_it_wtxOrdered =
            wtxOrdered.insert(std::make_pair(wtx.nOrderPos, &wtx));
    }
    AddToSpends(txid);
    for (const CTxIn &txin : wtx.tx->vin) {
        auto it = mapWallet.find(txin.prevout.GetTxId());
        if (it != mapWallet.end()) {
            CWalletTx &prevtx = it->second;
            if (prevtx.isConflicted()) {
                MarkConflicted(prevtx.m_confirm.hashBlock,
                               prevtx.m_confirm.block_height, wtx.GetId());
            }
        }
    }
    return true;
}

bool CWallet::AddToWalletIfInvolvingMe(const CTransactionRef &ptx,
                                       CWalletTx::Confirmation confirm,
                                       bool fUpdate) {
    AssertLockHeld(cs_wallet);

    const TxId &txid = ptx->GetId();

    if (!confirm.hashBlock.IsNull()) {
        for (const CTxIn &txin : ptx->vin) {
            std::pair<TxSpends::const_iterator, TxSpends::const_iterator>
                range = mapTxSpends.equal_range(txin.prevout);
            while (range.first != range.second) {
                if (range.first->second != txid) {
                    WalletLogPrintf(
                        "Transaction %s (in block %s) conflicts with wallet "
                        "transaction %s (both spend %s:%i)\n",
                        txid.ToString(), confirm.hashBlock.ToString(),
                        range.first->second.ToString(),
                        range.first->first.GetTxId().ToString(),
                        range.first->first.GetN());
                    MarkConflicted(confirm.hashBlock, confirm.block_height,
                                   range.first->second);
                }
                range.first++;
            }
        }
    }

    bool fExisted = mapWallet.count(txid) != 0;
    if (fExisted && !fUpdate) {
        return false;
    }
    if (fExisted || IsMine(*ptx) || IsFromMe(*ptx)) {
        /**
         * Check if any keys in the wallet keypool that were supposed to be
         * unused have appeared in a new transaction. If so, remove those keys
         * from the keypool. This can happen when restoring an old wallet backup
         * that does not contain the mostly recently created transactions from
         * newer versions of the wallet.
         */

        // loop though all outputs
        for (const CTxOut &txout : ptx->vout) {
            for (const auto &spk_man_pair : m_spk_managers) {
                spk_man_pair.second->MarkUnusedAddresses(txout.scriptPubKey);
            }
        }

        // Block disconnection override an abandoned tx as unconfirmed
        // which means user may have to call abandontransaction again
        return AddToWallet(ptx, confirm,
                           /* update_wtx= */ nullptr,
                           /* fFlushOnClose= */ false);
    }
    return false;
}

bool CWallet::TransactionCanBeAbandoned(const TxId &txid) const {
    LOCK(cs_wallet);
    const CWalletTx *wtx = GetWalletTx(txid);
    return wtx && !wtx->isAbandoned() && GetTxDepthInMainChain(*wtx) == 0 &&
           !wtx->InMempool();
}

void CWallet::MarkInputsDirty(const CTransactionRef &tx) {
    for (const CTxIn &txin : tx->vin) {
        auto it = mapWallet.find(txin.prevout.GetTxId());
        if (it != mapWallet.end()) {
            it->second.MarkDirty();
        }
    }
}

bool CWallet::AbandonTransaction(const TxId &txid) {
    LOCK(cs_wallet);

    WalletBatch batch(*database);

    std::set<TxId> todo;
    std::set<TxId> done;

    // Can't mark abandoned if confirmed or in mempool
    auto it = mapWallet.find(txid);
    assert(it != mapWallet.end());
    const CWalletTx &origtx = it->second;
    if (GetTxDepthInMainChain(origtx) != 0 || origtx.InMempool()) {
        return false;
    }

    todo.insert(txid);

    while (!todo.empty()) {
        const TxId now = *todo.begin();
        todo.erase(now);
        done.insert(now);
        it = mapWallet.find(now);
        assert(it != mapWallet.end());
        CWalletTx &wtx = it->second;
        int currentconfirm = GetTxDepthInMainChain(wtx);
        // If the orig tx was not in block, none of its spends can be.
        assert(currentconfirm <= 0);
        // If (currentconfirm < 0) {Tx and spends are already conflicted, no
        // need to abandon}
        if (currentconfirm == 0 && !wtx.isAbandoned()) {
            // If the orig tx was not in block/mempool, none of its spends can
            // be in mempool.
            assert(!wtx.InMempool());
            wtx.setAbandoned();
            wtx.MarkDirty();
            batch.WriteTx(wtx);
            NotifyTransactionChanged(this, wtx.GetId(), CT_UPDATED);
            // Iterate over all its outputs, and mark transactions in the wallet
            // that spend them abandoned too.
            TxSpends::const_iterator iter =
                mapTxSpends.lower_bound(COutPoint(now, 0));
            while (iter != mapTxSpends.end() && iter->first.GetTxId() == now) {
                if (!done.count(iter->second)) {
                    todo.insert(iter->second);
                }
                iter++;
            }

            // If a transaction changes 'conflicted' state, that changes the
            // balance available of the outputs it spends. So force those to be
            // recomputed.
            MarkInputsDirty(wtx.tx);
        }
    }

    return true;
}

void CWallet::MarkConflicted(const BlockHash &hashBlock, int conflicting_height,
                             const TxId &txid) {
    LOCK(cs_wallet);

    int conflictconfirms =
        (m_last_block_processed_height - conflicting_height + 1) * -1;

    // If number of conflict confirms cannot be determined, this means that the
    // block is still unknown or not yet part of the main chain, for example
    // when loading the wallet during a reindex. Do nothing in that case.
    if (conflictconfirms >= 0) {
        return;
    }

    // Do not flush the wallet here for performance reasons.
    WalletBatch batch(*database, false);

    std::set<TxId> todo;
    std::set<TxId> done;

    todo.insert(txid);

    while (!todo.empty()) {
        const TxId now = *todo.begin();
        todo.erase(now);
        done.insert(now);
        auto it = mapWallet.find(now);
        assert(it != mapWallet.end());
        CWalletTx &wtx = it->second;
        int currentconfirm = GetTxDepthInMainChain(wtx);
        if (conflictconfirms < currentconfirm) {
            // Block is 'more conflicted' than current confirm; update.
            // Mark transaction as conflicted with this block.
            wtx.m_confirm.nIndex = 0;
            wtx.m_confirm.hashBlock = hashBlock;
            wtx.m_confirm.block_height = conflicting_height;
            wtx.setConflicted();
            wtx.MarkDirty();
            batch.WriteTx(wtx);
            // Iterate over all its outputs, and mark transactions in the wallet
            // that spend them conflicted too.
            TxSpends::const_iterator iter =
                mapTxSpends.lower_bound(COutPoint(now, 0));
            while (iter != mapTxSpends.end() && iter->first.GetTxId() == now) {
                if (!done.count(iter->second)) {
                    todo.insert(iter->second);
                }
                iter++;
            }
            // If a transaction changes 'conflicted' state, that changes the
            // balance available of the outputs it spends. So force those to be
            // recomputed.
            MarkInputsDirty(wtx.tx);
        }
    }
}

void CWallet::SyncTransaction(const CTransactionRef &ptx,
                              CWalletTx::Confirmation confirm, bool update_tx) {
    if (!AddToWalletIfInvolvingMe(ptx, confirm, update_tx)) {
        // Not one of ours
        return;
    }

    // If a transaction changes 'conflicted' state, that changes the balance
    // available of the outputs it spends. So force those to be
    // recomputed, also:
    MarkInputsDirty(ptx);
}

void CWallet::transactionAddedToMempool(const CTransactionRef &tx,
                                        uint64_t mempool_sequence) {
    LOCK(cs_wallet);

    SyncTransaction(tx, {CWalletTx::Status::UNCONFIRMED, /* block_height */ 0,
                         BlockHash(), /* nIndex */ 0});

    auto it = mapWallet.find(tx->GetId());
    if (it != mapWallet.end()) {
        it->second.fInMempool = true;
    }
}

void CWallet::transactionRemovedFromMempool(const CTransactionRef &tx,
                                            MemPoolRemovalReason reason,
                                            uint64_t mempool_sequence) {
    LOCK(cs_wallet);
    auto it = mapWallet.find(tx->GetId());
    if (it != mapWallet.end()) {
        it->second.fInMempool = false;
    }
    // Handle transactions that were removed from the mempool because they
    // conflict with transactions in a newly connected block.
    if (reason == MemPoolRemovalReason::CONFLICT) {
        // Call SyncNotifications, so external -walletnotify notifications will
        // be triggered for these transactions. Set Status::UNCONFIRMED instead
        // of Status::CONFLICTED for a few reasons:
        //
        // 1. The transactionRemovedFromMempool callback does not currently
        //    provide the conflicting block's hash and height, and for backwards
        //    compatibility reasons it may not be not safe to store conflicted
        //    wallet transactions with a null block hash. See
        //    https://github.com/bitcoin/bitcoin/pull/18600#discussion_r420195993.
        // 2. For most of these transactions, the wallet's internal conflict
        //    detection in the blockConnected handler will subsequently call
        //    MarkConflicted and update them with CONFLICTED status anyway. This
        //    applies to any wallet transaction that has inputs spent in the
        //    block, or that has ancestors in the wallet with inputs spent by
        //    the block.
        // 3. Longstanding behavior since the sync implementation in
        //    https://github.com/bitcoin/bitcoin/pull/9371 and the prior sync
        //    implementation before that was to mark these transactions
        //    unconfirmed rather than conflicted.
        //
        // Nothing described above should be seen as an unchangeable requirement
        // when improving this code in the future. The wallet's heuristics for
        // distinguishing between conflicted and unconfirmed transactions are
        // imperfect, and could be improved in general, see
        // https://github.com/bitcoin-core/bitcoin-devwiki/wiki/Wallet-Transaction-Conflict-Tracking
        SyncTransaction(tx,
                        {CWalletTx::Status::UNCONFIRMED, /* block height  */ 0,
                         BlockHash(), /* index */ 0});
    }
}

void CWallet::blockConnected(const CBlock &block, int height) {
    const BlockHash &block_hash = block.GetHash();
    LOCK(cs_wallet);

    m_last_block_processed_height = height;
    m_last_block_processed = block_hash;
    for (size_t index = 0; index < block.vtx.size(); index++) {
        SyncTransaction(block.vtx[index], {CWalletTx::Status::CONFIRMED, height,
                                           block_hash, int(index)});
        transactionRemovedFromMempool(block.vtx[index],
                                      MemPoolRemovalReason::BLOCK,
                                      0 /* mempool_sequence */);
    }
}

void CWallet::blockDisconnected(const CBlock &block, int height) {
    LOCK(cs_wallet);

    // At block disconnection, this will change an abandoned transaction to
    // be unconfirmed, whether or not the transaction is added back to the
    // mempool. User may have to call abandontransaction again. It may be
    // addressed in the future with a stickier abandoned state or even removing
    // abandontransaction call.
    m_last_block_processed_height = height - 1;
    m_last_block_processed = block.hashPrevBlock;
    for (const CTransactionRef &ptx : block.vtx) {
        SyncTransaction(ptx,
                        {CWalletTx::Status::UNCONFIRMED, /* block_height */ 0,
                         BlockHash(), /* nIndex */ 0});
    }
}

void CWallet::updatedBlockTip() {
    m_best_block_time = GetTime();
}

void CWallet::BlockUntilSyncedToCurrentChain() const {
    AssertLockNotHeld(cs_wallet);
    // Skip the queue-draining stuff if we know we're caught up with
    // chain().Tip(), otherwise put a callback in the validation interface
    // queue and wait for the queue to drain enough to execute it (indicating we
    // are caught up at least with the time we entered this function).
    const BlockHash last_block_hash =
        WITH_LOCK(cs_wallet, return m_last_block_processed);
    chain().waitForNotificationsIfTipChanged(last_block_hash);
}

// Note that this function doesn't distinguish between a 0-valued input, and a
// not-"is mine" (according to the filter) input.
Amount CWallet::GetDebit(const CTxIn &txin, const isminefilter &filter) const {
    LOCK(cs_wallet);
    std::map<TxId, CWalletTx>::const_iterator mi =
        mapWallet.find(txin.prevout.GetTxId());
    if (mi != mapWallet.end()) {
        const CWalletTx &prev = (*mi).second;
        if (txin.prevout.GetN() < prev.tx->vout.size()) {
            if (IsMine(prev.tx->vout[txin.prevout.GetN()]) & filter) {
                return prev.tx->vout[txin.prevout.GetN()].nValue;
            }
        }
    }

    return Amount::zero();
}

isminetype CWallet::IsMine(const CTxOut &txout) const {
    AssertLockHeld(cs_wallet);
    return IsMine(txout.scriptPubKey);
}

isminetype CWallet::IsMine(const CTxDestination &dest) const {
    AssertLockHeld(cs_wallet);
    return IsMine(GetScriptForDestination(dest));
}

isminetype CWallet::IsMine(const CScript &script) const {
    AssertLockHeld(cs_wallet);
    isminetype result = ISMINE_NO;
    for (const auto &spk_man_pair : m_spk_managers) {
        result = std::max(result, spk_man_pair.second->IsMine(script));
    }
    return result;
}

bool CWallet::IsMine(const CTransaction &tx) const {
    AssertLockHeld(cs_wallet);
    for (const CTxOut &txout : tx.vout) {
        if (IsMine(txout)) {
            return true;
        }
    }

    return false;
}

bool CWallet::IsFromMe(const CTransaction &tx) const {
    return GetDebit(tx, ISMINE_ALL) > Amount::zero();
}

Amount CWallet::GetDebit(const CTransaction &tx,
                         const isminefilter &filter) const {
    Amount nDebit = Amount::zero();
    for (const CTxIn &txin : tx.vin) {
        nDebit += GetDebit(txin, filter);
        if (!MoneyRange(nDebit)) {
            throw std::runtime_error(std::string(__func__) +
                                     ": value out of range");
        }
    }

    return nDebit;
}

bool CWallet::IsHDEnabled() const {
    // All Active ScriptPubKeyMans must be HD for this to be true
    bool result = true;
    for (const auto &spk_man : GetActiveScriptPubKeyMans()) {
        result &= spk_man->IsHDEnabled();
    }
    return result;
}

bool CWallet::CanGetAddresses(bool internal) const {
    LOCK(cs_wallet);
    if (m_spk_managers.empty()) {
        return false;
    }
    for (OutputType t : OUTPUT_TYPES) {
        auto spk_man = GetScriptPubKeyMan(t, internal);
        if (spk_man && spk_man->CanGetAddresses(internal)) {
            return true;
        }
    }
    return false;
}

void CWallet::SetWalletFlag(uint64_t flags) {
    LOCK(cs_wallet);
    m_wallet_flags |= flags;
    if (!WalletBatch(*database).WriteWalletFlags(m_wallet_flags)) {
        throw std::runtime_error(std::string(__func__) +
                                 ": writing wallet flags failed");
    }
}

void CWallet::UnsetWalletFlag(uint64_t flag) {
    WalletBatch batch(*database);
    UnsetWalletFlagWithDB(batch, flag);
}

void CWallet::UnsetWalletFlagWithDB(WalletBatch &batch, uint64_t flag) {
    LOCK(cs_wallet);
    m_wallet_flags &= ~flag;
    if (!batch.WriteWalletFlags(m_wallet_flags)) {
        throw std::runtime_error(std::string(__func__) +
                                 ": writing wallet flags failed");
    }
}

void CWallet::UnsetBlankWalletFlag(WalletBatch &batch) {
    UnsetWalletFlagWithDB(batch, WALLET_FLAG_BLANK_WALLET);
}

bool CWallet::IsWalletFlagSet(uint64_t flag) const {
    return (m_wallet_flags & flag);
}

bool CWallet::LoadWalletFlags(uint64_t flags) {
    LOCK(cs_wallet);
    if (((flags & KNOWN_WALLET_FLAGS) >> 32) ^ (flags >> 32)) {
        // contains unknown non-tolerable wallet flags
        return false;
    }
    m_wallet_flags = flags;

    return true;
}

bool CWallet::AddWalletFlags(uint64_t flags) {
    LOCK(cs_wallet);
    // We should never be writing unknown non-tolerable wallet flags
    assert(((flags & KNOWN_WALLET_FLAGS) >> 32) == (flags >> 32));
    if (!WalletBatch(*database).WriteWalletFlags(flags)) {
        throw std::runtime_error(std::string(__func__) +
                                 ": writing wallet flags failed");
    }

    return LoadWalletFlags(flags);
}

// Helper for producing a max-sized low-S low-R signature (eg 71 bytes)
// or a max-sized low-S signature (e.g. 72 bytes) if use_max_sig is true
bool CWallet::DummySignInput(CTxIn &tx_in, const CTxOut &txout,
                             bool use_max_sig) const {
    // Fill in dummy signatures for fee calculation.
    const CScript &scriptPubKey = txout.scriptPubKey;
    SignatureData sigdata;

    std::unique_ptr<SigningProvider> provider =
        GetSolvingProvider(scriptPubKey);
    if (!provider) {
        // We don't know about this scriptpbuKey;
        return false;
    }

    if (!ProduceSignature(*provider,
                          use_max_sig ? DUMMY_MAXIMUM_SIGNATURE_CREATOR
                                      : DUMMY_SIGNATURE_CREATOR,
                          scriptPubKey, sigdata)) {
        return false;
    }

    UpdateInput(tx_in, sigdata);
    return true;
}

// Helper for producing a bunch of max-sized low-S low-R signatures (eg 71
// bytes)
bool CWallet::DummySignTx(CMutableTransaction &txNew,
                          const std::vector<CTxOut> &txouts,
                          bool use_max_sig) const {
    // Fill in dummy signatures for fee calculation.
    int nIn = 0;
    for (const auto &txout : txouts) {
        if (!DummySignInput(txNew.vin[nIn], txout, use_max_sig)) {
            return false;
        }

        nIn++;
    }
    return true;
}

bool CWallet::ImportScripts(const std::set<CScript> scripts,
                            int64_t timestamp) {
    auto spk_man = GetLegacyScriptPubKeyMan();
    if (!spk_man) {
        return false;
    }
    LOCK(spk_man->cs_KeyStore);
    return spk_man->ImportScripts(scripts, timestamp);
}

bool CWallet::ImportPrivKeys(const std::map<CKeyID, CKey> &privkey_map,
                             const int64_t timestamp) {
    auto spk_man = GetLegacyScriptPubKeyMan();
    if (!spk_man) {
        return false;
    }
    LOCK(spk_man->cs_KeyStore);
    return spk_man->ImportPrivKeys(privkey_map, timestamp);
}

bool CWallet::ImportPubKeys(
    const std::vector<CKeyID> &ordered_pubkeys,
    const std::map<CKeyID, CPubKey> &pubkey_map,
    const std::map<CKeyID, std::pair<CPubKey, KeyOriginInfo>> &key_origins,
    const bool add_keypool, const bool internal, const int64_t timestamp) {
    auto spk_man = GetLegacyScriptPubKeyMan();
    if (!spk_man) {
        return false;
    }
    LOCK(spk_man->cs_KeyStore);
    return spk_man->ImportPubKeys(ordered_pubkeys, pubkey_map, key_origins,
                                  add_keypool, internal, timestamp);
}

bool CWallet::ImportScriptPubKeys(const std::string &label,
                                  const std::set<CScript> &script_pub_keys,
                                  const bool have_solving_data,
                                  const bool apply_label,
                                  const int64_t timestamp) {
    auto spk_man = GetLegacyScriptPubKeyMan();
    if (!spk_man) {
        return false;
    }
    LOCK(spk_man->cs_KeyStore);
    if (!spk_man->ImportScriptPubKeys(script_pub_keys, have_solving_data,
                                      timestamp)) {
        return false;
    }
    if (apply_label) {
        WalletBatch batch(*database);
        for (const CScript &script : script_pub_keys) {
            CTxDestination dest;
            ExtractDestination(script, dest);
            if (IsValidDestination(dest)) {
                SetAddressBookWithDB(batch, dest, label, "receive");
            }
        }
    }
    return true;
}

/**
 * Scan active chain for relevant transactions after importing keys. This should
 * be called whenever new keys are added to the wallet, with the oldest key
 * creation time.
 *
 * @return Earliest timestamp that could be successfully scanned from. Timestamp
 * returned will be higher than startTime if relevant blocks could not be read.
 */
int64_t CWallet::RescanFromTime(int64_t startTime,
                                const WalletRescanReserver &reserver,
                                bool update) {
    // Find starting block. May be null if nCreateTime is greater than the
    // highest blockchain timestamp, in which case there is nothing that needs
    // to be scanned.
    int start_height = 0;
    BlockHash start_block;
    bool start = chain().findFirstBlockWithTimeAndHeight(
        startTime - TIMESTAMP_WINDOW, 0,
        FoundBlock().hash(start_block).height(start_height));
    WalletLogPrintf("%s: Rescanning last %i blocks\n", __func__,
                    start ? WITH_LOCK(cs_wallet, return GetLastBlockHeight()) -
                                start_height + 1
                          : 0);

    if (start) {
        // TODO: this should take into account failure by ScanResult::USER_ABORT
        ScanResult result = ScanForWalletTransactions(
            start_block, start_height, {} /* max_height */, reserver, update);
        if (result.status == ScanResult::FAILURE) {
            int64_t time_max;
            CHECK_NONFATAL(chain().findBlock(result.last_failed_block,
                                             FoundBlock().maxTime(time_max)));
            return time_max + TIMESTAMP_WINDOW + 1;
        }
    }
    return startTime;
}

/**
 * Scan the block chain (starting in start_block) for transactions from or to
 * us. If fUpdate is true, found transactions that already exist in the wallet
 * will be updated.
 *
 * @param[in] start_block Scan starting block. If block is not on the active
 *                        chain, the scan will return SUCCESS immediately.
 * @param[in] start_height Height of start_block
 * @param[in] max_height  Optional max scanning height. If unset there is
 *                        no maximum and scanning can continue to the tip
 *
 * @return ScanResult returning scan information and indicating success or
 *         failure. Return status will be set to SUCCESS if scan was
 *         successful. FAILURE if a complete rescan was not possible (due to
 *         pruning or corruption). USER_ABORT if the rescan was aborted before
 *         it could complete.
 *
 * @pre Caller needs to make sure start_block (and the optional stop_block) are
 * on the main chain after to the addition of any new keys you want to detect
 * transactions for.
 */
CWallet::ScanResult CWallet::ScanForWalletTransactions(
    const BlockHash &start_block, int start_height,
    std::optional<int> max_height, const WalletRescanReserver &reserver,
    bool fUpdate) {
    int64_t nNow = GetTime();
    int64_t start_time = GetTimeMillis();

    assert(reserver.isReserved());

    BlockHash block_hash = start_block;
    ScanResult result;

    WalletLogPrintf("Rescan started from block %s...\n",
                    start_block.ToString());

    fAbortRescan = false;
    // Show rescan progress in GUI as dialog or on splashscreen, if -rescan on
    // startup.
    ShowProgress(
        strprintf("%s " + _("Rescanning...").translated, GetDisplayName()), 0);
    BlockHash tip_hash = WITH_LOCK(cs_wallet, return GetLastBlockHash());
    BlockHash end_hash = tip_hash;
    if (max_height) {
        chain().findAncestorByHeight(tip_hash, *max_height,
                                     FoundBlock().hash(end_hash));
    }
    double progress_begin = chain().guessVerificationProgress(block_hash);
    double progress_end = chain().guessVerificationProgress(end_hash);
    double progress_current = progress_begin;
    int block_height = start_height;
    while (!fAbortRescan && !chain().shutdownRequested()) {
        if (progress_end - progress_begin > 0.0) {
            m_scanning_progress = (progress_current - progress_begin) /
                                  (progress_end - progress_begin);
        } else {
            // avoid divide-by-zero for single block scan range (i.e. start and
            // stop hashes are equal)
            m_scanning_progress = 0;
        }
        if (block_height % 100 == 0 && progress_end - progress_begin > 0.0) {
            ShowProgress(
                strprintf("%s " + _("Rescanning...").translated,
                          GetDisplayName()),
                std::max(1, std::min(99, (int)(m_scanning_progress * 100))));
        }
        if (GetTime() >= nNow + 60) {
            nNow = GetTime();
            WalletLogPrintf("Still rescanning. At block %d. Progress=%f\n",
                            block_height, progress_current);
        }

        // Read block data
        CBlock block;
        chain().findBlock(block_hash, FoundBlock().data(block));

        // Find next block separately from reading data above, because reading
        // is slow and there might be a reorg while it is read.
        bool block_still_active = false;
        bool next_block = false;
        BlockHash next_block_hash;
        chain().findBlock(block_hash,
                          FoundBlock()
                              .inActiveChain(block_still_active)
                              .nextBlock(FoundBlock()
                                             .inActiveChain(next_block)
                                             .hash(next_block_hash)));

        if (!block.IsNull()) {
            LOCK(cs_wallet);
            if (!block_still_active) {
                // Abort scan if current block is no longer active, to prevent
                // marking transactions as coming from the wrong block.
                result.last_failed_block = block_hash;
                result.status = ScanResult::FAILURE;
                break;
            }
            for (size_t posInBlock = 0; posInBlock < block.vtx.size();
                 ++posInBlock) {
                CWalletTx::Confirmation confirm(CWalletTx::Status::CONFIRMED,
                                                block_height, block_hash,
                                                posInBlock);
                SyncTransaction(block.vtx[posInBlock],
                                {CWalletTx::Status::CONFIRMED, block_height,
                                 block_hash, int(posInBlock)},
                                fUpdate);
            }
            // scan succeeded, record block as most recent successfully
            // scanned
            result.last_scanned_block = block_hash;
            result.last_scanned_height = block_height;
        } else {
            // could not scan block, keep scanning but record this block as
            // the most recent failure
            result.last_failed_block = block_hash;
            result.status = ScanResult::FAILURE;
        }
        if (max_height && block_height >= *max_height) {
            break;
        }
        {
            if (!next_block) {
                // break successfully when rescan has reached the tip, or
                // previous block is no longer on the chain due to a reorg
                break;
            }

            // increment block and verification progress
            block_hash = next_block_hash;
            ++block_height;
            progress_current = chain().guessVerificationProgress(block_hash);

            // handle updated tip hash
            const BlockHash prev_tip_hash = tip_hash;
            tip_hash = WITH_LOCK(cs_wallet, return GetLastBlockHash());
            if (!max_height && prev_tip_hash != tip_hash) {
                // in case the tip has changed, update progress max
                progress_end = chain().guessVerificationProgress(tip_hash);
            }
        }
    }

    // Hide progress dialog in GUI.
    ShowProgress(
        strprintf("%s " + _("Rescanning...").translated, GetDisplayName()),
        100);
    if (block_height && fAbortRescan) {
        WalletLogPrintf("Rescan aborted at block %d. Progress=%f\n",
                        block_height, progress_current);
        result.status = ScanResult::USER_ABORT;
    } else if (block_height && chain().shutdownRequested()) {
        WalletLogPrintf(
            "Rescan interrupted by shutdown request at block %d. Progress=%f\n",
            block_height, progress_current);
        result.status = ScanResult::USER_ABORT;
    } else {
        WalletLogPrintf("Rescan completed in %15dms\n",
                        GetTimeMillis() - start_time);
    }
    return result;
}

void CWallet::ReacceptWalletTransactions() {
    AssertLockHeld(cs_wallet);

    // If transactions aren't being broadcasted, don't let them into local
    // mempool either.
    if (!fBroadcastTransactions) {
        return;
    }

    std::map<int64_t, CWalletTx *> mapSorted;

    // Sort pending wallet transactions based on their initial wallet insertion
    // order.
    for (std::pair<const TxId, CWalletTx> &item : mapWallet) {
        const TxId &wtxid = item.first;
        CWalletTx &wtx = item.second;
        assert(wtx.GetId() == wtxid);

        int nDepth = GetTxDepthInMainChain(wtx);

        if (!wtx.IsCoinBase() && (nDepth == 0 && !wtx.isAbandoned())) {
            mapSorted.insert(std::make_pair(wtx.nOrderPos, &wtx));
        }
    }

    // Try to add wallet transactions to memory pool.
    for (const std::pair<const int64_t, CWalletTx *> &item : mapSorted) {
        CWalletTx &wtx = *(item.second);
        std::string unused_err_string;
        SubmitTxMemoryPoolAndRelay(wtx, unused_err_string, false);
    }
}

bool CWallet::SubmitTxMemoryPoolAndRelay(const CWalletTx &wtx,
                                         std::string &err_string,
                                         bool relay) const {
    AssertLockHeld(cs_wallet);

    // Can't relay if wallet is not broadcasting
    if (!GetBroadcastTransactions()) {
        return false;
    }
    // Don't relay abandoned transactions
    if (wtx.isAbandoned()) {
        return false;
    }
    // Don't try to submit coinbase transactions. These would fail anyway but
    // would cause log spam.
    if (wtx.IsCoinBase()) {
        return false;
    }
    // Don't try to submit conflicted or confirmed transactions.
    if (GetTxDepthInMainChain(wtx) != 0) {
        return false;
    }

    // Submit transaction to mempool for relay
    WalletLogPrintf("Submitting wtx %s to mempool for relay\n",
                    wtx.GetId().ToString());
    // We must set fInMempool here - while it will be re-set to true by the
    // entered-mempool callback, if we did not there would be a race where a
    // user could call sendmoney in a loop and hit spurious out of funds errors
    // because we think that this newly generated transaction's change is
    // unavailable as we're not yet aware that it is in the mempool.
    //
    // Irrespective of the failure reason, un-marking fInMempool
    // out-of-order is incorrect - it should be unmarked when
    // TransactionRemovedFromMempool fires.
    bool ret = chain().broadcastTransaction(
        GetConfig(), wtx.tx, m_default_max_tx_fee, relay, err_string);
    wtx.fInMempool |= ret;
    return ret;
}

std::set<TxId> CWallet::GetTxConflicts(const CWalletTx &wtx) const {
    AssertLockHeld(cs_wallet);

    std::set<TxId> result;
    const TxId &txid = wtx.GetId();
    result = GetConflicts(txid);
    result.erase(txid);

    return result;
}

// Rebroadcast transactions from the wallet. We do this on a random timer
// to slightly obfuscate which transactions come from our wallet.
//
// Ideally, we'd only resend transactions that we think should have been
// mined in the most recent block. Any transaction that wasn't in the top
// blockweight of transactions in the mempool shouldn't have been mined,
// and so is probably just sitting in the mempool waiting to be confirmed.
// Rebroadcasting does nothing to speed up confirmation and only damages
// privacy.
void CWallet::ResendWalletTransactions() {
    // During reindex, importing and IBD, old wallet transactions become
    // unconfirmed. Don't resend them as that would spam other nodes.
    if (!chain().isReadyToBroadcast()) {
        return;
    }

    // Do this infrequently and randomly to avoid giving away that these are our
    // transactions.
    if (GetTime() < nNextResend || !fBroadcastTransactions) {
        return;
    }

    bool fFirst = (nNextResend == 0);
    // resend 12-36 hours from now, ~1 day on average.
    nNextResend = GetTime() + (12 * 60 * 60) + GetRand(24 * 60 * 60);
    if (fFirst) {
        return;
    }

    int submitted_tx_count = 0;

    { // cs_wallet scope
        LOCK(cs_wallet);

        // Relay transactions
        for (std::pair<const TxId, CWalletTx> &item : mapWallet) {
            CWalletTx &wtx = item.second;
            // Attempt to rebroadcast all txes more than 5 minutes older than
            // the last block. SubmitTxMemoryPoolAndRelay() will not rebroadcast
            // any confirmed or conflicting txs.
            if (wtx.nTimeReceived > m_best_block_time - 5 * 60) {
                continue;
            }
            std::string unused_err_string;
            if (SubmitTxMemoryPoolAndRelay(wtx, unused_err_string, true)) {
                ++submitted_tx_count;
            }
        }
    } // cs_wallet

    if (submitted_tx_count > 0) {
        WalletLogPrintf("%s: resubmit %u unconfirmed transactions\n", __func__,
                        submitted_tx_count);
    }
}

/** @} */ // end of mapWallet

void MaybeResendWalletTxs() {
    for (const std::shared_ptr<CWallet> &pwallet : GetWallets()) {
        pwallet->ResendWalletTransactions();
    }
}

/**
 * @defgroup Actions
 *
 * @{
 */

bool CWallet::SignTransaction(CMutableTransaction &tx) const {
    AssertLockHeld(cs_wallet);

    // Build coins map
    std::map<COutPoint, Coin> coins;
    for (auto &input : tx.vin) {
        auto mi = mapWallet.find(input.prevout.GetTxId());
        if (mi == mapWallet.end() ||
            input.prevout.GetN() >= mi->second.tx->vout.size()) {
            return false;
        }
        const CWalletTx &wtx = mi->second;
        coins[input.prevout] =
            Coin(wtx.tx->vout[input.prevout.GetN()], wtx.m_confirm.block_height,
                 wtx.IsCoinBase());
    }
    std::map<int, std::string> input_errors;
    return SignTransaction(tx, coins, SigHashType().withForkId(), input_errors);
}

bool CWallet::SignTransaction(CMutableTransaction &tx,
                              const std::map<COutPoint, Coin> &coins,
                              SigHashType sighash,
                              std::map<int, std::string> &input_errors) const {
    // Try to sign with all ScriptPubKeyMans
    for (ScriptPubKeyMan *spk_man : GetAllScriptPubKeyMans()) {
        // spk_man->SignTransaction will return true if the transaction is
        // complete, so we can exit early and return true if that happens
        if (spk_man->SignTransaction(tx, coins, sighash, input_errors)) {
            return true;
        }
    }

    // At this point, one input was not fully signed otherwise we would have
    // exited already

    // When there are no available providers for the remaining inputs, use the
    // legacy provider so we can get proper error messages.
    auto legacy_spk_man = GetLegacyScriptPubKeyMan();
    if (legacy_spk_man &&
        legacy_spk_man->SignTransaction(tx, coins, sighash, input_errors)) {
        return true;
    }

    return false;
}

TransactionError CWallet::FillPSBT(PartiallySignedTransaction &psbtx,
                                   bool &complete, SigHashType sighash_type,
                                   bool sign, bool bip32derivs) const {
    LOCK(cs_wallet);
    // Get all of the previous transactions
    for (size_t i = 0; i < psbtx.tx->vin.size(); ++i) {
        const CTxIn &txin = psbtx.tx->vin[i];
        PSBTInput &input = psbtx.inputs.at(i);

        if (PSBTInputSigned(input)) {
            continue;
        }

        // If we have no utxo, grab it from the wallet.
        if (input.utxo.IsNull()) {
            const TxId &txid = txin.prevout.GetTxId();
            const auto it = mapWallet.find(txid);
            if (it != mapWallet.end()) {
                const CWalletTx &wtx = it->second;
                CTxOut utxo = wtx.tx->vout[txin.prevout.GetN()];
                // Update UTXOs from the wallet.
                input.utxo = utxo;
            }
        }
    }

    // Fill in information from ScriptPubKeyMans
    for (ScriptPubKeyMan *spk_man : GetAllScriptPubKeyMans()) {
        TransactionError res =
            spk_man->FillPSBT(psbtx, sighash_type, sign, bip32derivs);
        if (res != TransactionError::OK) {
            return res;
        }
    }

    // Complete if every input is now signed
    complete = true;
    for (const auto &input : psbtx.inputs) {
        complete &= PSBTInputSigned(input);
    }

    return TransactionError::OK;
}

SigningResult CWallet::SignMessage(const std::string &message,
                                   const PKHash &pkhash,
                                   std::string &str_sig) const {
    SignatureData sigdata;
    CScript script_pub_key = GetScriptForDestination(pkhash);
    for (const auto &spk_man_pair : m_spk_managers) {
        if (spk_man_pair.second->CanProvide(script_pub_key, sigdata)) {
            return spk_man_pair.second->SignMessage(message, pkhash, str_sig);
        }
    }
    return SigningResult::PRIVATE_KEY_NOT_AVAILABLE;
}

OutputType
CWallet::TransactionChangeType(const std::optional<OutputType> &change_type,
                               const std::vector<CRecipient> &vecSend) const {
    // If -changetype is specified, always use that change type.
    if (change_type) {
        return *change_type;
    }

    // if m_default_address_type is legacy, use legacy address as change.
    if (m_default_address_type == OutputType::LEGACY) {
        return OutputType::LEGACY;
    }

    // else use m_default_address_type for change
    return m_default_address_type;
}

void CWallet::CommitTransaction(
    CTransactionRef tx, mapValue_t mapValue,
    std::vector<std::pair<std::string, std::string>> orderForm,
    bool broadcast) {
    LOCK(cs_wallet);

    WalletLogPrintfToBeContinued("CommitTransaction:\n%s", tx->ToString());

    // Add tx to wallet, because if it has change it's also ours, otherwise just
    // for transaction history.
    AddToWallet(tx, {}, [&](CWalletTx &wtx, bool new_tx) {
        CHECK_NONFATAL(wtx.mapValue.empty());
        CHECK_NONFATAL(wtx.vOrderForm.empty());
        wtx.mapValue = std::move(mapValue);
        wtx.vOrderForm = std::move(orderForm);
        wtx.fTimeReceivedIsTxTime = true;
        wtx.fFromMe = true;
        return true;
    });

    // Notify that old coins are spent.
    for (const CTxIn &txin : tx->vin) {
        CWalletTx &coin = mapWallet.at(txin.prevout.GetTxId());
        coin.MarkDirty();
        NotifyTransactionChanged(this, coin.GetId(), CT_UPDATED);
    }

    // Get the inserted-CWalletTx from mapWallet so that the
    // fInMempool flag is cached properly
    CWalletTx &wtx = mapWallet.at(tx->GetId());

    if (!broadcast || !fBroadcastTransactions) {
        // Don't submit tx to the mempool if the flag is unset for this single
        // transaction, or if the wallet doesn't broadcast transactions at all.
        return;
    }

    std::string err_string;
    if (!SubmitTxMemoryPoolAndRelay(wtx, err_string, true)) {
        WalletLogPrintf("CommitTransaction(): Transaction cannot be broadcast "
                        "immediately, %s\n",
                        err_string);
        // TODO: if we expect the failure to be long term or permanent, instead
        // delete wtx from the wallet and return failure.
    }
}

DBErrors CWallet::LoadWallet(bool &fFirstRunRet) {
    LOCK(cs_wallet);

    fFirstRunRet = false;
    DBErrors nLoadWalletRet = WalletBatch(*database).LoadWallet(this);
    if (nLoadWalletRet == DBErrors::NEED_REWRITE) {
        if (database->Rewrite("\x04pool")) {
            for (const auto &spk_man_pair : m_spk_managers) {
                spk_man_pair.second->RewriteDB();
            }
        }
    }

    // This wallet is in its first run if there are no ScriptPubKeyMans and it
    // isn't blank or no privkeys
    fFirstRunRet = m_spk_managers.empty() &&
                   !IsWalletFlagSet(WALLET_FLAG_DISABLE_PRIVATE_KEYS) &&
                   !IsWalletFlagSet(WALLET_FLAG_BLANK_WALLET);
    if (fFirstRunRet) {
        assert(m_external_spk_managers.empty());
        assert(m_internal_spk_managers.empty());
    }

    if (nLoadWalletRet != DBErrors::LOAD_OK) {
        return nLoadWalletRet;
    }

    return DBErrors::LOAD_OK;
}

DBErrors CWallet::ZapSelectTx(std::vector<TxId> &txIdsIn,
                              std::vector<TxId> &txIdsOut) {
    AssertLockHeld(cs_wallet);
    DBErrors nZapSelectTxRet =
        WalletBatch(*database).ZapSelectTx(txIdsIn, txIdsOut);
    for (const TxId &txid : txIdsOut) {
        const auto &it = mapWallet.find(txid);
        wtxOrdered.erase(it->second.m_it_wtxOrdered);
        for (const auto &txin : it->second.tx->vin) {
            mapTxSpends.erase(txin.prevout);
        }
        mapWallet.erase(it);
        NotifyTransactionChanged(this, txid, CT_DELETED);
    }

    if (nZapSelectTxRet == DBErrors::NEED_REWRITE) {
        if (database->Rewrite("\x04pool")) {
            for (const auto &spk_man_pair : m_spk_managers) {
                spk_man_pair.second->RewriteDB();
            }
        }
    }

    if (nZapSelectTxRet != DBErrors::LOAD_OK) {
        return nZapSelectTxRet;
    }

    MarkDirty();

    return DBErrors::LOAD_OK;
}

bool CWallet::SetAddressBookWithDB(WalletBatch &batch,
                                   const CTxDestination &address,
                                   const std::string &strName,
                                   const std::string &strPurpose) {
    bool fUpdated = false;
    bool is_mine;
    {
        LOCK(cs_wallet);
        std::map<CTxDestination, CAddressBookData>::iterator mi =
            m_address_book.find(address);
        fUpdated = (mi != m_address_book.end() && !mi->second.IsChange());
        m_address_book[address].SetLabel(strName);
        // Update purpose only if requested.
        if (!strPurpose.empty()) {
            m_address_book[address].purpose = strPurpose;
        }
        is_mine = IsMine(address) != ISMINE_NO;
    }

    NotifyAddressBookChanged(this, address, strName, is_mine, strPurpose,
                             (fUpdated ? CT_UPDATED : CT_NEW));
    if (!strPurpose.empty() && !batch.WritePurpose(address, strPurpose)) {
        return false;
    }
    return batch.WriteName(address, strName);
}

bool CWallet::SetAddressBook(const CTxDestination &address,
                             const std::string &strName,
                             const std::string &strPurpose) {
    WalletBatch batch(*database);
    return SetAddressBookWithDB(batch, address, strName, strPurpose);
}

bool CWallet::DelAddressBook(const CTxDestination &address) {
    bool is_mine;
    WalletBatch batch(*database);
    {
        LOCK(cs_wallet);
        // If we want to delete receiving addresses, we need to take care that
        // DestData "used" (and possibly newer DestData) gets preserved (and the
        // "deleted" address transformed into a change entry instead of actually
        // being deleted)
        // NOTE: This isn't a problem for sending addresses because they never
        // have any DestData yet! When adding new DestData, it should be
        // considered here whether to retain or delete it (or move it?).
        if (IsMine(address)) {
            WalletLogPrintf(
                "%s called with IsMine address, NOT SUPPORTED. Please "
                "report this bug! %s\n",
                __func__, PACKAGE_BUGREPORT);
            return false;
        }
        // Delete destdata tuples associated with address
        for (const std::pair<const std::string, std::string> &item :
             m_address_book[address].destdata) {
            batch.EraseDestData(address, item.first);
        }
        m_address_book.erase(address);
        is_mine = IsMine(address) != ISMINE_NO;
    }

    NotifyAddressBookChanged(this, address, "", is_mine, "", CT_DELETED);

    batch.ErasePurpose(address);
    return batch.EraseName(address);
}

size_t CWallet::KeypoolCountExternalKeys() const {
    AssertLockHeld(cs_wallet);

    unsigned int count = 0;
    for (auto spk_man : GetActiveScriptPubKeyMans()) {
        count += spk_man->KeypoolCountExternalKeys();
    }

    return count;
}

unsigned int CWallet::GetKeyPoolSize() const {
    AssertLockHeld(cs_wallet);

    unsigned int count = 0;
    for (auto spk_man : GetActiveScriptPubKeyMans()) {
        count += spk_man->GetKeyPoolSize();
    }
    return count;
}

bool CWallet::TopUpKeyPool(unsigned int kpSize) {
    LOCK(cs_wallet);
    bool res = true;
    for (auto spk_man : GetActiveScriptPubKeyMans()) {
        res &= spk_man->TopUp(kpSize);
    }
    return res;
}

bool CWallet::GetNewDestination(const OutputType type, const std::string label,
                                CTxDestination &dest, std::string &error) {
    LOCK(cs_wallet);
    error.clear();
    bool result = false;
    auto spk_man = GetScriptPubKeyMan(type, false /* internal */);
    if (spk_man) {
        spk_man->TopUp();
        result = spk_man->GetNewDestination(type, dest, error);
    } else {
        error = strprintf("Error: No %s addresses available.",
                          FormatOutputType(type));
    }
    if (result) {
        SetAddressBook(dest, label, "receive");
    }

    return result;
}

bool CWallet::GetNewChangeDestination(const OutputType type,
                                      CTxDestination &dest,
                                      std::string &error) {
    LOCK(cs_wallet);
    error.clear();

    ReserveDestination reservedest(this, type);
    if (!reservedest.GetReservedDestination(dest, true)) {
        error = _("Error: Keypool ran out, please call keypoolrefill first")
                    .translated;
        return false;
    }

    reservedest.KeepDestination();
    return true;
}

int64_t CWallet::GetOldestKeyPoolTime() const {
    LOCK(cs_wallet);
    int64_t oldestKey = std::numeric_limits<int64_t>::max();
    for (const auto &spk_man_pair : m_spk_managers) {
        oldestKey =
            std::min(oldestKey, spk_man_pair.second->GetOldestKeyPoolTime());
    }
    return oldestKey;
}

void CWallet::MarkDestinationsDirty(
    const std::set<CTxDestination> &destinations) {
    for (auto &entry : mapWallet) {
        CWalletTx &wtx = entry.second;
        if (wtx.m_is_cache_empty) {
            continue;
        }

        for (size_t i = 0; i < wtx.tx->vout.size(); i++) {
            CTxDestination dst;

            if (ExtractDestination(wtx.tx->vout[i].scriptPubKey, dst) &&
                destinations.count(dst)) {
                wtx.MarkDirty();
                break;
            }
        }
    }
}

std::set<CTxDestination>
CWallet::GetLabelAddresses(const std::string &label) const {
    AssertLockHeld(cs_wallet);
    std::set<CTxDestination> result;
    for (const std::pair<const CTxDestination, CAddressBookData> &item :
         m_address_book) {
        if (item.second.IsChange()) {
            continue;
        }
        const CTxDestination &address = item.first;
        const std::string &strName = item.second.GetLabel();
        if (strName == label) {
            result.insert(address);
        }
    }

    return result;
}

bool ReserveDestination::GetReservedDestination(CTxDestination &dest,
                                                bool internal) {
    m_spk_man = pwallet->GetScriptPubKeyMan(type, internal);
    if (!m_spk_man) {
        return false;
    }

    if (nIndex == -1) {
        m_spk_man->TopUp();

        CKeyPool keypool;
        if (!m_spk_man->GetReservedDestination(type, internal, address, nIndex,
                                               keypool)) {
            return false;
        }
        fInternal = keypool.fInternal;
    }
    dest = address;
    return true;
}

void ReserveDestination::KeepDestination() {
    if (nIndex != -1) {
        m_spk_man->KeepDestination(nIndex, type);
    }

    nIndex = -1;
    address = CNoDestination();
}

void ReserveDestination::ReturnDestination() {
    if (nIndex != -1) {
        m_spk_man->ReturnDestination(nIndex, fInternal, address);
    }
    nIndex = -1;
    address = CNoDestination();
}

void CWallet::LockCoin(const COutPoint &output) {
    AssertLockHeld(cs_wallet);
    setLockedCoins.insert(output);
}

void CWallet::UnlockCoin(const COutPoint &output) {
    AssertLockHeld(cs_wallet);
    setLockedCoins.erase(output);
}

void CWallet::UnlockAllCoins() {
    AssertLockHeld(cs_wallet);
    setLockedCoins.clear();
}

bool CWallet::IsLockedCoin(const COutPoint &outpoint) const {
    AssertLockHeld(cs_wallet);

    return setLockedCoins.count(outpoint) > 0;
}

void CWallet::ListLockedCoins(std::vector<COutPoint> &vOutpts) const {
    AssertLockHeld(cs_wallet);
    for (COutPoint outpoint : setLockedCoins) {
        vOutpts.push_back(outpoint);
    }
}

/** @} */ // end of Actions

void CWallet::GetKeyBirthTimes(std::map<CKeyID, int64_t> &mapKeyBirth) const {
    AssertLockHeld(cs_wallet);
    mapKeyBirth.clear();

    // map in which we'll infer heights of other keys
    std::map<CKeyID, const CWalletTx::Confirmation *> mapKeyFirstBlock;
    CWalletTx::Confirmation max_confirm;
    // the tip can be reorganized; use a 144-block safety margin
    max_confirm.block_height =
        GetLastBlockHeight() > 144 ? GetLastBlockHeight() - 144 : 0;
    CHECK_NONFATAL(chain().findAncestorByHeight(
        GetLastBlockHash(), max_confirm.block_height,
        FoundBlock().hash(max_confirm.hashBlock)));

    {
        LegacyScriptPubKeyMan *spk_man = GetLegacyScriptPubKeyMan();
        assert(spk_man != nullptr);
        LOCK(spk_man->cs_KeyStore);

        // Get birth times for keys with metadata.
        for (const auto &entry : spk_man->mapKeyMetadata) {
            if (entry.second.nCreateTime) {
                mapKeyBirth[entry.first] = entry.second.nCreateTime;
            }
        }

        // Prepare to infer birth heights for keys without metadata.
        for (const CKeyID &keyid : spk_man->GetKeys()) {
            if (mapKeyBirth.count(keyid) == 0) {
                mapKeyFirstBlock[keyid] = &max_confirm;
            }
        }

        // If there are no such keys, we're done.
        if (mapKeyFirstBlock.empty()) {
            return;
        }

        // Find first block that affects those keys, if there are any left.
        for (const auto &entry : mapWallet) {
            // iterate over all wallet transactions...
            const CWalletTx &wtx = entry.second;
            if (wtx.m_confirm.status == CWalletTx::CONFIRMED) {
                // ... which are already in a block
                for (const CTxOut &txout : wtx.tx->vout) {
                    // Iterate over all their outputs...
                    for (const auto &keyid :
                         GetAffectedKeys(txout.scriptPubKey, *spk_man)) {
                        // ... and all their affected keys.
                        auto rit = mapKeyFirstBlock.find(keyid);
                        if (rit != mapKeyFirstBlock.end() &&
                            wtx.m_confirm.block_height <
                                rit->second->block_height) {
                            rit->second = &wtx.m_confirm;
                        }
                    }
                }
            }
        }
    }

    // Extract block timestamps for those keys.
    for (const auto &entry : mapKeyFirstBlock) {
        int64_t block_time;
        CHECK_NONFATAL(chain().findBlock(entry.second->hashBlock,
                                         FoundBlock().time(block_time)));
        // block times can be 2h off
        mapKeyBirth[entry.first] = block_time - TIMESTAMP_WINDOW;
    }
}

/**
 * Compute smart timestamp for a transaction being added to the wallet.
 *
 * Logic:
 * - If sending a transaction, assign its timestamp to the current time.
 * - If receiving a transaction outside a block, assign its timestamp to the
 *   current time.
 * - If receiving a block with a future timestamp, assign all its (not already
 *   known) transactions' timestamps to the current time.
 * - If receiving a block with a past timestamp, before the most recent known
 *   transaction (that we care about), assign all its (not already known)
 *   transactions' timestamps to the same timestamp as that most-recent-known
 *   transaction.
 * - If receiving a block with a past timestamp, but after the most recent known
 *   transaction, assign all its (not already known) transactions' timestamps to
 *   the block time.
 *
 * For more information see CWalletTx::nTimeSmart,
 * https://bitcointalk.org/?topic=54527, or
 * https://github.com/bitcoin/bitcoin/pull/1393.
 */
unsigned int CWallet::ComputeTimeSmart(const CWalletTx &wtx) const {
    unsigned int nTimeSmart = wtx.nTimeReceived;
    if (!wtx.isUnconfirmed() && !wtx.isAbandoned()) {
        int64_t blocktime;
        if (chain().findBlock(wtx.m_confirm.hashBlock,
                              FoundBlock().time(blocktime))) {
            int64_t latestNow = wtx.nTimeReceived;
            int64_t latestEntry = 0;

            // Tolerate times up to the last timestamp in the wallet not more
            // than 5 minutes into the future
            int64_t latestTolerated = latestNow + 300;
            const TxItems &txOrdered = wtxOrdered;
            for (auto it = txOrdered.rbegin(); it != txOrdered.rend(); ++it) {
                CWalletTx *const pwtx = it->second;
                if (pwtx == &wtx) {
                    continue;
                }
                int64_t nSmartTime;
                nSmartTime = pwtx->nTimeSmart;
                if (!nSmartTime) {
                    nSmartTime = pwtx->nTimeReceived;
                }
                if (nSmartTime <= latestTolerated) {
                    latestEntry = nSmartTime;
                    if (nSmartTime > latestNow) {
                        latestNow = nSmartTime;
                    }
                    break;
                }
            }

            nTimeSmart = std::max(latestEntry, std::min(blocktime, latestNow));
        } else {
            WalletLogPrintf("%s: found %s in block %s not in index\n", __func__,
                            wtx.GetId().ToString(),
                            wtx.m_confirm.hashBlock.ToString());
        }
    }
    return nTimeSmart;
}

bool CWallet::AddDestData(WalletBatch &batch, const CTxDestination &dest,
                          const std::string &key, const std::string &value) {
    if (std::get_if<CNoDestination>(&dest)) {
        return false;
    }

    m_address_book[dest].destdata.insert(std::make_pair(key, value));
    return batch.WriteDestData(dest, key, value);
}

bool CWallet::EraseDestData(WalletBatch &batch, const CTxDestination &dest,
                            const std::string &key) {
    if (!m_address_book[dest].destdata.erase(key)) {
        return false;
    }

    return batch.EraseDestData(dest, key);
}

void CWallet::LoadDestData(const CTxDestination &dest, const std::string &key,
                           const std::string &value) {
    m_address_book[dest].destdata.insert(std::make_pair(key, value));
}

bool CWallet::GetDestData(const CTxDestination &dest, const std::string &key,
                          std::string *value) const {
    std::map<CTxDestination, CAddressBookData>::const_iterator i =
        m_address_book.find(dest);
    if (i != m_address_book.end()) {
        CAddressBookData::StringMap::const_iterator j =
            i->second.destdata.find(key);
        if (j != i->second.destdata.end()) {
            if (value) {
                *value = j->second;
            }

            return true;
        }
    }
    return false;
}

std::vector<std::string>
CWallet::GetDestValues(const std::string &prefix) const {
    std::vector<std::string> values;
    for (const auto &address : m_address_book) {
        for (const auto &data : address.second.destdata) {
            if (!data.first.compare(0, prefix.size(), prefix)) {
                values.emplace_back(data.second);
            }
        }
    }
    return values;
}

std::unique_ptr<WalletDatabase>
MakeWalletDatabase(const std::string &name, const DatabaseOptions &options,
                   DatabaseStatus &status, bilingual_str &error_string) {
    // Do some checking on wallet path. It should be either a:
    //
    // 1. Path where a directory can be created.
    // 2. Path to an existing directory.
    // 3. Path to a symlink to a directory.
    // 4. For backwards compatibility, the name of a data file in -walletdir.
    const fs::path wallet_path =
        fsbridge::AbsPathJoin(GetWalletDir(), fs::PathFromString(name));
    fs::file_type path_type = fs::symlink_status(wallet_path).type();
    if (!(path_type == fs::file_type::not_found ||
          path_type == fs::file_type::directory ||
          (path_type == fs::file_type::symlink &&
           fs::is_directory(wallet_path)) ||
          (path_type == fs::file_type::regular &&
           fs::PathFromString(name).filename() == fs::PathFromString(name)))) {
        error_string = Untranslated(
            strprintf("Invalid -wallet path '%s'. -wallet path should point to "
                      "a directory where wallet.dat and "
                      "database/log.?????????? files can be stored, a location "
                      "where such a directory could be created, "
                      "or (for backwards compatibility) the name of an "
                      "existing data file in -walletdir (%s)",
                      name, fs::quoted(fs::PathToString(GetWalletDir()))));
        status = DatabaseStatus::FAILED_BAD_PATH;
        return nullptr;
    }
    return MakeDatabase(wallet_path, options, status, error_string);
}

std::shared_ptr<CWallet>
CWallet::Create(interfaces::Chain &chain, const std::string &name,
                std::unique_ptr<WalletDatabase> database,
                uint64_t wallet_creation_flags, bilingual_str &error,
                std::vector<bilingual_str> &warnings) {
    const std::string &walletFile = database->Filename();

    chain.initMessage(_("Loading wallet...").translated);

    int64_t nStart = GetTimeMillis();
    bool fFirstRun = true;
    // TODO: Can't use std::make_shared because we need a custom deleter but
    // should be possible to use std::allocate_shared.
    std::shared_ptr<CWallet> walletInstance(
        new CWallet(&chain, name, std::move(database)), ReleaseWallet);
    DBErrors nLoadWalletRet = walletInstance->LoadWallet(fFirstRun);
    if (nLoadWalletRet != DBErrors::LOAD_OK) {
        if (nLoadWalletRet == DBErrors::CORRUPT) {
            error =
                strprintf(_("Error loading %s: Wallet corrupted"), walletFile);
            return nullptr;
        }

        if (nLoadWalletRet == DBErrors::NONCRITICAL_ERROR) {
            warnings.push_back(
                strprintf(_("Error reading %s! All keys read correctly, but "
                            "transaction data or address book entries might be "
                            "missing or incorrect."),
                          walletFile));
        } else if (nLoadWalletRet == DBErrors::TOO_NEW) {
            error = strprintf(
                _("Error loading %s: Wallet requires newer version of %s"),
                walletFile, PACKAGE_NAME);
            return nullptr;
        } else if (nLoadWalletRet == DBErrors::NEED_REWRITE) {
            error = strprintf(
                _("Wallet needed to be rewritten: restart %s to complete"),
                PACKAGE_NAME);
            return nullptr;
        } else {
            error = strprintf(_("Error loading %s"), walletFile);
            return nullptr;
        }
    }

    if (fFirstRun) {
        // Ensure this wallet.dat can only be opened by clients supporting
        // HD with chain split and expects no default key.
        walletInstance->SetMinVersion(FEATURE_LATEST);

        walletInstance->AddWalletFlags(wallet_creation_flags);

        // Only create LegacyScriptPubKeyMan when not descriptor wallet
        if (!walletInstance->IsWalletFlagSet(WALLET_FLAG_DESCRIPTORS)) {
            walletInstance->SetupLegacyScriptPubKeyMan();
        }

        if (!(wallet_creation_flags &
              (WALLET_FLAG_DISABLE_PRIVATE_KEYS | WALLET_FLAG_BLANK_WALLET))) {
            LOCK(walletInstance->cs_wallet);
            if (walletInstance->IsWalletFlagSet(WALLET_FLAG_DESCRIPTORS)) {
                walletInstance->SetupDescriptorScriptPubKeyMans();
                // SetupDescriptorScriptPubKeyMans already calls SetupGeneration
                // for us so we don't need to call SetupGeneration separately
            } else {
                // Legacy wallets need SetupGeneration here.
                for (auto spk_man :
                     walletInstance->GetActiveScriptPubKeyMans()) {
                    if (!spk_man->SetupGeneration()) {
                        error = _("Unable to generate initial keys");
                        return nullptr;
                    }
                }
            }
        }

        walletInstance->chainStateFlushed(chain.getTipLocator());
    } else if (wallet_creation_flags & WALLET_FLAG_DISABLE_PRIVATE_KEYS) {
        // Make it impossible to disable private keys after creation
        error = strprintf(_("Error loading %s: Private keys can only be "
                            "disabled during creation"),
                          walletFile);
        return nullptr;
    } else if (walletInstance->IsWalletFlagSet(
                   WALLET_FLAG_DISABLE_PRIVATE_KEYS)) {
        for (auto spk_man : walletInstance->GetActiveScriptPubKeyMans()) {
            if (spk_man->HavePrivateKeys()) {
                warnings.push_back(
                    strprintf(_("Warning: Private keys detected in wallet {%s} "
                                "with disabled private keys"),
                              walletFile));
            }
        }
    }

    if (gArgs.IsArgSet("-mintxfee")) {
        Amount n = Amount::zero();
        if (!ParseMoney(gArgs.GetArg("-mintxfee", ""), n) ||
            n == Amount::zero()) {
            error = AmountErrMsg("mintxfee", gArgs.GetArg("-mintxfee", ""));
            return nullptr;
        }
        if (n > HIGH_TX_FEE_PER_KB) {
            warnings.push_back(AmountHighWarn("-mintxfee") + Untranslated(" ") +
                               _("This is the minimum transaction fee you pay "
                                 "on every transaction."));
        }
        walletInstance->m_min_fee = CFeeRate(n);
    }

    if (gArgs.IsArgSet("-maxapsfee")) {
        const std::string max_aps_fee{gArgs.GetArg("-maxapsfee", "")};
        Amount n = Amount::zero();
        if (max_aps_fee == "-1") {
            n = -1 * SATOSHI;
        } else if (!ParseMoney(max_aps_fee, n)) {
            error = AmountErrMsg("maxapsfee", max_aps_fee);
            return nullptr;
        }
        if (n > HIGH_APS_FEE) {
            warnings.push_back(
                AmountHighWarn("-maxapsfee") + Untranslated(" ") +
                _("This is the maximum transaction fee you pay (in addition to"
                  " the normal fee) to prioritize partial spend avoidance over"
                  " regular coin selection."));
        }
        walletInstance->m_max_aps_fee = n;
    }

    if (gArgs.IsArgSet("-fallbackfee")) {
        Amount nFeePerK = Amount::zero();
        if (!ParseMoney(gArgs.GetArg("-fallbackfee", ""), nFeePerK)) {
            error =
                strprintf(_("Invalid amount for -fallbackfee=<amount>: '%s'"),
                          gArgs.GetArg("-fallbackfee", ""));
            return nullptr;
        }
        if (nFeePerK > HIGH_TX_FEE_PER_KB) {
            warnings.push_back(AmountHighWarn("-fallbackfee") +
                               Untranslated(" ") +
                               _("This is the transaction fee you may pay when "
                                 "fee estimates are not available."));
        }
        walletInstance->m_fallback_fee = CFeeRate(nFeePerK);
    }
    // Disable fallback fee in case value was set to 0, enable if non-null value
    walletInstance->m_allow_fallback_fee =
        walletInstance->m_fallback_fee.GetFeePerK() != Amount::zero();

    if (gArgs.IsArgSet("-paytxfee")) {
        Amount nFeePerK = Amount::zero();
        if (!ParseMoney(gArgs.GetArg("-paytxfee", ""), nFeePerK)) {
            error = AmountErrMsg("paytxfee", gArgs.GetArg("-paytxfee", ""));
            return nullptr;
        }
        if (nFeePerK > HIGH_TX_FEE_PER_KB) {
            warnings.push_back(AmountHighWarn("-paytxfee") + Untranslated(" ") +
                               _("This is the transaction fee you will pay if "
                                 "you send a transaction."));
        }
        walletInstance->m_pay_tx_fee = CFeeRate(nFeePerK, 1000);
        if (walletInstance->m_pay_tx_fee < chain.relayMinFee()) {
            error = strprintf(_("Invalid amount for -paytxfee=<amount>: '%s' "
                                "(must be at least %s)"),
                              gArgs.GetArg("-paytxfee", ""),
                              chain.relayMinFee().ToString());
            return nullptr;
        }
    }

    if (gArgs.IsArgSet("-maxtxfee")) {
        Amount nMaxFee = Amount::zero();
        if (!ParseMoney(gArgs.GetArg("-maxtxfee", ""), nMaxFee)) {
            error = AmountErrMsg("maxtxfee", gArgs.GetArg("-maxtxfee", ""));
            return nullptr;
        }
        if (nMaxFee > HIGH_MAX_TX_FEE) {
            warnings.push_back(_("-maxtxfee is set very high! Fees this large "
                                 "could be paid on a single transaction."));
        }
        if (CFeeRate(nMaxFee, 1000) < chain.relayMinFee()) {
            error = strprintf(
                _("Invalid amount for -maxtxfee=<amount>: '%s' (must be at "
                  "least the minrelay fee of %s to prevent stuck "
                  "transactions)"),
                gArgs.GetArg("-maxtxfee", ""), chain.relayMinFee().ToString());
            return nullptr;
        }
        walletInstance->m_default_max_tx_fee = nMaxFee;
    }

    if (chain.relayMinFee().GetFeePerK() > HIGH_TX_FEE_PER_KB) {
        warnings.push_back(
            AmountHighWarn("-minrelaytxfee") + Untranslated(" ") +
            _("The wallet will avoid paying less than the minimum relay fee."));
    }

    walletInstance->m_spend_zero_conf_change =
        gArgs.GetBoolArg("-spendzeroconfchange", DEFAULT_SPEND_ZEROCONF_CHANGE);

    walletInstance->m_default_address_type = DEFAULT_ADDRESS_TYPE;

    walletInstance->WalletLogPrintf("Wallet completed loading in %15dms\n",
                                    GetTimeMillis() - nStart);

    // Try to top up keypool. No-op if the wallet is locked.
    walletInstance->TopUpKeyPool();

    LOCK(walletInstance->cs_wallet);

    // Register wallet with validationinterface. It's done before rescan to
    // avoid missing block connections between end of rescan and validation
    // subscribing. Because of wallet lock being hold, block connection
    // notifications are going to be pending on the validation-side until lock
    // release. It's likely to have block processing duplicata (if rescan block
    // range overlaps with notification one) but we guarantee at least than
    // wallet state is correct after notifications delivery. This is temporary
    // until rescan and notifications delivery are unified under same interface.
    walletInstance->m_chain_notifications_handler =
        walletInstance->chain().handleNotifications(walletInstance);

    int rescan_height = 0;
    if (!gArgs.GetBoolArg("-rescan", false)) {
        WalletBatch batch(*walletInstance->database);
        CBlockLocator locator;
        if (batch.ReadBestBlock(locator)) {
            if (const std::optional<int> fork_height =
                    chain.findLocatorFork(locator)) {
                rescan_height = *fork_height;
            }
        }
    }

    const std::optional<int> tip_height = chain.getHeight();
    if (tip_height) {
        walletInstance->m_last_block_processed =
            chain.getBlockHash(*tip_height);
        walletInstance->m_last_block_processed_height = *tip_height;
    } else {
        walletInstance->m_last_block_processed.SetNull();
        walletInstance->m_last_block_processed_height = -1;
    }

    if (tip_height && *tip_height != rescan_height) {
        // We can't rescan beyond non-pruned blocks, stop and throw an error.
        // This might happen if a user uses an old wallet within a pruned node
        // or if they ran -disablewallet for a longer time, then decided to
        // re-enable
        if (chain.havePruned()) {
            // Exit early and print an error.
            // If a block is pruned after this check, we will load the wallet,
            // but fail the rescan with a generic error.
            int block_height = *tip_height;
            while (block_height > 0 &&
                   chain.haveBlockOnDisk(block_height - 1) &&
                   rescan_height != block_height) {
                --block_height;
            }

            if (rescan_height != block_height) {
                error = _("Prune: last wallet synchronisation goes beyond "
                          "pruned data. You need to -reindex (download the "
                          "whole blockchain again in case of pruned node)");
                return nullptr;
            }
        }

        chain.initMessage(_("Rescanning...").translated);
        walletInstance->WalletLogPrintf(
            "Rescanning last %i blocks (from block %i)...\n",
            *tip_height - rescan_height, rescan_height);

        // No need to read and scan block if block was created before our wallet
        // birthday (as adjusted for block time variability)
        std::optional<int64_t> time_first_key;
        for (auto spk_man : walletInstance->GetAllScriptPubKeyMans()) {
            int64_t time = spk_man->GetTimeFirstKey();
            if (!time_first_key || time < *time_first_key) {
                time_first_key = time;
            }
        }
        if (time_first_key) {
            chain.findFirstBlockWithTimeAndHeight(
                *time_first_key - TIMESTAMP_WINDOW, rescan_height,
                FoundBlock().height(rescan_height));
        }

        {
            WalletRescanReserver reserver(*walletInstance);
            if (!reserver.reserve() ||
                (ScanResult::SUCCESS !=
                 walletInstance
                     ->ScanForWalletTransactions(
                         chain.getBlockHash(rescan_height), rescan_height,
                         {} /* max height */, reserver, true /* update */)
                     .status)) {
                error = _("Failed to rescan the wallet during initialization");
                return nullptr;
            }
        }
        walletInstance->chainStateFlushed(chain.getTipLocator());
        walletInstance->database->IncrementUpdateCounter();
    }

    {
        LOCK(cs_wallets);
        for (auto &load_wallet : g_load_wallet_fns) {
            load_wallet(interfaces::MakeWallet(walletInstance));
        }
    }

    walletInstance->SetBroadcastTransactions(
        gArgs.GetBoolArg("-walletbroadcast", DEFAULT_WALLETBROADCAST));

    walletInstance->WalletLogPrintf("setKeyPool.size() = %u\n",
                                    walletInstance->GetKeyPoolSize());
    walletInstance->WalletLogPrintf("mapWallet.size() = %u\n",
                                    walletInstance->mapWallet.size());
    walletInstance->WalletLogPrintf("m_address_book.size() = %u\n",
                                    walletInstance->m_address_book.size());

    return walletInstance;
}

const CAddressBookData *
CWallet::FindAddressBookEntry(const CTxDestination &dest,
                              bool allow_change) const {
    const auto &address_book_it = m_address_book.find(dest);
    if (address_book_it == m_address_book.end()) {
        return nullptr;
    }
    if ((!allow_change) && address_book_it->second.IsChange()) {
        return nullptr;
    }
    return &address_book_it->second;
}

bool CWallet::UpgradeWallet(int version, bilingual_str &error) {
    int prev_version = GetVersion();
    int nMaxVersion = version;
    // The -upgradewallet without argument case
    if (nMaxVersion == 0) {
        WalletLogPrintf("Performing wallet upgrade to %i\n", FEATURE_LATEST);
        nMaxVersion = FEATURE_LATEST;
        // permanently upgrade the wallet immediately
        SetMinVersion(FEATURE_LATEST);
    } else {
        WalletLogPrintf("Allowing wallet upgrade up to %i\n", nMaxVersion);
    }

    if (nMaxVersion < GetVersion()) {
        error = _("Cannot downgrade wallet");
        return false;
    }

    SetMaxVersion(nMaxVersion);

    LOCK(cs_wallet);

    // Do not upgrade versions to any version between HD_SPLIT and
    // FEATURE_PRE_SPLIT_KEYPOOL unless already supporting HD_SPLIT
    int max_version = GetVersion();
    if (!CanSupportFeature(FEATURE_HD_SPLIT) &&
        max_version >= FEATURE_HD_SPLIT &&
        max_version < FEATURE_PRE_SPLIT_KEYPOOL) {
        error = _("Cannot upgrade a non HD split wallet without upgrading to "
                  "support pre split keypool. Please use version 200300 or no "
                  "version specified.");
        return false;
    }

    for (auto spk_man : GetActiveScriptPubKeyMans()) {
        if (!spk_man->Upgrade(prev_version, error)) {
            return false;
        }
    }

    return true;
}

void CWallet::postInitProcess() {
    LOCK(cs_wallet);

    // Add wallet transactions that aren't already in a block to mempool.
    // Do this here as mempool requires genesis block to be loaded.
    ReacceptWalletTransactions();

    // Update wallet transactions with current mempool transactions.
    chain().requestMempoolTransactions(*this);
}

bool CWallet::BackupWallet(const std::string &strDest) const {
    return database->Backup(strDest);
}

CKeyPool::CKeyPool() {
    nTime = GetTime();
    fInternal = false;
    m_pre_split = false;
}

CKeyPool::CKeyPool(const CPubKey &vchPubKeyIn, bool internalIn) {
    nTime = GetTime();
    vchPubKey = vchPubKeyIn;
    fInternal = internalIn;
    m_pre_split = false;
}

int CWallet::GetTxDepthInMainChain(const CWalletTx &wtx) const {
    AssertLockHeld(cs_wallet);
    if (wtx.isUnconfirmed() || wtx.isAbandoned()) {
        return 0;
    }

    return (GetLastBlockHeight() - wtx.m_confirm.block_height + 1) *
           (wtx.isConflicted() ? -1 : 1);
}

int CWallet::GetTxBlocksToMaturity(const CWalletTx &wtx) const {
    AssertLockHeld(cs_wallet);

    if (!wtx.IsCoinBase()) {
        return 0;
    }
    int chain_depth = GetTxDepthInMainChain(wtx);
    // coinbase tx should not be conflicted
    assert(chain_depth >= 0);
    return std::max(0, (COINBASE_MATURITY + 1) - chain_depth);
}

bool CWallet::IsTxImmatureCoinBase(const CWalletTx &wtx) const {
    AssertLockHeld(cs_wallet);

    // note GetBlocksToMaturity is 0 for non-coinbase tx
    return GetTxBlocksToMaturity(wtx) > 0;
}

bool CWallet::IsCrypted() const {
    return HasEncryptionKeys();
}

bool CWallet::IsLocked() const {
    if (!IsCrypted()) {
        return false;
    }
    LOCK(cs_wallet);
    return vMasterKey.empty();
}

bool CWallet::Lock() {
    if (!IsCrypted()) {
        return false;
    }

    {
        LOCK(cs_wallet);
        if (!vMasterKey.empty()) {
            memory_cleanse(vMasterKey.data(),
                           vMasterKey.size() *
                               sizeof(decltype(vMasterKey)::value_type));
            vMasterKey.clear();
        }
    }

    NotifyStatusChanged(this);
    return true;
}

bool CWallet::Unlock(const CKeyingMaterial &vMasterKeyIn, bool accept_no_keys) {
    {
        LOCK(cs_wallet);
        for (const auto &spk_man_pair : m_spk_managers) {
            if (!spk_man_pair.second->CheckDecryptionKey(vMasterKeyIn,
                                                         accept_no_keys)) {
                return false;
            }
        }
        vMasterKey = vMasterKeyIn;
    }
    NotifyStatusChanged(this);
    return true;
}

std::set<ScriptPubKeyMan *> CWallet::GetActiveScriptPubKeyMans() const {
    std::set<ScriptPubKeyMan *> spk_mans;
    for (bool internal : {false, true}) {
        for (OutputType t : OUTPUT_TYPES) {
            auto spk_man = GetScriptPubKeyMan(t, internal);
            if (spk_man) {
                spk_mans.insert(spk_man);
            }
        }
    }
    return spk_mans;
}

std::set<ScriptPubKeyMan *> CWallet::GetAllScriptPubKeyMans() const {
    std::set<ScriptPubKeyMan *> spk_mans;
    for (const auto &spk_man_pair : m_spk_managers) {
        spk_mans.insert(spk_man_pair.second.get());
    }
    return spk_mans;
}

ScriptPubKeyMan *CWallet::GetScriptPubKeyMan(const OutputType &type,
                                             bool internal) const {
    const std::map<OutputType, ScriptPubKeyMan *> &spk_managers =
        internal ? m_internal_spk_managers : m_external_spk_managers;
    std::map<OutputType, ScriptPubKeyMan *>::const_iterator it =
        spk_managers.find(type);
    if (it == spk_managers.end()) {
        WalletLogPrintf(
            "%s scriptPubKey Manager for output type %d does not exist\n",
            internal ? "Internal" : "External", static_cast<int>(type));
        return nullptr;
    }
    return it->second;
}

std::set<ScriptPubKeyMan *>
CWallet::GetScriptPubKeyMans(const CScript &script,
                             SignatureData &sigdata) const {
    std::set<ScriptPubKeyMan *> spk_mans;
    for (const auto &spk_man_pair : m_spk_managers) {
        if (spk_man_pair.second->CanProvide(script, sigdata)) {
            spk_mans.insert(spk_man_pair.second.get());
        }
    }
    return spk_mans;
}

ScriptPubKeyMan *CWallet::GetScriptPubKeyMan(const CScript &script) const {
    SignatureData sigdata;
    for (const auto &spk_man_pair : m_spk_managers) {
        if (spk_man_pair.second->CanProvide(script, sigdata)) {
            return spk_man_pair.second.get();
        }
    }
    return nullptr;
}

ScriptPubKeyMan *CWallet::GetScriptPubKeyMan(const uint256 &id) const {
    if (m_spk_managers.count(id) > 0) {
        return m_spk_managers.at(id).get();
    }
    return nullptr;
}

std::unique_ptr<SigningProvider>
CWallet::GetSolvingProvider(const CScript &script) const {
    SignatureData sigdata;
    return GetSolvingProvider(script, sigdata);
}

std::unique_ptr<SigningProvider>
CWallet::GetSolvingProvider(const CScript &script,
                            SignatureData &sigdata) const {
    for (const auto &spk_man_pair : m_spk_managers) {
        if (spk_man_pair.second->CanProvide(script, sigdata)) {
            return spk_man_pair.second->GetSolvingProvider(script);
        }
    }
    return nullptr;
}

LegacyScriptPubKeyMan *CWallet::GetLegacyScriptPubKeyMan() const {
    if (IsWalletFlagSet(WALLET_FLAG_DESCRIPTORS)) {
        return nullptr;
    }
    // Legacy wallets only have one ScriptPubKeyMan which is a
    // LegacyScriptPubKeyMan. Everything in m_internal_spk_managers and
    // m_external_spk_managers point to the same legacyScriptPubKeyMan.
    auto it = m_internal_spk_managers.find(OutputType::LEGACY);
    if (it == m_internal_spk_managers.end()) {
        return nullptr;
    }
    return dynamic_cast<LegacyScriptPubKeyMan *>(it->second);
}

LegacyScriptPubKeyMan *CWallet::GetOrCreateLegacyScriptPubKeyMan() {
    SetupLegacyScriptPubKeyMan();
    return GetLegacyScriptPubKeyMan();
}

void CWallet::SetupLegacyScriptPubKeyMan() {
    if (!m_internal_spk_managers.empty() || !m_external_spk_managers.empty() ||
        !m_spk_managers.empty() || IsWalletFlagSet(WALLET_FLAG_DESCRIPTORS)) {
        return;
    }

    auto spk_manager =
        std::unique_ptr<ScriptPubKeyMan>(new LegacyScriptPubKeyMan(*this));
    for (const auto &type : OUTPUT_TYPES) {
        m_internal_spk_managers[type] = spk_manager.get();
        m_external_spk_managers[type] = spk_manager.get();
    }
    m_spk_managers[spk_manager->GetID()] = std::move(spk_manager);
}

const CKeyingMaterial &CWallet::GetEncryptionKey() const {
    return vMasterKey;
}

bool CWallet::HasEncryptionKeys() const {
    return !mapMasterKeys.empty();
}

void CWallet::ConnectScriptPubKeyManNotifiers() {
    for (const auto &spk_man : GetActiveScriptPubKeyMans()) {
        spk_man->NotifyWatchonlyChanged.connect(NotifyWatchonlyChanged);
        spk_man->NotifyCanGetAddressesChanged.connect(
            NotifyCanGetAddressesChanged);
    }
}

void CWallet::LoadDescriptorScriptPubKeyMan(uint256 id,
                                            WalletDescriptor &desc) {
    auto spk_manager = std::unique_ptr<ScriptPubKeyMan>(
        new DescriptorScriptPubKeyMan(*this, desc));
    m_spk_managers[id] = std::move(spk_manager);
}

void CWallet::SetupDescriptorScriptPubKeyMans() {
    AssertLockHeld(cs_wallet);

    // Make a seed
    CKey seed_key;
    seed_key.MakeNewKey(true);
    CPubKey seed = seed_key.GetPubKey();
    assert(seed_key.VerifyPubKey(seed));

    // Get the extended key
    CExtKey master_key;
    master_key.SetSeed(seed_key.begin(), seed_key.size());

    for (bool internal : {false, true}) {
        for (OutputType t : OUTPUT_TYPES) {
            auto spk_manager =
                std::make_unique<DescriptorScriptPubKeyMan>(*this, internal);
            if (IsCrypted()) {
                if (IsLocked()) {
                    throw std::runtime_error(
                        std::string(__func__) +
                        ": Wallet is locked, cannot setup new descriptors");
                }
                if (!spk_manager->CheckDecryptionKey(vMasterKey) &&
                    !spk_manager->Encrypt(vMasterKey, nullptr)) {
                    throw std::runtime_error(
                        std::string(__func__) +
                        ": Could not encrypt new descriptors");
                }
            }
            spk_manager->SetupDescriptorGeneration(master_key, t);
            uint256 id = spk_manager->GetID();
            m_spk_managers[id] = std::move(spk_manager);
            AddActiveScriptPubKeyMan(id, t, internal);
        }
    }
}

void CWallet::AddActiveScriptPubKeyMan(uint256 id, OutputType type,
                                       bool internal) {
    WalletBatch batch(*database);
    if (!batch.WriteActiveScriptPubKeyMan(static_cast<uint8_t>(type), id,
                                          internal)) {
        throw std::runtime_error(std::string(__func__) +
                                 ": writing active ScriptPubKeyMan id failed");
    }
    LoadActiveScriptPubKeyMan(id, type, internal);
}

void CWallet::LoadActiveScriptPubKeyMan(uint256 id, OutputType type,
                                        bool internal) {
    // Activating ScriptPubKeyManager for a given output and change type is
    // incompatible with legacy wallets.
    // Legacy wallets have only one ScriptPubKeyManager and it's active for all
    // output and change types.
    Assert(IsWalletFlagSet(WALLET_FLAG_DESCRIPTORS));

    WalletLogPrintf(
        "Setting spkMan to active: id = %s, type = %d, internal = %d\n",
        id.ToString(), static_cast<int>(type), static_cast<int>(internal));
    auto &spk_mans =
        internal ? m_internal_spk_managers : m_external_spk_managers;
    auto &spk_mans_other =
        internal ? m_external_spk_managers : m_internal_spk_managers;
    auto spk_man = m_spk_managers.at(id).get();
    spk_man->SetInternal(internal);
    spk_mans[type] = spk_man;

    const auto it = spk_mans_other.find(type);
    if (it != spk_mans_other.end() && it->second == spk_man) {
        spk_mans_other.erase(type);
    }

    NotifyCanGetAddressesChanged();
}

void CWallet::DeactivateScriptPubKeyMan(const uint256 &id, OutputType type,
                                        bool internal) {
    auto spk_man = GetScriptPubKeyMan(type, internal);
    if (spk_man != nullptr && spk_man->GetID() == id) {
        WalletLogPrintf(
            "Deactivate spkMan: id = %s, type = %d, internal = %d\n",
            id.ToString(), static_cast<int>(type), static_cast<int>(internal));
        WalletBatch batch(GetDatabase());
        if (!batch.EraseActiveScriptPubKeyMan(static_cast<uint8_t>(type),
                                              internal)) {
            throw std::runtime_error(
                std::string(__func__) +
                ": erasing active ScriptPubKeyMan id failed");
        }

        auto &spk_mans =
            internal ? m_internal_spk_managers : m_external_spk_managers;
        spk_mans.erase(type);
    }

    NotifyCanGetAddressesChanged();
}

bool CWallet::IsLegacy() const {
    if (m_internal_spk_managers.count(OutputType::LEGACY) == 0) {
        return false;
    }
    auto spk_man = dynamic_cast<LegacyScriptPubKeyMan *>(
        m_internal_spk_managers.at(OutputType::LEGACY));
    return spk_man != nullptr;
}

DescriptorScriptPubKeyMan *
CWallet::GetDescriptorScriptPubKeyMan(const WalletDescriptor &desc) const {
    for (auto &spk_man_pair : m_spk_managers) {
        // Try to downcast to DescriptorScriptPubKeyMan then check if the
        // descriptors match
        DescriptorScriptPubKeyMan *spk_manager =
            dynamic_cast<DescriptorScriptPubKeyMan *>(
                spk_man_pair.second.get());
        if (spk_manager != nullptr && spk_manager->HasWalletDescriptor(desc)) {
            return spk_manager;
        }
    }

    return nullptr;
}

ScriptPubKeyMan *
CWallet::AddWalletDescriptor(WalletDescriptor &desc,
                             const FlatSigningProvider &signing_provider,
                             const std::string &label, bool internal) {
    AssertLockHeld(cs_wallet);

    if (!IsWalletFlagSet(WALLET_FLAG_DESCRIPTORS)) {
        WalletLogPrintf(
            "Cannot add WalletDescriptor to a non-descriptor wallet\n");
        return nullptr;
    }

    auto spk_man = GetDescriptorScriptPubKeyMan(desc);
    if (spk_man) {
        WalletLogPrintf("Update existing descriptor: %s\n",
                        desc.descriptor->ToString());
        spk_man->UpdateWalletDescriptor(desc);
    } else {
        auto new_spk_man =
            std::make_unique<DescriptorScriptPubKeyMan>(*this, desc);
        spk_man = new_spk_man.get();

        // Save the descriptor to memory
        m_spk_managers[new_spk_man->GetID()] = std::move(new_spk_man);
    }

    // Add the private keys to the descriptor
    for (const auto &entry : signing_provider.keys) {
        const CKey &key = entry.second;
        spk_man->AddDescriptorKey(key, key.GetPubKey());
    }

    // Top up key pool, the manager will generate new scriptPubKeys internally
    if (!spk_man->TopUp()) {
        WalletLogPrintf("Could not top up scriptPubKeys\n");
        return nullptr;
    }

    // Apply the label if necessary
    // Note: we disable labels for ranged descriptors
    if (!desc.descriptor->IsRange()) {
        auto script_pub_keys = spk_man->GetScriptPubKeys();
        if (script_pub_keys.empty()) {
            WalletLogPrintf(
                "Could not generate scriptPubKeys (cache is empty)\n");
            return nullptr;
        }

        CTxDestination dest;
        if (!internal && ExtractDestination(script_pub_keys.at(0), dest)) {
            SetAddressBook(dest, label, "receive");
        }
    }

    // Save the descriptor to DB
    spk_man->WriteDescriptor();

    return spk_man;
}
