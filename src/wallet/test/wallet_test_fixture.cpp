// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2017- The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "wallet/test/wallet_test_fixture.h"

#include "rpc/server.h"
#include "wallet/db.h"
#include "wallet/rpcdump.h"
#include "wallet/wallet.h"

WalletTestingSetup::WalletTestingSetup(const std::string &chainName)
    : TestingSetup(chainName) {
    bitdb.MakeMock();

    bool fFirstRun;
    pwalletMain = new CWallet("wallet_test.dat");
    pwalletMain->LoadWallet(fFirstRun);
    RegisterValidationInterface(pwalletMain);

    RegisterWalletRPCCommands(tableRPC);
    RegisterDumpRPCCommands(tableRPC);
}

WalletTestingSetup::~WalletTestingSetup() {
    UnregisterValidationInterface(pwalletMain);
    delete pwalletMain;
    pwalletMain = nullptr;

    bitdb.Flush(true);
    bitdb.Reset();
}
