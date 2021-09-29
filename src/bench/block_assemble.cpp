// Copyright (c) 2011-2017 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <bench/bench.h>
#include <config.h>
#include <consensus/validation.h>
#include <script/standard.h>
#include <test/util/mining.h>
#include <test/util/setup_common.h>
#include <test/util/wallet.h>
#include <txmempool.h>
#include <validation.h>

#include <vector>

static void AssembleBlock(benchmark::Bench &bench) {
    const Config &config = GetConfig();
    TestingSetup test_setup{
        CBaseChainParams::REGTEST,
        /* extra_args */
        {
            "-nodebuglogfile",
            "-nodebug",
        },
    };

    const CScript redeemScript = CScript() << OP_DROP << OP_TRUE;
    const CScript SCRIPT_PUB =
        CScript() << OP_HASH160 << ToByteVector(CScriptID(redeemScript))
                  << OP_EQUAL;

    const CScript scriptSig = CScript() << std::vector<uint8_t>(100, 0xff)
                                        << ToByteVector(redeemScript);

    // Collect some loose transactions that spend the coinbases of our mined
    // blocks
    constexpr size_t NUM_BLOCKS{200};
    std::array<CTransactionRef, NUM_BLOCKS - COINBASE_MATURITY + 1> txs;
    for (size_t b = 0; b < NUM_BLOCKS; ++b) {
        CMutableTransaction tx;
        tx.vin.push_back(MineBlock(config, test_setup.m_node, SCRIPT_PUB));
        tx.vin.back().scriptSig = scriptSig;
        tx.vout.emplace_back(1337 * SATOSHI, SCRIPT_PUB);
        if (NUM_BLOCKS - b >= COINBASE_MATURITY) {
            txs.at(b) = MakeTransactionRef(tx);
        }
    }

    {
        // Required for ::AcceptToMemoryPool.
        LOCK(::cs_main);

        for (const auto &txr : txs) {
            TxValidationState vstate;
            bool ret{::AcceptToMemoryPool(config, *test_setup.m_node.mempool,
                                          vstate, txr,
                                          false /* bypass_limits */,
                                          /* nAbsurdFee */ Amount::zero())};
            assert(ret);
        }
    }

    bench.run([&] { PrepareBlock(config, test_setup.m_node, SCRIPT_PUB); });
}

BENCHMARK(AssembleBlock);
