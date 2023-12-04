// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2018 The Bitcoin Core developers
// Copyright (c) 2017-2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <validation.h>

#include <arith_uint256.h>
#include <avalanche/avalanche.h>
#include <avalanche/processor.h>
#include <blockvalidity.h>
#include <chainparams.h>
#include <checkpoints.h>
#include <checkqueue.h>
#include <config.h>
#include <consensus/activation.h>
#include <consensus/amount.h>
#include <consensus/merkle.h>
#include <consensus/tx_check.h>
#include <consensus/tx_verify.h>
#include <consensus/validation.h>
#include <deploymentstatus.h>
#include <hash.h>
#include <index/blockfilterindex.h>
#include <logging.h>
#include <logging/timer.h>
#include <minerfund.h>
#include <node/blockstorage.h>
#include <node/coinstats.h>
#include <node/ui_interface.h>
#include <node/utxo_snapshot.h>
#include <policy/block/minerfund.h>
#include <policy/block/stakingrewards.h>
#include <policy/policy.h>
#include <policy/settings.h>
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
#include <undo.h>
#include <util/check.h> // For NDEBUG compile time check
#include <util/strencodings.h>
#include <util/string.h>
#include <util/system.h>
#include <util/trace.h>
#include <util/translation.h>
#include <validationinterface.h>
#include <warnings.h>

#include <algorithm>
#include <atomic>
#include <deque>
#include <numeric>
#include <optional>
#include <string>
#include <thread>

using node::BLOCKFILE_CHUNK_SIZE;
using node::BlockManager;
using node::BlockMap;
using node::CCoinsStats;
using node::CoinStatsHashType;
using node::ComputeUTXOStats;
using node::fImporting;
using node::fPruneMode;
using node::fReindex;
using node::nPruneTarget;
using node::OpenBlockFile;
using node::ReadBlockFromDisk;
using node::SnapshotMetadata;
using node::UNDOFILE_CHUNK_SIZE;
using node::UndoReadFromDisk;
using node::UnlinkPrunedFiles;

#define MICRO 0.000001
#define MILLI 0.001

/** Time to wait between writing blocks/block index to disk. */
static constexpr std::chrono::hours DATABASE_WRITE_INTERVAL{1};
/** Time to wait between flushing chainstate to disk. */
static constexpr std::chrono::hours DATABASE_FLUSH_INTERVAL{24};
const std::vector<std::string> CHECKLEVEL_DOC{
    "level 0 reads the blocks from disk",
    "level 1 verifies block validity",
    "level 2 verifies undo data",
    "level 3 checks disconnection of tip blocks",
    "level 4 tries to reconnect the blocks",
    "each level includes the checks of the previous levels",
};

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

GlobalMutex g_best_block_mutex;
std::condition_variable g_best_block_cv;
uint256 g_best_block;
bool fRequireStandard = true;
bool fCheckBlockIndex = false;
bool fCheckpointsEnabled = DEFAULT_CHECKPOINTS_ENABLED;
int64_t nMaxTipAge = DEFAULT_MAX_TIP_AGE;

BlockHash hashAssumeValid;
arith_uint256 nMinimumChainWork;

BlockValidationOptions::BlockValidationOptions(const Config &config)
    : excessiveBlockSize(config.GetMaxBlockSize()), checkPoW(true),
      checkMerkleRoot(true) {}

const CBlockIndex *
Chainstate::FindForkInGlobalIndex(const CBlockLocator &locator) const {
    AssertLockHeld(cs_main);

    // Find the latest block common to locator and chain - we expect that
    // locator.vHave is sorted descending by height.
    for (const BlockHash &hash : locator.vHave) {
        const CBlockIndex *pindex{m_blockman.LookupBlockIndex(hash)};
        if (pindex) {
            if (m_chain.Contains(pindex)) {
                return pindex;
            }
            if (pindex->GetAncestor(m_chain.Height()) == m_chain.Tip()) {
                return m_chain.Tip();
            }
        }
    }
    return m_chain.Genesis();
}

static uint32_t GetNextBlockScriptFlags(const Consensus::Params &params,
                                        const CBlockIndex *pindex);

bool CheckSequenceLocksAtTip(CBlockIndex *tip, const CCoinsView &coins_view,
                             const CTransaction &tx, LockPoints *lp,
                             bool useExistingLockPoints) {
    assert(tip != nullptr);

    CBlockIndex index;
    index.pprev = tip;
    // CheckSequenceLocksAtTip() uses active_chainstate.m_chain.Height()+1 to
    // evaluate height based locks because when SequenceLocks() is called within
    // ConnectBlock(), the height of the block *being* evaluated is what is
    // used. Thus if we want to know if a transaction can be part of the *next*
    // block, we need to use one more than active_chainstate.m_chain.Height()
    index.nHeight = tip->nHeight + 1;

    std::pair<int, int64_t> lockPair;
    if (useExistingLockPoints) {
        assert(lp);
        lockPair.first = lp->height;
        lockPair.second = lp->time;
    } else {
        std::vector<int> prevheights;
        prevheights.resize(tx.vin.size());
        for (size_t txinIndex = 0; txinIndex < tx.vin.size(); txinIndex++) {
            const CTxIn &txin = tx.vin[txinIndex];
            Coin coin;
            if (!coins_view.GetCoin(txin.prevout, coin)) {
                return error("%s: Missing input", __func__);
            }
            if (coin.GetHeight() == MEMPOOL_HEIGHT) {
                // Assume all mempool transaction confirm in the next block
                prevheights[txinIndex] = tip->nHeight + 1;
            } else {
                prevheights[txinIndex] = coin.GetHeight();
            }
        }
        lockPair = CalculateSequenceLocks(tx, STANDARD_LOCKTIME_VERIFY_FLAGS,
                                          prevheights, index);
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
            // CheckSequenceLocksAtTip to indicate the LockPoints validity.
            int maxInputHeight = 0;
            for (const int height : prevheights) {
                // Can ignore mempool inputs since we'll fail if they had
                // non-zero locks.
                if (height != tip->nHeight + 1) {
                    maxInputHeight = std::max(maxInputHeight, height);
                }
            }
            // tip->GetAncestor(maxInputHeight) should never return a nullptr
            // because maxInputHeight is always less than the tip height.
            // It would, however, be a bad bug to continue execution, since a
            // LockPoints object with the maxInputBlock member set to nullptr
            // signifies no relative lock time.
            lp->maxInputBlock = Assert(tip->GetAncestor(maxInputHeight));
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
    return nMedianTimePast >= gArgs.GetIntArg("-replayprotectionactivationtime",
                                              params.leeKuanYewActivationTime);
}

static bool IsReplayProtectionEnabled(const Consensus::Params &params,
                                      const CBlockIndex *pindexPrev) {
    if (pindexPrev == nullptr) {
        return false;
    }

    return IsReplayProtectionEnabled(params, pindexPrev->GetMedianTimePast());
}

/**
 * Checks to avoid mempool polluting consensus critical paths since cached
 * signature and script validity results will be reused if we validate this
 * transaction again during block validation.
 */
static bool CheckInputsFromMempoolAndCache(
    const CTransaction &tx, TxValidationState &state,
    const CCoinsViewCache &view, const CTxMemPool &pool, const uint32_t flags,
    PrecomputedTransactionData &txdata, int &nSigChecksOut,
    CCoinsViewCache &coins_tip) EXCLUSIVE_LOCKS_REQUIRED(cs_main, pool.cs) {
    AssertLockHeld(cs_main);
    AssertLockHeld(pool.cs);

    assert(!tx.IsCoinBase());
    for (const CTxIn &txin : tx.vin) {
        const Coin &coin = view.AccessCoin(txin.prevout);

        // This coin was checked in PreChecks and MemPoolAccept
        // has been holding cs_main since then.
        Assume(!coin.IsSpent());
        if (coin.IsSpent()) {
            return false;
        }

        // If the Coin is available, there are 2 possibilities:
        // it is available in our current ChainstateActive UTXO set,
        // or it's a UTXO provided by a transaction in our mempool.
        // Ensure the scriptPubKeys in Coins from CoinsView are correct.
        const CTransactionRef &txFrom = pool.get(txin.prevout.GetTxId());
        if (txFrom) {
            assert(txFrom->GetId() == txin.prevout.GetTxId());
            assert(txFrom->vout.size() > txin.prevout.GetN());
            assert(txFrom->vout[txin.prevout.GetN()] == coin.GetTxOut());
        } else {
            const Coin &coinFromUTXOSet = coins_tip.AccessCoin(txin.prevout);
            assert(!coinFromUTXOSet.IsSpent());
            assert(coinFromUTXOSet.GetTxOut() == coin.GetTxOut());
        }
    }

    // Call CheckInputScripts() to cache signature and script validity against
    // current tip consensus rules.
    return CheckInputScripts(tx, state, view, flags, /*sigCacheStore=*/true,
                             /*scriptCacheStore=*/true, txdata, nSigChecksOut);
}

namespace {

class MemPoolAccept {
public:
    MemPoolAccept(CTxMemPool &mempool, Chainstate &active_chainstate)
        : m_pool(mempool), m_view(&m_dummy),
          m_viewmempool(&active_chainstate.CoinsTip(), m_pool),
          m_active_chainstate(active_chainstate) {}

    // We put the arguments we're handed into a struct, so we can pass them
    // around easier.
    struct ATMPArgs {
        const Config &m_config;
        const int64_t m_accept_time;
        const bool m_bypass_limits;
        /*
         * Return any outpoints which were not previously present in the coins
         * cache, but were added as a result of validating the tx for mempool
         * acceptance. This allows the caller to optionally remove the cache
         * additions if the associated transaction ends up being rejected by
         * the mempool.
         */
        std::vector<COutPoint> &m_coins_to_uncache;
        const bool m_test_accept;
        const unsigned int m_heightOverride;
        /**
         * When true, the mempool will not be trimmed when individual
         * transactions are submitted in Finalize(). Instead, limits should be
         * enforced at the end to ensure the package is not partially submitted.
         */
        const bool m_package_submission;

        /** Parameters for single transaction mempool validation. */
        static ATMPArgs SingleAccept(const Config &config, int64_t accept_time,
                                     bool bypass_limits,
                                     std::vector<COutPoint> &coins_to_uncache,
                                     bool test_accept,
                                     unsigned int heightOverride) {
            return ATMPArgs{config,
                            accept_time,
                            bypass_limits,
                            coins_to_uncache,
                            test_accept,
                            heightOverride,
                            /*m_package_submission=*/false};
        }

        /**
         * Parameters for test package mempool validation through
         * testmempoolaccept.
         */
        static ATMPArgs
        PackageTestAccept(const Config &config, int64_t accept_time,
                          std::vector<COutPoint> &coins_to_uncache) {
            return ATMPArgs{config, accept_time,
                            /*m_bypass_limits=*/false, coins_to_uncache,
                            /*m_test_accept=*/true,
                            /*m_heightOverride=*/0,
                            // not submitting to mempool
                            /*m_package_submission=*/false};
        }

        /** Parameters for child-with-unconfirmed-parents package validation. */
        static ATMPArgs
        PackageChildWithParents(const Config &config, int64_t accept_time,
                                std::vector<COutPoint> &coins_to_uncache) {
            return ATMPArgs{config,
                            accept_time,
                            /*m_bypass_limits=*/false,
                            coins_to_uncache,
                            /*m_test_accept=*/false,
                            /*m_heightOverride=*/0,
                            /*m_package_submission=*/true};
        }
        // No default ctor to avoid exposing details to clients and allowing the
        // possibility of mixing up the order of the arguments. Use static
        // functions above instead.
        ATMPArgs() = delete;
    };

    // Single transaction acceptance
    MempoolAcceptResult AcceptSingleTransaction(const CTransactionRef &ptx,
                                                ATMPArgs &args)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);

    /**
     * Multiple transaction acceptance. Transactions may or may not be
     * interdependent, but must not conflict with each other, and the
     * transactions cannot already be in the mempool. Parents must come
     * before children if any dependencies exist.
     */
    PackageMempoolAcceptResult
    AcceptMultipleTransactions(const std::vector<CTransactionRef> &txns,
                               ATMPArgs &args)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);

    /**
     * Package (more specific than just multiple transactions) acceptance.
     * Package must be a child with all of its unconfirmed parents, and
     * topologically sorted.
     */
    PackageMempoolAcceptResult AcceptPackage(const Package &package,
                                             ATMPArgs &args)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);

private:
    // All the intermediate state that gets passed between the various levels
    // of checking a given transaction.
    struct Workspace {
        Workspace(const CTransactionRef &ptx,
                  const uint32_t next_block_script_verify_flags)
            : m_ptx(ptx),
              m_next_block_script_verify_flags(next_block_script_verify_flags) {
        }
        /**
         * Mempool entry constructed for this transaction.
         * Constructed in PreChecks() but not inserted into the mempool until
         * Finalize().
         */
        std::unique_ptr<CTxMemPoolEntry> m_entry;

        /**
         * Virtual size of the transaction as used by the mempool, calculated
         * using serialized size of the transaction and sigchecks.
         */
        int64_t m_vsize;
        /**
         * Fees paid by this transaction: total input amounts subtracted by
         * total output amounts.
         */
        Amount m_base_fees;

        /**
         * Base fees + any fee delta set by the user with
         * prioritisetransaction.
         */
        Amount m_modified_fees;

        const CTransactionRef &m_ptx;
        TxValidationState m_state;
        /**
         * A temporary cache containing serialized transaction data for
         * signature verification.
         * Reused across PreChecks and ConsensusScriptChecks.
         */
        PrecomputedTransactionData m_precomputed_txdata;

        // ABC specific flags that are used in both PreChecks and
        // ConsensusScriptChecks
        const uint32_t m_next_block_script_verify_flags;
        int m_sig_checks_standard;
    };

    // Run the policy checks on a given transaction, excluding any script
    // checks. Looks up inputs, calculates feerate, considers replacement,
    // evaluates package limits, etc. As this function can be invoked for "free"
    // by a peer, only tests that are fast should be done here (to avoid CPU
    // DoS).
    bool PreChecks(ATMPArgs &args, Workspace &ws)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main, m_pool.cs);

    // Re-run the script checks, using consensus flags, and try to cache the
    // result in the scriptcache. This should be done after
    // PolicyScriptChecks(). This requires that all inputs either be in our
    // utxo set or in the mempool.
    bool ConsensusScriptChecks(const ATMPArgs &args, Workspace &ws)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main, m_pool.cs);

    // Try to add the transaction to the mempool, removing any conflicts first.
    // Returns true if the transaction is in the mempool after any size
    // limiting is performed, false otherwise.
    bool Finalize(const ATMPArgs &args, Workspace &ws)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main, m_pool.cs);

    // Submit all transactions to the mempool and call ConsensusScriptChecks to
    // add to the script cache - should only be called after successful
    // validation of all transactions in the package.
    // The package may end up partially-submitted after size limiting;
    // returns true if all transactions are successfully added to the mempool,
    // false otherwise.
    bool SubmitPackage(const ATMPArgs &args, std::vector<Workspace> &workspaces,
                       PackageValidationState &package_state,
                       std::map<const TxId, const MempoolAcceptResult> &results)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main, m_pool.cs);

private:
    CTxMemPool &m_pool;
    CCoinsViewCache m_view;
    CCoinsViewMemPool m_viewmempool;
    CCoinsView m_dummy;

    Chainstate &m_active_chainstate;
};

bool MemPoolAccept::PreChecks(ATMPArgs &args, Workspace &ws) {
    AssertLockHeld(cs_main);
    AssertLockHeld(m_pool.cs);
    const CTransactionRef &ptx = ws.m_ptx;
    const CTransaction &tx = *ws.m_ptx;
    const TxId &txid = ws.m_ptx->GetId();

    // Copy/alias what we need out of args
    const int64_t nAcceptTime = args.m_accept_time;
    const bool bypass_limits = args.m_bypass_limits;
    std::vector<COutPoint> &coins_to_uncache = args.m_coins_to_uncache;
    const unsigned int heightOverride = args.m_heightOverride;

    // Alias what we need out of ws
    TxValidationState &state = ws.m_state;
    std::unique_ptr<CTxMemPoolEntry> &entry = ws.m_entry;
    // Coinbase is only valid in a block, not as a loose transaction.
    if (!CheckRegularTransaction(tx, state)) {
        // state filled in by CheckRegularTransaction.
        return false;
    }

    // Rather not work on nonstandard transactions (unless -testnet)
    std::string reason;
    if (fRequireStandard && !IsStandardTx(tx, reason)) {
        return state.Invalid(TxValidationResult::TX_NOT_STANDARD, reason);
    }

    // Only accept nLockTime-using transactions that can be mined in the next
    // block; we don't want our mempool filled up with transactions that can't
    // be mined yet.
    TxValidationState ctxState;
    if (!ContextualCheckTransactionForCurrentBlock(
            m_active_chainstate.m_chain.Tip(),
            args.m_config.GetChainParams().GetConsensus(), tx, ctxState)) {
        // We copy the state from a dummy to ensure we don't increase the
        // ban score of peer for transaction that could be valid in the future.
        return state.Invalid(TxValidationResult::TX_PREMATURE_SPEND,
                             ctxState.GetRejectReason(),
                             ctxState.GetDebugMessage());
    }

    // Is it already in the memory pool?
    if (m_pool.exists(txid)) {
        return state.Invalid(TxValidationResult::TX_CONFLICT,
                             "txn-already-in-mempool");
    }

    // Check for conflicts with in-memory transactions
    for (const CTxIn &txin : tx.vin) {
        auto itConflicting = m_pool.mapNextTx.find(txin.prevout);
        if (itConflicting != m_pool.mapNextTx.end()) {
            // Disable replacement feature for good
            return state.Invalid(TxValidationResult::TX_MEMPOOL_POLICY,
                                 "txn-mempool-conflict");
        }
    }

    LockPoints lp;
    m_view.SetBackend(m_viewmempool);

    const CCoinsViewCache &coins_cache = m_active_chainstate.CoinsTip();
    // Do all inputs exist?
    for (const CTxIn &txin : tx.vin) {
        if (!coins_cache.HaveCoinInCache(txin.prevout)) {
            coins_to_uncache.push_back(txin.prevout);
        }

        // Note: this call may add txin.prevout to the coins cache
        // (coins_cache.cacheCoins) by way of FetchCoin(). It should be
        // removed later (via coins_to_uncache) if this tx turns out to be
        // invalid.
        if (!m_view.HaveCoin(txin.prevout)) {
            // Are inputs missing because we already have the tx?
            for (size_t out = 0; out < tx.vout.size(); out++) {
                // Optimistically just do efficient check of cache for
                // outputs.
                if (coins_cache.HaveCoinInCache(COutPoint(txid, out))) {
                    return state.Invalid(TxValidationResult::TX_CONFLICT,
                                         "txn-already-known");
                }
            }

            // Otherwise assume this might be an orphan tx for which we just
            // haven't seen parents yet.
            return state.Invalid(TxValidationResult::TX_MISSING_INPUTS,
                                 "bad-txns-inputs-missingorspent");
        }
    }

    // Are the actual inputs available?
    if (!m_view.HaveInputs(tx)) {
        return state.Invalid(TxValidationResult::TX_MEMPOOL_POLICY,
                             "bad-txns-inputs-spent");
    }

    // Bring the best block into scope.
    m_view.GetBestBlock();

    // we have all inputs cached now, so switch back to dummy (to protect
    // against bugs where we pull more inputs from disk that miss being
    // added to coins_to_uncache)
    m_view.SetBackend(m_dummy);

    assert(m_active_chainstate.m_blockman.LookupBlockIndex(
               m_view.GetBestBlock()) == m_active_chainstate.m_chain.Tip());

    // Only accept BIP68 sequence locked transactions that can be mined in
    // the next block; we don't want our mempool filled up with transactions
    // that can't be mined yet.
    // Pass in m_view which has all of the relevant inputs cached. Note that,
    // since m_view's backend was removed, it no longer pulls coins from the
    // mempool.
    if (!CheckSequenceLocksAtTip(m_active_chainstate.m_chain.Tip(), m_view, tx,
                                 &lp)) {
        return state.Invalid(TxValidationResult::TX_PREMATURE_SPEND,
                             "non-BIP68-final");
    }

    // The mempool holds txs for the next block, so pass height+1 to
    // CheckTxInputs
    if (!Consensus::CheckTxInputs(tx, state, m_view,
                                  m_active_chainstate.m_chain.Height() + 1,
                                  ws.m_base_fees)) {
        // state filled in by CheckTxInputs
        return false;
    }

    // Check for non-standard pay-to-script-hash in inputs
    if (fRequireStandard &&
        !AreInputsStandard(tx, m_view, ws.m_next_block_script_verify_flags)) {
        return state.Invalid(TxValidationResult::TX_INPUTS_NOT_STANDARD,
                             "bad-txns-nonstandard-inputs");
    }

    // ws.m_modified_fess includes any fee deltas from PrioritiseTransaction
    ws.m_modified_fees = ws.m_base_fees;
    m_pool.ApplyDelta(txid, ws.m_modified_fees);

    // Keep track of transactions that spend a coinbase, which we re-scan
    // during reorgs to ensure COINBASE_MATURITY is still met.
    bool fSpendsCoinbase = false;
    for (const CTxIn &txin : tx.vin) {
        const Coin &coin = m_view.AccessCoin(txin.prevout);
        if (coin.IsCoinBase()) {
            fSpendsCoinbase = true;
            break;
        }
    }

    unsigned int nSize = tx.GetTotalSize();

    // No transactions are allowed below minRelayTxFee except from disconnected
    // blocks.
    // Do not change this to use virtualsize without coordinating a network
    // policy upgrade.
    if (!bypass_limits && ws.m_modified_fees < minRelayTxFee.GetFee(nSize)) {
        return state.Invalid(TxValidationResult::TX_MEMPOOL_POLICY,
                             "min relay fee not met",
                             strprintf("%d < %d", ws.m_modified_fees,
                                       ::minRelayTxFee.GetFee(nSize)));
    }

    // Validate input scripts against standard script flags.
    const uint32_t scriptVerifyFlags =
        ws.m_next_block_script_verify_flags | STANDARD_SCRIPT_VERIFY_FLAGS;
    ws.m_precomputed_txdata = PrecomputedTransactionData{tx};
    if (!CheckInputScripts(tx, state, m_view, scriptVerifyFlags, true, false,
                           ws.m_precomputed_txdata, ws.m_sig_checks_standard)) {
        // State filled in by CheckInputScripts
        return false;
    }

    entry.reset(new CTxMemPoolEntry(
        ptx, ws.m_base_fees, nAcceptTime,
        heightOverride ? heightOverride : m_active_chainstate.m_chain.Height(),
        fSpendsCoinbase, ws.m_sig_checks_standard, lp));

    ws.m_vsize = entry->GetTxVirtualSize();

    Amount mempoolRejectFee =
        m_pool
            .GetMinFee(
                gArgs.GetIntArg("-maxmempool", DEFAULT_MAX_MEMPOOL_SIZE) *
                1000000)
            .GetFee(ws.m_vsize);
    if (!bypass_limits && mempoolRejectFee > Amount::zero() &&
        ws.m_modified_fees < mempoolRejectFee) {
        return state.Invalid(
            TxValidationResult::TX_MEMPOOL_POLICY, "mempool min fee not met",
            strprintf("%d < %d", ws.m_modified_fees, mempoolRejectFee));
    }

    return true;
}

bool MemPoolAccept::ConsensusScriptChecks(const ATMPArgs &args, Workspace &ws) {
    AssertLockHeld(cs_main);
    AssertLockHeld(m_pool.cs);
    const CTransaction &tx = *ws.m_ptx;
    const TxId &txid = tx.GetId();
    TxValidationState &state = ws.m_state;

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
    if (!CheckInputsFromMempoolAndCache(
            tx, state, m_view, m_pool, ws.m_next_block_script_verify_flags,
            ws.m_precomputed_txdata, nSigChecksConsensus,
            m_active_chainstate.CoinsTip())) {
        // This can occur under some circumstances, if the node receives an
        // unrequested tx which is invalid due to new consensus rules not
        // being activated yet (during IBD).
        LogPrintf("BUG! PLEASE REPORT THIS! CheckInputScripts failed against "
                  "latest-block but not STANDARD flags %s, %s\n",
                  txid.ToString(), state.ToString());
        return Assume(false);
    }

    if (ws.m_sig_checks_standard != nSigChecksConsensus) {
        // We can't accept this transaction as we've used the standard count
        // for the mempool/mining, but the consensus count will be enforced
        // in validation (we don't want to produce bad block templates).
        return error(
            "%s: BUG! PLEASE REPORT THIS! SigChecks count differed between "
            "standard and consensus flags in %s",
            __func__, txid.ToString());
    }
    return true;
}

bool MemPoolAccept::Finalize(const ATMPArgs &args, Workspace &ws) {
    AssertLockHeld(cs_main);
    AssertLockHeld(m_pool.cs);
    const TxId &txid = ws.m_ptx->GetId();
    TxValidationState &state = ws.m_state;
    const bool bypass_limits = args.m_bypass_limits;

    std::unique_ptr<CTxMemPoolEntry> &entry = ws.m_entry;

    // Store transaction in memory.
    m_pool.addUnchecked(*entry);

    // Trim mempool and check if tx was trimmed.
    // If we are validating a package, don't trim here because we could evict a
    // previous transaction in the package. LimitMempoolSize() should be called
    // at the very end to make sure the mempool is still within limits and
    // package submission happens atomically.
    if (!args.m_package_submission && !bypass_limits) {
        m_pool.LimitSize(
            m_active_chainstate.CoinsTip(),
            gArgs.GetIntArg("-maxmempool", DEFAULT_MAX_MEMPOOL_SIZE) * 1000000,
            std::chrono::hours{
                gArgs.GetIntArg("-mempoolexpiry", DEFAULT_MEMPOOL_EXPIRY)});
        if (!m_pool.exists(txid)) {
            return state.Invalid(TxValidationResult::TX_MEMPOOL_POLICY,
                                 "mempool full");
        }
    }
    return true;
}

// Get the coins spent by ptx from the coins_view. Assumes coins are present.
static std::vector<Coin> getSpentCoins(const CTransactionRef &ptx,
                                       const CCoinsViewCache &coins_view) {
    std::vector<Coin> spent_coins;
    spent_coins.reserve(ptx->vin.size());
    for (const CTxIn &input : ptx->vin) {
        Coin coin;
        const bool coinFound = coins_view.GetCoin(input.prevout, coin);
        Assume(coinFound);
        spent_coins.push_back(std::move(coin));
    }
    return spent_coins;
}

bool MemPoolAccept::SubmitPackage(
    const ATMPArgs &args, std::vector<Workspace> &workspaces,
    PackageValidationState &package_state,
    std::map<const TxId, const MempoolAcceptResult> &results) {
    AssertLockHeld(cs_main);
    AssertLockHeld(m_pool.cs);
    // Sanity check: none of the transactions should be in the mempool.
    assert(std::all_of(
        workspaces.cbegin(), workspaces.cend(),
        [this](const auto &ws) { return !m_pool.exists(ws.m_ptx->GetId()); }));

    bool all_submitted = true;
    // ConsensusScriptChecks adds to the script cache and is therefore
    // consensus-critical; CheckInputsFromMempoolAndCache asserts that
    // transactions only spend coins available from the mempool or UTXO set.
    // Submit each transaction to the mempool immediately after calling
    // ConsensusScriptChecks to make the outputs available for subsequent
    // transactions.
    for (Workspace &ws : workspaces) {
        if (!ConsensusScriptChecks(args, ws)) {
            results.emplace(ws.m_ptx->GetId(),
                            MempoolAcceptResult::Failure(ws.m_state));
            // Since PreChecks() passed, this should never fail.
            all_submitted = Assume(false);
        }

        // If we call LimitMempoolSize() for each individual Finalize(), the
        // mempool will not take the transaction's descendant feerate into
        // account because it hasn't seen them yet. Also, we risk evicting a
        // transaction that a subsequent package transaction depends on.
        // Instead, allow the mempool to temporarily bypass limits, the maximum
        // package size) while submitting transactions individually and then
        // trim at the very end.
        if (!Finalize(args, ws)) {
            results.emplace(ws.m_ptx->GetId(),
                            MempoolAcceptResult::Failure(ws.m_state));
            // Since LimitMempoolSize() won't be called, this should never fail.
            all_submitted = Assume(false);
        }
    }

    // It may or may not be the case that all the transactions made it into the
    // mempool. Regardless, make sure we haven't exceeded max mempool size.
    m_pool.LimitSize(
        m_active_chainstate.CoinsTip(),
        gArgs.GetIntArg("-maxmempool", DEFAULT_MAX_MEMPOOL_SIZE) * 1000000,
        std::chrono::hours{
            gArgs.GetIntArg("-mempoolexpiry", DEFAULT_MEMPOOL_EXPIRY)});
    if (!all_submitted) {
        return false;
    }

    // Find the txids of the transactions that made it into the mempool. Allow
    // partial submission, but don't report success unless they all made it into
    // the mempool.
    for (Workspace &ws : workspaces) {
        if (m_pool.exists(ws.m_ptx->GetId())) {
            results.emplace(ws.m_ptx->GetId(), MempoolAcceptResult::Success(
                                                   ws.m_vsize, ws.m_base_fees));
            GetMainSignals().TransactionAddedToMempool(
                ws.m_ptx,
                std::make_shared<const std::vector<Coin>>(
                    getSpentCoins(ws.m_ptx, m_view)),
                m_pool.GetAndIncrementSequence());
        } else {
            all_submitted = false;
            ws.m_state.Invalid(TxValidationResult::TX_MEMPOOL_POLICY,
                               "mempool full");
            results.emplace(ws.m_ptx->GetId(),
                            MempoolAcceptResult::Failure(ws.m_state));
        }
    }
    return all_submitted;
}

MempoolAcceptResult
MemPoolAccept::AcceptSingleTransaction(const CTransactionRef &ptx,
                                       ATMPArgs &args) {
    AssertLockHeld(cs_main);
    // mempool "read lock" (held through
    // GetMainSignals().TransactionAddedToMempool())
    LOCK(m_pool.cs);

    const Consensus::Params &consensusParams =
        args.m_config.GetChainParams().GetConsensus();
    const CBlockIndex *tip = m_active_chainstate.m_chain.Tip();

    Workspace ws(ptx, GetNextBlockScriptFlags(consensusParams, tip));

    // Perform the inexpensive checks first and avoid hashing and signature
    // verification unless those checks pass, to mitigate CPU exhaustion
    // denial-of-service attacks.
    if (!PreChecks(args, ws)) {
        return MempoolAcceptResult::Failure(ws.m_state);
    }

    if (!ConsensusScriptChecks(args, ws)) {
        return MempoolAcceptResult::Failure(ws.m_state);
    }

    const TxId txid = ptx->GetId();

    // Mempool sanity check -- in our new mempool no tx can be added if its
    // outputs are already spent in the mempool (that is, no children before
    // parents allowed; the mempool must be consistent at all times).
    //
    // This means that on reorg, the disconnectpool *must* always import
    // the existing mempool tx's, clear the mempool, and then re-add
    // remaining tx's in topological order via this function. Our new mempool
    // has fast adds, so this is ok.
    if (auto it = m_pool.mapNextTx.lower_bound(COutPoint{txid, 0});
        it != m_pool.mapNextTx.end() && it->first->GetTxId() == txid) {
        LogPrintf("%s: BUG! PLEASE REPORT THIS! Attempt to add txid %s, but "
                  "its outputs are already spent in the "
                  "mempool\n",
                  __func__, txid.ToString());
        ws.m_state.Invalid(TxValidationResult::TX_CONFLICT,
                           "txn-mempool-conflict");
        return MempoolAcceptResult::Failure(ws.m_state);
    }

    // Tx was accepted, but not added
    if (args.m_test_accept) {
        return MempoolAcceptResult::Success(ws.m_vsize, ws.m_base_fees);
    }

    if (!Finalize(args, ws)) {
        return MempoolAcceptResult::Failure(ws.m_state);
    }

    GetMainSignals().TransactionAddedToMempool(
        ptx,
        std::make_shared<const std::vector<Coin>>(getSpentCoins(ptx, m_view)),
        m_pool.GetAndIncrementSequence());

    return MempoolAcceptResult::Success(ws.m_vsize, ws.m_base_fees);
}

PackageMempoolAcceptResult MemPoolAccept::AcceptMultipleTransactions(
    const std::vector<CTransactionRef> &txns, ATMPArgs &args) {
    AssertLockHeld(cs_main);

    // These context-free package limits can be done before taking the mempool
    // lock.
    PackageValidationState package_state;
    if (!CheckPackage(txns, package_state)) {
        return PackageMempoolAcceptResult(package_state, {});
    }

    std::vector<Workspace> workspaces{};
    workspaces.reserve(txns.size());
    std::transform(txns.cbegin(), txns.cend(), std::back_inserter(workspaces),
                   [&args, this](const auto &tx) {
                       return Workspace(
                           tx,
                           GetNextBlockScriptFlags(
                               args.m_config.GetChainParams().GetConsensus(),
                               m_active_chainstate.m_chain.Tip()));
                   });
    std::map<const TxId, const MempoolAcceptResult> results;

    LOCK(m_pool.cs);

    // Do all PreChecks first and fail fast to avoid running expensive script
    // checks when unnecessary.
    for (Workspace &ws : workspaces) {
        if (!PreChecks(args, ws)) {
            package_state.Invalid(PackageValidationResult::PCKG_TX,
                                  "transaction failed");
            // Exit early to avoid doing pointless work. Update the failed tx
            // result; the rest are unfinished.
            results.emplace(ws.m_ptx->GetId(),
                            MempoolAcceptResult::Failure(ws.m_state));
            return PackageMempoolAcceptResult(package_state,
                                              std::move(results));
        }
        // Make the coins created by this transaction available for subsequent
        // transactions in the package to spend.
        m_viewmempool.PackageAddTransaction(ws.m_ptx);
        if (args.m_test_accept) {
            // When test_accept=true, transactions that pass PreChecks
            // are valid because there are no further mempool checks (passing
            // PreChecks implies passing ConsensusScriptChecks).
            results.emplace(ws.m_ptx->GetId(), MempoolAcceptResult::Success(
                                                   ws.m_vsize, ws.m_base_fees));
        }
    }

    if (args.m_test_accept) {
        return PackageMempoolAcceptResult(package_state, std::move(results));
    }

    if (!SubmitPackage(args, workspaces, package_state, results)) {
        package_state.Invalid(PackageValidationResult::PCKG_TX,
                              "submission failed");
        return PackageMempoolAcceptResult(package_state, std::move(results));
    }

    return PackageMempoolAcceptResult(package_state, std::move(results));
}

PackageMempoolAcceptResult MemPoolAccept::AcceptPackage(const Package &package,
                                                        ATMPArgs &args) {
    AssertLockHeld(cs_main);
    PackageValidationState package_state;

    // Check that the package is well-formed. If it isn't, we won't try to
    // validate any of the transactions and thus won't return any
    // MempoolAcceptResults, just a package-wide error.

    // Context-free package checks.
    if (!CheckPackage(package, package_state)) {
        return PackageMempoolAcceptResult(package_state, {});
    }

    // All transactions in the package must be a parent of the last transaction.
    // This is just an opportunity for us to fail fast on a context-free check
    // without taking the mempool lock.
    if (!IsChildWithParents(package)) {
        package_state.Invalid(PackageValidationResult::PCKG_POLICY,
                              "package-not-child-with-parents");
        return PackageMempoolAcceptResult(package_state, {});
    }

    // IsChildWithParents() guarantees the package is > 1 transactions.
    assert(package.size() > 1);
    // The package must be 1 child with all of its unconfirmed parents. The
    // package is expected to be sorted, so the last transaction is the child.
    const auto &child = package.back();
    std::unordered_set<TxId, SaltedTxIdHasher> unconfirmed_parent_txids;
    std::transform(
        package.cbegin(), package.cend() - 1,
        std::inserter(unconfirmed_parent_txids, unconfirmed_parent_txids.end()),
        [](const auto &tx) { return tx->GetId(); });

    // All child inputs must refer to a preceding package transaction or a
    // confirmed UTXO. The only way to verify this is to look up the child's
    // inputs in our current coins view (not including mempool), and enforce
    // that all parents not present in the package be available at chain tip.
    // Since this check can bring new coins into the coins cache, keep track of
    // these coins and uncache them if we don't end up submitting this package
    // to the mempool.
    const CCoinsViewCache &coins_tip_cache = m_active_chainstate.CoinsTip();
    for (const auto &input : child->vin) {
        if (!coins_tip_cache.HaveCoinInCache(input.prevout)) {
            args.m_coins_to_uncache.push_back(input.prevout);
        }
    }
    // Using the MemPoolAccept m_view cache allows us to look up these same
    // coins faster later. This should be connecting directly to CoinsTip, not
    // to m_viewmempool, because we specifically require inputs to be confirmed
    // if they aren't in the package.
    m_view.SetBackend(m_active_chainstate.CoinsTip());
    const auto package_or_confirmed = [this, &unconfirmed_parent_txids](
                                          const auto &input) {
        return unconfirmed_parent_txids.count(input.prevout.GetTxId()) > 0 ||
               m_view.HaveCoin(input.prevout);
    };
    if (!std::all_of(child->vin.cbegin(), child->vin.cend(),
                     package_or_confirmed)) {
        package_state.Invalid(PackageValidationResult::PCKG_POLICY,
                              "package-not-child-with-unconfirmed-parents");
        return PackageMempoolAcceptResult(package_state, {});
    }
    // Protect against bugs where we pull more inputs from disk that miss being
    // added to coins_to_uncache. The backend will be connected again when
    // needed in PreChecks.
    m_view.SetBackend(m_dummy);

    LOCK(m_pool.cs);
    std::map<const TxId, const MempoolAcceptResult> results;
    // Node operators are free to set their mempool policies however they
    // please, nodes may receive transactions in different orders, and malicious
    // counterparties may try to take advantage of policy differences to pin or
    // delay propagation of transactions. As such, it's possible for some
    // package transaction(s) to already be in the mempool, and we don't want to
    // reject the entire package in that case (as that could be a censorship
    // vector). De-duplicate the transactions that are already in the mempool,
    // and only call AcceptMultipleTransactions() with the new transactions.
    // This ensures we don't double-count transaction counts and sizes when
    // checking ancestor/descendant limits, or double-count transaction fees for
    // fee-related policy.
    std::vector<CTransactionRef> txns_new;
    for (const auto &tx : package) {
        const auto &txid = tx->GetId();
        // An already confirmed tx is treated as one not in mempool, because all
        // we know is that the inputs aren't available.
        if (m_pool.exists(txid)) {
            // Exact transaction already exists in the mempool.
            auto iter = m_pool.GetIter(txid);
            assert(iter != std::nullopt);
            results.emplace(
                txid, MempoolAcceptResult::MempoolTx(iter.value()->GetTxSize(),
                                                     iter.value()->GetFee()));
        } else {
            // Transaction does not already exist in the mempool.
            txns_new.push_back(tx);
        }
    }

    // Nothing to do if the entire package has already been submitted.
    if (txns_new.empty()) {
        return PackageMempoolAcceptResult(package_state, std::move(results));
    }
    // Validate the (deduplicated) transactions as a package.
    auto submission_result = AcceptMultipleTransactions(txns_new, args);
    // Include already-in-mempool transaction results in the final result.
    for (const auto &[txid, mempoolaccept_res] : results) {
        submission_result.m_tx_results.emplace(txid, mempoolaccept_res);
    }
    return submission_result;
}
} // namespace

MempoolAcceptResult AcceptToMemoryPool(const Config &config,
                                       Chainstate &active_chainstate,
                                       const CTransactionRef &tx,
                                       int64_t accept_time, bool bypass_limits,
                                       bool test_accept,
                                       unsigned int heightOverride) {
    AssertLockHeld(::cs_main);
    assert(active_chainstate.GetMempool() != nullptr);
    CTxMemPool &pool{*active_chainstate.GetMempool()};

    std::vector<COutPoint> coins_to_uncache;
    auto args = MemPoolAccept::ATMPArgs::SingleAccept(
        config, accept_time, bypass_limits, coins_to_uncache, test_accept,
        heightOverride);
    const MempoolAcceptResult result = MemPoolAccept(pool, active_chainstate)
                                           .AcceptSingleTransaction(tx, args);
    if (result.m_result_type != MempoolAcceptResult::ResultType::VALID) {
        // Remove coins that were not present in the coins cache before calling
        // ATMPW; this is to prevent memory DoS in case we receive a large
        // number of invalid transactions that attempt to overrun the in-memory
        // coins cache
        // (`CCoinsViewCache::cacheCoins`).

        for (const COutPoint &outpoint : coins_to_uncache) {
            active_chainstate.CoinsTip().Uncache(outpoint);
        }
    }

    // After we've (potentially) uncached entries, ensure our coins cache is
    // still within its size limits
    BlockValidationState stateDummy;
    active_chainstate.FlushStateToDisk(stateDummy, FlushStateMode::PERIODIC);
    return result;
}

PackageMempoolAcceptResult
ProcessNewPackage(const Config &config, Chainstate &active_chainstate,
                  CTxMemPool &pool, const Package &package, bool test_accept) {
    AssertLockHeld(cs_main);
    assert(!package.empty());
    assert(std::all_of(package.cbegin(), package.cend(),
                       [](const auto &tx) { return tx != nullptr; }));

    std::vector<COutPoint> coins_to_uncache;
    const auto result = [&]() EXCLUSIVE_LOCKS_REQUIRED(cs_main) {
        AssertLockHeld(cs_main);
        if (test_accept) {
            auto args = MemPoolAccept::ATMPArgs::PackageTestAccept(
                config, GetTime(), coins_to_uncache);
            return MemPoolAccept(pool, active_chainstate)
                .AcceptMultipleTransactions(package, args);
        } else {
            auto args = MemPoolAccept::ATMPArgs::PackageChildWithParents(
                config, GetTime(), coins_to_uncache);
            return MemPoolAccept(pool, active_chainstate)
                .AcceptPackage(package, args);
        }
    }();

    // Uncache coins pertaining to transactions that were not submitted to the
    // mempool.
    if (test_accept || result.m_state.IsInvalid()) {
        for (const COutPoint &hashTx : coins_to_uncache) {
            active_chainstate.CoinsTip().Uncache(hashTx);
        }
    }
    // Ensure the coins cache is still within limits.
    BlockValidationState state_dummy;
    active_chainstate.FlushStateToDisk(state_dummy, FlushStateMode::PERIODIC);
    return result;
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

CoinsViews::CoinsViews(std::string ldb_name, size_t cache_size_bytes,
                       bool in_memory, bool should_wipe)
    : m_dbview(gArgs.GetDataDirNet() / ldb_name, cache_size_bytes, in_memory,
               should_wipe),
      m_catcherview(&m_dbview) {}

void CoinsViews::InitCache() {
    AssertLockHeld(::cs_main);
    m_cacheview = std::make_unique<CCoinsViewCache>(&m_catcherview);
}

Chainstate::Chainstate(CTxMemPool *mempool, BlockManager &blockman,
                       ChainstateManager &chainman,
                       std::optional<BlockHash> from_snapshot_blockhash)
    : m_mempool(mempool), m_blockman(blockman), m_params(::Params()),
      m_chainman(chainman), m_from_snapshot_blockhash(from_snapshot_blockhash) {
}

void Chainstate::InitCoinsDB(size_t cache_size_bytes, bool in_memory,
                             bool should_wipe, std::string leveldb_name) {
    if (m_from_snapshot_blockhash) {
        leveldb_name += node::SNAPSHOT_CHAINSTATE_SUFFIX;
    }
    m_coins_views = std::make_unique<CoinsViews>(leveldb_name, cache_size_bytes,
                                                 in_memory, should_wipe);
}

void Chainstate::InitCoinsCache(size_t cache_size_bytes) {
    AssertLockHeld(::cs_main);
    assert(m_coins_views != nullptr);
    m_coinstip_cache_size_bytes = cache_size_bytes;
    m_coins_views->InitCache();
}

// Note that though this is marked const, we may end up modifying
// `m_cached_finished_ibd`, which is a performance-related implementation
// detail. This function must be marked `const` so that `CValidationInterface`
// clients (which are given a `const Chainstate*`) can call it.
//
bool Chainstate::IsInitialBlockDownload() const {
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
    ReplaceAll(strCmd, "%s", safeStatus);

    std::thread t(runCommand, strCmd);
    // thread runs free
    t.detach();
#endif
}

void Chainstate::CheckForkWarningConditions() {
    AssertLockHeld(cs_main);

    // Before we get past initial download, we cannot reliably alert about forks
    // (we assume we don't get stuck on a fork before finishing our initial
    // sync)
    if (IsInitialBlockDownload()) {
        return;
    }

    // If our best fork is no longer within 72 blocks (+/- 12 hours if no one
    // mines it) of our head, or if it is back on the active chain, drop it
    if (m_best_fork_tip && (m_chain.Height() - m_best_fork_tip->nHeight >= 72 ||
                            m_chain.Contains(m_best_fork_tip))) {
        m_best_fork_tip = nullptr;
    }

    if (m_best_fork_tip ||
        (m_chainman.m_best_invalid &&
         m_chainman.m_best_invalid->nChainWork >
             m_chain.Tip()->nChainWork + (GetBlockProof(*m_chain.Tip()) * 6))) {
        if (!GetfLargeWorkForkFound() && m_best_fork_base) {
            std::string warning =
                std::string("'Warning: Large-work fork detected, forking after "
                            "block ") +
                m_best_fork_base->phashBlock->ToString() + std::string("'");
            AlertNotify(warning);
        }

        if (m_best_fork_tip && m_best_fork_base) {
            LogPrintf("%s: Warning: Large fork found\n  forking the "
                      "chain at height %d (%s)\n  lasting to height %d "
                      "(%s).\nChain state database corruption likely.\n",
                      __func__, m_best_fork_base->nHeight,
                      m_best_fork_base->phashBlock->ToString(),
                      m_best_fork_tip->nHeight,
                      m_best_fork_tip->phashBlock->ToString());
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

void Chainstate::CheckForkWarningConditionsOnNewFork(
    CBlockIndex *pindexNewForkTip) {
    AssertLockHeld(cs_main);

    // If we are on a fork that is sufficiently large, set a warning flag.
    const CBlockIndex *pfork = m_chain.FindFork(pindexNewForkTip);

    // We define a condition where we should warn the user about as a fork of at
    // least 7 blocks with a tip within 72 blocks (+/- 12 hours if no one mines
    // it) of ours. We use 7 blocks rather arbitrarily as it represents just
    // under 10% of sustained network hash rate operating on the fork, or a
    // chain that is entirely longer than ours and invalid (note that this
    // should be detected by both). We define it this way because it allows us
    // to only store the highest fork tip (+ base) which meets the 7-block
    // condition and from this always have the most-likely-to-cause-warning fork
    if (pfork &&
        (!m_best_fork_tip ||
         pindexNewForkTip->nHeight > m_best_fork_tip->nHeight) &&
        pindexNewForkTip->nChainWork - pfork->nChainWork >
            (GetBlockProof(*pfork) * 7) &&
        m_chain.Height() - pindexNewForkTip->nHeight < 72) {
        m_best_fork_tip = pindexNewForkTip;
        m_best_fork_base = pfork;
    }

    CheckForkWarningConditions();
}

// Called both upon regular invalid block discovery *and* InvalidateBlock
void Chainstate::InvalidChainFound(CBlockIndex *pindexNew) {
    AssertLockHeld(cs_main);
    if (!m_chainman.m_best_invalid ||
        pindexNew->nChainWork > m_chainman.m_best_invalid->nChainWork) {
        m_chainman.m_best_invalid = pindexNew;
    }
    if (m_chainman.m_best_header != nullptr &&
        m_chainman.m_best_header->GetAncestor(pindexNew->nHeight) ==
            pindexNew) {
        m_chainman.m_best_header = m_chain.Tip();
    }

    // If the invalid chain found is supposed to be finalized, we need to move
    // back the finalization point.
    if (IsBlockAvalancheFinalized(pindexNew)) {
        LOCK(cs_avalancheFinalizedBlockIndex);
        m_avalancheFinalizedBlockIndex = pindexNew->pprev;
    }

    LogPrintf("%s: invalid block=%s  height=%d  log2_work=%f  date=%s\n",
              __func__, pindexNew->GetBlockHash().ToString(),
              pindexNew->nHeight,
              log(pindexNew->nChainWork.getdouble()) / log(2.0),
              FormatISO8601DateTime(pindexNew->GetBlockTime()));
    CBlockIndex *tip = m_chain.Tip();
    assert(tip);
    LogPrintf("%s:  current best=%s  height=%d  log2_work=%f  date=%s\n",
              __func__, tip->GetBlockHash().ToString(), m_chain.Height(),
              log(tip->nChainWork.getdouble()) / log(2.0),
              FormatISO8601DateTime(tip->GetBlockTime()));
}

// Same as InvalidChainFound, above, except not called directly from
// InvalidateBlock, which does its own setBlockIndexCandidates management.
void Chainstate::InvalidBlockFound(CBlockIndex *pindex,
                                   const BlockValidationState &state) {
    AssertLockHeld(cs_main);
    if (state.GetResult() != BlockValidationResult::BLOCK_MUTATED) {
        pindex->nStatus = pindex->nStatus.withFailed();
        m_chainman.m_failed_blocks.insert(pindex);
        m_blockman.m_dirty_blockindex.insert(pindex);
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

bool CheckInputScripts(const CTransaction &tx, TxValidationState &state,
                       const CCoinsViewCache &inputs, const uint32_t flags,
                       bool sigCacheStore, bool scriptCacheStore,
                       const PrecomputedTransactionData &txdata,
                       int &nSigChecksOut, TxSigCheckLimiter &txLimitSigChecks,
                       CheckInputsLimiter *pBlockLimitSigChecks,
                       std::vector<CScriptCheck> *pvChecks) {
    AssertLockHeld(cs_main);
    assert(!tx.IsCoinBase());

    if (pvChecks) {
        pvChecks->reserve(tx.vin.size());
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
                                 "too-many-sigchecks");
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

        // If pvChecks is not null, defer the check execution to the caller.
        if (pvChecks) {
            pvChecks->push_back(std::move(check));
            continue;
        }

        if (!check()) {
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
                        TxValidationResult::TX_NOT_STANDARD,
                        strprintf("non-mandatory-script-verify-flag (%s)",
                                  ScriptErrorString(scriptError)));
                }
                // update the error message to reflect the mandatory violation.
                scriptError = check2.GetScriptError();
            }

            // MANDATORY flag failures correspond to
            // TxValidationResult::TX_CONSENSUS. Because CONSENSUS failures are
            // the most serious case of validation failures, we may need to
            // consider using RECENT_CONSENSUS_CHANGE for any script failure
            // that could be due to non-upgraded nodes which we may want to
            // support, to avoid splitting the network (but this depends on the
            // details of how net_processing handles such errors).
            return state.Invalid(
                TxValidationResult::TX_CONSENSUS,
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

bool AbortNode(BlockValidationState &state, const std::string &strMessage,
               const bilingual_str &userMessage) {
    AbortNode(strMessage, userMessage);
    return state.Error(strMessage);
}

/** Restore the UTXO in a Coin at a given COutPoint. */
DisconnectResult UndoCoinSpend(Coin &&undo, CCoinsViewCache &view,
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

    // If the coin already exists as an unspent coin in the cache, then the
    // possible_overwrite parameter to AddCoin must be set to true. We have
    // already checked whether an unspent coin exists above using HaveCoin, so
    // we don't need to guess. When fClean is false, an unspent coin already
    // existed and it is an overwrite.
    view.AddCoin(out, std::move(undo), !fClean);

    return fClean ? DisconnectResult::OK : DisconnectResult::UNCLEAN;
}

/**
 * Undo the effects of this block (with given index) on the UTXO set represented
 * by coins. When FAILED is returned, view is left in an indeterminate state.
 */
DisconnectResult Chainstate::DisconnectBlock(const CBlock &block,
                                             const CBlockIndex *pindex,
                                             CCoinsViewCache &view) {
    AssertLockHeld(::cs_main);
    CBlockUndo blockUndo;
    if (!UndoReadFromDisk(blockUndo, pindex)) {
        error("DisconnectBlock(): failure reading undo data");
        return DisconnectResult::FAILED;
    }

    return ApplyBlockUndo(std::move(blockUndo), block, pindex, view);
}

DisconnectResult ApplyBlockUndo(CBlockUndo &&blockUndo, const CBlock &block,
                                const CBlockIndex *pindex,
                                CCoinsViewCache &view) {
    bool fClean = true;

    if (blockUndo.vtxundo.size() + 1 != block.vtx.size()) {
        error("DisconnectBlock(): block and undo data inconsistent");
        return DisconnectResult::FAILED;
    }

    // First, restore inputs.
    for (size_t i = 1; i < block.vtx.size(); i++) {
        const CTransaction &tx = *(block.vtx[i]);
        CTxUndo &txundo = blockUndo.vtxundo[i - 1];
        if (txundo.vprevout.size() != tx.vin.size()) {
            error("DisconnectBlock(): transaction and undo data inconsistent");
            return DisconnectResult::FAILED;
        }

        for (size_t j = 0; j < tx.vin.size(); j++) {
            const COutPoint &out = tx.vin[j].prevout;
            DisconnectResult res =
                UndoCoinSpend(std::move(txundo.vprevout[j]), view, out);
            if (res == DisconnectResult::FAILED) {
                return DisconnectResult::FAILED;
            }
            fClean = fClean && res != DisconnectResult::UNCLEAN;
        }
        // At this point, all of txundo.vprevout should have been moved out.
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

static CCheckQueue<CScriptCheck> scriptcheckqueue(128);

void StartScriptCheckWorkerThreads(int threads_num) {
    scriptcheckqueue.StartWorkerThreads(threads_num);
}

void StopScriptCheckWorkerThreads() {
    scriptcheckqueue.StopWorkerThreads();
}

// Returns the script flags which should be checked for the block after
// the given block.
static uint32_t GetNextBlockScriptFlags(const Consensus::Params &params,
                                        const CBlockIndex *pindex) {
    uint32_t flags = SCRIPT_VERIFY_NONE;

    // Enforce P2SH (BIP16)
    if (DeploymentActiveAfter(pindex, params, Consensus::DEPLOYMENT_P2SH)) {
        flags |= SCRIPT_VERIFY_P2SH;
    }

    // Enforce the DERSIG (BIP66) rule.
    if (DeploymentActiveAfter(pindex, params, Consensus::DEPLOYMENT_DERSIG)) {
        flags |= SCRIPT_VERIFY_DERSIG;
    }

    // Start enforcing CHECKLOCKTIMEVERIFY (BIP65) rule.
    if (DeploymentActiveAfter(pindex, params, Consensus::DEPLOYMENT_CLTV)) {
        flags |= SCRIPT_VERIFY_CHECKLOCKTIMEVERIFY;
    }

    // Start enforcing CSV (BIP68, BIP112 and BIP113) rule.
    if (DeploymentActiveAfter(pindex, params, Consensus::DEPLOYMENT_CSV)) {
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
static int64_t nTimeTotal = 0;
static int64_t nBlocksTotal = 0;

/**
 * Apply the effects of this block (with given index) on the UTXO set
 * represented by coins. Validity checks that depend on the UTXO set are also
 * done; ConnectBlock() can fail if those validity checks fail (among other
 * reasons).
 */
bool Chainstate::ConnectBlock(const CBlock &block, BlockValidationState &state,
                              CBlockIndex *pindex, CCoinsViewCache &view,
                              BlockValidationOptions options, Amount *blockFees,
                              bool fJustCheck) {
    AssertLockHeld(cs_main);
    assert(pindex);

    const BlockHash block_hash{block.GetHash()};
    assert(*pindex->phashBlock == block_hash);

    int64_t nTimeStart = GetTimeMicros();

    const Consensus::Params &consensusParams = m_params.GetConsensus();

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
                     state.ToString());
    }

    // Verify that the view's current state corresponds to the previous block
    BlockHash hashPrevBlock =
        pindex->pprev == nullptr ? BlockHash() : pindex->pprev->GetBlockHash();
    assert(hashPrevBlock == view.GetBestBlock());

    nBlocksTotal++;

    // Special case for the genesis block, skipping connection of its
    // transactions (its coinbase is unspendable)
    if (block_hash == consensusParams.hashGenesisBlock) {
        if (!fJustCheck) {
            view.SetBestBlock(pindex->GetBlockHash());
        }

        return true;
    }

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
            if (it->second.GetAncestor(pindex->nHeight) == pindex &&
                m_chainman.m_best_header->GetAncestor(pindex->nHeight) ==
                    pindex &&
                m_chainman.m_best_header->nChainWork >= nMinimumChainWork) {
                // This block is a member of the assumed verified chain and an
                // ancestor of the best header.
                // Script verification is skipped when connecting blocks under
                // the assumevalid block. Assuming the assumevalid block is
                // valid this is safe because block merkle hashes are still
                // computed and checked, Of course, if an assumed valid block is
                // invalid due to false scriptSigs this optimization would allow
                // an invalid chain to be accepted.
                // The equivalent time check discourages hash power from
                // extorting the network via DOS attack into accepting an
                // invalid block through telling users they must manually set
                // assumevalid. Requiring a software change or burying the
                // invalid block, regardless of the setting, makes it hard to
                // hide the implication of the demand. This also avoids having
                // release candidates that are hardly doing any signature
                // verification at all in testing without having to artificially
                // set the default assumed verified block further back. The test
                // against nMinimumChainWork prevents the skipping when denied
                // access to any chain at least as good as the expected chain.
                fScriptChecks = (GetBlockProofEquivalentTime(
                                     *m_chainman.m_best_header, *pindex,
                                     *m_chainman.m_best_header,
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
    // even after being sent to another address.
    // See BIP30, CVE-2012-1909, and http://r6.ca/blog/20120206T005236Z.html
    // for more information. This rule was originally applied to all blocks
    // with a timestamp after March 15, 2012, 0:00 UTC. Now that the whole
    // chain is irreversibly beyond that time it is applied to all blocks
    // except the two in the chain that violate it. This prevents exploiting
    // the issue against nodes during their initial block download.
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

    // BIP34 requires that a block at height X (block X) has its coinbase
    // scriptSig start with a CScriptNum of X (indicated height X).  The above
    // logic of no longer requiring BIP30 once BIP34 activates is flawed in the
    // case that there is a block X before the BIP34 height of 227,931 which has
    // an indicated height Y where Y is greater than X.  The coinbase for block
    // X would also be a valid coinbase for block Y, which could be a BIP30
    // violation.  An exhaustive search of all mainnet coinbases before the
    // BIP34 height which have an indicated height greater than the block height
    // reveals many occurrences. The 3 lowest indicated heights found are
    // 209,921, 490,897, and 1,983,702 and thus coinbases for blocks at these 3
    // heights would be the first opportunity for BIP30 to be violated.

    // The search reveals a great many blocks which have an indicated height
    // greater than 1,983,702, so we simply remove the optimization to skip
    // BIP30 checking for blocks at height 1,983,702 or higher.  Before we reach
    // that block in another 25 years or so, we should take advantage of a
    // future consensus change to do a new and improved version of BIP34 that
    // will actually prevent ever creating any duplicate coinbases in the
    // future.
    static constexpr int BIP34_IMPLIES_BIP30_LIMIT = 1983702;

    // There is no potential to create a duplicate coinbase at block 209,921
    // because this is still before the BIP34 height and so explicit BIP30
    // checking is still active.

    // The final case is block 176,684 which has an indicated height of
    // 490,897. Unfortunately, this issue was not discovered until about 2 weeks
    // before block 490,897 so there was not much opportunity to address this
    // case other than to carefully analyze it and determine it would not be a
    // problem. Block 490,897 was, in fact, mined with a different coinbase than
    // block 176,684, but it is important to note that even if it hadn't been or
    // is remined on an alternate fork with a duplicate coinbase, we would still
    // not run into a BIP30 violation.  This is because the coinbase for 176,684
    // is spent in block 185,956 in transaction
    // d4f7fbbf92f4a3014a230b2dc70b8058d02eb36ac06b4a0736d9d60eaa9e8781.  This
    // spending transaction can't be duplicated because it also spends coinbase
    // 0328dd85c331237f18e781d692c92de57649529bd5edf1d01036daea32ffde29.  This
    // coinbase has an indicated height of over 4.2 billion, and wouldn't be
    // duplicatable until that height, and it's currently impossible to create a
    // chain that long. Nevertheless we may wish to consider a future soft fork
    // which retroactively prevents block 490,897 from creating a duplicate
    // coinbase. The two historical BIP30 violations often provide a confusing
    // edge case when manipulating the UTXO and it would be simpler not to have
    // another edge case to deal with.

    // testnet3 has no blocks before the BIP34 height with indicated heights
    // post BIP34 before approximately height 486,000,000 and presumably will
    // be reset before it reaches block 1,983,702 and starts doing unnecessary
    // BIP30 checking again.
    assert(pindex->pprev);
    CBlockIndex *pindexBIP34height =
        pindex->pprev->GetAncestor(consensusParams.BIP34Height);
    // Only continue to enforce if we're below BIP34 activation height or the
    // block hash at that height doesn't correspond.
    fEnforceBIP30 =
        fEnforceBIP30 &&
        (!pindexBIP34height ||
         !(pindexBIP34height->GetBlockHash() == consensusParams.BIP34Hash));

    // TODO: Remove BIP30 checking from block height 1,983,702 on, once we have
    // a consensus change that ensures coinbases at those heights can not
    // duplicate earlier coinbases.
    if (fEnforceBIP30 || pindex->nHeight >= BIP34_IMPLIES_BIP30_LIMIT) {
        for (const auto &tx : block.vtx) {
            for (size_t o = 0; o < tx->vout.size(); o++) {
                if (view.HaveCoin(COutPoint(tx->GetId(), o))) {
                    LogPrintf("ERROR: ConnectBlock(): tried to overwrite "
                              "transaction\n");
                    return state.Invalid(BlockValidationResult::BLOCK_CONSENSUS,
                                         "bad-txns-BIP30");
                }
            }
        }
    }

    // Enforce BIP68 (sequence locks).
    int nLockTimeFlags = 0;
    if (DeploymentActiveAt(*pindex, consensusParams,
                           Consensus::DEPLOYMENT_CSV)) {
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
                             "tx-duplicate");
    }

    size_t txIndex = 0;
    // nSigChecksRet may be accurate (found in cache) or 0 (checks were
    // deferred into vChecks).
    int nSigChecksRet;
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
                              tx_state.GetRejectReason(),
                              tx_state.GetDebugMessage());

                return error("%s: Consensus::CheckTxInputs: %s, %s", __func__,
                             tx.GetId().ToString(), state.ToString());
            }
            nFees += txfee;
        }

        if (!MoneyRange(nFees)) {
            LogPrintf("ERROR: %s: accumulated fee in the block out of range.\n",
                      __func__);
            return state.Invalid(BlockValidationResult::BLOCK_CONSENSUS,
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

        if (!SequenceLocks(tx, nLockTimeFlags, prevheights, *pindex)) {
            LogPrintf("ERROR: %s: contains a non-BIP68-final transaction\n",
                      __func__);
            return state.Invalid(BlockValidationResult::BLOCK_CONSENSUS,
                                 "bad-txns-nonfinal");
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
        TxValidationState tx_state;
        if (fScriptChecks &&
            !CheckInputScripts(tx, tx_state, view, flags, fCacheResults,
                               fCacheResults, PrecomputedTransactionData(tx),
                               nSigChecksRet, nSigChecksTxLimiters[txIndex],
                               &nSigChecksBlockLimiter, &vChecks)) {
            // Any transaction validation failure in ConnectBlock is a block
            // consensus failure
            state.Invalid(BlockValidationResult::BLOCK_CONSENSUS,
                          tx_state.GetRejectReason(),
                          tx_state.GetDebugMessage());
            return error(
                "ConnectBlock(): CheckInputScripts on %s failed with %s",
                tx.GetId().ToString(), state.ToString());
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

    const Amount blockReward =
        nFees + GetBlockSubsidy(pindex->nHeight, consensusParams);
    if (block.vtx[0]->GetValueOut() > blockReward) {
        LogPrintf("ERROR: ConnectBlock(): coinbase pays too much (actual=%d vs "
                  "limit=%d)\n",
                  block.vtx[0]->GetValueOut(), blockReward);
        return state.Invalid(BlockValidationResult::BLOCK_CONSENSUS,
                             "bad-cb-amount");
    }

    if (blockFees) {
        *blockFees = nFees;
    }

    if (!control.Wait()) {
        return state.Invalid(BlockValidationResult::BLOCK_CONSENSUS,
                             "blk-bad-inputs", "parallel script check failed");
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

    if (!m_blockman.WriteUndoDataForBlock(blockundo, state, pindex, m_params)) {
        return false;
    }

    if (!pindex->IsValid(BlockValidity::SCRIPTS)) {
        pindex->RaiseValidity(BlockValidity::SCRIPTS);
        m_blockman.m_dirty_blockindex.insert(pindex);
    }

    assert(pindex->phashBlock);
    // add this block to the view's block chain
    view.SetBestBlock(pindex->GetBlockHash());

    int64_t nTime5 = GetTimeMicros();
    nTimeIndex += nTime5 - nTime4;
    LogPrint(BCLog::BENCH, "    - Index writing: %.2fms [%.2fs (%.2fms/blk)]\n",
             MILLI * (nTime5 - nTime4), nTimeIndex * MICRO,
             nTimeIndex * MILLI / nBlocksTotal);

    TRACE6(validation, block_connected, block_hash.data(), pindex->nHeight,
           block.vtx.size(), nInputs, nSigChecksRet,
           // in microseconds (µs)
           nTime5 - nTimeStart);

    return true;
}

CoinsCacheSizeState Chainstate::GetCoinsCacheSizeState() {
    AssertLockHeld(::cs_main);
    return this->GetCoinsCacheSizeState(
        m_coinstip_cache_size_bytes,
        gArgs.GetIntArg("-maxmempool", DEFAULT_MAX_MEMPOOL_SIZE) * 1000000);
}

CoinsCacheSizeState
Chainstate::GetCoinsCacheSizeState(size_t max_coins_cache_size_bytes,
                                   size_t max_mempool_size_bytes) {
    AssertLockHeld(::cs_main);
    int64_t nMempoolUsage = m_mempool ? m_mempool->DynamicMemoryUsage() : 0;
    int64_t cacheSize = CoinsTip().DynamicMemoryUsage();
    int64_t nTotalSpace =
        max_coins_cache_size_bytes +
        std::max<int64_t>(int64_t(max_mempool_size_bytes) - nMempoolUsage, 0);

    //! No need to periodic flush if at least this much space still available.
    static constexpr int64_t MAX_BLOCK_COINSDB_USAGE_BYTES =
        10 * 1024 * 1024; // 10MB
    int64_t large_threshold = std::max(
        (9 * nTotalSpace) / 10, nTotalSpace - MAX_BLOCK_COINSDB_USAGE_BYTES);

    if (cacheSize > nTotalSpace) {
        LogPrintf("Cache size (%s) exceeds total space (%s)\n", cacheSize,
                  nTotalSpace);
        return CoinsCacheSizeState::CRITICAL;
    } else if (cacheSize > large_threshold) {
        return CoinsCacheSizeState::LARGE;
    }
    return CoinsCacheSizeState::OK;
}

bool Chainstate::FlushStateToDisk(BlockValidationState &state,
                                  FlushStateMode mode, int nManualPruneHeight) {
    LOCK(cs_main);
    assert(this->CanFlushToDisk());
    static std::chrono::microseconds nLastWrite{0};
    static std::chrono::microseconds nLastFlush{0};
    std::set<int> setFilesToPrune;
    bool full_flush_completed = false;

    const size_t coins_count = CoinsTip().GetCacheSize();
    const size_t coins_mem_usage = CoinsTip().DynamicMemoryUsage();

    try {
        {
            bool fFlushForPrune = false;
            bool fDoFullFlush = false;

            CoinsCacheSizeState cache_state = GetCoinsCacheSizeState();
            LOCK(m_blockman.cs_LastBlockFile);
            if (fPruneMode &&
                (m_blockman.m_check_for_pruning || nManualPruneHeight > 0) &&
                !fReindex) {
                // Make sure we don't prune above the blockfilterindexes
                // bestblocks. Pruning is height-based.
                int last_prune = m_chain.Height();
                ForEachBlockFilterIndex([&](BlockFilterIndex &index) {
                    last_prune = std::max(
                        1, std::min(last_prune,
                                    index.GetSummary().best_block_height));
                });

                if (nManualPruneHeight > 0) {
                    LOG_TIME_MILLIS_WITH_CATEGORY(
                        "find files to prune (manual)", BCLog::BENCH);
                    m_blockman.FindFilesToPruneManual(
                        setFilesToPrune,
                        std::min(last_prune, nManualPruneHeight),
                        m_chain.Height());
                } else {
                    LOG_TIME_MILLIS_WITH_CATEGORY("find files to prune",
                                                  BCLog::BENCH);
                    m_blockman.FindFilesToPrune(
                        setFilesToPrune, m_params.PruneAfterHeight(),
                        m_chain.Height(), last_prune, IsInitialBlockDownload());
                    m_blockman.m_check_for_pruning = false;
                }
                if (!setFilesToPrune.empty()) {
                    fFlushForPrune = true;
                    if (!m_blockman.m_have_pruned) {
                        m_blockman.m_block_tree_db->WriteFlag(
                            "prunedblockfiles", true);
                        m_blockman.m_have_pruned = true;
                    }
                }
            }
            const auto nNow = GetTime<std::chrono::microseconds>();
            // Avoid writing/flushing immediately after startup.
            if (nLastWrite.count() == 0) {
                nLastWrite = nNow;
            }
            if (nLastFlush.count() == 0) {
                nLastFlush = nNow;
            }
            // The cache is large and we're within 10% and 10 MiB of the limit,
            // but we have time now (not in the middle of a block processing).
            bool fCacheLarge = mode == FlushStateMode::PERIODIC &&
                               cache_state >= CoinsCacheSizeState::LARGE;
            // The cache is over the limit, we have to write now.
            bool fCacheCritical = mode == FlushStateMode::IF_NEEDED &&
                                  cache_state >= CoinsCacheSizeState::CRITICAL;
            // It's been a while since we wrote the block index to disk. Do this
            // frequently, so we don't need to redownload after a crash.
            bool fPeriodicWrite = mode == FlushStateMode::PERIODIC &&
                                  nNow > nLastWrite + DATABASE_WRITE_INTERVAL;
            // It's been very long since we flushed the cache. Do this
            // infrequently, to optimize cache usage.
            bool fPeriodicFlush = mode == FlushStateMode::PERIODIC &&
                                  nNow > nLastFlush + DATABASE_FLUSH_INTERVAL;
            // Combine all conditions that result in a full cache flush.
            fDoFullFlush = (mode == FlushStateMode::ALWAYS) || fCacheLarge ||
                           fCacheCritical || fPeriodicFlush || fFlushForPrune;
            // Write blocks and block index to disk.
            if (fDoFullFlush || fPeriodicWrite) {
                // Ensure we can write block index
                if (!CheckDiskSpace(gArgs.GetBlocksDirPath())) {
                    return AbortNode(state, "Disk space is too low!",
                                     _("Disk space is too low!"));
                }

                {
                    LOG_TIME_MILLIS_WITH_CATEGORY(
                        "write block and undo data to disk", BCLog::BENCH);

                    // First make sure all block and undo data is flushed to
                    // disk.
                    m_blockman.FlushBlockFile();
                }
                // Then update all block file information (which may refer to
                // block and undo files).
                {
                    LOG_TIME_MILLIS_WITH_CATEGORY("write block index to disk",
                                                  BCLog::BENCH);

                    if (!m_blockman.WriteBlockIndexDB()) {
                        return AbortNode(
                            state, "Failed to write to block index database");
                    }
                }

                // Finally remove any pruned files
                if (fFlushForPrune) {
                    LOG_TIME_MILLIS_WITH_CATEGORY("unlink pruned files",
                                                  BCLog::BENCH);

                    UnlinkPrunedFiles(setFilesToPrune);
                }
                nLastWrite = nNow;
            }
            // Flush best chain related state. This can only be done if the
            // blocks / block index write was also done.
            if (fDoFullFlush && !CoinsTip().GetBestBlock().IsNull()) {
                LOG_TIME_MILLIS_WITH_CATEGORY(
                    strprintf("write coins cache to disk (%d coins, %.2fkB)",
                              coins_count, coins_mem_usage / 1000),
                    BCLog::BENCH);

                // Typical Coin structures on disk are around 48 bytes in size.
                // Pushing a new one to the database can cause it to be written
                // twice (once in the log, and once in the tables). This is
                // already an overestimation, as most will delete an existing
                // entry or overwrite one. Still, use a conservative safety
                // factor of 2.
                if (!CheckDiskSpace(gArgs.GetDataDirNet(),
                                    48 * 2 * 2 * CoinsTip().GetCacheSize())) {
                    return AbortNode(state, "Disk space is too low!",
                                     _("Disk space is too low!"));
                }

                // Flush the chainstate (which may refer to block index
                // entries).
                if (!CoinsTip().Flush()) {
                    return AbortNode(state, "Failed to write to coin database");
                }
                nLastFlush = nNow;
                full_flush_completed = true;
            }

            TRACE5(utxocache, flush,
                   // in microseconds (µs)
                   GetTimeMicros() - nNow.count(), uint32_t(mode), coins_count,
                   uint64_t(coins_mem_usage), fFlushForPrune);
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

void Chainstate::ForceFlushStateToDisk() {
    BlockValidationState state;
    if (!this->FlushStateToDisk(state, FlushStateMode::ALWAYS)) {
        LogPrintf("%s: failed to flush state (%s)\n", __func__,
                  state.ToString());
    }
}

void Chainstate::PruneAndFlush() {
    BlockValidationState state;
    m_blockman.m_check_for_pruning = true;
    if (!this->FlushStateToDisk(state, FlushStateMode::NONE)) {
        LogPrintf("%s: failed to flush state (%s)\n", __func__,
                  state.ToString());
    }
}

static void UpdateTipLog(const CCoinsViewCache &coins_tip,
                         const CBlockIndex *tip, const CChainParams &params,
                         const std::string &func_name,
                         const std::string &prefix)
    EXCLUSIVE_LOCKS_REQUIRED(::cs_main) {
    AssertLockHeld(::cs_main);
    LogPrintf("%s%s: new best=%s height=%d version=0x%08x log2_work=%f tx=%ld "
              "date='%s' progress=%f cache=%.1fMiB(%utxo)\n",
              prefix, func_name, tip->GetBlockHash().ToString(), tip->nHeight,
              tip->nVersion, log(tip->nChainWork.getdouble()) / log(2.0),
              tip->GetChainTxCount(),
              FormatISO8601DateTime(tip->GetBlockTime()),
              GuessVerificationProgress(params.TxData(), tip),
              coins_tip.DynamicMemoryUsage() * (1.0 / (1 << 20)),
              coins_tip.GetCacheSize());
}

void Chainstate::UpdateTip(const CBlockIndex *pindexNew) {
    AssertLockHeld(::cs_main);
    const auto &coins_tip = CoinsTip();

    // The remainder of the function isn't relevant if we are not acting on
    // the active chainstate, so return if need be.
    if (this != &m_chainman.ActiveChainstate()) {
        // Only log every so often so that we don't bury log messages at the
        // tip.
        constexpr int BACKGROUND_LOG_INTERVAL = 2000;
        if (pindexNew->nHeight % BACKGROUND_LOG_INTERVAL == 0) {
            UpdateTipLog(coins_tip, pindexNew, m_params, __func__,
                         "[background validation] ");
        }
        return;
    }

    // New best block
    if (m_mempool) {
        m_mempool->AddTransactionsUpdated(1);
    }

    {
        LOCK(g_best_block_mutex);
        g_best_block = pindexNew->GetBlockHash();
        g_best_block_cv.notify_all();
    }

    UpdateTipLog(coins_tip, pindexNew, m_params, __func__, "");
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
bool Chainstate::DisconnectTip(BlockValidationState &state,
                               DisconnectedBlockTransactions *disconnectpool) {
    AssertLockHeld(cs_main);
    if (m_mempool) {
        AssertLockHeld(m_mempool->cs);
    }

    CBlockIndex *pindexDelete = m_chain.Tip();
    const Consensus::Params &consensusParams = m_params.GetConsensus();

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
        CCoinsViewCache view(&CoinsTip());
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
    if (!FlushStateToDisk(state, FlushStateMode::IF_NEEDED)) {
        return false;
    }

    if (m_mempool) {
        // If this block is deactivating a fork, we move all mempool
        // transactions in front of disconnectpool for reprocessing in a future
        // updateMempoolForReorg call
        if (pindexDelete->pprev != nullptr &&
            GetNextBlockScriptFlags(consensusParams, pindexDelete) !=
                GetNextBlockScriptFlags(consensusParams, pindexDelete->pprev)) {
            LogPrint(BCLog::MEMPOOL,
                     "Disconnecting mempool due to rewind of upgrade block\n");
            if (disconnectpool) {
                disconnectpool->importMempool(*m_mempool);
            }
            m_mempool->clear();
        }

        if (disconnectpool) {
            disconnectpool->addForBlock(block.vtx, *m_mempool);
        }
    }

    m_chain.SetTip(pindexDelete->pprev);

    UpdateTip(pindexDelete->pprev);
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
    PerBlockConnectTrace() {}
};

/**
 * Used to track blocks whose transactions were applied to the UTXO state as a
 * part of a single ActivateBestChainStep call.
 *
 * This class is single-use, once you call GetBlocksConnected() you have to
 * throw it away and make a new one.
 */
class ConnectTrace {
private:
    std::vector<PerBlockConnectTrace> blocksConnected;

public:
    explicit ConnectTrace() : blocksConnected(1) {}

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
        blocksConnected.pop_back();
        return blocksConnected;
    }
};

/**
 * Connect a new block to m_chain. pblock is either nullptr or a pointer to
 * a CBlock corresponding to pindexNew, to bypass loading it again from disk.
 *
 * The block is added to connectTrace if connection succeeds.
 */
bool Chainstate::ConnectTip(const Config &config, BlockValidationState &state,
                            BlockPolicyValidationState &blockPolicyState,
                            CBlockIndex *pindexNew,
                            const std::shared_ptr<const CBlock> &pblock,
                            ConnectTrace &connectTrace,
                            DisconnectedBlockTransactions &disconnectpool) {
    AssertLockHeld(cs_main);
    if (m_mempool) {
        AssertLockHeld(m_mempool->cs);
    }

    const Consensus::Params &consensusParams = m_params.GetConsensus();

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
        Amount blockFees{Amount::zero()};
        CCoinsViewCache view(&CoinsTip());
        bool rv = ConnectBlock(blockConnecting, state, pindexNew, view,
                               BlockValidationOptions(config), &blockFees);
        GetMainSignals().BlockChecked(blockConnecting, state);
        if (!rv) {
            if (state.IsInvalid()) {
                InvalidBlockFound(pindexNew, state);
            }

            return error("%s: ConnectBlock %s failed, %s", __func__,
                         pindexNew->GetBlockHash().ToString(),
                         state.ToString());
        }

        /**
         * The block is valid by consensus rules so now we check if the block
         * passes all block policy checks. If not, then park the block and bail.
         *
         * We check block parking policies before flushing changes to the UTXO
         * set. This allows us to avoid rewinding everything immediately after.
         *
         * Only check block parking policies the first time the block is
         * connected. Avalanche voting can override the parking decision made by
         * these policies.
         */
        const BlockHash blockhash = pindexNew->GetBlockHash();
        if (!IsInitialBlockDownload() &&
            !m_filterParkingPoliciesApplied.contains(blockhash)) {
            m_filterParkingPoliciesApplied.insert(blockhash);

            const Amount blockReward =
                blockFees +
                GetBlockSubsidy(pindexNew->nHeight, consensusParams);

            std::vector<std::unique_ptr<ParkingPolicy>> parkingPolicies;
            parkingPolicies.emplace_back(std::make_unique<MinerFundPolicy>(
                consensusParams, *pindexNew, blockConnecting, blockReward));

            if (g_avalanche) {
                parkingPolicies.emplace_back(
                    std::make_unique<StakingRewardsPolicy>(
                        consensusParams, *pindexNew, blockConnecting,
                        blockReward));
            }

            // If any block policy is violated, bail on the first one found
            if (std::find_if_not(parkingPolicies.begin(), parkingPolicies.end(),
                                 [&](const auto &policy) {
                                     bool ret = (*policy)(blockPolicyState);
                                     if (!ret) {
                                         LogPrintf(
                                             "Park block because it "
                                             "violated a block policy: %s\n",
                                             blockPolicyState.ToString());
                                     }
                                     return ret;
                                 }) != parkingPolicies.end()) {
                pindexNew->nStatus = pindexNew->nStatus.withParked();
                m_blockman.m_dirty_blockindex.insert(pindexNew);
                return false;
            }
        }

        nTime3 = GetTimeMicros();
        nTimeConnectTotal += nTime3 - nTime2;
        assert(nBlocksTotal > 0);
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
    if (!FlushStateToDisk(state, FlushStateMode::IF_NEEDED)) {
        return false;
    }

    int64_t nTime5 = GetTimeMicros();
    nTimeChainState += nTime5 - nTime4;
    LogPrint(BCLog::BENCH,
             "  - Writing chainstate: %.2fms [%.2fs (%.2fms/blk)]\n",
             (nTime5 - nTime4) * MILLI, nTimeChainState * MICRO,
             nTimeChainState * MILLI / nBlocksTotal);

    // Remove conflicting transactions from the mempool.;
    if (m_mempool) {
        m_mempool->removeForBlock(blockConnecting.vtx);
        disconnectpool.removeForBlock(blockConnecting.vtx);

        // If this block is activating a fork, we move all mempool transactions
        // in front of disconnectpool for reprocessing in a future
        // updateMempoolForReorg call
        if (pindexNew->pprev != nullptr &&
            GetNextBlockScriptFlags(consensusParams, pindexNew) !=
                GetNextBlockScriptFlags(consensusParams, pindexNew->pprev)) {
            LogPrint(
                BCLog::MEMPOOL,
                "Disconnecting mempool due to acceptance of upgrade block\n");
            disconnectpool.importMempool(*m_mempool);
        }
    }

    // Update m_chain & related variables.
    m_chain.SetTip(pindexNew);
    UpdateTip(pindexNew);

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

    // If we are the background validation chainstate, check to see if we are
    // done validating the snapshot (i.e. our tip has reached the snapshot's
    // base block).
    if (this != &m_chainman.ActiveChainstate()) {
        // This call may set `m_disabled`, which is referenced immediately
        // afterwards in ActivateBestChain, so that we stop connecting blocks
        // past the snapshot base.
        m_chainman.MaybeCompleteSnapshotValidation();
    }

    connectTrace.BlockConnected(pindexNew, std::move(pthisBlock));
    return true;
}

/**
 * Return the tip of the chain with the most work in it, that isn't known to be
 * invalid (it's however far from certain to be valid).
 */
CBlockIndex *Chainstate::FindMostWorkChain(
    std::vector<const CBlockIndex *> &blocksToReconcile) {
    AssertLockHeld(::cs_main);
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

        // If this block will cause an avalanche finalized block to be reorged,
        // then we park it.
        {
            LOCK(cs_avalancheFinalizedBlockIndex);
            if (m_avalancheFinalizedBlockIndex &&
                !AreOnTheSameFork(pindexNew, m_avalancheFinalizedBlockIndex)) {
                LogPrintf("Park block %s because it forks prior to the "
                          "avalanche finalized chaintip.\n",
                          pindexNew->GetBlockHash().ToString());
                pindexNew->nStatus = pindexNew->nStatus.withParked();
                m_blockman.m_dirty_blockindex.insert(pindexNew);
            }
        }

        const bool fAvalancheEnabled = isAvalancheEnabled(gArgs);
        const bool fAutoUnpark =
            gArgs.GetBoolArg("-automaticunparking", !fAvalancheEnabled);

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
            if (fAutoUnpark && fParkedChain) {
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

            if (fInvalidChain && (m_chainman.m_best_invalid == nullptr ||
                                  pindexNew->nChainWork >
                                      m_chainman.m_best_invalid->nChainWork)) {
                m_chainman.m_best_invalid = pindexNew;
            }

            if (fParkedChain && (m_chainman.m_best_parked == nullptr ||
                                 pindexNew->nChainWork >
                                     m_chainman.m_best_parked->nChainWork)) {
                m_chainman.m_best_parked = pindexNew;
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

        if (fAvalancheEnabled && g_avalanche) {
            blocksToReconcile.push_back(pindexNew);
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
void Chainstate::PruneBlockIndexCandidates() {
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
 *
 * @returns true unless a system error occurred
 */
bool Chainstate::ActivateBestChainStep(
    const Config &config, BlockValidationState &state,
    CBlockIndex *pindexMostWork, const std::shared_ptr<const CBlock> &pblock,
    bool &fInvalidFound, ConnectTrace &connectTrace) {
    AssertLockHeld(cs_main);
    if (m_mempool) {
        AssertLockHeld(m_mempool->cs);
    }

    const CBlockIndex *pindexOldTip = m_chain.Tip();
    const CBlockIndex *pindexFork = m_chain.FindFork(pindexMostWork);

    // Disconnect active blocks which are no longer in the best chain.
    bool fBlocksDisconnected = false;
    DisconnectedBlockTransactions disconnectpool;
    while (m_chain.Tip() && m_chain.Tip() != pindexFork) {
        if (!fBlocksDisconnected) {
            // Import and clear mempool; we must do this to preserve
            // topological ordering in the mempool index. This is ok since
            // inserts into the mempool are very fast now in our new
            // implementation.
            disconnectpool.importMempool(*m_mempool);
        }

        if (!DisconnectTip(state, &disconnectpool)) {
            // This is likely a fatal error, but keep the mempool consistent,
            // just in case. Only remove from the mempool in this case.
            if (m_mempool) {
                disconnectpool.updateMempoolForReorg(config, *this, false,
                                                     *m_mempool);
            }

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
            BlockPolicyValidationState blockPolicyState;
            if (!ConnectTip(config, state, blockPolicyState, pindexConnect,
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

                if (blockPolicyState.IsInvalid()) {
                    // The block violates a policy rule.
                    fContinue = false;
                    break;
                }

                // A system error occurred (disk space, database error, ...).
                // Make the mempool consistent with the current tip, just in
                // case any observers try to use it before shutdown.
                if (m_mempool) {
                    disconnectpool.updateMempoolForReorg(config, *this, false,
                                                         *m_mempool);
                }
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

    if (m_mempool) {
        if (fBlocksDisconnected || !disconnectpool.isEmpty()) {
            // If any blocks were disconnected, we need to update the mempool
            // even if disconnectpool is empty. The disconnectpool may also be
            // non-empty if the mempool was imported due to new validation rules
            // being in effect.
            LogPrint(BCLog::MEMPOOL,
                     "Updating mempool due to reorganization or "
                     "rules upgrade/downgrade\n");
            disconnectpool.updateMempoolForReorg(config, *this, true,
                                                 *m_mempool);
        }

        m_mempool->check(this->CoinsTip(), this->m_chain.Height() + 1);
    }

    // Callbacks/notifications for a new best chain.
    if (fInvalidFound) {
        CheckForkWarningConditionsOnNewFork(pindexMostWork);
    } else {
        CheckForkWarningConditions();
    }

    return true;
}

static SynchronizationState GetSynchronizationState(bool init) {
    if (!init) {
        return SynchronizationState::POST_INIT;
    }
    if (::fReindex) {
        return SynchronizationState::INIT_REINDEX;
    }
    return SynchronizationState::INIT_DOWNLOAD;
}

static bool NotifyHeaderTip(Chainstate &chainstate) LOCKS_EXCLUDED(cs_main) {
    bool fNotify = false;
    bool fInitialBlockDownload = false;
    static CBlockIndex *pindexHeaderOld = nullptr;
    CBlockIndex *pindexHeader = nullptr;
    {
        LOCK(cs_main);
        pindexHeader = chainstate.m_chainman.m_best_header;

        if (pindexHeader != pindexHeaderOld) {
            fNotify = true;
            fInitialBlockDownload = chainstate.IsInitialBlockDownload();
            pindexHeaderOld = pindexHeader;
        }
    }

    // Send block tip changed notifications without cs_main
    if (fNotify) {
        uiInterface.NotifyHeaderTip(
            GetSynchronizationState(fInitialBlockDownload), pindexHeader);
    }
    return fNotify;
}

static void LimitValidationInterfaceQueue() LOCKS_EXCLUDED(cs_main) {
    AssertLockNotHeld(cs_main);

    if (GetMainSignals().CallbacksPending() > 10) {
        SyncWithValidationInterfaceQueue();
    }
}

bool Chainstate::ActivateBestChain(const Config &config,
                                   BlockValidationState &state,
                                   std::shared_ptr<const CBlock> pblock) {
    AssertLockNotHeld(m_chainstate_mutex);

    // Note that while we're often called here from ProcessNewBlock, this is
    // far from a guarantee. Things in the P2P/RPC will often end up calling
    // us in the middle of ProcessNewBlock - do not assume pblock is set
    // sanely for performance or correctness!
    AssertLockNotHeld(::cs_main);

    // ABC maintains a fair degree of expensive-to-calculate internal state
    // because this function periodically releases cs_main so that it does not
    // lock up other threads for too long during large connects - and to allow
    // for e.g. the callback queue to drain we use m_chainstate_mutex to enforce
    // mutual exclusion so that only one caller may execute this function at a
    // time
    LOCK(m_chainstate_mutex);

    // Belt-and-suspenders check that we aren't attempting to advance the
    // background chainstate past the snapshot base block.
    if (WITH_LOCK(::cs_main, return m_disabled)) {
        LogPrintf("m_disabled is set - this chainstate should not be in "
                  "operation. Please report this as a bug. %s\n",
                  PACKAGE_BUGREPORT);
        return false;
    }

    CBlockIndex *pindexMostWork = nullptr;
    CBlockIndex *pindexNewTip = nullptr;
    int nStopAtHeight = gArgs.GetIntArg("-stopatheight", DEFAULT_STOPATHEIGHT);
    do {
        // Block until the validation queue drains. This should largely
        // never happen in normal operation, however may happen during
        // reindex, causing memory blowup if we run too far ahead.
        // Note that if a validationinterface callback ends up calling
        // ActivateBestChain this may lead to a deadlock! We should
        // probably have a DEBUG_LOCKORDER test for this in the future.
        LimitValidationInterfaceQueue();

        std::vector<const CBlockIndex *> blocksToReconcile;
        bool blocks_connected = false;

        {
            LOCK(cs_main);
            // Lock transaction pool for at least as long as it takes for
            // connectTrace to be consumed
            LOCK(MempoolMutex());
            CBlockIndex *starting_tip = m_chain.Tip();
            do {
                // We absolutely may not unlock cs_main until we've made forward
                // progress (with the exception of shutdown due to hardware
                // issues, low disk space, etc).

                // Destructed before cs_main is unlocked
                ConnectTrace connectTrace;

                if (pindexMostWork == nullptr) {
                    pindexMostWork = FindMostWorkChain(blocksToReconcile);
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
                    // A system error occurred
                    return false;
                }
                blocks_connected = true;

                if (fInvalidFound ||
                    (pindexMostWork && pindexMostWork->nStatus.isParked())) {
                    // Wipe cache, we may need another branch now.
                    pindexMostWork = nullptr;
                }

                pindexNewTip = m_chain.Tip();
                for (const PerBlockConnectTrace &trace :
                     connectTrace.GetBlocksConnected()) {
                    assert(trace.pblock && trace.pindex);
                    GetMainSignals().BlockConnected(trace.pblock, trace.pindex);
                }

                // This will have been toggled in
                // ActivateBestChainStep -> ConnectTip ->
                // MaybeCompleteSnapshotValidation, if at all, so we should
                // catch it here.
                //
                // Break this do-while to ensure we don't advance past the base
                // snapshot.
                if (m_disabled) {
                    break;
                }
            } while (!m_chain.Tip() ||
                     (starting_tip && CBlockIndexWorkComparator()(
                                          m_chain.Tip(), starting_tip)));

            // Check the index once we're done with the above loop, since
            // we're going to release cs_main soon. If the index is in a bad
            // state now, then it's better to know immediately rather than
            // randomly have it cause a problem in a race.
            CheckBlockIndex();

            if (blocks_connected) {
                const CBlockIndex *pindexFork = m_chain.FindFork(starting_tip);
                bool fInitialDownload = IsInitialBlockDownload();

                // Notify external listeners about the new tip.
                // Enqueue while holding cs_main to ensure that UpdatedBlockTip
                // is called in the order in which blocks are connected
                if (pindexFork != pindexNewTip) {
                    // Notify ValidationInterface subscribers
                    GetMainSignals().UpdatedBlockTip(pindexNewTip, pindexFork,
                                                     fInitialDownload);

                    // Always notify the UI if a new block tip was connected
                    uiInterface.NotifyBlockTip(
                        GetSynchronizationState(fInitialDownload),
                        pindexNewTip);
                }
            }
        }
        // When we reach this point, we switched to a new tip (stored in
        // pindexNewTip).
        if (g_avalanche) {
            for (const CBlockIndex *pindex : blocksToReconcile) {
                g_avalanche->addToReconcile(pindex);
                g_avalanche->computeStakingReward(pindex);
            }
        }

        if (!blocks_connected) {
            return true;
        }

        if (nStopAtHeight && pindexNewTip &&
            pindexNewTip->nHeight >= nStopAtHeight) {
            StartShutdown();
        }

        if (WITH_LOCK(::cs_main, return m_disabled)) {
            // Background chainstate has reached the snapshot base block, so
            // exit.
            break;
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
    if (!FlushStateToDisk(state, FlushStateMode::PERIODIC)) {
        return false;
    }

    return true;
}

bool Chainstate::PreciousBlock(const Config &config,
                               BlockValidationState &state,
                               CBlockIndex *pindex) {
    AssertLockNotHeld(m_chainstate_mutex);
    AssertLockNotHeld(::cs_main);
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

namespace {
// Leverage RAII to run a functor at scope end
template <typename Func> struct Defer {
    Func func;
    Defer(Func &&f) : func(std::move(f)) {}
    ~Defer() { func(); }
};
} // namespace

bool Chainstate::UnwindBlock(const Config &config, BlockValidationState &state,
                             CBlockIndex *pindex, bool invalidate) {
    // Genesis block can't be invalidated or parked
    assert(pindex);
    if (pindex->nHeight == 0) {
        return false;
    }

    CBlockIndex *to_mark_failed_or_parked = pindex;
    bool pindex_was_in_chain = false;
    int disconnected = 0;

    // We do not allow ActivateBestChain() to run while UnwindBlock() is
    // running, as that could cause the tip to change while we disconnect
    // blocks. (Note for backport of Core PR16849: we acquire
    // LOCK(m_chainstate_mutex) in the Park, Invalidate and FinalizeBlock
    // functions due to differences in our code)
    AssertLockHeld(m_chainstate_mutex);

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
        for (auto &entry : m_blockman.m_block_index) {
            CBlockIndex *candidate = &entry.second;
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

    {
        LOCK(cs_main);
        // Lock for as long as disconnectpool is in scope to make sure
        // UpdateMempoolForReorg is called after DisconnectTip without unlocking
        // in between
        LOCK(MempoolMutex());

        constexpr int maxDisconnectPoolBlocks = 10;
        bool ret = false;
        DisconnectedBlockTransactions disconnectpool;
        // After 10 blocks this becomes nullptr, so that DisconnectTip will
        // stop giving us unwound block txs if we are doing a deep unwind.
        DisconnectedBlockTransactions *optDisconnectPool = &disconnectpool;

        // Disable thread safety analysis because we can't require m_mempool->cs
        // as m_mempool can be null. We keep the runtime analysis though.
        Defer deferred([&]() NO_THREAD_SAFETY_ANALYSIS {
            AssertLockHeld(cs_main);
            if (m_mempool && !disconnectpool.isEmpty()) {
                AssertLockHeld(m_mempool->cs);
                // DisconnectTip will add transactions to disconnectpool.
                // When all unwinding is done and we are on a new tip, we must
                // add all transactions back to the mempool against the new tip.
                disconnectpool.updateMempoolForReorg(config, *this,
                                                     /* fAddToMempool = */ ret,
                                                     *m_mempool);
            }
        });

        // Disconnect (descendants of) pindex, and mark them invalid.
        while (true) {
            if (ShutdownRequested()) {
                break;
            }

            // Make sure the queue of validation callbacks doesn't grow
            // unboundedly.
            // FIXME this commented code is a regression and could cause OOM if
            // a very old block is invalidated via the invalidateblock RPC.
            // This can be uncommented if the main signals are moved away from
            // cs_main or this code is refactored so that cs_main can be
            // released at this point.
            //
            // LimitValidationInterfaceQueue();

            if (!m_chain.Contains(pindex)) {
                break;
            }

            if (m_mempool && disconnected == 0) {
                // On first iteration, we grab all the mempool txs to preserve
                // topological ordering. This has the side-effect of temporarily
                // clearing the mempool, but we will re-add later in
                // updateMempoolForReorg() (above). This technique guarantees
                // mempool consistency as well as ensures that our topological
                // entry_id index is always correct.
                disconnectpool.importMempool(*m_mempool);
            }

            pindex_was_in_chain = true;
            CBlockIndex *invalid_walk_tip = m_chain.Tip();

            // ActivateBestChain considers blocks already in m_chain
            // unconditionally valid already, so force disconnect away from it.

            ret = DisconnectTip(state, optDisconnectPool);
            ++disconnected;

            if (optDisconnectPool && disconnected > maxDisconnectPoolBlocks) {
                // Stop using the disconnect pool after 10 blocks. After 10
                // blocks we no longer add block tx's to the disconnectpool.
                // However, when this scope ends we will reconcile what's
                // in the pool with the new tip (in the deferred d'tor above).
                optDisconnectPool = nullptr;
            }

            if (!ret) {
                return false;
            }

            assert(invalid_walk_tip->pprev == m_chain.Tip());

            // We immediately mark the disconnected blocks as invalid.
            // This prevents a case where pruned nodes may fail to
            // invalidateblock and be left unable to start as they have no tip
            // candidates (as there are no blocks that meet the "have data and
            // are not invalid per nStatus" criteria for inclusion in
            // setBlockIndexCandidates).

            invalid_walk_tip->nStatus =
                invalidate ? invalid_walk_tip->nStatus.withFailed()
                           : invalid_walk_tip->nStatus.withParked();

            m_blockman.m_dirty_blockindex.insert(invalid_walk_tip);
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

                m_blockman.m_dirty_blockindex.insert(to_mark_failed_or_parked);
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
            // FailedParent (or ParkedParent) status in future iterations, or,
            // if it's the last one, call InvalidChainFound on it.
            to_mark_failed_or_parked = invalid_walk_tip;
        }
    }

    CheckBlockIndex();

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
        m_blockman.m_dirty_blockindex.insert(to_mark_failed_or_parked);
        if (invalidate) {
            m_chainman.m_failed_blocks.insert(to_mark_failed_or_parked);
        }

        // If any new blocks somehow arrived while we were disconnecting
        // (above), then the pre-calculation of what should go into
        // setBlockIndexCandidates may have missed entries. This would
        // technically be an inconsistency in the block index, but if we clean
        // it up here, this should be an essentially unobservable error.
        // Loop back over all block index entries and add any missing entries
        // to setBlockIndexCandidates.
        for (auto &[_, block_index] : m_blockman.m_block_index) {
            if (block_index.IsValid(BlockValidity::TRANSACTIONS) &&
                block_index.HaveTxsDownloaded() &&
                !setBlockIndexCandidates.value_comp()(&block_index,
                                                      m_chain.Tip())) {
                setBlockIndexCandidates.insert(&block_index);
            }
        }

        if (invalidate) {
            InvalidChainFound(to_mark_failed_or_parked);
        }
    }

    // Only notify about a new block tip if the active chain was modified.
    if (pindex_was_in_chain) {
        uiInterface.NotifyBlockTip(
            GetSynchronizationState(IsInitialBlockDownload()),
            to_mark_failed_or_parked->pprev);
    }
    return true;
}

bool Chainstate::InvalidateBlock(const Config &config,
                                 BlockValidationState &state,
                                 CBlockIndex *pindex) {
    AssertLockNotHeld(m_chainstate_mutex);
    AssertLockNotHeld(::cs_main);
    // See 'Note for backport of Core PR16849' in Chainstate::UnwindBlock
    LOCK(m_chainstate_mutex);

    return UnwindBlock(config, state, pindex, true);
}

bool Chainstate::ParkBlock(const Config &config, BlockValidationState &state,
                           CBlockIndex *pindex) {
    AssertLockNotHeld(m_chainstate_mutex);
    AssertLockNotHeld(::cs_main);
    // See 'Note for backport of Core PR16849' in Chainstate::UnwindBlock
    LOCK(m_chainstate_mutex);

    return UnwindBlock(config, state, pindex, false);
}

template <typename F>
bool Chainstate::UpdateFlagsForBlock(CBlockIndex *pindexBase,
                                     CBlockIndex *pindex, F f) {
    BlockStatus newStatus = f(pindex->nStatus);
    if (pindex->nStatus != newStatus &&
        (!pindexBase ||
         pindex->GetAncestor(pindexBase->nHeight) == pindexBase)) {
        pindex->nStatus = newStatus;
        m_blockman.m_dirty_blockindex.insert(pindex);
        if (newStatus.isValid()) {
            m_chainman.m_failed_blocks.erase(pindex);
        }

        if (pindex->IsValid(BlockValidity::TRANSACTIONS) &&
            pindex->HaveTxsDownloaded() &&
            setBlockIndexCandidates.value_comp()(m_chain.Tip(), pindex)) {
            setBlockIndexCandidates.insert(pindex);
        }
        return true;
    }
    return false;
}

template <typename F, typename C, typename AC>
void Chainstate::UpdateFlags(CBlockIndex *pindex, CBlockIndex *&pindexReset,
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
    for (auto &[_, block_index] : m_blockman.m_block_index) {
        UpdateFlagsForBlock(pindex, &block_index, fChild);
        UpdateFlagsForBlock(pindexDeepestChanged, &block_index,
                            fAncestorWasChanged);
    }
}

void Chainstate::ResetBlockFailureFlags(CBlockIndex *pindex) {
    AssertLockHeld(cs_main);

    UpdateFlags(
        pindex, m_chainman.m_best_invalid,
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

void Chainstate::UnparkBlockImpl(CBlockIndex *pindex, bool fClearChildren) {
    AssertLockHeld(cs_main);

    UpdateFlags(
        pindex, m_chainman.m_best_parked,
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

void Chainstate::UnparkBlockAndChildren(CBlockIndex *pindex) {
    return UnparkBlockImpl(pindex, true);
}

void Chainstate::UnparkBlock(CBlockIndex *pindex) {
    return UnparkBlockImpl(pindex, false);
}

bool Chainstate::AvalancheFinalizeBlock(CBlockIndex *pindex) {
    if (!pindex) {
        return false;
    }

    if (!m_chain.Contains(pindex)) {
        LogPrint(BCLog::AVALANCHE,
                 "The block to mark finalized by avalanche is not on the "
                 "active chain: %s\n",
                 pindex->GetBlockHash().ToString());
        return false;
    }

    if (g_avalanche) {
        g_avalanche->cleanupStakingRewards(pindex->nHeight);
    }

    if (IsBlockAvalancheFinalized(pindex)) {
        return true;
    }

    LOCK(cs_avalancheFinalizedBlockIndex);
    m_avalancheFinalizedBlockIndex = pindex;

    GetMainSignals().BlockFinalized(pindex);

    return true;
}

void Chainstate::ClearAvalancheFinalizedBlock() {
    LOCK(cs_avalancheFinalizedBlockIndex);
    m_avalancheFinalizedBlockIndex = nullptr;
}

bool Chainstate::IsBlockAvalancheFinalized(const CBlockIndex *pindex) const {
    LOCK(cs_avalancheFinalizedBlockIndex);
    return pindex && m_avalancheFinalizedBlockIndex &&
           m_avalancheFinalizedBlockIndex->GetAncestor(pindex->nHeight) ==
               pindex;
}

/**
 * Mark a block as having its data received and checked (up to
 * BLOCK_VALID_TRANSACTIONS).
 */
void Chainstate::ReceivedBlockTransactions(const CBlock &block,
                                           CBlockIndex *pindexNew,
                                           const FlatFilePos &pos) {
    pindexNew->nTx = block.vtx.size();
    pindexNew->nSize = ::GetSerializeSize(block, PROTOCOL_VERSION);
    pindexNew->nFile = pos.nFile;
    pindexNew->nDataPos = pos.nPos;
    pindexNew->nUndoPos = 0;
    pindexNew->nStatus = pindexNew->nStatus.withData();
    pindexNew->RaiseValidity(BlockValidity::TRANSACTIONS);
    m_blockman.m_dirty_blockindex.insert(pindexNew);

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
                             "high-hash", "proof of work failed");
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
                                 "bad-txnmrklroot", "hashMerkleRoot mismatch");
        }

        // Check for merkle tree malleability (CVE-2012-2459): repeating
        // sequences of transactions in a block without affecting the merkle
        // root of a block, while still invalidating it.
        if (mutated) {
            return state.Invalid(BlockValidationResult::BLOCK_MUTATED,
                                 "bad-txns-duplicate", "duplicate transaction");
        }
    }

    // All potential-corruption validation must be done before we do any
    // transaction validation, as otherwise we may mark the header as invalid
    // because we receive the wrong transactions for it.

    // First transaction must be coinbase.
    if (block.vtx.empty()) {
        return state.Invalid(BlockValidationResult::BLOCK_CONSENSUS,
                             "bad-cb-missing", "first tx is not coinbase");
    }

    // Size limits.
    auto nMaxBlockSize = validationOptions.getExcessiveBlockSize();

    // Bail early if there is no way this block is of reasonable size.
    if ((block.vtx.size() * MIN_TRANSACTION_SIZE) > nMaxBlockSize) {
        return state.Invalid(BlockValidationResult::BLOCK_CONSENSUS,
                             "bad-blk-length", "size limits failed");
    }

    auto currentBlockSize = ::GetSerializeSize(block, PROTOCOL_VERSION);
    if (currentBlockSize > nMaxBlockSize) {
        return state.Invalid(BlockValidationResult::BLOCK_CONSENSUS,
                             "bad-blk-length", "size limits failed");
    }

    // And a valid coinbase.
    TxValidationState tx_state;
    if (!CheckCoinbase(*block.vtx[0], tx_state)) {
        return state.Invalid(BlockValidationResult::BLOCK_CONSENSUS,
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
                tx_state.GetRejectReason(),
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
static bool
ContextualCheckBlockHeader(const CChainParams &params,
                           const CBlockHeader &block,
                           BlockValidationState &state, BlockManager &blockman,
                           const CBlockIndex *pindexPrev, int64_t nAdjustedTime)
    EXCLUSIVE_LOCKS_REQUIRED(::cs_main) {
    AssertLockHeld(::cs_main);
    assert(pindexPrev != nullptr);
    const int nHeight = pindexPrev->nHeight + 1;

    // Check proof of work
    if (block.nBits != GetNextWorkRequired(pindexPrev, &block, params)) {
        LogPrintf("bad bits after height: %d\n", pindexPrev->nHeight);
        return state.Invalid(BlockValidationResult::BLOCK_INVALID_HEADER,
                             "bad-diffbits", "incorrect proof of work");
    }

    // Check against checkpoints
    if (fCheckpointsEnabled) {
        const CCheckpointData &checkpoints = params.Checkpoints();

        // Check that the block chain matches the known block chain up to a
        // checkpoint.
        if (!Checkpoints::CheckBlock(checkpoints, nHeight, block.GetHash())) {
            LogPrint(BCLog::VALIDATION,
                     "ERROR: %s: rejected by checkpoint lock-in at %d\n",
                     __func__, nHeight);
            return state.Invalid(BlockValidationResult::BLOCK_CHECKPOINT,
                                 "checkpoint mismatch");
        }

        // Don't accept any forks from the main chain prior to last checkpoint.
        // GetLastCheckpoint finds the last checkpoint in MapCheckpoints that's
        // in our BlockIndex().

        const CBlockIndex *pcheckpoint =
            blockman.GetLastCheckpoint(checkpoints);
        if (pcheckpoint && nHeight < pcheckpoint->nHeight) {
            LogPrint(BCLog::VALIDATION,
                     "ERROR: %s: forked chain older than last checkpoint "
                     "(height %d)\n",
                     __func__, nHeight);
            return state.Invalid(BlockValidationResult::BLOCK_CHECKPOINT,
                                 "bad-fork-prior-to-checkpoint");
        }
    }

    // Check timestamp against prev
    if (block.GetBlockTime() <= pindexPrev->GetMedianTimePast()) {
        return state.Invalid(BlockValidationResult::BLOCK_INVALID_HEADER,
                             "time-too-old", "block's timestamp is too early");
    }

    // Check timestamp
    if (block.GetBlockTime() > nAdjustedTime + MAX_FUTURE_BLOCK_TIME) {
        return state.Invalid(BlockValidationResult::BLOCK_TIME_FUTURE,
                             "time-too-new",
                             "block timestamp too far in the future");
    }

    const Consensus::Params &consensusParams = params.GetConsensus();
    // Reject blocks with outdated version
    if ((block.nVersion < 2 &&
         DeploymentActiveAfter(pindexPrev, consensusParams,
                               Consensus::DEPLOYMENT_HEIGHTINCB)) ||
        (block.nVersion < 3 &&
         DeploymentActiveAfter(pindexPrev, consensusParams,
                               Consensus::DEPLOYMENT_DERSIG)) ||
        (block.nVersion < 4 &&
         DeploymentActiveAfter(pindexPrev, consensusParams,
                               Consensus::DEPLOYMENT_CLTV))) {
        return state.Invalid(
            BlockValidationResult::BLOCK_INVALID_HEADER,
            strprintf("bad-version(0x%08x)", block.nVersion),
            strprintf("rejected nVersion=0x%08x block", block.nVersion));
    }

    return true;
}

bool ContextualCheckTransactionForCurrentBlock(
    const CBlockIndex *active_chain_tip, const Consensus::Params &params,
    const CTransaction &tx, TxValidationState &state) {
    AssertLockHeld(cs_main);
    // TODO: Make active_chain_tip a reference
    assert(active_chain_tip);

    // ContextualCheckTransactionForCurrentBlock() uses
    // active_chain_tip.Height()+1 to evaluate nLockTime because when
    // IsFinalTx() is called within AcceptBlock(), the height of the
    // block *being* evaluated is what is used. Thus if we want to know if a
    // transaction can be part of the *next* block, we need to call
    // ContextualCheckTransaction() with one more than
    // active_chain_tip.Height().
    const int nBlockHeight = active_chain_tip->nHeight + 1;

    // BIP113 will require that time-locked transactions have nLockTime set to
    // less than the median time of the previous block they're contained in.
    // When the next block is created its previous block will be the current
    // chain tip, so we use that to calculate the median time passed to
    // ContextualCheckTransaction().
    // This time can also be used for consensus upgrades.
    const int64_t nMedianTimePast{active_chain_tip->GetMedianTimePast()};

    return ContextualCheckTransaction(params, tx, state, nBlockHeight,
                                      nMedianTimePast);
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

    // Enforce BIP113 (Median Time Past).
    int nLockTimeFlags = 0;
    if (DeploymentActiveAfter(pindexPrev, params, Consensus::DEPLOYMENT_CSV)) {
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
    // - check they have the minimum size
    const CTransaction *prevTx = nullptr;
    for (const auto &ptx : block.vtx) {
        const CTransaction &tx = *ptx;
        if (fIsMagneticAnomalyEnabled) {
            if (prevTx && (tx.GetId() <= prevTx->GetId())) {
                if (tx.GetId() == prevTx->GetId()) {
                    return state.Invalid(BlockValidationResult::BLOCK_CONSENSUS,
                                         "tx-duplicate",
                                         strprintf("Duplicated transaction %s",
                                                   tx.GetId().ToString()));
                }

                return state.Invalid(
                    BlockValidationResult::BLOCK_CONSENSUS, "tx-ordering",
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
                                        nLockTimeCutoff)) {
            return state.Invalid(BlockValidationResult::BLOCK_CONSENSUS,
                                 tx_state.GetRejectReason(),
                                 tx_state.GetDebugMessage());
        }
    }

    // Enforce rule that the coinbase starts with serialized block height
    if (DeploymentActiveAfter(pindexPrev, params,
                              Consensus::DEPLOYMENT_HEIGHTINCB)) {
        CScript expect = CScript() << nHeight;
        if (block.vtx[0]->vin[0].scriptSig.size() < expect.size() ||
            !std::equal(expect.begin(), expect.end(),
                        block.vtx[0]->vin[0].scriptSig.begin())) {
            return state.Invalid(BlockValidationResult::BLOCK_CONSENSUS,
                                 "bad-cb-height",
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
bool ChainstateManager::AcceptBlockHeader(const Config &config,
                                          const CBlockHeader &block,
                                          BlockValidationState &state,
                                          CBlockIndex **ppindex) {
    AssertLockHeld(cs_main);
    const CChainParams &chainparams = config.GetChainParams();

    // Check for duplicate
    BlockHash hash = block.GetHash();
    BlockMap::iterator miSelf{m_blockman.m_block_index.find(hash)};
    if (hash != chainparams.GetConsensus().hashGenesisBlock) {
        if (miSelf != m_blockman.m_block_index.end()) {
            // Block header is already known.
            CBlockIndex *pindex = &(miSelf->second);
            if (ppindex) {
                *ppindex = pindex;
            }

            if (pindex->nStatus.isInvalid()) {
                LogPrint(BCLog::VALIDATION, "%s: block %s is marked invalid\n",
                         __func__, hash.ToString());
                return state.Invalid(
                    BlockValidationResult::BLOCK_CACHED_INVALID, "duplicate");
            }

            return true;
        }

        if (!CheckBlockHeader(block, state, chainparams.GetConsensus(),
                              BlockValidationOptions(config))) {
            LogPrint(BCLog::VALIDATION,
                     "%s: Consensus::CheckBlockHeader: %s, %s\n", __func__,
                     hash.ToString(), state.ToString());
            return false;
        }

        // Get prev block index
        BlockMap::iterator mi{
            m_blockman.m_block_index.find(block.hashPrevBlock)};
        if (mi == m_blockman.m_block_index.end()) {
            LogPrint(BCLog::VALIDATION,
                     "header %s has prev block not found: %s\n",
                     hash.ToString(), block.hashPrevBlock.ToString());
            return state.Invalid(BlockValidationResult::BLOCK_MISSING_PREV,
                                 "prev-blk-not-found");
        }

        CBlockIndex *pindexPrev = &((*mi).second);
        assert(pindexPrev);
        if (pindexPrev->nStatus.isInvalid()) {
            LogPrint(BCLog::VALIDATION,
                     "header %s has prev block invalid: %s\n", hash.ToString(),
                     block.hashPrevBlock.ToString());
            return state.Invalid(BlockValidationResult::BLOCK_INVALID_PREV,
                                 "bad-prevblk");
        }

        if (!ContextualCheckBlockHeader(chainparams, block, state, m_blockman,
                                        pindexPrev, GetAdjustedTime())) {
            LogPrint(BCLog::VALIDATION,
                     "%s: Consensus::ContextualCheckBlockHeader: %s, %s\n",
                     __func__, hash.ToString(), state.ToString());
            return false;
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
                        m_blockman.m_dirty_blockindex.insert(invalid_walk);
                        invalid_walk = invalid_walk->pprev;
                    }
                    LogPrint(BCLog::VALIDATION,
                             "header %s has prev block invalid: %s\n",
                             hash.ToString(), block.hashPrevBlock.ToString());
                    return state.Invalid(
                        BlockValidationResult::BLOCK_INVALID_PREV,
                        "bad-prevblk");
                }
            }
        }
    }

    CBlockIndex *pindex{m_blockman.AddToBlockIndex(block, m_best_header)};

    if (ppindex) {
        *ppindex = pindex;
    }

    return true;
}

// Exposed wrapper for AcceptBlockHeader
bool ChainstateManager::ProcessNewBlockHeaders(
    const Config &config, const std::vector<CBlockHeader> &headers,
    BlockValidationState &state, const CBlockIndex **ppindex) {
    AssertLockNotHeld(cs_main);
    {
        LOCK(cs_main);
        for (const CBlockHeader &header : headers) {
            // Use a temp pindex instead of ppindex to avoid a const_cast
            CBlockIndex *pindex = nullptr;
            bool accepted = AcceptBlockHeader(config, header, state, &pindex);
            ActiveChainstate().CheckBlockIndex();

            if (!accepted) {
                return false;
            }

            if (ppindex) {
                *ppindex = pindex;
            }
        }
    }

    if (NotifyHeaderTip(ActiveChainstate())) {
        if (ActiveChainstate().IsInitialBlockDownload() && ppindex &&
            *ppindex) {
            const CBlockIndex &last_accepted{**ppindex};
            const int64_t blocks_left{
                (GetTime() - last_accepted.GetBlockTime()) /
                config.GetChainParams().GetConsensus().nPowTargetSpacing};
            const double progress{100.0 * last_accepted.nHeight /
                                  (last_accepted.nHeight + blocks_left)};
            LogPrintf("Synchronizing blockheaders, height: %d (~%.2f%%)\n",
                      last_accepted.nHeight, progress);
        }
    }
    return true;
}

/**
 * Store a block on disk.
 *
 * @param[in]     config     The global config.
 * @param[in,out] pblock     The block we want to accept.
 * @param[in]     fRequested A boolean to indicate if this block was requested
 *                           from our peers.
 * @param[in]     dbp        If non-null, the disk position of the block.
 * @param[in,out] fNewBlock  True if block was first received via this call.
 * @return True if the block is accepted as a valid block and written to disk.
 */
bool Chainstate::AcceptBlock(const Config &config,
                             const std::shared_ptr<const CBlock> &pblock,
                             BlockValidationState &state, bool fRequested,
                             const FlatFilePos *dbp, bool *fNewBlock) {
    AssertLockHeld(cs_main);

    const CBlock &block = *pblock;
    if (fNewBlock) {
        *fNewBlock = false;
    }

    CBlockIndex *pindex = nullptr;

    bool accepted_header{
        m_chainman.AcceptBlockHeader(config, block, state, &pindex)};
    CheckBlockIndex();

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
    bool fTooFarAhead{pindex->nHeight >
                      m_chain.Height() + int(MIN_BLOCKS_TO_KEEP)};

    // TODO: Decouple this function from the block download logic by removing
    // fRequested
    // This requires some new chain data structure to efficiently look up if a
    // block is in a chain leading to a candidate for best tip, despite not
    // being such a candidate itself.
    // Note that this would break the getblockfrompeer RPC

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

    const Consensus::Params &consensusParams = m_params.GetConsensus();

    if (!CheckBlock(block, state, consensusParams,
                    BlockValidationOptions(config)) ||
        !ContextualCheckBlock(block, state, consensusParams, pindex->pprev)) {
        if (state.IsInvalid() &&
            state.GetResult() != BlockValidationResult::BLOCK_MUTATED) {
            pindex->nStatus = pindex->nStatus.withFailed();
            m_blockman.m_dirty_blockindex.insert(pindex);
        }

        return error("%s: %s (block %s)", __func__, state.ToString(),
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
            m_blockman.m_dirty_blockindex.insert(pindex);
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
        FlatFilePos blockPos{m_blockman.SaveBlockToDisk(
            block, pindex->nHeight, m_chain, m_params, dbp)};
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

    FlushStateToDisk(state, FlushStateMode::NONE);

    CheckBlockIndex();

    return true;
}

bool ChainstateManager::ProcessNewBlock(
    const Config &config, const std::shared_ptr<const CBlock> &block,
    bool force_processing, bool *new_block) {
    AssertLockNotHeld(cs_main);

    {
        if (new_block) {
            *new_block = false;
        }

        BlockValidationState state;

        // CheckBlock() does not support multi-threaded block validation
        // because CBlock::fChecked can cause data race.
        // Therefore, the following critical section must include the
        // CheckBlock() call as well.
        LOCK(cs_main);

        // Skipping AcceptBlock() for CheckBlock() failures means that we will
        // never mark a block as invalid if CheckBlock() fails.  This is
        // protective against consensus failure if there are any unknown form
        // s of block malleability that cause CheckBlock() to fail; see e.g.
        // CVE-2012-2459 and
        // https://lists.linuxfoundation.org/pipermail/bitcoin-dev/2019-February/016697.html.
        // Because CheckBlock() is not very expensive, the anti-DoS benefits of
        // caching failure (of a definitely-invalid block) are not substantial.
        bool ret =
            CheckBlock(*block, state, config.GetChainParams().GetConsensus(),
                       BlockValidationOptions(config));
        if (ret) {
            // Store to disk
            ret = ActiveChainstate().AcceptBlock(
                config, block, state, force_processing, nullptr, new_block);
        }

        if (!ret) {
            GetMainSignals().BlockChecked(*block, state);
            return error("%s: AcceptBlock FAILED (%s)", __func__,
                         state.ToString());
        }
    }

    NotifyHeaderTip(ActiveChainstate());

    // Only used to report errors, not invalidity - ignore it
    BlockValidationState state;
    if (!ActiveChainstate().ActivateBestChain(config, state, block)) {
        return error("%s: ActivateBestChain failed (%s)", __func__,
                     state.ToString());
    }

    return true;
}

MempoolAcceptResult
ChainstateManager::ProcessTransaction(const CTransactionRef &tx,
                                      bool test_accept) {
    AssertLockHeld(cs_main);
    Chainstate &active_chainstate = ActiveChainstate();
    if (!active_chainstate.GetMempool()) {
        TxValidationState state;
        state.Invalid(TxValidationResult::TX_NO_MEMPOOL, "no-mempool");
        return MempoolAcceptResult::Failure(state);
    }
    // Use GetConfig() temporarily. It will be removed in a follow-up by
    // making AcceptToMemoryPool take a CChainParams instead of a Config.
    // This avoids passing an extra Config argument to this function that will
    // be removed soon.
    auto result =
        AcceptToMemoryPool(::GetConfig(), active_chainstate, tx, GetTime(),
                           /*bypass_limits=*/false, test_accept);
    active_chainstate.GetMempool()->check(
        active_chainstate.CoinsTip(), active_chainstate.m_chain.Height() + 1);
    return result;
}

bool TestBlockValidity(BlockValidationState &state, const CChainParams &params,
                       Chainstate &chainstate, const CBlock &block,
                       CBlockIndex *pindexPrev,
                       BlockValidationOptions validationOptions) {
    AssertLockHeld(cs_main);
    assert(pindexPrev && pindexPrev == chainstate.m_chain.Tip());
    CCoinsViewCache viewNew(&chainstate.CoinsTip());
    BlockHash block_hash(block.GetHash());
    CBlockIndex indexDummy(block);
    indexDummy.pprev = pindexPrev;
    indexDummy.nHeight = pindexPrev->nHeight + 1;
    indexDummy.phashBlock = &block_hash;

    // NOTE: CheckBlockHeader is called by CheckBlock
    if (!ContextualCheckBlockHeader(params, block, state, chainstate.m_blockman,
                                    pindexPrev, GetAdjustedTime())) {
        return error("%s: Consensus::ContextualCheckBlockHeader: %s", __func__,
                     state.ToString());
    }

    if (!CheckBlock(block, state, params.GetConsensus(), validationOptions)) {
        return error("%s: Consensus::CheckBlock: %s", __func__,
                     state.ToString());
    }

    if (!ContextualCheckBlock(block, state, params.GetConsensus(),
                              pindexPrev)) {
        return error("%s: Consensus::ContextualCheckBlock: %s", __func__,
                     state.ToString());
    }

    if (!chainstate.ConnectBlock(block, state, &indexDummy, viewNew,
                                 validationOptions, nullptr, true)) {
        return false;
    }

    assert(state.IsValid());
    return true;
}

/* This function is called from the RPC code for pruneblockchain */
void PruneBlockFilesManual(Chainstate &active_chainstate,
                           int nManualPruneHeight) {
    BlockValidationState state;
    if (active_chainstate.FlushStateToDisk(state, FlushStateMode::NONE,
                                           nManualPruneHeight)) {
        LogPrintf("%s: failed to flush state (%s)\n", __func__,
                  state.ToString());
    }
}

void Chainstate::LoadMempool(const Config &config, const ArgsManager &args) {
    if (!m_mempool) {
        return;
    }
    if (args.GetBoolArg("-persistmempool", DEFAULT_PERSIST_MEMPOOL)) {
        ::LoadMempool(config, *m_mempool, *this);
    }
    m_mempool->SetIsLoaded(!ShutdownRequested());
}

bool Chainstate::LoadChainTip() {
    AssertLockHeld(cs_main);
    const CCoinsViewCache &coins_cache = CoinsTip();
    // Never called when the coins view is empty
    assert(!coins_cache.GetBestBlock().IsNull());
    const CBlockIndex *tip = m_chain.Tip();

    if (tip && tip->GetBlockHash() == coins_cache.GetBestBlock()) {
        return true;
    }

    // Load pointer to end of best chain
    CBlockIndex *pindex =
        m_blockman.LookupBlockIndex(coins_cache.GetBestBlock());
    if (!pindex) {
        return false;
    }
    m_chain.SetTip(pindex);
    PruneBlockIndexCandidates();

    tip = m_chain.Tip();
    LogPrintf(
        "Loaded best chain: hashBestChain=%s height=%d date=%s progress=%f\n",
        tip->GetBlockHash().ToString(), m_chain.Height(),
        FormatISO8601DateTime(tip->GetBlockTime()),
        GuessVerificationProgress(m_params.TxData(), tip));
    return true;
}

CVerifyDB::CVerifyDB() {
    uiInterface.ShowProgress(_("Verifying blocks...").translated, 0, false);
}

CVerifyDB::~CVerifyDB() {
    uiInterface.ShowProgress("", 100, false);
}

bool CVerifyDB::VerifyDB(Chainstate &chainstate, const Config &config,
                         CCoinsView &coinsview, int nCheckLevel,
                         int nCheckDepth) {
    AssertLockHeld(cs_main);

    const CChainParams &params = config.GetChainParams();
    const Consensus::Params &consensusParams = params.GetConsensus();

    if (chainstate.m_chain.Tip() == nullptr ||
        chainstate.m_chain.Tip()->pprev == nullptr) {
        return true;
    }

    // Verify blocks in the best chain
    if (nCheckDepth <= 0 || nCheckDepth > chainstate.m_chain.Height()) {
        nCheckDepth = chainstate.m_chain.Height();
    }

    nCheckLevel = std::max(0, std::min(4, nCheckLevel));
    LogPrintf("Verifying last %i blocks at level %i\n", nCheckDepth,
              nCheckLevel);

    CCoinsViewCache coins(&coinsview);
    CBlockIndex *pindex;
    CBlockIndex *pindexFailure = nullptr;
    int nGoodTransactions = 0;
    BlockValidationState state;
    int reportDone = 0;
    LogPrintfToBeContinued("[0%%]...");

    const bool is_snapshot_cs{!chainstate.m_from_snapshot_blockhash};

    for (pindex = chainstate.m_chain.Tip(); pindex && pindex->pprev;
         pindex = pindex->pprev) {
        const int percentageDone = std::max(
            1, std::min(99, (int)(((double)(chainstate.m_chain.Height() -
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
        if (pindex->nHeight <= chainstate.m_chain.Height() - nCheckDepth) {
            break;
        }

        if ((fPruneMode || is_snapshot_cs) && !pindex->nStatus.hasData()) {
            // If pruning or running under an assumeutxo snapshot, only go
            // back as far as we have data.
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
                         pindex->GetBlockHash().ToString(), state.ToString());
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
        size_t curr_coins_usage = coins.DynamicMemoryUsage() +
                                  chainstate.CoinsTip().DynamicMemoryUsage();

        if (nCheckLevel >= 3 &&
            curr_coins_usage <= chainstate.m_coinstip_cache_size_bytes) {
            assert(coins.GetBestBlock() == pindex->GetBlockHash());
            DisconnectResult res =
                chainstate.DisconnectBlock(block, pindex, coins);
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
                     chainstate.m_chain.Height() - pindexFailure->nHeight + 1,
                     nGoodTransactions);
    }

    // store block count as we move pindex at check level >= 4
    int block_count = chainstate.m_chain.Height() - pindex->nHeight;

    // check level 4: try reconnecting blocks
    if (nCheckLevel >= 4) {
        while (pindex != chainstate.m_chain.Tip()) {
            const int percentageDone = std::max(
                1, std::min(99, 100 - int(double(chainstate.m_chain.Height() -
                                                 pindex->nHeight) /
                                          double(nCheckDepth) * 50)));
            if (reportDone < percentageDone / 10) {
                // report every 10% step
                LogPrintfToBeContinued("[%d%%]...", percentageDone);
                reportDone = percentageDone / 10;
            }
            uiInterface.ShowProgress(_("Verifying blocks...").translated,
                                     percentageDone, false);
            pindex = chainstate.m_chain.Next(pindex);
            CBlock block;
            if (!ReadBlockFromDisk(block, pindex, consensusParams)) {
                return error(
                    "VerifyDB(): *** ReadBlockFromDisk failed at %d, hash=%s",
                    pindex->nHeight, pindex->GetBlockHash().ToString());
            }
            if (!chainstate.ConnectBlock(block, state, pindex, coins,
                                         BlockValidationOptions(config))) {
                return error("VerifyDB(): *** found unconnectable block at %d, "
                             "hash=%s (%s)",
                             pindex->nHeight, pindex->GetBlockHash().ToString(),
                             state.ToString());
            }
            if (ShutdownRequested()) {
                return true;
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
bool Chainstate::RollforwardBlock(const CBlockIndex *pindex,
                                  CCoinsViewCache &view) {
    AssertLockHeld(cs_main);
    // TODO: merge with ConnectBlock
    CBlock block;
    if (!ReadBlockFromDisk(block, pindex, m_params.GetConsensus())) {
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

bool Chainstate::ReplayBlocks() {
    LOCK(cs_main);

    CCoinsView &db = this->CoinsDB();
    CCoinsViewCache cache(&db);

    std::vector<BlockHash> hashHeads = db.GetHeadBlocks();
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

    pindexNew = &(m_blockman.m_block_index[hashHeads[0]]);

    if (!hashHeads[1].IsNull()) {
        // The old tip is allowed to be 0, indicating it's the first flush.
        if (m_blockman.m_block_index.count(hashHeads[1]) == 0) {
            return error(
                "ReplayBlocks(): reorganization from unknown block requested");
        }

        pindexOld = &(m_blockman.m_block_index[hashHeads[1]]);
        pindexFork = LastCommonAncestor(pindexOld, pindexNew);
        assert(pindexFork != nullptr);
    }

    // Rollback along the old branch.
    while (pindexOld != pindexFork) {
        if (pindexOld->nHeight > 0) {
            // Never disconnect the genesis block.
            CBlock block;
            if (!ReadBlockFromDisk(block, pindexOld, m_params.GetConsensus())) {
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
        const CBlockIndex &pindex{*Assert(pindexNew->GetAncestor(nHeight))};
        LogPrintf("Rolling forward %s (%i)\n", pindex.GetBlockHash().ToString(),
                  nHeight);
        uiInterface.ShowProgress(_("Replaying blocks...").translated,
                                 (int)((nHeight - nForkHeight) * 100.0 /
                                       (pindexNew->nHeight - nForkHeight)),
                                 false);
        if (!RollforwardBlock(&pindex, cache)) {
            return false;
        }
    }

    cache.SetBestBlock(pindexNew->GetBlockHash());
    cache.Flush();
    uiInterface.ShowProgress("", 100, false);
    return true;
}

// May NOT be used after any connections are up as much of the peer-processing
// logic assumes a consistent block index state
void Chainstate::UnloadBlockIndex() {
    AssertLockHeld(::cs_main);
    nBlockSequenceId = 1;
    m_best_fork_tip = nullptr;
    m_best_fork_base = nullptr;
    setBlockIndexCandidates.clear();
}

bool ChainstateManager::LoadBlockIndex() {
    AssertLockHeld(cs_main);
    // Load block index from databases
    bool needs_init = fReindex;
    if (!fReindex) {
        bool ret = m_blockman.LoadBlockIndexDB();
        if (!ret) {
            return false;
        }

        std::vector<CBlockIndex *> vSortedByHeight{
            m_blockman.GetAllBlockIndices()};
        std::sort(vSortedByHeight.begin(), vSortedByHeight.end(),
                  CBlockIndexHeightOnlyComparator());

        // Find start of assumed-valid region.
        int first_assumed_valid_height = std::numeric_limits<int>::max();

        for (const CBlockIndex *block : vSortedByHeight) {
            if (block->IsAssumedValid()) {
                auto chainstates = GetAll();

                // If we encounter an assumed-valid block index entry, ensure
                // that we have one chainstate that tolerates assumed-valid
                // entries and another that does not (i.e. the background
                // validation chainstate), since assumed-valid entries should
                // always be pending validation by a fully-validated chainstate.
                auto any_chain = [&](auto fnc) {
                    return std::any_of(chainstates.cbegin(), chainstates.cend(),
                                       fnc);
                };
                assert(any_chain([](auto chainstate) {
                    return chainstate->reliesOnAssumedValid();
                }));
                assert(any_chain([](auto chainstate) {
                    return !chainstate->reliesOnAssumedValid();
                }));

                first_assumed_valid_height = block->nHeight;
                LogPrintf("Saw first assumedvalid block at height %d (%s)\n",
                          first_assumed_valid_height, block->ToString());
                break;
            }
        }

        for (CBlockIndex *pindex : vSortedByHeight) {
            if (ShutdownRequested()) {
                return false;
            }
            if (pindex->IsAssumedValid() ||
                (pindex->IsValid(BlockValidity::TRANSACTIONS) &&
                 (pindex->HaveTxsDownloaded() || pindex->pprev == nullptr))) {
                // Fill each chainstate's block candidate set. Only add
                // assumed-valid blocks to the tip candidate set if the
                // chainstate is allowed to rely on assumed-valid blocks.
                //
                // If all setBlockIndexCandidates contained the assumed-valid
                // blocks, the background chainstate's ActivateBestChain() call
                // would add assumed-valid blocks to the chain (based on how
                // FindMostWorkChain() works). Obviously we don't want this
                // since the purpose of the background validation chain is to
                // validate assumed-valid blocks.
                //
                // Note: This is considering all blocks whose height is greater
                // or equal to the first assumed-valid block to be assumed-valid
                // blocks, and excluding them from the background chainstate's
                // setBlockIndexCandidates set. This does mean that some blocks
                // which are not technically assumed-valid (later blocks on a
                // fork beginning before the first assumed-valid block) might
                // not get added to the background chainstate, but this is ok,
                // because they will still be attached to the active chainstate
                // if they actually contain more work.
                //
                // Instead of this height-based approach, an earlier attempt was
                // made at detecting "holistically" whether the block index
                // under consideration relied on an assumed-valid ancestor, but
                // this proved to be too slow to be practical.
                for (Chainstate *chainstate : GetAll()) {
                    if (chainstate->reliesOnAssumedValid() ||
                        pindex->nHeight < first_assumed_valid_height) {
                        chainstate->setBlockIndexCandidates.insert(pindex);
                    }
                }
            }

            if (pindex->nStatus.isInvalid() &&
                (!m_best_invalid ||
                 pindex->nChainWork > m_best_invalid->nChainWork)) {
                m_best_invalid = pindex;
            }

            if (pindex->nStatus.isOnParkedChain() &&
                (!m_best_parked ||
                 pindex->nChainWork > m_best_parked->nChainWork)) {
                m_best_parked = pindex;
            }

            if (pindex->IsValid(BlockValidity::TREE) &&
                (m_best_header == nullptr ||
                 CBlockIndexWorkComparator()(m_best_header, pindex))) {
                m_best_header = pindex;
            }
        }

        needs_init = m_blockman.m_block_index.empty();
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

bool Chainstate::LoadGenesisBlock() {
    LOCK(cs_main);

    // Check whether we're already initialized by checking for genesis in
    // m_blockman.m_block_index. Note that we can't use m_chain here, since it
    // is set based on the coins db, not the block index db, which is the only
    // thing loaded at this point.
    if (m_blockman.m_block_index.count(m_params.GenesisBlock().GetHash())) {
        return true;
    }

    try {
        const CBlock &block = m_params.GenesisBlock();
        FlatFilePos blockPos{
            m_blockman.SaveBlockToDisk(block, 0, m_chain, m_params, nullptr)};
        if (blockPos.IsNull()) {
            return error("%s: writing genesis block to disk failed", __func__);
        }
        CBlockIndex *pindex =
            m_blockman.AddToBlockIndex(block, m_chainman.m_best_header);
        ReceivedBlockTransactions(block, pindex, blockPos);
    } catch (const std::runtime_error &e) {
        return error("%s: failed to write genesis block: %s", __func__,
                     e.what());
    }

    return true;
}

void Chainstate::LoadExternalBlockFile(const Config &config, FILE *fileIn,
                                       FlatFilePos *dbp) {
    AssertLockNotHeld(m_chainstate_mutex);
    // Map of disk positions for blocks with unknown parent (only used for
    // reindex)
    static std::multimap<uint256, FlatFilePos> mapBlocksUnknownParent;
    int64_t nStart = GetTimeMillis();

    int nLoaded = 0;
    try {
        // This takes over fileIn and calls fclose() on it in the CBufferedFile
        // destructor. Make sure we have at least 2*MAX_TX_SIZE space in there
        // so any transaction can fit in the buffer.
        CBufferedFile blkdat(fileIn, 2 * MAX_TX_SIZE, MAX_TX_SIZE + 8, SER_DISK,
                             CLIENT_VERSION);
        uint64_t nRewind = blkdat.GetPos();
        while (!blkdat.eof()) {
            if (ShutdownRequested()) {
                return;
            }

            blkdat.SetPos(nRewind);
            // Start one byte further next time, in case of failure.
            nRewind++;
            // Remove former limit.
            blkdat.SetLimit();
            unsigned int nSize = 0;
            try {
                // Locate a header.
                uint8_t buf[CMessageHeader::MESSAGE_START_SIZE];
                blkdat.FindByte(char(m_params.DiskMagic()[0]));
                nRewind = blkdat.GetPos() + 1;
                blkdat >> buf;
                if (memcmp(buf, m_params.DiskMagic().data(),
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
                std::shared_ptr<CBlock> pblock = std::make_shared<CBlock>();
                CBlock &block = *pblock;
                blkdat >> block;
                nRewind = blkdat.GetPos();

                const BlockHash hash = block.GetHash();
                {
                    LOCK(cs_main);
                    // detect out of order blocks, and store them for later
                    if (hash != m_params.GetConsensus().hashGenesisBlock &&
                        !m_blockman.LookupBlockIndex(block.hashPrevBlock)) {
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
                    const CBlockIndex *pindex =
                        m_blockman.LookupBlockIndex(hash);
                    if (!pindex || !pindex->nStatus.hasData()) {
                        BlockValidationState state;
                        if (AcceptBlock(config, pblock, state, true, dbp,
                                        nullptr)) {
                            nLoaded++;
                        }
                        if (state.IsError()) {
                            break;
                        }
                    } else if (hash !=
                                   m_params.GetConsensus().hashGenesisBlock &&
                               pindex->nHeight % 1000 == 0) {
                        LogPrint(
                            BCLog::REINDEX,
                            "Block Import: already had block %s at height %d\n",
                            hash.ToString(), pindex->nHeight);
                    }
                }

                // Activate the genesis block so normal node progress can
                // continue
                if (hash == m_params.GetConsensus().hashGenesisBlock) {
                    BlockValidationState state;
                    if (!ActivateBestChain(config, state, nullptr)) {
                        break;
                    }
                }

                NotifyHeaderTip(*this);

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
                                              m_params.GetConsensus())) {
                            LogPrint(
                                BCLog::REINDEX,
                                "%s: Processing out of order child %s of %s\n",
                                __func__, pblockrecursive->GetHash().ToString(),
                                head.ToString());
                            LOCK(cs_main);
                            BlockValidationState dummy;
                            if (AcceptBlock(config, pblockrecursive, dummy,
                                            true, &it->second, nullptr)) {
                                nLoaded++;
                                queue.push_back(pblockrecursive->GetHash());
                            }
                        }
                        range.first++;
                        mapBlocksUnknownParent.erase(it);
                        NotifyHeaderTip(*this);
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

    LogPrintf("Loaded %i blocks from external file in %dms\n", nLoaded,
              GetTimeMillis() - nStart);
}

void Chainstate::CheckBlockIndex() {
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
    for (auto &[_, block_index] : m_blockman.m_block_index) {
        forward.emplace(block_index.pprev, &block_index);
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
        // Assumed-valid index entries will not have data since we haven't
        // downloaded the full block yet.
        if (pindexFirstMissing == nullptr && !pindex->nStatus.hasData() &&
            !pindex->IsAssumedValid()) {
            pindexFirstMissing = pindex;
        }
        if (pindexFirstNeverProcessed == nullptr && pindex->nTx == 0) {
            pindexFirstNeverProcessed = pindex;
        }
        if (pindex->pprev != nullptr && pindexFirstNotTreeValid == nullptr &&
            pindex->nStatus.getValidity() < BlockValidity::TREE) {
            pindexFirstNotTreeValid = pindex;
        }
        if (pindex->pprev != nullptr && !pindex->IsAssumedValid()) {
            if (pindexFirstNotTransactionsValid == nullptr &&
                pindex->nStatus.getValidity() < BlockValidity::TRANSACTIONS) {
                pindexFirstNotTransactionsValid = pindex;
            }
            if (pindexFirstNotChainValid == nullptr &&
                pindex->nStatus.getValidity() < BlockValidity::CHAIN) {
                pindexFirstNotChainValid = pindex;
            }
            if (pindexFirstNotScriptsValid == nullptr &&
                pindex->nStatus.getValidity() < BlockValidity::SCRIPTS) {
                pindexFirstNotScriptsValid = pindex;
            }
        }

        // Begin: actual consistency checks.
        if (pindex->pprev == nullptr) {
            // Genesis block checks.
            // Genesis block's hash must match.
            assert(pindex->GetBlockHash() ==
                   m_params.GetConsensus().hashGenesisBlock);
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
        // Unless these indexes are assumed valid and pending block download on
        // a background chainstate.
        if (!m_blockman.m_have_pruned && !pindex->IsAssumedValid()) {
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
        if (pindex->IsAssumedValid()) {
            // Assumed-valid blocks should have some nTx value.
            assert(pindex->nTx > 0);
            // Assumed-valid blocks should connect to the main chain.
            assert(pindex->nStatus.getValidity() >= BlockValidity::TREE);
        } else {
            // Otherwise there should only be an nTx value if we have
            // actually seen a block's transactions.
            // This is pruning-independent.
            assert((pindex->nStatus.getValidity() >=
                    BlockValidity::TRANSACTIONS) == (pindex->nTx > 0));
        }
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
                // Don't perform this check for the background chainstate since
                // its setBlockIndexCandidates shouldn't have some entries (i.e.
                // those past the snapshot block) which do exist in the block
                // index for the active chainstate.
                if (this == &m_chainman.ActiveChainstate()) {
                    // If this block sorts at least as good as the current tip
                    // and is valid and we have all data for its parents, it
                    // must be in setBlockIndexCandidates or be parked.
                    if (pindexFirstMissing == nullptr) {
                        assert(pindex->nStatus.isOnParkedChain() ||
                               setBlockIndexCandidates.count(pindex));
                    }
                    // m_chain.Tip() must also be there even if some data has
                    // been pruned.
                    if (pindex == m_chain.Tip()) {
                        assert(setBlockIndexCandidates.count(pindex));
                    }
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
            assert(m_blockman.m_have_pruned);
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

std::string Chainstate::ToString() {
    AssertLockHeld(::cs_main);
    CBlockIndex *tip = m_chain.Tip();
    return strprintf("Chainstate [%s] @ height %d (%s)",
                     m_from_snapshot_blockhash ? "snapshot" : "ibd",
                     tip ? tip->nHeight : -1,
                     tip ? tip->GetBlockHash().ToString() : "null");
}

bool Chainstate::ResizeCoinsCaches(size_t coinstip_size, size_t coinsdb_size) {
    AssertLockHeld(::cs_main);
    if (coinstip_size == m_coinstip_cache_size_bytes &&
        coinsdb_size == m_coinsdb_cache_size_bytes) {
        // Cache sizes are unchanged, no need to continue.
        return true;
    }
    size_t old_coinstip_size = m_coinstip_cache_size_bytes;
    m_coinstip_cache_size_bytes = coinstip_size;
    m_coinsdb_cache_size_bytes = coinsdb_size;
    CoinsDB().ResizeCache(coinsdb_size);

    LogPrintf("[%s] resized coinsdb cache to %.1f MiB\n", this->ToString(),
              coinsdb_size * (1.0 / 1024 / 1024));
    LogPrintf("[%s] resized coinstip cache to %.1f MiB\n", this->ToString(),
              coinstip_size * (1.0 / 1024 / 1024));

    BlockValidationState state;
    bool ret;

    if (coinstip_size > old_coinstip_size) {
        // Likely no need to flush if cache sizes have grown.
        ret = FlushStateToDisk(state, FlushStateMode::IF_NEEDED);
    } else {
        // Otherwise, flush state to disk and deallocate the in-memory coins
        // map.
        ret = FlushStateToDisk(state, FlushStateMode::ALWAYS);
        CoinsTip().ReallocateCache();
    }
    return ret;
}

static const uint64_t MEMPOOL_DUMP_VERSION = 1;

bool LoadMempool(const Config &config, CTxMemPool &pool,
                 Chainstate &active_chainstate) {
    int64_t nExpiryTimeout =
        gArgs.GetIntArg("-mempoolexpiry", DEFAULT_MEMPOOL_EXPIRY) * 60 * 60;
    FILE *filestr =
        fsbridge::fopen(gArgs.GetDataDirNet() / "mempool.dat", "rb");
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
    int64_t unbroadcast = 0;
    int64_t nNow = GetTime();

    try {
        uint64_t version;
        file >> version;
        if (version != MEMPOOL_DUMP_VERSION) {
            return false;
        }

        uint64_t num;
        file >> num;
        while (num) {
            --num;
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
            if (nTime > nNow - nExpiryTimeout) {
                LOCK(cs_main);
                const auto &accepted =
                    AcceptToMemoryPool(config, active_chainstate, tx, nTime,
                                       /*bypass_limits=*/false,
                                       /*test_accept=*/false);
                if (accepted.m_result_type ==
                    MempoolAcceptResult::ResultType::VALID) {
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

        std::set<TxId> unbroadcast_txids;
        file >> unbroadcast_txids;
        unbroadcast = unbroadcast_txids.size();
        for (const auto &txid : unbroadcast_txids) {
            // Ensure transactions were accepted to mempool then add to
            // unbroadcast set.
            if (pool.get(txid) != nullptr) {
                pool.AddUnbroadcastTx(txid);
            }
        }
    } catch (const std::exception &e) {
        LogPrintf("Failed to deserialize mempool data on disk: %s. Continuing "
                  "anyway.\n",
                  e.what());
        return false;
    }

    LogPrintf("Imported mempool transactions from disk: %i succeeded, %i "
              "failed, %i expired, %i already there, %i waiting for initial "
              "broadcast\n",
              count, failed, expired, already_there, unbroadcast);
    return true;
}

bool DumpMempool(const CTxMemPool &pool) {
    int64_t start = GetTimeMicros();

    std::map<uint256, Amount> mapDeltas;
    std::vector<TxMempoolInfo> vinfo;
    std::set<TxId> unbroadcast_txids;

    static Mutex dump_mutex;
    LOCK(dump_mutex);

    {
        LOCK(pool.cs);
        for (const auto &i : pool.mapDeltas) {
            mapDeltas[i.first] = i.second;
        }

        vinfo = pool.infoAll();
        unbroadcast_txids = pool.GetUnbroadcastTxs();
    }

    int64_t mid = GetTimeMicros();

    try {
        FILE *filestr =
            fsbridge::fopen(gArgs.GetDataDirNet() / "mempool.dat.new", "wb");
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

        LogPrintf("Writing %d unbroadcast transactions to disk.\n",
                  unbroadcast_txids.size());
        file << unbroadcast_txids;

        if (!FileCommit(file.Get())) {
            throw std::runtime_error("FileCommit failed");
        }
        file.fclose();
        if (!RenameOver(gArgs.GetDataDirNet() / "mempool.dat.new",
                        gArgs.GetDataDirNet() / "mempool.dat")) {
            throw std::runtime_error("Rename failed");
        }
        int64_t last = GetTimeMicros();
        LogPrintf("Dumped mempool: %gs to copy, %gs to dump\n",
                  (mid - start) * MICRO, (last - mid) * MICRO);
    } catch (const std::exception &e) {
        LogPrintf("Failed to dump mempool: %s. Continuing anyway.\n", e.what());
        return false;
    }
    return true;
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

    return std::min<double>(pindex->GetChainTxCount() / fTxTotal, 1.0);
}

std::optional<BlockHash> ChainstateManager::SnapshotBlockhash() const {
    LOCK(::cs_main);
    if (m_active_chainstate && m_active_chainstate->m_from_snapshot_blockhash) {
        // If a snapshot chainstate exists, it will always be our active.
        return m_active_chainstate->m_from_snapshot_blockhash;
    }
    return std::nullopt;
}

std::vector<Chainstate *> ChainstateManager::GetAll() {
    LOCK(::cs_main);
    std::vector<Chainstate *> out;

    for (Chainstate *pchainstate :
         {m_ibd_chainstate.get(), m_snapshot_chainstate.get()}) {
        if (this->IsUsable(pchainstate)) {
            out.push_back(pchainstate);
        }
    }

    return out;
}

Chainstate &ChainstateManager::InitializeChainstate(CTxMemPool *mempool) {
    AssertLockHeld(::cs_main);
    assert(!m_ibd_chainstate);
    assert(!m_active_chainstate);

    m_ibd_chainstate = std::make_unique<Chainstate>(mempool, m_blockman, *this);
    m_active_chainstate = m_ibd_chainstate.get();
    return *m_active_chainstate;
}

const AssumeutxoData *ExpectedAssumeutxo(const int height,
                                         const CChainParams &chainparams) {
    const MapAssumeutxo &valid_assumeutxos_map = chainparams.Assumeutxo();
    const auto assumeutxo_found = valid_assumeutxos_map.find(height);

    if (assumeutxo_found != valid_assumeutxos_map.end()) {
        return &assumeutxo_found->second;
    }
    return nullptr;
}

static bool DeleteCoinsDBFromDisk(const fs::path &db_path, bool is_snapshot)
    EXCLUSIVE_LOCKS_REQUIRED(::cs_main) {
    AssertLockHeld(::cs_main);

    if (is_snapshot) {
        fs::path base_blockhash_path =
            db_path / node::SNAPSHOT_BLOCKHASH_FILENAME;

        if (fs::exists(base_blockhash_path)) {
            bool removed = fs::remove(base_blockhash_path);
            if (!removed) {
                LogPrintf("[snapshot] failed to remove file %s\n",
                          fs::PathToString(base_blockhash_path));
            }
        } else {
            LogPrintf("[snapshot] snapshot chainstate dir being removed lacks "
                      "%s file\n",
                      fs::PathToString(node::SNAPSHOT_BLOCKHASH_FILENAME));
        }
    }

    std::string path_str = fs::PathToString(db_path);
    LogPrintf("Removing leveldb dir at %s\n", path_str);

    // We have to destruct before this call leveldb::DB in order to release the
    // db lock, otherwise `DestroyDB` will fail. See `leveldb::~DBImpl()`.
    const bool destroyed = dbwrapper::DestroyDB(path_str, {}).ok();

    if (!destroyed) {
        LogPrintf("error: leveldb DestroyDB call failed on %s\n", path_str);
    }

    // Datadir should be removed from filesystem; otherwise initialization may
    // detect it on subsequent statups and get confused.
    //
    // If the base_blockhash_path removal above fails in the case of snapshot
    // chainstates, this will return false since leveldb won't remove a
    // non-empty directory.
    return destroyed && !fs::exists(db_path);
}

bool ChainstateManager::ActivateSnapshot(AutoFile &coins_file,
                                         const SnapshotMetadata &metadata,
                                         bool in_memory) {
    BlockHash base_blockhash = metadata.m_base_blockhash;

    if (this->SnapshotBlockhash()) {
        LogPrintf("[snapshot] can't activate a snapshot-based chainstate more "
                  "than once\n");
        return false;
    }

    int64_t current_coinsdb_cache_size{0};
    int64_t current_coinstip_cache_size{0};

    // Cache percentages to allocate to each chainstate.
    //
    // These particular percentages don't matter so much since they will only be
    // relevant during snapshot activation; caches are rebalanced at the
    // conclusion of this function. We want to give (essentially) all available
    // cache capacity to the snapshot to aid the bulk load later in this
    // function.
    static constexpr double IBD_CACHE_PERC = 0.01;
    static constexpr double SNAPSHOT_CACHE_PERC = 0.99;

    {
        LOCK(::cs_main);
        // Resize the coins caches to ensure we're not exceeding memory limits.
        //
        // Allocate the majority of the cache to the incoming snapshot
        // chainstate, since (optimistically) getting to its tip will be the top
        // priority. We'll need to call `MaybeRebalanceCaches()` once we're done
        // with this function to ensure the right allocation (including the
        // possibility that no snapshot was activated and that we should restore
        // the active chainstate caches to their original size).
        //
        current_coinsdb_cache_size =
            this->ActiveChainstate().m_coinsdb_cache_size_bytes;
        current_coinstip_cache_size =
            this->ActiveChainstate().m_coinstip_cache_size_bytes;

        // Temporarily resize the active coins cache to make room for the
        // newly-created snapshot chain.
        this->ActiveChainstate().ResizeCoinsCaches(
            static_cast<size_t>(current_coinstip_cache_size * IBD_CACHE_PERC),
            static_cast<size_t>(current_coinsdb_cache_size * IBD_CACHE_PERC));
    }

    auto snapshot_chainstate =
        WITH_LOCK(::cs_main, return std::make_unique<Chainstate>(
                                 /* mempool */ nullptr, m_blockman, *this,
                                 base_blockhash));

    {
        LOCK(::cs_main);
        snapshot_chainstate->InitCoinsDB(
            static_cast<size_t>(current_coinsdb_cache_size *
                                SNAPSHOT_CACHE_PERC),
            in_memory, false, "chainstate");
        snapshot_chainstate->InitCoinsCache(static_cast<size_t>(
            current_coinstip_cache_size * SNAPSHOT_CACHE_PERC));
    }

    bool snapshot_ok = this->PopulateAndValidateSnapshot(*snapshot_chainstate,
                                                         coins_file, metadata);

    // If not in-memory, persist the base blockhash for use during subsequent
    // initialization.
    if (!in_memory) {
        LOCK(::cs_main);
        if (!node::WriteSnapshotBaseBlockhash(*snapshot_chainstate)) {
            snapshot_ok = false;
        }
    }
    if (!snapshot_ok) {
        LOCK(::cs_main);
        this->MaybeRebalanceCaches();

        // PopulateAndValidateSnapshot can return (in error) before the leveldb
        // datadir has been created, so only attempt removal if we got that far.
        if (auto snapshot_datadir = node::FindSnapshotChainstateDir()) {
            // We have to destruct leveldb::DB in order to release the db lock,
            // otherwise DestroyDB() (in DeleteCoinsDBFromDisk()) will fail. See
            // `leveldb::~DBImpl()`. Destructing the chainstate (and so
            // resetting the coinsviews object) does this.
            snapshot_chainstate.reset();
            bool removed =
                DeleteCoinsDBFromDisk(*snapshot_datadir, /*is_snapshot=*/true);
            if (!removed) {
                AbortNode(
                    strprintf("Failed to remove snapshot chainstate dir (%s). "
                              "Manually remove it before restarting.\n",
                              fs::PathToString(*snapshot_datadir)));
            }
        }
        return false;
    }

    {
        LOCK(::cs_main);
        assert(!m_snapshot_chainstate);
        m_snapshot_chainstate.swap(snapshot_chainstate);
        const bool chaintip_loaded = m_snapshot_chainstate->LoadChainTip();
        assert(chaintip_loaded);

        m_active_chainstate = m_snapshot_chainstate.get();

        LogPrintf("[snapshot] successfully activated snapshot %s\n",
                  base_blockhash.ToString());
        LogPrintf("[snapshot] (%.2f MB)\n",
                  m_snapshot_chainstate->CoinsTip().DynamicMemoryUsage() /
                      (1000 * 1000));

        this->MaybeRebalanceCaches();
    }
    return true;
}

static void FlushSnapshotToDisk(CCoinsViewCache &coins_cache,
                                bool snapshot_loaded) {
    LOG_TIME_MILLIS_WITH_CATEGORY_MSG_ONCE(
        strprintf("%s (%.2f MB)",
                  snapshot_loaded ? "saving snapshot chainstate"
                                  : "flushing coins cache",
                  coins_cache.DynamicMemoryUsage() / (1000 * 1000)),
        BCLog::LogFlags::ALL);

    coins_cache.Flush();
}

struct StopHashingException : public std::exception {
    const char *what() const throw() override {
        return "ComputeUTXOStats interrupted by shutdown.";
    }
};

static void SnapshotUTXOHashBreakpoint() {
    if (ShutdownRequested()) {
        throw StopHashingException();
    }
}

bool ChainstateManager::PopulateAndValidateSnapshot(
    Chainstate &snapshot_chainstate, AutoFile &coins_file,
    const SnapshotMetadata &metadata) {
    // It's okay to release cs_main before we're done using `coins_cache`
    // because we know that nothing else will be referencing the newly created
    // snapshot_chainstate yet.
    CCoinsViewCache &coins_cache =
        *WITH_LOCK(::cs_main, return &snapshot_chainstate.CoinsTip());

    BlockHash base_blockhash = metadata.m_base_blockhash;

    CBlockIndex *snapshot_start_block = WITH_LOCK(
        ::cs_main, return m_blockman.LookupBlockIndex(base_blockhash));

    if (!snapshot_start_block) {
        // Needed for ComputeUTXOStats and ExpectedAssumeutxo to determine the
        // height and to avoid a crash when base_blockhash.IsNull()
        LogPrintf("[snapshot] Did not find snapshot start blockheader %s\n",
                  base_blockhash.ToString());
        return false;
    }

    int base_height = snapshot_start_block->nHeight;
    auto maybe_au_data = ExpectedAssumeutxo(base_height, ::Params());

    if (!maybe_au_data) {
        LogPrintf("[snapshot] assumeutxo height in snapshot metadata not "
                  "recognized (%d) - refusing to load snapshot\n",
                  base_height);
        return false;
    }

    const AssumeutxoData &au_data = *maybe_au_data;

    COutPoint outpoint;
    Coin coin;
    const uint64_t coins_count = metadata.m_coins_count;
    uint64_t coins_left = metadata.m_coins_count;

    LogPrintf("[snapshot] loading coins from snapshot %s\n",
              base_blockhash.ToString());
    int64_t coins_processed{0};

    while (coins_left > 0) {
        try {
            coins_file >> outpoint;
            coins_file >> coin;
        } catch (const std::ios_base::failure &) {
            LogPrintf("[snapshot] bad snapshot format or truncated snapshot "
                      "after deserializing %d coins\n",
                      coins_count - coins_left);
            return false;
        }
        if (coin.GetHeight() > uint32_t(base_height) ||
            // Avoid integer wrap-around in coinstats.cpp:ApplyHash
            outpoint.GetN() >=
                std::numeric_limits<decltype(outpoint.GetN())>::max()) {
            LogPrintf(
                "[snapshot] bad snapshot data after deserializing %d coins\n",
                coins_count - coins_left);
            return false;
        }
        coins_cache.EmplaceCoinInternalDANGER(std::move(outpoint),
                                              std::move(coin));

        --coins_left;
        ++coins_processed;

        if (coins_processed % 1000000 == 0) {
            LogPrintf("[snapshot] %d coins loaded (%.2f%%, %.2f MB)\n",
                      coins_processed,
                      static_cast<float>(coins_processed) * 100 /
                          static_cast<float>(coins_count),
                      coins_cache.DynamicMemoryUsage() / (1000 * 1000));
        }

        // Batch write and flush (if we need to) every so often.
        //
        // If our average Coin size is roughly 41 bytes, checking every 120,000
        // coins means <5MB of memory imprecision.
        if (coins_processed % 120000 == 0) {
            if (ShutdownRequested()) {
                return false;
            }

            const auto snapshot_cache_state = WITH_LOCK(
                ::cs_main, return snapshot_chainstate.GetCoinsCacheSizeState());

            if (snapshot_cache_state >= CoinsCacheSizeState::CRITICAL) {
                // This is a hack - we don't know what the actual best block is,
                // but that doesn't matter for the purposes of flushing the
                // cache here. We'll set this to its correct value
                // (`base_blockhash`) below after the coins are loaded.
                coins_cache.SetBestBlock(BlockHash{GetRandHash()});

                // No need to acquire cs_main since this chainstate isn't being
                // used yet.
                FlushSnapshotToDisk(coins_cache, /*snapshot_loaded=*/false);
            }
        }
    }

    // Important that we set this. This and the coins_cache accesses above are
    // sort of a layer violation, but either we reach into the innards of
    // CCoinsViewCache here or we have to invert some of the Chainstate to
    // embed them in a snapshot-activation-specific CCoinsViewCache bulk load
    // method.
    coins_cache.SetBestBlock(base_blockhash);

    bool out_of_coins{false};
    try {
        coins_file >> outpoint;
    } catch (const std::ios_base::failure &) {
        // We expect an exception since we should be out of coins.
        out_of_coins = true;
    }
    if (!out_of_coins) {
        LogPrintf("[snapshot] bad snapshot - coins left over after "
                  "deserializing %d coins\n",
                  coins_count);
        return false;
    }

    LogPrintf("[snapshot] loaded %d (%.2f MB) coins from snapshot %s\n",
              coins_count, coins_cache.DynamicMemoryUsage() / (1000 * 1000),
              base_blockhash.ToString());

    // No need to acquire cs_main since this chainstate isn't being used yet.
    FlushSnapshotToDisk(coins_cache, /*snapshot_loaded=*/true);

    assert(coins_cache.GetBestBlock() == base_blockhash);

    // As above, okay to immediately release cs_main here since no other context
    // knows about the snapshot_chainstate.
    CCoinsViewDB *snapshot_coinsdb =
        WITH_LOCK(::cs_main, return &snapshot_chainstate.CoinsDB());

    std::optional<CCoinsStats> maybe_stats;

    try {
        maybe_stats = ComputeUTXOStats(CoinStatsHashType::HASH_SERIALIZED,
                                       snapshot_coinsdb, m_blockman,
                                       SnapshotUTXOHashBreakpoint);
    } catch (StopHashingException const &) {
        return false;
    }
    if (!maybe_stats.has_value()) {
        LogPrintf("[snapshot] failed to generate coins stats\n");
        return false;
    }

    // Assert that the deserialized chainstate contents match the expected
    // assumeutxo value.
    if (AssumeutxoHash{maybe_stats->hashSerialized} !=
        au_data.hash_serialized) {
        LogPrintf("[snapshot] bad snapshot content hash: expected %s, got %s\n",
                  au_data.hash_serialized.ToString(),
                  maybe_stats->hashSerialized.ToString());
        return false;
    }

    snapshot_chainstate.m_chain.SetTip(snapshot_start_block);

    // The remainder of this function requires modifying data protected by
    // cs_main.
    LOCK(::cs_main);

    // Fake various pieces of CBlockIndex state:
    CBlockIndex *index = nullptr;

    // Don't make any modifications to the genesis block.
    // This is especially important because we don't want to erroneously
    // apply ASSUMED_VALID_FLAG to genesis, which would happen if we didn't
    // skip it here (since it apparently isn't BlockValidity::SCRIPTS).
    constexpr int AFTER_GENESIS_START{1};

    for (int i = AFTER_GENESIS_START; i <= snapshot_chainstate.m_chain.Height();
         ++i) {
        index = snapshot_chainstate.m_chain[i];

        // Fake nTx so that LoadBlockIndex() loads assumed-valid CBlockIndex
        // entries (among other things)
        if (!index->nTx) {
            index->nTx = 1;
        }
        // Fake nChainTx so that GuessVerificationProgress reports accurately
        index->nChainTx = index->pprev->nChainTx + index->nTx;

        // Mark unvalidated block index entries beneath the snapshot base block
        // as assumed-valid.
        if (!index->IsValid(BlockValidity::SCRIPTS)) {
            // This flag will be removed once the block is fully validated by a
            // background chainstate.
            index->nStatus = index->nStatus.withAssumedValid();
        }

        m_blockman.m_dirty_blockindex.insert(index);
        // Changes to the block index will be flushed to disk after this call
        // returns in `ActivateSnapshot()`, when `MaybeRebalanceCaches()` is
        // called, since we've added a snapshot chainstate and therefore will
        // have to downsize the IBD chainstate, which will result in a call to
        // `FlushStateToDisk(ALWAYS)`.
    }

    assert(index);
    index->nChainTx = au_data.nChainTx;
    snapshot_chainstate.setBlockIndexCandidates.insert(snapshot_start_block);

    LogPrintf("[snapshot] validated snapshot (%.2f MB)\n",
              coins_cache.DynamicMemoryUsage() / (1000 * 1000));
    return true;
}

// Currently, this function holds cs_main for its duration, which could be for
// multiple minutes due to the ComputeUTXOStats call. This hold is necessary
// because we need to avoid advancing the background validation chainstate
// farther than the snapshot base block - and this function is also invoked
// from within ConnectTip, i.e. from within ActivateBestChain, so cs_main is
// held anyway.
//
// Eventually (TODO), we could somehow separate this function's runtime from
// maintenance of the active chain, but that will either require
//
//  (i) setting `m_disabled` immediately and ensuring all chainstate accesses go
//      through IsUsable() checks, or
//
//  (ii) giving each chainstate its own lock instead of using cs_main for
//  everything.
SnapshotCompletionResult ChainstateManager::MaybeCompleteSnapshotValidation(
    std::function<void(bilingual_str)> shutdown_fnc) {
    AssertLockHeld(cs_main);
    if (m_ibd_chainstate.get() == &this->ActiveChainstate() ||
        !this->IsUsable(m_snapshot_chainstate.get()) ||
        !this->IsUsable(m_ibd_chainstate.get()) ||
        !m_ibd_chainstate->m_chain.Tip()) {
        // Nothing to do - this function only applies to the background
        // validation chainstate.
        return SnapshotCompletionResult::SKIPPED;
    }
    const int snapshot_tip_height = this->ActiveHeight();
    const int snapshot_base_height = *Assert(this->GetSnapshotBaseHeight());
    const CBlockIndex &index_new = *Assert(m_ibd_chainstate->m_chain.Tip());

    if (index_new.nHeight < snapshot_base_height) {
        // Background IBD not complete yet.
        return SnapshotCompletionResult::SKIPPED;
    }

    assert(SnapshotBlockhash());
    BlockHash snapshot_blockhash = *Assert(SnapshotBlockhash());

    auto handle_invalid_snapshot = [&]() EXCLUSIVE_LOCKS_REQUIRED(::cs_main) {
        bilingual_str user_error = strprintf(
            _("%s failed to validate the -assumeutxo snapshot state. "
              "This indicates a hardware problem, or a bug in the software, or "
              "a bad software modification that allowed an invalid snapshot to "
              "be loaded. As a result of this, the node will shut down and "
              "stop using any state that was built on the snapshot, resetting "
              "the chain height from %d to %d. On the next restart, the node "
              "will resume syncing from %d without using any snapshot data. "
              "Please report this incident to %s, including how you obtained "
              "the snapshot. The invalid snapshot chainstate has been left on "
              "disk in case it is helpful in diagnosing the issue that caused "
              "this error."),
            PACKAGE_NAME, snapshot_tip_height, snapshot_base_height,
            snapshot_base_height, PACKAGE_BUGREPORT);

        LogPrintf("[snapshot] !!! %s\n", user_error.original);
        LogPrintf("[snapshot] deleting snapshot, reverting to validated chain, "
                  "and stopping node\n");

        m_active_chainstate = m_ibd_chainstate.get();
        m_snapshot_chainstate->m_disabled = true;
        assert(!this->IsUsable(m_snapshot_chainstate.get()));
        assert(this->IsUsable(m_ibd_chainstate.get()));

        m_snapshot_chainstate->InvalidateCoinsDBOnDisk();

        shutdown_fnc(user_error);
    };

    if (index_new.GetBlockHash() != snapshot_blockhash) {
        LogPrintf(
            "[snapshot] supposed base block %s does not match the "
            "snapshot base block %s (height %d). Snapshot is not valid.\n",
            index_new.ToString(), snapshot_blockhash.ToString(),
            snapshot_base_height);
        handle_invalid_snapshot();
        return SnapshotCompletionResult::BASE_BLOCKHASH_MISMATCH;
    }

    assert(index_new.nHeight == snapshot_base_height);

    int curr_height = m_ibd_chainstate->m_chain.Height();

    assert(snapshot_base_height == curr_height);
    assert(snapshot_base_height == index_new.nHeight);
    assert(this->IsUsable(m_snapshot_chainstate.get()));
    assert(this->GetAll().size() == 2);

    CCoinsViewDB &ibd_coins_db = m_ibd_chainstate->CoinsDB();
    m_ibd_chainstate->ForceFlushStateToDisk();

    auto maybe_au_data = ExpectedAssumeutxo(curr_height, ::Params());
    if (!maybe_au_data) {
        LogPrintf("[snapshot] assumeutxo data not found for height "
                  "(%d) - refusing to validate snapshot\n",
                  curr_height);
        handle_invalid_snapshot();
        return SnapshotCompletionResult::MISSING_CHAINPARAMS;
    }

    const AssumeutxoData &au_data = *maybe_au_data;
    std::optional<CCoinsStats> maybe_ibd_stats;
    LogPrintf(
        "[snapshot] computing UTXO stats for background chainstate to validate "
        "snapshot - this could take a few minutes\n");
    try {
        maybe_ibd_stats =
            ComputeUTXOStats(CoinStatsHashType::HASH_SERIALIZED, &ibd_coins_db,
                             m_blockman, SnapshotUTXOHashBreakpoint);
    } catch (StopHashingException const &) {
        return SnapshotCompletionResult::STATS_FAILED;
    }

    if (!maybe_ibd_stats) {
        LogPrintf(
            "[snapshot] failed to generate stats for validation coins db\n");
        // While this isn't a problem with the snapshot per se, this condition
        // prevents us from validating the snapshot, so we should shut down and
        // let the user handle the issue manually.
        handle_invalid_snapshot();
        return SnapshotCompletionResult::STATS_FAILED;
    }
    const auto &ibd_stats = *maybe_ibd_stats;

    // Compare the background validation chainstate's UTXO set hash against the
    // hard-coded assumeutxo hash we expect.
    //
    // TODO: For belt-and-suspenders, we could cache the UTXO set
    // hash for the snapshot when it's loaded in its chainstate's leveldb. We
    // could then reference that here for an additional check.
    if (AssumeutxoHash{ibd_stats.hashSerialized} != au_data.hash_serialized) {
        LogPrintf("[snapshot] hash mismatch: actual=%s, expected=%s\n",
                  ibd_stats.hashSerialized.ToString(),
                  au_data.hash_serialized.ToString());
        handle_invalid_snapshot();
        return SnapshotCompletionResult::HASH_MISMATCH;
    }

    LogPrintf("[snapshot] snapshot beginning at %s has been fully validated\n",
              snapshot_blockhash.ToString());

    m_ibd_chainstate->m_disabled = true;
    this->MaybeRebalanceCaches();

    return SnapshotCompletionResult::SUCCESS;
}

Chainstate &ChainstateManager::ActiveChainstate() const {
    LOCK(::cs_main);
    assert(m_active_chainstate);
    return *m_active_chainstate;
}

bool ChainstateManager::IsSnapshotActive() const {
    LOCK(::cs_main);
    return m_snapshot_chainstate &&
           m_active_chainstate == m_snapshot_chainstate.get();
}
void ChainstateManager::MaybeRebalanceCaches() {
    AssertLockHeld(::cs_main);
    bool ibd_usable = this->IsUsable(m_ibd_chainstate.get());
    bool snapshot_usable = this->IsUsable(m_snapshot_chainstate.get());
    assert(ibd_usable || snapshot_usable);

    if (ibd_usable && !snapshot_usable) {
        LogPrintf("[snapshot] allocating all cache to the IBD chainstate\n");
        // Allocate everything to the IBD chainstate.
        m_ibd_chainstate->ResizeCoinsCaches(m_total_coinstip_cache,
                                            m_total_coinsdb_cache);
    } else if (snapshot_usable && !ibd_usable) {
        // If background validation has completed and snapshot is our active
        // chain...
        LogPrintf(
            "[snapshot] allocating all cache to the snapshot chainstate\n");
        // Allocate everything to the snapshot chainstate.
        m_snapshot_chainstate->ResizeCoinsCaches(m_total_coinstip_cache,
                                                 m_total_coinsdb_cache);
    } else if (ibd_usable && snapshot_usable) {
        // If both chainstates exist, determine who needs more cache based on
        // IBD status.
        //
        // Note: shrink caches first so that we don't inadvertently overwhelm
        // available memory.
        if (m_snapshot_chainstate->IsInitialBlockDownload()) {
            m_ibd_chainstate->ResizeCoinsCaches(m_total_coinstip_cache * 0.05,
                                                m_total_coinsdb_cache * 0.05);
            m_snapshot_chainstate->ResizeCoinsCaches(
                m_total_coinstip_cache * 0.95, m_total_coinsdb_cache * 0.95);
        } else {
            m_snapshot_chainstate->ResizeCoinsCaches(
                m_total_coinstip_cache * 0.05, m_total_coinsdb_cache * 0.05);
            m_ibd_chainstate->ResizeCoinsCaches(m_total_coinstip_cache * 0.95,
                                                m_total_coinsdb_cache * 0.95);
        }
    }
}

void ChainstateManager::ResetChainstates() {
    m_ibd_chainstate.reset();
    m_snapshot_chainstate.reset();
    m_active_chainstate = nullptr;
}

bool ChainstateManager::DetectSnapshotChainstate(CTxMemPool *mempool) {
    assert(!m_snapshot_chainstate);
    std::optional<fs::path> path = node::FindSnapshotChainstateDir();
    if (!path) {
        return false;
    }
    std::optional<BlockHash> base_blockhash =
        node::ReadSnapshotBaseBlockhash(*path);
    if (!base_blockhash) {
        return false;
    }
    LogPrintf("[snapshot] detected active snapshot chainstate (%s) - loading\n",
              fs::PathToString(*path));

    this->ActivateExistingSnapshot(mempool, *base_blockhash);
    return true;
}

Chainstate &
ChainstateManager::ActivateExistingSnapshot(CTxMemPool *mempool,
                                            BlockHash base_blockhash) {
    assert(!m_snapshot_chainstate);
    m_snapshot_chainstate = std::make_unique<Chainstate>(mempool, m_blockman,
                                                         *this, base_blockhash);
    LogPrintf("[snapshot] switching active chainstate to %s\n",
              m_snapshot_chainstate->ToString());
    m_active_chainstate = m_snapshot_chainstate.get();
    return *m_snapshot_chainstate;
}

void Chainstate::InvalidateCoinsDBOnDisk() {
    AssertLockHeld(::cs_main);
    // Should never be called on a non-snapshot chainstate.
    assert(m_from_snapshot_blockhash);
    auto storage_path_maybe = this->CoinsDB().StoragePath();
    // Should never be called with a non-existent storage path.
    assert(storage_path_maybe);
    fs::path snapshot_datadir = *storage_path_maybe;

    // Coins views no longer usable.
    m_coins_views.reset();

    auto invalid_path = snapshot_datadir + "_INVALID";
    std::string dbpath = fs::PathToString(snapshot_datadir);
    std::string target = fs::PathToString(invalid_path);
    LogPrintf("[snapshot] renaming snapshot datadir %s to %s\n", dbpath,
              target);

    // The invalid snapshot datadir is simply moved and not deleted because we
    // may want to do forensics later during issue investigation. The user is
    // instructed accordingly in MaybeCompleteSnapshotValidation().
    try {
        fs::rename(snapshot_datadir, invalid_path);
    } catch (const fs::filesystem_error &e) {
        auto src_str = fs::PathToString(snapshot_datadir);
        auto dest_str = fs::PathToString(invalid_path);

        LogPrintf("%s: error renaming file '%s' -> '%s': %s\n", __func__,
                  src_str, dest_str, e.what());
        AbortNode(strprintf("Rename of '%s' -> '%s' failed. "
                            "You should resolve this by manually moving or "
                            "deleting the invalid "
                            "snapshot directory %s, otherwise you will "
                            "encounter the same error again "
                            "on the next startup.",
                            src_str, dest_str, src_str));
    }
}

const CBlockIndex *ChainstateManager::GetSnapshotBaseBlock() const {
    const auto blockhash_op = this->SnapshotBlockhash();
    if (!blockhash_op) {
        return nullptr;
    }
    return Assert(m_blockman.LookupBlockIndex(*blockhash_op));
}

std::optional<int> ChainstateManager::GetSnapshotBaseHeight() const {
    const CBlockIndex *base = this->GetSnapshotBaseBlock();
    return base ? std::make_optional(base->nHeight) : std::nullopt;
}

bool ChainstateManager::ValidatedSnapshotCleanup() {
    AssertLockHeld(::cs_main);
    auto get_storage_path = [](auto &chainstate) EXCLUSIVE_LOCKS_REQUIRED(
                                ::cs_main) -> std::optional<fs::path> {
        if (!(chainstate && chainstate->HasCoinsViews())) {
            return {};
        }
        return chainstate->CoinsDB().StoragePath();
    };
    std::optional<fs::path> ibd_chainstate_path_maybe =
        get_storage_path(m_ibd_chainstate);
    std::optional<fs::path> snapshot_chainstate_path_maybe =
        get_storage_path(m_snapshot_chainstate);

    if (!this->IsSnapshotValidated()) {
        // No need to clean up.
        return false;
    }
    // If either path doesn't exist, that means at least one of the chainstates
    // is in-memory, in which case we can't do on-disk cleanup. You'd better be
    // in a unittest!
    if (!ibd_chainstate_path_maybe || !snapshot_chainstate_path_maybe) {
        LogPrintf("[snapshot] snapshot chainstate cleanup cannot happen with "
                  "in-memory chainstates. You are testing, right?\n");
        return false;
    }

    const auto &snapshot_chainstate_path = *snapshot_chainstate_path_maybe;
    const auto &ibd_chainstate_path = *ibd_chainstate_path_maybe;

    // Since we're going to be moving around the underlying leveldb filesystem
    // content for each chainstate, make sure that the chainstates (and their
    // constituent CoinsViews members) have been destructed first.
    //
    // The caller of this method will be responsible for reinitializing
    // chainstates if they want to continue operation.
    this->ResetChainstates();

    // No chainstates should be considered usable.
    assert(this->GetAll().size() == 0);

    LogPrintf("[snapshot] deleting background chainstate directory (now "
              "unnecessary) (%s)\n",
              fs::PathToString(ibd_chainstate_path));

    fs::path tmp_old{ibd_chainstate_path + "_todelete"};

    auto rename_failed_abort = [](fs::path p_old, fs::path p_new,
                                  const fs::filesystem_error &err) {
        LogPrintf("Error renaming file (%s): %s\n", fs::PathToString(p_old),
                  err.what());
        AbortNode(strprintf(
            "Rename of '%s' -> '%s' failed. "
            "Cannot clean up the background chainstate leveldb directory.",
            fs::PathToString(p_old), fs::PathToString(p_new)));
    };

    try {
        fs::rename(ibd_chainstate_path, tmp_old);
    } catch (const fs::filesystem_error &e) {
        rename_failed_abort(ibd_chainstate_path, tmp_old, e);
        throw;
    }

    LogPrintf("[snapshot] moving snapshot chainstate (%s) to "
              "default chainstate directory (%s)\n",
              fs::PathToString(snapshot_chainstate_path),
              fs::PathToString(ibd_chainstate_path));

    try {
        fs::rename(snapshot_chainstate_path, ibd_chainstate_path);
    } catch (const fs::filesystem_error &e) {
        rename_failed_abort(snapshot_chainstate_path, ibd_chainstate_path, e);
        throw;
    }

    if (!DeleteCoinsDBFromDisk(tmp_old, /*is_snapshot=*/false)) {
        // No need to AbortNode because once the unneeded bg chainstate data is
        // moved, it will not interfere with subsequent initialization.
        LogPrintf("Deletion of %s failed. Please remove it manually, as the "
                  "directory is now unnecessary.\n",
                  fs::PathToString(tmp_old));
    } else {
        LogPrintf("[snapshot] deleted background chainstate directory (%s)\n",
                  fs::PathToString(ibd_chainstate_path));
    }
    return true;
}
