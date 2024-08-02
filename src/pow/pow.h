// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_POW_POW_H
#define BITCOIN_POW_POW_H

#include <cstdint>

class arith_uint256;
struct BlockHash;
class CBlockHeader;
class CBlockIndex;
class CChainParams;

namespace Consensus {
struct Params;
}

uint32_t GetNextWorkRequired(const CBlockIndex *pindexPrev,
                             const CBlockHeader *pblock,
                             const CChainParams &chainParams);

/**
 * Check whether a block hash satisfies the proof-of-work requirement specified
 * by nBits
 */
bool CheckProofOfWork(const BlockHash &hash, uint32_t nBits,
                      const Consensus::Params &params);

/**
 * Return false if the proof-of-work requirement specified by new_nbits at a
 * given height is not possible, given the proof-of-work on the prior block as
 * specified by old_nbits.
 *
 * For blocks prior to the UAHF, this function only checks that the new value
 * is within a factor of 4 of the old value for blocks at the difficulty
 * adjustment interval, and otherwise requires the values to be the same.
 *
 * For blocks after UAHF and before the switch to CW-144, the difficulty is
 * allowed to change for any blocks, but still within a factor 4.
 *
 * After the switch to the CW-144 DAA, any change in difficulty is theoretically
 * possible, so always return true.
 *
 * Always returns true on networks where min difficulty blocks are allowed,
 * such as regtest/testnet.
 */
bool PermittedDifficultyTransition(const Consensus::Params &params,
                                   int64_t height, uint32_t old_nbits,
                                   uint32_t new_nbits);

/**
 * Convert a header bits difficulty representation to a 256 bits hash target.
 */
bool NBitsToTarget(const Consensus::Params &params, uint32_t nBits,
                   arith_uint256 &target);

#endif // BITCOIN_POW_POW_H
