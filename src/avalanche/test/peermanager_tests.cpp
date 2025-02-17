// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/delegationbuilder.h>
#include <avalanche/peermanager.h>
#include <avalanche/proofbuilder.h>
#include <avalanche/proofcomparator.h>
#include <avalanche/statistics.h>
#include <avalanche/test/util.h>
#include <cashaddrenc.h>
#include <config.h>
#include <consensus/activation.h>
#include <core_io.h>
#include <key_io.h>
#include <script/standard.h>
#include <uint256.h>
#include <util/fs_helpers.h>
#include <util/time.h>
#include <util/translation.h>
#include <validation.h>

#include <test/util/blockindex.h>
#include <test/util/random.h>
#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

#include <limits>
#include <optional>
#include <unordered_map>

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

        static void cleanupDanglingProofs(
            PeerManager &pm,
            std::unordered_set<ProofRef, SaltedProofHasher> &registeredProofs) {
            pm.cleanupDanglingProofs(registeredProofs);
        }

        static void cleanupDanglingProofs(PeerManager &pm) {
            std::unordered_set<ProofRef, SaltedProofHasher> dummy;
            pm.cleanupDanglingProofs(dummy);
        }

        static std::optional<RemoteProof> getRemoteProof(const PeerManager &pm,
                                                         const ProofId &proofid,
                                                         NodeId nodeid) {
            auto it = pm.remoteProofs.find(boost::make_tuple(proofid, nodeid));
            if (it == pm.remoteProofs.end()) {
                return std::nullopt;
            }
            return std::make_optional(*it);
        }

        static size_t getPeerCount(const PeerManager &pm) {
            return pm.peers.size();
        }

        static std::optional<bool>
        getRemotePresenceStatus(const PeerManager &pm, const ProofId &proofid) {
            return pm.getRemotePresenceStatus(proofid);
        }

        static void clearPeers(PeerManager &pm) {
            std::vector<PeerId> peerIds;
            for (auto &peer : pm.peers) {
                peerIds.push_back(peer.peerid);
            }
            for (const PeerId &peerid : peerIds) {
                pm.removePeer(peerid);
            }
            BOOST_CHECK_EQUAL(pm.peers.size(), 0);
        }

        static void setLocalProof(PeerManager &pm, const ProofRef &proof) {
            pm.localProof = proof;
        }

        static bool isFlaky(const PeerManager &pm, const ProofId &proofid) {
            return pm.isFlaky(proofid);
        }
    };

    static void addCoin(Chainstate &chainstate, const COutPoint &outpoint,
                        const CKey &key,
                        const Amount amount = PROOF_DUST_THRESHOLD,
                        uint32_t height = 100, bool is_coinbase = false) {
        CScript script = GetScriptForDestination(PKHash(key.GetPubKey()));

        LOCK(cs_main);
        CCoinsViewCache &coins = chainstate.CoinsTip();
        coins.AddCoin(outpoint,
                      Coin(CTxOut(amount, script), height, is_coinbase), false);
    }

    static COutPoint createUtxo(Chainstate &chainstate, const CKey &key,
                                const Amount amount = PROOF_DUST_THRESHOLD,
                                uint32_t height = 100,
                                bool is_coinbase = false) {
        COutPoint outpoint(TxId(GetRandHash()), 0);
        addCoin(chainstate, outpoint, key, amount, height, is_coinbase);
        return outpoint;
    }

    static ProofRef
    buildProof(const CKey &key,
               const std::vector<std::tuple<COutPoint, Amount>> &outpoints,
               const CKey &master = CKey::MakeCompressedKey(),
               int64_t sequence = 1, uint32_t height = 100,
               bool is_coinbase = false, int64_t expirationTime = 0,
               const CScript &payoutScript = UNSPENDABLE_ECREG_PAYOUT_SCRIPT) {
        ProofBuilder pb(sequence, expirationTime, master, payoutScript);
        for (const auto &[outpoint, amount] : outpoints) {
            BOOST_CHECK(pb.addUTXO(outpoint, amount, height, is_coinbase, key));
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
        return buildProofWithOutpoints(key, outpoints, PROOF_DUST_THRESHOLD,
                                       key, sequence);
    }
} // namespace
} // namespace avalanche

namespace {
struct PeerManagerFixture : public TestChain100Setup {
    PeerManagerFixture() {
        gArgs.ForceSetArg("-avaproofstakeutxoconfirmations", "1");
    }
    ~PeerManagerFixture() {
        gArgs.ClearForcedArg("-avaproofstakeutxoconfirmations");
    }
};
} // namespace

namespace {
struct NoCoolDownFixture : public PeerManagerFixture {
    NoCoolDownFixture() {
        gArgs.ForceSetArg("-avalancheconflictingproofcooldown", "0");
    }
    ~NoCoolDownFixture() {
        gArgs.ClearForcedArg("-avalancheconflictingproofcooldown");
    }
};
} // namespace

BOOST_FIXTURE_TEST_SUITE(peermanager_tests, PeerManagerFixture)

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

static void addNodeWithScore(Chainstate &active_chainstate,
                             avalanche::PeerManager &pm, NodeId node,
                             uint32_t score) {
    auto proof = buildRandomProof(active_chainstate, score);
    BOOST_CHECK(pm.registerProof(proof));
    BOOST_CHECK(pm.addNode(node, proof->getId()));
};

BOOST_AUTO_TEST_CASE(peer_probabilities) {
    ChainstateManager &chainman = *Assert(m_node.chainman);
    // No peers.
    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);
    BOOST_CHECK_EQUAL(pm.selectNode(), NO_NODE);

    const NodeId node0 = 42, node1 = 69, node2 = 37;

    Chainstate &active_chainstate = chainman.ActiveChainstate();
    // One peer, we always return it.
    addNodeWithScore(active_chainstate, pm, node0, MIN_VALID_PROOF_SCORE);
    BOOST_CHECK_EQUAL(pm.selectNode(), node0);

    // Two peers, verify ratio.
    addNodeWithScore(active_chainstate, pm, node1, 2 * MIN_VALID_PROOF_SCORE);

    std::unordered_map<PeerId, int> results = {};
    for (int i = 0; i < 10000; i++) {
        size_t n = pm.selectNode();
        BOOST_CHECK(n == node0 || n == node1);
        results[n]++;
    }

    BOOST_CHECK(abs(2 * results[0] - results[1]) < 500);

    // Three peers, verify ratio.
    addNodeWithScore(active_chainstate, pm, node2, MIN_VALID_PROOF_SCORE);

    results.clear();
    for (int i = 0; i < 10000; i++) {
        size_t n = pm.selectNode();
        BOOST_CHECK(n == node0 || n == node1 || n == node2);
        results[n]++;
    }

    BOOST_CHECK(abs(results[0] - results[1] + results[2]) < 500);
}

BOOST_AUTO_TEST_CASE(remove_peer) {
    ChainstateManager &chainman = *Assert(m_node.chainman);
    // No peers.
    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);
    BOOST_CHECK_EQUAL(pm.selectPeer(), NO_PEER);

    Chainstate &active_chainstate = chainman.ActiveChainstate();
    // Add 4 peers.
    std::array<PeerId, 8> peerids;
    for (int i = 0; i < 4; i++) {
        auto p = buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE);
        peerids[i] = TestPeerManager::registerAndGetPeerId(pm, p);
        BOOST_CHECK(pm.addNode(InsecureRand32(), p->getId()));
    }

    BOOST_CHECK_EQUAL(pm.getSlotCount(), 40000);
    BOOST_CHECK_EQUAL(pm.getFragmentation(), 0);

    for (int i = 0; i < 100; i++) {
        PeerId p = pm.selectPeer();
        BOOST_CHECK(p == peerids[0] || p == peerids[1] || p == peerids[2] ||
                    p == peerids[3]);
    }

    // Remove one peer, it nevers show up now.
    BOOST_CHECK(pm.removePeer(peerids[2]));
    BOOST_CHECK_EQUAL(pm.getSlotCount(), 40000);
    BOOST_CHECK_EQUAL(pm.getFragmentation(), 10000);

    // Make sure we compact to never get NO_PEER.
    BOOST_CHECK_EQUAL(pm.compact(), 10000);
    BOOST_CHECK(pm.verify());
    BOOST_CHECK_EQUAL(pm.getSlotCount(), 30000);
    BOOST_CHECK_EQUAL(pm.getFragmentation(), 0);

    for (int i = 0; i < 100; i++) {
        PeerId p = pm.selectPeer();
        BOOST_CHECK(p == peerids[0] || p == peerids[1] || p == peerids[3]);
    }

    // Add 4 more peers.
    for (int i = 0; i < 4; i++) {
        auto p = buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE);
        peerids[i + 4] = TestPeerManager::registerAndGetPeerId(pm, p);
        BOOST_CHECK(pm.addNode(InsecureRand32(), p->getId()));
    }

    BOOST_CHECK_EQUAL(pm.getSlotCount(), 70000);
    BOOST_CHECK_EQUAL(pm.getFragmentation(), 0);

    BOOST_CHECK(pm.removePeer(peerids[0]));
    BOOST_CHECK_EQUAL(pm.getSlotCount(), 70000);
    BOOST_CHECK_EQUAL(pm.getFragmentation(), 10000);

    // Removing the last entry do not increase fragmentation.
    BOOST_CHECK(pm.removePeer(peerids[7]));
    BOOST_CHECK_EQUAL(pm.getSlotCount(), 60000);
    BOOST_CHECK_EQUAL(pm.getFragmentation(), 10000);

    // Make sure we compact to never get NO_PEER.
    BOOST_CHECK_EQUAL(pm.compact(), 10000);
    BOOST_CHECK(pm.verify());
    BOOST_CHECK_EQUAL(pm.getSlotCount(), 50000);
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
    ChainstateManager &chainman = *Assert(m_node.chainman);
    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);

    // Add 4 peers.
    std::array<PeerId, 4> peerids;
    for (int i = 0; i < 4; i++) {
        auto p = buildRandomProof(chainman.ActiveChainstate(),
                                  MIN_VALID_PROOF_SCORE);
        peerids[i] = TestPeerManager::registerAndGetPeerId(pm, p);
        BOOST_CHECK(pm.addNode(InsecureRand32(), p->getId()));
    }

    // Remove all peers.
    for (auto p : peerids) {
        pm.removePeer(p);
    }

    BOOST_CHECK_EQUAL(pm.getSlotCount(), 30000);
    BOOST_CHECK_EQUAL(pm.getFragmentation(), 30000);

    for (int i = 0; i < 100; i++) {
        BOOST_CHECK_EQUAL(pm.selectPeer(), NO_PEER);
    }

    BOOST_CHECK_EQUAL(pm.compact(), 30000);
    BOOST_CHECK(pm.verify());
    BOOST_CHECK_EQUAL(pm.getSlotCount(), 0);
    BOOST_CHECK_EQUAL(pm.getFragmentation(), 0);
}

BOOST_AUTO_TEST_CASE(node_crud) {
    ChainstateManager &chainman = *Assert(m_node.chainman);
    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);

    Chainstate &active_chainstate = chainman.ActiveChainstate();

    // Create one peer.
    auto proof =
        buildRandomProof(active_chainstate, 10000000 * MIN_VALID_PROOF_SCORE);
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
        BOOST_CHECK(pm.updateNextRequestTime(n, Now<SteadyMilliseconds>()));
    }

    // Remove a node, check that it doesn't show up.
    BOOST_CHECK(pm.removeNode(2));

    for (int i = 0; i < 100; i++) {
        NodeId n = pm.selectNode();
        BOOST_CHECK(n == 0 || n == 1 || n == 3);
        BOOST_CHECK(pm.updateNextRequestTime(n, Now<SteadyMilliseconds>()));
    }

    // Push a node's timeout in the future, so that it doesn't show up.
    BOOST_CHECK(pm.updateNextRequestTime(1, Now<SteadyMilliseconds>() +
                                                std::chrono::hours(24)));

    for (int i = 0; i < 100; i++) {
        NodeId n = pm.selectNode();
        BOOST_CHECK(n == 0 || n == 3);
        BOOST_CHECK(pm.updateNextRequestTime(n, Now<SteadyMilliseconds>()));
    }

    // Move a node from a peer to another. This peer has a very low score such
    // as chances of being picked are 1 in 10 million.
    addNodeWithScore(active_chainstate, pm, 3, MIN_VALID_PROOF_SCORE);

    int node3selected = 0;
    for (int i = 0; i < 100; i++) {
        NodeId n = pm.selectNode();
        if (n == 3) {
            // Selecting this node should be exceedingly unlikely.
            BOOST_CHECK(node3selected++ < 1);
        } else {
            BOOST_CHECK_EQUAL(n, 0);
        }
        BOOST_CHECK(pm.updateNextRequestTime(n, Now<SteadyMilliseconds>()));
    }
}

BOOST_AUTO_TEST_CASE(node_binding) {
    ChainstateManager &chainman = *Assert(m_node.chainman);
    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);

    Chainstate &active_chainstate = chainman.ActiveChainstate();

    auto proof = buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE);
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

    auto alt_proof = buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE);
    const ProofId &alt_proofid = alt_proof->getId();

    // Update some nodes from a known proof to an unknown proof
    for (int i = 0; i < 5; i++) {
        BOOST_CHECK(!pm.addNode(i, alt_proofid));
        BOOST_CHECK(TestPeerManager::isNodePending(pm, i));
        BOOST_CHECK(!TestPeerManager::nodeBelongToPeer(pm, i, peerid));
        BOOST_CHECK_EQUAL(pm.getNodeCount(), 10 - i - 1);
        BOOST_CHECK_EQUAL(pm.getPendingNodeCount(), i + 1);
    }

    auto alt2_proof =
        buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE);
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
    gArgs.ForceSetArg("-avaproofstakeutxoconfirmations", "2");
    ChainstateManager &chainman = *Assert(m_node.chainman);

    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);

    auto proof = buildRandomProof(chainman.ActiveChainstate(),
                                  MIN_VALID_PROOF_SCORE, 99);
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

    // Make the proof immature by reorging to a shorter chain
    {
        BlockValidationState state;
        chainman.ActiveChainstate().InvalidateBlock(
            state, WITH_LOCK(chainman.GetMutex(), return chainman.ActiveTip()));
        BOOST_CHECK_EQUAL(
            WITH_LOCK(chainman.GetMutex(), return chainman.ActiveHeight()), 99);
    }

    pm.updatedBlockTip();
    BOOST_CHECK(pm.isImmature(proofid));
    BOOST_CHECK(!pm.isBoundToPeer(proofid));
    for (int i = 0; i < 10; i++) {
        BOOST_CHECK(TestPeerManager::isNodePending(pm, i));
        BOOST_CHECK(!TestPeerManager::nodeBelongToPeer(pm, i, peerid));
    }
    BOOST_CHECK(pm.verify());

    // Make the proof great again
    {
        // Advance the clock so the newly mined block won't collide with the
        // other deterministically-generated blocks
        SetMockTime(GetTime() + 20);
        mineBlocks(1);
        BlockValidationState state;
        BOOST_CHECK(chainman.ActiveChainstate().ActivateBestChain(state));
        LOCK(chainman.GetMutex());
        BOOST_CHECK_EQUAL(chainman.ActiveHeight(), 100);
    }

    pm.updatedBlockTip();
    BOOST_CHECK(!pm.isImmature(proofid));
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

    const Amount v = PROOF_DUST_THRESHOLD;
    const int height = 100;

    ChainstateManager &chainman = *Assert(m_node.chainman);
    for (uint32_t i = 0; i < 10; i++) {
        addCoin(chainman.ActiveChainstate(), {txid1, i}, key);
        addCoin(chainman.ActiveChainstate(), {txid2, i}, key);
    }

    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);
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
        ProofBuilder pb(0, 0, CKey::MakeCompressedKey(),
                        UNSPENDABLE_ECREG_PAYOUT_SCRIPT);
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

BOOST_AUTO_TEST_CASE(immature_proofs) {
    ChainstateManager &chainman = *Assert(m_node.chainman);
    gArgs.ForceSetArg("-avaproofstakeutxoconfirmations", "2");
    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);

    auto key = CKey::MakeCompressedKey();
    int immatureHeight = 100;

    auto registerImmature = [&](const ProofRef &proof) {
        ProofRegistrationState state;
        BOOST_CHECK(!pm.registerProof(proof, state));
        BOOST_CHECK(state.GetResult() == ProofRegistrationResult::IMMATURE);
    };

    auto checkImmature = [&](const ProofRef &proof, bool expectedImmature) {
        const ProofId &proofid = proof->getId();
        BOOST_CHECK(pm.exists(proofid));

        BOOST_CHECK_EQUAL(pm.isImmature(proofid), expectedImmature);
        BOOST_CHECK_EQUAL(pm.isBoundToPeer(proofid), !expectedImmature);

        bool ret = false;
        pm.forEachPeer([&](const Peer &peer) {
            if (proof->getId() == peer.proof->getId()) {
                ret = true;
            }
        });
        BOOST_CHECK_EQUAL(ret, !expectedImmature);
    };

    // Track immature proofs so we can test them later
    std::vector<ProofRef> immatureProofs;

    // Fill up the immature pool to test the size limit
    for (int64_t i = 1; i <= AVALANCHE_MAX_IMMATURE_PROOFS; i++) {
        COutPoint outpoint = COutPoint(TxId(GetRandHash()), 0);
        auto proof = buildProofWithOutpoints(
            key, {outpoint}, i * PROOF_DUST_THRESHOLD, key, 0, immatureHeight);
        addCoin(chainman.ActiveChainstate(), outpoint, key,
                i * PROOF_DUST_THRESHOLD, immatureHeight);
        registerImmature(proof);
        checkImmature(proof, true);
        immatureProofs.push_back(proof);
    }

    // More immature proofs evict lower scoring proofs
    for (auto i = 0; i < 100; i++) {
        COutPoint outpoint = COutPoint(TxId(GetRandHash()), 0);
        auto proof =
            buildProofWithOutpoints(key, {outpoint}, 200 * PROOF_DUST_THRESHOLD,
                                    key, 0, immatureHeight);
        addCoin(chainman.ActiveChainstate(), outpoint, key,
                200 * PROOF_DUST_THRESHOLD, immatureHeight);
        registerImmature(proof);
        checkImmature(proof, true);
        immatureProofs.push_back(proof);
        BOOST_CHECK(!pm.exists(immatureProofs.front()->getId()));
        immatureProofs.erase(immatureProofs.begin());
    }

    // Replacement when the pool is full still works
    {
        const COutPoint &outpoint =
            immatureProofs.front()->getStakes()[0].getStake().getUTXO();
        auto proof =
            buildProofWithOutpoints(key, {outpoint}, 101 * PROOF_DUST_THRESHOLD,
                                    key, 1, immatureHeight);
        registerImmature(proof);
        checkImmature(proof, true);
        immatureProofs.push_back(proof);
        BOOST_CHECK(!pm.exists(immatureProofs.front()->getId()));
        immatureProofs.erase(immatureProofs.begin());
    }

    // Mine a block to increase the chain height, turning all immature proofs to
    // mature
    mineBlocks(1);
    pm.updatedBlockTip();
    for (const auto &proof : immatureProofs) {
        checkImmature(proof, false);
    }
}

BOOST_AUTO_TEST_CASE(dangling_node) {
    ChainstateManager &chainman = *Assert(m_node.chainman);
    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);

    Chainstate &active_chainstate = chainman.ActiveChainstate();

    auto proof = buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE);
    PeerId peerid = TestPeerManager::registerAndGetPeerId(pm, proof);
    BOOST_CHECK_NE(peerid, NO_PEER);

    const SteadyMilliseconds theFuture(Now<SteadyMilliseconds>() +
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
    proof = buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE);
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
    ChainstateManager &chainman = *Assert(m_node.chainman);
    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);

    constexpr int numProofs = 10;

    std::vector<ProofRef> proofs;
    proofs.reserve(numProofs);
    for (int i = 0; i < numProofs; i++) {
        proofs.push_back(buildRandomProof(chainman.ActiveChainstate(),
                                          MIN_VALID_PROOF_SCORE));
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
        "96527eae083f1f24625f049d9e54bb9a21023beefdde700a6bc02036335b4df141c8b"
        "c67bb05a971f5ac2745fd683797dde3002321023beefdde700a6bc02036335b4df141"
        "c8bc67bb05a971f5ac2745fd683797dde3ac135da984db510334abe41134e3d4ef09a"
        "d006b1152be8bc413182bf6f947eac1f8580fe265a382195aa2d73935cabf86d90a8f"
        "666d0a62385ae24732eca51575");
    bilingual_str error;
    auto badProof = RCUPtr<Proof>::make();
    BOOST_CHECK(Proof::FromHex(*badProof, badProofHex, error));

    ProofRegistrationState state;
    BOOST_CHECK(!pm.registerProof(badProof, state));
    BOOST_CHECK(state.GetResult() == ProofRegistrationResult::INVALID);
}

BOOST_FIXTURE_TEST_CASE(conflicting_proof_rescan, NoCoolDownFixture) {
    ChainstateManager &chainman = *Assert(m_node.chainman);
    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);

    const CKey key = CKey::MakeCompressedKey();

    Chainstate &active_chainstate = chainman.ActiveChainstate();

    const COutPoint conflictingOutpoint = createUtxo(active_chainstate, key);
    const COutPoint outpointToSend = createUtxo(active_chainstate, key);

    ProofRef proofToInvalidate =
        buildProofWithSequence(key, {conflictingOutpoint, outpointToSend}, 20);
    BOOST_CHECK(pm.registerProof(proofToInvalidate));

    ProofRef conflictingProof =
        buildProofWithSequence(key, {conflictingOutpoint}, 10);
    ProofRegistrationState state;
    BOOST_CHECK(!pm.registerProof(conflictingProof, state));
    BOOST_CHECK(state.GetResult() == ProofRegistrationResult::CONFLICTING);
    BOOST_CHECK(pm.isInConflictingPool(conflictingProof->getId()));

    {
        LOCK(cs_main);
        CCoinsViewCache &coins = active_chainstate.CoinsTip();
        // Make proofToInvalidate invalid
        coins.SpendCoin(outpointToSend);
    }

    pm.updatedBlockTip();

    BOOST_CHECK(!pm.exists(proofToInvalidate->getId()));

    BOOST_CHECK(!pm.isInConflictingPool(conflictingProof->getId()));
    BOOST_CHECK(pm.isBoundToPeer(conflictingProof->getId()));
}

BOOST_FIXTURE_TEST_CASE(conflicting_proof_selection, NoCoolDownFixture) {
    const CKey key = CKey::MakeCompressedKey();

    const Amount amount(PROOF_DUST_THRESHOLD);
    const uint32_t height = 100;
    const bool is_coinbase = false;

    ChainstateManager &chainman = *Assert(m_node.chainman);
    Chainstate &active_chainstate = chainman.ActiveChainstate();

    // This will be the conflicting UTXO for all the following proofs
    auto conflictingOutpoint = createUtxo(active_chainstate, key, amount);

    auto proof_base = buildProofWithSequence(key, {conflictingOutpoint}, 10);

    ConflictingProofComparator comparator;
    auto checkPreferred = [&](const ProofRef &candidate,
                              const ProofRef &reference, bool expectAccepted) {
        BOOST_CHECK_EQUAL(comparator(candidate, reference), expectAccepted);
        BOOST_CHECK_EQUAL(comparator(reference, candidate), !expectAccepted);

        avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);
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
                       [&key, &active_chainstate](const Amount amount) {
                           return std::make_tuple(
                               createUtxo(active_chainstate, key, amount),
                               amount);
                       });
        return buildProof(key, outpointsWithAmount, master, 0, height,
                          is_coinbase, 0);
    };

    auto proof_multiUtxo = buildProofFromAmounts(
        key, {2 * PROOF_DUST_THRESHOLD, 2 * PROOF_DUST_THRESHOLD});

    // Test for both the same master and a different one. The sequence number
    // is the same for all these tests.
    for (const CKey &k : {key, CKey::MakeCompressedKey()}) {
        // Low amount
        checkPreferred(buildProofFromAmounts(
                           k, {2 * PROOF_DUST_THRESHOLD, PROOF_DUST_THRESHOLD}),
                       proof_multiUtxo, false);
        // High amount
        checkPreferred(buildProofFromAmounts(k, {2 * PROOF_DUST_THRESHOLD,
                                                 3 * PROOF_DUST_THRESHOLD}),
                       proof_multiUtxo, true);
        // Same amount, low stake count
        checkPreferred(buildProofFromAmounts(k, {4 * PROOF_DUST_THRESHOLD}),
                       proof_multiUtxo, true);
        // Same amount, high stake count
        checkPreferred(buildProofFromAmounts(k, {2 * PROOF_DUST_THRESHOLD,
                                                 PROOF_DUST_THRESHOLD,
                                                 PROOF_DUST_THRESHOLD}),
                       proof_multiUtxo, false);
        // Same amount, same stake count, selection is done on proof id
        auto proofSimilar = buildProofFromAmounts(
            k, {2 * PROOF_DUST_THRESHOLD, 2 * PROOF_DUST_THRESHOLD});
        checkPreferred(proofSimilar, proof_multiUtxo,
                       proofSimilar->getId() < proof_multiUtxo->getId());
    }
}

BOOST_AUTO_TEST_CASE(conflicting_immature_proofs) {
    ChainstateManager &chainman = *Assert(m_node.chainman);
    gArgs.ForceSetArg("-avaproofstakeutxoconfirmations", "2");
    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);

    const CKey key = CKey::MakeCompressedKey();

    Chainstate &active_chainstate = chainman.ActiveChainstate();

    const COutPoint conflictingOutpoint = createUtxo(active_chainstate, key);
    const COutPoint matureOutpoint =
        createUtxo(active_chainstate, key, PROOF_DUST_THRESHOLD, 99);

    auto immature10 = buildProofWithSequence(key, {conflictingOutpoint}, 10);
    auto immature20 =
        buildProofWithSequence(key, {conflictingOutpoint, matureOutpoint}, 20);

    BOOST_CHECK(!pm.registerProof(immature10));
    BOOST_CHECK(pm.isImmature(immature10->getId()));

    BOOST_CHECK(!pm.registerProof(immature20));
    BOOST_CHECK(pm.isImmature(immature20->getId()));
    BOOST_CHECK(!pm.exists(immature10->getId()));

    // Build and register a valid proof that will conflict with the immature one
    auto proof30 = buildProofWithOutpoints(key, {matureOutpoint},
                                           PROOF_DUST_THRESHOLD, key, 30, 99);
    BOOST_CHECK(pm.registerProof(proof30));
    BOOST_CHECK(pm.isBoundToPeer(proof30->getId()));

    // Reorg to a shorter chain to make proof30 immature
    {
        BlockValidationState state;
        active_chainstate.InvalidateBlock(
            state, WITH_LOCK(chainman.GetMutex(), return chainman.ActiveTip()));
        BOOST_CHECK_EQUAL(
            WITH_LOCK(chainman.GetMutex(), return chainman.ActiveHeight()), 99);
    }

    // Check that a rescan will also select the preferred immature proof, in
    // this case proof30 will replace immature20.
    pm.updatedBlockTip();

    BOOST_CHECK(!pm.isBoundToPeer(proof30->getId()));
    BOOST_CHECK(pm.isImmature(proof30->getId()));
    BOOST_CHECK(!pm.exists(immature20->getId()));
}

BOOST_FIXTURE_TEST_CASE(preferred_conflicting_proof, NoCoolDownFixture) {
    ChainstateManager &chainman = *Assert(m_node.chainman);
    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);

    const CKey key = CKey::MakeCompressedKey();
    const COutPoint conflictingOutpoint =
        createUtxo(chainman.ActiveChainstate(), key);

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
    ChainstateManager &chainman = *Assert(m_node.chainman);
    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);

    auto now = GetTime<std::chrono::seconds>();
    SetMockTime(now.count());

    // Updating the time of an unknown peer should fail
    for (size_t i = 0; i < 10; i++) {
        BOOST_CHECK(!pm.updateNextPossibleConflictTime(
            PeerId(GetRand<int>(1000)), now));
    }

    auto proof =
        buildRandomProof(chainman.ActiveChainstate(), MIN_VALID_PROOF_SCORE);
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
    ChainstateManager &chainman = *Assert(m_node.chainman);
    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);

    const CKey key = CKey::MakeCompressedKey();

    const COutPoint conflictingOutpoint =
        createUtxo(chainman.ActiveChainstate(), key);

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
    ChainstateManager &chainman = *Assert(m_node.chainman);
    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);

    const CKey key = CKey::MakeCompressedKey();

    const COutPoint conflictingOutpoint =
        createUtxo(chainman.ActiveChainstate(), key);

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
    ChainstateManager &chainman = *Assert(m_node.chainman);
    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);

    const CKey key = CKey::MakeCompressedKey();

    const COutPoint conflictingOutpoint =
        createUtxo(chainman.ActiveChainstate(), key);

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

    // The proof will now be accepted to replace proofSeq30, proofSeq30 will
    // move to the conflicting pool, and proofSeq20 will be evicted.
    BOOST_CHECK(pm.registerProof(proofSeq40));
    BOOST_CHECK(pm.isBoundToPeer(proofSeq40->getId()));
    BOOST_CHECK(pm.isInConflictingPool(proofSeq30->getId()));
    BOOST_CHECK(!pm.exists(proofSeq20->getId()));

    gArgs.ClearForcedArg("-avalancheconflictingproofcooldown");
}

BOOST_FIXTURE_TEST_CASE(reject_proof, NoCoolDownFixture) {
    ChainstateManager &chainman = *Assert(m_node.chainman);
    gArgs.ForceSetArg("-avaproofstakeutxoconfirmations", "2");
    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);

    const CKey key = CKey::MakeCompressedKey();

    Chainstate &active_chainstate = chainman.ActiveChainstate();

    const COutPoint conflictingOutpoint =
        createUtxo(active_chainstate, key, PROOF_DUST_THRESHOLD, 99);
    const COutPoint immatureOutpoint = createUtxo(active_chainstate, key);

    // The good, the bad and the ugly
    auto proofSeq10 = buildProofWithOutpoints(
        key, {conflictingOutpoint}, PROOF_DUST_THRESHOLD, key, 10, 99);
    auto proofSeq20 = buildProofWithOutpoints(
        key, {conflictingOutpoint}, PROOF_DUST_THRESHOLD, key, 20, 99);
    auto immature30 = buildProofWithSequence(
        key, {conflictingOutpoint, immatureOutpoint}, 30);

    BOOST_CHECK(pm.registerProof(proofSeq20));
    BOOST_CHECK(!pm.registerProof(proofSeq10));
    BOOST_CHECK(!pm.registerProof(immature30));

    BOOST_CHECK(pm.isBoundToPeer(proofSeq20->getId()));
    BOOST_CHECK(pm.isInConflictingPool(proofSeq10->getId()));
    BOOST_CHECK(pm.isImmature(immature30->getId()));

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
        const bool isImmature = pm.isImmature(proofid);
        BOOST_CHECK(pm.rejectProof(
            proofid, avalanche::PeerManager::RejectionMode::DEFAULT));
        BOOST_CHECK(!pm.isBoundToPeer(proofid));
        BOOST_CHECK_EQUAL(pm.exists(proofid), !isImmature);
    };

    auto checkRejectInvalidate = [&](const ProofId &proofid) {
        BOOST_CHECK(pm.exists(proofid));
        BOOST_CHECK(pm.rejectProof(
            proofid, avalanche::PeerManager::RejectionMode::INVALIDATE));
    };

    // Reject from the immature pool
    checkRejectDefault(immature30->getId());
    BOOST_CHECK(!pm.registerProof(immature30));
    BOOST_CHECK(pm.isImmature(immature30->getId()));
    checkRejectInvalidate(immature30->getId());

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
    ChainstateManager &chainman = *Assert(m_node.chainman);
    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);

    // Set mock time so that proof registration time is predictable and
    // testable.
    SetMockTime(GetTime());

    auto proof =
        buildRandomProof(chainman.ActiveChainstate(), MIN_VALID_PROOF_SCORE);
    BOOST_CHECK(pm.registerProof(proof));
    // Not dangling yet, the proof will remain active for some time before it
    // turns dangling if no node is connecting in the meantime.
    BOOST_CHECK(!pm.isDangling(proof->getId()));

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

    BOOST_CHECK(!pm.isDangling(proof->getId()));

    auto cooldownTimepoint = Now<SteadyMilliseconds>() + 10s;

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
    BOOST_CHECK(pm.updateNextRequestTime(0, Now<SteadyMilliseconds>()));
    BOOST_CHECK_NE(pm.selectNode(), NO_NODE);
    BOOST_CHECK(!pm.shouldRequestMoreNodes());

    // Add another proof with no node attached
    auto proof2 =
        buildRandomProof(chainman.ActiveChainstate(), MIN_VALID_PROOF_SCORE);
    BOOST_CHECK(pm.registerProof(proof2));
    BOOST_CHECK(!pm.isDangling(proof2->getId()));
    TestPeerManager::cleanupDanglingProofs(pm);
    BOOST_CHECK(!pm.isDangling(proof2->getId()));
    BOOST_CHECK(!pm.shouldRequestMoreNodes());

    // After some time the proof will be considered dangling and more nodes will
    // be requested.
    SetMockTime(GetTime() + 15 * 60);
    TestPeerManager::cleanupDanglingProofs(pm);
    BOOST_CHECK(pm.isDangling(proof2->getId()));
    BOOST_CHECK(pm.shouldRequestMoreNodes());

    for (size_t i = 0; i < 10; i++) {
        BOOST_CHECK(pm.isDangling(proof2->getId()));
        // The flag will not trigger again until the condition is met again
        BOOST_CHECK(!pm.shouldRequestMoreNodes());
    }

    // Attempt to register the dangling proof again. This should fail but
    // trigger a request for more nodes.
    ProofRegistrationState state;
    BOOST_CHECK(!pm.registerProof(proof2, state));
    BOOST_CHECK(state.GetResult() == ProofRegistrationResult::DANGLING);
    BOOST_CHECK(pm.isDangling(proof2->getId()));
    BOOST_CHECK(pm.shouldRequestMoreNodes());

    for (size_t i = 0; i < 10; i++) {
        BOOST_CHECK(pm.isDangling(proof2->getId()));
        // The flag will not trigger again until the condition is met again
        BOOST_CHECK(!pm.shouldRequestMoreNodes());
    }

    // Attach a node to that proof
    BOOST_CHECK(!pm.addNode(11, proof2->getId()));
    BOOST_CHECK(pm.registerProof(proof2));
    SetMockTime(GetTime() + 15 * 60);
    TestPeerManager::cleanupDanglingProofs(pm);
    BOOST_CHECK(!pm.isDangling(proof2->getId()));
    BOOST_CHECK(!pm.shouldRequestMoreNodes());

    // Disconnect the node, the proof is dangling again
    BOOST_CHECK(pm.removeNode(11));
    TestPeerManager::cleanupDanglingProofs(pm);
    BOOST_CHECK(pm.isDangling(proof2->getId()));
    BOOST_CHECK(pm.shouldRequestMoreNodes());

    // Invalidating the proof, removes the proof from the dangling pool but not
    // a simple rejection.
    BOOST_CHECK(!pm.rejectProof(
        proof2->getId(), avalanche::PeerManager::RejectionMode::DEFAULT));
    BOOST_CHECK(pm.isDangling(proof2->getId()));
    BOOST_CHECK(pm.rejectProof(
        proof2->getId(), avalanche::PeerManager::RejectionMode::INVALIDATE));
    BOOST_CHECK(!pm.isDangling(proof2->getId()));
}

BOOST_AUTO_TEST_CASE(score_ordering) {
    ChainstateManager &chainman = *Assert(m_node.chainman);
    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);

    std::vector<uint32_t> expectedScores(10);
    // Expect the peers to be ordered by descending score
    std::generate(expectedScores.rbegin(), expectedScores.rend(),
                  [n = 1]() mutable { return n++ * MIN_VALID_PROOF_SCORE; });

    std::vector<ProofRef> proofs;
    proofs.reserve(expectedScores.size());
    for (uint32_t score : expectedScores) {
        proofs.push_back(buildRandomProof(chainman.ActiveChainstate(), score));
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
    ChainstateManager &chainman = *Assert(m_node.chainman);
    gArgs.ForceSetArg("-avaproofstakeutxoconfirmations", "2");
    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);

    const CKey key = CKey::MakeCompressedKey();

    const Amount amount1(PROOF_DUST_THRESHOLD);
    const Amount amount2(2 * PROOF_DUST_THRESHOLD);

    Chainstate &active_chainstate = chainman.ActiveChainstate();

    const COutPoint peer1ConflictingOutput =
        createUtxo(active_chainstate, key, amount1, 99);
    const COutPoint peer1SecondaryOutpoint =
        createUtxo(active_chainstate, key, amount2, 99);

    auto peer1Proof1 = buildProof(
        key,
        {{peer1ConflictingOutput, amount1}, {peer1SecondaryOutpoint, amount2}},
        key, 10, 99);
    auto peer1Proof2 =
        buildProof(key, {{peer1ConflictingOutput, amount1}}, key, 20, 99);

    // Create a proof with an immature UTXO, so the proof will be immature
    auto peer1Proof3 =
        buildProof(key,
                   {{peer1ConflictingOutput, amount1},
                    {createUtxo(active_chainstate, key, amount1), amount1}},
                   key, 30);

    const uint32_t peer1Score1 = Proof::amountToScore(amount1 + amount2);
    const uint32_t peer1Score2 = Proof::amountToScore(amount1);

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
    BOOST_CHECK(pm.isImmature(peer1Proof3->getId()));

    BOOST_CHECK_EQUAL(pm.getTotalPeersScore(), peer1Score2);

    auto checkRejectDefault = [&](const ProofId &proofid) {
        BOOST_CHECK(pm.exists(proofid));
        const bool isImmature = pm.isImmature(proofid);
        BOOST_CHECK(pm.rejectProof(
            proofid, avalanche::PeerManager::RejectionMode::DEFAULT));
        BOOST_CHECK(!pm.isBoundToPeer(proofid));
        BOOST_CHECK_EQUAL(pm.exists(proofid), !isImmature);
    };

    auto checkRejectInvalidate = [&](const ProofId &proofid) {
        BOOST_CHECK(pm.exists(proofid));
        BOOST_CHECK(pm.rejectProof(
            proofid, avalanche::PeerManager::RejectionMode::INVALIDATE));
    };

    // Reject from the immature pool doesn't affect tracked score
    checkRejectDefault(peer1Proof3->getId());
    BOOST_CHECK(!pm.registerProof(peer1Proof3));
    BOOST_CHECK(pm.isImmature(peer1Proof3->getId()));
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
    auto peer2Proof1 = buildRandomProof(active_chainstate, peer2Score, 99);
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
    ChainstateManager &chainman = *Assert(m_node.chainman);
    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);

    const auto checkScores = [&pm](uint32_t known, uint32_t connected) {
        BOOST_CHECK_EQUAL(pm.getTotalPeersScore(), known);
        BOOST_CHECK_EQUAL(pm.getConnectedPeersScore(), connected);
    };

    // Start out with 0s
    checkScores(0, 0);

    Chainstate &active_chainstate = chainman.ActiveChainstate();

    // Create one peer without a node. Its score should be registered but not
    // connected
    uint32_t score1 = 10000000 * MIN_VALID_PROOF_SCORE;
    auto proof1 = buildRandomProof(active_chainstate, score1);
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
    auto proof2 = buildRandomProof(active_chainstate, score2);
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

BOOST_FIXTURE_TEST_CASE(proof_radix_tree, NoCoolDownFixture) {
    ChainstateManager &chainman = *Assert(m_node.chainman);
    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);

    struct ProofComparatorById {
        bool operator()(const ProofRef &lhs, const ProofRef &rhs) const {
            return lhs->getId() < rhs->getId();
        };
    };
    using ProofSetById = std::set<ProofRef, ProofComparatorById>;
    // Maintain a list of the expected proofs through this test
    ProofSetById expectedProofs;

    auto matchExpectedContent = [&](const auto &tree) {
        auto it = expectedProofs.begin();
        return tree.forEachLeaf([&](auto pLeaf) {
            return it != expectedProofs.end() &&
                   pLeaf->getId() == (*it++)->getId();
        });
    };

    CKey key = CKey::MakeCompressedKey();
    const int64_t sequence = 10;

    Chainstate &active_chainstate = chainman.ActiveChainstate();

    // Add some initial proofs
    for (size_t i = 0; i < 10; i++) {
        auto outpoint = createUtxo(active_chainstate, key);
        auto proof = buildProofWithSequence(key, {{outpoint}}, sequence);
        BOOST_CHECK(pm.registerProof(proof));
        expectedProofs.insert(std::move(proof));
    }

    const auto &treeRef = pm.getShareableProofsSnapshot();
    BOOST_CHECK(matchExpectedContent(treeRef));

    // Create a copy
    auto tree = pm.getShareableProofsSnapshot();

    // Adding more proofs doesn't change the tree...
    ProofSetById addedProofs;
    std::vector<COutPoint> outpointsToSpend;
    for (size_t i = 0; i < 10; i++) {
        auto outpoint = createUtxo(active_chainstate, key);
        auto proof = buildProofWithSequence(key, {{outpoint}}, sequence);
        BOOST_CHECK(pm.registerProof(proof));
        addedProofs.insert(std::move(proof));
        outpointsToSpend.push_back(std::move(outpoint));
    }

    BOOST_CHECK(matchExpectedContent(tree));

    // ...until we get a new copy
    tree = pm.getShareableProofsSnapshot();
    expectedProofs.insert(addedProofs.begin(), addedProofs.end());
    BOOST_CHECK(matchExpectedContent(tree));

    // Spend some coins to make the associated proofs invalid
    {
        LOCK(cs_main);
        CCoinsViewCache &coins = active_chainstate.CoinsTip();
        for (const auto &outpoint : outpointsToSpend) {
            coins.SpendCoin(outpoint);
        }
    }

    pm.updatedBlockTip();

    // This doesn't change the tree...
    BOOST_CHECK(matchExpectedContent(tree));

    // ...until we get a new copy
    tree = pm.getShareableProofsSnapshot();
    for (const auto &proof : addedProofs) {
        BOOST_CHECK_EQUAL(expectedProofs.erase(proof), 1);
    }
    BOOST_CHECK(matchExpectedContent(tree));

    // Add some more proof for which we will create conflicts
    std::vector<ProofRef> conflictingProofs;
    std::vector<COutPoint> conflictingOutpoints;
    for (size_t i = 0; i < 10; i++) {
        auto outpoint = createUtxo(active_chainstate, key);
        auto proof = buildProofWithSequence(key, {{outpoint}}, sequence);
        BOOST_CHECK(pm.registerProof(proof));
        conflictingProofs.push_back(std::move(proof));
        conflictingOutpoints.push_back(std::move(outpoint));
    }

    tree = pm.getShareableProofsSnapshot();
    expectedProofs.insert(conflictingProofs.begin(), conflictingProofs.end());
    BOOST_CHECK(matchExpectedContent(tree));

    // Build a bunch of conflicting proofs, half better, half worst
    for (size_t i = 0; i < 10; i += 2) {
        // The worst proof is not added to the expected set
        BOOST_CHECK(!pm.registerProof(buildProofWithSequence(
            key, {{conflictingOutpoints[i]}}, sequence - 1)));

        // But the better proof should replace its conflicting one
        auto replacementProof = buildProofWithSequence(
            key, {{conflictingOutpoints[i + 1]}}, sequence + 1);
        BOOST_CHECK(pm.registerProof(replacementProof));
        BOOST_CHECK_EQUAL(expectedProofs.erase(conflictingProofs[i + 1]), 1);
        BOOST_CHECK(expectedProofs.insert(replacementProof).second);
    }

    tree = pm.getShareableProofsSnapshot();
    BOOST_CHECK(matchExpectedContent(tree));

    // Check for consistency
    pm.verify();
}

BOOST_AUTO_TEST_CASE(received_avaproofs) {
    ChainstateManager &chainman = *Assert(m_node.chainman);
    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);

    auto addNode = [&](NodeId nodeid) {
        auto proof = buildRandomProof(chainman.ActiveChainstate(),
                                      MIN_VALID_PROOF_SCORE);
        BOOST_CHECK(pm.registerProof(proof));
        BOOST_CHECK(pm.addNode(nodeid, proof->getId()));
    };

    for (NodeId nodeid = 0; nodeid < 10; nodeid++) {
        // Node doesn't exist
        BOOST_CHECK(!pm.latchAvaproofsSent(nodeid));

        addNode(nodeid);
        BOOST_CHECK(pm.latchAvaproofsSent(nodeid));

        // The flag is already set
        BOOST_CHECK(!pm.latchAvaproofsSent(nodeid));
    }
}

BOOST_FIXTURE_TEST_CASE(cleanup_dangling_proof, NoCoolDownFixture) {
    ChainstateManager &chainman = *Assert(m_node.chainman);

    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);

    const auto now = GetTime<std::chrono::seconds>();
    auto mocktime = now;

    auto elapseTime = [&](std::chrono::seconds seconds) {
        mocktime += seconds;
        SetMockTime(mocktime.count());
    };
    elapseTime(0s);

    const CKey key = CKey::MakeCompressedKey();

    const size_t numProofs = 10;

    std::vector<COutPoint> outpoints(numProofs);
    std::vector<ProofRef> proofs(numProofs);
    std::vector<ProofRef> conflictingProofs(numProofs);
    for (size_t i = 0; i < numProofs; i++) {
        outpoints[i] = createUtxo(chainman.ActiveChainstate(), key);
        proofs[i] = buildProofWithSequence(key, {outpoints[i]}, 2);
        conflictingProofs[i] = buildProofWithSequence(key, {outpoints[i]}, 1);

        BOOST_CHECK(pm.registerProof(proofs[i]));
        BOOST_CHECK(pm.isBoundToPeer(proofs[i]->getId()));

        BOOST_CHECK(!pm.registerProof(conflictingProofs[i]));
        BOOST_CHECK(pm.isInConflictingPool(conflictingProofs[i]->getId()));

        if (i % 2) {
            // Odd indexes get a node attached to them
            BOOST_CHECK(pm.addNode(i, proofs[i]->getId()));
        }
        BOOST_CHECK_EQUAL(pm.forPeer(proofs[i]->getId(),
                                     [&](const avalanche::Peer &peer) {
                                         return peer.node_count;
                                     }),
                          i % 2);

        elapseTime(1s);
    }

    // No proof expired yet
    TestPeerManager::cleanupDanglingProofs(pm);
    for (size_t i = 0; i < numProofs; i++) {
        BOOST_CHECK(pm.isBoundToPeer(proofs[i]->getId()));
        BOOST_CHECK(pm.isInConflictingPool(conflictingProofs[i]->getId()));
    }

    // Elapse the dangling timeout
    elapseTime(avalanche::Peer::DANGLING_TIMEOUT);
    TestPeerManager::cleanupDanglingProofs(pm);
    for (size_t i = 0; i < numProofs; i++) {
        const bool hasNodeAttached = i % 2;

        // Only the peers with no nodes attached are getting discarded
        BOOST_CHECK_EQUAL(pm.isBoundToPeer(proofs[i]->getId()),
                          hasNodeAttached);
        BOOST_CHECK_EQUAL(!pm.exists(proofs[i]->getId()), !hasNodeAttached);

        // The proofs conflicting with the discarded ones are pulled back
        BOOST_CHECK_EQUAL(pm.isInConflictingPool(conflictingProofs[i]->getId()),
                          hasNodeAttached);
        BOOST_CHECK_EQUAL(pm.isBoundToPeer(conflictingProofs[i]->getId()),
                          !hasNodeAttached);
    }

    // Attach a node to the first conflicting proof, which has been promoted
    BOOST_CHECK(pm.addNode(42, conflictingProofs[0]->getId()));
    BOOST_CHECK(pm.forPeer(
        conflictingProofs[0]->getId(),
        [&](const avalanche::Peer &peer) { return peer.node_count == 1; }));

    // Elapse the dangling timeout again
    elapseTime(avalanche::Peer::DANGLING_TIMEOUT);
    TestPeerManager::cleanupDanglingProofs(pm);
    for (size_t i = 0; i < numProofs; i++) {
        const bool hasNodeAttached = i % 2;

        // The initial peers with a node attached are still there
        BOOST_CHECK_EQUAL(pm.isBoundToPeer(proofs[i]->getId()),
                          hasNodeAttached);
        BOOST_CHECK_EQUAL(!pm.exists(proofs[i]->getId()), !hasNodeAttached);

        // This time the previouly promoted conflicting proofs are evicted
        // because they have no node attached, except the index 0.
        BOOST_CHECK_EQUAL(pm.exists(conflictingProofs[i]->getId()),
                          hasNodeAttached || i == 0);
        BOOST_CHECK_EQUAL(pm.isInConflictingPool(conflictingProofs[i]->getId()),
                          hasNodeAttached);
        BOOST_CHECK_EQUAL(pm.isBoundToPeer(conflictingProofs[i]->getId()),
                          i == 0);
    }

    // Disconnect all the nodes
    for (size_t i = 1; i < numProofs; i += 2) {
        BOOST_CHECK(pm.removeNode(i));
        BOOST_CHECK(
            pm.forPeer(proofs[i]->getId(), [&](const avalanche::Peer &peer) {
                return peer.node_count == 0;
            }));
    }
    BOOST_CHECK(pm.removeNode(42));
    BOOST_CHECK(pm.forPeer(
        conflictingProofs[0]->getId(),
        [&](const avalanche::Peer &peer) { return peer.node_count == 0; }));

    TestPeerManager::cleanupDanglingProofs(pm);
    for (size_t i = 0; i < numProofs; i++) {
        const bool hadNodeAttached = i % 2;

        // All initially valid proofs have now been discarded
        BOOST_CHECK(!pm.exists(proofs[i]->getId()));

        // The remaining conflicting proofs are promoted
        BOOST_CHECK_EQUAL(!pm.exists(conflictingProofs[i]->getId()),
                          !hadNodeAttached);
        BOOST_CHECK(!pm.isInConflictingPool(conflictingProofs[i]->getId()));
        BOOST_CHECK_EQUAL(pm.isBoundToPeer(conflictingProofs[i]->getId()),
                          hadNodeAttached);
    }

    // Elapse the timeout for the newly promoted conflicting proofs
    elapseTime(avalanche::Peer::DANGLING_TIMEOUT);

    // All other proofs have now been discarded
    TestPeerManager::cleanupDanglingProofs(pm);

    for (size_t i = 0; i < numProofs; i++) {
        // All proofs have finally been discarded
        BOOST_CHECK(!pm.exists(proofs[i]->getId()));
        BOOST_CHECK(!pm.exists(conflictingProofs[i]->getId()));
    }
}

BOOST_AUTO_TEST_CASE(register_proof_missing_utxo) {
    ChainstateManager &chainman = *Assert(m_node.chainman);
    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);

    CKey key = CKey::MakeCompressedKey();
    auto proof = buildProofWithOutpoints(key, {{TxId(GetRandHash()), 0}},
                                         PROOF_DUST_THRESHOLD);

    ProofRegistrationState state;
    BOOST_CHECK(!pm.registerProof(proof, state));
    BOOST_CHECK(state.GetResult() == ProofRegistrationResult::MISSING_UTXO);
}

BOOST_FIXTURE_TEST_CASE(proof_expiry, NoCoolDownFixture) {
    ChainstateManager &chainman = *Assert(m_node.chainman);
    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);

    const int64_t tipTime =
        WITH_LOCK(chainman.GetMutex(), return chainman.ActiveTip())
            ->GetBlockTime();

    CKey key = CKey::MakeCompressedKey();

    auto utxo = createUtxo(chainman.ActiveChainstate(), key);
    auto proofToExpire = buildProof(key, {{utxo, PROOF_DUST_THRESHOLD}}, key, 2,
                                    100, false, tipTime + 1);
    auto conflictingProof = buildProof(key, {{utxo, PROOF_DUST_THRESHOLD}}, key,
                                       1, 100, false, tipTime + 2);

    // Our proofToExpire is not expired yet, so it registers fine
    BOOST_CHECK(pm.registerProof(proofToExpire));
    BOOST_CHECK(pm.isBoundToPeer(proofToExpire->getId()));

    // The conflicting proof has a longer expiration time but a lower sequence
    // number, so it is moved to the conflicting pool.
    BOOST_CHECK(!pm.registerProof(conflictingProof));
    BOOST_CHECK(pm.isInConflictingPool(conflictingProof->getId()));

    // Mine blocks until the MTP of the tip moves to the proof expiration
    for (int64_t i = 0; i < 6; i++) {
        SetMockTime(proofToExpire->getExpirationTime() + i);
        CreateAndProcessBlock({}, CScript());
    }
    BOOST_CHECK_EQUAL(
        WITH_LOCK(chainman.GetMutex(), return chainman.ActiveTip())
            ->GetMedianTimePast(),
        proofToExpire->getExpirationTime());

    pm.updatedBlockTip();

    // The now expired proof is removed
    BOOST_CHECK(!pm.exists(proofToExpire->getId()));

    // The conflicting proof has been pulled back to the valid pool
    BOOST_CHECK(pm.isBoundToPeer(conflictingProof->getId()));
}

BOOST_AUTO_TEST_CASE(select_staking_reward_winner) {
    ChainstateManager &chainman = *Assert(m_node.chainman);
    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);
    Chainstate &active_chainstate = chainman.ActiveChainstate();

    auto buildProofWithAmountAndPayout = [&](Amount amount,
                                             const CScript &payoutScript) {
        const CKey key = CKey::MakeCompressedKey();
        COutPoint utxo = createUtxo(active_chainstate, key, amount);
        return buildProof(key, {{std::move(utxo), amount}},
                          /*master=*/CKey::MakeCompressedKey(), /*sequence=*/1,
                          /*height=*/100, /*is_coinbase=*/false,
                          /*expirationTime=*/0, payoutScript);
    };

    std::vector<std::pair<ProofId, CScript>> winners;
    // Null pprev
    BOOST_CHECK(!pm.selectStakingRewardWinner(nullptr, winners));

    CBlockIndex prevBlock;

    auto now = GetTime<std::chrono::seconds>();
    SetMockTime(now);
    prevBlock.nTime = now.count();

    BlockHash prevHash{uint256::ONE};
    prevBlock.phashBlock = &prevHash;
    // No peer
    BOOST_CHECK(!pm.selectStakingRewardWinner(&prevBlock, winners));

    // Let's build a list of payout addresses, and register a proofs for each
    // address
    size_t numProofs = 8;
    std::vector<ProofRef> proofs;
    proofs.reserve(numProofs);
    for (size_t i = 0; i < numProofs; i++) {
        const CKey key = CKey::MakeCompressedKey();
        CScript payoutScript = GetScriptForRawPubKey(key.GetPubKey());

        auto proof =
            buildProofWithAmountAndPayout(PROOF_DUST_THRESHOLD, payoutScript);
        PeerId peerid = TestPeerManager::registerAndGetPeerId(pm, proof);
        BOOST_CHECK_NE(peerid, NO_PEER);

        // Finalize the proof
        BOOST_CHECK(pm.setFinalized(peerid));

        proofs.emplace_back(std::move(proof));
    }

    // Make sure the proofs have been registered before the prev block was found
    // and before 6x the peer replacement cooldown.
    now += 6 * avalanche::Peer::DANGLING_TIMEOUT + 1s;
    SetMockTime(now);
    prevBlock.nTime = now.count();

    // At this stage we have a set of peers out of which none has any node
    // attached, so they're all considered flaky. Note that we have no remote
    // proofs status yet.
    BOOST_CHECK(pm.selectStakingRewardWinner(&prevBlock, winners));
    BOOST_CHECK_LE(winners.size(), numProofs);

    // Let's add a node for each peer
    for (size_t i = 0; i < numProofs; i++) {
        BOOST_CHECK(TestPeerManager::isFlaky(pm, proofs[i]->getId()));
        BOOST_CHECK(pm.selectStakingRewardWinner(&prevBlock, winners));
        BOOST_CHECK_LE(winners.size(), numProofs);

        BOOST_CHECK(pm.addNode(NodeId(i), proofs[i]->getId()));

        BOOST_CHECK(!TestPeerManager::isFlaky(pm, proofs[i]->getId()));
        BOOST_CHECK(pm.selectStakingRewardWinner(&prevBlock, winners));
        BOOST_CHECK_LE(winners.size(), numProofs - i);
    }

    // Now we have a single winner
    BOOST_CHECK(pm.selectStakingRewardWinner(&prevBlock, winners));
    BOOST_CHECK_LE(winners.size(), 1);

    // All proofs have the same amount, so the same probability to get picked.
    // Let's compute how many loop iterations we need to have a low false
    // negative rate when checking for this. Target false positive rate is
    // 10ppm (aka 1/100000).
    const size_t loop_iters =
        size_t(-1.0 * std::log(100000.0) /
               std::log((double(numProofs) - 1) / numProofs)) +
        1;
    BOOST_CHECK_GT(loop_iters, numProofs);
    std::unordered_map<std::string, size_t> winningCounts;
    for (size_t i = 0; i < loop_iters; i++) {
        BlockHash randomHash = BlockHash(GetRandHash());
        prevBlock.phashBlock = &randomHash;
        BOOST_CHECK(pm.selectStakingRewardWinner(&prevBlock, winners));
        winningCounts[FormatScript(winners[0].second)]++;
    }
    BOOST_CHECK_EQUAL(winningCounts.size(), numProofs);

    prevBlock.phashBlock = &prevHash;

    // Ensure all nodes have all the proofs
    for (size_t i = 0; i < numProofs; i++) {
        for (size_t j = 0; j < numProofs; j++) {
            BOOST_CHECK(
                pm.saveRemoteProof(proofs[j]->getId(), NodeId(i), true));
        }
    }

    // Make all the proofs flaky. This loop needs to be updated if the threshold
    // or the number of proofs change, so assert the test precondition.
    BOOST_CHECK_GT(3. / numProofs, 0.3);
    for (size_t i = 0; i < numProofs; i++) {
        const NodeId nodeid = NodeId(i);

        BOOST_CHECK(pm.saveRemoteProof(
            proofs[(i - 1 + numProofs) % numProofs]->getId(), nodeid, false));
        BOOST_CHECK(pm.saveRemoteProof(
            proofs[(i + numProofs) % numProofs]->getId(), nodeid, false));
        BOOST_CHECK(pm.saveRemoteProof(
            proofs[(i + 1 + numProofs) % numProofs]->getId(), nodeid, false));
    }

    // Now all the proofs are flaky
    BOOST_CHECK(pm.selectStakingRewardWinner(&prevBlock, winners));
    for (const auto &proof : proofs) {
        BOOST_CHECK(TestPeerManager::isFlaky(pm, proof->getId()));
    }
    BOOST_CHECK_EQUAL(winners.size(), numProofs);

    // Revert flakyness for all proofs
    for (const auto &proof : proofs) {
        for (NodeId nodeid = 0; nodeid < NodeId(numProofs); nodeid++) {
            BOOST_CHECK(pm.saveRemoteProof(proof->getId(), nodeid, true));
        }
    }

    BOOST_CHECK(pm.selectStakingRewardWinner(&prevBlock, winners));
    BOOST_CHECK_EQUAL(winners.size(), 1);

    // Increase the list from 1 to 4 winners by making them flaky
    for (size_t numWinner = 1; numWinner < 4; numWinner++) {
        // Who is the last possible winner ?
        CScript lastWinner = winners[numWinner - 1].second;

        // Make the last winner flaky, the other proofs untouched
        ProofId winnerProofId = ProofId(uint256::ZERO);
        for (const auto &proof : proofs) {
            if (proof->getPayoutScript() == lastWinner) {
                winnerProofId = proof->getId();
                break;
            }
        }
        BOOST_CHECK_NE(winnerProofId, ProofId(uint256::ZERO));

        for (NodeId nodeid = 0; nodeid < NodeId(numProofs); nodeid++) {
            BOOST_CHECK(pm.saveRemoteProof(winnerProofId, nodeid, false));
        }
        BOOST_CHECK(TestPeerManager::isFlaky(pm, winnerProofId));

        // There should be now exactly numWinner + 1 winners
        BOOST_CHECK(pm.selectStakingRewardWinner(&prevBlock, winners));
        BOOST_CHECK_EQUAL(winners.size(), numWinner + 1);
    }

    // One more time and the nodes will be missing too many proofs, so they are
    // no longer considered for flakyness evaluation and we're back to a single
    // winner.
    CScript lastWinner = winners[3].second;

    ProofId winnerProofId = ProofId(uint256::ZERO);
    for (const auto &proof : proofs) {
        if (proof->getPayoutScript() == lastWinner) {
            winnerProofId = proof->getId();
            break;
        }
    }
    BOOST_CHECK_NE(winnerProofId, ProofId(uint256::ZERO));

    for (NodeId nodeid = 0; nodeid < NodeId(numProofs); nodeid++) {
        BOOST_CHECK(pm.saveRemoteProof(winnerProofId, nodeid, false));
    }

    // We're back to exactly 1 winner
    BOOST_CHECK(pm.selectStakingRewardWinner(&prevBlock, winners));
    BOOST_CHECK_EQUAL(winners.size(), 1);

    // Remove all proofs
    for (auto &proof : proofs) {
        BOOST_CHECK(pm.rejectProof(
            proof->getId(), avalanche::PeerManager::RejectionMode::INVALIDATE));
    }
    // No more winner
    prevBlock.phashBlock = &prevHash;
    BOOST_CHECK(!pm.selectStakingRewardWinner(&prevBlock, winners));

    {
        // Add back a single proof
        const CKey key = CKey::MakeCompressedKey();
        CScript payoutScript = GetScriptForRawPubKey(key.GetPubKey());

        auto proof =
            buildProofWithAmountAndPayout(PROOF_DUST_THRESHOLD, payoutScript);
        PeerId peerid = TestPeerManager::registerAndGetPeerId(pm, proof);
        BOOST_CHECK_NE(peerid, NO_PEER);

        // The single proof should always be selected, but:
        // 1. The proof is not finalized, and has been registered after the last
        // block was mined.
        BOOST_CHECK(!pm.selectStakingRewardWinner(&prevBlock, winners));

        // 2. The proof has has been registered after the last block was mined.
        BOOST_CHECK(pm.setFinalized(peerid));
        BOOST_CHECK(!pm.selectStakingRewardWinner(&prevBlock, winners));

        // 3. The proof has been registered 60min from the previous block time,
        // but the previous block time is in the future.
        now += 50min + 1s;
        SetMockTime(now);
        prevBlock.nTime = (now + 10min).count();
        BOOST_CHECK(!pm.selectStakingRewardWinner(&prevBlock, winners));

        // 4. The proof has been registered 60min from now, but only 50min from
        // the previous block time.
        now += 10min;
        SetMockTime(now);
        prevBlock.nTime = (now - 10min).count();
        BOOST_CHECK(!pm.selectStakingRewardWinner(&prevBlock, winners));

        // 5. Now the proof has it all
        prevBlock.nTime = now.count();
        BOOST_CHECK(pm.selectStakingRewardWinner(&prevBlock, winners));
        // With a single proof, it's easy to determine the winner
        BOOST_CHECK_EQUAL(FormatScript(winners[0].second),
                          FormatScript(payoutScript));

        // Remove the proof
        BOOST_CHECK(pm.rejectProof(
            proof->getId(), avalanche::PeerManager::RejectionMode::INVALIDATE));
    }

    {
        BOOST_CHECK_EQUAL(TestPeerManager::getPeerCount(pm), 0);

        proofs.clear();
        for (size_t i = 0; i < 4; i++) {
            // Add 4 proofs, registered at a 30 minutes interval
            SetMockTime(now + i * 30min);

            const CKey key = CKey::MakeCompressedKey();
            CScript payoutScript = GetScriptForRawPubKey(key.GetPubKey());

            auto proof = buildProofWithAmountAndPayout(PROOF_DUST_THRESHOLD,
                                                       payoutScript);
            PeerId peerid = TestPeerManager::registerAndGetPeerId(pm, proof);
            BOOST_CHECK_NE(peerid, NO_PEER);
            BOOST_CHECK(pm.forPeer(proof->getId(), [&](const Peer &peer) {
                return peer.registration_time == now + i * 30min;
            }));

            BOOST_CHECK(pm.addNode(NodeId(i), proof->getId()));

            BOOST_CHECK(pm.setFinalized(peerid));

            proofs.push_back(proof);
        }

        // No proof has been registered before the previous block time
        SetMockTime(now);
        prevBlock.nTime = now.count();
        BOOST_CHECK(!pm.selectStakingRewardWinner(&prevBlock, winners));

        // 1 proof has been registered > 30min from the previous block time, but
        // none > 60 minutes from the previous block time
        // => we have no winner.
        now += 30min + 1s;
        SetMockTime(now);
        prevBlock.nTime = now.count();
        BOOST_CHECK(!pm.selectStakingRewardWinner(&prevBlock, winners));

        auto checkRegistrationTime =
            [&](const std::pair<ProofId, CScript> &winner) {
                pm.forEachPeer([&](const Peer &peer) {
                    if (peer.proof->getPayoutScript() == winner.second) {
                        BOOST_CHECK_LT(peer.registration_time.count(),
                                       (now - 60min).count());
                    }
                    return true;
                });
            };

        // 1 proof has been registered > 60min but < 90min from the previous
        // block time and 1 more has been registered > 30 minutes
        // => we have a winner and one acceptable substitute.
        now += 30min;
        SetMockTime(now);
        prevBlock.nTime = now.count();
        BOOST_CHECK(pm.selectStakingRewardWinner(&prevBlock, winners));
        BOOST_CHECK_EQUAL(winners.size(), 2);
        checkRegistrationTime(winners[0]);

        // 1 proof has been registered > 60min but < 90min from the
        // previous block time, 1 has been registered > 90 minutes and 1 more
        // has been registered > 30 minutes
        // => we have 1 winner and up to 2 acceptable substitutes.
        now += 30min;
        SetMockTime(now);
        prevBlock.nTime = now.count();
        BOOST_CHECK(pm.selectStakingRewardWinner(&prevBlock, winners));
        BOOST_CHECK_LE(winners.size(), 3);
        checkRegistrationTime(winners[0]);

        // 1 proofs has been registered > 60min but < 90min from the
        // previous block time, 2 has been registered > 90 minutes and 1 more
        // has been registered > 30 minutes
        // => we have 1 winner, and up to 2 substitutes.
        now += 30min;
        SetMockTime(now);
        prevBlock.nTime = now.count();
        BOOST_CHECK(pm.selectStakingRewardWinner(&prevBlock, winners));
        BOOST_CHECK_LE(winners.size(), 3);
        checkRegistrationTime(winners[0]);

        // 1 proof has been registered > 60min but < 90min from the
        // previous block time and 3 more has been registered > 90 minutes
        // => we have 1 winner, and up to 1 substitute.
        now += 30min;
        SetMockTime(now);
        prevBlock.nTime = now.count();
        BOOST_CHECK(pm.selectStakingRewardWinner(&prevBlock, winners));
        BOOST_CHECK_LE(winners.size(), 2);
        checkRegistrationTime(winners[0]);

        // All proofs has been registered > 90min from the previous block time
        // => we have 1 winner, and no substitute.
        now += 30min;
        SetMockTime(now);
        prevBlock.nTime = now.count();
        BOOST_CHECK(pm.selectStakingRewardWinner(&prevBlock, winners));
        BOOST_CHECK_EQUAL(winners.size(), 1);
        checkRegistrationTime(winners[0]);
    }
}

BOOST_AUTO_TEST_CASE(remote_proof) {
    ChainstateManager &chainman = *Assert(m_node.chainman);
    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);

    auto mockTime = GetTime<std::chrono::seconds>();
    SetMockTime(mockTime);

    BOOST_CHECK(pm.saveRemoteProof(ProofId(uint256::ZERO), 0, true));
    BOOST_CHECK(pm.saveRemoteProof(ProofId(uint256::ONE), 0, false));
    BOOST_CHECK(pm.saveRemoteProof(ProofId(uint256::ZERO), 1, true));
    BOOST_CHECK(pm.saveRemoteProof(ProofId(uint256::ONE), 1, false));

    auto checkRemoteProof =
        [&](const ProofId &proofid, const NodeId nodeid,
            const bool expectedPresent,
            const std::chrono::seconds &expectedlastUpdate) {
            BOOST_CHECK(pm.isRemoteProof(proofid));
            auto remoteProof =
                TestPeerManager::getRemoteProof(pm, proofid, nodeid);
            BOOST_CHECK(remoteProof.has_value());
            BOOST_CHECK_EQUAL(remoteProof->proofid, proofid);
            BOOST_CHECK_EQUAL(remoteProof->nodeid, nodeid);
            BOOST_CHECK_EQUAL(remoteProof->present, expectedPresent);
            BOOST_CHECK_EQUAL(remoteProof->lastUpdate.count(),
                              expectedlastUpdate.count());
        };

    checkRemoteProof(ProofId(uint256::ZERO), 0, true, mockTime);
    checkRemoteProof(ProofId(uint256::ONE), 0, false, mockTime);
    checkRemoteProof(ProofId(uint256::ZERO), 1, true, mockTime);
    checkRemoteProof(ProofId(uint256::ONE), 1, false, mockTime);

    mockTime += 1s;
    SetMockTime(mockTime);

    // Reverse the state
    BOOST_CHECK(pm.saveRemoteProof(ProofId(uint256::ZERO), 0, false));
    BOOST_CHECK(pm.saveRemoteProof(ProofId(uint256::ONE), 0, true));
    BOOST_CHECK(pm.saveRemoteProof(ProofId(uint256::ZERO), 1, false));
    BOOST_CHECK(pm.saveRemoteProof(ProofId(uint256::ONE), 1, true));

    checkRemoteProof(ProofId(uint256::ZERO), 0, false, mockTime);
    checkRemoteProof(ProofId(uint256::ONE), 0, true, mockTime);
    checkRemoteProof(ProofId(uint256::ZERO), 1, false, mockTime);
    checkRemoteProof(ProofId(uint256::ONE), 1, true, mockTime);

    Chainstate &active_chainstate = chainman.ActiveChainstate();

    // Actually register the nodes
    auto proof0 = buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE);
    BOOST_CHECK(pm.registerProof(proof0));
    BOOST_CHECK(pm.addNode(0, proof0->getId()));
    auto proof1 = buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE);
    BOOST_CHECK(pm.registerProof(proof1));
    BOOST_CHECK(pm.addNode(1, proof1->getId()));

    // Removing the node removes all the associated remote proofs
    BOOST_CHECK(pm.removeNode(0));
    BOOST_CHECK(
        !TestPeerManager::getRemoteProof(pm, ProofId(uint256::ZERO), 0));
    BOOST_CHECK(!TestPeerManager::getRemoteProof(pm, ProofId(uint256::ONE), 0));
    // Other nodes are left untouched
    checkRemoteProof(ProofId(uint256::ZERO), 1, false, mockTime);
    checkRemoteProof(ProofId(uint256::ONE), 1, true, mockTime);

    BOOST_CHECK(pm.removeNode(1));
    BOOST_CHECK(
        !TestPeerManager::getRemoteProof(pm, ProofId(uint256::ZERO), 0));
    BOOST_CHECK(!TestPeerManager::getRemoteProof(pm, ProofId(uint256::ONE), 0));
    BOOST_CHECK(
        !TestPeerManager::getRemoteProof(pm, ProofId(uint256::ZERO), 1));
    BOOST_CHECK(!TestPeerManager::getRemoteProof(pm, ProofId(uint256::ONE), 1));

    for (size_t i = 0; i < avalanche::PeerManager::MAX_REMOTE_PROOFS; i++) {
        mockTime += 1s;
        SetMockTime(mockTime);

        const ProofId proofid{uint256(i)};

        BOOST_CHECK(pm.saveRemoteProof(proofid, 0, true));
        checkRemoteProof(proofid, 0, true, mockTime);
    }

    // The last updated proof is still there
    checkRemoteProof(ProofId(uint256::ZERO), 0, true,
                     mockTime -
                         (avalanche::PeerManager::MAX_REMOTE_PROOFS - 1) * 1s);

    // If we add one more it gets evicted
    mockTime += 1s;
    SetMockTime(mockTime);

    ProofId proofid{
        uint256(uint8_t(avalanche::PeerManager::MAX_REMOTE_PROOFS))};

    BOOST_CHECK(pm.saveRemoteProof(proofid, 0, true));
    checkRemoteProof(proofid, 0, true, mockTime);
    // Proof id 0 has been evicted
    BOOST_CHECK(
        !TestPeerManager::getRemoteProof(pm, ProofId(uint256::ZERO), 0));

    // Proof id 1 is still there
    BOOST_CHECK(TestPeerManager::getRemoteProof(pm, ProofId(uint256::ONE), 0));

    // Add MAX_REMOTE_PROOFS / 2 + 1 proofs to our node to bump the limit
    // Note that we already have proofs from the beginning of the test.
    std::vector<ProofRef> proofs;
    for (size_t i = 0; i < avalanche::PeerManager::MAX_REMOTE_PROOFS / 2 - 1;
         i++) {
        auto proof = buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE);
        BOOST_CHECK(pm.registerProof(proof));
        proofs.push_back(proof);
    }
    BOOST_CHECK_EQUAL(TestPeerManager::getPeerCount(pm),
                      avalanche::PeerManager::MAX_REMOTE_PROOFS / 2 + 1);

    // We can now add one more without eviction
    mockTime += 1s;
    SetMockTime(mockTime);

    proofid = ProofId{
        uint256(uint8_t(avalanche::PeerManager::MAX_REMOTE_PROOFS + 1))};

    BOOST_CHECK(pm.saveRemoteProof(proofid, 0, true));
    checkRemoteProof(proofid, 0, true, mockTime);
    // Proof id 1 is still there
    BOOST_CHECK(TestPeerManager::getRemoteProof(pm, ProofId(uint256::ONE), 0));

    // Shrink our proofs to MAX_REMOTE_PROOFS / 2 - 1
    BOOST_CHECK(pm.rejectProof(
        proofs[0]->getId(), avalanche::PeerManager::RejectionMode::INVALIDATE));
    BOOST_CHECK(pm.rejectProof(
        proofs[1]->getId(), avalanche::PeerManager::RejectionMode::INVALIDATE));

    BOOST_CHECK_EQUAL(TestPeerManager::getPeerCount(pm),
                      avalanche::PeerManager::MAX_REMOTE_PROOFS / 2 - 1);

    // Upon update the first proof got evicted
    proofid = ProofId{
        uint256(uint8_t(avalanche::PeerManager::MAX_REMOTE_PROOFS + 2))};
    BOOST_CHECK(pm.saveRemoteProof(proofid, 0, true));
    // Proof id 1 is evicted
    BOOST_CHECK(!TestPeerManager::getRemoteProof(pm, ProofId(uint256::ONE), 0));
    // So is proof id 2
    BOOST_CHECK(!TestPeerManager::getRemoteProof(pm, ProofId(uint256(2)), 0));
    // But proof id 3 is still here
    BOOST_CHECK(TestPeerManager::getRemoteProof(pm, ProofId(uint256(3)), 0));
}

BOOST_AUTO_TEST_CASE(get_remote_status) {
    ChainstateManager &chainman = *Assert(m_node.chainman);
    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);
    Chainstate &active_chainstate = chainman.ActiveChainstate();

    auto mockTime = GetTime<std::chrono::seconds>();
    SetMockTime(mockTime);

    // No remote proof yet
    BOOST_CHECK(
        !TestPeerManager::getRemotePresenceStatus(pm, ProofId(uint256::ZERO))
             .has_value());

    // 6/12 (50%) of the stakes
    for (NodeId nodeid = 0; nodeid < 12; nodeid++) {
        auto proof = buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE);
        BOOST_CHECK(pm.registerProof(proof));
        BOOST_CHECK(pm.addNode(nodeid, proof->getId()));
        BOOST_CHECK(pm.saveRemoteProof(ProofId(uint256::ZERO), nodeid,
                                       nodeid % 2 == 0));
    }

    BOOST_CHECK(
        !TestPeerManager::getRemotePresenceStatus(pm, ProofId(uint256::ZERO))
             .has_value());

    // 7/12 (~58%) of the stakes
    for (NodeId nodeid = 0; nodeid < 5; nodeid++) {
        BOOST_CHECK(pm.saveRemoteProof(ProofId(uint256::ZERO), nodeid, false));
    }
    for (NodeId nodeid = 5; nodeid < 12; nodeid++) {
        BOOST_CHECK(pm.saveRemoteProof(ProofId(uint256::ZERO), nodeid, true));
    }
    BOOST_CHECK(
        TestPeerManager::getRemotePresenceStatus(pm, ProofId(uint256::ZERO))
            .value());

    // Add our local proof so we have 7/13 (~54% < 55%)
    auto localProof =
        buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE);
    TestPeerManager::setLocalProof(pm, localProof);
    BOOST_CHECK(pm.registerProof(localProof));
    BOOST_CHECK(
        !TestPeerManager::getRemotePresenceStatus(pm, ProofId(uint256::ZERO))
             .has_value());

    // Remove the local proof to revert back to 7/12 (~58%)
    pm.rejectProof(localProof->getId());
    TestPeerManager::setLocalProof(pm, ProofRef());
    BOOST_CHECK(
        TestPeerManager::getRemotePresenceStatus(pm, ProofId(uint256::ZERO))
            .value());

    // 5/12 (~42%) of the stakes
    for (NodeId nodeid = 0; nodeid < 5; nodeid++) {
        BOOST_CHECK(pm.saveRemoteProof(ProofId(uint256::ZERO), nodeid, true));
    }
    for (NodeId nodeid = 5; nodeid < 12; nodeid++) {
        BOOST_CHECK(pm.saveRemoteProof(ProofId(uint256::ZERO), nodeid, false));
    }
    BOOST_CHECK(
        !TestPeerManager::getRemotePresenceStatus(pm, ProofId(uint256::ZERO))
             .value());

    // Most nodes agree but not enough of the stakes
    auto bigProof =
        buildRandomProof(active_chainstate, 100 * MIN_VALID_PROOF_SCORE);
    BOOST_CHECK(pm.registerProof(bigProof));
    // Update the node's proof
    BOOST_CHECK(pm.addNode(0, bigProof->getId()));

    // 7/12 (~58%) of the remotes, but < 10% of the stakes => absent
    for (NodeId nodeid = 0; nodeid < 5; nodeid++) {
        BOOST_CHECK(pm.saveRemoteProof(ProofId(uint256::ZERO), nodeid, false));
    }
    for (NodeId nodeid = 5; nodeid < 12; nodeid++) {
        BOOST_CHECK(pm.saveRemoteProof(ProofId(uint256::ZERO), nodeid, true));
    }
    BOOST_CHECK(
        !TestPeerManager::getRemotePresenceStatus(pm, ProofId(uint256::ZERO))
             .value());

    // 5/12 (42%) of the remotes, but > 90% of the stakes => present
    for (NodeId nodeid = 0; nodeid < 5; nodeid++) {
        BOOST_CHECK(pm.saveRemoteProof(ProofId(uint256::ZERO), nodeid, true));
    }
    for (NodeId nodeid = 5; nodeid < 12; nodeid++) {
        BOOST_CHECK(pm.saveRemoteProof(ProofId(uint256::ZERO), nodeid, false));
    }
    BOOST_CHECK(
        TestPeerManager::getRemotePresenceStatus(pm, ProofId(uint256::ZERO))
            .value());

    TestPeerManager::clearPeers(pm);

    // Peer 1 has 1 node (id 0)
    auto proof1 = buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE);
    BOOST_CHECK(pm.registerProof(proof1));
    BOOST_CHECK(pm.addNode(0, proof1->getId()));

    // Peer 2 has 5 nodes (ids 1 to 5)
    auto proof2 = buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE);
    BOOST_CHECK(pm.registerProof(proof2));
    for (NodeId nodeid = 1; nodeid < 6; nodeid++) {
        BOOST_CHECK(pm.addNode(nodeid, proof2->getId()));
    }

    // Node 0 is missing proofid 0, nodes 1 to 5 have it
    BOOST_CHECK(pm.saveRemoteProof(ProofId(uint256::ZERO), 0, false));
    for (NodeId nodeid = 1; nodeid < 6; nodeid++) {
        BOOST_CHECK(pm.saveRemoteProof(ProofId(uint256::ZERO), nodeid, true));
    }

    // At this stage we have 5/6 nodes with the proof, but since all the nodes
    // advertising the proof are from the same peer, we only 1/2 peers, i.e. 50%
    // of the stakes.
    BOOST_CHECK(
        !TestPeerManager::getRemotePresenceStatus(pm, ProofId(uint256::ZERO))
             .has_value());
}

BOOST_AUTO_TEST_CASE(dangling_with_remotes) {
    ChainstateManager &chainman = *Assert(m_node.chainman);
    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);
    Chainstate &active_chainstate = chainman.ActiveChainstate();

    auto mockTime = GetTime<std::chrono::seconds>();
    SetMockTime(mockTime);

    // Add a few proofs with no node attached
    std::vector<ProofRef> proofs;
    for (size_t i = 0; i < 10; i++) {
        auto proof = buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE);
        BOOST_CHECK(pm.registerProof(proof));
        proofs.push_back(proof);
    }

    // The proofs are recent enough, the cleanup won't make them dangling
    TestPeerManager::cleanupDanglingProofs(pm);
    for (const auto &proof : proofs) {
        BOOST_CHECK(pm.isBoundToPeer(proof->getId()));
        BOOST_CHECK(!pm.isDangling(proof->getId()));
    }

    // Elapse enough time so we get the proofs dangling
    mockTime += avalanche::Peer::DANGLING_TIMEOUT + 1s;
    SetMockTime(mockTime);

    // The proofs are now dangling
    TestPeerManager::cleanupDanglingProofs(pm);
    for (const auto &proof : proofs) {
        BOOST_CHECK(!pm.isBoundToPeer(proof->getId()));
        BOOST_CHECK(pm.isDangling(proof->getId()));
    }

    // Add some remotes having this proof
    for (NodeId nodeid = 0; nodeid < 10; nodeid++) {
        auto localProof =
            buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE);
        BOOST_CHECK(pm.registerProof(localProof));
        BOOST_CHECK(pm.addNode(nodeid, localProof->getId()));

        for (const auto &proof : proofs) {
            BOOST_CHECK(pm.saveRemoteProof(proof->getId(), nodeid, true));
        }
    }

    // The proofs are all present according to the remote status
    for (const auto &proof : proofs) {
        BOOST_CHECK(TestPeerManager::getRemotePresenceStatus(pm, proof->getId())
                        .value());
    }

    // The proofs should be added back as a peer
    std::unordered_set<ProofRef, SaltedProofHasher> registeredProofs;
    TestPeerManager::cleanupDanglingProofs(pm, registeredProofs);
    for (const auto &proof : proofs) {
        BOOST_CHECK(pm.isBoundToPeer(proof->getId()));
        BOOST_CHECK(!pm.isDangling(proof->getId()));
        BOOST_CHECK_EQUAL(registeredProofs.count(proof), 1);
    }
    BOOST_CHECK_EQUAL(proofs.size(), registeredProofs.size());

    // Remove the proofs from the remotes
    for (NodeId nodeid = 0; nodeid < 10; nodeid++) {
        for (const auto &proof : proofs) {
            BOOST_CHECK(pm.saveRemoteProof(proof->getId(), nodeid, false));
        }
    }

    // The proofs are now all absent according to the remotes
    for (const auto &proof : proofs) {
        BOOST_CHECK(
            !TestPeerManager::getRemotePresenceStatus(pm, proof->getId())
                 .value());
    }

    // The proofs are not dangling yet as they have been registered recently
    TestPeerManager::cleanupDanglingProofs(pm, registeredProofs);
    BOOST_CHECK(registeredProofs.empty());
    for (const auto &proof : proofs) {
        BOOST_CHECK(pm.isBoundToPeer(proof->getId()));
        BOOST_CHECK(!pm.isDangling(proof->getId()));
    }

    // Wait some time then run the cleanup again, the proofs will be dangling
    mockTime += avalanche::Peer::DANGLING_TIMEOUT + 1s;
    SetMockTime(mockTime);

    TestPeerManager::cleanupDanglingProofs(pm, registeredProofs);
    BOOST_CHECK(registeredProofs.empty());
    for (const auto &proof : proofs) {
        BOOST_CHECK(!pm.isBoundToPeer(proof->getId()));
        BOOST_CHECK(pm.isDangling(proof->getId()));
    }

    // Pull them back one more time
    for (NodeId nodeid = 0; nodeid < 10; nodeid++) {
        for (const auto &proof : proofs) {
            BOOST_CHECK(pm.saveRemoteProof(proof->getId(), nodeid, true));
        }
    }

    TestPeerManager::cleanupDanglingProofs(pm, registeredProofs);
    for (const auto &proof : proofs) {
        BOOST_CHECK(pm.isBoundToPeer(proof->getId()));
        BOOST_CHECK(!pm.isDangling(proof->getId()));
        BOOST_CHECK_EQUAL(registeredProofs.count(proof), 1);
    }
    BOOST_CHECK_EQUAL(proofs.size(), registeredProofs.size());
}

BOOST_AUTO_TEST_CASE(avapeers_dump) {
    ChainstateManager &chainman = *Assert(m_node.chainman);
    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);
    Chainstate &active_chainstate = chainman.ActiveChainstate();

    auto mockTime = GetTime<std::chrono::seconds>();
    SetMockTime(mockTime);

    std::vector<ProofRef> proofs;
    for (size_t i = 0; i < 10; i++) {
        SetMockTime(mockTime + std::chrono::seconds{i});

        auto proof = buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE);
        // Registration time is mockTime + i
        BOOST_CHECK(pm.registerProof(proof));

        auto peerid = TestPeerManager::getPeerIdForProofId(pm, proof->getId());

        // Next conflict time is mockTime + 100 + i
        BOOST_CHECK(pm.updateNextPossibleConflictTime(
            peerid, mockTime + std::chrono::seconds{100 + i}));

        // The 5 first proofs are finalized
        if (i < 5) {
            BOOST_CHECK(pm.setFinalized(peerid));
        }

        proofs.push_back(proof);
    }

    BOOST_CHECK_EQUAL(TestPeerManager::getPeerCount(pm), 10);

    const fs::path testDumpPath = "test_avapeers_dump.dat";
    BOOST_CHECK(pm.dumpPeersToFile(testDumpPath));

    TestPeerManager::clearPeers(pm);

    std::unordered_set<ProofRef, SaltedProofHasher> registeredProofs;
    BOOST_CHECK(pm.loadPeersFromFile(testDumpPath, registeredProofs));
    BOOST_CHECK_EQUAL(registeredProofs.size(), 10);

    auto findProofIndex = [&proofs](const ProofId &proofid) {
        for (size_t i = 0; i < proofs.size(); i++) {
            if (proofs[i]->getId() == proofid) {
                return i;
            }
        }

        // ProofId not found
        BOOST_CHECK(false);
        return size_t{0};
    };

    for (const auto &proof : registeredProofs) {
        const ProofId &proofid = proof->getId();
        size_t i = findProofIndex(proofid);
        BOOST_CHECK(pm.forPeer(proofid, [&](auto &peer) {
            BOOST_CHECK_EQUAL(peer.hasFinalized, i < 5);
            BOOST_CHECK_EQUAL(peer.registration_time.count(),
                              (mockTime + std::chrono::seconds{i}).count());
            BOOST_CHECK_EQUAL(
                peer.nextPossibleConflictTime.count(),
                (mockTime + std::chrono::seconds{100 + i}).count());
            return true;
        }));
    }

    // No peer: create an empty file but generate no error
    TestPeerManager::clearPeers(pm);
    BOOST_CHECK(pm.dumpPeersToFile("test_empty_avapeers.dat"));
    // We can also load an empty file
    BOOST_CHECK(
        pm.loadPeersFromFile("test_empty_avapeers.dat", registeredProofs));
    BOOST_CHECK(registeredProofs.empty());
    BOOST_CHECK_EQUAL(TestPeerManager::getPeerCount(pm), 0);

    // If the file exists, it is overrwritten
    BOOST_CHECK(pm.dumpPeersToFile("test_empty_avapeers.dat"));

    // It fails to load if the file does not exist and the registeredProofs is
    // cleared
    registeredProofs.insert(proofs[0]);
    BOOST_CHECK(!registeredProofs.empty());
    BOOST_CHECK(!pm.loadPeersFromFile("I_dont_exist.dat", registeredProofs));
    BOOST_CHECK(registeredProofs.empty());

    {
        // Change the version
        FILE *f = fsbridge::fopen("test_bad_version_avapeers.dat", "wb");
        BOOST_CHECK(f);
        CAutoFile file(f, SER_DISK, CLIENT_VERSION);
        file << static_cast<uint64_t>(-1); // Version
        file << uint64_t{0};               // Number of peers
        BOOST_CHECK(FileCommit(file.Get()));
        file.fclose();

        // Check loading fails and the registeredProofs is cleared
        registeredProofs.insert(proofs[0]);
        BOOST_CHECK(!registeredProofs.empty());
        BOOST_CHECK(!pm.loadPeersFromFile("test_bad_version_avapeers.dat",
                                          registeredProofs));
        BOOST_CHECK(registeredProofs.empty());
    }

    {
        // Wrong format, will cause a deserialization error
        FILE *f = fsbridge::fopen("test_ill_formed_avapeers.dat", "wb");
        BOOST_CHECK(f);
        const uint64_t now = GetTime();
        CAutoFile file(f, SER_DISK, CLIENT_VERSION);
        file << static_cast<uint64_t>(1); // Version
        file << uint64_t{2};              // Number of peers
        // Single peer content!
        file << proofs[0];
        file << true;
        file << now;
        file << now + 100;

        BOOST_CHECK(FileCommit(file.Get()));
        file.fclose();

        // Check loading fails and the registeredProofs is fed with our single
        // peer
        BOOST_CHECK(registeredProofs.empty());
        BOOST_CHECK(!pm.loadPeersFromFile("test_ill_formed_avapeers.dat",
                                          registeredProofs));
        BOOST_CHECK_EQUAL(registeredProofs.size(), 1);
        BOOST_CHECK_EQUAL((*registeredProofs.begin())->getId(),
                          proofs[0]->getId());
    }
}

BOOST_AUTO_TEST_CASE(dangling_proof_invalidation) {
    ChainstateManager &chainman = *Assert(m_node.chainman);
    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, chainman);
    Chainstate &active_chainstate = chainman.ActiveChainstate();

    SetMockTime(GetTime<std::chrono::seconds>());

    CKey key = CKey::MakeCompressedKey();
    auto utxo = createUtxo(active_chainstate, key);
    auto proof =
        buildProof(key, {{utxo, PROOF_DUST_THRESHOLD}}, key, 2, 100, false,
                   GetTime<std::chrono::seconds>().count() + 1000000);

    // Register the proof
    BOOST_CHECK(pm.registerProof(proof));
    BOOST_CHECK(pm.isBoundToPeer(proof->getId()));
    BOOST_CHECK(!pm.isDangling(proof->getId()));

    // Elapse the dangling timeout. No nodes are bound, so the proof is now
    // dangling.
    SetMockTime(GetTime<std::chrono::seconds>() +
                avalanche::Peer::DANGLING_TIMEOUT);
    TestPeerManager::cleanupDanglingProofs(pm);
    BOOST_CHECK(!pm.isBoundToPeer(proof->getId()));
    BOOST_CHECK(!pm.exists(proof->getId()));
    BOOST_CHECK(pm.isDangling(proof->getId()));

    {
        LOCK(cs_main);
        CCoinsViewCache &coins = active_chainstate.CoinsTip();
        // Make proof invalid
        coins.SpendCoin(utxo);
    }

    // Trigger proof validity checks
    pm.updatedBlockTip();

    // The now invalid proof is removed
    BOOST_CHECK(!pm.exists(proof->getId()));
    BOOST_CHECK(!pm.isDangling(proof->getId()));

    {
        LOCK(cs_main);
        CCoinsViewCache &coins = active_chainstate.CoinsTip();
        // Add the utxo back so we can make the proof valid again
        CScript script = GetScriptForDestination(PKHash(key.GetPubKey()));
        coins.AddCoin(utxo,
                      Coin(CTxOut(PROOF_DUST_THRESHOLD, script), 100, false),
                      false);
    }

    // Our proof is not expired yet, so it registers fine
    BOOST_CHECK(pm.registerProof(proof));
    BOOST_CHECK(pm.isBoundToPeer(proof->getId()));
    BOOST_CHECK(!pm.isDangling(proof->getId()));

    // Elapse the dangling timeout. No nodes are bound, so the proof is now
    // dangling.
    SetMockTime(GetTime<std::chrono::seconds>() +
                avalanche::Peer::DANGLING_TIMEOUT);
    TestPeerManager::cleanupDanglingProofs(pm);
    BOOST_CHECK(!pm.isBoundToPeer(proof->getId()));
    BOOST_CHECK(!pm.exists(proof->getId()));
    BOOST_CHECK(pm.isDangling(proof->getId()));

    // Mine blocks until the MTP of the tip moves to the proof expiration
    for (int64_t i = 0; i < 6; i++) {
        SetMockTime(proof->getExpirationTime() + i);
        CreateAndProcessBlock({}, CScript());
    }
    BOOST_CHECK_EQUAL(
        WITH_LOCK(chainman.GetMutex(), return chainman.ActiveTip())
            ->GetMedianTimePast(),
        proof->getExpirationTime());

    pm.updatedBlockTip();

    // The now expired proof is removed
    BOOST_CHECK(!pm.exists(proof->getId()));
    BOOST_CHECK(!pm.isDangling(proof->getId()));
}

BOOST_AUTO_TEST_SUITE_END()
