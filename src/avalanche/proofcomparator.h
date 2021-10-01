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
 * Compare shared pointers to proof by score, then by id in case of equality.
 */
struct ProofSharedPointerComparator {
    bool operator()(const std::shared_ptr<Proof> &lhs,
                    const std::shared_ptr<Proof> &rhs) const {
        uint32_t scoreLhs = lhs->getScore();
        uint32_t scoreRhs = rhs->getScore();

        return (scoreLhs != scoreRhs) ? scoreLhs > scoreRhs
                                      : lhs->getId() < rhs->getId();
    }
};

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_PROOFCOMPARATOR_H
