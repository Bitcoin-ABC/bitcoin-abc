// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/proofbuilder.h>

#include <random.h>

namespace avalanche {

bool ProofBuilder::addUTXO(COutPoint utxo, Amount amount, uint32_t height,
                           bool is_coinbase, CKey key) {
    if (!key.IsValid()) {
        return false;
    }

    const StakeCommitment commitment(expirationTime, masterKey.GetPubKey());
    auto stake =
        Stake(std::move(utxo), amount, height, is_coinbase, key.GetPubKey());
    const uint256 h = stake.getHash(commitment);
    SchnorrSig sig;
    if (!key.SignSchnorr(h, sig)) {
        sig.fill(0);
    }

    return stakes.emplace(std::move(stake), std::move(sig)).second;
}

ProofRef ProofBuilder::build() {
    SchnorrSig proofSignature;
    const LimitedProofId limitedProofId = getLimitedProofId();
    if (!masterKey.SignSchnorr(limitedProofId, proofSignature)) {
        proofSignature.fill(0);
    }
    std::vector<SignedStake> signedStakes;
    signedStakes.reserve(stakes.size());

    while (!stakes.empty()) {
        auto handle = stakes.extract(stakes.begin());
        signedStakes.push_back(handle.value());
    }

    return ProofRef::make(sequence, expirationTime, masterKey.GetPubKey(),
                          std::move(signedStakes), payoutScriptPubKey,
                          std::move(proofSignature));
}

LimitedProofId ProofBuilder::getLimitedProofId() const {
    HashWriter ss{};
    ss << sequence;
    ss << expirationTime;
    ss << payoutScriptPubKey;

    WriteCompactSize(ss, stakes.size());
    for (const auto &s : stakes) {
        ss << s.getStake();
    }

    return LimitedProofId(ss.GetHash());
}

ProofId ProofBuilder::getProofId() const {
    HashWriter ss{};
    ss << getLimitedProofId();
    ss << masterKey.GetPubKey();

    return ProofId(ss.GetHash());
}

} // namespace avalanche
