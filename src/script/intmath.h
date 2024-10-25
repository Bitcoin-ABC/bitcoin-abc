// Copyright (c) 2021 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
#ifndef BITCOIN_SCRIPT_INTMATH_H
#define BITCOIN_SCRIPT_INTMATH_H

#include <cstdint>

/**
 * Computes a + b and stores it in result. If the sum overflows or results in an
 * invalid 63+sign-bit integer, return true, otherwise false. Overflow checks
 * are emulated and don't rely on built-in overflow checks.
 */
bool AddInt63OverflowEmulated(int64_t a, int64_t b, int64_t &result);

/**
 * Computes a + b and stores it in result. If the sum overflows or results in an
 * invalid 63+sign-bit integer, return true, otherwise false.
 * Uses built-in overflow functions if available, and emulated overflow math
 * otherwise.
 */
bool AddInt63Overflow(int64_t a, int64_t b, int64_t &result);

/**
 * Computes a - b and stores it in result. If the difference overflows or
 * results in an invalid 63+sign-bit integer, return true, otherwise false.
 * Overflow checks are emulated and don't rely on built-in overflow checks.
 */
bool SubInt63OverflowEmulated(int64_t a, int64_t b, int64_t &result);

/**
 * Computes a - b and stores it in result. If the sum difference or results in
 * an invalid 63+sign-bit integer, return true, otherwise false.
 * Uses built-in overflow functions if available, and emulated overflow math
 * otherwise.
 */
bool SubInt63Overflow(int64_t a, int64_t b, int64_t &result);

#endif // BITCOIN_SCRIPT_INTMATH_H
