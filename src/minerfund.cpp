// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <minerfund.h>

#include <chainparams.h>
#include <consensus/activation.h>
#include <key_io.h> // For DecodeDestination
#include <util/system.h>
#include <validation.h> // For VersionBitsBlockState

static CTxDestination BuildDestination(const std::string &dest) {
    const auto mainNetParams = CreateChainParams(CBaseChainParams::MAIN);
    return DecodeDestination(dest, *mainNetParams);
}

static const CTxDestination &GetMinerFundDestination() {
    static CTxDestination dest =
        BuildDestination("pqv2r67sgz3qumufap3h2uuj0zfmnzuv8vqhqfgddk");
    return dest;
}

static const CTxDestination &GetMinerABCDestination() {
    static CTxDestination dest =
        BuildDestination("qzvz0es48sf8wrqy7kn5j5cugka95ztskcanc9laay");
    return dest;
}

static const CTxDestination &GetMinerBCHDDestination() {
    static CTxDestination dest =
        BuildDestination("qrhea03074073ff3zv9whh0nggxc7k03ssh8jv9mkx");
    return dest;
}

static const CTxDestination &GetMinerElectronCashDestination() {
    static CTxDestination dest =
        BuildDestination("pp8d685l8kecnmtyy52ndvq625arz2qwmu42qeeqek");
    return dest;
}

std::vector<CTxDestination>
GetMinerFundWhitelist(const Consensus::Params &params,
                      const CBlockIndex *pindexPrev) {
    if (!gArgs.GetBoolArg("-enableminerfund", params.enableMinerFund)) {
        return {};
    }

    if (!IsPhononEnabled(params, pindexPrev)) {
        return {};
    }

    std::vector<CTxDestination> whitelist{};
    if (VersionBitsBlockState(params, Consensus::DEPLOYEMENT_MINER_FUND,
                              pindexPrev) == ThresholdState::ACTIVE) {
        whitelist.push_back(GetMinerFundDestination());
    }

    if (VersionBitsBlockState(params, Consensus::DEPLOYEMENT_MINER_FUND_ABC,
                              pindexPrev) == ThresholdState::ACTIVE) {
        whitelist.push_back(GetMinerABCDestination());
    }

    if (VersionBitsBlockState(params, Consensus::DEPLOYEMENT_MINER_FUND_BCHD,
                              pindexPrev) == ThresholdState::ACTIVE) {
        whitelist.push_back(GetMinerBCHDDestination());
    }

    if (VersionBitsBlockState(params,
                              Consensus::DEPLOYEMENT_MINER_FUND_ELECTRON_CASH,
                              pindexPrev) == ThresholdState::ACTIVE) {
        whitelist.push_back(GetMinerElectronCashDestination());
    }

    return whitelist;
}
