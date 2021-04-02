// Copyright (c) 2020-2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <blockdb.h>

#include <blockindex.h>
#include <clientversion.h>
#include <pow/pow.h>
#include <primitives/block.h>
#include <streams.h>
#include <util/system.h>

extern RecursiveMutex cs_main;

FlatFileSeq BlockFileSeq() {
    return FlatFileSeq(gArgs.GetBlocksDirPath(), "blk",
                       gArgs.GetBoolArg("-fastprune", false)
                           ? 0x4000 /* 16kb */
                           : BLOCKFILE_CHUNK_SIZE);
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
