// Copyright (c) 2017 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CRYPTO_CHACHA20_H
#define BITCOIN_CRYPTO_CHACHA20_H

#include <cstdint>
#include <cstdlib>

// classes for ChaCha20 256-bit stream cipher developed by Daniel J. Bernstein
// https://cr.yp.to/chacha/chacha-20080128.pdf */

/** ChaCha20 cipher that only operates on multiples of 64 bytes. */
class ChaCha20Aligned {
private:
    uint32_t input[16];

public:
    ChaCha20Aligned();

    /** Initialize a cipher with specified key (see SetKey for arguments). */
    ChaCha20Aligned(const uint8_t *key, size_t keylen);

    /** set key with flexible keylength (16 or 32 bytes; 32 recommended). */
    void SetKey(const uint8_t *key, size_t keylen);

    /** set the 64-bit nonce. */
    void SetIV(uint64_t iv);

    /** set the 64bit block counter (pos seeks to byte position 64*pos). */
    void Seek64(uint64_t pos);

    /** outputs the keystream of size <64*blocks> into <c> */
    void Keystream64(uint8_t *c, size_t blocks);

    /**
     * enciphers the message <input> of length <64*blocks> and write the
     * enciphered representation into <output>
     * Used for encryption and decryption (XOR)
     */
    void Crypt64(const uint8_t *input, uint8_t *output, size_t blocks);
};

/** Unrestricted ChaCha20 cipher. */
class ChaCha20 {
private:
    ChaCha20Aligned m_aligned;
    uint8_t m_buffer[64] = {0};
    unsigned m_bufleft{0};

public:
    ChaCha20() = default;

    /** Initialize a cipher with specified key (see SetKey for arguments). */
    ChaCha20(const uint8_t *key, size_t keylen) : m_aligned(key, keylen) {}

    /** set key with flexible keylength (16 or 32 bytes; 32 recommended). */
    void SetKey(const uint8_t *key, size_t keylen) {
        m_aligned.SetKey(key, keylen);
        m_bufleft = 0;
    }

    /** set the 64-bit nonce. */
    void SetIV(uint64_t iv) { m_aligned.SetIV(iv); }

    /** set the 64bit block counter (pos seeks to byte position 64*pos). */
    void Seek64(uint64_t pos) {
        m_aligned.Seek64(pos);
        m_bufleft = 0;
    }

    /** outputs the keystream of size <bytes> into <c> */
    void Keystream(uint8_t *c, size_t bytes);

    /**
     * enciphers the message <input> of length <bytes> and write the enciphered
     * representation into <output> Used for encryption and decryption (XOR)
     */
    void Crypt(const uint8_t *input, uint8_t *output, size_t bytes);
};

#endif // BITCOIN_CRYPTO_CHACHA20_H
