// Copyright (c) 2010 Satoshi Nakamoto
// Copyright (c) 2009-2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <amount.h>
#include <blockvalidity.h>
#include <cashaddrenc.h>
#include <chain.h>
#include <chainparams.h>
#include <config.h>
#include <consensus/activation.h>
#include <consensus/consensus.h>
#include <consensus/params.h>
#include <consensus/validation.h>
#include <core_io.h>
#include <key_io.h>
#include <miner.h>
#include <minerfund.h>
#include <net.h>
#include <node/context.h>
#include <policy/policy.h>
#include <pow/pow.h>
#include <rpc/blockchain.h>
#include <rpc/server.h>
#include <rpc/util.h>
#include <script/script.h>
#include <shutdown.h>
#include <txmempool.h>
#include <univalue.h>
#include <util/strencodings.h>
#include <util/system.h>
#include <util/validation.h>
#include <validation.h>
#include <validationinterface.h>
#include <warnings.h>

#include <cstdint>

/**
 * Return average network hashes per second based on the last 'lookup' blocks,
 * or from the last difficulty change if 'lookup' is nonpositive. If 'height' is
 * nonnegative, compute the estimate at the time when a given block was found.
 */
static UniValue GetNetworkHashPS(int lookup, int height) {
    CBlockIndex *pb = ::ChainActive().Tip();

    if (height >= 0 && height < ::ChainActive().Height()) {
        pb = ::ChainActive()[height];
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
    RPCHelpMan{
        "getnetworkhashps",
        "Returns the estimated network hashes per second based on the last n "
        "blocks.\n"
        "Pass in [blocks] to override # of blocks, -1 specifies since last "
        "difficulty change.\n"
        "Pass in [height] to estimate the network speed at the time when a "
        "certain block was found.\n",
        {
            {"nblocks", RPCArg::Type::NUM, /* default */ "120",
             "The number of blocks, or -1 for blocks since last difficulty "
             "change."},
            {"height", RPCArg::Type::NUM, /* default */ "-1",
             "To estimate at the time of the given height."},
        },
        RPCResult{"x             (numeric) Hashes per second estimated\n"},
        RPCExamples{HelpExampleCli("getnetworkhashps", "") +
                    HelpExampleRpc("getnetworkhashps", "")},
    }
        .Check(request);

    LOCK(cs_main);
    return GetNetworkHashPS(
        !request.params[0].isNull() ? request.params[0].get_int() : 120,
        !request.params[1].isNull() ? request.params[1].get_int() : -1);
}

static UniValue generateBlocks(const Config &config,
                               const CScript &coinbase_script, int nGenerate,
                               uint64_t nMaxTries) {
    static const int nInnerLoopCount = 0x100000;
    int nHeightEnd = 0;
    int nHeight = 0;

    {
        // Don't keep cs_main locked.
        LOCK(cs_main);
        nHeight = ::ChainActive().Height();
        nHeightEnd = nHeight + nGenerate;
    }

    const uint64_t nExcessiveBlockSize = config.GetMaxBlockSize();

    unsigned int nExtraNonce = 0;
    UniValue blockHashes(UniValue::VARR);
    while (nHeight < nHeightEnd && !ShutdownRequested()) {
        std::unique_ptr<CBlockTemplate> pblocktemplate(
            BlockAssembler(config, g_mempool).CreateNewBlock(coinbase_script));

        if (!pblocktemplate.get()) {
            throw JSONRPCError(RPC_INTERNAL_ERROR, "Couldn't create new block");
        }

        CBlock *pblock = &pblocktemplate->block;

        {
            LOCK(cs_main);
            IncrementExtraNonce(pblock, ::ChainActive().Tip(),
                                nExcessiveBlockSize, nExtraNonce);
        }

        while (nMaxTries > 0 && pblock->nNonce < nInnerLoopCount &&
               !CheckProofOfWork(pblock->GetHash(), pblock->nBits,
                                 config.GetChainParams().GetConsensus())) {
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
    }

    return blockHashes;
}

static UniValue generatetoaddress(const Config &config,
                                  const JSONRPCRequest &request) {
    RPCHelpMan{
        "generatetoaddress",
        "Mine blocks immediately to a specified address before the "
        "RPC call returns)\n",
        {
            {"nblocks", RPCArg::Type::NUM, RPCArg::Optional::NO,
             "How many blocks are generated immediately."},
            {"address", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The address to send the newly generated bitcoin to."},
            {"maxtries", RPCArg::Type::NUM, /* default */ "1000000",
             "How many iterations to try."},
        },
        RPCResult{"[ blockhashes ]     (array) hashes of blocks generated\n"},
        RPCExamples{
            "\nGenerate 11 blocks to myaddress\n" +
            HelpExampleCli("generatetoaddress", "11 \"myaddress\"") +
            "If you are running the Bitcoin ABC wallet, you can get a new "
            "address to send the newly generated bitcoin to with:\n" +
            HelpExampleCli("getnewaddress", "")},
    }
        .Check(request);

    int nGenerate = request.params[0].get_int();
    uint64_t nMaxTries = 1000000;
    if (!request.params[2].isNull()) {
        nMaxTries = request.params[2].get_int64();
    }

    CTxDestination destination =
        DecodeDestination(request.params[1].get_str(), config.GetChainParams());
    if (!IsValidDestination(destination)) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                           "Error: Invalid address");
    }

    CScript coinbase_script = GetScriptForDestination(destination);

    return generateBlocks(config, coinbase_script, nGenerate, nMaxTries);
}

static UniValue getmininginfo(const Config &config,
                              const JSONRPCRequest &request) {
    RPCHelpMan{
        "getmininginfo",
        "Returns a json object containing mining-related "
        "information.",
        {},
        RPCResult{
            "{\n"
            "  \"blocks\": nnn,             (numeric) The current block\n"
            "  \"currentblocksize\": nnn,   (numeric, optional) The block size "
            "of the last assembled block (only present if a block was ever "
            "assembled)\n"
            "  \"currentblocktx\": nnn,     (numeric, optional) The number of "
            "block transactions of the last assembled block (only present if a "
            "block was ever assembled)\n"
            "  \"difficulty\": xxx.xxxxx    (numeric) The current difficulty\n"
            "  \"networkhashps\": nnn,      (numeric) The network hashes per "
            "second\n"
            "  \"pooledtx\": n              (numeric) The size of the mempool\n"
            "  \"chain\": \"xxxx\",         (string) current network name as "
            "defined in BIP70 (main, test, regtest)\n"
            "  \"warnings\": \"...\"        (string) any network and "
            "blockchain warnings\n"
            "}\n"},
        RPCExamples{HelpExampleCli("getmininginfo", "") +
                    HelpExampleRpc("getmininginfo", "")},
    }
        .Check(request);

    LOCK(cs_main);

    UniValue obj(UniValue::VOBJ);
    obj.pushKV("blocks", int(::ChainActive().Height()));
    if (BlockAssembler::m_last_block_size) {
        obj.pushKV("currentblocksize", *BlockAssembler::m_last_block_size);
    }
    if (BlockAssembler::m_last_block_num_txs) {
        obj.pushKV("currentblocktx", *BlockAssembler::m_last_block_num_txs);
    }
    obj.pushKV("difficulty", double(GetDifficulty(::ChainActive().Tip())));
    obj.pushKV("networkhashps", getnetworkhashps(config, request));
    obj.pushKV("pooledtx", uint64_t(g_mempool.size()));
    obj.pushKV("chain", config.GetChainParams().NetworkIDString());
    obj.pushKV("warnings", GetWarnings("statusbar"));

    return obj;
}

// NOTE: Unlike wallet RPC (which use BCH values), mining RPCs follow GBT (BIP
// 22) in using satoshi amounts
static UniValue prioritisetransaction(const Config &config,
                                      const JSONRPCRequest &request) {
    RPCHelpMan{
        "prioritisetransaction",
        "Accepts the transaction into mined blocks at a higher "
        "(or lower) priority\n",
        {
            {"txid", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The transaction id."},
            {"dummy", RPCArg::Type::NUM, RPCArg::Optional::OMITTED_NAMED_ARG,
             "API-Compatibility for previous API. Must be zero or null.\n"
             "                  DEPRECATED. For forward compatibility "
             "use named arguments and omit this parameter."},
            {"fee_delta", RPCArg::Type::NUM, RPCArg::Optional::NO,
             "The fee value (in satoshis) to add (or subtract, if negative).\n"
             "                        The fee is not actually paid, only the "
             "algorithm for selecting transactions into a block\n"
             "                  considers the transaction as it would "
             "have paid a higher (or lower) fee."},
        },
        RPCResult{"true              (boolean) Returns true\n"},
        RPCExamples{
            HelpExampleCli("prioritisetransaction", "\"txid\" 0.0 10000") +
            HelpExampleRpc("prioritisetransaction", "\"txid\", 0.0, 10000")},
    }
        .Check(request);

    LOCK(cs_main);

    TxId txid(ParseHashV(request.params[0], "txid"));
    Amount nAmount = request.params[2].get_int64() * SATOSHI;

    if (!(request.params[1].isNull() || request.params[1].get_real() == 0)) {
        throw JSONRPCError(RPC_INVALID_PARAMETER,
                           "Priority is no longer supported, dummy argument to "
                           "prioritisetransaction must be 0.");
    }

    g_mempool.PrioritiseTransaction(txid, nAmount);
    return true;
}

// NOTE: Assumes a conclusive result; if result is inconclusive, it must be
// handled by caller
static UniValue BIP22ValidationResult(const Config &config,
                                      const BlockValidationState &state) {
    if (state.IsValid()) {
        return NullUniValue;
    }

    if (state.IsError()) {
        throw JSONRPCError(RPC_VERIFY_ERROR, FormatStateMessage(state));
    }

    if (state.IsInvalid()) {
        std::string strRejectReason = state.GetRejectReason();
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
    RPCHelpMan{
        "getblocktemplate",
        "If the request parameters include a 'mode' key, that is used to "
        "explicitly select between the default 'template' request or a "
        "'proposal'.\n"
        "It returns data needed to construct a block to work on.\n"
        "For full specification, see BIPs 22, 23, 9, and 145:\n"
        "    "
        "https://github.com/bitcoin/bips/blob/master/"
        "bip-0022.mediawiki\n"
        "    "
        "https://github.com/bitcoin/bips/blob/master/"
        "bip-0023.mediawiki\n"
        "    "
        "https://github.com/bitcoin/bips/blob/master/"
        "bip-0009.mediawiki#getblocktemplate_changes\n"
        "    ",
        {
            {"template_request",
             RPCArg::Type::OBJ,
             "{}",
             "A json object in the following spec",
             {
                 {"mode", RPCArg::Type::STR, /* treat as named arg */
                  RPCArg::Optional::OMITTED_NAMED_ARG,
                  "This must be set to \"template\", \"proposal\" (see BIP "
                  "23), or omitted"},
                 {
                     "capabilities",
                     RPCArg::Type::ARR,
                     /* treat as named arg */
                     RPCArg::Optional::OMITTED_NAMED_ARG,
                     "A list of strings",
                     {
                         {"support", RPCArg::Type::STR,
                          RPCArg::Optional::OMITTED,
                          "client side supported feature, 'longpoll', "
                          "'coinbasetxn', 'coinbasevalue', 'proposal', "
                          "'serverlist', 'workid'"},
                     },
                 },
             },
             "\"template_request\""},
        },
        RPCResult{
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
            "in little-endian hexadecimal\n"
            "         \"depends\" : [                (array) array of numbers "
            "\n"
            "             n                          (numeric) transactions "
            "before this one (by 1-based index in 'transactions' list) that "
            "must be present in the final block if this one is\n"
            "             ,...\n"
            "         ],\n"
            "         \"fee\": n,                    (numeric) difference in "
            "value between transaction inputs and outputs (in satoshis); for "
            "coinbase transactions, this is a negative number of the total "
            "collected block fees (ie, not including the block subsidy); if "
            "key is not present, fee is unknown and clients MUST NOT assume "
            "there isn't one\n"
            "         \"sigops\" : n,                (numeric) total SigOps "
            "count, as counted for purposes of block limits; if key is not "
            "present, sigop count is unknown and clients MUST NOT assume it is "
            "zero\n"
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
            "transaction fees (in satoshis)\n"
            "  \"coinbasetxn\" : {                 (json object) information "
            "for coinbase transaction\n"
            "    \"minerfund\" : {                   (json object) information "
            "related to the coinbase miner fund\n"
            "      \"addresses\" : [ ... ],            (array) List of valid "
            "addresses for the miner fund output\n"
            "      \"minimumvalue\" : n,               (numeric) The minimum "
            "value the miner fund output must pay\n"
            "    },\n"
            "  },\n"
            "  \"target\" : \"xxxx\",              (string) The hash target\n"
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
            "}\n"},
        RPCExamples{HelpExampleCli("getblocktemplate", "") +
                    HelpExampleRpc("getblocktemplate", "")},
    }
        .Check(request);

    LOCK(cs_main);
    const CChainParams &chainparams = config.GetChainParams();

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

            const BlockHash hash = block.GetHash();
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

            CBlockIndex *const pindexPrev = ::ChainActive().Tip();
            // TestBlockValidity only supports blocks built on the current Tip
            if (block.hashPrevBlock != pindexPrev->GetBlockHash()) {
                return "inconclusive-not-best-prevblk";
            }
            BlockValidationState state;
            TestBlockValidity(state, chainparams, block, pindexPrev,
                              BlockValidationOptions(config)
                                  .withCheckPoW(false)
                                  .withCheckMerkleRoot(true));
            return BIP22ValidationResult(config, state);
        }
    }

    if (strMode != "template") {
        throw JSONRPCError(RPC_INVALID_PARAMETER, "Invalid mode");
    }

    if (!g_rpc_node->connman) {
        throw JSONRPCError(
            RPC_CLIENT_P2P_DISABLED,
            "Error: Peer-to-peer functionality missing or disabled");
    }

    if (g_rpc_node->connman->GetNodeCount(CConnman::CONNECTIONS_ALL) == 0) {
        throw JSONRPCError(RPC_CLIENT_NOT_CONNECTED,
                           "Bitcoin is not connected!");
    }

    if (::ChainstateActive().IsInitialBlockDownload()) {
        throw JSONRPCError(RPC_CLIENT_IN_INITIAL_DOWNLOAD, PACKAGE_NAME
                           " is in initial sync and waiting for blocks...");
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

            hashWatchedChain = ParseHashV(lpstr.substr(0, 64), "longpollid");
            nTransactionsUpdatedLastLP = atoi64(lpstr.substr(64));
        } else {
            // NOTE: Spec does not specify behaviour for non-string longpollid,
            // but this makes testing easier
            hashWatchedChain = ::ChainActive().Tip()->GetBlockHash();
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
    if (pindexPrev != ::ChainActive().Tip() ||
        (g_mempool.GetTransactionsUpdated() != nTransactionsUpdatedLast &&
         GetTime() - nStart > 5)) {
        // Clear pindexPrev so future calls make a new block, despite any
        // failures from here on
        pindexPrev = nullptr;

        // Store the pindexBest used before CreateNewBlock, to avoid races
        nTransactionsUpdatedLast = g_mempool.GetTransactionsUpdated();
        CBlockIndex *pindexPrevNew = ::ChainActive().Tip();
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

    CHECK_NONFATAL(pindexPrev);
    // pointer for convenience
    CBlock *pblock = &pblocktemplate->block;

    // Update nTime
    UpdateTime(pblock, chainparams, pindexPrev);
    pblock->nNonce = 0;

    UniValue aCaps(UniValue::VARR);
    aCaps.push_back("proposal");

    Amount coinbasevalue = Amount::zero();

    UniValue transactions(UniValue::VARR);
    transactions.reserve(pblock->vtx.size());
    int index_in_template = 0;
    for (const auto &it : pblock->vtx) {
        const CTransaction &tx = *it;
        const TxId txId = tx.GetId();

        if (tx.IsCoinBase()) {
            index_in_template++;

            for (const auto &o : pblock->vtx[0]->vout) {
                coinbasevalue += o.nValue;
            }

            continue;
        }

        UniValue entry(UniValue::VOBJ);
        entry.reserve(5);
        entry.__pushKV("data", EncodeHexTx(tx));
        entry.__pushKV("txid", txId.GetHex());
        entry.__pushKV("hash", tx.GetHash().GetHex());
        entry.__pushKV("fee", pblocktemplate->entries[index_in_template].fees /
                                  SATOSHI);
        int64_t nTxSigOps =
            pblocktemplate->entries[index_in_template].sigOpCount;
        entry.__pushKV("sigops", nTxSigOps);

        transactions.push_back(entry);
        index_in_template++;
    }

    UniValue aux(UniValue::VOBJ);
    aux.pushKV("flags", HexStr(COINBASE_FLAGS.begin(), COINBASE_FLAGS.end()));

    UniValue minerFundList(UniValue::VARR);
    const Consensus::Params &consensusParams = chainparams.GetConsensus();
    for (auto fundDestination :
         GetMinerFundWhitelist(consensusParams, pindexPrev)) {
        minerFundList.push_back(EncodeCashAddr(fundDestination, chainparams));
    }

    int64_t minerFundMinValue = 0;
    if (IsAxionEnabled(consensusParams, pindexPrev)) {
        minerFundMinValue =
            int64_t(GetMinerFundAmount(coinbasevalue) / SATOSHI);
    }

    UniValue minerFund(UniValue::VOBJ);
    minerFund.pushKV("addresses", minerFundList);
    minerFund.pushKV("minimumvalue", minerFundMinValue);

    UniValue coinbasetxn(UniValue::VOBJ);
    coinbasetxn.pushKV("minerfund", minerFund);

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
    result.pushKV("coinbasetxn", coinbasetxn);
    result.pushKV("coinbasevalue", int64_t(coinbasevalue / SATOSHI));
    result.pushKV("longpollid", ::ChainActive().Tip()->GetBlockHash().GetHex() +
                                    i64tostr(nTransactionsUpdatedLast));
    result.pushKV("target", hashTarget.GetHex());
    result.pushKV("mintime", int64_t(pindexPrev->GetMedianTimePast()) + 1);
    result.pushKV("mutable", aMutable);
    result.pushKV("noncerange", "00000000ffffffff");
    result.pushKV("sigoplimit",
                  GetMaxBlockSigChecksCount(DEFAULT_MAX_BLOCK_SIZE));
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
    BlockValidationState state;

    explicit submitblock_StateCatcher(const uint256 &hashIn)
        : hash(hashIn), found(false), state() {}

protected:
    void BlockChecked(const CBlock &block,
                      const BlockValidationState &stateIn) override {
        if (block.GetHash() != hash) {
            return;
        }

        found = true;
        state = stateIn;
    }
};

static UniValue submitblock(const Config &config,
                            const JSONRPCRequest &request) {
    // We allow 2 arguments for compliance with BIP22. Argument 2 is ignored.
    RPCHelpMan{
        "submitblock",
        "Attempts to submit new block to network.\n"
        "See https://en.bitcoin.it/wiki/BIP_0022 for full specification.\n",
        {
            {"hexdata", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "the hex-encoded block data to submit"},
            {"dummy", RPCArg::Type::STR, /* default */ "ignored",
             "dummy value, for compatibility with BIP22. This value is "
             "ignored."},
        },
        RPCResults{},
        RPCExamples{HelpExampleCli("submitblock", "\"mydata\"") +
                    HelpExampleRpc("submitblock", "\"mydata\"")},
    }
        .Check(request);

    std::shared_ptr<CBlock> blockptr = std::make_shared<CBlock>();
    CBlock &block = *blockptr;
    if (!DecodeHexBlk(block, request.params[0].get_str())) {
        throw JSONRPCError(RPC_DESERIALIZATION_ERROR, "Block decode failed");
    }

    if (block.vtx.empty() || !block.vtx[0]->IsCoinBase()) {
        throw JSONRPCError(RPC_DESERIALIZATION_ERROR,
                           "Block does not start with a coinbase");
    }

    const BlockHash hash = block.GetHash();
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
        }
    }

    bool new_block;
    submitblock_StateCatcher sc(block.GetHash());
    RegisterValidationInterface(&sc);
    bool accepted =
        ProcessNewBlock(config, blockptr, /* fForceProcessing */ true,
                        /* fNewBlock */ &new_block);
    // We are only interested in BlockChecked which will have been dispatched
    // in-thread, so no need to sync before unregistering.
    UnregisterValidationInterface(&sc);
    // Sync to ensure that the catcher's slots aren't executing when it goes out
    // of scope and is deleted.
    SyncWithValidationInterfaceQueue();
    if (!new_block && accepted) {
        return "duplicate";
    }

    if (!sc.found) {
        return "inconclusive";
    }

    return BIP22ValidationResult(config, sc.state);
}

static UniValue submitheader(const Config &config,
                             const JSONRPCRequest &request) {
    RPCHelpMan{
        "submitheader",
        "Decode the given hexdata as a header and submit it as a candidate "
        "chain tip if valid."
        "\nThrows when the header is invalid.\n",
        {
            {"hexdata", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "the hex-encoded block header data"},
        },
        RPCResult{"None"},
        RPCExamples{HelpExampleCli("submitheader", "\"aabbcc\"") +
                    HelpExampleRpc("submitheader", "\"aabbcc\"")},
    }
        .Check(request);

    CBlockHeader h;
    if (!DecodeHexBlockHeader(h, request.params[0].get_str())) {
        throw JSONRPCError(RPC_DESERIALIZATION_ERROR,
                           "Block header decode failed");
    }
    {
        LOCK(cs_main);
        if (!LookupBlockIndex(h.hashPrevBlock)) {
            throw JSONRPCError(RPC_VERIFY_ERROR,
                               "Must submit previous header (" +
                                   h.hashPrevBlock.GetHex() + ") first");
        }
    }

    BlockValidationState state;
    ProcessNewBlockHeaders(config, {h}, state);
    if (state.IsValid()) {
        return NullUniValue;
    }
    if (state.IsError()) {
        throw JSONRPCError(RPC_VERIFY_ERROR, FormatStateMessage(state));
    }
    throw JSONRPCError(RPC_VERIFY_ERROR, state.GetRejectReason());
}

static UniValue estimatefee(const Config &config,
                            const JSONRPCRequest &request) {
    RPCHelpMan{
        "estimatefee",
        "Estimates the approximate fee per kilobyte needed for a "
        "transaction\n",
        {},
        RPCResult{"n              (numeric) estimated fee-per-kilobyte\n"},
        RPCExamples{HelpExampleCli("estimatefee", "")},
    }
        .Check(request);

    return ValueFromAmount(g_mempool.estimateFee().GetFeePerK());
}

// clang-format off
static const CRPCCommand commands[] = {
    //  category   name                     actor (function)       argNames
    //  ---------- ------------------------ ---------------------- ----------
    {"mining",     "getnetworkhashps",      getnetworkhashps,      {"nblocks", "height"}},
    {"mining",     "getmininginfo",         getmininginfo,         {}},
    {"mining",     "prioritisetransaction", prioritisetransaction, {"txid", "dummy", "fee_delta"}},
    {"mining",     "getblocktemplate",      getblocktemplate,      {"template_request"}},
    {"mining",     "submitblock",           submitblock,           {"hexdata", "dummy"}},
    {"mining",     "submitheader",          submitheader,          {"hexdata"}},

    {"generating", "generatetoaddress",     generatetoaddress,     {"nblocks", "address", "maxtries"}},

    {"util",       "estimatefee",           estimatefee,           {"nblocks"}},
};
// clang-format on

void RegisterMiningRPCCommands(CRPCTable &t) {
    for (unsigned int vcidx = 0; vcidx < ARRAYLEN(commands); vcidx++) {
        t.appendCommand(commands[vcidx].name, &commands[vcidx]);
    }
}
