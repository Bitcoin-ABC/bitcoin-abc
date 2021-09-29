// Copyright (c) 2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CRYPTO_POLY1305_H
#define BITCOIN_CRYPTO_POLY1305_H

#include <cstdint>
#include <cstdlib>

#define POLY1305_KEYLEN 32
#define POLY1305_TAGLEN 16

void poly1305_auth(uint8_t out[POLY1305_TAGLEN], const uint8_t *m, size_t inlen,
                   const uint8_t key[POLY1305_KEYLEN]);

#endif // BITCOIN_CRYPTO_POLY1305_H
