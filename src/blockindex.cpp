// Copyright (c) 2009-2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <blockindex.h>
#include <tinyformat.h>

/**
 * Turn the lowest '1' bit in the binary representation of a number into a '0'.
 */
static inline int InvertLowestOne(int n) {
    return n & (n - 1);
}

/** Compute what height to jump back to with the CBlockIndex::pskip pointer. */
static inline int GetSkipHeight(int height) {
    if (height < 2) {
        return 0;
    }

    // Determine which height to jump back to. Any number strictly lower than
    // height is acceptable, but the following expression seems to perform well
    // in simulations (max 110 steps to go back up to 2**18 blocks).
    return (height & 1) ? InvertLowestOne(InvertLowestOne(height - 1)) + 1
                        : InvertLowestOne(height);
}

std::string CBlockIndex::ToString() const {
    return strprintf(
        "CBlockIndex(pprev=%p, nHeight=%d, merkle=%s, hashBlock=%s)", pprev,
        nHeight, hashMerkleRoot.ToString(), GetBlockHash().ToString());
}

bool CBlockIndex::UpdateChainStats() {
    if (pprev == nullptr) {
        nChainTx = nTx;
        nChainSize = nSize;
        return true;
    }

    if (pprev->nChainTx > 0) {
        nChainTx = pprev->nChainTx + nTx;
        nChainSize = pprev->nChainSize + nSize;
        return true;
    }

    nChainTx = 0;
    nChainSize = 0;
    return false;
}

const CBlockIndex *CBlockIndex::GetAncestor(int height) const {
    if (height > nHeight || height < 0) {
        return nullptr;
    }

    const CBlockIndex *pindexWalk = this;
    int heightWalk = nHeight;
    while (heightWalk > height) {
        int heightSkip = GetSkipHeight(heightWalk);
        int heightSkipPrev = GetSkipHeight(heightWalk - 1);
        if (pindexWalk->pskip != nullptr &&
            (heightSkip == height ||
             (heightSkip > height && !(heightSkipPrev < heightSkip - 2 &&
                                       heightSkipPrev >= height)))) {
            // Only follow pskip if pprev->pskip isn't better than pskip->pprev.
            pindexWalk = pindexWalk->pskip;
            heightWalk = heightSkip;
        } else {
            assert(pindexWalk->pprev);
            pindexWalk = pindexWalk->pprev;
            heightWalk--;
        }
    }
    return pindexWalk;
}

CBlockIndex *CBlockIndex::GetAncestor(int height) {
    return const_cast<CBlockIndex *>(
        const_cast<const CBlockIndex *>(this)->GetAncestor(height));
}

void CBlockIndex::BuildSkip() {
    if (pprev) {
        pskip = pprev->GetAncestor(GetSkipHeight(nHeight));
    }
}
