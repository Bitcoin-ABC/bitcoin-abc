// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_POLICY_BLOCK_RTT_H
#define BITCOIN_POLICY_BLOCK_RTT_H

#include <policy/block/parkingpolicy.h>

#include <cstddef>
#include <cstdint>
#include <optional>
#include <vector>

class CBlockIndex;

namespace Consensus {
struct Params;
}

/** Default for -enablertt */
static constexpr bool DEFAULT_ENABLE_RTT{true};

class RTTPolicy : public ParkingPolicy {
private:
    const Consensus::Params &m_consensusParams;
    const CBlockIndex &m_blockIndex;

public:
    RTTPolicy(const Consensus::Params &consensusParams,
              const CBlockIndex &blockIndex)
        : m_consensusParams(consensusParams), m_blockIndex(blockIndex) {}

    bool operator()(BlockPolicyValidationState &state) override;
};

/**
 * Compute the real time block hash target given the previous block parameters.
 */
std::optional<uint32_t>
GetNextRTTWorkRequired(const CBlockIndex *pprev, int64_t now,
                       const Consensus::Params &consensusParams);

/** Whether the RTT feature is enabled */
bool isRTTEnabled(const Consensus::Params &params, const CBlockIndex *pprev);

#endif // BITCOIN_POLICY_BLOCK_RTT_H
