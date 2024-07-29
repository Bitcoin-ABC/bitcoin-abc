// Copyright (c) 2010 Satoshi Nakamoto
// Copyright (c) 2009-2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/processor.h>
#include <blockvalidity.h>
#include <cashaddrenc.h>
#include <chain.h>
#include <chainparams.h>
#include <common/system.h>
#include <config.h>
#include <consensus/activation.h>
#include <consensus/amount.h>
#include <consensus/consensus.h>
#include <consensus/merkle.h>
#include <consensus/params.h>
#include <consensus/validation.h>
#include <core_io.h>
#include <key_io.h>
#include <minerfund.h>
#include <net.h>
#include <node/context.h>
#include <node/miner.h>
#include <policy/block/stakingrewards.h>
#include <policy/policy.h>
#include <pow/pow.h>
#include <rpc/blockchain.h>
#include <rpc/mining.h>
#include <rpc/server.h>
#include <rpc/server_util.h>
#include <rpc/util.h>
#include <script/descriptor.h>
#include <script/script.h>
#include <shutdown.h>
#include <timedata.h>
#include <txmempool.h>
#include <univalue.h>
#include <util/strencodings.h>
#include <util/string.h>
#include <util/translation.h>
#include <validation.h>
#include <validationinterface.h>
#include <warnings.h>

#include <cstdint>

using node::BlockAssembler;
using node::CBlockTemplate;
using node::NodeContext;
using node::UpdateTime;

/**
 * Return average network hashes per second based on the last 'lookup' blocks,
 * or from the last difficulty change if 'lookup' is nonpositive. If 'height' is
 * nonnegative, compute the estimate at the time when a given block was found.
 */
static UniValue GetNetworkHashPS(int lookup, int height,
                                 const CChain &active_chain) {
    const CBlockIndex *pb = active_chain.Tip();

    if (height >= 0 && height < active_chain.Height()) {
        pb = active_chain[height];
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

    const CBlockIndex *pb0 = pb;
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

static RPCHelpMan getnetworkhashps() {
    return RPCHelpMan{
        "getnetworkhashps",
        "Returns the estimated network hashes per second based on the last n "
        "blocks.\n"
        "Pass in [blocks] to override # of blocks, -1 specifies since last "
        "difficulty change.\n"
        "Pass in [height] to estimate the network speed at the time when a "
        "certain block was found.\n",
        {
            {"nblocks", RPCArg::Type::NUM, RPCArg::Default{120},
             "The number of blocks, or -1 for blocks since last difficulty "
             "change."},
            {"height", RPCArg::Type::NUM, RPCArg::Default{-1},
             "To estimate at the time of the given height."},
        },
        RPCResult{RPCResult::Type::NUM, "", "Hashes per second estimated"},
        RPCExamples{HelpExampleCli("getnetworkhashps", "") +
                    HelpExampleRpc("getnetworkhashps", "")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            ChainstateManager &chainman = EnsureAnyChainman(request.context);
            LOCK(cs_main);
            return GetNetworkHashPS(
                !request.params[0].isNull() ? request.params[0].getInt<int>()
                                            : 120,
                !request.params[1].isNull() ? request.params[1].getInt<int>()
                                            : -1,
                chainman.ActiveChain());
        },
    };
}

static bool GenerateBlock(ChainstateManager &chainman,
                          avalanche::Processor *const avalanche, CBlock &block,
                          uint64_t &max_tries, BlockHash &block_hash) {
    block_hash.SetNull();
    block.hashMerkleRoot = BlockMerkleRoot(block);

    const Consensus::Params &params = chainman.GetConsensus();

    while (max_tries > 0 &&
           block.nNonce < std::numeric_limits<uint32_t>::max() &&
           !CheckProofOfWork(block.GetHash(), block.nBits, params) &&
           !ShutdownRequested()) {
        ++block.nNonce;
        --max_tries;
    }
    if (max_tries == 0 || ShutdownRequested()) {
        return false;
    }
    if (block.nNonce == std::numeric_limits<uint32_t>::max()) {
        return true;
    }

    std::shared_ptr<const CBlock> shared_pblock =
        std::make_shared<const CBlock>(block);
    if (!chainman.ProcessNewBlock(shared_pblock,
                                  /*force_processing=*/true,
                                  /*min_pow_checked=*/true, nullptr,
                                  avalanche)) {
        throw JSONRPCError(RPC_INTERNAL_ERROR,
                           "ProcessNewBlock, block not accepted");
    }

    block_hash = block.GetHash();
    return true;
}

static UniValue generateBlocks(ChainstateManager &chainman,
                               const CTxMemPool &mempool,
                               avalanche::Processor *const avalanche,
                               const CScript &coinbase_script, int nGenerate,
                               uint64_t nMaxTries) {
    UniValue blockHashes(UniValue::VARR);
    while (nGenerate > 0 && !ShutdownRequested()) {
        std::unique_ptr<CBlockTemplate> pblocktemplate(
            BlockAssembler{chainman.GetConfig(), chainman.ActiveChainstate(),
                           &mempool, avalanche}
                .CreateNewBlock(coinbase_script));

        if (!pblocktemplate.get()) {
            throw JSONRPCError(RPC_INTERNAL_ERROR, "Couldn't create new block");
        }

        CBlock *pblock = &pblocktemplate->block;

        BlockHash block_hash;
        if (!GenerateBlock(chainman, avalanche, *pblock, nMaxTries,
                           block_hash)) {
            break;
        }

        if (!block_hash.IsNull()) {
            --nGenerate;
            blockHashes.push_back(block_hash.GetHex());
        }
    }

    // Block to make sure wallet/indexers sync before returning
    SyncWithValidationInterfaceQueue();

    return blockHashes;
}

static bool getScriptFromDescriptor(const std::string &descriptor,
                                    CScript &script, std::string &error) {
    FlatSigningProvider key_provider;
    const auto desc =
        Parse(descriptor, key_provider, error, /* require_checksum = */ false);
    if (desc) {
        if (desc->IsRange()) {
            throw JSONRPCError(RPC_INVALID_PARAMETER,
                               "Ranged descriptor not accepted. Maybe pass "
                               "through deriveaddresses first?");
        }

        FlatSigningProvider provider;
        std::vector<CScript> scripts;
        if (!desc->Expand(0, key_provider, scripts, provider)) {
            throw JSONRPCError(
                RPC_INVALID_ADDRESS_OR_KEY,
                strprintf("Cannot derive script without private keys"));
        }

        // Combo descriptors can have 2 scripts, so we can't just check
        // scripts.size() == 1
        CHECK_NONFATAL(scripts.size() > 0 && scripts.size() <= 2);

        if (scripts.size() == 1) {
            script = scripts.at(0);
        } else {
            // Else take the 2nd script, since it is p2pkh
            script = scripts.at(1);
        }

        return true;
    }

    return false;
}

static RPCHelpMan generatetodescriptor() {
    return RPCHelpMan{
        "generatetodescriptor",
        "Mine blocks immediately to a specified descriptor (before the RPC "
        "call returns)\n",
        {
            {"num_blocks", RPCArg::Type::NUM, RPCArg::Optional::NO,
             "How many blocks are generated immediately."},
            {"descriptor", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The descriptor to send the newly generated bitcoin to."},
            {"maxtries", RPCArg::Type::NUM, RPCArg::Default{DEFAULT_MAX_TRIES},
             "How many iterations to try."},
        },
        RPCResult{RPCResult::Type::ARR,
                  "",
                  "hashes of blocks generated",
                  {
                      {RPCResult::Type::STR_HEX, "", "blockhash"},
                  }},
        RPCExamples{"\nGenerate 11 blocks to mydesc\n" +
                    HelpExampleCli("generatetodescriptor", "11 \"mydesc\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            const int num_blocks{request.params[0].getInt<int>()};
            const uint64_t max_tries{request.params[2].isNull()
                                         ? DEFAULT_MAX_TRIES
                                         : request.params[2].getInt<int>()};

            CScript coinbase_script;
            std::string error;
            if (!getScriptFromDescriptor(request.params[1].get_str(),
                                         coinbase_script, error)) {
                throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY, error);
            }

            NodeContext &node = EnsureAnyNodeContext(request.context);
            const CTxMemPool &mempool = EnsureMemPool(node);
            ChainstateManager &chainman = EnsureChainman(node);

            return generateBlocks(chainman, mempool, node.avalanche.get(),
                                  coinbase_script, num_blocks, max_tries);
        },
    };
}

static RPCHelpMan generate() {
    return RPCHelpMan{"generate",
                      "has been replaced by the -generate cli option. Refer to "
                      "-help for more information.",
                      {},
                      {},
                      RPCExamples{""},
                      [&](const RPCHelpMan &self, const Config &config,
                          const JSONRPCRequest &request) -> UniValue {
                          throw JSONRPCError(RPC_METHOD_NOT_FOUND,
                                             self.ToString());
                      }};
}

static RPCHelpMan generatetoaddress() {
    return RPCHelpMan{
        "generatetoaddress",
        "Mine blocks immediately to a specified address before the "
        "RPC call returns)\n",
        {
            {"nblocks", RPCArg::Type::NUM, RPCArg::Optional::NO,
             "How many blocks are generated immediately."},
            {"address", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The address to send the newly generated bitcoin to."},
            {"maxtries", RPCArg::Type::NUM, RPCArg::Default{DEFAULT_MAX_TRIES},
             "How many iterations to try."},
        },
        RPCResult{RPCResult::Type::ARR,
                  "",
                  "hashes of blocks generated",
                  {
                      {RPCResult::Type::STR_HEX, "", "blockhash"},
                  }},
        RPCExamples{
            "\nGenerate 11 blocks to myaddress\n" +
            HelpExampleCli("generatetoaddress", "11 \"myaddress\"") +
            "If you are using the " PACKAGE_NAME " wallet, you can "
            "get a new address to send the newly generated bitcoin to with:\n" +
            HelpExampleCli("getnewaddress", "")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            const int num_blocks{request.params[0].getInt<int>()};
            const uint64_t max_tries{request.params[2].isNull()
                                         ? DEFAULT_MAX_TRIES
                                         : request.params[2].getInt<int64_t>()};

            CTxDestination destination = DecodeDestination(
                request.params[1].get_str(), config.GetChainParams());
            if (!IsValidDestination(destination)) {
                throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                                   "Error: Invalid address");
            }

            NodeContext &node = EnsureAnyNodeContext(request.context);
            const CTxMemPool &mempool = EnsureMemPool(node);
            ChainstateManager &chainman = EnsureChainman(node);

            CScript coinbase_script = GetScriptForDestination(destination);

            return generateBlocks(chainman, mempool, node.avalanche.get(),
                                  coinbase_script, num_blocks, max_tries);
        },
    };
}

static RPCHelpMan generateblock() {
    return RPCHelpMan{
        "generateblock",
        "Mine a block with a set of ordered transactions immediately to a "
        "specified address or descriptor (before the RPC call returns)\n",
        {
            {"output", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The address or descriptor to send the newly generated bitcoin "
             "to."},
            {
                "transactions",
                RPCArg::Type::ARR,
                RPCArg::Optional::NO,
                "An array of hex strings which are either txids or raw "
                "transactions.\n"
                "Txids must reference transactions currently in the mempool.\n"
                "All transactions must be valid and in valid order, otherwise "
                "the block will be rejected.",
                {
                    {"rawtx/txid", RPCArg::Type::STR_HEX,
                     RPCArg::Optional::OMITTED, ""},
                },
            },
        },
        RPCResult{
            RPCResult::Type::OBJ,
            "",
            "",
            {
                {RPCResult::Type::STR_HEX, "hash", "hash of generated block"},
            }},
        RPCExamples{
            "\nGenerate a block to myaddress, with txs rawtx and "
            "mempool_txid\n" +
            HelpExampleCli("generateblock",
                           R"("myaddress" '["rawtx", "mempool_txid"]')")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            const auto address_or_descriptor = request.params[0].get_str();
            CScript coinbase_script;
            std::string error;

            const CChainParams &chainparams = config.GetChainParams();

            if (!getScriptFromDescriptor(address_or_descriptor, coinbase_script,
                                         error)) {
                const auto destination =
                    DecodeDestination(address_or_descriptor, chainparams);
                if (!IsValidDestination(destination)) {
                    throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                                       "Error: Invalid address or descriptor");
                }

                coinbase_script = GetScriptForDestination(destination);
            }

            NodeContext &node = EnsureAnyNodeContext(request.context);
            const CTxMemPool &mempool = EnsureMemPool(node);

            std::vector<CTransactionRef> txs;
            const auto raw_txs_or_txids = request.params[1].get_array();
            for (size_t i = 0; i < raw_txs_or_txids.size(); i++) {
                const auto str(raw_txs_or_txids[i].get_str());

                uint256 hash;
                CMutableTransaction mtx;
                if (ParseHashStr(str, hash)) {
                    const auto tx = mempool.get(TxId(hash));
                    if (!tx) {
                        throw JSONRPCError(
                            RPC_INVALID_ADDRESS_OR_KEY,
                            strprintf("Transaction %s not in mempool.", str));
                    }

                    txs.emplace_back(tx);

                } else if (DecodeHexTx(mtx, str)) {
                    txs.push_back(MakeTransactionRef(std::move(mtx)));
                } else {
                    throw JSONRPCError(
                        RPC_DESERIALIZATION_ERROR,
                        strprintf("Transaction decode failed for %s", str));
                }
            }

            CBlock block;

            ChainstateManager &chainman = EnsureChainman(node);
            {
                LOCK(cs_main);

                std::unique_ptr<CBlockTemplate> blocktemplate(
                    BlockAssembler{config, chainman.ActiveChainstate(), nullptr,
                                   node.avalanche.get()}
                        .CreateNewBlock(coinbase_script));
                if (!blocktemplate) {
                    throw JSONRPCError(RPC_INTERNAL_ERROR,
                                       "Couldn't create new block");
                }
                block = blocktemplate->block;
            }

            CHECK_NONFATAL(block.vtx.size() == 1);

            // Add transactions
            block.vtx.insert(block.vtx.end(), txs.begin(), txs.end());

            {
                LOCK(cs_main);

                BlockValidationState state;
                if (!TestBlockValidity(state, chainparams,
                                       chainman.ActiveChainstate(), block,
                                       chainman.m_blockman.LookupBlockIndex(
                                           block.hashPrevBlock),
                                       GetAdjustedTime,
                                       BlockValidationOptions(config)
                                           .withCheckPoW(false)
                                           .withCheckMerkleRoot(false))) {
                    throw JSONRPCError(RPC_VERIFY_ERROR,
                                       strprintf("TestBlockValidity failed: %s",
                                                 state.ToString()));
                }
            }

            BlockHash block_hash;
            uint64_t max_tries{DEFAULT_MAX_TRIES};

            if (!GenerateBlock(chainman, node.avalanche.get(), block, max_tries,
                               block_hash) ||
                block_hash.IsNull()) {
                throw JSONRPCError(RPC_MISC_ERROR, "Failed to make block.");
            }

            // Block to make sure wallet/indexers sync before returning
            SyncWithValidationInterfaceQueue();

            UniValue obj(UniValue::VOBJ);
            obj.pushKV("hash", block_hash.GetHex());
            return obj;
        },
    };
}

static RPCHelpMan getmininginfo() {
    return RPCHelpMan{
        "getmininginfo",
        "Returns a json object containing mining-related "
        "information.",
        {},
        RPCResult{
            RPCResult::Type::OBJ,
            "",
            "",
            {
                {RPCResult::Type::NUM, "blocks", "The current block"},
                {RPCResult::Type::NUM, "currentblocksize", /* optional */ true,
                 "The block size of the last assembled block (only present if "
                 "a block was ever assembled)"},
                {RPCResult::Type::NUM, "currentblocktx", /* optional */ true,
                 "The number of block transactions of the last assembled block "
                 "(only present if a block was ever assembled)"},
                {RPCResult::Type::NUM, "difficulty", "The current difficulty"},
                {RPCResult::Type::NUM, "networkhashps",
                 "The network hashes per second"},
                {RPCResult::Type::NUM, "pooledtx", "The size of the mempool"},
                {RPCResult::Type::STR, "chain",
                 "current network name (main, test, regtest)"},
                {RPCResult::Type::STR, "warnings",
                 "any network and blockchain warnings"},
            }},
        RPCExamples{HelpExampleCli("getmininginfo", "") +
                    HelpExampleRpc("getmininginfo", "")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            NodeContext &node = EnsureAnyNodeContext(request.context);
            const CTxMemPool &mempool = EnsureMemPool(node);
            ChainstateManager &chainman = EnsureChainman(node);
            LOCK(cs_main);
            const CChain &active_chain = chainman.ActiveChain();

            UniValue obj(UniValue::VOBJ);
            obj.pushKV("blocks", active_chain.Height());
            if (BlockAssembler::m_last_block_size) {
                obj.pushKV("currentblocksize",
                           *BlockAssembler::m_last_block_size);
            }
            if (BlockAssembler::m_last_block_num_txs) {
                obj.pushKV("currentblocktx",
                           *BlockAssembler::m_last_block_num_txs);
            }
            obj.pushKV("difficulty", double(GetDifficulty(active_chain.Tip())));
            obj.pushKV("networkhashps",
                       getnetworkhashps().HandleRequest(config, request));
            obj.pushKV("pooledtx", uint64_t(mempool.size()));
            obj.pushKV("chain", config.GetChainParams().NetworkIDString());
            obj.pushKV("warnings", GetWarnings(false).original);
            return obj;
        },
    };
}

// NOTE: Unlike wallet RPC (which use XEC values), mining RPCs follow GBT (BIP
// 22) in using satoshi amounts
static RPCHelpMan prioritisetransaction() {
    return RPCHelpMan{
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
        RPCResult{RPCResult::Type::BOOL, "", "Returns true"},
        RPCExamples{
            HelpExampleCli("prioritisetransaction", "\"txid\" 0.0 10000") +
            HelpExampleRpc("prioritisetransaction", "\"txid\", 0.0, 10000")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            LOCK(cs_main);

            TxId txid(ParseHashV(request.params[0], "txid"));
            Amount nAmount = request.params[2].getInt<int64_t>() * SATOSHI;

            if (!(request.params[1].isNull() ||
                  request.params[1].get_real() == 0)) {
                throw JSONRPCError(
                    RPC_INVALID_PARAMETER,
                    "Priority is no longer supported, dummy argument to "
                    "prioritisetransaction must be 0.");
            }

            EnsureAnyMemPool(request.context)
                .PrioritiseTransaction(txid, nAmount);
            return true;
        },
    };
}

// NOTE: Assumes a conclusive result; if result is inconclusive, it must be
// handled by caller
static UniValue BIP22ValidationResult(const Config &config,
                                      const BlockValidationState &state) {
    if (state.IsValid()) {
        return NullUniValue;
    }

    if (state.IsError()) {
        throw JSONRPCError(RPC_VERIFY_ERROR, state.ToString());
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

static RPCHelpMan getblocktemplate() {
    return RPCHelpMan{
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
             RPCArg::Default{UniValue::VOBJ},
             "Format of the template",
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
             RPCArgOptions{.oneline_description = "\"template_request\""}},
        },
        {
            RPCResult{"If the proposal was accepted with mode=='proposal'",
                      RPCResult::Type::NONE, "", ""},
            RPCResult{"If the proposal was not accepted with mode=='proposal'",
                      RPCResult::Type::STR, "", "According to BIP22"},
            RPCResult{
                "Otherwise",
                RPCResult::Type::OBJ,
                "",
                "",
                {
                    {RPCResult::Type::NUM, "version",
                     "The preferred block version"},
                    {RPCResult::Type::STR, "previousblockhash",
                     "The hash of current highest block"},
                    {RPCResult::Type::ARR,
                     "transactions",
                     "contents of non-coinbase transactions that should be "
                     "included in the next block",
                     {
                         {RPCResult::Type::OBJ,
                          "",
                          "",
                          {
                              {RPCResult::Type::STR_HEX, "data",
                               "transaction data encoded in hexadecimal "
                               "(byte-for-byte)"},
                              {RPCResult::Type::STR_HEX, "txid",
                               "transaction id encoded in little-endian "
                               "hexadecimal"},
                              {RPCResult::Type::STR_HEX, "hash",
                               "hash encoded in little-endian hexadecimal"},
                              {RPCResult::Type::ARR,
                               "depends",
                               "array of numbers",
                               {
                                   {RPCResult::Type::NUM, "",
                                    "transactions before this one (by 1-based "
                                    "index in 'transactions' list) that must "
                                    "be present in the final block if this one "
                                    "is"},
                               }},
                              {RPCResult::Type::NUM, "fee",
                               "difference in value between transaction inputs "
                               "and outputs (in satoshis); for coinbase "
                               "transactions, this is a negative Number of the "
                               "total collected block fees (ie, not including "
                               "the block subsidy); "
                               "if key is not present, fee is unknown and "
                               "clients MUST NOT assume there isn't one"},
                              {RPCResult::Type::NUM, "sigchecks",
                               "total sigChecks, as counted for purposes of "
                               "block limits; if key is not present, sigChecks "
                               "are unknown and clients MUST NOT assume it is "
                               "zero"},
                          }},
                     }},
                    {RPCResult::Type::OBJ,
                     "coinbaseaux",
                     "data that should be included in the coinbase's scriptSig "
                     "content",
                     {
                         {RPCResult::Type::ELISION, "", ""},
                     }},
                    {RPCResult::Type::NUM, "coinbasevalue",
                     "maximum allowable input to coinbase transaction, "
                     "including the generation award and transaction fees (in "
                     "satoshis)"},
                    {RPCResult::Type::OBJ,
                     "coinbasetxn",
                     "information for coinbase transaction",
                     {
                         {RPCResult::Type::OBJ,
                          "minerfund",
                          "information related to the coinbase miner fund",
                          {

                              {RPCResult::Type::ARR,
                               "addresses",
                               "List of valid addresses for the miner fund "
                               "output",
                               {
                                   {RPCResult::Type::ELISION, "", ""},
                               }},

                              {RPCResult::Type::STR_AMOUNT, "minimumvalue",
                               "The minimum value the miner fund output must "
                               "pay"},

                          }},
                         {RPCResult::Type::OBJ,
                          "stakingrewards",
                          "information related to the coinbase staking reward "
                          "output, only set after the Nov. 15, 2023 upgrade "
                          "activated and the -avalanchestakingrewards option "
                          "is "
                          "enabled",
                          {
                              {RPCResult::Type::OBJ,
                               "payoutscript",
                               "The proof payout script",
                               {
                                   {RPCResult::Type::STR, "asm",
                                    "Decoded payout script"},
                                   {RPCResult::Type::STR_HEX, "hex",
                                    "Raw payout script in hex format"},
                                   {RPCResult::Type::STR, "type",
                                    "The output type (e.g. " +
                                        GetAllOutputTypes() + ")"},
                                   {RPCResult::Type::NUM, "reqSigs",
                                    "The required signatures"},
                                   {RPCResult::Type::ARR,
                                    "addresses",
                                    "",
                                    {
                                        {RPCResult::Type::STR, "address",
                                         "eCash address"},
                                    }},
                               }},
                              {RPCResult::Type::STR_AMOUNT, "minimumvalue",
                               "The minimum value the staking reward output "
                               "must pay"},
                          }},
                         {RPCResult::Type::ELISION, "", ""},
                     }},
                    {RPCResult::Type::STR, "target", "The hash target"},
                    {RPCResult::Type::NUM_TIME, "mintime",
                     "The minimum timestamp appropriate for the next block "
                     "time, expressed in " +
                         UNIX_EPOCH_TIME},
                    {RPCResult::Type::ARR,
                     "mutable",
                     "list of ways the block template may be changed",
                     {
                         {RPCResult::Type::STR, "value",
                          "A way the block template may be changed, e.g. "
                          "'time', 'transactions', 'prevblock'"},
                     }},
                    {RPCResult::Type::STR_HEX, "noncerange",
                     "A range of valid nonces"},
                    {RPCResult::Type::NUM, "sigchecklimit",
                     "limit of sigChecks in blocks"},
                    {RPCResult::Type::NUM, "sizelimit", "limit of block size"},
                    {RPCResult::Type::NUM_TIME, "curtime",
                     "current timestamp in " + UNIX_EPOCH_TIME},
                    {RPCResult::Type::STR, "bits",
                     "compressed target of next block"},
                    {RPCResult::Type::NUM, "height",
                     "The height of the next block"},
                }},
        },
        RPCExamples{HelpExampleCli("getblocktemplate", "") +
                    HelpExampleRpc("getblocktemplate", "")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            NodeContext &node = EnsureAnyNodeContext(request.context);
            ChainstateManager &chainman = EnsureChainman(node);
            LOCK(cs_main);

            const CChainParams &chainparams = config.GetChainParams();

            std::string strMode = "template";
            UniValue lpval = NullUniValue;
            std::set<std::string> setClientRules;
            Chainstate &active_chainstate = chainman.ActiveChainstate();
            CChain &active_chain = active_chainstate.m_chain;
            if (!request.params[0].isNull()) {
                const UniValue &oparam = request.params[0].get_obj();
                const UniValue &modeval = oparam.find_value("mode");
                if (modeval.isStr()) {
                    strMode = modeval.get_str();
                } else if (modeval.isNull()) {
                    /* Do nothing */
                } else {
                    throw JSONRPCError(RPC_INVALID_PARAMETER, "Invalid mode");
                }
                lpval = oparam.find_value("longpollid");

                if (strMode == "proposal") {
                    const UniValue &dataval = oparam.find_value("data");
                    if (!dataval.isStr()) {
                        throw JSONRPCError(
                            RPC_TYPE_ERROR,
                            "Missing data String key for proposal");
                    }

                    CBlock block;
                    if (!DecodeHexBlk(block, dataval.get_str())) {
                        throw JSONRPCError(RPC_DESERIALIZATION_ERROR,
                                           "Block decode failed");
                    }

                    const BlockHash hash = block.GetHash();
                    const CBlockIndex *pindex =
                        chainman.m_blockman.LookupBlockIndex(hash);
                    if (pindex) {
                        if (pindex->IsValid(BlockValidity::SCRIPTS)) {
                            return "duplicate";
                        }
                        if (pindex->nStatus.isInvalid()) {
                            return "duplicate-invalid";
                        }
                        return "duplicate-inconclusive";
                    }

                    CBlockIndex *const pindexPrev = active_chain.Tip();
                    // TestBlockValidity only supports blocks built on the
                    // current Tip
                    if (block.hashPrevBlock != pindexPrev->GetBlockHash()) {
                        return "inconclusive-not-best-prevblk";
                    }
                    BlockValidationState state;
                    TestBlockValidity(state, chainparams, active_chainstate,
                                      block, pindexPrev, GetAdjustedTime,
                                      BlockValidationOptions(config)
                                          .withCheckPoW(false)
                                          .withCheckMerkleRoot(true));
                    return BIP22ValidationResult(config, state);
                }
            }

            if (strMode != "template") {
                throw JSONRPCError(RPC_INVALID_PARAMETER, "Invalid mode");
            }

            const CConnman &connman = EnsureConnman(node);
            if (connman.GetNodeCount(CConnman::CONNECTIONS_ALL) == 0) {
                throw JSONRPCError(RPC_CLIENT_NOT_CONNECTED,
                                   "Bitcoin is not connected!");
            }

            if (active_chainstate.IsInitialBlockDownload()) {
                throw JSONRPCError(
                    RPC_CLIENT_IN_INITIAL_DOWNLOAD, PACKAGE_NAME
                    " is in initial sync and waiting for blocks...");
            }

            static unsigned int nTransactionsUpdatedLast;
            const CTxMemPool &mempool = EnsureMemPool(node);

            const Consensus::Params &consensusParams =
                chainparams.GetConsensus();

            if (!lpval.isNull()) {
                // Wait to respond until either the best block changes, OR a
                // minute has passed and there are more transactions
                uint256 hashWatchedChain;
                std::chrono::steady_clock::time_point checktxtime;
                unsigned int nTransactionsUpdatedLastLP;

                if (lpval.isStr()) {
                    // Format: <hashBestChain><nTransactionsUpdatedLast>
                    std::string lpstr = lpval.get_str();

                    hashWatchedChain =
                        ParseHashV(lpstr.substr(0, 64), "longpollid");
                    nTransactionsUpdatedLastLP = atoi64(lpstr.substr(64));
                } else {
                    // NOTE: Spec does not specify behaviour for non-string
                    // longpollid, but this makes testing easier
                    hashWatchedChain = active_chain.Tip()->GetBlockHash();
                    nTransactionsUpdatedLastLP = nTransactionsUpdatedLast;
                }

                const bool isRegtest = chainparams.MineBlocksOnDemand();
                const auto initialLongpollDelay = isRegtest ? 5s : 1min;
                const auto newTxCheckLongpollDelay = isRegtest ? 1s : 10s;

                // Release lock while waiting
                LEAVE_CRITICAL_SECTION(cs_main);
                {
                    checktxtime =
                        std::chrono::steady_clock::now() + initialLongpollDelay;

                    WAIT_LOCK(g_best_block_mutex, lock);
                    while (g_best_block &&
                           g_best_block->GetBlockHash() == hashWatchedChain &&
                           IsRPCRunning()) {
                        if (g_best_block_cv.wait_until(lock, checktxtime) ==
                            std::cv_status::timeout) {
                            // Timeout: Check transactions for update
                            // without holding the mempool look to avoid
                            // deadlocks
                            if (mempool.GetTransactionsUpdated() !=
                                nTransactionsUpdatedLastLP) {
                                break;
                            }
                            checktxtime += newTxCheckLongpollDelay;
                        }
                    }

                    if (node.avalanche && IsStakingRewardsActivated(
                                              consensusParams, g_best_block)) {
                        // At this point the staking reward winner might not be
                        // computed yet. Make sure we don't miss the staking
                        // reward winner on first return of getblocktemplate
                        // after a block is found when using longpoll.
                        // Note that if the computation was done already this is
                        // a no-op. It can only be done now because we're not
                        // holding cs_main, which would cause a lock order issue
                        // otherwise.
                        node.avalanche->computeStakingReward(g_best_block);
                    }
                }
                ENTER_CRITICAL_SECTION(cs_main);

                if (!IsRPCRunning()) {
                    throw JSONRPCError(RPC_CLIENT_NOT_CONNECTED,
                                       "Shutting down");
                }
                // TODO: Maybe recheck connections/IBD and (if something wrong)
                // send an expires-immediately template to stop miners?
            }

            // Update block
            static CBlockIndex *pindexPrev;
            static int64_t nStart;
            static std::unique_ptr<CBlockTemplate> pblocktemplate;
            if (pindexPrev != active_chain.Tip() ||
                (mempool.GetTransactionsUpdated() != nTransactionsUpdatedLast &&
                 GetTime() - nStart > 5)) {
                // Clear pindexPrev so future calls make a new block, despite
                // any failures from here on
                pindexPrev = nullptr;

                // Store the pindexBest used before CreateNewBlock, to avoid
                // races
                nTransactionsUpdatedLast = mempool.GetTransactionsUpdated();
                CBlockIndex *pindexPrevNew = active_chain.Tip();
                nStart = GetTime();

                // Create new block
                CScript scriptDummy = CScript() << OP_TRUE;
                pblocktemplate = BlockAssembler{config, active_chainstate,
                                                &mempool, node.avalanche.get()}
                                     .CreateNewBlock(scriptDummy);
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
                entry.pushKVEnd("data", EncodeHexTx(tx));
                entry.pushKVEnd("txid", txId.GetHex());
                entry.pushKVEnd("hash", tx.GetHash().GetHex());
                entry.pushKVEnd(
                    "fee",
                    pblocktemplate->entries[index_in_template].fees / SATOSHI);
                const int64_t sigChecks =
                    pblocktemplate->entries[index_in_template].sigChecks;
                entry.pushKVEnd("sigchecks", sigChecks);

                transactions.push_back(entry);
                index_in_template++;
            }

            UniValue aux(UniValue::VOBJ);

            UniValue minerFundList(UniValue::VARR);
            for (const auto &fundDestination :
                 GetMinerFundWhitelist(consensusParams)) {
                minerFundList.push_back(
                    EncodeDestination(fundDestination, config));
            }

            int64_t minerFundMinValue = 0;
            if (IsAxionEnabled(consensusParams, pindexPrev)) {
                minerFundMinValue =
                    int64_t(GetMinerFundAmount(consensusParams, coinbasevalue,
                                               pindexPrev) /
                            SATOSHI);
            }

            UniValue minerFund(UniValue::VOBJ);
            minerFund.pushKV("addresses", minerFundList);
            minerFund.pushKV("minimumvalue", minerFundMinValue);

            UniValue coinbasetxn(UniValue::VOBJ);
            coinbasetxn.pushKV("minerfund", minerFund);

            std::vector<CScript> stakingRewardsPayoutScripts;
            if (node.avalanche &&
                IsStakingRewardsActivated(consensusParams, pindexPrev) &&
                node.avalanche->getStakingRewardWinners(
                    pindexPrev->GetBlockHash(), stakingRewardsPayoutScripts)) {
                UniValue stakingRewards(UniValue::VOBJ);
                UniValue stakingRewardsPayoutScriptObj(UniValue::VOBJ);
                ScriptPubKeyToUniv(stakingRewardsPayoutScripts[0],
                                   stakingRewardsPayoutScriptObj,
                                   /*fIncludeHex=*/true);
                stakingRewards.pushKV("payoutscript",
                                      stakingRewardsPayoutScriptObj);
                stakingRewards.pushKV(
                    "minimumvalue",
                    int64_t(GetStakingRewardsAmount(coinbasevalue) / SATOSHI));

                coinbasetxn.pushKV("stakingrewards", stakingRewards);
            }

            arith_uint256 hashTarget =
                arith_uint256().SetCompact(pblock->nBits);

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
            result.pushKV("longpollid",
                          active_chain.Tip()->GetBlockHash().GetHex() +
                              ToString(nTransactionsUpdatedLast));
            result.pushKV("target", hashTarget.GetHex());
            result.pushKV("mintime",
                          int64_t(pindexPrev->GetMedianTimePast()) + 1);
            result.pushKV("mutable", aMutable);
            result.pushKV("noncerange", "00000000ffffffff");
            const uint64_t sigCheckLimit =
                GetMaxBlockSigChecksCount(DEFAULT_MAX_BLOCK_SIZE);
            result.pushKV("sigchecklimit", sigCheckLimit);
            result.pushKV("sizelimit", DEFAULT_MAX_BLOCK_SIZE);
            result.pushKV("curtime", pblock->GetBlockTime());
            result.pushKV("bits", strprintf("%08x", pblock->nBits));
            result.pushKV("height", int64_t(pindexPrev->nHeight) + 1);

            return result;
        },
    };
}

class submitblock_StateCatcher final : public CValidationInterface {
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

static RPCHelpMan submitblock() {
    // We allow 2 arguments for compliance with BIP22. Argument 2 is ignored.
    return RPCHelpMan{
        "submitblock",
        "Attempts to submit new block to network.\n"
        "See https://en.bitcoin.it/wiki/BIP_0022 for full specification.\n",
        {
            {"hexdata", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "the hex-encoded block data to submit"},
            {"dummy", RPCArg::Type::STR, RPCArg::Default{"ignored"},
             "dummy value, for compatibility with BIP22. This value is "
             "ignored."},
        },
        {
            RPCResult{"If the block was accepted", RPCResult::Type::NONE, "",
                      ""},
            RPCResult{"Otherwise", RPCResult::Type::STR, "",
                      "According to BIP22"},
        },
        RPCExamples{HelpExampleCli("submitblock", "\"mydata\"") +
                    HelpExampleRpc("submitblock", "\"mydata\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CBlock> blockptr = std::make_shared<CBlock>();
            CBlock &block = *blockptr;
            if (!DecodeHexBlk(block, request.params[0].get_str())) {
                throw JSONRPCError(RPC_DESERIALIZATION_ERROR,
                                   "Block decode failed");
            }

            if (block.vtx.empty() || !block.vtx[0]->IsCoinBase()) {
                throw JSONRPCError(RPC_DESERIALIZATION_ERROR,
                                   "Block does not start with a coinbase");
            }

            NodeContext &node = EnsureAnyNodeContext(request.context);
            ChainstateManager &chainman = EnsureChainman(node);
            const BlockHash hash = block.GetHash();
            {
                LOCK(cs_main);
                const CBlockIndex *pindex =
                    chainman.m_blockman.LookupBlockIndex(hash);
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
            auto sc =
                std::make_shared<submitblock_StateCatcher>(block.GetHash());
            RegisterSharedValidationInterface(sc);
            bool accepted = chainman.ProcessNewBlock(blockptr,
                                                     /*force_processing=*/true,
                                                     /*min_pow_checked=*/true,
                                                     /*new_block=*/&new_block,
                                                     node.avalanche.get());
            UnregisterSharedValidationInterface(sc);
            if (!new_block && accepted) {
                return "duplicate";
            }

            if (!sc->found) {
                return "inconclusive";
            }

            // Block to make sure wallet/indexers sync before returning
            SyncWithValidationInterfaceQueue();

            return BIP22ValidationResult(config, sc->state);
        },
    };
}

static RPCHelpMan submitheader() {
    return RPCHelpMan{
        "submitheader",
        "Decode the given hexdata as a header and submit it as a candidate "
        "chain tip if valid."
        "\nThrows when the header is invalid.\n",
        {
            {"hexdata", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "the hex-encoded block header data"},
        },
        RPCResult{RPCResult::Type::NONE, "", "None"},
        RPCExamples{HelpExampleCli("submitheader", "\"aabbcc\"") +
                    HelpExampleRpc("submitheader", "\"aabbcc\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            CBlockHeader h;
            if (!DecodeHexBlockHeader(h, request.params[0].get_str())) {
                throw JSONRPCError(RPC_DESERIALIZATION_ERROR,
                                   "Block header decode failed");
            }
            ChainstateManager &chainman = EnsureAnyChainman(request.context);
            {
                LOCK(cs_main);
                if (!chainman.m_blockman.LookupBlockIndex(h.hashPrevBlock)) {
                    throw JSONRPCError(RPC_VERIFY_ERROR,
                                       "Must submit previous header (" +
                                           h.hashPrevBlock.GetHex() +
                                           ") first");
                }
            }

            BlockValidationState state;
            chainman.ProcessNewBlockHeaders({h},
                                            /*min_pow_checked=*/true, state);
            if (state.IsValid()) {
                return NullUniValue;
            }
            if (state.IsError()) {
                throw JSONRPCError(RPC_VERIFY_ERROR, state.ToString());
            }
            throw JSONRPCError(RPC_VERIFY_ERROR, state.GetRejectReason());
        },
    };
}

static RPCHelpMan estimatefee() {
    return RPCHelpMan{
        "estimatefee",
        "Estimates the approximate fee per kilobyte needed for a "
        "transaction\n",
        {},
        RPCResult{RPCResult::Type::NUM, "", "estimated fee-per-kilobyte"},
        RPCExamples{HelpExampleCli("estimatefee", "")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            const CTxMemPool &mempool = EnsureAnyMemPool(request.context);
            return mempool.estimateFee().GetFeePerK();
        },
    };
}

void RegisterMiningRPCCommands(CRPCTable &t) {
    // clang-format off
    static const CRPCCommand commands[] = {
        //  category    actor (function)
        //  ----------  ----------------------
        {"mining",      getnetworkhashps,      },
        {"mining",      getmininginfo,         },
        {"mining",      prioritisetransaction, },
        {"mining",      getblocktemplate,      },
        {"mining",      submitblock,           },
        {"mining",      submitheader,          },

        {"generating",  generatetoaddress,     },
        {"generating",  generatetodescriptor,  },
        {"generating",  generateblock,         },

        {"util",        estimatefee,           },

        {"hidden",      generate,              },
    };
    // clang-format on
    for (const auto &c : commands) {
        t.appendCommand(c.name, &c);
    }
}
