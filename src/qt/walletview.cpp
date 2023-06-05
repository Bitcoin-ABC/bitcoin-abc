// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <qt/walletview.h>

#include <config.h> // For GetConfig
#include <interfaces/node.h>
#include <node/psbt.h>
#include <node/transaction.h>
#include <node/ui_interface.h>
#include <policy/policy.h>
#include <qt/addressbookpage.h>
#include <qt/askpassphrasedialog.h>
#include <qt/clientmodel.h>
#include <qt/guiutil.h>
#include <qt/optionsmodel.h>
#include <qt/overviewpage.h>
#include <qt/platformstyle.h>
#include <qt/receivecoinsdialog.h>
#include <qt/sendcoinsdialog.h>
#include <qt/signverifymessagedialog.h>
#include <qt/transactiontablemodel.h>
#include <qt/transactionview.h>
#include <qt/walletmodel.h>
#include <util/strencodings.h>

#include <QAction>
#include <QActionGroup>
#include <QFileDialog>
#include <QHBoxLayout>
#include <QProgressDialog>
#include <QPushButton>
#include <QVBoxLayout>

#include <fstream>

using node::AnalyzePSBT;
using node::DEFAULT_MAX_RAW_TX_FEE_RATE;
using node::PSBTAnalysis;

WalletView::WalletView(const PlatformStyle *_platformStyle,
                       WalletModel *_walletModel, QWidget *parent)
    : QStackedWidget(parent), clientModel(nullptr), walletModel(_walletModel),
      platformStyle(_platformStyle) {
    // Create tabs
    overviewPage = new OverviewPage(platformStyle);

    transactionsPage = new QWidget(this);
    QVBoxLayout *vbox = new QVBoxLayout();
    QHBoxLayout *hbox_buttons = new QHBoxLayout();
    transactionView = new TransactionView(platformStyle, this);
    vbox->addWidget(transactionView);
    QPushButton *exportButton = new QPushButton(tr("&Export"), this);
    exportButton->setToolTip(
        tr("Export the data in the current tab to a file"));
    if (platformStyle->getImagesOnButtons()) {
        exportButton->setIcon(platformStyle->SingleColorIcon(":/icons/export"));
    }
    hbox_buttons->addStretch();
    hbox_buttons->addWidget(exportButton);
    vbox->addLayout(hbox_buttons);
    transactionsPage->setLayout(vbox);

    receiveCoinsPage = new ReceiveCoinsDialog(platformStyle);
    sendCoinsPage = new SendCoinsDialog(platformStyle, walletModel);

    usedSendingAddressesPage =
        new AddressBookPage(platformStyle, AddressBookPage::ForEditing,
                            AddressBookPage::SendingTab, this);
    usedReceivingAddressesPage =
        new AddressBookPage(platformStyle, AddressBookPage::ForEditing,
                            AddressBookPage::ReceivingTab, this);

    addWidget(overviewPage);
    addWidget(transactionsPage);
    addWidget(receiveCoinsPage);
    addWidget(sendCoinsPage);

    connect(overviewPage, &OverviewPage::transactionClicked, this,
            &WalletView::transactionClicked);
    // Clicking on a transaction on the overview pre-selects the transaction on
    // the transaction history page
    connect(overviewPage, &OverviewPage::transactionClicked, transactionView,
            static_cast<void (TransactionView::*)(const QModelIndex &)>(
                &TransactionView::focusTransaction));

    connect(overviewPage, &OverviewPage::outOfSyncWarningClicked, this,
            &WalletView::requestedSyncWarningInfo);

    connect(sendCoinsPage, &SendCoinsDialog::coinsSent, this,
            &WalletView::coinsSent);
    // Highlight transaction after send
    connect(sendCoinsPage, &SendCoinsDialog::coinsSent, transactionView,
            static_cast<void (TransactionView::*)(const uint256 &)>(
                &TransactionView::focusTransaction));

    // Clicking on "Export" allows to export the transaction list
    connect(exportButton, &QPushButton::clicked, transactionView,
            &TransactionView::exportClicked);

    // Pass through messages from sendCoinsPage
    connect(sendCoinsPage, &SendCoinsDialog::message, this,
            &WalletView::message);
    // Pass through messages from transactionView
    connect(transactionView, &TransactionView::message, this,
            &WalletView::message);
    connect(this, &WalletView::setPrivacy, overviewPage,
            &OverviewPage::setPrivacy);

    // Set the model properly.
    setWalletModel(walletModel);
}

WalletView::~WalletView() {}

void WalletView::setClientModel(ClientModel *_clientModel) {
    this->clientModel = _clientModel;

    overviewPage->setClientModel(_clientModel);
    sendCoinsPage->setClientModel(_clientModel);
    if (walletModel) {
        walletModel->setClientModel(_clientModel);
    }
}

void WalletView::setWalletModel(WalletModel *_walletModel) {
    this->walletModel = _walletModel;

    // Put transaction list in tabs
    transactionView->setModel(_walletModel);
    overviewPage->setWalletModel(_walletModel);
    receiveCoinsPage->setModel(_walletModel);
    sendCoinsPage->setModel(_walletModel);
    usedReceivingAddressesPage->setModel(
        _walletModel ? _walletModel->getAddressTableModel() : nullptr);
    usedSendingAddressesPage->setModel(
        _walletModel ? _walletModel->getAddressTableModel() : nullptr);

    if (_walletModel) {
        // Receive and pass through messages from wallet model
        connect(_walletModel, &WalletModel::message, this,
                &WalletView::message);

        // Handle changes in encryption status
        connect(_walletModel, &WalletModel::encryptionStatusChanged, this,
                &WalletView::encryptionStatusChanged);
        updateEncryptionStatus();

        // update HD status
        Q_EMIT hdEnabledStatusChanged();

        // Balloon pop-up for new transaction
        connect(_walletModel->getTransactionTableModel(),
                &TransactionTableModel::rowsInserted, this,
                &WalletView::processNewTransaction);

        // Ask for passphrase if needed
        connect(_walletModel, &WalletModel::requireUnlock, this,
                &WalletView::unlockWallet);

        // Show progress dialog
        connect(_walletModel, &WalletModel::showProgress, this,
                &WalletView::showProgress);
    }
}

void WalletView::processNewTransaction(const QModelIndex &parent, int start,
                                       int end) {
    // Prevent balloon-spam when initial block download is in progress
    if (!walletModel || !clientModel ||
        clientModel->node().isInitialBlockDownload()) {
        return;
    }

    TransactionTableModel *ttm = walletModel->getTransactionTableModel();
    if (!ttm || ttm->processingQueuedTransactions()) {
        return;
    }

    QString date = ttm->index(start, TransactionTableModel::Date, parent)
                       .data()
                       .toString();
    qint64 amount = ttm->index(start, TransactionTableModel::Amount, parent)
                        .data(Qt::EditRole)
                        .toULongLong();
    QString type = ttm->index(start, TransactionTableModel::Type, parent)
                       .data()
                       .toString();
    QModelIndex index = ttm->index(start, 0, parent);
    QString address =
        ttm->data(index, TransactionTableModel::AddressRole).toString();
    QString label = GUIUtil::HtmlEscape(
        ttm->data(index, TransactionTableModel::LabelRole).toString());

    Q_EMIT incomingTransaction(
        date, walletModel->getOptionsModel()->getDisplayUnit(),
        int64_t(amount) * SATOSHI, type, address, label,
        GUIUtil::HtmlEscape(walletModel->getWalletName()));
}

void WalletView::gotoOverviewPage() {
    setCurrentWidget(overviewPage);
}

void WalletView::gotoHistoryPage() {
    setCurrentWidget(transactionsPage);
}

void WalletView::gotoReceiveCoinsPage() {
    setCurrentWidget(receiveCoinsPage);
}

void WalletView::gotoSendCoinsPage(QString addr) {
    setCurrentWidget(sendCoinsPage);

    if (!addr.isEmpty()) {
        sendCoinsPage->setAddress(addr);
    }
}

void WalletView::gotoSignMessageTab(QString addr) {
    // calls show() in showTab_SM()
    SignVerifyMessageDialog *signVerifyMessageDialog =
        new SignVerifyMessageDialog(platformStyle, this);
    signVerifyMessageDialog->setAttribute(Qt::WA_DeleteOnClose);
    signVerifyMessageDialog->setModel(walletModel);
    signVerifyMessageDialog->showTab_SM(true);

    if (!addr.isEmpty()) {
        signVerifyMessageDialog->setAddress_SM(addr);
    }
}

void WalletView::gotoVerifyMessageTab(QString addr) {
    // calls show() in showTab_VM()
    SignVerifyMessageDialog *signVerifyMessageDialog =
        new SignVerifyMessageDialog(platformStyle, this);
    signVerifyMessageDialog->setAttribute(Qt::WA_DeleteOnClose);
    signVerifyMessageDialog->setModel(walletModel);
    signVerifyMessageDialog->showTab_VM(true);

    if (!addr.isEmpty()) {
        signVerifyMessageDialog->setAddress_VM(addr);
    }
}

void WalletView::gotoLoadPSBT() {
    QString filename = GUIUtil::getOpenFileName(
        this, tr("Load Transaction Data"), QString(),
        tr("Partially Signed Transaction (*.psbt)"), nullptr);
    if (filename.isEmpty()) {
        return;
    }
    if (GetFileSize(filename.toLocal8Bit().data(), MAX_FILE_SIZE_PSBT) ==
        MAX_FILE_SIZE_PSBT) {
        Q_EMIT message(tr("Error"),
                       tr("PSBT file must be smaller than 100 MiB"),
                       CClientUIInterface::MSG_ERROR);
        return;
    }
    std::ifstream in{filename.toLocal8Bit().data(), std::ios::binary};
    std::string dataStr(std::istreambuf_iterator<char>{in}, {});

    std::string error;
    PartiallySignedTransaction psbtx;
    if (!DecodeRawPSBT(psbtx, dataStr, error)) {
        Q_EMIT message(tr("Error"),
                       tr("Unable to decode PSBT file") + "\n" +
                           QString::fromStdString(error),
                       CClientUIInterface::MSG_ERROR);
        return;
    }

    CMutableTransaction mtx;
    bool complete = false;
    PSBTAnalysis analysis = AnalyzePSBT(psbtx);
    QMessageBox msgBox;
    msgBox.setText("PSBT");
    switch (analysis.next) {
        case PSBTRole::CREATOR:
        case PSBTRole::UPDATER:
            msgBox.setInformativeText(
                "PSBT is incomplete. Copy to clipboard for manual inspection?");
            break;
        case PSBTRole::SIGNER:
            msgBox.setInformativeText(
                "Transaction needs more signatures. Copy to clipboard?");
            break;
        case PSBTRole::FINALIZER:
        case PSBTRole::EXTRACTOR:
            complete = FinalizeAndExtractPSBT(psbtx, mtx);
            if (complete) {
                msgBox.setInformativeText(
                    tr("Would you like to send this transaction?"));
            } else {
                // The analyzer missed something, e.g. if there are
                // final_scriptSig but with invalid signatures.
                msgBox.setInformativeText(
                    tr("There was an unexpected problem processing the PSBT. "
                       "Copy to clipboard for manual inspection?"));
            }
    }

    msgBox.setStandardButtons(QMessageBox::Yes | QMessageBox::Cancel);
    switch (msgBox.exec()) {
        case QMessageBox::Yes: {
            if (complete) {
                std::string err_string;
                CTransactionRef tx = MakeTransactionRef(mtx);

                TransactionError result = BroadcastTransaction(
                    *clientModel->node().context(), tx, err_string,
                    DEFAULT_MAX_RAW_TX_FEE_RATE.GetFeePerK(), /* relay */ true,
                    /* wait_callback */ false);
                if (result == TransactionError::OK) {
                    Q_EMIT message(tr("Success"),
                                   tr("Broadcasted transaction successfully."),
                                   CClientUIInterface::MSG_INFORMATION |
                                       CClientUIInterface::MODAL);
                } else {
                    Q_EMIT message(tr("Error"),
                                   QString::fromStdString(err_string),
                                   CClientUIInterface::MSG_ERROR);
                }
            } else {
                // Serialize the PSBT
                CDataStream ssTx(SER_NETWORK, PROTOCOL_VERSION);
                ssTx << psbtx;
                GUIUtil::setClipboard(EncodeBase64(ssTx.str()).c_str());
                Q_EMIT message(tr("PSBT copied"), "Copied to clipboard",
                               CClientUIInterface::MSG_INFORMATION);
                return;
            }
        }
        case QMessageBox::Cancel:
            break;
        default:
            assert(false);
    }
}

bool WalletView::handlePaymentRequest(const SendCoinsRecipient &recipient) {
    return sendCoinsPage->handlePaymentRequest(recipient);
}

void WalletView::showOutOfSyncWarning(bool fShow) {
    overviewPage->showOutOfSyncWarning(fShow);
}

void WalletView::updateEncryptionStatus() {
    Q_EMIT encryptionStatusChanged();
}

void WalletView::encryptWallet() {
    if (!walletModel) {
        return;
    }
    AskPassphraseDialog dlg(AskPassphraseDialog::Encrypt, this);
    dlg.setModel(walletModel);
    dlg.exec();

    updateEncryptionStatus();
}

void WalletView::backupWallet() {
    QString filename =
        GUIUtil::getSaveFileName(this, tr("Backup Wallet"), QString(),
                                 tr("Wallet Data (*.dat)"), nullptr);

    if (filename.isEmpty()) {
        return;
    }

    if (!walletModel->wallet().backupWallet(filename.toLocal8Bit().data())) {
        Q_EMIT message(
            tr("Backup Failed"),
            tr("There was an error trying to save the wallet data to %1.")
                .arg(filename),
            CClientUIInterface::MSG_ERROR);
    } else {
        Q_EMIT message(
            tr("Backup Successful"),
            tr("The wallet data was successfully saved to %1.").arg(filename),
            CClientUIInterface::MSG_INFORMATION);
    }
}

void WalletView::changePassphrase() {
    AskPassphraseDialog dlg(AskPassphraseDialog::ChangePass, this);
    dlg.setModel(walletModel);
    dlg.exec();
}

void WalletView::unlockWallet() {
    if (!walletModel) {
        return;
    }

    // Unlock wallet when requested by wallet model
    if (walletModel->getEncryptionStatus() == WalletModel::Locked) {
        AskPassphraseDialog dlg(AskPassphraseDialog::Unlock, this);
        dlg.setModel(walletModel);
        dlg.exec();
    }
}

void WalletView::usedSendingAddresses() {
    if (!walletModel) {
        return;
    }

    GUIUtil::bringToFront(usedSendingAddressesPage);
}

void WalletView::usedReceivingAddresses() {
    if (!walletModel) {
        return;
    }

    GUIUtil::bringToFront(usedReceivingAddressesPage);
}

void WalletView::showProgress(const QString &title, int nProgress) {
    if (nProgress == 0) {
        progressDialog = new QProgressDialog(title, tr("Cancel"), 0, 100);
        GUIUtil::PolishProgressDialog(progressDialog);
        progressDialog->setWindowModality(Qt::ApplicationModal);
        progressDialog->setMinimumDuration(0);
        progressDialog->setAutoClose(false);
        progressDialog->setValue(0);
    } else if (nProgress == 100) {
        if (progressDialog) {
            progressDialog->close();
            progressDialog->deleteLater();
            progressDialog = nullptr;
        }
    } else if (progressDialog) {
        if (progressDialog->wasCanceled()) {
            getWalletModel()->wallet().abortRescan();
        } else {
            progressDialog->setValue(nProgress);
        }
    }
}

void WalletView::requestedSyncWarningInfo() {
    Q_EMIT outOfSyncWarningClicked();
}
