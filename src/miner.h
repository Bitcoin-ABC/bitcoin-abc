// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
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

class CBlockIndex;
class CChainParams;
class Config;
class CReserveKey;
class CScript;
class CWallet;

static const bool DEFAULT_PRINTPRIORITY = false;

struct CBlockTemplateEntry {
    CTransactionRef tx;
    //!< Total real fees paid by the transaction and cached to avoid parent
    //!< lookup
    Amount txFee;
    //!< Cached total size of the transaction to avoid reserializing transaction
    size_t txSize;
    //!< Cached total number of SigOps
    uint64_t txSigOps;

    CBlockTemplateEntry(CTransactionRef _tx, Amount _fees, uint64_t _size,
                        int64_t _sigOps)
        : tx(_tx), txFee(_fees), txSize(_size), txSigOps(_sigOps) {}
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
        nBillableSizeWithAncestors = entry->GetBillableSizeWithAncestors();
        nModFeesWithAncestors = entry->GetModFeesWithAncestors();
        nSigOpCountWithAncestors = entry->GetSigOpCountWithAncestors();
    }

    CTxMemPool::txiter iter;
    uint64_t nSizeWithAncestors;
    uint64_t nBillableSizeWithAncestors;
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

// This matches the calculation in CompareTxMemPoolEntryByAncestorFee,
// except operating on CTxMemPoolModifiedEntry.
// TODO: refactor to avoid duplication of this logic.
struct CompareModifiedEntry {
    bool operator()(const CTxMemPoolModifiedEntry &a,
                    const CTxMemPoolModifiedEntry &b) const {
        double f1 = b.nSizeWithAncestors * (a.nModFeesWithAncestors / SATOSHI);
        double f2 = a.nSizeWithAncestors * (b.nModFeesWithAncestors / SATOSHI);
        if (f1 == f2) {
            return CTxMemPool::CompareIteratorByHash()(a.iter, b.iter);
        }
        return f1 > f2;
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
        return CTxMemPool::CompareIteratorByHash()(a, b);
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
            CompareModifiedEntry>>>
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
        e.nBillableSizeWithAncestors -= iter->GetTxBillableSize();
        e.nSigOpCountWithAncestors -= iter->GetSigOpCount();
    }

    CTxMemPool::txiter iter;
};

/** Generate a new block, without valid proof-of-work */
class BlockAssembler {
private:
    // The constructed block template
    std::unique_ptr<CBlockTemplate> pblocktemplate;
    // A convenience pointer that always refers to the CBlock in pblocktemplate
    CBlock *pblock;

    // Configuration parameters for the block size
    uint64_t nMaxGeneratedBlockSize;
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

    const Config *config;
    const CTxMemPool *mempool;

    // Variables used for addPriorityTxs
    int lastFewTxs;

public:
    BlockAssembler(const Config &_config, const CTxMemPool &mempool);
    /** Construct a new block template with coinbase to scriptPubKeyIn */
    std::unique_ptr<CBlockTemplate>
    CreateNewBlock(const CScript &scriptPubKeyIn);

    uint64_t GetMaxGeneratedBlockSize() const { return nMaxGeneratedBlockSize; }

private:
    // utility functions
    /** Clear the block's state and prepare for assembling a new block */
    void resetBlock();
    /** Add a tx to the block */
    void AddToBlock(CTxMemPool::txiter iter);

    // Methods for how to add transactions to a block.
    /** Add transactions based on tx "priority" */
    void addPriorityTxs();
    /** Add transactions based on feerate including unconfirmed ancestors
     * Increments nPackagesSelected / nDescendantsUpdated with corresponding
     * statistics from the package selection (for logging statistics). */
    void addPackageTxs(int &nPackagesSelected, int &nDescendantsUpdated);

    /** Enum for the results from TestForBlock */
    enum class TestForBlockResult : uint8_t {
        TXFits = 0,
        TXCantFit = 1,
        BlockFinished = 3,
    };

    // helper function for addPriorityTxs
    /** Test if tx will still "fit" in the block */
    TestForBlockResult TestForBlock(CTxMemPool::txiter iter);
    /** Test if tx still has unconfirmed parents not yet in block */
    bool isStillDependent(CTxMemPool::txiter iter);

    // helper functions for addPackageTxs()
    /** Remove confirmed (inBlock) entries from given set */
    void onlyUnconfirmed(CTxMemPool::setEntries &testSet);
    /** Test if a new package would "fit" in the block */
    bool TestPackage(uint64_t packageSize, int64_t packageSigOpsCost) const;
    /** Perform checks on each transaction in a package:
     * locktime, serialized size (if necessary)
     * These checks should always succeed, and they're here
     * only as an extra check in case of suboptimal node configuration */
    bool TestPackageTransactions(const CTxMemPool::setEntries &package);
    /** Return true if given transaction from mapTx has already been evaluated,
     * or if the transaction's cached data in mapTx is incorrect. */
    bool SkipMapTxEntry(CTxMemPool::txiter it,
                        indexed_modified_transaction_set &mapModifiedTx,
                        CTxMemPool::setEntries &failedTx);
    /** Sort the package in an order that is valid to appear in a block */
    void SortForBlock(const CTxMemPool::setEntries &package,
                      CTxMemPool::txiter entry,
                      std::vector<CTxMemPool::txiter> &sortedEntries);
    /** Add descendants of given transactions to mapModifiedTx with ancestor
     * state updated assuming given transactions are inBlock. Returns number
     * of updated descendants. */
    int UpdatePackagesForAdded(const CTxMemPool::setEntries &alreadyAdded,
                               indexed_modified_transaction_set &mapModifiedTx);
};

/** Modify the extranonce in a block */
void IncrementExtraNonce(const Config &config, CBlock *pblock,
                         const CBlockIndex *pindexPrev,
                         unsigned int &nExtraNonce);
int64_t UpdateTime(CBlockHeader *pblock, const Config &config,
                   const CBlockIndex *pindexPrev);
#endif // BITCOIN_MINER_H
