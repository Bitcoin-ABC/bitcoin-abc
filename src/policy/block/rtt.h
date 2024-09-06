// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_POLICY_BLOCK_RTT_H
#define BITCOIN_POLICY_BLOCK_RTT_H

#include <cstdint>
#include <optional>

class arith_uint256;

namespace Consensus {
struct Params;
}

/**
 * Compute the real time block hash target given the previous block parameters.
 */
std::optional<arith_uint256>
GetNextRTTWorkRequired(uint32_t prevNBits, int64_t prevHeaderReceivedTime,
                       int64_t now, const Consensus::Params &consensusParams);

#endif // BITCOIN_POLICY_BLOCK_RTT_H
