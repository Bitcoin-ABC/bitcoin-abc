// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "config.h"
#include "consensus/consensus.h"
#include "globals.h"

bool GlobalConfig::SetMaxBlockSize(uint64_t maxBlockSize) {
    if (maxBlockSize < DEFAULT_MAX_BLOCK_SIZE) {
        return false;
    }

    nMaxBlockSize = maxBlockSize;
    return true;
}

uint64_t GlobalConfig::GetMaxBlockSize() const {
    return nMaxBlockSize;
}

static GlobalConfig gConfig;

const Config &GetConfig() {
    return gConfig;
}
