// Copyright (c) 2023 The Bitcoin Core developers
// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_KERNEL_DISCONNECTED_TRANSACTIONS_H
#define BITCOIN_KERNEL_DISCONNECTED_TRANSACTIONS_H

#include <consensus/amount.h>
#include <memusage.h>
#include <threadsafety.h>
#include <txmempool.h>
#include <util/hasher.h>

#include <boost/multi_index/hashed_index.hpp>
#include <boost/multi_index/sequenced_index.hpp>
#include <boost/multi_index_container.hpp>

#include <cassert>
#include <unordered_map>
#include <vector>

/**
 * DisconnectedBlockTransactions
 *
 * During the reorg, it's desirable to re-add previously confirmed transactions
 * to the mempool, so that anything not re-confirmed in the new chain is
 * available to be mined. However, it's more efficient to wait until the reorg
 * is complete and process all still-unconfirmed transactions at that time,
 * since we expect most confirmed transactions to (typically) still be
 * confirmed in the new chain, and re-accepting to the memory pool is expensive
 * (and therefore better to not do in the middle of reorg-processing).
 * Instead, store the disconnected transactions (in order!) as we go, remove any
 * that are included in blocks in the new chain, and then process the remaining
 * still-unconfirmed transactions at the end.
 *
 * It also enables efficient reprocessing of current mempool entries, useful
 * when (de)activating forks that result in in-mempool transactions becoming
 * invalid
 */
// multi_index tag names
struct txid_index {};
struct insertion_order {};

class DisconnectedBlockTransactions {
private:
    typedef boost::multi_index_container<
        CTransactionRef, boost::multi_index::indexed_by<
                             // hashed by txid
                             boost::multi_index::hashed_unique<
                                 boost::multi_index::tag<txid_index>,
                                 mempoolentry_txid, SaltedTxIdHasher>,
                             // sorted by order in the blockchain
                             boost::multi_index::sequenced<
                                 boost::multi_index::tag<insertion_order>>>>
        indexed_disconnected_transactions;

    indexed_disconnected_transactions queuedTx;
    uint64_t cachedInnerUsage = 0;

    struct TxInfo {
        const std::chrono::seconds time;
        const Amount feeDelta;
        const unsigned height;
        TxInfo(const std::chrono::seconds &time_, Amount feeDelta_,
               unsigned height_) noexcept
            : time(time_), feeDelta(feeDelta_), height(height_) {}
    };

    using TxInfoMap = std::unordered_map<TxId, TxInfo, SaltedTxIdHasher>;
    /// populated by importMempool(); the original tx entry times and feeDeltas
    TxInfoMap txInfo;

    void addTransaction(const CTransactionRef &tx) {
        queuedTx.insert(tx);
        cachedInnerUsage += RecursiveDynamicUsage(tx);
    }

    /// @returns a pointer into the txInfo map if tx->GetId() exists in the map,
    /// or nullptr otherwise. Note that the returned pointer is only valid for
    /// as long as its underlying map node is valid.
    const TxInfo *getTxInfo(const CTransactionRef &tx) const;

public:
    // It's almost certainly a logic bug if we don't clear out queuedTx before
    // destruction, as we add to it while disconnecting blocks, and then we
    // need to re-process remaining transactions to ensure mempool consistency.
    // For now, assert() that we've emptied out this object on destruction.
    // This assert() can always be removed if the reorg-processing code were
    // to be refactored such that this assumption is no longer true (for
    // instance if there was some other way we cleaned up the mempool after a
    // reorg, besides draining this object).
    ~DisconnectedBlockTransactions() { assert(queuedTx.empty()); }

    // Estimate the overhead of queuedTx to be 6 pointers + an allocation, as
    // no exact formula for boost::multi_index_contained is implemented.
    size_t DynamicMemoryUsage() const {
        return memusage::MallocUsage(sizeof(CTransactionRef) +
                                     6 * sizeof(void *)) *
                   queuedTx.size() +
               memusage::DynamicUsage(txInfo) + cachedInnerUsage;
    }

    const indexed_disconnected_transactions &GetQueuedTx() const {
        return queuedTx;
    }

    // Import mempool entries in topological order into queuedTx and clear the
    // mempool. Caller should call updateMempoolForReorg to reprocess these
    // transactions
    void importMempool(CTxMemPool &pool) EXCLUSIVE_LOCKS_REQUIRED(pool.cs);

    // Add entries for a block while reconstructing the topological ordering so
    // they can be added back to the mempool simply.
    void addForBlock(const std::vector<CTransactionRef> &vtx, CTxMemPool &pool)
        EXCLUSIVE_LOCKS_REQUIRED(pool.cs);

    // Remove entries based on txid_index, and update memory usage.
    void removeForBlock(const std::vector<CTransactionRef> &vtx) {
        // Short-circuit in the common case of a block being added to the tip
        if (queuedTx.empty()) {
            return;
        }
        for (auto const &tx : vtx) {
            auto it = queuedTx.find(tx->GetId());
            if (it != queuedTx.end()) {
                cachedInnerUsage -= RecursiveDynamicUsage(*it);
                queuedTx.erase(it);
                txInfo.erase(tx->GetId());
            }
        }
    }

    void removeForBlock(const std::vector<CTransactionRef> &vtx,
                        CTxMemPool &pool) EXCLUSIVE_LOCKS_REQUIRED(pool.cs);

    // Remove an entry by insertion_order index, and update memory usage.
    void removeEntry(indexed_disconnected_transactions::index<
                     insertion_order>::type::iterator entry) {
        cachedInnerUsage -= RecursiveDynamicUsage(*entry);
        txInfo.erase((*entry)->GetId());
        queuedTx.get<insertion_order>().erase(entry);
    }

    bool isEmpty() const { return queuedTx.empty(); }

    void clear() {
        cachedInnerUsage = 0;
        queuedTx.clear();
        txInfo.clear();
    }

    /**
     * Make mempool consistent after a reorg, by re-adding or recursively
     * erasing disconnected block transactions from the mempool, and also
     * removing any other transactions from the mempool that are no longer valid
     * given the new tip/height.
     *
     * Note: we assume that disconnectpool only contains transactions that are
     * NOT confirmed in the current chain nor already in the mempool (otherwise,
     * in-mempool descendants of such transactions would be removed).
     *
     * Passing fAddToMempool=false will skip trying to add the transactions
     * back, and instead just erase from the mempool as needed.
     */
    void updateMempoolForReorg(Chainstate &active_chainstate,
                               bool fAddToMempool, CTxMemPool &pool)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main, pool.cs);
};

#endif // BITCOIN_KERNEL_DISCONNECTED_TRANSACTIONS_H
