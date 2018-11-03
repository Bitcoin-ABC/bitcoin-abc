// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CONSENSUS_CONSENSUS_H
#define BITCOIN_CONSENSUS_CONSENSUS_H

#include <cstdint>

/** 1MB */
static const uint64_t ONE_MEGABYTE = 1000000;
/** The maximum allowed size for a transaction, in bytes */
static const uint64_t MAX_TX_SIZE = ONE_MEGABYTE;
/** The minimum allowed size for a transaction, in bytes */
static const uint64_t MIN_TX_SIZE = 100;
/** The maximum allowed size for a block, before the UAHF */
static const uint64_t LEGACY_MAX_BLOCK_SIZE = ONE_MEGABYTE;
/** Default setting for maximum allowed size for a block, in bytes */
static const uint64_t DEFAULT_MAX_BLOCK_SIZE = 32 * ONE_MEGABYTE;
/**
 * The maximum allowed number of signature check operations per MB in a block
 * (network rule).
 */
static const int64_t MAX_BLOCK_SIGOPS_PER_MB = 20000;
/** allowed number of signature check operations per transaction. */
static const uint64_t MAX_TX_SIGOPS_COUNT = 20000;
/**
 * Coinbase transaction outputs can only be spent after this number of new
 * blocks (network rule).
 */
static const int COINBASE_MATURITY = 100;
/** Coinbase scripts have their own script size limit. */
static const int MAX_COINBASE_SCRIPTSIG_SIZE = 100;
/** Activation time for P2SH (April 1st 2012) */
static const int64_t P2SH_ACTIVATION_TIME = 1333234914;

/** Flags for nSequence and nLockTime locks */
enum {
    /* Interpret sequence numbers as relative lock-time constraints. */
    LOCKTIME_VERIFY_SEQUENCE = (1 << 0),

    /* Use GetMedianTimePast() instead of nTime for end point timestamp. */
    LOCKTIME_MEDIAN_TIME_PAST = (1 << 1),
};

/**
 * Compute the maximum number of sigops operation that can contained in a block
 * given the block size as parameter. It is computed by multiplying
 * MAX_BLOCK_SIGOPS_PER_MB by the size of the block in MB rounded up to the
 * closest integer.
 */
inline uint64_t GetMaxBlockSigOpsCount(uint64_t blockSize) {
    auto nMbRoundedUp = 1 + ((blockSize - 1) / ONE_MEGABYTE);
    return nMbRoundedUp * MAX_BLOCK_SIGOPS_PER_MB;
}

#endif // BITCOIN_CONSENSUS_CONSENSUS_H
