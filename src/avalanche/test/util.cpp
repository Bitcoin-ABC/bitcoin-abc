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

#include <limits>

namespace avalanche {

Proof buildRandomProof(uint32_t score, const CPubKey &master) {
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

    ProofBuilder pb(0, std::numeric_limits<uint32_t>::max(), master);
    pb.addUTXO(o, v, height, is_coinbase, std::move(key));
    return pb.build();
}

bool hasDustStake(const Proof &proof) {
    for (const SignedStake &s : proof.getStakes()) {
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

    // Reverse the sorting order
    std::sort(pb.stakes.begin(), pb.stakes.end(),
              [](const ProofBuilder::StakeSigner &lhs,
                 const ProofBuilder::StakeSigner &rhs) {
                  return lhs.stake.getId() > rhs.stake.getId();
              });

    WriteCompactSize(ss, pb.stakes.size());
    for (const auto &s : pb.stakes) {
        ss << s.stake;
    }

    CHashWriter ss2(SER_GETHASH, 0);
    ss2 << ss.GetHash();
    ss2 << pb.master;

    return ProofId(ss2.GetHash());
}

Proof TestProofBuilder::buildWithReversedOrderStakes(ProofBuilder &pb) {
    const ProofId proofid = TestProofBuilder::getReverseOrderProofId(pb);

    std::vector<SignedStake> signedStakes;
    signedStakes.reserve(pb.stakes.size());

    for (auto &s : pb.stakes) {
        signedStakes.push_back(s.sign(proofid));
    }

    pb.stakes.clear();
    return Proof(pb.sequence, pb.expirationTime, std::move(pb.master),
                 std::move(signedStakes));
}

} // namespace avalanche
