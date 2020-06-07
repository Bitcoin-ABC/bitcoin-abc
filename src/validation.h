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

#include <amount.h>
#include <blockfileinfo.h>
#include <blockindexworkcomparator.h>
#include <coins.h>
#include <consensus/consensus.h>
#include <disconnectresult.h>
#include <flatfile.h>
#include <fs.h>
#include <protocol.h> // For CMessageHeader::MessageMagic
#include <script/script_error.h>
#include <script/script_metrics.h>
#include <sync.h>
#include <txdb.h>
#include <txmempool.h> // For CTxMemPool::cs
#include <versionbits.h>

#include <atomic>
#include <cstdint>
#include <map>
#include <memory>
#include <optional>
#include <set>
#include <string>
#include <utility>
#include <vector>

class BlockValidationState;
class CBlockIndex;
class CBlockTreeDB;
class CBlockUndo;
class CChainParams;
class CChain;
class CConnman;
class CInv;
class ChainstateManager;
class Config;
class CScriptCheck;
class CTxMemPool;
class CTxUndo;
class DisconnectedBlockTransactions;
class TxValidationState;

struct ChainTxData;
struct FlatFilePos;
struct PrecomputedTransactionData;
struct LockPoints;

namespace Consensus {
struct Params;
}

#define MIN_TRANSACTION_SIZE                                                   \
    (::GetSerializeSize(CTransaction(), PROTOCOL_VERSION))

/** Default for -minrelaytxfee, minimum relay fee for transactions */
static const Amount DEFAULT_MIN_RELAY_TX_FEE_PER_KB(1000 * SATOSHI);
/** Default for -excessutxocharge for transactions transactions */
static const Amount DEFAULT_UTXO_FEE = Amount::zero();
/**
 * Default for -mempoolexpiry, expiration time for mempool transactions in
 * hours.
 */
static const unsigned int DEFAULT_MEMPOOL_EXPIRY = 336;
/** The maximum size of a blk?????.dat file (since 0.8) */
static const unsigned int MAX_BLOCKFILE_SIZE = 0x8000000; // 128 MiB
/** Maximum number of dedicated script-checking threads allowed */
static const int MAX_SCRIPTCHECK_THREADS = 15;
/** -par default (number of script-checking threads, 0 = auto) */
static const int DEFAULT_SCRIPTCHECK_THREADS = 0;
static const int64_t DEFAULT_MAX_TIP_AGE = 24 * 60 * 60;
static const bool DEFAULT_CHECKPOINTS_ENABLED = true;
static const bool DEFAULT_TXINDEX = false;
static const char *const DEFAULT_BLOCKFILTERINDEX = "0";

/** Default for -persistmempool */
static const bool DEFAULT_PERSIST_MEMPOOL = true;
/** Default for using fee filter */
static const bool DEFAULT_FEEFILTER = true;

static const bool DEFAULT_PEERBLOOMFILTERS = true;

/** Default for -stopatheight */
static const int DEFAULT_STOPATHEIGHT = 0;
/** Default for -maxreorgdepth */
static const int DEFAULT_MAX_REORG_DEPTH = 10;
/**
 * Default for -finalizationdelay
 * This is the minimum time between a block header reception and the block
 * finalization.
 * This value should be >> block propagation and validation time
 */
static const int64_t DEFAULT_MIN_FINALIZATION_DELAY = 2 * 60 * 60;
/**
 * Block files containing a block-height within MIN_BLOCKS_TO_KEEP of
 * ::ChainActive().Tip() will not be pruned.
 */
static const unsigned int MIN_BLOCKS_TO_KEEP = 288;
static const signed int DEFAULT_CHECKBLOCKS = 6;
static const unsigned int DEFAULT_CHECKLEVEL = 3;
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

extern RecursiveMutex cs_main;
extern CTxMemPool g_mempool;
typedef std::unordered_map<BlockHash, CBlockIndex *, BlockHasher> BlockMap;
extern Mutex g_best_block_mutex;
extern std::condition_variable g_best_block_cv;
extern uint256 g_best_block;
extern std::atomic_bool fImporting;
extern std::atomic_bool fReindex;
extern bool fRequireStandard;
extern bool fCheckBlockIndex;
extern bool fCheckpointsEnabled;

/**
 * A fee rate smaller than this is considered zero fee (for relaying, mining and
 * transaction creation)
 */
extern CFeeRate minRelayTxFee;
/**
 * If the tip is older than this (in seconds), the node is considered to be in
 * initial block download.
 */
extern int64_t nMaxTipAge;

/**
 * Block hash whose ancestors we will assume to have valid scripts without
 * checking them.
 */
extern BlockHash hashAssumeValid;

/**
 * Minimum work we will assume exists on some valid chain.
 */
extern arith_uint256 nMinimumChainWork;

/**
 * Best header we've seen so far (used for getheaders queries' starting points).
 */
extern CBlockIndex *pindexBestHeader;

/** Pruning-related variables and constants */
/** True if any block files have ever been pruned. */
extern bool fHavePruned;
/** True if we're running in -prune mode. */
extern bool fPruneMode;
/** Number of MiB of block files that we're trying to stay below. */
extern uint64_t nPruneTarget;
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
 * Import blocks from an external file.
 */
void LoadExternalBlockFile(const Config &config, FILE *fileIn,
                           FlatFilePos *dbp = nullptr);

/**
 * Ensures we have a genesis block in the block tree, possibly writing one to
 * disk.
 */
bool LoadGenesisBlock(const CChainParams &chainparams);

/**
 * Unload database information.
 */
void UnloadBlockIndex();

/**
 * Run an instance of the script checking thread.
 */
void ThreadScriptCheck(int worker_num);

/**
 * Retrieve a transaction (from memory pool, or from disk, if possible).
 */
bool GetTransaction(const TxId &txid, CTransactionRef &txOut,
                    const Consensus::Params &params, BlockHash &hashBlock,
                    const CBlockIndex *const blockIndex = nullptr);

/**
 * Find the best known block, and make it the tip of the block chain
 *
 * May not be called with cs_main held. May not be called in a
 * validationinterface callback.
 */
bool ActivateBestChain(
    const Config &config, BlockValidationState &state,
    std::shared_ptr<const CBlock> pblock = std::shared_ptr<const CBlock>());
Amount GetBlockSubsidy(int nHeight, const Consensus::Params &consensusParams);

/**
 * Guess verification progress (as a fraction between 0.0=genesis and
 * 1.0=current tip).
 */
double GuessVerificationProgress(const ChainTxData &data,
                                 const CBlockIndex *pindex);

/**
 * Calculate the amount of disk space the block & undo files currently use.
 */
uint64_t CalculateCurrentUsage();

/**
 * Actually unlink the specified files
 */
void UnlinkPrunedFiles(const std::set<int> &setFilesToPrune);

/** Prune block files up to a given height */
void PruneBlockFilesManual(int nManualPruneHeight);

/**
 * (try to) add transaction to memory pool
 */
bool AcceptToMemoryPool(const Config &config, CTxMemPool &pool,
                        TxValidationState &state, const CTransactionRef &tx,
                        bool bypass_limits, const Amount nAbsurdFee,
                        bool test_accept = false)
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

class ConnectTrace;

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

/** Get the BIP9 state for a given deployment at the current tip. */
ThresholdState VersionBitsTipState(const Consensus::Params &params,
                                   Consensus::DeploymentPos pos);

/** Get the BIP9 state for a given deployment at a given block. */
ThresholdState VersionBitsBlockState(const Consensus::Params &params,
                                     Consensus::DeploymentPos pos,
                                     const CBlockIndex *pindex);

/**
 * Get the numerical statistics for the BIP9 state for a given deployment at the
 * current tip.
 */
BIP9Stats VersionBitsTipStatistics(const Consensus::Params &params,
                                   Consensus::DeploymentPos pos);

/**
 * Get the block height at which the BIP9 deployment switched into the state for
 * the block building on the current tip.
 */
int VersionBitsTipStateSinceHeight(const Consensus::Params &params,
                                   Consensus::DeploymentPos pos);

/** Apply the effects of this transaction on the UTXO set represented by view */
void UpdateCoins(const CTransaction &tx, CCoinsViewCache &inputs, int nHeight);

/**
 * Mark all the coins corresponding to a given transaction inputs as spent.
 */
void SpendCoins(CCoinsViewCache &view, const CTransaction &tx, CTxUndo &txundo,
                int nHeight);

/**
 * Apply the effects of this transaction on the UTXO set represented by view.
 */
void UpdateCoins(CCoinsViewCache &view, const CTransaction &tx, int nHeight);
void UpdateCoins(CCoinsViewCache &view, const CTransaction &tx, CTxUndo &txundo,
                 int nHeight);

/**
 * Test whether the LockPoints height and time are still valid on the current
 * chain.
 */
bool TestLockPointValidity(const LockPoints *lp)
    EXCLUSIVE_LOCKS_REQUIRED(cs_main);

/**
 * Check if transaction will be BIP 68 final in the next block to be created.
 *
 * Simulates calling SequenceLocks() with data from the tip of the current
 * active chain. Optionally stores in LockPoints the resulting height and time
 * calculated and the hash of the block needed for calculation or skips the
 * calculation and uses the LockPoints passed in for evaluation. The LockPoints
 * should not be considered valid if CheckSequenceLocks returns false.
 *
 * See consensus/consensus.h for flag definitions.
 */
bool CheckSequenceLocks(const CTxMemPool &pool, const CTransaction &tx,
                        int flags, LockPoints *lp = nullptr,
                        bool useExistingLockPoints = false)
    EXCLUSIVE_LOCKS_REQUIRED(cs_main);

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
    ScriptError error;
    ScriptExecutionMetrics metrics;
    PrecomputedTransactionData txdata;
    TxSigCheckLimiter *pTxLimitSigChecks;
    CheckInputsLimiter *pBlockLimitSigChecks;

public:
    CScriptCheck()
        : ptxTo(nullptr), nIn(0), nFlags(0), cacheStore(false),
          error(ScriptError::UNKNOWN), txdata(), pTxLimitSigChecks(nullptr),
          pBlockLimitSigChecks(nullptr) {}

    CScriptCheck(const CTxOut &outIn, const CTransaction &txToIn,
                 unsigned int nInIn, uint32_t nFlagsIn, bool cacheIn,
                 const PrecomputedTransactionData &txdataIn,
                 TxSigCheckLimiter *pTxLimitSigChecksIn = nullptr,
                 CheckInputsLimiter *pBlockLimitSigChecksIn = nullptr)
        : m_tx_out(outIn), ptxTo(&txToIn), nIn(nInIn), nFlags(nFlagsIn),
          cacheStore(cacheIn), error(ScriptError::UNKNOWN), txdata(txdataIn),
          pTxLimitSigChecks(pTxLimitSigChecksIn),
          pBlockLimitSigChecks(pBlockLimitSigChecksIn) {}

    bool operator()();

    void swap(CScriptCheck &check) {
        std::swap(ptxTo, check.ptxTo);
        std::swap(m_tx_out, check.m_tx_out);
        std::swap(nIn, check.nIn);
        std::swap(nFlags, check.nFlags);
        std::swap(cacheStore, check.cacheStore);
        std::swap(error, check.error);
        std::swap(metrics, check.metrics);
        std::swap(txdata, check.txdata);
        std::swap(pTxLimitSigChecks, check.pTxLimitSigChecks);
        std::swap(pBlockLimitSigChecks, check.pBlockLimitSigChecks);
    }

    ScriptError GetScriptError() const { return error; }

    ScriptExecutionMetrics GetScriptExecutionMetrics() const { return metrics; }
};

bool UndoReadFromDisk(CBlockUndo &blockundo, const CBlockIndex *pindex);

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
 * This is a variant of ContextualCheckTransaction which computes the contextual
 * check for a transaction based on the chain tip.
 *
 * See consensus/consensus.h for flag definitions.
 */
bool ContextualCheckTransactionForCurrentBlock(const Consensus::Params &params,
                                               const CTransaction &tx,
                                               TxValidationState &state,
                                               int flags = -1);

/**
 * Check a block is completely valid from start to finish (only works on top of
 * our current best block)
 */
bool TestBlockValidity(BlockValidationState &state, const CChainParams &params,
                       const CBlock &block, CBlockIndex *pindexPrev,
                       BlockValidationOptions validationOptions)
    EXCLUSIVE_LOCKS_REQUIRED(cs_main);

/**
 * RAII wrapper for VerifyDB: Verify consistency of the block and coin
 * databases.
 */
class CVerifyDB {
public:
    CVerifyDB();
    ~CVerifyDB();
    bool VerifyDB(const Config &config, CCoinsView *coinsview, int nCheckLevel,
                  int nCheckDepth);
};

CBlockIndex *LookupBlockIndex(const BlockHash &hash)
    EXCLUSIVE_LOCKS_REQUIRED(cs_main);

/** Find the last common block between the parameter chain and a locator. */
CBlockIndex *FindForkInGlobalIndex(const CChain &chain,
                                   const CBlockLocator &locator)
    EXCLUSIVE_LOCKS_REQUIRED(cs_main);

/** @see CChainState::FlushStateToDisk */
enum class FlushStateMode { NONE, IF_NEEDED, PERIODIC, ALWAYS };

/** Global variable that points to the active CCoinsView (protected by cs_main)
 */
extern std::unique_ptr<CCoinsViewCache> pcoinsTip;

/**
 * Maintains a tree of blocks (stored in `m_block_index`) which is consulted
 * to determine where the most-work tip is.
 *
 * This data is used mostly in `CChainState` - information about, e.g.,
 * candidate tips is not maintained here.
 */
class BlockManager {
public:
    BlockMap m_block_index GUARDED_BY(cs_main);

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
     * All pairs A->B, where A (or one of its ancestors) misses transactions,
     * but B has transactions. Pruned nodes may have entries where B is missing
     * data.
     */
    std::multimap<CBlockIndex *, CBlockIndex *> m_blocks_unlinked;

    /**
     * Load the blocktree off disk and into memory. Populate certain metadata
     * per index entry (nStatus, nChainWork, nTimeMax, etc.) as well as
     * peripheral collections like setDirtyBlockIndex.
     *
     * @param[out] block_index_candidates  Fill this set with any valid blocks
     * for which we've downloaded all transactions.
     */
    bool LoadBlockIndex(const Consensus::Params &consensus_params,
                        CBlockTreeDB &blocktree,
                        std::set<CBlockIndex *, CBlockIndexWorkComparator>
                            &block_index_candidates)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);

    /** Clear all data members. */
    void Unload() EXCLUSIVE_LOCKS_REQUIRED(cs_main);

    CBlockIndex *AddToBlockIndex(const CBlockHeader &block)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);
    /** Create a new block index entry for a given block hash */
    CBlockIndex *InsertBlockIndex(const BlockHash &hash)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);

    /**
     * If a block header hasn't already been seen, call CheckBlockHeader on it,
     * ensure that it doesn't descend from an invalid block, and then add it to
     * m_block_index.
     */
    bool AcceptBlockHeader(const Config &config, const CBlockHeader &block,
                           BlockValidationState &state, CBlockIndex **ppindex)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);
};

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
    CoinsViews(std::string ldb_name, size_t cache_size_bytes, bool in_memory,
               bool should_wipe);

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
 * CChainState stores and provides an API to update our local knowledge of the
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
 * kept in `BlockMetadataManager`.
 */
class CChainState {
private:
    /**
     * the ChainState CriticalSection
     * A lock that must be held when modifying this ChainState - held in
     * ActivateBestChain()
     */
    RecursiveMutex m_cs_chainstate;

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

    /**
     * Whether this chainstate is undergoing initial block download.
     *
     * Mutable because we need to be able to mark IsInitialBlockDownload()
     * const, which latches this for caching purposes.
     */
    mutable std::atomic<bool> m_cached_finished_ibd{false};

    //! Reference to a BlockManager instance which itself is shared across all
    //! CChainState instances. Keeping a local reference allows us to test more
    //! easily as opposed to referencing a global.
    BlockManager &m_blockman;

    //! Manages the UTXO set, which is a reflection of the contents of
    //! `m_chain`.
    std::unique_ptr<CoinsViews> m_coins_views;

    /**
     * The best finalized block.
     * This block cannot be reorged in any way except by explicit user action.
     */
    const CBlockIndex *m_finalizedBlockIndex GUARDED_BY(cs_main) = nullptr;

public:
    explicit CChainState(BlockManager &blockman,
                         BlockHash from_snapshot_blockhash = BlockHash());

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
    bool CanFlushToDisk() EXCLUSIVE_LOCKS_REQUIRED(cs_main) {
        return m_coins_views && m_coins_views->m_cacheview;
    }

    //! The current chain of blockheaders we consult and build on.
    //! @see CChain, CBlockIndex.
    CChain m_chain;

    /**
     * The blockhash which is the base of the snapshot this chainstate was
     * created from.
     *
     * IsNull() if this chainstate was not created from a snapshot.
     */
    const BlockHash m_from_snapshot_blockhash{};

    /**
     * The set of all CBlockIndex entries with BLOCK_VALID_TRANSACTIONS (for
     * itself and all ancestors) and as good as our current tip or better.
     * Entries may be failed, though, and pruning nodes may be missing the data
     * for the block.
     */
    std::set<CBlockIndex *, CBlockIndexWorkComparator> setBlockIndexCandidates;

    //! @returns A reference to the in-memory cache of the UTXO set.
    CCoinsViewCache &CoinsTip() EXCLUSIVE_LOCKS_REQUIRED(cs_main) {
        assert(m_coins_views->m_cacheview);
        return *m_coins_views->m_cacheview.get();
    }

    //! @returns A reference to the on-disk UTXO set database.
    CCoinsViewDB &CoinsDB() { return m_coins_views->m_dbview; }

    //! @returns A reference to a wrapped view of the in-memory UTXO set that
    //!     handles disk read errors gracefully.
    CCoinsViewErrorCatcher &CoinsErrorCatcher()
        EXCLUSIVE_LOCKS_REQUIRED(cs_main) {
        return m_coins_views->m_catcherview;
    }

    //! Destructs all objects related to accessing the UTXO set.
    void ResetCoinsViews() { m_coins_views.reset(); }

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
    bool FlushStateToDisk(const CChainParams &chainparams,
                          BlockValidationState &state, FlushStateMode mode,
                          int nManualPruneHeight = 0);

    //! Unconditionally flush all changes to disk.
    void ForceFlushStateToDisk();

    //! Prune blockfiles from the disk if necessary and then flush chainstate
    //! changes if we pruned.
    void PruneAndFlush();

    /**
     * Make the best chain active, in multiple steps. The result is either
     * failure or an activated best chain. pblock is either nullptr or a pointer
     * to a block that is already loaded (to avoid loading it again from disk).
     *
     * ActivateBestChain is split into steps (see ActivateBestChainStep) so that
     * we avoid holding cs_main for an extended period of time; the length of
     * this call may be quite long during reindexing or a substantial reorg.
     *
     * May not be called with cs_main held. May not be called in a
     * validationinterface callback.
     *
     * @returns true unless a system error occurred
     */
    bool ActivateBestChain(
        const Config &config, BlockValidationState &state,
        std::shared_ptr<const CBlock> pblock = std::shared_ptr<const CBlock>())
        LOCKS_EXCLUDED(cs_main);

    bool AcceptBlock(const Config &config,
                     const std::shared_ptr<const CBlock> &pblock,
                     BlockValidationState &state, bool fRequested,
                     const FlatFilePos *dbp, bool *fNewBlock)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);

    // Block (dis)connection on a given view:
    DisconnectResult DisconnectBlock(const CBlock &block,
                                     const CBlockIndex *pindex,
                                     CCoinsViewCache &view);
    bool ConnectBlock(const CBlock &block, BlockValidationState &state,
                      CBlockIndex *pindex, CCoinsViewCache &view,
                      const CChainParams &params,
                      BlockValidationOptions options, bool fJustCheck = false)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);

    // Block disconnection on our pcoinsTip:
    bool DisconnectTip(const CChainParams &params, BlockValidationState &state,
                       DisconnectedBlockTransactions *disconnectpool)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main, ::g_mempool.cs);

    // Manual block validity manipulation:
    bool PreciousBlock(const Config &config, BlockValidationState &state,
                       CBlockIndex *pindex) LOCKS_EXCLUDED(cs_main);
    /** Mark a block as invalid. */
    bool InvalidateBlock(const Config &config, BlockValidationState &state,
                         CBlockIndex *pindex)
        LOCKS_EXCLUDED(cs_main, m_cs_chainstate);
    /** Park a block. */
    bool ParkBlock(const Config &config, BlockValidationState &state,
                   CBlockIndex *pindex)
        LOCKS_EXCLUDED(cs_main, m_cs_chainstate);

    /**
     * Finalize a block.
     * A finalized block can not be reorged in any way.
     */
    bool FinalizeBlock(const Config &config, BlockValidationState &state,
                       CBlockIndex *pindex)
        LOCKS_EXCLUDED(cs_main, m_cs_chainstate);
    /** Return the currently finalized block index. */
    const CBlockIndex *GetFinalizedBlock() const
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);
    /**
     * Checks if a block is finalized.
     */
    bool IsBlockFinalized(const CBlockIndex *pindex) const
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);

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
    void UnparkBlockImpl(CBlockIndex *pindex, bool fClearChildren)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);

    /** Replay blocks that aren't fully applied to the database. */
    bool ReplayBlocks(const Consensus::Params &params);
    bool LoadGenesisBlock(const CChainParams &chainparams);

    void PruneBlockIndexCandidates();

    void UnloadBlockIndex() EXCLUSIVE_LOCKS_REQUIRED(cs_main);

    /**
     * Check whether we are doing an initial block download (synchronizing from
     * disk or network)
     */
    bool IsInitialBlockDownload() const;

    /**
     * Make various assertions about the state of the block index.
     *
     * By default this only executes fully when using the Regtest chain; see:
     * fCheckBlockIndex.
     */
    void CheckBlockIndex(const Consensus::Params &consensusParams);

    /** Update the chain tip based on database information, i.e. CoinsTip()'s
     * best block. */
    bool LoadChainTip(const CChainParams &chainparams)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);

    //! Dictates whether we need to flush the cache to disk or not.
    //!
    //! @return the state of the size of the coins cache.
    CoinsCacheSizeState GetCoinsCacheSizeState(const CTxMemPool &tx_pool)
        EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

    CoinsCacheSizeState GetCoinsCacheSizeState(
        const CTxMemPool &tx_pool, size_t max_coins_cache_size_bytes,
        size_t max_mempool_size_bytes) EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

    std::string ToString() EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

private:
    bool ActivateBestChainStep(const Config &config,
                               BlockValidationState &state,
                               CBlockIndex *pindexMostWork,
                               const std::shared_ptr<const CBlock> &pblock,
                               bool &fInvalidFound, ConnectTrace &connectTrace)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main, ::g_mempool.cs);
    bool ConnectTip(const Config &config, BlockValidationState &state,
                    CBlockIndex *pindexNew,
                    const std::shared_ptr<const CBlock> &pblock,
                    ConnectTrace &connectTrace,
                    DisconnectedBlockTransactions &disconnectpool)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main, ::g_mempool.cs);
    void InvalidBlockFound(CBlockIndex *pindex,
                           const BlockValidationState &state)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);
    void InvalidChainFound(CBlockIndex *pindexNew)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);
    CBlockIndex *FindMostWorkChain() EXCLUSIVE_LOCKS_REQUIRED(cs_main);
    bool MarkBlockAsFinal(BlockValidationState &state,
                          const CBlockIndex *pindex)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);
    void ReceivedBlockTransactions(const CBlock &block, CBlockIndex *pindexNew,
                                   const FlatFilePos &pos)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);

    bool RollforwardBlock(const CBlockIndex *pindex, CCoinsViewCache &inputs,
                          const Consensus::Params &params)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);
    bool UnwindBlock(const Config &config, BlockValidationState &state,
                     CBlockIndex *pindex, bool invalidate)
        EXCLUSIVE_LOCKS_REQUIRED(m_cs_chainstate);

    friend ChainstateManager;
};

/**
 * Mark a block as precious and reorganize.
 *
 * May not be called in a validationinterface callback.
 */
bool PreciousBlock(const Config &config, BlockValidationState &state,
                   CBlockIndex *pindex) LOCKS_EXCLUDED(cs_main);

/** Remove invalidity status from a block and its descendants. */
void ResetBlockFailureFlags(CBlockIndex *pindex)
    EXCLUSIVE_LOCKS_REQUIRED(cs_main);

/** Remove parked status from a block and its descendants. */
void UnparkBlockAndChildren(CBlockIndex *pindex)
    EXCLUSIVE_LOCKS_REQUIRED(cs_main);

/** Remove parked status from a block. */
void UnparkBlock(CBlockIndex *pindex) EXCLUSIVE_LOCKS_REQUIRED(cs_main);

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
 *
 * *Validated chainstate*: the most-work chainstate which has been validated
 *   locally via initial block download. This will be the snapshot chainstate
 *   if a snapshot was loaded and all blocks up to the snapshot starting point
 *   have been downloaded and validated (via background validation), otherwise
 *   it will be the IBD chainstate.
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
    //! be reset until init.cpp:Shutdown(). This means it is safe to acquire
    //! the contents of this pointer with ::cs_main held, release the lock,
    //! and then use the reference without concern of it being deconstructed.
    //!
    //! This is especially important when, e.g., calling ActivateBestChain()
    //! on all chainstates because we are not able to hold ::cs_main going into
    //! that call.
    std::unique_ptr<CChainState> m_ibd_chainstate;

    //! A chainstate initialized on the basis of a UTXO snapshot. If this is
    //! non-null, it is always our active chainstate.
    //!
    //! Once this pointer is set to a corresponding chainstate, it will not
    //! be reset until init.cpp:Shutdown(). This means it is safe to acquire
    //! the contents of this pointer with ::cs_main held, release the lock,
    //! and then use the reference without concern of it being deconstructed.
    //!
    //! This is especially important when, e.g., calling ActivateBestChain()
    //! on all chainstates because we are not able to hold ::cs_main going into
    //! that call.
    std::unique_ptr<CChainState> m_snapshot_chainstate;

    //! Points to either the ibd or snapshot chainstate; indicates our
    //! most-work chain.
    //!
    //! Once this pointer is set to a corresponding chainstate, it will not
    //! be reset until init.cpp:Shutdown(). This means it is safe to acquire
    //! the contents of this pointer with ::cs_main held, release the lock,
    //! and then use the reference without concern of it being deconstructed.
    //!
    //! This is especially important when, e.g., calling ActivateBestChain()
    //! on all chainstates because we are not able to hold ::cs_main going into
    //! that call.
    CChainState *m_active_chainstate{nullptr};

    //! If true, the assumed-valid chainstate has been fully validated
    //! by the background validation chainstate.
    bool m_snapshot_validated{false};

    // For access to m_active_chainstate.
    friend CChainState &ChainstateActive();
    friend CChain &ChainActive();

public:
    //! A single BlockManager instance is shared across each constructed
    //! chainstate to avoid duplicating block metadata.
    BlockManager m_blockman GUARDED_BY(::cs_main);

    //! The total number of bytes available for us to use across all in-memory
    //! coins caches. This will be split somehow across chainstates.
    int64_t m_total_coinstip_cache{0};
    //
    //! The total number of bytes available for us to use across all leveldb
    //! coins databases. This will be split somehow across chainstates.
    int64_t m_total_coinsdb_cache{0};

    //! Instantiate a new chainstate and assign it based upon whether it is
    //! from a snapshot.
    //!
    //! @param[in] snapshot_blockhash   If given, signify that this chainstate
    //!                                 is based on a snapshot.
    CChainState &
    InitializeChainstate(const BlockHash &snapshot_blockhash = BlockHash())
        EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

    //! Get all chainstates currently being used.
    std::vector<CChainState *> GetAll();

    //! The most-work chain.
    CChainState &ActiveChainstate() const;
    CChain &ActiveChain() const { return ActiveChainstate().m_chain; }
    int ActiveHeight() const { return ActiveChain().Height(); }
    CBlockIndex *ActiveTip() const { return ActiveChain().Tip(); }

    BlockMap &BlockIndex() EXCLUSIVE_LOCKS_REQUIRED(::cs_main) {
        return m_blockman.m_block_index;
    }

    bool IsSnapshotActive() const;

    std::optional<BlockHash> SnapshotBlockhash() const;

    //! Is there a snapshot in use and has it been fully validated?
    bool IsSnapshotValidated() const { return m_snapshot_validated; }

    //! @returns true if this chainstate is being used to validate an active
    //!          snapshot in the background.
    bool IsBackgroundIBD(CChainState *chainstate) const;

    //! Return the most-work chainstate that has been fully validated.
    //!
    //! During background validation of a snapshot, this is the IBD chain. After
    //! background validation has completed, this is the snapshot chain.
    CChainState &ValidatedChainstate() const;

    CChain &ValidatedChain() const { return ValidatedChainstate().m_chain; }
    CBlockIndex *ValidatedTip() const { return ValidatedChain().Tip(); }

    /**
     * Process an incoming block. This only returns after the best known valid
     * block is made active. Note that it does not, however, guarantee that the
     * specific block passed to it has been checked for validity!
     *
     * If you want to *possibly* get feedback on whether pblock is valid, you
     * must install a CValidationInterface (see validationinterface.h) - this
     * will have its BlockChecked method called whenever *any* block completes
     * validation.
     *
     * Note that we guarantee that either the proof-of-work is valid on pblock,
     * or (and possibly also) BlockChecked will have been called.
     *
     * May not be called in a validationinterface callback.
     *
     * @param[in]   config  The global config.
     * @param[in]   pblock  The block we want to process.
     * @param[in]   fForceProcessing Process this block even if unrequested;
     * used for non-network block sources and whitelisted peers.
     * @param[out]  fNewBlock A boolean which is set to indicate if the block
     * was first received via this call.
     * @returns     If the block was processed, independently of block validity
     */
    bool ProcessNewBlock(const Config &config,
                         const std::shared_ptr<const CBlock> pblock,
                         bool fForceProcessing, bool *fNewBlock)
        LOCKS_EXCLUDED(cs_main);

    /**
     * Process incoming block headers.
     *
     * May not be called in a validationinterface callback.
     *
     * @param[in]  config        The config.
     * @param[in]  block         The block headers themselves.
     * @param[out] state         This may be set to an Error state if any error
     *                           occurred processing them.
     * @param[out] ppindex       If set, the pointer will be set to point to the
     *                           last new block index object for the given
     * headers.
     * @return True if block headers were accepted as valid.
     */
    bool ProcessNewBlockHeaders(const Config &config,
                                const std::vector<CBlockHeader> &block,
                                BlockValidationState &state,
                                const CBlockIndex **ppindex = nullptr)
        LOCKS_EXCLUDED(cs_main);

    //! Mark one block file as pruned (modify associated database entries)
    void PruneOneBlockFile(const int fileNumber)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);

    //! Load the block tree and coins database from disk, initializing state if
    //! we're running with -reindex
    bool LoadBlockIndex(const Consensus::Params &params)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);

    //! Unload block index and chain data before shutdown.
    void Unload() EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

    //! Clear (deconstruct) chainstate data.
    void Reset();

    //! Check to see if caches are out of balance and if so, call
    //! ResizeCoinsCaches() as needed.
    void MaybeRebalanceCaches() EXCLUSIVE_LOCKS_REQUIRED(::cs_main);
};

/**
 * DEPRECATED! Please use node.chainman instead. May only be used in
 * validation.cpp internally
 */
extern ChainstateManager g_chainman GUARDED_BY(::cs_main);

/** Please prefer the identical ChainstateManager::ActiveChainstate */
CChainState &ChainstateActive();

/** Please prefer the identical ChainstateManager::ActiveChain */
CChain &ChainActive();

/** Please prefer the identical ChainstateManager::BlockIndex */
BlockMap &BlockIndex();

/**
 * Global variable that points to the active block tree (protected by cs_main)
 */
extern std::unique_ptr<CBlockTreeDB> pblocktree;

/**
 * Return the spend height, which is one more than the inputs.GetBestBlock().
 * While checking, GetBestBlock() refers to the parent block. (protected by
 * cs_main)
 * This is also true for mempool checks.
 */
int GetSpendHeight(const CCoinsViewCache &inputs);

/**
 * Determine what nVersion a new block should use.
 */
int32_t ComputeBlockVersion(const CBlockIndex *pindexPrev,
                            const Consensus::Params &params);

/** Get block file info entry for one block file */
CBlockFileInfo *GetBlockFileInfo(size_t n);

/** Dump the mempool to disk. */
bool DumpMempool(const CTxMemPool &pool);

/** Load the mempool from disk. */
bool LoadMempool(const Config &config, CTxMemPool &pool);

//! Check whether the block associated with this index entry is pruned or not.
bool IsBlockPruned(const CBlockIndex *pblockindex);

#endif // BITCOIN_VALIDATION_H
