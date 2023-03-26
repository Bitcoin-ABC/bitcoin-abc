// Copyright (c) 2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <radix.h>

#include <arith_uint256.h>
#include <uint256.h>
#include <uint256radixkey.h>
#include <util/strencodings.h>

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

template <typename K> struct TestElementInt : TestElement<K> {
    TestElementInt(K keyIn) : TestElement<K>(std::move(keyIn)) {}

    static auto SignedMin() {
        return std::numeric_limits<typename std::make_signed<K>::type>::min();
    }
    static auto SignedMax() {
        return std::numeric_limits<typename std::make_signed<K>::type>::max();
    }
    static auto MinusOne() {
        return std::numeric_limits<typename std::make_unsigned<K>::type>::max();
    }
    static auto MinusTwo() {
        return std::numeric_limits<
                   typename std::make_unsigned<K>::type>::max() -
               1;
    }
};

struct TestElementUint256 : TestElement<Uint256RadixKey> {
    TestElementUint256(const uint256 &keyIn)
        : TestElement<Uint256RadixKey>(Uint256RadixKey(keyIn)) {}
    TestElementUint256(uint64_t keyIn)
        : TestElement<Uint256RadixKey>(Uint256RadixKey(keyIn)) {}

    static inline arith_uint256 signedMin = arith_uint256(1) << 255;
    static inline arith_uint256 signedMax = ~signedMin;
    static inline arith_uint256 minusOne = arith_uint256(0) - 1;
    static inline arith_uint256 minusTwo = minusOne - 1;

    static uint256 SignedMin() { return ArithToUint256(signedMin); }
    static uint256 SignedMax() { return ArithToUint256(signedMax); }
    static uint256 MinusOne() { return ArithToUint256(minusOne); }
    static uint256 MinusTwo() { return ArithToUint256(minusTwo); }
};

template <typename E> void testInsert() {
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
    auto maxsigned = RCUPtr<E>::make(E::SignedMax());
    auto minsigned = RCUPtr<E>::make(E::SignedMin());
    auto minusone = RCUPtr<E>::make(E::MinusOne());
    auto minustwo = RCUPtr<E>::make(E::MinusTwo());

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
    testInsert<TestElementInt<int32_t>>();
    testInsert<TestElementInt<uint32_t>>();
    testInsert<TestElementInt<int64_t>>();
    testInsert<TestElementInt<uint64_t>>();

    testInsert<TestElementUint256>();
}

template <typename E> void testGet() {
    RadixTree<E> mytree;

    auto zero = RCUPtr<E>::make(0);
    auto one = RCUPtr<E>::make(1);
    auto two = RCUPtr<E>::make(2);
    auto three = RCUPtr<E>::make(3);

    auto keyZero = zero->getId();
    auto keyOne = one->getId();
    auto keyTwo = two->getId();
    auto keyThree = three->getId();

    // There are no elements in the tree so far.
    BOOST_CHECK_EQUAL(mytree.get(keyOne), nullptr);

    // Insert an element into the tree and check it is there.
    BOOST_CHECK(mytree.insert(one));
    BOOST_CHECK_EQUAL(mytree.get(keyOne), one);

    // Let's insert more elements and check they are recovered properly.
    BOOST_CHECK_EQUAL(mytree.get(keyZero), nullptr);
    BOOST_CHECK(mytree.insert(zero));
    BOOST_CHECK_EQUAL(mytree.get(keyZero), zero);
    BOOST_CHECK_EQUAL(mytree.get(keyOne), one);

    // More elements.
    BOOST_CHECK_EQUAL(mytree.get(keyTwo), nullptr);
    BOOST_CHECK_EQUAL(mytree.get(keyThree), nullptr);
    BOOST_CHECK(mytree.insert(two));
    BOOST_CHECK(mytree.insert(three));

    BOOST_CHECK_EQUAL(mytree.get(keyZero), zero);
    BOOST_CHECK_EQUAL(mytree.get(keyOne), one);
    BOOST_CHECK_EQUAL(mytree.get(keyTwo), two);
    BOOST_CHECK_EQUAL(mytree.get(keyThree), three);

    auto maxsigned = RCUPtr<E>::make(E::SignedMax());
    auto minsigned = RCUPtr<E>::make(E::SignedMin());
    auto minusone = RCUPtr<E>::make(E::MinusOne());
    auto minustwo = RCUPtr<E>::make(E::MinusTwo());

    // Check that they are not in the tree.
    BOOST_CHECK_EQUAL(mytree.get(E::SignedMax()), nullptr);
    BOOST_CHECK_EQUAL(mytree.get(E::SignedMin()), nullptr);
    BOOST_CHECK_EQUAL(mytree.get(E::MinusOne()), nullptr);
    BOOST_CHECK_EQUAL(mytree.get(E::MinusTwo()), nullptr);

    // Insert into the tree.
    BOOST_CHECK(mytree.insert(maxsigned));
    BOOST_CHECK(mytree.insert(minsigned));
    BOOST_CHECK(mytree.insert(minusone));
    BOOST_CHECK(mytree.insert(minustwo));

    // And now they all are in the tree.
    BOOST_CHECK_EQUAL(mytree.get(keyZero), zero);
    BOOST_CHECK_EQUAL(mytree.get(keyOne), one);
    BOOST_CHECK_EQUAL(mytree.get(keyTwo), two);
    BOOST_CHECK_EQUAL(mytree.get(keyThree), three);
    BOOST_CHECK_EQUAL(mytree.get(E::SignedMax()), maxsigned);
    BOOST_CHECK_EQUAL(mytree.get(E::SignedMin()), minsigned);
    BOOST_CHECK_EQUAL(mytree.get(E::MinusOne()), minusone);
    BOOST_CHECK_EQUAL(mytree.get(E::MinusTwo()), minustwo);
}

BOOST_AUTO_TEST_CASE(get_test) {
    testGet<TestElementInt<int32_t>>();
    testGet<TestElementInt<uint32_t>>();
    testGet<TestElementInt<int64_t>>();
    testGet<TestElementInt<uint64_t>>();

    testGet<TestElementUint256>();
}

template <typename E> void testRemove() {
    RadixTree<E> mytree;

    auto zero = RCUPtr<E>::make(0);
    auto one = RCUPtr<E>::make(1);
    auto two = RCUPtr<E>::make(2);
    auto three = RCUPtr<E>::make(3);

    auto keyZero = zero->getId();
    auto keyOne = one->getId();
    auto keyTwo = two->getId();
    auto keyThree = three->getId();

    // Removing an element that isn't in the tree returns false.
    BOOST_CHECK(!mytree.remove(keyOne));

    // Insert an element into the tree and check you can remove it.
    BOOST_CHECK(mytree.insert(one));
    BOOST_CHECK(mytree.remove(keyOne));
    BOOST_CHECK_EQUAL(mytree.get(keyOne), nullptr);

    // Insert several elements and remove them.
    BOOST_CHECK(mytree.insert(zero));
    BOOST_CHECK(mytree.insert(one));
    BOOST_CHECK(mytree.insert(two));
    BOOST_CHECK(mytree.insert(three));

    BOOST_CHECK(mytree.remove(keyZero));
    BOOST_CHECK(mytree.remove(keyOne));
    BOOST_CHECK(mytree.remove(keyTwo));
    BOOST_CHECK(mytree.remove(keyThree));

    BOOST_CHECK_EQUAL(mytree.get(keyZero), nullptr);
    BOOST_CHECK_EQUAL(mytree.get(keyOne), nullptr);
    BOOST_CHECK_EQUAL(mytree.get(keyTwo), nullptr);
    BOOST_CHECK_EQUAL(mytree.get(keyThree), nullptr);

    // Once the elements are removed, removing them again returns false.
    BOOST_CHECK(!mytree.remove(keyZero));
    BOOST_CHECK(!mytree.remove(keyOne));
    BOOST_CHECK(!mytree.remove(keyTwo));
    BOOST_CHECK(!mytree.remove(keyThree));

    // Check extreme values.
    auto maxsigned = RCUPtr<E>::make(E::SignedMax());
    auto minsigned = RCUPtr<E>::make(E::SignedMin());
    auto minusone = RCUPtr<E>::make(E::MinusOne());
    auto minustwo = RCUPtr<E>::make(E::MinusTwo());

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
    BOOST_CHECK(mytree.remove(keyZero));
    BOOST_CHECK(mytree.remove(keyOne));
    BOOST_CHECK(mytree.remove(keyTwo));
    BOOST_CHECK(mytree.remove(keyThree));
    BOOST_CHECK(mytree.remove(E::SignedMax()));
    BOOST_CHECK(mytree.remove(E::SignedMin()));
    BOOST_CHECK(mytree.remove(E::MinusOne()));
    BOOST_CHECK(mytree.remove(E::MinusTwo()));

    BOOST_CHECK_EQUAL(mytree.get(keyZero), nullptr);
    BOOST_CHECK_EQUAL(mytree.get(keyOne), nullptr);
    BOOST_CHECK_EQUAL(mytree.get(keyTwo), nullptr);
    BOOST_CHECK_EQUAL(mytree.get(keyThree), nullptr);
    BOOST_CHECK_EQUAL(mytree.get(E::SignedMax()), nullptr);
    BOOST_CHECK_EQUAL(mytree.get(E::SignedMin()), nullptr);
    BOOST_CHECK_EQUAL(mytree.get(E::MinusOne()), nullptr);
    BOOST_CHECK_EQUAL(mytree.get(E::MinusTwo()), nullptr);
}

BOOST_AUTO_TEST_CASE(remove_test) {
    testRemove<TestElementInt<int32_t>>();
    testRemove<TestElementInt<uint32_t>>();
    testRemove<TestElementInt<int64_t>>();
    testRemove<TestElementInt<uint64_t>>();

    testRemove<TestElementUint256>();
}

BOOST_AUTO_TEST_CASE(const_element_test) {
    using C = const TestElementInt<uint64_t>;
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

void CheckConstTree(const RadixTree<TestElementInt<uint64_t>> &mytree,
                    bool expected) {
    BOOST_CHECK_EQUAL(!!mytree.get(0), expected);
    BOOST_CHECK_EQUAL(!!mytree.get(1), expected);
    BOOST_CHECK_EQUAL(!!mytree.get(2), expected);
    BOOST_CHECK_EQUAL(!!mytree.get(3), expected);
}

BOOST_AUTO_TEST_CASE(const_tree_test) {
    using E = TestElementInt<uint64_t>;
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
    using E = TestElementInt<uint32_t>;

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
    using E = TestElementInt<uint32_t>;

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
    using E = TestElementInt<uint32_t>;

    RadixTree<E> mytree;
    std::atomic<uint32_t> success{0};
    std::vector<std::thread> threads;
    threads.reserve(THREADS);

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
    bool ret = mytree.forEachLeaf([&](RCUPtr<E> ptr) {
        // This test assumes the key is equal to the value
        BOOST_CHECK_EQUAL(ptr->getId(), count);
        BOOST_CHECK_EQUAL(ptr, elements[count++]);

        return true;
    });

    // All the elements are parsed
    BOOST_CHECK_EQUAL(count, ELEMENTS);
    BOOST_CHECK(ret);

    // Check we can stop the traversal when needed
    const size_t stopCount = ELEMENTS / 2;
    count = 0;
    ret = mytree.forEachLeaf([&](RCUPtr<E> ptr) {
        // This test assumes the key is equal to the value
        BOOST_CHECK_EQUAL(ptr->getId(), count);
        BOOST_CHECK_EQUAL(ptr, elements[count++]);

        return count < stopCount;
    });

    BOOST_CHECK_EQUAL(count, stopCount);
    BOOST_CHECK(!ret);
}

BOOST_AUTO_TEST_CASE(uint256_key_wrapper) {
    Uint256RadixKey key = uint256S(
        "AA00000000000000000000000000000000000000000000000000000000000000");

    auto checkEqual = [&](const Uint256RadixKey &val, const uint256 &expected) {
        BOOST_CHECK_EQUAL(ArithToUint256(val.base), expected);
    };

    auto checkOperands = [&](const Uint256RadixKey &val,
                             const uint256 &expected_uint256,
                             const size_t expected_size_t) {
        checkEqual(val, expected_uint256);

        checkEqual(val & Uint256RadixKey(uint256::ZERO), uint256::ZERO);
        checkEqual(val & val, expected_uint256);
        checkEqual(val & TestElementUint256::MinusOne(), expected_uint256);

        BOOST_CHECK_EQUAL(size_t(val), expected_size_t);
    };

    // clang-format off
    checkOperands(key >> 0u,   uint256S("AA00000000000000000000000000000000000000000000000000000000000000"), 0x0000000000000000);
    checkOperands(key >> 1u,   uint256S("5500000000000000000000000000000000000000000000000000000000000000"), 0x0000000000000000);
    checkOperands(key >> 2u,   uint256S("2A80000000000000000000000000000000000000000000000000000000000000"), 0x0000000000000000);
    checkOperands(key >> 3u,   uint256S("1540000000000000000000000000000000000000000000000000000000000000"), 0x0000000000000000);
    checkOperands(key >> 4u,   uint256S("0AA0000000000000000000000000000000000000000000000000000000000000"), 0x0000000000000000);
    checkOperands(key >> 8u,   uint256S("00AA000000000000000000000000000000000000000000000000000000000000"), 0x0000000000000000);
    checkOperands(key >> 16u,  uint256S("0000AA0000000000000000000000000000000000000000000000000000000000"), 0x0000000000000000);
    checkOperands(key >> 24u,  uint256S("000000AA00000000000000000000000000000000000000000000000000000000"), 0x0000000000000000);
    checkOperands(key >> 32u,  uint256S("00000000AA000000000000000000000000000000000000000000000000000000"), 0x0000000000000000);
    checkOperands(key >> 40u,  uint256S("0000000000AA0000000000000000000000000000000000000000000000000000"), 0x0000000000000000);
    checkOperands(key >> 48u,  uint256S("000000000000AA00000000000000000000000000000000000000000000000000"), 0x0000000000000000);
    checkOperands(key >> 56u,  uint256S("00000000000000AA000000000000000000000000000000000000000000000000"), 0x0000000000000000);
    checkOperands(key >> 64u,  uint256S("0000000000000000AA0000000000000000000000000000000000000000000000"), 0x0000000000000000);
    checkOperands(key >> 72u,  uint256S("000000000000000000AA00000000000000000000000000000000000000000000"), 0x0000000000000000);
    checkOperands(key >> 80u,  uint256S("00000000000000000000AA000000000000000000000000000000000000000000"), 0x0000000000000000);
    checkOperands(key >> 88u,  uint256S("0000000000000000000000AA0000000000000000000000000000000000000000"), 0x0000000000000000);
    checkOperands(key >> 96u,  uint256S("000000000000000000000000AA00000000000000000000000000000000000000"), 0x0000000000000000);
    checkOperands(key >> 104u, uint256S("00000000000000000000000000AA000000000000000000000000000000000000"), 0x0000000000000000);
    checkOperands(key >> 112u, uint256S("0000000000000000000000000000AA0000000000000000000000000000000000"), 0x0000000000000000);
    checkOperands(key >> 120u, uint256S("000000000000000000000000000000AA00000000000000000000000000000000"), 0x0000000000000000);
    checkOperands(key >> 128u, uint256S("00000000000000000000000000000000AA000000000000000000000000000000"), 0x0000000000000000);
    checkOperands(key >> 136u, uint256S("0000000000000000000000000000000000AA0000000000000000000000000000"), 0x0000000000000000);
    checkOperands(key >> 144u, uint256S("000000000000000000000000000000000000AA00000000000000000000000000"), 0x0000000000000000);
    checkOperands(key >> 152u, uint256S("00000000000000000000000000000000000000AA000000000000000000000000"), 0x0000000000000000);
    checkOperands(key >> 160u, uint256S("0000000000000000000000000000000000000000AA0000000000000000000000"), 0x0000000000000000);
    checkOperands(key >> 168u, uint256S("000000000000000000000000000000000000000000AA00000000000000000000"), 0x0000000000000000);
    checkOperands(key >> 176u, uint256S("00000000000000000000000000000000000000000000AA000000000000000000"), 0x0000000000000000);
    checkOperands(key >> 184u, uint256S("0000000000000000000000000000000000000000000000AA0000000000000000"), 0x0000000000000000);
    checkOperands(key >> 185u, uint256S("0000000000000000000000000000000000000000000000550000000000000000"), 0x0000000000000000);
    checkOperands(key >> 186u, uint256S("00000000000000000000000000000000000000000000002A8000000000000000"), 0x8000000000000000);
    checkOperands(key >> 192u, uint256S("000000000000000000000000000000000000000000000000AA00000000000000"), 0xAA00000000000000);
    checkOperands(key >> 200u, uint256S("00000000000000000000000000000000000000000000000000AA000000000000"), 0x00AA000000000000);
    checkOperands(key >> 208u, uint256S("0000000000000000000000000000000000000000000000000000AA0000000000"), 0x0000AA0000000000);
    checkOperands(key >> 216u, uint256S("000000000000000000000000000000000000000000000000000000AA00000000"), 0x000000AA00000000);
    checkOperands(key >> 224u, uint256S("00000000000000000000000000000000000000000000000000000000AA000000"), 0x00000000AA000000);
    checkOperands(key >> 232u, uint256S("0000000000000000000000000000000000000000000000000000000000AA0000"), 0x0000000000AA0000);
    checkOperands(key >> 240u, uint256S("000000000000000000000000000000000000000000000000000000000000AA00"), 0x000000000000AA00);
    checkOperands(key >> 248u, uint256S("00000000000000000000000000000000000000000000000000000000000000AA"), 0x00000000000000AA);
    checkOperands(key >> 252u, uint256S("000000000000000000000000000000000000000000000000000000000000000A"), 0x000000000000000A);
    checkOperands(key >> 253u, uint256S("0000000000000000000000000000000000000000000000000000000000000005"), 0x0000000000000005);
    checkOperands(key >> 254u, uint256S("0000000000000000000000000000000000000000000000000000000000000002"), 0x0000000000000002);
    checkOperands(key >> 255u, uint256S("0000000000000000000000000000000000000000000000000000000000000001"), 0x0000000000000001);
    checkOperands(key >> 256u, uint256S("0000000000000000000000000000000000000000000000000000000000000000"), 0x0000000000000000);
    // clang-format on
}

BOOST_AUTO_TEST_CASE(radix_adapter) {
    using E = TestElement<std::string>;

    struct StringKeyAdapter {
        uint64_t getId(const E &e) const {
            uint64_t key;
            BOOST_REQUIRE(ParseUInt64(e.getId(), &key));
            return key;
        }
    };

    RadixTree<E, StringKeyAdapter> mytree;

    auto zero = RCUPtr<E>::make("0");
    auto one = RCUPtr<E>::make("1");
    auto two = RCUPtr<E>::make("2");
    auto three = RCUPtr<E>::make("3");

    // Let's insert some elements
    BOOST_CHECK(mytree.insert(zero));
    BOOST_CHECK(mytree.insert(one));
    BOOST_CHECK(mytree.insert(two));
    BOOST_CHECK(mytree.insert(three));
    BOOST_CHECK(!mytree.insert(zero));
    BOOST_CHECK(!mytree.insert(one));
    BOOST_CHECK(!mytree.insert(two));
    BOOST_CHECK(!mytree.insert(three));

    // Retrieval is done using the converted key
    BOOST_CHECK_EQUAL(mytree.get(0), zero);
    BOOST_CHECK_EQUAL(mytree.get(1), one);
    BOOST_CHECK_EQUAL(mytree.get(2), two);
    BOOST_CHECK_EQUAL(mytree.get(3), three);

    // And so does removal
    BOOST_CHECK(mytree.remove(0));
    BOOST_CHECK(mytree.remove(1));
    BOOST_CHECK(mytree.remove(2));
    BOOST_CHECK(mytree.remove(3));

    BOOST_CHECK(!mytree.get(0));
    BOOST_CHECK(!mytree.get(1));
    BOOST_CHECK(!mytree.get(2));
    BOOST_CHECK(!mytree.get(3));
}

BOOST_AUTO_TEST_SUITE_END()
