// Copyright (c) 2021 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <txorphanage.h>

#include <consensus/validation.h>
#include <logging.h>
#include <policy/policy.h>

#include <cassert>

/** Minimum time between orphan transactions expire time checks in seconds */
static constexpr int64_t ORPHAN_TX_EXPIRE_INTERVAL = 5 * 60;

RecursiveMutex g_cs_orphans;

std::map<TxId, COrphanTx> mapOrphanTransactions GUARDED_BY(g_cs_orphans);

std::map<COutPoint,
         std::set<std::map<TxId, COrphanTx>::iterator, IteratorComparator>>
    mapOrphanTransactionsByPrev GUARDED_BY(g_cs_orphans);

std::vector<std::map<TxId, COrphanTx>::iterator>
    g_orphan_list GUARDED_BY(g_cs_orphans);

int EraseOrphanTx(const TxId &txid) {
    std::map<TxId, COrphanTx>::iterator it = mapOrphanTransactions.find(txid);
    if (it == mapOrphanTransactions.end()) {
        return 0;
    }
    for (const CTxIn &txin : it->second.tx->vin) {
        auto itPrev = mapOrphanTransactionsByPrev.find(txin.prevout);
        if (itPrev == mapOrphanTransactionsByPrev.end()) {
            continue;
        }
        itPrev->second.erase(it);
        if (itPrev->second.empty()) {
            mapOrphanTransactionsByPrev.erase(itPrev);
        }
    }

    size_t old_pos = it->second.list_pos;
    assert(g_orphan_list[old_pos] == it);
    if (old_pos + 1 != g_orphan_list.size()) {
        // Unless we're deleting the last entry in g_orphan_list, move the last
        // entry to the position we're deleting.
        auto it_last = g_orphan_list.back();
        g_orphan_list[old_pos] = it_last;
        it_last->second.list_pos = old_pos;
    }
    g_orphan_list.pop_back();

    mapOrphanTransactions.erase(it);
    return 1;
}

void EraseOrphansFor(NodeId peer) {
    AssertLockHeld(g_cs_orphans);

    int nErased = 0;
    std::map<TxId, COrphanTx>::iterator iter = mapOrphanTransactions.begin();
    while (iter != mapOrphanTransactions.end()) {
        std::map<TxId, COrphanTx>::iterator maybeErase =
            iter++; // increment to avoid iterator becoming invalid
        if (maybeErase->second.fromPeer == peer) {
            nErased += EraseOrphanTx(maybeErase->second.tx->GetId());
        }
    }
    if (nErased > 0) {
        LogPrint(BCLog::MEMPOOL, "Erased %d orphan tx from peer=%d\n", nErased,
                 peer);
    }
}

unsigned int LimitOrphanTxSize(unsigned int nMaxOrphans) {
    AssertLockHeld(g_cs_orphans);

    unsigned int nEvicted = 0;
    static int64_t nNextSweep;
    int64_t nNow = GetTime();
    if (nNextSweep <= nNow) {
        // Sweep out expired orphan pool entries:
        int nErased = 0;
        int64_t nMinExpTime =
            nNow + ORPHAN_TX_EXPIRE_TIME - ORPHAN_TX_EXPIRE_INTERVAL;
        std::map<TxId, COrphanTx>::iterator iter =
            mapOrphanTransactions.begin();
        while (iter != mapOrphanTransactions.end()) {
            std::map<TxId, COrphanTx>::iterator maybeErase = iter++;
            if (maybeErase->second.nTimeExpire <= nNow) {
                nErased += EraseOrphanTx(maybeErase->second.tx->GetId());
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
    while (mapOrphanTransactions.size() > nMaxOrphans) {
        // Evict a random orphan:
        size_t randompos = rng.randrange(g_orphan_list.size());
        EraseOrphanTx(g_orphan_list[randompos]->first);
        ++nEvicted;
    }
    return nEvicted;
}

void AddChildrenToWorkSet(const CTransaction &tx,
                          std::set<TxId> &orphan_work_set) {
    AssertLockHeld(g_cs_orphans);
    for (size_t i = 0; i < tx.vout.size(); i++) {
        const auto it_by_prev =
            mapOrphanTransactionsByPrev.find(COutPoint(tx.GetId(), i));
        if (it_by_prev != mapOrphanTransactionsByPrev.end()) {
            for (const auto &elem : it_by_prev->second) {
                orphan_work_set.insert(elem->first);
            }
        }
    }
}

bool HaveOrphanTx(const TxId &txid) {
    LOCK(g_cs_orphans);
    return mapOrphanTransactions.count(txid);
}

std::pair<CTransactionRef, NodeId> GetOrphanTx(const TxId &txid) {
    AssertLockHeld(g_cs_orphans);

    const auto it = mapOrphanTransactions.find(txid);
    if (it == mapOrphanTransactions.end()) {
        return {nullptr, -1};
    }
    return {it->second.tx, it->second.fromPeer};
}
