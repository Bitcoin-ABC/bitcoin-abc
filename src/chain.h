// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CHAIN_H
#define BITCOIN_CHAIN_H

#include <arith_uint256.h>
#include <blockindex.h>
#include <blockstatus.h>
#include <blockvalidity.h>
#include <consensus/params.h>
#include <crypto/common.h> // for ReadLE64
#include <flatfile.h>
#include <primitives/block.h>
#include <sync.h>
#include <tinyformat.h>
#include <uint256.h>

#include <unordered_map>
#include <vector>

/**
 * Maximum amount of time that a block timestamp is allowed to exceed the
 * current network-adjusted time before the block will be accepted.
 */
static constexpr int64_t MAX_FUTURE_BLOCK_TIME = 2 * 60 * 60;

/**
 * Timestamp window used as a grace period by code that compares external
 * timestamps (such as timestamps passed to RPCs, or wallet key creation times)
 * to block timestamps. This should be set at least as high as
 * MAX_FUTURE_BLOCK_TIME.
 */
static constexpr int64_t TIMESTAMP_WINDOW = MAX_FUTURE_BLOCK_TIME;

/**
 * Maximum gap between node time and block time used
 * for the "Catching up..." mode in GUI.
 *
 * Ref: https://github.com/bitcoin/bitcoin/pull/1026
 */
static constexpr int64_t MAX_BLOCK_TIME_GAP = 90 * 60;

/**
 * Maintain a map of CBlockIndex for all known headers.
 */
struct BlockHasher {
    // this used to call `GetCheapHash()` in uint256, which was later moved; the
    // cheap hash function simply calls ReadLE64() however, so the end result is
    // identical
    size_t operator()(const BlockHash &hash) const {
        return ReadLE64(hash.begin());
    }
};

extern RecursiveMutex cs_main;

arith_uint256 GetBlockProof(const CBlockIndex &block);

/**
 * Return the time it would take to redo the work difference between from and
 * to, assuming the current hashrate corresponds to the difficulty at tip, in
 * seconds.
 */
int64_t GetBlockProofEquivalentTime(const CBlockIndex &to,
                                    const CBlockIndex &from,
                                    const CBlockIndex &tip,
                                    const Consensus::Params &);
/**
 * Find the forking point between two chain tips.
 */
const CBlockIndex *LastCommonAncestor(const CBlockIndex *pa,
                                      const CBlockIndex *pb);

/**
 * Check if two block index are on the same fork.
 */
bool AreOnTheSameFork(const CBlockIndex *pa, const CBlockIndex *pb);

/** Used to marshal pointers into hashes for db storage. */
class CDiskBlockIndex : public CBlockIndex {
public:
    BlockHash hashPrev;

    CDiskBlockIndex() { hashPrev = BlockHash(); }

    explicit CDiskBlockIndex(const CBlockIndex *pindex) : CBlockIndex(*pindex) {
        hashPrev = (pprev ? pprev->GetBlockHash() : BlockHash());
    }

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        int _nVersion = s.GetVersion();
        if (!(s.GetType() & SER_GETHASH)) {
            READWRITE(VARINT(_nVersion, VarIntMode::NONNEGATIVE_SIGNED));
        }

        READWRITE(VARINT(nHeight, VarIntMode::NONNEGATIVE_SIGNED));
        READWRITE(nStatus);
        READWRITE(VARINT(nTx));
        if (nStatus.hasData() || nStatus.hasUndo()) {
            READWRITE(VARINT(nFile, VarIntMode::NONNEGATIVE_SIGNED));
        }
        if (nStatus.hasData()) {
            READWRITE(VARINT(nDataPos));
        }
        if (nStatus.hasUndo()) {
            READWRITE(VARINT(nUndoPos));
        }

        // block header
        READWRITE(this->nVersion);
        READWRITE(hashPrev);
        READWRITE(hashMerkleRoot);
        READWRITE(nTime);
        READWRITE(nBits);
        READWRITE(nNonce);
    }

    BlockHash GetBlockHash() const {
        CBlockHeader block;
        block.nVersion = nVersion;
        block.hashPrevBlock = hashPrev;
        block.hashMerkleRoot = hashMerkleRoot;
        block.nTime = nTime;
        block.nBits = nBits;
        block.nNonce = nNonce;
        return block.GetHash();
    }

    std::string ToString() const {
        std::string str = "CDiskBlockIndex(";
        str += CBlockIndex::ToString();
        str += strprintf("\n                hashBlock=%s, hashPrev=%s)",
                         GetBlockHash().ToString(), hashPrev.ToString());
        return str;
    }
};

/**
 * An in-memory indexed chain of blocks.
 */
class CChain {
private:
    std::vector<CBlockIndex *> vChain;

public:
    /**
     * Returns the index entry for the genesis block of this chain, or nullptr
     * if none.
     */
    CBlockIndex *Genesis() const {
        return vChain.size() > 0 ? vChain[0] : nullptr;
    }

    /**
     * Returns the index entry for the tip of this chain, or nullptr if none.
     */
    CBlockIndex *Tip() const {
        return vChain.size() > 0 ? vChain[vChain.size() - 1] : nullptr;
    }

    /**
     * Returns the index entry at a particular height in this chain, or nullptr
     * if no such height exists.
     */
    CBlockIndex *operator[](int nHeight) const {
        if (nHeight < 0 || nHeight >= (int)vChain.size()) {
            return nullptr;
        }
        return vChain[nHeight];
    }

    /** Compare two chains efficiently. */
    friend bool operator==(const CChain &a, const CChain &b) {
        return a.vChain.size() == b.vChain.size() &&
               a.vChain[a.vChain.size() - 1] == b.vChain[b.vChain.size() - 1];
    }

    /** Efficiently check whether a block is present in this chain. */
    bool Contains(const CBlockIndex *pindex) const {
        return (*this)[pindex->nHeight] == pindex;
    }

    /**
     * Find the successor of a block in this chain, or nullptr if the given
     * index is not found or is the tip.
     */
    CBlockIndex *Next(const CBlockIndex *pindex) const {
        if (!Contains(pindex)) {
            return nullptr;
        }

        return (*this)[pindex->nHeight + 1];
    }

    /**
     * Return the maximal height in the chain. Is equal to chain.Tip() ?
     * chain.Tip()->nHeight : -1.
     */
    int Height() const { return vChain.size() - 1; }

    /** Set/initialize a chain with a given tip. */
    void SetTip(CBlockIndex *pindex);

    /**
     * Return a CBlockLocator that refers to a block in this chain (by default
     * the tip).
     */
    CBlockLocator GetLocator(const CBlockIndex *pindex = nullptr) const;

    /**
     * Find the last common block between this chain and a block index entry.
     */
    const CBlockIndex *FindFork(const CBlockIndex *pindex) const;

    /**
     * Find the earliest block with timestamp equal or greater than the given
     * time and height equal or greater than the given height.
     */
    CBlockIndex *FindEarliestAtLeast(int64_t nTime, int height) const;
};

#endif // BITCOIN_CHAIN_H
