// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <policy/block/rtt.h>

#include <arith_uint256.h>
#include <blockindex.h>
#include <consensus/params.h>
#include <pow/pow.h>

#include <algorithm>
#include <cmath>

/**
 *   target(t) = target(prev_block) * RTT_CONSTANT_FACTOR * t^(RTT_K - 1)
 * Where t is the time since the previous block timestamp and RTT_K is an
 * arbitrary integer >= 1.
 * The factor is computed as:
 *   RTT_K * gamma(1 + 1/RTT_K)^RTT_K / (T^(RTT_K-1))
 * Where T is the target time between blocks, aka 600s.
 *
 * We apply this formula on a list of previous blocks so we obtain RTT for
 * various windows: 2 blocks, 5 blocks, 11 blocks and 17 blocks. The highest
 * difficulty (the lowest target) over these windows is the one that applies.
 * This is so that the target becomes more constrained as the window increases,
 * but also we have some room for the DAA to take action and let the average
 * difficulty be corrected in both directions.
 *
 * The windows are selected so they are prime numbers, skipping one between
 * successive windows. This is a best effort to avoid introducing resonant
 * frequencies due to using a series of filters. We stop at 17 blocks because
 * it makes no practical difference to go further, the selectivity of the filter
 * doesn't change by any meaningful amount anymore.
 */
static constexpr double RTT_K{6.};

static const double RTT_CONSTANT_FACTOR_2 =
    RTT_K * std::pow(std::tgamma(1. + 1. / RTT_K), RTT_K) /
    std::pow(600., RTT_K - 1.);
static const double RTT_CONSTANT_FACTOR_5 =
    RTT_K * std::pow(std::tgamma(1. + 1. / RTT_K), RTT_K) /
    std::pow(2400., RTT_K - 1.);
static const double RTT_CONSTANT_FACTOR_11 =
    RTT_K * std::pow(std::tgamma(1. + 1. / RTT_K), RTT_K) /
    std::pow(6000., RTT_K - 1.);
static const double RTT_CONSTANT_FACTOR_17 =
    RTT_K * std::pow(std::tgamma(1. + 1. / RTT_K), RTT_K) /
    std::pow(9600., RTT_K - 1.);
static const std::vector<double> RTT_CONSTANT_FACTOR = {
    0., 0., RTT_CONSTANT_FACTOR_2,
    0., 0., RTT_CONSTANT_FACTOR_5,
    0., 0., 0.,
    0., 0., RTT_CONSTANT_FACTOR_11,
    0., 0., 0.,
    0., 0., RTT_CONSTANT_FACTOR_17,
};

std::optional<uint32_t>
GetNextRTTWorkRequired(const CBlockIndex *pprev, int64_t now,
                       const Consensus::Params &consensusParams) {
    const CBlockIndex *previousIndex = pprev;
    // We loop over the past 17 blocks to gather their receive time. We don't
    // care about the receive time of the current block se we leave it at zero.
    std::vector<int64_t> prevHeaderReceivedTime(18, 0);
    for (size_t i = 1; i < 18; i++) {
        if (!previousIndex) {
            return std::nullopt;
        }

        prevHeaderReceivedTime[i] = previousIndex->GetHeaderReceivedTime();
        if (prevHeaderReceivedTime[i] == 0) {
            // If the reception time is zero, this past block is read from the
            // disk, and we have no reason to apply RTT on the current block.
            return std::nullopt;
        }

        previousIndex = previousIndex->pprev;
    }

    arith_uint256 prevTarget;
    if (!NBitsToTarget(consensusParams, pprev->nBits, prevTarget)) {
        return std::nullopt;
    }
    const double prevTargetDouble = prevTarget.getdouble();

    double minTarget = UintToArith256(consensusParams.powLimit).getdouble();
    for (size_t i : {2, 5, 11, 17}) {
        // Zero (or negative) difftime are not possible, so clamp to minimum 1s
        const int64_t diffTime =
            std::max<int64_t>(1, now - prevHeaderReceivedTime[i]);

        double target = prevTargetDouble * RTT_CONSTANT_FACTOR[i] *
                        std::pow(double(diffTime), RTT_K - 1.);

        minTarget = std::min(minTarget, target);
    }

    arith_uint256 nextTarget = arith_uint256::fromDouble(minTarget);
    if (minTarget < 1. ||
        nextTarget > UintToArith256(consensusParams.powLimit)) {
        return std::nullopt;
    }

    return nextTarget.GetCompact();
}
