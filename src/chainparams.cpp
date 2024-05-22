// Copyright (c) 2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2017-2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chainparams.h>

#include <consensus/merkle.h>
#include <currencyunit.h>
#include <logging.h>
#include <tinyformat.h>
#include <util/system.h>

#include <cassert>

static std::unique_ptr<const CChainParams> globalChainParams;

const CChainParams &Params() {
    assert(globalChainParams);
    return *globalChainParams;
}

void ReadChainArgs(const ArgsManager &args,
                   CChainParams::ChainOptions &options) {
    options.ecash = args.GetBoolArg("-ecash", DEFAULT_ECASH);
    // Only relevant for REGTEST
    options.fastprune = args.GetBoolArg("-fastprune", false);
}

std::unique_ptr<const CChainParams>
CreateChainParams(const ArgsManager &args, const std::string &chain) {
    auto opts = CChainParams::ChainOptions{};
    ReadChainArgs(args, opts);
    if (chain == CBaseChainParams::MAIN) {
        return CChainParams::Main(opts);
    }

    if (chain == CBaseChainParams::TESTNET) {
        return CChainParams::TestNet(opts);
    }

    if (chain == CBaseChainParams::REGTEST) {
        return CChainParams::RegTest(opts);
    }

    throw std::runtime_error(
        strprintf("%s: Unknown chain %s.", __func__, chain));
}

void SelectParams(const std::string &network) {
    SelectBaseParams(network);
    globalChainParams = CreateChainParams(gArgs, network);
}
