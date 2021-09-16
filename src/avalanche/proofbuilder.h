// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_PROOFBUILDER_H
#define BITCOIN_AVALANCHE_PROOFBUILDER_H

#include <avalanche/proof.h>
#include <key.h>

#include <cstdio>

namespace avalanche {

struct TestProofBuilder;

class ProofBuilder {
    uint64_t sequence;
    int64_t expirationTime;
    CKey masterKey;
    CScript payoutScriptPubKey;

    struct StakeSigner {
        Stake stake;
        CKey key;

        StakeSigner(Stake stake_, CKey key_)
            : stake(std::move(stake_)), key(std::move(key_)) {}

        SignedStake sign(const StakeCommitment &commitment);
    };

    struct StakeSignerComparator {
        bool operator()(const StakeSigner &lhs, const StakeSigner &rhs) const {
            return lhs.stake.getId() < rhs.stake.getId();
        }
    };
    std::set<StakeSigner, StakeSignerComparator> stakes;

public:
    ProofBuilder(uint64_t sequence_, int64_t expirationTime_, CKey masterKey_,
                 const CScript &payoutScriptPubKey_ = CScript())
        : sequence(sequence_), expirationTime(expirationTime_),
          masterKey(std::move(masterKey_)),
          payoutScriptPubKey(payoutScriptPubKey_) {}

    [[nodiscard]] bool addUTXO(COutPoint utxo, Amount amount, uint32_t height,
                               bool is_coinbase, CKey key);

    Proof build();

private:
    LimitedProofId getLimitedProofId() const;
    ProofId getProofId() const;

    friend struct TestProofBuilder;
};

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_PROOFBUILDER_H
