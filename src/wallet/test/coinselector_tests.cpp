// Copyright (c) 2017 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <amount.h>
#include <primitives/transaction.h>
#include <random.h>
#include <wallet/coinselection.h>
#include <wallet/wallet.h>

#include <test/test_bitcoin.h>
#include <wallet/test/wallet_test_fixture.h>

#include <boost/test/unit_test.hpp>

#include <random>

BOOST_FIXTURE_TEST_SUITE(coinselector_tests, WalletTestingSetup)

typedef std::set<CInputCoin> CoinSet;

static std::vector<COutput> vCoins;

static void add_coin(const Amount nValue, int nInput,
                     std::vector<CInputCoin> &set) {
    CMutableTransaction tx;
    tx.vout.resize(nInput + 1);
    tx.vout[nInput].nValue = nValue;
    set.emplace_back(MakeTransactionRef(tx), nInput);
}

static void add_coin(const Amount nValue, int nInput, CoinSet &set) {
    CMutableTransaction tx;
    tx.vout.resize(nInput + 1);
    tx.vout[nInput].nValue = nValue;
    set.emplace(MakeTransactionRef(tx), nInput);
}

static bool equal_sets(CoinSet a, CoinSet b) {
    std::pair<CoinSet::iterator, CoinSet::iterator> ret =
        mismatch(a.begin(), a.end(), b.begin());
    return ret.first == a.end() && ret.second == b.end();
}

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

// Branch and bound coin selection tests
BOOST_AUTO_TEST_CASE(bnb_search_test) {
    LOCK(m_wallet.cs_wallet);

    // Setup
    std::vector<CInputCoin> utxo_pool;
    CoinSet selection;
    CoinSet actual_selection;
    Amount value_ret = Amount::zero();
    Amount not_input_fees = Amount::zero();

    /////////////////////////
    // Known Outcome tests //
    /////////////////////////
    BOOST_TEST_MESSAGE("Testing known outcomes");

    // Empty utxo pool
    BOOST_CHECK(!SelectCoinsBnB(utxo_pool, 1 * CENT, CENT / 2, selection,
                                value_ret, not_input_fees));
    selection.clear();

    // Add utxos
    add_coin(1 * CENT, 1, utxo_pool);
    add_coin(2 * CENT, 2, utxo_pool);
    add_coin(3 * CENT, 3, utxo_pool);
    add_coin(4 * CENT, 4, utxo_pool);

    // Select 1 Cent
    add_coin(1 * CENT, 1, actual_selection);
    BOOST_CHECK(SelectCoinsBnB(utxo_pool, 1 * CENT, CENT / 2, selection,
                               value_ret, not_input_fees));
    BOOST_CHECK(equal_sets(selection, actual_selection));
    actual_selection.clear();
    selection.clear();

    // Select 2 Cent
    add_coin(2 * CENT, 2, actual_selection);
    BOOST_CHECK(SelectCoinsBnB(utxo_pool, 2 * CENT, CENT / 2, selection,
                               value_ret, not_input_fees));
    BOOST_CHECK(equal_sets(selection, actual_selection));
    actual_selection.clear();
    selection.clear();

    // Select 5 Cent
    add_coin(3 * CENT, 3, actual_selection);
    add_coin(2 * CENT, 2, actual_selection);
    BOOST_CHECK(SelectCoinsBnB(utxo_pool, 5 * CENT, CENT / 2, selection,
                               value_ret, not_input_fees));
    BOOST_CHECK(equal_sets(selection, actual_selection));
    actual_selection.clear();
    selection.clear();

    // Select 11 Cent, not possible
    BOOST_CHECK(!SelectCoinsBnB(utxo_pool, 11 * CENT, CENT / 2, selection,
                                value_ret, not_input_fees));
    actual_selection.clear();
    selection.clear();

    // Select 10 Cent
    add_coin(5 * CENT, 5, utxo_pool);
    add_coin(4 * CENT, 4, actual_selection);
    add_coin(3 * CENT, 3, actual_selection);
    add_coin(2 * CENT, 2, actual_selection);
    add_coin(1 * CENT, 1, actual_selection);
    BOOST_CHECK(SelectCoinsBnB(utxo_pool, 10 * CENT, CENT / 2, selection,
                               value_ret, not_input_fees));
    BOOST_CHECK(equal_sets(selection, actual_selection));
    actual_selection.clear();
    selection.clear();

    // Negative effective value
    // Select 10 Cent but have 1 Cent not be possible because too small
    add_coin(5 * CENT, 5, actual_selection);
    add_coin(3 * CENT, 3, actual_selection);
    add_coin(2 * CENT, 2, actual_selection);
    BOOST_CHECK(SelectCoinsBnB(utxo_pool, 10 * CENT, 5000 * SATOSHI, selection,
                               value_ret, not_input_fees));

    // Select 0.25 Cent, not possible
    BOOST_CHECK(!SelectCoinsBnB(utxo_pool, CENT / 4, CENT / 2, selection,
                                value_ret, not_input_fees));
    actual_selection.clear();
    selection.clear();

    // Iteration exhaustion test
    Amount target = make_hard_case(17, utxo_pool);
    // Should exhaust
    BOOST_CHECK(!SelectCoinsBnB(utxo_pool, target, Amount::zero(), selection,
                                value_ret, not_input_fees));
    target = make_hard_case(14, utxo_pool);
    // Should not exhaust
    BOOST_CHECK(SelectCoinsBnB(utxo_pool, target, Amount::zero(), selection,
                               value_ret, not_input_fees));

    // Test same value early bailout optimization
    add_coin(7 * CENT, 7, actual_selection);
    add_coin(7 * CENT, 7, actual_selection);
    add_coin(7 * CENT, 7, actual_selection);
    add_coin(7 * CENT, 7, actual_selection);
    add_coin(2 * CENT, 7, actual_selection);
    add_coin(7 * CENT, 7, utxo_pool);
    add_coin(7 * CENT, 7, utxo_pool);
    add_coin(7 * CENT, 7, utxo_pool);
    add_coin(7 * CENT, 7, utxo_pool);
    add_coin(2 * CENT, 7, utxo_pool);
    for (int i = 0; i < 50000; ++i) {
        add_coin(5 * CENT, 7, utxo_pool);
    }
    BOOST_CHECK(SelectCoinsBnB(utxo_pool, 30 * CENT, 5000 * SATOSHI, selection,
                               value_ret, not_input_fees));

    ////////////////////
    // Behavior tests //
    ////////////////////
    // Select 1 Cent with pool of only greater than 5 Cent
    utxo_pool.clear();
    for (int i = 5; i <= 20; ++i) {
        add_coin(i * CENT, i, utxo_pool);
    }
    // Run 100 times, to make sure it is never finding a solution
    for (int i = 0; i < 100; ++i) {
        BOOST_CHECK(!SelectCoinsBnB(utxo_pool, 1 * CENT, 2 * CENT, selection,
                                    value_ret, not_input_fees));
    }
}

BOOST_AUTO_TEST_SUITE_END()
