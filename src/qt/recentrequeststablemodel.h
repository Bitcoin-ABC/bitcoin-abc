// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_QT_RECENTREQUESTSTABLEMODEL_H
#define BITCOIN_QT_RECENTREQUESTSTABLEMODEL_H

#include <qt/walletmodel.h>

#include <QAbstractTableModel>
#include <QDateTime>
#include <QStringList>

class RecentRequestEntry {
public:
    RecentRequestEntry()
        : nVersion(RecentRequestEntry::CURRENT_VERSION), id(0) {}

    static const int CURRENT_VERSION = 1;
    int nVersion;
    int64_t id;
    QDateTime date;
    SendCoinsRecipient recipient;

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        unsigned int nDate = date.toTime_t();

        READWRITE(this->nVersion);
        READWRITE(id);
        READWRITE(nDate);
        READWRITE(recipient);

        if (ser_action.ForRead()) date = QDateTime::fromTime_t(nDate);
    }
};

class RecentRequestEntryLessThan {
public:
    RecentRequestEntryLessThan(int nColumn, Qt::SortOrder fOrder)
        : column(nColumn), order(fOrder) {}
    bool operator()(RecentRequestEntry &left, RecentRequestEntry &right) const;

private:
    int column;
    Qt::SortOrder order;
};

/**
 * Model for list of recently generated payment requests / bitcoincash: URIs.
 * Part of wallet model.
 */
class RecentRequestsTableModel : public QAbstractTableModel {
    Q_OBJECT

public:
    explicit RecentRequestsTableModel(WalletModel *parent);
    ~RecentRequestsTableModel();

    enum ColumnIndex {
        Date = 0,
        Label = 1,
        Message = 2,
        Amount = 3,
        NUMBER_OF_COLUMNS
    };

    /** @name Methods overridden from QAbstractTableModel
        @{*/
    int rowCount(const QModelIndex &parent) const override;
    int columnCount(const QModelIndex &parent) const override;
    QVariant data(const QModelIndex &index, int role) const override;
    bool setData(const QModelIndex &index, const QVariant &value,
                 int role) override;
    QVariant headerData(int section, Qt::Orientation orientation,
                        int role) const override;
    QModelIndex index(int row, int column,
                      const QModelIndex &parent) const override;
    bool removeRows(int row, int count,
                    const QModelIndex &parent = QModelIndex()) override;
    Qt::ItemFlags flags(const QModelIndex &index) const override;
    /*@}*/

    const RecentRequestEntry &entry(int row) const { return list[row]; }
    void addNewRequest(const SendCoinsRecipient &recipient);
    void addNewRequest(const std::string &recipient);
    void addNewRequest(RecentRequestEntry &recipient);

public Q_SLOTS:
    void sort(int column, Qt::SortOrder order = Qt::AscendingOrder) override;
    void updateDisplayUnit();

private:
    WalletModel *walletModel;
    QStringList columns;
    QList<RecentRequestEntry> list;
    int64_t nReceiveRequestsMaxId;

    /** Updates the column title to "Amount (DisplayUnit)" and emits
     * headerDataChanged() signal for table headers to react. */
    void updateAmountColumnTitle();
    /** Gets title for amount column including current display unit if
     * optionsModel reference available. */
    QString getAmountTitle();
};

#endif // BITCOIN_QT_RECENTREQUESTSTABLEMODEL_H
