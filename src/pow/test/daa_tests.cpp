// Copyright (c) 2015-2019 The Bitcoin Core developers
// Distributed under the MIT/X11 software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <pow/daa.h>

#include <chain.h>
#include <chainparams.h>
#include <config.h>
#include <util/chaintype.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(daa_tests, BasicTestingSetup)

static CBlockIndex GetBlockIndex(CBlockIndex *pindexPrev, int64_t nTimeInterval,
                                 uint32_t nBits) {
    CBlockIndex block;
    block.pprev = pindexPrev;
    block.nHeight = pindexPrev->nHeight + 1;
    block.nTime = pindexPrev->nTime + nTimeInterval;
    block.nBits = nBits;

    block.nChainWork = pindexPrev->nChainWork + GetBlockProof(block);
    return block;
}

BOOST_AUTO_TEST_CASE(daa_test) {
    DummyConfig config(ChainTypeToString(ChainType::MAIN));

    std::vector<CBlockIndex> blocks(3000);

    const Consensus::Params &params = config.GetChainParams().GetConsensus();
    const arith_uint256 powLimit = UintToArith256(params.powLimit);
    uint32_t powLimitBits = powLimit.GetCompact();
    arith_uint256 currentPow = powLimit >> 4;
    uint32_t initialBits = currentPow.GetCompact();

    // Genesis block.
    blocks[0] = CBlockIndex();
    blocks[0].nHeight = 0;
    blocks[0].nTime = 1269211443;
    blocks[0].nBits = initialBits;

    blocks[0].nChainWork = GetBlockProof(blocks[0]);

    // Block counter.
    size_t i;

    // Pile up some blocks every 10 mins to establish some history.
    for (i = 1; i < 2050; i++) {
        blocks[i] = GetBlockIndex(&blocks[i - 1], 600, initialBits);
    }

    CBlockHeader blkHeaderDummy;
    uint32_t nBits =
        GetNextDAAWorkRequired(&blocks[2049], &blkHeaderDummy, params);

    // Difficulty stays the same as long as we produce a block every 10 mins.
    for (size_t j = 0; j < 10; i++, j++) {
        blocks[i] = GetBlockIndex(&blocks[i - 1], 600, nBits);
        BOOST_CHECK_EQUAL(
            GetNextDAAWorkRequired(&blocks[i], &blkHeaderDummy, params), nBits);
    }

    // Make sure we skip over blocks that are out of wack. To do so, we produce
    // a block that is far in the future, and then produce a block with the
    // expected timestamp.
    blocks[i] = GetBlockIndex(&blocks[i - 1], 6000, nBits);
    BOOST_CHECK_EQUAL(
        GetNextDAAWorkRequired(&blocks[i++], &blkHeaderDummy, params), nBits);
    blocks[i] = GetBlockIndex(&blocks[i - 1], 2 * 600 - 6000, nBits);
    BOOST_CHECK_EQUAL(
        GetNextDAAWorkRequired(&blocks[i++], &blkHeaderDummy, params), nBits);

    // The system should continue unaffected by the block with a bogous
    // timestamps.
    for (size_t j = 0; j < 20; i++, j++) {
        blocks[i] = GetBlockIndex(&blocks[i - 1], 600, nBits);
        BOOST_CHECK_EQUAL(
            GetNextDAAWorkRequired(&blocks[i], &blkHeaderDummy, params), nBits);
    }

    // We start emitting blocks slightly faster. The first block has no impact.
    blocks[i] = GetBlockIndex(&blocks[i - 1], 550, nBits);
    BOOST_CHECK_EQUAL(
        GetNextDAAWorkRequired(&blocks[i++], &blkHeaderDummy, params), nBits);

    // Now we should see difficulty increase slowly.
    for (size_t j = 0; j < 10; i++, j++) {
        blocks[i] = GetBlockIndex(&blocks[i - 1], 550, nBits);
        const uint32_t nextBits =
            GetNextDAAWorkRequired(&blocks[i], &blkHeaderDummy, params);

        arith_uint256 currentTarget;
        currentTarget.SetCompact(nBits);
        arith_uint256 nextTarget;
        nextTarget.SetCompact(nextBits);

        // Make sure that difficulty increases very slowly.
        BOOST_CHECK(nextTarget < currentTarget);
        BOOST_CHECK((currentTarget - nextTarget) < (currentTarget >> 10));

        nBits = nextBits;
    }

    // Check the actual value.
    BOOST_CHECK_EQUAL(nBits, 0x1c0fe7b1);

    // If we dramatically shorten block production, difficulty increases faster.
    for (size_t j = 0; j < 20; i++, j++) {
        blocks[i] = GetBlockIndex(&blocks[i - 1], 10, nBits);
        const uint32_t nextBits =
            GetNextDAAWorkRequired(&blocks[i], &blkHeaderDummy, params);

        arith_uint256 currentTarget;
        currentTarget.SetCompact(nBits);
        arith_uint256 nextTarget;
        nextTarget.SetCompact(nextBits);

        // Make sure that difficulty increases faster.
        BOOST_CHECK(nextTarget < currentTarget);
        BOOST_CHECK((currentTarget - nextTarget) < (currentTarget >> 4));

        nBits = nextBits;
    }

    // Check the actual value.
    BOOST_CHECK_EQUAL(nBits, 0x1c0db19f);

    // We start to emit blocks significantly slower. The first block has no
    // impact.
    blocks[i] = GetBlockIndex(&blocks[i - 1], 6000, nBits);
    nBits = GetNextDAAWorkRequired(&blocks[i++], &blkHeaderDummy, params);

    // Check the actual value.
    BOOST_CHECK_EQUAL(nBits, 0x1c0d9222);

    // If we dramatically slow down block production, difficulty decreases.
    for (size_t j = 0; j < 93; i++, j++) {
        blocks[i] = GetBlockIndex(&blocks[i - 1], 6000, nBits);
        const uint32_t nextBits =
            GetNextDAAWorkRequired(&blocks[i], &blkHeaderDummy, params);

        arith_uint256 currentTarget;
        currentTarget.SetCompact(nBits);
        arith_uint256 nextTarget;
        nextTarget.SetCompact(nextBits);

        // Check the difficulty decreases.
        BOOST_CHECK(nextTarget <= powLimit);
        BOOST_CHECK(nextTarget > currentTarget);
        BOOST_CHECK((nextTarget - currentTarget) < (currentTarget >> 3));

        nBits = nextBits;
    }

    // Check the actual value.
    BOOST_CHECK_EQUAL(nBits, 0x1c2f13b9);

    // Due to the window of time being bounded, next block's difficulty actually
    // gets harder.
    blocks[i] = GetBlockIndex(&blocks[i - 1], 6000, nBits);
    nBits = GetNextDAAWorkRequired(&blocks[i++], &blkHeaderDummy, params);
    BOOST_CHECK_EQUAL(nBits, 0x1c2ee9bf);

    // And goes down again. It takes a while due to the window being bounded and
    // the skewed block causes 2 blocks to get out of the window.
    for (size_t j = 0; j < 192; i++, j++) {
        blocks[i] = GetBlockIndex(&blocks[i - 1], 6000, nBits);
        const uint32_t nextBits =
            GetNextDAAWorkRequired(&blocks[i], &blkHeaderDummy, params);

        arith_uint256 currentTarget;
        currentTarget.SetCompact(nBits);
        arith_uint256 nextTarget;
        nextTarget.SetCompact(nextBits);

        // Check the difficulty decreases.
        BOOST_CHECK(nextTarget <= powLimit);
        BOOST_CHECK(nextTarget > currentTarget);
        BOOST_CHECK((nextTarget - currentTarget) < (currentTarget >> 3));

        nBits = nextBits;
    }

    // Check the actual value.
    BOOST_CHECK_EQUAL(nBits, 0x1d00ffff);

    // Once the difficulty reached the minimum allowed level, it doesn't get any
    // easier.
    for (size_t j = 0; j < 5; i++, j++) {
        blocks[i] = GetBlockIndex(&blocks[i - 1], 6000, nBits);
        const uint32_t nextBits =
            GetNextDAAWorkRequired(&blocks[i], &blkHeaderDummy, params);

        // Check the difficulty stays constant.
        BOOST_CHECK_EQUAL(nextBits, powLimitBits);
        nBits = nextBits;
    }

    // We will now mine blocks much faster. For a while, the difficulty will
    // continue to go down.
    for (size_t j = 0; j < 130; i++, j++) {
        blocks[i] = GetBlockIndex(&blocks[i - 1], 10, nBits);
        const uint32_t nextBits =
            GetNextDAAWorkRequired(&blocks[i], &blkHeaderDummy, params);

        arith_uint256 currentTarget;
        currentTarget.SetCompact(nBits);
        arith_uint256 nextTarget;
        nextTarget.SetCompact(nextBits);

        // Check the difficulty decreases.
        BOOST_CHECK(nextTarget <= powLimit);
        BOOST_CHECK(nextTarget >= currentTarget);
        BOOST_CHECK((nextTarget - currentTarget) < (currentTarget >> 3));

        nBits = nextBits;
    }

    // Now the difficulty will go back up, and evetually we will trigger the
    // cliff code.
    for (size_t j = 0; j < 70; i++, j++) {
        blocks[i] = GetBlockIndex(&blocks[i - 1], 10, nBits);
        const uint32_t nextBits =
            GetNextDAAWorkRequired(&blocks[i], &blkHeaderDummy, params);

        arith_uint256 currentTarget;
        currentTarget.SetCompact(nBits);
        arith_uint256 nextTarget;
        nextTarget.SetCompact(nextBits);

        // Check the difficulty decreases.
        BOOST_CHECK(nextTarget < currentTarget);
        BOOST_CHECK((currentTarget - nextTarget) < (currentTarget >> 3));

        nBits = nextBits;
    }

    // Check the actual value.
    BOOST_CHECK_EQUAL(nBits, 0x1c4c068c);
}

BOOST_AUTO_TEST_SUITE_END()
