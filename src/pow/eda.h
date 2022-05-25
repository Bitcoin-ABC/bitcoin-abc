// Copyright (c) 2017-2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_POW_EDA_H
#define BITCOIN_POW_EDA_H

#include <cstdint>

class arith_uint256;
class CBlockHeader;
class CBlockIndex;

namespace Consensus {
struct Params;
}

uint32_t CalculateNextWorkRequired(const CBlockIndex *pindexPrev,
                                   int64_t nFirstBlockTime,
                                   const Consensus::Params &params);

uint32_t GetNextEDAWorkRequired(const CBlockIndex *pindexPrev,
                                const CBlockHeader *pblock,
                                const Consensus::Params &params);

/**
 * Return false if the proof-of-work requirement specified by new_target is not
 * possible, given the proof-of-work on the prior block as specified by
 * old_nbits.
 *
 * This function only checks that the new value is within a factor of 4 of the
 * old value for blocks.
 */
bool PermittedEDADifficultyTransition(const Consensus::Params &params,
                                      uint32_t old_nbits,
                                      arith_uint256 new_target);

#endif // BITCOIN_POW_EDA_H
