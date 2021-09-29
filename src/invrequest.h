// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_INVREQUEST_H
#define BITCOIN_INVREQUEST_H

#include <net.h> // For NodeId

#include <chrono>
#include <cstdint>
#include <functional>
#include <vector>

/**
 * Data structure to keep track of, and schedule, inventory downloads from
 * peers.
 *
 * === Specification ===
 *
 * We keep track of which peers have announced which inventories, and use that
 * to determine which requests should go to which peer, when, and in what order.
 *
 * The following information is tracked per peer/inv combination
 * ("announcement"):
 * - Which peer announced it (through their NodeId)
 * - The invid of the inventory
 * - What the earliest permitted time is that that inventory can be requested
 *   from that peer (called "reqtime").
 * - Whether it's from a "preferred" peer or not. Which announcements get this
 *   flag is determined by the caller, but this is designed for outbound peers,
 *   or other peers that we have a higher level of trust in. Even when the
 *   peers' preferredness changes, the preferred flag of existing announcements
 *   from that peer won't change.
 * - Whether or not the inventory was requested already, and if so, when it
 *   times out (called "expiry").
 * - Whether or not the inventory request failed already (timed out, or
 *   invalid inventory or NOTFOUND was received).
 *
 * Transaction requests are then assigned to peers, following these rules:
 *
 * - No inventory is requested as long as another request for the same invid
 *   is outstanding (it needs to fail first by passing expiry, or a NOTFOUND or
 *   invalid inventory has to be received for it).
 *
 *   Rationale: to avoid wasting bandwidth on multiple copies of the same
 *              inventory.
 *
 * - The same inventory is never requested twice from the same peer, unless
 *   the announcement was forgotten in between, and re-announced. Announcements
 *   are forgotten only:
 *   - If a peer goes offline, all its announcements are forgotten.
 *   - If an inventory has been successfully received, or is otherwise no
 *     longer needed, the caller can call ForgetInvId, which removes all
 *     announcements across all peers with the specified invid.
 *   - If for a given invid only already-failed announcements remain, they are
 *     all forgotten.
 *
 *   Rationale: giving a peer multiple chances to announce an inventory would
 *              allow them to bias requests in their favor, worsening
 *              inventory censoring attacks. The flip side is that as long as
 *              an attacker manages to prevent us from receiving an inventory,
 *              failed announcements (including those from honest peers) will
 *              linger longer, increasing memory usage somewhat. The impact of
 *              this is limited by imposing a cap on the number of tracked
 *              announcements per peer. As failed requests in response to
 *              announcements from honest peers should be rare, this almost
 *              solely hinders attackers.
 *              Transaction censoring attacks can be done by announcing
 *              inventories quickly while not answering requests for them. See
 *              https://allquantor.at/blockchainbib/pdf/miller2015topology.pdf
 *              for more information.
 *
 * - Transactions are not requested from a peer until its reqtime has passed.
 *
 *   Rationale: enable the calling code to define a delay for less-than-ideal
 *              peers, so that (presumed) better peers have a chance to give
 *              their announcement first.
 *
 * - If multiple viable candidate peers exist according to the above rules, pick
 *   a peer as follows:
 *
 *   - If any preferred peers are available, non-preferred peers are not
 *     considered for what follows.
 *
 *     Rationale: preferred peers are more trusted by us, so are less likely to
 *                be under attacker control.
 *
 *   - Pick a uniformly random peer among the candidates.
 *
 *     Rationale: random assignments are hard to influence for attackers.
 *
 * Together these rules strike a balance between being fast in non-adverserial
 * conditions and minimizing susceptibility to censorship attacks. An attacker
 * that races the network:
 * - Will be unsuccessful if all preferred connections are honest (and there is
 *   at least one preferred connection).
 * - If there are P preferred connections of which Ph>=1 are honest, the
 *   attacker can delay us from learning about an inventory by k expiration
 *   periods, where k ~ 1 + NHG(N=P-1,K=P-Ph-1,r=1), which has mean P/(Ph+1)
 *   (where NHG stands for Negative Hypergeometric distribution). The "1 +" is
 *   due to the fact that the attacker can be the first to announce through a
 *   preferred connection in this scenario, which very likely means they get the
 *   first request.
 * - If all P preferred connections are to the attacker, and there are NP
 *   non-preferred connections of which NPh>=1 are honest, where we assume that
 *   the attacker can disconnect and reconnect those connections, the
 *   distribution becomes k ~ P + NB(p=1-NPh/NP,r=1) (where NB stands for
 *   Negative Binomial distribution), which has mean P-1+NP/NPh.
 *
 * Complexity:
 * - Memory usage is proportional to the total number of tracked announcements
 *   (Size()) plus the number of peers with a nonzero number of tracked
 *   announcements.
 * - CPU usage is generally logarithmic in the total number of tracked
 *   announcements, plus the number of announcements affected by an operation
 *   (amortized O(1) per announcement).
 */

// Avoid littering this header file with implementation details.
class InvRequestTrackerImplInterface {
    template <class InvId> friend class InvRequestTracker;

    // The base class is responsible for building the child implementation.
    // This is a hack that allows for hiding the concrete implementation details
    // from the callsite.
    static std::unique_ptr<InvRequestTrackerImplInterface>
    BuildImpl(bool deterministic);

public:
    using ClearExpiredFun = const std::function<void()> &;
    using EmplaceExpiredFun =
        const std::function<void(const NodeId &, const uint256 &)> &;

    virtual ~InvRequestTrackerImplInterface() = default;

    virtual void ReceivedInv(NodeId peer, const uint256 &invid, bool preferred,
                             std::chrono::microseconds reqtime) = 0;
    virtual void DisconnectedPeer(NodeId peer) = 0;
    virtual void ForgetInvId(const uint256 &invid) = 0;
    virtual std::vector<uint256>
    GetRequestable(NodeId peer, std::chrono::microseconds now,
                   ClearExpiredFun clearExpired,
                   EmplaceExpiredFun emplaceExpired) = 0;
    virtual void RequestedData(NodeId peer, const uint256 &invid,
                               std::chrono::microseconds expiry) = 0;
    virtual void ReceivedResponse(NodeId peer, const uint256 &invid) = 0;
    virtual size_t CountInFlight(NodeId peer) const = 0;
    virtual size_t CountCandidates(NodeId peer) const = 0;
    virtual size_t Count(NodeId peer) const = 0;
    virtual size_t Size() const = 0;
    virtual uint64_t ComputePriority(const uint256 &invid, NodeId peer,
                                     bool preferred) const = 0;
    virtual void SanityCheck() const = 0;
    virtual void
    PostGetRequestableSanityCheck(std::chrono::microseconds now) const = 0;
};

template <class InvId> class InvRequestTracker {
    /*
     * Only uint256-based InvId types are supported for now.
     * FIXME: use a template constraint when C++20 is available.
     */
    static_assert(std::is_base_of<uint256, InvId>::value,
                  "InvRequestTracker inv id type should be uint256 or derived");

    const std::unique_ptr<InvRequestTrackerImplInterface> m_impl;

public:
    //! Construct a InvRequestTracker.
    explicit InvRequestTracker(bool deterministic = false)
        : m_impl{InvRequestTrackerImplInterface::BuildImpl(deterministic)} {}
    ~InvRequestTracker() = default;

    // Conceptually, the data structure consists of a collection of
    // "announcements", one for each peer/invid combination:
    //
    // - CANDIDATE announcements represent inventories that were announced by a
    //   peer, and that become available for download after their reqtime has
    //   passed.
    //
    // - REQUESTED announcements represent inventories that have been
    //   requested, and which we're awaiting a response for from that peer.
    //   Their expiry value determines when the request times out.
    //
    // - COMPLETED announcements represent inventories that have been requested
    //   from a peer, and a NOTFOUND or an inventory was received in response
    //   (valid or not), or they timed out. They're only kept around to prevent
    //   requesting them again. If only COMPLETED announcements for a given
    //   invid remain (so no CANDIDATE or REQUESTED ones), all of them are
    //   deleted (this is an invariant, and maintained by all operations below).
    //
    // The operations below manipulate the data structure.

    /**
     * Adds a new CANDIDATE announcement.
     *
     * Does nothing if one already exists for that (invid, peer) combination
     * (whether it's CANDIDATE, REQUESTED, or COMPLETED).
     */
    void ReceivedInv(NodeId peer, const InvId &invid, bool preferred,
                     std::chrono::microseconds reqtime) {
        m_impl->ReceivedInv(peer, invid, preferred, reqtime);
    }

    /**
     * Deletes all announcements for a given peer.
     *
     * It should be called when a peer goes offline.
     */
    void DisconnectedPeer(NodeId peer) { m_impl->DisconnectedPeer(peer); }

    /**
     * Deletes all announcements for a given invid.
     *
     * This should be called when an inventory is no longer needed. The caller
     * should ensure that new announcements for the same invid will not trigger
     * new ReceivedInv calls, at least in the short term after this call.
     */
    void ForgetInvId(const InvId &invid) { m_impl->ForgetInvId(invid); }

    /**
     * Find the invids to request now from peer.
     *
     * It does the following:
     *  - Convert all REQUESTED announcements (for all invids/peers) with
     *    (expiry <= now) to COMPLETED ones. These are returned in expired, if
     *    non-nullptr.
     *  - Requestable announcements are selected: CANDIDATE announcements from
     *    the specified peer with (reqtime <= now) for which no existing
     *    REQUESTED announcement with the same invid from a different peer
     *    exists, and for which the specified peer is the best choice among all
     *    (reqtime <= now) CANDIDATE announcements with the same invid (subject
     *    to preferredness rules, and tiebreaking using a deterministic salted
     *    hash of peer and invid).
     *  - The selected announcements are returned in announcement order (even
     *    if multiple were added at the same time, or when the clock went
     *    backwards while they were being added). This is done to minimize
     *    disruption from dependent inventories being requested out of order:
     *    if multiple dependent inventories are announced simultaneously by one
     *    peer, and end up being requested from them, the requests will happen
     *    in announcement order.
     */
    std::vector<InvId>
    GetRequestable(NodeId peer, std::chrono::microseconds now,
                   std::vector<std::pair<NodeId, InvId>> *expired) {
        InvRequestTrackerImplInterface::ClearExpiredFun clearExpired =
            [expired]() {
                if (expired) {
                    expired->clear();
                }
            };
        InvRequestTrackerImplInterface::EmplaceExpiredFun emplaceExpired =
            [expired](const NodeId &nodeid, const uint256 &invid) {
                if (expired) {
                    expired->emplace_back(nodeid, InvId(invid));
                }
            };
        std::vector<uint256> hashes =
            m_impl->GetRequestable(peer, now, clearExpired, emplaceExpired);
        return std::vector<InvId>(hashes.begin(), hashes.end());
    }

    /**
     * Marks an inventory as requested, with a specified expiry.
     *
     * If no CANDIDATE announcement for the provided peer and invid exists, this
     * call has no effect. Otherwise:
     *  - That announcement is converted to REQUESTED.
     *  - If any other REQUESTED announcement for the same invid already
     *    existed, it means an unexpected request was made (GetRequestable will
     *    never advise doing so). In this case it is converted to COMPLETED, as
     *    we're no longer waiting for a response to it.
     */
    void RequestedData(NodeId peer, const InvId &invid,
                       std::chrono::microseconds expiry) {
        m_impl->RequestedData(peer, invid, expiry);
    }

    /**
     * Converts a CANDIDATE or REQUESTED announcement to a COMPLETED one. If no
     * such announcement exists for the provided peer and invid, nothing
     * happens.
     *
     * It should be called whenever an inventory or NOTFOUND was received from
     * a peer. When the inventory is not needed entirely anymore, ForgetInvId
     * should be called instead of, or in addition to, this call.
     */
    void ReceivedResponse(NodeId peer, const InvId &invid) {
        m_impl->ReceivedResponse(peer, invid);
    }

    // The operations below inspect the data structure.

    /** Count how many REQUESTED announcements a peer has. */
    size_t CountInFlight(NodeId peer) const {
        return m_impl->CountInFlight(peer);
    }

    /** Count how many CANDIDATE announcements a peer has. */
    size_t CountCandidates(NodeId peer) const {
        return m_impl->CountCandidates(peer);
    }

    /**
     * Count how many announcements a peer has (REQUESTED, CANDIDATE, and
     * COMPLETED combined).
     */
    size_t Count(NodeId peer) const { return m_impl->Count(peer); }

    /**
     * Count how many announcements are being tracked in total across all peers
     * and inventory ids.
     */
    size_t Size() const { return m_impl->Size(); }

    /** Access to the internal priority computation (testing only) */
    uint64_t ComputePriority(const InvId &invid, NodeId peer,
                             bool preferred) const {
        return m_impl->ComputePriority(invid, peer, preferred);
    }

    /** Run internal consistency check (testing only). */
    void SanityCheck() const { m_impl->SanityCheck(); }

    /**
     * Run a time-dependent internal consistency check (testing only).
     *
     * This can only be called immediately after GetRequestable, with the same
     * 'now' parameter.
     */
    void PostGetRequestableSanityCheck(std::chrono::microseconds now) const {
        m_impl->PostGetRequestableSanityCheck(now);
    }
};

#endif // BITCOIN_INVREQUEST_H
