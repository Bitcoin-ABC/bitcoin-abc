// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <minerfund.h>

#include <blockindex.h>
#include <chainparams.h>
#include <common/args.h>
#include <consensus/activation.h>
#include <consensus/amount.h>
#include <currencyunit.h>
#include <key_io.h> // For DecodeDestination
#include <primitives/transaction.h>

/**
 * Percentage of the block reward to be sent to the fund.
 */
static constexpr int LEGACY_MINER_FUND_RATIO = 8;
static constexpr int MINER_FUND_RATIO = 32;

Amount GetMinerFundAmount(const Consensus::Params &params,
                          const Amount &coinbaseValue,
                          const CBlockIndex *pprev) {
    const int minerFundRatio = IsCowperthwaiteEnabled(params, pprev)
                                   ? MINER_FUND_RATIO
                                   : LEGACY_MINER_FUND_RATIO;
    return minerFundRatio * coinbaseValue / 100;
}

static CTxDestination BuildDestination(const std::string &dest) {
    const ArgsManager unused_argsman{};
    const auto mainNetParams =
        CreateChainParams(unused_argsman, ChainType::MAIN);
    return DecodeDestination(dest, *mainNetParams);
}

static const CTxDestination &GetMinerFundDestination() {
    static const std::string ecashMinerFund =
        "ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07";
    static const std::string bitcoinCashMinerFund =
        "bitcoincash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvq5zsvycff";
    static CTxDestination dest = BuildDestination(
        gArgs.GetBoolArg("-ecash", DEFAULT_ECASH) ? ecashMinerFund
                                                  : bitcoinCashMinerFund);

    return dest;
}

std::unordered_set<CTxDestination, TxDestinationHasher>
GetMinerFundWhitelist(const Consensus::Params &params) {
    if (!gArgs.GetBoolArg("-enableminerfund", params.enableMinerFund)) {
        return {};
    }

    return {GetMinerFundDestination()};
}

bool CheckMinerFund(const Consensus::Params &params,
                    const std::vector<CTxOut> &coinbaseTxOut,
                    const Amount &blockReward, const CBlockIndex *pprev) {
    const auto whitelist = GetMinerFundWhitelist(params);
    if (whitelist.empty()) {
        return true;
    }

    const Amount required = GetMinerFundAmount(params, blockReward, pprev);
    for (auto &o : coinbaseTxOut) {
        if (o.nValue < required) {
            // This output doesn't qualify because its amount is too low.
            continue;
        }

        CTxDestination address;
        if (!ExtractDestination(o.scriptPubKey, address)) {
            // Cannot decode address.
            continue;
        }

        if (std::find(whitelist.begin(), whitelist.end(), address) !=
            whitelist.end()) {
            return true;
        }
    }

    // We did not find an output that match the miner fund requirements.
    return false;
}
