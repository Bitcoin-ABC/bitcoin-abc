// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/delegationbuilder.h>

#include <avalanche/proof.h>
#include <avalanche/proofid.h>
#include <pubkey.h>

#include <key.h>

namespace avalanche {

DelegationBuilder::DelegationBuilder(const LimitedProofId &ltdProofId,
                                     const CPubKey &proofMaster,
                                     const DelegationId &delegationId)
    : limitedProofid(ltdProofId), dgid(delegationId) {
    levels.push_back({proofMaster, {}});
}

DelegationBuilder::DelegationBuilder(const LimitedProofId &ltdProofId,
                                     const CPubKey &proofMaster)
    : DelegationBuilder(ltdProofId, proofMaster,
                        DelegationId(ltdProofId.computeProofId(proofMaster))) {}

DelegationBuilder::DelegationBuilder(const Proof &p)
    : DelegationBuilder(p.getLimitedId(), p.getMaster(),
                        DelegationId(p.getId())) {}

DelegationBuilder::DelegationBuilder(const Delegation &dg)
    : DelegationBuilder(dg.getLimitedProofId(), dg.getProofMaster(),
                        dg.getId()) {
    for (auto &l : dg.levels) {
        levels.back().sig = l.sig;
        levels.push_back({l.pubkey, {}});
    }
}

bool DelegationBuilder::addLevel(const CKey &delegatorKey,
                                 const CPubKey &delegatedPubKey) {
    // Ensures that the private key provided is the one we need.
    if (levels.back().pubkey != delegatorKey.GetPubKey()) {
        return false;
    }

    HashWriter ss{};
    ss << dgid;
    ss << delegatedPubKey;
    auto hash = ss.GetHash();

    if (!delegatorKey.SignSchnorr(hash, levels.back().sig)) {
        return false;
    }

    dgid = DelegationId(hash);
    levels.push_back({delegatedPubKey, {}});
    return true;
}

Delegation DelegationBuilder::build() const {
    std::vector<Delegation::Level> dglvls;
    for (size_t i = 1; i < levels.size(); i++) {
        dglvls.push_back({levels[i].pubkey, levels[i - 1].sig});
    }

    return Delegation(limitedProofid, levels[0].pubkey, dgid,
                      std::move(dglvls));
}

} // namespace avalanche
