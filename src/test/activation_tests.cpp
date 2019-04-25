// Copyright (c) 2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chain.h>
#include <chainparams.h>
#include <config.h>
#include <consensus/activation.h>

#include <test/test_bitcoin.h>

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(activation_tests, BasicTestingSetup)

static void SetMTP(std::array<CBlockIndex, 12> &blocks, int64_t mtp) {
    size_t len = blocks.size();

    for (size_t i = 0; i < len; ++i) {
        blocks[i].nTime = mtp + (i - (len / 2));
    }

    assert(blocks.back().GetMedianTimePast() == mtp);
}

BOOST_AUTO_TEST_CASE(isgreatwallenabled) {
    DummyConfig config;
    CBlockIndex prev;

    const auto activation =
        config.GetChainParams().GetConsensus().greatWallActivationTime;

    BOOST_CHECK(!IsGreatWallEnabled(config, nullptr));

    std::array<CBlockIndex, 12> blocks;
    for (size_t i = 1; i < blocks.size(); ++i) {
        blocks[i].pprev = &blocks[i - 1];
    }

    SetMTP(blocks, activation - 1);
    BOOST_CHECK(!IsGreatWallEnabled(config, &blocks.back()));

    SetMTP(blocks, activation);
    BOOST_CHECK(IsGreatWallEnabled(config, &blocks.back()));

    SetMTP(blocks, activation + 1);
    BOOST_CHECK(IsGreatWallEnabled(config, &blocks.back()));
}

BOOST_AUTO_TEST_CASE(isgravitonenabled) {
    DummyConfig config;
    CBlockIndex prev;

    const auto activation =
        config.GetChainParams().GetConsensus().gravitonActivationTime;

    BOOST_CHECK(!IsGravitonEnabled(config, nullptr));

    std::array<CBlockIndex, 12> blocks;
    for (size_t i = 1; i < blocks.size(); ++i) {
        blocks[i].pprev = &blocks[i - 1];
    }

    SetMTP(blocks, activation - 1);
    BOOST_CHECK(!IsGravitonEnabled(config, &blocks.back()));

    SetMTP(blocks, activation);
    BOOST_CHECK(IsGravitonEnabled(config, &blocks.back()));

    SetMTP(blocks, activation + 1);
    BOOST_CHECK(IsGravitonEnabled(config, &blocks.back()));
}

BOOST_AUTO_TEST_SUITE_END()
