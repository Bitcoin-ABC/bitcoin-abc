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

#include <amount.h>
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

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        std::string sAddress = address.toStdString();
        std::string sLabel = label.toStdString();
        std::string sMessage = message.toStdString();
#ifdef ENABLE_BIP70
        std::string sPaymentRequest;
        if (!ser_action.ForRead() && paymentRequest.IsInitialized()) {
            paymentRequest.SerializeToString(&sPaymentRequest);
        }
#endif

        std::string sAuthenticatedMerchant =
            authenticatedMerchant.toStdString();

        READWRITE(this->nVersion);
        READWRITE(sAddress);
        READWRITE(sLabel);
        READWRITE(amount);
        READWRITE(sMessage);
        READWRITE(sPaymentRequest);
        READWRITE(sAuthenticatedMerchant);

        if (ser_action.ForRead()) {
            address = QString::fromStdString(sAddress);
            label = QString::fromStdString(sLabel);
            message = QString::fromStdString(sMessage);
#ifdef ENABLE_BIP70
            if (!sPaymentRequest.empty()) {
                paymentRequest.parse(QByteArray::fromRawData(
                    sPaymentRequest.data(), sPaymentRequest.size()));
            }
#endif

            authenticatedMerchant =
                QString::fromStdString(sAuthenticatedMerchant);
        }
    }
};

#endif // BITCOIN_QT_SENDCOINSRECIPIENT_H
