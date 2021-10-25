// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/peermanager.h>

#include <avalanche/delegation.h>
#include <avalanche/validation.h>
#include <random.h>
#include <validation.h> // For ChainstateActive()

#include <algorithm>
#include <cassert>

namespace avalanche {

bool PeerManager::addNode(NodeId nodeid, const ProofId &proofid) {
    auto &pview = peers.get<proof_index>();
    auto it = pview.find(proofid);
    if (it == pview.end()) {
        // If the node exists, it is actually updating its proof to an unknown
        // one. In this case we need to remove it so it is not both active and
        // pending at the same time.
        removeNode(nodeid);
        pendingNodes.emplace(proofid, nodeid);
        return false;
    }

    return addOrUpdateNode(peers.project<0>(it), nodeid);
}

bool PeerManager::addOrUpdateNode(const PeerSet::iterator &it, NodeId nodeid) {
    assert(it != peers.end());

    const PeerId peerid = it->peerid;

    auto nit = nodes.find(nodeid);
    if (nit == nodes.end()) {
        if (!nodes.emplace(nodeid, peerid).second) {
            return false;
        }
    } else {
        const PeerId oldpeerid = nit->peerid;
        if (!nodes.modify(nit, [&](Node &n) { n.peerid = peerid; })) {
            return false;
        }

        // We actually have this node already, we need to update it.
        bool success = removeNodeFromPeer(peers.find(oldpeerid));
        assert(success);
    }

    bool success = addNodeToPeer(it);
    assert(success);

    // If the added node was in the pending set, remove it
    pendingNodes.get<by_nodeid>().erase(nodeid);

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

    pendingNodes.get<by_nodeid>().erase(nodeid);

    // Keep the track of the reference count.
    bool success = removeNodeFromPeer(peers.find(peerid));
    assert(success);

    return true;
}

bool PeerManager::removeNodeFromPeer(const PeerSet::iterator &it,
                                     uint32_t count) {
    // It is possible for nodes to be dangling. If there was an inflight query
    // when the peer gets removed, the node was not erased. In this case there
    // is nothing to do.
    if (it == peers.end()) {
        return true;
    }

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

bool PeerManager::updateNextRequestTime(NodeId nodeid, TimePoint timeout) {
    auto it = nodes.find(nodeid);
    if (it == nodes.end()) {
        return false;
    }

    return nodes.modify(it, [&](Node &n) { n.nextRequestTime = timeout; });
}

bool PeerManager::registerProof(const ProofRef &proof) {
    return !exists(proof->getId()) && getPeerId(proof) != NO_PEER;
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

static bool isOrphanState(const ProofValidationState &state) {
    return state.GetResult() == ProofValidationResult::MISSING_UTXO ||
           state.GetResult() == ProofValidationResult::HEIGHT_MISMATCH;
}

void PeerManager::updatedBlockTip() {
    std::vector<PeerId> invalidPeers;
    std::vector<ProofRef> newOrphans;

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

    // Remove the invalid peers before the orphans rescan. This makes it
    // possible to pull back proofs with utxos that conflicted with these
    // invalid peers.
    for (const auto &pid : invalidPeers) {
        removePeer(pid);
    }

    orphanProofs.rescan(*this);

    for (auto &p : newOrphans) {
        orphanProofs.addProof(p);
    }
}

PeerId PeerManager::getPeerId(const ProofRef &proof) {
    auto it = fetchOrCreatePeer(proof);
    return it == peers.end() ? NO_PEER : it->peerid;
}

ProofRef PeerManager::getProof(const ProofId &proofid) const {
    ProofRef proof = nullptr;

    forPeer(proofid, [&](const Peer &p) {
        proof = p.proof;
        return true;
    });

    if (!proof) {
        proof = orphanProofs.getProof(proofid);
    }

    return proof;
}

bool PeerManager::isValid(const ProofId &proofid) const {
    auto &pview = peers.get<proof_index>();
    return pview.find(proofid) != pview.end();
}

bool PeerManager::isOrphan(const ProofId &proofid) const {
    return orphanProofs.getProof(proofid) != nullptr;
}

bool isConflictingProofPreferred(const ProofRef &conflicting,
                                 const ProofRef &current) {
    // If the proof master is the same, assume the sequence number is the
    // righteous discriminant; otherwise, use costly parameters.
    // This is so to prevent a user participating in an aggregated proof with
    // other users from being able to invalidate the proof for free and make the
    // aggregation mechanism inefficient.
    // TODO this only makes sense if the staked coins are locked.
    if (conflicting->getMaster() == current->getMaster()) {
        return conflicting->getSequence() > current->getSequence();
    }

    // Favor the proof which is the most likely to be selected, i.e. the one
    // with the highest staked amount.
    if (conflicting->getScore() != current->getScore()) {
        return conflicting->getScore() > current->getScore();
    }

    // Select the proof with the least stakes, as this means the individual
    // stakes have higher amount in average.
    if (conflicting->getStakes().size() != current->getStakes().size()) {
        return conflicting->getStakes().size() < current->getStakes().size();
    }

    // When there is no better discriminant, use the proof id which is
    // guaranteed to be unique so equality is not possible.
    return conflicting->getId() < current->getId();
}

PeerManager::PeerSet::iterator
PeerManager::fetchOrCreatePeer(const ProofRef &proof) {
    assert(proof);
    const ProofId &proofid = proof->getId();
    {
        // Check if we already know of that peer.
        auto &pview = peers.get<proof_index>();
        auto it = pview.find(proofid);
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

    orphanProofs.removeProof(proofid);

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

        // Orphan the proof so it can be pulled back if the conflicting ones are
        // invalidated.
        orphanProofs.addProof(proof);

        return peers.end();
    }

    // We have no peer for this proof, time to create it.
    auto inserted = peers.emplace(peerid, proof);
    assert(inserted.second);

    // If there are nodes waiting for this proof, add them
    auto &pendingNodesView = pendingNodes.get<by_proofid>();
    auto range = pendingNodesView.equal_range(proofid);

    // We want to update the nodes then remove them from the pending set. That
    // will invalidate the range iterators, so we need to save the node ids
    // first before we can loop over them.
    std::vector<NodeId> nodeids;
    nodeids.reserve(std::distance(range.first, range.second));
    std::transform(range.first, range.second, std::back_inserter(nodeids),
                   [](const PendingNode &n) { return n.nodeid; });

    for (const NodeId &nodeid : nodeids) {
        addOrUpdateNode(inserted.first, nodeid);
    }

    return inserted.first;
}

bool PeerManager::removePeer(const PeerId peerid) {
    auto it = peers.find(peerid);
    if (it == peers.end()) {
        return false;
    }

    // Remove all nodes from this peer.
    removeNodeFromPeer(it, it->node_count);

    auto &nview = nodes.get<next_request_time>();

    // Add the nodes to the pending set
    auto range = nview.equal_range(peerid);
    for (auto &nit = range.first; nit != range.second; ++nit) {
        pendingNodes.emplace(it->getProofId(), nit->nodeid);
    };

    // Remove nodes associated with this peer, unless their timeout is still
    // active. This ensure that we don't overquery them in case they are
    // subsequently added to another peer.
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

    std::unordered_set<COutPoint, SaltedOutpointHasher> peersUtxos;
    for (const auto &p : peers) {
        // A peer should have a proof attached
        if (!p.proof) {
            return false;
        }

        // Check utxos consistency
        for (const auto &ss : p.proof->getStakes()) {
            auto it = utxos.find(ss.getStake().getUTXO());

            if (it == utxos.end()) {
                return false;
            }
            if (it->second != p.peerid) {
                return false;
            }

            if (!peersUtxos.emplace(it->first).second) {
                return false;
            }
        }

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

    // Check there is no dangling utxo
    for (const auto &[outpoint, peerid] : utxos) {
        if (!peersUtxos.count(outpoint)) {
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

void PeerManager::addUnbroadcastProof(const ProofId &proofid) {
    // The proof should be valid
    if (isValid(proofid)) {
        m_unbroadcast_proofids.insert(proofid);
    }
}

void PeerManager::removeUnbroadcastProof(const ProofId &proofid) {
    m_unbroadcast_proofids.erase(proofid);
}

} // namespace avalanche
