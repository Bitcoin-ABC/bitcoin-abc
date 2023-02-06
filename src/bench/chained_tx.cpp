// Copyright (c) 2021 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <bench/bench.h>
#include <config.h>
#include <consensus/amount.h>
#include <node/context.h>
#include <primitives/transaction.h>
#include <script/script.h>
#include <txmempool.h>
#include <util/string.h>
#include <util/system.h>
#include <validation.h>

#include <test/util/mining.h>
#include <test/util/setup_common.h>

#include <queue>
#include <vector>

/// This file contains benchmarks focusing on chained transactions in the
/// mempool.

static const CScript REDEEM_SCRIPT = CScript() << OP_DROP << OP_TRUE;

static const CScript SCRIPT_PUB_KEY =
    CScript() << OP_HASH160 << ToByteVector(CScriptID(REDEEM_SCRIPT))
              << OP_EQUAL;

static const CScript SCRIPT_SIG = CScript() << std::vector<uint8_t>(100, 0xff)
                                            << ToByteVector(REDEEM_SCRIPT);

/// Mine new utxos
static std::vector<CTxIn> createUTXOs(const Config &config, size_t n,
                                      node::NodeContext &node) {
    std::vector<CTxIn> utxos;
    utxos.reserve(n);

    for (size_t i = 0; i < n; ++i) {
        utxos.emplace_back(MineBlock(config, node, SCRIPT_PUB_KEY));
    }

    // Mature our utxos
    for (size_t i = 0; i < COINBASE_MATURITY + 1; ++i) {
        MineBlock(config, node, SCRIPT_PUB_KEY);
    }

    return utxos;
}

/// Create a transaction spending a coinbase utxo
static CTransactionRef toTx(const Config &config, CTxIn txin) {
    CMutableTransaction tx;
    tx.vin.emplace_back(txin);
    tx.vin.back().scriptSig = SCRIPT_SIG;
    tx.vout.emplace_back(25 * COIN - 1337 * SATOSHI, SCRIPT_PUB_KEY);
    return MakeTransactionRef(tx);
}

/// Creates a chain of transactions with 1-input-1-output.
static std::vector<CTransactionRef> oneInOneOutChain(const Config &config,
                                                     node::NodeContext &node,
                                                     const size_t chainLength) {
    auto firstTx = toTx(config, createUTXOs(config, 1, node).back());

    // Build the chain
    std::vector<CTransactionRef> chain = {firstTx};
    chain.reserve(chainLength);
    while (chain.size() < chainLength) {
        const COutPoint parent(chain.back()->GetId(), 0);
        const Amount inAmount(chain.back()->vout[0].nValue);
        CMutableTransaction tx;
        tx.vin.emplace_back(CTxIn(parent, SCRIPT_SIG));
        tx.vout.emplace_back(inAmount - 1337 * SATOSHI, SCRIPT_PUB_KEY);
        chain.emplace_back(MakeTransactionRef(tx));
    }
    assert(chain.size() == chainLength);
    return chain;
}

/// Creates a tree of transactions with 2-inputs-1-output. It has similar
/// properties to a complete binary-tree, where the last transaction is the
/// "top" of the tree.
static std::vector<CTransactionRef> twoInOneOutTree(const Config &config,
                                                    node::NodeContext &node,
                                                    const size_t treeDepth) {
    // Total number of txs is the sum of nodes at each depth of a binary tree.
    size_t txs = 0;
    for (size_t i = 0; i <= treeDepth; ++i) {
        txs += std::pow(2, i);
    }
    const size_t leafs = std::pow(2, treeDepth);

    std::vector<CTransactionRef> chain;
    chain.reserve(txs);

    std::queue<CTransactionRef> queue;
    for (auto txin : createUTXOs(config, leafs, node)) {
        auto tx = toTx(config, std::move(txin));
        queue.push(tx);
        chain.emplace_back(tx);
    }

    while (true) {
        CMutableTransaction tx;

        const CTransactionRef txin1 = queue.front();
        queue.pop();
        const CTransactionRef txin2 = queue.front();
        queue.pop();

        const Amount inAmount = txin1->vout[0].nValue + txin2->vout[0].nValue;

        tx.vin.emplace_back(CTxIn(COutPoint(txin1->GetId(), 0), SCRIPT_SIG));
        tx.vin.emplace_back(CTxIn(COutPoint(txin2->GetId(), 0), SCRIPT_SIG));
        tx.vout.emplace_back(inAmount - 1337 * SATOSHI, SCRIPT_PUB_KEY);

        CTransactionRef txref = MakeTransactionRef(tx);
        chain.push_back(txref);
        if (queue.empty()) {
            break;
        }
        queue.emplace(txref);
    }
    assert(chain.size() == txs);
    return chain;
}

static void benchTxs(const Config &config, node::NodeContext &node,
                     benchmark::Bench &bench,
                     const std::vector<CTransactionRef> chainedTxs) {
    // ATMP uses gArgs, so we oblige
    gArgs.ForceSetArg("-limitdescendantcount", ToString(chainedTxs.size()));
    gArgs.ForceSetArg("-limitancestorcount", ToString(chainedTxs.size()));
    gArgs.ForceSetArg("-limitancestorsize", ToString(chainedTxs.size() * 1000));
    gArgs.ForceSetArg("-limitdescendantsize",
                      ToString(chainedTxs.size() * 1000));

    auto chainman = Assert(node.chainman.get());
    CChainState &activeChainState = chainman->ActiveChainstate();

    CTxMemPool &mempool{*Assert(activeChainState.GetMempool())};
    assert(mempool.size() == 0);

    bench.run([&] {
        LOCK(::cs_main);
        for (const auto &tx : chainedTxs) {
            MempoolAcceptResult result =
                AcceptToMemoryPool(config, activeChainState, tx, GetTime(),
                                   /*bypass_limits=*/false);
            assert(result.m_result_type ==
                   MempoolAcceptResult::ResultType::VALID);
        }
        mempool.clear();
    });

    gArgs.ClearForcedArg("-limitdescendantcount");
    gArgs.ClearForcedArg("-limitancestorcount");
    gArgs.ClearForcedArg("-limitancestorsize");
    gArgs.ClearForcedArg("-limitdescendantsize");
}

/// Tests a chain of 50 1-input-1-output transactions.
static void MempoolAcceptance50ChainedTxs(benchmark::Bench &bench) {
    RegTestingSetup test_setup{};
    const Config &config = GetConfig();
    const std::vector<CTransactionRef> chainedTxs =
        oneInOneOutChain(config, test_setup.m_node, 50);
    benchTxs(config, test_setup.m_node, bench, chainedTxs);
}

/// Tests a chain of 500 1-input-1-output transactions.
static void MempoolAcceptance500ChainedTxs(benchmark::Bench &bench) {
    RegTestingSetup test_setup{};
    const Config &config = GetConfig();
    const std::vector<CTransactionRef> chainedTxs =
        oneInOneOutChain(config, test_setup.m_node, 500);
    benchTxs(config, test_setup.m_node, bench, chainedTxs);
}

/// Test a tree of 63 2-inputs-1-output transactions
static void MempoolAcceptance63TxTree(benchmark::Bench &bench) {
    RegTestingSetup test_setup{};
    const Config &config = GetConfig();
    const std::vector<CTransactionRef> chainedTxs =
        twoInOneOutTree(config, test_setup.m_node, 5);
    assert(chainedTxs.size() == 63);
    benchTxs(config, test_setup.m_node, bench, chainedTxs);
}

/// Test a tree of 511 2-inputs-1-output transactions
static void MempoolAcceptance511TxTree(benchmark::Bench &bench) {
    RegTestingSetup test_setup{};
    const Config &config = GetConfig();
    const std::vector<CTransactionRef> chainedTxs =
        twoInOneOutTree(config, test_setup.m_node, 8);
    assert(chainedTxs.size() == 511);
    benchTxs(config, test_setup.m_node, bench, chainedTxs);
}

BENCHMARK(MempoolAcceptance50ChainedTxs);
BENCHMARK(MempoolAcceptance500ChainedTxs);
BENCHMARK(MempoolAcceptance63TxTree);
BENCHMARK(MempoolAcceptance511TxTree);
