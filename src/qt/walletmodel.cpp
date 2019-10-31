// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <qt/walletmodel.h>

#include <cashaddrenc.h>
#include <interfaces/handler.h>
#include <interfaces/node.h>
#include <key_io.h>
#include <qt/addresstablemodel.h>
#include <qt/guiconstants.h>
#include <qt/paymentserver.h>
#include <qt/recentrequeststablemodel.h>
#include <qt/transactiontablemodel.h>
#include <ui_interface.h>
#include <util/system.h> // for GetBoolArg
#include <wallet/coincontrol.h>
#include <wallet/wallet.h>

#include <QDebug>
#include <QSet>
#include <QTimer>

#include <cstdint>

WalletModel::WalletModel(std::unique_ptr<interfaces::Wallet> wallet,
                         interfaces::Node &node,
                         const PlatformStyle *platformStyle,
                         OptionsModel *_optionsModel, QObject *parent)
    : QObject(parent), m_wallet(std::move(wallet)), m_node(node),
      optionsModel(_optionsModel), addressTableModel(0),
      transactionTableModel(0), recentRequestsTableModel(0),
      cachedEncryptionStatus(Unencrypted), cachedNumBlocks(0) {
    fHaveWatchOnly = m_wallet->haveWatchOnly();
    addressTableModel = new AddressTableModel(this);
    transactionTableModel = new TransactionTableModel(platformStyle, this);
    recentRequestsTableModel = new RecentRequestsTableModel(this);

    // This timer will be fired repeatedly to update the balance
    pollTimer = new QTimer(this);
    connect(pollTimer, &QTimer::timeout, this,
            &WalletModel::pollBalanceChanged);
    pollTimer->start(MODEL_UPDATE_DELAY);

    subscribeToCoreSignals();
}

WalletModel::~WalletModel() {
    unsubscribeFromCoreSignals();
}

void WalletModel::updateStatus() {
    EncryptionStatus newEncryptionStatus = getEncryptionStatus();

    if (cachedEncryptionStatus != newEncryptionStatus) {
        Q_EMIT encryptionStatusChanged();
    }
}

void WalletModel::pollBalanceChanged() {
    // Try to get balances and return early if locks can't be acquired. This
    // avoids the GUI from getting stuck on periodical polls if the core is
    // holding the locks for a longer time - for example, during a wallet
    // rescan.
    interfaces::WalletBalances new_balances;
    int numBlocks = -1;
    if (!m_wallet->tryGetBalances(new_balances, numBlocks)) {
        return;
    }

    if (fForceCheckBalanceChanged || m_node.getNumBlocks() != cachedNumBlocks) {
        fForceCheckBalanceChanged = false;

        // Balance and number of transactions might have changed
        cachedNumBlocks = m_node.getNumBlocks();

        checkBalanceChanged(new_balances);
        if (transactionTableModel) {
            transactionTableModel->updateConfirmations();
        }
    }
}

void WalletModel::checkBalanceChanged(
    const interfaces::WalletBalances &new_balances) {
    if (new_balances.balanceChanged(m_cached_balances)) {
        m_cached_balances = new_balances;
        Q_EMIT balanceChanged(new_balances);
    }
}

void WalletModel::updateTransaction() {
    // Balance and number of transactions might have changed
    fForceCheckBalanceChanged = true;
}

void WalletModel::updateAddressBook(const QString &address,
                                    const QString &label, bool isMine,
                                    const QString &purpose, int status) {
    if (addressTableModel) {
        addressTableModel->updateEntry(address, label, isMine, purpose, status);
    }
}

void WalletModel::updateWatchOnlyFlag(bool fHaveWatchonly) {
    fHaveWatchOnly = fHaveWatchonly;
    Q_EMIT notifyWatchonlyChanged(fHaveWatchonly);
}

bool WalletModel::validateAddress(const QString &address) {
    return IsValidDestinationString(address.toStdString(), getChainParams());
}

WalletModel::SendCoinsReturn
WalletModel::prepareTransaction(WalletModelTransaction &transaction,
                                const CCoinControl &coinControl) {
    Amount total = Amount::zero();
    bool fSubtractFeeFromAmount = false;
    QList<SendCoinsRecipient> recipients = transaction.getRecipients();
    std::vector<CRecipient> vecSend;

    if (recipients.empty()) {
        return OK;
    }

    // Used to detect duplicates
    QSet<QString> setAddress;
    int nAddresses = 0;

    // Pre-check input data for validity
    for (const SendCoinsRecipient &rcp : recipients) {
        if (rcp.fSubtractFeeFromAmount) fSubtractFeeFromAmount = true;

        // PaymentRequest...
        if (rcp.paymentRequest.IsInitialized()) {
            Amount subtotal = Amount::zero();
            const payments::PaymentDetails &details =
                rcp.paymentRequest.getDetails();
            for (int i = 0; i < details.outputs_size(); i++) {
                const payments::Output &out = details.outputs(i);
                if (out.amount() <= 0) {
                    continue;
                }

                subtotal += int64_t(out.amount()) * SATOSHI;
                const uint8_t *scriptStr = (const uint8_t *)out.script().data();
                CScript scriptPubKey(scriptStr,
                                     scriptStr + out.script().size());
                Amount nAmount = int64_t(out.amount()) * SATOSHI;
                CRecipient recipient = {scriptPubKey, nAmount,
                                        rcp.fSubtractFeeFromAmount};
                vecSend.push_back(recipient);
            }

            if (subtotal <= Amount::zero()) {
                return InvalidAmount;
            }
            total += subtotal;
        } else {
            // User-entered bitcoin address / amount:
            if (!validateAddress(rcp.address)) {
                return InvalidAddress;
            }
            if (rcp.amount <= Amount::zero()) {
                return InvalidAmount;
            }
            setAddress.insert(rcp.address);
            ++nAddresses;

            CScript scriptPubKey = GetScriptForDestination(
                DecodeDestination(rcp.address.toStdString(), getChainParams()));
            CRecipient recipient = {scriptPubKey, Amount(rcp.amount),
                                    rcp.fSubtractFeeFromAmount};
            vecSend.push_back(recipient);

            total += rcp.amount;
        }
    }
    if (setAddress.size() != nAddresses) {
        return DuplicateAddress;
    }

    Amount nBalance = m_wallet->getAvailableBalance(coinControl);

    if (total > nBalance) {
        return AmountExceedsBalance;
    }

    Amount nFeeRequired = Amount::zero();
    int nChangePosRet = -1;
    std::string strFailReason;

    auto &newTx = transaction.getWtx();
    newTx =
        m_wallet->createTransaction(vecSend, coinControl, true /* sign */,
                                    nChangePosRet, nFeeRequired, strFailReason);
    transaction.setTransactionFee(nFeeRequired);
    if (fSubtractFeeFromAmount && newTx) {
        transaction.reassignAmounts(nChangePosRet);
    }

    if (!newTx) {
        if (!fSubtractFeeFromAmount && (total + nFeeRequired) > nBalance) {
            return SendCoinsReturn(AmountWithFeeExceedsBalance);
        }
        Q_EMIT message(tr("Send Coins"), QString::fromStdString(strFailReason),
                       CClientUIInterface::MSG_ERROR);
        return TransactionCreationFailed;
    }

    // reject absurdly high fee. (This can never happen because the
    // wallet caps the fee at maxTxFee. This merely serves as a
    // belt-and-suspenders check)
    if (nFeeRequired > m_node.getMaxTxFee()) {
        return AbsurdFee;
    }

    return SendCoinsReturn(OK);
}

WalletModel::SendCoinsReturn
WalletModel::sendCoins(WalletModelTransaction &transaction) {
    /* store serialized transaction */
    QByteArray transaction_array;

    std::vector<std::pair<std::string, std::string>> vOrderForm;
    for (const SendCoinsRecipient &rcp : transaction.getRecipients()) {
        if (rcp.paymentRequest.IsInitialized()) {
            // Make sure any payment requests involved are still valid.
            if (PaymentServer::verifyExpired(rcp.paymentRequest.getDetails())) {
                return PaymentRequestExpired;
            }

            // Store PaymentRequests in wtx.vOrderForm in wallet.
            std::string value;
            rcp.paymentRequest.SerializeToString(&value);
            vOrderForm.emplace_back("PaymentRequest", std::move(value));
        } else if (!rcp.message.isEmpty()) {
            // Message from normal bitcoincash:URI
            // (bitcoincash:123...?message=example)
            vOrderForm.emplace_back("Message", rcp.message.toStdString());
        }
    }

    auto &newTx = transaction.getWtx();
    std::string rejectReason;
    if (!newTx->commit({} /* mapValue */, std::move(vOrderForm),
                       {} /* fromAccount */, rejectReason)) {
        return SendCoinsReturn(TransactionCommitFailed,
                               QString::fromStdString(rejectReason));
    }

    CDataStream ssTx(SER_NETWORK, PROTOCOL_VERSION);
    ssTx << newTx->get();
    transaction_array.append(&(ssTx[0]), ssTx.size());

    // Add addresses / update labels that we've sent to the address book, and
    // emit coinsSent signal for each recipient
    for (const SendCoinsRecipient &rcp : transaction.getRecipients()) {
        // Don't touch the address book when we have a payment request
        if (!rcp.paymentRequest.IsInitialized()) {
            std::string strAddress = rcp.address.toStdString();
            CTxDestination dest =
                DecodeDestination(strAddress, getChainParams());
            std::string strLabel = rcp.label.toStdString();
            // Check if we have a new address or an updated label
            std::string name;
            if (!m_wallet->getAddress(dest, &name, /* is_mine= */ nullptr,
                                      /* purpose= */ nullptr)) {
                m_wallet->setAddressBook(dest, strLabel, "send");
            } else if (name != strLabel) {
                // "" means don't change purpose
                m_wallet->setAddressBook(dest, strLabel, "");
            }
        }
        Q_EMIT coinsSent(this, rcp, transaction_array);
    }

    // update balance immediately, otherwise there could be a short noticeable
    // delay until pollBalanceChanged hits
    checkBalanceChanged(m_wallet->getBalances());

    return SendCoinsReturn(OK);
}

OptionsModel *WalletModel::getOptionsModel() {
    return optionsModel;
}

AddressTableModel *WalletModel::getAddressTableModel() {
    return addressTableModel;
}

TransactionTableModel *WalletModel::getTransactionTableModel() {
    return transactionTableModel;
}

RecentRequestsTableModel *WalletModel::getRecentRequestsTableModel() {
    return recentRequestsTableModel;
}

WalletModel::EncryptionStatus WalletModel::getEncryptionStatus() const {
    if (!m_wallet->isCrypted()) {
        return Unencrypted;
    } else if (m_wallet->isLocked()) {
        return Locked;
    } else {
        return Unlocked;
    }
}

bool WalletModel::setWalletEncrypted(bool encrypted,
                                     const SecureString &passphrase) {
    if (encrypted) {
        // Encrypt
        return m_wallet->encryptWallet(passphrase);
    } else {
        // Decrypt -- TODO; not supported yet
        return false;
    }
}

bool WalletModel::setWalletLocked(bool locked, const SecureString &passPhrase) {
    if (locked) {
        // Lock
        return m_wallet->lock();
    } else {
        // Unlock
        return m_wallet->unlock(passPhrase);
    }
}

bool WalletModel::changePassphrase(const SecureString &oldPass,
                                   const SecureString &newPass) {
    // Make sure wallet is locked before attempting pass change
    m_wallet->lock();
    return m_wallet->changeWalletPassphrase(oldPass, newPass);
}

// Handlers for core signals
static void NotifyUnload(WalletModel *walletModel) {
    qDebug() << "NotifyUnload";
    QMetaObject::invokeMethod(walletModel, "unload", Qt::QueuedConnection);
}

static void NotifyKeyStoreStatusChanged(WalletModel *walletmodel) {
    qDebug() << "NotifyKeyStoreStatusChanged";
    QMetaObject::invokeMethod(walletmodel, "updateStatus",
                              Qt::QueuedConnection);
}

static void NotifyAddressBookChanged(WalletModel *walletmodel,
                                     const CTxDestination &address,
                                     const std::string &label, bool isMine,
                                     const std::string &purpose,
                                     ChangeType status) {
    QString strAddress = QString::fromStdString(
        EncodeCashAddr(address, walletmodel->getChainParams()));
    QString strLabel = QString::fromStdString(label);
    QString strPurpose = QString::fromStdString(purpose);

    qDebug() << "NotifyAddressBookChanged: " + strAddress + " " + strLabel +
                    " isMine=" + QString::number(isMine) +
                    " purpose=" + strPurpose +
                    " status=" + QString::number(status);
    QMetaObject::invokeMethod(walletmodel, "updateAddressBook",
                              Qt::QueuedConnection, Q_ARG(QString, strAddress),
                              Q_ARG(QString, strLabel), Q_ARG(bool, isMine),
                              Q_ARG(QString, strPurpose), Q_ARG(int, status));
}

static void NotifyTransactionChanged(WalletModel *walletmodel, const TxId &hash,
                                     ChangeType status) {
    Q_UNUSED(hash);
    Q_UNUSED(status);
    QMetaObject::invokeMethod(walletmodel, "updateTransaction",
                              Qt::QueuedConnection);
}

static void ShowProgress(WalletModel *walletmodel, const std::string &title,
                         int nProgress) {
    // emits signal "showProgress"
    QMetaObject::invokeMethod(walletmodel, "showProgress", Qt::QueuedConnection,
                              Q_ARG(QString, QString::fromStdString(title)),
                              Q_ARG(int, nProgress));
}

static void NotifyWatchonlyChanged(WalletModel *walletmodel,
                                   bool fHaveWatchonly) {
    QMetaObject::invokeMethod(walletmodel, "updateWatchOnlyFlag",
                              Qt::QueuedConnection,
                              Q_ARG(bool, fHaveWatchonly));
}

void WalletModel::subscribeToCoreSignals() {
    // Connect signals to wallet
    m_handler_unload = m_wallet->handleUnload(std::bind(&NotifyUnload, this));
    m_handler_status_changed = m_wallet->handleStatusChanged(
        std::bind(&NotifyKeyStoreStatusChanged, this));
    m_handler_address_book_changed = m_wallet->handleAddressBookChanged(
        std::bind(NotifyAddressBookChanged, this, std::placeholders::_1,
                  std::placeholders::_2, std::placeholders::_3,
                  std::placeholders::_4, std::placeholders::_5));
    m_handler_transaction_changed = m_wallet->handleTransactionChanged(
        std::bind(NotifyTransactionChanged, this, std::placeholders::_1,
                  std::placeholders::_2));
    m_handler_show_progress = m_wallet->handleShowProgress(std::bind(
        ShowProgress, this, std::placeholders::_1, std::placeholders::_2));
    m_handler_watch_only_changed = m_wallet->handleWatchOnlyChanged(
        std::bind(NotifyWatchonlyChanged, this, std::placeholders::_1));
}

void WalletModel::unsubscribeFromCoreSignals() {
    // Disconnect signals from wallet
    m_handler_unload->disconnect();
    m_handler_status_changed->disconnect();
    m_handler_address_book_changed->disconnect();
    m_handler_transaction_changed->disconnect();
    m_handler_show_progress->disconnect();
    m_handler_watch_only_changed->disconnect();
}

// WalletModel::UnlockContext implementation
WalletModel::UnlockContext WalletModel::requestUnlock() {
    bool was_locked = getEncryptionStatus() == Locked;
    if (was_locked) {
        // Request UI to unlock wallet
        Q_EMIT requireUnlock();
    }
    // If wallet is still locked, unlock was failed or cancelled, mark context
    // as invalid
    bool valid = getEncryptionStatus() != Locked;

    return UnlockContext(this, valid, was_locked);
}

WalletModel::UnlockContext::UnlockContext(WalletModel *_wallet, bool _valid,
                                          bool _relock)
    : wallet(_wallet), valid(_valid), relock(_relock) {}

WalletModel::UnlockContext::~UnlockContext() {
    if (valid && relock) {
        wallet->setWalletLocked(true);
    }
}

void WalletModel::UnlockContext::CopyFrom(const UnlockContext &rhs) {
    // Transfer context; old object no longer relocks wallet
    *this = rhs;
    rhs.relock = false;
}

void WalletModel::loadReceiveRequests(
    std::vector<std::string> &vReceiveRequests) {
    // receive request
    vReceiveRequests = m_wallet->getDestValues("rr");
}

bool WalletModel::saveReceiveRequest(const std::string &sAddress,
                                     const int64_t nId,
                                     const std::string &sRequest) {
    CTxDestination dest = DecodeDestination(sAddress, getChainParams());

    std::stringstream ss;
    ss << nId;
    // "rr" prefix = "receive request" in destdata
    std::string key = "rr" + ss.str();

    return sRequest.empty() ? m_wallet->eraseDestData(dest, key)
                            : m_wallet->addDestData(dest, key, sRequest);
}

bool WalletModel::isWalletEnabled() {
    return !gArgs.GetBoolArg("-disablewallet", DEFAULT_DISABLE_WALLET);
}

QString WalletModel::getWalletName() const {
    return QString::fromStdString(m_wallet->getWalletName());
}

bool WalletModel::isMultiwallet() {
    return m_node.getWallets().size() > 1;
}

const CChainParams &WalletModel::getChainParams() const {
    return Params();
}
