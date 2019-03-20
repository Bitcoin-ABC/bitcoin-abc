// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "overviewpage.h"
#include "ui_overviewpage.h"

#include "bitcoinunits.h"
#include "clientmodel.h"
#include "guiconstants.h"
#include "guiutil.h"
#include "optionsmodel.h"
#include "platformstyle.h"
#include "transactionfilterproxy.h"
#include "transactiontablemodel.h"
#include "walletmodel.h"
#include "bitcoingui.h"

#include <QAbstractItemDelegate>
#include <QDesktopServices>
#include <QPainter>
#include <QUrl>

#define DECORATION_SIZE 54
#define NUM_ITEMS 5

class TxViewDelegate : public QAbstractItemDelegate {
    Q_OBJECT
public:
    explicit TxViewDelegate(const PlatformStyle *_platformStyle,
                            QObject *parent = nullptr)
        : QAbstractItemDelegate(parent), unit(BitcoinUnits::DVT),
          platformStyle(_platformStyle) {}

    inline void paint(QPainter *painter, const QStyleOptionViewItem &option,
                      const QModelIndex &index) const {
        painter->save();

        QIcon icon = qvariant_cast<QIcon>(
            index.data(TransactionTableModel::RawDecorationRole));
        QRect mainRect = option.rect;
        QRect decorationRect(mainRect.topLeft(),
                             QSize(DECORATION_SIZE, DECORATION_SIZE));
        int xspace = DECORATION_SIZE + 8;
        int ypad = 6;
        int halfheight = (mainRect.height() - 2 * ypad) / 2;
        QRect amountRect(mainRect.left() + xspace, mainRect.top() + ypad,
                         mainRect.width() - xspace, halfheight);
        QRect addressRect(mainRect.left() + xspace,
                          mainRect.top() + ypad + halfheight,
                          mainRect.width() - xspace, halfheight);
        icon = platformStyle->SingleColorIcon(icon);
        icon.paint(painter, decorationRect);

        QDateTime date =
            index.data(TransactionTableModel::DateRole).toDateTime();
        QString address = index.data(Qt::DisplayRole).toString();
        Amount amount(
            int64_t(
                index.data(TransactionTableModel::AmountRole).toLongLong()) *
            SATOSHI);
        bool confirmed =
            index.data(TransactionTableModel::ConfirmedRole).toBool();
        QVariant value = index.data(Qt::ForegroundRole);
        QColor foreground = option.palette.color(QPalette::Text);
        if (value.canConvert<QBrush>()) {
            QBrush brush = qvariant_cast<QBrush>(value);
            foreground = brush.color();
        }

        painter->setPen(foreground);
        QRect boundingRect;
        painter->drawText(addressRect, Qt::AlignLeft | Qt::AlignVCenter,
                          address, &boundingRect);

        if (index.data(TransactionTableModel::WatchonlyRole).toBool()) {
            QIcon iconWatchonly = qvariant_cast<QIcon>(
                index.data(TransactionTableModel::WatchonlyDecorationRole));
            QRect watchonlyRect(boundingRect.right() + 5,
                                mainRect.top() + ypad + halfheight, 16,
                                halfheight);
            iconWatchonly.paint(painter, watchonlyRect);
        }

        if (amount < Amount::zero()) {
            foreground = COLOR_NEGATIVE;
        } else if (!confirmed) {
            foreground = COLOR_UNCONFIRMED;
        } else {
            foreground = option.palette.color(QPalette::Text);
        }
        painter->setPen(foreground);
        QString amountText = BitcoinUnits::formatWithUnit(
            unit, amount, true, BitcoinUnits::separatorAlways);
        if (!confirmed) {
            amountText = QString("[") + amountText + QString("]");
        }
        painter->drawText(amountRect, Qt::AlignRight | Qt::AlignVCenter,
                          amountText);

        painter->setPen(option.palette.color(QPalette::Text));
        painter->drawText(amountRect, Qt::AlignLeft | Qt::AlignVCenter,
                          GUIUtil::dateTimeStr(date));

        painter->restore();
    }

    inline QSize sizeHint(const QStyleOptionViewItem &option,
                          const QModelIndex &index) const {
        return QSize(DECORATION_SIZE, DECORATION_SIZE);
    }

    int unit;
    const PlatformStyle *platformStyle;
};

#include "overviewpage.moc"

OverviewPage::OverviewPage(const PlatformStyle *platformStyle, QWidget *parent)
    : QWidget(parent), ui(new Ui::OverviewPage), clientModel(0), walletModel(0),
      currentBalance(-SATOSHI), currentUnconfirmedBalance(-SATOSHI),
      currentImmatureBalance(-SATOSHI), currentWatchOnlyBalance(-SATOSHI),
      currentWatchUnconfBalance(-SATOSHI),
      currentWatchImmatureBalance(-SATOSHI),
      txdelegate(new TxViewDelegate(platformStyle, this)) {
    ui->setupUi(this);

    // use a SingleColorIcon for the "out of sync warning" icon
    QIcon icon = platformStyle->SingleColorIcon(":/icons/warning");
    icon.addPixmap(icon.pixmap(QSize(64, 64), QIcon::Normal), QIcon::Disabled); // also set the disabled icon because we are using a disabled QPushButton to work around missing HiDPI support of QLabel (https://bugreports.qt.io/browse/QTBUG-42503)
    //ui->labelTransactionsStatus->setIcon(icon);
    ui->labelWalletStatus1->setIcon(icon);
    ui->labelWalletStatus2->setIcon(icon);
    ui->labelWalletStatus3->setIcon(icon);
    ui->labelWalletStatus4->setIcon(icon);
    ui->labelWalletStatus5->setIcon(icon);
    ui->labelWalletStatus6->setIcon(icon);
    ui->labelWalletStatus7->setIcon(icon);
    ui->labelWalletStatus8->setIcon(icon);
    ui->labelWalletStatus9->setIcon(icon);

    // Recent transactions
    transactionView = new TransactionView(platformStyle, NULL);
    //ui->transactionFrame->setVisible(true);
    ui->transactionLayout->addWidget(transactionView);
    //ui->transactionLayout->setSizePolicy(QSizePolicy::Ignored, QSizePolicy::Expanding);

    transactionView->setSizePolicy(QSizePolicy::Ignored, QSizePolicy::Expanding);
    transactionView->setMaximumHeight(123456);
    ui->transactionFrame->setSizePolicy(QSizePolicy::Ignored, QSizePolicy::Expanding);
    ui->transactionFrame->setMaximumHeight(123456);

    // start with displaying the "out of sync" warnings
    showOutOfSyncWarning(true);
    connect(ui->labelWalletStatus1, SIGNAL(clicked()), this, SLOT(handleOutOfSyncWarningClicks()));
    connect(ui->labelWalletStatus2, SIGNAL(clicked()), this, SLOT(handleOutOfSyncWarningClicks()));
    connect(ui->labelWalletStatus3, SIGNAL(clicked()), this, SLOT(handleOutOfSyncWarningClicks()));
    connect(ui->labelWalletStatus4, SIGNAL(clicked()), this, SLOT(handleOutOfSyncWarningClicks()));
    connect(ui->labelWalletStatus5, SIGNAL(clicked()), this, SLOT(handleOutOfSyncWarningClicks()));
    connect(ui->labelWalletStatus6, SIGNAL(clicked()), this, SLOT(handleOutOfSyncWarningClicks()));
    connect(ui->labelWalletStatus7, SIGNAL(clicked()), this, SLOT(handleOutOfSyncWarningClicks()));
    connect(ui->labelWalletStatus8, SIGNAL(clicked()), this, SLOT(handleOutOfSyncWarningClicks()));
    connect(ui->labelWalletStatus9, SIGNAL(clicked()), this, SLOT(handleOutOfSyncWarningClicks()));

}

void OverviewPage::showTransactions(){
    ui->transactionFrame->setVisible(true);

}

void OverviewPage::handleOutOfSyncWarningClicks() {
    Q_EMIT outOfSyncWarningClicked();
}

OverviewPage::~OverviewPage() {
    delete ui;
}

void OverviewPage::setBalance(const Amount balance,
                              const Amount unconfirmedBalance,
                              const Amount immatureBalance,
                              const Amount watchOnlyBalance,
                              const Amount watchUnconfBalance,
                              const Amount watchImmatureBalance) {
    int unit = walletModel->getOptionsModel()->getDisplayUnit();
    currentBalance = balance;
    currentUnconfirmedBalance = unconfirmedBalance;
    currentImmatureBalance = immatureBalance;
    currentWatchOnlyBalance = watchOnlyBalance;
    currentWatchUnconfBalance = watchUnconfBalance;
    currentWatchImmatureBalance = watchImmatureBalance;
    ui->labelBalance->setText(BitcoinUnits::formatWithUnit(
        unit, balance, false, BitcoinUnits::separatorAlways));
    ui->labelUnconfirmed->setText(BitcoinUnits::formatWithUnit(
        unit, unconfirmedBalance, false, BitcoinUnits::separatorAlways));
    ui->labelImmature->setText(BitcoinUnits::formatWithUnit(
        unit, immatureBalance, false, BitcoinUnits::separatorAlways));
    ui->labelTotal->setText(BitcoinUnits::formatWithUnit(
        unit, balance + unconfirmedBalance + immatureBalance, false,
        BitcoinUnits::separatorAlways));
    ui->labelWatchAvailable->setText(BitcoinUnits::formatWithUnit(
        unit, watchOnlyBalance, false, BitcoinUnits::separatorAlways));
    ui->labelWatchPending->setText(BitcoinUnits::formatWithUnit(
        unit, watchUnconfBalance, false, BitcoinUnits::separatorAlways));
    ui->labelWatchImmature->setText(BitcoinUnits::formatWithUnit(
        unit, watchImmatureBalance, false, BitcoinUnits::separatorAlways));
    ui->labelWatchTotal->setText(BitcoinUnits::formatWithUnit(
        unit, watchOnlyBalance + watchUnconfBalance + watchImmatureBalance,
        false, BitcoinUnits::separatorAlways));

    // only show immature (newly mined) balance if it's non-zero, so as not to
    // complicate things
    // for the non-mining users
    bool showImmature = immatureBalance != Amount::zero();
    bool showWatchOnlyImmature = watchImmatureBalance != Amount::zero();

    // for symmetry reasons also show immature label when the watch-only one is
    // shown
    ui->immature->setVisible(showImmature || showWatchOnlyImmature);
    ui->watchImmature->setVisible(showImmature || showWatchOnlyImmature);
}

// show/hide watch-only labels
void OverviewPage::updateWatchOnlyLabels(bool showWatchOnly) {
    ui->watchOnly->setVisible(showWatchOnly);
}

void OverviewPage::setClientModel(ClientModel *model) {
    this->clientModel = model;
    if (model) {
        // Show warning if this is a prerelease version
        connect(model, SIGNAL(alertsChanged(QString)), this,
                SLOT(updateAlerts(QString)));
        updateAlerts(model->getStatusBarWarnings());
    }
}

void OverviewPage::setWalletModel(WalletModel *model) {
    this->walletModel = model;
    transactionView->setModel(model);
    if (model && model->getOptionsModel()) {
        // Set up transaction list
        filter.reset(new TransactionFilterProxy());
        filter->setSourceModel(model->getTransactionTableModel());
        filter->setLimit(NUM_ITEMS);
        filter->setDynamicSortFilter(true);
        filter->setSortRole(Qt::EditRole);
        filter->setShowInactive(false);
        filter->sort(TransactionTableModel::Date, Qt::DescendingOrder);

   //     ui->listTransactions->setModel(filter.get());
     //   ui->listTransactions->setModelColumn(TransactionTableModel::ToAddress);

        // Keep up to date with wallet
        setBalance(model->getBalance(), model->getUnconfirmedBalance(),
                   model->getImmatureBalance(), model->getWatchBalance(),
                   model->getWatchUnconfirmedBalance(),
                   model->getWatchImmatureBalance());
        connect(
            model,
            SIGNAL(
                balanceChanged(Amount, Amount, Amount, Amount, Amount, Amount)),
            this,
            SLOT(setBalance(Amount, Amount, Amount, Amount, Amount, Amount)));

        connect(model->getOptionsModel(), SIGNAL(displayUnitChanged(int)), this,
                SLOT(updateDisplayUnit()));

        updateWatchOnlyLabels(model->haveWatchOnly());
        connect(model, SIGNAL(notifyWatchonlyChanged(bool)), this,
                SLOT(updateWatchOnlyLabels(bool)));
    }

    // update the display unit, to not use the default ("DVT")
    updateDisplayUnit();
}

void OverviewPage::updateDisplayUnit() {
    if (walletModel && walletModel->getOptionsModel()) {
        if (currentBalance != -SATOSHI) {
            setBalance(currentBalance, currentUnconfirmedBalance,
                       currentImmatureBalance, currentWatchOnlyBalance,
                       currentWatchUnconfBalance, currentWatchImmatureBalance);
        }

        // Update txdelegate->unit with the current unit
        txdelegate->unit = walletModel->getOptionsModel()->getDisplayUnit();

  //      ui->listTransactions->update();
    }
}

void OverviewPage::updateAlerts(const QString &warnings) {
    this->ui->labelAlerts->setVisible(!warnings.isEmpty());
    this->ui->labelAlerts->setText(warnings);
}

void OverviewPage::showOutOfSyncWarning(bool fShow) {
    ui->labelWalletStatus1->setVisible(fShow);
    ui->labelWalletStatus2->setVisible(fShow);
    ui->labelWalletStatus3->setVisible(fShow);
    ui->labelWalletStatus4->setVisible(fShow);
    ui->labelWalletStatus5->setVisible(fShow);
    ui->labelWalletStatus6->setVisible(fShow);
    ui->labelWalletStatus7->setVisible(fShow);
    ui->labelWalletStatus8->setVisible(fShow);
    ui->labelWalletStatus9->setVisible(fShow);
}
