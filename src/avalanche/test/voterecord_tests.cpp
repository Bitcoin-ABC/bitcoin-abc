// Copyright (c) 2018-2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/voterecord.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

using namespace avalanche;

BOOST_FIXTURE_TEST_SUITE(voterecord_tests, TestingSetup)

#define REGISTER_VOTE_AND_CHECK(vr, vote, state, finalized, confidence)        \
    vr.registerVote(NO_NODE, vote);                                            \
    BOOST_CHECK_EQUAL(vr.isAccepted(), state);                                 \
    BOOST_CHECK_EQUAL(vr.hasFinalized(), finalized);                           \
    BOOST_CHECK_EQUAL(vr.getConfidence(), confidence);

BOOST_AUTO_TEST_CASE(vote_record) {
    VoteRecord vraccepted(true);

    // Check initial state.
    BOOST_CHECK_EQUAL(vraccepted.isAccepted(), true);
    BOOST_CHECK_EQUAL(vraccepted.hasFinalized(), false);
    BOOST_CHECK_EQUAL(vraccepted.getConfidence(), 0);

    VoteRecord vr(false);

    // Check initial state.
    BOOST_CHECK_EQUAL(vr.isAccepted(), false);
    BOOST_CHECK_EQUAL(vr.hasFinalized(), false);
    BOOST_CHECK_EQUAL(vr.getConfidence(), 0);

    // We need to register 6 positive votes before we start counting.
    for (int i = 0; i < 6; i++) {
        REGISTER_VOTE_AND_CHECK(vr, 0, false, false, 0);
    }

    // Next vote will flip state, and confidence will increase as long as we
    // vote yes.
    REGISTER_VOTE_AND_CHECK(vr, 0, true, false, 0);

    // A single neutral vote do not change anything.
    REGISTER_VOTE_AND_CHECK(vr, -1, true, false, 1);
    for (int i = 2; i < 8; i++) {
        REGISTER_VOTE_AND_CHECK(vr, 0, true, false, i);
    }

    // Two neutral votes will stall progress.
    REGISTER_VOTE_AND_CHECK(vr, -1, true, false, 7);
    REGISTER_VOTE_AND_CHECK(vr, -1, true, false, 7);
    for (int i = 2; i < 8; i++) {
        REGISTER_VOTE_AND_CHECK(vr, 0, true, false, 7);
    }

    // Now confidence will increase as long as we vote yes.
    for (int i = 8; i < AVALANCHE_FINALIZATION_SCORE; i++) {
        REGISTER_VOTE_AND_CHECK(vr, 0, true, false, i);
    }

    // The next vote will finalize the decision.
    REGISTER_VOTE_AND_CHECK(vr, 1, true, true, AVALANCHE_FINALIZATION_SCORE);

    // Now that we have two no votes, confidence stop increasing.
    for (int i = 0; i < 5; i++) {
        REGISTER_VOTE_AND_CHECK(vr, 1, true, true,
                                AVALANCHE_FINALIZATION_SCORE);
    }

    // Next vote will flip state, and confidence will increase as long as we
    // vote no.
    REGISTER_VOTE_AND_CHECK(vr, 1, false, false, 0);

    // A single neutral vote do not change anything.
    REGISTER_VOTE_AND_CHECK(vr, -1, false, false, 1);
    for (int i = 2; i < 8; i++) {
        REGISTER_VOTE_AND_CHECK(vr, 1, false, false, i);
    }

    // Two neutral votes will stall progress.
    REGISTER_VOTE_AND_CHECK(vr, -1, false, false, 7);
    REGISTER_VOTE_AND_CHECK(vr, -1, false, false, 7);
    for (int i = 2; i < 8; i++) {
        REGISTER_VOTE_AND_CHECK(vr, 1, false, false, 7);
    }

    // Now confidence will increase as long as we vote no.
    for (int i = 8; i < AVALANCHE_FINALIZATION_SCORE; i++) {
        REGISTER_VOTE_AND_CHECK(vr, 1, false, false, i);
    }

    // The next vote will finalize the decision.
    REGISTER_VOTE_AND_CHECK(vr, 0, false, true, AVALANCHE_FINALIZATION_SCORE);

    // Check that inflight accounting work as expected.
    VoteRecord vrinflight(false);
    for (int i = 0; i < 2 * AVALANCHE_MAX_INFLIGHT_POLL; i++) {
        bool shouldPoll = vrinflight.shouldPoll();
        BOOST_CHECK_EQUAL(shouldPoll, i < AVALANCHE_MAX_INFLIGHT_POLL);
        BOOST_CHECK_EQUAL(vrinflight.registerPoll(), shouldPoll);
    }

    // Clear various number of inflight requests and check everything behaves as
    // expected.
    for (int i = 1; i < AVALANCHE_MAX_INFLIGHT_POLL; i++) {
        vrinflight.clearInflightRequest(i);
        BOOST_CHECK(vrinflight.shouldPoll());

        for (int j = 1; j < i; j++) {
            BOOST_CHECK(vrinflight.registerPoll());
            BOOST_CHECK(vrinflight.shouldPoll());
        }

        BOOST_CHECK(vrinflight.registerPoll());
        BOOST_CHECK(!vrinflight.shouldPoll());
    }
}

namespace {
NodeId nextNodeId(NodeId &nodeid) {
    nodeid++;
    if (nodeid >= 8) {
        nodeid = 0;
    }
    return nodeid;
}
} // namespace

BOOST_AUTO_TEST_CASE(duplicate_votes) {
    VoteRecord vr(true);
    NodeId nodeid = -1;

    // Register some votes, expecting confidence to increase
    for (auto i = 0; i < 7; i++) {
        BOOST_CHECK_EQUAL(vr.getConfidence(), 0);
        BOOST_CHECK(!vr.registerVote(nextNodeId(nodeid), 0));
    }
    BOOST_CHECK_EQUAL(vr.getConfidence(), 1);

    // Multiple duplicate votes do not advance confidence
    for (auto i = 0; i < 8; i++) {
        BOOST_CHECK(!vr.registerVote(nodeid, 0));
        BOOST_CHECK_EQUAL(vr.getConfidence(), 1);
    }

    // Register more votes with duplicates mixed in. Confidence should only
    // increase when duplicates are not used.
    auto expectedConfidence = 1;
    for (auto i = 0; i < 8; i++) {
        BOOST_CHECK(!vr.registerVote(nodeid, 0));
        BOOST_CHECK_EQUAL(vr.getConfidence(), expectedConfidence);
        for (auto j = i; j < 8; j++) {
            BOOST_CHECK(!vr.registerVote(nextNodeId(nodeid), 0));
            BOOST_CHECK_EQUAL(vr.getConfidence(), ++expectedConfidence);
        }
    }

    // Register enough votes to get just before finalization
    for (auto i = 0; i < 90; i++) {
        BOOST_CHECK(!vr.registerVote(nextNodeId(nodeid), 0));
        BOOST_CHECK_EQUAL(vr.getConfidence(), ++expectedConfidence);
    }

    // Sanity check that finalization occurs on the expected vote
    BOOST_CHECK(vr.registerVote(nextNodeId(nodeid), 0));
    BOOST_CHECK(vr.hasFinalized());
}

BOOST_AUTO_TEST_SUITE_END()
