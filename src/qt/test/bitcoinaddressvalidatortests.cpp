// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <qt/bitcoinaddressvalidator.h>
#include <qt/test/bitcoinaddressvalidatortests.h>

#include <chainparams.h>
#include <util/system.h>

#include <QValidator>

void BitcoinAddressValidatorTests::inputTests() {
    const auto params =
        CreateChainParams(ArgsManager{}, CBaseChainParams::MAIN);
    const std::string prefix = params->CashAddrPrefix();
    BitcoinAddressEntryValidator v(prefix, nullptr);

    int unused = 0;
    QString in;

    // Empty string is intermediate.
    in = "";
    QVERIFY(v.validate(in, unused) == QValidator::Intermediate);

    // invalid base58 because of I, invalid cashaddr, currently considered valid
    // anyway.
    in = "ICASH";
    QVERIFY(v.validate(in, unused) == QValidator::Acceptable);

    // invalid base58, invalid cashaddr, currently considered valid anyway.
    in = "EOASH";
    QVERIFY(v.validate(in, unused) == QValidator::Acceptable);

    // invalid base58 because of I, but could be a cashaddr prefix
    in = "ECASI";
    QVERIFY(v.validate(in, unused) == QValidator::Acceptable);

    // invalid base58, valid cashaddr
    in = "ECASH:OP";
    QVERIFY(v.validate(in, unused) == QValidator::Acceptable);

    // invalid base58, valid cashaddr, lower case
    in = "ecash:op";
    QVERIFY(v.validate(in, unused) == QValidator::Acceptable);

    // invalid base58, valid cashaddr, mixed case
    in = "eCash:Op";
    QVERIFY(v.validate(in, unused) == QValidator::Acceptable);

    // valid base58, invalid cash
    in = "EEEEEEEEEEEEEE";
    QVERIFY(v.validate(in, unused) == QValidator::Acceptable);

    // Only alphanumeric chars are accepted.
    in = "%";
    QVERIFY(v.validate(in, unused) == QValidator::Invalid);
}
