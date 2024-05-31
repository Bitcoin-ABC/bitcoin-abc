// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_POLICY_BLOCK_STAKINGREWARDS_H
#define BITCOIN_POLICY_BLOCK_STAKINGREWARDS_H

#include <policy/block/parkingpolicy.h>

struct Amount;
class CBlock;
class CBlockIndex;

namespace Consensus {
struct Params;
}

namespace avalanche {
class Processor;
}

class StakingRewardsPolicy : public ParkingPolicy {
private:
    const avalanche::Processor &m_avalanche;
    const CBlock &m_block;
    const Amount &m_blockReward;
    const Consensus::Params &m_consensusParams;
    const CBlockIndex &m_blockIndex;

public:
    StakingRewardsPolicy(const avalanche::Processor &avalanche,
                         const Consensus::Params &consensusParams,
                         const CBlockIndex &blockIndex, const CBlock &block,
                         const Amount &blockReward)
        : m_avalanche(avalanche), m_block(block), m_blockReward(blockReward),
          m_consensusParams(consensusParams), m_blockIndex(blockIndex) {}

    bool operator()(BlockPolicyValidationState &state) override;
};

Amount GetStakingRewardsAmount(const Amount &coinbaseValue);
bool IsStakingRewardsActivated(const Consensus::Params &params,
                               const CBlockIndex *pprev);

#endif // BITCOIN_POLICY_BLOCK_STAKINGREWARDS_H
