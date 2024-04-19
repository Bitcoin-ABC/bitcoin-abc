// Copyright (c) 2011-2021 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_NODE_BLOCKSTORAGE_H
#define BITCOIN_NODE_BLOCKSTORAGE_H

#include <cstdint>
#include <vector>

#include <chain.h>
#include <fs.h>
#include <kernel/blockmanager_opts.h>
#include <kernel/cs_main.h>
#include <protocol.h> // For CMessageHeader::MessageStartChars
#include <sync.h>
#include <txdb.h>

class ArgsManager;
class BlockValidationState;
class CBlock;
class CBlockFileInfo;
class CBlockHeader;
class CBlockUndo;
class CChain;
class CChainParams;
class CTxUndo;
class Chainstate;
class ChainstateManager;
struct CCheckpointData;
class Config;
struct FlatFilePos;
namespace Consensus {
struct Params;
}

namespace node {
static constexpr bool DEFAULT_STOPAFTERBLOCKIMPORT{false};

/** The pre-allocation chunk size for blk?????.dat files (since 0.8) */
static constexpr unsigned int BLOCKFILE_CHUNK_SIZE = 0x1000000; // 16 MiB
/** The pre-allocation chunk size for rev?????.dat files (since 0.8) */
static const unsigned int UNDOFILE_CHUNK_SIZE = 0x100000; // 1 MiB
/** The maximum size of a blk?????.dat file (since 0.8) */
static const unsigned int MAX_BLOCKFILE_SIZE = 0x8000000; // 128 MiB

/** Size of header written by WriteBlockToDisk before a serialized CBlock */
static constexpr size_t BLOCK_SERIALIZATION_HEADER_SIZE =
    CMessageHeader::MESSAGE_START_SIZE + sizeof(unsigned int);

extern std::atomic_bool fReindex;

// Because validation code takes pointers to the map's CBlockIndex objects, if
// we ever switch to another associative container, we need to either use a
// container that has stable addressing (true of all std associative
// containers), or make the key a `std::unique_ptr<CBlockIndex>`
using BlockMap = std::unordered_map<BlockHash, CBlockIndex, BlockHasher>;

/**
 * Maintains a tree of blocks (stored in `m_block_index`) which is consulted
 * to determine where the most-work tip is.
 *
 * This data is used mostly in `Chainstate` - information about, e.g.,
 * candidate tips is not maintained here.
 */
class BlockManager {
    friend Chainstate;
    friend ChainstateManager;

private:
    /**
     * Load the blocktree off disk and into memory. Populate certain metadata
     * per index entry (nStatus, nChainWork, nTimeMax, etc.) as well as
     * peripheral collections like m_dirty_blockindex.
     */
    bool LoadBlockIndex(const Consensus::Params &consensus_params)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);
    void FlushBlockFile(bool fFinalize = false, bool finalize_undo = false);
    void FlushUndoFile(int block_file, bool finalize = false);
    bool FindBlockPos(FlatFilePos &pos, unsigned int nAddSize,
                      unsigned int nHeight, CChain &active_chain,
                      uint64_t nTime, bool fKnown);
    bool FindUndoPos(BlockValidationState &state, int nFile, FlatFilePos &pos,
                     unsigned int nAddSize);

    /**
     * Calculate the block/rev files to delete based on height specified
     * by user with RPC command pruneblockchain
     */
    void FindFilesToPruneManual(std::set<int> &setFilesToPrune,
                                int nManualPruneHeight, int chain_tip_height);

    /**
     * Prune block and undo files (blk???.dat and undo???.dat) so that the disk
     * space used is less than a user-defined target. The user sets the target
     * (in MB) on the command line or in config file.  This will be run on
     * startup and whenever new space is allocated in a block or undo file,
     * staying below the target. Changing back to unpruned requires a reindex
     * (which in this case means the blockchain must be re-downloaded.)
     *
     * Pruning functions are called from FlushStateToDisk when the
     * m_check_for_pruning flag has been set. Block and undo files are deleted
     * in lock-step (when blk00003.dat is deleted, so is rev00003.dat.) Pruning
     * cannot take place until the longest chain is at least a certain length
     * (CChainParams::nPruneAfterHeight). Pruning will never delete a block
     * within a defined distance (currently 288) from the active chain's tip.
     * The block index is updated by unsetting HAVE_DATA and HAVE_UNDO for any
     * blocks that were stored in the deleted files. A db flag records the fact
     * that at least some block files have been pruned.
     *
     * @param[out]   setFilesToPrune   The set of file indices that can be
     *                                 unlinked will be returned
     */
    void FindFilesToPrune(std::set<int> &setFilesToPrune,
                          uint64_t nPruneAfterHeight, int chain_tip_height,
                          int prune_height, bool is_ibd);

    RecursiveMutex cs_LastBlockFile;
    std::vector<CBlockFileInfo> m_blockfile_info;
    int m_last_blockfile = 0;
    /**
     * Global flag to indicate we should check to see if there are
     * block/undo files that should be deleted.  Set on startup
     * or if we allocate more file space when we're in prune mode
     */
    bool m_check_for_pruning = false;

    const bool m_prune_mode;

    /** Dirty block index entries. */
    std::set<CBlockIndex *> m_dirty_blockindex;

    /** Dirty block file entries. */
    std::set<int> m_dirty_fileinfo;

    const kernel::BlockManagerOpts m_opts;

public:
    using Options = kernel::BlockManagerOpts;

    explicit BlockManager(Options opts)
        : m_prune_mode{opts.prune_target > 0}, m_opts{std::move(opts)} {};

    std::atomic<bool> m_importing{false};

    BlockMap m_block_index GUARDED_BY(cs_main);

    std::vector<CBlockIndex *> GetAllBlockIndices()
        EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

    /**
     * All pairs A->B, where A (or one of its ancestors) misses transactions,
     * but B has transactions. Pruned nodes may have entries where B is missing
     * data.
     */
    std::multimap<CBlockIndex *, CBlockIndex *> m_blocks_unlinked;

    std::unique_ptr<CBlockTreeDB> m_block_tree_db GUARDED_BY(::cs_main);

    bool WriteBlockIndexDB() EXCLUSIVE_LOCKS_REQUIRED(::cs_main);
    bool LoadBlockIndexDB(const Consensus::Params &consensus_params)
        EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

    CBlockIndex *AddToBlockIndex(const CBlockHeader &block,
                                 CBlockIndex *&best_header)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);
    /** Create a new block index entry for a given block hash */
    CBlockIndex *InsertBlockIndex(const BlockHash &hash)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);

    //! Mark one block file as pruned (modify associated database entries)
    void PruneOneBlockFile(const int fileNumber)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);

    CBlockIndex *LookupBlockIndex(const BlockHash &hash)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);
    const CBlockIndex *LookupBlockIndex(const BlockHash &hash) const
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);

    /** Get block file info entry for one block file */
    CBlockFileInfo *GetBlockFileInfo(size_t n);

    bool WriteUndoDataForBlock(const CBlockUndo &blockundo,
                               BlockValidationState &state, CBlockIndex *pindex,
                               const CChainParams &chainparams)
        EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

    /**
     * Store block on disk. If dbp is not nullptr, then it provides the known
     * position of the block within a block file on disk.
     */
    FlatFilePos SaveBlockToDisk(const CBlock &block, int nHeight,
                                CChain &active_chain,
                                const CChainParams &chainparams,
                                const FlatFilePos *dbp);

    /** Whether running in -prune mode. */
    [[nodiscard]] bool IsPruneMode() const { return m_prune_mode; }

    /** Attempt to stay below this number of bytes of block files. */
    [[nodiscard]] uint64_t GetPruneTarget() const {
        return m_opts.prune_target;
    }

    [[nodiscard]] bool LoadingBlocks() const { return m_importing || fReindex; }

    /**
     * Calculate the amount of disk space the block & undo files currently use
     */
    uint64_t CalculateCurrentUsage();

    //! Returns last CBlockIndex* that is a checkpoint
    const CBlockIndex *GetLastCheckpoint(const CCheckpointData &data)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);

    /** True if any block files have ever been pruned. */
    bool m_have_pruned = false;

    //! Check whether the block associated with this index entry is pruned or
    //! not.
    bool IsBlockPruned(const CBlockIndex *pblockindex)
        EXCLUSIVE_LOCKS_REQUIRED(::cs_main);
};

//! Find the first block that is not pruned
const CBlockIndex *GetFirstStoredBlock(const CBlockIndex *start_block)
    EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

void CleanupBlockRevFiles();

/** Open a block file (blk?????.dat) */
FILE *OpenBlockFile(const FlatFilePos &pos, bool fReadOnly = false);
/** Translation to a filesystem path. */
fs::path GetBlockPosFilename(const FlatFilePos &pos);

/**
 *  Actually unlink the specified files
 */
void UnlinkPrunedFiles(const std::set<int> &setFilesToPrune);

/** Functions for disk access for blocks */
bool ReadBlockFromDisk(CBlock &block, const FlatFilePos &pos,
                       const Consensus::Params &consensusParams);
bool ReadBlockFromDisk(CBlock &block, const CBlockIndex *pindex,
                       const Consensus::Params &consensusParams);
bool UndoReadFromDisk(CBlockUndo &blockundo, const CBlockIndex *pindex);

/** Functions for disk access for txs */
bool ReadTxFromDisk(CMutableTransaction &tx, const FlatFilePos &pos);
bool ReadTxUndoFromDisk(CTxUndo &tx, const FlatFilePos &pos);

void ThreadImport(ChainstateManager &chainman,
                  std::vector<fs::path> vImportFiles, const ArgsManager &args,
                  const fs::path &mempool_path);
} // namespace node

#endif // BITCOIN_NODE_BLOCKSTORAGE_H
