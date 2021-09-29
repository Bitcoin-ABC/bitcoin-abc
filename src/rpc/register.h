// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_RPC_REGISTER_H
#define BITCOIN_RPC_REGISTER_H

/**
 * These are in one header file to avoid creating tons of single-function
 * headers for everything under src/rpc/
 */
class CRPCTable;
class RPCServer;

/** Register block chain RPC commands */
void RegisterBlockchainRPCCommands(CRPCTable &tableRPC);
/** Register P2P networking RPC commands */
void RegisterNetRPCCommands(CRPCTable &tableRPC);
/** Register miscellaneous RPC commands */
void RegisterMiscRPCCommands(CRPCTable &tableRPC);
/** Register mining RPC commands */
void RegisterMiningRPCCommands(CRPCTable &tableRPC);
/** Register raw transaction RPC commands */
void RegisterRawTransactionRPCCommands(CRPCTable &tableRPC);
/** Register ABC RPC commands */
void RegisterABCRPCCommands(CRPCTable &tableRPC);
/** Register Avalanche RPC commands */
void RegisterAvalancheRPCCommands(CRPCTable &tableRPC);

static inline void RegisterAllCoreRPCCommands(CRPCTable &t) {
    RegisterBlockchainRPCCommands(t);
    RegisterNetRPCCommands(t);
    RegisterMiscRPCCommands(t);
    RegisterMiningRPCCommands(t);
    RegisterRawTransactionRPCCommands(t);
    RegisterABCRPCCommands(t);
    RegisterAvalancheRPCCommands(t);
}

/**
 * Register all context-sensitive RPC commands.
 */
static inline void RegisterAllRPCCommands(const Config &config,
                                          RPCServer &rpcServer,
                                          CRPCTable &rpcTable) {
    // TODO Register context-sensitive RPC commands using rpcServer

    RegisterAllCoreRPCCommands(rpcTable);
}

#endif // BITCOIN_RPC_REGISTER_H
