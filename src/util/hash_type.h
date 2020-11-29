// Copyright (c) 2020-2021 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_UTIL_HASH_TYPE_H
#define BITCOIN_UTIL_HASH_TYPE_H

template <typename HashType> class BaseHash {
protected:
    HashType m_hash;

public:
    BaseHash() : m_hash() {}
    explicit BaseHash(const HashType &in) : m_hash(in) {}

    uint8_t *begin() { return m_hash.begin(); }

    const uint8_t *begin() const { return m_hash.begin(); }

    uint8_t *end() { return m_hash.end(); }

    const uint8_t *end() const { return m_hash.end(); }

    operator std::vector<uint8_t>() const {
        return std::vector<uint8_t>{m_hash.begin(), m_hash.end()};
    }

    std::string ToString() const { return m_hash.ToString(); }

    bool operator==(const BaseHash<HashType> &other) const noexcept {
        return m_hash == other.m_hash;
    }

    bool operator!=(const BaseHash<HashType> &other) const noexcept {
        return !(m_hash == other.m_hash);
    }

    bool operator<(const BaseHash<HashType> &other) const noexcept {
        return m_hash < other.m_hash;
    }

    size_t size() const { return m_hash.size(); }

    uint8_t *data() { return m_hash.data(); }
    const uint8_t *data() const { return m_hash.data(); }
};

#endif // BITCOIN_UTIL_HASH_TYPE_H
