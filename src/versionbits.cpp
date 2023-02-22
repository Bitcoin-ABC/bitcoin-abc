// Copyright (c) 2016-2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <consensus/params.h>
#include <versionbits.h>

int32_t ComputeBlockVersion(const CBlockIndex *pindexPrev,
                            const Consensus::Params &params) {
    // Clear the last 4 bits (miner fund activation).
    return VERSIONBITS_TOP_BITS & ~uint32_t(0x0f);
}
