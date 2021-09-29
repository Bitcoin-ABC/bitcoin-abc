// Copyright (c) 2010 Satoshi Nakamoto
// Copyright (c) 2009-2015 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chainparamsbase.h>

#include <tinyformat.h>
#include <util/system.h>

#include <cassert>

const std::string CBaseChainParams::MAIN = "main";
const std::string CBaseChainParams::TESTNET = "test";
const std::string CBaseChainParams::REGTEST = "regtest";

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

std::unique_ptr<CBaseChainParams>
CreateBaseChainParams(const std::string &chain) {
    if (chain == CBaseChainParams::MAIN) {
        return std::make_unique<CBaseChainParams>("", 8332);
    }

    if (chain == CBaseChainParams::TESTNET) {
        return std::make_unique<CBaseChainParams>("testnet3", 18332);
    }

    if (chain == CBaseChainParams::REGTEST) {
        return std::make_unique<CBaseChainParams>("regtest", 18443);
    }

    throw std::runtime_error(
        strprintf("%s: Unknown chain %s.", __func__, chain));
}

void SelectBaseParams(const std::string &chain) {
    globalChainBaseParams = CreateBaseChainParams(chain);
    gArgs.SelectConfigNetwork(chain);
}
