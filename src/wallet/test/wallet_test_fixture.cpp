// Copyright (c) 2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <wallet/test/wallet_test_fixture.h>

#include <chainparams.h>
#include <rpc/server.h>
#include <validationinterface.h>
#include <wallet/rpcdump.h>
#include <wallet/rpcwallet.h>
#include <wallet/wallet.h>

WalletTestingSetup::WalletTestingSetup(const std::string &chainName)
    : TestingSetup(chainName), m_wallet(Params(), *m_chain, WalletLocation(),
                                        WalletDatabase::CreateMock()) {
    bool fFirstRun;
    m_wallet.LoadWallet(fFirstRun);
    m_wallet.m_chain_notifications_handler =
        m_chain->handleNotifications(m_wallet);

    RegisterWalletRPCCommands(tableRPC);
    RegisterDumpRPCCommands(tableRPC);
}
