// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2015 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "utilmoneystr.h"

#include "primitives/transaction.h"
#include "tinyformat.h"
#include "utilstrencodings.h"

std::string FormatMoney(const Amount amt) {
    // Note: not using straight sprintf here because we do NOT want localized
    // number formatting.
    Amount amt_abs = amt > Amount::zero() ? amt : -amt;
    std::string str =
        strprintf("%d.%08d", amt_abs / COIN, (amt_abs % COIN) / SATOSHI);

    // Right-trim excess zeros before the decimal point:
    int nTrim = 0;
    for (int i = str.size() - 1; (str[i] == '0' && isdigit(str[i - 2])); --i) {
        ++nTrim;
    }
    if (nTrim) {
        str.erase(str.size() - nTrim, nTrim);
    }

    if (amt < Amount::zero()) {
        str.insert((unsigned int)0, 1, '-');
    }
    return str;
}

bool ParseMoney(const std::string &str, Amount &nRet) {
    return ParseMoney(str.c_str(), nRet);
}

bool ParseMoney(const char *pszIn, Amount &nRet) {
    std::string strWhole;
    Amount nUnits = Amount::zero();
    const char *p = pszIn;
    while (isspace(*p)) {
        p++;
    }
    for (; *p; p++) {
        if (*p == '.') {
            p++;
            Amount nMult = 10 * CENT;
            while (isdigit(*p) && (nMult > Amount::zero())) {
                nUnits += (*p++ - '0') * nMult;
                nMult /= 10;
            }
            break;
        }
        if (isspace(*p)) {
            break;
        }
        if (!isdigit(*p)) {
            return false;
        }
        strWhole.insert(strWhole.end(), *p);
    }
    for (; *p; p++) {
        if (!isspace(*p)) {
            return false;
        }
    }
    // guard against 63 bit overflow
    if (strWhole.size() > 10) {
        return false;
    }
    if (nUnits < Amount::zero() || nUnits > COIN) {
        return false;
    }

    Amount nWhole = atoi64(strWhole) * COIN;

    nRet = nWhole + Amount(nUnits);
    return true;
}
