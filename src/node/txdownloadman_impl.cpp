// Copyright (c) 2024 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <node/txdownloadman.h>
#include <node/txdownloadman_impl.h>

#include <txconflicting.h>
#include <txmempool.h>
#include <txorphanage.h>

namespace node {
// TxDownloadManager wrappers
TxDownloadManager::TxDownloadManager(const TxDownloadOptions &options)
    : m_impl{std::make_unique<TxDownloadManagerImpl>(options)} {}
TxDownloadManager::~TxDownloadManager() = default;

InvRequestTracker<TxId> &TxDownloadManager::GetTxRequestRef() {
    return m_impl->m_txrequest;
}
CRollingBloomFilter &TxDownloadManager::RecentRejectsFilter() {
    return m_impl->RecentRejectsFilter();
}
CRollingBloomFilter &
TxDownloadManager::RecentRejectsPackageReconsiderableFilter() {
    return m_impl->RecentRejectsPackageReconsiderableFilter();
}
CRollingBloomFilter &TxDownloadManager::RecentConfirmedTransactionsFilter() {
    return m_impl->RecentConfirmedTransactionsFilter();
}
void TxDownloadManager::ActiveTipChange() {
    m_impl->ActiveTipChange();
}
void TxDownloadManager::BlockConnected(
    const std::shared_ptr<const CBlock> &pblock) {
    m_impl->BlockConnected(pblock);
}
void TxDownloadManager::BlockDisconnected() {
    m_impl->BlockDisconnected();
}
bool TxDownloadManager::AlreadyHaveTx(const TxId &txid,
                                      bool include_reconsiderable) {
    return m_impl->AlreadyHaveTx(txid, include_reconsiderable);
}
void TxDownloadManager::ConnectedPeer(NodeId nodeid,
                                      const TxDownloadConnectionInfo &info) {
    m_impl->ConnectedPeer(nodeid, info);
}
void TxDownloadManager::DisconnectedPeer(NodeId nodeid) {
    m_impl->DisconnectedPeer(nodeid);
}

// TxDownloadManagerImpl
void TxDownloadManagerImpl::ActiveTipChange() {
    RecentRejectsFilter().reset();
    RecentRejectsPackageReconsiderableFilter().reset();
}

void TxDownloadManagerImpl::BlockConnected(
    const std::shared_ptr<const CBlock> &pblock) {
    m_opts.m_mempool.withOrphanage([&pblock](TxOrphanage &orphanage) {
        orphanage.EraseForBlock(*pblock);
    });
    m_opts.m_mempool.withConflicting([&pblock](TxConflicting &conflicting) {
        conflicting.EraseForBlock(*pblock);
    });

    for (const CTransactionRef &ptx : pblock->vtx) {
        RecentConfirmedTransactionsFilter().insert(ptx->GetId());
        m_txrequest.ForgetInvId(ptx->GetId());
    }
}

void TxDownloadManagerImpl::BlockDisconnected() {
    // To avoid relay problems with transactions that were previously
    // confirmed, clear our filter of recently confirmed transactions whenever
    // there's a reorg.
    // This means that in a 1-block reorg (where 1 block is disconnected and
    // then another block reconnected), our filter will drop to having only one
    // block's worth of transactions in it, but that should be fine, since
    // presumably the most common case of relaying a confirmed transaction
    // should be just after a new block containing it is found.
    RecentConfirmedTransactionsFilter().reset();
}

bool TxDownloadManagerImpl::AlreadyHaveTx(const TxId &txid,
                                          bool include_reconsiderable) {
    if (m_opts.m_mempool.withOrphanage([&txid](const TxOrphanage &orphanage) {
            return orphanage.HaveTx(txid);
        })) {
        return true;
    }

    if (m_opts.m_mempool.withConflicting(
            [&txid](const TxConflicting &conflicting) {
                return conflicting.HaveTx(txid);
            })) {
        return true;
    }

    if (include_reconsiderable &&
        RecentRejectsPackageReconsiderableFilter().contains(txid)) {
        return true;
    }

    if (RecentConfirmedTransactionsFilter().contains(txid)) {
        return true;
    }

    return RecentRejectsFilter().contains(txid) ||
           m_opts.m_mempool.exists(txid);
}

void TxDownloadManagerImpl::ConnectedPeer(
    NodeId nodeid, const TxDownloadConnectionInfo &info) {
    // If already connected (shouldn't happen in practice), exit early.
    if (m_peer_info.contains(nodeid)) {
        return;
    }

    m_peer_info.try_emplace(nodeid, info);
}

void TxDownloadManagerImpl::DisconnectedPeer(NodeId nodeid) {
    m_opts.m_mempool.withOrphanage(
        [nodeid](TxOrphanage &orphanage) { orphanage.EraseForPeer(nodeid); });
    m_txrequest.DisconnectedPeer(nodeid);

    if (auto it = m_peer_info.find(nodeid); it != m_peer_info.end()) {
        m_peer_info.erase(it);
    }
}
} // namespace node
