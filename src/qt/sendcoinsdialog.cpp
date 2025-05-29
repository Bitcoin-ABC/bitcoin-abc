// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#if defined(HAVE_CONFIG_H)
#include <config/bitcoin-config.h>
#endif

#include <qt/forms/ui_sendcoinsdialog.h>
#include <qt/sendcoinsdialog.h>

#include <chainparams.h>
#include <interfaces/node.h>
#include <key_io.h>
#include <node/ui_interface.h>
#include <qt/addresstablemodel.h>
#include <qt/bitcoinunits.h>
#include <qt/clientmodel.h>
#include <qt/coincontroldialog.h>
#include <qt/guiutil.h>
#include <qt/optionsmodel.h>
#include <qt/platformstyle.h>
#include <qt/sendcoinsentry.h>
#include <txmempool.h>
#include <wallet/coincontrol.h>
#include <wallet/fees.h>
#include <wallet/wallet.h>

#include <validation.h>

#include <array>
#include <fstream>
#include <memory>

#include <QScrollBar>
#include <QSettings>
#include <QTextDocument>

SendCoinsDialog::SendCoinsDialog(const PlatformStyle *_platformStyle,
                                 WalletModel *_model, QWidget *parent)
    : QDialog(parent), ui(new Ui::SendCoinsDialog), clientModel(nullptr),
      model(_model), m_coin_control(new CCoinControl),
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

    connect(ui->addButton, &QPushButton::clicked, this,
            &SendCoinsDialog::addEntry);
    connect(ui->clearButton, &QPushButton::clicked, this,
            &SendCoinsDialog::clear);

    // Coin Control
    connect(ui->pushButtonCoinControl, &QPushButton::clicked, this,
            &SendCoinsDialog::coinControlButtonClicked);
    connect(ui->checkBoxCoinControlChange, &QCheckBox::stateChanged, this,
            &SendCoinsDialog::coinControlChangeChecked);
    connect(ui->lineEditCoinControlChange, &QValidatedLineEdit::textEdited,
            this, &SendCoinsDialog::coinControlChangeEdited);

    // Coin Control: clipboard actions
    QAction *clipboardQuantityAction = new QAction(tr("Copy quantity"), this);
    QAction *clipboardAmountAction = new QAction(tr("Copy amount"), this);
    QAction *clipboardFeeAction = new QAction(tr("Copy fee"), this);
    QAction *clipboardAfterFeeAction = new QAction(tr("Copy after fee"), this);
    QAction *clipboardBytesAction = new QAction(tr("Copy bytes"), this);
    QAction *clipboardLowOutputAction = new QAction(tr("Copy dust"), this);
    QAction *clipboardChangeAction = new QAction(tr("Copy change"), this);
    connect(clipboardQuantityAction, &QAction::triggered, this,
            &SendCoinsDialog::coinControlClipboardQuantity);
    connect(clipboardAmountAction, &QAction::triggered, this,
            &SendCoinsDialog::coinControlClipboardAmount);
    connect(clipboardFeeAction, &QAction::triggered, this,
            &SendCoinsDialog::coinControlClipboardFee);
    connect(clipboardAfterFeeAction, &QAction::triggered, this,
            &SendCoinsDialog::coinControlClipboardAfterFee);
    connect(clipboardBytesAction, &QAction::triggered, this,
            &SendCoinsDialog::coinControlClipboardBytes);
    connect(clipboardLowOutputAction, &QAction::triggered, this,
            &SendCoinsDialog::coinControlClipboardLowOutput);
    connect(clipboardChangeAction, &QAction::triggered, this,
            &SendCoinsDialog::coinControlClipboardChange);
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
    if (!settings.contains("nTransactionFee")) {
        settings.setValue("nTransactionFee",
                          qint64(DEFAULT_PAY_TX_FEE / SATOSHI));
    }
    ui->groupFee->setId(ui->radioSmartFee, 0);
    ui->groupFee->setId(ui->radioCustomFee, 1);
    ui->groupFee
        ->button(
            std::max<int>(0, std::min(1, settings.value("nFeeRadio").toInt())))
        ->setChecked(true);
    ui->customFee->SetAllowEmpty(false);
    ui->customFee->setValue(
        int64_t(settings.value("nTransactionFee").toLongLong()) * SATOSHI);
    minimizeFeeSection(settings.value("fFeeSectionMinimized").toBool());

    // Set the model properly.
    setModel(model);
}

void SendCoinsDialog::setClientModel(ClientModel *_clientModel) {
    this->clientModel = _clientModel;

    if (_clientModel) {
        connect(_clientModel, &ClientModel::numBlocksChanged, this,
                &SendCoinsDialog::updateNumberOfBlocks);
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
        connect(_model, &WalletModel::balanceChanged, this,
                &SendCoinsDialog::setBalance);
        connect(_model->getOptionsModel(), &OptionsModel::displayUnitChanged,
                this, &SendCoinsDialog::updateDisplayUnit);
        updateDisplayUnit();

        // Coin Control
        connect(_model->getOptionsModel(), &OptionsModel::displayUnitChanged,
                this, &SendCoinsDialog::coinControlUpdateLabels);
        connect(_model->getOptionsModel(),
                &OptionsModel::coinControlFeaturesChanged, this,
                &SendCoinsDialog::coinControlFeatureChanged);
        ui->frameCoinControl->setVisible(
            _model->getOptionsModel()->getCoinControlFeatures());
        coinControlUpdateLabels();

        // fee section
#if (QT_VERSION >= QT_VERSION_CHECK(5, 15, 0))
        const auto buttonClickedEvent =
            QOverload<int>::of(&QButtonGroup::idClicked);
#else
        /* QOverload in introduced from Qt 5.7, but we support down to 5.5.1 */
        const auto buttonClickedEvent =
            static_cast<void (QButtonGroup::*)(int)>(
                &QButtonGroup::buttonClicked);
#endif
        connect(ui->groupFee, buttonClickedEvent, this,
                &SendCoinsDialog::updateFeeSectionControls);
        connect(ui->groupFee, buttonClickedEvent, this,
                &SendCoinsDialog::coinControlUpdateLabels);
        connect(ui->customFee, &BitcoinAmountField::valueChanged, this,
                &SendCoinsDialog::coinControlUpdateLabels);
        Amount requiredFee = model->wallet().getRequiredFee(1000);
        ui->customFee->SetMinValue(requiredFee);
        if (ui->customFee->value() < requiredFee) {
            ui->customFee->setValue(requiredFee);
        }
        ui->customFee->setSingleStep(requiredFee);
        updateFeeSectionControls();
        updateSmartFeeLabel();

        if (model->wallet().privateKeysDisabled()) {
            ui->sendButton->setText(tr("Cr&eate Unsigned"));
            ui->sendButton->setToolTip(
                tr("Creates a Partially Signed Bitcoin Transaction (PSBT) for "
                   "use with e.g. an offline %1 wallet, or a PSBT-compatible "
                   "hardware wallet.")
                    .arg(PACKAGE_NAME));
        }
    }
}

SendCoinsDialog::~SendCoinsDialog() {
    QSettings settings;
    settings.setValue("fFeeSectionMinimized", fFeeMinimized);
    settings.setValue("nFeeRadio", ui->groupFee->checkedId());
    settings.setValue("nTransactionFee",
                      qint64(ui->customFee->value() / SATOSHI));

    delete ui;
}

bool SendCoinsDialog::PrepareSendText(QString &question_string,
                                      QString &informative_text,
                                      QString &detailed_text) {
    QList<SendCoinsRecipient> recipients;
    bool valid = true;

    for (int i = 0; i < ui->entries->count(); ++i) {
        SendCoinsEntry *entry =
            qobject_cast<SendCoinsEntry *>(ui->entries->itemAt(i)->widget());
        if (entry) {
            if (entry->validate(model->node())) {
                recipients.append(entry->getValue());
            } else if (valid) {
                ui->scrollArea->ensureWidgetVisible(entry);
                valid = false;
            }
        }
    }

    if (!valid || recipients.isEmpty()) {
        return false;
    }

    fNewRecipientAllowed = false;
    WalletModel::UnlockContext ctx(model->requestUnlock());
    if (!ctx.isValid()) {
        // Unlock wallet was cancelled
        fNewRecipientAllowed = true;
        return false;
    }

    // prepare transaction for getting txFee earlier
    m_current_transaction =
        std::make_unique<WalletModelTransaction>(recipients);
    WalletModel::SendCoinsReturn prepareStatus;

    updateCoinControlState(*m_coin_control);

    prepareStatus =
        model->prepareTransaction(*m_current_transaction, *m_coin_control);

    // process prepareStatus and on error generate message shown to user
    processSendCoinsReturn(prepareStatus,
                           BitcoinUnits::formatWithUnit(
                               model->getOptionsModel()->getDisplayUnit(),
                               m_current_transaction->getTransactionFee()));

    if (prepareStatus.status != WalletModel::OK) {
        fNewRecipientAllowed = true;
        return false;
    }

    Amount txFee = m_current_transaction->getTransactionFee();
    QStringList formatted;
    for (const SendCoinsRecipient &rcp :
         m_current_transaction->getRecipients()) {
        // generate amount string with wallet name in case of multiwallet
        QString amount = BitcoinUnits::formatWithUnit(
            model->getOptionsModel()->getDisplayUnit(), rcp.amount);
        if (model->isMultiwallet()) {
            amount.append(
                tr(" from wallet '%1'")
                    .arg(GUIUtil::HtmlEscape(model->getWalletName())));
        }
        // generate address string
        QString address = rcp.address;

        QString recipientElement;

#ifdef ENABLE_BIP70
        // normal payment
        if (!rcp.paymentRequest.IsInitialized())
#endif
        {
            if (rcp.label.length() > 0) {
                // label with address
                recipientElement.append(
                    tr("%1 to '%2'")
                        .arg(amount, GUIUtil::HtmlEscape(rcp.label)));
                recipientElement.append(QString(" (%1)").arg(address));
            } else {
                // just address
                recipientElement.append(tr("%1 to %2").arg(amount, address));
            }
        }
#ifdef ENABLE_BIP70
        // authenticated payment request
        else if (!rcp.authenticatedMerchant.isEmpty()) {
            recipientElement.append(
                tr("%1 to '%2'").arg(amount, rcp.authenticatedMerchant));
        } else {
            // unauthenticated payment request
            recipientElement.append(tr("%1 to %2").arg(amount, address));
        }
#endif

        formatted.append(recipientElement);
    }

    if (model->wallet().privateKeysDisabled()) {
        question_string.append(tr("Do you want to draft this transaction?"));
    } else {
        question_string.append(tr("Are you sure you want to send?"));
    }

    question_string.append("<br /><span style='font-size:10pt;'>");
    if (model->wallet().privateKeysDisabled()) {
        question_string.append(
            tr("Please, review your transaction proposal. This will produce a "
               "Partially Signed Bitcoin Transaction (PSBT) which you can save "
               "or copy and then sign with e.g. an offline %1 wallet, or a "
               "PSBT-compatible hardware wallet.")
                .arg(PACKAGE_NAME));
    } else {
        question_string.append(tr("Please, review your transaction."));
    }
    question_string.append("</span>%1");

    if (txFee > Amount::zero()) {
        // append fee string if a fee is required
        question_string.append("<hr /><b>");
        question_string.append(tr("Transaction fee"));
        question_string.append("</b>");

        // append transaction size
        question_string.append(
            " (" +
            QString::number(
                (double)m_current_transaction->getTransactionSize() / 1000) +
            " kB): ");

        // append transaction fee value
        question_string.append(
            "<span style='color:#aa0000; font-weight:bold;'>");
        question_string.append(BitcoinUnits::formatHtmlWithUnit(
            model->getOptionsModel()->getDisplayUnit(), txFee));
        question_string.append("</span><br />");
    }

    // add total amount in all subdivision units
    question_string.append("<hr />");
    Amount totalAmount =
        m_current_transaction->getTotalTransactionAmount() + txFee;
    QStringList alternativeUnits;
    for (const BitcoinUnits::Unit u : BitcoinUnits::availableUnits()) {
        if (u != model->getOptionsModel()->getDisplayUnit()) {
            alternativeUnits.append(
                BitcoinUnits::formatHtmlWithUnit(u, totalAmount));
        }
    }
    question_string.append(
        QString("<b>%1</b>: <b>%2</b>")
            .arg(tr("Total Amount"))
            .arg(BitcoinUnits::formatHtmlWithUnit(
                model->getOptionsModel()->getDisplayUnit(), totalAmount)));
    question_string.append(
        QString("<br /><span style='font-size:10pt; "
                "font-weight:normal;'>(=%1)</span>")
            .arg(alternativeUnits.join(" " + tr("or") + " ")));

    if (formatted.size() > 1) {
        question_string = question_string.arg("");
        informative_text =
            tr("To review recipient list click \"Show Details...\"");
        detailed_text = formatted.join("\n\n");
    } else {
        question_string = question_string.arg("<br /><br />" + formatted.at(0));
    }

    return true;
}

void SendCoinsDialog::on_sendButton_clicked() {
    if (!model || !model->getOptionsModel()) {
        return;
    }

    QString question_string, informative_text, detailed_text;
    if (!PrepareSendText(question_string, informative_text, detailed_text)) {
        return;
    }
    assert(m_current_transaction);

    const QString confirmation = model->wallet().privateKeysDisabled()
                                     ? tr("Confirm transaction proposal")
                                     : tr("Confirm send coins");
    const QString confirmButtonText = model->wallet().privateKeysDisabled()
                                          ? tr("Create Unsigned")
                                          : tr("Send");
    auto confirmationDialog = new SendConfirmationDialog(
        confirmation, question_string, informative_text, detailed_text,
        SEND_CONFIRM_DELAY, confirmButtonText, this);
    confirmationDialog->setAttribute(Qt::WA_DeleteOnClose);
    // TODO: Replace QDialog::exec() with safer QDialog::show().
    const auto retval =
        static_cast<QMessageBox::StandardButton>(confirmationDialog->exec());

    if (retval != QMessageBox::Yes) {
        fNewRecipientAllowed = true;
        return;
    }

    bool send_failure = false;
    if (model->wallet().privateKeysDisabled()) {
        CMutableTransaction mtx =
            CMutableTransaction{*(m_current_transaction->getWtx())};
        PartiallySignedTransaction psbtx(mtx);
        bool complete = false;
        const TransactionError err = model->wallet().fillPSBT(
            SigHashType().withForkId(), false /* sign */,
            true /* bip32derivs */, psbtx, complete);
        assert(!complete);
        assert(err == TransactionError::OK);
        // Serialize the PSBT
        CDataStream ssTx(SER_NETWORK, PROTOCOL_VERSION);
        ssTx << psbtx;
        GUIUtil::setClipboard(EncodeBase64(ssTx.str()).c_str());
        QMessageBox msgBox;
        msgBox.setText("Unsigned Transaction");
        msgBox.setInformativeText(
            "The PSBT has been copied to the clipboard. You can also save it.");
        msgBox.setStandardButtons(QMessageBox::Save | QMessageBox::Discard);
        msgBox.setDefaultButton(QMessageBox::Discard);
        switch (msgBox.exec()) {
            case QMessageBox::Save: {
                QString selectedFilter;
                QString fileNameSuggestion = "";
                bool first = true;
                for (const SendCoinsRecipient &rcp :
                     m_current_transaction->getRecipients()) {
                    if (!first) {
                        fileNameSuggestion.append(" - ");
                    }
                    QString labelOrAddress =
                        rcp.label.isEmpty() ? rcp.address : rcp.label;
                    QString amount = BitcoinUnits::formatWithUnit(
                        model->getOptionsModel()->getDisplayUnit(), rcp.amount);
                    fileNameSuggestion.append(labelOrAddress + "-" + amount);
                    first = false;
                }
                fileNameSuggestion.append(".psbt");
                QString filename = GUIUtil::getSaveFileName(
                    this, tr("Save Transaction Data"), fileNameSuggestion,
                    tr("Partially Signed Transaction (Binary) (*.psbt)"),
                    &selectedFilter);
                if (filename.isEmpty()) {
                    return;
                }
                std::ofstream out{filename.toLocal8Bit().data(),
                                  std::ofstream::out | std::ofstream::binary};
                out << ssTx.str();
                out.close();
                Q_EMIT message(tr("PSBT saved"), "PSBT saved to disk",
                               CClientUIInterface::MSG_INFORMATION);
                break;
            }
            case QMessageBox::Discard:
                break;
            default:
                assert(false);
        }
    } else {
        // now send the prepared transaction
        WalletModel::SendCoinsReturn sendStatus =
            model->sendCoins(*m_current_transaction);
        // process sendStatus and on error generate message shown to user
        processSendCoinsReturn(sendStatus);

        if (sendStatus.status == WalletModel::OK) {
            Q_EMIT coinsSent(m_current_transaction->getWtx()->GetId());
        } else {
            send_failure = true;
        }
    }
    if (!send_failure) {
        accept();
        m_coin_control->UnSelectAll();
        coinControlUpdateLabels();
    }
    fNewRecipientAllowed = true;
    m_current_transaction.reset();
}

void SendCoinsDialog::clear() {
    m_current_transaction.reset();

    // Clear coin control settings
    m_coin_control->UnSelectAll();
    ui->checkBoxCoinControlChange->setChecked(false);
    ui->lineEditCoinControlChange->clear();
    coinControlUpdateLabels();

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
    SendCoinsEntry *entry = new SendCoinsEntry(platformStyle, model, this);
    ui->entries->addWidget(entry);
    connect(entry, &SendCoinsEntry::removeEntry, this,
            &SendCoinsDialog::removeEntry);
    connect(entry, &SendCoinsEntry::useAvailableBalance, this,
            &SendCoinsDialog::useAvailableBalance);
    connect(entry, &SendCoinsEntry::payAmountChanged, this,
            &SendCoinsDialog::coinControlUpdateLabels);
    connect(entry, &SendCoinsEntry::subtractFeeFromAmountChanged, this,
            &SendCoinsDialog::coinControlUpdateLabels);

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
    setupTabChain(nullptr);
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
    SendCoinsEntry *entry = nullptr;
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

    SendCoinsEntry *entry = nullptr;
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
        Amount balance = balances.balance;
        if (model->wallet().privateKeysDisabled()) {
            balance = balances.watch_only_balance;
            ui->labelBalanceName->setText(tr("Watch-only balance:"));
        }
        ui->labelBalance->setText(BitcoinUnits::formatWithUnit(
            model->getOptionsModel()->getDisplayUnit(), balance));
    }
}

void SendCoinsDialog::updateDisplayUnit() {
    setBalance(model->wallet().getBalances());
    ui->customFee->setDisplayUnit(model->getOptionsModel()->getDisplayUnit());
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
    // All status values are used only in WalletModel::prepareTransaction()
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
        case WalletModel::AbsurdFee:
            msgParams.first =
                tr("A fee higher than %1 is considered an absurdly high fee.")
                    .arg(BitcoinUnits::formatWithUnit(
                        model->getOptionsModel()->getDisplayUnit(),
                        model->wallet().getDefaultMaxTxFee()));
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
    // Include watch-only for wallets without private key
    m_coin_control->fAllowWatchOnly = model->wallet().privateKeysDisabled();

    // Calculate available amount to send.
    Amount amount = model->wallet().getAvailableBalance(*m_coin_control);
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

void SendCoinsDialog::updateFeeSectionControls() {
    ui->labelSmartFee->setEnabled(ui->radioSmartFee->isChecked());
    ui->labelSmartFee2->setEnabled(ui->radioSmartFee->isChecked());
    ui->labelFeeEstimation->setEnabled(ui->radioSmartFee->isChecked());
    ui->labelCustomFeeWarning->setEnabled(ui->radioCustomFee->isChecked());
    ui->labelCustomPerKilobyte->setEnabled(ui->radioCustomFee->isChecked());
    ui->customFee->setEnabled(ui->radioCustomFee->isChecked());
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
            "/kB");
    }
}

void SendCoinsDialog::updateCoinControlState(CCoinControl &ctrl) {
    if (ui->radioCustomFee->isChecked()) {
        ctrl.m_feerate = CFeeRate(ui->customFee->value());
    } else {
        ctrl.m_feerate.reset();
    }
    // Include watch-only for wallets without private key
    ctrl.fAllowWatchOnly = model->wallet().privateKeysDisabled();
}

void SendCoinsDialog::updateNumberOfBlocks(int count,
                                           const QDateTime &blockDate,
                                           double nVerificationProgress,
                                           SyncType synctype,
                                           SynchronizationState sync_state) {
    if (sync_state == SynchronizationState::POST_INIT) {
        updateSmartFeeLabel();
    }
}

void SendCoinsDialog::updateSmartFeeLabel() {
    if (!model || !model->getOptionsModel()) {
        return;
    }

    updateCoinControlState(*m_coin_control);
    // Explicitly use only fee estimation rate for smart fee labels
    m_coin_control->m_feerate.reset();
    CFeeRate feeRate(model->wallet().getMinimumFee(1000, *m_coin_control));

    ui->labelSmartFee->setText(
        BitcoinUnits::formatWithUnit(model->getOptionsModel()->getDisplayUnit(),
                                     feeRate.GetFeePerK()) +
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
        m_coin_control->SetNull();
    }

    coinControlUpdateLabels();
}

// Coin Control: button inputs -> show actual coin control dialog
void SendCoinsDialog::coinControlButtonClicked() {
    auto dlg = new CoinControlDialog(*m_coin_control, model, platformStyle);
    connect(dlg, &QDialog::finished, this,
            &SendCoinsDialog::coinControlUpdateLabels);
    GUIUtil::ShowModalDialogAsynchronously(dlg);
}

// Coin Control: checkbox custom change address
void SendCoinsDialog::coinControlChangeChecked(int state) {
    if (state == Qt::Unchecked) {
        m_coin_control->destChange = CNoDestination();
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
        m_coin_control->destChange = CNoDestination();
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
                    m_coin_control->destChange = dest;
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

                m_coin_control->destChange = dest;
            }
        }
    }
}

// Coin Control: update labels
void SendCoinsDialog::coinControlUpdateLabels() {
    if (!model || !model->getOptionsModel()) {
        return;
    }

    updateCoinControlState(*m_coin_control);

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

    if (m_coin_control->HasSelected()) {
        // actual coin control calculation
        CoinControlDialog::updateLabels(*m_coin_control, model, this);

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

SendConfirmationDialog::SendConfirmationDialog(
    const QString &title, const QString &text, const QString &informative_text,
    const QString &detailed_text, int _secDelay,
    const QString &_confirmButtonText, QWidget *parent)
    : QMessageBox(parent), secDelay(_secDelay),
      confirmButtonText(_confirmButtonText) {
    setIcon(QMessageBox::Question);
    // On macOS, the window title is ignored (as required by the macOS
    // Guidelines).
    setWindowTitle(title);
    setText(text);
    setInformativeText(informative_text);
    setDetailedText(detailed_text);
    setStandardButtons(QMessageBox::Yes | QMessageBox::Cancel);
    setDefaultButton(QMessageBox::Cancel);
    yesButton = button(QMessageBox::Yes);
    updateYesButton();
    connect(&countDownTimer, &QTimer::timeout, this,
            &SendConfirmationDialog::countDown);
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
        yesButton->setText(confirmButtonText + " (" +
                           QString::number(secDelay) + ")");
    } else {
        yesButton->setEnabled(true);
        yesButton->setText(confirmButtonText);
    }
}
