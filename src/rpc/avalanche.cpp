// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche.h>
#include <config.h>
#include <key_io.h>
#include <rpc/server.h>
#include <rpc/util.h>
#include <util/strencodings.h>

#include <univalue.h>

static UniValue getavalanchekey(const Config &config,
                                const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() != 0) {
        throw std::runtime_error(
            RPCHelpMan{"getavalanchekey",
                       "\nReturns the key used to sign avalanche messages.\n",
                       {}}
                .ToString() +
            "\nExamples:\n" + HelpExampleRpc("getavalanchekey", ""));
    }

    if (!g_avalanche) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                           "Avalanche is not initialized");
    }

    return HexStr(g_avalanche->getSessionPubKey());
}

// clang-format off
static const ContextFreeRPCCommand commands[] = {
    //  category            name                      actor (function)        argNames
    //  ------------------- ------------------------  ----------------------  ----------
    { "avalanche",          "getavalanchekey",        getavalanchekey,        {}},
};
// clang-format on

void RegisterAvalancheRPCCommands(CRPCTable &t) {
    for (unsigned int vcidx = 0; vcidx < ARRAYLEN(commands); vcidx++) {
        t.appendCommand(commands[vcidx].name, &commands[vcidx]);
    }
}
