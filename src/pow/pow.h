// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_POW_POW_H
#define BITCOIN_POW_POW_H

#include <cstdint>

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

#endif // BITCOIN_POW_POW_H
