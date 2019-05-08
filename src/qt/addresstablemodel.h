// Copyright (c) 2011-2015 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_QT_ADDRESSTABLEMODEL_H
#define BITCOIN_QT_ADDRESSTABLEMODEL_H

#include <QAbstractTableModel>
#include <QStringList>

class AddressTablePriv;
class WalletModel;

namespace interfaces {
class Wallet;
}

/**
 * Qt model of the address book in the core. This allows views to access and
 * modify the address book.
 */
class AddressTableModel : public QAbstractTableModel {
    Q_OBJECT

public:
    explicit AddressTableModel(WalletModel *parent = 0);
    ~AddressTableModel();

    enum ColumnIndex {
        /**< User specified label */
        Label = 0,
        /**< Bitcoin address */
        Address = 1
    };

    enum RoleIndex {
        /**< Type of address (#Send or #Receive) */
        TypeRole = Qt::UserRole
    };

    /** Return status of edit/insert operation */
    enum EditStatus {
        /**< Everything ok */
        OK,
        /**< No changes were made during edit operation */
        NO_CHANGES,
        /**< Unparseable address */
        INVALID_ADDRESS,
        /**< Address already in address book */
        DUPLICATE_ADDRESS,
        /**< Wallet could not be unlocked to create new receiving address */
        WALLET_UNLOCK_FAILURE,
        /**< Generating a new public key for a receiving address failed */
        KEY_GENERATION_FAILURE
    };

    /**< Specifies send address */
    static const QString Send;
    /**< Specifies receive address */
    static const QString Receive;

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

    /* Add an address to the model.
       Returns the added address on success, and an empty string otherwise.
     */
    QString addRow(const QString &type, const QString &label,
                   const QString &address);

    /* Look up label for address in address book, if not found return empty
     * string.
     */
    QString labelForAddress(const QString &address) const;

    /* Look up row index of an address in the model.
       Return -1 if not found.
     */
    int lookupAddress(const QString &address) const;

    EditStatus getEditStatus() const { return editStatus; }

private:
    WalletModel *walletModel;
    AddressTablePriv *priv;
    QStringList columns;
    EditStatus editStatus;

    /** Notify listeners that data changed. */
    void emitDataChanged(int index);

public Q_SLOTS:
    /* Update address list from core.
     */
    void updateEntry(const QString &address, const QString &label, bool isMine,
                     const QString &purpose, int status);

    friend class AddressTablePriv;
};

#endif // BITCOIN_QT_ADDRESSTABLEMODEL_H
