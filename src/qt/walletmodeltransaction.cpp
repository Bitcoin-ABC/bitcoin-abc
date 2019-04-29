// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "walletmodeltransaction.h"

#include "policy/policy.h"
#include "wallet/wallet.h"

WalletModelTransaction::WalletModelTransaction(
    const QList<SendCoinsRecipient> &_recipients)
    : recipients(_recipients), walletTransaction(0), fee() {}

QList<SendCoinsRecipient> WalletModelTransaction::getRecipients() const {
    return recipients;
}

CTransactionRef &WalletModelTransaction::getTransaction() {
    return walletTransaction;
}

unsigned int WalletModelTransaction::getTransactionSize() {
    return !walletTransaction ? 0
                              : CTransaction(*walletTransaction).GetTotalSize();
}

Amount WalletModelTransaction::getTransactionFee() const {
    return fee;
}

void WalletModelTransaction::setTransactionFee(const Amount newFee) {
    fee = newFee;
}

void WalletModelTransaction::reassignAmounts(int nChangePosRet) {
    int i = 0;
    for (SendCoinsRecipient &rcp : recipients) {
        if (rcp.paymentRequest.IsInitialized()) {
            Amount subtotal = Amount::zero();
            const payments::PaymentDetails &details =
                rcp.paymentRequest.getDetails();
            for (int j = 0; j < details.outputs_size(); j++) {
                const payments::Output &out = details.outputs(j);
                if (out.amount() <= 0) {
                    continue;
                }

                if (i == nChangePosRet) {
                    i++;
                }

                subtotal += walletTransaction->vout[i].nValue;
                i++;
            }
            rcp.amount = subtotal;
        } else {
            // normal recipient (no payment request)
            if (i == nChangePosRet) {
                i++;
            }

            rcp.amount = walletTransaction->vout[i].nValue;
            i++;
        }
    }
}

Amount WalletModelTransaction::getTotalTransactionAmount() const {
    Amount totalTransactionAmount = Amount::zero();
    for (const SendCoinsRecipient &rcp : recipients) {
        totalTransactionAmount += rcp.amount;
    }
    return totalTransactionAmount;
}

void WalletModelTransaction::newPossibleKeyChange(CWallet *wallet) {
    keyChange.reset(new CReserveKey(wallet));
}

CReserveKey *WalletModelTransaction::getPossibleKeyChange() {
    return keyChange.get();
}
