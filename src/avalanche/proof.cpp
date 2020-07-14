// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/proof.h>

#include <avalanche/validation.h>
#include <coins.h> // For SaltedOutpointHasher
#include <hash.h>

#include <unordered_set>

namespace avalanche {

uint256 Stake::getHash(const ProofId &proofid) const {
    CHashWriter ss(SER_GETHASH, 0);
    ss << proofid;
    ss << *this;
    return ss.GetHash();
}

bool SignedStake::verify(const ProofId &proofid) const {
    // Unfortunately, the verify API require a vector.
    std::vector<uint8_t> vchSig{sig.begin(), sig.end()};
    return stake.getPubkey().VerifySchnorr(stake.getHash(proofid), vchSig);
}

ProofId Proof::computeProofId() const {
    CHashWriter ss(SER_GETHASH, 0);
    ss << sequence;
    ss << expirationTime;
    ss << master;

    WriteCompactSize(ss, stakes.size());
    for (const SignedStake &s : stakes) {
        ss << s.getStake();
    }

    return ProofId(ss.GetHash());
}

uint32_t Proof::getScore() const {
    Amount total = Amount::zero();
    for (const SignedStake &s : stakes) {
        total += s.getStake().getAmount();
    }

    return uint32_t((100 * total) / COIN);
}

static constexpr Amount PROOF_DUST_THRESOLD = 1 * SATOSHI;

bool Proof::verify(ProofValidationState &state) const {
    if (stakes.empty()) {
        return state.Invalid(ProofValidationResult::NO_STAKE);
    }

    std::unordered_set<COutPoint, SaltedOutpointHasher> utxos;
    for (const SignedStake &ss : stakes) {
        const Stake &s = ss.getStake();
        if (s.getAmount() < PROOF_DUST_THRESOLD) {
            return state.Invalid(ProofValidationResult::DUST_THRESOLD);
        }

        if (!utxos.insert(s.getUTXO()).second) {
            return state.Invalid(ProofValidationResult::DUPLICATE_STAKE);
        }

        if (!ss.verify(proofid)) {
            return state.Invalid(ProofValidationResult::INVALID_SIGNATURE);
        }
    }

    return true;
}

} // namespace avalanche
