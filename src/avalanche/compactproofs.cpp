// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/compactproofs.h>

#include <avalanche/proofid.h>
#include <crypto/siphash.h>

namespace avalanche {

CompactProofs::CompactProofs(
    const RadixTree<const Proof, ProofRadixTreeAdapter> &proofs)
    : CompactProofs() {
    proofs.forEachLeaf([&](auto pLeaf) {
        shortproofids.push_back(getShortID(pLeaf->getId()));
        return true;
    });
}

uint64_t CompactProofs::getShortID(const ProofId &proofid) const {
    static_assert(SHORTPROOFIDS_LENGTH == 6,
                  "shortproofids calculation assumes 6-byte shortproofids");
    return SipHashUint256(shortproofidk0, shortproofidk1, proofid) &
           0xffffffffffffL;
}

} // namespace avalanche
