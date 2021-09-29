// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_RANDOM_H
#define BITCOIN_RANDOM_H

#include <crypto/chacha20.h>
#include <crypto/common.h>
#include <uint256.h>

#include <chrono> // For std::chrono::microseconds
#include <cstdint>
#include <limits>

/**
 * Overall design of the RNG and entropy sources.
 *
 * We maintain a single global 256-bit RNG state for all high-quality
 * randomness. The following (classes of) functions interact with that state by
 * mixing in new entropy, and optionally extracting random output from it:
 *
 * - The GetRand*() class of functions, as well as construction of
 * FastRandomContext objects, perform 'fast' seeding, consisting of mixing in:
 *   - A stack pointer (indirectly committing to calling thread and call stack)
 *   - A high-precision timestamp (rdtsc when available, c++
 * high_resolution_clock otherwise)
 *   - 64 bits from the hardware RNG (rdrand) when available.
 *   These entropy sources are very fast, and only designed to protect against
 * situations where a VM state restore/copy results in multiple systems with the
 * same randomness. FastRandomContext on the other hand does not protect against
 * this once created, but is even faster (and acceptable to use inside tight
 * loops).
 *
 * - The GetStrongRand*() class of function perform 'slow' seeding, including
 * everything that fast seeding includes, but additionally:
 *   - OS entropy (/dev/urandom, getrandom(), ...). The application will
 * terminate if this entropy source fails.
 *   - Another high-precision timestamp (indirectly committing to a benchmark of
 * all the previous sources). These entropy sources are slower, but designed to
 * make sure the RNG state contains fresh data that is unpredictable to
 * attackers.
 *
 * - RandAddPeriodic() seeds everything that fast seeding includes, but
 * additionally:
 *   - A high-precision timestamp
 *   - Dynamic environment data (performance monitoring, ...)
 *   - Strengthen the entropy for 10 ms using repeated SHA512.
 *   This is run once every minute.
 *
 * On first use of the RNG (regardless of what function is called first), all
 * entropy sources used in the 'slow' seeder are included, but also:
 * - 256 bits from the hardware RNG (rdseed or rdrand) when available.
 * - Dynamic environment data (performance monitoring, ...)
 * - Static environment data
 * - Strengthen the entropy for 100 ms using repeated SHA512.
 *
 * When mixing in new entropy, H = SHA512(entropy || old_rng_state) is computed,
 * and (up to) the first 32 bytes of H are produced as output, while the last 32
 * bytes become the new RNG state.
 */

/**
 * Generate random data via the internal PRNG.
 *
 * These functions are designed to be fast (sub microsecond), but do not
 * necessarily meaningfully add entropy to the PRNG state.
 *
 * Thread-safe.
 */
void GetRandBytes(uint8_t *buf, int num) noexcept;
/**
 * Generate a uniform random integer in the range [0..range).
 * Precondition: range > 0
 */
uint64_t GetRand(uint64_t nMax) noexcept;
/**
 * Generate a uniform random duration in the range [0..max).
 * Precondition: max.count() > 0
 */
template <typename D>
D GetRandomDuration(typename std::common_type<D>::type max) noexcept {
    // Having the compiler infer the template argument from the function
    // argument is dangerous, because the desired return value generally has a
    // different type than the function argument. So std::common_type is used to
    // force the call site to specify the type of the return value.

    assert(max.count() > 0);
    return D{GetRand(max.count())};
};
constexpr auto GetRandMicros = GetRandomDuration<std::chrono::microseconds>;
constexpr auto GetRandMillis = GetRandomDuration<std::chrono::milliseconds>;
int GetRandInt(int nMax) noexcept;
uint256 GetRandHash() noexcept;

/**
 * Gather entropy from various sources, feed it into the internal PRNG, and
 * generate random data using it.
 *
 * This function will cause failure whenever the OS RNG fails.
 *
 * Thread-safe.
 */
void GetStrongRandBytes(uint8_t *buf, int num) noexcept;

/**
 * Gather entropy from various expensive sources, and feed them to the PRNG
 * state.
 *
 * Thread-safe.
 */
void RandAddPeriodic() noexcept;

/**
 * Gathers entropy from the low bits of the time at which events occur. Should
 * be called with a uint32_t describing the event at the time an event occurs.
 *
 * Thread-safe.
 */
void RandAddEvent(const uint32_t event_info) noexcept;

/**
 * Fast randomness source. This is seeded once with secure random data, but
 * is completely deterministic and does not gather more entropy after that.
 *
 * This class is not thread-safe.
 */
class FastRandomContext {
private:
    bool requires_seed;
    ChaCha20 rng;

    uint8_t bytebuf[64];
    int bytebuf_size;

    uint64_t bitbuf;
    int bitbuf_size;

    void RandomSeed();

    void FillByteBuffer() {
        if (requires_seed) {
            RandomSeed();
        }
        rng.Keystream(bytebuf, sizeof(bytebuf));
        bytebuf_size = sizeof(bytebuf);
    }

    void FillBitBuffer() {
        bitbuf = rand64();
        bitbuf_size = 64;
    }

public:
    explicit FastRandomContext(bool fDeterministic = false) noexcept;

    /** Initialize with explicit seed (only for testing) */
    explicit FastRandomContext(const uint256 &seed) noexcept;

    // Do not permit copying a FastRandomContext (move it, or create a new one
    // to get reseeded).
    FastRandomContext(const FastRandomContext &) = delete;
    FastRandomContext(FastRandomContext &&) = delete;
    FastRandomContext &operator=(const FastRandomContext &) = delete;

    /**
     * Move a FastRandomContext. If the original one is used again, it will be
     * reseeded.
     */
    FastRandomContext &operator=(FastRandomContext &&from) noexcept;

    /** Generate a random 64-bit integer. */
    uint64_t rand64() noexcept {
        if (bytebuf_size < 8) {
            FillByteBuffer();
        }
        uint64_t ret = ReadLE64(bytebuf + 64 - bytebuf_size);
        bytebuf_size -= 8;
        return ret;
    }

    /** Generate a random (bits)-bit integer. */
    uint64_t randbits(int bits) noexcept {
        if (bits == 0) {
            return 0;
        } else if (bits > 32) {
            return rand64() >> (64 - bits);
        } else {
            if (bitbuf_size < bits) {
                FillBitBuffer();
            }
            uint64_t ret = bitbuf & (~uint64_t(0) >> (64 - bits));
            bitbuf >>= bits;
            bitbuf_size -= bits;
            return ret;
        }
    }

    /**
     * Generate a random integer in the range [0..range).
     * Precondition: range > 0.
     */
    uint64_t randrange(uint64_t range) noexcept {
        assert(range);
        --range;
        int bits = CountBits(range);
        while (true) {
            uint64_t ret = randbits(bits);
            if (ret <= range) {
                return ret;
            }
        }
    }

    /** Generate random bytes. */
    std::vector<uint8_t> randbytes(size_t len);

    /** Generate a random 32-bit integer. */
    uint32_t rand32() noexcept { return randbits(32); }

    /** generate a random uint160. */
    uint160 rand160() noexcept;

    /** generate a random uint256. */
    uint256 rand256() noexcept;

    /** Generate a random boolean. */
    bool randbool() noexcept { return randbits(1); }

    // Compatibility with the C++11 UniformRandomBitGenerator concept
    typedef uint64_t result_type;
    static constexpr uint64_t min() { return 0; }
    static constexpr uint64_t max() {
        return std::numeric_limits<uint64_t>::max();
    }
    inline uint64_t operator()() noexcept { return rand64(); }
};

/**
 * More efficient than using std::shuffle on a FastRandomContext.
 *
 * This is more efficient as std::shuffle will consume entropy in groups of
 * 64 bits at the time and throw away most.
 *
 * This also works around a bug in libstdc++ std::shuffle that may cause
 * type::operator=(type&&) to be invoked on itself, which the library's
 * debug mode detects and panics on. This is a known issue, see
 * https://stackoverflow.com/questions/22915325/avoiding-self-assignment-in-stdshuffle
 */
template <typename I, typename R> void Shuffle(I first, I last, R &&rng) {
    while (first != last) {
        size_t j = rng.randrange(last - first);
        if (j) {
            using std::swap;
            swap(*first, *(first + j));
        }
        ++first;
    }
}

/**
 * Number of random bytes returned by GetOSRand.
 * When changing this constant make sure to change all call sites, and make
 * sure that the underlying OS APIs for all platforms support the number.
 * (many cap out at 256 bytes).
 */
static const int NUM_OS_RANDOM_BYTES = 32;

/**
 * Get 32 bytes of system entropy. Do not use this in application code: use
 * GetStrongRandBytes instead.
 */
void GetOSRand(uint8_t *ent32);

/**
 * Check that OS randomness is available and returning the requested number of
 * bytes.
 */
bool Random_SanityCheck();

/**
 * Initialize global RNG state and log any CPU features that are used.
 *
 * Calling this function is optional. RNG state will be initialized when first
 * needed if it is not called.
 */
void RandomInit();

#endif // BITCOIN_RANDOM_H
