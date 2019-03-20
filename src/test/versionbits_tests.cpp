// Copyright (c) 2014-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "chain.h"
#include "chainparams.h"
#include "consensus/params.h"
#include "test/test_bitcoin.h"
#include "validation.h"
#include "versionbits.h"

#include <boost/test/unit_test.hpp>

/* Define a virtual block time, one block per 10 minutes after Nov 14 2014,
 * 0:55:36am */
int32_t TestTime(int nHeight) {
    return 1415926536 + 600 * nHeight;
}

static const Consensus::Params paramsDummy = Consensus::Params();

class TestConditionChecker : public AbstractThresholdConditionChecker {
private:
    mutable ThresholdConditionCache cache;

public:
    int64_t BeginTime(const Consensus::Params &params) const override {
        return TestTime(10000);
    }
    int64_t EndTime(const Consensus::Params &params) const override {
        return TestTime(20000);
    }
    int Period(const Consensus::Params &params) const override { return 1000; }
    int Threshold(const Consensus::Params &params) const override {
        return 900;
    }
    bool Condition(const CBlockIndex *pindex,
                   const Consensus::Params &params) const override {
        return (pindex->nVersion & 0x100);
    }

    ThresholdState GetStateFor(const CBlockIndex *pindexPrev) const {
        return AbstractThresholdConditionChecker::GetStateFor(
            pindexPrev, paramsDummy, cache);
    }
    int GetStateSinceHeightFor(const CBlockIndex *pindexPrev) const {
        return AbstractThresholdConditionChecker::GetStateSinceHeightFor(
            pindexPrev, paramsDummy, cache);
    }
};

#define CHECKERS 6

class VersionBitsTester {
    // A fake blockchain
    std::vector<CBlockIndex *> vpblock;

    // 6 independent checkers for the same bit.
    // The first one performs all checks, the second only 50%, the third only
    // 25%, etc...
    // This is to test whether lack of cached information leads to the same
    // results.
    TestConditionChecker checker[CHECKERS];

    // Test counter (to identify failures)
    int num;

public:
    VersionBitsTester() : num(0) {}

    VersionBitsTester &Reset() {
        for (unsigned int i = 0; i < vpblock.size(); i++) {
            delete vpblock[i];
        }
        for (unsigned int i = 0; i < CHECKERS; i++) {
            checker[i] = TestConditionChecker();
        }
        vpblock.clear();
        return *this;
    }

    ~VersionBitsTester() { Reset(); }

    VersionBitsTester &Mine(unsigned int height, int32_t nTime,
                            int32_t nVersion) {
        while (vpblock.size() < height) {
            CBlockIndex *pindex = new CBlockIndex();
            pindex->nHeight = vpblock.size();
            pindex->pprev = vpblock.size() > 0 ? vpblock.back() : nullptr;
            pindex->nTime = nTime;
            pindex->nVersion = nVersion;
            pindex->BuildSkip();
            vpblock.push_back(pindex);
        }
        return *this;
    }

    VersionBitsTester &TestStateSinceHeight(int height) {
        for (int i = 0; i < CHECKERS; i++) {
            if (InsecureRandBits(i) == 0) {
                BOOST_CHECK_MESSAGE(
                    checker[i].GetStateSinceHeightFor(
                        vpblock.empty() ? nullptr : vpblock.back()) == height,
                    strprintf("Test %i for StateSinceHeight", num));
            }
        }
        num++;
        return *this;
    }

    VersionBitsTester &TestDefined() {
        for (int i = 0; i < CHECKERS; i++) {
            if (InsecureRandBits(i) == 0) {
                BOOST_CHECK_MESSAGE(
                    checker[i].GetStateFor(vpblock.empty() ? nullptr
                                                           : vpblock.back()) ==
                        ThresholdState::DEFINED,
                    strprintf("Test %i for DEFINED", num));
            }
        }
        num++;
        return *this;
    }

    VersionBitsTester &TestStarted() {
        for (int i = 0; i < CHECKERS; i++) {
            if (InsecureRandBits(i) == 0) {
                BOOST_CHECK_MESSAGE(
                    checker[i].GetStateFor(vpblock.empty() ? nullptr
                                                           : vpblock.back()) ==
                        ThresholdState::STARTED,
                    strprintf("Test %i for STARTED", num));
            }
        }
        num++;
        return *this;
    }

    VersionBitsTester &TestLockedIn() {
        for (int i = 0; i < CHECKERS; i++) {
            if (InsecureRandBits(i) == 0) {
                BOOST_CHECK_MESSAGE(
                    checker[i].GetStateFor(vpblock.empty() ? nullptr
                                                           : vpblock.back()) ==
                        ThresholdState::LOCKED_IN,
                    strprintf("Test %i for LOCKED_IN", num));
            }
        }
        num++;
        return *this;
    }

    VersionBitsTester &TestActive() {
        for (int i = 0; i < CHECKERS; i++) {
            if (InsecureRandBits(i) == 0) {
                BOOST_CHECK_MESSAGE(
                    checker[i].GetStateFor(vpblock.empty() ? nullptr
                                                           : vpblock.back()) ==
                        ThresholdState::ACTIVE,
                    strprintf("Test %i for ACTIVE", num));
            }
        }
        num++;
        return *this;
    }

    VersionBitsTester &TestFailed() {
        for (int i = 0; i < CHECKERS; i++) {
            if (InsecureRandBits(i) == 0) {
                BOOST_CHECK_MESSAGE(
                    checker[i].GetStateFor(vpblock.empty() ? nullptr
                                                           : vpblock.back()) ==
                        ThresholdState::FAILED,
                    strprintf("Test %i for FAILED", num));
            }
        }
        num++;
        return *this;
    }

    CBlockIndex *Tip() { return vpblock.size() ? vpblock.back() : nullptr; }
};

BOOST_FIXTURE_TEST_SUITE(versionbits_tests, TestingSetup)

BOOST_AUTO_TEST_CASE(versionbits_test) {
    for (int i = 0; i < 64; i++) {
        // DEFINED -> FAILED
        VersionBitsTester()
            .TestDefined()
            .TestStateSinceHeight(0)
            .Mine(1, TestTime(1), 0x100)
            .TestDefined()
            .TestStateSinceHeight(0)
            .Mine(11, TestTime(11), 0x100)
            .TestDefined()
            .TestStateSinceHeight(0)
            .Mine(989, TestTime(989), 0x100)
            .TestDefined()
            .TestStateSinceHeight(0)
            .Mine(999, TestTime(20000), 0x100)
            .TestDefined()
            .TestStateSinceHeight(0)
            .Mine(1000, TestTime(20000), 0x100)
            .TestFailed()
            .TestStateSinceHeight(1000)
            .Mine(1999, TestTime(30001), 0x100)
            .TestFailed()
            .TestStateSinceHeight(1000)
            .Mine(2000, TestTime(30002), 0x100)
            .TestFailed()
            .TestStateSinceHeight(1000)
            .Mine(2001, TestTime(30003), 0x100)
            .TestFailed()
            .TestStateSinceHeight(1000)
            .Mine(2999, TestTime(30004), 0x100)
            .TestFailed()
            .TestStateSinceHeight(1000)
            .Mine(3000, TestTime(30005), 0x100)
            .TestFailed()
            .TestStateSinceHeight(1000)

            // DEFINED -> STARTED -> FAILED
            .Reset()
            .TestDefined()
            .TestStateSinceHeight(0)
            .Mine(1, TestTime(1), 0)
            .TestDefined()
            .TestStateSinceHeight(0)
            .Mine(1000, TestTime(10000) - 1, 0x100)
            .TestDefined()
            // One second more and it would be defined
            .TestStateSinceHeight(0)
            .Mine(2000, TestTime(10000), 0x100)
            .TestStarted()
            // So that's what happens the next period
            .TestStateSinceHeight(2000)
            .Mine(2051, TestTime(10010), 0)
            .TestStarted()
            // 51 old blocks
            .TestStateSinceHeight(2000)
            .Mine(2950, TestTime(10020), 0x100)
            .TestStarted()
            // 899 new blocks
            .TestStateSinceHeight(2000)
            .Mine(3000, TestTime(20000), 0)
            .TestFailed()
            // 50 old blocks (so 899 out of the past 1000)
            .TestStateSinceHeight(3000)
            .Mine(4000, TestTime(20010), 0x100)
            .TestFailed()
            .TestStateSinceHeight(3000)

            // DEFINED -> STARTED -> FAILED while threshold reached
            .Reset()
            .TestDefined()
            .TestStateSinceHeight(0)
            .Mine(1, TestTime(1), 0)
            .TestDefined()
            .TestStateSinceHeight(0)
            .Mine(1000, TestTime(10000) - 1, 0x101)
            .TestDefined()
            // One second more and it would be defined
            .TestStateSinceHeight(0)
            .Mine(2000, TestTime(10000), 0x101)
            .TestStarted()
            // So that's what happens the next period
            .TestStateSinceHeight(2000)
            .Mine(2999, TestTime(30000), 0x100)
            .TestStarted()
            // 999 new blocks
            .TestStateSinceHeight(2000)
            .Mine(3000, TestTime(30000), 0x100)
            .TestFailed()
            // 1 new block (so 1000 out of the past 1000 are new)
            .TestStateSinceHeight(3000)
            .Mine(3999, TestTime(30001), 0)
            .TestFailed()
            .TestStateSinceHeight(3000)
            .Mine(4000, TestTime(30002), 0)
            .TestFailed()
            .TestStateSinceHeight(3000)
            .Mine(14333, TestTime(30003), 0)
            .TestFailed()
            .TestStateSinceHeight(3000)
            .Mine(24000, TestTime(40000), 0)
            .TestFailed()
            .TestStateSinceHeight(3000)

            // DEFINED -> STARTED -> LOCKEDIN at the last minute -> ACTIVE
            .Reset()
            .TestDefined()
            .Mine(1, TestTime(1), 0)
            .TestDefined()
            .TestStateSinceHeight(0)
            .Mine(1000, TestTime(10000) - 1, 0x101)
            .TestDefined()
            // One second more and it would be defined
            .TestStateSinceHeight(0)
            .Mine(2000, TestTime(10000), 0x101)
            .TestStarted()
            // So that's what happens the next period
            .TestStateSinceHeight(2000)
            .Mine(2050, TestTime(10010), 0x200)
            .TestStarted()
            // 50 old blocks
            .TestStateSinceHeight(2000)
            .Mine(2950, TestTime(10020), 0x100)
            .TestStarted()
            // 900 new blocks
            .TestStateSinceHeight(2000)
            .Mine(2999, TestTime(19999), 0x200)
            .TestStarted()
            // 49 old blocks
            .TestStateSinceHeight(2000)
            .Mine(3000, TestTime(29999), 0x200)
            .TestLockedIn()
            // 1 old block (so 900 out of the past 1000)
            .TestStateSinceHeight(3000)
            .Mine(3999, TestTime(30001), 0)
            .TestLockedIn()
            .TestStateSinceHeight(3000)
            .Mine(4000, TestTime(30002), 0)
            .TestActive()
            .TestStateSinceHeight(4000)
            .Mine(14333, TestTime(30003), 0)
            .TestActive()
            .TestStateSinceHeight(4000)
            .Mine(24000, TestTime(40000), 0)
            .TestActive()
            .TestStateSinceHeight(4000)

            // DEFINED multiple periods -> STARTED multiple periods -> FAILED
            .Reset()
            .TestDefined()
            .TestStateSinceHeight(0)
            .Mine(999, TestTime(999), 0)
            .TestDefined()
            .TestStateSinceHeight(0)
            .Mine(1000, TestTime(1000), 0)
            .TestDefined()
            .TestStateSinceHeight(0)
            .Mine(2000, TestTime(2000), 0)
            .TestDefined()
            .TestStateSinceHeight(0)
            .Mine(3000, TestTime(10000), 0)
            .TestStarted()
            .TestStateSinceHeight(3000)
            .Mine(4000, TestTime(10000), 0)
            .TestStarted()
            .TestStateSinceHeight(3000)
            .Mine(5000, TestTime(10000), 0)
            .TestStarted()
            .TestStateSinceHeight(3000)
            .Mine(6000, TestTime(20000), 0)
            .TestFailed()
            .TestStateSinceHeight(6000)
            .Mine(7000, TestTime(20000), 0x100)
            .TestFailed()
            .TestStateSinceHeight(6000);
    }

    // Sanity checks of version bit deployments
    const auto chainParams = CreateChainParams(CBaseChainParams::MAIN);
    const Consensus::Params &mainnetParams = chainParams->GetConsensus();
    for (int i = 0; i < (int)Consensus::MAX_VERSION_BITS_DEPLOYMENTS; i++) {
        uint32_t bitmask =
            VersionBitsMask(mainnetParams, (Consensus::DeploymentPos)i);
        // Make sure that no deployment tries to set an invalid bit.
        BOOST_CHECK_EQUAL(bitmask & ~(uint32_t)VERSIONBITS_TOP_MASK, bitmask);

        // Verify that the deployment windows of different deployment using the
        // same bit are disjoint. This test may need modification at such time
        // as a new deployment is proposed that reuses the bit of an activated
        // soft fork, before the end time of that soft fork.  (Alternatively,
        // the end time of that activated soft fork could be later changed to be
        // earlier to avoid overlap.)
        for (int j = i + 1; j < (int)Consensus::MAX_VERSION_BITS_DEPLOYMENTS;
             j++) {
            if (VersionBitsMask(mainnetParams, (Consensus::DeploymentPos)j) ==
                bitmask) {
                BOOST_CHECK(mainnetParams.vDeployments[j].nStartTime >
                                mainnetParams.vDeployments[i].nTimeout ||
                            mainnetParams.vDeployments[i].nStartTime >
                                mainnetParams.vDeployments[j].nTimeout);
            }
        }
    }
}

BOOST_AUTO_TEST_SUITE_END()
