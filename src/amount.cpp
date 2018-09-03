// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2017-2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "amount.h"

#include "tinyformat.h"

const std::string CURRENCY_UNIT = "BCH";

std::string Amount::ToString() const {
    return strprintf("%d.%08d %s", *this / COIN, (*this % COIN) / SATOSHI,
                     CURRENCY_UNIT);
}
