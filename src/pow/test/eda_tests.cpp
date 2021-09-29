// Copyright (c) 2015-2019 The Bitcoin Core developers
// Distributed under the MIT/X11 software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <pow/eda.h>
#include <pow/pow.h>

#include <chain.h>
#include <chainparams.h>
#include <config.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(eda_tests, BasicTestingSetup)

/* Test calculation of next difficulty target with no constraints applying */
BOOST_AUTO_TEST_CASE(get_next_work) {
    DummyConfig config(CBaseChainParams::MAIN);

    int64_t nLastRetargetTime = 1261130161; // Block #30240
    CBlockIndex pindexLast;
    pindexLast.nHeight = 32255;
    pindexLast.nTime = 1262152739; // Block #32255
    pindexLast.nBits = 0x1d00ffff;
    BOOST_CHECK_EQUAL(
        CalculateNextWorkRequired(&pindexLast, nLastRetargetTime,
                                  config.GetChainParams().GetConsensus()),
        0x1d00d86aU);
}

/* Test the constraint on the upper bound for next work */
BOOST_AUTO_TEST_CASE(get_next_work_pow_limit) {
    DummyConfig config(CBaseChainParams::MAIN);

    int64_t nLastRetargetTime = 1231006505; // Block #0
    CBlockIndex pindexLast;
    pindexLast.nHeight = 2015;
    pindexLast.nTime = 1233061996; // Block #2015
    pindexLast.nBits = 0x1d00ffff;
    BOOST_CHECK_EQUAL(
        CalculateNextWorkRequired(&pindexLast, nLastRetargetTime,
                                  config.GetChainParams().GetConsensus()),
        0x1d00ffffU);
}

/* Test the constraint on the lower bound for actual time taken */
BOOST_AUTO_TEST_CASE(get_next_work_lower_limit_actual) {
    DummyConfig config(CBaseChainParams::MAIN);

    int64_t nLastRetargetTime = 1279008237; // Block #66528
    CBlockIndex pindexLast;
    pindexLast.nHeight = 68543;
    pindexLast.nTime = 1279297671; // Block #68543
    pindexLast.nBits = 0x1c05a3f4;
    BOOST_CHECK_EQUAL(
        CalculateNextWorkRequired(&pindexLast, nLastRetargetTime,
                                  config.GetChainParams().GetConsensus()),
        0x1c0168fdU);
}

/* Test the constraint on the upper bound for actual time taken */
BOOST_AUTO_TEST_CASE(get_next_work_upper_limit_actual) {
    DummyConfig config(CBaseChainParams::MAIN);

    int64_t nLastRetargetTime = 1263163443; // NOTE: Not an actual block time
    CBlockIndex pindexLast;
    pindexLast.nHeight = 46367;
    pindexLast.nTime = 1269211443; // Block #46367
    pindexLast.nBits = 0x1c387f6f;
    BOOST_CHECK_EQUAL(
        CalculateNextWorkRequired(&pindexLast, nLastRetargetTime,
                                  config.GetChainParams().GetConsensus()),
        0x1d00e1fdU);
}

BOOST_AUTO_TEST_CASE(CheckProofOfWork_test_negative_target) {
    const auto consensus =
        CreateChainParams(CBaseChainParams::MAIN)->GetConsensus();
    BlockHash hash;
    unsigned int nBits;
    nBits = UintToArith256(consensus.powLimit).GetCompact(true);
    hash.SetHex("0x1");
    BOOST_CHECK(!CheckProofOfWork(hash, nBits, consensus));
}

BOOST_AUTO_TEST_CASE(CheckProofOfWork_test_overflow_target) {
    const auto consensus =
        CreateChainParams(CBaseChainParams::MAIN)->GetConsensus();
    BlockHash hash;
    unsigned int nBits = ~0x00800000;
    hash.SetHex("0x1");
    BOOST_CHECK(!CheckProofOfWork(hash, nBits, consensus));
}

BOOST_AUTO_TEST_CASE(CheckProofOfWork_test_too_easy_target) {
    const auto consensus =
        CreateChainParams(CBaseChainParams::MAIN)->GetConsensus();
    BlockHash hash;
    unsigned int nBits;
    arith_uint256 nBits_arith = UintToArith256(consensus.powLimit);
    nBits_arith *= 2;
    nBits = nBits_arith.GetCompact();
    hash.SetHex("0x1");
    BOOST_CHECK(!CheckProofOfWork(hash, nBits, consensus));
}

BOOST_AUTO_TEST_CASE(CheckProofOfWork_test_biger_hash_than_target) {
    const auto consensus =
        CreateChainParams(CBaseChainParams::MAIN)->GetConsensus();
    BlockHash hash;
    unsigned int nBits;
    arith_uint256 hash_arith = UintToArith256(consensus.powLimit);
    nBits = hash_arith.GetCompact();
    hash_arith *= 2; // hash > nBits
    hash = BlockHash(ArithToUint256(hash_arith));
    BOOST_CHECK(!CheckProofOfWork(hash, nBits, consensus));
}

BOOST_AUTO_TEST_CASE(CheckProofOfWork_test_zero_target) {
    const auto consensus =
        CreateChainParams(CBaseChainParams::MAIN)->GetConsensus();
    BlockHash hash;
    unsigned int nBits;
    arith_uint256 hash_arith{0};
    nBits = hash_arith.GetCompact();
    hash = BlockHash(ArithToUint256(hash_arith));
    BOOST_CHECK(!CheckProofOfWork(hash, nBits, consensus));
}

BOOST_AUTO_TEST_CASE(GetBlockProofEquivalentTime_test) {
    DummyConfig config(CBaseChainParams::MAIN);

    std::vector<CBlockIndex> blocks(10000);
    for (int i = 0; i < 10000; i++) {
        blocks[i].pprev = i ? &blocks[i - 1] : nullptr;
        blocks[i].nHeight = i;
        blocks[i].nTime =
            1269211443 +
            i * config.GetChainParams().GetConsensus().nPowTargetSpacing;
        blocks[i].nBits = 0x207fffff; /* target 0x7fffff000... */
        blocks[i].nChainWork =
            i ? blocks[i - 1].nChainWork + GetBlockProof(blocks[i])
              : arith_uint256(0);
    }

    for (int j = 0; j < 1000; j++) {
        CBlockIndex *p1 = &blocks[InsecureRandRange(10000)];
        CBlockIndex *p2 = &blocks[InsecureRandRange(10000)];
        CBlockIndex *p3 = &blocks[InsecureRandRange(10000)];

        int64_t tdiff = GetBlockProofEquivalentTime(
            *p1, *p2, *p3, config.GetChainParams().GetConsensus());
        BOOST_CHECK_EQUAL(tdiff, p1->GetBlockTime() - p2->GetBlockTime());
    }
}

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

BOOST_AUTO_TEST_CASE(retargeting_test) {
    DummyConfig config(CBaseChainParams::MAIN);

    std::vector<CBlockIndex> blocks(115);

    const Consensus::Params &params = config.GetChainParams().GetConsensus();
    const arith_uint256 powLimit = UintToArith256(params.powLimit);
    arith_uint256 currentPow = powLimit >> 1;
    uint32_t initialBits = currentPow.GetCompact();

    // Genesis block.
    blocks[0] = CBlockIndex();
    blocks[0].nHeight = 0;
    blocks[0].nTime = 1269211443;
    blocks[0].nBits = initialBits;

    blocks[0].nChainWork = GetBlockProof(blocks[0]);

    // Pile up some blocks.
    for (size_t i = 1; i < 100; i++) {
        blocks[i] = GetBlockIndex(&blocks[i - 1], params.nPowTargetSpacing,
                                  initialBits);
    }

    CBlockHeader blkHeaderDummy;

    // We start getting 2h blocks time. For the first 5 blocks, it doesn't
    // matter as the MTP is not affected. For the next 5 block, MTP difference
    // increases but stays below 12h.
    for (size_t i = 100; i < 110; i++) {
        blocks[i] = GetBlockIndex(&blocks[i - 1], 2 * 3600, initialBits);
        BOOST_CHECK_EQUAL(
            GetNextEDAWorkRequired(&blocks[i], &blkHeaderDummy, params),
            initialBits);
    }

    // Now we expect the difficulty to decrease.
    blocks[110] = GetBlockIndex(&blocks[109], 2 * 3600, initialBits);
    currentPow.SetCompact(currentPow.GetCompact());
    currentPow += (currentPow >> 2);
    BOOST_CHECK_EQUAL(
        GetNextEDAWorkRequired(&blocks[110], &blkHeaderDummy, params),
        currentPow.GetCompact());

    // As we continue with 2h blocks, difficulty continue to decrease.
    blocks[111] =
        GetBlockIndex(&blocks[110], 2 * 3600, currentPow.GetCompact());
    currentPow.SetCompact(currentPow.GetCompact());
    currentPow += (currentPow >> 2);
    BOOST_CHECK_EQUAL(
        GetNextEDAWorkRequired(&blocks[111], &blkHeaderDummy, params),
        currentPow.GetCompact());

    // We decrease again.
    blocks[112] =
        GetBlockIndex(&blocks[111], 2 * 3600, currentPow.GetCompact());
    currentPow.SetCompact(currentPow.GetCompact());
    currentPow += (currentPow >> 2);
    BOOST_CHECK_EQUAL(
        GetNextEDAWorkRequired(&blocks[112], &blkHeaderDummy, params),
        currentPow.GetCompact());

    // We check that we do not go below the minimal difficulty.
    blocks[113] =
        GetBlockIndex(&blocks[112], 2 * 3600, currentPow.GetCompact());
    currentPow.SetCompact(currentPow.GetCompact());
    currentPow += (currentPow >> 2);
    BOOST_CHECK(powLimit.GetCompact() != currentPow.GetCompact());
    BOOST_CHECK_EQUAL(
        GetNextEDAWorkRequired(&blocks[113], &blkHeaderDummy, params),
        powLimit.GetCompact());

    // Once we reached the minimal difficulty, we stick with it.
    blocks[114] = GetBlockIndex(&blocks[113], 2 * 3600, powLimit.GetCompact());
    BOOST_CHECK(powLimit.GetCompact() != currentPow.GetCompact());
    BOOST_CHECK_EQUAL(
        GetNextEDAWorkRequired(&blocks[114], &blkHeaderDummy, params),
        powLimit.GetCompact());
}

BOOST_AUTO_TEST_SUITE_END()
