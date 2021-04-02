// Copyright (c) 2011-2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <node/blockstorage.h>

#include <blockdb.h>
#include <chainparams.h>
#include <config.h>
#include <consensus/validation.h>
#include <fs.h>
#include <shutdown.h>
#include <util/system.h>
#include <validation.h>

struct CImportingNow {
    CImportingNow() {
        assert(fImporting == false);
        fImporting = true;
    }

    ~CImportingNow() {
        assert(fImporting == true);
        fImporting = false;
    }
};

void ThreadImport(const Config &config, ChainstateManager &chainman,
                  std::vector<fs::path> vImportFiles, const ArgsManager &args) {
    ScheduleBatchPriority();

    {
        const CChainParams &chainParams = config.GetChainParams();

        CImportingNow imp;

        // -reindex
        if (fReindex) {
            int nFile = 0;
            while (true) {
                FlatFilePos pos(nFile, 0);
                if (!fs::exists(GetBlockPosFilename(pos))) {
                    // No block files left to reindex
                    break;
                }
                FILE *file = OpenBlockFile(pos, true);
                if (!file) {
                    // This error is logged in OpenBlockFile
                    break;
                }
                LogPrintf("Reindexing block file blk%05u.dat...\n",
                          (unsigned int)nFile);
                ::ChainstateActive().LoadExternalBlockFile(config, file, &pos);
                if (ShutdownRequested()) {
                    LogPrintf("Shutdown requested. Exit %s\n", __func__);
                    return;
                }
                nFile++;
            }
            pblocktree->WriteReindexing(false);
            fReindex = false;
            LogPrintf("Reindexing finished\n");
            // To avoid ending up in a situation without genesis block, re-try
            // initializing (no-op if reindexing worked):
            ::ChainstateActive().LoadGenesisBlock(chainParams);
        }

        // -loadblock=
        for (const fs::path &path : vImportFiles) {
            FILE *file = fsbridge::fopen(path, "rb");
            if (file) {
                LogPrintf("Importing blocks file %s...\n",
                          fs::PathToString(path));
                ::ChainstateActive().LoadExternalBlockFile(config, file);
                if (ShutdownRequested()) {
                    LogPrintf("Shutdown requested. Exit %s\n", __func__);
                    return;
                }
            } else {
                LogPrintf("Warning: Could not open blocks file %s\n",
                          fs::PathToString(path));
            }
        }

        // Reconsider blocks we know are valid. They may have been marked
        // invalid by, for instance, running an outdated version of the node
        // software.
        const MapCheckpoints &checkpoints =
            chainParams.Checkpoints().mapCheckpoints;
        for (const MapCheckpoints::value_type &i : checkpoints) {
            const BlockHash &hash = i.second;

            LOCK(cs_main);
            CBlockIndex *pblockindex =
                g_chainman.m_blockman.LookupBlockIndex(hash);
            if (pblockindex && !pblockindex->nStatus.isValid()) {
                LogPrintf("Reconsidering checkpointed block %s ...\n",
                          hash.GetHex());
                ::ChainstateActive().ResetBlockFailureFlags(pblockindex);
            }
        }

        // scan for better chains in the block chain database, that are not yet
        // connected in the active best chain

        // We can't hold cs_main during ActivateBestChain even though we're
        // accessing the chainman unique_ptrs since ABC requires us not to be
        // holding cs_main, so retrieve the relevant pointers before the ABC
        // call.
        for (CChainState *chainstate :
             WITH_LOCK(::cs_main, return chainman.GetAll())) {
            BlockValidationState state;
            if (!chainstate->ActivateBestChain(config, state, nullptr)) {
                LogPrintf("Failed to connect best block (%s)\n",
                          state.ToString());
                StartShutdown();
                return;
            }
        }

        if (args.GetBoolArg("-stopafterblockimport",
                            DEFAULT_STOPAFTERBLOCKIMPORT)) {
            LogPrintf("Stopping after block import\n");
            StartShutdown();
            return;
        }
    } // End scope of CImportingNow
    chainman.ActiveChainstate().LoadMempool(config, args);
}
