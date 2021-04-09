#include <blockdb.h>

#include <blockindex.h>
#include <clientversion.h>
#include <pow/pow.h>
#include <primitives/block.h>
#include <streams.h>
#include <util/system.h>

extern RecursiveMutex cs_main;

FlatFileSeq BlockFileSeq() {
    return FlatFileSeq(gArgs.GetBlocksDirPath(), "blk", BLOCKFILE_CHUNK_SIZE);
}

FlatFileSeq UndoFileSeq() {
    return FlatFileSeq(gArgs.GetBlocksDirPath(), "rev", UNDOFILE_CHUNK_SIZE);
}

FILE *OpenBlockFile(const FlatFilePos &pos, bool fReadOnly) {
    return BlockFileSeq().Open(pos, fReadOnly);
}

/** Open an undo file (rev?????.dat) */
FILE *OpenUndoFile(const FlatFilePos &pos, bool fReadOnly) {
    return UndoFileSeq().Open(pos, fReadOnly);
}

fs::path GetBlockPosFilename(const FlatFilePos &pos) {
    return BlockFileSeq().FileName(pos);
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
