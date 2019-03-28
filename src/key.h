// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_KEY_H
#define BITCOIN_KEY_H

#include "pubkey.h"
#include "serialize.h"
#include "support/allocators/secure.h"
#include "uint256.h"

#include <stdexcept>
#include <vector>

/**
 * secp256k1:
 * const unsigned int PRIVATE_KEY_SIZE = 279;
 * const unsigned int PUBLIC_KEY_SIZE  = 65;
 * const unsigned int SIGNATURE_SIZE   = 72;
 *
 * see www.keylength.com
 * script supports up to 75 for single byte push
 */

/**
 * secure_allocator is defined in allocators.h
 * CPrivKey is a serialized private key, with all parameters included (279
 * bytes)
 */
typedef std::vector<uint8_t, secure_allocator<uint8_t>> CPrivKey;

/** An encapsulated secp256k1 private key. */
class CKey {
private:
    //! Whether this private key is valid. We check for correctness when
    //! modifying the key data, so fValid should always correspond to the actual
    //! state.
    bool fValid;

    //! Whether the public key corresponding to this private key is (to be)
    //! compressed.
    bool fCompressed;

    //! The actual byte data
    std::vector<uint8_t, secure_allocator<uint8_t>> keydata;

    //! Check whether the 32-byte array pointed to be vch is valid keydata.
    static bool Check(const uint8_t *vch);

public:
    //! Construct an invalid private key.
    CKey() : fValid(false), fCompressed(false) {
        // Important: vch must be 32 bytes in length to not break serialization
        keydata.resize(32);
    }

    //! Destructor (again necessary because of memlocking).
    ~CKey() {}

    friend bool operator==(const CKey &a, const CKey &b) {
        return a.fCompressed == b.fCompressed && a.size() == b.size() &&
               memcmp(a.keydata.data(), b.keydata.data(), a.size()) == 0;
    }

    //! Initialize using begin and end iterators to byte data.
    template <typename T>
    void Set(const T pbegin, const T pend, bool fCompressedIn) {
        if (size_t(pend - pbegin) != keydata.size()) {
            fValid = false;
        } else if (Check(&pbegin[0])) {
            memcpy(keydata.data(), (uint8_t *)&pbegin[0], keydata.size());
            fValid = true;
            fCompressed = fCompressedIn;
        } else {
            fValid = false;
        }
    }

    //! Simple read-only vector-like interface.
    unsigned int size() const { return (fValid ? keydata.size() : 0); }
    const uint8_t *begin() const { return keydata.data(); }
    const uint8_t *end() const { return keydata.data() + size(); }

    //! Check whether this private key is valid.
    bool IsValid() const { return fValid; }

    //! Check whether the public key corresponding to this private key is (to
    //! be) compressed.
    bool IsCompressed() const { return fCompressed; }

    //! Generate a new private key using a cryptographic PRNG.
    void MakeNewKey(bool fCompressed);

    /**
     * Convert the private key to a CPrivKey (serialized OpenSSL private key
     * data).
     * This is expensive.
     */
    CPrivKey GetPrivKey() const;

    /**
     * Compute the public key from a private key.
     * This is expensive.
     */
    CPubKey GetPubKey() const;

    /**
     * Create a DER-serialized ECDSA signature.
     * The test_case parameter tweaks the deterministic nonce.
     */
    bool SignECDSA(const uint256 &hash, std::vector<uint8_t> &vchSig,
                   uint32_t test_case = 0) const;

    /**
     * Create a Schnorr signature.
     * The test_case parameter tweaks the deterministic nonce.
     */
    bool SignSchnorr(const uint256 &hash, std::vector<uint8_t> &vchSig,
                     uint32_t test_case = 0) const;

    /**
     * Create a compact ECDSA signature (65 bytes), which allows reconstructing
     * the used public key.
     * The format is one header byte, followed by two times 32 bytes for the
     * serialized r and s values.
     * The header byte: 0x1B = first key with even y, 0x1C = first key with odd
     * y,
     *                  0x1D = second key with even y, 0x1E = second key with
     * odd y,
     *                  add 0x04 for compressed keys.
     */
    bool SignCompact(const uint256 &hash, std::vector<uint8_t> &vchSig) const;

    //! Derive BIP32 child key.
    bool Derive(CKey &keyChild, ChainCode &ccChild, unsigned int nChild,
                const ChainCode &cc) const;

    /**
     * Verify thoroughly whether a private key and a public key match.
     * This is done using a different mechanism than just regenerating it.
     * (An ECDSA signature is created then verified.)
     */
    bool VerifyPubKey(const CPubKey &vchPubKey) const;

    //! Load private key and check that public key matches.
    bool Load(CPrivKey &privkey, CPubKey &vchPubKey, bool fSkipCheck);
};

struct CExtKey {
    uint8_t nDepth;
    uint8_t vchFingerprint[4];
    unsigned int nChild;
    ChainCode chaincode;
    CKey key;

    friend bool operator==(const CExtKey &a, const CExtKey &b) {
        return a.nDepth == b.nDepth &&
               memcmp(&a.vchFingerprint[0], &b.vchFingerprint[0],
                      sizeof(vchFingerprint)) == 0 &&
               a.nChild == b.nChild && a.chaincode == b.chaincode &&
               a.key == b.key;
    }

    void Encode(uint8_t code[BIP32_EXTKEY_SIZE]) const;
    void Decode(const uint8_t code[BIP32_EXTKEY_SIZE]);
    bool Derive(CExtKey &out, unsigned int nChild) const;
    CExtPubKey Neuter() const;
    void SetMaster(const uint8_t *seed, unsigned int nSeedLen);
    template <typename Stream> void Serialize(Stream &s) const {
        unsigned int len = BIP32_EXTKEY_SIZE;
        ::WriteCompactSize(s, len);
        uint8_t code[BIP32_EXTKEY_SIZE];
        Encode(code);
        s.write((const char *)&code[0], len);
    }
    template <typename Stream> void Unserialize(Stream &s) {
        unsigned int len = ::ReadCompactSize(s);
        if (len != BIP32_EXTKEY_SIZE) {
            throw std::runtime_error("Invalid extended key size\n");
        }

        uint8_t code[BIP32_EXTKEY_SIZE];
        s.read((char *)&code[0], len);
        Decode(code);
    }
};

/**
 * Initialize the elliptic curve support. May not be called twice without
 * calling ECC_Stop first.
 */
void ECC_Start(void);

/**
 * Deinitialize the elliptic curve support. No-op if ECC_Start wasn't called
 * first.
 */
void ECC_Stop(void);

/** Check that required EC support is available at runtime. */
bool ECC_InitSanityCheck(void);

#endif // BITCOIN_KEY_H
