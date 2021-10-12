// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/avalanche.h>
#include <avalanche/delegation.h>
#include <avalanche/delegationbuilder.h>
#include <avalanche/peermanager.h>
#include <avalanche/processor.h>
#include <avalanche/proof.h>
#include <avalanche/proofbuilder.h>
#include <avalanche/validation.h>
#include <config.h>
#include <core_io.h>
#include <key_io.h>
#include <net_processing.h>
#include <node/context.h>
#include <rpc/blockchain.h>
#include <rpc/server.h>
#include <rpc/util.h>
#include <util/strencodings.h>
#include <util/translation.h>

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

static bool registerProofIfNeeded(std::shared_ptr<avalanche::Proof> proof) {
    return g_avalanche->withPeerManager([&](avalanche::PeerManager &pm) {
        return pm.getProof(proof->getId()) ||
               pm.registerProof(std::move(proof));
    });
}

static void verifyDelegationOrThrow(avalanche::Delegation &dg,
                                    const std::string &dgHex, CPubKey &auth) {
    bilingual_str error;
    if (!avalanche::Delegation::FromHex(dg, dgHex, error)) {
        throw JSONRPCError(RPC_DESERIALIZATION_ERROR, error.original);
    }

    avalanche::DelegationState state;
    if (!dg.verify(state, auth)) {
        throw JSONRPCError(RPC_INVALID_PARAMETER,
                           "The delegation is invalid: " + state.ToString());
    }
}

static void verifyProofOrThrow(const NodeContext &node, avalanche::Proof &proof,
                               const std::string &proofHex) {
    bilingual_str error;
    if (!avalanche::Proof::FromHex(proof, proofHex, error)) {
        throw JSONRPCError(RPC_DESERIALIZATION_ERROR, error.original);
    }

    avalanche::ProofValidationState state;
    {
        LOCK(cs_main);
        if (!proof.verify(state,
                          node.chainman->ActiveChainstate().CoinsTip())) {
            throw JSONRPCError(RPC_INVALID_PARAMETER,
                               "The proof is invalid: " + state.ToString());
        }
    }
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
            {"delegation", RPCArg::Type::STR_HEX, RPCArg::Optional::OMITTED,
             "The proof delegation the the node public key"},
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
    CPubKey key = ParsePubKey(request.params[1]);

    auto proof = std::make_shared<avalanche::Proof>();
    NodeContext &node = EnsureNodeContext(request.context);
    verifyProofOrThrow(node, *proof, request.params[2].get_str());

    const avalanche::ProofId &proofid = proof->getId();
    if (key != proof->getMaster()) {
        if (request.params.size() < 4 || request.params[3].isNull()) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                               "The public key does not match the proof");
        }

        avalanche::Delegation dg;
        CPubKey auth;
        verifyDelegationOrThrow(dg, request.params[3].get_str(), auth);

        if (dg.getProofId() != proofid) {
            throw JSONRPCError(RPC_INVALID_PARAMETER,
                               "The delegation does not match the proof");
        }

        if (key != auth) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                               "The public key does not match the delegation");
        }
    }

    if (!registerProofIfNeeded(proof)) {
        throw JSONRPCError(RPC_INVALID_PARAMETER,
                           "The proof has conflicting utxos");
    }

    if (!node.connman->ForNode(nodeid, [&](CNode *pnode) {
            // FIXME This is not thread safe, and might cause issues if the
            // unlikely event the peer sends an avahello message at the same
            // time.
            if (!pnode->m_avalanche_state) {
                pnode->m_avalanche_state =
                    std::make_unique<CNode::AvalancheState>();
            }
            pnode->m_avalanche_state->pubkey = std::move(key);
            return true;
        })) {
        throw JSONRPCError(RPC_INVALID_PARAMETER,
                           strprintf("The node does not exist: %d", nodeid));
        ;
    }

    return g_avalanche->withPeerManager([&](avalanche::PeerManager &pm) {
        if (!pm.addNode(nodeid, proofid)) {
            return false;
        }

        pm.addUnbroadcastProof(proofid);
        return true;
    });
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
            {"master", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The master private key in base58-encoding"},
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
            {"payoutAddress", RPCArg::Type::STR, RPCArg::Optional::OMITTED,
             "A payout address (not required for legacy proofs)"},
        },
        RPCResult{RPCResult::Type::STR_HEX, "proof",
                  "A string that is a serialized, hex-encoded proof data."},
        RPCExamples{HelpExampleRpc("buildavalancheproof",
                                   "0 1234567800 \"<master>\" []")},
    }
        .Check(request);

    RPCTypeCheck(request.params, {UniValue::VNUM, UniValue::VNUM,
                                  UniValue::VSTR, UniValue::VARR});

    const uint64_t sequence = request.params[0].get_int64();
    const int64_t expiration = request.params[1].get_int64();

    CKey masterKey = DecodeSecret(request.params[2].get_str());
    if (!masterKey.IsValid()) {
        throw JSONRPCError(RPC_INVALID_PARAMETER, "Invalid master key");
    }

    CTxDestination payoutAddress = CNoDestination();
    if (!avalanche::Proof::useLegacy(gArgs)) {
        if (request.params[4].isNull()) {
            throw JSONRPCError(
                RPC_INVALID_PARAMETER,
                "A payout address is required if `-legacyavaproof` is false");
        }
        payoutAddress = DecodeDestination(request.params[4].get_str(),
                                          config.GetChainParams());

        if (!IsValidDestination(payoutAddress)) {
            throw JSONRPCError(RPC_INVALID_PARAMETER, "Invalid payout address");
        }
    }

    avalanche::ProofBuilder pb(sequence, expiration, masterKey,
                               GetScriptForDestination(payoutAddress));

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

        if (!key.IsValid()) {
            throw JSONRPCError(RPC_INVALID_PARAMETER, "Invalid private key");
        }

        if (!pb.addUTXO(utxo, amount, uint32_t(height), iscoinbase,
                        std::move(key))) {
            throw JSONRPCError(RPC_INVALID_PARAMETER, "Duplicated stake");
        }
    }

    const avalanche::Proof proof = pb.build();

    CDataStream ss(SER_NETWORK, PROTOCOL_VERSION);
    ss << proof;
    return HexStr(ss);
}

static UniValue decodeavalancheproof(const Config &config,
                                     const JSONRPCRequest &request) {
    RPCHelpMan{
        "decodeavalancheproof",
        "Convert a serialized, hex-encoded proof, into JSON object. "
        "The validity of the proof is not verified.\n",
        {
            {"hexstring", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The proof hex string"},
        },
        RPCResult{
            RPCResult::Type::OBJ,
            "",
            "",
            {
                {RPCResult::Type::NUM, "sequence",
                 "The proof's sequential number"},
                {RPCResult::Type::NUM, "expiration",
                 "A timestamp indicating when the proof expires"},
                {RPCResult::Type::STR_HEX, "master", "The master public key"},
                {RPCResult::Type::STR_HEX, "limitedid",
                 "A hash of the proof data excluding the master key."},
                {RPCResult::Type::STR_HEX, "proofid",
                 "A hash of the limitedid and master key."},
                {RPCResult::Type::ARR,
                 "stakes",
                 "",
                 {
                     {RPCResult::Type::OBJ,
                      "",
                      "",
                      {
                          {RPCResult::Type::STR_HEX, "txid",
                           "The transaction id"},
                          {RPCResult::Type::NUM, "vout", "The output number"},
                          {RPCResult::Type::STR_AMOUNT, "amount",
                           "The amount in this UTXO"},
                          {RPCResult::Type::NUM, "height",
                           "The height at which this UTXO was mined"},
                          {RPCResult::Type::BOOL, "iscoinbase",
                           "Indicate whether the UTXO is a coinbase"},
                          {RPCResult::Type::STR_HEX, "pubkey",
                           "This UTXO's public key"},
                          {RPCResult::Type::STR, "signature",
                           "Signature of the proofid with this UTXO's private "
                           "key (base64 encoded)"},
                      }},
                 }},
            }},
        RPCExamples{HelpExampleCli("decodeavalancheproof", "\"<hex proof>\"") +
                    HelpExampleRpc("decodeavalancheproof", "\"<hex proof>\"")},
    }
        .Check(request);

    RPCTypeCheck(request.params, {UniValue::VSTR});

    avalanche::Proof proof;
    bilingual_str error;
    if (!avalanche::Proof::FromHex(proof, request.params[0].get_str(), error)) {
        throw JSONRPCError(RPC_DESERIALIZATION_ERROR, error.original);
    }

    UniValue result(UniValue::VOBJ);
    result.pushKV("sequence", proof.getSequence());
    result.pushKV("expiration", proof.getExpirationTime());
    result.pushKV("master", HexStr(proof.getMaster()));
    result.pushKV("limitedid", proof.getLimitedId().ToString());
    result.pushKV("proofid", proof.getId().ToString());

    UniValue stakes(UniValue::VARR);
    for (const avalanche::SignedStake &s : proof.getStakes()) {
        const COutPoint &utxo = s.getStake().getUTXO();
        UniValue stake(UniValue::VOBJ);
        stake.pushKV("txid", utxo.GetTxId().ToString());
        stake.pushKV("vout", uint64_t(utxo.GetN()));
        stake.pushKV("amount", s.getStake().getAmount());
        stake.pushKV("height", uint64_t(s.getStake().getHeight()));
        stake.pushKV("iscoinbase", s.getStake().isCoinbase());
        stake.pushKV("pubkey", HexStr(s.getStake().getPubkey()));
        stake.pushKV("signature", EncodeBase64(s.getSignature()));
        stakes.push_back(stake);
    }
    result.pushKV("stakes", stakes);

    return result;
}

static UniValue delegateavalancheproof(const Config &config,
                                       const JSONRPCRequest &request) {
    RPCHelpMan{
        "delegateavalancheproof",
        "Delegate the avalanche proof to another public key.\n",
        {
            {"limitedproofid", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The limited id of the proof to be delegated."},
            {"privatekey", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The private key in base58-encoding. Must match the proof master "
             "public key or the upper level parent delegation public key if "
             " supplied."},
            {"publickey", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The public key to delegate the proof to."},
            {"delegation", RPCArg::Type::STR_HEX, RPCArg::Optional::OMITTED,
             "A string that is the serialized, hex-encoded delegation for the "
             "proof and which is a parent for the delegation to build."},
        },
        RPCResult{RPCResult::Type::STR_HEX, "delegation",
                  "A string that is a serialized, hex-encoded delegation."},
        RPCExamples{
            HelpExampleRpc("delegateavalancheproof",
                           "\"<limitedproofid>\" \"<privkey>\" \"<pubkey>\"")},
    }
        .Check(request);

    RPCTypeCheck(request.params,
                 {UniValue::VSTR, UniValue::VSTR, UniValue::VSTR});

    if (!g_avalanche) {
        throw JSONRPCError(RPC_INTERNAL_ERROR, "Avalanche is not initialized");
    }

    avalanche::LimitedProofId limitedProofId{
        ParseHashV(request.params[0], "limitedproofid")};

    const CKey privkey = DecodeSecret(request.params[1].get_str());
    if (!privkey.IsValid()) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                           "The private key is invalid");
    }

    const CPubKey pubkey = ParsePubKey(request.params[2]);

    std::unique_ptr<avalanche::DelegationBuilder> dgb;
    if (request.params.size() >= 4 && !request.params[3].isNull()) {
        avalanche::Delegation dg;
        CPubKey auth;
        verifyDelegationOrThrow(dg, request.params[3].get_str(), auth);

        if (dg.getProofId() !=
            limitedProofId.computeProofId(dg.getProofMaster())) {
            throw JSONRPCError(RPC_INVALID_PARAMETER,
                               "The delegation does not match the proof");
        }

        if (privkey.GetPubKey() != auth) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                               "The private key does not match the delegation");
        }

        dgb = std::make_unique<avalanche::DelegationBuilder>(dg);
    } else {
        dgb = std::make_unique<avalanche::DelegationBuilder>(
            limitedProofId, privkey.GetPubKey());
    }

    if (!dgb->addLevel(privkey, pubkey)) {
        throw JSONRPCError(RPC_MISC_ERROR, "Unable to build the delegation");
    }

    CDataStream ss(SER_NETWORK, PROTOCOL_VERSION);
    ss << dgb->build();
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
                    {RPCResult::Type::NUM, "nodecount",
                     "The number of nodes for this peer"},
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

    g_avalanche->withPeerManager([&](const avalanche::PeerManager &pm) {
        pm.forEachPeer([&](const avalanche::Peer &peer) {
            UniValue obj(UniValue::VOBJ);

            CDataStream serproof(SER_NETWORK, PROTOCOL_VERSION);
            serproof << *peer.proof;

            obj.pushKV("peerid", uint64_t(peer.peerid));
            obj.pushKV("proof", HexStr(serproof));

            UniValue nodes(UniValue::VARR);
            pm.forEachNode(peer, [&](const avalanche::Node &n) {
                nodes.push_back(n.nodeid);
            });

            obj.pushKV("nodecount", uint64_t(peer.node_count));
            obj.pushKV("nodes", nodes);

            ret.push_back(obj);
        });
    });

    return ret;
}

static UniValue getrawavalancheproof(const Config &config,
                                     const JSONRPCRequest &request) {
    RPCHelpMan{
        "getrawavalancheproof",
        "Lookup for a known avalanche proof by id.\n",
        {
            {"proofid", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The hex encoded avalanche proof identifier."},
        },
        RPCResult{
            RPCResult::Type::OBJ,
            "",
            "",
            {{
                {RPCResult::Type::STR_HEX, "proof",
                 "The hex encoded proof matching the identifier."},
                {RPCResult::Type::BOOL, "orphan",
                 "Whether the proof is an orphan."},
            }},
        },
        RPCExamples{HelpExampleRpc("getrawavalancheproof", "<proofid>")},
    }
        .Check(request);

    if (!g_avalanche) {
        throw JSONRPCError(RPC_INTERNAL_ERROR, "Avalanche is not initialized");
    }

    const avalanche::ProofId proofid =
        avalanche::ProofId::fromHex(request.params[0].get_str());

    bool isOrphan = false;
    auto proof = g_avalanche->withPeerManager([&](avalanche::PeerManager &pm) {
        auto proof = pm.getProof(proofid);
        if (!proof) {
            proof = pm.getOrphan(proofid);
            isOrphan = true;
        }
        return proof;
    });

    if (!proof) {
        throw JSONRPCError(RPC_INVALID_PARAMETER, "Proof not found");
    }

    UniValue ret(UniValue::VOBJ);

    CDataStream ss(SER_NETWORK, PROTOCOL_VERSION);
    ss << *proof;
    ret.pushKV("proof", HexStr(ss));
    ret.pushKV("orphan", isOrphan);

    return ret;
}

static UniValue sendavalancheproof(const Config &config,
                                   const JSONRPCRequest &request) {
    RPCHelpMan{
        "sendavalancheproof",
        "Broadcast an avalanche proof.\n",
        {
            {"proof", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The avalanche proof to broadcast."},
        },
        RPCResult{RPCResult::Type::BOOL, "success",
                  "Whether the proof was sent successfully or not."},
        RPCExamples{HelpExampleRpc("sendavalancheproof", "<proof>")},
    }
        .Check(request);

    if (!g_avalanche) {
        throw JSONRPCError(RPC_INTERNAL_ERROR, "Avalanche is not initialized");
    }

    auto proof = std::make_shared<avalanche::Proof>();
    NodeContext &node = EnsureNodeContext(request.context);

    // Verify the proof. Note that this is redundant with the verification done
    // when adding the proof to the pool, but we get a chance to give a better
    // error message.
    verifyProofOrThrow(node, *proof, request.params[0].get_str());

    // Add the proof to the pool if we don't have it already. Since the proof
    // verification has already been done, a failure likely indicates that there
    // already is a proof with conflicting utxos.
    const avalanche::ProofId &proofid = proof->getId();
    if (!registerProofIfNeeded(proof)) {
        throw JSONRPCError(
            RPC_INVALID_PARAMETER,
            "The proof has conflicting utxo with an existing proof");
    }

    g_avalanche->withPeerManager(
        [&](avalanche::PeerManager &pm) { pm.addUnbroadcastProof(proofid); });

    RelayProof(proofid, *node.connman);

    return true;
}

static UniValue verifyavalancheproof(const Config &config,
                                     const JSONRPCRequest &request) {
    RPCHelpMan{
        "verifyavalancheproof",
        "Verify an avalanche proof is valid and return the error otherwise.\n",
        {
            {"proof", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "Proof to verify."},
        },
        RPCResult{RPCResult::Type::BOOL, "success",
                  "Whether the proof is valid or not."},
        RPCExamples{HelpExampleRpc("verifyavalancheproof", "\"<proof>\"")},
    }
        .Check(request);

    RPCTypeCheck(request.params, {UniValue::VSTR});

    avalanche::Proof proof;
    verifyProofOrThrow(EnsureNodeContext(request.context), proof,
                       request.params[0].get_str());

    return true;
}

void RegisterAvalancheRPCCommands(CRPCTable &t) {
    // clang-format off
    static const CRPCCommand commands[] = {
        //  category            name                      actor (function)        argNames
        //  ------------------- ------------------------  ----------------------  ----------
        { "avalanche",          "getavalanchekey",        getavalanchekey,        {}},
        { "avalanche",          "addavalanchenode",       addavalanchenode,       {"nodeid"}},
        { "avalanche",          "buildavalancheproof",    buildavalancheproof,    {"sequence", "expiration", "master", "stakes", "payoutAddress"}},
        { "avalanche",          "decodeavalancheproof",   decodeavalancheproof,   {"proof"}},
        { "avalanche",          "delegateavalancheproof", delegateavalancheproof, {"proof", "privatekey", "publickey", "delegation"}},
        { "avalanche",          "getavalanchepeerinfo",   getavalanchepeerinfo,   {}},
        { "avalanche",          "getrawavalancheproof",   getrawavalancheproof,   {"proofid"}},
        { "avalanche",          "sendavalancheproof",     sendavalancheproof,     {"proof"}},
        { "avalanche",          "verifyavalancheproof",   verifyavalancheproof,   {"proof"}},
    };
    // clang-format on

    for (unsigned int vcidx = 0; vcidx < ARRAYLEN(commands); vcidx++) {
        t.appendCommand(commands[vcidx].name, &commands[vcidx]);
    }
}
