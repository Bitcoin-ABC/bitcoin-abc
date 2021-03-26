// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/proof.h>

#include <avalanche/validation.h>
#include <coins.h>
#include <hash.h>
#include <script/standard.h>

#include <unordered_set>

namespace avalanche {

uint256 Stake::getHash(const ProofId &proofid) const {
    CHashWriter ss(SER_GETHASH, 0);
    ss << proofid;
    ss << *this;
    return ss.GetHash();
}

bool SignedStake::verify(const ProofId &proofid) const {
    return stake.getPubkey().VerifySchnorr(stake.getHash(proofid), sig);
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

    if (stakes.size() > AVALANCHE_MAX_PROOF_STAKES) {
        return state.Invalid(ProofValidationResult::TOO_MANY_UTXOS);
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

bool Proof::verify(ProofValidationState &state, const CCoinsView &view) const {
    if (!verify(state)) {
        // state is set by verify.
        return false;
    }

    for (const SignedStake &ss : stakes) {
        const Stake &s = ss.getStake();
        const COutPoint &utxo = s.getUTXO();

        Coin coin;
        if (!view.GetCoin(utxo, coin)) {
            // The coins are not in the UTXO set.
            return state.Invalid(ProofValidationResult::MISSING_UTXO);
        }

        if (s.isCoinbase() != coin.IsCoinBase()) {
            return state.Invalid(ProofValidationResult::COINBASE_MISMATCH);
        }

        if (s.getHeight() != coin.GetHeight()) {
            return state.Invalid(ProofValidationResult::HEIGHT_MISMATCH);
        }

        const CTxOut &out = coin.GetTxOut();
        if (s.getAmount() != out.nValue) {
            // Wrong amount.
            return state.Invalid(ProofValidationResult::AMOUNT_MISMATCH);
        }

        CTxDestination dest;
        if (!ExtractDestination(out.scriptPubKey, dest)) {
            // Can't extract destination.
            return state.Invalid(
                ProofValidationResult::NON_STANDARD_DESTINATION);
        }

        PKHash *pkhash = boost::get<PKHash>(&dest);
        if (!pkhash) {
            // Only PKHash are supported.
            return state.Invalid(
                ProofValidationResult::DESTINATION_NOT_SUPPORTED);
        }

        const CPubKey &pubkey = s.getPubkey();
        if (*pkhash != PKHash(pubkey)) {
            // Wrong pubkey.
            return state.Invalid(ProofValidationResult::DESTINATION_MISMATCH);
        }
    }

    return true;
}

} // namespace avalanche
