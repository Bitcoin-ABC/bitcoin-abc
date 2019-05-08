// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_QT_WALLETMODEL_H
#define BITCOIN_QT_WALLETMODEL_H

#include <chainparams.h>
#include <interfaces/wallet.h>
#include <qt/paymentrequestplus.h>
#include <qt/walletmodeltransaction.h>
#include <support/allocators/secure.h>

#include <QObject>

#include <map>
#include <vector>

class AddressTableModel;
class OptionsModel;
class PlatformStyle;
class RecentRequestsTableModel;
class TransactionTableModel;
class WalletModelTransaction;

class CCoinControl;
class CKeyID;
class COutPoint;
class COutput;
class CPubKey;

namespace interfaces {
class Node;
} // namespace interface

QT_BEGIN_NAMESPACE
class QTimer;
QT_END_NAMESPACE

class SendCoinsRecipient {
public:
    explicit SendCoinsRecipient()
        : amount(), fSubtractFeeFromAmount(false),
          nVersion(SendCoinsRecipient::CURRENT_VERSION) {}
    explicit SendCoinsRecipient(const QString &addr, const QString &_label,
                                const Amount _amount, const QString &_message)
        : address(addr), label(_label), amount(_amount), message(_message),
          fSubtractFeeFromAmount(false),
          nVersion(SendCoinsRecipient::CURRENT_VERSION) {}

    // If from an unauthenticated payment request, this is used for storing the
    // addresses, e.g. address-A<br />address-B<br />address-C.
    // Info: As we don't need to process addresses in here when using payment
    // requests, we can abuse it for displaying an address list.
    // TOFO: This is a hack, should be replaced with a cleaner solution!
    QString address;
    QString label;
    Amount amount;
    // If from a payment request, this is used for storing the memo
    QString message;

    // If from a payment request, paymentRequest.IsInitialized() will be true
    PaymentRequestPlus paymentRequest;
    // Empty if no authentication or invalid signature/cert/etc.
    QString authenticatedMerchant;

    // memory only
    bool fSubtractFeeFromAmount;

    static const int CURRENT_VERSION = 1;
    int nVersion;

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        std::string sAddress = address.toStdString();
        std::string sLabel = label.toStdString();
        std::string sMessage = message.toStdString();
        std::string sPaymentRequest;
        if (!ser_action.ForRead() && paymentRequest.IsInitialized()) {
            paymentRequest.SerializeToString(&sPaymentRequest);
        }

        std::string sAuthenticatedMerchant =
            authenticatedMerchant.toStdString();

        READWRITE(this->nVersion);
        READWRITE(sAddress);
        READWRITE(sLabel);
        READWRITE(amount);
        READWRITE(sMessage);
        READWRITE(sPaymentRequest);
        READWRITE(sAuthenticatedMerchant);

        if (ser_action.ForRead()) {
            address = QString::fromStdString(sAddress);
            label = QString::fromStdString(sLabel);
            message = QString::fromStdString(sMessage);
            if (!sPaymentRequest.empty()) {
                paymentRequest.parse(QByteArray::fromRawData(
                    sPaymentRequest.data(), sPaymentRequest.size()));
            }

            authenticatedMerchant =
                QString::fromStdString(sAuthenticatedMerchant);
        }
    }
};

/** Interface to Bitcoin wallet from Qt view code. */
class WalletModel : public QObject {
    Q_OBJECT

public:
    explicit WalletModel(std::unique_ptr<interfaces::Wallet> wallet,
                         interfaces::Node &node,
                         const PlatformStyle *platformStyle,
                         OptionsModel *optionsModel, QObject *parent = nullptr);
    ~WalletModel();

    // Returned by sendCoins
    enum StatusCode {
        OK,
        InvalidAmount,
        InvalidAddress,
        AmountExceedsBalance,
        AmountWithFeeExceedsBalance,
        DuplicateAddress,
        // Error returned when wallet is still locked
        TransactionCreationFailed,
        TransactionCommitFailed,
        AbsurdFee,
        PaymentRequestExpired
    };

    enum EncryptionStatus {
        // !wallet->IsCrypted()
        Unencrypted,
        // wallet->IsCrypted() && wallet->IsLocked()
        Locked,
        // wallet->IsCrypted() && !wallet->IsLocked()
        Unlocked
    };

    OptionsModel *getOptionsModel();
    AddressTableModel *getAddressTableModel();
    TransactionTableModel *getTransactionTableModel();
    RecentRequestsTableModel *getRecentRequestsTableModel();

    EncryptionStatus getEncryptionStatus() const;

    // Check address for validity
    bool validateAddress(const QString &address);

    // Return status record for SendCoins, contains error id + information
    struct SendCoinsReturn {
        SendCoinsReturn(StatusCode _status = OK,
                        QString _reasonCommitFailed = "")
            : status(_status), reasonCommitFailed(_reasonCommitFailed) {}
        StatusCode status;
        QString reasonCommitFailed;
    };

    // prepare transaction for getting txfee before sending coins
    SendCoinsReturn prepareTransaction(WalletModelTransaction &transaction,
                                       const CCoinControl &coinControl);

    // Send coins to a list of recipients
    SendCoinsReturn sendCoins(WalletModelTransaction &transaction);

    // Wallet encryption
    bool setWalletEncrypted(bool encrypted, const SecureString &passphrase);
    // Passphrase only needed when unlocking
    bool setWalletLocked(bool locked,
                         const SecureString &passPhrase = SecureString());
    bool changePassphrase(const SecureString &oldPass,
                          const SecureString &newPass);

    // RAI object for unlocking wallet, returned by requestUnlock()
    class UnlockContext {
    public:
        UnlockContext(WalletModel *wallet, bool valid, bool relock);
        ~UnlockContext();

        bool isValid() const { return valid; }

        // Copy operator and constructor transfer the context
        UnlockContext(const UnlockContext &obj) { CopyFrom(obj); }
        UnlockContext &operator=(const UnlockContext &rhs) {
            CopyFrom(rhs);
            return *this;
        }

    private:
        WalletModel *wallet;
        bool valid;
        // mutable, as it can be set to false by copying
        mutable bool relock;

        void CopyFrom(const UnlockContext &rhs);
    };

    UnlockContext requestUnlock();

    void loadReceiveRequests(std::vector<std::string> &vReceiveRequests);
    bool saveReceiveRequest(const std::string &sAddress, const int64_t nId,
                            const std::string &sRequest);

    static bool isWalletEnabled();

    interfaces::Node &node() const { return m_node; }
    interfaces::Wallet &wallet() const { return *m_wallet; }

    const CChainParams &getChainParams() const;

    QString getWalletName() const;

    bool isMultiwallet();

private:
    std::unique_ptr<interfaces::Wallet> m_wallet;
    std::unique_ptr<interfaces::Handler> m_handler_status_changed;
    std::unique_ptr<interfaces::Handler> m_handler_address_book_changed;
    std::unique_ptr<interfaces::Handler> m_handler_transaction_changed;
    std::unique_ptr<interfaces::Handler> m_handler_show_progress;
    std::unique_ptr<interfaces::Handler> m_handler_watch_only_changed;
    interfaces::Node &m_node;

    bool fHaveWatchOnly;
    bool fForceCheckBalanceChanged;

    // Wallet has an options model for wallet-specific options (transaction fee,
    // for example)
    OptionsModel *optionsModel;

    AddressTableModel *addressTableModel;
    TransactionTableModel *transactionTableModel;
    RecentRequestsTableModel *recentRequestsTableModel;

    // Cache some values to be able to detect changes
    interfaces::WalletBalances m_cached_balances;
    EncryptionStatus cachedEncryptionStatus;
    int cachedNumBlocks;

    QTimer *pollTimer;

    void subscribeToCoreSignals();
    void unsubscribeFromCoreSignals();
    void checkBalanceChanged(const interfaces::WalletBalances &new_balances);

Q_SIGNALS:
    // Signal that balance in wallet changed
    void balanceChanged(const interfaces::WalletBalances &balances);

    // Encryption status of wallet changed
    void encryptionStatusChanged();

    // Signal emitted when wallet needs to be unlocked
    // It is valid behaviour for listeners to keep the wallet locked after this
    // signal; this means that the unlocking failed or was cancelled.
    void requireUnlock();

    // Fired when a message should be reported to the user
    void message(const QString &title, const QString &message,
                 unsigned int style);

    // Coins sent: from wallet, to recipient, in (serialized) transaction:
    void coinsSent(WalletModel *wallet, SendCoinsRecipient recipient,
                   QByteArray transaction);

    // Show progress dialog e.g. for rescan
    void showProgress(const QString &title, int nProgress);

    // Watch-only address added
    void notifyWatchonlyChanged(bool fHaveWatchonly);

public Q_SLOTS:
    /** Wallet status might have changed. */
    void updateStatus();
    /** New transaction, or transaction changed status. */
    void updateTransaction();
    /** New, updated or removed address book entry. */
    void updateAddressBook(const QString &address, const QString &label,
                           bool isMine, const QString &purpose, int status);
    /** Watch-only added. */
    void updateWatchOnlyFlag(bool fHaveWatchonly);
    /**
     * Current, immature or unconfirmed balance might have changed - emit
     * 'balanceChanged' if so.
     */
    void pollBalanceChanged();
};

#endif // BITCOIN_QT_WALLETMODEL_H
