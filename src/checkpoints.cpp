// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "checkpoints.h"

#include "chain.h"
#include "chainparams.h"
#include "reverse_iterator.h"

#include <cstdint>

namespace Checkpoints {

bool CheckBlock(const CCheckpointData &data, int nHeight, const uint256 &hash) {
    const MapCheckpoints &checkpoints = data.mapCheckpoints;

    MapCheckpoints::const_iterator i = checkpoints.find(nHeight);
    if (i == checkpoints.end()) {
        return true;
    }
    return hash == i->second;
}

CBlockIndex *GetLastCheckpoint(const CCheckpointData &data) {
    const MapCheckpoints &checkpoints = data.mapCheckpoints;

    for (const MapCheckpoints::value_type &i : reverse_iterate(checkpoints)) {
        const uint256 &hash = i.second;
        CBlockIndex *pindex = LookupBlockIndex(hash);
        if (pindex) {
            return pindex;
        }
    }

    return nullptr;
}

} // namespace Checkpoints
