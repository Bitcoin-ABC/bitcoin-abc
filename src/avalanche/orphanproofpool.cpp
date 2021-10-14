// Copyright (c) 2021 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/orphanproofpool.h>

#include <avalanche/peermanager.h>

#include <utility>

namespace avalanche {

void OrphanProofPool::trimToMaximumSize() {
    auto &proofs_by_sequence = proofs.get<by_sequence>();
    auto it = proofs_by_sequence.begin();
    while (nStakes > maxNumberOfStakes) {
        nStakes -= (*it)->getStakes().size();
        it = proofs_by_sequence.erase(it);
    }
}

bool OrphanProofPool::addProof(const ProofRef &proof) {
    size_t nStakesProof = proof->getStakes().size();
    if (!proofs.push_back(proof).second) {
        return false;
    }
    nStakes += nStakesProof;
    trimToMaximumSize();
    return true;
}

bool OrphanProofPool::removeProof(const ProofId &proofId) {
    auto &proofs_by_id = proofs.get<by_proofid>();
    auto it = proofs_by_id.find(proofId);
    if (it == proofs_by_id.end()) {
        return false;
    }
    nStakes -= (*it)->getStakes().size();
    proofs_by_id.erase(it);
    return true;
}

ProofRef OrphanProofPool::getProof(const ProofId &proofId) const {
    auto &proofs_by_proofid = proofs.get<by_proofid>();
    auto it = proofs_by_proofid.find(proofId);
    return it == proofs_by_proofid.end() ? nullptr : *it;
}

void OrphanProofPool::rescan(PeerManager &peerManager) {
    ProofContainer last_gen_proofs = std::move(proofs);
    proofs.clear();

    for (auto &proof : last_gen_proofs.get<by_sequence>()) {
        peerManager.getPeerId(proof);
    }
}

size_t OrphanProofPool::getNProofs() const {
    return proofs.size();
}

size_t OrphanProofPool::getNStakes() const {
    return nStakes;
}

} // namespace avalanche
