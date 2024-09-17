// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_POLICY_BLOCK_RTT_H
#define BITCOIN_POLICY_BLOCK_RTT_H

#include <cstdint>
#include <optional>

class CBlockIndex;

namespace Consensus {
struct Params;
}

/**
 * Compute the real time block hash target given the previous block parameters.
 */
std::optional<uint32_t>
GetNextRTTWorkRequired(const CBlockIndex *pprev, int64_t now,
                       const Consensus::Params &consensusParams);

#endif // BITCOIN_POLICY_BLOCK_RTT_H
