// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2018 The Bitcoin Core developers
// Copyright (c) 2017-2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <validation.h>

#include <arith_uint256.h>
#include <avalanche/processor.h>
#include <blockvalidity.h>
#include <chainparams.h>
#include <checkpoints.h>
#include <checkqueue.h>
#include <config.h>
#include <consensus/activation.h>
#include <consensus/merkle.h>
#include <consensus/tx_check.h>
#include <consensus/tx_verify.h>
#include <consensus/validation.h>
#include <hash.h>
#include <index/txindex.h>
#include <minerfund.h>
#include <policy/fees.h>
#include <policy/mempool.h>
#include <policy/policy.h>
#include <policy/settings.h>
#include <pow/aserti32d.h> // For ResetASERTAnchorBlockCache
#include <pow/pow.h>
#include <primitives/block.h>
#include <primitives/transaction.h>
#include <random.h>
#include <reverse_iterator.h>
#include <script/script.h>
#include <script/scriptcache.h>
#include <script/sigcache.h>
#include <shutdown.h>
#include <timedata.h>
#include <tinyformat.h>
#include <txdb.h>
#include <txmempool.h>
#include <ui_interface.h>
#include <undo.h>
#include <util/moneystr.h>
#include <util/strencodings.h>
#include <util/system.h>
#include <util/translation.h>
#include <util/validation.h>
#include <validationinterface.h>
#include <warnings.h>

#include <boost/algorithm/string/replace.hpp>
#include <boost/thread.hpp> // boost::this_thread::interruption_point() (mingw)

#include <string>
#include <thread>

#define MICRO 0.000001
#define MILLI 0.001

namespace {
BlockManager g_blockman;
} // namespace

static CChainState g_chainstate(g_blockman);

CChainState &ChainstateActive() {
    return g_chainstate;
}

CChain &ChainActive() {
    return g_chainstate.m_chain;
}

/**
 * Global state
 *
 * Mutex to guard access to validation specific variables, such as reading
 * or changing the chainstate.
 *
 * This may also need to be locked when updating the transaction pool, e.g. on
 * AcceptToMemoryPool. See CTxMemPool::cs comment for details.
 *
 * The transaction pool has a separate lock to allow reading from it and the
 * chainstate at the same time.
 */
RecursiveMutex cs_main;

CBlockIndex *pindexBestHeader = nullptr;
Mutex g_best_block_mutex;
std::condition_variable g_best_block_cv;
uint256 g_best_block;
std::atomic_bool fImporting(false);
std::atomic_bool fReindex(false);
bool fHavePruned = false;
bool fPruneMode = false;
bool fRequireStandard = true;
bool fCheckBlockIndex = false;
bool fCheckpointsEnabled = DEFAULT_CHECKPOINTS_ENABLED;
size_t nCoinCacheUsage = 5000 * 300;
uint64_t nPruneTarget = 0;
int64_t nMaxTipAge = DEFAULT_MAX_TIP_AGE;

BlockHash hashAssumeValid;
arith_uint256 nMinimumChainWork;

CFeeRate minRelayTxFee = CFeeRate(DEFAULT_MIN_RELAY_TX_FEE_PER_KB);

CTxMemPool g_mempool;

/** Constant stuff for coinbase transactions we create: */
CScript COINBASE_FLAGS;

// Internal stuff
namespace {
CBlockIndex *pindexBestInvalid = nullptr;
CBlockIndex *pindexBestParked = nullptr;
/**
 * The best finalized block.
 * This block cannot be reorged in any way except by explicit user action.
 */
CBlockIndex const *&pindexFinalized = ::ChainstateActive().pindexFinalized;

RecursiveMutex cs_LastBlockFile;
std::vector<CBlockFileInfo> vinfoBlockFile;
int nLastBlockFile = 0;
/**
 * Global flag to indicate we should check to see if there are block/undo files
 * that should be deleted. Set on startup or if we allocate more file space when
 * we're in prune mode.
 */
bool fCheckForPruning = false;

/** Dirty block index entries. */
std::set<const CBlockIndex *> setDirtyBlockIndex;

/** Dirty block file entries. */
std::set<int> setDirtyFileInfo;
} // namespace

BlockValidationOptions::BlockValidationOptions(const Config &config)
    : excessiveBlockSize(config.GetMaxBlockSize()), checkPoW(true),
      checkMerkleRoot(true) {}

CBlockIndex *LookupBlockIndex(const BlockHash &hash) {
    AssertLockHeld(cs_main);
    BlockMap::const_iterator it = g_blockman.m_block_index.find(hash);
    return it == g_blockman.m_block_index.end() ? nullptr : it->second;
}

CBlockIndex *FindForkInGlobalIndex(const CChain &chain,
                                   const CBlockLocator &locator) {
    AssertLockHeld(cs_main);

    // Find the first block the caller has in the main chain
    for (const BlockHash &hash : locator.vHave) {
        CBlockIndex *pindex = LookupBlockIndex(hash);
        if (pindex) {
            if (chain.Contains(pindex)) {
                return pindex;
            }
            if (pindex->GetAncestor(chain.Height()) == chain.Tip()) {
                return chain.Tip();
            }
        }
    }
    return chain.Genesis();
}

std::unique_ptr<CCoinsViewDB> pcoinsdbview;
std::unique_ptr<CCoinsViewCache> pcoinsTip;
std::unique_ptr<CBlockTreeDB> pblocktree;

// See definition for documentation
static void FindFilesToPruneManual(std::set<int> &setFilesToPrune,
                                   int nManualPruneHeight);
static void FindFilesToPrune(std::set<int> &setFilesToPrune,
                             uint64_t nPruneAfterHeight);
static FILE *OpenUndoFile(const FlatFilePos &pos, bool fReadOnly = false);
static FlatFileSeq BlockFileSeq();
static FlatFileSeq UndoFileSeq();
static uint32_t GetNextBlockScriptFlags(const Consensus::Params &params,
                                        const CBlockIndex *pindex);

bool TestLockPointValidity(const LockPoints *lp) {
    AssertLockHeld(cs_main);
    assert(lp);
    // If there are relative lock times then the maxInputBlock will be set
    // If there are no relative lock times, the LockPoints don't depend on the
    // chain
    if (lp->maxInputBlock) {
        // Check whether ::ChainActive() is an extension of the block at which
        // the LockPoints calculation was valid. If not LockPoints are no longer
        // valid.
        if (!::ChainActive().Contains(lp->maxInputBlock)) {
            return false;
        }
    }

    // LockPoints still valid
    return true;
}

bool CheckSequenceLocks(const CTxMemPool &pool, const CTransaction &tx,
                        int flags, LockPoints *lp, bool useExistingLockPoints) {
    AssertLockHeld(cs_main);
    AssertLockHeld(pool.cs);

    CBlockIndex *tip = ::ChainActive().Tip();
    assert(tip != nullptr);

    CBlockIndex index;
    index.pprev = tip;
    // CheckSequenceLocks() uses ::ChainActive().Height()+1 to evaluate height
    // based locks because when SequenceLocks() is called within ConnectBlock(),
    // the height of the block *being* evaluated is what is used. Thus if we
    // want to know if a transaction can be part of the *next* block, we need to
    // use one more than ::ChainActive().Height()
    index.nHeight = tip->nHeight + 1;

    std::pair<int, int64_t> lockPair;
    if (useExistingLockPoints) {
        assert(lp);
        lockPair.first = lp->height;
        lockPair.second = lp->time;
    } else {
        // pcoinsTip contains the UTXO set for ::ChainActive().Tip()
        CCoinsViewMemPool viewMemPool(pcoinsTip.get(), pool);
        std::vector<int> prevheights;
        prevheights.resize(tx.vin.size());
        for (size_t txinIndex = 0; txinIndex < tx.vin.size(); txinIndex++) {
            const CTxIn &txin = tx.vin[txinIndex];
            Coin coin;
            if (!viewMemPool.GetCoin(txin.prevout, coin)) {
                return error("%s: Missing input", __func__);
            }
            if (coin.GetHeight() == MEMPOOL_HEIGHT) {
                // Assume all mempool transaction confirm in the next block
                prevheights[txinIndex] = tip->nHeight + 1;
            } else {
                prevheights[txinIndex] = coin.GetHeight();
            }
        }
        lockPair = CalculateSequenceLocks(tx, flags, &prevheights, index);
        if (lp) {
            lp->height = lockPair.first;
            lp->time = lockPair.second;
            // Also store the hash of the block with the highest height of all
            // the blocks which have sequence locked prevouts. This hash needs
            // to still be on the chain for these LockPoint calculations to be
            // valid.
            // Note: It is impossible to correctly calculate a maxInputBlock if
            // any of the sequence locked inputs depend on unconfirmed txs,
            // except in the special case where the relative lock time/height is
            // 0, which is equivalent to no sequence lock. Since we assume input
            // height of tip+1 for mempool txs and test the resulting lockPair
            // from CalculateSequenceLocks against tip+1. We know
            // EvaluateSequenceLocks will fail if there was a non-zero sequence
            // lock on a mempool input, so we can use the return value of
            // CheckSequenceLocks to indicate the LockPoints validity.
            int maxInputHeight = 0;
            for (const int height : prevheights) {
                // Can ignore mempool inputs since we'll fail if they had
                // non-zero locks.
                if (height != tip->nHeight + 1) {
                    maxInputHeight = std::max(maxInputHeight, height);
                }
            }
            lp->maxInputBlock = tip->GetAncestor(maxInputHeight);
        }
    }
    return EvaluateSequenceLocks(index, lockPair);
}

// Command-line argument "-replayprotectionactivationtime=<timestamp>" will
// cause the node to switch to replay protected SigHash ForkID value when the
// median timestamp of the previous 11 blocks is greater than or equal to
// <timestamp>. Defaults to the pre-defined timestamp when not set.
static bool IsReplayProtectionEnabled(const Consensus::Params &params,
                                      int64_t nMedianTimePast) {
    return nMedianTimePast >= gArgs.GetArg("-replayprotectionactivationtime",
                                           params.tachyonActivationTime);
}

static bool IsReplayProtectionEnabled(const Consensus::Params &params,
                                      const CBlockIndex *pindexPrev) {
    if (pindexPrev == nullptr) {
        return false;
    }

    return IsReplayProtectionEnabled(params, pindexPrev->GetMedianTimePast());
}

// Used to avoid mempool polluting consensus critical paths if CCoinsViewMempool
// were somehow broken and returning the wrong scriptPubKeys
static bool CheckInputsFromMempoolAndCache(
    const CTransaction &tx, TxValidationState &state,
    const CCoinsViewCache &view, const CTxMemPool &pool, const uint32_t flags,
    bool cacheSigStore, PrecomputedTransactionData &txdata, int &nSigChecksOut)
    EXCLUSIVE_LOCKS_REQUIRED(cs_main) {
    AssertLockHeld(cs_main);

    // pool.cs should be locked already, but go ahead and re-take the lock here
    // to enforce that mempool doesn't change between when we check the view and
    // when we actually call through to CheckInputs
    LOCK(pool.cs);

    assert(!tx.IsCoinBase());
    for (const CTxIn &txin : tx.vin) {
        const Coin &coin = view.AccessCoin(txin.prevout);

        // At this point we haven't actually checked if the coins are all
        // available (or shouldn't assume we have, since CheckInputs does). So
        // we just return failure if the inputs are not available here, and then
        // only have to check equivalence for available inputs.
        if (coin.IsSpent()) {
            return false;
        }

        const CTransactionRef &txFrom = pool.get(txin.prevout.GetTxId());
        if (txFrom) {
            assert(txFrom->GetId() == txin.prevout.GetTxId());
            assert(txFrom->vout.size() > txin.prevout.GetN());
            assert(txFrom->vout[txin.prevout.GetN()] == coin.GetTxOut());
        } else {
            const Coin &coinFromDisk = pcoinsTip->AccessCoin(txin.prevout);
            assert(!coinFromDisk.IsSpent());
            assert(coinFromDisk.GetTxOut() == coin.GetTxOut());
        }
    }

    return CheckInputs(tx, state, view, true, flags, cacheSigStore, true,
                       txdata, nSigChecksOut);
}

/**
 * @param[out] coins_to_uncache   Return any outpoints which were not previously
 * present in the coins cache, but were added as a result of validating the tx
 *                                for mempool acceptance. This allows the caller
 * to optionally remove the cache additions if the associated transaction ends
 *                                up being rejected by the mempool.
 */
static bool AcceptToMemoryPoolWorker(
    const Config &config, CTxMemPool &pool, TxValidationState &state,
    const CTransactionRef &ptx, int64_t nAcceptTime, bool bypass_limits,
    const Amount nAbsurdFee, std::vector<COutPoint> &coins_to_uncache,
    bool test_accept) EXCLUSIVE_LOCKS_REQUIRED(cs_main) {
    AssertLockHeld(cs_main);

    const Consensus::Params &consensusParams =
        config.GetChainParams().GetConsensus();

    const CTransaction &tx = *ptx;
    const TxId txid = tx.GetId();

    // mempool "read lock" (held through
    // GetMainSignals().TransactionAddedToMempool())
    LOCK(pool.cs);

    // Coinbase is only valid in a block, not as a loose transaction.
    if (!CheckRegularTransaction(tx, state)) {
        // state filled in by CheckRegularTransaction.
        return false;
    }

    // Rather not work on nonstandard transactions (unless -testnet)
    std::string reason;
    if (fRequireStandard && !IsStandardTx(tx, reason)) {
        return state.Invalid(TxValidationResult::TX_NOT_STANDARD,
                             REJECT_NONSTANDARD, reason);
    }

    // Only accept nLockTime-using transactions that can be mined in the next
    // block; we don't want our mempool filled up with transactions that can't
    // be mined yet.
    TxValidationState ctxState;
    if (!ContextualCheckTransactionForCurrentBlock(
            consensusParams, tx, ctxState, STANDARD_LOCKTIME_VERIFY_FLAGS)) {
        // We copy the state from a dummy to ensure we don't increase the
        // ban score of peer for transaction that could be valid in the future.
        return state.Invalid(TxValidationResult::TX_PREMATURE_SPEND,
                             REJECT_NONSTANDARD, ctxState.GetRejectReason(),
                             ctxState.GetDebugMessage());
    }

    // Is it already in the memory pool?
    if (pool.exists(txid)) {
        return state.Invalid(TxValidationResult::TX_CONFLICT, REJECT_DUPLICATE,
                             "txn-already-in-mempool");
    }

    // Check for conflicts with in-memory transactions
    for (const CTxIn &txin : tx.vin) {
        auto itConflicting = pool.mapNextTx.find(txin.prevout);
        if (itConflicting != pool.mapNextTx.end()) {
            // Disable replacement feature for good
            return state.Invalid(TxValidationResult::TX_MEMPOOL_POLICY,
                                 REJECT_DUPLICATE, "txn-mempool-conflict");
        }
    }

    {
        CCoinsView dummy;
        CCoinsViewCache view(&dummy);

        LockPoints lp;
        CCoinsViewMemPool viewMemPool(pcoinsTip.get(), pool);
        view.SetBackend(viewMemPool);

        // Do all inputs exist?
        for (const CTxIn &txin : tx.vin) {
            if (!pcoinsTip->HaveCoinInCache(txin.prevout)) {
                coins_to_uncache.push_back(txin.prevout);
            }

            // Note: this call may add txin.prevout to the coins cache
            // (pcoinsTip.cacheCoins) by way of FetchCoin(). It should be
            // removed later (via coins_to_uncache) if this tx turns out to be
            // invalid.
            if (!view.HaveCoin(txin.prevout)) {
                // Are inputs missing because we already have the tx?
                for (size_t out = 0; out < tx.vout.size(); out++) {
                    // Optimistically just do efficient check of cache for
                    // outputs.
                    if (pcoinsTip->HaveCoinInCache(COutPoint(txid, out))) {
                        return state.Invalid(TxValidationResult::TX_CONFLICT,
                                             REJECT_DUPLICATE,
                                             "txn-already-known");
                    }
                }

                // Otherwise assume this might be an orphan tx for which we just
                // haven't seen parents yet.
                return state.Invalid(TxValidationResult::TX_MISSING_INPUTS,
                                     REJECT_INVALID,
                                     "bad-txns-inputs-missingorspent");
            }
        }

        // Are the actual inputs available?
        if (!view.HaveInputs(tx)) {
            return state.Invalid(TxValidationResult::TX_MEMPOOL_POLICY,
                                 REJECT_DUPLICATE, "bad-txns-inputs-spent");
        }

        // Bring the best block into scope.
        view.GetBestBlock();

        // We have all inputs cached now, so switch back to dummy, so we don't
        // need to keep lock on mempool.
        view.SetBackend(dummy);

        // Only accept BIP68 sequence locked transactions that can be mined in
        // the next block; we don't want our mempool filled up with transactions
        // that can't be mined yet. Must keep pool.cs for this unless we change
        // CheckSequenceLocks to take a CoinsViewCache instead of create its
        // own.
        if (!CheckSequenceLocks(pool, tx, STANDARD_LOCKTIME_VERIFY_FLAGS,
                                &lp)) {
            return state.Invalid(TxValidationResult::TX_PREMATURE_SPEND,
                                 REJECT_NONSTANDARD, "non-BIP68-final");
        }

        Amount nFees = Amount::zero();
        if (!Consensus::CheckTxInputs(tx, state, view, GetSpendHeight(view),
                                      nFees)) {
            return error("%s: Consensus::CheckTxInputs: %s, %s", __func__,
                         tx.GetId().ToString(), FormatStateMessage(state));
        }

        const uint32_t nextBlockScriptVerifyFlags =
            GetNextBlockScriptFlags(consensusParams, ::ChainActive().Tip());

        // Check for non-standard pay-to-script-hash in inputs
        if (fRequireStandard &&
            !AreInputsStandard(tx, view, nextBlockScriptVerifyFlags)) {
            return state.Invalid(TxValidationResult::TX_NOT_STANDARD,
                                 REJECT_NONSTANDARD,
                                 "bad-txns-nonstandard-inputs");
        }

        // nModifiedFees includes any fee deltas from PrioritiseTransaction
        Amount nModifiedFees = nFees;
        pool.ApplyDelta(txid, nModifiedFees);

        // Keep track of transactions that spend a coinbase, which we re-scan
        // during reorgs to ensure COINBASE_MATURITY is still met.
        bool fSpendsCoinbase = false;
        for (const CTxIn &txin : tx.vin) {
            const Coin &coin = view.AccessCoin(txin.prevout);
            if (coin.IsCoinBase()) {
                fSpendsCoinbase = true;
                break;
            }
        }

        unsigned int nSize = tx.GetTotalSize();

        // No transactions are allowed below minRelayTxFee except from
        // disconnected blocks.
        // Do not change this to use virtualsize without coordinating a network
        // policy upgrade.
        if (!bypass_limits && nModifiedFees < minRelayTxFee.GetFee(nSize)) {
            return state.Invalid(TxValidationResult::TX_MEMPOOL_POLICY,
                                 REJECT_INSUFFICIENTFEE,
                                 "min relay fee not met");
        }

        if (nAbsurdFee != Amount::zero() && nFees > nAbsurdFee) {
            return state.Invalid(TxValidationResult::TX_NOT_STANDARD,
                                 REJECT_HIGHFEE, "absurdly-high-fee",
                                 strprintf("%d > %d", nFees, nAbsurdFee));
        }

        // Validate input scripts against standard script flags.
        const uint32_t scriptVerifyFlags =
            nextBlockScriptVerifyFlags | STANDARD_SCRIPT_VERIFY_FLAGS;
        PrecomputedTransactionData txdata(tx);
        int nSigChecksStandard;
        if (!CheckInputs(tx, state, view, true, scriptVerifyFlags, true, false,
                         txdata, nSigChecksStandard)) {
            // State filled in by CheckInputs.
            return false;
        }

        CTxMemPoolEntry entry(ptx, nFees, nAcceptTime, ::ChainActive().Height(),
                              fSpendsCoinbase, nSigChecksStandard, lp);

        unsigned int nVirtualSize = entry.GetTxVirtualSize();

        Amount mempoolRejectFee =
            pool.GetMinFee(
                    gArgs.GetArg("-maxmempool", DEFAULT_MAX_MEMPOOL_SIZE) *
                    1000000)
                .GetFee(nVirtualSize);
        if (!bypass_limits && mempoolRejectFee > Amount::zero() &&
            nModifiedFees < mempoolRejectFee) {
            return state.Invalid(
                TxValidationResult::TX_MEMPOOL_POLICY, REJECT_INSUFFICIENTFEE,
                "mempool min fee not met",
                strprintf("%d < %d", nModifiedFees, mempoolRejectFee));
        }

        // Calculate in-mempool ancestors, up to a limit.
        CTxMemPool::setEntries setAncestors;
        size_t nLimitAncestors =
            gArgs.GetArg("-limitancestorcount", DEFAULT_ANCESTOR_LIMIT);
        size_t nLimitAncestorSize =
            gArgs.GetArg("-limitancestorsize", DEFAULT_ANCESTOR_SIZE_LIMIT) *
            1000;
        size_t nLimitDescendants =
            gArgs.GetArg("-limitdescendantcount", DEFAULT_DESCENDANT_LIMIT);
        size_t nLimitDescendantSize =
            gArgs.GetArg("-limitdescendantsize",
                         DEFAULT_DESCENDANT_SIZE_LIMIT) *
            1000;
        std::string errString;
        if (!pool.CalculateMemPoolAncestors(
                entry, setAncestors, nLimitAncestors, nLimitAncestorSize,
                nLimitDescendants, nLimitDescendantSize, errString)) {
            return state.Invalid(TxValidationResult::TX_MEMPOOL_POLICY,
                                 REJECT_NONSTANDARD, "too-long-mempool-chain",
                                 errString);
        }

        // Check again against the next block's script verification flags
        // to cache our script execution flags.
        //
        // This is also useful in case of bugs in the standard flags that cause
        // transactions to pass as valid when they're actually invalid. For
        // instance the STRICTENC flag was incorrectly allowing certain CHECKSIG
        // NOT scripts to pass, even though they were invalid.
        //
        // There is a similar check in CreateNewBlock() to prevent creating
        // invalid blocks (using TestBlockValidity), however allowing such
        // transactions into the mempool can be exploited as a DoS attack.
        int nSigChecksConsensus;
        if (!CheckInputsFromMempoolAndCache(tx, state, view, pool,
                                            nextBlockScriptVerifyFlags, true,
                                            txdata, nSigChecksConsensus)) {
            // This can occur under some circumstances, if the node receives an
            // unrequested tx which is invalid due to new consensus rules not
            // being activated yet (during IBD).
            return error("%s: BUG! PLEASE REPORT THIS! CheckInputs failed "
                         "against next-block but not STANDARD flags %s, %s",
                         __func__, txid.ToString(), FormatStateMessage(state));
        }

        if (nSigChecksStandard != nSigChecksConsensus) {
            // We can't accept this transaction as we've used the standard count
            // for the mempool/mining, but the consensus count will be enforced
            // in validation (we don't want to produce bad block templates).
            return error(
                "%s: BUG! PLEASE REPORT THIS! SigChecks count differed between "
                "standard and consensus flags in %s",
                __func__, txid.ToString());
        }

        if (test_accept) {
            // Tx was accepted, but not added
            return true;
        }

        // Store transaction in memory.
        pool.addUnchecked(entry, setAncestors);

        // Trim mempool and check if tx was trimmed.
        if (!bypass_limits) {
            pool.LimitSize(
                gArgs.GetArg("-maxmempool", DEFAULT_MAX_MEMPOOL_SIZE) * 1000000,
                std::chrono::hours{
                    gArgs.GetArg("-mempoolexpiry", DEFAULT_MEMPOOL_EXPIRY)});
            if (!pool.exists(txid)) {
                return state.Invalid(TxValidationResult::TX_MEMPOOL_POLICY,
                                     REJECT_INSUFFICIENTFEE, "mempool full");
            }
        }
    }

    GetMainSignals().TransactionAddedToMempool(ptx);
    return true;
}

/**
 * (try to) add transaction to memory pool with a specified acceptance time.
 */
static bool
AcceptToMemoryPoolWithTime(const Config &config, CTxMemPool &pool,
                           TxValidationState &state, const CTransactionRef &tx,
                           int64_t nAcceptTime, bool bypass_limits,
                           const Amount nAbsurdFee, bool test_accept)
    EXCLUSIVE_LOCKS_REQUIRED(cs_main) {
    AssertLockHeld(cs_main);
    std::vector<COutPoint> coins_to_uncache;
    bool res = AcceptToMemoryPoolWorker(config, pool, state, tx, nAcceptTime,
                                        bypass_limits, nAbsurdFee,
                                        coins_to_uncache, test_accept);
    if (!res) {
        // Remove coins that were not present in the coins cache before calling
        // ATMPW; this is to prevent memory DoS in case we receive a large
        // number of invalid transactions that attempt to overrun the in-memory
        // coins cache
        // (`CCoinsViewCache::cacheCoins`).

        for (const COutPoint &outpoint : coins_to_uncache) {
            pcoinsTip->Uncache(outpoint);
        }
    }

    // After we've (potentially) uncached entries, ensure our coins cache is
    // still within its size limits
    BlockValidationState stateDummy;
    ::ChainstateActive().FlushStateToDisk(config.GetChainParams(), stateDummy,
                                          FlushStateMode::PERIODIC);
    return res;
}

bool AcceptToMemoryPool(const Config &config, CTxMemPool &pool,
                        TxValidationState &state, const CTransactionRef &tx,
                        bool bypass_limits, const Amount nAbsurdFee,
                        bool test_accept) {
    return AcceptToMemoryPoolWithTime(config, pool, state, tx, GetTime(),
                                      bypass_limits, nAbsurdFee, test_accept);
}

/**
 * Return transaction in txOut, and if it was found inside a block, its hash is
 * placed in hashBlock. If blockIndex is provided, the transaction is fetched
 * from the corresponding block.
 */
bool GetTransaction(const TxId &txid, CTransactionRef &txOut,
                    const Consensus::Params &params, BlockHash &hashBlock,
                    const CBlockIndex *const block_index) {
    LOCK(cs_main);

    if (block_index == nullptr) {
        CTransactionRef ptx = g_mempool.get(txid);
        if (ptx) {
            txOut = ptx;
            return true;
        }

        if (g_txindex) {
            return g_txindex->FindTx(txid, hashBlock, txOut);
        }
    } else {
        CBlock block;
        if (ReadBlockFromDisk(block, block_index, params)) {
            for (const auto &tx : block.vtx) {
                if (tx->GetId() == txid) {
                    txOut = tx;
                    hashBlock = block_index->GetBlockHash();
                    return true;
                }
            }
        }
    }

    return false;
}

//////////////////////////////////////////////////////////////////////////////
//
// CBlock and CBlockIndex
//

static bool WriteBlockToDisk(const CBlock &block, FlatFilePos &pos,
                             const CMessageHeader::MessageMagic &messageStart) {
    // Open history file to append
    CAutoFile fileout(OpenBlockFile(pos), SER_DISK, CLIENT_VERSION);
    if (fileout.IsNull()) {
        return error("WriteBlockToDisk: OpenBlockFile failed");
    }

    // Write index header
    unsigned int nSize = GetSerializeSize(block, fileout.GetVersion());
    fileout << messageStart << nSize;

    // Write block
    long fileOutPos = ftell(fileout.Get());
    if (fileOutPos < 0) {
        return error("WriteBlockToDisk: ftell failed");
    }

    pos.nPos = (unsigned int)fileOutPos;
    fileout << block;

    return true;
}

bool ReadBlockFromDisk(CBlock &block, const FlatFilePos &pos,
                       const Consensus::Params &params) {
    block.SetNull();

    // Open history file to read
    CAutoFile filein(OpenBlockFile(pos, true), SER_DISK, CLIENT_VERSION);
    if (filein.IsNull()) {
        return error("ReadBlockFromDisk: OpenBlockFile failed for %s",
                     pos.ToString());
    }

    // Read block
    try {
        filein >> block;
    } catch (const std::exception &e) {
        return error("%s: Deserialize or I/O error - %s at %s", __func__,
                     e.what(), pos.ToString());
    }

    // Check the header
    if (!CheckProofOfWork(block.GetHash(), block.nBits, params)) {
        return error("ReadBlockFromDisk: Errors in block header at %s",
                     pos.ToString());
    }

    return true;
}

bool ReadBlockFromDisk(CBlock &block, const CBlockIndex *pindex,
                       const Consensus::Params &params) {
    FlatFilePos blockPos;
    {
        LOCK(cs_main);
        blockPos = pindex->GetBlockPos();
    }

    if (!ReadBlockFromDisk(block, blockPos, params)) {
        return false;
    }

    if (block.GetHash() != pindex->GetBlockHash()) {
        return error("ReadBlockFromDisk(CBlock&, CBlockIndex*): GetHash() "
                     "doesn't match index for %s at %s",
                     pindex->ToString(), pindex->GetBlockPos().ToString());
    }

    return true;
}

Amount GetBlockSubsidy(int nHeight, const Consensus::Params &consensusParams) {
    int halvings = nHeight / consensusParams.nSubsidyHalvingInterval;
    // Force block reward to zero when right shift is undefined.
    if (halvings >= 64) {
        return Amount::zero();
    }

    Amount nSubsidy = 50 * COIN;
    // Subsidy is cut in half every 210,000 blocks which will occur
    // approximately every 4 years.
    return ((nSubsidy / SATOSHI) >> halvings) * SATOSHI;
}

// Note that though this is marked const, we may end up modifying
// `m_cached_finished_ibd`, which is a performance-related implementation
// detail. This function must be marked `const` so that `CValidationInterface`
// clients (which are given a `const CChainState*`) can call it.
//
bool CChainState::IsInitialBlockDownload() const {
    // Optimization: pre-test latch before taking the lock.
    if (m_cached_finished_ibd.load(std::memory_order_relaxed)) {
        return false;
    }

    LOCK(cs_main);
    if (m_cached_finished_ibd.load(std::memory_order_relaxed)) {
        return false;
    }
    if (fImporting || fReindex) {
        return true;
    }
    if (m_chain.Tip() == nullptr) {
        return true;
    }
    if (m_chain.Tip()->nChainWork < nMinimumChainWork) {
        return true;
    }
    if (m_chain.Tip()->GetBlockTime() < (GetTime() - nMaxTipAge)) {
        return true;
    }
    LogPrintf("Leaving InitialBlockDownload (latching to false)\n");
    m_cached_finished_ibd.store(true, std::memory_order_relaxed);
    return false;
}

static CBlockIndex const *pindexBestForkTip = nullptr;
static CBlockIndex const *pindexBestForkBase = nullptr;

BlockMap &BlockIndex() {
    return g_blockman.m_block_index;
}

static void AlertNotify(const std::string &strMessage) {
    uiInterface.NotifyAlertChanged();
#if defined(HAVE_SYSTEM)
    std::string strCmd = gArgs.GetArg("-alertnotify", "");
    if (strCmd.empty()) {
        return;
    }

    // Alert text should be plain ascii coming from a trusted source, but to be
    // safe we first strip anything not in safeChars, then add single quotes
    // around the whole string before passing it to the shell:
    std::string singleQuote("'");
    std::string safeStatus = SanitizeString(strMessage);
    safeStatus = singleQuote + safeStatus + singleQuote;
    boost::replace_all(strCmd, "%s", safeStatus);

    std::thread t(runCommand, strCmd);
    // thread runs free
    t.detach();
#endif
}

static void CheckForkWarningConditions() EXCLUSIVE_LOCKS_REQUIRED(cs_main) {
    AssertLockHeld(cs_main);
    // Before we get past initial download, we cannot reliably alert about forks
    // (we assume we don't get stuck on a fork before finishing our initial
    // sync)
    if (::ChainstateActive().IsInitialBlockDownload()) {
        return;
    }

    // If our best fork is no longer within 72 blocks (+/- 12 hours if no one
    // mines it) of our head, drop it
    if (pindexBestForkTip &&
        ::ChainActive().Height() - pindexBestForkTip->nHeight >= 72) {
        pindexBestForkTip = nullptr;
    }

    if (pindexBestForkTip ||
        (pindexBestInvalid &&
         pindexBestInvalid->nChainWork >
             ::ChainActive().Tip()->nChainWork +
                 (GetBlockProof(*::ChainActive().Tip()) * 6))) {
        if (!GetfLargeWorkForkFound() && pindexBestForkBase) {
            std::string warning =
                std::string("'Warning: Large-work fork detected, forking after "
                            "block ") +
                pindexBestForkBase->phashBlock->ToString() + std::string("'");
            AlertNotify(warning);
        }

        if (pindexBestForkTip && pindexBestForkBase) {
            LogPrintf("%s: Warning: Large fork found\n  forking the "
                      "chain at height %d (%s)\n  lasting to height %d "
                      "(%s).\nChain state database corruption likely.\n",
                      __func__, pindexBestForkBase->nHeight,
                      pindexBestForkBase->phashBlock->ToString(),
                      pindexBestForkTip->nHeight,
                      pindexBestForkTip->phashBlock->ToString());
            SetfLargeWorkForkFound(true);
        } else {
            LogPrintf("%s: Warning: Found invalid chain at least ~6 blocks "
                      "longer than our best chain.\nChain state database "
                      "corruption likely.\n",
                      __func__);
            SetfLargeWorkInvalidChainFound(true);
        }
    } else {
        SetfLargeWorkForkFound(false);
        SetfLargeWorkInvalidChainFound(false);
    }
}

static void CheckForkWarningConditionsOnNewFork(CBlockIndex *pindexNewForkTip)
    EXCLUSIVE_LOCKS_REQUIRED(cs_main) {
    AssertLockHeld(cs_main);
    // If we are on a fork that is sufficiently large, set a warning flag.
    const CBlockIndex *pfork = ::ChainActive().FindFork(pindexNewForkTip);

    // We define a condition where we should warn the user about as a fork of at
    // least 7 blocks with a tip within 72 blocks (+/- 12 hours if no one mines
    // it) of ours. We use 7 blocks rather arbitrarily as it represents just
    // under 10% of sustained network hash rate operating on the fork, or a
    // chain that is entirely longer than ours and invalid (note that this
    // should be detected by both). We define it this way because it allows us
    // to only store the highest fork tip (+ base) which meets the 7-block
    // condition and from this always have the most-likely-to-cause-warning fork
    if (pfork &&
        (!pindexBestForkTip ||
         pindexNewForkTip->nHeight > pindexBestForkTip->nHeight) &&
        pindexNewForkTip->nChainWork - pfork->nChainWork >
            (GetBlockProof(*pfork) * 7) &&
        ::ChainActive().Height() - pindexNewForkTip->nHeight < 72) {
        pindexBestForkTip = pindexNewForkTip;
        pindexBestForkBase = pfork;
    }

    CheckForkWarningConditions();
}

static void InvalidChainFound(CBlockIndex *pindexNew)
    EXCLUSIVE_LOCKS_REQUIRED(cs_main) {
    AssertLockHeld(cs_main);
    if (!pindexBestInvalid ||
        pindexNew->nChainWork > pindexBestInvalid->nChainWork) {
        pindexBestInvalid = pindexNew;
    }

    // If the invalid chain found is supposed to be finalized, we need to move
    // back the finalization point.
    if (IsBlockFinalized(pindexNew)) {
        pindexFinalized = pindexNew->pprev;
    }

    LogPrintf("%s: invalid block=%s  height=%d  log2_work=%.8g  date=%s\n",
              __func__, pindexNew->GetBlockHash().ToString(),
              pindexNew->nHeight,
              log(pindexNew->nChainWork.getdouble()) / log(2.0),
              FormatISO8601DateTime(pindexNew->GetBlockTime()));
    CBlockIndex *tip = ::ChainActive().Tip();
    assert(tip);
    LogPrintf("%s:  current best=%s  height=%d  log2_work=%.8g  date=%s\n",
              __func__, tip->GetBlockHash().ToString(),
              ::ChainActive().Height(),
              log(tip->nChainWork.getdouble()) / log(2.0),
              FormatISO8601DateTime(tip->GetBlockTime()));
}

void CChainState::InvalidBlockFound(CBlockIndex *pindex,
                                    const BlockValidationState &state) {
    if (state.GetResult() != BlockValidationResult::BLOCK_MUTATED) {
        pindex->nStatus = pindex->nStatus.withFailed();
        m_blockman.m_failed_blocks.insert(pindex);
        setDirtyBlockIndex.insert(pindex);
        InvalidChainFound(pindex);
    }
}

void SpendCoins(CCoinsViewCache &view, const CTransaction &tx, CTxUndo &txundo,
                int nHeight) {
    // Mark inputs spent.
    if (tx.IsCoinBase()) {
        return;
    }

    txundo.vprevout.reserve(tx.vin.size());
    for (const CTxIn &txin : tx.vin) {
        txundo.vprevout.emplace_back();
        bool is_spent = view.SpendCoin(txin.prevout, &txundo.vprevout.back());
        assert(is_spent);
    }
}

void UpdateCoins(CCoinsViewCache &view, const CTransaction &tx, CTxUndo &txundo,
                 int nHeight) {
    SpendCoins(view, tx, txundo, nHeight);
    AddCoins(view, tx, nHeight);
}

void UpdateCoins(CCoinsViewCache &view, const CTransaction &tx, int nHeight) {
    // Mark inputs spent.
    if (!tx.IsCoinBase()) {
        for (const CTxIn &txin : tx.vin) {
            bool is_spent = view.SpendCoin(txin.prevout);
            assert(is_spent);
        }
    }

    // Add outputs.
    AddCoins(view, tx, nHeight);
}

bool CScriptCheck::operator()() {
    const CScript &scriptSig = ptxTo->vin[nIn].scriptSig;
    if (!VerifyScript(scriptSig, m_tx_out.scriptPubKey, nFlags,
                      CachingTransactionSignatureChecker(
                          ptxTo, nIn, m_tx_out.nValue, cacheStore, txdata),
                      metrics, &error)) {
        return false;
    }
    if ((pTxLimitSigChecks &&
         !pTxLimitSigChecks->consume_and_check(metrics.nSigChecks)) ||
        (pBlockLimitSigChecks &&
         !pBlockLimitSigChecks->consume_and_check(metrics.nSigChecks))) {
        // we can't assign a meaningful script error (since the script
        // succeeded), but remove the ScriptError::OK which could be
        // misinterpreted.
        error = ScriptError::SIGCHECKS_LIMIT_EXCEEDED;
        return false;
    }
    return true;
}

int GetSpendHeight(const CCoinsViewCache &inputs) {
    LOCK(cs_main);
    CBlockIndex *pindexPrev = LookupBlockIndex(inputs.GetBestBlock());
    return pindexPrev->nHeight + 1;
}

bool CheckInputs(const CTransaction &tx, TxValidationState &state,
                 const CCoinsViewCache &inputs, bool fScriptChecks,
                 const uint32_t flags, bool sigCacheStore,
                 bool scriptCacheStore,
                 const PrecomputedTransactionData &txdata, int &nSigChecksOut,
                 TxSigCheckLimiter &txLimitSigChecks,
                 CheckInputsLimiter *pBlockLimitSigChecks,
                 std::vector<CScriptCheck> *pvChecks) {
    AssertLockHeld(cs_main);
    assert(!tx.IsCoinBase());

    if (pvChecks) {
        pvChecks->reserve(tx.vin.size());
    }

    // Skip script verification when connecting blocks under the assumevalid
    // block. Assuming the assumevalid block is valid this is safe because
    // block merkle hashes are still computed and checked, of course, if an
    // assumed valid block is invalid due to false scriptSigs this optimization
    // would allow an invalid chain to be accepted.
    if (!fScriptChecks) {
        return true;
    }

    // First check if script executions have been cached with the same flags.
    // Note that this assumes that the inputs provided are correct (ie that the
    // transaction hash which is in tx's prevouts properly commits to the
    // scriptPubKey in the inputs view of that transaction).
    ScriptCacheKey hashCacheEntry(tx, flags);
    if (IsKeyInScriptCache(hashCacheEntry, !scriptCacheStore, nSigChecksOut)) {
        if (!txLimitSigChecks.consume_and_check(nSigChecksOut) ||
            (pBlockLimitSigChecks &&
             !pBlockLimitSigChecks->consume_and_check(nSigChecksOut))) {
            return state.Invalid(TxValidationResult::TX_CONSENSUS,
                                 REJECT_INVALID, "too-many-sigchecks");
        }
        return true;
    }

    int nSigChecksTotal = 0;

    for (size_t i = 0; i < tx.vin.size(); i++) {
        const COutPoint &prevout = tx.vin[i].prevout;
        const Coin &coin = inputs.AccessCoin(prevout);
        assert(!coin.IsSpent());

        // We very carefully only pass in things to CScriptCheck which are
        // clearly committed to by tx's hash. This provides a sanity
        // check that our caching is not introducing consensus failures through
        // additional data in, eg, the coins being spent being checked as a part
        // of CScriptCheck.

        // Verify signature
        CScriptCheck check(coin.GetTxOut(), tx, i, flags, sigCacheStore, txdata,
                           &txLimitSigChecks, pBlockLimitSigChecks);
        if (pvChecks) {
            pvChecks->push_back(std::move(check));
        } else if (!check()) {
            ScriptError scriptError = check.GetScriptError();
            // Compute flags without the optional standardness flags.
            // This differs from MANDATORY_SCRIPT_VERIFY_FLAGS as it contains
            // additional upgrade flags (see AcceptToMemoryPoolWorker variable
            // extraFlags).
            uint32_t mandatoryFlags =
                flags & ~STANDARD_NOT_MANDATORY_VERIFY_FLAGS;
            if (flags != mandatoryFlags) {
                // Check whether the failure was caused by a non-mandatory
                // script verification check. If so, ensure we return
                // NOT_STANDARD instead of CONSENSUS to avoid downstream users
                // splitting the network between upgraded and non-upgraded nodes
                // by banning CONSENSUS-failing data providers.
                CScriptCheck check2(coin.GetTxOut(), tx, i, mandatoryFlags,
                                    sigCacheStore, txdata);
                if (check2()) {
                    return state.Invalid(
                        TxValidationResult::TX_NOT_STANDARD, REJECT_NONSTANDARD,
                        strprintf("non-mandatory-script-verify-flag (%s)",
                                  ScriptErrorString(scriptError)));
                }
                // update the error message to reflect the mandatory violation.
                scriptError = check2.GetScriptError();
            }

            // MANDATORY flag failures correspond to
            // TxValidationResult::TX_CONSENSUS. Because CONSENSUS failures
            // are the most serious case of validation failures, we may need to
            // consider using RECENT_CONSENSUS_CHANGE for any script failure
            // that could be due to non-upgraded nodes which we may want to
            // support, to avoid splitting the network (but this depends on the
            // details of how net_processing handles such errors).
            return state.Invalid(
                TxValidationResult::TX_CONSENSUS, REJECT_INVALID,
                strprintf("mandatory-script-verify-flag-failed (%s)",
                          ScriptErrorString(scriptError)));
        }

        nSigChecksTotal += check.GetScriptExecutionMetrics().nSigChecks;
    }

    nSigChecksOut = nSigChecksTotal;

    if (scriptCacheStore && !pvChecks) {
        // We executed all of the provided scripts, and were told to cache the
        // result. Do so now.
        AddKeyInScriptCache(hashCacheEntry, nSigChecksTotal);
    }

    return true;
}

static bool UndoWriteToDisk(const CBlockUndo &blockundo, FlatFilePos &pos,
                            const BlockHash &hashBlock,
                            const CMessageHeader::MessageMagic &messageStart) {
    // Open history file to append
    CAutoFile fileout(OpenUndoFile(pos), SER_DISK, CLIENT_VERSION);
    if (fileout.IsNull()) {
        return error("%s: OpenUndoFile failed", __func__);
    }

    // Write index header
    unsigned int nSize = GetSerializeSize(blockundo, fileout.GetVersion());
    fileout << messageStart << nSize;

    // Write undo data
    long fileOutPos = ftell(fileout.Get());
    if (fileOutPos < 0) {
        return error("%s: ftell failed", __func__);
    }
    pos.nPos = (unsigned int)fileOutPos;
    fileout << blockundo;

    // calculate & write checksum
    CHashWriter hasher(SER_GETHASH, PROTOCOL_VERSION);
    hasher << hashBlock;
    hasher << blockundo;
    fileout << hasher.GetHash();

    return true;
}

bool UndoReadFromDisk(CBlockUndo &blockundo, const CBlockIndex *pindex) {
    FlatFilePos pos = pindex->GetUndoPos();
    if (pos.IsNull()) {
        return error("%s: no undo data available", __func__);
    }

    // Open history file to read
    CAutoFile filein(OpenUndoFile(pos, true), SER_DISK, CLIENT_VERSION);
    if (filein.IsNull()) {
        return error("%s: OpenUndoFile failed", __func__);
    }

    // Read block
    uint256 hashChecksum;
    // We need a CHashVerifier as reserializing may lose data
    CHashVerifier<CAutoFile> verifier(&filein);
    try {
        verifier << pindex->pprev->GetBlockHash();
        verifier >> blockundo;
        filein >> hashChecksum;
    } catch (const std::exception &e) {
        return error("%s: Deserialize or I/O error - %s", __func__, e.what());
    }

    // Verify checksum
    if (hashChecksum != verifier.GetHash()) {
        return error("%s: Checksum mismatch", __func__);
    }

    return true;
}

/** Abort with a message */
static bool AbortNode(const std::string &strMessage,
                      const std::string &userMessage = "",
                      unsigned int prefix = 0) {
    SetMiscWarning(strMessage);
    LogPrintf("*** %s\n", strMessage);
    if (!userMessage.empty()) {
        uiInterface.ThreadSafeMessageBox(
            userMessage, "", CClientUIInterface::MSG_ERROR | prefix);
    } else {
        uiInterface.ThreadSafeMessageBox(
            _("Error: A fatal internal error occurred, see debug.log for "
              "details")
                .translated,
            "",
            CClientUIInterface::MSG_ERROR | CClientUIInterface::MSG_NOPREFIX);
    }
    StartShutdown();
    return false;
}

static bool AbortNode(BlockValidationState &state,
                      const std::string &strMessage,
                      const std::string &userMessage = "",
                      unsigned int prefix = 0) {
    AbortNode(strMessage, userMessage, prefix);
    return state.Error(strMessage);
}

/** Restore the UTXO in a Coin at a given COutPoint. */
DisconnectResult UndoCoinSpend(const Coin &undo, CCoinsViewCache &view,
                               const COutPoint &out) {
    bool fClean = true;

    if (view.HaveCoin(out)) {
        // Overwriting transaction output.
        fClean = false;
    }

    if (undo.GetHeight() == 0) {
        // Missing undo metadata (height and coinbase). Older versions included
        // this information only in undo records for the last spend of a
        // transactions' outputs. This implies that it must be present for some
        // other output of the same tx.
        const Coin &alternate = AccessByTxid(view, out.GetTxId());
        if (alternate.IsSpent()) {
            // Adding output for transaction without known metadata
            return DisconnectResult::FAILED;
        }

        // This is somewhat ugly, but hopefully utility is limited. This is only
        // useful when working from legacy on disck data. In any case, putting
        // the correct information in there doesn't hurt.
        const_cast<Coin &>(undo) = Coin(undo.GetTxOut(), alternate.GetHeight(),
                                        alternate.IsCoinBase());
    }

    // The potential_overwrite parameter to AddCoin is only allowed to be false
    // if we know for sure that the coin did not already exist in the cache. As
    // we have queried for that above using HaveCoin, we don't need to guess.
    // When fClean is false, a coin already existed and it is an overwrite.
    view.AddCoin(out, std::move(undo), !fClean);

    return fClean ? DisconnectResult::OK : DisconnectResult::UNCLEAN;
}

/**
 * Undo the effects of this block (with given index) on the UTXO set represented
 * by coins. When FAILED is returned, view is left in an indeterminate state.
 */
DisconnectResult CChainState::DisconnectBlock(const CBlock &block,
                                              const CBlockIndex *pindex,
                                              CCoinsViewCache &view) {
    CBlockUndo blockUndo;
    if (!UndoReadFromDisk(blockUndo, pindex)) {
        error("DisconnectBlock(): failure reading undo data");
        return DisconnectResult::FAILED;
    }

    return ApplyBlockUndo(blockUndo, block, pindex, view);
}

DisconnectResult ApplyBlockUndo(const CBlockUndo &blockUndo,
                                const CBlock &block, const CBlockIndex *pindex,
                                CCoinsViewCache &view) {
    bool fClean = true;

    if (blockUndo.vtxundo.size() + 1 != block.vtx.size()) {
        error("DisconnectBlock(): block and undo data inconsistent");
        return DisconnectResult::FAILED;
    }

    // First, restore inputs.
    for (size_t i = 1; i < block.vtx.size(); i++) {
        const CTransaction &tx = *(block.vtx[i]);
        const CTxUndo &txundo = blockUndo.vtxundo[i - 1];
        if (txundo.vprevout.size() != tx.vin.size()) {
            error("DisconnectBlock(): transaction and undo data inconsistent");
            return DisconnectResult::FAILED;
        }

        for (size_t j = 0; j < tx.vin.size(); j++) {
            const COutPoint &out = tx.vin[j].prevout;
            const Coin &undo = txundo.vprevout[j];
            DisconnectResult res = UndoCoinSpend(undo, view, out);
            if (res == DisconnectResult::FAILED) {
                return DisconnectResult::FAILED;
            }
            fClean = fClean && res != DisconnectResult::UNCLEAN;
        }
    }

    // Second, revert created outputs.
    for (const auto &ptx : block.vtx) {
        const CTransaction &tx = *ptx;
        const TxId &txid = tx.GetId();
        const bool is_coinbase = tx.IsCoinBase();

        // Check that all outputs are available and match the outputs in the
        // block itself exactly.
        for (size_t o = 0; o < tx.vout.size(); o++) {
            if (tx.vout[o].scriptPubKey.IsUnspendable()) {
                continue;
            }

            COutPoint out(txid, o);
            Coin coin;
            bool is_spent = view.SpendCoin(out, &coin);
            if (!is_spent || tx.vout[o] != coin.GetTxOut() ||
                uint32_t(pindex->nHeight) != coin.GetHeight() ||
                is_coinbase != coin.IsCoinBase()) {
                // transaction output mismatch
                fClean = false;
            }
        }
    }

    // Move best block pointer to previous block.
    view.SetBestBlock(block.hashPrevBlock);

    return fClean ? DisconnectResult::OK : DisconnectResult::UNCLEAN;
}

static void FlushBlockFile(bool fFinalize = false) {
    LOCK(cs_LastBlockFile);

    FlatFilePos block_pos_old(nLastBlockFile,
                              vinfoBlockFile[nLastBlockFile].nSize);
    FlatFilePos undo_pos_old(nLastBlockFile,
                             vinfoBlockFile[nLastBlockFile].nUndoSize);

    bool status = true;
    status &= BlockFileSeq().Flush(block_pos_old, fFinalize);
    status &= UndoFileSeq().Flush(undo_pos_old, fFinalize);
    if (!status) {
        AbortNode("Flushing block file to disk failed. This is likely the "
                  "result of an I/O error.");
    }
}

static bool FindUndoPos(BlockValidationState &state, int nFile,
                        FlatFilePos &pos, unsigned int nAddSize);

static bool WriteUndoDataForBlock(const CBlockUndo &blockundo,
                                  BlockValidationState &state,
                                  CBlockIndex *pindex,
                                  const CChainParams &chainparams) {
    // Write undo information to disk
    if (pindex->GetUndoPos().IsNull()) {
        FlatFilePos _pos;
        if (!FindUndoPos(state, pindex->nFile, _pos,
                         ::GetSerializeSize(blockundo, CLIENT_VERSION) + 40)) {
            return error("ConnectBlock(): FindUndoPos failed");
        }
        if (!UndoWriteToDisk(blockundo, _pos, pindex->pprev->GetBlockHash(),
                             chainparams.DiskMagic())) {
            return AbortNode(state, "Failed to write undo data");
        }

        // update nUndoPos in block index
        pindex->nUndoPos = _pos.nPos;
        pindex->nStatus = pindex->nStatus.withUndo();
        setDirtyBlockIndex.insert(pindex);
    }

    return true;
}

static CCheckQueue<CScriptCheck> scriptcheckqueue(128);

void ThreadScriptCheck(int worker_num) {
    util::ThreadRename(strprintf("scriptch.%i", worker_num));
    scriptcheckqueue.Thread();
}

VersionBitsCache versionbitscache GUARDED_BY(cs_main);

int32_t ComputeBlockVersion(const CBlockIndex *pindexPrev,
                            const Consensus::Params &params) {
    LOCK(cs_main);
    int32_t nVersion = VERSIONBITS_TOP_BITS;

    for (int i = 0; i < (int)Consensus::MAX_VERSION_BITS_DEPLOYMENTS; i++) {
        ThresholdState state = VersionBitsState(
            pindexPrev, params, static_cast<Consensus::DeploymentPos>(i),
            versionbitscache);
        if (state == ThresholdState::LOCKED_IN ||
            state == ThresholdState::STARTED) {
            nVersion |= VersionBitsMask(
                params, static_cast<Consensus::DeploymentPos>(i));
        }
    }

    // Clear the last 4 bits (miner fund activation).
    return nVersion & ~uint32_t(0x0f);
}

// Returns the script flags which should be checked for the block after
// the given block.
static uint32_t GetNextBlockScriptFlags(const Consensus::Params &params,
                                        const CBlockIndex *pindex) {
    uint32_t flags = SCRIPT_VERIFY_NONE;

    // Start enforcing P2SH (BIP16)
    if ((pindex->nHeight + 1) >= params.BIP16Height) {
        flags |= SCRIPT_VERIFY_P2SH;
    }

    // Start enforcing the DERSIG (BIP66) rule.
    if ((pindex->nHeight + 1) >= params.BIP66Height) {
        flags |= SCRIPT_VERIFY_DERSIG;
    }

    // Start enforcing CHECKLOCKTIMEVERIFY (BIP65) rule.
    if ((pindex->nHeight + 1) >= params.BIP65Height) {
        flags |= SCRIPT_VERIFY_CHECKLOCKTIMEVERIFY;
    }

    // Start enforcing CSV (BIP68, BIP112 and BIP113) rule.
    if ((pindex->nHeight + 1) >= params.CSVHeight) {
        flags |= SCRIPT_VERIFY_CHECKSEQUENCEVERIFY;
    }

    // If the UAHF is enabled, we start accepting replay protected txns
    if (IsUAHFenabled(params, pindex)) {
        flags |= SCRIPT_VERIFY_STRICTENC;
        flags |= SCRIPT_ENABLE_SIGHASH_FORKID;
    }

    // If the DAA HF is enabled, we start rejecting transaction that use a high
    // s in their signature. We also make sure that signature that are supposed
    // to fail (for instance in multisig or other forms of smart contracts) are
    // null.
    if (IsDAAEnabled(params, pindex)) {
        flags |= SCRIPT_VERIFY_LOW_S;
        flags |= SCRIPT_VERIFY_NULLFAIL;
    }

    // When the magnetic anomaly fork is enabled, we start accepting
    // transactions using the OP_CHECKDATASIG opcode and it's verify
    // alternative. We also start enforcing push only signatures and
    // clean stack.
    if (IsMagneticAnomalyEnabled(params, pindex)) {
        flags |= SCRIPT_VERIFY_CHECKDATASIG_SIGOPS;
        flags |= SCRIPT_VERIFY_SIGPUSHONLY;
        flags |= SCRIPT_VERIFY_CLEANSTACK;
    }

    if (IsGravitonEnabled(params, pindex)) {
        flags |= SCRIPT_ENABLE_SCHNORR_MULTISIG;
        flags |= SCRIPT_VERIFY_MINIMALDATA;
    }

    if (IsPhononEnabled(params, pindex)) {
        flags |= SCRIPT_ENFORCE_SIGCHECKS;
    }

    // We make sure this node will have replay protection during the next hard
    // fork.
    if (IsReplayProtectionEnabled(params, pindex)) {
        flags |= SCRIPT_ENABLE_REPLAY_PROTECTION;
    }

    return flags;
}

static int64_t nTimeCheck = 0;
static int64_t nTimeForks = 0;
static int64_t nTimeVerify = 0;
static int64_t nTimeConnect = 0;
static int64_t nTimeIndex = 0;
static int64_t nTimeCallbacks = 0;
static int64_t nTimeTotal = 0;
static int64_t nBlocksTotal = 0;

/**
 * Apply the effects of this block (with given index) on the UTXO set
 * represented by coins. Validity checks that depend on the UTXO set are also
 * done; ConnectBlock() can fail if those validity checks fail (among other
 * reasons).
 */
bool CChainState::ConnectBlock(const CBlock &block, BlockValidationState &state,
                               CBlockIndex *pindex, CCoinsViewCache &view,
                               const CChainParams &params,
                               BlockValidationOptions options,
                               bool fJustCheck) {
    AssertLockHeld(cs_main);
    assert(pindex);
    assert(*pindex->phashBlock == block.GetHash());
    int64_t nTimeStart = GetTimeMicros();

    const Consensus::Params &consensusParams = params.GetConsensus();

    // Check it again in case a previous version let a bad block in
    // NOTE: We don't currently (re-)invoke ContextualCheckBlock() or
    // ContextualCheckBlockHeader() here. This means that if we add a new
    // consensus rule that is enforced in one of those two functions, then we
    // may have let in a block that violates the rule prior to updating the
    // software, and we would NOT be enforcing the rule here. Fully solving
    // upgrade from one software version to the next after a consensus rule
    // change is potentially tricky and issue-specific.
    // Also, currently the rule against blocks more than 2 hours in the future
    // is enforced in ContextualCheckBlockHeader(); we wouldn't want to
    // re-enforce that rule here (at least until we make it impossible for
    // GetAdjustedTime() to go backward).
    if (!CheckBlock(block, state, consensusParams,
                    options.withCheckPoW(!fJustCheck)
                        .withCheckMerkleRoot(!fJustCheck))) {
        if (state.GetResult() == BlockValidationResult::BLOCK_MUTATED) {
            // We don't write down blocks to disk if they may have been
            // corrupted, so this should be impossible unless we're having
            // hardware problems.
            return AbortNode(state, "Corrupt block found indicating potential "
                                    "hardware failure; shutting down");
        }
        return error("%s: Consensus::CheckBlock: %s", __func__,
                     FormatStateMessage(state));
    }

    // Verify that the view's current state corresponds to the previous block
    BlockHash hashPrevBlock =
        pindex->pprev == nullptr ? BlockHash() : pindex->pprev->GetBlockHash();
    assert(hashPrevBlock == view.GetBestBlock());

    // Special case for the genesis block, skipping connection of its
    // transactions (its coinbase is unspendable)
    if (block.GetHash() == consensusParams.hashGenesisBlock) {
        if (!fJustCheck) {
            view.SetBestBlock(pindex->GetBlockHash());
        }

        return true;
    }

    nBlocksTotal++;

    bool fScriptChecks = true;
    if (!hashAssumeValid.IsNull()) {
        // We've been configured with the hash of a block which has been
        // externally verified to have a valid history. A suitable default value
        // is included with the software and updated from time to time. Because
        // validity relative to a piece of software is an objective fact these
        // defaults can be easily reviewed. This setting doesn't force the
        // selection of any particular chain but makes validating some faster by
        // effectively caching the result of part of the verification.
        BlockMap::const_iterator it =
            m_blockman.m_block_index.find(hashAssumeValid);
        if (it != m_blockman.m_block_index.end()) {
            if (it->second->GetAncestor(pindex->nHeight) == pindex &&
                pindexBestHeader->GetAncestor(pindex->nHeight) == pindex &&
                pindexBestHeader->nChainWork >= nMinimumChainWork) {
                // This block is a member of the assumed verified chain and an
                // ancestor of the best header. The equivalent time check
                // discourages hash power from extorting the network via DOS
                // attack into accepting an invalid block through telling users
                // they must manually set assumevalid. Requiring a software
                // change or burying the invalid block, regardless of the
                // setting, makes it hard to hide the implication of the demand.
                // This also avoids having release candidates that are hardly
                // doing any signature verification at all in testing without
                // having to artificially set the default assumed verified block
                // further back. The test against nMinimumChainWork prevents the
                // skipping when denied access to any chain at least as good as
                // the expected chain.
                fScriptChecks =
                    (GetBlockProofEquivalentTime(
                         *pindexBestHeader, *pindex, *pindexBestHeader,
                         consensusParams) <= 60 * 60 * 24 * 7 * 2);
            }
        }
    }

    int64_t nTime1 = GetTimeMicros();
    nTimeCheck += nTime1 - nTimeStart;
    LogPrint(BCLog::BENCH, "    - Sanity checks: %.2fms [%.2fs (%.2fms/blk)]\n",
             MILLI * (nTime1 - nTimeStart), nTimeCheck * MICRO,
             nTimeCheck * MILLI / nBlocksTotal);

    // Do not allow blocks that contain transactions which 'overwrite' older
    // transactions, unless those are already completely spent. If such
    // overwrites are allowed, coinbases and transactions depending upon those
    // can be duplicated to remove the ability to spend the first instance --
    // even after being sent to another address. See BIP30 and
    // http://r6.ca/blog/20120206T005236Z.html for more information. This logic
    // is not necessary for memory pool transactions, as AcceptToMemoryPool
    // already refuses previously-known transaction ids entirely. This rule was
    // originally applied to all blocks with a timestamp after March 15, 2012,
    // 0:00 UTC. Now that the whole chain is irreversibly beyond that time it is
    // applied to all blocks except the two in the chain that violate it. This
    // prevents exploiting the issue against nodes during their initial block
    // download.
    bool fEnforceBIP30 = !((pindex->nHeight == 91842 &&
                            pindex->GetBlockHash() ==
                                uint256S("0x00000000000a4d0a398161ffc163c503763"
                                         "b1f4360639393e0e4c8e300e0caec")) ||
                           (pindex->nHeight == 91880 &&
                            pindex->GetBlockHash() ==
                                uint256S("0x00000000000743f190a18c5577a3c2d2a1f"
                                         "610ae9601ac046a38084ccb7cd721")));

    // Once BIP34 activated it was not possible to create new duplicate
    // coinbases and thus other than starting with the 2 existing duplicate
    // coinbase pairs, not possible to create overwriting txs. But by the time
    // BIP34 activated, in each of the existing pairs the duplicate coinbase had
    // overwritten the first before the first had been spent. Since those
    // coinbases are sufficiently buried it's no longer possible to create
    // further duplicate transactions descending from the known pairs either. If
    // we're on the known chain at height greater than where BIP34 activated, we
    // can save the db accesses needed for the BIP30 check.
    assert(pindex->pprev);
    CBlockIndex *pindexBIP34height =
        pindex->pprev->GetAncestor(consensusParams.BIP34Height);
    // Only continue to enforce if we're below BIP34 activation height or the
    // block hash at that height doesn't correspond.
    fEnforceBIP30 =
        fEnforceBIP30 &&
        (!pindexBIP34height ||
         !(pindexBIP34height->GetBlockHash() == consensusParams.BIP34Hash));

    if (fEnforceBIP30) {
        for (const auto &tx : block.vtx) {
            for (size_t o = 0; o < tx->vout.size(); o++) {
                if (view.HaveCoin(COutPoint(tx->GetId(), o))) {
                    LogPrintf("ERROR: ConnectBlock(): tried to overwrite "
                              "transaction\n");
                    return state.Invalid(BlockValidationResult::BLOCK_CONSENSUS,
                                         REJECT_INVALID, "bad-txns-BIP30");
                }
            }
        }
    }

    // Start enforcing BIP68 (sequence locks).
    int nLockTimeFlags = 0;
    if (pindex->nHeight >= consensusParams.CSVHeight) {
        nLockTimeFlags |= LOCKTIME_VERIFY_SEQUENCE;
    }

    const uint32_t flags =
        GetNextBlockScriptFlags(consensusParams, pindex->pprev);

    int64_t nTime2 = GetTimeMicros();
    nTimeForks += nTime2 - nTime1;
    LogPrint(BCLog::BENCH, "    - Fork checks: %.2fms [%.2fs (%.2fms/blk)]\n",
             MILLI * (nTime2 - nTime1), nTimeForks * MICRO,
             nTimeForks * MILLI / nBlocksTotal);

    std::vector<int> prevheights;
    Amount nFees = Amount::zero();
    int nInputs = 0;

    // Limit the total executed signature operations in the block, a consensus
    // rule. Tracking during the CPU-consuming part (validation of uncached
    // inputs) is per-input atomic and validation in each thread stops very
    // quickly after the limit is exceeded, so an adversary cannot cause us to
    // exceed the limit by much at all.
    CheckInputsLimiter nSigChecksBlockLimiter(
        GetMaxBlockSigChecksCount(options.getExcessiveBlockSize()));

    std::vector<TxSigCheckLimiter> nSigChecksTxLimiters;
    nSigChecksTxLimiters.resize(block.vtx.size() - 1);

    CBlockUndo blockundo;
    blockundo.vtxundo.resize(block.vtx.size() - 1);

    CCheckQueueControl<CScriptCheck> control(fScriptChecks ? &scriptcheckqueue
                                                           : nullptr);

    // Add all outputs
    try {
        for (const auto &ptx : block.vtx) {
            AddCoins(view, *ptx, pindex->nHeight);
        }
    } catch (const std::logic_error &e) {
        // This error will be thrown from AddCoin if we try to connect a block
        // containing duplicate transactions. Such a thing should normally be
        // caught early nowadays (due to ContextualCheckBlock's CTOR
        // enforcement) however some edge cases can escape that:
        // - ContextualCheckBlock does not get re-run after saving the block to
        // disk, and older versions may have saved a weird block.
        // - its checks are not applied to pre-CTOR chains, which we might visit
        // with checkpointing off.
        LogPrintf("ERROR: ConnectBlock(): tried to overwrite transaction\n");
        return state.Invalid(BlockValidationResult::BLOCK_CONSENSUS,
                             REJECT_INVALID, "tx-duplicate");
    }

    size_t txIndex = 0;
    for (const auto &ptx : block.vtx) {
        const CTransaction &tx = *ptx;
        const bool isCoinBase = tx.IsCoinBase();
        nInputs += tx.vin.size();

        {
            Amount txfee = Amount::zero();
            TxValidationState tx_state;
            if (!isCoinBase &&
                !Consensus::CheckTxInputs(tx, tx_state, view, pindex->nHeight,
                                          txfee)) {
                // Any transaction validation failure in ConnectBlock is a block
                // consensus failure.
                state.Invalid(BlockValidationResult::BLOCK_CONSENSUS,
                              tx_state.GetRejectCode(),
                              tx_state.GetRejectReason(),
                              tx_state.GetDebugMessage());

                return error("%s: Consensus::CheckTxInputs: %s, %s", __func__,
                             tx.GetId().ToString(), FormatStateMessage(state));
            }
            nFees += txfee;
        }

        if (!MoneyRange(nFees)) {
            LogPrintf("ERROR: %s: accumulated fee in the block out of range.\n",
                      __func__);
            return state.Invalid(BlockValidationResult::BLOCK_CONSENSUS,
                                 REJECT_INVALID,
                                 "bad-txns-accumulated-fee-outofrange");
        }

        // The following checks do not apply to the coinbase.
        if (isCoinBase) {
            continue;
        }

        // Check that transaction is BIP68 final BIP68 lock checks (as
        // opposed to nLockTime checks) must be in ConnectBlock because they
        // require the UTXO set.
        prevheights.resize(tx.vin.size());
        for (size_t j = 0; j < tx.vin.size(); j++) {
            prevheights[j] = view.AccessCoin(tx.vin[j].prevout).GetHeight();
        }

        if (!SequenceLocks(tx, nLockTimeFlags, &prevheights, *pindex)) {
            LogPrintf("ERROR: %s: contains a non-BIP68-final transaction\n",
                      __func__);
            return state.Invalid(BlockValidationResult::BLOCK_CONSENSUS,
                                 REJECT_INVALID, "bad-txns-nonfinal");
        }

        // Don't cache results if we're actually connecting blocks (still
        // consult the cache, though).
        bool fCacheResults = fJustCheck;

        const bool fEnforceSigCheck = flags & SCRIPT_ENFORCE_SIGCHECKS;
        if (!fEnforceSigCheck) {
            // Historically, there has been transactions with a very high
            // sigcheck count, so we need to disable this check for such
            // transactions.
            nSigChecksTxLimiters[txIndex] = TxSigCheckLimiter::getDisabled();
        }

        std::vector<CScriptCheck> vChecks;
        // nSigChecksRet may be accurate (found in cache) or 0 (checks were
        // deferred into vChecks).
        int nSigChecksRet;
        TxValidationState tx_state;
        if (!CheckInputs(tx, tx_state, view, fScriptChecks, flags,
                         fCacheResults, fCacheResults,
                         PrecomputedTransactionData(tx), nSigChecksRet,
                         nSigChecksTxLimiters[txIndex], &nSigChecksBlockLimiter,
                         &vChecks)) {
            // Any transaction validation failure in ConnectBlock is a block
            // consensus failure
            state.Invalid(BlockValidationResult::BLOCK_CONSENSUS,
                          tx_state.GetRejectCode(), tx_state.GetRejectReason(),
                          tx_state.GetDebugMessage());
            return error("ConnectBlock(): CheckInputs on %s failed with %s",
                         tx.GetId().ToString(), FormatStateMessage(state));
        }

        control.Add(vChecks);

        // Note: this must execute in the same iteration as CheckTxInputs (not
        // in a separate loop) in order to detect double spends. However,
        // this does not prevent double-spending by duplicated transaction
        // inputs in the same transaction (cf. CVE-2018-17144) -- that check is
        // done in CheckBlock (CheckRegularTransaction).
        SpendCoins(view, tx, blockundo.vtxundo.at(txIndex), pindex->nHeight);
        txIndex++;
    }

    int64_t nTime3 = GetTimeMicros();
    nTimeConnect += nTime3 - nTime2;
    LogPrint(BCLog::BENCH,
             "      - Connect %u transactions: %.2fms (%.3fms/tx, %.3fms/txin) "
             "[%.2fs (%.2fms/blk)]\n",
             (unsigned)block.vtx.size(), MILLI * (nTime3 - nTime2),
             MILLI * (nTime3 - nTime2) / block.vtx.size(),
             nInputs <= 1 ? 0 : MILLI * (nTime3 - nTime2) / (nInputs - 1),
             nTimeConnect * MICRO, nTimeConnect * MILLI / nBlocksTotal);

    Amount blockReward =
        nFees + GetBlockSubsidy(pindex->nHeight, consensusParams);
    if (block.vtx[0]->GetValueOut() > blockReward) {
        LogPrintf("ERROR: ConnectBlock(): coinbase pays too much (actual=%d vs "
                  "limit=%d)\n",
                  block.vtx[0]->GetValueOut(), blockReward);
        return state.Invalid(BlockValidationResult::BLOCK_CONSENSUS,
                             REJECT_INVALID, "bad-cb-amount");
    }

    const std::vector<CTxDestination> whitelist =
        GetMinerFundWhitelist(consensusParams, pindex->pprev);
    if (!whitelist.empty()) {
        const Amount required = GetMinerFundAmount(blockReward);

        for (auto &o : block.vtx[0]->vout) {
            if (o.nValue < required) {
                // This output doesn't qualify because its amount is too low.
                continue;
            }

            CTxDestination address;
            if (!ExtractDestination(o.scriptPubKey, address)) {
                // Cannot decode address.
                continue;
            }

            if (std::find(whitelist.begin(), whitelist.end(), address) !=
                whitelist.end()) {
                goto MinerFundSuccess;
            }
        }

        // We did not find an output that match the miner fund requirements.
        return state.Invalid(BlockValidationResult::BLOCK_CONSENSUS,
                             REJECT_INVALID, "bad-cb-minerfund");
    }

MinerFundSuccess:

    if (!control.Wait()) {
        return state.Invalid(BlockValidationResult::BLOCK_CONSENSUS,
                             REJECT_INVALID, "blk-bad-inputs",
                             "parallel script check failed");
    }

    int64_t nTime4 = GetTimeMicros();
    nTimeVerify += nTime4 - nTime2;
    LogPrint(
        BCLog::BENCH,
        "    - Verify %u txins: %.2fms (%.3fms/txin) [%.2fs (%.2fms/blk)]\n",
        nInputs - 1, MILLI * (nTime4 - nTime2),
        nInputs <= 1 ? 0 : MILLI * (nTime4 - nTime2) / (nInputs - 1),
        nTimeVerify * MICRO, nTimeVerify * MILLI / nBlocksTotal);

    if (fJustCheck) {
        return true;
    }

    if (!WriteUndoDataForBlock(blockundo, state, pindex, params)) {
        return false;
    }

    if (!pindex->IsValid(BlockValidity::SCRIPTS)) {
        pindex->RaiseValidity(BlockValidity::SCRIPTS);
        setDirtyBlockIndex.insert(pindex);
    }

    assert(pindex->phashBlock);
    // add this block to the view's block chain
    view.SetBestBlock(pindex->GetBlockHash());

    int64_t nTime5 = GetTimeMicros();
    nTimeIndex += nTime5 - nTime4;
    LogPrint(BCLog::BENCH, "    - Index writing: %.2fms [%.2fs (%.2fms/blk)]\n",
             MILLI * (nTime5 - nTime4), nTimeIndex * MICRO,
             nTimeIndex * MILLI / nBlocksTotal);

    int64_t nTime6 = GetTimeMicros();
    nTimeCallbacks += nTime6 - nTime5;
    LogPrint(BCLog::BENCH, "    - Callbacks: %.2fms [%.2fs (%.2fms/blk)]\n",
             MILLI * (nTime6 - nTime5), nTimeCallbacks * MICRO,
             nTimeCallbacks * MILLI / nBlocksTotal);

    return true;
}

bool CChainState::FlushStateToDisk(const CChainParams &chainparams,
                                   BlockValidationState &state,
                                   FlushStateMode mode,
                                   int nManualPruneHeight) {
    int64_t nMempoolUsage = g_mempool.DynamicMemoryUsage();
    LOCK(cs_main);
    static int64_t nLastWrite = 0;
    static int64_t nLastFlush = 0;
    std::set<int> setFilesToPrune;
    bool full_flush_completed = false;
    try {
        {
            bool fFlushForPrune = false;
            bool fDoFullFlush = false;
            LOCK(cs_LastBlockFile);
            if (fPruneMode && (fCheckForPruning || nManualPruneHeight > 0) &&
                !fReindex) {
                if (nManualPruneHeight > 0) {
                    FindFilesToPruneManual(setFilesToPrune, nManualPruneHeight);
                } else {
                    FindFilesToPrune(setFilesToPrune,
                                     chainparams.PruneAfterHeight());
                    fCheckForPruning = false;
                }
                if (!setFilesToPrune.empty()) {
                    fFlushForPrune = true;
                    if (!fHavePruned) {
                        pblocktree->WriteFlag("prunedblockfiles", true);
                        fHavePruned = true;
                    }
                }
            }
            int64_t nNow = GetTimeMicros();
            // Avoid writing/flushing immediately after startup.
            if (nLastWrite == 0) {
                nLastWrite = nNow;
            }
            if (nLastFlush == 0) {
                nLastFlush = nNow;
            }
            int64_t nMempoolSizeMax =
                gArgs.GetArg("-maxmempool", DEFAULT_MAX_MEMPOOL_SIZE) * 1000000;
            int64_t cacheSize = pcoinsTip->DynamicMemoryUsage();
            int64_t nTotalSpace =
                nCoinCacheUsage +
                std::max<int64_t>(nMempoolSizeMax - nMempoolUsage, 0);
            // The cache is large and we're within 10% and 10 MiB of the limit,
            // but we have time now (not in the middle of a block processing).
            bool fCacheLarge =
                mode == FlushStateMode::PERIODIC &&
                cacheSize > std::max((9 * nTotalSpace) / 10,
                                     nTotalSpace -
                                         MAX_BLOCK_COINSDB_USAGE * 1024 * 1024);
            // The cache is over the limit, we have to write now.
            bool fCacheCritical =
                mode == FlushStateMode::IF_NEEDED && cacheSize > nTotalSpace;
            // It's been a while since we wrote the block index to disk. Do this
            // frequently, so we don't need to redownload after a crash.
            bool fPeriodicWrite =
                mode == FlushStateMode::PERIODIC &&
                nNow > nLastWrite + (int64_t)DATABASE_WRITE_INTERVAL * 1000000;
            // It's been very long since we flushed the cache. Do this
            // infrequently, to optimize cache usage.
            bool fPeriodicFlush =
                mode == FlushStateMode::PERIODIC &&
                nNow > nLastFlush + (int64_t)DATABASE_FLUSH_INTERVAL * 1000000;
            // Combine all conditions that result in a full cache flush.
            fDoFullFlush = (mode == FlushStateMode::ALWAYS) || fCacheLarge ||
                           fCacheCritical || fPeriodicFlush || fFlushForPrune;
            // Write blocks and block index to disk.
            if (fDoFullFlush || fPeriodicWrite) {
                // Depend on nMinDiskSpace to ensure we can write block index
                if (!CheckDiskSpace(GetBlocksDir())) {
                    return AbortNode(
                        state, "Disk space is too low!",
                        _("Error: Disk space is too low!").translated,
                        CClientUIInterface::MSG_NOPREFIX);
                }

                // First make sure all block and undo data is flushed to disk.
                FlushBlockFile();
                // Then update all block file information (which may refer to
                // block and undo files).
                {
                    std::vector<std::pair<int, const CBlockFileInfo *>> vFiles;
                    vFiles.reserve(setDirtyFileInfo.size());
                    for (int i : setDirtyFileInfo) {
                        vFiles.push_back(std::make_pair(i, &vinfoBlockFile[i]));
                    }

                    setDirtyFileInfo.clear();

                    std::vector<const CBlockIndex *> vBlocks;
                    vBlocks.reserve(setDirtyBlockIndex.size());
                    for (const CBlockIndex *cbi : setDirtyBlockIndex) {
                        vBlocks.push_back(cbi);
                    }

                    setDirtyBlockIndex.clear();

                    if (!pblocktree->WriteBatchSync(vFiles, nLastBlockFile,
                                                    vBlocks)) {
                        return AbortNode(
                            state, "Failed to write to block index database");
                    }
                }

                // Finally remove any pruned files
                if (fFlushForPrune) {
                    UnlinkPrunedFiles(setFilesToPrune);
                }
                nLastWrite = nNow;
            }
            // Flush best chain related state. This can only be done if the
            // blocks / block index write was also done.
            if (fDoFullFlush && !pcoinsTip->GetBestBlock().IsNull()) {
                // Typical Coin structures on disk are around 48 bytes in size.
                // Pushing a new one to the database can cause it to be written
                // twice (once in the log, and once in the tables). This is
                // already an overestimation, as most will delete an existing
                // entry or overwrite one. Still, use a conservative safety
                // factor of 2.
                if (!CheckDiskSpace(GetDataDir(),
                                    48 * 2 * 2 * pcoinsTip->GetCacheSize())) {
                    return AbortNode(
                        state, "Disk space is too low!",
                        _("Error: Disk space is too low!").translated,
                        CClientUIInterface::MSG_NOPREFIX);
                }

                // Flush the chainstate (which may refer to block index
                // entries).
                if (!pcoinsTip->Flush()) {
                    return AbortNode(state, "Failed to write to coin database");
                }
                nLastFlush = nNow;
                full_flush_completed = true;
            }
        }

        if (full_flush_completed) {
            // Update best block in wallet (so we can detect restored wallets).
            GetMainSignals().ChainStateFlushed(m_chain.GetLocator());
        }
    } catch (const std::runtime_error &e) {
        return AbortNode(state, std::string("System error while flushing: ") +
                                    e.what());
    }
    return true;
}

void CChainState::ForceFlushStateToDisk() {
    BlockValidationState state;
    const CChainParams &chainparams = Params();
    if (!this->FlushStateToDisk(chainparams, state, FlushStateMode::ALWAYS)) {
        LogPrintf("%s: failed to flush state (%s)\n", __func__,
                  FormatStateMessage(state));
    }
}

void CChainState::PruneAndFlush() {
    BlockValidationState state;
    fCheckForPruning = true;
    const CChainParams &chainparams = Params();
    if (!this->FlushStateToDisk(chainparams, state, FlushStateMode::NONE)) {
        LogPrintf("%s: failed to flush state (%s)\n", __func__,
                  FormatStateMessage(state));
    }
}

/** Check warning conditions and do some notifications on new chain tip set. */
static void UpdateTip(const CChainParams &params, CBlockIndex *pindexNew) {
    // New best block
    g_mempool.AddTransactionsUpdated(1);

    {
        LOCK(g_best_block_mutex);
        g_best_block = pindexNew->GetBlockHash();
        g_best_block_cv.notify_all();
    }

    LogPrintf("%s: new best=%s height=%d version=0x%08x log2_work=%.8g tx=%ld "
              "date='%s' progress=%f cache=%.1fMiB(%utxo)\n",
              __func__, pindexNew->GetBlockHash().ToString(),
              pindexNew->nHeight, pindexNew->nVersion,
              log(pindexNew->nChainWork.getdouble()) / log(2.0),
              pindexNew->GetChainTxCount(),
              FormatISO8601DateTime(pindexNew->GetBlockTime()),
              GuessVerificationProgress(params.TxData(), pindexNew),
              pcoinsTip->DynamicMemoryUsage() * (1.0 / (1 << 20)),
              pcoinsTip->GetCacheSize());
}

/**
 * Disconnect m_chain's tip.
 * After calling, the mempool will be in an inconsistent state, with
 * transactions from disconnected blocks being added to disconnectpool. You
 * should make the mempool consistent again by calling updateMempoolForReorg.
 * with cs_main held.
 *
 * If disconnectpool is nullptr, then no disconnected transactions are added to
 * disconnectpool (note that the caller is responsible for mempool consistency
 * in any case).
 */
bool CChainState::DisconnectTip(const CChainParams &params,
                                BlockValidationState &state,
                                DisconnectedBlockTransactions *disconnectpool) {
    AssertLockHeld(cs_main);
    CBlockIndex *pindexDelete = m_chain.Tip();
    const Consensus::Params &consensusParams = params.GetConsensus();

    assert(pindexDelete);

    // Read block from disk.
    std::shared_ptr<CBlock> pblock = std::make_shared<CBlock>();
    CBlock &block = *pblock;
    if (!ReadBlockFromDisk(block, pindexDelete, consensusParams)) {
        return error("DisconnectTip(): Failed to read block");
    }

    // Apply the block atomically to the chain state.
    int64_t nStart = GetTimeMicros();
    {
        CCoinsViewCache view(pcoinsTip.get());
        assert(view.GetBestBlock() == pindexDelete->GetBlockHash());
        if (DisconnectBlock(block, pindexDelete, view) !=
            DisconnectResult::OK) {
            return error("DisconnectTip(): DisconnectBlock %s failed",
                         pindexDelete->GetBlockHash().ToString());
        }

        bool flushed = view.Flush();
        assert(flushed);
    }

    LogPrint(BCLog::BENCH, "- Disconnect block: %.2fms\n",
             (GetTimeMicros() - nStart) * MILLI);

    // Write the chain state to disk, if necessary.
    if (!FlushStateToDisk(params, state, FlushStateMode::IF_NEEDED)) {
        return false;
    }

    // If this block is deactivating a fork, we move all mempool transactions
    // in front of disconnectpool for reprocessing in a future
    // updateMempoolForReorg call
    if (pindexDelete->pprev != nullptr &&
        GetNextBlockScriptFlags(consensusParams, pindexDelete) !=
            GetNextBlockScriptFlags(consensusParams, pindexDelete->pprev)) {
        LogPrint(BCLog::MEMPOOL,
                 "Disconnecting mempool due to rewind of upgrade block\n");
        if (disconnectpool) {
            disconnectpool->importMempool(g_mempool);
        }
        g_mempool.clear();
    }

    if (disconnectpool) {
        disconnectpool->addForBlock(block.vtx);
    }

    // If the tip is finalized, then undo it.
    if (pindexFinalized == pindexDelete) {
        pindexFinalized = pindexDelete->pprev;
    }

    m_chain.SetTip(pindexDelete->pprev);

    // Update ::ChainActive() and related variables.
    UpdateTip(params, pindexDelete->pprev);
    // Let wallets know transactions went from 1-confirmed to
    // 0-confirmed or conflicted:
    GetMainSignals().BlockDisconnected(pblock, pindexDelete);
    return true;
}

static int64_t nTimeReadFromDisk = 0;
static int64_t nTimeConnectTotal = 0;
static int64_t nTimeFlush = 0;
static int64_t nTimeChainState = 0;
static int64_t nTimePostConnect = 0;

struct PerBlockConnectTrace {
    CBlockIndex *pindex = nullptr;
    std::shared_ptr<const CBlock> pblock;
    std::shared_ptr<std::vector<CTransactionRef>> conflictedTxs;
    PerBlockConnectTrace()
        : conflictedTxs(std::make_shared<std::vector<CTransactionRef>>()) {}
};

/**
 * Used to track blocks whose transactions were applied to the UTXO state as a
 * part of a single ActivateBestChainStep call.
 *
 * This class also tracks transactions that are removed from the mempool as
 * conflicts (per block) and can be used to pass all those transactions through
 * SyncTransaction.
 *
 * This class assumes (and asserts) that the conflicted transactions for a given
 * block are added via mempool callbacks prior to the BlockConnected()
 * associated with those transactions. If any transactions are marked
 * conflicted, it is assumed that an associated block will always be added.
 *
 * This class is single-use, once you call GetBlocksConnected() you have to
 * throw it away and make a new one.
 */
class ConnectTrace {
private:
    std::vector<PerBlockConnectTrace> blocksConnected;
    CTxMemPool &pool;
    boost::signals2::scoped_connection m_connNotifyEntryRemoved;

public:
    explicit ConnectTrace(CTxMemPool &_pool) : blocksConnected(1), pool(_pool) {
        m_connNotifyEntryRemoved = pool.NotifyEntryRemoved.connect(
            std::bind(&ConnectTrace::NotifyEntryRemoved, this,
                      std::placeholders::_1, std::placeholders::_2));
    }

    void BlockConnected(CBlockIndex *pindex,
                        std::shared_ptr<const CBlock> pblock) {
        assert(!blocksConnected.back().pindex);
        assert(pindex);
        assert(pblock);
        blocksConnected.back().pindex = pindex;
        blocksConnected.back().pblock = std::move(pblock);
        blocksConnected.emplace_back();
    }

    std::vector<PerBlockConnectTrace> &GetBlocksConnected() {
        // We always keep one extra block at the end of our list because blocks
        // are added after all the conflicted transactions have been filled in.
        // Thus, the last entry should always be an empty one waiting for the
        // transactions from the next block. We pop the last entry here to make
        // sure the list we return is sane.
        assert(!blocksConnected.back().pindex);
        assert(blocksConnected.back().conflictedTxs->empty());
        blocksConnected.pop_back();
        return blocksConnected;
    }

    void NotifyEntryRemoved(CTransactionRef txRemoved,
                            MemPoolRemovalReason reason) {
        assert(!blocksConnected.back().pindex);
        if (reason == MemPoolRemovalReason::CONFLICT) {
            blocksConnected.back().conflictedTxs->emplace_back(
                std::move(txRemoved));
        }
    }
};

bool CChainState::MarkBlockAsFinal(const Config &config,
                                   BlockValidationState &state,
                                   const CBlockIndex *pindex) {
    AssertLockHeld(cs_main);
    if (pindex->nStatus.isInvalid()) {
        // We try to finalize an invalid block.
        LogPrintf("ERROR: %s: Trying to finalize invalid block %s\n", __func__,
                  pindex->GetBlockHash().ToString());
        return state.Invalid(BlockValidationResult::BLOCK_CACHED_INVALID,
                             REJECT_INVALID, "finalize-invalid-block");
    }

    // Check that the request is consistent with current finalization.
    if (pindexFinalized && !AreOnTheSameFork(pindex, pindexFinalized)) {
        LogPrintf("ERROR: %s: Trying to finalize block %s which conflicts with "
                  "already finalized block\n",
                  __func__, pindex->GetBlockHash().ToString());
        return state.Invalid(BlockValidationResult::BLOCK_FINALIZATION,
                             REJECT_AGAINST_FINALIZED,
                             "bad-fork-prior-finalized");
    }

    if (IsBlockFinalized(pindex)) {
        // The block is already finalized.
        return true;
    }

    // We have a new block to finalize.
    pindexFinalized = pindex;
    return true;
}

static const CBlockIndex *FindBlockToFinalize(const Config &config,
                                              CBlockIndex *pindexNew)
    EXCLUSIVE_LOCKS_REQUIRED(cs_main) {
    AssertLockHeld(cs_main);

    const int32_t maxreorgdepth =
        gArgs.GetArg("-maxreorgdepth", DEFAULT_MAX_REORG_DEPTH);

    const int64_t finalizationdelay =
        gArgs.GetArg("-finalizationdelay", DEFAULT_MIN_FINALIZATION_DELAY);

    // Find our candidate.
    // If maxreorgdepth is < 0 pindex will be null and auto finalization
    // disabled
    const CBlockIndex *pindex =
        pindexNew->GetAncestor(pindexNew->nHeight - maxreorgdepth);

    int64_t now = GetTime();

    // If the finalization delay is not expired since the startup time,
    // finalization should be avoided. Header receive time is not saved to disk
    // and so cannot be anterior to startup time.
    if (now < (GetStartupTime() + finalizationdelay)) {
        return nullptr;
    }

    // While our candidate is not eligible (finalization delay not expired), try
    // the previous one.
    while (pindex && (pindex != pindexFinalized)) {
        // Check that the block to finalize is known for a long enough time.
        // This test will ensure that an attacker could not cause a block to
        // finalize by forking the chain with a depth > maxreorgdepth.
        // If the block is loaded from disk, header receive time is 0 and the
        // block will be finalized. This is safe because the delay since the
        // node startup is already expired.
        auto headerReceivedTime = pindex->GetHeaderReceivedTime();

        // If finalization delay is <= 0, finalization always occurs immediately
        if (now >= (headerReceivedTime + finalizationdelay)) {
            return pindex;
        }

        pindex = pindex->pprev;
    }

    return nullptr;
}

/**
 * Connect a new block to m_chain. pblock is either nullptr or a pointer to
 * a CBlock corresponding to pindexNew, to bypass loading it again from disk.
 *
 * The block is always added to connectTrace (either after loading from disk or
 * by copying pblock) - if that is not intended, care must be taken to remove
 * the last entry in blocksConnected in case of failure.
 */
bool CChainState::ConnectTip(const Config &config, BlockValidationState &state,
                             CBlockIndex *pindexNew,
                             const std::shared_ptr<const CBlock> &pblock,
                             ConnectTrace &connectTrace,
                             DisconnectedBlockTransactions &disconnectpool) {
    AssertLockHeld(cs_main);

    const CChainParams &params = config.GetChainParams();
    const Consensus::Params &consensusParams = params.GetConsensus();

    assert(pindexNew->pprev == m_chain.Tip());
    // Read block from disk.
    int64_t nTime1 = GetTimeMicros();
    std::shared_ptr<const CBlock> pthisBlock;
    if (!pblock) {
        std::shared_ptr<CBlock> pblockNew = std::make_shared<CBlock>();
        if (!ReadBlockFromDisk(*pblockNew, pindexNew, consensusParams)) {
            return AbortNode(state, "Failed to read block");
        }
        pthisBlock = pblockNew;
    } else {
        pthisBlock = pblock;
    }

    const CBlock &blockConnecting = *pthisBlock;

    // Apply the block atomically to the chain state.
    int64_t nTime2 = GetTimeMicros();
    nTimeReadFromDisk += nTime2 - nTime1;
    int64_t nTime3;
    LogPrint(BCLog::BENCH, "  - Load block from disk: %.2fms [%.2fs]\n",
             (nTime2 - nTime1) * MILLI, nTimeReadFromDisk * MICRO);
    {
        CCoinsViewCache view(pcoinsTip.get());
        bool rv = ConnectBlock(blockConnecting, state, pindexNew, view, params,
                               BlockValidationOptions(config));
        GetMainSignals().BlockChecked(blockConnecting, state);
        if (!rv) {
            if (state.IsInvalid()) {
                InvalidBlockFound(pindexNew, state);
            }

            return error("%s: ConnectBlock %s failed, %s", __func__,
                         pindexNew->GetBlockHash().ToString(),
                         FormatStateMessage(state));
        }

        // Update the finalized block.
        const CBlockIndex *pindexToFinalize =
            FindBlockToFinalize(config, pindexNew);
        if (pindexToFinalize &&
            !MarkBlockAsFinal(config, state, pindexToFinalize)) {
            return error("ConnectTip(): MarkBlockAsFinal %s failed (%s)",
                         pindexNew->GetBlockHash().ToString(),
                         FormatStateMessage(state));
        }

        nTime3 = GetTimeMicros();
        nTimeConnectTotal += nTime3 - nTime2;
        LogPrint(BCLog::BENCH,
                 "  - Connect total: %.2fms [%.2fs (%.2fms/blk)]\n",
                 (nTime3 - nTime2) * MILLI, nTimeConnectTotal * MICRO,
                 nTimeConnectTotal * MILLI / nBlocksTotal);
        bool flushed = view.Flush();
        assert(flushed);
    }

    int64_t nTime4 = GetTimeMicros();
    nTimeFlush += nTime4 - nTime3;
    LogPrint(BCLog::BENCH, "  - Flush: %.2fms [%.2fs (%.2fms/blk)]\n",
             (nTime4 - nTime3) * MILLI, nTimeFlush * MICRO,
             nTimeFlush * MILLI / nBlocksTotal);

    // Write the chain state to disk, if necessary.
    if (!FlushStateToDisk(config.GetChainParams(), state,
                          FlushStateMode::IF_NEEDED)) {
        return false;
    }

    int64_t nTime5 = GetTimeMicros();
    nTimeChainState += nTime5 - nTime4;
    LogPrint(BCLog::BENCH,
             "  - Writing chainstate: %.2fms [%.2fs (%.2fms/blk)]\n",
             (nTime5 - nTime4) * MILLI, nTimeChainState * MICRO,
             nTimeChainState * MILLI / nBlocksTotal);

    // Remove conflicting transactions from the mempool.;
    g_mempool.removeForBlock(blockConnecting.vtx, pindexNew->nHeight);
    disconnectpool.removeForBlock(blockConnecting.vtx);

    // If this block is activating a fork, we move all mempool transactions
    // in front of disconnectpool for reprocessing in a future
    // updateMempoolForReorg call
    if (pindexNew->pprev != nullptr &&
        GetNextBlockScriptFlags(consensusParams, pindexNew) !=
            GetNextBlockScriptFlags(consensusParams, pindexNew->pprev)) {
        LogPrint(BCLog::MEMPOOL,
                 "Disconnecting mempool due to acceptance of upgrade block\n");
        disconnectpool.importMempool(g_mempool);
    }

    // Update m_chain & related variables.
    m_chain.SetTip(pindexNew);
    UpdateTip(params, pindexNew);

    int64_t nTime6 = GetTimeMicros();
    nTimePostConnect += nTime6 - nTime5;
    nTimeTotal += nTime6 - nTime1;
    LogPrint(BCLog::BENCH,
             "  - Connect postprocess: %.2fms [%.2fs (%.2fms/blk)]\n",
             (nTime6 - nTime5) * MILLI, nTimePostConnect * MICRO,
             nTimePostConnect * MILLI / nBlocksTotal);
    LogPrint(BCLog::BENCH, "- Connect block: %.2fms [%.2fs (%.2fms/blk)]\n",
             (nTime6 - nTime1) * MILLI, nTimeTotal * MICRO,
             nTimeTotal * MILLI / nBlocksTotal);

    connectTrace.BlockConnected(pindexNew, std::move(pthisBlock));
    return true;
}

/**
 * Return the tip of the chain with the most work in it, that isn't known to be
 * invalid (it's however far from certain to be valid).
 */
CBlockIndex *CChainState::FindMostWorkChain() {
    AssertLockHeld(cs_main);
    do {
        CBlockIndex *pindexNew = nullptr;

        // Find the best candidate header.
        {
            std::set<CBlockIndex *, CBlockIndexWorkComparator>::reverse_iterator
                it = setBlockIndexCandidates.rbegin();
            if (it == setBlockIndexCandidates.rend()) {
                return nullptr;
            }
            pindexNew = *it;
        }

        // If this block will cause a finalized block to be reorged, then we
        // mark it as invalid.
        if (pindexFinalized && !AreOnTheSameFork(pindexNew, pindexFinalized)) {
            LogPrintf("Mark block %s invalid because it forks prior to the "
                      "finalization point %d.\n",
                      pindexNew->GetBlockHash().ToString(),
                      pindexFinalized->nHeight);
            pindexNew->nStatus = pindexNew->nStatus.withFailed();
            InvalidChainFound(pindexNew);
        }

        const CBlockIndex *pindexFork = m_chain.FindFork(pindexNew);

        // Check whether all blocks on the path between the currently active
        // chain and the candidate are valid. Just going until the active chain
        // is an optimization, as we know all blocks in it are valid already.
        CBlockIndex *pindexTest = pindexNew;
        bool hasValidAncestor = true;
        while (hasValidAncestor && pindexTest && pindexTest != pindexFork) {
            assert(pindexTest->HaveTxsDownloaded() || pindexTest->nHeight == 0);

            // If this is a parked chain, but it has enough PoW, clear the park
            // state.
            bool fParkedChain = pindexTest->nStatus.isOnParkedChain();
            if (fParkedChain && gArgs.GetBoolArg("-automaticunparking", true)) {
                const CBlockIndex *pindexTip = m_chain.Tip();

                // During initialization, pindexTip and/or pindexFork may be
                // null. In this case, we just ignore the fact that the chain is
                // parked.
                if (!pindexTip || !pindexFork) {
                    UnparkBlock(pindexTest);
                    continue;
                }

                // A parked chain can be unparked if it has twice as much PoW
                // accumulated as the main chain has since the fork block.
                CBlockIndex const *pindexExtraPow = pindexTip;
                arith_uint256 requiredWork = pindexTip->nChainWork;
                switch (pindexTip->nHeight - pindexFork->nHeight) {
                    // Limit the penality for depth 1, 2 and 3 to half a block
                    // worth of work to ensure we don't fork accidentally.
                    case 3:
                    case 2:
                        pindexExtraPow = pindexExtraPow->pprev;
                    // FALLTHROUGH
                    case 1: {
                        const arith_uint256 deltaWork =
                            pindexExtraPow->nChainWork - pindexFork->nChainWork;
                        requiredWork += (deltaWork >> 1);
                        break;
                    }
                    default:
                        requiredWork +=
                            pindexExtraPow->nChainWork - pindexFork->nChainWork;
                        break;
                }

                if (pindexNew->nChainWork > requiredWork) {
                    // We have enough, clear the parked state.
                    LogPrintf("Unpark chain up to block %s as it has "
                              "accumulated enough PoW.\n",
                              pindexNew->GetBlockHash().ToString());
                    fParkedChain = false;
                    UnparkBlock(pindexTest);
                }
            }

            // Pruned nodes may have entries in setBlockIndexCandidates for
            // which block files have been deleted. Remove those as candidates
            // for the most work chain if we come across them; we can't switch
            // to a chain unless we have all the non-active-chain parent blocks.
            bool fInvalidChain = pindexTest->nStatus.isInvalid();
            bool fMissingData = !pindexTest->nStatus.hasData();
            if (!(fInvalidChain || fParkedChain || fMissingData)) {
                // The current block is acceptable, move to the parent, up to
                // the fork point.
                pindexTest = pindexTest->pprev;
                continue;
            }

            // Candidate chain is not usable (either invalid or parked or
            // missing data)
            hasValidAncestor = false;
            setBlockIndexCandidates.erase(pindexTest);

            if (fInvalidChain &&
                (pindexBestInvalid == nullptr ||
                 pindexNew->nChainWork > pindexBestInvalid->nChainWork)) {
                pindexBestInvalid = pindexNew;
            }

            if (fParkedChain &&
                (pindexBestParked == nullptr ||
                 pindexNew->nChainWork > pindexBestParked->nChainWork)) {
                pindexBestParked = pindexNew;
            }

            LogPrintf("Considered switching to better tip %s but that chain "
                      "contains a%s%s%s block.\n",
                      pindexNew->GetBlockHash().ToString(),
                      fInvalidChain ? "n invalid" : "",
                      fParkedChain ? " parked" : "",
                      fMissingData ? " missing-data" : "");

            CBlockIndex *pindexFailed = pindexNew;
            // Remove the entire chain from the set.
            while (pindexTest != pindexFailed) {
                if (fInvalidChain || fParkedChain) {
                    pindexFailed->nStatus =
                        pindexFailed->nStatus.withFailedParent(fInvalidChain)
                            .withParkedParent(fParkedChain);
                } else if (fMissingData) {
                    // If we're missing data, then add back to
                    // m_blocks_unlinked, so that if the block arrives in the
                    // future we can try adding to setBlockIndexCandidates
                    // again.
                    m_blockman.m_blocks_unlinked.insert(
                        std::make_pair(pindexFailed->pprev, pindexFailed));
                }
                setBlockIndexCandidates.erase(pindexFailed);
                pindexFailed = pindexFailed->pprev;
            }

            if (fInvalidChain || fParkedChain) {
                // We discovered a new chain tip that is either parked or
                // invalid, we may want to warn.
                CheckForkWarningConditionsOnNewFork(pindexNew);
            }
        }

        if (g_avalanche &&
            gArgs.GetBoolArg("-enableavalanche", AVALANCHE_DEFAULT_ENABLED)) {
            g_avalanche->addBlockToReconcile(pindexNew);
        }

        // We found a candidate that has valid ancestors. This is our guy.
        if (hasValidAncestor) {
            return pindexNew;
        }
    } while (true);
}

/**
 * Delete all entries in setBlockIndexCandidates that are worse than the current
 * tip.
 */
void CChainState::PruneBlockIndexCandidates() {
    // Note that we can't delete the current block itself, as we may need to
    // return to it later in case a reorganization to a better block fails.
    auto it = setBlockIndexCandidates.begin();
    while (it != setBlockIndexCandidates.end() &&
           setBlockIndexCandidates.value_comp()(*it, m_chain.Tip())) {
        setBlockIndexCandidates.erase(it++);
    }

    // Either the current tip or a successor of it we're working towards is left
    // in setBlockIndexCandidates.
    assert(!setBlockIndexCandidates.empty());
}

/**
 * Try to make some progress towards making pindexMostWork the active block.
 * pblock is either nullptr or a pointer to a CBlock corresponding to
 * pindexMostWork.
 */
bool CChainState::ActivateBestChainStep(
    const Config &config, BlockValidationState &state,
    CBlockIndex *pindexMostWork, const std::shared_ptr<const CBlock> &pblock,
    bool &fInvalidFound, ConnectTrace &connectTrace) {
    AssertLockHeld(cs_main);

    const CBlockIndex *pindexOldTip = m_chain.Tip();
    const CBlockIndex *pindexFork = m_chain.FindFork(pindexMostWork);

    // Disconnect active blocks which are no longer in the best chain.
    bool fBlocksDisconnected = false;
    DisconnectedBlockTransactions disconnectpool;
    while (m_chain.Tip() && m_chain.Tip() != pindexFork) {
        if (!DisconnectTip(config.GetChainParams(), state, &disconnectpool)) {
            // This is likely a fatal error, but keep the mempool consistent,
            // just in case. Only remove from the mempool in this case.
            disconnectpool.updateMempoolForReorg(config, false);

            // If we're unable to disconnect a block during normal operation,
            // then that is a failure of our local system -- we should abort
            // rather than stay on a less work chain.
            AbortNode(state,
                      "Failed to disconnect block; see debug.log for details");
            return false;
        }

        fBlocksDisconnected = true;
    }

    // Build list of new blocks to connect.
    std::vector<CBlockIndex *> vpindexToConnect;
    bool fContinue = true;
    int nHeight = pindexFork ? pindexFork->nHeight : -1;
    while (fContinue && nHeight != pindexMostWork->nHeight) {
        // Don't iterate the entire list of potential improvements toward the
        // best tip, as we likely only need a few blocks along the way.
        int nTargetHeight = std::min(nHeight + 32, pindexMostWork->nHeight);
        vpindexToConnect.clear();
        vpindexToConnect.reserve(nTargetHeight - nHeight);
        CBlockIndex *pindexIter = pindexMostWork->GetAncestor(nTargetHeight);
        while (pindexIter && pindexIter->nHeight != nHeight) {
            vpindexToConnect.push_back(pindexIter);
            pindexIter = pindexIter->pprev;
        }

        nHeight = nTargetHeight;

        // Connect new blocks.
        for (CBlockIndex *pindexConnect : reverse_iterate(vpindexToConnect)) {
            if (!ConnectTip(config, state, pindexConnect,
                            pindexConnect == pindexMostWork
                                ? pblock
                                : std::shared_ptr<const CBlock>(),
                            connectTrace, disconnectpool)) {
                if (state.IsInvalid()) {
                    // The block violates a consensus rule.
                    if (state.GetResult() !=
                        BlockValidationResult::BLOCK_MUTATED) {
                        InvalidChainFound(vpindexToConnect.back());
                    }
                    state = BlockValidationState();
                    fInvalidFound = true;
                    fContinue = false;
                    break;
                }

                // A system error occurred (disk space, database error, ...).
                // Make the mempool consistent with the current tip, just in
                // case any observers try to use it before shutdown.
                disconnectpool.updateMempoolForReorg(config, false);
                return false;
            } else {
                PruneBlockIndexCandidates();
                if (!pindexOldTip ||
                    m_chain.Tip()->nChainWork > pindexOldTip->nChainWork) {
                    // We're in a better position than we were. Return
                    // temporarily to release the lock.
                    fContinue = false;
                    break;
                }
            }
        }
    }

    if (fBlocksDisconnected || !disconnectpool.isEmpty()) {
        // If any blocks were disconnected, we need to update the mempool even
        // if disconnectpool is empty. The disconnectpool may also be non-empty
        // if the mempool was imported due to new validation rules being in
        // effect.
        LogPrint(BCLog::MEMPOOL, "Updating mempool due to reorganization or "
                                 "rules upgrade/downgrade\n");
        disconnectpool.updateMempoolForReorg(config, true);
    }

    g_mempool.check(pcoinsTip.get());

    // Callbacks/notifications for a new best chain.
    if (fInvalidFound) {
        CheckForkWarningConditionsOnNewFork(pindexMostWork);
    } else {
        CheckForkWarningConditions();
    }

    return true;
}

static void NotifyHeaderTip() LOCKS_EXCLUDED(cs_main) {
    bool fNotify = false;
    bool fInitialBlockDownload = false;
    static CBlockIndex *pindexHeaderOld = nullptr;
    CBlockIndex *pindexHeader = nullptr;
    {
        LOCK(cs_main);
        pindexHeader = pindexBestHeader;

        if (pindexHeader != pindexHeaderOld) {
            fNotify = true;
            fInitialBlockDownload =
                ::ChainstateActive().IsInitialBlockDownload();
            pindexHeaderOld = pindexHeader;
        }
    }

    // Send block tip changed notifications without cs_main
    if (fNotify) {
        uiInterface.NotifyHeaderTip(fInitialBlockDownload, pindexHeader);
    }
}

static void LimitValidationInterfaceQueue() LOCKS_EXCLUDED(cs_main) {
    AssertLockNotHeld(cs_main);

    if (GetMainSignals().CallbacksPending() > 10) {
        SyncWithValidationInterfaceQueue();
    }
}

/**
 * Make the best chain active, in multiple steps. The result is either failure
 * or an activated best chain. pblock is either nullptr or a pointer to a block
 * that is already loaded (to avoid loading it again from disk).
 *
 * ActivateBestChain is split into steps (see ActivateBestChainStep) so that
 * we avoid holding cs_main for an extended period of time; the length of this
 * call may be quite long during reindexing or a substantial reorg.
 */
bool CChainState::ActivateBestChain(const Config &config,
                                    BlockValidationState &state,
                                    std::shared_ptr<const CBlock> pblock) {
    // Note that while we're often called here from ProcessNewBlock, this is
    // far from a guarantee. Things in the P2P/RPC will often end up calling
    // us in the middle of ProcessNewBlock - do not assume pblock is set
    // sanely for performance or correctness!
    AssertLockNotHeld(cs_main);

    const CChainParams &params = config.GetChainParams();

    // ABC maintains a fair degree of expensive-to-calculate internal state
    // because this function periodically releases cs_main so that it does not
    // lock up other threads for too long during large connects - and to allow
    // for e.g. the callback queue to drain we use m_cs_chainstate to enforce
    // mutual exclusion so that only one caller may execute this function at a
    // time
    LOCK(m_cs_chainstate);

    CBlockIndex *pindexMostWork = nullptr;
    CBlockIndex *pindexNewTip = nullptr;
    int nStopAtHeight = gArgs.GetArg("-stopatheight", DEFAULT_STOPATHEIGHT);
    do {
        boost::this_thread::interruption_point();

        // Block until the validation queue drains. This should largely
        // never happen in normal operation, however may happen during
        // reindex, causing memory blowup if we run too far ahead.
        // Note that if a validationinterface callback ends up calling
        // ActivateBestChain this may lead to a deadlock! We should
        // probably have a DEBUG_LOCKORDER test for this in the future.
        LimitValidationInterfaceQueue();

        {
            LOCK(cs_main);
            CBlockIndex *starting_tip = m_chain.Tip();
            bool blocks_connected = false;
            do {
                // We absolutely may not unlock cs_main until we've made forward
                // progress (with the exception of shutdown due to hardware
                // issues, low disk space, etc).

                // Destructed before cs_main is unlocked
                ConnectTrace connectTrace(g_mempool);

                if (pindexMostWork == nullptr) {
                    pindexMostWork = FindMostWorkChain();
                }

                // Whether we have anything to do at all.
                if (pindexMostWork == nullptr ||
                    pindexMostWork == m_chain.Tip()) {
                    break;
                }

                bool fInvalidFound = false;
                std::shared_ptr<const CBlock> nullBlockPtr;
                if (!ActivateBestChainStep(
                        config, state, pindexMostWork,
                        pblock && pblock->GetHash() ==
                                      pindexMostWork->GetBlockHash()
                            ? pblock
                            : nullBlockPtr,
                        fInvalidFound, connectTrace)) {
                    return false;
                }
                blocks_connected = true;

                if (fInvalidFound) {
                    // Wipe cache, we may need another branch now.
                    pindexMostWork = nullptr;
                }

                pindexNewTip = m_chain.Tip();
                for (const PerBlockConnectTrace &trace :
                     connectTrace.GetBlocksConnected()) {
                    assert(trace.pblock && trace.pindex);
                    GetMainSignals().BlockConnected(trace.pblock, trace.pindex,
                                                    trace.conflictedTxs);
                }
            } while (!m_chain.Tip() ||
                     (starting_tip && CBlockIndexWorkComparator()(
                                          m_chain.Tip(), starting_tip)));

            // Check the index once we're done with the above loop, since
            // we're going to release cs_main soon. If the index is in a bad
            // state now, then it's better to know immediately rather than
            // randomly have it cause a problem in a race.
            CheckBlockIndex(params.GetConsensus());

            if (!blocks_connected) {
                return true;
            }

            const CBlockIndex *pindexFork = m_chain.FindFork(starting_tip);
            bool fInitialDownload = IsInitialBlockDownload();

            // Notify external listeners about the new tip.
            // Enqueue while holding cs_main to ensure that UpdatedBlockTip is
            // called in the order in which blocks are connected
            if (pindexFork != pindexNewTip) {
                // Notify ValidationInterface subscribers
                GetMainSignals().UpdatedBlockTip(pindexNewTip, pindexFork,
                                                 fInitialDownload);

                // Always notify the UI if a new block tip was connected
                uiInterface.NotifyBlockTip(fInitialDownload, pindexNewTip);
            }
        }
        // When we reach this point, we switched to a new tip (stored in
        // pindexNewTip).

        if (nStopAtHeight && pindexNewTip &&
            pindexNewTip->nHeight >= nStopAtHeight) {
            StartShutdown();
        }

        // We check shutdown only after giving ActivateBestChainStep a chance to
        // run once so that we never shutdown before connecting the genesis
        // block during LoadChainTip(). Previously this caused an assert()
        // failure during shutdown in such cases as the UTXO DB flushing checks
        // that the best block hash is non-null.
        if (ShutdownRequested()) {
            break;
        }
    } while (pindexNewTip != pindexMostWork);

    // Write changes periodically to disk, after relay.
    if (!FlushStateToDisk(params, state, FlushStateMode::PERIODIC)) {
        return false;
    }

    return true;
}

bool ActivateBestChain(const Config &config, BlockValidationState &state,
                       std::shared_ptr<const CBlock> pblock) {
    return ::ChainstateActive().ActivateBestChain(config, state,
                                                  std::move(pblock));
}

bool CChainState::PreciousBlock(const Config &config,
                                BlockValidationState &state,
                                CBlockIndex *pindex) {
    {
        LOCK(cs_main);
        if (pindex->nChainWork < m_chain.Tip()->nChainWork) {
            // Nothing to do, this block is not at the tip.
            return true;
        }

        if (m_chain.Tip()->nChainWork > nLastPreciousChainwork) {
            // The chain has been extended since the last call, reset the
            // counter.
            nBlockReverseSequenceId = -1;
        }

        nLastPreciousChainwork = m_chain.Tip()->nChainWork;
        setBlockIndexCandidates.erase(pindex);
        pindex->nSequenceId = nBlockReverseSequenceId;
        if (nBlockReverseSequenceId > std::numeric_limits<int32_t>::min()) {
            // We can't keep reducing the counter if somebody really wants to
            // call preciousblock 2**31-1 times on the same set of tips...
            nBlockReverseSequenceId--;
        }

        // In case this was parked, unpark it.
        UnparkBlock(pindex);

        // Make sure it is added to the candidate list if appropriate.
        if (pindex->IsValid(BlockValidity::TRANSACTIONS) &&
            pindex->HaveTxsDownloaded()) {
            setBlockIndexCandidates.insert(pindex);
            PruneBlockIndexCandidates();
        }
    }

    return ActivateBestChain(config, state);
}

bool PreciousBlock(const Config &config, BlockValidationState &state,
                   CBlockIndex *pindex) {
    return ::ChainstateActive().PreciousBlock(config, state, pindex);
}

bool CChainState::UnwindBlock(const Config &config, BlockValidationState &state,
                              CBlockIndex *pindex, bool invalidate) {
    CBlockIndex *to_mark_failed_or_parked = pindex;
    bool pindex_was_in_chain = false;
    int disconnected = 0;
    const CChainParams &chainparams = config.GetChainParams();

    // We do not allow ActivateBestChain() to run while UnwindBlock() is
    // running, as that could cause the tip to change while we disconnect
    // blocks. (Note for backport of Core PR16849: we acquire
    // LOCK(m_cs_chainstate) in the Park, Invalidate and FinalizeBlock functions
    // due to differences in our code)
    AssertLockHeld(m_cs_chainstate);

    // We'll be acquiring and releasing cs_main below, to allow the validation
    // callbacks to run. However, we should keep the block index in a
    // consistent state as we disconnect blocks -- in particular we need to
    // add equal-work blocks to setBlockIndexCandidates as we disconnect.
    // To avoid walking the block index repeatedly in search of candidates,
    // build a map once so that we can look up candidate blocks by chain
    // work as we go.
    std::multimap<const arith_uint256, CBlockIndex *> candidate_blocks_by_work;

    {
        LOCK(cs_main);
        for (const auto &entry : m_blockman.m_block_index) {
            CBlockIndex *candidate = entry.second;
            // We don't need to put anything in our active chain into the
            // multimap, because those candidates will be found and considered
            // as we disconnect.
            // Instead, consider only non-active-chain blocks that have at
            // least as much work as where we expect the new tip to end up.
            if (!m_chain.Contains(candidate) &&
                !CBlockIndexWorkComparator()(candidate, pindex->pprev) &&
                candidate->IsValid(BlockValidity::TRANSACTIONS) &&
                candidate->HaveTxsDownloaded()) {
                candidate_blocks_by_work.insert(
                    std::make_pair(candidate->nChainWork, candidate));
            }
        }
    }

    // Disconnect (descendants of) pindex, and mark them invalid.
    while (true) {
        if (ShutdownRequested()) {
            break;
        }

        // Make sure the queue of validation callbacks doesn't grow unboundedly.
        LimitValidationInterfaceQueue();

        LOCK(cs_main);

        if (!m_chain.Contains(pindex)) {
            break;
        }

        pindex_was_in_chain = true;
        CBlockIndex *invalid_walk_tip = m_chain.Tip();

        // ActivateBestChain considers blocks already in m_chain
        // unconditionally valid already, so force disconnect away from it.

        DisconnectedBlockTransactions disconnectpool;

        bool ret = DisconnectTip(chainparams, state, &disconnectpool);

        // DisconnectTip will add transactions to disconnectpool.
        // Adjust the mempool to be consistent with the new tip, adding
        // transactions back to the mempool if disconnecting was successful,
        // and we're not doing a very deep invalidation (in which case
        // keeping the mempool up to date is probably futile anyway).
        disconnectpool.updateMempoolForReorg(
            config, /* fAddToMempool = */ (++disconnected <= 10) && ret);

        if (!ret) {
            return false;
        }

        assert(invalid_walk_tip->pprev == m_chain.Tip());

        // We immediately mark the disconnected blocks as invalid.
        // This prevents a case where pruned nodes may fail to invalidateblock
        // and be left unable to start as they have no tip candidates (as there
        // are no blocks that meet the "have data and are not invalid per
        // nStatus" criteria for inclusion in setBlockIndexCandidates).

        invalid_walk_tip->nStatus =
            invalidate ? invalid_walk_tip->nStatus.withFailed()
                       : invalid_walk_tip->nStatus.withParked();

        setDirtyBlockIndex.insert(invalid_walk_tip);
        setBlockIndexCandidates.insert(invalid_walk_tip->pprev);

        if (invalid_walk_tip == to_mark_failed_or_parked->pprev &&
            (invalidate ? to_mark_failed_or_parked->nStatus.hasFailed()
                        : to_mark_failed_or_parked->nStatus.isParked())) {
            // We only want to mark the last disconnected block as
            // Failed (or Parked); its children need to be FailedParent (or
            // ParkedParent) instead.
            to_mark_failed_or_parked->nStatus =
                (invalidate
                     ? to_mark_failed_or_parked->nStatus.withFailed(false)
                           .withFailedParent()
                     : to_mark_failed_or_parked->nStatus.withParked(false)
                           .withParkedParent());

            setDirtyBlockIndex.insert(to_mark_failed_or_parked);
        }

        // Add any equal or more work headers to setBlockIndexCandidates
        auto candidate_it = candidate_blocks_by_work.lower_bound(
            invalid_walk_tip->pprev->nChainWork);
        while (candidate_it != candidate_blocks_by_work.end()) {
            if (!CBlockIndexWorkComparator()(candidate_it->second,
                                             invalid_walk_tip->pprev)) {
                setBlockIndexCandidates.insert(candidate_it->second);
                candidate_it = candidate_blocks_by_work.erase(candidate_it);
            } else {
                ++candidate_it;
            }
        }

        // Track the last disconnected block, so we can correct its
        // FailedParent (or ParkedParent) status in future iterations, or, if
        // it's the last one, call InvalidChainFound on it.
        to_mark_failed_or_parked = invalid_walk_tip;
    }

    CheckBlockIndex(chainparams.GetConsensus());

    {
        LOCK(cs_main);
        if (m_chain.Contains(to_mark_failed_or_parked)) {
            // If the to-be-marked invalid block is in the active chain,
            // something is interfering and we can't proceed.
            return false;
        }

        // Mark pindex (or the last disconnected block) as invalid (or parked),
        // even when it never was in the main chain.
        to_mark_failed_or_parked->nStatus =
            invalidate ? to_mark_failed_or_parked->nStatus.withFailed()
                       : to_mark_failed_or_parked->nStatus.withParked();
        setDirtyBlockIndex.insert(to_mark_failed_or_parked);
        if (invalidate) {
            m_blockman.m_failed_blocks.insert(to_mark_failed_or_parked);
        }

        // If any new blocks somehow arrived while we were disconnecting
        // (above), then the pre-calculation of what should go into
        // setBlockIndexCandidates may have missed entries. This would
        // technically be an inconsistency in the block index, but if we clean
        // it up here, this should be an essentially unobservable error.
        // Loop back over all block index entries and add any missing entries
        // to setBlockIndexCandidates.
        for (const std::pair<const BlockHash, CBlockIndex *> &it :
             m_blockman.m_block_index) {
            CBlockIndex *i = it.second;
            if (i->IsValid(BlockValidity::TRANSACTIONS) &&
                i->HaveTxsDownloaded() &&
                !setBlockIndexCandidates.value_comp()(i, m_chain.Tip())) {
                setBlockIndexCandidates.insert(i);
            }
        }

        if (invalidate) {
            InvalidChainFound(to_mark_failed_or_parked);
        }
    }

    // Only notify about a new block tip if the active chain was modified.
    if (pindex_was_in_chain) {
        uiInterface.NotifyBlockTip(IsInitialBlockDownload(),
                                   to_mark_failed_or_parked->pprev);
    }
    return true;
}

bool CChainState::InvalidateBlock(const Config &config,
                                  BlockValidationState &state,
                                  CBlockIndex *pindex) {
    AssertLockNotHeld(m_cs_chainstate);
    // See 'Note for backport of Core PR16849' in CChainState::UnwindBlock
    LOCK(m_cs_chainstate);

    return UnwindBlock(config, state, pindex, true);
}

bool CChainState::ParkBlock(const Config &config, BlockValidationState &state,
                            CBlockIndex *pindex) {
    AssertLockNotHeld(m_cs_chainstate);
    // See 'Note for backport of Core PR16849' in CChainState::UnwindBlock
    LOCK(m_cs_chainstate);

    return UnwindBlock(config, state, pindex, false);
}

bool CChainState::FinalizeBlock(const Config &config,
                                BlockValidationState &state,
                                CBlockIndex *pindex) {
    AssertLockNotHeld(m_cs_chainstate);
    // See 'Note for backport of Core PR16849' in CChainState::UnwindBlock
    LOCK(m_cs_chainstate);

    AssertLockNotHeld(cs_main);
    CBlockIndex *pindexToInvalidate = nullptr;
    {
        LOCK(cs_main);
        if (!MarkBlockAsFinal(config, state, pindex)) {
            // state is set by MarkBlockAsFinal.
            return false;
        }

        // We have a valid candidate, make sure it is not parked.
        if (pindex->nStatus.isOnParkedChain()) {
            UnparkBlock(pindex);
        }

        // If the finalized block is on the active chain, there is no need to
        // rewind.
        if (::ChainActive().Contains(pindex)) {
            return true;
        }

        // If the finalized block is not on the active chain, that chain is
        // invalid
        // ...
        const CBlockIndex *pindexFork = ::ChainActive().FindFork(pindex);
        pindexToInvalidate = ::ChainActive().Next(pindexFork);
        if (!pindexToInvalidate) {
            return false;
        }
    } // end of locked cs_main scope

    // ... therefore, we invalidate the block on the active chain that comes
    // immediately after it
    return UnwindBlock(config, state, pindexToInvalidate,
                       true /* invalidating */);
}

template <typename F>
bool CChainState::UpdateFlagsForBlock(CBlockIndex *pindexBase,
                                      CBlockIndex *pindex, F f) {
    BlockStatus newStatus = f(pindex->nStatus);
    if (pindex->nStatus != newStatus &&
        (!pindexBase ||
         pindex->GetAncestor(pindexBase->nHeight) == pindexBase)) {
        pindex->nStatus = newStatus;
        setDirtyBlockIndex.insert(pindex);
        if (newStatus.isValid()) {
            m_blockman.m_failed_blocks.erase(pindex);
        }

        if (pindex->IsValid(BlockValidity::TRANSACTIONS) &&
            pindex->HaveTxsDownloaded() &&
            setBlockIndexCandidates.value_comp()(::ChainActive().Tip(),
                                                 pindex)) {
            setBlockIndexCandidates.insert(pindex);
        }
        return true;
    }
    return false;
}

template <typename F, typename C, typename AC>
void CChainState::UpdateFlags(CBlockIndex *pindex, CBlockIndex *&pindexReset,
                              F f, C fChild, AC fAncestorWasChanged) {
    AssertLockHeld(cs_main);

    // Update the current block and ancestors; while we're doing this, identify
    // which was the deepest ancestor we changed.
    CBlockIndex *pindexDeepestChanged = pindex;
    for (auto pindexAncestor = pindex; pindexAncestor != nullptr;
         pindexAncestor = pindexAncestor->pprev) {
        if (UpdateFlagsForBlock(nullptr, pindexAncestor, f)) {
            pindexDeepestChanged = pindexAncestor;
        }
    }

    if (pindexReset &&
        pindexReset->GetAncestor(pindexDeepestChanged->nHeight) ==
            pindexDeepestChanged) {
        // reset pindexReset if it had a modified ancestor.
        pindexReset = nullptr;
    }

    // Update all blocks under modified blocks.
    BlockMap::iterator it = m_blockman.m_block_index.begin();
    while (it != m_blockman.m_block_index.end()) {
        UpdateFlagsForBlock(pindex, it->second, fChild);
        UpdateFlagsForBlock(pindexDeepestChanged, it->second,
                            fAncestorWasChanged);
        it++;
    }
}

void CChainState::ResetBlockFailureFlags(CBlockIndex *pindex) {
    AssertLockHeld(cs_main);

    // In case we are reconsidering something before the finalization point,
    // move the finalization point to the last common ancestor.
    if (pindexFinalized) {
        pindexFinalized = LastCommonAncestor(pindex, pindexFinalized);
    }

    UpdateFlags(
        pindex, pindexBestInvalid,
        [](const BlockStatus status) {
            return status.withClearedFailureFlags();
        },
        [](const BlockStatus status) {
            return status.withClearedFailureFlags();
        },
        [](const BlockStatus status) {
            return status.withFailedParent(false);
        });
}

void ResetBlockFailureFlags(CBlockIndex *pindex) {
    return ::ChainstateActive().ResetBlockFailureFlags(pindex);
}

void CChainState::UnparkBlockImpl(CBlockIndex *pindex, bool fClearChildren) {
    AssertLockHeld(cs_main);

    UpdateFlags(
        pindex, pindexBestParked,
        [](const BlockStatus status) {
            return status.withClearedParkedFlags();
        },
        [fClearChildren](const BlockStatus status) {
            return fClearChildren ? status.withClearedParkedFlags()
                                  : status.withParkedParent(false);
        },
        [](const BlockStatus status) {
            return status.withParkedParent(false);
        });
}

void UnparkBlockAndChildren(CBlockIndex *pindex) {
    return ::ChainstateActive().UnparkBlockImpl(pindex, true);
}

void UnparkBlock(CBlockIndex *pindex) {
    return ::ChainstateActive().UnparkBlockImpl(pindex, false);
}

const CBlockIndex *GetFinalizedBlock() {
    AssertLockHeld(cs_main);
    return pindexFinalized;
}

bool IsBlockFinalized(const CBlockIndex *pindex) {
    AssertLockHeld(cs_main);
    return pindexFinalized &&
           pindexFinalized->GetAncestor(pindex->nHeight) == pindex;
}

CBlockIndex *BlockManager::AddToBlockIndex(const CBlockHeader &block) {
    AssertLockHeld(cs_main);

    // Check for duplicate
    BlockHash hash = block.GetHash();
    BlockMap::iterator it = m_block_index.find(hash);
    if (it != m_block_index.end()) {
        return it->second;
    }

    // Construct new block index object
    CBlockIndex *pindexNew = new CBlockIndex(block);
    // We assign the sequence id to blocks only when the full data is available,
    // to avoid miners withholding blocks but broadcasting headers, to get a
    // competitive advantage.
    pindexNew->nSequenceId = 0;
    BlockMap::iterator mi =
        m_block_index.insert(std::make_pair(hash, pindexNew)).first;
    pindexNew->phashBlock = &((*mi).first);
    BlockMap::iterator miPrev = m_block_index.find(block.hashPrevBlock);
    if (miPrev != m_block_index.end()) {
        pindexNew->pprev = (*miPrev).second;
        pindexNew->nHeight = pindexNew->pprev->nHeight + 1;
        pindexNew->BuildSkip();
    }
    pindexNew->nTimeReceived = GetTime();
    pindexNew->nTimeMax =
        (pindexNew->pprev
             ? std::max(pindexNew->pprev->nTimeMax, pindexNew->nTime)
             : pindexNew->nTime);
    pindexNew->nChainWork =
        (pindexNew->pprev ? pindexNew->pprev->nChainWork : 0) +
        GetBlockProof(*pindexNew);
    pindexNew->RaiseValidity(BlockValidity::TREE);
    if (pindexBestHeader == nullptr ||
        pindexBestHeader->nChainWork < pindexNew->nChainWork) {
        pindexBestHeader = pindexNew;
    }

    setDirtyBlockIndex.insert(pindexNew);
    return pindexNew;
}

/**
 * Mark a block as having its data received and checked (up to
 * BLOCK_VALID_TRANSACTIONS).
 */
void CChainState::ReceivedBlockTransactions(const CBlock &block,
                                            CBlockIndex *pindexNew,
                                            const FlatFilePos &pos) {
    pindexNew->nTx = block.vtx.size();
    pindexNew->nFile = pos.nFile;
    pindexNew->nDataPos = pos.nPos;
    pindexNew->nUndoPos = 0;
    pindexNew->nStatus = pindexNew->nStatus.withData();
    pindexNew->RaiseValidity(BlockValidity::TRANSACTIONS);
    setDirtyBlockIndex.insert(pindexNew);

    if (pindexNew->UpdateChainStats()) {
        // If pindexNew is the genesis block or all parents are
        // BLOCK_VALID_TRANSACTIONS.
        std::deque<CBlockIndex *> queue;
        queue.push_back(pindexNew);

        // Recursively process any descendant blocks that now may be eligible to
        // be connected.
        while (!queue.empty()) {
            CBlockIndex *pindex = queue.front();
            queue.pop_front();
            pindex->UpdateChainStats();
            if (pindex->nSequenceId == 0) {
                // We assign a sequence is when transaction are received to
                // prevent a miner from being able to broadcast a block but not
                // its content. However, a sequence id may have been set
                // manually, for instance via PreciousBlock, in which case, we
                // don't need to assign one.
                pindex->nSequenceId = nBlockSequenceId++;
            }

            if (m_chain.Tip() == nullptr ||
                !setBlockIndexCandidates.value_comp()(pindex, m_chain.Tip())) {
                setBlockIndexCandidates.insert(pindex);
            }

            std::pair<std::multimap<CBlockIndex *, CBlockIndex *>::iterator,
                      std::multimap<CBlockIndex *, CBlockIndex *>::iterator>
                range = m_blockman.m_blocks_unlinked.equal_range(pindex);
            while (range.first != range.second) {
                std::multimap<CBlockIndex *, CBlockIndex *>::iterator it =
                    range.first;
                queue.push_back(it->second);
                range.first++;
                m_blockman.m_blocks_unlinked.erase(it);
            }
        }
    } else if (pindexNew->pprev &&
               pindexNew->pprev->IsValid(BlockValidity::TREE)) {
        m_blockman.m_blocks_unlinked.insert(
            std::make_pair(pindexNew->pprev, pindexNew));
    }
}

static bool FindBlockPos(FlatFilePos &pos, unsigned int nAddSize,
                         unsigned int nHeight, uint64_t nTime,
                         bool fKnown = false) {
    LOCK(cs_LastBlockFile);

    unsigned int nFile = fKnown ? pos.nFile : nLastBlockFile;
    if (vinfoBlockFile.size() <= nFile) {
        vinfoBlockFile.resize(nFile + 1);
    }

    if (!fKnown) {
        while (vinfoBlockFile[nFile].nSize + nAddSize >= MAX_BLOCKFILE_SIZE) {
            nFile++;
            if (vinfoBlockFile.size() <= nFile) {
                vinfoBlockFile.resize(nFile + 1);
            }
        }
        pos.nFile = nFile;
        pos.nPos = vinfoBlockFile[nFile].nSize;
    }

    if ((int)nFile != nLastBlockFile) {
        if (!fKnown) {
            LogPrintf("Leaving block file %i: %s\n", nLastBlockFile,
                      vinfoBlockFile[nLastBlockFile].ToString());
        }
        FlushBlockFile(!fKnown);
        nLastBlockFile = nFile;
    }

    vinfoBlockFile[nFile].AddBlock(nHeight, nTime);
    if (fKnown) {
        vinfoBlockFile[nFile].nSize =
            std::max(pos.nPos + nAddSize, vinfoBlockFile[nFile].nSize);
    } else {
        vinfoBlockFile[nFile].nSize += nAddSize;
    }

    if (!fKnown) {
        bool out_of_space;
        size_t bytes_allocated =
            BlockFileSeq().Allocate(pos, nAddSize, out_of_space);
        if (out_of_space) {
            return AbortNode("Disk space is too low!",
                             _("Error: Disk space is too low!").translated,
                             CClientUIInterface::MSG_NOPREFIX);
        }
        if (bytes_allocated != 0 && fPruneMode) {
            fCheckForPruning = true;
        }
    }

    setDirtyFileInfo.insert(nFile);
    return true;
}

static bool FindUndoPos(BlockValidationState &state, int nFile,
                        FlatFilePos &pos, unsigned int nAddSize) {
    pos.nFile = nFile;

    LOCK(cs_LastBlockFile);

    pos.nPos = vinfoBlockFile[nFile].nUndoSize;
    vinfoBlockFile[nFile].nUndoSize += nAddSize;
    setDirtyFileInfo.insert(nFile);

    bool out_of_space;
    size_t bytes_allocated =
        UndoFileSeq().Allocate(pos, nAddSize, out_of_space);
    if (out_of_space) {
        return AbortNode(state, "Disk space is too low!",
                         _("Error: Disk space is too low!").translated,
                         CClientUIInterface::MSG_NOPREFIX);
    }
    if (bytes_allocated != 0 && fPruneMode) {
        fCheckForPruning = true;
    }

    return true;
}

/**
 * Return true if the provided block header is valid.
 * Only verify PoW if blockValidationOptions is configured to do so.
 * This allows validation of headers on which the PoW hasn't been done.
 * For example: to validate template handed to mining software.
 * Do not call this for any check that depends on the context.
 * For context-dependent calls, see ContextualCheckBlockHeader.
 */
static bool CheckBlockHeader(const CBlockHeader &block,
                             BlockValidationState &state,
                             const Consensus::Params &params,
                             BlockValidationOptions validationOptions) {
    // Check proof of work matches claimed amount
    if (validationOptions.shouldValidatePoW() &&
        !CheckProofOfWork(block.GetHash(), block.nBits, params)) {
        return state.Invalid(BlockValidationResult::BLOCK_INVALID_HEADER,
                             REJECT_INVALID, "high-hash",
                             "proof of work failed");
    }

    return true;
}

bool CheckBlock(const CBlock &block, BlockValidationState &state,
                const Consensus::Params &params,
                BlockValidationOptions validationOptions) {
    // These are checks that are independent of context.
    if (block.fChecked) {
        return true;
    }

    // Check that the header is valid (particularly PoW).  This is mostly
    // redundant with the call in AcceptBlockHeader.
    if (!CheckBlockHeader(block, state, params, validationOptions)) {
        return false;
    }

    // Check the merkle root.
    if (validationOptions.shouldValidateMerkleRoot()) {
        bool mutated;
        uint256 hashMerkleRoot2 = BlockMerkleRoot(block, &mutated);
        if (block.hashMerkleRoot != hashMerkleRoot2) {
            return state.Invalid(BlockValidationResult::BLOCK_MUTATED,
                                 REJECT_INVALID, "bad-txnmrklroot",
                                 "hashMerkleRoot mismatch");
        }

        // Check for merkle tree malleability (CVE-2012-2459): repeating
        // sequences of transactions in a block without affecting the merkle
        // root of a block, while still invalidating it.
        if (mutated) {
            return state.Invalid(BlockValidationResult::BLOCK_MUTATED,
                                 REJECT_INVALID, "bad-txns-duplicate",
                                 "duplicate transaction");
        }
    }

    // All potential-corruption validation must be done before we do any
    // transaction validation, as otherwise we may mark the header as invalid
    // because we receive the wrong transactions for it.

    // First transaction must be coinbase.
    if (block.vtx.empty()) {
        return state.Invalid(BlockValidationResult::BLOCK_CONSENSUS,
                             REJECT_INVALID, "bad-cb-missing",
                             "first tx is not coinbase");
    }

    // Size limits.
    auto nMaxBlockSize = validationOptions.getExcessiveBlockSize();

    // Bail early if there is no way this block is of reasonable size.
    if ((block.vtx.size() * MIN_TRANSACTION_SIZE) > nMaxBlockSize) {
        return state.Invalid(BlockValidationResult::BLOCK_CONSENSUS,
                             REJECT_INVALID, "bad-blk-length",
                             "size limits failed");
    }

    auto currentBlockSize = ::GetSerializeSize(block, PROTOCOL_VERSION);
    if (currentBlockSize > nMaxBlockSize) {
        return state.Invalid(BlockValidationResult::BLOCK_CONSENSUS,
                             REJECT_INVALID, "bad-blk-length",
                             "size limits failed");
    }

    // And a valid coinbase.
    TxValidationState tx_state;
    if (!CheckCoinbase(*block.vtx[0], tx_state)) {
        return state.Invalid(BlockValidationResult::BLOCK_CONSENSUS,
                             tx_state.GetRejectCode(),
                             tx_state.GetRejectReason(),
                             strprintf("Coinbase check failed (txid %s) %s",
                                       block.vtx[0]->GetId().ToString(),
                                       tx_state.GetDebugMessage()));
    }

    // Check transactions for regularity, skipping the first. Note that this
    // is the first time we check that all after the first are !IsCoinBase.
    for (size_t i = 1; i < block.vtx.size(); i++) {
        auto *tx = block.vtx[i].get();
        if (!CheckRegularTransaction(*tx, tx_state)) {
            return state.Invalid(
                BlockValidationResult::BLOCK_CONSENSUS,
                tx_state.GetRejectCode(), tx_state.GetRejectReason(),
                strprintf("Transaction check failed (txid %s) %s",
                          tx->GetId().ToString(), tx_state.GetDebugMessage()));
        }
    }

    if (validationOptions.shouldValidatePoW() &&
        validationOptions.shouldValidateMerkleRoot()) {
        block.fChecked = true;
    }

    return true;
}

/**
 * Context-dependent validity checks.
 * By "context", we mean only the previous block headers, but not the UTXO
 * set; UTXO-related validity checks are done in ConnectBlock().
 * NOTE: This function is not currently invoked by ConnectBlock(), so we
 * should consider upgrade issues if we change which consensus rules are
 * enforced in this function (eg by adding a new consensus rule). See comment
 * in ConnectBlock().
 * Note that -reindex-chainstate skips the validation that happens here!
 */
static bool ContextualCheckBlockHeader(const CChainParams &params,
                                       const CBlockHeader &block,
                                       BlockValidationState &state,
                                       const CBlockIndex *pindexPrev,
                                       int64_t nAdjustedTime)
    EXCLUSIVE_LOCKS_REQUIRED(cs_main) {
    assert(pindexPrev != nullptr);
    const int nHeight = pindexPrev->nHeight + 1;

    // Check proof of work
    if (block.nBits != GetNextWorkRequired(pindexPrev, &block, params)) {
        LogPrintf("bad bits after height: %d\n", pindexPrev->nHeight);
        return state.Invalid(BlockValidationResult::BLOCK_INVALID_HEADER,
                             REJECT_INVALID, "bad-diffbits",
                             "incorrect proof of work");
    }

    // Check against checkpoints
    if (fCheckpointsEnabled) {
        const CCheckpointData &checkpoints = params.Checkpoints();

        // Check that the block chain matches the known block chain up to a
        // checkpoint.
        if (!Checkpoints::CheckBlock(checkpoints, nHeight, block.GetHash())) {
            LogPrintf("ERROR: %s: rejected by checkpoint lock-in at %d\n",
                      __func__, nHeight);
            return state.Invalid(BlockValidationResult::BLOCK_CHECKPOINT,
                                 REJECT_CHECKPOINT, "checkpoint mismatch");
        }

        // Don't accept any forks from the main chain prior to last checkpoint.
        // GetLastCheckpoint finds the last checkpoint in MapCheckpoints that's
        // in our g_blockman.m_block_index.
        CBlockIndex *pcheckpoint = Checkpoints::GetLastCheckpoint(checkpoints);
        if (pcheckpoint && nHeight < pcheckpoint->nHeight) {
            LogPrintf("ERROR: %s: forked chain older than last checkpoint "
                      "(height %d)\n",
                      __func__, nHeight);
            return state.Invalid(BlockValidationResult::BLOCK_CHECKPOINT,
                                 REJECT_CHECKPOINT,
                                 "bad-fork-prior-to-checkpoint");
        }
    }

    // Check timestamp against prev
    if (block.GetBlockTime() <= pindexPrev->GetMedianTimePast()) {
        return state.Invalid(BlockValidationResult::BLOCK_INVALID_HEADER,
                             REJECT_INVALID, "time-too-old",
                             "block's timestamp is too early");
    }

    // Check timestamp
    if (block.GetBlockTime() > nAdjustedTime + MAX_FUTURE_BLOCK_TIME) {
        return state.Invalid(BlockValidationResult::BLOCK_TIME_FUTURE,
                             REJECT_INVALID, "time-too-new",
                             "block timestamp too far in the future");
    }

    // Reject outdated version blocks when 95% (75% on testnet) of the network
    // has upgraded:
    // check for version 2, 3 and 4 upgrades
    const Consensus::Params &consensusParams = params.GetConsensus();
    if ((block.nVersion < 2 && nHeight >= consensusParams.BIP34Height) ||
        (block.nVersion < 3 && nHeight >= consensusParams.BIP66Height) ||
        (block.nVersion < 4 && nHeight >= consensusParams.BIP65Height)) {
        return state.Invalid(
            BlockValidationResult::BLOCK_INVALID_HEADER, REJECT_OBSOLETE,
            strprintf("bad-version(0x%08x)", block.nVersion),
            strprintf("rejected nVersion=0x%08x block", block.nVersion));
    }

    return true;
}

bool ContextualCheckTransactionForCurrentBlock(const Consensus::Params &params,
                                               const CTransaction &tx,
                                               TxValidationState &state,
                                               int flags) {
    AssertLockHeld(cs_main);

    // By convention a negative value for flags indicates that the current
    // network-enforced consensus rules should be used. In a future soft-fork
    // scenario that would mean checking which rules would be enforced for the
    // next block and setting the appropriate flags. At the present time no
    // soft-forks are scheduled, so no flags are set.
    flags = std::max(flags, 0);

    // ContextualCheckTransactionForCurrentBlock() uses
    // ::ChainActive().Height()+1 to evaluate nLockTime because when IsFinalTx()
    // is called within CBlock::AcceptBlock(), the height of the block *being*
    // evaluated is what is used. Thus if we want to know if a transaction can
    // be part of the *next* block, we need to call ContextualCheckTransaction()
    // with one more than ::ChainActive().Height().
    const int nBlockHeight = ::ChainActive().Height() + 1;

    // BIP113 will require that time-locked transactions have nLockTime set to
    // less than the median time of the previous block they're contained in.
    // When the next block is created its previous block will be the current
    // chain tip, so we use that to calculate the median time passed to
    // ContextualCheckTransaction() if LOCKTIME_MEDIAN_TIME_PAST is set.
    const int64_t nMedianTimePast =
        ::ChainActive().Tip() == nullptr
            ? 0
            : ::ChainActive().Tip()->GetMedianTimePast();
    const int64_t nLockTimeCutoff = (flags & LOCKTIME_MEDIAN_TIME_PAST)
                                        ? nMedianTimePast
                                        : GetAdjustedTime();

    return ContextualCheckTransaction(params, tx, state, nBlockHeight,
                                      nLockTimeCutoff, nMedianTimePast);
}

/**
 * NOTE: This function is not currently invoked by ConnectBlock(), so we
 * should consider upgrade issues if we change which consensus rules are
 * enforced in this function (eg by adding a new consensus rule). See comment
 * in ConnectBlock().
 * Note that -reindex-chainstate skips the validation that happens here!
 */
static bool ContextualCheckBlock(const CBlock &block,
                                 BlockValidationState &state,
                                 const Consensus::Params &params,
                                 const CBlockIndex *pindexPrev) {
    const int nHeight = pindexPrev == nullptr ? 0 : pindexPrev->nHeight + 1;

    // Start enforcing BIP113 (Median Time Past).
    int nLockTimeFlags = 0;
    if (nHeight >= params.CSVHeight) {
        assert(pindexPrev != nullptr);
        nLockTimeFlags |= LOCKTIME_MEDIAN_TIME_PAST;
    }

    const int64_t nMedianTimePast =
        pindexPrev == nullptr ? 0 : pindexPrev->GetMedianTimePast();

    const int64_t nLockTimeCutoff = (nLockTimeFlags & LOCKTIME_MEDIAN_TIME_PAST)
                                        ? nMedianTimePast
                                        : block.GetBlockTime();

    const bool fIsMagneticAnomalyEnabled =
        IsMagneticAnomalyEnabled(params, pindexPrev);

    // Check transactions:
    // - canonical ordering
    // - ensure they are finalized
    // - perform a preliminary block-sigops count (they will be recounted more
    // strictly during ConnectBlock).
    // - perform a transaction-sigops check (again, a more strict check will
    // happen in ConnectBlock).
    const CTransaction *prevTx = nullptr;
    for (const auto &ptx : block.vtx) {
        const CTransaction &tx = *ptx;
        if (fIsMagneticAnomalyEnabled) {
            if (prevTx && (tx.GetId() <= prevTx->GetId())) {
                if (tx.GetId() == prevTx->GetId()) {
                    return state.Invalid(BlockValidationResult::BLOCK_CONSENSUS,
                                         REJECT_INVALID, "tx-duplicate",
                                         strprintf("Duplicated transaction %s",
                                                   tx.GetId().ToString()));
                }

                return state.Invalid(
                    BlockValidationResult::BLOCK_CONSENSUS, REJECT_INVALID,
                    "tx-ordering",
                    strprintf("Transaction order is invalid (%s < %s)",
                              tx.GetId().ToString(),
                              prevTx->GetId().ToString()));
            }

            if (prevTx || !tx.IsCoinBase()) {
                prevTx = &tx;
            }
        }

        TxValidationState tx_state;
        if (!ContextualCheckTransaction(params, tx, tx_state, nHeight,
                                        nLockTimeCutoff, nMedianTimePast)) {
            return state.Invalid(BlockValidationResult::BLOCK_CONSENSUS,
                                 REJECT_INVALID, tx_state.GetRejectReason(),
                                 tx_state.GetDebugMessage());
        }
    }

    // Enforce rule that the coinbase starts with serialized block height
    if (nHeight >= params.BIP34Height) {
        CScript expect = CScript() << nHeight;
        if (block.vtx[0]->vin[0].scriptSig.size() < expect.size() ||
            !std::equal(expect.begin(), expect.end(),
                        block.vtx[0]->vin[0].scriptSig.begin())) {
            return state.Invalid(BlockValidationResult::BLOCK_CONSENSUS,
                                 REJECT_INVALID, "bad-cb-height",
                                 "block height mismatch in coinbase");
        }
    }

    return true;
}

/**
 * If the provided block header is valid, add it to the block index.
 *
 * Returns true if the block is successfully added to the block index.
 */
bool BlockManager::AcceptBlockHeader(const Config &config,
                                     const CBlockHeader &block,
                                     BlockValidationState &state,
                                     CBlockIndex **ppindex) {
    AssertLockHeld(cs_main);
    const CChainParams &chainparams = config.GetChainParams();

    // Check for duplicate
    BlockHash hash = block.GetHash();
    BlockMap::iterator miSelf = m_block_index.find(hash);
    CBlockIndex *pindex = nullptr;
    if (hash != chainparams.GetConsensus().hashGenesisBlock) {
        if (miSelf != m_block_index.end()) {
            // Block header is already known.
            pindex = miSelf->second;
            if (ppindex) {
                *ppindex = pindex;
            }

            if (pindex->nStatus.isInvalid()) {
                LogPrintf("ERROR: %s: block %s is marked invalid\n", __func__,
                          hash.ToString());
                return state.Invalid(
                    BlockValidationResult::BLOCK_CACHED_INVALID, 0,
                    "duplicate");
            }

            return true;
        }

        if (!CheckBlockHeader(block, state, chainparams.GetConsensus(),
                              BlockValidationOptions(config))) {
            return error("%s: Consensus::CheckBlockHeader: %s, %s", __func__,
                         hash.ToString(), FormatStateMessage(state));
        }

        // Get prev block index
        BlockMap::iterator mi = m_block_index.find(block.hashPrevBlock);
        if (mi == m_block_index.end()) {
            LogPrintf("ERROR: %s: prev block not found\n", __func__);
            return state.Invalid(BlockValidationResult::BLOCK_MISSING_PREV, 0,
                                 "prev-blk-not-found");
        }

        CBlockIndex *pindexPrev = (*mi).second;
        assert(pindexPrev);
        if (pindexPrev->nStatus.isInvalid()) {
            LogPrintf("ERROR: %s: prev block invalid\n", __func__);
            return state.Invalid(BlockValidationResult::BLOCK_INVALID_PREV,
                                 REJECT_INVALID, "bad-prevblk");
        }

        if (!ContextualCheckBlockHeader(chainparams, block, state, pindexPrev,
                                        GetAdjustedTime())) {
            return error("%s: Consensus::ContextualCheckBlockHeader: %s, %s",
                         __func__, hash.ToString(), FormatStateMessage(state));
        }

        /* Determine if this block descends from any block which has been found
         * invalid (m_failed_blocks), then mark pindexPrev and any blocks
         * between them as failed. For example:
         *
         *                D3
         *              /
         *      B2 - C2
         *    /         \
         *  A             D2 - E2 - F2
         *    \
         *      B1 - C1 - D1 - E1
         *
         * In the case that we attempted to reorg from E1 to F2, only to find
         * C2 to be invalid, we would mark D2, E2, and F2 as BLOCK_FAILED_CHILD
         * but NOT D3 (it was not in any of our candidate sets at the time).
         *
         * In any case D3 will also be marked as BLOCK_FAILED_CHILD at restart
         * in LoadBlockIndex.
         */
        if (!pindexPrev->IsValid(BlockValidity::SCRIPTS)) {
            // The above does not mean "invalid": it checks if the previous
            // block hasn't been validated up to BlockValidity::SCRIPTS. This is
            // a performance optimization, in the common case of adding a new
            // block to the tip, we don't need to iterate over the failed blocks
            // list.
            for (const CBlockIndex *failedit : m_failed_blocks) {
                if (pindexPrev->GetAncestor(failedit->nHeight) == failedit) {
                    assert(failedit->nStatus.hasFailed());
                    CBlockIndex *invalid_walk = pindexPrev;
                    while (invalid_walk != failedit) {
                        invalid_walk->nStatus =
                            invalid_walk->nStatus.withFailedParent();
                        setDirtyBlockIndex.insert(invalid_walk);
                        invalid_walk = invalid_walk->pprev;
                    }
                    LogPrintf("ERROR: %s: prev block invalid\n", __func__);
                    return state.Invalid(
                        BlockValidationResult::BLOCK_INVALID_PREV,
                        REJECT_INVALID, "bad-prevblk");
                }
            }
        }
    }

    if (pindex == nullptr) {
        pindex = AddToBlockIndex(block);
    }

    if (ppindex) {
        *ppindex = pindex;
    }

    return true;
}

// Exposed wrapper for AcceptBlockHeader
bool ProcessNewBlockHeaders(const Config &config,
                            const std::vector<CBlockHeader> &headers,
                            BlockValidationState &state,
                            const CBlockIndex **ppindex) {
    {
        LOCK(cs_main);
        for (const CBlockHeader &header : headers) {
            // Use a temp pindex instead of ppindex to avoid a const_cast
            CBlockIndex *pindex = nullptr;
            bool accepted =
                g_blockman.AcceptBlockHeader(config, header, state, &pindex);
            ::ChainstateActive().CheckBlockIndex(
                config.GetChainParams().GetConsensus());

            if (!accepted) {
                return false;
            }

            if (ppindex) {
                *ppindex = pindex;
            }
        }
    }

    NotifyHeaderTip();
    return true;
}

/**
 * Store block on disk. If dbp is non-nullptr, the file is known to already
 * reside on disk.
 */
static FlatFilePos SaveBlockToDisk(const CBlock &block, int nHeight,
                                   const CChainParams &chainparams,
                                   const FlatFilePos *dbp) {
    unsigned int nBlockSize = ::GetSerializeSize(block, CLIENT_VERSION);
    FlatFilePos blockPos;
    if (dbp != nullptr) {
        blockPos = *dbp;
    }
    if (!FindBlockPos(blockPos, nBlockSize + 8, nHeight, block.GetBlockTime(),
                      dbp != nullptr)) {
        error("%s: FindBlockPos failed", __func__);
        return FlatFilePos();
    }
    if (dbp == nullptr) {
        if (!WriteBlockToDisk(block, blockPos, chainparams.DiskMagic())) {
            AbortNode("Failed to write block");
            return FlatFilePos();
        }
    }
    return blockPos;
}

/**
 * Store a block on disk.
 *
 * @param[in]     config     The global config.
 * @param[in-out] pblock     The block we want to accept.
 * @param[in]     fRequested A boolean to indicate if this block was requested
 *                           from our peers.
 * @param[in]     dbp        If non-null, the disk position of the block.
 * @param[in-out] fNewBlock  True if block was first received via this call.
 * @return True if the block is accepted as a valid block and written to disk.
 */
bool CChainState::AcceptBlock(const Config &config,
                              const std::shared_ptr<const CBlock> &pblock,
                              BlockValidationState &state, bool fRequested,
                              const FlatFilePos *dbp, bool *fNewBlock) {
    AssertLockHeld(cs_main);

    const CBlock &block = *pblock;
    if (fNewBlock) {
        *fNewBlock = false;
    }

    CBlockIndex *pindex = nullptr;

    bool accepted_header =
        m_blockman.AcceptBlockHeader(config, block, state, &pindex);
    CheckBlockIndex(config.GetChainParams().GetConsensus());

    if (!accepted_header) {
        return false;
    }

    // Try to process all requested blocks that we don't have, but only
    // process an unrequested block if it's new and has enough work to
    // advance our tip, and isn't too many blocks ahead.
    bool fAlreadyHave = pindex->nStatus.hasData();

    // TODO: deal better with return value and error conditions for duplicate
    // and unrequested blocks.
    if (fAlreadyHave) {
        return true;
    }

    // Compare block header timestamps and received times of the block and the
    // chaintip.  If they have the same chain height, use these diffs as a
    // tie-breaker, attempting to pick the more honestly-mined block.
    int64_t newBlockTimeDiff = std::llabs(pindex->GetReceivedTimeDiff());
    int64_t chainTipTimeDiff =
        m_chain.Tip() ? std::llabs(m_chain.Tip()->GetReceivedTimeDiff()) : 0;

    bool isSameHeight =
        m_chain.Tip() && (pindex->nChainWork == m_chain.Tip()->nChainWork);
    if (isSameHeight) {
        LogPrintf("Chain tip timestamp-to-received-time difference: hash=%s, "
                  "diff=%d\n",
                  m_chain.Tip()->GetBlockHash().ToString(), chainTipTimeDiff);
        LogPrintf("New block timestamp-to-received-time difference: hash=%s, "
                  "diff=%d\n",
                  pindex->GetBlockHash().ToString(), newBlockTimeDiff);
    }

    bool fHasMoreOrSameWork =
        (m_chain.Tip() ? pindex->nChainWork >= m_chain.Tip()->nChainWork
                       : true);

    // Blocks that are too out-of-order needlessly limit the effectiveness of
    // pruning, because pruning will not delete block files that contain any
    // blocks which are too close in height to the tip.  Apply this test
    // regardless of whether pruning is enabled; it should generally be safe to
    // not process unrequested blocks.
    bool fTooFarAhead =
        (pindex->nHeight > int(m_chain.Height() + MIN_BLOCKS_TO_KEEP));

    // TODO: Decouple this function from the block download logic by removing
    // fRequested
    // This requires some new chain data structure to efficiently look up if a
    // block is in a chain leading to a candidate for best tip, despite not
    // being such a candidate itself.

    // If we didn't ask for it:
    if (!fRequested) {
        // This is a previously-processed block that was pruned.
        if (pindex->nTx != 0) {
            return true;
        }

        // Don't process less-work chains.
        if (!fHasMoreOrSameWork) {
            return true;
        }

        // Block height is too high.
        if (fTooFarAhead) {
            return true;
        }

        // Protect against DoS attacks from low-work chains.
        // If our tip is behind, a peer could try to send us
        // low-work blocks on a fake chain that we would never
        // request; don't process these.
        if (pindex->nChainWork < nMinimumChainWork) {
            return true;
        }
    }

    const CChainParams &chainparams = config.GetChainParams();
    const Consensus::Params &consensusParams = chainparams.GetConsensus();

    if (!CheckBlock(block, state, consensusParams,
                    BlockValidationOptions(config)) ||
        !ContextualCheckBlock(block, state, consensusParams, pindex->pprev)) {
        if (state.IsInvalid() &&
            state.GetResult() != BlockValidationResult::BLOCK_MUTATED) {
            pindex->nStatus = pindex->nStatus.withFailed();
            setDirtyBlockIndex.insert(pindex);
        }

        return error("%s: %s (block %s)", __func__, FormatStateMessage(state),
                     block.GetHash().ToString());
    }

    // If connecting the new block would require rewinding more than one block
    // from the active chain (i.e., a "deep reorg"), then mark the new block as
    // parked. If it has enough work then it will be automatically unparked
    // later, during FindMostWorkChain. We mark the block as parked at the very
    // last minute so we can make sure everything is ready to be reorged if
    // needed.
    if (gArgs.GetBoolArg("-parkdeepreorg", true)) {
        const CBlockIndex *pindexFork = m_chain.FindFork(pindex);
        if (pindexFork && pindexFork->nHeight + 1 < m_chain.Height()) {
            LogPrintf("Park block %s as it would cause a deep reorg.\n",
                      pindex->GetBlockHash().ToString());
            pindex->nStatus = pindex->nStatus.withParked();
            setDirtyBlockIndex.insert(pindex);
        }
    }

    // Header is valid/has work and the merkle tree is good.
    // Relay now, but if it does not build on our best tip, let the
    // SendMessages loop relay it.
    if (!IsInitialBlockDownload() && m_chain.Tip() == pindex->pprev) {
        GetMainSignals().NewPoWValidBlock(pindex, pblock);
    }

    // Write block to history file
    if (fNewBlock) {
        *fNewBlock = true;
    }
    try {
        FlatFilePos blockPos =
            SaveBlockToDisk(block, pindex->nHeight, chainparams, dbp);
        if (blockPos.IsNull()) {
            state.Error(strprintf(
                "%s: Failed to find position to write new block to disk",
                __func__));
            return false;
        }
        ReceivedBlockTransactions(block, pindex, blockPos);
    } catch (const std::runtime_error &e) {
        return AbortNode(state, std::string("System error: ") + e.what());
    }

    FlushStateToDisk(chainparams, state, FlushStateMode::NONE);

    CheckBlockIndex(consensusParams);

    return true;
}

bool ProcessNewBlock(const Config &config,
                     const std::shared_ptr<const CBlock> pblock,
                     bool fForceProcessing, bool *fNewBlock) {
    AssertLockNotHeld(cs_main);

    {
        if (fNewBlock) {
            *fNewBlock = false;
        }

        BlockValidationState state;

        // CheckBlock() does not support multi-threaded block validation
        // because CBlock::fChecked can cause data race.
        // Therefore, the following critical section must include the
        // CheckBlock() call as well.
        LOCK(cs_main);

        // Ensure that CheckBlock() passes before calling AcceptBlock, as
        // belt-and-suspenders.
        bool ret =
            CheckBlock(*pblock, state, config.GetChainParams().GetConsensus(),
                       BlockValidationOptions(config));
        if (ret) {
            // Store to disk
            ret = ::ChainstateActive().AcceptBlock(
                config, pblock, state, fForceProcessing, nullptr, fNewBlock);
        }

        if (!ret) {
            GetMainSignals().BlockChecked(*pblock, state);
            return error("%s: AcceptBlock FAILED (%s)", __func__,
                         FormatStateMessage(state));
        }
    }

    NotifyHeaderTip();

    // Only used to report errors, not invalidity - ignore it
    BlockValidationState state;
    if (!::ChainstateActive().ActivateBestChain(config, state, pblock)) {
        return error("%s: ActivateBestChain failed (%s)", __func__,
                     FormatStateMessage(state));
    }

    return true;
}

bool TestBlockValidity(BlockValidationState &state, const CChainParams &params,
                       const CBlock &block, CBlockIndex *pindexPrev,
                       BlockValidationOptions validationOptions) {
    AssertLockHeld(cs_main);
    assert(pindexPrev && pindexPrev == ::ChainActive().Tip());
    CCoinsViewCache viewNew(pcoinsTip.get());
    BlockHash block_hash(block.GetHash());
    CBlockIndex indexDummy(block);
    indexDummy.pprev = pindexPrev;
    indexDummy.nHeight = pindexPrev->nHeight + 1;
    indexDummy.phashBlock = &block_hash;

    // NOTE: CheckBlockHeader is called by CheckBlock
    if (!ContextualCheckBlockHeader(params, block, state, pindexPrev,
                                    GetAdjustedTime())) {
        return error("%s: Consensus::ContextualCheckBlockHeader: %s", __func__,
                     FormatStateMessage(state));
    }

    if (!CheckBlock(block, state, params.GetConsensus(), validationOptions)) {
        return error("%s: Consensus::CheckBlock: %s", __func__,
                     FormatStateMessage(state));
    }

    if (!ContextualCheckBlock(block, state, params.GetConsensus(),
                              pindexPrev)) {
        return error("%s: Consensus::ContextualCheckBlock: %s", __func__,
                     FormatStateMessage(state));
    }

    if (!::ChainstateActive().ConnectBlock(block, state, &indexDummy, viewNew,
                                           params, validationOptions, true)) {
        return false;
    }

    assert(state.IsValid());
    return true;
}

/**
 * BLOCK PRUNING CODE
 */

/**
 * Calculate the amount of disk space the block & undo files currently use.
 */
uint64_t CalculateCurrentUsage() {
    LOCK(cs_LastBlockFile);

    uint64_t retval = 0;
    for (const CBlockFileInfo &file : vinfoBlockFile) {
        retval += file.nSize + file.nUndoSize;
    }

    return retval;
}

/**
 * Prune a block file (modify associated database entries)
 */
void PruneOneBlockFile(const int fileNumber) {
    LOCK(cs_LastBlockFile);

    for (const auto &entry : g_blockman.m_block_index) {
        CBlockIndex *pindex = entry.second;
        if (pindex->nFile == fileNumber) {
            pindex->nStatus = pindex->nStatus.withData(false).withUndo(false);
            pindex->nFile = 0;
            pindex->nDataPos = 0;
            pindex->nUndoPos = 0;
            setDirtyBlockIndex.insert(pindex);

            // Prune from m_blocks_unlinked -- any block we prune would have
            // to be downloaded again in order to consider its chain, at which
            // point it would be considered as a candidate for
            // m_blocks_unlinked or setBlockIndexCandidates.
            auto range =
                g_blockman.m_blocks_unlinked.equal_range(pindex->pprev);
            while (range.first != range.second) {
                std::multimap<CBlockIndex *, CBlockIndex *>::iterator _it =
                    range.first;
                range.first++;
                if (_it->second == pindex) {
                    g_blockman.m_blocks_unlinked.erase(_it);
                }
            }
        }
    }

    vinfoBlockFile[fileNumber].SetNull();
    setDirtyFileInfo.insert(fileNumber);
}

void UnlinkPrunedFiles(const std::set<int> &setFilesToPrune) {
    for (const int i : setFilesToPrune) {
        FlatFilePos pos(i, 0);
        fs::remove(BlockFileSeq().FileName(pos));
        fs::remove(UndoFileSeq().FileName(pos));
        LogPrintf("Prune: %s deleted blk/rev (%05u)\n", __func__, i);
    }
}

/**
 * Calculate the block/rev files to delete based on height specified by user
 * with RPC command pruneblockchain
 */
static void FindFilesToPruneManual(std::set<int> &setFilesToPrune,
                                   int nManualPruneHeight) {
    assert(fPruneMode && nManualPruneHeight > 0);

    LOCK2(cs_main, cs_LastBlockFile);
    if (::ChainActive().Tip() == nullptr) {
        return;
    }

    // last block to prune is the lesser of (user-specified height,
    // MIN_BLOCKS_TO_KEEP from the tip)
    unsigned int nLastBlockWeCanPrune =
        std::min((unsigned)nManualPruneHeight,
                 ::ChainActive().Tip()->nHeight - MIN_BLOCKS_TO_KEEP);
    int count = 0;
    for (int fileNumber = 0; fileNumber < nLastBlockFile; fileNumber++) {
        if (vinfoBlockFile[fileNumber].nSize == 0 ||
            vinfoBlockFile[fileNumber].nHeightLast > nLastBlockWeCanPrune) {
            continue;
        }
        PruneOneBlockFile(fileNumber);
        setFilesToPrune.insert(fileNumber);
        count++;
    }
    LogPrintf("Prune (Manual): prune_height=%d removed %d blk/rev pairs\n",
              nLastBlockWeCanPrune, count);
}

/* This function is called from the RPC code for pruneblockchain */
void PruneBlockFilesManual(int nManualPruneHeight) {
    BlockValidationState state;
    const CChainParams &chainparams = Params();
    if (!::ChainstateActive().FlushStateToDisk(
            chainparams, state, FlushStateMode::NONE, nManualPruneHeight)) {
        LogPrintf("%s: failed to flush state (%s)\n", __func__,
                  FormatStateMessage(state));
    }
}

/**
 * Prune block and undo files (blk???.dat and undo???.dat) so that the disk
 * space used is less than a user-defined target. The user sets the target (in
 * MB) on the command line or in config file.  This will be run on startup and
 * whenever new space is allocated in a block or undo file, staying below the
 * target. Changing back to unpruned requires a reindex (which in this case
 * means the blockchain must be re-downloaded.)
 *
 * Pruning functions are called from FlushStateToDisk when the global
 * fCheckForPruning flag has been set. Block and undo files are deleted in
 * lock-step (when blk00003.dat is deleted, so is rev00003.dat.). Pruning cannot
 * take place until the longest chain is at least a certain length (100000 on
 * mainnet, 1000 on testnet, 1000 on regtest). Pruning will never delete a block
 * within a defined distance (currently 288) from the active chain's tip. The
 * block index is updated by unsetting HAVE_DATA and HAVE_UNDO for any blocks
 * that were stored in the deleted files. A db flag records the fact that at
 * least some block files have been pruned.
 *
 * @param[out]   setFilesToPrune   The set of file indices that can be unlinked
 * will be returned
 */
static void FindFilesToPrune(std::set<int> &setFilesToPrune,
                             uint64_t nPruneAfterHeight) {
    LOCK2(cs_main, cs_LastBlockFile);
    if (::ChainActive().Tip() == nullptr || nPruneTarget == 0) {
        return;
    }
    if (uint64_t(::ChainActive().Tip()->nHeight) <= nPruneAfterHeight) {
        return;
    }

    unsigned int nLastBlockWeCanPrune =
        ::ChainActive().Tip()->nHeight - MIN_BLOCKS_TO_KEEP;
    uint64_t nCurrentUsage = CalculateCurrentUsage();
    // We don't check to prune until after we've allocated new space for files,
    // so we should leave a buffer under our target to account for another
    // allocation before the next pruning.
    uint64_t nBuffer = BLOCKFILE_CHUNK_SIZE + UNDOFILE_CHUNK_SIZE;
    uint64_t nBytesToPrune;
    int count = 0;

    if (nCurrentUsage + nBuffer >= nPruneTarget) {
        // On a prune event, the chainstate DB is flushed.
        // To avoid excessive prune events negating the benefit of high dbcache
        // values, we should not prune too rapidly.
        // So when pruning in IBD, increase the buffer a bit to avoid a re-prune
        // too soon.
        if (::ChainstateActive().IsInitialBlockDownload()) {
            // Since this is only relevant during IBD, we use a fixed 10%
            nBuffer += nPruneTarget / 10;
        }

        for (int fileNumber = 0; fileNumber < nLastBlockFile; fileNumber++) {
            nBytesToPrune = vinfoBlockFile[fileNumber].nSize +
                            vinfoBlockFile[fileNumber].nUndoSize;

            if (vinfoBlockFile[fileNumber].nSize == 0) {
                continue;
            }

            // are we below our target?
            if (nCurrentUsage + nBuffer < nPruneTarget) {
                break;
            }

            // don't prune files that could have a block within
            // MIN_BLOCKS_TO_KEEP of the main chain's tip but keep scanning
            if (vinfoBlockFile[fileNumber].nHeightLast > nLastBlockWeCanPrune) {
                continue;
            }

            PruneOneBlockFile(fileNumber);
            // Queue up the files for removal
            setFilesToPrune.insert(fileNumber);
            nCurrentUsage -= nBytesToPrune;
            count++;
        }
    }

    LogPrint(BCLog::PRUNE,
             "Prune: target=%dMiB actual=%dMiB diff=%dMiB "
             "max_prune_height=%d removed %d blk/rev pairs\n",
             nPruneTarget / 1024 / 1024, nCurrentUsage / 1024 / 1024,
             ((int64_t)nPruneTarget - (int64_t)nCurrentUsage) / 1024 / 1024,
             nLastBlockWeCanPrune, count);
}

static FlatFileSeq BlockFileSeq() {
    return FlatFileSeq(GetBlocksDir(), "blk", BLOCKFILE_CHUNK_SIZE);
}

static FlatFileSeq UndoFileSeq() {
    return FlatFileSeq(GetBlocksDir(), "rev", UNDOFILE_CHUNK_SIZE);
}

FILE *OpenBlockFile(const FlatFilePos &pos, bool fReadOnly) {
    return BlockFileSeq().Open(pos, fReadOnly);
}

/** Open an undo file (rev?????.dat) */
static FILE *OpenUndoFile(const FlatFilePos &pos, bool fReadOnly) {
    return UndoFileSeq().Open(pos, fReadOnly);
}

fs::path GetBlockPosFilename(const FlatFilePos &pos) {
    return BlockFileSeq().FileName(pos);
}

CBlockIndex *BlockManager::InsertBlockIndex(const BlockHash &hash) {
    AssertLockHeld(cs_main);

    if (hash.IsNull()) {
        return nullptr;
    }

    // Return existing
    BlockMap::iterator mi = m_block_index.find(hash);
    if (mi != m_block_index.end()) {
        return (*mi).second;
    }

    // Create new
    CBlockIndex *pindexNew = new CBlockIndex();
    mi = m_block_index.insert(std::make_pair(hash, pindexNew)).first;
    pindexNew->phashBlock = &((*mi).first);

    return pindexNew;
}

bool BlockManager::LoadBlockIndex(
    const Consensus::Params &params, CBlockTreeDB &blocktree,
    std::set<CBlockIndex *, CBlockIndexWorkComparator>
        &block_index_candidates) {
    AssertLockHeld(cs_main);
    if (!blocktree.LoadBlockIndexGuts(
            params, [this](const BlockHash &hash) EXCLUSIVE_LOCKS_REQUIRED(
                        cs_main) { return this->InsertBlockIndex(hash); })) {
        return false;
    }

    // Calculate nChainWork
    std::vector<std::pair<int, CBlockIndex *>> vSortedByHeight;
    vSortedByHeight.reserve(m_block_index.size());
    for (const std::pair<const BlockHash, CBlockIndex *> &item :
         m_block_index) {
        CBlockIndex *pindex = item.second;
        vSortedByHeight.push_back(std::make_pair(pindex->nHeight, pindex));
    }

    sort(vSortedByHeight.begin(), vSortedByHeight.end());
    for (const std::pair<int, CBlockIndex *> &item : vSortedByHeight) {
        if (ShutdownRequested()) {
            return false;
        }
        CBlockIndex *pindex = item.second;
        pindex->nChainWork = (pindex->pprev ? pindex->pprev->nChainWork : 0) +
                             GetBlockProof(*pindex);
        pindex->nTimeMax =
            (pindex->pprev ? std::max(pindex->pprev->nTimeMax, pindex->nTime)
                           : pindex->nTime);
        // We can link the chain of blocks for which we've received transactions
        // at some point. Pruned nodes may have deleted the block.
        if (pindex->nTx > 0) {
            if (!pindex->UpdateChainStats() && pindex->pprev) {
                m_blocks_unlinked.insert(std::make_pair(pindex->pprev, pindex));
            }
        }

        if (!pindex->nStatus.hasFailed() && pindex->pprev &&
            pindex->pprev->nStatus.hasFailed()) {
            pindex->nStatus = pindex->nStatus.withFailedParent();
            setDirtyBlockIndex.insert(pindex);
        }
        if (pindex->IsValid(BlockValidity::TRANSACTIONS) &&
            (pindex->HaveTxsDownloaded() || pindex->pprev == nullptr)) {
            block_index_candidates.insert(pindex);
        }

        if (pindex->nStatus.isInvalid() &&
            (!pindexBestInvalid ||
             pindex->nChainWork > pindexBestInvalid->nChainWork)) {
            pindexBestInvalid = pindex;
        }

        if (pindex->nStatus.isOnParkedChain() &&
            (!pindexBestParked ||
             pindex->nChainWork > pindexBestParked->nChainWork)) {
            pindexBestParked = pindex;
        }

        if (pindex->pprev) {
            pindex->BuildSkip();
        }

        if (pindex->IsValid(BlockValidity::TREE) &&
            (pindexBestHeader == nullptr ||
             CBlockIndexWorkComparator()(pindexBestHeader, pindex))) {
            pindexBestHeader = pindex;
        }
    }

    return true;
}

void BlockManager::Unload() {
    m_failed_blocks.clear();
    m_blocks_unlinked.clear();

    for (const BlockMap::value_type &entry : m_block_index) {
        delete entry.second;
    }

    m_block_index.clear();
}

static bool LoadBlockIndexDB(const Consensus::Params &params)
    EXCLUSIVE_LOCKS_REQUIRED(cs_main) {
    if (!g_blockman.LoadBlockIndex(
            params, *pblocktree,
            ::ChainstateActive().setBlockIndexCandidates)) {
        return false;
    }

    // Load block file info
    pblocktree->ReadLastBlockFile(nLastBlockFile);
    vinfoBlockFile.resize(nLastBlockFile + 1);
    LogPrintf("%s: last block file = %i\n", __func__, nLastBlockFile);
    for (int nFile = 0; nFile <= nLastBlockFile; nFile++) {
        pblocktree->ReadBlockFileInfo(nFile, vinfoBlockFile[nFile]);
    }

    LogPrintf("%s: last block file info: %s\n", __func__,
              vinfoBlockFile[nLastBlockFile].ToString());

    for (int nFile = nLastBlockFile + 1; true; nFile++) {
        CBlockFileInfo info;
        if (pblocktree->ReadBlockFileInfo(nFile, info)) {
            vinfoBlockFile.push_back(info);
        } else {
            break;
        }
    }

    // Check presence of blk files
    LogPrintf("Checking all blk files are present...\n");
    std::set<int> setBlkDataFiles;
    for (const std::pair<const BlockHash, CBlockIndex *> &item :
         g_blockman.m_block_index) {
        CBlockIndex *pindex = item.second;
        if (pindex->nStatus.hasData()) {
            setBlkDataFiles.insert(pindex->nFile);
        }
    }

    for (const int i : setBlkDataFiles) {
        FlatFilePos pos(i, 0);
        if (CAutoFile(OpenBlockFile(pos, true), SER_DISK, CLIENT_VERSION)
                .IsNull()) {
            return false;
        }
    }

    // Check whether we have ever pruned block & undo files
    pblocktree->ReadFlag("prunedblockfiles", fHavePruned);
    if (fHavePruned) {
        LogPrintf(
            "LoadBlockIndexDB(): Block files have previously been pruned\n");
    }

    // Check whether we need to continue reindexing
    if (pblocktree->IsReindexing()) {
        fReindex = true;
    }

    return true;
}

bool LoadChainTip(const Config &config) {
    AssertLockHeld(cs_main);
    // Never called when the coins view is empty
    assert(!pcoinsTip->GetBestBlock().IsNull());

    if (::ChainActive().Tip() &&
        ::ChainActive().Tip()->GetBlockHash() == pcoinsTip->GetBestBlock()) {
        return true;
    }

    // Load pointer to end of best chain
    CBlockIndex *pindex = LookupBlockIndex(pcoinsTip->GetBestBlock());
    if (!pindex) {
        return false;
    }
    ::ChainActive().SetTip(pindex);

    ::ChainstateActive().PruneBlockIndexCandidates();

    LogPrintf(
        "Loaded best chain: hashBestChain=%s height=%d date=%s progress=%f\n",
        ::ChainActive().Tip()->GetBlockHash().ToString(),
        ::ChainActive().Height(),
        FormatISO8601DateTime(::ChainActive().Tip()->GetBlockTime()),
        GuessVerificationProgress(config.GetChainParams().TxData(),
                                  ::ChainActive().Tip()));
    return true;
}

CVerifyDB::CVerifyDB() {
    uiInterface.ShowProgress(_("Verifying blocks...").translated, 0, false);
}

CVerifyDB::~CVerifyDB() {
    uiInterface.ShowProgress("", 100, false);
}

bool CVerifyDB::VerifyDB(const Config &config, CCoinsView *coinsview,
                         int nCheckLevel, int nCheckDepth) {
    LOCK(cs_main);

    const CChainParams &params = config.GetChainParams();
    const Consensus::Params &consensusParams = params.GetConsensus();

    if (::ChainActive().Tip() == nullptr ||
        ::ChainActive().Tip()->pprev == nullptr) {
        return true;
    }

    // Verify blocks in the best chain
    if (nCheckDepth <= 0 || nCheckDepth > ::ChainActive().Height()) {
        nCheckDepth = ::ChainActive().Height();
    }

    nCheckLevel = std::max(0, std::min(4, nCheckLevel));
    LogPrintf("Verifying last %i blocks at level %i\n", nCheckDepth,
              nCheckLevel);

    CCoinsViewCache coins(coinsview);
    CBlockIndex *pindex;
    CBlockIndex *pindexFailure = nullptr;
    int nGoodTransactions = 0;
    BlockValidationState state;
    int reportDone = 0;
    LogPrintfToBeContinued("[0%%]...");
    for (pindex = ::ChainActive().Tip(); pindex && pindex->pprev;
         pindex = pindex->pprev) {
        boost::this_thread::interruption_point();
        const int percentageDone =
            std::max(1, std::min(99, (int)(((double)(::ChainActive().Height() -
                                                     pindex->nHeight)) /
                                           (double)nCheckDepth *
                                           (nCheckLevel >= 4 ? 50 : 100))));
        if (reportDone < percentageDone / 10) {
            // report every 10% step
            LogPrintfToBeContinued("[%d%%]...", percentageDone);
            reportDone = percentageDone / 10;
        }

        uiInterface.ShowProgress(_("Verifying blocks...").translated,
                                 percentageDone, false);
        if (pindex->nHeight <= ::ChainActive().Height() - nCheckDepth) {
            break;
        }

        if (fPruneMode && !pindex->nStatus.hasData()) {
            // If pruning, only go back as far as we have data.
            LogPrintf("VerifyDB(): block verification stopping at height %d "
                      "(pruning, no data)\n",
                      pindex->nHeight);
            break;
        }

        CBlock block;

        // check level 0: read from disk
        if (!ReadBlockFromDisk(block, pindex, consensusParams)) {
            return error(
                "VerifyDB(): *** ReadBlockFromDisk failed at %d, hash=%s",
                pindex->nHeight, pindex->GetBlockHash().ToString());
        }

        // check level 1: verify block validity
        if (nCheckLevel >= 1 && !CheckBlock(block, state, consensusParams,
                                            BlockValidationOptions(config))) {
            return error("%s: *** found bad block at %d, hash=%s (%s)\n",
                         __func__, pindex->nHeight,
                         pindex->GetBlockHash().ToString(),
                         FormatStateMessage(state));
        }

        // check level 2: verify undo validity
        if (nCheckLevel >= 2 && pindex) {
            CBlockUndo undo;
            if (!pindex->GetUndoPos().IsNull()) {
                if (!UndoReadFromDisk(undo, pindex)) {
                    return error(
                        "VerifyDB(): *** found bad undo data at %d, hash=%s\n",
                        pindex->nHeight, pindex->GetBlockHash().ToString());
                }
            }
        }

        // check level 3: check for inconsistencies during memory-only
        // disconnect of tip blocks
        if (nCheckLevel >= 3 &&
            (coins.DynamicMemoryUsage() + pcoinsTip->DynamicMemoryUsage()) <=
                nCoinCacheUsage) {
            assert(coins.GetBestBlock() == pindex->GetBlockHash());
            DisconnectResult res =
                ::ChainstateActive().DisconnectBlock(block, pindex, coins);
            if (res == DisconnectResult::FAILED) {
                return error("VerifyDB(): *** irrecoverable inconsistency in "
                             "block data at %d, hash=%s",
                             pindex->nHeight,
                             pindex->GetBlockHash().ToString());
            }

            if (res == DisconnectResult::UNCLEAN) {
                nGoodTransactions = 0;
                pindexFailure = pindex;
            } else {
                nGoodTransactions += block.vtx.size();
            }
        }

        if (ShutdownRequested()) {
            return true;
        }
    }

    if (pindexFailure) {
        return error("VerifyDB(): *** coin database inconsistencies found "
                     "(last %i blocks, %i good transactions before that)\n",
                     ::ChainActive().Height() - pindexFailure->nHeight + 1,
                     nGoodTransactions);
    }

    // store block count as we move pindex at check level >= 4
    int block_count = ::ChainActive().Height() - pindex->nHeight;

    // check level 4: try reconnecting blocks
    if (nCheckLevel >= 4) {
        while (pindex != ::ChainActive().Tip()) {
            boost::this_thread::interruption_point();
            const int percentageDone = std::max(
                1, std::min(99, 100 - int(double(::ChainActive().Height() -
                                                 pindex->nHeight) /
                                          double(nCheckDepth) * 50)));
            if (reportDone < percentageDone / 10) {
                // report every 10% step
                LogPrintfToBeContinued("[%d%%]...", percentageDone);
                reportDone = percentageDone / 10;
            }
            uiInterface.ShowProgress(_("Verifying blocks...").translated,
                                     percentageDone, false);
            pindex = ::ChainActive().Next(pindex);
            CBlock block;
            if (!ReadBlockFromDisk(block, pindex, consensusParams)) {
                return error(
                    "VerifyDB(): *** ReadBlockFromDisk failed at %d, hash=%s",
                    pindex->nHeight, pindex->GetBlockHash().ToString());
            }
            if (!::ChainstateActive().ConnectBlock(
                    block, state, pindex, coins, params,
                    BlockValidationOptions(config))) {
                return error("VerifyDB(): *** found unconnectable block at %d, "
                             "hash=%s (%s)",
                             pindex->nHeight, pindex->GetBlockHash().ToString(),
                             FormatStateMessage(state));
            }
        }
    }

    LogPrintf("[DONE].\n");
    LogPrintf("No coin database inconsistencies in last %i blocks (%i "
              "transactions)\n",
              block_count, nGoodTransactions);

    return true;
}

/**
 * Apply the effects of a block on the utxo cache, ignoring that it may already
 * have been applied.
 */
bool CChainState::RollforwardBlock(const CBlockIndex *pindex,
                                   CCoinsViewCache &view,
                                   const Consensus::Params &params) {
    // TODO: merge with ConnectBlock
    CBlock block;
    if (!ReadBlockFromDisk(block, pindex, params)) {
        return error("ReplayBlock(): ReadBlockFromDisk failed at %d, hash=%s",
                     pindex->nHeight, pindex->GetBlockHash().ToString());
    }

    for (const CTransactionRef &tx : block.vtx) {
        // Pass check = true as every addition may be an overwrite.
        AddCoins(view, *tx, pindex->nHeight, true);
    }

    for (const CTransactionRef &tx : block.vtx) {
        if (tx->IsCoinBase()) {
            continue;
        }

        for (const CTxIn &txin : tx->vin) {
            view.SpendCoin(txin.prevout);
        }
    }

    return true;
}

bool CChainState::ReplayBlocks(const Consensus::Params &params,
                               CCoinsView *view) {
    LOCK(cs_main);

    CCoinsViewCache cache(view);

    std::vector<BlockHash> hashHeads = view->GetHeadBlocks();
    if (hashHeads.empty()) {
        // We're already in a consistent state.
        return true;
    }

    if (hashHeads.size() != 2) {
        return error("ReplayBlocks(): unknown inconsistent state");
    }

    uiInterface.ShowProgress(_("Replaying blocks...").translated, 0, false);
    LogPrintf("Replaying blocks\n");

    // Old tip during the interrupted flush.
    const CBlockIndex *pindexOld = nullptr;
    // New tip during the interrupted flush.
    const CBlockIndex *pindexNew;
    // Latest block common to both the old and the new tip.
    const CBlockIndex *pindexFork = nullptr;

    if (m_blockman.m_block_index.count(hashHeads[0]) == 0) {
        return error(
            "ReplayBlocks(): reorganization to unknown block requested");
    }

    pindexNew = m_blockman.m_block_index[hashHeads[0]];

    if (!hashHeads[1].IsNull()) {
        // The old tip is allowed to be 0, indicating it's the first flush.
        if (m_blockman.m_block_index.count(hashHeads[1]) == 0) {
            return error(
                "ReplayBlocks(): reorganization from unknown block requested");
        }

        pindexOld = m_blockman.m_block_index[hashHeads[1]];
        pindexFork = LastCommonAncestor(pindexOld, pindexNew);
        assert(pindexFork != nullptr);
    }

    // Rollback along the old branch.
    while (pindexOld != pindexFork) {
        if (pindexOld->nHeight > 0) {
            // Never disconnect the genesis block.
            CBlock block;
            if (!ReadBlockFromDisk(block, pindexOld, params)) {
                return error("RollbackBlock(): ReadBlockFromDisk() failed at "
                             "%d, hash=%s",
                             pindexOld->nHeight,
                             pindexOld->GetBlockHash().ToString());
            }

            LogPrintf("Rolling back %s (%i)\n",
                      pindexOld->GetBlockHash().ToString(), pindexOld->nHeight);
            DisconnectResult res = DisconnectBlock(block, pindexOld, cache);
            if (res == DisconnectResult::FAILED) {
                return error(
                    "RollbackBlock(): DisconnectBlock failed at %d, hash=%s",
                    pindexOld->nHeight, pindexOld->GetBlockHash().ToString());
            }

            // If DisconnectResult::UNCLEAN is returned, it means a non-existing
            // UTXO was deleted, or an existing UTXO was overwritten. It
            // corresponds to cases where the block-to-be-disconnect never had
            // all its operations applied to the UTXO set. However, as both
            // writing a UTXO and deleting a UTXO are idempotent operations, the
            // result is still a version of the UTXO set with the effects of
            // that block undone.
        }
        pindexOld = pindexOld->pprev;
    }

    // Roll forward from the forking point to the new tip.
    int nForkHeight = pindexFork ? pindexFork->nHeight : 0;
    for (int nHeight = nForkHeight + 1; nHeight <= pindexNew->nHeight;
         ++nHeight) {
        const CBlockIndex *pindex = pindexNew->GetAncestor(nHeight);
        LogPrintf("Rolling forward %s (%i)\n",
                  pindex->GetBlockHash().ToString(), nHeight);
        uiInterface.ShowProgress(_("Replaying blocks...").translated,
                                 (int)((nHeight - nForkHeight) * 100.0 /
                                       (pindexNew->nHeight - nForkHeight)),
                                 false);
        if (!RollforwardBlock(pindex, cache, params)) {
            return false;
        }
    }

    cache.SetBestBlock(pindexNew->GetBlockHash());
    cache.Flush();
    uiInterface.ShowProgress("", 100, false);
    return true;
}

bool ReplayBlocks(const Consensus::Params &params, CCoinsView *view) {
    return ::ChainstateActive().ReplayBlocks(params, view);
}

// May NOT be used after any connections are up as much of the peer-processing
// logic assumes a consistent block index state
void CChainState::UnloadBlockIndex() {
    nBlockSequenceId = 1;
    setBlockIndexCandidates.clear();
}

// May NOT be used after any connections are up as much
// of the peer-processing logic assumes a consistent
// block index state
void UnloadBlockIndex() {
    LOCK(cs_main);
    ::ChainActive().SetTip(nullptr);
    g_blockman.Unload();
    pindexFinalized = nullptr;
    pindexBestInvalid = nullptr;
    pindexBestParked = nullptr;
    pindexBestHeader = nullptr;
    pindexBestForkTip = nullptr;
    pindexBestForkBase = nullptr;
    ResetASERTAnchorBlockCache();
    g_mempool.clear();
    vinfoBlockFile.clear();
    nLastBlockFile = 0;
    setDirtyBlockIndex.clear();
    setDirtyFileInfo.clear();
    fHavePruned = false;

    ::ChainstateActive().UnloadBlockIndex();
}

bool LoadBlockIndex(const Consensus::Params &params) {
    // Load block index from databases
    bool needs_init = fReindex;
    if (!fReindex) {
        bool ret = LoadBlockIndexDB(params);
        if (!ret) {
            return false;
        }

        needs_init = g_blockman.m_block_index.empty();
    }

    if (needs_init) {
        // Everything here is for *new* reindex/DBs. Thus, though
        // LoadBlockIndexDB may have set fReindex if we shut down
        // mid-reindex previously, we don't check fReindex and
        // instead only check it prior to LoadBlockIndexDB to set
        // needs_init.

        LogPrintf("Initializing databases...\n");
    }
    return true;
}

bool CChainState::LoadGenesisBlock(const CChainParams &chainparams) {
    LOCK(cs_main);

    // Check whether we're already initialized by checking for genesis in
    // m_blockman.m_block_index. Note that we can't use m_chain here, since it
    // is set based on the coins db, not the block index db, which is the only
    // thing loaded at this point.
    if (m_blockman.m_block_index.count(chainparams.GenesisBlock().GetHash())) {
        return true;
    }

    try {
        const CBlock &block = chainparams.GenesisBlock();
        FlatFilePos blockPos = SaveBlockToDisk(block, 0, chainparams, nullptr);
        if (blockPos.IsNull()) {
            return error("%s: writing genesis block to disk failed", __func__);
        }
        CBlockIndex *pindex = m_blockman.AddToBlockIndex(block);
        ReceivedBlockTransactions(block, pindex, blockPos);
    } catch (const std::runtime_error &e) {
        return error("%s: failed to write genesis block: %s", __func__,
                     e.what());
    }

    return true;
}

bool LoadGenesisBlock(const CChainParams &chainparams) {
    return ::ChainstateActive().LoadGenesisBlock(chainparams);
}

bool LoadExternalBlockFile(const Config &config, FILE *fileIn,
                           FlatFilePos *dbp) {
    // Map of disk positions for blocks with unknown parent (only used for
    // reindex)
    static std::multimap<uint256, FlatFilePos> mapBlocksUnknownParent;
    int64_t nStart = GetTimeMillis();

    const CChainParams &chainparams = config.GetChainParams();

    int nLoaded = 0;
    try {
        // This takes over fileIn and calls fclose() on it in the CBufferedFile
        // destructor. Make sure we have at least 2*MAX_TX_SIZE space in there
        // so any transaction can fit in the buffer.
        CBufferedFile blkdat(fileIn, 2 * MAX_TX_SIZE, MAX_TX_SIZE + 8, SER_DISK,
                             CLIENT_VERSION);
        uint64_t nRewind = blkdat.GetPos();
        while (!blkdat.eof()) {
            boost::this_thread::interruption_point();

            blkdat.SetPos(nRewind);
            // Start one byte further next time, in case of failure.
            nRewind++;
            // Remove former limit.
            blkdat.SetLimit();
            unsigned int nSize = 0;
            try {
                // Locate a header.
                uint8_t buf[CMessageHeader::MESSAGE_START_SIZE];
                blkdat.FindByte(chainparams.DiskMagic()[0]);
                nRewind = blkdat.GetPos() + 1;
                blkdat >> buf;
                if (memcmp(buf, chainparams.DiskMagic().data(),
                           CMessageHeader::MESSAGE_START_SIZE)) {
                    continue;
                }

                // Read size.
                blkdat >> nSize;
                if (nSize < 80) {
                    continue;
                }
            } catch (const std::exception &) {
                // No valid block header found; don't complain.
                break;
            }

            try {
                // read block
                uint64_t nBlockPos = blkdat.GetPos();
                if (dbp) {
                    dbp->nPos = nBlockPos;
                }
                blkdat.SetLimit(nBlockPos + nSize);
                blkdat.SetPos(nBlockPos);
                std::shared_ptr<CBlock> pblock = std::make_shared<CBlock>();
                CBlock &block = *pblock;
                blkdat >> block;
                nRewind = blkdat.GetPos();

                const BlockHash hash = block.GetHash();
                {
                    LOCK(cs_main);
                    // detect out of order blocks, and store them for later
                    if (hash != chainparams.GetConsensus().hashGenesisBlock &&
                        !LookupBlockIndex(block.hashPrevBlock)) {
                        LogPrint(
                            BCLog::REINDEX,
                            "%s: Out of order block %s, parent %s not known\n",
                            __func__, hash.ToString(),
                            block.hashPrevBlock.ToString());
                        if (dbp) {
                            mapBlocksUnknownParent.insert(
                                std::make_pair(block.hashPrevBlock, *dbp));
                        }
                        continue;
                    }

                    // process in case the block isn't known yet
                    CBlockIndex *pindex = LookupBlockIndex(hash);
                    if (!pindex || !pindex->nStatus.hasData()) {
                        BlockValidationState state;
                        if (::ChainstateActive().AcceptBlock(
                                config, pblock, state, true, dbp, nullptr)) {
                            nLoaded++;
                        }
                        if (state.IsError()) {
                            break;
                        }
                    } else if (hash != chainparams.GetConsensus()
                                           .hashGenesisBlock &&
                               pindex->nHeight % 1000 == 0) {
                        LogPrint(
                            BCLog::REINDEX,
                            "Block Import: already had block %s at height %d\n",
                            hash.ToString(), pindex->nHeight);
                    }
                }

                // Activate the genesis block so normal node progress can
                // continue
                if (hash == chainparams.GetConsensus().hashGenesisBlock) {
                    BlockValidationState state;
                    if (!ActivateBestChain(config, state)) {
                        break;
                    }
                }

                NotifyHeaderTip();

                // Recursively process earlier encountered successors of this
                // block
                std::deque<uint256> queue;
                queue.push_back(hash);
                while (!queue.empty()) {
                    uint256 head = queue.front();
                    queue.pop_front();
                    std::pair<std::multimap<uint256, FlatFilePos>::iterator,
                              std::multimap<uint256, FlatFilePos>::iterator>
                        range = mapBlocksUnknownParent.equal_range(head);
                    while (range.first != range.second) {
                        std::multimap<uint256, FlatFilePos>::iterator it =
                            range.first;
                        std::shared_ptr<CBlock> pblockrecursive =
                            std::make_shared<CBlock>();
                        if (ReadBlockFromDisk(*pblockrecursive, it->second,
                                              chainparams.GetConsensus())) {
                            LogPrint(
                                BCLog::REINDEX,
                                "%s: Processing out of order child %s of %s\n",
                                __func__, pblockrecursive->GetHash().ToString(),
                                head.ToString());
                            LOCK(cs_main);
                            BlockValidationState dummy;
                            if (::ChainstateActive().AcceptBlock(
                                    config, pblockrecursive, dummy, true,
                                    &it->second, nullptr)) {
                                nLoaded++;
                                queue.push_back(pblockrecursive->GetHash());
                            }
                        }
                        range.first++;
                        mapBlocksUnknownParent.erase(it);
                        NotifyHeaderTip();
                    }
                }
            } catch (const std::exception &e) {
                LogPrintf("%s: Deserialize or I/O error - %s\n", __func__,
                          e.what());
            }
        }
    } catch (const std::runtime_error &e) {
        AbortNode(std::string("System error: ") + e.what());
    }

    if (nLoaded > 0) {
        LogPrintf("Loaded %i blocks from external file in %dms\n", nLoaded,
                  GetTimeMillis() - nStart);
    }

    return nLoaded > 0;
}

void CChainState::CheckBlockIndex(const Consensus::Params &consensusParams) {
    if (!fCheckBlockIndex) {
        return;
    }

    LOCK(cs_main);

    // During a reindex, we read the genesis block and call CheckBlockIndex
    // before ActivateBestChain, so we have the genesis block in
    // m_blockman.m_block_index but no active chain. (A few of the tests when
    // iterating the block tree require that m_chain has been initialized.)
    if (m_chain.Height() < 0) {
        assert(m_blockman.m_block_index.size() <= 1);
        return;
    }

    // Build forward-pointing map of the entire block tree.
    std::multimap<CBlockIndex *, CBlockIndex *> forward;
    for (const auto &entry : m_blockman.m_block_index) {
        forward.emplace(entry.second->pprev, entry.second);
    }

    assert(forward.size() == m_blockman.m_block_index.size());

    std::pair<std::multimap<CBlockIndex *, CBlockIndex *>::iterator,
              std::multimap<CBlockIndex *, CBlockIndex *>::iterator>
        rangeGenesis = forward.equal_range(nullptr);
    CBlockIndex *pindex = rangeGenesis.first->second;
    rangeGenesis.first++;
    // There is only one index entry with parent nullptr.
    assert(rangeGenesis.first == rangeGenesis.second);

    // Iterate over the entire block tree, using depth-first search.
    // Along the way, remember whether there are blocks on the path from genesis
    // block being explored which are the first to have certain properties.
    size_t nNodes = 0;
    int nHeight = 0;
    // Oldest ancestor of pindex which is invalid.
    CBlockIndex *pindexFirstInvalid = nullptr;
    // Oldest ancestor of pindex which is parked.
    CBlockIndex *pindexFirstParked = nullptr;
    // Oldest ancestor of pindex which does not have data available.
    CBlockIndex *pindexFirstMissing = nullptr;
    // Oldest ancestor of pindex for which nTx == 0.
    CBlockIndex *pindexFirstNeverProcessed = nullptr;
    // Oldest ancestor of pindex which does not have BLOCK_VALID_TREE
    // (regardless of being valid or not).
    CBlockIndex *pindexFirstNotTreeValid = nullptr;
    // Oldest ancestor of pindex which does not have BLOCK_VALID_TRANSACTIONS
    // (regardless of being valid or not).
    CBlockIndex *pindexFirstNotTransactionsValid = nullptr;
    // Oldest ancestor of pindex which does not have BLOCK_VALID_CHAIN
    // (regardless of being valid or not).
    CBlockIndex *pindexFirstNotChainValid = nullptr;
    // Oldest ancestor of pindex which does not have BLOCK_VALID_SCRIPTS
    // (regardless of being valid or not).
    CBlockIndex *pindexFirstNotScriptsValid = nullptr;
    while (pindex != nullptr) {
        nNodes++;
        if (pindexFirstInvalid == nullptr && pindex->nStatus.hasFailed()) {
            pindexFirstInvalid = pindex;
        }
        if (pindexFirstParked == nullptr && pindex->nStatus.isParked()) {
            pindexFirstParked = pindex;
        }
        if (pindexFirstMissing == nullptr && !pindex->nStatus.hasData()) {
            pindexFirstMissing = pindex;
        }
        if (pindexFirstNeverProcessed == nullptr && pindex->nTx == 0) {
            pindexFirstNeverProcessed = pindex;
        }
        if (pindex->pprev != nullptr && pindexFirstNotTreeValid == nullptr &&
            pindex->nStatus.getValidity() < BlockValidity::TREE) {
            pindexFirstNotTreeValid = pindex;
        }
        if (pindex->pprev != nullptr &&
            pindexFirstNotTransactionsValid == nullptr &&
            pindex->nStatus.getValidity() < BlockValidity::TRANSACTIONS) {
            pindexFirstNotTransactionsValid = pindex;
        }
        if (pindex->pprev != nullptr && pindexFirstNotChainValid == nullptr &&
            pindex->nStatus.getValidity() < BlockValidity::CHAIN) {
            pindexFirstNotChainValid = pindex;
        }
        if (pindex->pprev != nullptr && pindexFirstNotScriptsValid == nullptr &&
            pindex->nStatus.getValidity() < BlockValidity::SCRIPTS) {
            pindexFirstNotScriptsValid = pindex;
        }

        // Begin: actual consistency checks.
        if (pindex->pprev == nullptr) {
            // Genesis block checks.
            // Genesis block's hash must match.
            assert(pindex->GetBlockHash() == consensusParams.hashGenesisBlock);
            // The current active chain's genesis block must be this block.
            assert(pindex == m_chain.Genesis());
        }
        if (!pindex->HaveTxsDownloaded()) {
            // nSequenceId can't be set positive for blocks that aren't linked
            // (negative is used for preciousblock)
            assert(pindex->nSequenceId <= 0);
        }
        // VALID_TRANSACTIONS is equivalent to nTx > 0 for all nodes (whether or
        // not pruning has occurred). HAVE_DATA is only equivalent to nTx > 0
        // (or VALID_TRANSACTIONS) if no pruning has occurred.
        if (!fHavePruned) {
            // If we've never pruned, then HAVE_DATA should be equivalent to nTx
            // > 0
            assert(pindex->nStatus.hasData() == (pindex->nTx > 0));
            assert(pindexFirstMissing == pindexFirstNeverProcessed);
        } else if (pindex->nStatus.hasData()) {
            // If we have pruned, then we can only say that HAVE_DATA implies
            // nTx > 0
            assert(pindex->nTx > 0);
        }
        if (pindex->nStatus.hasUndo()) {
            assert(pindex->nStatus.hasData());
        }
        // This is pruning-independent.
        assert((pindex->nStatus.getValidity() >= BlockValidity::TRANSACTIONS) ==
               (pindex->nTx > 0));
        // All parents having had data (at some point) is equivalent to all
        // parents being VALID_TRANSACTIONS, which is equivalent to
        // HaveTxsDownloaded(). All parents having had data (at some point) is
        // equivalent to all parents being VALID_TRANSACTIONS, which is
        // equivalent to HaveTxsDownloaded().
        assert((pindexFirstNeverProcessed == nullptr) ==
               (pindex->HaveTxsDownloaded()));
        assert((pindexFirstNotTransactionsValid == nullptr) ==
               (pindex->HaveTxsDownloaded()));
        // nHeight must be consistent.
        assert(pindex->nHeight == nHeight);
        // For every block except the genesis block, the chainwork must be
        // larger than the parent's.
        assert(pindex->pprev == nullptr ||
               pindex->nChainWork >= pindex->pprev->nChainWork);
        // The pskip pointer must point back for all but the first 2 blocks.
        assert(nHeight < 2 ||
               (pindex->pskip && (pindex->pskip->nHeight < nHeight)));
        // All m_blockman.m_block_index entries must at least be TREE valid
        assert(pindexFirstNotTreeValid == nullptr);
        if (pindex->nStatus.getValidity() >= BlockValidity::TREE) {
            // TREE valid implies all parents are TREE valid
            assert(pindexFirstNotTreeValid == nullptr);
        }
        if (pindex->nStatus.getValidity() >= BlockValidity::CHAIN) {
            // CHAIN valid implies all parents are CHAIN valid
            assert(pindexFirstNotChainValid == nullptr);
        }
        if (pindex->nStatus.getValidity() >= BlockValidity::SCRIPTS) {
            // SCRIPTS valid implies all parents are SCRIPTS valid
            assert(pindexFirstNotScriptsValid == nullptr);
        }
        if (pindexFirstInvalid == nullptr) {
            // Checks for not-invalid blocks.
            // The failed mask cannot be set for blocks without invalid parents.
            assert(!pindex->nStatus.isInvalid());
        }
        if (pindexFirstParked == nullptr) {
            // Checks for not-parked blocks.
            // The parked mask cannot be set for blocks without parked parents.
            // (i.e., hasParkedParent only if an ancestor is properly parked).
            assert(!pindex->nStatus.isOnParkedChain());
        }
        if (!CBlockIndexWorkComparator()(pindex, m_chain.Tip()) &&
            pindexFirstNeverProcessed == nullptr) {
            if (pindexFirstInvalid == nullptr) {
                // If this block sorts at least as good as the current tip and
                // is valid and we have all data for its parents, it must be in
                // setBlockIndexCandidates or be parked.
                if (pindexFirstMissing == nullptr) {
                    assert(pindex->nStatus.isOnParkedChain() ||
                           setBlockIndexCandidates.count(pindex));
                }
                // m_chain.Tip() must also be there even if some data has
                // been pruned.
                if (pindex == m_chain.Tip()) {
                    assert(setBlockIndexCandidates.count(pindex));
                }
                // If some parent is missing, then it could be that this block
                // was in setBlockIndexCandidates but had to be removed because
                // of the missing data. In this case it must be in
                // m_blocks_unlinked -- see test below.
            }
        } else {
            // If this block sorts worse than the current tip or some ancestor's
            // block has never been seen, it cannot be in
            // setBlockIndexCandidates.
            assert(setBlockIndexCandidates.count(pindex) == 0);
        }
        // Check whether this block is in m_blocks_unlinked.
        std::pair<std::multimap<CBlockIndex *, CBlockIndex *>::iterator,
                  std::multimap<CBlockIndex *, CBlockIndex *>::iterator>
            rangeUnlinked =
                m_blockman.m_blocks_unlinked.equal_range(pindex->pprev);
        bool foundInUnlinked = false;
        while (rangeUnlinked.first != rangeUnlinked.second) {
            assert(rangeUnlinked.first->first == pindex->pprev);
            if (rangeUnlinked.first->second == pindex) {
                foundInUnlinked = true;
                break;
            }
            rangeUnlinked.first++;
        }
        if (pindex->pprev && pindex->nStatus.hasData() &&
            pindexFirstNeverProcessed != nullptr &&
            pindexFirstInvalid == nullptr) {
            // If this block has block data available, some parent was never
            // received, and has no invalid parents, it must be in
            // m_blocks_unlinked.
            assert(foundInUnlinked);
        }
        if (!pindex->nStatus.hasData()) {
            // Can't be in m_blocks_unlinked if we don't HAVE_DATA
            assert(!foundInUnlinked);
        }
        if (pindexFirstMissing == nullptr) {
            // We aren't missing data for any parent -- cannot be in
            // m_blocks_unlinked.
            assert(!foundInUnlinked);
        }
        if (pindex->pprev && pindex->nStatus.hasData() &&
            pindexFirstNeverProcessed == nullptr &&
            pindexFirstMissing != nullptr) {
            // We HAVE_DATA for this block, have received data for all parents
            // at some point, but we're currently missing data for some parent.
            // We must have pruned.
            assert(fHavePruned);
            // This block may have entered m_blocks_unlinked if:
            //  - it has a descendant that at some point had more work than the
            //    tip, and
            //  - we tried switching to that descendant but were missing
            //    data for some intermediate block between m_chain and the
            //    tip.
            // So if this block is itself better than m_chain.Tip() and it
            // wasn't in
            // setBlockIndexCandidates, then it must be in m_blocks_unlinked.
            if (!CBlockIndexWorkComparator()(pindex, m_chain.Tip()) &&
                setBlockIndexCandidates.count(pindex) == 0) {
                if (pindexFirstInvalid == nullptr) {
                    assert(foundInUnlinked);
                }
            }
        }
        // Perhaps too slow
        // assert(pindex->GetBlockHash() == pindex->GetBlockHeader().GetHash());
        // End: actual consistency checks.

        // Try descending into the first subnode.
        std::pair<std::multimap<CBlockIndex *, CBlockIndex *>::iterator,
                  std::multimap<CBlockIndex *, CBlockIndex *>::iterator>
            range = forward.equal_range(pindex);
        if (range.first != range.second) {
            // A subnode was found.
            pindex = range.first->second;
            nHeight++;
            continue;
        }
        // This is a leaf node. Move upwards until we reach a node of which we
        // have not yet visited the last child.
        while (pindex) {
            // We are going to either move to a parent or a sibling of pindex.
            // If pindex was the first with a certain property, unset the
            // corresponding variable.
            if (pindex == pindexFirstInvalid) {
                pindexFirstInvalid = nullptr;
            }
            if (pindex == pindexFirstParked) {
                pindexFirstParked = nullptr;
            }
            if (pindex == pindexFirstMissing) {
                pindexFirstMissing = nullptr;
            }
            if (pindex == pindexFirstNeverProcessed) {
                pindexFirstNeverProcessed = nullptr;
            }
            if (pindex == pindexFirstNotTreeValid) {
                pindexFirstNotTreeValid = nullptr;
            }
            if (pindex == pindexFirstNotTransactionsValid) {
                pindexFirstNotTransactionsValid = nullptr;
            }
            if (pindex == pindexFirstNotChainValid) {
                pindexFirstNotChainValid = nullptr;
            }
            if (pindex == pindexFirstNotScriptsValid) {
                pindexFirstNotScriptsValid = nullptr;
            }
            // Find our parent.
            CBlockIndex *pindexPar = pindex->pprev;
            // Find which child we just visited.
            std::pair<std::multimap<CBlockIndex *, CBlockIndex *>::iterator,
                      std::multimap<CBlockIndex *, CBlockIndex *>::iterator>
                rangePar = forward.equal_range(pindexPar);
            while (rangePar.first->second != pindex) {
                // Our parent must have at least the node we're coming from as
                // child.
                assert(rangePar.first != rangePar.second);
                rangePar.first++;
            }
            // Proceed to the next one.
            rangePar.first++;
            if (rangePar.first != rangePar.second) {
                // Move to the sibling.
                pindex = rangePar.first->second;
                break;
            } else {
                // Move up further.
                pindex = pindexPar;
                nHeight--;
                continue;
            }
        }
    }

    // Check that we actually traversed the entire map.
    assert(nNodes == forward.size());
}

std::string CBlockFileInfo::ToString() const {
    return strprintf(
        "CBlockFileInfo(blocks=%u, size=%u, heights=%u...%u, time=%s...%s)",
        nBlocks, nSize, nHeightFirst, nHeightLast,
        FormatISO8601DateTime(nTimeFirst), FormatISO8601DateTime(nTimeLast));
}

CBlockFileInfo *GetBlockFileInfo(size_t n) {
    LOCK(cs_LastBlockFile);

    return &vinfoBlockFile.at(n);
}

static ThresholdState VersionBitsStateImpl(const Consensus::Params &params,
                                           Consensus::DeploymentPos pos,
                                           const CBlockIndex *pindex)
    EXCLUSIVE_LOCKS_REQUIRED(cs_main) {
    return VersionBitsState(pindex, params, pos, versionbitscache);
}

ThresholdState VersionBitsTipState(const Consensus::Params &params,
                                   Consensus::DeploymentPos pos) {
    LOCK(cs_main);
    return VersionBitsStateImpl(params, pos, ::ChainActive().Tip());
}

ThresholdState VersionBitsBlockState(const Consensus::Params &params,
                                     Consensus::DeploymentPos pos,
                                     const CBlockIndex *pindex) {
    LOCK(cs_main);
    return VersionBitsStateImpl(params, pos, pindex);
}

BIP9Stats VersionBitsTipStatistics(const Consensus::Params &params,
                                   Consensus::DeploymentPos pos) {
    LOCK(cs_main);
    return VersionBitsStatistics(::ChainActive().Tip(), params, pos);
}

int VersionBitsTipStateSinceHeight(const Consensus::Params &params,
                                   Consensus::DeploymentPos pos) {
    LOCK(cs_main);
    return VersionBitsStateSinceHeight(::ChainActive().Tip(), params, pos,
                                       versionbitscache);
}

static const uint64_t MEMPOOL_DUMP_VERSION = 1;

bool LoadMempool(const Config &config, CTxMemPool &pool) {
    int64_t nExpiryTimeout =
        gArgs.GetArg("-mempoolexpiry", DEFAULT_MEMPOOL_EXPIRY) * 60 * 60;
    FILE *filestr = fsbridge::fopen(GetDataDir() / "mempool.dat", "rb");
    CAutoFile file(filestr, SER_DISK, CLIENT_VERSION);
    if (file.IsNull()) {
        LogPrintf(
            "Failed to open mempool file from disk. Continuing anyway.\n");
        return false;
    }

    int64_t count = 0;
    int64_t expired = 0;
    int64_t failed = 0;
    int64_t already_there = 0;
    int64_t nNow = GetTime();

    try {
        uint64_t version;
        file >> version;
        if (version != MEMPOOL_DUMP_VERSION) {
            return false;
        }

        uint64_t num;
        file >> num;
        while (num--) {
            CTransactionRef tx;
            int64_t nTime;
            int64_t nFeeDelta;
            file >> tx;
            file >> nTime;
            file >> nFeeDelta;

            Amount amountdelta = nFeeDelta * SATOSHI;
            if (amountdelta != Amount::zero()) {
                pool.PrioritiseTransaction(tx->GetId(), amountdelta);
            }
            TxValidationState state;
            if (nTime + nExpiryTimeout > nNow) {
                LOCK(cs_main);
                AcceptToMemoryPoolWithTime(
                    config, pool, state, tx, nTime, false /* bypass_limits */,
                    Amount::zero() /* nAbsurdFee */, false /* test_accept */);
                if (state.IsValid()) {
                    ++count;
                } else {
                    // mempool may contain the transaction already, e.g. from
                    // wallet(s) having loaded it while we were processing
                    // mempool transactions; consider these as valid, instead of
                    // failed, but mark them as 'already there'
                    if (pool.exists(tx->GetId())) {
                        ++already_there;
                    } else {
                        ++failed;
                    }
                }
            } else {
                ++expired;
            }

            if (ShutdownRequested()) {
                return false;
            }
        }
        std::map<TxId, Amount> mapDeltas;
        file >> mapDeltas;

        for (const auto &i : mapDeltas) {
            pool.PrioritiseTransaction(i.first, i.second);
        }
    } catch (const std::exception &e) {
        LogPrintf("Failed to deserialize mempool data on disk: %s. Continuing "
                  "anyway.\n",
                  e.what());
        return false;
    }

    LogPrintf("Imported mempool transactions from disk: %i succeeded, %i "
              "failed, %i expired, %i already there\n",
              count, failed, expired, already_there);
    return true;
}

bool DumpMempool(const CTxMemPool &pool) {
    int64_t start = GetTimeMicros();

    std::map<uint256, Amount> mapDeltas;
    std::vector<TxMempoolInfo> vinfo;

    static Mutex dump_mutex;
    LOCK(dump_mutex);

    {
        LOCK(pool.cs);
        for (const auto &i : pool.mapDeltas) {
            mapDeltas[i.first] = i.second;
        }

        vinfo = pool.infoAll();
    }

    int64_t mid = GetTimeMicros();

    try {
        FILE *filestr = fsbridge::fopen(GetDataDir() / "mempool.dat.new", "wb");
        if (!filestr) {
            return false;
        }

        CAutoFile file(filestr, SER_DISK, CLIENT_VERSION);

        uint64_t version = MEMPOOL_DUMP_VERSION;
        file << version;

        file << uint64_t(vinfo.size());
        for (const auto &i : vinfo) {
            file << *(i.tx);
            file << int64_t(count_seconds(i.m_time));
            file << i.nFeeDelta;
            mapDeltas.erase(i.tx->GetId());
        }

        file << mapDeltas;
        if (!FileCommit(file.Get())) {
            throw std::runtime_error("FileCommit failed");
        }
        file.fclose();
        RenameOver(GetDataDir() / "mempool.dat.new",
                   GetDataDir() / "mempool.dat");
        int64_t last = GetTimeMicros();
        LogPrintf("Dumped mempool: %gs to copy, %gs to dump\n",
                  (mid - start) * MICRO, (last - mid) * MICRO);
    } catch (const std::exception &e) {
        LogPrintf("Failed to dump mempool: %s. Continuing anyway.\n", e.what());
        return false;
    }
    return true;
}

bool IsBlockPruned(const CBlockIndex *pblockindex) {
    return (fHavePruned && !pblockindex->nStatus.hasData() &&
            pblockindex->nTx > 0);
}

//! Guess how far we are in the verification process at the given block index
//! require cs_main if pindex has not been validated yet (because the chain's
//! transaction count might be unset) This conditional lock requirement might be
//! confusing, see: https://github.com/bitcoin/bitcoin/issues/15994
double GuessVerificationProgress(const ChainTxData &data,
                                 const CBlockIndex *pindex) {
    if (pindex == nullptr) {
        return 0.0;
    }

    int64_t nNow = time(nullptr);

    double fTxTotal;
    if (pindex->GetChainTxCount() <= data.nTxCount) {
        fTxTotal = data.nTxCount + (nNow - data.nTime) * data.dTxRate;
    } else {
        fTxTotal = pindex->GetChainTxCount() +
                   (nNow - pindex->GetBlockTime()) * data.dTxRate;
    }

    return pindex->GetChainTxCount() / fTxTotal;
}

class CMainCleanup {
public:
    CMainCleanup() {}
    ~CMainCleanup() {
        // block headers
        for (const std::pair<const BlockHash, CBlockIndex *> &it :
             g_blockman.m_block_index) {
            delete it.second;
        }
        g_blockman.m_block_index.clear();
    }
};
static CMainCleanup instance_of_cmaincleanup;
