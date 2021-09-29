// Copyright (c) 2010 Satoshi Nakamoto
// Copyright (c) 2009-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <rpc/blockchain.h>

#include <amount.h>
#include <blockdb.h>
#include <blockfilter.h>
#include <chain.h>
#include <chainparams.h>
#include <checkpoints.h>
#include <coins.h>
#include <config.h>
#include <consensus/validation.h>
#include <core_io.h>
#include <hash.h>
#include <index/blockfilterindex.h>
#include <network.h>
#include <node/coinstats.h>
#include <node/context.h>
#include <node/utxo_snapshot.h>
#include <policy/policy.h>
#include <primitives/transaction.h>
#include <rpc/server.h>
#include <rpc/util.h>
#include <script/descriptor.h>
#include <streams.h>
#include <txdb.h>
#include <txmempool.h>
#include <undo.h>
#include <util/ref.h>
#include <util/strencodings.h>
#include <util/system.h>
#include <util/translation.h>
#include <validation.h>
#include <validationinterface.h>
#include <versionbitsinfo.h> // For VersionBitsDeploymentInfo
#include <warnings.h>

#include <condition_variable>
#include <cstdint>
#include <memory>
#include <mutex>

struct CUpdatedBlock {
    BlockHash hash;
    int height;
};

static Mutex cs_blockchange;
static std::condition_variable cond_blockchange;
static CUpdatedBlock latestblock GUARDED_BY(cs_blockchange);

NodeContext &EnsureNodeContext(const util::Ref &context) {
    if (!context.Has<NodeContext>()) {
        throw JSONRPCError(RPC_INTERNAL_ERROR, "Node context not found");
    }
    return context.Get<NodeContext>();
}

CTxMemPool &EnsureMemPool(const util::Ref &context) {
    NodeContext &node = EnsureNodeContext(context);
    if (!node.mempool) {
        throw JSONRPCError(RPC_CLIENT_MEMPOOL_DISABLED,
                           "Mempool disabled or instance not found");
    }
    return *node.mempool;
}

ChainstateManager &EnsureChainman(const util::Ref &context) {
    NodeContext &node = EnsureNodeContext(context);
    if (!node.chainman) {
        throw JSONRPCError(RPC_INTERNAL_ERROR, "Node chainman not found");
    }
    return *node.chainman;
}

/**
 * Calculate the difficulty for a given block index.
 */
double GetDifficulty(const CBlockIndex *blockindex) {
    CHECK_NONFATAL(blockindex);

    int nShift = (blockindex->nBits >> 24) & 0xff;
    double dDiff = double(0x0000ffff) / double(blockindex->nBits & 0x00ffffff);

    while (nShift < 29) {
        dDiff *= 256.0;
        nShift++;
    }
    while (nShift > 29) {
        dDiff /= 256.0;
        nShift--;
    }

    return dDiff;
}

static int ComputeNextBlockAndDepth(const CBlockIndex *tip,
                                    const CBlockIndex *blockindex,
                                    const CBlockIndex *&next) {
    next = tip->GetAncestor(blockindex->nHeight + 1);
    if (next && next->pprev == blockindex) {
        return tip->nHeight - blockindex->nHeight + 1;
    }
    next = nullptr;
    return blockindex == tip ? 1 : -1;
}

UniValue blockheaderToJSON(const CBlockIndex *tip,
                           const CBlockIndex *blockindex) {
    // Serialize passed information without accessing chain state of the active
    // chain!
    // For performance reasons
    AssertLockNotHeld(cs_main);

    UniValue result(UniValue::VOBJ);
    result.pushKV("hash", blockindex->GetBlockHash().GetHex());
    const CBlockIndex *pnext;
    int confirmations = ComputeNextBlockAndDepth(tip, blockindex, pnext);
    result.pushKV("confirmations", confirmations);
    result.pushKV("height", blockindex->nHeight);
    result.pushKV("version", blockindex->nVersion);
    result.pushKV("versionHex", strprintf("%08x", blockindex->nVersion));
    result.pushKV("merkleroot", blockindex->hashMerkleRoot.GetHex());
    result.pushKV("time", int64_t(blockindex->nTime));
    result.pushKV("mediantime", int64_t(blockindex->GetMedianTimePast()));
    result.pushKV("nonce", uint64_t(blockindex->nNonce));
    result.pushKV("bits", strprintf("%08x", blockindex->nBits));
    result.pushKV("difficulty", GetDifficulty(blockindex));
    result.pushKV("chainwork", blockindex->nChainWork.GetHex());
    result.pushKV("nTx", uint64_t(blockindex->nTx));

    if (blockindex->pprev) {
        result.pushKV("previousblockhash",
                      blockindex->pprev->GetBlockHash().GetHex());
    }
    if (pnext) {
        result.pushKV("nextblockhash", pnext->GetBlockHash().GetHex());
    }
    return result;
}

UniValue blockToJSON(const CBlock &block, const CBlockIndex *tip,
                     const CBlockIndex *blockindex, bool txDetails) {
    // Serialize passed information without accessing chain state of the active
    // chain!
    // For performance reasons
    AssertLockNotHeld(cs_main);

    UniValue result(UniValue::VOBJ);
    result.pushKV("hash", blockindex->GetBlockHash().GetHex());
    const CBlockIndex *pnext;
    int confirmations = ComputeNextBlockAndDepth(tip, blockindex, pnext);
    result.pushKV("confirmations", confirmations);
    result.pushKV("size", (int)::GetSerializeSize(block, PROTOCOL_VERSION));
    result.pushKV("height", blockindex->nHeight);
    result.pushKV("version", block.nVersion);
    result.pushKV("versionHex", strprintf("%08x", block.nVersion));
    result.pushKV("merkleroot", block.hashMerkleRoot.GetHex());
    UniValue txs(UniValue::VARR);
    for (const auto &tx : block.vtx) {
        if (txDetails) {
            UniValue objTx(UniValue::VOBJ);
            TxToUniv(*tx, uint256(), objTx, true, RPCSerializationFlags());
            txs.push_back(objTx);
        } else {
            txs.push_back(tx->GetId().GetHex());
        }
    }
    result.pushKV("tx", txs);
    result.pushKV("time", block.GetBlockTime());
    result.pushKV("mediantime", int64_t(blockindex->GetMedianTimePast()));
    result.pushKV("nonce", uint64_t(block.nNonce));
    result.pushKV("bits", strprintf("%08x", block.nBits));
    result.pushKV("difficulty", GetDifficulty(blockindex));
    result.pushKV("chainwork", blockindex->nChainWork.GetHex());
    result.pushKV("nTx", uint64_t(blockindex->nTx));

    if (blockindex->pprev) {
        result.pushKV("previousblockhash",
                      blockindex->pprev->GetBlockHash().GetHex());
    }
    if (pnext) {
        result.pushKV("nextblockhash", pnext->GetBlockHash().GetHex());
    }
    return result;
}

static UniValue getblockcount(const Config &config,
                              const JSONRPCRequest &request) {
    RPCHelpMan{
        "getblockcount",
        "Returns the height of the most-work fully-validated chain.\n"
        "The genesis block has height 0.\n",
        {},
        RPCResult{RPCResult::Type::NUM, "", "The current block count"},
        RPCExamples{HelpExampleCli("getblockcount", "") +
                    HelpExampleRpc("getblockcount", "")},
    }
        .Check(request);

    LOCK(cs_main);
    return ::ChainActive().Height();
}

static UniValue getbestblockhash(const Config &config,
                                 const JSONRPCRequest &request) {
    RPCHelpMan{
        "getbestblockhash",
        "Returns the hash of the best (tip) block in the "
        "most-work fully-validated chain.\n",
        {},
        RPCResult{RPCResult::Type::STR_HEX, "", "the block hash, hex-encoded"},
        RPCExamples{HelpExampleCli("getbestblockhash", "") +
                    HelpExampleRpc("getbestblockhash", "")},
    }
        .Check(request);

    LOCK(cs_main);
    return ::ChainActive().Tip()->GetBlockHash().GetHex();
}

UniValue getfinalizedblockhash(const Config &config,
                               const JSONRPCRequest &request) {
    RPCHelpMan{
        "getfinalizedblockhash",
        "Returns the hash of the currently finalized block\n",
        {},
        RPCResult{RPCResult::Type::STR_HEX, "", "the block hash, hex-encoded"},
        RPCExamples{HelpExampleCli("getfinalizedblockhash", "") +
                    HelpExampleRpc("getfinalizedblockhash", "")},
    }
        .Check(request);

    LOCK(cs_main);
    const CBlockIndex *blockIndexFinalized =
        ::ChainstateActive().GetFinalizedBlock();
    if (blockIndexFinalized) {
        return blockIndexFinalized->GetBlockHash().GetHex();
    }
    return UniValue(UniValue::VSTR);
}

void RPCNotifyBlockChange(const CBlockIndex *pindex) {
    if (pindex) {
        LOCK(cs_blockchange);
        latestblock.hash = pindex->GetBlockHash();
        latestblock.height = pindex->nHeight;
    }
    cond_blockchange.notify_all();
}

static UniValue waitfornewblock(const Config &config,
                                const JSONRPCRequest &request) {
    RPCHelpMan{
        "waitfornewblock",
        "Waits for a specific new block and returns useful info about it.\n"
        "\nReturns the current block on timeout or exit.\n",
        {
            {"timeout", RPCArg::Type::NUM, /* default */ "0",
             "Time in milliseconds to wait for a response. 0 indicates no "
             "timeout."},
        },
        RPCResult{RPCResult::Type::OBJ,
                  "",
                  "",
                  {
                      {RPCResult::Type::STR_HEX, "hash", "The blockhash"},
                      {RPCResult::Type::NUM, "height", "Block height"},
                  }},
        RPCExamples{HelpExampleCli("waitfornewblock", "1000") +
                    HelpExampleRpc("waitfornewblock", "1000")},
    }
        .Check(request);

    int timeout = 0;
    if (!request.params[0].isNull()) {
        timeout = request.params[0].get_int();
    }

    CUpdatedBlock block;
    {
        WAIT_LOCK(cs_blockchange, lock);
        block = latestblock;
        if (timeout) {
            cond_blockchange.wait_for(
                lock, std::chrono::milliseconds(timeout),
                [&block]() EXCLUSIVE_LOCKS_REQUIRED(cs_blockchange) {
                    return latestblock.height != block.height ||
                           latestblock.hash != block.hash || !IsRPCRunning();
                });
        } else {
            cond_blockchange.wait(
                lock, [&block]() EXCLUSIVE_LOCKS_REQUIRED(cs_blockchange) {
                    return latestblock.height != block.height ||
                           latestblock.hash != block.hash || !IsRPCRunning();
                });
        }
        block = latestblock;
    }
    UniValue ret(UniValue::VOBJ);
    ret.pushKV("hash", block.hash.GetHex());
    ret.pushKV("height", block.height);
    return ret;
}

static UniValue waitforblock(const Config &config,
                             const JSONRPCRequest &request) {
    RPCHelpMan{
        "waitforblock",
        "Waits for a specific new block and returns useful info about it.\n"
        "\nReturns the current block on timeout or exit.\n",
        {
            {"blockhash", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "Block hash to wait for."},
            {"timeout", RPCArg::Type::NUM, /* default */ "0",
             "Time in milliseconds to wait for a response. 0 indicates no "
             "timeout."},
        },
        RPCResult{RPCResult::Type::OBJ,
                  "",
                  "",
                  {
                      {RPCResult::Type::STR_HEX, "hash", "The blockhash"},
                      {RPCResult::Type::NUM, "height", "Block height"},
                  }},
        RPCExamples{HelpExampleCli("waitforblock",
                                   "\"0000000000079f8ef3d2c688c244eb7a4570b24c9"
                                   "ed7b4a8c619eb02596f8862\" 1000") +
                    HelpExampleRpc("waitforblock",
                                   "\"0000000000079f8ef3d2c688c244eb7a4570b24c9"
                                   "ed7b4a8c619eb02596f8862\", 1000")},
    }
        .Check(request);

    int timeout = 0;

    BlockHash hash(ParseHashV(request.params[0], "blockhash"));

    if (!request.params[1].isNull()) {
        timeout = request.params[1].get_int();
    }

    CUpdatedBlock block;
    {
        WAIT_LOCK(cs_blockchange, lock);
        if (timeout) {
            cond_blockchange.wait_for(
                lock, std::chrono::milliseconds(timeout),
                [&hash]() EXCLUSIVE_LOCKS_REQUIRED(cs_blockchange) {
                    return latestblock.hash == hash || !IsRPCRunning();
                });
        } else {
            cond_blockchange.wait(
                lock, [&hash]() EXCLUSIVE_LOCKS_REQUIRED(cs_blockchange) {
                    return latestblock.hash == hash || !IsRPCRunning();
                });
        }
        block = latestblock;
    }

    UniValue ret(UniValue::VOBJ);
    ret.pushKV("hash", block.hash.GetHex());
    ret.pushKV("height", block.height);
    return ret;
}

static UniValue waitforblockheight(const Config &config,
                                   const JSONRPCRequest &request) {
    RPCHelpMan{
        "waitforblockheight",
        "Waits for (at least) block height and returns the height and "
        "hash\nof the current tip.\n"
        "\nReturns the current block on timeout or exit.\n",
        {
            {"height", RPCArg::Type::NUM, RPCArg::Optional::NO,
             "Block height to wait for."},
            {"timeout", RPCArg::Type::NUM, /* default */ "0",
             "Time in milliseconds to wait for a response. 0 indicates no "
             "timeout."},
        },
        RPCResult{RPCResult::Type::OBJ,
                  "",
                  "",
                  {
                      {RPCResult::Type::STR_HEX, "hash", "The blockhash"},
                      {RPCResult::Type::NUM, "height", "Block height"},
                  }},
        RPCExamples{HelpExampleCli("waitforblockheight", "100 1000") +
                    HelpExampleRpc("waitforblockheight", "100, 1000")},
    }
        .Check(request);

    int timeout = 0;

    int height = request.params[0].get_int();

    if (!request.params[1].isNull()) {
        timeout = request.params[1].get_int();
    }

    CUpdatedBlock block;
    {
        WAIT_LOCK(cs_blockchange, lock);
        if (timeout) {
            cond_blockchange.wait_for(
                lock, std::chrono::milliseconds(timeout),
                [&height]() EXCLUSIVE_LOCKS_REQUIRED(cs_blockchange) {
                    return latestblock.height >= height || !IsRPCRunning();
                });
        } else {
            cond_blockchange.wait(
                lock, [&height]() EXCLUSIVE_LOCKS_REQUIRED(cs_blockchange) {
                    return latestblock.height >= height || !IsRPCRunning();
                });
        }
        block = latestblock;
    }
    UniValue ret(UniValue::VOBJ);
    ret.pushKV("hash", block.hash.GetHex());
    ret.pushKV("height", block.height);
    return ret;
}

static UniValue
syncwithvalidationinterfacequeue(const Config &config,
                                 const JSONRPCRequest &request) {
    RPCHelpMan{
        "syncwithvalidationinterfacequeue",
        "Waits for the validation interface queue to catch up on everything "
        "that was there when we entered this function.\n",
        {},
        RPCResult{RPCResult::Type::NONE, "", ""},
        RPCExamples{HelpExampleCli("syncwithvalidationinterfacequeue", "") +
                    HelpExampleRpc("syncwithvalidationinterfacequeue", "")},
    }
        .Check(request);

    SyncWithValidationInterfaceQueue();
    return NullUniValue;
}

static UniValue getdifficulty(const Config &config,
                              const JSONRPCRequest &request) {
    RPCHelpMan{
        "getdifficulty",
        "Returns the proof-of-work difficulty as a multiple of the minimum "
        "difficulty.\n",
        {},
        RPCResult{RPCResult::Type::NUM, "",
                  "the proof-of-work difficulty as a multiple of the minimum "
                  "difficulty."},
        RPCExamples{HelpExampleCli("getdifficulty", "") +
                    HelpExampleRpc("getdifficulty", "")},
    }
        .Check(request);

    LOCK(cs_main);
    return GetDifficulty(::ChainActive().Tip());
}

static std::vector<RPCResult> MempoolEntryDescription() {
    const auto &ticker = Currency::get().ticker;
    return {
        RPCResult{RPCResult::Type::NUM, "size", "transaction size."},
        RPCResult{RPCResult::Type::STR_AMOUNT, "fee",
                  "transaction fee in " + ticker + " (DEPRECATED)"},
        RPCResult{RPCResult::Type::STR_AMOUNT, "modifiedfee",
                  "transaction fee with fee deltas used for mining priority "
                  "(DEPRECATED)"},
        RPCResult{RPCResult::Type::NUM_TIME, "time",
                  "local time transaction entered pool in seconds since 1 Jan "
                  "1970 GMT"},
        RPCResult{RPCResult::Type::NUM, "height",
                  "block height when transaction entered pool"},
        RPCResult{RPCResult::Type::NUM, "descendantcount",
                  "number of in-mempool descendant transactions (including "
                  "this one)"},
        RPCResult{RPCResult::Type::NUM, "descendantsize",
                  "transaction size of in-mempool descendants "
                  "(including this one)"},
        RPCResult{RPCResult::Type::STR_AMOUNT, "descendantfees",
                  "modified fees (see above) of in-mempool descendants "
                  "(including this one) (DEPRECATED)"},
        RPCResult{
            RPCResult::Type::NUM, "ancestorcount",
            "number of in-mempool ancestor transactions (including this one)"},
        RPCResult{
            RPCResult::Type::NUM, "ancestorsize",
            "transaction size of in-mempool ancestors (including this one)"},
        RPCResult{RPCResult::Type::STR_AMOUNT, "ancestorfees",
                  "modified fees (see above) of in-mempool ancestors "
                  "(including this one) (DEPRECATED)"},
        RPCResult{RPCResult::Type::OBJ,
                  "fees",
                  "",
                  {
                      RPCResult{RPCResult::Type::STR_AMOUNT, "base",
                                "transaction fee in " + ticker},
                      RPCResult{RPCResult::Type::STR_AMOUNT, "modified",
                                "transaction fee with fee deltas used for "
                                "mining priority in " +
                                    ticker},
                      RPCResult{RPCResult::Type::STR_AMOUNT, "ancestor",
                                "modified fees (see above) of in-mempool "
                                "ancestors (including this one) in " +
                                    ticker},
                      RPCResult{RPCResult::Type::STR_AMOUNT, "descendant",
                                "modified fees (see above) of in-mempool "
                                "descendants (including this one) in " +
                                    ticker},
                  }},
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
                        const CTxMemPoolEntry &e)
    EXCLUSIVE_LOCKS_REQUIRED(pool.cs) {
    AssertLockHeld(pool.cs);

    UniValue fees(UniValue::VOBJ);
    fees.pushKV("base", e.GetFee());
    fees.pushKV("modified", e.GetModifiedFee());
    fees.pushKV("ancestor", e.GetModFeesWithAncestors());
    fees.pushKV("descendant", e.GetModFeesWithDescendants());
    info.pushKV("fees", fees);

    info.pushKV("size", (int)e.GetTxSize());
    info.pushKV("fee", e.GetFee());
    info.pushKV("modifiedfee", e.GetModifiedFee());
    info.pushKV("time", count_seconds(e.GetTime()));
    info.pushKV("height", (int)e.GetHeight());
    info.pushKV("descendantcount", e.GetCountWithDescendants());
    info.pushKV("descendantsize", e.GetSizeWithDescendants());
    info.pushKV("descendantfees", e.GetModFeesWithDescendants() / SATOSHI);
    info.pushKV("ancestorcount", e.GetCountWithAncestors());
    info.pushKV("ancestorsize", e.GetSizeWithAncestors());
    info.pushKV("ancestorfees", e.GetModFeesWithAncestors() / SATOSHI);
    const CTransaction &tx = e.GetTx();
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
    const CTxMemPool::txiter &it = pool.mapTx.find(tx.GetId());
    const CTxMemPoolEntry::Children &children = it->GetMemPoolChildrenConst();
    for (const CTxMemPoolEntry &child : children) {
        spent.push_back(child.GetTx().GetId().ToString());
    }

    info.pushKV("spentby", spent);
    info.pushKV("unbroadcast", pool.IsUnbroadcastTx(tx.GetId()));
}

UniValue MempoolToJSON(const CTxMemPool &pool, bool verbose) {
    if (verbose) {
        LOCK(pool.cs);
        UniValue o(UniValue::VOBJ);
        for (const CTxMemPoolEntry &e : pool.mapTx) {
            const uint256 &txid = e.GetTx().GetId();
            UniValue info(UniValue::VOBJ);
            entryToJSON(pool, info, e);
            // Mempool has unique entries so there is no advantage in using
            // UniValue::pushKV, which checks if the key already exists in O(N).
            // UniValue::__pushKV is used instead which currently is O(1).
            o.__pushKV(txid.ToString(), info);
        }
        return o;
    } else {
        std::vector<uint256> vtxids;
        pool.queryHashes(vtxids);

        UniValue a(UniValue::VARR);
        for (const uint256 &txid : vtxids) {
            a.push_back(txid.ToString());
        }

        return a;
    }
}

static UniValue getrawmempool(const Config &config,
                              const JSONRPCRequest &request) {
    RPCHelpMan{
        "getrawmempool",
        "Returns all transaction ids in memory pool as a json array of "
        "string transaction ids.\n"
        "\nHint: use getmempoolentry to fetch a specific transaction from the "
        "mempool.\n",
        {
            {"verbose", RPCArg::Type::BOOL, /* default */ "false",
             "True for a json object, false for array of transaction ids"},
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
        },
        RPCExamples{HelpExampleCli("getrawmempool", "true") +
                    HelpExampleRpc("getrawmempool", "true")},
    }
        .Check(request);

    bool fVerbose = false;
    if (!request.params[0].isNull()) {
        fVerbose = request.params[0].get_bool();
    }

    return MempoolToJSON(EnsureMemPool(request.context), fVerbose);
}

static UniValue getmempoolancestors(const Config &config,
                                    const JSONRPCRequest &request) {
    RPCHelpMan{
        "getmempoolancestors",
        "If txid is in the mempool, returns all in-mempool ancestors.\n",
        {
            {"txid", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The transaction id (must be in mempool)"},
            {"verbose", RPCArg::Type::BOOL, /* default */ "false",
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
    }
        .Check(request);

    bool fVerbose = false;
    if (!request.params[1].isNull()) {
        fVerbose = request.params[1].get_bool();
    }

    TxId txid(ParseHashV(request.params[0], "parameter 1"));

    const CTxMemPool &mempool = EnsureMemPool(request.context);
    LOCK(mempool.cs);

    CTxMemPool::txiter it = mempool.mapTx.find(txid);
    if (it == mempool.mapTx.end()) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                           "Transaction not in mempool");
    }

    CTxMemPool::setEntries setAncestors;
    uint64_t noLimit = std::numeric_limits<uint64_t>::max();
    std::string dummy;
    mempool.CalculateMemPoolAncestors(*it, setAncestors, noLimit, noLimit,
                                      noLimit, noLimit, dummy, false);

    if (!fVerbose) {
        UniValue o(UniValue::VARR);
        for (CTxMemPool::txiter ancestorIt : setAncestors) {
            o.push_back(ancestorIt->GetTx().GetId().ToString());
        }
        return o;
    } else {
        UniValue o(UniValue::VOBJ);
        for (CTxMemPool::txiter ancestorIt : setAncestors) {
            const CTxMemPoolEntry &e = *ancestorIt;
            const TxId &_txid = e.GetTx().GetId();
            UniValue info(UniValue::VOBJ);
            entryToJSON(mempool, info, e);
            o.pushKV(_txid.ToString(), info);
        }
        return o;
    }
}

static UniValue getmempooldescendants(const Config &config,
                                      const JSONRPCRequest &request) {
    RPCHelpMan{
        "getmempooldescendants",
        "If txid is in the mempool, returns all in-mempool descendants.\n",
        {
            {"txid", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The transaction id (must be in mempool)"},
            {"verbose", RPCArg::Type::BOOL, /* default */ "false",
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
    }
        .Check(request);

    bool fVerbose = false;
    if (!request.params[1].isNull()) {
        fVerbose = request.params[1].get_bool();
    }

    TxId txid(ParseHashV(request.params[0], "parameter 1"));

    const CTxMemPool &mempool = EnsureMemPool(request.context);
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
            o.push_back(descendantIt->GetTx().GetId().ToString());
        }

        return o;
    } else {
        UniValue o(UniValue::VOBJ);
        for (CTxMemPool::txiter descendantIt : setDescendants) {
            const CTxMemPoolEntry &e = *descendantIt;
            const TxId &_txid = e.GetTx().GetId();
            UniValue info(UniValue::VOBJ);
            entryToJSON(mempool, info, e);
            o.pushKV(_txid.ToString(), info);
        }
        return o;
    }
}

static UniValue getmempoolentry(const Config &config,
                                const JSONRPCRequest &request) {
    RPCHelpMan{
        "getmempoolentry",
        "Returns mempool data for given transaction\n",
        {
            {"txid", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The transaction id (must be in mempool)"},
        },
        RPCResult{RPCResult::Type::OBJ, "", "", MempoolEntryDescription()},
        RPCExamples{HelpExampleCli("getmempoolentry", "\"mytxid\"") +
                    HelpExampleRpc("getmempoolentry", "\"mytxid\"")},
    }
        .Check(request);

    TxId txid(ParseHashV(request.params[0], "parameter 1"));

    const CTxMemPool &mempool = EnsureMemPool(request.context);
    LOCK(mempool.cs);

    CTxMemPool::txiter it = mempool.mapTx.find(txid);
    if (it == mempool.mapTx.end()) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                           "Transaction not in mempool");
    }

    const CTxMemPoolEntry &e = *it;
    UniValue info(UniValue::VOBJ);
    entryToJSON(mempool, info, e);
    return info;
}

static UniValue getblockhash(const Config &config,
                             const JSONRPCRequest &request) {
    RPCHelpMan{
        "getblockhash",
        "Returns hash of block in best-block-chain at height provided.\n",
        {
            {"height", RPCArg::Type::NUM, RPCArg::Optional::NO,
             "The height index"},
        },
        RPCResult{RPCResult::Type::STR_HEX, "", "The block hash"},
        RPCExamples{HelpExampleCli("getblockhash", "1000") +
                    HelpExampleRpc("getblockhash", "1000")},
    }
        .Check(request);

    LOCK(cs_main);

    int nHeight = request.params[0].get_int();
    if (nHeight < 0 || nHeight > ::ChainActive().Height()) {
        throw JSONRPCError(RPC_INVALID_PARAMETER, "Block height out of range");
    }

    CBlockIndex *pblockindex = ::ChainActive()[nHeight];
    return pblockindex->GetBlockHash().GetHex();
}

static UniValue getblockheader(const Config &config,
                               const JSONRPCRequest &request) {
    RPCHelpMan{
        "getblockheader",
        "If verbose is false, returns a string that is serialized, hex-encoded "
        "data for blockheader 'hash'.\n"
        "If verbose is true, returns an Object with information about "
        "blockheader <hash>.\n",
        {
            {"blockhash", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The block hash"},
            {"verbose", RPCArg::Type::BOOL, /* default */ "true",
             "true for a json object, false for the hex-encoded data"},
        },
        {
            RPCResult{
                "for verbose = true",
                RPCResult::Type::OBJ,
                "",
                "",
                {
                    {RPCResult::Type::STR_HEX, "hash",
                     "the block hash (same as provided)"},
                    {RPCResult::Type::NUM, "confirmations",
                     "The number of confirmations, or -1 if the block is not "
                     "on the main chain"},
                    {RPCResult::Type::NUM, "height",
                     "The block height or index"},
                    {RPCResult::Type::NUM, "version", "The block version"},
                    {RPCResult::Type::STR_HEX, "versionHex",
                     "The block version formatted in hexadecimal"},
                    {RPCResult::Type::STR_HEX, "merkleroot", "The merkle root"},
                    {RPCResult::Type::NUM_TIME, "time",
                     "The block time expressed in " + UNIX_EPOCH_TIME},
                    {RPCResult::Type::NUM_TIME, "mediantime",
                     "The median block time expressed in " + UNIX_EPOCH_TIME},
                    {RPCResult::Type::NUM, "nonce", "The nonce"},
                    {RPCResult::Type::STR_HEX, "bits", "The bits"},
                    {RPCResult::Type::NUM, "difficulty", "The difficulty"},
                    {RPCResult::Type::STR_HEX, "chainwork",
                     "Expected number of hashes required to produce the "
                     "current chain"},
                    {RPCResult::Type::NUM, "nTx",
                     "The number of transactions in the block"},
                    {RPCResult::Type::STR_HEX, "previousblockhash",
                     "The hash of the previous block"},
                    {RPCResult::Type::STR_HEX, "nextblockhash",
                     "The hash of the next block"},
                }},
            RPCResult{"for verbose=false", RPCResult::Type::STR_HEX, "",
                      "A string that is serialized, hex-encoded data for block "
                      "'hash'"},
        },
        RPCExamples{HelpExampleCli("getblockheader",
                                   "\"00000000c937983704a73af28acdec37b049d214a"
                                   "dbda81d7e2a3dd146f6ed09\"") +
                    HelpExampleRpc("getblockheader",
                                   "\"00000000c937983704a73af28acdec37b049d214a"
                                   "dbda81d7e2a3dd146f6ed09\"")},
    }
        .Check(request);

    BlockHash hash(ParseHashV(request.params[0], "hash"));

    bool fVerbose = true;
    if (!request.params[1].isNull()) {
        fVerbose = request.params[1].get_bool();
    }

    const CBlockIndex *pblockindex;
    const CBlockIndex *tip;
    {
        LOCK(cs_main);
        pblockindex = LookupBlockIndex(hash);
        tip = ::ChainActive().Tip();
    }

    if (!pblockindex) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY, "Block not found");
    }

    if (!fVerbose) {
        CDataStream ssBlock(SER_NETWORK, PROTOCOL_VERSION);
        ssBlock << pblockindex->GetBlockHeader();
        std::string strHex = HexStr(ssBlock);
        return strHex;
    }

    return blockheaderToJSON(tip, pblockindex);
}

static CBlock GetBlockChecked(const Config &config,
                              const CBlockIndex *pblockindex) {
    CBlock block;
    if (IsBlockPruned(pblockindex)) {
        throw JSONRPCError(RPC_MISC_ERROR, "Block not available (pruned data)");
    }

    if (!ReadBlockFromDisk(block, pblockindex,
                           config.GetChainParams().GetConsensus())) {
        // Block not found on disk. This could be because we have the block
        // header in our index but not yet have the block or did not accept the
        // block.
        throw JSONRPCError(RPC_MISC_ERROR, "Block not found on disk");
    }

    return block;
}

static CBlockUndo GetUndoChecked(const CBlockIndex *pblockindex) {
    CBlockUndo blockUndo;
    if (IsBlockPruned(pblockindex)) {
        throw JSONRPCError(RPC_MISC_ERROR,
                           "Undo data not available (pruned data)");
    }

    if (!UndoReadFromDisk(blockUndo, pblockindex)) {
        throw JSONRPCError(RPC_MISC_ERROR, "Can't read undo data from disk");
    }

    return blockUndo;
}

static UniValue getblock(const Config &config, const JSONRPCRequest &request) {
    RPCHelpMan{
        "getblock",
        "If verbosity is 0 or false, returns a string that is serialized, "
        "hex-encoded data for block 'hash'.\n"
        "If verbosity is 1 or true, returns an Object with information about "
        "block <hash>.\n"
        "If verbosity is 2, returns an Object with information about block "
        "<hash> and information about each transaction.\n",
        {
            {"blockhash", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The block hash"},
            {"verbosity|verbose", RPCArg::Type::NUM, /* default */ "1",
             "0 for hex-encoded data, 1 for a json object, and 2 for json "
             "object with transaction data"},
        },
        {
            RPCResult{"for verbosity = 0", RPCResult::Type::STR_HEX, "",
                      "A string that is serialized, hex-encoded data for block "
                      "'hash'"},
            RPCResult{
                "for verbosity = 1",
                RPCResult::Type::OBJ,
                "",
                "",
                {
                    {RPCResult::Type::STR_HEX, "hash",
                     "the block hash (same as provided)"},
                    {RPCResult::Type::NUM, "confirmations",
                     "The number of confirmations, or -1 if the block is not "
                     "on the main chain"},
                    {RPCResult::Type::NUM, "size", "The block size"},
                    {RPCResult::Type::NUM, "height",
                     "The block height or index"},
                    {RPCResult::Type::NUM, "version", "The block version"},
                    {RPCResult::Type::STR_HEX, "versionHex",
                     "The block version formatted in hexadecimal"},
                    {RPCResult::Type::STR_HEX, "merkleroot", "The merkle root"},
                    {RPCResult::Type::ARR,
                     "tx",
                     "The transaction ids",
                     {{RPCResult::Type::STR_HEX, "", "The transaction id"}}},
                    {RPCResult::Type::NUM_TIME, "time",
                     "The block time expressed in " + UNIX_EPOCH_TIME},
                    {RPCResult::Type::NUM_TIME, "mediantime",
                     "The median block time expressed in " + UNIX_EPOCH_TIME},
                    {RPCResult::Type::NUM, "nonce", "The nonce"},
                    {RPCResult::Type::STR_HEX, "bits", "The bits"},
                    {RPCResult::Type::NUM, "difficulty", "The difficulty"},
                    {RPCResult::Type::STR_HEX, "chainwork",
                     "Expected number of hashes required to produce the chain "
                     "up to this block (in hex)"},
                    {RPCResult::Type::NUM, "nTx",
                     "The number of transactions in the block"},
                    {RPCResult::Type::STR_HEX, "previousblockhash",
                     "The hash of the previous block"},
                    {RPCResult::Type::STR_HEX, "nextblockhash",
                     "The hash of the next block"},
                }},
            RPCResult{"for verbosity = 2",
                      RPCResult::Type::OBJ,
                      "",
                      "",
                      {
                          {RPCResult::Type::ELISION, "",
                           "Same output as verbosity = 1"},
                          {RPCResult::Type::ARR,
                           "tx",
                           "",
                           {
                               {RPCResult::Type::OBJ,
                                "",
                                "",
                                {
                                    {RPCResult::Type::ELISION, "",
                                     "The transactions in the format of the "
                                     "getrawtransaction RPC. Different from "
                                     "verbosity = 1 \"tx\" result"},
                                }},
                           }},
                          {RPCResult::Type::ELISION, "",
                           "Same output as verbosity = 1"},
                      }},
        },
        RPCExamples{
            HelpExampleCli("getblock", "\"00000000c937983704a73af28acdec37b049d"
                                       "214adbda81d7e2a3dd146f6ed09\"") +
            HelpExampleRpc("getblock", "\"00000000c937983704a73af28acdec37b049d"
                                       "214adbda81d7e2a3dd146f6ed09\"")},
    }
        .Check(request);

    BlockHash hash(ParseHashV(request.params[0], "blockhash"));

    int verbosity = 1;
    if (!request.params[1].isNull()) {
        if (request.params[1].isNum()) {
            verbosity = request.params[1].get_int();
        } else {
            verbosity = request.params[1].get_bool() ? 1 : 0;
        }
    }

    CBlock block;
    const CBlockIndex *pblockindex;
    const CBlockIndex *tip;
    {
        LOCK(cs_main);
        pblockindex = LookupBlockIndex(hash);
        tip = ::ChainActive().Tip();

        if (!pblockindex) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY, "Block not found");
        }

        block = GetBlockChecked(config, pblockindex);
    }

    if (verbosity <= 0) {
        CDataStream ssBlock(SER_NETWORK,
                            PROTOCOL_VERSION | RPCSerializationFlags());
        ssBlock << block;
        std::string strHex = HexStr(ssBlock);
        return strHex;
    }

    return blockToJSON(block, tip, pblockindex, verbosity >= 2);
}

static UniValue pruneblockchain(const Config &config,
                                const JSONRPCRequest &request) {
    RPCHelpMan{
        "pruneblockchain",
        "",
        {
            {"height", RPCArg::Type::NUM, RPCArg::Optional::NO,
             "The block height to prune up to. May be set to a discrete "
             "height, or to a " +
                 UNIX_EPOCH_TIME +
                 "\n"
                 "                  to prune blocks whose block time is at "
                 "least 2 hours older than the provided timestamp."},
        },
        RPCResult{RPCResult::Type::NUM, "", "Height of the last block pruned"},
        RPCExamples{HelpExampleCli("pruneblockchain", "1000") +
                    HelpExampleRpc("pruneblockchain", "1000")},
    }
        .Check(request);

    if (!fPruneMode) {
        throw JSONRPCError(
            RPC_MISC_ERROR,
            "Cannot prune blocks because node is not in prune mode.");
    }

    LOCK(cs_main);

    int heightParam = request.params[0].get_int();
    if (heightParam < 0) {
        throw JSONRPCError(RPC_INVALID_PARAMETER, "Negative block height.");
    }

    // Height value more than a billion is too high to be a block height, and
    // too low to be a block time (corresponds to timestamp from Sep 2001).
    if (heightParam > 1000000000) {
        // Add a 2 hour buffer to include blocks which might have had old
        // timestamps
        CBlockIndex *pindex = ::ChainActive().FindEarliestAtLeast(
            heightParam - TIMESTAMP_WINDOW, 0);
        if (!pindex) {
            throw JSONRPCError(
                RPC_INVALID_PARAMETER,
                "Could not find block with at least the specified timestamp.");
        }
        heightParam = pindex->nHeight;
    }

    unsigned int height = (unsigned int)heightParam;
    unsigned int chainHeight = (unsigned int)::ChainActive().Height();
    if (chainHeight < config.GetChainParams().PruneAfterHeight()) {
        throw JSONRPCError(RPC_MISC_ERROR,
                           "Blockchain is too short for pruning.");
    } else if (height > chainHeight) {
        throw JSONRPCError(
            RPC_INVALID_PARAMETER,
            "Blockchain is shorter than the attempted prune height.");
    } else if (height > chainHeight - MIN_BLOCKS_TO_KEEP) {
        LogPrint(BCLog::RPC, "Attempt to prune blocks close to the tip. "
                             "Retaining the minimum number of blocks.\n");
        height = chainHeight - MIN_BLOCKS_TO_KEEP;
    }

    PruneBlockFilesManual(height);
    const CBlockIndex *block = ::ChainActive().Tip();
    CHECK_NONFATAL(block);
    while (block->pprev && (block->pprev->nStatus.hasData())) {
        block = block->pprev;
    }
    return uint64_t(block->nHeight);
}

static UniValue gettxoutsetinfo(const Config &config,
                                const JSONRPCRequest &request) {
    RPCHelpMan{
        "gettxoutsetinfo",
        "Returns statistics about the unspent transaction output set.\n"
        "Note this call may take some time.\n",
        {
            {"hash_type", RPCArg::Type::STR, /* default */ "hash_serialized",
             "Which UTXO set hash should be calculated. Options: "
             "'hash_serialized' (the legacy algorithm), 'none'."},
        },
        RPCResult{RPCResult::Type::OBJ,
                  "",
                  "",
                  {
                      {RPCResult::Type::NUM, "height",
                       "The current block height (index)"},
                      {RPCResult::Type::STR_HEX, "bestblock",
                       "The hash of the block at the tip of the chain"},
                      {RPCResult::Type::NUM, "transactions",
                       "The number of transactions with unspent outputs"},
                      {RPCResult::Type::NUM, "txouts",
                       "The number of unspent transaction outputs"},
                      {RPCResult::Type::NUM, "bogosize",
                       "A meaningless metric for UTXO set size"},
                      {RPCResult::Type::STR_HEX, "hash_serialized",
                       "The serialized hash (only present if 'hash_serialized' "
                       "hash_type is chosen)"},
                      {RPCResult::Type::NUM, "disk_size",
                       "The estimated size of the chainstate on disk"},
                      {RPCResult::Type::STR_AMOUNT, "total_amount",
                       "The total amount"},
                  }},
        RPCExamples{HelpExampleCli("gettxoutsetinfo", "") +
                    HelpExampleRpc("gettxoutsetinfo", "")},
    }
        .Check(request);

    UniValue ret(UniValue::VOBJ);

    CCoinsStats stats;
    ::ChainstateActive().ForceFlushStateToDisk();

    const CoinStatsHashType hash_type =
        ParseHashType(request.params[0], CoinStatsHashType::HASH_SERIALIZED);

    CCoinsView *coins_view =
        WITH_LOCK(cs_main, return &ChainstateActive().CoinsDB());
    NodeContext &node = EnsureNodeContext(request.context);
    if (GetUTXOStats(coins_view, stats, hash_type,
                     node.rpc_interruption_point)) {
        ret.pushKV("height", int64_t(stats.nHeight));
        ret.pushKV("bestblock", stats.hashBlock.GetHex());
        ret.pushKV("transactions", int64_t(stats.nTransactions));
        ret.pushKV("txouts", int64_t(stats.nTransactionOutputs));
        ret.pushKV("bogosize", int64_t(stats.nBogoSize));
        if (hash_type == CoinStatsHashType::HASH_SERIALIZED) {
            ret.pushKV("hash_serialized", stats.hashSerialized.GetHex());
        }
        ret.pushKV("disk_size", stats.nDiskSize);
        ret.pushKV("total_amount", stats.nTotalAmount);
    } else {
        throw JSONRPCError(RPC_INTERNAL_ERROR, "Unable to read UTXO set");
    }
    return ret;
}

UniValue gettxout(const Config &config, const JSONRPCRequest &request) {
    RPCHelpMan{
        "gettxout",
        "Returns details about an unspent transaction output.\n",
        {
            {"txid", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The transaction id"},
            {"n", RPCArg::Type::NUM, RPCArg::Optional::NO, "vout number"},
            {"include_mempool", RPCArg::Type::BOOL, /* default */ "true",
             "Whether to include the mempool. Note that an unspent output that "
             "is spent in the mempool won't appear."},
        },
        RPCResult{
            RPCResult::Type::OBJ,
            "",
            "",
            {
                {RPCResult::Type::STR_HEX, "bestblock",
                 "The hash of the block at the tip of the chain"},
                {RPCResult::Type::NUM, "confirmations",
                 "The number of confirmations"},
                {RPCResult::Type::STR_AMOUNT, "value",
                 "The transaction value in " + Currency::get().ticker},
                {RPCResult::Type::OBJ,
                 "scriptPubKey",
                 "",
                 {
                     {RPCResult::Type::STR_HEX, "asm", ""},
                     {RPCResult::Type::STR_HEX, "hex", ""},
                     {RPCResult::Type::NUM, "reqSigs",
                      "Number of required signatures"},
                     {RPCResult::Type::STR_HEX, "type",
                      "The type, eg pubkeyhash"},
                     {RPCResult::Type::ARR,
                      "addresses",
                      "array of bitcoin addresses",
                      {{RPCResult::Type::STR, "address", "bitcoin address"}}},
                 }},
                {RPCResult::Type::BOOL, "coinbase", "Coinbase or not"},
            }},
        RPCExamples{"\nGet unspent transactions\n" +
                    HelpExampleCli("listunspent", "") + "\nView the details\n" +
                    HelpExampleCli("gettxout", "\"txid\" 1") +
                    "\nAs a JSON-RPC call\n" +
                    HelpExampleRpc("gettxout", "\"txid\", 1")},
    }
        .Check(request);

    LOCK(cs_main);

    UniValue ret(UniValue::VOBJ);

    TxId txid(ParseHashV(request.params[0], "txid"));
    int n = request.params[1].get_int();
    COutPoint out(txid, n);
    bool fMempool = true;
    if (!request.params[2].isNull()) {
        fMempool = request.params[2].get_bool();
    }

    Coin coin;
    CCoinsViewCache *coins_view = &::ChainstateActive().CoinsTip();

    if (fMempool) {
        const CTxMemPool &mempool = EnsureMemPool(request.context);
        LOCK(mempool.cs);
        CCoinsViewMemPool view(coins_view, mempool);
        if (!view.GetCoin(out, coin) || mempool.isSpent(out)) {
            return NullUniValue;
        }
    } else {
        if (!coins_view->GetCoin(out, coin)) {
            return NullUniValue;
        }
    }

    const CBlockIndex *pindex = LookupBlockIndex(coins_view->GetBestBlock());
    ret.pushKV("bestblock", pindex->GetBlockHash().GetHex());
    if (coin.GetHeight() == MEMPOOL_HEIGHT) {
        ret.pushKV("confirmations", 0);
    } else {
        ret.pushKV("confirmations",
                   int64_t(pindex->nHeight - coin.GetHeight() + 1));
    }
    ret.pushKV("value", coin.GetTxOut().nValue);
    UniValue o(UniValue::VOBJ);
    ScriptPubKeyToUniv(coin.GetTxOut().scriptPubKey, o, true);
    ret.pushKV("scriptPubKey", o);
    ret.pushKV("coinbase", coin.IsCoinBase());

    return ret;
}

static UniValue verifychain(const Config &config,
                            const JSONRPCRequest &request) {
    RPCHelpMan{
        "verifychain",
        "Verifies blockchain database.\n",
        {
            {"checklevel", RPCArg::Type::NUM,
             /* default */ strprintf("%d, range=0-4", DEFAULT_CHECKLEVEL),
             strprintf("How thorough the block verification is:\n - %s",
                       Join(CHECKLEVEL_DOC, "\n- "))},
            {"nblocks", RPCArg::Type::NUM,
             /* default */ strprintf("%d, 0=all", DEFAULT_CHECKBLOCKS),
             "The number of blocks to check."},
        },
        RPCResult{RPCResult::Type::BOOL, "", "Verified or not"},
        RPCExamples{HelpExampleCli("verifychain", "") +
                    HelpExampleRpc("verifychain", "")},
    }
        .Check(request);

    const int check_level(request.params[0].isNull()
                              ? DEFAULT_CHECKLEVEL
                              : request.params[0].get_int());
    const int check_depth{request.params[1].isNull()
                              ? DEFAULT_CHECKBLOCKS
                              : request.params[1].get_int()};

    LOCK(cs_main);

    return CVerifyDB().VerifyDB(config, &::ChainstateActive().CoinsTip(),
                                check_level, check_depth);
}

static void BIP9SoftForkDescPushBack(UniValue &softforks,
                                     const Consensus::Params &consensusParams,
                                     Consensus::DeploymentPos id)
    EXCLUSIVE_LOCKS_REQUIRED(cs_main) {
    // For BIP9 deployments.
    // Deployments (e.g. testdummy) with timeout value before Jan 1, 2009 are
    // hidden. A timeout value of 0 guarantees a softfork will never be
    // activated. This is used when merging logic to implement a proposed
    // softfork without a specified deployment schedule.
    if (consensusParams.vDeployments[id].nTimeout <= 1230768000) {
        return;
    }

    UniValue bip9(UniValue::VOBJ);
    const ThresholdState thresholdState =
        VersionBitsTipState(consensusParams, id);
    switch (thresholdState) {
        case ThresholdState::DEFINED:
            bip9.pushKV("status", "defined");
            break;
        case ThresholdState::STARTED:
            bip9.pushKV("status", "started");
            break;
        case ThresholdState::LOCKED_IN:
            bip9.pushKV("status", "locked_in");
            break;
        case ThresholdState::ACTIVE:
            bip9.pushKV("status", "active");
            break;
        case ThresholdState::FAILED:
            bip9.pushKV("status", "failed");
            break;
    }
    if (ThresholdState::STARTED == thresholdState) {
        bip9.pushKV("bit", consensusParams.vDeployments[id].bit);
    }
    bip9.pushKV("start_time", consensusParams.vDeployments[id].nStartTime);
    bip9.pushKV("timeout", consensusParams.vDeployments[id].nTimeout);
    int64_t since_height = VersionBitsTipStateSinceHeight(consensusParams, id);
    bip9.pushKV("since", since_height);
    if (ThresholdState::STARTED == thresholdState) {
        UniValue statsUV(UniValue::VOBJ);
        BIP9Stats statsStruct = VersionBitsTipStatistics(consensusParams, id);
        statsUV.pushKV("period", statsStruct.period);
        statsUV.pushKV("threshold", statsStruct.threshold);
        statsUV.pushKV("elapsed", statsStruct.elapsed);
        statsUV.pushKV("count", statsStruct.count);
        statsUV.pushKV("possible", statsStruct.possible);
        bip9.pushKV("statistics", statsUV);
    }

    UniValue rv(UniValue::VOBJ);
    rv.pushKV("type", "bip9");
    rv.pushKV("bip9", bip9);
    if (ThresholdState::ACTIVE == thresholdState) {
        rv.pushKV("height", since_height);
    }
    rv.pushKV("active", ThresholdState::ACTIVE == thresholdState);

    softforks.pushKV(VersionBitsDeploymentInfo[id].name, rv);
}

UniValue getblockchaininfo(const Config &config,
                           const JSONRPCRequest &request) {
    RPCHelpMan{
        "getblockchaininfo",
        "Returns an object containing various state info regarding blockchain "
        "processing.\n",
        {},
        RPCResult{
            RPCResult::Type::OBJ,
            "",
            "",
            {
                {RPCResult::Type::STR, "chain",
                 "current network name (main, test, regtest)"},
                {RPCResult::Type::NUM, "blocks",
                 "the height of the most-work fully-validated chain. The "
                 "genesis block has height 0"},
                {RPCResult::Type::NUM, "headers",
                 "the current number of headers we have validated"},
                {RPCResult::Type::STR, "bestblockhash",
                 "the hash of the currently best block"},
                {RPCResult::Type::NUM, "difficulty", "the current difficulty"},
                {RPCResult::Type::NUM, "mediantime",
                 "median time for the current best block"},
                {RPCResult::Type::NUM, "verificationprogress",
                 "estimate of verification progress [0..1]"},
                {RPCResult::Type::BOOL, "initialblockdownload",
                 "(debug information) estimate of whether this node is in "
                 "Initial Block Download mode"},
                {RPCResult::Type::STR_HEX, "chainwork",
                 "total amount of work in active chain, in hexadecimal"},
                {RPCResult::Type::NUM, "size_on_disk",
                 "the estimated size of the block and undo files on disk"},
                {RPCResult::Type::BOOL, "pruned",
                 "if the blocks are subject to pruning"},
                {RPCResult::Type::NUM, "pruneheight",
                 "lowest-height complete block stored (only present if pruning "
                 "is enabled)"},
                {RPCResult::Type::BOOL, "automatic_pruning",
                 "whether automatic pruning is enabled (only present if "
                 "pruning is enabled)"},
                {RPCResult::Type::NUM, "prune_target_size",
                 "the target size used by pruning (only present if automatic "
                 "pruning is enabled)"},
                {RPCResult::Type::OBJ_DYN,
                 "softforks",
                 "status of softforks",
                 {
                     {RPCResult::Type::OBJ,
                      "xxxx",
                      "name of the softfork",
                      {
                          {RPCResult::Type::STR, "type",
                           "one of \"buried\", \"bip9\""},
                          {RPCResult::Type::OBJ,
                           "bip9",
                           "status of bip9 softforks (only for \"bip9\" type)",
                           {
                               {RPCResult::Type::STR, "status",
                                "one of \"defined\", \"started\", "
                                "\"locked_in\", \"active\", \"failed\""},
                               {RPCResult::Type::NUM, "bit",
                                "the bit (0-28) in the block version field "
                                "used to signal this softfork (only for "
                                "\"started\" status)"},
                               {RPCResult::Type::NUM_TIME, "start_time",
                                "the minimum median time past of a block at "
                                "which the bit gains its meaning"},
                               {RPCResult::Type::NUM_TIME, "timeout",
                                "the median time past of a block at which the "
                                "deployment is considered failed if not yet "
                                "locked in"},
                               {RPCResult::Type::NUM, "since",
                                "height of the first block to which the status "
                                "applies"},
                               {RPCResult::Type::OBJ,
                                "statistics",
                                "numeric statistics about BIP9 signalling for "
                                "a softfork",
                                {
                                    {RPCResult::Type::NUM, "period",
                                     "the length in blocks of the BIP9 "
                                     "signalling period"},
                                    {RPCResult::Type::NUM, "threshold",
                                     "the number of blocks with the version "
                                     "bit set required to activate the "
                                     "feature"},
                                    {RPCResult::Type::NUM, "elapsed",
                                     "the number of blocks elapsed since the "
                                     "beginning of the current period"},
                                    {RPCResult::Type::NUM, "count",
                                     "the number of blocks with the version "
                                     "bit set in the current period"},
                                    {RPCResult::Type::BOOL, "possible",
                                     "returns false if there are not enough "
                                     "blocks left in this period to pass "
                                     "activation threshold"},
                                }},
                           }},
                          {RPCResult::Type::NUM, "height",
                           "height of the first block which the rules are or "
                           "will be enforced (only for \"buried\" type, or "
                           "\"bip9\" type with \"active\" status)"},
                          {RPCResult::Type::BOOL, "active",
                           "true if the rules are enforced for the mempool and "
                           "the next block"},
                      }},
                 }},
                {RPCResult::Type::STR, "warnings",
                 "any network and blockchain warnings"},
            }},
        RPCExamples{HelpExampleCli("getblockchaininfo", "") +
                    HelpExampleRpc("getblockchaininfo", "")},
    }
        .Check(request);

    LOCK(cs_main);

    const CChainParams &chainparams = config.GetChainParams();

    const CBlockIndex *tip = ::ChainActive().Tip();
    UniValue obj(UniValue::VOBJ);
    obj.pushKV("chain", chainparams.NetworkIDString());
    obj.pushKV("blocks", int(::ChainActive().Height()));
    obj.pushKV("headers", pindexBestHeader ? pindexBestHeader->nHeight : -1);
    obj.pushKV("bestblockhash", tip->GetBlockHash().GetHex());
    obj.pushKV("difficulty", double(GetDifficulty(tip)));
    obj.pushKV("mediantime", int64_t(tip->GetMedianTimePast()));
    obj.pushKV("verificationprogress",
               GuessVerificationProgress(Params().TxData(), tip));
    obj.pushKV("initialblockdownload",
               ::ChainstateActive().IsInitialBlockDownload());
    obj.pushKV("chainwork", tip->nChainWork.GetHex());
    obj.pushKV("size_on_disk", CalculateCurrentUsage());
    obj.pushKV("pruned", fPruneMode);

    if (fPruneMode) {
        const CBlockIndex *block = tip;
        CHECK_NONFATAL(block);
        while (block->pprev && (block->pprev->nStatus.hasData())) {
            block = block->pprev;
        }

        obj.pushKV("pruneheight", block->nHeight);

        // if 0, execution bypasses the whole if block.
        bool automatic_pruning = (gArgs.GetArg("-prune", 0) != 1);
        obj.pushKV("automatic_pruning", automatic_pruning);
        if (automatic_pruning) {
            obj.pushKV("prune_target_size", nPruneTarget);
        }
    }

    UniValue softforks(UniValue::VOBJ);
    for (int i = 0; i < (int)Consensus::MAX_VERSION_BITS_DEPLOYMENTS; i++) {
        BIP9SoftForkDescPushBack(softforks, chainparams.GetConsensus(),
                                 Consensus::DeploymentPos(i));
    }
    obj.pushKV("softforks", softforks);

    obj.pushKV("warnings", GetWarnings(false).original);
    return obj;
}

/** Comparison function for sorting the getchaintips heads.  */
struct CompareBlocksByHeight {
    bool operator()(const CBlockIndex *a, const CBlockIndex *b) const {
        // Make sure that unequal blocks with the same height do not compare
        // equal. Use the pointers themselves to make a distinction.
        if (a->nHeight != b->nHeight) {
            return (a->nHeight > b->nHeight);
        }

        return a < b;
    }
};

static UniValue getchaintips(const Config &config,
                             const JSONRPCRequest &request) {
    RPCHelpMan{
        "getchaintips",
        "Return information about all known tips in the block tree, including "
        "the main chain as well as orphaned branches.\n",
        {},
        RPCResult{
            RPCResult::Type::ARR,
            "",
            "",
            {{RPCResult::Type::OBJ,
              "",
              "",
              {
                  {RPCResult::Type::NUM, "height", "height of the chain tip"},
                  {RPCResult::Type::STR_HEX, "hash", "block hash of the tip"},
                  {RPCResult::Type::NUM, "branchlen",
                   "zero for main chain, otherwise length of branch connecting "
                   "the tip to the main chain"},
                  {RPCResult::Type::STR, "status",
                   "status of the chain, \"active\" for the main chain\n"
                   "Possible values for status:\n"
                   "1.  \"invalid\"               This branch contains at "
                   "least one invalid block\n"
                   "2.  \"parked\"                This branch contains at "
                   "least one parked block\n"
                   "3.  \"headers-only\"          Not all blocks for this "
                   "branch are available, but the headers are valid\n"
                   "4.  \"valid-headers\"         All blocks are available for "
                   "this branch, but they were never fully validated\n"
                   "5.  \"valid-fork\"            This branch is not part of "
                   "the active chain, but is fully validated\n"
                   "6.  \"active\"                This is the tip of the "
                   "active main chain, which is certainly valid"},
              }}}},
        RPCExamples{HelpExampleCli("getchaintips", "") +
                    HelpExampleRpc("getchaintips", "")},
    }
        .Check(request);

    ChainstateManager &chainman = EnsureChainman(request.context);
    LOCK(cs_main);

    /**
     * Idea: The set of chain tips is the active chain tip, plus orphan blocks
     * which do not have another orphan building off of them. Algorithm:
     *  - Make one pass through BlockIndex(), picking out the orphan
     * blocks, and also storing a set of the orphan block's pprev pointers.
     *  - Iterate through the orphan blocks. If the block isn't pointed to by
     * another orphan, it is a chain tip.
     *  - Add the active chain tip
     */
    std::set<const CBlockIndex *, CompareBlocksByHeight> setTips;
    std::set<const CBlockIndex *> setOrphans;
    std::set<const CBlockIndex *> setPrevs;

    for (const std::pair<const BlockHash, CBlockIndex *> &item :
         chainman.BlockIndex()) {
        if (!chainman.ActiveChain().Contains(item.second)) {
            setOrphans.insert(item.second);
            setPrevs.insert(item.second->pprev);
        }
    }

    for (std::set<const CBlockIndex *>::iterator it = setOrphans.begin();
         it != setOrphans.end(); ++it) {
        if (setPrevs.erase(*it) == 0) {
            setTips.insert(*it);
        }
    }

    // Always report the currently active tip.
    setTips.insert(chainman.ActiveChain().Tip());

    /* Construct the output array.  */
    UniValue res(UniValue::VARR);
    for (const CBlockIndex *block : setTips) {
        UniValue obj(UniValue::VOBJ);
        obj.pushKV("height", block->nHeight);
        obj.pushKV("hash", block->phashBlock->GetHex());

        const int branchLen =
            block->nHeight - chainman.ActiveChain().FindFork(block)->nHeight;
        obj.pushKV("branchlen", branchLen);

        std::string status;
        if (chainman.ActiveChain().Contains(block)) {
            // This block is part of the currently active chain.
            status = "active";
        } else if (block->nStatus.isInvalid()) {
            // This block or one of its ancestors is invalid.
            status = "invalid";
        } else if (block->nStatus.isOnParkedChain()) {
            // This block or one of its ancestors is parked.
            status = "parked";
        } else if (!block->HaveTxsDownloaded()) {
            // This block cannot be connected because full block data for it or
            // one of its parents is missing.
            status = "headers-only";
        } else if (block->IsValid(BlockValidity::SCRIPTS)) {
            // This block is fully validated, but no longer part of the active
            // chain. It was probably the active block once, but was
            // reorganized.
            status = "valid-fork";
        } else if (block->IsValid(BlockValidity::TREE)) {
            // The headers for this block are valid, but it has not been
            // validated. It was probably never part of the most-work chain.
            status = "valid-headers";
        } else {
            // No clue.
            status = "unknown";
        }
        obj.pushKV("status", status);

        res.push_back(obj);
    }

    return res;
}

UniValue MempoolInfoToJSON(const CTxMemPool &pool) {
    // Make sure this call is atomic in the pool.
    LOCK(pool.cs);
    UniValue ret(UniValue::VOBJ);
    ret.pushKV("loaded", pool.IsLoaded());
    ret.pushKV("size", (int64_t)pool.size());
    ret.pushKV("bytes", (int64_t)pool.GetTotalTxSize());
    ret.pushKV("usage", (int64_t)pool.DynamicMemoryUsage());
    size_t maxmempool =
        gArgs.GetArg("-maxmempool", DEFAULT_MAX_MEMPOOL_SIZE) * 1000000;
    ret.pushKV("maxmempool", (int64_t)maxmempool);
    ret.pushKV(
        "mempoolminfee",
        std::max(pool.GetMinFee(maxmempool), ::minRelayTxFee).GetFeePerK());
    ret.pushKV("minrelaytxfee", ::minRelayTxFee.GetFeePerK());
    ret.pushKV("unbroadcastcount", uint64_t{pool.GetUnbroadcastTxs().size()});
    return ret;
}

static UniValue getmempoolinfo(const Config &config,
                               const JSONRPCRequest &request) {
    RPCHelpMan{
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
                {RPCResult::Type::STR_AMOUNT, "mempoolminfee",
                 "Minimum fee rate in " + Currency::get().ticker +
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
    }
        .Check(request);

    return MempoolInfoToJSON(EnsureMemPool(request.context));
}

static UniValue preciousblock(const Config &config,
                              const JSONRPCRequest &request) {
    RPCHelpMan{
        "preciousblock",
        "Treats a block as if it were received before others with the same "
        "work.\n"
        "\nA later preciousblock call can override the effect of an earlier "
        "one.\n"
        "\nThe effects of preciousblock are not retained across restarts.\n",
        {
            {"blockhash", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "the hash of the block to mark as precious"},
        },
        RPCResult{RPCResult::Type::NONE, "", ""},
        RPCExamples{HelpExampleCli("preciousblock", "\"blockhash\"") +
                    HelpExampleRpc("preciousblock", "\"blockhash\"")},
    }
        .Check(request);

    BlockHash hash(ParseHashV(request.params[0], "blockhash"));
    CBlockIndex *pblockindex;

    {
        LOCK(cs_main);
        pblockindex = LookupBlockIndex(hash);
        if (!pblockindex) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY, "Block not found");
        }
    }

    BlockValidationState state;
    PreciousBlock(config, state, pblockindex);

    if (!state.IsValid()) {
        throw JSONRPCError(RPC_DATABASE_ERROR, state.GetRejectReason());
    }

    return NullUniValue;
}

UniValue finalizeblock(const Config &config, const JSONRPCRequest &request) {
    RPCHelpMan{
        "finalizeblock",
        "Treats a block as final. It cannot be reorged. Any chain\n"
        "that does not contain this block is invalid. Used on a less\n"
        "work chain, it can effectively PUT YOU OUT OF CONSENSUS.\n"
        "USE WITH CAUTION!\n",
        {
            {"blockhash", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "the hash of the block to mark as invalid"},
        },
        RPCResult{RPCResult::Type::NONE, "", ""},
        RPCExamples{HelpExampleCli("finalizeblock", "\"blockhash\"") +
                    HelpExampleRpc("finalizeblock", "\"blockhash\"")},
    }
        .Check(request);

    std::string strHash = request.params[0].get_str();
    BlockHash hash(uint256S(strHash));
    BlockValidationState state;

    CBlockIndex *pblockindex = nullptr;
    {
        LOCK(cs_main);
        pblockindex = LookupBlockIndex(hash);
        if (!pblockindex) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY, "Block not found");
        }
    } // end of locked cs_main scope

    ::ChainstateActive().FinalizeBlock(config, state, pblockindex);

    if (state.IsValid()) {
        ActivateBestChain(config, state);
    }

    if (!state.IsValid()) {
        throw JSONRPCError(RPC_DATABASE_ERROR, state.ToString());
    }

    return NullUniValue;
}

static UniValue invalidateblock(const Config &config,
                                const JSONRPCRequest &request) {
    RPCHelpMan{
        "invalidateblock",
        "Permanently marks a block as invalid, as if it violated a consensus "
        "rule.\n",
        {
            {"blockhash", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "the hash of the block to mark as invalid"},
        },
        RPCResult{RPCResult::Type::NONE, "", ""},
        RPCExamples{HelpExampleCli("invalidateblock", "\"blockhash\"") +
                    HelpExampleRpc("invalidateblock", "\"blockhash\"")},
    }
        .Check(request);

    const BlockHash hash(ParseHashV(request.params[0], "blockhash"));
    BlockValidationState state;

    CBlockIndex *pblockindex;
    {
        LOCK(cs_main);
        pblockindex = LookupBlockIndex(hash);
        if (!pblockindex) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY, "Block not found");
        }
    }
    ::ChainstateActive().InvalidateBlock(config, state, pblockindex);

    if (state.IsValid()) {
        ActivateBestChain(config, state);
    }

    if (!state.IsValid()) {
        throw JSONRPCError(RPC_DATABASE_ERROR, state.ToString());
    }

    return NullUniValue;
}

UniValue parkblock(const Config &config, const JSONRPCRequest &request) {
    RPCHelpMan{
        "parkblock",
        "Marks a block as parked.\n",
        {
            {"blockhash", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "the hash of the block to park"},
        },
        RPCResult{RPCResult::Type::NONE, "", ""},
        RPCExamples{HelpExampleCli("parkblock", "\"blockhash\"") +
                    HelpExampleRpc("parkblock", "\"blockhash\"")},
    }
        .Check(request);

    const std::string strHash = request.params[0].get_str();
    const BlockHash hash(uint256S(strHash));
    BlockValidationState state;

    CBlockIndex *pblockindex = nullptr;
    {
        LOCK(cs_main);
        pblockindex = LookupBlockIndex(hash);
        if (!pblockindex) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY, "Block not found");
        }
    }
    ::ChainstateActive().ParkBlock(config, state, pblockindex);

    if (state.IsValid()) {
        ActivateBestChain(config, state);
    }

    if (!state.IsValid()) {
        throw JSONRPCError(RPC_DATABASE_ERROR, state.GetRejectReason());
    }

    return NullUniValue;
}

static UniValue reconsiderblock(const Config &config,
                                const JSONRPCRequest &request) {
    RPCHelpMan{
        "reconsiderblock",
        "Removes invalidity status of a block, its ancestors and its"
        "descendants, reconsider them for activation.\n"
        "This can be used to undo the effects of invalidateblock.\n",
        {
            {"blockhash", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "the hash of the block to reconsider"},
        },
        RPCResult{RPCResult::Type::NONE, "", ""},
        RPCExamples{HelpExampleCli("reconsiderblock", "\"blockhash\"") +
                    HelpExampleRpc("reconsiderblock", "\"blockhash\"")},
    }
        .Check(request);

    const BlockHash hash(ParseHashV(request.params[0], "blockhash"));

    {
        LOCK(cs_main);
        CBlockIndex *pblockindex = LookupBlockIndex(hash);
        if (!pblockindex) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY, "Block not found");
        }

        ResetBlockFailureFlags(pblockindex);
    }

    BlockValidationState state;
    ActivateBestChain(config, state);

    if (!state.IsValid()) {
        throw JSONRPCError(RPC_DATABASE_ERROR, state.ToString());
    }

    return NullUniValue;
}

UniValue unparkblock(const Config &config, const JSONRPCRequest &request) {
    RPCHelpMan{
        "unparkblock",
        "Removes parked status of a block and its descendants, reconsider "
        "them for activation.\n"
        "This can be used to undo the effects of parkblock.\n",
        {
            {"blockhash", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "the hash of the block to unpark"},
        },
        RPCResult{RPCResult::Type::NONE, "", ""},
        RPCExamples{HelpExampleCli("unparkblock", "\"blockhash\"") +
                    HelpExampleRpc("unparkblock", "\"blockhash\"")},
    }
        .Check(request);

    const std::string strHash = request.params[0].get_str();
    const BlockHash hash(uint256S(strHash));

    {
        LOCK(cs_main);

        CBlockIndex *pblockindex = LookupBlockIndex(hash);
        if (!pblockindex) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY, "Block not found");
        }

        UnparkBlockAndChildren(pblockindex);
    }

    BlockValidationState state;
    ActivateBestChain(config, state);

    if (!state.IsValid()) {
        throw JSONRPCError(RPC_DATABASE_ERROR, state.GetRejectReason());
    }

    return NullUniValue;
}

static UniValue getchaintxstats(const Config &config,
                                const JSONRPCRequest &request) {
    RPCHelpMan{
        "getchaintxstats",
        "Compute statistics about the total number and rate of transactions "
        "in the chain.\n",
        {
            {"nblocks", RPCArg::Type::NUM, /* default */ "one month",
             "Size of the window in number of blocks"},
            {"blockhash", RPCArg::Type::STR_HEX, /* default */ "chain tip",
             "The hash of the block that ends the window."},
        },
        RPCResult{RPCResult::Type::OBJ,
                  "",
                  "",
                  {
                      {RPCResult::Type::NUM_TIME, "time",
                       "The timestamp for the final block in the window, "
                       "expressed in " +
                           UNIX_EPOCH_TIME},
                      {RPCResult::Type::NUM, "txcount",
                       "The total number of transactions in the chain up to "
                       "that point"},
                      {RPCResult::Type::STR_HEX, "window_final_block_hash",
                       "The hash of the final block in the window"},
                      {RPCResult::Type::NUM, "window_final_block_height",
                       "The height of the final block in the window."},
                      {RPCResult::Type::NUM, "window_block_count",
                       "Size of the window in number of blocks"},
                      {RPCResult::Type::NUM, "window_tx_count",
                       "The number of transactions in the window. Only "
                       "returned if \"window_block_count\" is > 0"},
                      {RPCResult::Type::NUM, "window_interval",
                       "The elapsed time in the window in seconds. Only "
                       "returned if \"window_block_count\" is > 0"},
                      {RPCResult::Type::NUM, "txrate",
                       "The average rate of transactions per second in the "
                       "window. Only returned if \"window_interval\" is > 0"},
                  }},
        RPCExamples{HelpExampleCli("getchaintxstats", "") +
                    HelpExampleRpc("getchaintxstats", "2016")},
    }
        .Check(request);

    const CBlockIndex *pindex;

    // By default: 1 month
    int blockcount = 30 * 24 * 60 * 60 /
                     config.GetChainParams().GetConsensus().nPowTargetSpacing;

    if (request.params[1].isNull()) {
        LOCK(cs_main);
        pindex = ::ChainActive().Tip();
    } else {
        BlockHash hash(ParseHashV(request.params[1], "blockhash"));
        LOCK(cs_main);
        pindex = LookupBlockIndex(hash);
        if (!pindex) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY, "Block not found");
        }
        if (!::ChainActive().Contains(pindex)) {
            throw JSONRPCError(RPC_INVALID_PARAMETER,
                               "Block is not in main chain");
        }
    }

    CHECK_NONFATAL(pindex != nullptr);

    if (request.params[0].isNull()) {
        blockcount = std::max(0, std::min(blockcount, pindex->nHeight - 1));
    } else {
        blockcount = request.params[0].get_int();

        if (blockcount < 0 ||
            (blockcount > 0 && blockcount >= pindex->nHeight)) {
            throw JSONRPCError(RPC_INVALID_PARAMETER, "Invalid block count: "
                                                      "should be between 0 and "
                                                      "the block's height - 1");
        }
    }

    const CBlockIndex *pindexPast =
        pindex->GetAncestor(pindex->nHeight - blockcount);
    int nTimeDiff =
        pindex->GetMedianTimePast() - pindexPast->GetMedianTimePast();
    int nTxDiff = pindex->GetChainTxCount() - pindexPast->GetChainTxCount();

    UniValue ret(UniValue::VOBJ);
    ret.pushKV("time", pindex->GetBlockTime());
    ret.pushKV("txcount", pindex->GetChainTxCount());
    ret.pushKV("window_final_block_hash", pindex->GetBlockHash().GetHex());
    ret.pushKV("window_final_block_height", pindex->nHeight);
    ret.pushKV("window_block_count", blockcount);
    if (blockcount > 0) {
        ret.pushKV("window_tx_count", nTxDiff);
        ret.pushKV("window_interval", nTimeDiff);
        if (nTimeDiff > 0) {
            ret.pushKV("txrate", double(nTxDiff) / nTimeDiff);
        }
    }

    return ret;
}

template <typename T>
static T CalculateTruncatedMedian(std::vector<T> &scores) {
    size_t size = scores.size();
    if (size == 0) {
        return T();
    }

    std::sort(scores.begin(), scores.end());
    if (size % 2 == 0) {
        return (scores[size / 2 - 1] + scores[size / 2]) / 2;
    } else {
        return scores[size / 2];
    }
}

template <typename T> static inline bool SetHasKeys(const std::set<T> &set) {
    return false;
}
template <typename T, typename Tk, typename... Args>
static inline bool SetHasKeys(const std::set<T> &set, const Tk &key,
                              const Args &... args) {
    return (set.count(key) != 0) || SetHasKeys(set, args...);
}

// outpoint (needed for the utxo index) + nHeight + fCoinBase
static constexpr size_t PER_UTXO_OVERHEAD =
    sizeof(COutPoint) + sizeof(uint32_t) + sizeof(bool);

static UniValue getblockstats(const Config &config,
                              const JSONRPCRequest &request) {
    const auto &ticker = Currency::get().ticker;
    RPCHelpMan{
        "getblockstats",
        "Compute per block statistics for a given window. All amounts are "
        "in " +
            ticker +
            ".\n"
            "It won't work for some heights with pruning.\n",
        {
            {"hash_or_height",
             RPCArg::Type::NUM,
             RPCArg::Optional::NO,
             "The block hash or height of the target block",
             "",
             {"", "string or numeric"}},
            {"stats",
             RPCArg::Type::ARR,
             /* default */ "all values",
             "Values to plot (see result below)",
             {
                 {"height", RPCArg::Type::STR, RPCArg::Optional::OMITTED,
                  "Selected statistic"},
                 {"time", RPCArg::Type::STR, RPCArg::Optional::OMITTED,
                  "Selected statistic"},
             },
             "stats"},
        },
        RPCResult{
            RPCResult::Type::OBJ,
            "",
            "",
            {
                {RPCResult::Type::NUM, "avgfee", "Average fee in the block"},
                {RPCResult::Type::NUM, "avgfeerate",
                 "Average feerate (in satoshis per virtual byte)"},
                {RPCResult::Type::NUM, "avgtxsize", "Average transaction size"},
                {RPCResult::Type::STR_HEX, "blockhash",
                 "The block hash (to check for potential reorgs)"},
                {RPCResult::Type::NUM, "height", "The height of the block"},
                {RPCResult::Type::NUM, "ins",
                 "The number of inputs (excluding coinbase)"},
                {RPCResult::Type::NUM, "maxfee", "Maximum fee in the block"},
                {RPCResult::Type::NUM, "maxfeerate",
                 "Maximum feerate (in satoshis per virtual byte)"},
                {RPCResult::Type::NUM, "maxtxsize", "Maximum transaction size"},
                {RPCResult::Type::NUM, "medianfee",
                 "Truncated median fee in the block"},
                {RPCResult::Type::NUM, "medianfeerate",
                 "Truncated median feerate (in " + ticker + " per byte)"},
                {RPCResult::Type::NUM, "mediantime",
                 "The block median time past"},
                {RPCResult::Type::NUM, "mediantxsize",
                 "Truncated median transaction size"},
                {RPCResult::Type::NUM, "minfee", "Minimum fee in the block"},
                {RPCResult::Type::NUM, "minfeerate",
                 "Minimum feerate (in satoshis per virtual byte)"},
                {RPCResult::Type::NUM, "mintxsize", "Minimum transaction size"},
                {RPCResult::Type::NUM, "outs", "The number of outputs"},
                {RPCResult::Type::NUM, "subsidy", "The block subsidy"},
                {RPCResult::Type::NUM, "time", "The block time"},
                {RPCResult::Type::NUM, "total_out",
                 "Total amount in all outputs (excluding coinbase and thus "
                 "reward [ie subsidy + totalfee])"},
                {RPCResult::Type::NUM, "total_size",
                 "Total size of all non-coinbase transactions"},
                {RPCResult::Type::NUM, "totalfee", "The fee total"},
                {RPCResult::Type::NUM, "txs",
                 "The number of transactions (including coinbase)"},
                {RPCResult::Type::NUM, "utxo_increase",
                 "The increase/decrease in the number of unspent outputs"},
                {RPCResult::Type::NUM, "utxo_size_inc",
                 "The increase/decrease in size for the utxo index (not "
                 "discounting op_return and similar)"},
            }},
        RPCExamples{
            HelpExampleCli(
                "getblockstats",
                R"('"00000000c937983704a73af28acdec37b049d214adbda81d7e2a3dd146f6ed09"' '["minfeerate","avgfeerate"]')") +
            HelpExampleCli("getblockstats",
                           R"(1000 '["minfeerate","avgfeerate"]')") +
            HelpExampleRpc(
                "getblockstats",
                R"("00000000c937983704a73af28acdec37b049d214adbda81d7e2a3dd146f6ed09", ["minfeerate","avgfeerate"])") +
            HelpExampleRpc("getblockstats",
                           R"(1000, ["minfeerate","avgfeerate"])")},
    }
        .Check(request);

    LOCK(cs_main);

    CBlockIndex *pindex;
    if (request.params[0].isNum()) {
        const int height = request.params[0].get_int();
        const int current_tip = ::ChainActive().Height();
        if (height < 0) {
            throw JSONRPCError(
                RPC_INVALID_PARAMETER,
                strprintf("Target block height %d is negative", height));
        }
        if (height > current_tip) {
            throw JSONRPCError(
                RPC_INVALID_PARAMETER,
                strprintf("Target block height %d after current tip %d", height,
                          current_tip));
        }

        pindex = ::ChainActive()[height];
    } else {
        const BlockHash hash(ParseHashV(request.params[0], "hash_or_height"));
        pindex = LookupBlockIndex(hash);
        if (!pindex) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY, "Block not found");
        }
        if (!::ChainActive().Contains(pindex)) {
            throw JSONRPCError(RPC_INVALID_PARAMETER,
                               strprintf("Block is not in chain %s",
                                         Params().NetworkIDString()));
        }
    }

    CHECK_NONFATAL(pindex != nullptr);

    std::set<std::string> stats;
    if (!request.params[1].isNull()) {
        const UniValue stats_univalue = request.params[1].get_array();
        for (unsigned int i = 0; i < stats_univalue.size(); i++) {
            const std::string stat = stats_univalue[i].get_str();
            stats.insert(stat);
        }
    }

    const CBlock block = GetBlockChecked(config, pindex);
    const CBlockUndo blockUndo = GetUndoChecked(pindex);

    // Calculate everything if nothing selected (default)
    const bool do_all = stats.size() == 0;
    const bool do_mediantxsize = do_all || stats.count("mediantxsize") != 0;
    const bool do_medianfee = do_all || stats.count("medianfee") != 0;
    const bool do_medianfeerate = do_all || stats.count("medianfeerate") != 0;
    const bool loop_inputs =
        do_all || do_medianfee || do_medianfeerate ||
        SetHasKeys(stats, "utxo_size_inc", "totalfee", "avgfee", "avgfeerate",
                   "minfee", "maxfee", "minfeerate", "maxfeerate");
    const bool loop_outputs = do_all || loop_inputs || stats.count("total_out");
    const bool do_calculate_size =
        do_mediantxsize || loop_inputs ||
        SetHasKeys(stats, "total_size", "avgtxsize", "mintxsize", "maxtxsize");

    const int64_t blockMaxSize = config.GetMaxBlockSize();
    Amount maxfee = Amount::zero();
    Amount maxfeerate = Amount::zero();
    Amount minfee = MAX_MONEY;
    Amount minfeerate = MAX_MONEY;
    Amount total_out = Amount::zero();
    Amount totalfee = Amount::zero();
    int64_t inputs = 0;
    int64_t maxtxsize = 0;
    int64_t mintxsize = blockMaxSize;
    int64_t outputs = 0;
    int64_t total_size = 0;
    int64_t utxo_size_inc = 0;
    std::vector<Amount> fee_array;
    std::vector<Amount> feerate_array;
    std::vector<int64_t> txsize_array;

    for (size_t i = 0; i < block.vtx.size(); ++i) {
        const auto &tx = block.vtx.at(i);
        outputs += tx->vout.size();
        Amount tx_total_out = Amount::zero();
        if (loop_outputs) {
            for (const CTxOut &out : tx->vout) {
                tx_total_out += out.nValue;
                utxo_size_inc +=
                    GetSerializeSize(out, PROTOCOL_VERSION) + PER_UTXO_OVERHEAD;
            }
        }

        if (tx->IsCoinBase()) {
            continue;
        }

        // Don't count coinbase's fake input
        inputs += tx->vin.size();
        // Don't count coinbase reward
        total_out += tx_total_out;

        int64_t tx_size = 0;
        if (do_calculate_size) {
            tx_size = tx->GetTotalSize();
            if (do_mediantxsize) {
                txsize_array.push_back(tx_size);
            }
            maxtxsize = std::max(maxtxsize, tx_size);
            mintxsize = std::min(mintxsize, tx_size);
            total_size += tx_size;
        }

        if (loop_inputs) {
            Amount tx_total_in = Amount::zero();
            const auto &txundo = blockUndo.vtxundo.at(i - 1);
            for (const Coin &coin : txundo.vprevout) {
                const CTxOut &prevoutput = coin.GetTxOut();

                tx_total_in += prevoutput.nValue;
                utxo_size_inc -=
                    GetSerializeSize(prevoutput, PROTOCOL_VERSION) +
                    PER_UTXO_OVERHEAD;
            }

            Amount txfee = tx_total_in - tx_total_out;
            CHECK_NONFATAL(MoneyRange(txfee));
            if (do_medianfee) {
                fee_array.push_back(txfee);
            }
            maxfee = std::max(maxfee, txfee);
            minfee = std::min(minfee, txfee);
            totalfee += txfee;

            Amount feerate = txfee / tx_size;
            if (do_medianfeerate) {
                feerate_array.push_back(feerate);
            }
            maxfeerate = std::max(maxfeerate, feerate);
            minfeerate = std::min(minfeerate, feerate);
        }
    }

    UniValue ret_all(UniValue::VOBJ);
    ret_all.pushKV("avgfee", block.vtx.size() > 1
                                 ? (totalfee / int((block.vtx.size() - 1)))
                                 : Amount::zero());
    ret_all.pushKV("avgfeerate",
                   total_size > 0 ? (totalfee / total_size) : Amount::zero());
    ret_all.pushKV("avgtxsize", (block.vtx.size() > 1)
                                    ? total_size / (block.vtx.size() - 1)
                                    : 0);
    ret_all.pushKV("blockhash", pindex->GetBlockHash().GetHex());
    ret_all.pushKV("height", (int64_t)pindex->nHeight);
    ret_all.pushKV("ins", inputs);
    ret_all.pushKV("maxfee", maxfee);
    ret_all.pushKV("maxfeerate", maxfeerate);
    ret_all.pushKV("maxtxsize", maxtxsize);
    ret_all.pushKV("medianfee", CalculateTruncatedMedian(fee_array));
    ret_all.pushKV("medianfeerate", CalculateTruncatedMedian(feerate_array));
    ret_all.pushKV("mediantime", pindex->GetMedianTimePast());
    ret_all.pushKV("mediantxsize", CalculateTruncatedMedian(txsize_array));
    ret_all.pushKV("minfee", minfee == MAX_MONEY ? Amount::zero() : minfee);
    ret_all.pushKV("minfeerate",
                   minfeerate == MAX_MONEY ? Amount::zero() : minfeerate);
    ret_all.pushKV("mintxsize", mintxsize == blockMaxSize ? 0 : mintxsize);
    ret_all.pushKV("outs", outputs);
    ret_all.pushKV("subsidy",
                   GetBlockSubsidy(pindex->nHeight, Params().GetConsensus()));
    ret_all.pushKV("time", pindex->GetBlockTime());
    ret_all.pushKV("total_out", total_out);
    ret_all.pushKV("total_size", total_size);
    ret_all.pushKV("totalfee", totalfee);
    ret_all.pushKV("txs", (int64_t)block.vtx.size());
    ret_all.pushKV("utxo_increase", outputs - inputs);
    ret_all.pushKV("utxo_size_inc", utxo_size_inc);

    if (do_all) {
        return ret_all;
    }

    UniValue ret(UniValue::VOBJ);
    for (const std::string &stat : stats) {
        const UniValue &value = ret_all[stat];
        if (value.isNull()) {
            throw JSONRPCError(
                RPC_INVALID_PARAMETER,
                strprintf("Invalid selected statistic %s", stat));
        }
        ret.pushKV(stat, value);
    }
    return ret;
}

static UniValue savemempool(const Config &config,
                            const JSONRPCRequest &request) {
    RPCHelpMan{
        "savemempool",
        "Dumps the mempool to disk. It will fail until the previous dump is "
        "fully loaded.\n",
        {},
        RPCResult{RPCResult::Type::NONE, "", ""},
        RPCExamples{HelpExampleCli("savemempool", "") +
                    HelpExampleRpc("savemempool", "")},
    }
        .Check(request);

    const CTxMemPool &mempool = EnsureMemPool(request.context);

    if (!mempool.IsLoaded()) {
        throw JSONRPCError(RPC_MISC_ERROR, "The mempool was not loaded yet");
    }

    if (!DumpMempool(mempool)) {
        throw JSONRPCError(RPC_MISC_ERROR, "Unable to dump mempool to disk");
    }

    return NullUniValue;
}

namespace {
//! Search for a given set of pubkey scripts
static bool FindScriptPubKey(std::atomic<int> &scan_progress,
                             const std::atomic<bool> &should_abort,
                             int64_t &count, CCoinsViewCursor *cursor,
                             const std::set<CScript> &needles,
                             std::map<COutPoint, Coin> &out_results,
                             std::function<void()> &interruption_point) {
    scan_progress = 0;
    count = 0;
    while (cursor->Valid()) {
        COutPoint key;
        Coin coin;
        if (!cursor->GetKey(key) || !cursor->GetValue(coin)) {
            return false;
        }
        if (++count % 8192 == 0) {
            interruption_point();
            if (should_abort) {
                // allow to abort the scan via the abort reference
                return false;
            }
        }
        if (count % 256 == 0) {
            // update progress reference every 256 item
            const TxId &txid = key.GetTxId();
            uint32_t high = 0x100 * *txid.begin() + *(txid.begin() + 1);
            scan_progress = int(high * 100.0 / 65536.0 + 0.5);
        }
        if (needles.count(coin.GetTxOut().scriptPubKey)) {
            out_results.emplace(key, coin);
        }
        cursor->Next();
    }
    scan_progress = 100;
    return true;
}
} // namespace

/** RAII object to prevent concurrency issue when scanning the txout set */
static std::atomic<int> g_scan_progress;
static std::atomic<bool> g_scan_in_progress;
static std::atomic<bool> g_should_abort_scan;
class CoinsViewScanReserver {
private:
    bool m_could_reserve;

public:
    explicit CoinsViewScanReserver() : m_could_reserve(false) {}

    bool reserve() {
        CHECK_NONFATAL(!m_could_reserve);
        if (g_scan_in_progress.exchange(true)) {
            return false;
        }
        m_could_reserve = true;
        return true;
    }

    ~CoinsViewScanReserver() {
        if (m_could_reserve) {
            g_scan_in_progress = false;
        }
    }
};

static UniValue scantxoutset(const Config &config,
                             const JSONRPCRequest &request) {
    const auto &ticker = Currency::get().ticker;
    RPCHelpMan{
        "scantxoutset",
        "EXPERIMENTAL warning: this call may be removed or changed in future "
        "releases.\n"
        "\nScans the unspent transaction output set for entries that match "
        "certain output descriptors.\n"
        "Examples of output descriptors are:\n"
        "    addr(<address>)                      Outputs whose scriptPubKey "
        "corresponds to the specified address (does not include P2PK)\n"
        "    raw(<hex script>)                    Outputs whose scriptPubKey "
        "equals the specified hex scripts\n"
        "    combo(<pubkey>)                      P2PK and P2PKH outputs for "
        "the given pubkey\n"
        "    pkh(<pubkey>)                        P2PKH outputs for the given "
        "pubkey\n"
        "    sh(multi(<n>,<pubkey>,<pubkey>,...)) P2SH-multisig outputs for "
        "the given threshold and pubkeys\n"
        "\nIn the above, <pubkey> either refers to a fixed public key in "
        "hexadecimal notation, or to an xpub/xprv optionally followed by one\n"
        "or more path elements separated by \"/\", and optionally ending in "
        "\"/*\" (unhardened), or \"/*'\" or \"/*h\" (hardened) to specify all\n"
        "unhardened or hardened child keys.\n"
        "In the latter case, a range needs to be specified by below if "
        "different from 1000.\n"
        "For more information on output descriptors, see the documentation in "
        "the doc/descriptors.md file.\n",
        {
            {"action", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The action to execute\n"
             "                                      \"start\" for starting a "
             "scan\n"
             "                                      \"abort\" for aborting the "
             "current scan (returns true when abort was successful)\n"
             "                                      \"status\" for "
             "progress report (in %) of the current scan"},
            {"scanobjects",
             RPCArg::Type::ARR,
             RPCArg::Optional::OMITTED,
             "Array of scan objects. Required for \"start\" action\n"
             "                                  Every scan object is either a "
             "string descriptor or an object:",
             {
                 {"descriptor", RPCArg::Type::STR, RPCArg::Optional::OMITTED,
                  "An output descriptor"},
                 {
                     "",
                     RPCArg::Type::OBJ,
                     RPCArg::Optional::OMITTED,
                     "An object with output descriptor and metadata",
                     {
                         {"desc", RPCArg::Type::STR, RPCArg::Optional::NO,
                          "An output descriptor"},
                         {"range", RPCArg::Type::RANGE, /* default */ "1000",
                          "The range of HD chain indexes to explore (either "
                          "end or [begin,end])"},
                     },
                 },
             },
             "[scanobjects,...]"},
        },
        RPCResult{
            RPCResult::Type::OBJ,
            "",
            "",
            {
                {RPCResult::Type::BOOL, "success",
                 "Whether the scan was completed"},
                {RPCResult::Type::NUM, "txouts",
                 "The number of unspent transaction outputs scanned"},
                {RPCResult::Type::NUM, "height",
                 "The current block height (index)"},
                {RPCResult::Type::STR_HEX, "bestblock",
                 "The hash of the block at the tip of the chain"},
                {RPCResult::Type::ARR,
                 "unspents",
                 "",
                 {
                     {RPCResult::Type::OBJ,
                      "",
                      "",
                      {
                          {RPCResult::Type::STR_HEX, "txid",
                           "The transaction id"},
                          {RPCResult::Type::NUM, "vout", "The vout value"},
                          {RPCResult::Type::STR_HEX, "scriptPubKey",
                           "The script key"},
                          {RPCResult::Type::STR, "desc",
                           "A specialized descriptor for the matched "
                           "scriptPubKey"},
                          {RPCResult::Type::STR_AMOUNT, "amount",
                           "The total amount in " + ticker +
                               " of the unspent output"},
                          {RPCResult::Type::NUM, "height",
                           "Height of the unspent transaction output"},
                      }},
                 }},
                {RPCResult::Type::STR_AMOUNT, "total_amount",
                 "The total amount of all found unspent outputs in " + ticker},
            }},
        RPCExamples{""},
    }
        .Check(request);

    RPCTypeCheck(request.params, {UniValue::VSTR, UniValue::VARR});

    UniValue result(UniValue::VOBJ);
    if (request.params[0].get_str() == "status") {
        CoinsViewScanReserver reserver;
        if (reserver.reserve()) {
            // no scan in progress
            return NullUniValue;
        }
        result.pushKV("progress", g_scan_progress.load());
        return result;
    } else if (request.params[0].get_str() == "abort") {
        CoinsViewScanReserver reserver;
        if (reserver.reserve()) {
            // reserve was possible which means no scan was running
            return false;
        }
        // set the abort flag
        g_should_abort_scan = true;
        return true;
    } else if (request.params[0].get_str() == "start") {
        CoinsViewScanReserver reserver;
        if (!reserver.reserve()) {
            throw JSONRPCError(
                RPC_INVALID_PARAMETER,
                "Scan already in progress, use action \"abort\" or \"status\"");
        }

        if (request.params.size() < 2) {
            throw JSONRPCError(
                RPC_MISC_ERROR,
                "scanobjects argument is required for the start action");
        }

        std::set<CScript> needles;
        std::map<CScript, std::string> descriptors;
        Amount total_in = Amount::zero();

        // loop through the scan objects
        for (const UniValue &scanobject :
             request.params[1].get_array().getValues()) {
            FlatSigningProvider provider;
            auto scripts = EvalDescriptorStringOrObject(scanobject, provider);
            for (const auto &script : scripts) {
                std::string inferred =
                    InferDescriptor(script, provider)->ToString();
                needles.emplace(script);
                descriptors.emplace(std::move(script), std::move(inferred));
            }
        }

        // Scan the unspent transaction output set for inputs
        UniValue unspents(UniValue::VARR);
        std::vector<CTxOut> input_txos;
        std::map<COutPoint, Coin> coins;
        g_should_abort_scan = false;
        g_scan_progress = 0;
        int64_t count = 0;
        std::unique_ptr<CCoinsViewCursor> pcursor;
        CBlockIndex *tip;
        {
            LOCK(cs_main);
            ::ChainstateActive().ForceFlushStateToDisk();
            pcursor = std::unique_ptr<CCoinsViewCursor>(
                ::ChainstateActive().CoinsDB().Cursor());
            CHECK_NONFATAL(pcursor);
            tip = ::ChainActive().Tip();
            CHECK_NONFATAL(tip);
        }
        NodeContext &node = EnsureNodeContext(request.context);
        bool res = FindScriptPubKey(g_scan_progress, g_should_abort_scan, count,
                                    pcursor.get(), needles, coins,
                                    node.rpc_interruption_point);
        result.pushKV("success", res);
        result.pushKV("txouts", count);
        result.pushKV("height", tip->nHeight);
        result.pushKV("bestblock", tip->GetBlockHash().GetHex());

        for (const auto &it : coins) {
            const COutPoint &outpoint = it.first;
            const Coin &coin = it.second;
            const CTxOut &txo = coin.GetTxOut();
            input_txos.push_back(txo);
            total_in += txo.nValue;

            UniValue unspent(UniValue::VOBJ);
            unspent.pushKV("txid", outpoint.GetTxId().GetHex());
            unspent.pushKV("vout", int32_t(outpoint.GetN()));
            unspent.pushKV("scriptPubKey", HexStr(txo.scriptPubKey));
            unspent.pushKV("desc", descriptors[txo.scriptPubKey]);
            unspent.pushKV("amount", txo.nValue);
            unspent.pushKV("height", int32_t(coin.GetHeight()));

            unspents.push_back(unspent);
        }
        result.pushKV("unspents", unspents);
        result.pushKV("total_amount", total_in);
    } else {
        throw JSONRPCError(RPC_INVALID_PARAMETER, "Invalid command");
    }
    return result;
}

static UniValue getblockfilter(const Config &config,
                               const JSONRPCRequest &request) {
    RPCHelpMan{
        "getblockfilter",
        "Retrieve a BIP 157 content filter for a particular block.\n",
        {
            {"blockhash", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The hash of the block"},
            {"filtertype", RPCArg::Type::STR, /*default*/ "basic",
             "The type name of the filter"},
        },
        RPCResult{RPCResult::Type::OBJ,
                  "",
                  "",
                  {
                      {RPCResult::Type::STR_HEX, "filter",
                       "the hex-encoded filter data"},
                      {RPCResult::Type::STR_HEX, "header",
                       "the hex-encoded filter header"},
                  }},
        RPCExamples{
            HelpExampleCli("getblockfilter",
                           "\"00000000c937983704a73af28acdec37b049d214a"
                           "dbda81d7e2a3dd146f6ed09\" \"basic\"") +
            HelpExampleRpc("getblockfilter",
                           "\"00000000c937983704a73af28acdec37b049d214adbda81d7"
                           "e2a3dd146f6ed09\", \"basic\"")}}
        .Check(request);

    const BlockHash block_hash(ParseHashV(request.params[0], "blockhash"));
    std::string filtertype_name = "basic";
    if (!request.params[1].isNull()) {
        filtertype_name = request.params[1].get_str();
    }

    BlockFilterType filtertype;
    if (!BlockFilterTypeByName(filtertype_name, filtertype)) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY, "Unknown filtertype");
    }

    BlockFilterIndex *index = GetBlockFilterIndex(filtertype);
    if (!index) {
        throw JSONRPCError(RPC_MISC_ERROR,
                           "Index is not enabled for filtertype " +
                               filtertype_name);
    }

    const CBlockIndex *block_index;
    bool block_was_connected;
    {
        LOCK(cs_main);
        block_index = LookupBlockIndex(block_hash);
        if (!block_index) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY, "Block not found");
        }
        block_was_connected = block_index->IsValid(BlockValidity::SCRIPTS);
    }

    bool index_ready = index->BlockUntilSyncedToCurrentChain();

    BlockFilter filter;
    uint256 filter_header;
    if (!index->LookupFilter(block_index, filter) ||
        !index->LookupFilterHeader(block_index, filter_header)) {
        int err_code;
        std::string errmsg = "Filter not found.";

        if (!block_was_connected) {
            err_code = RPC_INVALID_ADDRESS_OR_KEY;
            errmsg += " Block was not connected to active chain.";
        } else if (!index_ready) {
            err_code = RPC_MISC_ERROR;
            errmsg +=
                " Block filters are still in the process of being indexed.";
        } else {
            err_code = RPC_INTERNAL_ERROR;
            errmsg +=
                " This error is unexpected and indicates index corruption.";
        }

        throw JSONRPCError(err_code, errmsg);
    }

    UniValue ret(UniValue::VOBJ);
    ret.pushKV("filter", HexStr(filter.GetEncodedFilter()));
    ret.pushKV("header", filter_header.GetHex());
    return ret;
}

/**
 * Serialize the UTXO set to a file for loading elsewhere.
 *
 * @see SnapshotMetadata
 */
static UniValue dumptxoutset(const Config &config,
                             const JSONRPCRequest &request) {
    RPCHelpMan{
        "dumptxoutset",
        "Write the serialized UTXO set to disk.\n",
        {
            {"path", RPCArg::Type::STR, RPCArg::Optional::NO,
             "path to the output file. If relative, will be prefixed by "
             "datadir."},
        },
        RPCResult{RPCResult::Type::OBJ,
                  "",
                  "",
                  {
                      {RPCResult::Type::NUM, "coins_written",
                       "the number of coins written in the snapshot"},
                      {RPCResult::Type::STR_HEX, "base_hash",
                       "the hash of the base of the snapshot"},
                      {RPCResult::Type::NUM, "base_height",
                       "the height of the base of the snapshot"},
                      {RPCResult::Type::STR, "path",
                       "the absolute path that the snapshot was written to"},
                  }},
        RPCExamples{HelpExampleCli("dumptxoutset", "utxo.dat")}}
        .Check(request);

    fs::path path = fs::absolute(request.params[0].get_str(), GetDataDir());
    // Write to a temporary path and then move into `path` on completion
    // to avoid confusion due to an interruption.
    fs::path temppath =
        fs::absolute(request.params[0].get_str() + ".incomplete", GetDataDir());

    if (fs::exists(path)) {
        throw JSONRPCError(
            RPC_INVALID_PARAMETER,
            path.string() +
                " already exists. If you are sure this is what you want, "
                "move it out of the way first");
    }

    FILE *file{fsbridge::fopen(temppath, "wb")};
    CAutoFile afile{file, SER_DISK, CLIENT_VERSION};
    std::unique_ptr<CCoinsViewCursor> pcursor;
    CCoinsStats stats;
    CBlockIndex *tip;
    NodeContext &node = EnsureNodeContext(request.context);

    {
        // We need to lock cs_main to ensure that the coinsdb isn't written to
        // between (i) flushing coins cache to disk (coinsdb), (ii) getting
        // stats based upon the coinsdb, and (iii) constructing a cursor to the
        // coinsdb for use below this block.
        //
        // Cursors returned by leveldb iterate over snapshots, so the contents
        // of the pcursor will not be affected by simultaneous writes during
        // use below this block.
        //
        // See discussion here:
        //   https://github.com/bitcoin/bitcoin/pull/15606#discussion_r274479369
        //
        LOCK(::cs_main);

        ::ChainstateActive().ForceFlushStateToDisk();

        if (!GetUTXOStats(&::ChainstateActive().CoinsDB(), stats,
                          CoinStatsHashType::NONE,
                          node.rpc_interruption_point)) {
            throw JSONRPCError(RPC_INTERNAL_ERROR, "Unable to read UTXO set");
        }

        pcursor = std::unique_ptr<CCoinsViewCursor>(
            ::ChainstateActive().CoinsDB().Cursor());
        tip = LookupBlockIndex(stats.hashBlock);
        CHECK_NONFATAL(tip);
    }

    SnapshotMetadata metadata{tip->GetBlockHash(), stats.coins_count,
                              uint64_t(tip->GetChainTxCount())};

    afile << metadata;

    COutPoint key;
    Coin coin;
    unsigned int iter{0};

    while (pcursor->Valid()) {
        if (iter % 5000 == 0) {
            node.rpc_interruption_point();
        }
        ++iter;
        if (pcursor->GetKey(key) && pcursor->GetValue(coin)) {
            afile << key;
            afile << coin;
        }

        pcursor->Next();
    }

    afile.fclose();
    fs::rename(temppath, path);

    UniValue result(UniValue::VOBJ);
    result.pushKV("coins_written", stats.coins_count);
    result.pushKV("base_hash", tip->GetBlockHash().ToString());
    result.pushKV("base_height", tip->nHeight);
    result.pushKV("path", path.string());
    return result;
}

void RegisterBlockchainRPCCommands(CRPCTable &t) {
    // clang-format off
    static const CRPCCommand commands[] = {
        //  category            name                      actor (function)        argNames
        //  ------------------- ------------------------  ----------------------  ----------
        { "blockchain",         "getbestblockhash",       getbestblockhash,       {} },
        { "blockchain",         "getblock",               getblock,               {"blockhash","verbosity|verbose"} },
        { "blockchain",         "getblockchaininfo",      getblockchaininfo,      {} },
        { "blockchain",         "getblockcount",          getblockcount,          {} },
        { "blockchain",         "getblockhash",           getblockhash,           {"height"} },
        { "blockchain",         "getblockheader",         getblockheader,         {"blockhash","verbose"} },
        { "blockchain",         "getblockstats",          getblockstats,          {"hash_or_height","stats"} },
        { "blockchain",         "getchaintips",           getchaintips,           {} },
        { "blockchain",         "getchaintxstats",        getchaintxstats,        {"nblocks", "blockhash"} },
        { "blockchain",         "getdifficulty",            getdifficulty,            {} },
        { "blockchain",         "getmempoolancestors",    getmempoolancestors,    {"txid","verbose"} },
        { "blockchain",         "getmempooldescendants",  getmempooldescendants,  {"txid","verbose"} },
        { "blockchain",         "getmempoolentry",        getmempoolentry,        {"txid"} },
        { "blockchain",         "getmempoolinfo",         getmempoolinfo,         {} },
        { "blockchain",         "getrawmempool",          getrawmempool,          {"verbose"} },
        { "blockchain",         "gettxout",               gettxout,               {"txid","n","include_mempool"} },
        { "blockchain",         "gettxoutsetinfo",        gettxoutsetinfo,        {"hash_type"} },
        { "blockchain",         "pruneblockchain",        pruneblockchain,        {"height"} },
        { "blockchain",         "savemempool",            savemempool,            {} },
        { "blockchain",         "verifychain",            verifychain,            {"checklevel","nblocks"} },
        { "blockchain",         "preciousblock",          preciousblock,          {"blockhash"} },
        { "blockchain",         "scantxoutset",           scantxoutset,           {"action", "scanobjects"} },
        { "blockchain",         "getblockfilter",          getblockfilter,          {"blockhash", "filtertype"} },

        /* Not shown in help */
        { "hidden",             "getfinalizedblockhash",             getfinalizedblockhash,             {} },
        { "hidden",             "finalizeblock",                     finalizeblock,                     {"blockhash"} },
        { "hidden",             "invalidateblock",                  invalidateblock,                  {"blockhash"} },
        { "hidden",             "parkblock",                        parkblock,                        {"blockhash"} },
        { "hidden",             "reconsiderblock",                  reconsiderblock,                  {"blockhash"} },
        { "hidden",             "syncwithvalidationinterfacequeue", syncwithvalidationinterfacequeue, {} },
        { "hidden",             "dumptxoutset",                     dumptxoutset,                     {"path"} },
        { "hidden",             "unparkblock",                      unparkblock,                      {"blockhash"} },
        { "hidden",             "waitfornewblock",                  waitfornewblock,                  {"timeout"} },
        { "hidden",             "waitforblock",                     waitforblock,                     {"blockhash","timeout"} },
        { "hidden",             "waitforblockheight",               waitforblockheight,               {"height","timeout"} },
    };
    // clang-format on
    for (const auto &c : commands) {
        t.appendCommand(c.name, &c);
    }
}
