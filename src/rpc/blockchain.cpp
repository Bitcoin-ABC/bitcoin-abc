// Copyright (c) 2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "rpc/blockchain.h"

#include "amount.h"
#include "chain.h"
#include "chainparams.h"
#include "checkpoints.h"
#include "coins.h"
#include "config.h"
#include "consensus/validation.h"
#include "core_io.h"
#include "hash.h"
#include "policy/policy.h"
#include "primitives/transaction.h"
#include "rpc/server.h"
#include "streams.h"
#include "sync.h"
#include "txdb.h"
#include "txmempool.h"
#include "util.h"
#include "utilstrencodings.h"
#include "validation.h"
#include "warnings.h"

#include <boost/thread/thread.hpp> // boost::thread::interrupt

#include <condition_variable>
#include <cstdint>
#include <mutex>

struct CUpdatedBlock {
    uint256 hash;
    int height;
};

static CWaitableCriticalSection cs_blockchange;
static std::condition_variable cond_blockchange;
static CUpdatedBlock latestblock;

static double GetDifficultyFromBits(uint32_t nBits) {
    int nShift = (nBits >> 24) & 0xff;
    double dDiff = 0x0000ffff / double(nBits & 0x00ffffff);

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

double GetDifficulty(const CBlockIndex *blockindex) {
    // Floating point number that is a multiple of the minimum difficulty,
    // minimum difficulty = 1.0.
    if (blockindex == nullptr) {
        return 1.0;
    }

    return GetDifficultyFromBits(blockindex->nBits);
}

UniValue blockheaderToJSON(const CBlockIndex *blockindex) {
    AssertLockHeld(cs_main);
    UniValue result(UniValue::VOBJ);
    result.pushKV("hash", blockindex->GetBlockHash().GetHex());
    int confirmations = -1;
    // Only report confirmations if the block is on the main chain
    if (chainActive.Contains(blockindex)) {
        confirmations = chainActive.Height() - blockindex->nHeight + 1;
    }
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

    if (blockindex->pprev) {
        result.pushKV("previousblockhash",
                      blockindex->pprev->GetBlockHash().GetHex());
    }
    CBlockIndex *pnext = chainActive.Next(blockindex);
    if (pnext) {
        result.pushKV("nextblockhash", pnext->GetBlockHash().GetHex());
    }
    return result;
}

UniValue blockToJSON(const Config &config, const CBlock &block,
                     const CBlockIndex *blockindex, bool txDetails) {
    AssertLockHeld(cs_main);
    UniValue result(UniValue::VOBJ);
    result.pushKV("hash", blockindex->GetBlockHash().GetHex());
    int confirmations = -1;
    // Only report confirmations if the block is on the main chain
    if (chainActive.Contains(blockindex)) {
        confirmations = chainActive.Height() - blockindex->nHeight + 1;
    }
    result.pushKV("confirmations", confirmations);
    result.pushKV(
        "size", (int)::GetSerializeSize(block, SER_NETWORK, PROTOCOL_VERSION));
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

    if (blockindex->pprev) {
        result.pushKV("previousblockhash",
                      blockindex->pprev->GetBlockHash().GetHex());
    }
    CBlockIndex *pnext = chainActive.Next(blockindex);
    if (pnext) {
        result.pushKV("nextblockhash", pnext->GetBlockHash().GetHex());
    }
    return result;
}

UniValue getblockcount(const Config &config, const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() != 0) {
        throw std::runtime_error(
            "getblockcount\n"
            "\nReturns the number of blocks in the longest blockchain.\n"
            "\nResult:\n"
            "n    (numeric) The current block count\n"
            "\nExamples:\n" +
            HelpExampleCli("getblockcount", "") +
            HelpExampleRpc("getblockcount", ""));
    }

    LOCK(cs_main);
    return chainActive.Height();
}

UniValue getbestblockhash(const Config &config, const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() != 0) {
        throw std::runtime_error(
            "getbestblockhash\n"
            "\nReturns the hash of the best (tip) block in the "
            "longest blockchain.\n"
            "\nResult:\n"
            "\"hex\"      (string) the block hash hex encoded\n"
            "\nExamples:\n" +
            HelpExampleCli("getbestblockhash", "") +
            HelpExampleRpc("getbestblockhash", ""));
    }

    LOCK(cs_main);
    return chainActive.Tip()->GetBlockHash().GetHex();
}

UniValue getfinalizedblockhash(const Config &config,
                               const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() != 0) {
        throw std::runtime_error(
            "getfinalizedblockhash\n"
            "\nReturns the hash of the currently finalized block\n"
            "\nResult:\n"
            "\"hex\"      (string) the block hash hex encoded\n");
    }

    LOCK(cs_main);
    const CBlockIndex *blockIndexFinalized = GetFinalizedBlock();
    if (blockIndexFinalized) {
        return blockIndexFinalized->GetBlockHash().GetHex();
    }
    return UniValue(UniValue::VSTR);
}

void RPCNotifyBlockChange(bool ibd, const CBlockIndex *pindex) {
    if (pindex) {
        std::lock_guard<std::mutex> lock(cs_blockchange);
        latestblock.hash = pindex->GetBlockHash();
        latestblock.height = pindex->nHeight;
    }
    cond_blockchange.notify_all();
}

UniValue waitfornewblock(const Config &config, const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() > 1) {
        throw std::runtime_error(
            "waitfornewblock (timeout)\n"
            "\nWaits for a specific new block and returns "
            "useful info about it.\n"
            "\nReturns the current block on timeout or exit.\n"
            "\nArguments:\n"
            "1. timeout (int, optional, default=0) Time in "
            "milliseconds to wait for a response. 0 indicates "
            "no timeout.\n"
            "\nResult:\n"
            "{                           (json object)\n"
            "  \"hash\" : {       (string) The blockhash\n"
            "  \"height\" : {     (int) Block height\n"
            "}\n"
            "\nExamples:\n" +
            HelpExampleCli("waitfornewblock", "1000") +
            HelpExampleRpc("waitfornewblock", "1000"));
    }

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
                lock, std::chrono::milliseconds(timeout), [&block] {
                    return latestblock.height != block.height ||
                           latestblock.hash != block.hash || !IsRPCRunning();
                });
        } else {
            cond_blockchange.wait(lock, [&block] {
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

UniValue waitforblock(const Config &config, const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() < 1 ||
        request.params.size() > 2) {
        throw std::runtime_error(
            "waitforblock <blockhash> (timeout)\n"
            "\nWaits for a specific new block and returns useful info about "
            "it.\n"
            "\nReturns the current block on timeout or exit.\n"
            "\nArguments:\n"
            "1. \"blockhash\" (required, string) Block hash to wait for.\n"
            "2. timeout       (int, optional, default=0) Time in milliseconds "
            "to wait for a response. 0 indicates no timeout.\n"
            "\nResult:\n"
            "{                           (json object)\n"
            "  \"hash\" : {       (string) The blockhash\n"
            "  \"height\" : {     (int) Block height\n"
            "}\n"
            "\nExamples:\n" +
            HelpExampleCli("waitforblock", "\"0000000000079f8ef3d2c688c244eb7a4"
                                           "570b24c9ed7b4a8c619eb02596f8862\", "
                                           "1000") +
            HelpExampleRpc("waitforblock", "\"0000000000079f8ef3d2c688c244eb7a4"
                                           "570b24c9ed7b4a8c619eb02596f8862\", "
                                           "1000"));
    }

    int timeout = 0;

    uint256 hash = uint256S(request.params[0].get_str());

    if (!request.params[1].isNull()) {
        timeout = request.params[1].get_int();
    }

    CUpdatedBlock block;
    {
        WAIT_LOCK(cs_blockchange, lock);
        if (timeout) {
            cond_blockchange.wait_for(
                lock, std::chrono::milliseconds(timeout), [&hash] {
                    return latestblock.hash == hash || !IsRPCRunning();
                });
        } else {
            cond_blockchange.wait(lock, [&hash] {
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

UniValue waitforblockheight(const Config &config,
                            const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() < 1 ||
        request.params.size() > 2) {
        throw std::runtime_error(
            "waitforblockheight <height> (timeout)\n"
            "\nWaits for (at least) block height and returns the height and "
            "hash\n"
            "of the current tip.\n"
            "\nReturns the current block on timeout or exit.\n"
            "\nArguments:\n"
            "1. height  (required, int) Block height to wait for (int)\n"
            "2. timeout (int, optional, default=0) Time in milliseconds to "
            "wait for a response. 0 indicates no timeout.\n"
            "\nResult:\n"
            "{                           (json object)\n"
            "  \"hash\" : {       (string) The blockhash\n"
            "  \"height\" : {     (int) Block height\n"
            "}\n"
            "\nExamples:\n" +
            HelpExampleCli("waitforblockheight", "\"100\", 1000") +
            HelpExampleRpc("waitforblockheight", "\"100\", 1000"));
    }

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
                lock, std::chrono::milliseconds(timeout), [&height] {
                    return latestblock.height >= height || !IsRPCRunning();
                });
        } else {
            cond_blockchange.wait(lock, [&height] {
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

UniValue getdifficulty(const Config &config, const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() != 0) {
        throw std::runtime_error("getdifficulty\n"
                                 "\nReturns the proof-of-work difficulty as a "
                                 "multiple of the minimum difficulty.\n"
                                 "\nResult:\n"
                                 "n.nnn       (numeric) the proof-of-work "
                                 "difficulty as a multiple of the minimum "
                                 "difficulty.\n"
                                 "\nExamples:\n" +
                                 HelpExampleCli("getdifficulty", "") +
                                 HelpExampleRpc("getdifficulty", ""));
    }

    LOCK(cs_main);
    return GetDifficulty(chainActive.Tip());
}

std::string EntryDescriptionString() {
    return "    \"size\" : n,             (numeric) transaction size.\n"
           "    \"fee\" : n,              (numeric) transaction fee in " +
           CURRENCY_UNIT +
           "\n"
           "    \"modifiedfee\" : n,      (numeric) transaction fee with fee "
           "deltas used for mining priority\n"
           "    \"time\" : n,             (numeric) local time transaction "
           "entered pool in seconds since 1 Jan 1970 GMT\n"
           "    \"height\" : n,           (numeric) block height when "
           "transaction entered pool\n"
           "    \"startingpriority\" : n, (numeric) DEPRECATED. Priority when "
           "transaction entered pool\n"
           "    \"currentpriority\" : n,  (numeric) DEPRECATED. Transaction "
           "priority now\n"
           "    \"descendantcount\" : n,  (numeric) number of in-mempool "
           "descendant transactions (including this one)\n"
           "    \"descendantsize\" : n,   (numeric) virtual transaction size "
           "of in-mempool descendants (including this one)\n"
           "    \"descendantfees\" : n,   (numeric) modified fees (see above) "
           "of in-mempool descendants (including this one)\n"
           "    \"ancestorcount\" : n,    (numeric) number of in-mempool "
           "ancestor transactions (including this one)\n"
           "    \"ancestorsize\" : n,     (numeric) virtual transaction size "
           "of in-mempool ancestors (including this one)\n"
           "    \"ancestorfees\" : n,     (numeric) modified fees (see above) "
           "of in-mempool ancestors (including this one)\n"
           "    \"depends\" : [           (array) unconfirmed transactions "
           "used as inputs for this transaction\n"
           "        \"transactionid\",    (string) parent transaction id\n"
           "       ... ]\n";
}

void entryToJSON(UniValue &info, const CTxMemPoolEntry &e) {
    AssertLockHeld(g_mempool.cs);

    info.pushKV("size", (int)e.GetTxSize());
    info.pushKV("fee", ValueFromAmount(e.GetFee()));
    info.pushKV("modifiedfee", ValueFromAmount(e.GetModifiedFee()));
    info.pushKV("time", e.GetTime());
    info.pushKV("height", (int)e.GetHeight());
    info.pushKV("startingpriority", e.GetPriority(e.GetHeight()));
    info.pushKV("currentpriority", e.GetPriority(chainActive.Height()));
    info.pushKV("descendantcount", e.GetCountWithDescendants());
    info.pushKV("descendantsize", e.GetSizeWithDescendants());
    info.pushKV("descendantfees", e.GetModFeesWithDescendants() / SATOSHI);
    info.pushKV("ancestorcount", e.GetCountWithAncestors());
    info.pushKV("ancestorsize", e.GetSizeWithAncestors());
    info.pushKV("ancestorfees", e.GetModFeesWithAncestors() / SATOSHI);
    const CTransaction &tx = e.GetTx();
    std::set<std::string> setDepends;
    for (const CTxIn &txin : tx.vin) {
        if (g_mempool.exists(txin.prevout.GetTxId())) {
            setDepends.insert(txin.prevout.GetTxId().ToString());
        }
    }

    UniValue depends(UniValue::VARR);
    for (const std::string &dep : setDepends) {
        depends.push_back(dep);
    }

    info.pushKV("depends", depends);
}

UniValue mempoolToJSON(bool fVerbose = false) {
    if (fVerbose) {
        LOCK(g_mempool.cs);
        UniValue o(UniValue::VOBJ);
        for (const CTxMemPoolEntry &e : g_mempool.mapTx) {
            const uint256 &txid = e.GetTx().GetId();
            UniValue info(UniValue::VOBJ);
            entryToJSON(info, e);
            o.pushKV(txid.ToString(), info);
        }
        return o;
    } else {
        std::vector<uint256> vtxids;
        g_mempool.queryHashes(vtxids);

        UniValue a(UniValue::VARR);
        for (const uint256 &txid : vtxids) {
            a.push_back(txid.ToString());
        }

        return a;
    }
}

UniValue getrawmempool(const Config &config, const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() > 1) {
        throw std::runtime_error(
            "getrawmempool ( verbose )\n"
            "\nReturns all transaction ids in memory pool as a json array of "
            "string transaction ids.\n"
            "\nArguments:\n"
            "1. verbose (boolean, optional, default=false) True for a json "
            "object, false for array of transaction ids\n"
            "\nResult: (for verbose = false):\n"
            "[                     (json array of string)\n"
            "  \"transactionid\"     (string) The transaction id\n"
            "  ,...\n"
            "]\n"
            "\nResult: (for verbose = true):\n"
            "{                           (json object)\n"
            "  \"transactionid\" : {       (json object)\n" +
            EntryDescriptionString() +
            "  }, ...\n"
            "}\n"
            "\nExamples:\n" +
            HelpExampleCli("getrawmempool", "true") +
            HelpExampleRpc("getrawmempool", "true"));
    }

    bool fVerbose = false;
    if (!request.params[0].isNull()) {
        fVerbose = request.params[0].get_bool();
    }

    return mempoolToJSON(fVerbose);
}

UniValue getmempoolancestors(const Config &config,
                             const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() < 1 ||
        request.params.size() > 2) {
        throw std::runtime_error(
            "getmempoolancestors txid (verbose)\n"
            "\nIf txid is in the mempool, returns all in-mempool ancestors.\n"
            "\nArguments:\n"
            "1. \"txid\"                 (string, required) The transaction id "
            "(must be in mempool)\n"
            "2. verbose                  (boolean, optional, default=false) "
            "True for a json object, false for array of transaction ids\n"
            "\nResult (for verbose=false):\n"
            "[                       (json array of strings)\n"
            "  \"transactionid\"           (string) The transaction id of an "
            "in-mempool ancestor transaction\n"
            "  ,...\n"
            "]\n"
            "\nResult (for verbose=true):\n"
            "{                           (json object)\n"
            "  \"transactionid\" : {       (json object)\n" +
            EntryDescriptionString() +
            "  }, ...\n"
            "}\n"
            "\nExamples:\n" +
            HelpExampleCli("getmempoolancestors", "\"mytxid\"") +
            HelpExampleRpc("getmempoolancestors", "\"mytxid\""));
    }

    bool fVerbose = false;
    if (!request.params[1].isNull()) {
        fVerbose = request.params[1].get_bool();
    }

    uint256 hash = ParseHashV(request.params[0], "parameter 1");

    LOCK(g_mempool.cs);

    CTxMemPool::txiter it = g_mempool.mapTx.find(hash);
    if (it == g_mempool.mapTx.end()) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                           "Transaction not in mempool");
    }

    CTxMemPool::setEntries setAncestors;
    uint64_t noLimit = std::numeric_limits<uint64_t>::max();
    std::string dummy;
    g_mempool.CalculateMemPoolAncestors(*it, setAncestors, noLimit, noLimit,
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
            const uint256 &_hash = e.GetTx().GetId();
            UniValue info(UniValue::VOBJ);
            entryToJSON(info, e);
            o.pushKV(_hash.ToString(), info);
        }
        return o;
    }
}

UniValue getmempooldescendants(const Config &config,
                               const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() < 1 ||
        request.params.size() > 2) {
        throw std::runtime_error(
            "getmempooldescendants txid (verbose)\n"
            "\nIf txid is in the mempool, returns all in-mempool descendants.\n"
            "\nArguments:\n"
            "1. \"txid\"                 (string, required) The transaction id "
            "(must be in mempool)\n"
            "2. verbose                  (boolean, optional, default=false) "
            "True for a json object, false for array of transaction ids\n"
            "\nResult (for verbose=false):\n"
            "[                       (json array of strings)\n"
            "  \"transactionid\"           (string) The transaction id of an "
            "in-mempool descendant transaction\n"
            "  ,...\n"
            "]\n"
            "\nResult (for verbose=true):\n"
            "{                           (json object)\n"
            "  \"transactionid\" : {       (json object)\n" +
            EntryDescriptionString() +
            "  }, ...\n"
            "}\n"
            "\nExamples:\n" +
            HelpExampleCli("getmempooldescendants", "\"mytxid\"") +
            HelpExampleRpc("getmempooldescendants", "\"mytxid\""));
    }

    bool fVerbose = false;
    if (!request.params[1].isNull()) {
        fVerbose = request.params[1].get_bool();
    }

    uint256 hash = ParseHashV(request.params[0], "parameter 1");

    LOCK(g_mempool.cs);

    CTxMemPool::txiter it = g_mempool.mapTx.find(hash);
    if (it == g_mempool.mapTx.end()) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                           "Transaction not in mempool");
    }

    CTxMemPool::setEntries setDescendants;
    g_mempool.CalculateDescendants(it, setDescendants);
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
            const uint256 &_hash = e.GetTx().GetId();
            UniValue info(UniValue::VOBJ);
            entryToJSON(info, e);
            o.pushKV(_hash.ToString(), info);
        }
        return o;
    }
}

UniValue getmempoolentry(const Config &config, const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() != 1) {
        throw std::runtime_error(
            "getmempoolentry txid\n"
            "\nReturns mempool data for given transaction\n"
            "\nArguments:\n"
            "1. \"txid\"                   (string, required) "
            "The transaction id (must be in mempool)\n"
            "\nResult:\n"
            "{                           (json object)\n" +
            EntryDescriptionString() +
            "}\n"
            "\nExamples:\n" +
            HelpExampleCli("getmempoolentry", "\"mytxid\"") +
            HelpExampleRpc("getmempoolentry", "\"mytxid\""));
    }

    uint256 hash = ParseHashV(request.params[0], "parameter 1");

    LOCK(g_mempool.cs);

    CTxMemPool::txiter it = g_mempool.mapTx.find(hash);
    if (it == g_mempool.mapTx.end()) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                           "Transaction not in mempool");
    }

    const CTxMemPoolEntry &e = *it;
    UniValue info(UniValue::VOBJ);
    entryToJSON(info, e);
    return info;
}

UniValue getblockhash(const Config &config, const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() != 1) {
        throw std::runtime_error(
            "getblockhash height\n"
            "\nReturns hash of block in best-block-chain at height provided.\n"
            "\nArguments:\n"
            "1. height         (numeric, required) The height index\n"
            "\nResult:\n"
            "\"hash\"         (string) The block hash\n"
            "\nExamples:\n" +
            HelpExampleCli("getblockhash", "1000") +
            HelpExampleRpc("getblockhash", "1000"));
    }

    LOCK(cs_main);

    int nHeight = request.params[0].get_int();
    if (nHeight < 0 || nHeight > chainActive.Height()) {
        throw JSONRPCError(RPC_INVALID_PARAMETER, "Block height out of range");
    }

    CBlockIndex *pblockindex = chainActive[nHeight];
    return pblockindex->GetBlockHash().GetHex();
}

UniValue getblockheader(const Config &config, const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() < 1 ||
        request.params.size() > 2) {
        throw std::runtime_error(
            "getblockheader \"hash\" ( verbose )\n"
            "\nIf verbose is false, returns a string that is serialized, "
            "hex-encoded data for blockheader 'hash'.\n"
            "If verbose is true, returns an Object with information about "
            "blockheader <hash>.\n"
            "\nArguments:\n"
            "1. \"hash\"          (string, required) The block hash\n"
            "2. verbose           (boolean, optional, default=true) true for a "
            "json object, false for the hex encoded data\n"
            "\nResult (for verbose = true):\n"
            "{\n"
            "  \"hash\" : \"hash\",     (string) the block hash (same as "
            "provided)\n"
            "  \"confirmations\" : n,   (numeric) The number of confirmations, "
            "or -1 if the block is not on the main chain\n"
            "  \"height\" : n,          (numeric) The block height or index\n"
            "  \"version\" : n,         (numeric) The block version\n"
            "  \"versionHex\" : \"00000000\", (string) The block version "
            "formatted in hexadecimal\n"
            "  \"merkleroot\" : \"xxxx\", (string) The merkle root\n"
            "  \"time\" : ttt,          (numeric) The block time in seconds "
            "since epoch (Jan 1 1970 GMT)\n"
            "  \"mediantime\" : ttt,    (numeric) The median block time in "
            "seconds since epoch (Jan 1 1970 GMT)\n"
            "  \"nonce\" : n,           (numeric) The nonce\n"
            "  \"bits\" : \"1d00ffff\", (string) The bits\n"
            "  \"difficulty\" : x.xxx,  (numeric) The difficulty\n"
            "  \"chainwork\" : \"0000...1f3\"     (string) Expected number of "
            "hashes required to produce the current chain (in hex)\n"
            "  \"previousblockhash\" : \"hash\",  (string) The hash of the "
            "previous block\n"
            "  \"nextblockhash\" : \"hash\",      (string) The hash of the "
            "next block\n"
            "}\n"
            "\nResult (for verbose=false):\n"
            "\"data\"             (string) A string that is serialized, "
            "hex-encoded data for block 'hash'.\n"
            "\nExamples:\n" +
            HelpExampleCli("getblockheader", "\"00000000c937983704a73af28acdec3"
                                             "7b049d214adbda81d7e2a3dd146f6ed09"
                                             "\"") +
            HelpExampleRpc("getblockheader", "\"00000000c937983704a73af28acdec3"
                                             "7b049d214adbda81d7e2a3dd146f6ed09"
                                             "\""));
    }

    LOCK(cs_main);

    std::string strHash = request.params[0].get_str();
    uint256 hash(uint256S(strHash));

    bool fVerbose = true;
    if (!request.params[1].isNull()) {
        fVerbose = request.params[1].get_bool();
    }

    const CBlockIndex *pblockindex = LookupBlockIndex(hash);
    if (!pblockindex) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY, "Block not found");
    }

    if (!fVerbose) {
        CDataStream ssBlock(SER_NETWORK, PROTOCOL_VERSION);
        ssBlock << pblockindex->GetBlockHeader();
        std::string strHex = HexStr(ssBlock.begin(), ssBlock.end());
        return strHex;
    }

    return blockheaderToJSON(pblockindex);
}

UniValue getblock(const Config &config, const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() < 1 ||
        request.params.size() > 2) {
        throw std::runtime_error(
            "getblock \"blockhash\" ( verbosity )\n"
            "\nIf verbosity is 0 or false, returns a string that is "
            "serialized, hex-encoded data for block 'hash'.\n"
            "If verbosity is 1 or true, returns an Object with information "
            "about block <hash>.\n"
            "If verbosity is 2, returns an Object with information about block "
            "<hash> and information about each transaction.\n"
            "\nArguments:\n"
            "1. \"blockhash\"           (string, required) The block hash\n"
            "2. verbosity             (numeric, optional, default=1) 0 for "
            "hex-encoded data, 1 for a json object, and 2 for json object with "
            "transaction data\n"
            "\nResult (for verbosity = 0):\n"
            "\"data\"                   (string) A string that is serialized, "
            "hex-encoded data for block 'hash'.\n"
            "\nResult (for verbosity = 1):\n"
            "{\n"
            "  \"hash\" : \"hash\",       (string) The block hash (same as "
            "provided)\n"
            "  \"confirmations\" : n,   (numeric) The number of confirmations, "
            "or -1 if the block is not on the main chain\n"
            "  \"size\" : n,            (numeric) The block size\n"
            "  \"height\" : n,          (numeric) The block height or index\n"
            "  \"version\" : n,         (numeric) The block version\n"
            "  \"versionHex\" : \"00000000\", (string) The block version "
            "formatted in hexadecimal\n"
            "  \"merkleroot\" : \"xxxx\", (string) The merkle root\n"
            "  \"tx\" : [               (array of string) The transaction ids\n"
            "     \"transactionid\"     (string) The transaction id\n"
            "     ,...\n"
            "  ],\n"
            "  \"time\" : ttt,          (numeric) The block time in seconds "
            "since epoch (Jan 1 1970 GMT)\n"
            "  \"mediantime\" : ttt,    (numeric) The median block time in "
            "seconds since epoch (Jan 1 1970 GMT)\n"
            "  \"nonce\" : n,           (numeric) The nonce\n"
            "  \"bits\" : \"1d00ffff\",   (string) The bits\n"
            "  \"difficulty\" : x.xxx,  (numeric) The difficulty\n"
            "  \"chainwork\" : \"xxxx\",  (string) Expected number of hashes "
            "required to produce the chain up to this block (in hex)\n"
            "  \"previousblockhash\" : \"hash\",  (string) The hash of the "
            "previous block\n"
            "  \"nextblockhash\" : \"hash\"       (string) The hash of the "
            "next block\n"
            "}\n"
            "\nResult (for verbosity = 2):\n"
            "{\n"
            "  ...,                   Same output as verbosity = 1\n"
            "  \"tx\" : [               (array of Objects) The transactions in "
            "the format of the getrawtransaction RPC; different from verbosity "
            "= 1 \"tx\" result\n"
            "    ...\n"
            "  ],\n"
            "  ...                    Same output as verbosity = 1\n"
            "}\n"
            "\nExamples:\n" +
            HelpExampleCli("getblock", "\"00000000c937983704a73af28acdec37b049d"
                                       "214adbda81d7e2a3dd146f6ed09\"") +
            HelpExampleRpc("getblock", "\"00000000c937983704a73af28acdec37b049d"
                                       "214adbda81d7e2a3dd146f6ed09\""));
    }

    LOCK(cs_main);

    std::string strHash = request.params[0].get_str();
    uint256 hash(uint256S(strHash));

    int verbosity = 1;
    if (!request.params[1].isNull()) {
        if (request.params[1].isNum()) {
            verbosity = request.params[1].get_int();
        } else {
            verbosity = request.params[1].get_bool() ? 1 : 0;
        }
    }

    const CBlockIndex *pblockindex = LookupBlockIndex(hash);
    if (!pblockindex) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY, "Block not found");
    }

    CBlock block;
    if (fHavePruned && !pblockindex->nStatus.hasData() &&
        pblockindex->nTx > 0) {
        throw JSONRPCError(RPC_MISC_ERROR, "Block not available (pruned data)");
    }

    if (!ReadBlockFromDisk(block, pblockindex, config)) {
        // Block not found on disk. This could be because we have the block
        // header in our index but don't have the block (for example if a
        // non-whitelisted node sends us an unrequested long chain of valid
        // blocks, we add the headers to our index, but don't accept the block).
        throw JSONRPCError(RPC_MISC_ERROR, "Block not found on disk");
    }

    if (verbosity <= 0) {
        CDataStream ssBlock(SER_NETWORK,
                            PROTOCOL_VERSION | RPCSerializationFlags());
        ssBlock << block;
        std::string strHex = HexStr(ssBlock.begin(), ssBlock.end());
        return strHex;
    }

    return blockToJSON(config, block, pblockindex, verbosity >= 2);
}

struct CCoinsStats {
    int nHeight;
    uint256 hashBlock;
    uint64_t nTransactions;
    uint64_t nTransactionOutputs;
    uint64_t nBogoSize;
    uint256 hashSerialized;
    uint64_t nDiskSize;
    Amount nTotalAmount;

    CCoinsStats()
        : nHeight(0), nTransactions(0), nTransactionOutputs(0), nBogoSize(0),
          nDiskSize(0), nTotalAmount() {}
};

static void ApplyStats(CCoinsStats &stats, CHashWriter &ss, const uint256 &hash,
                       const std::map<uint32_t, Coin> &outputs) {
    assert(!outputs.empty());
    ss << hash;
    ss << VARINT(outputs.begin()->second.GetHeight() * 2 +
                 outputs.begin()->second.IsCoinBase());
    stats.nTransactions++;
    for (const auto output : outputs) {
        ss << VARINT(output.first + 1);
        ss << output.second.GetTxOut().scriptPubKey;
        ss << VARINT(output.second.GetTxOut().nValue / SATOSHI);
        stats.nTransactionOutputs++;
        stats.nTotalAmount += output.second.GetTxOut().nValue;
        stats.nBogoSize +=
            32 /* txid */ + 4 /* vout index */ + 4 /* height + coinbase */ +
            8 /* amount */ + 2 /* scriptPubKey len */ +
            output.second.GetTxOut().scriptPubKey.size() /* scriptPubKey */;
    }
    ss << VARINT(0);
}

//! Calculate statistics about the unspent transaction output set
static bool GetUTXOStats(CCoinsView *view, CCoinsStats &stats) {
    std::unique_ptr<CCoinsViewCursor> pcursor(view->Cursor());

    CHashWriter ss(SER_GETHASH, PROTOCOL_VERSION);
    stats.hashBlock = pcursor->GetBestBlock();
    {
        LOCK(cs_main);
        stats.nHeight = LookupBlockIndex(stats.hashBlock)->nHeight;
    }
    ss << stats.hashBlock;
    uint256 prevkey;
    std::map<uint32_t, Coin> outputs;
    while (pcursor->Valid()) {
        boost::this_thread::interruption_point();
        COutPoint key;
        Coin coin;
        if (pcursor->GetKey(key) && pcursor->GetValue(coin)) {
            if (!outputs.empty() && key.GetTxId() != prevkey) {
                ApplyStats(stats, ss, prevkey, outputs);
                outputs.clear();
            }
            prevkey = key.GetTxId();
            outputs[key.GetN()] = std::move(coin);
        } else {
            return error("%s: unable to read value", __func__);
        }
        pcursor->Next();
    }
    if (!outputs.empty()) {
        ApplyStats(stats, ss, prevkey, outputs);
    }
    stats.hashSerialized = ss.GetHash();
    stats.nDiskSize = view->EstimateSize();
    return true;
}

UniValue pruneblockchain(const Config &config, const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() != 1) {
        throw std::runtime_error(
            "pruneblockchain\n"
            "\nArguments:\n"
            "1. \"height\"       (numeric, required) The block height to prune "
            "up to. May be set to a discrete height, or a unix timestamp\n"
            "                  to prune blocks whose block time is at least 2 "
            "hours older than the provided timestamp.\n"
            "\nResult:\n"
            "n    (numeric) Height of the last block pruned.\n"
            "\nExamples:\n" +
            HelpExampleCli("pruneblockchain", "1000") +
            HelpExampleRpc("pruneblockchain", "1000"));
    }

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
        CBlockIndex *pindex =
            chainActive.FindEarliestAtLeast(heightParam - TIMESTAMP_WINDOW);
        if (!pindex) {
            throw JSONRPCError(
                RPC_INVALID_PARAMETER,
                "Could not find block with at least the specified timestamp.");
        }
        heightParam = pindex->nHeight;
    }

    unsigned int height = (unsigned int)heightParam;
    unsigned int chainHeight = (unsigned int)chainActive.Height();
    if (chainHeight < config.GetChainParams().PruneAfterHeight()) {
        throw JSONRPCError(RPC_MISC_ERROR,
                           "Blockchain is too short for pruning.");
    } else if (height > chainHeight) {
        throw JSONRPCError(
            RPC_INVALID_PARAMETER,
            "Blockchain is shorter than the attempted prune height.");
    } else if (height > chainHeight - MIN_BLOCKS_TO_KEEP) {
        LogPrint(BCLog::RPC, "Attempt to prune blocks close to the tip. "
                             "Retaining the minimum number of blocks.");
        height = chainHeight - MIN_BLOCKS_TO_KEEP;
    }

    PruneBlockFilesManual(height);
    return uint64_t(height);
}

UniValue gettxoutsetinfo(const Config &config, const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() != 0) {
        throw std::runtime_error(
            "gettxoutsetinfo\n"
            "\nReturns statistics about the unspent transaction output set.\n"
            "Note this call may take some time.\n"
            "\nResult:\n"
            "{\n"
            "  \"height\":n,     (numeric) The current block height (index)\n"
            "  \"bestblock\": \"hex\",   (string) the best block hash hex\n"
            "  \"transactions\": n,      (numeric) The number of transactions\n"
            "  \"txouts\": n,            (numeric) The number of output "
            "transactions\n"
            "  \"bogosize\": n,          (numeric) A database-independent "
            "metric for UTXO set size\n"
            "  \"hash_serialized\": \"hash\",   (string) The serialized hash\n"
            "  \"disk_size\": n,         (numeric) The estimated size of the "
            "chainstate on disk\n"
            "  \"total_amount\": x.xxx          (numeric) The total amount\n"
            "}\n"
            "\nExamples:\n" +
            HelpExampleCli("gettxoutsetinfo", "") +
            HelpExampleRpc("gettxoutsetinfo", ""));
    }

    UniValue ret(UniValue::VOBJ);

    CCoinsStats stats;
    FlushStateToDisk();
    if (GetUTXOStats(pcoinsdbview.get(), stats)) {
        ret.pushKV("height", int64_t(stats.nHeight));
        ret.pushKV("bestblock", stats.hashBlock.GetHex());
        ret.pushKV("transactions", int64_t(stats.nTransactions));
        ret.pushKV("txouts", int64_t(stats.nTransactionOutputs));
        ret.pushKV("bogosize", int64_t(stats.nBogoSize));
        ret.pushKV("hash_serialized", stats.hashSerialized.GetHex());
        ret.pushKV("disk_size", stats.nDiskSize);
        ret.pushKV("total_amount", ValueFromAmount(stats.nTotalAmount));
    } else {
        throw JSONRPCError(RPC_INTERNAL_ERROR, "Unable to read UTXO set");
    }
    return ret;
}

UniValue gettxout(const Config &config, const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() < 2 ||
        request.params.size() > 3) {
        throw std::runtime_error(
            "gettxout \"txid\" n ( include_mempool )\n"
            "\nReturns details about an unspent transaction output.\n"
            "\nArguments:\n"
            "1. \"txid\"             (string, required) The transaction id\n"
            "2. \"n\"                (numeric, required) vout number\n"
            "3. \"include_mempool\"  (boolean, optional) Whether to include "
            "the mempool. Default: true."
            "     Note that an unspent output that is spent in the mempool "
            "won't appear.\n"
            "\nResult:\n"
            "{\n"
            "  \"bestblock\" : \"hash\",    (string) the block hash\n"
            "  \"confirmations\" : n,       (numeric) The number of "
            "confirmations\n"
            "  \"value\" : x.xxx,           (numeric) The transaction value "
            "in " +
            CURRENCY_UNIT +
            "\n"
            "  \"scriptPubKey\" : {         (json object)\n"
            "     \"asm\" : \"code\",       (string) \n"
            "     \"hex\" : \"hex\",        (string) \n"
            "     \"reqSigs\" : n,          (numeric) Number of required "
            "signatures\n"
            "     \"type\" : \"pubkeyhash\", (string) The type, eg pubkeyhash\n"
            "     \"addresses\" : [          (array of string) array of "
            "bitcoin addresses\n"
            "        \"address\"     (string) bitcoin address\n"
            "        ,...\n"
            "     ]\n"
            "  },\n"
            "  \"coinbase\" : true|false   (boolean) Coinbase or not\n"
            "}\n"

            "\nExamples:\n"
            "\nGet unspent transactions\n" +
            HelpExampleCli("listunspent", "") + "\nView the details\n" +
            HelpExampleCli("gettxout", "\"txid\" 1") +
            "\nAs a json rpc call\n" +
            HelpExampleRpc("gettxout", "\"txid\", 1"));
    }

    LOCK(cs_main);

    UniValue ret(UniValue::VOBJ);

    std::string strHash = request.params[0].get_str();
    uint256 hash(uint256S(strHash));
    int n = request.params[1].get_int();
    COutPoint out(hash, n);
    bool fMempool = true;
    if (!request.params[2].isNull()) {
        fMempool = request.params[2].get_bool();
    }

    Coin coin;
    if (fMempool) {
        LOCK(g_mempool.cs);
        CCoinsViewMemPool view(pcoinsTip.get(), g_mempool);
        if (!view.GetCoin(out, coin) || g_mempool.isSpent(out)) {
            // TODO: this should be done by the CCoinsViewMemPool
            return NullUniValue;
        }
    } else {
        if (!pcoinsTip->GetCoin(out, coin)) {
            return NullUniValue;
        }
    }

    const CBlockIndex *pindex = LookupBlockIndex(pcoinsTip->GetBestBlock());
    ret.pushKV("bestblock", pindex->GetBlockHash().GetHex());
    if (coin.GetHeight() == MEMPOOL_HEIGHT) {
        ret.pushKV("confirmations", 0);
    } else {
        ret.pushKV("confirmations",
                   int64_t(pindex->nHeight - coin.GetHeight() + 1));
    }
    ret.pushKV("value", ValueFromAmount(coin.GetTxOut().nValue));
    UniValue o(UniValue::VOBJ);
    ScriptPubKeyToUniv(coin.GetTxOut().scriptPubKey, o, true);
    ret.pushKV("scriptPubKey", o);
    ret.pushKV("coinbase", coin.IsCoinBase());

    return ret;
}

UniValue verifychain(const Config &config, const JSONRPCRequest &request) {
    int nCheckLevel = gArgs.GetArg("-checklevel", DEFAULT_CHECKLEVEL);
    int nCheckDepth = gArgs.GetArg("-checkblocks", DEFAULT_CHECKBLOCKS);
    if (request.fHelp || request.params.size() > 2) {
        throw std::runtime_error(
            "verifychain ( checklevel nblocks )\n"
            "\nVerifies blockchain database.\n"
            "\nArguments:\n"
            "1. checklevel   (numeric, optional, 0-4, default=" +
            strprintf("%d", nCheckLevel) +
            ") How thorough the block verification is.\n"
            "2. nblocks      (numeric, optional, default=" +
            strprintf("%d", nCheckDepth) +
            ", 0=all) The number of blocks to check.\n"
            "\nResult:\n"
            "true|false       (boolean) Verified or not\n"
            "\nExamples:\n" +
            HelpExampleCli("verifychain", "") +
            HelpExampleRpc("verifychain", ""));
    }

    LOCK(cs_main);

    if (!request.params[0].isNull()) {
        nCheckLevel = request.params[0].get_int();
    }
    if (!request.params[1].isNull()) {
        nCheckDepth = request.params[1].get_int();
    }

    return CVerifyDB().VerifyDB(config, pcoinsTip.get(), nCheckLevel,
                                nCheckDepth);
}

/** Implementation of IsSuperMajority with better feedback */
static UniValue SoftForkMajorityDesc(int version, CBlockIndex *pindex,
                                     const Consensus::Params &consensusParams) {
    UniValue rv(UniValue::VOBJ);
    bool activated = false;
    switch (version) {
        case 2:
            activated = pindex->nHeight >= consensusParams.BIP34Height;
            break;
        case 3:
            activated = pindex->nHeight >= consensusParams.BIP66Height;
            break;
        case 4:
            activated = pindex->nHeight >= consensusParams.BIP65Height;
            break;
        case 5:
            activated = pindex->nHeight >= consensusParams.CSVHeight;
            break;
    }
    rv.pushKV("status", activated);
    return rv;
}

static UniValue SoftForkDesc(const std::string &name, int version,
                             CBlockIndex *pindex,
                             const Consensus::Params &consensusParams) {
    UniValue rv(UniValue::VOBJ);
    rv.pushKV("id", name);
    rv.pushKV("version", version);
    rv.pushKV("reject", SoftForkMajorityDesc(version, pindex, consensusParams));
    return rv;
}

UniValue getblockchaininfo(const Config &config,
                           const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() != 0) {
        throw std::runtime_error(
            "getblockchaininfo\n"
            "Returns an object containing various state info regarding "
            "blockchain processing.\n"
            "\nResult:\n"
            "{\n"
            "  \"chain\": \"xxxx\",              (string) current network name "
            "as defined in BIP70 (main, test, regtest)\n"
            "  \"blocks\": xxxxxx,             (numeric) the current number of "
            "blocks processed in the server\n"
            "  \"headers\": xxxxxx,            (numeric) the current number of "
            "headers we have validated\n"
            "  \"bestblockhash\": \"...\",       (string) the hash of the "
            "currently best block\n"
            "  \"difficulty\": xxxxxx,         (numeric) the current "
            "difficulty\n"
            "  \"mediantime\": xxxxxx,         (numeric) median time for the "
            "current best block\n"
            "  \"verificationprogress\": xxxx, (numeric) estimate of "
            "verification progress [0..1]\n"
            "  \"chainwork\": \"xxxx\"           (string) total amount of work "
            "in active chain, in hexadecimal\n"
            "  \"size_on_disk\": xxxxxx,       (numeric) the estimated size of "
            "the block and undo files on disk\n"
            "  \"pruned\": xx,                 (boolean) if the blocks are "
            "subject to pruning\n"
            "  \"pruneheight\": xxxxxx,        (numeric) lowest-height "
            "complete block stored (only present if pruning is enabled)\n"
            "  \"automatic_pruning\": xx,      (boolean) whether automatic "
            "pruning is enabled (only present if pruning is enabled)\n"
            "  \"prune_target_size\": xxxxxx,  (numeric) the target size "
            "used by pruning (only present if automatic pruning is enabled)\n"
            "  \"softforks\": [                (array) status of softforks in "
            "progress\n"
            "     {\n"
            "        \"id\": \"xxxx\",           (string) name of softfork\n"
            "        \"version\": xx,          (numeric) block version\n"
            "        \"reject\": {             (object) progress toward "
            "rejecting pre-softfork blocks\n"
            "           \"status\": xx,        (boolean) true if threshold "
            "reached\n"
            "        },\n"
            "     }, ...\n"
            "  ]\n"
            "  \"warnings\" : \"...\",           (string) any network and "
            "blockchain warnings.\n"
            "}\n"
            "\nExamples:\n" +
            HelpExampleCli("getblockchaininfo", "") +
            HelpExampleRpc("getblockchaininfo", ""));
    }

    LOCK(cs_main);

    UniValue obj(UniValue::VOBJ);
    obj.pushKV("chain", config.GetChainParams().NetworkIDString());
    obj.pushKV("blocks", int(chainActive.Height()));
    obj.pushKV("headers", pindexBestHeader ? pindexBestHeader->nHeight : -1);
    obj.pushKV("bestblockhash", chainActive.Tip()->GetBlockHash().GetHex());
    obj.pushKV("difficulty", double(GetDifficulty(chainActive.Tip())));
    obj.pushKV("mediantime", int64_t(chainActive.Tip()->GetMedianTimePast()));
    obj.pushKV("verificationprogress",
               GuessVerificationProgress(config.GetChainParams().TxData(),
                                         chainActive.Tip()));
    obj.pushKV("chainwork", chainActive.Tip()->nChainWork.GetHex());
    obj.pushKV("size_on_disk", CalculateCurrentUsage());
    obj.pushKV("pruned", fPruneMode);

    if (fPruneMode) {
        CBlockIndex *block = chainActive.Tip();
        assert(block);
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

    const Consensus::Params &consensusParams =
        config.GetChainParams().GetConsensus();
    CBlockIndex *tip = chainActive.Tip();
    UniValue softforks(UniValue::VARR);
    softforks.push_back(SoftForkDesc("bip34", 2, tip, consensusParams));
    softforks.push_back(SoftForkDesc("bip66", 3, tip, consensusParams));
    softforks.push_back(SoftForkDesc("bip65", 4, tip, consensusParams));
    softforks.push_back(SoftForkDesc("csv", 5, tip, consensusParams));
    obj.pushKV("softforks", softforks);

    obj.pushKV("warnings", GetWarnings("statusbar"));
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

UniValue getchaintips(const Config &config, const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() != 0) {
        throw std::runtime_error(
            "getchaintips\n"
            "Return information about all known tips in the block tree,"
            " including the main chain as well as orphaned branches.\n"
            "\nResult:\n"
            "[\n"
            "  {\n"
            "    \"height\": xxxx,         (numeric) height of the chain tip\n"
            "    \"hash\": \"xxxx\",         (string) block hash of the tip\n"
            "    \"branchlen\": 0          (numeric) zero for main chain\n"
            "    \"status\": \"active\"      (string) \"active\" for the main "
            "chain\n"
            "  },\n"
            "  {\n"
            "    \"height\": xxxx,\n"
            "    \"hash\": \"xxxx\",\n"
            "    \"branchlen\": 1          (numeric) length of branch "
            "connecting the tip to the main chain\n"
            "    \"status\": \"xxxx\"        (string) status of the chain "
            "(active, valid-fork, valid-headers, headers-only, invalid)\n"
            "  }\n"
            "]\n"
            "Possible values for status:\n"
            "1.  \"invalid\"               This branch contains at least one "
            "invalid block\n"
            "2.  \"parked\"                This branch contains at least one "
            "parked block\n"
            "3.  \"headers-only\"          Not all blocks for this branch are "
            "available, but the headers are valid\n"
            "4.  \"valid-headers\"         All blocks are available for this "
            "branch, but they were never fully validated\n"
            "5.  \"valid-fork\"            This branch is not part of the "
            "active chain, but is fully validated\n"
            "6.  \"active\"                This is the tip of the active main "
            "chain, which is certainly valid\n"
            "\nExamples:\n" +
            HelpExampleCli("getchaintips", "") +
            HelpExampleRpc("getchaintips", ""));
    }

    LOCK(cs_main);

    /**
     * Idea:  the set of chain tips is chainActive.tip, plus orphan blocks which
     * do not have another orphan building off of them.
     * Algorithm:
     *  - Make one pass through mapBlockIndex, picking out the orphan blocks,
     * and also storing a set of the orphan block's pprev pointers.
     *  - Iterate through the orphan blocks. If the block isn't pointed to by
     * another orphan, it is a chain tip.
     *  - add chainActive.Tip()
     */
    std::set<const CBlockIndex *, CompareBlocksByHeight> setTips;
    std::set<const CBlockIndex *> setOrphans;
    std::set<const CBlockIndex *> setPrevs;

    for (const std::pair<const uint256, CBlockIndex *> &item : mapBlockIndex) {
        if (!chainActive.Contains(item.second)) {
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
    setTips.insert(chainActive.Tip());

    /* Construct the output array.  */
    UniValue res(UniValue::VARR);
    for (const CBlockIndex *block : setTips) {
        UniValue obj(UniValue::VOBJ);
        obj.pushKV("height", block->nHeight);
        obj.pushKV("hash", block->phashBlock->GetHex());

        const int branchLen =
            block->nHeight - chainActive.FindFork(block)->nHeight;
        obj.pushKV("branchlen", branchLen);

        std::string status;
        if (chainActive.Contains(block)) {
            // This block is part of the currently active chain.
            status = "active";
        } else if (block->nStatus.isInvalid()) {
            // This block or one of its ancestors is invalid.
            status = "invalid";
        } else if (block->nStatus.isOnParkedChain()) {
            // This block or one of its ancestors is parked.
            status = "parked";
        } else if (block->nChainTx == 0) {
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

UniValue mempoolInfoToJSON() {
    UniValue ret(UniValue::VOBJ);
    ret.pushKV("size", (int64_t)g_mempool.size());
    ret.pushKV("bytes", (int64_t)g_mempool.GetTotalTxSize());
    ret.pushKV("usage", (int64_t)g_mempool.DynamicMemoryUsage());
    size_t maxmempool =
        gArgs.GetArg("-maxmempool", DEFAULT_MAX_MEMPOOL_SIZE) * 1000000;
    ret.pushKV("maxmempool", (int64_t)maxmempool);
    ret.pushKV("mempoolminfee",
               ValueFromAmount(g_mempool.GetMinFee(maxmempool).GetFeePerK()));

    return ret;
}

UniValue getmempoolinfo(const Config &config, const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() != 0) {
        throw std::runtime_error(
            "getmempoolinfo\n"
            "\nReturns details on the active state of the TX memory pool.\n"
            "\nResult:\n"
            "{\n"
            "  \"size\": xxxxx,               (numeric) Current tx count\n"
            "  \"bytes\": xxxxx,              (numeric) Transaction size.\n"
            "  \"usage\": xxxxx,              (numeric) Total memory usage for "
            "the mempool\n"
            "  \"maxmempool\": xxxxx,         (numeric) Maximum memory usage "
            "for the mempool\n"
            "  \"mempoolminfee\": xxxxx       (numeric) Minimum fee for tx to "
            "be accepted\n"
            "}\n"
            "\nExamples:\n" +
            HelpExampleCli("getmempoolinfo", "") +
            HelpExampleRpc("getmempoolinfo", ""));
    }

    return mempoolInfoToJSON();
}

UniValue preciousblock(const Config &config, const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() != 1) {
        throw std::runtime_error(
            "preciousblock \"blockhash\"\n"
            "\nTreats a block as if it were received before others with the "
            "same work.\n"
            "\nA later preciousblock call can override the effect of an "
            "earlier one.\n"
            "\nThe effects of preciousblock are not retained across restarts.\n"
            "\nArguments:\n"
            "1. \"blockhash\"   (string, required) the hash of the block to "
            "mark as precious\n"
            "\nResult:\n"
            "\nExamples:\n" +
            HelpExampleCli("preciousblock", "\"blockhash\"") +
            HelpExampleRpc("preciousblock", "\"blockhash\""));
    }

    std::string strHash = request.params[0].get_str();
    uint256 hash(uint256S(strHash));
    CBlockIndex *pblockindex;

    {
        LOCK(cs_main);
        pblockindex = LookupBlockIndex(hash);
        if (!pblockindex) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY, "Block not found");
        }
    }

    CValidationState state;
    PreciousBlock(config, state, pblockindex);

    if (!state.IsValid()) {
        throw JSONRPCError(RPC_DATABASE_ERROR, state.GetRejectReason());
    }

    return NullUniValue;
}

UniValue finalizeblock(const Config &config, const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() != 1) {
        throw std::runtime_error(
            "finalizeblock \"blockhash\"\n"

            "\nTreats a block as final. It cannot be reorged. Any chain\n"
            "that does not contain this block is invalid. Used on a less\n"
            "work chain, it can effectively PUTS YOU OUT OF CONSENSUS.\n"
            "USE WITH CAUTION!\n"
            "\nResult:\n"
            "\nExamples:\n" +
            HelpExampleCli("finalizeblock", "\"blockhash\"") +
            HelpExampleRpc("finalizeblock", "\"blockhash\""));
    }

    std::string strHash = request.params[0].get_str();
    uint256 hash(uint256S(strHash));
    CValidationState state;

    {
        LOCK(cs_main);
        CBlockIndex *pblockindex = LookupBlockIndex(hash);
        if (!pblockindex) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY, "Block not found");
        }

        FinalizeBlockAndInvalidate(config, state, pblockindex);
    }

    if (state.IsValid()) {
        ActivateBestChain(config, state);
    }

    if (!state.IsValid()) {
        throw JSONRPCError(RPC_DATABASE_ERROR, state.GetRejectReason());
    }

    return NullUniValue;
}

UniValue invalidateblock(const Config &config, const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() != 1) {
        throw std::runtime_error(
            "invalidateblock \"blockhash\"\n"
            "\nPermanently marks a block as invalid, as if it "
            "violated a consensus rule.\n"
            "\nArguments:\n"
            "1. \"blockhash\"   (string, required) the hash of "
            "the block to mark as invalid\n"
            "\nResult:\n"
            "\nExamples:\n" +
            HelpExampleCli("invalidateblock", "\"blockhash\"") +
            HelpExampleRpc("invalidateblock", "\"blockhash\""));
    }

    const std::string strHash = request.params[0].get_str();
    const uint256 hash(uint256S(strHash));
    CValidationState state;

    {
        LOCK(cs_main);
        CBlockIndex *pblockindex = LookupBlockIndex(hash);
        if (!pblockindex) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY, "Block not found");
        }

        InvalidateBlock(config, state, pblockindex);
    }

    if (state.IsValid()) {
        ActivateBestChain(config, state);
    }

    if (!state.IsValid()) {
        throw JSONRPCError(RPC_DATABASE_ERROR, state.GetRejectReason());
    }

    return NullUniValue;
}

UniValue parkblock(const Config &config, const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() != 1) {
        throw std::runtime_error("parkblock \"blockhash\"\n"
                                 "\nMarks a block as parked.\n"
                                 "\nArguments:\n"
                                 "1. \"blockhash\"   (string, required) the "
                                 "hash of the block to park\n"
                                 "\nResult:\n"
                                 "\nExamples:\n" +
                                 HelpExampleCli("parkblock", "\"blockhash\"") +
                                 HelpExampleRpc("parkblock", "\"blockhash\""));
    }

    const std::string strHash = request.params[0].get_str();
    const uint256 hash(uint256S(strHash));
    CValidationState state;

    {
        LOCK(cs_main);
        if (mapBlockIndex.count(hash) == 0) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY, "Block not found");
        }

        CBlockIndex *pblockindex = mapBlockIndex[hash];
        ParkBlock(config, state, pblockindex);
    }

    if (state.IsValid()) {
        ActivateBestChain(config, state);
    }

    if (!state.IsValid()) {
        throw JSONRPCError(RPC_DATABASE_ERROR, state.GetRejectReason());
    }

    return NullUniValue;
}

UniValue reconsiderblock(const Config &config, const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() != 1) {
        throw std::runtime_error(
            "reconsiderblock \"blockhash\"\n"
            "\nRemoves invalidity status of a block and its descendants, "
            "reconsider them for activation.\n"
            "This can be used to undo the effects of invalidateblock.\n"
            "\nArguments:\n"
            "1. \"blockhash\"   (string, required) the hash of the block to "
            "reconsider\n"
            "\nResult:\n"
            "\nExamples:\n" +
            HelpExampleCli("reconsiderblock", "\"blockhash\"") +
            HelpExampleRpc("reconsiderblock", "\"blockhash\""));
    }

    const std::string strHash = request.params[0].get_str();
    const uint256 hash(uint256S(strHash));

    {
        LOCK(cs_main);
        CBlockIndex *pblockindex = LookupBlockIndex(hash);
        if (!pblockindex) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY, "Block not found");
        }

        ResetBlockFailureFlags(pblockindex);
    }

    CValidationState state;
    ActivateBestChain(config, state);

    if (!state.IsValid()) {
        throw JSONRPCError(RPC_DATABASE_ERROR, state.GetRejectReason());
    }

    return NullUniValue;
}

UniValue unparkblock(const Config &config, const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() != 1) {
        throw std::runtime_error(
            "unparkblock \"blockhash\"\n"
            "\nRemoves parked status of a block and its descendants, "
            "reconsider them for activation.\n"
            "This can be used to undo the effects of parkblock.\n"
            "\nArguments:\n"
            "1. \"blockhash\"   (string, required) the hash of the block to "
            "unpark\n"
            "\nResult:\n"
            "\nExamples:\n" +
            HelpExampleCli("unparkblock", "\"blockhash\"") +
            HelpExampleRpc("unparkblock", "\"blockhash\""));
    }

    const std::string strHash = request.params[0].get_str();
    const uint256 hash(uint256S(strHash));

    {
        LOCK(cs_main);
        if (mapBlockIndex.count(hash) == 0) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY, "Block not found");
        }

        CBlockIndex *pblockindex = mapBlockIndex[hash];
        UnparkBlockAndChildren(pblockindex);
    }

    CValidationState state;
    ActivateBestChain(config, state);

    if (!state.IsValid()) {
        throw JSONRPCError(RPC_DATABASE_ERROR, state.GetRejectReason());
    }

    return NullUniValue;
}

UniValue getchaintxstats(const Config &config, const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() > 2) {
        throw std::runtime_error(
            "getchaintxstats ( nblocks blockhash )\n"
            "\nCompute statistics about the total number and rate of "
            "transactions in the chain.\n"
            "\nArguments:\n"
            "1. nblocks      (numeric, optional) Size of the window in number "
            "of blocks (default: one month).\n"
            "2. \"blockhash\"  (string, optional) The hash of the block that "
            "ends the window.\n"
            "\nResult:\n"
            "{\n"
            "  \"time\": xxxxx,                         (numeric) The "
            "timestamp for the final block in the window in UNIX format.\n"
            "  \"txcount\": xxxxx,                      (numeric) The total "
            "number of transactions in the chain up to that point.\n"
            "  \"window_final_block_hash\": \"...\",      (string) The hash of "
            "the final block in the window.\n"
            "  \"window_block_count\": xxxxx,           (numeric) Size of "
            "the window in number of blocks.\n"
            "  \"window_tx_count\": xxxxx,              (numeric) The number "
            "of transactions in the window. Only returned if "
            "\"window_block_count\" is > 0.\n"
            "  \"window_interval\": xxxxx,              (numeric) The elapsed "
            "time in the window in seconds. Only returned if "
            "\"window_block_count\" is > 0.\n"
            "  \"txrate\": x.xx,                        (numeric) The average "
            "rate of transactions per second in the window. Only returned if "
            "\"window_interval\" is > 0.\n"
            "}\n"
            "\nExamples:\n" +
            HelpExampleCli("getchaintxstats", "") +
            HelpExampleRpc("getchaintxstats", "2016"));
    }

    const CBlockIndex *pindex;

    // By default: 1 month
    int blockcount = 30 * 24 * 60 * 60 /
                     config.GetChainParams().GetConsensus().nPowTargetSpacing;

    if (request.params[1].isNull()) {
        LOCK(cs_main);
        pindex = chainActive.Tip();
    } else {
        uint256 hash = uint256S(request.params[1].get_str());
        LOCK(cs_main);
        pindex = LookupBlockIndex(hash);
        if (!pindex) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY, "Block not found");
        }
        if (!chainActive.Contains(pindex)) {
            throw JSONRPCError(RPC_INVALID_PARAMETER,
                               "Block is not in main chain");
        }
    }

    assert(pindex != nullptr);

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
    int nTxDiff = pindex->nChainTx - pindexPast->nChainTx;

    UniValue ret(UniValue::VOBJ);
    ret.pushKV("time", int64_t(pindex->nTime));
    ret.pushKV("txcount", int64_t(pindex->nChainTx));
    ret.pushKV("window_final_block_hash", pindex->GetBlockHash().GetHex());
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

// clang-format off
static const ContextFreeRPCCommand commands[] = {
    //  category            name                      actor (function)        argNames
    //  ------------------- ------------------------  ----------------------  ----------
    { "blockchain",         "getblockchaininfo",      getblockchaininfo,      {} },
    { "blockchain",         "getchaintxstats",        &getchaintxstats,       {"nblocks", "blockhash"} },
    { "blockchain",         "getbestblockhash",       getbestblockhash,       {} },
    { "blockchain",         "getblockcount",          getblockcount,          {} },
    { "blockchain",         "getblock",               getblock,               {"blockhash","verbosity|verbose"} },
    { "blockchain",         "getblockhash",           getblockhash,           {"height"} },
    { "blockchain",         "getblockheader",         getblockheader,         {"blockhash","verbose"} },
    { "blockchain",         "getchaintips",           getchaintips,           {} },
    { "blockchain",         "getdifficulty",          getdifficulty,          {} },
    { "blockchain",         "getmempoolancestors",    getmempoolancestors,    {"txid","verbose"} },
    { "blockchain",         "getmempooldescendants",  getmempooldescendants,  {"txid","verbose"} },
    { "blockchain",         "getmempoolentry",        getmempoolentry,        {"txid"} },
    { "blockchain",         "getmempoolinfo",         getmempoolinfo,         {} },
    { "blockchain",         "getrawmempool",          getrawmempool,          {"verbose"} },
    { "blockchain",         "gettxout",               gettxout,               {"txid","n","include_mempool"} },
    { "blockchain",         "gettxoutsetinfo",        gettxoutsetinfo,        {} },
    { "blockchain",         "pruneblockchain",        pruneblockchain,        {"height"} },
    { "blockchain",         "verifychain",            verifychain,            {"checklevel","nblocks"} },
    { "blockchain",         "preciousblock",          preciousblock,          {"blockhash"} },

    /* Not shown in help */
    { "hidden",             "getfinalizedblockhash",  getfinalizedblockhash,  {} },
    { "hidden",             "finalizeblock",          finalizeblock,          {"blockhash"} },
    { "hidden",             "invalidateblock",        invalidateblock,        {"blockhash"} },
    { "hidden",             "parkblock",              parkblock,              {"blockhash"} },
    { "hidden",             "reconsiderblock",        reconsiderblock,        {"blockhash"} },
    { "hidden",             "unparkblock",            unparkblock,            {"blockhash"} },
    { "hidden",             "waitfornewblock",        waitfornewblock,        {"timeout"} },
    { "hidden",             "waitforblock",           waitforblock,           {"blockhash","timeout"} },
    { "hidden",             "waitforblockheight",     waitforblockheight,     {"height","timeout"} },
};
// clang-format on

void RegisterBlockchainRPCCommands(CRPCTable &t) {
    for (unsigned int vcidx = 0; vcidx < ARRAYLEN(commands); vcidx++) {
        t.appendCommand(commands[vcidx].name, &commands[vcidx]);
    }
}
