// Copyright (c) 2014 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <crypto/hmac_sha256.h>

#include <cstring>

CHMAC_SHA256::CHMAC_SHA256(const uint8_t *key, size_t keylen) {
    uint8_t rkey[64];
    if (keylen <= 64) {
        memcpy(rkey, key, keylen);
        memset(rkey + keylen, 0, 64 - keylen);
    } else {
        CSHA256().Write(key, keylen).Finalize(rkey);
        memset(rkey + 32, 0, 32);
    }

    for (int n = 0; n < 64; n++) {
        rkey[n] ^= 0x5c;
    }
    outer.Write(rkey, 64);

    for (int n = 0; n < 64; n++) {
        rkey[n] ^= 0x5c ^ 0x36;
    }
    inner.Write(rkey, 64);
}

void CHMAC_SHA256::Finalize(uint8_t hash[OUTPUT_SIZE]) {
    uint8_t temp[32];
    inner.Finalize(temp);
    outer.Write(temp, 32).Finalize(hash);
}
