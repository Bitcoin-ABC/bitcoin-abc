// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_HASH_H
#define BITCOIN_HASH_H

#include <crypto/common.h>
#include <crypto/ripemd160.h>
#include <crypto/sha256.h>
#include <prevector.h>
#include <serialize.h>
#include <uint256.h>
#include <version.h>

#include <vector>

typedef uint256 ChainCode;

/** A hasher class for Bitcoin's 256-bit hash (double SHA-256). */
class CHash256 {
private:
    CSHA256 sha;

public:
    static const size_t OUTPUT_SIZE = CSHA256::OUTPUT_SIZE;

    void Finalize(Span<uint8_t> output) {
        assert(output.size() == OUTPUT_SIZE);
        uint8_t buf[CSHA256::OUTPUT_SIZE];
        sha.Finalize(buf);
        sha.Reset().Write(buf, CSHA256::OUTPUT_SIZE).Finalize(output.data());
    }

    CHash256 &Write(Span<const uint8_t> input) {
        sha.Write(input.data(), input.size());
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

    void Finalize(Span<uint8_t> output) {
        assert(output.size() == OUTPUT_SIZE);
        uint8_t buf[CSHA256::OUTPUT_SIZE];
        sha.Finalize(buf);
        CRIPEMD160().Write(buf, CSHA256::OUTPUT_SIZE).Finalize(output.data());
    }

    CHash160 &Write(Span<const uint8_t> input) {
        sha.Write(input.data(), input.size());
        return *this;
    }

    CHash160 &Reset() {
        sha.Reset();
        return *this;
    }
};

/** Compute the 256-bit hash of an object. */
template <typename T> inline uint256 Hash(const T &in1) {
    uint256 result;
    CHash256().Write(MakeUCharSpan(in1)).Finalize(result);
    return result;
}

/** Compute the 256-bit hash of the concatenation of two objects. */
template <typename T1, typename T2>
inline uint256 Hash(const T1 &in1, const T2 &in2) {
    uint256 result;
    CHash256()
        .Write(MakeUCharSpan(in1))
        .Write(MakeUCharSpan(in2))
        .Finalize(result);
    return result;
}

/** Compute the 160-bit hash an object. */
template <typename T1> inline uint160 Hash160(const T1 &in1) {
    uint160 result;
    CHash160().Write(MakeUCharSpan(in1)).Finalize(result);
    return result;
}

/** A writer stream (for serialization) that computes a 256-bit hash. */
class CHashWriter {
private:
    CSHA256 ctx;

    const int nType;
    const int nVersion;

public:
    CHashWriter(int nTypeIn, int nVersionIn)
        : nType(nTypeIn), nVersion(nVersionIn) {}

    int GetType() const { return nType; }
    int GetVersion() const { return nVersion; }

    void write(Span<const std::byte> src) {
        ctx.Write(UCharCast(src.data()), src.size());
    }

    /**
     * Compute the double-SHA256 hash of all data written to this object.
     *
     * Invalidates this object.
     */
    uint256 GetHash() {
        uint256 result;
        ctx.Finalize(result.begin());
        ctx.Reset()
            .Write(result.begin(), CSHA256::OUTPUT_SIZE)
            .Finalize(result.begin());
        return result;
    }

    /**
     * Compute the SHA256 hash of all data written to this object.
     *
     * Invalidates this object.
     */
    uint256 GetSHA256() {
        uint256 result;
        ctx.Finalize(result.begin());
        return result;
    }

    /**
     * Returns the first 64 bits from the resulting hash.
     */
    inline uint64_t GetCheapHash() {
        uint256 result = GetHash();
        return ReadLE64(result.begin());
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
    explicit CHashVerifier(Source *source_)
        : CHashWriter(source_->GetType(), source_->GetVersion()),
          source(source_) {}

    void read(Span<std::byte> dst) {
        source->read(dst);
        this->write(dst);
    }

    void ignore(size_t nSize) {
        std::byte data[1024];
        while (nSize > 0) {
            size_t now = std::min<size_t>(nSize, 1024);
            read({data, now});
            nSize -= now;
        }
    }

    template <typename T> CHashVerifier<Source> &operator>>(T &&obj) {
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

uint32_t MurmurHash3(uint32_t nHashSeed, Span<const uint8_t> vDataToHash);

void BIP32Hash(const ChainCode &chainCode, uint32_t nChild, uint8_t header,
               const uint8_t data[32], uint8_t output[64]);

#endif // BITCOIN_HASH_H
