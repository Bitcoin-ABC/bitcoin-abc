// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_QT_OVERVIEWPAGE_H
#define BITCOIN_QT_OVERVIEWPAGE_H

#include "amount.h"
#include "transactionview.h"

#include <QWidget>
#include <memory>

class ClientModel;
class TransactionFilterProxy;
class TxViewDelegate;
class PlatformStyle;
class WalletModel;

namespace Ui {
class OverviewPage;
}

QT_BEGIN_NAMESPACE
class QModelIndex;
QT_END_NAMESPACE

/** Overview ("home") page widget */
class OverviewPage : public QWidget {
    Q_OBJECT

public:
    explicit OverviewPage(const PlatformStyle *platformStyle,
                          QWidget *parent = 0);
    ~OverviewPage();

    void setClientModel(ClientModel *clientModel);
    void setWalletModel(WalletModel *walletModel);
    void showOutOfSyncWarning(bool fShow);
    void showTransactions();
    TransactionView *transactionView;

public Q_SLOTS:
    void setBalance(const Amount balance, const Amount unconfirmedBalance,
                    const Amount immatureBalance, const Amount watchOnlyBalance,
                    const Amount watchUnconfBalance,
                    const Amount watchImmatureBalance);

Q_SIGNALS:
 //   void transactionClicked(const QModelIndex &index);
    void outOfSyncWarningClicked();

private:
    Ui::OverviewPage *ui;
    ClientModel *clientModel;
    WalletModel *walletModel;
    Amount currentBalance;
    Amount currentUnconfirmedBalance;
    Amount currentImmatureBalance;
    Amount currentWatchOnlyBalance;
    Amount currentWatchUnconfBalance;
    Amount currentWatchImmatureBalance;

    TxViewDelegate *txdelegate;
    std::unique_ptr<TransactionFilterProxy> filter;
    bool tranactionsShown;

private Q_SLOTS:
    void updateDisplayUnit();
 //   void handleTransactionClicked(const QModelIndex &index);
    void updateAlerts(const QString &warnings);
    void updateWatchOnlyLabels(bool showWatchOnly);
    void handleOutOfSyncWarningClicks();
};

#endif // BITCOIN_QT_OVERVIEWPAGE_H
