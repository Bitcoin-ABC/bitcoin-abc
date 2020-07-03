// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/peermanager.h>

#include <random.h>

#include <cassert>

PeerId PeerManager::addPeer(PeerId p, uint32_t score) {
    auto inserted = peers.emplace(p, Peer(score, uint32_t(slots.size())));
    assert(inserted.second);

    const uint64_t start = slotCount;
    slots.emplace_back(start, score, p);
    slotCount = start + score;
    return p;
}

bool PeerManager::removePeer(PeerId p) {
    auto it = peers.find(p);
    if (it == peers.end()) {
        return false;
    }

    size_t i = it->second.index;
    assert(i < slots.size());

    if (i + 1 == slots.size()) {
        slots.pop_back();
        slotCount = slots.empty() ? 0 : slots.back().getStop();
    } else {
        fragmentation += slots[i].getScore();
        slots[i] = slots[i].withPeerId(NO_PEER);
    }

    peers.erase(it);
    return true;
}

bool PeerManager::rescorePeer(PeerId p, uint32_t score) {
    auto it = peers.find(p);
    if (it == peers.end()) {
        return false;
    }

    size_t i = it->second.index;
    assert(i < slots.size());

    // Update the peer's score.
    it->second.score = score;

    // Update the slot allocation to reflect the new score.
    const uint64_t start = slots[i].getStart();

    // If this is the last element, we can extend/shrink easily.
    if (i + 1 == slots.size()) {
        slots[i] = slots[i].withScore(score);
        slotCount = slots[i].getStop();
        return true;
    }

    const uint64_t stop = start + score;
    const uint64_t nextStart = slots[i + 1].getStart();

    // We can extend in place.
    if (stop <= nextStart) {
        fragmentation += (slots[i].getStop() - stop);
        slots[i] = slots[i].withScore(score);
        return true;
    }

    // So we need to insert a new entry.
    fragmentation += slots[i].getScore();
    slots[i] = slots[i].withPeerId(NO_PEER);
    it->second.index = uint32_t(slots.size());
    const uint64_t newStart = slotCount;
    slots.emplace_back(newStart, score, p);
    slotCount = newStart + score;

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
    // Shrink the vector to the expected size.
    while (slots.size() > peers.size()) {
        slots.pop_back();
    }

    uint64_t prevStop = 0;
    uint32_t i = 0;
    for (auto &pair : peers) {
        PeerId pid = pair.first;
        Peer &p = pair.second;

        slots[i] = Slot(prevStop, p.score, pid);
        prevStop = slots[i].getStop();

        p.index = i++;
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
        if (it == peers.end() || it->second.index != i) {
            return false;
        }
    }

    for (const auto &pair : peers) {
        auto p = pair.first;
        auto i = pair.second.index;
        auto s = pair.second.score;

        // The index must point to a slot refering to this peer.
        if (i >= slots.size() || slots[i].getPeerId() != p) {
            return false;
        }

        // If the score do not match, same thing.
        if (slots[i].getScore() != s) {
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
