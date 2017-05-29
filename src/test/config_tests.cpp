// Copyright (c) 2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "config.h"
#include "consensus/consensus.h"
#include "test/test_bitcoin.h"

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(config_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(max_block_size) {
    GlobalConfig config;

    // Too small.
    BOOST_CHECK(!config.SetMaxBlockSize(0));
    BOOST_CHECK(!config.SetMaxBlockSize(12345));
    BOOST_CHECK(!config.SetMaxBlockSize(DEFAULT_MAX_BLOCK_SIZE - 1));

    // DEFAULT_MAX_BLOCK_SIZE
    BOOST_CHECK(config.SetMaxBlockSize(DEFAULT_MAX_BLOCK_SIZE));
    BOOST_CHECK_EQUAL(config.GetMaxBlockSize(), DEFAULT_MAX_BLOCK_SIZE);

    // 2MB
    BOOST_CHECK(config.SetMaxBlockSize(2 * 1000 * 1000));
    BOOST_CHECK_EQUAL(config.GetMaxBlockSize(), 2 * 1000 * 1000);

    // 8MB
    BOOST_CHECK(config.SetMaxBlockSize(8 * 1000 * 1000));
    BOOST_CHECK_EQUAL(config.GetMaxBlockSize(), 8 * 1000 * 1000);

    // Invalid size keep config.
    BOOST_CHECK(!config.SetMaxBlockSize(54321));
    BOOST_CHECK_EQUAL(config.GetMaxBlockSize(), 8 * 1000 * 1000);
}

BOOST_AUTO_TEST_SUITE_END()
