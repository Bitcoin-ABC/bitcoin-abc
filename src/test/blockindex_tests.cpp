// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "chain.h"
#include "uint256.h"

#include "test/test_bitcoin.h"

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(blockindex_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(get_block_header) {
    const int32_t expectedVersion = 4;
    const uint256 expectedMerkleRoot = uint256();
    const uint32_t expectedBlockTime = 123;
    const uint32_t expectedDifficultyBits = 234;
    const uint32_t expectedNonce = 345;

    CBlockHeader header;
    header.nVersion = expectedVersion;
    header.hashMerkleRoot = expectedMerkleRoot;
    header.nTime = expectedBlockTime;
    header.nBits = expectedDifficultyBits;
    header.nNonce = expectedNonce;

    CBlockIndex index = CBlockIndex(header);

    CBlockHeader checkHeader = index.GetBlockHeader();
    BOOST_CHECK(checkHeader.nVersion == expectedVersion);
    BOOST_CHECK(checkHeader.hashMerkleRoot == expectedMerkleRoot);
    BOOST_CHECK(checkHeader.nTime == expectedBlockTime);
    BOOST_CHECK(checkHeader.nBits == expectedDifficultyBits);
    BOOST_CHECK(checkHeader.nNonce == expectedNonce);
}

BOOST_AUTO_TEST_SUITE_END()
