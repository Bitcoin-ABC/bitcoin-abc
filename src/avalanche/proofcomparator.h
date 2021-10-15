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

    bool operator()(const std::shared_ptr<Proof> &lhs,
                    const std::shared_ptr<Proof> &rhs) const {
        return (*this)(*lhs, *rhs);
    }
};

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_PROOFCOMPARATOR_H
