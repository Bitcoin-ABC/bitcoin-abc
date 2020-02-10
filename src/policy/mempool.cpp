// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <policy/mempool.h>

#include <consensus/activation.h>

uint32_t GetDefaultAncestorLimit(const Consensus::Params &params,
                                 const CBlockIndex *pindexPrev) {
    return IsPhononEnabled(params, pindexPrev) ? DEFAULT_ANCESTOR_LIMIT_LONGER
                                               : DEFAULT_ANCESTOR_LIMIT;
}

uint32_t GetDefaultDescendantLimit(const Consensus::Params &params,
                                   const CBlockIndex *pindexPrev) {
    return IsPhononEnabled(params, pindexPrev) ? DEFAULT_DESCENDANT_LIMIT_LONGER
                                               : DEFAULT_DESCENDANT_LIMIT;
}
