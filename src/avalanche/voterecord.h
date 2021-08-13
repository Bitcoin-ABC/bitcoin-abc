// Copyright (c) 2021 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_VOTERECORD_H
#define BITCOIN_AVALANCHE_VOTERECORD_H

#include <nodeid.h>

#include <array>
#include <atomic>
#include <cstdint>

/**
 * Finalization score.
 */
static constexpr int AVALANCHE_FINALIZATION_SCORE = 128;

/**
 * How many inflight requests can exist for one item.
 */
static constexpr int AVALANCHE_MAX_INFLIGHT_POLL = 10;

namespace avalanche {

/**
 * Vote history.
 */
struct VoteRecord {
private:
    // confidence's LSB bit is the result. Higher bits are actual confidence
    // score.
    uint16_t confidence = 0;

    // Historical record of votes.
    uint8_t votes = 0;
    // Each bit indicate if the vote is to be considered.
    uint8_t consider = 0;
    // How many in flight requests exists for this element.
    mutable std::atomic<uint8_t> inflight{0};

    // Seed for pseudorandom operations.
    const uint32_t seed = 0;

    // Track how many successful votes occured.
    uint32_t successfulVotes = 0;

    // Track the nodes which are part of the quorum.
    std::array<uint16_t, 8> nodeFilter{{0, 0, 0, 0, 0, 0, 0, 0}};

public:
    explicit VoteRecord(bool accepted) : confidence(accepted) {}

    /**
     * Copy semantic
     */
    VoteRecord(const VoteRecord &other)
        : confidence(other.confidence), votes(other.votes),
          consider(other.consider), inflight(other.inflight.load()),
          successfulVotes(other.successfulVotes), nodeFilter(other.nodeFilter) {
    }

    /**
     * Vote accounting facilities.
     */
    bool isAccepted() const { return confidence & 0x01; }

    uint16_t getConfidence() const { return confidence >> 1; }
    bool hasFinalized() const {
        return getConfidence() >= AVALANCHE_FINALIZATION_SCORE;
    }

    /**
     * Register a new vote for an item and update confidence accordingly.
     * Returns true if the acceptance or finalization state changed.
     */
    bool registerVote(NodeId nodeid, uint32_t error);

    /**
     * Register that a request is being made regarding that item.
     * The method is made const so that it can be accessed via a read only view
     * of vote_records. It's not a problem as it is made thread safe.
     */
    bool registerPoll() const;

    /**
     * Return if this item is in condition to be polled at the moment.
     */
    bool shouldPoll() const { return inflight < AVALANCHE_MAX_INFLIGHT_POLL; }

    /**
     * Clear `count` inflight requests.
     */
    void clearInflightRequest(uint8_t count = 1) { inflight -= count; }

private:
    /**
     * Add the node to the quorum.
     * Returns true if the node was added, false if the node already was in the
     * quorum.
     */
    bool addNodeToQuorum(NodeId nodeid);
};

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_VOTERECORD_H
