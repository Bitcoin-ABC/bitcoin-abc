// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "chain.h"
#include "test/test_bitcoin.h"

#include <boost/test/unit_test.hpp>

#include <set>

BOOST_FIXTURE_TEST_SUITE(blockstatus_tests, BasicTestingSetup)

static void CheckBlockStatus(const BlockStatus s, BlockValidity validity,
                             bool hasData, bool hasUndo, bool hasFailed,
                             bool hasFailedParent) {
    BOOST_CHECK(s.getValidity() == validity);
    BOOST_CHECK_EQUAL(s.hasData(), hasData);
    BOOST_CHECK_EQUAL(s.hasUndo(), hasUndo);
    BOOST_CHECK_EQUAL(s.hasFailed(), hasFailed);
    BOOST_CHECK_EQUAL(s.hasFailedParent(), hasFailedParent);
    BOOST_CHECK_EQUAL(s.isInvalid(), hasFailed || hasFailedParent);
}

BOOST_AUTO_TEST_CASE(sighash_construction_test) {
    // Check default values.
    CheckBlockStatus(BlockStatus(), BlockValidity::UNKNOWN, false, false, false,
                     false);

    // Check all possible permutations.
    std::set<BlockValidity> baseValidities{
        BlockValidity::UNKNOWN, BlockValidity::HEADER,
        BlockValidity::TREE,    BlockValidity::TRANSACTIONS,
        BlockValidity::CHAIN,   BlockValidity::SCRIPTS};
    std::set<bool> hasDataValues{false, true};
    std::set<bool> hasUndoValues{false, true};
    std::set<bool> hasFailedValues{false, true};
    std::set<bool> hasFailedParentValues{false, true};

    for (BlockValidity validity : baseValidities) {
        for (bool hasData : hasDataValues) {
            for (bool hasUndo : hasUndoValues) {
                for (bool hasFailed : hasFailedValues) {
                    for (bool hasFailedParent : hasFailedParentValues) {
                        const BlockStatus s =
                            BlockStatus()
                                .withValidity(validity)
                                .withData(hasData)
                                .withUndo(hasUndo)
                                .withFailed(hasFailed)
                                .withFailedParent(hasFailedParent);

                        CheckBlockStatus(s, validity, hasData, hasUndo,
                                         hasFailed, hasFailedParent);

                        // Clears failure flags.
                        CheckBlockStatus(s.withClearedFailureFlags(), validity,
                                         hasData, hasUndo, false, false);

                        // Also check all possible alterations.
                        CheckBlockStatus(s.withData(hasData), validity, hasData,
                                         hasUndo, hasFailed, hasFailedParent);
                        CheckBlockStatus(s.withData(!hasData), validity,
                                         !hasData, hasUndo, hasFailed,
                                         hasFailedParent);
                        CheckBlockStatus(s.withUndo(hasUndo), validity, hasData,
                                         hasUndo, hasFailed, hasFailedParent);
                        CheckBlockStatus(s.withUndo(!hasUndo), validity,
                                         hasData, !hasUndo, hasFailed,
                                         hasFailedParent);
                        CheckBlockStatus(s.withFailed(hasFailed), validity,
                                         hasData, hasUndo, hasFailed,
                                         hasFailedParent);
                        CheckBlockStatus(s.withFailed(!hasFailed), validity,
                                         hasData, hasUndo, !hasFailed,
                                         hasFailedParent);
                        CheckBlockStatus(s.withFailedParent(hasFailedParent),
                                         validity, hasData, hasUndo, hasFailed,
                                         hasFailedParent);
                        CheckBlockStatus(s.withFailedParent(!hasFailedParent),
                                         validity, hasData, hasUndo, hasFailed,
                                         !hasFailedParent);

                        for (BlockValidity newValidity : baseValidities) {
                            CheckBlockStatus(s.withValidity(newValidity),
                                             newValidity, hasData, hasUndo,
                                             hasFailed, hasFailedParent);
                        }
                    }
                }
            }
        }
    }
}

BOOST_AUTO_TEST_SUITE_END()
