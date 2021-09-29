// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_WALLET_BDB_H
#define BITCOIN_WALLET_BDB_H

#include <clientversion.h>
#include <fs.h>
#include <serialize.h>
#include <streams.h>
#include <util/system.h>
#include <wallet/db.h>

#include <db_cxx.h>

#include <atomic>
#include <map>
#include <memory>
#include <string>
#include <unordered_map>
#include <vector>

struct bilingual_str;

static const unsigned int DEFAULT_WALLET_DBLOGSIZE = 100;
static const bool DEFAULT_WALLET_PRIVDB = true;

struct WalletDatabaseFileId {
    u_int8_t value[DB_FILE_ID_LEN];
    bool operator==(const WalletDatabaseFileId &rhs) const;
};

class BerkeleyDatabase;

class BerkeleyEnvironment {
private:
    bool fDbEnvInit;
    bool fMockDb;
    // Don't change into fs::path, as that can result in
    // shutdown problems/crashes caused by a static initialized internal
    // pointer.
    std::string strPath;

public:
    std::unique_ptr<DbEnv> dbenv;
    std::map<std::string, std::reference_wrapper<BerkeleyDatabase>> m_databases;
    std::unordered_map<std::string, WalletDatabaseFileId> m_fileids;
    std::condition_variable_any m_db_in_use;

    BerkeleyEnvironment(const fs::path &env_directory);
    BerkeleyEnvironment();
    ~BerkeleyEnvironment();
    void Reset();

    void MakeMock();
    bool IsMock() const { return fMockDb; }
    bool IsInitialized() const { return fDbEnvInit; }
    bool IsDatabaseLoaded(const std::string &db_filename) const {
        return m_databases.find(db_filename) != m_databases.end();
    }
    fs::path Directory() const { return strPath; }

    bool Open(bilingual_str &error);
    void Close();
    void Flush(bool fShutdown);
    void CheckpointLSN(const std::string &strFile);

    void CloseDb(const std::string &strFile);
    void ReloadDbEnv();

    DbTxn *TxnBegin(int flags = DB_TXN_WRITE_NOSYNC) {
        DbTxn *ptxn = nullptr;
        int ret = dbenv->txn_begin(nullptr, &ptxn, flags);
        if (!ptxn || ret != 0) {
            return nullptr;
        }
        return ptxn;
    }
};

/** Get BerkeleyEnvironment and database filename given a wallet path. */
std::shared_ptr<BerkeleyEnvironment>
GetWalletEnv(const fs::path &wallet_path, std::string &database_filename);

/** Return whether a BDB wallet database is currently loaded. */
bool IsBDBWalletLoaded(const fs::path &wallet_path);

class BerkeleyBatch;

/**
 * An instance of this class represents one database.
 * For BerkeleyDB this is just a (env, strFile) tuple.
 */
class BerkeleyDatabase : public WalletDatabase {
public:
    BerkeleyDatabase() = delete;

    /** Create DB handle to real database */
    BerkeleyDatabase(std::shared_ptr<BerkeleyEnvironment> envIn,
                     std::string filename)
        : WalletDatabase(), env(std::move(envIn)),
          strFile(std::move(filename)) {
        auto inserted =
            this->env->m_databases.emplace(strFile, std::ref(*this));
        assert(inserted.second);
    }

    ~BerkeleyDatabase() override;

    /**
     * Open the database if it is not already opened.
     * Dummy function, doesn't do anything right now, but is needed for class
     * abstraction
     */
    void Open(const char *mode) override;

    /**
     * Rewrite the entire database on disk, with the exception of key pszSkip if
     * non-zero
     */
    bool Rewrite(const char *pszSkip = nullptr) override;

    /** Indicate the a new database user has began using the database. */
    void AddRef() override;

    /**
     * Indicate that database user has stopped using the database and that it
     * could be flushed or closed.
     */
    void RemoveRef() override;

    /**
     * Back up the entire database to a file.
     */
    bool Backup(const std::string &strDest) const override;

    /**
     * Make sure all changes are flushed to database file.
     */
    void Flush() override;

    /**
     * Flush to the database file and close the database.
     * Also close the environment if no other databases are open in it.
     */
    void Close() override;

    /**
     * flush the wallet passively (TRY_LOCK)
     * ideal to be called periodically
     */
    bool PeriodicFlush() override;

    void IncrementUpdateCounter() override;

    void ReloadDbEnv() override;

    /** Verifies the environment and database file */
    bool Verify(bilingual_str &error) override;

    /**
     * Pointer to shared database environment.
     *
     * Normally there is only one BerkeleyDatabase object per
     * BerkeleyEnvivonment, but in the special, backwards compatible case where
     * multiple wallet BDB data files are loaded from the same directory, this
     * will point to a shared instance that gets freed when the last data file
     * is closed.
     */
    std::shared_ptr<BerkeleyEnvironment> env;

    /**
     * Database pointer. This is initialized lazily and reset during flushes,
     * so it can be null.
     */
    std::unique_ptr<Db> m_db;

    std::string strFile;

    /** Make a BerkeleyBatch connected to this database */
    std::unique_ptr<DatabaseBatch>
    MakeBatch(const char *mode = "r+", bool flush_on_close = true) override;
};

/** RAII class that provides access to a Berkeley database */
class BerkeleyBatch : public DatabaseBatch {
    /** RAII class that automatically cleanses its data on destruction */
    class SafeDbt final {
        Dbt m_dbt;

    public:
        // construct Dbt with internally-managed data
        SafeDbt();
        // construct Dbt with provided data
        SafeDbt(void *data, size_t size);
        ~SafeDbt();

        // delegate to Dbt
        const void *get_data() const;
        u_int32_t get_size() const;

        // conversion operator to access the underlying Dbt
        operator Dbt *();
    };

private:
    bool ReadKey(CDataStream &&key, CDataStream &value) override;
    bool WriteKey(CDataStream &&key, CDataStream &&value,
                  bool overwrite = true) override;
    bool EraseKey(CDataStream &&key) override;
    bool HasKey(CDataStream &&key) override;

protected:
    Db *pdb;
    std::string strFile;
    DbTxn *activeTxn;
    Dbc *m_cursor;
    bool fReadOnly;
    bool fFlushOnClose;
    BerkeleyEnvironment *env;
    BerkeleyDatabase &m_database;

public:
    explicit BerkeleyBatch(BerkeleyDatabase &database,
                           const char *pszMode = "r+",
                           bool fFlushOnCloseIn = true);
    ~BerkeleyBatch() override;

    BerkeleyBatch(const BerkeleyBatch &) = delete;
    BerkeleyBatch &operator=(const BerkeleyBatch &) = delete;

    void Flush() override;
    void Close() override;

    bool StartCursor() override;
    bool ReadAtCursor(CDataStream &ssKey, CDataStream &ssValue,
                      bool &complete) override;
    void CloseCursor() override;
    bool TxnBegin() override;
    bool TxnCommit() override;
    bool TxnAbort() override;
};

#endif // BITCOIN_WALLET_BDB_H
