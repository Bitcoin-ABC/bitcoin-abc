// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/processor.h>
#include <avalanche/proof.h>
#include <config.h>
#include <key_io.h>
#include <rpc/server.h>
#include <rpc/util.h>
#include <util/strencodings.h>

#include <univalue.h>

static UniValue getavalanchekey(const Config &config,
                                const JSONRPCRequest &request) {
    RPCHelpMan{
        "getavalanchekey",
        "\nReturns the key used to sign avalanche messages.\n",
        {},
        RPCResults{},
        RPCExamples{HelpExampleRpc("getavalanchekey", "")},
    }
        .Check(request);

    if (!g_avalanche) {
        throw JSONRPCError(RPC_INTERNAL_ERROR, "Avalanche is not initialized");
    }

    return HexStr(g_avalanche->getSessionPubKey());
}

static UniValue addavalanchenode(const Config &config,
                                 const JSONRPCRequest &request) {
    RPCHelpMan{
        "addavalanchenode",
        "\nAdd a node in the set of peers to poll for avalanche.\n",
        {
            {"nodeid", RPCArg::Type::NUM, RPCArg::Optional::NO,
             "Node to be added to avalanche."},
            {"publickey", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The public key of the node."},
            {"proof", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "Proof that the node is not a sybil."},
        },
        RPCResults{},
        RPCExamples{
            HelpExampleRpc("addavalanchenode", "5, \"<pubkey>\", \"<proof>\"")},
    }
        .Check(request);

    RPCTypeCheck(request.params,
                 {UniValue::VNUM, UniValue::VSTR, UniValue::VSTR});

    if (!g_avalanche) {
        throw JSONRPCError(RPC_INTERNAL_ERROR, "Avalanche is not initialized");
    }

    const NodeId nodeid = request.params[0].get_int64();

    // Parse the pubkey
    const std::string keyHex = request.params[1].get_str();
    if ((keyHex.length() != 2 * CPubKey::COMPRESSED_PUBLIC_KEY_SIZE &&
         keyHex.length() != 2 * CPubKey::PUBLIC_KEY_SIZE) ||
        !IsHex(keyHex)) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                           strprintf("Invalid public key: %s\n", keyHex));
    }

    CDataStream ss(ParseHexV(request.params[2], "proof"), SER_NETWORK,
                   PROTOCOL_VERSION);
    avalanche::Proof proof;
    ss >> proof;

    g_avalanche->addPeer(nodeid, proof, {HexToPubKey(keyHex)});
    return {};
}

// clang-format off
static const CRPCCommand commands[] = {
    //  category            name                      actor (function)        argNames
    //  ------------------- ------------------------  ----------------------  ----------
    { "avalanche",          "getavalanchekey",        getavalanchekey,        {}},
    { "avalanche",          "addavalanchenode",       addavalanchenode,       {"nodeid"}},
};
// clang-format on

void RegisterAvalancheRPCCommands(CRPCTable &t) {
    for (unsigned int vcidx = 0; vcidx < ARRAYLEN(commands); vcidx++) {
        t.appendCommand(commands[vcidx].name, &commands[vcidx]);
    }
}
