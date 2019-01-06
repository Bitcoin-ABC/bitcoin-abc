// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <blockvalidity.h>
#include <chain.h>
#include <uint256.h>

#include <test/test_bitcoin.h>

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

BOOST_AUTO_TEST_CASE(get_block_hash) {
    CBlockIndex index = CBlockIndex();

    /* Test with all 0 hash */
    const uint256 zeroHash = uint256();
    index.phashBlock = &zeroHash;
    uint256 hash = index.GetBlockHash();
    BOOST_CHECK(hash == zeroHash);

    /* Test with a random hash */
    std::vector<uint8_t> hashBytes(32);

    std::generate(hashBytes.begin(), hashBytes.end(),
                  []() { return uint8_t(rand() % 255); });

    const uint256 randomHash = uint256(hashBytes);
    index.phashBlock = &randomHash;
    hash = index.GetBlockHash();
    BOOST_CHECK(hash == randomHash);
}

BOOST_AUTO_TEST_CASE(received_time) {
    // Set to UINT32_MAX because that's the maximum value header.nTime can hold
    const int64_t expectedBlockTime = std::numeric_limits<uint32_t>::max();

    CBlockHeader header;
    header.nTime = uint32_t(expectedBlockTime);

    CBlockIndex index = CBlockIndex(header);

    // nTimeReceived defaults to 0
    BOOST_CHECK_EQUAL(index.nTimeReceived, 0);

    // nTimeReceived can be updated to the actual received time, which may
    // be before or after the miner's time.
    for (int64_t receivedTime = expectedBlockTime - 10;
         // Make sure that receivedTime is tested beyond 32-bit values.
         receivedTime <= expectedBlockTime + 10; receivedTime++) {
        index.nTimeReceived = receivedTime;
        BOOST_CHECK_EQUAL(index.GetBlockTime(), expectedBlockTime);
        BOOST_CHECK_EQUAL(index.GetHeaderReceivedTime(), receivedTime);
        BOOST_CHECK_EQUAL(index.GetReceivedTimeDiff(),
                          receivedTime - expectedBlockTime);
    }
}

BOOST_AUTO_TEST_CASE(median_time_past) {
    std::array<CBlockIndex, 12> indices;

    // times in this test are pairs of <blockTime, MTP>

    // Check that MTP is correctly calculated for all cases when block times
    // are consecutive and greater than previous block times:
    // 1) All cases where the number of blocks is < 11
    // 2) The case where the number of blocks is exactly 11
    // 3) The case where the number of blocks is > 11 (but only 11 are used to
    //    calculate MTP.
    std::array<std::pair<int, int>, 12> times = {{{0, 0},
                                                  {1, 1},
                                                  {2, 1},
                                                  {4, 2},
                                                  {4, 2},
                                                  {5, 4},
                                                  {7, 4},
                                                  {10, 4},
                                                  {12, 4},
                                                  {14, 5},
                                                  {17, 5},
                                                  {20, 7}}};
    for (size_t i = 0; i < indices.size(); i++) {
        indices[i].nTime = times[i].first;
        if (i > 0) {
            indices[i].pprev = &indices[i - 1];
        }

        BOOST_CHECK(indices[i].GetMedianTimePast() == times[i].second);
    }

    // Test against non-consecutive block times
    std::array<std::pair<int, int>, 12> times2 = {{{0, 0},
                                                   {0, 0},
                                                   {1, 0},
                                                   {3, 1},
                                                   {2, 1},
                                                   {3, 2},
                                                   {4, 2},
                                                   {5, 3},
                                                   {6, 3},
                                                   {7, 3},
                                                   {8, 3},
                                                   {9, 4}}};
    for (size_t i = 0; i < indices.size(); i++) {
        indices[i].nTime = times2[i].first;
        BOOST_CHECK(indices[i].GetMedianTimePast() == times2[i].second);
    }
}

BOOST_AUTO_TEST_CASE(to_string) {
    CBlockHeader header = CBlockHeader();
    header.hashMerkleRoot = uint256();

    CBlockIndex index = CBlockIndex(header);
    const uint256 hashBlock = uint256();
    index.phashBlock = &hashBlock;
    index.nHeight = 123;

    CBlockIndex indexPrev = CBlockIndex();

    std::string expectedString = "";
    std::string indexString = "";

    /* CASE 1 : pprev is null */
    expectedString = strprintf(
        "CBlockIndex(pprev=%p, nHeight=123, "
        "merkle="
        "0000000000000000000000000000000000000000000000000000000000000000, "
        "hashBlock="
        "0000000000000000000000000000000000000000000000000000000000000000)",
        (void *)(nullptr));
    index.pprev = nullptr;
    indexString = index.ToString();
    BOOST_CHECK_EQUAL(indexString, expectedString);

    /* CASE 2 : pprev is indexPrev */
    expectedString = strprintf(
        "CBlockIndex(pprev=%p, nHeight=123, "
        "merkle="
        "0000000000000000000000000000000000000000000000000000000000000000, "
        "hashBlock="
        "0000000000000000000000000000000000000000000000000000000000000000)",
        &indexPrev);
    index.pprev = &indexPrev;
    indexString = index.ToString();
    BOOST_CHECK_EQUAL(indexString, expectedString);

    /* CASE 3 : height is max(int) */
    expectedString = strprintf(
        "CBlockIndex(pprev=%p, nHeight=2147483647, "
        "merkle="
        "0000000000000000000000000000000000000000000000000000000000000000, "
        "hashBlock="
        "0000000000000000000000000000000000000000000000000000000000000000)",
        &indexPrev);
    index.nHeight = INT32_MAX;
    indexString = index.ToString();
    BOOST_CHECK_EQUAL(indexString, expectedString);

    /* CASE 4 : set some Merkle root hash */
    expectedString = strprintf(
        "CBlockIndex(pprev=%p, nHeight=2147483647, "
        "merkle="
        "0000000000000000000000000000000000000000000000000123456789abcdef, "
        "hashBlock="
        "0000000000000000000000000000000000000000000000000000000000000000)",
        &indexPrev);
    index.hashMerkleRoot = uint256S("0123456789ABCDEF");
    indexString = index.ToString();
    BOOST_CHECK_EQUAL(indexString, expectedString);

    /* CASE 5 : set some block hash */
    expectedString = strprintf(
        "CBlockIndex(pprev=%p, nHeight=2147483647, "
        "merkle="
        "0000000000000000000000000000000000000000000000000123456789abcdef, "
        "hashBlock="
        "000000000000000000000000000000000000000000000000fedcba9876543210)",
        &indexPrev);
    const uint256 emptyHashBlock = uint256S("FEDCBA9876543210");
    index.phashBlock = &emptyHashBlock;
    indexString = index.ToString();
    BOOST_CHECK_EQUAL(indexString, expectedString);
}

BOOST_AUTO_TEST_CASE(index_validity_tests) {
    CBlockIndex index;

    // Test against all validity values
    std::set<BlockValidity> validityValues{
        BlockValidity::UNKNOWN, BlockValidity::HEADER,
        BlockValidity::TREE,    BlockValidity::TRANSACTIONS,
        BlockValidity::CHAIN,   BlockValidity::SCRIPTS};
    std::set<bool> boolValues = {false, true};
    for (BlockValidity validity : validityValues) {
        for (bool withFailed : boolValues) {
            for (bool withFailedParent : boolValues) {
                index.nStatus = BlockStatus()
                                    .withValidity(validity)
                                    .withFailed(withFailed)
                                    .withFailedParent(withFailedParent);

                for (BlockValidity validUpTo : validityValues) {
                    // Test isValidity()
                    bool isValid = index.IsValid(validUpTo);
                    if (validUpTo <= validity && !withFailed &&
                        !withFailedParent) {
                        BOOST_CHECK(isValid);
                    } else {
                        BOOST_CHECK(!isValid);
                    }

                    // Test RaiseValidity()
                    CBlockIndex indexRaiseValidity;
                    for (BlockValidity validFrom : validityValues) {
                        indexRaiseValidity.nStatus =
                            BlockStatus()
                                .withValidity(validFrom)
                                .withFailed(withFailed)
                                .withFailedParent(withFailedParent);

                        bool raisedValidity =
                            indexRaiseValidity.RaiseValidity(validUpTo);
                        if (validFrom < validUpTo && !withFailed &&
                            !withFailedParent) {
                            BOOST_CHECK(raisedValidity);
                            BOOST_CHECK(
                                indexRaiseValidity.nStatus.getValidity() ==
                                validUpTo);
                        } else {
                            BOOST_CHECK(!raisedValidity);
                            BOOST_CHECK(
                                indexRaiseValidity.nStatus.getValidity() ==
                                validFrom);
                        }
                    }
                }
            }
        }
    }
}

BOOST_AUTO_TEST_CASE(index_ancestors) {
    std::array<CBlockIndex, 256> indexes;

    /* Check the skip pointer don't build when there is no precedence */
    for (size_t i = 0; i < indexes.size(); i++) {
        indexes[i] = CBlockIndex();
        indexes[i].nHeight = i;

        indexes[i].pprev = nullptr;
        indexes[i].pskip = nullptr;

        indexes[i].BuildSkip();

        /* Check that skip not rebuilt if there is no preceding index */
        BOOST_CHECK(indexes[i].pskip == nullptr);
    }

    for (size_t i = 0; i < indexes.size(); i++) {
        if (i > 0) {
            indexes[i].pprev = &indexes[i - 1];
            indexes[i].BuildSkip();

            /* Check that skip is built */
            BOOST_CHECK(indexes[i].pskip != nullptr);

            /*
             * Starting from height 2, pskip should be more efficient that
             * pprev.
             * Ensure pskip.nHeight < pprev.nHeight
             */
            if (i > 1) {
                BOOST_CHECK(indexes[i].pskip->nHeight <
                            indexes[i].pprev->nHeight);
            }

            /* Find an ancestor 16 indexes behind */
            if (i > 16) {
                CBlockIndex *ancestor =
                    indexes[i].GetAncestor(indexes[i].nHeight - 16);
                BOOST_CHECK(ancestor != nullptr);
                BOOST_CHECK(ancestor->nHeight == (indexes[i].nHeight - 16));
            }
        }
    }

    /*
     * Reorder these indexes to setup multiple branches:
     *
     *                                     (248)->(...)->(255)
     *                                    /
     *                 (128)->(...)->(191)->(...)->(247)
     *                /
     * (0)->(...)->(63)->(...)->(127)
     */
    for (size_t i = 0; i < indexes.size(); i++) {
        /* Build the tree */
        indexes[i].pskip = nullptr;
        if (i > 0) {
            indexes[i].pprev = &indexes[i - 1];
        }
        if (i < 128) {
            indexes[i].nHeight = i;
        } else if (i < 248) {
            /* Branch at 128 */
            if (i == 128) {
                indexes[i].pprev = &indexes[63];
            }
            indexes[i].nHeight = i - 64;
        } else {
            /* Branch at 248 */
            if (i == 248) {
                indexes[i].pprev = &indexes[191];
            }
            indexes[i].nHeight = i - 128 + 8;
        }

        /* Build and test skip pointer */
        if (i > 0) {
            indexes[i].BuildSkip();

            /* Check that skip is built */
            BOOST_CHECK(indexes[i].pskip != nullptr);

            /*
             * Starting from height 2, pskip should be more efficient that
             * pprev.
             * Ensure pskip.nHeight < pprev.nHeight
             */
            if (i > 1) {
                BOOST_CHECK(indexes[i].pskip->nHeight <
                            indexes[i].pprev->nHeight);
            }
        }

        /* Find an ancestor 37 indexes behind */
        if (i > 37) {
            CBlockIndex *ancestor =
                indexes[i].GetAncestor(indexes[i].nHeight - 37);
            BOOST_CHECK(ancestor != nullptr);
            BOOST_CHECK(ancestor->nHeight == (indexes[i].nHeight - 37));
        }
    }
}

BOOST_AUTO_TEST_SUITE_END()
