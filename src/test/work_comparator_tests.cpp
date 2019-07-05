// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <blockindexworkcomparator.h>

#include <boost/test/unit_test.hpp>

BOOST_AUTO_TEST_SUITE(work_comparator_tests)

BOOST_AUTO_TEST_CASE(work_comparator) {
    CBlockIndex indexA, indexB;

    // Differing chain work
    indexA.nChainWork = 0;
    indexB.nChainWork = 1;
    for (int sequenceIdA = 1; sequenceIdA < 1024; sequenceIdA *= 2) {
        for (int sequenceIdB = 1; sequenceIdB < 1024; sequenceIdB *= 2) {
            // Differing sequenceId doesn't affect chain work
            indexA.nSequenceId = sequenceIdA;
            indexB.nSequenceId = sequenceIdB;
            BOOST_CHECK(CBlockIndexWorkComparator()(&indexA, &indexB));
        }
    }

    // Same chain work, but differing sequenceId
    indexA = CBlockIndex();
    indexB = CBlockIndex();
    for (int sequenceIdA = 1; sequenceIdA < 1024; sequenceIdA *= 2) {
        for (int sequenceIdB = 1; sequenceIdB < 1024; sequenceIdB *= 2) {
            if (sequenceIdA == sequenceIdB) {
                continue;
            }

            indexA.nSequenceId = sequenceIdA;
            indexB.nSequenceId = sequenceIdB;
            if (sequenceIdA > sequenceIdB) {
                BOOST_CHECK(CBlockIndexWorkComparator()(&indexA, &indexB));
            } else {
                BOOST_CHECK(CBlockIndexWorkComparator()(&indexB, &indexA));
            }
        }
    }

    // All else equal, so checking pointer address as final check
    std::unique_ptr<CBlockIndex> pindexA(new CBlockIndex());
    std::unique_ptr<CBlockIndex> pindexB(new CBlockIndex());
    if (pindexA < pindexB) {
        BOOST_CHECK(CBlockIndexWorkComparator()(pindexB.get(), pindexA.get()));
    } else {
        BOOST_CHECK(CBlockIndexWorkComparator()(pindexA.get(), pindexB.get()));
    }

    // Same block should return false
    BOOST_CHECK(!CBlockIndexWorkComparator()(pindexA.get(), pindexA.get()));
}

BOOST_AUTO_TEST_SUITE_END()
