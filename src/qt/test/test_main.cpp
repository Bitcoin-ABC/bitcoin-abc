// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#if defined(HAVE_CONFIG_H)
#include <config/bitcoin-config.h>
#endif

#include <compat/setenv.h>
#include <interfaces/node.h>
#include <key.h>

#include <qt/bitcoin.h>
#include <qt/test/apptests.h>
#include <qt/test/bitcoinaddressvalidatortests.h>
#include <qt/test/compattests.h>
#include <qt/test/guiutiltests.h>
#include <qt/test/optiontests.h>
#include <qt/test/rpcnestedtests.h>
#include <qt/test/uritests.h>
#include <util/chaintype.h>

#ifdef ENABLE_WALLET
#include <qt/test/addressbooktests.h>
#ifdef ENABLE_BIP70
#include <qt/test/paymentservertests.h>
#endif // ENABLE_BIP70
#include <qt/test/wallettests.h>
#endif // ENABLE_WALLET

#include <test/util/setup_common.h>

#include <QApplication>
#include <QDebug>
#include <QObject>
#include <QTest>

#if defined(QT_STATICPLUGIN)
#include <QtPlugin>
#if defined(QT_QPA_PLATFORM_MINIMAL)
Q_IMPORT_PLUGIN(QMinimalIntegrationPlugin);
#endif
#if defined(QT_QPA_PLATFORM_XCB)
Q_IMPORT_PLUGIN(QXcbIntegrationPlugin);
#elif defined(QT_QPA_PLATFORM_WINDOWS)
Q_IMPORT_PLUGIN(QWindowsIntegrationPlugin);
#elif defined(QT_QPA_PLATFORM_COCOA)
Q_IMPORT_PLUGIN(QCocoaIntegrationPlugin);
#endif
#endif

using node::NodeContext;

// This is all you need to run all the tests
int main(int argc, char *argv[]) {
    // Initialize persistent globals with the testing setup state for sanity.
    // E.g. -datadir in gArgs is set to a temp directory dummy value (instead
    // of defaulting to the default datadir), or globalChainParams is set to
    // regtest params.
    //
    // All tests must use their own testing setup (if needed).
    fs::create_directories([] {
        BasicTestingSetup dummy{ChainType::REGTEST};

        // This is extracted from gui#602, please remove this comment after this
        // has been backported.
        return gArgs.GetDataDirNet() / "blocks";
    }());

    NodeContext node_context;
    std::unique_ptr<interfaces::Node> node =
        interfaces::MakeNode(&node_context);

    std::string error;
    if (!gArgs.ReadConfigFiles(error, true)) {
        qWarning() << error.c_str();
    }

    // Prefer the "minimal" platform for the test instead of the normal default
    // platform ("xcb", "windows", or "cocoa") so tests can't unintentionally
    // interfere with any background GUIs and don't require extra resources.
    setenv("QT_QPA_PLATFORM", "minimal", /* overwrite */ 0);

    // Don't remove this, it's needed to access
    // QApplication:: and QCoreApplication:: in the tests
    BitcoinApplication app;
    app.setNode(*node);
    app.setApplicationName("BitcoinABC-Qt-test");

    // Make gArgs available in the NodeContext
    app.node().context()->args = &gArgs;

    int num_test_failures{0};

    AppTests app_tests(app);
    num_test_failures += QTest::qExec(&app_tests);

    OptionTests options_tests(app.node());
    num_test_failures += QTest::qExec(&options_tests);

    URITests test1;
    num_test_failures += QTest::qExec(&test1);

#if defined(ENABLE_WALLET) && defined(ENABLE_BIP70)
    PaymentServerTests test2;
    num_test_failures += QTest::qExec(&test2);
#endif

    RPCNestedTests test3(app.node());
    num_test_failures += QTest::qExec(&test3);

    CompatTests test4;
    num_test_failures += QTest::qExec(&test4);

    GUIUtilTests test5;
    num_test_failures += QTest::qExec(&test5);

    BitcoinAddressValidatorTests test6;
    num_test_failures += QTest::qExec(&test6);

#ifdef ENABLE_WALLET
    WalletTests test7(app.node());
    num_test_failures += QTest::qExec(&test7);

    AddressBookTests test8(app.node());
    num_test_failures += QTest::qExec(&test8);
#endif

    if (num_test_failures) {
        qWarning("\nFailed tests: %d\n", num_test_failures);
    } else {
        qDebug("\nAll tests passed.\n");
    }
    return num_test_failures;
}
