// Copyright (c) 2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <zmq/zmqrpc.h>

#include <rpc/server.h>
#include <rpc/util.h>
#include <zmq/zmqabstractnotifier.h>
#include <zmq/zmqnotificationinterface.h>

#include <univalue.h>

namespace {

static RPCHelpMan getzmqnotifications() {
    return RPCHelpMan{
        "getzmqnotifications",
        "Returns information about the active ZeroMQ notifications.\n",
        {},
        RPCResult{
            RPCResult::Type::ARR,
            "",
            "",
            {
                {RPCResult::Type::OBJ,
                 "",
                 "",
                 {
                     {RPCResult::Type::STR, "type", "Type of notification"},
                     {RPCResult::Type::STR, "address",
                      "Address of the publisher"},
                     {RPCResult::Type::NUM, "hwm",
                      "Outbound message high water mark"},
                 }},
            }},
        RPCExamples{HelpExampleCli("getzmqnotifications", "") +
                    HelpExampleRpc("getzmqnotifications", "")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            UniValue result(UniValue::VARR);
            if (g_zmq_notification_interface != nullptr) {
                for (const auto *n :
                     g_zmq_notification_interface->GetActiveNotifiers()) {
                    UniValue obj(UniValue::VOBJ);
                    obj.pushKV("type", n->GetType());
                    obj.pushKV("address", n->GetAddress());
                    obj.pushKV("hwm", n->GetOutboundMessageHighWaterMark());
                    result.push_back(obj);
                }
            }

            return result;
        },
    };
}

// clang-format off
static const CRPCCommand commands[] = {
    //  category          name                     actor (function)        argNames
    //  ----------------- ------------------------ ----------------------- ----------
    { "zmq",            "getzmqnotifications",   getzmqnotifications,    {} },
};
// clang-format on

} // anonymous namespace

void RegisterZMQRPCCommands(CRPCTable &t) {
    for (const auto &c : commands) {
        t.appendCommand(c.name, &c);
    }
}
