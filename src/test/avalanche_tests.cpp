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
    BOOST_CHECK_EQUAL(vr.isAccepted(), state);                                 \
    BOOST_CHECK_EQUAL(vr.hasFinalized(), finalized);                           \
    BOOST_CHECK_EQUAL(vr.getConfidence(), confidence);

BOOST_AUTO_TEST_CASE(vote_record) {
    VoteRecord vr;

    // Check initial state.
    BOOST_CHECK_EQUAL(vr.isAccepted(), false);
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

BOOST_AUTO_TEST_CASE(block_update) {
    CBlockIndex index;
    CBlockIndex *pindex = &index;

    std::set<AvalancheBlockUpdate::Status> status{
        AvalancheBlockUpdate::Status::Invalid,
        AvalancheBlockUpdate::Status::Rejected,
        AvalancheBlockUpdate::Status::Accepted,
        AvalancheBlockUpdate::Status::Finalized,
    };

    for (auto s : status) {
        AvalancheBlockUpdate abu(pindex, s);
        BOOST_CHECK(abu.getBlockIndex() == pindex);
        BOOST_CHECK_EQUAL(abu.getStatus(), s);
    }
}

BOOST_AUTO_TEST_CASE(block_register) {
    AvalancheProcessor p;
    std::vector<AvalancheBlockUpdate> updates;

    CBlock block = CreateAndProcessBlock({}, CScript());
    const uint256 blockHash = block.GetHash();
    const CBlockIndex *pindex = mapBlockIndex[blockHash];

    // Querying for random block returns false.
    BOOST_CHECK(!p.isAccepted(pindex));

    // Add a new block. Check it is added to the polls.
    BOOST_CHECK(p.addBlockToReconcile(pindex));
    auto invs = AvalancheTest::getInvsForNextPoll(p);
    BOOST_CHECK_EQUAL(invs.size(), 1);
    BOOST_CHECK_EQUAL(invs[0].type, MSG_BLOCK);
    BOOST_CHECK(invs[0].hash == blockHash);

    // Newly added blocks are also considered rejected.
    BOOST_CHECK(!p.isAccepted(pindex));

    // Let's vote for this block a few times.
    AvalancheResponse resp{0, {AvalancheVote(0, blockHash)}};
    for (int i = 0; i < 5; i++) {
        p.registerVotes(resp, updates);
        BOOST_CHECK(!p.isAccepted(pindex));
        BOOST_CHECK_EQUAL(updates.size(), 0);
    }

    // Now the state will flip.
    p.registerVotes(resp, updates);
    BOOST_CHECK(p.isAccepted(pindex));
    BOOST_CHECK_EQUAL(updates.size(), 1);
    BOOST_CHECK(updates[0].getBlockIndex() == pindex);
    BOOST_CHECK_EQUAL(updates[0].getStatus(),
                      AvalancheBlockUpdate::Status::Accepted);
    updates = {};

    // Now it is accepted, but we can vote for it numerous times.
    for (int i = 1; i < AVALANCHE_FINALIZATION_SCORE; i++) {
        p.registerVotes(resp, updates);
        BOOST_CHECK(p.isAccepted(pindex));
        BOOST_CHECK_EQUAL(updates.size(), 0);
    }

    // As long as it is not finalized, we poll.
    invs = AvalancheTest::getInvsForNextPoll(p);
    BOOST_CHECK_EQUAL(invs.size(), 1);
    BOOST_CHECK_EQUAL(invs[0].type, MSG_BLOCK);
    BOOST_CHECK(invs[0].hash == blockHash);

    // Now finalize the decision.
    p.registerVotes(resp, updates);
    BOOST_CHECK_EQUAL(updates.size(), 1);
    BOOST_CHECK(updates[0].getBlockIndex() == pindex);
    BOOST_CHECK_EQUAL(updates[0].getStatus(),
                      AvalancheBlockUpdate::Status::Finalized);
    updates = {};

    // Once the decision is finalized, there is no poll for it.
    invs = AvalancheTest::getInvsForNextPoll(p);
    BOOST_CHECK_EQUAL(invs.size(), 0);

    // Now let's undo this and finalize rejection.
    BOOST_CHECK(p.addBlockToReconcile(pindex));
    invs = AvalancheTest::getInvsForNextPoll(p);
    BOOST_CHECK_EQUAL(invs.size(), 1);
    BOOST_CHECK_EQUAL(invs[0].type, MSG_BLOCK);
    BOOST_CHECK(invs[0].hash == blockHash);

    // Only 3 here as we don't need to flip state.
    resp = {0, {AvalancheVote(1, blockHash)}};
    for (int i = 0; i < 3; i++) {
        p.registerVotes(resp, updates);
        BOOST_CHECK(!p.isAccepted(pindex));
        BOOST_CHECK_EQUAL(updates.size(), 0);
    }

    // Now it is rejected, but we can vote for it numerous times.
    for (int i = 0; i < AVALANCHE_FINALIZATION_SCORE; i++) {
        p.registerVotes(resp, updates);
        BOOST_CHECK(!p.isAccepted(pindex));
        BOOST_CHECK_EQUAL(updates.size(), 0);
    }

    // As long as it is not finalized, we poll.
    invs = AvalancheTest::getInvsForNextPoll(p);
    BOOST_CHECK_EQUAL(invs.size(), 1);
    BOOST_CHECK_EQUAL(invs[0].type, MSG_BLOCK);
    BOOST_CHECK(invs[0].hash == blockHash);

    // Now finalize the decision.
    p.registerVotes(resp, updates);
    BOOST_CHECK(!p.isAccepted(pindex));
    BOOST_CHECK_EQUAL(updates.size(), 1);
    BOOST_CHECK(updates[0].getBlockIndex() == pindex);
    BOOST_CHECK_EQUAL(updates[0].getStatus(),
                      AvalancheBlockUpdate::Status::Invalid);
    updates = {};

    // Once the decision is finalized, there is no poll for it.
    invs = AvalancheTest::getInvsForNextPoll(p);
    BOOST_CHECK_EQUAL(invs.size(), 0);

    // Adding the block twice does nothing.
    BOOST_CHECK(p.addBlockToReconcile(pindex));
    BOOST_CHECK(!p.addBlockToReconcile(pindex));
    BOOST_CHECK(!p.isAccepted(pindex));
}

BOOST_AUTO_TEST_CASE(multi_block_register) {
    AvalancheProcessor p;
    CBlockIndex indexA, indexB;

    std::vector<AvalancheBlockUpdate> updates;

    // Make sure the block has a hash.
    CBlock blockA = CreateAndProcessBlock({}, CScript());
    const uint256 blockHashA = blockA.GetHash();
    const CBlockIndex *pindexA = mapBlockIndex[blockHashA];

    CBlock blockB = CreateAndProcessBlock({}, CScript());
    const uint256 blockHashB = blockB.GetHash();
    const CBlockIndex *pindexB = mapBlockIndex[blockHashB];

    // Querying for random block returns false.
    BOOST_CHECK(!p.isAccepted(pindexA));
    BOOST_CHECK(!p.isAccepted(pindexB));

    // Start voting on block A.
    BOOST_CHECK(p.addBlockToReconcile(pindexA));
    auto invs = AvalancheTest::getInvsForNextPoll(p);
    BOOST_CHECK_EQUAL(invs.size(), 1);
    BOOST_CHECK_EQUAL(invs[0].type, MSG_BLOCK);
    BOOST_CHECK(invs[0].hash == blockHashA);

    AvalancheResponse resp{
        0, {AvalancheVote(0, blockHashA), AvalancheVote(0, blockHashB)}};
    p.registerVotes(resp, updates);
    BOOST_CHECK_EQUAL(updates.size(), 0);

    // Start voting on block B after one vote.
    BOOST_CHECK(p.addBlockToReconcile(pindexB));
    invs = AvalancheTest::getInvsForNextPoll(p);
    BOOST_CHECK_EQUAL(invs.size(), 2);

    // Ensure B comes before A because it has accumulated more PoW.
    BOOST_CHECK_EQUAL(invs[0].type, MSG_BLOCK);
    BOOST_CHECK(invs[0].hash == blockHashB);
    BOOST_CHECK_EQUAL(invs[1].type, MSG_BLOCK);
    BOOST_CHECK(invs[1].hash == blockHashA);

    // Let's vote for this block a few times.
    for (int i = 0; i < 4; i++) {
        p.registerVotes(resp, updates);
        BOOST_CHECK_EQUAL(updates.size(), 0);
    }

    // Now the state will flip for A.
    p.registerVotes(resp, updates);
    BOOST_CHECK_EQUAL(updates.size(), 1);
    BOOST_CHECK(updates[0].getBlockIndex() == pindexA);
    BOOST_CHECK_EQUAL(updates[0].getStatus(),
                      AvalancheBlockUpdate::Status::Accepted);
    updates = {};

    // And then for B.
    p.registerVotes(resp, updates);
    BOOST_CHECK_EQUAL(updates.size(), 1);
    BOOST_CHECK(updates[0].getBlockIndex() == pindexB);
    BOOST_CHECK_EQUAL(updates[0].getStatus(),
                      AvalancheBlockUpdate::Status::Accepted);
    updates = {};

    // Now it is rejected, but we can vote for it numerous times.
    for (int i = 2; i < AVALANCHE_FINALIZATION_SCORE; i++) {
        p.registerVotes(resp, updates);
        BOOST_CHECK_EQUAL(updates.size(), 0);
    }

    // Next vote will finalize block A.
    p.registerVotes(resp, updates);
    BOOST_CHECK_EQUAL(updates.size(), 1);
    BOOST_CHECK(updates[0].getBlockIndex() == pindexA);
    BOOST_CHECK_EQUAL(updates[0].getStatus(),
                      AvalancheBlockUpdate::Status::Finalized);
    updates = {};

    // We do not vote on A anymore.
    invs = AvalancheTest::getInvsForNextPoll(p);
    BOOST_CHECK_EQUAL(invs.size(), 1);
    BOOST_CHECK_EQUAL(invs[0].type, MSG_BLOCK);
    BOOST_CHECK(invs[0].hash == blockHashB);

    // Next vote will finalize block B.
    p.registerVotes(resp, updates);
    BOOST_CHECK_EQUAL(updates.size(), 1);
    BOOST_CHECK(updates[0].getBlockIndex() == pindexB);
    BOOST_CHECK_EQUAL(updates[0].getStatus(),
                      AvalancheBlockUpdate::Status::Finalized);
    updates = {};

    // There is nothing left to vote on.
    invs = AvalancheTest::getInvsForNextPoll(p);
    BOOST_CHECK_EQUAL(invs.size(), 0);
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
