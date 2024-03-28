// Copyright (c) 2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chain.h>
#include <chainparams.h>
#include <coins.h>
#include <config.h>
#include <consensus/amount.h>
#include <consensus/validation.h>
#include <core_io.h>
#include <index/txindex.h>
#include <key_io.h>
#include <node/blockstorage.h>
#include <node/coin.h>
#include <node/context.h>
#include <node/psbt.h>
#include <node/transaction.h>
#include <policy/packages.h>
#include <policy/policy.h>
#include <primitives/transaction.h>
#include <psbt.h>
#include <random.h>
#include <rpc/blockchain.h>
#include <rpc/rawtransaction_util.h>
#include <rpc/server.h>
#include <rpc/server_util.h>
#include <rpc/util.h>
#include <script/script.h>
#include <script/sign.h>
#include <script/signingprovider.h>
#include <script/standard.h>
#include <txmempool.h>
#include <uint256.h>
#include <util/bip32.h>
#include <util/check.h>
#include <util/error.h>
#include <util/moneystr.h>
#include <util/strencodings.h>
#include <util/string.h>
#include <validation.h>
#include <validationinterface.h>

#include <cstdint>
#include <numeric>

#include <univalue.h>

using node::AnalyzePSBT;
using node::BroadcastTransaction;
using node::DEFAULT_MAX_RAW_TX_FEE_RATE;
using node::FindCoins;
using node::GetTransaction;
using node::NodeContext;
using node::PSBTAnalysis;
using node::ReadBlockFromDisk;

static void TxToJSON(const CTransaction &tx, const BlockHash &hashBlock,
                     UniValue &entry, Chainstate &active_chainstate) {
    // Call into TxToUniv() in bitcoin-common to decode the transaction hex.
    //
    // Blockchain contextual information (confirmations and blocktime) is not
    // available to code in bitcoin-common, so we query them here and push the
    // data into the returned UniValue.
    TxToUniv(tx, BlockHash(), entry, true, RPCSerializationFlags());

    if (!hashBlock.IsNull()) {
        LOCK(cs_main);

        entry.pushKV("blockhash", hashBlock.GetHex());
        const CBlockIndex *pindex =
            active_chainstate.m_blockman.LookupBlockIndex(hashBlock);
        if (pindex) {
            if (active_chainstate.m_chain.Contains(pindex)) {
                entry.pushKV("confirmations",
                             1 + active_chainstate.m_chain.Height() -
                                 pindex->nHeight);
                entry.pushKV("time", pindex->GetBlockTime());
                entry.pushKV("blocktime", pindex->GetBlockTime());
            } else {
                entry.pushKV("confirmations", 0);
            }
        }
    }
}

static RPCHelpMan getrawtransaction() {
    return RPCHelpMan{
        "getrawtransaction",
        "\nReturn the raw transaction data.\n"
        "\nBy default, this call only returns a transaction if it is in the "
        "mempool. If -txindex is enabled\n"
        "and no blockhash argument is passed, it will return the transaction "
        "if it is in the mempool or any block.\n"
        "If a blockhash argument is passed, it will return the transaction if\n"
        "the specified block is available and the transaction is in that "
        "block.\n"
        "\nIf verbose is 'true', returns an Object with information about "
        "'txid'.\n"
        "If verbose is 'false' or omitted, returns a string that is "
        "serialized, hex-encoded data for 'txid'.\n",
        {
            {"txid", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The transaction id"},
            {"verbose", RPCArg::Type::BOOL, RPCArg::Default{false},
             "If false, return a string, otherwise return a json object"},
            {"blockhash", RPCArg::Type::STR_HEX,
             RPCArg::Optional::OMITTED_NAMED_ARG,
             "The block in which to look for the transaction"},
        },
        {
            RPCResult{"if verbose is not set or set to false",
                      RPCResult::Type::STR, "data",
                      "The serialized, hex-encoded data for 'txid'"},
            RPCResult{
                "if verbose is set to true",
                RPCResult::Type::OBJ,
                "",
                "",
                {
                    {RPCResult::Type::BOOL, "in_active_chain",
                     "Whether specified block is in the active chain or not "
                     "(only present with explicit \"blockhash\" argument)"},
                    {RPCResult::Type::STR_HEX, "hex",
                     "The serialized, hex-encoded data for 'txid'"},
                    {RPCResult::Type::STR_HEX, "txid",
                     "The transaction id (same as provided)"},
                    {RPCResult::Type::STR_HEX, "hash", "The transaction hash"},
                    {RPCResult::Type::NUM, "size",
                     "The serialized transaction size"},
                    {RPCResult::Type::NUM, "version", "The version"},
                    {RPCResult::Type::NUM_TIME, "locktime", "The lock time"},
                    {RPCResult::Type::ARR,
                     "vin",
                     "",
                     {
                         {RPCResult::Type::OBJ,
                          "",
                          "",
                          {
                              {RPCResult::Type::STR_HEX, "txid",
                               "The transaction id"},
                              {RPCResult::Type::STR, "vout", ""},
                              {RPCResult::Type::OBJ,
                               "scriptSig",
                               "The script",
                               {
                                   {RPCResult::Type::STR, "asm", "asm"},
                                   {RPCResult::Type::STR_HEX, "hex", "hex"},
                               }},
                              {RPCResult::Type::NUM, "sequence",
                               "The script sequence number"},
                          }},
                     }},
                    {RPCResult::Type::ARR,
                     "vout",
                     "",
                     {
                         {RPCResult::Type::OBJ,
                          "",
                          "",
                          {
                              {RPCResult::Type::NUM, "value",
                               "The value in " + Currency::get().ticker},
                              {RPCResult::Type::NUM, "n", "index"},
                              {RPCResult::Type::OBJ,
                               "scriptPubKey",
                               "",
                               {
                                   {RPCResult::Type::STR, "asm", "the asm"},
                                   {RPCResult::Type::STR, "hex", "the hex"},
                                   {RPCResult::Type::NUM, "reqSigs",
                                    "The required sigs"},
                                   {RPCResult::Type::STR, "type",
                                    "The type, eg 'pubkeyhash'"},
                                   {RPCResult::Type::ARR,
                                    "addresses",
                                    "",
                                    {
                                        {RPCResult::Type::STR, "address",
                                         "bitcoin address"},
                                    }},
                               }},
                          }},
                     }},
                    {RPCResult::Type::STR_HEX, "blockhash", "the block hash"},
                    {RPCResult::Type::NUM, "confirmations",
                     "The confirmations"},
                    {RPCResult::Type::NUM_TIME, "blocktime",
                     "The block time expressed in " + UNIX_EPOCH_TIME},
                    {RPCResult::Type::NUM, "time", "Same as \"blocktime\""},
                }},
        },
        RPCExamples{HelpExampleCli("getrawtransaction", "\"mytxid\"") +
                    HelpExampleCli("getrawtransaction", "\"mytxid\" true") +
                    HelpExampleRpc("getrawtransaction", "\"mytxid\", true") +
                    HelpExampleCli("getrawtransaction",
                                   "\"mytxid\" false \"myblockhash\"") +
                    HelpExampleCli("getrawtransaction",
                                   "\"mytxid\" true \"myblockhash\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            const NodeContext &node = EnsureAnyNodeContext(request.context);
            ChainstateManager &chainman = EnsureChainman(node);

            bool in_active_chain = true;
            TxId txid = TxId(ParseHashV(request.params[0], "parameter 1"));
            const CBlockIndex *blockindex = nullptr;

            const CChainParams &params = config.GetChainParams();
            if (txid == params.GenesisBlock().hashMerkleRoot) {
                // Special exception for the genesis block coinbase transaction
                throw JSONRPCError(
                    RPC_INVALID_ADDRESS_OR_KEY,
                    "The genesis block coinbase is not considered an "
                    "ordinary transaction and cannot be retrieved");
            }

            // Accept either a bool (true) or a num (>=1) to indicate verbose
            // output.
            bool fVerbose = false;
            if (!request.params[1].isNull()) {
                fVerbose = request.params[1].isNum()
                               ? (request.params[1].get_int() != 0)
                               : request.params[1].get_bool();
            }

            if (!request.params[2].isNull()) {
                LOCK(cs_main);

                BlockHash blockhash(
                    ParseHashV(request.params[2], "parameter 3"));
                blockindex = chainman.m_blockman.LookupBlockIndex(blockhash);
                if (!blockindex) {
                    throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                                       "Block hash not found");
                }
                in_active_chain = chainman.ActiveChain().Contains(blockindex);
            }

            bool f_txindex_ready = false;
            if (g_txindex && !blockindex) {
                f_txindex_ready = g_txindex->BlockUntilSyncedToCurrentChain();
            }

            BlockHash hash_block;
            const CTransactionRef tx =
                GetTransaction(blockindex, node.mempool.get(), txid,
                               params.GetConsensus(), hash_block);
            if (!tx) {
                std::string errmsg;
                if (blockindex) {
                    if (WITH_LOCK(::cs_main,
                                  return !blockindex->nStatus.hasData())) {
                        throw JSONRPCError(RPC_MISC_ERROR,
                                           "Block not available");
                    }
                    errmsg = "No such transaction found in the provided block";
                } else if (!g_txindex) {
                    errmsg =
                        "No such mempool transaction. Use -txindex or provide "
                        "a block hash to enable blockchain transaction queries";
                } else if (!f_txindex_ready) {
                    errmsg = "No such mempool transaction. Blockchain "
                             "transactions are still in the process of being "
                             "indexed";
                } else {
                    errmsg = "No such mempool or blockchain transaction";
                }
                throw JSONRPCError(
                    RPC_INVALID_ADDRESS_OR_KEY,
                    errmsg + ". Use gettransaction for wallet transactions.");
            }

            if (!fVerbose) {
                return EncodeHexTx(*tx, RPCSerializationFlags());
            }

            UniValue result(UniValue::VOBJ);
            if (blockindex) {
                result.pushKV("in_active_chain", in_active_chain);
            }
            TxToJSON(*tx, hash_block, result, chainman.ActiveChainstate());
            return result;
        },
    };
}

static RPCHelpMan createrawtransaction() {
    return RPCHelpMan{
        "createrawtransaction",
        "Create a transaction spending the given inputs and creating new "
        "outputs.\n"
        "Outputs can be addresses or data.\n"
        "Returns hex-encoded raw transaction.\n"
        "Note that the transaction's inputs are not signed, and\n"
        "it is not stored in the wallet or transmitted to the network.\n",
        {
            {
                "inputs",
                RPCArg::Type::ARR,
                RPCArg::Optional::NO,
                "The inputs",
                {
                    {
                        "",
                        RPCArg::Type::OBJ,
                        RPCArg::Optional::OMITTED,
                        "",
                        {
                            {"txid", RPCArg::Type::STR_HEX,
                             RPCArg::Optional::NO, "The transaction id"},
                            {"vout", RPCArg::Type::NUM, RPCArg::Optional::NO,
                             "The output number"},
                            {"sequence", RPCArg::Type::NUM,
                             RPCArg::DefaultHint{"depends on the value of the "
                                                 "'locktime' argument"},
                             "The sequence number"},
                        },
                    },
                },
            },
            {
                "outputs",
                RPCArg::Type::ARR,
                RPCArg::Optional::NO,
                "The outputs (key-value pairs), where none of "
                "the keys are duplicated.\n"
                "That is, each address can only appear once and there can only "
                "be one 'data' object.\n"
                "For compatibility reasons, a dictionary, which holds the "
                "key-value pairs directly, is also\n"
                "                             accepted as second parameter.",
                {
                    {
                        "",
                        RPCArg::Type::OBJ,
                        RPCArg::Optional::OMITTED,
                        "",
                        {
                            {"address", RPCArg::Type::AMOUNT,
                             RPCArg::Optional::NO,
                             "A key-value pair. The key (string) is the "
                             "bitcoin address, the value (float or string) is "
                             "the amount in " +
                                 Currency::get().ticker},
                        },
                    },
                    {
                        "",
                        RPCArg::Type::OBJ,
                        RPCArg::Optional::OMITTED,
                        "",
                        {
                            {"data", RPCArg::Type::STR_HEX,
                             RPCArg::Optional::NO,
                             "A key-value pair. The key must be \"data\", the "
                             "value is hex-encoded data"},
                        },
                    },
                },
            },
            {"locktime", RPCArg::Type::NUM, RPCArg::Default{0},
             "Raw locktime. Non-0 value also locktime-activates inputs"},
        },
        RPCResult{RPCResult::Type::STR_HEX, "transaction",
                  "hex string of the transaction"},
        RPCExamples{
            HelpExampleCli("createrawtransaction",
                           "\"[{\\\"txid\\\":\\\"myid\\\",\\\"vout\\\":0}]"
                           "\" \"[{\\\"address\\\":10000.00}]\"") +
            HelpExampleCli("createrawtransaction",
                           "\"[{\\\"txid\\\":\\\"myid\\\",\\\"vout\\\":0}]"
                           "\" \"[{\\\"data\\\":\\\"00010203\\\"}]\"") +
            HelpExampleRpc("createrawtransaction",
                           "\"[{\\\"txid\\\":\\\"myid\\\",\\\"vout\\\":0}]"
                           "\", \"[{\\\"address\\\":10000.00}]\"") +
            HelpExampleRpc("createrawtransaction",
                           "\"[{\\\"txid\\\":\\\"myid\\\",\\\"vout\\\":0}]"
                           "\", \"[{\\\"data\\\":\\\"00010203\\\"}]\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            RPCTypeCheck(request.params,
                         {UniValue::VARR,
                          UniValueType(), // ARR or OBJ, checked later
                          UniValue::VNUM},
                         true);

            CMutableTransaction rawTx =
                ConstructTransaction(config.GetChainParams(), request.params[0],
                                     request.params[1], request.params[2]);

            return EncodeHexTx(CTransaction(rawTx));
        },
    };
}

static RPCHelpMan decoderawtransaction() {
    return RPCHelpMan{
        "decoderawtransaction",
        "Return a JSON object representing the serialized, hex-encoded "
        "transaction.\n",
        {
            {"hexstring", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The transaction hex string"},
        },
        RPCResult{
            RPCResult::Type::OBJ,
            "",
            "",
            {
                {RPCResult::Type::STR_HEX, "txid", "The transaction id"},
                {RPCResult::Type::STR_HEX, "hash", "The transaction hash"},
                {RPCResult::Type::NUM, "size", "The transaction size"},
                {RPCResult::Type::NUM, "version", "The version"},
                {RPCResult::Type::NUM_TIME, "locktime", "The lock time"},
                {RPCResult::Type::ARR,
                 "vin",
                 "",
                 {
                     {RPCResult::Type::OBJ,
                      "",
                      "",
                      {
                          {RPCResult::Type::STR_HEX, "txid",
                           "The transaction id"},
                          {RPCResult::Type::NUM, "vout", "The output number"},
                          {RPCResult::Type::OBJ,
                           "scriptSig",
                           "The script",
                           {
                               {RPCResult::Type::STR, "asm", "asm"},
                               {RPCResult::Type::STR_HEX, "hex", "hex"},
                           }},
                          {RPCResult::Type::NUM, "sequence",
                           "The script sequence number"},
                      }},
                 }},
                {RPCResult::Type::ARR,
                 "vout",
                 "",
                 {
                     {RPCResult::Type::OBJ,
                      "",
                      "",
                      {
                          {RPCResult::Type::NUM, "value",
                           "The value in " + Currency::get().ticker},
                          {RPCResult::Type::NUM, "n", "index"},
                          {RPCResult::Type::OBJ,
                           "scriptPubKey",
                           "",
                           {
                               {RPCResult::Type::STR, "asm", "the asm"},
                               {RPCResult::Type::STR_HEX, "hex", "the hex"},
                               {RPCResult::Type::NUM, "reqSigs",
                                "The required sigs"},
                               {RPCResult::Type::STR, "type",
                                "The type, eg 'pubkeyhash'"},
                               {RPCResult::Type::ARR,
                                "addresses",
                                "",
                                {
                                    {RPCResult::Type::STR, "address",
                                     "bitcoin address"},
                                }},
                           }},
                      }},
                 }},
            }},
        RPCExamples{HelpExampleCli("decoderawtransaction", "\"hexstring\"") +
                    HelpExampleRpc("decoderawtransaction", "\"hexstring\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            RPCTypeCheck(request.params, {UniValue::VSTR});

            CMutableTransaction mtx;

            if (!DecodeHexTx(mtx, request.params[0].get_str())) {
                throw JSONRPCError(RPC_DESERIALIZATION_ERROR,
                                   "TX decode failed");
            }

            UniValue result(UniValue::VOBJ);
            TxToUniv(CTransaction(std::move(mtx)), BlockHash(), result, false);

            return result;
        },
    };
}

static RPCHelpMan decodescript() {
    return RPCHelpMan{
        "decodescript",
        "Decode a hex-encoded script.\n",
        {
            {"hexstring", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "the hex-encoded script"},
        },
        RPCResult{
            RPCResult::Type::OBJ,
            "",
            "",
            {
                {RPCResult::Type::STR, "asm", "Script public key"},
                {RPCResult::Type::STR, "type",
                 "The output type (e.g. " + GetAllOutputTypes() + ")"},
                {RPCResult::Type::NUM, "reqSigs", "The required signatures"},
                {RPCResult::Type::ARR,
                 "addresses",
                 "",
                 {
                     {RPCResult::Type::STR, "address", "bitcoin address"},
                 }},
                {RPCResult::Type::STR, "p2sh",
                 "address of P2SH script wrapping this redeem script (not "
                 "returned if the script is already a P2SH)"},
            }},
        RPCExamples{HelpExampleCli("decodescript", "\"hexstring\"") +
                    HelpExampleRpc("decodescript", "\"hexstring\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            RPCTypeCheck(request.params, {UniValue::VSTR});

            UniValue r(UniValue::VOBJ);
            CScript script;
            if (request.params[0].get_str().size() > 0) {
                std::vector<uint8_t> scriptData(
                    ParseHexV(request.params[0], "argument"));
                script = CScript(scriptData.begin(), scriptData.end());
            } else {
                // Empty scripts are valid.
            }

            ScriptPubKeyToUniv(script, r, /* fIncludeHex */ false);

            UniValue type;
            type = r.find_value("type");

            if (type.isStr() && type.get_str() != "scripthash") {
                // P2SH cannot be wrapped in a P2SH. If this script is already a
                // P2SH, don't return the address for a P2SH of the P2SH.
                r.pushKV("p2sh", EncodeDestination(ScriptHash(script), config));
            }

            return r;
        },
    };
}

static RPCHelpMan combinerawtransaction() {
    return RPCHelpMan{
        "combinerawtransaction",
        "Combine multiple partially signed transactions into one "
        "transaction.\n"
        "The combined transaction may be another partially signed transaction "
        "or a \n"
        "fully signed transaction.",
        {
            {
                "txs",
                RPCArg::Type::ARR,
                RPCArg::Optional::NO,
                "The hex strings of partially signed "
                "transactions",
                {
                    {"hexstring", RPCArg::Type::STR_HEX,
                     RPCArg::Optional::OMITTED,
                     "A hex-encoded raw transaction"},
                },
            },
        },
        RPCResult{RPCResult::Type::STR, "",
                  "The hex-encoded raw transaction with signature(s)"},
        RPCExamples{HelpExampleCli("combinerawtransaction",
                                   R"('["myhex1", "myhex2", "myhex3"]')")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            UniValue txs = request.params[0].get_array();
            std::vector<CMutableTransaction> txVariants(txs.size());

            for (unsigned int idx = 0; idx < txs.size(); idx++) {
                if (!DecodeHexTx(txVariants[idx], txs[idx].get_str())) {
                    throw JSONRPCError(
                        RPC_DESERIALIZATION_ERROR,
                        strprintf("TX decode failed for tx %d", idx));
                }
            }

            if (txVariants.empty()) {
                throw JSONRPCError(RPC_DESERIALIZATION_ERROR,
                                   "Missing transactions");
            }

            // mergedTx will end up with all the signatures; it
            // starts as a clone of the rawtx:
            CMutableTransaction mergedTx(txVariants[0]);

            // Fetch previous transactions (inputs):
            CCoinsView viewDummy;
            CCoinsViewCache view(&viewDummy);
            {
                NodeContext &node = EnsureAnyNodeContext(request.context);
                const CTxMemPool &mempool = EnsureMemPool(node);
                ChainstateManager &chainman = EnsureChainman(node);
                LOCK2(cs_main, mempool.cs);
                CCoinsViewCache &viewChain =
                    chainman.ActiveChainstate().CoinsTip();
                CCoinsViewMemPool viewMempool(&viewChain, mempool);
                // temporarily switch cache backend to db+mempool view
                view.SetBackend(viewMempool);

                for (const CTxIn &txin : mergedTx.vin) {
                    // Load entries from viewChain into view; can fail.
                    view.AccessCoin(txin.prevout);
                }

                // switch back to avoid locking mempool for too long
                view.SetBackend(viewDummy);
            }

            // Use CTransaction for the constant parts of the
            // transaction to avoid rehashing.
            const CTransaction txConst(mergedTx);
            // Sign what we can:
            for (size_t i = 0; i < mergedTx.vin.size(); i++) {
                CTxIn &txin = mergedTx.vin[i];
                const Coin &coin = view.AccessCoin(txin.prevout);
                if (coin.IsSpent()) {
                    throw JSONRPCError(RPC_VERIFY_ERROR,
                                       "Input not found or already spent");
                }
                SignatureData sigdata;

                const CTxOut &txout = coin.GetTxOut();

                // ... and merge in other signatures:
                for (const CMutableTransaction &txv : txVariants) {
                    if (txv.vin.size() > i) {
                        sigdata.MergeSignatureData(
                            DataFromTransaction(txv, i, txout));
                    }
                }
                ProduceSignature(DUMMY_SIGNING_PROVIDER,
                                 MutableTransactionSignatureCreator(
                                     &mergedTx, i, txout.nValue),
                                 txout.scriptPubKey, sigdata);

                UpdateInput(txin, sigdata);
            }

            return EncodeHexTx(CTransaction(mergedTx));
        },
    };
}

static RPCHelpMan signrawtransactionwithkey() {
    return RPCHelpMan{
        "signrawtransactionwithkey",
        "Sign inputs for raw transaction (serialized, hex-encoded).\n"
        "The second argument is an array of base58-encoded private\n"
        "keys that will be the only keys used to sign the transaction.\n"
        "The third optional argument (may be null) is an array of previous "
        "transaction outputs that\n"
        "this transaction depends on but may not yet be in the block chain.\n",
        {
            {"hexstring", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The transaction hex string"},
            {
                "privkeys",
                RPCArg::Type::ARR,
                RPCArg::Optional::NO,
                "The base58-encoded private keys for signing",
                {
                    {"privatekey", RPCArg::Type::STR, RPCArg::Optional::OMITTED,
                     "private key in base58-encoding"},
                },
            },
            {
                "prevtxs",
                RPCArg::Type::ARR,
                RPCArg::Optional::OMITTED_NAMED_ARG,
                "The previous dependent transaction outputs",
                {
                    {
                        "",
                        RPCArg::Type::OBJ,
                        RPCArg::Optional::OMITTED,
                        "",
                        {
                            {"txid", RPCArg::Type::STR_HEX,
                             RPCArg::Optional::NO, "The transaction id"},
                            {"vout", RPCArg::Type::NUM, RPCArg::Optional::NO,
                             "The output number"},
                            {"scriptPubKey", RPCArg::Type::STR_HEX,
                             RPCArg::Optional::NO, "script key"},
                            {"redeemScript", RPCArg::Type::STR_HEX,
                             RPCArg::Optional::OMITTED,
                             "(required for P2SH) redeem script"},
                            {"amount", RPCArg::Type::AMOUNT,
                             RPCArg::Optional::NO, "The amount spent"},
                        },
                    },
                },
            },
            {"sighashtype", RPCArg::Type::STR, RPCArg::Default{"ALL|FORKID"},
             "The signature hash type. Must be one of:\n"
             "       \"ALL|FORKID\"\n"
             "       \"NONE|FORKID\"\n"
             "       \"SINGLE|FORKID\"\n"
             "       \"ALL|FORKID|ANYONECANPAY\"\n"
             "       \"NONE|FORKID|ANYONECANPAY\"\n"
             "       \"SINGLE|FORKID|ANYONECANPAY\""},
        },
        RPCResult{
            RPCResult::Type::OBJ,
            "",
            "",
            {
                {RPCResult::Type::STR_HEX, "hex",
                 "The hex-encoded raw transaction with signature(s)"},
                {RPCResult::Type::BOOL, "complete",
                 "If the transaction has a complete set of signatures"},
                {RPCResult::Type::ARR,
                 "errors",
                 /* optional */ true,
                 "Script verification errors (if there are any)",
                 {
                     {RPCResult::Type::OBJ,
                      "",
                      "",
                      {
                          {RPCResult::Type::STR_HEX, "txid",
                           "The hash of the referenced, previous transaction"},
                          {RPCResult::Type::NUM, "vout",
                           "The index of the output to spent and used as "
                           "input"},
                          {RPCResult::Type::STR_HEX, "scriptSig",
                           "The hex-encoded signature script"},
                          {RPCResult::Type::NUM, "sequence",
                           "Script sequence number"},
                          {RPCResult::Type::STR, "error",
                           "Verification or signing error related to the "
                           "input"},
                      }},
                 }},
            }},
        RPCExamples{
            HelpExampleCli("signrawtransactionwithkey",
                           "\"myhex\" \"[\\\"key1\\\",\\\"key2\\\"]\"") +
            HelpExampleRpc("signrawtransactionwithkey",
                           "\"myhex\", \"[\\\"key1\\\",\\\"key2\\\"]\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            RPCTypeCheck(request.params,
                         {UniValue::VSTR, UniValue::VARR, UniValue::VARR,
                          UniValue::VSTR},
                         true);

            CMutableTransaction mtx;
            if (!DecodeHexTx(mtx, request.params[0].get_str())) {
                throw JSONRPCError(RPC_DESERIALIZATION_ERROR,
                                   "TX decode failed");
            }

            FillableSigningProvider keystore;
            const UniValue &keys = request.params[1].get_array();
            for (size_t idx = 0; idx < keys.size(); ++idx) {
                UniValue k = keys[idx];
                CKey key = DecodeSecret(k.get_str());
                if (!key.IsValid()) {
                    throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                                       "Invalid private key");
                }
                keystore.AddKey(key);
            }

            // Fetch previous transactions (inputs):
            std::map<COutPoint, Coin> coins;
            for (const CTxIn &txin : mtx.vin) {
                // Create empty map entry keyed by prevout.
                coins[txin.prevout];
            }
            NodeContext &node = EnsureAnyNodeContext(request.context);
            FindCoins(node, coins);

            // Parse the prevtxs array
            ParsePrevouts(request.params[2], &keystore, coins);

            UniValue result(UniValue::VOBJ);
            SignTransaction(mtx, &keystore, coins, request.params[3], result);
            return result;
        },
    };
}

static RPCHelpMan sendrawtransaction() {
    return RPCHelpMan{
        "sendrawtransaction",
        "Submits raw transaction (serialized, hex-encoded) to local node and "
        "network.\n"
        "\nAlso see createrawtransaction and "
        "signrawtransactionwithkey calls.\n",
        {
            {"hexstring", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The hex string of the raw transaction"},
            {"maxfeerate", RPCArg::Type::AMOUNT,
             RPCArg::Default{
                 FormatMoney(DEFAULT_MAX_RAW_TX_FEE_RATE.GetFeePerK())},
             "Reject transactions whose fee rate is higher than the specified "
             "value, expressed in " +
                 Currency::get().ticker +
                 "/kB\nSet to 0 to accept any fee rate.\n"},
        },
        RPCResult{RPCResult::Type::STR_HEX, "", "The transaction hash in hex"},
        RPCExamples{
            "\nCreate a transaction\n" +
            HelpExampleCli(
                "createrawtransaction",
                "\"[{\\\"txid\\\" : \\\"mytxid\\\",\\\"vout\\\":0}]\" "
                "\"{\\\"myaddress\\\":10000}\"") +
            "Sign the transaction, and get back the hex\n" +
            HelpExampleCli("signrawtransactionwithwallet", "\"myhex\"") +
            "\nSend the transaction (signed hex)\n" +
            HelpExampleCli("sendrawtransaction", "\"signedhex\"") +
            "\nAs a JSON-RPC call\n" +
            HelpExampleRpc("sendrawtransaction", "\"signedhex\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            RPCTypeCheck(request.params,
                         {
                             UniValue::VSTR,
                             // VNUM or VSTR, checked inside AmountFromValue()
                             UniValueType(),
                         });

            // parse hex string from parameter
            CMutableTransaction mtx;
            if (!DecodeHexTx(mtx, request.params[0].get_str())) {
                throw JSONRPCError(RPC_DESERIALIZATION_ERROR,
                                   "TX decode failed");
            }

            CTransactionRef tx(MakeTransactionRef(std::move(mtx)));

            const CFeeRate max_raw_tx_fee_rate =
                request.params[1].isNull()
                    ? DEFAULT_MAX_RAW_TX_FEE_RATE
                    : CFeeRate(AmountFromValue(request.params[1]));

            int64_t virtual_size = GetVirtualTransactionSize(*tx);
            Amount max_raw_tx_fee = max_raw_tx_fee_rate.GetFee(virtual_size);

            std::string err_string;
            AssertLockNotHeld(cs_main);
            NodeContext &node = EnsureAnyNodeContext(request.context);
            const TransactionError err = BroadcastTransaction(
                node, tx, err_string, max_raw_tx_fee, /*relay*/ true,
                /*wait_callback*/ true);
            if (err != TransactionError::OK) {
                throw JSONRPCTransactionError(err, err_string);
            }

            // Block to make sure wallet/indexers sync before returning
            SyncWithValidationInterfaceQueue();

            return tx->GetHash().GetHex();
        },
    };
}

static RPCHelpMan testmempoolaccept() {
    return RPCHelpMan{
        "testmempoolaccept",
        "\nReturns result of mempool acceptance tests indicating if raw "
        "transaction(s) (serialized, hex-encoded) would be accepted by "
        "mempool.\n"
        "\nIf multiple transactions are passed in, parents must come before "
        "children and package policies apply: the transactions cannot conflict "
        "with any mempool transactions or each other.\n"
        "\nIf one transaction fails, other transactions may not be fully "
        "validated (the 'allowed' key will be blank).\n"
        "\nThe maximum number of transactions allowed is " +
            ToString(MAX_PACKAGE_COUNT) +
            ".\n"
            "\nThis checks if transactions violate the consensus or policy "
            "rules.\n"
            "\nSee sendrawtransaction call.\n",
        {
            {
                "rawtxs",
                RPCArg::Type::ARR,
                RPCArg::Optional::NO,
                "An array of hex strings of raw transactions.",
                {
                    {"rawtx", RPCArg::Type::STR_HEX, RPCArg::Optional::OMITTED,
                     ""},
                },
            },
            {"maxfeerate", RPCArg::Type::AMOUNT,
             RPCArg::Default{
                 FormatMoney(DEFAULT_MAX_RAW_TX_FEE_RATE.GetFeePerK())},
             "Reject transactions whose fee rate is higher than the specified "
             "value, expressed in " +
                 Currency::get().ticker + "/kB\n"},
        },
        RPCResult{
            RPCResult::Type::ARR,
            "",
            "The result of the mempool acceptance test for each raw "
            "transaction in the input array.\n"
            "Returns results for each transaction in the same order they were "
            "passed in.\n"
            "Transactions that cannot be fully validated due to failures in "
            "other transactions will not contain an 'allowed' result.\n",
            {
                {RPCResult::Type::OBJ,
                 "",
                 "",
                 {
                     {RPCResult::Type::STR_HEX, "txid",
                      "The transaction hash in hex"},
                     {RPCResult::Type::STR, "package-error",
                      "Package validation error, if any (only possible if "
                      "rawtxs had more than 1 transaction)."},
                     {RPCResult::Type::BOOL, "allowed",
                      "Whether this tx would be accepted to the mempool and "
                      "pass client-specified maxfeerate. "
                      "If not present, the tx was not fully validated due to a "
                      "failure in another tx in the list."},
                     {RPCResult::Type::NUM, "size", "The transaction size"},
                     {RPCResult::Type::OBJ,
                      "fees",
                      "Transaction fees (only present if 'allowed' is true)",
                      {
                          {RPCResult::Type::STR_AMOUNT, "base",
                           "transaction fee in " + Currency::get().ticker},
                      }},
                     {RPCResult::Type::STR, "reject-reason",
                      "Rejection string (only present when 'allowed' is "
                      "false)"},
                 }},
            }},
        RPCExamples{
            "\nCreate a transaction\n" +
            HelpExampleCli(
                "createrawtransaction",
                "\"[{\\\"txid\\\" : \\\"mytxid\\\",\\\"vout\\\":0}]\" "
                "\"{\\\"myaddress\\\":10000}\"") +
            "Sign the transaction, and get back the hex\n" +
            HelpExampleCli("signrawtransactionwithwallet", "\"myhex\"") +
            "\nTest acceptance of the transaction (signed hex)\n" +
            HelpExampleCli("testmempoolaccept", R"('["signedhex"]')") +
            "\nAs a JSON-RPC call\n" +
            HelpExampleRpc("testmempoolaccept", "[\"signedhex\"]")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            RPCTypeCheck(request.params,
                         {
                             UniValue::VARR,
                             // VNUM or VSTR, checked inside AmountFromValue()
                             UniValueType(),
                         });
            const UniValue raw_transactions = request.params[0].get_array();
            if (raw_transactions.size() < 1 ||
                raw_transactions.size() > MAX_PACKAGE_COUNT) {
                throw JSONRPCError(RPC_INVALID_PARAMETER,
                                   "Array must contain between 1 and " +
                                       ToString(MAX_PACKAGE_COUNT) +
                                       " transactions.");
            }

            const CFeeRate max_raw_tx_fee_rate =
                request.params[1].isNull()
                    ? DEFAULT_MAX_RAW_TX_FEE_RATE
                    : CFeeRate(AmountFromValue(request.params[1]));

            std::vector<CTransactionRef> txns;
            txns.reserve(raw_transactions.size());
            for (const auto &rawtx : raw_transactions.getValues()) {
                CMutableTransaction mtx;
                if (!DecodeHexTx(mtx, rawtx.get_str())) {
                    throw JSONRPCError(RPC_DESERIALIZATION_ERROR,
                                       "TX decode failed: " + rawtx.get_str());
                }
                txns.emplace_back(MakeTransactionRef(std::move(mtx)));
            }

            NodeContext &node = EnsureAnyNodeContext(request.context);
            CTxMemPool &mempool = EnsureMemPool(node);
            ChainstateManager &chainman = EnsureChainman(node);
            Chainstate &chainstate = chainman.ActiveChainstate();
            const PackageMempoolAcceptResult package_result = [&] {
                LOCK(::cs_main);
                if (txns.size() > 1) {
                    return ProcessNewPackage(chainstate, mempool, txns,
                                             /* test_accept */ true);
                }
                return PackageMempoolAcceptResult(
                    txns[0]->GetId(),
                    chainman.ProcessTransaction(txns[0],
                                                /* test_accept*/ true));
            }();

            UniValue rpc_result(UniValue::VARR);
            // We will check transaction fees while we iterate through txns in
            // order. If any transaction fee exceeds maxfeerate, we will leave
            // the rest of the validation results blank, because it doesn't make
            // sense to return a validation result for a transaction if its
            // ancestor(s) would not be submitted.
            bool exit_early{false};
            for (const auto &tx : txns) {
                UniValue result_inner(UniValue::VOBJ);
                result_inner.pushKV("txid", tx->GetId().GetHex());
                if (package_result.m_state.GetResult() ==
                    PackageValidationResult::PCKG_POLICY) {
                    result_inner.pushKV(
                        "package-error",
                        package_result.m_state.GetRejectReason());
                }
                auto it = package_result.m_tx_results.find(tx->GetId());
                if (exit_early || it == package_result.m_tx_results.end()) {
                    // Validation unfinished. Just return the txid.
                    rpc_result.push_back(result_inner);
                    continue;
                }
                const auto &tx_result = it->second;
                // Package testmempoolaccept doesn't allow transactions to
                // already be in the mempool.
                CHECK_NONFATAL(tx_result.m_result_type !=
                               MempoolAcceptResult::ResultType::MEMPOOL_ENTRY);
                if (tx_result.m_result_type ==
                    MempoolAcceptResult::ResultType::VALID) {
                    const Amount fee = tx_result.m_base_fees.value();
                    // Check that fee does not exceed maximum fee
                    const int64_t virtual_size = tx_result.m_vsize.value();
                    const Amount max_raw_tx_fee =
                        max_raw_tx_fee_rate.GetFee(virtual_size);
                    if (max_raw_tx_fee != Amount::zero() &&
                        fee > max_raw_tx_fee) {
                        result_inner.pushKV("allowed", false);
                        result_inner.pushKV("reject-reason",
                                            "max-fee-exceeded");
                        exit_early = true;
                    } else {
                        // Only return the fee and size if the transaction
                        // would pass ATMP.
                        // These can be used to calculate the feerate.
                        result_inner.pushKV("allowed", true);
                        result_inner.pushKV("size", virtual_size);
                        UniValue fees(UniValue::VOBJ);
                        fees.pushKV("base", fee);
                        result_inner.pushKV("fees", fees);
                    }
                } else {
                    result_inner.pushKV("allowed", false);
                    const TxValidationState state = tx_result.m_state;
                    if (state.GetResult() ==
                        TxValidationResult::TX_MISSING_INPUTS) {
                        result_inner.pushKV("reject-reason", "missing-inputs");
                    } else {
                        result_inner.pushKV("reject-reason",
                                            state.GetRejectReason());
                    }
                }
                rpc_result.push_back(result_inner);
            }
            return rpc_result;
        },
    };
}

static RPCHelpMan decodepsbt() {
    return RPCHelpMan{
        "decodepsbt",
        "Return a JSON object representing the serialized, base64-encoded "
        "partially signed Bitcoin transaction.\n",
        {
            {"psbt", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The PSBT base64 string"},
        },
        RPCResult{
            RPCResult::Type::OBJ,
            "",
            "",
            {
                {RPCResult::Type::OBJ,
                 "tx",
                 "The decoded network-serialized unsigned transaction.",
                 {
                     {RPCResult::Type::ELISION, "",
                      "The layout is the same as the output of "
                      "decoderawtransaction."},
                 }},
                {RPCResult::Type::OBJ_DYN,
                 "unknown",
                 "The unknown global fields",
                 {
                     {RPCResult::Type::STR_HEX, "key",
                      "(key-value pair) An unknown key-value pair"},
                 }},
                {RPCResult::Type::ARR,
                 "inputs",
                 "",
                 {
                     {RPCResult::Type::OBJ,
                      "",
                      "",
                      {
                          {RPCResult::Type::OBJ,
                           "utxo",
                           /* optional */ true,
                           "Transaction output for UTXOs",
                           {
                               {RPCResult::Type::NUM, "amount",
                                "The value in " + Currency::get().ticker},
                               {RPCResult::Type::OBJ,
                                "scriptPubKey",
                                "",
                                {
                                    {RPCResult::Type::STR, "asm", "The asm"},
                                    {RPCResult::Type::STR_HEX, "hex",
                                     "The hex"},
                                    {RPCResult::Type::STR, "type",
                                     "The type, eg 'pubkeyhash'"},
                                    {RPCResult::Type::STR, "address",
                                     " Bitcoin address if there is one"},
                                }},
                           }},
                          {RPCResult::Type::OBJ_DYN,
                           "partial_signatures",
                           /* optional */ true,
                           "",
                           {
                               {RPCResult::Type::STR, "pubkey",
                                "The public key and signature that corresponds "
                                "to it."},
                           }},
                          {RPCResult::Type::STR, "sighash", /* optional */ true,
                           "The sighash type to be used"},
                          {RPCResult::Type::OBJ,
                           "redeem_script",
                           /* optional */ true,
                           "",
                           {
                               {RPCResult::Type::STR, "asm", "The asm"},
                               {RPCResult::Type::STR_HEX, "hex", "The hex"},
                               {RPCResult::Type::STR, "type",
                                "The type, eg 'pubkeyhash'"},
                           }},
                          {RPCResult::Type::ARR,
                           "bip32_derivs",
                           /* optional */ true,
                           "",
                           {
                               {RPCResult::Type::OBJ,
                                "pubkey",
                                /* optional */ true,
                                "The public key with the derivation path as "
                                "the value.",
                                {
                                    {RPCResult::Type::STR, "master_fingerprint",
                                     "The fingerprint of the master key"},
                                    {RPCResult::Type::STR, "path", "The path"},
                                }},
                           }},
                          {RPCResult::Type::OBJ,
                           "final_scriptsig",
                           /* optional */ true,
                           "",
                           {
                               {RPCResult::Type::STR, "asm", "The asm"},
                               {RPCResult::Type::STR, "hex", "The hex"},
                           }},
                          {RPCResult::Type::OBJ_DYN,
                           "unknown",
                           "The unknown global fields",
                           {
                               {RPCResult::Type::STR_HEX, "key",
                                "(key-value pair) An unknown key-value pair"},
                           }},
                      }},
                 }},
                {RPCResult::Type::ARR,
                 "outputs",
                 "",
                 {
                     {RPCResult::Type::OBJ,
                      "",
                      "",
                      {
                          {RPCResult::Type::OBJ,
                           "redeem_script",
                           /* optional */ true,
                           "",
                           {
                               {RPCResult::Type::STR, "asm", "The asm"},
                               {RPCResult::Type::STR_HEX, "hex", "The hex"},
                               {RPCResult::Type::STR, "type",
                                "The type, eg 'pubkeyhash'"},
                           }},
                          {RPCResult::Type::ARR,
                           "bip32_derivs",
                           /* optional */ true,
                           "",
                           {
                               {RPCResult::Type::OBJ,
                                "",
                                "",
                                {
                                    {RPCResult::Type::STR, "pubkey",
                                     "The public key this path corresponds to"},
                                    {RPCResult::Type::STR, "master_fingerprint",
                                     "The fingerprint of the master key"},
                                    {RPCResult::Type::STR, "path", "The path"},
                                }},
                           }},
                          {RPCResult::Type::OBJ_DYN,
                           "unknown",
                           "The unknown global fields",
                           {
                               {RPCResult::Type::STR_HEX, "key",
                                "(key-value pair) An unknown key-value pair"},
                           }},
                      }},
                 }},
                {RPCResult::Type::STR_AMOUNT, "fee", /* optional */ true,
                 "The transaction fee paid if all UTXOs slots in the PSBT have "
                 "been filled."},
            }},
        RPCExamples{HelpExampleCli("decodepsbt", "\"psbt\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            RPCTypeCheck(request.params, {UniValue::VSTR});

            // Unserialize the transactions
            PartiallySignedTransaction psbtx;
            std::string error;
            if (!DecodeBase64PSBT(psbtx, request.params[0].get_str(), error)) {
                throw JSONRPCError(RPC_DESERIALIZATION_ERROR,
                                   strprintf("TX decode failed %s", error));
            }

            UniValue result(UniValue::VOBJ);

            // Add the decoded tx
            UniValue tx_univ(UniValue::VOBJ);
            TxToUniv(CTransaction(*psbtx.tx), BlockHash(), tx_univ, false);
            result.pushKV("tx", tx_univ);

            // Unknown data
            if (psbtx.unknown.size() > 0) {
                UniValue unknowns(UniValue::VOBJ);
                for (auto entry : psbtx.unknown) {
                    unknowns.pushKV(HexStr(entry.first), HexStr(entry.second));
                }
                result.pushKV("unknown", unknowns);
            }

            // inputs
            Amount total_in = Amount::zero();
            bool have_all_utxos = true;
            UniValue inputs(UniValue::VARR);
            for (size_t i = 0; i < psbtx.inputs.size(); ++i) {
                const PSBTInput &input = psbtx.inputs[i];
                UniValue in(UniValue::VOBJ);
                // UTXOs
                if (!input.utxo.IsNull()) {
                    const CTxOut &txout = input.utxo;

                    UniValue out(UniValue::VOBJ);

                    out.pushKV("amount", txout.nValue);
                    if (MoneyRange(txout.nValue) &&
                        MoneyRange(total_in + txout.nValue)) {
                        total_in += txout.nValue;
                    } else {
                        // Hack to just not show fee later
                        have_all_utxos = false;
                    }

                    UniValue o(UniValue::VOBJ);
                    ScriptToUniv(txout.scriptPubKey, o, true);
                    out.pushKV("scriptPubKey", o);
                    in.pushKV("utxo", out);
                } else {
                    have_all_utxos = false;
                }

                // Partial sigs
                if (!input.partial_sigs.empty()) {
                    UniValue partial_sigs(UniValue::VOBJ);
                    for (const auto &sig : input.partial_sigs) {
                        partial_sigs.pushKV(HexStr(sig.second.first),
                                            HexStr(sig.second.second));
                    }
                    in.pushKV("partial_signatures", partial_sigs);
                }

                // Sighash
                uint8_t sighashbyte =
                    input.sighash_type.getRawSigHashType() & 0xff;
                if (sighashbyte > 0) {
                    in.pushKV("sighash", SighashToStr(sighashbyte));
                }

                // Redeem script
                if (!input.redeem_script.empty()) {
                    UniValue r(UniValue::VOBJ);
                    ScriptToUniv(input.redeem_script, r, false);
                    in.pushKV("redeem_script", r);
                }

                // keypaths
                if (!input.hd_keypaths.empty()) {
                    UniValue keypaths(UniValue::VARR);
                    for (auto entry : input.hd_keypaths) {
                        UniValue keypath(UniValue::VOBJ);
                        keypath.pushKV("pubkey", HexStr(entry.first));

                        keypath.pushKV(
                            "master_fingerprint",
                            strprintf("%08x",
                                      ReadBE32(entry.second.fingerprint)));
                        keypath.pushKV("path",
                                       WriteHDKeypath(entry.second.path));
                        keypaths.push_back(keypath);
                    }
                    in.pushKV("bip32_derivs", keypaths);
                }

                // Final scriptSig
                if (!input.final_script_sig.empty()) {
                    UniValue scriptsig(UniValue::VOBJ);
                    scriptsig.pushKV(
                        "asm", ScriptToAsmStr(input.final_script_sig, true));
                    scriptsig.pushKV("hex", HexStr(input.final_script_sig));
                    in.pushKV("final_scriptSig", scriptsig);
                }

                // Unknown data
                if (input.unknown.size() > 0) {
                    UniValue unknowns(UniValue::VOBJ);
                    for (auto entry : input.unknown) {
                        unknowns.pushKV(HexStr(entry.first),
                                        HexStr(entry.second));
                    }
                    in.pushKV("unknown", unknowns);
                }

                inputs.push_back(in);
            }
            result.pushKV("inputs", inputs);

            // outputs
            Amount output_value = Amount::zero();
            UniValue outputs(UniValue::VARR);
            for (size_t i = 0; i < psbtx.outputs.size(); ++i) {
                const PSBTOutput &output = psbtx.outputs[i];
                UniValue out(UniValue::VOBJ);
                // Redeem script
                if (!output.redeem_script.empty()) {
                    UniValue r(UniValue::VOBJ);
                    ScriptToUniv(output.redeem_script, r, false);
                    out.pushKV("redeem_script", r);
                }

                // keypaths
                if (!output.hd_keypaths.empty()) {
                    UniValue keypaths(UniValue::VARR);
                    for (auto entry : output.hd_keypaths) {
                        UniValue keypath(UniValue::VOBJ);
                        keypath.pushKV("pubkey", HexStr(entry.first));
                        keypath.pushKV(
                            "master_fingerprint",
                            strprintf("%08x",
                                      ReadBE32(entry.second.fingerprint)));
                        keypath.pushKV("path",
                                       WriteHDKeypath(entry.second.path));
                        keypaths.push_back(keypath);
                    }
                    out.pushKV("bip32_derivs", keypaths);
                }

                // Unknown data
                if (output.unknown.size() > 0) {
                    UniValue unknowns(UniValue::VOBJ);
                    for (auto entry : output.unknown) {
                        unknowns.pushKV(HexStr(entry.first),
                                        HexStr(entry.second));
                    }
                    out.pushKV("unknown", unknowns);
                }

                outputs.push_back(out);

                // Fee calculation
                if (MoneyRange(psbtx.tx->vout[i].nValue) &&
                    MoneyRange(output_value + psbtx.tx->vout[i].nValue)) {
                    output_value += psbtx.tx->vout[i].nValue;
                } else {
                    // Hack to just not show fee later
                    have_all_utxos = false;
                }
            }
            result.pushKV("outputs", outputs);
            if (have_all_utxos) {
                result.pushKV("fee", total_in - output_value);
            }

            return result;
        },
    };
}

static RPCHelpMan combinepsbt() {
    return RPCHelpMan{
        "combinepsbt",
        "Combine multiple partially signed Bitcoin transactions into one "
        "transaction.\n"
        "Implements the Combiner role.\n",
        {
            {
                "txs",
                RPCArg::Type::ARR,
                RPCArg::Optional::NO,
                "The base64 strings of partially signed transactions",
                {
                    {"psbt", RPCArg::Type::STR, RPCArg::Optional::OMITTED,
                     "A base64 string of a PSBT"},
                },
            },
        },
        RPCResult{RPCResult::Type::STR, "",
                  "The base64-encoded partially signed transaction"},
        RPCExamples{HelpExampleCli(
            "combinepsbt", R"('["mybase64_1", "mybase64_2", "mybase64_3"]')")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            RPCTypeCheck(request.params, {UniValue::VARR}, true);

            // Unserialize the transactions
            std::vector<PartiallySignedTransaction> psbtxs;
            UniValue txs = request.params[0].get_array();
            if (txs.empty()) {
                throw JSONRPCError(RPC_INVALID_PARAMETER,
                                   "Parameter 'txs' cannot be empty");
            }
            for (size_t i = 0; i < txs.size(); ++i) {
                PartiallySignedTransaction psbtx;
                std::string error;
                if (!DecodeBase64PSBT(psbtx, txs[i].get_str(), error)) {
                    throw JSONRPCError(RPC_DESERIALIZATION_ERROR,
                                       strprintf("TX decode failed %s", error));
                }
                psbtxs.push_back(psbtx);
            }

            PartiallySignedTransaction merged_psbt;
            const TransactionError error = CombinePSBTs(merged_psbt, psbtxs);
            if (error != TransactionError::OK) {
                throw JSONRPCTransactionError(error);
            }

            CDataStream ssTx(SER_NETWORK, PROTOCOL_VERSION);
            ssTx << merged_psbt;
            return EncodeBase64(ssTx);
        },
    };
}

static RPCHelpMan finalizepsbt() {
    return RPCHelpMan{
        "finalizepsbt",
        "Finalize the inputs of a PSBT. If the transaction is fully signed, it "
        "will produce a\n"
        "network serialized transaction which can be broadcast with "
        "sendrawtransaction. Otherwise a PSBT will be\n"
        "created which has the final_scriptSigfields filled for inputs that "
        "are complete.\n"
        "Implements the Finalizer and Extractor roles.\n",
        {
            {"psbt", RPCArg::Type::STR, RPCArg::Optional::NO,
             "A base64 string of a PSBT"},
            {"extract", RPCArg::Type::BOOL, RPCArg::Default{true},
             "If true and the transaction is complete,\n"
             "                             extract and return the complete "
             "transaction in normal network serialization instead of the "
             "PSBT."},
        },
        RPCResult{RPCResult::Type::OBJ,
                  "",
                  "",
                  {
                      {RPCResult::Type::STR, "psbt",
                       "The base64-encoded partially signed transaction if not "
                       "extracted"},
                      {RPCResult::Type::STR_HEX, "hex",
                       "The hex-encoded network transaction if extracted"},
                      {RPCResult::Type::BOOL, "complete",
                       "If the transaction has a complete set of signatures"},
                  }},
        RPCExamples{HelpExampleCli("finalizepsbt", "\"psbt\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            RPCTypeCheck(request.params, {UniValue::VSTR, UniValue::VBOOL},
                         true);

            // Unserialize the transactions
            PartiallySignedTransaction psbtx;
            std::string error;
            if (!DecodeBase64PSBT(psbtx, request.params[0].get_str(), error)) {
                throw JSONRPCError(RPC_DESERIALIZATION_ERROR,
                                   strprintf("TX decode failed %s", error));
            }

            bool extract =
                request.params[1].isNull() ||
                (!request.params[1].isNull() && request.params[1].get_bool());

            CMutableTransaction mtx;
            bool complete = FinalizeAndExtractPSBT(psbtx, mtx);

            UniValue result(UniValue::VOBJ);
            CDataStream ssTx(SER_NETWORK, PROTOCOL_VERSION);
            std::string result_str;

            if (complete && extract) {
                ssTx << mtx;
                result_str = HexStr(ssTx);
                result.pushKV("hex", result_str);
            } else {
                ssTx << psbtx;
                result_str = EncodeBase64(ssTx.str());
                result.pushKV("psbt", result_str);
            }
            result.pushKV("complete", complete);

            return result;
        },
    };
}

static RPCHelpMan createpsbt() {
    return RPCHelpMan{
        "createpsbt",
        "Creates a transaction in the Partially Signed Transaction format.\n"
        "Implements the Creator role.\n",
        {
            {
                "inputs",
                RPCArg::Type::ARR,
                RPCArg::Optional::NO,
                "The json objects",
                {
                    {
                        "",
                        RPCArg::Type::OBJ,
                        RPCArg::Optional::OMITTED,
                        "",
                        {
                            {"txid", RPCArg::Type::STR_HEX,
                             RPCArg::Optional::NO, "The transaction id"},
                            {"vout", RPCArg::Type::NUM, RPCArg::Optional::NO,
                             "The output number"},
                            {"sequence", RPCArg::Type::NUM,
                             RPCArg::DefaultHint{"depends on the value of the "
                                                 "'locktime' argument"},
                             "The sequence number"},
                        },
                    },
                },
            },
            {
                "outputs",
                RPCArg::Type::ARR,
                RPCArg::Optional::NO,
                "The outputs (key-value pairs), where none of "
                "the keys are duplicated.\n"
                "That is, each address can only appear once and there can only "
                "be one 'data' object.\n"
                "For compatibility reasons, a dictionary, which holds the "
                "key-value pairs directly, is also\n"
                "                             accepted as second parameter.",
                {
                    {
                        "",
                        RPCArg::Type::OBJ,
                        RPCArg::Optional::OMITTED,
                        "",
                        {
                            {"address", RPCArg::Type::AMOUNT,
                             RPCArg::Optional::NO,
                             "A key-value pair. The key (string) is the "
                             "bitcoin address, the value (float or string) is "
                             "the amount in " +
                                 Currency::get().ticker},
                        },
                    },
                    {
                        "",
                        RPCArg::Type::OBJ,
                        RPCArg::Optional::OMITTED,
                        "",
                        {
                            {"data", RPCArg::Type::STR_HEX,
                             RPCArg::Optional::NO,
                             "A key-value pair. The key must be \"data\", the "
                             "value is hex-encoded data"},
                        },
                    },
                },
            },
            {"locktime", RPCArg::Type::NUM, RPCArg::Default{0},
             "Raw locktime. Non-0 value also locktime-activates inputs"},
        },
        RPCResult{RPCResult::Type::STR, "",
                  "The resulting raw transaction (base64-encoded string)"},
        RPCExamples{HelpExampleCli(
            "createpsbt", "\"[{\\\"txid\\\":\\\"myid\\\",\\\"vout\\\":0}]"
                          "\" \"[{\\\"data\\\":\\\"00010203\\\"}]\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            RPCTypeCheck(request.params,
                         {
                             UniValue::VARR,
                             UniValueType(), // ARR or OBJ, checked later
                             UniValue::VNUM,
                         },
                         true);

            CMutableTransaction rawTx =
                ConstructTransaction(config.GetChainParams(), request.params[0],
                                     request.params[1], request.params[2]);

            // Make a blank psbt
            PartiallySignedTransaction psbtx;
            psbtx.tx = rawTx;
            for (size_t i = 0; i < rawTx.vin.size(); ++i) {
                psbtx.inputs.push_back(PSBTInput());
            }
            for (size_t i = 0; i < rawTx.vout.size(); ++i) {
                psbtx.outputs.push_back(PSBTOutput());
            }

            // Serialize the PSBT
            CDataStream ssTx(SER_NETWORK, PROTOCOL_VERSION);
            ssTx << psbtx;

            return EncodeBase64(ssTx);
        },
    };
}

static RPCHelpMan converttopsbt() {
    return RPCHelpMan{
        "converttopsbt",
        "Converts a network serialized transaction to a PSBT. "
        "This should be used only with createrawtransaction and "
        "fundrawtransaction\n"
        "createpsbt and walletcreatefundedpsbt should be used for new "
        "applications.\n",
        {
            {"hexstring", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The hex string of a raw transaction"},
            {"permitsigdata", RPCArg::Type::BOOL, RPCArg::Default{false},
             "If true, any signatures in the input will be discarded and "
             "conversion.\n"
             "                              will continue. If false, RPC will "
             "fail if any signatures are present."},
        },
        RPCResult{RPCResult::Type::STR, "",
                  "The resulting raw transaction (base64-encoded string)"},
        RPCExamples{
            "\nCreate a transaction\n" +
            HelpExampleCli("createrawtransaction",
                           "\"[{\\\"txid\\\":\\\"myid\\\",\\\"vout\\\":0}]"
                           "\" \"[{\\\"data\\\":\\\"00010203\\\"}]\"") +
            "\nConvert the transaction to a PSBT\n" +
            HelpExampleCli("converttopsbt", "\"rawtransaction\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            RPCTypeCheck(request.params, {UniValue::VSTR, UniValue::VBOOL},
                         true);

            // parse hex string from parameter
            CMutableTransaction tx;
            bool permitsigdata = request.params[1].isNull()
                                     ? false
                                     : request.params[1].get_bool();
            if (!DecodeHexTx(tx, request.params[0].get_str())) {
                throw JSONRPCError(RPC_DESERIALIZATION_ERROR,
                                   "TX decode failed");
            }

            // Remove all scriptSigs from inputs
            for (CTxIn &input : tx.vin) {
                if (!input.scriptSig.empty() && !permitsigdata) {
                    throw JSONRPCError(RPC_DESERIALIZATION_ERROR,
                                       "Inputs must not have scriptSigs");
                }
                input.scriptSig.clear();
            }

            // Make a blank psbt
            PartiallySignedTransaction psbtx;
            psbtx.tx = tx;
            for (size_t i = 0; i < tx.vin.size(); ++i) {
                psbtx.inputs.push_back(PSBTInput());
            }
            for (size_t i = 0; i < tx.vout.size(); ++i) {
                psbtx.outputs.push_back(PSBTOutput());
            }

            // Serialize the PSBT
            CDataStream ssTx(SER_NETWORK, PROTOCOL_VERSION);
            ssTx << psbtx;

            return EncodeBase64(ssTx);
        },
    };
}

RPCHelpMan utxoupdatepsbt() {
    return RPCHelpMan{
        "utxoupdatepsbt",
        "Updates all inputs and outputs in a PSBT with data from output "
        "descriptors, the UTXO set or the mempool.\n",
        {
            {"psbt", RPCArg::Type::STR, RPCArg::Optional::NO,
             "A base64 string of a PSBT"},
            {"descriptors",
             RPCArg::Type::ARR,
             RPCArg::Optional::OMITTED_NAMED_ARG,
             "An array of either strings or objects",
             {
                 {"", RPCArg::Type::STR, RPCArg::Optional::OMITTED,
                  "An output descriptor"},
                 {"",
                  RPCArg::Type::OBJ,
                  RPCArg::Optional::OMITTED,
                  "An object with an output descriptor and extra information",
                  {
                      {"desc", RPCArg::Type::STR, RPCArg::Optional::NO,
                       "An output descriptor"},
                      {"range", RPCArg::Type::RANGE, RPCArg::Default{1000},
                       "Up to what index HD chains should be explored (either "
                       "end or [begin,end])"},
                  }},
             }},
        },
        RPCResult{RPCResult::Type::STR, "",
                  "The base64-encoded partially signed transaction with inputs "
                  "updated"},
        RPCExamples{HelpExampleCli("utxoupdatepsbt", "\"psbt\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            RPCTypeCheck(request.params, {UniValue::VSTR, UniValue::VARR},
                         true);

            // Unserialize the transactions
            PartiallySignedTransaction psbtx;
            std::string error;
            if (!DecodeBase64PSBT(psbtx, request.params[0].get_str(), error)) {
                throw JSONRPCError(RPC_DESERIALIZATION_ERROR,
                                   strprintf("TX decode failed %s", error));
            }

            // Parse descriptors, if any.
            FlatSigningProvider provider;
            if (!request.params[1].isNull()) {
                auto descs = request.params[1].get_array();
                for (size_t i = 0; i < descs.size(); ++i) {
                    EvalDescriptorStringOrObject(descs[i], provider);
                }
            }
            // We don't actually need private keys further on; hide them as a
            // precaution.
            HidingSigningProvider public_provider(&provider, /* nosign */ true,
                                                  /* nobip32derivs */ false);

            // Fetch previous transactions (inputs):
            CCoinsView viewDummy;
            CCoinsViewCache view(&viewDummy);
            {
                NodeContext &node = EnsureAnyNodeContext(request.context);
                const CTxMemPool &mempool = EnsureMemPool(node);
                ChainstateManager &chainman = EnsureChainman(node);
                LOCK2(cs_main, mempool.cs);
                CCoinsViewCache &viewChain =
                    chainman.ActiveChainstate().CoinsTip();
                CCoinsViewMemPool viewMempool(&viewChain, mempool);
                // temporarily switch cache backend to db+mempool view
                view.SetBackend(viewMempool);

                for (const CTxIn &txin : psbtx.tx->vin) {
                    // Load entries from viewChain into view; can fail.
                    view.AccessCoin(txin.prevout);
                }

                // switch back to avoid locking mempool for too long
                view.SetBackend(viewDummy);
            }

            // Fill the inputs
            for (size_t i = 0; i < psbtx.tx->vin.size(); ++i) {
                PSBTInput &input = psbtx.inputs.at(i);

                if (!input.utxo.IsNull()) {
                    continue;
                }

                // Update script/keypath information using descriptor data.
                // Note that SignPSBTInput does a lot more than just
                // constructing ECDSA signatures we don't actually care about
                // those here, in fact.
                SignPSBTInput(public_provider, psbtx, i,
                              /* sighash_type */ SigHashType().withForkId());
            }

            // Update script/keypath information using descriptor data.
            for (unsigned int i = 0; i < psbtx.tx->vout.size(); ++i) {
                UpdatePSBTOutput(public_provider, psbtx, i);
            }

            CDataStream ssTx(SER_NETWORK, PROTOCOL_VERSION);
            ssTx << psbtx;
            return EncodeBase64(ssTx);
        },
    };
}

RPCHelpMan joinpsbts() {
    return RPCHelpMan{
        "joinpsbts",
        "Joins multiple distinct PSBTs with different inputs and outputs "
        "into one PSBT with inputs and outputs from all of the PSBTs\n"
        "No input in any of the PSBTs can be in more than one of the PSBTs.\n",
        {{"txs",
          RPCArg::Type::ARR,
          RPCArg::Optional::NO,
          "The base64 strings of partially signed transactions",
          {{"psbt", RPCArg::Type::STR, RPCArg::Optional::NO,
            "A base64 string of a PSBT"}}}},
        RPCResult{RPCResult::Type::STR, "",
                  "The base64-encoded partially signed transaction"},
        RPCExamples{HelpExampleCli("joinpsbts", "\"psbt\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            RPCTypeCheck(request.params, {UniValue::VARR}, true);

            // Unserialize the transactions
            std::vector<PartiallySignedTransaction> psbtxs;
            UniValue txs = request.params[0].get_array();

            if (txs.size() <= 1) {
                throw JSONRPCError(
                    RPC_INVALID_PARAMETER,
                    "At least two PSBTs are required to join PSBTs.");
            }

            uint32_t best_version = 1;
            uint32_t best_locktime = 0xffffffff;
            for (size_t i = 0; i < txs.size(); ++i) {
                PartiallySignedTransaction psbtx;
                std::string error;
                if (!DecodeBase64PSBT(psbtx, txs[i].get_str(), error)) {
                    throw JSONRPCError(RPC_DESERIALIZATION_ERROR,
                                       strprintf("TX decode failed %s", error));
                }
                psbtxs.push_back(psbtx);
                // Choose the highest version number
                if (static_cast<uint32_t>(psbtx.tx->nVersion) > best_version) {
                    best_version = static_cast<uint32_t>(psbtx.tx->nVersion);
                }
                // Choose the lowest lock time
                if (psbtx.tx->nLockTime < best_locktime) {
                    best_locktime = psbtx.tx->nLockTime;
                }
            }

            // Create a blank psbt where everything will be added
            PartiallySignedTransaction merged_psbt;
            merged_psbt.tx = CMutableTransaction();
            merged_psbt.tx->nVersion = static_cast<int32_t>(best_version);
            merged_psbt.tx->nLockTime = best_locktime;

            // Merge
            for (auto &psbt : psbtxs) {
                for (size_t i = 0; i < psbt.tx->vin.size(); ++i) {
                    if (!merged_psbt.AddInput(psbt.tx->vin[i],
                                              psbt.inputs[i])) {
                        throw JSONRPCError(
                            RPC_INVALID_PARAMETER,
                            strprintf("Input %s:%d exists in multiple PSBTs",
                                      psbt.tx->vin[i]
                                          .prevout.GetTxId()
                                          .ToString()
                                          .c_str(),
                                      psbt.tx->vin[i].prevout.GetN()));
                    }
                }
                for (size_t i = 0; i < psbt.tx->vout.size(); ++i) {
                    merged_psbt.AddOutput(psbt.tx->vout[i], psbt.outputs[i]);
                }
                merged_psbt.unknown.insert(psbt.unknown.begin(),
                                           psbt.unknown.end());
            }

            // Generate list of shuffled indices for shuffling inputs and
            // outputs of the merged PSBT
            std::vector<int> input_indices(merged_psbt.inputs.size());
            std::iota(input_indices.begin(), input_indices.end(), 0);
            std::vector<int> output_indices(merged_psbt.outputs.size());
            std::iota(output_indices.begin(), output_indices.end(), 0);

            // Shuffle input and output indices lists
            Shuffle(input_indices.begin(), input_indices.end(),
                    FastRandomContext());
            Shuffle(output_indices.begin(), output_indices.end(),
                    FastRandomContext());

            PartiallySignedTransaction shuffled_psbt;
            shuffled_psbt.tx = CMutableTransaction();
            shuffled_psbt.tx->nVersion = merged_psbt.tx->nVersion;
            shuffled_psbt.tx->nLockTime = merged_psbt.tx->nLockTime;
            for (int i : input_indices) {
                shuffled_psbt.AddInput(merged_psbt.tx->vin[i],
                                       merged_psbt.inputs[i]);
            }
            for (int i : output_indices) {
                shuffled_psbt.AddOutput(merged_psbt.tx->vout[i],
                                        merged_psbt.outputs[i]);
            }
            shuffled_psbt.unknown.insert(merged_psbt.unknown.begin(),
                                         merged_psbt.unknown.end());

            CDataStream ssTx(SER_NETWORK, PROTOCOL_VERSION);
            ssTx << shuffled_psbt;
            return EncodeBase64(ssTx);
        },
    };
}

RPCHelpMan analyzepsbt() {
    return RPCHelpMan{
        "analyzepsbt",
        "Analyzes and provides information about the current status of a "
        "PSBT and its inputs\n",
        {{"psbt", RPCArg::Type::STR, RPCArg::Optional::NO,
          "A base64 string of a PSBT"}},
        RPCResult{
            RPCResult::Type::OBJ,
            "",
            "",
            {
                {RPCResult::Type::ARR,
                 "inputs",
                 "",
                 {
                     {RPCResult::Type::OBJ,
                      "",
                      "",
                      {
                          {RPCResult::Type::BOOL, "has_utxo",
                           "Whether a UTXO is provided"},
                          {RPCResult::Type::BOOL, "is_final",
                           "Whether the input is finalized"},
                          {RPCResult::Type::OBJ,
                           "missing",
                           /* optional */ true,
                           "Things that are missing that are required to "
                           "complete this input",
                           {
                               {RPCResult::Type::ARR,
                                "pubkeys",
                                /* optional */ true,
                                "",
                                {
                                    {RPCResult::Type::STR_HEX, "keyid",
                                     "Public key ID, hash160 of the public "
                                     "key, of a public key whose BIP 32 "
                                     "derivation path is missing"},
                                }},
                               {RPCResult::Type::ARR,
                                "signatures",
                                /* optional */ true,
                                "",
                                {
                                    {RPCResult::Type::STR_HEX, "keyid",
                                     "Public key ID, hash160 of the public "
                                     "key, of a public key whose signature is "
                                     "missing"},
                                }},
                               {RPCResult::Type::STR_HEX, "redeemscript",
                                /* optional */ true,
                                "Hash160 of the redeemScript that is missing"},
                           }},
                          {RPCResult::Type::STR, "next", /* optional */ true,
                           "Role of the next person that this input needs to "
                           "go to"},
                      }},
                 }},
                {RPCResult::Type::NUM, "estimated_vsize", /* optional */ true,
                 "Estimated vsize of the final signed transaction"},
                {RPCResult::Type::STR_AMOUNT, "estimated_feerate",
                 /* optional */ true,
                 "Estimated feerate of the final signed transaction in " +
                     Currency::get().ticker +
                     "/kB. Shown only if all UTXO slots in the PSBT have been "
                     "filled"},
                {RPCResult::Type::STR_AMOUNT, "fee", /* optional */ true,
                 "The transaction fee paid. Shown only if all UTXO slots in "
                 "the PSBT have been filled"},
                {RPCResult::Type::STR, "next",
                 "Role of the next person that this psbt needs to go to"},
                {RPCResult::Type::STR, "error", /* optional */ true,
                 "Error message (if there is one)"},
            }},
        RPCExamples{HelpExampleCli("analyzepsbt", "\"psbt\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            RPCTypeCheck(request.params, {UniValue::VSTR});

            // Unserialize the transaction
            PartiallySignedTransaction psbtx;
            std::string error;
            if (!DecodeBase64PSBT(psbtx, request.params[0].get_str(), error)) {
                throw JSONRPCError(RPC_DESERIALIZATION_ERROR,
                                   strprintf("TX decode failed %s", error));
            }

            PSBTAnalysis psbta = AnalyzePSBT(psbtx);

            UniValue result(UniValue::VOBJ);
            UniValue inputs_result(UniValue::VARR);
            for (const auto &input : psbta.inputs) {
                UniValue input_univ(UniValue::VOBJ);
                UniValue missing(UniValue::VOBJ);

                input_univ.pushKV("has_utxo", input.has_utxo);
                input_univ.pushKV("is_final", input.is_final);
                input_univ.pushKV("next", PSBTRoleName(input.next));

                if (!input.missing_pubkeys.empty()) {
                    UniValue missing_pubkeys_univ(UniValue::VARR);
                    for (const CKeyID &pubkey : input.missing_pubkeys) {
                        missing_pubkeys_univ.push_back(HexStr(pubkey));
                    }
                    missing.pushKV("pubkeys", missing_pubkeys_univ);
                }
                if (!input.missing_redeem_script.IsNull()) {
                    missing.pushKV("redeemscript",
                                   HexStr(input.missing_redeem_script));
                }
                if (!input.missing_sigs.empty()) {
                    UniValue missing_sigs_univ(UniValue::VARR);
                    for (const CKeyID &pubkey : input.missing_sigs) {
                        missing_sigs_univ.push_back(HexStr(pubkey));
                    }
                    missing.pushKV("signatures", missing_sigs_univ);
                }
                if (!missing.getKeys().empty()) {
                    input_univ.pushKV("missing", missing);
                }
                inputs_result.push_back(input_univ);
            }
            if (!inputs_result.empty()) {
                result.pushKV("inputs", inputs_result);
            }
            if (psbta.estimated_vsize != std::nullopt) {
                result.pushKV("estimated_vsize", (int)*psbta.estimated_vsize);
            }
            if (psbta.estimated_feerate != std::nullopt) {
                result.pushKV("estimated_feerate",
                              psbta.estimated_feerate->GetFeePerK());
            }
            if (psbta.fee != std::nullopt) {
                result.pushKV("fee", *psbta.fee);
            }
            result.pushKV("next", PSBTRoleName(psbta.next));
            if (!psbta.error.empty()) {
                result.pushKV("error", psbta.error);
            }

            return result;
        },
    };
}

void RegisterRawTransactionRPCCommands(CRPCTable &t) {
    // clang-format off
    static const CRPCCommand commands[] = {
        //  category            actor (function)
        //  ------------------  ----------------------
        { "rawtransactions",    getrawtransaction,          },
        { "rawtransactions",    createrawtransaction,       },
        { "rawtransactions",    decoderawtransaction,       },
        { "rawtransactions",    decodescript,               },
        { "rawtransactions",    sendrawtransaction,         },
        { "rawtransactions",    combinerawtransaction,      },
        { "rawtransactions",    signrawtransactionwithkey,  },
        { "rawtransactions",    testmempoolaccept,          },
        { "rawtransactions",    decodepsbt,                 },
        { "rawtransactions",    combinepsbt,                },
        { "rawtransactions",    finalizepsbt,               },
        { "rawtransactions",    createpsbt,                 },
        { "rawtransactions",    converttopsbt,              },
        { "rawtransactions",    utxoupdatepsbt,             },
        { "rawtransactions",    joinpsbts,                  },
        { "rawtransactions",    analyzepsbt,                },
    };
    // clang-format on
    for (const auto &c : commands) {
        t.appendCommand(c.name, &c);
    }
}
