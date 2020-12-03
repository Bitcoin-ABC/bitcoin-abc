// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/delegation.h>

#include <avalanche/proof.h>
#include <avalanche/validation.h>
#include <hash.h>

namespace avalanche {

template <typename L, typename F>
static bool reduceLevels(uint256 &hash, const std::vector<L> &levels, F f) {
    for (const auto &l : levels) {
        CHashWriter ss(SER_GETHASH, 0);
        ss << hash;
        ss << l.pubkey;
        hash = ss.GetHash();

        if (!f(l)) {
            return false;
        }
    }

    return true;
}

template <typename L>
static bool reduceLevels(uint256 &hash, const std::vector<L> &levels) {
    return reduceLevels(hash, levels, [](const L &) { return true; });
}

DelegationId Delegation::computeDelegationId() const {
    uint256 hash = proofid;
    reduceLevels(hash, levels);
    return DelegationId(hash);
}

bool Delegation::verify(DelegationState &state, const Proof &proof,
                        CPubKey &auth) const {
    if (proof.getId() != proofid) {
        return state.Invalid(DelegationResult::INCORRECT_PROOF);
    }

    uint256 hash = proofid;
    const CPubKey *pauth = &proof.getMaster();

    bool ret = reduceLevels(hash, levels, [&](const Level &l) {
        if (!pauth->VerifySchnorr(hash, l.sig)) {
            return state.Invalid(DelegationResult::INVALID_SIGNATURE);
        }

        // This key is valid, now up to the next delegation level.
        pauth = &l.pubkey;
        return true;
    });

    auth = *pauth;
    return ret;
}

} // namespace avalanche
