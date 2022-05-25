// Copyright (c) 2017-2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <pow/eda.h>

#include <arith_uint256.h>
#include <chain.h>
#include <consensus/params.h>

/**
 * Do difficulty adjustement Satoshi's way.
 */
uint32_t CalculateNextWorkRequired(const CBlockIndex *pindexPrev,
                                   int64_t nFirstBlockTime,
                                   const Consensus::Params &params) {
    // Limit adjustment step
    int64_t nActualTimespan = pindexPrev->GetBlockTime() - nFirstBlockTime;
    if (nActualTimespan < params.nPowTargetTimespan / 4) {
        nActualTimespan = params.nPowTargetTimespan / 4;
    }

    if (nActualTimespan > params.nPowTargetTimespan * 4) {
        nActualTimespan = params.nPowTargetTimespan * 4;
    }

    // Retarget
    const arith_uint256 bnPowLimit = UintToArith256(params.powLimit);
    arith_uint256 bnNew;
    bnNew.SetCompact(pindexPrev->nBits);
    bnNew *= nActualTimespan;
    bnNew /= params.nPowTargetTimespan;

    if (bnNew > bnPowLimit) {
        bnNew = bnPowLimit;
    }

    return bnNew.GetCompact();
}

/**
 * Compute the next required proof of work using the legacy Bitcoin difficulty
 * adjustment + Emergency Difficulty Adjustment (EDA).
 */
uint32_t GetNextEDAWorkRequired(const CBlockIndex *pindexPrev,
                                const CBlockHeader *pblock,
                                const Consensus::Params &params) {
    // Only change once per difficulty adjustment interval
    uint32_t nHeight = pindexPrev->nHeight + 1;
    if (nHeight % params.DifficultyAdjustmentInterval() == 0) {
        // Go back by what we want to be 14 days worth of blocks
        assert(nHeight >= params.DifficultyAdjustmentInterval());
        uint32_t nHeightFirst = nHeight - params.DifficultyAdjustmentInterval();
        const CBlockIndex *pindexFirst = pindexPrev->GetAncestor(nHeightFirst);
        assert(pindexFirst);

        return CalculateNextWorkRequired(pindexPrev,
                                         pindexFirst->GetBlockTime(), params);
    }

    const uint32_t nProofOfWorkLimit =
        UintToArith256(params.powLimit).GetCompact();

    if (params.fPowAllowMinDifficultyBlocks) {
        // Special difficulty rule for testnet:
        // If the new block's timestamp is more than 2* 10 minutes then allow
        // mining of a min-difficulty block.
        if (pblock->GetBlockTime() >
            pindexPrev->GetBlockTime() + 2 * params.nPowTargetSpacing) {
            return nProofOfWorkLimit;
        }

        // Return the last non-special-min-difficulty-rules-block
        const CBlockIndex *pindex = pindexPrev;
        while (pindex->pprev &&
               pindex->nHeight % params.DifficultyAdjustmentInterval() != 0 &&
               pindex->nBits == nProofOfWorkLimit) {
            pindex = pindex->pprev;
        }

        return pindex->nBits;
    }

    // We can't go below the minimum, so bail early.
    uint32_t nBits = pindexPrev->nBits;
    if (nBits == nProofOfWorkLimit) {
        return nProofOfWorkLimit;
    }

    // If producing the last 6 blocks took less than 12h, we keep the same
    // difficulty.
    const CBlockIndex *pindex6 = pindexPrev->GetAncestor(nHeight - 7);
    assert(pindex6);
    int64_t mtp6blocks =
        pindexPrev->GetMedianTimePast() - pindex6->GetMedianTimePast();
    if (mtp6blocks < 12 * 3600) {
        return nBits;
    }

    // If producing the last 6 blocks took more than 12h, increase the
    // difficulty target by 1/4 (which reduces the difficulty by 20%).
    // This ensures that the chain does not get stuck in case we lose
    // hashrate abruptly.
    arith_uint256 nPow;
    nPow.SetCompact(nBits);
    nPow += (nPow >> 2);

    // Make sure we do not go below allowed values.
    const arith_uint256 bnPowLimit = UintToArith256(params.powLimit);
    if (nPow > bnPowLimit) {
        nPow = bnPowLimit;
    }

    return nPow.GetCompact();
}

// Check that on difficulty adjustments, the new difficulty does not increase
// or decrease beyond the permitted limits.
bool PermittedEDADifficultyTransition(const Consensus::Params &params,
                                      uint32_t old_nbits,
                                      arith_uint256 new_target) {
    int64_t smallest_timespan = params.nPowTargetTimespan / 4;
    int64_t largest_timespan = params.nPowTargetTimespan * 4;

    const arith_uint256 pow_limit = UintToArith256(params.powLimit);

    // Calculate the largest difficulty value possible:
    arith_uint256 largest_difficulty_target;
    largest_difficulty_target.SetCompact(old_nbits);
    largest_difficulty_target *= largest_timespan;
    largest_difficulty_target /= params.nPowTargetTimespan;

    if (largest_difficulty_target > pow_limit) {
        largest_difficulty_target = pow_limit;
    }

    // Round and then compare this new calculated value to what is
    // observed.
    arith_uint256 maximum_new_target;
    maximum_new_target.SetCompact(largest_difficulty_target.GetCompact());
    if (maximum_new_target < new_target) {
        return false;
    }

    // Calculate the smallest difficulty value possible:
    arith_uint256 smallest_difficulty_target;
    smallest_difficulty_target.SetCompact(old_nbits);
    smallest_difficulty_target *= smallest_timespan;
    smallest_difficulty_target /= params.nPowTargetTimespan;

    if (smallest_difficulty_target > pow_limit) {
        smallest_difficulty_target = pow_limit;
    }

    // Round and then compare this new calculated value to what is
    // observed.
    arith_uint256 minimum_new_target;
    minimum_new_target.SetCompact(smallest_difficulty_target.GetCompact());
    return new_target >= minimum_new_target;
}
