// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_PROOF_H
#define BITCOIN_AVALANCHE_PROOF_H

#include <amount.h>
#include <avalanche/proofid.h>
#include <key.h>
#include <primitives/transaction.h>
#include <pubkey.h>
#include <serialize.h>
#include <util/translation.h>

#include <array>
#include <cstdint>
#include <vector>

class CCoinsView;

/**
 * How many UTXOs can be used for a single proof.
 */
static constexpr int AVALANCHE_MAX_PROOF_STAKES = 1000;

namespace avalanche {

/** Minimum amount per utxo */
static constexpr Amount PROOF_DUST_THRESHOLD = 1 * COIN;

class ProofValidationState;

class Stake {
    COutPoint utxo;

    Amount amount;
    uint32_t height;
    CPubKey pubkey;

public:
    explicit Stake() = default;
    Stake(COutPoint utxo_, Amount amount_, uint32_t height_, bool is_coinbase,
          CPubKey pubkey_)
        : utxo(utxo_), amount(amount_), height(height_ << 1 | is_coinbase),
          pubkey(std::move(pubkey_)) {}

    SERIALIZE_METHODS(Stake, obj) {
        READWRITE(obj.utxo, obj.amount, obj.height, obj.pubkey);
    }

    const COutPoint &getUTXO() const { return utxo; }
    Amount getAmount() const { return amount; }
    uint32_t getHeight() const { return height >> 1; }
    bool isCoinbase() const { return height & 1; }
    const CPubKey &getPubkey() const { return pubkey; }

    uint256 getHash(const ProofId &proofid) const;
};

class SignedStake {
    Stake stake;
    SchnorrSig sig;

public:
    explicit SignedStake() = default;
    SignedStake(Stake stake_, SchnorrSig sig_)
        : stake(std::move(stake_)), sig(std::move(sig_)) {}

    SERIALIZE_METHODS(SignedStake, obj) { READWRITE(obj.stake, obj.sig); }

    const Stake &getStake() const { return stake; }
    const SchnorrSig &getSignature() const { return sig; }

    bool verify(const ProofId &proofid) const;
};

class Proof {
    uint64_t sequence;
    int64_t expirationTime;
    CPubKey master;
    std::vector<SignedStake> stakes;

    LimitedProofId limitedProofId;
    ProofId proofid;
    void computeProofId();

public:
    Proof() : sequence(0), expirationTime(0), master(), stakes(), proofid() {}
    Proof(uint64_t sequence_, int64_t expirationTime_, CPubKey master_,
          std::vector<SignedStake> stakes_)
        : sequence(sequence_), expirationTime(expirationTime_),
          master(std::move(master_)), stakes(std::move(stakes_)) {
        computeProofId();
    }

    SERIALIZE_METHODS(Proof, obj) {
        READWRITE(obj.sequence, obj.expirationTime, obj.master, obj.stakes);
        SER_READ(obj, obj.computeProofId());
    }

    static bool FromHex(Proof &proof, const std::string &hexProof,
                        bilingual_str &errorOut);

    uint64_t getSequence() const { return sequence; }
    int64_t getExpirationTime() const { return expirationTime; }
    const CPubKey &getMaster() const { return master; }
    const std::vector<SignedStake> &getStakes() const { return stakes; }

    const ProofId &getId() const { return proofid; }
    const LimitedProofId &getLimitedId() const { return limitedProofId; }
    uint32_t getScore() const;

    bool verify(ProofValidationState &state) const;
    bool verify(ProofValidationState &state, const CCoinsView &view) const;
};

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_PROOF_H
