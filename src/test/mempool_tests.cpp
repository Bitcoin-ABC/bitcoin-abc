// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <txmempool.h>

#include <policy/policy.h>
#include <reverse_iterator.h>
#include <util/system.h>

#include <test/test_bitcoin.h>

#include <boost/test/unit_test.hpp>

#include <algorithm>
#include <list>
#include <vector>

BOOST_FIXTURE_TEST_SUITE(mempool_tests, TestingSetup)

BOOST_AUTO_TEST_CASE(TestPackageAccounting) {
    CTxMemPool testPool;
    LOCK2(cs_main, testPool.cs);
    TestMemPoolEntryHelper entry;
    CMutableTransaction parentOfAll;

    std::vector<CTxIn> outpoints;
    const size_t maxOutputs = 3;

    // Construct a parent for the rest of the chain
    parentOfAll.vin.resize(1);
    parentOfAll.vin[0].scriptSig = CScript();
    // Give us a couple outpoints so we can spend them
    for (size_t i = 0; i < maxOutputs; i++) {
        parentOfAll.vout.emplace_back(10 * SATOSHI, CScript() << OP_TRUE);
    }
    TxId parentOfAllId = parentOfAll.GetId();
    testPool.addUnchecked(parentOfAllId, entry.FromTx(parentOfAll));

    // Add some outpoints to the tracking vector
    for (size_t i = 0; i < maxOutputs; i++) {
        outpoints.emplace_back(COutPoint(parentOfAllId, i));
    }

    Amount totalFee = Amount::zero();
    size_t totalSize = CTransaction(parentOfAll).GetTotalSize();

    // Generate 100 transactions
    for (size_t totalTransactions = 0; totalTransactions < 100;
         totalTransactions++) {
        CMutableTransaction tx;

        uint64_t minAncestors = std::numeric_limits<size_t>::max();
        uint64_t maxAncestors = 0;
        Amount minFees = MAX_MONEY;
        Amount maxFees = Amount::zero();
        uint64_t minSize = std::numeric_limits<size_t>::max();
        uint64_t maxSize = 0;
        // Consume random inputs, but make sure we don't consume more than
        // available
        for (size_t input = std::min(InsecureRandRange(maxOutputs) + 1,
                                     uint64_t(outpoints.size()));
             input > 0; input--) {
            std::swap(outpoints[InsecureRandRange(outpoints.size())],
                      outpoints.back());
            tx.vin.emplace_back(outpoints.back());
            outpoints.pop_back();

            // We don't know exactly how many ancestors this transaction has
            // due to possible duplicates.  Calculate a valid range based on
            // parents.

            CTxMemPoolEntry parent =
                *testPool.mapTx.find(tx.vin.back().prevout.GetTxId());

            minAncestors =
                std::min(minAncestors, parent.GetCountWithAncestors());
            maxAncestors += parent.GetCountWithAncestors();
            minFees = std::min(minFees, parent.GetModFeesWithAncestors());
            maxFees += parent.GetModFeesWithAncestors();
            minSize = std::min(minSize, parent.GetSizeWithAncestors());
            maxSize += parent.GetSizeWithAncestors();
        }

        // Produce random number of outputs
        for (size_t output = InsecureRandRange(maxOutputs) + 1; output > 0;
             output--) {
            tx.vout.emplace_back(10 * SATOSHI, CScript() << OP_TRUE);
        }

        TxId curId = tx.GetId();

        // Record the outputs
        for (size_t output = tx.vout.size(); output > 0; output--) {
            outpoints.emplace_back(COutPoint(curId, output));
        }

        Amount randFee = int64_t(InsecureRandRange(300)) * SATOSHI;

        testPool.addUnchecked(curId, entry.Fee(randFee).FromTx(tx));

        // Add this transaction to the totals.
        minAncestors += 1;
        maxAncestors += 1;
        minFees += randFee;
        maxFees += randFee;
        minSize += CTransaction(tx).GetTotalSize();
        maxSize += CTransaction(tx).GetTotalSize();

        // Calculate overall values
        totalFee += randFee;
        totalSize += CTransaction(tx).GetTotalSize();
        CTxMemPoolEntry parentEntry = *testPool.mapTx.find(parentOfAllId);
        CTxMemPoolEntry latestEntry = *testPool.mapTx.find(curId);

        // Ensure values are within the expected ranges
        BOOST_CHECK(latestEntry.GetCountWithAncestors() >= minAncestors);
        BOOST_CHECK(latestEntry.GetCountWithAncestors() <= maxAncestors);

        BOOST_CHECK(latestEntry.GetSizeWithAncestors() >= minSize);
        BOOST_CHECK(latestEntry.GetSizeWithAncestors() <= maxSize);

        BOOST_CHECK(latestEntry.GetModFeesWithAncestors() >= minFees);
        BOOST_CHECK(latestEntry.GetModFeesWithAncestors() <= maxFees);

        BOOST_CHECK_EQUAL(parentEntry.GetCountWithDescendants(),
                          testPool.mapTx.size());
        BOOST_CHECK_EQUAL(parentEntry.GetSizeWithDescendants(), totalSize);
        BOOST_CHECK_EQUAL(parentEntry.GetModFeesWithDescendants(), totalFee);
    }
}

BOOST_AUTO_TEST_CASE(MempoolRemoveTest) {
    // Test CTxMemPool::remove functionality

    TestMemPoolEntryHelper entry;
    // Parent transaction with three children, and three grand-children:
    CMutableTransaction txParent;
    txParent.vin.resize(1);
    txParent.vin[0].scriptSig = CScript() << OP_11;
    txParent.vout.resize(3);
    for (int i = 0; i < 3; i++) {
        txParent.vout[i].scriptPubKey = CScript() << OP_11 << OP_EQUAL;
        txParent.vout[i].nValue = 33000 * SATOSHI;
    }
    CMutableTransaction txChild[3];
    for (int i = 0; i < 3; i++) {
        txChild[i].vin.resize(1);
        txChild[i].vin[0].scriptSig = CScript() << OP_11;
        txChild[i].vin[0].prevout = COutPoint(txParent.GetId(), i);
        txChild[i].vout.resize(1);
        txChild[i].vout[0].scriptPubKey = CScript() << OP_11 << OP_EQUAL;
        txChild[i].vout[0].nValue = 11000 * SATOSHI;
    }
    CMutableTransaction txGrandChild[3];
    for (int i = 0; i < 3; i++) {
        txGrandChild[i].vin.resize(1);
        txGrandChild[i].vin[0].scriptSig = CScript() << OP_11;
        txGrandChild[i].vin[0].prevout = COutPoint(txChild[i].GetId(), 0);
        txGrandChild[i].vout.resize(1);
        txGrandChild[i].vout[0].scriptPubKey = CScript() << OP_11 << OP_EQUAL;
        txGrandChild[i].vout[0].nValue = 11000 * SATOSHI;
    }

    CTxMemPool testPool;
    LOCK2(cs_main, testPool.cs);

    // Nothing in pool, remove should do nothing:
    unsigned int poolSize = testPool.size();
    testPool.removeRecursive(CTransaction(txParent));
    BOOST_CHECK_EQUAL(testPool.size(), poolSize);

    // Just the parent:
    testPool.addUnchecked(txParent.GetId(), entry.FromTx(txParent));
    poolSize = testPool.size();
    testPool.removeRecursive(CTransaction(txParent));
    BOOST_CHECK_EQUAL(testPool.size(), poolSize - 1);

    // Parent, children, grandchildren:
    testPool.addUnchecked(txParent.GetId(), entry.FromTx(txParent));
    for (int i = 0; i < 3; i++) {
        testPool.addUnchecked(txChild[i].GetId(), entry.FromTx(txChild[i]));
        testPool.addUnchecked(txGrandChild[i].GetId(),
                              entry.FromTx(txGrandChild[i]));
    }
    // Remove Child[0], GrandChild[0] should be removed:
    poolSize = testPool.size();
    testPool.removeRecursive(CTransaction(txChild[0]));
    BOOST_CHECK_EQUAL(testPool.size(), poolSize - 2);
    // ... make sure grandchild and child are gone:
    poolSize = testPool.size();
    testPool.removeRecursive(CTransaction(txGrandChild[0]));
    BOOST_CHECK_EQUAL(testPool.size(), poolSize);
    poolSize = testPool.size();
    testPool.removeRecursive(CTransaction(txChild[0]));
    BOOST_CHECK_EQUAL(testPool.size(), poolSize);
    // Remove parent, all children/grandchildren should go:
    poolSize = testPool.size();
    testPool.removeRecursive(CTransaction(txParent));
    BOOST_CHECK_EQUAL(testPool.size(), poolSize - 5);
    BOOST_CHECK_EQUAL(testPool.size(), 0UL);

    // Add children and grandchildren, but NOT the parent (simulate the parent
    // being in a block)
    for (int i = 0; i < 3; i++) {
        testPool.addUnchecked(txChild[i].GetId(), entry.FromTx(txChild[i]));
        testPool.addUnchecked(txGrandChild[i].GetId(),
                              entry.FromTx(txGrandChild[i]));
    }

    // Now remove the parent, as might happen if a block-re-org occurs but the
    // parent cannot be put into the mempool (maybe because it is non-standard):
    poolSize = testPool.size();
    testPool.removeRecursive(CTransaction(txParent));
    BOOST_CHECK_EQUAL(testPool.size(), poolSize - 6);
    BOOST_CHECK_EQUAL(testPool.size(), 0UL);
}

BOOST_AUTO_TEST_CASE(MempoolClearTest) {
    // Test CTxMemPool::clear functionality

    TestMemPoolEntryHelper entry;
    // Create a transaction
    CMutableTransaction txParent;
    txParent.vin.resize(1);
    txParent.vin[0].scriptSig = CScript() << OP_11;
    txParent.vout.resize(3);
    for (int i = 0; i < 3; i++) {
        txParent.vout[i].scriptPubKey = CScript() << OP_11 << OP_EQUAL;
        txParent.vout[i].nValue = 33000 * SATOSHI;
    }

    CTxMemPool testPool;
    LOCK2(cs_main, testPool.cs);

    // Nothing in pool, clear should do nothing:
    testPool.clear();
    BOOST_CHECK_EQUAL(testPool.size(), 0UL);

    // Add the transaction
    testPool.addUnchecked(txParent.GetId(), entry.FromTx(txParent));
    BOOST_CHECK_EQUAL(testPool.size(), 1UL);
    BOOST_CHECK_EQUAL(testPool.mapTx.size(), 1UL);
    BOOST_CHECK_EQUAL(testPool.mapNextTx.size(), 1UL);
    BOOST_CHECK_EQUAL(testPool.vTxHashes.size(), 1UL);

    // CTxMemPool's members should be empty after a clear
    testPool.clear();
    BOOST_CHECK_EQUAL(testPool.size(), 0UL);
    BOOST_CHECK_EQUAL(testPool.mapTx.size(), 0UL);
    BOOST_CHECK_EQUAL(testPool.mapNextTx.size(), 0UL);
    BOOST_CHECK_EQUAL(testPool.vTxHashes.size(), 0UL);
}

template <typename name>
static void CheckSort(CTxMemPool &pool, std::vector<std::string> &sortedOrder,
                      const std::string &testcase)
    EXCLUSIVE_LOCKS_REQUIRED(pool.cs) {
    BOOST_CHECK_EQUAL(pool.size(), sortedOrder.size());
    typename CTxMemPool::indexed_transaction_set::index<name>::type::iterator
        it = pool.mapTx.get<name>().begin();
    int count = 0;
    for (; it != pool.mapTx.get<name>().end(); ++it, ++count) {
        BOOST_CHECK_MESSAGE(it->GetTx().GetId().ToString() ==
                                sortedOrder[count],
                            it->GetTx().GetId().ToString()
                                << " != " << sortedOrder[count] << " in test "
                                << testcase << ":" << count);
    }
}

BOOST_AUTO_TEST_CASE(MempoolIndexingTest) {
    CTxMemPool pool;
    LOCK2(cs_main, pool.cs);
    TestMemPoolEntryHelper entry;

    /* 3rd highest fee */
    CMutableTransaction tx1 = CMutableTransaction();
    tx1.vout.resize(1);
    tx1.vout[0].scriptPubKey = CScript() << OP_11 << OP_EQUAL;
    tx1.vout[0].nValue = 10 * COIN;
    pool.addUnchecked(tx1.GetId(),
                      entry.Fee(10000 * SATOSHI).Priority(10.0).FromTx(tx1));

    /* highest fee */
    CMutableTransaction tx2 = CMutableTransaction();
    tx2.vout.resize(1);
    tx2.vout[0].scriptPubKey = CScript() << OP_11 << OP_EQUAL;
    tx2.vout[0].nValue = 2 * COIN;
    pool.addUnchecked(tx2.GetId(),
                      entry.Fee(20000 * SATOSHI).Priority(9.0).FromTx(tx2));

    /* lowest fee */
    CMutableTransaction tx3 = CMutableTransaction();
    tx3.vout.resize(1);
    tx3.vout[0].scriptPubKey = CScript() << OP_11 << OP_EQUAL;
    tx3.vout[0].nValue = 5 * COIN;
    pool.addUnchecked(tx3.GetId(),
                      entry.Fee(Amount::zero()).Priority(100.0).FromTx(tx3));

    /* 2nd highest fee */
    CMutableTransaction tx4 = CMutableTransaction();
    tx4.vout.resize(1);
    tx4.vout[0].scriptPubKey = CScript() << OP_11 << OP_EQUAL;
    tx4.vout[0].nValue = 6 * COIN;
    pool.addUnchecked(tx4.GetId(),
                      entry.Fee(15000 * SATOSHI).Priority(1.0).FromTx(tx4));

    /* equal fee rate to tx1, but newer */
    CMutableTransaction tx5 = CMutableTransaction();
    tx5.vout.resize(1);
    tx5.vout[0].scriptPubKey = CScript() << OP_11 << OP_EQUAL;
    tx5.vout[0].nValue = 11 * COIN;
    entry.nTime = 1;
    entry.dPriority = 10.0;
    pool.addUnchecked(tx5.GetId(), entry.Fee(10000 * SATOSHI).FromTx(tx5));
    BOOST_CHECK_EQUAL(pool.size(), 5UL);

    std::vector<std::string> sortedOrder;
    sortedOrder.resize(5);
    sortedOrder[0] = tx3.GetId().ToString(); // 0
    sortedOrder[1] = tx5.GetId().ToString(); // 10000
    sortedOrder[2] = tx1.GetId().ToString(); // 10000
    sortedOrder[3] = tx4.GetId().ToString(); // 15000
    sortedOrder[4] = tx2.GetId().ToString(); // 20000
    CheckSort<descendant_score>(pool, sortedOrder, "MempoolIndexingTest1");

    /* low fee but with high fee child */
    /* tx6 -> tx7 -> tx8, tx9 -> tx10 */
    CMutableTransaction tx6 = CMutableTransaction();
    tx6.vout.resize(1);
    tx6.vout[0].scriptPubKey = CScript() << OP_11 << OP_EQUAL;
    tx6.vout[0].nValue = 20 * COIN;
    pool.addUnchecked(tx6.GetId(), entry.Fee(Amount::zero()).FromTx(tx6));
    BOOST_CHECK_EQUAL(pool.size(), 6UL);
    // Check that at this point, tx6 is sorted low
    sortedOrder.insert(sortedOrder.begin(), tx6.GetId().ToString());
    CheckSort<descendant_score>(pool, sortedOrder, "MempoolIndexingTest2");

    CTxMemPool::setEntries setAncestors;
    setAncestors.insert(pool.mapTx.find(tx6.GetId()));
    CMutableTransaction tx7 = CMutableTransaction();
    tx7.vin.resize(1);
    tx7.vin[0].prevout = COutPoint(tx6.GetId(), 0);
    tx7.vin[0].scriptSig = CScript() << OP_11;
    tx7.vout.resize(2);
    tx7.vout[0].scriptPubKey = CScript() << OP_11 << OP_EQUAL;
    tx7.vout[0].nValue = 10 * COIN;
    tx7.vout[1].scriptPubKey = CScript() << OP_11 << OP_EQUAL;
    tx7.vout[1].nValue = 1 * COIN;

    CTxMemPool::setEntries setAncestorsCalculated;
    std::string dummy;
    BOOST_CHECK_EQUAL(
        pool.CalculateMemPoolAncestors(entry.Fee(2000000 * SATOSHI).FromTx(tx7),
                                       setAncestorsCalculated, 100, 1000000,
                                       1000, 1000000, dummy),
        true);
    BOOST_CHECK(setAncestorsCalculated == setAncestors);

    pool.addUnchecked(tx7.GetId(), entry.FromTx(tx7), setAncestors);
    BOOST_CHECK_EQUAL(pool.size(), 7UL);

    // Now tx6 should be sorted higher (high fee child): tx7, tx6, tx2, ...
    sortedOrder.erase(sortedOrder.begin());
    sortedOrder.push_back(tx6.GetId().ToString());
    sortedOrder.push_back(tx7.GetId().ToString());
    CheckSort<descendant_score>(pool, sortedOrder, "MempoolIndexingTest3");

    /* low fee child of tx7 */
    CMutableTransaction tx8 = CMutableTransaction();
    tx8.vin.resize(1);
    tx8.vin[0].prevout = COutPoint(tx7.GetId(), 0);
    tx8.vin[0].scriptSig = CScript() << OP_11;
    tx8.vout.resize(1);
    tx8.vout[0].scriptPubKey = CScript() << OP_11 << OP_EQUAL;
    tx8.vout[0].nValue = 10 * COIN;
    setAncestors.insert(pool.mapTx.find(tx7.GetId()));
    pool.addUnchecked(tx8.GetId(),
                      entry.Fee(Amount::zero()).Time(2).FromTx(tx8),
                      setAncestors);

    // Now tx8 should be sorted low, but tx6/tx both high
    sortedOrder.insert(sortedOrder.begin(), tx8.GetId().ToString());
    CheckSort<descendant_score>(pool, sortedOrder, "MempoolIndexingTest4");

    /* low fee child of tx7 */
    CMutableTransaction tx9 = CMutableTransaction();
    tx9.vin.resize(1);
    tx9.vin[0].prevout = COutPoint(tx7.GetId(), 1);
    tx9.vin[0].scriptSig = CScript() << OP_11;
    tx9.vout.resize(1);
    tx9.vout[0].scriptPubKey = CScript() << OP_11 << OP_EQUAL;
    tx9.vout[0].nValue = 1 * COIN;
    pool.addUnchecked(tx9.GetId(),
                      entry.Fee(Amount::zero()).Time(3).FromTx(tx9),
                      setAncestors);

    // tx9 should be sorted low
    BOOST_CHECK_EQUAL(pool.size(), 9UL);
    sortedOrder.insert(sortedOrder.begin(), tx9.GetId().ToString());
    CheckSort<descendant_score>(pool, sortedOrder, "MempoolIndexingTest5");

    std::vector<std::string> snapshotOrder = sortedOrder;

    setAncestors.insert(pool.mapTx.find(tx8.GetId()));
    setAncestors.insert(pool.mapTx.find(tx9.GetId()));
    /* tx10 depends on tx8 and tx9 and has a high fee*/
    CMutableTransaction tx10 = CMutableTransaction();
    tx10.vin.resize(2);
    tx10.vin[0].prevout = COutPoint(tx8.GetId(), 0);
    tx10.vin[0].scriptSig = CScript() << OP_11;
    tx10.vin[1].prevout = COutPoint(tx9.GetId(), 0);
    tx10.vin[1].scriptSig = CScript() << OP_11;
    tx10.vout.resize(1);
    tx10.vout[0].scriptPubKey = CScript() << OP_11 << OP_EQUAL;
    tx10.vout[0].nValue = 10 * COIN;

    setAncestorsCalculated.clear();
    BOOST_CHECK_EQUAL(pool.CalculateMemPoolAncestors(
                          entry.Fee(200000 * SATOSHI).Time(4).FromTx(tx10),
                          setAncestorsCalculated, 100, 1000000, 1000, 1000000,
                          dummy),
                      true);
    BOOST_CHECK(setAncestorsCalculated == setAncestors);

    pool.addUnchecked(tx10.GetId(), entry.FromTx(tx10), setAncestors);

    /**
     *  tx8 and tx9 should both now be sorted higher
     *  Final order after tx10 is added:
     *
     *  tx3 = 0 (1)
     *  tx5 = 10000 (1)
     *  tx1 = 10000 (1)
     *  tx4 = 15000 (1)
     *  tx2 = 20000 (1)
     *  tx9 = 200k (2 txs)
     *  tx8 = 200k (2 txs)
     *  tx10 = 200k (1 tx)
     *  tx6 = 2.2M (5 txs)
     *  tx7 = 2.2M (4 txs)
     */
    // take out tx9, tx8 from the beginning
    sortedOrder.erase(sortedOrder.begin(), sortedOrder.begin() + 2);
    sortedOrder.insert(sortedOrder.begin() + 5, tx9.GetId().ToString());
    sortedOrder.insert(sortedOrder.begin() + 6, tx8.GetId().ToString());
    // tx10 is just before tx6
    sortedOrder.insert(sortedOrder.begin() + 7, tx10.GetId().ToString());
    CheckSort<descendant_score>(pool, sortedOrder, "MempoolIndexingTest6");

    // there should be 10 transactions in the mempool
    BOOST_CHECK_EQUAL(pool.size(), 10UL);

    // Now try removing tx10 and verify the sort order returns to normal
    pool.removeRecursive(pool.mapTx.find(tx10.GetId())->GetTx());
    CheckSort<descendant_score>(pool, snapshotOrder, "MempoolIndexingTest7");

    pool.removeRecursive(pool.mapTx.find(tx9.GetId())->GetTx());
    pool.removeRecursive(pool.mapTx.find(tx8.GetId())->GetTx());
}

BOOST_AUTO_TEST_CASE(MempoolAncestorIndexingTest) {
    CTxMemPool pool;
    LOCK2(cs_main, pool.cs);
    TestMemPoolEntryHelper entry;

    /* 3rd highest fee */
    CMutableTransaction tx1 = CMutableTransaction();
    tx1.vout.resize(1);
    tx1.vout[0].scriptPubKey = CScript() << OP_11 << OP_EQUAL;
    tx1.vout[0].nValue = 10 * COIN;
    pool.addUnchecked(tx1.GetId(),
                      entry.Fee(10000 * SATOSHI).Priority(10.0).FromTx(tx1));

    /* highest fee */
    CMutableTransaction tx2 = CMutableTransaction();
    tx2.vout.resize(1);
    tx2.vout[0].scriptPubKey = CScript() << OP_11 << OP_EQUAL;
    tx2.vout[0].nValue = 2 * COIN;
    pool.addUnchecked(tx2.GetId(),
                      entry.Fee(20000 * SATOSHI).Priority(9.0).FromTx(tx2));
    uint64_t tx2Size = CTransaction(tx2).GetTotalSize();

    /* lowest fee */
    CMutableTransaction tx3 = CMutableTransaction();
    tx3.vout.resize(1);
    tx3.vout[0].scriptPubKey = CScript() << OP_11 << OP_EQUAL;
    tx3.vout[0].nValue = 5 * COIN;
    pool.addUnchecked(tx3.GetId(),
                      entry.Fee(Amount::zero()).Priority(100.0).FromTx(tx3));

    /* 2nd highest fee */
    CMutableTransaction tx4 = CMutableTransaction();
    tx4.vout.resize(1);
    tx4.vout[0].scriptPubKey = CScript() << OP_11 << OP_EQUAL;
    tx4.vout[0].nValue = 6 * COIN;
    pool.addUnchecked(tx4.GetId(),
                      entry.Fee(15000 * SATOSHI).Priority(1.0).FromTx(tx4));

    /* equal fee rate to tx1, but newer */
    CMutableTransaction tx5 = CMutableTransaction();
    tx5.vout.resize(1);
    tx5.vout[0].scriptPubKey = CScript() << OP_11 << OP_EQUAL;
    tx5.vout[0].nValue = 11 * COIN;
    pool.addUnchecked(tx5.GetId(), entry.Fee(10000 * SATOSHI).FromTx(tx5));
    BOOST_CHECK_EQUAL(pool.size(), 5UL);

    std::vector<std::string> sortedOrder;
    sortedOrder.resize(5);
    sortedOrder[0] = tx2.GetId().ToString(); // 20000
    sortedOrder[1] = tx4.GetId().ToString(); // 15000
    // tx1 and tx5 are both 10000
    // Ties are broken by hash, not timestamp, so determine which hash comes
    // first.
    if (tx1.GetId() < tx5.GetId()) {
        sortedOrder[2] = tx1.GetId().ToString();
        sortedOrder[3] = tx5.GetId().ToString();
    } else {
        sortedOrder[2] = tx5.GetId().ToString();
        sortedOrder[3] = tx1.GetId().ToString();
    }
    sortedOrder[4] = tx3.GetId().ToString(); // 0

    CheckSort<ancestor_score>(pool, sortedOrder,
                              "MempoolAncestorIndexingTest1");

    /* low fee parent with high fee child */
    /* tx6 (0) -> tx7 (high) */
    CMutableTransaction tx6 = CMutableTransaction();
    tx6.vout.resize(1);
    tx6.vout[0].scriptPubKey = CScript() << OP_11 << OP_EQUAL;
    tx6.vout[0].nValue = 20 * COIN;
    uint64_t tx6Size = CTransaction(tx6).GetTotalSize();

    pool.addUnchecked(tx6.GetId(), entry.Fee(Amount::zero()).FromTx(tx6));
    BOOST_CHECK_EQUAL(pool.size(), 6UL);
    // Ties are broken by hash
    if (tx3.GetId() < tx6.GetId()) {
        sortedOrder.push_back(tx6.GetId().ToString());
    } else {
        sortedOrder.insert(sortedOrder.end() - 1, tx6.GetId().ToString());
    }

    CheckSort<ancestor_score>(pool, sortedOrder,
                              "MempoolAncestorIndexingTest2");

    CMutableTransaction tx7 = CMutableTransaction();
    tx7.vin.resize(1);
    tx7.vin[0].prevout = COutPoint(tx6.GetId(), 0);
    tx7.vin[0].scriptSig = CScript() << OP_11;
    tx7.vout.resize(1);
    tx7.vout[0].scriptPubKey = CScript() << OP_11 << OP_EQUAL;
    tx7.vout[0].nValue = 10 * COIN;
    uint64_t tx7Size = CTransaction(tx7).GetTotalSize();

    /* set the fee to just below tx2's feerate when including ancestor */
    Amount fee = int64_t((20000 / tx2Size) * (tx7Size + tx6Size) - 1) * SATOSHI;

    // CTxMemPoolEntry entry7(tx7, fee, 2, 10.0, 1, true);
    pool.addUnchecked(tx7.GetId(), entry.Fee(Amount(fee)).FromTx(tx7));
    BOOST_CHECK_EQUAL(pool.size(), 7UL);
    sortedOrder.insert(sortedOrder.begin() + 1, tx7.GetId().ToString());
    CheckSort<ancestor_score>(pool, sortedOrder,
                              "MempoolAncestorIndexingTest3");

    /* after tx6 is mined, tx7 should move up in the sort */
    std::vector<CTransactionRef> vtx;
    vtx.push_back(MakeTransactionRef(tx6));
    pool.removeForBlock(vtx, 1);

    sortedOrder.erase(sortedOrder.begin() + 1);
    // Ties are broken by hash
    if (tx3.GetId() < tx6.GetId()) {
        sortedOrder.pop_back();
    } else {
        sortedOrder.erase(sortedOrder.end() - 2);
    }
    sortedOrder.insert(sortedOrder.begin(), tx7.GetId().ToString());
    CheckSort<ancestor_score>(pool, sortedOrder,
                              "MempoolAncestorIndexingTest4");

    // High-fee parent, low-fee child
    // tx7 -> tx8
    CMutableTransaction tx8 = CMutableTransaction();
    tx8.vin.resize(1);
    tx8.vin[0].prevout = COutPoint(tx7.GetId(), 0);
    tx8.vin[0].scriptSig = CScript() << OP_11;
    tx8.vout.resize(1);
    tx8.vout[0].scriptPubKey = CScript() << OP_11 << OP_EQUAL;
    tx8.vout[0].nValue = 10 * COIN;

    // Check that we sort by min(feerate, ancestor_feerate):
    // set the fee so that the ancestor feerate is above tx1/5,
    // but the transaction's own feerate is lower
    pool.addUnchecked(tx8.GetId(),
                      entry.Fee(Amount(5000 * SATOSHI)).FromTx(tx8));
    sortedOrder.insert(sortedOrder.end() - 1, tx8.GetId().ToString());
    CheckSort<ancestor_score>(pool, sortedOrder,
                              "MempoolAncestorIndexingTest5");
}

BOOST_AUTO_TEST_CASE(MempoolSizeLimitTest) {
    CTxMemPool pool;
    LOCK2(cs_main, pool.cs);
    TestMemPoolEntryHelper entry;
    entry.dPriority = 10.0;
    Amount feeIncrement = MEMPOOL_FULL_FEE_INCREMENT.GetFeePerK();

    CMutableTransaction tx1 = CMutableTransaction();
    tx1.vin.resize(1);
    tx1.vin[0].scriptSig = CScript() << OP_1;
    tx1.vout.resize(1);
    tx1.vout[0].scriptPubKey = CScript() << OP_1 << OP_EQUAL;
    tx1.vout[0].nValue = 10 * COIN;
    pool.addUnchecked(tx1.GetId(),
                      entry.Fee(10000 * SATOSHI).FromTx(tx1, &pool));

    CMutableTransaction tx2 = CMutableTransaction();
    tx2.vin.resize(1);
    tx2.vin[0].scriptSig = CScript() << OP_2;
    tx2.vout.resize(1);
    tx2.vout[0].scriptPubKey = CScript() << OP_2 << OP_EQUAL;
    tx2.vout[0].nValue = 10 * COIN;
    pool.addUnchecked(tx2.GetId(),
                      entry.Fee(5000 * SATOSHI).FromTx(tx2, &pool));

    // should do nothing
    pool.TrimToSize(pool.DynamicMemoryUsage());
    BOOST_CHECK(pool.exists(tx1.GetId()));
    BOOST_CHECK(pool.exists(tx2.GetId()));

    // should remove the lower-feerate transaction
    pool.TrimToSize(pool.DynamicMemoryUsage() * 3 / 4);
    BOOST_CHECK(pool.exists(tx1.GetId()));
    BOOST_CHECK(!pool.exists(tx2.GetId()));

    pool.addUnchecked(tx2.GetId(), entry.FromTx(tx2, &pool));
    CMutableTransaction tx3 = CMutableTransaction();
    tx3.vin.resize(1);
    tx3.vin[0].prevout = COutPoint(tx2.GetId(), 0);
    tx3.vin[0].scriptSig = CScript() << OP_2;
    tx3.vout.resize(1);
    tx3.vout[0].scriptPubKey = CScript() << OP_3 << OP_EQUAL;
    tx3.vout[0].nValue = 10 * COIN;
    pool.addUnchecked(tx3.GetId(),
                      entry.Fee(20000 * SATOSHI).FromTx(tx3, &pool));

    // tx3 should pay for tx2 (CPFP)
    pool.TrimToSize(pool.DynamicMemoryUsage() * 3 / 4);
    BOOST_CHECK(!pool.exists(tx1.GetId()));
    BOOST_CHECK(pool.exists(tx2.GetId()));
    BOOST_CHECK(pool.exists(tx3.GetId()));

    // mempool is limited to tx1's size in memory usage, so nothing fits
    pool.TrimToSize(CTransaction(tx1).GetTotalSize());
    BOOST_CHECK(!pool.exists(tx1.GetId()));
    BOOST_CHECK(!pool.exists(tx2.GetId()));
    BOOST_CHECK(!pool.exists(tx3.GetId()));

    CFeeRate maxFeeRateRemoved(25000 * SATOSHI,
                               CTransaction(tx3).GetTotalSize() +
                                   CTransaction(tx2).GetTotalSize());
    BOOST_CHECK_EQUAL(pool.GetMinFee(1).GetFeePerK(),
                      maxFeeRateRemoved.GetFeePerK() + feeIncrement);

    CMutableTransaction tx4 = CMutableTransaction();
    tx4.vin.resize(2);
    tx4.vin[0].prevout = COutPoint();
    tx4.vin[0].scriptSig = CScript() << OP_4;
    tx4.vin[1].prevout = COutPoint();
    tx4.vin[1].scriptSig = CScript() << OP_4;
    tx4.vout.resize(2);
    tx4.vout[0].scriptPubKey = CScript() << OP_4 << OP_EQUAL;
    tx4.vout[0].nValue = 10 * COIN;
    tx4.vout[1].scriptPubKey = CScript() << OP_4 << OP_EQUAL;
    tx4.vout[1].nValue = 10 * COIN;

    CMutableTransaction tx5 = CMutableTransaction();
    tx5.vin.resize(2);
    tx5.vin[0].prevout = COutPoint(tx4.GetId(), 0);
    tx5.vin[0].scriptSig = CScript() << OP_4;
    tx5.vin[1].prevout = COutPoint();
    tx5.vin[1].scriptSig = CScript() << OP_5;
    tx5.vout.resize(2);
    tx5.vout[0].scriptPubKey = CScript() << OP_5 << OP_EQUAL;
    tx5.vout[0].nValue = 10 * COIN;
    tx5.vout[1].scriptPubKey = CScript() << OP_5 << OP_EQUAL;
    tx5.vout[1].nValue = 10 * COIN;

    CMutableTransaction tx6 = CMutableTransaction();
    tx6.vin.resize(2);
    tx6.vin[0].prevout = COutPoint(tx4.GetId(), 1);
    tx6.vin[0].scriptSig = CScript() << OP_4;
    tx6.vin[1].prevout = COutPoint();
    tx6.vin[1].scriptSig = CScript() << OP_6;
    tx6.vout.resize(2);
    tx6.vout[0].scriptPubKey = CScript() << OP_6 << OP_EQUAL;
    tx6.vout[0].nValue = 10 * COIN;
    tx6.vout[1].scriptPubKey = CScript() << OP_6 << OP_EQUAL;
    tx6.vout[1].nValue = 10 * COIN;

    CMutableTransaction tx7 = CMutableTransaction();
    tx7.vin.resize(2);
    tx7.vin[0].prevout = COutPoint(tx5.GetId(), 0);
    tx7.vin[0].scriptSig = CScript() << OP_5;
    tx7.vin[1].prevout = COutPoint(tx6.GetId(), 0);
    tx7.vin[1].scriptSig = CScript() << OP_6;
    tx7.vout.resize(2);
    tx7.vout[0].scriptPubKey = CScript() << OP_7 << OP_EQUAL;
    tx7.vout[0].nValue = 10 * COIN;
    tx7.vout[1].scriptPubKey = CScript() << OP_7 << OP_EQUAL;
    tx7.vout[1].nValue = 10 * COIN;

    pool.addUnchecked(tx4.GetId(),
                      entry.Fee(7000 * SATOSHI).FromTx(tx4, &pool));
    pool.addUnchecked(tx5.GetId(),
                      entry.Fee(1000 * SATOSHI).FromTx(tx5, &pool));
    pool.addUnchecked(tx6.GetId(),
                      entry.Fee(1100 * SATOSHI).FromTx(tx6, &pool));
    pool.addUnchecked(tx7.GetId(),
                      entry.Fee(9000 * SATOSHI).FromTx(tx7, &pool));

    // we only require this to remove, at max, 2 txn, because it's not clear
    // what we're really optimizing for aside from that
    pool.TrimToSize(pool.DynamicMemoryUsage() - 1);
    BOOST_CHECK(pool.exists(tx4.GetId()));
    BOOST_CHECK(pool.exists(tx6.GetId()));
    BOOST_CHECK(!pool.exists(tx7.GetId()));

    if (!pool.exists(tx5.GetId()))
        pool.addUnchecked(tx5.GetId(),
                          entry.Fee(1000 * SATOSHI).FromTx(tx5, &pool));
    pool.addUnchecked(tx7.GetId(),
                      entry.Fee(9000 * SATOSHI).FromTx(tx7, &pool));

    // should maximize mempool size by only removing 5/7
    pool.TrimToSize(pool.DynamicMemoryUsage() / 2);
    BOOST_CHECK(pool.exists(tx4.GetId()));
    BOOST_CHECK(!pool.exists(tx5.GetId()));
    BOOST_CHECK(pool.exists(tx6.GetId()));
    BOOST_CHECK(!pool.exists(tx7.GetId()));

    pool.addUnchecked(tx5.GetId(),
                      entry.Fee(1000 * SATOSHI).FromTx(tx5, &pool));
    pool.addUnchecked(tx7.GetId(),
                      entry.Fee(9000 * SATOSHI).FromTx(tx7, &pool));

    std::vector<CTransactionRef> vtx;
    SetMockTime(42);
    SetMockTime(42 + CTxMemPool::ROLLING_FEE_HALFLIFE);
    BOOST_CHECK_EQUAL(pool.GetMinFee(1).GetFeePerK(),
                      maxFeeRateRemoved.GetFeePerK() + feeIncrement);
    // ... we should keep the same min fee until we get a block
    pool.removeForBlock(vtx, 1);
    SetMockTime(42 + 2 * CTxMemPool::ROLLING_FEE_HALFLIFE);
    BOOST_CHECK_EQUAL(pool.GetMinFee(1).GetFeePerK(),
                      (maxFeeRateRemoved.GetFeePerK() + feeIncrement) / 2);
    // ... then feerate should drop 1/2 each halflife

    SetMockTime(42 + 2 * CTxMemPool::ROLLING_FEE_HALFLIFE +
                CTxMemPool::ROLLING_FEE_HALFLIFE / 2);
    BOOST_CHECK_EQUAL(
        pool.GetMinFee(pool.DynamicMemoryUsage() * 5 / 2).GetFeePerK(),
        (maxFeeRateRemoved.GetFeePerK() + feeIncrement) / 4);
    // ... with a 1/2 halflife when mempool is < 1/2 its target size

    SetMockTime(42 + 2 * CTxMemPool::ROLLING_FEE_HALFLIFE +
                CTxMemPool::ROLLING_FEE_HALFLIFE / 2 +
                CTxMemPool::ROLLING_FEE_HALFLIFE / 4);
    BOOST_CHECK_EQUAL(
        pool.GetMinFee(pool.DynamicMemoryUsage() * 9 / 2).GetFeePerK(),
        (maxFeeRateRemoved.GetFeePerK() + feeIncrement) / 8 + SATOSHI);
    // ... with a 1/4 halflife when mempool is < 1/4 its target size

    SetMockTime(0);
}

// expectedSize can be smaller than correctlyOrderedIds.size(), since we
// might be testing intermediary states. Just avoiding some slice operations,
void CheckDisconnectPoolOrder(DisconnectedBlockTransactions &disconnectPool,
                              std::vector<TxId> correctlyOrderedIds,
                              unsigned int expectedSize) {
    int i = 0;
    BOOST_CHECK_EQUAL(disconnectPool.GetQueuedTx().size(), expectedSize);
    // Txns in queuedTx's insertion_order index are sorted from children to
    // parent txn
    for (const CTransactionRef &tx :
         reverse_iterate(disconnectPool.GetQueuedTx().get<insertion_order>())) {
        BOOST_CHECK(tx->GetId() == correctlyOrderedIds[i]);
        i++;
    }
}

typedef std::vector<CMutableTransaction *> vecptx;

BOOST_AUTO_TEST_CASE(TestImportMempool) {
    CMutableTransaction chainedTxn[5];
    std::vector<TxId> correctlyOrderedIds;
    COutPoint lastOutpoint;

    // Construct a chain of 5 transactions
    for (int i = 0; i < 5; i++) {
        chainedTxn[i].vin.emplace_back(lastOutpoint);
        chainedTxn[i].vout.emplace_back(10 * SATOSHI, CScript() << OP_TRUE);
        correctlyOrderedIds.push_back(chainedTxn[i].GetId());
        lastOutpoint = COutPoint(correctlyOrderedIds[i], 0);
    }

    // The first 3 txns simulate once confirmed transactions that have been
    // disconnected. We test 3 different orders: in order, one case of mixed
    // order and inverted order.
    vecptx disconnectedTxnsInOrder = {&chainedTxn[0], &chainedTxn[1],
                                      &chainedTxn[2]};
    vecptx disconnectedTxnsMixedOrder = {&chainedTxn[1], &chainedTxn[2],
                                         &chainedTxn[0]};
    vecptx disconnectedTxnsInvertedOrder = {&chainedTxn[2], &chainedTxn[1],
                                            &chainedTxn[0]};

    // The last 2 txns simulate a chain of unconfirmed transactions in the
    // mempool. We test 2 different orders: in and out of order.
    vecptx unconfTxnsInOrder = {&chainedTxn[3], &chainedTxn[4]};
    vecptx unconfTxnsOutOfOrder = {&chainedTxn[4], &chainedTxn[3]};

    // Now we test all combinations of the previously defined orders for
    // disconnected and unconfirmed txns. The expected outcome is to have these
    // transactions in the correct order in queuedTx, as defined in
    // correctlyOrderedIds.
    for (auto &disconnectedTxns :
         {disconnectedTxnsInOrder, disconnectedTxnsMixedOrder,
          disconnectedTxnsInvertedOrder}) {
        for (auto &unconfTxns : {unconfTxnsInOrder, unconfTxnsOutOfOrder}) {
            // addForBlock inserts disconnectTxns in disconnectPool. They
            // simulate transactions that were once confirmed in a block
            std::vector<CTransactionRef> vtx;
            for (auto tx : disconnectedTxns) {
                vtx.push_back(MakeTransactionRef(*tx));
            }
            DisconnectedBlockTransactions disconnectPool;
            disconnectPool.addForBlock(vtx);
            CheckDisconnectPoolOrder(disconnectPool, correctlyOrderedIds,
                                     disconnectedTxns.size());

            // If the mempool is empty, importMempool doesn't change
            // disconnectPool
            CTxMemPool testPool;

            disconnectPool.importMempool(testPool);
            CheckDisconnectPoolOrder(disconnectPool, correctlyOrderedIds,
                                     disconnectedTxns.size());

            {
                LOCK2(cs_main, testPool.cs);
                // Add all unconfirmed transactions in testPool
                for (auto tx : unconfTxns) {
                    TestMemPoolEntryHelper entry;
                    testPool.addUnchecked(tx->GetId(), entry.FromTx(*tx));
                }
            }

            // Now we test importMempool with a non empty mempool
            disconnectPool.importMempool(testPool);
            CheckDisconnectPoolOrder(disconnectPool, correctlyOrderedIds,
                                     disconnectedTxns.size() +
                                         unconfTxns.size());
            // We must clear disconnectPool to not trigger the assert in its
            // destructor
            disconnectPool.clear();
        }
    }
}

inline CTransactionRef
make_tx(std::vector<Amount> &&output_values,
        std::vector<CTransactionRef> &&inputs = std::vector<CTransactionRef>(),
        std::vector<uint32_t> &&input_indices = std::vector<uint32_t>()) {
    CMutableTransaction tx = CMutableTransaction();
    tx.vin.resize(inputs.size());
    tx.vout.resize(output_values.size());
    for (size_t i = 0; i < inputs.size(); ++i) {
        tx.vin[i].prevout =
            COutPoint(inputs[i]->GetId(),
                      input_indices.size() > i ? input_indices[i] : 0);
    }
    for (size_t i = 0; i < output_values.size(); ++i) {
        tx.vout[i].scriptPubKey = CScript() << OP_11 << OP_EQUAL;
        tx.vout[i].nValue = output_values[i];
    }
    return MakeTransactionRef(tx);
}

#define MK_OUTPUTS(amounts...)                                                 \
    std::vector<Amount> { amounts }
#define MK_INPUTS(txs...)                                                      \
    std::vector<CTransactionRef> { txs }
#define MK_INPUT_IDX(idxes...)                                                 \
    std::vector<uint32_t> { idxes }

BOOST_AUTO_TEST_CASE(MempoolAncestryTests) {
    size_t ancestors, descendants;

    CTxMemPool pool;
    LOCK2(cs_main, pool.cs);
    TestMemPoolEntryHelper entry;

    /* Base transaction */
    //
    // [tx1]
    //
    CTransactionRef tx1 = make_tx(MK_OUTPUTS(10 * COIN));
    pool.addUnchecked(tx1->GetId(), entry.Fee(10000 * SATOSHI).FromTx(tx1));

    // Ancestors / descendants should be 1 / 1 (itself / itself)
    pool.GetTransactionAncestry(tx1->GetId(), ancestors, descendants);
    BOOST_CHECK_EQUAL(ancestors, 1ULL);
    BOOST_CHECK_EQUAL(descendants, 1ULL);

    /* Child transaction */
    //
    // [tx1].0 <- [tx2]
    //
    CTransactionRef tx2 =
        make_tx(MK_OUTPUTS(495 * CENT, 5 * COIN), MK_INPUTS(tx1));
    pool.addUnchecked(tx2->GetId(), entry.Fee(10000 * SATOSHI).FromTx(tx2));

    // Ancestors / descendants should be:
    // transaction  ancestors   descendants
    // ============ =========== ===========
    // tx1          1 (tx1)     2 (tx1,2)
    // tx2          2 (tx1,2)   2 (tx1,2)
    pool.GetTransactionAncestry(tx1->GetId(), ancestors, descendants);
    BOOST_CHECK_EQUAL(ancestors, 1ULL);
    BOOST_CHECK_EQUAL(descendants, 2ULL);
    pool.GetTransactionAncestry(tx2->GetId(), ancestors, descendants);
    BOOST_CHECK_EQUAL(ancestors, 2ULL);
    BOOST_CHECK_EQUAL(descendants, 2ULL);

    /* Grand-child 1 */
    //
    // [tx1].0 <- [tx2].0 <- [tx3]
    //
    CTransactionRef tx3 =
        make_tx(MK_OUTPUTS(290 * CENT, 200 * CENT), MK_INPUTS(tx2));
    pool.addUnchecked(tx3->GetId(), entry.Fee(10000 * SATOSHI).FromTx(tx3));

    // Ancestors / descendants should be:
    // transaction  ancestors   descendants
    // ============ =========== ===========
    // tx1          1 (tx1)     3 (tx1,2,3)
    // tx2          2 (tx1,2)   3 (tx1,2,3)
    // tx3          3 (tx1,2,3) 3 (tx1,2,3)
    pool.GetTransactionAncestry(tx1->GetId(), ancestors, descendants);
    BOOST_CHECK_EQUAL(ancestors, 1ULL);
    BOOST_CHECK_EQUAL(descendants, 3ULL);
    pool.GetTransactionAncestry(tx2->GetId(), ancestors, descendants);
    BOOST_CHECK_EQUAL(ancestors, 2ULL);
    BOOST_CHECK_EQUAL(descendants, 3ULL);
    pool.GetTransactionAncestry(tx3->GetId(), ancestors, descendants);
    BOOST_CHECK_EQUAL(ancestors, 3ULL);
    BOOST_CHECK_EQUAL(descendants, 3ULL);

    /* Grand-child 2 */
    //
    // [tx1].0 <- [tx2].0 <- [tx3]
    //              |
    //              \---1 <- [tx4]
    //
    CTransactionRef tx4 = make_tx(MK_OUTPUTS(290 * CENT, 250 * CENT),
                                  MK_INPUTS(tx2), MK_INPUT_IDX(1));
    pool.addUnchecked(tx4->GetId(), entry.Fee(10000 * SATOSHI).FromTx(tx4));

    // Ancestors / descendants should be:
    // transaction  ancestors   descendants
    // ============ =========== ===========
    // tx1          1 (tx1)     4 (tx1,2,3,4)
    // tx2          2 (tx1,2)   4 (tx1,2,3,4)
    // tx3          3 (tx1,2,3) 4 (tx1,2,3,4)
    // tx4          3 (tx1,2,4) 4 (tx1,2,3,4)
    pool.GetTransactionAncestry(tx1->GetId(), ancestors, descendants);
    BOOST_CHECK_EQUAL(ancestors, 1ULL);
    BOOST_CHECK_EQUAL(descendants, 4ULL);
    pool.GetTransactionAncestry(tx2->GetId(), ancestors, descendants);
    BOOST_CHECK_EQUAL(ancestors, 2ULL);
    BOOST_CHECK_EQUAL(descendants, 4ULL);
    pool.GetTransactionAncestry(tx3->GetId(), ancestors, descendants);
    BOOST_CHECK_EQUAL(ancestors, 3ULL);
    BOOST_CHECK_EQUAL(descendants, 4ULL);
    pool.GetTransactionAncestry(tx4->GetId(), ancestors, descendants);
    BOOST_CHECK_EQUAL(ancestors, 3ULL);
    BOOST_CHECK_EQUAL(descendants, 4ULL);

    /* Make an alternate branch that is longer and connect it to tx3 */
    //
    // [ty1].0 <- [ty2].0 <- [ty3].0 <- [ty4].0 <- [ty5].0
    //                                              |
    // [tx1].0 <- [tx2].0 <- [tx3].0 <- [ty6] --->--/
    //              |
    //              \---1 <- [tx4]
    //
    CTransactionRef ty1, ty2, ty3, ty4, ty5;
    CTransactionRef *ty[5] = {&ty1, &ty2, &ty3, &ty4, &ty5};
    Amount v = 5 * COIN;
    for (uint64_t i = 0; i < 5; i++) {
        CTransactionRef &tyi = *ty[i];
        tyi = make_tx(MK_OUTPUTS(v), i > 0 ? MK_INPUTS(*ty[i - 1])
                                           : std::vector<CTransactionRef>());
        v -= 50 * CENT;
        pool.addUnchecked(tyi->GetId(), entry.Fee(10000 * SATOSHI).FromTx(tyi));
        pool.GetTransactionAncestry(tyi->GetId(), ancestors, descendants);
        BOOST_CHECK_EQUAL(ancestors, i + 1);
        BOOST_CHECK_EQUAL(descendants, i + 1);
    }
    CTransactionRef ty6 = make_tx(MK_OUTPUTS(5 * COIN), MK_INPUTS(tx3, ty5));
    pool.addUnchecked(ty6->GetId(), entry.Fee(10000 * SATOSHI).FromTx(ty6));

    // Ancestors / descendants should be:
    // transaction  ancestors           descendants
    // ============ =================== ===========
    // tx1          1 (tx1)             5 (tx1,2,3,4, ty6)
    // tx2          2 (tx1,2)           5 (tx1,2,3,4, ty6)
    // tx3          3 (tx1,2,3)         5 (tx1,2,3,4, ty6)
    // tx4          3 (tx1,2,4)         5 (tx1,2,3,4, ty6)
    // ty1          1 (ty1)             6 (ty1,2,3,4,5,6)
    // ty2          2 (ty1,2)           6 (ty1,2,3,4,5,6)
    // ty3          3 (ty1,2,3)         6 (ty1,2,3,4,5,6)
    // ty4          4 (y1234)           6 (ty1,2,3,4,5,6)
    // ty5          5 (y12345)          6 (ty1,2,3,4,5,6)
    // ty6          9 (tx123, ty123456) 6 (ty1,2,3,4,5,6)
    pool.GetTransactionAncestry(tx1->GetId(), ancestors, descendants);
    BOOST_CHECK_EQUAL(ancestors, 1ULL);
    BOOST_CHECK_EQUAL(descendants, 5ULL);
    pool.GetTransactionAncestry(tx2->GetId(), ancestors, descendants);
    BOOST_CHECK_EQUAL(ancestors, 2ULL);
    BOOST_CHECK_EQUAL(descendants, 5ULL);
    pool.GetTransactionAncestry(tx3->GetId(), ancestors, descendants);
    BOOST_CHECK_EQUAL(ancestors, 3ULL);
    BOOST_CHECK_EQUAL(descendants, 5ULL);
    pool.GetTransactionAncestry(tx4->GetId(), ancestors, descendants);
    BOOST_CHECK_EQUAL(ancestors, 3ULL);
    BOOST_CHECK_EQUAL(descendants, 5ULL);
    pool.GetTransactionAncestry(ty1->GetId(), ancestors, descendants);
    BOOST_CHECK_EQUAL(ancestors, 1ULL);
    BOOST_CHECK_EQUAL(descendants, 6ULL);
    pool.GetTransactionAncestry(ty2->GetId(), ancestors, descendants);
    BOOST_CHECK_EQUAL(ancestors, 2ULL);
    BOOST_CHECK_EQUAL(descendants, 6ULL);
    pool.GetTransactionAncestry(ty3->GetId(), ancestors, descendants);
    BOOST_CHECK_EQUAL(ancestors, 3ULL);
    BOOST_CHECK_EQUAL(descendants, 6ULL);
    pool.GetTransactionAncestry(ty4->GetId(), ancestors, descendants);
    BOOST_CHECK_EQUAL(ancestors, 4ULL);
    BOOST_CHECK_EQUAL(descendants, 6ULL);
    pool.GetTransactionAncestry(ty5->GetId(), ancestors, descendants);
    BOOST_CHECK_EQUAL(ancestors, 5ULL);
    BOOST_CHECK_EQUAL(descendants, 6ULL);
    pool.GetTransactionAncestry(ty6->GetId(), ancestors, descendants);
    BOOST_CHECK_EQUAL(ancestors, 9ULL);
    BOOST_CHECK_EQUAL(descendants, 6ULL);
}

BOOST_AUTO_TEST_SUITE_END()
