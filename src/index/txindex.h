// Copyright (c) 2017-2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_INDEX_TXINDEX_H
#define BITCOIN_INDEX_TXINDEX_H

#include <index/base.h>

#include <memory>

struct BlockHash;
struct TxId;

static constexpr bool DEFAULT_TXINDEX{false};

/**
 * TxIndex is used to look up transactions included in the blockchain by ID.
 * The index is written to a LevelDB database and records the filesystem
 * location of each transaction by transaction ID.
 */
class TxIndex final : public BaseIndex {
protected:
    class DB;

private:
    const std::unique_ptr<DB> m_db;

    bool AllowPrune() const override { return false; }

protected:
    bool WriteBlock(const CBlock &block, const CBlockIndex *pindex) override;

    BaseIndex::DB &GetDB() const override;

public:
    /// Constructs the index, which becomes available to be queried.
    explicit TxIndex(std::unique_ptr<interfaces::Chain> chain,
                     size_t n_cache_size, bool f_memory = false,
                     bool f_wipe = false);

    // Destructor is declared because this class contains a unique_ptr to an
    // incomplete type.
    virtual ~TxIndex() override;

    /// Look up a transaction by identifier.
    ///
    /// @param[in]   txid  The ID of the transaction to be returned.
    /// @param[out]  block_hash  The hash of the block the transaction is found
    /// in.
    /// @param[out]  tx  The transaction itself.
    /// @return  true if transaction is found, false otherwise
    bool FindTx(const TxId &txid, BlockHash &block_hash,
                CTransactionRef &tx) const;
};

/// The global transaction index, used in GetTransaction. May be null.
extern std::unique_ptr<TxIndex> g_txindex;

#endif // BITCOIN_INDEX_TXINDEX_H
