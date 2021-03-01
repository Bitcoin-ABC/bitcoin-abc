// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chain.h>
#include <chainparams.h>
#include <config.h>
#include <core_io.h>
#include <httpserver.h>
#include <index/txindex.h>
#include <node/blockstorage.h>
#include <node/context.h>
#include <primitives/block.h>
#include <primitives/transaction.h>
#include <rpc/blockchain.h>
#include <rpc/mempool.h>
#include <rpc/protocol.h>
#include <rpc/server.h>
#include <rpc/server_util.h>
#include <streams.h>
#include <sync.h>
#include <txmempool.h>
#include <util/any.h>
#include <validation.h>
#include <version.h>

#include <univalue.h>

#include <any>

using node::GetTransaction;
using node::NodeContext;

// Allow a max of 15 outpoints to be queried at once.
static const size_t MAX_GETUTXOS_OUTPOINTS = 15;

enum class RetFormat {
    UNDEF,
    BINARY,
    HEX,
    JSON,
};

static const struct {
    RetFormat rf;
    const char *name;
} rf_names[] = {
    {RetFormat::UNDEF, ""},
    {RetFormat::BINARY, "bin"},
    {RetFormat::HEX, "hex"},
    {RetFormat::JSON, "json"},
};

struct CCoin {
    uint32_t nHeight{0};
    CTxOut out;

    CCoin() = default;
    explicit CCoin(Coin in)
        : nHeight(in.GetHeight()), out(std::move(in.GetTxOut())) {}

    SERIALIZE_METHODS(CCoin, obj) {
        uint32_t nTxVerDummy = 0;
        READWRITE(nTxVerDummy, obj.nHeight, obj.out);
    }
};

static bool RESTERR(HTTPRequest *req, enum HTTPStatusCode status,
                    std::string message) {
    req->WriteHeader("Content-Type", "text/plain");
    req->WriteReply(status, message + "\r\n");
    return false;
}

/**
 * Get the node context.
 *
 * @param[in]  req  The HTTP request, whose status code will be set if node
 *                  context is not found.
 * @returns         Pointer to the node context or nullptr if not found.
 */
static NodeContext *GetNodeContext(const std::any &context, HTTPRequest *req) {
    auto node_context = util::AnyPtr<NodeContext>(context);
    if (!node_context) {
        RESTERR(req, HTTP_INTERNAL_SERVER_ERROR,
                strprintf("%s:%d (%s)\n"
                          "Internal bug detected: Node context not found!\n"
                          "You may report this issue here: %s\n",
                          __FILE__, __LINE__, __func__, PACKAGE_BUGREPORT));
        return nullptr;
    }
    return node_context;
}

/**
 * Get the node context mempool.
 *
 * @param[in]  req The HTTP request, whose status code will be set if node
 *                 context mempool is not found.
 * @returns        Pointer to the mempool or nullptr if no mempool found.
 */
static CTxMemPool *GetMemPool(const std::any &context, HTTPRequest *req) {
    auto node_context = util::AnyPtr<NodeContext>(context);
    if (!node_context || !node_context->mempool) {
        RESTERR(req, HTTP_NOT_FOUND, "Mempool disabled or instance not found");
        return nullptr;
    }
    return node_context->mempool.get();
}

/**
 * Get the node context chainstatemanager.
 *
 * @param[in]  req The HTTP request, whose status code will be set if node
 *                 context chainstatemanager is not found.
 * @returns        Pointer to the chainstatemanager or nullptr if none found.
 */
static ChainstateManager *GetChainman(const std::any &context,
                                      HTTPRequest *req) {
    auto node_context = util::AnyPtr<NodeContext>(context);
    if (!node_context || !node_context->chainman) {
        RESTERR(req, HTTP_INTERNAL_SERVER_ERROR,
                strprintf("%s:%d (%s)\n"
                          "Internal bug detected: Chainman disabled or instance"
                          " not found!\n"
                          "You may report this issue here: %s\n",
                          __FILE__, __LINE__, __func__, PACKAGE_BUGREPORT));
        return nullptr;
    }
    return node_context->chainman.get();
}

static RetFormat ParseDataFormat(std::string &param,
                                 const std::string &strReq) {
    const std::string::size_type pos = strReq.rfind('.');
    if (pos == std::string::npos) {
        param = strReq;
        return rf_names[0].rf;
    }

    param = strReq.substr(0, pos);
    const std::string suff(strReq, pos + 1);

    for (const auto &rf_name : rf_names) {
        if (suff == rf_name.name) {
            return rf_name.rf;
        }
    }

    /* If no suffix is found, return original string.  */
    param = strReq;
    return rf_names[0].rf;
}

static std::string AvailableDataFormatsString() {
    std::string formats;
    for (const auto &rf_name : rf_names) {
        if (strlen(rf_name.name) > 0) {
            formats.append(".");
            formats.append(rf_name.name);
            formats.append(", ");
        }
    }

    if (formats.length() > 0) {
        return formats.substr(0, formats.length() - 2);
    }

    return formats;
}

static bool CheckWarmup(HTTPRequest *req) {
    std::string statusmessage;
    if (RPCIsInWarmup(&statusmessage)) {
        return RESTERR(req, HTTP_SERVICE_UNAVAILABLE,
                       "Service temporarily unavailable: " + statusmessage);
    }

    return true;
}

static bool rest_headers(Config &config, const std::any &context,
                         HTTPRequest *req, const std::string &strURIPart) {
    if (!CheckWarmup(req)) {
        return false;
    }

    std::string param;
    const RetFormat rf = ParseDataFormat(param, strURIPart);
    std::vector<std::string> path = SplitString(param, '/');

    if (path.size() != 2) {
        return RESTERR(req, HTTP_BAD_REQUEST,
                       "No header count specified. Use "
                       "/rest/headers/<count>/<hash>.<ext>.");
    }

    long count = strtol(path[0].c_str(), nullptr, 10);
    if (count < 1 || count > 2000) {
        return RESTERR(req, HTTP_BAD_REQUEST,
                       "Header count out of range: " + path[0]);
    }

    const std::string &hashStr = path[1];
    uint256 rawHash;
    if (!ParseHashStr(hashStr, rawHash)) {
        return RESTERR(req, HTTP_BAD_REQUEST, "Invalid hash: " + hashStr);
    }

    const BlockHash hash(rawHash);

    const CBlockIndex *tip = nullptr;
    std::vector<const CBlockIndex *> headers;
    headers.reserve(count);
    {
        ChainstateManager *maybe_chainman = GetChainman(context, req);
        if (!maybe_chainman) {
            return false;
        }
        ChainstateManager &chainman = *maybe_chainman;
        LOCK(cs_main);
        CChain &active_chain = chainman.ActiveChain();
        tip = active_chain.Tip();
        const CBlockIndex *pindex = chainman.m_blockman.LookupBlockIndex(hash);
        while (pindex != nullptr && active_chain.Contains(pindex)) {
            headers.push_back(pindex);
            if (headers.size() == size_t(count)) {
                break;
            }
            pindex = active_chain.Next(pindex);
        }
    }

    switch (rf) {
        case RetFormat::BINARY: {
            DataStream ssHeader{};
            for (const CBlockIndex *pindex : headers) {
                ssHeader << pindex->GetBlockHeader();
            }

            std::string binaryHeader = ssHeader.str();
            req->WriteHeader("Content-Type", "application/octet-stream");
            req->WriteReply(HTTP_OK, binaryHeader);
            return true;
        }

        case RetFormat::HEX: {
            DataStream ssHeader{};
            for (const CBlockIndex *pindex : headers) {
                ssHeader << pindex->GetBlockHeader();
            }

            std::string strHex = HexStr(ssHeader) + "\n";
            req->WriteHeader("Content-Type", "text/plain");
            req->WriteReply(HTTP_OK, strHex);
            return true;
        }
        case RetFormat::JSON: {
            UniValue jsonHeaders(UniValue::VARR);
            for (const CBlockIndex *pindex : headers) {
                jsonHeaders.push_back(blockheaderToJSON(*tip, *pindex));
            }
            std::string strJSON = jsonHeaders.write() + "\n";
            req->WriteHeader("Content-Type", "application/json");
            req->WriteReply(HTTP_OK, strJSON);
            return true;
        }
        default: {
            return RESTERR(
                req, HTTP_NOT_FOUND,
                "output format not found (available: .bin, .hex, .json)");
        }
    }
}

static bool rest_block(const Config &config, const std::any &context,
                       HTTPRequest *req, const std::string &strURIPart,
                       TxVerbosity tx_verbosity) {
    if (!CheckWarmup(req)) {
        return false;
    }

    std::string hashStr;
    const RetFormat rf = ParseDataFormat(hashStr, strURIPart);

    uint256 rawHash;
    if (!ParseHashStr(hashStr, rawHash)) {
        return RESTERR(req, HTTP_BAD_REQUEST, "Invalid hash: " + hashStr);
    }

    const BlockHash hash(rawHash);

    CBlock block;
    const CBlockIndex *pblockindex = nullptr;
    const CBlockIndex *tip = nullptr;
    ChainstateManager *maybe_chainman = GetChainman(context, req);
    if (!maybe_chainman) {
        return false;
    }
    ChainstateManager &chainman = *maybe_chainman;
    {
        LOCK(cs_main);
        tip = chainman.ActiveTip();
        pblockindex = chainman.m_blockman.LookupBlockIndex(hash);
        if (!pblockindex) {
            return RESTERR(req, HTTP_NOT_FOUND, hashStr + " not found");
        }
        if (chainman.m_blockman.IsBlockPruned(*pblockindex)) {
            return RESTERR(req, HTTP_NOT_FOUND,
                           hashStr + " not available (pruned data)");
        }
    }
    if (!chainman.m_blockman.ReadBlockFromDisk(block, *pblockindex)) {
        return RESTERR(req, HTTP_NOT_FOUND, hashStr + " not found");
    }

    switch (rf) {
        case RetFormat::BINARY: {
            DataStream ssBlock{};
            ssBlock << block;
            std::string binaryBlock = ssBlock.str();
            req->WriteHeader("Content-Type", "application/octet-stream");
            req->WriteReply(HTTP_OK, binaryBlock);
            return true;
        }

        case RetFormat::HEX: {
            DataStream ssBlock{};
            ssBlock << block;
            std::string strHex = HexStr(ssBlock) + "\n";
            req->WriteHeader("Content-Type", "text/plain");
            req->WriteReply(HTTP_OK, strHex);
            return true;
        }

        case RetFormat::JSON: {
            UniValue objBlock = blockToJSON(chainman.m_blockman, block, *tip,
                                            *pblockindex, tx_verbosity);
            std::string strJSON = objBlock.write() + "\n";
            req->WriteHeader("Content-Type", "application/json");
            req->WriteReply(HTTP_OK, strJSON);
            return true;
        }

        default: {
            return RESTERR(req, HTTP_NOT_FOUND,
                           "output format not found (available: " +
                               AvailableDataFormatsString() + ")");
        }
    }
}

static bool rest_block_extended(Config &config, const std::any &context,
                                HTTPRequest *req,
                                const std::string &strURIPart) {
    return rest_block(config, context, req, strURIPart,
                      TxVerbosity::SHOW_DETAILS_AND_PREVOUT);
}

static bool rest_block_notxdetails(Config &config, const std::any &context,
                                   HTTPRequest *req,
                                   const std::string &strURIPart) {
    return rest_block(config, context, req, strURIPart, TxVerbosity::SHOW_TXID);
}

static bool rest_chaininfo(Config &config, const std::any &context,
                           HTTPRequest *req, const std::string &strURIPart) {
    if (!CheckWarmup(req)) {
        return false;
    }

    std::string param;
    const RetFormat rf = ParseDataFormat(param, strURIPart);

    switch (rf) {
        case RetFormat::JSON: {
            JSONRPCRequest jsonRequest;
            jsonRequest.context = context;
            jsonRequest.params = UniValue(UniValue::VARR);
            UniValue chainInfoObject =
                getblockchaininfo().HandleRequest(config, jsonRequest);
            std::string strJSON = chainInfoObject.write() + "\n";
            req->WriteHeader("Content-Type", "application/json");
            req->WriteReply(HTTP_OK, strJSON);
            return true;
        }
        default: {
            return RESTERR(req, HTTP_NOT_FOUND,
                           "output format not found (available: json)");
        }
    }
}

static bool rest_mempool_info(Config &config, const std::any &context,
                              HTTPRequest *req, const std::string &strURIPart) {
    if (!CheckWarmup(req)) {
        return false;
    }

    const CTxMemPool *mempool = GetMemPool(context, req);
    if (!mempool) {
        return false;
    }

    std::string param;
    const RetFormat rf = ParseDataFormat(param, strURIPart);

    switch (rf) {
        case RetFormat::JSON: {
            UniValue mempoolInfoObject = MempoolInfoToJSON(*mempool);

            std::string strJSON = mempoolInfoObject.write() + "\n";
            req->WriteHeader("Content-Type", "application/json");
            req->WriteReply(HTTP_OK, strJSON);
            return true;
        }
        default: {
            return RESTERR(req, HTTP_NOT_FOUND,
                           "output format not found (available: json)");
        }
    }
}

static bool rest_mempool_contents(Config &config, const std::any &context,
                                  HTTPRequest *req,
                                  const std::string &strURIPart) {
    if (!CheckWarmup(req)) {
        return false;
    }

    const CTxMemPool *mempool = GetMemPool(context, req);
    if (!mempool) {
        return false;
    }

    std::string param;
    const RetFormat rf = ParseDataFormat(param, strURIPart);

    switch (rf) {
        case RetFormat::JSON: {
            UniValue mempoolObject = MempoolToJSON(*mempool, true);

            std::string strJSON = mempoolObject.write() + "\n";
            req->WriteHeader("Content-Type", "application/json");
            req->WriteReply(HTTP_OK, strJSON);
            return true;
        }
        default: {
            return RESTERR(req, HTTP_NOT_FOUND,
                           "output format not found (available: json)");
        }
    }
}

static bool rest_tx(Config &config, const std::any &context, HTTPRequest *req,
                    const std::string &strURIPart) {
    if (!CheckWarmup(req)) {
        return false;
    }

    std::string hashStr;
    const RetFormat rf = ParseDataFormat(hashStr, strURIPart);

    uint256 hash;
    if (!ParseHashStr(hashStr, hash)) {
        return RESTERR(req, HTTP_BAD_REQUEST, "Invalid hash: " + hashStr);
    }

    const TxId txid(hash);

    if (g_txindex) {
        g_txindex->BlockUntilSyncedToCurrentChain();
    }

    const NodeContext *const node = GetNodeContext(context, req);
    if (!node) {
        return false;
    }
    BlockHash hashBlock;
    const CTransactionRef tx =
        GetTransaction(/* block_index */ nullptr, node->mempool.get(), txid,
                       hashBlock, node->chainman->m_blockman);
    if (!tx) {
        return RESTERR(req, HTTP_NOT_FOUND, hashStr + " not found");
    }

    switch (rf) {
        case RetFormat::BINARY: {
            DataStream ssTx{};
            ssTx << tx;

            std::string binaryTx = ssTx.str();
            req->WriteHeader("Content-Type", "application/octet-stream");
            req->WriteReply(HTTP_OK, binaryTx);
            return true;
        }

        case RetFormat::HEX: {
            DataStream ssTx{};
            ssTx << tx;

            std::string strHex = HexStr(ssTx) + "\n";
            req->WriteHeader("Content-Type", "text/plain");
            req->WriteReply(HTTP_OK, strHex);
            return true;
        }

        case RetFormat::JSON: {
            UniValue objTx(UniValue::VOBJ);
            TxToUniv(*tx, hashBlock, objTx);
            std::string strJSON = objTx.write() + "\n";
            req->WriteHeader("Content-Type", "application/json");
            req->WriteReply(HTTP_OK, strJSON);
            return true;
        }

        default: {
            return RESTERR(req, HTTP_NOT_FOUND,
                           "output format not found (available: " +
                               AvailableDataFormatsString() + ")");
        }
    }
}

static bool rest_getutxos(Config &config, const std::any &context,
                          HTTPRequest *req, const std::string &strURIPart) {
    if (!CheckWarmup(req)) {
        return false;
    }

    std::string param;
    const RetFormat rf = ParseDataFormat(param, strURIPart);

    std::vector<std::string> uriParts;
    if (param.length() > 1) {
        std::string strUriParams = param.substr(1);
        uriParts = SplitString(strUriParams, '/');
    }

    // throw exception in case of an empty request
    std::string strRequestMutable = req->ReadBody();
    if (strRequestMutable.length() == 0 && uriParts.size() == 0) {
        return RESTERR(req, HTTP_BAD_REQUEST, "Error: empty request");
    }

    bool fInputParsed = false;
    bool fCheckMemPool = false;
    std::vector<COutPoint> vOutPoints;

    // parse/deserialize input
    // input-format = output-format, rest/getutxos/bin requires binary input,
    // gives binary output, ...

    if (uriParts.size() > 0) {
        // inputs is sent over URI scheme
        // (/rest/getutxos/checkmempool/txid1-n/txid2-n/...)
        if (uriParts[0] == "checkmempool") {
            fCheckMemPool = true;
        }

        for (size_t i = (fCheckMemPool) ? 1 : 0; i < uriParts.size(); i++) {
            int32_t nOutput;
            std::string strTxid = uriParts[i].substr(0, uriParts[i].find('-'));
            std::string strOutput =
                uriParts[i].substr(uriParts[i].find('-') + 1);

            if (!ParseInt32(strOutput, &nOutput) || !IsHex(strTxid)) {
                return RESTERR(req, HTTP_BAD_REQUEST, "Parse error");
            }

            TxId txid;
            txid.SetHex(strTxid);
            vOutPoints.push_back(COutPoint(txid, uint32_t(nOutput)));
        }

        if (vOutPoints.size() > 0) {
            fInputParsed = true;
        } else {
            return RESTERR(req, HTTP_BAD_REQUEST, "Error: empty request");
        }
    }

    switch (rf) {
        case RetFormat::HEX: {
            // convert hex to bin, continue then with bin part
            std::vector<uint8_t> strRequestV = ParseHex(strRequestMutable);
            strRequestMutable.assign(strRequestV.begin(), strRequestV.end());
        }
        // FALLTHROUGH
        case RetFormat::BINARY: {
            try {
                // deserialize only if user sent a request
                if (strRequestMutable.size() > 0) {
                    // don't allow sending input over URI and HTTP RAW DATA
                    if (fInputParsed) {
                        return RESTERR(req, HTTP_BAD_REQUEST,
                                       "Combination of URI scheme inputs and "
                                       "raw post data is not allowed");
                    }

                    DataStream oss{};
                    oss << strRequestMutable;
                    oss >> fCheckMemPool;
                    oss >> vOutPoints;
                }
            } catch (const std::ios_base::failure &) {
                // abort in case of unreadable binary data
                return RESTERR(req, HTTP_BAD_REQUEST, "Parse error");
            }
            break;
        }

        case RetFormat::JSON: {
            if (!fInputParsed) {
                return RESTERR(req, HTTP_BAD_REQUEST, "Error: empty request");
            }
            break;
        }
        default: {
            return RESTERR(req, HTTP_NOT_FOUND,
                           "output format not found (available: " +
                               AvailableDataFormatsString() + ")");
        }
    }

    // limit max outpoints
    if (vOutPoints.size() > MAX_GETUTXOS_OUTPOINTS) {
        return RESTERR(
            req, HTTP_BAD_REQUEST,
            strprintf("Error: max outpoints exceeded (max: %d, tried: %d)",
                      MAX_GETUTXOS_OUTPOINTS, vOutPoints.size()));
    }

    // check spentness and form a bitmap (as well as a JSON capable
    // human-readable string representation)
    std::vector<uint8_t> bitmap;
    std::vector<CCoin> outs;
    std::string bitmapStringRepresentation;
    std::vector<bool> hits;
    bitmap.resize((vOutPoints.size() + 7) / 8);
    ChainstateManager *maybe_chainman = GetChainman(context, req);
    if (!maybe_chainman) {
        return false;
    }
    ChainstateManager &chainman = *maybe_chainman;
    decltype(chainman.ActiveHeight()) active_height;
    BlockHash active_hash;
    {
        auto process_utxos =
            [&vOutPoints, &outs, &hits, &active_height, &active_hash,
             &chainman](const CCoinsView &view, const CTxMemPool *mempool)
                EXCLUSIVE_LOCKS_REQUIRED(chainman.GetMutex()) {
                    for (const COutPoint &vOutPoint : vOutPoints) {
                        Coin coin;
                        bool hit = (!mempool || !mempool->isSpent(vOutPoint)) &&
                                   view.GetCoin(vOutPoint, coin);
                        hits.push_back(hit);
                        if (hit) {
                            outs.emplace_back(std::move(coin));
                        }
                    }
                    active_height = chainman.ActiveHeight();
                    active_hash = chainman.ActiveTip()->GetBlockHash();
                };

        if (fCheckMemPool) {
            const CTxMemPool *mempool = GetMemPool(context, req);
            if (!mempool) {
                return false;
            }

            // use db+mempool as cache backend in case user likes to query
            // mempool
            LOCK2(cs_main, mempool->cs);
            CCoinsViewCache &viewChain = chainman.ActiveChainstate().CoinsTip();
            CCoinsViewMemPool viewMempool(&viewChain, *mempool);
            process_utxos(viewMempool, mempool);
        } else {
            // no need to lock mempool!
            LOCK(cs_main);
            process_utxos(chainman.ActiveChainstate().CoinsTip(), nullptr);
        }

        for (size_t i = 0; i < hits.size(); ++i) {
            const bool hit = hits[i];
            // form a binary string representation (human-readable for json
            // output)
            bitmapStringRepresentation.append(hit ? "1" : "0");
            bitmap[i / 8] |= ((uint8_t)hit) << (i % 8);
        }
    }

    switch (rf) {
        case RetFormat::BINARY: {
            // serialize data
            // use exact same output as mentioned in Bip64
            DataStream ssGetUTXOResponse{};
            ssGetUTXOResponse << active_height << active_hash << bitmap << outs;
            std::string ssGetUTXOResponseString = ssGetUTXOResponse.str();

            req->WriteHeader("Content-Type", "application/octet-stream");
            req->WriteReply(HTTP_OK, ssGetUTXOResponseString);
            return true;
        }

        case RetFormat::HEX: {
            DataStream ssGetUTXOResponse{};
            ssGetUTXOResponse << active_height << active_hash << bitmap << outs;
            std::string strHex = HexStr(ssGetUTXOResponse) + "\n";

            req->WriteHeader("Content-Type", "text/plain");
            req->WriteReply(HTTP_OK, strHex);
            return true;
        }

        case RetFormat::JSON: {
            UniValue objGetUTXOResponse(UniValue::VOBJ);

            // pack in some essentials
            // use more or less the same output as mentioned in Bip64
            objGetUTXOResponse.pushKV("chainHeight", active_height);
            objGetUTXOResponse.pushKV("chaintipHash", active_hash.GetHex());
            objGetUTXOResponse.pushKV("bitmap", bitmapStringRepresentation);

            UniValue utxos(UniValue::VARR);
            for (const CCoin &coin : outs) {
                UniValue utxo(UniValue::VOBJ);
                utxo.pushKV("height", int32_t(coin.nHeight));
                utxo.pushKV("value", coin.out.nValue);

                // include the script in a json output
                UniValue o(UniValue::VOBJ);
                ScriptPubKeyToUniv(coin.out.scriptPubKey, o, true);
                utxo.pushKV("scriptPubKey", o);
                utxos.push_back(utxo);
            }
            objGetUTXOResponse.pushKV("utxos", utxos);

            // return json string
            std::string strJSON = objGetUTXOResponse.write() + "\n";
            req->WriteHeader("Content-Type", "application/json");
            req->WriteReply(HTTP_OK, strJSON);
            return true;
        }
        default: {
            return RESTERR(req, HTTP_NOT_FOUND,
                           "output format not found (available: " +
                               AvailableDataFormatsString() + ")");
        }
    }
}

static bool rest_blockhash_by_height(Config &config, const std::any &context,
                                     HTTPRequest *req,
                                     const std::string &str_uri_part) {
    if (!CheckWarmup(req)) {
        return false;
    }
    std::string height_str;
    const RetFormat rf = ParseDataFormat(height_str, str_uri_part);

    int32_t blockheight;
    if (!ParseInt32(height_str, &blockheight) || blockheight < 0) {
        return RESTERR(req, HTTP_BAD_REQUEST,
                       "Invalid height: " + SanitizeString(height_str));
    }

    CBlockIndex *pblockindex = nullptr;
    {
        ChainstateManager *maybe_chainman = GetChainman(context, req);
        if (!maybe_chainman) {
            return false;
        }
        ChainstateManager &chainman = *maybe_chainman;
        LOCK(cs_main);
        const CChain &active_chain = chainman.ActiveChain();
        if (blockheight > active_chain.Height()) {
            return RESTERR(req, HTTP_NOT_FOUND, "Block height out of range");
        }
        pblockindex = active_chain[blockheight];
    }
    switch (rf) {
        case RetFormat::BINARY: {
            DataStream ss_blockhash{};
            ss_blockhash << pblockindex->GetBlockHash();
            req->WriteHeader("Content-Type", "application/octet-stream");
            req->WriteReply(HTTP_OK, ss_blockhash.str());
            return true;
        }
        case RetFormat::HEX: {
            req->WriteHeader("Content-Type", "text/plain");
            req->WriteReply(HTTP_OK,
                            pblockindex->GetBlockHash().GetHex() + "\n");
            return true;
        }
        case RetFormat::JSON: {
            req->WriteHeader("Content-Type", "application/json");
            UniValue resp = UniValue(UniValue::VOBJ);
            resp.pushKV("blockhash", pblockindex->GetBlockHash().GetHex());
            req->WriteReply(HTTP_OK, resp.write() + "\n");
            return true;
        }
        default: {
            return RESTERR(req, HTTP_NOT_FOUND,
                           "output format not found (available: " +
                               AvailableDataFormatsString() + ")");
        }
    }
}

static const struct {
    const char *prefix;
    bool (*handler)(Config &config, const std::any &context, HTTPRequest *req,
                    const std::string &strReq);
} uri_prefixes[] = {
    {"/rest/tx/", rest_tx},
    {"/rest/block/notxdetails/", rest_block_notxdetails},
    {"/rest/block/", rest_block_extended},
    {"/rest/chaininfo", rest_chaininfo},
    {"/rest/mempool/info", rest_mempool_info},
    {"/rest/mempool/contents", rest_mempool_contents},
    {"/rest/headers/", rest_headers},
    {"/rest/getutxos", rest_getutxos},
    {"/rest/blockhashbyheight/", rest_blockhash_by_height},
};

void StartREST(const std::any &context) {
    for (const auto &up : uri_prefixes) {
        auto handler = [context, up](Config &config, HTTPRequest *req,
                                     const std::string &prefix) {
            return up.handler(config, context, req, prefix);
        };
        RegisterHTTPHandler(up.prefix, false, handler);
    }
}

void InterruptREST() {}

void StopREST() {
    for (const auto &up : uri_prefixes) {
        UnregisterHTTPHandler(up.prefix, false);
    }
}
