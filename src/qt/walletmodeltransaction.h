// Copyright (c) 2011-2014 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_QT_WALLETMODELTRANSACTION_H
#define BITCOIN_QT_WALLETMODELTRANSACTION_H

#include <primitives/transaction.h>
#include <qt/sendcoinsrecipient.h>

#include <amount.h>

#include <QObject>

class SendCoinsRecipient;

namespace interfaces {
class Node;
} // namespace interfaces

/** Data model for a walletmodel transaction. */
class WalletModelTransaction {
public:
    explicit WalletModelTransaction(
        const QList<SendCoinsRecipient> &recipients);

    QList<SendCoinsRecipient> getRecipients() const;

    CTransactionRef &getWtx();
    unsigned int getTransactionSize();

    void setTransactionFee(const Amount newFee);
    Amount getTransactionFee() const;

    Amount getTotalTransactionAmount() const;

    // needed for the subtract-fee-from-amount feature
    void reassignAmounts(int nChangePosRet);

private:
    QList<SendCoinsRecipient> recipients;
    CTransactionRef wtx;
    Amount fee;
};

#endif // BITCOIN_QT_WALLETMODELTRANSACTION_H
