// Copyright (c) 2011-2017 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <bench/bench.h>
#include <config.h>
#include <consensus/validation.h>
#include <script/standard.h>
#include <test/util/mining.h>
#include <test/util/script.h>
#include <test/util/setup_common.h>
#include <test/util/wallet.h>
#include <txmempool.h>
#include <validation.h>

#include <vector>

static void AssembleBlock(benchmark::Bench &bench) {
    const auto test_setup = MakeNoLogFileContext<const TestingSetup>();
    const Config &config = test_setup->m_node.chainman->GetConfig();

    const CScript scriptSig = CScript() << ToByteVector(CScript() << OP_TRUE);

    // Collect some loose transactions that spend the coinbases of our mined
    // blocks
    constexpr size_t NUM_BLOCKS{200};
    std::array<CTransactionRef, NUM_BLOCKS - COINBASE_MATURITY + 1> txs;
    for (size_t b = 0; b < NUM_BLOCKS; ++b) {
        CMutableTransaction tx;
        tx.vin.push_back(MineBlock(config, test_setup->m_node, P2SH_OP_TRUE));
        tx.vin.back().scriptSig = scriptSig;
        tx.vout.emplace_back(1337 * SATOSHI, P2SH_OP_TRUE);
        // Pad the tx so it's not undersized
        tx.vout.emplace_back(Amount::zero(), CScript()
                                                 << OP_RETURN
                                                 << std::vector<uint8_t>(100));
        if (NUM_BLOCKS - b >= COINBASE_MATURITY) {
            txs.at(b) = MakeTransactionRef(tx);
        }
    }

    {
        LOCK(::cs_main);

        for (const auto &txr : txs) {
            const MempoolAcceptResult res =
                test_setup->m_node.chainman->ProcessTransaction(txr);
            assert(res.m_result_type == MempoolAcceptResult::ResultType::VALID);
        }
    }

    bench.run([&] { PrepareBlock(config, test_setup->m_node, P2SH_OP_TRUE); });
}

BENCHMARK(AssembleBlock);
