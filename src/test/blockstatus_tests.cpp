// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "chain.h"
#include "test/test_bitcoin.h"

#include <boost/test/unit_test.hpp>

#include <set>

BOOST_FIXTURE_TEST_SUITE(blockstatus_tests, BasicTestingSetup)

static void CheckBlockStatus(BlockStatus s, BlockValidity validity,
                             bool hasData, bool hasUndo) {
    BOOST_CHECK(s.getValidity() == validity);
    BOOST_CHECK_EQUAL(s.hasData(), hasData);
    BOOST_CHECK_EQUAL(s.hasUndo(), hasUndo);
}

BOOST_AUTO_TEST_CASE(sighash_construction_test) {
    // Check default values.
    CheckBlockStatus(BlockStatus(), BlockValidity::UNKNOWN, false, false);

    // Check all possible permutations.
    std::set<BlockValidity> baseValidities{
        BlockValidity::UNKNOWN, BlockValidity::HEADER,
        BlockValidity::TREE,    BlockValidity::TRANSACTIONS,
        BlockValidity::CHAIN,   BlockValidity::SCRIPTS};
    std::set<bool> hasDataValues{false, true};
    std::set<bool> hasUndoValues{false, true};

    for (BlockValidity validity : baseValidities) {
        for (bool hasData : hasDataValues) {
            for (bool hasUndo : hasUndoValues) {
                const BlockStatus s = BlockStatus()
                                          .withValidity(validity)
                                          .withData(hasData)
                                          .withUndo(hasUndo);

                CheckBlockStatus(s, validity, hasData, hasUndo);

                // Also check all possible alterations.
                CheckBlockStatus(s.withData(hasData), validity, hasData,
                                 hasUndo);
                CheckBlockStatus(s.withData(!hasData), validity, !hasData,
                                 hasUndo);
                CheckBlockStatus(s.withUndo(hasUndo), validity, hasData,
                                 hasUndo);
                CheckBlockStatus(s.withUndo(!hasUndo), validity, hasData,
                                 !hasUndo);

                for (BlockValidity newValidity : baseValidities) {
                    CheckBlockStatus(s.withValidity(newValidity), newValidity,
                                     hasData, hasUndo);
                }
            }
        }
    }
}

BOOST_AUTO_TEST_SUITE_END()
