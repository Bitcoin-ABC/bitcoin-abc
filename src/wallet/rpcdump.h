// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_WALLET_RPCDUMP_H
#define BITCOIN_WALLET_RPCDUMP_H

#include <univalue.h>

#include <memory>
#include <vector>

class Config;
class CRPCTable;
class JSONRPCRequest;

namespace interfaces {
class Chain;
class Handler;
} // namespace interfaces

void RegisterDumpRPCCommands(
    interfaces::Chain &chain,
    std::vector<std::unique_ptr<interfaces::Handler>> &handlers);

UniValue importmulti(const Config &config, const JSONRPCRequest &request);
UniValue dumpwallet(const Config &config, const JSONRPCRequest &request);
UniValue importwallet(const Config &config, const JSONRPCRequest &request);

#endif // BITCOIN_WALLET_RPCDUMP_H
