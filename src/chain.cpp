// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chain.h>

/**
 * CChain implementation
 */
void CChain::SetTip(CBlockIndex *pindex) {
    if (pindex == nullptr) {
        vChain.clear();
        return;
    }

    vChain.resize(pindex->nHeight + 1);
    while (pindex && vChain[pindex->nHeight] != pindex) {
        vChain[pindex->nHeight] = pindex;
        pindex = pindex->pprev;
    }
}

CBlockLocator CChain::GetLocator(const CBlockIndex *pindex) const {
    int nStep = 1;
    std::vector<BlockHash> vHave;
    vHave.reserve(32);

    if (!pindex) {
        pindex = Tip();
    }
    while (pindex) {
        vHave.push_back(pindex->GetBlockHash());
        // Stop when we have added the genesis block.
        if (pindex->nHeight == 0) {
            break;
        }
        // Exponentially larger steps back, plus the genesis block.
        int nHeight = std::max(pindex->nHeight - nStep, 0);
        if (Contains(pindex)) {
            // Use O(1) CChain index if possible.
            pindex = (*this)[nHeight];
        } else {
            // Otherwise, use O(log n) skiplist.
            pindex = pindex->GetAncestor(nHeight);
        }
        if (vHave.size() > 10) {
            nStep *= 2;
        }
    }

    return CBlockLocator(vHave);
}

const CBlockIndex *CChain::FindFork(const CBlockIndex *pindex) const {
    if (pindex == nullptr) {
        return nullptr;
    }
    if (pindex->nHeight > Height()) {
        pindex = pindex->GetAncestor(Height());
    }
    while (pindex && !Contains(pindex)) {
        pindex = pindex->pprev;
    }
    return pindex;
}

CBlockIndex *CChain::FindEarliestAtLeast(int64_t nTime, int height) const {
    std::pair<int64_t, int> blockparams = std::make_pair(nTime, height);
    std::vector<CBlockIndex *>::const_iterator lower = std::lower_bound(
        vChain.begin(), vChain.end(), blockparams,
        [](CBlockIndex *pBlock,
           const std::pair<int64_t, int> &_blockparams) -> bool {
            return pBlock->GetBlockTimeMax() < _blockparams.first ||
                   pBlock->nHeight < _blockparams.second;
        });
    return (lower == vChain.end() ? nullptr : *lower);
}

arith_uint256 GetBlockProof(const CBlockIndex &block) {
    arith_uint256 bnTarget;
    bool fNegative;
    bool fOverflow;
    bnTarget.SetCompact(block.nBits, &fNegative, &fOverflow);
    if (fNegative || fOverflow || bnTarget == 0) {
        return 0;
    }
    // We need to compute 2**256 / (bnTarget+1), but we can't represent 2**256
    // as it's too large for an arith_uint256. However, as 2**256 is at least as
    // large as bnTarget+1, it is equal to ((2**256 - bnTarget - 1) /
    // (bnTarget+1)) + 1, or ~bnTarget / (bnTarget+1) + 1.
    return (~bnTarget / (bnTarget + 1)) + 1;
}

int64_t GetBlockProofEquivalentTime(const CBlockIndex &to,
                                    const CBlockIndex &from,
                                    const CBlockIndex &tip,
                                    const Consensus::Params &params) {
    arith_uint256 r;
    int sign = 1;
    if (to.nChainWork > from.nChainWork) {
        r = to.nChainWork - from.nChainWork;
    } else {
        r = from.nChainWork - to.nChainWork;
        sign = -1;
    }
    r = r * arith_uint256(params.nPowTargetSpacing) / GetBlockProof(tip);
    if (r.bits() > 63) {
        return sign * std::numeric_limits<int64_t>::max();
    }
    return sign * r.GetLow64();
}

/**
 * Find the last common ancestor two blocks have.
 * Both pa and pb must be non null.
 */
const CBlockIndex *LastCommonAncestor(const CBlockIndex *pa,
                                      const CBlockIndex *pb) {
    if (pa->nHeight > pb->nHeight) {
        pa = pa->GetAncestor(pb->nHeight);
    } else if (pb->nHeight > pa->nHeight) {
        pb = pb->GetAncestor(pa->nHeight);
    }

    while (pa != pb && pa && pb) {
        if (pa->pskip && pb->pskip && pa->pskip != pb->pskip) {
            pa = pa->pskip;
            pb = pb->pskip;
            assert(pa->nHeight == pb->nHeight);
        } else {
            pa = pa->pprev;
            pb = pb->pprev;
        }
    }

    // Eventually all chain branches meet at the genesis block.
    assert(pa == pb);
    return pa;
}

bool AreOnTheSameFork(const CBlockIndex *pa, const CBlockIndex *pb) {
    if (pa->nHeight > pb->nHeight) {
        pa = pa->GetAncestor(pb->nHeight);
    } else if (pb->nHeight > pa->nHeight) {
        pb = pb->GetAncestor(pa->nHeight);
    }
    return pa == pb;
}
