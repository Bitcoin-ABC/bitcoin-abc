// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_PROTOCOL_H
#define BITCOIN_AVALANCHE_PROTOCOL_H

#include <avalanche/delegation.h>
#include <protocol.h> // for CInv
#include <serialize.h>
#include <uint256.h>

#include <cstdint>
#include <vector>

namespace avalanche {

class Vote {
    uint32_t error;
    uint256 hash;

public:
    Vote() : error(-1), hash() {}
    Vote(uint32_t errorIn, uint256 hashIn) : error(errorIn), hash(hashIn) {}

    const uint256 &GetHash() const { return hash; }
    uint32_t GetError() const { return error; }

    // serialization support
    SERIALIZE_METHODS(Vote, obj) { READWRITE(obj.error, obj.hash); }
};

class Response {
    uint64_t round;
    uint32_t cooldown;
    std::vector<Vote> votes;

public:
    Response() : round(-1), cooldown(-1) {}
    Response(uint64_t roundIn, uint32_t cooldownIn, std::vector<Vote> votesIn)
        : round(roundIn), cooldown(cooldownIn), votes(votesIn) {}

    uint64_t getRound() const { return round; }
    uint32_t getCooldown() const { return cooldown; }
    const std::vector<Vote> &GetVotes() const { return votes; }

    // serialization support
    SERIALIZE_METHODS(Response, obj) {
        READWRITE(obj.round, obj.cooldown, obj.votes);
    }
};

class Poll {
    uint64_t round;
    std::vector<CInv> invs;

public:
    Poll(uint64_t roundIn, std::vector<CInv> invsIn)
        : round(roundIn), invs(invsIn) {}

    uint64_t GetRound() { return round; }
    const std::vector<CInv> &GetInvs() const { return invs; }

    // serialization support
    SERIALIZE_METHODS(Poll, obj) { READWRITE(obj.round, obj.invs); }
};

class Hello {
    Delegation delegation;
    SchnorrSig sig;

public:
    Hello(Delegation delegationIn, SchnorrSig sigIn)
        : delegation(std::move(delegationIn)), sig(sigIn) {}

    SchnorrSig GetSig() { return sig; }

    // serialization support
    SERIALIZE_METHODS(Hello, obj) { READWRITE(obj.delegation, obj.sig); }
};

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_PROTOCOL_H
