// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_PEERMANAGER_H
#define BITCOIN_AVALANCHE_PEERMANAGER_H

#include <avalanche/node.h>
#include <avalanche/proof.h>
#include <avalanche/proofpool.h>
#include <coins.h>
#include <consensus/validation.h>
#include <pubkey.h>
#include <salteduint256hasher.h>
#include <util/time.h>

#include <boost/multi_index/composite_key.hpp>
#include <boost/multi_index/hashed_index.hpp>
#include <boost/multi_index/mem_fun.hpp>
#include <boost/multi_index/member.hpp>
#include <boost/multi_index/ordered_index.hpp>
#include <boost/multi_index_container.hpp>

#include <atomic>
#include <chrono>
#include <cstdint>
#include <memory>
#include <unordered_set>
#include <vector>

namespace avalanche {

class Delegation;

namespace {
    struct TestPeerManager;
}

struct Slot {
private:
    uint64_t start;
    uint32_t score;
    PeerId peerid;

public:
    Slot(uint64_t startIn, uint32_t scoreIn, PeerId peeridIn)
        : start(startIn), score(scoreIn), peerid(peeridIn) {}

    Slot withStart(uint64_t startIn) const {
        return Slot(startIn, score, peerid);
    }
    Slot withScore(uint64_t scoreIn) const {
        return Slot(start, scoreIn, peerid);
    }
    Slot withPeerId(PeerId peeridIn) const {
        return Slot(start, score, peeridIn);
    }

    uint64_t getStart() const { return start; }
    uint64_t getStop() const { return start + score; }
    uint32_t getScore() const { return score; }
    PeerId getPeerId() const { return peerid; }

    bool contains(uint64_t slot) const {
        return getStart() <= slot && slot < getStop();
    }
    bool precedes(uint64_t slot) const { return slot >= getStop(); }
    bool follows(uint64_t slot) const { return getStart() > slot; }
};

struct Peer {
    PeerId peerid;
    uint32_t index = -1;
    uint32_t node_count = 0;

    ProofRef proof;

    // The network stack uses timestamp in seconds, so we oblige.
    std::chrono::seconds registration_time;
    std::chrono::seconds nextPossibleConflictTime;

    Peer(PeerId peerid_, ProofRef proof_,
         std::chrono::seconds nextPossibleConflictTime_)
        : peerid(peerid_), proof(std::move(proof_)),
          registration_time(GetTime<std::chrono::seconds>()),
          nextPossibleConflictTime(std::move(nextPossibleConflictTime_)) {}

    const ProofId &getProofId() const { return proof->getId(); }
    uint32_t getScore() const { return proof->getScore(); }
};

struct proof_index {
    using result_type = ProofId;
    result_type operator()(const Peer &p) const { return p.proof->getId(); }
};

struct score_index {
    using result_type = uint32_t;
    result_type operator()(const Peer &p) const { return p.getScore(); }
};

struct next_request_time {};

struct PendingNode {
    ProofId proofid;
    NodeId nodeid;

    PendingNode(ProofId proofid_, NodeId nodeid_)
        : proofid(proofid_), nodeid(nodeid_){};
};

struct by_proofid;
struct by_nodeid;
struct by_score;

enum class ProofRegistrationResult {
    NONE = 0,
    ALREADY_REGISTERED,
    ORPHAN,
    INVALID,
    CONFLICTING,
    REJECTED,
    COOLDOWN_NOT_ELAPSED,
};

class ProofRegistrationState : public ValidationState<ProofRegistrationResult> {
};

namespace bmi = boost::multi_index;

class PeerManager {
    std::vector<Slot> slots;
    uint64_t slotCount = 0;
    uint64_t fragmentation = 0;

    /**
     * Several nodes can make an avalanche peer. In this case, all nodes are
     * considered interchangeable parts of the same peer.
     */
    using PeerSet = boost::multi_index_container<
        Peer, bmi::indexed_by<
                  // index by peerid
                  bmi::hashed_unique<bmi::member<Peer, PeerId, &Peer::peerid>>,
                  // index by proof
                  bmi::hashed_unique<bmi::tag<by_proofid>, proof_index,
                                     SaltedProofIdHasher>,
                  // ordered by score, decreasing order
                  bmi::ordered_non_unique<bmi::tag<by_score>, score_index,
                                          std::greater<uint32_t>>>>;

    PeerId nextPeerId = 0;
    PeerSet peers;

    ProofPool validProofPool;
    ProofPool conflictingProofPool;
    ProofPool orphanProofPool;

    using NodeSet = boost::multi_index_container<
        Node,
        bmi::indexed_by<
            // index by nodeid
            bmi::hashed_unique<bmi::member<Node, NodeId, &Node::nodeid>>,
            // sorted by peerid/nextRequestTime
            bmi::ordered_non_unique<
                bmi::tag<next_request_time>,
                bmi::composite_key<
                    Node, bmi::member<Node, PeerId, &Node::peerid>,
                    bmi::member<Node, TimePoint, &Node::nextRequestTime>>>>>;

    NodeSet nodes;

    /**
     * Flag indicating that we failed to select a node and need to expand our
     * node set.
     */
    std::atomic<bool> needMoreNodes{false};

    using PendingNodeSet = boost::multi_index_container<
        PendingNode,
        bmi::indexed_by<
            // index by proofid
            bmi::hashed_non_unique<
                bmi::tag<by_proofid>,
                bmi::member<PendingNode, ProofId, &PendingNode::proofid>,
                SaltedProofIdHasher>,
            // index by nodeid
            bmi::hashed_unique<
                bmi::tag<by_nodeid>,
                bmi::member<PendingNode, NodeId, &PendingNode::nodeid>>>>;
    PendingNodeSet pendingNodes;

    static constexpr int SELECT_PEER_MAX_RETRY = 3;
    static constexpr int SELECT_NODE_MAX_RETRY = 3;

    /**
     * Track proof ids to broadcast
     */
    std::unordered_set<ProofId, SaltedProofIdHasher> m_unbroadcast_proofids;

    /**
     * Quorum management.
     */
    uint32_t totalPeersScore = 0;
    uint32_t connectedPeersScore = 0;

public:
    /**
     * Node API.
     */
    bool addNode(NodeId nodeid, const ProofId &proofid);
    bool removeNode(NodeId nodeid);
    size_t getNodeCount() const { return nodes.size(); }
    size_t getPendingNodeCount() const { return pendingNodes.size(); }

    // Update when a node is to be polled next.
    bool updateNextRequestTime(NodeId nodeid, TimePoint timeout);

    // Randomly select a node to poll.
    NodeId selectNode();

    /**
     * Returns true if we encountered a lack of node since the last call.
     */
    bool shouldRequestMoreNodes() { return needMoreNodes.exchange(false); }

    template <typename Callable>
    bool forNode(NodeId nodeid, Callable &&func) const {
        auto it = nodes.find(nodeid);
        return it != nodes.end() && func(*it);
    }

    template <typename Callable>
    void forEachNode(const Peer &peer, Callable &&func) const {
        auto &nview = nodes.get<next_request_time>();
        auto range = nview.equal_range(peer.peerid);
        for (auto it = range.first; it != range.second; ++it) {
            func(*it);
        }
    }

    /**
     * Proof and Peer related API.
     */

    /**
     * Update the time before which a proof is not allowed to have conflicting
     * UTXO with this peer's proof.
     */
    bool updateNextPossibleConflictTime(PeerId peerid,
                                        const std::chrono::seconds &nextTime);

    /**
     * Registration mode
     *  - DEFAULT: Default policy, register only if the proof is unknown and has
     *    no conflict.
     *  - FORCE_ACCEPT: Turn a valid proof into a peer even if it has conflicts
     *    and is not the best candidate.
     */
    enum class RegistrationMode {
        DEFAULT,
        FORCE_ACCEPT,
    };

    bool registerProof(const ProofRef &proof,
                       ProofRegistrationState &registrationState,
                       RegistrationMode mode = RegistrationMode::DEFAULT);
    bool registerProof(const ProofRef &proof,
                       RegistrationMode mode = RegistrationMode::DEFAULT) {
        ProofRegistrationState dummy;
        return registerProof(proof, dummy, mode);
    }

    /**
     * Rejection mode
     *  - DEFAULT: Default policy, reject a proof and attempt to keep it in the
     *    conflicting pool if possible.
     *  - INVALIDATE: Reject a proof by removing it from any of the pool.
     *
     * In any case if a peer is rejected, it attempts to pull the conflicting
     * proofs back.
     */
    enum class RejectionMode {
        DEFAULT,
        INVALIDATE,
    };

    bool rejectProof(const ProofId &proofid,
                     RejectionMode mode = RejectionMode::DEFAULT);

    bool exists(const ProofId &proofid) const {
        return getProof(proofid) != nullptr;
    }

    template <typename Callable>
    bool forPeer(const ProofId &proofid, Callable &&func) const {
        auto &pview = peers.get<by_proofid>();
        auto it = pview.find(proofid);
        return it != pview.end() && func(*it);
    }

    template <typename Callable> void forEachPeer(Callable &&func) const {
        for (const auto &p : peers) {
            func(p);
        }
    }

    /**
     * Update the peer set when a new block is connected.
     */
    void updatedBlockTip();

    /**
     * Proof broadcast API.
     */
    void addUnbroadcastProof(const ProofId &proofid);
    void removeUnbroadcastProof(const ProofId &proofid);
    auto getUnbroadcastProofs() const { return m_unbroadcast_proofids; }

    /*
     * Quorum management
     */
    uint32_t getTotalPeersScore() const { return totalPeersScore; }
    uint32_t getConnectedPeersScore() const { return connectedPeersScore; }

    /****************************************************
     * Functions which are public for testing purposes. *
     ****************************************************/

    /**
     * Remove an existing peer.
     */
    bool removePeer(const PeerId peerid);

    /**
     * Randomly select a peer to poll.
     */
    PeerId selectPeer() const;

    /**
     * Trigger maintenance of internal data structures.
     * Returns how much slot space was saved after compaction.
     */
    uint64_t compact();

    /**
     * Perform consistency check on internal data structures.
     */
    bool verify() const;

    // Accessors.
    uint64_t getSlotCount() const { return slotCount; }
    uint64_t getFragmentation() const { return fragmentation; }

    ProofRef getProof(const ProofId &proofid) const;
    bool isBoundToPeer(const ProofId &proofid) const;
    bool isOrphan(const ProofId &proofid) const;
    bool isInConflictingPool(const ProofId &proofid) const;

private:
    template <typename ProofContainer>
    void moveToConflictingPool(const ProofContainer &proofs);

    bool addOrUpdateNode(const PeerSet::iterator &it, NodeId nodeid);
    bool addNodeToPeer(const PeerSet::iterator &it);
    bool removeNodeFromPeer(const PeerSet::iterator &it, uint32_t count = 1);

    friend struct ::avalanche::TestPeerManager;
};

/**
 * Internal methods that are exposed for testing purposes.
 */
PeerId selectPeerImpl(const std::vector<Slot> &slots, const uint64_t slot,
                      const uint64_t max);

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_PEERMANAGER_H
