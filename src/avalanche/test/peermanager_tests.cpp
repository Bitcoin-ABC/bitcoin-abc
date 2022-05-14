// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/delegationbuilder.h>
#include <avalanche/peermanager.h>
#include <avalanche/proofbuilder.h>
#include <avalanche/proofcomparator.h>
#include <avalanche/test/util.h>
#include <script/standard.h>
#include <util/time.h>
#include <util/translation.h>
#include <validation.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

using namespace avalanche;

namespace avalanche {
namespace {
    struct TestPeerManager {
        static bool nodeBelongToPeer(const PeerManager &pm, NodeId nodeid,
                                     PeerId peerid) {
            return pm.forNode(nodeid, [&](const Node &node) {
                return node.peerid == peerid;
            });
        }

        static bool isNodePending(const PeerManager &pm, NodeId nodeid) {
            auto &pendingNodesView = pm.pendingNodes.get<by_nodeid>();
            return pendingNodesView.find(nodeid) != pendingNodesView.end();
        }

        static PeerId getPeerIdForProofId(PeerManager &pm,
                                          const ProofId &proofid) {
            auto &pview = pm.peers.get<by_proofid>();
            auto it = pview.find(proofid);
            return it == pview.end() ? NO_PEER : it->peerid;
        }

        static PeerId registerAndGetPeerId(PeerManager &pm,
                                           const ProofRef &proof) {
            pm.registerProof(proof);
            return getPeerIdForProofId(pm, proof->getId());
        }

        static std::vector<uint32_t> getOrderedScores(const PeerManager &pm) {
            std::vector<uint32_t> scores;

            auto &peerView = pm.peers.get<by_score>();
            for (const Peer &peer : peerView) {
                scores.push_back(peer.getScore());
            }

            return scores;
        }
    };

    static void addCoin(const COutPoint &outpoint, const CKey &key,
                        const Amount amount = 10 * COIN, uint32_t height = 100,
                        bool is_coinbase = false) {
        CScript script = GetScriptForDestination(PKHash(key.GetPubKey()));

        LOCK(cs_main);
        CCoinsViewCache &coins = ::ChainstateActive().CoinsTip();
        coins.AddCoin(outpoint,
                      Coin(CTxOut(amount, script), height, is_coinbase), false);
    }

    static COutPoint createUtxo(const CKey &key,
                                const Amount amount = 10 * COIN,
                                uint32_t height = 100,
                                bool is_coinbase = false) {
        COutPoint outpoint(TxId(GetRandHash()), 0);
        addCoin(outpoint, key, amount, height, is_coinbase);
        return outpoint;
    }

    static ProofRef
    buildProof(const CKey &key,
               const std::vector<std::tuple<COutPoint, Amount>> &outpoints,
               const CKey &master = CKey::MakeCompressedKey(),
               int64_t sequence = 1, uint32_t height = 100,
               bool is_coinbase = false, int64_t expirationTime = 0) {
        ProofBuilder pb(sequence, expirationTime, master);
        for (const auto &outpoint : outpoints) {
            BOOST_CHECK(pb.addUTXO(std::get<0>(outpoint), std::get<1>(outpoint),
                                   height, is_coinbase, key));
        }
        return pb.build();
    }

    template <typename... Args>
    static ProofRef
    buildProofWithOutpoints(const CKey &key,
                            const std::vector<COutPoint> &outpoints,
                            Amount amount, Args &&...args) {
        std::vector<std::tuple<COutPoint, Amount>> outpointsWithAmount;
        std::transform(
            outpoints.begin(), outpoints.end(),
            std::back_inserter(outpointsWithAmount),
            [amount](const auto &o) { return std::make_tuple(o, amount); });
        return buildProof(key, outpointsWithAmount,
                          std::forward<Args>(args)...);
    }

    static ProofRef
    buildProofWithSequence(const CKey &key,
                           const std::vector<COutPoint> &outpoints,
                           int64_t sequence) {
        return buildProofWithOutpoints(key, outpoints, 10 * COIN, key,
                                       sequence);
    }
} // namespace
} // namespace avalanche

namespace {
struct NoCoolDownFixture : public TestingSetup {
    NoCoolDownFixture() {
        gArgs.ForceSetArg("-avalancheconflictingproofcooldown", "0");
    }
    ~NoCoolDownFixture() {
        gArgs.ClearForcedArg("-avalancheconflictingproofcooldown");
    }
};
} // namespace

BOOST_FIXTURE_TEST_SUITE(peermanager_tests, TestingSetup)

BOOST_AUTO_TEST_CASE(select_peer_linear) {
    // No peers.
    BOOST_CHECK_EQUAL(selectPeerImpl({}, 0, 0), NO_PEER);
    BOOST_CHECK_EQUAL(selectPeerImpl({}, 1, 3), NO_PEER);

    // One peer
    const std::vector<Slot> oneslot = {{100, 100, 23}};

    // Undershoot
    BOOST_CHECK_EQUAL(selectPeerImpl(oneslot, 0, 300), NO_PEER);
    BOOST_CHECK_EQUAL(selectPeerImpl(oneslot, 42, 300), NO_PEER);
    BOOST_CHECK_EQUAL(selectPeerImpl(oneslot, 99, 300), NO_PEER);

    // Nailed it
    BOOST_CHECK_EQUAL(selectPeerImpl(oneslot, 100, 300), 23);
    BOOST_CHECK_EQUAL(selectPeerImpl(oneslot, 142, 300), 23);
    BOOST_CHECK_EQUAL(selectPeerImpl(oneslot, 199, 300), 23);

    // Overshoot
    BOOST_CHECK_EQUAL(selectPeerImpl(oneslot, 200, 300), NO_PEER);
    BOOST_CHECK_EQUAL(selectPeerImpl(oneslot, 242, 300), NO_PEER);
    BOOST_CHECK_EQUAL(selectPeerImpl(oneslot, 299, 300), NO_PEER);

    // Two peers
    const std::vector<Slot> twoslots = {{100, 100, 69}, {300, 100, 42}};

    // Undershoot
    BOOST_CHECK_EQUAL(selectPeerImpl(twoslots, 0, 500), NO_PEER);
    BOOST_CHECK_EQUAL(selectPeerImpl(twoslots, 42, 500), NO_PEER);
    BOOST_CHECK_EQUAL(selectPeerImpl(twoslots, 99, 500), NO_PEER);

    // First entry
    BOOST_CHECK_EQUAL(selectPeerImpl(twoslots, 100, 500), 69);
    BOOST_CHECK_EQUAL(selectPeerImpl(twoslots, 142, 500), 69);
    BOOST_CHECK_EQUAL(selectPeerImpl(twoslots, 199, 500), 69);

    // In between
    BOOST_CHECK_EQUAL(selectPeerImpl(twoslots, 200, 500), NO_PEER);
    BOOST_CHECK_EQUAL(selectPeerImpl(twoslots, 242, 500), NO_PEER);
    BOOST_CHECK_EQUAL(selectPeerImpl(twoslots, 299, 500), NO_PEER);

    // Second entry
    BOOST_CHECK_EQUAL(selectPeerImpl(twoslots, 300, 500), 42);
    BOOST_CHECK_EQUAL(selectPeerImpl(twoslots, 342, 500), 42);
    BOOST_CHECK_EQUAL(selectPeerImpl(twoslots, 399, 500), 42);

    // Overshoot
    BOOST_CHECK_EQUAL(selectPeerImpl(twoslots, 400, 500), NO_PEER);
    BOOST_CHECK_EQUAL(selectPeerImpl(twoslots, 442, 500), NO_PEER);
    BOOST_CHECK_EQUAL(selectPeerImpl(twoslots, 499, 500), NO_PEER);
}

BOOST_AUTO_TEST_CASE(select_peer_dichotomic) {
    std::vector<Slot> slots;

    // 100 peers of size 1 with 1 empty element apart.
    uint64_t max = 1;
    for (int i = 0; i < 100; i++) {
        slots.emplace_back(max, 1, i);
        max += 2;
    }

    BOOST_CHECK_EQUAL(selectPeerImpl(slots, 4, max), NO_PEER);

    // Check that we get what we expect.
    for (int i = 0; i < 100; i++) {
        BOOST_CHECK_EQUAL(selectPeerImpl(slots, 2 * i, max), NO_PEER);
        BOOST_CHECK_EQUAL(selectPeerImpl(slots, 2 * i + 1, max), i);
    }

    BOOST_CHECK_EQUAL(selectPeerImpl(slots, max, max), NO_PEER);

    // Update the slots to be heavily skewed toward the last element.
    slots[99] = slots[99].withScore(101);
    max = slots[99].getStop();
    BOOST_CHECK_EQUAL(max, 300);

    for (int i = 0; i < 100; i++) {
        BOOST_CHECK_EQUAL(selectPeerImpl(slots, 2 * i, max), NO_PEER);
        BOOST_CHECK_EQUAL(selectPeerImpl(slots, 2 * i + 1, max), i);
    }

    BOOST_CHECK_EQUAL(selectPeerImpl(slots, 200, max), 99);
    BOOST_CHECK_EQUAL(selectPeerImpl(slots, 256, max), 99);
    BOOST_CHECK_EQUAL(selectPeerImpl(slots, 299, max), 99);
    BOOST_CHECK_EQUAL(selectPeerImpl(slots, 300, max), NO_PEER);

    // Update the slots to be heavily skewed toward the first element.
    for (int i = 0; i < 100; i++) {
        slots[i] = slots[i].withStart(slots[i].getStart() + 100);
    }

    slots[0] = Slot(1, slots[0].getStop() - 1, slots[0].getPeerId());
    slots[99] = slots[99].withScore(1);
    max = slots[99].getStop();
    BOOST_CHECK_EQUAL(max, 300);

    BOOST_CHECK_EQUAL(selectPeerImpl(slots, 0, max), NO_PEER);
    BOOST_CHECK_EQUAL(selectPeerImpl(slots, 1, max), 0);
    BOOST_CHECK_EQUAL(selectPeerImpl(slots, 42, max), 0);

    for (int i = 0; i < 100; i++) {
        BOOST_CHECK_EQUAL(selectPeerImpl(slots, 100 + 2 * i + 1, max), i);
        BOOST_CHECK_EQUAL(selectPeerImpl(slots, 100 + 2 * i + 2, max), NO_PEER);
    }
}

BOOST_AUTO_TEST_CASE(select_peer_random) {
    for (int c = 0; c < 1000; c++) {
        size_t size = InsecureRandBits(10) + 1;
        std::vector<Slot> slots;
        slots.reserve(size);

        uint64_t max = InsecureRandBits(3);
        auto next = [&]() {
            uint64_t r = max;
            max += InsecureRandBits(3);
            return r;
        };

        for (size_t i = 0; i < size; i++) {
            const uint64_t start = next();
            const uint32_t score = InsecureRandBits(3);
            max += score;
            slots.emplace_back(start, score, i);
        }

        for (int k = 0; k < 100; k++) {
            uint64_t s = max > 0 ? InsecureRandRange(max) : 0;
            auto i = selectPeerImpl(slots, s, max);
            // /!\ Because of the way we construct the vector, the peer id is
            // always the index. This might not be the case in practice.
            BOOST_CHECK(i == NO_PEER || slots[i].contains(s));
        }
    }
}

static void addNodeWithScore(avalanche::PeerManager &pm, NodeId node,
                             uint32_t score) {
    auto proof = buildRandomProof(score);
    BOOST_CHECK(pm.registerProof(proof));
    BOOST_CHECK(pm.addNode(node, proof->getId()));
};

BOOST_AUTO_TEST_CASE(peer_probabilities) {
    // No peers.
    avalanche::PeerManager pm;
    BOOST_CHECK_EQUAL(pm.selectNode(), NO_NODE);

    const NodeId node0 = 42, node1 = 69, node2 = 37;

    // One peer, we always return it.
    addNodeWithScore(pm, node0, MIN_VALID_PROOF_SCORE);
    BOOST_CHECK_EQUAL(pm.selectNode(), node0);

    // Two peers, verify ratio.
    addNodeWithScore(pm, node1, 2 * MIN_VALID_PROOF_SCORE);

    std::unordered_map<PeerId, int> results = {};
    for (int i = 0; i < 10000; i++) {
        size_t n = pm.selectNode();
        BOOST_CHECK(n == node0 || n == node1);
        results[n]++;
    }

    BOOST_CHECK(abs(2 * results[0] - results[1]) < 500);

    // Three peers, verify ratio.
    addNodeWithScore(pm, node2, MIN_VALID_PROOF_SCORE);

    results.clear();
    for (int i = 0; i < 10000; i++) {
        size_t n = pm.selectNode();
        BOOST_CHECK(n == node0 || n == node1 || n == node2);
        results[n]++;
    }

    BOOST_CHECK(abs(results[0] - results[1] + results[2]) < 500);
}

BOOST_AUTO_TEST_CASE(remove_peer) {
    // No peers.
    avalanche::PeerManager pm;
    BOOST_CHECK_EQUAL(pm.selectPeer(), NO_PEER);

    // Add 4 peers.
    std::array<PeerId, 8> peerids;
    for (int i = 0; i < 4; i++) {
        auto p = buildRandomProof(100);
        peerids[i] = TestPeerManager::registerAndGetPeerId(pm, p);
        BOOST_CHECK(pm.addNode(InsecureRand32(), p->getId()));
    }

    BOOST_CHECK_EQUAL(pm.getSlotCount(), 400);
    BOOST_CHECK_EQUAL(pm.getFragmentation(), 0);

    for (int i = 0; i < 100; i++) {
        PeerId p = pm.selectPeer();
        BOOST_CHECK(p == peerids[0] || p == peerids[1] || p == peerids[2] ||
                    p == peerids[3]);
    }

    // Remove one peer, it nevers show up now.
    BOOST_CHECK(pm.removePeer(peerids[2]));
    BOOST_CHECK_EQUAL(pm.getSlotCount(), 400);
    BOOST_CHECK_EQUAL(pm.getFragmentation(), 100);

    // Make sure we compact to never get NO_PEER.
    BOOST_CHECK_EQUAL(pm.compact(), 100);
    BOOST_CHECK(pm.verify());
    BOOST_CHECK_EQUAL(pm.getSlotCount(), 300);
    BOOST_CHECK_EQUAL(pm.getFragmentation(), 0);

    for (int i = 0; i < 100; i++) {
        PeerId p = pm.selectPeer();
        BOOST_CHECK(p == peerids[0] || p == peerids[1] || p == peerids[3]);
    }

    // Add 4 more peers.
    for (int i = 0; i < 4; i++) {
        auto p = buildRandomProof(100);
        peerids[i + 4] = TestPeerManager::registerAndGetPeerId(pm, p);
        BOOST_CHECK(pm.addNode(InsecureRand32(), p->getId()));
    }

    BOOST_CHECK_EQUAL(pm.getSlotCount(), 700);
    BOOST_CHECK_EQUAL(pm.getFragmentation(), 0);

    BOOST_CHECK(pm.removePeer(peerids[0]));
    BOOST_CHECK_EQUAL(pm.getSlotCount(), 700);
    BOOST_CHECK_EQUAL(pm.getFragmentation(), 100);

    // Removing the last entry do not increase fragmentation.
    BOOST_CHECK(pm.removePeer(peerids[7]));
    BOOST_CHECK_EQUAL(pm.getSlotCount(), 600);
    BOOST_CHECK_EQUAL(pm.getFragmentation(), 100);

    // Make sure we compact to never get NO_PEER.
    BOOST_CHECK_EQUAL(pm.compact(), 100);
    BOOST_CHECK(pm.verify());
    BOOST_CHECK_EQUAL(pm.getSlotCount(), 500);
    BOOST_CHECK_EQUAL(pm.getFragmentation(), 0);

    for (int i = 0; i < 100; i++) {
        PeerId p = pm.selectPeer();
        BOOST_CHECK(p == peerids[1] || p == peerids[3] || p == peerids[4] ||
                    p == peerids[5] || p == peerids[6]);
    }

    // Removing non existent peers fails.
    BOOST_CHECK(!pm.removePeer(peerids[0]));
    BOOST_CHECK(!pm.removePeer(peerids[2]));
    BOOST_CHECK(!pm.removePeer(peerids[7]));
    BOOST_CHECK(!pm.removePeer(NO_PEER));
}

BOOST_AUTO_TEST_CASE(compact_slots) {
    avalanche::PeerManager pm;

    // Add 4 peers.
    std::array<PeerId, 4> peerids;
    for (int i = 0; i < 4; i++) {
        auto p = buildRandomProof(100);
        peerids[i] = TestPeerManager::registerAndGetPeerId(pm, p);
        BOOST_CHECK(pm.addNode(InsecureRand32(), p->getId()));
    }

    // Remove all peers.
    for (auto p : peerids) {
        pm.removePeer(p);
    }

    BOOST_CHECK_EQUAL(pm.getSlotCount(), 300);
    BOOST_CHECK_EQUAL(pm.getFragmentation(), 300);

    for (int i = 0; i < 100; i++) {
        BOOST_CHECK_EQUAL(pm.selectPeer(), NO_PEER);
    }

    BOOST_CHECK_EQUAL(pm.compact(), 300);
    BOOST_CHECK(pm.verify());
    BOOST_CHECK_EQUAL(pm.getSlotCount(), 0);
    BOOST_CHECK_EQUAL(pm.getFragmentation(), 0);
}

BOOST_AUTO_TEST_CASE(node_crud) {
    avalanche::PeerManager pm;

    // Create one peer.
    auto proof = buildRandomProof(10000000 * MIN_VALID_PROOF_SCORE);
    BOOST_CHECK(pm.registerProof(proof));
    BOOST_CHECK_EQUAL(pm.selectNode(), NO_NODE);

    // Add 4 nodes.
    const ProofId &proofid = proof->getId();
    for (int i = 0; i < 4; i++) {
        BOOST_CHECK(pm.addNode(i, proofid));
    }

    for (int i = 0; i < 100; i++) {
        NodeId n = pm.selectNode();
        BOOST_CHECK(n >= 0 && n < 4);
        BOOST_CHECK(
            pm.updateNextRequestTime(n, std::chrono::steady_clock::now()));
    }

    // Remove a node, check that it doesn't show up.
    BOOST_CHECK(pm.removeNode(2));

    for (int i = 0; i < 100; i++) {
        NodeId n = pm.selectNode();
        BOOST_CHECK(n == 0 || n == 1 || n == 3);
        BOOST_CHECK(
            pm.updateNextRequestTime(n, std::chrono::steady_clock::now()));
    }

    // Push a node's timeout in the future, so that it doesn't show up.
    BOOST_CHECK(pm.updateNextRequestTime(1, std::chrono::steady_clock::now() +
                                                std::chrono::hours(24)));

    for (int i = 0; i < 100; i++) {
        NodeId n = pm.selectNode();
        BOOST_CHECK(n == 0 || n == 3);
        BOOST_CHECK(
            pm.updateNextRequestTime(n, std::chrono::steady_clock::now()));
    }

    // Move a node from a peer to another. This peer has a very low score such
    // as chances of being picked are 1 in 10 million.
    addNodeWithScore(pm, 3, MIN_VALID_PROOF_SCORE);

    int node3selected = 0;
    for (int i = 0; i < 100; i++) {
        NodeId n = pm.selectNode();
        if (n == 3) {
            // Selecting this node should be exceedingly unlikely.
            BOOST_CHECK(node3selected++ < 1);
        } else {
            BOOST_CHECK_EQUAL(n, 0);
        }
        BOOST_CHECK(
            pm.updateNextRequestTime(n, std::chrono::steady_clock::now()));
    }
}

BOOST_AUTO_TEST_CASE(node_binding) {
    avalanche::PeerManager pm;

    auto proof = buildRandomProof(MIN_VALID_PROOF_SCORE);
    const ProofId &proofid = proof->getId();

    BOOST_CHECK_EQUAL(pm.getNodeCount(), 0);
    BOOST_CHECK_EQUAL(pm.getPendingNodeCount(), 0);

    // Add a bunch of nodes with no associated peer
    for (int i = 0; i < 10; i++) {
        BOOST_CHECK(!pm.addNode(i, proofid));
        BOOST_CHECK(TestPeerManager::isNodePending(pm, i));
        BOOST_CHECK_EQUAL(pm.getNodeCount(), 0);
        BOOST_CHECK_EQUAL(pm.getPendingNodeCount(), i + 1);
    }

    // Now create the peer and check all the nodes are bound
    const PeerId peerid = TestPeerManager::registerAndGetPeerId(pm, proof);
    BOOST_CHECK_NE(peerid, NO_PEER);
    for (int i = 0; i < 10; i++) {
        BOOST_CHECK(!TestPeerManager::isNodePending(pm, i));
        BOOST_CHECK(TestPeerManager::nodeBelongToPeer(pm, i, peerid));
        BOOST_CHECK_EQUAL(pm.getNodeCount(), 10);
        BOOST_CHECK_EQUAL(pm.getPendingNodeCount(), 0);
    }
    BOOST_CHECK(pm.verify());

    // Disconnect some nodes
    for (int i = 0; i < 5; i++) {
        BOOST_CHECK(pm.removeNode(i));
        BOOST_CHECK(!TestPeerManager::isNodePending(pm, i));
        BOOST_CHECK(!TestPeerManager::nodeBelongToPeer(pm, i, peerid));
        BOOST_CHECK_EQUAL(pm.getNodeCount(), 10 - i - 1);
        BOOST_CHECK_EQUAL(pm.getPendingNodeCount(), 0);
    }

    // Add nodes when the peer already exists
    for (int i = 0; i < 5; i++) {
        BOOST_CHECK(pm.addNode(i, proofid));
        BOOST_CHECK(!TestPeerManager::isNodePending(pm, i));
        BOOST_CHECK(TestPeerManager::nodeBelongToPeer(pm, i, peerid));
        BOOST_CHECK_EQUAL(pm.getNodeCount(), 5 + i + 1);
        BOOST_CHECK_EQUAL(pm.getPendingNodeCount(), 0);
    }

    auto alt_proof = buildRandomProof(MIN_VALID_PROOF_SCORE);
    const ProofId &alt_proofid = alt_proof->getId();

    // Update some nodes from a known proof to an unknown proof
    for (int i = 0; i < 5; i++) {
        BOOST_CHECK(!pm.addNode(i, alt_proofid));
        BOOST_CHECK(TestPeerManager::isNodePending(pm, i));
        BOOST_CHECK(!TestPeerManager::nodeBelongToPeer(pm, i, peerid));
        BOOST_CHECK_EQUAL(pm.getNodeCount(), 10 - i - 1);
        BOOST_CHECK_EQUAL(pm.getPendingNodeCount(), i + 1);
    }

    auto alt2_proof = buildRandomProof(MIN_VALID_PROOF_SCORE);
    const ProofId &alt2_proofid = alt2_proof->getId();

    // Update some nodes from an unknown proof to another unknown proof
    for (int i = 0; i < 5; i++) {
        BOOST_CHECK(!pm.addNode(i, alt2_proofid));
        BOOST_CHECK(TestPeerManager::isNodePending(pm, i));
        BOOST_CHECK_EQUAL(pm.getNodeCount(), 5);
        BOOST_CHECK_EQUAL(pm.getPendingNodeCount(), 5);
    }

    // Update some nodes from an unknown proof to a known proof
    for (int i = 0; i < 5; i++) {
        BOOST_CHECK(pm.addNode(i, proofid));
        BOOST_CHECK(!TestPeerManager::isNodePending(pm, i));
        BOOST_CHECK(TestPeerManager::nodeBelongToPeer(pm, i, peerid));
        BOOST_CHECK_EQUAL(pm.getNodeCount(), 5 + i + 1);
        BOOST_CHECK_EQUAL(pm.getPendingNodeCount(), 5 - i - 1);
    }

    // Remove the peer, the nodes should be pending again
    BOOST_CHECK(pm.removePeer(peerid));
    BOOST_CHECK(!pm.exists(proof->getId()));
    for (int i = 0; i < 10; i++) {
        BOOST_CHECK(TestPeerManager::isNodePending(pm, i));
        BOOST_CHECK(!TestPeerManager::nodeBelongToPeer(pm, i, peerid));
        BOOST_CHECK_EQUAL(pm.getNodeCount(), 0);
        BOOST_CHECK_EQUAL(pm.getPendingNodeCount(), 10);
    }
    BOOST_CHECK(pm.verify());

    // Remove the remaining pending nodes, check the count drops accordingly
    for (int i = 0; i < 10; i++) {
        BOOST_CHECK(pm.removeNode(i));
        BOOST_CHECK(!TestPeerManager::isNodePending(pm, i));
        BOOST_CHECK(!TestPeerManager::nodeBelongToPeer(pm, i, peerid));
        BOOST_CHECK_EQUAL(pm.getNodeCount(), 0);
        BOOST_CHECK_EQUAL(pm.getPendingNodeCount(), 10 - i - 1);
    }
}

BOOST_AUTO_TEST_CASE(node_binding_reorg) {
    avalanche::PeerManager pm;

    auto key = CKey::MakeCompressedKey();

    COutPoint utxo = createUtxo(key);

    auto proof = buildProofWithOutpoints(key, {utxo}, 10 * COIN);
    const ProofId &proofid = proof->getId();

    PeerId peerid = TestPeerManager::registerAndGetPeerId(pm, proof);
    BOOST_CHECK_NE(peerid, NO_PEER);
    BOOST_CHECK(pm.verify());

    // Add nodes to our peer
    for (int i = 0; i < 10; i++) {
        BOOST_CHECK(pm.addNode(i, proofid));
        BOOST_CHECK(!TestPeerManager::isNodePending(pm, i));
        BOOST_CHECK(TestPeerManager::nodeBelongToPeer(pm, i, peerid));
    }

    // Orphan the proof
    {
        LOCK(cs_main);
        CCoinsViewCache &coins = ::ChainstateActive().CoinsTip();
        coins.SpendCoin(utxo);
    }

    pm.updatedBlockTip();
    BOOST_CHECK(pm.isOrphan(proofid));
    BOOST_CHECK(!pm.isBoundToPeer(proofid));
    for (int i = 0; i < 10; i++) {
        BOOST_CHECK(TestPeerManager::isNodePending(pm, i));
        BOOST_CHECK(!TestPeerManager::nodeBelongToPeer(pm, i, peerid));
    }
    BOOST_CHECK(pm.verify());

    // Make the proof great again
    addCoin(utxo, key);

    pm.updatedBlockTip();
    BOOST_CHECK(!pm.isOrphan(proofid));
    BOOST_CHECK(pm.isBoundToPeer(proofid));
    // The peerid has certainly been updated
    peerid = TestPeerManager::registerAndGetPeerId(pm, proof);
    BOOST_CHECK_NE(peerid, NO_PEER);
    for (int i = 0; i < 10; i++) {
        BOOST_CHECK(!TestPeerManager::isNodePending(pm, i));
        BOOST_CHECK(TestPeerManager::nodeBelongToPeer(pm, i, peerid));
    }
    BOOST_CHECK(pm.verify());
}

BOOST_AUTO_TEST_CASE(proof_conflict) {
    auto key = CKey::MakeCompressedKey();

    TxId txid1(GetRandHash());
    TxId txid2(GetRandHash());
    BOOST_CHECK(txid1 != txid2);

    const Amount v = 10 * COIN;
    const int height = 100;

    for (uint32_t i = 0; i < 10; i++) {
        addCoin({txid1, i}, key);
        addCoin({txid2, i}, key);
    }

    avalanche::PeerManager pm;
    CKey masterKey = CKey::MakeCompressedKey();
    const auto getPeerId = [&](const std::vector<COutPoint> &outpoints) {
        return TestPeerManager::registerAndGetPeerId(
            pm, buildProofWithOutpoints(key, outpoints, v, masterKey, 0, height,
                                        false, 0));
    };

    // Add one peer.
    const PeerId peer1 = getPeerId({COutPoint(txid1, 0)});
    BOOST_CHECK(peer1 != NO_PEER);

    // Same proof, same peer.
    BOOST_CHECK_EQUAL(getPeerId({COutPoint(txid1, 0)}), peer1);

    // Different txid, different proof.
    const PeerId peer2 = getPeerId({COutPoint(txid2, 0)});
    BOOST_CHECK(peer2 != NO_PEER && peer2 != peer1);

    // Different index, different proof.
    const PeerId peer3 = getPeerId({COutPoint(txid1, 1)});
    BOOST_CHECK(peer3 != NO_PEER && peer3 != peer1);

    // Empty proof, no peer.
    BOOST_CHECK_EQUAL(getPeerId({}), NO_PEER);

    // Multiple inputs.
    const PeerId peer4 = getPeerId({COutPoint(txid1, 2), COutPoint(txid2, 2)});
    BOOST_CHECK(peer4 != NO_PEER && peer4 != peer1);

    // Duplicated input.
    {
        ProofBuilder pb(0, 0, CKey::MakeCompressedKey());
        COutPoint o(txid1, 3);
        BOOST_CHECK(pb.addUTXO(o, v, height, false, key));
        BOOST_CHECK(
            !pm.registerProof(TestProofBuilder::buildDuplicatedStakes(pb)));
    }

    // Multiple inputs, collision on first input.
    BOOST_CHECK_EQUAL(getPeerId({COutPoint(txid1, 0), COutPoint(txid2, 4)}),
                      NO_PEER);

    // Mutliple inputs, collision on second input.
    BOOST_CHECK_EQUAL(getPeerId({COutPoint(txid1, 4), COutPoint(txid2, 0)}),
                      NO_PEER);

    // Mutliple inputs, collision on both inputs.
    BOOST_CHECK_EQUAL(getPeerId({COutPoint(txid1, 0), COutPoint(txid2, 2)}),
                      NO_PEER);
}

BOOST_AUTO_TEST_CASE(orphan_proofs) {
    avalanche::PeerManager pm;

    auto key = CKey::MakeCompressedKey();

    COutPoint outpoint1 = COutPoint(TxId(GetRandHash()), 0);
    COutPoint outpoint2 = COutPoint(TxId(GetRandHash()), 0);
    COutPoint outpoint3 = COutPoint(TxId(GetRandHash()), 0);

    const Amount v = 5 * COIN;
    const int height = 1234;
    const int wrongHeight = 12345;

    const auto makeProof = [&](const COutPoint &outpoint, const int h) {
        return buildProofWithOutpoints(key, {outpoint}, v, key, 0, h);
    };

    auto proof1 = makeProof(outpoint1, height);
    auto proof2 = makeProof(outpoint2, height);
    auto proof3 = makeProof(outpoint3, wrongHeight);

    // Add outpoints 1 and 3, not 2
    addCoin(outpoint1, key, v, height);
    addCoin(outpoint3, key, v, height);

    // Add the proofs
    BOOST_CHECK(pm.registerProof(proof1));

    auto registerOrphan = [&](const ProofRef &proof) {
        ProofRegistrationState state;
        BOOST_CHECK(!pm.registerProof(proof, state));
        BOOST_CHECK(state.GetResult() == ProofRegistrationResult::ORPHAN);
    };

    registerOrphan(proof2);
    registerOrphan(proof3);

    auto checkOrphan = [&](const ProofRef &proof, bool expectedOrphan) {
        const ProofId &proofid = proof->getId();
        BOOST_CHECK(pm.exists(proofid));

        BOOST_CHECK_EQUAL(pm.isOrphan(proofid), expectedOrphan);
        BOOST_CHECK_EQUAL(pm.isBoundToPeer(proofid), !expectedOrphan);

        bool ret = false;
        pm.forEachPeer([&](const Peer &peer) {
            if (proof->getId() == peer.proof->getId()) {
                ret = true;
            }
        });
        BOOST_CHECK_EQUAL(ret, !expectedOrphan);
    };

    // Good
    checkOrphan(proof1, false);
    // MISSING_UTXO
    checkOrphan(proof2, true);
    // HEIGHT_MISMATCH
    checkOrphan(proof3, true);

    // Add outpoint2, proof2 is no longer considered orphan
    addCoin(outpoint2, key, v, height);

    pm.updatedBlockTip();
    checkOrphan(proof2, false);

    // The status of proof1 and proof3 are unchanged
    checkOrphan(proof1, false);
    checkOrphan(proof3, true);

    // Spend outpoint1, proof1 becomes orphan
    {
        LOCK(cs_main);
        CCoinsViewCache &coins = ::ChainstateActive().CoinsTip();
        coins.SpendCoin(outpoint1);
    }

    pm.updatedBlockTip();
    checkOrphan(proof1, true);

    // The status of proof2 and proof3 are unchanged
    checkOrphan(proof2, false);
    checkOrphan(proof3, true);

    // A reorg could make a previous HEIGHT_MISMATCH become valid
    {
        LOCK(cs_main);
        CCoinsViewCache &coins = ::ChainstateActive().CoinsTip();
        coins.SpendCoin(outpoint3);
    }
    addCoin(outpoint3, key, v, wrongHeight);

    pm.updatedBlockTip();
    checkOrphan(proof3, false);

    // The status of proof 1 and proof2 are unchanged
    checkOrphan(proof1, true);
    checkOrphan(proof2, false);
}

BOOST_AUTO_TEST_CASE(dangling_node) {
    avalanche::PeerManager pm;

    auto proof = buildRandomProof(MIN_VALID_PROOF_SCORE);
    PeerId peerid = TestPeerManager::registerAndGetPeerId(pm, proof);
    BOOST_CHECK_NE(peerid, NO_PEER);

    const TimePoint theFuture(std::chrono::steady_clock::now() +
                              std::chrono::hours(24));

    // Add nodes to this peer and update their request time far in the future
    for (int i = 0; i < 10; i++) {
        BOOST_CHECK(pm.addNode(i, proof->getId()));
        BOOST_CHECK(pm.updateNextRequestTime(i, theFuture));
    }

    // Remove the peer
    BOOST_CHECK(pm.removePeer(peerid));

    // Check the nodes are still there
    for (int i = 0; i < 10; i++) {
        BOOST_CHECK(pm.forNode(i, [](const Node &n) { return true; }));
    }

    // Build a new one
    proof = buildRandomProof(MIN_VALID_PROOF_SCORE);
    peerid = TestPeerManager::registerAndGetPeerId(pm, proof);
    BOOST_CHECK_NE(peerid, NO_PEER);

    // Update the nodes with the new proof
    for (int i = 0; i < 10; i++) {
        BOOST_CHECK(pm.addNode(i, proof->getId()));
        BOOST_CHECK(pm.forNode(
            i, [&](const Node &n) { return n.nextRequestTime == theFuture; }));
    }

    // Remove the peer
    BOOST_CHECK(pm.removePeer(peerid));

    // Disconnect the nodes
    for (int i = 0; i < 10; i++) {
        BOOST_CHECK(pm.removeNode(i));
    }
}

BOOST_AUTO_TEST_CASE(proof_accessors) {
    avalanche::PeerManager pm;

    constexpr int numProofs = 10;

    std::vector<ProofRef> proofs;
    proofs.reserve(numProofs);
    for (int i = 0; i < numProofs; i++) {
        proofs.push_back(buildRandomProof(MIN_VALID_PROOF_SCORE));
    }

    for (int i = 0; i < numProofs; i++) {
        BOOST_CHECK(pm.registerProof(proofs[i]));

        {
            ProofRegistrationState state;
            // Fail to add an existing proof
            BOOST_CHECK(!pm.registerProof(proofs[i], state));
            BOOST_CHECK(state.GetResult() ==
                        ProofRegistrationResult::ALREADY_REGISTERED);
        }

        for (int added = 0; added <= i; added++) {
            auto proof = pm.getProof(proofs[added]->getId());
            BOOST_CHECK(proof != nullptr);

            const ProofId &proofid = proof->getId();
            BOOST_CHECK_EQUAL(proofid, proofs[added]->getId());
        }
    }

    // No stake, copied from proof_tests.cpp
    const std::string badProofHex(
        "96527eae083f1f24625f049d9e54bb9a2102a93d98bf42ab90cfc0bf9e7c634ed76a7"
        "3e95b02cacfd357b64e4fb6c92e92dd00");
    bilingual_str error;
    auto badProof = RCUPtr<Proof>::make();
    BOOST_CHECK(Proof::FromHex(*badProof, badProofHex, error));

    ProofRegistrationState state;
    BOOST_CHECK(!pm.registerProof(badProof, state));
    BOOST_CHECK(state.GetResult() == ProofRegistrationResult::INVALID);
}

BOOST_FIXTURE_TEST_CASE(conflicting_proof_rescan, NoCoolDownFixture) {
    avalanche::PeerManager pm;

    const CKey key = CKey::MakeCompressedKey();

    const COutPoint conflictingOutpoint = createUtxo(key);
    const COutPoint outpointToSend = createUtxo(key);

    const Amount amount = 10 * COIN;

    ProofRef proofToInvalidate = buildProofWithOutpoints(
        key, {conflictingOutpoint, outpointToSend}, amount);
    BOOST_CHECK(pm.registerProof(proofToInvalidate));

    ProofRef conflictingProof = buildProofWithOutpoints(
        key, {conflictingOutpoint, createUtxo(key)}, amount);
    ProofRegistrationState state;
    BOOST_CHECK(!pm.registerProof(conflictingProof, state));
    BOOST_CHECK(state.GetResult() == ProofRegistrationResult::CONFLICTING);
    BOOST_CHECK(pm.isInConflictingPool(conflictingProof->getId()));

    {
        LOCK(cs_main);
        CCoinsViewCache &coins = ::ChainstateActive().CoinsTip();
        // Make proofToInvalidate invalid
        coins.SpendCoin(outpointToSend);
    }

    pm.updatedBlockTip();

    BOOST_CHECK(pm.isOrphan(proofToInvalidate->getId()));

    BOOST_CHECK(!pm.isInConflictingPool(conflictingProof->getId()));
    BOOST_CHECK(pm.isBoundToPeer(conflictingProof->getId()));
}

BOOST_FIXTURE_TEST_CASE(conflicting_proof_selection, NoCoolDownFixture) {
    const CKey key = CKey::MakeCompressedKey();

    const Amount amount(10 * COIN);
    const uint32_t height = 100;
    const bool is_coinbase = false;

    // This will be the conflicting UTXO for all the following proofs
    auto conflictingOutpoint = createUtxo(key, amount);

    auto proof_base = buildProofWithSequence(key, {conflictingOutpoint}, 10);

    gArgs.ForceSetArg("-enableavalancheproofreplacement", "1");

    ConflictingProofComparator comparator;
    auto checkPreferred = [&](const ProofRef &candidate,
                              const ProofRef &reference, bool expectAccepted) {
        BOOST_CHECK_EQUAL(comparator(candidate, reference), expectAccepted);
        BOOST_CHECK_EQUAL(comparator(reference, candidate), !expectAccepted);

        avalanche::PeerManager pm;
        BOOST_CHECK(pm.registerProof(reference));
        BOOST_CHECK(pm.isBoundToPeer(reference->getId()));

        ProofRegistrationState state;
        BOOST_CHECK_EQUAL(pm.registerProof(candidate, state), expectAccepted);
        BOOST_CHECK_EQUAL(state.IsValid(), expectAccepted);
        BOOST_CHECK_EQUAL(state.GetResult() ==
                              ProofRegistrationResult::CONFLICTING,
                          !expectAccepted);

        BOOST_CHECK_EQUAL(pm.isBoundToPeer(candidate->getId()), expectAccepted);
        BOOST_CHECK_EQUAL(pm.isInConflictingPool(candidate->getId()),
                          !expectAccepted);

        BOOST_CHECK_EQUAL(pm.isBoundToPeer(reference->getId()),
                          !expectAccepted);
        BOOST_CHECK_EQUAL(pm.isInConflictingPool(reference->getId()),
                          expectAccepted);
    };

    // Same master key, lower sequence number
    checkPreferred(buildProofWithSequence(key, {conflictingOutpoint}, 9),
                   proof_base, false);
    // Same master key, higher sequence number
    checkPreferred(buildProofWithSequence(key, {conflictingOutpoint}, 11),
                   proof_base, true);

    auto buildProofFromAmounts = [&](const CKey &master,
                                     std::vector<Amount> &&amounts) {
        std::vector<std::tuple<COutPoint, Amount>> outpointsWithAmount{
            {conflictingOutpoint, amount}};
        std::transform(amounts.begin(), amounts.end(),
                       std::back_inserter(outpointsWithAmount),
                       [&key](const Amount amount) {
                           return std::make_tuple(createUtxo(key, amount),
                                                  amount);
                       });
        return buildProof(key, outpointsWithAmount, master, 0, height,
                          is_coinbase, 0);
    };

    auto proof_multiUtxo = buildProofFromAmounts(key, {10 * COIN, 10 * COIN});

    // Test for both the same master and a different one. The sequence number
    // is the same for all these tests.
    for (const CKey &k : {key, CKey::MakeCompressedKey()}) {
        // Low amount
        checkPreferred(buildProofFromAmounts(k, {10 * COIN, 5 * COIN}),
                       proof_multiUtxo, false);
        // High amount
        checkPreferred(buildProofFromAmounts(k, {10 * COIN, 15 * COIN}),
                       proof_multiUtxo, true);
        // Same amount, low stake count
        checkPreferred(buildProofFromAmounts(k, {20 * COIN}), proof_multiUtxo,
                       true);
        // Same amount, high stake count
        checkPreferred(
            buildProofFromAmounts(k, {10 * COIN, 5 * COIN, 5 * COIN}),
            proof_multiUtxo, false);
        // Same amount, same stake count, selection is done on proof id
        auto proofSimilar = buildProofFromAmounts(k, {10 * COIN, 10 * COIN});
        checkPreferred(proofSimilar, proof_multiUtxo,
                       proofSimilar->getId() < proof_multiUtxo->getId());
    }

    gArgs.ClearForcedArg("-enableavalancheproofreplacement");
}

BOOST_AUTO_TEST_CASE(conflicting_orphans) {
    avalanche::PeerManager pm;

    const CKey key = CKey::MakeCompressedKey();

    const COutPoint conflictingOutpoint(TxId(GetRandHash()), 0);
    const COutPoint randomOutpoint1(TxId(GetRandHash()), 0);

    auto orphan10 = buildProofWithSequence(key, {conflictingOutpoint}, 10);
    auto orphan20 =
        buildProofWithSequence(key, {conflictingOutpoint, randomOutpoint1}, 20);

    BOOST_CHECK(!pm.registerProof(orphan10));
    BOOST_CHECK(pm.isOrphan(orphan10->getId()));

    BOOST_CHECK(!pm.registerProof(orphan20));
    BOOST_CHECK(pm.isOrphan(orphan20->getId()));
    BOOST_CHECK(!pm.exists(orphan10->getId()));

    const COutPoint outpointToSend(TxId(GetRandHash()), 0);
    // Add both randomOutpoint1 and outpointToSend to the UTXO set. The orphan20
    // proof is still an orphan because the conflictingOutpoint is unknown.
    addCoin(randomOutpoint1, key);
    addCoin(outpointToSend, key);

    // Build and register proof valid proof that will conflict with the orphan
    auto proof30 =
        buildProofWithSequence(key, {randomOutpoint1, outpointToSend}, 30);
    BOOST_CHECK(pm.registerProof(proof30));
    BOOST_CHECK(pm.isBoundToPeer(proof30->getId()));

    // Spend the outpointToSend to orphan proof30
    {
        LOCK(cs_main);
        CCoinsViewCache &coins = ::ChainstateActive().CoinsTip();
        coins.SpendCoin(outpointToSend);
    }

    // Check that a rescan will also select the preferred orphan, in this case
    // proof30 will replace orphan20.
    pm.updatedBlockTip();

    BOOST_CHECK(!pm.isBoundToPeer(proof30->getId()));
    BOOST_CHECK(pm.isOrphan(proof30->getId()));
    BOOST_CHECK(!pm.exists(orphan20->getId()));
}

BOOST_FIXTURE_TEST_CASE(preferred_conflicting_proof, NoCoolDownFixture) {
    avalanche::PeerManager pm;

    const CKey key = CKey::MakeCompressedKey();
    const COutPoint conflictingOutpoint = createUtxo(key);

    auto proofSeq10 = buildProofWithSequence(key, {conflictingOutpoint}, 10);
    auto proofSeq20 = buildProofWithSequence(key, {conflictingOutpoint}, 20);
    auto proofSeq30 = buildProofWithSequence(key, {conflictingOutpoint}, 30);

    BOOST_CHECK(pm.registerProof(proofSeq30));
    BOOST_CHECK(pm.isBoundToPeer(proofSeq30->getId()));
    BOOST_CHECK(!pm.isInConflictingPool(proofSeq30->getId()));

    // proofSeq10 is a worst candidate than proofSeq30, so it goes to the
    // conflicting pool.
    BOOST_CHECK(!pm.registerProof(proofSeq10));
    BOOST_CHECK(pm.isBoundToPeer(proofSeq30->getId()));
    BOOST_CHECK(!pm.isBoundToPeer(proofSeq10->getId()));
    BOOST_CHECK(pm.isInConflictingPool(proofSeq10->getId()));

    // proofSeq20 is a worst candidate than proofSeq30 but a better one than
    // proogSeq10, so it replaces it in the conflicting pool and proofSeq10 is
    // evicted.
    BOOST_CHECK(!pm.registerProof(proofSeq20));
    BOOST_CHECK(pm.isBoundToPeer(proofSeq30->getId()));
    BOOST_CHECK(!pm.isBoundToPeer(proofSeq20->getId()));
    BOOST_CHECK(pm.isInConflictingPool(proofSeq20->getId()));
    BOOST_CHECK(!pm.exists(proofSeq10->getId()));
}

BOOST_FIXTURE_TEST_CASE(update_next_conflict_time, NoCoolDownFixture) {
    avalanche::PeerManager pm;

    auto now = GetTime<std::chrono::seconds>();
    SetMockTime(now.count());

    // Updating the time of an unknown peer should fail
    for (size_t i = 0; i < 10; i++) {
        BOOST_CHECK(
            !pm.updateNextPossibleConflictTime(PeerId(GetRandInt(1000)), now));
    }

    auto proof = buildRandomProof(MIN_VALID_PROOF_SCORE);
    PeerId peerid = TestPeerManager::registerAndGetPeerId(pm, proof);

    auto checkNextPossibleConflictTime = [&](std::chrono::seconds expected) {
        BOOST_CHECK(pm.forPeer(proof->getId(), [&](const Peer &p) {
            return p.nextPossibleConflictTime == expected;
        }));
    };

    checkNextPossibleConflictTime(now);

    // Move the time in the past is not possible
    BOOST_CHECK(!pm.updateNextPossibleConflictTime(
        peerid, now - std::chrono::seconds{1}));
    checkNextPossibleConflictTime(now);

    BOOST_CHECK(pm.updateNextPossibleConflictTime(
        peerid, now + std::chrono::seconds{1}));
    checkNextPossibleConflictTime(now + std::chrono::seconds{1});
}

BOOST_FIXTURE_TEST_CASE(register_force_accept, NoCoolDownFixture) {
    avalanche::PeerManager pm;

    const CKey key = CKey::MakeCompressedKey();

    const COutPoint conflictingOutpoint = createUtxo(key);

    auto proofSeq10 = buildProofWithSequence(key, {conflictingOutpoint}, 10);
    auto proofSeq20 = buildProofWithSequence(key, {conflictingOutpoint}, 20);
    auto proofSeq30 = buildProofWithSequence(key, {conflictingOutpoint}, 30);

    BOOST_CHECK(pm.registerProof(proofSeq30));
    BOOST_CHECK(pm.isBoundToPeer(proofSeq30->getId()));
    BOOST_CHECK(!pm.isInConflictingPool(proofSeq30->getId()));

    // proofSeq20 is a worst candidate than proofSeq30, so it goes to the
    // conflicting pool.
    BOOST_CHECK(!pm.registerProof(proofSeq20));
    BOOST_CHECK(pm.isBoundToPeer(proofSeq30->getId()));
    BOOST_CHECK(pm.isInConflictingPool(proofSeq20->getId()));

    // We can force the acceptance of proofSeq20
    using RegistrationMode = avalanche::PeerManager::RegistrationMode;
    BOOST_CHECK(pm.registerProof(proofSeq20, RegistrationMode::FORCE_ACCEPT));
    BOOST_CHECK(pm.isBoundToPeer(proofSeq20->getId()));
    BOOST_CHECK(pm.isInConflictingPool(proofSeq30->getId()));

    // We can also force the acceptance of a proof which is not already in the
    // conflicting pool.
    BOOST_CHECK(!pm.registerProof(proofSeq10));
    BOOST_CHECK(!pm.exists(proofSeq10->getId()));

    BOOST_CHECK(pm.registerProof(proofSeq10, RegistrationMode::FORCE_ACCEPT));
    BOOST_CHECK(pm.isBoundToPeer(proofSeq10->getId()));
    BOOST_CHECK(!pm.exists(proofSeq20->getId()));
    BOOST_CHECK(pm.isInConflictingPool(proofSeq30->getId()));

    // Attempting to register again fails, and has no impact on the pools
    for (size_t i = 0; i < 10; i++) {
        BOOST_CHECK(!pm.registerProof(proofSeq10));
        BOOST_CHECK(
            !pm.registerProof(proofSeq10, RegistrationMode::FORCE_ACCEPT));

        BOOST_CHECK(pm.isBoundToPeer(proofSeq10->getId()));
        BOOST_CHECK(!pm.exists(proofSeq20->getId()));
        BOOST_CHECK(pm.isInConflictingPool(proofSeq30->getId()));
    }

    // Revert between proofSeq10 and proofSeq30 a few times
    for (size_t i = 0; i < 10; i++) {
        BOOST_CHECK(
            pm.registerProof(proofSeq30, RegistrationMode::FORCE_ACCEPT));

        BOOST_CHECK(pm.isBoundToPeer(proofSeq30->getId()));
        BOOST_CHECK(pm.isInConflictingPool(proofSeq10->getId()));

        BOOST_CHECK(
            pm.registerProof(proofSeq10, RegistrationMode::FORCE_ACCEPT));

        BOOST_CHECK(pm.isBoundToPeer(proofSeq10->getId()));
        BOOST_CHECK(pm.isInConflictingPool(proofSeq30->getId()));
    }
}

BOOST_FIXTURE_TEST_CASE(evicted_proof, NoCoolDownFixture) {
    avalanche::PeerManager pm;

    const CKey key = CKey::MakeCompressedKey();

    const COutPoint conflictingOutpoint = createUtxo(key);

    auto proofSeq10 = buildProofWithSequence(key, {conflictingOutpoint}, 10);
    auto proofSeq20 = buildProofWithSequence(key, {conflictingOutpoint}, 20);
    auto proofSeq30 = buildProofWithSequence(key, {conflictingOutpoint}, 30);

    {
        ProofRegistrationState state;
        BOOST_CHECK(pm.registerProof(proofSeq30, state));
        BOOST_CHECK(state.IsValid());
    }

    {
        ProofRegistrationState state;
        BOOST_CHECK(!pm.registerProof(proofSeq20, state));
        BOOST_CHECK(state.GetResult() == ProofRegistrationResult::CONFLICTING);
    }

    {
        ProofRegistrationState state;
        BOOST_CHECK(!pm.registerProof(proofSeq10, state));
        BOOST_CHECK(state.GetResult() == ProofRegistrationResult::REJECTED);
    }
}

BOOST_AUTO_TEST_CASE(conflicting_proof_cooldown) {
    avalanche::PeerManager pm;

    const CKey key = CKey::MakeCompressedKey();

    const COutPoint conflictingOutpoint = createUtxo(key);

    auto proofSeq20 = buildProofWithSequence(key, {conflictingOutpoint}, 20);
    auto proofSeq30 = buildProofWithSequence(key, {conflictingOutpoint}, 30);
    auto proofSeq40 = buildProofWithSequence(key, {conflictingOutpoint}, 40);

    int64_t conflictingProofCooldown = 100;
    gArgs.ForceSetArg("-avalancheconflictingproofcooldown",
                      strprintf("%d", conflictingProofCooldown));

    int64_t now = GetTime();

    auto increaseMockTime = [&](int64_t s) {
        now += s;
        SetMockTime(now);
    };
    increaseMockTime(0);

    BOOST_CHECK(pm.registerProof(proofSeq30));
    BOOST_CHECK(pm.isBoundToPeer(proofSeq30->getId()));

    auto checkRegistrationFailure = [&](const ProofRef &proof,
                                        ProofRegistrationResult reason) {
        ProofRegistrationState state;
        BOOST_CHECK(!pm.registerProof(proof, state));
        BOOST_CHECK(state.GetResult() == reason);
    };

    // Registering a conflicting proof will fail due to the conflicting proof
    // cooldown
    checkRegistrationFailure(proofSeq20,
                             ProofRegistrationResult::COOLDOWN_NOT_ELAPSED);
    BOOST_CHECK(!pm.exists(proofSeq20->getId()));

    // The cooldown applies as well if the proof is the favorite
    checkRegistrationFailure(proofSeq40,
                             ProofRegistrationResult::COOLDOWN_NOT_ELAPSED);
    BOOST_CHECK(!pm.exists(proofSeq40->getId()));

    // Elapse the cooldown
    increaseMockTime(conflictingProofCooldown);

    // The proof will now be added to conflicting pool
    checkRegistrationFailure(proofSeq20, ProofRegistrationResult::CONFLICTING);
    BOOST_CHECK(pm.isInConflictingPool(proofSeq20->getId()));

    // But no other
    checkRegistrationFailure(proofSeq40,
                             ProofRegistrationResult::COOLDOWN_NOT_ELAPSED);
    BOOST_CHECK(!pm.exists(proofSeq40->getId()));
    BOOST_CHECK(pm.isInConflictingPool(proofSeq20->getId()));

    // Elapse the cooldown
    increaseMockTime(conflictingProofCooldown);

    // The proof will now be added to conflicting pool
    checkRegistrationFailure(proofSeq40, ProofRegistrationResult::CONFLICTING);
    BOOST_CHECK(pm.isInConflictingPool(proofSeq40->getId()));
    BOOST_CHECK(!pm.exists(proofSeq20->getId()));

    gArgs.ClearForcedArg("-avalancheconflictingproofcooldown");
}

BOOST_FIXTURE_TEST_CASE(reject_proof, NoCoolDownFixture) {
    avalanche::PeerManager pm;

    const CKey key = CKey::MakeCompressedKey();

    const COutPoint conflictingOutpoint = createUtxo(key);

    // The good, the bad and the ugly
    auto proofSeq10 = buildProofWithSequence(key, {conflictingOutpoint}, 10);
    auto proofSeq20 = buildProofWithSequence(key, {conflictingOutpoint}, 20);
    auto orphan30 = buildProofWithSequence(
        key, {conflictingOutpoint, {TxId(GetRandHash()), 0}}, 30);

    BOOST_CHECK(pm.registerProof(proofSeq20));
    BOOST_CHECK(!pm.registerProof(proofSeq10));
    BOOST_CHECK(!pm.registerProof(orphan30));

    BOOST_CHECK(pm.isBoundToPeer(proofSeq20->getId()));
    BOOST_CHECK(pm.isInConflictingPool(proofSeq10->getId()));
    BOOST_CHECK(pm.isOrphan(orphan30->getId()));

    // Rejecting a proof that doesn't exist should fail
    for (size_t i = 0; i < 10; i++) {
        BOOST_CHECK(
            !pm.rejectProof(avalanche::ProofId(GetRandHash()),
                            avalanche::PeerManager::RejectionMode::DEFAULT));
        BOOST_CHECK(
            !pm.rejectProof(avalanche::ProofId(GetRandHash()),
                            avalanche::PeerManager::RejectionMode::INVALIDATE));
    }

    auto checkRejectDefault = [&](const ProofId &proofid) {
        BOOST_CHECK(pm.exists(proofid));
        const bool isOrphan = pm.isOrphan(proofid);
        BOOST_CHECK(pm.rejectProof(
            proofid, avalanche::PeerManager::RejectionMode::DEFAULT));
        BOOST_CHECK(!pm.isBoundToPeer(proofid));
        BOOST_CHECK_EQUAL(pm.exists(proofid), !isOrphan);
    };

    auto checkRejectInvalidate = [&](const ProofId &proofid) {
        BOOST_CHECK(pm.exists(proofid));
        BOOST_CHECK(pm.rejectProof(
            proofid, avalanche::PeerManager::RejectionMode::INVALIDATE));
    };

    // Reject from the orphan pool
    checkRejectDefault(orphan30->getId());
    BOOST_CHECK(!pm.registerProof(orphan30));
    BOOST_CHECK(pm.isOrphan(orphan30->getId()));
    checkRejectInvalidate(orphan30->getId());

    // Reject from the conflicting pool
    checkRejectDefault(proofSeq10->getId());
    checkRejectInvalidate(proofSeq10->getId());

    // Add again a proof to the conflicting pool
    BOOST_CHECK(!pm.registerProof(proofSeq10));
    BOOST_CHECK(pm.isInConflictingPool(proofSeq10->getId()));

    // Reject from the valid pool, default mode
    checkRejectDefault(proofSeq20->getId());

    // The conflicting proof should be promoted to a peer
    BOOST_CHECK(!pm.isInConflictingPool(proofSeq10->getId()));
    BOOST_CHECK(pm.isBoundToPeer(proofSeq10->getId()));

    // Reject from the valid pool, invalidate mode
    checkRejectInvalidate(proofSeq10->getId());

    // The conflicting proof should also be promoted to a peer
    BOOST_CHECK(!pm.isInConflictingPool(proofSeq20->getId()));
    BOOST_CHECK(pm.isBoundToPeer(proofSeq20->getId()));
}

BOOST_AUTO_TEST_CASE(should_request_more_nodes) {
    avalanche::PeerManager pm;

    auto proof = buildRandomProof(MIN_VALID_PROOF_SCORE);
    BOOST_CHECK(pm.registerProof(proof));

    // We have no nodes, so select node will fail and flag that we need more
    // nodes
    BOOST_CHECK_EQUAL(pm.selectNode(), NO_NODE);
    BOOST_CHECK(pm.shouldRequestMoreNodes());

    for (size_t i = 0; i < 10; i++) {
        // The flag will not trigger again until we fail to select nodes again
        BOOST_CHECK(!pm.shouldRequestMoreNodes());
    }

    // Add a few nodes.
    const ProofId &proofid = proof->getId();
    for (size_t i = 0; i < 10; i++) {
        BOOST_CHECK(pm.addNode(i, proofid));
    }

    auto cooldownTimepoint = std::chrono::steady_clock::now() + 10s;

    // All the nodes can be selected once
    for (size_t i = 0; i < 10; i++) {
        NodeId selectedId = pm.selectNode();
        BOOST_CHECK_NE(selectedId, NO_NODE);
        BOOST_CHECK(pm.updateNextRequestTime(selectedId, cooldownTimepoint));
        BOOST_CHECK(!pm.shouldRequestMoreNodes());
    }

    // All the nodes have been requested, next select will fail and the flag
    // should trigger
    BOOST_CHECK_EQUAL(pm.selectNode(), NO_NODE);
    BOOST_CHECK(pm.shouldRequestMoreNodes());

    for (size_t i = 0; i < 10; i++) {
        // The flag will not trigger again until we fail to select nodes again
        BOOST_CHECK(!pm.shouldRequestMoreNodes());
    }

    // Make it possible to request a node again
    BOOST_CHECK(pm.updateNextRequestTime(0, std::chrono::steady_clock::now()));
    BOOST_CHECK_NE(pm.selectNode(), NO_NODE);
    BOOST_CHECK(!pm.shouldRequestMoreNodes());
}

BOOST_AUTO_TEST_CASE(score_ordering) {
    avalanche::PeerManager pm;

    std::vector<uint32_t> expectedScores(10);
    // Expect the peers to be ordered by descending score
    std::generate(expectedScores.rbegin(), expectedScores.rend(),
                  [n = 1]() mutable { return n++ * MIN_VALID_PROOF_SCORE; });

    std::vector<ProofRef> proofs;
    proofs.reserve(expectedScores.size());
    for (uint32_t score : expectedScores) {
        proofs.push_back(buildRandomProof(score));
    }

    // Shuffle the proofs so they are registered in a random score order
    Shuffle(proofs.begin(), proofs.end(), FastRandomContext());
    for (auto &proof : proofs) {
        BOOST_CHECK(pm.registerProof(proof));
    }

    auto peersScores = TestPeerManager::getOrderedScores(pm);
    BOOST_CHECK_EQUAL_COLLECTIONS(peersScores.begin(), peersScores.end(),
                                  expectedScores.begin(), expectedScores.end());
}

BOOST_FIXTURE_TEST_CASE(known_score_tracking, NoCoolDownFixture) {
    avalanche::PeerManager pm;

    const CKey key = CKey::MakeCompressedKey();

    const Amount amount10(10 * COIN);
    const Amount amount20(20 * COIN);

    const COutPoint peer1ConflictingOutput = createUtxo(key, amount10);
    const COutPoint peer1SecondaryOutpoint = createUtxo(key, amount20);

    auto peer1Proof1 = buildProof(key,
                                  {{peer1ConflictingOutput, amount10},
                                   {peer1SecondaryOutpoint, amount20}},
                                  key, 10);
    auto peer1Proof2 =
        buildProof(key, {{peer1ConflictingOutput, amount10}}, key, 20);
    auto peer1Proof3 =
        buildProof(key,
                   {{peer1ConflictingOutput, amount10},
                    {COutPoint{TxId(GetRandHash()), 0}, amount10}},
                   key, 30);

    const uint32_t peer1Score1 = Proof::amountToScore(amount10 + amount20);
    const uint32_t peer1Score2 = Proof::amountToScore(amount10);

    // Add first peer and check that we have its score tracked
    BOOST_CHECK_EQUAL(pm.getTotalPeersScore(), 0);
    BOOST_CHECK(pm.registerProof(peer1Proof2));
    BOOST_CHECK_EQUAL(pm.getTotalPeersScore(), peer1Score2);

    // Ensure failing to add conflicting proofs doesn't affect the score, the
    // first proof stays bound and counted
    BOOST_CHECK(!pm.registerProof(peer1Proof1));
    BOOST_CHECK(!pm.registerProof(peer1Proof3));

    BOOST_CHECK(pm.isBoundToPeer(peer1Proof2->getId()));
    BOOST_CHECK(pm.isInConflictingPool(peer1Proof1->getId()));
    BOOST_CHECK(pm.isOrphan(peer1Proof3->getId()));

    BOOST_CHECK_EQUAL(pm.getTotalPeersScore(), peer1Score2);

    auto checkRejectDefault = [&](const ProofId &proofid) {
        BOOST_CHECK(pm.exists(proofid));
        const bool isOrphan = pm.isOrphan(proofid);
        BOOST_CHECK(pm.rejectProof(
            proofid, avalanche::PeerManager::RejectionMode::DEFAULT));
        BOOST_CHECK(!pm.isBoundToPeer(proofid));
        BOOST_CHECK_EQUAL(pm.exists(proofid), !isOrphan);
    };

    auto checkRejectInvalidate = [&](const ProofId &proofid) {
        BOOST_CHECK(pm.exists(proofid));
        BOOST_CHECK(pm.rejectProof(
            proofid, avalanche::PeerManager::RejectionMode::INVALIDATE));
    };

    // Reject from the orphan pool doesn't affect tracked score
    checkRejectDefault(peer1Proof3->getId());
    BOOST_CHECK(!pm.registerProof(peer1Proof3));
    BOOST_CHECK(pm.isOrphan(peer1Proof3->getId()));
    BOOST_CHECK_EQUAL(pm.getTotalPeersScore(), peer1Score2);
    checkRejectInvalidate(peer1Proof3->getId());
    BOOST_CHECK_EQUAL(pm.getTotalPeersScore(), peer1Score2);

    // Reject from the conflicting pool
    checkRejectDefault(peer1Proof1->getId());
    checkRejectInvalidate(peer1Proof1->getId());

    // Add again a proof to the conflicting pool
    BOOST_CHECK(!pm.registerProof(peer1Proof1));
    BOOST_CHECK(pm.isInConflictingPool(peer1Proof1->getId()));
    BOOST_CHECK_EQUAL(pm.getTotalPeersScore(), peer1Score2);

    // Reject from the valid pool, default mode
    // Now the score should change as the new peer is promoted
    checkRejectDefault(peer1Proof2->getId());
    BOOST_CHECK(!pm.isInConflictingPool(peer1Proof1->getId()));
    BOOST_CHECK(pm.isBoundToPeer(peer1Proof1->getId()));
    BOOST_CHECK_EQUAL(pm.getTotalPeersScore(), peer1Score1);

    // Reject from the valid pool, invalidate mode
    // Now the score should change as the old peer is re-promoted
    checkRejectInvalidate(peer1Proof1->getId());

    // The conflicting proof should also be promoted to a peer
    BOOST_CHECK(!pm.isInConflictingPool(peer1Proof2->getId()));
    BOOST_CHECK(pm.isBoundToPeer(peer1Proof2->getId()));
    BOOST_CHECK_EQUAL(pm.getTotalPeersScore(), peer1Score2);

    // Now add another peer and check that combined scores are correct
    uint32_t peer2Score = 1 * MIN_VALID_PROOF_SCORE;
    auto peer2Proof1 = buildRandomProof(peer2Score);
    PeerId peerid2 = TestPeerManager::registerAndGetPeerId(pm, peer2Proof1);
    BOOST_CHECK_EQUAL(pm.getTotalPeersScore(), peer1Score2 + peer2Score);

    // Trying to remove non-existent peer doesn't affect score
    BOOST_CHECK(!pm.removePeer(1234));
    BOOST_CHECK_EQUAL(pm.getTotalPeersScore(), peer1Score2 + peer2Score);

    // Removing new peer removes its score
    BOOST_CHECK(pm.removePeer(peerid2));
    BOOST_CHECK_EQUAL(pm.getTotalPeersScore(), peer1Score2);
    PeerId peerid1 =
        TestPeerManager::getPeerIdForProofId(pm, peer1Proof2->getId());
    BOOST_CHECK(pm.removePeer(peerid1));
    BOOST_CHECK_EQUAL(pm.getTotalPeersScore(), 0);
}

BOOST_AUTO_TEST_CASE(connected_score_tracking) {
    avalanche::PeerManager pm;

    const auto checkScores = [&pm](uint32_t known, uint32_t connected) {
        BOOST_CHECK_EQUAL(pm.getTotalPeersScore(), known);
        BOOST_CHECK_EQUAL(pm.getConnectedPeersScore(), connected);
    };

    // Start out with 0s
    checkScores(0, 0);

    // Create one peer without a node. Its score should be registered but not
    // connected
    uint32_t score1 = 10000000 * MIN_VALID_PROOF_SCORE;
    auto proof1 = buildRandomProof(score1);
    PeerId peerid1 = TestPeerManager::registerAndGetPeerId(pm, proof1);
    checkScores(score1, 0);

    // Add nodes. We now have a connected score, but it doesn't matter how many
    // nodes we add the score is the same
    const ProofId &proofid1 = proof1->getId();
    const uint8_t nodesToAdd = 10;
    for (int i = 0; i < nodesToAdd; i++) {
        BOOST_CHECK(pm.addNode(i, proofid1));
        checkScores(score1, score1);
    }

    // Remove all but 1 node and ensure the score doesn't change
    for (int i = 0; i < nodesToAdd - 1; i++) {
        BOOST_CHECK(pm.removeNode(i));
        checkScores(score1, score1);
    }

    // Removing the last node should remove the score from the connected count
    BOOST_CHECK(pm.removeNode(nodesToAdd - 1));
    checkScores(score1, 0);

    // Add 2 nodes to peer and create peer2. Without a node peer2 has no
    // connected score but after adding a node it does.
    BOOST_CHECK(pm.addNode(0, proofid1));
    BOOST_CHECK(pm.addNode(1, proofid1));
    checkScores(score1, score1);

    uint32_t score2 = 1 * MIN_VALID_PROOF_SCORE;
    auto proof2 = buildRandomProof(score2);
    PeerId peerid2 = TestPeerManager::registerAndGetPeerId(pm, proof2);
    checkScores(score1 + score2, score1);
    BOOST_CHECK(pm.addNode(2, proof2->getId()));
    checkScores(score1 + score2, score1 + score2);

    // The first peer has two nodes left. Remove one and nothing happens, remove
    // the other and its score is no longer in the connected counter..
    BOOST_CHECK(pm.removeNode(0));
    checkScores(score1 + score2, score1 + score2);
    BOOST_CHECK(pm.removeNode(1));
    checkScores(score1 + score2, score2);

    // Removing a peer with no allocated score has no affect.
    BOOST_CHECK(pm.removePeer(peerid1));
    checkScores(score2, score2);

    // Remove the second peer's node removes its allocated score.
    BOOST_CHECK(pm.removeNode(2));
    checkScores(score2, 0);

    // Removing the second peer takes us back to 0.
    BOOST_CHECK(pm.removePeer(peerid2));
    checkScores(0, 0);

    // Add 2 peers with nodes and remove them without removing the nodes first.
    // Both score counters should be reduced by each peer's score when it's
    // removed.
    peerid1 = TestPeerManager::registerAndGetPeerId(pm, proof1);
    checkScores(score1, 0);
    peerid2 = TestPeerManager::registerAndGetPeerId(pm, proof2);
    checkScores(score1 + score2, 0);
    BOOST_CHECK(pm.addNode(0, proof1->getId()));
    checkScores(score1 + score2, score1);
    BOOST_CHECK(pm.addNode(1, proof2->getId()));
    checkScores(score1 + score2, score1 + score2);

    BOOST_CHECK(pm.removePeer(peerid2));
    checkScores(score1, score1);

    BOOST_CHECK(pm.removePeer(peerid1));
    checkScores(0, 0);
}

BOOST_AUTO_TEST_SUITE_END()
