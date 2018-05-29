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

static void CheckAllPermutations(const BlockStatus base, bool hasData,
                                 bool hasUndo, bool hasFailed,
                                 bool hasFailedParent) {
    // Check all possible permutations.
    std::set<BlockValidity> baseValidities{
        BlockValidity::UNKNOWN, BlockValidity::HEADER,
        BlockValidity::TREE,    BlockValidity::TRANSACTIONS,
        BlockValidity::CHAIN,   BlockValidity::SCRIPTS};

    for (BlockValidity validity : baseValidities) {
        const BlockStatus s = base.withValidity(validity);
        CheckBlockStatus(s, validity, hasData, hasUndo, hasFailed,
                         hasFailedParent);

        // Clears failure flags.
        CheckBlockStatus(s.withClearedFailureFlags(), validity, hasData,
                         hasUndo, false, false);

        // Also check all possible alterations.
        CheckBlockStatus(s.withData(true), validity, true, hasUndo, hasFailed,
                         hasFailedParent);
        CheckBlockStatus(s.withData(false), validity, false, hasUndo, hasFailed,
                         hasFailedParent);
        CheckBlockStatus(s.withUndo(true), validity, hasData, true, hasFailed,
                         hasFailedParent);
        CheckBlockStatus(s.withUndo(false), validity, hasData, false, hasFailed,
                         hasFailedParent);
        CheckBlockStatus(s.withFailed(true), validity, hasData, hasUndo, true,
                         hasFailedParent);
        CheckBlockStatus(s.withFailed(false), validity, hasData, hasUndo, false,
                         hasFailedParent);
        CheckBlockStatus(s.withFailedParent(true), validity, hasData, hasUndo,
                         hasFailed, true);
        CheckBlockStatus(s.withFailedParent(false), validity, hasData, hasUndo,
                         hasFailed, false);

        for (BlockValidity newValidity : baseValidities) {
            CheckBlockStatus(s.withValidity(newValidity), newValidity, hasData,
                             hasUndo, hasFailed, hasFailedParent);
        }
    }
}

static void CheckFailures(const BlockStatus s, bool hasData, bool hasUndo) {
    std::set<bool> hasFailedValues{false, true};
    std::set<bool> hasFailedParentValues{false, true};

    for (bool hasFailed : hasFailedValues) {
        for (bool hasFailedParent : hasFailedParentValues) {
            CheckAllPermutations(
                s.withFailed(hasFailed).withFailedParent(hasFailedParent),
                hasData, hasUndo, hasFailed, hasFailedParent);
        }
    }
}

static void CheckHaveDataAndUndo(const BlockStatus s) {
    std::set<bool> hasDataValues{false, true};
    std::set<bool> hasUndoValues{false, true};

    for (bool hasData : hasDataValues) {
        for (bool hasUndo : hasUndoValues) {
            CheckFailures(s.withData(hasData).withUndo(hasUndo), hasData,
                          hasUndo);
        }
    }
}

BOOST_AUTO_TEST_CASE(sighash_construction_test) {
    // Check default values.
    CheckBlockStatus(BlockStatus(), BlockValidity::UNKNOWN, false, false, false,
                     false);

    CheckHaveDataAndUndo(BlockStatus());
}

BOOST_AUTO_TEST_SUITE_END()
