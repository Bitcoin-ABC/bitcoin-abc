// Copyright (c) 2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <test/util/mining.h>

#include <blockindex.h>
#include <chainparams.h>
#include <config.h>
#include <consensus/merkle.h>
#include <key_io.h>
#include <net.h>
#include <node/context.h>
#include <node/miner.h>
#include <pow/pow.h>
#include <primitives/block.h>
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

    bool processed{Assert(node.chainman)
                       ->ProcessNewBlock(config, block, true, true, nullptr)};
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

static const std::vector<uint8_t>
getExcessiveBlockSizeSig(uint64_t nExcessiveBlockSize) {
    std::string cbmsg = "/EB" + getSubVersionEB(nExcessiveBlockSize) + "/";
    std::vector<uint8_t> vec(cbmsg.begin(), cbmsg.end());
    return vec;
}

void createCoinbaseAndMerkleRoot(CBlock *pblock, const CBlockIndex *pindexPrev,
                                 uint64_t nExcessiveBlockSize) {
    static uint256 hashPrevBlock;
    if (hashPrevBlock != pblock->hashPrevBlock) {
        hashPrevBlock = pblock->hashPrevBlock;
    }

    CMutableTransaction tx_coinbase{*pblock->vtx.at(0)};
    tx_coinbase.vin.at(0).scriptSig =
        CScript{} << pindexPrev->nHeight + 1
                  << getExcessiveBlockSizeSig(nExcessiveBlockSize);

    // Make sure the coinbase is big enough.
    uint64_t coinbaseSize = ::GetSerializeSize(tx_coinbase, PROTOCOL_VERSION);
    if (coinbaseSize < MIN_TX_SIZE) {
        tx_coinbase.vin[0].scriptSig
            << std::vector<uint8_t>(MIN_TX_SIZE - coinbaseSize - 1);
    }

    assert(tx_coinbase.vin[0].scriptSig.size() <= MAX_COINBASE_SCRIPTSIG_SIZE);
    assert(::GetSerializeSize(tx_coinbase, PROTOCOL_VERSION) >= MIN_TX_SIZE);

    pblock->vtx[0] = MakeTransactionRef(std::move(tx_coinbase));
    pblock->hashMerkleRoot = BlockMerkleRoot(*pblock);
}
