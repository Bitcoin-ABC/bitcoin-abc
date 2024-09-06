// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <policy/block/rtt.h>

#include <arith_uint256.h>
#include <chainparams.h>
#include <util/time.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(rtt_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(get_next_rtt_work_required) {
    const Consensus::Params &consensusParams = Params().GetConsensus();

    int64_t now = GetTime();
    SetMockTime(now);

    arith_uint256 prevWork = UintToArith256(consensusParams.powLimit) >> 10;
    uint32_t prevNBits = prevWork.GetCompact();

    // No RTT applied if the previous block was read from disk.
    int64_t prevHeaderReceivedTime = 0;
    BOOST_CHECK(!GetNextRTTWorkRequired(prevNBits, prevHeaderReceivedTime, now,
                                        consensusParams));

    // Zero time diff
    prevHeaderReceivedTime = now;
    auto workZeroTimeDiff = GetNextRTTWorkRequired(
        prevNBits, prevHeaderReceivedTime, now, consensusParams);
    BOOST_CHECK(workZeroTimeDiff.has_value());

    // Negative time diff
    auto workNegTimeDiff = GetNextRTTWorkRequired(
        prevNBits, prevHeaderReceivedTime, now - 100, consensusParams);
    BOOST_CHECK(workNegTimeDiff.has_value());

    // 1s time diff
    auto workOneSecTimeDiff = GetNextRTTWorkRequired(
        prevNBits, prevHeaderReceivedTime, now + 1, consensusParams);
    BOOST_CHECK(workOneSecTimeDiff.has_value());

    // All the work bits should be equal because <= 0 time difference is clamped
    // to 1 second
    BOOST_CHECK(*workZeroTimeDiff == *workNegTimeDiff);
    BOOST_CHECK(*workZeroTimeDiff == *workOneSecTimeDiff);

    // The RTT target is less (more difficult) than the DAA one
    BOOST_CHECK(*workZeroTimeDiff <= prevWork);

    // From there each second elapsed the RTT target will increase (lowering the
    // mining difficulty)
    auto prevRttWork = *workZeroTimeDiff;
    for (int64_t t = 2; t < 3600; t++) {
        auto nextWork = GetNextRTTWorkRequired(
            prevNBits, prevHeaderReceivedTime, now + t, consensusParams);
        BOOST_CHECK(nextWork.has_value());

        // We get the same RTT output by offseting the current timestamp far in
        // the future
        for (int64_t offset : {183 * 24 * 60 * 60, 366 * 24 * 60 * 60,
                               10 * 366 * 24 * 60 * 60}) {
            int64_t futureHeaderTimeReceived = now + offset;
            BOOST_CHECK(*nextWork == *GetNextRTTWorkRequired(
                                         prevNBits, futureHeaderTimeReceived,
                                         now + offset + t, consensusParams));
        }

        BOOST_CHECK(prevRttWork < *nextWork);
        prevRttWork = *nextWork;
    }

    // The RTT can never be less difficult than the pow limit.
    prevWork = UintToArith256(consensusParams.powLimit);
    prevNBits = prevWork.GetCompact();
    // Initially it's higher difficulty than the pow limit.
    // The 430s/431s values are specific to RTT_K=4.
    for (int64_t t : {-1, 0, 1, 10, 100, 430}) {
        auto minWork = GetNextRTTWorkRequired(prevNBits, prevHeaderReceivedTime,
                                              now + t, consensusParams);
        BOOST_CHECK(minWork.has_value());
        BOOST_CHECK(*minWork < prevWork);
    }
    // Then the RTT computation returns nullopt as the value would be lower
    // difficulty than the pow limit
    for (int64_t t : {431, 600, 1000, 3600, 24 * 60 * 60, 365 * 24 * 60 * 60}) {
        auto minWork = GetNextRTTWorkRequired(prevNBits, prevHeaderReceivedTime,
                                              now + t, consensusParams);
        BOOST_CHECK(!minWork.has_value());
    }
}

BOOST_AUTO_TEST_SUITE_END()
