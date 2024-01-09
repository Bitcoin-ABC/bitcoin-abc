// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_TXMEMPOOL_H
#define BITCOIN_TXMEMPOOL_H

#include <coins.h>
#include <consensus/amount.h>
#include <core_memusage.h>
#include <indirectmap.h>
#include <policy/packages.h>
#include <primitives/transaction.h>
#include <rcu.h>
#include <sync.h>
#include <util/hasher.h>

#include <boost/multi_index/hashed_index.hpp>
#include <boost/multi_index/ordered_index.hpp>
#include <boost/multi_index/sequenced_index.hpp>
#include <boost/multi_index_container.hpp>

#include <atomic>
#include <map>
#include <optional>
#include <set>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

class CBlockIndex;
class CChain;
class Chainstate;
class Config;

extern RecursiveMutex cs_main;

/**
 * Fake height value used in Coins to signify they are only in the memory
 * pool(since 0.8)
 */
static const uint32_t MEMPOOL_HEIGHT = 0x7FFFFFFF;

struct LockPoints {
    // Will be set to the blockchain height and median time past values that
    // would be necessary to satisfy all relative locktime constraints (BIP68)
    // of this tx given our view of block chain history
    int height{0};
    int64_t time{0};
    // As long as the current chain descends from the highest height block
    // containing one of the inputs used in the calculation, then the cached
    // values are still valid even after a reorg.
    CBlockIndex *maxInputBlock{nullptr};
};

/**
 * Test whether the LockPoints height and time are still valid on the current
 * chain.
 */
bool TestLockPointValidity(const CChain &active_chain, const LockPoints &lp)
    EXCLUSIVE_LOCKS_REQUIRED(cs_main);

struct CompareIteratorById {
    // SFINAE for T where T is either a std::reference_wrapper<T> (e.g. a
    // CTxMemPoolEntryRef) or an iterator to a pointer type (e.g., a txiter)
    template <typename T>
    bool operator()(const std::reference_wrapper<T> &a,
                    const std::reference_wrapper<T> &b) const {
        return a.get()->GetTx().GetId() < b.get()->GetTx().GetId();
    }
    template <typename T> bool operator()(const T &a, const T &b) const {
        return (*a)->GetTx().GetId() < (*b)->GetTx().GetId();
    }
};

class CTxMemPoolEntry;
using CTxMemPoolEntryRef = RCUPtr<CTxMemPoolEntry>;

/** \class CTxMemPoolEntry
 *
 * CTxMemPoolEntry stores data about the corresponding transaction, as well as
 * data about all in-mempool transactions that depend on the transaction
 * ("descendant" transactions).
 */

class CTxMemPoolEntry {
public:
    // two aliases, should the types ever diverge
    typedef std::set<std::reference_wrapper<const CTxMemPoolEntryRef>,
                     CompareIteratorById>
        Parents;
    typedef std::set<std::reference_wrapper<const CTxMemPoolEntryRef>,
                     CompareIteratorById>
        Children;

private:
    //! Unique identifier -- used for topological sorting
    uint64_t entryId = 0;

    const CTransactionRef tx;
    mutable Parents m_parents;
    mutable Children m_children;
    //! Cached to avoid expensive parent-transaction lookups
    const Amount nFee;
    //! ... and avoid recomputing tx size
    const size_t nTxSize;
    //! ... and total memory usage
    const size_t nUsageSize;
    //! Local time when entering the mempool
    const int64_t nTime;
    //! Chain height when entering the mempool
    const unsigned int entryHeight;
    //! keep track of transactions that spend a coinbase
    const bool spendsCoinbase;
    //! Total sigChecks
    const int64_t sigChecks;
    //! Used for determining the priority of the transaction for mining in a
    //! block
    Amount feeDelta{Amount::zero()};
    //! Track the height and time at which tx was final
    LockPoints lockPoints;

    IMPLEMENT_RCU_REFCOUNT(uint64_t);

public:
    CTxMemPoolEntry(const CTransactionRef &_tx, const Amount fee, int64_t time,
                    unsigned int entry_height, bool spends_coinbase,
                    int64_t sigchecks, LockPoints lp);

    CTxMemPoolEntry(const CTxMemPoolEntry &other) = delete;
    CTxMemPoolEntry(CTxMemPoolEntry &&other)
        : entryId(other.entryId), tx(std::move(other.tx)),
          m_parents(std::move(other.m_parents)),
          m_children(std::move(other.m_children)), nFee(other.nFee),
          nTxSize(other.nTxSize), nUsageSize(other.nUsageSize),
          nTime(other.nTime), entryHeight(other.entryHeight),
          spendsCoinbase(other.spendsCoinbase), sigChecks(other.sigChecks),
          feeDelta(other.feeDelta), lockPoints(std::move(other.lockPoints)),
          refcount(other.refcount.load()){};

    uint64_t GetEntryId() const { return entryId; }
    //! This should only be set by addUnchecked() before entry insertion into
    //! mempool
    void SetEntryId(uint64_t eid) { entryId = eid; }

    const CTransaction &GetTx() const { return *this->tx; }
    CTransactionRef GetSharedTx() const { return this->tx; }
    Amount GetFee() const { return nFee; }
    size_t GetTxSize() const { return nTxSize; }
    size_t GetTxVirtualSize() const;

    std::chrono::seconds GetTime() const { return std::chrono::seconds{nTime}; }
    unsigned int GetHeight() const { return entryHeight; }
    int64_t GetSigChecks() const { return sigChecks; }
    Amount GetModifiedFee() const { return nFee + feeDelta; }
    CFeeRate GetModifiedFeeRate() const {
        return CFeeRate(GetModifiedFee(), GetTxVirtualSize());
    }
    size_t DynamicMemoryUsage() const { return nUsageSize; }
    const LockPoints &GetLockPoints() const { return lockPoints; }

    // Updates the fee delta used for mining priority score
    void UpdateFeeDelta(Amount feeDelta);
    // Update the LockPoints after a reorg
    void UpdateLockPoints(const LockPoints &lp);

    bool GetSpendsCoinbase() const { return spendsCoinbase; }

    const Parents &GetMemPoolParentsConst() const { return m_parents; }
    const Children &GetMemPoolChildrenConst() const { return m_children; }
    Parents &GetMemPoolParents() const { return m_parents; }
    Children &GetMemPoolChildren() const { return m_children; }
};

// extracts a transaction id from CTxMemPoolEntry or CTransactionRef
struct mempoolentry_txid {
    typedef TxId result_type;

    result_type operator()(const CTxMemPoolEntryRef &entry) const {
        return entry->GetTx().GetId();
    }

    result_type operator()(const CTransactionRef &tx) const {
        return tx->GetId();
    }
};

// used by the entry_time index
struct CompareTxMemPoolEntryByEntryTime {
    bool operator()(const CTxMemPoolEntryRef &a,
                    const CTxMemPoolEntryRef &b) const {
        return a->GetTime() < b->GetTime();
    }
};

// used by the entry_id index
struct CompareTxMemPoolEntryByEntryId {
    bool operator()(const CTxMemPoolEntryRef &a,
                    const CTxMemPoolEntryRef &b) const {
        return a->GetEntryId() < b->GetEntryId();
    }
};

/**
 * \class CompareTxMemPoolEntryByModifiedFeeRate
 *
 *  Sort by feerate of entry (modfee/vsize) in descending order.
 *  This is used by the block assembler (mining).
 */
struct CompareTxMemPoolEntryByModifiedFeeRate {
    // Used in tests
    bool operator()(const CTxMemPoolEntry &a, const CTxMemPoolEntry &b) const {
        const CFeeRate frA = a.GetModifiedFeeRate();
        const CFeeRate frB = b.GetModifiedFeeRate();

        // Sort by modified fee rate first
        if (frA != frB) {
            return frA > frB;
        }

        // Ties are broken by whichever is topologically earlier
        // (this helps mining code avoid some backtracking).
        if (a.GetEntryId() != b.GetEntryId()) {
            return a.GetEntryId() < b.GetEntryId();
        }

        // If nothing else, sort by txid (this should never happen as entryID is
        // expected to be unique).
        return a.GetSharedTx()->GetId() < b.GetSharedTx()->GetId();
    }

    bool operator()(const CTxMemPoolEntryRef &a,
                    const CTxMemPoolEntryRef &b) const {
        return operator()(*a, *b);
    }
};

// Multi_index tag names
struct entry_time {};
struct modified_feerate {};
struct entry_id {};

/**
 * Information about a mempool transaction.
 */
struct TxMempoolInfo {
    /** The transaction itself */
    CTransactionRef tx;

    /** Time the transaction entered the mempool. */
    std::chrono::seconds m_time;

    /** Fee of the transaction. */
    Amount fee;

    /** Virtual size of the transaction. */
    size_t vsize;

    /** The fee delta. */
    Amount nFeeDelta;
};

/**
 * Reason why a transaction was removed from the mempool, this is passed to the
 * notification signal.
 */
enum class MemPoolRemovalReason {
    //! Expired from mempool
    EXPIRY,
    //! Removed in size limiting
    SIZELIMIT,
    //! Removed for reorganization
    REORG,
    //! Removed for block
    BLOCK,
    //! Removed for conflict with in-block transaction
    CONFLICT,
    //! Removed for replacement
    REPLACED
};

/**
 * CTxMemPool stores valid-according-to-the-current-best-chain transactions that
 * may be included in the next block.
 *
 * Transactions are added when they are seen on the network (or created by the
 * local node), but not all transactions seen are added to the pool. For
 * example, the following new transactions will not be added to the mempool:
 * - a transaction which doesn't meet the minimum fee requirements.
 * - a new transaction that double-spends an input of a transaction already in
 * the pool.
 * - a non-standard transaction.
 *
 * CTxMemPool::mapTx, and CTxMemPoolEntry bookkeeping:
 *
 * mapTx is a boost::multi_index that sorts the mempool on 3 criteria:
 * - transaction hash
 * - time in mempool
 * - entry id (this is a topological index)
 *
 * Note: the term "descendant" refers to in-mempool transactions that depend on
 * this one, while "ancestor" refers to in-mempool transactions that a given
 * transaction depends on.
 *
 * When a new transaction is added to the mempool, it has no in-mempool children
 * (because any such children would be an orphan). So in addUnchecked(), we:
 * - update a new entry's setMemPoolParents to include all in-mempool parents
 * - update the new entry's direct parents to include the new tx as a child
 *
 * When a transaction is removed from the mempool, we must:
 * - update all in-mempool parents to not track the tx in setMemPoolChildren
 * - update all in-mempool children to not include it as a parent
 *
 * These happen in UpdateForRemoveFromMempool(). (Note that when removing a
 * transaction along with its descendants, we must calculate that set of
 * transactions to be removed before doing the removal, or else the mempool can
 * be in an inconsistent state where it's impossible to walk the ancestors of a
 * transaction.)
 *
 * In the event of a reorg, the invariant that all newly-added tx's have no
 * in-mempool children must be maintained.  On top of this, we use a topological
 * index (GetEntryId).  As such, we always dump mempool tx's into a disconnect
 * pool on reorg, and simply add them one by one, along with tx's from
 * disconnected blocks, when the reorg is complete.
 */
class CTxMemPool {
private:
    //! Value n means that 1 times in n we check.
    const int m_check_ratio;
    //! Used by getblocktemplate to trigger CreateNewBlock() invocation
    std::atomic<uint32_t> nTransactionsUpdated{0};

    //! sum of all mempool tx's sizes.
    uint64_t totalTxSize GUARDED_BY(cs);
    //! sum of all mempool tx's fees (NOT modified fee)
    Amount m_total_fee GUARDED_BY(cs);
    //! sum of dynamic memory usage of all the map elements (NOT the maps
    //! themselves)
    uint64_t cachedInnerUsage GUARDED_BY(cs);

    mutable int64_t lastRollingFeeUpdate GUARDED_BY(cs);
    mutable bool blockSinceLastRollingFeeBump GUARDED_BY(cs);
    //! minimum fee to get into the pool, decreases exponentially
    mutable double rollingMinimumFeeRate GUARDED_BY(cs);

    // In-memory counter for external mempool tracking purposes.
    // This number is incremented once every time a transaction
    // is added or removed from the mempool for any reason.
    mutable uint64_t m_sequence_number GUARDED_BY(cs){1};

    void trackPackageRemoved(const CFeeRate &rate) EXCLUSIVE_LOCKS_REQUIRED(cs);

    bool m_is_loaded GUARDED_BY(cs){false};

    //! Used by addUnchecked to generate ever-increasing
    //! CTxMemPoolEntry::entryId's
    uint64_t nextEntryId GUARDED_BY(cs) = 1;

public:
    // public only for testing
    static const int ROLLING_FEE_HALFLIFE = 60 * 60 * 12;

    typedef boost::multi_index_container<
        CTxMemPoolEntryRef,
        boost::multi_index::indexed_by<
            // indexed by txid
            boost::multi_index::hashed_unique<mempoolentry_txid,
                                              SaltedTxIdHasher>,
            // sorted by fee rate
            boost::multi_index::ordered_non_unique<
                boost::multi_index::tag<modified_feerate>,
                boost::multi_index::identity<CTxMemPoolEntryRef>,
                CompareTxMemPoolEntryByModifiedFeeRate>,
            // sorted by entry time
            boost::multi_index::ordered_non_unique<
                boost::multi_index::tag<entry_time>,
                boost::multi_index::identity<CTxMemPoolEntryRef>,
                CompareTxMemPoolEntryByEntryTime>,
            // sorted topologically (insertion order)
            boost::multi_index::ordered_unique<
                boost::multi_index::tag<entry_id>,
                boost::multi_index::identity<CTxMemPoolEntryRef>,
                CompareTxMemPoolEntryByEntryId>>>
        indexed_transaction_set;

    /**
     * This mutex needs to be locked when accessing `mapTx` or other members
     * that are guarded by it.
     *
     * @par Consistency guarantees
     *
     * By design, it is guaranteed that:
     *
     * 1. Locking both `cs_main` and `mempool.cs` will give a view of mempool
     *    that is consistent with current chain tip (`ActiveChain()` and
     *    `CoinsTip()`) and is fully populated. Fully populated means that if
     *    the current active chain is missing transactions that were present in
     *    a previously active chain, all the missing transactions will have been
     *    re-added to the mempool and should be present if they meet size and
     *    consistency constraints.
     *
     * 2. Locking `mempool.cs` without `cs_main` will give a view of a mempool
     *    consistent with some chain that was active since `cs_main` was last
     *    locked, and that is fully populated as described above. It is ok for
     *    code that only needs to query or remove transactions from the mempool
     *    to lock just `mempool.cs` without `cs_main`.
     *
     * To provide these guarantees, it is necessary to lock both `cs_main` and
     * `mempool.cs` whenever adding transactions to the mempool and whenever
     * changing the chain tip. It's necessary to keep both mutexes locked until
     * the mempool is consistent with the new chain tip and fully populated.
     */
    mutable RecursiveMutex cs;
    indexed_transaction_set mapTx GUARDED_BY(cs);

    using txiter = indexed_transaction_set::nth_index<0>::type::const_iterator;
    typedef std::set<txiter, CompareIteratorById> setEntries;

private:
    void UpdateParent(txiter entry, txiter parent, bool add)
        EXCLUSIVE_LOCKS_REQUIRED(cs);
    void UpdateChild(txiter entry, txiter child, bool add)
        EXCLUSIVE_LOCKS_REQUIRED(cs);

    /**
     * Track locally submitted transactions to periodically retry initial
     * broadcast
     */
    std::set<TxId> m_unbroadcast_txids GUARDED_BY(cs);

    /**
     * Helper function to calculate all in-mempool ancestors of staged_ancestors
     * param@[in]   staged_ancestors    Should contain entries in the mempool.
     * param@[out]  setAncestors        Will be populated with all mempool
     *                                  ancestors.
     */
    bool CalculateAncestors(setEntries &setAncestors,
                            CTxMemPoolEntry::Parents &staged_ancestors) const
        EXCLUSIVE_LOCKS_REQUIRED(cs);

public:
    indirectmap<COutPoint, const CTransaction *> mapNextTx GUARDED_BY(cs);
    std::map<TxId, Amount> mapDeltas GUARDED_BY(cs);

    /**
     * Create a new CTxMemPool.
     * Sanity checks will be off by default for performance, because otherwise
     * accepting transactions becomes O(N^2) where N is the number of
     * transactions in the pool.
     *
     * @param[in] check_ratio is the ratio used to determine how often sanity
     *     checks will run.
     */
    CTxMemPool(int check_ratio = 0);
    ~CTxMemPool();

    /**
     * If sanity-checking is turned on, check makes sure the pool is consistent
     * (does not contain two transactions that spend the same inputs, all inputs
     * are in the mapNextTx array). If sanity-checking is turned off, check does
     * nothing.
     */
    void check(const CCoinsViewCache &active_coins_tip,
               int64_t spendheight) const EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

    // addUnchecked must update state for all parents of a given transaction,
    // updating child links as necessary.
    void addUnchecked(CTxMemPoolEntryRef entry)
        EXCLUSIVE_LOCKS_REQUIRED(cs, cs_main);

    void removeRecursive(const CTransaction &tx, MemPoolRemovalReason reason)
        EXCLUSIVE_LOCKS_REQUIRED(cs);
    void removeConflicts(const CTransaction &tx) EXCLUSIVE_LOCKS_REQUIRED(cs);
    void removeForBlock(const std::vector<CTransactionRef> &vtx)
        EXCLUSIVE_LOCKS_REQUIRED(cs);

    void clear();
    // lock free
    void _clear() EXCLUSIVE_LOCKS_REQUIRED(cs);
    bool CompareTopologically(const TxId &txida, const TxId &txidb) const;
    void getAllTxIds(std::vector<TxId> &vtxid) const;
    bool isSpent(const COutPoint &outpoint) const;
    unsigned int GetTransactionsUpdated() const;
    void AddTransactionsUpdated(unsigned int n);
    /**
     * Check that none of this transactions inputs are in the mempool, and thus
     * the tx is not dependent on other mempool transactions to be included in a
     * block.
     */
    bool HasNoInputsOf(const CTransaction &tx) const
        EXCLUSIVE_LOCKS_REQUIRED(cs);

    /** Affect CreateNewBlock prioritisation of transactions */
    void PrioritiseTransaction(const TxId &txid, const Amount nFeeDelta);
    void ApplyDelta(const TxId &txid, Amount &nFeeDelta) const
        EXCLUSIVE_LOCKS_REQUIRED(cs);
    void ClearPrioritisation(const TxId &txid) EXCLUSIVE_LOCKS_REQUIRED(cs);

    /** Get the transaction in the pool that spends the same prevout */
    const CTransaction *GetConflictTx(const COutPoint &prevout) const
        EXCLUSIVE_LOCKS_REQUIRED(cs);

    /** Returns an iterator to the given txid, if found */
    std::optional<txiter> GetIter(const TxId &txid) const
        EXCLUSIVE_LOCKS_REQUIRED(cs);

    /**
     * Translate a set of txids into a set of pool iterators to avoid repeated
     * lookups.
     */
    setEntries GetIterSet(const std::set<TxId> &txids) const
        EXCLUSIVE_LOCKS_REQUIRED(cs);

    /**
     * Remove a set of transactions from the mempool. If a transaction is in
     * this set, then all in-mempool descendants must also be in the set, unless
     * this transaction is being removed for being in a block.
     */
    void RemoveStaged(const setEntries &stage, MemPoolRemovalReason reason)
        EXCLUSIVE_LOCKS_REQUIRED(cs);

    /**
     * Try to calculate all in-mempool ancestors of entry.
     *  (these are all calculated including the tx itself)
     * fSearchForParents = whether to search a tx's vin for in-mempool parents,
     * or look up parents from m_parents. Must be true for entries not in the
     * mempool
     */
    bool CalculateMemPoolAncestors(const CTxMemPoolEntryRef &entry,
                                   setEntries &setAncestors,
                                   bool fSearchForParents = true) const
        EXCLUSIVE_LOCKS_REQUIRED(cs);

    /**
     * Calculate all in-mempool ancestors of a set of transactions not already
     * in the mempool and check ancestor and descendant limits. Heuristics are
     * used to estimate the ancestor and descendant count of all entries if the
     * package were to be added to the mempool.  The limits are applied to the
     * union of all package transactions. For example, if the package has 3
     * transactions and limitAncestorCount = 50, the union of all 3 sets of
     * ancestors (including the transactions themselves) must be <= 47.
     * @param[in]       package                 Transaction package being
     *     evaluated for acceptance to mempool. The transactions need not be
     *     direct ancestors/descendants of each other.
     * @param[in]       limitAncestorCount      Max number of txns including
     *     ancestors.
     * @param[in]       limitAncestorSize       Max size including ancestors.
     * @param[in]       limitDescendantCount    Max number of txns including
     *     descendants.
     * @param[in]       limitDescendantSize     Max size including descendants.
     * @param[out]      errString               Populated with error reason if
     *     a limit is hit.
     */
    bool CheckPackageLimits(const Package &package, uint64_t limitAncestorCount,
                            uint64_t limitAncestorSize,
                            uint64_t limitDescendantCount,
                            uint64_t limitDescendantSize,
                            std::string &errString) const
        EXCLUSIVE_LOCKS_REQUIRED(cs);

    /**
     * Populate setDescendants with all in-mempool descendants of hash.
     * Assumes that setDescendants includes all in-mempool descendants of
     * anything already in it.
     */
    void CalculateDescendants(txiter it, setEntries &setDescendants) const
        EXCLUSIVE_LOCKS_REQUIRED(cs);

    /**
     * The minimum fee to get into the mempool, which may itself not be enough
     * for larger-sized transactions. The incrementalRelayFee policy variable is
     * used to bound the time it takes the fee rate to go back down all the way
     * to 0. When the feerate would otherwise be half of this, it is set to 0
     * instead.
     */
    CFeeRate GetMinFee(size_t sizelimit) const;

    /**
     * Remove transactions from the mempool until its dynamic size is <=
     * sizelimit. pvNoSpendsRemaining, if set, will be populated with the list
     * of outpoints which are not in mempool which no longer have any spends in
     * this mempool.
     */
    void TrimToSize(size_t sizelimit,
                    std::vector<COutPoint> *pvNoSpendsRemaining = nullptr)
        EXCLUSIVE_LOCKS_REQUIRED(cs);

    /**
     * Expire all transaction (and their dependencies) in the mempool older than
     * time. Return the number of removed transactions.
     */
    int Expire(std::chrono::seconds time) EXCLUSIVE_LOCKS_REQUIRED(cs);

    /**
     * Reduce the size of the mempool by expiring and then trimming the mempool.
     */
    void LimitSize(CCoinsViewCache &coins_cache, size_t limit,
                   std::chrono::seconds age)
        EXCLUSIVE_LOCKS_REQUIRED(cs, ::cs_main);

    /** @returns true if the mempool is fully loaded */
    bool IsLoaded() const;

    /** Sets the current loaded state */
    void SetIsLoaded(bool loaded);

    unsigned long size() const {
        LOCK(cs);
        return mapTx.size();
    }

    uint64_t GetTotalTxSize() const EXCLUSIVE_LOCKS_REQUIRED(cs) {
        AssertLockHeld(cs);
        return totalTxSize;
    }

    Amount GetTotalFee() const EXCLUSIVE_LOCKS_REQUIRED(cs) {
        AssertLockHeld(cs);
        return m_total_fee;
    }

    bool exists(const TxId &txid) const {
        LOCK(cs);
        return mapTx.count(txid) != 0;
    }

    CTransactionRef get(const TxId &txid) const;
    TxMempoolInfo info(const TxId &txid) const;
    std::vector<TxMempoolInfo> infoAll() const;

    CFeeRate estimateFee() const;

    size_t DynamicMemoryUsage() const;

    /** Adds a transaction to the unbroadcast set */
    void AddUnbroadcastTx(const TxId &txid) {
        LOCK(cs);
        // Sanity check the transaction is in the mempool & insert into
        // unbroadcast set.
        if (exists(txid)) {
            m_unbroadcast_txids.insert(txid);
        }
    }

    /** Removes a transaction from the unbroadcast set */
    void RemoveUnbroadcastTx(const TxId &txid, const bool unchecked = false);

    /** Returns transactions in unbroadcast set */
    std::set<TxId> GetUnbroadcastTxs() const {
        LOCK(cs);
        return m_unbroadcast_txids;
    }

    /** Returns whether a txid is in the unbroadcast set */
    bool IsUnbroadcastTx(const TxId &txid) const EXCLUSIVE_LOCKS_REQUIRED(cs) {
        AssertLockHeld(cs);
        return (m_unbroadcast_txids.count(txid) != 0);
    }

    /** Guards this internal counter for external reporting */
    uint64_t GetAndIncrementSequence() const EXCLUSIVE_LOCKS_REQUIRED(cs) {
        return m_sequence_number++;
    }

    uint64_t GetSequence() const EXCLUSIVE_LOCKS_REQUIRED(cs) {
        return m_sequence_number;
    }

private:
    /** Set ancestor state for an entry */
    void UpdateEntryForAncestors(txiter it, const setEntries *setAncestors)
        EXCLUSIVE_LOCKS_REQUIRED(cs);
    /**
     * Update parents of `it` to add/remove it as a child transaction.
     */
    void UpdateParentsOf(bool add, txiter it) EXCLUSIVE_LOCKS_REQUIRED(cs);
    /**
     * For each transaction being removed, update ancestors and any direct
     * children.
     */
    void UpdateForRemoveFromMempool(const setEntries &entriesToRemove)
        EXCLUSIVE_LOCKS_REQUIRED(cs);
    /** Sever link between specified transaction and direct children. */
    void UpdateChildrenForRemoval(txiter entry) EXCLUSIVE_LOCKS_REQUIRED(cs);

    /**
     * Before calling removeUnchecked for a given transaction,
     * UpdateForRemoveFromMempool must be called on the entire (dependent) set
     * of transactions being removed at the same time. We use each
     * CTxMemPoolEntry's setMemPoolParents in order to walk ancestors of a given
     * transaction that is removed, so we can't remove intermediate transactions
     * in a chain before we've updated all the state for the removal.
     */
    void removeUnchecked(txiter entry, MemPoolRemovalReason reason)
        EXCLUSIVE_LOCKS_REQUIRED(cs);
};

/**
 * CCoinsView that brings transactions from a mempool into view.
 * It does not check for spendings by memory pool transactions.
 * Instead, it provides access to all Coins which are either unspent in the
 * base CCoinsView, are outputs from any mempool transaction, or are
 * tracked temporarily to allow transaction dependencies in package validation.
 * This allows transaction replacement to work as expected, as you want to
 * have all inputs "available" to check signatures, and any cycles in the
 * dependency graph are checked directly in AcceptToMemoryPool.
 * It also allows you to sign a double-spend directly in
 * signrawtransactionwithkey and signrawtransactionwithwallet,
 * as long as the conflicting transaction is not yet confirmed.
 */
class CCoinsViewMemPool : public CCoinsViewBacked {
    /**
     * Coins made available by transactions being validated. Tracking these
     * allows for package validation, since we can access transaction outputs
     * without submitting them to mempool.
     */
    std::unordered_map<COutPoint, Coin, SaltedOutpointHasher> m_temp_added;

protected:
    const CTxMemPool &mempool;

public:
    CCoinsViewMemPool(CCoinsView *baseIn, const CTxMemPool &mempoolIn);
    bool GetCoin(const COutPoint &outpoint, Coin &coin) const override;
    /**
     * Add the coins created by this transaction. These coins are only
     * temporarily stored in m_temp_added and cannot be flushed to the back end.
     * Only used for package validation.
     */
    void PackageAddTransaction(const CTransactionRef &tx);
};

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
    void updateMempoolForReorg(const Config &config,
                               Chainstate &active_chainstate,
                               bool fAddToMempool, CTxMemPool &pool)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main, pool.cs);
};

#endif // BITCOIN_TXMEMPOOL_H
