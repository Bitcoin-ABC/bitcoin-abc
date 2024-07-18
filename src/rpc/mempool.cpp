// Copyright (c) 2010 Satoshi Nakamoto
// Copyright (c) 2009-2022 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <kernel/mempool_entry.h>
#include <kernel/mempool_persist.h>

#include <chainparams.h>
#include <core_io.h>
#include <node/context.h>
#include <node/mempool_persist_args.h>
#include <policy/settings.h>
#include <primitives/transaction.h>
#include <rpc/server.h>
#include <rpc/server_util.h>
#include <rpc/util.h>
#include <txmempool.h>
#include <univalue.h>
#include <util/fs.h>
#include <util/moneystr.h>
#include <validation.h>
#include <validationinterface.h>

using kernel::DumpMempool;

using node::DEFAULT_MAX_RAW_TX_FEE_RATE;
using node::MempoolPath;
using node::NodeContext;
using node::ShouldPersistMempool;

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
    const auto ticker = Currency::get().ticker;
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
                 ticker + "/kB\n"},
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
                           "transaction fee in " + ticker},
                          {RPCResult::Type::STR_AMOUNT, "effective-feerate",
                           "the effective feerate in " + ticker +
                               " per KvB. May differ from the base feerate if, "
                               "for example, there are modified fees from "
                               "prioritisetransaction or a package feerate was "
                               "used."},
                          {RPCResult::Type::ARR,
                           "effective-includes",
                           "transactions whose fees and vsizes are included in "
                           "effective-feerate.",
                           {
                               RPCResult{RPCResult::Type::STR_HEX, "",
                                         "transaction txid in hex"},
                           }},
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
                        fees.pushKV(
                            "effective-feerate",
                            tx_result.m_effective_feerate.value().GetFeePerK());
                        UniValue effective_includes_res(UniValue::VARR);
                        for (const auto &txid :
                             tx_result.m_txids_fee_calculations.value()) {
                            effective_includes_res.push_back(txid.ToString());
                        }
                        fees.pushKV("effective-includes",
                                    effective_includes_res);
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

static std::vector<RPCResult> MempoolEntryDescription() {
    const auto &ticker = Currency::get().ticker;
    return {
        RPCResult{RPCResult::Type::NUM, "size", "transaction size."},
        RPCResult{RPCResult::Type::NUM_TIME, "time",
                  "local time transaction entered pool in seconds since 1 Jan "
                  "1970 GMT"},
        RPCResult{RPCResult::Type::NUM, "height",
                  "block height when transaction entered pool"},
        RPCResult{RPCResult::Type::OBJ,
                  "fees",
                  "",
                  {{
                      RPCResult{RPCResult::Type::STR_AMOUNT, "base",
                                "transaction fee in " + ticker},
                      RPCResult{RPCResult::Type::STR_AMOUNT, "modified",
                                "transaction fee with fee deltas used for "
                                "mining priority in " +
                                    ticker},
                  }}},
        RPCResult{
            RPCResult::Type::ARR,
            "depends",
            "unconfirmed transactions used as inputs for this transaction",
            {RPCResult{RPCResult::Type::STR_HEX, "transactionid",
                       "parent transaction id"}}},
        RPCResult{
            RPCResult::Type::ARR,
            "spentby",
            "unconfirmed transactions spending outputs from this transaction",
            {RPCResult{RPCResult::Type::STR_HEX, "transactionid",
                       "child transaction id"}}},
        RPCResult{RPCResult::Type::BOOL, "unbroadcast",
                  "Whether this transaction is currently unbroadcast (initial "
                  "broadcast not yet acknowledged by any peers)"},
    };
}

static void entryToJSON(const CTxMemPool &pool, UniValue &info,
                        const CTxMemPoolEntryRef &e)
    EXCLUSIVE_LOCKS_REQUIRED(pool.cs) {
    AssertLockHeld(pool.cs);

    UniValue fees(UniValue::VOBJ);
    fees.pushKV("base", e->GetFee());
    fees.pushKV("modified", e->GetModifiedFee());
    info.pushKV("fees", fees);

    info.pushKV("size", (int)e->GetTxSize());
    info.pushKV("time", count_seconds(e->GetTime()));
    info.pushKV("height", (int)e->GetHeight());
    const CTransaction &tx = e->GetTx();
    std::set<std::string> setDepends;
    for (const CTxIn &txin : tx.vin) {
        if (pool.exists(txin.prevout.GetTxId())) {
            setDepends.insert(txin.prevout.GetTxId().ToString());
        }
    }

    UniValue depends(UniValue::VARR);
    for (const std::string &dep : setDepends) {
        depends.push_back(dep);
    }

    info.pushKV("depends", depends);

    UniValue spent(UniValue::VARR);
    for (const auto &child : e->GetMemPoolChildrenConst()) {
        spent.push_back(child.get()->GetTx().GetId().ToString());
    }

    info.pushKV("spentby", spent);
    info.pushKV("unbroadcast", pool.IsUnbroadcastTx(tx.GetId()));
}

UniValue MempoolToJSON(const CTxMemPool &pool, bool verbose,
                       bool include_mempool_sequence) {
    if (verbose) {
        if (include_mempool_sequence) {
            throw JSONRPCError(
                RPC_INVALID_PARAMETER,
                "Verbose results cannot contain mempool sequence values.");
        }
        LOCK(pool.cs);
        UniValue o(UniValue::VOBJ);
        for (const CTxMemPoolEntryRef &e : pool.mapTx) {
            const TxId &txid = e->GetTx().GetId();
            UniValue info(UniValue::VOBJ);
            entryToJSON(pool, info, e);
            // Mempool has unique entries so there is no advantage in using
            // UniValue::pushKV, which checks if the key already exists in O(N).
            // UniValue::pushKVEnd is used instead which currently is O(1).
            o.pushKVEnd(txid.ToString(), info);
        }
        return o;
    } else {
        uint64_t mempool_sequence;
        std::vector<TxId> vtxids;
        {
            LOCK(pool.cs);
            pool.getAllTxIds(vtxids);
            mempool_sequence = pool.GetSequence();
        }
        UniValue a(UniValue::VARR);
        for (const TxId &txid : vtxids) {
            a.push_back(txid.ToString());
        }

        if (!include_mempool_sequence) {
            return a;
        } else {
            UniValue o(UniValue::VOBJ);
            o.pushKV("txids", a);
            o.pushKV("mempool_sequence", mempool_sequence);
            return o;
        }
    }
}

static RPCHelpMan getrawmempool() {
    return RPCHelpMan{
        "getrawmempool",
        "Returns all transaction ids in memory pool as a json array of "
        "string transaction ids.\n"
        "\nHint: use getmempoolentry to fetch a specific transaction from the "
        "mempool.\n",
        {
            {"verbose", RPCArg::Type::BOOL, RPCArg::Default{false},
             "True for a json object, false for array of transaction ids"},
            {"mempool_sequence", RPCArg::Type::BOOL, RPCArg::Default{false},
             "If verbose=false, returns a json object with transaction list "
             "and mempool sequence number attached."},
        },
        {
            RPCResult{"for verbose = false",
                      RPCResult::Type::ARR,
                      "",
                      "",
                      {
                          {RPCResult::Type::STR_HEX, "", "The transaction id"},
                      }},
            RPCResult{"for verbose = true",
                      RPCResult::Type::OBJ_DYN,
                      "",
                      "",
                      {
                          {RPCResult::Type::OBJ, "transactionid", "",
                           MempoolEntryDescription()},
                      }},
            RPCResult{
                "for verbose = false and mempool_sequence = true",
                RPCResult::Type::OBJ,
                "",
                "",
                {
                    {RPCResult::Type::ARR,
                     "txids",
                     "",
                     {
                         {RPCResult::Type::STR_HEX, "", "The transaction id"},
                     }},
                    {RPCResult::Type::NUM, "mempool_sequence",
                     "The mempool sequence value."},
                }},
        },
        RPCExamples{HelpExampleCli("getrawmempool", "true") +
                    HelpExampleRpc("getrawmempool", "true")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            bool fVerbose = false;
            if (!request.params[0].isNull()) {
                fVerbose = request.params[0].get_bool();
            }

            bool include_mempool_sequence = false;
            if (!request.params[1].isNull()) {
                include_mempool_sequence = request.params[1].get_bool();
            }

            return MempoolToJSON(EnsureAnyMemPool(request.context), fVerbose,
                                 include_mempool_sequence);
        },
    };
}

static RPCHelpMan getmempoolancestors() {
    return RPCHelpMan{
        "getmempoolancestors",
        "If txid is in the mempool, returns all in-mempool ancestors.\n",
        {
            {"txid", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The transaction id (must be in mempool)"},
            {"verbose", RPCArg::Type::BOOL, RPCArg::Default{false},
             "True for a json object, false for array of transaction ids"},
        },
        {
            RPCResult{
                "for verbose = false",
                RPCResult::Type::ARR,
                "",
                "",
                {{RPCResult::Type::STR_HEX, "",
                  "The transaction id of an in-mempool ancestor transaction"}}},
            RPCResult{"for verbose = true",
                      RPCResult::Type::OBJ_DYN,
                      "",
                      "",
                      {
                          {RPCResult::Type::OBJ, "transactionid", "",
                           MempoolEntryDescription()},
                      }},
        },
        RPCExamples{HelpExampleCli("getmempoolancestors", "\"mytxid\"") +
                    HelpExampleRpc("getmempoolancestors", "\"mytxid\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            bool fVerbose = false;
            if (!request.params[1].isNull()) {
                fVerbose = request.params[1].get_bool();
            }

            TxId txid(ParseHashV(request.params[0], "parameter 1"));

            const CTxMemPool &mempool = EnsureAnyMemPool(request.context);
            LOCK(mempool.cs);

            CTxMemPool::txiter it = mempool.mapTx.find(txid);
            if (it == mempool.mapTx.end()) {
                throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                                   "Transaction not in mempool");
            }

            CTxMemPool::setEntries setAncestors;
            mempool.CalculateMemPoolAncestors(*it, setAncestors, false);

            if (!fVerbose) {
                UniValue o(UniValue::VARR);
                for (CTxMemPool::txiter ancestorIt : setAncestors) {
                    o.push_back((*ancestorIt)->GetTx().GetId().ToString());
                }
                return o;
            } else {
                UniValue o(UniValue::VOBJ);
                for (CTxMemPool::txiter ancestorIt : setAncestors) {
                    const CTxMemPoolEntryRef &e = *ancestorIt;
                    const TxId &_txid = e->GetTx().GetId();
                    UniValue info(UniValue::VOBJ);
                    entryToJSON(mempool, info, e);
                    o.pushKV(_txid.ToString(), info);
                }
                return o;
            }
        },
    };
}

static RPCHelpMan getmempooldescendants() {
    return RPCHelpMan{
        "getmempooldescendants",
        "If txid is in the mempool, returns all in-mempool descendants.\n",
        {
            {"txid", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The transaction id (must be in mempool)"},
            {"verbose", RPCArg::Type::BOOL, RPCArg::Default{false},
             "True for a json object, false for array of transaction ids"},
        },
        {
            RPCResult{"for verbose = false",
                      RPCResult::Type::ARR,
                      "",
                      "",
                      {{RPCResult::Type::STR_HEX, "",
                        "The transaction id of an in-mempool descendant "
                        "transaction"}}},
            RPCResult{"for verbose = true",
                      RPCResult::Type::OBJ_DYN,
                      "",
                      "",
                      {
                          {RPCResult::Type::OBJ, "transactionid", "",
                           MempoolEntryDescription()},
                      }},
        },
        RPCExamples{HelpExampleCli("getmempooldescendants", "\"mytxid\"") +
                    HelpExampleRpc("getmempooldescendants", "\"mytxid\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            bool fVerbose = false;
            if (!request.params[1].isNull()) {
                fVerbose = request.params[1].get_bool();
            }

            TxId txid(ParseHashV(request.params[0], "parameter 1"));

            const CTxMemPool &mempool = EnsureAnyMemPool(request.context);
            LOCK(mempool.cs);

            CTxMemPool::txiter it = mempool.mapTx.find(txid);
            if (it == mempool.mapTx.end()) {
                throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                                   "Transaction not in mempool");
            }

            CTxMemPool::setEntries setDescendants;
            mempool.CalculateDescendants(it, setDescendants);
            // CTxMemPool::CalculateDescendants will include the given tx
            setDescendants.erase(it);

            if (!fVerbose) {
                UniValue o(UniValue::VARR);
                for (CTxMemPool::txiter descendantIt : setDescendants) {
                    o.push_back((*descendantIt)->GetTx().GetId().ToString());
                }

                return o;
            } else {
                UniValue o(UniValue::VOBJ);
                for (CTxMemPool::txiter descendantIt : setDescendants) {
                    const CTxMemPoolEntryRef &e = *descendantIt;
                    const TxId &_txid = e->GetTx().GetId();
                    UniValue info(UniValue::VOBJ);
                    entryToJSON(mempool, info, e);
                    o.pushKV(_txid.ToString(), info);
                }
                return o;
            }
        },
    };
}

static RPCHelpMan getmempoolentry() {
    return RPCHelpMan{
        "getmempoolentry",
        "Returns mempool data for given transaction\n",
        {
            {"txid", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The transaction id (must be in mempool)"},
        },
        RPCResult{RPCResult::Type::OBJ, "", "", MempoolEntryDescription()},
        RPCExamples{HelpExampleCli("getmempoolentry", "\"mytxid\"") +
                    HelpExampleRpc("getmempoolentry", "\"mytxid\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            TxId txid(ParseHashV(request.params[0], "parameter 1"));

            const CTxMemPool &mempool = EnsureAnyMemPool(request.context);
            LOCK(mempool.cs);

            CTxMemPool::txiter it = mempool.mapTx.find(txid);
            if (it == mempool.mapTx.end()) {
                throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                                   "Transaction not in mempool");
            }

            UniValue info(UniValue::VOBJ);
            entryToJSON(mempool, info, *it);
            return info;
        },
    };
}

UniValue MempoolInfoToJSON(const CTxMemPool &pool) {
    // Make sure this call is atomic in the pool.
    LOCK(pool.cs);
    UniValue ret(UniValue::VOBJ);
    ret.pushKV("loaded", pool.GetLoadTried());
    ret.pushKV("size", (int64_t)pool.size());
    ret.pushKV("bytes", (int64_t)pool.GetTotalTxSize());
    ret.pushKV("usage", (int64_t)pool.DynamicMemoryUsage());
    ret.pushKV("total_fee", pool.GetTotalFee());
    ret.pushKV("maxmempool", pool.m_max_size_bytes);
    ret.pushKV(
        "mempoolminfee",
        std::max(pool.GetMinFee(), pool.m_min_relay_feerate).GetFeePerK());
    ret.pushKV("minrelaytxfee", pool.m_min_relay_feerate.GetFeePerK());
    ret.pushKV("unbroadcastcount", uint64_t{pool.GetUnbroadcastTxs().size()});
    return ret;
}

static RPCHelpMan getmempoolinfo() {
    const auto &ticker = Currency::get().ticker;
    return RPCHelpMan{
        "getmempoolinfo",
        "Returns details on the active state of the TX memory pool.\n",
        {},
        RPCResult{
            RPCResult::Type::OBJ,
            "",
            "",
            {
                {RPCResult::Type::BOOL, "loaded",
                 "True if the mempool is fully loaded"},
                {RPCResult::Type::NUM, "size", "Current tx count"},
                {RPCResult::Type::NUM, "bytes", "Sum of all transaction sizes"},
                {RPCResult::Type::NUM, "usage",
                 "Total memory usage for the mempool"},
                {RPCResult::Type::NUM, "maxmempool",
                 "Maximum memory usage for the mempool"},
                {RPCResult::Type::STR_AMOUNT, "total_fee",
                 "Total fees for the mempool in " + ticker +
                     ", ignoring modified fees through prioritizetransaction"},
                {RPCResult::Type::STR_AMOUNT, "mempoolminfee",
                 "Minimum fee rate in " + ticker +
                     "/kB for tx to be accepted. Is the maximum of "
                     "minrelaytxfee and minimum mempool fee"},
                {RPCResult::Type::STR_AMOUNT, "minrelaytxfee",
                 "Current minimum relay fee for transactions"},
                {RPCResult::Type::NUM, "unbroadcastcount",
                 "Current number of transactions that haven't passed initial "
                 "broadcast yet"},
            }},
        RPCExamples{HelpExampleCli("getmempoolinfo", "") +
                    HelpExampleRpc("getmempoolinfo", "")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            return MempoolInfoToJSON(EnsureAnyMemPool(request.context));
        },
    };
}

static RPCHelpMan savemempool() {
    return RPCHelpMan{
        "savemempool",
        "Dumps the mempool to disk. It will fail until the previous dump is "
        "fully loaded.\n",
        {},
        RPCResult{RPCResult::Type::OBJ,
                  "",
                  "",
                  {
                      {RPCResult::Type::STR, "filename",
                       "the directory and file where the mempool was saved"},
                  }},
        RPCExamples{HelpExampleCli("savemempool", "") +
                    HelpExampleRpc("savemempool", "")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            const ArgsManager &args{EnsureAnyArgsman(request.context)};
            const CTxMemPool &mempool = EnsureAnyMemPool(request.context);

            if (!mempool.GetLoadTried()) {
                throw JSONRPCError(RPC_MISC_ERROR,
                                   "The mempool was not loaded yet");
            }

            const fs::path &dump_path = MempoolPath(args);

            if (!DumpMempool(mempool, dump_path)) {
                throw JSONRPCError(RPC_MISC_ERROR,
                                   "Unable to dump mempool to disk");
            }

            UniValue ret(UniValue::VOBJ);
            ret.pushKV("filename", dump_path.u8string());

            return ret;
        },
    };
}

static RPCHelpMan submitpackage() {
    const auto &ticker = Currency::get().ticker;
    return RPCHelpMan{
        "submitpackage",
        "Submit a package of raw transactions (serialized, hex-encoded) to "
        "local node.\n"
        "The package must consist of a child with its parents, and none of the "
        "parents may depend on one another.\n"
        "The package will be validated according to consensus and mempool "
        "policy rules. If any transaction passes, it will be accepted to "
        "mempool.\n"
        "This RPC is experimental and the interface may be unstable. Refer to "
        "doc/policy/packages.md for documentation on package policies.\n"
        "Warning: successful submission does not mean the transactions will "
        "propagate throughout the network.\n",
        {
            {
                "package",
                RPCArg::Type::ARR,
                RPCArg::Optional::NO,
                "An array of raw transactions.",
                {
                    {"rawtx", RPCArg::Type::STR_HEX, RPCArg::Optional::OMITTED,
                     ""},
                },
            },
        },
        RPCResult{
            RPCResult::Type::OBJ,
            "",
            "",
            {
                {RPCResult::Type::STR, "package_msg",
                 "The transaction package result message. \"success\" "
                 "indicates all transactions were accepted into or are already "
                 "in the mempool."},
                {RPCResult::Type::OBJ_DYN,
                 "tx-results",
                 "transaction results keyed by txid",
                 {{RPCResult::Type::OBJ,
                   "txid",
                   "transaction txid",
                   {
                       {RPCResult::Type::NUM, "vsize", /*optional=*/true,
                        "Virtual transaction size."},
                       {RPCResult::Type::OBJ,
                        "fees",
                        /*optional=*/true,
                        "Transaction fees",
                        {
                            {RPCResult::Type::STR_AMOUNT, "base",
                             "transaction fee in " + ticker},
                            {RPCResult::Type::STR_AMOUNT, "effective-feerate",
                             "the effective feerate in " + ticker +
                                 " per KvB. May differ from the base feerate "
                                 "if, for example, there are modified fees "
                                 "from prioritisetransaction or a package "
                                 "feerate was used."},
                            {RPCResult::Type::ARR,
                             "effective-includes",
                             "transactions whose fees and vsizes are included "
                             "in effective-feerate.",
                             {
                                 RPCResult{RPCResult::Type::STR_HEX, "",
                                           "transaction txid in hex"},
                             }},
                        }},
                       {RPCResult::Type::STR, "error", /*optional=*/true,
                        "The transaction error string, if it was rejected by "
                        "the mempool"},
                   }}}},
            },
        },
        RPCExamples{HelpExampleCli("testmempoolaccept", "[rawtx1, rawtx2]") +
                    HelpExampleCli("submitpackage", "[rawtx1, rawtx2]")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            const UniValue raw_transactions = request.params[0].get_array();
            if (raw_transactions.size() < 1 ||
                raw_transactions.size() > MAX_PACKAGE_COUNT) {
                throw JSONRPCError(RPC_INVALID_PARAMETER,
                                   "Array must contain between 1 and " +
                                       ToString(MAX_PACKAGE_COUNT) +
                                       " transactions.");
            }

            std::vector<CTransactionRef> txns;
            txns.reserve(raw_transactions.size());
            for (const auto &rawtx : raw_transactions.getValues()) {
                CMutableTransaction mtx;
                if (!DecodeHexTx(mtx, rawtx.get_str())) {
                    throw JSONRPCError(
                        RPC_DESERIALIZATION_ERROR,
                        "TX decode failed: " + rawtx.get_str() +
                            " Make sure the tx has at least one input.");
                }
                txns.emplace_back(MakeTransactionRef(std::move(mtx)));
            }
            if (!IsChildWithParentsTree(txns)) {
                throw JSONRPCTransactionError(
                    TransactionError::INVALID_PACKAGE,
                    "package topology disallowed. not child-with-parents or "
                    "parents depend on each other.");
            }

            NodeContext &node = EnsureAnyNodeContext(request.context);
            CTxMemPool &mempool = EnsureMemPool(node);
            Chainstate &chainstate = EnsureChainman(node).ActiveChainstate();
            const auto package_result = WITH_LOCK(
                ::cs_main, return ProcessNewPackage(chainstate, mempool, txns,
                                                    /*test_accept=*/false));

            std::string package_msg = "success";

            // First catch package-wide errors, continue if we can
            switch (package_result.m_state.GetResult()) {
                case PackageValidationResult::PCKG_RESULT_UNSET: {
                    // Belt-and-suspenders check; everything should be
                    // successful here
                    CHECK_NONFATAL(package_result.m_tx_results.size() ==
                                   txns.size());
                    for (const auto &tx : txns) {
                        CHECK_NONFATAL(mempool.exists(tx->GetId()));
                    }
                    break;
                }
                case PackageValidationResult::PCKG_MEMPOOL_ERROR: {
                    // This only happens with internal bug; user should stop and
                    // report
                    throw JSONRPCTransactionError(
                        TransactionError::MEMPOOL_ERROR,
                        package_result.m_state.GetRejectReason());
                }
                case PackageValidationResult::PCKG_POLICY:
                case PackageValidationResult::PCKG_TX: {
                    // Package-wide error we want to return, but we also want to
                    // return individual responses
                    package_msg = package_result.m_state.GetRejectReason();
                    CHECK_NONFATAL(package_result.m_tx_results.size() ==
                                       txns.size() ||
                                   package_result.m_tx_results.empty());
                    break;
                }
            }
            size_t num_broadcast{0};
            for (const auto &tx : txns) {
                // We don't want to re-submit the txn for validation in
                // BroadcastTransaction
                if (!mempool.exists(tx->GetId())) {
                    continue;
                }

                // We do not expect an error here; we are only broadcasting
                // things already/still in mempool
                std::string err_string;
                const auto err = BroadcastTransaction(
                    node, tx, err_string, /*max_tx_fee=*/Amount::zero(),
                    /*relay=*/true, /*wait_callback=*/true);
                if (err != TransactionError::OK) {
                    throw JSONRPCTransactionError(
                        err,
                        strprintf("transaction broadcast failed: %s (%d "
                                  "transactions were broadcast successfully)",
                                  err_string, num_broadcast));
                }
                num_broadcast++;
            }

            UniValue rpc_result{UniValue::VOBJ};
            rpc_result.pushKV("package_msg", package_msg);
            UniValue tx_result_map{UniValue::VOBJ};
            for (const auto &tx : txns) {
                UniValue result_inner{UniValue::VOBJ};
                auto it = package_result.m_tx_results.find(tx->GetId());
                if (it == package_result.m_tx_results.end()) {
                    // No results, report error and continue
                    result_inner.pushKV("error", "unevaluated");
                    continue;
                }
                const auto &tx_result = it->second;
                switch (it->second.m_result_type) {
                    case MempoolAcceptResult::ResultType::INVALID:
                        result_inner.pushKV("error",
                                            it->second.m_state.ToString());
                        break;
                    case MempoolAcceptResult::ResultType::VALID:
                    case MempoolAcceptResult::ResultType::MEMPOOL_ENTRY:
                        result_inner.pushKV(
                            "vsize", int64_t{it->second.m_vsize.value()});
                        UniValue fees(UniValue::VOBJ);
                        fees.pushKV("base", it->second.m_base_fees.value());
                        if (tx_result.m_result_type ==
                            MempoolAcceptResult::ResultType::VALID) {
                            // Effective feerate is not provided for
                            // MEMPOOL_ENTRY (already in mempool) transactions
                            // even though modified fees is known, because it is
                            // unknown whether package feerate was used when it
                            // was originally submitted.
                            fees.pushKV("effective-feerate",
                                        tx_result.m_effective_feerate.value()
                                            .GetFeePerK());
                            UniValue effective_includes_res(UniValue::VARR);
                            for (const auto &txid :
                                 tx_result.m_txids_fee_calculations.value()) {
                                effective_includes_res.push_back(
                                    txid.ToString());
                            }
                            fees.pushKV("effective-includes",
                                        effective_includes_res);
                        }
                        result_inner.pushKV("fees", fees);
                        break;
                }
                tx_result_map.pushKV(tx->GetId().GetHex(), result_inner);
            }
            rpc_result.pushKV("tx-results", tx_result_map);

            return rpc_result;
        },
    };
}

void RegisterMempoolRPCCommands(CRPCTable &t) {
    static const CRPCCommand commands[]{
        // category     actor (function)
        // --------     ----------------
        {"rawtransactions", sendrawtransaction},
        {"rawtransactions", testmempoolaccept},
        {"blockchain", getmempoolancestors},
        {"blockchain", getmempooldescendants},
        {"blockchain", getmempoolentry},
        {"blockchain", getmempoolinfo},
        {"blockchain", getrawmempool},
        {"blockchain", savemempool},
        {"rawtransactions", submitpackage},
    };
    for (const auto &c : commands) {
        t.appendCommand(c.name, &c);
    }
}
