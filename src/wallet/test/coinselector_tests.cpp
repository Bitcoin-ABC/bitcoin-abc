// Copyright (c) 2017 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <amount.h>
#include <chainparams.h> // For Params
#include <primitives/transaction.h>
#include <random.h>
#include <wallet/coincontrol.h>
#include <wallet/coinselection.h>
#include <wallet/wallet.h>

#include <test/test_bitcoin.h>
#include <wallet/test/wallet_test_fixture.h>

#include <boost/test/unit_test.hpp>

#include <random>

BOOST_FIXTURE_TEST_SUITE(coinselector_tests, WalletTestingSetup)

// how many times to run all the tests to have a chance to catch errors that
// only show up with particular random shuffles
#define RUN_TESTS 100

// some tests fail 1% of the time due to bad luck.
// we repeat those tests this many times and only complain if all iterations of
// the test fail
#define RANDOM_REPEATS 5

std::vector<std::unique_ptr<CWalletTx>> wtxn;

typedef std::set<CInputCoin> CoinSet;

static std::vector<COutput> vCoins;
static Amount balance = Amount::zero();

CoinEligibilityFilter filter_standard(1, 6, 0);
CoinEligibilityFilter filter_confirmed(1, 1, 0);
CoinEligibilityFilter filter_standard_extra(6, 6, 0);
CoinSelectionParams coin_selection_params(false, 0, 0, CFeeRate(Amount::zero()),
                                          0);

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

static void add_coin(CWallet &wallet, const Amount nValue, int nAge = 6 * 24,
                     bool fIsFromMe = false, int nInput = 0) {
    balance += nValue;
    static int nextLockTime = 0;
    CMutableTransaction tx;
    // so all transactions get different hashes
    tx.nLockTime = nextLockTime++;
    tx.vout.resize(nInput + 1);
    tx.vout[nInput].nValue = nValue;
    if (fIsFromMe) {
        // IsFromMe() returns (GetDebit() > 0), and GetDebit() is 0 if
        // vin.empty(), so stop vin being empty, and cache a non-zero Debit to
        // fake out IsFromMe()
        tx.vin.resize(1);
    }
    std::unique_ptr<CWalletTx> wtx(
        new CWalletTx(&wallet, MakeTransactionRef(std::move(tx))));
    if (fIsFromMe) {
        wtx->fDebitCached = true;
        wtx->nDebitCached = SATOSHI;
    }
    COutput output(wtx.get(), nInput, nAge, true /* spendable */,
                   true /* solvable */, true /* safe */);
    vCoins.push_back(output);
    wallet.AddToWallet(*wtx.get());
    wtxn.emplace_back(std::move(wtx));
}

static void empty_wallet() {
    vCoins.clear();
    wtxn.clear();
    balance = Amount::zero();
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

inline std::vector<OutputGroup> &
GroupCoins(const std::vector<CInputCoin> &coins) {
    static std::vector<OutputGroup> static_groups;
    static_groups.clear();
    for (auto &coin : coins) {
        static_groups.emplace_back(coin, 0, true, 0, 0);
    }
    return static_groups;
}

inline std::vector<OutputGroup> &GroupCoins(const std::vector<COutput> &coins) {
    static std::vector<OutputGroup> static_groups;
    static_groups.clear();
    for (auto &coin : coins) {
        // HACK: we can't figure out the is_me flag so we use the conditions
        // defined below; perhaps set safe to false for !fIsFromMe in add_coin()
        const bool is_me =
            coin.tx->fDebitCached && coin.tx->nDebitCached == SATOSHI;
        static_groups.emplace_back(coin.GetInputCoin(), coin.nDepth, is_me, 0,
                                   0);
    }
    return static_groups;
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
    BOOST_CHECK(!SelectCoinsBnB(GroupCoins(utxo_pool), 1 * CENT, CENT / 2,
                                selection, value_ret, not_input_fees));
    selection.clear();

    // Add utxos
    add_coin(1 * CENT, 1, utxo_pool);
    add_coin(2 * CENT, 2, utxo_pool);
    add_coin(3 * CENT, 3, utxo_pool);
    add_coin(4 * CENT, 4, utxo_pool);

    // Select 1 Cent
    add_coin(1 * CENT, 1, actual_selection);
    BOOST_CHECK(SelectCoinsBnB(GroupCoins(utxo_pool), 1 * CENT, CENT / 2,
                               selection, value_ret, not_input_fees));
    BOOST_CHECK(equal_sets(selection, actual_selection));
    actual_selection.clear();
    selection.clear();

    // Select 2 Cent
    add_coin(2 * CENT, 2, actual_selection);
    BOOST_CHECK(SelectCoinsBnB(GroupCoins(utxo_pool), 2 * CENT, CENT / 2,
                               selection, value_ret, not_input_fees));
    BOOST_CHECK(equal_sets(selection, actual_selection));
    actual_selection.clear();
    selection.clear();

    // Select 5 Cent
    add_coin(3 * CENT, 3, actual_selection);
    add_coin(2 * CENT, 2, actual_selection);
    BOOST_CHECK(SelectCoinsBnB(GroupCoins(utxo_pool), 5 * CENT, CENT / 2,
                               selection, value_ret, not_input_fees));
    BOOST_CHECK(equal_sets(selection, actual_selection));
    actual_selection.clear();
    selection.clear();

    // Select 11 Cent, not possible
    BOOST_CHECK(!SelectCoinsBnB(GroupCoins(utxo_pool), 11 * CENT, CENT / 2,
                                selection, value_ret, not_input_fees));
    actual_selection.clear();
    selection.clear();

    // Select 10 Cent
    add_coin(5 * CENT, 5, utxo_pool);
    add_coin(4 * CENT, 4, actual_selection);
    add_coin(3 * CENT, 3, actual_selection);
    add_coin(2 * CENT, 2, actual_selection);
    add_coin(1 * CENT, 1, actual_selection);
    BOOST_CHECK(SelectCoinsBnB(GroupCoins(utxo_pool), 10 * CENT, CENT / 2,
                               selection, value_ret, not_input_fees));
    BOOST_CHECK(equal_sets(selection, actual_selection));
    actual_selection.clear();
    selection.clear();

    // Negative effective value
    // Select 10 Cent but have 1 Cent not be possible because too small
    add_coin(5 * CENT, 5, actual_selection);
    add_coin(3 * CENT, 3, actual_selection);
    add_coin(2 * CENT, 2, actual_selection);
    BOOST_CHECK(SelectCoinsBnB(GroupCoins(utxo_pool), 10 * CENT, 5000 * SATOSHI,
                               selection, value_ret, not_input_fees));

    // Select 0.25 Cent, not possible
    BOOST_CHECK(!SelectCoinsBnB(GroupCoins(utxo_pool), CENT / 4, CENT / 2,
                                selection, value_ret, not_input_fees));
    actual_selection.clear();
    selection.clear();

    // Iteration exhaustion test
    Amount target = make_hard_case(17, utxo_pool);
    // Should exhaust
    BOOST_CHECK(!SelectCoinsBnB(GroupCoins(utxo_pool), target, Amount::zero(),
                                selection, value_ret, not_input_fees));
    target = make_hard_case(14, utxo_pool);
    // Should not exhaust
    BOOST_CHECK(SelectCoinsBnB(GroupCoins(utxo_pool), target, Amount::zero(),
                               selection, value_ret, not_input_fees));

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
    BOOST_CHECK(SelectCoinsBnB(GroupCoins(utxo_pool), 30 * CENT, 5000 * SATOSHI,
                               selection, value_ret, not_input_fees));

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
        BOOST_CHECK(!SelectCoinsBnB(GroupCoins(utxo_pool), 1 * CENT, 2 * CENT,
                                    selection, value_ret, not_input_fees));
    }

    // Make sure that effective value is working in SelectCoinsMinConf when BnB
    // is used
    CoinSelectionParams coin_selection_params_bnb(true, 0, 0,
                                                  CFeeRate(3000 * SATOSHI), 0);
    CoinSet setCoinsRet;
    Amount nValueRet;
    bool bnb_used;
    empty_wallet();
    add_coin(m_wallet, SATOSHI);
    // Make sure that it has a negative effective value. The next check should
    // assert if this somehow got through. Otherwise it will fail
    vCoins.at(0).nInputBytes = 40;
    BOOST_CHECK(!m_wallet.SelectCoinsMinConf(
        1 * CENT, filter_standard, GroupCoins(vCoins), setCoinsRet, nValueRet,
        coin_selection_params_bnb, bnb_used));

    // Make sure that we aren't using BnB when there are preset inputs
    empty_wallet();
    add_coin(m_wallet, 5 * CENT);
    add_coin(m_wallet, 3 * CENT);
    add_coin(m_wallet, 2 * CENT);
    CCoinControl coin_control;
    coin_control.fAllowOtherInputs = true;
    coin_control.Select(COutPoint(vCoins.at(0).tx->GetId(), vCoins.at(0).i));
    BOOST_CHECK(m_wallet.SelectCoins(vCoins, 10 * CENT, setCoinsRet, nValueRet,
                                     coin_control, coin_selection_params_bnb,
                                     bnb_used));
    BOOST_CHECK(!bnb_used);
    BOOST_CHECK(!coin_selection_params_bnb.use_bnb);
}

BOOST_AUTO_TEST_CASE(knapsack_solver_test) {
    CWallet testWallet(Params(), "dummy", WalletDatabase::CreateDummy());

    CoinSet setCoinsRet, setCoinsRet2;
    Amount nValueRet;
    bool bnb_used;

    LOCK(testWallet.cs_wallet);

    // test multiple times to allow for differences in the shuffle order
    for (int i = 0; i < RUN_TESTS; i++) {
        empty_wallet();

        // with an empty wallet we can't even pay one cent
        BOOST_CHECK(!testWallet.SelectCoinsMinConf(
            1 * CENT, filter_standard, GroupCoins(vCoins), setCoinsRet,
            nValueRet, coin_selection_params, bnb_used));

        // add a new 1 cent coin
        add_coin(testWallet, 1 * CENT, 4);

        // with a new 1 cent coin, we still can't find a mature 1 cent
        BOOST_CHECK(!testWallet.SelectCoinsMinConf(
            1 * CENT, filter_standard, GroupCoins(vCoins), setCoinsRet,
            nValueRet, coin_selection_params, bnb_used));

        // but we can find a new 1 cent
        BOOST_CHECK(testWallet.SelectCoinsMinConf(
            1 * CENT, filter_confirmed, GroupCoins(vCoins), setCoinsRet,
            nValueRet, coin_selection_params, bnb_used));
        BOOST_CHECK_EQUAL(nValueRet, 1 * CENT);
        // add a mature 2 cent coin
        add_coin(testWallet, 2 * CENT);

        // we can't make 3 cents of mature coins
        BOOST_CHECK(!testWallet.SelectCoinsMinConf(
            3 * CENT, filter_standard, GroupCoins(vCoins), setCoinsRet,
            nValueRet, coin_selection_params, bnb_used));

        // we can make 3 cents of new coins
        BOOST_CHECK(testWallet.SelectCoinsMinConf(
            3 * CENT, filter_confirmed, GroupCoins(vCoins), setCoinsRet,
            nValueRet, coin_selection_params, bnb_used));
        BOOST_CHECK_EQUAL(nValueRet, 3 * CENT);

        // add a mature 5 cent coin,
        add_coin(testWallet, 5 * CENT);
        // a new 10 cent coin sent from one of our own addresses
        add_coin(testWallet, 10 * CENT, 3, true);
        // and a mature 20 cent coin
        add_coin(testWallet, 20 * CENT);

        // now we have new: 1+10=11 (of which 10 was self-sent), and mature:
        // 2+5+20=27.  total = 38

        // we can't make 38 cents only if we disallow new coins:
        BOOST_CHECK(!testWallet.SelectCoinsMinConf(
            38 * CENT, filter_standard, GroupCoins(vCoins), setCoinsRet,
            nValueRet, coin_selection_params, bnb_used));
        // we can't even make 37 cents if we don't allow new coins even if
        // they're from us
        BOOST_CHECK(!testWallet.SelectCoinsMinConf(
            38 * CENT, filter_standard_extra, GroupCoins(vCoins), setCoinsRet,
            nValueRet, coin_selection_params, bnb_used));
        // but we can make 37 cents if we accept new coins from ourself
        BOOST_CHECK(testWallet.SelectCoinsMinConf(
            37 * CENT, filter_standard, GroupCoins(vCoins), setCoinsRet,
            nValueRet, coin_selection_params, bnb_used));
        BOOST_CHECK_EQUAL(nValueRet, 37 * CENT);
        // and we can make 38 cents if we accept all new coins
        BOOST_CHECK(testWallet.SelectCoinsMinConf(
            38 * CENT, filter_confirmed, GroupCoins(vCoins), setCoinsRet,
            nValueRet, coin_selection_params, bnb_used));
        BOOST_CHECK_EQUAL(nValueRet, 38 * CENT);

        // try making 34 cents from 1,2,5,10,20 - we can't do it exactly
        BOOST_CHECK(testWallet.SelectCoinsMinConf(
            34 * CENT, filter_confirmed, GroupCoins(vCoins), setCoinsRet,
            nValueRet, coin_selection_params, bnb_used));
        // but 35 cents is closest
        BOOST_CHECK_EQUAL(nValueRet, 35 * CENT);
        // the best should be 20+10+5.  it's incredibly unlikely the 1 or 2 got
        // included (but possible)
        BOOST_CHECK_EQUAL(setCoinsRet.size(), 3U);

        // when we try making 7 cents, the smaller coins (1,2,5) are enough.  We
        // should see just 2+5
        BOOST_CHECK(testWallet.SelectCoinsMinConf(
            7 * CENT, filter_confirmed, GroupCoins(vCoins), setCoinsRet,
            nValueRet, coin_selection_params, bnb_used));
        BOOST_CHECK_EQUAL(nValueRet, 7 * CENT);
        BOOST_CHECK_EQUAL(setCoinsRet.size(), 2U);

        // when we try making 8 cents, the smaller coins (1,2,5) are exactly
        // enough.
        BOOST_CHECK(testWallet.SelectCoinsMinConf(
            8 * CENT, filter_confirmed, GroupCoins(vCoins), setCoinsRet,
            nValueRet, coin_selection_params, bnb_used));
        BOOST_CHECK(nValueRet == 8 * CENT);
        BOOST_CHECK_EQUAL(setCoinsRet.size(), 3U);

        // when we try making 9 cents, no subset of smaller coins is enough, and
        // we get the next bigger coin (10)
        BOOST_CHECK(testWallet.SelectCoinsMinConf(
            9 * CENT, filter_confirmed, GroupCoins(vCoins), setCoinsRet,
            nValueRet, coin_selection_params, bnb_used));
        BOOST_CHECK_EQUAL(nValueRet, 10 * CENT);
        BOOST_CHECK_EQUAL(setCoinsRet.size(), 1U);

        // now clear out the wallet and start again to test choosing between
        // subsets of smaller coins and the next biggest coin
        empty_wallet();

        add_coin(testWallet, 6 * CENT);
        add_coin(testWallet, 7 * CENT);
        add_coin(testWallet, 8 * CENT);
        add_coin(testWallet, 20 * CENT);
        // now we have 6+7+8+20+30 = 71 cents total
        add_coin(testWallet, 30 * CENT);

        // check that we have 71 and not 72
        BOOST_CHECK(testWallet.SelectCoinsMinConf(
            71 * CENT, filter_confirmed, GroupCoins(vCoins), setCoinsRet,
            nValueRet, coin_selection_params, bnb_used));
        BOOST_CHECK(!testWallet.SelectCoinsMinConf(
            72 * CENT, filter_confirmed, GroupCoins(vCoins), setCoinsRet,
            nValueRet, coin_selection_params, bnb_used));

        // now try making 16 cents.  the best smaller coins can do is 6+7+8 =
        // 21; not as good at the next biggest coin, 20
        BOOST_CHECK(testWallet.SelectCoinsMinConf(
            16 * CENT, filter_confirmed, GroupCoins(vCoins), setCoinsRet,
            nValueRet, coin_selection_params, bnb_used));
        // we should get 20 in one coin
        BOOST_CHECK_EQUAL(nValueRet, 20 * CENT);
        BOOST_CHECK_EQUAL(setCoinsRet.size(), 1U);

        // now we have 5+6+7+8+20+30 = 75 cents total
        add_coin(testWallet, 5 * CENT);

        // now if we try making 16 cents again, the smaller coins can make 5+6+7
        // = 18 cents, better than the next biggest coin, 20
        BOOST_CHECK(testWallet.SelectCoinsMinConf(
            16 * CENT, filter_confirmed, GroupCoins(vCoins), setCoinsRet,
            nValueRet, coin_selection_params, bnb_used));
        // we should get 18 in 3 coins
        BOOST_CHECK_EQUAL(nValueRet, 18 * CENT);
        BOOST_CHECK_EQUAL(setCoinsRet.size(), 3U);

        // now we have 5+6+7+8+18+20+30
        add_coin(testWallet, 18 * CENT);

        // and now if we try making 16 cents again, the smaller coins can make
        // 5+6+7 = 18 cents, the same as the next biggest coin, 18
        BOOST_CHECK(testWallet.SelectCoinsMinConf(
            16 * CENT, filter_confirmed, GroupCoins(vCoins), setCoinsRet,
            nValueRet, coin_selection_params, bnb_used));
        // we should get 18 in 1 coin
        BOOST_CHECK_EQUAL(nValueRet, 18 * CENT);
        // because in the event of a tie, the biggest coin wins
        BOOST_CHECK_EQUAL(setCoinsRet.size(), 1U);

        // now try making 11 cents.  we should get 5+6
        BOOST_CHECK(testWallet.SelectCoinsMinConf(
            11 * CENT, filter_confirmed, GroupCoins(vCoins), setCoinsRet,
            nValueRet, coin_selection_params, bnb_used));
        BOOST_CHECK_EQUAL(nValueRet, 11 * CENT);
        BOOST_CHECK_EQUAL(setCoinsRet.size(), 2U);

        // check that the smallest bigger coin is used
        add_coin(testWallet, 1 * COIN);
        add_coin(testWallet, 2 * COIN);
        add_coin(testWallet, 3 * COIN);
        // now we have 5+6+7+8+18+20+30+100+200+300+400 = 1094 cents
        add_coin(testWallet, 4 * COIN);
        BOOST_CHECK(testWallet.SelectCoinsMinConf(
            95 * CENT, filter_confirmed, GroupCoins(vCoins), setCoinsRet,
            nValueRet, coin_selection_params, bnb_used));
        // we should get 1 BCH in 1 coin
        BOOST_CHECK_EQUAL(nValueRet, 1 * COIN);
        BOOST_CHECK_EQUAL(setCoinsRet.size(), 1U);

        BOOST_CHECK(testWallet.SelectCoinsMinConf(
            195 * CENT, filter_confirmed, GroupCoins(vCoins), setCoinsRet,
            nValueRet, coin_selection_params, bnb_used));
        // we should get 2 BCH in 1 coin
        BOOST_CHECK_EQUAL(nValueRet, 2 * COIN);
        BOOST_CHECK_EQUAL(setCoinsRet.size(), 1U);

        // empty the wallet and start again, now with fractions of a cent, to
        // test small change avoidance

        empty_wallet();
        add_coin(testWallet, 1 * MIN_CHANGE / 10);
        add_coin(testWallet, 2 * MIN_CHANGE / 10);
        add_coin(testWallet, 3 * MIN_CHANGE / 10);
        add_coin(testWallet, 4 * MIN_CHANGE / 10);
        add_coin(testWallet, 5 * MIN_CHANGE / 10);

        // try making 1 * MIN_CHANGE from the 1.5 * MIN_CHANGE
        // we'll get change smaller than MIN_CHANGE whatever happens, so can
        // expect MIN_CHANGE exactly
        BOOST_CHECK(testWallet.SelectCoinsMinConf(
            MIN_CHANGE, filter_confirmed, GroupCoins(vCoins), setCoinsRet,
            nValueRet, coin_selection_params, bnb_used));
        BOOST_CHECK_EQUAL(nValueRet, MIN_CHANGE);

        // but if we add a bigger coin, small change is avoided
        add_coin(testWallet, 1111 * MIN_CHANGE);

        // try making 1 from 0.1 + 0.2 + 0.3 + 0.4 + 0.5 + 1111 = 1112.5
        BOOST_CHECK(testWallet.SelectCoinsMinConf(
            1 * MIN_CHANGE, filter_confirmed, GroupCoins(vCoins), setCoinsRet,
            nValueRet, coin_selection_params, bnb_used));
        // we should get the exact amount
        BOOST_CHECK_EQUAL(nValueRet, 1 * MIN_CHANGE);

        // if we add more small coins:
        add_coin(testWallet, 6 * MIN_CHANGE / 10);
        add_coin(testWallet, 7 * MIN_CHANGE / 10);

        // and try again to make 1.0 * MIN_CHANGE
        BOOST_CHECK(testWallet.SelectCoinsMinConf(
            1 * MIN_CHANGE, filter_confirmed, GroupCoins(vCoins), setCoinsRet,
            nValueRet, coin_selection_params, bnb_used));
        // we should get the exact amount
        BOOST_CHECK_EQUAL(nValueRet, 1 * MIN_CHANGE);

        // run the 'mtgox' test (see
        // http://blockexplorer.com/tx/29a3efd3ef04f9153d47a990bd7b048a4b2d213daaa5fb8ed670fb85f13bdbcf)
        // they tried to consolidate 10 50k coins into one 500k coin, and ended
        // up with 50k in change
        empty_wallet();
        for (int j = 0; j < 20; j++) {
            add_coin(testWallet, 50000 * COIN);
        }

        BOOST_CHECK(testWallet.SelectCoinsMinConf(
            500000 * COIN, filter_confirmed, GroupCoins(vCoins), setCoinsRet,
            nValueRet, coin_selection_params, bnb_used));
        // we should get the exact amount
        BOOST_CHECK_EQUAL(nValueRet, 500000 * COIN);
        // in ten coins
        BOOST_CHECK_EQUAL(setCoinsRet.size(), 10U);

        // if there's not enough in the smaller coins to make at least 1 *
        // MIN_CHANGE change (0.5+0.6+0.7 < 1.0+1.0), we need to try finding an
        // exact subset anyway

        // sometimes it will fail, and so we use the next biggest coin:
        empty_wallet();
        add_coin(testWallet, 5 * MIN_CHANGE / 10);
        add_coin(testWallet, 6 * MIN_CHANGE / 10);
        add_coin(testWallet, 7 * MIN_CHANGE / 10);
        add_coin(testWallet, 1111 * MIN_CHANGE);
        BOOST_CHECK(testWallet.SelectCoinsMinConf(
            1 * MIN_CHANGE, filter_confirmed, GroupCoins(vCoins), setCoinsRet,
            nValueRet, coin_selection_params, bnb_used));
        // we get the bigger coin
        BOOST_CHECK_EQUAL(nValueRet, 1111 * MIN_CHANGE);
        BOOST_CHECK_EQUAL(setCoinsRet.size(), 1U);

        // but sometimes it's possible, and we use an exact subset (0.4 + 0.6 =
        // 1.0)
        empty_wallet();
        add_coin(testWallet, 4 * MIN_CHANGE / 10);
        add_coin(testWallet, 6 * MIN_CHANGE / 10);
        add_coin(testWallet, 8 * MIN_CHANGE / 10);
        add_coin(testWallet, 1111 * MIN_CHANGE);
        BOOST_CHECK(testWallet.SelectCoinsMinConf(
            MIN_CHANGE, filter_confirmed, GroupCoins(vCoins), setCoinsRet,
            nValueRet, coin_selection_params, bnb_used));
        // we should get the exact amount
        BOOST_CHECK_EQUAL(nValueRet, MIN_CHANGE);
        // in two coins 0.4+0.6
        BOOST_CHECK_EQUAL(setCoinsRet.size(), 2U);

        // test avoiding small change
        empty_wallet();
        add_coin(testWallet, 5 * MIN_CHANGE / 100);
        add_coin(testWallet, 1 * MIN_CHANGE);
        add_coin(testWallet, 100 * MIN_CHANGE);

        // trying to make 100.01 from these three coins
        BOOST_CHECK(testWallet.SelectCoinsMinConf(
            10001 * MIN_CHANGE / 100, filter_confirmed, GroupCoins(vCoins),
            setCoinsRet, nValueRet, coin_selection_params, bnb_used));
        // we should get all coins
        BOOST_CHECK_EQUAL(nValueRet, 10105 * MIN_CHANGE / 100);
        BOOST_CHECK_EQUAL(setCoinsRet.size(), 3U);

        // but if we try to make 99.9, we should take the bigger of the two
        // small coins to avoid small change
        BOOST_CHECK(testWallet.SelectCoinsMinConf(
            9990 * MIN_CHANGE / 100, filter_confirmed, GroupCoins(vCoins),
            setCoinsRet, nValueRet, coin_selection_params, bnb_used));
        BOOST_CHECK_EQUAL(nValueRet, 101 * MIN_CHANGE);
        BOOST_CHECK_EQUAL(setCoinsRet.size(), 2U);

        // test with many inputs
        for (Amount amt = 1500 * SATOSHI; amt < COIN; amt = 10 * amt) {
            empty_wallet();
            // Create 676 inputs (=  (old MAX_STANDARD_TX_SIZE == 100000)  / 148
            // bytes per input)
            for (uint16_t j = 0; j < 676; j++) {
                add_coin(testWallet, amt);
            }
            BOOST_CHECK(testWallet.SelectCoinsMinConf(
                2000 * SATOSHI, filter_confirmed, GroupCoins(vCoins),
                setCoinsRet, nValueRet, coin_selection_params, bnb_used));
            if (amt - 2000 * SATOSHI < MIN_CHANGE) {
                // needs more than one input:
                uint16_t returnSize = std::ceil(
                    (2000.0 + (MIN_CHANGE / SATOSHI)) / (amt / SATOSHI));
                Amount returnValue = returnSize * amt;
                BOOST_CHECK_EQUAL(nValueRet, returnValue);
                BOOST_CHECK_EQUAL(setCoinsRet.size(), returnSize);
            } else {
                // one input is sufficient:
                BOOST_CHECK_EQUAL(nValueRet, amt);
                BOOST_CHECK_EQUAL(setCoinsRet.size(), 1U);
            }
        }

        // test randomness
        {
            empty_wallet();
            for (int i2 = 0; i2 < 100; i2++) {
                add_coin(testWallet, COIN);
            }

            // picking 50 from 100 coins doesn't depend on the shuffle, but does
            // depend on randomness in the stochastic approximation code
            BOOST_CHECK(testWallet.SelectCoinsMinConf(
                50 * COIN, filter_standard, GroupCoins(vCoins), setCoinsRet,
                nValueRet, coin_selection_params, bnb_used));
            BOOST_CHECK(testWallet.SelectCoinsMinConf(
                50 * COIN, filter_standard, GroupCoins(vCoins), setCoinsRet2,
                nValueRet, coin_selection_params, bnb_used));
            BOOST_CHECK(!equal_sets(setCoinsRet, setCoinsRet2));

            int fails = 0;
            for (int j = 0; j < RANDOM_REPEATS; j++) {
                // selecting 1 from 100 identical coins depends on the shuffle;
                // this test will fail 1% of the time run the test
                // RANDOM_REPEATS times and only complain if all of them fail
                BOOST_CHECK(testWallet.SelectCoinsMinConf(
                    COIN, filter_standard, GroupCoins(vCoins), setCoinsRet,
                    nValueRet, coin_selection_params, bnb_used));
                BOOST_CHECK(testWallet.SelectCoinsMinConf(
                    COIN, filter_standard, GroupCoins(vCoins), setCoinsRet2,
                    nValueRet, coin_selection_params, bnb_used));
                if (equal_sets(setCoinsRet, setCoinsRet2)) {
                    fails++;
                }
            }
            BOOST_CHECK_NE(fails, RANDOM_REPEATS);

            // add 75 cents in small change.  not enough to make 90 cents, then
            // try making 90 cents.  there are multiple competing "smallest
            // bigger" coins, one of which should be picked at random
            add_coin(testWallet, 5 * CENT);
            add_coin(testWallet, 10 * CENT);
            add_coin(testWallet, 15 * CENT);
            add_coin(testWallet, 20 * CENT);
            add_coin(testWallet, 25 * CENT);

            fails = 0;
            for (int j = 0; j < RANDOM_REPEATS; j++) {
                // selecting 1 from 100 identical coins depends on the shuffle;
                // this test will fail 1% of the time run the test
                // RANDOM_REPEATS times and only complain if all of them fail
                BOOST_CHECK(testWallet.SelectCoinsMinConf(
                    90 * CENT, filter_standard, GroupCoins(vCoins), setCoinsRet,
                    nValueRet, coin_selection_params, bnb_used));
                BOOST_CHECK(testWallet.SelectCoinsMinConf(
                    90 * CENT, filter_standard, GroupCoins(vCoins),
                    setCoinsRet2, nValueRet, coin_selection_params, bnb_used));
                if (equal_sets(setCoinsRet, setCoinsRet2)) {
                    fails++;
                }
            }
            BOOST_CHECK_NE(fails, RANDOM_REPEATS);
        }
    }
    empty_wallet();
}

BOOST_AUTO_TEST_CASE(ApproximateBestSubset) {
    CoinSet setCoinsRet;
    Amount nValueRet;
    bool bnb_used;

    LOCK(m_wallet.cs_wallet);

    empty_wallet();

    // Test vValue sort order
    for (int i = 0; i < 1000; i++) {
        add_coin(m_wallet, 1000 * COIN);
    }
    add_coin(m_wallet, 3 * COIN);

    BOOST_CHECK(m_wallet.SelectCoinsMinConf(
        1003 * COIN, filter_standard, GroupCoins(vCoins), setCoinsRet,
        nValueRet, coin_selection_params, bnb_used));
    BOOST_CHECK_EQUAL(nValueRet, 1003 * COIN);
    BOOST_CHECK_EQUAL(setCoinsRet.size(), 2U);

    empty_wallet();
}

// Tests that with the ideal conditions, the coin selector will always be able
// to find a solution that can pay the target value
BOOST_AUTO_TEST_CASE(SelectCoins_test) {
    CWallet testWallet(Params(), "dummy", WalletDatabase::CreateDummy());

    // Random generator stuff
    std::default_random_engine generator;
    std::exponential_distribution<double> distribution(100);
    FastRandomContext rand;

    // Run this test 100 times
    for (int i = 0; i < 100; ++i) {
        empty_wallet();

        // Make a wallet with 1000 exponentially distributed random inputs
        for (int j = 0; j < 1000; ++j) {
            add_coin(testWallet,
                     int64_t(10000000 * distribution(generator)) * SATOSHI);
        }

        // Generate a random fee rate in the range of 100 - 400
        CFeeRate rate(int64_t(rand.randrange(300) + 100) * SATOSHI);

        // Generate a random target value between 1000 and wallet balance
        Amount target =
            int64_t(rand.randrange(balance / SATOSHI - 1000) + 1000) * SATOSHI;

        // Perform selection
        CoinSelectionParams coin_selection_params_knapsack(
            false, 34, 148, CFeeRate(Amount::zero()), 0);
        CoinSelectionParams coin_selection_params_bnb(
            true, 34, 148, CFeeRate(Amount::zero()), 0);
        CoinSet out_set;
        Amount out_value = Amount::zero();
        bool bnb_used = false;
        BOOST_CHECK(testWallet.SelectCoinsMinConf(
                        target, filter_standard, GroupCoins(vCoins), out_set,
                        out_value, coin_selection_params_bnb, bnb_used) ||
                    testWallet.SelectCoinsMinConf(
                        target, filter_standard, GroupCoins(vCoins), out_set,
                        out_value, coin_selection_params_knapsack, bnb_used));
        BOOST_CHECK_GE(out_value, target);
    }
}

BOOST_AUTO_TEST_SUITE_END()
