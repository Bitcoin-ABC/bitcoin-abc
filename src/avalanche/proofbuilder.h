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

    struct SignedStakeComparator {
        bool operator()(const SignedStake &lhs, const SignedStake &rhs) const {
            return lhs.getStake().getId() < rhs.getStake().getId();
        }
    };
    std::set<SignedStake, SignedStakeComparator> stakes;

public:
    ProofBuilder(uint64_t sequence_, int64_t expirationTime_, CKey masterKey_,
                 const CScript &payoutScriptPubKey_)
        : sequence(sequence_), expirationTime(expirationTime_),
          masterKey(std::move(masterKey_)),
          payoutScriptPubKey(payoutScriptPubKey_) {}

    [[nodiscard]] bool addUTXO(COutPoint utxo, Amount amount, uint32_t height,
                               bool is_coinbase, CKey key);

    ProofRef build();

private:
    LimitedProofId getLimitedProofId() const;
    ProofId getProofId() const;

    friend struct TestProofBuilder;
};

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_PROOFBUILDER_H
