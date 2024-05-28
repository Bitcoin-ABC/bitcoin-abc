// Copyright (c) 2021 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <txorphanage.h>

#include <consensus/validation.h>
#include <logging.h>
#include <policy/policy.h>
#include <util/time.h>

#include <cassert>

/** Expiration time for orphan transactions */
static constexpr auto ORPHAN_TX_EXPIRE_TIME{20min};
/** Minimum time between orphan transactions expire time checks */
static constexpr auto ORPHAN_TX_EXPIRE_INTERVAL{5min};

bool TxOrphanage::AddTx(const CTransactionRef &tx, NodeId peer) {
    LOCK(m_mutex);

    const TxId &txid = tx->GetId();
    if (m_orphans.count(txid)) {
        return false;
    }

    // Ignore big transactions, to avoid a send-big-orphans memory exhaustion
    // attack. If a peer has a legitimate large transaction with a missing
    // parent then we assume it will rebroadcast it later, after the parent
    // transaction(s) have been mined or received.
    // 100 orphans, each of which is at most 100,000 bytes big is at most 10
    // megabytes of orphans and somewhat more byprev index (in the worst case):
    unsigned int sz = tx->GetTotalSize();
    if (sz > MAX_STANDARD_TX_SIZE) {
        LogPrint(BCLog::TXPACKAGES,
                 "ignoring large orphan tx (size: %u, hash: %s)\n", sz,
                 txid.ToString());
        return false;
    }

    auto ret = m_orphans.emplace(
        txid, OrphanTx{tx, peer, Now<NodeSeconds>() + ORPHAN_TX_EXPIRE_TIME,
                       m_orphan_list.size()});
    assert(ret.second);
    m_orphan_list.push_back(ret.first);
    for (const CTxIn &txin : tx->vin) {
        m_outpoint_to_orphan_it[txin.prevout].insert(ret.first);
    }

    LogPrint(BCLog::TXPACKAGES,
             "stored orphan tx %s, size: %u (mapsz %u outsz %u)\n",
             txid.ToString(), sz, m_orphans.size(),
             m_outpoint_to_orphan_it.size());
    return true;
}

int TxOrphanage::EraseTx(const TxId &txid) {
    LOCK(m_mutex);
    return EraseTxNoLock(txid);
}

int TxOrphanage::EraseTxNoLock(const TxId &txid) {
    AssertLockHeld(m_mutex);
    std::map<TxId, OrphanTx>::iterator it = m_orphans.find(txid);
    if (it == m_orphans.end()) {
        return 0;
    }
    for (const CTxIn &txin : it->second.tx->vin) {
        auto itPrev = m_outpoint_to_orphan_it.find(txin.prevout);
        if (itPrev == m_outpoint_to_orphan_it.end()) {
            continue;
        }
        itPrev->second.erase(it);
        if (itPrev->second.empty()) {
            m_outpoint_to_orphan_it.erase(itPrev);
        }
    }

    size_t old_pos = it->second.list_pos;
    assert(m_orphan_list[old_pos] == it);
    if (old_pos + 1 != m_orphan_list.size()) {
        // Unless we're deleting the last entry in m_orphan_list, move the last
        // entry to the position we're deleting.
        auto it_last = m_orphan_list.back();
        m_orphan_list[old_pos] = it_last;
        it_last->second.list_pos = old_pos;
    }

    // Time spent in orphanage = difference between current and entry time.
    // Entry time is equal to ORPHAN_TX_EXPIRE_TIME earlier than entry's expiry.
    LogPrint(BCLog::TXPACKAGES, "   removed orphan tx %s after %ds\n",
             txid.ToString(),
             Ticks<std::chrono::seconds>(NodeClock::now() +
                                         ORPHAN_TX_EXPIRE_TIME -
                                         it->second.nTimeExpire));
    m_orphan_list.pop_back();

    m_orphans.erase(it);
    return 1;
}

void TxOrphanage::EraseForPeer(NodeId peer) {
    LOCK(m_mutex);

    m_peer_work_set.erase(peer);

    int nErased = 0;
    std::map<TxId, OrphanTx>::iterator iter = m_orphans.begin();
    while (iter != m_orphans.end()) {
        // increment to avoid iterator becoming invalid after erasure
        const auto &[txid, orphan] = *iter++;
        if (orphan.fromPeer == peer) {
            nErased += EraseTxNoLock(txid);
        }
    }
    if (nErased > 0) {
        LogPrint(BCLog::TXPACKAGES,
                 "Erased %d orphan transaction(s) from peer=%d\n", nErased,
                 peer);
    }
}

unsigned int TxOrphanage::LimitOrphans(unsigned int max_orphans,
                                       FastRandomContext &rng) {
    LOCK(m_mutex);

    unsigned int nEvicted = 0;
    auto nNow{Now<NodeSeconds>()};
    if (m_next_sweep <= nNow) {
        // Sweep out expired orphan pool entries:
        int nErased = 0;
        auto nMinExpTime{nNow + ORPHAN_TX_EXPIRE_TIME -
                         ORPHAN_TX_EXPIRE_INTERVAL};
        std::map<TxId, OrphanTx>::iterator iter = m_orphans.begin();
        while (iter != m_orphans.end()) {
            std::map<TxId, OrphanTx>::iterator maybeErase = iter++;
            if (maybeErase->second.nTimeExpire <= nNow) {
                nErased += EraseTxNoLock(maybeErase->second.tx->GetId());
            } else {
                nMinExpTime =
                    std::min(maybeErase->second.nTimeExpire, nMinExpTime);
            }
        }
        // Sweep again 5 minutes after the next entry that expires in order to
        // batch the linear scan.
        m_next_sweep = nMinExpTime + ORPHAN_TX_EXPIRE_INTERVAL;
        if (nErased > 0) {
            LogPrint(BCLog::TXPACKAGES,
                     "Erased %d orphan tx due to expiration\n", nErased);
        }
    }
    while (m_orphans.size() > max_orphans) {
        // Evict a random orphan:
        size_t randompos = rng.randrange(m_orphan_list.size());
        EraseTxNoLock(m_orphan_list[randompos]->first);
        ++nEvicted;
    }
    return nEvicted;
}

void TxOrphanage::AddChildrenToWorkSet(const CTransaction &tx) {
    LOCK(m_mutex);

    for (size_t i = 0; i < tx.vout.size(); i++) {
        const auto it_by_prev =
            m_outpoint_to_orphan_it.find(COutPoint(tx.GetId(), i));
        if (it_by_prev != m_outpoint_to_orphan_it.end()) {
            for (const auto &elem : it_by_prev->second) {
                // Get this peer's work set, emplacing an empty set if it didn't
                // exist
                std::set<TxId> &orphan_work_set =
                    m_peer_work_set.try_emplace(elem->second.fromPeer)
                        .first->second;
                // Add this tx to the work set
                orphan_work_set.insert(elem->first);
                LogPrint(BCLog::TXPACKAGES, "added %s to peer %d workset\n",
                         tx.GetId().ToString(), elem->second.fromPeer);
            }
        }
    }
}

bool TxOrphanage::HaveTx(const TxId &txid) const {
    LOCK(m_mutex);
    return m_orphans.count(txid);
}

CTransactionRef TxOrphanage::GetTxToReconsider(NodeId peer) {
    LOCK(m_mutex);

    auto work_set_it = m_peer_work_set.find(peer);
    if (work_set_it != m_peer_work_set.end()) {
        auto &work_set = work_set_it->second;
        while (!work_set.empty()) {
            TxId txid = *work_set.begin();
            work_set.erase(work_set.begin());

            const auto orphan_it = m_orphans.find(txid);
            if (orphan_it != m_orphans.end()) {
                return orphan_it->second.tx;
            }
        }
    }
    return nullptr;
}

bool TxOrphanage::HaveTxToReconsider(NodeId peer) {
    LOCK(m_mutex);

    auto work_set_it = m_peer_work_set.find(peer);
    if (work_set_it != m_peer_work_set.end()) {
        auto &work_set = work_set_it->second;
        return !work_set.empty();
    }
    return false;
}

void TxOrphanage::EraseForBlock(const CBlock &block) {
    LOCK(m_mutex);

    std::vector<TxId> vOrphanErase;

    for (const CTransactionRef &ptx : block.vtx) {
        const CTransaction &tx = *ptx;

        // Which orphan pool entries must we evict?
        for (const auto &txin : tx.vin) {
            auto itByPrev = m_outpoint_to_orphan_it.find(txin.prevout);
            if (itByPrev == m_outpoint_to_orphan_it.end()) {
                continue;
            }

            for (auto mi = itByPrev->second.begin();
                 mi != itByPrev->second.end(); ++mi) {
                const CTransaction &orphanTx = *(*mi)->second.tx;
                const TxId &orphanId = orphanTx.GetId();
                vOrphanErase.push_back(orphanId);
            }
        }
    }

    // Erase orphan transactions included or precluded by this block
    if (vOrphanErase.size()) {
        int nErased = 0;
        for (const auto &orphanId : vOrphanErase) {
            nErased += EraseTxNoLock(orphanId);
        }
        LogPrint(
            BCLog::TXPACKAGES,
            "Erased %d orphan transaction(s) included or conflicted by block\n",
            nErased);
    }
}

std::vector<CTransactionRef>
TxOrphanage::GetChildrenFromSamePeer(const CTransactionRef &parent,
                                     NodeId nodeid) const {
    LOCK(m_mutex);

    // First construct a vector of iterators to ensure we do not return
    // duplicates of the same tx and so we can sort by nTimeExpire.
    std::vector<OrphanMap::iterator> iters;

    // For each output, get all entries spending this prevout, filtering for
    // ones from the specified peer.
    for (unsigned int i = 0; i < parent->vout.size(); i++) {
        const auto it_by_prev =
            m_outpoint_to_orphan_it.find(COutPoint(parent->GetId(), i));
        if (it_by_prev != m_outpoint_to_orphan_it.end()) {
            for (const auto &elem : it_by_prev->second) {
                if (elem->second.fromPeer == nodeid) {
                    iters.emplace_back(elem);
                }
            }
        }
    }

    // Sort by address so that duplicates can be deleted. At the same time, sort
    // so that more recent orphans (which expire later) come first. Break ties
    // based on address, as nTimeExpire is quantified in seconds and it is
    // possible for orphans to have the same expiry.
    std::sort(iters.begin(), iters.end(), [](const auto &lhs, const auto &rhs) {
        if (lhs->second.nTimeExpire == rhs->second.nTimeExpire) {
            return &(*lhs) < &(*rhs);
        }
        return lhs->second.nTimeExpire > rhs->second.nTimeExpire;
    });
    // Erase duplicates
    iters.erase(std::unique(iters.begin(), iters.end()), iters.end());

    // Convert to a vector of CTransactionRef
    std::vector<CTransactionRef> children_found;
    children_found.reserve(iters.size());
    for (const auto &child_iter : iters) {
        children_found.emplace_back(child_iter->second.tx);
    }
    return children_found;
}

std::vector<std::pair<CTransactionRef, NodeId>>
TxOrphanage::GetChildrenFromDifferentPeer(const CTransactionRef &parent,
                                          NodeId nodeid) const {
    LOCK(m_mutex);

    // First construct vector of iterators to ensure we do not return duplicates
    // of the same tx.
    std::vector<OrphanMap::iterator> iters;

    // For each output, get all entries spending this prevout, filtering for
    // ones not from the specified peer.
    for (unsigned int i = 0; i < parent->vout.size(); i++) {
        const auto it_by_prev =
            m_outpoint_to_orphan_it.find(COutPoint(parent->GetId(), i));
        if (it_by_prev != m_outpoint_to_orphan_it.end()) {
            for (const auto &elem : it_by_prev->second) {
                if (elem->second.fromPeer != nodeid) {
                    iters.emplace_back(elem);
                }
            }
        }
    }

    // Erase duplicates
    std::sort(iters.begin(), iters.end(), IteratorComparator());
    iters.erase(std::unique(iters.begin(), iters.end()), iters.end());

    // Convert iterators to pair<CTransactionRef, NodeId>
    std::vector<std::pair<CTransactionRef, NodeId>> children_found;
    children_found.reserve(iters.size());
    for (const auto &child_iter : iters) {
        children_found.emplace_back(child_iter->second.tx,
                                    child_iter->second.fromPeer);
    }
    return children_found;
}
