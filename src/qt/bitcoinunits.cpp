// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <qt/bitcoinunits.h>

#include <common/args.h>
#include <consensus/amount.h>
#include <currencyunit.h>

#include <QStringList>

#include <cassert>

// clang-format off
using unitNameMap =
    std::map<
        BitcoinUnits::Unit,
        std::tuple<
            QString /* longname */,
            QString /* description */
        >
    >;
static const unitNameMap xecUnits = {
    {BitcoinUnits::Unit::base,
        {"XEC",
        "eCash"}},
    {BitcoinUnits::Unit::sub,
        {"Satoshi (sat)",
        "Satoshi (sat) (1 / 100)"}},
};
static const unitNameMap bchUnits = {
    {BitcoinUnits::Unit::base,
        {"BCHA",
        "Bitcoins"}},
    {BitcoinUnits::Unit::sub,
        {"Satoshi (sat)",
        "Satoshi (sat) (1 / 100" THIN_SP_UTF8 "000" THIN_SP_UTF8 "000)"}},
};
// clang-format on

static const unitNameMap &getUnitsAtRuntime() {
    return gArgs.GetBoolArg("-ecash", DEFAULT_ECASH) ? xecUnits : bchUnits;
}

BitcoinUnits::BitcoinUnits(QObject *parent)
    : QAbstractListModel(parent), unitlist(availableUnits()) {}

QList<BitcoinUnits::Unit> BitcoinUnits::availableUnits() {
    QList<BitcoinUnits::Unit> unitlist;
    unitlist.append(base);
    unitlist.append(sub);
    return unitlist;
}

bool BitcoinUnits::valid(int unit) {
    switch (unit) {
        case base:
        case sub:
            return true;
        default:
            return false;
    }
}

QString BitcoinUnits::longName(int unit) {
    const auto &units = getUnitsAtRuntime();
    auto it = units.find(BitcoinUnits::Unit(unit));
    return it != units.end() ? std::get<0>(it->second) : "???";
}

QString BitcoinUnits::shortName(int unit) {
    if (unit == sub) {
        return QString("sat");
    }
    return longName(unit);
}

QString BitcoinUnits::description(int unit) {
    const auto &units = getUnitsAtRuntime();
    auto it = units.find(BitcoinUnits::Unit(unit));
    return it != units.end() ? std::get<1>(it->second) : "???";
}

Amount BitcoinUnits::factor(int unit) {
    const auto &currency = Currency::get();
    switch (unit) {
        case base:
            return currency.baseunit;
        case sub:
            return currency.subunit;
        default:
            assert(false && "non-existent BitcoinUnits::Unit");
    }
}

int BitcoinUnits::decimals(int unit) {
    switch (unit) {
        case base:
            return Currency::get().decimals;
        case sub:
            return 0;
        default:
            assert(false && "non-existent BitcoinUnits::Unit");
    }
}

QString BitcoinUnits::format(int unit, const Amount nIn, bool fPlus,
                             SeparatorStyle separators, bool justify) {
    // Note: not using straight sprintf here because we do NOT want
    // localized number formatting.
    if (!valid(unit)) {
        // Refuse to format invalid unit
        return QString();
    }
    qint64 n = qint64(nIn / SATOSHI);
    qint64 coin = factor(unit) / SATOSHI;
    int num_decimals = decimals(unit);
    qint64 n_abs = (n > 0 ? n : -n);
    qint64 quotient = n_abs / coin;
    QString quotient_str = QString::number(quotient);
    if (justify) {
        quotient_str = quotient_str.rightJustified(16 - num_decimals, ' ');
    }

    // Use SI-style thin space separators as these are locale independent and
    // can't be confused with the decimal marker.
    QChar thin_sp(THIN_SP_CP);
    int q_size = quotient_str.size();
    if (separators == SeparatorStyle::ALWAYS ||
        (separators == SeparatorStyle::STANDARD && q_size > 4)) {
        for (int i = 3; i < q_size; i += 3) {
            quotient_str.insert(q_size - i, thin_sp);
        }
    }

    if (n < 0) {
        quotient_str.insert(0, '-');
    } else if (fPlus && n > 0) {
        quotient_str.insert(0, '+');
    }

    if (num_decimals > 0) {
        qint64 remainder = n_abs % coin;
        QString remainder_str =
            QString::number(remainder).rightJustified(num_decimals, '0');
        return quotient_str + QString(".") + remainder_str;
    } else {
        return quotient_str;
    }
}

// NOTE: Using formatWithUnit in an HTML context risks wrapping
// quantities at the thousands separator. More subtly, it also results
// in a standard space rather than a thin space, due to a bug in Qt's
// XML whitespace canonicalisation
//
// Please take care to use formatHtmlWithUnit instead, when
// appropriate.

QString BitcoinUnits::formatWithUnit(int unit, const Amount amount,
                                     bool plussign, SeparatorStyle separators) {
    return format(unit, amount, plussign, separators) + QString(" ") +
           shortName(unit);
}

QString BitcoinUnits::formatHtmlWithUnit(int unit, const Amount amount,
                                         bool plussign,
                                         SeparatorStyle separators) {
    QString str(formatWithUnit(unit, amount, plussign, separators));
    str.replace(QChar(THIN_SP_CP), QString(THIN_SP_HTML));
    return QString("<span style='white-space: nowrap;'>%1</span>").arg(str);
}

QString BitcoinUnits::formatWithPrivacy(int unit, const Amount &amount,
                                        SeparatorStyle separators,
                                        bool privacy) {
    assert(amount >= Amount::zero());
    QString value;
    if (privacy) {
        value = format(unit, Amount::zero(), false, separators, true)
                    .replace('0', '#');
    } else {
        value = format(unit, amount, false, separators, true);
    }
    return value + QString(" ") + shortName(unit);
}

bool BitcoinUnits::parse(int unit, const QString &value, Amount *val_out) {
    if (!valid(unit) || value.isEmpty()) {
        // Refuse to parse invalid unit or empty string
        return false;
    }
    int num_decimals = decimals(unit);

    // Ignore spaces and thin spaces when parsing
    QStringList parts = removeSpaces(value).split(".");

    if (parts.size() > 2) {
        // More than one dot
        return false;
    }
    const QString &whole = parts[0];
    QString decimals;

    if (parts.size() > 1) {
        decimals = parts[1];
    }
    if (decimals.size() > num_decimals) {
        // Exceeds max precision
        return false;
    }
    bool ok = false;
    QString str = whole + decimals.leftJustified(num_decimals, '0');

    if (str.size() > 18) {
        // Longer numbers will exceed 63 bits
        return false;
    }
    Amount retvalue(int64_t(str.toLongLong(&ok)) * SATOSHI);
    if (val_out) {
        *val_out = retvalue;
    }
    return ok;
}

QString BitcoinUnits::getAmountColumnTitle(int unit) {
    QString amountTitle = QObject::tr("Amount");
    if (BitcoinUnits::valid(unit)) {
        amountTitle += " (" + BitcoinUnits::shortName(unit) + ")";
    }
    return amountTitle;
}

int BitcoinUnits::rowCount(const QModelIndex &parent) const {
    Q_UNUSED(parent);
    return unitlist.size();
}

QVariant BitcoinUnits::data(const QModelIndex &index, int role) const {
    int row = index.row();
    if (row >= 0 && row < unitlist.size()) {
        Unit unit = unitlist.at(row);
        switch (role) {
            case Qt::EditRole:
            case Qt::DisplayRole:
                return QVariant(longName(unit));
            case Qt::ToolTipRole:
                return QVariant(description(unit));
            case UnitRole:
                return QVariant(static_cast<int>(unit));
        }
    }
    return QVariant();
}

Amount BitcoinUnits::maxMoney() {
    return MAX_MONEY;
}
