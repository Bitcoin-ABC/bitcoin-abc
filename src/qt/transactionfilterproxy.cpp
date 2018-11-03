// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "transactionfilterproxy.h"

#include "transactionrecord.h"
#include "transactiontablemodel.h"

#include <cstdlib>

#include <QDateTime>

// Earliest date that can be represented (far in the past)
const QDateTime TransactionFilterProxy::MIN_DATE = QDateTime::fromTime_t(0);
// Last date that can be represented (far in the future)
const QDateTime TransactionFilterProxy::MAX_DATE =
    QDateTime::fromTime_t(0xFFFFFFFF);

TransactionFilterProxy::TransactionFilterProxy(QObject *parent)
    : QSortFilterProxyModel(parent), dateFrom(MIN_DATE), dateTo(MAX_DATE),
      addrPrefix(), typeFilter(ALL_TYPES), watchOnlyFilter(WatchOnlyFilter_All),
      minAmount(), limitRows(-1), showInactive(true) {}

bool TransactionFilterProxy::filterAcceptsRow(
    int sourceRow, const QModelIndex &sourceParent) const {
    QModelIndex index = sourceModel()->index(sourceRow, 0, sourceParent);

    int type = index.data(TransactionTableModel::TypeRole).toInt();
    QDateTime datetime =
        index.data(TransactionTableModel::DateRole).toDateTime();
    bool involvesWatchAddress =
        index.data(TransactionTableModel::WatchonlyRole).toBool();
    QString address = index.data(TransactionTableModel::AddressRole).toString();
    QString label = index.data(TransactionTableModel::LabelRole).toString();
    Amount amount(
        int64_t(
            llabs(index.data(TransactionTableModel::AmountRole).toLongLong())) *
        SATOSHI);
    int status = index.data(TransactionTableModel::StatusRole).toInt();

    if (!showInactive && status == TransactionStatus::Conflicted) {
        return false;
    }
    if (!(TYPE(type) & typeFilter)) {
        return false;
    }
    if (involvesWatchAddress && watchOnlyFilter == WatchOnlyFilter_No) {
        return false;
    }
    if (!involvesWatchAddress && watchOnlyFilter == WatchOnlyFilter_Yes) {
        return false;
    }
    if (datetime < dateFrom || datetime > dateTo) {
        return false;
    }
    if (!address.contains(addrPrefix, Qt::CaseInsensitive) &&
        !label.contains(addrPrefix, Qt::CaseInsensitive)) {
        return false;
    }
    if (amount < minAmount) {
        return false;
    }

    return true;
}

void TransactionFilterProxy::setDateRange(const QDateTime &from,
                                          const QDateTime &to) {
    this->dateFrom = from;
    this->dateTo = to;
    invalidateFilter();
}

void TransactionFilterProxy::setAddressPrefix(const QString &_addrPrefix) {
    this->addrPrefix = _addrPrefix;
    invalidateFilter();
}

void TransactionFilterProxy::setTypeFilter(quint32 modes) {
    this->typeFilter = modes;
    invalidateFilter();
}

void TransactionFilterProxy::setMinAmount(const Amount minimum) {
    this->minAmount = minimum;
    invalidateFilter();
}

void TransactionFilterProxy::setWatchOnlyFilter(WatchOnlyFilter filter) {
    this->watchOnlyFilter = filter;
    invalidateFilter();
}

void TransactionFilterProxy::setLimit(int limit) {
    this->limitRows = limit;
}

void TransactionFilterProxy::setShowInactive(bool _showInactive) {
    this->showInactive = _showInactive;
    invalidateFilter();
}

int TransactionFilterProxy::rowCount(const QModelIndex &parent) const {
    if (limitRows != -1) {
        return std::min(QSortFilterProxyModel::rowCount(parent), limitRows);
    } else {
        return QSortFilterProxyModel::rowCount(parent);
    }
}
