// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "transactiontablemodel.h"

#include "addresstablemodel.h"
#include "guiconstants.h"
#include "guiutil.h"
#include "optionsmodel.h"
#include "platformstyle.h"
#include "transactiondesc.h"
#include "transactionrecord.h"
#include "walletmodel.h"

#include "core_io.h"
#include "sync.h"
#include "uint256.h"
#include "util.h"
#include "validation.h"
#include "wallet/wallet.h"

#include <QColor>
#include <QDateTime>
#include <QDebug>
#include <QIcon>
#include <QList>

// Amount column is right-aligned it contains numbers
static int column_alignments[] = {
    Qt::AlignLeft | Qt::AlignVCenter, /* status */
    Qt::AlignLeft | Qt::AlignVCenter, /* watchonly */
    Qt::AlignLeft | Qt::AlignVCenter, /* date */
    Qt::AlignLeft | Qt::AlignVCenter, /* type */
    Qt::AlignLeft | Qt::AlignVCenter, /* address */
    Qt::AlignRight | Qt::AlignVCenter /* amount */
};

// Comparison operator for sort/binary search of model tx list
struct TxLessThan {
    bool operator()(const TransactionRecord &a,
                    const TransactionRecord &b) const {
        return a.txid < b.txid;
    }
    bool operator()(const TransactionRecord &a, const TxId &b) const {
        return a.txid < b;
    }
    bool operator()(const TxId &a, const TransactionRecord &b) const {
        return a < b.txid;
    }
};

// Private implementation
class TransactionTablePriv {
public:
    TransactionTablePriv(CWallet *_wallet, TransactionTableModel *_parent)
        : wallet(_wallet), parent(_parent) {}

    CWallet *wallet;
    TransactionTableModel *parent;

    /* Local cache of wallet.
     * As it is in the same order as the CWallet, by definition this is sorted
     * by sha256.
     */
    QList<TransactionRecord> cachedWallet;

    /**
     * Query entire wallet anew from core.
     */
    void refreshWallet() {
        qDebug() << "TransactionTablePriv::refreshWallet";
        cachedWallet.clear();

        LOCK2(cs_main, wallet->cs_wallet);
        for (const std::pair<TxId, CWalletTx> &p : wallet->mapWallet) {
            if (TransactionRecord::showTransaction(p.second)) {
                cachedWallet.append(
                    TransactionRecord::decomposeTransaction(wallet, p.second));
            }
        }
    }

    /**
     * Update our model of the wallet incrementally, to synchronize our model of
     * the wallet with that of the core.
     * Call with transaction that was added, removed or changed.
     */
    void updateWallet(const TxId &txid, int status, bool showTransaction) {
        qDebug() << "TransactionTablePriv::updateWallet: " +
                        QString::fromStdString(txid.ToString()) + " " +
                        QString::number(status);

        // Find bounds of this transaction in model
        QList<TransactionRecord>::iterator lower = qLowerBound(
            cachedWallet.begin(), cachedWallet.end(), txid, TxLessThan());
        QList<TransactionRecord>::iterator upper = qUpperBound(
            cachedWallet.begin(), cachedWallet.end(), txid, TxLessThan());
        int lowerIndex = (lower - cachedWallet.begin());
        int upperIndex = (upper - cachedWallet.begin());
        bool inModel = (lower != upper);

        if (status == CT_UPDATED) {
            // Not in model, but want to show, treat as new.
            if (showTransaction && !inModel) {
                status = CT_NEW;
            }
            // In model, but want to hide, treat as deleted.
            if (!showTransaction && inModel) {
                status = CT_DELETED;
            }
        }

        qDebug() << "    inModel=" + QString::number(inModel) +
                        " Index=" + QString::number(lowerIndex) + "-" +
                        QString::number(upperIndex) +
                        " showTransaction=" + QString::number(showTransaction) +
                        " derivedStatus=" + QString::number(status);

        switch (status) {
            case CT_NEW:
                if (inModel) {
                    qWarning() << "TransactionTablePriv::updateWallet: "
                                  "Warning: Got CT_NEW, but transaction is "
                                  "already in model";
                    break;
                }
                if (showTransaction) {
                    LOCK2(cs_main, wallet->cs_wallet);
                    // Find transaction in wallet
                    std::map<TxId, CWalletTx>::iterator mi =
                        wallet->mapWallet.find(txid);
                    if (mi == wallet->mapWallet.end()) {
                        qWarning() << "TransactionTablePriv::updateWallet: "
                                      "Warning: Got CT_NEW, but transaction is "
                                      "not in wallet";
                        break;
                    }
                    // Added -- insert at the right position
                    QList<TransactionRecord> toInsert =
                        TransactionRecord::decomposeTransaction(wallet,
                                                                mi->second);
                    /* only if something to insert */
                    if (!toInsert.isEmpty()) {
                        parent->beginInsertRows(QModelIndex(), lowerIndex,
                                                lowerIndex + toInsert.size() -
                                                    1);
                        int insert_idx = lowerIndex;
                        for (const TransactionRecord &rec : toInsert) {
                            cachedWallet.insert(insert_idx, rec);
                            insert_idx += 1;
                        }
                        parent->endInsertRows();
                    }
                }
                break;
            case CT_DELETED:
                if (!inModel) {
                    qWarning() << "TransactionTablePriv::updateWallet: "
                                  "Warning: Got CT_DELETED, but transaction is "
                                  "not in model";
                    break;
                }
                // Removed -- remove entire transaction from table
                parent->beginRemoveRows(QModelIndex(), lowerIndex,
                                        upperIndex - 1);
                cachedWallet.erase(lower, upper);
                parent->endRemoveRows();
                break;
            case CT_UPDATED:
                // Miscellaneous updates -- nothing to do, status update will
                // take care of this, and is only computed for visible
                // transactions.
                break;
        }
    }

    int size() { return cachedWallet.size(); }

    TransactionRecord *index(int idx) {
        if (idx >= 0 && idx < cachedWallet.size()) {
            TransactionRecord *rec = &cachedWallet[idx];

            // Get required locks upfront. This avoids the GUI from getting
            // stuck if the core is holding the locks for a longer time - for
            // example, during a wallet rescan.
            //
            // If a status update is needed (blocks came in since last check),
            // update the status of this transaction from the wallet. Otherwise,
            // simply re-use the cached status.
            TRY_LOCK(cs_main, lockMain);
            if (lockMain) {
                TRY_LOCK(wallet->cs_wallet, lockWallet);
                if (lockWallet && rec->statusUpdateNeeded()) {
                    std::map<TxId, CWalletTx>::iterator mi =
                        wallet->mapWallet.find(rec->txid);

                    if (mi != wallet->mapWallet.end()) {
                        rec->updateStatus(mi->second);
                    }
                }
            }
            return rec;
        }
        return 0;
    }

    QString describe(TransactionRecord *rec, int unit) {
        LOCK2(cs_main, wallet->cs_wallet);
        std::map<TxId, CWalletTx>::iterator mi =
            wallet->mapWallet.find(rec->txid);
        if (mi != wallet->mapWallet.end()) {
            return TransactionDesc::toHTML(wallet, mi->second, rec, unit);
        }

        return QString();
    }

    QString getTxHex(TransactionRecord *rec) {
        LOCK2(cs_main, wallet->cs_wallet);
        std::map<TxId, CWalletTx>::iterator mi =
            wallet->mapWallet.find(rec->txid);
        if (mi != wallet->mapWallet.end()) {
            std::string strHex =
                EncodeHexTx(static_cast<CTransaction>(mi->second));
            return QString::fromStdString(strHex);
        }
        return QString();
    }
};

TransactionTableModel::TransactionTableModel(
    const PlatformStyle *_platformStyle, CWallet *_wallet, WalletModel *parent)
    : QAbstractTableModel(parent), wallet(_wallet), walletModel(parent),
      priv(new TransactionTablePriv(_wallet, this)),
      fProcessingQueuedTransactions(false), platformStyle(_platformStyle) {
    columns << QString() << QString() << tr("Date") << tr("Type") << tr("Label")
            << BitcoinUnits::getAmountColumnTitle(
                   walletModel->getOptionsModel()->getDisplayUnit());
    priv->refreshWallet();

    connect(walletModel->getOptionsModel(), SIGNAL(displayUnitChanged(int)),
            this, SLOT(updateDisplayUnit()));

    subscribeToCoreSignals();
}

TransactionTableModel::~TransactionTableModel() {
    unsubscribeFromCoreSignals();
    delete priv;
}

/** Updates the column title to "Amount (DisplayUnit)" and emits
 * headerDataChanged() signal for table headers to react. */
void TransactionTableModel::updateAmountColumnTitle() {
    columns[Amount] = BitcoinUnits::getAmountColumnTitle(
        walletModel->getOptionsModel()->getDisplayUnit());
    Q_EMIT headerDataChanged(Qt::Horizontal, Amount, Amount);
}

void TransactionTableModel::updateTransaction(const QString &hash, int status,
                                              bool showTransaction) {
    TxId updated;
    updated.SetHex(hash.toStdString());

    priv->updateWallet(updated, status, showTransaction);
}

void TransactionTableModel::updateConfirmations() {
    // Blocks came in since last poll.
    // Invalidate status (number of confirmations) and (possibly) description
    // for all rows. Qt is smart enough to only actually request the data for
    // the visible rows.
    Q_EMIT dataChanged(index(0, Status), index(priv->size() - 1, Status));
    Q_EMIT dataChanged(index(0, ToAddress), index(priv->size() - 1, ToAddress));
}

int TransactionTableModel::rowCount(const QModelIndex &parent) const {
    Q_UNUSED(parent);
    return priv->size();
}

int TransactionTableModel::columnCount(const QModelIndex &parent) const {
    Q_UNUSED(parent);
    return columns.length();
}

QString
TransactionTableModel::formatTxStatus(const TransactionRecord *wtx) const {
    QString status;

    switch (wtx->status.status) {
        case TransactionStatus::OpenUntilBlock:
            status = tr("Open for %n more block(s)", "", wtx->status.open_for);
            break;
        case TransactionStatus::OpenUntilDate:
            status = tr("Open until %1")
                         .arg(GUIUtil::dateTimeStr(wtx->status.open_for));
            break;
        case TransactionStatus::Offline:
            status = tr("Offline");
            break;
        case TransactionStatus::Unconfirmed:
            status = tr("Unconfirmed");
            break;
        case TransactionStatus::Abandoned:
            status = tr("Abandoned");
            break;
        case TransactionStatus::Confirming:
            status = tr("Confirming (%1 of %2 recommended confirmations)")
                         .arg(wtx->status.depth)
                         .arg(TransactionRecord::RecommendedNumConfirmations);
            break;
        case TransactionStatus::Confirmed:
            status = tr("Confirmed (%1 confirmations)").arg(wtx->status.depth);
            break;
        case TransactionStatus::Conflicted:
            status = tr("Conflicted");
            break;
        case TransactionStatus::Immature:
            status =
                tr("Immature (%1 confirmations, will be available after %2)")
                    .arg(wtx->status.depth)
                    .arg(wtx->status.depth + wtx->status.matures_in);
            break;
        case TransactionStatus::MaturesWarning:
            status = tr("This block was not received by any other nodes and "
                        "will probably not be accepted!");
            break;
        case TransactionStatus::NotAccepted:
            status = tr("Generated but not accepted");
            break;
    }

    return status;
}

QString
TransactionTableModel::formatTxDate(const TransactionRecord *wtx) const {
    if (wtx->time) {
        return GUIUtil::dateTimeStr(wtx->time);
    }
    return QString();
}

/**
 * Look up address in address book, if found return label (address)  otherwise
 * just return (address)
 */
QString TransactionTableModel::lookupAddress(const std::string &address,
                                             bool tooltip) const {
    QString label = walletModel->getAddressTableModel()->labelForAddress(
        QString::fromStdString(address));
    QString description;
    if (!label.isEmpty()) {
        description += label;
    }
    if (label.isEmpty() || tooltip) {
        description +=
            QString(" (") + QString::fromStdString(address) + QString(")");
    }
    return description;
}

QString
TransactionTableModel::formatTxType(const TransactionRecord *wtx) const {
    switch (wtx->type) {
        case TransactionRecord::RecvWithAddress:
            return tr("Received with");
        case TransactionRecord::RecvFromOther:
            return tr("Received from");
        case TransactionRecord::SendToAddress:
        case TransactionRecord::SendToOther:
            return tr("Sent to");
        case TransactionRecord::SendToSelf:
            return tr("Payment to yourself");
        case TransactionRecord::Generated:
            return tr("Mined");
        default:
            return QString();
    }
}

QVariant
TransactionTableModel::txAddressDecoration(const TransactionRecord *wtx) const {
    switch (wtx->type) {
        case TransactionRecord::Generated:
            return QIcon(":/icons/tx_mined");
        case TransactionRecord::RecvWithAddress:
        case TransactionRecord::RecvFromOther:
            return QIcon(":/icons/tx_input");
        case TransactionRecord::SendToAddress:
        case TransactionRecord::SendToOther:
            return QIcon(":/icons/tx_output");
        default:
            return QIcon(":/icons/tx_inout");
    }
}

QString TransactionTableModel::formatTxToAddress(const TransactionRecord *wtx,
                                                 bool tooltip) const {
    QString watchAddress;
    if (tooltip) {
        // Mark transactions involving watch-only addresses by adding "
        // (watch-only)"
        watchAddress = wtx->involvesWatchAddress
                           ? QString(" (") + tr("watch-only") + QString(")")
                           : "";
    }

    switch (wtx->type) {
        case TransactionRecord::RecvFromOther:
            return QString::fromStdString(wtx->address) + watchAddress;
        case TransactionRecord::RecvWithAddress:
        case TransactionRecord::SendToAddress:
        case TransactionRecord::Generated:
            return lookupAddress(wtx->address, tooltip) + watchAddress;
        case TransactionRecord::SendToOther:
            return QString::fromStdString(wtx->address) + watchAddress;
        case TransactionRecord::SendToSelf:
        default:
            return tr("(n/a)") + watchAddress;
    }
}

QVariant
TransactionTableModel::addressColor(const TransactionRecord *wtx) const {
    // Show addresses without label in a less visible color
    switch (wtx->type) {
        case TransactionRecord::RecvWithAddress:
        case TransactionRecord::SendToAddress:
        case TransactionRecord::Generated: {
            QString label =
                walletModel->getAddressTableModel()->labelForAddress(
                    QString::fromStdString(wtx->address));
            if (label.isEmpty()) return COLOR_BAREADDRESS;
        } break;
        case TransactionRecord::SendToSelf:
            return COLOR_BAREADDRESS;
        default:
            break;
    }
    return QVariant();
}

QString TransactionTableModel::formatTxAmount(
    const TransactionRecord *wtx, bool showUnconfirmed,
    BitcoinUnits::SeparatorStyle separators) const {
    QString str =
        BitcoinUnits::format(walletModel->getOptionsModel()->getDisplayUnit(),
                             wtx->credit + wtx->debit, false, separators);
    if (showUnconfirmed) {
        if (!wtx->status.countsForBalance) {
            str = QString("[") + str + QString("]");
        }
    }
    return QString(str);
}

QVariant
TransactionTableModel::txStatusDecoration(const TransactionRecord *wtx) const {
    switch (wtx->status.status) {
        case TransactionStatus::OpenUntilBlock:
        case TransactionStatus::OpenUntilDate:
            return COLOR_TX_STATUS_OPENUNTILDATE;
        case TransactionStatus::Offline:
            return COLOR_TX_STATUS_OFFLINE;
        case TransactionStatus::Unconfirmed:
            return QIcon(":/icons/transaction_0");
        case TransactionStatus::Abandoned:
            return QIcon(":/icons/transaction_abandoned");
        case TransactionStatus::Confirming:
            switch (wtx->status.depth) {
                case 1:
                    return QIcon(":/icons/transaction_1");
                case 2:
                    return QIcon(":/icons/transaction_2");
                case 3:
                    return QIcon(":/icons/transaction_3");
                case 4:
                    return QIcon(":/icons/transaction_4");
                default:
                    return QIcon(":/icons/transaction_5");
            };
        case TransactionStatus::Confirmed:
            return QIcon(":/icons/transaction_confirmed");
        case TransactionStatus::Conflicted:
            return QIcon(":/icons/transaction_conflicted");
        case TransactionStatus::Immature: {
            int total = wtx->status.depth + wtx->status.matures_in;
            int part = (wtx->status.depth * 4 / total) + 1;
            return QIcon(QString(":/icons/transaction_%1").arg(part));
        }
        case TransactionStatus::MaturesWarning:
        case TransactionStatus::NotAccepted:
            return QIcon(":/icons/transaction_0");
        default:
            return COLOR_BLACK;
    }
}

QVariant TransactionTableModel::txWatchonlyDecoration(
    const TransactionRecord *wtx) const {
    if (wtx->involvesWatchAddress) {
        return QIcon(":/icons/eye");
    }

    return QVariant();
}

QString
TransactionTableModel::formatTooltip(const TransactionRecord *rec) const {
    QString tooltip = formatTxStatus(rec) + QString("\n") + formatTxType(rec);
    if (rec->type == TransactionRecord::RecvFromOther ||
        rec->type == TransactionRecord::SendToOther ||
        rec->type == TransactionRecord::SendToAddress ||
        rec->type == TransactionRecord::RecvWithAddress) {
        tooltip += QString(" ") + formatTxToAddress(rec, true);
    }
    return tooltip;
}

QVariant TransactionTableModel::data(const QModelIndex &index, int role) const {
    if (!index.isValid()) {
        return QVariant();
    }

    TransactionRecord *rec =
        static_cast<TransactionRecord *>(index.internalPointer());

    switch (role) {
        case RawDecorationRole:
            switch (index.column()) {
                case Status:
                    return txStatusDecoration(rec);
                case Watchonly:
                    return txWatchonlyDecoration(rec);
                case ToAddress:
                    return txAddressDecoration(rec);
            }
            break;
        case Qt::DecorationRole: {
            QIcon icon = qvariant_cast<QIcon>(index.data(RawDecorationRole));
            return platformStyle->TextColorIcon(icon);
        }
        case Qt::DisplayRole:
            switch (index.column()) {
                case Date:
                    return formatTxDate(rec);
                case Type:
                    return formatTxType(rec);
                case ToAddress:
                    return formatTxToAddress(rec, false);
                case Amount:
                    return formatTxAmount(rec, true,
                                          BitcoinUnits::separatorAlways);
            }
            break;
        case Qt::EditRole:
            // Edit role is used for sorting, so return the unformatted values
            switch (index.column()) {
                case Status:
                    return QString::fromStdString(rec->status.sortKey);
                case Date:
                    return rec->time;
                case Type:
                    return formatTxType(rec);
                case Watchonly:
                    return (rec->involvesWatchAddress ? 1 : 0);
                case ToAddress:
                    return formatTxToAddress(rec, true);
                case Amount:
                    return qint64((rec->credit + rec->debit) / SATOSHI);
            }
            break;
        case Qt::ToolTipRole:
            return formatTooltip(rec);
        case Qt::TextAlignmentRole:
            return column_alignments[index.column()];
        case Qt::ForegroundRole:
            // Use the "danger" color for abandoned transactions
            if (rec->status.status == TransactionStatus::Abandoned) {
                return COLOR_TX_STATUS_DANGER;
            }
            // Non-confirmed (but not immature) as transactions are grey
            if (!rec->status.countsForBalance &&
                rec->status.status != TransactionStatus::Immature) {
                return COLOR_UNCONFIRMED;
            }
            if (index.column() == Amount &&
                (rec->credit + rec->debit) < ::Amount::zero()) {
                return COLOR_NEGATIVE;
            }
            if (index.column() == ToAddress) {
                return addressColor(rec);
            }
            break;
        case TypeRole:
            return rec->type;
        case DateRole:
            return QDateTime::fromTime_t(static_cast<uint>(rec->time));
        case WatchonlyRole:
            return rec->involvesWatchAddress;
        case WatchonlyDecorationRole:
            return txWatchonlyDecoration(rec);
        case LongDescriptionRole:
            return priv->describe(
                rec, walletModel->getOptionsModel()->getDisplayUnit());
        case AddressRole:
            return QString::fromStdString(rec->address);
        case LabelRole:
            return walletModel->getAddressTableModel()->labelForAddress(
                QString::fromStdString(rec->address));
        case AmountRole:
            return qint64((rec->credit + rec->debit) / SATOSHI);
        case TxIDRole:
            return rec->getTxID();
        case TxHashRole:
            return QString::fromStdString(rec->txid.ToString());
        case TxHexRole:
            return priv->getTxHex(rec);
        case TxPlainTextRole: {
            QString details;
            QDateTime date =
                QDateTime::fromTime_t(static_cast<uint>(rec->time));
            QString txLabel =
                walletModel->getAddressTableModel()->labelForAddress(
                    QString::fromStdString(rec->address));

            details.append(date.toString("M/d/yy HH:mm"));
            details.append(" ");
            details.append(formatTxStatus(rec));
            details.append(". ");
            if (!formatTxType(rec).isEmpty()) {
                details.append(formatTxType(rec));
                details.append(" ");
            }
            if (!rec->address.empty()) {
                if (txLabel.isEmpty()) {
                    details.append(tr("(no label)") + " ");
                } else {
                    details.append("(");
                    details.append(txLabel);
                    details.append(") ");
                }
                details.append(QString::fromStdString(rec->address));
                details.append(" ");
            }
            details.append(
                formatTxAmount(rec, false, BitcoinUnits::separatorNever));
            return details;
        }
        case ConfirmedRole:
            return rec->status.countsForBalance;
        case FormattedAmountRole:
            // Used for copy/export, so don't include separators
            return formatTxAmount(rec, false, BitcoinUnits::separatorNever);
        case StatusRole:
            return rec->status.status;
    }
    return QVariant();
}

QVariant TransactionTableModel::headerData(int section,
                                           Qt::Orientation orientation,
                                           int role) const {
    if (orientation == Qt::Horizontal) {
        if (role == Qt::DisplayRole) {
            return columns[section];
        } else if (role == Qt::TextAlignmentRole) {
            return column_alignments[section];
        } else if (role == Qt::ToolTipRole) {
            switch (section) {
                case Status:
                    return tr("Transaction status. Hover over this field to "
                              "show number of confirmations.");
                case Date:
                    return tr(
                        "Date and time that the transaction was received.");
                case Type:
                    return tr("Type of transaction.");
                case Watchonly:
                    return tr("Whether or not a watch-only address is involved "
                              "in this transaction.");
                case ToAddress:
                    return tr(
                        "User-defined intent/purpose of the transaction.");
                case Amount:
                    return tr("Amount removed from or added to balance.");
            }
        }
    }
    return QVariant();
}

QModelIndex TransactionTableModel::index(int row, int column,
                                         const QModelIndex &parent) const {
    Q_UNUSED(parent);
    TransactionRecord *data = priv->index(row);
    if (data) {
        return createIndex(row, column, priv->index(row));
    }
    return QModelIndex();
}

void TransactionTableModel::updateDisplayUnit() {
    // emit dataChanged to update Amount column with the current unit
    updateAmountColumnTitle();
    Q_EMIT dataChanged(index(0, Amount), index(priv->size() - 1, Amount));
}

// queue notifications to show a non freezing progress dialog e.g. for rescan
struct TransactionNotification {
public:
    TransactionNotification() {}
    TransactionNotification(TxId _txid, ChangeType _status,
                            bool _showTransaction)
        : txid(_txid), status(_status), showTransaction(_showTransaction) {}

    void invoke(QObject *ttm) {
        QString strHash = QString::fromStdString(txid.GetHex());
        qDebug() << "NotifyTransactionChanged: " + strHash +
                        " status= " + QString::number(status);
        QMetaObject::invokeMethod(ttm, "updateTransaction",
                                  Qt::QueuedConnection, Q_ARG(QString, strHash),
                                  Q_ARG(int, status),
                                  Q_ARG(bool, showTransaction));
    }

private:
    TxId txid;
    ChangeType status;
    bool showTransaction;
};

static bool fQueueNotifications = false;
static std::vector<TransactionNotification> vQueueNotifications;

static void NotifyTransactionChanged(TransactionTableModel *ttm,
                                     CWallet *wallet, const TxId &txid,
                                     ChangeType status) {
    // Find transaction in wallet
    std::map<TxId, CWalletTx>::iterator mi = wallet->mapWallet.find(txid);
    // Determine whether to show transaction or not (determine this here so that
    // no relocking is needed in GUI thread)
    bool inWallet = mi != wallet->mapWallet.end();
    bool showTransaction =
        (inWallet && TransactionRecord::showTransaction(mi->second));

    TransactionNotification notification(txid, status, showTransaction);

    if (fQueueNotifications) {
        vQueueNotifications.push_back(notification);
        return;
    }
    notification.invoke(ttm);
}

static void ShowProgress(TransactionTableModel *ttm, const std::string &title,
                         int nProgress) {
    if (nProgress == 0) {
        fQueueNotifications = true;
    }

    if (nProgress == 100) {
        fQueueNotifications = false;
        if (vQueueNotifications.size() > 10) {
            // prevent balloon spam, show maximum 10 balloons
            QMetaObject::invokeMethod(ttm, "setProcessingQueuedTransactions",
                                      Qt::QueuedConnection, Q_ARG(bool, true));
        }

        for (size_t i = 0; i < vQueueNotifications.size(); ++i) {
            if (vQueueNotifications.size() - i <= 10) {
                QMetaObject::invokeMethod(
                    ttm, "setProcessingQueuedTransactions",
                    Qt::QueuedConnection, Q_ARG(bool, false));
            }

            vQueueNotifications[i].invoke(ttm);
        }

        // clear
        std::vector<TransactionNotification>().swap(vQueueNotifications);
    }
}

void TransactionTableModel::subscribeToCoreSignals() {
    // Connect signals to wallet
    wallet->NotifyTransactionChanged.connect(
        boost::bind(NotifyTransactionChanged, this, _1, _2, _3));
    wallet->ShowProgress.connect(boost::bind(ShowProgress, this, _1, _2));
}

void TransactionTableModel::unsubscribeFromCoreSignals() {
    // Disconnect signals from wallet
    wallet->NotifyTransactionChanged.disconnect(
        boost::bind(NotifyTransactionChanged, this, _1, _2, _3));
    wallet->ShowProgress.disconnect(boost::bind(ShowProgress, this, _1, _2));
}
