// Copyright (c) 2017-2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <config.h>
#include <consensus/consensus.h>
#include <rpc/server.h>
#include <rpc/util.h>
#include <util/strencodings.h>
#include <validation.h>

#include <univalue.h>

static UniValue getexcessiveblock(const Config &config,
                                  const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() != 0) {
        throw std::runtime_error(RPCHelpMan{
            "getexcessiveblock",
            "\nReturn the excessive block size.",
            {},
            RPCResult{"  excessiveBlockSize (integer) block size in bytes\n"},
            RPCExamples{HelpExampleCli("getexcessiveblock", "") +
                        HelpExampleRpc("getexcessiveblock", "")},
        }
                                     .ToStringWithResultsAndExamples());
    }

    UniValue ret(UniValue::VOBJ);
    ret.pushKV("excessiveBlockSize", config.GetMaxBlockSize());
    return ret;
}

static UniValue setexcessiveblock(Config &config,
                                  const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() != 1) {
        throw std::runtime_error(RPCHelpMan{
            "setexcessiveblock",
            "\nSet the excessive block size. Excessive blocks will not be used "
            "in the active chain or relayed. This discourages the propagation "
            "of blocks that you consider excessively large.",
            {
                {"blockSize", RPCArg::Type::NUM, /* opt */ false,
                 /* default_value */ "",
                 "Excessive block size in bytes.  Must be greater than " +
                     std::to_string(LEGACY_MAX_BLOCK_SIZE) + "."},
            },
            RPCResult{"  blockSize (integer) excessive block size in bytes\n"},
            RPCExamples{HelpExampleCli("setexcessiveblock", "25000000") +
                        HelpExampleRpc("setexcessiveblock", "25000000")},
        }
                                     .ToStringWithResultsAndExamples());
    }

    if (!request.params[0].isNum()) {
        throw JSONRPCError(
            RPC_INVALID_PARAMETER,
            std::string(
                "Invalid parameter, excessiveblock must be an integer"));
    }

    int64_t ebs = request.params[0].get_int64();

    // Do not allow maxBlockSize to be set below historic 1MB limit
    if (ebs <= int64_t(LEGACY_MAX_BLOCK_SIZE)) {
        throw JSONRPCError(
            RPC_INVALID_PARAMETER,
            std::string(
                "Invalid parameter, excessiveblock must be larger than ") +
                std::to_string(LEGACY_MAX_BLOCK_SIZE));
    }

    // Set the new max block size.
    if (!config.SetMaxBlockSize(ebs)) {
        throw JSONRPCError(RPC_INVALID_PARAMETER, "Unexpected error");
    }

    // settingsToUserAgentString();
    std::ostringstream ret;
    ret << "Excessive Block set to " << ebs << " bytes.";
    return UniValue(ret.str());
}

// clang-format off
static const CRPCCommand commands[] = {
    //  category            name                      actor (function)        argNames
    //  ------------------- ------------------------  ----------------------  ----------
    { "network",            "getexcessiveblock",      getexcessiveblock,      {}},
    { "network",            "setexcessiveblock",      setexcessiveblock,      {"maxBlockSize"}},
};
// clang-format on

void RegisterABCRPCCommands(CRPCTable &t) {
    for (unsigned int vcidx = 0; vcidx < ARRAYLEN(commands); vcidx++) {
        t.appendCommand(commands[vcidx].name, &commands[vcidx]);
    }
}
