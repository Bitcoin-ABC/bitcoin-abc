// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2017-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <consensus/amount.h>

#include <common/args.h>
#include <currencyunit.h>
#include <univalue.h>

#include <tinyformat.h>

static const Currency BCHA{COIN, SATOSHI, 8, "BCHA"};
static const Currency XEC{100 * SATOSHI, SATOSHI, 2, "XEC"};

const Currency &Currency::get() {
    return gArgs.GetBoolArg("-ecash", DEFAULT_ECASH) ? XEC : BCHA;
}

std::string Amount::ToString() const {
    const auto currency = Currency::get();
    return strprintf("%d.%0*d %s", *this / currency.baseunit, currency.decimals,
                     (*this % currency.baseunit) / currency.subunit,
                     currency.ticker);
}

Amount::operator UniValue() const {
    bool sign = *this < Amount::zero();
    Amount n_abs(sign ? -amount : amount);
    const auto currency = Currency::get();
    int64_t quotient = n_abs / currency.baseunit;
    int64_t remainder = (n_abs % currency.baseunit) / currency.subunit;
    return UniValue(UniValue::VNUM,
                    strprintf("%s%d.%0*d", sign ? "-" : "", quotient,
                              currency.decimals, remainder));
}
