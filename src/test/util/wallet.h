// Copyright (c) 2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_TEST_UTIL_WALLET_H
#define BITCOIN_TEST_UTIL_WALLET_H

#include <string>

class Config;
class CWallet;

// Constants //

extern const std::string ADDRESS_ECREG_UNSPENDABLE;

// RPC-like //

/** Import the address to the wallet */
void importaddress(CWallet &wallet, const std::string &address);
/** Returns a new address from the wallet */
std::string getnewaddress(const Config &config, CWallet &w);

#endif // BITCOIN_TEST_UTIL_WALLET_H
