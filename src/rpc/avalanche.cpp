// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/delegationbuilder.h>
#include <avalanche/peermanager.h>
#include <avalanche/processor.h>
#include <avalanche/proof.h>
#include <avalanche/proofbuilder.h>
#include <config.h>
#include <core_io.h>
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
        RPCResult{RPCResult::Type::STR_HEX, "", ""},
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
    if ((keyHex.length() != 2 * CPubKey::COMPRESSED_SIZE &&
         keyHex.length() != 2 * CPubKey::SIZE) ||
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
        RPCResult{RPCResult::Type::BOOL, "success",
                  "Whether the addition succeeded or not."},
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

    if (key != proof.getMaster()) {
        // TODO: we want to provide a proper delegation.
        return false;
    }

    if (proof.getStakes().size() > AVALANCHE_MAX_PROOF_STAKES) {
        throw JSONRPCError(RPC_INVALID_PARAMS,
                           "Avalanche proof has too many UTXOs");
    }

    return g_avalanche->addNode(nodeid, proof,
                                avalanche::DelegationBuilder(proof).build());
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
        RPCResult{RPCResult::Type::STR_HEX, "proof",
                  "A string that is a serialized, hex-encoded proof data."},
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

        if (!pb.addUTXO(utxo, amount, uint32_t(height), iscoinbase,
                        std::move(key))) {
            throw JSONRPCError(RPC_INVALID_PARAMETER, "Invalid private key");
        }
    }

    const avalanche::Proof proof = pb.build();

    CDataStream ss(SER_NETWORK, PROTOCOL_VERSION);
    ss << proof;
    return HexStr(ss);
}

static UniValue getavalanchepeerinfo(const Config &config,
                                     const JSONRPCRequest &request) {
    RPCHelpMan{
        "getavalanchepeerinfo",
        "Returns data about each connected avalanche peer as a json array of "
        "objects.\n",
        {},
        RPCResult{
            RPCResult::Type::ARR,
            "",
            "",
            {{
                RPCResult::Type::OBJ,
                "",
                "",
                {{
                    {RPCResult::Type::NUM, "peerid", "The peer id"},
                    {RPCResult::Type::STR_HEX, "proof",
                     "The avalanche proof used by this peer"},
                    {RPCResult::Type::NUM, "sequence", "The proof's sequence"},
                    {RPCResult::Type::NUM_TIME, "expiration",
                     "The proof's expiration timestamp"},
                    {RPCResult::Type::STR_HEX, "master",
                     "The proof's master public key"},
                    {
                        RPCResult::Type::ARR,
                        "stakes",
                        "",
                        {{
                            RPCResult::Type::OBJ,
                            "",
                            "",
                            {{
                                {RPCResult::Type::STR_HEX, "txid", ""},
                                {RPCResult::Type::NUM, "vout", ""},
                                {RPCResult::Type::STR_AMOUNT, "amount",
                                 "The amount in this UTXO"},
                                {RPCResult::Type::NUM, "height",
                                 "The height at which this UTXO was mined"},
                                {RPCResult::Type::BOOL, "iscoinbase",
                                 "Indicate wether the UTXO is a coinbase"},
                                {RPCResult::Type::STR_HEX, "pubkey", ""},
                            }},
                        }},
                    },
                    {RPCResult::Type::ARR,
                     "nodes",
                     "",
                     {
                         {RPCResult::Type::NUM, "nodeid",
                          "Node id, as returned by getpeerinfo"},
                     }},
                }},
            }},
        },
        RPCExamples{HelpExampleCli("getavalanchepeerinfo", "") +
                    HelpExampleRpc("getavalanchepeerinfo", "")},
    }
        .Check(request);

    if (!g_avalanche) {
        throw JSONRPCError(RPC_INTERNAL_ERROR, "Avalanche is not initialized");
    }

    UniValue ret(UniValue::VARR);

    for (const auto &peer : g_avalanche->getPeers()) {
        UniValue obj(UniValue::VOBJ);

        CDataStream serproof(SER_NETWORK, PROTOCOL_VERSION);
        serproof << peer.proof;

        obj.pushKV("peerid", uint64_t(peer.peerid));
        obj.pushKV("proof", HexStr(serproof));
        obj.pushKV("sequence", peer.proof.getSequence());
        obj.pushKV("expiration", peer.proof.getExpirationTime());
        obj.pushKV("master", HexStr(peer.proof.getMaster()));

        UniValue stakes(UniValue::VARR);
        for (const auto &s : peer.proof.getStakes()) {
            UniValue stake(UniValue::VOBJ);
            stake.pushKV("txid", s.getStake().getUTXO().GetTxId().GetHex());
            stake.pushKV("vout", uint64_t(s.getStake().getUTXO().GetN()));
            stake.pushKV("amount", ValueFromAmount(s.getStake().getAmount()));
            stake.pushKV("height", uint64_t(s.getStake().getHeight()));
            stake.pushKV("iscoinbase", s.getStake().isCoinbase());
            stake.pushKV("pubkey", HexStr(s.getStake().getPubkey()));
            stakes.push_back(stake);
        }
        obj.pushKV("stakes", stakes);

        UniValue nodes(UniValue::VARR);
        for (const auto &id : g_avalanche->getNodeIdsForPeer(peer.peerid)) {
            nodes.push_back(id);
        }
        obj.pushKV("nodes", nodes);
        obj.pushKV("nodecount", uint64_t(peer.node_count));

        ret.push_back(obj);
    }

    return ret;
}

void RegisterAvalancheRPCCommands(CRPCTable &t) {
    // clang-format off
    static const CRPCCommand commands[] = {
        //  category            name                      actor (function)        argNames
        //  ------------------- ------------------------  ----------------------  ----------
        { "avalanche",          "getavalanchekey",        getavalanchekey,        {}},
        { "avalanche",          "addavalanchenode",       addavalanchenode,       {"nodeid"}},
        { "avalanche",          "buildavalancheproof",    buildavalancheproof,    {"sequence", "expiration", "master", "stakes"}},
        { "avalanche",          "getavalanchepeerinfo",   getavalanchepeerinfo,   {}},
    };
    // clang-format on

    for (unsigned int vcidx = 0; vcidx < ARRAYLEN(commands); vcidx++) {
        t.appendCommand(commands[vcidx].name, &commands[vcidx]);
    }
}
