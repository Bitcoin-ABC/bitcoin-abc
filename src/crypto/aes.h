// Copyright (c) 2015-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
//
// C++ wrapper around ctaes, a constant-time AES implementation

#ifndef BITCOIN_CRYPTO_AES_H
#define BITCOIN_CRYPTO_AES_H

extern "C" {
#include <crypto/ctaes/ctaes.h>
}

static const int AES_BLOCKSIZE = 16;
static const int AES128_KEYSIZE = 16;
static const int AES256_KEYSIZE = 32;

/** An encryption class for AES-128. */
class AES128Encrypt {
private:
    AES128_ctx ctx;

public:
    explicit AES128Encrypt(const uint8_t key[16]);
    ~AES128Encrypt();
    void Encrypt(uint8_t ciphertext[16], const uint8_t plaintext[16]) const;
};

/** A decryption class for AES-128. */
class AES128Decrypt {
private:
    AES128_ctx ctx;

public:
    explicit AES128Decrypt(const uint8_t key[16]);
    ~AES128Decrypt();
    void Decrypt(uint8_t plaintext[16], const uint8_t ciphertext[16]) const;
};

/** An encryption class for AES-256. */
class AES256Encrypt {
private:
    AES256_ctx ctx;

public:
    explicit AES256Encrypt(const uint8_t key[32]);
    ~AES256Encrypt();
    void Encrypt(uint8_t ciphertext[16], const uint8_t plaintext[16]) const;
};

/** A decryption class for AES-256. */
class AES256Decrypt {
private:
    AES256_ctx ctx;

public:
    explicit AES256Decrypt(const uint8_t key[32]);
    ~AES256Decrypt();
    void Decrypt(uint8_t plaintext[16], const uint8_t ciphertext[16]) const;
};

class AES256CBCEncrypt {
public:
    explicit AES256CBCEncrypt(const uint8_t key[AES256_KEYSIZE],
                              const uint8_t ivIn[AES_BLOCKSIZE], bool padIn);
    ~AES256CBCEncrypt();
    int Encrypt(const uint8_t *data, int size, uint8_t *out) const;

private:
    const AES256Encrypt enc;
    const bool pad;
    uint8_t iv[AES_BLOCKSIZE];
};

class AES256CBCDecrypt {
public:
    explicit AES256CBCDecrypt(const uint8_t key[AES256_KEYSIZE],
                              const uint8_t ivIn[AES_BLOCKSIZE], bool padIn);
    ~AES256CBCDecrypt();
    int Decrypt(const uint8_t *data, int size, uint8_t *out) const;

private:
    const AES256Decrypt dec;
    const bool pad;
    uint8_t iv[AES_BLOCKSIZE];
};

class AES128CBCEncrypt {
public:
    explicit AES128CBCEncrypt(const uint8_t key[AES128_KEYSIZE],
                              const uint8_t ivIn[AES_BLOCKSIZE], bool padIn);
    ~AES128CBCEncrypt();
    int Encrypt(const uint8_t *data, int size, uint8_t *out) const;

private:
    const AES128Encrypt enc;
    const bool pad;
    uint8_t iv[AES_BLOCKSIZE];
};

class AES128CBCDecrypt {
public:
    explicit AES128CBCDecrypt(const uint8_t key[AES128_KEYSIZE],
                              const uint8_t ivIn[AES_BLOCKSIZE], bool padIn);
    ~AES128CBCDecrypt();
    int Decrypt(const uint8_t *data, int size, uint8_t *out) const;

private:
    const AES128Decrypt dec;
    const bool pad;
    uint8_t iv[AES_BLOCKSIZE];
};

#endif // BITCOIN_CRYPTO_AES_H
