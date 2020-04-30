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
        throw std::runtime_error(RPCHelpMan{
            "getavalanchekey",
            "\nReturns the key used to sign avalanche messages.\n",
            {},
            RPCResults{},
            RPCExamples{HelpExampleRpc("getavalanchekey", "")},
        }
                                     .ToString());
    }

    if (!g_avalanche) {
        throw JSONRPCError(RPC_INTERNAL_ERROR, "Avalanche is not initialized");
    }

    return HexStr(g_avalanche->getSessionPubKey());
}

static UniValue addavalanchepeer(const Config &config,
                                 const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() != 2) {
        throw std::runtime_error(RPCHelpMan{
            "addavalanchepeer",
            "\nAdd a peer to the set of peer to poll for avalanche.\n",
            {
                {"nodeid", RPCArg::Type::NUM, /* opt */ false,
                 /* default_value */ "", "Node to be added to avalanche."},
                {"publickey", RPCArg::Type::STR_HEX, /* opt */ false,
                 /* default_value */ "", "The public key of the node."},
            },
            RPCResults{},
            RPCExamples{HelpExampleRpc("addavalanchepeer", "5")},
        }
                                     .ToString());
    }

    if (!g_avalanche) {
        throw JSONRPCError(RPC_INTERNAL_ERROR, "Avalanche is not initialized");
    }

    // Parse nodeid
    if (!request.params[0].isNum()) {
        throw JSONRPCError(
            RPC_INVALID_PARAMETER,
            std::string("Invalid parameter, nodeid must be an integer"));
    }

    NodeId nodeid = request.params[0].get_int64();

    // Parse the pubkey
    const std::string keyHex = request.params[1].get_str();
    if ((keyHex.length() != 2 * CPubKey::COMPRESSED_PUBLIC_KEY_SIZE &&
         keyHex.length() != 2 * CPubKey::PUBLIC_KEY_SIZE) ||
        !IsHex(keyHex)) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                           strprintf("Invalid public key: %s\n", keyHex));
    }

    CPubKey pubkey{HexToPubKey(keyHex)};

    g_avalanche->addPeer(nodeid, 0, pubkey);
    return {};
}

// clang-format off
static const CRPCCommand commands[] = {
    //  category            name                      actor (function)        argNames
    //  ------------------- ------------------------  ----------------------  ----------
    { "avalanche",          "getavalanchekey",        getavalanchekey,        {}},
    { "avalanche",          "addavalanchepeer",       addavalanchepeer,       {"nodeid"}},
};
// clang-format on

void RegisterAvalancheRPCCommands(CRPCTable &t) {
    for (unsigned int vcidx = 0; vcidx < ARRAYLEN(commands); vcidx++) {
        t.appendCommand(commands[vcidx].name, &commands[vcidx]);
    }
}
