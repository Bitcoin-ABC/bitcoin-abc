// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_POLICY_BLOCK_PRECONSENSUS_H
#define BITCOIN_POLICY_BLOCK_PRECONSENSUS_H

#include <avalanche/avalanche.h>
#include <consensus/activation.h>
#include <consensus/amount.h>
#include <policy/block/parkingpolicy.h>
#include <primitives/block.h>
#include <txmempool.h>

class CBlockIndex;

class PreConsensusPolicy : public ParkingPolicy {
private:
    const CBlock &m_block;
    const CBlockIndex &m_blockIndex;
    const CTxMemPool *m_mempool;

public:
    PreConsensusPolicy(const CBlockIndex &blockIndex, const CBlock &block,
                       const CTxMemPool *mempool)
        : m_block(block), m_blockIndex(blockIndex), m_mempool(mempool) {}

    bool operator()(BlockPolicyValidationState &state) override
        EXCLUSIVE_LOCKS_REQUIRED(m_mempool->cs);
};

#endif // BITCOIN_POLICY_BLOCK_PRECONSENSUS_H
