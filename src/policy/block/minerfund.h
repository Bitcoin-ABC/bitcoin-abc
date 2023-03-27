// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_POLICY_BLOCK_MINERFUND_H
#define BITCOIN_POLICY_BLOCK_MINERFUND_H

#include <consensus/amount.h>
#include <policy/block/parkingpolicy.h>
#include <primitives/block.h>

class CBlockIndex;

namespace Consensus {
struct Params;
}

class MinerFundPolicy : public ParkingPolicy {
private:
    const CBlock &m_block;
    const Amount &m_blockReward;
    const Consensus::Params &m_consensusParams;
    const CBlockIndex &m_blockIndex;

public:
    MinerFundPolicy(const Consensus::Params &consensusParams,
                    const CBlockIndex &blockIndex, const CBlock &block,
                    const Amount &blockReward)
        : m_block(block), m_blockReward(blockReward),
          m_consensusParams(consensusParams), m_blockIndex(blockIndex) {}

    bool operator()(BlockPolicyValidationState &state) override;
};

#endif // BITCOIN_POLICY_BLOCK_MINERFUND_H
