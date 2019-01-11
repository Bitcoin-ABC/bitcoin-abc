// Copyright (c) 2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <radix.h>

#include <test/test_bitcoin.h>

#include <boost/test/unit_test.hpp>

#include <limits>
#include <type_traits>

BOOST_FIXTURE_TEST_SUITE(radix_tests, BasicTestingSetup)

/**
 * Version of Boost::test prior to 1.64 have issues when dealing with nullptr_t.
 * In order to work around this, we ensure that the null pointers are typed in a
 * way that Boost will like better.
 *
 * TODO: Use nullptr directly once the minimum version of boost is 1.64 or more.
 */
#define NULLPTR(T) static_cast<T *>(nullptr)

template <typename K> struct TestElement {
    K key;

    TestElement(K keyIn) : key(keyIn) {}
    const K &getId() const { return key; }
};

template <typename K> void testInsert() {
    typedef TestElement<K> E;
    RadixTree<E> mytree;

    E zero(0);
    E one(1);
    E two(2);
    E three(3);

    // Inserting a new element into the tree returns true.
    BOOST_CHECK(mytree.insert(&one));

    // Inserting an element already in the tree returns false.
    BOOST_CHECK(!mytree.insert(&one));

    // Let's insert more elements and check behavior stays consistent.
    BOOST_CHECK(mytree.insert(&zero));
    BOOST_CHECK(!mytree.insert(&one));
    BOOST_CHECK(mytree.insert(&two));
    BOOST_CHECK(mytree.insert(&three));
    BOOST_CHECK(!mytree.insert(&zero));
    BOOST_CHECK(!mytree.insert(&one));
    BOOST_CHECK(!mytree.insert(&two));
    BOOST_CHECK(!mytree.insert(&three));

    // Check extreme values.
    typedef typename std::make_signed<K>::type SK;
    E maxsigned(std::numeric_limits<SK>::max());
    E minsigned(std::numeric_limits<SK>::min());
    typedef typename std::make_unsigned<K>::type UK;
    E minusone(std::numeric_limits<UK>::max());
    E minustwo(std::numeric_limits<UK>::max() - 1);

    // Insert them into the tree.
    BOOST_CHECK(mytree.insert(&maxsigned));
    BOOST_CHECK(mytree.insert(&minsigned));
    BOOST_CHECK(mytree.insert(&minusone));
    BOOST_CHECK(mytree.insert(&minustwo));

    // All elements are now in the tree.
    BOOST_CHECK(!mytree.insert(&zero));
    BOOST_CHECK(!mytree.insert(&one));
    BOOST_CHECK(!mytree.insert(&two));
    BOOST_CHECK(!mytree.insert(&three));
    BOOST_CHECK(!mytree.insert(&maxsigned));
    BOOST_CHECK(!mytree.insert(&minsigned));
    BOOST_CHECK(!mytree.insert(&minusone));
    BOOST_CHECK(!mytree.insert(&minustwo));
}

BOOST_AUTO_TEST_CASE(insert_test) {
    testInsert<int32_t>();
    testInsert<uint32_t>();
    testInsert<int64_t>();
    testInsert<uint64_t>();
}

template <typename K> void testGet() {
    typedef TestElement<K> E;
    RadixTree<E> mytree;

    E zero(0);
    E one(1);
    E two(2);
    E three(3);

    // There are no elements in the tree so far.
    BOOST_CHECK_EQUAL(mytree.get(1), NULLPTR(E));

    // Insert an element into the tree and check it is there.
    BOOST_CHECK(mytree.insert(&one));
    BOOST_CHECK_EQUAL(mytree.get(1), &one);

    // Let's insert more elements and check they are recovered properly.
    BOOST_CHECK_EQUAL(mytree.get(0), NULLPTR(E));
    BOOST_CHECK(mytree.insert(&zero));
    BOOST_CHECK_EQUAL(mytree.get(0), &zero);
    BOOST_CHECK_EQUAL(mytree.get(1), &one);

    // More elements.
    BOOST_CHECK_EQUAL(mytree.get(2), NULLPTR(E));
    BOOST_CHECK_EQUAL(mytree.get(3), NULLPTR(E));
    BOOST_CHECK(mytree.insert(&two));
    BOOST_CHECK(mytree.insert(&three));

    BOOST_CHECK_EQUAL(mytree.get(0), &zero);
    BOOST_CHECK_EQUAL(mytree.get(1), &one);
    BOOST_CHECK_EQUAL(mytree.get(2), &two);
    BOOST_CHECK_EQUAL(mytree.get(3), &three);

    // Check extreme values.
    typedef typename std::make_signed<K>::type SK;
    K maxsk = std::numeric_limits<SK>::max();
    K minsk = std::numeric_limits<SK>::min();
    typedef typename std::make_unsigned<K>::type UK;
    K maxuk = std::numeric_limits<UK>::max();

    E maxsigned(maxsk);
    E minsigned(minsk);
    E minusone(maxuk);
    E minustwo(maxuk - 1);

    // Check that they are not in the tree.
    BOOST_CHECK_EQUAL(mytree.get(maxsk), NULLPTR(E));
    BOOST_CHECK_EQUAL(mytree.get(minsk), NULLPTR(E));
    BOOST_CHECK_EQUAL(mytree.get(maxuk), NULLPTR(E));
    BOOST_CHECK_EQUAL(mytree.get(maxuk - 1), NULLPTR(E));

    // Insert into the tree.
    BOOST_CHECK(mytree.insert(&maxsigned));
    BOOST_CHECK(mytree.insert(&minsigned));
    BOOST_CHECK(mytree.insert(&minusone));
    BOOST_CHECK(mytree.insert(&minustwo));

    // And now they all are in the tree.
    BOOST_CHECK_EQUAL(mytree.get(0), &zero);
    BOOST_CHECK_EQUAL(mytree.get(1), &one);
    BOOST_CHECK_EQUAL(mytree.get(2), &two);
    BOOST_CHECK_EQUAL(mytree.get(3), &three);
    BOOST_CHECK_EQUAL(mytree.get(maxsk), &maxsigned);
    BOOST_CHECK_EQUAL(mytree.get(minsk), &minsigned);
    BOOST_CHECK_EQUAL(mytree.get(maxuk), &minusone);
    BOOST_CHECK_EQUAL(mytree.get(maxuk - 1), &minustwo);
}

BOOST_AUTO_TEST_CASE(get_test) {
    testGet<int32_t>();
    testGet<uint32_t>();
    testGet<int64_t>();
    testGet<uint64_t>();
}

#define THREADS 128
#define ELEMENTS 65536

static uint64_t next(uint64_t x) {
    // Simple linear congruential generator by Donald Knuth.
    return x * 6364136223846793005 + 1442695040888963407;
}

BOOST_AUTO_TEST_CASE(insert_stress_test) {
    typedef TestElement<uint32_t> E;

    RadixTree<E> mytree;
    std::atomic<uint32_t> success{0};
    std::vector<std::thread> threads;

    for (int i = 0; i < THREADS; i++) {
        threads.push_back(std::thread([&] {
            uint64_t rand = 0;
            for (int j = 0; j < ELEMENTS; j++) {
                rand = next(rand);
                uint32_t v(rand >> 32);
                std::unique_ptr<E> ptr = MakeUnique<E>(v);
                if (mytree.insert(ptr.get())) {
                    success++;
                    ptr.release();
                    std::this_thread::yield();
                }

                // Regardless if we inserted or someone else did, the element
                // should now be in the tree. For some reason, boost is spewing
                // an inordinate amount of log when performing checks in other
                // threads than the main one, so we'll use asserts.
                assert(mytree.get(v)->getId() == v);
            }
        }));
    }

    // Wait for all the threads to finish.
    for (std::thread &t : threads) {
        t.join();
    }

    BOOST_CHECK_EQUAL(success.load(), ELEMENTS);

    // All the elements have been inserted into the tree.
    uint64_t rand = 0;
    for (int i = 0; i < ELEMENTS; i++) {
        rand = next(rand);
        uint32_t v(rand >> 32);
        BOOST_CHECK_EQUAL(mytree.get(v)->getId(), v);
        E e(v);
        BOOST_CHECK(!mytree.insert(&e));
        BOOST_CHECK(mytree.get(v) != &e);
    }
}

BOOST_AUTO_TEST_SUITE_END()
