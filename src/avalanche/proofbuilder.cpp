// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/proofbuilder.h>

#include <random.h>
#include <util/system.h>

namespace avalanche {

SignedStake ProofBuilder::StakeSigner::sign(const StakeCommitment &commitment) {
    const uint256 h = stake.getHash(commitment);

    SchnorrSig sig;
    if (!key.SignSchnorr(h, sig)) {
        sig.fill(0);
    }

    return SignedStake(std::move(stake), std::move(sig));
}

bool ProofBuilder::addUTXO(COutPoint utxo, Amount amount, uint32_t height,
                           bool is_coinbase, CKey key) {
    if (!key.IsValid()) {
        return false;
    }

    return stakes
        .emplace(Stake(std::move(utxo), amount, height, is_coinbase,
                       key.GetPubKey()),
                 std::move(key))
        .second;
}

Proof ProofBuilder::build() {
    SchnorrSig proofSignature;
    const LimitedProofId limitedProofId = getLimitedProofId();
    if (!masterKey.SignSchnorr(limitedProofId, proofSignature)) {
        proofSignature.fill(0);
    }

    const ProofId proofid = getProofId();
    const StakeCommitment commitment(proofid);

    std::vector<SignedStake> signedStakes;
    signedStakes.reserve(stakes.size());

    while (!stakes.empty()) {
        auto handle = stakes.extract(stakes.begin());
        signedStakes.push_back(handle.value().sign(commitment));
    }

    return Proof(sequence, expirationTime, masterKey.GetPubKey(),
                 std::move(signedStakes), payoutScriptPubKey,
                 std::move(proofSignature));
}

LimitedProofId ProofBuilder::getLimitedProofId() const {
    CHashWriter ss(SER_GETHASH, 0);
    ss << sequence;
    ss << expirationTime;

    if (!Proof::useLegacy(gArgs)) {
        ss << payoutScriptPubKey;
    }

    WriteCompactSize(ss, stakes.size());
    for (const auto &s : stakes) {
        ss << s.stake;
    }

    return LimitedProofId(ss.GetHash());
}

ProofId ProofBuilder::getProofId() const {
    CHashWriter ss(SER_GETHASH, 0);
    ss << getLimitedProofId();
    ss << masterKey.GetPubKey();

    return ProofId(ss.GetHash());
}

} // namespace avalanche
