// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <qt/forms/ui_sendcoinsdialog.h>
#include <qt/sendcoinsdialog.h>

#include <chainparams.h>
#include <dstencode.h>
#include <interfaces/node.h>
#include <qt/addresstablemodel.h>
#include <qt/bitcoinunits.h>
#include <qt/clientmodel.h>
#include <qt/coincontroldialog.h>
#include <qt/guiutil.h>
#include <qt/optionsmodel.h>
#include <qt/platformstyle.h>
#include <qt/sendcoinsentry.h>
#include <qt/walletmodel.h>
#include <txmempool.h>
#include <ui_interface.h>
#include <wallet/coincontrol.h>
#include <wallet/fees.h>
#include <wallet/wallet.h>

#include <QMessageBox>
#include <QScrollBar>
#include <QSettings>
#include <QTextDocument>
#include <QTimer>

SendCoinsDialog::SendCoinsDialog(const PlatformStyle *_platformStyle,
                                 QWidget *parent)
    : QDialog(parent), ui(new Ui::SendCoinsDialog), clientModel(0), model(0),
      fNewRecipientAllowed(true), fFeeMinimized(true),
      platformStyle(_platformStyle) {
    ui->setupUi(this);

    if (!_platformStyle->getImagesOnButtons()) {
        ui->addButton->setIcon(QIcon());
        ui->clearButton->setIcon(QIcon());
        ui->sendButton->setIcon(QIcon());
    } else {
        ui->addButton->setIcon(_platformStyle->SingleColorIcon(":/icons/add"));
        ui->clearButton->setIcon(
            _platformStyle->SingleColorIcon(":/icons/remove"));
        ui->sendButton->setIcon(
            _platformStyle->SingleColorIcon(":/icons/send"));
    }

    GUIUtil::setupAddressWidget(ui->lineEditCoinControlChange, this);

    addEntry();

    connect(ui->addButton, SIGNAL(clicked()), this, SLOT(addEntry()));
    connect(ui->clearButton, SIGNAL(clicked()), this, SLOT(clear()));

    // Coin Control
    connect(ui->pushButtonCoinControl, SIGNAL(clicked()), this,
            SLOT(coinControlButtonClicked()));
    connect(ui->checkBoxCoinControlChange, SIGNAL(stateChanged(int)), this,
            SLOT(coinControlChangeChecked(int)));
    connect(ui->lineEditCoinControlChange, SIGNAL(textEdited(const QString &)),
            this, SLOT(coinControlChangeEdited(const QString &)));

    // Coin Control: clipboard actions
    QAction *clipboardQuantityAction = new QAction(tr("Copy quantity"), this);
    QAction *clipboardAmountAction = new QAction(tr("Copy amount"), this);
    QAction *clipboardFeeAction = new QAction(tr("Copy fee"), this);
    QAction *clipboardAfterFeeAction = new QAction(tr("Copy after fee"), this);
    QAction *clipboardBytesAction = new QAction(tr("Copy bytes"), this);
    QAction *clipboardLowOutputAction = new QAction(tr("Copy dust"), this);
    QAction *clipboardChangeAction = new QAction(tr("Copy change"), this);
    connect(clipboardQuantityAction, SIGNAL(triggered()), this,
            SLOT(coinControlClipboardQuantity()));
    connect(clipboardAmountAction, SIGNAL(triggered()), this,
            SLOT(coinControlClipboardAmount()));
    connect(clipboardFeeAction, SIGNAL(triggered()), this,
            SLOT(coinControlClipboardFee()));
    connect(clipboardAfterFeeAction, SIGNAL(triggered()), this,
            SLOT(coinControlClipboardAfterFee()));
    connect(clipboardBytesAction, SIGNAL(triggered()), this,
            SLOT(coinControlClipboardBytes()));
    connect(clipboardLowOutputAction, SIGNAL(triggered()), this,
            SLOT(coinControlClipboardLowOutput()));
    connect(clipboardChangeAction, SIGNAL(triggered()), this,
            SLOT(coinControlClipboardChange()));
    ui->labelCoinControlQuantity->addAction(clipboardQuantityAction);
    ui->labelCoinControlAmount->addAction(clipboardAmountAction);
    ui->labelCoinControlFee->addAction(clipboardFeeAction);
    ui->labelCoinControlAfterFee->addAction(clipboardAfterFeeAction);
    ui->labelCoinControlBytes->addAction(clipboardBytesAction);
    ui->labelCoinControlLowOutput->addAction(clipboardLowOutputAction);
    ui->labelCoinControlChange->addAction(clipboardChangeAction);

    // init transaction fee section
    QSettings settings;
    if (!settings.contains("fFeeSectionMinimized")) {
        settings.setValue("fFeeSectionMinimized", true);
    }
    // compatibility
    if (!settings.contains("nFeeRadio") &&
        settings.contains("nTransactionFee") &&
        settings.value("nTransactionFee").toLongLong() > 0) {
        // custom
        settings.setValue("nFeeRadio", 1);
    }
    if (!settings.contains("nFeeRadio")) {
        // recommended
        settings.setValue("nFeeRadio", 0);
    }
    // compatibility
    if (!settings.contains("nCustomFeeRadio") &&
        settings.contains("nTransactionFee") &&
        settings.value("nTransactionFee").toLongLong() > 0) {
        // total at least
        settings.setValue("nCustomFeeRadio", 1);
    }
    if (!settings.contains("nCustomFeeRadio")) {
        // per kilobyte
        settings.setValue("nCustomFeeRadio", 0);
    }
    if (!settings.contains("nTransactionFee")) {
        settings.setValue("nTransactionFee",
                          qint64(DEFAULT_TRANSACTION_FEE / SATOSHI));
    }
    if (!settings.contains("fPayOnlyMinFee")) {
        settings.setValue("fPayOnlyMinFee", false);
    }
    ui->groupFee->setId(ui->radioSmartFee, 0);
    ui->groupFee->setId(ui->radioCustomFee, 1);
    ui->groupFee
        ->button(
            std::max<int>(0, std::min(1, settings.value("nFeeRadio").toInt())))
        ->setChecked(true);
    ui->groupCustomFee->setId(ui->radioCustomPerKilobyte, 0);
    ui->groupCustomFee->button(0)->setChecked(true);
    ui->customFee->setValue(
        int64_t(settings.value("nTransactionFee").toLongLong()) * SATOSHI);
    ui->checkBoxMinimumFee->setChecked(
        settings.value("fPayOnlyMinFee").toBool());
    minimizeFeeSection(settings.value("fFeeSectionMinimized").toBool());
}

void SendCoinsDialog::setClientModel(ClientModel *_clientModel) {
    this->clientModel = _clientModel;

    if (_clientModel) {
        connect(_clientModel,
                SIGNAL(numBlocksChanged(int, QDateTime, double, bool)), this,
                SLOT(updateSmartFeeLabel()));
    }
}

void SendCoinsDialog::setModel(WalletModel *_model) {
    this->model = _model;

    if (_model && _model->getOptionsModel()) {
        for (int i = 0; i < ui->entries->count(); ++i) {
            SendCoinsEntry *entry = qobject_cast<SendCoinsEntry *>(
                ui->entries->itemAt(i)->widget());
            if (entry) {
                entry->setModel(_model);
            }
        }

        interfaces::WalletBalances balances = _model->wallet().getBalances();
        setBalance(balances);
        connect(_model, SIGNAL(balanceChanged(interfaces::WalletBalances)),
                this, SLOT(setBalance(interfaces::WalletBalances)));
        connect(_model->getOptionsModel(), SIGNAL(displayUnitChanged(int)),
                this, SLOT(updateDisplayUnit()));
        updateDisplayUnit();

        // Coin Control
        connect(_model->getOptionsModel(), SIGNAL(displayUnitChanged(int)),
                this, SLOT(coinControlUpdateLabels()));
        connect(_model->getOptionsModel(),
                SIGNAL(coinControlFeaturesChanged(bool)), this,
                SLOT(coinControlFeatureChanged(bool)));
        ui->frameCoinControl->setVisible(
            _model->getOptionsModel()->getCoinControlFeatures());
        coinControlUpdateLabels();

        // fee section
        connect(ui->groupFee, SIGNAL(buttonClicked(int)), this,
                SLOT(updateFeeSectionControls()));
        connect(ui->groupFee, SIGNAL(buttonClicked(int)), this,
                SLOT(coinControlUpdateLabels()));
        connect(ui->groupCustomFee, SIGNAL(buttonClicked(int)), this,
                SLOT(coinControlUpdateLabels()));
        connect(ui->customFee, SIGNAL(valueChanged()), this,
                SLOT(coinControlUpdateLabels()));
        connect(ui->checkBoxMinimumFee, SIGNAL(stateChanged(int)), this,
                SLOT(setMinimumFee()));
        connect(ui->checkBoxMinimumFee, SIGNAL(stateChanged(int)), this,
                SLOT(updateFeeSectionControls()));
        connect(ui->checkBoxMinimumFee, SIGNAL(stateChanged(int)), this,
                SLOT(coinControlUpdateLabels()));

        ui->customFee->setSingleStep(model->node().getMinimumFee(1000));
        updateFeeSectionControls();
        updateMinFeeLabel();
        updateSmartFeeLabel();

        // Cleanup old confirmation target related settings
        // TODO: Remove these in 0.20
        QSettings settings;
        if (settings.value("nSmartFeeSliderPosition").toInt() != 0) {
            settings.remove("nSmartFeeSliderPosition");
        }
        if (settings.value("nConfTarget").toInt() != 0) {
            settings.remove("nConfTarget");
        }
    }
}

SendCoinsDialog::~SendCoinsDialog() {
    QSettings settings;
    settings.setValue("fFeeSectionMinimized", fFeeMinimized);
    settings.setValue("nFeeRadio", ui->groupFee->checkedId());
    settings.setValue("nCustomFeeRadio", ui->groupCustomFee->checkedId());
    settings.setValue("nTransactionFee",
                      qint64(ui->customFee->value() / SATOSHI));
    settings.setValue("fPayOnlyMinFee", ui->checkBoxMinimumFee->isChecked());

    delete ui;
}

void SendCoinsDialog::on_sendButton_clicked() {
    if (!model || !model->getOptionsModel()) {
        return;
    }

    QList<SendCoinsRecipient> recipients;
    bool valid = true;

    for (int i = 0; i < ui->entries->count(); ++i) {
        SendCoinsEntry *entry =
            qobject_cast<SendCoinsEntry *>(ui->entries->itemAt(i)->widget());
        if (entry) {
            if (entry->validate(model->node())) {
                recipients.append(entry->getValue());
            } else {
                valid = false;
            }
        }
    }

    if (!valid || recipients.isEmpty()) {
        return;
    }

    fNewRecipientAllowed = false;
    WalletModel::UnlockContext ctx(model->requestUnlock());
    if (!ctx.isValid()) {
        // Unlock wallet was cancelled
        fNewRecipientAllowed = true;
        return;
    }

    // prepare transaction for getting txFee earlier
    WalletModelTransaction currentTransaction(recipients);
    WalletModel::SendCoinsReturn prepareStatus;

    // Always use a CCoinControl instance, use the CoinControlDialog instance if
    // CoinControl has been enabled
    CCoinControl ctrl;
    if (model->getOptionsModel()->getCoinControlFeatures()) {
        ctrl = *CoinControlDialog::coinControl();
    }

    updateCoinControlState(ctrl);

    prepareStatus = model->prepareTransaction(currentTransaction, ctrl);

    // process prepareStatus and on error generate message shown to user
    processSendCoinsReturn(
        prepareStatus,
        BitcoinUnits::formatWithUnit(model->getOptionsModel()->getDisplayUnit(),
                                     currentTransaction.getTransactionFee()));

    if (prepareStatus.status != WalletModel::OK) {
        fNewRecipientAllowed = true;
        return;
    }

    Amount txFee = currentTransaction.getTransactionFee();

    // Format confirmation message
    QStringList formatted;
    for (const SendCoinsRecipient &rcp : currentTransaction.getRecipients()) {
        // generate bold amount string with wallet name in case of multiwallet
        QString amount =
            "<b>" + BitcoinUnits::formatHtmlWithUnit(
                        model->getOptionsModel()->getDisplayUnit(), rcp.amount);
        if (model->isMultiwallet()) {
            amount.append(
                " <u>" +
                tr("from wallet %1")
                    .arg(GUIUtil::HtmlEscape(model->getWalletName())) +
                "</u> ");
        }
        amount.append("</b>");
        // generate monospace address string
        QString address =
            "<span style='font-family: monospace;'>" + rcp.address;
        address.append("</span>");

        QString recipientElement;

        // normal payment
        if (!rcp.paymentRequest.IsInitialized()) {
            if (rcp.label.length() > 0) {
                // label with address
                recipientElement =
                    tr("%1 to %2").arg(amount, GUIUtil::HtmlEscape(rcp.label));
                recipientElement.append(QString(" (%1)").arg(address));
            } else {
                // just address
                recipientElement = tr("%1 to %2").arg(amount, address);
            }
        } else if (!rcp.authenticatedMerchant.isEmpty()) {
            // authenticated payment request
            recipientElement =
                tr("%1 to %2")
                    .arg(amount,
                         GUIUtil::HtmlEscape(rcp.authenticatedMerchant));
        } else {
            // unauthenticated payment request
            recipientElement = tr("%1 to %2").arg(amount, address);
        }

        formatted.append(recipientElement);
    }

    QString questionString = tr("Are you sure you want to send?");
    questionString.append("<br /><br />%1");

    if (txFee > Amount::zero()) {
        // append fee string if a fee is required
        questionString.append("<hr /><span style='color:#aa0000;'>");
        questionString.append(BitcoinUnits::formatHtmlWithUnit(
            model->getOptionsModel()->getDisplayUnit(), txFee));
        questionString.append("</span> ");
        questionString.append(tr("added as transaction fee"));

        // append transaction size
        questionString.append(
            " (" +
            QString::number((double)currentTransaction.getTransactionSize() /
                            1000) +
            " kB)");
    }

    // add total amount in all subdivision units
    questionString.append("<hr />");
    Amount totalAmount = currentTransaction.getTotalTransactionAmount() + txFee;
    QStringList alternativeUnits;
    for (BitcoinUnits::Unit u : BitcoinUnits::availableUnits()) {
        if (u != model->getOptionsModel()->getDisplayUnit()) {
            alternativeUnits.append(
                BitcoinUnits::formatHtmlWithUnit(u, totalAmount));
        }
    }
    questionString.append(
        tr("Total Amount %1")
            .arg(BitcoinUnits::formatHtmlWithUnit(
                model->getOptionsModel()->getDisplayUnit(), totalAmount)));
    questionString.append(
        QString("<span style='font-size:10pt;font-weight:normal;'><br "
                "/>(=%2)</span>")
            .arg(alternativeUnits.join(" " + tr("or") + "<br />")));

    SendConfirmationDialog confirmationDialog(
        tr("Confirm send coins"), questionString.arg(formatted.join("<br />")),
        SEND_CONFIRM_DELAY, this);
    confirmationDialog.exec();
    QMessageBox::StandardButton retval =
        static_cast<QMessageBox::StandardButton>(confirmationDialog.result());

    if (retval != QMessageBox::Yes) {
        fNewRecipientAllowed = true;
        return;
    }

    // now send the prepared transaction
    WalletModel::SendCoinsReturn sendStatus =
        model->sendCoins(currentTransaction);
    // process sendStatus and on error generate message shown to user
    processSendCoinsReturn(sendStatus);

    if (sendStatus.status == WalletModel::OK) {
        accept();
        CoinControlDialog::coinControl()->UnSelectAll();
        coinControlUpdateLabels();
        Q_EMIT coinsSent(currentTransaction.getWtx()->get().GetId());
    }
    fNewRecipientAllowed = true;
}

void SendCoinsDialog::clear() {
    // Remove entries until only one left
    while (ui->entries->count()) {
        ui->entries->takeAt(0)->widget()->deleteLater();
    }
    addEntry();

    updateTabsAndLabels();
}

void SendCoinsDialog::reject() {
    clear();
}

void SendCoinsDialog::accept() {
    clear();
}

SendCoinsEntry *SendCoinsDialog::addEntry() {
    SendCoinsEntry *entry = new SendCoinsEntry(platformStyle, this);
    entry->setModel(model);
    ui->entries->addWidget(entry);
    connect(entry, SIGNAL(removeEntry(SendCoinsEntry *)), this,
            SLOT(removeEntry(SendCoinsEntry *)));
    connect(entry, SIGNAL(useAvailableBalance(SendCoinsEntry *)), this,
            SLOT(useAvailableBalance(SendCoinsEntry *)));
    connect(entry, SIGNAL(payAmountChanged()), this,
            SLOT(coinControlUpdateLabels()));
    connect(entry, SIGNAL(subtractFeeFromAmountChanged()), this,
            SLOT(coinControlUpdateLabels()));

    // Focus the field, so that entry can start immediately
    entry->clear();
    entry->setFocus();
    ui->scrollAreaWidgetContents->resize(
        ui->scrollAreaWidgetContents->sizeHint());
    qApp->processEvents();
    QScrollBar *bar = ui->scrollArea->verticalScrollBar();
    if (bar) {
        bar->setSliderPosition(bar->maximum());
    }

    updateTabsAndLabels();
    return entry;
}

void SendCoinsDialog::updateTabsAndLabels() {
    setupTabChain(0);
    coinControlUpdateLabels();
}

void SendCoinsDialog::removeEntry(SendCoinsEntry *entry) {
    entry->hide();

    // If the last entry is about to be removed add an empty one
    if (ui->entries->count() == 1) {
        addEntry();
    }

    entry->deleteLater();

    updateTabsAndLabels();
}

QWidget *SendCoinsDialog::setupTabChain(QWidget *prev) {
    for (int i = 0; i < ui->entries->count(); ++i) {
        SendCoinsEntry *entry =
            qobject_cast<SendCoinsEntry *>(ui->entries->itemAt(i)->widget());
        if (entry) {
            prev = entry->setupTabChain(prev);
        }
    }
    QWidget::setTabOrder(prev, ui->sendButton);
    QWidget::setTabOrder(ui->sendButton, ui->clearButton);
    QWidget::setTabOrder(ui->clearButton, ui->addButton);
    return ui->addButton;
}

void SendCoinsDialog::setAddress(const QString &address) {
    SendCoinsEntry *entry = 0;
    // Replace the first entry if it is still unused
    if (ui->entries->count() == 1) {
        SendCoinsEntry *first =
            qobject_cast<SendCoinsEntry *>(ui->entries->itemAt(0)->widget());
        if (first->isClear()) {
            entry = first;
        }
    }
    if (!entry) {
        entry = addEntry();
    }

    entry->setAddress(address);
}

void SendCoinsDialog::pasteEntry(const SendCoinsRecipient &rv) {
    if (!fNewRecipientAllowed) {
        return;
    }

    SendCoinsEntry *entry = 0;
    // Replace the first entry if it is still unused
    if (ui->entries->count() == 1) {
        SendCoinsEntry *first =
            qobject_cast<SendCoinsEntry *>(ui->entries->itemAt(0)->widget());
        if (first->isClear()) {
            entry = first;
        }
    }
    if (!entry) {
        entry = addEntry();
    }

    entry->setValue(rv);
    updateTabsAndLabels();
}

bool SendCoinsDialog::handlePaymentRequest(const SendCoinsRecipient &rv) {
    // Just paste the entry, all pre-checks are done in paymentserver.cpp.
    pasteEntry(rv);
    return true;
}

void SendCoinsDialog::setBalance(const interfaces::WalletBalances &balances) {
    if (model && model->getOptionsModel()) {
        ui->labelBalance->setText(BitcoinUnits::formatWithUnit(
            model->getOptionsModel()->getDisplayUnit(), balances.balance));
    }
}

void SendCoinsDialog::updateDisplayUnit() {
    setBalance(model->wallet().getBalances());
    ui->customFee->setDisplayUnit(model->getOptionsModel()->getDisplayUnit());
    updateMinFeeLabel();
    updateSmartFeeLabel();
}

void SendCoinsDialog::processSendCoinsReturn(
    const WalletModel::SendCoinsReturn &sendCoinsReturn,
    const QString &msgArg) {
    QPair<QString, CClientUIInterface::MessageBoxFlags> msgParams;
    // Default to a warning message, override if error message is needed
    msgParams.second = CClientUIInterface::MSG_WARNING;

    // This comment is specific to SendCoinsDialog usage of
    // WalletModel::SendCoinsReturn.
    // WalletModel::TransactionCommitFailed is used only in
    // WalletModel::sendCoins() all others are used only in
    // WalletModel::prepareTransaction()
    switch (sendCoinsReturn.status) {
        case WalletModel::InvalidAddress:
            msgParams.first =
                tr("The recipient address is not valid. Please recheck.");
            break;
        case WalletModel::InvalidAmount:
            msgParams.first = tr("The amount to pay must be larger than 0.");
            break;
        case WalletModel::AmountExceedsBalance:
            msgParams.first = tr("The amount exceeds your balance.");
            break;
        case WalletModel::AmountWithFeeExceedsBalance:
            msgParams.first = tr("The total exceeds your balance when the %1 "
                                 "transaction fee is included.")
                                  .arg(msgArg);
            break;
        case WalletModel::DuplicateAddress:
            msgParams.first = tr("Duplicate address found: addresses should "
                                 "only be used once each.");
            break;
        case WalletModel::TransactionCreationFailed:
            msgParams.first = tr("Transaction creation failed!");
            msgParams.second = CClientUIInterface::MSG_ERROR;
            break;
        case WalletModel::TransactionCommitFailed:
            msgParams.first =
                tr("The transaction was rejected with the following reason: %1")
                    .arg(sendCoinsReturn.reasonCommitFailed);
            msgParams.second = CClientUIInterface::MSG_ERROR;
            break;
        case WalletModel::AbsurdFee:
            msgParams.first =
                tr("A fee higher than %1 is considered an absurdly high fee.")
                    .arg(BitcoinUnits::formatWithUnit(
                        model->getOptionsModel()->getDisplayUnit(),
                        model->node().getMaxTxFee()));
            break;
        case WalletModel::PaymentRequestExpired:
            msgParams.first = tr("Payment request expired.");
            msgParams.second = CClientUIInterface::MSG_ERROR;
            break;
        // included to prevent a compiler warning.
        case WalletModel::OK:
        default:
            return;
    }

    Q_EMIT message(tr("Send Coins"), msgParams.first, msgParams.second);
}

void SendCoinsDialog::minimizeFeeSection(bool fMinimize) {
    ui->labelFeeMinimized->setVisible(fMinimize);
    ui->buttonChooseFee->setVisible(fMinimize);
    ui->buttonMinimizeFee->setVisible(!fMinimize);
    ui->frameFeeSelection->setVisible(!fMinimize);
    ui->horizontalLayoutSmartFee->setContentsMargins(0, (fMinimize ? 0 : 6), 0,
                                                     0);
    fFeeMinimized = fMinimize;
}

void SendCoinsDialog::on_buttonChooseFee_clicked() {
    minimizeFeeSection(false);
}

void SendCoinsDialog::on_buttonMinimizeFee_clicked() {
    updateFeeMinimizedLabel();
    minimizeFeeSection(true);
}

void SendCoinsDialog::useAvailableBalance(SendCoinsEntry *entry) {
    // Get CCoinControl instance if CoinControl is enabled or create a new one.
    CCoinControl coin_control;
    if (model->getOptionsModel()->getCoinControlFeatures()) {
        coin_control = *CoinControlDialog::coinControl();
    }

    // Calculate available amount to send.
    Amount amount = model->wallet().getAvailableBalance(coin_control);
    for (int i = 0; i < ui->entries->count(); ++i) {
        SendCoinsEntry *e =
            qobject_cast<SendCoinsEntry *>(ui->entries->itemAt(i)->widget());
        if (e && !e->isHidden() && e != entry) {
            amount -= e->getValue().amount;
        }
    }

    if (amount > Amount::zero()) {
        entry->checkSubtractFeeFromAmount();
        entry->setAmount(amount);
    } else {
        entry->setAmount(Amount::zero());
    }
}

void SendCoinsDialog::setMinimumFee() {
    ui->radioCustomPerKilobyte->setChecked(true);
    ui->customFee->setValue(model->node().getMinimumFee(1000));
}

void SendCoinsDialog::updateFeeSectionControls() {
    ui->labelSmartFee->setEnabled(ui->radioSmartFee->isChecked());
    ui->labelSmartFee2->setEnabled(ui->radioSmartFee->isChecked());
    ui->labelFeeEstimation->setEnabled(ui->radioSmartFee->isChecked());
    ui->checkBoxMinimumFee->setEnabled(ui->radioCustomFee->isChecked());
    ui->labelMinFeeWarning->setEnabled(ui->radioCustomFee->isChecked());
    ui->radioCustomPerKilobyte->setEnabled(
        ui->radioCustomFee->isChecked() &&
        !ui->checkBoxMinimumFee->isChecked());
    ui->customFee->setEnabled(ui->radioCustomFee->isChecked() &&
                              !ui->checkBoxMinimumFee->isChecked());
}

void SendCoinsDialog::updateFeeMinimizedLabel() {
    if (!model || !model->getOptionsModel()) {
        return;
    }

    if (ui->radioSmartFee->isChecked()) {
        ui->labelFeeMinimized->setText(ui->labelSmartFee->text());
    } else {
        ui->labelFeeMinimized->setText(
            BitcoinUnits::formatWithUnit(
                model->getOptionsModel()->getDisplayUnit(),
                ui->customFee->value()) +
            ((ui->radioCustomPerKilobyte->isChecked()) ? "/kB" : ""));
    }
}

void SendCoinsDialog::updateMinFeeLabel() {
    if (model && model->getOptionsModel()) {
        ui->checkBoxMinimumFee->setText(
            tr("Pay only the required fee of %1")
                .arg(BitcoinUnits::formatWithUnit(
                         model->getOptionsModel()->getDisplayUnit(),
                         model->node().getMinimumFee(1000)) +
                     "/kB"));
    }
}

void SendCoinsDialog::updateCoinControlState(CCoinControl &ctrl) {
    if (ui->radioCustomFee->isChecked()) {
        ctrl.m_feerate = CFeeRate(ui->customFee->value());
    } else {
        ctrl.m_feerate.reset();
    }
}

void SendCoinsDialog::updateSmartFeeLabel() {
    if (!model || !model->getOptionsModel()) {
        return;
    }

    CFeeRate feeRate = model->node().estimateSmartFee();

    ui->labelSmartFee->setText(
        BitcoinUnits::formatWithUnit(
            model->getOptionsModel()->getDisplayUnit(),
            std::max(feeRate.GetFeePerK(), model->node().getMinimumFee(1000))) +
        "/kB");
    // not enough data => minfee
    if (feeRate <= CFeeRate(Amount::zero())) {
        // (Smart fee not initialized yet. This usually takes a few blocks...)
        ui->labelSmartFee2->show();
        ui->labelFeeEstimation->setText("");
    } else {
        ui->labelSmartFee2->hide();
        ui->labelFeeEstimation->setText(
            tr("Estimated to begin confirmation by next block."));
    }

    updateFeeMinimizedLabel();
}

// Coin Control: copy label "Quantity" to clipboard
void SendCoinsDialog::coinControlClipboardQuantity() {
    GUIUtil::setClipboard(ui->labelCoinControlQuantity->text());
}

// Coin Control: copy label "Amount" to clipboard
void SendCoinsDialog::coinControlClipboardAmount() {
    GUIUtil::setClipboard(ui->labelCoinControlAmount->text().left(
        ui->labelCoinControlAmount->text().indexOf(" ")));
}

// Coin Control: copy label "Fee" to clipboard
void SendCoinsDialog::coinControlClipboardFee() {
    GUIUtil::setClipboard(
        ui->labelCoinControlFee->text()
            .left(ui->labelCoinControlFee->text().indexOf(" "))
            .replace(ASYMP_UTF8, ""));
}

// Coin Control: copy label "After fee" to clipboard
void SendCoinsDialog::coinControlClipboardAfterFee() {
    GUIUtil::setClipboard(
        ui->labelCoinControlAfterFee->text()
            .left(ui->labelCoinControlAfterFee->text().indexOf(" "))
            .replace(ASYMP_UTF8, ""));
}

// Coin Control: copy label "Bytes" to clipboard
void SendCoinsDialog::coinControlClipboardBytes() {
    GUIUtil::setClipboard(
        ui->labelCoinControlBytes->text().replace(ASYMP_UTF8, ""));
}

// Coin Control: copy label "Dust" to clipboard
void SendCoinsDialog::coinControlClipboardLowOutput() {
    GUIUtil::setClipboard(ui->labelCoinControlLowOutput->text());
}

// Coin Control: copy label "Change" to clipboard
void SendCoinsDialog::coinControlClipboardChange() {
    GUIUtil::setClipboard(
        ui->labelCoinControlChange->text()
            .left(ui->labelCoinControlChange->text().indexOf(" "))
            .replace(ASYMP_UTF8, ""));
}

// Coin Control: settings menu - coin control enabled/disabled by user
void SendCoinsDialog::coinControlFeatureChanged(bool checked) {
    ui->frameCoinControl->setVisible(checked);

    // coin control features disabled
    if (!checked && model) {
        CoinControlDialog::coinControl()->SetNull();
    }

    coinControlUpdateLabels();
}

// Coin Control: button inputs -> show actual coin control dialog
void SendCoinsDialog::coinControlButtonClicked() {
    CoinControlDialog dlg(platformStyle);
    dlg.setModel(model);
    dlg.exec();
    coinControlUpdateLabels();
}

// Coin Control: checkbox custom change address
void SendCoinsDialog::coinControlChangeChecked(int state) {
    if (state == Qt::Unchecked) {
        CoinControlDialog::coinControl()->destChange = CNoDestination();
        ui->labelCoinControlChangeLabel->clear();
    } else {
        // use this to re-validate an already entered address
        coinControlChangeEdited(ui->lineEditCoinControlChange->text());
    }

    ui->lineEditCoinControlChange->setEnabled((state == Qt::Checked));
}

// Coin Control: custom change address changed
void SendCoinsDialog::coinControlChangeEdited(const QString &text) {
    if (model && model->getAddressTableModel()) {
        // Default to no change address until verified
        CoinControlDialog::coinControl()->destChange = CNoDestination();
        ui->labelCoinControlChangeLabel->setStyleSheet("QLabel{color:red;}");

        const CTxDestination dest =
            DecodeDestination(text.toStdString(), model->getChainParams());

        if (text.isEmpty()) {
            // Nothing entered
            ui->labelCoinControlChangeLabel->setText("");
        } else if (!IsValidDestination(dest)) {
            // Invalid address
            ui->labelCoinControlChangeLabel->setText(
                tr("Warning: Invalid Bitcoin address"));
        } else {
            // Valid address
            if (!model->wallet().isSpendable(dest)) {
                ui->labelCoinControlChangeLabel->setText(
                    tr("Warning: Unknown change address"));

                // confirmation dialog
                QMessageBox::StandardButton btnRetVal = QMessageBox::question(
                    this, tr("Confirm custom change address"),
                    tr("The address you selected for change is not part of "
                       "this wallet. Any or all funds in your wallet may be "
                       "sent to this address. Are you sure?"),
                    QMessageBox::Yes | QMessageBox::Cancel,
                    QMessageBox::Cancel);

                if (btnRetVal == QMessageBox::Yes) {
                    CoinControlDialog::coinControl()->destChange = dest;
                } else {
                    ui->lineEditCoinControlChange->setText("");
                    ui->labelCoinControlChangeLabel->setStyleSheet(
                        "QLabel{color:black;}");
                    ui->labelCoinControlChangeLabel->setText("");
                }
            } else {
                // Known change address
                ui->labelCoinControlChangeLabel->setStyleSheet(
                    "QLabel{color:black;}");

                // Query label
                QString associatedLabel =
                    model->getAddressTableModel()->labelForAddress(text);
                if (!associatedLabel.isEmpty()) {
                    ui->labelCoinControlChangeLabel->setText(associatedLabel);
                } else {
                    ui->labelCoinControlChangeLabel->setText(tr("(no label)"));
                }

                CoinControlDialog::coinControl()->destChange = dest;
            }
        }
    }
}

// Coin Control: update labels
void SendCoinsDialog::coinControlUpdateLabels() {
    if (!model || !model->getOptionsModel()) {
        return;
    }

    updateCoinControlState(*CoinControlDialog::coinControl());

    // set pay amounts
    CoinControlDialog::payAmounts.clear();
    CoinControlDialog::fSubtractFeeFromAmount = false;
    for (int i = 0; i < ui->entries->count(); ++i) {
        SendCoinsEntry *entry =
            qobject_cast<SendCoinsEntry *>(ui->entries->itemAt(i)->widget());
        if (entry && !entry->isHidden()) {
            SendCoinsRecipient rcp = entry->getValue();
            CoinControlDialog::payAmounts.append(rcp.amount);
            if (rcp.fSubtractFeeFromAmount) {
                CoinControlDialog::fSubtractFeeFromAmount = true;
            }
        }
    }

    if (CoinControlDialog::coinControl()->HasSelected()) {
        // actual coin control calculation
        CoinControlDialog::updateLabels(model, this);

        // show coin control stats
        ui->labelCoinControlAutomaticallySelected->hide();
        ui->widgetCoinControl->show();
    } else {
        // hide coin control stats
        ui->labelCoinControlAutomaticallySelected->show();
        ui->widgetCoinControl->hide();
        ui->labelCoinControlInsuffFunds->hide();
    }
}

SendConfirmationDialog::SendConfirmationDialog(const QString &title,
                                               const QString &text,
                                               int _secDelay, QWidget *parent)
    : QMessageBox(QMessageBox::Question, title, text,
                  QMessageBox::Yes | QMessageBox::Cancel, parent),
      secDelay(_secDelay) {
    setDefaultButton(QMessageBox::Cancel);
    yesButton = button(QMessageBox::Yes);
    updateYesButton();
    connect(&countDownTimer, SIGNAL(timeout()), this, SLOT(countDown()));
}

int SendConfirmationDialog::exec() {
    updateYesButton();
    countDownTimer.start(1000);
    return QMessageBox::exec();
}

void SendConfirmationDialog::countDown() {
    secDelay--;
    updateYesButton();

    if (secDelay <= 0) {
        countDownTimer.stop();
    }
}

void SendConfirmationDialog::updateYesButton() {
    if (secDelay > 0) {
        yesButton->setEnabled(false);
        yesButton->setText(tr("Yes") + " (" + QString::number(secDelay) + ")");
    } else {
        yesButton->setEnabled(true);
        yesButton->setText(tr("Yes"));
    }
}
