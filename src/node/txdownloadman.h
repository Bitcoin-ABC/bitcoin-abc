// Copyright (c) 2024 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_NODE_TXDOWNLOADMAN_H
#define BITCOIN_NODE_TXDOWNLOADMAN_H

#include <invrequest.h>
#include <net.h>
#include <net_permissions.h>
#include <policy/packages.h>
#include <util/check.h>

#include <chrono>
#include <cstdint>
#include <memory>
#include <optional>
#include <string>
#include <vector>

class CBlock;
class CRollingBloomFilter;
class CTxMemPool;
class FastRandomContext;
struct TxId;

namespace node {
class TxDownloadManagerImpl;

/** Parameters for the tx requests, see DataRequestParameters. */
static constexpr DataRequestParameters TX_REQUEST_PARAMS{
    .max_peer_request_in_flight = 100,
    .max_peer_announcements = 5000,
    .nonpref_peer_delay = std::chrono::seconds{2},
    .overloaded_peer_delay = std::chrono::seconds{2},
    .getdata_interval = std::chrono::seconds{60},
    .bypass_request_limits_permissions = NetPermissionFlags::Relay,
};

struct TxDownloadOptions {
    /** Read-only reference to mempool. */
    const CTxMemPool &m_mempool;
    /** RNG provided by caller. */
    // fixme: backport core##36077 before core#35986
    FastRandomContext &m_rng;
};
struct TxDownloadConnectionInfo {
    /** Whether this peer is preferred for transaction download. */
    const bool m_preferred;
    /** Whether this peer has Relay permissions. */
    const bool m_relay_permissions;
};
struct PackageToValidate {
    Package m_txns;
    std::vector<NodeId> m_senders;
    /** Construct a 1-parent-1-child package. */
    explicit PackageToValidate(const CTransactionRef &parent,
                               const CTransactionRef &child,
                               NodeId parent_sender, NodeId child_sender)
        : m_txns{parent, child}, m_senders{parent_sender, child_sender} {}

    // Move ctor
    PackageToValidate(PackageToValidate &&other)
        : m_txns{std::move(other.m_txns)},
          m_senders{std::move(other.m_senders)} {}

    // Move assignment
    PackageToValidate &operator=(PackageToValidate &&other) {
        this->m_txns = std::move(other.m_txns);
        this->m_senders = std::move(other.m_senders);
        return *this;
    }

    std::string ToString() const {
        Assume(m_txns.size() == 2);
        return strprintf("parent %s (sender=%d) + child %s (sender=%d)",
                         m_txns.front()->GetId().ToString(), m_senders.front(),
                         m_txns.back()->GetId().ToString(), m_senders.back());
    }
};

/**
 * Class responsible for deciding what transactions to request and, once
 * downloaded, whether and how to validate them. It is also responsible for
 * deciding what transaction packages to validate and how to resolve orphan
 * transactions. Its data structures include InvRequestTracker for scheduling
 * requests, rolling bloom filters for remembering transactions that have
 * already been {accepted, rejected, confirmed}, an orphanage, and a registry of
 * each peer's transaction relay-related information.
 *
 * Caller needs to interact with TxDownloadManager:
 * - ValidationInterface callbacks.
 * - When a potential transaction relay peer connects or disconnects.
 * - When a transaction or package is accepted or rejected from mempool
 * - When a inv, notfound, or tx message is received
 * - To get instructions for which getdata messages to send
 *
 * This class is not thread-safe. Access must be synchronized using an
 * external mutex.
 */
class TxDownloadManager {
    const std::unique_ptr<TxDownloadManagerImpl> m_impl;

public:
    explicit TxDownloadManager(const TxDownloadOptions &options);
    ~TxDownloadManager();

    // Get references to internal data structures. Outside access to these data
    // structures should be temporary and removed later once logic has been
    // moved internally.
    InvRequestTracker<TxId> &GetTxRequestRef();
    CRollingBloomFilter &RecentRejectsFilter();
    CRollingBloomFilter &RecentRejectsPackageReconsiderableFilter();
    CRollingBloomFilter &RecentConfirmedTransactionsFilter();

    // Responses to chain events. TxDownloadManager is not an actual client of
    // ValidationInterface, these are called through PeerManager.
    void ActiveTipChange();
    void BlockConnected(const std::shared_ptr<const CBlock> &pblock);
    void BlockDisconnected();

    /**
     * Check whether we already have this txid in:
     *  - mempool
     *  - orphanage
     *  - conflicting pool
     *  - m_recent_rejects
     *  - m_recent_rejects_package_reconsiderable (if
     *    include_reconsiderable = true)
     *  - m_recent_confirmed_transactions
     */
    bool AlreadyHaveTx(const TxId &txid, bool include_reconsiderable);

    /**
     * Creates a new PeerInfo. Saves the connection info to calculate tx
     * announcement delays later.
     */
    void ConnectedPeer(NodeId nodeid, const TxDownloadConnectionInfo &info);

    /** Deletes all txrequest announcements and orphans for a given peer. */
    void DisconnectedPeer(NodeId nodeid);

    /**
     * Consider adding this tx hash to txrequest. Should be called whenever a
     * new inv has been received. Also called internally when a transaction is
     * missing parents so that we can request them.
     * @param[in] p2p_inv     When true, only add this announcement if we don't
     *                        already have the tx.
     * Returns true if this was a dropped inv (p2p_inv=true and we already have
     * the tx), false otherwise.
     */
    bool AddTxAnnouncement(NodeId peer, const TxId &txid,
                           std::chrono::microseconds now, bool p2p_inv);

    /** Get getdata requests to send. */
    std::vector<TxId> GetRequestsToSend(NodeId nodeid,
                                        std::chrono::microseconds current_time);

    /** Should be called when a notfound for a tx has been received. */
    void ReceivedNotFound(NodeId nodeid, const std::vector<TxId> &txids);

    /**
     * Look for a child of this transaction in the orphanage to form a
     * 1-parent-1-child package, skipping any combinations that have already
     * been tried. Return the resulting package along with the senders of its
     * respective transactions, or std::nullopt if no package is found.
     */
    std::optional<PackageToValidate> Find1P1CPackage(const CTransactionRef &ptx,
                                                     NodeId nodeid);

    /** Respond to successful transaction submission to mempool */
    void MempoolAcceptedTx(const CTransactionRef &tx);
};
} // namespace node
#endif // BITCOIN_NODE_TXDOWNLOADMAN_H
