// Copyright (c) 2010 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "avalanche.h"

#include "test/test_bitcoin.h"

#include <boost/test/unit_test.hpp>

struct AvalancheTest {
    static std::vector<CInv> getInvsForNextPoll(const AvalancheProcessor &p) {
        return p.getInvsForNextPoll();
    }
};

BOOST_FIXTURE_TEST_SUITE(avalanche_tests, TestChain100Setup)

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

BOOST_AUTO_TEST_CASE(block_register) {
    AvalancheProcessor p;

    CBlock block = CreateAndProcessBlock({}, CScript());
    const uint256 blockHash = block.GetHash();
    const CBlockIndex *pindex = mapBlockIndex[blockHash];

    // Querying for random block returns false.
    BOOST_CHECK(!p.isAccepted(pindex));
    BOOST_CHECK(!p.hasFinalized(pindex));

    // Add a new block. Check it is added to the polls.
    BOOST_CHECK(p.addBlockToReconcile(pindex));
    auto invs = AvalancheTest::getInvsForNextPoll(p);
    BOOST_CHECK_EQUAL(invs.size(), 1);
    BOOST_CHECK_EQUAL(invs[0].type, MSG_BLOCK);
    BOOST_CHECK(invs[0].hash == blockHash);

    // Newly added blocks are also considered rejected.
    BOOST_CHECK(!p.isAccepted(pindex));
    BOOST_CHECK(!p.hasFinalized(pindex));

    // Let's vote for this block a few times.
    AvalancheResponse resp{0, {AvalancheVote(0, blockHash)}};
    for (int i = 0; i < 5; i++) {
        p.registerVotes(resp);
        BOOST_CHECK(!p.isAccepted(pindex));
        BOOST_CHECK(!p.hasFinalized(pindex));
    }

    // Now it is accepted, but we can vote for it numerous times.
    for (int i = 0; i < AVALANCHE_FINALIZATION_SCORE; i++) {
        p.registerVotes(resp);
        BOOST_CHECK(p.isAccepted(pindex));
        BOOST_CHECK(!p.hasFinalized(pindex));
    }

    // As long as it is not finalized, we poll.
    invs = AvalancheTest::getInvsForNextPoll(p);
    BOOST_CHECK_EQUAL(invs.size(), 1);
    BOOST_CHECK_EQUAL(invs[0].type, MSG_BLOCK);
    BOOST_CHECK(invs[0].hash == blockHash);

    // Now finalize the decision.
    resp = {0, {AvalancheVote(1, blockHash)}};
    p.registerVotes(resp);
    BOOST_CHECK(p.isAccepted(pindex));
    BOOST_CHECK(p.hasFinalized(pindex));

    // Once the decision is finalized, there is no poll for it.
    invs = AvalancheTest::getInvsForNextPoll(p);
    BOOST_CHECK_EQUAL(invs.size(), 0);

    // Now let's undo this and finalize rejection.
    for (int i = 0; i < 5; i++) {
        p.registerVotes(resp);
        BOOST_CHECK(p.isAccepted(pindex));
        BOOST_CHECK(p.hasFinalized(pindex));
    }

    // Now it is rejected, but we can vote for it numerous times.
    for (int i = 0; i < AVALANCHE_FINALIZATION_SCORE; i++) {
        p.registerVotes(resp);
        BOOST_CHECK(!p.isAccepted(pindex));
        BOOST_CHECK(!p.hasFinalized(pindex));
    }

    // As long as it is not finalized, we poll.
    invs = AvalancheTest::getInvsForNextPoll(p);
    BOOST_CHECK_EQUAL(invs.size(), 1);
    BOOST_CHECK_EQUAL(invs[0].type, MSG_BLOCK);
    BOOST_CHECK(invs[0].hash == blockHash);

    // Now finalize the decision.
    p.registerVotes(resp);
    BOOST_CHECK(!p.isAccepted(pindex));
    BOOST_CHECK(p.hasFinalized(pindex));

    // Once the decision is finalized, there is no poll for it.
    invs = AvalancheTest::getInvsForNextPoll(p);
    BOOST_CHECK_EQUAL(invs.size(), 0);

    // Adding the block twice does nothing.
    BOOST_CHECK(!p.addBlockToReconcile(pindex));
    BOOST_CHECK(!p.isAccepted(pindex));
    BOOST_CHECK(p.hasFinalized(pindex));
}

BOOST_AUTO_TEST_CASE(event_loop) {
    AvalancheProcessor p;
    CScheduler s;

    // Starting the event loop.
    BOOST_CHECK(p.startEventLoop(s));

    // There is one task planned in the next hour (our event loop).
    boost::chrono::system_clock::time_point start, stop;
    BOOST_CHECK_EQUAL(s.getQueueInfo(start, stop), 1);

    // Starting twice doesn't start it twice.
    BOOST_CHECK(!p.startEventLoop(s));

    // Start the scheduler thread.
    std::thread schedulerThread(std::bind(&CScheduler::serviceQueue, &s));

    // Stop event loop.
    BOOST_CHECK(p.stopEventLoop());

    // We don't have any task scheduled anymore.
    BOOST_CHECK_EQUAL(s.getQueueInfo(start, stop), 0);

    // Can't stop the event loop twice.
    BOOST_CHECK(!p.stopEventLoop());

    // Wait for the scheduler to stop.
    s.stop(true);
    schedulerThread.join();
}

BOOST_AUTO_TEST_CASE(destructor) {
    CScheduler s;
    boost::chrono::system_clock::time_point start, stop;

    // Start the scheduler thread.
    std::thread schedulerThread(std::bind(&CScheduler::serviceQueue, &s));

    {
        AvalancheProcessor p;
        BOOST_CHECK(p.startEventLoop(s));
        BOOST_CHECK_EQUAL(s.getQueueInfo(start, stop), 1);
    }

    // Now that avalanche is destroyed, there is no more scheduled tasks.
    BOOST_CHECK_EQUAL(s.getQueueInfo(start, stop), 0);

    // Wait for the scheduler to stop.
    s.stop(true);
    schedulerThread.join();
}

BOOST_AUTO_TEST_SUITE_END()
