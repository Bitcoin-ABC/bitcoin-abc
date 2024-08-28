// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_STAKECONTENDER_H
#define BITCOIN_AVALANCHE_STAKECONTENDER_H

#include <arith_uint256.h>
#include <hash.h>
#include <uint256.h>

#include <cmath>

struct BlockHash;

namespace avalanche {

struct ProofId;

/**
 * StakeContenderIds are unique for each block to ensure that the peer polling
 * for their acceptance has strong guarantees that a newly finalizing block does
 * not disrupt determining if the previous block had valid stake winners.
 */
struct StakeContenderId : public uint256 {
    explicit StakeContenderId() : uint256() {}
    explicit StakeContenderId(const BlockHash &prevblockhash,
                              const ProofId &proofid)
        : uint256(Hash(prevblockhash, proofid)) {}

    /**
     * To make sure the selection is properly weighted according to the proof
     * score, we normalize the contenderId to a number between 0 and 1, then
     * take the logarithm and divide by the weight. Since it is
     * scale-independent, we can simplify by removing constants and use base 2
     * logarithm. Inspired by: https://stackoverflow.com/a/30226926.
     */
    double ComputeProofRewardRank(uint32_t proofScore) {
        return (256.0 - std::log2(UintToArith256(*this).getdouble())) /
               proofScore;
    }
};

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_STAKECONTENDER_H
