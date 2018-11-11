// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_IMPL_H
#define BITCOIN_AVALANCHE_IMPL_H

#include <cstdint>

namespace {
/**
 * Finalization score.
 */
static int AVALANCHE_FINALIZATION_SCORE = 128;

/**
 * Vote history.
 */
struct VoteRecord {
private:
    // Historical record of votes.
    uint16_t votes;

    // confidence's LSB bit is the result. Higher bits are actual confidence
    // score.
    uint16_t confidence;

    /**
     * Return the number of bits set in an integer value.
     * TODO: There are compiler intrinsics to do that, but we'd need to get them
     * detected so this will do for now.
     */
    static uint32_t countBits(uint32_t value) {
        uint32_t count = 0;
        while (value) {
            // If the value is non zero, then at least one bit is set.
            count++;

            // Clear the rightmost bit set.
            value &= (value - 1);
        }

        return count;
    }

public:
    VoteRecord() : votes(0xaaaa), confidence(0) {}

    bool isValid() const { return confidence & 0x01; }

    uint16_t getConfidence() const { return confidence >> 1; }
    bool hasFinalized() const {
        return getConfidence() >= AVALANCHE_FINALIZATION_SCORE;
    }

    bool registerVote(bool vote) {
        votes = (votes << 1) | vote;

        auto bits = countBits(votes & 0xff);
        bool yes = bits > 6;
        bool no = bits < 2;
        if (!yes && !no) {
            // The vote is inconclusive.
            return false;
        }

        if (isValid() == yes) {
            // If the vote is in agreement with our internal status, increase
            // confidence.
            confidence += 2;
        } else {
            // The vote did not agree with our internal state, in that case,
            // reset confidence.
            confidence = yes;
        }

        return true;
    }
};
}

#endif // BITCOIN_AVALANCHE_IMPL_H
