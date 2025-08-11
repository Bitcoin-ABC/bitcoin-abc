// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2015 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <util/moneystr.h>

#include <consensus/amount.h>
#include <tinyformat.h>
#include <util/strencodings.h>
#include <util/string.h>

std::string FormatMoney(const Amount amt) {
    // Note: not using straight sprintf here because we do NOT want localized
    // number formatting.
    Amount amt_abs = amt > Amount::zero() ? amt : -amt;
    const auto currency = Currency::get();
    std::string str =
        strprintf("%d.%0*d", amt_abs / currency.baseunit, currency.decimals,
                  (amt_abs % currency.baseunit) / currency.subunit);

    // Right-trim excess zeros before the decimal point:
    int nTrim = 0;
    for (int i = str.size() - 1; (str[i] == '0' && IsDigit(str[i - 2])); --i) {
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

bool ParseMoney(const std::string &money_string, Amount &nRet) {
    if (!ContainsNoNUL(money_string)) {
        return false;
    }
    const std::string str = TrimString(money_string);
    if (str.empty()) {
        return false;
    }

    const auto &currency = Currency::get();
    std::string strWhole;
    Amount nUnits = Amount::zero();
    const char *p = str.c_str();
    for (; *p; p++) {
        if (*p == '.') {
            p++;
            Amount nMult = currency.baseunit / 10;
            while (IsDigit(*p) && (nMult > Amount::zero())) {
                nUnits += (*p++ - '0') * nMult;
                nMult /= 10;
            }
            break;
        }
        if (IsSpace(*p)) {
            return false;
        }
        if (!IsDigit(*p)) {
            return false;
        }
        strWhole.insert(strWhole.end(), *p);
    }
    if (*p) {
        return false;
    }

    // Make sure the following overflow check is meaningful. It's fine to assert
    // because it's on no critical path, and it's very unlikely to support a 19
    // decimal (or more) currency anyway.
    assert(currency.decimals <= 18);

    // guard against 63 bit overflow
    if (strWhole.size() > (size_t(18) - currency.decimals)) {
        return false;
    }
    if (nUnits < Amount::zero() || nUnits > currency.baseunit) {
        return false;
    }

    Amount nWhole =
        LocaleIndependentAtoi<int64_t>(strWhole) * currency.baseunit;

    nRet = nWhole + Amount(nUnits);
    return true;
}
