// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_WALLET_DB_H
#define BITCOIN_WALLET_DB_H

#include "clientversion.h"
#include "fs.h"
#include "serialize.h"
#include "streams.h"
#include "sync.h"
#include "version.h"

#include <atomic>
#include <map>
#include <string>
#include <vector>

#include <db_cxx.h>

static const unsigned int DEFAULT_WALLET_DBLOGSIZE = 100;
static const bool DEFAULT_WALLET_PRIVDB = true;

class CDBEnv {
private:
    bool fDbEnvInit;
    bool fMockDb;
    // Don't change into fs::path, as that can result in
    // shutdown problems/crashes caused by a static initialized internal
    // pointer.
    std::string strPath;

    void EnvShutdown();

public:
    mutable CCriticalSection cs_db;
    std::unique_ptr<DbEnv> dbenv;
    std::map<std::string, int> mapFileUseCount;
    std::map<std::string, Db *> mapDb;

    CDBEnv();
    ~CDBEnv();
    void Reset();

    void MakeMock();
    bool IsMock() const { return fMockDb; }

    /**
     * Verify that database file strFile is OK. If it is not, call the callback
     * to try to recover.
     * This must be called BEFORE strFile is opened.
     * Returns true if strFile is OK.
     */
    enum VerifyResult { VERIFY_OK, RECOVER_OK, RECOVER_FAIL };
    typedef bool (*recoverFunc_type)(const std::string &strFile,
                                     std::string &out_backup_filename);
    VerifyResult Verify(const std::string &strFile,
                        recoverFunc_type recoverFunc,
                        std::string &out_backup_filename);

    /**
     * Salvage data from a file that Verify says is bad.
     * fAggressive sets the DB_AGGRESSIVE flag (see berkeley DB->verify() method
     * documentation).
     * Appends binary key/value pairs to vResult, returns true if successful.
     * NOTE: reads the entire database into memory, so cannot be used
     * for huge databases.
     */
    typedef std::pair<std::vector<uint8_t>, std::vector<uint8_t>> KeyValPair;
    bool Salvage(const std::string &strFile, bool fAggressive,
                 std::vector<KeyValPair> &vResult);

    bool Open(const fs::path &path);
    void Close();
    void Flush(bool fShutdown);
    void CheckpointLSN(const std::string &strFile);

    void CloseDb(const std::string &strFile);

    DbTxn *TxnBegin(int flags = DB_TXN_WRITE_NOSYNC) {
        DbTxn *ptxn = nullptr;
        int ret = dbenv->txn_begin(nullptr, &ptxn, flags);
        if (!ptxn || ret != 0) return nullptr;
        return ptxn;
    }
};

extern CDBEnv bitdb;

/**
 * An instance of this class represents one database.
 * For BerkeleyDB this is just a (env, strFile) tuple.
 */
class CWalletDBWrapper {
    friend class CDB;

public:
    /** Create dummy DB handle */
    CWalletDBWrapper()
        : nLastSeen(0), nLastFlushed(0), nLastWalletUpdate(0), env(nullptr) {}

    /** Create DB handle to real database */
    CWalletDBWrapper(CDBEnv *env_in, const std::string &strFile_in)
        : nLastSeen(0), nLastFlushed(0), nLastWalletUpdate(0), env(env_in),
          strFile(strFile_in) {}

    /** Rewrite the entire database on disk, with the exception of key pszSkip
     * if non-zero
     */
    bool Rewrite(const char *pszSkip = nullptr);

    /** Back up the entire database to a file.
     */
    bool Backup(const std::string &strDest);

    /** Get a name for this database, for debugging etc.
     */
    std::string GetName() const { return strFile; }

    /** Make sure all changes are flushed to disk.
     */
    void Flush(bool shutdown);

    void IncrementUpdateCounter();

    std::atomic<unsigned int> nUpdateCounter;
    unsigned int nLastSeen;
    unsigned int nLastFlushed;
    int64_t nLastWalletUpdate;

private:
    /** BerkeleyDB specific */
    CDBEnv *env;
    std::string strFile;

    /**
     * Return whether this database handle is a dummy for testing.
     * Only to be used at a low level, application should ideally not care
     * about this.
     */
    bool IsDummy() { return env == nullptr; }
};

/** RAII class that provides access to a Berkeley database */
class CDB {
protected:
    Db *pdb;
    std::string strFile;
    DbTxn *activeTxn;
    bool fReadOnly;
    bool fFlushOnClose;
    CDBEnv *env;

public:
    explicit CDB(CWalletDBWrapper &dbw, const char *pszMode = "r+",
                 bool fFlushOnCloseIn = true);
    ~CDB() { Close(); }

    void Flush();
    void Close();
    static bool Recover(const std::string &filename, void *callbackDataIn,
                        bool (*recoverKVcallback)(void *callbackData,
                                                  CDataStream ssKey,
                                                  CDataStream ssValue),
                        std::string &out_backup_filename);

    /* flush the wallet passively (TRY_LOCK)
       ideal to be called periodically */
    static bool PeriodicFlush(CWalletDBWrapper &dbw);
    /* verifies the database environment */
    static bool VerifyEnvironment(const std::string &walletFile,
                                  const fs::path &walletDir,
                                  std::string &errorStr);
    /* verifies the database file */
    static bool VerifyDatabaseFile(const std::string &walletFile,
                                   const fs::path &walletDir,
                                   std::string &warningStr,
                                   std::string &errorStr,
                                   CDBEnv::recoverFunc_type recoverFunc);

private:
    CDB(const CDB &);
    void operator=(const CDB &);

public:
    template <typename K, typename T> bool Read(const K &key, T &value) {
        if (!pdb) {
            return false;
        }

        // Key
        CDataStream ssKey(SER_DISK, CLIENT_VERSION);
        ssKey.reserve(1000);
        ssKey << key;
        Dbt datKey(ssKey.data(), ssKey.size());

        // Read
        Dbt datValue;
        datValue.set_flags(DB_DBT_MALLOC);
        int ret = pdb->get(activeTxn, &datKey, &datValue, 0);
        memset(datKey.get_data(), 0, datKey.get_size());
        if (datValue.get_data() == nullptr) {
            return false;
        }

        // Unserialize value
        try {
            CDataStream ssValue((char *)datValue.get_data(),
                                (char *)datValue.get_data() +
                                    datValue.get_size(),
                                SER_DISK, CLIENT_VERSION);
            ssValue >> value;
        } catch (const std::exception &) {
            return false;
        }

        // Clear and free memory
        memset(datValue.get_data(), 0, datValue.get_size());
        free(datValue.get_data());
        return (ret == 0);
    }

    template <typename K, typename T>
    bool Write(const K &key, const T &value, bool fOverwrite = true) {
        if (!pdb) {
            return true;
        }
        if (fReadOnly) {
            assert(!"Write called on database in read-only mode");
        }

        // Key
        CDataStream ssKey(SER_DISK, CLIENT_VERSION);
        ssKey.reserve(1000);
        ssKey << key;
        Dbt datKey(ssKey.data(), ssKey.size());

        // Value
        CDataStream ssValue(SER_DISK, CLIENT_VERSION);
        ssValue.reserve(10000);
        ssValue << value;
        Dbt datValue(ssValue.data(), ssValue.size());

        // Write
        int ret = pdb->put(activeTxn, &datKey, &datValue,
                           (fOverwrite ? 0 : DB_NOOVERWRITE));

        // Clear memory in case it was a private key
        memset(datKey.get_data(), 0, datKey.get_size());
        memset(datValue.get_data(), 0, datValue.get_size());
        return (ret == 0);
    }

    template <typename K> bool Erase(const K &key) {
        if (!pdb) {
            return false;
        }
        if (fReadOnly) {
            assert(!"Erase called on database in read-only mode");
        }

        // Key
        CDataStream ssKey(SER_DISK, CLIENT_VERSION);
        ssKey.reserve(1000);
        ssKey << key;
        Dbt datKey(ssKey.data(), ssKey.size());

        // Erase
        int ret = pdb->del(activeTxn, &datKey, 0);

        // Clear memory
        memset(datKey.get_data(), 0, datKey.get_size());
        return (ret == 0 || ret == DB_NOTFOUND);
    }

    template <typename K> bool Exists(const K &key) {
        if (!pdb) {
            return false;
        }

        // Key
        CDataStream ssKey(SER_DISK, CLIENT_VERSION);
        ssKey.reserve(1000);
        ssKey << key;
        Dbt datKey(ssKey.data(), ssKey.size());

        // Exists
        int ret = pdb->exists(activeTxn, &datKey, 0);

        // Clear memory
        memset(datKey.get_data(), 0, datKey.get_size());
        return (ret == 0);
    }

    Dbc *GetCursor() {
        if (!pdb) {
            return nullptr;
        }
        Dbc *pcursor = nullptr;
        int ret = pdb->cursor(nullptr, &pcursor, 0);
        if (ret != 0) {
            return nullptr;
        }
        return pcursor;
    }

    int ReadAtCursor(Dbc *pcursor, CDataStream &ssKey, CDataStream &ssValue,
                     bool setRange = false) {
        // Read at cursor
        Dbt datKey;
        unsigned int fFlags = DB_NEXT;
        if (setRange) {
            datKey.set_data(ssKey.data());
            datKey.set_size(ssKey.size());
            fFlags = DB_SET_RANGE;
        }
        Dbt datValue;
        datKey.set_flags(DB_DBT_MALLOC);
        datValue.set_flags(DB_DBT_MALLOC);
        int ret = pcursor->get(&datKey, &datValue, fFlags);
        if (ret != 0) {
            return ret;
        } else if (datKey.get_data() == nullptr ||
                   datValue.get_data() == nullptr) {
            return 99999;
        }

        // Convert to streams
        ssKey.SetType(SER_DISK);
        ssKey.clear();
        ssKey.write((char *)datKey.get_data(), datKey.get_size());
        ssValue.SetType(SER_DISK);
        ssValue.clear();
        ssValue.write((char *)datValue.get_data(), datValue.get_size());

        // Clear and free memory
        memset(datKey.get_data(), 0, datKey.get_size());
        memset(datValue.get_data(), 0, datValue.get_size());
        free(datKey.get_data());
        free(datValue.get_data());
        return 0;
    }

public:
    bool TxnBegin() {
        if (!pdb || activeTxn) {
            return false;
        }
        DbTxn *ptxn = bitdb.TxnBegin();
        if (!ptxn) {
            return false;
        }
        activeTxn = ptxn;
        return true;
    }

    bool TxnCommit() {
        if (!pdb || !activeTxn) {
            return false;
        }
        int ret = activeTxn->commit(0);
        activeTxn = nullptr;
        return (ret == 0);
    }

    bool TxnAbort() {
        if (!pdb || !activeTxn) {
            return false;
        }
        int ret = activeTxn->abort();
        activeTxn = nullptr;
        return (ret == 0);
    }

    bool ReadVersion(int &nVersion) {
        nVersion = 0;
        return Read(std::string("version"), nVersion);
    }

    bool WriteVersion(int nVersion) {
        return Write(std::string("version"), nVersion);
    }

    static bool Rewrite(CWalletDBWrapper &dbw, const char *pszSkip = nullptr);
};

#endif // BITCOIN_WALLET_DB_H
