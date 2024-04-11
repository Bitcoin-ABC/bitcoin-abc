// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2017 The Zcash developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_PUBKEY_H
#define BITCOIN_PUBKEY_H

#include <hash.h>
#include <serialize.h>
#include <uint256.h>

#include <boost/range/adaptor/sliced.hpp>

#include <stdexcept>
#include <vector>

const unsigned int BIP32_EXTKEY_SIZE = 74;

/** A reference to a CKey: the Hash160 of its serialized public key */
class CKeyID : public uint160 {
public:
    CKeyID() : uint160() {}
    explicit CKeyID(const uint160 &in) : uint160(in) {}
};

using ChainCode = uint256;

/** An encapsulated public key. */
class CPubKey {
public:
    /**
     * secp256k1:
     */
    static constexpr unsigned int SIZE = 65;
    static constexpr unsigned int COMPRESSED_SIZE = 33;
    static constexpr unsigned int SCHNORR_SIZE = 64;
    static constexpr unsigned int SIGNATURE_SIZE = 72;
    static constexpr unsigned int COMPACT_SIGNATURE_SIZE = 65;
    /**
     * see www.keylength.com
     * script supports up to 75 for single byte push
     */
    static_assert(SIZE >= COMPRESSED_SIZE,
                  "COMPRESSED_SIZE is larger than SIZE");

private:
    /**
     * Just store the serialized data.
     * Its length can very cheaply be computed from the first byte.
     */
    uint8_t vch[SIZE];

    //! Compute the length of a pubkey with a given first byte.
    static unsigned int GetLen(uint8_t chHeader) {
        if (chHeader == 2 || chHeader == 3) {
            return COMPRESSED_SIZE;
        }
        if (chHeader == 4 || chHeader == 6 || chHeader == 7) {
            return SIZE;
        }
        return 0;
    }

    //! Set this key data to be invalid
    void Invalidate() { vch[0] = 0xFF; }

public:
    bool static ValidSize(const std::vector<uint8_t> &vch) {
        return vch.size() > 0 && GetLen(vch[0]) == vch.size();
    }

    //! Construct an invalid public key.
    CPubKey() { Invalidate(); }

    //! Initialize a public key using begin/end iterators to byte data.
    template <typename T> void Set(const T pbegin, const T pend) {
        int len = pend == pbegin ? 0 : GetLen(pbegin[0]);
        if (len && len == (pend - pbegin)) {
            memcpy(vch, (uint8_t *)&pbegin[0], len);
        } else {
            Invalidate();
        }
    }

    //! Construct a public key using begin/end iterators to byte data.
    template <typename T> CPubKey(const T pbegin, const T pend) {
        Set(pbegin, pend);
    }

    //! Construct a public key from a byte vector.
    explicit CPubKey(Span<const uint8_t> _vch) {
        Set(_vch.begin(), _vch.end());
    }

    //! Simple read-only vector-like interface to the pubkey data.
    unsigned int size() const { return GetLen(vch[0]); }
    const uint8_t *data() const { return vch; }
    const uint8_t *begin() const { return vch; }
    const uint8_t *end() const { return vch + size(); }
    const uint8_t &operator[](unsigned int pos) const { return vch[pos]; }

    //! Comparator implementation.
    friend bool operator==(const CPubKey &a, const CPubKey &b) {
        return a.vch[0] == b.vch[0] && memcmp(a.vch, b.vch, a.size()) == 0;
    }
    friend bool operator!=(const CPubKey &a, const CPubKey &b) {
        return !(a == b);
    }
    friend bool operator<(const CPubKey &a, const CPubKey &b) {
        return a.vch[0] < b.vch[0] ||
               (a.vch[0] == b.vch[0] && memcmp(a.vch, b.vch, a.size()) < 0);
    }

    //! Implement serialization, as if this was a byte vector.
    template <typename Stream> void Serialize(Stream &s) const {
        unsigned int len = size();
        ::WriteCompactSize(s, len);
        s.write(AsBytes(Span{vch, len}));
    }
    template <typename Stream> void Unserialize(Stream &s) {
        const unsigned int len(::ReadCompactSize(s));
        if (len <= SIZE) {
            s.read(AsWritableBytes(Span{vch, len}));
            if (len != size()) {
                Invalidate();
            }
        } else {
            // invalid pubkey, skip available data
            s.ignore(len);
            Invalidate();
        }
    }

    //! Get the KeyID of this public key (hash of its serialization)
    CKeyID GetID() const { return CKeyID(Hash160(Span{vch}.first(size()))); }

    //! Get the 256-bit hash of this public key.
    uint256 GetHash() const { return Hash(Span{vch}.first(size())); }

    /*
     * Check syntactic correctness.
     *
     * Note that this is consensus critical as CheckSig() calls it!
     */
    bool IsValid() const { return size() > 0; }

    //! fully validate whether this is a valid public key (more expensive than
    //! IsValid())
    bool IsFullyValid() const;

    //! Check whether this is a compressed public key.
    bool IsCompressed() const { return size() == COMPRESSED_SIZE; }

    /**
     * Verify a DER-serialized ECDSA signature (~72 bytes).
     * If this public key is not fully valid, the return value will be false.
     */
    bool VerifyECDSA(const uint256 &hash,
                     const std::vector<uint8_t> &vchSig) const;

    /**
     * Verify a Schnorr signature (=64 bytes).
     * If this public key is not fully valid, the return value will be false.
     */
    bool VerifySchnorr(const uint256 &hash,
                       const std::array<uint8_t, SCHNORR_SIZE> &sig) const;
    bool VerifySchnorr(const uint256 &hash,
                       const std::vector<uint8_t> &vchSig) const;

    /**
     * Check whether a DER-serialized ECDSA signature is normalized (lower-S).
     */
    static bool
    CheckLowS(const boost::sliced_range<const std::vector<uint8_t>> &vchSig);
    static bool CheckLowS(const std::vector<uint8_t> &vchSig) {
        return CheckLowS(vchSig | boost::adaptors::sliced(0, vchSig.size()));
    }

    //! Recover a public key from a compact ECDSA signature.
    bool RecoverCompact(const uint256 &hash,
                        const std::vector<uint8_t> &vchSig);

    //! Turn this public key into an uncompressed public key.
    bool Decompress();

    //! Derive BIP32 child pubkey.
    bool Derive(CPubKey &pubkeyChild, ChainCode &ccChild, unsigned int nChild,
                const ChainCode &cc) const;
};

struct CExtPubKey {
    uint8_t nDepth;
    uint8_t vchFingerprint[4];
    unsigned int nChild;
    ChainCode chaincode;
    CPubKey pubkey;

    friend bool operator==(const CExtPubKey &a, const CExtPubKey &b) {
        return a.nDepth == b.nDepth &&
               memcmp(a.vchFingerprint, b.vchFingerprint,
                      sizeof(vchFingerprint)) == 0 &&
               a.nChild == b.nChild && a.chaincode == b.chaincode &&
               a.pubkey == b.pubkey;
    }

    friend bool operator!=(const CExtPubKey &a, const CExtPubKey &b) {
        return !(a == b);
    }

    void Encode(uint8_t code[BIP32_EXTKEY_SIZE]) const;
    void Decode(const uint8_t code[BIP32_EXTKEY_SIZE]);
    bool Derive(CExtPubKey &out, unsigned int nChild) const;

    CExtPubKey() = default;
};

/**
 * Users of this module must hold an ECCVerifyHandle. The constructor and
 * destructor of these are not allowed to run in parallel, though.
 */
class ECCVerifyHandle {
    static int refcount;

public:
    ECCVerifyHandle();
    ~ECCVerifyHandle();
};

#endif // BITCOIN_PUBKEY_H
