// Copyright (c) 2009-2015 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_QT_TEST_URITESTS_H
#define BITCOIN_QT_TEST_URITESTS_H

#include <QObject>
#include <QTest>

class URITests : public QObject {
    Q_OBJECT

private Q_SLOTS:
    void uriTestsBase58();
    void uriTestsCashAddr();
    void uriTestFormatURI();
    void uriTestScheme();
};

#endif // BITCOIN_QT_TEST_URITESTS_H
