// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <qt/coincontroldialog.h>
#include <qt/forms/ui_coincontroldialog.h>

#include <dstencode.h>
#include <interfaces/node.h>
#include <policy/policy.h>
#include <qt/addresstablemodel.h>
#include <qt/bitcoinunits.h>
#include <qt/guiutil.h>
#include <qt/optionsmodel.h>
#include <qt/platformstyle.h>
#include <qt/walletmodel.h>
#include <txmempool.h>
#include <validation.h> // For mempool
#include <wallet/coincontrol.h>
#include <wallet/fees.h>
#include <wallet/wallet.h>

#include <QApplication>
#include <QCheckBox>
#include <QCursor>
#include <QDialogButtonBox>
#include <QFlags>
#include <QIcon>
#include <QSettings>
#include <QString>
#include <QTreeWidget>
#include <QTreeWidgetItem>

QList<Amount> CoinControlDialog::payAmounts;
bool CoinControlDialog::fSubtractFeeFromAmount = false;

bool CCoinControlWidgetItem::operator<(const QTreeWidgetItem &other) const {
    int column = treeWidget()->sortColumn();
    if (column == CoinControlDialog::COLUMN_AMOUNT ||
        column == CoinControlDialog::COLUMN_DATE ||
        column == CoinControlDialog::COLUMN_CONFIRMATIONS)
        return data(column, Qt::UserRole).toLongLong() <
               other.data(column, Qt::UserRole).toLongLong();
    return QTreeWidgetItem::operator<(other);
}

CoinControlDialog::CoinControlDialog(const PlatformStyle *_platformStyle,
                                     QWidget *parent)
    : QDialog(parent), ui(new Ui::CoinControlDialog), model(0),
      platformStyle(_platformStyle) {
    ui->setupUi(this);

    // context menu actions
    QAction *copyAddressAction = new QAction(tr("Copy address"), this);
    QAction *copyLabelAction = new QAction(tr("Copy label"), this);
    QAction *copyAmountAction = new QAction(tr("Copy amount"), this);
    // we need to enable/disable this
    copyTransactionHashAction = new QAction(tr("Copy transaction ID"), this);
    // we need to enable/disable this
    lockAction = new QAction(tr("Lock unspent"), this);
    // we need to enable/disable this
    unlockAction = new QAction(tr("Unlock unspent"), this);

    // context menu
    contextMenu = new QMenu(this);
    contextMenu->addAction(copyAddressAction);
    contextMenu->addAction(copyLabelAction);
    contextMenu->addAction(copyAmountAction);
    contextMenu->addAction(copyTransactionHashAction);
    contextMenu->addSeparator();
    contextMenu->addAction(lockAction);
    contextMenu->addAction(unlockAction);

    // context menu signals
    connect(ui->treeWidget, SIGNAL(customContextMenuRequested(QPoint)), this,
            SLOT(showMenu(QPoint)));
    connect(copyAddressAction, SIGNAL(triggered()), this, SLOT(copyAddress()));
    connect(copyLabelAction, SIGNAL(triggered()), this, SLOT(copyLabel()));
    connect(copyAmountAction, SIGNAL(triggered()), this, SLOT(copyAmount()));
    connect(copyTransactionHashAction, SIGNAL(triggered()), this,
            SLOT(copyTransactionHash()));
    connect(lockAction, SIGNAL(triggered()), this, SLOT(lockCoin()));
    connect(unlockAction, SIGNAL(triggered()), this, SLOT(unlockCoin()));

    // clipboard actions
    QAction *clipboardQuantityAction = new QAction(tr("Copy quantity"), this);
    QAction *clipboardAmountAction = new QAction(tr("Copy amount"), this);
    QAction *clipboardFeeAction = new QAction(tr("Copy fee"), this);
    QAction *clipboardAfterFeeAction = new QAction(tr("Copy after fee"), this);
    QAction *clipboardBytesAction = new QAction(tr("Copy bytes"), this);
    QAction *clipboardLowOutputAction = new QAction(tr("Copy dust"), this);
    QAction *clipboardChangeAction = new QAction(tr("Copy change"), this);

    connect(clipboardQuantityAction, SIGNAL(triggered()), this,
            SLOT(clipboardQuantity()));
    connect(clipboardAmountAction, SIGNAL(triggered()), this,
            SLOT(clipboardAmount()));
    connect(clipboardFeeAction, SIGNAL(triggered()), this,
            SLOT(clipboardFee()));
    connect(clipboardAfterFeeAction, SIGNAL(triggered()), this,
            SLOT(clipboardAfterFee()));
    connect(clipboardBytesAction, SIGNAL(triggered()), this,
            SLOT(clipboardBytes()));
    connect(clipboardLowOutputAction, SIGNAL(triggered()), this,
            SLOT(clipboardLowOutput()));
    connect(clipboardChangeAction, SIGNAL(triggered()), this,
            SLOT(clipboardChange()));

    ui->labelCoinControlQuantity->addAction(clipboardQuantityAction);
    ui->labelCoinControlAmount->addAction(clipboardAmountAction);
    ui->labelCoinControlFee->addAction(clipboardFeeAction);
    ui->labelCoinControlAfterFee->addAction(clipboardAfterFeeAction);
    ui->labelCoinControlBytes->addAction(clipboardBytesAction);
    ui->labelCoinControlLowOutput->addAction(clipboardLowOutputAction);
    ui->labelCoinControlChange->addAction(clipboardChangeAction);

    // toggle tree/list mode
    connect(ui->radioTreeMode, SIGNAL(toggled(bool)), this,
            SLOT(radioTreeMode(bool)));
    connect(ui->radioListMode, SIGNAL(toggled(bool)), this,
            SLOT(radioListMode(bool)));

    // click on checkbox
    connect(ui->treeWidget, SIGNAL(itemChanged(QTreeWidgetItem *, int)), this,
            SLOT(viewItemChanged(QTreeWidgetItem *, int)));

    // click on header
    ui->treeWidget->header()->setSectionsClickable(true);
    connect(ui->treeWidget->header(), SIGNAL(sectionClicked(int)), this,
            SLOT(headerSectionClicked(int)));

    // ok button
    connect(ui->buttonBox, SIGNAL(clicked(QAbstractButton *)), this,
            SLOT(buttonBoxClicked(QAbstractButton *)));

    // (un)select all
    connect(ui->pushButtonSelectAll, SIGNAL(clicked()), this,
            SLOT(buttonSelectAllClicked()));

    // change coin control first column label due Qt4 bug.
    // see https://github.com/bitcoin/bitcoin/issues/5716
    ui->treeWidget->headerItem()->setText(COLUMN_CHECKBOX, QString());

    ui->treeWidget->setColumnWidth(COLUMN_CHECKBOX, 84);
    ui->treeWidget->setColumnWidth(COLUMN_AMOUNT, 110);
    ui->treeWidget->setColumnWidth(COLUMN_LABEL, 190);
    ui->treeWidget->setColumnWidth(COLUMN_ADDRESS, 320);
    ui->treeWidget->setColumnWidth(COLUMN_DATE, 130);
    ui->treeWidget->setColumnWidth(COLUMN_CONFIRMATIONS, 110);
    // store transaction hash in this column, but don't show it
    ui->treeWidget->setColumnHidden(COLUMN_TXHASH, true);
    // store vout index in this column, but don't show it
    ui->treeWidget->setColumnHidden(COLUMN_VOUT_INDEX, true);

    // default view is sorted by amount desc
    sortView(COLUMN_AMOUNT, Qt::DescendingOrder);

    // restore list mode and sortorder as a convenience feature
    QSettings settings;
    if (settings.contains("nCoinControlMode") &&
        !settings.value("nCoinControlMode").toBool())
        ui->radioTreeMode->click();
    if (settings.contains("nCoinControlSortColumn") &&
        settings.contains("nCoinControlSortOrder"))
        sortView(settings.value("nCoinControlSortColumn").toInt(),
                 (static_cast<Qt::SortOrder>(
                     settings.value("nCoinControlSortOrder").toInt())));
}

CoinControlDialog::~CoinControlDialog() {
    QSettings settings;
    settings.setValue("nCoinControlMode", ui->radioListMode->isChecked());
    settings.setValue("nCoinControlSortColumn", sortColumn);
    settings.setValue("nCoinControlSortOrder", (int)sortOrder);

    delete ui;
}

void CoinControlDialog::setModel(WalletModel *_model) {
    this->model = _model;

    if (_model && _model->getOptionsModel() && _model->getAddressTableModel()) {
        updateView();
        updateLabelLocked();
        CoinControlDialog::updateLabels(_model, this);
    }
}

// ok button
void CoinControlDialog::buttonBoxClicked(QAbstractButton *button) {
    if (ui->buttonBox->buttonRole(button) == QDialogButtonBox::AcceptRole) {
        // closes the dialog
        done(QDialog::Accepted);
    }
}

// (un)select all
void CoinControlDialog::buttonSelectAllClicked() {
    Qt::CheckState state = Qt::Checked;
    for (int i = 0; i < ui->treeWidget->topLevelItemCount(); i++) {
        if (ui->treeWidget->topLevelItem(i)->checkState(COLUMN_CHECKBOX) !=
            Qt::Unchecked) {
            state = Qt::Unchecked;
            break;
        }
    }
    ui->treeWidget->setEnabled(false);
    for (int i = 0; i < ui->treeWidget->topLevelItemCount(); i++)
        if (ui->treeWidget->topLevelItem(i)->checkState(COLUMN_CHECKBOX) !=
            state) {
            ui->treeWidget->topLevelItem(i)->setCheckState(COLUMN_CHECKBOX,
                                                           state);
        }
    ui->treeWidget->setEnabled(true);
    if (state == Qt::Unchecked) {
        // just to be sure
        coinControl()->UnSelectAll();
    }
    CoinControlDialog::updateLabels(model, this);
}

// context menu
void CoinControlDialog::showMenu(const QPoint &point) {
    QTreeWidgetItem *item = ui->treeWidget->itemAt(point);
    if (item) {
        contextMenuItem = item;

        // disable some items (like Copy Transaction ID, lock, unlock) for tree
        // roots in context menu
        if (item->text(COLUMN_TXHASH).length() == 64) {
            TxId txid;
            txid.SetHex(item->text(COLUMN_TXHASH).toStdString());

            // transaction hash is 64 characters (this means its a child node,
            // so its not a parent node in tree mode)
            copyTransactionHashAction->setEnabled(true);
            if (model->wallet().isLockedCoin(
                    COutPoint(txid, item->text(COLUMN_VOUT_INDEX).toUInt()))) {
                lockAction->setEnabled(false);
                unlockAction->setEnabled(true);
            } else {
                lockAction->setEnabled(true);
                unlockAction->setEnabled(false);
            }
        } else {
            // this means click on parent node in tree mode -> disable all
            copyTransactionHashAction->setEnabled(false);
            lockAction->setEnabled(false);
            unlockAction->setEnabled(false);
        }

        // show context menu
        contextMenu->exec(QCursor::pos());
    }
}

// context menu action: copy amount
void CoinControlDialog::copyAmount() {
    GUIUtil::setClipboard(
        BitcoinUnits::removeSpaces(contextMenuItem->text(COLUMN_AMOUNT)));
}

// context menu action: copy label
void CoinControlDialog::copyLabel() {
    if (ui->radioTreeMode->isChecked() &&
        contextMenuItem->text(COLUMN_LABEL).length() == 0 &&
        contextMenuItem->parent()) {
        GUIUtil::setClipboard(contextMenuItem->parent()->text(COLUMN_LABEL));
    } else {
        GUIUtil::setClipboard(contextMenuItem->text(COLUMN_LABEL));
    }
}

// context menu action: copy address
void CoinControlDialog::copyAddress() {
    if (ui->radioTreeMode->isChecked() &&
        contextMenuItem->text(COLUMN_ADDRESS).length() == 0 &&
        contextMenuItem->parent()) {
        GUIUtil::setClipboard(contextMenuItem->parent()->text(COLUMN_ADDRESS));
    } else {
        GUIUtil::setClipboard(contextMenuItem->text(COLUMN_ADDRESS));
    }
}

// context menu action: copy transaction id
void CoinControlDialog::copyTransactionHash() {
    GUIUtil::setClipboard(contextMenuItem->text(COLUMN_TXHASH));
}

// context menu action: lock coin
void CoinControlDialog::lockCoin() {
    if (contextMenuItem->checkState(COLUMN_CHECKBOX) == Qt::Checked) {
        contextMenuItem->setCheckState(COLUMN_CHECKBOX, Qt::Unchecked);
    }

    COutPoint outpt(
        uint256S(contextMenuItem->text(COLUMN_TXHASH).toStdString()),
        contextMenuItem->text(COLUMN_VOUT_INDEX).toUInt());
    model->wallet().lockCoin(outpt);
    contextMenuItem->setDisabled(true);
    contextMenuItem->setIcon(
        COLUMN_CHECKBOX, platformStyle->SingleColorIcon(":/icons/lock_closed"));
    updateLabelLocked();
}

// context menu action: unlock coin
void CoinControlDialog::unlockCoin() {
    COutPoint outpt(
        uint256S(contextMenuItem->text(COLUMN_TXHASH).toStdString()),
        contextMenuItem->text(COLUMN_VOUT_INDEX).toUInt());
    model->wallet().unlockCoin(outpt);
    contextMenuItem->setDisabled(false);
    contextMenuItem->setIcon(COLUMN_CHECKBOX, QIcon());
    updateLabelLocked();
}

// copy label "Quantity" to clipboard
void CoinControlDialog::clipboardQuantity() {
    GUIUtil::setClipboard(ui->labelCoinControlQuantity->text());
}

// copy label "Amount" to clipboard
void CoinControlDialog::clipboardAmount() {
    GUIUtil::setClipboard(ui->labelCoinControlAmount->text().left(
        ui->labelCoinControlAmount->text().indexOf(" ")));
}

// copy label "Fee" to clipboard
void CoinControlDialog::clipboardFee() {
    GUIUtil::setClipboard(
        ui->labelCoinControlFee->text()
            .left(ui->labelCoinControlFee->text().indexOf(" "))
            .replace(ASYMP_UTF8, ""));
}

// copy label "After fee" to clipboard
void CoinControlDialog::clipboardAfterFee() {
    GUIUtil::setClipboard(
        ui->labelCoinControlAfterFee->text()
            .left(ui->labelCoinControlAfterFee->text().indexOf(" "))
            .replace(ASYMP_UTF8, ""));
}

// copy label "Bytes" to clipboard
void CoinControlDialog::clipboardBytes() {
    GUIUtil::setClipboard(
        ui->labelCoinControlBytes->text().replace(ASYMP_UTF8, ""));
}

// copy label "Dust" to clipboard
void CoinControlDialog::clipboardLowOutput() {
    GUIUtil::setClipboard(ui->labelCoinControlLowOutput->text());
}

// copy label "Change" to clipboard
void CoinControlDialog::clipboardChange() {
    GUIUtil::setClipboard(
        ui->labelCoinControlChange->text()
            .left(ui->labelCoinControlChange->text().indexOf(" "))
            .replace(ASYMP_UTF8, ""));
}

// treeview: sort
void CoinControlDialog::sortView(int column, Qt::SortOrder order) {
    sortColumn = column;
    sortOrder = order;
    ui->treeWidget->sortItems(column, order);
    ui->treeWidget->header()->setSortIndicator(sortColumn, sortOrder);
}

// treeview: clicked on header
void CoinControlDialog::headerSectionClicked(int logicalIndex) {
    // click on most left column -> do nothing
    if (logicalIndex == COLUMN_CHECKBOX) {
        ui->treeWidget->header()->setSortIndicator(sortColumn, sortOrder);
    } else {
        if (sortColumn == logicalIndex) {
            sortOrder =
                ((sortOrder == Qt::AscendingOrder) ? Qt::DescendingOrder
                                                   : Qt::AscendingOrder);
        } else {
            sortColumn = logicalIndex;
            // if label or address then default => asc, else default => desc
            sortOrder =
                ((sortColumn == COLUMN_LABEL || sortColumn == COLUMN_ADDRESS)
                     ? Qt::AscendingOrder
                     : Qt::DescendingOrder);
        }

        sortView(sortColumn, sortOrder);
    }
}

// toggle tree mode
void CoinControlDialog::radioTreeMode(bool checked) {
    if (checked && model) {
        updateView();
    }
}

// toggle list mode
void CoinControlDialog::radioListMode(bool checked) {
    if (checked && model) {
        updateView();
    }
}

// checkbox clicked by user
void CoinControlDialog::viewItemChanged(QTreeWidgetItem *item, int column) {
    // transaction hash is 64 characters (this means its a child node, so its
    // not a parent node in tree mode)
    if (column == COLUMN_CHECKBOX && item->text(COLUMN_TXHASH).length() == 64) {
        COutPoint outpt(uint256S(item->text(COLUMN_TXHASH).toStdString()),
                        item->text(COLUMN_VOUT_INDEX).toUInt());

        if (item->checkState(COLUMN_CHECKBOX) == Qt::Unchecked) {
            coinControl()->UnSelect(outpt);
        } else if (item->isDisabled()) {
            // locked (this happens if "check all" through parent node)
            item->setCheckState(COLUMN_CHECKBOX, Qt::Unchecked);
        } else {
            coinControl()->Select(outpt);
        }

        // selection changed -> update labels
        if (ui->treeWidget->isEnabled()) {
            // do not update on every click for (un)select all
            CoinControlDialog::updateLabels(model, this);
        }
    }

    // TODO: Remove this temporary qt5 fix after Qt5.3 and Qt5.4 are no longer
    // used.
    // Fixed in Qt5.5 and above: https://bugreports.qt.io/browse/QTBUG-43473
    else if (column == COLUMN_CHECKBOX && item->childCount() > 0) {
        if (item->checkState(COLUMN_CHECKBOX) == Qt::PartiallyChecked &&
            item->child(0)->checkState(COLUMN_CHECKBOX) ==
                Qt::PartiallyChecked) {
            item->setCheckState(COLUMN_CHECKBOX, Qt::Checked);
        }
    }
}

// shows count of locked unspent outputs
void CoinControlDialog::updateLabelLocked() {
    std::vector<COutPoint> vOutpts;
    model->wallet().listLockedCoins(vOutpts);
    if (vOutpts.size() > 0) {
        ui->labelLocked->setText(tr("(%1 locked)").arg(vOutpts.size()));
        ui->labelLocked->setVisible(true);
    } else {
        ui->labelLocked->setVisible(false);
    }
}

void CoinControlDialog::updateLabels(WalletModel *model, QDialog *dialog) {
    if (!model) {
        return;
    }

    // nPayAmount
    Amount nPayAmount = Amount::zero();
    bool fDust = false;
    CMutableTransaction txDummy;
    for (const Amount amount : CoinControlDialog::payAmounts) {
        nPayAmount += amount;

        if (amount > Amount::zero()) {
            CTxOut txout(amount,
                         static_cast<CScript>(std::vector<uint8_t>(24, 0)));
            txDummy.vout.push_back(txout);
            if (txout.IsDust(model->node().getDustRelayFee())) {
                fDust = true;
            }
        }
    }

    Amount nAmount = Amount::zero();
    Amount nPayFee = Amount::zero();
    Amount nAfterFee = Amount::zero();
    Amount nChange = Amount::zero();
    unsigned int nBytes = 0;
    unsigned int nBytesInputs = 0;
    unsigned int nQuantity = 0;
    int nQuantityUncompressed = 0;

    std::vector<COutPoint> vCoinControl;
    coinControl()->ListSelected(vCoinControl);

    size_t i = 0;
    for (const auto &out : model->wallet().getCoins(vCoinControl)) {
        if (out.depth_in_main_chain < 0) {
            continue;
        }

        // unselect already spent, very unlikely scenario, this could happen
        // when selected are spent elsewhere, like rpc or another computer
        const COutPoint &outpt = vCoinControl[i++];
        if (out.is_spent) {
            coinControl()->UnSelect(outpt);
            continue;
        }

        // Quantity
        nQuantity++;

        // Amount
        nAmount += out.txout.nValue;

        // Bytes
        CTxDestination address;
        if (ExtractDestination(out.txout.scriptPubKey, address)) {
            CPubKey pubkey;
            CKeyID *keyid = boost::get<CKeyID>(&address);
            if (keyid && model->wallet().getPubKey(*keyid, pubkey)) {
                nBytesInputs += (pubkey.IsCompressed() ? 148 : 180);
                if (!pubkey.IsCompressed()) {
                    nQuantityUncompressed++;
                }
            } else {
                // in all error cases, simply assume 148 here
                nBytesInputs += 148;
            }
        } else {
            nBytesInputs += 148;
        }
    }

    // calculation
    if (nQuantity > 0) {
        // Bytes
        // always assume +1 output for change here
        nBytes = nBytesInputs +
                 ((CoinControlDialog::payAmounts.size() > 0
                       ? CoinControlDialog::payAmounts.size() + 1
                       : 2) *
                  34) +
                 10;

        // in the subtract fee from amount case, we can tell if zero change
        // already and subtract the bytes, so that fee calculation afterwards is
        // accurate
        if (CoinControlDialog::fSubtractFeeFromAmount) {
            if (nAmount - nPayAmount == Amount::zero()) {
                nBytes -= 34;
            }
        }

        // Fee
        nPayFee = model->node().getMinimumFee(nBytes, *coinControl());

        if (nPayAmount > Amount::zero()) {
            nChange = nAmount - nPayAmount;
            if (!CoinControlDialog::fSubtractFeeFromAmount) {
                nChange -= nPayFee;
            }

            // Never create dust outputs; if we would, just add the dust to the
            // fee.
            if (nChange > Amount::zero() && nChange < MIN_CHANGE) {
                CTxOut txout(nChange,
                             static_cast<CScript>(std::vector<uint8_t>(24, 0)));
                if (txout.IsDust(model->node().getDustRelayFee())) {
                    // dust-change will be raised until no dust
                    if (CoinControlDialog::fSubtractFeeFromAmount) {
                        nChange = txout.GetDustThreshold(
                            model->node().getDustRelayFee());
                    } else {
                        nPayFee += nChange;
                        nChange = Amount::zero();
                    }
                }
            }

            if (nChange == Amount::zero() &&
                !CoinControlDialog::fSubtractFeeFromAmount) {
                nBytes -= 34;
            }
        }

        // after fee
        nAfterFee = std::max(nAmount - nPayFee, Amount::zero());
    }

    // actually update labels
    int nDisplayUnit = BitcoinUnits::BCH;
    if (model && model->getOptionsModel()) {
        nDisplayUnit = model->getOptionsModel()->getDisplayUnit();
    }

    QLabel *l1 = dialog->findChild<QLabel *>("labelCoinControlQuantity");
    QLabel *l2 = dialog->findChild<QLabel *>("labelCoinControlAmount");
    QLabel *l3 = dialog->findChild<QLabel *>("labelCoinControlFee");
    QLabel *l4 = dialog->findChild<QLabel *>("labelCoinControlAfterFee");
    QLabel *l5 = dialog->findChild<QLabel *>("labelCoinControlBytes");
    QLabel *l7 = dialog->findChild<QLabel *>("labelCoinControlLowOutput");
    QLabel *l8 = dialog->findChild<QLabel *>("labelCoinControlChange");

    // enable/disable "dust" and "change"
    dialog->findChild<QLabel *>("labelCoinControlLowOutputText")
        ->setEnabled(nPayAmount > Amount::zero());
    dialog->findChild<QLabel *>("labelCoinControlLowOutput")
        ->setEnabled(nPayAmount > Amount::zero());
    dialog->findChild<QLabel *>("labelCoinControlChangeText")
        ->setEnabled(nPayAmount > Amount::zero());
    dialog->findChild<QLabel *>("labelCoinControlChange")
        ->setEnabled(nPayAmount > Amount::zero());

    // stats
    // Quantity
    l1->setText(QString::number(nQuantity));
    // Amount
    l2->setText(BitcoinUnits::formatWithUnit(nDisplayUnit, nAmount));
    // Fee
    l3->setText(BitcoinUnits::formatWithUnit(nDisplayUnit, nPayFee));
    // After Fee
    l4->setText(BitcoinUnits::formatWithUnit(nDisplayUnit, nAfterFee));
    // Bytes
    l5->setText(((nBytes > 0) ? ASYMP_UTF8 : "") + QString::number(nBytes));
    // Dust
    l7->setText(fDust ? tr("yes") : tr("no"));
    // Change
    l8->setText(BitcoinUnits::formatWithUnit(nDisplayUnit, nChange));
    if (nPayFee > Amount::zero()) {
        l3->setText(ASYMP_UTF8 + l3->text());
        l4->setText(ASYMP_UTF8 + l4->text());
        if (nChange > Amount::zero() &&
            !CoinControlDialog::fSubtractFeeFromAmount) {
            l8->setText(ASYMP_UTF8 + l8->text());
        }
    }

    // turn label red when dust
    l7->setStyleSheet((fDust) ? "color:red;" : "");

    // tool tips
    QString toolTipDust =
        tr("This label turns red if any recipient receives an amount smaller "
           "than the current dust threshold.");

    // how many satoshis the estimated fee can vary per byte we guess wrong
    double dFeeVary = GetMinimumFee(1000, g_mempool) / (1000 * SATOSHI);

    QString toolTip4 =
        tr("Can vary +/- %1 satoshi(s) per input.").arg(dFeeVary);

    l3->setToolTip(toolTip4);
    l4->setToolTip(toolTip4);
    l7->setToolTip(toolTipDust);
    l8->setToolTip(toolTip4);
    dialog->findChild<QLabel *>("labelCoinControlFeeText")
        ->setToolTip(l3->toolTip());
    dialog->findChild<QLabel *>("labelCoinControlAfterFeeText")
        ->setToolTip(l4->toolTip());
    dialog->findChild<QLabel *>("labelCoinControlBytesText")
        ->setToolTip(l5->toolTip());
    dialog->findChild<QLabel *>("labelCoinControlLowOutputText")
        ->setToolTip(l7->toolTip());
    dialog->findChild<QLabel *>("labelCoinControlChangeText")
        ->setToolTip(l8->toolTip());

    // Insufficient funds
    QLabel *label = dialog->findChild<QLabel *>("labelCoinControlInsuffFunds");
    if (label) {
        label->setVisible(nChange < Amount::zero());
    }
}

CCoinControl *CoinControlDialog::coinControl() {
    static CCoinControl coin_control;
    return &coin_control;
}

void CoinControlDialog::updateView() {
    if (!model || !model->getOptionsModel() || !model->getAddressTableModel()) {
        return;
    }

    bool treeMode = ui->radioTreeMode->isChecked();

    ui->treeWidget->clear();
    // performance, otherwise updateLabels would be called for every checked
    // checkbox
    ui->treeWidget->setEnabled(false);
    ui->treeWidget->setAlternatingRowColors(!treeMode);
    QFlags<Qt::ItemFlag> flgCheckbox =
        Qt::ItemIsSelectable | Qt::ItemIsEnabled | Qt::ItemIsUserCheckable;
    QFlags<Qt::ItemFlag> flgTristate =
        Qt::ItemIsSelectable | Qt::ItemIsEnabled | Qt::ItemIsUserCheckable |
        Qt::ItemIsTristate;

    int nDisplayUnit = model->getOptionsModel()->getDisplayUnit();

    for (const auto &coins : model->wallet().listCoins()) {
        CCoinControlWidgetItem *itemWalletAddress =
            new CCoinControlWidgetItem();
        itemWalletAddress->setCheckState(COLUMN_CHECKBOX, Qt::Unchecked);
        QString sWalletAddress =
            QString::fromStdString(EncodeDestination(coins.first));
        QString sWalletLabel =
            model->getAddressTableModel()->labelForAddress(sWalletAddress);
        if (sWalletLabel.isEmpty()) {
            sWalletLabel = tr("(no label)");
        }

        if (treeMode) {
            // wallet address
            ui->treeWidget->addTopLevelItem(itemWalletAddress);

            itemWalletAddress->setFlags(flgTristate);
            itemWalletAddress->setCheckState(COLUMN_CHECKBOX, Qt::Unchecked);

            // label
            itemWalletAddress->setText(COLUMN_LABEL, sWalletLabel);

            // address
            itemWalletAddress->setText(COLUMN_ADDRESS, sWalletAddress);
        }

        Amount nSum = Amount::zero();
        int nChildren = 0;
        for (const auto &outpair : coins.second) {
            const COutPoint &output = std::get<0>(outpair);
            const interfaces::WalletTxOut &out = std::get<1>(outpair);
            nSum += out.txout.nValue;
            nChildren++;

            CCoinControlWidgetItem *itemOutput;
            if (treeMode) {
                itemOutput = new CCoinControlWidgetItem(itemWalletAddress);
            } else {
                itemOutput = new CCoinControlWidgetItem(ui->treeWidget);
            }
            itemOutput->setFlags(flgCheckbox);
            itemOutput->setCheckState(COLUMN_CHECKBOX, Qt::Unchecked);

            // address
            CTxDestination outputAddress;
            QString sAddress = "";
            if (ExtractDestination(out.txout.scriptPubKey, outputAddress)) {
                sAddress =
                    QString::fromStdString(EncodeDestination(outputAddress));

                // if listMode or change => show bitcoin address. In tree mode,
                // address is not shown again for direct wallet address outputs
                if (!treeMode || (!(sAddress == sWalletAddress))) {
                    itemOutput->setText(COLUMN_ADDRESS, sAddress);
                }
            }

            // label
            if (!(sAddress == sWalletAddress)) {
                // change tooltip from where the change comes from
                itemOutput->setToolTip(COLUMN_LABEL, tr("change from %1 (%2)")
                                                         .arg(sWalletLabel)
                                                         .arg(sWalletAddress));
                itemOutput->setText(COLUMN_LABEL, tr("(change)"));
            } else if (!treeMode) {
                QString sLabel =
                    model->getAddressTableModel()->labelForAddress(sAddress);
                if (sLabel.isEmpty()) {
                    sLabel = tr("(no label)");
                }
                itemOutput->setText(COLUMN_LABEL, sLabel);
            }

            // amount
            itemOutput->setText(
                COLUMN_AMOUNT,
                BitcoinUnits::format(nDisplayUnit, out.txout.nValue));
            // padding so that sorting works correctly
            itemOutput->setData(
                COLUMN_AMOUNT, Qt::UserRole,
                QVariant(qlonglong(out.txout.nValue / SATOSHI)));

            // date
            itemOutput->setText(COLUMN_DATE, GUIUtil::dateTimeStr(out.time));
            itemOutput->setData(COLUMN_DATE, Qt::UserRole,
                                QVariant((qlonglong)out.time));

            // confirmations
            itemOutput->setText(COLUMN_CONFIRMATIONS,
                                QString::number(out.depth_in_main_chain));
            itemOutput->setData(COLUMN_CONFIRMATIONS, Qt::UserRole,
                                QVariant((qlonglong)out.depth_in_main_chain));

            // transaction id
            itemOutput->setText(COLUMN_TXHASH, QString::fromStdString(
                                                   output.GetTxId().GetHex()));

            // vout index
            itemOutput->setText(COLUMN_VOUT_INDEX,
                                QString::number(output.GetN()));

            // disable locked coins
            if (model->wallet().isLockedCoin(output)) {
                // just to be sure
                coinControl()->UnSelect(output);
                itemOutput->setDisabled(true);
                itemOutput->setIcon(
                    COLUMN_CHECKBOX,
                    platformStyle->SingleColorIcon(":/icons/lock_closed"));
            }

            // set checkbox
            if (coinControl()->IsSelected(output)) {
                itemOutput->setCheckState(COLUMN_CHECKBOX, Qt::Checked);
            }
        }

        // amount
        if (treeMode) {
            itemWalletAddress->setText(COLUMN_CHECKBOX,
                                       "(" + QString::number(nChildren) + ")");
            itemWalletAddress->setText(
                COLUMN_AMOUNT, BitcoinUnits::format(nDisplayUnit, nSum));
            itemWalletAddress->setData(COLUMN_AMOUNT, Qt::UserRole,
                                       QVariant(qlonglong(nSum / SATOSHI)));
        }
    }

    // expand all partially selected
    if (treeMode) {
        for (int i = 0; i < ui->treeWidget->topLevelItemCount(); i++) {
            if (ui->treeWidget->topLevelItem(i)->checkState(COLUMN_CHECKBOX) ==
                Qt::PartiallyChecked)
                ui->treeWidget->topLevelItem(i)->setExpanded(true);
        }
    }

    // sort view
    sortView(sortColumn, sortOrder);
    ui->treeWidget->setEnabled(true);
}
