// Copyright (c) 2012-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <bench/bench.h>
#include <chainparams.h>
#include <wallet/coinselection.h>
#include <wallet/wallet.h>

#include <set>

static void addCoin(const Amount nValue, const CWallet &wallet,
                    std::vector<COutput> &vCoins) {
    int nInput = 0;

    static int nextLockTime = 0;
    CMutableTransaction tx;
    // so all transactions get different hashes
    tx.nLockTime = nextLockTime++;
    tx.vout.resize(nInput + 1);
    tx.vout[nInput].nValue = nValue;
    CWalletTx *wtx = new CWalletTx(&wallet, MakeTransactionRef(std::move(tx)));

    int nAge = 6 * 24;
    COutput output(wtx, nInput, nAge, true /* spendable */, true /* solvable */,
                   true /* safe */);
    vCoins.push_back(output);
}

// Simple benchmark for wallet coin selection. Note that it maybe be necessary
// to build up more complicated scenarios in order to get meaningful
// measurements of performance. From laanwj, "Wallet coin selection is probably
// the hardest, as you need a wider selection of scenarios, just testing the
// same one over and over isn't too useful. Generating random isn't useful
// either for measurements."
// (https://github.com/bitcoin/bitcoin/issues/7883#issuecomment-224807484)
static void CoinSelection(benchmark::State &state) {
    SelectParams(CBaseChainParams::REGTEST);
    const CWallet wallet(Params(), "dummy", CWalletDBWrapper::CreateDummy());
    LOCK(wallet.cs_wallet);

    // Add coins.
    std::vector<COutput> vCoins;
    for (int i = 0; i < 1000; ++i) {
        addCoin(1000 * COIN, wallet, vCoins);
    }
    addCoin(3 * COIN, wallet, vCoins);

    const CoinEligibilityFilter filter_standard(1, 6, 0);
    const CoinSelectionParams coin_selection_params(
        true, 34, 148, CFeeRate(Amount::zero()), 0);
    while (state.KeepRunning()) {
        std::set<CInputCoin> setCoinsRet;
        Amount nValueRet;
        bool bnb_used;
        bool success = wallet.SelectCoinsMinConf(
            1003 * COIN, filter_standard, vCoins, setCoinsRet, nValueRet,
            coin_selection_params, bnb_used);
        assert(success);
        assert(nValueRet == 1003 * COIN);
        assert(setCoinsRet.size() == 2);
    }
}

typedef std::set<CInputCoin> CoinSet;

// Copied from src/wallet/test/coinselector_tests.cpp
static void add_coin(const Amount nValue, int nInput,
                     std::vector<CInputCoin> &set) {
    CMutableTransaction tx;
    tx.vout.resize(nInput + 1);
    tx.vout[nInput].nValue = nValue;
    set.emplace_back(MakeTransactionRef(tx), nInput);
}

// Copied from src/wallet/test/coinselector_tests.cpp
static Amount make_hard_case(int utxos, std::vector<CInputCoin> &utxo_pool) {
    utxo_pool.clear();
    Amount target = Amount::zero();
    for (int i = 0; i < utxos; ++i) {
        const Amount base = (int64_t(1) << (utxos + i)) * SATOSHI;
        target += base;
        add_coin(base, 2 * i, utxo_pool);
        add_coin(base + (int64_t(1) << (utxos - 1 - i)) * SATOSHI, 2 * i + 1,
                 utxo_pool);
    }
    return target;
}

static void BnBExhaustion(benchmark::State &state) {
    // Setup
    std::vector<CInputCoin> utxo_pool;
    CoinSet selection;
    Amount value_ret = Amount::zero();
    Amount not_input_fees = Amount::zero();

    while (state.KeepRunning()) {
        // Benchmark
        Amount target = make_hard_case(17, utxo_pool);
        // Should exhaust
        SelectCoinsBnB(utxo_pool, target, Amount::zero(), selection, value_ret,
                       not_input_fees);

        // Cleanup
        utxo_pool.clear();
        selection.clear();
    }
}

BENCHMARK(CoinSelection, 650);
BENCHMARK(BnBExhaustion, 650);
