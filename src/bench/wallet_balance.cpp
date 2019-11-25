// Copyright (c) 2012-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <bench/bench.h>
#include <config.h>
#include <interfaces/chain.h>
#include <node/context.h>
#include <optional.h>
#include <test/util/mining.h>
#include <test/util/wallet.h>
#include <validationinterface.h>
#include <wallet/wallet.h>

static void WalletBalance(benchmark::State &state, const bool set_dirty,
                          const bool add_watchonly, const bool add_mine) {
    const auto &ADDRESS_WATCHONLY = ADDRESS_BCHREG_UNSPENDABLE;

    const Config &config = GetConfig();

    NodeContext node;
    std::unique_ptr<interfaces::Chain> chain =
        interfaces::MakeChain(node, config.GetChainParams());
    CWallet wallet{config.GetChainParams(), chain.get(), WalletLocation(),
                   WalletDatabase::CreateMock()};
    {
        bool first_run;
        if (wallet.LoadWallet(first_run) != DBErrors::LOAD_OK) {
            assert(false);
        }
    }

    auto handler = chain->handleNotifications({&wallet, [](CWallet *) {}});

    const Optional<std::string> address_mine{
        add_mine ? Optional<std::string>{getnewaddress(config, wallet)}
                 : nullopt};
    if (add_watchonly) {
        importaddress(wallet, ADDRESS_WATCHONLY);
    }

    for (int i = 0; i < 100; ++i) {
        generatetoaddress(config, address_mine.get_value_or(ADDRESS_WATCHONLY));
        generatetoaddress(config, ADDRESS_WATCHONLY);
    }
    SyncWithValidationInterfaceQueue();

    // Cache
    auto bal = wallet.GetBalance();

    while (state.KeepRunning()) {
        if (set_dirty) {
            wallet.MarkDirty();
        }
        bal = wallet.GetBalance();
        if (add_mine) {
            assert(bal.m_mine_trusted > Amount::zero());
        }
        if (add_watchonly) {
            assert(bal.m_watchonly_trusted > Amount::zero());
        }
    }
}

static void WalletBalanceDirty(benchmark::State &state) {
    WalletBalance(state, /* set_dirty */ true, /* add_watchonly */ true,
                  /* add_mine */ true);
}
static void WalletBalanceClean(benchmark::State &state) {
    WalletBalance(state, /* set_dirty */ false, /* add_watchonly */ true,
                  /* add_mine */ true);
}
static void WalletBalanceMine(benchmark::State &state) {
    WalletBalance(state, /* set_dirty */ false, /* add_watchonly */ false,
                  /* add_mine */ true);
}
static void WalletBalanceWatch(benchmark::State &state) {
    WalletBalance(state, /* set_dirty */ false, /* add_watchonly */ true,
                  /* add_mine */ false);
}

BENCHMARK(WalletBalanceDirty, 2500);
BENCHMARK(WalletBalanceClean, 8000);
BENCHMARK(WalletBalanceMine, 16000);
BENCHMARK(WalletBalanceWatch, 8000);
