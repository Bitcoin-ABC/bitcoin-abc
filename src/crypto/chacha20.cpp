// Copyright (c) 2017 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Based on the public domain implementation 'merged' by D. J. Bernstein
// See https://cr.yp.to/chacha.html.

#include <crypto/chacha20.h>
#include <crypto/common.h>

#include <cstring>

constexpr static inline uint32_t rotl32(uint32_t v, int c) {
    return (v << c) | (v >> (32 - c));
}

#define QUARTERROUND(a, b, c, d)                                               \
    a += b;                                                                    \
    d = rotl32(d ^ a, 16);                                                     \
    c += d;                                                                    \
    b = rotl32(b ^ c, 12);                                                     \
    a += b;                                                                    \
    d = rotl32(d ^ a, 8);                                                      \
    c += d;                                                                    \
    b = rotl32(b ^ c, 7);

static const uint8_t sigma[] = "expand 32-byte k";
static const uint8_t tau[] = "expand 16-byte k";

void ChaCha20::SetKey(const uint8_t *k, size_t keylen) {
    const uint8_t *constants;

    input[4] = ReadLE32(k + 0);
    input[5] = ReadLE32(k + 4);
    input[6] = ReadLE32(k + 8);
    input[7] = ReadLE32(k + 12);
    if (keylen == 32) {
        // recommended
        k += 16;
        constants = sigma;
    } else {
        // keylen == 16
        constants = tau;
    }
    input[8] = ReadLE32(k + 0);
    input[9] = ReadLE32(k + 4);
    input[10] = ReadLE32(k + 8);
    input[11] = ReadLE32(k + 12);
    input[0] = ReadLE32(constants + 0);
    input[1] = ReadLE32(constants + 4);
    input[2] = ReadLE32(constants + 8);
    input[3] = ReadLE32(constants + 12);
    input[12] = 0;
    input[13] = 0;
    input[14] = 0;
    input[15] = 0;
}

ChaCha20::ChaCha20() {
    memset(input, 0, sizeof(input));
}

ChaCha20::ChaCha20(const uint8_t *k, size_t keylen) {
    SetKey(k, keylen);
}

void ChaCha20::SetIV(uint64_t iv) {
    input[14] = iv;
    input[15] = iv >> 32;
}

void ChaCha20::Seek(uint64_t pos) {
    input[12] = pos;
    input[13] = pos >> 32;
}

void ChaCha20::Output(uint8_t *c, size_t bytes) {
    uint32_t x0, x1, x2, x3, x4, x5, x6, x7, x8, x9, x10, x11, x12, x13, x14,
        x15;
    uint32_t j0, j1, j2, j3, j4, j5, j6, j7, j8, j9, j10, j11, j12, j13, j14,
        j15;
    uint8_t *ctarget = nullptr;
    uint8_t tmp[64];
    unsigned int i;

    if (!bytes) {
        return;
    }

    j0 = input[0];
    j1 = input[1];
    j2 = input[2];
    j3 = input[3];
    j4 = input[4];
    j5 = input[5];
    j6 = input[6];
    j7 = input[7];
    j8 = input[8];
    j9 = input[9];
    j10 = input[10];
    j11 = input[11];
    j12 = input[12];
    j13 = input[13];
    j14 = input[14];
    j15 = input[15];

    for (;;) {
        if (bytes < 64) {
            ctarget = c;
            c = tmp;
        }
        x0 = j0;
        x1 = j1;
        x2 = j2;
        x3 = j3;
        x4 = j4;
        x5 = j5;
        x6 = j6;
        x7 = j7;
        x8 = j8;
        x9 = j9;
        x10 = j10;
        x11 = j11;
        x12 = j12;
        x13 = j13;
        x14 = j14;
        x15 = j15;
        for (i = 20; i > 0; i -= 2) {
            QUARTERROUND(x0, x4, x8, x12)
            QUARTERROUND(x1, x5, x9, x13)
            QUARTERROUND(x2, x6, x10, x14)
            QUARTERROUND(x3, x7, x11, x15)
            QUARTERROUND(x0, x5, x10, x15)
            QUARTERROUND(x1, x6, x11, x12)
            QUARTERROUND(x2, x7, x8, x13)
            QUARTERROUND(x3, x4, x9, x14)
        }
        x0 += j0;
        x1 += j1;
        x2 += j2;
        x3 += j3;
        x4 += j4;
        x5 += j5;
        x6 += j6;
        x7 += j7;
        x8 += j8;
        x9 += j9;
        x10 += j10;
        x11 += j11;
        x12 += j12;
        x13 += j13;
        x14 += j14;
        x15 += j15;

        ++j12;
        if (!j12) {
            ++j13;
        }

        WriteLE32(c + 0, x0);
        WriteLE32(c + 4, x1);
        WriteLE32(c + 8, x2);
        WriteLE32(c + 12, x3);
        WriteLE32(c + 16, x4);
        WriteLE32(c + 20, x5);
        WriteLE32(c + 24, x6);
        WriteLE32(c + 28, x7);
        WriteLE32(c + 32, x8);
        WriteLE32(c + 36, x9);
        WriteLE32(c + 40, x10);
        WriteLE32(c + 44, x11);
        WriteLE32(c + 48, x12);
        WriteLE32(c + 52, x13);
        WriteLE32(c + 56, x14);
        WriteLE32(c + 60, x15);

        if (bytes <= 64) {
            if (bytes < 64) {
                for (i = 0; i < bytes; ++i) {
                    ctarget[i] = c[i];
                }
            }
            input[12] = j12;
            input[13] = j13;
            return;
        }
        bytes -= 64;
        c += 64;
    }
}
