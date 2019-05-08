// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CHECKPOINTS_H
#define BITCOIN_CHECKPOINTS_H

#include <uint256.h>

#include <map>

class CBlockIndex;
struct CCheckpointData;

/**
 * Block-chain checkpoints are compiled-in sanity checks.
 * They are updated every release or three.
 */
namespace Checkpoints {

//! Returns true if block passes checkpoint checks
bool CheckBlock(const CCheckpointData &data, int nHeight, const uint256 &hash);

//! Returns last CBlockIndex* that is a checkpoint
CBlockIndex *GetLastCheckpoint(const CCheckpointData &data);

} // namespace Checkpoints

#endif // BITCOIN_CHECKPOINTS_H
