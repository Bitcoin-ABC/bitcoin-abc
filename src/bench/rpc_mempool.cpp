// Copyright (c) 2011-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <bench/bench.h>
#include <rpc/blockchain.h>
#include <txmempool.h>

#include <univalue.h>

static void AddTx(const CTransactionRef &tx, const Amount &fee,
                  CTxMemPool &pool) EXCLUSIVE_LOCKS_REQUIRED(cs_main, pool.cs) {
    LockPoints lp;
    pool.addUnchecked(CTxMemPoolEntry(tx, fee, /* time */ 0,
                                      /* height */ 1,
                                      /* spendsCoinbase */ false,
                                      /* sigOpCount */ 1, lp));
}

static void RpcMempool(benchmark::Bench &bench) {
    CTxMemPool pool;
    LOCK2(cs_main, pool.cs);

    for (int i = 0; i < 1000; ++i) {
        CMutableTransaction tx = CMutableTransaction();
        tx.vin.resize(1);
        tx.vin[0].scriptSig = CScript() << OP_1;
        tx.vout.resize(1);
        tx.vout[0].scriptPubKey = CScript() << OP_1 << OP_EQUAL;
        tx.vout[0].nValue = i * COIN;
        const CTransactionRef tx_r{MakeTransactionRef(tx)};
        AddTx(tx_r, /* fee */ i * COIN, pool);
    }

    bench.run([&] { (void)MempoolToJSON(pool, /*verbose*/ true); });
}

BENCHMARK(RpcMempool);
