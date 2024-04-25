// Copyright (c) 2024 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <node/txdownloadman.h>
#include <node/txdownloadman_impl.h>

#include <logging.h>
#include <random.h>
#include <txconflicting.h>
#include <txmempool.h>
#include <txorphanage.h>

#include <numeric>

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
bool TxDownloadManager::AddTxAnnouncement(NodeId peer, const TxId &txid,
                                          std::chrono::microseconds now,
                                          bool p2p_inv) {
    return m_impl->AddTxAnnouncement(peer, txid, now, p2p_inv);
}
std::vector<TxId>
TxDownloadManager::GetRequestsToSend(NodeId nodeid,
                                     std::chrono::microseconds current_time) {
    return m_impl->GetRequestsToSend(nodeid, current_time);
}
void TxDownloadManager::ReceivedNotFound(NodeId nodeid,
                                         const std::vector<TxId> &txids) {
    m_impl->ReceivedNotFound(nodeid, txids);
}
std::optional<PackageToValidate>
TxDownloadManager::Find1P1CPackage(const CTransactionRef &ptx, NodeId nodeid) {
    return m_impl->Find1P1CPackage(ptx, nodeid);
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

bool TxDownloadManagerImpl::AddTxAnnouncement(NodeId peer, const TxId &txid,
                                              std::chrono::microseconds now,
                                              bool p2p_inv) {
    // If this is an inv received from a peer and we already have it, we can
    // drop it.
    if (p2p_inv && AlreadyHaveTx(txid, /*include_reconsiderable=*/true)) {
        return true;
    }

    auto it = m_peer_info.find(peer);
    if (it == m_peer_info.end()) {
        return false;
    }
    const auto &info = it->second.m_connection_info;
    if (TooManyAnnouncements(m_txrequest, peer, TX_REQUEST_PARAMS,
                             /*bypass_limits=*/info.m_relay_permissions)) {
        // Too many queued announcements for this peer
        return false;
    }
    // Decide the InvRequestTracker parameters for this announcement:
    // - "preferred": if fPreferredDownload is set (= outbound, or
    //   NetPermissionFlags::NoBan permission)
    // - "reqtime": current time plus delays, see ComputeRequestTime
    const auto reqtime = ComputeRequestTime(
        m_txrequest, peer, TX_REQUEST_PARAMS, now, info.m_preferred,
        /*bypass_limits=*/info.m_relay_permissions);

    m_txrequest.ReceivedInv(peer, txid, info.m_preferred, reqtime);

    return false;
}

std::vector<TxId> TxDownloadManagerImpl::GetRequestsToSend(
    NodeId nodeid, std::chrono::microseconds current_time) {
    std::vector<TxId> requests;
    std::vector<std::pair<NodeId, TxId>> expired;
    auto requestable =
        m_txrequest.GetRequestable(nodeid, current_time, &expired);
    for (const auto &entry : expired) {
        LogDebug(BCLog::NET, "timeout of inflight tx %s from peer=%d\n",
                 entry.second.ToString(), entry.first);
    }
    for (const TxId &txid : requestable) {
        // Exclude m_recent_rejects_package_reconsiderable: we may be
        // requesting a missing parent that was previously rejected for being
        // too low feerate.
        if (!AlreadyHaveTx(txid, /*include_reconsiderable=*/false)) {
            requests.emplace_back(txid);
            m_txrequest.RequestedData(nodeid, txid,
                                      current_time +
                                          TX_REQUEST_PARAMS.getdata_interval);
        } else {
            // We have already seen this transaction, no need to download. This
            // is just a belt-and-suspenders, as this should already be called
            // whenever a transaction becomes AlreadyHaveTx().
            m_txrequest.ForgetInvId(txid);
        }
    }
    return requests;
}

void TxDownloadManagerImpl::ReceivedNotFound(NodeId nodeid,
                                             const std::vector<TxId> &txids) {
    for (const auto &txid : txids) {
        // If we receive a NOTFOUND message for a tx we requested, mark the
        // announcement for it as completed in InvRequestTracker.
        m_txrequest.ReceivedResponse(nodeid, txid);
    }
}

std::optional<PackageToValidate>
TxDownloadManagerImpl::Find1P1CPackage(const CTransactionRef &ptx,
                                       NodeId nodeid) {
    const auto &parent_txid{ptx->GetId()};

    Assume(RecentRejectsPackageReconsiderableFilter().contains(parent_txid));

    // Prefer children from this peer. This helps prevent censorship attempts in
    // which an attacker sends lots of fake children for the parent, and we
    // (unluckily) keep selecting the fake children instead of the real one
    // provided by the honest peer.
    const auto cpfp_candidates_same_peer{m_opts.m_mempool.withOrphanage(
        [&ptx, nodeid](const TxOrphanage &orphanage) {
            return orphanage.GetChildrenFromSamePeer(ptx, nodeid);
        })};

    // These children should be sorted from newest to oldest.
    for (const auto &child : cpfp_candidates_same_peer) {
        Package maybe_cpfp_package{ptx, child};
        if (!RecentRejectsPackageReconsiderableFilter().contains(
                GetPackageHash(maybe_cpfp_package))) {
            return PackageToValidate{ptx, child, nodeid, nodeid};
        }
    }

    // If no suitable candidate from the same peer is found, also try children
    // that were provided by a different peer. This is useful because sometimes
    // multiple peers announce both transactions to us, and we happen to
    // download them from different peers (we wouldn't have known that these 2
    // transactions are related). We still want to find 1p1c packages then.
    //
    // If we start tracking all announcers of orphans, we can restrict this
    // logic to parent + child pairs in which both were provided by the same
    // peer, i.e. delete this step.
    const auto cpfp_candidates_different_peer{m_opts.m_mempool.withOrphanage(
        [&ptx, nodeid](const TxOrphanage &orphanage) {
            return orphanage.GetChildrenFromDifferentPeer(ptx, nodeid);
        })};

    // Find the first 1p1c that hasn't already been rejected. We randomize the
    // order to not create a bias that attackers can use to delay package
    // acceptance.
    //
    // Create a random permutation of the indices.
    std::vector<size_t> tx_indices(cpfp_candidates_different_peer.size());
    std::iota(tx_indices.begin(), tx_indices.end(), 0);
    Shuffle(tx_indices.begin(), tx_indices.end(), m_opts.m_rng);

    for (const auto index : tx_indices) {
        // If we already tried a package and failed for any reason, the combined
        // hash was cached in m_recent_rejects_package_reconsiderable.
        const auto [child_tx, child_sender] =
            cpfp_candidates_different_peer.at(index);
        Package maybe_cpfp_package{ptx, child_tx};
        if (!RecentRejectsPackageReconsiderableFilter().contains(
                GetPackageHash(maybe_cpfp_package))) {
            return PackageToValidate{ptx, child_tx, nodeid, child_sender};
        }
    }
    return std::nullopt;
}
} // namespace node
