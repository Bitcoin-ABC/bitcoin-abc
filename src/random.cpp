// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "random.h"

#include "crypto/sha512.h"
#include "support/cleanse.h"
#ifdef WIN32
#include "compat.h" // for Windows API
#include <wincrypt.h>
#endif
#include "util.h"             // for LogPrint()
#include "utilstrencodings.h" // for GetTime()

#include <cstdlib>
#include <limits>

#ifndef WIN32
#include <sys/time.h>
#endif

#ifdef HAVE_SYS_GETRANDOM
#include <linux/random.h>
#include <sys/syscall.h>
#endif
#ifdef HAVE_GETENTROPY
#include <unistd.h>
#endif
#ifdef HAVE_SYSCTL_ARND
#include <sys/sysctl.h>
#endif

#include <openssl/err.h>
#include <openssl/rand.h>

static void RandFailure() {
    LogPrintf("Failed to read randomness, aborting\n");
    abort();
}

static inline int64_t GetPerformanceCounter() {
    int64_t nCounter = 0;
#ifdef WIN32
    QueryPerformanceCounter((LARGE_INTEGER *)&nCounter);
#else
    timeval t;
    gettimeofday(&t, nullptr);
    nCounter = t.tv_sec * 1000000LL + t.tv_usec;
#endif
    return nCounter;
}

void RandAddSeed() {
    // Seed with CPU performance counter
    int64_t nCounter = GetPerformanceCounter();
    RAND_add(&nCounter, sizeof(nCounter), 1.5);
    memory_cleanse((void *)&nCounter, sizeof(nCounter));
}

static void RandAddSeedPerfmon() {
    RandAddSeed();

#ifdef WIN32
    // Don't need this on Linux, OpenSSL automatically uses /dev/urandom
    // Seed with the entire set of perfmon data

    // This can take up to 2 seconds, so only do it every 10 minutes
    static int64_t nLastPerfmon;
    if (GetTime() < nLastPerfmon + 10 * 60) return;
    nLastPerfmon = GetTime();

    std::vector<uint8_t> vData(250000, 0);
    long ret = 0;
    unsigned long nSize = 0;
    // Bail out at more than 10MB of performance data
    const size_t nMaxSize = 10000000;
    while (true) {
        nSize = vData.size();
        ret = RegQueryValueExA(HKEY_PERFORMANCE_DATA, "Global", nullptr,
                               nullptr, vData.data(), &nSize);
        if (ret != ERROR_MORE_DATA || vData.size() >= nMaxSize) {
            break;
        }
        // Grow size of buffer exponentially
        vData.resize(std::max((vData.size() * 3) / 2, nMaxSize));
    }
    RegCloseKey(HKEY_PERFORMANCE_DATA);
    if (ret == ERROR_SUCCESS) {
        RAND_add(vData.data(), nSize, nSize / 100.0);
        memory_cleanse(vData.data(), nSize);
        LogPrint("rand", "%s: %lu bytes\n", __func__, nSize);
    } else {
        // Warn only once
        static bool warned = false;
        if (!warned) {
            LogPrintf("%s: Warning: RegQueryValueExA(HKEY_PERFORMANCE_DATA) "
                      "failed with code %i\n",
                      __func__, ret);
            warned = true;
        }
    }
#endif
}

#ifndef WIN32
/**
 *Fallback: get 32 bytes of system entropy from /dev/urandom. The most
 *compatible way to get cryptographic randomness on UNIX-ish platforms.
 */
void GetDevURandom(unsigned char *ent32) {
    int f = open("/dev/urandom", O_RDONLY);
    if (f == -1) {
        RandFailure();
    }
    int have = 0;
    do {
        ssize_t n = read(f, ent32 + have, NUM_OS_RANDOM_BYTES - have);
        if (n <= 0 || n + have > NUM_OS_RANDOM_BYTES) {
            RandFailure();
        }
        have += n;
    } while (have < NUM_OS_RANDOM_BYTES);
    close(f);
}
#endif

/** Get 32 bytes of system entropy. */
void GetOSRand(uint8_t *ent32) {
#if defined(WIN32)
    HCRYPTPROV hProvider;
    int ret = CryptAcquireContextW(&hProvider, nullptr, nullptr, PROV_RSA_FULL,
                                   CRYPT_VERIFYCONTEXT);
    if (!ret) {
        RandFailure();
    }
    ret = CryptGenRandom(hProvider, NUM_OS_RANDOM_BYTES, ent32);
    if (!ret) {
        RandFailure();
    }
    CryptReleaseContext(hProvider, 0);
#elif defined(HAVE_SYS_GETRANDOM)
    /**
     * Linux. From the getrandom(2) man page:
     * "If the urandom source has been initialized, reads of up to 256 bytes
     * will always return as many bytes as requested and will not be interrupted
     * by signals."
     */
    int rv = syscall(SYS_getrandom, ent32, NUM_OS_RANDOM_BYTES, 0);
    if (rv != NUM_OS_RANDOM_BYTES) {
        if (rv < 0 && errno == ENOSYS) {
            /* Fallback for kernel <3.17: the return value will be -1 and errno
             * ENOSYS if the syscall is not available, in that case fall back
             * to /dev/urandom.
             */
            GetDevURandom(ent32);
        } else {
            RandFailure();
        }
    }
#elif defined(HAVE_GETENTROPY)
    /* On OpenBSD this can return up to 256 bytes of entropy, will return an
     * error if more are requested.
     * The call cannot return less than the requested number of bytes.
     */
    if (getentropy(ent32, NUM_OS_RANDOM_BYTES) != 0) {
        RandFailure();
    }
#elif defined(HAVE_SYSCTL_ARND)
    /* FreeBSD and similar. It is possible for the call to return less
     * bytes than requested, so need to read in a loop.
     */
    static const int name[2] = {CTL_KERN, KERN_ARND};
    int have = 0;
    do {
        size_t len = NUM_OS_RANDOM_BYTES - have;
        if (sysctl(name, ARRAYLEN(name), ent32 + have, &len, nullptr, 0) != 0) {
            RandFailure();
        }
        have += len;
    } while (have < NUM_OS_RANDOM_BYTES);
#else
    /* Fall back to /dev/urandom if there is no specific method implemented to
     * get system entropy for this OS.
     */
    GetDevURandom(ent32);
#endif
}

void GetRandBytes(uint8_t *buf, int num) {
    if (RAND_bytes(buf, num) != 1) {
        RandFailure();
    }
}

void GetStrongRandBytes(uint8_t *out, int num) {
    assert(num <= 32);
    CSHA512 hasher;
    uint8_t buf[64];

    // First source: OpenSSL's RNG
    RandAddSeedPerfmon();
    GetRandBytes(buf, 32);
    hasher.Write(buf, 32);

    // Second source: OS RNG
    GetOSRand(buf);
    hasher.Write(buf, 32);

    // Produce output
    hasher.Finalize(buf);
    memcpy(out, buf, num);
    memory_cleanse(buf, 64);
}

uint64_t GetRand(uint64_t nMax) {
    if (nMax == 0) {
        return 0;
    }

    // The range of the random source must be a multiple of the modulus to give
    // every possible output value an equal possibility
    uint64_t nRange = (std::numeric_limits<uint64_t>::max() / nMax) * nMax;
    uint64_t nRand = 0;
    do {
        GetRandBytes((uint8_t *)&nRand, sizeof(nRand));
    } while (nRand >= nRange);
    return (nRand % nMax);
}

int GetRandInt(int nMax) {
    return GetRand(nMax);
}

uint256 GetRandHash() {
    uint256 hash;
    GetRandBytes((uint8_t *)&hash, sizeof(hash));
    return hash;
}

void FastRandomContext::RandomSeed() {
    uint256 seed = GetRandHash();
    rng.SetKey(seed.begin(), 32);
    requires_seed = false;
}

FastRandomContext::FastRandomContext(const uint256 &seed)
    : requires_seed(false), bytebuf_size(0), bitbuf_size(0) {
    rng.SetKey(seed.begin(), 32);
}

bool Random_SanityCheck() {
    /* This does not measure the quality of randomness, but it does test that
     * OSRandom() overwrites all 32 bytes of the output given a maximum number
     * of tries.
     */
    static const ssize_t MAX_TRIES = 1024;
    uint8_t data[NUM_OS_RANDOM_BYTES];
    /* Tracks which bytes have been overwritten at least once */
    bool overwritten[NUM_OS_RANDOM_BYTES] = {};
    int num_overwritten;
    int tries = 0;
    /* Loop until all bytes have been overwritten at least once, or max number
     * tries reached */
    do {
        memset(data, 0, NUM_OS_RANDOM_BYTES);
        GetOSRand(data);
        for (int x = 0; x < NUM_OS_RANDOM_BYTES; ++x) {
            overwritten[x] |= (data[x] != 0);
        }

        num_overwritten = 0;
        for (int x = 0; x < NUM_OS_RANDOM_BYTES; ++x) {
            if (overwritten[x]) {
                num_overwritten += 1;
            }
        }

        tries += 1;
    } while (num_overwritten < NUM_OS_RANDOM_BYTES && tries < MAX_TRIES);
    /* If this failed, bailed out after too many tries */
    return (num_overwritten == NUM_OS_RANDOM_BYTES);
}

FastRandomContext::FastRandomContext(bool fDeterministic)
    : requires_seed(!fDeterministic), bytebuf_size(0), bitbuf_size(0) {
    if (!fDeterministic) {
        return;
    }
    uint256 seed;
    rng.SetKey(seed.begin(), 32);
}
