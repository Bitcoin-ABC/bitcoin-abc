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

    cacheClean = false;
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

    cacheClean = false;
    return AddProofStatus::SUCCEED;
}

// Having the ProofId passed by reference is risky because it is usually a
// reference to a proof member. This proof will be deleted during the erasure
// loop so we pass it by value.
bool ProofPool::removeProof(ProofId proofid) {
    cacheClean = false;
    auto &poolView = pool.get<by_proofid>();
    return poolView.erase(proofid);
}

std::unordered_set<ProofRef, SaltedProofHasher>
ProofPool::rescan(PeerManager &peerManager) {
    auto previousPool = std::move(pool);
    pool.clear();
    cacheClean = false;

    std::unordered_set<ProofRef, SaltedProofHasher> registeredProofs;
    for (auto &entry : previousPool) {
        if (registeredProofs.insert(entry.proof).second) {
            peerManager.registerProof(entry.proof);
        }
    }

    return registeredProofs;
}

ProofIdSet ProofPool::getProofIds() const {
    ProofIdSet proofIds;

    auto &poolView = pool.get<by_proofid>();
    for (auto it = poolView.begin(); it != poolView.end(); it++) {
        proofIds.insert(it->proof->getId());
    }

    return proofIds;
}

ProofRef ProofPool::getProof(const ProofId &proofid) const {
    auto &poolView = pool.get<by_proofid>();
    auto it = poolView.find(proofid);
    return it == poolView.end() ? ProofRef() : it->proof;
}

ProofRef ProofPool::getProof(const COutPoint &outpoint) const {
    auto it = pool.find(outpoint);
    return it == pool.end() ? ProofRef() : it->proof;
}

ProofRef ProofPool::getLowestScoreProof() const {
    auto &poolView = pool.get<by_proof_score>();
    return poolView.rbegin() == poolView.rend() ? ProofRef()
                                                : poolView.rbegin()->proof;
}

size_t ProofPool::countProofs() const {
    if (cacheClean) {
        return cacheProofCount;
    }

    size_t count = 0;
    forEachProof([&](const ProofRef &proof) { count++; });

    cacheProofCount = count;
    cacheClean = true;
    return cacheProofCount;
}

} // namespace avalanche
