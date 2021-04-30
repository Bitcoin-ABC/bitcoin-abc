// Copyright (c) 2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <qt/test/rpcnestedtests.h>

#include <common/system.h>
#include <config.h>
#include <interfaces/node.h>
#include <qt/rpcconsole.h>
#include <rpc/server.h>

#include <test/util/setup_common.h>

#include <univalue.h>

#include <QDir>
#include <QtGlobal>

static RPCHelpMan rpcNestedTest_rpc() {
    return RPCHelpMan{
        "rpcNestedTest",
        "echo the passed string(s)",
        {
            {"arg1", RPCArg::Type::STR, RPCArg::Optional::OMITTED, ""},
            {"arg2", RPCArg::Type::STR, RPCArg::Optional::OMITTED, ""},
            {"arg3", RPCArg::Type::STR, RPCArg::Optional::OMITTED, ""},
        },
        RPCResult{RPCResult::Type::ANY, "", ""},
        RPCExamples{""},
        [](const RPCHelpMan &self, const Config &config,
           const JSONRPCRequest &request) -> UniValue {
            return request.params.write(0, 0);
        },
    };
}

static const CRPCCommand vRPCCommands[] = {
    {"rpcNestedTest", &rpcNestedTest_rpc},
};

void RPCNestedTests::rpcNestedTests() {
    // do some test setup
    // could be moved to a more generic place when we add more tests on QT level
    for (const auto &c : vRPCCommands) {
        tableRPC.appendCommand(c.name, &c);
    }

    TestingSetup test;
    m_node.setContext(&test.m_node);

    std::string result;
    std::string result2;
    std::string filtered;
    // Simple result filtering with path.
    RPCConsole::RPCExecuteCommandLine(m_node, result,
                                      "getblockchaininfo()[chain]", &filtered);
    QVERIFY(result == "main");
    QVERIFY(filtered == "getblockchaininfo()[chain]");

    // Simple 2 level nesting.
    RPCConsole::RPCExecuteCommandLine(m_node, result,
                                      "getblock(getbestblockhash())");
    RPCConsole::RPCExecuteCommandLine(
        m_node, result, "getblock(getblock(getbestblockhash())[hash], true)");

    // 4 level nesting with whitespace, filtering path and boolean parameter.
    RPCConsole::RPCExecuteCommandLine(
        m_node, result,
        "getblock( getblock( getblock(getbestblockhash())[hash] "
        ")[hash], true)");

    RPCConsole::RPCExecuteCommandLine(m_node, result, "getblockchaininfo");
    QVERIFY(result.substr(0, 1) == "{");

    RPCConsole::RPCExecuteCommandLine(m_node, result, "getblockchaininfo()");
    QVERIFY(result.substr(0, 1) == "{");

    // Whitespace at the end will be tolerated.
    RPCConsole::RPCExecuteCommandLine(m_node, result, "getblockchaininfo ");
    QVERIFY(result.substr(0, 1) == "{");

    // Quote path identifier are allowed, but look after a child containing the
    // quotes in the key.
    (RPCConsole::RPCExecuteCommandLine(m_node, result,
                                       "getblockchaininfo()[\"chain\"]"));
    QVERIFY(result == "null");

    // parameter not in brackets are allowed.
    (RPCConsole::RPCExecuteCommandLine(m_node, result,
                                       "createrawtransaction [] {} 0"));
    // Parameter in brackets are allowed.
    (RPCConsole::RPCExecuteCommandLine(m_node, result2,
                                       "createrawtransaction([],{},0)"));
    QVERIFY(result == result2);
    // Whitespace between parameters is allowed.
    (RPCConsole::RPCExecuteCommandLine(
        m_node, result2, "createrawtransaction( [],  {} , 0   )"));
    QVERIFY(result == result2);

    RPCConsole::RPCExecuteCommandLine(
        m_node, result, "getblock(getbestblockhash())[tx][0]", &filtered);
    QVERIFY(result ==
            "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b");
    QVERIFY(filtered == "getblock(getbestblockhash())[tx][0]");

    RPCConsole::RPCParseCommandLine(nullptr, result, "importprivkey", false,
                                    &filtered);
    QVERIFY(filtered == "importprivkey(…)");
    RPCConsole::RPCParseCommandLine(
        nullptr, result, "signmessagewithprivkey abc", false, &filtered);
    QVERIFY(filtered == "signmessagewithprivkey(…)");
    RPCConsole::RPCParseCommandLine(
        nullptr, result, "signmessagewithprivkey abc,def", false, &filtered);
    QVERIFY(filtered == "signmessagewithprivkey(…)");
    RPCConsole::RPCParseCommandLine(
        nullptr, result, "signrawtransactionwithkey(abc)", false, &filtered);
    QVERIFY(filtered == "signrawtransactionwithkey(…)");
    RPCConsole::RPCParseCommandLine(nullptr, result, "walletpassphrase(help())",
                                    false, &filtered);
    QVERIFY(filtered == "walletpassphrase(…)");
    RPCConsole::RPCParseCommandLine(
        nullptr, result,
        "walletpassphrasechange(help(walletpassphrasechange(abc)))", false,
        &filtered);
    QVERIFY(filtered == "walletpassphrasechange(…)");
    RPCConsole::RPCParseCommandLine(
        nullptr, result, "help(encryptwallet(abc, def))", false, &filtered);
    QVERIFY(filtered == "help(encryptwallet(…))");
    RPCConsole::RPCParseCommandLine(nullptr, result, "help(importprivkey())",
                                    false, &filtered);
    QVERIFY(filtered == "help(importprivkey(…))");
    RPCConsole::RPCParseCommandLine(
        nullptr, result, "help(importprivkey(help()))", false, &filtered);
    QVERIFY(filtered == "help(importprivkey(…))");
    RPCConsole::RPCParseCommandLine(
        nullptr, result, "help(importprivkey(abc), walletpassphrase(def))",
        false, &filtered);
    QVERIFY(filtered == "help(importprivkey(…), walletpassphrase(…))");

    RPCConsole::RPCExecuteCommandLine(m_node, result, "rpcNestedTest");
    QVERIFY(result == "[]");
    RPCConsole::RPCExecuteCommandLine(m_node, result, "rpcNestedTest ''");
    QVERIFY(result == "[\"\"]");
    RPCConsole::RPCExecuteCommandLine(m_node, result, "rpcNestedTest \"\"");
    QVERIFY(result == "[\"\"]");
    RPCConsole::RPCExecuteCommandLine(m_node, result, "rpcNestedTest '' abc");
    QVERIFY(result == "[\"\",\"abc\"]");
    RPCConsole::RPCExecuteCommandLine(m_node, result,
                                      "rpcNestedTest abc '' abc");
    QVERIFY(result == "[\"abc\",\"\",\"abc\"]");
    RPCConsole::RPCExecuteCommandLine(m_node, result, "rpcNestedTest abc  abc");
    QVERIFY(result == "[\"abc\",\"abc\"]");
    RPCConsole::RPCExecuteCommandLine(m_node, result,
                                      "rpcNestedTest abc\t\tabc");
    QVERIFY(result == "[\"abc\",\"abc\"]");
    RPCConsole::RPCExecuteCommandLine(m_node, result, "rpcNestedTest(abc )");
    QVERIFY(result == "[\"abc\"]");
    RPCConsole::RPCExecuteCommandLine(m_node, result, "rpcNestedTest( abc )");
    QVERIFY(result == "[\"abc\"]");
    RPCConsole::RPCExecuteCommandLine(m_node, result,
                                      "rpcNestedTest(   abc   ,   cba )");
    QVERIFY(result == "[\"abc\",\"cba\"]");

// Handle deprecated macro, can be removed once minimum Qt is at least 6.3.0.
#if (QT_VERSION >= QT_VERSION_CHECK(6, 3, 0))
#undef QVERIFY_EXCEPTION_THROWN
#define QVERIFY_EXCEPTION_THROWN(expression, exceptiontype)                    \
    QVERIFY_THROWS_EXCEPTION(exceptiontype, expression)
#endif
    // invalid syntax
    QVERIFY_EXCEPTION_THROWN(RPCConsole::RPCExecuteCommandLine(
                                 m_node, result, "getblockchaininfo() .\n"),
                             std::runtime_error);

    // invalid syntax
    QVERIFY_EXCEPTION_THROWN(
        RPCConsole::RPCExecuteCommandLine(
            m_node, result, "getblockchaininfo() getblockchaininfo()"),
        std::runtime_error);
    // tolerate non closing brackets if we have no arguments.
    (RPCConsole::RPCExecuteCommandLine(m_node, result, "getblockchaininfo("));

    // tolerate non command brackts
    (RPCConsole::RPCExecuteCommandLine(m_node, result,
                                       "getblockchaininfo()()()"));

    // invalid argument
    QVERIFY_EXCEPTION_THROWN(RPCConsole::RPCExecuteCommandLine(
                                 m_node, result, "getblockchaininfo(True)"),
                             UniValue);
    // method not found
    QVERIFY_EXCEPTION_THROWN(RPCConsole::RPCExecuteCommandLine(
                                 m_node, result, "a(getblockchaininfo(True))"),
                             UniValue);
    // don't tollerate empty arguments when using ,
    QVERIFY_EXCEPTION_THROWN(RPCConsole::RPCExecuteCommandLine(
                                 m_node, result, "rpcNestedTest abc,,abc"),
                             std::runtime_error);
    // don't tollerate empty arguments when using ,
    QVERIFY_EXCEPTION_THROWN(RPCConsole::RPCExecuteCommandLine(
                                 m_node, result, "rpcNestedTest(abc,,abc)"),
                             std::runtime_error);
    // don't tollerate empty arguments when using ,
    QVERIFY_EXCEPTION_THROWN(RPCConsole::RPCExecuteCommandLine(
                                 m_node, result, "rpcNestedTest(abc,,)"),
                             std::runtime_error);
}
