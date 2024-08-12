// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_STAKECONTENDER_H
#define BITCOIN_AVALANCHE_STAKECONTENDER_H

#include <hash.h>
#include <uint256.h>

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
};

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_STAKECONTENDER_H
