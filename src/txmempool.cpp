// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <txmempool.h>

#include <avalanche/avalanche.h>
#include <avalanche/processor.h>
#include <chain.h>
#include <chainparams.h> // for GetConsensus.
#include <clientversion.h>
#include <coins.h>
#include <config.h>
#include <consensus/consensus.h>
#include <consensus/tx_verify.h>
#include <consensus/validation.h>
#include <policy/fees.h>
#include <policy/policy.h>
#include <policy/settings.h>
#include <reverse_iterator.h>
#include <undo.h>
#include <util/moneystr.h>
#include <util/system.h>
#include <util/time.h>
#include <validation.h>
#include <validationinterface.h>
#include <version.h>

#include <algorithm>
#include <cmath>
#include <limits>

bool TestLockPointValidity(const CChain &active_chain, const LockPoints &lp) {
    AssertLockHeld(cs_main);
    // If there are relative lock times then the maxInputBlock will be set
    // If there are no relative lock times, the LockPoints don't depend on the
    // chain
    if (lp.maxInputBlock) {
        // Check whether active_chain is an extension of the block at which the
        // LockPoints calculation was valid.  If not LockPoints are no longer
        // valid
        if (!active_chain.Contains(lp.maxInputBlock)) {
            return false;
        }
    }

    // LockPoints still valid
    return true;
}

CTxMemPoolEntry::CTxMemPoolEntry(const CTransactionRef &_tx, const Amount fee,
                                 int64_t time, unsigned int entry_height,
                                 bool spends_coinbase, int64_t _sigChecks,
                                 LockPoints lp)
    : tx{_tx}, nFee{fee},
      nTxSize(tx->GetTotalSize()), nUsageSize{RecursiveDynamicUsage(tx)},
      nTime(time), entryHeight{entry_height}, spendsCoinbase(spends_coinbase),
      sigChecks(_sigChecks), lockPoints(lp) {}

size_t CTxMemPoolEntry::GetTxVirtualSize() const {
    return GetVirtualTransactionSize(nTxSize, sigChecks);
}

void CTxMemPoolEntry::UpdateFeeDelta(Amount newFeeDelta) {
    feeDelta = newFeeDelta;
}

void CTxMemPoolEntry::UpdateLockPoints(const LockPoints &lp) {
    lockPoints = lp;
}

bool CTxMemPool::CalculateAncestors(
    setEntries &setAncestors,
    CTxMemPoolEntry::Parents &staged_ancestors) const {
    while (!staged_ancestors.empty()) {
        const auto stage = staged_ancestors.begin()->get();

        txiter stageit = mapTx.find(stage->GetTx().GetId());
        assert(stageit != mapTx.end());
        setAncestors.insert(stageit);
        staged_ancestors.erase(staged_ancestors.begin());

        const CTxMemPoolEntry::Parents &parents =
            (*stageit)->GetMemPoolParentsConst();
        for (const auto &parent : parents) {
            txiter parent_it = mapTx.find(parent.get()->GetTx().GetId());
            assert(parent_it != mapTx.end());

            // If this is a new ancestor, add it.
            if (setAncestors.count(parent_it) == 0) {
                staged_ancestors.insert(parent);
            }
        }
    }

    return true;
}

bool CTxMemPool::CalculateMemPoolAncestors(
    const CTxMemPoolEntryRef &entry, setEntries &setAncestors,
    bool fSearchForParents /* = true */) const {
    CTxMemPoolEntry::Parents staged_ancestors;
    const CTransaction &tx = entry->GetTx();

    if (fSearchForParents) {
        // Get parents of this transaction that are in the mempool
        // GetMemPoolParents() is only valid for entries in the mempool, so we
        // iterate mapTx to find parents.
        for (const CTxIn &in : tx.vin) {
            std::optional<txiter> piter = GetIter(in.prevout.GetTxId());
            if (!piter) {
                continue;
            }
            staged_ancestors.insert(**piter);
        }
    } else {
        // If we're not searching for parents, we require this to be an entry in
        // the mempool already.
        staged_ancestors = entry->GetMemPoolParentsConst();
    }

    return CalculateAncestors(setAncestors, staged_ancestors);
}

void CTxMemPool::UpdateParentsOf(bool add, txiter it) {
    // add or remove this tx as a child of each parent
    for (const auto &parent : (*it)->GetMemPoolParentsConst()) {
        auto parent_it = mapTx.find(parent.get()->GetTx().GetId());
        assert(parent_it != mapTx.end());
        UpdateChild(parent_it, it, add);
    }
}

void CTxMemPool::UpdateChildrenForRemoval(txiter it) {
    const CTxMemPoolEntry::Children &children =
        (*it)->GetMemPoolChildrenConst();
    for (const auto &child : children) {
        auto updateIt = mapTx.find(child.get()->GetTx().GetId());
        assert(updateIt != mapTx.end());
        UpdateParent(updateIt, it, false);
    }
}

void CTxMemPool::UpdateForRemoveFromMempool(const setEntries &entriesToRemove) {
    for (txiter removeIt : entriesToRemove) {
        // Note that UpdateParentsOf severs the child links that point to
        // removeIt in the entries for the parents of removeIt.
        UpdateParentsOf(false, removeIt);
    }

    // After updating all the parent links, we can now sever the link between
    // each transaction being removed and any mempool children (ie, update
    // CTxMemPoolEntry::m_parents for each direct child of a transaction being
    // removed).
    for (txiter removeIt : entriesToRemove) {
        UpdateChildrenForRemoval(removeIt);
    }
}

CTxMemPool::CTxMemPool(const Options &opts)
    : m_check_ratio(opts.check_ratio),
      m_max_size_bytes{opts.max_size_bytes}, m_expiry{opts.expiry} {
    // lock free clear
    _clear();
}

CTxMemPool::~CTxMemPool() {}

bool CTxMemPool::isSpent(const COutPoint &outpoint) const {
    LOCK(cs);
    return mapNextTx.count(outpoint);
}

unsigned int CTxMemPool::GetTransactionsUpdated() const {
    return nTransactionsUpdated;
}

void CTxMemPool::AddTransactionsUpdated(unsigned int n) {
    nTransactionsUpdated += n;
}

void CTxMemPool::addUnchecked(CTxMemPoolEntryRef entry) {
    // get a guaranteed unique id (in case tests re-use the same object)
    entry->SetEntryId(nextEntryId++);

    // Update transaction for any feeDelta created by PrioritiseTransaction
    {
        Amount feeDelta = Amount::zero();
        ApplyDelta(entry->GetTx().GetId(), feeDelta);
        entry->UpdateFeeDelta(feeDelta);
    }

    // Add to memory pool without checking anything.
    // Used by AcceptToMemoryPool(), which DOES do all the appropriate checks.
    auto [newit, inserted] = mapTx.insert(entry);
    // Sanity check: It is a programming error if insertion fails (uniqueness
    // invariants in mapTx are violated, etc)
    assert(inserted);
    // Sanity check: We should always end up inserting at the end of the
    // entry_id index
    assert(&*mapTx.get<entry_id>().rbegin() == &*newit);

    // Update cachedInnerUsage to include contained transaction's usage.
    // (When we update the entry for in-mempool parents, memory usage will be
    // further updated.)
    cachedInnerUsage += entry->DynamicMemoryUsage();

    const CTransaction &tx = entry->GetTx();
    std::set<TxId> setParentTransactions;
    for (const CTxIn &in : tx.vin) {
        mapNextTx.insert(std::make_pair(&in.prevout, &tx));
        setParentTransactions.insert(in.prevout.GetTxId());
    }
    // Don't bother worrying about child transactions of this one. It is
    // guaranteed that a new transaction arriving will not have any children,
    // because such children would be orphans.

    // Update ancestors with information about this tx
    for (const auto &pit : GetIterSet(setParentTransactions)) {
        UpdateParent(newit, pit, true);
    }

    UpdateParentsOf(true, newit);

    nTransactionsUpdated++;
    totalTxSize += entry->GetTxSize();
    m_total_fee += entry->GetFee();
}

void CTxMemPool::removeUnchecked(txiter it, MemPoolRemovalReason reason) {
    // We increment mempool sequence value no matter removal reason
    // even if not directly reported below.
    uint64_t mempool_sequence = GetAndIncrementSequence();

    if (reason != MemPoolRemovalReason::BLOCK) {
        // Notify clients that a transaction has been removed from the mempool
        // for any reason except being included in a block. Clients interested
        // in transactions included in blocks can subscribe to the
        // BlockConnected notification.
        GetMainSignals().TransactionRemovedFromMempool(
            (*it)->GetSharedTx(), reason, mempool_sequence);
    }

    for (const CTxIn &txin : (*it)->GetTx().vin) {
        mapNextTx.erase(txin.prevout);
    }

    /* add logging because unchecked */
    const TxId &txid = (*it)->GetTx().GetId();
    RemoveUnbroadcastTx(txid, true);

    finalizedTxs.remove(txid);

    totalTxSize -= (*it)->GetTxSize();
    m_total_fee -= (*it)->GetFee();
    cachedInnerUsage -= (*it)->DynamicMemoryUsage();
    cachedInnerUsage -=
        memusage::DynamicUsage((*it)->GetMemPoolParentsConst()) +
        memusage::DynamicUsage((*it)->GetMemPoolChildrenConst());
    mapTx.erase(it);
    nTransactionsUpdated++;
}

// Calculates descendants of entry that are not already in setDescendants, and
// adds to setDescendants. Assumes entryit is already a tx in the mempool and
// CTxMemPoolEntry::m_children is correct for tx and all descendants. Also
// assumes that if an entry is in setDescendants already, then all in-mempool
// descendants of it are already in setDescendants as well, so that we can save
// time by not iterating over those entries.
void CTxMemPool::CalculateDescendants(txiter entryit,
                                      setEntries &setDescendants) const {
    setEntries stage;
    if (setDescendants.count(entryit) == 0) {
        stage.insert(entryit);
    }
    // Traverse down the children of entry, only adding children that are not
    // accounted for in setDescendants already (because those children have
    // either already been walked, or will be walked in this iteration).
    while (!stage.empty()) {
        txiter it = *stage.begin();
        setDescendants.insert(it);
        stage.erase(stage.begin());

        const CTxMemPoolEntry::Children &children =
            (*it)->GetMemPoolChildrenConst();
        for (const auto &child : children) {
            txiter childiter = mapTx.find(child.get()->GetTx().GetId());
            assert(childiter != mapTx.end());

            if (!setDescendants.count(childiter)) {
                stage.insert(childiter);
            }
        }
    }
}

void CTxMemPool::removeRecursive(const CTransaction &origTx,
                                 MemPoolRemovalReason reason) {
    // Remove transaction from memory pool.
    AssertLockHeld(cs);
    setEntries txToRemove;
    txiter origit = mapTx.find(origTx.GetId());
    if (origit != mapTx.end()) {
        txToRemove.insert(origit);
    } else {
        // When recursively removing but origTx isn't in the mempool be sure to
        // remove any children that are in the pool. This can happen during
        // chain re-orgs if origTx isn't re-accepted into the mempool for any
        // reason.
        auto it = mapNextTx.lower_bound(COutPoint(origTx.GetId(), 0));
        while (it != mapNextTx.end() &&
               it->first->GetTxId() == origTx.GetId()) {
            txiter nextit = mapTx.find(it->second->GetId());
            assert(nextit != mapTx.end());
            txToRemove.insert(nextit);
            ++it;
        }
    }

    setEntries setAllRemoves;
    for (txiter it : txToRemove) {
        CalculateDescendants(it, setAllRemoves);
    }

    RemoveStaged(setAllRemoves, reason);
}

void CTxMemPool::removeConflicts(const CTransaction &tx) {
    // Remove transactions which depend on inputs of tx, recursively
    AssertLockHeld(cs);
    for (const CTxIn &txin : tx.vin) {
        auto it = mapNextTx.find(txin.prevout);
        if (it != mapNextTx.end()) {
            const CTransaction &txConflict = *it->second;
            if (txConflict != tx) {
                ClearPrioritisation(txConflict.GetId());
                removeRecursive(txConflict, MemPoolRemovalReason::CONFLICT);
            }
        }
    }
}

/**
 * Called when a block is connected. Removes from mempool and updates the miner
 * fee estimator.
 */
void CTxMemPool::removeForBlock(const std::vector<CTransactionRef> &vtx) {
    AssertLockHeld(cs);

    if (mapTx.empty() && mapDeltas.empty()) {
        // fast-path for IBD and/or when mempool is empty; there is no need to
        // do any of the set-up work below which eats precious cycles.
        // Note that this also skips updating the rolling fee udpate, which is
        // fine: it is only recomputed when the mempool has to be trimmed down
        // because it is full which is contradictory with this condition.
        return;
    }

    DisconnectedBlockTransactions disconnectpool;
    disconnectpool.addForBlock(vtx, *this);

    for (const CTransactionRef &tx :
         reverse_iterate(disconnectpool.GetQueuedTx().get<insertion_order>())) {
        txiter it = mapTx.find(tx->GetId());
        if (it != mapTx.end()) {
            setEntries stage;
            stage.insert(it);
            RemoveStaged(stage, MemPoolRemovalReason::BLOCK);
        } else {
            // Conflicting txs can only exist if the tx was not in the mempool
            removeConflicts(*tx);
        }
        ClearPrioritisation(tx->GetId());
    }

    disconnectpool.clear();

    lastRollingFeeUpdate = GetTime();
    blockSinceLastRollingFeeBump = true;
}

void CTxMemPool::_clear() {
    mapTx.clear();
    mapNextTx.clear();
    totalTxSize = 0;
    m_total_fee = Amount::zero();
    cachedInnerUsage = 0;
    lastRollingFeeUpdate = GetTime();
    blockSinceLastRollingFeeBump = false;
    rollingMinimumFeeRate = 0;
    ++nTransactionsUpdated;
}

void CTxMemPool::clear() {
    LOCK(cs);
    _clear();
}

void CTxMemPool::check(const CCoinsViewCache &active_coins_tip,
                       int64_t spendheight) const {
    if (m_check_ratio == 0) {
        return;
    }

    if (GetRand(m_check_ratio) >= 1) {
        return;
    }

    AssertLockHeld(::cs_main);
    LOCK(cs);
    LogPrint(BCLog::MEMPOOL,
             "Checking mempool with %u transactions and %u inputs\n",
             (unsigned int)mapTx.size(), (unsigned int)mapNextTx.size());

    uint64_t checkTotal = 0;
    Amount check_total_fee{Amount::zero()};
    uint64_t innerUsage = 0;

    CCoinsViewCache mempoolDuplicate(
        const_cast<CCoinsViewCache *>(&active_coins_tip));

    for (const CTxMemPoolEntryRef &entry : mapTx.get<entry_id>()) {
        checkTotal += entry->GetTxSize();
        check_total_fee += entry->GetFee();
        innerUsage += entry->DynamicMemoryUsage();
        const CTransaction &tx = entry->GetTx();
        innerUsage += memusage::DynamicUsage(entry->GetMemPoolParentsConst()) +
                      memusage::DynamicUsage(entry->GetMemPoolChildrenConst());

        CTxMemPoolEntry::Parents setParentCheck;
        for (const CTxIn &txin : tx.vin) {
            // Check that every mempool transaction's inputs refer to available
            // coins, or other mempool tx's.
            txiter parentIt = mapTx.find(txin.prevout.GetTxId());
            if (parentIt != mapTx.end()) {
                const CTransaction &parentTx = (*parentIt)->GetTx();
                assert(parentTx.vout.size() > txin.prevout.GetN() &&
                       !parentTx.vout[txin.prevout.GetN()].IsNull());
                setParentCheck.insert(*parentIt);
                // also check that parents have a topological ordering before
                // their children
                assert((*parentIt)->GetEntryId() < entry->GetEntryId());
            }
            // We are iterating through the mempool entries sorted
            // topologically.
            // All parents must have been checked before their children and
            // their coins added to the mempoolDuplicate coins cache.
            assert(mempoolDuplicate.HaveCoin(txin.prevout));
            // Check whether its inputs are marked in mapNextTx.
            auto prevoutNextIt = mapNextTx.find(txin.prevout);
            assert(prevoutNextIt != mapNextTx.end());
            assert(prevoutNextIt->first == &txin.prevout);
            assert(prevoutNextIt->second == &tx);
        }
        auto comp = [](const auto &a, const auto &b) -> bool {
            return a.get()->GetTx().GetId() == b.get()->GetTx().GetId();
        };
        assert(setParentCheck.size() == entry->GetMemPoolParentsConst().size());
        assert(std::equal(setParentCheck.begin(), setParentCheck.end(),
                          entry->GetMemPoolParentsConst().begin(), comp));

        // Verify ancestor state is correct.
        setEntries setAncestors;
        std::string dummy;

        const bool ok = CalculateMemPoolAncestors(entry, setAncestors);
        assert(ok);

        // all ancestors should have entryId < this tx's entryId
        for (const auto &ancestor : setAncestors) {
            assert((*ancestor)->GetEntryId() < entry->GetEntryId());
        }

        // Check children against mapNextTx
        CTxMemPoolEntry::Children setChildrenCheck;
        auto iter = mapNextTx.lower_bound(COutPoint(entry->GetTx().GetId(), 0));
        for (; iter != mapNextTx.end() &&
               iter->first->GetTxId() == entry->GetTx().GetId();
             ++iter) {
            txiter childIt = mapTx.find(iter->second->GetId());
            // mapNextTx points to in-mempool transactions
            assert(childIt != mapTx.end());
            setChildrenCheck.insert(*childIt);
        }
        assert(setChildrenCheck.size() ==
               entry->GetMemPoolChildrenConst().size());
        assert(std::equal(setChildrenCheck.begin(), setChildrenCheck.end(),
                          entry->GetMemPoolChildrenConst().begin(), comp));

        // Not used. CheckTxInputs() should always pass
        TxValidationState dummy_state;
        Amount txfee{Amount::zero()};
        assert(!tx.IsCoinBase());
        assert(Consensus::CheckTxInputs(tx, dummy_state, mempoolDuplicate,
                                        spendheight, txfee));
        for (const auto &input : tx.vin) {
            mempoolDuplicate.SpendCoin(input.prevout);
        }
        AddCoins(mempoolDuplicate, tx, std::numeric_limits<int>::max());
    }

    for (auto &[_, nextTx] : mapNextTx) {
        txiter it = mapTx.find(nextTx->GetId());
        assert(it != mapTx.end());
        assert(&(*it)->GetTx() == nextTx);
    }

    assert(totalTxSize == checkTotal);
    assert(m_total_fee == check_total_fee);
    assert(innerUsage == cachedInnerUsage);
}

bool CTxMemPool::CompareTopologically(const TxId &txida,
                                      const TxId &txidb) const {
    LOCK(cs);
    auto it1 = mapTx.find(txida);
    if (it1 == mapTx.end()) {
        return false;
    }
    auto it2 = mapTx.find(txidb);
    if (it2 == mapTx.end()) {
        return true;
    }
    return (*it1)->GetEntryId() < (*it2)->GetEntryId();
}

void CTxMemPool::getAllTxIds(std::vector<TxId> &vtxid) const {
    LOCK(cs);

    vtxid.clear();
    vtxid.reserve(mapTx.size());

    for (const auto &entry : mapTx.get<entry_id>()) {
        vtxid.push_back(entry->GetTx().GetId());
    }
}

static TxMempoolInfo
GetInfo(CTxMemPool::indexed_transaction_set::const_iterator it) {
    return TxMempoolInfo{(*it)->GetSharedTx(), (*it)->GetTime(),
                         (*it)->GetFee(), (*it)->GetTxSize(),
                         (*it)->GetModifiedFee() - (*it)->GetFee()};
}

std::vector<TxMempoolInfo> CTxMemPool::infoAll() const {
    LOCK(cs);

    std::vector<TxMempoolInfo> ret;
    ret.reserve(mapTx.size());

    const auto &index = mapTx.get<entry_id>();
    for (auto it = index.begin(); it != index.end(); ++it) {
        ret.push_back(GetInfo(mapTx.project<0>(it)));
    }

    return ret;
}

CTransactionRef CTxMemPool::get(const TxId &txid) const {
    LOCK(cs);
    indexed_transaction_set::const_iterator i = mapTx.find(txid);
    if (i == mapTx.end()) {
        return nullptr;
    }

    return (*i)->GetSharedTx();
}

TxMempoolInfo CTxMemPool::info(const TxId &txid) const {
    LOCK(cs);
    indexed_transaction_set::const_iterator i = mapTx.find(txid);
    if (i == mapTx.end()) {
        return TxMempoolInfo();
    }

    return GetInfo(i);
}

CFeeRate CTxMemPool::estimateFee() const {
    LOCK(cs);

    // minerPolicy uses recent blocks to figure out a reasonable fee.  This
    // may disagree with the rollingMinimumFeerate under certain scenarios
    // where the mempool  increases rapidly, or blocks are being mined which
    // do not contain propagated transactions.
    return std::max(::minRelayTxFee, GetMinFee());
}

void CTxMemPool::PrioritiseTransaction(const TxId &txid,
                                       const Amount nFeeDelta) {
    {
        LOCK(cs);
        Amount &delta = mapDeltas[txid];
        delta += nFeeDelta;
        txiter it = mapTx.find(txid);
        if (it != mapTx.end()) {
            mapTx.modify(it, [&delta](CTxMemPoolEntryRef &e) {
                e->UpdateFeeDelta(delta);
            });
            ++nTransactionsUpdated;
        }
    }
    LogPrintf("PrioritiseTransaction: %s fee += %s\n", txid.ToString(),
              FormatMoney(nFeeDelta));
}

void CTxMemPool::ApplyDelta(const TxId &txid, Amount &nFeeDelta) const {
    AssertLockHeld(cs);
    std::map<TxId, Amount>::const_iterator pos = mapDeltas.find(txid);
    if (pos == mapDeltas.end()) {
        return;
    }

    nFeeDelta += pos->second;
}

void CTxMemPool::ClearPrioritisation(const TxId &txid) {
    AssertLockHeld(cs);
    mapDeltas.erase(txid);
}

const CTransaction *CTxMemPool::GetConflictTx(const COutPoint &prevout) const {
    const auto it = mapNextTx.find(prevout);
    return it == mapNextTx.end() ? nullptr : it->second;
}

std::optional<CTxMemPool::txiter> CTxMemPool::GetIter(const TxId &txid) const {
    auto it = mapTx.find(txid);
    if (it != mapTx.end()) {
        return it;
    }
    return std::nullopt;
}

CTxMemPool::setEntries
CTxMemPool::GetIterSet(const std::set<TxId> &txids) const {
    CTxMemPool::setEntries ret;
    for (const auto &txid : txids) {
        const auto mi = GetIter(txid);
        if (mi) {
            ret.insert(*mi);
        }
    }
    return ret;
}

bool CTxMemPool::HasNoInputsOf(const CTransaction &tx) const {
    for (const CTxIn &in : tx.vin) {
        if (exists(in.prevout.GetTxId())) {
            return false;
        }
    }

    return true;
}

CCoinsViewMemPool::CCoinsViewMemPool(CCoinsView *baseIn,
                                     const CTxMemPool &mempoolIn)
    : CCoinsViewBacked(baseIn), mempool(mempoolIn) {}

bool CCoinsViewMemPool::GetCoin(const COutPoint &outpoint, Coin &coin) const {
    // Check to see if the inputs are made available by another tx in the
    // package. These Coins would not be available in the underlying CoinsView.
    if (auto it = m_temp_added.find(outpoint); it != m_temp_added.end()) {
        coin = it->second;
        return true;
    }

    // If an entry in the mempool exists, always return that one, as it's
    // guaranteed to never conflict with the underlying cache, and it cannot
    // have pruned entries (as it contains full) transactions. First checking
    // the underlying cache risks returning a pruned entry instead.
    CTransactionRef ptx = mempool.get(outpoint.GetTxId());
    if (ptx) {
        if (outpoint.GetN() < ptx->vout.size()) {
            coin = Coin(ptx->vout[outpoint.GetN()], MEMPOOL_HEIGHT, false);
            return true;
        }
        return false;
    }
    return base->GetCoin(outpoint, coin);
}

void CCoinsViewMemPool::PackageAddTransaction(const CTransactionRef &tx) {
    for (uint32_t n = 0; n < tx->vout.size(); ++n) {
        m_temp_added.emplace(COutPoint(tx->GetId(), n),
                             Coin(tx->vout[n], MEMPOOL_HEIGHT, false));
    }
}

size_t CTxMemPool::DynamicMemoryUsage() const {
    LOCK(cs);
    // Estimate the overhead of mapTx to be 12 pointers + an allocation, as no
    // exact formula for boost::multi_index_contained is implemented.
    return memusage::MallocUsage(sizeof(CTxMemPoolEntry) +
                                 12 * sizeof(void *)) *
               mapTx.size() +
           memusage::DynamicUsage(mapNextTx) +
           memusage::DynamicUsage(mapDeltas) + cachedInnerUsage;
}

void CTxMemPool::RemoveUnbroadcastTx(const TxId &txid, const bool unchecked) {
    LOCK(cs);

    if (m_unbroadcast_txids.erase(txid)) {
        LogPrint(
            BCLog::MEMPOOL, "Removed %i from set of unbroadcast txns%s\n",
            txid.GetHex(),
            (unchecked ? " before confirmation that txn was sent out" : ""));
    }
}

void CTxMemPool::RemoveStaged(const setEntries &stage,
                              MemPoolRemovalReason reason) {
    AssertLockHeld(cs);
    UpdateForRemoveFromMempool(stage);

    // Remove txs in reverse-topological order
    const setRevTopoEntries stageRevTopo(stage.begin(), stage.end());
    for (txiter it : stageRevTopo) {
        removeUnchecked(it, reason);
    }
}

int CTxMemPool::Expire(std::chrono::seconds time) {
    AssertLockHeld(cs);
    indexed_transaction_set::index<entry_time>::type::iterator it =
        mapTx.get<entry_time>().begin();
    setEntries toremove;
    while (it != mapTx.get<entry_time>().end() && (*it)->GetTime() < time) {
        toremove.insert(mapTx.project<0>(it));
        it++;
    }

    setEntries stage;
    for (txiter removeit : toremove) {
        CalculateDescendants(removeit, stage);
    }

    RemoveStaged(stage, MemPoolRemovalReason::EXPIRY);
    return stage.size();
}

void CTxMemPool::LimitSize(CCoinsViewCache &coins_cache) {
    AssertLockHeld(::cs_main);
    AssertLockHeld(cs);
    int expired = Expire(GetTime<std::chrono::seconds>() - m_expiry);
    if (expired != 0) {
        LogPrint(BCLog::MEMPOOL,
                 "Expired %i transactions from the memory pool\n", expired);
    }

    std::vector<COutPoint> vNoSpendsRemaining;
    TrimToSize(m_max_size_bytes, &vNoSpendsRemaining);
    for (const COutPoint &removed : vNoSpendsRemaining) {
        coins_cache.Uncache(removed);
    }
}

void CTxMemPool::UpdateChild(txiter entry, txiter child, bool add) {
    AssertLockHeld(cs);
    CTxMemPoolEntry::Children s;
    if (add && (*entry)->GetMemPoolChildren().insert(*child).second) {
        cachedInnerUsage += memusage::IncrementalDynamicUsage(s);
    } else if (!add && (*entry)->GetMemPoolChildren().erase(*child)) {
        cachedInnerUsage -= memusage::IncrementalDynamicUsage(s);
    }
}

void CTxMemPool::UpdateParent(txiter entry, txiter parent, bool add) {
    AssertLockHeld(cs);
    CTxMemPoolEntry::Parents s;
    if (add && (*entry)->GetMemPoolParents().insert(*parent).second) {
        cachedInnerUsage += memusage::IncrementalDynamicUsage(s);
    } else if (!add && (*entry)->GetMemPoolParents().erase(*parent)) {
        cachedInnerUsage -= memusage::IncrementalDynamicUsage(s);
    }
}

CFeeRate CTxMemPool::GetMinFee(size_t sizelimit) const {
    LOCK(cs);
    if (!blockSinceLastRollingFeeBump || rollingMinimumFeeRate == 0) {
        return CFeeRate(int64_t(ceill(rollingMinimumFeeRate)) * SATOSHI);
    }

    int64_t time = GetTime();
    if (time > lastRollingFeeUpdate + 10) {
        double halflife = ROLLING_FEE_HALFLIFE;
        if (DynamicMemoryUsage() < sizelimit / 4) {
            halflife /= 4;
        } else if (DynamicMemoryUsage() < sizelimit / 2) {
            halflife /= 2;
        }

        rollingMinimumFeeRate =
            rollingMinimumFeeRate /
            pow(2.0, (time - lastRollingFeeUpdate) / halflife);
        lastRollingFeeUpdate = time;
    }
    return CFeeRate(int64_t(ceill(rollingMinimumFeeRate)) * SATOSHI);
}

void CTxMemPool::trackPackageRemoved(const CFeeRate &rate) {
    AssertLockHeld(cs);
    if ((rate.GetFeePerK() / SATOSHI) > rollingMinimumFeeRate) {
        rollingMinimumFeeRate = rate.GetFeePerK() / SATOSHI;
        blockSinceLastRollingFeeBump = false;
    }
}

void CTxMemPool::TrimToSize(size_t sizelimit,
                            std::vector<COutPoint> *pvNoSpendsRemaining) {
    AssertLockHeld(cs);

    unsigned nTxnRemoved = 0;
    CFeeRate maxFeeRateRemoved(Amount::zero());
    while (!mapTx.empty() && DynamicMemoryUsage() > sizelimit) {
        auto it = mapTx.get<modified_feerate>().end();
        --it;

        // We set the new mempool min fee to the feerate of the removed
        // transaction, plus the "minimum reasonable fee rate" (ie some value
        // under which we consider txn to have 0 fee). This way, we don't allow
        // txn to enter mempool with feerate equal to txn which were removed
        // with no block in between.
        CFeeRate removed = (*it)->GetModifiedFeeRate();
        removed += MEMPOOL_FULL_FEE_INCREMENT;

        trackPackageRemoved(removed);
        maxFeeRateRemoved = std::max(maxFeeRateRemoved, removed);

        setEntries stage;
        CalculateDescendants(mapTx.project<0>(it), stage);
        nTxnRemoved += stage.size();

        if (pvNoSpendsRemaining) {
            for (const txiter &iter : stage) {
                for (const CTxIn &txin : (*iter)->GetTx().vin) {
                    if (!exists(txin.prevout.GetTxId())) {
                        pvNoSpendsRemaining->push_back(txin.prevout);
                    }
                }
            }
        }

        RemoveStaged(stage, MemPoolRemovalReason::SIZELIMIT);
    }

    if (maxFeeRateRemoved > CFeeRate(Amount::zero())) {
        LogPrint(BCLog::MEMPOOL,
                 "Removed %u txn, rolling minimum fee bumped to %s\n",
                 nTxnRemoved, maxFeeRateRemoved.ToString());
    }
}

bool CTxMemPool::IsLoaded() const {
    LOCK(cs);
    return m_is_loaded;
}

void CTxMemPool::SetIsLoaded(bool loaded) {
    LOCK(cs);
    m_is_loaded = loaded;
}

/** Maximum bytes for transactions to store for processing during reorg */
static const size_t MAX_DISCONNECTED_TX_POOL_SIZE = 20 * DEFAULT_MAX_BLOCK_SIZE;

void DisconnectedBlockTransactions::addForBlock(
    const std::vector<CTransactionRef> &vtx, CTxMemPool &pool) {
    AssertLockHeld(pool.cs);
    for (const auto &tx : reverse_iterate(vtx)) {
        // If we already added it, just skip.
        auto it = queuedTx.find(tx->GetId());
        if (it != queuedTx.end()) {
            continue;
        }

        // Insert the transaction into the pool.
        addTransaction(tx);

        // Fill in the set of parents.
        std::unordered_set<TxId, SaltedTxIdHasher> parents;
        for (const CTxIn &in : tx->vin) {
            parents.insert(in.prevout.GetTxId());
        }

        // In order to make sure we keep things in topological order, we check
        // if we already know of the parent of the current transaction. If so,
        // we remove them from the set and then add them back.
        while (parents.size() > 0) {
            std::unordered_set<TxId, SaltedTxIdHasher> worklist(
                std::move(parents));
            parents.clear();

            for (const TxId &txid : worklist) {
                // If we do not have that txid in the set, nothing needs to be
                // done.
                auto pit = queuedTx.find(txid);
                if (pit == queuedTx.end()) {
                    continue;
                }

                // We have parent in our set, we reinsert them at the right
                // position.
                const CTransactionRef ptx = *pit;
                queuedTx.erase(pit);
                queuedTx.insert(ptx);

                // And we make sure ancestors are covered.
                for (const CTxIn &in : ptx->vin) {
                    parents.insert(in.prevout.GetTxId());
                }
            }
        }
    }

    // Keep the size under control.
    while (DynamicMemoryUsage() > MAX_DISCONNECTED_TX_POOL_SIZE) {
        // Drop the earliest entry, and remove its children from the
        // mempool.
        auto it = queuedTx.get<insertion_order>().begin();
        pool.removeRecursive(**it, MemPoolRemovalReason::REORG);
        removeEntry(it);
    }
}

void DisconnectedBlockTransactions::importMempool(CTxMemPool &pool) {
    AssertLockHeld(pool.cs);
    // addForBlock's algorithm sorts a vector of transactions back into
    // topological order. We use it in a separate object to create a valid
    // ordering of all mempool transactions, which we then splice in front of
    // the current queuedTx. This results in a valid sequence of transactions to
    // be reprocessed in updateMempoolForReorg.

    // We create vtx in order of the entry_id index to facilitate for
    // addForBlocks (which iterates in reverse order), as vtx probably end in
    // the correct ordering for queuedTx.
    std::vector<CTransactionRef> vtx;

    vtx.reserve(pool.mapTx.size());
    txInfo.reserve(pool.mapTx.size());
    for (const CTxMemPoolEntryRef &e : pool.mapTx.get<entry_id>()) {
        vtx.push_back(e->GetSharedTx());
        // save entry time, feeDelta, and height for use in
        // updateMempoolForReorg()
        txInfo.try_emplace(e->GetTx().GetId(), e->GetTime(),
                           e->GetModifiedFee() - e->GetFee(), e->GetHeight());
    }
    for (const CTxMemPoolEntryRef &e :
         reverse_iterate(pool.mapTx.get<entry_id>())) {
        // Notify all observers of this (possibly temporary) removal. This is
        // necessary for tracking the transactions that are removed from the
        // mempool during a reorg and can't be added back due to missing parent.
        // Transactions that are added back to the mempool will trigger another
        // notification. Make sure to notify in reverse topological order,
        // children first.
        GetMainSignals().TransactionRemovedFromMempool(
            e->GetSharedTx(), MemPoolRemovalReason::REORG,
            pool.GetAndIncrementSequence());
    }
    pool.clear();

    // Use addForBlocks to sort the transactions and then splice them in front
    // of queuedTx
    DisconnectedBlockTransactions orderedTxnPool;
    orderedTxnPool.addForBlock(vtx, pool);
    cachedInnerUsage += orderedTxnPool.cachedInnerUsage;
    queuedTx.get<insertion_order>().splice(
        queuedTx.get<insertion_order>().begin(),
        orderedTxnPool.queuedTx.get<insertion_order>());

    // We limit memory usage because we can't know if more blocks will be
    // disconnected
    while (DynamicMemoryUsage() > MAX_DISCONNECTED_TX_POOL_SIZE) {
        // Drop the earliest entry which, by definition, has no children
        removeEntry(queuedTx.get<insertion_order>().begin());
    }
}

auto DisconnectedBlockTransactions::getTxInfo(const CTransactionRef &tx) const
    -> const TxInfo * {
    if (auto it = txInfo.find(tx->GetId()); it != txInfo.end()) {
        return &it->second;
    }

    return nullptr;
}

void DisconnectedBlockTransactions::updateMempoolForReorg(
    const Config &config, Chainstate &active_chainstate, bool fAddToMempool,
    CTxMemPool &pool) {
    AssertLockHeld(cs_main);
    AssertLockHeld(pool.cs);

    if (fAddToMempool) {
        // disconnectpool's insertion_order index sorts the entries from oldest
        // to newest, but the oldest entry will be the last tx from the latest
        // mined block that was disconnected.
        // Iterate disconnectpool in reverse, so that we add transactions back
        // to the mempool starting with the earliest transaction that had been
        // previously seen in a block.
        for (const CTransactionRef &tx :
             reverse_iterate(queuedTx.get<insertion_order>())) {
            if (tx->IsCoinBase()) {
                continue;
            }
            // restore saved PrioritiseTransaction state and nAcceptTime
            const auto ptxInfo = getTxInfo(tx);
            bool hasFeeDelta = false;
            if (ptxInfo && ptxInfo->feeDelta != Amount::zero()) {
                // manipulate mapDeltas directly (faster than calling
                // PrioritiseTransaction)
                pool.mapDeltas[tx->GetId()] = ptxInfo->feeDelta;
                hasFeeDelta = true;
            }
            // ignore validation errors in resurrected transactions
            auto result = AcceptToMemoryPool(
                config, active_chainstate, tx,
                /*accept_time=*/ptxInfo ? ptxInfo->time.count() : GetTime(),
                /*bypass_limits=*/true, /*test_accept=*/false,
                /*heightOverride=*/ptxInfo ? ptxInfo->height : 0);
            if (result.m_result_type !=
                    MempoolAcceptResult::ResultType::VALID &&
                hasFeeDelta) {
                // tx not accepted: undo mapDelta insertion from above
                pool.mapDeltas.erase(tx->GetId());
            }
        }
    }

    queuedTx.clear();
    txInfo.clear();

    // Re-limit mempool size, in case we added any transactions
    pool.LimitSize(active_chainstate.CoinsTip());
}
