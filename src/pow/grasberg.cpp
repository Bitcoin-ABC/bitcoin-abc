// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <pow/grasberg.h>

#include <arith_uint256.h>
#include <chain.h>
#include <chainparams.h>
#include <consensus/params.h>

using namespace grasberg;

// 2^32 * ln(2) = 2977044471.82
static constexpr int64_t LN2_32 = 2977044472;

static constexpr int64_t POW2_32 = int64_t(1) << 32;

static arith_uint256 ComputeNextTarget(const CBlockIndex *pindexTip,
                                       const CBlockIndex *pindexRef,
                                       const CChainParams &params) {
    const int64_t targetBlockTime = computeTargetBlockTime(pindexTip, params);
    const int64_t expectedBlockTime = params.GetConsensus().nPowTargetSpacing;

    const int64_t refBlockTime = pindexRef->GetBlockTime();
    const int64_t refBlockInterval =
        (pindexRef->pprev == nullptr)
            ? expectedBlockTime
            : (refBlockTime - pindexRef->pprev->GetBlockTime());
    const int64_t refInterval =
        refBlockInterval + pindexTip->GetBlockTime() - refBlockTime;
    const int64_t refIntervalSize = pindexTip->nHeight - pindexRef->nHeight;
    const int64_t timeOffset =
        refInterval - (targetBlockTime + refIntervalSize * expectedBlockTime);

    // Compute the adjustment factor.
    const int64_t tau32 = 288 * expectedBlockTime * LN2_32;
    const int64_t x32 = (timeOffset * POW2_32) / (tau32 >> 32);
    const int32_t xi = x32 >> 32;
    const uint32_t xd = x32 & uint32_t(-1);

    /**
     * Even though the correct thing to do would be to add 1 to the target, and
     * then remove 1 at the end, experimentation showed that the cases in which
     * the results differ are vanishingly few and we therefore skip this step.
     */
    arith_uint256 lastBlockTarget;
    lastBlockTarget.SetCompact(pindexRef->nBits);

    // Clip adjustment to avoid overflow.
    if (xi >= 32) {
        return lastBlockTarget << 32;
    } else if (xi <= -32) {
        return lastBlockTarget >> 32;
    }

    const uint32_t e31 = (deterministicExp2(xd) >> 1) | (1u << 31);
    return (lastBlockTarget * e31) >> (31 - xi);
}

/**
 * Compute the next required proof of work using a relative target based ASERT
 * algorithm.
 *
 * This algorithm uses the relative formulation of ASERT in order to allow for
 * activation at any point in time without complications.
 *
 * In addition, this algorithm contains a drift correction mechanism. While
 * ASERT by itself drifts very little, the chain is already off schedule.
 */
uint32_t GetNextGrasbergWorkRequired(const CBlockIndex *pindexPrev,
                                     const CBlockHeader *pblock,
                                     const CChainParams &chainParams) {
    const Consensus::Params &params = chainParams.GetConsensus();
    const CBlockIndex *pindexTip = pindexPrev;

    if (params.fPowAllowMinDifficultyBlocks) {
        // Special difficulty rule for testnet:
        // If the new block's timestamp is more than 2* 10 minutes then allow
        // mining of a min-difficulty block.
        if (pblock->GetBlockTime() >
            pindexPrev->GetBlockTime() + 2 * params.nPowTargetSpacing) {
            return UintToArith256(params.powLimit).GetCompact();
        }

        // Use the last non-special-min-difficulty-rules-block as a base to
        // compute difficulty.
        while (pindexPrev->pprev && (pindexPrev->GetBlockTime() >
                                     pindexPrev->pprev->GetBlockTime() +
                                         2 * params.nPowTargetSpacing)) {
            pindexPrev = pindexPrev->pprev;
        }
    }

    const arith_uint256 nextTarget =
        ComputeNextTarget(pindexTip, pindexPrev, chainParams);

    const arith_uint256 powLimit = UintToArith256(params.powLimit);
    if (nextTarget > powLimit) {
        return powLimit.GetCompact();
    }

    return nextTarget.GetCompact();
}

namespace grasberg {

int64_t computeTargetBlockTime(const CBlockIndex *pindexPrev,
                               const CChainParams &chainParams) {
    const Consensus::Params &params = chainParams.GetConsensus();

    const int64_t lastBlockTime = pindexPrev->GetBlockTime();
    const int64_t powTargetSpacing = params.nPowTargetSpacing;
    const int64_t expectedTime = pindexPrev->nHeight * powTargetSpacing +
                                 chainParams.GenesisBlock().nTime;
    const int64_t drift = expectedTime - lastBlockTime;

    const int64_t tau = params.nPowTargetTimespan;
    const int64_t x32 = (drift * POW2_32) / tau;

    // 2^32 * ln2(675/600) = 729822323.967
    static constexpr int64_t X_CLIP = 729822324;

    // We clip to ensure block time stay around 10 minutes in practice.
    const uint32_t x = std::max(std::min(x32, X_CLIP), -X_CLIP);
    const int64_t offsetTime32 = powTargetSpacing * deterministicExp2(x);

    /**
     * The split between the integer and decimal part of x32 does not happen
     * like one might intuitively think using "regular math". This is because
     * "computer math" differs in ways that might be subtle, but nevertheless
     * are very important. The integer part is *ALWAYS* rounded down. For
     * instance, 0.3 is split as 0 + 0.3, which is intuitive. But -0.3 is split
     * as -1 + 0.7 , which means we need to multiply by 2^-1 when x32 is
     * negative. This is implemented as a right shift.
     */
    return (powTargetSpacing + (offsetTime32 >> 32)) >> (x32 < 0);
}

uint32_t deterministicExp2(const uint32_t n) {
    /**
     * Rescale the computation depending on n for better precision.
     * We use the MSB to form 4 buckets.
     */
    const uint32_t bucket = n >> 30;

    /**
     * Rescale on the range [0 .. 0.25[ via:
     *     exp2(n) = 2^32 * 2^(n/2^32)
     *             = 2^32 * 2^((n - d)/2^32 + d/2^32)
     *             = 2^32 * 2^(d/2^32) * 2^((n - d)/2^32)
     * Using x = n - d:
     *     exp2(n) = 2^32 * 2^(d/2^32) * 2^(x/2^32)
     */
    const uint32_t x = n & 0x3fffffff;

    constexpr uint32_t scales[4] = {
        // 2^31 * 2^(0/4) = 2147483648
        2147483648,
        // 2^31 * 2^(1/4) = 2553802833.55
        2553802834,
        // 2^31 * 2^(2/4) = 3037000499.98
        3037000500,
        // 2^31 * 2^(3/4) = 3611622602.84
        3611622603,
    };
    const uint32_t scale = scales[bucket];

    // Compute quartic polynomial (((dx + c) * x + b) * x + a) * x, fitted to
    // 2**x-1 for 0 <= x < 0.25
    uint64_t P = 0;
    P = ((P + 45037112) * x) >> 32;
    P = ((P + 237575834) * x) >> 32;
    P = ((P + 1031834945) * x) >> 32;
    P = ((P + 2977042554) * x) >> 32;

    // Apply binning factor 2^(bucket/4)
    return (((P + POW2_32) * scale) >> 31) - POW2_32;
}

} // namespace grasberg
