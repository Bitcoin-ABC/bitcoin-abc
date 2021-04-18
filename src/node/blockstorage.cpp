// Copyright (c) 2011-2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <node/blockstorage.h>

#include <blockdb.h>
#include <chain.h>
#include <chainparams.h>
#include <config.h>
#include <consensus/validation.h>
#include <flatfile.h>
#include <fs.h>
#include <pow/pow.h>
#include <shutdown.h>
#include <streams.h>
#include <util/system.h>
#include <validation.h>

std::atomic_bool fImporting(false);
std::atomic_bool fReindex(false);
bool fHavePruned = false;
bool fPruneMode = false;
uint64_t nPruneTarget = 0;

bool IsBlockPruned(const CBlockIndex *pblockindex) {
    return (fHavePruned && !pblockindex->nStatus.hasData() &&
            pblockindex->nTx > 0);
}

// If we're using -prune with -reindex, then delete block files that will be
// ignored by the reindex.  Since reindexing works by starting at block file 0
// and looping until a blockfile is missing, do the same here to delete any
// later block files after a gap. Also delete all rev files since they'll be
// rewritten by the reindex anyway. This ensures that vinfoBlockFile is in sync
// with what's actually on disk by the time we start downloading, so that
// pruning works correctly.
void CleanupBlockRevFiles() {
    std::map<std::string, fs::path> mapBlockFiles;

    // Glob all blk?????.dat and rev?????.dat files from the blocks directory.
    // Remove the rev files immediately and insert the blk file paths into an
    // ordered map keyed by block file index.
    LogPrintf("Removing unusable blk?????.dat and rev?????.dat files for "
              "-reindex with -prune\n");
    for (const auto &file : fs::directory_iterator{gArgs.GetBlocksDirPath()}) {
        const std::string path = fs::PathToString(file.path().filename());
        if (fs::is_regular_file(file) && path.length() == 12 &&
            path.substr(8, 4) == ".dat") {
            if (path.substr(0, 3) == "blk") {
                mapBlockFiles[path.substr(3, 5)] = file.path();
            } else if (path.substr(0, 3) == "rev") {
                remove(file.path());
            }
        }
    }

    // Remove all block files that aren't part of a contiguous set starting at
    // zero by walking the ordered map (keys are block file indices) by keeping
    // a separate counter. Once we hit a gap (or if 0 doesn't exist) start
    // removing block files.
    int contiguousCounter = 0;
    for (const auto &item : mapBlockFiles) {
        if (atoi(item.first) == contiguousCounter) {
            contiguousCounter++;
            continue;
        }
        remove(item.second);
    }
}

// From validation. TODO move here
bool FindBlockPos(FlatFilePos &pos, unsigned int nAddSize, unsigned int nHeight,
                  CChain &active_chain, uint64_t nTime, bool fKnown = false);

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

/**
 * Store block on disk. If dbp is non-nullptr, the file is known to already
 * reside on disk.
 */
FlatFilePos SaveBlockToDisk(const CBlock &block, int nHeight,
                            CChain &active_chain,
                            const CChainParams &chainparams,
                            const FlatFilePos *dbp) {
    unsigned int nBlockSize = ::GetSerializeSize(block, CLIENT_VERSION);
    FlatFilePos blockPos;
    if (dbp != nullptr) {
        blockPos = *dbp;
    }
    if (!FindBlockPos(blockPos, nBlockSize + 8, nHeight, active_chain,
                      block.GetBlockTime(), dbp != nullptr)) {
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
                chainman.ActiveChainstate().LoadExternalBlockFile(config, file,
                                                                  &pos);
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
            chainman.ActiveChainstate().LoadGenesisBlock(chainParams);
        }

        // -loadblock=
        for (const fs::path &path : vImportFiles) {
            FILE *file = fsbridge::fopen(path, "rb");
            if (file) {
                LogPrintf("Importing blocks file %s...\n",
                          fs::PathToString(path));
                chainman.ActiveChainstate().LoadExternalBlockFile(config, file);
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
                chainman.m_blockman.LookupBlockIndex(hash);
            if (pblockindex && !pblockindex->nStatus.isValid()) {
                LogPrintf("Reconsidering checkpointed block %s ...\n",
                          hash.GetHex());
                chainman.ActiveChainstate().ResetBlockFailureFlags(pblockindex);
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
