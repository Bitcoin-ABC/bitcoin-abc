// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_UINT256RADIXKEY_H
#define BITCOIN_UINT256RADIXKEY_H

#include <arith_uint256.h>

#include <cstdint>

class uint256;

/**
 * Facility for using an uint256 as a radix tree key.
 */
struct Uint256RadixKey {
    arith_uint256 base;

    Uint256RadixKey(const uint256 &keyIn) : base(UintToArith256(keyIn)) {}
    Uint256RadixKey(const base_uint<256> &keyIn) : base(keyIn) {}

    Uint256RadixKey operator>>(uint32_t shift) const { return base >> shift; }
    Uint256RadixKey operator&(const Uint256RadixKey &mask) const {
        return base & mask.base;
    }
    operator size_t() const { return size_t(base.GetLow64()); }
};

// The radix tree relies on sizeof to gather the bit length of the key
static_assert(sizeof(Uint256RadixKey) == 32,
              "Uint256RadixKey key size should be 256 bits");

#endif // BITCOIN_UINT256RADIXKEY_H
