// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <uint256.h>

#include <util/strencodings.h>

#include <cstdio>
#include <cstring>

template <unsigned int BITS>
base_blob<BITS>::base_blob(const std::vector<uint8_t> &vch) {
    assert(vch.size() == sizeof(data));
    memcpy(data, vch.data(), sizeof(data));
}

template <unsigned int BITS> std::string base_blob<BITS>::GetHex() const {
    return HexStr(std::reverse_iterator<const uint8_t *>(data + sizeof(data)),
                  std::reverse_iterator<const uint8_t *>(data));
}

template <unsigned int BITS> void base_blob<BITS>::SetHex(const char *psz) {
    memset(data, 0, sizeof(data));

    // skip leading spaces
    while (IsSpace(*psz)) {
        psz++;
    }

    // skip 0x
    if (psz[0] == '0' && tolower(psz[1]) == 'x') {
        psz += 2;
    }

    // hex string to uint
    const char *pbegin = psz;
    while (::HexDigit(*psz) != -1) {
        psz++;
    }

    psz--;
    uint8_t *p1 = (uint8_t *)data;
    uint8_t *pend = p1 + WIDTH;
    while (psz >= pbegin && p1 < pend) {
        *p1 = ::HexDigit(*psz--);
        if (psz >= pbegin) {
            *p1 |= uint8_t(::HexDigit(*psz--) << 4);
            p1++;
        }
    }
}

template <unsigned int BITS>
void base_blob<BITS>::SetHex(const std::string &str) {
    SetHex(str.c_str());
}

// Explicit instantiations for base_blob<160>
template base_blob<160>::base_blob(const std::vector<uint8_t> &);
template std::string base_blob<160>::GetHex() const;
template std::string base_blob<160>::ToString() const;
template void base_blob<160>::SetHex(const char *);
template void base_blob<160>::SetHex(const std::string &);

// Explicit instantiations for base_blob<256>
template base_blob<256>::base_blob(const std::vector<uint8_t> &);
template std::string base_blob<256>::GetHex() const;
template std::string base_blob<256>::ToString() const;
template void base_blob<256>::SetHex(const char *);
template void base_blob<256>::SetHex(const std::string &);
