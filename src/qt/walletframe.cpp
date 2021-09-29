// Copyright (c) 2011-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <qt/walletframe.h>

#include <qt/bitcoingui.h>
#include <qt/walletmodel.h>
#include <qt/walletview.h>

#include <QHBoxLayout>
#include <QLabel>

#include <cassert>

WalletFrame::WalletFrame(const PlatformStyle *_platformStyle, BitcoinGUI *_gui)
    : QFrame(_gui), gui(_gui), platformStyle(_platformStyle) {
    // Leave HBox hook for adding a list view later
    QHBoxLayout *walletFrameLayout = new QHBoxLayout(this);
    setContentsMargins(0, 0, 0, 0);
    walletStack = new QStackedWidget(this);
    walletFrameLayout->setContentsMargins(0, 0, 0, 0);
    walletFrameLayout->addWidget(walletStack);

    QLabel *noWallet = new QLabel(tr("No wallet has been loaded."));
    noWallet->setAlignment(Qt::AlignCenter);
    walletStack->addWidget(noWallet);
}

WalletFrame::~WalletFrame() {}

void WalletFrame::setClientModel(ClientModel *_clientModel) {
    this->clientModel = _clientModel;

    for (auto i = mapWalletViews.constBegin(); i != mapWalletViews.constEnd();
         ++i) {
        i.value()->setClientModel(_clientModel);
    }
}

bool WalletFrame::addWallet(WalletModel *walletModel) {
    if (!gui || !clientModel || !walletModel) {
        return false;
    }

    if (mapWalletViews.count(walletModel) > 0) {
        return false;
    }

    WalletView *walletView = new WalletView(platformStyle, walletModel, this);
    walletView->setClientModel(clientModel);
    walletView->showOutOfSyncWarning(bOutOfSync);
    walletView->setPrivacy(gui->isPrivacyModeActivated());

    WalletView *current_wallet_view = currentWalletView();
    if (current_wallet_view) {
        walletView->setCurrentIndex(current_wallet_view->currentIndex());
    } else {
        walletView->gotoOverviewPage();
    }

    walletStack->addWidget(walletView);
    mapWalletViews[walletModel] = walletView;

    connect(walletView, &WalletView::outOfSyncWarningClicked, this,
            &WalletFrame::outOfSyncWarningClicked);
    connect(walletView, &WalletView::transactionClicked, gui,
            &BitcoinGUI::gotoHistoryPage);
    connect(walletView, &WalletView::coinsSent, gui,
            &BitcoinGUI::gotoHistoryPage);
    connect(
        walletView, &WalletView::message,
        [this](const QString &title, const QString &message,
               unsigned int style) { gui->message(title, message, style); });
    connect(walletView, &WalletView::encryptionStatusChanged, gui,
            &BitcoinGUI::updateWalletStatus);
    connect(walletView, &WalletView::incomingTransaction, gui,
            &BitcoinGUI::incomingTransaction);
    connect(walletView, &WalletView::hdEnabledStatusChanged, gui,
            &BitcoinGUI::updateWalletStatus);
    connect(gui, &BitcoinGUI::setPrivacy, walletView, &WalletView::setPrivacy);

    return true;
}

void WalletFrame::setCurrentWallet(WalletModel *wallet_model) {
    if (mapWalletViews.count(wallet_model) == 0) {
        return;
    }

    WalletView *walletView = mapWalletViews.value(wallet_model);
    walletStack->setCurrentWidget(walletView);
    assert(walletView);
    walletView->updateEncryptionStatus();
}

void WalletFrame::removeWallet(WalletModel *wallet_model) {
    if (mapWalletViews.count(wallet_model) == 0) {
        return;
    }

    WalletView *walletView = mapWalletViews.take(wallet_model);
    walletStack->removeWidget(walletView);
    delete walletView;
}

void WalletFrame::removeAllWallets() {
    QMap<WalletModel *, WalletView *>::const_iterator i;
    for (i = mapWalletViews.constBegin(); i != mapWalletViews.constEnd(); ++i) {
        walletStack->removeWidget(i.value());
    }
    mapWalletViews.clear();
}

bool WalletFrame::handlePaymentRequest(const SendCoinsRecipient &recipient) {
    WalletView *walletView = currentWalletView();
    if (!walletView) {
        return false;
    }

    return walletView->handlePaymentRequest(recipient);
}

void WalletFrame::showOutOfSyncWarning(bool fShow) {
    bOutOfSync = fShow;
    QMap<WalletModel *, WalletView *>::const_iterator i;
    for (i = mapWalletViews.constBegin(); i != mapWalletViews.constEnd(); ++i) {
        i.value()->showOutOfSyncWarning(fShow);
    }
}

void WalletFrame::gotoOverviewPage() {
    QMap<WalletModel *, WalletView *>::const_iterator i;
    for (i = mapWalletViews.constBegin(); i != mapWalletViews.constEnd(); ++i) {
        i.value()->gotoOverviewPage();
    }
}

void WalletFrame::gotoHistoryPage() {
    QMap<WalletModel *, WalletView *>::const_iterator i;
    for (i = mapWalletViews.constBegin(); i != mapWalletViews.constEnd(); ++i) {
        i.value()->gotoHistoryPage();
    }
}

void WalletFrame::gotoReceiveCoinsPage() {
    QMap<WalletModel *, WalletView *>::const_iterator i;
    for (i = mapWalletViews.constBegin(); i != mapWalletViews.constEnd(); ++i) {
        i.value()->gotoReceiveCoinsPage();
    }
}

void WalletFrame::gotoSendCoinsPage(QString addr) {
    QMap<WalletModel *, WalletView *>::const_iterator i;
    for (i = mapWalletViews.constBegin(); i != mapWalletViews.constEnd(); ++i) {
        i.value()->gotoSendCoinsPage(addr);
    }
}

void WalletFrame::gotoSignMessageTab(QString addr) {
    WalletView *walletView = currentWalletView();
    if (walletView) {
        walletView->gotoSignMessageTab(addr);
    }
}

void WalletFrame::gotoVerifyMessageTab(QString addr) {
    WalletView *walletView = currentWalletView();
    if (walletView) {
        walletView->gotoVerifyMessageTab(addr);
    }
}

void WalletFrame::gotoLoadPSBT() {
    WalletView *walletView = currentWalletView();
    if (walletView) {
        walletView->gotoLoadPSBT();
    }
}

void WalletFrame::encryptWallet(bool status) {
    WalletView *walletView = currentWalletView();
    if (walletView) {
        walletView->encryptWallet(status);
    }
}

void WalletFrame::backupWallet() {
    WalletView *walletView = currentWalletView();
    if (walletView) {
        walletView->backupWallet();
    }
}

void WalletFrame::changePassphrase() {
    WalletView *walletView = currentWalletView();
    if (walletView) {
        walletView->changePassphrase();
    }
}

void WalletFrame::unlockWallet() {
    WalletView *walletView = currentWalletView();
    if (walletView) {
        walletView->unlockWallet();
    }
}

void WalletFrame::usedSendingAddresses() {
    WalletView *walletView = currentWalletView();
    if (walletView) {
        walletView->usedSendingAddresses();
    }
}

void WalletFrame::usedReceivingAddresses() {
    WalletView *walletView = currentWalletView();
    if (walletView) {
        walletView->usedReceivingAddresses();
    }
}

WalletView *WalletFrame::currentWalletView() const {
    return qobject_cast<WalletView *>(walletStack->currentWidget());
}

WalletModel *WalletFrame::currentWalletModel() const {
    WalletView *wallet_view = currentWalletView();
    return wallet_view ? wallet_view->getWalletModel() : nullptr;
}

void WalletFrame::outOfSyncWarningClicked() {
    Q_EMIT requestedSyncWarningInfo();
}
