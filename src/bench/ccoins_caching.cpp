// Copyright (c) 2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <bench/bench.h>
#include <coins.h>
#include <policy/policy.h>
#include <script/signingprovider.h>
#include <test/util/transaction_utils.h>

#include <vector>

// Microbenchmark for simple accesses to a CCoinsViewCache database. Note from
// laanwj, "replicating the actual usage patterns of the client is hard though,
// many times micro-benchmarks of the database showed completely different
// characteristics than e.g. reindex timings. But that's not a requirement of
// every benchmark."
// (https://github.com/bitcoin/bitcoin/issues/7883#issuecomment-224807484)
static void CCoinsCaching(benchmark::Bench &bench) {
    const ECCVerifyHandle verify_handle;
    ECC_Start();

    FillableSigningProvider keystore;
    CCoinsView coinsDummy;
    CCoinsViewCache coins(&coinsDummy);
    std::vector<CMutableTransaction> dummyTransactions = SetupDummyInputs(
        keystore, coins, {{11 * COIN, 50 * COIN, 21 * COIN, 22 * COIN}});

    CMutableTransaction t1;
    t1.vin.resize(3);
    t1.vin[0].prevout = COutPoint(dummyTransactions[0].GetId(), 1);
    t1.vin[0].scriptSig << std::vector<uint8_t>(65, 0);
    t1.vin[1].prevout = COutPoint(dummyTransactions[1].GetId(), 0);
    t1.vin[1].scriptSig << std::vector<uint8_t>(65, 0)
                        << std::vector<uint8_t>(33, 4);
    t1.vin[2].prevout = COutPoint(dummyTransactions[1].GetId(), 1);
    t1.vin[2].scriptSig << std::vector<uint8_t>(65, 0)
                        << std::vector<uint8_t>(33, 4);
    t1.vout.resize(2);
    t1.vout[0].nValue = 90 * COIN;
    t1.vout[0].scriptPubKey << OP_1;

    // Benchmark.
    bench.run([&] {
        CTransaction t(t1);
        bool success =
            AreInputsStandard(t, coins, STANDARD_SCRIPT_VERIFY_FLAGS);
        assert(success);
    });
    ECC_Stop();
}

BENCHMARK(CCoinsCaching);
