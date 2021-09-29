// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2015 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Money parsing/formatting utilities.
 */
#ifndef BITCOIN_UTIL_MONEYSTR_H
#define BITCOIN_UTIL_MONEYSTR_H

#include <amount.h>
#include <attributes.h>

#include <string>

/**
 * Do not use these functions to represent or parse monetary amounts to or from
 * JSON but use AmountFromValue and the Amount::operator UniValue() for that.
 */
std::string FormatMoney(const Amount n);
/**
 * Parse an amount denoted in full coins. E.g. "0.0034" supplied on the command
 * line.
 **/
NODISCARD bool ParseMoney(const std::string &str, Amount &nRet);

#endif // BITCOIN_UTIL_MONEYSTR_H
