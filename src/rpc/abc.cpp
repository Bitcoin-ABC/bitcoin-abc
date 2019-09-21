// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <config.h>
#include <consensus/consensus.h>
#include <rpc/server.h>
#include <util/strencodings.h>
#include <validation.h>

#include <univalue.h>

#include <boost/lexical_cast.hpp>

static UniValue getexcessiveblock(const Config &config,
                                  const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() != 0) {
        throw std::runtime_error(
            "getexcessiveblock\n"
            "\nReturn the excessive block size."
            "\nResult\n"
            "  excessiveBlockSize (integer) block size in bytes\n"
            "\nExamples:\n" +
            HelpExampleCli("getexcessiveblock", "") +
            HelpExampleRpc("getexcessiveblock", ""));
    }

    UniValue ret(UniValue::VOBJ);
    ret.pushKV("excessiveBlockSize", config.GetMaxBlockSize());
    return ret;
}

static UniValue setexcessiveblock(Config &config,
                                  const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() != 1) {
        throw std::runtime_error(
            "setexcessiveblock blockSize\n"
            "\nSet the excessive block size. Excessive blocks will not be used "
            "in the active chain or relayed. This  discourages the propagation "
            "of blocks that you consider excessively large."
            "\nResult\n"
            "  blockSize (integer) excessive block size in bytes\n"
            "\nExamples:\n" +
            HelpExampleCli("setexcessiveblock", "") +
            HelpExampleRpc("setexcessiveblock", ""));
    }

    uint64_t ebs = 0;
    if (request.params[0].isNum()) {
        ebs = request.params[0].get_int64();
    } else {
        std::string temp = request.params[0].get_str();
        if (temp[0] == '-') {
            boost::throw_exception(boost::bad_lexical_cast());
        }
        ebs = boost::lexical_cast<uint64_t>(temp);
    }

    // Do not allow maxBlockSize to be set below historic 1MB limit
    if (ebs <= LEGACY_MAX_BLOCK_SIZE) {
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
static const ContextFreeRPCCommand commands[] = {
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
