// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_H
#define BITCOIN_AVALANCHE_H

#include "net.h"      // for NodeId
#include "protocol.h" // for CInv
#include "rwcollection.h"
#include "serialize.h"
#include "uint256.h"

#include <cstdint>
#include <vector>

class Config;
class CBlockIndex;
class CScheduler;

namespace {
/**
 * Finalization score.
 */
static int AVALANCHE_FINALIZATION_SCORE = 128;
}

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

class AvalancheVote {
    uint32_t error;
    uint256 hash;

public:
    AvalancheVote() : error(-1), hash() {}
    AvalancheVote(uint32_t errorIn, uint256 hashIn)
        : error(errorIn), hash(hashIn) {}

    const uint256 &GetHash() const { return hash; }
    bool IsValid() const { return error == 0; }

    // serialization support
    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        READWRITE(error);
        READWRITE(hash);
    }
};

class AvalancheResponse {
    uint32_t cooldown;
    std::vector<AvalancheVote> votes;

public:
    AvalancheResponse(uint32_t cooldownIn, std::vector<AvalancheVote> votesIn)
        : cooldown(cooldownIn), votes(votesIn) {}

    const std::vector<AvalancheVote> &GetVotes() const { return votes; }

    // serialization support
    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        READWRITE(cooldown);
        READWRITE(votes);
    }
};

class AvalancheProcessor {
private:
    /**
     * Blocks to run avalanche on.
     */
    RWCollection<std::map<const CBlockIndex *, VoteRecord>> vote_records;

public:
    AvalancheProcessor() {}

    bool addBlockToReconcile(const CBlockIndex *pindex);
    bool isAccepted(const CBlockIndex *pindex) const;
    bool hasFinalized(const CBlockIndex *pindex) const;

    bool registerVotes(const AvalancheResponse &response);
};

#endif // BITCOIN_AVALANCHE_H
