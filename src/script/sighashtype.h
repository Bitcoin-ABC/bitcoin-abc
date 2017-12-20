// Copyright (c) 2017 Bitcoin ABC developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_SCRIPT_HASH_TYPE_H
#define BITCOIN_SCRIPT_HASH_TYPE_H

#include <cstdint>
#include <stdexcept>

/** Signature hash types/flags */
enum {
    SIGHASH_ALL = 1,
    SIGHASH_NONE = 2,
    SIGHASH_SINGLE = 3,
    SIGHASH_FORKID = 0x40,
    SIGHASH_ANYONECANPAY = 0x80,
};

/** Base signature hash types */
enum class BaseSigHashType : uint32_t {
    ALL = SIGHASH_ALL,
    NONE = SIGHASH_NONE,
    SINGLE = SIGHASH_SINGLE
};

/** Signature hash type wrapper class */
class SigHashType {
private:
    uint32_t sigHash;

public:
    explicit SigHashType() : sigHash(SIGHASH_ALL) {}

    explicit SigHashType(uint32_t sigHashIn) : sigHash(sigHashIn) {
        if (((sigHash & 0x1f) < SIGHASH_ALL) ||
            ((sigHash & 0x1f) > SIGHASH_SINGLE)) {
            throw std::runtime_error("Base sighash must be specified");
        }
    }

    SigHashType withBaseSigHash(BaseSigHashType baseSigHashType) const {
        return SigHashType((sigHash & ~0x1f) | uint32_t(baseSigHashType));
    }

    SigHashType withForkId(bool forkId) const {
        return SigHashType((sigHash & ~SIGHASH_FORKID) |
                           (forkId ? SIGHASH_FORKID : 0));
    }

    SigHashType withAnyoneCanPay(bool anyoneCanPay) const {
        return SigHashType((sigHash & ~SIGHASH_ANYONECANPAY) |
                           (anyoneCanPay ? SIGHASH_ANYONECANPAY : 0));
    }

    BaseSigHashType getBaseSigHashType() const {
        return BaseSigHashType(sigHash & 0x1f);
    }

    bool hasForkId() const {
        return (sigHash & SIGHASH_FORKID) == SIGHASH_FORKID;
    }

    bool hasAnyoneCanPay() const {
        return (sigHash & SIGHASH_ANYONECANPAY) == SIGHASH_ANYONECANPAY;
    }

    uint32_t getRawSigHashType() const { return sigHash; }
};

#endif // BITCOIN_SCRIPT_HASH_TYPE_H
