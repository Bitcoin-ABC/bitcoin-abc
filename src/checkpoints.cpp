// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "checkpoints.h"

#include "chain.h"
#include "chainparams.h"
#include "uint256.h"
#include "validation.h"

#include <cstdint>

#include <boost/range/adaptor/reversed.hpp>

namespace Checkpoints {

CBlockIndex *GetLastCheckpoint(const CCheckpointData &data) {
    const MapCheckpoints &checkpoints = data.mapCheckpoints;

    for (const MapCheckpoints::value_type &i :
         boost::adaptors::reverse(checkpoints)) {
        const uint256 &hash = i.second;
        BlockMap::const_iterator t = mapBlockIndex.find(hash);
        if (t != mapBlockIndex.end()) return t->second;
    }
    return nullptr;
}

} // namespace Checkpoints
