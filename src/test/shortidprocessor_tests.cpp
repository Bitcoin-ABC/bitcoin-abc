// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <shortidprocessor.h>

#include <boost/test/unit_test.hpp>

#include <algorithm>
#include <utility>

BOOST_AUTO_TEST_SUITE(shortidprocessor_tests)

namespace {
struct PrefilledTestItem {
    uint32_t index;
    std::shared_ptr<uint32_t> item;

    PrefilledTestItem(uint32_t indexIn)
        : index(indexIn), item(std::make_shared<uint32_t>(indexIn)) {}
};

using ItemType = decltype(PrefilledTestItem::item);

struct PrefilledTestItemAdapter {
    uint32_t getIndex(const PrefilledTestItem &i) const { return i.index; }
    ItemType getItem(const PrefilledTestItem &i) const { return i.item; }
};

struct TestItemCompare {
    bool operator()(const ItemType &lhs, const ItemType &rhs) const {
        return *lhs == *rhs;
    }
};
} // namespace

BOOST_AUTO_TEST_CASE(processing_items) {
    using TestItemShortIdProcessor =
        ShortIdProcessor<PrefilledTestItem, PrefilledTestItemAdapter,
                         TestItemCompare>;

    {
        TestItemShortIdProcessor p({}, {}, 0);
        BOOST_CHECK_EQUAL(p.getItemCount(), 0);
        BOOST_CHECK_EQUAL(p.getShortIdCount(), 0);
        BOOST_CHECK(p.isEvenlyDistributed());
        BOOST_CHECK(!p.hasShortIdCollision());
        BOOST_CHECK(!p.hasOutOfBoundIndex());
    }

    {
        // Trigger the bucket uneven distribution.
        // 0 is not a realistic threshold value but is the only one which is
        // guaranteed to always trigger the flag, because the number of buckets
        // is set to the number of shortids.
        TestItemShortIdProcessor p({}, {0}, 0);
        BOOST_CHECK_EQUAL(p.getItemCount(), 1);
        BOOST_CHECK_EQUAL(p.getShortIdCount(), 1);
        BOOST_CHECK(!p.isEvenlyDistributed());
        BOOST_CHECK(!p.hasShortIdCollision());
        BOOST_CHECK(!p.hasOutOfBoundIndex());
    }

    {
        // Trigger the short id collision
        TestItemShortIdProcessor p({}, {0, 0}, 1);
        BOOST_CHECK_EQUAL(p.getItemCount(), 2);
        BOOST_CHECK_EQUAL(p.getShortIdCount(), 1);
        BOOST_CHECK(p.isEvenlyDistributed());
        BOOST_CHECK(p.hasShortIdCollision());
        BOOST_CHECK(!p.hasOutOfBoundIndex());
    }

    // Trigger the out of bound index
    auto checkOutOfBoundIndex = [&](const TestItemShortIdProcessor &p) {
        BOOST_CHECK(p.isEvenlyDistributed());
        BOOST_CHECK(!p.hasShortIdCollision());
        BOOST_CHECK(p.hasOutOfBoundIndex());
    };
    checkOutOfBoundIndex(TestItemShortIdProcessor({1}, {}, 1));
    checkOutOfBoundIndex(TestItemShortIdProcessor({0, 1, 2, 3, 5}, {}, 1));
    checkOutOfBoundIndex(TestItemShortIdProcessor({4}, {0, 1, 2}, 3));
    checkOutOfBoundIndex(TestItemShortIdProcessor({0, 1, 6}, {0, 1, 2}, 3));

    {
        const std::vector<PrefilledTestItem> prefilledItems{0, 1, 2, 5};
        const std::vector<uint64_t> shortids{3, 4, 6, 7, 8, 9};
        TestItemShortIdProcessor p(prefilledItems, shortids, 10);
        BOOST_CHECK_EQUAL(p.getItemCount(), 10);
        BOOST_CHECK_EQUAL(p.getShortIdCount(), 6);
        BOOST_CHECK(p.isEvenlyDistributed());
        BOOST_CHECK(!p.hasShortIdCollision());
        BOOST_CHECK(!p.hasOutOfBoundIndex());

        BOOST_CHECK(p.getItem(0) == prefilledItems[0].item);
        BOOST_CHECK(p.getItem(1) == prefilledItems[1].item);
        BOOST_CHECK(p.getItem(2) == prefilledItems[2].item);
        BOOST_CHECK(p.getItem(3) == nullptr);
        BOOST_CHECK(p.getItem(4) == nullptr);
        BOOST_CHECK(p.getItem(5) == prefilledItems[3].item);
        BOOST_CHECK(p.getItem(6) == nullptr);
        BOOST_CHECK(p.getItem(7) == nullptr);
        BOOST_CHECK(p.getItem(8) == nullptr);
        BOOST_CHECK(p.getItem(9) == nullptr);

        // Add a missing shortid
        auto item3 = std::make_shared<uint32_t>(3);
        BOOST_CHECK_EQUAL(p.matchKnownItem(3, item3), 1);
        BOOST_CHECK(p.getItem(3) == item3);

        // If the same item is added again, it has no effect
        for (size_t i = 0; i < 10; i++) {
            BOOST_CHECK_EQUAL(
                p.matchKnownItem(3, std::make_shared<uint32_t>(3)), 0);
            BOOST_CHECK(p.getItem(3) == item3);
        }

        // Shortid collision, the item is removed from the available list so it
        // will be requested.
        BOOST_CHECK_EQUAL(p.matchKnownItem(3, std::make_shared<uint32_t>(30)),
                          -1);
        BOOST_CHECK(p.getItem(3) == nullptr);

        // Now that collision occurred, adding other items as no effect
        for (size_t i = 0; i < 10; i++) {
            BOOST_CHECK_EQUAL(
                p.matchKnownItem(3, std::make_shared<uint32_t>(i)), 0);
            BOOST_CHECK(p.getItem(3) == nullptr);
        }
    }
}

BOOST_AUTO_TEST_SUITE_END()
