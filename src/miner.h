// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_MINER_H
#define BITCOIN_MINER_H

#include <primitives/block.h>
#include <txmempool.h>

#include <boost/multi_index/ordered_index.hpp>
#include <boost/multi_index_container.hpp>

#include <cstdint>
#include <memory>
#include <optional>

class CBlockIndex;
class CChainParams;
class Config;
class CScript;

namespace Consensus {
struct Params;
}

static const bool DEFAULT_PRINTPRIORITY = false;

struct CBlockTemplateEntry {
    CTransactionRef tx;
    Amount fees;
    int64_t sigOpCount;

    CBlockTemplateEntry(CTransactionRef _tx, Amount _fees, int64_t _sigOpCount)
        : tx(_tx), fees(_fees), sigOpCount(_sigOpCount){};
};

struct CBlockTemplate {
    CBlock block;

    std::vector<CBlockTemplateEntry> entries;
};

// Container for tracking updates to ancestor feerate as we include (parent)
// transactions in a block
struct CTxMemPoolModifiedEntry {
    explicit CTxMemPoolModifiedEntry(CTxMemPool::txiter entry) {
        iter = entry;
        nSizeWithAncestors = entry->GetSizeWithAncestors();
        nModFeesWithAncestors = entry->GetModFeesWithAncestors();
        nSigOpCountWithAncestors = entry->GetSigOpCountWithAncestors();
    }

    Amount GetModifiedFee() const { return iter->GetModifiedFee(); }
    uint64_t GetSizeWithAncestors() const { return nSizeWithAncestors; }
    uint64_t GetVirtualSizeWithAncestors() const;
    Amount GetModFeesWithAncestors() const { return nModFeesWithAncestors; }
    size_t GetTxSize() const { return iter->GetTxSize(); }
    size_t GetTxVirtualSize() const { return iter->GetTxVirtualSize(); }
    const CTransaction &GetTx() const { return iter->GetTx(); }

    CTxMemPool::txiter iter;
    uint64_t nSizeWithAncestors;
    Amount nModFeesWithAncestors;
    int64_t nSigOpCountWithAncestors;
};

/**
 * Comparator for CTxMemPool::txiter objects.
 * It simply compares the internal memory address of the CTxMemPoolEntry object
 * pointed to. This means it has no meaning, and is only useful for using them
 * as key in other indexes.
 */
struct CompareCTxMemPoolIter {
    bool operator()(const CTxMemPool::txiter &a,
                    const CTxMemPool::txiter &b) const {
        return &(*a) < &(*b);
    }
};

struct modifiedentry_iter {
    typedef CTxMemPool::txiter result_type;
    result_type operator()(const CTxMemPoolModifiedEntry &entry) const {
        return entry.iter;
    }
};

// A comparator that sorts transactions based on number of ancestors.
// This is sufficient to sort an ancestor package in an order that is valid
// to appear in a block.
struct CompareTxIterByAncestorCount {
    bool operator()(const CTxMemPool::txiter &a,
                    const CTxMemPool::txiter &b) const {
        if (a->GetCountWithAncestors() != b->GetCountWithAncestors()) {
            return a->GetCountWithAncestors() < b->GetCountWithAncestors();
        }
        return CompareIteratorById()(a, b);
    }
};

typedef boost::multi_index_container<
    CTxMemPoolModifiedEntry,
    boost::multi_index::indexed_by<
        boost::multi_index::ordered_unique<modifiedentry_iter,
                                           CompareCTxMemPoolIter>,
        // sorted by modified ancestor fee rate
        boost::multi_index::ordered_non_unique<
            // Reuse same tag from CTxMemPool's similar index
            boost::multi_index::tag<ancestor_score>,
            boost::multi_index::identity<CTxMemPoolModifiedEntry>,
            CompareTxMemPoolEntryByAncestorFee>>>
    indexed_modified_transaction_set;

typedef indexed_modified_transaction_set::nth_index<0>::type::iterator
    modtxiter;
typedef indexed_modified_transaction_set::index<ancestor_score>::type::iterator
    modtxscoreiter;

struct update_for_parent_inclusion {
    explicit update_for_parent_inclusion(CTxMemPool::txiter it) : iter(it) {}

    void operator()(CTxMemPoolModifiedEntry &e) {
        e.nModFeesWithAncestors -= iter->GetFee();
        e.nSizeWithAncestors -= iter->GetTxSize();
        e.nSigOpCountWithAncestors -= iter->GetSigOpCount();
    }

    CTxMemPool::txiter iter;
};

/** Generate a new block, without valid proof-of-work */
class BlockAssembler {
private:
    // The constructed block template
    std::unique_ptr<CBlockTemplate> pblocktemplate;

    // Configuration parameters for the block size
    uint64_t nMaxGeneratedBlockSize;
    uint64_t nMaxGeneratedBlockSigChecks;
    CFeeRate blockMinFeeRate;

    // Information on the current status of the block
    uint64_t nBlockSize;
    uint64_t nBlockTx;
    uint64_t nBlockSigOps;
    Amount nFees;
    CTxMemPool::setEntries inBlock;

    // Chain context for the block
    int nHeight;
    int64_t nLockTimeCutoff;
    int64_t nMedianTimePast;
    const CChainParams &chainParams;

    const CTxMemPool &m_mempool;

public:
    struct Options {
        Options();
        uint64_t nExcessiveBlockSize;
        uint64_t nMaxGeneratedBlockSize;
        CFeeRate blockMinFeeRate;
    };

    BlockAssembler(const Config &config, const CTxMemPool &mempool);
    BlockAssembler(const CChainParams &params, const CTxMemPool &mempool,
                   const Options &options);

    /** Construct a new block template with coinbase to scriptPubKeyIn */
    std::unique_ptr<CBlockTemplate>
    CreateNewBlock(const CScript &scriptPubKeyIn);

    uint64_t GetMaxGeneratedBlockSize() const { return nMaxGeneratedBlockSize; }

    static std::optional<int64_t> m_last_block_num_txs;
    static std::optional<int64_t> m_last_block_size;

private:
    // utility functions
    /** Clear the block's state and prepare for assembling a new block */
    void resetBlock();
    /** Add a tx to the block */
    void AddToBlock(CTxMemPool::txiter iter);

    // Methods for how to add transactions to a block.
    /**
     * Add transactions based on feerate including unconfirmed ancestors.
     * Increments nPackagesSelected / nDescendantsUpdated with corresponding
     * statistics from the package selection (for logging statistics).
     */
    void addPackageTxs(int &nPackagesSelected, int &nDescendantsUpdated)
        EXCLUSIVE_LOCKS_REQUIRED(m_mempool.cs);

    // helper functions for addPackageTxs()
    /** Remove confirmed (inBlock) entries from given set */
    void onlyUnconfirmed(CTxMemPool::setEntries &testSet);
    /** Test if a new package would "fit" in the block */
    bool TestPackage(uint64_t packageSize, int64_t packageSigOpCount) const;
    /**
     * Perform checks on each transaction in a package:
     * locktime, serialized size (if necessary). These checks should always
     * succeed, and they're here only as an extra check in case of suboptimal
     * node configuration.
     */
    bool TestPackageTransactions(const CTxMemPool::setEntries &package);
    /**
     * Return true if given transaction from mapTx has already been evaluated,
     * or if the transaction's cached data in mapTx is incorrect.
     */
    bool SkipMapTxEntry(CTxMemPool::txiter it,
                        indexed_modified_transaction_set &mapModifiedTx,
                        CTxMemPool::setEntries &failedTx)
        EXCLUSIVE_LOCKS_REQUIRED(m_mempool.cs);
    /** Sort the package in an order that is valid to appear in a block */
    void SortForBlock(const CTxMemPool::setEntries &package,
                      std::vector<CTxMemPool::txiter> &sortedEntries);
    /**
     * Add descendants of given transactions to mapModifiedTx with ancestor
     * state updated assuming given transactions are inBlock. Returns number of
     * updated descendants.
     */
    int UpdatePackagesForAdded(const CTxMemPool::setEntries &alreadyAdded,
                               indexed_modified_transaction_set &mapModifiedTx)
        EXCLUSIVE_LOCKS_REQUIRED(m_mempool.cs);
};

/** Modify the extranonce in a block */
void IncrementExtraNonce(CBlock *pblock, const CBlockIndex *pindexPrev,
                         uint64_t nExcessiveBlockSize,
                         unsigned int &nExtraNonce);
int64_t UpdateTime(CBlockHeader *pblock, const CChainParams &chainParams,
                   const CBlockIndex *pindexPrev);
#endif // BITCOIN_MINER_H
