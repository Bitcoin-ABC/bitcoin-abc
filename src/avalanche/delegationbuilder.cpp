// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/delegationbuilder.h>

#include <key.h>

namespace avalanche {

DelegationBuilder::DelegationBuilder(const Proof &p)
    : proofid(p.getId()), dgid(proofid) {
    levels.push_back({p.getMaster(), {}});
}

bool DelegationBuilder::importDelegation(const Delegation &d) {
    if (d.getProofId() != proofid) {
        return false;
    }

    if (levels.size() > 1) {
        // We already imported a delegation
        return false;
    }

    if (!d.levels.size()) {
        return true;
    }

    dgid = d.getId();
    for (auto &l : d.levels) {
        levels.back().sig = l.sig;
        levels.push_back({l.pubkey, {}});
    }

    return true;
}

bool DelegationBuilder::addLevel(const CKey &delegatorKey,
                                 const CPubKey &delegatedPubKey) {
    // Ensures that the private key provided is the one we need.
    if (levels.back().pubkey != delegatorKey.GetPubKey()) {
        return false;
    }

    CHashWriter ss(SER_GETHASH, 0);
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

    return Delegation(proofid, dgid, std::move(dglvls));
}

} // namespace avalanche
