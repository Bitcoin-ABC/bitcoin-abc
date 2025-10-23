// Copyright (c) 2017 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CRYPTO_CHACHA20_H
#define BITCOIN_CRYPTO_CHACHA20_H

#include <cstdint>
#include <cstdlib>
#include <utility>

// classes for ChaCha20 256-bit stream cipher developed by Daniel J. Bernstein
// https://cr.yp.to/chacha/chacha-20080128.pdf.
//
// The 128-bit input is here implemented as a 96-bit nonce and a 32-bit block
// counter, as in RFC8439 Section 2.3. When the 32-bit block counter overflows
// the first 32-bit part of the nonce is automatically incremented, making it
// conceptually compatible with variants that use a 64/64 split instead.

/** ChaCha20 cipher that only operates on multiples of 64 bytes. */
class ChaCha20Aligned {
private:
    uint32_t input[12];

public:
    ChaCha20Aligned();

    /** Initialize a cipher with specified 32-byte key. */
    ChaCha20Aligned(const uint8_t *key32);

    /** set 32-byte key. */
    void SetKey32(const uint8_t *key32);

    /**
     * Type for 96-bit nonces used by the Set function below.
     *
     * The first field corresponds to the LE32-encoded first 4 bytes of the
     * nonce, also referred to as the '32-bit fixed-common part' in
     * Example 2.8.2 of RFC8439.
     *
     * The second field corresponds to the LE64-encoded last 8 bytes of the
     * nonce.
     *
     */
    using Nonce96 = std::pair<uint32_t, uint64_t>;

    /**
     * Set the 96-bit nonce and 32-bit block counter.
     *
     * Block_counter selects a position to seek to (to byte 64*block_counter).
     * After 256 GiB, the block counter overflows, and nonce.first is
     * incremented.
     */
    void Seek64(Nonce96 nonce, uint32_t block_counter);

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

    /** Initialize a cipher with specified 32-byte key. */
    ChaCha20(const uint8_t *key32) : m_aligned(key32) {}

    /** set 32-byte key. */
    void SetKey32(const uint8_t *key32) {
        m_aligned.SetKey32(key32);
        m_bufleft = 0;
    }

    /** 96-bit nonce type. */
    using Nonce96 = ChaCha20Aligned::Nonce96;

    /** Set the 96-bit nonce and 32-bit block counter. */
    void Seek64(Nonce96 nonce, uint32_t block_counter) {
        m_aligned.Seek64(nonce, block_counter);
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
