// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <minerfund.h>

#include <chainparams.h>
#include <consensus/activation.h>
#include <currencyunit.h>
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

static const CTxDestination &
GetMinerFundDestination(const bool useAxionDestination) {
    static const std::string ecashMinerFundAxion =
        "ecash:pqnqv9lt7e5vjyp0w88zf2af0l92l8rxdg2jj94l5j";
    static const std::string bitcoinCashMinerFundAxion =
        "bitcoincash:pqnqv9lt7e5vjyp0w88zf2af0l92l8rxdgnlxww9j9";
    static CTxDestination destAxion = BuildDestination(
        gArgs.GetBoolArg("-ecash", DEFAULT_ECASH) ? ecashMinerFundAxion
                                                  : bitcoinCashMinerFundAxion);

    static const std::string ecashMinerFund =
        "ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07";
    static const std::string bitcoinCashMinerFund =
        "bitcoincash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvq5zsvycff";
    static CTxDestination dest = BuildDestination(
        gArgs.GetBoolArg("-ecash", DEFAULT_ECASH) ? ecashMinerFund
                                                  : bitcoinCashMinerFund);

    return useAxionDestination ? destAxion : dest;
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

    return {GetMinerFundDestination(!IsGluonEnabled(params, pindexPrev))};
}
