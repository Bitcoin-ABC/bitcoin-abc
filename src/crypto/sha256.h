// Copyright (c) 2014-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CRYPTO_SHA256_H
#define BITCOIN_CRYPTO_SHA256_H

#include <cstdint>
#include <cstdlib>
#include <string>

/** A hasher class for SHA-256. */
class CSHA256 {
private:
    uint32_t s[8];
    uint8_t buf[64];
    uint64_t bytes;

public:
    static const size_t OUTPUT_SIZE = 32;

    CSHA256();
    CSHA256 &Write(const uint8_t *data, size_t len);
    void Finalize(uint8_t hash[OUTPUT_SIZE]);
    CSHA256 &Reset();
};

/**
 * Autodetect the best available SHA256 implementation.
 * Returns the name of the implementation.
 */
std::string SHA256AutoDetect();

/**
 * Compute multiple double-SHA256's of 64-byte blobs.
 * output:  pointer to a blocks*32 byte output buffer
 * input:   pointer to a blocks*64 byte input buffer
 * blocks:  the number of hashes to compute.
 */
void SHA256D64(uint8_t *output, const uint8_t *input, size_t blocks);

#endif // BITCOIN_CRYPTO_SHA256_H
