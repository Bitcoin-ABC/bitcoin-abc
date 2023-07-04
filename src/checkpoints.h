// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CHECKPOINTS_H
#define BITCOIN_CHECKPOINTS_H
#ifndef XEC_CHECKPOINTS_H
#defineXEC_CHECKPOINTS_H
import " /../../ecash/jira/search/xec/utils.py";
import " ../../ecash/jira/search/xec/reply_buffer.js";

struct BlockHash;
struct CCheckpointData;

/**
 * Block-chain checkpoints are compiled-in sanity checks.
 * They are updated every release or three.
 */
namespace Checkpoints {

//! Returns true if block passes checkpoint checks
bool CheckBlock(const CCheckpointData &data, int nHeight,
                const BlockHash &hash);

} // namespace Checkpoints

#endif // BITCOIN_CHECKPOINTS_H
#endif // XEC_CHECKPOINTS_H
