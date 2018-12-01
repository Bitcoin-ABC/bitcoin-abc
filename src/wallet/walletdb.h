// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_WALLET_WALLETDB_H
#define BITCOIN_WALLET_WALLETDB_H

#include "amount.h"
#include "key.h"
#include "primitives/transaction.h"
#include "script/standard.h" // for CTxDestination
#include "wallet/db.h"

#include <cstdint>
#include <list>
#include <string>
#include <utility>
#include <vector>

/**
 * Overview of wallet database classes:
 *
 * - CDBEnv is an environment in which the database exists (has no analog in
 * dbwrapper.h)
 * - CWalletDBWrapper represents a wallet database (similar to CDBWrapper in
 * dbwrapper.h)
 * - CDB is a low-level database transaction (similar to CDBBatch in
 * dbwrapper.h)
 * - CWalletDB is a modifier object for the wallet, and encapsulates a database
 *   transaction as well as methods to act on the database (no analog in
 *   dbwrapper.h)
 *
 * The latter two are named confusingly, in contrast to what the names CDB
 * and CWalletDB suggest they are transient transaction objects and don't
 * represent the database itself.
 */

static const bool DEFAULT_FLUSHWALLET = true;

class CAccount;
class CAccountingEntry;
struct CBlockLocator;
class CKeyPool;
class CMasterKey;
class CScript;
class CWallet;
class CWalletTx;
class uint160;
class uint256;

/** Error statuses for the wallet database */
enum DBErrors {
    DB_LOAD_OK,
    DB_CORRUPT,
    DB_NONCRITICAL_ERROR,
    DB_TOO_NEW,
    DB_LOAD_FAIL,
    DB_NEED_REWRITE
};

/* simple HD chain data model */
class CHDChain {
public:
    uint32_t nExternalChainCounter;
    uint32_t nInternalChainCounter;
    //!< master key hash160
    CKeyID masterKeyID;

    static const int VERSION_HD_BASE = 1;
    static const int VERSION_HD_CHAIN_SPLIT = 2;
    static const int CURRENT_VERSION = VERSION_HD_CHAIN_SPLIT;
    int nVersion;

    CHDChain() { SetNull(); }
    ADD_SERIALIZE_METHODS;
    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        READWRITE(this->nVersion);
        READWRITE(nExternalChainCounter);
        READWRITE(masterKeyID);
        if (this->nVersion >= VERSION_HD_CHAIN_SPLIT) {
            READWRITE(nInternalChainCounter);
        }
    }

    void SetNull() {
        nVersion = CHDChain::CURRENT_VERSION;
        nExternalChainCounter = 0;
        nInternalChainCounter = 0;
        masterKeyID.SetNull();
    }
};

class CKeyMetadata {
public:
    static const int VERSION_BASIC = 1;
    static const int VERSION_WITH_HDDATA = 10;
    static const int CURRENT_VERSION = VERSION_WITH_HDDATA;
    int nVersion;
    // 0 means unknown.
    int64_t nCreateTime;
    // optional HD/bip32 keypath.
    std::string hdKeypath;
    // Id of the HD masterkey used to derive this key.
    CKeyID hdMasterKeyID;

    CKeyMetadata() { SetNull(); }
    CKeyMetadata(int64_t nCreateTime_) {
        SetNull();
        nCreateTime = nCreateTime_;
    }

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        READWRITE(this->nVersion);
        READWRITE(nCreateTime);
        if (this->nVersion >= VERSION_WITH_HDDATA) {
            READWRITE(hdKeypath);
            READWRITE(hdMasterKeyID);
        }
    }

    void SetNull() {
        nVersion = CKeyMetadata::CURRENT_VERSION;
        nCreateTime = 0;
        hdKeypath.clear();
        hdMasterKeyID.SetNull();
    }
};

/**
 * Access to the wallet database.
 * This should really be named CWalletDBBatch, as it represents a single
 * transaction at the database. It will be committed when the object goes out of
 * scope.
 * Optionally (on by default) it will flush to disk as well.
 */
class CWalletDB {
private:
    template <typename K, typename T>
    bool WriteIC(const K &key, const T &value, bool fOverwrite = true) {
        if (!batch.Write(key, value, fOverwrite)) {
            return false;
        }
        m_dbw.IncrementUpdateCounter();
        return true;
    }

    template <typename K> bool EraseIC(const K &key) {
        if (!batch.Erase(key)) {
            return false;
        }
        m_dbw.IncrementUpdateCounter();
        return true;
    }

public:
    CWalletDB(CWalletDBWrapper &dbw, const char *pszMode = "r+",
              bool _fFlushOnClose = true)
        : batch(dbw, pszMode, _fFlushOnClose), m_dbw(dbw) {}

    bool WriteName(const CTxDestination &address, const std::string &strName);
    bool EraseName(const CTxDestination &address);

    bool WritePurpose(const CTxDestination &address,
                      const std::string &purpose);
    bool ErasePurpose(const CTxDestination &address);

    bool WriteTx(const CWalletTx &wtx);
    bool EraseTx(uint256 hash);

    bool WriteKey(const CPubKey &vchPubKey, const CPrivKey &vchPrivKey,
                  const CKeyMetadata &keyMeta);
    bool WriteCryptedKey(const CPubKey &vchPubKey,
                         const std::vector<uint8_t> &vchCryptedSecret,
                         const CKeyMetadata &keyMeta);
    bool WriteMasterKey(unsigned int nID, const CMasterKey &kMasterKey);

    bool WriteCScript(const uint160 &hash, const CScript &redeemScript);

    bool WriteWatchOnly(const CScript &script, const CKeyMetadata &keymeta);
    bool EraseWatchOnly(const CScript &script);

    bool WriteBestBlock(const CBlockLocator &locator);
    bool ReadBestBlock(CBlockLocator &locator);

    bool WriteOrderPosNext(int64_t nOrderPosNext);

    bool ReadPool(int64_t nPool, CKeyPool &keypool);
    bool WritePool(int64_t nPool, const CKeyPool &keypool);
    bool ErasePool(int64_t nPool);

    bool WriteMinVersion(int nVersion);

    /// This writes directly to the database, and will not update the CWallet's
    /// cached accounting entries!
    /// Use wallet.AddAccountingEntry instead, to write *and* update its caches.
    bool WriteAccountingEntry(const uint64_t nAccEntryNum,
                              const CAccountingEntry &acentry);
    bool ReadAccount(const std::string &strAccount, CAccount &account);
    bool WriteAccount(const std::string &strAccount, const CAccount &account);

    /// Write destination data key,value tuple to database.
    bool WriteDestData(const CTxDestination &address, const std::string &key,
                       const std::string &value);
    /// Erase destination data tuple from wallet database.
    bool EraseDestData(const CTxDestination &address, const std::string &key);

    Amount GetAccountCreditDebit(const std::string &strAccount);
    void ListAccountCreditDebit(const std::string &strAccount,
                                std::list<CAccountingEntry> &acentries);

    DBErrors LoadWallet(CWallet *pwallet);
    DBErrors FindWalletTx(std::vector<TxId> &txIds,
                          std::vector<CWalletTx> &vWtx);
    DBErrors ZapWalletTx(std::vector<CWalletTx> &vWtx);
    DBErrors ZapSelectTx(std::vector<TxId> &txIdsIn,
                         std::vector<TxId> &txIdsOut);
    /* Try to (very carefully!) recover wallet database (with a possible key
     * type filter) */
    static bool Recover(const std::string &filename, void *callbackDataIn,
                        bool (*recoverKVcallback)(void *callbackData,
                                                  CDataStream ssKey,
                                                  CDataStream ssValue),
                        std::string &out_backup_filename);
    /* Recover convenience-function to bypass the key filter callback, called
     * when verify fails, recovers everything */
    static bool Recover(const std::string &filename,
                        std::string &out_backup_filename);
    /* Recover filter (used as callback), will only let keys (cryptographical
     * keys) as KV/key-type pass through */
    static bool RecoverKeysOnlyFilter(void *callbackData, CDataStream ssKey,
                                      CDataStream ssValue);
    /* Function to determine if a certain KV/key-type is a key (cryptographical
     * key) type */
    static bool IsKeyType(const std::string &strType);
    /* verifies the database environment */
    static bool VerifyEnvironment(const std::string &walletFile,
                                  const fs::path &dataDir,
                                  std::string &errorStr);
    /* verifies the database file */
    static bool VerifyDatabaseFile(const std::string &walletFile,
                                   const fs::path &dataDir,
                                   std::string &warningStr,
                                   std::string &errorStr);

    //! write the hdchain model (external chain child index counter)
    bool WriteHDChain(const CHDChain &chain);

    //! Begin a new transaction
    bool TxnBegin();
    //! Commit current transaction
    bool TxnCommit();
    //! Abort current transaction
    bool TxnAbort();
    //! Read wallet version
    bool ReadVersion(int &nVersion);
    //! Write wallet version
    bool WriteVersion(int nVersion);

private:
    CDB batch;
    CWalletDBWrapper &m_dbw;

    CWalletDB(const CWalletDB &);
    void operator=(const CWalletDB &);
};

//! Compacts BDB state so that wallet.dat is self-contained (if there are
//! changes)
void MaybeCompactWalletDB();

#endif // BITCOIN_WALLET_WALLETDB_H
