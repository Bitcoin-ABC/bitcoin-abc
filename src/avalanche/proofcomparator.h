// Copyright (c) 2021 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_PROOFCOMPARATOR_H
#define BITCOIN_AVALANCHE_PROOFCOMPARATOR_H

#include <avalanche/proof.h>

#include <cstdint>
#include <memory>

namespace avalanche {

/**
 * Compare proofs by score, then by id in case of equality.
 */
struct ProofComparator {
    bool operator()(const Proof &lhs, const Proof &rhs) const {
        uint32_t scoreLhs = lhs.getScore();
        uint32_t scoreRhs = rhs.getScore();

        return (scoreLhs != scoreRhs) ? scoreLhs > scoreRhs
                                      : lhs.getId() < rhs.getId();
    }

    bool operator()(const ProofRef &lhs, const ProofRef &rhs) const {
        return (*this)(*lhs, *rhs);
    }
};

/**
 * Compare conflicting proofs.
 */
struct ConflictingProofComparator {
    bool operator()(const Proof &lhs, const Proof &rhs) const {
        // If the proof master is the same, assume the sequence number is the
        // righteous discriminant; otherwise, use costly parameters.
        // This is so to prevent a user participating in an aggregated proof
        // with other users from being able to invalidate the proof for free and
        // make the aggregation mechanism inefficient.
        // TODO this only makes sense if the staked coins are locked.
        if (lhs.getMaster() == rhs.getMaster()) {
            if (lhs.getSequence() != rhs.getSequence()) {
                return lhs.getSequence() > rhs.getSequence();
            }
        }

        // Favor the proof which is the most likely to be selected, i.e. the one
        // with the highest staked amount.
        if (lhs.getScore() != rhs.getScore()) {
            return lhs.getScore() > rhs.getScore();
        }

        // Select the proof with the least stakes, as this means the individual
        // stakes have higher amount in average.
        if (lhs.getStakes().size() != rhs.getStakes().size()) {
            return lhs.getStakes().size() < rhs.getStakes().size();
        }

        // When there is no better discriminant, use the proof id which is
        // guaranteed to be unique so equality is not possible.
        return lhs.getId() < rhs.getId();
    }

    bool operator()(const ProofRef &lhs, const ProofRef &rhs) const {
        return (*this)(*lhs, *rhs);
    }
};

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_PROOFCOMPARATOR_H
