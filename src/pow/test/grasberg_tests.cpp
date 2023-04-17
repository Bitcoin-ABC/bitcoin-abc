// Copyright (c) 2015-2019 The Bitcoin Core developers
// Distributed under the MIT/X11 software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <pow/grasberg.h>

#include <chain.h>
#include <chainparams.h>
#include <test/lcg.h>
#include <util/chaintype.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

#include <cmath>

using namespace grasberg;

BOOST_FIXTURE_TEST_SUITE(grasberg_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(exp2_test) {
    BOOST_CHECK_EQUAL(deterministicExp2(0), 0);
    BOOST_CHECK_EQUAL(deterministicExp2(1), 0);
    BOOST_CHECK_EQUAL(deterministicExp2(42), 29);
    BOOST_CHECK_EQUAL(deterministicExp2(0x000ff1ce), 724359);
    BOOST_CHECK_EQUAL(deterministicExp2(0x0badf00d), 137991563);
    BOOST_CHECK_EQUAL(deterministicExp2(0x7fffffff), 1779033703);
    BOOST_CHECK_EQUAL(deterministicExp2(0x80000000), 1779033704);
    BOOST_CHECK_EQUAL(deterministicExp2(0xdeadbeef), 3553907236);
    BOOST_CHECK_EQUAL(deterministicExp2(0xfeedcafe), 4270091087);
    BOOST_CHECK_EQUAL(deterministicExp2(0xffffffff), 4294967294);

    // 100 randomly picked values.
    BOOST_CHECK_EQUAL(deterministicExp2(0x087ae9b4), 0x05f22b96);
    BOOST_CHECK_EQUAL(deterministicExp2(0x5425cdf3), 0x41818942);
    BOOST_CHECK_EQUAL(deterministicExp2(0x8dbb6e9b), 0x77c0cbd7);
    BOOST_CHECK_EQUAL(deterministicExp2(0xc72cd267), 0xb6fc25bf);
    BOOST_CHECK_EQUAL(deterministicExp2(0x9a67c66f), 0x84ded919);
    BOOST_CHECK_EQUAL(deterministicExp2(0x94667388), 0x7e994692);
    BOOST_CHECK_EQUAL(deterministicExp2(0x589c28c9), 0x456a0046);
    BOOST_CHECK_EQUAL(deterministicExp2(0x54a063f8), 0x41ec5164);
    BOOST_CHECK_EQUAL(deterministicExp2(0xe4741ebb), 0xdb33b0e3);
    BOOST_CHECK_EQUAL(deterministicExp2(0xed6e1573), 0xe6e49c99);
    BOOST_CHECK_EQUAL(deterministicExp2(0xd74a77d8), 0xca907219);
    BOOST_CHECK_EQUAL(deterministicExp2(0xe9615051), 0xe19549ff);
    BOOST_CHECK_EQUAL(deterministicExp2(0x4b52afdf), 0x39ea41a3);
    BOOST_CHECK_EQUAL(deterministicExp2(0x9c23c8e3), 0x86b372e0);
    BOOST_CHECK_EQUAL(deterministicExp2(0x7e3b8bb5), 0x684f7012);
    BOOST_CHECK_EQUAL(deterministicExp2(0x6e2a4d01), 0x58f8adc7);
    BOOST_CHECK_EQUAL(deterministicExp2(0xf82b8d68), 0xf5427e75);
    BOOST_CHECK_EQUAL(deterministicExp2(0x95c28f4c), 0x80028e21);
    BOOST_CHECK_EQUAL(deterministicExp2(0x7e7814bf), 0x688a837b);
    BOOST_CHECK_EQUAL(deterministicExp2(0x315df77b), 0x249c68ce);
    BOOST_CHECK_EQUAL(deterministicExp2(0x64c8d384), 0x5051d61a);
    BOOST_CHECK_EQUAL(deterministicExp2(0x7e60ec44), 0x6873e8ca);
    BOOST_CHECK_EQUAL(deterministicExp2(0x3b8b004f), 0x2cc90282);
    BOOST_CHECK_EQUAL(deterministicExp2(0x444c4ea5), 0x3400274f);
    BOOST_CHECK_EQUAL(deterministicExp2(0x80759f4a), 0x6a7d4596);
    BOOST_CHECK_EQUAL(deterministicExp2(0xe7e46027), 0xdfa5919f);
    BOOST_CHECK_EQUAL(deterministicExp2(0x487b844b), 0x37829001);
    BOOST_CHECK_EQUAL(deterministicExp2(0xdd45a3f4), 0xd20d0b36);
    BOOST_CHECK_EQUAL(deterministicExp2(0x3e03f2ea), 0x2ece376f);
    BOOST_CHECK_EQUAL(deterministicExp2(0xe69e7c49), 0xddff10d2);
    BOOST_CHECK_EQUAL(deterministicExp2(0x2901bda5), 0x1e0fcf09);
    BOOST_CHECK_EQUAL(deterministicExp2(0x196a8489), 0x123cc6f8);
    BOOST_CHECK_EQUAL(deterministicExp2(0x9a19b128), 0x848caaea);
    BOOST_CHECK_EQUAL(deterministicExp2(0x0398cca8), 0x02815e0a);
    BOOST_CHECK_EQUAL(deterministicExp2(0xbef03f61), 0xad4da3d5);
    BOOST_CHECK_EQUAL(deterministicExp2(0x102e1734), 0x0b76e599);
    BOOST_CHECK_EQUAL(deterministicExp2(0xf363cf7b), 0xeed050f5);
    BOOST_CHECK_EQUAL(deterministicExp2(0x82c00c2d), 0x6cbe9fc1);
    BOOST_CHECK_EQUAL(deterministicExp2(0xcffbcde3), 0xc194a25a);
    BOOST_CHECK_EQUAL(deterministicExp2(0x18d6f2fe), 0x11cf4a02);
    BOOST_CHECK_EQUAL(deterministicExp2(0xde1ea615), 0xd31f327e);
    BOOST_CHECK_EQUAL(deterministicExp2(0x0e96d48f), 0x0a509911);
    BOOST_CHECK_EQUAL(deterministicExp2(0x378fa034), 0x298f481e);
    BOOST_CHECK_EQUAL(deterministicExp2(0x857061ec), 0x6f68e4c5);
    BOOST_CHECK_EQUAL(deterministicExp2(0xc8408fdd), 0xb8445ebf);
    BOOST_CHECK_EQUAL(deterministicExp2(0x09c3db93), 0x06dbe12d);
    BOOST_CHECK_EQUAL(deterministicExp2(0x128598df), 0x0d2a6e92);
    BOOST_CHECK_EQUAL(deterministicExp2(0x7fa9d335), 0x69b57700);
    BOOST_CHECK_EQUAL(deterministicExp2(0x1177f216), 0x0c6630f5);
    BOOST_CHECK_EQUAL(deterministicExp2(0xa7b1dfcd), 0x931e2c0c);
    BOOST_CHECK_EQUAL(deterministicExp2(0xb0be2271), 0x9d1d8e6c);
    BOOST_CHECK_EQUAL(deterministicExp2(0x665c61aa), 0x51c21b91);
    BOOST_CHECK_EQUAL(deterministicExp2(0xe4472200), 0xdaf9d24c);
    BOOST_CHECK_EQUAL(deterministicExp2(0x9ba928c3), 0x8631cfcc);
    BOOST_CHECK_EQUAL(deterministicExp2(0xd1464a98), 0xc327a2cc);
    BOOST_CHECK_EQUAL(deterministicExp2(0x64a0901d), 0x502d2df6);
    BOOST_CHECK_EQUAL(deterministicExp2(0x636df03b), 0x4f16881e);
    BOOST_CHECK_EQUAL(deterministicExp2(0x61bf5d3f), 0x4d90c410);
    BOOST_CHECK_EQUAL(deterministicExp2(0xa8bf3caa), 0x944498b4);
    BOOST_CHECK_EQUAL(deterministicExp2(0x683ed475), 0x537c7131);
    BOOST_CHECK_EQUAL(deterministicExp2(0xb375673c), 0xa02a1e57);
    BOOST_CHECK_EQUAL(deterministicExp2(0xcd1e7fa3), 0xbe1b716f);
    BOOST_CHECK_EQUAL(deterministicExp2(0x8d064b3f), 0x7708af2d);
    BOOST_CHECK_EQUAL(deterministicExp2(0x83148fe1), 0x6d122064);
    BOOST_CHECK_EQUAL(deterministicExp2(0xbee2c2b4), 0xad3df6c9);
    BOOST_CHECK_EQUAL(deterministicExp2(0x8f39659e), 0x794630af);
    BOOST_CHECK_EQUAL(deterministicExp2(0x0cc3e1a5), 0x0900b8f2);
    BOOST_CHECK_EQUAL(deterministicExp2(0xc41798fb), 0xb355fb23);
    BOOST_CHECK_EQUAL(deterministicExp2(0x4dc8ef08), 0x3c03bab6);
    BOOST_CHECK_EQUAL(deterministicExp2(0x00171815), 0x00100270);
    BOOST_CHECK_EQUAL(deterministicExp2(0xdb6c9075), 0xcfb99180);
    BOOST_CHECK_EQUAL(deterministicExp2(0x13cd960c), 0x0e19e23a);
    BOOST_CHECK_EQUAL(deterministicExp2(0x9e19dd37), 0x88c7fe4a);
    BOOST_CHECK_EQUAL(deterministicExp2(0x3afa11d6), 0x2c53111d);
    BOOST_CHECK_EQUAL(deterministicExp2(0x03867141), 0x0274851a);
    BOOST_CHECK_EQUAL(deterministicExp2(0x65b991fe), 0x512d57a0);
    BOOST_CHECK_EQUAL(deterministicExp2(0x8960fee9), 0x7359a24d);
    BOOST_CHECK_EQUAL(deterministicExp2(0x06302a65), 0x04534f70);
    BOOST_CHECK_EQUAL(deterministicExp2(0x9ab4e776), 0x85301748);
    BOOST_CHECK_EQUAL(deterministicExp2(0xd5c11fed), 0xc8a9149c);
    BOOST_CHECK_EQUAL(deterministicExp2(0xcd325145), 0xbe33626d);
    BOOST_CHECK_EQUAL(deterministicExp2(0x45dd5919), 0x354f4f40);
    BOOST_CHECK_EQUAL(deterministicExp2(0xa5074b00), 0x9037d404);
    BOOST_CHECK_EQUAL(deterministicExp2(0x19139f48), 0x11fc48dc);
    BOOST_CHECK_EQUAL(deterministicExp2(0x0ef74095), 0x0a962932);
    BOOST_CHECK_EQUAL(deterministicExp2(0x6d1ae43b), 0x57fb888b);
    BOOST_CHECK_EQUAL(deterministicExp2(0x021946f0), 0x017578d9);
    BOOST_CHECK_EQUAL(deterministicExp2(0xcae745a8), 0xbb7059dd);
    BOOST_CHECK_EQUAL(deterministicExp2(0x47572522), 0x368c57ef);
    BOOST_CHECK_EQUAL(deterministicExp2(0x576843af), 0x445b2880);
    BOOST_CHECK_EQUAL(deterministicExp2(0x5b5734e9), 0x47d4359b);
    BOOST_CHECK_EQUAL(deterministicExp2(0xb504a24a), 0xa1eced3c);
    BOOST_CHECK_EQUAL(deterministicExp2(0xa99c6f97), 0x95370102);
    BOOST_CHECK_EQUAL(deterministicExp2(0xd63094c2), 0xc932f907);
    BOOST_CHECK_EQUAL(deterministicExp2(0x8339e407), 0x6d370833);
    BOOST_CHECK_EQUAL(deterministicExp2(0x79056f7b), 0x63430c57);
    BOOST_CHECK_EQUAL(deterministicExp2(0xee327961), 0xe7e7c8fb);
    BOOST_CHECK_EQUAL(deterministicExp2(0x89c5e1a0), 0x73bf2027);
    BOOST_CHECK_EQUAL(deterministicExp2(0x1f28adf5), 0x1688f169);
    BOOST_CHECK_EQUAL(deterministicExp2(0x74abd815), 0x5f1a2852);

    // Check a ton of random values.
    MMIXLinearCongruentialGenerator lcg;
    for (int i = 0; i < 100000; i++) {
        static constexpr int64_t POW2_32 = int64_t(1) << 32;

        const uint32_t n = lcg.next();
        const double d = double(n) / POW2_32;

        const double computed = double(deterministicExp2(n)) / POW2_32;
        const double expected = exp2(d) - 1;

        BOOST_CHECK(fabs(computed - expected) < 0.0000000075);
    }
}

BOOST_AUTO_TEST_CASE(target_block_time_test) {
    const auto chainParams = CreateChainParams(*m_node.args, ChainType::MAIN);
    const auto &params = chainParams->GetConsensus();

    const int nHeight = 100000;
    const int64_t expectedBlockTime =
        nHeight * params.nPowTargetSpacing + chainParams->GenesisBlock().nTime;

    CBlockIndex block;
    block.nHeight = nHeight;
    block.nTime = expectedBlockTime;

    // When block come on schedule, the block time is what we expect.
    BOOST_CHECK_EQUAL(computeTargetBlockTime(&block, *chainParams),
                      params.nPowTargetSpacing);

    // As block come later and later, the block time we target gets shorter.
    int64_t currentTarget = params.nPowTargetSpacing;
    std::vector<int> downSteps = {
        2910, 2916, 2921, 2925, 2931, 2935, 2941, 2945, 2950, 2955, 2961,
        2965, 2970, 2976, 2980, 2986, 2991, 2995, 3001, 3007, 3011, 3016,
        3022, 3027, 3033, 3037, 3043, 3048, 3054, 3059, 3064, 3069, 3076,
        3080, 3086, 3091, 3097, 3103, 3107, 3114, 3119, 3124, 3131, 3135,
        3142, 3147, 3153, 3158, 3165, 3170, 3175, 3182, 3187, 3194, 3199,
        3205, 3210, 3217, 3223, 3228, 3235, 3241, 3246, 3253, 3259, 3265,
    };

    for (int step : downSteps) {
        currentTarget--;
        for (int i = 0; i < step; i++) {
            block.nTime++;
            BOOST_CHECK_EQUAL(computeTargetBlockTime(&block, *chainParams),
                              currentTarget);
        }
    }

    // Now we reached saturation and the targeted block time will stay where it
    // is.
    currentTarget--;
    for (int i = 0; i < 10000; i++) {
        block.nTime++;
        BOOST_CHECK_EQUAL(computeTargetBlockTime(&block, *chainParams),
                          currentTarget);
    }

    // As block come sooner and sooner, the block time we target gets longer.
    block.nTime = expectedBlockTime;
    currentTarget = params.nPowTargetSpacing;
    std::vector<int> upSteps = {
        2906, 2901, 2896, 2892, 2887, 2882, 2877, 2873, 2867, 2864, 2858,
        2854, 2849, 2844, 2840, 2835, 2831, 2826, 2822, 2816, 2813, 2808,
        2803, 2799, 2794, 2790, 2786, 2781, 2776, 2772, 2768, 2764, 2759,
        2754, 2751, 2746, 2741, 2738, 2733, 2729, 2724, 2721, 2716, 2711,
        2708, 2704, 2699, 2695, 2691, 2687, 2682, 2679, 2674, 2671, 2666,
        2662, 2658, 2655, 2650, 2646, 2642, 2638, 2634, 2630, 2626, 2622,
        2619, 2614, 2611, 2606, 2603, 2599, 2594, 2592,
    };

    for (int step : upSteps) {
        for (int i = 0; i < step; i++) {
            block.nTime--;
            BOOST_CHECK_EQUAL(computeTargetBlockTime(&block, *chainParams),
                              currentTarget);
        }
        currentTarget++;
    }

    // Now we reached saturation and the targeted block time will stay where it
    // is.
    for (int i = 0; i < 10000; i++) {
        block.nTime--;
        BOOST_CHECK_EQUAL(computeTargetBlockTime(&block, *chainParams),
                          currentTarget);
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

BOOST_AUTO_TEST_CASE(grasberg_test) {
    const auto chainParams = CreateChainParams(*m_node.args, ChainType::MAIN);
    const auto &params = chainParams->GetConsensus();

    std::vector<CBlockIndex> blocks(3000);

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

    // Check that we can use Grasberg directly from genesis.
    CBlockHeader blkHeaderDummy;
    uint32_t nBits =
        GetNextGrasbergWorkRequired(&blocks[0], &blkHeaderDummy, *chainParams);
    BOOST_CHECK_EQUAL(nBits, 0x1c100195);

    // Mine several blocks and check the difficulty.
    size_t h = 1;

    // Mine regular 600s blocks.
    std::vector<uint32_t> diffs = {
        0x1c10032b, 0x1c1004c1, 0x1c100658, 0x1c1007ef, 0x1c100986, 0x1c100b1d,
        0x1c100cb4, 0x1c100e4b, 0x1c100fe3, 0x1c10117b, 0x1c101313, 0x1c1014ab,
        0x1c101643, 0x1c1017db, 0x1c101974, 0x1c101b0d, 0x1c101ca6, 0x1c101e3f,
        0x1c101fd8, 0x1c102171, 0x1c10230a, 0x1c1024a4, 0x1c10263e, 0x1c1027d8,
        0x1c102972, 0x1c102b0c, 0x1c102ca6, 0x1c102e41, 0x1c102fdc, 0x1c103177,
        0x1c103312, 0x1c1034ad, 0x1c103648, 0x1c1037e4, 0x1c103980, 0x1c103b1c,
        0x1c103cb8, 0x1c103e54, 0x1c103ff0, 0x1c10418c, 0x1c104329, 0x1c1044c6,
        0x1c104663, 0x1c104800, 0x1c10499d, 0x1c104b3a, 0x1c104cd8, 0x1c104e76,
        0x1c105014, 0x1c1051b2, 0x1c105350, 0x1c1054ee, 0x1c10568d, 0x1c10582c,
        0x1c1059cb, 0x1c105b6a, 0x1c105d09, 0x1c105ea8, 0x1c106048, 0x1c1061e8,
        0x1c106388, 0x1c106528, 0x1c1066c8, 0x1c106868, 0x1c106a09, 0x1c106baa,
        0x1c106d4b, 0x1c106eec, 0x1c10708d, 0x1c10722e, 0x1c1073cf, 0x1c107571,
        0x1c107713, 0x1c1078b5, 0x1c107a57, 0x1c107bf9, 0x1c107d9b, 0x1c107f3e,
        0x1c1080e1, 0x1c108284, 0x1c108427, 0x1c1085ca, 0x1c10876d, 0x1c108911,
        0x1c108ab5, 0x1c108c59, 0x1c108dfd, 0x1c108fa1, 0x1c109145, 0x1c1092ea,
        0x1c10948f, 0x1c109634, 0x1c1097d9, 0x1c10997e, 0x1c109b23, 0x1c109cc9,
        0x1c109e6f, 0x1c10a015, 0x1c10a1bb, 0x1c10a361, 0x1c10a507, 0x1c10a6ae,
        0x1c10a855, 0x1c10a9fc, 0x1c10aba3, 0x1c10ad4a, 0x1c10aef1, 0x1c10b099,
        0x1c10b241, 0x1c10b3e9, 0x1c10b591, 0x1c10b739, 0x1c10b8e1, 0x1c10ba8a,
        0x1c10bc33, 0x1c10bddc, 0x1c10bf85, 0x1c10c12e, 0x1c10c2d7, 0x1c10c480,
        0x1c10c62a, 0x1c10c7d4, 0x1c10c97e, 0x1c10cb28, 0x1c10ccd2, 0x1c10ce7c,
        0x1c10d027, 0x1c10d1d2, 0x1c10d37d, 0x1c10d528, 0x1c10d6d3, 0x1c10d87e,
        0x1c10da2a, 0x1c10dbd6, 0x1c10dd82, 0x1c10df2e, 0x1c10e0da, 0x1c10e286,
        0x1c10e433, 0x1c10e5e0, 0x1c10e78d, 0x1c10e93a, 0x1c10eae7, 0x1c10ec94,
        0x1c10ee42, 0x1c10eff0, 0x1c10f19e, 0x1c10f34c, 0x1c10f4fa, 0x1c10f6a8,
        0x1c10f857, 0x1c10fa06, 0x1c10fbb5, 0x1c10fd64, 0x1c10ff13, 0x1c1100c2,
        0x1c110272, 0x1c110422, 0x1c1105d2, 0x1c110782, 0x1c110932, 0x1c110ae2,
        0x1c110c93, 0x1c110e44, 0x1c110ff5, 0x1c1111a6, 0x1c111357, 0x1c111508,
        0x1c1116ba, 0x1c11186c, 0x1c111a1e, 0x1c111bd0, 0x1c111d82, 0x1c111f34,
        0x1c1120e7, 0x1c11229a, 0x1c11244d, 0x1c112600, 0x1c1127b3, 0x1c112967,
        0x1c112b1b, 0x1c112ccf, 0x1c112e83, 0x1c113037, 0x1c1131eb, 0x1c1133a0,
        0x1c113555, 0x1c11370a, 0x1c1138bf, 0x1c113a74, 0x1c113c29, 0x1c113ddf,
        0x1c113f95, 0x1c11414b, 0x1c114301, 0x1c1144b7, 0x1c11466d, 0x1c114824,
        0x1c1149db, 0x1c114b92, 0x1c114d49, 0x1c114f00, 0x1c1150b7, 0x1c11526f,
        0x1c115427, 0x1c1155df, 0x1c115797, 0x1c11594f, 0x1c115b07, 0x1c115cc0,
        0x1c115e79, 0x1c116032, 0x1c1161eb, 0x1c1163a4, 0x1c11655d, 0x1c116717,
        0x1c1168d1, 0x1c116a8b, 0x1c116c45, 0x1c116dff, 0x1c116fb9, 0x1c117174,
        0x1c11732f, 0x1c1174ea, 0x1c1176a5, 0x1c117860, 0x1c117a1c, 0x1c117bd8,
        0x1c117d94, 0x1c117f50, 0x1c11810c, 0x1c1182c8, 0x1c118485, 0x1c118642,
        0x1c1187ff, 0x1c1189bc, 0x1c118b79, 0x1c118d36, 0x1c118ef4, 0x1c1190b2,
        0x1c119270, 0x1c11942e, 0x1c1195ec, 0x1c1197aa, 0x1c119969, 0x1c119b28,
        0x1c119ce7, 0x1c119ea6, 0x1c11a065, 0x1c11a224, 0x1c11a3e4, 0x1c11a5a4,
        0x1c11a764, 0x1c11a924, 0x1c11aae4, 0x1c11aca5, 0x1c11ae66, 0x1c11b027,
        0x1c11b1e8, 0x1c11b3a9, 0x1c11b56a, 0x1c11b72c, 0x1c11b8ee, 0x1c11bab0,
        0x1c11bc72, 0x1c11be34, 0x1c11bff6, 0x1c11c1b9, 0x1c11c37c, 0x1c11c53f,
        0x1c11c702, 0x1c11c8c5, 0x1c11ca88, 0x1c11cc4c, 0x1c11ce10, 0x1c11cfd4,
        0x1c11d198, 0x1c11d35c, 0x1c11d521, 0x1c11d6e6, 0x1c11d8ab, 0x1c11da70,
        0x1c11dc35, 0x1c11ddfa, 0x1c11dfc0, 0x1c11e186, 0x1c11e34c, 0x1c11e512,
        0x1c11e6d8, 0x1c11e89e, 0x1c11ea65, 0x1c11ec2c, 0x1c11edf3, 0x1c11efba,
        0x1c11f181, 0x1c11f349, 0x1c11f511, 0x1c11f6d9, 0x1c11f8a1, 0x1c11fa69,
    };

    for (uint32_t expected : diffs) {
        blocks[h] = GetBlockIndex(&blocks[h - 1], 600, nBits);
        nBits = GetNextGrasbergWorkRequired(&blocks[h], &blkHeaderDummy,
                                            *chainParams);
        BOOST_CHECK_EQUAL(nBits, expected);
        h++;
    }

    // Mine faster to raise difficulty.
    diffs = {
        0x1c11eee4, 0x1c11e366, 0x1c11d7f0, 0x1c11cc81, 0x1c11c119, 0x1c11b5b9,
        0x1c11aa60, 0x1c119f0e, 0x1c1193c3, 0x1c118880, 0x1c117d44, 0x1c11720f,
        0x1c1166e1, 0x1c115bba, 0x1c11509a, 0x1c114582, 0x1c113a71, 0x1c112f67,
        0x1c112464, 0x1c111968, 0x1c110e73, 0x1c110385, 0x1c10f89e, 0x1c10edbe,
        0x1c10e2e5, 0x1c10d813, 0x1c10cd48, 0x1c10c284, 0x1c10b7c7, 0x1c10ad11,
        0x1c10a261, 0x1c1097b8, 0x1c108d16, 0x1c10827b, 0x1c1077e7, 0x1c106d59,
        0x1c1062d2, 0x1c105852, 0x1c104dd9, 0x1c104366, 0x1c1038fa, 0x1c102e95,
        0x1c102436, 0x1c1019de, 0x1c100f8d, 0x1c100542, 0x1c0ffafe, 0x1c0ff0c0,
        0x1c0fe689, 0x1c0fdc59, 0x1c0fd22f, 0x1c0fc80c, 0x1c0fbdef, 0x1c0fb3d9,
        0x1c0fa9c9, 0x1c0f9fc0, 0x1c0f95bd, 0x1c0f8bc0, 0x1c0f81ca, 0x1c0f77da,
        0x1c0f6df0, 0x1c0f640d, 0x1c0f5a30, 0x1c0f5059, 0x1c0f4689, 0x1c0f3cbf,
        0x1c0f32fb, 0x1c0f293e, 0x1c0f1f87, 0x1c0f15d6, 0x1c0f0c2b, 0x1c0f0286,
        0x1c0ef8e8, 0x1c0eef50, 0x1c0ee5be, 0x1c0edc32, 0x1c0ed2ac, 0x1c0ec92c,
        0x1c0ebfb2, 0x1c0eb63e, 0x1c0eacd1, 0x1c0ea36a, 0x1c0e9a09, 0x1c0e90ae,
        0x1c0e8759, 0x1c0e7e0a, 0x1c0e74c1, 0x1c0e6b7d, 0x1c0e623f, 0x1c0e5907,
        0x1c0e4fd5, 0x1c0e46a9, 0x1c0e3d83, 0x1c0e3463, 0x1c0e2b49, 0x1c0e2235,
        0x1c0e1926, 0x1c0e101d, 0x1c0e071a, 0x1c0dfe1d, 0x1c0df526, 0x1c0dec34,
        0x1c0de348, 0x1c0dda62, 0x1c0dd181, 0x1c0dc8a6, 0x1c0dbfd1, 0x1c0db701,
        0x1c0dae37, 0x1c0da573, 0x1c0d9cb4, 0x1c0d93fb, 0x1c0d8b47, 0x1c0d8299,
        0x1c0d79f1, 0x1c0d714e, 0x1c0d68b1, 0x1c0d6019, 0x1c0d5787, 0x1c0d4efa,
        0x1c0d4673, 0x1c0d3df1, 0x1c0d3575, 0x1c0d2cfe, 0x1c0d248c, 0x1c0d1c20,
        0x1c0d13b9, 0x1c0d0b58, 0x1c0d02fc, 0x1c0cfaa5, 0x1c0cf254, 0x1c0cea08,
        0x1c0ce1c1, 0x1c0cd980, 0x1c0cd144, 0x1c0cc90d, 0x1c0cc0dc, 0x1c0cb8b0,
        0x1c0cb089, 0x1c0ca867, 0x1c0ca04a, 0x1c0c9833, 0x1c0c9021, 0x1c0c8814,
        0x1c0c800c, 0x1c0c7809, 0x1c0c700b, 0x1c0c6813, 0x1c0c6020, 0x1c0c5832,
        0x1c0c5049, 0x1c0c4865, 0x1c0c4086, 0x1c0c38ac, 0x1c0c30d7, 0x1c0c2907,
        0x1c0c213c, 0x1c0c1976, 0x1c0c11b5, 0x1c0c09f9, 0x1c0c0242, 0x1c0bfa90,
        0x1c0bf2e3, 0x1c0beb3b, 0x1c0be398, 0x1c0bdbfa, 0x1c0bd460, 0x1c0bcccb,
        0x1c0bc53b, 0x1c0bbdb0, 0x1c0bb62a, 0x1c0baea9, 0x1c0ba72c, 0x1c0b9fb4,
        0x1c0b9841, 0x1c0b90d3, 0x1c0b896a, 0x1c0b8205, 0x1c0b7aa5, 0x1c0b734a,
        0x1c0b6bf3, 0x1c0b64a1, 0x1c0b5d54, 0x1c0b560c, 0x1c0b4ec8, 0x1c0b4789,
        0x1c0b404f, 0x1c0b3919, 0x1c0b31e8, 0x1c0b2abb, 0x1c0b2393, 0x1c0b1c70,
        0x1c0b1551, 0x1c0b0e37, 0x1c0b0721, 0x1c0b0010, 0x1c0af903, 0x1c0af1fb,
        0x1c0aeaf7, 0x1c0ae3f8, 0x1c0adcfd, 0x1c0ad607, 0x1c0acf15, 0x1c0ac828,
        0x1c0ac13f, 0x1c0aba5b, 0x1c0ab37b, 0x1c0aac9f, 0x1c0aa5c8, 0x1c0a9ef5,
        0x1c0a9827, 0x1c0a915d, 0x1c0a8a97, 0x1c0a83d6, 0x1c0a7d19, 0x1c0a7660,
        0x1c0a6fac, 0x1c0a68fc, 0x1c0a6250, 0x1c0a5ba8, 0x1c0a5505, 0x1c0a4e66,
        0x1c0a47cb, 0x1c0a4134, 0x1c0a3aa2, 0x1c0a3414, 0x1c0a2d8a, 0x1c0a2704,
        0x1c0a2082, 0x1c0a1a05, 0x1c0a138c, 0x1c0a0d17, 0x1c0a06a6, 0x1c0a0039,
        0x1c09f9d0, 0x1c09f36b, 0x1c09ed0a, 0x1c09e6ae, 0x1c09e056, 0x1c09da02,
        0x1c09d3b2, 0x1c09cd66, 0x1c09c71e, 0x1c09c0da, 0x1c09ba9a, 0x1c09b45e,
        0x1c09ae26, 0x1c09a7f2, 0x1c09a1c2, 0x1c099b96, 0x1c09956e, 0x1c098f4a,
        0x1c09892a, 0x1c09830d, 0x1c097cf4, 0x1c0976df, 0x1c0970ce, 0x1c096ac1,
        0x1c0964b8, 0x1c095eb3, 0x1c0958b2, 0x1c0952b5, 0x1c094cbb, 0x1c0946c5,
        0x1c0940d3, 0x1c093ae5, 0x1c0934fb, 0x1c092f14, 0x1c092931, 0x1c092352,
        0x1c091d77, 0x1c09179f, 0x1c0911cb, 0x1c090bfb, 0x1c09062f, 0x1c090066,
        0x1c08faa1, 0x1c08f4e0, 0x1c08ef22, 0x1c08e968, 0x1c08e3b2, 0x1c08de00,
        0x1c08d851, 0x1c08d2a6, 0x1c08ccfe, 0x1c08c75a, 0x1c08c1ba, 0x1c08bc1d,
        0x1c08b684, 0x1c08b0ee, 0x1c08ab5c, 0x1c08a5ce, 0x1c08a043, 0x1c089abc,
        0x1c089538, 0x1c088fb8, 0x1c088a3b, 0x1c0884c2, 0x1c087f4c, 0x1c0879da,
    };

    for (uint32_t expected : diffs) {
        blocks[h] = GetBlockIndex(&blocks[h - 1], 100, nBits);
        nBits = GetNextGrasbergWorkRequired(&blocks[h], &blkHeaderDummy,
                                            *chainParams);
        BOOST_CHECK_EQUAL(nBits, expected);
        h++;
    }

    // Mine slow blocks to lower and saturate the diffculty.
    diffs = {
        0x1c08a0b5, 0x1c08c842, 0x1c08f084, 0x1c09197f, 0x1c094336, 0x1c096dac,
        0x1c0998e4, 0x1c09c4e3, 0x1c09f1ab, 0x1c0a1f41, 0x1c0a4da8, 0x1c0a7ce3,
        0x1c0aacf7, 0x1c0adde7, 0x1c0b0fb8, 0x1c0b426d, 0x1c0b760a, 0x1c0baa94,
        0x1c0be00f, 0x1c0c167f, 0x1c0c4de9, 0x1c0c8651, 0x1c0cbfbb, 0x1c0cfa2c,
        0x1c0d35a9, 0x1c0d7237, 0x1c0dafdb, 0x1c0dee99, 0x1c0e2e77, 0x1c0e6f7a,
        0x1c0eb1a7, 0x1c0ef503, 0x1c0f3994, 0x1c0f7f5f, 0x1c0fc66a, 0x1c100ebb,
        0x1c105857, 0x1c10a345, 0x1c10ef8a, 0x1c113d2d, 0x1c118c34, 0x1c11dca5,
        0x1c122e87, 0x1c1281e0, 0x1c12d6b7, 0x1c132d13, 0x1c1384fb, 0x1c13de76,
        0x1c14398b, 0x1c149642, 0x1c14f4a2, 0x1c1554b3, 0x1c15b67c, 0x1c161a05,
        0x1c167f57, 0x1c16e679, 0x1c174f74, 0x1c17ba50, 0x1c182716, 0x1c1895cf,
        0x1c190683, 0x1c19793c, 0x1c19ee03, 0x1c1a64e1, 0x1c1adde0, 0x1c1b590a,
        0x1c1bd668, 0x1c1c5605, 0x1c1cd7eb, 0x1c1d5c25, 0x1c1de2bd, 0x1c1e6bbe,
        0x1c1ef733, 0x1c1f8527, 0x1c2015a6, 0x1c20a8bb, 0x1c213e73, 0x1c21d6d9,
        0x1c2271fa, 0x1c230fe2, 0x1c23b09e, 0x1c24543a, 0x1c24fac5, 0x1c25a44b,
        0x1c2650da, 0x1c270080, 0x1c27b34b, 0x1c28694a, 0x1c29228b, 0x1c29df1e,
        0x1c2a9f11, 0x1c2b6274, 0x1c2c2957, 0x1c2cf3ca, 0x1c2dc1dd, 0x1c2e93a0,
        0x1c2f6925, 0x1c30427d, 0x1c311fb9, 0x1c3200eb, 0x1c32e626, 0x1c33cf7c,
        0x1c34bcff, 0x1c35aec3, 0x1c36a4db, 0x1c379f5c, 0x1c389e59, 0x1c39a1e7,
        0x1c3aaa1b, 0x1c3bb70a, 0x1c3cc8ca, 0x1c3ddf71, 0x1c3efb15, 0x1c401bcd,
        0x1c4141b1, 0x1c426cd8, 0x1c439d5b, 0x1c44d352, 0x1c460ed6, 0x1c475000,
        0x1c4896ea, 0x1c49e3af, 0x1c4b366a, 0x1c4c8f35, 0x1c4dee2d, 0x1c4f536e,
        0x1c50bf15, 0x1c52313f, 0x1c53aa0a, 0x1c552994, 0x1c56affc, 0x1c583d62,
        0x1c59d1e6, 0x1c5b6da8, 0x1c5d10ca, 0x1c5ebb6d, 0x1c606db4, 0x1c6227c2,
        0x1c63e9bb, 0x1c65b3c2, 0x1c6785fd, 0x1c696091, 0x1c6b43a5, 0x1c6d2f60,
        0x1c6f23e9, 0x1c712169, 0x1c732808, 0x1c7537f1, 0x1c77514e, 0x1c79744a,
        0x1c7ba112, 0x1c7dd7d2, 0x1d008018, 0x1d008263, 0x1d0084b8, 0x1d008718,
        0x1d008983, 0x1d008bf9, 0x1d008e7a, 0x1d009107, 0x1d00939f, 0x1d009643,
        0x1d0098f3, 0x1d009bb0, 0x1d009e79, 0x1d00a14f, 0x1d00a432, 0x1d00a722,
        0x1d00aa20, 0x1d00ad2b, 0x1d00b044, 0x1d00b36c, 0x1d00b6a2, 0x1d00b9e7,
        0x1d00bd3b, 0x1d00c09e, 0x1d00c411, 0x1d00c793, 0x1d00cb25, 0x1d00cec8,
        0x1d00d27b, 0x1d00d63f, 0x1d00da15, 0x1d00ddfc, 0x1d00e1f5, 0x1d00e600,
        0x1d00ea1e, 0x1d00ee4f, 0x1d00f293, 0x1d00f6eb, 0x1d00fb56, 0x1d00ffd6,
        0x1d00ffff, 0x1d00ffff, 0x1d00ffff, 0x1d00ffff, 0x1d00ffff, 0x1d00ffff,
        0x1d00ffff, 0x1d00ffff,
    };

    for (uint32_t expected : diffs) {
        blocks[h] = GetBlockIndex(&blocks[h - 1], 3600, nBits);
        nBits = GetNextGrasbergWorkRequired(&blocks[h], &blkHeaderDummy,
                                            *chainParams);
        BOOST_CHECK_EQUAL(nBits, expected);
        h++;
    }

    // We floored the difficulty.
    BOOST_CHECK_EQUAL(nBits, powLimitBits);

    // Check for 0 solve time.
    diffs = {
        0x1d00ff35, 0x1d00fe6b, 0x1d00fda2, 0x1d00fcda, 0x1d00fc12, 0x1d00fb4b,
        0x1d00fa84, 0x1d00f9be, 0x1d00f8f9, 0x1d00f834, 0x1d00f770, 0x1d00f6ac,
        0x1d00f5e9, 0x1d00f527, 0x1d00f465, 0x1d00f3a4, 0x1d00f2e3, 0x1d00f223,
        0x1d00f164, 0x1d00f0a5, 0x1d00efe7, 0x1d00ef29, 0x1d00ee6c, 0x1d00edb0,
        0x1d00ecf4, 0x1d00ec39, 0x1d00eb7e, 0x1d00eac4, 0x1d00ea0a, 0x1d00e951,
        0x1d00e899, 0x1d00e7e1, 0x1d00e72a, 0x1d00e673, 0x1d00e5bd, 0x1d00e507,
        0x1d00e452, 0x1d00e39d, 0x1d00e2e9, 0x1d00e236, 0x1d00e183, 0x1d00e0d1,
        0x1d00e01f, 0x1d00df6e, 0x1d00debd, 0x1d00de0d, 0x1d00dd5d, 0x1d00dcae,
        0x1d00dc00, 0x1d00db52, 0x1d00daa5, 0x1d00d9f8, 0x1d00d94c, 0x1d00d8a0,
        0x1d00d7f5, 0x1d00d74a, 0x1d00d6a0, 0x1d00d5f6, 0x1d00d54d, 0x1d00d4a4,
        0x1d00d3fc, 0x1d00d354, 0x1d00d2ad, 0x1d00d206, 0x1d00d160, 0x1d00d0ba,
        0x1d00d015, 0x1d00cf70, 0x1d00cecc, 0x1d00ce28, 0x1d00cd85, 0x1d00cce2,
        0x1d00cc40, 0x1d00cb9e, 0x1d00cafd, 0x1d00ca5c, 0x1d00c9bc, 0x1d00c91c,
        0x1d00c87d, 0x1d00c7de, 0x1d00c740, 0x1d00c6a2, 0x1d00c605, 0x1d00c568,
        0x1d00c4cc, 0x1d00c430, 0x1d00c395, 0x1d00c2fa, 0x1d00c260, 0x1d00c1c6,
        0x1d00c12d, 0x1d00c094, 0x1d00bffc, 0x1d00bf64, 0x1d00becd, 0x1d00be36,
        0x1d00bda0, 0x1d00bd0a, 0x1d00bc74, 0x1d00bbdf, 0x1d00bb4a, 0x1d00bab6,
        0x1d00ba22, 0x1d00b98f, 0x1d00b8fc, 0x1d00b86a, 0x1d00b7d8, 0x1d00b747,
        0x1d00b6b6, 0x1d00b625, 0x1d00b595, 0x1d00b505, 0x1d00b476, 0x1d00b3e7,
        0x1d00b359, 0x1d00b2cb, 0x1d00b23e, 0x1d00b1b1, 0x1d00b124, 0x1d00b098,
        0x1d00b00c, 0x1d00af81, 0x1d00aef6, 0x1d00ae6c, 0x1d00ade2, 0x1d00ad58,
        0x1d00accf, 0x1d00ac46, 0x1d00abbe, 0x1d00ab36, 0x1d00aaaf, 0x1d00aa28,
        0x1d00a9a1, 0x1d00a91b, 0x1d00a895, 0x1d00a810, 0x1d00a78b, 0x1d00a706,
        0x1d00a682, 0x1d00a5fe, 0x1d00a57b, 0x1d00a4f8, 0x1d00a475, 0x1d00a3f3,
        0x1d00a371, 0x1d00a2f0, 0x1d00a26f, 0x1d00a1ee, 0x1d00a16e, 0x1d00a0ee,
        0x1d00a06f, 0x1d009ff0, 0x1d009f71, 0x1d009ef3, 0x1d009e75, 0x1d009df8,
        0x1d009d7b, 0x1d009cfe, 0x1d009c82, 0x1d009c06, 0x1d009b8a, 0x1d009b0f,
        0x1d009a94, 0x1d009a1a, 0x1d0099a0, 0x1d009926, 0x1d0098ad, 0x1d009834,
        0x1d0097bc, 0x1d009744, 0x1d0096cc, 0x1d009655, 0x1d0095de, 0x1d009567,
        0x1d0094f1, 0x1d00947b, 0x1d009405, 0x1d009390, 0x1d00931b, 0x1d0092a7,
        0x1d009233, 0x1d0091bf, 0x1d00914c, 0x1d0090d9, 0x1d009066, 0x1d008ff4,
        0x1d008f82, 0x1d008f10, 0x1d008e9f, 0x1d008e2e, 0x1d008dbd, 0x1d008d4d,
        0x1d008cdd, 0x1d008c6d, 0x1d008bfe, 0x1d008b8f, 0x1d008b20, 0x1d008ab2,
        0x1d008a44, 0x1d0089d6, 0x1d008969, 0x1d0088fc, 0x1d00888f, 0x1d008823,
        0x1d0087b7, 0x1d00874b, 0x1d0086e0, 0x1d008675, 0x1d00860a, 0x1d0085a0,
        0x1d008536, 0x1d0084cc, 0x1d008463, 0x1d0083fa, 0x1d008391, 0x1d008329,
        0x1d0082c1, 0x1d008259, 0x1d0081f2, 0x1d00818b, 0x1d008124, 0x1d0080be,
        0x1d008058, 0x1c7ff2cf, 0x1c7f8dee, 0x1c7f295d, 0x1c7ec51b, 0x1c7e6128,
        0x1c7dfd84, 0x1c7d9a2e, 0x1c7d3727, 0x1c7cd46e, 0x1c7c7202, 0x1c7c0fe4,
        0x1c7bae13, 0x1c7b4c90, 0x1c7aeb59, 0x1c7a8a6f, 0x1c7a29d1, 0x1c79c980,
        0x1c79697b, 0x1c7909c1, 0x1c78aa53, 0x1c784b30, 0x1c77ec58, 0x1c778dcb,
        0x1c772f88, 0x1c76d190, 0x1c7673e2, 0x1c76167e, 0x1c75b963, 0x1c755c92,
        0x1c75000a, 0x1c74a3cb, 0x1c7447d4, 0x1c73ec26, 0x1c7390c0, 0x1c7335a2,
        0x1c72dacc, 0x1c72803e, 0x1c7225f7, 0x1c71cbf7, 0x1c71723e, 0x1c7118cc,
        0x1c70bfa1, 0x1c7066bc, 0x1c700e1d, 0x1c6fb5c4, 0x1c6f5db1, 0x1c6f05e3,
        0x1c6eae5a, 0x1c6e5716, 0x1c6e0017, 0x1c6da95d, 0x1c6d52e7, 0x1c6cfcb5,
        0x1c6ca6c7, 0x1c6c511d, 0x1c6bfbb6, 0x1c6ba693, 0x1c6b51b3, 0x1c6afd16,
        0x1c6aa8bb, 0x1c6a54a3, 0x1c6a00cd, 0x1c69ad39, 0x1c6959e7, 0x1c6906d7,
        0x1c68b408, 0x1c68617b, 0x1c680f2f, 0x1c67bd24, 0x1c676b59, 0x1c6719cf,
        0x1c66c885, 0x1c66777b, 0x1c6626b1, 0x1c65d627, 0x1c6585dc, 0x1c6535d1,
    };

    for (uint32_t expected : diffs) {
        blocks[h] = GetBlockIndex(&blocks[h - 1], 0, nBits);
        nBits = GetNextGrasbergWorkRequired(&blocks[h], &blkHeaderDummy,
                                            *chainParams);
        BOOST_CHECK_EQUAL(nBits, expected);
        h++;
    }

    // Check for negative solve time.
    diffs = {
        0x1c64d713, 0x1c6478ae, 0x1c641aa1, 0x1c63bcec, 0x1c635f8f, 0x1c630289,
        0x1c62a5da, 0x1c624982, 0x1c61ed81, 0x1c6191d6, 0x1c613681, 0x1c60db81,
        0x1c6080d6, 0x1c602680, 0x1c5fcc7f, 0x1c5f72d2, 0x1c5f1979, 0x1c5ec073,
        0x1c5e67c1, 0x1c5e0f62, 0x1c5db756, 0x1c5d5f9c, 0x1c5d0834, 0x1c5cb11e,
        0x1c5c5a59, 0x1c5c03e6, 0x1c5badc4, 0x1c5b57f2, 0x1c5b0271, 0x1c5aad40,
        0x1c5a585e, 0x1c5a03cc, 0x1c59af89, 0x1c595b95, 0x1c5907ef, 0x1c58b498,
        0x1c58618f, 0x1c580ed3, 0x1c57bc65, 0x1c576a44, 0x1c571870, 0x1c56c6e9,
        0x1c5675ae, 0x1c5624bf, 0x1c55d41c, 0x1c5583c4, 0x1c5533b7, 0x1c54e3f5,
        0x1c54947e, 0x1c544551, 0x1c53f66e, 0x1c53a7d5, 0x1c535986, 0x1c530b80,
        0x1c52bdc3, 0x1c52704f, 0x1c522323, 0x1c51d640, 0x1c5189a5, 0x1c513d51,
        0x1c50f145, 0x1c50a580, 0x1c505a02, 0x1c500ecb, 0x1c4fc3da, 0x1c4f792f,
        0x1c4f2eca, 0x1c4ee4ab, 0x1c4e9ad1, 0x1c4e513c, 0x1c4e07ec, 0x1c4dbee1,
        0x1c4d761a, 0x1c4d2d97, 0x1c4ce558, 0x1c4c9d5d, 0x1c4c55a5, 0x1c4c0e30,
        0x1c4bc6fe, 0x1c4b800f, 0x1c4b3962, 0x1c4af2f7, 0x1c4aacce, 0x1c4a66e7,
        0x1c4a2141, 0x1c49dbdc, 0x1c4996b8, 0x1c4951d5, 0x1c490d33, 0x1c48c8d1,
        0x1c4884af, 0x1c4840cd, 0x1c47fd2a, 0x1c47b9c7, 0x1c4776a3, 0x1c4733bd,
        0x1c46f116, 0x1c46aead, 0x1c466c83, 0x1c462a97, 0x1c45e8e8, 0x1c45a777,
        0x1c456643, 0x1c45254c, 0x1c44e492, 0x1c44a414, 0x1c4463d3, 0x1c4423ce,
        0x1c43e405, 0x1c43a478, 0x1c436526, 0x1c43260f, 0x1c42e733, 0x1c42a892,
        0x1c426a2c, 0x1c422c00, 0x1c41ee0f, 0x1c41b057, 0x1c4172d9, 0x1c413595,
        0x1c40f88a, 0x1c40bbb8, 0x1c407f1f, 0x1c4042bf, 0x1c400697, 0x1c3fcaa8,
        0x1c3f8ef1, 0x1c3f5372, 0x1c3f182a, 0x1c3edd1a, 0x1c3ea241, 0x1c3e679f,
        0x1c3e2d34, 0x1c3df300, 0x1c3db902, 0x1c3d7f3b, 0x1c3d45aa, 0x1c3d0c4f,
        0x1c3cd329, 0x1c3c9a39, 0x1c3c617e, 0x1c3c28f8, 0x1c3bf0a7, 0x1c3bb88b,
        0x1c3b80a3, 0x1c3b48f0, 0x1c3b1171, 0x1c3ada26, 0x1c3aa30f, 0x1c3a6c2b,
        0x1c3a357b, 0x1c39fefe, 0x1c39c8b4, 0x1c39929d, 0x1c395cb8, 0x1c392706,
        0x1c38f186, 0x1c38bc38, 0x1c38871c, 0x1c385232, 0x1c381d79, 0x1c37e8f1,
        0x1c37b49b, 0x1c378076, 0x1c374c81, 0x1c3718bd, 0x1c36e52a, 0x1c36b1c7,
        0x1c367e94, 0x1c364b91, 0x1c3618be, 0x1c35e61a, 0x1c35b3a6, 0x1c358161,
        0x1c354f4b, 0x1c351d64, 0x1c34ebab, 0x1c34ba21, 0x1c3488c5, 0x1c345798,
        0x1c342699, 0x1c33f5c7, 0x1c33c523, 0x1c3394ad, 0x1c336464, 0x1c333448,
        0x1c330459, 0x1c32d497, 0x1c32a502, 0x1c327599, 0x1c32465d, 0x1c32174d,
        0x1c31e869, 0x1c31b9b1, 0x1c318b25, 0x1c315cc4, 0x1c312e8f, 0x1c310085,
        0x1c30d2a6, 0x1c30a4f2, 0x1c307769, 0x1c304a0a, 0x1c301cd6, 0x1c2fefcc,
        0x1c2fc2ec, 0x1c2f9636, 0x1c2f69aa, 0x1c2f3d48, 0x1c2f110f, 0x1c2ee500,
        0x1c2eb91a, 0x1c2e8d5d, 0x1c2e61c9, 0x1c2e365e, 0x1c2e0b1b, 0x1c2de001,
        0x1c2db50f, 0x1c2d8a46, 0x1c2d5fa5, 0x1c2d352b, 0x1c2d0ad9, 0x1c2ce0af,
        0x1c2cb6ac, 0x1c2c8cd1, 0x1c2c631d, 0x1c2c3990, 0x1c2c102a, 0x1c2be6ea,
        0x1c2bbdd1, 0x1c2b94df, 0x1c2b6c13, 0x1c2b436d, 0x1c2b1aed, 0x1c2af293,
        0x1c2aca5f, 0x1c2aa250, 0x1c2a7a67, 0x1c2a52a3, 0x1c2a2b05, 0x1c2a038c,
        0x1c29dc38, 0x1c29b508, 0x1c298dfd, 0x1c296717, 0x1c294055, 0x1c2919b7,
        0x1c28f33d, 0x1c28cce7, 0x1c28a6b5, 0x1c2880a7, 0x1c285abd, 0x1c2834f6,
        0x1c280f53, 0x1c27e9d3, 0x1c27c476, 0x1c279f3c, 0x1c277a25, 0x1c275530,
        0x1c27305e, 0x1c270baf, 0x1c26e722, 0x1c26c2b7, 0x1c269e6e, 0x1c267a47,
        0x1c265642, 0x1c26325f, 0x1c260e9d, 0x1c25eafd, 0x1c25c77e, 0x1c25a420,
        0x1c2580e3, 0x1c255dc7, 0x1c253acc, 0x1c2517f2, 0x1c24f539, 0x1c24d2a0,
        0x1c24b028, 0x1c248dd0, 0x1c246b98, 0x1c244980, 0x1c242788, 0x1c2405b0,
        0x1c23e3f7, 0x1c23c25e, 0x1c23a0e4, 0x1c237f8a, 0x1c235e4f, 0x1c233d33,
        0x1c231c36, 0x1c22fb58, 0x1c22da99, 0x1c22b9f8, 0x1c229976, 0x1c227912,
        0x1c2258cd, 0x1c2238a6, 0x1c22189d, 0x1c21f8b2, 0x1c21d8e5, 0x1c21b936,
    };

    for (uint32_t expected : diffs) {
        blocks[h] = GetBlockIndex(&blocks[h - 1], -100, nBits);
        nBits = GetNextGrasbergWorkRequired(&blocks[h], &blkHeaderDummy,
                                            *chainParams);
        BOOST_CHECK_EQUAL(nBits, expected);
        h++;
    }

    // Check for absurd solve time.
    blocks[h] = GetBlockIndex(&blocks[h - 1], -3900000, nBits);
    nBits = GetNextGrasbergWorkRequired(&blocks[h++], &blkHeaderDummy,
                                        *chainParams);
    BOOST_CHECK_EQUAL(nBits, 0x1821b936);

    blocks[h] = GetBlockIndex(&blocks[h - 1], -5000000, nBits);
    nBits = GetNextGrasbergWorkRequired(&blocks[h++], &blkHeaderDummy,
                                        *chainParams);
    BOOST_CHECK_EQUAL(nBits, 0x1421b936);

    blocks[h] = GetBlockIndex(&blocks[h - 1], 3900000, nBits);
    nBits = GetNextGrasbergWorkRequired(&blocks[h++], &blkHeaderDummy,
                                        *chainParams);
    BOOST_CHECK_EQUAL(nBits, 0x1821b936);

    blocks[h] = GetBlockIndex(&blocks[h - 1], 5000000, nBits);
    nBits = GetNextGrasbergWorkRequired(&blocks[h++], &blkHeaderDummy,
                                        *chainParams);
    BOOST_CHECK_EQUAL(nBits, 0x1c21b936);

    blocks[h] = GetBlockIndex(&blocks[h - 1], 9000000, nBits);
    nBits = GetNextGrasbergWorkRequired(&blocks[h++], &blkHeaderDummy,
                                        *chainParams);
    BOOST_CHECK_EQUAL(nBits, 0x1d00ffff);
}

BOOST_AUTO_TEST_CASE(testnet_difficulty_drop_test) {
    const auto chainParams =
        CreateChainParams(*m_node.args, ChainType::TESTNET);
    const auto &params = chainParams->GetConsensus();

    std::vector<CBlockIndex> blocks(3000);

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

    // Check that we can use Grasberg directly from genesis.
    CBlockHeader blkHeaderDummy;
    uint32_t nBits =
        GetNextGrasbergWorkRequired(&blocks[0], &blkHeaderDummy, *chainParams);
    BOOST_CHECK_EQUAL(nBits, 0x1c0ffe3e);

    // Up to 20 mins, difficulty is unchanged.
    blkHeaderDummy.nTime = blocks[0].nTime + 2 * params.nPowTargetSpacing;
    nBits =
        GetNextGrasbergWorkRequired(&blocks[0], &blkHeaderDummy, *chainParams);
    BOOST_CHECK_EQUAL(nBits, 0x1c0ffe3e);

    // After 20 mins, difficulty drops.
    blkHeaderDummy.nTime++;
    nBits =
        GetNextGrasbergWorkRequired(&blocks[0], &blkHeaderDummy, *chainParams);
    BOOST_CHECK_EQUAL(nBits, powLimitBits);

    // Mine several blocks and check the difficulty.
    size_t h = 1;

    std::vector<uint32_t> diffs = {
        0x1c100c81, 0x1c101ad2, 0x1c10292f, 0x1c103799, 0x1c104610,
        0x1c105494, 0x1c106325, 0x1c1071c2, 0x1c10806d, 0x1c108f25,
    };

    // Mine several blocks at minimal difficulty. Block is skipped to compute
    // the next difficulty.
    for (uint32_t expected : diffs) {
        blocks[h] = GetBlockIndex(
            &blocks[h - 1], 2 * params.nPowTargetSpacing + 1, powLimitBits);
        nBits = GetNextGrasbergWorkRequired(&blocks[h++], &blkHeaderDummy,
                                            *chainParams);
        BOOST_CHECK_EQUAL(nBits, expected);
    }

    // Mine one block at regular difficulty, it will now be the new reference
    // when skipping over low difficulty blocks.
    blocks[h] = GetBlockIndex(&blocks[h - 1], 600, nBits);
    nBits = GetNextGrasbergWorkRequired(&blocks[h++], &blkHeaderDummy,
                                        *chainParams);
    BOOST_CHECK_EQUAL(nBits, 0x1c108d54);

    diffs = {
        0x1c109c17, 0x1c10aae8, 0x1c10b9c6, 0x1c10c8b1, 0x1c10d7a9,
        0x1c10e6af, 0x1c10f5c2, 0x1c1104e2, 0x1c111410, 0x1c11234c,
    };

    // As we mine more blocks with low difficulty, we use our new reference.
    for (uint32_t expected : diffs) {
        blocks[h] = GetBlockIndex(
            &blocks[h - 1], 2 * params.nPowTargetSpacing + 1, powLimitBits);
        nBits = GetNextGrasbergWorkRequired(&blocks[h++], &blkHeaderDummy,
                                            *chainParams);
        BOOST_CHECK_EQUAL(nBits, expected);
    }
}

BOOST_AUTO_TEST_SUITE_END()
