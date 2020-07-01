// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/peermanager.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(peermanager_tests, BasicTestingSetup)

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

    // In betwenn
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
            uint64_t s = InsecureRandRange(max);
            auto i = selectPeerImpl(slots, s, max);
            // /!\ Because of the way we construct the vector, the peer id is
            // always the index. This might not be the case in practice.
            BOOST_CHECK(i == NO_PEER || slots[i].contains(s));
        }
    }
}

BOOST_AUTO_TEST_CASE(add_peer) {
    // No peers.
    PeerManager pm;
    BOOST_CHECK_EQUAL(pm.selectPeer(), NO_PEER);

    // One peer, we always return it.
    PeerId peer0 = pm.addPeer(100);
    BOOST_CHECK_EQUAL(pm.selectPeer(), peer0);

    // Two peers, verify ratio.
    PeerId peer1 = pm.addPeer(200);

    std::unordered_map<PeerId, int> results = {};
    for (int i = 0; i < 10000; i++) {
        size_t p = pm.selectPeer();
        BOOST_CHECK(p == peer0 || p == peer1);
        results[p]++;
    }

    BOOST_CHECK(abs(2 * results[0] - results[1]) < 500);

    // Three peers, verify ratio.
    PeerId peer2 = pm.addPeer(100);

    results.clear();
    for (int i = 0; i < 10000; i++) {
        size_t p = pm.selectPeer();
        BOOST_CHECK(p == peer0 || p == peer1 || p == peer2);
        results[p]++;
    }

    BOOST_CHECK(abs(results[0] - results[1] + results[2]) < 500);
}

BOOST_AUTO_TEST_CASE(remove_peer) {
    // No peers.
    PeerManager pm;
    BOOST_CHECK_EQUAL(pm.selectPeer(), NO_PEER);

    // Add 4 peers.
    std::array<PeerId, 8> peerids;
    for (int i = 0; i < 4; i++) {
        peerids[i] = pm.addPeer(100);
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
        peerids[i + 4] = pm.addPeer(100);
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

BOOST_AUTO_TEST_CASE(rescore_peer, *boost::unit_test::timeout(5)) {
    // No peers.
    PeerManager pm;
    BOOST_CHECK_EQUAL(pm.selectPeer(), NO_PEER);

    // Add 4 peers.
    std::array<PeerId, 4> peerids;
    for (int i = 0; i < 4; i++) {
        peerids[i] = pm.addPeer(100);
    }

    BOOST_CHECK_EQUAL(pm.getSlotCount(), 400);
    BOOST_CHECK_EQUAL(pm.getFragmentation(), 0);

    for (int i = 0; i < 100; i++) {
        PeerId p = pm.selectPeer();
        BOOST_CHECK(p == peerids[0] || p == peerids[1] || p == peerids[2] ||
                    p == peerids[3]);
    }

    // Set one peer's score to 0, it nevers show up now.
    BOOST_CHECK(pm.rescorePeer(peerids[1], 0));
    BOOST_CHECK_EQUAL(pm.getSlotCount(), 400);
    BOOST_CHECK_EQUAL(pm.getFragmentation(), 100);

    for (int i = 0; i < 100; i++) {
        PeerId p = pm.selectPeer();
        BOOST_CHECK(p == peerids[0] || p == peerids[2] || p == peerids[3] ||
                    p == NO_PEER);
    }

    // "resurrect" the peer.
    BOOST_CHECK(pm.rescorePeer(peerids[1], 100));
    BOOST_CHECK_EQUAL(pm.getSlotCount(), 400);
    BOOST_CHECK_EQUAL(pm.getFragmentation(), 0);

    while (true) {
        PeerId p = pm.selectPeer();
        BOOST_CHECK(p == peerids[0] || p == peerids[1] || p == peerids[2] ||
                    p == peerids[3]);
        // Make sure peer 1 reappeared.
        if (p == peerids[1]) {
            break;
        }
    }

    // Grow the peer to a point where it needs to be reallocated.
    BOOST_CHECK(pm.rescorePeer(peerids[1], 200));
    BOOST_CHECK_EQUAL(pm.getSlotCount(), 600);
    BOOST_CHECK_EQUAL(pm.getFragmentation(), 100);

    for (int i = 0; i < 25; i++) {
        while (true) {
            PeerId p = pm.selectPeer();
            BOOST_CHECK(p == peerids[0] || p == peerids[1] || p == peerids[2] ||
                        p == peerids[3] || p == NO_PEER);
            // Make sure peer 1 reappeared.
            if (p == peerids[1]) {
                break;
            }
        }
    }

    // Compact the peer manager.
    BOOST_CHECK_EQUAL(pm.compact(), 100);
    BOOST_CHECK(pm.verify());
    BOOST_CHECK_EQUAL(pm.getSlotCount(), 500);
    BOOST_CHECK_EQUAL(pm.getFragmentation(), 0);
}

BOOST_AUTO_TEST_CASE(compact_slots) {
    PeerManager pm;

    // Add 4 peers.
    std::array<PeerId, 4> peerids;
    for (int i = 0; i < 4; i++) {
        peerids[i] = pm.addPeer(100);
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

BOOST_AUTO_TEST_SUITE_END()
