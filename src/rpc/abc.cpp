// Copyright (c) 2017-2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <config.h>
#include <consensus/consensus.h>
#include <rpc/server.h>
#include <rpc/util.h>
#include <sync.h>
#include <util/strencodings.h>
#include <util/string.h>
#include <validation.h>

#include <univalue.h>

static UniValue getexcessiveblock(const Config &config,
                                  const JSONRPCRequest &request) {
    RPCHelpMan{
        "getexcessiveblock",
        "Return the excessive block size.",
        {},
        RPCResult{RPCResult::Type::NUM, "", "excessive block size in bytes"},
        RPCExamples{HelpExampleCli("getexcessiveblock", "") +
                    HelpExampleRpc("getexcessiveblock", "")},
    }
        .Check(request);

    UniValue ret(UniValue::VOBJ);
    ret.pushKV("excessiveBlockSize", config.GetMaxBlockSize());
    return ret;
}

static UniValue setexcessiveblock(Config &config,
                                  const JSONRPCRequest &request) {
    RPCHelpMan{
        "setexcessiveblock",
        "DEPRECATED. Set the excessive block size. Excessive blocks will not "
        "be used in the active chain or relayed. This discourages the "
        "propagation of blocks that you consider excessively large.",
        {
            {"blockSize", RPCArg::Type::NUM, RPCArg::Optional::NO,
             "Excessive block size in bytes.  Must be greater than " +
                 ToString(LEGACY_MAX_BLOCK_SIZE) + "."},
        },
        RPCResult{RPCResult::Type::NUM, "", "excessive block size in bytes"},
        RPCExamples{HelpExampleCli("setexcessiveblock", "25000000") +
                    HelpExampleRpc("setexcessiveblock", "25000000")},
    }
        .Check(request);

    if (!IsDeprecatedRPCEnabled(gArgs, "setexcessiveblock")) {
        // setexcessiveblock is deprecated in v0.22.12 for removal in v0.23
        throw JSONRPCError(
            RPC_METHOD_DEPRECATED,
            std::string(
                "The setexcessiveblock RPC is deprecated and will be removed "
                "in a future version. Use the -deprecatedrpc=setexcessiveblock "
                "option to continue using it."));
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
                ToString(LEGACY_MAX_BLOCK_SIZE));
    }

    // Set the new max block size.
    {
        LOCK(cs_main);
        if (!config.SetMaxBlockSize(ebs)) {
            throw JSONRPCError(RPC_INVALID_PARAMETER, "Unexpected error");
        }
    }

    // settingsToUserAgentString();
    std::ostringstream ret;
    ret << "Excessive Block set to " << ebs << " bytes.";
    return UniValue(ret.str());
}

void RegisterABCRPCCommands(CRPCTable &t) {
    // clang-format off
    static const CRPCCommand commands[] = {
        //  category            name                      actor (function)        argNames
        //  ------------------- ------------------------  ----------------------  ----------
        { "network",            "getexcessiveblock",      getexcessiveblock,      {}},
        { "network",            "setexcessiveblock",      setexcessiveblock,      {"maxBlockSize"}},
    };
    // clang-format on

    for (unsigned int vcidx = 0; vcidx < ARRAYLEN(commands); vcidx++) {
        t.appendCommand(commands[vcidx].name, &commands[vcidx]);
    }
}
