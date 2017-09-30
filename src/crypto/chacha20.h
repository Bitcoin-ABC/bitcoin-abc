// Copyright (c) 2017 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CRYPTO_CHACHA20_H
#define BITCOIN_CRYPTO_CHACHA20_H

#include <cstdint>
#include <cstdlib>

/** A PRNG class for ChaCha20. */
class ChaCha20 {
private:
    uint32_t input[16];

public:
    ChaCha20();
    ChaCha20(const uint8_t *key, size_t keylen);
    void SetKey(const uint8_t *key, size_t keylen);
    void SetIV(uint64_t iv);
    void Seek(uint64_t pos);
    void Output(uint8_t *output, size_t bytes);
};

#endif // BITCOIN_CRYPTO_CHACHA20_H
