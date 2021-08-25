// Copyright (c) 2021 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
#ifndef BITCOIN_SCRIPT_INTMATH_H
#define BITCOIN_SCRIPT_INTMATH_H

#include <cstdlib>
#include <limits>

/**
 * Computes a + b and stores it in result. If the sum overflows or results in an
 * invalid 63+sign-bit integer, return true, otherwise false. Overflow checks
 * are emulated and don't rely on built-in overflow checks.
 */
static bool AddInt63OverflowEmulated(int64_t a, int64_t b, int64_t &result) {
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

/**
 * Computes a + b and stores it in result. If the sum overflows or results in an
 * invalid 63+sign-bit integer, return true, otherwise false.
 * Uses built-in overflow functions if available, and emulated overflow math
 * otherwise.
 */
static bool AddInt63Overflow(int64_t a, int64_t b, int64_t &result) {
#if HAVE_DECL___BUILTIN_SADDLL_OVERFLOW
    if (__builtin_saddll_overflow(a, b, (long long int *)&result)) {
        return true;
    }
    return result == std::numeric_limits<int64_t>::min();
#else
    return AddInt63OverflowEmulated(a, b, result);
#endif
}

/**
 * Computes a - b and stores it in result. If the difference overflows or
 * results in an invalid 63+sign-bit integer, return true, otherwise false.
 * Overflow checks are emulated and don't rely on built-in overflow checks.
 */
static bool SubInt63OverflowEmulated(int64_t a, int64_t b, int64_t &result) {
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

/**
 * Computes a - b and stores it in result. If the sum difference or results in
 * an invalid 63+sign-bit integer, return true, otherwise false.
 * Uses built-in overflow functions if available, and emulated overflow math
 * otherwise.
 */
static bool SubInt63Overflow(int64_t a, int64_t b, int64_t &result) {
#if HAVE_DECL___BUILTIN_SSUBLL_OVERFLOW
    if (__builtin_ssubll_overflow(a, b, (long long int *)&result)) {
        return true;
    }
    return result == std::numeric_limits<int64_t>::min();
#else
    return SubInt63OverflowEmulated(a, b, result);
#endif
}

#endif // BITCOIN_SCRIPT_INTMATH_H
