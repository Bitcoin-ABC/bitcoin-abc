// Copyright (c) 2021 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/proofpool.h>

#include <avalanche/peermanager.h>
#include <avalanche/proofcomparator.h>

namespace avalanche {

ProofPool::AddProofStatus
ProofPool::addProofIfNoConflict(const ProofRef &proof,
                                ConflictingProofSet &conflictingProofs) {
    const ProofId &proofid = proof->getId();

    // Make sure the set is empty before we add items
    conflictingProofs.clear();

    auto &poolView = pool.get<by_proofid>();
    if (poolView.find(proofid) != poolView.end()) {
        return AddProofStatus::DUPLICATED;
    }

    // Attach UTXOs to this proof.
    for (size_t i = 0; i < proof->getStakes().size(); i++) {
        auto p = pool.emplace(i, proof);
        if (!p.second) {
            // We have a collision with an existing proof.
            conflictingProofs.insert(p.first->proof);
        }
    }

    // If there is a conflict, just cleanup the mess.
    if (conflictingProofs.size() > 0) {
        for (const auto &s : proof->getStakes()) {
            auto it = pool.find(s.getStake().getUTXO());
            assert(it != pool.end());

            // We need to delete that one.
            if (it->proof->getId() == proofid) {
                pool.erase(it);
            }
        }

        return AddProofStatus::REJECTED;
    }

    return AddProofStatus::SUCCEED;
}

ProofPool::AddProofStatus
ProofPool::addProofIfPreferred(const ProofRef &proof,
                               ConflictingProofSet &conflictingProofs) {
    auto status = addProofIfNoConflict(proof, conflictingProofs);

    // In case the proof was rejected due to conflict and it is the best
    // candidate, override the conflicting ones and add it again
    if (status != AddProofStatus::REJECTED ||
        ConflictingProofComparator()(*conflictingProofs.begin(), proof)) {
        return status;
    }

    for (auto &conflictingProof : conflictingProofs) {
        removeProof(conflictingProof->getId());
    }

    status = addProofIfNoConflict(proof);
    assert(status == AddProofStatus::SUCCEED);

    return AddProofStatus::SUCCEED;
}

// Having the ProofId passed by reference is risky because it is usually a
// reference to a proof member. This proof will be deleted during the erasure
// loop so we pass it by value.
bool ProofPool::removeProof(ProofId proofid) {
    auto &poolView = pool.get<by_proofid>();
    return poolView.erase(proofid);
}

void ProofPool::rescan(PeerManager &peerManager) {
    auto previousPool = std::move(pool);
    pool.clear();

    for (auto &entry : previousPool) {
        peerManager.registerProof(entry.proof);
    }
}

ProofRef ProofPool::getProof(const ProofId &proofid) const {
    auto &poolView = pool.get<by_proofid>();
    auto it = poolView.find(proofid);
    return it == poolView.end() ? nullptr : it->proof;
}

ProofRef ProofPool::getProof(const COutPoint &outpoint) const {
    auto it = pool.find(outpoint);
    return it == pool.end() ? nullptr : it->proof;
}

} // namespace avalanche
