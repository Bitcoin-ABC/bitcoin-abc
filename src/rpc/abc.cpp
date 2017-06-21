// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "config.h"
#include "consensus/consensus.h"
#include "rpc/server.h"
#include "utilstrencodings.h"
#include "validation.h"

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
    ret.push_back(Pair("excessiveBlockSize", config.GetMaxBlockSize()));
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
        if (temp[0] == '-') boost::throw_exception(boost::bad_lexical_cast());
        ebs = boost::lexical_cast<uint64_t>(temp);
    }

    // Do not allow maxBlockSize to be set below historic 1MB limit
    if (ebs <= LEGACY_MAX_BLOCK_SIZE)
        throw JSONRPCError(
            RPC_INVALID_PARAMETER,
            std::string(
                "Invalid parameter, excessiveblock must be larger than ") +
                std::to_string(LEGACY_MAX_BLOCK_SIZE));

    // Set the new max block size.
    if (!config.SetMaxBlockSize(ebs)) {
        throw JSONRPCError(RPC_INVALID_PARAMETER, "Unexpected error");
    }

    // settingsToUserAgentString();
    std::ostringstream ret;
    ret << "Excessive Block set to " << ebs << " bytes.";
    return UniValue(ret.str());
}

static UniValue getuahfstarttime(const Config &config,
                                 const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() != 0) {
        throw std::runtime_error(
            "getuahfstarttime\n"
            "\nReturn the UAHF start time."
            "\nResult\n"
            "  UAHF start time (integer) POSIX time, seconds since epoch)\n"
            "\nExamples:\n" +
            HelpExampleCli("getuahfstarttime", "") +
            HelpExampleRpc("getuahfstarttime", ""));
    }

    UniValue ret(UniValue::VOBJ);
    ret.push_back(Pair("uahfStartTime", config.GetUAHFStartTime()));
    return ret;
}

static UniValue setuahfstarttime(Config &config,
                                 const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() != 1) {
        throw std::runtime_error(
            "setuahfstarttime uahfStartTime\n"
            "\nSet the UAHF start time in seconds after the epoch. The chain "
            "will fork once the Median Time Past of last block exceeds this "
            "value. "
            "The time value must be more than 2 hours past current chain tip "
            "and "
            "less than 2^63. Once UAHF has already activated, it is not "
            "allowed to "
            "modify the value at runtime."
            "\nResult\n"
            "  uahfStartTime (integer) seconds since UNIX epoch\n"
            "\nExamples:\n" +
            HelpExampleCli("setuahfstarttime", "2134567890") +
            HelpExampleRpc("setuahfstarttime", "2134567890"));
    }

    int64_t starttime = 0;
    uint64_t mtp = 0;
    uint64_t oldstarttime = 0;

    if (request.params[0].isNum()) {
        starttime = request.params[0].get_int64();
    } else {
        std::string temp = request.params[0].get_str();
        if (temp[0] == '-') boost::throw_exception(boost::bad_lexical_cast());
        starttime = boost::lexical_cast<uint64_t>(temp);
    }

    {
        LOCK(cs_main);
        mtp = chainActive.Tip()->GetMedianTimePast();
        oldstarttime = config.GetUAHFStartTime();
    }

    // Only allow update if UAHF has not already activated.
    if (mtp >= oldstarttime)
        throw JSONRPCError(RPC_INVALID_PARAMETER,
                           std::string("UAHF already activated - disallowing "
                                       "start time modification"));

    // Check that proposed start time is more than 2 hours past chain tip MTP
    if ((uint64_t)starttime <= mtp + 2 * 60 * 60)
        throw JSONRPCError(RPC_INVALID_PARAMETER,
                           std::string("Invalid parameter, uahfStartTime must "
                                       "be greater than chain tip "
                                       "MTP+2hrs (") +
                               std::to_string(mtp + 2 * 60 * 60) + ")");

    // Set the new UAHF start time
    if (!config.SetUAHFStartTime(starttime)) {
        throw JSONRPCError(RPC_INVALID_PARAMETER, "Unexpected error");
    }

    // settingsToUserAgentString();
    std::ostringstream ret;
    ret << "UAHF start time set to " << starttime << " seconds after epoch.";
    return UniValue(ret.str());
}

// clang-format off
static const CRPCCommand commands[] = {
    //  category            name                      actor (function)        okSafeMode
    //  ------------------- ------------------------  ----------------------  ----------
    { "network",            "getexcessiveblock",      getexcessiveblock,      true, {}},
    { "network",            "setexcessiveblock",      setexcessiveblock,      true, {"maxBlockSize"}},
    { "network",            "getuahfstarttime",       getuahfstarttime,       true, {}},
    { "network",            "setuahfstarttime",       setuahfstarttime,       true, {"uahfStartTime"}},
};
// clang-format on

void RegisterABCRPCCommands(CRPCTable &tableRPC) {
    for (unsigned int vcidx = 0; vcidx < ARRAYLEN(commands); vcidx++)
        tableRPC.appendCommand(commands[vcidx].name, &commands[vcidx]);
}
