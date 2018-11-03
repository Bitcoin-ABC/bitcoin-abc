// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "config.h"
#include "chainparams.h"
#include "consensus/consensus.h"
#include "globals.h"

GlobalConfig::GlobalConfig() : useCashAddr(false) {}

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

bool GlobalConfig::SetBlockPriorityPercentage(int64_t blockPriorityPercentage) {
    // blockPriorityPercentage has to belong to [0..100]
    if ((blockPriorityPercentage < 0) || (blockPriorityPercentage > 100)) {
        return false;
    }
    nBlockPriorityPercentage = blockPriorityPercentage;
    return true;
}

uint8_t GlobalConfig::GetBlockPriorityPercentage() const {
    return nBlockPriorityPercentage;
}

const CChainParams &GlobalConfig::GetChainParams() const {
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

DummyConfig::DummyConfig()
    : chainParams(CreateChainParams(CBaseChainParams::REGTEST)) {}

DummyConfig::DummyConfig(std::string net)
    : chainParams(CreateChainParams(net)) {}

void DummyConfig::SetChainParams(std::string net) {
    chainParams = CreateChainParams(net);
}

void GlobalConfig::SetExcessUTXOCharge(Amount fee) {
    excessUTXOCharge = fee;
}

Amount GlobalConfig::GetExcessUTXOCharge() const {
    return excessUTXOCharge;
}

void GlobalConfig::SetMinFeePerKB(CFeeRate fee) {
    feePerKB = fee;
}

CFeeRate GlobalConfig::GetMinFeePerKB() const {
    return feePerKB;
}

void GlobalConfig::SetRPCUserAndPassword(std::string userAndPassword) {
    rpcUserAndPassword = userAndPassword;
}

std::string GlobalConfig::GetRPCUserAndPassword() const {
    return rpcUserAndPassword;
}

void GlobalConfig::SetRPCCORSDomain(std::string corsDomain) {
    rpcCORSDomain = corsDomain;
}

std::string GlobalConfig::GetRPCCORSDomain() const {
    return rpcCORSDomain;
}
