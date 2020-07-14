// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/peermanager.h>

#include <avalanche/validation.h>
#include <random.h>

#include <cassert>

namespace avalanche {

PeerId PeerManager::getPeer(const Proof &proof) {
    auto &pview = peers.get<proof_index>();
    auto it = pview.find(proof.getId());
    if (it != pview.end()) {
        return it->peerid;
    }

    // Reject invalid proof.
    ProofValidationState state;
    if (!proof.verify(state)) {
        return NO_PEER;
    }

    // We have no peer for this proof, time to create it.
    const PeerId peerid = nextPeerId++;
    auto inserted = peers.emplace(peerid, uint32_t(slots.size()), proof);
    assert(inserted.second);

    const uint32_t score = proof.getScore();
    const uint64_t start = slotCount;
    slots.emplace_back(start, score, peerid);
    slotCount = start + score;
    return peerid;
}

bool PeerManager::removePeer(const PeerId peerid) {
    auto it = peers.find(peerid);
    if (it == peers.end()) {
        return false;
    }

    size_t i = it->index;
    assert(i < slots.size());

    if (i + 1 == slots.size()) {
        slots.pop_back();
        slotCount = slots.empty() ? 0 : slots.back().getStop();
    } else {
        fragmentation += slots[i].getScore();
        slots[i] = slots[i].withPeerId(NO_PEER);
    }

    // Remove nodes associated with this peer, unless their timeout is still
    // active. This ensure that we don't overquery them in case their are
    // subsequently added to another peer.
    auto &nview = nodes.get<next_request_time>();
    nview.erase(nview.lower_bound(boost::make_tuple(peerid, TimePoint())),
                nview.upper_bound(boost::make_tuple(
                    peerid, std::chrono::steady_clock::now())));

    peers.erase(it);
    return true;
}

bool PeerManager::addNode(NodeId nodeid, const Proof &proof,
                          const CPubKey &pubkey) {
    const PeerId peerid = getPeer(proof);
    if (peerid == NO_PEER) {
        return false;
    }

    auto nit = nodes.find(nodeid);
    if (nit == nodes.end()) {
        return nodes.emplace(nodeid, peerid, pubkey).second;
    }

    // We actually have this node already, we need to update it.
    return nodes.modify(nit, [&](Node &n) {
        n.peerid = peerid;
        n.pubkey = pubkey;
    });
}

bool PeerManager::removeNode(NodeId nodeid) {
    return nodes.erase(nodeid) > 0;
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

    // Shrink the vector to the expected size.
    while (slots.size() > peers.size()) {
        slots.pop_back();
    }

    uint64_t prevStop = 0;
    uint32_t i = 0;
    for (auto it = peers.begin(); it != peers.end(); it++) {
        slots[i] = Slot(prevStop, it->getScore(), it->peerid);
        prevStop = slots[i].getStop();

        peers.modify(it, [&](Peer &p) { p.index = i++; });
    }

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

} // namespace avalanche
