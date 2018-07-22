// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_BLOCKVALIDITY_H
#define BITCOIN_BLOCKVALIDITY_H

#include <cstdint>

enum class BlockValidity : uint32_t {
    /**
     * Unused.
     */
    UNKNOWN = 0,

    /**
     * Parsed, version ok, hash satisfies claimed PoW, 1 <= vtx count <= max,
     * timestamp not in future.
     */
    HEADER = 1,

    /**
     * All parent headers found, difficulty matches, timestamp >= median
     * previous, checkpoint. Implies all parents are also at least TREE.
     */
    TREE = 2,

    /**
     * Only first tx is coinbase, 2 <= coinbase input script length <= 100,
     * transactions valid, no duplicate txids, sigops, size, merkle root.
     * Implies all parents are at least TREE but not necessarily TRANSACTIONS.
     * When all parent blocks also have TRANSACTIONS, CBlockIndex::nChainTx will
     * be set.
     */
    TRANSACTIONS = 3,

    /**
     * Outputs do not overspend inputs, no double spends, coinbase output ok, no
     * immature coinbase spends, BIP30.
     * Implies all parents are also at least CHAIN.
     */
    CHAIN = 4,

    /**
     * Scripts & signatures ok. Implies all parents are also at least SCRIPTS.
     */
    SCRIPTS = 5,
};

#endif // BITCOIN_BLOCKVALIDITY_H
