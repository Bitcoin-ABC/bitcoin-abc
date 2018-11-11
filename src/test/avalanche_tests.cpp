// Copyright (c) 2010 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "avalanche_impl.h"

#include "test/test_bitcoin.h"

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(avalanche_tests, BasicTestingSetup)

#define REGISTER_VOTE_AND_CHECK(vr, vote, state, finalized, confidence)        \
    vr.registerVote(vote);                                                     \
    BOOST_CHECK_EQUAL(vr.isValid(), state);                                    \
    BOOST_CHECK_EQUAL(vr.hasFinalized(), finalized);                           \
    BOOST_CHECK_EQUAL(vr.getConfidence(), confidence);

BOOST_AUTO_TEST_CASE(vote_record) {
    VoteRecord vr;

    // Check initial state.
    BOOST_CHECK_EQUAL(vr.isValid(), false);
    BOOST_CHECK_EQUAL(vr.hasFinalized(), false);
    BOOST_CHECK_EQUAL(vr.getConfidence(), 0);

    // We register one vote for, which keep things at 4/4.
    REGISTER_VOTE_AND_CHECK(vr, true, false, false, 0);

    // One more and we are at 5/3.
    REGISTER_VOTE_AND_CHECK(vr, true, false, false, 0);

    // One more and we are at 5/3.
    REGISTER_VOTE_AND_CHECK(vr, true, false, false, 0);

    // One more and we are at 6/2.
    REGISTER_VOTE_AND_CHECK(vr, true, false, false, 0);

    // One more and we are at 6/2.
    REGISTER_VOTE_AND_CHECK(vr, true, false, false, 0);

    // Next vote will flip state, and confidence will increase as long as we
    // vote yes.
    for (int i = 0; i < AVALANCHE_FINALIZATION_SCORE; i++) {
        REGISTER_VOTE_AND_CHECK(vr, true, true, false, i);
    }

    // The next vote will finalize the decision.
    REGISTER_VOTE_AND_CHECK(vr, false, true, true,
                            AVALANCHE_FINALIZATION_SCORE);

    // Now that we have two no votes, confidence stop increasing.
    for (int i = 0; i < 5; i++) {
        REGISTER_VOTE_AND_CHECK(vr, false, true, true,
                                AVALANCHE_FINALIZATION_SCORE);
    }

    // Next vote will flip state, and confidence will increase as long as we
    // vote no.
    for (int i = 0; i < AVALANCHE_FINALIZATION_SCORE; i++) {
        REGISTER_VOTE_AND_CHECK(vr, false, false, false, i);
    }

    // The next vote will finalize the decision.
    REGISTER_VOTE_AND_CHECK(vr, true, false, true,
                            AVALANCHE_FINALIZATION_SCORE);
}

BOOST_AUTO_TEST_SUITE_END()
