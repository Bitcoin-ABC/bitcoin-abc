// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2019 The Bitcoin Core developers
// Copyright (c) 2020-2021 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <node/miner.h>

#include <avalanche/avalanche.h>
#include <avalanche/processor.h>
#include <chain.h>
#include <chainparams.h>
#include <coins.h>
#include <common/args.h>
#include <config.h>
#include <consensus/activation.h>
#include <consensus/consensus.h>
#include <consensus/merkle.h>
#include <consensus/tx_verify.h>
#include <consensus/validation.h>
#include <minerfund.h>
#include <policy/block/stakingrewards.h>
#include <policy/policy.h>
#include <policy/settings.h>
#include <pow/pow.h>
#include <primitives/transaction.h>
#include <timedata.h>
#include <util/moneystr.h>
#include <validation.h>
#include <versionbits.h>

#include <algorithm>
#include <queue>
#include <unordered_map>
#include <utility>

namespace node {
int64_t UpdateTime(CBlockHeader *pblock, const CChainParams &chainParams,
                   const CBlockIndex *pindexPrev, int64_t adjustedTime) {
    int64_t nOldTime = pblock->nTime;
    int64_t nNewTime{
        std::max<int64_t>(pindexPrev->GetMedianTimePast() + 1, adjustedTime)};

    if (nOldTime < nNewTime) {
        pblock->nTime = nNewTime;
    }

    // Updating time can change work required on testnet:
    if (chainParams.GetConsensus().fPowAllowMinDifficultyBlocks) {
        pblock->nBits = GetNextWorkRequired(pindexPrev, pblock, chainParams);
    }

    return nNewTime - nOldTime;
}

void ApplyArgsManOptions(const ArgsManager &args,
                         BlockAssembler::Options &options) {
    options.fPrintPriority =
        args.GetBoolArg("-printpriority", DEFAULT_PRINTPRIORITY);
}

static BlockAssembler::Options ConfiguredOptions() {
    BlockAssembler::Options options;
    ApplyArgsManOptions(gArgs, options);
    return options;
}

BlockAssembler::BlockAssembler(const BlockFitter &fitter,
                               Chainstate &chainstate,
                               const CTxMemPool *mempool,
                               const Options &options,
                               const avalanche::Processor *avalanche)
    : blockFitter(fitter), chainParams(chainstate.m_chainman.GetParams()),
      m_mempool(mempool), m_chainstate(chainstate), m_avalanche(avalanche),
      fPrintPriority{options.fPrintPriority},
      test_block_validity{options.test_block_validity} {}

BlockAssembler::BlockAssembler(const BlockFitter &fitter,
                               Chainstate &chainstate,
                               const CTxMemPool *mempool,
                               const avalanche::Processor *avalanche)
    : BlockAssembler(fitter, chainstate, mempool, ConfiguredOptions(),
                     avalanche) {}

BlockAssembler::BlockAssembler(const Config &config, Chainstate &chainstate,
                               const CTxMemPool *mempool,
                               const avalanche::Processor *avalanche)
    : BlockAssembler(BlockFitter(config), chainstate, mempool, avalanche) {}

std::optional<int64_t> BlockAssembler::m_last_block_num_txs{std::nullopt};
std::optional<int64_t> BlockAssembler::m_last_block_size{std::nullopt};

std::unique_ptr<CBlockTemplate>
BlockAssembler::CreateNewBlock(const CScript &scriptPubKeyIn) {
    int64_t nTimeStart = GetTimeMicros();

    blockFitter.resetBlock();

    pblocktemplate.reset(new CBlockTemplate());
    if (!pblocktemplate.get()) {
        return nullptr;
    }

    // Pointer for convenience.
    CBlock *const pblock = &pblocktemplate->block;

    // Add dummy coinbase tx as first transaction.  It is updated at the end.
    pblocktemplate->entries.emplace_back(CTransactionRef(), -SATOSHI, -1);

    LOCK(::cs_main);
    CBlockIndex *pindexPrev = m_chainstate.m_chain.Tip();
    assert(pindexPrev != nullptr);
    nHeight = pindexPrev->nHeight + 1;

    const Consensus::Params &consensusParams = chainParams.GetConsensus();

    pblock->nVersion = ComputeBlockVersion(pindexPrev, consensusParams);
    // -regtest only: allow overriding block.nVersion with
    // -blockversion=N to test forking scenarios
    if (chainParams.MineBlocksOnDemand()) {
        pblock->nVersion = gArgs.GetIntArg("-blockversion", pblock->nVersion);
    }

    pblock->nTime = TicksSinceEpoch<std::chrono::seconds>(GetAdjustedTime());
    m_lock_time_cutoff = pindexPrev->GetMedianTimePast();

    if (m_mempool) {
        LOCK(m_mempool->cs);
        addTxs(*m_mempool);
    }

    if (IsMagneticAnomalyEnabled(consensusParams, pindexPrev)) {
        // If magnetic anomaly is enabled, we make sure transaction are
        // canonically ordered.
        std::sort(std::begin(pblocktemplate->entries) + 1,
                  std::end(pblocktemplate->entries),
                  [](const CBlockTemplateEntry &a, const CBlockTemplateEntry &b)
                      -> bool { return a.tx->GetId() < b.tx->GetId(); });
    }

    // Copy all the transactions refs into the block
    pblock->vtx.reserve(pblocktemplate->entries.size());
    for (const CBlockTemplateEntry &entry : pblocktemplate->entries) {
        pblock->vtx.push_back(entry.tx);
    }

    int64_t nTime1 = GetTimeMicros();

    m_last_block_num_txs = blockFitter.nBlockTx;
    m_last_block_size = blockFitter.nBlockSize;

    // Create coinbase transaction.
    CMutableTransaction coinbaseTx;
    coinbaseTx.vin.resize(1);
    coinbaseTx.vin[0].prevout = COutPoint();
    coinbaseTx.vout.resize(1);
    coinbaseTx.vout[0].scriptPubKey = scriptPubKeyIn;
    coinbaseTx.vout[0].nValue =
        blockFitter.nFees + GetBlockSubsidy(nHeight, consensusParams);
    coinbaseTx.vin[0].scriptSig = CScript() << nHeight << OP_0;

    const Amount blockReward = coinbaseTx.vout[0].nValue;

    const auto whitelisted = GetMinerFundWhitelist(consensusParams);
    if (!whitelisted.empty()) {
        const Amount fund =
            GetMinerFundAmount(consensusParams, blockReward, pindexPrev);
        coinbaseTx.vout[0].nValue -= fund;
        coinbaseTx.vout.emplace_back(
            fund, GetScriptForDestination(*whitelisted.begin()));
    }

    std::vector<CScript> stakingRewardsPayoutScripts;
    if (m_avalanche && IsStakingRewardsActivated(consensusParams, pindexPrev) &&
        m_avalanche->getStakingRewardWinners(pindexPrev->GetBlockHash(),
                                             stakingRewardsPayoutScripts)) {
        const Amount stakingRewards = GetStakingRewardsAmount(blockReward);
        coinbaseTx.vout[0].nValue -= stakingRewards;
        coinbaseTx.vout.emplace_back(stakingRewards,
                                     stakingRewardsPayoutScripts[0]);
    }

    // Make sure the coinbase is big enough.
    uint64_t coinbaseSize = ::GetSerializeSize(coinbaseTx, PROTOCOL_VERSION);
    if (coinbaseSize < MIN_TX_SIZE) {
        coinbaseTx.vin[0].scriptSig
            << std::vector<uint8_t>(MIN_TX_SIZE - coinbaseSize - 1);
    }

    pblocktemplate->entries[0].tx = MakeTransactionRef(coinbaseTx);
    pblocktemplate->entries[0].fees = -1 * blockFitter.nFees;
    pblock->vtx[0] = pblocktemplate->entries[0].tx;

    uint64_t nSerializeSize = GetSerializeSize(*pblock, PROTOCOL_VERSION);

    LogPrintf(
        "CreateNewBlock(): total size: %u txs: %u fees: %ld sigChecks %d\n",
        nSerializeSize, blockFitter.nBlockTx, blockFitter.nFees,
        blockFitter.nBlockSigChecks);

    // Fill in header.
    pblock->hashPrevBlock = pindexPrev->GetBlockHash();
    UpdateTime(pblock, chainParams, pindexPrev,
               TicksSinceEpoch<std::chrono::seconds>(GetAdjustedTime()));
    pblock->nBits = GetNextWorkRequired(pindexPrev, pblock, chainParams);
    pblock->nNonce = 0;
    pblocktemplate->entries[0].sigChecks = 0;

    BlockValidationState state;
    if (test_block_validity &&
        !TestBlockValidity(
            state, chainParams, m_chainstate, *pblock, pindexPrev,
            GetAdjustedTime,
            BlockValidationOptions(blockFitter.getMaxGeneratedBlockSize())
                .withCheckPoW(false)
                .withCheckMerkleRoot(false))) {
        throw std::runtime_error(strprintf("%s: TestBlockValidity failed: %s",
                                           __func__, state.ToString()));
    }
    int64_t nTime2 = GetTimeMicros();

    LogPrint(
        BCLog::BENCH,
        "CreateNewBlock() addTxs: %.2fms, validity: %.2fms (total %.2fms)\n",
        0.001 * (nTime1 - nTimeStart), 0.001 * (nTime2 - nTime1),
        0.001 * (nTime2 - nTimeStart));

    return std::move(pblocktemplate);
}

void BlockAssembler::AddToBlock(const CTxMemPoolEntryRef &entry) {
    pblocktemplate->entries.emplace_back(entry->GetSharedTx(), entry->GetFee(),
                                         entry->GetSigChecks());

    blockFitter.addTx(entry->GetTxSize(), entry->GetSigChecks(),
                      entry->GetFee());

    if (fPrintPriority) {
        LogPrintf(
            "fee rate %s txid %s\n",
            CFeeRate(entry->GetModifiedFee(), entry->GetTxSize()).ToString(),
            entry->GetTx().GetId().ToString());
    }
}

bool BlockAssembler::CheckTx(const CTransaction &tx) const {
    TxValidationState state;
    return ContextualCheckTransaction(chainParams.GetConsensus(), tx, state,
                                      nHeight, m_lock_time_cutoff);
}

/**
 * addTxs includes transactions paying a fee by ensuring that
 * the partial ordering of transactions is maintained.  That is to say
 * children come after parents, despite having a potentially larger fee.
 */
void BlockAssembler::addTxs(const CTxMemPool &mempool) {
    // mapped_value is the number of mempool parents that are still needed for
    // the entry. We decrement this count each time we add a parent of the entry
    // to the block.
    std::unordered_map<CTxMemPoolEntryRef, size_t> missingParentCount;
    missingParentCount.reserve(mempool.size() / 2);

    // set of children we skipped because we have not yet added their parents
    std::unordered_set<CTxMemPoolEntryRef> skippedChildren;

    auto hasMissingParents =
        [&missingParentCount](const CTxMemPoolEntryRef &entry)
            EXCLUSIVE_LOCKS_REQUIRED(mempool.cs) {
                // If we've added any of this tx's parents already, then
                // missingParentCount will have the current count
                if (auto pcIt = missingParentCount.find(entry);
                    pcIt != missingParentCount.end()) {
                    // when pcIt->second reaches 0, we have added all of this
                    // tx's parents
                    return pcIt->second != 0;
                }
                return !entry->GetMemPoolParentsConst().empty();
            };

    // Limit the number of attempts to add transactions to the block when it is
    // close to full; this is just a simple heuristic to finish quickly if the
    // mempool has a lot of entries.
    const int64_t MAX_CONSECUTIVE_FAILURES = 1000;
    int64_t nConsecutiveFailed = 0;

    // Transactions where a parent has been added and need to be checked for
    // inclusion.
    std::queue<CTxMemPoolEntryRef> backlog;
    auto mi = mempool.mapTx.get<modified_feerate>().begin();

    auto nextEntry = [&backlog, &mi](bool &isFromBacklog) {
        if (backlog.empty()) {
            return *mi++;
        }

        auto &entry = backlog.front();
        backlog.pop();

        isFromBacklog = true;

        return entry;
    };

    while (!backlog.empty() ||
           mi != mempool.mapTx.get<modified_feerate>().end()) {
        // Get a new or old transaction in mapTx to evaluate.
        bool isFromBacklog = false;
        const CTxMemPoolEntryRef &entry = nextEntry(isFromBacklog);

        if (blockFitter.isBelowBlockMinFeeRate(entry->GetModifiedFeeRate())) {
            // Since the txs are sorted by fee, bail early if there is none that
            // can be included in the block anymore.
            break;
        }

        // Check whether all of this tx's parents are already in the block. If
        // not, pass on it until later.
        //
        // If it's from the backlog, then we know all parents are already in
        // the block.
        if (!isFromBacklog && hasMissingParents(entry)) {
            skippedChildren.insert(entry);
            continue;
        }

        // Check whether the tx will exceed the block limits.
        if (!blockFitter.testTxFits(entry->GetTxSize(),
                                    entry->GetSigChecks())) {
            ++nConsecutiveFailed;
            if (nConsecutiveFailed > MAX_CONSECUTIVE_FAILURES &&
                blockFitter.nBlockSize >
                    blockFitter.getMaxGeneratedBlockSize() - 1000) {
                // Give up if we're close to full and haven't succeeded in a
                // while.
                break;
            }
            continue;
        }

        // Test transaction finality (locktime)
        if (!CheckTx(entry->GetTx())) {
            continue;
        }

        // This transaction will make it in; reset the failed counter.
        nConsecutiveFailed = 0;

        // Tx can be added.
        AddToBlock(entry);

        // This tx's children may now be candidates for addition if they have
        // higher scores than the tx at the cursor. We can only process a
        // child once all of that tx's parents have been added, though. To
        // avoid O(n^2) checking of dependencies, we store and decrement the
        // number of mempool parents for each child. Although this code
        // ends up taking O(n) time to process a single tx with n children,
        // that's okay because the amount of time taken is proportional to the
        // tx's byte size and fee paid.
        for (const auto &child : entry->GetMemPoolChildrenConst()) {
            // Remember this tx has missing parents.
            // Create the map entry if it doesn't exist already, and init with
            // the number of parents.
            const auto &[parentCount, _] = missingParentCount.try_emplace(
                child, child.get()->GetMemPoolParentsConst().size());
            // We just added one parent, so decrement the counter and check if
            // we have any missing parent remaining.
            const bool allParentsAdded = --parentCount->second == 0;

            // If all parents have been added to the block, and if this child
            // has been previously skipped due to missing parents, enqueue it
            // (if it hasn't been skipped it will come up in a later iteration)
            if (allParentsAdded && skippedChildren.count(child) > 0) {
                backlog.push(child);
            }
        }
    }
}
} // namespace node
