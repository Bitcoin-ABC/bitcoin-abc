// Copyright (c) 2018-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "chainparams.h"
#include "config.h"
#include "rpc/jsonrpcrequest.h"
#include "rpc/server.h"
#include "util.h"

#include "test/test_bitcoin.h"

#include <boost/test/unit_test.hpp>

#include <string>

BOOST_FIXTURE_TEST_SUITE(rpc_server_tests, TestingSetup)

class ArgsTestRPCCommand : public RPCCommand {
public:
    ArgsTestRPCCommand(std::string nameIn) : RPCCommand(nameIn) {}

    UniValue Execute(const UniValue &args) const override {
        BOOST_CHECK_EQUAL(args["arg1"].get_str(), "value1");
        return UniValue("testing");
    }
};

static bool isRpcMethodNotFound(const UniValue &u) {
    return find_value(u, "code").get_int() == int(RPC_METHOD_NOT_FOUND);
}

BOOST_AUTO_TEST_CASE(rpc_server_execute_command) {
    DummyConfig config;
    RPCServer rpcServer;
    const std::string commandName = "testcommand";
    rpcServer.RegisterCommand(MakeUnique<ArgsTestRPCCommand>(commandName));

    UniValue args(UniValue::VOBJ);
    args.pushKV("arg1", "value1");

    // Registered commands execute and return values correctly
    JSONRPCRequest request;
    request.strMethod = commandName;
    request.params = args;
    UniValue output = rpcServer.ExecuteCommand(config, request);
    BOOST_CHECK_EQUAL(output.get_str(), "testing");

    // Not-registered commands throw an exception as expected
    JSONRPCRequest badCommandRequest;
    badCommandRequest.strMethod = "this-command-does-not-exist";
    BOOST_CHECK_EXCEPTION(rpcServer.ExecuteCommand(config, badCommandRequest),
                          UniValue, isRpcMethodNotFound);
}

BOOST_AUTO_TEST_SUITE_END()
