// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2019 The Bitcoin Core developers
// Copyright (c) 2017-2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_VALIDATION_H
#define BITCOIN_VALIDATION_H

#if defined(HAVE_CONFIG_H)
#include <config/bitcoin-config.h>
#endif

#include <arith_uint256.h>
#include <attributes.h>
#include <blockfileinfo.h>
#include <blockindexcomparators.h>
#include <chain.h>
#include <common/bloom.h>
#include <config.h>
#include <consensus/amount.h>
#include <consensus/consensus.h>
#include <deploymentstatus.h>
#include <disconnectresult.h>
#include <flatfile.h>
#include <kernel/chain.h>
#include <kernel/chainparams.h>
#include <kernel/chainstatemanager_opts.h>
#include <kernel/cs_main.h>
#include <node/blockstorage.h>
#include <policy/packages.h>
#include <script/script_error.h>
#include <script/script_metrics.h>
#include <shutdown.h>
#include <sync.h>
#include <txdb.h>
#include <txmempool.h> // For CTxMemPool::cs
#include <uint256.h>
#include <util/check.h>
#include <util/fs.h>
#include <util/result.h>
#include <util/translation.h>

#include <atomic>
#include <cstdint>
#include <map>
#include <memory>
#include <optional>
#include <set>
#include <string>
#include <thread>
#include <type_traits>
#include <utility>
#include <vector>

class BlockPolicyValidationState;
class CChainParams;
class Chainstate;
class ChainstateManager;
class CScriptCheck;
class CTxMemPool;
class CTxUndo;
class DisconnectedBlockTransactions;

struct ChainTxData;
struct FlatFilePos;
struct PrecomputedTransactionData;
struct LockPoints;
struct AssumeutxoData;
namespace node {
class SnapshotMetadata;
} // namespace node
namespace Consensus {
struct Params;
} // namespace Consensus
namespace avalanche {
class Processor;
} // namespace avalanche

#define MIN_TRANSACTION_SIZE                                                   \
    (::GetSerializeSize(CTransaction(), PROTOCOL_VERSION))

/** Maximum number of dedicated script-checking threads allowed */
static const int MAX_SCRIPTCHECK_THREADS = 15;
/** -par default (number of script-checking threads, 0 = auto) */
static const int DEFAULT_SCRIPTCHECK_THREADS = 0;

static const bool DEFAULT_PEERBLOOMFILTERS = true;

/** Default for -stopatheight */
static const int DEFAULT_STOPATHEIGHT = 0;
/**
 * Block files containing a block-height within MIN_BLOCKS_TO_KEEP of
 * ActiveChain().Tip() will not be pruned.
 */
static const unsigned int MIN_BLOCKS_TO_KEEP = 288;
static const signed int DEFAULT_CHECKBLOCKS = 6;
static constexpr int DEFAULT_CHECKLEVEL{3};
/**
 * Require that user allocate at least 550 MiB for block & undo files
 * (blk???.dat and rev???.dat)
 * At 1MB per block, 288 blocks = 288MB.
 * Add 15% for Undo data = 331MB
 * Add 20% for Orphan block rate = 397MB
 * We want the low water mark after pruning to be at least 397 MB and since we
 * prune in full block file chunks, we need the high water mark which triggers
 * the prune to be one 128MB block file + added 15% undo data = 147MB greater
 * for a total of 545MB
 * Setting the target to >= 550 MiB will make it likely we can respect the
 * target.
 */
static const uint64_t MIN_DISK_SPACE_FOR_BLOCK_FILES = 550 * 1024 * 1024;

/** Current sync state passed to tip changed callbacks. */
enum class SynchronizationState { INIT_REINDEX, INIT_DOWNLOAD, POST_INIT };

extern GlobalMutex g_best_block_mutex;
extern std::condition_variable g_best_block_cv;
/** Used to notify getblocktemplate RPC of new tips. */
extern const CBlockIndex *g_best_block;

/** Documentation for argument 'checklevel'. */
extern const std::vector<std::string> CHECKLEVEL_DOC;

class BlockValidationOptions {
private:
    uint64_t excessiveBlockSize;
    bool checkPoW : 1;
    bool checkMerkleRoot : 1;

public:
    // Do full validation by default
    explicit BlockValidationOptions(const Config &config);
    explicit BlockValidationOptions(uint64_t _excessiveBlockSize,
                                    bool _checkPow = true,
                                    bool _checkMerkleRoot = true)
        : excessiveBlockSize(_excessiveBlockSize), checkPoW(_checkPow),
          checkMerkleRoot(_checkMerkleRoot) {}

    BlockValidationOptions withCheckPoW(bool _checkPoW = true) const {
        BlockValidationOptions ret = *this;
        ret.checkPoW = _checkPoW;
        return ret;
    }

    BlockValidationOptions
    withCheckMerkleRoot(bool _checkMerkleRoot = true) const {
        BlockValidationOptions ret = *this;
        ret.checkMerkleRoot = _checkMerkleRoot;
        return ret;
    }

    bool shouldValidatePoW() const { return checkPoW; }
    bool shouldValidateMerkleRoot() const { return checkMerkleRoot; }
    uint64_t getExcessiveBlockSize() const { return excessiveBlockSize; }
};

/**
 * Run instances of script checking worker threads
 */
void StartScriptCheckWorkerThreads(int threads_num);

/**
 * Stop all of the script checking worker threads
 */
void StopScriptCheckWorkerThreads();

Amount GetBlockSubsidy(int nHeight, const Consensus::Params &consensusParams);

bool AbortNode(BlockValidationState &state, const std::string &strMessage,
               const bilingual_str &userMessage = bilingual_str{});

/**
 * Guess verification progress (as a fraction between 0.0=genesis and
 * 1.0=current tip).
 */
double GuessVerificationProgress(const ChainTxData &data,
                                 const CBlockIndex *pindex);

/** Prune block files up to a given height */
void PruneBlockFilesManual(Chainstate &active_chainstate,
                           int nManualPruneHeight);

// clang-format off
/**
 * Validation result for a transaction evaluated by MemPoolAccept (single or
 * package).
 * Here are the expected fields and properties of a result depending on its
 * ResultType, applicable to results returned from package evaluation:
 *+--------------------------+-----------+-------------------------------------------+---------------+
 *| Field or property        |   VALID   |                   INVALID                 | MEMPOOL_ENTRY |
 *|                          |           |-------------------------------------------|               |
 *|                          |           | TX_PACKAGE_RECONSIDERABLE |    Other      |               |
 *+--------------------------+-----------+---------------------------+---------------+---------------+
 *| txid in mempool?         | yes       | no                        | no*           | yes           |
 *| m_state                  | IsValid() | IsInvalid()               | IsInvalid()   | IsValid()     |
 *| m_replaced_transactions  | yes       | no                        | no            | no            |
 *| m_vsize                  | yes       | no                        | no            | yes           |
 *| m_base_fees              | yes       | no                        | no            | yes           |
 *| m_effective_feerate      | yes       | yes                       | no            | no            |
 *| m_txids_fee_calculations | yes       | yes                       | no            | no            |
 *+--------------------------+-----------+---------------------------+---------------+---------------+
 * (*) Individual transaction acceptance doesn't return MEMPOOL_ENTRY. It
 * returns INVALID, with the error txn-already-in-mempool. In this case, the
 * txid may be in the mempool for a tx conflict (TX_AVALANCHE_RECONSIDERABLE).
 */
// clang-format on
struct MempoolAcceptResult {
    /** Used to indicate the results of mempool validation. */
    enum class ResultType {
        //! Fully validated, valid.
        VALID,
        //! Invalid.
        INVALID,
        //! Valid, transaction was already in the mempool.
        MEMPOOL_ENTRY,
    };
    /** Result type. Present in all MempoolAcceptResults. */
    const ResultType m_result_type;

    /** Contains information about why the transaction failed. */
    const TxValidationState m_state;

    /**
     * Virtual size as used by the mempool, calculated using serialized size
     * and sigchecks.
     */
    const std::optional<int64_t> m_vsize;
    /** Raw base fees in satoshis. */
    const std::optional<Amount> m_base_fees;
    /**
     * The feerate at which this transaction was considered. This includes any
     * fee delta added using prioritisetransaction (i.e. modified fees). If this
     * transaction was submitted as a package, this is the package feerate,
     * which may also include its descendants and/or ancestors
     * (see m_txids_fee_calculations below).
     */
    const std::optional<CFeeRate> m_effective_feerate;
    /**
     * Contains the txids of the transactions used for fee-related checks.
     * Includes this transaction's txid and may include others if this
     * transaction was validated as part of a package. This is not necessarily
     * equivalent to the list of transactions passed to ProcessNewPackage().
     */
    const std::optional<std::vector<TxId>> m_txids_fee_calculations;

    static MempoolAcceptResult Failure(TxValidationState state) {
        return MempoolAcceptResult(state);
    }

    static MempoolAcceptResult
    FeeFailure(TxValidationState state, CFeeRate effective_feerate,
               const std::vector<TxId> &txids_fee_calculations) {
        return MempoolAcceptResult(state, effective_feerate,
                                   txids_fee_calculations);
    }

    /** Constructor for success case */
    static MempoolAcceptResult
    Success(int64_t vsize, Amount fees, CFeeRate effective_feerate,
            const std::vector<TxId> &txids_fee_calculations) {
        return MempoolAcceptResult(ResultType::VALID, vsize, fees,
                                   effective_feerate, txids_fee_calculations);
    }

    /**
     * Constructor for already-in-mempool case. It wouldn't replace any
     * transactions.
     */
    static MempoolAcceptResult MempoolTx(int64_t vsize, Amount fees) {
        return MempoolAcceptResult(vsize, fees);
    }

    // Private constructors. Use static methods MempoolAcceptResult::Success,
    // etc. to construct.
private:
    /** Constructor for failure case */
    explicit MempoolAcceptResult(TxValidationState state)
        : m_result_type(ResultType::INVALID), m_state(state),
          m_base_fees(std::nullopt) {
        // Can be invalid or error
        Assume(!state.IsValid());
    }

    /** Generic constructor for success cases */
    explicit MempoolAcceptResult(
        ResultType result_type, int64_t vsize, Amount fees,
        CFeeRate effective_feerate,
        const std::vector<TxId> &txids_fee_calculations)
        : m_result_type(result_type), m_vsize{vsize}, m_base_fees(fees),
          m_effective_feerate(effective_feerate),
          m_txids_fee_calculations(txids_fee_calculations) {}

    /** Constructor for fee-related failure case */
    explicit MempoolAcceptResult(
        TxValidationState state, CFeeRate effective_feerate,
        const std::vector<TxId> &txids_fee_calculations)
        : m_result_type(ResultType::INVALID), m_state(state),
          m_effective_feerate(effective_feerate),
          m_txids_fee_calculations(txids_fee_calculations) {}

    /** Constructor for already-in-mempool case. */
    explicit MempoolAcceptResult(int64_t vsize, Amount fees)
        : m_result_type(ResultType::MEMPOOL_ENTRY), m_vsize{vsize},
          m_base_fees(fees) {}
};

/**
 * Validation result for package mempool acceptance.
 */
struct PackageMempoolAcceptResult {
    PackageValidationState m_state;
    /**
     * Map from txid to finished MempoolAcceptResults. The client is
     * responsible for keeping track of the transaction objects themselves.
     * If a result is not present, it means validation was unfinished for that
     * transaction. If there was a package-wide error (see result in m_state),
     * m_tx_results will be empty.
     */
    std::map<TxId, MempoolAcceptResult> m_tx_results;

    explicit PackageMempoolAcceptResult(
        PackageValidationState state,
        std::map<TxId, MempoolAcceptResult> &&results)
        : m_state{state}, m_tx_results(std::move(results)) {}

    /**
     * Constructor to create a PackageMempoolAcceptResult from a
     * MempoolAcceptResult
     */
    explicit PackageMempoolAcceptResult(const TxId &txid,
                                        const MempoolAcceptResult &result)
        : m_tx_results{{txid, result}} {}
};

/**
 * Try to add a transaction to the mempool. This is an internal function and is
 * exposed only for testing. Client code should use
 * ChainstateManager::ProcessTransaction()
 *
 * @param[in]  active_chainstate  Reference to the active chainstate.
 * @param[in]  tx                 The transaction to submit for mempool
 *                                acceptance.
 * @param[in]  accept_time        The timestamp for adding the transaction to
 *                                the mempool.
 *                                It is also used to determine when the entry
 *                                expires.
 * @param[in]  bypass_limits      When true, don't enforce mempool fee and
 *                                capacity limits.
 * @param[in]  test_accept        When true, run validation checks but don't
 *                                submit to mempool.
 * @param[in]  heightOverride     Override the block height of the transaction.
 *                                Used only upon reorg.
 *
 * @returns a MempoolAcceptResult indicating whether the transaction was
 *     accepted/rejected with reason.
 */
MempoolAcceptResult
AcceptToMemoryPool(Chainstate &active_chainstate, const CTransactionRef &tx,
                   int64_t accept_time, bool bypass_limits,
                   bool test_accept = false, unsigned int heightOverride = 0)
    EXCLUSIVE_LOCKS_REQUIRED(cs_main);

/**
 * Validate (and maybe submit) a package to the mempool.
 * See doc/policy/packages.md for full detailson package validation rules.
 *
 * @param[in]    test_accept     When true, run validation checks but don't
 *                               submit to mempool.
 * @returns a PackageMempoolAcceptResult which includes a MempoolAcceptResult
 *     for each transaction. If a transaction fails, validation will exit early
 *     and some results may be missing. It is also possible for the package to
 *     be partially submitted.
 */
PackageMempoolAcceptResult
ProcessNewPackage(Chainstate &active_chainstate, CTxMemPool &pool,
                  const Package &txns, bool test_accept)
    EXCLUSIVE_LOCKS_REQUIRED(cs_main);

/**
 * Simple class for regulating resource usage during CheckInputScripts (and
 * CScriptCheck), atomic so as to be compatible with parallel validation.
 */
class CheckInputsLimiter {
protected:
    std::atomic<int64_t> remaining;

public:
    explicit CheckInputsLimiter(int64_t limit) : remaining(limit) {}

    bool consume_and_check(int consumed) {
        auto newvalue = (remaining -= consumed);
        return newvalue >= 0;
    }

    bool check() { return remaining >= 0; }
};

class TxSigCheckLimiter : public CheckInputsLimiter {
public:
    TxSigCheckLimiter() : CheckInputsLimiter(MAX_TX_SIGCHECKS) {}

    // Let's make this bad boy copiable.
    TxSigCheckLimiter(const TxSigCheckLimiter &rhs)
        : CheckInputsLimiter(rhs.remaining.load()) {}

    TxSigCheckLimiter &operator=(const TxSigCheckLimiter &rhs) {
        remaining = rhs.remaining.load();
        return *this;
    }

    static TxSigCheckLimiter getDisabled() {
        TxSigCheckLimiter txLimiter;
        // Historically, there has not been a transaction with more than 20k sig
        // checks on testnet or mainnet, so this effectively disable sigchecks.
        txLimiter.remaining = 20000;
        return txLimiter;
    }
};

/**
 * Check whether all of this transaction's input scripts succeed.
 *
 * This involves ECDSA signature checks so can be computationally intensive.
 * This function should only be called after the cheap sanity checks in
 * CheckTxInputs passed.
 *
 * If pvChecks is not nullptr, script checks are pushed onto it instead of being
 * performed inline. Any script checks which are not necessary (eg due to script
 * execution cache hits) are, obviously, not pushed onto pvChecks/run.
 *
 * Upon success nSigChecksOut will be filled in with either:
 * - correct total for all inputs, or,
 * - 0, in the case when checks were pushed onto pvChecks (i.e., a cache miss
 * with pvChecks non-null), in which case the total can be found by executing
 * pvChecks and adding the results.
 *
 * Setting sigCacheStore/scriptCacheStore to false will remove elements from the
 * corresponding cache which are matched. This is useful for checking blocks
 * where we will likely never need the cache entry again.
 *
 * pLimitSigChecks can be passed to limit the sigchecks count either in parallel
 * or serial validation. With pvChecks null (serial validation), breaking the
 * pLimitSigChecks limit will abort evaluation early and return false. With
 * pvChecks not-null (parallel validation): the cached nSigChecks may itself
 * break the limit in which case false is returned, OR, each entry in the
 * returned pvChecks must be executed exactly once in order to probe the limit
 * accurately.
 */
bool CheckInputScripts(const CTransaction &tx, TxValidationState &state,
                       const CCoinsViewCache &view, const uint32_t flags,
                       bool sigCacheStore, bool scriptCacheStore,
                       const PrecomputedTransactionData &txdata,
                       int &nSigChecksOut, TxSigCheckLimiter &txLimitSigChecks,
                       CheckInputsLimiter *pBlockLimitSigChecks,
                       std::vector<CScriptCheck> *pvChecks)
    EXCLUSIVE_LOCKS_REQUIRED(cs_main);

/**
 * Handy shortcut to full fledged CheckInputScripts call.
 */
static inline bool
CheckInputScripts(const CTransaction &tx, TxValidationState &state,
                  const CCoinsViewCache &view, const uint32_t flags,
                  bool sigCacheStore, bool scriptCacheStore,
                  const PrecomputedTransactionData &txdata, int &nSigChecksOut)
    EXCLUSIVE_LOCKS_REQUIRED(cs_main) {
    TxSigCheckLimiter nSigChecksTxLimiter;
    return CheckInputScripts(tx, state, view, flags, sigCacheStore,
                             scriptCacheStore, txdata, nSigChecksOut,
                             nSigChecksTxLimiter, nullptr, nullptr);
}

/**
 * Mark all the coins corresponding to a given transaction inputs as spent.
 */
void SpendCoins(CCoinsViewCache &view, const CTransaction &tx, CTxUndo &txundo,
                int nHeight);

/**
 * Apply the effects of this transaction on the UTXO set represented by view.
 */
void UpdateCoins(CCoinsViewCache &view, const CTransaction &tx, CTxUndo &txundo,
                 int nHeight);

/**
 * Get the coins spent by ptx from the coins_view. Assumes coins are present.
 */
std::vector<Coin> GetSpentCoins(const CTransactionRef &ptx,
                                const CCoinsViewCache &coins_view);

/**
 * Calculate LockPoints required to check if transaction will be BIP68 final in
 * the next block to be created on top of tip.
 *
 * @param[in]   tip             Chain tip for which tx sequence locks are
 *     calculated. For example, the tip of the current active chain.
 * @param[in]   coins_view      Any CCoinsView that provides access to the
 *     relevant coins for checking sequence locks. For example, it can be a
 *     CCoinsViewCache that isn't connected to anything but contains all the
 *     relevant coins, or a CCoinsViewMemPool that is connected to the mempool
 *     and chainstate UTXO set. In the latter case, the caller is responsible
 *     for holding the appropriate locks to ensure that calls to GetCoin()
 *     return correct coins.
 * @param[in]   tx              The transaction being evaluated.
 *
 * @returns The resulting height and time calculated and the hash of the block
 *          needed for calculation, or std::nullopt if there is an error.
 */
std::optional<LockPoints> CalculateLockPointsAtTip(CBlockIndex *tip,
                                                   const CCoinsView &coins_view,
                                                   const CTransaction &tx);

/**
 * Check if transaction will be BIP68 final in the next block to be created on
 * top of tip.
 * @param[in]   tip             Chain tip to check tx sequence locks against.
 *     For example, the tip of the current active chain.
 * @param[in]   lock_points     LockPoints containing the height and time at
 *     which this transaction is final.
 * Simulates calling SequenceLocks() with data from the tip passed in.
 */
bool CheckSequenceLocksAtTip(CBlockIndex *tip, const LockPoints &lock_points);

/**
 * Closure representing one script verification.
 * Note that this stores references to the spending transaction.
 *
 * Note that if pLimitSigChecks is passed, then failure does not imply that
 * scripts have failed.
 */
class CScriptCheck {
private:
    CTxOut m_tx_out;
    const CTransaction *ptxTo;
    unsigned int nIn;
    uint32_t nFlags;
    bool cacheStore;
    ScriptError error{ScriptError::UNKNOWN};
    ScriptExecutionMetrics metrics;
    PrecomputedTransactionData txdata;
    TxSigCheckLimiter *pTxLimitSigChecks;
    CheckInputsLimiter *pBlockLimitSigChecks;

public:
    CScriptCheck(const CTxOut &outIn, const CTransaction &txToIn,
                 unsigned int nInIn, uint32_t nFlagsIn, bool cacheIn,
                 const PrecomputedTransactionData &txdataIn,
                 TxSigCheckLimiter *pTxLimitSigChecksIn = nullptr,
                 CheckInputsLimiter *pBlockLimitSigChecksIn = nullptr)
        : m_tx_out(outIn), ptxTo(&txToIn), nIn(nInIn), nFlags(nFlagsIn),
          cacheStore(cacheIn), txdata(txdataIn),
          pTxLimitSigChecks(pTxLimitSigChecksIn),
          pBlockLimitSigChecks(pBlockLimitSigChecksIn) {}

    CScriptCheck(const CScriptCheck &) = delete;
    CScriptCheck &operator=(const CScriptCheck &) = delete;
    CScriptCheck(CScriptCheck &&) = default;
    CScriptCheck &operator=(CScriptCheck &&) = default;

    bool operator()();

    ScriptError GetScriptError() const { return error; }

    ScriptExecutionMetrics GetScriptExecutionMetrics() const { return metrics; }
};

// CScriptCheck is used a lot in std::vector, make sure that's efficient
static_assert(std::is_nothrow_move_assignable_v<CScriptCheck>);
static_assert(std::is_nothrow_move_constructible_v<CScriptCheck>);
static_assert(std::is_nothrow_destructible_v<CScriptCheck>);

/** Functions for validating blocks and updating the block tree */

/**
 * Context-independent validity checks.
 *
 * Returns true if the provided block is valid (has valid header,
 * transactions are valid, block is a valid size, etc.)
 */
bool CheckBlock(const CBlock &block, BlockValidationState &state,
                const Consensus::Params &params,
                BlockValidationOptions validationOptions);

/**
 * Check a block is completely valid from start to finish (only works on top of
 * our current best block)
 */
bool TestBlockValidity(
    BlockValidationState &state, const CChainParams &params,
    Chainstate &chainstate, const CBlock &block, CBlockIndex *pindexPrev,
    const std::function<NodeClock::time_point()> &adjusted_time_callback,
    BlockValidationOptions validationOptions) EXCLUSIVE_LOCKS_REQUIRED(cs_main);

/**
 * Check with the proof of work on each blockheader matches the value in nBits
 */
bool HasValidProofOfWork(const std::vector<CBlockHeader> &headers,
                         const Consensus::Params &consensusParams);

/**
 * Check if a block has been mutated (with respect to its merkle root).
 */
bool IsBlockMutated(const CBlock &block);

/** Return the sum of the work on a given set of headers */
arith_uint256 CalculateHeadersWork(const std::vector<CBlockHeader> &headers);

enum class VerifyDBResult {
    SUCCESS,
    CORRUPTED_BLOCK_DB,
    INTERRUPTED,
    SKIPPED_L3_CHECKS,
    SKIPPED_MISSING_BLOCKS,
};

/**
 * RAII wrapper for VerifyDB: Verify consistency of the block and coin
 * databases.
 */
class CVerifyDB {
private:
    kernel::Notifications &m_notifications;

public:
    CVerifyDB();

public:
    explicit CVerifyDB(kernel::Notifications &notifications);
    ~CVerifyDB();

    [[nodiscard]] VerifyDBResult VerifyDB(Chainstate &chainstate,
                                          CCoinsView &coinsview,
                                          int nCheckLevel, int nCheckDepth)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);
};

/** @see Chainstate::FlushStateToDisk */
enum class FlushStateMode { NONE, IF_NEEDED, PERIODIC, ALWAYS };

/**
 * A convenience class for constructing the CCoinsView* hierarchy used
 * to facilitate access to the UTXO set.
 *
 * This class consists of an arrangement of layered CCoinsView objects,
 * preferring to store and retrieve coins in memory via `m_cacheview` but
 * ultimately falling back on cache misses to the canonical store of UTXOs on
 * disk, `m_dbview`.
 */
class CoinsViews {
public:
    //! The lowest level of the CoinsViews cache hierarchy sits in a leveldb
    //! database on disk. All unspent coins reside in this store.
    CCoinsViewDB m_dbview GUARDED_BY(cs_main);

    //! This view wraps access to the leveldb instance and handles read errors
    //! gracefully.
    CCoinsViewErrorCatcher m_catcherview GUARDED_BY(cs_main);

    //! This is the top layer of the cache hierarchy - it keeps as many coins in
    //! memory as can fit per the dbcache setting.
    std::unique_ptr<CCoinsViewCache> m_cacheview GUARDED_BY(cs_main);

    //! This constructor initializes CCoinsViewDB and CCoinsViewErrorCatcher
    //! instances, but it *does not* create a CCoinsViewCache instance by
    //! default. This is done separately because the presence of the cache has
    //! implications on whether or not we're allowed to flush the cache's state
    //! to disk, which should not be done until the health of the database is
    //! verified.
    //!
    //! All arguments forwarded onto CCoinsViewDB.
    CoinsViews(DBParams db_params, CoinsViewOptions options);

    //! Initialize the CCoinsViewCache member.
    void InitCache() EXCLUSIVE_LOCKS_REQUIRED(::cs_main);
};

enum class CoinsCacheSizeState {
    //! The coins cache is in immediate need of a flush.
    CRITICAL = 2,
    //! The cache is at >= 90% capacity.
    LARGE = 1,
    OK = 0
};

/**
 * Chainstate stores and provides an API to update our local knowledge of the
 * current best chain.
 *
 * Eventually, the API here is targeted at being exposed externally as a
 * consumable libconsensus library, so any functions added must only call
 * other class member functions, pure functions in other parts of the consensus
 * library, callbacks via the validation interface, or read/write-to-disk
 * functions (eventually this will also be via callbacks).
 *
 * Anything that is contingent on the current tip of the chain is stored here,
 * whereas block information and metadata independent of the current tip is
 * kept in `BlockManager`.
 */
class Chainstate {
protected:
    /**
     * The ChainState Mutex.
     * A lock that must be held when modifying this ChainState.
     */
    Mutex m_chainstate_mutex;

    //! Optional mempool that is kept in sync with the chain.
    //! Only the active chainstate has a mempool.
    CTxMemPool *m_mempool;

    //! Manages the UTXO set, which is a reflection of the contents of
    //! `m_chain`.
    std::unique_ptr<CoinsViews> m_coins_views;

    //! This toggle exists for use when doing background validation for UTXO
    //! snapshots.
    //!
    //! In the expected case, it is set once the background validation chain
    //! reaches the same height as the base of the snapshot and its UTXO set is
    //! found to hash to the expected assumeutxo value. It signals that we
    //! should no longer connect blocks to the background chainstate. When set
    //! on the background validation chainstate, it signifies that we have fully
    //! validated the snapshot chainstate.
    //!
    //! In the unlikely case that the snapshot chainstate is found to be
    //! invalid, this is set to true on the snapshot chainstate.
    bool m_disabled GUARDED_BY(::cs_main){false};

    mutable Mutex cs_avalancheFinalizedBlockIndex;

    /**
     * The best block via avalanche voting.
     * This block cannot be reorged in any way except by explicit user action.
     */
    const CBlockIndex *m_avalancheFinalizedBlockIndex
        GUARDED_BY(cs_avalancheFinalizedBlockIndex) = nullptr;

    /**
     * Filter to prevent parking a block due to block policies more than once.
     * After first application of block policies, Avalanche voting will
     * determine the final acceptance state. Rare false positives will be
     * reconciled by the network and should not have any negative impact.
     */
    CRollingBloomFilter m_filterParkingPoliciesApplied =
        CRollingBloomFilter{1000, 0.000001};

    CBlockIndex const *m_best_fork_tip = nullptr;
    CBlockIndex const *m_best_fork_base = nullptr;

    //! Cached result of LookupBlockIndex(*m_from_snapshot_blockhash)
    const CBlockIndex *m_cached_snapshot_base GUARDED_BY(::cs_main){nullptr};

public:
    //! Reference to a BlockManager instance which itself is shared across all
    //! Chainstate instances.
    node::BlockManager &m_blockman;

    //! The chainstate manager that owns this chainstate. The reference is
    //! necessary so that this instance can check whether it is the active
    //! chainstate within deeply nested method calls.
    ChainstateManager &m_chainman;

    explicit Chainstate(
        CTxMemPool *mempool, node::BlockManager &blockman,
        ChainstateManager &chainman,
        std::optional<BlockHash> from_snapshot_blockhash = std::nullopt);

    //! Return the current role of the chainstate. See `ChainstateManager`
    //! documentation for a description of the different types of chainstates.
    //!
    //! @sa ChainstateRole
    ChainstateRole GetRole() const EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

    /**
     * Initialize the CoinsViews UTXO set database management data structures.
     * The in-memory cache is initialized separately.
     *
     * All parameters forwarded to CoinsViews.
     */
    void InitCoinsDB(size_t cache_size_bytes, bool in_memory, bool should_wipe,
                     std::string leveldb_name = "chainstate");

    //! Initialize the in-memory coins cache (to be done after the health of the
    //! on-disk database is verified).
    void InitCoinsCache(size_t cache_size_bytes)
        EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

    //! @returns whether or not the CoinsViews object has been fully initialized
    //! and we can
    //!          safely flush this object to disk.
    bool CanFlushToDisk() const EXCLUSIVE_LOCKS_REQUIRED(::cs_main) {
        AssertLockHeld(::cs_main);
        return m_coins_views && m_coins_views->m_cacheview;
    }

    //! The current chain of blockheaders we consult and build on.
    //! @see CChain, CBlockIndex.
    CChain m_chain;

    /**
     * The blockhash which is the base of the snapshot this chainstate was
     * created from.
     *
     * std::nullopt if this chainstate was not created from a snapshot.
     */
    const std::optional<BlockHash> m_from_snapshot_blockhash{};

    /**
     * The base of the snapshot this chainstate was created from.
     *
     * nullptr if this chainstate was not created from a snapshot.
     */
    const CBlockIndex *SnapshotBase() EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

    /**
     * The set of all CBlockIndex entries that have as much work as our current
     * tip or more, and transaction data needed to be validated (with
     * BLOCK_VALID_TRANSACTIONS for each block and its parents back to the
     * genesis block or an assumeutxo snapshot block). Entries may be failed,
     * though, and pruning nodes may be missing the data for the block.
     */
    std::set<CBlockIndex *, CBlockIndexWorkComparator> setBlockIndexCandidates;

    //! @returns A reference to the in-memory cache of the UTXO set.
    CCoinsViewCache &CoinsTip() EXCLUSIVE_LOCKS_REQUIRED(::cs_main) {
        AssertLockHeld(::cs_main);
        Assert(m_coins_views);
        return *Assert(m_coins_views->m_cacheview);
    }

    //! @returns A reference to the on-disk UTXO set database.
    CCoinsViewDB &CoinsDB() EXCLUSIVE_LOCKS_REQUIRED(::cs_main) {
        AssertLockHeld(::cs_main);
        return Assert(m_coins_views)->m_dbview;
    }

    //! @returns A pointer to the mempool.
    CTxMemPool *GetMempool() { return m_mempool; }

    //! @returns A reference to a wrapped view of the in-memory UTXO set that
    //!     handles disk read errors gracefully.
    CCoinsViewErrorCatcher &CoinsErrorCatcher()
        EXCLUSIVE_LOCKS_REQUIRED(cs_main) {
        AssertLockHeld(::cs_main);
        return Assert(m_coins_views)->m_catcherview;
    }

    //! Destructs all objects related to accessing the UTXO set.
    void ResetCoinsViews() { m_coins_views.reset(); }

    //! Does this chainstate have a UTXO set attached?
    bool HasCoinsViews() const { return (bool)m_coins_views; }

    //! The cache size of the on-disk coins view.
    size_t m_coinsdb_cache_size_bytes{0};

    //! The cache size of the in-memory coins view.
    size_t m_coinstip_cache_size_bytes{0};

    //! Resize the CoinsViews caches dynamically and flush state to disk.
    //! @returns true unless an error occurred during the flush.
    bool ResizeCoinsCaches(size_t coinstip_size, size_t coinsdb_size)
        EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

    /**
     * Update the on-disk chain state.
     * The caches and indexes are flushed depending on the mode we're called
     * with if they're too large, if it's been a while since the last write, or
     * always and in all cases if we're in prune mode and are deleting files.
     *
     * If FlushStateMode::NONE is used, then FlushStateToDisk(...) won't do
     * anything besides checking if we need to prune.
     *
     * @returns true unless a system error occurred
     */
    bool FlushStateToDisk(BlockValidationState &state, FlushStateMode mode,
                          int nManualPruneHeight = 0);

    //! Unconditionally flush all changes to disk.
    void ForceFlushStateToDisk();

    //! Prune blockfiles from the disk if necessary and then flush chainstate
    //! changes if we pruned.
    void PruneAndFlush();

    /**
     * Find the best known block, and make it the tip of the block chain. The
     * result is either failure or an activated best chain. pblock is either
     * nullptr or a pointer to a block that is already loaded (to avoid loading
     * it again from disk).
     *
     * ActivateBestChain is split into steps (see ActivateBestChainStep) so that
     * we avoid holding cs_main for an extended period of time; the length of
     * this call may be quite long during reindexing or a substantial reorg.
     *
     * May not be called with cs_main held. May not be called in a
     * validationinterface callback.
     *
     * Note that if this is called while a snapshot chainstate is active, and if
     * it is called on a background chainstate whose tip has reached the base
     * block of the snapshot, its execution will take *MINUTES* while it hashes
     * the background UTXO set to verify the assumeutxo value the snapshot was
     * activated with. `cs_main` will be held during this time.
     * @returns true unless a system error occurred
     */
    bool ActivateBestChain(BlockValidationState &state,
                           std::shared_ptr<const CBlock> pblock = nullptr,
                           avalanche::Processor *const avalanche = nullptr)
        EXCLUSIVE_LOCKS_REQUIRED(!m_chainstate_mutex,
                                 !cs_avalancheFinalizedBlockIndex)
            LOCKS_EXCLUDED(cs_main);

    // Block (dis)connection on a given view:
    DisconnectResult DisconnectBlock(const CBlock &block,
                                     const CBlockIndex *pindex,
                                     CCoinsViewCache &view)
        EXCLUSIVE_LOCKS_REQUIRED(::cs_main);
    bool ConnectBlock(const CBlock &block, BlockValidationState &state,
                      CBlockIndex *pindex, CCoinsViewCache &view,
                      BlockValidationOptions options,
                      Amount *blockFees = nullptr, bool fJustCheck = false)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);

    // Apply the effects of a block disconnection on the UTXO set.
    bool DisconnectTip(BlockValidationState &state,
                       DisconnectedBlockTransactions *disconnectpool)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main, m_mempool->cs);

    // Manual block validity manipulation:
    /**
     * Mark a block as precious and reorganize.
     *
     * May not be called in a validationinterface callback.
     */
    bool PreciousBlock(BlockValidationState &state, CBlockIndex *pindex,
                       avalanche::Processor *const avalanche = nullptr)
        EXCLUSIVE_LOCKS_REQUIRED(!m_chainstate_mutex,
                                 !cs_avalancheFinalizedBlockIndex)
            LOCKS_EXCLUDED(cs_main);
    /** Mark a block as invalid. */
    bool InvalidateBlock(BlockValidationState &state, CBlockIndex *pindex)
        LOCKS_EXCLUDED(cs_main)
            EXCLUSIVE_LOCKS_REQUIRED(!m_chainstate_mutex,
                                     !cs_avalancheFinalizedBlockIndex);
    /** Park a block. */
    bool ParkBlock(BlockValidationState &state, CBlockIndex *pindex)
        LOCKS_EXCLUDED(cs_main)
            EXCLUSIVE_LOCKS_REQUIRED(!m_chainstate_mutex,
                                     !cs_avalancheFinalizedBlockIndex);

    /**
     * Mark a block as finalized by avalanche.
     */
    bool AvalancheFinalizeBlock(CBlockIndex *pindex,
                                avalanche::Processor &avalanche)
        EXCLUSIVE_LOCKS_REQUIRED(::cs_main, !cs_avalancheFinalizedBlockIndex);

    /**
     * Clear avalanche finalization.
     */
    void ClearAvalancheFinalizedBlock()
        EXCLUSIVE_LOCKS_REQUIRED(!cs_avalancheFinalizedBlockIndex);

    /**
     * Checks if a block is finalized by avalanche voting.
     */
    bool IsBlockAvalancheFinalized(const CBlockIndex *pindex) const
        EXCLUSIVE_LOCKS_REQUIRED(!cs_avalancheFinalizedBlockIndex);

    /** Set invalidity status to all descendants of a block */
    void SetBlockFailureFlags(CBlockIndex *pindex)
        EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

    /** Remove invalidity status from a block and its descendants. */
    void ResetBlockFailureFlags(CBlockIndex *pindex)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);
    template <typename F>
    bool UpdateFlagsForBlock(CBlockIndex *pindexBase, CBlockIndex *pindex, F f)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);
    template <typename F, typename C, typename AC>
    void UpdateFlags(CBlockIndex *pindex, CBlockIndex *&pindexReset, F f,
                     C fChild, AC fAncestorWasChanged)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);

    /** Remove parked status from a block and its descendants. */
    void UnparkBlockAndChildren(CBlockIndex *pindex)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);

    /** Remove parked status from a block. */
    void UnparkBlock(CBlockIndex *pindex) EXCLUSIVE_LOCKS_REQUIRED(cs_main);

    /** Replay blocks that aren't fully applied to the database. */
    bool ReplayBlocks();

    /**
     * Ensures we have a genesis block in the block tree, possibly writing one
     * to disk.
     */
    bool LoadGenesisBlock();

    void TryAddBlockIndexCandidate(CBlockIndex *pindex)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);

    void PruneBlockIndexCandidates();

    void ClearBlockIndexCandidates() EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

    /** Find the last common block of this chain and a locator. */
    const CBlockIndex *FindForkInGlobalIndex(const CBlockLocator &locator) const
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);

    /** Load the persisted mempool from disk */
    void
    LoadMempool(const fs::path &load_path,
                fsbridge::FopenFn mockable_fopen_function = fsbridge::fopen);

    /** Update the chain tip based on database information, i.e. CoinsTip()'s
     * best block. */
    bool LoadChainTip() EXCLUSIVE_LOCKS_REQUIRED(cs_main);

    //! Dictates whether we need to flush the cache to disk or not.
    //!
    //! @return the state of the size of the coins cache.
    CoinsCacheSizeState GetCoinsCacheSizeState()
        EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

    CoinsCacheSizeState
    GetCoinsCacheSizeState(size_t max_coins_cache_size_bytes,
                           size_t max_mempool_size_bytes)
        EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

    std::string ToString() EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

    //! Indirection necessary to make lock annotations work with an optional
    //! mempool.
    RecursiveMutex *MempoolMutex() const LOCK_RETURNED(m_mempool->cs) {
        return m_mempool ? &m_mempool->cs : nullptr;
    }

private:
    bool ActivateBestChainStep(
        BlockValidationState &state, CBlockIndex *pindexMostWork,
        const std::shared_ptr<const CBlock> &pblock, bool &fInvalidFound,
        const avalanche::Processor *const avalanche = nullptr,
        ChainstateRole = ChainstateRole::NORMAL)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main, m_mempool->cs,
                                 !cs_avalancheFinalizedBlockIndex);
    bool ConnectTip(BlockValidationState &state,
                    BlockPolicyValidationState &blockPolicyState,
                    CBlockIndex *pindexNew,
                    const std::shared_ptr<const CBlock> &pblock,
                    DisconnectedBlockTransactions &disconnectpool,
                    const avalanche::Processor *const avalanche = nullptr,
                    ChainstateRole chainstate_role = ChainstateRole::NORMAL)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main, m_mempool->cs,
                                 !cs_avalancheFinalizedBlockIndex);
    void InvalidBlockFound(CBlockIndex *pindex,
                           const BlockValidationState &state)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main, !cs_avalancheFinalizedBlockIndex);
    CBlockIndex *
    FindMostWorkChain(std::vector<const CBlockIndex *> &blocksToReconcile,
                      bool fAutoUnpark)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main, !cs_avalancheFinalizedBlockIndex);

    bool RollforwardBlock(const CBlockIndex *pindex, CCoinsViewCache &inputs)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);

    void UnparkBlockImpl(CBlockIndex *pindex, bool fClearChildren)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);

    bool UnwindBlock(BlockValidationState &state, CBlockIndex *pindex,
                     bool invalidate)
        EXCLUSIVE_LOCKS_REQUIRED(m_chainstate_mutex,
                                 !cs_avalancheFinalizedBlockIndex);

    void CheckForkWarningConditions() EXCLUSIVE_LOCKS_REQUIRED(cs_main);
    void CheckForkWarningConditionsOnNewFork(CBlockIndex *pindexNewForkTip)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);
    void InvalidChainFound(CBlockIndex *pindexNew)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main, !cs_avalancheFinalizedBlockIndex);

    const CBlockIndex *FindBlockToFinalize(CBlockIndex *pindexNew)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);

    /**
     * Check warning conditions and do some notifications on new chain tip set.
     */
    void UpdateTip(const CBlockIndex *pindexNew)
        EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

    std::chrono::microseconds m_last_write{0};
    std::chrono::microseconds m_last_flush{0};

    /**
     * In case of an invalid snapshot, rename the coins leveldb directory so
     * that it can be examined for issue diagnosis.
     */
    [[nodiscard]] util::Result<void> InvalidateCoinsDBOnDisk()
        EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

    friend ChainstateManager;
};

enum class SnapshotCompletionResult {
    SUCCESS,
    SKIPPED,

    // Expected assumeutxo configuration data is not found for the height of the
    // base block.
    MISSING_CHAINPARAMS,

    // Failed to generate UTXO statistics (to check UTXO set hash) for the
    // background chainstate.
    STATS_FAILED,

    // The UTXO set hash of the background validation chainstate does not match
    // the one expected by assumeutxo chainparams.
    HASH_MISMATCH,

    // The blockhash of the current tip of the background validation chainstate
    // does not match the one expected by the snapshot chainstate.
    BASE_BLOCKHASH_MISMATCH,
};

/**
 * Provides an interface for creating and interacting with one or two
 * chainstates: an IBD chainstate generated by downloading blocks, and
 * an optional snapshot chainstate loaded from a UTXO snapshot. Managed
 * chainstates can be maintained at different heights simultaneously.
 *
 * This class provides abstractions that allow the retrieval of the current
 * most-work chainstate ("Active") as well as chainstates which may be in
 * background use to validate UTXO snapshots.
 *
 * Definitions:
 *
 * *IBD chainstate*: a chainstate whose current state has been "fully"
 *   validated by the initial block download process.
 *
 * *Snapshot chainstate*: a chainstate populated by loading in an
 *    assumeutxo UTXO snapshot.
 *
 * *Active chainstate*: the chainstate containing the current most-work
 *    chain. Consulted by most parts of the system (net_processing,
 *    wallet) as a reflection of the current chain and UTXO set.
 *    This may either be an IBD chainstate or a snapshot chainstate.
 *
 * *Background IBD chainstate*: an IBD chainstate for which the
 *    IBD process is happening in the background while use of the
 *    active (snapshot) chainstate allows the rest of the system to function.
 */
class ChainstateManager {
private:
    //! The chainstate used under normal operation (i.e. "regular" IBD) or, if
    //! a snapshot is in use, for background validation.
    //!
    //! Its contents (including on-disk data) will be deleted *upon shutdown*
    //! after background validation of the snapshot has completed. We do not
    //! free the chainstate contents immediately after it finishes validation
    //! to cautiously avoid a case where some other part of the system is still
    //! using this pointer (e.g. net_processing).
    //!
    //! Once this pointer is set to a corresponding chainstate, it will not
    //! be reset until init.cpp:Shutdown().
    //!
    //! This is especially important when, e.g., calling ActivateBestChain()
    //! on all chainstates because we are not able to hold ::cs_main going into
    //! that call.
    std::unique_ptr<Chainstate> m_ibd_chainstate GUARDED_BY(::cs_main);

    //! A chainstate initialized on the basis of a UTXO snapshot. If this is
    //! non-null, it is always our active chainstate.
    //!
    //! Once this pointer is set to a corresponding chainstate, it will not
    //! be reset until init.cpp:Shutdown().
    //!
    //! This is especially important when, e.g., calling ActivateBestChain()
    //! on all chainstates because we are not able to hold ::cs_main going into
    //! that call.
    std::unique_ptr<Chainstate> m_snapshot_chainstate GUARDED_BY(::cs_main);

    //! Points to either the ibd or snapshot chainstate; indicates our
    //! most-work chain.
    //!
    //! This is especially important when, e.g., calling ActivateBestChain()
    //! on all chainstates because we are not able to hold ::cs_main going into
    //! that call.
    Chainstate *m_active_chainstate GUARDED_BY(::cs_main){nullptr};

    CBlockIndex *m_best_invalid GUARDED_BY(::cs_main){nullptr};
    CBlockIndex *m_best_parked GUARDED_BY(::cs_main){nullptr};

    //! Internal helper for ActivateSnapshot().
    //!
    //! De-serialization of a snapshot that is created with
    //! the dumptxoutset RPC.
    //! To reduce space the serialization format of the snapshot avoids
    //! duplication of tx hashes. The code takes advantage of the guarantee by
    //! leveldb that keys are lexicographically sorted.
    [[nodiscard]] bool
    PopulateAndValidateSnapshot(Chainstate &snapshot_chainstate,
                                AutoFile &coins_file,
                                const node::SnapshotMetadata &metadata);
    /**
     * If a block header hasn't already been seen, call CheckBlockHeader on it,
     * ensure that it doesn't descend from an invalid block, and then add it to
     * m_block_index.
     * Caller must set min_pow_checked=true in order to add a new header to the
     * block index (permanent memory storage), indicating that the header is
     * known to be part of a sufficiently high-work chain (anti-dos check).
     */
    bool AcceptBlockHeader(
        const CBlockHeader &block, BlockValidationState &state,
        CBlockIndex **ppindex, bool min_pow_checked,
        const std::optional<CCheckpointData> &test_checkpoints = std::nullopt)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);
    friend Chainstate;

    //! Return true if a chainstate is considered usable.
    //!
    //! This is false when a background validation chainstate has completed its
    //! validation of an assumed-valid chainstate, or when a snapshot
    //! chainstate has been found to be invalid.
    bool IsUsable(const Chainstate *const pchainstate) const
        EXCLUSIVE_LOCKS_REQUIRED(::cs_main) {
        return pchainstate && !pchainstate->m_disabled;
    }

    /** Most recent headers presync progress update, for rate-limiting. */
    SteadyMilliseconds m_last_presync_update GUARDED_BY(::cs_main){};

public:
    using Options = kernel::ChainstateManagerOpts;

    explicit ChainstateManager(Options options,
                               node::BlockManager::Options blockman_options);

    //! Function to restart active indexes; set dynamically to avoid a circular
    //! dependency on `base/index.cpp`.
    std::function<void()> snapshot_download_completed = std::function<void()>();

    const Config &GetConfig() const { return m_options.config; }

    const CChainParams &GetParams() const {
        return m_options.config.GetChainParams();
    }
    const Consensus::Params &GetConsensus() const {
        return m_options.config.GetChainParams().GetConsensus();
    }
    bool ShouldCheckBlockIndex() const {
        return *Assert(m_options.check_block_index);
    }
    const arith_uint256 &MinimumChainWork() const {
        return *Assert(m_options.minimum_chain_work);
    }
    const BlockHash &AssumedValidBlock() const {
        return *Assert(m_options.assumed_valid_block);
    }
    kernel::Notifications &GetNotifications() const {
        return m_options.notifications;
    };

    /**
     * Make various assertions about the state of the block index.
     *
     * By default this only executes fully when using the Regtest chain;
     * see: m_options.check_block_index.
     */
    void CheckBlockIndex();

    /**
     * Alias for ::cs_main.
     * Should be used in new code to make it easier to make ::cs_main a member
     * of this class.
     * Generally, methods of this class should be annotated to require this
     * mutex. This will make calling code more verbose, but also help to:
     * - Clarify that the method will acquire a mutex that heavily affects
     *   overall performance.
     * - Force call sites to think how long they need to acquire the mutex to
     *   get consistent results.
     */
    RecursiveMutex &GetMutex() const LOCK_RETURNED(::cs_main) {
        return ::cs_main;
    }

    const Options m_options;
    std::thread m_thread_load;
    //! A single BlockManager instance is shared across each constructed
    //! chainstate to avoid duplicating block metadata.
    node::BlockManager m_blockman;

    /**
     * Whether initial block download has ended and IsInitialBlockDownload
     * should return false from now on.
     *
     * Mutable because we need to be able to mark IsInitialBlockDownload()
     * const, which latches this for caching purposes.
     */
    mutable std::atomic<bool> m_cached_finished_ibd{false};

    /**
     * Every received block is assigned a unique and increasing identifier, so
     * we know which one to give priority in case of a fork.
     * Blocks loaded from disk are assigned id 0, so start the counter at 1.
     */
    std::atomic<int32_t> nBlockSequenceId{1};

    /** Decreasing counter (used by subsequent preciousblock calls). */
    int32_t nBlockReverseSequenceId = -1;
    /** chainwork for the last block that preciousblock has been applied to. */
    arith_uint256 nLastPreciousChainwork = 0;

    // Reset the memory-only sequence counters we use to track block arrival
    // (used by tests to reset state)
    void ResetBlockSequenceCounters() EXCLUSIVE_LOCKS_REQUIRED(::cs_main) {
        AssertLockHeld(::cs_main);
        nBlockSequenceId = 1;
        nBlockReverseSequenceId = -1;
    }

    /**
     * In order to efficiently track invalidity of headers, we keep the set of
     * blocks which we tried to connect and found to be invalid here (ie which
     * were set to BLOCK_FAILED_VALID since the last restart). We can then
     * walk this set and check if a new header is a descendant of something in
     * this set, preventing us from having to walk m_block_index when we try
     * to connect a bad block and fail.
     *
     * While this is more complicated than marking everything which descends
     * from an invalid block as invalid at the time we discover it to be
     * invalid, doing so would require walking all of m_block_index to find all
     * descendants. Since this case should be very rare, keeping track of all
     * BLOCK_FAILED_VALID blocks in a set should be just fine and work just as
     * well.
     *
     * Because we already walk m_block_index in height-order at startup, we go
     * ahead and mark descendants of invalid blocks as FAILED_CHILD at that
     * time, instead of putting things in this set.
     */
    std::set<CBlockIndex *> m_failed_blocks;

    /**
     * Best header we've seen so far (used for getheaders queries' starting
     * points).
     */
    CBlockIndex *m_best_header GUARDED_BY(::cs_main){nullptr};

    //! The total number of bytes available for us to use across all in-memory
    //! coins caches. This will be split somehow across chainstates.
    int64_t m_total_coinstip_cache{0};
    //
    //! The total number of bytes available for us to use across all leveldb
    //! coins databases. This will be split somehow across chainstates.
    int64_t m_total_coinsdb_cache{0};

    //! Instantiate a new chainstate.
    //!
    //! @param[in] mempool              The mempool to pass to the chainstate
    //                                  constructor
    Chainstate &InitializeChainstate(CTxMemPool *mempool)
        EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

    //! Get all chainstates currently being used.
    std::vector<Chainstate *> GetAll();

    //! Construct and activate a Chainstate on the basis of UTXO snapshot data.
    //!
    //! Steps:
    //!
    //! - Initialize an unused Chainstate.
    //! - Load its `CoinsViews` contents from `coins_file`.
    //! - Verify that the hash of the resulting coinsdb matches the expected
    //!   hash per assumeutxo chain parameters.
    //! - Wait for our headers chain to include the base block of the snapshot.
    //! - "Fast forward" the tip of the new chainstate to the base of the
    //!   snapshot, faking nTx* block index data along the way.
    //! - Move the new chainstate to `m_snapshot_chainstate` and make it our
    //!   ActiveChainstate().
    [[nodiscard]] util::Result<CBlockIndex *>
    ActivateSnapshot(AutoFile &coins_file,
                     const node::SnapshotMetadata &metadata, bool in_memory);

    //! Once the background validation chainstate has reached the height which
    //! is the base of the UTXO snapshot in use, compare its coins to ensure
    //! they match those expected by the snapshot.
    //!
    //! If the coins match (expected), then mark the validation chainstate for
    //! deletion and continue using the snapshot chainstate as active.
    //! Otherwise, revert to using the ibd chainstate and shutdown.
    SnapshotCompletionResult MaybeCompleteSnapshotValidation(
        std::function<void(bilingual_str)> shutdown_fnc =
            [](bilingual_str msg) { AbortNode(msg.original, msg); })
        EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

    //! Returns nullptr if no snapshot has been loaded.
    const CBlockIndex *GetSnapshotBaseBlock() const
        EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

    //! The most-work chain.
    Chainstate &ActiveChainstate() const;
    CChain &ActiveChain() const EXCLUSIVE_LOCKS_REQUIRED(GetMutex()) {
        return ActiveChainstate().m_chain;
    }
    int ActiveHeight() const EXCLUSIVE_LOCKS_REQUIRED(GetMutex()) {
        return ActiveChain().Height();
    }
    CBlockIndex *ActiveTip() const EXCLUSIVE_LOCKS_REQUIRED(GetMutex()) {
        return ActiveChain().Tip();
    }

    //! The state of a background sync (for net processing)
    bool BackgroundSyncInProgress() const EXCLUSIVE_LOCKS_REQUIRED(GetMutex()) {
        return IsUsable(m_snapshot_chainstate.get()) &&
               IsUsable(m_ibd_chainstate.get());
    }

    //! The tip of the background sync chain
    const CBlockIndex *GetBackgroundSyncTip() const
        EXCLUSIVE_LOCKS_REQUIRED(GetMutex()) {
        return BackgroundSyncInProgress() ? m_ibd_chainstate->m_chain.Tip()
                                          : nullptr;
    }

    node::BlockMap &BlockIndex() EXCLUSIVE_LOCKS_REQUIRED(::cs_main) {
        AssertLockHeld(::cs_main);
        return m_blockman.m_block_index;
    }

    //! @returns true if a snapshot-based chainstate is in use. Also implies
    //!          that a background validation chainstate is also in use.
    bool IsSnapshotActive() const;

    std::optional<BlockHash> SnapshotBlockhash() const;

    //! Is there a snapshot in use and has it been fully validated?
    bool IsSnapshotValidated() const EXCLUSIVE_LOCKS_REQUIRED(::cs_main) {
        return m_snapshot_chainstate && m_ibd_chainstate &&
               m_ibd_chainstate->m_disabled;
    }

    /**
     * Check whether we are doing an initial block download (synchronizing from
     * disk or network)
     */
    bool IsInitialBlockDownload() const;

    /**
     * Import blocks from an external file
     *
     * During reindexing, this function is called for each block file
     * (datadir/blocks/blk?????.dat). It reads all blocks contained in the given
     * file and attempts to process them (add them to the block index). The
     * blocks may be out of order within each file and across files. Often this
     * function reads a block but finds that its parent hasn't been read yet, so
     * the block can't be processed yet. The function will add an entry to the
     * blocks_with_unknown_parent map (which is passed as an argument), so that
     * when the block's parent is later read and processed, this function can
     * re-read the child block from disk and process it.
     *
     * Because a block's parent may be in a later file, not just later in the
     * same file, the blocks_with_unknown_parent map must be passed in and out
     * with each call. It's a multimap, rather than just a map, because multiple
     * blocks may have the same parent (when chain splits or stale blocks
     * exist). It maps from parent-hash to child-disk-position.
     *
     * This function can also be used to read blocks from user-specified block
     * files using the -loadblock= option. There's no unknown-parent tracking,
     * so the last two arguments are omitted.
     *
     *
     * @param[in]     fileIn  FILE handle to file containing blocks to read
     * @param[in]     dbp     (optional) Disk block position (only for reindex)
     * @param[in,out] blocks_with_unknown_parent
     *                        (optional) Map of disk positions for blocks with
     *                        unknown parent, key is parent block hash
     *                        (only used for reindex)
     */
    void LoadExternalBlockFile(FILE *fileIn, FlatFilePos *dbp = nullptr,
                               std::multimap<BlockHash, FlatFilePos>
                                   *blocks_with_unknown_parent = nullptr,
                               avalanche::Processor *const avalanche = nullptr);

    /**
     * Process an incoming block. This only returns after the best known valid
     * block is made active. Note that it does not, however, guarantee that the
     * specific block passed to it has been checked for validity!
     *
     * If you want to *possibly* get feedback on whether block is valid, you
     * must install a CValidationInterface (see validationinterface.h) - this
     * will have its BlockChecked method called whenever *any* block completes
     * validation.
     *
     * Note that we guarantee that either the proof-of-work is valid on block,
     * or (and possibly also) BlockChecked will have been called.
     *
     * May not be called in a validationinterface callback.
     *
     * @param[in]   block  The block we want to process.
     * @param[in]   force_processing Process this block even if unrequested;
     *                               used for non-network block sources.
     * @param[in]   min_pow_checked  True if proof-of-work anti-DoS checks have
     *                               been done by caller for headers chain
     *                               (note: only affects headers acceptance; if
     *                               block header is already present in block
     *                               index then this parameter has no effect)
     * @param[out]  new_block A boolean which is set to indicate if the block
     * was first received via this call.
     * @returns     If the block was processed, independently of block validity
     */
    bool ProcessNewBlock(const std::shared_ptr<const CBlock> &block,
                         bool force_processing, bool min_pow_checked,
                         bool *new_block,
                         avalanche::Processor *const avalanche = nullptr)
        LOCKS_EXCLUDED(cs_main);

    /**
     * Process incoming block headers.
     *
     * May not be called in a validationinterface callback.
     *
     * @param[in]  block         The block headers themselves.
     * @param[in]  min_pow_checked  True if proof-of-work anti-DoS checks have
     *                              been done by caller for headers chain
     * @param[out] state         This may be set to an Error state if any error
     *                           occurred processing them.
     * @param[out] ppindex       If set, the pointer will be set to point to the
     *                           last new block index object for the given
     * headers.
     * @return True if block headers were accepted as valid.
     */
    bool ProcessNewBlockHeaders(
        const std::vector<CBlockHeader> &block, bool min_pow_checked,
        BlockValidationState &state, const CBlockIndex **ppindex = nullptr,
        const std::optional<CCheckpointData> &test_checkpoints = std::nullopt)
        LOCKS_EXCLUDED(cs_main);

    /**
     * Sufficiently validate a block for disk storage (and store on disk).
     *
     * @param[in]   pblock          The block we want to process.
     * @param[in]   fRequested      Whether we requested this block from a
     *                              peer.
     * @param[in]   dbp             The location on disk, if we are importing
     *                              this block from prior storage.
     * @param[in]   min_pow_checked True if proof-of-work anti-DoS checks have
     *                              been done by caller for headers chain
     *
     * @param[out]  state       The state of the block validation.
     * @param[out]  fNewBlock   Optional return parameter to indicate if the
     *                          block is new to our storage.
     *
     * @returns   False if the block or header is invalid, or if saving to disk
     *            fails (likely a fatal error); true otherwise.
     */
    bool AcceptBlock(const std::shared_ptr<const CBlock> &pblock,
                     BlockValidationState &state, bool fRequested,
                     const FlatFilePos *dbp, bool *fNewBlock,
                     bool min_pow_checked) EXCLUSIVE_LOCKS_REQUIRED(cs_main);

    void ReceivedBlockTransactions(const CBlock &block, CBlockIndex *pindexNew,
                                   const FlatFilePos &pos)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);

    /**
     * Try to add a transaction to the memory pool.
     *
     * @param[in]  tx              The transaction to submit for mempool
     *                             acceptance.
     * @param[in]  test_accept     When true, run validation checks but don't
     *                             submit to mempool.
     */
    [[nodiscard]] MempoolAcceptResult
    ProcessTransaction(const CTransactionRef &tx, bool test_accept = false)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);

    //! Load the block tree and coins database from disk, initializing state if
    //! we're running with -reindex
    bool LoadBlockIndex() EXCLUSIVE_LOCKS_REQUIRED(cs_main);

    //! Check to see if caches are out of balance and if so, call
    //! ResizeCoinsCaches() as needed.
    void MaybeRebalanceCaches() EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

    /**
     * This is used by net_processing to report pre-synchronization progress of
     * headers, as headers are not yet fed to validation during that time, but
     * validation is (for now) responsible for logging and signalling through
     * NotifyHeaderTip, so it needs this information.
     */
    void ReportHeadersPresync(const arith_uint256 &work, int64_t height,
                              int64_t timestamp);

    //! When starting up, search the datadir for a chainstate based on a UTXO
    //! snapshot that is in the process of being validated.
    bool DetectSnapshotChainstate(CTxMemPool *mempool)
        EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

    void ResetChainstates() EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

    //! Remove the snapshot-based chainstate and all on-disk artifacts.
    //! Used when reindex{-chainstate} is called during snapshot use.
    [[nodiscard]] bool DeleteSnapshotChainstate()
        EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

    //! Switch the active chainstate to one based on a UTXO snapshot that was
    //! loaded previously.
    Chainstate &ActivateExistingSnapshot(BlockHash base_blockhash)
        EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

    //! If we have validated a snapshot chain during this runtime, copy its
    //! chainstate directory over to the main `chainstate` location, completing
    //! validation of the snapshot.
    //!
    //! If the cleanup succeeds, the caller will need to ensure chainstates are
    //! reinitialized, since ResetChainstates() will be called before leveldb
    //! directories are moved or deleted.
    //!
    //! @sa node/chainstate:LoadChainstate()
    bool ValidatedSnapshotCleanup() EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

    //! @returns the chainstate that indexes should consult when ensuring that
    //!   an index is synced with a chain where we can expect block index
    //!   entries to have BLOCK_HAVE_DATA beneath the tip.
    //!
    //!   In other words, give us the chainstate for which we can reasonably
    //!   expect that all blocks beneath the tip have been indexed. In practice
    //!   this means when using an assumed-valid chainstate based upon a
    //!   snapshot, return only the fully validated chain.
    Chainstate &GetChainstateForIndexing() EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

    //! Return the [start, end] (inclusive) of block heights we can prune.
    //!
    //! start > end is possible, meaning no blocks can be pruned.
    std::pair<int, int> GetPruneRange(const Chainstate &chainstate,
                                      int last_height_can_prune)
        EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

    //! Return the height of the base block of the snapshot in use, if one
    //! exists, else nullopt.
    std::optional<int> GetSnapshotBaseHeight() const
        EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

    //! If, due to invalidation / reconsideration of blocks, the previous
    //! best header is no longer valid / guaranteed to be the most-work
    //! header in our block-index not known to be invalid, recalculate it.
    void RecalculateBestHeader() EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

    /** Dump the recent block headers reception time to a file. */
    bool DumpRecentHeadersTime(const fs::path &filePath) const
        EXCLUSIVE_LOCKS_REQUIRED(GetMutex());
    /** Load the recent block headers reception time from a file. */
    bool LoadRecentHeadersTime(const fs::path &filePath)
        EXCLUSIVE_LOCKS_REQUIRED(GetMutex());
};

/** Deployment* info via ChainstateManager */
template <typename DEP>
bool DeploymentActiveAfter(const CBlockIndex *pindexPrev,
                           const ChainstateManager &chainman, DEP dep) {
    return DeploymentActiveAfter(pindexPrev, chainman.GetConsensus(), dep);
}

template <typename DEP>
bool DeploymentActiveAt(const CBlockIndex &index,
                        const ChainstateManager &chainman, DEP dep) {
    return DeploymentActiveAt(index, chainman.GetConsensus(), dep);
}

#endif // BITCOIN_VALIDATION_H
