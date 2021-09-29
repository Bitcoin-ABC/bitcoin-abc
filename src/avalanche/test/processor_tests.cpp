// Copyright (c) 2018-2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/processor.h>

#include <avalanche/delegationbuilder.h>
#include <avalanche/peermanager.h>
#include <avalanche/proofbuilder.h>
#include <avalanche/voterecord.h>
#include <chain.h>
#include <config.h>
#include <net_processing.h> // For ::PeerManager
#include <scheduler.h>
#include <util/time.h>
#include <util/translation.h> // For bilingual_str
// D6970 moved LookupBlockIndex from chain.h to validation.h TODO: remove this
// when LookupBlockIndex is refactored out of validation
#include <validation.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

using namespace avalanche;

namespace avalanche {
namespace {
    struct AvalancheTest {
        static void runEventLoop(avalanche::Processor &p) { p.runEventLoop(); }

        static std::vector<CInv> getInvsForNextPoll(Processor &p) {
            return p.getInvsForNextPoll(false);
        }

        static NodeId getSuitableNodeToQuery(Processor &p) {
            return p.getSuitableNodeToQuery();
        }

        static uint64_t getRound(const Processor &p) { return p.round; }
    };
} // namespace
} // namespace avalanche

namespace {
struct CConnmanTest : public CConnman {
    using CConnman::CConnman;
    void AddNode(CNode &node) {
        LOCK(cs_vNodes);
        vNodes.push_back(&node);
    }
    void ClearNodes() {
        LOCK(cs_vNodes);
        for (CNode *node : vNodes) {
            delete node;
        }
        vNodes.clear();
    }
};

CService ip(uint32_t i) {
    struct in_addr s;
    s.s_addr = i;
    return CService(CNetAddr(s), Params().GetDefaultPort());
}

struct AvalancheTestingSetup : public TestChain100Setup {
    const Config &config;
    CConnmanTest *m_connman;

    std::unique_ptr<Processor> m_processor;

    // The master private key we delegate to.
    CKey masterpriv;

    AvalancheTestingSetup()
        : TestChain100Setup(), config(GetConfig()),
          masterpriv(CKey::MakeCompressedKey()) {
        // Deterministic randomness for tests.
        auto connman = std::make_unique<CConnmanTest>(config, 0x1337, 0x1337);
        m_connman = connman.get();
        m_node.connman = std::move(connman);
        m_node.peerman = std::make_unique<::PeerManager>(
            config.GetChainParams(), *m_connman, m_node.banman.get(),
            *m_node.scheduler, *m_node.chainman, *m_node.mempool);
        m_node.chain = interfaces::MakeChain(m_node, config.GetChainParams());

        // Get the processor ready.
        bilingual_str error;
        m_processor = Processor::MakeProcessor(*m_node.args, *m_node.chain,
                                               m_node.connman.get(), error);
        BOOST_CHECK(m_processor);
    }

    ~AvalancheTestingSetup() {
        m_connman->ClearNodes();
        SyncWithValidationInterfaceQueue();
    }

    CNode *ConnectNode(ServiceFlags nServices) {
        static NodeId id = 0;

        CAddress addr(ip(GetRandInt(0xffffffff)), NODE_NONE);
        auto node = new CNode(id++, ServiceFlags(NODE_NETWORK), 0,
                              INVALID_SOCKET, addr, 0, 0, 0, CAddress(), "",
                              ConnectionType::OUTBOUND_FULL_RELAY);
        node->SetCommonVersion(PROTOCOL_VERSION);
        node->nServices = nServices;
        m_node.peerman->InitializeNode(config, node);
        node->nVersion = 1;
        node->fSuccessfullyConnected = true;
        node->m_avalanche_state = std::make_unique<CNode::AvalancheState>();

        m_connman->AddNode(*node);
        return node;
    }

    size_t next_coinbase = 0;
    std::shared_ptr<Proof> GetProof() {
        size_t current_coinbase = next_coinbase++;
        const CTransaction &coinbase = *m_coinbase_txns[current_coinbase];
        ProofBuilder pb(0, 0, masterpriv);
        BOOST_CHECK(pb.addUTXO(COutPoint(coinbase.GetId(), 0),
                               coinbase.vout[0].nValue, current_coinbase + 1,
                               true, coinbaseKey));
        return std::make_shared<Proof>(pb.build());
    }

    bool addNode(NodeId nodeid, const ProofId &proofid) {
        return m_processor->withPeerManager([&](avalanche::PeerManager &pm) {
            return pm.addNode(nodeid, proofid);
        });
    }

    bool addNode(NodeId nodeid) {
        auto proof = GetProof();
        return m_processor->withPeerManager([&](avalanche::PeerManager &pm) {
            return pm.registerProof(proof) &&
                   pm.addNode(nodeid, proof->getId());
        });
    }

    std::array<CNode *, 8> ConnectNodes() {
        auto proof = GetProof();
        BOOST_CHECK(
            m_processor->withPeerManager([&](avalanche::PeerManager &pm) {
                return pm.registerProof(proof);
            }));
        const ProofId &proofid = proof->getId();

        std::array<CNode *, 8> nodes;
        for (CNode *&n : nodes) {
            n = ConnectNode(NODE_AVALANCHE);
            BOOST_CHECK(addNode(n->GetId(), proofid));
        }

        return nodes;
    }

    void runEventLoop() { AvalancheTest::runEventLoop(*m_processor); }

    NodeId getSuitableNodeToQuery() {
        return AvalancheTest::getSuitableNodeToQuery(*m_processor);
    }

    std::vector<CInv> getInvsForNextPoll() {
        return AvalancheTest::getInvsForNextPoll(*m_processor);
    }

    uint64_t getRound() const { return AvalancheTest::getRound(*m_processor); }

    bool registerVotes(NodeId nodeid, const avalanche::Response &response,
                       std::vector<avalanche::BlockUpdate> &updates) {
        int banscore;
        std::string error;
        return m_processor->registerVotes(nodeid, response, updates, banscore,
                                          error);
    }
};
} // namespace

BOOST_FIXTURE_TEST_SUITE(processor_tests, AvalancheTestingSetup)

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

    std::set<BlockUpdate::Status> status{
        BlockUpdate::Status::Invalid,
        BlockUpdate::Status::Rejected,
        BlockUpdate::Status::Accepted,
        BlockUpdate::Status::Finalized,
    };

    for (auto s : status) {
        BlockUpdate abu(pindex, s);
        BOOST_CHECK(abu.getBlockIndex() == pindex);
        BOOST_CHECK_EQUAL(abu.getStatus(), s);
    }
}

namespace {
Response next(Response &r) {
    auto copy = r;
    r = {r.getRound() + 1, r.getCooldown(), r.GetVotes()};
    return copy;
}
} // namespace

BOOST_AUTO_TEST_CASE(block_register) {
    std::vector<BlockUpdate> updates;

    CBlock block = CreateAndProcessBlock({}, CScript());
    const BlockHash blockHash = block.GetHash();
    const CBlockIndex *pindex;
    {
        LOCK(cs_main);
        pindex = LookupBlockIndex(blockHash);
    }

    // Create nodes that supports avalanche.
    auto avanodes = ConnectNodes();

    // Querying for random block returns false.
    BOOST_CHECK(!m_processor->isAccepted(pindex));

    // Add a new block. Check it is added to the polls.
    BOOST_CHECK(m_processor->addBlockToReconcile(pindex));
    auto invs = getInvsForNextPoll();
    BOOST_CHECK_EQUAL(invs.size(), 1);
    BOOST_CHECK_EQUAL(invs[0].type, MSG_BLOCK);
    BOOST_CHECK(invs[0].hash == blockHash);

    // Newly added blocks' state reflect the blockchain.
    BOOST_CHECK(m_processor->isAccepted(pindex));

    int nextNodeIndex = 0;
    auto registerNewVote = [&](const Response &resp) {
        runEventLoop();
        auto nodeid = avanodes[nextNodeIndex++ % avanodes.size()]->GetId();
        BOOST_CHECK(registerVotes(nodeid, resp, updates));
    };

    // Let's vote for this block a few times.
    Response resp{0, 0, {Vote(0, blockHash)}};
    for (int i = 0; i < 6; i++) {
        registerNewVote(next(resp));
        BOOST_CHECK(m_processor->isAccepted(pindex));
        BOOST_CHECK_EQUAL(m_processor->getConfidence(pindex), 0);
        BOOST_CHECK_EQUAL(updates.size(), 0);
    }

    // A single neutral vote do not change anything.
    resp = {getRound(), 0, {Vote(-1, blockHash)}};
    registerNewVote(next(resp));
    BOOST_CHECK(m_processor->isAccepted(pindex));
    BOOST_CHECK_EQUAL(m_processor->getConfidence(pindex), 0);
    BOOST_CHECK_EQUAL(updates.size(), 0);

    resp = {getRound(), 0, {Vote(0, blockHash)}};
    for (int i = 1; i < 7; i++) {
        registerNewVote(next(resp));
        BOOST_CHECK(m_processor->isAccepted(pindex));
        BOOST_CHECK_EQUAL(m_processor->getConfidence(pindex), i);
        BOOST_CHECK_EQUAL(updates.size(), 0);
    }

    // Two neutral votes will stall progress.
    resp = {getRound(), 0, {Vote(-1, blockHash)}};
    registerNewVote(next(resp));
    BOOST_CHECK(m_processor->isAccepted(pindex));
    BOOST_CHECK_EQUAL(m_processor->getConfidence(pindex), 6);
    BOOST_CHECK_EQUAL(updates.size(), 0);
    registerNewVote(next(resp));
    BOOST_CHECK(m_processor->isAccepted(pindex));
    BOOST_CHECK_EQUAL(m_processor->getConfidence(pindex), 6);
    BOOST_CHECK_EQUAL(updates.size(), 0);

    resp = {getRound(), 0, {Vote(0, blockHash)}};
    for (int i = 2; i < 8; i++) {
        registerNewVote(next(resp));
        BOOST_CHECK(m_processor->isAccepted(pindex));
        BOOST_CHECK_EQUAL(m_processor->getConfidence(pindex), 6);
        BOOST_CHECK_EQUAL(updates.size(), 0);
    }

    // We vote for it numerous times to finalize it.
    for (int i = 7; i < AVALANCHE_FINALIZATION_SCORE; i++) {
        registerNewVote(next(resp));
        BOOST_CHECK(m_processor->isAccepted(pindex));
        BOOST_CHECK_EQUAL(m_processor->getConfidence(pindex), i);
        BOOST_CHECK_EQUAL(updates.size(), 0);
    }

    // As long as it is not finalized, we poll.
    invs = getInvsForNextPoll();
    BOOST_CHECK_EQUAL(invs.size(), 1);
    BOOST_CHECK_EQUAL(invs[0].type, MSG_BLOCK);
    BOOST_CHECK(invs[0].hash == blockHash);

    // Now finalize the decision.
    registerNewVote(next(resp));
    BOOST_CHECK_EQUAL(updates.size(), 1);
    BOOST_CHECK(updates[0].getBlockIndex() == pindex);
    BOOST_CHECK_EQUAL(updates[0].getStatus(), BlockUpdate::Status::Finalized);
    updates = {};

    // Once the decision is finalized, there is no poll for it.
    invs = getInvsForNextPoll();
    BOOST_CHECK_EQUAL(invs.size(), 0);

    // Now let's undo this and finalize rejection.
    BOOST_CHECK(m_processor->addBlockToReconcile(pindex));
    invs = getInvsForNextPoll();
    BOOST_CHECK_EQUAL(invs.size(), 1);
    BOOST_CHECK_EQUAL(invs[0].type, MSG_BLOCK);
    BOOST_CHECK(invs[0].hash == blockHash);

    resp = {getRound(), 0, {Vote(1, blockHash)}};
    for (int i = 0; i < 6; i++) {
        registerNewVote(next(resp));
        BOOST_CHECK(m_processor->isAccepted(pindex));
        BOOST_CHECK_EQUAL(updates.size(), 0);
    }

    // Now the state will flip.
    registerNewVote(next(resp));
    BOOST_CHECK(!m_processor->isAccepted(pindex));
    BOOST_CHECK_EQUAL(updates.size(), 1);
    BOOST_CHECK(updates[0].getBlockIndex() == pindex);
    BOOST_CHECK_EQUAL(updates[0].getStatus(), BlockUpdate::Status::Rejected);
    updates = {};

    // Now it is rejected, but we can vote for it numerous times.
    for (int i = 1; i < AVALANCHE_FINALIZATION_SCORE; i++) {
        registerNewVote(next(resp));
        BOOST_CHECK(!m_processor->isAccepted(pindex));
        BOOST_CHECK_EQUAL(updates.size(), 0);
    }

    // As long as it is not finalized, we poll.
    invs = getInvsForNextPoll();
    BOOST_CHECK_EQUAL(invs.size(), 1);
    BOOST_CHECK_EQUAL(invs[0].type, MSG_BLOCK);
    BOOST_CHECK(invs[0].hash == blockHash);

    // Now finalize the decision.
    registerNewVote(next(resp));
    BOOST_CHECK(!m_processor->isAccepted(pindex));
    BOOST_CHECK_EQUAL(updates.size(), 1);
    BOOST_CHECK(updates[0].getBlockIndex() == pindex);
    BOOST_CHECK_EQUAL(updates[0].getStatus(), BlockUpdate::Status::Invalid);
    updates = {};

    // Once the decision is finalized, there is no poll for it.
    invs = getInvsForNextPoll();
    BOOST_CHECK_EQUAL(invs.size(), 0);

    // Adding the block twice does nothing.
    BOOST_CHECK(m_processor->addBlockToReconcile(pindex));
    BOOST_CHECK(!m_processor->addBlockToReconcile(pindex));
    BOOST_CHECK(m_processor->isAccepted(pindex));
}

BOOST_AUTO_TEST_CASE(multi_block_register) {
    CBlockIndex indexA, indexB;

    std::vector<BlockUpdate> updates;

    // Create several nodes that support avalanche.
    auto avanodes = ConnectNodes();

    // Make sure the block has a hash.
    CBlock blockA = CreateAndProcessBlock({}, CScript());
    const BlockHash blockHashA = blockA.GetHash();

    CBlock blockB = CreateAndProcessBlock({}, CScript());
    const BlockHash blockHashB = blockB.GetHash();
    const CBlockIndex *pindexA;
    const CBlockIndex *pindexB;
    {
        LOCK(cs_main);
        pindexA = LookupBlockIndex(blockHashA);
        pindexB = LookupBlockIndex(blockHashB);
    }

    // Querying for random block returns false.
    BOOST_CHECK(!m_processor->isAccepted(pindexA));
    BOOST_CHECK(!m_processor->isAccepted(pindexB));

    // Start voting on block A.
    BOOST_CHECK(m_processor->addBlockToReconcile(pindexA));
    auto invs = getInvsForNextPoll();
    BOOST_CHECK_EQUAL(invs.size(), 1);
    BOOST_CHECK_EQUAL(invs[0].type, MSG_BLOCK);
    BOOST_CHECK(invs[0].hash == blockHashA);

    uint64_t round = getRound();
    runEventLoop();
    BOOST_CHECK(registerVotes(avanodes[0]->GetId(),
                              {round, 0, {Vote(0, blockHashA)}}, updates));
    BOOST_CHECK_EQUAL(updates.size(), 0);

    // Start voting on block B after one vote.
    Response resp{round + 1, 0, {Vote(0, blockHashB), Vote(0, blockHashA)}};
    BOOST_CHECK(m_processor->addBlockToReconcile(pindexB));
    invs = getInvsForNextPoll();
    BOOST_CHECK_EQUAL(invs.size(), 2);

    // Ensure B comes before A because it has accumulated more PoW.
    BOOST_CHECK_EQUAL(invs[0].type, MSG_BLOCK);
    BOOST_CHECK(invs[0].hash == blockHashB);
    BOOST_CHECK_EQUAL(invs[1].type, MSG_BLOCK);
    BOOST_CHECK(invs[1].hash == blockHashA);

    // Let's vote for these blocks a few times.
    for (int i = 0; i < 4; i++) {
        NodeId nodeid = getSuitableNodeToQuery();
        runEventLoop();
        BOOST_CHECK(registerVotes(nodeid, next(resp), updates));
        BOOST_CHECK_EQUAL(updates.size(), 0);
    }

    // Now it is accepted, but we can vote for it numerous times.
    for (int i = 0; i < AVALANCHE_FINALIZATION_SCORE; i++) {
        NodeId nodeid = getSuitableNodeToQuery();
        runEventLoop();
        BOOST_CHECK(registerVotes(nodeid, next(resp), updates));
        BOOST_CHECK_EQUAL(updates.size(), 0);
    }

    // Running two iterration of the event loop so that vote gets triggered on A
    // and B.
    NodeId firstNodeid = getSuitableNodeToQuery();
    runEventLoop();
    NodeId secondNodeid = getSuitableNodeToQuery();
    runEventLoop();

    BOOST_CHECK(firstNodeid != secondNodeid);

    // Next vote will finalize block A.
    BOOST_CHECK(registerVotes(firstNodeid, next(resp), updates));
    BOOST_CHECK_EQUAL(updates.size(), 1);
    BOOST_CHECK(updates[0].getBlockIndex() == pindexA);
    BOOST_CHECK_EQUAL(updates[0].getStatus(), BlockUpdate::Status::Finalized);
    updates = {};

    // We do not vote on A anymore.
    invs = getInvsForNextPoll();
    BOOST_CHECK_EQUAL(invs.size(), 1);
    BOOST_CHECK_EQUAL(invs[0].type, MSG_BLOCK);
    BOOST_CHECK(invs[0].hash == blockHashB);

    // Next vote will finalize block B.
    BOOST_CHECK(registerVotes(secondNodeid, resp, updates));
    BOOST_CHECK_EQUAL(updates.size(), 1);
    BOOST_CHECK(updates[0].getBlockIndex() == pindexB);
    BOOST_CHECK_EQUAL(updates[0].getStatus(), BlockUpdate::Status::Finalized);
    updates = {};

    // There is nothing left to vote on.
    invs = getInvsForNextPoll();
    BOOST_CHECK_EQUAL(invs.size(), 0);
}

BOOST_AUTO_TEST_CASE(poll_and_response) {
    std::vector<BlockUpdate> updates;

    CBlock block = CreateAndProcessBlock({}, CScript());
    const BlockHash blockHash = block.GetHash();
    const CBlockIndex *pindex;
    {
        LOCK(cs_main);
        pindex = LookupBlockIndex(blockHash);
    }

    // There is no node to query.
    BOOST_CHECK_EQUAL(getSuitableNodeToQuery(), NO_NODE);

    // Create a node that supports avalanche and one that doesn't.
    ConnectNode(NODE_NONE);
    auto avanode = ConnectNode(NODE_AVALANCHE);
    NodeId avanodeid = avanode->GetId();
    BOOST_CHECK(addNode(avanodeid));

    // It returns the avalanche peer.
    BOOST_CHECK_EQUAL(getSuitableNodeToQuery(), avanodeid);

    // Register a block and check it is added to the list of elements to poll.
    BOOST_CHECK(m_processor->addBlockToReconcile(pindex));
    auto invs = getInvsForNextPoll();
    BOOST_CHECK_EQUAL(invs.size(), 1);
    BOOST_CHECK_EQUAL(invs[0].type, MSG_BLOCK);
    BOOST_CHECK(invs[0].hash == blockHash);

    // Trigger a poll on avanode.
    uint64_t round = getRound();
    runEventLoop();

    // There is no more suitable peer available, so return nothing.
    BOOST_CHECK_EQUAL(getSuitableNodeToQuery(), NO_NODE);

    // Respond to the request.
    Response resp = {round, 0, {Vote(0, blockHash)}};
    BOOST_CHECK(registerVotes(avanodeid, resp, updates));
    BOOST_CHECK_EQUAL(updates.size(), 0);

    // Now that avanode fullfilled his request, it is added back to the list of
    // queriable nodes.
    BOOST_CHECK_EQUAL(getSuitableNodeToQuery(), avanodeid);

    auto checkRegisterVotesError = [&](NodeId nodeid,
                                       const avalanche::Response &response,
                                       const std::string &expectedError) {
        int banscore;
        std::string error;
        BOOST_CHECK(!m_processor->registerVotes(nodeid, response, updates,
                                                banscore, error));
        BOOST_CHECK_EQUAL(error, expectedError);
        BOOST_CHECK_EQUAL(updates.size(), 0);
    };

    // Sending a response when not polled fails.
    checkRegisterVotesError(avanodeid, next(resp), "unexpected-ava-response");

    // Trigger a poll on avanode.
    round = getRound();
    runEventLoop();
    BOOST_CHECK_EQUAL(getSuitableNodeToQuery(), NO_NODE);

    // Sending responses that do not match the request also fails.
    // 1. Too many results.
    resp = {round, 0, {Vote(0, blockHash), Vote(0, blockHash)}};
    runEventLoop();
    checkRegisterVotesError(avanodeid, resp, "invalid-ava-response-size");
    BOOST_CHECK_EQUAL(getSuitableNodeToQuery(), avanodeid);

    // 2. Not enough results.
    resp = {getRound(), 0, {}};
    runEventLoop();
    checkRegisterVotesError(avanodeid, resp, "invalid-ava-response-size");
    BOOST_CHECK_EQUAL(getSuitableNodeToQuery(), avanodeid);

    // 3. Do not match the poll.
    resp = {getRound(), 0, {Vote()}};
    runEventLoop();
    checkRegisterVotesError(avanodeid, resp, "invalid-ava-response-content");
    BOOST_CHECK_EQUAL(getSuitableNodeToQuery(), avanodeid);

    // 4. Invalid round count. Request is not discarded.
    uint64_t queryRound = getRound();
    runEventLoop();

    resp = {queryRound + 1, 0, {Vote()}};
    checkRegisterVotesError(avanodeid, resp, "unexpected-ava-response");

    resp = {queryRound - 1, 0, {Vote()}};
    checkRegisterVotesError(avanodeid, resp, "unexpected-ava-response");

    // 5. Making request for invalid nodes do not work. Request is not
    // discarded.
    resp = {queryRound, 0, {Vote(0, blockHash)}};
    checkRegisterVotesError(avanodeid + 1234, resp, "unexpected-ava-response");

    // Proper response gets processed and avanode is available again.
    resp = {queryRound, 0, {Vote(0, blockHash)}};
    BOOST_CHECK(registerVotes(avanodeid, resp, updates));
    BOOST_CHECK_EQUAL(updates.size(), 0);
    BOOST_CHECK_EQUAL(getSuitableNodeToQuery(), avanodeid);

    // Out of order response are rejected.
    CBlock block2 = CreateAndProcessBlock({}, CScript());
    const BlockHash blockHash2 = block2.GetHash();
    CBlockIndex *pindex2;
    {
        LOCK(cs_main);
        pindex2 = LookupBlockIndex(blockHash2);
    }
    BOOST_CHECK(m_processor->addBlockToReconcile(pindex2));

    resp = {getRound(), 0, {Vote(0, blockHash), Vote(0, blockHash2)}};
    runEventLoop();
    checkRegisterVotesError(avanodeid, resp, "invalid-ava-response-content");
    BOOST_CHECK_EQUAL(getSuitableNodeToQuery(), avanodeid);

    // But they are accepted in order.
    resp = {getRound(), 0, {Vote(0, blockHash2), Vote(0, blockHash)}};
    runEventLoop();
    BOOST_CHECK(registerVotes(avanodeid, resp, updates));
    BOOST_CHECK_EQUAL(updates.size(), 0);
    BOOST_CHECK_EQUAL(getSuitableNodeToQuery(), avanodeid);

    // When a block is marked invalid, stop polling.
    pindex2->nStatus = pindex2->nStatus.withFailed();
    resp = {getRound(), 0, {Vote(0, blockHash)}};
    runEventLoop();
    BOOST_CHECK(registerVotes(avanodeid, resp, updates));
    BOOST_CHECK_EQUAL(updates.size(), 0);
    BOOST_CHECK_EQUAL(getSuitableNodeToQuery(), avanodeid);
}

BOOST_AUTO_TEST_CASE(poll_inflight_timeout, *boost::unit_test::timeout(60)) {
    std::vector<BlockUpdate> updates;

    CBlock block = CreateAndProcessBlock({}, CScript());
    const BlockHash blockHash = block.GetHash();
    const CBlockIndex *pindex;
    {
        LOCK(cs_main);
        pindex = LookupBlockIndex(blockHash);
    }

    // Add the block
    BOOST_CHECK(m_processor->addBlockToReconcile(pindex));

    // Create a node that supports avalanche.
    auto avanode = ConnectNode(NODE_AVALANCHE);
    NodeId avanodeid = avanode->GetId();
    BOOST_CHECK(addNode(avanodeid));

    // Expire requests after some time.
    auto queryTimeDuration = std::chrono::milliseconds(10);
    m_processor->setQueryTimeoutDuration(queryTimeDuration);
    for (int i = 0; i < 10; i++) {
        Response resp = {getRound(), 0, {Vote(0, blockHash)}};

        auto start = std::chrono::steady_clock::now();
        runEventLoop();
        // We cannot guarantee that we'll wait for just 1ms, so we have to bail
        // if we aren't within the proper time range.
        std::this_thread::sleep_for(std::chrono::milliseconds(1));
        runEventLoop();

        bool ret = registerVotes(avanodeid, next(resp), updates);
        if (std::chrono::steady_clock::now() > start + queryTimeDuration) {
            // We waited for too long, bail. Because we can't know for sure when
            // previous steps ran, ret is not deterministic and we do not check
            // it.
            i--;
            continue;
        }

        // We are within time bounds, so the vote should have worked.
        BOOST_CHECK(ret);

        // Now try again but wait for expiration.
        runEventLoop();
        std::this_thread::sleep_for(queryTimeDuration);
        runEventLoop();
        BOOST_CHECK(!registerVotes(avanodeid, next(resp), updates));
    }
}

BOOST_AUTO_TEST_CASE(poll_inflight_count) {
    // Create enough nodes so that we run into the inflight request limit.
    auto proof = GetProof();
    BOOST_CHECK(m_processor->withPeerManager(
        [&](avalanche::PeerManager &pm) { return pm.registerProof(proof); }));

    std::array<CNode *, AVALANCHE_MAX_INFLIGHT_POLL + 1> nodes;
    for (auto &n : nodes) {
        n = ConnectNode(NODE_AVALANCHE);
        BOOST_CHECK(addNode(n->GetId(), proof->getId()));
    }

    // Add a block to poll
    CBlock block = CreateAndProcessBlock({}, CScript());
    const BlockHash blockHash = block.GetHash();
    const CBlockIndex *pindex;
    {
        LOCK(cs_main);
        pindex = LookupBlockIndex(blockHash);
    }
    BOOST_CHECK(m_processor->addBlockToReconcile(pindex));

    // Ensure there are enough requests in flight.
    std::map<NodeId, uint64_t> node_round_map;
    for (int i = 0; i < AVALANCHE_MAX_INFLIGHT_POLL; i++) {
        NodeId nodeid = getSuitableNodeToQuery();
        BOOST_CHECK(node_round_map.find(nodeid) == node_round_map.end());
        node_round_map.insert(std::pair<NodeId, uint64_t>(nodeid, getRound()));
        auto invs = getInvsForNextPoll();
        BOOST_CHECK_EQUAL(invs.size(), 1);
        BOOST_CHECK_EQUAL(invs[0].type, MSG_BLOCK);
        BOOST_CHECK(invs[0].hash == blockHash);
        runEventLoop();
    }

    // Now that we have enough in flight requests, we shouldn't poll.
    auto suitablenodeid = getSuitableNodeToQuery();
    BOOST_CHECK(suitablenodeid != NO_NODE);
    auto invs = getInvsForNextPoll();
    BOOST_CHECK_EQUAL(invs.size(), 0);
    runEventLoop();
    BOOST_CHECK_EQUAL(getSuitableNodeToQuery(), suitablenodeid);

    std::vector<BlockUpdate> updates;

    // Send one response, now we can poll again.
    auto it = node_round_map.begin();
    Response resp = {it->second, 0, {Vote(0, blockHash)}};
    BOOST_CHECK(registerVotes(it->first, resp, updates));
    node_round_map.erase(it);

    invs = getInvsForNextPoll();
    BOOST_CHECK_EQUAL(invs.size(), 1);
    BOOST_CHECK_EQUAL(invs[0].type, MSG_BLOCK);
    BOOST_CHECK(invs[0].hash == blockHash);
}

BOOST_AUTO_TEST_CASE(quorum_diversity) {
    std::vector<BlockUpdate> updates;

    CBlock block = CreateAndProcessBlock({}, CScript());
    const BlockHash blockHash = block.GetHash();
    const CBlockIndex *pindex;
    {
        LOCK(cs_main);
        pindex = LookupBlockIndex(blockHash);
    }

    // Create nodes that supports avalanche.
    auto avanodes = ConnectNodes();

    // Querying for random block returns false.
    BOOST_CHECK(!m_processor->isAccepted(pindex));

    // Add a new block. Check it is added to the polls.
    BOOST_CHECK(m_processor->addBlockToReconcile(pindex));

    // Do one valid round of voting.
    uint64_t round = getRound();
    Response resp{round, 0, {Vote(0, blockHash)}};

    // Check that all nodes can vote.
    for (size_t i = 0; i < avanodes.size(); i++) {
        runEventLoop();
        BOOST_CHECK(registerVotes(avanodes[i]->GetId(), next(resp), updates));
    }

    // Generate a query for every single node.
    const NodeId firstNodeId = getSuitableNodeToQuery();
    std::map<NodeId, uint64_t> node_round_map;
    round = getRound();
    for (size_t i = 0; i < avanodes.size(); i++) {
        NodeId nodeid = getSuitableNodeToQuery();
        BOOST_CHECK(node_round_map.find(nodeid) == node_round_map.end());
        node_round_map[nodeid] = getRound();
        runEventLoop();
    }

    // Now only the first node can vote. All others would be duplicate in the
    // quorum.
    auto confidence = m_processor->getConfidence(pindex);
    BOOST_REQUIRE(confidence > 0);

    for (auto &[nodeid, r] : node_round_map) {
        if (nodeid == firstNodeId) {
            // Node 0 is the only one which can vote at this stage.
            round = r;
            continue;
        }

        BOOST_CHECK(
            registerVotes(nodeid, {r, 0, {Vote(0, blockHash)}}, updates));
        BOOST_CHECK_EQUAL(m_processor->getConfidence(pindex), confidence);
    }

    BOOST_CHECK(
        registerVotes(firstNodeId, {round, 0, {Vote(0, blockHash)}}, updates));
    BOOST_CHECK_EQUAL(m_processor->getConfidence(pindex), confidence + 1);
}

BOOST_AUTO_TEST_CASE(event_loop) {
    CScheduler s;

    CBlock block = CreateAndProcessBlock({}, CScript());
    const BlockHash blockHash = block.GetHash();
    const CBlockIndex *pindex;
    {
        LOCK(cs_main);
        pindex = LookupBlockIndex(blockHash);
    }

    // Starting the event loop.
    BOOST_CHECK(m_processor->startEventLoop(s));

    // There is one task planned in the next hour (our event loop).
    std::chrono::system_clock::time_point start, stop;
    BOOST_CHECK_EQUAL(s.getQueueInfo(start, stop), 1);

    // Starting twice doesn't start it twice.
    BOOST_CHECK(!m_processor->startEventLoop(s));

    // Start the scheduler thread.
    std::thread schedulerThread(std::bind(&CScheduler::serviceQueue, &s));

    // Create a node that supports avalanche.
    auto avanode = ConnectNode(NODE_AVALANCHE);
    NodeId nodeid = avanode->GetId();
    BOOST_CHECK(addNode(nodeid));

    // There is no query in flight at the moment.
    BOOST_CHECK_EQUAL(getSuitableNodeToQuery(), nodeid);

    // Add a new block. Check it is added to the polls.
    uint64_t queryRound = getRound();
    BOOST_CHECK(m_processor->addBlockToReconcile(pindex));

    for (int i = 0; i < 60 * 1000; i++) {
        // Technically, this is a race condition, but this should do just fine
        // as we wait up to 1 minute for an event that should take 10ms.
        UninterruptibleSleep(std::chrono::milliseconds(1));
        if (getRound() != queryRound) {
            break;
        }
    }

    // Check that we effectively got a request and not timed out.
    BOOST_CHECK(getRound() > queryRound);

    // Respond and check the cooldown time is respected.
    uint64_t responseRound = getRound();
    auto queryTime =
        std::chrono::steady_clock::now() + std::chrono::milliseconds(100);

    std::vector<BlockUpdate> updates;
    registerVotes(nodeid, {queryRound, 100, {Vote(0, blockHash)}}, updates);
    for (int i = 0; i < 10000; i++) {
        // We make sure that we do not get a request before queryTime.
        UninterruptibleSleep(std::chrono::milliseconds(1));
        if (getRound() != responseRound) {
            BOOST_CHECK(std::chrono::steady_clock::now() > queryTime);
            break;
        }
    }

    // But we eventually get one.
    BOOST_CHECK(getRound() > responseRound);

    // Stop event loop.
    BOOST_CHECK(m_processor->stopEventLoop());

    // We don't have any task scheduled anymore.
    BOOST_CHECK_EQUAL(s.getQueueInfo(start, stop), 0);

    // Can't stop the event loop twice.
    BOOST_CHECK(!m_processor->stopEventLoop());

    // Wait for the scheduler to stop.
    s.StopWhenDrained();
    schedulerThread.join();
}

BOOST_AUTO_TEST_CASE(destructor) {
    CScheduler s;
    std::chrono::system_clock::time_point start, stop;

    std::thread schedulerThread;
    BOOST_CHECK(m_processor->startEventLoop(s));
    BOOST_CHECK_EQUAL(s.getQueueInfo(start, stop), 1);

    // Start the service thread after the queue size check to prevent a race
    // condition where the thread may be processing the event loop task during
    // the check.
    schedulerThread = std::thread(std::bind(&CScheduler::serviceQueue, &s));

    // Destroy the processor.
    m_processor.reset();

    // Now that avalanche is destroyed, there is no more scheduled tasks.
    BOOST_CHECK_EQUAL(s.getQueueInfo(start, stop), 0);

    // Wait for the scheduler to stop.
    s.StopWhenDrained();
    schedulerThread.join();
}

BOOST_AUTO_TEST_SUITE_END()
