// Copyright (c) 2009-2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_BLOCKINDEX_H
#define BITCOIN_BLOCKINDEX_H

#include <arith_uint256.h>
#include <blockstatus.h>
#include <flatfile.h>
#include <primitives/block.h>
#include <tinyformat.h>
#include <uint256.h>

struct BlockHash;

/**
 * The block chain is a tree shaped structure starting with the genesis block at
 * the root, with each block potentially having multiple candidates to be the
 * next block. A blockindex may have multiple pprev pointing to it, but at most
 * one of them can be part of the currently active branch.
 */
class CBlockIndex {
public:
    //! pointer to the hash of the block, if any. Memory is owned by this
    //! CBlockIndex
    const BlockHash *phashBlock{nullptr};

    //! pointer to the index of the predecessor of this block
    CBlockIndex *pprev{nullptr};

    //! pointer to the index of some further predecessor of this block
    CBlockIndex *pskip{nullptr};

    //! height of the entry in the chain. The genesis block has height 0
    int nHeight{0};

    //! Which # file this block is stored in (blk?????.dat)
    int nFile{0};

    //! Byte offset within blk?????.dat where this block's data is stored
    unsigned int nDataPos{0};

    //! Byte offset within rev?????.dat where this block's undo data is stored
    unsigned int nUndoPos{0};

    //! (memory only) Total amount of work (expected number of hashes) in the
    //! chain up to and including this block
    arith_uint256 nChainWork{};

    //! Number of transactions in this block.
    //! Note: in a potential headers-first mode, this number cannot be relied
    //! upon
    unsigned int nTx{0};

    //! Size of this block.
    //! Note: in a potential headers-first mode, this number cannot be relied
    //! upon
    unsigned int nSize{0};

private:
    //! (memory only) Number of transactions in the chain up to and including
    //! this block.
    //! This value will be non-zero only if and only if transactions for this
    //! block and all its parents are available. Change to 64-bit type when
    //! necessary; won't happen before 2030
    unsigned int nChainTx{0};

    //! (memory only) Size of all blocks in the chain up to and including this
    //! block. This value will be non-zero only if and only if transactions for
    //! this block and all its parents are available.
    uint64_t nChainSize{0};

public:
    //! Verification status of this block. See enum BlockStatus
    BlockStatus nStatus{};

    //! block header
    int32_t nVersion{0};
    uint256 hashMerkleRoot{};
    uint32_t nTime{0};
    uint32_t nBits{0};
    uint32_t nNonce{0};

    //! (memory only) Sequential id assigned to distinguish order in which
    //! blocks are received.
    int32_t nSequenceId{0};

    //! (memory only) block header metadata
    uint64_t nTimeReceived{0};

    //! (memory only) Maximum nTime in the chain up to and including this block.
    unsigned int nTimeMax{0};

    explicit CBlockIndex() = default;

    explicit CBlockIndex(const CBlockHeader &block)
        : nVersion{block.nVersion}, hashMerkleRoot{block.hashMerkleRoot},
          nTime{block.nTime}, nBits{block.nBits}, nNonce{block.nNonce},
          nTimeReceived{0} {}

    FlatFilePos GetBlockPos() const {
        FlatFilePos ret;
        if (nStatus.hasData()) {
            ret.nFile = nFile;
            ret.nPos = nDataPos;
        }
        return ret;
    }

    FlatFilePos GetUndoPos() const {
        FlatFilePos ret;
        if (nStatus.hasUndo()) {
            ret.nFile = nFile;
            ret.nPos = nUndoPos;
        }
        return ret;
    }

    CBlockHeader GetBlockHeader() const {
        CBlockHeader block;
        block.nVersion = nVersion;
        if (pprev) {
            block.hashPrevBlock = pprev->GetBlockHash();
        }
        block.hashMerkleRoot = hashMerkleRoot;
        block.nTime = nTime;
        block.nBits = nBits;
        block.nNonce = nNonce;
        return block;
    }

    BlockHash GetBlockHash() const { return *phashBlock; }

    /**
     * Get the number of transaction in the chain so far.
     */
    int64_t GetChainTxCount() const { return nChainTx; }

    /**
     * Get the size of all the blocks in the chain so far.
     */
    uint64_t GetChainSize() const { return nChainSize; }

    /**
     * Update chain tx stats.
     */
    bool UpdateChainStats();

    /**
     * Check whether this block's and all previous blocks' transactions have
     * been downloaded (and stored to disk) at some point.
     *
     * Does not imply the transactions are consensus-valid (ConnectTip might
     * fail) Does not imply the transactions are still stored on disk.
     * (IsBlockPruned might return true)
     */
    bool HaveTxsDownloaded() const { return GetChainTxCount() != 0; }

    int64_t GetBlockTime() const { return int64_t(nTime); }

    int64_t GetBlockTimeMax() const { return int64_t(nTimeMax); }

    int64_t GetHeaderReceivedTime() const { return nTimeReceived; }

    int64_t GetReceivedTimeDiff() const {
        return GetHeaderReceivedTime() - GetBlockTime();
    }

    static constexpr int nMedianTimeSpan = 11;

    int64_t GetMedianTimePast() const {
        int64_t pmedian[nMedianTimeSpan];
        int64_t *pbegin = &pmedian[nMedianTimeSpan];
        int64_t *pend = &pmedian[nMedianTimeSpan];

        const CBlockIndex *pindex = this;
        for (int i = 0; i < nMedianTimeSpan && pindex;
             i++, pindex = pindex->pprev) {
            *(--pbegin) = pindex->GetBlockTime();
        }

        std::sort(pbegin, pend);
        return pbegin[(pend - pbegin) / 2];
    }

    std::string ToString() const {
        return strprintf(
            "CBlockIndex(pprev=%p, nHeight=%d, merkle=%s, hashBlock=%s)", pprev,
            nHeight, hashMerkleRoot.ToString(), GetBlockHash().ToString());
    }

    //! Check whether this block index entry is valid up to the passed validity
    //! level.
    bool IsValid(enum BlockValidity nUpTo = BlockValidity::TRANSACTIONS) const {
        return nStatus.isValid(nUpTo);
    }

    //! Raise the validity level of this block index entry.
    //! Returns true if the validity was changed.
    bool RaiseValidity(enum BlockValidity nUpTo) {
        // Only validity flags allowed.
        if (nStatus.isInvalid()) {
            return false;
        }

        if (nStatus.getValidity() >= nUpTo) {
            return false;
        }

        nStatus = nStatus.withValidity(nUpTo);
        return true;
    }

    //! Build the skiplist pointer for this entry.
    void BuildSkip();

    //! Efficiently find an ancestor of this block.
    CBlockIndex *GetAncestor(int height);
    const CBlockIndex *GetAncestor(int height) const;
};

#endif // BITCOIN_BLOCKINDEX_H
