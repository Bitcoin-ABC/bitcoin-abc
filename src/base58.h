// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2015 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Why base-58 instead of standard base-64 encoding?
 * - Don't want 0OIl characters that look the same in some fonts and
 *      could be used to create visually identical looking data.
 * - A string with non-alphanumeric characters is not as easily accepted as
 * input.
 * - E-mail usually won't line-break if there's no punctuation to break at.
 * - Double-clicking selects the whole string as one word if it's all
 * alphanumeric.
 */
#ifndef BITCOIN_BASE58_H
#define BITCOIN_BASE58_H

#include "chainparams.h"
#include "key.h"
#include "pubkey.h"
#include "script/script.h"
#include "script/standard.h"
#include "support/allocators/zeroafterfree.h"

#include <string>
#include <vector>

/**
 * Encode a byte sequence as a base58-encoded string.
 * pbegin and pend cannot be nullptr, unless both are.
 */
std::string EncodeBase58(const uint8_t *pbegin, const uint8_t *pend);

/**
 * Encode a byte vector as a base58-encoded string
 */
std::string EncodeBase58(const std::vector<uint8_t> &vch);

/**
 * Decode a base58-encoded string (psz) into a byte vector (vchRet).
 * return true if decoding is successful.
 * psz cannot be nullptr.
 */
bool DecodeBase58(const char *psz, std::vector<uint8_t> &vchRet);

/**
 * Decode a base58-encoded string (str) into a byte vector (vchRet).
 * return true if decoding is successful.
 */
bool DecodeBase58(const std::string &str, std::vector<uint8_t> &vchRet);

/**
 * Encode a byte vector into a base58-encoded string, including checksum
 */
std::string EncodeBase58Check(const std::vector<uint8_t> &vchIn);

/**
 * Decode a base58-encoded string (psz) that includes a checksum into a byte
 * vector (vchRet), return true if decoding is successful
 */
inline bool DecodeBase58Check(const char *psz, std::vector<uint8_t> &vchRet);

/**
 * Decode a base58-encoded string (str) that includes a checksum into a byte
 * vector (vchRet), return true if decoding is successful
 */
inline bool DecodeBase58Check(const std::string &str,
                              std::vector<uint8_t> &vchRet);

/**
 * Base class for all base58-encoded data
 */
class CBase58Data {
protected:
    //! the version byte(s)
    std::vector<uint8_t> vchVersion;

    //! the actually encoded data
    typedef std::vector<uint8_t, zero_after_free_allocator<uint8_t>>
        vector_uchar;
    vector_uchar vchData;

    CBase58Data();
    void SetData(const std::vector<uint8_t> &vchVersionIn, const void *pdata,
                 size_t nSize);
    void SetData(const std::vector<uint8_t> &vchVersionIn,
                 const uint8_t *pbegin, const uint8_t *pend);

public:
    bool SetString(const char *psz, unsigned int nVersionBytes = 1);
    bool SetString(const std::string &str);
    std::string ToString() const;
    int CompareTo(const CBase58Data &b58) const;

    bool operator==(const CBase58Data &b58) const {
        return CompareTo(b58) == 0;
    }
    bool operator<=(const CBase58Data &b58) const {
        return CompareTo(b58) <= 0;
    }
    bool operator>=(const CBase58Data &b58) const {
        return CompareTo(b58) >= 0;
    }
    bool operator<(const CBase58Data &b58) const { return CompareTo(b58) < 0; }
    bool operator>(const CBase58Data &b58) const { return CompareTo(b58) > 0; }
};

/**
 * A base58-encoded secret key
 */
class CBitcoinSecret : public CBase58Data {
public:
    void SetKey(const CKey &vchSecret);
    CKey GetKey();
    bool IsValid() const;
    bool SetString(const char *pszSecret);
    bool SetString(const std::string &strSecret);

    CBitcoinSecret(const CKey &vchSecret) { SetKey(vchSecret); }
    CBitcoinSecret() {}
};

template <typename K, int Size, CChainParams::Base58Type Type>
class CBitcoinExtKeyBase : public CBase58Data {
public:
    void SetKey(const K &key) {
        uint8_t vch[Size];
        key.Encode(vch);
        SetData(Params().Base58Prefix(Type), vch, vch + Size);
    }

    K GetKey() {
        K ret;
        if (vchData.size() == Size) {
            // If base58 encoded data does not hold an ext key, return a
            // !IsValid() key
            ret.Decode(&vchData[0]);
        }
        return ret;
    }

    CBitcoinExtKeyBase(const K &key) { SetKey(key); }

    CBitcoinExtKeyBase(const std::string &strBase58c) {
        SetString(strBase58c.c_str(), Params().Base58Prefix(Type).size());
    }

    CBitcoinExtKeyBase() {}
};

typedef CBitcoinExtKeyBase<CExtKey, BIP32_EXTKEY_SIZE,
                           CChainParams::EXT_SECRET_KEY>
    CBitcoinExtKey;
typedef CBitcoinExtKeyBase<CExtPubKey, BIP32_EXTKEY_SIZE,
                           CChainParams::EXT_PUBLIC_KEY>
    CBitcoinExtPubKey;

std::string EncodeDestination(const CTxDestination &dest);
CTxDestination DecodeDestination(const std::string &str);
bool IsValidDestinationString(const std::string &str);
bool IsValidDestinationString(const std::string &str,
                              const CChainParams &params);

#endif // BITCOIN_BASE58_H
