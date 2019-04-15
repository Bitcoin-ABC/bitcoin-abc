// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2017-2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "validation.h"

#include "arith_uint256.h"
#include "blockindexworkcomparator.h"
#include "blockvalidity.h"
#include "chainparams.h"
#include "checkpoints.h"
#include "checkqueue.h"
#include "config.h"
#include "consensus/activation.h"
#include "consensus/consensus.h"
#include "consensus/merkle.h"
#include "consensus/tx_verify.h"
#include "consensus/validation.h"
#include "fs.h"
#include "hash.h"
#include "init.h"
#include "policy/fees.h"
#include "policy/policy.h"
#include "pow.h"
#include "primitives/block.h"
#include "primitives/transaction.h"
#include "random.h"
#include "reverse_iterator.h"
#include "script/script.h"
#include "script/scriptcache.h"
#include "script/sigcache.h"
#include "script/standard.h"
#include "timedata.h"
#include "tinyformat.h"
#include "txdb.h"
#include "txmempool.h"
#include "ui_interface.h"
#include "undo.h"
#include "util.h"
#include "utilmoneystr.h"
#include "utilstrencodings.h"
#include "validationinterface.h"
#include "warnings.h"

#include <atomic>
#include <future>
#include <sstream>
#include <thread>

#include <boost/algorithm/string/join.hpp>
#include <boost/algorithm/string/replace.hpp>
#include <boost/thread.hpp>

#if defined(NDEBUG)
#error "Bitcoin cannot be compiled without assertions."
#endif

#define MICRO 0.000001
#define MILLI 0.001
class ConnectTrace;

/**
 * CChainState stores and provides an API to update our local knowledge of the
 * current best chain and header tree.
 *
 * It generally provides access to the current block tree, as well as functions
 * to provide new data, which it will appropriately validate and incorporate in
 * its state as necessary.
 *
 * Eventually, the API here is targeted at being exposed externally as a
 * consumable libconsensus library, so any functions added must only call
 * other class member functions, pure functions in other parts of the consensus
 * library, callbacks via the validation interface, or read/write-to-disk
 * functions (eventually this will also be via callbacks).
 */
class CChainState {
private:
    /**
     * The set of all CBlockIndex entries with BLOCK_VALID_TRANSACTIONS (for
     * itself and all ancestors) and
     * as good as our current tip or better. Entries may be failed, though, and
     * pruning nodes may be
     * missing the data for the block.
     */
    std::set<CBlockIndex *, CBlockIndexWorkComparator> setBlockIndexCandidates;

public:
    CChain chainActive;
    BlockMap mapBlockIndex;
    std::multimap<CBlockIndex *, CBlockIndex *> mapBlocksUnlinked;
    CBlockIndex *pindexBestInvalid = nullptr;
    CBlockIndex *pindexBestParked = nullptr;

    bool LoadBlockIndex(const Config &config, CBlockTreeDB &blocktree);

    bool ActivateBestChain(
        const Config &config, CValidationState &state,
        std::shared_ptr<const CBlock> pblock = std::shared_ptr<const CBlock>());

    bool AcceptBlockHeader(const Config &config, const CBlockHeader &block,
                           CValidationState &state, CBlockIndex **ppindex);
    bool AcceptBlock(const Config &config,
                     const std::shared_ptr<const CBlock> &pblock,
                     CValidationState &state, bool fRequested,
                     const CDiskBlockPos *dbp, bool *fNewBlock);

    // Block (dis)connection on a given view:
    DisconnectResult DisconnectBlock(const CBlock &block,
                                     const CBlockIndex *pindex,
                                     CCoinsViewCache &view);
    bool ConnectBlock(const Config &config, const CBlock &block,
                      CValidationState &state, CBlockIndex *pindex,
                      CCoinsViewCache &view, bool fJustCheck = false);

    // Block disconnection on our pcoinsTip:
    bool DisconnectTip(const Config &config, CValidationState &state,
                       DisconnectedBlockTransactions *disconnectpool);

    // Manual block validity manipulation:
    bool PreciousBlock(const Config &config, CValidationState &state,
                       CBlockIndex *pindex);
    bool UnwindBlock(const Config &config, CValidationState &state,
                     CBlockIndex *pindex, bool invalidate);
    bool ResetBlockFailureFlags(CBlockIndex *pindex);
    template <typename F>
    void UpdateFlagsForBlock(CBlockIndex *pindexBase, CBlockIndex *pindex, F f);
    template <typename F, typename C>
    void UpdateFlags(CBlockIndex *pindex, F f, C fchild);
    template <typename F> void UpdateFlags(CBlockIndex *pindex, F f);
    /** Remove parked status from a block and its descendants. */
    bool UnparkBlockImpl(CBlockIndex *pindex, bool fClearChildren);

    bool ReplayBlocks(const Config &config, CCoinsView *view);
    bool RewindBlockIndex(const Config &config);
    bool LoadGenesisBlock(const CChainParams &chainparams);

    void PruneBlockIndexCandidates();

    void UnloadBlockIndex();

private:
    bool ActivateBestChainStep(const Config &config, CValidationState &state,
                               CBlockIndex *pindexMostWork,
                               const std::shared_ptr<const CBlock> &pblock,
                               bool &fInvalidFound, ConnectTrace &connectTrace);
    bool ConnectTip(const Config &config, CValidationState &state,
                    CBlockIndex *pindexNew,
                    const std::shared_ptr<const CBlock> &pblock,
                    ConnectTrace &connectTrace,
                    DisconnectedBlockTransactions &disconnectpool);

    CBlockIndex *AddToBlockIndex(const CBlockHeader &block);
    /** Create a new block index entry for a given block hash */
    CBlockIndex *InsertBlockIndex(const uint256 &hash);
    void CheckBlockIndex(const Consensus::Params &consensusParams);

    void InvalidBlockFound(CBlockIndex *pindex, const CValidationState &state);
    CBlockIndex *FindMostWorkChain();
    bool ReceivedBlockTransactions(const CBlock &block, CValidationState &state,
                                   CBlockIndex *pindexNew,
                                   const CDiskBlockPos &pos);

    bool RollforwardBlock(const CBlockIndex *pindex, CCoinsViewCache &inputs,
                          const Config &config);
} g_chainstate;

/**
 * Global state
 */
CCriticalSection cs_main;

BlockMap &mapBlockIndex = g_chainstate.mapBlockIndex;
CChain &chainActive = g_chainstate.chainActive;
CBlockIndex *pindexBestHeader = nullptr;
CWaitableCriticalSection g_best_block_mutex;
CConditionVariable g_best_block_cv;
uint256 g_best_block;
int nScriptCheckThreads = 0;
std::atomic_bool fImporting(false);
std::atomic_bool fReindex(false);
bool fTxIndex = false;
bool fHavePruned = false;
bool fPruneMode = false;
bool fIsBareMultisigStd = DEFAULT_PERMIT_BAREMULTISIG;
bool fRequireStandard = true;
bool fCheckBlockIndex = false;
bool fCheckpointsEnabled = DEFAULT_CHECKPOINTS_ENABLED;
size_t nCoinCacheUsage = 5000 * 300;
uint64_t nPruneTarget = 0;
int64_t nMaxTipAge = DEFAULT_MAX_TIP_AGE;

uint256 hashAssumeValid;
arith_uint256 nMinimumChainWork;

Amount maxTxFee = DEFAULT_TRANSACTION_MAXFEE;

CTxMemPool g_mempool;

/** Constant stuff for coinbase transactions we create: */
CScript COINBASE_FLAGS;

const std::string strMessageMagic = "Bitcoin Signed Message:\n";

// Internal stuff
namespace {
CBlockIndex *&pindexBestInvalid = g_chainstate.pindexBestInvalid;
CBlockIndex *&pindexBestParked = g_chainstate.pindexBestParked;

/**
 * The best finalized block.
 * This block cannot be reorged in any way, shape or form.
 */
CBlockIndex const *pindexFinalized;

/**
 * All pairs A->B, where A (or one of its ancestors) misses transactions, but B
 * has transactions. Pruned nodes may have entries where B is missing data.
 */
std::multimap<CBlockIndex *, CBlockIndex *> &mapBlocksUnlinked =
    g_chainstate.mapBlocksUnlinked;

CCriticalSection cs_LastBlockFile;
std::vector<CBlockFileInfo> vinfoBlockFile;
int nLastBlockFile = 0;
/**
 * Global flag to indicate we should check to see if there are block/undo files
 * that should be deleted. Set on startup or if we allocate more file space when
 * we're in prune mode.
 */
bool fCheckForPruning = false;

/**
 * Every received block is assigned a unique and increasing identifier, so we
 * know which one to give priority in case of a fork.
 * Blocks loaded from disk are assigned id 0, so start the counter at 1.
 */
std::atomic<int32_t> nBlockSequenceId{1};
/** Decreasing counter (used by subsequent preciousblock calls). */
int32_t nBlockReverseSequenceId = -1;
/** chainwork for the last block that preciousblock has been applied to. */
arith_uint256 nLastPreciousChainwork = 0;

/** Dirty block index entries. */
std::set<const CBlockIndex *> setDirtyBlockIndex;

/** Dirty block file entries. */
std::set<int> setDirtyFileInfo;
} // namespace

CBlockIndex *FindForkInGlobalIndex(const CChain &chain,
                                   const CBlockLocator &locator) {
    AssertLockHeld(cs_main);

    // Find the first block the caller has in the main chain
    for (const uint256 &hash : locator.vHave) {
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

enum class FlushStateMode { NONE, IF_NEEDED, PERIODIC, ALWAYS };

// See definition for documentation
static bool FlushStateToDisk(const CChainParams &chainParams,
                             CValidationState &state, FlushStateMode mode,
                             int nManualPruneHeight = 0);
static void FindFilesToPruneManual(std::set<int> &setFilesToPrune,
                                   int nManualPruneHeight);
static void FindFilesToPrune(std::set<int> &setFilesToPrune,
                             uint64_t nPruneAfterHeight);
static FILE *OpenUndoFile(const CDiskBlockPos &pos, bool fReadOnly = false);
static uint32_t GetBlockScriptFlags(const Config &config,
                                    const CBlockIndex *pChainTip);

bool TestLockPointValidity(const LockPoints *lp) {
    AssertLockHeld(cs_main);
    assert(lp);
    // If there are relative lock times then the maxInputBlock will be set
    // If there are no relative lock times, the LockPoints don't depend on the
    // chain
    if (lp->maxInputBlock) {
        // Check whether chainActive is an extension of the block at which the
        // LockPoints
        // calculation was valid.  If not LockPoints are no longer valid
        if (!chainActive.Contains(lp->maxInputBlock)) {
            return false;
        }
    }

    // LockPoints still valid
    return true;
}

bool CheckSequenceLocks(const CTransaction &tx, int flags, LockPoints *lp,
                        bool useExistingLockPoints) {
    AssertLockHeld(cs_main);
    AssertLockHeld(g_mempool.cs);

    CBlockIndex *tip = chainActive.Tip();
    CBlockIndex index;
    index.pprev = tip;
    // CheckSequenceLocks() uses chainActive.Height()+1 to evaluate height based
    // locks because when SequenceLocks() is called within ConnectBlock(), the
    // height of the block *being* evaluated is what is used. Thus if we want to
    // know if a transaction can be part of the *next* block, we need to use one
    // more than chainActive.Height()
    index.nHeight = tip->nHeight + 1;

    std::pair<int, int64_t> lockPair;
    if (useExistingLockPoints) {
        assert(lp);
        lockPair.first = lp->height;
        lockPair.second = lp->time;
    } else {
        // pcoinsTip contains the UTXO set for chainActive.Tip()
        CCoinsViewMemPool viewMemPool(pcoinsTip.get(), g_mempool);
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
            for (int height : prevheights) {
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

/** Convert CValidationState to a human-readable message for logging */
std::string FormatStateMessage(const CValidationState &state) {
    return strprintf(
        "%s%s (code %i)", state.GetRejectReason(),
        state.GetDebugMessage().empty() ? "" : ", " + state.GetDebugMessage(),
        state.GetRejectCode());
}

static bool IsMagneticAnomalyEnabledForCurrentBlock(const Config &config) {
    AssertLockHeld(cs_main);
    return IsMagneticAnomalyEnabled(config, chainActive.Tip());
}

static bool IsGreatWallEnabledForCurrentBlock(const Config &config) {
    AssertLockHeld(cs_main);
    return IsGreatWallEnabled(config, chainActive.Tip());
}

// Command-line argument "-replayprotectionactivationtime=<timestamp>" will
// cause the node to switch to replay protected SigHash ForkID value when the
// median timestamp of the previous 11 blocks is greater than or equal to
// <timestamp>. Defaults to the pre-defined timestamp when not set.
static bool IsReplayProtectionEnabled(const Config &config,
                                      int64_t nMedianTimePast) {
    return nMedianTimePast >=
           gArgs.GetArg(
               "-replayprotectionactivationtime",
               config.GetChainParams().GetConsensus().gravitonActivationTime);
}

static bool IsReplayProtectionEnabled(const Config &config,
                                      const CBlockIndex *pindexPrev) {
    if (pindexPrev == nullptr) {
        return false;
    }

    return IsReplayProtectionEnabled(config, pindexPrev->GetMedianTimePast());
}

static bool IsReplayProtectionEnabledForCurrentBlock(const Config &config) {
    AssertLockHeld(cs_main);
    return IsReplayProtectionEnabled(config, chainActive.Tip());
}

// Used to avoid mempool polluting consensus critical paths if CCoinsViewMempool
// were somehow broken and returning the wrong scriptPubKeys
static bool
CheckInputsFromMempoolAndCache(const CTransaction &tx, CValidationState &state,
                               const CCoinsViewCache &view, CTxMemPool &pool,
                               const uint32_t flags, bool cacheSigStore,
                               PrecomputedTransactionData &txdata) {
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
                       txdata);
}

static bool AcceptToMemoryPoolWorker(
    const Config &config, CTxMemPool &pool, CValidationState &state,
    const CTransactionRef &ptx, bool fLimitFree, bool *pfMissingInputs,
    int64_t nAcceptTime, bool fOverrideMempoolLimit, const Amount nAbsurdFee,
    std::vector<COutPoint> &coins_to_uncache) {
    AssertLockHeld(cs_main);

    const CTransaction &tx = *ptx;
    const TxId txid = tx.GetId();

    // mempool "read lock" (held through
    // GetMainSignals().TransactionAddedToMempool())
    LOCK(pool.cs);
    if (pfMissingInputs) {
        *pfMissingInputs = false;
    }

    // Coinbase is only valid in a block, not as a loose transaction.
    if (!CheckRegularTransaction(tx, state)) {
        // state filled in by CheckRegularTransaction.
        return false;
    }

    // Rather not work on nonstandard transactions (unless -testnet/-regtest)
    std::string reason;
    if (fRequireStandard && !IsStandardTx(tx, reason)) {
        return state.DoS(0, false, REJECT_NONSTANDARD, reason);
    }

    // Only accept nLockTime-using transactions that can be mined in the next
    // block; we don't want our mempool filled up with transactions that can't
    // be mined yet.
    CValidationState ctxState;
    if (!ContextualCheckTransactionForCurrentBlock(
            config, tx, ctxState, STANDARD_LOCKTIME_VERIFY_FLAGS)) {
        // We copy the state from a dummy to ensure we don't increase the
        // ban score of peer for transaction that could be valid in the future.
        return state.DoS(
            0, false, REJECT_NONSTANDARD, ctxState.GetRejectReason(),
            ctxState.CorruptionPossible(), ctxState.GetDebugMessage());
    }

    // Is it already in the memory pool?
    if (pool.exists(txid)) {
        return state.Invalid(false, REJECT_ALREADY_KNOWN,
                             "txn-already-in-mempool");
    }

    // Check for conflicts with in-memory transactions
    for (const CTxIn &txin : tx.vin) {
        auto itConflicting = pool.mapNextTx.find(txin.prevout);
        if (itConflicting != pool.mapNextTx.end()) {
            // Disable replacement feature for good
            return state.Invalid(false, REJECT_CONFLICT,
                                 "txn-mempool-conflict");
        }
    }

    {
        CCoinsView dummy;
        CCoinsViewCache view(&dummy);

        Amount nValueIn = Amount::zero();
        LockPoints lp;
        CCoinsViewMemPool viewMemPool(pcoinsTip.get(), pool);
        view.SetBackend(viewMemPool);

        // Do all inputs exist?
        for (const CTxIn txin : tx.vin) {
            if (!pcoinsTip->HaveCoinInCache(txin.prevout)) {
                coins_to_uncache.push_back(txin.prevout);
            }

            if (!view.HaveCoin(txin.prevout)) {
                // Are inputs missing because we already have the tx?
                for (size_t out = 0; out < tx.vout.size(); out++) {
                    // Optimistically just do efficient check of cache for
                    // outputs.
                    if (pcoinsTip->HaveCoinInCache(COutPoint(txid, out))) {
                        return state.Invalid(false, REJECT_DUPLICATE,
                                             "txn-already-known");
                    }
                }

                // Otherwise assume this might be an orphan tx for which we just
                // haven't seen parents yet.
                if (pfMissingInputs) {
                    *pfMissingInputs = true;
                }

                // fMissingInputs and !state.IsInvalid() is used to detect this
                // condition, don't set state.Invalid()
                return false;
            }
        }

        // Are the actual inputs available?
        if (!view.HaveInputs(tx)) {
            return state.Invalid(false, REJECT_DUPLICATE,
                                 "bad-txns-inputs-spent");
        }

        // Bring the best block into scope.
        view.GetBestBlock();

        nValueIn = view.GetValueIn(tx);

        // We have all inputs cached now, so switch back to dummy, so we don't
        // need to keep lock on mempool.
        view.SetBackend(dummy);

        // Only accept BIP68 sequence locked transactions that can be mined in
        // the next block; we don't want our mempool filled up with transactions
        // that can't be mined yet. Must keep pool.cs for this unless we change
        // CheckSequenceLocks to take a CoinsViewCache instead of create its
        // own.
        if (!CheckSequenceLocks(tx, STANDARD_LOCKTIME_VERIFY_FLAGS, &lp)) {
            return state.DoS(0, false, REJECT_NONSTANDARD, "non-BIP68-final");
        }

        // Check for non-standard pay-to-script-hash in inputs
        if (fRequireStandard && !AreInputsStandard(tx, view)) {
            return state.Invalid(false, REJECT_NONSTANDARD,
                                 "bad-txns-nonstandard-inputs");
        }

        int64_t nSigOpsCount =
            GetTransactionSigOpCount(tx, view, STANDARD_SCRIPT_VERIFY_FLAGS);

        Amount nValueOut = tx.GetValueOut();
        Amount nFees = nValueIn - nValueOut;
        // nModifiedFees includes any fee deltas from PrioritiseTransaction
        Amount nModifiedFees = nFees;
        double nPriorityDummy = 0;
        pool.ApplyDeltas(txid, nPriorityDummy, nModifiedFees);

        Amount inChainInputValue;
        double dPriority =
            view.GetPriority(tx, chainActive.Height(), inChainInputValue);

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

        CTxMemPoolEntry entry(ptx, nFees, nAcceptTime, dPriority,
                              chainActive.Height(), inChainInputValue,
                              fSpendsCoinbase, nSigOpsCount, lp);
        unsigned int nSize = entry.GetTxSize();

        // Check that the transaction doesn't have an excessive number of
        // sigops, making it impossible to mine. Since the coinbase transaction
        // itself can contain sigops MAX_STANDARD_TX_SIGOPS is less than
        // MAX_BLOCK_SIGOPS_PER_MB; we still consider this an invalid rather
        // than merely non-standard transaction.
        if (nSigOpsCount > MAX_STANDARD_TX_SIGOPS) {
            return state.DoS(0, false, REJECT_NONSTANDARD,
                             "bad-txns-too-many-sigops", false,
                             strprintf("%d", nSigOpsCount));
        }

        CFeeRate minRelayTxFee = config.GetMinFeePerKB();
        Amount mempoolRejectFee =
            pool.GetMinFee(
                    gArgs.GetArg("-maxmempool", DEFAULT_MAX_MEMPOOL_SIZE) *
                    1000000)
                .GetFee(nSize);
        if (mempoolRejectFee > Amount::zero() &&
            nModifiedFees < mempoolRejectFee) {
            return state.DoS(0, false, REJECT_INSUFFICIENTFEE,
                             "mempool min fee not met", false,
                             strprintf("%d < %d", nFees, mempoolRejectFee));
        }

        if (gArgs.GetBoolArg("-relaypriority", DEFAULT_RELAYPRIORITY) &&
            nModifiedFees < minRelayTxFee.GetFee(nSize) &&
            !AllowFree(entry.GetPriority(chainActive.Height() + 1))) {
            // Require that free transactions have sufficient priority to be
            // mined in the next block.
            return state.DoS(0, false, REJECT_INSUFFICIENTFEE,
                             "insufficient priority");
        }

        // Continuously rate-limit free (really, very-low-fee) transactions.
        // This mitigates 'penny-flooding' -- sending thousands of free
        // transactions just to be annoying or make others' transactions take
        // longer to confirm.
        if (fLimitFree && nModifiedFees < minRelayTxFee.GetFee(nSize)) {
            static CCriticalSection csFreeLimiter;
            static double dFreeCount;
            static int64_t nLastTime;
            int64_t nNow = GetTime();

            LOCK(csFreeLimiter);

            // Use an exponentially decaying ~10-minute window:
            dFreeCount *= pow(1.0 - 1.0 / 600.0, double(nNow - nLastTime));
            nLastTime = nNow;
            // -limitfreerelay unit is thousand-bytes-per-minute
            // At default rate it would take over a month to fill 1GB

            // NOTE: Use the actual size here, and not the fee size since this
            // is counting real size for the rate limiter.
            if (dFreeCount + nSize >=
                gArgs.GetArg("-limitfreerelay", DEFAULT_LIMITFREERELAY) * 10 *
                    1000) {
                return state.DoS(0, false, REJECT_INSUFFICIENTFEE,
                                 "rate limited free transaction");
            }

            LogPrint(BCLog::MEMPOOL, "Rate limit dFreeCount: %g => %g\n",
                     dFreeCount, dFreeCount + nSize);
            dFreeCount += nSize;
        }

        if (nAbsurdFee != Amount::zero() && nFees > nAbsurdFee) {
            return state.Invalid(false, REJECT_HIGHFEE, "absurdly-high-fee",
                                 strprintf("%d > %d", nFees, nAbsurdFee));
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
            return state.DoS(0, false, REJECT_NONSTANDARD,
                             "too-long-mempool-chain", false, errString);
        }

        // Set extraFlags as a set of flags that needs to be activated.
        uint32_t extraFlags = SCRIPT_VERIFY_NONE;
        if (IsReplayProtectionEnabledForCurrentBlock(config)) {
            extraFlags |= SCRIPT_ENABLE_REPLAY_PROTECTION;
        }

        if (IsMagneticAnomalyEnabledForCurrentBlock(config)) {
            extraFlags |= SCRIPT_ENABLE_CHECKDATASIG;
        }

        if (IsGreatWallEnabledForCurrentBlock(config)) {
            if (!fRequireStandard) {
                extraFlags |= SCRIPT_ALLOW_SEGWIT_RECOVERY;
            }
            extraFlags |= SCRIPT_ENABLE_SCHNORR;
        }

        // Check inputs based on the set of flags we activate.
        uint32_t scriptVerifyFlags = STANDARD_SCRIPT_VERIFY_FLAGS;
        if (!config.GetChainParams().RequireStandard()) {
            scriptVerifyFlags =
                SCRIPT_ENABLE_SIGHASH_FORKID |
                gArgs.GetArg("-promiscuousmempoolflags", scriptVerifyFlags);
        }

        // Make sure whatever we need to activate is actually activated.
        scriptVerifyFlags |= extraFlags;

        // Check against previous transactions. This is done last to help
        // prevent CPU exhaustion denial-of-service attacks.
        PrecomputedTransactionData txdata(tx);
        if (!CheckInputs(tx, state, view, true, scriptVerifyFlags, true, false,
                         txdata)) {
            // State filled in by CheckInputs.
            return false;
        }

        // Check again against the current block tip's script verification flags
        // to cache our script execution flags. This is, of course, useless if
        // the next block has different script flags from the previous one, but
        // because the cache tracks script flags for us it will auto-invalidate
        // and we'll just have a few blocks of extra misses on soft-fork
        // activation.
        //
        // This is also useful in case of bugs in the standard flags that cause
        // transactions to pass as valid when they're actually invalid. For
        // instance the STRICTENC flag was incorrectly allowing certain CHECKSIG
        // NOT scripts to pass, even though they were invalid.
        //
        // There is a similar check in CreateNewBlock() to prevent creating
        // invalid blocks (using TestBlockValidity), however allowing such
        // transactions into the mempool can be exploited as a DoS attack.
        uint32_t currentBlockScriptVerifyFlags =
            GetBlockScriptFlags(config, chainActive.Tip());

        if (!CheckInputsFromMempoolAndCache(tx, state, view, pool,
                                            currentBlockScriptVerifyFlags, true,
                                            txdata)) {
            // If we're using promiscuousmempoolflags, we may hit this normally.
            // Check if current block has some flags that scriptVerifyFlags does
            // not before printing an ominous warning.
            if (!(~scriptVerifyFlags & currentBlockScriptVerifyFlags)) {
                return error(
                    "%s: BUG! PLEASE REPORT THIS! ConnectInputs failed against "
                    "MANDATORY but not STANDARD flags %s, %s",
                    __func__, txid.ToString(), FormatStateMessage(state));
            }

            if (!CheckInputs(tx, state, view, true,
                             MANDATORY_SCRIPT_VERIFY_FLAGS | extraFlags, true,
                             false, txdata)) {
                return error(
                    "%s: ConnectInputs failed against MANDATORY but not "
                    "STANDARD flags due to promiscuous mempool %s, %s",
                    __func__, txid.ToString(), FormatStateMessage(state));
            }

            LogPrintf("Warning: -promiscuousmempool flags set to not include "
                      "currently enforced soft forks, this may break mining or "
                      "otherwise cause instability!\n");
        }

        // Store transaction in memory.
        pool.addUnchecked(txid, entry, setAncestors);

        // Trim mempool and check if tx was trimmed.
        if (!fOverrideMempoolLimit) {
            pool.LimitSize(
                gArgs.GetArg("-maxmempool", DEFAULT_MAX_MEMPOOL_SIZE) * 1000000,
                gArgs.GetArg("-mempoolexpiry", DEFAULT_MEMPOOL_EXPIRY) * 60 *
                    60);
            if (!pool.exists(txid)) {
                return state.DoS(0, false, REJECT_INSUFFICIENTFEE,
                                 "mempool full");
            }
        }
    }

    GetMainSignals().TransactionAddedToMempool(ptx);
    return true;
}

/**
 * (try to) add transaction to memory pool with a specified acceptance time.
 */
static bool AcceptToMemoryPoolWithTime(
    const Config &config, CTxMemPool &pool, CValidationState &state,
    const CTransactionRef &tx, bool fLimitFree, bool *pfMissingInputs,
    int64_t nAcceptTime, bool fOverrideMempoolLimit = false,
    const Amount nAbsurdFee = Amount::zero()) {
    std::vector<COutPoint> coins_to_uncache;
    bool res = AcceptToMemoryPoolWorker(
        config, pool, state, tx, fLimitFree, pfMissingInputs, nAcceptTime,
        fOverrideMempoolLimit, nAbsurdFee, coins_to_uncache);
    if (!res) {
        for (const COutPoint &outpoint : coins_to_uncache) {
            pcoinsTip->Uncache(outpoint);
        }
    }

    // After we've (potentially) uncached entries, ensure our coins cache is
    // still within its size limits
    CValidationState stateDummy;
    FlushStateToDisk(config.GetChainParams(), stateDummy,
                     FlushStateMode::PERIODIC);
    return res;
}

bool AcceptToMemoryPool(const Config &config, CTxMemPool &pool,
                        CValidationState &state, const CTransactionRef &tx,
                        bool fLimitFree, bool *pfMissingInputs,
                        bool fOverrideMempoolLimit, const Amount nAbsurdFee) {
    return AcceptToMemoryPoolWithTime(config, pool, state, tx, fLimitFree,
                                      pfMissingInputs, GetTime(),
                                      fOverrideMempoolLimit, nAbsurdFee);
}

/**
 * Return transaction in txOut, and if it was found inside a block, its hash is
 * placed in hashBlock. If blockIndex is provided, the transaction is fetched
 * from the corresponding block.
 */
bool GetTransaction(const Config &config, const TxId &txid,
                    CTransactionRef &txOut, uint256 &hashBlock, bool fAllowSlow,
                    CBlockIndex *blockIndex) {
    CBlockIndex *pindexSlow = blockIndex;

    LOCK(cs_main);

    if (!blockIndex) {
        CTransactionRef ptx = g_mempool.get(txid);
        if (ptx) {
            txOut = ptx;
            return true;
        }

        if (fTxIndex) {
            CDiskTxPos postx;
            if (pblocktree->ReadTxIndex(txid, postx)) {
                CAutoFile file(OpenBlockFile(postx, true), SER_DISK,
                               CLIENT_VERSION);
                if (file.IsNull()) {
                    return error("%s: OpenBlockFile failed", __func__);
                }
                CBlockHeader header;
                try {
                    file >> header;
                    fseek(file.Get(), postx.nTxOffset, SEEK_CUR);
                    file >> txOut;
                } catch (const std::exception &e) {
                    return error("%s: Deserialize or I/O error - %s", __func__,
                                 e.what());
                }
                hashBlock = header.GetHash();
                if (txOut->GetId() != txid) {
                    return error("%s: txid mismatch", __func__);
                }
                return true;
            }

            // transaction not found in index, nothing more can be done
            return false;
        }

        // use coin database to locate block that contains transaction, and scan
        // it
        if (fAllowSlow) {
            const Coin &coin = AccessByTxid(*pcoinsTip, txid);
            if (!coin.IsSpent()) {
                pindexSlow = chainActive[coin.GetHeight()];
            }
        }
    }

    if (pindexSlow) {
        CBlock block;
        if (ReadBlockFromDisk(block, pindexSlow, config)) {
            for (const auto &tx : block.vtx) {
                if (tx->GetId() == txid) {
                    txOut = tx;
                    hashBlock = pindexSlow->GetBlockHash();
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

static bool WriteBlockToDisk(const CBlock &block, CDiskBlockPos &pos,
                             const CMessageHeader::MessageMagic &messageStart) {
    // Open history file to append
    CAutoFile fileout(OpenBlockFile(pos), SER_DISK, CLIENT_VERSION);
    if (fileout.IsNull()) {
        return error("WriteBlockToDisk: OpenBlockFile failed");
    }

    // Write index header
    unsigned int nSize = GetSerializeSize(fileout, block);
    fileout << FLATDATA(messageStart) << nSize;

    // Write block
    long fileOutPos = ftell(fileout.Get());
    if (fileOutPos < 0) {
        return error("WriteBlockToDisk: ftell failed");
    }

    pos.nPos = (unsigned int)fileOutPos;
    fileout << block;

    return true;
}

bool ReadBlockFromDisk(CBlock &block, const CDiskBlockPos &pos,
                       const Config &config) {
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
    if (!CheckProofOfWork(block.GetHash(), block.nBits, config)) {
        return error("ReadBlockFromDisk: Errors in block header at %s",
                     pos.ToString());
    }

    return true;
}

bool ReadBlockFromDisk(CBlock &block, const CBlockIndex *pindex,
                       const Config &config) {
    if (!ReadBlockFromDisk(block, pindex->GetBlockPos(), config)) {
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

bool IsInitialBlockDownload() {
    // Once this function has returned false, it must remain false.
    static std::atomic<bool> latchToFalse{false};
    // Optimization: pre-test latch before taking the lock.
    if (latchToFalse.load(std::memory_order_relaxed)) {
        return false;
    }

    LOCK(cs_main);
    if (latchToFalse.load(std::memory_order_relaxed)) {
        return false;
    }
    if (fImporting || fReindex) {
        return true;
    }
    if (chainActive.Tip() == nullptr) {
        return true;
    }
    if (chainActive.Tip()->nChainWork < nMinimumChainWork) {
        return true;
    }
    if (chainActive.Tip()->GetBlockTime() < (GetTime() - nMaxTipAge)) {
        return true;
    }
    LogPrintf("Leaving InitialBlockDownload (latching to false)\n");
    latchToFalse.store(true, std::memory_order_relaxed);
    return false;
}

CBlockIndex const *pindexBestForkTip = nullptr;
CBlockIndex const *pindexBestForkBase = nullptr;

static void AlertNotify(const std::string &strMessage) {
    uiInterface.NotifyAlertChanged();
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
}

static void CheckForkWarningConditions() {
    AssertLockHeld(cs_main);
    // Before we get past initial download, we cannot reliably alert about forks
    // (we assume we don't get stuck on a fork before finishing our initial
    // sync)
    if (IsInitialBlockDownload()) {
        return;
    }

    // If our best fork is no longer within 72 blocks (+/- 12 hours if no one
    // mines it) of our head, drop it
    if (pindexBestForkTip &&
        chainActive.Height() - pindexBestForkTip->nHeight >= 72) {
        pindexBestForkTip = nullptr;
    }

    if (pindexBestForkTip ||
        (pindexBestInvalid &&
         pindexBestInvalid->nChainWork >
             chainActive.Tip()->nChainWork +
                 (GetBlockProof(*chainActive.Tip()) * 6))) {
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

static void
CheckForkWarningConditionsOnNewFork(const CBlockIndex *pindexNewForkTip) {
    AssertLockHeld(cs_main);
    // If we are on a fork that is sufficiently large, set a warning flag.
    const CBlockIndex *pfork = chainActive.FindFork(pindexNewForkTip);

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
        chainActive.Height() - pindexNewForkTip->nHeight < 72) {
        pindexBestForkTip = pindexNewForkTip;
        pindexBestForkBase = pfork;
    }

    CheckForkWarningConditions();
}

static void InvalidChainFound(CBlockIndex *pindexNew) {
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
    CBlockIndex *tip = chainActive.Tip();
    assert(tip);
    LogPrintf("%s:  current best=%s  height=%d  log2_work=%.8g  date=%s\n",
              __func__, tip->GetBlockHash().ToString(), chainActive.Height(),
              log(tip->nChainWork.getdouble()) / log(2.0),
              FormatISO8601DateTime(tip->GetBlockTime()));
}

void CChainState::InvalidBlockFound(CBlockIndex *pindex,
                                    const CValidationState &state) {
    if (!state.CorruptionPossible()) {
        pindex->nStatus = pindex->nStatus.withFailed();
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
    return VerifyScript(scriptSig, scriptPubKey, nFlags,
                        CachingTransactionSignatureChecker(ptxTo, nIn, amount,
                                                           cacheStore, txdata),
                        &error);
}

int GetSpendHeight(const CCoinsViewCache &inputs) {
    LOCK(cs_main);
    CBlockIndex *pindexPrev = LookupBlockIndex(inputs.GetBestBlock());
    return pindexPrev->nHeight + 1;
}

bool CheckInputs(const CTransaction &tx, CValidationState &state,
                 const CCoinsViewCache &inputs, bool fScriptChecks,
                 const uint32_t flags, bool sigCacheStore,
                 bool scriptCacheStore,
                 const PrecomputedTransactionData &txdata,
                 std::vector<CScriptCheck> *pvChecks) {
    assert(!tx.IsCoinBase());

    // This call does all the inexpensive checks on all the inputs. Only if ALL
    // inputs pass do we perform expensive ECDSA signature checks. Helps prevent
    // CPU exhaustion attacks.
    if (!Consensus::CheckTxInputs(tx, state, inputs, GetSpendHeight(inputs))) {
        return false;
    }

    if (pvChecks) {
        pvChecks->reserve(tx.vin.size());
    }

    // Skip script verification when connecting blocks under the assumedvalid
    // block. Assuming the assumedvalid block is valid this is safe because
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
    uint256 hashCacheEntry = GetScriptCacheKey(tx, flags);
    if (IsKeyInScriptCache(hashCacheEntry, !scriptCacheStore)) {
        return true;
    }

    for (size_t i = 0; i < tx.vin.size(); i++) {
        const COutPoint &prevout = tx.vin[i].prevout;
        const Coin &coin = inputs.AccessCoin(prevout);
        assert(!coin.IsSpent());

        // We very carefully only pass in things to CScriptCheck which are
        // clearly committed to by tx' witness hash. This provides a sanity
        // check that our caching is not introducing consensus failures through
        // additional data in, eg, the coins being spent being checked as a part
        // of CScriptCheck.
        const CScript &scriptPubKey = coin.GetTxOut().scriptPubKey;
        const Amount amount = coin.GetTxOut().nValue;

        // Verify signature
        CScriptCheck check(scriptPubKey, amount, tx, i, flags, sigCacheStore,
                           txdata);
        if (pvChecks) {
            pvChecks->push_back(std::move(check));
        } else if (!check()) {
            // Compute flags without the optional standardness flags.
            // This differs from MANDATORY_SCRIPT_VERIFY_FLAGS as it contains
            // additional upgrade flags (see AcceptToMemoryPoolWorker variable
            // extraFlags).
            // Even though it is not a mandatory flag,
            // SCRIPT_ALLOW_SEGWIT_RECOVERY is strictly more permissive than the
            // set of standard flags. It therefore needs to be added in order to
            // check if we need to penalize the peer that sent us the
            // transaction or not.
            uint32_t mandatoryFlags =
                (flags & ~STANDARD_NOT_MANDATORY_VERIFY_FLAGS) |
                SCRIPT_ALLOW_SEGWIT_RECOVERY;
            if (flags != mandatoryFlags) {
                // Check whether the failure was caused by a non-mandatory
                // script verification check. If so, don't trigger DoS
                // protection to avoid splitting the network on the basis of
                // relay policy disagreements.
                CScriptCheck check2(scriptPubKey, amount, tx, i, mandatoryFlags,
                                    sigCacheStore, txdata);
                if (check2()) {
                    return state.Invalid(
                        false, REJECT_NONSTANDARD,
                        strprintf("non-mandatory-script-verify-flag (%s)",
                                  ScriptErrorString(check.GetScriptError())));
                }
            }

            // We also, regardless, need to check whether the transaction would
            // be valid on the other side of the upgrade, so as to avoid
            // splitting the network between upgraded and non-upgraded nodes.
            // Note that this will create strange error messages like
            // "upgrade-conditional-script-failure (Non-canonical DER ...)"
            // -- the tx was refused entry due to STRICTENC, a mandatory flag,
            // but after the upgrade the signature would have been interpreted
            // as valid Schnorr and thus STRICTENC would not happen.
            CScriptCheck check3(scriptPubKey, amount, tx, i,
                                mandatoryFlags ^ SCRIPT_ENABLE_SCHNORR,
                                sigCacheStore, txdata);
            if (check3()) {
                return state.Invalid(
                    false, REJECT_INVALID,
                    strprintf("upgrade-conditional-script-failure (%s)",
                              ScriptErrorString(check.GetScriptError())));
            }

            // Failures of other flags indicate a transaction that is invalid in
            // new blocks, e.g. a invalid P2SH. We DoS ban such nodes as they
            // are not following the protocol. That said during an upgrade
            // careful thought should be taken as to the correct behavior - we
            // may want to continue peering with non-upgraded nodes even after
            // soft-fork super-majority signaling has occurred.
            return state.DoS(
                100, false, REJECT_INVALID,
                strprintf("mandatory-script-verify-flag-failed (%s)",
                          ScriptErrorString(check.GetScriptError())));
        }
    }

    if (scriptCacheStore && !pvChecks) {
        // We executed all of the provided scripts, and were told to cache the
        // result. Do so now.
        AddKeyInScriptCache(hashCacheEntry);
    }

    return true;
}

namespace {

bool UndoWriteToDisk(const CBlockUndo &blockundo, CDiskBlockPos &pos,
                     const uint256 &hashBlock,
                     const CMessageHeader::MessageMagic &messageStart) {
    // Open history file to append
    CAutoFile fileout(OpenUndoFile(pos), SER_DISK, CLIENT_VERSION);
    if (fileout.IsNull()) {
        return error("%s: OpenUndoFile failed", __func__);
    }

    // Write index header
    unsigned int nSize = GetSerializeSize(fileout, blockundo);
    fileout << FLATDATA(messageStart) << nSize;

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

static bool UndoReadFromDisk(CBlockUndo &blockundo, const CBlockIndex *pindex) {
    CDiskBlockPos pos = pindex->GetUndoPos();
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
bool AbortNode(const std::string &strMessage,
               const std::string &userMessage = "") {
    SetMiscWarning(strMessage);
    LogPrintf("*** %s\n", strMessage);
    uiInterface.ThreadSafeMessageBox(
        userMessage.empty() ? _("Error: A fatal internal error occurred, see "
                                "debug.log for details")
                            : userMessage,
        "", CClientUIInterface::MSG_ERROR);
    StartShutdown();
    return false;
}

bool AbortNode(CValidationState &state, const std::string &strMessage,
               const std::string &userMessage = "") {
    AbortNode(strMessage, userMessage);
    return state.Error(strMessage);
}

} // namespace

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
            return DISCONNECT_FAILED;
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

    return fClean ? DISCONNECT_OK : DISCONNECT_UNCLEAN;
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
        return DISCONNECT_FAILED;
    }

    return ApplyBlockUndo(blockUndo, block, pindex, view);
}

DisconnectResult ApplyBlockUndo(const CBlockUndo &blockUndo,
                                const CBlock &block, const CBlockIndex *pindex,
                                CCoinsViewCache &view) {
    bool fClean = true;

    if (blockUndo.vtxundo.size() + 1 != block.vtx.size()) {
        error("DisconnectBlock(): block and undo data inconsistent");
        return DISCONNECT_FAILED;
    }

    // First, restore inputs.
    for (size_t i = 1; i < block.vtx.size(); i++) {
        const CTransaction &tx = *(block.vtx[i]);
        const CTxUndo &txundo = blockUndo.vtxundo[i - 1];
        if (txundo.vprevout.size() != tx.vin.size()) {
            error("DisconnectBlock(): transaction and undo data inconsistent");
            return DISCONNECT_FAILED;
        }

        for (size_t j = 0; j < tx.vin.size(); j++) {
            const COutPoint &out = tx.vin[j].prevout;
            const Coin &undo = txundo.vprevout[j];
            DisconnectResult res = UndoCoinSpend(undo, view, out);
            if (res == DISCONNECT_FAILED) {
                return DISCONNECT_FAILED;
            }
            fClean = fClean && res != DISCONNECT_UNCLEAN;
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

    return fClean ? DISCONNECT_OK : DISCONNECT_UNCLEAN;
}

static void FlushBlockFile(bool fFinalize = false) {
    LOCK(cs_LastBlockFile);

    CDiskBlockPos posOld(nLastBlockFile, 0);

    FILE *fileOld = OpenBlockFile(posOld);
    if (fileOld) {
        if (fFinalize) {
            TruncateFile(fileOld, vinfoBlockFile[nLastBlockFile].nSize);
        }
        FileCommit(fileOld);
        fclose(fileOld);
    }

    fileOld = OpenUndoFile(posOld);
    if (fileOld) {
        if (fFinalize) {
            TruncateFile(fileOld, vinfoBlockFile[nLastBlockFile].nUndoSize);
        }
        FileCommit(fileOld);
        fclose(fileOld);
    }
}

static bool FindUndoPos(CValidationState &state, int nFile, CDiskBlockPos &pos,
                        unsigned int nAddSize);

static bool WriteUndoDataForBlock(const CBlockUndo &blockundo,
                                  CValidationState &state, CBlockIndex *pindex,
                                  const CChainParams &chainparams) {
    // Write undo information to disk
    if (pindex->GetUndoPos().IsNull()) {
        CDiskBlockPos _pos;
        if (!FindUndoPos(
                state, pindex->nFile, _pos,
                ::GetSerializeSize(blockundo, SER_DISK, CLIENT_VERSION) + 40)) {
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

static bool WriteTxIndexDataForBlock(const CBlock &block,
                                     CValidationState &state,
                                     CBlockIndex *pindex) {
    CDiskTxPos pos(pindex->GetBlockPos(),
                   GetSizeOfCompactSize(block.vtx.size()));
    std::vector<std::pair<uint256, CDiskTxPos>> vPos;
    vPos.reserve(block.vtx.size());
    for (const CTransactionRef &tx : block.vtx) {
        vPos.push_back(std::make_pair(tx->GetHash(), pos));
        pos.nTxOffset += ::GetSerializeSize(*tx, SER_DISK, CLIENT_VERSION);
    }

    if (fTxIndex) {
        if (!pblocktree->WriteTxIndex(vPos)) {
            return AbortNode(state, "Failed to write transaction index");
        }
    }

    return true;
}

static CCheckQueue<CScriptCheck> scriptcheckqueue(128);

void ThreadScriptCheck() {
    RenameThread("bitcoin-scriptch");
    scriptcheckqueue.Thread();
}

int32_t ComputeBlockVersion(const CBlockIndex *pindexPrev,
                            const Consensus::Params &params) {
    int32_t nVersion = VERSIONBITS_TOP_BITS;
    return nVersion;
}

// Returns the script flags which should be checked for a given block
static uint32_t GetBlockScriptFlags(const Config &config,
                                    const CBlockIndex *pChainTip) {
    AssertLockHeld(cs_main);
    const Consensus::Params &consensusParams =
        config.GetChainParams().GetConsensus();

    uint32_t flags = SCRIPT_VERIFY_NONE;

    // P2SH didn't become active until Apr 1 2012
    if (pChainTip->GetMedianTimePast() >= P2SH_ACTIVATION_TIME) {
        flags |= SCRIPT_VERIFY_P2SH;
    }

    // Start enforcing the DERSIG (BIP66) rule.
    if ((pChainTip->nHeight + 1) >= consensusParams.BIP66Height) {
        flags |= SCRIPT_VERIFY_DERSIG;
    }

    // Start enforcing CHECKLOCKTIMEVERIFY (BIP65) rule.
    if ((pChainTip->nHeight + 1) >= consensusParams.BIP65Height) {
        flags |= SCRIPT_VERIFY_CHECKLOCKTIMEVERIFY;
    }

    // Start enforcing CSV (BIP68, BIP112 and BIP113) rule.
    if ((pChainTip->nHeight + 1) >= consensusParams.CSVHeight) {
        flags |= SCRIPT_VERIFY_CHECKSEQUENCEVERIFY;
    }

    // If the UAHF is enabled, we start accepting replay protected txns
    if (IsUAHFenabled(config, pChainTip)) {
        flags |= SCRIPT_VERIFY_STRICTENC;
        flags |= SCRIPT_ENABLE_SIGHASH_FORKID;
    }

    // If the DAA HF is enabled, we start rejecting transaction that use a high
    // s in their signature. We also make sure that signature that are supposed
    // to fail (for instance in multisig or other forms of smart contracts) are
    // null.
    if (IsDAAEnabled(config, pChainTip)) {
        flags |= SCRIPT_VERIFY_LOW_S;
        flags |= SCRIPT_VERIFY_NULLFAIL;
    }

    // When the magnetic anomaly fork is enabled, we start accepting
    // transactions using the OP_CHECKDATASIG opcode and it's verify
    // alternative. We also start enforcing push only signatures and
    // clean stack.
    if (IsMagneticAnomalyEnabled(config, pChainTip)) {
        flags |= SCRIPT_ENABLE_CHECKDATASIG;
        flags |= SCRIPT_VERIFY_SIGPUSHONLY;
        flags |= SCRIPT_VERIFY_CLEANSTACK;
    }

    // If the Great Wall fork is enabled, we start accepting transactions
    // recovering coins sent to segwit addresses. We also start accepting
    // 65/64-byte Schnorr signatures in CHECKSIG and CHECKDATASIG respectively,
    // and their verify variants. We also stop accepting 65 byte signatures in
    // CHECKMULTISIG and its verify variant.
    if (IsGreatWallEnabled(config, pChainTip)) {
        flags |= SCRIPT_ALLOW_SEGWIT_RECOVERY;
        flags |= SCRIPT_ENABLE_SCHNORR;
    }

    // We make sure this node will have replay protection during the next hard
    // fork.
    if (IsReplayProtectionEnabled(config, pChainTip)) {
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
bool CChainState::ConnectBlock(const Config &config, const CBlock &block,
                               CValidationState &state, CBlockIndex *pindex,
                               CCoinsViewCache &view, bool fJustCheck) {
    AssertLockHeld(cs_main);
    assert(pindex);
    // pindex->phashBlock can be null if called by
    // CreateNewBlock/TestBlockValidity
    assert((pindex->phashBlock == nullptr) ||
           (*pindex->phashBlock == block.GetHash()));
    int64_t nTimeStart = GetTimeMicros();

    // Check it again in case a previous version let a bad block in
    BlockValidationOptions validationOptions =
        BlockValidationOptions(!fJustCheck, !fJustCheck);
    if (!CheckBlock(config, block, state, validationOptions)) {
        return error("%s: Consensus::CheckBlock: %s", __func__,
                     FormatStateMessage(state));
    }

    // Verify that the view's current state corresponds to the previous block
    uint256 hashPrevBlock =
        pindex->pprev == nullptr ? uint256() : pindex->pprev->GetBlockHash();
    assert(hashPrevBlock == view.GetBestBlock());

    // Special case for the genesis block, skipping connection of its
    // transactions (its coinbase is unspendable)
    const Consensus::Params &consensusParams =
        config.GetChainParams().GetConsensus();
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
        BlockMap::const_iterator it = mapBlockIndex.find(hashAssumeValid);
        if (it != mapBlockIndex.end()) {
            if (it->second->GetAncestor(pindex->nHeight) == pindex &&
                pindexBestHeader->GetAncestor(pindex->nHeight) == pindex &&
                pindexBestHeader->nChainWork >= nMinimumChainWork) {
                // This block is a member of the assumed verified chain and an
                // ancestor of the best header. The equivalent time check
                // discourages hashpower from extorting the network via DOS
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
    bool fEnforceBIP30 = (!pindex->phashBlock) || // Enforce on CreateNewBlock
                                                  // invocations which don't
                                                  // have a hash.
                         !((pindex->nHeight == 91842 &&
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
    // coinbases are sufficiently buried its no longer possible to create
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
                    return state.DoS(
                        100,
                        error("ConnectBlock(): tried to overwrite transaction"),
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

    const uint32_t flags = GetBlockScriptFlags(config, pindex->pprev);

    int64_t nTime2 = GetTimeMicros();
    nTimeForks += nTime2 - nTime1;
    LogPrint(BCLog::BENCH, "    - Fork checks: %.2fms [%.2fs (%.2fms/blk)]\n",
             MILLI * (nTime2 - nTime1), nTimeForks * MICRO,
             nTimeForks * MILLI / nBlocksTotal);

    CBlockUndo blockundo;

    CCheckQueueControl<CScriptCheck> control(fScriptChecks ? &scriptcheckqueue
                                                           : nullptr);

    std::vector<int> prevheights;
    Amount nFees = Amount::zero();
    int nInputs = 0;

    // Sigops counting. We need to do it again because of P2SH.
    uint64_t nSigOpsCount = 0;
    const uint64_t currentBlockSize =
        ::GetSerializeSize(block, SER_NETWORK, PROTOCOL_VERSION);
    const uint64_t nMaxSigOpsCount = GetMaxBlockSigOpsCount(currentBlockSize);

    blockundo.vtxundo.reserve(block.vtx.size() - 1);

    for (const auto &ptx : block.vtx) {
        const CTransaction &tx = *ptx;

        nInputs += tx.vin.size();

        if (tx.IsCoinBase()) {
            // We've already checked for sigops count before P2SH in CheckBlock.
            nSigOpsCount += GetSigOpCountWithoutP2SH(tx, flags);
        }

        // We do not need to throw when a transaction is duplicated. If they are
        // in the same block, CheckBlock will catch it, and if they are in a
        // different block, it'll register as a double spend or BIP30 violation.
        // In both cases, we get a more meaningful feedback out of it.
        AddCoins(view, tx, pindex->nHeight, true);
    }

    for (const auto &ptx : block.vtx) {
        const CTransaction &tx = *ptx;
        if (tx.IsCoinBase()) {
            continue;
        }

        if (!view.HaveInputs(tx)) {
            return state.DoS(100, error("ConnectBlock(): inputs missing/spent"),
                             REJECT_INVALID, "bad-txns-inputs-missingorspent");
        }

        // Check that transaction is BIP68 final BIP68 lock checks (as
        // opposed to nLockTime checks) must be in ConnectBlock because they
        // require the UTXO set.
        prevheights.resize(tx.vin.size());
        for (size_t j = 0; j < tx.vin.size(); j++) {
            prevheights[j] = view.AccessCoin(tx.vin[j].prevout).GetHeight();
        }

        if (!SequenceLocks(tx, nLockTimeFlags, &prevheights, *pindex)) {
            return state.DoS(
                100,
                error("%s: contains a non-BIP68-final transaction", __func__),
                REJECT_INVALID, "bad-txns-nonfinal");
        }

        // GetTransactionSigOpCount counts 2 types of sigops:
        // * legacy (always)
        // * p2sh (when P2SH enabled in flags and excludes coinbase)
        auto txSigOpsCount = GetTransactionSigOpCount(tx, view, flags);
        if (txSigOpsCount > MAX_TX_SIGOPS_COUNT) {
            return state.DoS(100, false, REJECT_INVALID, "bad-txn-sigops");
        }

        nSigOpsCount += txSigOpsCount;
        if (nSigOpsCount > nMaxSigOpsCount) {
            return state.DoS(100, error("ConnectBlock(): too many sigops"),
                             REJECT_INVALID, "bad-blk-sigops");
        }

        Amount fee = view.GetValueIn(tx) - tx.GetValueOut();
        nFees += fee;

        // Don't cache results if we're actually connecting blocks (still
        // consult the cache, though).
        bool fCacheResults = fJustCheck;

        std::vector<CScriptCheck> vChecks;
        if (!CheckInputs(tx, state, view, fScriptChecks, flags, fCacheResults,
                         fCacheResults, PrecomputedTransactionData(tx),
                         &vChecks)) {
            return error("ConnectBlock(): CheckInputs on %s failed with %s",
                         tx.GetId().ToString(), FormatStateMessage(state));
        }

        control.Add(vChecks);

        blockundo.vtxundo.push_back(CTxUndo());
        SpendCoins(view, tx, blockundo.vtxundo.back(), pindex->nHeight);
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
        return state.DoS(100,
                         error("ConnectBlock(): coinbase pays too much "
                               "(actual=%d vs limit=%d)",
                               block.vtx[0]->GetValueOut(), blockReward),
                         REJECT_INVALID, "bad-cb-amount");
    }

    if (!control.Wait()) {
        return state.DoS(100, false, REJECT_INVALID, "blk-bad-inputs", false,
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

    if (!WriteUndoDataForBlock(blockundo, state, pindex,
                               config.GetChainParams())) {
        return false;
    }

    if (!pindex->IsValid(BlockValidity::SCRIPTS)) {
        pindex->RaiseValidity(BlockValidity::SCRIPTS);
        setDirtyBlockIndex.insert(pindex);
    }

    if (!WriteTxIndexDataForBlock(block, state, pindex)) {
        return false;
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

/**
 * Update the on-disk chain state.
 * The caches and indexes are flushed depending on the mode we're called with if
 * they're too large, if it's been a while since the last write, or always and
 * in all cases if we're in prune mode and are deleting files.
 */
static bool FlushStateToDisk(const CChainParams &chainparams,
                             CValidationState &state, FlushStateMode mode,
                             int nManualPruneHeight) {
    int64_t nMempoolUsage = g_mempool.DynamicMemoryUsage();
    LOCK(cs_main);
    static int64_t nLastWrite = 0;
    static int64_t nLastFlush = 0;
    static int64_t nLastSetChain = 0;
    std::set<int> setFilesToPrune;
    bool fFlushForPrune = false;
    bool fDoFullFlush = false;
    int64_t nNow = 0;
    try {
        {
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
            nNow = GetTimeMicros();
            // Avoid writing/flushing immediately after startup.
            if (nLastWrite == 0) {
                nLastWrite = nNow;
            }
            if (nLastFlush == 0) {
                nLastFlush = nNow;
            }
            if (nLastSetChain == 0) {
                nLastSetChain = nNow;
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
                if (!CheckDiskSpace(0)) {
                    return state.Error("out of disk space");
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
            if (fDoFullFlush) {
                // Typical Coin structures on disk are around 48 bytes in size.
                // Pushing a new one to the database can cause it to be written
                // twice (once in the log, and once in the tables). This is
                // already an overestimation, as most will delete an existing
                // entry or overwrite one. Still, use a conservative safety
                // factor of 2.
                if (!CheckDiskSpace(48 * 2 * 2 * pcoinsTip->GetCacheSize())) {
                    return state.Error("out of disk space");
                }

                // Flush the chainstate (which may refer to block index
                // entries).
                if (!pcoinsTip->Flush()) {
                    return AbortNode(state, "Failed to write to coin database");
                }
                nLastFlush = nNow;
            }
        }

        if (fDoFullFlush ||
            ((mode == FlushStateMode::ALWAYS ||
              mode == FlushStateMode::PERIODIC) &&
             nNow >
                 nLastSetChain + (int64_t)DATABASE_WRITE_INTERVAL * 1000000)) {
            // Update best block in wallet (so we can detect restored wallets).
            GetMainSignals().SetBestChain(chainActive.GetLocator());
            nLastSetChain = nNow;
        }
    } catch (const std::runtime_error &e) {
        return AbortNode(state, std::string("System error while flushing: ") +
                                    e.what());
    }
    return true;
}

void FlushStateToDisk() {
    CValidationState state;
    const CChainParams &chainparams = Params();
    FlushStateToDisk(chainparams, state, FlushStateMode::ALWAYS);
}

void PruneAndFlush() {
    CValidationState state;
    fCheckForPruning = true;
    const CChainParams &chainparams = Params();
    FlushStateToDisk(chainparams, state, FlushStateMode::NONE);
}

/**
 * Update chainActive and related internal data structures when adding a new
 * block to the chain tip.
 */
static void UpdateTip(const Config &config, CBlockIndex *pindexNew) {
    const Consensus::Params &consensusParams =
        config.GetChainParams().GetConsensus();

    chainActive.SetTip(pindexNew);

    // New best block
    g_mempool.AddTransactionsUpdated(1);

    {
        LOCK(g_best_block_mutex);
        g_best_block = pindexNew->GetBlockHash();
        g_best_block_cv.notify_all();
    }

    static bool fWarned = false;
    std::vector<std::string> warningMessages;
    if (!IsInitialBlockDownload()) {
        int nUpgraded = 0;
        const CBlockIndex *pindex = chainActive.Tip();

        // Check the version of the last 100 blocks to see if we need to
        // upgrade:
        for (int i = 0; i < 100 && pindex != nullptr; i++) {
            int32_t nExpectedVersion =
                ComputeBlockVersion(pindex->pprev, consensusParams);
            if (pindex->nVersion > VERSIONBITS_LAST_OLD_BLOCK_VERSION &&
                (pindex->nVersion & ~nExpectedVersion) != 0) {
                ++nUpgraded;
            }
            pindex = pindex->pprev;
        }
        if (nUpgraded > 0) {
            warningMessages.push_back(strprintf(
                "%d of last 100 blocks have unexpected version", nUpgraded));
        }
        if (nUpgraded > 100 / 2) {
            std::string strWarning =
                _("Warning: Unknown block versions being mined! It's possible "
                  "unknown rules are in effect");
            // notify GetWarnings(), called by Qt and the JSON-RPC code to warn
            // the user:
            SetMiscWarning(strWarning);
            if (!fWarned) {
                AlertNotify(strWarning);
                fWarned = true;
            }
        }
    }
    LogPrintf("%s: new best=%s height=%d version=0x%08x log2_work=%.8g tx=%lu "
              "date='%s' progress=%f cache=%.1fMiB(%utxo)",
              __func__, chainActive.Tip()->GetBlockHash().ToString(),
              chainActive.Height(), chainActive.Tip()->nVersion,
              log(chainActive.Tip()->nChainWork.getdouble()) / log(2.0),
              (unsigned long)chainActive.Tip()->nChainTx,
              FormatISO8601DateTime(chainActive.Tip()->GetBlockTime()),
              GuessVerificationProgress(config.GetChainParams().TxData(),
                                        chainActive.Tip()),
              pcoinsTip->DynamicMemoryUsage() * (1.0 / (1 << 20)),
              pcoinsTip->GetCacheSize());
    if (!warningMessages.empty()) {
        LogPrintf(" warning='%s'",
                  boost::algorithm::join(warningMessages, ", "));
    }
    LogPrintf("\n");
}

/**
 * Disconnect chainActive's tip.
 * After calling, the mempool will be in an inconsistent state, with
 * transactions from disconnected blocks being added to disconnectpool. You
 * should make the mempool consistent again by calling updateMempoolForReorg.
 * with cs_main held.
 *
 * If disconnectpool is nullptr, then no disconnected transactions are added to
 * disconnectpool (note that the caller is responsible for mempool consistency
 * in any case).
 */
bool CChainState::DisconnectTip(const Config &config, CValidationState &state,
                                DisconnectedBlockTransactions *disconnectpool) {
    CBlockIndex *pindexDelete = chainActive.Tip();
    assert(pindexDelete);

    // Read block from disk.
    std::shared_ptr<CBlock> pblock = std::make_shared<CBlock>();
    CBlock &block = *pblock;
    if (!ReadBlockFromDisk(block, pindexDelete, config)) {
        return AbortNode(state, "Failed to read block");
    }

    // Apply the block atomically to the chain state.
    int64_t nStart = GetTimeMicros();
    {
        CCoinsViewCache view(pcoinsTip.get());
        assert(view.GetBestBlock() == pindexDelete->GetBlockHash());
        if (DisconnectBlock(block, pindexDelete, view) != DISCONNECT_OK) {
            return error("DisconnectTip(): DisconnectBlock %s failed",
                         pindexDelete->GetBlockHash().ToString());
        }

        bool flushed = view.Flush();
        assert(flushed);
    }

    LogPrint(BCLog::BENCH, "- Disconnect block: %.2fms\n",
             (GetTimeMicros() - nStart) * MILLI);

    // Write the chain state to disk, if necessary.
    if (!FlushStateToDisk(config.GetChainParams(), state,
                          FlushStateMode::IF_NEEDED)) {
        return false;
    }

    // If this block is deactivating a fork, we move all mempool transactions
    // in front of disconnectpool for reprocessing in a future
    // updateMempoolForReorg call
    if (pindexDelete->pprev != nullptr &&
        GetBlockScriptFlags(config, pindexDelete) !=
            GetBlockScriptFlags(config, pindexDelete->pprev)) {
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

    // Update chainActive and related variables.
    UpdateTip(config, pindexDelete->pprev);
    // Let wallets know transactions went from 1-confirmed to
    // 0-confirmed or conflicted:
    GetMainSignals().BlockDisconnected(pblock);
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

public:
    explicit ConnectTrace(CTxMemPool &_pool) : blocksConnected(1), pool(_pool) {
        pool.NotifyEntryRemoved.connect(
            boost::bind(&ConnectTrace::NotifyEntryRemoved, this, _1, _2));
    }

    ~ConnectTrace() {
        pool.NotifyEntryRemoved.disconnect(
            boost::bind(&ConnectTrace::NotifyEntryRemoved, this, _1, _2));
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

static bool FinalizeBlockInternal(const Config &config, CValidationState &state,
                                  const CBlockIndex *pindex) {
    AssertLockHeld(cs_main);
    if (pindex->nStatus.isInvalid()) {
        // We try to finalize an invalid block.
        return state.DoS(100,
                         error("%s: Trying to finalize invalid block %s",
                               __func__, pindex->GetBlockHash().ToString()),
                         REJECT_INVALID, "finalize-invalid-block");
    }

    // Check that the request is consistent with current finalization.
    if (pindexFinalized && !AreOnTheSameFork(pindex, pindexFinalized)) {
        return state.DoS(
            20,
            error("%s: Trying to finalize block %s which conflicts "
                  "with already finalized block",
                  __func__, pindex->GetBlockHash().ToString()),
            REJECT_AGAINST_FINALIZED, "bad-fork-prior-finalized");
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
                                              CBlockIndex *pindexNew) {
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
 * Connect a new block to chainActive. pblock is either nullptr or a pointer to
 * a CBlock corresponding to pindexNew, to bypass loading it again from disk.
 *
 * The block is always added to connectTrace (either after loading from disk or
 * by copying pblock) - if that is not intended, care must be taken to remove
 * the last entry in blocksConnected in case of failure.
 */
bool CChainState::ConnectTip(const Config &config, CValidationState &state,
                             CBlockIndex *pindexNew,
                             const std::shared_ptr<const CBlock> &pblock,
                             ConnectTrace &connectTrace,
                             DisconnectedBlockTransactions &disconnectpool) {
    AssertLockHeld(cs_main);

    assert(pindexNew->pprev == chainActive.Tip());
    // Read block from disk.
    int64_t nTime1 = GetTimeMicros();
    std::shared_ptr<const CBlock> pthisBlock;
    if (!pblock) {
        std::shared_ptr<CBlock> pblockNew = std::make_shared<CBlock>();
        if (!ReadBlockFromDisk(*pblockNew, pindexNew, config)) {
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
        bool rv = ConnectBlock(config, blockConnecting, state, pindexNew, view);
        GetMainSignals().BlockChecked(blockConnecting, state);
        if (!rv) {
            if (state.IsInvalid()) {
                InvalidBlockFound(pindexNew, state);
            }

            return error("ConnectTip(): ConnectBlock %s failed (%s)",
                         pindexNew->GetBlockHash().ToString(),
                         FormatStateMessage(state));
        }

        // Update the finalized block.
        const CBlockIndex *pindexToFinalize =
            FindBlockToFinalize(config, pindexNew);
        if (pindexToFinalize &&
            !FinalizeBlockInternal(config, state, pindexToFinalize)) {
            state.SetCorruptionPossible();
            return error("ConnectTip(): FinalizeBlock %s failed (%s)",
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
        GetBlockScriptFlags(config, pindexNew) !=
            GetBlockScriptFlags(config, pindexNew->pprev)) {
        LogPrint(BCLog::MEMPOOL,
                 "Disconnecting mempool due to acceptance of upgrade block\n");
        disconnectpool.importMempool(g_mempool);
    }

    // Update chainActive & related variables.
    UpdateTip(config, pindexNew);

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

        const CBlockIndex *pindexFork = chainActive.FindFork(pindexNew);

        // Check whether all blocks on the path between the currently active
        // chain and the candidate are valid. Just going until the active chain
        // is an optimization, as we know all blocks in it are valid already.
        CBlockIndex *pindexTest = pindexNew;
        bool hasValidAncestor = true;
        while (hasValidAncestor && pindexTest && pindexTest != pindexFork) {
            assert(pindexTest->nChainTx || pindexTest->nHeight == 0);

            // If this is a parked chain, but it has enough PoW, clear the park
            // state.
            bool fParkedChain = pindexTest->nStatus.isOnParkedChain();
            if (fParkedChain && gArgs.GetBoolArg("-parkdeepreorg", true)) {
                const CBlockIndex *pindexTip = chainActive.Tip();

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
                    // worth of work to ensure we don't fork accidentaly.
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
                    LogPrintf("Unpark block %s as its chain has accumulated "
                              "enough PoW.\n",
                              pindexTest->GetBlockHash().ToString());
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

            // Candidate chain is not usable (either invalid or missing data)
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

            CBlockIndex *pindexFailed = pindexNew;
            // Remove the entire chain from the set.
            while (pindexTest != pindexFailed) {
                if (fInvalidChain || fParkedChain) {
                    pindexFailed->nStatus =
                        pindexFailed->nStatus.withFailedParent(fInvalidChain)
                            .withParkedParent(fParkedChain);
                } else if (fMissingData) {
                    // If we're missing data, then add back to
                    // mapBlocksUnlinked, so that if the block arrives in the
                    // future we can try adding to setBlockIndexCandidates
                    // again.
                    mapBlocksUnlinked.insert(
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
           setBlockIndexCandidates.value_comp()(*it, chainActive.Tip())) {
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
    const Config &config, CValidationState &state, CBlockIndex *pindexMostWork,
    const std::shared_ptr<const CBlock> &pblock, bool &fInvalidFound,
    ConnectTrace &connectTrace) {
    AssertLockHeld(cs_main);
    const CBlockIndex *pindexOldTip = chainActive.Tip();
    const CBlockIndex *pindexFork = chainActive.FindFork(pindexMostWork);

    // Disconnect active blocks which are no longer in the best chain.
    bool fBlocksDisconnected = false;
    DisconnectedBlockTransactions disconnectpool;
    while (chainActive.Tip() && chainActive.Tip() != pindexFork) {
        if (!DisconnectTip(config, state, &disconnectpool)) {
            // This is likely a fatal error, but keep the mempool consistent,
            // just in case. Only remove from the mempool in this case.
            disconnectpool.updateMempoolForReorg(config, false);
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
                    if (!state.CorruptionPossible()) {
                        InvalidChainFound(vpindexToConnect.back());
                    }

                    state = CValidationState();
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
                    chainActive.Tip()->nChainWork > pindexOldTip->nChainWork) {
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

static void NotifyHeaderTip() {
    bool fNotify = false;
    bool fInitialBlockDownload = false;
    static CBlockIndex *pindexHeaderOld = nullptr;
    CBlockIndex *pindexHeader = nullptr;
    {
        LOCK(cs_main);
        pindexHeader = pindexBestHeader;

        if (pindexHeader != pindexHeaderOld) {
            fNotify = true;
            fInitialBlockDownload = IsInitialBlockDownload();
            pindexHeaderOld = pindexHeader;
        }
    }

    // Send block tip changed notifications without cs_main
    if (fNotify) {
        uiInterface.NotifyHeaderTip(fInitialBlockDownload, pindexHeader);
    }
}

bool CChainState::ActivateBestChain(const Config &config,
                                    CValidationState &state,
                                    std::shared_ptr<const CBlock> pblock) {
    // Note that while we're often called here from ProcessNewBlock, this is
    // far from a guarantee. Things in the P2P/RPC will often end up calling
    // us in the middle of ProcessNewBlock - do not assume pblock is set
    // sanely for performance or correctness!
    AssertLockNotHeld(cs_main);

    CBlockIndex *pindexMostWork = nullptr;
    CBlockIndex *pindexNewTip = nullptr;
    do {
        boost::this_thread::interruption_point();

        if (GetMainSignals().CallbacksPending() > 10) {
            // Block until the validation queue drains. This should largely
            // never happen in normal operation, however may happen during
            // reindex, causing memory blowup  if we run too far ahead.
            SyncWithValidationInterfaceQueue();
        }

        if (ShutdownRequested()) {
            break;
        }

        const CBlockIndex *pindexFork;
        bool fInitialDownload;
        {
            LOCK(cs_main);

            // Destructed before cs_main is unlocked.
            ConnectTrace connectTrace(g_mempool);

            CBlockIndex *pindexOldTip = chainActive.Tip();
            if (pindexMostWork == nullptr) {
                pindexMostWork = FindMostWorkChain();
            }

            // Whether we have anything to do at all.
            if (pindexMostWork == nullptr ||
                pindexMostWork == chainActive.Tip()) {
                return true;
            }

            bool fInvalidFound = false;
            std::shared_ptr<const CBlock> nullBlockPtr;
            if (!ActivateBestChainStep(
                    config, state, pindexMostWork,
                    pblock &&
                            pblock->GetHash() == pindexMostWork->GetBlockHash()
                        ? pblock
                        : nullBlockPtr,
                    fInvalidFound, connectTrace)) {
                return false;
            }

            if (fInvalidFound) {
                // Wipe cache, we may need another branch now.
                pindexMostWork = nullptr;
            }

            pindexNewTip = chainActive.Tip();
            pindexFork = chainActive.FindFork(pindexOldTip);
            fInitialDownload = IsInitialBlockDownload();

            for (const PerBlockConnectTrace &trace :
                 connectTrace.GetBlocksConnected()) {
                assert(trace.pblock && trace.pindex);
                GetMainSignals().BlockConnected(trace.pblock, trace.pindex,
                                                *trace.conflictedTxs);
            }
        }

        // When we reach this point, we switched to a new tip (stored in
        // pindexNewTip).

        // Notifications/callbacks that can run without cs_main

        // Notify external listeners about the new tip.
        GetMainSignals().UpdatedBlockTip(pindexNewTip, pindexFork,
                                         fInitialDownload);

        // Always notify the UI if a new block tip was connected
        if (pindexFork != pindexNewTip) {
            uiInterface.NotifyBlockTip(fInitialDownload, pindexNewTip);
        }
    } while (pindexNewTip != pindexMostWork);

    const CChainParams &params = config.GetChainParams();
    CheckBlockIndex(params.GetConsensus());

    // Write changes periodically to disk, after relay.
    if (!FlushStateToDisk(params, state, FlushStateMode::PERIODIC)) {
        return false;
    }

    int nStopAtHeight = gArgs.GetArg("-stopatheight", DEFAULT_STOPATHEIGHT);
    if (nStopAtHeight && pindexNewTip &&
        pindexNewTip->nHeight >= nStopAtHeight) {
        StartShutdown();
    }

    return true;
}

bool ActivateBestChain(const Config &config, CValidationState &state,
                       std::shared_ptr<const CBlock> pblock) {
    return g_chainstate.ActivateBestChain(config, state, std::move(pblock));
}

bool CChainState::PreciousBlock(const Config &config, CValidationState &state,
                                CBlockIndex *pindex) {
    {
        LOCK(cs_main);
        if (pindex->nChainWork < chainActive.Tip()->nChainWork) {
            // Nothing to do, this block is not at the tip.
            return true;
        }

        if (chainActive.Tip()->nChainWork > nLastPreciousChainwork) {
            // The chain has been extended since the last call, reset the
            // counter.
            nBlockReverseSequenceId = -1;
        }

        nLastPreciousChainwork = chainActive.Tip()->nChainWork;
        setBlockIndexCandidates.erase(pindex);
        pindex->nSequenceId = nBlockReverseSequenceId;
        if (nBlockReverseSequenceId > std::numeric_limits<int32_t>::min()) {
            // We can't keep reducing the counter if somebody really wants to
            // call preciousblock 2**31-1 times on the same set of tips...
            nBlockReverseSequenceId--;
        }

        // In case this was parked, unpark it.
        UnparkBlock(pindex);

        // Make sure it is added to the candidate list if apropriate.
        if (pindex->IsValid(BlockValidity::TRANSACTIONS) && pindex->nChainTx) {
            setBlockIndexCandidates.insert(pindex);
            PruneBlockIndexCandidates();
        }
    }

    return ActivateBestChain(config, state);
}

bool PreciousBlock(const Config &config, CValidationState &state,
                   CBlockIndex *pindex) {
    return g_chainstate.PreciousBlock(config, state, pindex);
}

bool CChainState::UnwindBlock(const Config &config, CValidationState &state,
                              CBlockIndex *pindex, bool invalidate) {
    AssertLockHeld(cs_main);

    // Mark the block as either invalid or parked.
    pindex->nStatus = invalidate ? pindex->nStatus.withFailed()
                                 : pindex->nStatus.withParked();
    setDirtyBlockIndex.insert(pindex);

    DisconnectedBlockTransactions disconnectpool;
    while (chainActive.Contains(pindex)) {
        CBlockIndex *pindexWalk = chainActive.Tip();
        if (pindexWalk != pindex) {
            pindexWalk->nStatus = invalidate
                                      ? pindexWalk->nStatus.withFailedParent()
                                      : pindexWalk->nStatus.withParkedParent();
            setDirtyBlockIndex.insert(pindexWalk);
        }

        // ActivateBestChain considers blocks already in chainActive
        // unconditionally valid already, so force disconnect away from it.
        if (!DisconnectTip(config, state, &disconnectpool)) {
            // It's probably hopeless to try to make the mempool consistent
            // here if DisconnectTip failed, but we can try.
            disconnectpool.updateMempoolForReorg(config, false);
            return false;
        }
    }

    // DisconnectTip will add transactions to disconnectpool; try to add these
    // back to the mempool.
    disconnectpool.updateMempoolForReorg(config, true);

    // The resulting new best tip may not be in setBlockIndexCandidates anymore,
    // so add it again.
    for (const std::pair<const uint256, CBlockIndex *> &it : mapBlockIndex) {
        CBlockIndex *i = it.second;
        if (i->IsValid(BlockValidity::TRANSACTIONS) && i->nChainTx &&
            !setBlockIndexCandidates.value_comp()(i, chainActive.Tip())) {
            setBlockIndexCandidates.insert(i);
        }
    }

    if (invalidate) {
        InvalidChainFound(pindex);
    }
    uiInterface.NotifyBlockTip(IsInitialBlockDownload(), pindex->pprev);
    return true;
}

bool FinalizeBlockAndInvalidate(const Config &config, CValidationState &state,
                                CBlockIndex *pindex) {
    AssertLockHeld(cs_main);
    if (!FinalizeBlockInternal(config, state, pindex)) {
        // state is set by FinalizeBlockInternal.
        return false;
    }

    // We have a valid candidate, make sure it is not parked.
    if (pindex->nStatus.isOnParkedChain()) {
        UnparkBlock(pindex);
    }

    // If the finalized block is not on the active chain, we need to rewind.
    if (!AreOnTheSameFork(pindex, chainActive.Tip())) {
        const CBlockIndex *pindexFork = chainActive.FindFork(pindex);
        CBlockIndex *pindexToInvalidate =
            chainActive.Tip()->GetAncestor(pindexFork->nHeight + 1);
        return InvalidateBlock(config, state, pindexToInvalidate);
    }

    return true;
}

bool InvalidateBlock(const Config &config, CValidationState &state,
                     CBlockIndex *pindex) {
    return g_chainstate.UnwindBlock(config, state, pindex, true);
}

bool ParkBlock(const Config &config, CValidationState &state,
               CBlockIndex *pindex) {
    return g_chainstate.UnwindBlock(config, state, pindex, false);
}

template <typename F>
void CChainState::UpdateFlagsForBlock(CBlockIndex *pindexBase,
                                      CBlockIndex *pindex, F f) {
    BlockStatus newStatus = f(pindex->nStatus);
    if (pindex->nStatus != newStatus &&
        pindex->GetAncestor(pindexBase->nHeight) == pindexBase) {
        pindex->nStatus = newStatus;
        setDirtyBlockIndex.insert(pindex);

        if (pindex->IsValid(BlockValidity::TRANSACTIONS) && pindex->nChainTx &&
            setBlockIndexCandidates.value_comp()(chainActive.Tip(), pindex)) {
            setBlockIndexCandidates.insert(pindex);
        }
    }
}

template <typename F, typename C>
void CChainState::UpdateFlags(CBlockIndex *pindex, F f, C fchild) {
    AssertLockHeld(cs_main);

    // Update the current block.
    UpdateFlagsForBlock(pindex, pindex, f);

    // Update the flags from this block and all its descendants.
    BlockMap::iterator it = mapBlockIndex.begin();
    while (it != mapBlockIndex.end()) {
        UpdateFlagsForBlock(pindex, it->second, fchild);
        it++;
    }

    // Update the flags from all ancestors too.
    while (pindex != nullptr) {
        BlockStatus newStatus = f(pindex->nStatus);
        if (pindex->nStatus != newStatus) {
            pindex->nStatus = newStatus;
            setDirtyBlockIndex.insert(pindex);
        }
        pindex = pindex->pprev;
    }
}

template <typename F> void CChainState::UpdateFlags(CBlockIndex *pindex, F f) {
    // Handy shorthand.
    UpdateFlags(pindex, f, f);
}

bool CChainState::ResetBlockFailureFlags(CBlockIndex *pindex) {
    AssertLockHeld(cs_main);

    if (pindexBestInvalid &&
        (pindexBestInvalid->GetAncestor(pindex->nHeight) == pindex ||
         pindex->GetAncestor(pindexBestInvalid->nHeight) ==
             pindexBestInvalid)) {
        // Reset the invalid block marker if it is about to be cleared.
        pindexBestInvalid = nullptr;
    }

    // In case we are reconsidering something before the finalization point,
    // move the finalization point to the last common ancestor.
    if (pindexFinalized) {
        pindexFinalized = LastCommonAncestor(pindex, pindexFinalized);
    }

    UpdateFlags(pindex, [](const BlockStatus status) {
        return status.withClearedFailureFlags();
    });

    return true;
}

bool ResetBlockFailureFlags(CBlockIndex *pindex) {
    return g_chainstate.ResetBlockFailureFlags(pindex);
}

bool CChainState::UnparkBlockImpl(CBlockIndex *pindex, bool fClearChildren) {
    AssertLockHeld(cs_main);

    if (pindexBestParked &&
        (pindexBestParked->GetAncestor(pindex->nHeight) == pindex ||
         pindex->GetAncestor(pindexBestParked->nHeight) == pindexBestParked)) {
        // Reset the parked block marker if it is about to be cleared.
        pindexBestParked = nullptr;
    }

    UpdateFlags(pindex,
                [](const BlockStatus status) {
                    return status.withClearedParkedFlags();
                },
                [fClearChildren](const BlockStatus status) {
                    return fClearChildren ? status.withClearedParkedFlags()
                                          : status.withParkedParent(false);
                });

    return true;
}

bool UnparkBlockAndChildren(CBlockIndex *pindex) {
    return g_chainstate.UnparkBlockImpl(pindex, true);
}

bool UnparkBlock(CBlockIndex *pindex) {
    return g_chainstate.UnparkBlockImpl(pindex, false);
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

CBlockIndex *CChainState::AddToBlockIndex(const CBlockHeader &block) {
    AssertLockHeld(cs_main);

    // Check for duplicate
    uint256 hash = block.GetHash();
    BlockMap::iterator it = mapBlockIndex.find(hash);
    if (it != mapBlockIndex.end()) {
        return it->second;
    }

    // Construct new block index object
    CBlockIndex *pindexNew = new CBlockIndex(block);
    // We assign the sequence id to blocks only when the full data is available,
    // to avoid miners withholding blocks but broadcasting headers, to get a
    // competitive advantage.
    pindexNew->nSequenceId = 0;
    BlockMap::iterator mi =
        mapBlockIndex.insert(std::make_pair(hash, pindexNew)).first;
    pindexNew->phashBlock = &((*mi).first);
    BlockMap::iterator miPrev = mapBlockIndex.find(block.hashPrevBlock);
    if (miPrev != mapBlockIndex.end()) {
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
bool CChainState::ReceivedBlockTransactions(const CBlock &block,
                                            CValidationState &state,
                                            CBlockIndex *pindexNew,
                                            const CDiskBlockPos &pos) {
    pindexNew->nTx = block.vtx.size();
    pindexNew->nChainTx = 0;
    pindexNew->nFile = pos.nFile;
    pindexNew->nDataPos = pos.nPos;
    pindexNew->nUndoPos = 0;
    pindexNew->nStatus = pindexNew->nStatus.withData();
    pindexNew->RaiseValidity(BlockValidity::TRANSACTIONS);
    setDirtyBlockIndex.insert(pindexNew);

    if (pindexNew->pprev == nullptr || pindexNew->pprev->nChainTx) {
        // If pindexNew is the genesis block or all parents are
        // BLOCK_VALID_TRANSACTIONS.
        std::deque<CBlockIndex *> queue;
        queue.push_back(pindexNew);

        // Recursively process any descendant blocks that now may be eligible to
        // be connected.
        while (!queue.empty()) {
            CBlockIndex *pindex = queue.front();
            queue.pop_front();
            pindex->nChainTx =
                (pindex->pprev ? pindex->pprev->nChainTx : 0) + pindex->nTx;
            if (pindex->nSequenceId == 0) {
                // We assign a sequence is when transaction are recieved to
                // prevent a miner from being able to broadcast a block but not
                // its content. However, a sequence id may have been set
                // manually, for instance via PreciousBlock, in which case, we
                // don't need to assign one.
                pindex->nSequenceId = nBlockSequenceId++;
            }

            if (chainActive.Tip() == nullptr ||
                !setBlockIndexCandidates.value_comp()(pindex,
                                                      chainActive.Tip())) {
                setBlockIndexCandidates.insert(pindex);
            }

            std::pair<std::multimap<CBlockIndex *, CBlockIndex *>::iterator,
                      std::multimap<CBlockIndex *, CBlockIndex *>::iterator>
                range = mapBlocksUnlinked.equal_range(pindex);
            while (range.first != range.second) {
                std::multimap<CBlockIndex *, CBlockIndex *>::iterator it =
                    range.first;
                queue.push_back(it->second);
                range.first++;
                mapBlocksUnlinked.erase(it);
            }
        }
    } else if (pindexNew->pprev &&
               pindexNew->pprev->IsValid(BlockValidity::TREE)) {
        mapBlocksUnlinked.insert(std::make_pair(pindexNew->pprev, pindexNew));
    }

    return true;
}

static bool FindBlockPos(CDiskBlockPos &pos, unsigned int nAddSize,
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
        unsigned int nOldChunks =
            (pos.nPos + BLOCKFILE_CHUNK_SIZE - 1) / BLOCKFILE_CHUNK_SIZE;
        unsigned int nNewChunks =
            (vinfoBlockFile[nFile].nSize + BLOCKFILE_CHUNK_SIZE - 1) /
            BLOCKFILE_CHUNK_SIZE;
        if (nNewChunks > nOldChunks) {
            if (fPruneMode) {
                fCheckForPruning = true;
            }

            if (CheckDiskSpace(nNewChunks * BLOCKFILE_CHUNK_SIZE - pos.nPos)) {
                FILE *file = OpenBlockFile(pos);
                if (file) {
                    LogPrintf(
                        "Pre-allocating up to position 0x%x in blk%05u.dat\n",
                        nNewChunks * BLOCKFILE_CHUNK_SIZE, pos.nFile);
                    AllocateFileRange(file, pos.nPos,
                                      nNewChunks * BLOCKFILE_CHUNK_SIZE -
                                          pos.nPos);
                    fclose(file);
                }
            } else {
                return error("out of disk space");
            }
        }
    }

    setDirtyFileInfo.insert(nFile);
    return true;
}

static bool FindUndoPos(CValidationState &state, int nFile, CDiskBlockPos &pos,
                        unsigned int nAddSize) {
    pos.nFile = nFile;

    LOCK(cs_LastBlockFile);

    unsigned int nNewSize;
    pos.nPos = vinfoBlockFile[nFile].nUndoSize;
    nNewSize = vinfoBlockFile[nFile].nUndoSize += nAddSize;
    setDirtyFileInfo.insert(nFile);

    unsigned int nOldChunks =
        (pos.nPos + UNDOFILE_CHUNK_SIZE - 1) / UNDOFILE_CHUNK_SIZE;
    unsigned int nNewChunks =
        (nNewSize + UNDOFILE_CHUNK_SIZE - 1) / UNDOFILE_CHUNK_SIZE;
    if (nNewChunks > nOldChunks) {
        if (fPruneMode) {
            fCheckForPruning = true;
        }

        if (CheckDiskSpace(nNewChunks * UNDOFILE_CHUNK_SIZE - pos.nPos)) {
            FILE *file = OpenUndoFile(pos);
            if (file) {
                LogPrintf("Pre-allocating up to position 0x%x in rev%05u.dat\n",
                          nNewChunks * UNDOFILE_CHUNK_SIZE, pos.nFile);
                AllocateFileRange(file, pos.nPos,
                                  nNewChunks * UNDOFILE_CHUNK_SIZE - pos.nPos);
                fclose(file);
            }
        } else {
            return state.Error("out of disk space");
        }
    }

    return true;
}

/**
 * Return true if the provided block header is valid.
 * Only verify PoW if blockValidationOptions is configured to do so.
 * This allows validation of headers on which the PoW hasn't been done.
 * For example: to validate template handed to mining software.
 * Do not call this for any check that depends on the context.
 * For context-dependant calls, see ContextualCheckBlockHeader.
 */
static bool CheckBlockHeader(
    const Config &config, const CBlockHeader &block, CValidationState &state,
    BlockValidationOptions validationOptions = BlockValidationOptions()) {
    // Check proof of work matches claimed amount
    if (validationOptions.shouldValidatePoW() &&
        !CheckProofOfWork(block.GetHash(), block.nBits, config)) {
        return state.DoS(50, false, REJECT_INVALID, "high-hash", false,
                         "proof of work failed");
    }

    return true;
}

bool CheckBlock(const Config &config, const CBlock &block,
                CValidationState &state,
                BlockValidationOptions validationOptions) {
    // These are checks that are independent of context.
    if (block.fChecked) {
        return true;
    }

    // Check that the header is valid (particularly PoW).  This is mostly
    // redundant with the call in AcceptBlockHeader.
    if (!CheckBlockHeader(config, block, state, validationOptions)) {
        return false;
    }

    // Check the merkle root.
    if (validationOptions.shouldValidateMerkleRoot()) {
        bool mutated;
        uint256 hashMerkleRoot2 = BlockMerkleRoot(block, &mutated);
        if (block.hashMerkleRoot != hashMerkleRoot2) {
            return state.DoS(100, false, REJECT_INVALID, "bad-txnmrklroot",
                             true, "hashMerkleRoot mismatch");
        }

        // Check for merkle tree malleability (CVE-2012-2459): repeating
        // sequences of transactions in a block without affecting the merkle
        // root of a block, while still invalidating it.
        if (mutated) {
            return state.DoS(100, false, REJECT_INVALID, "bad-txns-duplicate",
                             true, "duplicate transaction");
        }
    }

    // All potential-corruption validation must be done before we do any
    // transaction validation, as otherwise we may mark the header as invalid
    // because we receive the wrong transactions for it.

    // First transaction must be coinbase.
    if (block.vtx.empty()) {
        return state.DoS(100, false, REJECT_INVALID, "bad-cb-missing", false,
                         "first tx is not coinbase");
    }

    // Size limits.
    auto nMaxBlockSize = config.GetMaxBlockSize();

    // Bail early if there is no way this block is of reasonable size.
    if ((block.vtx.size() * MIN_TRANSACTION_SIZE) > nMaxBlockSize) {
        return state.DoS(100, false, REJECT_INVALID, "bad-blk-length", false,
                         "size limits failed");
    }

    auto currentBlockSize =
        ::GetSerializeSize(block, SER_NETWORK, PROTOCOL_VERSION);
    if (currentBlockSize > nMaxBlockSize) {
        return state.DoS(100, false, REJECT_INVALID, "bad-blk-length", false,
                         "size limits failed");
    }

    // And a valid coinbase.
    if (!CheckCoinbase(*block.vtx[0], state)) {
        return state.Invalid(false, state.GetRejectCode(),
                             state.GetRejectReason(),
                             strprintf("Coinbase check failed (txid %s) %s",
                                       block.vtx[0]->GetId().ToString(),
                                       state.GetDebugMessage()));
    }

    // Keep track of the sigops count.
    uint64_t nSigOps = 0;
    auto nMaxSigOpsCount = GetMaxBlockSigOpsCount(currentBlockSize);

    // Check transactions
    auto txCount = block.vtx.size();
    auto *tx = block.vtx[0].get();

    size_t i = 0;
    while (true) {
        // Count the sigops for the current transaction. If the total sigops
        // count is too high, the the block is invalid.
        nSigOps += GetSigOpCountWithoutP2SH(*tx, STANDARD_SCRIPT_VERIFY_FLAGS);
        if (nSigOps > nMaxSigOpsCount) {
            return state.DoS(100, false, REJECT_INVALID, "bad-blk-sigops",
                             false, "out-of-bounds SigOpCount");
        }

        // Go to the next transaction.
        i++;

        // We reached the end of the block, success.
        if (i >= txCount) {
            break;
        }

        // Check that the transaction is valid. Because this check differs for
        // the coinbase, the loop is arranged such as this only runs after at
        // least one increment.
        tx = block.vtx[i].get();
        if (!CheckRegularTransaction(*tx, state)) {
            return state.Invalid(
                false, state.GetRejectCode(), state.GetRejectReason(),
                strprintf("Transaction check failed (txid %s) %s",
                          tx->GetId().ToString(), state.GetDebugMessage()));
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
 */
static bool ContextualCheckBlockHeader(const Config &config,
                                       const CBlockHeader &block,
                                       CValidationState &state,
                                       const CBlockIndex *pindexPrev,
                                       int64_t nAdjustedTime) {
    assert(pindexPrev != nullptr);
    const int nHeight = pindexPrev->nHeight + 1;

    // Check proof of work
    const Consensus::Params &consensusParams =
        config.GetChainParams().GetConsensus();
    if (block.nBits != GetNextWorkRequired(pindexPrev, &block, config)) {
        LogPrintf("bad bits after height: %d\n", pindexPrev->nHeight);
        return state.DoS(100, false, REJECT_INVALID, "bad-diffbits", false,
                         "incorrect proof of work");
    }

    // Check against checkpoints
    if (fCheckpointsEnabled) {
        const CCheckpointData &checkpoints =
            config.GetChainParams().Checkpoints();

        // Check that the block chain matches the known block chain up to a
        // checkpoint.
        if (!Checkpoints::CheckBlock(checkpoints, nHeight, block.GetHash())) {
            return state.DoS(100,
                             error("%s: rejected by checkpoint lock-in at %d",
                                   __func__, nHeight),
                             REJECT_CHECKPOINT, "checkpoint mismatch");
        }

        // Don't accept any forks from the main chain prior to last checkpoint.
        // GetLastCheckpoint finds the last checkpoint in MapCheckpoints that's
        // in our MapBlockIndex.
        CBlockIndex *pcheckpoint = Checkpoints::GetLastCheckpoint(checkpoints);
        if (pcheckpoint && nHeight < pcheckpoint->nHeight) {
            return state.DoS(
                100,
                error("%s: forked chain older than last checkpoint (height %d)",
                      __func__, nHeight),
                REJECT_CHECKPOINT, "bad-fork-prior-to-checkpoint");
        }
    }

    // Check timestamp against prev
    if (block.GetBlockTime() <= pindexPrev->GetMedianTimePast()) {
        return state.Invalid(false, REJECT_INVALID, "time-too-old",
                             "block's timestamp is too early");
    }

    // Check timestamp
    if (block.GetBlockTime() > nAdjustedTime + MAX_FUTURE_BLOCK_TIME) {
        return state.Invalid(false, REJECT_INVALID, "time-too-new",
                             "block timestamp too far in the future");
    }

    // Reject outdated version blocks when 95% (75% on testnet) of the network
    // has upgraded:
    // check for version 2, 3 and 4 upgrades
    if ((block.nVersion < 2 && nHeight >= consensusParams.BIP34Height) ||
        (block.nVersion < 3 && nHeight >= consensusParams.BIP66Height) ||
        (block.nVersion < 4 && nHeight >= consensusParams.BIP65Height)) {
        return state.Invalid(
            false, REJECT_OBSOLETE,
            strprintf("bad-version(0x%08x)", block.nVersion),
            strprintf("rejected nVersion=0x%08x block", block.nVersion));
    }

    return true;
}

bool ContextualCheckTransactionForCurrentBlock(const Config &config,
                                               const CTransaction &tx,
                                               CValidationState &state,
                                               int flags) {
    AssertLockHeld(cs_main);

    // By convention a negative value for flags indicates that the current
    // network-enforced consensus rules should be used. In a future soft-fork
    // scenario that would mean checking which rules would be enforced for the
    // next block and setting the appropriate flags. At the present time no
    // soft-forks are scheduled, so no flags are set.
    flags = std::max(flags, 0);

    // ContextualCheckTransactionForCurrentBlock() uses chainActive.Height()+1
    // to evaluate nLockTime because when IsFinalTx() is called within
    // CBlock::AcceptBlock(), the height of the block *being* evaluated is what
    // is used. Thus if we want to know if a transaction can be part of the
    // *next* block, we need to call ContextualCheckTransaction() with one more
    // than chainActive.Height().
    const int nBlockHeight = chainActive.Height() + 1;

    // BIP113 will require that time-locked transactions have nLockTime set to
    // less than the median time of the previous block they're contained in.
    // When the next block is created its previous block will be the current
    // chain tip, so we use that to calculate the median time passed to
    // ContextualCheckTransaction() if LOCKTIME_MEDIAN_TIME_PAST is set.
    const int64_t nMedianTimePast =
        chainActive.Tip() == nullptr ? 0
                                     : chainActive.Tip()->GetMedianTimePast();
    const int64_t nLockTimeCutoff = (flags & LOCKTIME_MEDIAN_TIME_PAST)
                                        ? nMedianTimePast
                                        : GetAdjustedTime();

    return ContextualCheckTransaction(config, tx, state, nBlockHeight,
                                      nLockTimeCutoff, nMedianTimePast);
}

static bool ContextualCheckBlock(const Config &config, const CBlock &block,
                                 CValidationState &state,
                                 const CBlockIndex *pindexPrev) {
    const int nHeight = pindexPrev == nullptr ? 0 : pindexPrev->nHeight + 1;
    const Consensus::Params &consensusParams =
        config.GetChainParams().GetConsensus();

    // Start enforcing BIP113 (Median Time Past).
    int nLockTimeFlags = 0;
    if (nHeight >= consensusParams.CSVHeight) {
        nLockTimeFlags |= LOCKTIME_MEDIAN_TIME_PAST;
    }

    const int64_t nMedianTimePast =
        pindexPrev == nullptr ? 0 : pindexPrev->GetMedianTimePast();

    const int64_t nLockTimeCutoff = (nLockTimeFlags & LOCKTIME_MEDIAN_TIME_PAST)
                                        ? nMedianTimePast
                                        : block.GetBlockTime();

    const bool fIsMagneticAnomalyEnabled =
        IsMagneticAnomalyEnabled(config, pindexPrev);

    // Check that all transactions are finalized
    const CTransaction *prevTx = nullptr;
    for (const auto &ptx : block.vtx) {
        const CTransaction &tx = *ptx;
        if (fIsMagneticAnomalyEnabled) {
            if (prevTx && (tx.GetId() <= prevTx->GetId())) {
                if (tx.GetId() == prevTx->GetId()) {
                    return state.DoS(100, false, REJECT_INVALID, "tx-duplicate",
                                     false,
                                     strprintf("Duplicated transaction %s",
                                               tx.GetId().ToString()));
                }

                return state.DoS(
                    100, false, REJECT_INVALID, "tx-ordering", false,
                    strprintf("Transaction order is invalid (%s < %s)",
                              tx.GetId().ToString(),
                              prevTx->GetId().ToString()));
            }

            if (prevTx || !tx.IsCoinBase()) {
                prevTx = &tx;
            }
        }

        if (!ContextualCheckTransaction(config, tx, state, nHeight,
                                        nLockTimeCutoff, nMedianTimePast)) {
            // state set by ContextualCheckTransaction.
            return false;
        }
    }

    // Enforce rule that the coinbase starts with serialized block height
    if (nHeight >= consensusParams.BIP34Height) {
        CScript expect = CScript() << nHeight;
        if (block.vtx[0]->vin[0].scriptSig.size() < expect.size() ||
            !std::equal(expect.begin(), expect.end(),
                        block.vtx[0]->vin[0].scriptSig.begin())) {
            return state.DoS(100, false, REJECT_INVALID, "bad-cb-height", false,
                             "block height mismatch in coinbase");
        }
    }

    return true;
}

/**
 * If the provided block header is valid, add it to the block index.
 *
 * Returns true if the block is succesfully added to the block index.
 */
bool CChainState::AcceptBlockHeader(const Config &config,
                                    const CBlockHeader &block,
                                    CValidationState &state,
                                    CBlockIndex **ppindex) {
    AssertLockHeld(cs_main);
    const CChainParams &chainparams = config.GetChainParams();

    // Check for duplicate
    uint256 hash = block.GetHash();
    BlockMap::iterator miSelf = mapBlockIndex.find(hash);
    CBlockIndex *pindex = nullptr;
    if (hash != chainparams.GetConsensus().hashGenesisBlock) {
        if (miSelf != mapBlockIndex.end()) {
            // Block header is already known.
            pindex = miSelf->second;
            if (ppindex) {
                *ppindex = pindex;
            }

            if (pindex->nStatus.isInvalid()) {
                return state.Invalid(error("%s: block %s is marked invalid",
                                           __func__, hash.ToString()),
                                     0, "duplicate");
            }

            return true;
        }

        if (!CheckBlockHeader(config, block, state)) {
            return error("%s: Consensus::CheckBlockHeader: %s, %s", __func__,
                         hash.ToString(), FormatStateMessage(state));
        }

        // Get prev block index
        BlockMap::iterator mi = mapBlockIndex.find(block.hashPrevBlock);
        if (mi == mapBlockIndex.end()) {
            return state.DoS(10, error("%s: prev block not found", __func__), 0,
                             "prev-blk-not-found");
        }

        CBlockIndex *pindexPrev = (*mi).second;
        assert(pindexPrev);
        if (pindexPrev->nStatus.isInvalid()) {
            return state.DoS(100, error("%s: prev block invalid", __func__),
                             REJECT_INVALID, "bad-prevblk");
        }

        if (!ContextualCheckBlockHeader(config, block, state, pindexPrev,
                                        GetAdjustedTime())) {
            return error("%s: Consensus::ContextualCheckBlockHeader: %s, %s",
                         __func__, hash.ToString(), FormatStateMessage(state));
        }
    }

    if (pindex == nullptr) {
        pindex = AddToBlockIndex(block);
    }

    if (ppindex) {
        *ppindex = pindex;
    }

    CheckBlockIndex(chainparams.GetConsensus());
    return true;
}

// Exposed wrapper for AcceptBlockHeader
bool ProcessNewBlockHeaders(const Config &config,
                            const std::vector<CBlockHeader> &headers,
                            CValidationState &state,
                            const CBlockIndex **ppindex,
                            CBlockHeader *first_invalid) {
    if (first_invalid != nullptr) {
        first_invalid->SetNull();
    }

    {
        LOCK(cs_main);
        for (const CBlockHeader &header : headers) {
            // Use a temp pindex instead of ppindex to avoid a const_cast
            CBlockIndex *pindex = nullptr;
            if (!g_chainstate.AcceptBlockHeader(config, header, state,
                                                &pindex)) {
                if (first_invalid) {
                    *first_invalid = header;
                }
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
static CDiskBlockPos SaveBlockToDisk(const CBlock &block, int nHeight,
                                     const CChainParams &chainparams,
                                     const CDiskBlockPos *dbp) {
    unsigned int nBlockSize =
        ::GetSerializeSize(block, SER_DISK, CLIENT_VERSION);
    CDiskBlockPos blockPos;
    if (dbp != nullptr) {
        blockPos = *dbp;
    }
    if (!FindBlockPos(blockPos, nBlockSize + 8, nHeight, block.GetBlockTime(),
                      dbp != nullptr)) {
        error("%s: FindBlockPos failed", __func__);
        return CDiskBlockPos();
    }
    if (dbp == nullptr) {
        if (!WriteBlockToDisk(block, blockPos, chainparams.DiskMagic())) {
            AbortNode("Failed to write block");
            return CDiskBlockPos();
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
                              CValidationState &state, bool fRequested,
                              const CDiskBlockPos *dbp, bool *fNewBlock) {
    AssertLockHeld(cs_main);

    const CBlock &block = *pblock;
    if (fNewBlock) {
        *fNewBlock = false;
    }

    CBlockIndex *pindex = nullptr;
    if (!AcceptBlockHeader(config, block, state, &pindex)) {
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
        chainActive.Tip() ? std::llabs(chainActive.Tip()->GetReceivedTimeDiff())
                          : 0;

    bool isSameHeight = chainActive.Tip() &&
                        (pindex->nChainWork == chainActive.Tip()->nChainWork);
    if (isSameHeight) {
        LogPrintf("Chain tip timestamp-to-received-time difference: hash=%s, "
                  "diff=%d\n",
                  chainActive.Tip()->GetBlockHash().ToString(),
                  chainTipTimeDiff);
        LogPrintf("New block timestamp-to-received-time difference: hash=%s, "
                  "diff=%d\n",
                  pindex->GetBlockHash().ToString(), newBlockTimeDiff);
    }

    bool fHasMoreOrSameWork =
        (chainActive.Tip() ? pindex->nChainWork >= chainActive.Tip()->nChainWork
                           : true);

    // Blocks that are too out-of-order needlessly limit the effectiveness of
    // pruning, because pruning will not delete block files that contain any
    // blocks which are too close in height to the tip.  Apply this test
    // regardless of whether pruning is enabled; it should generally be safe to
    // not process unrequested blocks.
    bool fTooFarAhead =
        (pindex->nHeight > int(chainActive.Height() + MIN_BLOCKS_TO_KEEP));

    // TODO: Decouple this function from the block download logic by removing
    // fRequested
    // This requires some new chain datastructure to efficiently look up if a
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

    if (fNewBlock) {
        *fNewBlock = true;
    }

    if (!CheckBlock(config, block, state) ||
        !ContextualCheckBlock(config, block, state, pindex->pprev)) {
        if (state.IsInvalid() && !state.CorruptionPossible()) {
            pindex->nStatus = pindex->nStatus.withFailed();
            setDirtyBlockIndex.insert(pindex);
        }

        return error("%s: %s (block %s)", __func__, FormatStateMessage(state),
                     block.GetHash().ToString());
    }

    // If this is a deep reorg (a regorg of more than one block), preemptively
    // mark the chain as parked. If it has enough work, it'll unpark
    // automatically. We mark the block as parked at the very last minute so we
    // can make sure everything is ready to be reorged if needed.
    if (gArgs.GetBoolArg("-parkdeepreorg", true)) {
        const CBlockIndex *pindexFork = chainActive.FindFork(pindex);
        if (pindexFork && pindexFork->nHeight + 1 < pindex->nHeight) {
            LogPrintf("Park block %s as it would cause a deep reorg.\n",
                      pindex->GetBlockHash().ToString());
            pindex->nStatus = pindex->nStatus.withParked();
            setDirtyBlockIndex.insert(pindex);
        }
    }

    // Header is valid/has work and the merkle tree is good.
    // Relay now, but if it does not build on our best tip, let the
    // SendMessages loop relay it.
    if (!IsInitialBlockDownload() && chainActive.Tip() == pindex->pprev) {
        GetMainSignals().NewPoWValidBlock(pindex, pblock);
    }

    const CChainParams &chainparams = config.GetChainParams();

    // Write block to history file
    try {
        CDiskBlockPos blockPos =
            SaveBlockToDisk(block, pindex->nHeight, chainparams, dbp);
        if (blockPos.IsNull()) {
            state.Error(strprintf(
                "%s: Failed to find position to write new block to disk",
                __func__));
            return false;
        }
        if (!ReceivedBlockTransactions(block, state, pindex, blockPos)) {
            return error("AcceptBlock(): ReceivedBlockTransactions failed");
        }
    } catch (const std::runtime_error &e) {
        return AbortNode(state, std::string("System error: ") + e.what());
    }

    if (fCheckForPruning) {
        // we just allocated more disk space for block files.
        FlushStateToDisk(config.GetChainParams(), state, FlushStateMode::NONE);
    }

    CheckBlockIndex(chainparams.GetConsensus());

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

        CValidationState state;
        // Ensure that CheckBlock() passes before calling AcceptBlock, as
        // belt-and-suspenders.
        bool ret = CheckBlock(config, *pblock, state);

        LOCK(cs_main);

        if (ret) {
            // Store to disk
            ret = g_chainstate.AcceptBlock(
                config, pblock, state, fForceProcessing, nullptr, fNewBlock);
        }

        if (!ret) {
            GetMainSignals().BlockChecked(*pblock, state);
            return error("%s: AcceptBlock FAILED", __func__);
        }
    }

    NotifyHeaderTip();

    // Only used to report errors, not invalidity - ignore it
    CValidationState state;
    if (!g_chainstate.ActivateBestChain(config, state, pblock)) {
        return error("%s: ActivateBestChain failed", __func__);
    }

    return true;
}

bool TestBlockValidity(const Config &config, CValidationState &state,
                       const CBlock &block, CBlockIndex *pindexPrev,
                       BlockValidationOptions validationOptions) {
    AssertLockHeld(cs_main);
    assert(pindexPrev && pindexPrev == chainActive.Tip());
    CCoinsViewCache viewNew(pcoinsTip.get());
    CBlockIndex indexDummy(block);
    indexDummy.pprev = pindexPrev;
    indexDummy.nHeight = pindexPrev->nHeight + 1;

    // NOTE: CheckBlockHeader is called by CheckBlock
    if (!ContextualCheckBlockHeader(config, block, state, pindexPrev,
                                    GetAdjustedTime())) {
        return error("%s: Consensus::ContextualCheckBlockHeader: %s", __func__,
                     FormatStateMessage(state));
    }

    if (!CheckBlock(config, block, state, validationOptions)) {
        return error("%s: Consensus::CheckBlock: %s", __func__,
                     FormatStateMessage(state));
    }

    if (!ContextualCheckBlock(config, block, state, pindexPrev)) {
        return error("%s: Consensus::ContextualCheckBlock: %s", __func__,
                     FormatStateMessage(state));
    }

    if (!g_chainstate.ConnectBlock(config, block, state, &indexDummy, viewNew,
                                   true)) {
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

    for (const auto &entry : mapBlockIndex) {
        CBlockIndex *pindex = entry.second;
        if (pindex->nFile == fileNumber) {
            pindex->nStatus = pindex->nStatus.withData(false).withUndo(false);
            pindex->nFile = 0;
            pindex->nDataPos = 0;
            pindex->nUndoPos = 0;
            setDirtyBlockIndex.insert(pindex);

            // Prune from mapBlocksUnlinked -- any block we prune would have
            // to be downloaded again in order to consider its chain, at which
            // point it would be considered as a candidate for
            // mapBlocksUnlinked or setBlockIndexCandidates.
            std::pair<std::multimap<CBlockIndex *, CBlockIndex *>::iterator,
                      std::multimap<CBlockIndex *, CBlockIndex *>::iterator>
                range = mapBlocksUnlinked.equal_range(pindex->pprev);
            while (range.first != range.second) {
                std::multimap<CBlockIndex *, CBlockIndex *>::iterator _it =
                    range.first;
                range.first++;
                if (_it->second == pindex) {
                    mapBlocksUnlinked.erase(_it);
                }
            }
        }
    }

    vinfoBlockFile[fileNumber].SetNull();
    setDirtyFileInfo.insert(fileNumber);
}

void UnlinkPrunedFiles(const std::set<int> &setFilesToPrune) {
    for (const int i : setFilesToPrune) {
        CDiskBlockPos pos(i, 0);
        fs::remove(GetBlockPosFilename(pos, "blk"));
        fs::remove(GetBlockPosFilename(pos, "rev"));
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
    if (chainActive.Tip() == nullptr) {
        return;
    }

    // last block to prune is the lesser of (user-specified height,
    // MIN_BLOCKS_TO_KEEP from the tip)
    unsigned int nLastBlockWeCanPrune =
        std::min((unsigned)nManualPruneHeight,
                 chainActive.Tip()->nHeight - MIN_BLOCKS_TO_KEEP);
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
    CValidationState state;
    const CChainParams &chainparams = Params();
    FlushStateToDisk(chainparams, state, FlushStateMode::NONE,
                     nManualPruneHeight);
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
    if (chainActive.Tip() == nullptr || nPruneTarget == 0) {
        return;
    }
    if (uint64_t(chainActive.Tip()->nHeight) <= nPruneAfterHeight) {
        return;
    }

    unsigned int nLastBlockWeCanPrune =
        chainActive.Tip()->nHeight - MIN_BLOCKS_TO_KEEP;
    uint64_t nCurrentUsage = CalculateCurrentUsage();
    // We don't check to prune until after we've allocated new space for files,
    // so we should leave a buffer under our target to account for another
    // allocation before the next pruning.
    uint64_t nBuffer = BLOCKFILE_CHUNK_SIZE + UNDOFILE_CHUNK_SIZE;
    uint64_t nBytesToPrune;
    int count = 0;

    if (nCurrentUsage + nBuffer >= nPruneTarget) {
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

bool CheckDiskSpace(uint64_t nAdditionalBytes) {
    uint64_t nFreeBytesAvailable = fs::space(GetDataDir()).available;

    // Check for nMinDiskSpace bytes (currently 50MB)
    if (nFreeBytesAvailable < nMinDiskSpace + nAdditionalBytes) {
        return AbortNode("Disk space is low!", _("Error: Disk space is low!"));
    }

    return true;
}

static FILE *OpenDiskFile(const CDiskBlockPos &pos, const char *prefix,
                          bool fReadOnly) {
    if (pos.IsNull()) {
        return nullptr;
    }

    fs::path path = GetBlockPosFilename(pos, prefix);
    fs::create_directories(path.parent_path());
    FILE *file = fsbridge::fopen(path, "rb+");
    if (!file && !fReadOnly) {
        file = fsbridge::fopen(path, "wb+");
    }

    if (!file) {
        LogPrintf("Unable to open file %s\n", path.string());
        return nullptr;
    }

    if (pos.nPos) {
        if (fseek(file, pos.nPos, SEEK_SET)) {
            LogPrintf("Unable to seek to position %u of %s\n", pos.nPos,
                      path.string());
            fclose(file);
            return nullptr;
        }
    }

    return file;
}

FILE *OpenBlockFile(const CDiskBlockPos &pos, bool fReadOnly) {
    return OpenDiskFile(pos, "blk", fReadOnly);
}

/** Open an undo file (rev?????.dat) */
static FILE *OpenUndoFile(const CDiskBlockPos &pos, bool fReadOnly) {
    return OpenDiskFile(pos, "rev", fReadOnly);
}

fs::path GetBlockPosFilename(const CDiskBlockPos &pos, const char *prefix) {
    return GetDataDir() / "blocks" / strprintf("%s%05u.dat", prefix, pos.nFile);
}

CBlockIndex *CChainState::InsertBlockIndex(const uint256 &hash) {
    AssertLockHeld(cs_main);

    if (hash.IsNull()) {
        return nullptr;
    }

    // Return existing
    BlockMap::iterator mi = mapBlockIndex.find(hash);
    if (mi != mapBlockIndex.end()) {
        return (*mi).second;
    }

    // Create new
    CBlockIndex *pindexNew = new CBlockIndex();
    mi = mapBlockIndex.insert(std::make_pair(hash, pindexNew)).first;
    pindexNew->phashBlock = &((*mi).first);

    return pindexNew;
}

bool CChainState::LoadBlockIndex(const Config &config,
                                 CBlockTreeDB &blocktree) {
    if (!blocktree.LoadBlockIndexGuts(config, [this](const uint256 &hash) {
            return this->InsertBlockIndex(hash);
        })) {
        return false;
    }

    boost::this_thread::interruption_point();

    // Calculate nChainWork
    std::vector<std::pair<int, CBlockIndex *>> vSortedByHeight;
    vSortedByHeight.reserve(mapBlockIndex.size());
    for (const std::pair<uint256, CBlockIndex *> &item : mapBlockIndex) {
        CBlockIndex *pindex = item.second;
        vSortedByHeight.push_back(std::make_pair(pindex->nHeight, pindex));
    }

    sort(vSortedByHeight.begin(), vSortedByHeight.end());
    for (const std::pair<int, CBlockIndex *> &item : vSortedByHeight) {
        CBlockIndex *pindex = item.second;
        pindex->nChainWork = (pindex->pprev ? pindex->pprev->nChainWork : 0) +
                             GetBlockProof(*pindex);
        pindex->nTimeMax =
            (pindex->pprev ? std::max(pindex->pprev->nTimeMax, pindex->nTime)
                           : pindex->nTime);
        // We can link the chain of blocks for which we've received transactions
        // at some point. Pruned nodes may have deleted the block.
        if (pindex->nTx > 0) {
            if (pindex->pprev) {
                if (pindex->pprev->nChainTx) {
                    pindex->nChainTx = pindex->pprev->nChainTx + pindex->nTx;
                } else {
                    pindex->nChainTx = 0;
                    mapBlocksUnlinked.insert(
                        std::make_pair(pindex->pprev, pindex));
                }
            } else {
                pindex->nChainTx = pindex->nTx;
            }
        }

        if (pindex->IsValid(BlockValidity::TRANSACTIONS) &&
            (pindex->nChainTx || pindex->pprev == nullptr)) {
            setBlockIndexCandidates.insert(pindex);
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

bool static LoadBlockIndexDB(const Config &config) {
    if (!g_chainstate.LoadBlockIndex(config, *pblocktree)) {
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
    for (const std::pair<uint256, CBlockIndex *> &item : mapBlockIndex) {
        CBlockIndex *pindex = item.second;
        if (pindex->nStatus.hasData()) {
            setBlkDataFiles.insert(pindex->nFile);
        }
    }

    for (const int i : setBlkDataFiles) {
        CDiskBlockPos pos(i, 0);
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
    bool fReindexing = false;
    pblocktree->ReadReindexing(fReindexing);
    if (fReindexing) {
        fReindex = true;
    }

    // Check whether we have a transaction index
    pblocktree->ReadFlag("txindex", fTxIndex);
    LogPrintf("%s: transaction index %s\n", __func__,
              fTxIndex ? "enabled" : "disabled");

    return true;
}

bool LoadChainTip(const Config &config) {
    AssertLockHeld(cs_main);

    if (chainActive.Tip() &&
        chainActive.Tip()->GetBlockHash() == pcoinsTip->GetBestBlock()) {
        return true;
    }

    if (pcoinsTip->GetBestBlock().IsNull() && mapBlockIndex.size() == 1) {
        // In case we just added the genesis block, connect it now, so
        // that we always have a chainActive.Tip() when we return.
        LogPrintf("%s: Connecting genesis block...\n", __func__);
        CValidationState state;
        if (!ActivateBestChain(config, state)) {
            return false;
        }
    }

    // Load pointer to end of best chain
    CBlockIndex *pindex = LookupBlockIndex(pcoinsTip->GetBestBlock());
    if (!pindex) {
        return false;
    }
    chainActive.SetTip(pindex);

    g_chainstate.PruneBlockIndexCandidates();

    LogPrintf(
        "Loaded best chain: hashBestChain=%s height=%d date=%s progress=%f\n",
        chainActive.Tip()->GetBlockHash().ToString(), chainActive.Height(),
        FormatISO8601DateTime(chainActive.Tip()->GetBlockTime()),
        GuessVerificationProgress(config.GetChainParams().TxData(),
                                  chainActive.Tip()));
    return true;
}

CVerifyDB::CVerifyDB() {
    uiInterface.ShowProgress(_("Verifying blocks..."), 0, false);
}

CVerifyDB::~CVerifyDB() {
    uiInterface.ShowProgress("", 100, false);
}

bool CVerifyDB::VerifyDB(const Config &config, CCoinsView *coinsview,
                         int nCheckLevel, int nCheckDepth) {
    LOCK(cs_main);
    if (chainActive.Tip() == nullptr || chainActive.Tip()->pprev == nullptr) {
        return true;
    }

    // Verify blocks in the best chain
    if (nCheckDepth <= 0 || nCheckDepth > chainActive.Height()) {
        nCheckDepth = chainActive.Height();
    }

    nCheckLevel = std::max(0, std::min(4, nCheckLevel));
    LogPrintf("Verifying last %i blocks at level %i\n", nCheckDepth,
              nCheckLevel);

    CCoinsViewCache coins(coinsview);
    CBlockIndex *pindexState = chainActive.Tip();
    CBlockIndex *pindexFailure = nullptr;
    int nGoodTransactions = 0;
    CValidationState state;
    int reportDone = 0;
    LogPrintf("[0%%]...");
    for (CBlockIndex *pindex = chainActive.Tip(); pindex && pindex->pprev;
         pindex = pindex->pprev) {
        boost::this_thread::interruption_point();
        int percentageDone = std::max(
            1, std::min(
                   99,
                   (int)(((double)(chainActive.Height() - pindex->nHeight)) /
                         (double)nCheckDepth * (nCheckLevel >= 4 ? 50 : 100))));

        if (reportDone < percentageDone / 10) {
            // report every 10% step
            LogPrintf("[%d%%]...", percentageDone);
            reportDone = percentageDone / 10;
        }

        uiInterface.ShowProgress(_("Verifying blocks..."), percentageDone,
                                 false);
        if (pindex->nHeight < chainActive.Height() - nCheckDepth) {
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
        if (!ReadBlockFromDisk(block, pindex, config)) {
            return error(
                "VerifyDB(): *** ReadBlockFromDisk failed at %d, hash=%s",
                pindex->nHeight, pindex->GetBlockHash().ToString());
        }

        // check level 1: verify block validity
        if (nCheckLevel >= 1 && !CheckBlock(config, block, state)) {
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
        if (nCheckLevel >= 3 && pindex == pindexState &&
            (coins.DynamicMemoryUsage() + pcoinsTip->DynamicMemoryUsage()) <=
                nCoinCacheUsage) {
            assert(coins.GetBestBlock() == pindex->GetBlockHash());
            DisconnectResult res =
                g_chainstate.DisconnectBlock(block, pindex, coins);
            if (res == DISCONNECT_FAILED) {
                return error("VerifyDB(): *** irrecoverable inconsistency in "
                             "block data at %d, hash=%s",
                             pindex->nHeight,
                             pindex->GetBlockHash().ToString());
            }

            pindexState = pindex->pprev;
            if (res == DISCONNECT_UNCLEAN) {
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
                     chainActive.Height() - pindexFailure->nHeight + 1,
                     nGoodTransactions);
    }

    // check level 4: try reconnecting blocks
    if (nCheckLevel >= 4) {
        CBlockIndex *pindex = pindexState;
        while (pindex != chainActive.Tip()) {
            boost::this_thread::interruption_point();
            uiInterface.ShowProgress(
                _("Verifying blocks..."),
                std::max(
                    1, std::min(99, 100 - (int)(((double)(chainActive.Height() -
                                                          pindex->nHeight)) /
                                                (double)nCheckDepth * 50))),
                false);
            pindex = chainActive.Next(pindex);
            CBlock block;
            if (!ReadBlockFromDisk(block, pindex, config)) {
                return error(
                    "VerifyDB(): *** ReadBlockFromDisk failed at %d, hash=%s",
                    pindex->nHeight, pindex->GetBlockHash().ToString());
            }
            if (!g_chainstate.ConnectBlock(config, block, state, pindex,
                                           coins)) {
                return error(
                    "VerifyDB(): *** found unconnectable block at %d, hash=%s",
                    pindex->nHeight, pindex->GetBlockHash().ToString());
            }
        }
    }

    LogPrintf("[DONE].\n");
    LogPrintf("No coin database inconsistencies in last %i blocks (%i "
              "transactions)\n",
              chainActive.Height() - pindexState->nHeight, nGoodTransactions);

    return true;
}

/**
 * Apply the effects of a block on the utxo cache, ignoring that it may already
 * have been applied.
 */
bool CChainState::RollforwardBlock(const CBlockIndex *pindex,
                                   CCoinsViewCache &view,
                                   const Config &config) {
    // TODO: merge with ConnectBlock
    CBlock block;
    if (!ReadBlockFromDisk(block, pindex, config)) {
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

bool CChainState::ReplayBlocks(const Config &config, CCoinsView *view) {
    LOCK(cs_main);

    CCoinsViewCache cache(view);

    std::vector<uint256> hashHeads = view->GetHeadBlocks();
    if (hashHeads.empty()) {
        // We're already in a consistent state.
        return true;
    }

    if (hashHeads.size() != 2) {
        return error("ReplayBlocks(): unknown inconsistent state");
    }

    uiInterface.ShowProgress(_("Replaying blocks..."), 0, false);
    LogPrintf("Replaying blocks\n");

    // Old tip during the interrupted flush.
    const CBlockIndex *pindexOld = nullptr;
    // New tip during the interrupted flush.
    const CBlockIndex *pindexNew;
    // Latest block common to both the old and the new tip.
    const CBlockIndex *pindexFork = nullptr;

    if (mapBlockIndex.count(hashHeads[0]) == 0) {
        return error(
            "ReplayBlocks(): reorganization to unknown block requested");
    }

    pindexNew = mapBlockIndex[hashHeads[0]];

    if (!hashHeads[1].IsNull()) {
        // The old tip is allowed to be 0, indicating it's the first flush.
        if (mapBlockIndex.count(hashHeads[1]) == 0) {
            return error(
                "ReplayBlocks(): reorganization from unknown block requested");
        }

        pindexOld = mapBlockIndex[hashHeads[1]];
        pindexFork = LastCommonAncestor(pindexOld, pindexNew);
        assert(pindexFork != nullptr);
    }

    // Rollback along the old branch.
    while (pindexOld != pindexFork) {
        if (pindexOld->nHeight > 0) {
            // Never disconnect the genesis block.
            CBlock block;
            if (!ReadBlockFromDisk(block, pindexOld, config)) {
                return error("RollbackBlock(): ReadBlockFromDisk() failed at "
                             "%d, hash=%s",
                             pindexOld->nHeight,
                             pindexOld->GetBlockHash().ToString());
            }

            LogPrintf("Rolling back %s (%i)\n",
                      pindexOld->GetBlockHash().ToString(), pindexOld->nHeight);
            DisconnectResult res = DisconnectBlock(block, pindexOld, cache);
            if (res == DISCONNECT_FAILED) {
                return error(
                    "RollbackBlock(): DisconnectBlock failed at %d, hash=%s",
                    pindexOld->nHeight, pindexOld->GetBlockHash().ToString());
            }

            // If DISCONNECT_UNCLEAN is returned, it means a non-existing UTXO
            // was deleted, or an existing UTXO was overwritten. It corresponds
            // to cases where the block-to-be-disconnect never had all its
            // operations applied to the UTXO set. However, as both writing a
            // UTXO and deleting a UTXO are idempotent operations, the result is
            // still a version of the UTXO set with the effects of that block
            // undone.
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
        if (!RollforwardBlock(pindex, cache, config)) {
            return false;
        }
    }

    cache.SetBestBlock(pindexNew->GetBlockHash());
    cache.Flush();
    uiInterface.ShowProgress("", 100, false);
    return true;
}

bool ReplayBlocks(const Config &config, CCoinsView *view) {
    return g_chainstate.ReplayBlocks(config, view);
}

bool CChainState::RewindBlockIndex(const Config &config) {
    LOCK(cs_main);

    const CChainParams &params = config.GetChainParams();
    int nHeight = chainActive.Height() + 1;

    // nHeight is now the height of the first insufficiently-validated block, or
    // tipheight + 1
    CValidationState state;
    CBlockIndex *pindex = chainActive.Tip();
    while (chainActive.Height() >= nHeight) {
        if (fPruneMode && !chainActive.Tip()->nStatus.hasData()) {
            // If pruning, don't try rewinding past the HAVE_DATA point; since
            // older blocks can't be served anyway, there's no need to walk
            // further, and trying to DisconnectTip() will fail (and require a
            // needless reindex/redownload of the blockchain).
            break;
        }

        if (!DisconnectTip(config, state, nullptr)) {
            return error(
                "RewindBlockIndex: unable to disconnect block at height %i",
                pindex->nHeight);
        }

        // Occasionally flush state to disk.
        if (!FlushStateToDisk(params, state, FlushStateMode::PERIODIC)) {
            return false;
        }
    }

    // Reduce validity flag and have-data flags.
    // We do this after actual disconnecting, otherwise we'll end up writing the
    // lack of data to disk before writing the chainstate, resulting in a
    // failure to continue if interrupted.
    for (const auto &entry : mapBlockIndex) {
        CBlockIndex *pindexIter = entry.second;
        if (pindexIter->IsValid(BlockValidity::TRANSACTIONS) &&
            pindexIter->nChainTx) {
            setBlockIndexCandidates.insert(pindexIter);
        }
    }

    if (chainActive.Tip() != nullptr) {
        // We can't prune block index candidates based on our tip if we have
        // no tip due to chainActive being empty!
        PruneBlockIndexCandidates();

        CheckBlockIndex(params.GetConsensus());
    }

    return true;
}

bool RewindBlockIndex(const Config &config) {
    if (!g_chainstate.RewindBlockIndex(config)) {
        return false;
    }

    if (chainActive.Tip() != nullptr) {
        // FlushStateToDisk can possibly read chainActive. Be conservative
        // and skip it here, we're about to -reindex-chainstate anyway, so
        // it'll get called a bunch real soon.
        CValidationState state;
        if (!FlushStateToDisk(config.GetChainParams(), state,
                              FlushStateMode::ALWAYS)) {
            return false;
        }
    }

    return true;
}

// May NOT be used after any connections are up as much of the peer-processing
// logic assumes a consistent block index state
void CChainState::UnloadBlockIndex() {
    setBlockIndexCandidates.clear();
}

// May NOT be used after any connections are up as much
// of the peer-processing logic assumes a consistent
// block index state
void UnloadBlockIndex() {
    LOCK(cs_main);
    chainActive.SetTip(nullptr);
    pindexFinalized = nullptr;
    pindexBestInvalid = nullptr;
    pindexBestParked = nullptr;
    pindexBestHeader = nullptr;
    g_mempool.clear();
    mapBlocksUnlinked.clear();
    vinfoBlockFile.clear();
    nLastBlockFile = 0;
    nBlockSequenceId = 1;
    setDirtyBlockIndex.clear();
    setDirtyFileInfo.clear();

    for (BlockMap::value_type &entry : mapBlockIndex) {
        delete entry.second;
    }

    mapBlockIndex.clear();
    fHavePruned = false;

    g_chainstate.UnloadBlockIndex();
}

bool LoadBlockIndex(const Config &config) {
    // Load block index from databases
    bool needs_init = fReindex;
    if (!fReindex) {
        bool ret = LoadBlockIndexDB(config);
        if (!ret) {
            return false;
        }

        needs_init = mapBlockIndex.empty();
    }

    if (needs_init) {
        // Everything here is for *new* reindex/DBs. Thus, though
        // LoadBlockIndexDB may have set fReindex if we shut down
        // mid-reindex previously, we don't check fReindex and
        // instead only check it prior to LoadBlockIndexDB to set
        // needs_init.

        LogPrintf("Initializing databases...\n");
        // Use the provided setting for -txindex in the new database
        fTxIndex = gArgs.GetBoolArg("-txindex", DEFAULT_TXINDEX);
        pblocktree->WriteFlag("txindex", fTxIndex);
    }
    return true;
}

bool CChainState::LoadGenesisBlock(const CChainParams &chainparams) {
    LOCK(cs_main);

    // Check whether we're already initialized by checking for genesis in
    // mapBlockIndex. Note that we can't use chainActive here, since it is
    // set based on the coins db, not the block index db, which is the only
    // thing loaded at this point.
    if (mapBlockIndex.count(chainparams.GenesisBlock().GetHash())) {
        return true;
    }

    // Only add the genesis block if not reindexing (in which case we reuse the
    // one already on disk)
    try {
        CBlock &block = const_cast<CBlock &>(chainparams.GenesisBlock());
        CDiskBlockPos blockPos =
            SaveBlockToDisk(block, 0, chainparams, nullptr);
        if (blockPos.IsNull()) {
            return error("%s: writing genesis block to disk failed", __func__);
        }
        CBlockIndex *pindex = AddToBlockIndex(block);
        CValidationState state;
        if (!ReceivedBlockTransactions(block, state, pindex, blockPos)) {
            return error("%s: genesis block not accepted", __func__);
        }
    } catch (const std::runtime_error &e) {
        return error("%s: failed to write genesis block: %s", __func__,
                     e.what());
    }

    return true;
}

bool LoadGenesisBlock(const CChainParams &chainparams) {
    return g_chainstate.LoadGenesisBlock(chainparams);
}

bool LoadExternalBlockFile(const Config &config, FILE *fileIn,
                           CDiskBlockPos *dbp) {
    // Map of disk positions for blocks with unknown parent (only used for
    // reindex)
    static std::multimap<uint256, CDiskBlockPos> mapBlocksUnknownParent;
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
                blkdat >> FLATDATA(buf);
                if (memcmp(buf, std::begin(chainparams.DiskMagic()),
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

                uint256 hash = block.GetHash();
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
                        CValidationState state;
                        if (g_chainstate.AcceptBlock(config, pblock, state,
                                                     true, dbp, nullptr)) {
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
                    CValidationState state;
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
                    std::pair<std::multimap<uint256, CDiskBlockPos>::iterator,
                              std::multimap<uint256, CDiskBlockPos>::iterator>
                        range = mapBlocksUnknownParent.equal_range(head);
                    while (range.first != range.second) {
                        std::multimap<uint256, CDiskBlockPos>::iterator it =
                            range.first;
                        std::shared_ptr<CBlock> pblockrecursive =
                            std::make_shared<CBlock>();
                        if (ReadBlockFromDisk(*pblockrecursive, it->second,
                                              config)) {
                            LogPrint(
                                BCLog::REINDEX,
                                "%s: Processing out of order child %s of %s\n",
                                __func__, pblockrecursive->GetHash().ToString(),
                                head.ToString());
                            LOCK(cs_main);
                            CValidationState dummy;
                            if (g_chainstate.AcceptBlock(
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
    // before ActivateBestChain, so we have the genesis block in mapBlockIndex
    // but no active chain. (A few of the tests when iterating the block tree
    // require that chainActive has been initialized.)
    if (chainActive.Height() < 0) {
        assert(mapBlockIndex.size() <= 1);
        return;
    }

    // Build forward-pointing map of the entire block tree.
    std::multimap<CBlockIndex *, CBlockIndex *> forward;
    for (auto &entry : mapBlockIndex) {
        forward.emplace(entry.second->pprev, entry.second);
    }

    assert(forward.size() == mapBlockIndex.size());

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
            assert(pindex == chainActive.Genesis());
        }
        if (pindex->nChainTx == 0) {
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
        // parents being VALID_TRANSACTIONS, which is equivalent to nChainTx
        // being set.
        // nChainTx != 0 is used to signal that all parent blocks have been
        // processed (but may have been pruned).
        assert((pindexFirstNeverProcessed != nullptr) ==
               (pindex->nChainTx == 0));
        assert((pindexFirstNotTransactionsValid != nullptr) ==
               (pindex->nChainTx == 0));
        // nHeight must be consistent.
        assert(pindex->nHeight == nHeight);
        // For every block except the genesis block, the chainwork must be
        // larger than the parent's.
        assert(pindex->pprev == nullptr ||
               pindex->nChainWork >= pindex->pprev->nChainWork);
        // The pskip pointer must point back for all but the first 2 blocks.
        assert(nHeight < 2 ||
               (pindex->pskip && (pindex->pskip->nHeight < nHeight)));
        // All mapBlockIndex entries must at least be TREE valid
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
            // Checks for not-invalid blocks.
            // The failed mask cannot be set for blocks without invalid parents.
            assert(!pindex->nStatus.isOnParkedChain());
        }
        if (!CBlockIndexWorkComparator()(pindex, chainActive.Tip()) &&
            pindexFirstNeverProcessed == nullptr) {
            if (pindexFirstInvalid == nullptr) {
                // If this block sorts at least as good as the current tip and
                // is valid and we have all data for its parents, it must be in
                // setBlockIndexCandidates or be parked.
                if (pindexFirstMissing == nullptr) {
                    assert(pindex->nStatus.isOnParkedChain() ||
                           setBlockIndexCandidates.count(pindex));
                }
                // chainActive.Tip() must also be there even if some data has
                // been pruned.
                if (pindex == chainActive.Tip()) {
                    assert(setBlockIndexCandidates.count(pindex));
                }
                // If some parent is missing, then it could be that this block
                // was in setBlockIndexCandidates but had to be removed because
                // of the missing data. In this case it must be in
                // mapBlocksUnlinked -- see test below.
            }
        } else {
            // If this block sorts worse than the current tip or some ancestor's
            // block has never been seen, it cannot be in
            // setBlockIndexCandidates.
            assert(setBlockIndexCandidates.count(pindex) == 0);
        }
        // Check whether this block is in mapBlocksUnlinked.
        std::pair<std::multimap<CBlockIndex *, CBlockIndex *>::iterator,
                  std::multimap<CBlockIndex *, CBlockIndex *>::iterator>
            rangeUnlinked = mapBlocksUnlinked.equal_range(pindex->pprev);
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
            // mapBlocksUnlinked.
            assert(foundInUnlinked);
        }
        if (!pindex->nStatus.hasData()) {
            // Can't be in mapBlocksUnlinked if we don't HAVE_DATA
            assert(!foundInUnlinked);
        }
        if (pindexFirstMissing == nullptr) {
            // We aren't missing data for any parent -- cannot be in
            // mapBlocksUnlinked.
            assert(!foundInUnlinked);
        }
        if (pindex->pprev && pindex->nStatus.hasData() &&
            pindexFirstNeverProcessed == nullptr &&
            pindexFirstMissing != nullptr) {
            // We HAVE_DATA for this block, have received data for all parents
            // at some point, but we're currently missing data for some parent.
            // We must have pruned.
            assert(fHavePruned);
            // This block may have entered mapBlocksUnlinked if:
            //  - it has a descendant that at some point had more work than the
            //    tip, and
            //  - we tried switching to that descendant but were missing
            //    data for some intermediate block between chainActive and the
            //    tip.
            // So if this block is itself better than chainActive.Tip() and it
            // wasn't in
            // setBlockIndexCandidates, then it must be in mapBlocksUnlinked.
            if (!CBlockIndexWorkComparator()(pindex, chainActive.Tip()) &&
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

static const uint64_t MEMPOOL_DUMP_VERSION = 1;

bool LoadMempool(const Config &config) {
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
    int64_t skipped = 0;
    int64_t failed = 0;
    int64_t nNow = GetTime();

    try {
        uint64_t version;
        file >> version;
        if (version != MEMPOOL_DUMP_VERSION) {
            return false;
        }

        uint64_t num;
        file >> num;
        double prioritydummy = 0;
        while (num--) {
            CTransactionRef tx;
            int64_t nTime;
            int64_t nFeeDelta;
            file >> tx;
            file >> nTime;
            file >> nFeeDelta;

            Amount amountdelta = nFeeDelta * SATOSHI;
            if (amountdelta != Amount::zero()) {
                g_mempool.PrioritiseTransaction(tx->GetId(),
                                                tx->GetId().ToString(),
                                                prioritydummy, amountdelta);
            }
            CValidationState state;
            if (nTime + nExpiryTimeout > nNow) {
                LOCK(cs_main);
                AcceptToMemoryPoolWithTime(config, g_mempool, state, tx, true,
                                           nullptr, nTime);
                if (state.IsValid()) {
                    ++count;
                } else {
                    ++failed;
                }
            } else {
                ++skipped;
            }

            if (ShutdownRequested()) {
                return false;
            }
        }
        std::map<uint256, Amount> mapDeltas;
        file >> mapDeltas;

        for (const auto &i : mapDeltas) {
            g_mempool.PrioritiseTransaction(i.first, i.first.ToString(),
                                            prioritydummy, i.second);
        }
    } catch (const std::exception &e) {
        LogPrintf("Failed to deserialize mempool data on disk: %s. Continuing "
                  "anyway.\n",
                  e.what());
        return false;
    }

    LogPrintf("Imported mempool transactions from disk: %i successes, %i "
              "failed, %i expired\n",
              count, failed, skipped);
    return true;
}

void DumpMempool(void) {
    int64_t start = GetTimeMicros();

    std::map<uint256, Amount> mapDeltas;
    std::vector<TxMempoolInfo> vinfo;

    {
        LOCK(g_mempool.cs);
        for (const auto &i : g_mempool.mapDeltas) {
            mapDeltas[i.first] = i.second.second;
        }

        vinfo = g_mempool.infoAll();
    }

    int64_t mid = GetTimeMicros();

    try {
        FILE *filestr = fsbridge::fopen(GetDataDir() / "mempool.dat.new", "wb");
        if (!filestr) {
            return;
        }

        CAutoFile file(filestr, SER_DISK, CLIENT_VERSION);

        uint64_t version = MEMPOOL_DUMP_VERSION;
        file << version;

        file << uint64_t(vinfo.size());
        for (const auto &i : vinfo) {
            file << *(i.tx);
            file << int64_t(i.nTime);
            file << i.nFeeDelta;
            mapDeltas.erase(i.tx->GetId());
        }

        file << mapDeltas;
        FileCommit(file.Get());
        file.fclose();
        RenameOver(GetDataDir() / "mempool.dat.new",
                   GetDataDir() / "mempool.dat");
        int64_t last = GetTimeMicros();
        LogPrintf("Dumped mempool: %gs to copy, %gs to dump\n",
                  (mid - start) * MICRO, (last - mid) * MICRO);
    } catch (const std::exception &e) {
        LogPrintf("Failed to dump mempool: %s. Continuing anyway.\n", e.what());
    }
}

//! Guess how far we are in the verification process at the given block index
double GuessVerificationProgress(const ChainTxData &data, CBlockIndex *pindex) {
    if (pindex == nullptr) {
        return 0.0;
    }

    int64_t nNow = time(nullptr);

    double fTxTotal;
    if (pindex->nChainTx <= data.nTxCount) {
        fTxTotal = data.nTxCount + (nNow - data.nTime) * data.dTxRate;
    } else {
        fTxTotal =
            pindex->nChainTx + (nNow - pindex->GetBlockTime()) * data.dTxRate;
    }

    return pindex->nChainTx / fTxTotal;
}

class CMainCleanup {
public:
    CMainCleanup() {}
    ~CMainCleanup() {
        // block headers
        for (const std::pair<const uint256, CBlockIndex *> &it :
             mapBlockIndex) {
            delete it.second;
        }
        mapBlockIndex.clear();
    }
} instance_of_cmaincleanup;
