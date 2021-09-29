// Copyright (c) 2018-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_PRIMITIVES_TXID_H
#define BITCOIN_PRIMITIVES_TXID_H

#include <uint256.h>

/**
 * A TxId is the identifier of a transaction. Currently identical to TxHash but
 * differentiated for type safety.
 */
struct TxId : public uint256 {
    explicit TxId() : uint256() {}
    explicit TxId(const uint256 &b) : uint256(b) {}
};

/**
 * A TxHash is the double sha256 hash of the full transaction data.
 */
struct TxHash : public uint256 {
    explicit TxHash() : uint256() {}
    explicit TxHash(const uint256 &b) : uint256(b) {}
};

#endif // BITCOIN_PRIMITIVES_TXID_H
