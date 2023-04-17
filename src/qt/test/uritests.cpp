// Copyright (c) 2009-2014 The Bitcoin Core developers
// Copyright (c) 2017-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <qt/test/uritests.h>

#include <chainparams.h>
#include <common/args.h>
#include <config.h>
#include <qt/guiutil.h>
#include <qt/walletmodel.h>
#include <util/chaintype.h>

#include <QUrl>

void URITests::uriTestsCashAddr() {
    const auto params = CreateChainParams(ArgsManager{}, ChainType::MAIN);

    SendCoinsRecipient rv;
    QUrl uri;
    QString scheme = QString::fromStdString(params->CashAddrPrefix());
    uri.setUrl(QString("ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2?"
                       "req-dontexist="));
    QVERIFY(!GUIUtil::parseBitcoinURI(scheme, uri, &rv));

    uri.setUrl(
        QString("ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2?dontexist="));
    QVERIFY(GUIUtil::parseBitcoinURI(scheme, uri, &rv));
    QVERIFY(rv.address ==
            QString("ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2"));
    QVERIFY(rv.label == QString());
    QVERIFY(rv.amount == Amount::zero());

    uri.setUrl(QString("ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2?label="
                       "Wikipedia Example Address"));
    QVERIFY(GUIUtil::parseBitcoinURI(scheme, uri, &rv));
    QVERIFY(rv.address ==
            QString("ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2"));
    QVERIFY(rv.label == QString("Wikipedia Example Address"));
    QVERIFY(rv.amount == Amount::zero());

    uri.setUrl(QString(
        "ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2?amount=0.01"));
    QVERIFY(GUIUtil::parseBitcoinURI(scheme, uri, &rv));
    QVERIFY(rv.address ==
            QString("ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2"));
    QVERIFY(rv.label == QString());
    QVERIFY(rv.amount == SATOSHI);

    uri.setUrl(QString(
        "ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2?amount=10.01"));
    QVERIFY(GUIUtil::parseBitcoinURI(scheme, uri, &rv));
    QVERIFY(rv.address ==
            QString("ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2"));
    QVERIFY(rv.label == QString());
    QVERIFY(rv.amount == 1001 * SATOSHI);

    uri.setUrl(
        QString("ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2?amount=100&"
                "label=Wikipedia Example"));
    QVERIFY(GUIUtil::parseBitcoinURI(scheme, uri, &rv));
    QVERIFY(rv.address ==
            QString("ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2"));
    QVERIFY(rv.amount == 10000 * SATOSHI);
    QVERIFY(rv.label == QString("Wikipedia Example"));

    uri.setUrl(
        QString("ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2?message="
                "Wikipedia Example Address"));
    QVERIFY(GUIUtil::parseBitcoinURI(scheme, uri, &rv));
    QVERIFY(rv.address ==
            QString("ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2"));
    QVERIFY(rv.label == QString());

    QVERIFY(
        GUIUtil::parseBitcoinURI(scheme,
                                 "ecash://"
                                 "qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2?"
                                 "message=Wikipedia Example Address",
                                 &rv));
    QVERIFY(rv.address ==
            QString("ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2"));
    QVERIFY(rv.label == QString());

    uri.setUrl(
        QString("ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2?req-message="
                "Wikipedia Example Address"));
    QVERIFY(GUIUtil::parseBitcoinURI(scheme, uri, &rv));

    uri.setUrl(
        QString("ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2?amount=1,"
                "000&label=Wikipedia Example"));
    QVERIFY(!GUIUtil::parseBitcoinURI(scheme, uri, &rv));

    uri.setUrl(
        QString("ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2?amount=1,"
                "000.0&label=Wikipedia Example"));
    QVERIFY(!GUIUtil::parseBitcoinURI(scheme, uri, &rv));
}

void URITests::uriTestFormatURI() {
    const auto params = CreateChainParams(ArgsManager{}, ChainType::MAIN);

    {
        SendCoinsRecipient r;
        r.address = "ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2";
        r.message = "test";
        QString uri = GUIUtil::formatBitcoinURI(*params, r);
        QVERIFY(uri == "ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2?"
                       "message=test");
    }

    {
        // Garbage goes through (address checksum is invalid)
        SendCoinsRecipient r;
        r.address = "175tWpb8K1S7NmH4Zx6rewF9WQrcZv245W";
        r.message = "test";
        QString uri = GUIUtil::formatBitcoinURI(*params, r);
        QVERIFY(uri == "175tWpb8K1S7NmH4Zx6rewF9WQrcZv245W?message=test");
    }

    {
        // Legacy addresses are converted.
        SendCoinsRecipient r;
        r.address = "12c6DSiU4Rq3P4ZxziKxzrL5LmMBrzjrJX";
        r.message = "test";
        QString uri = GUIUtil::formatBitcoinURI(*params, r);
        QVERIFY(uri == "ecash:qqgekzvw96vq5g57zwdfa5q6g609rrn0yccu9hrtvr?"
                       "message=test");
    }
}
