// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/peermanager.h>

#include <random.h>

#include <cassert>

PeerId PeerManager::addPeer(PeerId p, uint32_t score) {
    auto inserted = peerIndices.emplace(p, slots.size());
    assert(inserted.second);

    const uint64_t start = slotCount;
    slots.emplace_back(start, score, p);
    slotCount = start + score;
    return p;
}

bool PeerManager::removePeer(PeerId p) {
    auto it = peerIndices.find(p);
    if (it == peerIndices.end()) {
        return false;
    }

    size_t i = it->second;
    assert(i < slots.size());

    if (i + 1 == slots.size()) {
        slots.pop_back();
        slotCount = slots.empty() ? 0 : slots.rbegin()->getStop();
    } else {
        fragmentation += slots[i].getScore();
        slots[i] = slots[i].withPeerId(NO_PEER);
    }

    peerIndices.erase(it);
    return true;
}

bool PeerManager::rescorePeer(PeerId p, uint32_t score) {
    auto it = peerIndices.find(p);
    if (it == peerIndices.end()) {
        return false;
    }

    size_t i = it->second;
    assert(i < slots.size());

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
    it->second = slots.size();
    const uint64_t newStart = slotCount;
    slots.emplace_back(newStart, score, p);
    slotCount = newStart + score;

    return true;
}

PeerId PeerManager::selectPeer() const {
    if (slots.empty()) {
        return NO_PEER;
    }

    const uint64_t max = slotCount;
    while (true) {
        size_t i = selectPeerImpl(slots, GetRand(max), max);
        if (i != NO_PEER) {
            return i;
        }
    }
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
