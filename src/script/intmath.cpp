// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <script/intmath.h>

#include <cstdint>
#include <limits>

#if defined(HAVE_CONFIG_H)
#include <config/bitcoin-config.h>
#endif

bool AddInt63OverflowEmulated(int64_t a, int64_t b, int64_t &result) {
    if (a > 0 && b > std::numeric_limits<int64_t>::max() - a) {
        // integer overflow
        return true;
    }
    if (a < 0 && b <= std::numeric_limits<int64_t>::min() - a) {
        // integer underflow
        return true;
    }
    result = a + b;
    return result == std::numeric_limits<int64_t>::min();
}

bool AddInt63Overflow(int64_t a, int64_t b, int64_t &result) {
#if HAVE_DECL___BUILTIN_SADDLL_OVERFLOW
    if (__builtin_saddll_overflow(a, b, (long long int *)&result)) {
        return true;
    }
    return result == std::numeric_limits<int64_t>::min();
#else
    return AddInt63OverflowEmulated(a, b, result);
#endif
}

bool SubInt63OverflowEmulated(int64_t a, int64_t b, int64_t &result) {
    if (a < 0 && b > std::numeric_limits<int64_t>::max() + a) {
        // integer overflow
        return true;
    }
    if (a > 0 && b <= std::numeric_limits<int64_t>::min() + a) {
        // integer underflow
        return true;
    }
    result = a - b;
    return result == std::numeric_limits<int64_t>::min();
}

bool SubInt63Overflow(int64_t a, int64_t b, int64_t &result) {
#if HAVE_DECL___BUILTIN_SSUBLL_OVERFLOW
    if (__builtin_ssubll_overflow(a, b, (long long int *)&result)) {
        return true;
    }
    return result == std::numeric_limits<int64_t>::min();
#else
    return SubInt63OverflowEmulated(a, b, result);
#endif
}
