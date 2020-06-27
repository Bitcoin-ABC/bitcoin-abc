// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_PEERMANAGER_H
#define BITCOIN_AVALANCHE_PEERMANAGER_H

#include <atomic>
#include <cstdint>
#include <vector>

static constexpr size_t NO_PEER = ~size_t(0);

struct Slot {
    uint64_t start;
    uint64_t stop;

    Slot(uint64_t startIn, uint64_t stopIn) : start(startIn), stop(stopIn) {}
};

class PeerManager {
    std::vector<Slot> slots;
    uint64_t slotCount = 0;

public:
    void addPeer(uint64_t score);

    size_t selectPeer() const;
};

/**
 * This is an internal method that is exposed for testing purposes.
 */
size_t selectPeerImpl(const std::vector<Slot> &slots, const uint64_t slot,
                      const uint64_t max);

#endif // BITCOIN_AVALANCHE_PEERMANAGER_H
