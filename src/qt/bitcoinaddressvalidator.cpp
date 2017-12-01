// Copyright (c) 2011-2014 The Bitcoin Core developers
// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "bitcoinaddressvalidator.h"

#include "cashaddr.h"
#include "dstencode.h"

/* Base58 characters are:
     "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

  This is:
  - All numbers except for '0'
  - All upper-case letters except for 'I' and 'O'
  - All lower-case letters except for 'l'
*/
static bool ValidLegacyInput(const QString &input) {
    // Alphanumeric and not a 'forbidden' character
    for (QChar ch : input) {
        if (!(((ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'z') ||
               (ch >= 'A' && ch <= 'Z')) &&
              ch != 'l' && ch != 'I' && ch != '0' && ch != 'O'))
            return false;
    }
    return true;
}

static bool ValidCashaddrInput(const QString &prefix, const QString &input) {

    std::vector<uint8_t> charset = cashaddr::EncodingCharset();

    // Input may be incomplete. We're checking if it so far looks good.

    for (int i = 0; i < input.size(); ++i) {
        char ch = std::tolower(input[i].toLatin1());

        // Does the input have the right prefix?
        if (i < prefix.size()) {
            if (ch != prefix[i].toLatin1()) {
                return false;
            }
            continue;
        }

        // Payload, must use cashaddr charset.
        if (std::find(begin(charset), end(charset), ch) == end(charset)) {
            return false;
        }
    }
    return true;
}
BitcoinAddressEntryValidator::BitcoinAddressEntryValidator(
    const std::string &cashaddrprefix, QObject *parent)
    : QValidator(parent), cashaddrprefix(cashaddrprefix) {}

QValidator::State BitcoinAddressEntryValidator::validate(QString &input,
                                                         int &pos) const {
    Q_UNUSED(pos);

    // Empty address is "intermediate" input
    if (input.isEmpty()) return QValidator::Intermediate;

    // Correction
    for (int idx = 0; idx < input.size();) {
        bool removeChar = false;
        QChar ch = input.at(idx);
        // Corrections made are very conservative on purpose, to avoid
        // users unexpectedly getting away with typos that would normally
        // be detected, and thus sending to the wrong address.
        switch (ch.unicode()) {
            // Qt categorizes these as "Other_Format" not "Separator_Space"
            case 0x200B: // ZERO WIDTH SPACE
            case 0xFEFF: // ZERO WIDTH NO-BREAK SPACE
                removeChar = true;
                break;
            default:
                break;
        }

        // Remove whitespace
        if (ch.isSpace()) removeChar = true;

        // To next character
        if (removeChar)
            input.remove(idx, 1);
        else
            ++idx;
    }

    // Validation
    const QString cashPrefix = QString::fromStdString(cashaddrprefix) + ":";
    return (ValidLegacyInput(input) || ValidCashaddrInput(cashPrefix, input))
               ? QValidator::Acceptable
               : QValidator::Invalid;
}

BitcoinAddressCheckValidator::BitcoinAddressCheckValidator(QObject *parent)
    : QValidator(parent) {}

QValidator::State BitcoinAddressCheckValidator::validate(QString &input,
                                                         int &pos) const {
    Q_UNUSED(pos);
    // Validate the passed Bitcoin address
    if (IsValidDestinationString(input.toStdString())) {
        return QValidator::Acceptable;
    }

    return QValidator::Invalid;
}
