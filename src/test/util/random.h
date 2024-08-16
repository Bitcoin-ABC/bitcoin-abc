// Copyright (c) 2023 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_TEST_UTIL_RANDOM_H
#define BITCOIN_TEST_UTIL_RANDOM_H

#include <consensus/amount.h>
#include <random.h>
#include <uint256.h>

#include <cstdint>

/**
 * This global and the helpers that use it are not thread-safe.
 *
 * If thread-safety is needed, the global could be made thread_local (given
 * that thread_local is supported on all architectures we support) or a
 * per-thread instance could be used in the multi-threaded test.
 */
extern FastRandomContext g_insecure_rand_ctx;

enum class SeedRand {
    ZEROS, //!< Seed with a compile time constant of zeros
    SEED,  //!< Use (and report) random seed from environment, or a (truly)
           //!< random one.
};

/**
 * Seed the global RNG state for testing and log the seed value. This affects
 * all randomness, except GetStrongRandBytes().
 */
void SeedRandomStateForTest(SeedRand seed);

static inline uint32_t InsecureRand32() {
    return g_insecure_rand_ctx.rand32();
}
static inline uint160 InsecureRand160() {
    return g_insecure_rand_ctx.rand160();
}
static inline uint256 InsecureRand256() {
    return g_insecure_rand_ctx.rand256();
}
static inline uint64_t InsecureRandBits(int bits) {
    return g_insecure_rand_ctx.randbits(bits);
}
static inline uint64_t InsecureRandRange(uint64_t range) {
    return g_insecure_rand_ctx.randrange(range);
}
static inline bool InsecureRandBool() {
    return g_insecure_rand_ctx.randbool();
}

static inline Amount InsecureRandMoneyAmount() {
    return static_cast<int64_t>(InsecureRandRange(MAX_MONEY / SATOSHI + 1)) *
           SATOSHI;
}

#endif // BITCOIN_TEST_UTIL_RANDOM_H
