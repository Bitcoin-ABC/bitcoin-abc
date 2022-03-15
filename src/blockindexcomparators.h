// Copyright (c) 2018-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_BLOCKINDEXCOMPARATORS_H
#define BITCOIN_BLOCKINDEXCOMPARATORS_H

#include <blockindex.h>

struct CBlockIndexWorkComparator {
    bool operator()(const CBlockIndex *pa, const CBlockIndex *pb) const {
        // First sort by most total work, ...
        if (pa->nChainWork > pb->nChainWork) {
            return false;
        }
        if (pa->nChainWork < pb->nChainWork) {
            return true;
        }

        // ... then by earliest time received, ...
        if (pa->nSequenceId < pb->nSequenceId) {
            return false;
        }
        if (pa->nSequenceId > pb->nSequenceId) {
            return true;
        }

        // Use pointer address as tie breaker (should only happen with blocks
        // loaded from disk, as those all have id 0).
        if (pa < pb) {
            return false;
        }
        if (pa > pb) {
            return true;
        }

        // Identical blocks.
        return false;
    }
};

struct CBlockIndexHeightOnlyComparator {
    /**
     * Only compares the height of two block indices, doesn't try to tie-break
     */
    bool operator()(const CBlockIndex *pa, const CBlockIndex *pb) const {
        return pa->nHeight < pb->nHeight;
    }
};

#endif // BITCOIN_BLOCKINDEXCOMPARATORS_H
