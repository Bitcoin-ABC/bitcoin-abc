// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "chain.h"
#include "chainparams.h"
#include "config.h"
#include "core_io.h"
#include "httpserver.h"
#include "primitives/block.h"
#include "primitives/transaction.h"
#include "rpc/blockchain.h"
#include "rpc/server.h"
#include "rpc/tojson.h"
#include "streams.h"
#include "sync.h"
#include "txmempool.h"
#include "utilstrencodings.h"
#include "validation.h"
#include "version.h"

#include <boost/algorithm/string.hpp>

#include <univalue.h>

// Allow a max of 15 outpoints to be queried at once.
static const size_t MAX_GETUTXOS_OUTPOINTS = 15;

enum class RetFormat {
    UNDEF,
    BINARY,
    HEX,
    JSON,
};

static const struct {
    enum RetFormat rf;
    const char *name;
} rf_names[] = {
    {RetFormat::UNDEF, ""},
    {RetFormat::BINARY, "bin"},
    {RetFormat::HEX, "hex"},
    {RetFormat::JSON, "json"},
};

struct CCoin {
    uint32_t nHeight;
    CTxOut out;

    CCoin() : nHeight(0) {}
    explicit CCoin(Coin in)
        : nHeight(in.GetHeight()), out(std::move(in.GetTxOut())) {}

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        uint32_t nTxVerDummy = 0;
        READWRITE(nTxVerDummy);
        READWRITE(nHeight);
        READWRITE(out);
    }
};

extern UniValue mempoolInfoToJSON();
extern UniValue mempoolToJSON(bool fVerbose = false);

static bool RESTERR(HTTPRequest *req, enum HTTPStatusCode status,
                    std::string message) {
    req->WriteHeader("Content-Type", "text/plain");
    req->WriteReply(status, message + "\r\n");
    return false;
}

static enum RetFormat ParseDataFormat(std::string &param,
                                      const std::string &strReq) {
    const std::string::size_type pos = strReq.rfind('.');
    if (pos == std::string::npos) {
        param = strReq;
        return rf_names[0].rf;
    }

    param = strReq.substr(0, pos);
    const std::string suff(strReq, pos + 1);

    for (size_t i = 0; i < ARRAYLEN(rf_names); i++) {
        if (suff == rf_names[i].name) {
            return rf_names[i].rf;
        }
    }

    /* If no suffix is found, return original string.  */
    param = strReq;
    return rf_names[0].rf;
}

static std::string AvailableDataFormatsString() {
    std::string formats = "";
    for (size_t i = 0; i < ARRAYLEN(rf_names); i++) {
        if (strlen(rf_names[i].name) > 0) {
            formats.append(".");
            formats.append(rf_names[i].name);
            formats.append(", ");
        }
    }

    if (formats.length() > 0) {
        return formats.substr(0, formats.length() - 2);
    }

    return formats;
}

static bool ParseHashStr(const std::string &strReq, uint256 &v) {
    if (!IsHex(strReq) || (strReq.size() != 64)) {
        return false;
    }

    v.SetHex(strReq);
    return true;
}

static bool CheckWarmup(HTTPRequest *req) {
    std::string statusmessage;
    if (RPCIsInWarmup(&statusmessage)) {
        return RESTERR(req, HTTP_SERVICE_UNAVAILABLE,
                       "Service temporarily unavailable: " + statusmessage);
    }

    return true;
}

static bool rest_headers(Config &config, HTTPRequest *req,
                         const std::string &strURIPart) {
    if (!CheckWarmup(req)) {
        return false;
    }

    std::string param;
    const RetFormat rf = ParseDataFormat(param, strURIPart);
    std::vector<std::string> path;
    boost::split(path, param, boost::is_any_of("/"));

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

    std::string hashStr = path[1];
    uint256 hash;
    if (!ParseHashStr(hashStr, hash)) {
        return RESTERR(req, HTTP_BAD_REQUEST, "Invalid hash: " + hashStr);
    }

    std::vector<const CBlockIndex *> headers;
    headers.reserve(count);
    {
        LOCK(cs_main);
        BlockMap::const_iterator it = mapBlockIndex.find(hash);
        const CBlockIndex *pindex =
            (it != mapBlockIndex.end()) ? it->second : nullptr;
        while (pindex != nullptr && chainActive.Contains(pindex)) {
            headers.push_back(pindex);
            if (headers.size() == size_t(count)) {
                break;
            }
            pindex = chainActive.Next(pindex);
        }
    }

    CDataStream ssHeader(SER_NETWORK, PROTOCOL_VERSION);
    for (const CBlockIndex *pindex : headers) {
        ssHeader << pindex->GetBlockHeader();
    }

    switch (rf) {
        case RetFormat::BINARY: {
            std::string binaryHeader = ssHeader.str();
            req->WriteHeader("Content-Type", "application/octet-stream");
            req->WriteReply(HTTP_OK, binaryHeader);
            return true;
        }

        case RetFormat::HEX: {
            std::string strHex =
                HexStr(ssHeader.begin(), ssHeader.end()) + "\n";
            req->WriteHeader("Content-Type", "text/plain");
            req->WriteReply(HTTP_OK, strHex);
            return true;
        }
        case RetFormat::JSON: {
            UniValue jsonHeaders(UniValue::VARR);
            {
                LOCK(cs_main);
                for (const CBlockIndex *pindex : headers) {
                    jsonHeaders.push_back(blockheaderToJSON(pindex));
                }
            }
            std::string strJSON = jsonHeaders.write() + "\n";
            req->WriteHeader("Content-Type", "application/json");
            req->WriteReply(HTTP_OK, strJSON);
            return true;
        }
        default: {
            return RESTERR(req, HTTP_NOT_FOUND,
                           "output format not found (available: .bin, .hex)");
        }
    }

    // not reached
    // continue to process further HTTP reqs on this cxn
    return true;
}

static bool rest_block(const Config &config, HTTPRequest *req,
                       const std::string &strURIPart, bool showTxDetails) {
    if (!CheckWarmup(req)) {
        return false;
    }

    std::string hashStr;
    const RetFormat rf = ParseDataFormat(hashStr, strURIPart);

    uint256 hash;
    if (!ParseHashStr(hashStr, hash)) {
        return RESTERR(req, HTTP_BAD_REQUEST, "Invalid hash: " + hashStr);
    }

    CBlock block;
    CBlockIndex *pblockindex = nullptr;
    {
        LOCK(cs_main);
        if (mapBlockIndex.count(hash) == 0) {
            return RESTERR(req, HTTP_NOT_FOUND, hashStr + " not found");
        }

        pblockindex = mapBlockIndex[hash];
        if (fHavePruned && !pblockindex->nStatus.hasData() &&
            pblockindex->nTx > 0) {
            return RESTERR(req, HTTP_NOT_FOUND,
                           hashStr + " not available (pruned data)");
        }

        if (!ReadBlockFromDisk(block, pblockindex, config)) {
            return RESTERR(req, HTTP_NOT_FOUND, hashStr + " not found");
        }
    }

    CDataStream ssBlock(SER_NETWORK,
                        PROTOCOL_VERSION | RPCSerializationFlags());
    ssBlock << block;

    switch (rf) {
        case RetFormat::BINARY: {
            std::string binaryBlock = ssBlock.str();
            req->WriteHeader("Content-Type", "application/octet-stream");
            req->WriteReply(HTTP_OK, binaryBlock);
            return true;
        }

        case RetFormat::HEX: {
            std::string strHex = HexStr(ssBlock.begin(), ssBlock.end()) + "\n";
            req->WriteHeader("Content-Type", "text/plain");
            req->WriteReply(HTTP_OK, strHex);
            return true;
        }

        case RetFormat::JSON: {
            UniValue objBlock;
            {
                LOCK(cs_main);
                objBlock =
                    blockToJSON(config, block, pblockindex, showTxDetails);
            }
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

    // not reached
    // continue to process further HTTP reqs on this cxn
    return true;
}

static bool rest_block_extended(Config &config, HTTPRequest *req,
                                const std::string &strURIPart) {
    return rest_block(config, req, strURIPart, true);
}

static bool rest_block_notxdetails(Config &config, HTTPRequest *req,
                                   const std::string &strURIPart) {
    return rest_block(config, req, strURIPart, false);
}

static bool rest_chaininfo(Config &config, HTTPRequest *req,
                           const std::string &strURIPart) {
    if (!CheckWarmup(req)) {
        return false;
    }

    std::string param;
    const RetFormat rf = ParseDataFormat(param, strURIPart);

    switch (rf) {
        case RetFormat::JSON: {
            JSONRPCRequest jsonRequest;
            jsonRequest.params = UniValue(UniValue::VARR);
            UniValue chainInfoObject = getblockchaininfo(config, jsonRequest);
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

    // not reached
    // continue to process further HTTP reqs on this cxn
    return true;
}

static bool rest_mempool_info(Config &config, HTTPRequest *req,
                              const std::string &strURIPart) {
    if (!CheckWarmup(req)) {
        return false;
    }

    std::string param;
    const RetFormat rf = ParseDataFormat(param, strURIPart);

    switch (rf) {
        case RetFormat::JSON: {
            UniValue mempoolInfoObject = mempoolInfoToJSON();

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

    // not reached
    // continue to process further HTTP reqs on this cxn
    return true;
}

static bool rest_mempool_contents(Config &config, HTTPRequest *req,
                                  const std::string &strURIPart) {
    if (!CheckWarmup(req)) {
        return false;
    }

    std::string param;
    const RetFormat rf = ParseDataFormat(param, strURIPart);

    switch (rf) {
        case RetFormat::JSON: {
            UniValue mempoolObject = mempoolToJSON(true);

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

    // not reached
    // continue to process further HTTP reqs on this cxn
    return true;
}

static bool rest_tx(Config &config, HTTPRequest *req,
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

    CTransactionRef tx;
    uint256 hashBlock = uint256();
    if (!GetTransaction(config, txid, tx, hashBlock, true)) {
        return RESTERR(req, HTTP_NOT_FOUND, hashStr + " not found");
    }

    CDataStream ssTx(SER_NETWORK, PROTOCOL_VERSION | RPCSerializationFlags());
    ssTx << tx;

    switch (rf) {
        case RetFormat::BINARY: {
            std::string binaryTx = ssTx.str();
            req->WriteHeader("Content-Type", "application/octet-stream");
            req->WriteReply(HTTP_OK, binaryTx);
            return true;
        }

        case RetFormat::HEX: {
            std::string strHex = HexStr(ssTx.begin(), ssTx.end()) + "\n";
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

    // not reached
    // continue to process further HTTP reqs on this cxn
    return true;
}

static bool rest_getutxos(Config &config, HTTPRequest *req,
                          const std::string &strURIPart) {
    if (!CheckWarmup(req)) {
        return false;
    }

    std::string param;
    const RetFormat rf = ParseDataFormat(param, strURIPart);

    std::vector<std::string> uriParts;
    if (param.length() > 1) {
        std::string strUriParams = param.substr(1);
        boost::split(uriParts, strUriParams, boost::is_any_of("/"));
    }

    // throw exception in case of a empty request
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
            uint256 txid;
            int32_t nOutput;
            std::string strTxid = uriParts[i].substr(0, uriParts[i].find("-"));
            std::string strOutput =
                uriParts[i].substr(uriParts[i].find("-") + 1);

            if (!ParseInt32(strOutput, &nOutput) || !IsHex(strTxid)) {
                return RESTERR(req, HTTP_BAD_REQUEST, "Parse error");
            }

            txid.SetHex(strTxid);
            vOutPoints.push_back(COutPoint(txid, (uint32_t)nOutput));
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

                    CDataStream oss(SER_NETWORK, PROTOCOL_VERSION);
                    oss << strRequestMutable;
                    oss >> fCheckMemPool;
                    oss >> vOutPoints;
                }
            } catch (const std::ios_base::failure &e) {
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
    {
        LOCK2(cs_main, g_mempool.cs);

        CCoinsView viewDummy;
        CCoinsViewCache view(&viewDummy);

        CCoinsViewCache &viewChain = *pcoinsTip;
        CCoinsViewMemPool viewMempool(&viewChain, g_mempool);

        if (fCheckMemPool) {
            // switch cache backend to db+mempool in case user likes to query
            // mempool.
            view.SetBackend(viewMempool);
        }

        for (size_t i = 0; i < vOutPoints.size(); i++) {
            Coin coin;
            bool hit = false;
            if (view.GetCoin(vOutPoints[i], coin) &&
                !g_mempool.isSpent(vOutPoints[i])) {
                hit = true;
                outs.emplace_back(std::move(coin));
            }

            hits.push_back(hit);
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
            CDataStream ssGetUTXOResponse(SER_NETWORK, PROTOCOL_VERSION);
            ssGetUTXOResponse << chainActive.Height()
                              << chainActive.Tip()->GetBlockHash() << bitmap
                              << outs;
            std::string ssGetUTXOResponseString = ssGetUTXOResponse.str();

            req->WriteHeader("Content-Type", "application/octet-stream");
            req->WriteReply(HTTP_OK, ssGetUTXOResponseString);
            return true;
        }

        case RetFormat::HEX: {
            CDataStream ssGetUTXOResponse(SER_NETWORK, PROTOCOL_VERSION);
            ssGetUTXOResponse << chainActive.Height()
                              << chainActive.Tip()->GetBlockHash() << bitmap
                              << outs;
            std::string strHex =
                HexStr(ssGetUTXOResponse.begin(), ssGetUTXOResponse.end()) +
                "\n";

            req->WriteHeader("Content-Type", "text/plain");
            req->WriteReply(HTTP_OK, strHex);
            return true;
        }

        case RetFormat::JSON: {
            UniValue objGetUTXOResponse(UniValue::VOBJ);

            // pack in some essentials
            // use more or less the same output as mentioned in Bip64
            objGetUTXOResponse.pushKV("chainHeight", chainActive.Height());
            objGetUTXOResponse.pushKV(
                "chaintipHash", chainActive.Tip()->GetBlockHash().GetHex());
            objGetUTXOResponse.pushKV("bitmap", bitmapStringRepresentation);

            UniValue utxos(UniValue::VARR);
            for (const CCoin &coin : outs) {
                UniValue utxo(UniValue::VOBJ);
                utxo.pushKV("height", int32_t(coin.nHeight));
                utxo.pushKV("value", ValueFromAmount(coin.out.nValue));

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

    // not reached
    // continue to process further HTTP reqs on this cxn
    return true;
}

static const struct {
    const char *prefix;
    bool (*handler)(Config &config, HTTPRequest *req,
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
};

bool StartREST() {
    for (size_t i = 0; i < ARRAYLEN(uri_prefixes); i++) {
        RegisterHTTPHandler(uri_prefixes[i].prefix, false,
                            uri_prefixes[i].handler);
    }

    return true;
}

void InterruptREST() {}

void StopREST() {
    for (size_t i = 0; i < ARRAYLEN(uri_prefixes); i++) {
        UnregisterHTTPHandler(uri_prefixes[i].prefix, false);
    }
}
