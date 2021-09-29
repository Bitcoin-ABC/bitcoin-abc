// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_TXDB_H
#define BITCOIN_TXDB_H

#include <blockfileinfo.h>
#include <coins.h>
#include <dbwrapper.h>
#include <flatfile.h>
#include <primitives/block.h>

#include <memory>
#include <string>
#include <utility>
#include <vector>

struct BlockHash;
class CBlockIndex;
class CCoinsViewDBCursor;

namespace Consensus {
struct Params;
}

//! min. -dbcache (MiB)
static constexpr int64_t MIN_DB_CACHE_MB = 4;
//! max. -dbcache (MiB)
static constexpr int64_t MAX_DB_CACHE_MB = sizeof(void *) > 4 ? 16384 : 1024;
//! -dbcache default (MiB)
static constexpr int64_t DEFAULT_DB_CACHE_MB = 1024;
//! -dbbatchsize default (bytes)
static constexpr int64_t DEFAULT_DB_BATCH_SIZE = 16 << 20;
//! Max memory allocated to block tree DB specific cache, if no -txindex (MiB)
static constexpr int64_t MAX_BLOCK_DB_CACHE_MB = 2;
//! Max memory allocated to block tree DB specific cache, if -txindex (MiB)
// Unlike for the UTXO database, for the txindex scenario the leveldb cache make
// a meaningful difference:
// https://github.com/bitcoin/bitcoin/pull/8273#issuecomment-229601991
static constexpr int64_t MAX_TX_INDEX_CACHE_MB = 1024;
//! Max memory allocated to all block filter index caches combined in MiB.
static constexpr int64_t MAX_FILTER_INDEX_CACHE_MB = 1024;
//! Max memory allocated to coin DB specific cache (MiB)
static constexpr int64_t MAX_COINS_DB_CACHE_MB = 8;

// Actually declared in validation.cpp; can't include because of circular
// dependency.
extern RecursiveMutex cs_main;

/** CCoinsView backed by the coin database (chainstate/) */
class CCoinsViewDB final : public CCoinsView {
protected:
    std::unique_ptr<CDBWrapper> m_db;
    fs::path m_ldb_path;
    bool m_is_memory;

public:
    /**
     * @param[in] ldb_path    Location in the filesystem where leveldb data will
     * be stored.
     */
    explicit CCoinsViewDB(fs::path ldb_path, size_t nCacheSize, bool fMemory,
                          bool fWipe);

    bool GetCoin(const COutPoint &outpoint, Coin &coin) const override;
    bool HaveCoin(const COutPoint &outpoint) const override;
    BlockHash GetBestBlock() const override;
    std::vector<BlockHash> GetHeadBlocks() const override;
    bool BatchWrite(CCoinsMap &mapCoins, const BlockHash &hashBlock) override;
    CCoinsViewCursor *Cursor() const override;

    //! Attempt to update from an older database format.
    //! Returns whether an error occurred.
    bool Upgrade();
    size_t EstimateSize() const override;

    //! Dynamically alter the underlying leveldb cache size.
    void ResizeCache(size_t new_cache_size) EXCLUSIVE_LOCKS_REQUIRED(cs_main);
};

/** Specialization of CCoinsViewCursor to iterate over a CCoinsViewDB */
class CCoinsViewDBCursor : public CCoinsViewCursor {
public:
    ~CCoinsViewDBCursor() {}

    bool GetKey(COutPoint &key) const override;
    bool GetValue(Coin &coin) const override;
    unsigned int GetValueSize() const override;

    bool Valid() const override;
    void Next() override;

private:
    CCoinsViewDBCursor(CDBIterator *pcursorIn, const BlockHash &hashBlockIn)
        : CCoinsViewCursor(hashBlockIn), pcursor(pcursorIn) {}
    std::unique_ptr<CDBIterator> pcursor;
    std::pair<char, COutPoint> keyTmp;

    friend class CCoinsViewDB;
};

/** Access to the block database (blocks/index/) */
class CBlockTreeDB : public CDBWrapper {
public:
    explicit CBlockTreeDB(size_t nCacheSize, bool fMemory = false,
                          bool fWipe = false);

    bool WriteBatchSync(
        const std::vector<std::pair<int, const CBlockFileInfo *>> &fileInfo,
        int nLastFile, const std::vector<const CBlockIndex *> &blockinfo);
    bool ReadBlockFileInfo(int nFile, CBlockFileInfo &info);
    bool ReadLastBlockFile(int &nFile);
    bool WriteReindexing(bool fReindexing);
    bool IsReindexing() const;
    bool WriteFlag(const std::string &name, bool fValue);
    bool ReadFlag(const std::string &name, bool &fValue);
    bool LoadBlockIndexGuts(
        const Consensus::Params &params,
        std::function<CBlockIndex *(const BlockHash &)> insertBlockIndex);

    //! Attempt to update from an older database format.
    //! Returns whether an error occurred.
    bool Upgrade(const Consensus::Params &params);
};

#endif // BITCOIN_TXDB_H
