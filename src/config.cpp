// Copyright (c) 2017-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <config.h>

#include <consensus/consensus.h> // DEFAULT_MAX_BLOCK_SIZE

GlobalConfig::GlobalConfig()
    : useCashAddr(false), nMaxBlockSize(DEFAULT_MAX_BLOCK_SIZE) {}

bool GlobalConfig::SetMaxBlockSize(uint64_t maxBlockSize) {
    // Do not allow maxBlockSize to be set below historic 1MB limit
    // It cannot be equal either because of the "must be big" UAHF rule.
    if (maxBlockSize <= LEGACY_MAX_BLOCK_SIZE) {
        return false;
    }

    nMaxBlockSize = maxBlockSize;
    return true;
}

uint64_t GlobalConfig::GetMaxBlockSize() const {
    return nMaxBlockSize;
}

void GlobalConfig::SetChainParams(const CChainParams chainParamsIn) {
    chainParams.emplace(chainParamsIn);
}

const CChainParams &GlobalConfig::GetChainParams() const {
    if (chainParams) {
        return *chainParams;
    }
    return Params();
}

static GlobalConfig gConfig;

const Config &GetConfig() {
    return gConfig;
}

void GlobalConfig::SetCashAddrEncoding(bool c) {
    useCashAddr = c;
}
bool GlobalConfig::UseCashAddrEncoding() const {
    return useCashAddr;
}
