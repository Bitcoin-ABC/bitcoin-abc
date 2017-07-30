// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2017- The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_WALLET_TEST_FIXTURE_H
#define BITCOIN_WALLET_TEST_FIXTURE_H

#include "test/test_bitcoin.h"

/** Testing setup and teardown for wallet.
 */
struct WalletTestingSetup : public TestingSetup {
    WalletTestingSetup(const std::string &chainName = CBaseChainParams::MAIN);
    ~WalletTestingSetup();
};

#endif
