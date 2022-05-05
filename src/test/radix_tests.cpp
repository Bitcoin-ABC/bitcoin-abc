// Copyright (c) 2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <radix.h>

#include <test/lcg.h>
#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

#include <limits>
#include <type_traits>

BOOST_FIXTURE_TEST_SUITE(radix_tests, BasicTestingSetup)

template <typename K> struct TestElement {
    K key;

    TestElement(K keyIn) : key(keyIn) {}
    const K &getId() const { return key; }

    IMPLEMENT_RCU_REFCOUNT(uint32_t);
};

template <typename K> void testInsert() {
    using E = TestElement<K>;
    RadixTree<E> mytree;

    auto zero = RCUPtr<E>::make(0);
    auto one = RCUPtr<E>::make(1);
    auto two = RCUPtr<E>::make(2);
    auto three = RCUPtr<E>::make(3);

    // Inserting a new element into the tree returns true.
    BOOST_CHECK(mytree.insert(one));

    // Inserting an element already in the tree returns false.
    BOOST_CHECK(!mytree.insert(one));

    // Let's insert more elements and check behavior stays consistent.
    BOOST_CHECK(mytree.insert(zero));
    BOOST_CHECK(!mytree.insert(one));
    BOOST_CHECK(mytree.insert(two));
    BOOST_CHECK(mytree.insert(three));
    BOOST_CHECK(!mytree.insert(zero));
    BOOST_CHECK(!mytree.insert(one));
    BOOST_CHECK(!mytree.insert(two));
    BOOST_CHECK(!mytree.insert(three));

    // Check extreme values.
    using SK = typename std::make_signed<K>::type;
    auto maxsigned = RCUPtr<E>::make(std::numeric_limits<SK>::max());
    auto minsigned = RCUPtr<E>::make(std::numeric_limits<SK>::min());
    using UK = typename std::make_unsigned<K>::type;
    auto minusone = RCUPtr<E>::make(std::numeric_limits<UK>::max());
    auto minustwo = RCUPtr<E>::make(std::numeric_limits<UK>::max() - 1);

    // Insert them into the tree.
    BOOST_CHECK(mytree.insert(maxsigned));
    BOOST_CHECK(mytree.insert(minsigned));
    BOOST_CHECK(mytree.insert(minusone));
    BOOST_CHECK(mytree.insert(minustwo));

    // All elements are now in the tree.
    BOOST_CHECK(!mytree.insert(zero));
    BOOST_CHECK(!mytree.insert(one));
    BOOST_CHECK(!mytree.insert(two));
    BOOST_CHECK(!mytree.insert(three));
    BOOST_CHECK(!mytree.insert(maxsigned));
    BOOST_CHECK(!mytree.insert(minsigned));
    BOOST_CHECK(!mytree.insert(minusone));
    BOOST_CHECK(!mytree.insert(minustwo));
}

BOOST_AUTO_TEST_CASE(insert_test) {
    testInsert<int32_t>();
    testInsert<uint32_t>();
    testInsert<int64_t>();
    testInsert<uint64_t>();
}

template <typename K> void testGet() {
    using E = TestElement<K>;
    RadixTree<E> mytree;

    auto zero = RCUPtr<E>::make(0);
    auto one = RCUPtr<E>::make(1);
    auto two = RCUPtr<E>::make(2);
    auto three = RCUPtr<E>::make(3);

    // There are no elements in the tree so far.
    BOOST_CHECK_EQUAL(mytree.get(1), NULLPTR(E));

    // Insert an element into the tree and check it is there.
    BOOST_CHECK(mytree.insert(one));
    BOOST_CHECK_EQUAL(mytree.get(1), one);

    // Let's insert more elements and check they are recovered properly.
    BOOST_CHECK_EQUAL(mytree.get(0), NULLPTR(E));
    BOOST_CHECK(mytree.insert(zero));
    BOOST_CHECK_EQUAL(mytree.get(0), zero);
    BOOST_CHECK_EQUAL(mytree.get(1), one);

    // More elements.
    BOOST_CHECK_EQUAL(mytree.get(2), NULLPTR(E));
    BOOST_CHECK_EQUAL(mytree.get(3), NULLPTR(E));
    BOOST_CHECK(mytree.insert(two));
    BOOST_CHECK(mytree.insert(three));

    BOOST_CHECK_EQUAL(mytree.get(0), zero);
    BOOST_CHECK_EQUAL(mytree.get(1), one);
    BOOST_CHECK_EQUAL(mytree.get(2), two);
    BOOST_CHECK_EQUAL(mytree.get(3), three);

    // Check extreme values.
    using SK = typename std::make_signed<K>::type;
    K maxsk = std::numeric_limits<SK>::max();
    K minsk = std::numeric_limits<SK>::min();
    using UK = typename std::make_unsigned<K>::type;
    K maxuk = std::numeric_limits<UK>::max();

    auto maxsigned = RCUPtr<E>::make(maxsk);
    auto minsigned = RCUPtr<E>::make(minsk);
    auto minusone = RCUPtr<E>::make(maxuk);
    auto minustwo = RCUPtr<E>::make(maxuk - 1);

    // Check that they are not in the tree.
    BOOST_CHECK_EQUAL(mytree.get(maxsk), NULLPTR(E));
    BOOST_CHECK_EQUAL(mytree.get(minsk), NULLPTR(E));
    BOOST_CHECK_EQUAL(mytree.get(maxuk), NULLPTR(E));
    BOOST_CHECK_EQUAL(mytree.get(maxuk - 1), NULLPTR(E));

    // Insert into the tree.
    BOOST_CHECK(mytree.insert(maxsigned));
    BOOST_CHECK(mytree.insert(minsigned));
    BOOST_CHECK(mytree.insert(minusone));
    BOOST_CHECK(mytree.insert(minustwo));

    // And now they all are in the tree.
    BOOST_CHECK_EQUAL(mytree.get(0), zero);
    BOOST_CHECK_EQUAL(mytree.get(1), one);
    BOOST_CHECK_EQUAL(mytree.get(2), two);
    BOOST_CHECK_EQUAL(mytree.get(3), three);
    BOOST_CHECK_EQUAL(mytree.get(maxsk), maxsigned);
    BOOST_CHECK_EQUAL(mytree.get(minsk), minsigned);
    BOOST_CHECK_EQUAL(mytree.get(maxuk), minusone);
    BOOST_CHECK_EQUAL(mytree.get(maxuk - 1), minustwo);
}

BOOST_AUTO_TEST_CASE(get_test) {
    testGet<int32_t>();
    testGet<uint32_t>();
    testGet<int64_t>();
    testGet<uint64_t>();
}

template <typename K> void testRemove() {
    using E = TestElement<K>;
    RadixTree<E> mytree;

    auto zero = RCUPtr<E>::make(0);
    auto one = RCUPtr<E>::make(1);
    auto two = RCUPtr<E>::make(2);
    auto three = RCUPtr<E>::make(3);

    // Removing an element that isn't in the tree returns false.
    BOOST_CHECK(!mytree.remove(1));

    // Insert an element into the tree and check you can remove it.
    BOOST_CHECK(mytree.insert(one));
    BOOST_CHECK(mytree.remove(1));
    BOOST_CHECK_EQUAL(mytree.get(1), NULLPTR(E));

    // Insert several elements and remove them.
    BOOST_CHECK(mytree.insert(zero));
    BOOST_CHECK(mytree.insert(one));
    BOOST_CHECK(mytree.insert(two));
    BOOST_CHECK(mytree.insert(three));

    BOOST_CHECK(mytree.remove(0));
    BOOST_CHECK(mytree.remove(1));
    BOOST_CHECK(mytree.remove(2));
    BOOST_CHECK(mytree.remove(3));

    BOOST_CHECK_EQUAL(mytree.get(0), NULLPTR(E));
    BOOST_CHECK_EQUAL(mytree.get(1), NULLPTR(E));
    BOOST_CHECK_EQUAL(mytree.get(2), NULLPTR(E));
    BOOST_CHECK_EQUAL(mytree.get(3), NULLPTR(E));

    // Once the elements are removed, removing them again returns false.
    BOOST_CHECK(!mytree.remove(0));
    BOOST_CHECK(!mytree.remove(1));
    BOOST_CHECK(!mytree.remove(2));
    BOOST_CHECK(!mytree.remove(3));

    // Check extreme values.
    using SK = typename std::make_signed<K>::type;
    K maxsk = std::numeric_limits<SK>::max();
    K minsk = std::numeric_limits<SK>::min();
    using UK = typename std::make_unsigned<K>::type;
    K maxuk = std::numeric_limits<UK>::max();

    auto maxsigned = RCUPtr<E>::make(maxsk);
    auto minsigned = RCUPtr<E>::make(minsk);
    auto minusone = RCUPtr<E>::make(maxuk);
    auto minustwo = RCUPtr<E>::make(maxuk - 1);

    // Insert them all.
    BOOST_CHECK(mytree.insert(zero));
    BOOST_CHECK(mytree.insert(one));
    BOOST_CHECK(mytree.insert(two));
    BOOST_CHECK(mytree.insert(three));
    BOOST_CHECK(mytree.insert(maxsigned));
    BOOST_CHECK(mytree.insert(minsigned));
    BOOST_CHECK(mytree.insert(minusone));
    BOOST_CHECK(mytree.insert(minustwo));

    // Delete them all
    BOOST_CHECK(mytree.remove(0));
    BOOST_CHECK(mytree.remove(1));
    BOOST_CHECK(mytree.remove(2));
    BOOST_CHECK(mytree.remove(3));
    BOOST_CHECK(mytree.remove(maxsk));
    BOOST_CHECK(mytree.remove(minsk));
    BOOST_CHECK(mytree.remove(maxuk));
    BOOST_CHECK(mytree.remove(maxuk - 1));

    BOOST_CHECK_EQUAL(mytree.get(0), NULLPTR(E));
    BOOST_CHECK_EQUAL(mytree.get(1), NULLPTR(E));
    BOOST_CHECK_EQUAL(mytree.get(2), NULLPTR(E));
    BOOST_CHECK_EQUAL(mytree.get(3), NULLPTR(E));
    BOOST_CHECK_EQUAL(mytree.get(maxsk), NULLPTR(E));
    BOOST_CHECK_EQUAL(mytree.get(minsk), NULLPTR(E));
    BOOST_CHECK_EQUAL(mytree.get(maxuk), NULLPTR(E));
    BOOST_CHECK_EQUAL(mytree.get(maxuk - 1), NULLPTR(E));
}

BOOST_AUTO_TEST_CASE(remove_test) {
    testRemove<int32_t>();
    testRemove<uint32_t>();
    testRemove<int64_t>();
    testRemove<uint64_t>();
}

BOOST_AUTO_TEST_CASE(const_element_test) {
    using C = const TestElement<uint64_t>;
    RadixTree<C> mytree;

    BOOST_CHECK(mytree.insert(RCUPtr<C>::make(0)));
    BOOST_CHECK(mytree.insert(RCUPtr<C>::make(1)));
    BOOST_CHECK(mytree.insert(RCUPtr<C>::make(2)));
    BOOST_CHECK(mytree.insert(RCUPtr<C>::make(3)));

    BOOST_CHECK(!mytree.insert(RCUPtr<C>::make(0)));
    BOOST_CHECK(!mytree.insert(RCUPtr<C>::make(1)));
    BOOST_CHECK(!mytree.insert(RCUPtr<C>::make(2)));
    BOOST_CHECK(!mytree.insert(RCUPtr<C>::make(3)));

    BOOST_CHECK(mytree.get(0));
    BOOST_CHECK(mytree.get(1));
    BOOST_CHECK(mytree.get(2));
    BOOST_CHECK(mytree.get(3));

    BOOST_CHECK(mytree.remove(0));
    BOOST_CHECK(mytree.remove(1));
    BOOST_CHECK(mytree.remove(2));
    BOOST_CHECK(mytree.remove(3));

    BOOST_CHECK(!mytree.get(0));
    BOOST_CHECK(!mytree.get(1));
    BOOST_CHECK(!mytree.get(2));
    BOOST_CHECK(!mytree.get(3));

    BOOST_CHECK(!mytree.remove(0));
    BOOST_CHECK(!mytree.remove(1));
    BOOST_CHECK(!mytree.remove(2));
    BOOST_CHECK(!mytree.remove(3));
}

void CheckConstTree(const RadixTree<TestElement<uint64_t>> &mytree,
                    bool expected) {
    BOOST_CHECK_EQUAL(!!mytree.get(0), expected);
    BOOST_CHECK_EQUAL(!!mytree.get(1), expected);
    BOOST_CHECK_EQUAL(!!mytree.get(2), expected);
    BOOST_CHECK_EQUAL(!!mytree.get(3), expected);
}

BOOST_AUTO_TEST_CASE(const_tree_test) {
    using E = TestElement<uint64_t>;
    RadixTree<E> mytree;

    CheckConstTree(mytree, false);

    BOOST_CHECK(mytree.insert(RCUPtr<E>::make(0)));
    BOOST_CHECK(mytree.insert(RCUPtr<E>::make(1)));
    BOOST_CHECK(mytree.insert(RCUPtr<E>::make(2)));
    BOOST_CHECK(mytree.insert(RCUPtr<E>::make(3)));

    CheckConstTree(mytree, true);

    BOOST_CHECK(mytree.remove(0));
    BOOST_CHECK(mytree.remove(1));
    BOOST_CHECK(mytree.remove(2));
    BOOST_CHECK(mytree.remove(3));

    CheckConstTree(mytree, false);
}

BOOST_AUTO_TEST_CASE(test_cow) {
    using E = TestElement<uint32_t>;

    RadixTree<E> mytree;

    BOOST_CHECK(mytree.insert(RCUPtr<E>::make(0)));
    BOOST_CHECK(mytree.insert(RCUPtr<E>::make(1)));
    BOOST_CHECK(mytree.insert(RCUPtr<E>::make(2)));
    BOOST_CHECK(mytree.insert(RCUPtr<E>::make(3)));

    RadixTree<E> copyTree = mytree;

    // The copy tree is identical.
    BOOST_CHECK(copyTree.get(0));
    BOOST_CHECK(copyTree.get(1));
    BOOST_CHECK(copyTree.get(2));
    BOOST_CHECK(copyTree.get(3));

    BOOST_CHECK(mytree.insert(RCUPtr<E>::make(90)));
    BOOST_CHECK(mytree.insert(RCUPtr<E>::make(91)));
    BOOST_CHECK(mytree.insert(RCUPtr<E>::make(92)));
    BOOST_CHECK(mytree.insert(RCUPtr<E>::make(93)));

    // The copy was unaffected.
    BOOST_CHECK(copyTree.get(0));
    BOOST_CHECK(copyTree.get(1));
    BOOST_CHECK(copyTree.get(2));
    BOOST_CHECK(copyTree.get(3));
    BOOST_CHECK(!copyTree.get(90));
    BOOST_CHECK(!copyTree.get(91));
    BOOST_CHECK(!copyTree.get(92));
    BOOST_CHECK(!copyTree.get(93));

    copyTree = mytree;

    BOOST_CHECK(mytree.remove(0));
    BOOST_CHECK(mytree.remove(1));
    BOOST_CHECK(mytree.remove(2));
    BOOST_CHECK(mytree.remove(3));

    // The copy was unaffected by the removals.
    BOOST_CHECK(copyTree.get(0));
    BOOST_CHECK(copyTree.get(1));
    BOOST_CHECK(copyTree.get(2));
    BOOST_CHECK(copyTree.get(3));
    BOOST_CHECK(copyTree.get(90));
    BOOST_CHECK(copyTree.get(91));
    BOOST_CHECK(copyTree.get(92));
    BOOST_CHECK(copyTree.get(93));
}

BOOST_AUTO_TEST_CASE(test_move) {
    using E = TestElement<uint32_t>;

    RadixTree<E> mytree;

    BOOST_CHECK(mytree.insert(RCUPtr<E>::make(0)));
    BOOST_CHECK(mytree.insert(RCUPtr<E>::make(1)));
    BOOST_CHECK(mytree.insert(RCUPtr<E>::make(2)));
    BOOST_CHECK(mytree.insert(RCUPtr<E>::make(3)));

    RadixTree<E> movedTree = std::move(mytree);

    BOOST_CHECK(!mytree.remove(0));
    BOOST_CHECK(!mytree.remove(1));
    BOOST_CHECK(!mytree.remove(2));
    BOOST_CHECK(!mytree.remove(3));

    BOOST_CHECK(movedTree.remove(0));
    BOOST_CHECK(movedTree.remove(1));
    BOOST_CHECK(movedTree.remove(2));
    BOOST_CHECK(movedTree.remove(3));
}

#define THREADS 128
#define ELEMENTS 65536

BOOST_AUTO_TEST_CASE(insert_stress_test) {
    using E = TestElement<uint32_t>;

    RadixTree<E> mytree;
    std::atomic<uint32_t> success{0};
    std::vector<std::thread> threads;

    for (int i = 0; i < THREADS; i++) {
        threads.push_back(std::thread([&] {
            MMIXLinearCongruentialGenerator lcg;
            for (int j = 0; j < ELEMENTS; j++) {
                uint32_t v = lcg.next();

                if (mytree.remove(v)) {
                    success--;
                    std::this_thread::yield();
                }

                auto ptr = RCUPtr<E>::make(v);
                if (mytree.insert(ptr)) {
                    success++;
                    std::this_thread::yield();
                }

                if (mytree.remove(v)) {
                    success--;
                    std::this_thread::yield();
                }

                if (mytree.insert(ptr)) {
                    success++;
                    std::this_thread::yield();
                }
            }
        }));
    }

    // Wait for all the threads to finish.
    for (std::thread &t : threads) {
        t.join();
    }

    BOOST_CHECK_EQUAL(success.load(), ELEMENTS);

    // All the elements have been inserted into the tree.
    MMIXLinearCongruentialGenerator lcg;
    for (int i = 0; i < ELEMENTS; i++) {
        uint32_t v = lcg.next();
        BOOST_CHECK_EQUAL(mytree.get(v)->getId(), v);
        auto ptr = RCUPtr<E>::make(v);
        BOOST_CHECK(!mytree.insert(ptr));
        BOOST_CHECK(mytree.get(v) != ptr);
    }

    // Cleanup after ourselves.
    RCULock::synchronize();
}

BOOST_AUTO_TEST_CASE(tree_traversal) {
    using E = TestElement<uint32_t>;

    RadixTree<E> mytree;

    // Build a vector of elements in ascending key order
    std::vector<RCUPtr<E>> elements;
    elements.reserve(ELEMENTS);
    for (uint32_t i = 0; i < ELEMENTS; i++) {
        auto ptr = RCUPtr<E>::make(i);
        elements.push_back(std::move(ptr));
    }

    // Insert in random order
    auto randomizedElements = elements;
    Shuffle(randomizedElements.begin(), randomizedElements.end(),
            FastRandomContext());
    for (auto &element : randomizedElements) {
        BOOST_CHECK(mytree.insert(element));
    }

    // Check the tree is traversed in ascending key order
    size_t count = 0;
    mytree.forEachLeaf([&](RCUPtr<E> ptr) {
        // This test assumes the key is equal to the value
        BOOST_CHECK_EQUAL(ptr->getId(), count);
        BOOST_CHECK_EQUAL(ptr, elements[count++]);
    });

    // All the elements are parsed
    BOOST_CHECK_EQUAL(count, ELEMENTS);
}

BOOST_AUTO_TEST_SUITE_END()
