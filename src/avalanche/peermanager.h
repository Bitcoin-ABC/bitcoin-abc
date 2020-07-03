// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_PEERMANAGER_H
#define BITCOIN_AVALANCHE_PEERMANAGER_H

#include <cstdint>
#include <unordered_map>
#include <vector>

using PeerId = uint32_t;
static constexpr PeerId NO_PEER = ~uint32_t(0);

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
    uint32_t getPeerId() const { return peerid; }

    bool contains(uint64_t slot) const {
        return getStart() <= slot && slot < getStop();
    }
    bool precedes(uint64_t slot) const { return slot >= getStop(); }
    bool follows(uint64_t slot) const { return getStart() > slot; }
};

class PeerManager {
    std::vector<Slot> slots;
    uint64_t slotCount = 0;
    uint64_t fragmentation = 0;

    /**
     * Several nodes can make an avalanche peer. In this case, all nodes are
     * considered interchangeable parts of the same peer.
     */
    struct Peer {
        uint32_t score;
        uint32_t index;

        Peer(uint32_t score_, uint32_t index_) : score(score_), index(index_) {}
    };

    PeerId nextPeerId = 0;
    std::unordered_map<PeerId, Peer> peers;

    static constexpr int SELECT_PEER_MAX_RETRY = 3;

public:
    PeerId addPeer(uint32_t score) { return addPeer(nextPeerId++, score); }
    bool removePeer(PeerId p);
    bool rescorePeer(PeerId p, uint32_t score);

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

private:
    PeerId addPeer(PeerId peerid, uint32_t score);
};

/**
 * This is an internal method that is exposed for testing purposes.
 */
PeerId selectPeerImpl(const std::vector<Slot> &slots, const uint64_t slot,
                      const uint64_t max);

#endif // BITCOIN_AVALANCHE_PEERMANAGER_H
