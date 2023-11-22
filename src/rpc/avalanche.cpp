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
#include <index/txindex.h>
#include <key_io.h>
#include <net_processing.h>
#include <node/context.h>
#include <policy/block/stakingrewards.h>
#include <rpc/blockchain.h>
#include <rpc/server.h>
#include <rpc/server_util.h>
#include <rpc/util.h>
#include <util/strencodings.h>
#include <util/translation.h>

#include <univalue.h>

using node::GetTransaction;
using node::NodeContext;

static RPCHelpMan getavalanchekey() {
    return RPCHelpMan{
        "getavalanchekey",
        "Returns the key used to sign avalanche messages.\n",
        {},
        RPCResult{RPCResult::Type::STR_HEX, "", ""},
        RPCExamples{HelpExampleRpc("getavalanchekey", "")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            if (!g_avalanche) {
                throw JSONRPCError(RPC_INTERNAL_ERROR,
                                   "Avalanche is not initialized");
            }

            return HexStr(g_avalanche->getSessionPubKey());
        },
    };
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

static bool registerProofIfNeeded(avalanche::ProofRef proof,
                                  avalanche::ProofRegistrationState &state) {
    auto localProof = g_avalanche->getLocalProof();
    if (localProof && localProof->getId() == proof->getId()) {
        return true;
    }

    return g_avalanche->withPeerManager([&](avalanche::PeerManager &pm) {
        return pm.getProof(proof->getId()) ||
               pm.registerProof(std::move(proof), state);
    });
}

static bool registerProofIfNeeded(avalanche::ProofRef proof) {
    avalanche::ProofRegistrationState state;
    return registerProofIfNeeded(std::move(proof), state);
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

    Amount stakeUtxoDustThreshold = avalanche::PROOF_DUST_THRESHOLD;
    if (g_avalanche) {
        // If Avalanche is enabled, use the configured dust threshold
        g_avalanche->withPeerManager([&](avalanche::PeerManager &pm) {
            stakeUtxoDustThreshold = pm.getStakeUtxoDustThreshold();
        });
    }

    avalanche::ProofValidationState state;
    {
        LOCK(cs_main);
        if (!proof.verify(stakeUtxoDustThreshold, *Assert(node.chainman),
                          state)) {
            throw JSONRPCError(RPC_INVALID_PARAMETER,
                               "The proof is invalid: " + state.ToString());
        }
    }
}

static RPCHelpMan addavalanchenode() {
    return RPCHelpMan{
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
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            RPCTypeCheck(request.params,
                         {UniValue::VNUM, UniValue::VSTR, UniValue::VSTR});

            if (!g_avalanche) {
                throw JSONRPCError(RPC_INTERNAL_ERROR,
                                   "Avalanche is not initialized");
            }

            const NodeId nodeid = request.params[0].get_int64();
            CPubKey key = ParsePubKey(request.params[1]);

            auto proof = RCUPtr<avalanche::Proof>::make();
            NodeContext &node = EnsureAnyNodeContext(request.context);
            verifyProofOrThrow(node, *proof, request.params[2].get_str());

            const avalanche::ProofId &proofid = proof->getId();
            if (key != proof->getMaster()) {
                if (request.params.size() < 4 || request.params[3].isNull()) {
                    throw JSONRPCError(
                        RPC_INVALID_ADDRESS_OR_KEY,
                        "The public key does not match the proof");
                }

                avalanche::Delegation dg;
                CPubKey auth;
                verifyDelegationOrThrow(dg, request.params[3].get_str(), auth);

                if (dg.getProofId() != proofid) {
                    throw JSONRPCError(
                        RPC_INVALID_PARAMETER,
                        "The delegation does not match the proof");
                }

                if (key != auth) {
                    throw JSONRPCError(
                        RPC_INVALID_ADDRESS_OR_KEY,
                        "The public key does not match the delegation");
                }
            }

            if (!registerProofIfNeeded(proof)) {
                throw JSONRPCError(RPC_INVALID_PARAMETER,
                                   "The proof has conflicting utxos");
            }

            if (!node.connman->ForNode(nodeid, [&](CNode *pnode) {
                    LOCK(pnode->cs_avalanche_pubkey);
                    bool expected = false;
                    if (pnode->m_avalanche_enabled.compare_exchange_strong(
                            expected, true)) {
                        pnode->m_avalanche_pubkey = std::move(key);
                    }
                    return true;
                })) {
                throw JSONRPCError(
                    RPC_INVALID_PARAMETER,
                    strprintf("The node does not exist: %d", nodeid));
            }

            return g_avalanche->withPeerManager(
                [&](avalanche::PeerManager &pm) {
                    if (!pm.addNode(nodeid, proofid)) {
                        return false;
                    }

                    pm.addUnbroadcastProof(proofid);
                    return true;
                });
        },
    };
}

static RPCHelpMan buildavalancheproof() {
    return RPCHelpMan{
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
                             RPCArg::Default{false},
                             "Indicate wether the UTXO is a coinbase"},
                            {"privatekey", RPCArg::Type::STR,
                             RPCArg::Optional::NO,
                             "private key in base58-encoding"},
                        },
                    },
                },
            },
            {"payoutAddress", RPCArg::Type::STR, RPCArg::Optional::NO,
             "A payout address"},
        },
        RPCResult{RPCResult::Type::STR_HEX, "proof",
                  "A string that is a serialized, hex-encoded proof data."},
        RPCExamples{HelpExampleRpc("buildavalancheproof",
                                   "0 1234567800 \"<master>\" []")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            RPCTypeCheck(request.params, {UniValue::VNUM, UniValue::VNUM,
                                          UniValue::VSTR, UniValue::VARR});

            const uint64_t sequence = request.params[0].get_int64();
            const int64_t expiration = request.params[1].get_int64();

            CKey masterKey = DecodeSecret(request.params[2].get_str());
            if (!masterKey.IsValid()) {
                throw JSONRPCError(RPC_INVALID_PARAMETER, "Invalid master key");
            }

            CTxDestination payoutAddress = DecodeDestination(
                request.params[4].get_str(), config.GetChainParams());

            if (!IsValidDestination(payoutAddress)) {
                throw JSONRPCError(RPC_INVALID_PARAMETER,
                                   "Invalid payout address");
            }

            avalanche::ProofBuilder pb(sequence, expiration, masterKey,
                                       GetScriptForDestination(payoutAddress));

            const UniValue &stakes = request.params[3].get_array();
            for (size_t i = 0; i < stakes.size(); i++) {
                const UniValue &stake = stakes[i];
                RPCTypeCheckObj(
                    stake,
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
                                       "vout cannot be negative");
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

                const Amount amount =
                    AmountFromValue(find_value(stake, "amount"));

                const UniValue &iscbparam = find_value(stake, "iscoinbase");
                const bool iscoinbase =
                    iscbparam.isNull() ? false : iscbparam.get_bool();
                CKey key =
                    DecodeSecret(find_value(stake, "privatekey").get_str());

                if (!key.IsValid()) {
                    throw JSONRPCError(RPC_INVALID_PARAMETER,
                                       "Invalid private key");
                }

                if (!pb.addUTXO(utxo, amount, uint32_t(height), iscoinbase,
                                std::move(key))) {
                    throw JSONRPCError(RPC_INVALID_PARAMETER,
                                       "Duplicated stake");
                }
            }

            const avalanche::ProofRef proof = pb.build();

            return proof->ToHex();
        },
    };
}

static RPCHelpMan decodeavalancheproof() {
    return RPCHelpMan{
        "decodeavalancheproof",
        "Convert a serialized, hex-encoded proof, into JSON object. "
        "The validity of the proof is not verified.\n",
        {
            {"proof", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
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
                {RPCResult::Type::STR, "signature",
                 "The proof signature (base64 encoded)"},
                {RPCResult::Type::OBJ,
                 "payoutscript",
                 "The proof payout script",
                 {
                     {RPCResult::Type::STR, "asm", "Decoded payout script"},
                     {RPCResult::Type::STR_HEX, "hex",
                      "Raw payout script in hex format"},
                     {RPCResult::Type::STR, "type",
                      "The output type (e.g. " + GetAllOutputTypes() + ")"},
                     {RPCResult::Type::NUM, "reqSigs",
                      "The required signatures"},
                     {RPCResult::Type::ARR,
                      "addresses",
                      "",
                      {
                          {RPCResult::Type::STR, "address", "eCash address"},
                      }},
                 }},
                {RPCResult::Type::STR_HEX, "limitedid",
                 "A hash of the proof data excluding the master key."},
                {RPCResult::Type::STR_HEX, "proofid",
                 "A hash of the limitedid and master key."},
                {RPCResult::Type::STR_AMOUNT, "staked_amount",
                 "The total staked amount of this proof in " +
                     Currency::get().ticker + "."},
                {RPCResult::Type::NUM, "score", "The score of this proof."},
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
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            RPCTypeCheck(request.params, {UniValue::VSTR});

            avalanche::Proof proof;
            bilingual_str error;
            if (!avalanche::Proof::FromHex(proof, request.params[0].get_str(),
                                           error)) {
                throw JSONRPCError(RPC_DESERIALIZATION_ERROR, error.original);
            }

            UniValue result(UniValue::VOBJ);
            result.pushKV("sequence", proof.getSequence());
            result.pushKV("expiration", proof.getExpirationTime());
            result.pushKV("master", HexStr(proof.getMaster()));
            result.pushKV("signature", EncodeBase64(proof.getSignature()));

            const auto payoutScript = proof.getPayoutScript();
            UniValue payoutScriptObj(UniValue::VOBJ);
            ScriptPubKeyToUniv(payoutScript, payoutScriptObj,
                               /* fIncludeHex */ true);
            result.pushKV("payoutscript", payoutScriptObj);

            result.pushKV("limitedid", proof.getLimitedId().ToString());
            result.pushKV("proofid", proof.getId().ToString());

            result.pushKV("staked_amount", proof.getStakedAmount());
            result.pushKV("score", uint64_t(proof.getScore()));

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
                // Only PKHash destination is supported, so this is safe
                stake.pushKV("address",
                             EncodeDestination(PKHash(s.getStake().getPubkey()),
                                               config));
                stake.pushKV("signature", EncodeBase64(s.getSignature()));
                stakes.push_back(stake);
            }
            result.pushKV("stakes", stakes);

            return result;
        },
    };
}

static RPCHelpMan delegateavalancheproof() {
    return RPCHelpMan{
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
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            RPCTypeCheck(request.params,
                         {UniValue::VSTR, UniValue::VSTR, UniValue::VSTR});

            if (!g_avalanche) {
                throw JSONRPCError(RPC_INTERNAL_ERROR,
                                   "Avalanche is not initialized");
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
                    throw JSONRPCError(
                        RPC_INVALID_PARAMETER,
                        "The delegation does not match the proof");
                }

                if (privkey.GetPubKey() != auth) {
                    throw JSONRPCError(
                        RPC_INVALID_ADDRESS_OR_KEY,
                        "The private key does not match the delegation");
                }

                dgb = std::make_unique<avalanche::DelegationBuilder>(dg);
            } else {
                dgb = std::make_unique<avalanche::DelegationBuilder>(
                    limitedProofId, privkey.GetPubKey());
            }

            if (!dgb->addLevel(privkey, pubkey)) {
                throw JSONRPCError(RPC_MISC_ERROR,
                                   "Unable to build the delegation");
            }

            CDataStream ss(SER_NETWORK, PROTOCOL_VERSION);
            ss << dgb->build();
            return HexStr(ss);
        },
    };
}

static RPCHelpMan decodeavalanchedelegation() {
    return RPCHelpMan{
        "decodeavalanchedelegation",
        "Convert a serialized, hex-encoded avalanche proof delegation, into "
        "JSON object. \n"
        "The validity of the delegation is not verified.\n",
        {
            {"delegation", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The delegation hex string"},
        },
        RPCResult{
            RPCResult::Type::OBJ,
            "",
            "",
            {
                {RPCResult::Type::STR_HEX, "pubkey",
                 "The public key the proof is delegated to."},
                {RPCResult::Type::STR_HEX, "proofmaster",
                 "The delegated proof master public key."},
                {RPCResult::Type::STR_HEX, "delegationid",
                 "The identifier of this delegation."},
                {RPCResult::Type::STR_HEX, "limitedid",
                 "A delegated proof data hash excluding the master key."},
                {RPCResult::Type::STR_HEX, "proofid",
                 "A hash of the delegated proof limitedid and master key."},
                {RPCResult::Type::NUM, "depth",
                 "The number of delegation levels."},
                {RPCResult::Type::ARR,
                 "levels",
                 "",
                 {
                     {RPCResult::Type::OBJ,
                      "",
                      "",
                      {
                          {RPCResult::Type::NUM, "index",
                           "The index of this delegation level."},
                          {RPCResult::Type::STR_HEX, "pubkey",
                           "This delegated public key for this level"},
                          {RPCResult::Type::STR, "signature",
                           "Signature of this delegation level (base64 "
                           "encoded)"},
                      }},
                 }},
            }},
        RPCExamples{HelpExampleCli("decodeavalanchedelegation",
                                   "\"<hex delegation>\"") +
                    HelpExampleRpc("decodeavalanchedelegation",
                                   "\"<hex delegation>\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            RPCTypeCheck(request.params, {UniValue::VSTR});

            avalanche::Delegation delegation;
            bilingual_str error;
            if (!avalanche::Delegation::FromHex(
                    delegation, request.params[0].get_str(), error)) {
                throw JSONRPCError(RPC_DESERIALIZATION_ERROR, error.original);
            }

            UniValue result(UniValue::VOBJ);
            result.pushKV("pubkey", HexStr(delegation.getDelegatedPubkey()));
            result.pushKV("proofmaster", HexStr(delegation.getProofMaster()));
            result.pushKV("delegationid", delegation.getId().ToString());
            result.pushKV("limitedid",
                          delegation.getLimitedProofId().ToString());
            result.pushKV("proofid", delegation.getProofId().ToString());

            auto levels = delegation.getLevels();
            result.pushKV("depth", uint64_t(levels.size()));

            UniValue levelsArray(UniValue::VARR);
            for (auto &level : levels) {
                UniValue obj(UniValue::VOBJ);
                obj.pushKV("pubkey", HexStr(level.pubkey));
                obj.pushKV("signature", EncodeBase64(level.sig));
                levelsArray.push_back(std::move(obj));
            }
            result.pushKV("levels", levelsArray);

            return result;
        },
    };
}

static RPCHelpMan getavalancheinfo() {
    return RPCHelpMan{
        "getavalancheinfo",
        "Returns an object containing various state info regarding avalanche "
        "networking.\n",
        {},
        RPCResult{
            RPCResult::Type::OBJ,
            "",
            "",
            {
                {RPCResult::Type::BOOL, "ready_to_poll",
                 "Whether the node is ready to start polling and voting."},
                {RPCResult::Type::OBJ,
                 "local",
                 "Only available if -avaproof has been supplied to the node",
                 {
                     {RPCResult::Type::BOOL, "verified",
                      "Whether the node local proof has been locally verified "
                      "or not."},
                     {RPCResult::Type::STR, "verification_status",
                      "The proof verification status. Only available if the "
                      "\"verified\" flag is false."},
                     {RPCResult::Type::BOOL, "sharing",
                      "DEPRECATED: Whether the node local proof is being "
                      "advertised on the network or not. Only displayed if the "
                      "-deprecatedrpc=getavalancheinfo_sharing option is set."},
                     {RPCResult::Type::STR_HEX, "proofid",
                      "The node local proof id."},
                     {RPCResult::Type::STR_HEX, "limited_proofid",
                      "The node local limited proof id."},
                     {RPCResult::Type::STR_HEX, "master",
                      "The node local proof master public key."},
                     {RPCResult::Type::STR, "payout_address",
                      "The node local proof payout address. This might be "
                      "omitted if the payout script is not one of P2PK, P2PKH "
                      "or P2SH, in which case decodeavalancheproof can be used "
                      "to get more details."},
                     {RPCResult::Type::STR_AMOUNT, "stake_amount",
                      "The node local proof staked amount."},
                 }},
                {RPCResult::Type::OBJ,
                 "network",
                 "",
                 {
                     {RPCResult::Type::NUM, "proof_count",
                      "The number of valid avalanche proofs we know exist "
                      "(including this node's local proof if applicable)."},
                     {RPCResult::Type::NUM, "connected_proof_count",
                      "The number of avalanche proofs with at least one node "
                      "we are connected to (including this node's local proof "
                      "if applicable)."},
                     {RPCResult::Type::NUM, "dangling_proof_count",
                      "The number of avalanche proofs with no node attached."},
                     {RPCResult::Type::NUM, "finalized_proof_count",
                      "The number of known avalanche proofs that have been "
                      "finalized by avalanche."},
                     {RPCResult::Type::NUM, "conflicting_proof_count",
                      "The number of known avalanche proofs that conflict with "
                      "valid proofs."},
                     {RPCResult::Type::NUM, "immature_proof_count",
                      "The number of known avalanche proofs that have immature "
                      "utxos."},
                     {RPCResult::Type::STR_AMOUNT, "total_stake_amount",
                      "The total staked amount over all the valid proofs in " +
                          Currency::get().ticker +
                          " (including this node's local proof if "
                          "applicable)."},
                     {RPCResult::Type::STR_AMOUNT, "connected_stake_amount",
                      "The total staked amount over all the connected proofs "
                      "in " +
                          Currency::get().ticker +
                          " (including this node's local proof if "
                          "applicable)."},
                     {RPCResult::Type::STR_AMOUNT, "dangling_stake_amount",
                      "The total staked amount over all the dangling proofs "
                      "in " +
                          Currency::get().ticker +
                          " (including this node's local proof if "
                          "applicable)."},
                     {RPCResult::Type::STR_AMOUNT, "immature_stake_amount",
                      "The total staked amount over all the immature proofs "
                      "in " +
                          Currency::get().ticker +
                          " (including this node's local proof if "
                          "applicable)."},
                     {RPCResult::Type::NUM, "node_count",
                      "The number of avalanche nodes we are connected to "
                      "(including this node if a local proof is set)."},
                     {RPCResult::Type::NUM, "connected_node_count",
                      "The number of avalanche nodes associated with an "
                      "avalanche proof (including this node if a local proof "
                      "is set)."},
                     {RPCResult::Type::NUM, "pending_node_count",
                      "The number of avalanche nodes pending for a proof."},
                 }},
            },
        },
        RPCExamples{HelpExampleCli("getavalancheinfo", "") +
                    HelpExampleRpc("getavalancheinfo", "")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            if (!g_avalanche) {
                throw JSONRPCError(RPC_INTERNAL_ERROR,
                                   "Avalanche is not initialized");
            }

            UniValue ret(UniValue::VOBJ);
            ret.pushKV("ready_to_poll", g_avalanche->isQuorumEstablished());

            auto localProof = g_avalanche->getLocalProof();
            if (localProof != nullptr) {
                UniValue local(UniValue::VOBJ);
                const bool verified = g_avalanche->withPeerManager(
                    [&](const avalanche::PeerManager &pm) {
                        const avalanche::ProofId &proofid = localProof->getId();
                        return pm.isBoundToPeer(proofid);
                    });
                local.pushKV("verified", verified);
                const bool sharing = g_avalanche->canShareLocalProof();
                if (!verified) {
                    avalanche::ProofRegistrationState state =
                        g_avalanche->getLocalProofRegistrationState();
                    // If the local proof is not registered but the state is
                    // valid, no registration attempt occurred yet.
                    local.pushKV("verification_status",
                                 state.IsValid()
                                     ? (sharing ? "pending verification"
                                                : "pending inbound connections")
                                     : state.GetRejectReason());
                }
                if (IsDeprecatedRPCEnabled(gArgs, "getavalancheinfo_sharing")) {
                    local.pushKV("sharing", sharing);
                }
                local.pushKV("proofid", localProof->getId().ToString());
                local.pushKV("limited_proofid",
                             localProof->getLimitedId().ToString());
                local.pushKV("master", HexStr(localProof->getMaster()));
                CTxDestination destination;
                if (ExtractDestination(localProof->getPayoutScript(),
                                       destination)) {
                    local.pushKV("payout_address",
                                 EncodeDestination(destination, config));
                }
                local.pushKV("stake_amount", localProof->getStakedAmount());
                ret.pushKV("local", local);
            }

            g_avalanche->withPeerManager([&](avalanche::PeerManager &pm) {
                UniValue network(UniValue::VOBJ);

                uint64_t proofCount{0};
                uint64_t connectedProofCount{0};
                uint64_t finalizedProofCount{0};
                uint64_t connectedNodeCount{0};
                Amount totalStakes = Amount::zero();
                Amount connectedStakes = Amount::zero();

                pm.forEachPeer([&](const avalanche::Peer &peer) {
                    CHECK_NONFATAL(peer.proof != nullptr);

                    const bool isLocalProof =
                        localProof &&
                        peer.proof->getId() == localProof->getId();

                    ++proofCount;
                    const Amount proofStake = peer.proof->getStakedAmount();

                    totalStakes += proofStake;

                    if (peer.hasFinalized) {
                        ++finalizedProofCount;
                    }

                    if (peer.node_count > 0 || isLocalProof) {
                        ++connectedProofCount;
                        connectedStakes += proofStake;
                    }

                    connectedNodeCount += peer.node_count + isLocalProof;
                });

                Amount immatureStakes = Amount::zero();
                pm.getImmatureProofPool().forEachProof(
                    [&](const avalanche::ProofRef &proof) {
                        immatureStakes += proof->getStakedAmount();
                    });

                network.pushKV("proof_count", proofCount);
                network.pushKV("connected_proof_count", connectedProofCount);
                network.pushKV("dangling_proof_count",
                               proofCount - connectedProofCount);

                network.pushKV("finalized_proof_count", finalizedProofCount);
                network.pushKV(
                    "conflicting_proof_count",
                    uint64_t(pm.getConflictingProofPool().countProofs()));
                network.pushKV(
                    "immature_proof_count",
                    uint64_t(pm.getImmatureProofPool().countProofs()));

                network.pushKV("total_stake_amount", totalStakes);
                network.pushKV("connected_stake_amount", connectedStakes);
                network.pushKV("dangling_stake_amount",
                               totalStakes - connectedStakes);
                network.pushKV("immature_stake_amount", immatureStakes);

                const uint64_t pendingNodes = pm.getPendingNodeCount();
                network.pushKV("node_count", connectedNodeCount + pendingNodes);
                network.pushKV("connected_node_count", connectedNodeCount);
                network.pushKV("pending_node_count", pendingNodes);

                ret.pushKV("network", network);
            });

            return ret;
        },
    };
}

static RPCHelpMan getavalanchepeerinfo() {
    return RPCHelpMan{
        "getavalanchepeerinfo",
        "Returns data about an avalanche peer as a json array of objects. If "
        "no proofid is provided, returns data about all the peers.\n",
        {
            {"proofid", RPCArg::Type::STR_HEX, RPCArg::Optional::OMITTED,
             "The hex encoded avalanche proof identifier."},
        },
        RPCResult{
            RPCResult::Type::ARR,
            "",
            "",
            {{
                RPCResult::Type::OBJ,
                "",
                "",
                {{
                    {RPCResult::Type::NUM, "avalanche_peerid",
                     "The avalanche internal peer identifier"},
                    {RPCResult::Type::NUM, "availability_score",
                     "The agreggated availability score of this peer's nodes"},
                    {RPCResult::Type::STR_HEX, "proofid",
                     "The avalanche proof id used by this peer"},
                    {RPCResult::Type::STR_HEX, "proof",
                     "The avalanche proof used by this peer"},
                    {RPCResult::Type::NUM, "nodecount",
                     "The number of nodes for this peer"},
                    {RPCResult::Type::ARR,
                     "node_list",
                     "",
                     {
                         {RPCResult::Type::NUM, "nodeid",
                          "Node id, as returned by getpeerinfo"},
                     }},
                }},
            }},
        },
        RPCExamples{HelpExampleCli("getavalanchepeerinfo", "") +
                    HelpExampleCli("getavalanchepeerinfo", "\"proofid\"") +
                    HelpExampleRpc("getavalanchepeerinfo", "") +
                    HelpExampleRpc("getavalanchepeerinfo", "\"proofid\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            RPCTypeCheck(request.params, {UniValue::VSTR});

            if (!g_avalanche) {
                throw JSONRPCError(RPC_INTERNAL_ERROR,
                                   "Avalanche is not initialized");
            }

            auto peerToUniv = [](const avalanche::PeerManager &pm,
                                 const avalanche::Peer &peer) {
                UniValue obj(UniValue::VOBJ);

                obj.pushKV("avalanche_peerid", uint64_t(peer.peerid));
                obj.pushKV("availability_score", peer.availabilityScore);
                obj.pushKV("proofid", peer.getProofId().ToString());
                obj.pushKV("proof", peer.proof->ToHex());

                UniValue nodes(UniValue::VARR);
                pm.forEachNode(peer, [&](const avalanche::Node &n) {
                    nodes.push_back(n.nodeid);
                });

                obj.pushKV("nodecount", uint64_t(peer.node_count));
                obj.pushKV("node_list", nodes);

                return obj;
            };

            UniValue ret(UniValue::VARR);

            g_avalanche->withPeerManager([&](const avalanche::PeerManager &pm) {
                // If a proofid is provided, only return the associated peer
                if (!request.params[0].isNull()) {
                    const avalanche::ProofId proofid =
                        avalanche::ProofId::fromHex(
                            request.params[0].get_str());
                    if (!pm.isBoundToPeer(proofid)) {
                        throw JSONRPCError(RPC_INVALID_PARAMETER,
                                           "Proofid not found");
                    }

                    pm.forPeer(proofid, [&](const avalanche::Peer &peer) {
                        return ret.push_back(peerToUniv(pm, peer));
                    });

                    return;
                }

                // If no proofid is provided, return all the peers
                pm.forEachPeer([&](const avalanche::Peer &peer) {
                    ret.push_back(peerToUniv(pm, peer));
                });
            });

            return ret;
        },
    };
}

static RPCHelpMan getavalancheproofs() {
    return RPCHelpMan{
        "getavalancheproofs",
        "Returns an object containing all tracked proofids.\n",
        {},
        RPCResult{
            RPCResult::Type::OBJ,
            "",
            "",
            {
                {RPCResult::Type::ARR,
                 "valid",
                 "",
                 {
                     {RPCResult::Type::STR_HEX, "proofid",
                      "Avalanche proof id"},
                 }},
                {RPCResult::Type::ARR,
                 "conflicting",
                 "",
                 {
                     {RPCResult::Type::STR_HEX, "proofid",
                      "Avalanche proof id"},
                 }},
                {RPCResult::Type::ARR,
                 "immature",
                 "",
                 {
                     {RPCResult::Type::STR_HEX, "proofid",
                      "Avalanche proof id"},
                 }},
            },
        },
        RPCExamples{HelpExampleCli("getavalancheproofs", "") +
                    HelpExampleRpc("getavalancheproofs", "")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            if (!g_avalanche) {
                throw JSONRPCError(RPC_INTERNAL_ERROR,
                                   "Avalanche is not initialized");
            }

            UniValue ret(UniValue::VOBJ);
            g_avalanche->withPeerManager([&](avalanche::PeerManager &pm) {
                auto appendProofIds = [&ret](const avalanche::ProofPool &pool,
                                             const std::string &key) {
                    UniValue arrOut(UniValue::VARR);
                    for (const avalanche::ProofId &proofid :
                         pool.getProofIds()) {
                        arrOut.push_back(proofid.ToString());
                    }
                    ret.pushKV(key, arrOut);
                };

                appendProofIds(pm.getValidProofPool(), "valid");
                appendProofIds(pm.getConflictingProofPool(), "conflicting");
                appendProofIds(pm.getImmatureProofPool(), "immature");
            });

            return ret;
        },
    };
}

static RPCHelpMan getstakingreward() {
    return RPCHelpMan{
        "getstakingreward",
        "Return the staking reward winner based on the previous block hash.\n",
        {
            {"blockhash", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The previous block hash, hex encoded."},
            {"recompute", RPCArg::Type::BOOL, RPCArg::Default{false},
             "Whether to recompute the staking reward winner if there is a "
             "cached value."},
        },
        RPCResult{
            RPCResult::Type::OBJ,
            "payoutscript",
            "The winning proof payout script",
            {
                {RPCResult::Type::STR, "asm", "Decoded payout script"},
                {RPCResult::Type::STR_HEX, "hex",
                 "Raw payout script in hex format"},
                {RPCResult::Type::STR, "type",
                 "The output type (e.g. " + GetAllOutputTypes() + ")"},
                {RPCResult::Type::NUM, "reqSigs", "The required signatures"},
                {RPCResult::Type::ARR,
                 "addresses",
                 "",
                 {
                     {RPCResult::Type::STR, "address", "eCash address"},
                 }},
            }},
        RPCExamples{HelpExampleRpc("getstakingreward", "<blockhash>")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            const NodeContext &node = EnsureAnyNodeContext(request.context);
            ChainstateManager &chainman = EnsureChainman(node);

            const BlockHash blockhash(
                ParseHashV(request.params[0], "blockhash"));

            const CBlockIndex *pprev;
            {
                LOCK(cs_main);
                pprev = chainman.m_blockman.LookupBlockIndex(blockhash);
            }

            if (!pprev) {
                throw JSONRPCError(
                    RPC_INVALID_PARAMETER,
                    strprintf("Block not found: %s\n", blockhash.ToString()));
            }

            if (!IsStakingRewardsActivated(
                    config.GetChainParams().GetConsensus(), pprev)) {
                throw JSONRPCError(
                    RPC_INTERNAL_ERROR,
                    strprintf(
                        "Staking rewards are not activated for block %s\n",
                        blockhash.ToString()));
            }

            if (!request.params[1].isNull() && request.params[1].get_bool()) {
                // Force recompute the staking reward winner by first erasing
                // the cached entry if any
                g_avalanche->eraseStakingRewardWinner(blockhash);
            }

            if (!g_avalanche->computeStakingReward(pprev)) {
                throw JSONRPCError(
                    RPC_INTERNAL_ERROR,
                    strprintf("Unable to determine a staking reward winner "
                              "for block %s\n",
                              blockhash.ToString()));
            }

            CScript winnerPayoutScript;
            if (!g_avalanche->getStakingRewardWinner(blockhash,
                                                     winnerPayoutScript)) {
                throw JSONRPCError(
                    RPC_INTERNAL_ERROR,
                    strprintf("Unable to retrieve the staking reward winner "
                              "for block %s\n",
                              blockhash.ToString()));
            }

            UniValue stakingRewardsPayoutScriptObj(UniValue::VOBJ);
            ScriptPubKeyToUniv(winnerPayoutScript,
                               stakingRewardsPayoutScriptObj,
                               /*fIncludeHex=*/true);
            return stakingRewardsPayoutScriptObj;
        },
    };
}

static RPCHelpMan setstakingreward() {
    return RPCHelpMan{
        "setstakingreward",
        "Set the staking reward winner for the given previous block hash.\n",
        {
            {"blockhash", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The previous block hash, hex encoded."},
            {"payoutscript", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The payout script for the staking reward, hex encoded."},
        },
        RPCResult{RPCResult::Type::BOOL, "success",
                  "Whether the payout script was set or not"},
        RPCExamples{
            HelpExampleRpc("setstakingreward", "<blockhash> <payout script>")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            const NodeContext &node = EnsureAnyNodeContext(request.context);
            ChainstateManager &chainman = EnsureChainman(node);

            const BlockHash blockhash(
                ParseHashV(request.params[0], "blockhash"));

            const CBlockIndex *pprev;
            {
                LOCK(cs_main);
                pprev = chainman.m_blockman.LookupBlockIndex(blockhash);
            }

            if (!pprev) {
                throw JSONRPCError(
                    RPC_INVALID_PARAMETER,
                    strprintf("Block not found: %s\n", blockhash.ToString()));
            }

            if (!IsStakingRewardsActivated(
                    config.GetChainParams().GetConsensus(), pprev)) {
                throw JSONRPCError(
                    RPC_INTERNAL_ERROR,
                    strprintf(
                        "Staking rewards are not activated for block %s\n",
                        blockhash.ToString()));
            }

            const std::vector<uint8_t> data =
                ParseHex(request.params[1].get_str());
            const CScript payoutScript(data.begin(), data.end());

            // This will return true upon insertion or false upon replacement.
            // We want to convey the success of the RPC, so we always return
            // true.
            g_avalanche->setStakingRewardWinner(pprev, payoutScript);
            return true;
        },
    };
}

static RPCHelpMan getremoteproofs() {
    return RPCHelpMan{
        "getremoteproofs",
        "Get the list of remote proofs for the given node id.\n",
        {
            {"nodeid", RPCArg::Type::NUM, RPCArg::Optional::NO,
             "The node identifier."},
        },
        RPCResult{
            RPCResult::Type::ARR,
            "proofs",
            "",
            {{
                RPCResult::Type::OBJ,
                "proof",
                "",
                {{
                    {RPCResult::Type::STR_HEX, "proofid",
                     "The hex encoded proof identifier."},
                    {RPCResult::Type::BOOL, "present",
                     "Whether the node has the proof."},
                    {RPCResult::Type::NUM, "last_update",
                     "The last time this proof status was updated."},
                }},
            }},
        },
        RPCExamples{HelpExampleRpc("getremoteproofs", "<nodeid>")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            if (!g_avalanche) {
                throw JSONRPCError(RPC_INTERNAL_ERROR,
                                   "Avalanche is not initialized");
            }

            const NodeId nodeid = request.params[0].get_int64();
            auto remoteProofs = g_avalanche->withPeerManager(
                [nodeid](const avalanche::PeerManager &pm) {
                    return pm.getRemoteProofs(nodeid);
                });

            UniValue arrOut(UniValue::VARR);

            for (const auto &remoteProof : remoteProofs) {
                UniValue obj(UniValue::VOBJ);
                obj.pushKV("proofid", remoteProof.proofid.ToString());
                obj.pushKV("present", remoteProof.present);
                obj.pushKV("last_update", remoteProof.lastUpdate.count());

                arrOut.push_back(obj);
            }

            return arrOut;
        },
    };
}

static RPCHelpMan getrawavalancheproof() {
    return RPCHelpMan{
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
                {RPCResult::Type::BOOL, "immature",
                 "Whether the proof has immature utxos."},
                {RPCResult::Type::BOOL, "boundToPeer",
                 "Whether the proof is bound to an avalanche peer."},
                {RPCResult::Type::BOOL, "conflicting",
                 "Whether the proof has a conflicting UTXO with an avalanche "
                 "peer."},
                {RPCResult::Type::BOOL, "finalized",
                 "Whether the proof is finalized by vote."},
            }},
        },
        RPCExamples{HelpExampleRpc("getrawavalancheproof", "<proofid>")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            if (!g_avalanche) {
                throw JSONRPCError(RPC_INTERNAL_ERROR,
                                   "Avalanche is not initialized");
            }

            const avalanche::ProofId proofid =
                avalanche::ProofId::fromHex(request.params[0].get_str());

            bool isImmature = false;
            bool isBoundToPeer = false;
            bool conflicting = false;
            bool finalized = false;
            auto proof = g_avalanche->withPeerManager(
                [&](const avalanche::PeerManager &pm) {
                    isImmature = pm.isImmature(proofid);
                    isBoundToPeer = pm.isBoundToPeer(proofid);
                    conflicting = pm.isInConflictingPool(proofid);
                    finalized =
                        pm.forPeer(proofid, [&](const avalanche::Peer &p) {
                            return p.hasFinalized;
                        });
                    return pm.getProof(proofid);
                });

            if (!proof) {
                throw JSONRPCError(RPC_INVALID_PARAMETER, "Proof not found");
            }

            UniValue ret(UniValue::VOBJ);

            CDataStream ss(SER_NETWORK, PROTOCOL_VERSION);
            ss << *proof;
            ret.pushKV("proof", HexStr(ss));
            ret.pushKV("immature", isImmature);
            ret.pushKV("boundToPeer", isBoundToPeer);
            ret.pushKV("conflicting", conflicting);
            ret.pushKV("finalized", finalized);

            return ret;
        },
    };
}

static RPCHelpMan invalidateavalancheproof() {
    return RPCHelpMan{
        "invalidateavalancheproof",
        "Reject a known avalanche proof by id.\n",
        {
            {"proofid", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The hex encoded avalanche proof identifier."},
        },
        RPCResult{
            RPCResult::Type::BOOL,
            "success",
            "",
        },
        RPCExamples{HelpExampleRpc("invalidateavalancheproof", "<proofid>")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            if (!g_avalanche) {
                throw JSONRPCError(RPC_INTERNAL_ERROR,
                                   "Avalanche is not initialized");
            }

            const avalanche::ProofId proofid =
                avalanche::ProofId::fromHex(request.params[0].get_str());

            g_avalanche->withPeerManager([&](avalanche::PeerManager &pm) {
                if (!pm.exists(proofid) && !pm.isDangling(proofid)) {
                    throw JSONRPCError(RPC_INVALID_PARAMETER,
                                       "Proof not found");
                }

                if (!pm.rejectProof(
                        proofid,
                        avalanche::PeerManager::RejectionMode::INVALIDATE)) {
                    throw JSONRPCError(RPC_INTERNAL_ERROR,
                                       "Failed to reject the proof");
                }

                pm.setInvalid(proofid);
            });

            if (g_avalanche->isRecentlyFinalized(proofid)) {
                // If the proof was previously finalized, clear the status.
                // Because there is no way to selectively delete an entry from a
                // Bloom filter, we have to clear the whole filter which could
                // cause extra voting rounds.
                g_avalanche->clearFinalizedItems();
            }

            return true;
        },
    };
}

static RPCHelpMan isfinalblock() {
    return RPCHelpMan{
        "isfinalblock",
        "Check if a block has been finalized by avalanche votes.\n",
        {
            {"blockhash", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The hash of the block."},
        },
        RPCResult{RPCResult::Type::BOOL, "success",
                  "Whether the block has been finalized by avalanche votes."},
        RPCExamples{HelpExampleRpc("isfinalblock", "<block hash>") +
                    HelpExampleCli("isfinalblock", "<block hash>")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            if (!g_avalanche) {
                throw JSONRPCError(RPC_INTERNAL_ERROR,
                                   "Avalanche is not initialized");
            }

            if (!g_avalanche->isQuorumEstablished()) {
                throw JSONRPCError(RPC_MISC_ERROR,
                                   "Avalanche is not ready to poll yet.");
            }

            ChainstateManager &chainman = EnsureAnyChainman(request.context);
            const BlockHash blockhash(
                ParseHashV(request.params[0], "blockhash"));
            const CBlockIndex *pindex;

            {
                LOCK(cs_main);
                pindex = chainman.m_blockman.LookupBlockIndex(blockhash);

                if (!pindex) {
                    throw JSONRPCError(RPC_INVALID_PARAMETER,
                                       "Block not found");
                }
            }

            return chainman.ActiveChainstate().IsBlockAvalancheFinalized(
                pindex);
        },
    };
}

static RPCHelpMan isfinaltransaction() {
    return RPCHelpMan{
        "isfinaltransaction",
        "Check if a transaction has been finalized by avalanche votes.\n",
        {
            {"txid", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The id of the transaction."},
            {"blockhash", RPCArg::Type::STR_HEX, RPCArg::Optional::OMITTED,
             "The block in which to look for the transaction"},
        },
        RPCResult{
            RPCResult::Type::BOOL, "success",
            "Whether the transaction has been finalized by avalanche votes."},
        RPCExamples{HelpExampleRpc("isfinaltransaction", "<txid> <blockhash>") +
                    HelpExampleCli("isfinaltransaction", "<txid> <blockhash>")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            if (!g_avalanche) {
                throw JSONRPCError(RPC_INTERNAL_ERROR,
                                   "Avalanche is not initialized");
            }

            const NodeContext &node = EnsureAnyNodeContext(request.context);
            ChainstateManager &chainman = EnsureChainman(node);
            const TxId txid = TxId(ParseHashV(request.params[0], "txid"));
            CBlockIndex *pindex = nullptr;

            if (!request.params[1].isNull()) {
                const BlockHash blockhash(
                    ParseHashV(request.params[1], "blockhash"));

                LOCK(cs_main);
                pindex = chainman.m_blockman.LookupBlockIndex(blockhash);
                if (!pindex) {
                    throw JSONRPCError(RPC_INVALID_PARAMETER,
                                       "Block not found");
                }
            }

            bool f_txindex_ready = false;
            if (g_txindex && !pindex) {
                f_txindex_ready = g_txindex->BlockUntilSyncedToCurrentChain();
            }

            BlockHash hash_block;
            const CTransactionRef tx = GetTransaction(
                pindex, node.mempool.get(), txid,
                config.GetChainParams().GetConsensus(), hash_block);

            if (!g_avalanche->isQuorumEstablished()) {
                throw JSONRPCError(RPC_MISC_ERROR,
                                   "Avalanche is not ready to poll yet.");
            }

            if (!tx) {
                std::string errmsg;
                if (pindex) {
                    if (WITH_LOCK(::cs_main,
                                  return !pindex->nStatus.hasData())) {
                        throw JSONRPCError(RPC_MISC_ERROR,
                                           "Block data not downloaded yet.");
                    }
                    errmsg = "No such transaction found in the provided block.";
                } else if (!g_txindex) {
                    errmsg = "No such transaction. Use -txindex or provide a "
                             "block "
                             "hash to enable blockchain transaction queries.";
                } else if (!f_txindex_ready) {
                    errmsg = "No such transaction. Blockchain transactions are "
                             "still in the process of being indexed.";
                } else {
                    errmsg = "No such mempool or blockchain transaction.";
                }
                throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY, errmsg);
            }

            if (!pindex) {
                LOCK(cs_main);
                pindex = chainman.m_blockman.LookupBlockIndex(hash_block);
            }

            // The first 2 checks are redundant as we expect to throw a JSON RPC
            // error for these cases, but they are almost free so they are kept
            // as a safety net.
            return tx != nullptr && !node.mempool->exists(txid) &&
                   chainman.ActiveChainstate().IsBlockAvalancheFinalized(
                       pindex);
        },
    };
}

static RPCHelpMan reconsideravalancheproof() {
    return RPCHelpMan{
        "reconsideravalancheproof",
        "Reconsider a known avalanche proof.\n",
        {
            {"proofid", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The hex encoded avalanche proof."},
        },
        RPCResult{
            RPCResult::Type::BOOL,
            "success",
            "Whether the proof has been successfully registered.",
        },
        RPCExamples{HelpExampleRpc("reconsideravalancheproof", "<proof hex>")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            if (!g_avalanche) {
                throw JSONRPCError(RPC_INTERNAL_ERROR,
                                   "Avalanche is not initialized");
            }

            auto proof = RCUPtr<avalanche::Proof>::make();
            NodeContext &node = EnsureAnyNodeContext(request.context);

            // Verify the proof. Note that this is redundant with the
            // verification done when adding the proof to the pool, but we get a
            // chance to give a better error message.
            verifyProofOrThrow(node, *proof, request.params[0].get_str());

            // There is no way to selectively clear the invalidation status of
            // a single proof, so we clear the whole Bloom filter. This could
            // cause extra voting rounds.
            g_avalanche->withPeerManager([&](avalanche::PeerManager &pm) {
                if (pm.isInvalid(proof->getId())) {
                    pm.clearAllInvalid();
                }
            });

            // Add the proof to the pool if we don't have it already. Since the
            // proof verification has already been done, a failure likely
            // indicates that there already is a proof with conflicting utxos.
            avalanche::ProofRegistrationState state;
            if (!registerProofIfNeeded(proof, state)) {
                throw JSONRPCError(RPC_INVALID_PARAMETER,
                                   strprintf("%s (%s)\n",
                                             state.GetRejectReason(),
                                             state.GetDebugMessage()));
            }

            return g_avalanche->withPeerManager(
                [&](const avalanche::PeerManager &pm) {
                    return pm.isBoundToPeer(proof->getId());
                });
        },
    };
}

static RPCHelpMan sendavalancheproof() {
    return RPCHelpMan{
        "sendavalancheproof",
        "Broadcast an avalanche proof.\n",
        {
            {"proof", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The avalanche proof to broadcast."},
        },
        RPCResult{RPCResult::Type::BOOL, "success",
                  "Whether the proof was sent successfully or not."},
        RPCExamples{HelpExampleRpc("sendavalancheproof", "<proof>")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            if (!g_avalanche) {
                throw JSONRPCError(RPC_INTERNAL_ERROR,
                                   "Avalanche is not initialized");
            }

            auto proof = RCUPtr<avalanche::Proof>::make();
            NodeContext &node = EnsureAnyNodeContext(request.context);

            // Verify the proof. Note that this is redundant with the
            // verification done when adding the proof to the pool, but we get a
            // chance to give a better error message.
            verifyProofOrThrow(node, *proof, request.params[0].get_str());

            // Add the proof to the pool if we don't have it already. Since the
            // proof verification has already been done, a failure likely
            // indicates that there already is a proof with conflicting utxos.
            const avalanche::ProofId &proofid = proof->getId();
            avalanche::ProofRegistrationState state;
            if (!registerProofIfNeeded(proof, state)) {
                throw JSONRPCError(RPC_INVALID_PARAMETER,
                                   strprintf("%s (%s)\n",
                                             state.GetRejectReason(),
                                             state.GetDebugMessage()));
            }

            g_avalanche->withPeerManager([&](avalanche::PeerManager &pm) {
                pm.addUnbroadcastProof(proofid);
            });

            if (node.peerman) {
                node.peerman->RelayProof(proofid);
            }

            return true;
        },
    };
}

static RPCHelpMan verifyavalancheproof() {
    return RPCHelpMan{
        "verifyavalancheproof",
        "Verify an avalanche proof is valid and return the error otherwise.\n",
        {
            {"proof", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "Proof to verify."},
        },
        RPCResult{RPCResult::Type::BOOL, "success",
                  "Whether the proof is valid or not."},
        RPCExamples{HelpExampleRpc("verifyavalancheproof", "\"<proof>\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            RPCTypeCheck(request.params, {UniValue::VSTR});

            avalanche::Proof proof;
            verifyProofOrThrow(EnsureAnyNodeContext(request.context), proof,
                               request.params[0].get_str());

            return true;
        },
    };
}

static RPCHelpMan verifyavalanchedelegation() {
    return RPCHelpMan{
        "verifyavalanchedelegation",
        "Verify an avalanche delegation is valid and return the error "
        "otherwise.\n",
        {
            {"delegation", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The avalanche proof delegation to verify."},
        },
        RPCResult{RPCResult::Type::BOOL, "success",
                  "Whether the delegation is valid or not."},
        RPCExamples{HelpExampleRpc("verifyavalanchedelegation", "\"<proof>\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            RPCTypeCheck(request.params, {UniValue::VSTR});

            avalanche::Delegation delegation;
            CPubKey dummy;
            verifyDelegationOrThrow(delegation, request.params[0].get_str(),
                                    dummy);

            return true;
        },
    };
}

void RegisterAvalancheRPCCommands(CRPCTable &t) {
    // clang-format off
    static const CRPCCommand commands[] = {
        //  category           actor (function)
        //  -----------------  --------------------
        { "avalanche",         getavalanchekey,           },
        { "avalanche",         addavalanchenode,          },
        { "avalanche",         buildavalancheproof,       },
        { "avalanche",         decodeavalancheproof,      },
        { "avalanche",         delegateavalancheproof,    },
        { "avalanche",         decodeavalanchedelegation, },
        { "avalanche",         getavalancheinfo,          },
        { "avalanche",         getavalanchepeerinfo,      },
        { "avalanche",         getavalancheproofs,        },
        { "avalanche",         getstakingreward,          },
        { "avalanche",         setstakingreward,          },
        { "avalanche",         getremoteproofs,           },
        { "avalanche",         getrawavalancheproof,      },
        { "avalanche",         invalidateavalancheproof,  },
        { "avalanche",         isfinalblock,              },
        { "avalanche",         isfinaltransaction,        },
        { "avalanche",         reconsideravalancheproof,  },
        { "avalanche",         sendavalancheproof,        },
        { "avalanche",         verifyavalancheproof,      },
        { "avalanche",         verifyavalanchedelegation, },
    };
    // clang-format on

    for (const auto &c : commands) {
        t.appendCommand(c.name, &c);
    }
}
