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
    const std::vector<Slot> oneslot = {{100, 200}};

    // Undershoot
    BOOST_CHECK_EQUAL(selectPeerImpl(oneslot, 0, 300), NO_PEER);
    BOOST_CHECK_EQUAL(selectPeerImpl(oneslot, 42, 300), NO_PEER);
    BOOST_CHECK_EQUAL(selectPeerImpl(oneslot, 99, 300), NO_PEER);

    // Nailed it
    BOOST_CHECK_EQUAL(selectPeerImpl(oneslot, 100, 300), 0);
    BOOST_CHECK_EQUAL(selectPeerImpl(oneslot, 142, 300), 0);
    BOOST_CHECK_EQUAL(selectPeerImpl(oneslot, 199, 300), 0);

    // Overshoot
    BOOST_CHECK_EQUAL(selectPeerImpl(oneslot, 200, 300), NO_PEER);
    BOOST_CHECK_EQUAL(selectPeerImpl(oneslot, 242, 300), NO_PEER);
    BOOST_CHECK_EQUAL(selectPeerImpl(oneslot, 299, 300), NO_PEER);

    // Two peers
    const std::vector<Slot> twoslots = {{100, 200}, {300, 400}};

    // Undershoot
    BOOST_CHECK_EQUAL(selectPeerImpl(twoslots, 0, 500), NO_PEER);
    BOOST_CHECK_EQUAL(selectPeerImpl(twoslots, 42, 500), NO_PEER);
    BOOST_CHECK_EQUAL(selectPeerImpl(twoslots, 99, 500), NO_PEER);

    // First entry
    BOOST_CHECK_EQUAL(selectPeerImpl(twoslots, 100, 500), 0);
    BOOST_CHECK_EQUAL(selectPeerImpl(twoslots, 142, 500), 0);
    BOOST_CHECK_EQUAL(selectPeerImpl(twoslots, 199, 500), 0);

    // In betwenn
    BOOST_CHECK_EQUAL(selectPeerImpl(twoslots, 200, 500), NO_PEER);
    BOOST_CHECK_EQUAL(selectPeerImpl(twoslots, 242, 500), NO_PEER);
    BOOST_CHECK_EQUAL(selectPeerImpl(twoslots, 299, 500), NO_PEER);

    // Second entry
    BOOST_CHECK_EQUAL(selectPeerImpl(twoslots, 300, 500), 1);
    BOOST_CHECK_EQUAL(selectPeerImpl(twoslots, 342, 500), 1);
    BOOST_CHECK_EQUAL(selectPeerImpl(twoslots, 399, 500), 1);

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
        slots.emplace_back(max, max + 1);
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
    slots[99] = Slot(slots[99].getStart(), 300);
    max = 300;

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
        slots[i] = Slot(slots[i].getStart() + 100, slots[i].getStop() + 100);
    }

    slots[0] = Slot(1, slots[0].getStop());
    slots[99] = Slot(slots[99].getStart(), 300);

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
            uint64_t start = next();
            uint64_t stop = next();
            slots.emplace_back(start, stop);
        }

        for (int k = 0; k < 100; k++) {
            uint64_t s = InsecureRandRange(max);
            auto i = selectPeerImpl(slots, s, max);
            BOOST_CHECK(i == NO_PEER || slots[i].contains(s));
        }
    }
}

BOOST_AUTO_TEST_CASE(add_peer) {
    // No peers.
    PeerManager pm;
    BOOST_CHECK_EQUAL(pm.selectPeer(), NO_PEER);

    // One peer, we always return it.
    pm.addPeer(100);
    BOOST_CHECK_EQUAL(pm.selectPeer(), 0);

    // Two peers, verify ratio.
    pm.addPeer(200);

    std::array<int, 3> results = {};
    for (int i = 0; i < 10000; i++) {
        size_t p = pm.selectPeer();
        BOOST_CHECK(p <= 1);
        results[p]++;
    }

    BOOST_CHECK(abs(2 * results[0] - results[1]) < 500);

    // Three peers, verify ratio.
    pm.addPeer(100);

    results = {};
    for (int i = 0; i < 10000; i++) {
        size_t p = pm.selectPeer();
        BOOST_CHECK(p <= 2);
        results[p]++;
    }

    BOOST_CHECK(abs(results[0] - results[1] + results[2]) < 500);
}

BOOST_AUTO_TEST_CASE(remove_peer) {
    // No peers.
    PeerManager pm;
    BOOST_CHECK_EQUAL(pm.selectPeer(), NO_PEER);

    // Add 4 peers.
    for (int i = 0; i < 4; i++) {
        pm.addPeer(100);
    }

    for (int i = 0; i < 100; i++) {
        size_t p = pm.selectPeer();
        BOOST_CHECK(p <= 4);
    }

    // Remove one peer, it nevers show up now.
    pm.removePeer(3);
    for (int i = 0; i < 100; i++) {
        size_t p = pm.selectPeer();
        BOOST_CHECK(p < 4);
        BOOST_CHECK(p != 3);
    }

    // Add 4 more peers.
    for (int i = 0; i < 4; i++) {
        pm.addPeer(100);
    }

    pm.removePeer(0);
    pm.removePeer(7);
    for (int i = 0; i < 100; i++) {
        size_t p = pm.selectPeer();
        BOOST_CHECK(p < 8);
        BOOST_CHECK(p != 0);
        BOOST_CHECK(p != 3);
        BOOST_CHECK(p != 7);
    }
}

BOOST_AUTO_TEST_CASE(rescore_peer, *boost::unit_test::timeout(5)) {
    // No peers.
    PeerManager pm;
    BOOST_CHECK_EQUAL(pm.selectPeer(), NO_PEER);

    // Add 4 peers.
    for (int i = 0; i < 4; i++) {
        pm.addPeer(100);
    }

    BOOST_CHECK_EQUAL(pm.getSlotCount(), 400);
    BOOST_CHECK_EQUAL(pm.getFragmentation(), 0);

    for (int i = 0; i < 100; i++) {
        size_t p = pm.selectPeer();
        BOOST_CHECK(p <= 4);
    }

    // Set one peer's score to 0, it nevers show up now.
    pm.rescorePeer(1, 0);
    BOOST_CHECK_EQUAL(pm.getSlotCount(), 400);
    BOOST_CHECK_EQUAL(pm.getFragmentation(), 100);

    for (int i = 0; i < 100; i++) {
        size_t p = pm.selectPeer();
        BOOST_CHECK(p < 4);
        BOOST_CHECK(p != 1);
    }

    // "resurrect" the peer.
    pm.rescorePeer(1, 100);
    BOOST_CHECK_EQUAL(pm.getSlotCount(), 400);
    BOOST_CHECK_EQUAL(pm.getFragmentation(), 0);

    while (true) {
        size_t p = pm.selectPeer();
        if (p == 1) {
            break;
        }
    }

    // Grow the peer to a point where it needs to be reallocated.
    pm.rescorePeer(1, 200);
    BOOST_CHECK_EQUAL(pm.getSlotCount(), 600);
    BOOST_CHECK_EQUAL(pm.getFragmentation(), 100);

    for (int i = 0; i < 25; i++) {
        while (true) {
            size_t p = pm.selectPeer();
            BOOST_CHECK(p < 5);
            BOOST_CHECK(p != 1);
            if (p == 4) {
                break;
            }
        }
    }
}

BOOST_AUTO_TEST_SUITE_END()
