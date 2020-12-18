// Copyright (c) 2012-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <bench/bench.h>
#include <config.h>
#include <consensus/amount.h>
#include <interfaces/chain.h>
#include <node/context.h>
#include <validation.h>
#include <validationinterface.h>
#include <wallet/receive.h>
#include <wallet/wallet.h>

#include <test/util/mining.h>
#include <test/util/setup_common.h>
#include <test/util/wallet.h>

#include <optional>

static void WalletBalance(benchmark::Bench &bench, const bool set_dirty,
                          const bool add_watchonly, const bool add_mine) {
    const auto test_setup = MakeNoLogFileContext<const TestingSetup>();

    const auto &ADDRESS_WATCHONLY = ADDRESS_ECREG_UNSPENDABLE;

    const Config &config = test_setup->m_node.chainman->GetConfig();

    CWallet wallet{test_setup->m_node.chain.get(), "",
                   CreateMockWalletDatabase()};
    {
        wallet.SetupLegacyScriptPubKeyMan();
        if (wallet.LoadWallet() != DBErrors::LOAD_OK) {
            assert(false);
        }
    }

    auto handler = test_setup->m_node.chain->handleNotifications(
        {&wallet, [](CWallet *) {}});

    const std::optional<std::string> address_mine{
        add_mine ? std::optional<std::string>{getnewaddress(config, wallet)}
                 : std::nullopt};
    if (add_watchonly) {
        importaddress(wallet, ADDRESS_WATCHONLY);
    }

    for (int i = 0; i < 100; ++i) {
        generatetoaddress(config, test_setup->m_node,
                          address_mine.value_or(ADDRESS_WATCHONLY));
        generatetoaddress(config, test_setup->m_node, ADDRESS_WATCHONLY);
    }
    SyncWithValidationInterfaceQueue();

    // Cache
    auto bal = GetBalance(wallet);

    bench.run([&] {
        if (set_dirty) {
            wallet.MarkDirty();
        }
        bal = GetBalance(wallet);
        if (add_mine) {
            assert(bal.m_mine_trusted > Amount::zero());
        }
        if (add_watchonly) {
            assert(bal.m_watchonly_trusted > Amount::zero());
        }
    });
}

static void WalletBalanceDirty(benchmark::Bench &bench) {
    WalletBalance(bench, /* set_dirty */ true, /* add_watchonly */ true,
                  /* add_mine */ true);
}
static void WalletBalanceClean(benchmark::Bench &bench) {
    WalletBalance(bench, /* set_dirty */ false, /* add_watchonly */ true,
                  /* add_mine */ true);
}
static void WalletBalanceMine(benchmark::Bench &bench) {
    WalletBalance(bench, /* set_dirty */ false, /* add_watchonly */ false,
                  /* add_mine */ true);
}
static void WalletBalanceWatch(benchmark::Bench &bench) {
    WalletBalance(bench, /* set_dirty */ false, /* add_watchonly */ true,
                  /* add_mine */ false);
}

BENCHMARK(WalletBalanceDirty);
BENCHMARK(WalletBalanceClean);
BENCHMARK(WalletBalanceMine);
BENCHMARK(WalletBalanceWatch);
