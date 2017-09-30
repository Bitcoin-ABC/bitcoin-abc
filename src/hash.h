// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_HASH_H
#define BITCOIN_HASH_H

#include "crypto/ripemd160.h"
#include "crypto/sha256.h"
#include "prevector.h"
#include "serialize.h"
#include "uint256.h"
#include "version.h"

#include <vector>

typedef uint256 ChainCode;

/** A hasher class for Bitcoin's 256-bit hash (double SHA-256). */
class CHash256 {
private:
    CSHA256 sha;

public:
    static const size_t OUTPUT_SIZE = CSHA256::OUTPUT_SIZE;

    void Finalize(uint8_t hash[OUTPUT_SIZE]) {
        uint8_t buf[CSHA256::OUTPUT_SIZE];
        sha.Finalize(buf);
        sha.Reset().Write(buf, CSHA256::OUTPUT_SIZE).Finalize(hash);
    }

    CHash256 &Write(const uint8_t *data, size_t len) {
        sha.Write(data, len);
        return *this;
    }

    CHash256 &Reset() {
        sha.Reset();
        return *this;
    }
};

/** A hasher class for Bitcoin's 160-bit hash (SHA-256 + RIPEMD-160). */
class CHash160 {
private:
    CSHA256 sha;

public:
    static const size_t OUTPUT_SIZE = CRIPEMD160::OUTPUT_SIZE;

    void Finalize(uint8_t hash[OUTPUT_SIZE]) {
        uint8_t buf[CSHA256::OUTPUT_SIZE];
        sha.Finalize(buf);
        CRIPEMD160().Write(buf, CSHA256::OUTPUT_SIZE).Finalize(hash);
    }

    CHash160 &Write(const uint8_t *data, size_t len) {
        sha.Write(data, len);
        return *this;
    }

    CHash160 &Reset() {
        sha.Reset();
        return *this;
    }
};

/** Compute the 256-bit hash of an object. */
template <typename T1> inline uint256 Hash(const T1 pbegin, const T1 pend) {
    static const uint8_t pblank[1] = {};
    uint256 result;
    CHash256()
        .Write(pbegin == pend ? pblank : (const uint8_t *)&pbegin[0],
               (pend - pbegin) * sizeof(pbegin[0]))
        .Finalize((uint8_t *)&result);
    return result;
}

/** Compute the 256-bit hash of the concatenation of two objects. */
template <typename T1, typename T2>
inline uint256 Hash(const T1 p1begin, const T1 p1end, const T2 p2begin,
                    const T2 p2end) {
    static const uint8_t pblank[1] = {};
    uint256 result;
    CHash256()
        .Write(p1begin == p1end ? pblank : (const uint8_t *)&p1begin[0],
               (p1end - p1begin) * sizeof(p1begin[0]))
        .Write(p2begin == p2end ? pblank : (const uint8_t *)&p2begin[0],
               (p2end - p2begin) * sizeof(p2begin[0]))
        .Finalize((uint8_t *)&result);
    return result;
}

/** Compute the 256-bit hash of the concatenation of three objects. */
template <typename T1, typename T2, typename T3>
inline uint256 Hash(const T1 p1begin, const T1 p1end, const T2 p2begin,
                    const T2 p2end, const T3 p3begin, const T3 p3end) {
    static const uint8_t pblank[1] = {};
    uint256 result;
    CHash256()
        .Write(p1begin == p1end ? pblank : (const uint8_t *)&p1begin[0],
               (p1end - p1begin) * sizeof(p1begin[0]))
        .Write(p2begin == p2end ? pblank : (const uint8_t *)&p2begin[0],
               (p2end - p2begin) * sizeof(p2begin[0]))
        .Write(p3begin == p3end ? pblank : (const uint8_t *)&p3begin[0],
               (p3end - p3begin) * sizeof(p3begin[0]))
        .Finalize((uint8_t *)&result);
    return result;
}

/** Compute the 160-bit hash an object. */
template <typename T1> inline uint160 Hash160(const T1 pbegin, const T1 pend) {
    static uint8_t pblank[1] = {};
    uint160 result;
    CHash160()
        .Write(pbegin == pend ? pblank : (const uint8_t *)&pbegin[0],
               (pend - pbegin) * sizeof(pbegin[0]))
        .Finalize((uint8_t *)&result);
    return result;
}

/** Compute the 160-bit hash of a vector. */
inline uint160 Hash160(const std::vector<uint8_t> &vch) {
    return Hash160(vch.begin(), vch.end());
}

/** Compute the 160-bit hash of a vector. */
template <unsigned int N>
inline uint160 Hash160(const prevector<N, uint8_t> &vch) {
    return Hash160(vch.begin(), vch.end());
}

/** A writer stream (for serialization) that computes a 256-bit hash. */
class CHashWriter {
private:
    CHash256 ctx;

    const int nType;
    const int nVersion;

public:
    CHashWriter(int nTypeIn, int nVersionIn)
        : nType(nTypeIn), nVersion(nVersionIn) {}

    int GetType() const { return nType; }
    int GetVersion() const { return nVersion; }

    void write(const char *pch, size_t size) {
        ctx.Write((const uint8_t *)pch, size);
    }

    // invalidates the object
    uint256 GetHash() {
        uint256 result;
        ctx.Finalize((uint8_t *)&result);
        return result;
    }

    template <typename T> CHashWriter &operator<<(const T &obj) {
        // Serialize to this stream
        ::Serialize(*this, obj);
        return (*this);
    }
};

/**
 * Reads data from an underlying stream, while hashing the read data.
 */
template <typename Source> class CHashVerifier : public CHashWriter {
private:
    Source *source;

public:
    CHashVerifier(Source *source_)
        : CHashWriter(source_->GetType(), source_->GetVersion()),
          source(source_) {}

    void read(char *pch, size_t nSize) {
        source->read(pch, nSize);
        this->write(pch, nSize);
    }

    void ignore(size_t nSize) {
        char data[1024];
        while (nSize > 0) {
            size_t now = std::min<size_t>(nSize, 1024);
            read(data, now);
            nSize -= now;
        }
    }

    template <typename T> CHashVerifier<Source> &operator>>(T &obj) {
        // Unserialize from this stream
        ::Unserialize(*this, obj);
        return (*this);
    }
};

/** Compute the 256-bit hash of an object's serialization. */
template <typename T>
uint256 SerializeHash(const T &obj, int nType = SER_GETHASH,
                      int nVersion = PROTOCOL_VERSION) {
    CHashWriter ss(nType, nVersion);
    ss << obj;
    return ss.GetHash();
}

unsigned int MurmurHash3(unsigned int nHashSeed,
                         const std::vector<uint8_t> &vDataToHash);

void BIP32Hash(const ChainCode &chainCode, unsigned int nChild, uint8_t header,
               const uint8_t data[32], uint8_t output[64]);

/** SipHash-2-4 */
class CSipHasher {
private:
    uint64_t v[4];
    uint64_t tmp;
    int count;

public:
    /** Construct a SipHash calculator initialized with 128-bit key (k0, k1) */
    CSipHasher(uint64_t k0, uint64_t k1);
    /**
     * Hash a 64-bit integer worth of data.
     * It is treated as if this was the little-endian interpretation of 8 bytes.
     * This function can only be used when a multiple of 8 bytes have been
     * written so far.
     */
    CSipHasher &Write(uint64_t data);
    /** Hash arbitrary bytes. */
    CSipHasher &Write(const uint8_t *data, size_t size);
    /** Compute the 64-bit SipHash-2-4 of the data written so far. The object
     * remains untouched. */
    uint64_t Finalize() const;
};

/** Optimized SipHash-2-4 implementation for uint256.
 *
 *  It is identical to:
 *    SipHasher(k0, k1)
 *      .Write(val.GetUint64(0))
 *      .Write(val.GetUint64(1))
 *      .Write(val.GetUint64(2))
 *      .Write(val.GetUint64(3))
 *      .Finalize()
 */
uint64_t SipHashUint256(uint64_t k0, uint64_t k1, const uint256 &val);
uint64_t SipHashUint256Extra(uint64_t k0, uint64_t k1, const uint256 &val,
                             uint32_t extra);

#endif // BITCOIN_HASH_H
