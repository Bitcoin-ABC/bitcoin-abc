// Copyright (c) 2011-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <bench/bench.h>
#include <kernel/mempool_entry.h>
#include <policy/policy.h>
#include <random.h>
#include <test/util/setup_common.h>
#include <txmempool.h>
#include <validation.h>

#include <vector>

static void AddTx(const CTransactionRef &tx, CTxMemPool &pool)
    EXCLUSIVE_LOCKS_REQUIRED(cs_main, pool.cs) {
    int64_t nTime = 0;
    unsigned int nHeight = 1;
    unsigned int sigChecks = 1;
    LockPoints lp;
    pool.addUnchecked(CTxMemPoolEntryRef::make(tx, 1000 * SATOSHI, nTime,
                                               nHeight, sigChecks, lp));
}

struct Available {
    CTransactionRef ref;
    size_t vin_left{0};
    size_t tx_count;
    Available(CTransactionRef &_ref, size_t _tx_count)
        : ref(_ref), tx_count(_tx_count) {}
};

static std::vector<CTransactionRef>
CreateOrderedCoins(FastRandomContext &det_rand, int childTxs,
                   int min_ancestors) {
    std::vector<Available> available_coins;
    std::vector<CTransactionRef> ordered_coins;
    // Create some base transactions
    size_t tx_counter = 1;
    for (auto x = 0; x < 100; ++x) {
        CMutableTransaction tx = CMutableTransaction();
        tx.vin.resize(1);
        tx.vin[0].scriptSig = CScript() << CScriptNum(tx_counter);
        tx.vout.resize(det_rand.randrange(10) + 2);
        for (auto &out : tx.vout) {
            out.scriptPubKey = CScript() << CScriptNum(tx_counter) << OP_EQUAL;
            out.nValue = 10 * COIN;
        }
        ordered_coins.emplace_back(MakeTransactionRef(tx));
        available_coins.emplace_back(ordered_coins.back(), tx_counter++);
    }
    for (auto x = 0; x < childTxs && !available_coins.empty(); ++x) {
        CMutableTransaction tx = CMutableTransaction();
        size_t n_ancestors = det_rand.randrange(10) + 1;
        for (size_t ancestor = 0;
             ancestor < n_ancestors && !available_coins.empty(); ++ancestor) {
            size_t idx = det_rand.randrange(available_coins.size());
            Available coin = available_coins[idx];
            TxId txid = coin.ref->GetId();
            // biased towards taking min_ancestors parents, but maybe more
            size_t n_to_take =
                det_rand.randrange(2) == 0
                    ? min_ancestors
                    : min_ancestors + det_rand.randrange(coin.ref->vout.size() -
                                                         coin.vin_left);
            for (size_t i = 0; i < n_to_take; ++i) {
                tx.vin.emplace_back();
                tx.vin.back().prevout = COutPoint(txid, coin.vin_left++);
                tx.vin.back().scriptSig = CScript() << coin.tx_count;
            }
            if (coin.vin_left == coin.ref->vin.size()) {
                coin = available_coins.back();
                available_coins.pop_back();
            }
            tx.vout.resize(det_rand.randrange(10) + 2);
            for (auto &out : tx.vout) {
                out.scriptPubKey = CScript()
                                   << CScriptNum(tx_counter) << OP_EQUAL;
                out.nValue = 10 * COIN;
            }
        }
        ordered_coins.emplace_back(MakeTransactionRef(tx));
        available_coins.emplace_back(ordered_coins.back(), tx_counter++);
    }
    return ordered_coins;
}

static void ComplexMemPool(benchmark::Bench &bench) {
    FastRandomContext det_rand{true};
    int childTxs = 800;
    if (bench.complexityN() > 1) {
        childTxs = static_cast<int>(bench.complexityN());
    }
    std::vector<CTransactionRef> ordered_coins =
        CreateOrderedCoins(det_rand, childTxs, /* min_ancestors */ 1);
    const auto testing_setup =
        MakeNoLogFileContext<const TestingSetup>(CBaseChainParams::MAIN);
    CTxMemPool &pool = *testing_setup.get()->m_node.mempool;
    LOCK2(cs_main, pool.cs);
    bench.run([&]() NO_THREAD_SAFETY_ANALYSIS {
        for (auto &tx : ordered_coins) {
            AddTx(tx, pool);
        }
        pool.TrimToSize(pool.DynamicMemoryUsage() * 3 / 4);
        pool.TrimToSize(GetVirtualTransactionSize(*ordered_coins.front()));
    });
}

static void MempoolCheck(benchmark::Bench &bench) {
    FastRandomContext det_rand{true};
    auto testing_setup = MakeNoLogFileContext<TestChain100Setup>(
        CBaseChainParams::REGTEST, {"-checkmempool=1"});
    CTxMemPool &pool = *testing_setup.get()->m_node.mempool;
    LOCK2(cs_main, pool.cs);
    testing_setup->PopulateMempool(det_rand, 400, true);
    const CCoinsViewCache &coins_tip =
        testing_setup.get()->m_node.chainman->ActiveChainstate().CoinsTip();

    bench.run([&]() NO_THREAD_SAFETY_ANALYSIS {
        // Bump up the spendheight so we don't hit premature coinbase spend
        // errors.
        pool.check(coins_tip, /*spendheight=*/300);
    });
}

BENCHMARK(ComplexMemPool);
BENCHMARK(MempoolCheck);
