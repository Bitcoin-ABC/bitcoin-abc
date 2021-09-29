// Copyright (c) 2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_PRIMITIVES_BLOCKHASH_H
#define BITCOIN_PRIMITIVES_BLOCKHASH_H

#include <uint256.h>

/**
 * A BlockHash is a unqiue identifier for a block.
 */
struct BlockHash : public uint256 {
    explicit BlockHash() : uint256() {}
    explicit BlockHash(const uint256 &b) : uint256(b) {}

    static BlockHash fromHex(const std::string &str) {
        BlockHash r;
        r.SetHex(str);
        return r;
    }
};

#endif // BITCOIN_PRIMITIVES_BLOCKHASH_H
