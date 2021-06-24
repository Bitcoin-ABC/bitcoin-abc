// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/peermanager.h>

#include <avalanche/delegation.h>
#include <avalanche/validation.h>
#include <net_processing.h> // For RelayProof
#include <random.h>
#include <validation.h> // For ChainstateActive()

#include <cassert>

namespace avalanche {

static bool isOrphanState(const ProofValidationState &state) {
    return state.GetResult() == ProofValidationResult::MISSING_UTXO ||
           state.GetResult() == ProofValidationResult::HEIGHT_MISMATCH;
}

bool PeerManager::addNode(NodeId nodeid, const std::shared_ptr<Proof> &proof,
                          const Delegation &delegation) {
    auto it = fetchOrCreatePeer(proof);
    if (it == peers.end()) {
        return false;
    }

    DelegationState state;
    CPubKey pubkey;
    if (!delegation.verify(state, pubkey)) {
        return false;
    }

    return addOrUpdateNode(it, nodeid, std::move(pubkey));
}

bool PeerManager::addOrUpdateNode(const PeerSet::iterator &it, NodeId nodeid,
                                  CPubKey pubkey) {
    assert(it != peers.end());

    const PeerId peerid = it->peerid;

    auto nit = nodes.find(nodeid);
    if (nit == nodes.end()) {
        if (!nodes.emplace(nodeid, peerid, std::move(pubkey)).second) {
            return false;
        }
    } else {
        const PeerId oldpeerid = nit->peerid;
        if (!nodes.modify(nit, [&](Node &n) {
                n.peerid = peerid;
                n.pubkey = std::move(pubkey);
            })) {
            return false;
        }

        // We actually have this node already, we need to update it.
        bool success = removeNodeFromPeer(peers.find(oldpeerid));
        assert(success);
    }

    bool success = addNodeToPeer(it);
    assert(success);

    return true;
}

bool PeerManager::addNodeToPeer(const PeerSet::iterator &it) {
    assert(it != peers.end());
    return peers.modify(it, [&](Peer &p) {
        if (p.node_count++ > 0) {
            // We are done.
            return;
        }

        // We need to allocate this peer.
        p.index = uint32_t(slots.size());
        const uint32_t score = p.getScore();
        const uint64_t start = slotCount;
        slots.emplace_back(start, score, it->peerid);
        slotCount = start + score;
    });
}

bool PeerManager::removeNode(NodeId nodeid) {
    auto it = nodes.find(nodeid);
    if (it == nodes.end()) {
        return false;
    }

    const PeerId peerid = it->peerid;
    nodes.erase(it);

    // Keep the track of the reference count.
    bool success = removeNodeFromPeer(peers.find(peerid));
    assert(success);

    return true;
}

bool PeerManager::removeNodeFromPeer(const PeerSet::iterator &it,
                                     uint32_t count) {
    assert(it != peers.end());
    assert(count <= it->node_count);
    if (count == 0) {
        // This is a NOOP.
        return false;
    }

    const uint32_t new_count = it->node_count - count;
    if (!peers.modify(it, [&](Peer &p) { p.node_count = new_count; })) {
        return false;
    }

    if (new_count > 0) {
        // We are done.
        return true;
    }

    // There are no more node left, we need to cleanup.
    const size_t i = it->index;
    assert(i < slots.size());
    if (i + 1 == slots.size()) {
        slots.pop_back();
        slotCount = slots.empty() ? 0 : slots.back().getStop();
    } else {
        fragmentation += slots[i].getScore();
        slots[i] = slots[i].withPeerId(NO_PEER);
    }

    return true;
}

bool PeerManager::forNode(NodeId nodeid,
                          std::function<bool(const Node &n)> func) const {
    auto it = nodes.find(nodeid);
    return it != nodes.end() && func(*it);
}

bool PeerManager::updateNextRequestTime(NodeId nodeid, TimePoint timeout) {
    auto it = nodes.find(nodeid);
    if (it == nodes.end()) {
        return false;
    }

    return nodes.modify(it, [&](Node &n) { n.nextRequestTime = timeout; });
}

NodeId PeerManager::selectNode() {
    for (int retry = 0; retry < SELECT_NODE_MAX_RETRY; retry++) {
        const PeerId p = selectPeer();

        // If we cannot find a peer, it may be due to the fact that it is
        // unlikely due to high fragmentation, so compact and retry.
        if (p == NO_PEER) {
            compact();
            continue;
        }

        // See if that peer has an available node.
        auto &nview = nodes.get<next_request_time>();
        auto it = nview.lower_bound(boost::make_tuple(p, TimePoint()));
        if (it != nview.end() && it->peerid == p &&
            it->nextRequestTime <= std::chrono::steady_clock::now()) {
            return it->nodeid;
        }
    }

    return NO_NODE;
}

void PeerManager::updatedBlockTip() {
    std::vector<PeerId> invalidPeers;
    std::vector<std::shared_ptr<Proof>> newOrphans;

    {
        LOCK(cs_main);

        const CCoinsViewCache &coins = ::ChainstateActive().CoinsTip();
        for (const auto &p : peers) {
            ProofValidationState state;
            if (!p.proof->verify(state, coins)) {
                if (isOrphanState(state)) {
                    newOrphans.push_back(p.proof);
                }
                invalidPeers.push_back(p.peerid);
            }
        }
    }

    orphanProofs.rescan(*this);

    for (auto &p : newOrphans) {
        orphanProofs.addProof(p);
    }

    for (const auto &pid : invalidPeers) {
        removePeer(pid);
    }
}

PeerId PeerManager::getPeerId(const std::shared_ptr<Proof> &proof) {
    auto it = fetchOrCreatePeer(proof);
    return it == peers.end() ? NO_PEER : it->peerid;
}

std::shared_ptr<Proof> PeerManager::getProof(const ProofId &proofid) const {
    auto &pview = peers.get<proof_index>();
    auto it = pview.find(proofid);
    return it == pview.end() ? nullptr : it->proof;
}

Peer::Timestamp PeerManager::getProofTime(const ProofId &proofid) const {
    auto &pview = peers.get<proof_index>();
    auto it = pview.find(proofid);
    return it == pview.end() ? Peer::Timestamp::max() : it->time;
}

PeerManager::PeerSet::iterator
PeerManager::fetchOrCreatePeer(const std::shared_ptr<Proof> &proof) {
    {
        // Check if we already know of that peer.
        auto &pview = peers.get<proof_index>();
        auto it = pview.find(proof->getId());
        if (it != pview.end()) {
            return peers.project<0>(it);
        }
    }

    // Check the proof's validity.
    ProofValidationState state;
    bool valid = [&](ProofValidationState &state) {
        LOCK(cs_main);
        const CCoinsViewCache &coins = ::ChainstateActive().CoinsTip();
        return proof->verify(state, coins);
    }(state);

    if (!valid) {
        if (isOrphanState(state)) {
            orphanProofs.addProof(proof);
        }

        // Reject invalid proof.
        return peers.end();
    }

    orphanProofs.removeProof(proof->getId());

    // New peer means new peerid!
    const PeerId peerid = nextPeerId++;

    // Attach UTXOs to this proof.
    std::unordered_set<PeerId> conflicting_peerids;
    for (const auto &s : proof->getStakes()) {
        auto p = utxos.emplace(s.getStake().getUTXO(), peerid);
        if (!p.second) {
            // We have a collision with an existing proof.
            conflicting_peerids.insert(p.first->second);
        }
    }

    // For now, if there is a conflict, just cleanup the mess.
    if (conflicting_peerids.size() > 0) {
        for (const auto &s : proof->getStakes()) {
            auto it = utxos.find(s.getStake().getUTXO());
            assert(it != utxos.end());

            // We need to delete that one.
            if (it->second == peerid) {
                utxos.erase(it);
            }
        }

        return peers.end();
    }

    // We have no peer for this proof, time to create it.
    auto inserted = peers.emplace(peerid, proof);
    assert(inserted.second);

    return inserted.first;
}

bool PeerManager::removePeer(const PeerId peerid) {
    auto it = peers.find(peerid);
    if (it == peers.end()) {
        return false;
    }

    // Remove all nodes from this peer.
    removeNodeFromPeer(it, it->node_count);

    // Remove nodes associated with this peer, unless their timeout is still
    // active. This ensure that we don't overquery them in case they are
    // subsequently added to another peer.
    auto &nview = nodes.get<next_request_time>();
    nview.erase(nview.lower_bound(boost::make_tuple(peerid, TimePoint())),
                nview.upper_bound(boost::make_tuple(
                    peerid, std::chrono::steady_clock::now())));

    // Release UTXOs attached to this proof.
    for (const auto &s : it->proof->getStakes()) {
        bool deleted = utxos.erase(s.getStake().getUTXO()) > 0;
        assert(deleted);
    }

    m_unbroadcast_proofids.erase(it->proof->getId());

    peers.erase(it);
    return true;
}

PeerId PeerManager::selectPeer() const {
    if (slots.empty() || slotCount == 0) {
        return NO_PEER;
    }

    const uint64_t max = slotCount;
    for (int retry = 0; retry < SELECT_PEER_MAX_RETRY; retry++) {
        size_t i = selectPeerImpl(slots, GetRand(max), max);
        if (i != NO_PEER) {
            return i;
        }
    }

    return NO_PEER;
}

uint64_t PeerManager::compact() {
    // There is nothing to compact.
    if (fragmentation == 0) {
        return 0;
    }

    std::vector<Slot> newslots;
    newslots.reserve(peers.size());

    uint64_t prevStop = 0;
    uint32_t i = 0;
    for (auto it = peers.begin(); it != peers.end(); it++) {
        if (it->node_count == 0) {
            continue;
        }

        newslots.emplace_back(prevStop, it->getScore(), it->peerid);
        prevStop = slots[i].getStop();
        if (!peers.modify(it, [&](Peer &p) { p.index = i++; })) {
            return 0;
        }
    }

    slots = std::move(newslots);

    const uint64_t saved = slotCount - prevStop;
    slotCount = prevStop;
    fragmentation = 0;

    return saved;
}

bool PeerManager::verify() const {
    uint64_t prevStop = 0;
    for (size_t i = 0; i < slots.size(); i++) {
        const Slot &s = slots[i];

        // Slots must be in correct order.
        if (s.getStart() < prevStop) {
            return false;
        }

        prevStop = s.getStop();

        // If this is a dead slot, then nothing more needs to be checked.
        if (s.getPeerId() == NO_PEER) {
            continue;
        }

        // We have a live slot, verify index.
        auto it = peers.find(s.getPeerId());
        if (it == peers.end() || it->index != i) {
            return false;
        }
    }

    for (const auto &p : peers) {
        // Count node attached to this peer.
        const auto count_nodes = [&]() {
            size_t count = 0;
            auto &nview = nodes.get<next_request_time>();
            auto begin =
                nview.lower_bound(boost::make_tuple(p.peerid, TimePoint()));
            auto end =
                nview.upper_bound(boost::make_tuple(p.peerid + 1, TimePoint()));

            for (auto it = begin; it != end; ++it) {
                count++;
            }

            return count;
        };

        if (p.node_count != count_nodes()) {
            return false;
        }

        // If there are no nodes attached to this peer, then we are done.
        if (p.node_count == 0) {
            continue;
        }

        // The index must point to a slot refering to this peer.
        if (p.index >= slots.size() || slots[p.index].getPeerId() != p.peerid) {
            return false;
        }

        // If the score do not match, same thing.
        if (slots[p.index].getScore() != p.getScore()) {
            return false;
        }
    }

    return true;
}

PeerId selectPeerImpl(const std::vector<Slot> &slots, const uint64_t slot,
                      const uint64_t max) {
    assert(slot <= max);

    size_t begin = 0, end = slots.size();
    uint64_t bottom = 0, top = max;

    // Try to find the slot using dichotomic search.
    while ((end - begin) > 8) {
        // The slot we picked in not allocated.
        if (slot < bottom || slot >= top) {
            return NO_PEER;
        }

        // Guesstimate the position of the slot.
        size_t i = begin + ((slot - bottom) * (end - begin) / (top - bottom));
        assert(begin <= i && i < end);

        // We have a match.
        if (slots[i].contains(slot)) {
            return slots[i].getPeerId();
        }

        // We undershooted.
        if (slots[i].precedes(slot)) {
            begin = i + 1;
            if (begin >= end) {
                return NO_PEER;
            }

            bottom = slots[begin].getStart();
            continue;
        }

        // We overshooted.
        if (slots[i].follows(slot)) {
            end = i;
            top = slots[end].getStart();
            continue;
        }

        // We have an unalocated slot.
        return NO_PEER;
    }

    // Enough of that nonsense, let fallback to linear search.
    for (size_t i = begin; i < end; i++) {
        // We have a match.
        if (slots[i].contains(slot)) {
            return slots[i].getPeerId();
        }
    }

    // We failed to find a slot, retry.
    return NO_PEER;
}

std::vector<Peer> PeerManager::getPeers() const {
    std::vector<Peer> vpeers;
    for (auto &it : peers.get<0>()) {
        vpeers.emplace_back(it);
    }
    return vpeers;
}

std::vector<NodeId> PeerManager::getNodeIdsForPeer(PeerId peerId) const {
    std::vector<NodeId> nodeids;
    auto &nview = nodes.get<next_request_time>();
    auto nodeRange = nview.equal_range(peerId);
    for (auto it = nodeRange.first; it != nodeRange.second; ++it) {
        nodeids.emplace_back(it->nodeid);
    }
    return nodeids;
}

bool PeerManager::isOrphan(const ProofId &id) const {
    return orphanProofs.getProof(id) != nullptr;
}

std::shared_ptr<Proof> PeerManager::getOrphan(const ProofId &id) const {
    return orphanProofs.getProof(id);
}

void PeerManager::addUnbroadcastProof(const ProofId &proofid) {
    // The proof should be known
    if (getProof(proofid)) {
        m_unbroadcast_proofids.insert(proofid);
    }
}

void PeerManager::removeUnbroadcastProof(const ProofId &proofid) {
    m_unbroadcast_proofids.erase(proofid);
}

void PeerManager::broadcastProofs(const CConnman &connman) {
    // For some reason SaltedProofIdHasher prevents the set from being swappable
    std::unordered_set<ProofId, SaltedProofIdHasher>
        previous_unbroadcasted_proofids = std::move(m_unbroadcast_proofids);
    m_unbroadcast_proofids.clear();

    for (auto &proofid : previous_unbroadcasted_proofids) {
        if (getProof(proofid)) {
            m_unbroadcast_proofids.insert(proofid);
            RelayProof(proofid, connman);
        }
    }
}

} // namespace avalanche
