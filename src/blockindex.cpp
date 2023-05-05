// Copyright (c) 2009-2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <blockindex.h>
#include <logging.h>
#include <tinyformat.h>
#include <util/check.h>

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

void CBlockIndex::ResetChainStats() {
    nChainTx = 0;
}

void CBlockIndex::MaybeResetChainStats(bool is_snapshot_base_block) {
    // Typically nChainTx will be 0 at this point, but it can be nonzero if this
    // is a pruned block which is being downloaded again, or if this is an
    // assumeutxo snapshot block which has a hardcoded nChainTx value from the
    // snapshot metadata. If the pindex is not the snapshot block and the
    // nChainTx value is not zero, assert that value is actually correct.
    unsigned int correct_value = nTx + (pprev ? pprev->nChainTx : 0);
    if (!Assume(nChainTx == 0 || nChainTx == correct_value ||
                is_snapshot_base_block)) {
        LogPrintf("Internal bug detected: block %d has unexpected nChainTx %i "
                  "that should be %i. Please report this issue here: %s\n",
                  nHeight, nChainTx, correct_value, PACKAGE_BUGREPORT);
        ResetChainStats();
    }
}

bool CBlockIndex::UpdateChainStats() {
    unsigned int correct_value = nTx + (pprev ? pprev->nChainTx : 0);
    // Before setting nChainTx, assert that it is 0 or already set to
    // the correct value. This assert will fail after receiving the
    // assumeutxo snapshot block if assumeutxo snapshot metadata has an
    // incorrect hardcoded AssumeutxoData::nChainTx value.
    if (!Assume(nChainTx == 0 || nChainTx == correct_value)) {
        LogPrintf("Internal bug detected: block %d has unexpected nChainTx %i "
                  "that should be %i. Please report this issue here: %s\n",
                  nHeight, nChainTx, correct_value, PACKAGE_BUGREPORT);
    }

    if (pprev == nullptr || pprev->nChainTx > 0) {
        nChainTx = correct_value;
        return true;
    }

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
