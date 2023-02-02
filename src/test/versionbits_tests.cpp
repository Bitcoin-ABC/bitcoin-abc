// Copyright (c) 2014-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chain.h>
#include <chainparams.h>
#include <consensus/params.h>
#include <deploymentstatus.h>
#include <validation.h>
#include <versionbits.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

/* Define a virtual block time, one block per 10 minutes after Nov 14 2014,
 * 0:55:36am */
static int32_t TestTime(int nHeight) {
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
};

class TestAlwaysActiveConditionChecker : public TestConditionChecker {
public:
    int64_t BeginTime(const Consensus::Params &params) const override {
        return Consensus::BIP9Deployment::ALWAYS_ACTIVE;
    }
};

#define CHECKERS 6

class VersionBitsTester {
    // A fake blockchain
    std::vector<CBlockIndex *> vpblock;

    // 6 independent checkers for the same bit.
    // The first one performs all checks, the second only 50%, the third only
    // 25%, etc... This is to test whether lack of cached information leads to
    // the same results.
    TestConditionChecker checker[CHECKERS];
    // Another 6 that assume always active activation
    TestAlwaysActiveConditionChecker checker_always[CHECKERS];

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
            checker_always[i] = TestAlwaysActiveConditionChecker();
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

    VersionBitsTester &TestDefined() {
        for (int i = 0; i < CHECKERS; i++) {
            if (InsecureRandBits(i) == 0) {
                BOOST_CHECK_MESSAGE(
                    checker[i].GetStateFor(vpblock.empty() ? nullptr
                                                           : vpblock.back()) ==
                        ThresholdState::DEFINED,
                    strprintf("Test %i for DEFINED", num));
                BOOST_CHECK_MESSAGE(
                    checker_always[i].GetStateFor(
                        vpblock.empty() ? nullptr : vpblock.back()) ==
                        ThresholdState::ACTIVE,
                    strprintf("Test %i for ACTIVE (always active)", num));
            }
        }
        num++;
        return *this;
    }

    CBlockIndex *Tip() { return vpblock.size() ? vpblock.back() : nullptr; }
};

BOOST_FIXTURE_TEST_SUITE(versionbits_tests, TestingSetup)

BOOST_AUTO_TEST_CASE(versionbits_test) {
    // Sanity checks of version bit deployments
    const auto chainParams = CreateChainParams(CBaseChainParams::MAIN);
    const Consensus::Params &mainnetParams = chainParams->GetConsensus();
    for (int i = 0; i < (int)Consensus::MAX_VERSION_BITS_DEPLOYMENTS; i++) {
        uint32_t bitmask = g_versionbitscache.Mask(
            mainnetParams, static_cast<Consensus::DeploymentPos>(i));
        // Make sure that no deployment tries to set an invalid bit.
        BOOST_CHECK_EQUAL(bitmask & ~(uint32_t)VERSIONBITS_TOP_MASK, bitmask);

        // Verify that the deployment windows of different deployment using the
        // same bit are disjoint.
        // This test may need modification at such time as a new deployment
        // is proposed that reuses the bit of an activated soft fork, before the
        // end time of that soft fork.  (Alternatively, the end time of that
        // activated soft fork could be later changed to be earlier to avoid
        // overlap.)
        for (int j = i + 1; j < (int)Consensus::MAX_VERSION_BITS_DEPLOYMENTS;
             j++) {
            if (g_versionbitscache.Mask(
                    mainnetParams, static_cast<Consensus::DeploymentPos>(j)) ==
                bitmask) {
                BOOST_CHECK(mainnetParams.vDeployments[j].nStartTime >
                                mainnetParams.vDeployments[i].nTimeout ||
                            mainnetParams.vDeployments[i].nStartTime >
                                mainnetParams.vDeployments[j].nTimeout);
            }
        }
    }
}

BOOST_AUTO_TEST_CASE(versionbits_computeblockversion) {
    // Check that ComputeBlockVersion will set the appropriate bit correctly
    // on mainnet.
    const auto chainParams = CreateChainParams(CBaseChainParams::MAIN);
    const Consensus::Params &mainnetParams = chainParams->GetConsensus();

    // Use the TESTDUMMY deployment for testing purposes.
    int64_t bit =
        mainnetParams.vDeployments[Consensus::DEPLOYMENT_TESTDUMMY].bit;
    int64_t nStartTime =
        mainnetParams.vDeployments[Consensus::DEPLOYMENT_TESTDUMMY].nStartTime;
    int64_t nTimeout =
        mainnetParams.vDeployments[Consensus::DEPLOYMENT_TESTDUMMY].nTimeout;

    assert(nStartTime < nTimeout);

    // In the first chain, test that the bit is set by CBV until it has failed.
    // In the second chain, test the bit is set by CBV while STARTED and
    // LOCKED-IN, and then no longer set while ACTIVE.
    VersionBitsTester firstChain, secondChain;

    // Start generating blocks before nStartTime
    int64_t nTime = nStartTime - 1;

    // Before MedianTimePast of the chain has crossed nStartTime, the bit
    // should not be set.
    CBlockIndex *lastBlock = nullptr;
    lastBlock = firstChain
                    .Mine(mainnetParams.nMinerConfirmationWindow, nTime,
                          VERSIONBITS_LAST_OLD_BLOCK_VERSION)
                    .Tip();
    BOOST_CHECK_EQUAL(
        g_versionbitscache.ComputeBlockVersion(lastBlock, mainnetParams) &
            (1 << bit),
        0);

    // Mine more blocks (4 less than the adjustment period) at the old time, and
    // check that CBV isn't setting the bit yet.
    for (uint32_t i = 1; i < mainnetParams.nMinerConfirmationWindow - 4; i++) {
        lastBlock = firstChain
                        .Mine(mainnetParams.nMinerConfirmationWindow + i, nTime,
                              VERSIONBITS_LAST_OLD_BLOCK_VERSION)
                        .Tip();
        // This works because VERSIONBITS_LAST_OLD_BLOCK_VERSION happens
        // to be 4, and the bit we're testing happens to be bit 28.
        BOOST_CHECK_EQUAL(
            g_versionbitscache.ComputeBlockVersion(lastBlock, mainnetParams) &
                (1 << bit),
            0);
    }
    // Now mine 5 more blocks at the start time -- MTP should not have passed
    // yet, so CBV should still not yet set the bit.
    nTime = nStartTime;
    for (uint32_t i = mainnetParams.nMinerConfirmationWindow - 4;
         i <= mainnetParams.nMinerConfirmationWindow; i++) {
        lastBlock = firstChain
                        .Mine(mainnetParams.nMinerConfirmationWindow + i, nTime,
                              VERSIONBITS_LAST_OLD_BLOCK_VERSION)
                        .Tip();
        BOOST_CHECK_EQUAL(
            g_versionbitscache.ComputeBlockVersion(lastBlock, mainnetParams) &
                (1 << bit),
            0);
    }

    // Advance to the next period and transition to STARTED,
    lastBlock = firstChain
                    .Mine(mainnetParams.nMinerConfirmationWindow * 3, nTime,
                          VERSIONBITS_LAST_OLD_BLOCK_VERSION)
                    .Tip();
    // so ComputeBlockVersion should now set the bit,
    BOOST_CHECK(
        (g_versionbitscache.ComputeBlockVersion(lastBlock, mainnetParams) &
         (1 << bit)) != 0);
    // and should also be using the VERSIONBITS_TOP_BITS.
    BOOST_CHECK_EQUAL(
        g_versionbitscache.ComputeBlockVersion(lastBlock, mainnetParams) &
            VERSIONBITS_TOP_MASK,
        VERSIONBITS_TOP_BITS);

    // Check that ComputeBlockVersion will set the bit until nTimeout
    nTime += 600;
    uint32_t blocksToMine = mainnetParams.nMinerConfirmationWindow *
                            2; // test blocks for up to 2 time periods
    uint32_t nHeight = mainnetParams.nMinerConfirmationWindow * 3;
    // These blocks are all before nTimeout is reached.
    while (nTime < nTimeout && blocksToMine > 0) {
        lastBlock =
            firstChain
                .Mine(nHeight + 1, nTime, VERSIONBITS_LAST_OLD_BLOCK_VERSION)
                .Tip();
        BOOST_CHECK(
            (g_versionbitscache.ComputeBlockVersion(lastBlock, mainnetParams) &
             (1 << bit)) != 0);
        BOOST_CHECK_EQUAL(
            g_versionbitscache.ComputeBlockVersion(lastBlock, mainnetParams) &
                VERSIONBITS_TOP_MASK,
            VERSIONBITS_TOP_BITS);
        blocksToMine--;
        nTime += 600;
        nHeight += 1;
    }

    nTime = nTimeout;
    // FAILED is only triggered at the end of a period, so CBV should be setting
    // the bit until the period transition.
    for (uint32_t i = 0; i < mainnetParams.nMinerConfirmationWindow - 1; i++) {
        lastBlock =
            firstChain
                .Mine(nHeight + 1, nTime, VERSIONBITS_LAST_OLD_BLOCK_VERSION)
                .Tip();
        BOOST_CHECK(
            (g_versionbitscache.ComputeBlockVersion(lastBlock, mainnetParams) &
             (1 << bit)) != 0);
        nHeight += 1;
    }
    // The next block should trigger no longer setting the bit.
    lastBlock =
        firstChain.Mine(nHeight + 1, nTime, VERSIONBITS_LAST_OLD_BLOCK_VERSION)
            .Tip();
    BOOST_CHECK_EQUAL(
        g_versionbitscache.ComputeBlockVersion(lastBlock, mainnetParams) &
            (1 << bit),
        0);

    // On a new chain:
    // verify that the bit will be set after lock-in, and then stop being set
    // after activation.
    nTime = nStartTime;

    // Mine one period worth of blocks, and check that the bit will be on for
    // the next period.
    lastBlock = secondChain
                    .Mine(mainnetParams.nMinerConfirmationWindow, nTime,
                          VERSIONBITS_LAST_OLD_BLOCK_VERSION)
                    .Tip();
    BOOST_CHECK(
        (g_versionbitscache.ComputeBlockVersion(lastBlock, mainnetParams) &
         (1 << bit)) != 0);

    // Mine another period worth of blocks, signaling the new bit.
    lastBlock = secondChain
                    .Mine(mainnetParams.nMinerConfirmationWindow * 2, nTime,
                          VERSIONBITS_TOP_BITS | (1 << bit))
                    .Tip();
    // After one period of setting the bit on each block, it should have locked
    // in. We keep setting the bit for one more period though, until activation.
    BOOST_CHECK(
        (g_versionbitscache.ComputeBlockVersion(lastBlock, mainnetParams) &
         (1 << bit)) != 0);

    // Now check that we keep mining the block until the end of this period, and
    // then stop at the beginning of the next period.
    lastBlock = secondChain
                    .Mine((mainnetParams.nMinerConfirmationWindow * 3) - 1,
                          nTime, VERSIONBITS_LAST_OLD_BLOCK_VERSION)
                    .Tip();
    BOOST_CHECK(
        (g_versionbitscache.ComputeBlockVersion(lastBlock, mainnetParams) &
         (1 << bit)) != 0);
    lastBlock = secondChain
                    .Mine(mainnetParams.nMinerConfirmationWindow * 3, nTime,
                          VERSIONBITS_LAST_OLD_BLOCK_VERSION)
                    .Tip();
    BOOST_CHECK_EQUAL(
        g_versionbitscache.ComputeBlockVersion(lastBlock, mainnetParams) &
            (1 << bit),
        0);

    // Finally, verify that after a soft fork has activated, CBV no longer uses
    // VERSIONBITS_LAST_OLD_BLOCK_VERSION.
    // BOOST_CHECK_EQUAL(
    //     g_versionbitscache.ComputeBlockVersion(lastBlock, mainnetParams) &
    //         VERSIONBITS_TOP_MASK,
    //     VERSIONBITS_TOP_BITS);
}
BOOST_AUTO_TEST_SUITE_END()
