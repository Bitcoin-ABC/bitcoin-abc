// Copyright (c) 2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_TEST_UTIL_MINING_H
#define BITCOIN_TEST_UTIL_MINING_H

#include <cstdint>
#include <memory>
#include <string>

class CBlock;
class CBlockIndex;
class Config;
class CScript;
class CTxIn;
namespace node {
struct NodeContext;
} // namespace node

/** Returns the generated coin */
CTxIn MineBlock(const Config &config, const node::NodeContext &,
                const CScript &coinbase_scriptPubKey);

/** Prepare a block to be mined */
std::shared_ptr<CBlock> PrepareBlock(const Config &config,
                                     const node::NodeContext &,
                                     const CScript &coinbase_scriptPubKey);

/** RPC-like helper function, returns the generated coin */
CTxIn generatetoaddress(const Config &config, const node::NodeContext &,
                        const std::string &address);

void createCoinbaseAndMerkleRoot(CBlock *pblock, const CBlockIndex *pindexPrev,
                                 uint64_t nExcessiveBlockSize);

#endif // BITCOIN_TEST_UTIL_MINING_H
