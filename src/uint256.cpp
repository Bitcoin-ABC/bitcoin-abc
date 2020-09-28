// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <uint256.h>

#include <util/strencodings.h>

template <unsigned int BITS>
base_blob<BITS>::base_blob(const std::vector<uint8_t> &vch) {
    assert(vch.size() == sizeof(m_data));
    memcpy(m_data, vch.data(), sizeof(m_data));
}

template <unsigned int BITS> std::string base_blob<BITS>::GetHex() const {
    uint8_t m_data_rev[WIDTH];
    for (int i = 0; i < WIDTH; ++i) {
        m_data_rev[i] = m_data[WIDTH - 1 - i];
    }
    return HexStr(m_data_rev);
}

template <unsigned int BITS> void base_blob<BITS>::SetHex(const char *psz) {
    memset(m_data, 0, sizeof(m_data));

    // skip leading spaces
    while (IsSpace(*psz)) {
        psz++;
    }

    // skip 0x
    if (psz[0] == '0' && ToLower(psz[1]) == 'x') {
        psz += 2;
    }

    // hex string to uint
    size_t digits = 0;
    while (::HexDigit(psz[digits]) != -1) {
        digits++;
    }

    uint8_t *p1 = (uint8_t *)m_data;
    uint8_t *pend = p1 + WIDTH;
    while (digits > 0 && p1 < pend) {
        *p1 = ::HexDigit(psz[--digits]);
        if (digits > 0) {
            *p1 |= uint8_t(::HexDigit(psz[--digits])) << 4;
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

const uint256 uint256::ONE(1);
