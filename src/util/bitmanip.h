// Copyright (c) 2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_UTIL_BITMANIP_H
#define BITCOIN_UTIL_BITMANIP_H

#include <config/bitcoin-config.h>

#include <cstdint>

inline uint32_t countBits(uint32_t v) {
#if HAVE_DECL___BUILTIN_POPCOUNT
    return __builtin_popcount(v);
#else
    /**
     * Computes the number of bits set in each group of 8bits then uses a
     * multiplication to sum all of them in the 8 most significant bits and
     * return these.
     * More detailed explanation can be found at
     * https://www.playingwithpointers.com/blog/swar.html
     */
    v = v - ((v >> 1) & 0x55555555);
    v = (v & 0x33333333) + ((v >> 2) & 0x33333333);
    return (((v + (v >> 4)) & 0xF0F0F0F) * 0x1010101) >> 24;
#endif
}

#endif // BITCOIN_UTIL_BITMANIP_H
