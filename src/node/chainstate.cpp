// Copyright (c) 2021 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <node/chainstate.h>

#include <chainparams.h>
#include <config.h>
#include <node/blockstorage.h>
#include <rpc/blockchain.h>
#include <shutdown.h>
#include <util/time.h>
#include <validation.h>

std::optional<ChainstateLoadingError>
LoadChainstate(bool fReset, ChainstateManager &chainman, CTxMemPool *mempool,
               bool fPruneMode_, const Config &config, bool fReindexChainState,
               int64_t nBlockTreeDBCache, int64_t nCoinDBCache,
               int64_t nCoinCacheUsage, std::function<void()> coins_error_cb) {
    const CChainParams &chainparams = config.GetChainParams();

    auto is_coinsview_empty =
        [&](CChainState *chainstate) EXCLUSIVE_LOCKS_REQUIRED(::cs_main) {
            return fReset || fReindexChainState ||
                   chainstate->CoinsTip().GetBestBlock().IsNull();
        };

    {
        LOCK(cs_main);
        chainman.InitializeChainstate(mempool);
        chainman.m_total_coinstip_cache = nCoinCacheUsage;
        chainman.m_total_coinsdb_cache = nCoinDBCache;

        UnloadBlockIndex(mempool, chainman);

        auto &pblocktree{chainman.m_blockman.m_block_tree_db};
        // new CBlockTreeDB tries to delete the existing file, which
        // fails if it's still open from the previous loop. Close it first:
        pblocktree.reset();
        pblocktree.reset(new CBlockTreeDB(nBlockTreeDBCache, false, fReset));

        if (fReset) {
            pblocktree->WriteReindexing(true);
            // If we're reindexing in prune mode, wipe away unusable block
            // files and all undo data files
            if (fPruneMode_) {
                CleanupBlockRevFiles();
            }
        }

        const Consensus::Params &params = chainparams.GetConsensus();

        // If necessary, upgrade from older database format.
        // This is a no-op if we cleared the block tree db with -reindex
        // or -reindex-chainstate
        if (!pblocktree->Upgrade(params)) {
            return ChainstateLoadingError::ERROR_UPGRADING_BLOCK_DB;
        }

        if (ShutdownRequested()) {
            return ChainstateLoadingError::SHUTDOWN_PROBED;
        }

        // LoadBlockIndex will load fHavePruned if we've ever removed a
        // block file from disk.
        // Note that it also sets fReindex based on the disk flag!
        // From here on out fReindex and fReset mean something different!
        if (!chainman.LoadBlockIndex()) {
            if (ShutdownRequested()) {
                return ChainstateLoadingError::SHUTDOWN_PROBED;
            }
            return ChainstateLoadingError::ERROR_LOADING_BLOCK_DB;
        }

        if (!chainman.BlockIndex().empty() &&
            !chainman.m_blockman.LookupBlockIndex(
                chainparams.GetConsensus().hashGenesisBlock)) {
            return ChainstateLoadingError::ERROR_BAD_GENESIS_BLOCK;
        }

        // Check for changed -prune state.  What we are concerned about is a
        // user who has pruned blocks in the past, but is now trying to run
        // unpruned.
        if (fHavePruned && !fPruneMode_) {
            return ChainstateLoadingError::ERROR_PRUNED_NEEDS_REINDEX;
        }

        // At this point blocktree args are consistent with what's on disk.
        // If we're not mid-reindex (based on disk + args), add a genesis
        // block on disk (otherwise we use the one already on disk). This is
        // called again in ThreadImport after the reindex completes.
        if (!fReindex && !chainman.ActiveChainstate().LoadGenesisBlock()) {
            return ChainstateLoadingError::ERROR_LOAD_GENESIS_BLOCK_FAILED;
        }

        // At this point we're either in reindex or we've loaded a useful
        // block tree into BlockIndex()!

        for (CChainState *chainstate : chainman.GetAll()) {
            chainstate->InitCoinsDB(
                /* cache_size_bytes */ nCoinDBCache,
                /* in_memory */ false,
                /* should_wipe */ fReset || fReindexChainState);

            if (coins_error_cb) {
                chainstate->CoinsErrorCatcher().AddReadErrCallback(
                    coins_error_cb);
            }

            // If necessary, upgrade from older database format.
            // This is a no-op if we cleared the coinsviewdb with -reindex
            // or -reindex-chainstate
            if (!chainstate->CoinsDB().Upgrade()) {
                return ChainstateLoadingError::ERROR_CHAINSTATE_UPGRADE_FAILED;
            }

            // ReplayBlocks is a no-op if we cleared the coinsviewdb with
            // -reindex or -reindex-chainstate
            if (!chainstate->ReplayBlocks()) {
                return ChainstateLoadingError::ERROR_REPLAYBLOCKS_FAILED;
            }

            // The on-disk coinsdb is now in a good state, create the cache
            chainstate->InitCoinsCache(nCoinCacheUsage);
            assert(chainstate->CanFlushToDisk());

            if (!is_coinsview_empty(chainstate)) {
                // LoadChainTip initializes the chain based on CoinsTip()'s
                // best block
                if (!chainstate->LoadChainTip()) {
                    return ChainstateLoadingError::ERROR_LOADCHAINTIP_FAILED;
                }
                assert(chainstate->m_chain.Tip() != nullptr);
            }
        }
    }

    return std::nullopt;
}

std::optional<ChainstateLoadVerifyError>
VerifyLoadedChainstate(ChainstateManager &chainman, bool fReset,
                       bool fReindexChainState, const Config &config,
                       unsigned int check_blocks, unsigned int check_level) {
    auto is_coinsview_empty =
        [&](CChainState *chainstate) EXCLUSIVE_LOCKS_REQUIRED(::cs_main) {
            return fReset || fReindexChainState ||
                   chainstate->CoinsTip().GetBestBlock().IsNull();
        };

    {
        LOCK(cs_main);

        for (CChainState *chainstate : chainman.GetAll()) {
            if (!is_coinsview_empty(chainstate)) {
                if (fHavePruned && check_blocks > MIN_BLOCKS_TO_KEEP) {
                    LogPrintf("Prune: pruned datadir may not have more than %d "
                              "blocks; only checking available blocks\n",
                              MIN_BLOCKS_TO_KEEP);
                }

                const CBlockIndex *tip = chainstate->m_chain.Tip();
                RPCNotifyBlockChange(tip);
                if (tip && tip->nTime > GetTime() + MAX_FUTURE_BLOCK_TIME) {
                    return ChainstateLoadVerifyError::ERROR_BLOCK_FROM_FUTURE;
                }

                if (!CVerifyDB().VerifyDB(*chainstate, config,
                                          chainstate->CoinsDB(), check_level,
                                          check_blocks)) {
                    return ChainstateLoadVerifyError::ERROR_CORRUPTED_BLOCK_DB;
                }
            }
        }
    }

    return std::nullopt;
}
