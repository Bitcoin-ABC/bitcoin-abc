// Copyright (c) 2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_WALLET_RPCWALLET_H
#define BITCOIN_WALLET_RPCWALLET_H

#include <script/sighashtype.h>
#include <span.h>

class CRPCCommand;
class RPCHelpMan;

Span<const CRPCCommand> GetWalletRPCCommands();

RPCHelpMan signrawtransactionwithwallet();
RPCHelpMan getaddressinfo();

#endif // BITCOIN_WALLET_RPCWALLET_H
