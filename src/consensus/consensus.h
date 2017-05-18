// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CONSENSUS_CONSENSUS_H
#define BITCOIN_CONSENSUS_CONSENSUS_H

#include <cstdint>

/** The maximum allowed size for a transaction, in bytes */
static const unsigned int MAX_TX_SIZE = 1000000;
/** Default setting for maximum allowed size for a block, in bytes */
static const unsigned int DEFAULT_MAX_BLOCK_SIZE = MAX_TX_SIZE;
/** The maximum allowed number of signature check operations in a block (network
 * rule) */
static const int64_t MAX_BLOCK_SIGOPS = 20000;
/** Coinbase transaction outputs can only be spent after this number of new
 * blocks (network rule) */
static const int COINBASE_MATURITY = 100;

/** Flags for nSequence and nLockTime locks */
enum {
    /* Interpret sequence numbers as relative lock-time constraints. */
    LOCKTIME_VERIFY_SEQUENCE = (1 << 0),

    /* Use GetMedianTimePast() instead of nTime for end point timestamp. */
    LOCKTIME_MEDIAN_TIME_PAST = (1 << 1),
};

#endif // BITCOIN_CONSENSUS_CONSENSUS_H
