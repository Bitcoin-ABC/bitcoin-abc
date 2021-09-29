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

void RegisterABCRPCCommands(CRPCTable &t) {
    // clang-format off
    static const CRPCCommand commands[] = {
        //  category            name                      actor (function)        argNames
        //  ------------------- ------------------------  ----------------------  ----------
        { "network",            "getexcessiveblock",      getexcessiveblock,      {}},
    };
    // clang-format on

    for (unsigned int vcidx = 0; vcidx < ARRAYLEN(commands); vcidx++) {
        t.appendCommand(commands[vcidx].name, &commands[vcidx]);
    }
}
