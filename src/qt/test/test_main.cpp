// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#if defined(HAVE_CONFIG_H)
#include "config/bitcoin-config.h"
#endif

#include "compat/setenv.h"

#include "bitcoinaddressvalidatortests.h"
#include "chainparams.h"
#include "compattests.h"
#include "guiutiltests.h"
#include "key.h"
#include "rpcnestedtests.h"
#include "uritests.h"
#include "util.h"

#ifdef ENABLE_WALLET
#include "paymentservertests.h"
#include "wallettests.h"
#endif

#include <QApplication>
#include <QObject>
#include <QTest>

#include <openssl/ssl.h>

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

extern void noui_connect();

// This is all you need to run all the tests
int main(int argc, char *argv[]) {
    SetupEnvironment();
    SetupNetworking();
    SelectParams(CBaseChainParams::MAIN);
    noui_connect();

    bool fInvalid = false;

    // Prefer the "minimal" platform for the test instead of the normal default
    // platform ("xcb", "windows", or "cocoa") so tests can't unintentially
    // interfere with any background GUIs and don't require extra resources.
    setenv("QT_QPA_PLATFORM", "minimal", 0);

    // Don't remove this, it's needed to access
    // QApplication:: and QCoreApplication:: in the tests
    QApplication app(argc, argv);
    app.setApplicationName("BitcoinABC-Qt-test");

    // This is necessary to initialize openssl on the test framework
    // (at least on Darwin).
    SSL_library_init();

    URITests test1;
    if (QTest::qExec(&test1) != 0) {
        fInvalid = true;
    }
#ifdef ENABLE_WALLET
    PaymentServerTests test2;
    if (QTest::qExec(&test2) != 0) {
        fInvalid = true;
    }
#endif
    RPCNestedTests test3;
    if (QTest::qExec(&test3) != 0) {
        fInvalid = true;
    }
    CompatTests test4;
    if (QTest::qExec(&test4) != 0) {
        fInvalid = true;
    }
    GUIUtilTests test5;
    if (QTest::qExec(&test5) != 0) {
        fInvalid = true;
    }
    BitcoinAddressValidatorTests test6;
    if (QTest::qExec(&test6) != 0) {
        fInvalid = true;
    }
#ifdef ENABLE_WALLET
    WalletTests test7;
    if (QTest::qExec(&test7) != 0) {
        fInvalid = true;
    }
#endif

    return fInvalid;
}
