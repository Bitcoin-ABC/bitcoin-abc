// Copyright (c) 2024 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <node/txdownloadman.h>
#include <node/txdownloadman_impl.h>

#include <consensus/validation.h>
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
void TxDownloadManager::MempoolAcceptedTx(const CTransactionRef &tx) {
    m_impl->MempoolAcceptedTx(tx);
}
RejectedTxTodo
TxDownloadManager::MempoolRejectedTx(const CTransactionRef &ptx,
                                     const TxValidationState &state,
                                     NodeId nodeid, bool first_time_failure) {
    return m_impl->MempoolRejectedTx(ptx, state, nodeid, first_time_failure);
}
void TxDownloadManager::MempoolRejectedPackage(const Package &package) {
    m_impl->MempoolRejectedPackage(package);
}
std::pair<bool, std::optional<PackageToValidate>>
TxDownloadManager::ReceivedTx(NodeId nodeid, const CTransactionRef &ptx) {
    return m_impl->ReceivedTx(nodeid, ptx);
}
bool TxDownloadManager::HaveMoreWork(NodeId nodeid) const {
    return m_impl->HaveMoreWork(nodeid);
}
CTransactionRef TxDownloadManager::GetTxToReconsider(NodeId nodeid) {
    return m_impl->GetTxToReconsider(nodeid);
}
void TxDownloadManager::CheckIsEmpty() const {
    m_impl->CheckIsEmpty();
}
void TxDownloadManager::CheckIsEmpty(NodeId nodeid) const {
    m_impl->CheckIsEmpty(nodeid);
}
std::vector<TxOrphanage::PoolTx>
TxDownloadManager::GetOrphanTransactions() const {
    return m_impl->GetOrphanTransactions();
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
    // If this is a request for the parent of an orphan, we don't drop
    // transactions that we already have. In particular, we *do* want to request
    // parents that are in m_recent_rejects_package_reconsiderable, since they
    // can be CPFP'd.
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

void TxDownloadManagerImpl::MempoolAcceptedTx(const CTransactionRef &tx) {
    // As this version of the transaction was acceptable, we can forget about
    // any requests for it. No-op if the tx is not in txrequest.
    m_txrequest.ForgetInvId(tx->GetId());

    m_opts.m_mempool.withOrphanage([&tx](TxOrphanage &orphanage) {
        orphanage.AddChildrenToWorkSet(*tx);
        // If it came from the orphanage, remove it. No-op if the tx is not in
        // txorphanage.
        orphanage.EraseTx(tx->GetId());
    });
}

RejectedTxTodo TxDownloadManagerImpl::MempoolRejectedTx(
    const CTransactionRef &ptx, const TxValidationState &state, NodeId nodeid,
    bool first_time_failure) {
    const CTransaction &tx{*ptx};
    const TxId &txid = ptx->GetId();
    // Results returned to caller
    // Whether we should call AddToCompactExtraTransactions at the end
    bool add_extra_compact_tx{first_time_failure};
    // Hashes to pass to AddKnownTx later
    std::vector<TxId> unique_parents;
    // Populated if failure is reconsiderable and eligible package is found.
    std::optional<PackageToValidate> package_to_validate;

    if (state.GetResult() == TxValidationResult::TX_MISSING_INPUTS) {
        // Only process a new orphan if this is a first time failure, as
        // otherwise it must be either already in orphanage or from 1p1c
        // processing.
        if (first_time_failure) {
            // It may be the case that the orphans parents have all been
            // rejected.
            bool fRejectedParents = false;

            // Deduplicate parent txids, so that we don't have to loop over
            // the same parent txid more than once down below.
            unique_parents.reserve(tx.vin.size());
            for (const CTxIn &txin : tx.vin) {
                // We start with all parents, and then remove duplicates
                // below.
                unique_parents.push_back(txin.prevout.GetTxId());
            }
            std::sort(unique_parents.begin(), unique_parents.end());
            unique_parents.erase(
                std::unique(unique_parents.begin(), unique_parents.end()),
                unique_parents.end());

            // Distinguish between parents in m_recent_rejects and
            // m_recent_rejects_package_reconsiderable. We can tolerate
            // having up to 1 parent in
            // m_recent_rejects_package_reconsiderable since we submit 1p1c
            // packages. However, fail immediately if any are in
            // m_recent_rejects.
            std::optional<TxId> rejected_parent_reconsiderable;
            for (const TxId &parent_txid : unique_parents) {
                if (RecentRejectsFilter().contains(parent_txid)) {
                    fRejectedParents = true;
                    break;
                }

                if (RecentRejectsPackageReconsiderableFilter().contains(
                        parent_txid) &&
                    !m_opts.m_mempool.exists(parent_txid)) {
                    // More than 1 parent in
                    // m_recent_rejects_package_reconsiderable:
                    // 1p1c will not be sufficient to accept this package,
                    // so just give up here.
                    if (rejected_parent_reconsiderable.has_value()) {
                        fRejectedParents = true;
                        break;
                    }
                    rejected_parent_reconsiderable = parent_txid;
                }
            }
            if (!fRejectedParents) {
                const auto current_time{GetTime<std::chrono::microseconds>()};

                for (const TxId &parent_txid : unique_parents) {
                    // Exclude m_recent_rejects_package_reconsiderable: the
                    // missing parent may have been previously rejected for
                    // being too low feerate. This orphan might CPFP it.
                    if (!AlreadyHaveTx(parent_txid,
                                       /*include_reconsiderable=*/false)) {
                        AddTxAnnouncement(nodeid, parent_txid, current_time,
                                          /*p2p_inv=*/false);
                    }
                }

                unsigned int nEvicted =
                    m_opts.m_mempool.withOrphanage([&](TxOrphanage &orphanage) {
                        // Potentially flip add_extra_compact_tx to false if
                        // AddTx returns false because the tx was already there
                        add_extra_compact_tx &= orphanage.AddTx(ptx, nodeid);
                        return orphanage.LimitTxs(m_opts.m_max_orphan_txs,
                                                  m_opts.m_rng);
                    });
                if (nEvicted > 0) {
                    LogDebug(BCLog::TXPACKAGES,
                             "orphanage overflow, removed %u tx\n", nEvicted);
                }

                // Once added to the orphan pool, a tx is considered
                // AlreadyHave, and we shouldn't request it anymore.
                m_txrequest.ForgetInvId(tx.GetId());

            } else {
                unique_parents.clear();
                LogDebug(BCLog::MEMPOOL,
                         "not keeping orphan with rejected parents %s\n",
                         tx.GetId().ToString());
                // We will continue to reject this tx since it has rejected
                // parents so avoid re-requesting it from other peers.
                RecentRejectsFilter().insert(tx.GetId());
                m_txrequest.ForgetInvId(tx.GetId());
            }
        }
    } else {
        if (state.GetResult() ==
            TxValidationResult::TX_PACKAGE_RECONSIDERABLE) {
            // If the result is TX_PACKAGE_RECONSIDERABLE, add it to
            // m_recent_rejects_package_reconsiderable because we should not
            // download or submit this transaction by itself again, but may
            // submit it as part of a package later.
            RecentRejectsPackageReconsiderableFilter().insert(txid);

            if (first_time_failure) {
                // When a transaction fails for TX_PACKAGE_RECONSIDERABLE, look
                // for a matching child in the orphanage, as it is possible that
                // they succeed as a package.
                LogDebug(
                    BCLog::TXPACKAGES,
                    "tx %s failed but reconsiderable, looking for child in "
                    "orphanage\n",
                    txid.ToString());
                package_to_validate = Find1P1CPackage(ptx, nodeid);
            }
        } else {
            RecentRejectsFilter().insert(txid);
        }
        m_txrequest.ForgetInvId(txid);
    }

    // If the tx failed in ProcessOrphanTx, it should be removed from the
    // orphanage unless the tx was still missing inputs. If the tx was not in
    // the orphanage, EraseTx does nothing and returns 0.
    if (state.GetResult() != TxValidationResult::TX_MISSING_INPUTS &&
        m_opts.m_mempool.withOrphanage([&txid](TxOrphanage &orphanage) {
            return orphanage.EraseTx(txid);
        }) > 0) {
        LogDebug(BCLog::TXPACKAGES, "   removed orphan tx %s\n",
                 txid.ToString());
    }

    return RejectedTxTodo{.m_should_add_extra_compact_tx = add_extra_compact_tx,
                          .m_unique_parents = std::move(unique_parents),
                          .m_package_to_validate =
                              std::move(package_to_validate)};
}

void TxDownloadManagerImpl::MempoolRejectedPackage(const Package &package) {
    RecentRejectsPackageReconsiderableFilter().insert(GetPackageHash(package));
}

std::pair<bool, std::optional<PackageToValidate>>
TxDownloadManagerImpl::ReceivedTx(NodeId nodeid, const CTransactionRef &ptx) {
    const TxId &txid = ptx->GetId();

    // Mark that we have received a response
    m_txrequest.ReceivedResponse(nodeid, txid);

    // First check if we should drop this tx.
    if (AlreadyHaveTx(txid, /*include_reconsiderable=*/false)) {
        // If a tx is detected by m_recent_rejects it is ignored. Because we
        // haven't submitted the tx to our mempool, we won't have computed a
        // DoS score for it or determined exactly why we consider it invalid.
        //
        // This means we won't penalize any peer subsequently relaying a DoSy
        // tx (even if we penalized the first peer who gave it to us) because
        // we have to account for m_recent_rejects showing false positives. In
        // other words, we shouldn't penalize a peer if we aren't *sure* they
        // submitted a DoSy tx.
        //
        // Note that m_recent_rejects doesn't just record DoSy or invalid
        // transactions, but any tx not accepted by the mempool, which may be
        // due to node policy (vs. consensus). So we can't blanket penalize a
        // peer simply for relaying a tx that our m_recent_rejects has caught,
        // regardless of false positives.
        return {false, std::nullopt};
    } else if (RecentRejectsPackageReconsiderableFilter().contains(txid)) {
        // When a transaction is already in
        // m_recent_rejects_package_reconsiderable, we shouldn't submit it by
        // itself again. However, look for a matching child in the orphanage,
        // as it is possible that they succeed as a package.
        LogDebug(BCLog::TXPACKAGES,
                 "found tx %s in reconsiderable rejects, looking for child in "
                 "orphanage\n",
                 txid.ToString());
        return {false, Find1P1CPackage(ptx, nodeid)};
    }

    return {true, std::nullopt};
}

bool TxDownloadManagerImpl::HaveMoreWork(NodeId nodeid) {
    return m_opts.m_mempool.withOrphanage([nodeid](TxOrphanage &orphanage) {
        return orphanage.HaveTxToReconsider(nodeid);
    });
}

CTransactionRef TxDownloadManagerImpl::GetTxToReconsider(NodeId nodeid) {
    return m_opts.m_mempool.withOrphanage([nodeid](TxOrphanage &orphanage) {
        return orphanage.GetTxToReconsider(nodeid);
    });
}

void TxDownloadManagerImpl::CheckIsEmpty(NodeId nodeid) {
    assert(m_txrequest.Count(nodeid) == 0);
}
void TxDownloadManagerImpl::CheckIsEmpty() {
    assert(m_opts.m_mempool.withOrphanage([](const TxOrphanage &orphanage) {
        return orphanage.Size();
    }) == 0);
    assert(m_txrequest.Size() == 0);
}
std::vector<TxOrphanage::PoolTx>
TxDownloadManagerImpl::GetOrphanTransactions() const {
    return m_opts.m_mempool.withOrphanage([](const TxOrphanage &orphanage) {
        return orphanage.GetOrphanTransactions();
    });
}
} // namespace node
