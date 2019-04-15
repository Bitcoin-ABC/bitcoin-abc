// Copyright (c) 2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "rpc/mining.h"
#include "amount.h"
#include "blockvalidity.h"
#include "chain.h"
#include "chainparams.h"
#include "config.h"
#include "consensus/consensus.h"
#include "consensus/params.h"
#include "consensus/validation.h"
#include "core_io.h"
#include "dstencode.h"
#include "init.h"
#include "miner.h"
#include "net.h"
#include "policy/policy.h"
#include "pow.h"
#include "rpc/blockchain.h"
#include "rpc/server.h"
#include "txmempool.h"
#include "util.h"
#include "utilstrencodings.h"
#include "validation.h"
#include "validationinterface.h"
#include "warnings.h"

#include <univalue.h>

#include <cstdint>
#include <memory>

/**
 * Return average network hashes per second based on the last 'lookup' blocks,
 * or from the last difficulty change if 'lookup' is nonpositive. If 'height' is
 * nonnegative, compute the estimate at the time when a given block was found.
 */
static UniValue GetNetworkHashPS(int lookup, int height) {
    CBlockIndex *pb = chainActive.Tip();

    if (height >= 0 && height < chainActive.Height()) {
        pb = chainActive[height];
    }

    if (pb == nullptr || !pb->nHeight) {
        return 0;
    }

    // If lookup is -1, then use blocks since last difficulty change.
    if (lookup <= 0) {
        lookup = pb->nHeight %
                     Params().GetConsensus().DifficultyAdjustmentInterval() +
                 1;
    }

    // If lookup is larger than chain, then set it to chain length.
    if (lookup > pb->nHeight) {
        lookup = pb->nHeight;
    }

    CBlockIndex *pb0 = pb;
    int64_t minTime = pb0->GetBlockTime();
    int64_t maxTime = minTime;
    for (int i = 0; i < lookup; i++) {
        pb0 = pb0->pprev;
        int64_t time = pb0->GetBlockTime();
        minTime = std::min(time, minTime);
        maxTime = std::max(time, maxTime);
    }

    // In case there's a situation where minTime == maxTime, we don't want a
    // divide by zero exception.
    if (minTime == maxTime) {
        return 0;
    }

    arith_uint256 workDiff = pb->nChainWork - pb0->nChainWork;
    int64_t timeDiff = maxTime - minTime;

    return workDiff.getdouble() / timeDiff;
}

static UniValue getnetworkhashps(const Config &config,
                                 const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() > 2) {
        throw std::runtime_error(
            "getnetworkhashps ( nblocks height )\n"
            "\nReturns the estimated network hashes per second based on the "
            "last n blocks.\n"
            "Pass in [blocks] to override # of blocks, -1 specifies since last "
            "difficulty change.\n"
            "Pass in [height] to estimate the network speed at the time when a "
            "certain block was found.\n"
            "\nArguments:\n"
            "1. nblocks     (numeric, optional, default=120) The number of "
            "blocks, or -1 for blocks since last difficulty change.\n"
            "2. height      (numeric, optional, default=-1) To estimate at the "
            "time of the given height.\n"
            "\nResult:\n"
            "x             (numeric) Hashes per second estimated\n"
            "\nExamples:\n" +
            HelpExampleCli("getnetworkhashps", "") +
            HelpExampleRpc("getnetworkhashps", ""));
    }

    LOCK(cs_main);
    return GetNetworkHashPS(
        !request.params[0].isNull() ? request.params[0].get_int() : 120,
        !request.params[1].isNull() ? request.params[1].get_int() : -1);
}

UniValue generateBlocks(const Config &config,
                        std::shared_ptr<CReserveScript> coinbaseScript,
                        int nGenerate, uint64_t nMaxTries, bool keepScript) {
    static const int nInnerLoopCount = 0x100000;
    int nHeightStart = 0;
    int nHeightEnd = 0;
    int nHeight = 0;

    {
        // Don't keep cs_main locked.
        LOCK(cs_main);
        nHeightStart = chainActive.Height();
        nHeight = nHeightStart;
        nHeightEnd = nHeightStart + nGenerate;
    }

    unsigned int nExtraNonce = 0;
    UniValue blockHashes(UniValue::VARR);
    while (nHeight < nHeightEnd) {
        std::unique_ptr<CBlockTemplate> pblocktemplate(
            BlockAssembler(config, g_mempool)
                .CreateNewBlock(coinbaseScript->reserveScript));

        if (!pblocktemplate.get()) {
            throw JSONRPCError(RPC_INTERNAL_ERROR, "Couldn't create new block");
        }

        CBlock *pblock = &pblocktemplate->block;

        {
            LOCK(cs_main);
            IncrementExtraNonce(config, pblock, chainActive.Tip(), nExtraNonce);
        }

        while (nMaxTries > 0 && pblock->nNonce < nInnerLoopCount &&
               !CheckProofOfWork(pblock->GetHash(), pblock->nBits, config)) {
            ++pblock->nNonce;
            --nMaxTries;
        }

        if (nMaxTries == 0) {
            break;
        }

        if (pblock->nNonce == nInnerLoopCount) {
            continue;
        }

        std::shared_ptr<const CBlock> shared_pblock =
            std::make_shared<const CBlock>(*pblock);
        if (!ProcessNewBlock(config, shared_pblock, true, nullptr)) {
            throw JSONRPCError(RPC_INTERNAL_ERROR,
                               "ProcessNewBlock, block not accepted");
        }
        ++nHeight;
        blockHashes.push_back(pblock->GetHash().GetHex());

        // Mark script as important because it was used at least for one
        // coinbase output if the script came from the wallet.
        if (keepScript) {
            coinbaseScript->KeepScript();
        }
    }

    return blockHashes;
}

static UniValue generatetoaddress(const Config &config,
                                  const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() < 2 ||
        request.params.size() > 3) {
        throw std::runtime_error(
            "generatetoaddress nblocks address (maxtries)\n"
            "\nMine blocks immediately to a specified address (before the RPC "
            "call returns)\n"
            "\nArguments:\n"
            "1. nblocks      (numeric, required) How many blocks are generated "
            "immediately.\n"
            "2. address      (string, required) The address to send the newly "
            "generated bitcoin to.\n"
            "3. maxtries     (numeric, optional) How many iterations to try "
            "(default = 1000000).\n"
            "\nResult:\n"
            "[ blockhashes ]     (array) hashes of blocks generated\n"
            "\nExamples:\n"
            "\nGenerate 11 blocks to myaddress\n" +
            HelpExampleCli("generatetoaddress", "11 \"myaddress\""));
    }

    int nGenerate = request.params[0].get_int();
    uint64_t nMaxTries = 1000000;
    if (!request.params[2].isNull()) {
        nMaxTries = request.params[2].get_int();
    }

    CTxDestination destination =
        DecodeDestination(request.params[1].get_str(), config.GetChainParams());
    if (!IsValidDestination(destination)) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                           "Error: Invalid address");
    }

    std::shared_ptr<CReserveScript> coinbaseScript =
        std::make_shared<CReserveScript>();
    coinbaseScript->reserveScript = GetScriptForDestination(destination);

    return generateBlocks(config, coinbaseScript, nGenerate, nMaxTries, false);
}

static UniValue getmininginfo(const Config &config,
                              const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() != 0) {
        throw std::runtime_error(
            "getmininginfo\n"
            "\nReturns a json object containing mining-related information."
            "\nResult:\n"
            "{\n"
            "  \"blocks\": nnn,             (numeric) The current block\n"
            "  \"currentblocksize\": nnn,   (numeric) The last block size\n"
            "  \"currentblocktx\": nnn,     (numeric) The last block "
            "transaction\n"
            "  \"difficulty\": xxx.xxxxx    (numeric) The current difficulty\n"
            "  \"networkhashps\": nnn,      (numeric) The network hashes per "
            "second\n"
            "  \"pooledtx\": n              (numeric) The size of the mempool\n"
            "  \"chain\": \"xxxx\",           (string) current network name as "
            "defined in BIP70 (main, test, regtest)\n"
            "  \"warnings\": \"...\"          (string) any network and "
            "blockchain warnings\n"
            "  \"errors\": \"...\"            (string) DEPRECATED. Same as "
            "warnings. Only shown when bitcoind is started with "
            "-deprecatedrpc=getmininginfo\n"
            "}\n"
            "\nExamples:\n" +
            HelpExampleCli("getmininginfo", "") +
            HelpExampleRpc("getmininginfo", ""));
    }

    LOCK(cs_main);

    UniValue obj(UniValue::VOBJ);
    obj.pushKV("blocks", int(chainActive.Height()));
    obj.pushKV("currentblocksize", uint64_t(nLastBlockSize));
    obj.pushKV("currentblocktx", uint64_t(nLastBlockTx));
    obj.pushKV("difficulty", double(GetDifficulty(chainActive.Tip())));
    obj.pushKV("blockprioritypercentage",
               uint8_t(gArgs.GetArg("-blockprioritypercentage",
                                    DEFAULT_BLOCK_PRIORITY_PERCENTAGE)));
    obj.pushKV("networkhashps", getnetworkhashps(config, request));
    obj.pushKV("pooledtx", uint64_t(g_mempool.size()));
    obj.pushKV("chain", config.GetChainParams().NetworkIDString());
    if (IsDeprecatedRPCEnabled(gArgs, "getmininginfo")) {
        obj.pushKV("errors", GetWarnings("statusbar"));
    } else {
        obj.pushKV("warnings", GetWarnings("statusbar"));
    }
    return obj;
}

// NOTE: Unlike wallet RPC (which use BCH values), mining RPCs follow GBT (BIP
// 22) in using satoshi amounts
static UniValue prioritisetransaction(const Config &config,
                                      const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() != 3) {
        throw std::runtime_error(
            "prioritisetransaction <txid> <priority delta> <fee delta>\n"
            "Accepts the transaction into mined blocks at a higher (or lower) "
            "priority\n"
            "\nArguments:\n"
            "1. \"txid\"       (string, required) The transaction id.\n"
            "2. priority_delta (numeric, required) The priority to add or "
            "subtract.\n"
            "                  The transaction selection algorithm considers "
            "the tx as it would have a higher priority.\n"
            "                  (priority of a transaction is calculated: "
            "coinage * value_in_satoshis / txsize) \n"
            "3. fee_delta      (numeric, required) The fee value (in satoshis) "
            "to add (or subtract, if negative).\n"
            "                  The fee is not actually paid, only the "
            "algorithm for selecting transactions into a block\n"
            "                  considers the transaction as it would have paid "
            "a higher (or lower) fee.\n"
            "\nResult:\n"
            "true              (boolean) Returns true\n"
            "\nExamples:\n" +
            HelpExampleCli("prioritisetransaction", "\"txid\" 0.0 10000") +
            HelpExampleRpc("prioritisetransaction", "\"txid\", 0.0, 10000"));
    }

    LOCK(cs_main);

    uint256 hash = ParseHashStr(request.params[0].get_str(), "txid");
    Amount nAmount = request.params[2].get_int64() * SATOSHI;

    g_mempool.PrioritiseTransaction(hash, request.params[0].get_str(),
                                    request.params[1].get_real(), nAmount);
    return true;
}

// NOTE: Assumes a conclusive result; if result is inconclusive, it must be
// handled by caller
static UniValue BIP22ValidationResult(const Config &config,
                                      const CValidationState &state) {
    if (state.IsValid()) {
        return NullUniValue;
    }

    std::string strRejectReason = state.GetRejectReason();
    if (state.IsError()) {
        throw JSONRPCError(RPC_VERIFY_ERROR, strRejectReason);
    }

    if (state.IsInvalid()) {
        if (strRejectReason.empty()) {
            return "rejected";
        }
        return strRejectReason;
    }

    // Should be impossible.
    return "valid?";
}

static UniValue getblocktemplate(const Config &config,
                                 const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() > 1) {
        throw std::runtime_error(
            "getblocktemplate ( TemplateRequest )\n"
            "\nIf the request parameters include a 'mode' key, that is used to "
            "explicitly select between the default 'template' request or a "
            "'proposal'.\n"
            "It returns data needed to construct a block to work on.\n"
            "For full specification, see BIPs 22, 23, 9, and 145:\n"
            "    "
            "https://github.com/bitcoin/bips/blob/master/bip-0022.mediawiki\n"
            "    "
            "https://github.com/bitcoin/bips/blob/master/bip-0023.mediawiki\n"
            "    "
            "https://github.com/bitcoin/bips/blob/master/"
            "bip-0009.mediawiki#getblocktemplate_changes\n"
            "    "
            "https://github.com/bitcoin/bips/blob/master/bip-0145.mediawiki\n"

            "\nArguments:\n"
            "1. template_request         (json object, optional) A json object "
            "in the following spec\n"
            "     {\n"
            "       \"mode\":\"template\"    (string, optional) This must be "
            "set to \"template\", \"proposal\" (see BIP 23), or omitted\n"
            "       \"capabilities\":[     (array, optional) A list of "
            "strings\n"
            "           \"support\"          (string) client side supported "
            "feature, 'longpoll', 'coinbasetxn', 'coinbasevalue', 'proposal', "
            "'serverlist', 'workid'\n"
            "           ,...\n"
            "       ]\n"
            "     }\n"
            "\n"

            "\nResult:\n"
            "{\n"
            "  \"version\" : n,                    (numeric) The preferred "
            "block version\n"
            "  \"previousblockhash\" : \"xxxx\",     (string) The hash of "
            "current highest block\n"
            "  \"transactions\" : [                (array) contents of "
            "non-coinbase transactions that should be included in the next "
            "block\n"
            "      {\n"
            "         \"data\" : \"xxxx\",             (string) transaction "
            "data encoded in hexadecimal (byte-for-byte)\n"
            "         \"txid\" : \"xxxx\",             (string) transaction id "
            "encoded in little-endian hexadecimal\n"
            "         \"hash\" : \"xxxx\",             (string) hash encoded "
            "in little-endian hexadecimal (including witness data)\n"
            "         \"depends\" : [                (array) array of numbers "
            "\n"
            "             n                          (numeric) transactions "
            "before this one (by 1-based index in 'transactions' list) that "
            "must be present in the final block if this one is\n"
            "             ,...\n"
            "         ],\n"
            "         \"fee\": n,                    (numeric) difference in "
            "value between transaction inputs and outputs (in Satoshis); for "
            "coinbase transactions, this is a negative Number of the total "
            "collected block fees (ie, not including the block subsidy); if "
            "key is not present, fee is unknown and clients MUST NOT assume "
            "there isn't one\n"
            "         \"sigops\" : n,                (numeric) total SigOps "
            "cost, as counted for purposes of block limits; if key is not "
            "present, sigop cost is unknown and clients MUST NOT assume it is "
            "zero\n"
            "         \"required\" : true|false      (boolean) if provided and "
            "true, this transaction must be in the final block\n"
            "      }\n"
            "      ,...\n"
            "  ],\n"
            "  \"coinbaseaux\" : {                 (json object) data that "
            "should be included in the coinbase's scriptSig content\n"
            "      \"flags\" : \"xx\"                  (string) key name is to "
            "be ignored, and value included in scriptSig\n"
            "  },\n"
            "  \"coinbasevalue\" : n,              (numeric) maximum allowable "
            "input to coinbase transaction, including the generation award and "
            "transaction fees (in Satoshis)\n"
            "  \"coinbasetxn\" : { ... },          (json object) information "
            "for coinbase transaction\n"
            "  \"target\" : \"xxxx\",                (string) The hash target\n"
            "  \"mintime\" : xxx,                  (numeric) The minimum "
            "timestamp appropriate for next block time in seconds since epoch "
            "(Jan 1 1970 GMT)\n"
            "  \"mutable\" : [                     (array of string) list of "
            "ways the block template may be changed \n"
            "     \"value\"                          (string) A way the block "
            "template may be changed, e.g. 'time', 'transactions', "
            "'prevblock'\n"
            "     ,...\n"
            "  ],\n"
            "  \"noncerange\" : \"00000000ffffffff\",(string) A range of valid "
            "nonces\n"
            "  \"sigoplimit\" : n,                 (numeric) limit of sigops "
            "in blocks\n"
            "  \"sizelimit\" : n,                  (numeric) limit of block "
            "size\n"
            "  \"curtime\" : ttt,                  (numeric) current timestamp "
            "in seconds since epoch (Jan 1 1970 GMT)\n"
            "  \"bits\" : \"xxxxxxxx\",              (string) compressed "
            "target of next block\n"
            "  \"height\" : n                      (numeric) The height of the "
            "next block\n"
            "}\n"

            "\nExamples:\n" +
            HelpExampleCli("getblocktemplate", "") +
            HelpExampleRpc("getblocktemplate", ""));
    }

    LOCK(cs_main);

    std::string strMode = "template";
    UniValue lpval = NullUniValue;
    std::set<std::string> setClientRules;
    if (!request.params[0].isNull()) {
        const UniValue &oparam = request.params[0].get_obj();
        const UniValue &modeval = find_value(oparam, "mode");
        if (modeval.isStr()) {
            strMode = modeval.get_str();
        } else if (modeval.isNull()) {
            /* Do nothing */
        } else {
            throw JSONRPCError(RPC_INVALID_PARAMETER, "Invalid mode");
        }
        lpval = find_value(oparam, "longpollid");

        if (strMode == "proposal") {
            const UniValue &dataval = find_value(oparam, "data");
            if (!dataval.isStr()) {
                throw JSONRPCError(RPC_TYPE_ERROR,
                                   "Missing data String key for proposal");
            }

            CBlock block;
            if (!DecodeHexBlk(block, dataval.get_str())) {
                throw JSONRPCError(RPC_DESERIALIZATION_ERROR,
                                   "Block decode failed");
            }

            uint256 hash = block.GetHash();
            const CBlockIndex *pindex = LookupBlockIndex(hash);
            if (pindex) {
                if (pindex->IsValid(BlockValidity::SCRIPTS)) {
                    return "duplicate";
                }
                if (pindex->nStatus.isInvalid()) {
                    return "duplicate-invalid";
                }
                return "duplicate-inconclusive";
            }

            CBlockIndex *const pindexPrev = chainActive.Tip();
            // TestBlockValidity only supports blocks built on the current Tip
            if (block.hashPrevBlock != pindexPrev->GetBlockHash()) {
                return "inconclusive-not-best-prevblk";
            }
            CValidationState state;
            BlockValidationOptions validationOptions =
                BlockValidationOptions(false, true);
            TestBlockValidity(config, state, block, pindexPrev,
                              validationOptions);
            return BIP22ValidationResult(config, state);
        }
    }

    if (strMode != "template") {
        throw JSONRPCError(RPC_INVALID_PARAMETER, "Invalid mode");
    }

    if (!g_connman) {
        throw JSONRPCError(
            RPC_CLIENT_P2P_DISABLED,
            "Error: Peer-to-peer functionality missing or disabled");
    }

    if (g_connman->GetNodeCount(CConnman::CONNECTIONS_ALL) == 0) {
        throw JSONRPCError(RPC_CLIENT_NOT_CONNECTED,
                           "Bitcoin is not connected!");
    }

    if (IsInitialBlockDownload()) {
        throw JSONRPCError(RPC_CLIENT_IN_INITIAL_DOWNLOAD,
                           "Bitcoin is downloading blocks...");
    }

    static unsigned int nTransactionsUpdatedLast;

    if (!lpval.isNull()) {
        // Wait to respond until either the best block changes, OR a minute has
        // passed and there are more transactions
        uint256 hashWatchedChain;
        std::chrono::steady_clock::time_point checktxtime;
        unsigned int nTransactionsUpdatedLastLP;

        if (lpval.isStr()) {
            // Format: <hashBestChain><nTransactionsUpdatedLast>
            std::string lpstr = lpval.get_str();

            hashWatchedChain.SetHex(lpstr.substr(0, 64));
            nTransactionsUpdatedLastLP = atoi64(lpstr.substr(64));
        } else {
            // NOTE: Spec does not specify behaviour for non-string longpollid,
            // but this makes testing easier
            hashWatchedChain = chainActive.Tip()->GetBlockHash();
            nTransactionsUpdatedLastLP = nTransactionsUpdatedLast;
        }

        // Release the wallet and main lock while waiting
        LEAVE_CRITICAL_SECTION(cs_main);
        {
            checktxtime =
                std::chrono::steady_clock::now() + std::chrono::minutes(1);

            WAIT_LOCK(g_best_block_mutex, lock);
            while (g_best_block == hashWatchedChain && IsRPCRunning()) {
                if (g_best_block_cv.wait_until(lock, checktxtime) ==
                    std::cv_status::timeout) {
                    // Timeout: Check transactions for update
                    if (g_mempool.GetTransactionsUpdated() !=
                        nTransactionsUpdatedLastLP) {
                        break;
                    }
                    checktxtime += std::chrono::seconds(10);
                }
            }
        }
        ENTER_CRITICAL_SECTION(cs_main);

        if (!IsRPCRunning()) {
            throw JSONRPCError(RPC_CLIENT_NOT_CONNECTED, "Shutting down");
        }
        // TODO: Maybe recheck connections/IBD and (if something wrong) send an
        // expires-immediately template to stop miners?
    }

    // Update block
    static CBlockIndex *pindexPrev;
    static int64_t nStart;
    static std::unique_ptr<CBlockTemplate> pblocktemplate;
    if (pindexPrev != chainActive.Tip() ||
        (g_mempool.GetTransactionsUpdated() != nTransactionsUpdatedLast &&
         GetTime() - nStart > 5)) {
        // Clear pindexPrev so future calls make a new block, despite any
        // failures from here on
        pindexPrev = nullptr;

        // Store the pindexBest used before CreateNewBlock, to avoid races
        nTransactionsUpdatedLast = g_mempool.GetTransactionsUpdated();
        CBlockIndex *pindexPrevNew = chainActive.Tip();
        nStart = GetTime();

        // Create new block
        CScript scriptDummy = CScript() << OP_TRUE;
        pblocktemplate =
            BlockAssembler(config, g_mempool).CreateNewBlock(scriptDummy);
        if (!pblocktemplate) {
            throw JSONRPCError(RPC_OUT_OF_MEMORY, "Out of memory");
        }

        // Need to update only after we know CreateNewBlock succeeded
        pindexPrev = pindexPrevNew;
    }

    // pointer for convenience
    CBlock *pblock = &pblocktemplate->block;

    // Update nTime
    UpdateTime(pblock, config, pindexPrev);
    pblock->nNonce = 0;

    UniValue aCaps(UniValue::VARR);
    aCaps.push_back("proposal");

    UniValue transactions(UniValue::VARR);
    int index_in_template = 0;
    for (const auto &it : pblock->vtx) {
        const CTransaction &tx = *it;
        uint256 txId = tx.GetId();

        if (tx.IsCoinBase()) {
            index_in_template++;
            continue;
        }

        UniValue entry(UniValue::VOBJ);
        entry.pushKV("data", EncodeHexTx(tx));
        entry.pushKV("txid", txId.GetHex());
        entry.pushKV("hash", tx.GetHash().GetHex());
        entry.pushKV("fee",
                     pblocktemplate->entries[index_in_template].fees / SATOSHI);
        int64_t nTxSigOps =
            pblocktemplate->entries[index_in_template].sigOpCount;
        entry.pushKV("sigops", nTxSigOps);

        transactions.push_back(entry);
        index_in_template++;
    }

    UniValue aux(UniValue::VOBJ);
    aux.pushKV("flags", HexStr(COINBASE_FLAGS.begin(), COINBASE_FLAGS.end()));

    arith_uint256 hashTarget = arith_uint256().SetCompact(pblock->nBits);

    UniValue aMutable(UniValue::VARR);
    aMutable.push_back("time");
    aMutable.push_back("transactions");
    aMutable.push_back("prevblock");

    UniValue result(UniValue::VOBJ);
    result.pushKV("capabilities", aCaps);

    result.pushKV("version", pblock->nVersion);

    result.pushKV("previousblockhash", pblock->hashPrevBlock.GetHex());
    result.pushKV("transactions", transactions);
    result.pushKV("coinbaseaux", aux);
    result.pushKV("coinbasevalue",
                  int64_t(pblock->vtx[0]->vout[0].nValue / SATOSHI));
    result.pushKV("longpollid", chainActive.Tip()->GetBlockHash().GetHex() +
                                    i64tostr(nTransactionsUpdatedLast));
    result.pushKV("target", hashTarget.GetHex());
    result.pushKV("mintime", int64_t(pindexPrev->GetMedianTimePast()) + 1);
    result.pushKV("mutable", aMutable);
    result.pushKV("noncerange", "00000000ffffffff");
    // FIXME: Allow for mining block greater than 1M.
    result.pushKV("sigoplimit", GetMaxBlockSigOpsCount(DEFAULT_MAX_BLOCK_SIZE));
    result.pushKV("sizelimit", DEFAULT_MAX_BLOCK_SIZE);
    result.pushKV("curtime", pblock->GetBlockTime());
    result.pushKV("bits", strprintf("%08x", pblock->nBits));
    result.pushKV("height", int64_t(pindexPrev->nHeight) + 1);

    return result;
}

class submitblock_StateCatcher : public CValidationInterface {
public:
    uint256 hash;
    bool found;
    CValidationState state;

    explicit submitblock_StateCatcher(const uint256 &hashIn)
        : hash(hashIn), found(false), state() {}

protected:
    void BlockChecked(const CBlock &block,
                      const CValidationState &stateIn) override {
        if (block.GetHash() != hash) {
            return;
        }

        found = true;
        state = stateIn;
    }
};

static UniValue submitblock(const Config &config,
                            const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() < 1 ||
        request.params.size() > 2) {
        throw std::runtime_error(
            "submitblock \"hexdata\" ( \"jsonparametersobject\" )\n"
            "\nAttempts to submit new block to network.\n"
            "The 'jsonparametersobject' parameter is currently ignored.\n"
            "See https://en.bitcoin.it/wiki/BIP_0022 for full specification.\n"

            "\nArguments\n"
            "1. \"hexdata\"        (string, required) the hex-encoded block "
            "data to submit\n"
            "2. \"parameters\"     (string, optional) object of optional "
            "parameters\n"
            "    {\n"
            "      \"workid\" : \"id\"    (string, optional) if the server "
            "provided a workid, it MUST be included with submissions\n"
            "    }\n"
            "\nResult:\n"
            "\nExamples:\n" +
            HelpExampleCli("submitblock", "\"mydata\"") +
            HelpExampleRpc("submitblock", "\"mydata\""));
    }

    std::shared_ptr<CBlock> blockptr = std::make_shared<CBlock>();
    CBlock &block = *blockptr;
    if (!DecodeHexBlk(block, request.params[0].get_str())) {
        throw JSONRPCError(RPC_DESERIALIZATION_ERROR, "Block decode failed");
    }

    if (block.vtx.empty() || !block.vtx[0]->IsCoinBase()) {
        throw JSONRPCError(RPC_DESERIALIZATION_ERROR,
                           "Block does not start with a coinbase");
    }

    uint256 hash = block.GetHash();
    bool fBlockPresent = false;
    {
        LOCK(cs_main);
        const CBlockIndex *pindex = LookupBlockIndex(hash);
        if (pindex) {
            if (pindex->IsValid(BlockValidity::SCRIPTS)) {
                return "duplicate";
            }
            if (pindex->nStatus.isInvalid()) {
                return "duplicate-invalid";
            }
            // Otherwise, we might only have the header - process the block
            // before returning
            fBlockPresent = true;
        }
    }

    submitblock_StateCatcher sc(block.GetHash());
    RegisterValidationInterface(&sc);
    bool fAccepted = ProcessNewBlock(config, blockptr, true, nullptr);
    UnregisterValidationInterface(&sc);
    if (fBlockPresent) {
        if (fAccepted && !sc.found) {
            return "duplicate-inconclusive";
        }
        return "duplicate";
    }

    if (!sc.found) {
        return "inconclusive";
    }

    return BIP22ValidationResult(config, sc.state);
}

static UniValue estimatefee(const Config &config,
                            const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() > 1) {
        throw std::runtime_error(
            "estimatefee\n"
            "\nEstimates the approximate fee per kilobyte needed for a "
            "transaction\n"
            "\nResult:\n"
            "n              (numeric) estimated fee-per-kilobyte\n"
            "\nExample:\n" +
            HelpExampleCli("estimatefee", ""));
    }

    if ((request.params.size() == 1) &&
        !IsDeprecatedRPCEnabled(gArgs, "estimatefee")) {
        // FIXME: Remove this message in 0.20
        throw JSONRPCError(
            RPC_METHOD_DEPRECATED,
            "estimatefee with the nblocks argument is no longer supported\n"
            "Please call estimatefee with no arguments instead.\n"
            "\nExample:\n" +
                HelpExampleCli("estimatefee", ""));
    }

    return ValueFromAmount(g_mempool.estimateFee().GetFeePerK());
}

// clang-format off
static const ContextFreeRPCCommand commands[] = {
    //  category   name                     actor (function)       argNames
    //  ---------- ------------------------ ---------------------- ----------
    {"mining",     "getnetworkhashps",      getnetworkhashps,      {"nblocks", "height"}},
    {"mining",     "getmininginfo",         getmininginfo,         {}},
    {"mining",     "prioritisetransaction", prioritisetransaction, {"txid", "priority_delta", "fee_delta"}},
    {"mining",     "getblocktemplate",      getblocktemplate,      {"template_request"}},
    {"mining",     "submitblock",           submitblock,           {"hexdata", "parameters"}},

    {"generating", "generatetoaddress",     generatetoaddress,     {"nblocks", "address", "maxtries"}},

    {"util",       "estimatefee",           estimatefee,           {"nblocks"}},
};
// clang-format on

void RegisterMiningRPCCommands(CRPCTable &t) {
    for (unsigned int vcidx = 0; vcidx < ARRAYLEN(commands); vcidx++)
        t.appendCommand(commands[vcidx].name, &commands[vcidx]);
}
