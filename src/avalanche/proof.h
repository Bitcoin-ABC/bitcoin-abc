// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_PROOF_H
#define BITCOIN_AVALANCHE_PROOF_H

#include <amount.h>
#include <primitives/transaction.h>
#include <pubkey.h>
#include <serialize.h>
#include <uint256.h>

#include <array>
#include <cstdint>
#include <vector>

namespace avalanche {

class ProofValidationState;

struct ProofId : public uint256 {
    explicit ProofId() : uint256() {}
    explicit ProofId(const uint256 &b) : uint256(b) {}

    static ProofId fromHex(const std::string &str) {
        ProofId r;
        r.SetHex(str);
        return r;
    }
};

class Stake {
    COutPoint utxo;

    Amount amount;
    uint32_t height;
    CPubKey pubkey;

public:
    explicit Stake() = default;
    Stake(COutPoint utxo_, Amount amount_, uint32_t height_, CPubKey pubkey_)
        : utxo(utxo_), amount(amount_), height(height_),
          pubkey(std::move(pubkey_)) {}

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        READWRITE(utxo);
        READWRITE(amount);
        READWRITE(height);
        READWRITE(pubkey);
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
    std::array<uint8_t, 64> sig;

public:
    explicit SignedStake() = default;
    SignedStake(Stake stake_, std::array<uint8_t, 64> sig_)
        : stake(std::move(stake_)), sig(std::move(sig_)) {}

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        READWRITE(stake);
        READWRITE(sig);
    }

    const Stake &getStake() const { return stake; }
    const std::array<uint8_t, 64> &getSignature() const { return sig; }

    bool verify(const ProofId &proofid) const;
};

class Proof {
    uint64_t sequence;
    int64_t expirationTime;
    CPubKey master;
    std::vector<SignedStake> stakes;

    ProofId proofid;
    ProofId computeProofId() const;

public:
    Proof() : sequence(0), expirationTime(0), master(), stakes(), proofid() {}
    Proof(uint64_t sequence_, int64_t expirationTime_, CPubKey master_,
          std::vector<SignedStake> stakes_)
        : sequence(sequence_), expirationTime(expirationTime_),
          master(std::move(master_)), stakes(std::move(stakes_)),
          proofid(computeProofId()) {}

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        READWRITE(sequence);
        READWRITE(expirationTime);
        READWRITE(master);
        READWRITE(stakes);

        if (ser_action.ForRead()) {
            proofid = computeProofId();
        }
    }

    uint64_t getSequence() const { return sequence; }
    int64_t getExpirationTime() const { return expirationTime; }
    const CPubKey &getMaster() const { return master; }
    const std::vector<SignedStake> &getStakes() const { return stakes; }

    const ProofId &getId() const { return proofid; }
    uint32_t getScore() const;

    bool verify(ProofValidationState &state) const;
};

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_PROOF_H
