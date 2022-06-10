// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/proofbuilder.h>
#include <avalanche/test/util.h>
#include <consensus/amount.h>
#include <key.h>
#include <primitives/transaction.h>
#include <random.h>
#include <script/standard.h>
#include <validation.h>

#include <boost/test/unit_test.hpp>

#include <limits>

namespace avalanche {

ProofRef buildRandomProof(Chainstate &active_chainstate, uint32_t score,
                          int height, const CKey &masterKey) {
    auto key = CKey::MakeCompressedKey();

    const COutPoint o(TxId(GetRandHash()), 0);
    const Amount v = (int64_t(score) * COIN) / 100;
    const bool is_coinbase = false;

    {
        CScript script = GetScriptForDestination(PKHash(key.GetPubKey()));

        LOCK(cs_main);
        CCoinsViewCache &coins = active_chainstate.CoinsTip();
        coins.AddCoin(o, Coin(CTxOut(v, script), height, is_coinbase), false);
    }

    ProofBuilder pb(0, std::numeric_limits<uint32_t>::max(), masterKey,
                    UNSPENDABLE_ECREG_PAYOUT_SCRIPT);
    BOOST_CHECK(pb.addUTXO(o, v, height, is_coinbase, std::move(key)));
    return pb.build();
}

bool hasDustStake(const ProofRef &proof) {
    for (const SignedStake &s : proof->getStakes()) {
        if (s.getStake().getAmount() < PROOF_DUST_THRESHOLD) {
            return true;
        }
    }
    return false;
}

LimitedProofId
TestProofBuilder::getReverseOrderLimitedProofId(ProofBuilder &pb) {
    HashWriter ss{};
    ss << pb.sequence;
    ss << pb.expirationTime;
    ss << pb.payoutScriptPubKey;

    WriteCompactSize(ss, pb.stakes.size());
    for (auto it = pb.stakes.rbegin(); it != pb.stakes.rend(); it++) {
        ss << it->getStake();
    }

    return LimitedProofId(ss.GetHash());
}

ProofRef TestProofBuilder::buildWithReversedOrderStakes(ProofBuilder &pb) {
    const LimitedProofId limitedProofid =
        TestProofBuilder::getReverseOrderLimitedProofId(pb);
    const CPubKey masterPubKey = pb.masterKey.GetPubKey();
    const StakeCommitment commitment(pb.expirationTime,
                                     pb.masterKey.GetPubKey());

    std::vector<SignedStake> signedStakes;
    signedStakes.reserve(pb.stakes.size());

    while (!pb.stakes.empty()) {
        // We need a forward iterator, so pb.stakes.rbegin() is not an
        // option.
        auto handle = pb.stakes.extract(std::prev(pb.stakes.end()));
        signedStakes.push_back(handle.value());
    }

    SchnorrSig proofSignature;
    BOOST_CHECK(pb.masterKey.SignSchnorr(limitedProofid, proofSignature));

    return ProofRef::make(pb.sequence, pb.expirationTime, masterPubKey,
                          std::move(signedStakes), pb.payoutScriptPubKey,
                          proofSignature);
}

LimitedProofId
TestProofBuilder::getDuplicatedStakeLimitedProofId(ProofBuilder &pb) {
    HashWriter ss{};
    ss << pb.sequence;
    ss << pb.expirationTime;
    ss << pb.payoutScriptPubKey;

    WriteCompactSize(ss, 2 * pb.stakes.size());
    for (auto &s : pb.stakes) {
        ss << s.getStake();
        ss << s.getStake();
    }

    return LimitedProofId(ss.GetHash());
}

ProofRef TestProofBuilder::buildDuplicatedStakes(ProofBuilder &pb) {
    const LimitedProofId limitedProofid =
        TestProofBuilder::getDuplicatedStakeLimitedProofId(pb);
    const CPubKey masterPubKey = pb.masterKey.GetPubKey();
    const StakeCommitment commitment(pb.expirationTime,
                                     pb.masterKey.GetPubKey());

    std::vector<SignedStake> signedStakes;
    signedStakes.reserve(2 * pb.stakes.size());

    while (!pb.stakes.empty()) {
        auto handle = pb.stakes.extract(pb.stakes.begin());
        SignedStake signedStake = handle.value();
        signedStakes.push_back(signedStake);
        signedStakes.push_back(signedStake);
    }

    SchnorrSig proofSignature;
    BOOST_CHECK(pb.masterKey.SignSchnorr(limitedProofid, proofSignature));

    return ProofRef::make(pb.sequence, pb.expirationTime, masterPubKey,
                          std::move(signedStakes), pb.payoutScriptPubKey,
                          proofSignature);
}

} // namespace avalanche
