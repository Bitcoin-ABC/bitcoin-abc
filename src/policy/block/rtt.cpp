// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <policy/block/rtt.h>

#include <arith_uint256.h>
#include <consensus/params.h>
#include <pow/pow.h>

#include <algorithm>

/**
 *   target(t) = target(prev_block) * RTT_CONSTANT_FACTOR * t^(RTT_K - 1)
 * Where t is the time since the previous block timestamp and RTT_K is an
 * arbitrary integer >= 1.
 * The factor is computed as:
 *   RTT_K * gamma(1 + 1/RTT_K)^RTT_K / (T^(RTT_K-1))
 * Where T is the target time between blocks, aka 600s.
 *
 * With RTT_K = 4, RTT_CONSTANT_FACTOR = 1.249944054279951e-08. This is close
 * enough to 1.25e-8 which makes it possible to use integer arithmetic
 * (1.25e-8 = 5 / 400000000), so we accept the loss of precision tradeoff here.
 */
std::optional<arith_uint256>
GetNextRTTWorkRequired(uint32_t prevNBits, int64_t prevHeaderReceivedTime,
                       int64_t now, const Consensus::Params &consensusParams) {
    if (prevHeaderReceivedTime == 0) {
        // If the reception time is zero, this block is read from the disk, and
        // we have no reason to apply RTT on this block.
        return std::nullopt;
    }

    // Zero (or negative) difftime are not possible, so clamp to minimum 1s
    const int64_t diffTime = std::max<int64_t>(1, now - prevHeaderReceivedTime);

    // If diffTime is absurdly large (which should never happen in practice),
    // refuse to compute any RTT. This will also ensure that diffTime^3 cannot
    // overflow.
    if (diffTime > 24 * 60 * 60) {
        return std::nullopt;
    }

    // diffTime cannot be negative so we can safely cast diffTime^3 to unsigned
    const uint64_t diffTimePow3 = diffTime * diffTime * diffTime;

    arith_uint256 nextTarget;
    if (!NBitsToTarget(consensusParams, prevNBits, nextTarget)) {
        return std::nullopt;
    }
    nextTarget /= 400000000;
    nextTarget *= 5;

    if (nextTarget > UintToArith256(consensusParams.powLimit) /
                         arith_uint256(diffTimePow3)) {
        return std::nullopt;
    }

    return nextTarget * arith_uint256(diffTimePow3);
}
