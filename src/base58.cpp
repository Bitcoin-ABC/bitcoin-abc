// Copyright (c) 2014-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "base58.h"

#include "hash.h"
#include "script/script.h"
#include "uint256.h"

#include <boost/variant/apply_visitor.hpp>
#include <boost/variant/static_visitor.hpp>
#include <cassert>
#include <cstdint>
#include <cstring>
#include <string>
#include <vector>

/** All alphanumeric characters except for "0", "I", "O", and "l" */
static const char *pszBase58 =
    "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

bool DecodeBase58(const char *psz, std::vector<uint8_t> &vch) {
    // Skip leading spaces.
    while (*psz && isspace(*psz)) {
        psz++;
    }
    // Skip and count leading '1's.
    int zeroes = 0;
    int length = 0;
    while (*psz == '1') {
        zeroes++;
        psz++;
    }
    // Allocate enough space in big-endian base256 representation.
    // log(58) / log(256), rounded up.
    int size = strlen(psz) * 733 / 1000 + 1;
    std::vector<uint8_t> b256(size);
    // Process the characters.
    while (*psz && !isspace(*psz)) {
        // Decode base58 character
        const char *ch = strchr(pszBase58, *psz);
        if (ch == nullptr) {
            return false;
        }
        // Apply "b256 = b256 * 58 + ch".
        int carry = ch - pszBase58;
        int i = 0;
        for (std::vector<uint8_t>::reverse_iterator it = b256.rbegin();
             (carry != 0 || i < length) && (it != b256.rend()); ++it, ++i) {
            carry += 58 * (*it);
            *it = carry % 256;
            carry /= 256;
        }
        assert(carry == 0);
        length = i;
        psz++;
    }
    // Skip trailing spaces.
    while (isspace(*psz)) {
        psz++;
    }
    if (*psz != 0) {
        return false;
    }
    // Skip leading zeroes in b256.
    std::vector<uint8_t>::iterator it = b256.begin() + (size - length);
    while (it != b256.end() && *it == 0)
        it++;
    // Copy result into output vector.
    vch.reserve(zeroes + (b256.end() - it));
    vch.assign(zeroes, 0x00);
    while (it != b256.end()) {
        vch.push_back(*(it++));
    }
    return true;
}

std::string EncodeBase58(const uint8_t *pbegin, const uint8_t *pend) {
    // Skip & count leading zeroes.
    int zeroes = 0;
    int length = 0;
    while (pbegin != pend && *pbegin == 0) {
        pbegin++;
        zeroes++;
    }
    // Allocate enough space in big-endian base58 representation.
    // log(256) / log(58), rounded up.
    int size = (pend - pbegin) * 138 / 100 + 1;
    std::vector<uint8_t> b58(size);
    // Process the bytes.
    while (pbegin != pend) {
        int carry = *pbegin;
        int i = 0;
        // Apply "b58 = b58 * 256 + ch".
        for (std::vector<uint8_t>::reverse_iterator it = b58.rbegin();
             (carry != 0 || i < length) && (it != b58.rend()); it++, i++) {
            carry += 256 * (*it);
            *it = carry % 58;
            carry /= 58;
        }

        assert(carry == 0);
        length = i;
        pbegin++;
    }
    // Skip leading zeroes in base58 result.
    std::vector<uint8_t>::iterator it = b58.begin() + (size - length);
    while (it != b58.end() && *it == 0) {
        it++;
    }
    // Translate the result into a string.
    std::string str;
    str.reserve(zeroes + (b58.end() - it));
    str.assign(zeroes, '1');
    while (it != b58.end()) {
        str += pszBase58[*(it++)];
    }
    return str;
}

std::string EncodeBase58(const std::vector<uint8_t> &vch) {
    return EncodeBase58(&vch[0], &vch[0] + vch.size());
}

bool DecodeBase58(const std::string &str, std::vector<uint8_t> &vchRet) {
    return DecodeBase58(str.c_str(), vchRet);
}

std::string EncodeBase58Check(const std::vector<uint8_t> &vchIn) {
    // add 4-byte hash check to the end
    std::vector<uint8_t> vch(vchIn);
    uint256 hash = Hash(vch.begin(), vch.end());
    vch.insert(vch.end(), (uint8_t *)&hash, (uint8_t *)&hash + 4);
    return EncodeBase58(vch);
}

bool DecodeBase58Check(const char *psz, std::vector<uint8_t> &vchRet) {
    if (!DecodeBase58(psz, vchRet) || (vchRet.size() < 4)) {
        vchRet.clear();
        return false;
    }
    // re-calculate the checksum, insure it matches the included 4-byte checksum
    uint256 hash = Hash(vchRet.begin(), vchRet.end() - 4);
    if (memcmp(&hash, &vchRet.end()[-4], 4) != 0) {
        vchRet.clear();
        return false;
    }
    vchRet.resize(vchRet.size() - 4);
    return true;
}

bool DecodeBase58Check(const std::string &str, std::vector<uint8_t> &vchRet) {
    return DecodeBase58Check(str.c_str(), vchRet);
}

CBase58Data::CBase58Data() {
    vchVersion.clear();
    vchData.clear();
}

void CBase58Data::SetData(const std::vector<uint8_t> &vchVersionIn,
                          const void *pdata, size_t nSize) {
    vchVersion = vchVersionIn;
    vchData.resize(nSize);
    if (!vchData.empty()) {
        memcpy(&vchData[0], pdata, nSize);
    }
}

void CBase58Data::SetData(const std::vector<uint8_t> &vchVersionIn,
                          const uint8_t *pbegin, const uint8_t *pend) {
    SetData(vchVersionIn, (void *)pbegin, pend - pbegin);
}

bool CBase58Data::SetString(const char *psz, unsigned int nVersionBytes) {
    std::vector<uint8_t> vchTemp;
    bool rc58 = DecodeBase58Check(psz, vchTemp);
    if ((!rc58) || (vchTemp.size() < nVersionBytes)) {
        vchData.clear();
        vchVersion.clear();
        return false;
    }
    vchVersion.assign(vchTemp.begin(), vchTemp.begin() + nVersionBytes);
    vchData.resize(vchTemp.size() - nVersionBytes);
    if (!vchData.empty()) {
        memcpy(&vchData[0], &vchTemp[nVersionBytes], vchData.size());
    }
    memory_cleanse(&vchTemp[0], vchTemp.size());
    return true;
}

bool CBase58Data::SetString(const std::string &str) {
    return SetString(str.c_str());
}

std::string CBase58Data::ToString() const {
    std::vector<uint8_t> vch = vchVersion;
    vch.insert(vch.end(), vchData.begin(), vchData.end());
    return EncodeBase58Check(vch);
}

int CBase58Data::CompareTo(const CBase58Data &b58) const {
    if (vchVersion < b58.vchVersion) return -1;
    if (vchVersion > b58.vchVersion) return 1;
    if (vchData < b58.vchData) return -1;
    if (vchData > b58.vchData) return 1;
    return 0;
}

namespace {
class DestinationEncoder : public boost::static_visitor<std::string> {
private:
    const CChainParams &m_params;

public:
    explicit DestinationEncoder(const CChainParams &params)
        : m_params(params) {}

    std::string operator()(const CKeyID &id) const {
        std::vector<uint8_t> data =
            m_params.Base58Prefix(CChainParams::PUBKEY_ADDRESS);
        data.insert(data.end(), id.begin(), id.end());
        return EncodeBase58Check(data);
    }

    std::string operator()(const CScriptID &id) const {
        std::vector<uint8_t> data =
            m_params.Base58Prefix(CChainParams::SCRIPT_ADDRESS);
        data.insert(data.end(), id.begin(), id.end());
        return EncodeBase58Check(data);
    }

    std::string operator()(const CNoDestination &no) const { return ""; }
};

CTxDestination DecodeDestination(const std::string &str,
                                 const CChainParams &params) {
    std::vector<uint8_t> data;
    uint160 hash;
    if (!DecodeBase58Check(str, data)) {
        return CNoDestination();
    }
    // Base58Check decoding
    const std::vector<uint8_t> &pubkey_prefix =
        params.Base58Prefix(CChainParams::PUBKEY_ADDRESS);
    if (data.size() == 20 + pubkey_prefix.size() &&
        std::equal(pubkey_prefix.begin(), pubkey_prefix.end(), data.begin())) {
        memcpy(hash.begin(), &data[pubkey_prefix.size()], 20);
        return CKeyID(hash);
    }
    const std::vector<uint8_t> &script_prefix =
        params.Base58Prefix(CChainParams::SCRIPT_ADDRESS);
    if (data.size() == 20 + script_prefix.size() &&
        std::equal(script_prefix.begin(), script_prefix.end(), data.begin())) {
        memcpy(hash.begin(), &data[script_prefix.size()], 20);
        return CScriptID(hash);
    }
    return CNoDestination();
}
} // namespace

void CBitcoinSecret::SetKey(const CKey &vchSecret) {
    assert(vchSecret.IsValid());
    SetData(Params().Base58Prefix(CChainParams::SECRET_KEY), vchSecret.begin(),
            vchSecret.size());
    if (vchSecret.IsCompressed()) vchData.push_back(1);
}

CKey CBitcoinSecret::GetKey() {
    CKey ret;
    assert(vchData.size() >= 32);
    ret.Set(vchData.begin(), vchData.begin() + 32,
            vchData.size() > 32 && vchData[32] == 1);
    return ret;
}

bool CBitcoinSecret::IsValid() const {
    bool fExpectedFormat =
        vchData.size() == 32 || (vchData.size() == 33 && vchData[32] == 1);
    bool fCorrectVersion =
        vchVersion == Params().Base58Prefix(CChainParams::SECRET_KEY);
    return fExpectedFormat && fCorrectVersion;
}

bool CBitcoinSecret::SetString(const char *pszSecret) {
    return CBase58Data::SetString(pszSecret) && IsValid();
}

bool CBitcoinSecret::SetString(const std::string &strSecret) {
    return SetString(strSecret.c_str());
}

std::string EncodeLegacyAddr(const CTxDestination &dest,
                             const CChainParams &params) {
    return boost::apply_visitor(DestinationEncoder(params), dest);
}

CTxDestination DecodeLegacyAddr(const std::string &str,
                                const CChainParams &params) {
    return DecodeDestination(str, params);
}
