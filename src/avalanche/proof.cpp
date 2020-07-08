// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/proof.h>

#include <hash.h>
#include <random.h>

#include <limits>

namespace avalanche {

Proof::Proof(uint64_t sequence_, int64_t expirationTime_, CPubKey master_,
             std::vector<SignedStake> stakes_)
    : sequence(sequence_), expirationTime(expirationTime_),
      master(std::move(master_)), stakes(std::move(stakes_)),
      proofid(computeProofId()) {}

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

Proof Proof::makeRandom(uint32_t score) {
    return Proof(0, std::numeric_limits<uint32_t>::max(), CPubKey(),
                 {{{COutPoint(TxId(GetRandHash()), 0),
                    (int64_t(score) * COIN) / 100, 0, CPubKey()},
                   {}}});
}

} // namespace avalanche
