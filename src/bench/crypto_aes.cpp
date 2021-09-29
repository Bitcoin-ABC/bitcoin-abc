// Copyright (c) 2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <bench/bench.h>
#include <crypto/aes.h>
#include <util/time.h>
#include <validation.h>

static void AES128_Encrypt(benchmark::Bench &bench) {
    const std::vector<uint8_t> key(AES128_KEYSIZE, 0);
    const std::vector<uint8_t> plaintext(16, 0);
    std::vector<uint8_t> cyphertext(16, 0);

    bench.batch(plaintext.size()).unit("byte").run([&] {
        AES128Encrypt(key.data()).Encrypt(cyphertext.data(), plaintext.data());
    });
}

static void AES128_Decrypt(benchmark::Bench &bench) {
    const std::vector<uint8_t> key(AES128_KEYSIZE, 0);
    const std::vector<uint8_t> cyphertext(16, 0);
    std::vector<uint8_t> plaintext(16, 0);

    bench.batch(cyphertext.size()).unit("byte").run([&] {
        AES128Decrypt(key.data()).Decrypt(plaintext.data(), cyphertext.data());
    });
}

static void AES256_Encrypt(benchmark::Bench &bench) {
    const std::vector<uint8_t> key(AES256_KEYSIZE, 0);
    const std::vector<uint8_t> plaintext(16, 0);
    std::vector<uint8_t> cyphertext(16, 0);

    bench.batch(plaintext.size()).unit("byte").run([&] {
        AES256Encrypt(key.data()).Encrypt(cyphertext.data(), plaintext.data());
    });
}

static void AES256_Decrypt(benchmark::Bench &bench) {
    const std::vector<uint8_t> key(AES256_KEYSIZE, 0);
    const std::vector<uint8_t> cyphertext(16, 0);
    std::vector<uint8_t> plaintext(16, 0);

    bench.batch(cyphertext.size()).unit("byte").run([&] {
        AES256Decrypt(key.data()).Decrypt(plaintext.data(), cyphertext.data());
    });
}

static void AES128CBC_EncryptNoPad(benchmark::Bench &bench) {
    const std::vector<uint8_t> key(AES128_KEYSIZE, 0);
    const std::vector<uint8_t> iv(AES_BLOCKSIZE, 0);
    const std::vector<uint8_t> plaintext(128, 0);
    std::vector<uint8_t> cyphertext(128, 0);

    bench.batch(plaintext.size()).unit("byte").run([&] {
        AES128CBCEncrypt(key.data(), iv.data(), false)
            .Encrypt(plaintext.data(), plaintext.size(), cyphertext.data());
    });
}

static void AES128CBC_DecryptNoPad(benchmark::Bench &bench) {
    const std::vector<uint8_t> key(AES128_KEYSIZE, 0);
    const std::vector<uint8_t> iv(AES_BLOCKSIZE, 0);
    const std::vector<uint8_t> cyphertext(128, 0);
    std::vector<uint8_t> plaintext(128, 0);

    bench.batch(cyphertext.size()).unit("byte").run([&] {
        AES128CBCDecrypt(key.data(), iv.data(), false)
            .Decrypt(cyphertext.data(), cyphertext.size(), plaintext.data());
    });
}

static void AES128CBC_EncryptWithPad(benchmark::Bench &bench) {
    const std::vector<uint8_t> key(AES128_KEYSIZE, 0);
    const std::vector<uint8_t> iv(AES_BLOCKSIZE, 0);
    const std::vector<uint8_t> plaintext(128, 0);
    std::vector<uint8_t> cyphertext(128 + AES_BLOCKSIZE, 0);

    bench.batch(plaintext.size()).unit("byte").run([&] {
        AES128CBCEncrypt(key.data(), iv.data(), true)
            .Encrypt(plaintext.data(), plaintext.size(), cyphertext.data());
    });
}

static void AES128CBC_DecryptWithPad(benchmark::Bench &bench) {
    const std::vector<uint8_t> key(AES128_KEYSIZE, 0);
    const std::vector<uint8_t> iv(AES_BLOCKSIZE, 0);
    const std::vector<uint8_t> cyphertext(128, 0);
    std::vector<uint8_t> plaintext(128 + AES_BLOCKSIZE, 0);

    bench.batch(cyphertext.size()).unit("byte").run([&] {
        AES128CBCDecrypt(key.data(), iv.data(), true)
            .Decrypt(cyphertext.data(), cyphertext.size(), plaintext.data());
    });
}

static void AES256CBC_EncryptNoPad(benchmark::Bench &bench) {
    const std::vector<uint8_t> key(AES256_KEYSIZE, 0);
    const std::vector<uint8_t> iv(AES_BLOCKSIZE, 0);
    const std::vector<uint8_t> plaintext(128, 0);
    std::vector<uint8_t> cyphertext(128, 0);

    bench.batch(plaintext.size()).unit("byte").run([&] {
        AES256CBCEncrypt(key.data(), iv.data(), false)
            .Encrypt(plaintext.data(), plaintext.size(), cyphertext.data());
    });
}

static void AES256CBC_DecryptNoPad(benchmark::Bench &bench) {
    const std::vector<uint8_t> key(AES256_KEYSIZE, 0);
    const std::vector<uint8_t> iv(AES_BLOCKSIZE, 0);
    const std::vector<uint8_t> cyphertext(128, 0);
    std::vector<uint8_t> plaintext(128, 0);

    bench.batch(cyphertext.size()).unit("byte").run([&] {
        AES256CBCDecrypt(key.data(), iv.data(), false)
            .Decrypt(cyphertext.data(), cyphertext.size(), plaintext.data());
    });
}

static void AES256CBC_EncryptWithPad(benchmark::Bench &bench) {
    const std::vector<uint8_t> key(AES256_KEYSIZE, 0);
    const std::vector<uint8_t> iv(AES_BLOCKSIZE, 0);
    const std::vector<uint8_t> plaintext(128, 0);
    std::vector<uint8_t> cyphertext(128 + AES_BLOCKSIZE, 0);

    bench.batch(plaintext.size()).unit("byte").run([&] {
        AES256CBCEncrypt(key.data(), iv.data(), true)
            .Encrypt(plaintext.data(), plaintext.size(), cyphertext.data());
    });
}

static void AES256CBC_DecryptWithPad(benchmark::Bench &bench) {
    const std::vector<uint8_t> key(AES256_KEYSIZE, 0);
    const std::vector<uint8_t> iv(AES_BLOCKSIZE, 0);
    const std::vector<uint8_t> cyphertext(128, 0);
    std::vector<uint8_t> plaintext(128 + AES_BLOCKSIZE, 0);

    bench.batch(cyphertext.size()).unit("byte").run([&] {
        AES256CBCDecrypt(key.data(), iv.data(), true)
            .Decrypt(cyphertext.data(), cyphertext.size(), plaintext.data());
    });
}

BENCHMARK(AES128_Encrypt);
BENCHMARK(AES128_Decrypt);
BENCHMARK(AES256_Encrypt);
BENCHMARK(AES256_Decrypt);
BENCHMARK(AES128CBC_EncryptNoPad);
BENCHMARK(AES128CBC_DecryptNoPad);
BENCHMARK(AES128CBC_EncryptWithPad);
BENCHMARK(AES128CBC_DecryptWithPad);
BENCHMARK(AES256CBC_EncryptNoPad);
BENCHMARK(AES256CBC_DecryptNoPad);
BENCHMARK(AES256CBC_EncryptWithPad);
BENCHMARK(AES256CBC_DecryptWithPad);
