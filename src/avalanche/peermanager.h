// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_PEERMANAGER_H
#define BITCOIN_AVALANCHE_PEERMANAGER_H

#include <avalanche/node.h>
#include <avalanche/proof.h>
#include <net.h>
#include <pubkey.h>
#include <salteduint256hasher.h>

#include <boost/multi_index/composite_key.hpp>
#include <boost/multi_index/hashed_index.hpp>
#include <boost/multi_index/member.hpp>
#include <boost/multi_index/ordered_index.hpp>
#include <boost/multi_index_container.hpp>

#include <chrono>
#include <cstdint>
#include <vector>

namespace avalanche {

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
    uint32_t index;

    Proof proof;

    Peer(PeerId peerid_, uint32_t index_, Proof proof_)
        : peerid(peerid_), index(index_), proof(std::move(proof_)) {}

    const ProofId &getProofId() const { return proof.getId(); }
    uint32_t getScore() const { return proof.getScore(); }
};

struct proof_index {
    using result_type = ProofId;
    result_type operator()(const Peer &p) const { return p.proof.getId(); }
};

class SaltedProofIdHasher : private SaltedUint256Hasher {
public:
    SaltedProofIdHasher() : SaltedUint256Hasher() {}

    size_t operator()(const ProofId &proofid) const { return hash(proofid); }
};

struct next_request_time {};

class PeerManager {
    std::vector<Slot> slots;
    uint64_t slotCount = 0;
    uint64_t fragmentation = 0;

    /**
     * Several nodes can make an avalanche peer. In this case, all nodes are
     * considered interchangeable parts of the same peer.
     */
    using PeerSet = boost::multi_index_container<
        Peer, boost::multi_index::indexed_by<
                  // index by peerid
                  boost::multi_index::hashed_unique<
                      boost::multi_index::member<Peer, PeerId, &Peer::peerid>>,
                  // index by proof
                  boost::multi_index::hashed_unique<
                      boost::multi_index::tag<proof_index>, proof_index,
                      SaltedProofIdHasher>>>;

    PeerId nextPeerId = 0;
    PeerSet peers;

    using NodeSet = boost::multi_index_container<
        Node,
        boost::multi_index::indexed_by<
            // index by nodeid
            boost::multi_index::hashed_unique<
                boost::multi_index::member<Node, NodeId, &Node::nodeid>>,
            // sorted by peerid/nextRequestTime
            boost::multi_index::ordered_non_unique<
                boost::multi_index::tag<next_request_time>,
                boost::multi_index::composite_key<
                    Node,
                    boost::multi_index::member<Node, PeerId, &Node::peerid>,
                    boost::multi_index::member<Node, TimePoint,
                                               &Node::nextRequestTime>>>>>;

    NodeSet nodes;

    static constexpr int SELECT_PEER_MAX_RETRY = 3;
    static constexpr int SELECT_NODE_MAX_RETRY = 3;

public:
    /**
     * Provide the peer associated with the given proof. If the peer does not
     * exists, then it is created.
     */
    PeerId getPeer(const Proof &proof);

    /**
     * Remove an existing peer.
     * This is not meant for public consumption.
     */
    bool removePeer(const PeerId peerid);

    /**
     * Node API.
     */
    bool addNode(NodeId nodeid, const Proof &proof, const CPubKey &pubkey);
    bool removeNode(NodeId nodeid);

    NodeId selectNode();

    bool forNode(NodeId nodeid, std::function<bool(const Node &n)> func) const;
    bool updateNextRequestTime(NodeId nodeid, TimePoint timeout);

    /**
     * Exposed for tests.
     */
    PeerId selectPeer() const;

    /**
     * Trigger maintenance of internal datastructures.
     * Returns how much slot space was saved after compaction.
     */
    uint64_t compact();

    /**
     * Perform consistency check on internal data structures.
     * Mostly useful for tests.
     */
    bool verify() const;

    // Accssors.
    uint64_t getSlotCount() const { return slotCount; }
    uint64_t getFragmentation() const { return fragmentation; }
};

/**
 * This is an internal method that is exposed for testing purposes.
 */
PeerId selectPeerImpl(const std::vector<Slot> &slots, const uint64_t slot,
                      const uint64_t max);

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_PEERMANAGER_H
