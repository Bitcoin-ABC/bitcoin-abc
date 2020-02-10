// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
#ifndef BITCOIN_POLICY_MEMPOOL_H
#define BITCOIN_POLICY_MEMPOOL_H

#include <cstdint>

class CBlockIndex;
namespace Consensus {
struct Params;
}

/** Default for -limitancestorcount, max number of in-mempool ancestors */
static const unsigned int DEFAULT_ANCESTOR_LIMIT = 25;
static const unsigned int DEFAULT_ANCESTOR_LIMIT_LONGER = 50;
/**
 * Default for -limitancestorsize, maximum kilobytes of tx + all in-mempool
 * ancestors.
 */
static const unsigned int DEFAULT_ANCESTOR_SIZE_LIMIT = 101;
/** Default for -limitdescendantcount, max number of in-mempool descendants */
static const unsigned int DEFAULT_DESCENDANT_LIMIT = 25;
static const unsigned int DEFAULT_DESCENDANT_LIMIT_LONGER = 50;
/**
 * Default for -limitdescendantsize, maximum kilobytes of in-mempool
 * descendants.
 */
static const unsigned int DEFAULT_DESCENDANT_SIZE_LIMIT = 101;

uint32_t GetDefaultAncestorLimit(const Consensus::Params &params,
                                 const CBlockIndex *pindexPrev);

uint32_t GetDefaultDescendantLimit(const Consensus::Params &params,
                                   const CBlockIndex *pindexPrev);

#endif // BITCOIN_POLICY_MEMPOOL_H
