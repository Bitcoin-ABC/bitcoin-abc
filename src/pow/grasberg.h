// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_POW_GRASBERG_H
#define BITCOIN_POW_GRASBERG_H

#include <cstdint>

class CBlockHeader;
class CBlockIndex;
class CChainParams;

uint32_t GetNextGrasbergWorkRequired(const CBlockIndex *pindexPrev,
                                     const CBlockHeader *pblock,
                                     const CChainParams &chainParams);

namespace grasberg {

/**
 * Compute the block time we are aiming for.
 */
int64_t computeTargetBlockTime(const CBlockIndex *pindexPrev,
                               const CChainParams &chainParams);

/**
 * Computes exp2(n) = 2^32 * (2^(n/2^32) - 1)
 *
 * /!\ This function is a consensus dependent aproximation. The error due to the
 * aproximation is at most 0.0000000075 , which is enough for a wide variety of
 * applications. It is important to not modify the behavior of this function,
 * for instance in the hopes of making it more precise, as it woud break
 * consensus and might cause a split.
 */
uint32_t deterministicExp2(const uint32_t n);

} // namespace grasberg

#endif // BITCOIN_POW_GRASBERG_H
