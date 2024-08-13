// Copyright (c) 2021 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_TXPOOL_H
#define BITCOIN_TXPOOL_H

#include <nodeid.h>
#include <primitives/block.h>
#include <primitives/transaction.h>

#include <sync.h>
#include <util/time.h>

#include <chrono>
#include <map>
#include <set>
#include <vector>

class FastRandomContext;

/**
 * A class to store and track transactions by peers.
 */
class TxPool {
public:
    TxPool(const std::string &txKindIn, std::chrono::seconds expireTimeIn,
           std::chrono::seconds expireIntervalIn)
        : txKind(txKindIn), expireTime(expireTimeIn),
          expireInterval(expireIntervalIn) {}

    /** Add a new transaction to the pool */
    bool AddTx(const CTransactionRef &tx, NodeId peer)
        EXCLUSIVE_LOCKS_REQUIRED(!m_mutex);

    /** Check if we already have an the transaction */
    bool HaveTx(const TxId &txid) const EXCLUSIVE_LOCKS_REQUIRED(!m_mutex);

    /**
     * Extract a transaction from a peer's work set
     *
     * Returns nullptr if there are no transactions to work on.
     * Otherwise returns the transaction reference, and removes it from the work
     * set.
     */
    CTransactionRef GetTxToReconsider(NodeId peer)
        EXCLUSIVE_LOCKS_REQUIRED(!m_mutex);

    /** Erase a tx by txid */
    int EraseTx(const TxId &txid) EXCLUSIVE_LOCKS_REQUIRED(!m_mutex);

    /**
     * Erase all txs announced by a peer (eg, after that peer disconnects)
     */
    void EraseForPeer(NodeId peer) EXCLUSIVE_LOCKS_REQUIRED(!m_mutex);

    /** Erase all txs included in or invalidated by a new block */
    void EraseForBlock(const CBlock &block) EXCLUSIVE_LOCKS_REQUIRED(!m_mutex);

    /** Limit the txs to the given maximum */
    unsigned int LimitTxs(unsigned int max_txs, FastRandomContext &rng)
        EXCLUSIVE_LOCKS_REQUIRED(!m_mutex);

    /**
     * Add any tx that list a particular tx as a parent into the from peer's
     * work set
     */
    void AddChildrenToWorkSet(const CTransaction &tx)
        EXCLUSIVE_LOCKS_REQUIRED(!m_mutex);

    /** Does this peer have any work to do? */
    bool HaveTxToReconsider(NodeId peer) EXCLUSIVE_LOCKS_REQUIRED(!m_mutex);

    /**
     * Get all children that spend from this tx and were received from nodeid.
     * Sorted from most recent to least recent.
     */
    std::vector<CTransactionRef>
    GetChildrenFromSamePeer(const CTransactionRef &parent, NodeId nodeid) const
        EXCLUSIVE_LOCKS_REQUIRED(!m_mutex);

    /**
     * Get all children that spend from this tx but were not received from
     * nodeid. Also return which peer provided each tx.
     */
    std::vector<std::pair<CTransactionRef, NodeId>>
    GetChildrenFromDifferentPeer(const CTransactionRef &parent,
                                 NodeId nodeid) const
        EXCLUSIVE_LOCKS_REQUIRED(!m_mutex);

    /** Return how many entries exist in the pool */
    size_t Size() const EXCLUSIVE_LOCKS_REQUIRED(!m_mutex) {
        LOCK(m_mutex);
        return m_pool_txs.size();
    }

protected:
    /** The transaction kind as string, used for logging */
    const std::string txKind;
    /** Expiration time for transactions */
    const std::chrono::seconds expireTime;
    /** Minimum time between transactions expire time checks */
    const std::chrono::seconds expireInterval;

    /** Guards transactions */
    mutable Mutex m_mutex;

    struct PoolTx {
        CTransactionRef tx;
        NodeId fromPeer;
        NodeSeconds nTimeExpire;
        size_t list_pos;
    };

    /**
     * Map from txid to pool transaction record. Should be size constrained by
     * calling LimitTxs() with the desired max size.
     */
    std::map<TxId, PoolTx> m_pool_txs GUARDED_BY(m_mutex);

    /** Which peer provided the transactions that need to be reconsidered */
    std::map<NodeId, std::set<TxId>> m_peer_work_set GUARDED_BY(m_mutex);

    using PoolTxMap = decltype(m_pool_txs);

    struct IteratorComparator {
        template <typename I> bool operator()(const I &a, const I &b) const {
            return a->first < b->first;
        }
    };

    /**
     * Index from the parents' COutPoint into the m_pool_txs. Used to remove
     * transactions from the m_pool_txs
     */
    std::map<COutPoint, std::set<PoolTxMap ::iterator, IteratorComparator>>
        m_outpoint_to_tx_it GUARDED_BY(m_mutex);

    /** Pool transactions in vector for quick random eviction */
    std::vector<PoolTxMap::iterator> m_txs_list GUARDED_BY(m_mutex);

    /** Erase a transaction by txid */
    int EraseTxNoLock(const TxId &txid) EXCLUSIVE_LOCKS_REQUIRED(m_mutex);

    /** Timestamp for the next scheduled sweep of expired transactions */
    NodeSeconds m_next_sweep GUARDED_BY(m_mutex){0s};
};

#endif // BITCOIN_TXPOOL_H
