// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_PROTOCOL_H
#define BITCOIN_AVALANCHE_PROTOCOL_H

#include <protocol.h> // for CInv
#include <serialize.h>
#include <uint256.h>

#include <cstdint>
#include <vector>

class AvalancheVote {
    uint32_t error;
    uint256 hash;

public:
    AvalancheVote() : error(-1), hash() {}
    AvalancheVote(uint32_t errorIn, uint256 hashIn)
        : error(errorIn), hash(hashIn) {}

    const uint256 &GetHash() const { return hash; }
    uint32_t GetError() const { return error; }

    // serialization support
    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        READWRITE(error);
        READWRITE(hash);
    }
};

class AvalancheResponse {
    uint64_t round;
    uint32_t cooldown;
    std::vector<AvalancheVote> votes;

public:
    AvalancheResponse() : round(-1), cooldown(-1) {}
    AvalancheResponse(uint64_t roundIn, uint32_t cooldownIn,
                      std::vector<AvalancheVote> votesIn)
        : round(roundIn), cooldown(cooldownIn), votes(votesIn) {}

    uint64_t getRound() const { return round; }
    uint32_t getCooldown() const { return cooldown; }
    const std::vector<AvalancheVote> &GetVotes() const { return votes; }

    // serialization support
    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        READWRITE(round);
        READWRITE(cooldown);
        READWRITE(votes);
    }
};

class AvalanchePoll {
    uint64_t round;
    std::vector<CInv> invs;

public:
    AvalanchePoll(uint64_t roundIn, std::vector<CInv> invsIn)
        : round(roundIn), invs(invsIn) {}

    const std::vector<CInv> &GetInvs() const { return invs; }

    // serialization support
    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        READWRITE(round);
        READWRITE(invs);
    }
};

#endif // BITCOIN_AVALANCHE_PROTOCOL_H
