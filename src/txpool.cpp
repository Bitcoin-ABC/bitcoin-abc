// Copyright (c) 2021 The Bitcoin Core developers
// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <txpool.h>

#include <consensus/validation.h>
#include <logging.h>
#include <policy/policy.h>
#include <random.h>

#include <cassert>

bool TxPool::AddTx(const CTransactionRef &tx, NodeId peer) {
    LOCK(m_mutex);

    const TxId &txid = tx->GetId();
    if (m_pool_txs.count(txid)) {
        return false;
    }

    // Ignore big transactions, to avoid a memory exhaustion attack. If a peer
    // has a legitimate large transaction then we assume it will rebroadcast it
    // later.
    unsigned int sz = tx->GetTotalSize();
    if (sz > MAX_STANDARD_TX_SIZE) {
        LogPrint(BCLog::TXPACKAGES,
                 "ignoring large %s tx (size: %u, hash: %s)\n", txKind, sz,
                 txid.ToString());
        return false;
    }

    auto ret = m_pool_txs.emplace(
        txid,
        PoolTx{tx, peer, Now<NodeSeconds>() + expireTime, m_txs_list.size()});
    assert(ret.second);
    m_txs_list.push_back(ret.first);
    for (const CTxIn &txin : tx->vin) {
        m_outpoint_to_tx_it[txin.prevout].insert(ret.first);
    }

    LogPrint(BCLog::TXPACKAGES,
             "stored %s tx %s, size: %u (mapsz %u outsz %u)\n", txKind,
             txid.ToString(), sz, m_pool_txs.size(),
             m_outpoint_to_tx_it.size());
    return true;
}

int TxPool::EraseTx(const TxId &txid) {
    LOCK(m_mutex);
    return EraseTxNoLock(txid);
}

int TxPool::EraseTxNoLock(const TxId &txid) {
    AssertLockHeld(m_mutex);
    std::map<TxId, PoolTx>::iterator it = m_pool_txs.find(txid);
    if (it == m_pool_txs.end()) {
        return 0;
    }
    for (const CTxIn &txin : it->second.tx->vin) {
        auto itPrev = m_outpoint_to_tx_it.find(txin.prevout);
        if (itPrev == m_outpoint_to_tx_it.end()) {
            continue;
        }
        itPrev->second.erase(it);
        if (itPrev->second.empty()) {
            m_outpoint_to_tx_it.erase(itPrev);
        }
    }

    size_t old_pos = it->second.list_pos;
    assert(m_txs_list[old_pos] == it);
    if (old_pos + 1 != m_txs_list.size()) {
        // Unless we're deleting the last entry in m_txs_list, move the last
        // entry to the position we're deleting.
        auto it_last = m_txs_list.back();
        m_txs_list[old_pos] = it_last;
        it_last->second.list_pos = old_pos;
    }

    // Time spent in pool = difference between current and entry time.
    // Entry time is equal to expireTime earlier than entry's expiry.
    LogPrint(BCLog::TXPACKAGES, "   removed %s tx %s after %ds\n", txKind,
             txid.ToString(),
             Ticks<std::chrono::seconds>(NodeClock::now() + expireTime -
                                         it->second.nTimeExpire));
    m_txs_list.pop_back();

    m_pool_txs.erase(it);
    return 1;
}

void TxPool::EraseForPeer(NodeId peer) {
    LOCK(m_mutex);

    m_peer_work_set.erase(peer);

    int nErased = 0;
    std::map<TxId, PoolTx>::iterator iter = m_pool_txs.begin();
    while (iter != m_pool_txs.end()) {
        // increment to avoid iterator becoming invalid after erasure
        const auto &[txid, orphan] = *iter++;
        if (orphan.fromPeer == peer) {
            nErased += EraseTxNoLock(txid);
        }
    }
    if (nErased > 0) {
        LogPrint(BCLog::TXPACKAGES,
                 "Erased %d %s transaction(s) from peer=%d\n", nErased, txKind,
                 peer);
    }
}

unsigned int TxPool::LimitTxs(unsigned int max_txs, FastRandomContext &rng) {
    LOCK(m_mutex);

    unsigned int nEvicted = 0;
    auto nNow{Now<NodeSeconds>()};
    if (m_next_sweep <= nNow) {
        // Sweep out expired orphan pool entries:
        int nErased = 0;
        auto nMinExpTime{nNow + expireTime - expireInterval};
        std::map<TxId, PoolTx>::iterator iter = m_pool_txs.begin();
        while (iter != m_pool_txs.end()) {
            std::map<TxId, PoolTx>::iterator maybeErase = iter++;
            if (maybeErase->second.nTimeExpire <= nNow) {
                nErased += EraseTxNoLock(maybeErase->second.tx->GetId());
            } else {
                nMinExpTime =
                    std::min(maybeErase->second.nTimeExpire, nMinExpTime);
            }
        }
        // Sweep again 5 minutes after the next entry that expires in order to
        // batch the linear scan.
        m_next_sweep = nMinExpTime + expireInterval;
        if (nErased > 0) {
            LogPrint(BCLog::TXPACKAGES, "Erased %d %s tx due to expiration\n",
                     nErased, txKind);
        }
    }
    while (m_pool_txs.size() > max_txs) {
        // Evict a random tx:
        size_t randompos = rng.randrange(m_txs_list.size());
        EraseTxNoLock(m_txs_list[randompos]->first);
        ++nEvicted;
    }
    return nEvicted;
}

void TxPool::AddChildrenToWorkSet(const CTransaction &tx) {
    LOCK(m_mutex);

    for (size_t i = 0; i < tx.vout.size(); i++) {
        const auto it_by_prev =
            m_outpoint_to_tx_it.find(COutPoint(tx.GetId(), i));
        if (it_by_prev != m_outpoint_to_tx_it.end()) {
            for (const auto &elem : it_by_prev->second) {
                // Get this peer's work set, emplacing an empty set if it didn't
                // exist
                std::set<TxId> &work_set =
                    m_peer_work_set.try_emplace(elem->second.fromPeer)
                        .first->second;
                // Add this tx to the work set
                work_set.insert(elem->first);
                LogPrint(BCLog::TXPACKAGES,
                         "added %s tx %s to peer %d workset\n", txKind,
                         tx.GetId().ToString(), elem->second.fromPeer);
            }
        }
    }
}

bool TxPool::HaveTx(const TxId &txid) const {
    LOCK(m_mutex);
    return m_pool_txs.count(txid);
}

CTransactionRef TxPool::GetTx(const TxId &txid) const {
    LOCK(m_mutex);

    const auto tx_it = m_pool_txs.find(txid);
    if (tx_it != m_pool_txs.end()) {
        return tx_it->second.tx;
    }

    return nullptr;
}

std::vector<CTransactionRef>
TxPool::GetConflictTxs(const CTransactionRef &tx) const {
    LOCK(m_mutex);

    std::vector<CTransactionRef> conflictingTxs;
    for (const auto &txin : tx->vin) {
        auto itByPrev = m_outpoint_to_tx_it.find(txin.prevout);
        if (itByPrev == m_outpoint_to_tx_it.end()) {
            continue;
        }

        for (auto mi = itByPrev->second.begin(); mi != itByPrev->second.end();
             ++mi) {
            conflictingTxs.push_back((*mi)->second.tx);
        }
    }
    return conflictingTxs;
}

CTransactionRef TxPool::GetTxToReconsider(NodeId peer) {
    LOCK(m_mutex);

    auto work_set_it = m_peer_work_set.find(peer);
    if (work_set_it != m_peer_work_set.end()) {
        auto &work_set = work_set_it->second;
        while (!work_set.empty()) {
            TxId txid = *work_set.begin();
            work_set.erase(work_set.begin());

            const auto tx_it = m_pool_txs.find(txid);
            if (tx_it != m_pool_txs.end()) {
                return tx_it->second.tx;
            }
        }
    }
    return nullptr;
}

bool TxPool::HaveTxToReconsider(NodeId peer) {
    LOCK(m_mutex);

    auto work_set_it = m_peer_work_set.find(peer);
    if (work_set_it != m_peer_work_set.end()) {
        auto &work_set = work_set_it->second;
        return !work_set.empty();
    }
    return false;
}

void TxPool::EraseForBlock(const CBlock &block) {
    LOCK(m_mutex);

    if (m_pool_txs.empty()) {
        return;
    }

    std::vector<TxId> vTxErase;

    for (const CTransactionRef &ptx : block.vtx) {
        const CTransaction &tx = *ptx;

        // Which pool entries must we evict?
        for (const auto &txin : tx.vin) {
            auto itByPrev = m_outpoint_to_tx_it.find(txin.prevout);
            if (itByPrev == m_outpoint_to_tx_it.end()) {
                continue;
            }

            for (auto mi = itByPrev->second.begin();
                 mi != itByPrev->second.end(); ++mi) {
                const CTransaction &orphanTx = *(*mi)->second.tx;
                const TxId &txid = orphanTx.GetId();
                vTxErase.push_back(txid);
            }
        }
    }

    // Erase transactions included or precluded by this block
    if (vTxErase.size()) {
        int nErased = 0;
        for (const auto &txid : vTxErase) {
            nErased += EraseTxNoLock(txid);
        }
        LogPrint(
            BCLog::TXPACKAGES,
            "Erased %d %s transaction(s) included or conflicted by block\n",
            nErased, txKind);
    }
}

std::vector<CTransactionRef>
TxPool::GetChildrenFromSamePeer(const CTransactionRef &parent,
                                NodeId nodeid) const {
    LOCK(m_mutex);

    // First construct a vector of iterators to ensure we do not return
    // duplicates of the same tx and so we can sort by nTimeExpire.
    std::vector<PoolTxMap::iterator> iters;

    // For each output, get all entries spending this prevout, filtering for
    // ones from the specified peer.
    for (unsigned int i = 0; i < parent->vout.size(); i++) {
        const auto it_by_prev =
            m_outpoint_to_tx_it.find(COutPoint(parent->GetId(), i));
        if (it_by_prev != m_outpoint_to_tx_it.end()) {
            for (const auto &elem : it_by_prev->second) {
                if (elem->second.fromPeer == nodeid) {
                    iters.emplace_back(elem);
                }
            }
        }
    }

    // Sort by address so that duplicates can be deleted. At the same time, sort
    // so that more recent txs (which expire later) come first. Break ties
    // based on address, as nTimeExpire is quantified in seconds and it is
    // possible for txs to have the same expiry.
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
TxPool::GetChildrenFromDifferentPeer(const CTransactionRef &parent,
                                     NodeId nodeid) const {
    LOCK(m_mutex);

    // First construct vector of iterators to ensure we do not return duplicates
    // of the same tx.
    std::vector<PoolTxMap::iterator> iters;

    // For each output, get all entries spending this prevout, filtering for
    // ones not from the specified peer.
    for (unsigned int i = 0; i < parent->vout.size(); i++) {
        const auto it_by_prev =
            m_outpoint_to_tx_it.find(COutPoint(parent->GetId(), i));
        if (it_by_prev != m_outpoint_to_tx_it.end()) {
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
