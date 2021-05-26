// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2017-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <amount.h>

#include <network.h>
#include <univalue.h>

#include <tinyformat.h>

std::string Amount::ToString() const {
    return strprintf("%d.%08d %s", *this / COIN, (*this % COIN) / SATOSHI,
                     CURRENCY_UNIT);
}

Amount::operator UniValue() const {
    bool sign = *this < Amount::zero();
    Amount n_abs(sign ? -amount : amount);
    int64_t quotient = n_abs / COIN;
    int64_t remainder = (n_abs % COIN) / SATOSHI;
    return UniValue(UniValue::VNUM, strprintf("%s%d.%08d", sign ? "-" : "",
                                              quotient, remainder));
}
