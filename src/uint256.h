// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_UINT256_H
#define BITCOIN_UINT256_H

#include <span.h>

#include <cassert>
#include <cstdint>
#include <cstring>
#include <string>
#include <vector>

/** Template base class for fixed-sized opaque blobs. */
template <unsigned int BITS> class base_blob {
protected:
    static constexpr int WIDTH = BITS / 8;
    uint8_t m_data[WIDTH];

public:
    /* construct 0 value by default */
    constexpr base_blob() : m_data() {}

    /* constructor for constants between 1 and 255 */
    constexpr explicit base_blob(uint8_t v) : m_data{v} {}

    explicit base_blob(const std::vector<uint8_t> &vch);

    bool IsNull() const {
        for (int i = 0; i < WIDTH; i++) {
            if (m_data[i] != 0) {
                return false;
            }
        }
        return true;
    }

    void SetNull() { memset(m_data, 0, sizeof(m_data)); }

    inline int Compare(const base_blob &other) const {
        for (size_t i = 0; i < sizeof(m_data); i++) {
            uint8_t a = m_data[sizeof(m_data) - 1 - i];
            uint8_t b = other.m_data[sizeof(m_data) - 1 - i];
            if (a > b) {
                return 1;
            }
            if (a < b) {
                return -1;
            }
        }

        return 0;
    }

    friend inline bool operator==(const base_blob &a, const base_blob &b) {
        return a.Compare(b) == 0;
    }
    friend inline bool operator!=(const base_blob &a, const base_blob &b) {
        return a.Compare(b) != 0;
    }
    friend inline bool operator<(const base_blob &a, const base_blob &b) {
        return a.Compare(b) < 0;
    }
    friend inline bool operator<=(const base_blob &a, const base_blob &b) {
        return a.Compare(b) <= 0;
    }
    friend inline bool operator>(const base_blob &a, const base_blob &b) {
        return a.Compare(b) > 0;
    }
    friend inline bool operator>=(const base_blob &a, const base_blob &b) {
        return a.Compare(b) >= 0;
    }

    std::string GetHex() const;
    void SetHex(const char *psz);
    void SetHex(const std::string &str);
    std::string ToString() const { return GetHex(); }

    const uint8_t *data() const { return m_data; }
    uint8_t *data() { return m_data; }

    uint8_t *begin() { return &m_data[0]; }

    uint8_t *end() { return &m_data[WIDTH]; }

    const uint8_t *begin() const { return &m_data[0]; }

    const uint8_t *end() const { return &m_data[WIDTH]; }

    unsigned int size() const { return sizeof(m_data); }

    uint64_t GetUint64(int pos) const {
        const uint8_t *ptr = m_data + pos * 8;
        return uint64_t(ptr[0]) | (uint64_t(ptr[1]) << 8) |
               (uint64_t(ptr[2]) << 16) | (uint64_t(ptr[3]) << 24) |
               (uint64_t(ptr[4]) << 32) | (uint64_t(ptr[5]) << 40) |
               (uint64_t(ptr[6]) << 48) | (uint64_t(ptr[7]) << 56);
    }

    template <typename Stream> void Serialize(Stream &s) const {
        s.write(MakeByteSpan(m_data));
    }

    template <typename Stream> void Unserialize(Stream &s) {
        s.read(MakeWritableByteSpan(m_data));
    }
};

/**
 * 160-bit opaque blob.
 * @note This type is called uint160 for historical reasons only. It is an
 * opaque blob of 160 bits and has no integer operations.
 */
class uint160 : public base_blob<160> {
public:
    constexpr uint160() {}
    explicit uint160(const std::vector<uint8_t> &vch) : base_blob<160>(vch) {}
};

/**
 * 256-bit opaque blob.
 * @note This type is called uint256 for historical reasons only. It is an
 * opaque blob of 256 bits and has no integer operations. Use arith_uint256 if
 * those are required.
 */
class uint256 : public base_blob<256> {
public:
    constexpr uint256() {}
    constexpr explicit uint256(uint8_t v) : base_blob<256>(v) {}
    explicit uint256(const std::vector<uint8_t> &vch) : base_blob<256>(vch) {}
    static const uint256 ZERO;
    static const uint256 ONE;
};

/**
 * uint256 from const char *.
 * This is a separate function because the constructor uint256(const char*) can
 * result in dangerously catching uint256(0).
 */
inline uint256 uint256S(const char *str) {
    uint256 rv;
    rv.SetHex(str);
    return rv;
}

/**
 * uint256 from std::string.
 * This is a separate function because the constructor uint256(const std::string
 * &str) can result in dangerously catching uint256(0) via std::string(const
 * char*).
 */
inline uint256 uint256S(const std::string &str) {
    uint256 rv;
    rv.SetHex(str);
    return rv;
}

inline uint160 uint160S(const char *str) {
    uint160 rv;
    rv.SetHex(str);
    return rv;
}
inline uint160 uint160S(const std::string &str) {
    uint160 rv;
    rv.SetHex(str);
    return rv;
}

#endif // BITCOIN_UINT256_H
