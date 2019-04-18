// Copyright (c) 2010 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche.h>

#include <config.h>
#include <net_processing.h> // For PeerLogicValidation

#include <test/test_bitcoin.h>

#include <boost/test/unit_test.hpp>

struct AvalancheTest {
    static void runEventLoop(AvalancheProcessor &p) { p.runEventLoop(); }

    static std::vector<CInv> getInvsForNextPoll(const AvalancheProcessor &p) {
        return p.getInvsForNextPoll(false);
    }

    static NodeId getSuitableNodeToQuery(AvalancheProcessor &p) {
        return p.getSuitableNodeToQuery();
    }

    static uint64_t getRound(const AvalancheProcessor &p) { return p.round; }
};

BOOST_FIXTURE_TEST_SUITE(avalanche_tests, TestChain100Setup)

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

CService ip(uint32_t i) {
    struct in_addr s;
    s.s_addr = i;
    return CService(CNetAddr(s), Params().GetDefaultPort());
}

std::unique_ptr<CNode> ConnectNode(const Config &config, ServiceFlags nServices,
                                   PeerLogicValidation &peerLogic) {
    static NodeId id = 0;

    CAddress addr(ip(GetRandInt(0xffffffff)), NODE_NONE);
    std::unique_ptr<CNode> nodeptr(new CNode(id++, ServiceFlags(NODE_NETWORK),
                                             0, INVALID_SOCKET, addr, 0, 0,
                                             CAddress(), "",
                                             /*fInboundIn=*/false));
    CNode &node = *nodeptr;
    node.SetSendVersion(PROTOCOL_VERSION);
    node.nServices = nServices;
    peerLogic.InitializeNode(config, &node);
    node.nVersion = 1;
    node.fSuccessfullyConnected = true;

    CConnmanTest::AddNode(node);
    return nodeptr;
}

std::array<std::unique_ptr<CNode>, 8>
ConnectNodes(const Config &config, AvalancheProcessor &p,
             ServiceFlags nServices, PeerLogicValidation &peerLogic) {
    std::array<std::unique_ptr<CNode>, 8> nodes;
    for (auto &n : nodes) {
        n = ConnectNode(config, nServices, peerLogic);
        BOOST_CHECK(p.addPeer(n->GetId(), 0));
    }

    return nodes;
}

static AvalancheResponse next(AvalancheResponse &r) {
    auto copy = r;
    r = {r.getRound() + 1, r.getCooldown(), r.GetVotes()};
    return copy;
}

BOOST_AUTO_TEST_CASE(block_register) {
    AvalancheProcessor p(g_connman.get());
    std::vector<AvalancheBlockUpdate> updates;

    CBlock block = CreateAndProcessBlock({}, CScript());
    const uint256 blockHash = block.GetHash();
    const CBlockIndex *pindex = mapBlockIndex[blockHash];

    const Config &config = GetConfig();

    // Create nodes that supports avalanche.
    auto avanodes = ConnectNodes(config, p, NODE_AVALANCHE, *peerLogic);

    // Querying for random block returns false.
    BOOST_CHECK(!p.isAccepted(pindex));

    // Add a new block. Check it is added to the polls.
    BOOST_CHECK(p.addBlockToReconcile(pindex));
    auto invs = AvalancheTest::getInvsForNextPoll(p);
    BOOST_CHECK_EQUAL(invs.size(), 1);
    BOOST_CHECK_EQUAL(invs[0].type, MSG_BLOCK);
    BOOST_CHECK(invs[0].hash == blockHash);

    // Newly added blocks' state reflect the blockchain.
    BOOST_CHECK(p.isAccepted(pindex));

    int nextNodeIndex = 0;
    auto registerNewVote = [&](const AvalancheResponse &resp) {
        AvalancheTest::runEventLoop(p);
        auto nodeid = avanodes[nextNodeIndex++ % avanodes.size()]->GetId();
        BOOST_CHECK(p.registerVotes(nodeid, resp, updates));
    };

    // Let's vote for this block a few times.
    AvalancheResponse resp{0, 0, {AvalancheVote(0, blockHash)}};
    for (int i = 0; i < 6; i++) {
        registerNewVote(next(resp));
        BOOST_CHECK(p.isAccepted(pindex));
        BOOST_CHECK_EQUAL(p.getConfidence(pindex), 0);
        BOOST_CHECK_EQUAL(updates.size(), 0);
    }

    // A single neutral vote do not change anything.
    resp = {AvalancheTest::getRound(p), 0, {AvalancheVote(-1, blockHash)}};
    registerNewVote(next(resp));
    BOOST_CHECK(p.isAccepted(pindex));
    BOOST_CHECK_EQUAL(p.getConfidence(pindex), 0);
    BOOST_CHECK_EQUAL(updates.size(), 0);

    resp = {AvalancheTest::getRound(p), 0, {AvalancheVote(0, blockHash)}};
    for (int i = 1; i < 7; i++) {
        registerNewVote(next(resp));
        BOOST_CHECK(p.isAccepted(pindex));
        BOOST_CHECK_EQUAL(p.getConfidence(pindex), i);
        BOOST_CHECK_EQUAL(updates.size(), 0);
    }

    // Two neutral votes will stall progress.
    resp = {AvalancheTest::getRound(p), 0, {AvalancheVote(-1, blockHash)}};
    registerNewVote(next(resp));
    BOOST_CHECK(p.isAccepted(pindex));
    BOOST_CHECK_EQUAL(p.getConfidence(pindex), 6);
    BOOST_CHECK_EQUAL(updates.size(), 0);
    registerNewVote(next(resp));
    BOOST_CHECK(p.isAccepted(pindex));
    BOOST_CHECK_EQUAL(p.getConfidence(pindex), 6);
    BOOST_CHECK_EQUAL(updates.size(), 0);

    resp = {AvalancheTest::getRound(p), 0, {AvalancheVote(0, blockHash)}};
    for (int i = 2; i < 8; i++) {
        registerNewVote(next(resp));
        BOOST_CHECK(p.isAccepted(pindex));
        BOOST_CHECK_EQUAL(p.getConfidence(pindex), 6);
        BOOST_CHECK_EQUAL(updates.size(), 0);
    }

    // We vote for it numerous times to finalize it.
    for (int i = 7; i < AVALANCHE_FINALIZATION_SCORE; i++) {
        registerNewVote(next(resp));
        BOOST_CHECK(p.isAccepted(pindex));
        BOOST_CHECK_EQUAL(p.getConfidence(pindex), i);
        BOOST_CHECK_EQUAL(updates.size(), 0);
    }

    // As long as it is not finalized, we poll.
    invs = AvalancheTest::getInvsForNextPoll(p);
    BOOST_CHECK_EQUAL(invs.size(), 1);
    BOOST_CHECK_EQUAL(invs[0].type, MSG_BLOCK);
    BOOST_CHECK(invs[0].hash == blockHash);

    // Now finalize the decision.
    registerNewVote(next(resp));
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

    resp = {AvalancheTest::getRound(p), 0, {AvalancheVote(1, blockHash)}};
    for (int i = 0; i < 6; i++) {
        registerNewVote(next(resp));
        BOOST_CHECK(p.isAccepted(pindex));
        BOOST_CHECK_EQUAL(updates.size(), 0);
    }

    // Now the state will flip.
    registerNewVote(next(resp));
    BOOST_CHECK(!p.isAccepted(pindex));
    BOOST_CHECK_EQUAL(updates.size(), 1);
    BOOST_CHECK(updates[0].getBlockIndex() == pindex);
    BOOST_CHECK_EQUAL(updates[0].getStatus(),
                      AvalancheBlockUpdate::Status::Rejected);
    updates = {};

    // Now it is rejected, but we can vote for it numerous times.
    for (int i = 1; i < AVALANCHE_FINALIZATION_SCORE; i++) {
        registerNewVote(next(resp));
        BOOST_CHECK(!p.isAccepted(pindex));
        BOOST_CHECK_EQUAL(updates.size(), 0);
    }

    // As long as it is not finalized, we poll.
    invs = AvalancheTest::getInvsForNextPoll(p);
    BOOST_CHECK_EQUAL(invs.size(), 1);
    BOOST_CHECK_EQUAL(invs[0].type, MSG_BLOCK);
    BOOST_CHECK(invs[0].hash == blockHash);

    // Now finalize the decision.
    registerNewVote(next(resp));
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
    BOOST_CHECK(p.isAccepted(pindex));

    CConnmanTest::ClearNodes();
}

BOOST_AUTO_TEST_CASE(multi_block_register) {
    AvalancheProcessor p(g_connman.get());
    CBlockIndex indexA, indexB;

    std::vector<AvalancheBlockUpdate> updates;

    const Config &config = GetConfig();

    // Create several nodes that support avalanche.
    auto avanodes = ConnectNodes(config, p, NODE_AVALANCHE, *peerLogic);

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

    uint64_t round = AvalancheTest::getRound(p);
    AvalancheTest::runEventLoop(p);
    BOOST_CHECK(p.registerVotes(avanodes[0]->GetId(),
                                {round, 0, {AvalancheVote(0, blockHashA)}},
                                updates));
    BOOST_CHECK_EQUAL(updates.size(), 0);

    // Start voting on block B after one vote.
    AvalancheResponse resp{
        round + 1,
        0,
        {AvalancheVote(0, blockHashB), AvalancheVote(0, blockHashA)}};
    BOOST_CHECK(p.addBlockToReconcile(pindexB));
    invs = AvalancheTest::getInvsForNextPoll(p);
    BOOST_CHECK_EQUAL(invs.size(), 2);

    // Ensure B comes before A because it has accumulated more PoW.
    BOOST_CHECK_EQUAL(invs[0].type, MSG_BLOCK);
    BOOST_CHECK(invs[0].hash == blockHashB);
    BOOST_CHECK_EQUAL(invs[1].type, MSG_BLOCK);
    BOOST_CHECK(invs[1].hash == blockHashA);

    // Let's vote for these blocks a few times.
    for (int i = 0; i < 4; i++) {
        NodeId nodeid = AvalancheTest::getSuitableNodeToQuery(p);
        AvalancheTest::runEventLoop(p);
        BOOST_CHECK(p.registerVotes(nodeid, next(resp), updates));
        BOOST_CHECK_EQUAL(updates.size(), 0);
    }

    // Now it is accepted, but we can vote for it numerous times.
    for (int i = 0; i < AVALANCHE_FINALIZATION_SCORE; i++) {
        NodeId nodeid = AvalancheTest::getSuitableNodeToQuery(p);
        AvalancheTest::runEventLoop(p);
        BOOST_CHECK(p.registerVotes(nodeid, next(resp), updates));
        BOOST_CHECK_EQUAL(updates.size(), 0);
    }

    // Running two iterration of the event loop so that vote gets triggered on A
    // and B.
    NodeId firstNodeid = AvalancheTest::getSuitableNodeToQuery(p);
    AvalancheTest::runEventLoop(p);
    NodeId secondNodeid = AvalancheTest::getSuitableNodeToQuery(p);
    AvalancheTest::runEventLoop(p);

    BOOST_CHECK(firstNodeid != secondNodeid);

    // Next vote will finalize block A.
    BOOST_CHECK(p.registerVotes(firstNodeid, next(resp), updates));
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
    BOOST_CHECK(p.registerVotes(secondNodeid, resp, updates));
    BOOST_CHECK_EQUAL(updates.size(), 1);
    BOOST_CHECK(updates[0].getBlockIndex() == pindexB);
    BOOST_CHECK_EQUAL(updates[0].getStatus(),
                      AvalancheBlockUpdate::Status::Finalized);
    updates = {};

    // There is nothing left to vote on.
    invs = AvalancheTest::getInvsForNextPoll(p);
    BOOST_CHECK_EQUAL(invs.size(), 0);

    CConnmanTest::ClearNodes();
}

BOOST_AUTO_TEST_CASE(poll_and_response) {
    AvalancheProcessor p(g_connman.get());

    std::vector<AvalancheBlockUpdate> updates;

    CBlock block = CreateAndProcessBlock({}, CScript());
    const uint256 blockHash = block.GetHash();
    const CBlockIndex *pindex = mapBlockIndex[blockHash];

    const Config &config = GetConfig();

    // There is no node to query.
    BOOST_CHECK_EQUAL(AvalancheTest::getSuitableNodeToQuery(p), NO_NODE);

    // Create a node that supports avalanche and one that doesn't.
    auto oldnode = ConnectNode(config, NODE_NONE, *peerLogic);
    auto avanode = ConnectNode(config, NODE_AVALANCHE, *peerLogic);
    NodeId avanodeid = avanode->GetId();
    BOOST_CHECK(p.addPeer(avanodeid, 0));

    // It returns the avalanche peer.
    BOOST_CHECK_EQUAL(AvalancheTest::getSuitableNodeToQuery(p), avanodeid);

    // Register a block and check it is added to the list of elements to poll.
    BOOST_CHECK(p.addBlockToReconcile(pindex));
    auto invs = AvalancheTest::getInvsForNextPoll(p);
    BOOST_CHECK_EQUAL(invs.size(), 1);
    BOOST_CHECK_EQUAL(invs[0].type, MSG_BLOCK);
    BOOST_CHECK(invs[0].hash == blockHash);

    // Trigger a poll on avanode.
    uint64_t round = AvalancheTest::getRound(p);
    AvalancheTest::runEventLoop(p);

    // There is no more suitable peer available, so return nothing.
    BOOST_CHECK_EQUAL(AvalancheTest::getSuitableNodeToQuery(p), NO_NODE);

    // Respond to the request.
    AvalancheResponse resp = {round, 0, {AvalancheVote(0, blockHash)}};
    BOOST_CHECK(p.registerVotes(avanodeid, resp, updates));
    BOOST_CHECK_EQUAL(updates.size(), 0);

    // Now that avanode fullfilled his request, it is added back to the list of
    // queriable nodes.
    BOOST_CHECK_EQUAL(AvalancheTest::getSuitableNodeToQuery(p), avanodeid);

    // Sending a response when not polled fails.
    BOOST_CHECK(!p.registerVotes(avanodeid, next(resp), updates));
    BOOST_CHECK_EQUAL(updates.size(), 0);

    // Trigger a poll on avanode.
    round = AvalancheTest::getRound(p);
    AvalancheTest::runEventLoop(p);
    BOOST_CHECK_EQUAL(AvalancheTest::getSuitableNodeToQuery(p), NO_NODE);

    // Sending responses that do not match the request also fails.
    // 1. Too many results.
    resp = {
        round, 0, {AvalancheVote(0, blockHash), AvalancheVote(0, blockHash)}};
    AvalancheTest::runEventLoop(p);
    BOOST_CHECK(!p.registerVotes(avanodeid, resp, updates));
    BOOST_CHECK_EQUAL(updates.size(), 0);
    BOOST_CHECK_EQUAL(AvalancheTest::getSuitableNodeToQuery(p), avanodeid);

    // 2. Not enough results.
    resp = {AvalancheTest::getRound(p), 0, {}};
    AvalancheTest::runEventLoop(p);
    BOOST_CHECK(!p.registerVotes(avanodeid, resp, updates));
    BOOST_CHECK_EQUAL(updates.size(), 0);
    BOOST_CHECK_EQUAL(AvalancheTest::getSuitableNodeToQuery(p), avanodeid);

    // 3. Do not match the poll.
    resp = {AvalancheTest::getRound(p), 0, {AvalancheVote()}};
    AvalancheTest::runEventLoop(p);
    BOOST_CHECK(!p.registerVotes(avanodeid, resp, updates));
    BOOST_CHECK_EQUAL(updates.size(), 0);
    BOOST_CHECK_EQUAL(AvalancheTest::getSuitableNodeToQuery(p), avanodeid);

    // 4. Invalid round count. Request is not discarded.
    uint64_t queryRound = AvalancheTest::getRound(p);
    AvalancheTest::runEventLoop(p);

    resp = {queryRound + 1, 0, {AvalancheVote()}};
    BOOST_CHECK(!p.registerVotes(avanodeid, resp, updates));
    BOOST_CHECK_EQUAL(updates.size(), 0);

    resp = {queryRound - 1, 0, {AvalancheVote()}};
    BOOST_CHECK(!p.registerVotes(avanodeid, resp, updates));
    BOOST_CHECK_EQUAL(updates.size(), 0);

    // 5. Making request for invalid nodes do not work. Request is not
    // discarded.
    resp = {queryRound, 0, {AvalancheVote(0, blockHash)}};
    BOOST_CHECK(!p.registerVotes(avanodeid + 1234, resp, updates));
    BOOST_CHECK_EQUAL(updates.size(), 0);

    // Proper response gets processed and avanode is available again.
    resp = {queryRound, 0, {AvalancheVote(0, blockHash)}};
    BOOST_CHECK(p.registerVotes(avanodeid, resp, updates));
    BOOST_CHECK_EQUAL(updates.size(), 0);
    BOOST_CHECK_EQUAL(AvalancheTest::getSuitableNodeToQuery(p), avanodeid);

    // Out of order response are rejected.
    CBlock block2 = CreateAndProcessBlock({}, CScript());
    const uint256 blockHash2 = block2.GetHash();
    CBlockIndex *pindex2 = mapBlockIndex[blockHash2];
    BOOST_CHECK(p.addBlockToReconcile(pindex2));

    resp = {AvalancheTest::getRound(p),
            0,
            {AvalancheVote(0, blockHash), AvalancheVote(0, blockHash2)}};
    AvalancheTest::runEventLoop(p);
    BOOST_CHECK(!p.registerVotes(avanodeid, resp, updates));
    BOOST_CHECK_EQUAL(updates.size(), 0);
    BOOST_CHECK_EQUAL(AvalancheTest::getSuitableNodeToQuery(p), avanodeid);

    // But they are accepted in order.
    resp = {AvalancheTest::getRound(p),
            0,
            {AvalancheVote(0, blockHash2), AvalancheVote(0, blockHash)}};
    AvalancheTest::runEventLoop(p);
    BOOST_CHECK(p.registerVotes(avanodeid, resp, updates));
    BOOST_CHECK_EQUAL(updates.size(), 0);
    BOOST_CHECK_EQUAL(AvalancheTest::getSuitableNodeToQuery(p), avanodeid);

    // When a block is marked invalid, stop polling.
    pindex2->nStatus = pindex2->nStatus.withFailed();
    resp = {AvalancheTest::getRound(p), 0, {AvalancheVote(0, blockHash)}};
    AvalancheTest::runEventLoop(p);
    BOOST_CHECK(p.registerVotes(avanodeid, resp, updates));
    BOOST_CHECK_EQUAL(updates.size(), 0);
    BOOST_CHECK_EQUAL(AvalancheTest::getSuitableNodeToQuery(p), avanodeid);

    CConnmanTest::ClearNodes();
}

BOOST_AUTO_TEST_CASE(poll_inflight_timeout) {
    AvalancheProcessor p(g_connman.get());

    std::vector<AvalancheBlockUpdate> updates;

    CBlock block = CreateAndProcessBlock({}, CScript());
    const uint256 blockHash = block.GetHash();
    const CBlockIndex *pindex = mapBlockIndex[blockHash];

    // Add the block
    BOOST_CHECK(p.addBlockToReconcile(pindex));

    // Create a node that supports avalanche.
    const Config &config = GetConfig();
    auto avanode = ConnectNode(config, NODE_AVALANCHE, *peerLogic);
    NodeId avanodeid = avanode->GetId();
    BOOST_CHECK(p.addPeer(avanodeid, 0));

    // Expire requests after some time.
    p.setQueryTimeoutDuration(std::chrono::milliseconds(10));
    for (int i = 0; i < 10; i++) {
        AvalancheResponse resp = {
            AvalancheTest::getRound(p), 0, {AvalancheVote(0, blockHash)}};
        AvalancheTest::runEventLoop(p);
        // NB: This could wait longer than 1ms in some cases and make the
        // test flacky. We'll have to come up with a better solution to test
        // this if that were to be the case. I never was able to trigger this
        // myself, so it's probably good enough.
        boost::this_thread::sleep_for(boost::chrono::milliseconds(1));
        AvalancheTest::runEventLoop(p);
        BOOST_CHECK(p.registerVotes(avanodeid, next(resp), updates));

        // Now try again but wait.
        AvalancheTest::runEventLoop(p);
        boost::this_thread::sleep_for(boost::chrono::milliseconds(10));
        AvalancheTest::runEventLoop(p);
        BOOST_CHECK(!p.registerVotes(avanodeid, next(resp), updates));
    }

    CConnmanTest::ClearNodes();
}

BOOST_AUTO_TEST_CASE(poll_inflight_count) {
    AvalancheProcessor p(g_connman.get());
    const Config &config = GetConfig();

    // Create enough nodes so that we run into the inflight request limit.
    std::array<std::unique_ptr<CNode>, AVALANCHE_MAX_INFLIGHT_POLL + 1> nodes;
    for (auto &n : nodes) {
        n = ConnectNode(config, NODE_AVALANCHE, *peerLogic);
        BOOST_CHECK(p.addPeer(n->GetId(), 0));
    }

    // Add a block to poll
    CBlock block = CreateAndProcessBlock({}, CScript());
    const uint256 blockHash = block.GetHash();
    const CBlockIndex *pindex = mapBlockIndex[blockHash];
    BOOST_CHECK(p.addBlockToReconcile(pindex));

    // Ensure there are enough requests in flight.
    std::map<NodeId, uint64_t> node_round_map;
    for (int i = 0; i < AVALANCHE_MAX_INFLIGHT_POLL; i++) {
        NodeId nodeid = AvalancheTest::getSuitableNodeToQuery(p);
        BOOST_CHECK(node_round_map.find(nodeid) == node_round_map.end());
        node_round_map[nodeid] = AvalancheTest::getRound(p);
        auto invs = AvalancheTest::getInvsForNextPoll(p);
        BOOST_CHECK_EQUAL(invs.size(), 1);
        BOOST_CHECK_EQUAL(invs[0].type, MSG_BLOCK);
        BOOST_CHECK(invs[0].hash == blockHash);
        AvalancheTest::runEventLoop(p);
    }

    // Now that we have enough in flight requests, we shouldn't poll.
    auto suitablenodeid = AvalancheTest::getSuitableNodeToQuery(p);
    BOOST_CHECK(suitablenodeid != NO_NODE);
    auto invs = AvalancheTest::getInvsForNextPoll(p);
    BOOST_CHECK_EQUAL(invs.size(), 0);
    AvalancheTest::runEventLoop(p);
    BOOST_CHECK_EQUAL(AvalancheTest::getSuitableNodeToQuery(p), suitablenodeid);

    std::vector<AvalancheBlockUpdate> updates;

    // Send one response, now we can poll again.
    auto it = node_round_map.begin();
    AvalancheResponse resp = {it->second, 0, {AvalancheVote(0, blockHash)}};
    BOOST_CHECK(p.registerVotes(it->first, resp, updates));
    node_round_map.erase(it);

    invs = AvalancheTest::getInvsForNextPoll(p);
    BOOST_CHECK_EQUAL(invs.size(), 1);
    BOOST_CHECK_EQUAL(invs[0].type, MSG_BLOCK);
    BOOST_CHECK(invs[0].hash == blockHash);

    CConnmanTest::ClearNodes();
}

BOOST_AUTO_TEST_CASE(quorum_diversity) {
    AvalancheProcessor p(g_connman.get());
    std::vector<AvalancheBlockUpdate> updates;

    CBlock block = CreateAndProcessBlock({}, CScript());
    const uint256 blockHash = block.GetHash();
    const CBlockIndex *pindex = mapBlockIndex[blockHash];

    const Config &config = GetConfig();

    // Create nodes that supports avalanche.
    auto avanodes = ConnectNodes(config, p, NODE_AVALANCHE, *peerLogic);

    // Querying for random block returns false.
    BOOST_CHECK(!p.isAccepted(pindex));

    // Add a new block. Check it is added to the polls.
    BOOST_CHECK(p.addBlockToReconcile(pindex));

    // Do one valid round of voting.
    uint64_t round = AvalancheTest::getRound(p);
    AvalancheResponse resp{round, 0, {AvalancheVote(0, blockHash)}};

    // Check that all nodes can vote.
    for (size_t i = 0; i < avanodes.size(); i++) {
        AvalancheTest::runEventLoop(p);
        BOOST_CHECK(p.registerVotes(avanodes[i]->GetId(), next(resp), updates));
    }

    // Generate a query for every single node.
    const NodeId firstNodeId = AvalancheTest::getSuitableNodeToQuery(p);
    std::map<NodeId, uint64_t> node_round_map;
    round = AvalancheTest::getRound(p);
    for (size_t i = 0; i < avanodes.size(); i++) {
        NodeId nodeid = AvalancheTest::getSuitableNodeToQuery(p);
        BOOST_CHECK(node_round_map.find(nodeid) == node_round_map.end());
        node_round_map[nodeid] = AvalancheTest::getRound(p);
        AvalancheTest::runEventLoop(p);
    }

    // Now only tge first node can vote. All others would be duplicate in the
    // quorum.
    auto confidence = p.getConfidence(pindex);
    BOOST_REQUIRE(confidence > 0);

    for (auto &pair : node_round_map) {
        NodeId nodeid = pair.first;
        uint64_t r = pair.second;

        if (nodeid == firstNodeId) {
            // Node 0 is the only one which can vote at this stage.
            round = r;
            continue;
        }

        BOOST_CHECK(p.registerVotes(
            nodeid, {r, 0, {AvalancheVote(0, blockHash)}}, updates));
        BOOST_CHECK_EQUAL(p.getConfidence(pindex), confidence);
    }

    BOOST_CHECK(p.registerVotes(
        firstNodeId, {round, 0, {AvalancheVote(0, blockHash)}}, updates));
    BOOST_CHECK_EQUAL(p.getConfidence(pindex), confidence + 1);

    CConnmanTest::ClearNodes();
}

BOOST_AUTO_TEST_CASE(event_loop) {
    AvalancheProcessor p(g_connman.get());
    CScheduler s;

    CBlock block = CreateAndProcessBlock({}, CScript());
    const uint256 blockHash = block.GetHash();
    const CBlockIndex *pindex = mapBlockIndex[blockHash];

    // Starting the event loop.
    BOOST_CHECK(p.startEventLoop(s));

    // There is one task planned in the next hour (our event loop).
    boost::chrono::system_clock::time_point start, stop;
    BOOST_CHECK_EQUAL(s.getQueueInfo(start, stop), 1);

    // Starting twice doesn't start it twice.
    BOOST_CHECK(!p.startEventLoop(s));

    // Start the scheduler thread.
    std::thread schedulerThread(std::bind(&CScheduler::serviceQueue, &s));

    // Create a node and a block to query.
    const Config &config = GetConfig();

    // Create a node that supports avalanche.
    auto avanode = ConnectNode(config, NODE_AVALANCHE, *peerLogic);
    NodeId nodeid = avanode->GetId();
    BOOST_CHECK(p.addPeer(nodeid, 0));

    // There is no query in flight at the moment.
    BOOST_CHECK_EQUAL(AvalancheTest::getSuitableNodeToQuery(p), nodeid);

    // Add a new block. Check it is added to the polls.
    uint64_t queryRound = AvalancheTest::getRound(p);
    BOOST_CHECK(p.addBlockToReconcile(pindex));

    for (int i = 0; i < 1000; i++) {
        // Technically, this is a race condition, but this should do just fine
        // as we wait up to 1s for an event that should take 10ms.
        boost::this_thread::sleep_for(boost::chrono::milliseconds(1));
        if (AvalancheTest::getRound(p) != queryRound) {
            break;
        }
    }

    // Check that we effectively got a request and not timed out.
    BOOST_CHECK(AvalancheTest::getRound(p) > queryRound);

    // Respond and check the cooldown time is respected.
    uint64_t responseRound = AvalancheTest::getRound(p);
    auto queryTime =
        std::chrono::steady_clock::now() + std::chrono::milliseconds(100);

    std::vector<AvalancheBlockUpdate> updates;
    p.registerVotes(nodeid, {queryRound, 100, {AvalancheVote(0, blockHash)}},
                    updates);
    for (int i = 0; i < 1000; i++) {
        // We make sure that we do not get a request before queryTime.
        boost::this_thread::sleep_for(boost::chrono::milliseconds(1));
        if (AvalancheTest::getRound(p) != responseRound) {
            BOOST_CHECK(std::chrono::steady_clock::now() > queryTime);
            break;
        }
    }

    // But we eventually get one.
    BOOST_CHECK(AvalancheTest::getRound(p) > responseRound);

    // Stop event loop.
    BOOST_CHECK(p.stopEventLoop());

    // We don't have any task scheduled anymore.
    BOOST_CHECK_EQUAL(s.getQueueInfo(start, stop), 0);

    // Can't stop the event loop twice.
    BOOST_CHECK(!p.stopEventLoop());

    // Wait for the scheduler to stop.
    s.stop(true);
    schedulerThread.join();

    CConnmanTest::ClearNodes();
}

BOOST_AUTO_TEST_CASE(destructor) {
    CScheduler s;
    boost::chrono::system_clock::time_point start, stop;

    // Start the scheduler thread.
    std::thread schedulerThread(std::bind(&CScheduler::serviceQueue, &s));

    {
        AvalancheProcessor p(g_connman.get());
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
