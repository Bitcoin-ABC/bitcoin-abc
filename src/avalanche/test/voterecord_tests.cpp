// Copyright (c) 2018-2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/voterecord.h>

#include <test/util/random.h>
#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

using namespace avalanche;

struct VoteRecordFixture {
    NodeId currentNodeId = -1;

    NodeId nextNodeId() {
        currentNodeId++;
        if (currentNodeId >= 8) {
            currentNodeId = 0;
        }
        return currentNodeId;
    }
};

BOOST_FIXTURE_TEST_SUITE(voterecord_tests, VoteRecordFixture)

#define REGISTER_VOTE_AND_CHECK(vr, vote, state, finalized, stale, confidence) \
    vr.registerVote(nextNodeId(), vote);                                       \
    BOOST_CHECK_EQUAL(vr.isAccepted(), state);                                 \
    BOOST_CHECK_EQUAL(vr.hasFinalized(), finalized);                           \
    BOOST_CHECK_EQUAL(vr.isStale(), stale);                                    \
    BOOST_CHECK_EQUAL(vr.getConfidence(), confidence);

BOOST_AUTO_TEST_CASE(vote_record) {
    VoteRecord vraccepted(true);

    // Check initial state.
    BOOST_CHECK_EQUAL(vraccepted.isAccepted(), true);
    BOOST_CHECK_EQUAL(vraccepted.hasFinalized(), false);
    BOOST_CHECK_EQUAL(vraccepted.isStale(), false);
    BOOST_CHECK_EQUAL(vraccepted.getConfidence(), 0);

    VoteRecord vr(false);

    // Check initial state.
    BOOST_CHECK_EQUAL(vr.isAccepted(), false);
    BOOST_CHECK_EQUAL(vr.hasFinalized(), false);
    BOOST_CHECK_EQUAL(vr.isStale(), false);
    BOOST_CHECK_EQUAL(vr.getConfidence(), 0);

    // We need to register 6 positive votes before we start counting.
    for (int i = 0; i < 6; i++) {
        REGISTER_VOTE_AND_CHECK(vr, 0, false, false, false, 0);
    }

    // Next vote will flip state, and confidence will increase as long as we
    // vote yes.
    REGISTER_VOTE_AND_CHECK(vr, 0, true, false, false, 0);

    // A single neutral vote do not change anything.
    REGISTER_VOTE_AND_CHECK(vr, -1, true, false, false, 1);
    for (int i = 2; i < 8; i++) {
        REGISTER_VOTE_AND_CHECK(vr, 0, true, false, false, i);
    }

    // Two neutral votes will stall progress.
    REGISTER_VOTE_AND_CHECK(vr, -1, true, false, false, 7);
    REGISTER_VOTE_AND_CHECK(vr, -1, true, false, false, 7);
    for (int i = 2; i < 8; i++) {
        REGISTER_VOTE_AND_CHECK(vr, 0, true, false, false, 7);
    }

    // Now confidence will increase as long as we vote yes.
    for (int i = 8; i < AVALANCHE_FINALIZATION_SCORE; i++) {
        REGISTER_VOTE_AND_CHECK(vr, 0, true, false, false, i);
    }

    // The next vote will finalize the decision.
    REGISTER_VOTE_AND_CHECK(vr, 1, true, true, false,
                            AVALANCHE_FINALIZATION_SCORE);

    // Now that we have two no votes, confidence stop increasing.
    for (int i = 0; i < 5; i++) {
        REGISTER_VOTE_AND_CHECK(vr, 1, true, true, false,
                                AVALANCHE_FINALIZATION_SCORE);
    }

    // Next vote will flip state, and confidence will increase as long as we
    // vote no.
    REGISTER_VOTE_AND_CHECK(vr, 1, false, false, false, 0);

    // A single neutral vote do not change anything.
    REGISTER_VOTE_AND_CHECK(vr, -1, false, false, false, 1);
    for (int i = 2; i < 8; i++) {
        REGISTER_VOTE_AND_CHECK(vr, 1, false, false, false, i);
    }

    // Two neutral votes will stall progress.
    REGISTER_VOTE_AND_CHECK(vr, -1, false, false, false, 7);
    REGISTER_VOTE_AND_CHECK(vr, -1, false, false, false, 7);
    for (int i = 2; i < 8; i++) {
        REGISTER_VOTE_AND_CHECK(vr, 1, false, false, false, 7);
    }

    // Now confidence will increase as long as we vote no.
    for (int i = 8; i < AVALANCHE_FINALIZATION_SCORE; i++) {
        REGISTER_VOTE_AND_CHECK(vr, 1, false, false, false, i);
    }

    // The next vote will finalize the decision.
    REGISTER_VOTE_AND_CHECK(vr, 0, false, true, false,
                            AVALANCHE_FINALIZATION_SCORE);

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

// Test some cases where confidence never advances
BOOST_AUTO_TEST_CASE(stale_vote_always_inconclusive) {
    // Setup a record that is inconclusive so far
    VoteRecord vr(false);

    for (uint32_t i = 0; i < AVALANCHE_VOTE_STALE_THRESHOLD / 8; i++) {
        // Vote randomly, but such that there's always enough neutral votes to
        // not gain confidence.
        for (auto j = 0; j < 6; j++) {
            REGISTER_VOTE_AND_CHECK(vr, InsecureRand32(), false, false, false,
                                    0);
        }
        REGISTER_VOTE_AND_CHECK(vr, -1, false, false, false, 0);
        REGISTER_VOTE_AND_CHECK(vr, -1, false, false, false, 0);
    }

    // Vote record becomes stale after too many rounds of inconclusive voting
    REGISTER_VOTE_AND_CHECK(vr, -1, false, false, true, 0);
}

// Test all cases where records reach a specific confidence level and then go
// stale.
BOOST_AUTO_TEST_CASE(stale_vote_at_all_confidence_levels) {
    for (uint32_t vote = 0; vote <= 1; vote++) {
        for (uint32_t confidence = 0; confidence < AVALANCHE_FINALIZATION_SCORE;
             confidence++) {
            VoteRecord vr(!vote);

            // Prepare to increase confidence with some votes
            for (auto i = 0; i < 5; i++) {
                REGISTER_VOTE_AND_CHECK(vr, vote, !vote, false, false, 0);
            }

            // Increase to target confidence
            for (uint32_t i = 0; i < confidence; i++) {
                REGISTER_VOTE_AND_CHECK(vr, vote, !vote, false, false, i);
            }

            uint32_t remainingVotes =
                AVALANCHE_VOTE_STALE_THRESHOLD - confidence - 5;

            // Special case where staying at confidence of 1 requires a
            // different vote between agreeing votes
            if (confidence == 1) {
                REGISTER_VOTE_AND_CHECK(vr, -1, !vote, false, false, 0);
                REGISTER_VOTE_AND_CHECK(vr, vote, !vote, false, false, 1);
                remainingVotes -= 2;
            }

            // Vote neutral until stale
            if (confidence >
                AVALANCHE_VOTE_STALE_THRESHOLD / AVALANCHE_VOTE_STALE_FACTOR) {
                remainingVotes =
                    confidence * AVALANCHE_VOTE_STALE_FACTOR - confidence - 5;
            }
            for (uint32_t i = 0; i < remainingVotes; i++) {
                REGISTER_VOTE_AND_CHECK(vr, -1, !vote, false, false,
                                        confidence);
            }
            REGISTER_VOTE_AND_CHECK(vr, -1, !vote, false, true, confidence);
        }
    }
}

// Test some cases where confidence may flip flop and then goes stale.
BOOST_AUTO_TEST_CASE(stale_vote_random_then_inconclusive) {
    VoteRecord vr(false);

    for (uint32_t i = 0; i < AVALANCHE_FINALIZATION_SCORE - 14; i++) {
        // Vote randomly. Confidence changes are ok.
        vr.registerVote(nextNodeId(), InsecureRand32());
        BOOST_CHECK_EQUAL(vr.hasFinalized(), false);
        BOOST_CHECK_EQUAL(vr.isStale(), false);
    }

    // Reset confidence, no matter what it is right now
    for (uint32_t i = 0; i < 7; i++) {
        vr.registerVote(nextNodeId(), 0);
    }
    for (uint32_t i = 0; i < 7; i++) {
        vr.registerVote(nextNodeId(), 1);
    }
    BOOST_CHECK_EQUAL(vr.hasFinalized(), false);
    BOOST_CHECK_EQUAL(vr.isStale(), false);

    // Remainder of votes are neutral
    for (uint32_t i = 0;
         i < AVALANCHE_VOTE_STALE_THRESHOLD - AVALANCHE_FINALIZATION_SCORE;
         i++) {
        REGISTER_VOTE_AND_CHECK(vr, -1, false, false, false, 1);
    }

    // Vote record becomes stale after too many rounds of voting
    REGISTER_VOTE_AND_CHECK(vr, -1, false, false, true, 1);
}

// Test all cases where confidence flips as much as possible, ending at all
// possible confidence levels.
BOOST_AUTO_TEST_CASE(stale_vote_with_confidence_flips) {
    // Start testing with yes or no votes
    for (uint32_t voteInit = 0; voteInit <= 1; voteInit++) {
        // Test stalling at all confidence levels
        for (auto offset = 0; offset < AVALANCHE_FINALIZATION_SCORE; offset++) {
            uint32_t vote = voteInit;
            VoteRecord vr(!vote);
            uint32_t count = 0;

            // Offset with neutral votes
            for (auto i = 0; i < offset; i++) {
                REGISTER_VOTE_AND_CHECK(vr, -1, !vote, false, false, 0);
                count++;
            }

            // Prepare to increase confidence with some votes
            for (auto i = 0; i < 5; i++) {
                REGISTER_VOTE_AND_CHECK(vr, vote, !vote, false, false, 0);
                count++;
            }

            while (true) {
                // Increase confidence as fast as possible
                for (uint32_t i = 0; i < AVALANCHE_FINALIZATION_SCORE - 1;
                     i++) {
                    if (i <= AVALANCHE_VOTE_STALE_THRESHOLD /
                                 AVALANCHE_VOTE_STALE_FACTOR &&
                        count >= AVALANCHE_VOTE_STALE_THRESHOLD) {
                        REGISTER_VOTE_AND_CHECK(vr, vote, !vote, false, true,
                                                i);
                        goto finalsanitycheck;
                    }
                    if (i > AVALANCHE_VOTE_STALE_THRESHOLD /
                                AVALANCHE_VOTE_STALE_FACTOR &&
                        count >= i * AVALANCHE_VOTE_STALE_FACTOR) {
                        REGISTER_VOTE_AND_CHECK(vr, vote, !vote, false, true,
                                                i);
                        goto finalsanitycheck;
                    }

                    REGISTER_VOTE_AND_CHECK(vr, vote, !vote, false, false, i);
                    count++;
                }

                // Flip the vote
                if (vote++ >= 1) {
                    vote = 0;
                }

                // Reset confidence
                for (auto i = 0; i < 6; i++) {
                    if (count >= (AVALANCHE_FINALIZATION_SCORE - 1) *
                                     AVALANCHE_VOTE_STALE_FACTOR) {
                        REGISTER_VOTE_AND_CHECK(vr, vote, vote, false, true,
                                                AVALANCHE_FINALIZATION_SCORE);
                        goto finalsanitycheck;
                    }

                    REGISTER_VOTE_AND_CHECK(vr, vote, vote, false, false,
                                            AVALANCHE_FINALIZATION_SCORE - 1);
                    count++;
                }

                // If this fails, we are probably infinite looping for some
                // reason
                BOOST_CHECK(count <= AVALANCHE_FINALIZATION_SCORE *
                                         AVALANCHE_VOTE_STALE_FACTOR);
            }

        finalsanitycheck:
            BOOST_CHECK(vr.isStale());
        }
    }
}

BOOST_AUTO_TEST_CASE(duplicate_votes) {
    VoteRecord vr(true);

    // Register some votes, expecting confidence to increase
    for (auto i = 0; i < 7; i++) {
        BOOST_CHECK_EQUAL(vr.getConfidence(), 0);
        BOOST_CHECK(!vr.registerVote(nextNodeId(), 0));
    }
    BOOST_CHECK_EQUAL(vr.getConfidence(), 1);

    // Multiple duplicate votes do not advance confidence
    for (auto i = 0; i < 8; i++) {
        BOOST_CHECK(!vr.registerVote(currentNodeId, 0));
        BOOST_CHECK_EQUAL(vr.getConfidence(), 1);
    }

    // Register more votes with duplicates mixed in. Confidence should only
    // increase when duplicates are not used.
    auto expectedConfidence = 1;
    for (auto i = 0; i < 8; i++) {
        BOOST_CHECK(!vr.registerVote(currentNodeId, 0));
        BOOST_CHECK_EQUAL(vr.getConfidence(), expectedConfidence);
        for (auto j = i; j < 8; j++) {
            BOOST_CHECK(!vr.registerVote(nextNodeId(), 0));
            BOOST_CHECK_EQUAL(vr.getConfidence(), ++expectedConfidence);
        }
    }

    // Register enough votes to get just before finalization
    for (auto i = 0; i < 90; i++) {
        BOOST_CHECK(!vr.registerVote(nextNodeId(), 0));
        BOOST_CHECK_EQUAL(vr.getConfidence(), ++expectedConfidence);
    }

    // Sanity check that finalization occurs on the expected vote
    BOOST_CHECK(vr.registerVote(nextNodeId(), 0));
    BOOST_CHECK(vr.hasFinalized());
}

BOOST_AUTO_TEST_SUITE_END()
