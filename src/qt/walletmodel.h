// Copyright (c) 2011-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_QT_WALLETMODEL_H
#define BITCOIN_QT_WALLETMODEL_H

#include <chainparams.h>
#include <interfaces/wallet.h>

#if defined(HAVE_CONFIG_H)
#include <config/bitcoin-config.h>
#endif

#include <qt/walletmodeltransaction.h>
#include <support/allocators/secure.h>

#include <QObject>

#include <memory>
#include <vector>

class AddressTableModel;
class ClientModel;
class OptionsModel;
class PlatformStyle;
class RecentRequestsTableModel;
class SendCoinsRecipient;
class TransactionTableModel;
class WalletModelTransaction;

class CCoinControl;
class CKeyID;
class COutPoint;
class COutput;
class CPubKey;

namespace interfaces {
class Node;
} // namespace interfaces

QT_BEGIN_NAMESPACE
class QTimer;
QT_END_NAMESPACE

/** Interface to Bitcoin wallet from Qt view code. */
class WalletModel : public QObject {
    Q_OBJECT

public:
    explicit WalletModel(std::unique_ptr<interfaces::Wallet> wallet,
                         ClientModel &client_model,
                         const PlatformStyle *platformStyle,
                         QObject *parent = nullptr);
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

        // Copy constructor is disabled.
        UnlockContext(const UnlockContext &) = delete;
        // Move operator and constructor transfer the context
        UnlockContext(UnlockContext &&obj) { CopyFrom(std::move(obj)); }
        UnlockContext &operator=(UnlockContext &&rhs) {
            CopyFrom(std::move(rhs));
            return *this;
        }

    private:
        WalletModel *wallet;
        bool valid;
        // mutable, as it can be set to false by copying
        mutable bool relock;

        UnlockContext &operator=(const UnlockContext &) = default;
        void CopyFrom(UnlockContext &&rhs);
    };

    UnlockContext requestUnlock();

    void loadReceiveRequests(std::vector<std::string> &vReceiveRequests);
    bool saveReceiveRequest(const std::string &sAddress, const int64_t nId,
                            const std::string &sRequest);

    static bool isWalletEnabled();

    interfaces::Node &node() const { return m_node; }
    interfaces::Wallet &wallet() const { return *m_wallet; }
    ClientModel &clientModel() const { return *m_client_model; }
    void setClientModel(ClientModel *client_model);

    const CChainParams &getChainParams() const;

    QString getWalletName() const;
    QString getDisplayName() const;

    bool isMultiwallet();

    AddressTableModel *getAddressTableModel() const {
        return addressTableModel;
    }

    BlockHash getLastBlockProcessed() const;

private:
    std::unique_ptr<interfaces::Wallet> m_wallet;
    std::unique_ptr<interfaces::Handler> m_handler_unload;
    std::unique_ptr<interfaces::Handler> m_handler_status_changed;
    std::unique_ptr<interfaces::Handler> m_handler_address_book_changed;
    std::unique_ptr<interfaces::Handler> m_handler_transaction_changed;
    std::unique_ptr<interfaces::Handler> m_handler_show_progress;
    std::unique_ptr<interfaces::Handler> m_handler_watch_only_changed;
    std::unique_ptr<interfaces::Handler> m_handler_can_get_addrs_changed;
    ClientModel *m_client_model;
    interfaces::Node &m_node;

    bool fHaveWatchOnly;
    bool fForceCheckBalanceChanged{false};

    // Wallet has an options model for wallet-specific options (transaction fee,
    // for example)
    OptionsModel *optionsModel;

    AddressTableModel *addressTableModel;
    TransactionTableModel *transactionTableModel;
    RecentRequestsTableModel *recentRequestsTableModel;

    // Cache some values to be able to detect changes
    interfaces::WalletBalances m_cached_balances;
    EncryptionStatus cachedEncryptionStatus;
    QTimer *timer;

    // Block hash denoting when the last balance update was done.
    BlockHash m_cached_last_update_tip{};

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
    void coinsSent(interfaces::Wallet &wallet, SendCoinsRecipient recipient,
                   QByteArray transaction);

    // Show progress dialog e.g. for rescan
    void showProgress(const QString &title, int nProgress);

    // Watch-only address added
    void notifyWatchonlyChanged(bool fHaveWatchonly);

    // Signal that wallet is about to be removed
    void unload();

    // Notify that there are now keys in the keypool
    void canGetAddressesChanged();

public Q_SLOTS:
    /* Starts a timer to periodically update the balance */
    void startPollBalance();

    /* Wallet status might have changed */
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
