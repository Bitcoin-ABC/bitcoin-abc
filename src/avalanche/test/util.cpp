// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <amount.h>
#include <avalanche/proofbuilder.h>
#include <avalanche/test/util.h>
#include <key.h>
#include <primitives/transaction.h>
#include <random.h>
#include <script/standard.h>
#include <validation.h>

#include <boost/test/unit_test.hpp>

#include <limits>

namespace avalanche {

ProofRef buildRandomProof(uint32_t score, const CKey &masterKey) {
    auto key = CKey::MakeCompressedKey();

    const COutPoint o(TxId(GetRandHash()), 0);
    const Amount v = (int64_t(score) * COIN) / 100;
    const int height = 1234;
    const bool is_coinbase = false;

    {
        CScript script = GetScriptForDestination(PKHash(key.GetPubKey()));

        LOCK(cs_main);
        CCoinsViewCache &coins = ::ChainstateActive().CoinsTip();
        coins.AddCoin(o, Coin(CTxOut(v, script), height, is_coinbase), false);
    }

    ProofBuilder pb(0, std::numeric_limits<uint32_t>::max(), masterKey);
    BOOST_CHECK(pb.addUTXO(o, v, height, is_coinbase, std::move(key)));
    return std::make_shared<Proof>(pb.build());
}

bool hasDustStake(const ProofRef &proof) {
    for (const SignedStake &s : proof->getStakes()) {
        if (s.getStake().getAmount() < PROOF_DUST_THRESHOLD) {
            return true;
        }
    }
    return false;
}

ProofId TestProofBuilder::getReverseOrderProofId(ProofBuilder &pb) {
    CHashWriter ss(SER_GETHASH, 0);
    ss << pb.sequence;
    ss << pb.expirationTime;

    WriteCompactSize(ss, pb.stakes.size());
    for (auto it = pb.stakes.rbegin(); it != pb.stakes.rend(); it++) {
        ss << it->stake;
    }

    CHashWriter ss2(SER_GETHASH, 0);
    ss2 << ss.GetHash();
    ss2 << pb.masterKey.GetPubKey();

    return ProofId(ss2.GetHash());
}

Proof TestProofBuilder::buildWithReversedOrderStakes(ProofBuilder &pb) {
    const ProofId proofid = TestProofBuilder::getReverseOrderProofId(pb);
    const StakeCommitment commitment(proofid);

    std::vector<SignedStake> signedStakes;
    signedStakes.reserve(pb.stakes.size());

    while (!pb.stakes.empty()) {
        // We need a forward iterator, so pb.stakes.rbegin() is not an
        // option.
        auto handle = pb.stakes.extract(std::prev(pb.stakes.end()));
        signedStakes.push_back(handle.value().sign(commitment));
    }

    return Proof(pb.sequence, pb.expirationTime, pb.masterKey.GetPubKey(),
                 std::move(signedStakes), pb.payoutScriptPubKey, SchnorrSig());
}

ProofId TestProofBuilder::getDuplicatedStakeProofId(ProofBuilder &pb) {
    CHashWriter ss(SER_GETHASH, 0);
    ss << pb.sequence;
    ss << pb.expirationTime;

    WriteCompactSize(ss, 2 * pb.stakes.size());
    for (auto &s : pb.stakes) {
        ss << s.stake;
        ss << s.stake;
    }

    CHashWriter ss2(SER_GETHASH, 0);
    ss2 << ss.GetHash();
    ss2 << pb.masterKey.GetPubKey();

    return ProofId(ss2.GetHash());
}

Proof TestProofBuilder::buildDuplicatedStakes(ProofBuilder &pb) {
    const ProofId proofid = TestProofBuilder::getDuplicatedStakeProofId(pb);
    const StakeCommitment commitment(proofid);

    std::vector<SignedStake> signedStakes;
    signedStakes.reserve(2 * pb.stakes.size());

    while (!pb.stakes.empty()) {
        auto handle = pb.stakes.extract(pb.stakes.begin());
        SignedStake signedStake = handle.value().sign(commitment);
        signedStakes.push_back(signedStake);
        signedStakes.push_back(signedStake);
    }

    return Proof(pb.sequence, pb.expirationTime, pb.masterKey.GetPubKey(),
                 std::move(signedStakes), pb.payoutScriptPubKey, SchnorrSig());
}

} // namespace avalanche
