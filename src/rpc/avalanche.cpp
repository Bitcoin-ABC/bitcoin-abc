// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/processor.h>
#include <avalanche/proof.h>
#include <avalanche/proofbuilder.h>
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
        "Returns the key used to sign avalanche messages.\n",
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

static CPubKey ParsePubKey(const UniValue &param) {
    const std::string keyHex = param.get_str();
    if ((keyHex.length() != 2 * CPubKey::COMPRESSED_PUBLIC_KEY_SIZE &&
         keyHex.length() != 2 * CPubKey::PUBLIC_KEY_SIZE) ||
        !IsHex(keyHex)) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                           strprintf("Invalid public key: %s\n", keyHex));
    }

    return HexToPubKey(keyHex);
}

static UniValue addavalanchenode(const Config &config,
                                 const JSONRPCRequest &request) {
    RPCHelpMan{
        "addavalanchenode",
        "Add a node in the set of peers to poll for avalanche.\n",
        {
            {"nodeid", RPCArg::Type::NUM, RPCArg::Optional::NO,
             "Node to be added to avalanche."},
            {"publickey", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The public key of the node."},
            {"proof", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "Proof that the node is not a sybil."},
        },
        RPCResult{"\"success\"    (boolean) Whether the addition succeeded or "
                  "not.\n"},
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
    const CPubKey key = ParsePubKey(request.params[1]);

    CDataStream ss(ParseHexV(request.params[2], "proof"), SER_NETWORK,
                   PROTOCOL_VERSION);
    avalanche::Proof proof;
    ss >> proof;

    return g_avalanche->addNode(nodeid, proof, key);
}

static UniValue buildavalancheproof(const Config &config,
                                    const JSONRPCRequest &request) {
    RPCHelpMan{
        "buildavalancheproof",
        "Build a proof for avalanche's sybil resistance.\n",
        {
            {"sequence", RPCArg::Type::NUM, RPCArg::Optional::NO,
             "The proof's sequence"},
            {"expiration", RPCArg::Type::NUM, RPCArg::Optional::NO,
             "A timestamp indicating when the proof expire"},
            {"master", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The master public key"},
            {
                "stakes",
                RPCArg::Type::ARR,
                RPCArg::Optional::NO,
                "The stakes to be signed and associated private keys",
                {
                    {
                        "stake",
                        RPCArg::Type::OBJ,
                        RPCArg::Optional::NO,
                        "A stake to be attached to this proof",
                        {
                            {"txid", RPCArg::Type::STR_HEX,
                             RPCArg::Optional::NO, "The transaction id"},
                            {"vout", RPCArg::Type::NUM, RPCArg::Optional::NO,
                             "The output number"},
                            {"amount", RPCArg::Type::AMOUNT,
                             RPCArg::Optional::NO, "The amount in this UTXO"},
                            {"height", RPCArg::Type::NUM, RPCArg::Optional::NO,
                             "The height at which this UTXO was mined"},
                            {"iscoinbase", RPCArg::Type::BOOL,
                             /* default */ "false",
                             "Indicate wether the UTXO is a coinbase"},
                            {"privatekey", RPCArg::Type::STR,
                             RPCArg::Optional::NO,
                             "private key in base58-encoding"},
                        },
                    },
                },
            },
        },
        RPCResult{"\"proof\"    (string) A string that is a serialized, "
                  "hex-encoded proof data.\n"},
        RPCExamples{HelpExampleRpc("buildavalancheproof",
                                   "0 1234567800 \"<master>\" []")},
    }
        .Check(request);

    RPCTypeCheck(request.params, {UniValue::VNUM, UniValue::VNUM,
                                  UniValue::VSTR, UniValue::VARR});

    if (!g_avalanche) {
        throw JSONRPCError(RPC_INTERNAL_ERROR, "Avalanche is not initialized");
    }

    const uint64_t sequence = request.params[0].get_int64();
    const int64_t expiration = request.params[1].get_int64();
    avalanche::ProofBuilder pb(sequence, expiration,
                               ParsePubKey(request.params[2]));

    const UniValue &stakes = request.params[3].get_array();
    for (size_t i = 0; i < stakes.size(); i++) {
        const UniValue &stake = stakes[i];
        RPCTypeCheckObj(stake,
                        {
                            {"txid", UniValue::VSTR},
                            {"vout", UniValue::VNUM},
                            // "amount" is also required but check is done below
                            // due to UniValue::VNUM erroneously not accepting
                            // quoted numerics (which are valid JSON)
                            {"height", UniValue::VNUM},
                            {"privatekey", UniValue::VSTR},
                        });

        int nOut = find_value(stake, "vout").get_int();
        if (nOut < 0) {
            throw JSONRPCError(RPC_DESERIALIZATION_ERROR,
                               "vout must be positive");
        }

        const int height = find_value(stake, "height").get_int();
        if (height < 1) {
            throw JSONRPCError(RPC_DESERIALIZATION_ERROR,
                               "height must be positive");
        }

        const TxId txid(ParseHashO(stake, "txid"));
        const COutPoint utxo(txid, nOut);

        if (!stake.exists("amount")) {
            throw JSONRPCError(RPC_INVALID_PARAMETER, "Missing amount");
        }

        const Amount amount = AmountFromValue(find_value(stake, "amount"));

        const UniValue &iscbparam = find_value(stake, "iscoinbase");
        const bool iscoinbase =
            iscbparam.isNull() ? false : iscbparam.get_bool();
        CKey key = DecodeSecret(find_value(stake, "privatekey").get_str());

        if (!pb.addUTXO(utxo, amount, uint32_t(height) << 1 | iscoinbase,
                        std::move(key))) {
            throw JSONRPCError(RPC_INVALID_PARAMETER, "Invalid private key");
        }
    }

    const avalanche::Proof proof = pb.build();

    CDataStream ss(SER_NETWORK, PROTOCOL_VERSION);
    ss << proof;
    return HexStr(ss.begin(), ss.end());
}

// clang-format off
static const CRPCCommand commands[] = {
    //  category            name                      actor (function)        argNames
    //  ------------------- ------------------------  ----------------------  ----------
    { "avalanche",          "getavalanchekey",        getavalanchekey,        {}},
    { "avalanche",          "addavalanchenode",       addavalanchenode,       {"nodeid"}},
    { "avalanche",          "buildavalancheproof",    buildavalancheproof,    {"sequence", "expiration", "master", "stakes"}},
};
// clang-format on

void RegisterAvalancheRPCCommands(CRPCTable &t) {
    for (unsigned int vcidx = 0; vcidx < ARRAYLEN(commands); vcidx++) {
        t.appendCommand(commands[vcidx].name, &commands[vcidx]);
    }
}
