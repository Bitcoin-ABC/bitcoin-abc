// Copyright (c) 2017-2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chain.h>
#include <chainparams.h>
#include <common/args.h>
#include <config.h>
#include <index/base.h>
#include <interfaces/chain.h>
#include <logging.h>
#include <node/blockstorage.h>
#include <node/context.h>
#include <node/database_args.h>
#include <node/ui_interface.h>
#include <shutdown.h>
#include <tinyformat.h>
#include <util/thread.h>
#include <util/translation.h>
#include <validation.h> // For Chainstate
#include <warnings.h>

#include <functional>
#include <string>
#include <utility>

constexpr uint8_t DB_BEST_BLOCK{'B'};

constexpr int64_t SYNC_LOG_INTERVAL = 30;           // secon
constexpr int64_t SYNC_LOCATOR_WRITE_INTERVAL = 30; // seconds

template <typename... Args>
static void FatalError(const char *fmt, const Args &...args) {
    AbortNode(tfm::format(fmt, args...));
}

CBlockLocator GetLocator(interfaces::Chain &chain,
                         const BlockHash &block_hash) {
    CBlockLocator locator;
    bool found =
        chain.findBlock(block_hash, interfaces::FoundBlock().locator(locator));
    assert(found);
    assert(!locator.IsNull());
    return locator;
}

BaseIndex::DB::DB(const fs::path &path, size_t n_cache_size, bool f_memory,
                  bool f_wipe, bool f_obfuscate)
    : CDBWrapper{DBParams{.path = path,
                          .cache_bytes = n_cache_size,
                          .memory_only = f_memory,
                          .wipe_data = f_wipe,
                          .obfuscate = f_obfuscate,
                          .options = [] {
                              DBOptions options;
                              node::ReadDatabaseArgs(gArgs, options);
                              return options;
                          }()}} {}

bool BaseIndex::DB::ReadBestBlock(CBlockLocator &locator) const {
    bool success = Read(DB_BEST_BLOCK, locator);
    if (!success) {
        locator.SetNull();
    }
    return success;
}

void BaseIndex::DB::WriteBestBlock(CDBBatch &batch,
                                   const CBlockLocator &locator) {
    batch.Write(DB_BEST_BLOCK, locator);
}

BaseIndex::BaseIndex(std::unique_ptr<interfaces::Chain> chain, std::string name)
    : m_chain{std::move(chain)}, m_name{std::move(name)} {}

BaseIndex::~BaseIndex() {
    Interrupt();
    Stop();
}

bool BaseIndex::Init() {
    AssertLockNotHeld(cs_main);

    // May need reset if index is being restarted.
    m_interrupt.reset();

    // Register to validation interface before setting the 'm_synced' flag, so
    // that callbacks are not missed once m_synced is true.
    RegisterValidationInterface(this);

    CBlockLocator locator;
    if (!GetDB().ReadBestBlock(locator)) {
        locator.SetNull();
    }

    LOCK(cs_main);
    // m_chainstate member gives indexing code access to node internals. It is
    // removed in followup https://github.com/bitcoin/bitcoin/pull/24230
    m_chainstate = &m_chain->context()->chainman->GetChainstateForIndexing();
    CChain &index_chain = m_chainstate->m_chain;

    if (locator.IsNull()) {
        SetBestBlockIndex(nullptr);
    } else {
        // Setting the best block to the locator's top block. If it is not part
        // of the best chain, we will rewind to the fork point during index sync
        const CBlockIndex *locator_index{
            m_chainstate->m_blockman.LookupBlockIndex(locator.vHave.at(0))};
        if (!locator_index) {
            return InitError(
                strprintf(Untranslated("%s: best block of the index not found. "
                                       "Please rebuild the index."),
                          GetName()));
        }
        SetBestBlockIndex(locator_index);
    }

    // Child init
    const CBlockIndex *start_block = m_best_block_index.load();
    if (!CustomInit(start_block ? std::make_optional(interfaces::BlockKey{
                                      start_block->GetBlockHash(),
                                      start_block->nHeight})
                                : std::nullopt)) {
        return false;
    }

    // Note: this will latch to true immediately if the user starts up with an
    // empty datadir and an index enabled. If this is the case, indexation will
    // happen solely via `BlockConnected` signals until, possibly, the next
    // restart.
    m_synced = start_block == index_chain.Tip();
    m_init = true;
    return true;
}

static const CBlockIndex *NextSyncBlock(const CBlockIndex *pindex_prev,
                                        CChain &chain)
    EXCLUSIVE_LOCKS_REQUIRED(cs_main) {
    AssertLockHeld(cs_main);

    if (!pindex_prev) {
        return chain.Genesis();
    }

    const CBlockIndex *pindex = chain.Next(pindex_prev);
    if (pindex) {
        return pindex;
    }

    return chain.Next(chain.FindFork(pindex_prev));
}

void BaseIndex::ThreadSync() {
    const CBlockIndex *pindex = m_best_block_index.load();
    if (!m_synced) {
        int64_t last_log_time = 0;
        int64_t last_locator_write_time = 0;
        while (true) {
            if (m_interrupt) {
                LogPrintf("%s: m_interrupt set; exiting ThreadSync\n",
                          GetName());

                SetBestBlockIndex(pindex);
                // No need to handle errors in Commit. If it fails, the error
                // will be already be logged. The best way to recover is to
                // continue, as index cannot be corrupted by a missed commit to
                // disk for an advanced index state.
                Commit();
                return;
            }

            {
                LOCK(cs_main);
                const CBlockIndex *pindex_next =
                    NextSyncBlock(pindex, m_chainstate->m_chain);
                if (!pindex_next) {
                    SetBestBlockIndex(pindex);
                    m_synced = true;
                    // No need to handle errors in Commit. See rationale above.
                    Commit();
                    break;
                }
                if (pindex_next->pprev != pindex &&
                    !Rewind(pindex, pindex_next->pprev)) {
                    FatalError(
                        "%s: Failed to rewind index %s to a previous chain tip",
                        __func__, GetName());
                    return;
                }
                pindex = pindex_next;
            }

            CBlock block;
            if (!m_chainstate->m_blockman.ReadBlockFromDisk(block, *pindex)) {
                FatalError("%s: Failed to read block %s from disk", __func__,
                           pindex->GetBlockHash().ToString());
                return;
            }
            if (!WriteBlock(block, pindex)) {
                FatalError("%s: Failed to write block %s to index database",
                           __func__, pindex->GetBlockHash().ToString());
                return;
            }

            int64_t current_time = GetTime();
            if (last_log_time + SYNC_LOG_INTERVAL < current_time) {
                LogPrintf("Syncing %s with block chain from height %d\n",
                          GetName(), pindex->nHeight);
                last_log_time = current_time;
            }

            if (last_locator_write_time + SYNC_LOCATOR_WRITE_INTERVAL <
                current_time) {
                SetBestBlockIndex(pindex->pprev);
                last_locator_write_time = current_time;
                // No need to handle errors in Commit. See rationale above.
                Commit();
            }
        }
    }

    if (pindex) {
        LogPrintf("%s is enabled at height %d\n", GetName(), pindex->nHeight);
    } else {
        LogPrintf("%s is enabled\n", GetName());
    }
}

bool BaseIndex::Commit() {
    // Don't commit anything if we haven't indexed any block yet
    // (this could happen if init is interrupted).
    bool ok = m_best_block_index != nullptr;
    if (ok) {
        CDBBatch batch(GetDB());
        ok = CustomCommit(batch);
        if (ok) {
            GetDB().WriteBestBlock(
                batch, GetLocator(*m_chain,
                                  m_best_block_index.load()->GetBlockHash()));
            ok = GetDB().WriteBatch(batch);
        }
    }
    if (!ok) {
        return error("%s: Failed to commit latest %s state", __func__,
                     GetName());
    }
    return true;
}

bool BaseIndex::Rewind(const CBlockIndex *current_tip,
                       const CBlockIndex *new_tip) {
    assert(current_tip == m_best_block_index);
    assert(current_tip->GetAncestor(new_tip->nHeight) == new_tip);

    // Don't commit here - the committed index state must never be ahead of the
    // flushed chainstate, otherwise unclean restarts would lead to index
    // corruption.
    // Pruning has a minimum of 288 blocks-to-keep and getting the index
    // out of sync may be possible but a users fault.
    // In case we reorg beyond the pruned depth, ReadBlockFromDisk would
    // throw and lead to a graceful shutdown
    SetBestBlockIndex(new_tip);
    return true;
}

void BaseIndex::BlockConnected(ChainstateRole role,
                               const std::shared_ptr<const CBlock> &block,
                               const CBlockIndex *pindex) {
    // Ignore events from the assumed-valid chain; we will process its blocks
    // (sequentially) after it is fully verified by the background chainstate.
    // This is to avoid any out-of-order indexing.
    //
    // TODO at some point we could parameterize whether a particular index can
    // be built out of order, but for now just do the conservative simple thing.
    if (role == ChainstateRole::ASSUMEDVALID) {
        return;
    }

    // Ignore BlockConnected signals until we have fully indexed the chain.
    if (!m_synced) {
        return;
    }

    const CBlockIndex *best_block_index = m_best_block_index.load();
    if (!best_block_index) {
        if (pindex->nHeight != 0) {
            FatalError("%s: First block connected is not the genesis block "
                       "(height=%d)",
                       __func__, pindex->nHeight);
            return;
        }
    } else {
        // Ensure block connects to an ancestor of the current best block. This
        // should be the case most of the time, but may not be immediately after
        // the the sync thread catches up and sets m_synced. Consider the case
        // where there is a reorg and the blocks on the stale branch are in the
        // ValidationInterface queue backlog even after the sync thread has
        // caught up to the new chain tip. In this unlikely event, log a warning
        // and let the queue clear.
        if (best_block_index->GetAncestor(pindex->nHeight - 1) !=
            pindex->pprev) {
            LogPrintf("%s: WARNING: Block %s does not connect to an ancestor "
                      "of known best chain (tip=%s); not updating index\n",
                      __func__, pindex->GetBlockHash().ToString(),
                      best_block_index->GetBlockHash().ToString());
            return;
        }
        if (best_block_index != pindex->pprev &&
            !Rewind(best_block_index, pindex->pprev)) {
            FatalError("%s: Failed to rewind index %s to a previous chain tip",
                       __func__, GetName());
            return;
        }
    }

    if (WriteBlock(*block, pindex)) {
        // Setting the best block index is intentionally the last step of this
        // function, so BlockUntilSyncedToCurrentChain callers waiting for the
        // best block index to be updated can rely on the block being fully
        // processed, and the index object being safe to delete.
        SetBestBlockIndex(pindex);
    } else {
        FatalError("%s: Failed to write block %s to index", __func__,
                   pindex->GetBlockHash().ToString());
        return;
    }
}

void BaseIndex::ChainStateFlushed(ChainstateRole role,
                                  const CBlockLocator &locator) {
    // Ignore events from the assumed-valid chain; we will process its blocks
    // (sequentially) after it is fully verified by the background chainstate.
    if (role == ChainstateRole::ASSUMEDVALID) {
        return;
    }

    if (!m_synced) {
        return;
    }

    const BlockHash &locator_tip_hash = locator.vHave.front();
    const CBlockIndex *locator_tip_index;
    {
        LOCK(cs_main);
        locator_tip_index =
            m_chainstate->m_blockman.LookupBlockIndex(locator_tip_hash);
    }

    if (!locator_tip_index) {
        FatalError("%s: First block (hash=%s) in locator was not found",
                   __func__, locator_tip_hash.ToString());
        return;
    }

    // This checks that ChainStateFlushed callbacks are received after
    // BlockConnected. The check may fail immediately after the the sync thread
    // catches up and sets m_synced. Consider the case where there is a reorg
    // and the blocks on the stale branch are in the ValidationInterface queue
    // backlog even after the sync thread has caught up to the new chain tip. In
    // this unlikely event, log a warning and let the queue clear.
    const CBlockIndex *best_block_index = m_best_block_index.load();
    if (best_block_index->GetAncestor(locator_tip_index->nHeight) !=
        locator_tip_index) {
        LogPrintf("%s: WARNING: Locator contains block (hash=%s) not on known "
                  "best chain (tip=%s); not writing index locator\n",
                  __func__, locator_tip_hash.ToString(),
                  best_block_index->GetBlockHash().ToString());
        return;
    }

    // No need to handle errors in Commit. If it fails, the error will be
    // already be logged. The best way to recover is to continue, as index
    // cannot be corrupted by a missed commit to disk for an advanced index
    // state.
    Commit();
}

bool BaseIndex::BlockUntilSyncedToCurrentChain() const {
    AssertLockNotHeld(cs_main);

    if (!m_synced) {
        return false;
    }

    {
        // Skip the queue-draining stuff if we know we're caught up with
        // m_chain.Tip().
        LOCK(cs_main);
        const CBlockIndex *chain_tip = m_chainstate->m_chain.Tip();
        const CBlockIndex *best_block_index = m_best_block_index.load();
        if (best_block_index->GetAncestor(chain_tip->nHeight) == chain_tip) {
            return true;
        }
    }

    LogPrintf("%s: %s is catching up on block notifications\n", __func__,
              GetName());
    SyncWithValidationInterfaceQueue();
    return true;
}

void BaseIndex::Interrupt() {
    m_interrupt();
}

bool BaseIndex::StartBackgroundSync() {
    if (!m_init) {
        throw std::logic_error("Error: Cannot start a non-initialized index");
    }

    m_thread_sync =
        std::thread(&util::TraceThread, GetName(), [this] { ThreadSync(); });
    return true;
}

void BaseIndex::Stop() {
    UnregisterValidationInterface(this);

    if (m_thread_sync.joinable()) {
        m_thread_sync.join();
    }
}

IndexSummary BaseIndex::GetSummary() const {
    IndexSummary summary{};
    summary.name = GetName();
    summary.synced = m_synced;
    if (const auto &pindex = m_best_block_index.load()) {
        summary.best_block_height = pindex->nHeight;
        summary.best_block_hash = pindex->GetBlockHash();
    } else {
        summary.best_block_height = 0;
        summary.best_block_hash = m_chain->getBlockHash(0);
    }
    return summary;
}

void BaseIndex::SetBestBlockIndex(const CBlockIndex *block) {
    assert(!m_chainstate->m_blockman.IsPruneMode() || AllowPrune());

    if (AllowPrune() && block) {
        node::PruneLockInfo prune_lock;
        prune_lock.height_first = block->nHeight;
        WITH_LOCK(::cs_main, m_chainstate->m_blockman.UpdatePruneLock(
                                 GetName(), prune_lock));
    }

    // Intentionally set m_best_block_index as the last step in this function,
    // after updating prune locks above, and after making any other references
    // to *this, so the BlockUntilSyncedToCurrentChain function (which checks
    // m_best_block_index as an optimization) can be used to wait for the last
    // BlockConnected notification and safely assume that prune locks are
    // updated and that the index object is safe to delete.
    m_best_block_index = block;
}
