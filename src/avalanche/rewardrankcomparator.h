// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_REWARDRANKCOMPARATOR_H
#define BITCOIN_AVALANCHE_REWARDRANKCOMPARATOR_H

#include <avalanche/proofid.h>
#include <avalanche/stakecontender.h>

namespace avalanche {

struct RewardRankComparator {
    bool operator()(const StakeContenderId &leftContenderId, double leftRank,
                    const ProofId &leftProofId,
                    const StakeContenderId &rightContenderId, double rightRank,
                    const ProofId &rightProofId) const {
        if (leftRank != rightRank) {
            // Lowest rank is best
            return leftRank < rightRank;
        }

        // If there's a collision in rank, sort by contender id
        if (leftContenderId != rightContenderId) {
            return leftContenderId < rightContenderId;
        }

        // If there's a collision in contender id, sort by proof id
        return leftProofId < rightProofId;
    }
};

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_REWARDRANKCOMPARATOR_H
