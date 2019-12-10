// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifdef HAVE_CONFIG_H
#include <config/bitcoin-config.h>
#endif

#include <qt/walletmodeltransaction.h>

#include <interfaces/node.h>
#include <policy/policy.h>

WalletModelTransaction::WalletModelTransaction(
    const QList<SendCoinsRecipient> &_recipients)
    : recipients(_recipients), fee() {}

QList<SendCoinsRecipient> WalletModelTransaction::getRecipients() const {
    return recipients;
}

std::unique_ptr<interfaces::PendingWalletTx> &WalletModelTransaction::getWtx() {
    return wtx;
}

unsigned int WalletModelTransaction::getTransactionSize() {
    return wtx ? wtx->get().GetTotalSize() : 0;
}

Amount WalletModelTransaction::getTransactionFee() const {
    return fee;
}

void WalletModelTransaction::setTransactionFee(const Amount newFee) {
    fee = newFee;
}

void WalletModelTransaction::reassignAmounts(int nChangePosRet) {
    const CTransaction *walletTransaction = &wtx->get();
    int i = 0;
    for (SendCoinsRecipient &rcp : recipients) {
#ifdef ENABLE_BIP70
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
        }

        // normal recipient (no payment request)
        else
#endif
        {
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
