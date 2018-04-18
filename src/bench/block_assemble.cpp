// Copyright (c) 2011-2017 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <bench/bench.h>
#include <chainparams.h>
#include <config.h>
#include <consensus/merkle.h>
#include <consensus/validation.h>
#include <miner.h>
#include <policy/policy.h>
#include <pow.h>
#include <txmempool.h>
#include <validation.h>

#include <vector>

static std::shared_ptr<CBlock>
PrepareBlock(const Config &config, const CScript &coinbase_scriptPubKey) {
    auto block =
        std::make_shared<CBlock>(BlockAssembler{config, ::g_mempool}
                                     .CreateNewBlock(coinbase_scriptPubKey)
                                     ->block);

    block->nTime = ::ChainActive().Tip()->GetMedianTimePast() + 1;
    block->hashMerkleRoot = BlockMerkleRoot(*block);

    return block;
}

static CTxIn MineBlock(const Config &config,
                       const CScript &coinbase_scriptPubKey) {
    auto block = PrepareBlock(config, coinbase_scriptPubKey);

    while (!CheckProofOfWork(block->GetHash(), block->nBits,
                             config.GetChainParams().GetConsensus())) {
        ++block->nNonce;
        assert(block->nNonce);
    }

    bool processed = ProcessNewBlock(config, block, true, nullptr);
    assert(processed);

    return CTxIn{block->vtx[0]->GetId(), 0};
}

static void AssembleBlock(benchmark::State &state) {
    const Config &config = GetConfig();

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
        tx.vin.push_back(MineBlock(config, SCRIPT_PUB));
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
            CValidationState vstate;
            bool ret{::AcceptToMemoryPool(config, ::g_mempool, vstate, txr,
                                          nullptr /* pfMissingInputs */,
                                          false /* bypass_limits */,
                                          /* nAbsurdFee */ Amount::zero())};
            assert(ret);
        }
    }

    while (state.KeepRunning()) {
        PrepareBlock(config, SCRIPT_PUB);
    }
}

BENCHMARK(AssembleBlock, 700);
