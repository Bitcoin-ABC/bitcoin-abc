// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_RPCBLOCKCHAIN_H
#define BITCOIN_RPCBLOCKCHAIN_H

#include <univalue.h>

class CBlock;
class CBlockIndex;
class Config;
class JSONRPCRequest;

UniValue getblockchaininfo(const Config &config, const JSONRPCRequest &request);

double GetDifficulty(const CBlockIndex *blockindex);

UniValue blockToJSON(const Config &config, const CBlock &block,
                     const CBlockIndex *blockindex, bool txDetails = false);

UniValue blockheaderToJSON(const CBlockIndex *blockindex);

#endif // BITCOIN_RPCBLOCKCHAIN_H
