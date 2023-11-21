// Copyright (c) 2011-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <qt/walletmodel.h>

#include <cashaddrenc.h>
#include <interfaces/handler.h>
#include <interfaces/node.h>
#include <key_io.h>
#include <node/ui_interface.h>
#include <psbt.h>
#include <qt/addresstablemodel.h>
#include <qt/clientmodel.h>
#include <qt/guiconstants.h>
#include <qt/paymentserver.h>
#include <qt/recentrequeststablemodel.h>
#include <qt/transactiontablemodel.h>
#include <util/system.h> // for GetBoolArg
#include <util/translation.h>
#include <wallet/coincontrol.h>
#include <wallet/wallet.h> // for CRecipient

#include <QDebug>
#include <QSet>
#include <QTimer>

#include <cstdint>
#include <functional>

WalletModel::WalletModel(std::unique_ptr<interfaces::Wallet> wallet,
                         ClientModel &client_model,
                         const PlatformStyle *platformStyle, QObject *parent)
    : QObject(parent), m_wallet(std::move(wallet)),
      m_client_model(&client_model), m_node(client_model.node()),
      optionsModel(client_model.getOptionsModel()), addressTableModel(nullptr),
      transactionTableModel(nullptr), recentRequestsTableModel(nullptr),
      cachedEncryptionStatus(Unencrypted), timer(new QTimer(this)) {
    fHaveWatchOnly = m_wallet->haveWatchOnly();
    addressTableModel = new AddressTableModel(this);
    transactionTableModel = new TransactionTableModel(platformStyle, this);
    recentRequestsTableModel = new RecentRequestsTableModel(this);

    subscribeToCoreSignals();
}

WalletModel::~WalletModel() {
    unsubscribeFromCoreSignals();
}

void WalletModel::startPollBalance() {
    // This timer will be fired repeatedly to update the balance
    connect(timer, &QTimer::timeout, this, &WalletModel::pollBalanceChanged);
    timer->start(MODEL_UPDATE_DELAY);
}

void WalletModel::setClientModel(ClientModel *client_model) {
    m_client_model = client_model;
    if (!m_client_model) {
        timer->stop();
    }
}

void WalletModel::updateStatus() {
    EncryptionStatus newEncryptionStatus = getEncryptionStatus();

    if (cachedEncryptionStatus != newEncryptionStatus) {
        Q_EMIT encryptionStatusChanged();
    }
}

void WalletModel::pollBalanceChanged() {
    // Avoid recomputing wallet balances unless a TransactionChanged or
    // BlockTip notification was received.
    if (!fForceCheckBalanceChanged &&
        m_cached_last_update_tip == getLastBlockProcessed()) {
        return;
    }

    // Try to get balances and return early if locks can't be acquired. This
    // avoids the GUI from getting stuck on periodical polls if the core is
    // holding the locks for a longer time - for example, during a wallet
    // rescan.
    interfaces::WalletBalances new_balances;
    BlockHash block_hash;
    if (!m_wallet->tryGetBalances(new_balances, block_hash)) {
        return;
    }

    if (fForceCheckBalanceChanged || block_hash != m_cached_last_update_tip) {
        fForceCheckBalanceChanged = false;

        // Balance and number of transactions might have changed
        m_cached_last_update_tip = block_hash;

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
        if (rcp.fSubtractFeeFromAmount) {
            fSubtractFeeFromAmount = true;
        }

#ifdef ENABLE_BIP70
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
        }

        // User-entered bitcoin address / amount:
        else
#endif
        {
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
    bilingual_str error;

    auto &newTx = transaction.getWtx();
    newTx = m_wallet->createTransaction(
        vecSend, coinControl, !wallet().privateKeysDisabled() /* sign */,
        nChangePosRet, nFeeRequired, error);
    transaction.setTransactionFee(nFeeRequired);
    if (fSubtractFeeFromAmount && newTx) {
        transaction.reassignAmounts(nChangePosRet);
    }

    if (!newTx) {
        if (!fSubtractFeeFromAmount && (total + nFeeRequired) > nBalance) {
            return SendCoinsReturn(AmountWithFeeExceedsBalance);
        }
        Q_EMIT message(tr("Send Coins"),
                       QString::fromStdString(error.translated),
                       CClientUIInterface::MSG_ERROR);
        return TransactionCreationFailed;
    }

    // Reject absurdly high fee. (This can never happen because the
    // wallet never creates transactions with fee greater than
    // m_default_max_tx_fee. This merely a belt-and-suspenders check).
    if (nFeeRequired > m_wallet->getDefaultMaxTxFee()) {
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
#ifdef ENABLE_BIP70
        if (rcp.paymentRequest.IsInitialized()) {
            // Make sure any payment requests involved are still valid.
            if (PaymentServer::verifyExpired(rcp.paymentRequest.getDetails())) {
                return PaymentRequestExpired;
            }

            // Store PaymentRequests in wtx.vOrderForm in wallet.
            std::string value;
            rcp.paymentRequest.SerializeToString(&value);
            vOrderForm.emplace_back("PaymentRequest", std::move(value));
        } else
#endif
        {
            if (!rcp.message.isEmpty()) {
                // Message from normal bitcoincash:URI
                // (bitcoincash:123...?message=example)
                vOrderForm.emplace_back("Message", rcp.message.toStdString());
            }
        }
    }

    auto &newTx = transaction.getWtx();
    wallet().commitTransaction(newTx, {} /* mapValue */, std::move(vOrderForm));

    CDataStream ssTx(SER_NETWORK, PROTOCOL_VERSION);
    ssTx << *newTx;
    transaction_array.append((const char *)ssTx.data(), ssTx.size());

    // Add addresses / update labels that we've sent to the address book, and
    // emit coinsSent signal for each recipient
    for (const SendCoinsRecipient &rcp : transaction.getRecipients()) {
        // Don't touch the address book when we have a payment request
#ifdef ENABLE_BIP70
        if (!rcp.paymentRequest.IsInitialized())
#endif
        {
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
        Q_EMIT coinsSent(this->wallet(), rcp, transaction_array);
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

bool WalletModel::setWalletEncrypted(const SecureString &passphrase) {
    return m_wallet->encryptWallet(passphrase);
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
    bool invoked = QMetaObject::invokeMethod(walletModel, "unload");
    assert(invoked);
}

static void NotifyKeyStoreStatusChanged(WalletModel *walletmodel) {
    qDebug() << "NotifyKeyStoreStatusChanged";
    bool invoked = QMetaObject::invokeMethod(walletmodel, "updateStatus",
                                             Qt::QueuedConnection);
    assert(invoked);
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
    bool invoked = QMetaObject::invokeMethod(
        walletmodel, "updateAddressBook", Qt::QueuedConnection,
        Q_ARG(QString, strAddress), Q_ARG(QString, strLabel),
        Q_ARG(bool, isMine), Q_ARG(QString, strPurpose), Q_ARG(int, status));
    assert(invoked);
}

static void NotifyTransactionChanged(WalletModel *walletmodel, const TxId &hash,
                                     ChangeType status) {
    Q_UNUSED(hash);
    Q_UNUSED(status);
    bool invoked = QMetaObject::invokeMethod(walletmodel, "updateTransaction",
                                             Qt::QueuedConnection);
    assert(invoked);
}

static void ShowProgress(WalletModel *walletmodel, const std::string &title,
                         int nProgress) {
    // emits signal "showProgress"
    bool invoked = QMetaObject::invokeMethod(
        walletmodel, "showProgress", Qt::QueuedConnection,
        Q_ARG(QString, QString::fromStdString(title)), Q_ARG(int, nProgress));
    assert(invoked);
}

static void NotifyWatchonlyChanged(WalletModel *walletmodel,
                                   bool fHaveWatchonly) {
    bool invoked = QMetaObject::invokeMethod(walletmodel, "updateWatchOnlyFlag",
                                             Qt::QueuedConnection,
                                             Q_ARG(bool, fHaveWatchonly));
    assert(invoked);
}

static void NotifyCanGetAddressesChanged(WalletModel *walletmodel) {
    bool invoked =
        QMetaObject::invokeMethod(walletmodel, "canGetAddressesChanged");
    assert(invoked);
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
    m_handler_can_get_addrs_changed = m_wallet->handleCanGetAddressesChanged(
        std::bind(NotifyCanGetAddressesChanged, this));
}

void WalletModel::unsubscribeFromCoreSignals() {
    // Disconnect signals from wallet
    m_handler_unload->disconnect();
    m_handler_status_changed->disconnect();
    m_handler_address_book_changed->disconnect();
    m_handler_transaction_changed->disconnect();
    m_handler_show_progress->disconnect();
    m_handler_watch_only_changed->disconnect();
    m_handler_can_get_addrs_changed->disconnect();
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

void WalletModel::UnlockContext::CopyFrom(UnlockContext &&rhs) {
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

QString WalletModel::getDisplayName() const {
    const QString name = getWalletName();
    return name.isEmpty() ? "[" + tr("default wallet") + "]" : name;
}

bool WalletModel::isMultiwallet() {
    return m_node.walletClient().getWallets().size() > 1;
}

const CChainParams &WalletModel::getChainParams() const {
    return Params();
}

BlockHash WalletModel::getLastBlockProcessed() const {
    return m_client_model ? m_client_model->getBestBlockHash() : BlockHash{};
}
