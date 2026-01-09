// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT/X11 software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <pow/aserti32d.h>

#include <chain.h>
#include <chainparams.h>
#include <config.h>
#include <consensus/activation.h>
#include <pow/pow.h>
#include <util/chaintype.h>

#include <test/util/random.h>
#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

#include <cmath>

BOOST_FIXTURE_TEST_SUITE(aserti32d_tests, BasicTestingSetup)

static CBlockIndex GetBlockIndex(CBlockIndex *pindexPrev, int64_t nTimeInterval,
                                 uint32_t nBits) {
    CBlockIndex block;
    block.pprev = pindexPrev;
    block.nHeight = pindexPrev->nHeight + 1;
    block.nTime = pindexPrev->nTime + nTimeInterval;
    block.nBits = nBits;

    block.BuildSkip();
    block.nChainWork = pindexPrev->nChainWork + GetBlockProof(block);
    return block;
}

static double TargetFromBits(const uint32_t nBits) {
    return (nBits & 0xff'ff'ff) * pow(256, (nBits >> 24) - 3);
}

static double GetASERTApproximationError(const CBlockIndex *pindexPrev,
                                         const uint32_t finalBits,
                                         const CBlockIndex *pindexAnchorBlock) {
    const int64_t nHeightDiff =
        pindexPrev->nHeight - pindexAnchorBlock->nHeight;
    const int64_t nTimeDiff =
        pindexPrev->GetBlockTime() - pindexAnchorBlock->pprev->GetBlockTime();
    const uint32_t initialBits = pindexAnchorBlock->nBits;

    BOOST_CHECK(nHeightDiff >= 0);
    double dInitialPow = TargetFromBits(initialBits);
    double dFinalPow = TargetFromBits(finalBits);

    double dExponent =
        double(nTimeDiff - (nHeightDiff + 1) * 600) / double(2 * 24 * 3600);
    double dTarget = dInitialPow * pow(2, dExponent);

    return (dFinalPow - dTarget) / dTarget;
}

BOOST_AUTO_TEST_CASE(asert_difficulty_test) {
    DummyConfig config(ChainTypeToString(ChainType::MAIN));

    std::vector<CBlockIndex> blocks(3000 + 2 * 24 * 3600);

    const Consensus::Params &params = config.GetChainParams().GetConsensus();
    const arith_uint256 powLimit = UintToArith256(params.powLimit);
    arith_uint256 currentPow = powLimit >> 3;
    uint32_t initialBits = currentPow.GetCompact();
    double dMaxErr = 0.0001166792656486;

    // Genesis block, and parent of ASERT anchor block in this test case.
    blocks[0] = CBlockIndex();
    blocks[0].nHeight = 0;
    blocks[0].nTime = 1269211443;
    // The pre-anchor block's nBits should never be used, so we set it to a
    // nonsense value in order to trigger an error if it is ever accessed
    blocks[0].nBits = 0x0dedbeef;

    blocks[0].nChainWork = GetBlockProof(blocks[0]);

    // Block counter.
    size_t i = 1;

    // ASERT anchor block. We give this one a solvetime of 150 seconds to ensure
    // that the solvetime between the pre-anchor and the anchor blocks is
    // actually used.
    blocks[1] = GetBlockIndex(&blocks[0], 150, initialBits);
    // The nBits for the next block should not be equal to the anchor block's
    // nBits
    CBlockHeader blkHeaderDummy;
    uint32_t nBits = GetNextASERTWorkRequired(&blocks[i++], &blkHeaderDummy,
                                              params, &blocks[1]);
    BOOST_CHECK(fabs(GetASERTApproximationError(&blocks[i - 1], nBits,
                                                &blocks[1])) < dMaxErr);
    BOOST_CHECK(nBits != initialBits);

    // If we add another block at 1050 seconds, we should return to the anchor
    // block's nBits
    blocks[i] = GetBlockIndex(&blocks[i - 1], 1050, nBits);
    nBits = GetNextASERTWorkRequired(&blocks[i++], &blkHeaderDummy, params,
                                     &blocks[1]);
    BOOST_CHECK(nBits == initialBits);
    BOOST_CHECK(fabs(GetASERTApproximationError(&blocks[i - 1], nBits,
                                                &blocks[1])) < dMaxErr);

    currentPow = arith_uint256().SetCompact(nBits);
    // Before we do anything else, check that timestamps *before* the anchor
    // block work fine. Jumping 2 days into the past will give a timestamp
    // before the achnor, and should halve the target
    blocks[i] = GetBlockIndex(&blocks[i - 1], 600 - 172800, nBits);
    nBits = GetNextASERTWorkRequired(&blocks[i++], &blkHeaderDummy, params,
                                     &blocks[1]);
    currentPow = arith_uint256().SetCompact(nBits);
    // Because nBits truncates target, we don't end up with exactly 1/2 the
    // target
    BOOST_CHECK(currentPow <= arith_uint256().SetCompact(initialBits) / 2);
    BOOST_CHECK(currentPow >= arith_uint256().SetCompact(initialBits - 1) / 2);
    BOOST_CHECK(fabs(GetASERTApproximationError(&blocks[i - 1], nBits,
                                                &blocks[1])) < dMaxErr);

    // Jumping forward 2 days should return the target to the initial value
    blocks[i] = GetBlockIndex(&blocks[i - 1], 600 + 172800, nBits);
    nBits = GetNextASERTWorkRequired(&blocks[i++], &blkHeaderDummy, params,
                                     &blocks[1]);
    currentPow = arith_uint256().SetCompact(nBits);
    BOOST_CHECK(nBits == initialBits);
    BOOST_CHECK(fabs(GetASERTApproximationError(&blocks[i - 1], nBits,
                                                &blocks[1])) < dMaxErr);

    // Pile up some blocks every 10 mins to establish some history.
    for (; i < 150; i++) {
        blocks[i] = GetBlockIndex(&blocks[i - 1], 600, nBits);
        BOOST_CHECK_EQUAL(blocks[i].nBits, nBits);
    }

    nBits = GetNextASERTWorkRequired(&blocks[i - 1], &blkHeaderDummy, params,
                                     &blocks[1]);

    BOOST_CHECK_EQUAL(nBits, initialBits);

    // Difficulty stays the same as long as we produce a block every 10 mins.
    for (size_t j = 0; j < 10; i++, j++) {
        blocks[i] = GetBlockIndex(&blocks[i - 1], 600, nBits);
        BOOST_CHECK_EQUAL(GetNextASERTWorkRequired(&blocks[i], &blkHeaderDummy,
                                                   params, &blocks[1]),
                          nBits);
    }

    // If we add a two blocks whose solvetimes together add up to 1200s,
    // then the next block's target should be the same as the one before these
    // blocks (at this point, equal to initialBits).
    blocks[i] = GetBlockIndex(&blocks[i - 1], 300, nBits);
    nBits = GetNextASERTWorkRequired(&blocks[i++], &blkHeaderDummy, params,
                                     &blocks[1]);
    BOOST_CHECK(fabs(GetASERTApproximationError(&blocks[i - 1], nBits,
                                                &blocks[1])) < dMaxErr);
    // relative
    BOOST_CHECK(fabs(GetASERTApproximationError(&blocks[i - 1], nBits,
                                                &blocks[i - 2])) < dMaxErr);
    blocks[i] = GetBlockIndex(&blocks[i - 1], 900, nBits);
    nBits = GetNextASERTWorkRequired(&blocks[i++], &blkHeaderDummy, params,
                                     &blocks[1]);
    // absolute
    BOOST_CHECK(fabs(GetASERTApproximationError(&blocks[i - 1], nBits,
                                                &blocks[1])) < dMaxErr);
    // relative
    BOOST_CHECK(fabs(GetASERTApproximationError(&blocks[i - 1], nBits,
                                                &blocks[i - 2])) < dMaxErr);
    BOOST_CHECK_EQUAL(nBits, initialBits);
    BOOST_CHECK(nBits != blocks[i - 1].nBits);

    // Same in reverse - this time slower block first, followed by faster block.
    blocks[i] = GetBlockIndex(&blocks[i - 1], 900, nBits);
    nBits = GetNextASERTWorkRequired(&blocks[i++], &blkHeaderDummy, params,
                                     &blocks[1]);
    // absolute
    BOOST_CHECK(fabs(GetASERTApproximationError(&blocks[i - 1], nBits,
                                                &blocks[1])) < dMaxErr);
    // relative
    BOOST_CHECK(fabs(GetASERTApproximationError(&blocks[i - 1], nBits,
                                                &blocks[i - 2])) < dMaxErr);
    blocks[i] = GetBlockIndex(&blocks[i - 1], 300, nBits);
    nBits = GetNextASERTWorkRequired(&blocks[i++], &blkHeaderDummy, params,
                                     &blocks[1]);
    // absolute
    BOOST_CHECK(fabs(GetASERTApproximationError(&blocks[i - 1], nBits,
                                                &blocks[1])) < dMaxErr);
    // relative
    BOOST_CHECK(fabs(GetASERTApproximationError(&blocks[i - 1], nBits,
                                                &blocks[i - 2])) < dMaxErr);
    BOOST_CHECK_EQUAL(nBits, initialBits);
    BOOST_CHECK(nBits != blocks[i - 1].nBits);

    // Jumping forward 2 days should double the target (halve the difficulty)
    blocks[i] = GetBlockIndex(&blocks[i - 1], 600 + 2 * 24 * 3600, nBits);
    nBits = GetNextASERTWorkRequired(&blocks[i++], &blkHeaderDummy, params,
                                     &blocks[1]);
    // absolute
    BOOST_CHECK(fabs(GetASERTApproximationError(&blocks[i - 1], nBits,
                                                &blocks[1])) < dMaxErr);
    // relative
    BOOST_CHECK(fabs(GetASERTApproximationError(&blocks[i - 1], nBits,
                                                &blocks[i - 2])) < dMaxErr);
    currentPow = arith_uint256().SetCompact(nBits) / 2;
    BOOST_CHECK_EQUAL(currentPow.GetCompact(), initialBits);

    // Jumping backward 2 days should bring target back to where we started
    blocks[i] = GetBlockIndex(&blocks[i - 1], 600 - 2 * 24 * 3600, nBits);
    nBits = GetNextASERTWorkRequired(&blocks[i++], &blkHeaderDummy, params,
                                     &blocks[1]);
    BOOST_CHECK(fabs(GetASERTApproximationError(
                    &blocks[i - 1], nBits, &blocks[1])) < dMaxErr); // absolute
    BOOST_CHECK(fabs(GetASERTApproximationError(&blocks[i - 1], nBits,
                                                &blocks[i - 2])) <
                dMaxErr); // relative
    BOOST_CHECK_EQUAL(nBits, initialBits);

    // Jumping backward 2 days should halve the target (double the difficulty)
    blocks[i] = GetBlockIndex(&blocks[i - 1], 600 - 2 * 24 * 3600, nBits);
    nBits = GetNextASERTWorkRequired(&blocks[i++], &blkHeaderDummy, params,
                                     &blocks[1]);
    // absolute
    BOOST_CHECK(fabs(GetASERTApproximationError(&blocks[i - 1], nBits,
                                                &blocks[1])) < dMaxErr);
    // relative
    BOOST_CHECK(fabs(GetASERTApproximationError(&blocks[i - 1], nBits,
                                                &blocks[i - 2])) < dMaxErr);
    currentPow = arith_uint256().SetCompact(nBits);
    // Because nBits truncates target, we don't end up with exactly 1/2 the
    // target
    BOOST_CHECK(currentPow <= arith_uint256().SetCompact(initialBits) / 2);
    BOOST_CHECK(currentPow >= arith_uint256().SetCompact(initialBits - 1) / 2);

    // And forward again
    blocks[i] = GetBlockIndex(&blocks[i - 1], 600 + 2 * 24 * 3600, nBits);
    nBits = GetNextASERTWorkRequired(&blocks[i++], &blkHeaderDummy, params,
                                     &blocks[1]);
    // absolute
    BOOST_CHECK(fabs(GetASERTApproximationError(&blocks[i - 1], nBits,
                                                &blocks[1])) < dMaxErr);
    // relative
    BOOST_CHECK(fabs(GetASERTApproximationError(&blocks[i - 1], nBits,
                                                &blocks[i - 2])) < dMaxErr);
    BOOST_CHECK_EQUAL(nBits, initialBits);
    blocks[i] = GetBlockIndex(&blocks[i - 1], 600 + 2 * 24 * 3600, nBits);
    nBits = GetNextASERTWorkRequired(&blocks[i++], &blkHeaderDummy, params,
                                     &blocks[1]);
    // absolute
    BOOST_CHECK(fabs(GetASERTApproximationError(&blocks[i - 1], nBits,
                                                &blocks[1])) < dMaxErr);
    // relative
    BOOST_CHECK(fabs(GetASERTApproximationError(&blocks[i - 1], nBits,
                                                &blocks[i - 2])) < dMaxErr);
    currentPow = arith_uint256().SetCompact(nBits) / 2;
    BOOST_CHECK_EQUAL(currentPow.GetCompact(), initialBits);

    // Iterate over the entire -2*24*3600..+2*24*3600 range to check that our
    // integer approximation:
    //   1. Should be monotonic.
    //   2. Should change target at least once every 8 seconds (worst-case:
    //      15-bit precision on nBits)
    //   3. Should never change target by more than XXXX per 1-second step.
    //   4. Never exceeds dMaxError in absolute error vs a double float
    //      calculation.
    //   5. Has almost exactly the dMax and dMin errors we expect for the
    //      formula.
    double dMin = 0;
    double dMax = 0;
    double dErr;
    double dRelMin = 0;
    double dRelMax = 0;
    double dRelErr;
    double dMaxStep = 0;
    uint32_t nBitsRingBuffer[8];
    double dStep = 0;
    blocks[i] = GetBlockIndex(&blocks[i - 1], -2 * 24 * 3600 - 30, nBits);
    for (size_t j = 0; j < 4 * 24 * 3600 + 660; j++) {
        blocks[i].nTime++;
        nBits = GetNextASERTWorkRequired(&blocks[i], &blkHeaderDummy, params,
                                         &blocks[1]);

        if (j > 8) {
            // 1: Monotonic
            BOOST_CHECK(
                arith_uint256().SetCompact(nBits) >=
                arith_uint256().SetCompact(nBitsRingBuffer[(j - 1) % 8]));
            // 2: Changes at least once every 8 seconds (worst case: nBits =
            // 1d008000 to 1d008001)
            BOOST_CHECK(arith_uint256().SetCompact(nBits) >
                        arith_uint256().SetCompact(nBitsRingBuffer[j % 8]));
            // 3: Check 1-sec step size
            dStep = (TargetFromBits(nBits) -
                     TargetFromBits(nBitsRingBuffer[(j - 1) % 8])) /
                    TargetFromBits(nBits);
            dMaxStep = std::max(dMaxStep, dStep);
            // from nBits = 1d008000 to 1d008001
            BOOST_CHECK(dStep < 0.0000314812106363);
        }
        nBitsRingBuffer[j % 8] = nBits;

        // 4 and 5: check error vs double precision float calculation
        dErr = GetASERTApproximationError(&blocks[i], nBits, &blocks[1]);
        dRelErr = GetASERTApproximationError(&blocks[i], nBits, &blocks[i - 1]);
        dMin = std::min(dMin, dErr);
        dMax = std::max(dMax, dErr);
        dRelMin = std::min(dRelMin, dRelErr);
        dRelMax = std::max(dRelMax, dRelErr);
        BOOST_CHECK_MESSAGE(
            fabs(dErr) < dMaxErr,
            strprintf(
                "solveTime: %d\tStep size: %.8f%%\tdErr: %.8f%%\tnBits: %0x\n",
                int64_t(blocks[i].nTime) - blocks[i - 1].nTime, dStep * 100,
                dErr * 100, nBits));
        BOOST_CHECK_MESSAGE(
            fabs(dRelErr) < dMaxErr,
            strprintf("solveTime: %d\tStep size: %.8f%%\tdRelErr: "
                      "%.8f%%\tnBits: %0x\n",
                      int64_t(blocks[i].nTime) - blocks[i - 1].nTime,
                      dStep * 100, dRelErr * 100, nBits));
    }
    auto failMsg = strprintf(
        "Min error: %16.14f%%\tMax error: %16.14f%%\tMax step: %16.14f%%\n",
        dMin * 100, dMax * 100, dMaxStep * 100);
    BOOST_CHECK_MESSAGE(
        dMin < -0.0001013168981059 && dMin > -0.0001013168981060 &&
            dMax > 0.0001166792656485 && dMax < 0.0001166792656486,
        failMsg);
    failMsg = strprintf("Min relError: %16.14f%%\tMax relError: %16.14f%%\n",
                        dRelMin * 100, dRelMax * 100);
    BOOST_CHECK_MESSAGE(
        dRelMin < -0.0001013168981059 && dRelMin > -0.0001013168981060 &&
            dRelMax > 0.0001166792656485 && dRelMax < 0.0001166792656486,
        failMsg);

    // Difficulty increases as long as we produce fast blocks
    for (size_t j = 0; j < 100; i++, j++) {
        uint32_t nextBits;
        arith_uint256 currentTarget;
        currentTarget.SetCompact(nBits);

        blocks[i] = GetBlockIndex(&blocks[i - 1], 500, nBits);
        nextBits = GetNextASERTWorkRequired(&blocks[i], &blkHeaderDummy, params,
                                            &blocks[1]);
        arith_uint256 nextTarget;
        nextTarget.SetCompact(nextBits);

        // Make sure that target is decreased
        BOOST_CHECK(nextTarget <= currentTarget);

        nBits = nextBits;
    }
}

static std::string StrPrintCalcArgs(const arith_uint256 refTarget,
                                    const int64_t targetSpacing,
                                    const int64_t timeDiff,
                                    const int64_t heightDiff,
                                    const arith_uint256 expectedTarget,
                                    const uint32_t expectednBits) {
    return strprintf("\n"
                     "ref=         %s\n"
                     "spacing=     %d\n"
                     "timeDiff=    %d\n"
                     "heightDiff=  %d\n"
                     "expTarget=   %s\n"
                     "exp nBits=   0x%08x\n",
                     refTarget.ToString(), targetSpacing, timeDiff, heightDiff,
                     expectedTarget.ToString(), expectednBits);
}

// Tests of the CalculateASERT function.
BOOST_AUTO_TEST_CASE(calculate_asert_test) {
    DummyConfig config(ChainTypeToString(ChainType::MAIN));
    const Consensus::Params &params = config.GetChainParams().GetConsensus();
    const int64_t nHalfLife = params.nDAAHalfLife;

    const arith_uint256 powLimit = UintToArith256(params.powLimit);
    arith_uint256 initialTarget = powLimit >> 4;
    int64_t height = 0;

    // The CalculateASERT function uses the absolute ASERT formulation
    // and adds +1 to the height difference that it receives.
    // The time difference passed to it must factor in the difference
    // to the *parent* of the reference block.
    // We assume the parent is ideally spaced in time before the reference
    // block.
    static const int64_t parent_time_diff = 600;

    // Steady
    arith_uint256 nextTarget = CalculateASERT(
        initialTarget, params.nPowTargetSpacing,
        parent_time_diff + 600 /* nTimeDiff */, ++height, powLimit, nHalfLife);
    BOOST_CHECK(nextTarget == initialTarget);

    // A block that arrives in half the expected time
    nextTarget = CalculateASERT(initialTarget, params.nPowTargetSpacing,
                                parent_time_diff + 600 + 300, ++height,
                                powLimit, nHalfLife);
    BOOST_CHECK(nextTarget < initialTarget);

    // A block that makes up for the shortfall of the previous one, restores the
    // target to initial
    arith_uint256 prevTarget = nextTarget;
    nextTarget = CalculateASERT(initialTarget, params.nPowTargetSpacing,
                                parent_time_diff + 600 + 300 + 900, ++height,
                                powLimit, nHalfLife);
    BOOST_CHECK(nextTarget > prevTarget);
    BOOST_CHECK(nextTarget == initialTarget);

    // Two days ahead of schedule should double the target (halve the
    // difficulty)
    prevTarget = nextTarget;
    nextTarget =
        CalculateASERT(prevTarget, params.nPowTargetSpacing,
                       parent_time_diff + 288 * 1200, 288, powLimit, nHalfLife);
    BOOST_CHECK(nextTarget == prevTarget * 2);

    // Two days behind schedule should halve the target (double the difficulty)
    prevTarget = nextTarget;
    nextTarget =
        CalculateASERT(prevTarget, params.nPowTargetSpacing,
                       parent_time_diff + 288 * 0, 288, powLimit, nHalfLife);
    BOOST_CHECK(nextTarget == prevTarget / 2);
    BOOST_CHECK(nextTarget == initialTarget);

    // Ramp up from initialTarget to PowLimit - should only take 4 doublings...
    uint32_t powLimit_nBits = powLimit.GetCompact();
    uint32_t next_nBits;
    for (size_t k = 0; k < 3; k++) {
        prevTarget = nextTarget;
        nextTarget = CalculateASERT(prevTarget, params.nPowTargetSpacing,
                                    parent_time_diff + 288 * 1200, 288,
                                    powLimit, nHalfLife);
        BOOST_CHECK(nextTarget == prevTarget * 2);
        BOOST_CHECK(nextTarget < powLimit);
        next_nBits = nextTarget.GetCompact();
        BOOST_CHECK(next_nBits != powLimit_nBits);
    }

    prevTarget = nextTarget;
    nextTarget =
        CalculateASERT(prevTarget, params.nPowTargetSpacing,
                       parent_time_diff + 288 * 1200, 288, powLimit, nHalfLife);
    next_nBits = nextTarget.GetCompact();
    BOOST_CHECK(nextTarget == prevTarget * 2);
    BOOST_CHECK(next_nBits == powLimit_nBits);

    // Fast periods now cannot increase target beyond POW limit, even if we try
    // to overflow nextTarget. prevTarget is a uint256, so 256*2 = 512 days
    // would overflow nextTarget unless CalculateASERT correctly detects this
    // error
    nextTarget = CalculateASERT(prevTarget, params.nPowTargetSpacing,
                                parent_time_diff + 512 * 144 * 600, 0, powLimit,
                                nHalfLife);
    next_nBits = nextTarget.GetCompact();
    BOOST_CHECK(next_nBits == powLimit_nBits);

    // We also need to watch for underflows on nextTarget. We need to withstand
    // an extra ~446 days worth of blocks. This should bring down a powLimit
    // target to the a minimum target of 1.
    nextTarget = CalculateASERT(powLimit, params.nPowTargetSpacing, 0,
                                2 * (256 - 33) * 144, powLimit, nHalfLife);
    next_nBits = nextTarget.GetCompact();
    BOOST_CHECK_EQUAL(next_nBits, arith_uint256(1).GetCompact());

    // Define a structure holding parameters to pass to CalculateASERT.
    // We are going to check some expected results  against a vector of
    // possible arguments.
    struct calc_params {
        arith_uint256 refTarget;
        int64_t targetSpacing;
        int64_t timeDiff;
        int64_t heightDiff;
        arith_uint256 expectedTarget;
        uint32_t expectednBits;
    };

    // Define some named input argument values
    const arith_uint256 SINGLE_300_TARGET{
        "00000000ffb1ffffffffffffffffffffffffffffffffffffffffffffffffffff"};
    const arith_uint256 FUNNY_REF_TARGET{
        "000000008000000000000000000fffffffffffffffffffffffffffffffffffff"};

    // Define our expected input and output values.
    // The timeDiff entries exclude the `parent_time_diff` - this is
    // added in the call to CalculateASERT in the test loop.
    const std::vector<calc_params> calculate_args = {

        /* refTarget, targetSpacing, timeDiff, heightDiff, expectedTarget,
           expectednBits */

        {powLimit, 600, 0, 2 * 144, powLimit >> 1, 0x1c7fffff},
        {powLimit, 600, 0, 4 * 144, powLimit >> 2, 0x1c3fffff},
        {powLimit >> 1, 600, 0, 2 * 144, powLimit >> 2, 0x1c3fffff},
        {powLimit >> 2, 600, 0, 2 * 144, powLimit >> 3, 0x1c1fffff},
        {powLimit >> 3, 600, 0, 2 * 144, powLimit >> 4, 0x1c0fffff},
        {powLimit, 600, 0, 2 * (256 - 34) * 144, 3, 0x01030000},
        {powLimit, 600, 0, 2 * (256 - 34) * 144 + 119, 3, 0x01030000},
        {powLimit, 600, 0, 2 * (256 - 34) * 144 + 120, 2, 0x01020000},
        {powLimit, 600, 0, 2 * (256 - 33) * 144 - 1, 2, 0x01020000},
        // 1 bit less since we do not need to shift to 0
        {powLimit, 600, 0, 2 * (256 - 33) * 144, 1, 0x01010000},
        // more will not decrease below 1
        {powLimit, 600, 0, 2 * (256 - 32) * 144, 1, 0x01010000},
        {1, 600, 0, 2 * (256 - 32) * 144, 1, 0x01010000},
        {powLimit, 600, 2 * (512 - 32) * 144, 0, powLimit, powLimit_nBits},
        {1, 600, (512 - 64) * 144 * 600, 0, powLimit, powLimit_nBits},
        // clamps to powLimit
        {powLimit, 600, 300, 1, SINGLE_300_TARGET, 0x1d00ffb1},
        // confuses any attempt to detect overflow by inspecting result
        {FUNNY_REF_TARGET, 600, 600 * 2 * 33 * 144, 0, powLimit,
         powLimit_nBits},
        // overflow to exactly 2^256
        {1, 600, 600 * 2 * 256 * 144, 0, powLimit, powLimit_nBits},
        // just under powlimit (not clamped) yet over powlimit_nbits
        {1, 600, 600 * 2 * 224 * 144 - 1, 0, arith_uint256(0xffff8) << 204,
         powLimit_nBits},
    };

    for (auto &v : calculate_args) {
        nextTarget = CalculateASERT(v.refTarget, v.targetSpacing,
                                    parent_time_diff + v.timeDiff, v.heightDiff,
                                    powLimit, nHalfLife);
        next_nBits = nextTarget.GetCompact();
        const auto failMsg =
            StrPrintCalcArgs(v.refTarget, v.targetSpacing,
                             parent_time_diff + v.timeDiff, v.heightDiff,
                             v.expectedTarget, v.expectednBits) +
            strprintf("nextTarget=  %s\nnext nBits=  0x%08x\n",
                      nextTarget.ToString(), next_nBits);
        BOOST_CHECK_MESSAGE(nextTarget == v.expectedTarget &&
                                next_nBits == v.expectednBits,
                            failMsg);
    }
}

class ChainParamsWithCustomActivation : public CChainParams {
public:
    ChainParamsWithCustomActivation(const CChainParams &chainParams,
                                    int daaHeight, int axionHeight)
        : CChainParams(chainParams) {
        BOOST_REQUIRE_GT(axionHeight, daaHeight);
        consensus.daaHeight = daaHeight;
        consensus.axionHeight = axionHeight;
    }
};

/**
 * Test transition of cw144 to ASERT algorithm, which involves the selection
 * of an anchor block.
 */
BOOST_AUTO_TEST_CASE(asert_activation_anchor_test) {
    // Make a custom chain params based on mainnet, activating the cw144 DAA
    // at a lower height than usual, so we don't need to waste time making a
    // 504000-long chain.
    const auto mainChainParams =
        CreateChainParams(*m_node.args, ChainType::MAIN);
    const int asertActivationHeight = 4000;
    const ChainParamsWithCustomActivation chainParams(*mainChainParams, 2016,
                                                      asertActivationHeight);
    const Consensus::Params &params = chainParams.GetConsensus();

    CBlockHeader blkHeaderDummy;

    // an arbitrary compact target for our chain (based on BCH chain ~ Aug 10
    // 2020).
    uint32_t initialBits = 0x1802a842;

    // Block store for anonymous blocks; needs to be big enough to fit all
    // generated blocks in this test.
    std::vector<CBlockIndex> blocks(10000);
    int bidx = 1;

    // Genesis block.
    blocks[0].nHeight = 0;
    blocks[0].nTime = 1269211443;
    blocks[0].nBits = initialBits;
    blocks[0].nChainWork = GetBlockProof(blocks[0]);

    // Pile up a random number of blocks to establish some history of random
    // height. cw144 DAA requires us to have height at least 2016, dunno why
    // that much. Keep going up to 145 blocks prior to ASERT activation.
    for (int i = 1; i < asertActivationHeight - 145; i++) {
        BOOST_REQUIRE(bidx < int(blocks.size()));
        blocks[bidx] = GetBlockIndex(&blocks[bidx - 1], 600, initialBits);
        bidx++;
    }
    // Then put down 145 more blocks with 500 second solvetime each, such that
    // the final block is the one prior to activation.
    for (int i = 0; i < 145; i++) {
        BOOST_REQUIRE(bidx < int(blocks.size()));
        blocks[bidx] = GetBlockIndex(&blocks[bidx - 1], 500, initialBits);
        bidx++;
    }
    CBlockIndex *pindexPreActivation = &blocks[bidx - 1];
    BOOST_CHECK_EQUAL(pindexPreActivation->nHeight, asertActivationHeight - 1);
    BOOST_CHECK(IsDAAEnabled(params, pindexPreActivation));

    // If we consult DAA, then it uses cw144 which returns a significantly lower
    // target because we have been mining too fast by a ratio 600/500 for a
    // whole day.
    BOOST_CHECK(!IsAxionEnabled(params, pindexPreActivation));
    BOOST_CHECK_EQUAL(
        GetNextWorkRequired(pindexPreActivation, &blkHeaderDummy, chainParams),
        0x180236e1);

    /**
     * Now we'll try adding on blocks to activate ASERT. The activation block
     * is going to be our anchor block. We will make several distinct anchor
     * blocks.
     */

    // Create an activating block with expected solvetime, taking the cw144
    // difficulty we just saw. Since solvetime is expected the next target is
    // unchanged.
    CBlockIndex indexActivation0 =
        GetBlockIndex(pindexPreActivation, 600, 0x180236e1);
    BOOST_CHECK(IsAxionEnabled(params, &indexActivation0));
    BOOST_CHECK_EQUAL(
        GetNextWorkRequired(&indexActivation0, &blkHeaderDummy, chainParams),
        0x180236e1);
    BOOST_CHECK_EQUAL(
        GetNextWorkRequired(&indexActivation0, &blkHeaderDummy, chainParams),
        0x180236e1);

    // Now we'll generate some more activations/anchors, using unique targets
    // for each one (if the algo gets confused between different anchors, we
    // will know).

    // Create an activating block with 0 solvetime, which will drop target by
    // ~415/416.
    CBlockIndex indexActivation1 =
        GetBlockIndex(pindexPreActivation, 0, 0x18023456);
    BOOST_CHECK(IsAxionEnabled(params, &indexActivation1));
    // cache will be stale here, and we should get the right result regardless:
    BOOST_CHECK_EQUAL(
        GetNextWorkRequired(&indexActivation1, &blkHeaderDummy, chainParams),
        0x180232fd);
    BOOST_CHECK_EQUAL(
        GetNextWorkRequired(&indexActivation1, &blkHeaderDummy, chainParams),
        0x180232fd);
    BOOST_CHECK_EQUAL(
        GetNextWorkRequired(&indexActivation1, &blkHeaderDummy, chainParams),
        0x180232fd);

    // Try activation with expected solvetime, which will keep target the same.
    uint32_t anchorBits2 = 0x180210fe;
    CBlockIndex indexActivation2 =
        GetBlockIndex(pindexPreActivation, 600, anchorBits2);
    BOOST_CHECK(IsAxionEnabled(params, &indexActivation2));
    BOOST_CHECK_EQUAL(
        GetNextWorkRequired(&indexActivation2, &blkHeaderDummy, chainParams),
        anchorBits2);

    // Try a three-month solvetime which will cause us to hit powLimit.
    uint32_t anchorBits3 = 0x18034567;
    CBlockIndex indexActivation3 =
        GetBlockIndex(pindexPreActivation, 86400 * 90, anchorBits3);
    BOOST_CHECK(IsAxionEnabled(params, &indexActivation2));
    BOOST_CHECK_EQUAL(
        GetNextWorkRequired(&indexActivation3, &blkHeaderDummy, chainParams),
        0x1d00ffff);
    // If the next block jumps back in time, we get back our original difficulty
    // level.
    CBlockIndex indexActivation3_return =
        GetBlockIndex(&indexActivation3, -86400 * 90 + 2 * 600, anchorBits3);
    BOOST_CHECK_EQUAL(GetNextWorkRequired(&indexActivation3_return,
                                          &blkHeaderDummy, chainParams),
                      anchorBits3);
    // Retry for cache
    BOOST_CHECK_EQUAL(GetNextWorkRequired(&indexActivation3_return,
                                          &blkHeaderDummy, chainParams),
                      anchorBits3);

    // Make an activation with MTP == activation exactly. This is a backwards
    // timestamp jump so the resulting target is 1.2% lower.
    CBlockIndex indexActivation4 =
        GetBlockIndex(pindexPreActivation, 0, 0x18011111);
    indexActivation4.nTime = pindexPreActivation->GetMedianTimePast();
    BOOST_CHECK(IsAxionEnabled(params, &indexActivation4));
    BOOST_CHECK_EQUAL(
        GetNextWorkRequired(&indexActivation4, &blkHeaderDummy, chainParams),
        0x18010db3);

    // Finally create a random chain on top of our second activation, using
    // ASERT targets all the way. Erase cache so that this will do a fresh
    // search for anchor at every step (fortauntely this is not too slow, due to
    // the skiplist traversal)
    CBlockIndex *pindexChain2 = &indexActivation2;
    for (int i = 1; i < 1000; i++) {
        BOOST_REQUIRE(bidx < int(blocks.size()));
        uint32_t nextBits =
            GetNextWorkRequired(pindexChain2, &blkHeaderDummy, chainParams);
        blocks[bidx] =
            GetBlockIndex(pindexChain2, m_rng.randrange(1200), nextBits);
        pindexChain2 = &blocks[bidx++];
    }
    // Scan back down to make sure all targets are same when we keep cached
    // anchor.
    for (CBlockIndex *pindex = pindexChain2; pindex != &indexActivation2;
         pindex = pindex->pprev) {
        uint32_t nextBits =
            GetNextWorkRequired(pindex->pprev, &blkHeaderDummy, chainParams);
        BOOST_CHECK_EQUAL(nextBits, pindex->nBits);
    }
}

BOOST_AUTO_TEST_SUITE_END()
