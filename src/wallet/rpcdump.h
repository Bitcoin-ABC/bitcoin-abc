// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_WALLET_RPCDUMP_H
#define BITCOIN_WALLET_RPCDUMP_H

#include <span.h>

#include <memory>
#include <vector>

class RPCHelpMan;
class CRPCCommand;

Span<const CRPCCommand> GetWalletDumpRPCCommands();

RPCHelpMan importmulti();
RPCHelpMan dumpwallet();
RPCHelpMan importwallet();

#endif // BITCOIN_WALLET_RPCDUMP_H
