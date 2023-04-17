// Copyright (c) 2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2017-2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chainparams.h>

#include <common/args.h>
#include <consensus/merkle.h>
#include <currencyunit.h>
#include <logging.h>
#include <tinyformat.h>
#include <util/chaintype.h>

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

std::unique_ptr<const CChainParams> CreateChainParams(const ArgsManager &args,
                                                      const ChainType chain) {
    auto opts = CChainParams::ChainOptions{};
    ReadChainArgs(args, opts);
    switch (chain) {
        case ChainType::MAIN:
            return CChainParams::Main(opts);
        case ChainType::TESTNET:
            return CChainParams::TestNet(opts);
        case ChainType::REGTEST: {
            return CChainParams::RegTest(opts);
        }
    }
    throw std::invalid_argument(
        strprintf("%s: Invalid ChainType value", __func__));
}

void SelectParams(const ChainType chain) {
    SelectBaseParams(chain);
    globalChainParams = CreateChainParams(gArgs, chain);
}
