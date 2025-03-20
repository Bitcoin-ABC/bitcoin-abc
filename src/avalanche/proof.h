// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_PROOF_H
#define BITCOIN_AVALANCHE_PROOF_H

#include <avalanche/proofid.h>
#include <consensus/amount.h>
#include <kernel/cs_main.h>
#include <key.h>
#include <primitives/transaction.h>
#include <pubkey.h>
#include <rcu.h>
#include <serialize.h>
#include <util/hasher.h>

#include <array>
#include <cstdint>
#include <optional>
#include <vector>

class ArgsManager;
class ChainstateManager;
struct bilingual_str;

/**
 * How many UTXOs can be used for a single proof.
 */
static constexpr int AVALANCHE_MAX_PROOF_STAKES = 1000;

/**
 * Minimum number of confirmations before a stake utxo is mature enough to be
 * included into a proof.
 */
static constexpr int AVALANCHE_DEFAULT_STAKE_UTXO_CONFIRMATIONS = 2016;

namespace avalanche {

/** Minimum amount per utxo */
static constexpr Amount PROOF_DUST_THRESHOLD = 100 * COIN;

class ProofValidationState;

using StakeId = uint256;

struct StakeCommitment : public uint256 {
    StakeCommitment(int64_t expirationTime, const CPubKey &master);
};

class Stake {
    COutPoint utxo;

    Amount amount;
    uint32_t height;
    CPubKey pubkey;

    StakeId stakeid;
    void computeStakeId();

public:
    explicit Stake() = default;
    Stake(COutPoint utxo_, Amount amount_, uint32_t height_, bool is_coinbase,
          CPubKey pubkey_)
        : utxo(utxo_), amount(amount_), height(height_ << 1 | is_coinbase),
          pubkey(std::move(pubkey_)) {
        computeStakeId();
    }

    SERIALIZE_METHODS(Stake, obj) {
        READWRITE(obj.utxo, obj.amount, obj.height, obj.pubkey);
        SER_READ(obj, obj.computeStakeId());
    }

    const COutPoint &getUTXO() const { return utxo; }
    Amount getAmount() const { return amount; }
    uint32_t getHeight() const { return height >> 1; }
    bool isCoinbase() const { return height & 1; }
    const CPubKey &getPubkey() const { return pubkey; }

    uint256 getHash(const StakeCommitment &commitment) const;

    const StakeId &getId() const { return stakeid; }
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

    bool verify(const StakeCommitment &commitment) const;
};

class Proof {
    uint64_t sequence;
    int64_t expirationTime;
    CPubKey master;
    std::vector<SignedStake> stakes;
    CScript payoutScriptPubKey;
    SchnorrSig signature;

    LimitedProofId limitedProofId;
    ProofId proofid;
    void computeProofId();

    uint32_t score;
    void computeScore();

    IMPLEMENT_RCU_REFCOUNT(uint64_t);

public:
    Proof()
        : sequence(0), expirationTime(0), master(), stakes(),
          payoutScriptPubKey(CScript()), limitedProofId(), proofid() {}

    Proof(uint64_t sequence_, int64_t expirationTime_, CPubKey master_,
          std::vector<SignedStake> stakes_, const CScript &payoutScriptPubKey_,
          SchnorrSig signature_)
        : sequence(sequence_), expirationTime(expirationTime_),
          master(std::move(master_)), stakes(std::move(stakes_)),
          payoutScriptPubKey(payoutScriptPubKey_),
          signature(std::move(signature_)) {
        computeProofId();
        computeScore();
    }
    Proof(Proof &&other)
        : sequence(other.sequence), expirationTime(other.expirationTime),
          master(std::move(other.master)), stakes(std::move(other.stakes)),
          payoutScriptPubKey(std::move(other.payoutScriptPubKey)),
          signature(std::move(other.signature)),
          limitedProofId(std::move(other.limitedProofId)),
          proofid(std::move(other.proofid)), score(other.score) {}

    /**
     * Deserialization constructor.
     */
    template <typename Stream> Proof(deserialize_type, Stream &s) {
        Unserialize(s);
    }

    SERIALIZE_METHODS(Proof, obj) {
        READWRITE(obj.sequence, obj.expirationTime, obj.master, obj.stakes);
        READWRITE(obj.payoutScriptPubKey, obj.signature);
        SER_READ(obj, obj.computeProofId());
        SER_READ(obj, obj.computeScore());
    }

    static bool FromHex(Proof &proof, const std::string &hexProof,
                        bilingual_str &errorOut);
    std::string ToHex() const;

    static uint32_t amountToScore(Amount amount);

    uint64_t getSequence() const { return sequence; }
    int64_t getExpirationTime() const { return expirationTime; }
    const CPubKey &getMaster() const { return master; }
    const std::vector<SignedStake> &getStakes() const { return stakes; }
    const CScript &getPayoutScript() const { return payoutScriptPubKey; }
    const SchnorrSig &getSignature() const { return signature; }

    const ProofId &getId() const { return proofid; }
    const LimitedProofId &getLimitedId() const { return limitedProofId; }
    const StakeCommitment getStakeCommitment() const {
        return StakeCommitment(expirationTime, master);
    };
    uint32_t getScore() const { return score; }
    Amount getStakedAmount() const;

    bool verify(const Amount &stakeUtxoDustThreshold,
                ProofValidationState &state) const;
    bool verify(const Amount &stakeUtxoDustThreshold,
                const ChainstateManager &chainman,
                ProofValidationState &state) const
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);
};

using ProofRef = RCUPtr<const Proof>;

class SaltedProofHasher : private SaltedUint256Hasher {
public:
    SaltedProofHasher() : SaltedUint256Hasher() {}
    size_t operator()(const ProofRef &proof) const {
        return hash(proof->getId());
    }
};

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_PROOF_H
