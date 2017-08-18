// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "walletmodel.h"

#include "addresstablemodel.h"
#include "consensus/validation.h"
#include "guiconstants.h"
#include "guiutil.h"
#include "paymentserver.h"
#include "recentrequeststablemodel.h"
#include "transactiontablemodel.h"

#include "config.h"
#include "dstencode.h"
#include "keystore.h"
#include "net.h" // for g_connman
#include "sync.h"
#include "ui_interface.h"
#include "util.h" // for GetBoolArg
#include "validation.h"
#include "wallet/coincontrol.h"
#include "wallet/wallet.h"
#include "wallet/walletdb.h" // for BackupWallet

#include <cstdint>

#include <QDebug>
#include <QSet>
#include <QTimer>

WalletModel::WalletModel(const PlatformStyle *platformStyle, CWallet *_wallet,
                         OptionsModel *_optionsModel, QObject *parent)
    : QObject(parent), wallet(_wallet), optionsModel(_optionsModel),
      addressTableModel(0), transactionTableModel(0),
      recentRequestsTableModel(0), cachedBalance(), cachedUnconfirmedBalance(),
      cachedImmatureBalance(), cachedEncryptionStatus(Unencrypted),
      cachedNumBlocks(0) {
    fHaveWatchOnly = wallet->HaveWatchOnly();
    fForceCheckBalanceChanged = false;

    addressTableModel = new AddressTableModel(wallet, this);
    transactionTableModel =
        new TransactionTableModel(platformStyle, wallet, this);
    recentRequestsTableModel = new RecentRequestsTableModel(wallet, this);

    // This timer will be fired repeatedly to update the balance
    pollTimer = new QTimer(this);
    connect(pollTimer, SIGNAL(timeout()), this, SLOT(pollBalanceChanged()));
    pollTimer->start(MODEL_UPDATE_DELAY);

    subscribeToCoreSignals();
}

WalletModel::~WalletModel() {
    unsubscribeFromCoreSignals();
}

Amount WalletModel::getBalance(const CCoinControl *coinControl) const {
    if (coinControl) {
        return wallet->GetAvailableBalance(coinControl);
    }

    return wallet->GetBalance();
}

Amount WalletModel::getUnconfirmedBalance() const {
    return wallet->GetUnconfirmedBalance();
}

Amount WalletModel::getImmatureBalance() const {
    return wallet->GetImmatureBalance();
}

bool WalletModel::haveWatchOnly() const {
    return fHaveWatchOnly;
}

Amount WalletModel::getWatchBalance() const {
    return wallet->GetWatchOnlyBalance();
}

Amount WalletModel::getWatchUnconfirmedBalance() const {
    return wallet->GetUnconfirmedWatchOnlyBalance();
}

Amount WalletModel::getWatchImmatureBalance() const {
    return wallet->GetImmatureWatchOnlyBalance();
}

void WalletModel::updateStatus() {
    EncryptionStatus newEncryptionStatus = getEncryptionStatus();

    if (cachedEncryptionStatus != newEncryptionStatus) {
        Q_EMIT encryptionStatusChanged();
    }
}

void WalletModel::pollBalanceChanged() {
    // Get required locks upfront. This avoids the GUI from getting stuck on
    // periodical polls if the core is holding the locks for a longer time - for
    // example, during a wallet rescan.
    TRY_LOCK(cs_main, lockMain);
    if (!lockMain) {
        return;
    }
    TRY_LOCK(wallet->cs_wallet, lockWallet);
    if (!lockWallet) {
        return;
    }

    if (fForceCheckBalanceChanged || chainActive.Height() != cachedNumBlocks) {
        fForceCheckBalanceChanged = false;

        // Balance and number of transactions might have changed
        cachedNumBlocks = chainActive.Height();

        checkBalanceChanged();
        if (transactionTableModel) {
            transactionTableModel->updateConfirmations();
        }
    }
}

void WalletModel::checkBalanceChanged() {
    Amount newBalance(getBalance());
    Amount newUnconfirmedBalance(getUnconfirmedBalance());
    Amount newImmatureBalance(getImmatureBalance());
    Amount newWatchOnlyBalance = Amount::zero();
    Amount newWatchUnconfBalance = Amount::zero();
    Amount newWatchImmatureBalance = Amount::zero();
    if (haveWatchOnly()) {
        newWatchOnlyBalance = getWatchBalance();
        newWatchUnconfBalance = getWatchUnconfirmedBalance();
        newWatchImmatureBalance = getWatchImmatureBalance();
    }

    if (cachedBalance != newBalance ||
        cachedUnconfirmedBalance != newUnconfirmedBalance ||
        cachedImmatureBalance != newImmatureBalance ||
        cachedWatchOnlyBalance != newWatchOnlyBalance ||
        cachedWatchUnconfBalance != newWatchUnconfBalance ||
        cachedWatchImmatureBalance != newWatchImmatureBalance) {
        cachedBalance = newBalance;
        cachedUnconfirmedBalance = newUnconfirmedBalance;
        cachedImmatureBalance = newImmatureBalance;
        cachedWatchOnlyBalance = newWatchOnlyBalance;
        cachedWatchUnconfBalance = newWatchUnconfBalance;
        cachedWatchImmatureBalance = newWatchImmatureBalance;
        Q_EMIT balanceChanged(newBalance, newUnconfirmedBalance,
                              newImmatureBalance, newWatchOnlyBalance,
                              newWatchUnconfBalance, newWatchImmatureBalance);
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
    return IsValidDestinationString(address.toStdString(),
                                    GetConfig().GetChainParams());
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

            CScript scriptPubKey = GetScriptForDestination(DecodeDestination(
                rcp.address.toStdString(), wallet->chainParams));
            CRecipient recipient = {scriptPubKey, Amount(rcp.amount),
                                    rcp.fSubtractFeeFromAmount};
            vecSend.push_back(recipient);

            total += rcp.amount;
        }
    }
    if (setAddress.size() != nAddresses) {
        return DuplicateAddress;
    }

    Amount nBalance = getBalance(&coinControl);

    if (total > nBalance) {
        return AmountExceedsBalance;
    }

    {
        LOCK2(cs_main, wallet->cs_wallet);

        transaction.newPossibleKeyChange(wallet);

        Amount nFeeRequired = Amount::zero();
        int nChangePosRet = -1;
        std::string strFailReason;

        CTransactionRef &newTx = transaction.getTransaction();
        CReserveKey *keyChange = transaction.getPossibleKeyChange();
        bool fCreated = wallet->CreateTransaction(vecSend, newTx, *keyChange,
                                                  nFeeRequired, nChangePosRet,
                                                  strFailReason, coinControl);
        transaction.setTransactionFee(nFeeRequired);
        if (fSubtractFeeFromAmount && fCreated) {
            transaction.reassignAmounts(nChangePosRet);
        }

        if (!fCreated) {
            if (!fSubtractFeeFromAmount && (total + nFeeRequired) > nBalance) {
                return SendCoinsReturn(AmountWithFeeExceedsBalance);
            }
            Q_EMIT message(tr("Send Coins"),
                           QString::fromStdString(strFailReason),
                           CClientUIInterface::MSG_ERROR);
            return TransactionCreationFailed;
        }

        // reject absurdly high fee. (This can never happen because the wallet
        // caps the fee at maxTxFee. This merely serves as a belt-and-suspenders
        // check)
        if (nFeeRequired > Amount(maxTxFee)) {
            return AbsurdFee;
        }
    }

    return SendCoinsReturn(OK);
}

WalletModel::SendCoinsReturn
WalletModel::sendCoins(WalletModelTransaction &transaction) {
    /* store serialized transaction */
    QByteArray transaction_array;

    {
        LOCK2(cs_main, wallet->cs_wallet);

        std::vector<std::pair<std::string, std::string>> vOrderForm;
        for (const SendCoinsRecipient &rcp : transaction.getRecipients()) {
            if (rcp.paymentRequest.IsInitialized()) {
                // Make sure any payment requests involved are still valid.
                if (PaymentServer::verifyExpired(
                        rcp.paymentRequest.getDetails())) {
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

        CTransactionRef &newTx = transaction.getTransaction();
        CReserveKey *keyChange = transaction.getPossibleKeyChange();
        CValidationState state;
        if (!wallet->CommitTransaction(
                newTx, {} /* mapValue */, std::move(vOrderForm),
                {} /* fromAccount */, *keyChange, g_connman.get(), state)) {
            return SendCoinsReturn(
                TransactionCommitFailed,
                QString::fromStdString(state.GetRejectReason()));
        }

        CDataStream ssTx(SER_NETWORK, PROTOCOL_VERSION);
        ssTx << newTx;
        transaction_array.append(&(ssTx[0]), ssTx.size());
    }

    // Add addresses / update labels that we've sent to to the address book, and
    // emit coinsSent signal for each recipient
    for (const SendCoinsRecipient &rcp : transaction.getRecipients()) {
        // Don't touch the address book when we have a payment request
        if (!rcp.paymentRequest.IsInitialized()) {
            std::string strAddress = rcp.address.toStdString();
            CTxDestination dest =
                DecodeDestination(strAddress, wallet->chainParams);
            std::string strLabel = rcp.label.toStdString();
            {
                LOCK(wallet->cs_wallet);

                std::map<CTxDestination, CAddressBookData>::iterator mi =
                    wallet->mapAddressBook.find(dest);

                // Check if we have a new address or an updated label
                if (mi == wallet->mapAddressBook.end()) {
                    wallet->SetAddressBook(dest, strLabel, "send");
                } else if (mi->second.name != strLabel) {
                    // "" means don't change purpose
                    wallet->SetAddressBook(dest, strLabel, "");
                }
            }
        }
        Q_EMIT coinsSent(wallet, rcp, transaction_array);
    }

    // update balance immediately, otherwise there could be a short noticeable
    // delay until pollBalanceChanged hits
    checkBalanceChanged();

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
    if (!wallet->IsCrypted()) {
        return Unencrypted;
    } else if (wallet->IsLocked()) {
        return Locked;
    } else {
        return Unlocked;
    }
}

bool WalletModel::setWalletEncrypted(bool encrypted,
                                     const SecureString &passphrase) {
    if (encrypted) {
        // Encrypt
        return wallet->EncryptWallet(passphrase);
    } else {
        // Decrypt -- TODO; not supported yet
        return false;
    }
}

bool WalletModel::setWalletLocked(bool locked, const SecureString &passPhrase) {
    if (locked) {
        // Lock
        return wallet->Lock();
    } else {
        // Unlock
        return wallet->Unlock(passPhrase);
    }
}

bool WalletModel::changePassphrase(const SecureString &oldPass,
                                   const SecureString &newPass) {
    LOCK(wallet->cs_wallet);
    // Make sure wallet is locked before attempting pass change
    wallet->Lock();
    return wallet->ChangeWalletPassphrase(oldPass, newPass);
}

bool WalletModel::backupWallet(const QString &filename) {
    return wallet->BackupWallet(filename.toLocal8Bit().data());
}

// Handlers for core signals
static void NotifyKeyStoreStatusChanged(WalletModel *walletmodel,
                                        CCryptoKeyStore *wallet) {
    qDebug() << "NotifyKeyStoreStatusChanged";
    QMetaObject::invokeMethod(walletmodel, "updateStatus",
                              Qt::QueuedConnection);
}

static void NotifyAddressBookChanged(WalletModel *walletmodel, CWallet *wallet,
                                     const CTxDestination &address,
                                     const std::string &label, bool isMine,
                                     const std::string &purpose,
                                     ChangeType status) {
    QString strAddress = QString::fromStdString(EncodeDestination(address));
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

static void NotifyTransactionChanged(WalletModel *walletmodel, CWallet *wallet,
                                     const uint256 &hash, ChangeType status) {
    Q_UNUSED(wallet);
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
    wallet->NotifyStatusChanged.connect(
        boost::bind(&NotifyKeyStoreStatusChanged, this, _1));
    wallet->NotifyAddressBookChanged.connect(
        boost::bind(NotifyAddressBookChanged, this, _1, _2, _3, _4, _5, _6));
    wallet->NotifyTransactionChanged.connect(
        boost::bind(NotifyTransactionChanged, this, _1, _2, _3));
    wallet->ShowProgress.connect(boost::bind(ShowProgress, this, _1, _2));
    wallet->NotifyWatchonlyChanged.connect(
        boost::bind(NotifyWatchonlyChanged, this, _1));
}

void WalletModel::unsubscribeFromCoreSignals() {
    // Disconnect signals from wallet
    wallet->NotifyStatusChanged.disconnect(
        boost::bind(&NotifyKeyStoreStatusChanged, this, _1));
    wallet->NotifyAddressBookChanged.disconnect(
        boost::bind(NotifyAddressBookChanged, this, _1, _2, _3, _4, _5, _6));
    wallet->NotifyTransactionChanged.disconnect(
        boost::bind(NotifyTransactionChanged, this, _1, _2, _3));
    wallet->ShowProgress.disconnect(boost::bind(ShowProgress, this, _1, _2));
    wallet->NotifyWatchonlyChanged.disconnect(
        boost::bind(NotifyWatchonlyChanged, this, _1));
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

bool WalletModel::getPubKey(const CKeyID &address,
                            CPubKey &vchPubKeyOut) const {
    return wallet->GetPubKey(address, vchPubKeyOut);
}

bool WalletModel::IsSpendable(const CTxDestination &dest) const {
    return IsMine(*wallet, dest) & ISMINE_SPENDABLE;
}

bool WalletModel::getPrivKey(const CKeyID &address, CKey &vchPrivKeyOut) const {
    return wallet->GetKey(address, vchPrivKeyOut);
}

// returns a list of COutputs from COutPoints
void WalletModel::getOutputs(const std::vector<COutPoint> &vOutpoints,
                             std::vector<COutput> &vOutputs) {
    LOCK2(cs_main, wallet->cs_wallet);
    for (const COutPoint &outpoint : vOutpoints) {
        auto it = wallet->mapWallet.find(outpoint.GetTxId());
        if (it == wallet->mapWallet.end()) {
            continue;
        }
        int nDepth = it->second.GetDepthInMainChain();
        if (nDepth < 0) {
            continue;
        }
        COutput out(&it->second, outpoint.GetN(), nDepth, true /* spendable */,
                    true /* solvable */, true /* safe */);
        vOutputs.push_back(out);
    }
}

bool WalletModel::isSpent(const COutPoint &outpoint) const {
    LOCK2(cs_main, wallet->cs_wallet);
    return wallet->IsSpent(outpoint.GetTxId(), outpoint.GetN());
}

// AvailableCoins + LockedCoins grouped by wallet address (put change in one
// group with wallet address)
void WalletModel::listCoins(
    std::map<QString, std::vector<COutput>> &mapCoins) const {
    for (auto &group : wallet->ListCoins()) {
        auto &resultGroup =
            mapCoins[QString::fromStdString(EncodeDestination(group.first))];
        for (auto &coin : group.second) {
            resultGroup.emplace_back(std::move(coin));
        }
    }
}

bool WalletModel::isLockedCoin(const TxId &txid, uint32_t n) const {
    LOCK2(cs_main, wallet->cs_wallet);
    return wallet->IsLockedCoin(txid, n);
}

void WalletModel::lockCoin(COutPoint &output) {
    LOCK2(cs_main, wallet->cs_wallet);
    wallet->LockCoin(output);
}

void WalletModel::unlockCoin(COutPoint &output) {
    LOCK2(cs_main, wallet->cs_wallet);
    wallet->UnlockCoin(output);
}

void WalletModel::listLockedCoins(std::vector<COutPoint> &vOutpts) {
    LOCK2(cs_main, wallet->cs_wallet);
    wallet->ListLockedCoins(vOutpts);
}

void WalletModel::loadReceiveRequests(
    std::vector<std::string> &vReceiveRequests) {
    // receive request
    vReceiveRequests = wallet->GetDestValues("rr");
}

bool WalletModel::saveReceiveRequest(const std::string &sAddress,
                                     const int64_t nId,
                                     const std::string &sRequest) {
    CTxDestination dest = DecodeDestination(sAddress, wallet->chainParams);

    std::stringstream ss;
    ss << nId;
    // "rr" prefix = "receive request" in destdata
    std::string key = "rr" + ss.str();

    LOCK(wallet->cs_wallet);
    return sRequest.empty() ? wallet->EraseDestData(dest, key)
                            : wallet->AddDestData(dest, key, sRequest);
}

bool WalletModel::transactionCanBeAbandoned(const TxId &txid) const {
    return wallet->TransactionCanBeAbandoned(txid);
}

bool WalletModel::abandonTransaction(const TxId &txid) const {
    LOCK2(cs_main, wallet->cs_wallet);
    return wallet->AbandonTransaction(txid);
}

bool WalletModel::isWalletEnabled() {
    return !gArgs.GetBoolArg("-disablewallet", DEFAULT_DISABLE_WALLET);
}

bool WalletModel::hdEnabled() const {
    return wallet->IsHDEnabled();
}

QString WalletModel::getWalletName() const {
    LOCK(wallet->cs_wallet);
    return QString::fromStdString(wallet->GetName());
}

bool WalletModel::isMultiwallet() {
    return gArgs.GetArgs("-wallet").size() > 1;
}

const CChainParams &WalletModel::getChainParams() const {
    return wallet->chainParams;
}
