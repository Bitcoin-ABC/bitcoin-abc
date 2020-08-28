// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <minerfund.h>

#include <chainparams.h>
#include <consensus/activation.h>
#include <key_io.h> // For DecodeDestination
#include <util/system.h>
#include <validation.h> // For VersionBitsBlockState

/**
 * Percentage of the block reward to be sent to the fund.
 */
static constexpr int MINER_FUND_RATIO = 8;

Amount GetMinerFundAmount(const Amount &coinbaseValue) {
    return MINER_FUND_RATIO * coinbaseValue / 100;
}

static CTxDestination BuildDestination(const std::string &dest) {
    const auto mainNetParams = CreateChainParams(CBaseChainParams::MAIN);
    return DecodeDestination(dest, *mainNetParams);
}

static const CTxDestination &GetMinerFundDestination() {
    static CTxDestination dest =
        BuildDestination("pqnqv9lt7e5vjyp0w88zf2af0l92l8rxdgnlxww9j9");
    return dest;
}

std::vector<CTxDestination>
GetMinerFundWhitelist(const Consensus::Params &params,
                      const CBlockIndex *pindexPrev) {
    if (!gArgs.GetBoolArg("-enableminerfund", params.enableMinerFund)) {
        return {};
    }

    if (!IsAxionEnabled(params, pindexPrev)) {
        return {};
    }

    return {GetMinerFundDestination()};
}
