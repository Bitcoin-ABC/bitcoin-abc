// Copyright (c) 2012-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <bench/bench.h>
#include <chainparams.h>
#include <interfaces/chain.h>
#include <node/context.h>
#include <wallet/coinselection.h>
#include <wallet/wallet.h>

#include <memory>
#include <set>

static void addCoin(const Amount nValue, const CWallet &wallet,
                    std::vector<std::unique_ptr<CWalletTx>> &wtxs) {
    static int nextLockTime = 0;
    CMutableTransaction tx;
    // so all transactions get different hashes
    tx.nLockTime = nextLockTime++;
    tx.vout.resize(1);
    tx.vout[0].nValue = nValue;
    wtxs.push_back(std::make_unique<CWalletTx>(
        &wallet, MakeTransactionRef(std::move(tx))));
}

// Simple benchmark for wallet coin selection. Note that it maybe be necessary
// to build up more complicated scenarios in order to get meaningful
// measurements of performance. From laanwj, "Wallet coin selection is probably
// the hardest, as you need a wider selection of scenarios, just testing the
// same one over and over isn't too useful. Generating random isn't useful
// either for measurements."
// (https://github.com/bitcoin/bitcoin/issues/7883#issuecomment-224807484)
static void CoinSelection(benchmark::Bench &bench) {
    SelectParams(CBaseChainParams::REGTEST);

    NodeContext node;
    auto chain = interfaces::MakeChain(node, Params());
    CWallet wallet(chain.get(), "", CreateDummyWalletDatabase());
    wallet.SetupLegacyScriptPubKeyMan();
    std::vector<std::unique_ptr<CWalletTx>> wtxs;
    LOCK(wallet.cs_wallet);

    // Add coins.
    for (int i = 0; i < 1000; ++i) {
        addCoin(1000 * COIN, wallet, wtxs);
    }
    addCoin(3 * COIN, wallet, wtxs);

    // Create groups
    std::vector<OutputGroup> groups;
    for (const auto &wtx : wtxs) {
        COutput output(wtx.get(), 0 /* iIn */, 6 * 24 /* nDepthIn */,
                       true /* spendable */, true /* solvable */,
                       true /* safe */);
        groups.emplace_back(output.GetInputCoin(), 6, false, 0, 0);
    }

    const CoinEligibilityFilter filter_standard(1, 6, 0);
    const CoinSelectionParams coin_selection_params(
        true, 34, 148, CFeeRate(Amount::zero()), 0);
    bench.run([&] {
        std::set<CInputCoin> setCoinsRet;
        Amount nValueRet;
        bool bnb_used;
        bool success = wallet.SelectCoinsMinConf(
            1003 * COIN, filter_standard, groups, setCoinsRet, nValueRet,
            coin_selection_params, bnb_used);
        assert(success);
        assert(nValueRet == 1003 * COIN);
        assert(setCoinsRet.size() == 2);
    });
}

typedef std::set<CInputCoin> CoinSet;
std::vector<std::unique_ptr<CWalletTx>> wtxn;

// Copied from src/wallet/test/coinselector_tests.cpp
static void add_coin(const CWallet &wallet, const Amount nValue, int nInput,
                     std::vector<OutputGroup> &set) {
    CMutableTransaction tx;
    tx.vout.resize(nInput + 1);
    tx.vout[nInput].nValue = nValue;
    auto wtx =
        std::make_unique<CWalletTx>(&wallet, MakeTransactionRef(std::move(tx)));
    set.emplace_back(
        COutput(wtx.get(), nInput, 0, true, true, true).GetInputCoin(), 0, true,
        0, 0);
    wtxn.emplace_back(std::move(wtx));
}

// Copied from src/wallet/test/coinselector_tests.cpp
static Amount make_hard_case(const CWallet &wallet, int utxos,
                             std::vector<OutputGroup> &utxo_pool) {
    utxo_pool.clear();
    Amount target = Amount::zero();
    for (int i = 0; i < utxos; ++i) {
        const Amount base = (int64_t(1) << (utxos + i)) * SATOSHI;
        target += base;
        add_coin(wallet, base, 2 * i, utxo_pool);
        add_coin(wallet, base + (int64_t(1) << (utxos - 1 - i)) * SATOSHI,
                 2 * i + 1, utxo_pool);
    }
    return target;
}

static void BnBExhaustion(benchmark::Bench &bench) {
    SelectParams(CBaseChainParams::REGTEST);

    NodeContext node;
    auto chain = interfaces::MakeChain(node, Params());
    CWallet wallet(chain.get(), "", CreateDummyWalletDatabase());

    LOCK(wallet.cs_wallet);

    // Setup
    wallet.SetupLegacyScriptPubKeyMan();
    std::vector<OutputGroup> utxo_pool;
    CoinSet selection;
    Amount value_ret = Amount::zero();
    Amount not_input_fees = Amount::zero();

    bench.run([&] {
        // Benchmark
        Amount target = make_hard_case(wallet, 17, utxo_pool);
        // Should exhaust
        SelectCoinsBnB(utxo_pool, target, Amount::zero(), selection, value_ret,
                       not_input_fees);

        // Cleanup
        utxo_pool.clear();
        selection.clear();
    });
}

BENCHMARK(CoinSelection);
BENCHMARK(BnBExhaustion);
