// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_WALLET_RPC_ENCRYPT_H
#define BITCOIN_WALLET_RPC_ENCRYPT_H

#include <span.h>

class CRPCCommand;

Span<const CRPCCommand> GetWalletEncryptRPCCommands();

#endif // BITCOIN_WALLET_RPC_ENCRYPT_H
