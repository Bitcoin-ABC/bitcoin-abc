// Copyright (c) 2017-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_RPC_BLOCKCHAIN_H
#define BITCOIN_RPC_BLOCKCHAIN_H

#include <fs.h>
#include <streams.h>
#include <sync.h>
#include <validation.h>

#include <univalue.h>

#include <any>

class CBlock;
class CBlockIndex;
class Chainstate;
class RPCHelpMan;
namespace node {
struct NodeContext;
} // namespace node

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
UniValue blockToJSON(node::BlockManager &blockman, const CBlock &block,
                     const CBlockIndex *tip, const CBlockIndex *blockindex,
                     bool txDetails = false) LOCKS_EXCLUDED(cs_main);

/** Block header to JSON */
UniValue blockheaderToJSON(const CBlockIndex *tip,
                           const CBlockIndex *blockindex)
    LOCKS_EXCLUDED(cs_main);

/**
 * Helper to create UTXO snapshots given a chainstate and a file handle.
 * @return a UniValue map containing metadata about the snapshot.
 */
UniValue CreateUTXOSnapshot(node::NodeContext &node, Chainstate &chainstate,
                            AutoFile &afile, const fs::path &path,
                            const fs::path &tmppath);

#endif // BITCOIN_RPC_BLOCKCHAIN_H
