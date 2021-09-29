// Copyright (c) 2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_TEST_UTIL_MINING_H
#define BITCOIN_TEST_UTIL_MINING_H

#include <memory>
#include <string>

class CBlock;
class Config;
class CScript;
class CTxIn;
struct NodeContext;

/** Returns the generated coin */
CTxIn MineBlock(const Config &config, const NodeContext &,
                const CScript &coinbase_scriptPubKey);

/** Prepare a block to be mined */
std::shared_ptr<CBlock> PrepareBlock(const Config &config, const NodeContext &,
                                     const CScript &coinbase_scriptPubKey);

/** RPC-like helper function, returns the generated coin */
CTxIn generatetoaddress(const Config &config, const NodeContext &,
                        const std::string &address);

#endif // BITCOIN_TEST_UTIL_MINING_H
