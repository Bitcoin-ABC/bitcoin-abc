// Copyright 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_BLOCKDB_H
#define BITCOIN_BLOCKDB_H

#include <flatfile.h>

namespace Consensus {
struct Params;
}

class CBlock;
class CBlockIndex;

/** The pre-allocation chunk size for blk?????.dat files (since 0.8) */
static constexpr unsigned int BLOCKFILE_CHUNK_SIZE = 0x1000000; // 16 MiB
/** The pre-allocation chunk size for rev?????.dat files (since 0.8) */
static const unsigned int UNDOFILE_CHUNK_SIZE = 0x100000; // 1 MiB

FlatFileSeq BlockFileSeq();
FlatFileSeq UndoFileSeq();
FILE *OpenUndoFile(const FlatFilePos &pos, bool fReadOnly = false);

/**
 * Translation to a filesystem path.
 */
fs::path GetBlockPosFilename(const FlatFilePos &pos);

/**
 * Open a block file (blk?????.dat).
 */
FILE *OpenBlockFile(const FlatFilePos &pos, bool fReadOnly = false);

/** Functions for disk access for blocks */
bool ReadBlockFromDisk(CBlock &block, const FlatFilePos &pos,
                       const Consensus::Params &params);
bool ReadBlockFromDisk(CBlock &block, const CBlockIndex *pindex,
                       const Consensus::Params &params);

#endif // BITCOIN_BLOCKDB_H
