// Copyright (c) 2017 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CRYPTO_CHACHA20_H
#define BITCOIN_CRYPTO_CHACHA20_H

#include <cstdint>
#include <cstdlib>

/**
 * A class for ChaCha20 256-bit stream cipher developed by Daniel J. Bernstein
 * https://cr.yp.to/chacha/chacha-20080128.pdf
 */
class ChaCha20 {
private:
    uint32_t input[16];

public:
    ChaCha20();
    ChaCha20(const uint8_t *key, size_t keylen);
    //! set key with flexible keylength; 256bit recommended
    void SetKey(const uint8_t *key, size_t keylen);
    // set the 64bit nonce
    void SetIV(uint64_t iv);
    // set the 64bit block counter
    void Seek(uint64_t pos);

    /** outputs the keystream of size <bytes> into <c> */
    void Keystream(uint8_t *c, size_t bytes);

    /**
     * enciphers the message <input> of length <bytes> and write the enciphered
     * representation into <output> Used for encryption and decryption (XOR)
     */
    void Crypt(const uint8_t *input, uint8_t *output, size_t bytes);
};

#endif // BITCOIN_CRYPTO_CHACHA20_H
