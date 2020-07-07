// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_PROOF_H
#define BITCOIN_AVALANCHE_PROOF_H

#include <uint256.h>

#include <cstdint>

namespace avalanche {

struct ProofId : public uint256 {
    explicit ProofId() : uint256() {}
    explicit ProofId(const uint256 &b) : uint256(b) {}
};

class Proof {
    ProofId proofid;
    uint32_t score;

public:
    explicit Proof(uint32_t score_);

    const ProofId &getId() const { return proofid; }
    uint32_t getScore() const { return score; }
};

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_PROOF_H
