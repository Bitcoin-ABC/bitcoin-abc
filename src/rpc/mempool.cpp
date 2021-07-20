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
#include <validation.h>

using kernel::DumpMempool;

using node::MempoolPath;
using node::NodeContext;
using node::ShouldPersistMempool;

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

RPCHelpMan getrawmempool() {
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

RPCHelpMan getmempoolancestors() {
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

RPCHelpMan getmempooldescendants() {
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

RPCHelpMan getmempoolentry() {
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

RPCHelpMan getmempoolinfo() {
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

RPCHelpMan savemempool() {
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
        "local node (-regtest only).\n"
        "The package will be validated according to consensus and mempool "
        "policy rules. If all transactions pass, they will be accepted to "
        "mempool.\n"
        "This RPC is experimental and the interface may be unstable. Refer to "
        "doc/policy/packages.md for documentation on package policies.\n"
        "Warning: until package relay is in use, successful submission does "
        "not mean the transaction will propagate to other nodes on the "
        "network.\n"
        "Currently, each transaction is broadcasted individually after "
        "submission, which means they must meet other nodes' feerate "
        "requirements alone.\n",
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
                {RPCResult::Type::OBJ_DYN,
                 "tx-results",
                 "transaction results keyed by txid",
                 {{RPCResult::Type::OBJ,
                   "txid",
                   "transaction txid",
                   {
                       {RPCResult::Type::NUM, "vsize",
                        "Virtual transaction size."},
                       {RPCResult::Type::OBJ,
                        "fees",
                        "Transaction fees",
                        {
                            {RPCResult::Type::STR_AMOUNT, "base",
                             "transaction fee in " + ticker},
                        }},
                   }}}},
                {RPCResult::Type::STR_AMOUNT, "package-feerate",
                 /*optional=*/true,
                 "package feerate used for feerate checks in " + ticker +
                     " per KvB. Excludes transactions which were deduplicated "
                     "or accepted individually."},
            },
        },
        RPCExamples{HelpExampleCli("testmempoolaccept", "[rawtx1, rawtx2]") +
                    HelpExampleCli("submitpackage", "[rawtx1, rawtx2]")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            if (!Params().IsMockableChain()) {
                throw std::runtime_error("submitpackage is for regression "
                                         "testing (-regtest mode) only");
            }
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

            NodeContext &node = EnsureAnyNodeContext(request.context);
            CTxMemPool &mempool = EnsureMemPool(node);
            Chainstate &chainstate = EnsureChainman(node).ActiveChainstate();
            const auto package_result = WITH_LOCK(
                ::cs_main, return ProcessNewPackage(chainstate, mempool, txns,
                                                    /*test_accept=*/false));

            // First catch any errors.
            switch (package_result.m_state.GetResult()) {
                case PackageValidationResult::PCKG_RESULT_UNSET:
                    break;
                case PackageValidationResult::PCKG_POLICY: {
                    throw JSONRPCTransactionError(
                        TransactionError::INVALID_PACKAGE,
                        package_result.m_state.GetRejectReason());
                }
                case PackageValidationResult::PCKG_MEMPOOL_ERROR: {
                    throw JSONRPCTransactionError(
                        TransactionError::MEMPOOL_ERROR,
                        package_result.m_state.GetRejectReason());
                }
                case PackageValidationResult::PCKG_TX: {
                    for (const auto &tx : txns) {
                        auto it = package_result.m_tx_results.find(tx->GetId());
                        if (it != package_result.m_tx_results.end() &&
                            it->second.m_state.IsInvalid()) {
                            throw JSONRPCTransactionError(
                                TransactionError::MEMPOOL_REJECTED,
                                strprintf(
                                    "%s failed: %s", tx->GetHash().ToString(),
                                    it->second.m_state.GetRejectReason()));
                        }
                    }
                    // If a PCKG_TX error was returned, there must have been an
                    // invalid transaction.
                    NONFATAL_UNREACHABLE();
                }
            }
            for (const auto &tx : txns) {
                size_t num_submitted{0};
                std::string err_string;
                const auto err = BroadcastTransaction(
                    node, tx, err_string, Amount::zero(), true, true);
                if (err != TransactionError::OK) {
                    throw JSONRPCTransactionError(
                        err,
                        strprintf("transaction broadcast failed: %s (all "
                                  "transactions were submitted, %d "
                                  "transactions were broadcast successfully)",
                                  err_string, num_submitted));
                }
            }
            UniValue rpc_result{UniValue::VOBJ};
            UniValue tx_result_map{UniValue::VOBJ};
            std::set<uint256> replaced_txids;
            for (const auto &tx : txns) {
                auto it = package_result.m_tx_results.find(tx->GetId());
                CHECK_NONFATAL(it != package_result.m_tx_results.end());
                UniValue result_inner{UniValue::VOBJ};
                if (it->second.m_result_type ==
                        MempoolAcceptResult::ResultType::VALID ||
                    it->second.m_result_type ==
                        MempoolAcceptResult::ResultType::MEMPOOL_ENTRY) {
                    result_inner.pushKV("vsize",
                                        int64_t{it->second.m_vsize.value()});
                    UniValue fees(UniValue::VOBJ);
                    fees.pushKV("base", it->second.m_base_fees.value());
                    result_inner.pushKV("fees", fees);
                }
                tx_result_map.pushKV(tx->GetId().GetHex(), result_inner);
            }
            rpc_result.pushKV("tx-results", tx_result_map);
            if (package_result.m_package_feerate.has_value()) {
                rpc_result.pushKV(
                    "package-feerate",
                    package_result.m_package_feerate.value().GetFeePerK());
            }

            return rpc_result;
        },
    };
}

void RegisterMempoolRPCCommands(CRPCTable &t) {
    static const CRPCCommand commands[]{
        // category     actor (function)
        // --------     ----------------
        {"blockchain", getmempoolancestors},
        {"blockchain", getmempooldescendants},
        {"blockchain", getmempoolentry},
        {"blockchain", getmempoolinfo},
        {"blockchain", getrawmempool},
        {"blockchain", savemempool},
        {"hidden", submitpackage},
    };
    for (const auto &c : commands) {
        t.appendCommand(c.name, &c);
    }
}
