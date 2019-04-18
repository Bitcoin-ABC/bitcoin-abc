// Copyright (c) 2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <qt/test/rpcnestedtests.h>

#include <chainparams.h>
#include <config.h>
#include <consensus/validation.h>
#include <fs.h>
#include <interfaces/node.h>
#include <qt/rpcconsole.h>
#include <rpc/register.h>
#include <rpc/server.h>
#include <util.h>
#include <validation.h>

#include <test/test_bitcoin.h>

#include <QDir>
#include <QtGlobal>

#include <univalue.h>

static UniValue rpcNestedTest_rpc(const Config &config,
                                  const JSONRPCRequest &request) {
    if (request.fHelp) {
        return "help message";
    }
    return request.params.write(0, 0);
}

static const ContextFreeRPCCommand vRPCCommands[] = {
    {"test", "rpcNestedTest", &rpcNestedTest_rpc, {}},
};

void RPCNestedTests::rpcNestedTests() {
    // do some test setup
    // could be moved to a more generic place when we add more tests on QT level
    tableRPC.appendCommand("rpcNestedTest", &vRPCCommands[0]);
    ClearDatadirCache();
    std::string path =
        QDir::tempPath().toStdString() + "/" +
        strprintf("test_bitcoin_qt_%lu_%i", (unsigned long)GetTime(),
                  (int)(GetRand(100000)));
    QDir dir(QString::fromStdString(path));
    dir.mkpath(".");
    gArgs.ForceSetArg("-datadir", path);
    // mempool.setSanityCheck(1.0);

    TestingSetup test;

    std::string result;
    std::string result2;
    std::string filtered;
    auto node = interfaces::MakeNode();

    // Simple result filtering with path.
    RPCConsole::RPCExecuteCommandLine(*node, result,
                                      "getblockchaininfo()[chain]", &filtered);
    QVERIFY(result == "main");
    QVERIFY(filtered == "getblockchaininfo()[chain]");

    // Simple 2 level nesting.
    RPCConsole::RPCExecuteCommandLine(*node, result,
                                      "getblock(getbestblockhash())");
    RPCConsole::RPCExecuteCommandLine(
        *node, result, "getblock(getblock(getbestblockhash())[hash], true)");

    // 4 level nesting with whitespace, filtering path and boolean parameter.
    RPCConsole::RPCExecuteCommandLine(
        *node, result,
        "getblock( getblock( getblock(getbestblockhash())[hash] "
        ")[hash], true)");

    RPCConsole::RPCExecuteCommandLine(*node, result, "getblockchaininfo");
    QVERIFY(result.substr(0, 1) == "{");

    RPCConsole::RPCExecuteCommandLine(*node, result, "getblockchaininfo()");
    QVERIFY(result.substr(0, 1) == "{");

    // Whitespace at the end will be tolerated.
    RPCConsole::RPCExecuteCommandLine(*node, result, "getblockchaininfo ");
    QVERIFY(result.substr(0, 1) == "{");

    // Quote path identifier are allowed, but look after a child contaning the
    // quotes in the key.
    (RPCConsole::RPCExecuteCommandLine(*node, result,
                                       "getblockchaininfo()[\"chain\"]"));
    QVERIFY(result == "null");

    // parameter not in brackets are allowed.
    (RPCConsole::RPCExecuteCommandLine(*node, result,
                                       "createrawtransaction [] {} 0"));
    // Parameter in brackets are allowed.
    (RPCConsole::RPCExecuteCommandLine(*node, result2,
                                       "createrawtransaction([],{},0)"));
    QVERIFY(result == result2);
    // Whitespace between parameters is allowed.
    (RPCConsole::RPCExecuteCommandLine(
        *node, result2, "createrawtransaction( [],  {} , 0   )"));
    QVERIFY(result == result2);

    RPCConsole::RPCExecuteCommandLine(
        *node, result, "getblock(getbestblockhash())[tx][0]", &filtered);
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

    RPCConsole::RPCExecuteCommandLine(*node, result, "rpcNestedTest");
    QVERIFY(result == "[]");
    RPCConsole::RPCExecuteCommandLine(*node, result, "rpcNestedTest ''");
    QVERIFY(result == "[\"\"]");
    RPCConsole::RPCExecuteCommandLine(*node, result, "rpcNestedTest \"\"");
    QVERIFY(result == "[\"\"]");
    RPCConsole::RPCExecuteCommandLine(*node, result, "rpcNestedTest '' abc");
    QVERIFY(result == "[\"\",\"abc\"]");
    RPCConsole::RPCExecuteCommandLine(*node, result,
                                      "rpcNestedTest abc '' abc");
    QVERIFY(result == "[\"abc\",\"\",\"abc\"]");
    RPCConsole::RPCExecuteCommandLine(*node, result, "rpcNestedTest abc  abc");
    QVERIFY(result == "[\"abc\",\"abc\"]");
    RPCConsole::RPCExecuteCommandLine(*node, result,
                                      "rpcNestedTest abc\t\tabc");
    QVERIFY(result == "[\"abc\",\"abc\"]");
    RPCConsole::RPCExecuteCommandLine(*node, result, "rpcNestedTest(abc )");
    QVERIFY(result == "[\"abc\"]");
    RPCConsole::RPCExecuteCommandLine(*node, result, "rpcNestedTest( abc )");
    QVERIFY(result == "[\"abc\"]");
    RPCConsole::RPCExecuteCommandLine(*node, result,
                                      "rpcNestedTest(   abc   ,   cba )");
    QVERIFY(result == "[\"abc\",\"cba\"]");

#if QT_VERSION >= 0x050300
    // do the QVERIFY_EXCEPTION_THROWN checks only with Qt5.3 and higher
    // (QVERIFY_EXCEPTION_THROWN was introduced in Qt5.3)

    // invalid syntax
    QVERIFY_EXCEPTION_THROWN(RPCConsole::RPCExecuteCommandLine(
                                 *node, result, "getblockchaininfo() .\n"),
                             std::runtime_error);

    // invalid syntax
    QVERIFY_EXCEPTION_THROWN(
        RPCConsole::RPCExecuteCommandLine(
            *node, result, "getblockchaininfo() getblockchaininfo()"),
        std::runtime_error);
    // tolerate non closing brackets if we have no arguments.
    (RPCConsole::RPCExecuteCommandLine(*node, result, "getblockchaininfo("));

    // tolerate non command brackts
    (RPCConsole::RPCExecuteCommandLine(*node, result,
                                       "getblockchaininfo()()()"));

    // invalid argument
    QVERIFY_EXCEPTION_THROWN(RPCConsole::RPCExecuteCommandLine(
                                 *node, result, "getblockchaininfo(True)"),
                             UniValue);
    // method not found
    QVERIFY_EXCEPTION_THROWN(RPCConsole::RPCExecuteCommandLine(
                                 *node, result, "a(getblockchaininfo(True))"),
                             UniValue);
    // don't tollerate empty arguments when using ,
    QVERIFY_EXCEPTION_THROWN(RPCConsole::RPCExecuteCommandLine(
                                 *node, result, "rpcNestedTest abc,,abc"),
                             std::runtime_error);
    // don't tollerate empty arguments when using ,
    QVERIFY_EXCEPTION_THROWN(RPCConsole::RPCExecuteCommandLine(
                                 *node, result, "rpcNestedTest(abc,,abc)"),
                             std::runtime_error);
    // don't tollerate empty arguments when using ,
    QVERIFY_EXCEPTION_THROWN(RPCConsole::RPCExecuteCommandLine(
                                 *node, result, "rpcNestedTest(abc,,)"),
                             std::runtime_error);
#endif

    fs::remove_all(fs::path(path));
}
