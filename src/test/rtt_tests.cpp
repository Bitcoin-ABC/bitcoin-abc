// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <policy/block/rtt.h>

#include <arith_uint256.h>
#include <avalanche/processor.h>
#include <blockindex.h>
#include <chainparams.h>
#include <common/args.h>
#include <consensus/activation.h>
#include <pow/pow.h>
#include <random.h>
#include <util/check.h>
#include <util/time.h>
#include <validation.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(rtt_tests, BasicTestingSetup)

struct RTTShibusawaTestingSetup : public BasicTestingSetup {
    RTTShibusawaTestingSetup() : BasicTestingSetup() {
        ArgsManager &argsman = *Assert(m_node.args);
        argsman.ForceSetArg("-shibusawaactivationtime", "0");
    }

    ~RTTShibusawaTestingSetup() {
        ArgsManager &argsman = *Assert(m_node.args);
        argsman.ClearForcedArg("-shibusawaactivationtime");
    }
};

void check_GeNextRTTWorkRequired(bool expectedShibusawa) {
    const Consensus::Params &consensusParams = Params().GetConsensus();

    int64_t now = GetTime();
    SetMockTime(now);

    arith_uint256 prevWork = UintToArith256(consensusParams.powLimit) >> 10;

    std::vector<CBlockIndex> blocks(18);
    CBlockIndex *lastBlock = &blocks[0];
    for (auto &block : blocks) {
        // Far enough in the past that they don't impact RTT computation
        block.nTimeReceived = now - 18000;
        lastBlock->pprev = &block;
        lastBlock = &block;
    }
    blocks[0].nBits = prevWork.GetCompact();

    const bool fShibusawa = IsShibusawaEnabled(consensusParams, &blocks[0]);
    BOOST_CHECK_EQUAL(fShibusawa, expectedShibusawa);
    if (fShibusawa) {
        BOOST_CHECK(GetRTTFactorIndices(consensusParams, &blocks[0]) ==
                    std::vector<size_t>({1, 2, 5, 11, 17}));
    } else {
        BOOST_CHECK(GetRTTFactorIndices(consensusParams, &blocks[0]) ==
                    std::vector<size_t>({2, 5, 11, 17}));
    }

    // No RTT applied if any of the previous block was read from disk.
    for (size_t i = 1; i < 18; i++) {
        int64_t prevTime = blocks[i].nTimeReceived;
        blocks[i].nTimeReceived = 0;

        BOOST_CHECK(!GetNextRTTWorkRequired(&blocks[1], now, consensusParams));

        blocks[i].nTimeReceived = prevTime;
    }

    // Zero time diff
    blocks[0].nTimeReceived = now;
    blocks[0].pprev->nTimeReceived = now;
    auto workZeroTimeDiff =
        GetNextRTTWorkRequired(&blocks[0], now, consensusParams);
    BOOST_CHECK(workZeroTimeDiff.has_value());
    // Negative time diff
    auto workNegTimeDiff =
        GetNextRTTWorkRequired(&blocks[0], now - 100, consensusParams);
    BOOST_CHECK(workNegTimeDiff.has_value());

    // 1s time diff
    auto workOneSecTimeDiff =
        GetNextRTTWorkRequired(&blocks[0], now + 1, consensusParams);
    BOOST_CHECK(workOneSecTimeDiff.has_value());

    auto target_lt = [](uint32_t lhs, uint32_t rhs) {
        arith_uint256 lhs256;
        lhs256.SetCompact(lhs);

        arith_uint256 rhs256;
        rhs256.SetCompact(rhs);

        return lhs256 < rhs256;
    };

    // All the work bits should be equal because <= 0 time difference is clamped
    // to 1 second
    BOOST_CHECK(*workZeroTimeDiff == *workNegTimeDiff);
    BOOST_CHECK(*workZeroTimeDiff == *workOneSecTimeDiff);
    // The RTT target is less (more difficult) than the DAA one
    BOOST_CHECK(target_lt(*workZeroTimeDiff, prevWork.GetCompact()));

    if (fShibusawa) {
        // Before Shibusawa upgrade, RTT is computed starting with indice 2 so
        // we assign the same received time for pprev.
        // After Shibusawa we want the first factor at indice one to be the
        // limiting (and only accounted) factor in the test so we move the pprev
        // receive time in the past.
        blocks[0].pprev->nTimeReceived = now - 18000;
    }

    // From there each second elapsed the RTT target will increase (lowering the
    // mining difficulty)
    auto prevRttWork = *workZeroTimeDiff;
    for (int64_t t = 2; t < 3600; t++) {
        auto nextWork =
            GetNextRTTWorkRequired(&blocks[0], now + t, consensusParams);
        BOOST_CHECK(nextWork.has_value());

        // We get the same RTT output by offseting the current timestamp far in
        // the future
        for (int64_t offset : {183 * 24 * 60 * 60, 366 * 24 * 60 * 60,
                               10 * 366 * 24 * 60 * 60}) {
            for (auto &block : blocks) {
                block.nTimeReceived = now - 18000 + offset;
            }
            blocks[0].nTimeReceived = now + offset;
            if (!fShibusawa) {
                // See above for rationale
                blocks[0].pprev->nTimeReceived = now + offset;
            }
            BOOST_CHECK(*nextWork == *GetNextRTTWorkRequired(&blocks[0],
                                                             now + offset + t,
                                                             consensusParams));
        }

        BOOST_CHECK(target_lt(prevRttWork, *nextWork));
        prevRttWork = *nextWork;

        for (auto &block : blocks) {
            block.nTimeReceived = now - 18000;
        }
        blocks[0].nTimeReceived = now;
        if (!fShibusawa) {
            // See above for rationale
            blocks[0].pprev->nTimeReceived = now;
        }
    }

    // The RTT can never be less difficult than the pow limit.
    prevWork = UintToArith256(consensusParams.powLimit);
    blocks[0].nBits = prevWork.GetCompact();
    // Initially it's higher difficulty than the pow limit.
    // The 114s/115s and 458s/459s values are specific to RTT_K=6.
    for (int64_t t : {-1, 0, 1, 10, 100, fShibusawa ? 114 : 458}) {
        auto minWork =
            GetNextRTTWorkRequired(&blocks[0], now + t, consensusParams);
        BOOST_CHECK(minWork.has_value());
        BOOST_CHECK(target_lt(*minWork, prevWork.GetCompact()));
    }
    // Then the RTT computation returns nullopt as the value would be lower
    // difficulty than the pow limit
    for (int64_t t : {fShibusawa ? 115 : 459, 600, 1000, 3600, 24 * 60 * 60,
                      365 * 24 * 60 * 60}) {
        auto minWork =
            GetNextRTTWorkRequired(&blocks[0], now + t, consensusParams);
        BOOST_CHECK(!minWork.has_value());
    }

    prevWork = UintToArith256(consensusParams.powLimit) >> 10;
    blocks[0].nBits = prevWork.GetCompact();

    auto getNextWorkForPastDifftimes =
        [&](const std::vector<int64_t> &difftimes) {
            int64_t cumulatedDifftime = 0;
            for (size_t i = 0; i < difftimes.size(); i++) {
                cumulatedDifftime += difftimes[i];
                // Far enough in the past that they don't impact RTT computation
                blocks[i].nTimeReceived = now - cumulatedDifftime;
            }

            return GetNextRTTWorkRequired(&blocks[0], now, consensusParams);
        };

    // Evently spaced blocks, 10 minutes between each
    auto nextWork = getNextWorkForPastDifftimes({600, 600, 600, 600, 600, 600,
                                                 600, 600, 600, 600, 600, 600,
                                                 600, 600, 600, 600, 600});
    BOOST_CHECK(nextWork.has_value());
    // RTT is higher (lower difficulty) than DAA in this case
    BOOST_CHECK(target_lt(prevWork.GetCompact(), *nextWork));

    if (fShibusawa) {
        // Blocks too close over the last 1 block window (average < 0.25x
        // expected spacing). For RTT_K = 6, the DAA crossing point happens at
        // 115s.
        nextWork = getNextWorkForPastDifftimes({114, 600, 600, 600, 600, 600,
                                                600, 600, 600, 600, 600, 600,
                                                600, 600, 600, 600, 600});
        BOOST_CHECK(nextWork.has_value());
        // RTT is lower (higher difficulty) than DAA in this case
        BOOST_CHECK(target_lt(*nextWork, prevWork.GetCompact()));
        nextWork = getNextWorkForPastDifftimes({115, 600, 600, 600, 600, 600,
                                                600, 600, 600, 600, 600, 600,
                                                600, 600, 600, 600, 600});
        BOOST_CHECK(nextWork.has_value());
        // RTT is higher (lower difficulty) than DAA in this case
        BOOST_CHECK(target_lt(prevWork.GetCompact(), *nextWork));
    }

    // Blocks too close over the last 2 blocks window (average < 1x expected
    // spacing). For RTT_K = 6, the DAA crossing point happens at 459s.
    nextWork =
        getNextWorkForPastDifftimes({458, 0, 600, 600, 600, 600, 600, 600, 600,
                                     600, 600, 600, 600, 600, 600, 600, 600});
    BOOST_CHECK(nextWork.has_value());
    // RTT is lower (higher difficulty) than DAA in this case
    BOOST_CHECK(target_lt(*nextWork, prevWork.GetCompact()));
    nextWork =
        getNextWorkForPastDifftimes({459, 0, 600, 600, 600, 600, 600, 600, 600,
                                     600, 600, 600, 600, 600, 600, 600, 600});
    BOOST_CHECK(nextWork.has_value());
    // RTT is higher (lower difficulty) than DAA in this case
    BOOST_CHECK(target_lt(prevWork.GetCompact(), *nextWork));

    // Blocks too close over the last 5 blocks window (average < 4x expected
    // spacing). For RTT_K = 6, the DAA crossing point happens at 1836.
    nextWork =
        getNextWorkForPastDifftimes({600, 600, 600, 35, 0, 600, 600, 600, 600,
                                     600, 600, 600, 600, 600, 600, 600, 600});
    BOOST_CHECK(nextWork.has_value());
    // RTT is lower (higher difficulty) than DAA in this case
    BOOST_CHECK(target_lt(*nextWork, prevWork.GetCompact()));
    nextWork =
        getNextWorkForPastDifftimes({600, 600, 600, 36, 0, 600, 600, 600, 600,
                                     600, 600, 600, 600, 600, 600, 600, 600});
    BOOST_CHECK(nextWork.has_value());
    // RTT is higher (lower difficulty) than DAA in this case
    BOOST_CHECK(target_lt(prevWork.GetCompact(), *nextWork));

    // Blocks too close over the last 11 blocks window (average < 10x expected
    // spacing). For RTT_K = 6, the DAA crossing point happens at 4588.
    nextWork =
        getNextWorkForPastDifftimes({600, 600, 600, 600, 600, 600, 600, 387, 0,
                                     0, 0, 600, 600, 600, 600, 600, 600});
    BOOST_CHECK(nextWork.has_value());
    // RTT is lower (higher difficulty) than DAA in this case
    BOOST_CHECK(target_lt(*nextWork, prevWork.GetCompact()));
    nextWork =
        getNextWorkForPastDifftimes({600, 600, 600, 600, 600, 600, 600, 388, 0,
                                     0, 0, 600, 600, 600, 600, 600, 600});
    BOOST_CHECK(nextWork.has_value());
    // RTT is higher (lower difficulty) than DAA in this case
    BOOST_CHECK(target_lt(prevWork.GetCompact(), *nextWork));

    // Blocks too close over the last 17 blocks window (average < 16x expected
    // spacing). For RTT_K = 6, the DAA crossing point happens at 7341.
    nextWork =
        getNextWorkForPastDifftimes({600, 600, 600, 600, 600, 600, 600, 600,
                                     600, 600, 600, 600, 140, 0, 0, 0, 0});
    BOOST_CHECK(nextWork.has_value());
    // RTT is lower (higher difficulty) than DAA in this case
    BOOST_CHECK(target_lt(*nextWork, prevWork.GetCompact()));
    nextWork =
        getNextWorkForPastDifftimes({600, 600, 600, 600, 600, 600, 600, 600,
                                     600, 600, 600, 600, 141, 0, 0, 0, 0});
    BOOST_CHECK(nextWork.has_value());
    // RTT is higher (lower difficulty) than DAA in this case
    BOOST_CHECK(target_lt(prevWork.GetCompact(), *nextWork));

    // All blocks 1 minute too early:
    //  - 1 * 540s = 540s is acceptable for the 1 block window
    //  - 2 * 540s = 1080s is acceptable for the 2 blocks window
    //  - 5 * 540s = 2700s is acceptable for the 5 blocks window
    //  - 11 * 540s = 5940s is acceptable for the 11 blocks window
    //  - 17 * 540s = 9181s is acceptable for the 17 blocks window
    nextWork = getNextWorkForPastDifftimes({540, 540, 540, 540, 540, 540, 540,
                                            540, 540, 540, 540, 540, 540, 540,
                                            540, 540, 540});
    BOOST_CHECK(nextWork.has_value());
    // RTT is higher (lower difficulty) than DAA in this case
    BOOST_CHECK(target_lt(prevWork.GetCompact(), *nextWork));

    // All blocks 2 minute too early:
    //  - 1 * 480s = 480s is acceptable for the 1 block window
    //  - 2 * 480s = 960s is acceptable for the 2 blocks window
    //  - 5 * 480s = 2400s is acceptable for the 5 blocks window
    //  - 11 * 480s = 5280s is acceptable for the 11 blocks window
    //  - 17 * 480s = 8160s is acceptable for the 17 blocks window
    nextWork = getNextWorkForPastDifftimes({480, 480, 480, 480, 480, 480, 480,
                                            480, 480, 480, 480, 480, 480, 480,
                                            480, 480, 480});
    BOOST_CHECK(nextWork.has_value());
    // RTT is higher (lower difficulty) than DAA in this case
    BOOST_CHECK(target_lt(prevWork.GetCompact(), *nextWork));

    // All blocks 3 minute too early:
    //  - 1 * 420s = 420s is acceptable for the 1 block window
    //  - 2 * 420s = 840s is acceptable for the 2 blocks window
    //  - 5 * 420s = 2100s is acceptable for the 5 blocks window
    //  - 11 * 420s = 4620s is barely acceptable for the 11 blocks window
    //  - 17 * 420s = 7140s is NOT acceptable for the 17 blocks window
    nextWork = getNextWorkForPastDifftimes({420, 420, 420, 420, 420, 420, 420,
                                            420, 420, 420, 420, 420, 420, 420,
                                            420, 420, 420});
    BOOST_CHECK(nextWork.has_value());
    // RTT is lower (higher difficulty) than DAA in this case
    BOOST_CHECK(target_lt(*nextWork, prevWork.GetCompact()));

    // With RTT_K=6 the 17 blocks window crossing point with DAA happens after
    // 7341s. This means that the difficulty will decrease and cross that mark
    // after 7341s - 7140s = 201s.
    for (int64_t t = 1; t < 201; t++) {
        auto lastWork = *nextWork;
        nextWork = GetNextRTTWorkRequired(&blocks[0], now + t, consensusParams);
        BOOST_CHECK(nextWork.has_value());
        // RTT is lower (higher difficulty) than DAA in this case
        BOOST_CHECK(target_lt(*nextWork, prevWork.GetCompact()));
        // The difficulty decreases, i.e. the target increaes
        BOOST_CHECK(target_lt(lastWork, *nextWork));
    }

    // Then the difficulty keeps decreasing but DAA would be the limiting value
    for (int64_t t = 201; t < 300; t++) {
        auto lastWork = *nextWork;
        nextWork = GetNextRTTWorkRequired(&blocks[0], now + t, consensusParams);
        BOOST_CHECK(nextWork.has_value());
        // RTT is higher (lower difficulty) than DAA in this case
        BOOST_CHECK(target_lt(prevWork.GetCompact(), *nextWork));
        // The difficulty decreases, i.e. the target increaes
        BOOST_CHECK(target_lt(lastWork, *nextWork));
    }
}

BOOST_FIXTURE_TEST_CASE(check_rtt_next_work_required, BasicTestingSetup) {
    check_GeNextRTTWorkRequired(false);
}

BOOST_FIXTURE_TEST_CASE(check_rtt_next_work_required_shibusawa,
                        RTTShibusawaTestingSetup) {
    check_GeNextRTTWorkRequired(true);
}

BOOST_AUTO_TEST_CASE(rtt_policy) {
    const Consensus::Params &consensusParams = Params().GetConsensus();

    auto checkRTTPolicy = [&](const CBlockIndex &blockIndex, bool expected) {
        BlockPolicyValidationState state;
        BOOST_CHECK_EQUAL(RTTPolicy(consensusParams, blockIndex)(state),
                          expected);
        BOOST_CHECK_EQUAL(state.IsValid(), expected);
        if (!expected) {
            BOOST_CHECK_EQUAL(state.GetRejectReason(), "policy-bad-rtt");
        }
    };

    int64_t now = GetTime();
    SetMockTime(now);

    arith_uint256 prevWork = UintToArith256(consensusParams.powLimit) >> 10;
    std::vector<CBlockIndex> blocks(18);
    CBlockIndex *lastBlock = &blocks[0];
    for (auto &block : blocks) {
        block.nTimeReceived = now - 18000;
        block.nTime = now - 100000;
        lastBlock->pprev = &block;
        lastBlock = &block;
    }

    blocks[1].nBits = prevWork.GetCompact();
    BlockHash hash{ArithToUint256(prevWork)};
    blocks[0].phashBlock = &hash;

    gArgs.ForceSetArg("-enablertt", "1");

    // Diff time is 200s, same hash as before won't cut it as RTT is increasing
    // the difficulty.
    blocks[0].nTimeReceived = now;
    blocks[1].nTimeReceived = now - 200;
    blocks[2].nTimeReceived = now - 200;
    checkRTTPolicy(blocks[0], false);

    // Policy is disabled
    gArgs.ForceSetArg("-enablertt", "0");
    checkRTTPolicy(blocks[0], true);

    gArgs.ForceSetArg("-enablertt", "1");
    checkRTTPolicy(blocks[0], false);

    // Prev block index is null, the policy doesn't apply
    for (size_t i = 0; i < 17; i++) {
        blocks[i].pprev = nullptr;
        checkRTTPolicy(blocks[0], true);

        blocks[i].pprev = &blocks[i + 1];
        checkRTTPolicy(blocks[0], false);
    }

    // Hash is low enough
    hash = BlockHash(
        ArithToUint256(UintToArith256(consensusParams.powLimit) >> 20));
    checkRTTPolicy(blocks[0], true);

    hash = BlockHash{ArithToUint256(prevWork)};
    checkRTTPolicy(blocks[0], false);

    // Difftime is large enough, same hash as previous block is acceptable.
    // Since blocks[2] difftime is 200s and the EDA crossing point happens after
    // 459s with RTT_K = 6, moving time by >= 259s while keeping the same hash
    // as the previous block should be accepted.
    for (int64_t t : {259, 600, 1000, 3600, 24 * 60 * 60, 365 * 24 * 60 * 60}) {
        blocks[0].nTimeReceived = now + t;
        checkRTTPolicy(blocks[0], true);
    }

    for (int64_t t : {-1, 0, 1, 10, 100, 258}) {
        blocks[0].nTimeReceived = now + t;
        checkRTTPolicy(blocks[0], false);
    }

    gArgs.ClearForcedArg("-enablertt");
}

BOOST_AUTO_TEST_SUITE_END()
