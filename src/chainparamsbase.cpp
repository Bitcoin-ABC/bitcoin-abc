// Copyright (c) 2010 Satoshi Nakamoto
// Copyright (c) 2009-2015 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chainparamsbase.h>

#include <common/args.h>
#include <tinyformat.h>
#include <util/chaintype.h>

#include <cassert>

void SetupChainParamsBaseOptions(ArgsManager &argsman) {
    argsman.AddArg(
        "-chain=<chain>",
        "Use the chain <chain> (default: main). Allowed values: main, "
        "test, regtest",
        ArgsManager::ALLOW_ANY, OptionsCategory::CHAINPARAMS);
    argsman.AddArg(
        "-regtest",
        "Enter regression test mode, which uses a special chain in which "
        "blocks can be solved instantly. This is intended for regression "
        "testing tools and app development. Equivalent to -chain=regtest.",
        ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
        OptionsCategory::CHAINPARAMS);
    argsman.AddArg("-testnet", "Use the test chain. Equivalent to -chain=test.",
                   ArgsManager::ALLOW_ANY, OptionsCategory::CHAINPARAMS);
}

static std::unique_ptr<CBaseChainParams> globalChainBaseParams;

const CBaseChainParams &BaseParams() {
    assert(globalChainBaseParams);
    return *globalChainBaseParams;
}

/**
 * Port numbers for incoming Tor connections (8334, 18334, 38334, 18445) have
 * been chosen arbitrarily to keep ranges of used ports tight.
 */
std::unique_ptr<CBaseChainParams> CreateBaseChainParams(const ChainType chain) {
    switch (chain) {
        case ChainType::MAIN:
            return std::make_unique<CBaseChainParams>(
                "", /*rpc_port=*/8332, 8334,
                /*chronik_port=*/8331,
                /*chronik_electrum_port=*/50002);
        case ChainType::TESTNET:
            return std::make_unique<CBaseChainParams>(
                "testnet3",
                /*rpc_port=*/18332, 18334,
                /*chronik_port=*/18331,
                /*chronik_electrum_port=*/60002);
        case ChainType::REGTEST:
            return std::make_unique<CBaseChainParams>(
                "regtest", /*rpc_port=*/18443, 18445,
                /*chronik_port=*/18442,
                /*chronik_electrum_port=*/60103);
    }
    throw std::invalid_argument(
        strprintf("%s: Invalid ChainType value", __func__));
}

void SelectBaseParams(const ChainType chain) {
    globalChainBaseParams = CreateBaseChainParams(chain);
    gArgs.SelectConfigNetwork(ChainTypeToString(chain));
}
