// Copyright (c) 2021 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/voterecord.h>

#include <util/bitmanip.h>

#include <cstddef>

namespace avalanche {

bool VoteRecord::registerVote(NodeId nodeid, uint32_t error) {
    // We just got a new vote, so there is one less inflight request.
    clearInflightRequest();

    // We want to avoid having the same node voting twice in a quorum.
    if (!addNodeToQuorum(nodeid)) {
        return false;
    }

    /**
     * The result of the vote is determined from the error code. If the error
     * code is 0, there is no error and therefore the vote is yes. If there is
     * an error, we check the most significant bit to decide if the vote is a no
     * (for instance, the block is invalid) or is the vote inconclusive (for
     * instance, the queried node does not have the block yet).
     */
    votes = (votes << 1) | (error == 0);
    consider = (consider << 1) | (int32_t(error) >= 0);

    /**
     * We compute the number of yes and/or no votes as follow:
     *
     * votes:     1010
     * consider:  1100
     *
     * yes votes: 1000 using votes & consider
     * no votes:  0100 using ~votes & consider
     */
    bool yes = countBits(votes & consider & 0xff) > 6;
    if (!yes) {
        bool no = countBits(~votes & consider & 0xff) > 6;
        if (!no) {
            // The round is inconclusive.
            return false;
        }
    }

    // If the round is in agreement with previous rounds, increase confidence.
    if (isAccepted() == yes) {
        confidence += 2;
        return getConfidence() == AVALANCHE_FINALIZATION_SCORE;
    }

    // The round changed our state. We reset the confidence.
    confidence = yes;
    return true;
}

bool VoteRecord::addNodeToQuorum(NodeId nodeid) {
    if (nodeid == NO_NODE) {
        // Helpful for testing.
        return true;
    }

    // MMIX Linear Congruent Generator.
    const uint64_t r1 =
        6364136223846793005 * uint64_t(nodeid) + 1442695040888963407;
    // Fibonacci hashing.
    const uint64_t r2 = 11400714819323198485ull * (nodeid ^ seed);
    // Combine and extract hash.
    const uint16_t h = (r1 + r2) >> 48;

    /**
     * Check if the node is in the filter.
     */
    for (size_t i = 1; i < nodeFilter.size(); i++) {
        if (nodeFilter[(successfulVotes + i) % nodeFilter.size()] == h) {
            return false;
        }
    }

    /**
     * Add the node which just voted to the filter.
     */
    nodeFilter[successfulVotes % nodeFilter.size()] = h;
    successfulVotes++;
    return true;
}

bool VoteRecord::registerPoll() const {
    uint8_t count = inflight.load();
    while (count < AVALANCHE_MAX_INFLIGHT_POLL) {
        if (inflight.compare_exchange_weak(count, count + 1)) {
            return true;
        }
    }

    return false;
}

} // namespace avalanche
