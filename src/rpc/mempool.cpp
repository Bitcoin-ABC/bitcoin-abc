// Copyright (c) 2010 Satoshi Nakamoto
// Copyright (c) 2009-2022 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <core_io.h>
#include <fs.h>
#include <node/context.h>
#include <policy/settings.h>
#include <primitives/transaction.h>
#include <rpc/server.h>
#include <rpc/server_util.h>
#include <rpc/util.h>
#include <txmempool.h>
#include <univalue.h>
#include <validation.h>

using node::NodeContext;

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
            // UniValue::__pushKV is used instead which currently is O(1).
            o.__pushKV(txid.ToString(), info);
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
    ret.pushKV("loaded", pool.IsLoaded());
    ret.pushKV("size", (int64_t)pool.size());
    ret.pushKV("bytes", (int64_t)pool.GetTotalTxSize());
    ret.pushKV("usage", (int64_t)pool.DynamicMemoryUsage());
    ret.pushKV("total_fee", pool.GetTotalFee());
    ret.pushKV("maxmempool", pool.m_max_size_bytes);
    ret.pushKV("mempoolminfee",
               std::max(pool.GetMinFee(), ::minRelayTxFee).GetFeePerK());
    ret.pushKV("minrelaytxfee", ::minRelayTxFee.GetFeePerK());
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
            const CTxMemPool &mempool = EnsureAnyMemPool(request.context);

            const NodeContext &node = EnsureAnyNodeContext(request.context);

            if (!mempool.IsLoaded()) {
                throw JSONRPCError(RPC_MISC_ERROR,
                                   "The mempool was not loaded yet");
            }

            if (!DumpMempool(mempool)) {
                throw JSONRPCError(RPC_MISC_ERROR,
                                   "Unable to dump mempool to disk");
            }

            UniValue ret(UniValue::VOBJ);
            ret.pushKV("filename",
                       fs::path((node.args->GetDataDirNet() / "mempool.dat"))
                           .u8string());

            return ret;
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
    };
    for (const auto &c : commands) {
        t.appendCommand(c.name, &c);
    }
}
