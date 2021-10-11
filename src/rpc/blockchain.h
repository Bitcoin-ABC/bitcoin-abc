// Copyright (c) 2017-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_RPC_BLOCKCHAIN_H
#define BITCOIN_RPC_BLOCKCHAIN_H

#include <sync.h>

#include <univalue.h>

class CBlock;
class CBlockIndex;
class ChainstateManager;
class CTxMemPool;
class RPCHelpMan;
struct NodeContext;
namespace util {
class Ref;
} // namespace util

extern RecursiveMutex cs_main;

RPCHelpMan getblockchaininfo();

/**
 * Get the required difficulty of the next block w/r/t the given block index.
 *
 * @return A floating point number that is a multiple of the main net minimum
 * difficulty (4295032833 hashes).
 */
double GetDifficulty(const CBlockIndex *blockindex);

/** Callback for when block tip changed. */
void RPCNotifyBlockChange(const CBlockIndex *pindex);

/** Block description to JSON */
UniValue blockToJSON(const CBlock &block, const CBlockIndex *tip,
                     const CBlockIndex *blockindex, bool txDetails = false)
    LOCKS_EXCLUDED(cs_main);

/** Mempool information to JSON */
UniValue MempoolInfoToJSON(const CTxMemPool &pool);

/** Mempool to JSON */
UniValue MempoolToJSON(const CTxMemPool &pool, bool verbose = false);

/** Block header to JSON */
UniValue blockheaderToJSON(const CBlockIndex *tip,
                           const CBlockIndex *blockindex)
    LOCKS_EXCLUDED(cs_main);

NodeContext &EnsureNodeContext(const util::Ref &context);
CTxMemPool &EnsureMemPool(const util::Ref &context);
ChainstateManager &EnsureChainman(const util::Ref &context);

#endif // BITCOIN_RPC_BLOCKCHAIN_H
