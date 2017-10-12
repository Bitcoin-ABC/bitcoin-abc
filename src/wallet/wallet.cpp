// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <wallet/wallet.h>

#include <chain.h>
#include <checkpoints.h>
#include <config.h>
#include <consensus/consensus.h>
#include <consensus/validation.h>
#include <fs.h>
#include <init.h>
#include <key.h>
#include <key_io.h>
#include <keystore.h>
#include <net.h>
#include <policy/policy.h>
#include <primitives/block.h>
#include <primitives/transaction.h>
#include <random.h>
#include <rpc/server.h> // for IsDeprecatedRPCEnabled
#include <script/script.h>
#include <script/sighashtype.h>
#include <script/sign.h>
#include <timedata.h>
#include <txmempool.h>
#include <ui_interface.h>
#include <util.h>
#include <utilmoneystr.h>
#include <validation.h>
#include <wallet/coincontrol.h>
#include <wallet/coinselection.h>
#include <wallet/fees.h>
#include <wallet/finaltx.h>
#include <wallet/walletutil.h>

#include <boost/algorithm/string/replace.hpp>

#include <algorithm>
#include <cassert>
#include <future>

static CCriticalSection cs_wallets;
static std::vector<CWallet *> vpwallets GUARDED_BY(cs_wallets);

bool AddWallet(CWallet *wallet) {
    LOCK(cs_wallets);
    assert(wallet);
    std::vector<CWallet *>::const_iterator i =
        std::find(vpwallets.begin(), vpwallets.end(), wallet);
    if (i != vpwallets.end()) {
        return false;
    }
    vpwallets.push_back(wallet);
    return true;
}

bool RemoveWallet(CWallet *wallet) {
    LOCK(cs_wallets);
    assert(wallet);
    std::vector<CWallet *>::iterator i =
        std::find(vpwallets.begin(), vpwallets.end(), wallet);
    if (i == vpwallets.end()) {
        return false;
    }
    vpwallets.erase(i);
    return true;
}

bool HasWallets() {
    LOCK(cs_wallets);
    return !vpwallets.empty();
}

std::vector<CWallet *> GetWallets() {
    LOCK(cs_wallets);
    return vpwallets;
}

CWallet *GetWallet(const std::string &name) {
    LOCK(cs_wallets);
    for (CWallet *wallet : vpwallets) {
        if (wallet->GetName() == name) {
            return wallet;
        }
    }
    return nullptr;
}

static const size_t OUTPUT_GROUP_MAX_ENTRIES = 10;

const uint32_t BIP32_HARDENED_KEY_LIMIT = 0x80000000;

const uint256 CMerkleTx::ABANDON_HASH(uint256S(
    "0000000000000000000000000000000000000000000000000000000000000001"));

/** @defgroup mapWallet
 *
 * @{
 */

std::string COutput::ToString() const {
    return strprintf("COutput(%s, %d, %d) [%s]", tx->GetId().ToString(), i,
                     nDepth, FormatMoney(tx->tx->vout[i].nValue));
}

class CAffectedKeysVisitor : public boost::static_visitor<void> {
private:
    const CKeyStore &keystore;
    std::vector<CKeyID> &vKeys;

public:
    CAffectedKeysVisitor(const CKeyStore &keystoreIn,
                         std::vector<CKeyID> &vKeysIn)
        : keystore(keystoreIn), vKeys(vKeysIn) {}

    void Process(const CScript &script) {
        txnouttype type;
        std::vector<CTxDestination> vDest;
        int nRequired;
        if (ExtractDestinations(script, type, vDest, nRequired)) {
            for (const CTxDestination &dest : vDest) {
                boost::apply_visitor(*this, dest);
            }
        }
    }

    void operator()(const CKeyID &keyId) {
        if (keystore.HaveKey(keyId)) {
            vKeys.push_back(keyId);
        }
    }

    void operator()(const CScriptID &scriptId) {
        CScript script;
        if (keystore.GetCScript(scriptId, script)) {
            Process(script);
        }
    }

    void operator()(const CNoDestination &none) {}
};

const CWalletTx *CWallet::GetWalletTx(const TxId &txid) const {
    LOCK(cs_wallet);
    std::map<TxId, CWalletTx>::const_iterator it = mapWallet.find(txid);
    if (it == mapWallet.end()) {
        return nullptr;
    }

    return &(it->second);
}

CPubKey CWallet::GenerateNewKey(WalletBatch &batch, bool internal) {
    // mapKeyMetadata
    AssertLockHeld(cs_wallet);
    // default to compressed public keys if we want 0.6.0 wallets
    bool fCompressed = CanSupportFeature(FEATURE_COMPRPUBKEY);

    CKey secret;

    // Create new metadata
    int64_t nCreationTime = GetTime();
    CKeyMetadata metadata(nCreationTime);

    // use HD key derivation if HD was enabled during wallet creation
    if (IsHDEnabled()) {
        DeriveNewChildKey(
            batch, metadata, secret,
            (CanSupportFeature(FEATURE_HD_SPLIT) ? internal : false));
    } else {
        secret.MakeNewKey(fCompressed);
    }

    // Compressed public keys were introduced in version 0.6.0
    if (fCompressed) {
        SetMinVersion(FEATURE_COMPRPUBKEY);
    }

    CPubKey pubkey = secret.GetPubKey();
    assert(secret.VerifyPubKey(pubkey));

    mapKeyMetadata[pubkey.GetID()] = metadata;
    UpdateTimeFirstKey(nCreationTime);

    if (!AddKeyPubKeyWithDB(batch, secret, pubkey)) {
        throw std::runtime_error(std::string(__func__) + ": AddKey failed");
    }

    return pubkey;
}

void CWallet::DeriveNewChildKey(WalletBatch &batch, CKeyMetadata &metadata,
                                CKey &secret, bool internal) {
    // for now we use a fixed keypath scheme of m/0'/0'/k
    // master key seed (256bit)
    CKey key;
    // hd master key
    CExtKey masterKey;
    // key at m/0'
    CExtKey accountKey;
    // key at m/0'/0' (external) or m/0'/1' (internal)
    CExtKey chainChildKey;
    // key at m/0'/0'/<n>'
    CExtKey childKey;

    // try to get the master key
    if (!GetKey(hdChain.masterKeyID, key)) {
        throw std::runtime_error(std::string(__func__) +
                                 ": Master key not found");
    }

    masterKey.SetMaster(key.begin(), key.size());

    // derive m/0'
    // use hardened derivation (child keys >= 0x80000000 are hardened after
    // bip32)
    masterKey.Derive(accountKey, BIP32_HARDENED_KEY_LIMIT);

    // derive m/0'/0' (external chain) OR m/0'/1' (internal chain)
    assert(internal ? CanSupportFeature(FEATURE_HD_SPLIT) : true);
    accountKey.Derive(chainChildKey,
                      BIP32_HARDENED_KEY_LIMIT + (internal ? 1 : 0));

    // derive child key at next index, skip keys already known to the wallet
    do {
        // always derive hardened keys
        // childIndex | BIP32_HARDENED_KEY_LIMIT = derive childIndex in hardened
        // child-index-range
        // example: 1 | BIP32_HARDENED_KEY_LIMIT == 0x80000001 == 2147483649
        if (internal) {
            chainChildKey.Derive(childKey, hdChain.nInternalChainCounter |
                                               BIP32_HARDENED_KEY_LIMIT);
            metadata.hdKeypath = "m/0'/1'/" +
                                 std::to_string(hdChain.nInternalChainCounter) +
                                 "'";
            hdChain.nInternalChainCounter++;
        } else {
            chainChildKey.Derive(childKey, hdChain.nExternalChainCounter |
                                               BIP32_HARDENED_KEY_LIMIT);
            metadata.hdKeypath = "m/0'/0'/" +
                                 std::to_string(hdChain.nExternalChainCounter) +
                                 "'";
            hdChain.nExternalChainCounter++;
        }
    } while (HaveKey(childKey.key.GetPubKey().GetID()));
    secret = childKey.key;
    metadata.hdMasterKeyID = hdChain.masterKeyID;
    // update the chain model in the database
    if (!batch.WriteHDChain(hdChain)) {
        throw std::runtime_error(std::string(__func__) +
                                 ": Writing HD chain model failed");
    }
}

bool CWallet::AddKeyPubKeyWithDB(WalletBatch &batch, const CKey &secret,
                                 const CPubKey &pubkey) {
    // mapKeyMetadata
    AssertLockHeld(cs_wallet);

    // CCryptoKeyStore has no concept of wallet databases, but calls
    // AddCryptedKey
    // which is overridden below.  To avoid flushes, the database handle is
    // tunneled through to it.
    bool needsDB = !encrypted_batch;
    if (needsDB) {
        encrypted_batch = &batch;
    }
    if (!CCryptoKeyStore::AddKeyPubKey(secret, pubkey)) {
        if (needsDB) {
            encrypted_batch = nullptr;
        }
        return false;
    }

    if (needsDB) {
        encrypted_batch = nullptr;
    }

    // Check if we need to remove from watch-only.
    CScript script;
    script = GetScriptForDestination(pubkey.GetID());
    if (HaveWatchOnly(script)) {
        RemoveWatchOnly(script);
    }

    script = GetScriptForRawPubKey(pubkey);
    if (HaveWatchOnly(script)) {
        RemoveWatchOnly(script);
    }

    if (IsCrypted()) {
        return true;
    }

    return batch.WriteKey(pubkey, secret.GetPrivKey(),
                          mapKeyMetadata[pubkey.GetID()]);
}

bool CWallet::AddKeyPubKey(const CKey &secret, const CPubKey &pubkey) {
    WalletBatch batch(*database);
    return CWallet::AddKeyPubKeyWithDB(batch, secret, pubkey);
}

bool CWallet::AddCryptedKey(const CPubKey &vchPubKey,
                            const std::vector<uint8_t> &vchCryptedSecret) {
    if (!CCryptoKeyStore::AddCryptedKey(vchPubKey, vchCryptedSecret)) {
        return false;
    }

    LOCK(cs_wallet);
    if (encrypted_batch) {
        return encrypted_batch->WriteCryptedKey(
            vchPubKey, vchCryptedSecret, mapKeyMetadata[vchPubKey.GetID()]);
    }

    return WalletBatch(*database).WriteCryptedKey(
        vchPubKey, vchCryptedSecret, mapKeyMetadata[vchPubKey.GetID()]);
}

bool CWallet::LoadKeyMetadata(const CKeyID &keyID, const CKeyMetadata &meta) {
    // mapKeyMetadata
    AssertLockHeld(cs_wallet);
    UpdateTimeFirstKey(meta.nCreateTime);
    mapKeyMetadata[keyID] = meta;
    return true;
}

bool CWallet::LoadScriptMetadata(const CScriptID &script_id,
                                 const CKeyMetadata &meta) {
    // m_script_metadata
    AssertLockHeld(cs_wallet);
    UpdateTimeFirstKey(meta.nCreateTime);
    m_script_metadata[script_id] = meta;
    return true;
}

bool CWallet::LoadCryptedKey(const CPubKey &vchPubKey,
                             const std::vector<uint8_t> &vchCryptedSecret) {
    return CCryptoKeyStore::AddCryptedKey(vchPubKey, vchCryptedSecret);
}

/**
 * Update wallet first key creation time. This should be called whenever keys
 * are added to the wallet, with the oldest key creation time.
 */
void CWallet::UpdateTimeFirstKey(int64_t nCreateTime) {
    AssertLockHeld(cs_wallet);
    if (nCreateTime <= 1) {
        // Cannot determine birthday information, so set the wallet birthday to
        // the beginning of time.
        nTimeFirstKey = 1;
    } else if (!nTimeFirstKey || nCreateTime < nTimeFirstKey) {
        nTimeFirstKey = nCreateTime;
    }
}

bool CWallet::AddCScript(const CScript &redeemScript) {
    if (!CCryptoKeyStore::AddCScript(redeemScript)) {
        return false;
    }

    return WalletBatch(*database).WriteCScript(Hash160(redeemScript),
                                               redeemScript);
}

bool CWallet::LoadCScript(const CScript &redeemScript) {
    /**
     * A sanity check was added in pull #3843 to avoid adding redeemScripts that
     * never can be redeemed. However, old wallets may still contain these. Do
     * not add them to the wallet and warn.
     */
    if (redeemScript.size() > MAX_SCRIPT_ELEMENT_SIZE) {
        std::string strAddr =
            EncodeDestination(CScriptID(redeemScript), GetConfig());
        LogPrintf("%s: Warning: This wallet contains a redeemScript of size %i "
                  "which exceeds maximum size %i thus can never be redeemed. "
                  "Do not use address %s.\n",
                  __func__, redeemScript.size(), MAX_SCRIPT_ELEMENT_SIZE,
                  strAddr);
        return true;
    }

    return CCryptoKeyStore::AddCScript(redeemScript);
}

bool CWallet::AddWatchOnly(const CScript &dest) {
    if (!CCryptoKeyStore::AddWatchOnly(dest)) {
        return false;
    }

    const CKeyMetadata &meta = m_script_metadata[CScriptID(dest)];
    UpdateTimeFirstKey(meta.nCreateTime);
    NotifyWatchonlyChanged(true);
    return WalletBatch(*database).WriteWatchOnly(dest, meta);
}

bool CWallet::AddWatchOnly(const CScript &dest, int64_t nCreateTime) {
    m_script_metadata[CScriptID(dest)].nCreateTime = nCreateTime;
    return AddWatchOnly(dest);
}

bool CWallet::RemoveWatchOnly(const CScript &dest) {
    AssertLockHeld(cs_wallet);
    if (!CCryptoKeyStore::RemoveWatchOnly(dest)) {
        return false;
    }

    if (!HaveWatchOnly()) {
        NotifyWatchonlyChanged(false);
    }

    return WalletBatch(*database).EraseWatchOnly(dest);
}

bool CWallet::LoadWatchOnly(const CScript &dest) {
    return CCryptoKeyStore::AddWatchOnly(dest);
}

bool CWallet::Unlock(const SecureString &strWalletPassphrase) {
    CCrypter crypter;
    CKeyingMaterial _vMasterKey;

    LOCK(cs_wallet);
    for (const MasterKeyMap::value_type &pMasterKey : mapMasterKeys) {
        if (!crypter.SetKeyFromPassphrase(
                strWalletPassphrase, pMasterKey.second.vchSalt,
                pMasterKey.second.nDeriveIterations,
                pMasterKey.second.nDerivationMethod)) {
            return false;
        }

        if (!crypter.Decrypt(pMasterKey.second.vchCryptedKey, _vMasterKey)) {
            // try another master key
            continue;
        }

        if (CCryptoKeyStore::Unlock(_vMasterKey)) {
            return true;
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

        if (CCryptoKeyStore::Unlock(_vMasterKey)) {
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

            LogPrintf(
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

void CWallet::ChainStateFlushed(const CBlockLocator &loc) {
    WalletBatch batch(*database);
    batch.WriteBestBlock(loc);
}

bool CWallet::SetMinVersion(enum WalletFeature nVersion, WalletBatch *batch_in,
                            bool fExplicit) {
    // nWalletVersion
    LOCK(cs_wallet);
    if (nWalletVersion >= nVersion) {
        return true;
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

    return true;
}

bool CWallet::SetMaxVersion(int nVersion) {
    // nWalletVersion, nWalletMaxVersion
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

void CWallet::Flush(bool shutdown) {
    database->Flush(shutdown);
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
        copyTo->strFromAccount = copyFrom->strFromAccount;
        // nOrderPos not copied on purpose cached members not copied on purpose.
    }
}

/**
 * Outpoint is spent if any non-conflicted transaction, spends it:
 */
bool CWallet::IsSpent(const COutPoint &outpoint) const {
    std::pair<TxSpends::const_iterator, TxSpends::const_iterator> range =
        mapTxSpends.equal_range(outpoint);

    for (TxSpends::const_iterator it = range.first; it != range.second; ++it) {
        const TxId &wtxid = it->second;
        std::map<TxId, CWalletTx>::const_iterator mit = mapWallet.find(wtxid);
        if (mit != mapWallet.end()) {
            int depth = mit->second.GetDepthInMainChain();
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

    std::pair<TxSpends::iterator, TxSpends::iterator> range;
    range = mapTxSpends.equal_range(outpoint);
    SyncMetaData(range);
}

void CWallet::AddToSpends(const TxId &wtxid) {
    auto it = mapWallet.find(wtxid);
    assert(it != mapWallet.end());
    CWalletTx &thisTx = it->second;
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

    LogPrintf("Encrypting Wallet with an nDeriveIterations of %i\n",
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
        assert(!encrypted_batch);
        encrypted_batch = new WalletBatch(*database);
        if (!encrypted_batch->TxnBegin()) {
            delete encrypted_batch;
            encrypted_batch = nullptr;
            return false;
        }
        encrypted_batch->WriteMasterKey(nMasterKeyMaxID, kMasterKey);

        if (!EncryptKeys(_vMasterKey)) {
            encrypted_batch->TxnAbort();
            delete encrypted_batch;
            // We now probably have half of our keys encrypted in memory, and
            // half not... die and let the user reload the unencrypted wallet.
            assert(false);
        }

        // Encryption was introduced in version 0.4.0
        SetMinVersion(FEATURE_WALLETCRYPT, encrypted_batch, true);

        if (!encrypted_batch->TxnCommit()) {
            delete encrypted_batch;
            // We now have keys encrypted in memory, but not on disk...
            // die to avoid confusion and let the user reload the unencrypted
            // wallet.
            assert(false);
        }

        delete encrypted_batch;
        encrypted_batch = nullptr;

        Lock();
        Unlock(strWalletPassphrase);

        // If we are using HD, replace the HD master key (seed) with a new one.
        if (IsHDEnabled()) {
            if (!SetHDMasterKey(GenerateNewHDMasterKey())) {
                return false;
            }
        }

        NewKeyPool();
        Lock();

        // Need to completely rewrite the wallet file; if we don't, bdb might
        // keep bits of the unencrypted private key in slack space in the
        // database file.
        database->Rewrite();
    }

    NotifyStatusChanged(this);
    return true;
}

DBErrors CWallet::ReorderTransactions() {
    LOCK(cs_wallet);
    WalletBatch batch(*database);

    // Old wallets didn't have any defined order for transactions. Probably a
    // bad idea to change the output of this.

    // First: get all CWalletTx and CAccountingEntry into a sorted-by-time
    // multimap.
    TxItems txByTime;

    for (auto &entry : mapWallet) {
        CWalletTx *wtx = &entry.second;
        txByTime.insert(
            std::make_pair(wtx->nTimeReceived, TxPair(wtx, nullptr)));
    }

    std::list<CAccountingEntry> acentries;
    batch.ListAccountCreditDebit("", acentries);
    for (CAccountingEntry &entry : acentries) {
        txByTime.insert(std::make_pair(entry.nTime, TxPair(nullptr, &entry)));
    }

    nOrderPosNext = 0;
    std::vector<int64_t> nOrderPosOffsets;
    for (TxItems::iterator it = txByTime.begin(); it != txByTime.end(); ++it) {
        CWalletTx *const pwtx = (*it).second.first;
        CAccountingEntry *const pacentry = (*it).second.second;
        int64_t &nOrderPos =
            (pwtx != nullptr) ? pwtx->nOrderPos : pacentry->nOrderPos;

        if (nOrderPos == -1) {
            nOrderPos = nOrderPosNext++;
            nOrderPosOffsets.push_back(nOrderPos);

            if (pwtx) {
                if (!batch.WriteTx(*pwtx)) {
                    return DBErrors::LOAD_FAIL;
                }
            } else if (!batch.WriteAccountingEntry(pacentry->nEntryNo,
                                                   *pacentry)) {
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
            if (pwtx) {
                if (!batch.WriteTx(*pwtx)) {
                    return DBErrors::LOAD_FAIL;
                }
            } else if (!batch.WriteAccountingEntry(pacentry->nEntryNo,
                                                   *pacentry)) {
                return DBErrors::LOAD_FAIL;
            }
        }
    }

    batch.WriteOrderPosNext(nOrderPosNext);

    return DBErrors::LOAD_OK;
}

int64_t CWallet::IncOrderPosNext(WalletBatch *batch) {
    // nOrderPosNext
    AssertLockHeld(cs_wallet);
    int64_t nRet = nOrderPosNext++;
    if (batch) {
        batch->WriteOrderPosNext(nOrderPosNext);
    } else {
        WalletBatch(*database).WriteOrderPosNext(nOrderPosNext);
    }

    return nRet;
}

bool CWallet::AccountMove(std::string strFrom, std::string strTo,
                          const Amount nAmount, std::string strComment) {
    WalletBatch batch(*database);
    if (!batch.TxnBegin()) {
        return false;
    }

    int64_t nNow = GetAdjustedTime();

    // Debit
    CAccountingEntry debit;
    debit.nOrderPos = IncOrderPosNext(&batch);
    debit.strAccount = strFrom;
    debit.nCreditDebit = -nAmount;
    debit.nTime = nNow;
    debit.strOtherAccount = strTo;
    debit.strComment = strComment;
    AddAccountingEntry(debit, &batch);

    // Credit
    CAccountingEntry credit;
    credit.nOrderPos = IncOrderPosNext(&batch);
    credit.strAccount = strTo;
    credit.nCreditDebit = nAmount;
    credit.nTime = nNow;
    credit.strOtherAccount = strFrom;
    credit.strComment = strComment;
    AddAccountingEntry(credit, &batch);

    return batch.TxnCommit();
}

bool CWallet::GetLabelDestination(CTxDestination &dest,
                                  const std::string &label, bool bForceNew) {
    WalletBatch batch(*database);

    CAccount account;
    batch.ReadAccount(label, account);

    if (!bForceNew) {
        if (!account.vchPubKey.IsValid()) {
            bForceNew = true;
        } else {
            // Check if the current key has been used (TODO: check other
            // addresses with the same key)
            CScript scriptPubKey = GetScriptForDestination(GetDestinationForKey(
                account.vchPubKey, m_default_address_type));
            for (std::map<TxId, CWalletTx>::iterator it = mapWallet.begin();
                 it != mapWallet.end() && account.vchPubKey.IsValid(); ++it) {
                for (const CTxOut &txout : (*it).second.tx->vout) {
                    if (txout.scriptPubKey == scriptPubKey) {
                        bForceNew = true;
                        break;
                    }
                }
            }
        }
    }

    // Generate a new key
    if (bForceNew) {
        if (!GetKeyFromPool(account.vchPubKey, false)) {
            return false;
        }

        LearnRelatedScripts(account.vchPubKey, m_default_address_type);
        dest = GetDestinationForKey(account.vchPubKey, m_default_address_type);
        SetAddressBook(dest, label, "receive");
        batch.WriteAccount(label, account);
    } else {
        dest = GetDestinationForKey(account.vchPubKey, m_default_address_type);
    }

    return true;
}

void CWallet::MarkDirty() {
    LOCK(cs_wallet);
    for (std::pair<const TxId, CWalletTx> &item : mapWallet) {
        item.second.MarkDirty();
    }
}

bool CWallet::AddToWallet(const CWalletTx &wtxIn, bool fFlushOnClose) {
    LOCK(cs_wallet);

    WalletBatch batch(*database, "r+", fFlushOnClose);

    const TxId &txid = wtxIn.GetId();

    // Inserts only if not already there, returns tx inserted or tx found.
    std::pair<std::map<TxId, CWalletTx>::iterator, bool> ret =
        mapWallet.insert(std::make_pair(txid, wtxIn));
    CWalletTx &wtx = (*ret.first).second;
    wtx.BindWallet(this);
    bool fInsertedNew = ret.second;
    if (fInsertedNew) {
        wtx.nTimeReceived = GetAdjustedTime();
        wtx.nOrderPos = IncOrderPosNext(&batch);
        wtxOrdered.insert(std::make_pair(wtx.nOrderPos, TxPair(&wtx, nullptr)));
        wtx.nTimeSmart = ComputeTimeSmart(wtx);
        AddToSpends(txid);
    }

    bool fUpdated = false;
    if (!fInsertedNew) {
        // Merge
        if (!wtxIn.hashUnset() && wtxIn.hashBlock != wtx.hashBlock) {
            wtx.hashBlock = wtxIn.hashBlock;
            fUpdated = true;
        }

        // If no longer abandoned, update
        if (wtxIn.hashBlock.IsNull() && wtx.isAbandoned()) {
            wtx.hashBlock = wtxIn.hashBlock;
            fUpdated = true;
        }

        if (wtxIn.nIndex != -1 && (wtxIn.nIndex != wtx.nIndex)) {
            wtx.nIndex = wtxIn.nIndex;
            fUpdated = true;
        }

        if (wtxIn.fFromMe && wtxIn.fFromMe != wtx.fFromMe) {
            wtx.fFromMe = wtxIn.fFromMe;
            fUpdated = true;
        }
    }

    //// debug print
    LogPrintf("AddToWallet %s  %s%s\n", wtxIn.GetId().ToString(),
              (fInsertedNew ? "new" : ""), (fUpdated ? "update" : ""));

    // Write to disk
    if ((fInsertedNew || fUpdated) && !batch.WriteTx(wtx)) {
        return false;
    }

    // Break debit/credit balance caches:
    wtx.MarkDirty();

    // Notify UI of new or updated transaction.
    NotifyTransactionChanged(this, txid, fInsertedNew ? CT_NEW : CT_UPDATED);

    // Notify an external script when a wallet transaction comes in or is
    // updated.
    std::string strCmd = gArgs.GetArg("-walletnotify", "");

    if (!strCmd.empty()) {
        boost::replace_all(strCmd, "%s", wtxIn.GetId().GetHex());
        std::thread t(runCommand, strCmd);
        // Thread runs free.
        t.detach();
    }

    return true;
}

bool CWallet::LoadToWallet(const CWalletTx &wtxIn) {
    const TxId &txid = wtxIn.GetId();
    CWalletTx &wtx = mapWallet.emplace(txid, wtxIn).first->second;
    wtx.BindWallet(this);
    wtxOrdered.insert(std::make_pair(wtx.nOrderPos, TxPair(&wtx, nullptr)));
    AddToSpends(txid);
    for (const CTxIn &txin : wtx.tx->vin) {
        auto it = mapWallet.find(txin.prevout.GetTxId());
        if (it != mapWallet.end()) {
            CWalletTx &prevtx = it->second;
            if (prevtx.nIndex == -1 && !prevtx.hashUnset()) {
                MarkConflicted(prevtx.hashBlock, wtx.GetId());
            }
        }
    }

    return true;
}

/**
 * Add a transaction to the wallet, or update it.  pIndex and posInBlock should
 * be set when the transaction was known to be included in a block. When pIndex
 * == nullptr, then wallet state is not updated in AddToWallet, but
 * notifications happen and cached balances are marked dirty.
 *
 * If fUpdate is true, existing transactions will be updated.
 * TODO: One exception to this is that the abandoned state is cleared under the
 * assumption that any further notification of a transaction that was considered
 * abandoned is an indication that it is not safe to be considered abandoned.
 * Abandoned state should probably be more carefully tracked via different
 * posInBlock signals or by checking mempool presence when necessary.
 */
bool CWallet::AddToWalletIfInvolvingMe(const CTransactionRef &ptx,
                                       const CBlockIndex *pIndex,
                                       int posInBlock, bool fUpdate) {
    const CTransaction &tx = *ptx;
    AssertLockHeld(cs_wallet);

    if (pIndex != nullptr) {
        for (const CTxIn &txin : tx.vin) {
            std::pair<TxSpends::const_iterator, TxSpends::const_iterator>
                range = mapTxSpends.equal_range(txin.prevout);
            while (range.first != range.second) {
                if (range.first->second != tx.GetId()) {
                    LogPrintf("Transaction %s (in block %s) conflicts with "
                              "wallet transaction %s (both spend %s:%i)\n",
                              tx.GetId().ToString(),
                              pIndex->GetBlockHash().ToString(),
                              range.first->second.ToString(),
                              range.first->first.GetTxId().ToString(),
                              range.first->first.GetN());
                    MarkConflicted(pIndex->GetBlockHash(), range.first->second);
                }
                range.first++;
            }
        }
    }

    bool fExisted = mapWallet.count(tx.GetId()) != 0;
    if (fExisted && !fUpdate) {
        return false;
    }
    if (fExisted || IsMine(tx) || IsFromMe(tx)) {
        /**
         * Check if any keys in the wallet keypool that were supposed to be
         * unused have appeared in a new transaction. If so, remove those keys
         * from the keypool. This can happen when restoring an old wallet backup
         * that does not contain the mostly recently created transactions from
         * newer versions of the wallet.
         */

        // loop though all outputs
        for (const CTxOut &txout : tx.vout) {
            // extract addresses and check if they match with an unused keypool
            // key
            std::vector<CKeyID> vAffected;
            CAffectedKeysVisitor(*this, vAffected).Process(txout.scriptPubKey);
            for (const CKeyID &keyid : vAffected) {
                std::map<CKeyID, int64_t>::const_iterator mi =
                    m_pool_key_to_index.find(keyid);
                if (mi != m_pool_key_to_index.end()) {
                    LogPrintf("%s: Detected a used keypool key, mark all "
                              "keypool key up to this key as used\n",
                              __func__);
                    MarkReserveKeysAsUsed(mi->second);

                    if (!TopUpKeyPool()) {
                        LogPrintf(
                            "%s: Topping up keypool failed (locked wallet)\n",
                            __func__);
                    }
                }
            }
        }

        CWalletTx wtx(this, ptx);

        // Get merkle branch if transaction was found in a block
        if (pIndex != nullptr) {
            wtx.SetMerkleBranch(pIndex, posInBlock);
        }

        return AddToWallet(wtx, false);
    }

    return false;
}

bool CWallet::TransactionCanBeAbandoned(const TxId &txid) const {
    LOCK2(cs_main, cs_wallet);
    const CWalletTx *wtx = GetWalletTx(txid);
    return wtx && !wtx->isAbandoned() && wtx->GetDepthInMainChain() == 0 &&
           !wtx->InMempool();
}

bool CWallet::AbandonTransaction(const TxId &txid) {
    LOCK2(cs_main, cs_wallet);

    WalletBatch batch(*database, "r+");

    std::set<TxId> todo;
    std::set<TxId> done;

    // Can't mark abandoned if confirmed or in mempool
    auto it = mapWallet.find(txid);
    assert(it != mapWallet.end());
    CWalletTx &origtx = it->second;
    if (origtx.GetDepthInMainChain() != 0 || origtx.InMempool()) {
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
        int currentconfirm = wtx.GetDepthInMainChain();
        // If the orig tx was not in block, none of its spends can be.
        assert(currentconfirm <= 0);
        // If (currentconfirm < 0) {Tx and spends are already conflicted, no
        // need to abandon}
        if (currentconfirm == 0 && !wtx.isAbandoned()) {
            // If the orig tx was not in block/mempool, none of its spends can
            // be in mempool.
            assert(!wtx.InMempool());
            wtx.nIndex = -1;
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
            for (const CTxIn &txin : wtx.tx->vin) {
                auto it2 = mapWallet.find(txin.prevout.GetTxId());
                if (it2 != mapWallet.end()) {
                    it2->second.MarkDirty();
                }
            }
        }
    }

    return true;
}

void CWallet::MarkConflicted(const uint256 &hashBlock, const TxId &txid) {
    LOCK2(cs_main, cs_wallet);

    int conflictconfirms = 0;
    CBlockIndex *pindex = LookupBlockIndex(hashBlock);
    if (pindex && chainActive.Contains(pindex)) {
        conflictconfirms = -(chainActive.Height() - pindex->nHeight + 1);
    }

    // If number of conflict confirms cannot be determined, this means that the
    // block is still unknown or not yet part of the main chain, for example
    // when loading the wallet during a reindex. Do nothing in that case.
    if (conflictconfirms >= 0) {
        return;
    }

    // Do not flush the wallet here for performance reasons.
    WalletBatch batch(*database, "r+", false);

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
        int currentconfirm = wtx.GetDepthInMainChain();
        if (conflictconfirms < currentconfirm) {
            // Block is 'more conflicted' than current confirm; update.
            // Mark transaction as conflicted with this block.
            wtx.nIndex = -1;
            wtx.hashBlock = hashBlock;
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
            for (const CTxIn &txin : wtx.tx->vin) {
                auto it2 = mapWallet.find(txin.prevout.GetTxId());
                if (it2 != mapWallet.end()) {
                    it2->second.MarkDirty();
                }
            }
        }
    }
}

void CWallet::SyncTransaction(const CTransactionRef &ptx,
                              const CBlockIndex *pindex, int posInBlock) {
    const CTransaction &tx = *ptx;

    if (!AddToWalletIfInvolvingMe(ptx, pindex, posInBlock, true)) {
        // Not one of ours
        return;
    }

    // If a transaction changes 'conflicted' state, that changes the balance
    // available of the outputs it spends. So force those to be
    // recomputed, also:
    for (const CTxIn &txin : tx.vin) {
        auto it = mapWallet.find(txin.prevout.GetTxId());
        if (it != mapWallet.end()) {
            it->second.MarkDirty();
        }
    }
}

void CWallet::TransactionAddedToMempool(const CTransactionRef &ptx) {
    LOCK2(cs_main, cs_wallet);
    SyncTransaction(ptx);

    auto it = mapWallet.find(ptx->GetId());
    if (it != mapWallet.end()) {
        it->second.fInMempool = true;
    }
}

void CWallet::TransactionRemovedFromMempool(const CTransactionRef &ptx) {
    LOCK(cs_wallet);
    auto it = mapWallet.find(ptx->GetId());
    if (it != mapWallet.end()) {
        it->second.fInMempool = false;
    }
}

void CWallet::BlockConnected(
    const std::shared_ptr<const CBlock> &pblock, const CBlockIndex *pindex,
    const std::vector<CTransactionRef> &vtxConflicted) {
    LOCK2(cs_main, cs_wallet);

    // TODO: Temporarily ensure that mempool removals are notified before
    // connected transactions. This shouldn't matter, but the abandoned state of
    // transactions in our wallet is currently cleared when we receive another
    // notification and there is a race condition where notification of a
    // connected conflict might cause an outside process to abandon a
    // transaction and then have it inadvertently cleared by the notification
    // that the conflicted transaction was evicted.
    for (const CTransactionRef &ptx : vtxConflicted) {
        SyncTransaction(ptx);
        TransactionRemovedFromMempool(ptx);
    }

    for (size_t i = 0; i < pblock->vtx.size(); i++) {
        SyncTransaction(pblock->vtx[i], pindex, i);
        TransactionRemovedFromMempool(pblock->vtx[i]);
    }

    m_last_block_processed = pindex;
}

void CWallet::BlockDisconnected(const std::shared_ptr<const CBlock> &pblock) {
    LOCK2(cs_main, cs_wallet);

    for (const CTransactionRef &ptx : pblock->vtx) {
        SyncTransaction(ptx);
    }
}

void CWallet::BlockUntilSyncedToCurrentChain() {
    AssertLockNotHeld(cs_main);
    AssertLockNotHeld(cs_wallet);

    {
        // Skip the queue-draining stuff if we know we're caught up with
        // chainActive.Tip()...
        // We could also take cs_wallet here, and call m_last_block_processed
        // protected by cs_wallet instead of cs_main, but as long as we need
        // cs_main here anyway, its easier to just call it cs_main-protected.
        LOCK(cs_main);
        const CBlockIndex *initialChainTip = chainActive.Tip();

        if (m_last_block_processed->GetAncestor(initialChainTip->nHeight) ==
            initialChainTip) {
            return;
        }
    }

    // ...otherwise put a callback in the validation interface queue and wait
    // for the queue to drain enough to execute it (indicating we are caught up
    // at least with the time we entered this function).
    SyncWithValidationInterfaceQueue();
}

isminetype CWallet::IsMine(const CTxIn &txin) const {
    LOCK(cs_wallet);
    std::map<TxId, CWalletTx>::const_iterator mi =
        mapWallet.find(txin.prevout.GetTxId());
    if (mi != mapWallet.end()) {
        const CWalletTx &prev = (*mi).second;
        if (txin.prevout.GetN() < prev.tx->vout.size()) {
            return IsMine(prev.tx->vout[txin.prevout.GetN()]);
        }
    }

    return ISMINE_NO;
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
    return ::IsMine(*this, txout.scriptPubKey);
}

Amount CWallet::GetCredit(const CTxOut &txout,
                          const isminefilter &filter) const {
    if (!MoneyRange(txout.nValue)) {
        throw std::runtime_error(std::string(__func__) +
                                 ": value out of range");
    }

    return (IsMine(txout) & filter) ? txout.nValue : Amount::zero();
}

bool CWallet::IsChange(const CTxOut &txout) const {
    // TODO: fix handling of 'change' outputs. The assumption is that any
    // payment to a script that is ours, but is not in the address book is
    // change. That assumption is likely to break when we implement
    // multisignature wallets that return change back into a
    // multi-signature-protected address; a better way of identifying which
    // outputs are 'the send' and which are 'the change' will need to be
    // implemented (maybe extend CWalletTx to remember which output, if any, was
    // change).
    if (::IsMine(*this, txout.scriptPubKey)) {
        CTxDestination address;
        if (!ExtractDestination(txout.scriptPubKey, address)) {
            return true;
        }

        LOCK(cs_wallet);
        if (!mapAddressBook.count(address)) {
            return true;
        }
    }

    return false;
}

Amount CWallet::GetChange(const CTxOut &txout) const {
    if (!MoneyRange(txout.nValue)) {
        throw std::runtime_error(std::string(__func__) +
                                 ": value out of range");
    }

    return (IsChange(txout) ? txout.nValue : Amount::zero());
}

bool CWallet::IsMine(const CTransaction &tx) const {
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

bool CWallet::IsAllFromMe(const CTransaction &tx,
                          const isminefilter &filter) const {
    LOCK(cs_wallet);

    for (const CTxIn &txin : tx.vin) {
        auto mi = mapWallet.find(txin.prevout.GetTxId());
        if (mi == mapWallet.end()) {
            // Any unknown inputs can't be from us.
            return false;
        }

        const CWalletTx &prev = (*mi).second;

        if (txin.prevout.GetN() >= prev.tx->vout.size()) {
            // Invalid input!
            return false;
        }

        if (!(IsMine(prev.tx->vout[txin.prevout.GetN()]) & filter)) {
            return false;
        }
    }

    return true;
}

Amount CWallet::GetCredit(const CTransaction &tx,
                          const isminefilter &filter) const {
    Amount nCredit = Amount::zero();
    for (const CTxOut &txout : tx.vout) {
        nCredit += GetCredit(txout, filter);
        if (!MoneyRange(nCredit)) {
            throw std::runtime_error(std::string(__func__) +
                                     ": value out of range");
        }
    }

    return nCredit;
}

Amount CWallet::GetChange(const CTransaction &tx) const {
    Amount nChange = Amount::zero();
    for (const CTxOut &txout : tx.vout) {
        nChange += GetChange(txout);
        if (!MoneyRange(nChange)) {
            throw std::runtime_error(std::string(__func__) +
                                     ": value out of range");
        }
    }

    return nChange;
}

CPubKey CWallet::GenerateNewHDMasterKey() {
    CKey key;
    key.MakeNewKey(true);

    int64_t nCreationTime = GetTime();
    CKeyMetadata metadata(nCreationTime);

    // Calculate the pubkey.
    CPubKey pubkey = key.GetPubKey();
    assert(key.VerifyPubKey(pubkey));

    // Set the hd keypath to "m" -> Master, refers the masterkeyid to itself.
    metadata.hdKeypath = "m";
    metadata.hdMasterKeyID = pubkey.GetID();

    LOCK(cs_wallet);

    // mem store the metadata
    mapKeyMetadata[pubkey.GetID()] = metadata;

    // Write the key&metadata to the database.
    if (!AddKeyPubKey(key, pubkey)) {
        throw std::runtime_error(std::string(__func__) +
                                 ": AddKeyPubKey failed");
    }

    return pubkey;
}

bool CWallet::SetHDMasterKey(const CPubKey &pubkey) {
    LOCK(cs_wallet);

    // Store the keyid (hash160) together with the child index counter in the
    // database as a hdchain object.
    CHDChain newHdChain;
    newHdChain.nVersion = CanSupportFeature(FEATURE_HD_SPLIT)
                              ? CHDChain::VERSION_HD_CHAIN_SPLIT
                              : CHDChain::VERSION_HD_BASE;
    newHdChain.masterKeyID = pubkey.GetID();
    SetHDChain(newHdChain, false);

    return true;
}

bool CWallet::SetHDChain(const CHDChain &chain, bool memonly) {
    LOCK(cs_wallet);
    if (!memonly && !WalletBatch(*database).WriteHDChain(chain)) {
        throw std::runtime_error(std::string(__func__) +
                                 ": writing chain failed");
    }

    hdChain = chain;
    return true;
}

bool CWallet::IsHDEnabled() const {
    return !hdChain.masterKeyID.IsNull();
}

int64_t CWalletTx::GetTxTime() const {
    int64_t n = nTimeSmart;
    return n ? n : nTimeReceived;
}

// Helper for producing a max-sized low-S signature (eg 72 bytes)
bool CWallet::DummySignInput(CTxIn &tx_in, const CTxOut &txout) const {
    // Fill in dummy signatures for fee calculation.
    const CScript &scriptPubKey = txout.scriptPubKey;
    SignatureData sigdata;

    if (!ProduceSignature(DummySignatureCreator(this), scriptPubKey, sigdata)) {
        return false;
    }

    UpdateInput(tx_in, sigdata);
    return true;
}

// Helper for producing a bunch of max-sized low-S signatures (eg 72 bytes)
bool CWallet::DummySignTx(CMutableTransaction &txNew,
                          const std::vector<CTxOut> &txouts) const {
    // Fill in dummy signatures for fee calculation.
    int nIn = 0;
    for (const auto &txout : txouts) {
        if (!DummySignInput(txNew.vin[nIn], txout)) {
            return false;
        }

        nIn++;
    }
    return true;
}

int64_t CalculateMaximumSignedTxSize(const CTransaction &tx,
                                     const CWallet *wallet) {
    std::vector<CTxOut> txouts;
    // Look up the inputs.  We should have already checked that this transaction
    // IsAllFromMe(ISMINE_SPENDABLE), so every input should already be in our
    // wallet, with a valid index into the vout array, and the ability to sign.
    for (auto &input : tx.vin) {
        const auto mi = wallet->mapWallet.find(input.prevout.GetTxId());
        if (mi == wallet->mapWallet.end()) {
            return -1;
        }
        assert(input.prevout.GetN() < mi->second.tx->vout.size());
        txouts.emplace_back(mi->second.tx->vout[input.prevout.GetN()]);
    }
    return CalculateMaximumSignedTxSize(tx, wallet, txouts);
}

// txouts needs to be in the order of tx.vin
int64_t CalculateMaximumSignedTxSize(const CTransaction &tx,
                                     const CWallet *wallet,
                                     const std::vector<CTxOut> &txouts) {
    CMutableTransaction txNew(tx);
    if (!wallet->DummySignTx(txNew, txouts)) {
        // This should never happen, because IsAllFromMe(ISMINE_SPENDABLE)
        // implies that we can sign for every input.
        return -1;
    }
    return GetVirtualTransactionSize(CTransaction(txNew));
}

int CalculateMaximumSignedInputSize(const CTxOut &txout,
                                    const CWallet *wallet) {
    CMutableTransaction txn;
    txn.vin.push_back(CTxIn(COutPoint()));
    if (!wallet->DummySignInput(txn.vin[0], txout)) {
        // This should never happen, because IsAllFromMe(ISMINE_SPENDABLE)
        // implies that we can sign for every input.
        return -1;
    }
    return GetVirtualTransactionInputSize(txn.vin[0]);
}

void CWalletTx::GetAmounts(std::list<COutputEntry> &listReceived,
                           std::list<COutputEntry> &listSent, Amount &nFee,
                           std::string &strSentAccount,
                           const isminefilter &filter) const {
    nFee = Amount::zero();
    listReceived.clear();
    listSent.clear();
    strSentAccount = strFromAccount;

    // Compute fee:
    Amount nDebit = GetDebit(filter);
    // debit>0 means we signed/sent this transaction.
    if (nDebit > Amount::zero()) {
        Amount nValueOut = tx->GetValueOut();
        nFee = (nDebit - nValueOut);
    }

    // Sent/received.
    for (unsigned int i = 0; i < tx->vout.size(); ++i) {
        const CTxOut &txout = tx->vout[i];
        isminetype fIsMine = pwallet->IsMine(txout);
        // Only need to handle txouts if AT LEAST one of these is true:
        //   1) they debit from us (sent)
        //   2) the output is to us (received)
        if (nDebit > Amount::zero()) {
            // Don't report 'change' txouts
            if (pwallet->IsChange(txout)) {
                continue;
            }
        } else if (!(fIsMine & filter)) {
            continue;
        }

        // In either case, we need to get the destination address.
        CTxDestination address;

        if (!ExtractDestination(txout.scriptPubKey, address) &&
            !txout.scriptPubKey.IsUnspendable()) {
            LogPrintf("CWalletTx::GetAmounts: Unknown transaction type found, "
                      "txid %s\n",
                      this->GetId().ToString());
            address = CNoDestination();
        }

        COutputEntry output = {address, txout.nValue, (int)i};

        // If we are debited by the transaction, add the output as a "sent"
        // entry.
        if (nDebit > Amount::zero()) {
            listSent.push_back(output);
        }

        // If we are receiving the output, add it as a "received" entry.
        if (fIsMine & filter) {
            listReceived.push_back(output);
        }
    }
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
    CBlockIndex *startBlock = nullptr;
    {
        LOCK(cs_main);
        startBlock =
            chainActive.FindEarliestAtLeast(startTime - TIMESTAMP_WINDOW);
        LogPrintf("%s: Rescanning last %i blocks\n", __func__,
                  startBlock ? chainActive.Height() - startBlock->nHeight + 1
                             : 0);
    }

    if (startBlock) {
        const CBlockIndex *const failedBlock =
            ScanForWalletTransactions(startBlock, nullptr, reserver, update);
        if (failedBlock) {
            return failedBlock->GetBlockTimeMax() + TIMESTAMP_WINDOW + 1;
        }
    }
    return startTime;
}

/**
 * Scan the block chain (starting in pindexStart) for transactions from or to
 * us. If fUpdate is true, found transactions that already exist in the wallet
 * will be updated.
 *
 * Returns null if scan was successful. Otherwise, if a complete rescan was not
 * possible (due to pruning or corruption), returns pointer to the most recent
 * block that could not be scanned.
 *
 * If pindexStop is not a nullptr, the scan will stop at the block-index
 * defined by pindexStop
 *
 * Caller needs to make sure pindexStop (and the optional pindexStart) are on
 * the main chain after to the addition of any new keys you want to detect
 * transactions for.
 */
CBlockIndex *CWallet::ScanForWalletTransactions(
    CBlockIndex *pindexStart, CBlockIndex *pindexStop,
    const WalletRescanReserver &reserver, bool fUpdate) {
    int64_t nNow = GetTime();

    assert(reserver.isReserved());
    if (pindexStop) {
        assert(pindexStop->nHeight >= pindexStart->nHeight);
    }

    CBlockIndex *pindex = pindexStart;
    CBlockIndex *ret = nullptr;
    {
        fAbortRescan = false;

        // Show rescan progress in GUI as dialog or on splashscreen, if -rescan
        // on startup.
        ShowProgress(_("Rescanning..."), 0);
        CBlockIndex *tip = nullptr;
        double dProgressStart;
        double dProgressTip;
        {
            LOCK(cs_main);
            tip = chainActive.Tip();
            dProgressStart =
                GuessVerificationProgress(chainParams.TxData(), pindex);
            dProgressTip = GuessVerificationProgress(chainParams.TxData(), tip);
        }
        double gvp = dProgressStart;
        while (pindex && !fAbortRescan) {
            if (pindex->nHeight % 100 == 0 &&
                dProgressTip - dProgressStart > 0.0) {
                ShowProgress(
                    _("Rescanning..."),
                    std::max(
                        1, std::min(99, (int)((gvp - dProgressStart) /
                                              (dProgressTip - dProgressStart) *
                                              100))));
            }
            if (GetTime() >= nNow + 60) {
                nNow = GetTime();
                LogPrintf("Still rescanning. At block %d. Progress=%f\n",
                          pindex->nHeight, gvp);
            }

            CBlock block;
            if (ReadBlockFromDisk(block, pindex, GetConfig())) {
                LOCK2(cs_main, cs_wallet);
                if (pindex && !chainActive.Contains(pindex)) {
                    // Abort scan if current block is no longer active, to
                    // prevent marking transactions as coming from the wrong
                    // block.
                    ret = pindex;
                    break;
                }
                for (size_t posInBlock = 0; posInBlock < block.vtx.size();
                     ++posInBlock) {
                    AddToWalletIfInvolvingMe(block.vtx[posInBlock], pindex,
                                             posInBlock, fUpdate);
                }
            } else {
                ret = pindex;
            }
            if (pindex == pindexStop) {
                break;
            }
            {
                LOCK(cs_main);
                pindex = chainActive.Next(pindex);
                gvp = GuessVerificationProgress(chainParams.TxData(), pindex);
                if (tip != chainActive.Tip()) {
                    tip = chainActive.Tip();
                    // in case the tip has changed, update progress max
                    dProgressTip =
                        GuessVerificationProgress(chainParams.TxData(), tip);
                }
            }
        }

        if (pindex && fAbortRescan) {
            LogPrintf("Rescan aborted at block %d. Progress=%f\n",
                      pindex->nHeight, gvp);
        }

        // Hide progress dialog in GUI.
        ShowProgress(_("Rescanning..."), 100);
    }
    return ret;
}

void CWallet::ReacceptWalletTransactions() {
    // If transactions aren't being broadcasted, don't let them into local
    // mempool either.
    if (!fBroadcastTransactions) {
        return;
    }

    LOCK2(cs_main, cs_wallet);
    std::map<int64_t, CWalletTx *> mapSorted;

    // Sort pending wallet transactions based on their initial wallet insertion
    // order.
    for (std::pair<const TxId, CWalletTx> &item : mapWallet) {
        const TxId &wtxid = item.first;
        CWalletTx &wtx = item.second;
        assert(wtx.GetId() == wtxid);

        int nDepth = wtx.GetDepthInMainChain();

        if (!wtx.IsCoinBase() && (nDepth == 0 && !wtx.isAbandoned())) {
            mapSorted.insert(std::make_pair(wtx.nOrderPos, &wtx));
        }
    }

    // Try to add wallet transactions to memory pool.
    for (std::pair<const int64_t, CWalletTx *> &item : mapSorted) {
        CWalletTx &wtx = *(item.second);
        CValidationState state;
        wtx.AcceptToMemoryPool(maxTxFee, state);
    }
}

bool CWalletTx::RelayWalletTransaction(CConnman *connman) {
    assert(pwallet->GetBroadcastTransactions());
    if (IsCoinBase() || isAbandoned() || GetDepthInMainChain() != 0) {
        return false;
    }

    CValidationState state;
    // GetDepthInMainChain already catches known conflicts.
    if (InMempool() || AcceptToMemoryPool(maxTxFee, state)) {
        LogPrintf("Relaying wtx %s\n", GetId().ToString());
        if (connman) {
            CInv inv(MSG_TX, GetId());
            connman->ForEachNode(
                [&inv](CNode *pnode) { pnode->PushInventory(inv); });
            return true;
        }
    }

    return false;
}

std::set<TxId> CWalletTx::GetConflicts() const {
    std::set<TxId> result;
    if (pwallet != nullptr) {
        const TxId &txid = GetId();
        result = pwallet->GetConflicts(txid);
        result.erase(txid);
    }

    return result;
}

Amount CWalletTx::GetDebit(const isminefilter &filter) const {
    if (tx->vin.empty()) {
        return Amount::zero();
    }

    Amount debit = Amount::zero();
    if (filter & ISMINE_SPENDABLE) {
        if (fDebitCached) {
            debit += nDebitCached;
        } else {
            nDebitCached = pwallet->GetDebit(*tx, ISMINE_SPENDABLE);
            fDebitCached = true;
            debit += nDebitCached;
        }
    }

    if (filter & ISMINE_WATCH_ONLY) {
        if (fWatchDebitCached) {
            debit += nWatchDebitCached;
        } else {
            nWatchDebitCached = pwallet->GetDebit(*tx, ISMINE_WATCH_ONLY);
            fWatchDebitCached = true;
            debit += Amount(nWatchDebitCached);
        }
    }

    return debit;
}

Amount CWalletTx::GetCredit(const isminefilter &filter) const {
    // Must wait until coinbase is safely deep enough in the chain before
    // valuing it.
    if (IsImmatureCoinBase()) {
        return Amount::zero();
    }

    Amount credit = Amount::zero();
    if (filter & ISMINE_SPENDABLE) {
        // GetBalance can assume transactions in mapWallet won't change.
        if (fCreditCached) {
            credit += nCreditCached;
        } else {
            nCreditCached = pwallet->GetCredit(*tx, ISMINE_SPENDABLE);
            fCreditCached = true;
            credit += nCreditCached;
        }
    }

    if (filter & ISMINE_WATCH_ONLY) {
        if (fWatchCreditCached) {
            credit += nWatchCreditCached;
        } else {
            nWatchCreditCached = pwallet->GetCredit(*tx, ISMINE_WATCH_ONLY);
            fWatchCreditCached = true;
            credit += nWatchCreditCached;
        }
    }

    return credit;
}

Amount CWalletTx::GetImmatureCredit(bool fUseCache) const {
    if (IsImmatureCoinBase() && IsInMainChain()) {
        if (fUseCache && fImmatureCreditCached) {
            return nImmatureCreditCached;
        }

        nImmatureCreditCached = pwallet->GetCredit(*tx, ISMINE_SPENDABLE);
        fImmatureCreditCached = true;
        return nImmatureCreditCached;
    }

    return Amount::zero();
}

Amount CWalletTx::GetAvailableCredit(bool fUseCache) const {
    if (pwallet == nullptr) {
        return Amount::zero();
    }

    // Must wait until coinbase is safely deep enough in the chain before
    // valuing it.
    if (IsImmatureCoinBase()) {
        return Amount::zero();
    }

    if (fUseCache && fAvailableCreditCached) {
        return nAvailableCreditCached;
    }

    Amount nCredit = Amount::zero();
    const TxId &txid = GetId();
    for (uint32_t i = 0; i < tx->vout.size(); i++) {
        if (!pwallet->IsSpent(COutPoint(txid, i))) {
            const CTxOut &txout = tx->vout[i];
            nCredit += pwallet->GetCredit(txout, ISMINE_SPENDABLE);
            if (!MoneyRange(nCredit)) {
                throw std::runtime_error(std::string(__func__) +
                                         " : value out of range");
            }
        }
    }

    nAvailableCreditCached = nCredit;
    fAvailableCreditCached = true;
    return nCredit;
}

Amount CWalletTx::GetImmatureWatchOnlyCredit(const bool fUseCache) const {
    if (IsImmatureCoinBase() && IsInMainChain()) {
        if (fUseCache && fImmatureWatchCreditCached) {
            return nImmatureWatchCreditCached;
        }

        nImmatureWatchCreditCached = pwallet->GetCredit(*tx, ISMINE_WATCH_ONLY);
        fImmatureWatchCreditCached = true;
        return nImmatureWatchCreditCached;
    }

    return Amount::zero();
}

Amount CWalletTx::GetAvailableWatchOnlyCredit(const bool fUseCache) const {
    if (pwallet == nullptr) {
        return Amount::zero();
    }

    // Must wait until coinbase is safely deep enough in the chain before
    // valuing it.
    if (IsCoinBase() && GetBlocksToMaturity() > 0) {
        return Amount::zero();
    }

    if (fUseCache && fAvailableWatchCreditCached) {
        return nAvailableWatchCreditCached;
    }

    Amount nCredit = Amount::zero();
    const TxId &txid = GetId();
    for (uint32_t i = 0; i < tx->vout.size(); i++) {
        if (!pwallet->IsSpent(COutPoint(txid, i))) {
            const CTxOut &txout = tx->vout[i];
            nCredit += pwallet->GetCredit(txout, ISMINE_WATCH_ONLY);
            if (!MoneyRange(nCredit)) {
                throw std::runtime_error(std::string(__func__) +
                                         ": value out of range");
            }
        }
    }

    nAvailableWatchCreditCached = nCredit;
    fAvailableWatchCreditCached = true;
    return nCredit;
}

Amount CWalletTx::GetChange() const {
    if (fChangeCached) {
        return nChangeCached;
    }

    nChangeCached = pwallet->GetChange(*tx);
    fChangeCached = true;
    return nChangeCached;
}

bool CWalletTx::InMempool() const {
    return fInMempool;
}

bool CWalletTx::IsTrusted() const {
    // Quick answer in most cases
    if (!CheckFinalTx(*tx)) {
        return false;
    }

    int nDepth = GetDepthInMainChain();
    if (nDepth >= 1) {
        return true;
    }

    if (nDepth < 0) {
        return false;
    }

    // using wtx's cached debit
    if (!pwallet->m_spend_zero_conf_change || !IsFromMe(ISMINE_ALL)) {
        return false;
    }

    // Don't trust unconfirmed transactions from us unless they are in the
    // mempool.
    if (!InMempool()) {
        return false;
    }

    // Trusted if all inputs are from us and are in the mempool:
    for (const CTxIn &txin : tx->vin) {
        // Transactions not sent by us: not trusted
        const CWalletTx *parent = pwallet->GetWalletTx(txin.prevout.GetTxId());
        if (parent == nullptr) {
            return false;
        }

        const CTxOut &parentOut = parent->tx->vout[txin.prevout.GetN()];
        if (pwallet->IsMine(parentOut) != ISMINE_SPENDABLE) {
            return false;
        }
    }

    return true;
}

bool CWalletTx::IsEquivalentTo(const CWalletTx &_tx) const {
    CMutableTransaction tx1{*this->tx};
    CMutableTransaction tx2{*_tx.tx};
    for (auto &txin : tx1.vin) {
        txin.scriptSig = CScript();
    }

    for (auto &txin : tx2.vin) {
        txin.scriptSig = CScript();
    }

    return CTransaction(tx1) == CTransaction(tx2);
}

std::vector<uint256>
CWallet::ResendWalletTransactionsBefore(int64_t nTime, CConnman *connman) {
    std::vector<uint256> result;

    LOCK(cs_wallet);

    // Sort them in chronological order
    std::multimap<unsigned int, CWalletTx *> mapSorted;
    for (std::pair<const TxId, CWalletTx> &item : mapWallet) {
        CWalletTx &wtx = item.second;
        // Don't rebroadcast if newer than nTime:
        if (wtx.nTimeReceived > nTime) {
            continue;
        }

        mapSorted.insert(std::make_pair(wtx.nTimeReceived, &wtx));
    }

    for (std::pair<const unsigned int, CWalletTx *> &item : mapSorted) {
        CWalletTx &wtx = *item.second;
        if (wtx.RelayWalletTransaction(connman)) {
            result.push_back(wtx.GetId());
        }
    }

    return result;
}

void CWallet::ResendWalletTransactions(int64_t nBestBlockTime,
                                       CConnman *connman) {
    // Do this infrequently and randomly to avoid giving away that these are our
    // transactions.
    if (GetTime() < nNextResend || !fBroadcastTransactions) {
        return;
    }

    bool fFirst = (nNextResend == 0);
    nNextResend = GetTime() + GetRand(30 * 60);
    if (fFirst) {
        return;
    }

    // Only do it if there's been a new block since last time
    if (nBestBlockTime < nLastResend) {
        return;
    }

    nLastResend = GetTime();

    // Rebroadcast unconfirmed txes older than 5 minutes before the last block
    // was found:
    std::vector<uint256> relayed =
        ResendWalletTransactionsBefore(nBestBlockTime - 5 * 60, connman);
    if (!relayed.empty()) {
        LogPrintf("%s: rebroadcast %u unconfirmed transactions\n", __func__,
                  relayed.size());
    }
}

/** @} */ // end of mapWallet

/**
 * @defgroup Actions
 *
 * @{
 */
Amount CWallet::GetBalance() const {
    LOCK2(cs_main, cs_wallet);

    Amount nTotal = Amount::zero();
    for (const auto &entry : mapWallet) {
        const CWalletTx *pcoin = &entry.second;
        if (pcoin->IsTrusted()) {
            nTotal += pcoin->GetAvailableCredit();
        }
    }

    return nTotal;
}

Amount CWallet::GetUnconfirmedBalance() const {
    LOCK2(cs_main, cs_wallet);

    Amount nTotal = Amount::zero();
    for (const auto &entry : mapWallet) {
        const CWalletTx *pcoin = &entry.second;
        if (!pcoin->IsTrusted() && pcoin->GetDepthInMainChain() == 0 &&
            pcoin->InMempool()) {
            nTotal += pcoin->GetAvailableCredit();
        }
    }

    return nTotal;
}

Amount CWallet::GetImmatureBalance() const {
    LOCK2(cs_main, cs_wallet);

    Amount nTotal = Amount::zero();
    for (const auto &entry : mapWallet) {
        const CWalletTx *pcoin = &entry.second;
        nTotal += pcoin->GetImmatureCredit();
    }

    return nTotal;
}

Amount CWallet::GetWatchOnlyBalance() const {
    LOCK2(cs_main, cs_wallet);

    Amount nTotal = Amount::zero();
    for (const auto &entry : mapWallet) {
        const CWalletTx *pcoin = &entry.second;
        if (pcoin->IsTrusted()) {
            nTotal += pcoin->GetAvailableWatchOnlyCredit();
        }
    }

    return nTotal;
}

Amount CWallet::GetUnconfirmedWatchOnlyBalance() const {
    LOCK2(cs_main, cs_wallet);

    Amount nTotal = Amount::zero();
    for (const auto &entry : mapWallet) {
        const CWalletTx *pcoin = &entry.second;
        if (!pcoin->IsTrusted() && pcoin->GetDepthInMainChain() == 0 &&
            pcoin->InMempool()) {
            nTotal += pcoin->GetAvailableWatchOnlyCredit();
        }
    }

    return nTotal;
}

Amount CWallet::GetImmatureWatchOnlyBalance() const {
    LOCK2(cs_main, cs_wallet);

    Amount nTotal = Amount::zero();
    for (const auto &entry : mapWallet) {
        const CWalletTx *pcoin = &entry.second;
        nTotal += pcoin->GetImmatureWatchOnlyCredit();
    }

    return nTotal;
}

// Calculate total balance in a different way from GetBalance. The biggest
// difference is that GetBalance sums up all unspent TxOuts paying to the
// wallet, while this sums up both spent and unspent TxOuts paying to the
// wallet, and then subtracts the values of TxIns spending from the wallet. This
// also has fewer restrictions on which unconfirmed transactions are considered
// trusted.
Amount CWallet::GetLegacyBalance(const isminefilter &filter, int minDepth,
                                 const std::string *account) const {
    LOCK2(cs_main, cs_wallet);

    Amount balance = Amount::zero();
    for (const auto &entry : mapWallet) {
        const CWalletTx &wtx = entry.second;
        const int depth = wtx.GetDepthInMainChain();
        if (depth < 0 || !CheckFinalTx(*wtx.tx) || wtx.IsImmatureCoinBase()) {

            continue;
        }

        // Loop through tx outputs and add incoming payments. For outgoing txs,
        // treat change outputs specially, as part of the amount debited.
        Amount debit = wtx.GetDebit(filter);
        const bool outgoing = debit > Amount::zero();
        for (const CTxOut &out : wtx.tx->vout) {
            if (outgoing && IsChange(out)) {
                debit -= out.nValue;
            } else if (IsMine(out) & filter && depth >= minDepth &&
                       (!account ||
                        *account == GetLabelName(out.scriptPubKey))) {
                balance += out.nValue;
            }
        }

        // For outgoing txs, subtract amount debited.
        if (outgoing && (!account || *account == wtx.strFromAccount)) {
            balance -= debit;
        }
    }

    if (account) {
        balance += WalletBatch(*database).GetAccountCreditDebit(*account);
    }

    return balance;
}

Amount CWallet::GetAvailableBalance(const CCoinControl *coinControl) const {
    LOCK2(cs_main, cs_wallet);

    Amount balance = Amount::zero();
    std::vector<COutput> vCoins;
    AvailableCoins(vCoins, true, coinControl);
    for (const COutput &out : vCoins) {
        if (out.fSpendable) {
            balance += out.tx->tx->vout[out.i].nValue;
        }
    }
    return balance;
}

void CWallet::AvailableCoins(std::vector<COutput> &vCoins, bool fOnlySafe,
                             const CCoinControl *coinControl,
                             const Amount nMinimumAmount,
                             const Amount nMaximumAmount,
                             const Amount nMinimumSumAmount,
                             const uint64_t nMaximumCount, const int nMinDepth,
                             const int nMaxDepth) const {
    AssertLockHeld(cs_main);
    AssertLockHeld(cs_wallet);

    vCoins.clear();
    Amount nTotal = Amount::zero();

    for (const auto &entry : mapWallet) {
        const TxId &wtxid = entry.first;
        const CWalletTx *pcoin = &entry.second;

        if (!CheckFinalTx(*pcoin->tx)) {
            continue;
        }

        if (pcoin->IsImmatureCoinBase()) {
            continue;
        }

        int nDepth = pcoin->GetDepthInMainChain();
        if (nDepth < 0) {
            continue;
        }

        // We should not consider coins which aren't at least in our mempool.
        // It's possible for these to be conflicted via ancestors which we may
        // never be able to detect.
        if (nDepth == 0 && !pcoin->InMempool()) {
            continue;
        }

        bool safeTx = pcoin->IsTrusted();

        // Bitcoin-ABC: Removed check that prevents consideration of coins from
        // transactions that are replacing other transactions. This check based
        // on pcoin->mapValue.count("replaces_txid") which was not being set
        // anywhere.

        // Similarly, we should not consider coins from transactions that have
        // been replaced. In the example above, we would want to prevent
        // creation of a transaction A' spending an output of A, because if
        // transaction B were initially confirmed, conflicting with A and A', we
        // wouldn't want to the user to create a transaction D intending to
        // replace A', but potentially resulting in a scenario where A, A', and
        // D could all be accepted (instead of just B and D, or just A and A'
        // like the user would want).

        // Bitcoin-ABC: retained this check as 'replaced_by_txid' is still set
        // in the wallet code.
        if (nDepth == 0 && pcoin->mapValue.count("replaced_by_txid")) {
            safeTx = false;
        }

        if (fOnlySafe && !safeTx) {
            continue;
        }

        if (nDepth < nMinDepth || nDepth > nMaxDepth) {
            continue;
        }

        for (uint32_t i = 0; i < pcoin->tx->vout.size(); i++) {
            if (pcoin->tx->vout[i].nValue < nMinimumAmount ||
                pcoin->tx->vout[i].nValue > nMaximumAmount) {
                continue;
            }

            const COutPoint outpoint(wtxid, i);

            if (coinControl && coinControl->HasSelected() &&
                !coinControl->fAllowOtherInputs &&
                !coinControl->IsSelected(outpoint)) {
                continue;
            }

            if (IsLockedCoin(outpoint)) {
                continue;
            }

            if (IsSpent(outpoint)) {
                continue;
            }

            isminetype mine = IsMine(pcoin->tx->vout[i]);

            if (mine == ISMINE_NO) {
                continue;
            }

            bool fSpendableIn = ((mine & ISMINE_SPENDABLE) != ISMINE_NO) ||
                                (coinControl && coinControl->fAllowWatchOnly &&
                                 (mine & ISMINE_WATCH_SOLVABLE) != ISMINE_NO);
            bool fSolvableIn =
                (mine & (ISMINE_SPENDABLE | ISMINE_WATCH_SOLVABLE)) !=
                ISMINE_NO;

            vCoins.push_back(
                COutput(pcoin, i, nDepth, fSpendableIn, fSolvableIn, safeTx));

            // Checks the sum amount of all UTXO's.
            if (nMinimumSumAmount != MAX_MONEY) {
                nTotal += pcoin->tx->vout[i].nValue;

                if (nTotal >= nMinimumSumAmount) {
                    return;
                }
            }

            // Checks the maximum number of UTXO's.
            if (nMaximumCount > 0 && vCoins.size() >= nMaximumCount) {
                return;
            }
        }
    }
}

std::map<CTxDestination, std::vector<COutput>> CWallet::ListCoins() const {
    // TODO: Add AssertLockHeld(cs_wallet) here.
    //
    // Because the return value from this function contains pointers to
    // CWalletTx objects, callers to this function really should acquire the
    // cs_wallet lock before calling it. However, the current caller doesn't
    // acquire this lock yet. There was an attempt to add the missing lock in
    // https://github.com/bitcoin/bitcoin/pull/10340, but that change has been
    // postponed until after https://github.com/bitcoin/bitcoin/pull/10244 to
    // avoid adding some extra complexity to the Qt code.

    std::map<CTxDestination, std::vector<COutput>> result;
    std::vector<COutput> availableCoins;

    LOCK2(cs_main, cs_wallet);
    AvailableCoins(availableCoins);

    for (auto &coin : availableCoins) {
        CTxDestination address;
        if (coin.fSpendable &&
            ExtractDestination(
                FindNonChangeParentOutput(*coin.tx->tx, coin.i).scriptPubKey,
                address)) {
            result[address].emplace_back(std::move(coin));
        }
    }

    std::vector<COutPoint> lockedCoins;
    ListLockedCoins(lockedCoins);
    for (const auto &output : lockedCoins) {
        auto it = mapWallet.find(output.GetTxId());
        if (it != mapWallet.end()) {
            int depth = it->second.GetDepthInMainChain();
            if (depth >= 0 && output.GetN() < it->second.tx->vout.size() &&
                IsMine(it->second.tx->vout[output.GetN()]) ==
                    ISMINE_SPENDABLE) {
                CTxDestination address;
                if (ExtractDestination(
                        FindNonChangeParentOutput(*it->second.tx, output.GetN())
                            .scriptPubKey,
                        address)) {
                    result[address].emplace_back(
                        &it->second, output.GetN(), depth, true /* spendable */,
                        true /* solvable */, false /* safe */);
                }
            }
        }
    }

    return result;
}

const CTxOut &CWallet::FindNonChangeParentOutput(const CTransaction &tx,
                                                 int output) const {
    const CTransaction *ptx = &tx;
    int n = output;
    while (IsChange(ptx->vout[n]) && ptx->vin.size() > 0) {
        const COutPoint &prevout = ptx->vin[0].prevout;
        auto it = mapWallet.find(prevout.GetTxId());
        if (it == mapWallet.end() ||
            it->second.tx->vout.size() <= prevout.GetN() ||
            !IsMine(it->second.tx->vout[prevout.GetN()])) {
            break;
        }
        ptx = it->second.tx.get();
        n = prevout.GetN();
    }
    return ptx->vout[n];
}

bool CWallet::SelectCoinsMinConf(
    const Amount nTargetValue, const CoinEligibilityFilter &eligibility_filter,
    std::vector<OutputGroup> groups, std::set<CInputCoin> &setCoinsRet,
    Amount &nValueRet, const CoinSelectionParams &coin_selection_params,
    bool &bnb_used) const {
    setCoinsRet.clear();
    nValueRet = Amount::zero();

    std::vector<OutputGroup> utxo_pool;
    if (coin_selection_params.use_bnb) {
        // Get long term estimate
        CCoinControl temp;
        temp.m_confirm_target = 1008;
        CFeeRate long_term_feerate = GetMinimumFeeRate(*this, temp, g_mempool);

        // Calculate cost of change
        Amount cost_of_change =
            dustRelayFee.GetFee(coin_selection_params.change_spend_size) +
            coin_selection_params.effective_fee.GetFee(
                coin_selection_params.change_output_size);

        // Filter by the min conf specs and add to utxo_pool and calculate
        // effective value
        for (OutputGroup &group : groups) {
            if (!group.EligibleForSpending(eligibility_filter)) {
                continue;
            }

            group.fee = Amount::zero();
            group.long_term_fee = Amount::zero();
            group.effective_value = Amount::zero();
            for (auto it = group.m_outputs.begin();
                 it != group.m_outputs.end();) {
                const CInputCoin &coin = *it;
                Amount effective_value =
                    coin.txout.nValue -
                    (coin.m_input_bytes < 0
                         ? Amount::zero()
                         : coin_selection_params.effective_fee.GetFee(
                               coin.m_input_bytes));
                // Only include outputs that are positive effective value (i.e.
                // not dust)
                if (effective_value > Amount::zero()) {
                    group.fee +=
                        coin.m_input_bytes < 0
                            ? Amount::zero()
                            : coin_selection_params.effective_fee.GetFee(
                                  coin.m_input_bytes);
                    group.long_term_fee +=
                        coin.m_input_bytes < 0
                            ? Amount::zero()
                            : long_term_feerate.GetFee(coin.m_input_bytes);
                    group.effective_value += effective_value;
                    ++it;
                } else {
                    it = group.Discard(coin);
                }
            }
            if (group.effective_value > Amount::zero()) {
                utxo_pool.push_back(group);
            }
        }
        // Calculate the fees for things that aren't inputs
        Amount not_input_fees = coin_selection_params.effective_fee.GetFee(
            coin_selection_params.tx_noinputs_size);
        bnb_used = true;
        return SelectCoinsBnB(utxo_pool, nTargetValue, cost_of_change,
                              setCoinsRet, nValueRet, not_input_fees);
    } else {
        // Filter by the min conf specs and add to utxo_pool
        for (const OutputGroup &group : groups) {
            if (!group.EligibleForSpending(eligibility_filter)) {
                continue;
            }
            utxo_pool.push_back(group);
        }
        bnb_used = false;
        return KnapsackSolver(nTargetValue, utxo_pool, setCoinsRet, nValueRet);
    }
}

bool CWallet::SelectCoins(const std::vector<COutput> &vAvailableCoins,
                          const Amount nTargetValue,
                          std::set<CInputCoin> &setCoinsRet, Amount &nValueRet,
                          const CCoinControl &coin_control,
                          CoinSelectionParams &coin_selection_params,
                          bool &bnb_used) const {
    std::vector<COutput> vCoins(vAvailableCoins);

    // coin control -> return all selected outputs (we want all selected to go
    // into the transaction for sure)
    if (coin_control.HasSelected() && !coin_control.fAllowOtherInputs) {
        // We didn't use BnB here, so set it to false.
        bnb_used = false;

        for (const COutput &out : vCoins) {
            if (!out.fSpendable) {
                continue;
            }

            nValueRet += out.tx->tx->vout[out.i].nValue;
            setCoinsRet.insert(out.GetInputCoin());
        }

        return (nValueRet >= nTargetValue);
    }

    // Calculate value from preset inputs and store them.
    std::set<CInputCoin> setPresetCoins;
    Amount nValueFromPresetInputs = Amount::zero();

    std::vector<COutPoint> vPresetInputs;
    coin_control.ListSelected(vPresetInputs);

    for (const COutPoint &outpoint : vPresetInputs) {
        // For now, don't use BnB if preset inputs are selected. TODO: Enable
        // this later
        bnb_used = false;
        coin_selection_params.use_bnb = false;

        std::map<TxId, CWalletTx>::const_iterator it =
            mapWallet.find(outpoint.GetTxId());
        if (it == mapWallet.end()) {
            // TODO: Allow non-wallet inputs
            return false;
        }

        const CWalletTx *pcoin = &it->second;
        // Clearly invalid input, fail.
        if (pcoin->tx->vout.size() <= outpoint.GetN()) {
            return false;
        }

        // Just to calculate the marginal byte size
        nValueFromPresetInputs += pcoin->tx->vout[outpoint.GetN()].nValue;
        setPresetCoins.insert(CInputCoin(pcoin->tx, outpoint.GetN()));
    }

    // Remove preset inputs from vCoins
    for (std::vector<COutput>::iterator it = vCoins.begin();
         it != vCoins.end() && coin_control.HasSelected();) {
        if (setPresetCoins.count(it->GetInputCoin())) {
            it = vCoins.erase(it);
        } else {
            ++it;
        }
    }

    // form groups from remaining coins; note that preset coins will not
    // automatically have their associated (same address) coins included
    if (coin_control.m_avoid_partial_spends &&
        vCoins.size() > OUTPUT_GROUP_MAX_ENTRIES) {
        // Cases where we have 11+ outputs all pointing to the same destination
        // may result in privacy leaks as they will potentially be
        // deterministically sorted. We solve that by explicitly shuffling the
        // outputs before processing
        Shuffle(vCoins.begin(), vCoins.end(), FastRandomContext());
    }
    std::vector<OutputGroup> groups =
        GroupOutputs(vCoins, !coin_control.m_avoid_partial_spends);

    size_t max_ancestors = std::max<size_t>(
        1, gArgs.GetArg("-limitancestorcount", DEFAULT_ANCESTOR_LIMIT));
    size_t max_descendants = std::max<size_t>(
        1, gArgs.GetArg("-limitdescendantcount", DEFAULT_DESCENDANT_LIMIT));
    bool fRejectLongChains = gArgs.GetBoolArg(
        "-walletrejectlongchains", DEFAULT_WALLET_REJECT_LONG_CHAINS);

    bool res =
        nTargetValue <= nValueFromPresetInputs ||
        SelectCoinsMinConf(nTargetValue - nValueFromPresetInputs,
                           CoinEligibilityFilter(1, 6, 0), groups, setCoinsRet,
                           nValueRet, coin_selection_params, bnb_used) ||
        SelectCoinsMinConf(nTargetValue - nValueFromPresetInputs,
                           CoinEligibilityFilter(1, 1, 0), groups, setCoinsRet,
                           nValueRet, coin_selection_params, bnb_used) ||
        (m_spend_zero_conf_change &&
         SelectCoinsMinConf(nTargetValue - nValueFromPresetInputs,
                            CoinEligibilityFilter(0, 1, 2), groups, setCoinsRet,
                            nValueRet, coin_selection_params, bnb_used)) ||
        (m_spend_zero_conf_change &&
         SelectCoinsMinConf(
             nTargetValue - nValueFromPresetInputs,
             CoinEligibilityFilter(0, 1, std::min<size_t>(4, max_ancestors / 3),
                                   std::min<size_t>(4, max_descendants / 3)),
             groups, setCoinsRet, nValueRet, coin_selection_params,
             bnb_used)) ||
        (m_spend_zero_conf_change &&
         SelectCoinsMinConf(nTargetValue - nValueFromPresetInputs,
                            CoinEligibilityFilter(0, 1, max_ancestors / 2,
                                                  max_descendants / 2),
                            groups, setCoinsRet, nValueRet,
                            coin_selection_params, bnb_used)) ||
        (m_spend_zero_conf_change &&
         SelectCoinsMinConf(nTargetValue - nValueFromPresetInputs,
                            CoinEligibilityFilter(0, 1, max_ancestors - 1,
                                                  max_descendants - 1),
                            groups, setCoinsRet, nValueRet,
                            coin_selection_params, bnb_used)) ||
        (m_spend_zero_conf_change && !fRejectLongChains &&
         SelectCoinsMinConf(
             nTargetValue - nValueFromPresetInputs,
             CoinEligibilityFilter(0, 1, std::numeric_limits<uint64_t>::max()),
             groups, setCoinsRet, nValueRet, coin_selection_params, bnb_used));

    // Because SelectCoinsMinConf clears the setCoinsRet, we now add the
    // possible inputs to the coinset.
    util::insert(setCoinsRet, setPresetCoins);

    // Add preset inputs to the total value selected.
    nValueRet += nValueFromPresetInputs;

    return res;
}

bool CWallet::SignTransaction(CMutableTransaction &tx) {
    // sign the new tx
    CTransaction txNewConst(tx);
    int nIn = 0;
    for (const auto &input : tx.vin) {
        auto mi = mapWallet.find(input.prevout.GetTxId());
        if (mi == mapWallet.end() ||
            input.prevout.GetN() >= mi->second.tx->vout.size()) {
            return false;
        }
        const CScript &scriptPubKey =
            mi->second.tx->vout[input.prevout.GetN()].scriptPubKey;
        const Amount amount = mi->second.tx->vout[input.prevout.GetN()].nValue;
        SignatureData sigdata;
        SigHashType sigHashType = SigHashType().withForkId();
        if (!ProduceSignature(TransactionSignatureCreator(
                                  this, &txNewConst, nIn, amount, sigHashType),
                              scriptPubKey, sigdata)) {
            return false;
        }
        UpdateTransaction(tx, nIn, sigdata);
        nIn++;
    }
    return true;
}

bool CWallet::FundTransaction(CMutableTransaction &tx, Amount &nFeeRet,
                              int &nChangePosInOut, std::string &strFailReason,
                              bool lockUnspents,
                              const std::set<int> &setSubtractFeeFromOutputs,
                              CCoinControl coinControl, bool keepReserveKey) {
    std::vector<CRecipient> vecSend;

    // Turn the txout set into a CRecipient vector.
    for (size_t idx = 0; idx < tx.vout.size(); idx++) {
        const CTxOut &txOut = tx.vout[idx];
        CRecipient recipient = {txOut.scriptPubKey, txOut.nValue,
                                setSubtractFeeFromOutputs.count(idx) == 1};
        vecSend.push_back(recipient);
    }

    coinControl.fAllowOtherInputs = true;

    for (const CTxIn &txin : tx.vin) {
        coinControl.Select(txin.prevout);
    }

    // Acquire the locks to prevent races to the new locked unspents between the
    // CreateTransaction call and LockCoin calls (when lockUnspents is true).
    LOCK2(cs_main, cs_wallet);

    CReserveKey reservekey(this);
    CTransactionRef tx_new;
    if (!CreateTransaction(vecSend, tx_new, reservekey, nFeeRet,
                           nChangePosInOut, strFailReason, coinControl,
                           false)) {
        return false;
    }

    if (nChangePosInOut != -1) {
        tx.vout.insert(tx.vout.begin() + nChangePosInOut,
                       tx_new->vout[nChangePosInOut]);
        // We don't have the normal Create/Commit cycle, and don't want to
        // risk reusing change, so just remove the key from the keypool
        // here.
        if (!IsDeprecatedRPCEnabled(gArgs, "fundrawtransaction")) {
            reservekey.KeepKey();
        }
    }

    // Copy output sizes from new transaction; they may have had the fee
    // subtracted from them.
    for (size_t idx = 0; idx < tx.vout.size(); idx++) {
        tx.vout[idx].nValue = tx_new->vout[idx].nValue;
    }

    // Add new txins (keeping original txin scriptSig/order)
    for (const CTxIn &txin : tx_new->vin) {
        if (!coinControl.IsSelected(txin.prevout)) {
            tx.vin.push_back(txin);

            if (lockUnspents) {
                LockCoin(txin.prevout);
            }
        }
    }

    // DEPRECATED, remove in 0.20 with -reserveChangeKey
    // Optionally keep the change output key.
    if (IsDeprecatedRPCEnabled(gArgs, "fundrawtransaction")) {

        if (keepReserveKey) {
            reservekey.KeepKey();
        }
    }

    return true;
}

OutputType
CWallet::TransactionChangeType(OutputType change_type,
                               const std::vector<CRecipient> &vecSend) {
    // If -changetype is specified, always use that change type.
    if (change_type != OutputType::NONE) {
        return change_type;
    }

    // if m_default_address_type is legacy, use legacy address as change.
    if (m_default_address_type == OutputType::LEGACY) {
        return OutputType::LEGACY;
    }

    // else use m_default_address_type for change
    return m_default_address_type;
}

bool CWallet::CreateTransaction(const std::vector<CRecipient> &vecSend,
                                CTransactionRef &tx, CReserveKey &reservekey,
                                Amount &nFeeRet, int &nChangePosInOut,
                                std::string &strFailReason,
                                const CCoinControl &coinControl, bool sign) {
    Amount nValue = Amount::zero();
    int nChangePosRequest = nChangePosInOut;
    unsigned int nSubtractFeeFromAmount = 0;
    for (const auto &recipient : vecSend) {
        if (nValue < Amount::zero() || recipient.nAmount < Amount::zero()) {
            strFailReason = _("Transaction amounts must not be negative");
            return false;
        }

        nValue += recipient.nAmount;

        if (recipient.fSubtractFeeFromAmount) {
            nSubtractFeeFromAmount++;
        }
    }

    if (vecSend.empty()) {
        strFailReason = _("Transaction must have at least one recipient");
        return false;
    }

    CMutableTransaction txNew;

    // Discourage fee sniping.
    //
    // For a large miner the value of the transactions in the best block and the
    // mempool can exceed the cost of deliberately attempting to mine two blocks
    // to orphan the current best block. By setting nLockTime such that only the
    // next block can include the transaction, we discourage this practice as
    // the height restricted and limited blocksize gives miners considering fee
    // sniping fewer options for pulling off this attack.
    //
    // A simple way to think about this is from the wallet's point of view we
    // always want the blockchain to move forward. By setting nLockTime this way
    // we're basically making the statement that we only want this transaction
    // to appear in the next block; we don't want to potentially encourage
    // reorgs by allowing transactions to appear at lower heights than the next
    // block in forks of the best chain.
    //
    // Of course, the subsidy is high enough, and transaction volume low enough,
    // that fee sniping isn't a problem yet, but by implementing a fix now we
    // ensure code won't be written that makes assumptions about nLockTime that
    // preclude a fix later.
    txNew.nLockTime = chainActive.Height();

    // Secondly occasionally randomly pick a nLockTime even further back, so
    // that transactions that are delayed after signing for whatever reason,
    // e.g. high-latency mix networks and some CoinJoin implementations, have
    // better privacy.
    if (GetRandInt(10) == 0) {
        txNew.nLockTime = std::max(0, (int)txNew.nLockTime - GetRandInt(100));
    }

    assert(txNew.nLockTime <= (unsigned int)chainActive.Height());
    assert(txNew.nLockTime < LOCKTIME_THRESHOLD);

    {
        std::set<CInputCoin> setCoins;
        LOCK2(cs_main, cs_wallet);

        std::vector<COutput> vAvailableCoins;
        AvailableCoins(vAvailableCoins, true, &coinControl);
        // Parameters for coin selection, init with dummy
        CoinSelectionParams coin_selection_params;

        // Create change script that will be used if we need change
        // TODO: pass in scriptChange instead of reservekey so
        // change transaction isn't always pay-to-bitcoin-address
        CScript scriptChange;

        // coin control: send change to custom address
        if (!boost::get<CNoDestination>(&coinControl.destChange)) {
            scriptChange = GetScriptForDestination(coinControl.destChange);

            // no coin control: send change to newly generated address
        } else {
            // Note: We use a new key here to keep it from being obvious
            // which side is the change.
            //  The drawback is that by not reusing a previous key, the
            //  change may be lost if a backup is restored, if the backup
            //  doesn't have the new private key for the change. If we
            //  reused the old key, it would be possible to add code to look
            //  for and rediscover unknown transactions that were written
            //  with keys of ours to recover post-backup change.

            // Reserve a new key pair from key pool
            CPubKey vchPubKey;
            bool ret;
            ret = reservekey.GetReservedKey(vchPubKey, true);
            if (!ret) {
                strFailReason =
                    _("Keypool ran out, please call keypoolrefill first");
                return false;
            }

            const OutputType change_type = TransactionChangeType(
                coinControl.m_change_type ? *coinControl.m_change_type
                                          : m_default_change_type,
                vecSend);

            LearnRelatedScripts(vchPubKey, change_type);
            scriptChange = GetScriptForDestination(
                GetDestinationForKey(vchPubKey, change_type));
        }
        CTxOut change_prototype_txout(Amount::zero(), scriptChange);
        coin_selection_params.change_output_size =
            GetSerializeSize(change_prototype_txout, SER_DISK, 0);

        // Get the fee rate to use effective values in coin selection
        CFeeRate nFeeRateNeeded =
            GetMinimumFeeRate(*this, coinControl, g_mempool);

        nFeeRet = Amount::zero();
        bool pick_new_inputs = true;
        Amount nValueIn = Amount::zero();

        // BnB selector is the only selector used when this is true.
        // That should only happen on the first pass through the loop.
        // If we are doing subtract fee from recipient, then don't use BnB
        coin_selection_params.use_bnb = nSubtractFeeFromAmount == 0;
        // Start with no fee and loop until there is enough fee
        while (true) {
            nChangePosInOut = nChangePosRequest;
            txNew.vin.clear();
            txNew.vout.clear();
            bool fFirst = true;

            Amount nValueToSelect = nValue;
            if (nSubtractFeeFromAmount == 0) {
                nValueToSelect += nFeeRet;
            }

            // Static vsize overhead + outputs vsize. 4 nVersion, 4 nLocktime, 1
            // input count, 1 output count
            coin_selection_params.tx_noinputs_size = 10;
            // vouts to the payees
            for (const auto &recipient : vecSend) {
                CTxOut txout(recipient.nAmount, recipient.scriptPubKey);

                if (recipient.fSubtractFeeFromAmount) {
                    assert(nSubtractFeeFromAmount != 0);
                    // Subtract fee equally from each selected recipient.
                    txout.nValue -= nFeeRet / int(nSubtractFeeFromAmount);

                    // First receiver pays the remainder not divisible by output
                    // count.
                    if (fFirst) {
                        fFirst = false;
                        txout.nValue -= nFeeRet % int(nSubtractFeeFromAmount);
                    }
                }

                // Include the fee cost for outputs. Note this is only used for
                // BnB right now
                coin_selection_params.tx_noinputs_size +=
                    ::GetSerializeSize(txout, SER_NETWORK, PROTOCOL_VERSION);

                if (IsDust(txout, dustRelayFee)) {
                    if (recipient.fSubtractFeeFromAmount &&
                        nFeeRet > Amount::zero()) {
                        if (txout.nValue < Amount::zero()) {
                            strFailReason = _("The transaction amount is "
                                              "too small to pay the fee");
                        } else {
                            strFailReason =
                                _("The transaction amount is too small to "
                                  "send after the fee has been deducted");
                        }
                    } else {
                        strFailReason = _("Transaction amount too small");
                    }

                    return false;
                }

                txNew.vout.push_back(txout);
            }

            // Choose coins to use
            bool bnb_used;
            if (pick_new_inputs) {
                nValueIn = Amount::zero();
                setCoins.clear();
                coin_selection_params.change_spend_size =
                    CalculateMaximumSignedInputSize(change_prototype_txout,
                                                    this);
                coin_selection_params.effective_fee = nFeeRateNeeded;
                if (!SelectCoins(vAvailableCoins, nValueToSelect, setCoins,
                                 nValueIn, coinControl, coin_selection_params,
                                 bnb_used)) {
                    // If BnB was used, it was the first pass. No longer the
                    // first pass and continue loop with knapsack.
                    if (bnb_used) {
                        coin_selection_params.use_bnb = false;
                        continue;
                    } else {
                        strFailReason = _("Insufficient funds");
                        return false;
                    }
                }
            }

            const Amount nChange = nValueIn - nValueToSelect;
            if (nChange > Amount::zero()) {
                // Fill a vout to ourself.
                CTxOut newTxOut(nChange, scriptChange);

                // Never create dust outputs; if we would, just add the dust to
                // the fee.
                // The nChange when BnB is used is always going to go to fees.
                if (IsDust(newTxOut, dustRelayFee) || bnb_used) {
                    nChangePosInOut = -1;
                    nFeeRet += nChange;
                } else {
                    if (nChangePosInOut == -1) {
                        // Insert change txn at random position:
                        nChangePosInOut = GetRandInt(txNew.vout.size() + 1);
                    } else if ((unsigned int)nChangePosInOut >
                               txNew.vout.size()) {
                        strFailReason = _("Change index out of range");
                        return false;
                    }

                    std::vector<CTxOut>::iterator position =
                        txNew.vout.begin() + nChangePosInOut;
                    txNew.vout.insert(position, newTxOut);
                }
            } else {
                nChangePosInOut = -1;
            }

            // Dummy fill vin for maximum size estimation
            //
            for (const auto &coin : setCoins) {
                txNew.vin.push_back(CTxIn(coin.outpoint, CScript()));
            }

            CTransaction txNewConst(txNew);
            int nBytes = CalculateMaximumSignedTxSize(txNewConst, this);
            if (nBytes < 0) {
                strFailReason = _("Signing transaction failed");
                return false;
            }

            Amount nFeeNeeded =
                GetMinimumFee(*this, nBytes, coinControl, g_mempool);

            // If we made it here and we aren't even able to meet the relay fee
            // on the next pass, give up because we must be at the maximum
            // allowed fee.
            if (nFeeNeeded < ::minRelayTxFee.GetFee(nBytes)) {
                strFailReason = _("Transaction too large for fee policy");
                return false;
            }

            if (nFeeRet >= nFeeNeeded) {
                // Reduce fee to only the needed amount if possible. This
                // prevents potential overpayment in fees if the coins selected
                // to meet nFeeNeeded result in a transaction that requires less
                // fee than the prior iteration.

                // If we have no change and a big enough excess fee, then try to
                // construct transaction again only without picking new inputs.
                // We now know we only need the smaller fee (because of reduced
                // tx size) and so we should add a change output. Only try this
                // once.
                if (nChangePosInOut == -1 && nSubtractFeeFromAmount == 0 &&
                    pick_new_inputs) {
                    // Add 2 as a buffer in case increasing # of outputs changes
                    // compact size
                    unsigned int tx_size_with_change =
                        nBytes + coin_selection_params.change_output_size + 2;
                    Amount fee_needed_with_change = GetMinimumFee(
                        *this, tx_size_with_change, coinControl, g_mempool);
                    Amount minimum_value_for_change =
                        GetDustThreshold(change_prototype_txout, dustRelayFee);
                    if (nFeeRet >=
                        fee_needed_with_change + minimum_value_for_change) {
                        pick_new_inputs = false;
                        nFeeRet = fee_needed_with_change;
                        continue;
                    }
                }

                // If we have change output already, just increase it
                if (nFeeRet > nFeeNeeded && nChangePosInOut != -1 &&
                    nSubtractFeeFromAmount == 0) {
                    Amount extraFeePaid = nFeeRet - nFeeNeeded;
                    std::vector<CTxOut>::iterator change_position =
                        txNew.vout.begin() + nChangePosInOut;
                    change_position->nValue += extraFeePaid;
                    nFeeRet -= extraFeePaid;
                }

                // Done, enough fee included.
                break;
            } else if (!pick_new_inputs) {
                // This shouldn't happen, we should have had enough excess fee
                // to pay for the new output and still meet nFeeNeeded.
                // Or we should have just subtracted fee from recipients and
                // nFeeNeeded should not have changed.
                strFailReason =
                    _("Transaction fee and change calculation failed");
                return false;
            }

            // Try to reduce change to include necessary fee.
            if (nChangePosInOut != -1 && nSubtractFeeFromAmount == 0) {
                Amount additionalFeeNeeded = nFeeNeeded - nFeeRet;
                std::vector<CTxOut>::iterator change_position =
                    txNew.vout.begin() + nChangePosInOut;
                // Only reduce change if remaining amount is still a large
                // enough output.
                if (change_position->nValue >=
                    MIN_FINAL_CHANGE + additionalFeeNeeded) {
                    change_position->nValue -= additionalFeeNeeded;
                    nFeeRet += additionalFeeNeeded;
                    // Done, able to increase fee from change.
                    break;
                }
            }

            // If subtracting fee from recipients, we now know what fee we
            // need to subtract, we have no reason to reselect inputs.
            if (nSubtractFeeFromAmount > 0) {
                pick_new_inputs = false;
            }

            // Include more fee and try again.
            nFeeRet = nFeeNeeded;
            coin_selection_params.use_bnb = false;
            continue;
        }

        if (nChangePosInOut == -1) {
            // Return any reserved key if we don't have change
            reservekey.ReturnKey();
        }

        // Shuffle selected coins and fill in final vin
        txNew.vin.clear();
        std::vector<CInputCoin> selected_coins(setCoins.begin(),
                                               setCoins.end());
        Shuffle(selected_coins.begin(), selected_coins.end(),
                FastRandomContext());

        // Note how the sequence number is set to non-maxint so that
        // the nLockTime set above actually works.
        for (const auto &coin : selected_coins) {
            txNew.vin.push_back(
                CTxIn(coin.outpoint, CScript(),
                      std::numeric_limits<uint32_t>::max() - 1));
        }

        if (sign) {
            SigHashType sigHashType = SigHashType().withForkId();

            CTransaction txNewConst(txNew);
            int nIn = 0;
            for (const auto &coin : selected_coins) {
                const CScript &scriptPubKey = coin.txout.scriptPubKey;
                SignatureData sigdata;

                if (!ProduceSignature(TransactionSignatureCreator(
                                          this, &txNewConst, nIn,
                                          coin.txout.nValue, sigHashType),
                                      scriptPubKey, sigdata)) {
                    strFailReason = _("Signing transaction failed");
                    return false;
                }

                UpdateTransaction(txNew, nIn, sigdata);
                nIn++;
            }
        }

        // Return the constructed transaction data.
        tx = MakeTransactionRef(std::move(txNew));

        // Limit size.
        if (tx->GetTotalSize() >= MAX_STANDARD_TX_SIZE) {
            strFailReason = _("Transaction too large");
            return false;
        }
    }

    if (gArgs.GetBoolArg("-walletrejectlongchains",
                         DEFAULT_WALLET_REJECT_LONG_CHAINS)) {
        // Lastly, ensure this tx will pass the mempool's chain limits.
        LockPoints lp;
        CTxMemPoolEntry entry(tx, Amount::zero(), 0, 0, 0, Amount::zero(),
                              false, 0, lp);
        CTxMemPool::setEntries setAncestors;
        size_t nLimitAncestors =
            gArgs.GetArg("-limitancestorcount", DEFAULT_ANCESTOR_LIMIT);
        size_t nLimitAncestorSize =
            gArgs.GetArg("-limitancestorsize", DEFAULT_ANCESTOR_SIZE_LIMIT) *
            1000;
        size_t nLimitDescendants =
            gArgs.GetArg("-limitdescendantcount", DEFAULT_DESCENDANT_LIMIT);
        size_t nLimitDescendantSize =
            gArgs.GetArg("-limitdescendantsize",
                         DEFAULT_DESCENDANT_SIZE_LIMIT) *
            1000;
        std::string errString;
        if (!g_mempool.CalculateMemPoolAncestors(
                entry, setAncestors, nLimitAncestors, nLimitAncestorSize,
                nLimitDescendants, nLimitDescendantSize, errString)) {
            strFailReason = _("Transaction has too long of a mempool chain");
            return false;
        }
    }

    return true;
}

/**
 * Call after CreateTransaction unless you want to abort
 */
bool CWallet::CommitTransaction(
    CTransactionRef tx, mapValue_t mapValue,
    std::vector<std::pair<std::string, std::string>> orderForm,
    std::string fromAccount, CReserveKey &reservekey, CConnman *connman,
    CValidationState &state) {
    LOCK2(cs_main, cs_wallet);

    CWalletTx wtxNew(this, std::move(tx));
    wtxNew.mapValue = std::move(mapValue);
    wtxNew.vOrderForm = std::move(orderForm);
    wtxNew.strFromAccount = std::move(fromAccount);
    wtxNew.fTimeReceivedIsTxTime = true;
    wtxNew.fFromMe = true;

    LogPrintf("CommitTransaction:\n%s", wtxNew.tx->ToString());

    // Take key pair from key pool so it won't be used again.
    reservekey.KeepKey();

    // Add tx to wallet, because if it has change it's also ours, otherwise just
    // for transaction history.
    AddToWallet(wtxNew);

    // Notify that old coins are spent.
    for (const CTxIn &txin : wtxNew.tx->vin) {
        CWalletTx &coin = mapWallet.at(txin.prevout.GetTxId());
        coin.BindWallet(this);
        NotifyTransactionChanged(this, coin.GetId(), CT_UPDATED);
    }

    // Get the inserted-CWalletTx from mapWallet so that the
    // fInMempool flag is cached properly
    CWalletTx &wtx = mapWallet.at(wtxNew.GetId());

    if (fBroadcastTransactions) {
        // Broadcast
        if (!wtx.AcceptToMemoryPool(maxTxFee, state)) {
            LogPrintf("CommitTransaction(): Transaction cannot be broadcast "
                      "immediately, %s\n",
                      FormatStateMessage(state));
            // TODO: if we expect the failure to be long term or permanent,
            // instead delete wtx from the wallet and return failure.
        } else {
            wtx.RelayWalletTransaction(connman);
        }
    }

    return true;
}

void CWallet::ListAccountCreditDebit(const std::string &strAccount,
                                     std::list<CAccountingEntry> &entries) {
    WalletBatch batch(*database);
    return batch.ListAccountCreditDebit(strAccount, entries);
}

bool CWallet::AddAccountingEntry(const CAccountingEntry &acentry) {
    WalletBatch batch(*database);

    return AddAccountingEntry(acentry, &batch);
}

bool CWallet::AddAccountingEntry(const CAccountingEntry &acentry,
                                 WalletBatch *batch) {
    if (!batch->WriteAccountingEntry(++nAccountingEntryNumber, acentry)) {
        return false;
    }

    laccentries.push_back(acentry);
    CAccountingEntry &entry = laccentries.back();
    wtxOrdered.insert(std::make_pair(entry.nOrderPos, TxPair(nullptr, &entry)));

    return true;
}

DBErrors CWallet::LoadWallet(bool &fFirstRunRet) {
    LOCK2(cs_main, cs_wallet);

    fFirstRunRet = false;
    DBErrors nLoadWalletRet = WalletBatch(*database, "cr+").LoadWallet(this);
    if (nLoadWalletRet == DBErrors::NEED_REWRITE) {
        if (database->Rewrite("\x04pool")) {
            setInternalKeyPool.clear();
            setExternalKeyPool.clear();
            m_pool_key_to_index.clear();
            // Note: can't top-up keypool here, because wallet is locked.
            // User will be prompted to unlock wallet the next operation
            // that requires a new key.
        }
    }

    // This wallet is in its first run if all of these are empty
    fFirstRunRet = mapKeys.empty() && mapCryptedKeys.empty() &&
                   mapWatchKeys.empty() && setWatchOnly.empty() &&
                   mapScripts.empty();

    if (nLoadWalletRet != DBErrors::LOAD_OK) {
        return nLoadWalletRet;
    }

    uiInterface.LoadWallet(this);

    return DBErrors::LOAD_OK;
}

DBErrors CWallet::ZapSelectTx(std::vector<TxId> &txIdsIn,
                              std::vector<TxId> &txIdsOut) {
    // mapWallet
    AssertLockHeld(cs_wallet);
    DBErrors nZapSelectTxRet =
        WalletBatch(*database, "cr+").ZapSelectTx(txIdsIn, txIdsOut);
    for (const TxId &txid : txIdsOut) {
        mapWallet.erase(txid);
    }

    if (nZapSelectTxRet == DBErrors::NEED_REWRITE) {
        if (database->Rewrite("\x04pool")) {
            setInternalKeyPool.clear();
            setExternalKeyPool.clear();
            m_pool_key_to_index.clear();
            // Note: can't top-up keypool here, because wallet is locked.
            // User will be prompted to unlock wallet the next operation
            // that requires a new key.
        }
    }

    if (nZapSelectTxRet != DBErrors::LOAD_OK) {
        return nZapSelectTxRet;
    }

    MarkDirty();

    return DBErrors::LOAD_OK;
}

DBErrors CWallet::ZapWalletTx(std::vector<CWalletTx> &vWtx) {
    DBErrors nZapWalletTxRet = WalletBatch(*database, "cr+").ZapWalletTx(vWtx);
    if (nZapWalletTxRet == DBErrors::NEED_REWRITE) {
        if (database->Rewrite("\x04pool")) {
            LOCK(cs_wallet);
            setInternalKeyPool.clear();
            setExternalKeyPool.clear();
            m_pool_key_to_index.clear();
            // Note: can't top-up keypool here, because wallet is locked.
            // User will be prompted to unlock wallet the next operation
            // that requires a new key.
        }
    }

    if (nZapWalletTxRet != DBErrors::LOAD_OK) {
        return nZapWalletTxRet;
    }

    return DBErrors::LOAD_OK;
}

bool CWallet::SetAddressBook(const CTxDestination &address,
                             const std::string &strName,
                             const std::string &strPurpose) {
    bool fUpdated = false;
    {
        // mapAddressBook
        LOCK(cs_wallet);
        std::map<CTxDestination, CAddressBookData>::iterator mi =
            mapAddressBook.find(address);
        fUpdated = mi != mapAddressBook.end();
        mapAddressBook[address].name = strName;
        // Update purpose only if requested.
        if (!strPurpose.empty()) {
            mapAddressBook[address].purpose = strPurpose;
        }
    }

    NotifyAddressBookChanged(this, address, strName,
                             ::IsMine(*this, address) != ISMINE_NO, strPurpose,
                             (fUpdated ? CT_UPDATED : CT_NEW));
    if (!strPurpose.empty() &&
        !WalletBatch(*database).WritePurpose(address, strPurpose)) {
        return false;
    }
    return WalletBatch(*database).WriteName(address, strName);
}

bool CWallet::DelAddressBook(const CTxDestination &address) {
    {
        // mapAddressBook
        LOCK(cs_wallet);

        // Delete destdata tuples associated with address.
        for (const std::pair<std::string, std::string> &item :
             mapAddressBook[address].destdata) {
            WalletBatch(*database).EraseDestData(address, item.first);
        }

        mapAddressBook.erase(address);
    }

    NotifyAddressBookChanged(this, address, "",
                             ::IsMine(*this, address) != ISMINE_NO, "",
                             CT_DELETED);

    WalletBatch(*database).ErasePurpose(address);
    return WalletBatch(*database).EraseName(address);
}

const std::string &CWallet::GetLabelName(const CScript &scriptPubKey) const {
    CTxDestination address;
    if (ExtractDestination(scriptPubKey, address) &&
        !scriptPubKey.IsUnspendable()) {
        auto mi = mapAddressBook.find(address);
        if (mi != mapAddressBook.end()) {
            return mi->second.name;
        }
    }
    // A scriptPubKey that doesn't have an entry in the address book is
    // associated with the default label ("").
    const static std::string DEFAULT_LABEL_NAME;
    return DEFAULT_LABEL_NAME;
}

/**
 * Mark old keypool keys as used, and generate all new keys.
 */
bool CWallet::NewKeyPool() {
    LOCK(cs_wallet);
    WalletBatch batch(*database);

    for (int64_t nIndex : setInternalKeyPool) {
        batch.ErasePool(nIndex);
    }
    setInternalKeyPool.clear();

    for (int64_t nIndex : setExternalKeyPool) {
        batch.ErasePool(nIndex);
    }
    setExternalKeyPool.clear();

    m_pool_key_to_index.clear();

    if (!TopUpKeyPool()) {
        return false;
    }

    LogPrintf("CWallet::NewKeyPool rewrote keypool\n");
    return true;
}

size_t CWallet::KeypoolCountExternalKeys() {
    // setExternalKeyPool
    AssertLockHeld(cs_wallet);
    return setExternalKeyPool.size();
}

void CWallet::LoadKeyPool(int64_t nIndex, const CKeyPool &keypool) {
    AssertLockHeld(cs_wallet);
    if (keypool.fInternal) {
        setInternalKeyPool.insert(nIndex);
    } else {
        setExternalKeyPool.insert(nIndex);
    }
    m_max_keypool_index = std::max(m_max_keypool_index, nIndex);
    m_pool_key_to_index[keypool.vchPubKey.GetID()] = nIndex;

    // If no metadata exists yet, create a default with the pool key's
    // creation time. Note that this may be overwritten by actually
    // stored metadata for that key later, which is fine.
    CKeyID keyid = keypool.vchPubKey.GetID();
    if (mapKeyMetadata.count(keyid) == 0) {
        mapKeyMetadata[keyid] = CKeyMetadata(keypool.nTime);
    }
}

bool CWallet::TopUpKeyPool(unsigned int kpSize) {
    LOCK(cs_wallet);

    if (IsLocked()) {
        return false;
    }

    // Top up key pool
    unsigned int nTargetSize;
    if (kpSize > 0) {
        nTargetSize = kpSize;
    } else {
        nTargetSize = std::max<int64_t>(
            gArgs.GetArg("-keypool", DEFAULT_KEYPOOL_SIZE), 0);
    }

    // count amount of available keys (internal, external)
    // make sure the keypool of external and internal keys fits the user
    // selected target (-keypool)
    int64_t missingExternal = std::max<int64_t>(
        std::max<int64_t>(nTargetSize, 1) - setExternalKeyPool.size(), 0);
    int64_t missingInternal = std::max<int64_t>(
        std::max<int64_t>(nTargetSize, 1) - setInternalKeyPool.size(), 0);

    if (!IsHDEnabled() || !CanSupportFeature(FEATURE_HD_SPLIT)) {
        // don't create extra internal keys
        missingInternal = 0;
    }
    bool internal = false;
    WalletBatch batch(*database);
    for (int64_t i = missingInternal + missingExternal; i--;) {
        if (i < missingInternal) {
            internal = true;
        }

        // How in the hell did you use so many keys?
        assert(m_max_keypool_index < std::numeric_limits<int64_t>::max());
        int64_t index = ++m_max_keypool_index;

        CPubKey pubkey(GenerateNewKey(batch, internal));
        if (!batch.WritePool(index, CKeyPool(pubkey, internal))) {
            throw std::runtime_error(std::string(__func__) +
                                     ": writing generated key failed");
        }

        if (internal) {
            setInternalKeyPool.insert(index);
        } else {
            setExternalKeyPool.insert(index);
        }
        m_pool_key_to_index[pubkey.GetID()] = index;
    }
    if (missingInternal + missingExternal > 0) {
        LogPrintf(
            "keypool added %d keys (%d internal), size=%u (%u internal)\n",
            missingInternal + missingExternal, missingInternal,
            setInternalKeyPool.size() + setExternalKeyPool.size(),
            setInternalKeyPool.size());
    }

    return true;
}

void CWallet::ReserveKeyFromKeyPool(int64_t &nIndex, CKeyPool &keypool,
                                    bool fRequestedInternal) {
    nIndex = -1;
    keypool.vchPubKey = CPubKey();

    LOCK(cs_wallet);

    if (!IsLocked()) {
        TopUpKeyPool();
    }

    bool fReturningInternal = IsHDEnabled() &&
                              CanSupportFeature(FEATURE_HD_SPLIT) &&
                              fRequestedInternal;
    std::set<int64_t> &setKeyPool =
        fReturningInternal ? setInternalKeyPool : setExternalKeyPool;

    // Get the oldest key
    if (setKeyPool.empty()) {
        return;
    }

    WalletBatch batch(*database);

    auto it = setKeyPool.begin();
    nIndex = *it;
    setKeyPool.erase(it);
    if (!batch.ReadPool(nIndex, keypool)) {
        throw std::runtime_error(std::string(__func__) + ": read failed");
    }
    if (!HaveKey(keypool.vchPubKey.GetID())) {
        throw std::runtime_error(std::string(__func__) +
                                 ": unknown key in key pool");
    }
    if (keypool.fInternal != fReturningInternal) {
        throw std::runtime_error(std::string(__func__) +
                                 ": keypool entry misclassified");
    }

    assert(keypool.vchPubKey.IsValid());
    m_pool_key_to_index.erase(keypool.vchPubKey.GetID());
    LogPrintf("keypool reserve %d\n", nIndex);
}

void CWallet::KeepKey(int64_t nIndex) {
    // Remove from key pool.
    WalletBatch batch(*database);
    batch.ErasePool(nIndex);
    LogPrintf("keypool keep %d\n", nIndex);
}

void CWallet::ReturnKey(int64_t nIndex, bool fInternal, const CPubKey &pubkey) {
    // Return to key pool
    {
        LOCK(cs_wallet);
        if (fInternal) {
            setInternalKeyPool.insert(nIndex);
        } else {
            setExternalKeyPool.insert(nIndex);
        }
        m_pool_key_to_index[pubkey.GetID()] = nIndex;
    }

    LogPrintf("keypool return %d\n", nIndex);
}

bool CWallet::GetKeyFromPool(CPubKey &result, bool internal) {
    CKeyPool keypool;
    LOCK(cs_wallet);
    int64_t nIndex = 0;
    ReserveKeyFromKeyPool(nIndex, keypool, internal);
    if (nIndex == -1) {
        if (IsLocked()) {
            return false;
        }
        WalletBatch batch(*database);
        result = GenerateNewKey(batch, internal);
        return true;
    }

    KeepKey(nIndex);
    result = keypool.vchPubKey;

    return true;
}

static int64_t GetOldestKeyTimeInPool(const std::set<int64_t> &setKeyPool,
                                      WalletBatch &batch) {
    if (setKeyPool.empty()) {
        return GetTime();
    }

    CKeyPool keypool;
    int64_t nIndex = *(setKeyPool.begin());
    if (!batch.ReadPool(nIndex, keypool)) {
        throw std::runtime_error(std::string(__func__) +
                                 ": read oldest key in keypool failed");
    }

    assert(keypool.vchPubKey.IsValid());
    return keypool.nTime;
}

int64_t CWallet::GetOldestKeyPoolTime() {
    LOCK(cs_wallet);

    WalletBatch batch(*database);

    // load oldest key from keypool, get time and return
    int64_t oldestKey = GetOldestKeyTimeInPool(setExternalKeyPool, batch);
    if (IsHDEnabled() && CanSupportFeature(FEATURE_HD_SPLIT)) {
        oldestKey = std::max(GetOldestKeyTimeInPool(setInternalKeyPool, batch),
                             oldestKey);
    }

    return oldestKey;
}

std::map<CTxDestination, Amount> CWallet::GetAddressBalances() {
    std::map<CTxDestination, Amount> balances;

    LOCK(cs_wallet);
    for (const auto &walletEntry : mapWallet) {
        const CWalletTx *pcoin = &walletEntry.second;

        if (!pcoin->IsTrusted()) {
            continue;
        }

        if (pcoin->IsImmatureCoinBase()) {
            continue;
        }

        int nDepth = pcoin->GetDepthInMainChain();
        if (nDepth < (pcoin->IsFromMe(ISMINE_ALL) ? 0 : 1)) {
            continue;
        }

        for (uint32_t i = 0; i < pcoin->tx->vout.size(); i++) {
            CTxDestination addr;
            if (!IsMine(pcoin->tx->vout[i])) {
                continue;
            }

            if (!ExtractDestination(pcoin->tx->vout[i].scriptPubKey, addr)) {
                continue;
            }

            Amount n = IsSpent(COutPoint(walletEntry.first, i))
                           ? Amount::zero()
                           : pcoin->tx->vout[i].nValue;

            if (!balances.count(addr)) {
                balances[addr] = Amount::zero();
            }
            balances[addr] += n;
        }
    }

    return balances;
}

std::set<std::set<CTxDestination>> CWallet::GetAddressGroupings() {
    // mapWallet
    AssertLockHeld(cs_wallet);
    std::set<std::set<CTxDestination>> groupings;
    std::set<CTxDestination> grouping;

    for (const auto &walletEntry : mapWallet) {
        const CWalletTx *pcoin = &walletEntry.second;

        if (pcoin->tx->vin.size() > 0) {
            bool any_mine = false;
            // Group all input addresses with each other.
            for (const auto txin : pcoin->tx->vin) {
                CTxDestination address;
                // If this input isn't mine, ignore it.
                if (!IsMine(txin)) {
                    continue;
                }

                if (!ExtractDestination(mapWallet.at(txin.prevout.GetTxId())
                                            .tx->vout[txin.prevout.GetN()]
                                            .scriptPubKey,
                                        address)) {
                    continue;
                }

                grouping.insert(address);
                any_mine = true;
            }

            // Group change with input addresses.
            if (any_mine) {
                for (const auto txout : pcoin->tx->vout) {
                    if (IsChange(txout)) {
                        CTxDestination txoutAddr;
                        if (!ExtractDestination(txout.scriptPubKey,
                                                txoutAddr)) {
                            continue;
                        }

                        grouping.insert(txoutAddr);
                    }
                }
            }

            if (grouping.size() > 0) {
                groupings.insert(grouping);
                grouping.clear();
            }
        }

        // Group lone addrs by themselves.
        for (const auto &txout : pcoin->tx->vout) {
            if (IsMine(txout)) {
                CTxDestination address;
                if (!ExtractDestination(txout.scriptPubKey, address)) {
                    continue;
                }

                grouping.insert(address);
                groupings.insert(grouping);
                grouping.clear();
            }
        }
    }

    // A set of pointers to groups of addresses.
    std::set<std::set<CTxDestination> *> uniqueGroupings;
    // Map addresses to the unique group containing it.
    std::map<CTxDestination, std::set<CTxDestination> *> setmap;
    for (std::set<CTxDestination> _grouping : groupings) {
        // Make a set of all the groups hit by this new group.
        std::set<std::set<CTxDestination> *> hits;
        std::map<CTxDestination, std::set<CTxDestination> *>::iterator it;
        for (CTxDestination address : _grouping) {
            if ((it = setmap.find(address)) != setmap.end()) {
                hits.insert((*it).second);
            }
        }

        // Merge all hit groups into a new single group and delete old groups.
        std::set<CTxDestination> *merged =
            new std::set<CTxDestination>(_grouping);
        for (std::set<CTxDestination> *hit : hits) {
            merged->insert(hit->begin(), hit->end());
            uniqueGroupings.erase(hit);
            delete hit;
        }
        uniqueGroupings.insert(merged);

        // Update setmap.
        for (CTxDestination element : *merged) {
            setmap[element] = merged;
        }
    }

    std::set<std::set<CTxDestination>> ret;
    for (std::set<CTxDestination> *uniqueGrouping : uniqueGroupings) {
        ret.insert(*uniqueGrouping);
        delete uniqueGrouping;
    }

    return ret;
}

std::set<CTxDestination>
CWallet::GetLabelAddresses(const std::string &label) const {
    LOCK(cs_wallet);
    std::set<CTxDestination> result;
    for (const std::pair<CTxDestination, CAddressBookData> &item :
         mapAddressBook) {
        const CTxDestination &address = item.first;
        const std::string &strName = item.second.name;
        if (strName == label) {
            result.insert(address);
        }
    }

    return result;
}

bool CReserveKey::GetReservedKey(CPubKey &pubkey, bool internal) {
    if (nIndex == -1) {
        CKeyPool keypool;
        pwallet->ReserveKeyFromKeyPool(nIndex, keypool, internal);
        if (nIndex == -1) {
            return false;
        }

        vchPubKey = keypool.vchPubKey;
        fInternal = keypool.fInternal;
    }

    assert(vchPubKey.IsValid());
    pubkey = vchPubKey;
    return true;
}

void CReserveKey::KeepKey() {
    if (nIndex != -1) {
        pwallet->KeepKey(nIndex);
    }

    nIndex = -1;
    vchPubKey = CPubKey();
}

void CReserveKey::ReturnKey() {
    if (nIndex != -1) {
        pwallet->ReturnKey(nIndex, fInternal, vchPubKey);
    }
    nIndex = -1;
    vchPubKey = CPubKey();
}

void CWallet::MarkReserveKeysAsUsed(int64_t keypool_id) {
    AssertLockHeld(cs_wallet);
    bool internal = setInternalKeyPool.count(keypool_id);
    if (!internal) {
        assert(setExternalKeyPool.count(keypool_id));
    }

    std::set<int64_t> *setKeyPool =
        internal ? &setInternalKeyPool : &setExternalKeyPool;
    auto it = setKeyPool->begin();

    WalletBatch batch(*database);
    while (it != std::end(*setKeyPool)) {
        const int64_t &index = *(it);
        if (index > keypool_id) {
            // set*KeyPool is ordered
            break;
        }

        CKeyPool keypool;
        if (batch.ReadPool(index, keypool)) {
            // TODO: This should be unnecessary
            m_pool_key_to_index.erase(keypool.vchPubKey.GetID());
        }
        LearnAllRelatedScripts(keypool.vchPubKey);
        batch.ErasePool(index);
        it = setKeyPool->erase(it);
    }
}

bool CWallet::HasUnusedKeys(size_t min_keys) const {
    return setExternalKeyPool.size() >= min_keys &&
           (setInternalKeyPool.size() >= min_keys ||
            !CanSupportFeature(FEATURE_HD_SPLIT));
}

void CWallet::GetScriptForMining(std::shared_ptr<CReserveScript> &script) {
    std::shared_ptr<CReserveKey> rKey = std::make_shared<CReserveKey>(this);
    CPubKey pubkey;
    if (!rKey->GetReservedKey(pubkey)) {
        return;
    }

    script = rKey;
    script->reserveScript = CScript() << ToByteVector(pubkey) << OP_CHECKSIG;
}

void CWallet::LockCoin(const COutPoint &output) {
    // setLockedCoins
    AssertLockHeld(cs_wallet);
    setLockedCoins.insert(output);
}

void CWallet::UnlockCoin(const COutPoint &output) {
    // setLockedCoins
    AssertLockHeld(cs_wallet);
    setLockedCoins.erase(output);
}

void CWallet::UnlockAllCoins() {
    // setLockedCoins
    AssertLockHeld(cs_wallet);
    setLockedCoins.clear();
}

bool CWallet::IsLockedCoin(const COutPoint &outpoint) const {
    // setLockedCoins
    AssertLockHeld(cs_wallet);

    return setLockedCoins.count(outpoint) > 0;
}

void CWallet::ListLockedCoins(std::vector<COutPoint> &vOutpts) const {
    // setLockedCoins
    AssertLockHeld(cs_wallet);
    for (COutPoint outpoint : setLockedCoins) {
        vOutpts.push_back(outpoint);
    }
}

/** @} */ // end of Actions

void CWallet::GetKeyBirthTimes(
    std::map<CTxDestination, int64_t> &mapKeyBirth) const {
    // mapKeyMetadata
    AssertLockHeld(cs_wallet);
    mapKeyBirth.clear();

    // Get birth times for keys with metadata.
    for (const auto &entry : mapKeyMetadata) {
        if (entry.second.nCreateTime) {
            mapKeyBirth[entry.first] = entry.second.nCreateTime;
        }
    }

    // Map in which we'll infer heights of other keys the tip can be
    // reorganized; use a 144-block safety margin.
    CBlockIndex *pindexMax =
        chainActive[std::max(0, chainActive.Height() - 144)];
    std::map<CKeyID, CBlockIndex *> mapKeyFirstBlock;
    for (const CKeyID &keyid : GetKeys()) {
        if (mapKeyBirth.count(keyid) == 0) {
            mapKeyFirstBlock[keyid] = pindexMax;
        }
    }

    // If there are no such keys, we're done.
    if (mapKeyFirstBlock.empty()) {
        return;
    }

    // Find first block that affects those keys, if there are any left.
    std::vector<CKeyID> vAffected;
    for (const auto &entry : mapWallet) {
        // iterate over all wallet transactions...
        const CWalletTx &wtx = entry.second;
        CBlockIndex *pindex = LookupBlockIndex(wtx.hashBlock);
        if (pindex && chainActive.Contains(pindex)) {
            // ... which are already in a block
            int nHeight = pindex->nHeight;
            for (const CTxOut &txout : wtx.tx->vout) {
                // Iterate over all their outputs...
                CAffectedKeysVisitor(*this, vAffected)
                    .Process(txout.scriptPubKey);
                for (const CKeyID &keyid : vAffected) {
                    // ... and all their affected keys.
                    std::map<CKeyID, CBlockIndex *>::iterator rit =
                        mapKeyFirstBlock.find(keyid);
                    if (rit != mapKeyFirstBlock.end() &&
                        nHeight < rit->second->nHeight) {
                        rit->second = pindex;
                    }
                }
                vAffected.clear();
            }
        }
    }

    // Extract block timestamps for those keys.
    for (const auto &entry : mapKeyFirstBlock) {
        // block times can be 2h off
        mapKeyBirth[entry.first] =
            entry.second->GetBlockTime() - TIMESTAMP_WINDOW;
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
    if (!wtx.hashUnset()) {
        if (const CBlockIndex *pindex = LookupBlockIndex(wtx.hashBlock)) {
            int64_t latestNow = wtx.nTimeReceived;
            int64_t latestEntry = 0;

            // Tolerate times up to the last timestamp in the wallet not more
            // than 5 minutes into the future
            int64_t latestTolerated = latestNow + 300;
            const TxItems &txOrdered = wtxOrdered;
            for (auto it = txOrdered.rbegin(); it != txOrdered.rend(); ++it) {
                CWalletTx *const pwtx = it->second.first;
                if (pwtx == &wtx) {
                    continue;
                }
                CAccountingEntry *const pacentry = it->second.second;
                int64_t nSmartTime;
                if (pwtx) {
                    nSmartTime = pwtx->nTimeSmart;
                    if (!nSmartTime) {
                        nSmartTime = pwtx->nTimeReceived;
                    }
                } else {
                    nSmartTime = pacentry->nTime;
                }
                if (nSmartTime <= latestTolerated) {
                    latestEntry = nSmartTime;
                    if (nSmartTime > latestNow) {
                        latestNow = nSmartTime;
                    }
                    break;
                }
            }

            int64_t blocktime = pindex->GetBlockTime();
            nTimeSmart = std::max(latestEntry, std::min(blocktime, latestNow));
        } else {
            LogPrintf("%s: found %s in block %s not in index\n", __func__,
                      wtx.GetId().ToString(), wtx.hashBlock.ToString());
        }
    }
    return nTimeSmart;
}

bool CWallet::AddDestData(const CTxDestination &dest, const std::string &key,
                          const std::string &value) {
    if (boost::get<CNoDestination>(&dest)) {
        return false;
    }

    mapAddressBook[dest].destdata.insert(std::make_pair(key, value));
    return WalletBatch(*database).WriteDestData(dest, key, value);
}

bool CWallet::EraseDestData(const CTxDestination &dest,
                            const std::string &key) {
    if (!mapAddressBook[dest].destdata.erase(key)) {
        return false;
    }

    return WalletBatch(*database).EraseDestData(dest, key);
}

bool CWallet::LoadDestData(const CTxDestination &dest, const std::string &key,
                           const std::string &value) {
    mapAddressBook[dest].destdata.insert(std::make_pair(key, value));
    return true;
}

bool CWallet::GetDestData(const CTxDestination &dest, const std::string &key,
                          std::string *value) const {
    std::map<CTxDestination, CAddressBookData>::const_iterator i =
        mapAddressBook.find(dest);
    if (i != mapAddressBook.end()) {
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
    LOCK(cs_wallet);
    std::vector<std::string> values;
    for (const auto &address : mapAddressBook) {
        for (const auto &data : address.second.destdata) {
            if (!data.first.compare(0, prefix.size(), prefix)) {
                values.emplace_back(data.second);
            }
        }
    }
    return values;
}

bool CWallet::Verify(const CChainParams &chainParams, std::string wallet_file,
                     bool salvage_wallet, std::string &error_string,
                     std::string &warning_string) {
    // Do some checking on wallet path. It should be either a:
    //
    // 1. Path where a directory can be created.
    // 2. Path to an existing directory.
    // 3. Path to a symlink to a directory.
    // 4. For backwards compatibility, the name of a data file in -walletdir.
    LOCK(cs_wallets);
    fs::path wallet_path = fs::absolute(wallet_file, GetWalletDir());
    fs::file_type path_type = fs::symlink_status(wallet_path).type();
    if (!(path_type == fs::file_not_found || path_type == fs::directory_file ||
          (path_type == fs::symlink_file && fs::is_directory(wallet_path)) ||
          (path_type == fs::regular_file &&
           fs::path(wallet_file).filename() == wallet_file))) {
        error_string =
            strprintf("Invalid -wallet path '%s'. -wallet path should point to "
                      "a directory where wallet.dat and "
                      "database/log.?????????? files can be stored, a location "
                      "where such a directory could be created, "
                      "or (for backwards compatibility) the name of an "
                      "existing data file in -walletdir (%s)",
                      wallet_file, GetWalletDir());
        return false;
    }

    // Make sure that the wallet path doesn't clash with an existing wallet path
    for (auto wallet : GetWallets()) {
        if (fs::absolute(wallet->GetName(), GetWalletDir()) == wallet_path) {
            error_string = strprintf("Error loading wallet %s. Duplicate "
                                     "-wallet filename specified.",
                                     wallet_file);
            return false;
        }
    }

    if (!WalletBatch::VerifyEnvironment(wallet_path, error_string)) {
        return false;
    }

    if (salvage_wallet) {
        // Recover readable keypairs:
        CWallet dummyWallet(chainParams, "dummy",
                            WalletDatabase::CreateDummy());
        std::string backup_filename;
        if (!WalletBatch::Recover(
                wallet_path, static_cast<void *>(&dummyWallet),
                WalletBatch::RecoverKeysOnlyFilter, backup_filename)) {
            return false;
        }
    }

    return WalletBatch::VerifyDatabaseFile(wallet_path, warning_string,
                                           error_string);
}

CWallet *CWallet::CreateWalletFromFile(const CChainParams &chainParams,
                                       const std::string &name,
                                       const fs::path &path) {
    const std::string &walletFile = name;

    // Needed to restore wallet transaction meta data after -zapwallettxes
    std::vector<CWalletTx> vWtx;

    if (gArgs.GetBoolArg("-zapwallettxes", false)) {
        uiInterface.InitMessage(_("Zapping all transactions from wallet..."));

        std::unique_ptr<CWallet> tempWallet = std::make_unique<CWallet>(
            chainParams, name, WalletDatabase::Create(path));
        DBErrors nZapWalletRet = tempWallet->ZapWalletTx(vWtx);
        if (nZapWalletRet != DBErrors::LOAD_OK) {
            InitError(
                strprintf(_("Error loading %s: Wallet corrupted"), walletFile));
            return nullptr;
        }
    }

    uiInterface.InitMessage(_("Loading wallet..."));

    int64_t nStart = GetTimeMillis();
    bool fFirstRun = true;
    // Make a temporary wallet unique pointer so memory doesn't get leaked if
    // wallet creation fails.
    auto temp_wallet = std::make_unique<CWallet>(chainParams, name,
                                                 WalletDatabase::Create(path));
    CWallet *walletInstance = temp_wallet.get();
    DBErrors nLoadWalletRet = walletInstance->LoadWallet(fFirstRun);
    if (nLoadWalletRet != DBErrors::LOAD_OK) {
        if (nLoadWalletRet == DBErrors::CORRUPT) {
            InitError(
                strprintf(_("Error loading %s: Wallet corrupted"), walletFile));
            return nullptr;
        }

        if (nLoadWalletRet == DBErrors::NONCRITICAL_ERROR) {
            InitWarning(strprintf(
                _("Error reading %s! All keys read correctly, but transaction "
                  "data"
                  " or address book entries might be missing or incorrect."),
                walletFile));
        } else if (nLoadWalletRet == DBErrors::TOO_NEW) {
            InitError(strprintf(
                _("Error loading %s: Wallet requires newer version of %s"),
                walletFile, _(PACKAGE_NAME)));
            return nullptr;
        } else if (nLoadWalletRet == DBErrors::NEED_REWRITE) {
            InitError(strprintf(
                _("Wallet needed to be rewritten: restart %s to complete"),
                _(PACKAGE_NAME)));
            return nullptr;
        } else {
            InitError(strprintf(_("Error loading %s"), walletFile));
            return nullptr;
        }
    }

    if (gArgs.GetBoolArg("-upgradewallet", fFirstRun)) {
        int nMaxVersion = gArgs.GetArg("-upgradewallet", 0);
        // The -upgradewallet without argument case
        if (nMaxVersion == 0) {
            LogPrintf("Performing wallet upgrade to %i\n", FEATURE_LATEST);
            nMaxVersion = CLIENT_VERSION;
            // permanently upgrade the wallet immediately
            walletInstance->SetMinVersion(FEATURE_LATEST);
        } else {
            LogPrintf("Allowing wallet upgrade up to %i\n", nMaxVersion);
        }

        if (nMaxVersion < walletInstance->GetVersion()) {
            InitError(_("Cannot downgrade wallet"));
            return nullptr;
        }

        walletInstance->SetMaxVersion(nMaxVersion);
    }

    if (fFirstRun) {
        // Ensure this wallet.dat can only be opened by clients supporting
        // HD with chain split and expects no default key.
        if (!gArgs.GetBoolArg("-usehd", true)) {
            InitError(strprintf(_("Error creating %s: You can't create non-HD "
                                  "wallets with this version."),
                                walletFile));
            return nullptr;
        }
        walletInstance->SetMinVersion(FEATURE_NO_DEFAULT_KEY);

        // Generate a new master key.
        CPubKey masterPubKey = walletInstance->GenerateNewHDMasterKey();
        if (!walletInstance->SetHDMasterKey(masterPubKey)) {
            throw std::runtime_error(std::string(__func__) +
                                     ": Storing master key failed");
        }

        // Top up the keypool
        if (!walletInstance->TopUpKeyPool()) {
            InitError(_("Unable to generate initial keys") += "\n");
            return nullptr;
        }

        walletInstance->ChainStateFlushed(chainActive.GetLocator());
    } else if (gArgs.IsArgSet("-usehd")) {
        bool useHD = gArgs.GetBoolArg("-usehd", true);
        if (walletInstance->IsHDEnabled() && !useHD) {
            InitError(
                strprintf(_("Error loading %s: You can't disable HD on an "
                            "already existing HD wallet"),
                          walletFile));
            return nullptr;
        }

        if (!walletInstance->IsHDEnabled() && useHD) {
            InitError(strprintf(_("Error loading %s: You can't enable HD on an "
                                  "already existing non-HD wallet"),
                                walletFile));
            return nullptr;
        }
    }

    if (gArgs.IsArgSet("-mintxfee")) {
        Amount n = Amount::zero();
        if (!ParseMoney(gArgs.GetArg("-mintxfee", ""), n) ||
            n == Amount::zero()) {
            InitError(AmountErrMsg("mintxfee", gArgs.GetArg("-mintxfee", "")));
            return nullptr;
        }
        if (n > HIGH_TX_FEE_PER_KB) {
            InitWarning(AmountHighWarn("-mintxfee") + " " +
                        _("This is the minimum transaction fee you pay on "
                          "every transaction."));
        }
        walletInstance->m_min_fee = CFeeRate(n);
    }

    if (gArgs.IsArgSet("-fallbackfee")) {
        Amount nFeePerK = Amount::zero();
        if (!ParseMoney(gArgs.GetArg("-fallbackfee", ""), nFeePerK)) {
            InitError(
                strprintf(_("Invalid amount for -fallbackfee=<amount>: '%s'"),
                          gArgs.GetArg("-fallbackfee", "")));
            return nullptr;
        }
        if (nFeePerK > HIGH_TX_FEE_PER_KB) {
            InitWarning(AmountHighWarn("-fallbackfee") + " " +
                        _("This is the transaction fee you may pay when fee "
                          "estimates are not available."));
        }
        walletInstance->m_fallback_fee = CFeeRate(nFeePerK);
        // disable fallback fee in case value was set to 0, enable if non-null
        // value
        walletInstance->m_allow_fallback_fee = (nFeePerK != Amount::zero());
    }
    if (gArgs.IsArgSet("-paytxfee")) {
        Amount nFeePerK = Amount::zero();
        if (!ParseMoney(gArgs.GetArg("-paytxfee", ""), nFeePerK)) {
            InitError(AmountErrMsg("paytxfee", gArgs.GetArg("-paytxfee", "")));
            return nullptr;
        }
        if (nFeePerK > HIGH_TX_FEE_PER_KB) {
            InitWarning(AmountHighWarn("-paytxfee") + " " +
                        _("This is the transaction fee you will pay if you "
                          "send a transaction."));
        }
        walletInstance->m_pay_tx_fee = CFeeRate(nFeePerK, 1000);
        if (walletInstance->m_pay_tx_fee < ::minRelayTxFee) {
            InitError(strprintf(_("Invalid amount for -paytxfee=<amount>: '%s' "
                                  "(must be at least %s)"),
                                gArgs.GetArg("-paytxfee", ""),
                                ::minRelayTxFee.ToString()));
            return nullptr;
        }
    }
    walletInstance->m_spend_zero_conf_change =
        gArgs.GetBoolArg("-spendzeroconfchange", DEFAULT_SPEND_ZEROCONF_CHANGE);

    walletInstance->m_default_address_type = DEFAULT_ADDRESS_TYPE;
    walletInstance->m_default_change_type = OutputType::NONE;

    LogPrintf(" wallet      %15dms\n", GetTimeMillis() - nStart);

    // Try to top up keypool. No-op if the wallet is locked.
    walletInstance->TopUpKeyPool();

    LOCK(cs_main);

    CBlockIndex *pindexRescan = chainActive.Genesis();
    if (!gArgs.GetBoolArg("-rescan", false)) {
        WalletBatch batch(*walletInstance->database);
        CBlockLocator locator;
        if (batch.ReadBestBlock(locator)) {
            pindexRescan = FindForkInGlobalIndex(chainActive, locator);
        }
    }

    walletInstance->m_last_block_processed = chainActive.Tip();

    if (chainActive.Tip() && chainActive.Tip() != pindexRescan) {
        // We can't rescan beyond non-pruned blocks, stop and throw an error.
        // This might happen if a user uses an old wallet within a pruned node
        // or if he ran -disablewallet for a longer time, then decided to
        // re-enable.
        if (fPruneMode) {
            CBlockIndex *block = chainActive.Tip();
            while (block && block->pprev && block->pprev->nStatus.hasData() &&
                   block->pprev->nTx > 0 && pindexRescan != block) {
                block = block->pprev;
            }

            if (pindexRescan != block) {
                InitError(_("Prune: last wallet synchronisation goes beyond "
                            "pruned data. You need to -reindex (download the "
                            "whole blockchain again in case of pruned node)"));
                return nullptr;
            }
        }

        uiInterface.InitMessage(_("Rescanning..."));
        LogPrintf("Rescanning last %i blocks (from block %i)...\n",
                  chainActive.Height() - pindexRescan->nHeight,
                  pindexRescan->nHeight);

        // No need to read and scan block if block was created before our wallet
        // birthday (as adjusted for block time variability)
        while (pindexRescan && walletInstance->nTimeFirstKey &&
               (pindexRescan->GetBlockTime() <
                (walletInstance->nTimeFirstKey - TIMESTAMP_WINDOW))) {
            pindexRescan = chainActive.Next(pindexRescan);
        }

        nStart = GetTimeMillis();
        {
            WalletRescanReserver reserver(walletInstance);
            if (!reserver.reserve()) {
                InitError(
                    _("Failed to rescan the wallet during initialization"));
                return nullptr;
            }
            walletInstance->ScanForWalletTransactions(pindexRescan, nullptr,
                                                      reserver, true);
        }
        LogPrintf(" rescan      %15dms\n", GetTimeMillis() - nStart);
        walletInstance->ChainStateFlushed(chainActive.GetLocator());
        walletInstance->database->IncrementUpdateCounter();

        // Restore wallet transaction metadata after -zapwallettxes=1
        if (gArgs.GetBoolArg("-zapwallettxes", false) &&
            gArgs.GetArg("-zapwallettxes", "1") != "2") {
            WalletBatch batch(*walletInstance->database);

            for (const CWalletTx &wtxOld : vWtx) {
                const TxId txid = wtxOld.GetId();
                std::map<TxId, CWalletTx>::iterator mi =
                    walletInstance->mapWallet.find(txid);
                if (mi != walletInstance->mapWallet.end()) {
                    const CWalletTx *copyFrom = &wtxOld;
                    CWalletTx *copyTo = &mi->second;
                    copyTo->mapValue = copyFrom->mapValue;
                    copyTo->vOrderForm = copyFrom->vOrderForm;
                    copyTo->nTimeReceived = copyFrom->nTimeReceived;
                    copyTo->nTimeSmart = copyFrom->nTimeSmart;
                    copyTo->fFromMe = copyFrom->fFromMe;
                    copyTo->strFromAccount = copyFrom->strFromAccount;
                    copyTo->nOrderPos = copyFrom->nOrderPos;
                    batch.WriteTx(*copyTo);
                }
            }
        }
    }

    // Register with the validation interface. It's ok to do this after rescan
    // since we're still holding cs_main.
    RegisterValidationInterface(temp_wallet.release());

    walletInstance->SetBroadcastTransactions(
        gArgs.GetBoolArg("-walletbroadcast", DEFAULT_WALLETBROADCAST));

    LOCK(walletInstance->cs_wallet);
    LogPrintf("setKeyPool.size() = %u\n", walletInstance->GetKeyPoolSize());
    LogPrintf("mapWallet.size() = %u\n", walletInstance->mapWallet.size());
    LogPrintf("mapAddressBook.size() = %u\n",
              walletInstance->mapAddressBook.size());

    return walletInstance;
}

void CWallet::postInitProcess() {
    // Add wallet transactions that aren't already in a block to mempool.
    // Do this here as mempool requires genesis block to be loaded.
    ReacceptWalletTransactions();
}

bool CWallet::BackupWallet(const std::string &strDest) {
    return database->Backup(strDest);
}

CKeyPool::CKeyPool() {
    nTime = GetTime();
    fInternal = false;
}

CKeyPool::CKeyPool(const CPubKey &vchPubKeyIn, bool internalIn) {
    nTime = GetTime();
    vchPubKey = vchPubKeyIn;
    fInternal = internalIn;
}

CWalletKey::CWalletKey(int64_t nExpires) {
    nTimeCreated = (nExpires ? GetTime() : 0);
    nTimeExpires = nExpires;
}

void CMerkleTx::SetMerkleBranch(const CBlockIndex *pindex, int posInBlock) {
    // Update the tx's hashBlock
    hashBlock = pindex->GetBlockHash();

    // Set the position of the transaction in the block.
    nIndex = posInBlock;
}

int CMerkleTx::GetDepthInMainChain(const CBlockIndex *&pindexRet) const {
    if (hashUnset()) {
        return 0;
    }

    AssertLockHeld(cs_main);

    // Find the block it claims to be in.
    CBlockIndex *pindex = LookupBlockIndex(hashBlock);
    if (!pindex || !chainActive.Contains(pindex)) {
        return 0;
    }

    pindexRet = pindex;
    return ((nIndex == -1) ? (-1) : 1) *
           (chainActive.Height() - pindex->nHeight + 1);
}

int CMerkleTx::GetBlocksToMaturity() const {
    if (!IsCoinBase()) {
        return 0;
    }

    return std::max(0, (COINBASE_MATURITY + 1) - GetDepthInMainChain());
}

bool CMerkleTx::IsImmatureCoinBase() const {
    // note GetBlocksToMaturity is 0 for non-coinbase tx
    return GetBlocksToMaturity() > 0;
}

bool CWalletTx::AcceptToMemoryPool(const Amount nAbsurdFee,
                                   CValidationState &state) {
    // Quick check to avoid re-setting fInMempool to false
    if (g_mempool.exists(tx->GetId())) {
        return false;
    }

    // We must set fInMempool here - while it will be re-set to true by the
    // entered-mempool callback, if we did not there would be a race where a
    // user could call sendmoney in a loop and hit spurious out of funds errors
    // because we think that the transaction they just generated's change is
    // unavailable as we're not yet aware its in mempool.
    bool ret = ::AcceptToMemoryPool(
        GetConfig(), g_mempool, state, tx, true /* fLimitFree */,
        nullptr /* pfMissingInputs */, false /* fOverrideMempoolLimit */,
        nAbsurdFee);
    fInMempool = ret;
    return ret;
}

static const std::string OUTPUT_TYPE_STRING_LEGACY = "legacy";

OutputType ParseOutputType(const std::string &type, OutputType default_type) {
    if (type.empty()) {
        return default_type;
    } else if (type == OUTPUT_TYPE_STRING_LEGACY) {
        return OutputType::LEGACY;
    } else {
        return OutputType::NONE;
    }
}

const std::string &FormatOutputType(OutputType type) {
    switch (type) {
        case OutputType::LEGACY:
            return OUTPUT_TYPE_STRING_LEGACY;
        default:
            assert(false);
    }
}

void CWallet::LearnRelatedScripts(const CPubKey &key, OutputType type) {
    // Nothing to do...
}

void CWallet::LearnAllRelatedScripts(const CPubKey &key) {
    // Nothing to do...
}

CTxDestination GetDestinationForKey(const CPubKey &key, OutputType type) {
    switch (type) {
        case OutputType::LEGACY:
            return key.GetID();
        default:
            assert(false);
    }
}

std::vector<CTxDestination> GetAllDestinationsForKey(const CPubKey &key) {
    return std::vector<CTxDestination>{key.GetID()};
}

CTxDestination CWallet::AddAndGetDestinationForScript(const CScript &script,
                                                      OutputType type) {
    // Note that scripts over 520 bytes are not yet supported.
    switch (type) {
        case OutputType::LEGACY:
            return CScriptID(script);
        default:
            assert(false);
    }
}

std::vector<OutputGroup>
CWallet::GroupOutputs(const std::vector<COutput> &outputs,
                      bool single_coin) const {
    std::vector<OutputGroup> groups;
    std::map<CTxDestination, OutputGroup> gmap;
    CTxDestination dst;
    for (const auto &output : outputs) {
        if (output.fSpendable) {
            CInputCoin input_coin = output.GetInputCoin();

            size_t ancestors, descendants;
            g_mempool.GetTransactionAncestry(output.tx->GetId(), ancestors,
                                             descendants);
            if (!single_coin &&
                ExtractDestination(output.tx->tx->vout[output.i].scriptPubKey,
                                   dst)) {
                // Limit output groups to no more than 10 entries, to protect
                // against inadvertently creating a too-large transaction
                // when using -avoidpartialspends
                if (gmap[dst].m_outputs.size() >= OUTPUT_GROUP_MAX_ENTRIES) {
                    groups.push_back(gmap[dst]);
                    gmap.erase(dst);
                }
                gmap[dst].Insert(input_coin, output.nDepth,
                                 output.tx->IsFromMe(ISMINE_ALL), ancestors,
                                 descendants);
            } else {
                groups.emplace_back(input_coin, output.nDepth,
                                    output.tx->IsFromMe(ISMINE_ALL), ancestors,
                                    descendants);
            }
        }
    }
    if (!single_coin) {
        for (const auto &it : gmap) {
            groups.push_back(it.second);
        }
    }
    return groups;
}
