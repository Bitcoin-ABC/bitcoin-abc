// Copyright (c) 2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <test/util/mining.h>

#include <chainparams.h>
#include <config.h>
#include <consensus/merkle.h>
#include <key_io.h>
#include <node/context.h>
#include <node/miner.h>
#include <pow/pow.h>
#include <script/standard.h>
#include <util/check.h>
#include <validation.h>

using node::BlockAssembler;
using node::NodeContext;

CTxIn generatetoaddress(const Config &config, const NodeContext &node,
                        const std::string &address) {
    const auto dest = DecodeDestination(address, config.GetChainParams());
    assert(IsValidDestination(dest));
    const auto coinbase_script = GetScriptForDestination(dest);

    return MineBlock(config, node, coinbase_script);
}

CTxIn MineBlock(const Config &config, const NodeContext &node,
                const CScript &coinbase_scriptPubKey) {
    auto block = PrepareBlock(config, node, coinbase_scriptPubKey);

    while (!CheckProofOfWork(block->GetHash(), block->nBits,
                             config.GetChainParams().GetConsensus())) {
        ++block->nNonce;
        assert(block->nNonce);
    }

    bool processed{
        Assert(node.chainman)->ProcessNewBlock(config, block, true, nullptr)};
    assert(processed);

    return CTxIn{block->vtx[0]->GetId(), 0};
}

std::shared_ptr<CBlock> PrepareBlock(const Config &config,
                                     const NodeContext &node,
                                     const CScript &coinbase_scriptPubKey) {
    auto block = std::make_shared<CBlock>(
        BlockAssembler{config, Assert(node.chainman)->ActiveChainstate(),
                       *Assert(node.mempool)}
            .CreateNewBlock(coinbase_scriptPubKey)
            ->block);

    LOCK(cs_main);
    block->nTime = Assert(node.chainman)->ActiveTip()->GetMedianTimePast() + 1;
    block->hashMerkleRoot = BlockMerkleRoot(*block);

    return block;
}
