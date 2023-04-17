// Copyright (c) 2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <config.h>

#include <chainparams.h>
#include <consensus/consensus.h>
#include <util/chaintype.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(config_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(max_block_size) {
    GlobalConfig config;

    // Too small.
    BOOST_CHECK(!config.SetMaxBlockSize(0));
    BOOST_CHECK(!config.SetMaxBlockSize(12345));
    BOOST_CHECK(!config.SetMaxBlockSize(LEGACY_MAX_BLOCK_SIZE - 1));
    BOOST_CHECK(!config.SetMaxBlockSize(LEGACY_MAX_BLOCK_SIZE));

    // LEGACY_MAX_BLOCK_SIZE + 1
    BOOST_CHECK(config.SetMaxBlockSize(LEGACY_MAX_BLOCK_SIZE + 1));
    BOOST_CHECK_EQUAL(config.GetMaxBlockSize(), LEGACY_MAX_BLOCK_SIZE + 1);

    // 2MB
    BOOST_CHECK(config.SetMaxBlockSize(2 * ONE_MEGABYTE));
    BOOST_CHECK_EQUAL(config.GetMaxBlockSize(), 2 * ONE_MEGABYTE);

    // 8MB
    BOOST_CHECK(config.SetMaxBlockSize(8 * ONE_MEGABYTE));
    BOOST_CHECK_EQUAL(config.GetMaxBlockSize(), 8 * ONE_MEGABYTE);

    // Invalid size keep config.
    BOOST_CHECK(!config.SetMaxBlockSize(54321));
    BOOST_CHECK_EQUAL(config.GetMaxBlockSize(), 8 * ONE_MEGABYTE);

    // Setting it back down
    BOOST_CHECK(config.SetMaxBlockSize(7 * ONE_MEGABYTE));
    BOOST_CHECK_EQUAL(config.GetMaxBlockSize(), 7 * ONE_MEGABYTE);
    BOOST_CHECK(config.SetMaxBlockSize(ONE_MEGABYTE + 1));
    BOOST_CHECK_EQUAL(config.GetMaxBlockSize(), ONE_MEGABYTE + 1);
}

BOOST_AUTO_TEST_CASE(chain_params) {
    GlobalConfig config;

    // Global config is consistent with params.
    SelectParams(ChainType::MAIN);
    BOOST_CHECK_EQUAL(&Params(), &config.GetChainParams());

    SelectParams(ChainType::TESTNET);
    BOOST_CHECK_EQUAL(&Params(), &config.GetChainParams());

    SelectParams(ChainType::REGTEST);
    BOOST_CHECK_EQUAL(&Params(), &config.GetChainParams());
}

BOOST_AUTO_TEST_SUITE_END()
