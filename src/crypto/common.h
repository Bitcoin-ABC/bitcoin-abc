// Copyright (c) 2014 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CRYPTO_COMMON_H
#define BITCOIN_CRYPTO_COMMON_H

#include <compat/endian.h>

#include <cstdint>
#include <cstring>

static inline uint16_t ReadLE16(const uint8_t *ptr) {
    uint16_t x;
    memcpy((char *)&x, ptr, 2);
    return le16toh_internal(x);
}

static inline uint32_t ReadLE32(const uint8_t *ptr) {
    uint32_t x;
    memcpy((char *)&x, ptr, 4);
    return le32toh_internal(x);
}

static inline uint64_t ReadLE64(const uint8_t *ptr) {
    uint64_t x;
    memcpy((char *)&x, ptr, 8);
    return le64toh_internal(x);
}

static inline void WriteLE16(uint8_t *ptr, uint16_t x) {
    uint16_t v = htole16_internal(x);
    memcpy(ptr, (char *)&v, 2);
}

static inline void WriteLE32(uint8_t *ptr, uint32_t x) {
    uint32_t v = htole32_internal(x);
    memcpy(ptr, (char *)&v, 4);
}

static inline void WriteLE64(uint8_t *ptr, uint64_t x) {
    uint64_t v = htole64_internal(x);
    memcpy(ptr, (char *)&v, 8);
}

uint16_t static inline ReadBE16(const uint8_t *ptr) {
    uint16_t x;
    memcpy((char *)&x, ptr, 2);
    return be16toh_internal(x);
}

static inline uint32_t ReadBE32(const uint8_t *ptr) {
    uint32_t x;
    memcpy((char *)&x, ptr, 4);
    return be32toh_internal(x);
}

static inline uint64_t ReadBE64(const uint8_t *ptr) {
    uint64_t x;
    memcpy((char *)&x, ptr, 8);
    return be64toh_internal(x);
}

static inline void WriteBE32(uint8_t *ptr, uint32_t x) {
    uint32_t v = htobe32_internal(x);
    memcpy(ptr, (char *)&v, 4);
}

static inline void WriteBE64(uint8_t *ptr, uint64_t x) {
    uint64_t v = htobe64_internal(x);
    memcpy(ptr, (char *)&v, 8);
}

#endif // BITCOIN_CRYPTO_COMMON_H
