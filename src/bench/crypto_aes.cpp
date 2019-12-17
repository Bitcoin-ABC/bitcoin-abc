// Copyright (c) 2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <bench/bench.h>
#include <crypto/aes.h>
#include <util/time.h>
#include <validation.h>

#define BENCH_AES128_ITERATION 800000
#define BENCH_AES128CBC_ITERATION 200000
#define BENCH_AES256_ITERATION 640000
#define BENCH_AES256CBC_ITERATION 160000

static void AES128_Encrypt(benchmark::State &state) {
    const std::vector<uint8_t> key(AES128_KEYSIZE, 0);
    const std::vector<uint8_t> plaintext(16, 0);
    std::vector<uint8_t> cyphertext(16, 0);

    while (state.KeepRunning()) {
        AES128Encrypt(key.data()).Encrypt(cyphertext.data(), plaintext.data());
    }
}

static void AES128_Decrypt(benchmark::State &state) {
    const std::vector<uint8_t> key(AES128_KEYSIZE, 0);
    const std::vector<uint8_t> cyphertext(16, 0);
    std::vector<uint8_t> plaintext(16, 0);

    while (state.KeepRunning()) {
        AES128Decrypt(key.data()).Decrypt(plaintext.data(), cyphertext.data());
    }
}

static void AES256_Encrypt(benchmark::State &state) {
    const std::vector<uint8_t> key(AES256_KEYSIZE, 0);
    const std::vector<uint8_t> plaintext(16, 0);
    std::vector<uint8_t> cyphertext(16, 0);

    while (state.KeepRunning()) {
        AES256Encrypt(key.data()).Encrypt(cyphertext.data(), plaintext.data());
    }
}

static void AES256_Decrypt(benchmark::State &state) {
    const std::vector<uint8_t> key(AES256_KEYSIZE, 0);
    const std::vector<uint8_t> cyphertext(16, 0);
    std::vector<uint8_t> plaintext(16, 0);

    while (state.KeepRunning()) {
        AES256Decrypt(key.data()).Decrypt(plaintext.data(), cyphertext.data());
    }
}

static void AES128CBC_EncryptNoPad(benchmark::State &state) {
    const std::vector<uint8_t> key(AES128_KEYSIZE, 0);
    const std::vector<uint8_t> iv(AES_BLOCKSIZE, 0);
    const std::vector<uint8_t> plaintext(128, 0);
    std::vector<uint8_t> cyphertext(128, 0);

    while (state.KeepRunning()) {
        AES128CBCEncrypt(key.data(), iv.data(), false)
            .Encrypt(plaintext.data(), plaintext.size(), cyphertext.data());
    }
}

static void AES128CBC_DecryptNoPad(benchmark::State &state) {
    const std::vector<uint8_t> key(AES128_KEYSIZE, 0);
    const std::vector<uint8_t> iv(AES_BLOCKSIZE, 0);
    const std::vector<uint8_t> cyphertext(128, 0);
    std::vector<uint8_t> plaintext(128, 0);

    while (state.KeepRunning()) {
        AES128CBCDecrypt(key.data(), iv.data(), false)
            .Decrypt(cyphertext.data(), cyphertext.size(), plaintext.data());
    }
}

static void AES128CBC_EncryptWithPad(benchmark::State &state) {
    const std::vector<uint8_t> key(AES128_KEYSIZE, 0);
    const std::vector<uint8_t> iv(AES_BLOCKSIZE, 0);
    const std::vector<uint8_t> plaintext(128, 0);
    std::vector<uint8_t> cyphertext(128 + AES_BLOCKSIZE, 0);

    while (state.KeepRunning()) {
        AES128CBCEncrypt(key.data(), iv.data(), true)
            .Encrypt(plaintext.data(), plaintext.size(), cyphertext.data());
    }
}

static void AES128CBC_DecryptWithPad(benchmark::State &state) {
    const std::vector<uint8_t> key(AES128_KEYSIZE, 0);
    const std::vector<uint8_t> iv(AES_BLOCKSIZE, 0);
    const std::vector<uint8_t> cyphertext(128, 0);
    std::vector<uint8_t> plaintext(128 + AES_BLOCKSIZE, 0);

    while (state.KeepRunning()) {
        AES128CBCDecrypt(key.data(), iv.data(), true)
            .Decrypt(cyphertext.data(), cyphertext.size(), plaintext.data());
    }
}

static void AES256CBC_EncryptNoPad(benchmark::State &state) {
    const std::vector<uint8_t> key(AES256_KEYSIZE, 0);
    const std::vector<uint8_t> iv(AES_BLOCKSIZE, 0);
    const std::vector<uint8_t> plaintext(128, 0);
    std::vector<uint8_t> cyphertext(128, 0);

    while (state.KeepRunning()) {
        AES256CBCEncrypt(key.data(), iv.data(), false)
            .Encrypt(plaintext.data(), plaintext.size(), cyphertext.data());
    }
}

static void AES256CBC_DecryptNoPad(benchmark::State &state) {
    const std::vector<uint8_t> key(AES256_KEYSIZE, 0);
    const std::vector<uint8_t> iv(AES_BLOCKSIZE, 0);
    const std::vector<uint8_t> cyphertext(128, 0);
    std::vector<uint8_t> plaintext(128, 0);

    while (state.KeepRunning()) {
        AES256CBCDecrypt(key.data(), iv.data(), false)
            .Decrypt(cyphertext.data(), cyphertext.size(), plaintext.data());
    }
}

static void AES256CBC_EncryptWithPad(benchmark::State &state) {
    const std::vector<uint8_t> key(AES256_KEYSIZE, 0);
    const std::vector<uint8_t> iv(AES_BLOCKSIZE, 0);
    const std::vector<uint8_t> plaintext(128, 0);
    std::vector<uint8_t> cyphertext(128 + AES_BLOCKSIZE, 0);

    while (state.KeepRunning()) {
        AES256CBCEncrypt(key.data(), iv.data(), true)
            .Encrypt(plaintext.data(), plaintext.size(), cyphertext.data());
    }
}

static void AES256CBC_DecryptWithPad(benchmark::State &state) {
    const std::vector<uint8_t> key(AES256_KEYSIZE, 0);
    const std::vector<uint8_t> iv(AES_BLOCKSIZE, 0);
    const std::vector<uint8_t> cyphertext(128, 0);
    std::vector<uint8_t> plaintext(128 + AES_BLOCKSIZE, 0);

    while (state.KeepRunning()) {
        AES256CBCDecrypt(key.data(), iv.data(), true)
            .Decrypt(cyphertext.data(), cyphertext.size(), plaintext.data());
    }
}

BENCHMARK(AES128_Encrypt, BENCH_AES128_ITERATION);
BENCHMARK(AES128_Decrypt, BENCH_AES128_ITERATION);
BENCHMARK(AES256_Encrypt, BENCH_AES256_ITERATION);
BENCHMARK(AES256_Decrypt, BENCH_AES256_ITERATION);
BENCHMARK(AES128CBC_EncryptNoPad, BENCH_AES128CBC_ITERATION);
BENCHMARK(AES128CBC_DecryptNoPad, BENCH_AES128CBC_ITERATION);
BENCHMARK(AES128CBC_EncryptWithPad, BENCH_AES128CBC_ITERATION);
BENCHMARK(AES128CBC_DecryptWithPad, BENCH_AES128CBC_ITERATION);
BENCHMARK(AES256CBC_EncryptNoPad, BENCH_AES256CBC_ITERATION);
BENCHMARK(AES256CBC_DecryptNoPad, BENCH_AES256CBC_ITERATION);
BENCHMARK(AES256CBC_EncryptWithPad, BENCH_AES256CBC_ITERATION);
BENCHMARK(AES256CBC_DecryptWithPad, BENCH_AES256CBC_ITERATION);
