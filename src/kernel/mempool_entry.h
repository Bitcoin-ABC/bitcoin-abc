// Copyright (c) 2009-2022 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_KERNEL_MEMPOOL_ENTRY_H
#define BITCOIN_KERNEL_MEMPOOL_ENTRY_H

#include <consensus/amount.h>
#include <core_memusage.h>
#include <policy/policy.h>
#include <policy/settings.h>
#include <primitives/transaction.h>
#include <rcu.h>

#include <chrono>
#include <cstddef>
#include <cstdint>
#include <functional>
#include <memory>
#include <set>

struct LockPoints {
    // Will be set to the blockchain height and median time past values that
    // would be necessary to satisfy all relative locktime constraints (BIP68)
    // of this tx given our view of block chain history
    int height{0};
    int64_t time{0};
};

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
/** Iterate txs in reverse-topological order */
struct CompareIteratorByRevEntryId {
    template <typename T>
    bool operator()(const std::reference_wrapper<T> &a,
                    const std::reference_wrapper<T> &b) const {
        return a.get()->GetEntryId() > b.get()->GetEntryId();
    }

    template <typename T> bool operator()(const T &a, const T &b) const {
        return (*a)->GetEntryId() > (*b)->GetEntryId();
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
                    unsigned int entry_height, int64_t sigchecks, LockPoints lp)
        : tx{_tx}, nFee{fee}, nTxSize(tx->GetTotalSize()),
          nUsageSize{RecursiveDynamicUsage(tx)}, nTime(time),
          entryHeight{entry_height}, sigChecks(sigchecks), lockPoints(lp) {}

    CTxMemPoolEntry(const CTxMemPoolEntry &other) = delete;
    CTxMemPoolEntry(CTxMemPoolEntry &&other)
        : entryId(other.entryId), tx(std::move(other.tx)),
          m_parents(std::move(other.m_parents)),
          m_children(std::move(other.m_children)), nFee(other.nFee),
          nTxSize(other.nTxSize), nUsageSize(other.nUsageSize),
          nTime(other.nTime), entryHeight(other.entryHeight),
          sigChecks(other.sigChecks), feeDelta(other.feeDelta),
          lockPoints(std::move(other.lockPoints)),
          refcount(other.refcount.load()){};

    uint64_t GetEntryId() const { return entryId; }
    //! This should only be set by addUnchecked() before entry insertion into
    //! mempool
    void SetEntryId(uint64_t eid) { entryId = eid; }

    const CTransaction &GetTx() const { return *this->tx; }
    CTransactionRef GetSharedTx() const { return this->tx; }
    Amount GetFee() const { return nFee; }
    size_t GetTxSize() const { return nTxSize; }
    size_t GetTxVirtualSize() const {
        return GetVirtualTransactionSize(nTxSize, sigChecks,
                                         ::nBytesPerSigCheck);
    }

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
    void UpdateFeeDelta(Amount newFeeDelta) { feeDelta = newFeeDelta; }

    const Parents &GetMemPoolParentsConst() const { return m_parents; }
    const Children &GetMemPoolChildrenConst() const { return m_children; }
    Parents &GetMemPoolParents() const { return m_parents; }
    Children &GetMemPoolChildren() const { return m_children; }
};

#endif // BITCOIN_KERNEL_MEMPOOL_ENTRY_H
