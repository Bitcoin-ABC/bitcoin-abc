// Copyright (c) 2011-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_QT_SENDCOINSRECIPIENT_H
#define BITCOIN_QT_SENDCOINSRECIPIENT_H

#if defined(HAVE_CONFIG_H)
#include <config/bitcoin-config.h>
#endif

#ifdef ENABLE_BIP70
#include <qt/paymentrequestplus.h>
#endif

#include <consensus/amount.h>
#include <serialize.h>

#include <string>

#include <QString>

class SendCoinsRecipient {
public:
    explicit SendCoinsRecipient()
        : amount(), fSubtractFeeFromAmount(false),
          nVersion(SendCoinsRecipient::CURRENT_VERSION) {}
    explicit SendCoinsRecipient(const QString &addr, const QString &_label,
                                const Amount _amount, const QString &_message)
        : address(addr), label(_label), amount(_amount), message(_message),
          fSubtractFeeFromAmount(false),
          nVersion(SendCoinsRecipient::CURRENT_VERSION) {}

    // If from an unauthenticated payment request, this is used for storing the
    // addresses, e.g. address-A<br />address-B<br />address-C.
    // Info: As we don't need to process addresses in here when using payment
    // requests, we can abuse it for displaying an address list.
    // TOFO: This is a hack, should be replaced with a cleaner solution!
    QString address;
    QString label;
    Amount amount;
    // If from a payment request, this is used for storing the memo
    QString message;

#ifdef ENABLE_BIP70
    // If from a payment request, paymentRequest.IsInitialized() will be true
    PaymentRequestPlus paymentRequest;
#else
    // If building with BIP70 is disabled, keep the payment request around as
    // serialized string to ensure load/store is lossless
    std::string sPaymentRequest;
#endif
    // Empty if no authentication or invalid signature/cert/etc.
    QString authenticatedMerchant;

    // memory only
    bool fSubtractFeeFromAmount;

    static const int CURRENT_VERSION = 1;
    int nVersion;

    SERIALIZE_METHODS(SendCoinsRecipient, obj) {
        std::string address_str, label_str, message_str, auth_merchant_str;
        std::string payment_request_str;

        SER_WRITE(obj, address_str = obj.address.toStdString());
        SER_WRITE(obj, label_str = obj.label.toStdString());
        SER_WRITE(obj, message_str = obj.message.toStdString());
#ifdef ENABLE_BIP70
        if (obj.paymentRequest.IsInitialized()) {
            SER_WRITE(obj, obj.paymentRequest.SerializeToString(
                               &payment_request_str));
        }
#else
        SER_WRITE(obj, payment_request_str = obj.sPaymentRequest);
#endif
        SER_WRITE(obj,
                  auth_merchant_str = obj.authenticatedMerchant.toStdString());

        READWRITE(obj.nVersion, address_str, label_str, obj.amount, message_str,
                  payment_request_str, auth_merchant_str);

        SER_READ(obj, obj.address = QString::fromStdString(address_str));
        SER_READ(obj, obj.label = QString::fromStdString(label_str));
        SER_READ(obj, obj.message = QString::fromStdString(message_str));
#ifdef ENABLE_BIP70
        if (!payment_request_str.empty()) {
            SER_READ(obj, obj.paymentRequest.parse(QByteArray::fromRawData(
                              payment_request_str.data(),
                              payment_request_str.size())));
        }
#else
        SER_READ(obj, obj.sPaymentRequest = payment_request_str);
#endif
        SER_READ(obj, obj.authenticatedMerchant =
                          QString::fromStdString(auth_merchant_str));
    }
};

#endif // BITCOIN_QT_SENDCOINSRECIPIENT_H
