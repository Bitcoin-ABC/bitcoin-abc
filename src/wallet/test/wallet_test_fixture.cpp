// Copyright (c) 2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <wallet/test/wallet_test_fixture.h>

#include <chainparams.h>
#include <scheduler.h>
#include <validationinterface.h>
#include <wallet/rpc/backup.h>

WalletTestingSetup::WalletTestingSetup(const std::string &chainName)
    : TestingSetup(chainName), m_wallet_client{interfaces::MakeWalletClient(
                                   *m_node.chain, *Assert(m_node.args))},
      m_wallet(m_node.chain.get(), "", CreateMockWalletDatabase()) {
    m_wallet.LoadWallet();
    m_chain_notifications_handler =
        m_node.chain->handleNotifications({&m_wallet, [](CWallet *) {}});
    m_wallet_client->registerRpcs();
}

WalletTestingSetup::~WalletTestingSetup() {
    if (m_node.scheduler) {
        m_node.scheduler->stop();
    }
}
