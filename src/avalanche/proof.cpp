// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/proof.h>

#include <coins.h> // For SaltedOutpointHasher
#include <hash.h>
#include <random.h>

#include <limits>
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

bool Proof::verify() const {
    if (getScore() == 0) {
        // No stake.
        return false;
    }

    std::unordered_set<COutPoint, SaltedOutpointHasher> utxos;
    for (auto &s : stakes) {
        if (!utxos.insert(s.getStake().getUTXO()).second) {
            // Duplicated stake.
            return false;
        }

        if (!s.verify(proofid)) {
            // Improperly signed stake.
            return false;
        }
    }

    return true;
}

Proof Proof::makeRandom(uint32_t score) {
    return Proof(0, std::numeric_limits<uint32_t>::max(), CPubKey(),
                 {{{COutPoint(TxId(GetRandHash()), 0),
                    (int64_t(score) * COIN) / 100, 0, CPubKey()},
                   {}}});
}

} // namespace avalanche
