// Copyright (c) 2021 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <txorphanage.h>

#include <consensus/validation.h>
#include <logging.h>
#include <policy/policy.h>

#include <cassert>

/** Expiration time for orphan transactions in seconds */
static constexpr int64_t ORPHAN_TX_EXPIRE_TIME = 20 * 60;
/** Minimum time between orphan transactions expire time checks in seconds */
static constexpr int64_t ORPHAN_TX_EXPIRE_INTERVAL = 5 * 60;

RecursiveMutex TxOrphanage::g_cs_orphans;

bool TxOrphanage::AddTx(const CTransactionRef &tx, NodeId peer) {
    LOCK(g_cs_orphans);

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
        LogPrint(BCLog::MEMPOOL,
                 "ignoring large orphan tx (size: %u, hash: %s)\n", sz,
                 txid.ToString());
        return false;
    }

    auto ret = m_orphans.emplace(
        txid, OrphanTx{tx, peer, GetTime() + ORPHAN_TX_EXPIRE_TIME,
                       m_orphan_list.size()});
    assert(ret.second);
    m_orphan_list.push_back(ret.first);
    for (const CTxIn &txin : tx->vin) {
        m_outpoint_to_orphan_it[txin.prevout].insert(ret.first);
    }

    LogPrint(BCLog::MEMPOOL, "stored orphan tx %s (mapsz %u outsz %u)\n",
             txid.ToString(), m_orphans.size(), m_outpoint_to_orphan_it.size());
    return true;
}

int TxOrphanage::EraseTx(const TxId &txid) {
    LOCK(g_cs_orphans);
    return _EraseTx(txid);
}

int TxOrphanage::_EraseTx(const TxId &txid) {
    AssertLockHeld(g_cs_orphans);
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
    m_orphan_list.pop_back();

    m_orphans.erase(it);
    return 1;
}

void TxOrphanage::EraseForPeer(NodeId peer) {
    LOCK(g_cs_orphans);

    m_peer_work_set.erase(peer);

    int nErased = 0;
    std::map<TxId, OrphanTx>::iterator iter = m_orphans.begin();
    while (iter != m_orphans.end()) {
        std::map<TxId, OrphanTx>::iterator maybeErase =
            iter++; // increment to avoid iterator becoming invalid
        if (maybeErase->second.fromPeer == peer) {
            nErased += _EraseTx(maybeErase->second.tx->GetId());
        }
    }
    if (nErased > 0) {
        LogPrint(BCLog::MEMPOOL, "Erased %d orphan tx from peer=%d\n", nErased,
                 peer);
    }
}

unsigned int TxOrphanage::LimitOrphans(unsigned int max_orphans) {
    LOCK(g_cs_orphans);

    unsigned int nEvicted = 0;
    static int64_t nNextSweep;
    int64_t nNow = GetTime();
    if (nNextSweep <= nNow) {
        // Sweep out expired orphan pool entries:
        int nErased = 0;
        int64_t nMinExpTime =
            nNow + ORPHAN_TX_EXPIRE_TIME - ORPHAN_TX_EXPIRE_INTERVAL;
        std::map<TxId, OrphanTx>::iterator iter = m_orphans.begin();
        while (iter != m_orphans.end()) {
            std::map<TxId, OrphanTx>::iterator maybeErase = iter++;
            if (maybeErase->second.nTimeExpire <= nNow) {
                nErased += _EraseTx(maybeErase->second.tx->GetId());
            } else {
                nMinExpTime =
                    std::min(maybeErase->second.nTimeExpire, nMinExpTime);
            }
        }
        // Sweep again 5 minutes after the next entry that expires in order to
        // batch the linear scan.
        nNextSweep = nMinExpTime + ORPHAN_TX_EXPIRE_INTERVAL;
        if (nErased > 0) {
            LogPrint(BCLog::MEMPOOL, "Erased %d orphan tx due to expiration\n",
                     nErased);
        }
    }
    FastRandomContext rng;
    while (m_orphans.size() > max_orphans) {
        // Evict a random orphan:
        size_t randompos = rng.randrange(m_orphan_list.size());
        _EraseTx(m_orphan_list[randompos]->first);
        ++nEvicted;
    }
    return nEvicted;
}

void TxOrphanage::AddChildrenToWorkSet(const CTransaction &tx, NodeId peer) {
    LOCK(g_cs_orphans);

    // Get this peer's work set, emplacing an empty set if it didn't exist
    std::set<TxId> &orphan_work_set =
        m_peer_work_set.try_emplace(peer).first->second;

    for (size_t i = 0; i < tx.vout.size(); i++) {
        const auto it_by_prev =
            m_outpoint_to_orphan_it.find(COutPoint(tx.GetId(), i));
        if (it_by_prev != m_outpoint_to_orphan_it.end()) {
            for (const auto &elem : it_by_prev->second) {
                orphan_work_set.insert(elem->first);
            }
        }
    }
}

bool TxOrphanage::HaveTx(const TxId &txid) const {
    LOCK(g_cs_orphans);
    return m_orphans.count(txid);
}

CTransactionRef TxOrphanage::GetTxToReconsider(NodeId peer, NodeId &originator,
                                               bool &more) {
    LOCK(g_cs_orphans);

    auto work_set_it = m_peer_work_set.find(peer);
    if (work_set_it != m_peer_work_set.end()) {
        auto &work_set = work_set_it->second;
        while (!work_set.empty()) {
            TxId txid = *work_set.begin();
            work_set.erase(work_set.begin());

            const auto orphan_it = m_orphans.find(txid);
            if (orphan_it != m_orphans.end()) {
                more = !work_set.empty();
                originator = orphan_it->second.fromPeer;
                return orphan_it->second.tx;
            }
        }
    }
    more = false;
    return nullptr;
}

void TxOrphanage::EraseForBlock(const CBlock &block) {
    LOCK(g_cs_orphans);

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
            nErased += _EraseTx(orphanId);
        }
        LogPrint(BCLog::MEMPOOL,
                 "Erased %d orphan tx included or conflicted by block\n",
                 nErased);
    }
}
