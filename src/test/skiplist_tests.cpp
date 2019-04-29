// Copyright (c) 2014-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chain.h>
#include <util.h>

#include <test/test_bitcoin.h>

#include <boost/test/unit_test.hpp>

#include <vector>

#define SKIPLIST_LENGTH 300000

BOOST_FIXTURE_TEST_SUITE(skiplist_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(skiplist_test) {
    std::vector<CBlockIndex> vIndex(SKIPLIST_LENGTH);

    for (int i = 0; i < SKIPLIST_LENGTH; i++) {
        vIndex[i].nHeight = i;
        vIndex[i].pprev = (i == 0) ? nullptr : &vIndex[i - 1];
        vIndex[i].BuildSkip();
    }

    for (int i = 0; i < SKIPLIST_LENGTH; i++) {
        if (i > 0) {
            BOOST_CHECK(vIndex[i].pskip == &vIndex[vIndex[i].pskip->nHeight]);
            BOOST_CHECK(vIndex[i].pskip->nHeight < i);
        } else {
            BOOST_CHECK(vIndex[i].pskip == nullptr);
        }
    }

    for (int i = 0; i < 1000; i++) {
        int from = InsecureRandRange(SKIPLIST_LENGTH - 1);
        int to = InsecureRandRange(from + 1);

        BOOST_CHECK(vIndex[SKIPLIST_LENGTH - 1].GetAncestor(from) ==
                    &vIndex[from]);
        BOOST_CHECK(vIndex[from].GetAncestor(to) == &vIndex[to]);
        BOOST_CHECK(vIndex[from].GetAncestor(0) == &vIndex[0]);
    }
}

BOOST_AUTO_TEST_CASE(getlocator_test) {
    // Build a main chain 100000 blocks long.
    std::vector<uint256> vHashMain(100000);
    std::vector<CBlockIndex> vBlocksMain(100000);
    for (unsigned int i = 0; i < vBlocksMain.size(); i++) {
        // Set the hash equal to the height, so we can quickly check the
        // distances.
        vHashMain[i] = ArithToUint256(i);
        vBlocksMain[i].nHeight = i;
        vBlocksMain[i].pprev = i ? &vBlocksMain[i - 1] : nullptr;
        vBlocksMain[i].phashBlock = &vHashMain[i];
        vBlocksMain[i].BuildSkip();
        BOOST_CHECK_EQUAL(
            (int)UintToArith256(vBlocksMain[i].GetBlockHash()).GetLow64(),
            vBlocksMain[i].nHeight);
        BOOST_CHECK(vBlocksMain[i].pprev == nullptr ||
                    vBlocksMain[i].nHeight ==
                        vBlocksMain[i].pprev->nHeight + 1);
    }

    // Build a branch that splits off at block 49999, 50000 blocks long.
    std::vector<uint256> vHashSide(50000);
    std::vector<CBlockIndex> vBlocksSide(50000);
    for (unsigned int i = 0; i < vBlocksSide.size(); i++) {
        // Add 1<<128 to the hashes, so GetLow64() still returns the height.
        vHashSide[i] = ArithToUint256(i + 50000 + (arith_uint256(1) << 128));
        vBlocksSide[i].nHeight = i + 50000;
        vBlocksSide[i].pprev = i ? &vBlocksSide[i - 1] : &vBlocksMain[49999];
        vBlocksSide[i].phashBlock = &vHashSide[i];
        vBlocksSide[i].BuildSkip();
        BOOST_CHECK_EQUAL(
            (int)UintToArith256(vBlocksSide[i].GetBlockHash()).GetLow64(),
            vBlocksSide[i].nHeight);
        BOOST_CHECK(vBlocksSide[i].pprev == nullptr ||
                    vBlocksSide[i].nHeight ==
                        vBlocksSide[i].pprev->nHeight + 1);
    }

    // Build a CChain for the main branch.
    CChain chain;
    chain.SetTip(&vBlocksMain.back());

    // Test 100 random starting points for locators.
    for (int n = 0; n < 100; n++) {
        int r = InsecureRandRange(150000);
        CBlockIndex *tip =
            (r < 100000) ? &vBlocksMain[r] : &vBlocksSide[r - 100000];
        CBlockLocator locator = chain.GetLocator(tip);

        // The first result must be the block itself, the last one must be
        // genesis.
        BOOST_CHECK(locator.vHave.front() == tip->GetBlockHash());
        BOOST_CHECK(locator.vHave.back() == vBlocksMain[0].GetBlockHash());

        // Entries 1 through 11 (inclusive) go back one step each.
        for (unsigned int i = 1; i < 12 && i < locator.vHave.size() - 1; i++) {
            BOOST_CHECK_EQUAL(UintToArith256(locator.vHave[i]).GetLow64(),
                              tip->nHeight - i);
        }

        // The further ones (excluding the last one) go back with exponential
        // steps.
        unsigned int dist = 2;
        for (unsigned int i = 12; i < locator.vHave.size() - 1; i++) {
            BOOST_CHECK_EQUAL(UintToArith256(locator.vHave[i - 1]).GetLow64() -
                                  UintToArith256(locator.vHave[i]).GetLow64(),
                              dist);
            dist *= 2;
        }
    }
}

BOOST_AUTO_TEST_CASE(findearliestatleast_test) {
    std::vector<uint256> vHashMain(100000);
    std::vector<CBlockIndex> vBlocksMain(100000);
    for (unsigned int i = 0; i < vBlocksMain.size(); i++) {
        // Set the hash equal to the height
        vHashMain[i] = ArithToUint256(i);
        vBlocksMain[i].nHeight = i;
        vBlocksMain[i].pprev = i ? &vBlocksMain[i - 1] : nullptr;
        vBlocksMain[i].phashBlock = &vHashMain[i];
        vBlocksMain[i].BuildSkip();
        if (i < 10) {
            vBlocksMain[i].nTime = i;
            vBlocksMain[i].nTimeMax = i;
        } else {
            // randomly choose something in the range [MTP, MTP*2]
            int64_t medianTimePast = vBlocksMain[i].GetMedianTimePast();
            int r = InsecureRandRange(medianTimePast);
            vBlocksMain[i].nTime = r + medianTimePast;
            vBlocksMain[i].nTimeMax =
                std::max(vBlocksMain[i].nTime, vBlocksMain[i - 1].nTimeMax);
        }
    }
    // Check that we set nTimeMax up correctly.
    unsigned int curTimeMax = 0;
    for (unsigned int i = 0; i < vBlocksMain.size(); ++i) {
        curTimeMax = std::max(curTimeMax, vBlocksMain[i].nTime);
        BOOST_CHECK(curTimeMax == vBlocksMain[i].nTimeMax);
    }

    // Build a CChain for the main branch.
    CChain chain;
    chain.SetTip(&vBlocksMain.back());

    // Verify that FindEarliestAtLeast is correct.
    for (unsigned int i = 0; i < 10000; ++i) {
        // Pick a random element in vBlocksMain.
        int r = InsecureRandRange(vBlocksMain.size());
        int64_t test_time = vBlocksMain[r].nTime;
        CBlockIndex *ret = chain.FindEarliestAtLeast(test_time);
        BOOST_CHECK(ret->nTimeMax >= test_time);
        BOOST_CHECK((ret->pprev == nullptr) ||
                    ret->pprev->nTimeMax < test_time);
        BOOST_CHECK(vBlocksMain[r].GetAncestor(ret->nHeight) == ret);
    }
}
BOOST_AUTO_TEST_SUITE_END()
