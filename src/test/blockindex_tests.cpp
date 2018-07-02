// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "chain.h"
#include "uint256.h"

#include "test/test_bitcoin.h"

#include <boost/test/unit_test.hpp>
#include <limits>

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

BOOST_AUTO_TEST_CASE(get_disk_positions) {
    // Test against all validity values
    std::set<BlockValidity> validityValues{
        BlockValidity::UNKNOWN, BlockValidity::HEADER,
        BlockValidity::TREE,    BlockValidity::TRANSACTIONS,
        BlockValidity::CHAIN,   BlockValidity::SCRIPTS};
    for (BlockValidity validity : validityValues) {
        // Test against all combinations of data and undo flags
        for (int flags = 0; flags <= 0x03; flags++) {
            // Generate some values to test against
            const int expectedFile = flags * 123;
            const unsigned int expectedDataPosition = flags * 234;
            const unsigned int expectedUndoPosition = flags * 345;

            CBlockIndex index;
            index.nStatus = index.nStatus.withValidity(BlockValidity(validity));

            // All combinations of data and undo
            if (flags & 0x01) {
                index.nStatus = index.nStatus.withData();
                index.nFile = expectedFile;
                index.nDataPos = expectedDataPosition;
            }
            if (flags & 0x02) {
                index.nStatus = index.nStatus.withUndo();
                index.nFile = expectedFile;
                index.nUndoPos = expectedUndoPosition;
            }

            // Data and undo positions should be unmodified
            CDiskBlockPos dataPosition = index.GetBlockPos();
            if (flags & 0x01) {
                BOOST_CHECK(dataPosition.nFile == expectedFile);
                BOOST_CHECK(dataPosition.nPos == expectedDataPosition);
            } else {
                BOOST_CHECK(dataPosition == CDiskBlockPos());
            }

            CDiskBlockPos undoPosition = index.GetUndoPos();
            if (flags & 0x02) {
                BOOST_CHECK(undoPosition.nFile == expectedFile);
                BOOST_CHECK(undoPosition.nPos == expectedUndoPosition);
            } else {
                BOOST_CHECK(undoPosition == CDiskBlockPos());
            }
        }
    }
}

BOOST_AUTO_TEST_CASE(received_time) {
    // Set to UINT32_MAX because that's the maximum value header.nTime can hold
    const int64_t expectedBlockTime = std::numeric_limits<uint32_t>::max();

    CBlockHeader header;
    header.nTime = uint32_t(expectedBlockTime);

    CBlockIndex index = CBlockIndex(header);

    // nTimeReceived defaults to block time
    BOOST_CHECK(index.nTimeReceived == expectedBlockTime);

    // nTimeReceived can be updated to the actual received time, which may
    // be before or after the miner's time.
    for (int64_t receivedTime = expectedBlockTime - 10;
         // Make sure that receivedTime is tested beyond 32-bit values.
         receivedTime <= expectedBlockTime + 10; receivedTime++) {
        index.nTimeReceived = receivedTime;
        BOOST_CHECK(index.GetBlockTime() == expectedBlockTime);
        BOOST_CHECK(index.GetHeaderReceivedTime() == receivedTime);
        BOOST_CHECK(index.GetReceivedTimeDiff() ==
                    receivedTime - expectedBlockTime);
    }
}

BOOST_AUTO_TEST_SUITE_END()
