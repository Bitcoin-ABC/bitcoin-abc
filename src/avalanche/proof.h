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

#include <array>
#include <cstdint>
#include <vector>

class ArgsManager;
class CCoinsView;
struct bilingual_str;

/**
 * How many UTXOs can be used for a single proof.
 */
static constexpr int AVALANCHE_MAX_PROOF_STAKES = 1000;

/**
 * Whether the legacy proof format should be used by default.
 */
static constexpr bool AVALANCHE_DEFAULT_LEGACY_PROOF = true;

namespace avalanche {

/** Minimum amount per utxo */
static constexpr Amount PROOF_DUST_THRESHOLD = 1 * COIN;

class ProofValidationState;

using StakeId = uint256;

struct StakeCommitment : public uint256 {
    explicit StakeCommitment() : uint256() {}
    explicit StakeCommitment(const uint256 &b) : uint256(b) {}
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

    LimitedProofId limitedProofId;
    ProofId proofid;
    void computeProofId();

public:
    Proof()
        : sequence(0), expirationTime(0), master(), stakes(),
          payoutScriptPubKey(CScript()), limitedProofId(), proofid() {}

    Proof(uint64_t sequence_, int64_t expirationTime_, CPubKey master_,
          std::vector<SignedStake> stakes_, const CScript &payoutScriptPubKey_)
        : sequence(sequence_), expirationTime(expirationTime_),
          master(std::move(master_)), stakes(std::move(stakes_)),
          payoutScriptPubKey(payoutScriptPubKey_) {
        computeProofId();
    }

    SERIALIZE_METHODS(Proof, obj) {
        READWRITE(obj.sequence, obj.expirationTime, obj.master, obj.stakes);
        if (!useLegacy()) {
            READWRITE(obj.payoutScriptPubKey);
        }
        SER_READ(obj, obj.computeProofId());
    }

    static bool useLegacy();
    static bool useLegacy(const ArgsManager &argsman);

    static bool FromHex(Proof &proof, const std::string &hexProof,
                        bilingual_str &errorOut);

    uint64_t getSequence() const { return sequence; }
    int64_t getExpirationTime() const { return expirationTime; }
    const CPubKey &getMaster() const { return master; }
    const std::vector<SignedStake> &getStakes() const { return stakes; }

    const ProofId &getId() const { return proofid; }
    const LimitedProofId &getLimitedId() const { return limitedProofId; }
    const StakeCommitment getStakeCommitment() const {
        return StakeCommitment(proofid);
    }
    uint32_t getScore() const;

    bool verify(ProofValidationState &state) const;
    bool verify(ProofValidationState &state, const CCoinsView &view) const;
};

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_PROOF_H
