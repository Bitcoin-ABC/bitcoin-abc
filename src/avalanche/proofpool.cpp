// Copyright (c) 2021 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/proofpool.h>

#include <avalanche/peermanager.h>

namespace avalanche {

ProofPool::AddProofStatus ProofPool::addProof(const ProofRef &proof) {
    assert(proof);

    const ProofId &proofid = proof->getId();

    auto &poolView = pool.get<by_proofid>();
    if (poolView.find(proofid) != poolView.end()) {
        return AddProofStatus::DUPLICATED;
    }

    // Attach UTXOs to this proof.
    std::unordered_set<ProofRef> conflicting_proofs;
    for (size_t i = 0; i < proof->getStakes().size(); i++) {
        auto p = pool.emplace(i, proof);
        if (!p.second) {
            // We have a collision with an existing proof.
            conflicting_proofs.insert(p.first->proof);
        }
    }

    // For now, if there is a conflict, just cleanup the mess.
    if (conflicting_proofs.size() > 0) {
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

// Having the ProofRef passed by reference is risky because the proof could be
// deleted during the erasure loop, so we pass it by value. Since it's a shared
// pointer, the copy is cheap enough and should not have any significant impact
// on performance.
bool ProofPool::removeProof(ProofRef proof) {
    auto &poolView = pool.get<by_proofid>();
    return poolView.erase(proof->getId());
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
