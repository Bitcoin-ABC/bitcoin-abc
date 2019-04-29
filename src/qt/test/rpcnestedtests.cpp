// Copyright (c) 2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "rpcnestedtests.h"

#include "chainparams.h"
#include "config.h"
#include "consensus/validation.h"
#include "fs.h"
#include "rpc/register.h"
#include "rpc/server.h"
#include "rpcconsole.h"
#include "test/test_bitcoin.h"
#include "univalue.h"
#include "util.h"
#include "validation.h"

#include <QDir>
#include <QtGlobal>

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

    // Simple result filtering with path.
    RPCConsole::RPCExecuteCommandLine(result, "getblockchaininfo()[chain]",
                                      &filtered);
    QVERIFY(result == "main");
    QVERIFY(filtered == "getblockchaininfo()[chain]");

    // Simple 2 level nesting.
    RPCConsole::RPCExecuteCommandLine(result, "getblock(getbestblockhash())");
    RPCConsole::RPCExecuteCommandLine(
        result, "getblock(getblock(getbestblockhash())[hash], true)");

    // 4 level nesting with whitespace, filtering path and boolean parameter.
    RPCConsole::RPCExecuteCommandLine(
        result, "getblock( getblock( getblock(getbestblockhash())[hash] "
                ")[hash], true)");

    RPCConsole::RPCExecuteCommandLine(result, "getblockchaininfo");
    QVERIFY(result.substr(0, 1) == "{");

    RPCConsole::RPCExecuteCommandLine(result, "getblockchaininfo()");
    QVERIFY(result.substr(0, 1) == "{");

    // Whitespace at the end will be tolerated.
    RPCConsole::RPCExecuteCommandLine(result, "getblockchaininfo ");
    QVERIFY(result.substr(0, 1) == "{");

    // Quote path identifier are allowed, but look after a child contaning the
    // quotes in the key.
    (RPCConsole::RPCExecuteCommandLine(result,
                                       "getblockchaininfo()[\"chain\"]"));
    QVERIFY(result == "null");

    // parameter not in brackets are allowed.
    (RPCConsole::RPCExecuteCommandLine(result, "createrawtransaction [] {} 0"));
    // Parameter in brackets are allowed.
    (RPCConsole::RPCExecuteCommandLine(result2,
                                       "createrawtransaction([],{},0)"));
    QVERIFY(result == result2);
    // Whitespace between parametres is allowed.
    (RPCConsole::RPCExecuteCommandLine(
        result2, "createrawtransaction( [],  {} , 0   )"));
    QVERIFY(result == result2);

    RPCConsole::RPCExecuteCommandLine(
        result, "getblock(getbestblockhash())[tx][0]", &filtered);
    QVERIFY(result ==
            "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b");
    QVERIFY(filtered == "getblock(getbestblockhash())[tx][0]");

    RPCConsole::RPCParseCommandLine(result, "importprivkey", false, &filtered);
    QVERIFY(filtered == "importprivkey(…)");
    RPCConsole::RPCParseCommandLine(result, "signmessagewithprivkey abc", false,
                                    &filtered);
    QVERIFY(filtered == "signmessagewithprivkey(…)");
    RPCConsole::RPCParseCommandLine(result, "signmessagewithprivkey abc,def",
                                    false, &filtered);
    QVERIFY(filtered == "signmessagewithprivkey(…)");
    RPCConsole::RPCParseCommandLine(result, "signrawtransactionwithkey(abc)",
                                    false, &filtered);
    QVERIFY(filtered == "signrawtransactionwithkey(…)");
    RPCConsole::RPCParseCommandLine(result, "walletpassphrase(help())", false,
                                    &filtered);
    QVERIFY(filtered == "walletpassphrase(…)");
    RPCConsole::RPCParseCommandLine(
        result, "walletpassphrasechange(help(walletpassphrasechange(abc)))",
        false, &filtered);
    QVERIFY(filtered == "walletpassphrasechange(…)");
    RPCConsole::RPCParseCommandLine(result, "help(encryptwallet(abc, def))",
                                    false, &filtered);
    QVERIFY(filtered == "help(encryptwallet(…))");
    RPCConsole::RPCParseCommandLine(result, "help(importprivkey())", false,
                                    &filtered);
    QVERIFY(filtered == "help(importprivkey(…))");
    RPCConsole::RPCParseCommandLine(result, "help(importprivkey(help()))",
                                    false, &filtered);
    QVERIFY(filtered == "help(importprivkey(…))");
    RPCConsole::RPCParseCommandLine(
        result, "help(importprivkey(abc), walletpassphrase(def))", false,
        &filtered);
    QVERIFY(filtered == "help(importprivkey(…), walletpassphrase(…))");

    RPCConsole::RPCExecuteCommandLine(result, "rpcNestedTest");
    QVERIFY(result == "[]");
    RPCConsole::RPCExecuteCommandLine(result, "rpcNestedTest ''");
    QVERIFY(result == "[\"\"]");
    RPCConsole::RPCExecuteCommandLine(result, "rpcNestedTest \"\"");
    QVERIFY(result == "[\"\"]");
    RPCConsole::RPCExecuteCommandLine(result, "rpcNestedTest '' abc");
    QVERIFY(result == "[\"\",\"abc\"]");
    RPCConsole::RPCExecuteCommandLine(result, "rpcNestedTest abc '' abc");
    QVERIFY(result == "[\"abc\",\"\",\"abc\"]");
    RPCConsole::RPCExecuteCommandLine(result, "rpcNestedTest abc  abc");
    QVERIFY(result == "[\"abc\",\"abc\"]");
    RPCConsole::RPCExecuteCommandLine(result, "rpcNestedTest abc\t\tabc");
    QVERIFY(result == "[\"abc\",\"abc\"]");
    RPCConsole::RPCExecuteCommandLine(result, "rpcNestedTest(abc )");
    QVERIFY(result == "[\"abc\"]");
    RPCConsole::RPCExecuteCommandLine(result, "rpcNestedTest( abc )");
    QVERIFY(result == "[\"abc\"]");
    RPCConsole::RPCExecuteCommandLine(result,
                                      "rpcNestedTest(   abc   ,   cba )");
    QVERIFY(result == "[\"abc\",\"cba\"]");

#if QT_VERSION >= 0x050300
    // do the QVERIFY_EXCEPTION_THROWN checks only with Qt5.3 and higher
    // (QVERIFY_EXCEPTION_THROWN was introduced in Qt5.3)

    // invalid syntax
    QVERIFY_EXCEPTION_THROWN(
        RPCConsole::RPCExecuteCommandLine(result, "getblockchaininfo() .\n"),
        std::runtime_error);

    // invalid syntax
    QVERIFY_EXCEPTION_THROWN(
        RPCConsole::RPCExecuteCommandLine(
            result, "getblockchaininfo() getblockchaininfo()"),
        std::runtime_error);
    // tolerate non closing brackets if we have no arguments.
    (RPCConsole::RPCExecuteCommandLine(result, "getblockchaininfo("));

    // tolerate non command brackts
    (RPCConsole::RPCExecuteCommandLine(result, "getblockchaininfo()()()"));

    // invalid argument
    QVERIFY_EXCEPTION_THROWN(
        RPCConsole::RPCExecuteCommandLine(result, "getblockchaininfo(True)"),
        UniValue);
    // method not found
    QVERIFY_EXCEPTION_THROWN(
        RPCConsole::RPCExecuteCommandLine(result, "a(getblockchaininfo(True))"),
        UniValue);
    // don't tollerate empty arguments when using ,
    QVERIFY_EXCEPTION_THROWN(
        RPCConsole::RPCExecuteCommandLine(result, "rpcNestedTest abc,,abc"),
        std::runtime_error);
    // don't tollerate empty arguments when using ,
    QVERIFY_EXCEPTION_THROWN(
        RPCConsole::RPCExecuteCommandLine(result, "rpcNestedTest(abc,,abc)"),
        std::runtime_error);
    // don't tollerate empty arguments when using ,
    QVERIFY_EXCEPTION_THROWN(
        RPCConsole::RPCExecuteCommandLine(result, "rpcNestedTest(abc,,)"),
        std::runtime_error);
#endif

    fs::remove_all(fs::path(path));
}
