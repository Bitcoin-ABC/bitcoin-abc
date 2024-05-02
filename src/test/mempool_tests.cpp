// Copyright (c) 2011-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <txmempool.h>

#include <kernel/disconnected_transactions.h>
#include <kernel/mempool_entry.h>
#include <policy/settings.h>
#include <reverse_iterator.h>
#include <util/system.h>
#include <util/time.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

#include <algorithm>
#include <vector>

BOOST_FIXTURE_TEST_SUITE(mempool_tests, TestingSetup)

static constexpr auto REMOVAL_REASON_DUMMY = MemPoolRemovalReason::CONFLICT;

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

    CTxMemPool &testPool = *Assert(m_node.mempool);
    LOCK2(::cs_main, testPool.cs);

    // Nothing in pool, remove should do nothing:
    unsigned int poolSize = testPool.size();
    testPool.removeRecursive(CTransaction(txParent), REMOVAL_REASON_DUMMY);
    BOOST_CHECK_EQUAL(testPool.size(), poolSize);

    // Just the parent:
    testPool.addUnchecked(entry.FromTx(txParent));
    poolSize = testPool.size();
    testPool.removeRecursive(CTransaction(txParent), REMOVAL_REASON_DUMMY);
    BOOST_CHECK_EQUAL(testPool.size(), poolSize - 1);

    // Parent, children, grandchildren:
    testPool.addUnchecked(entry.FromTx(txParent));
    for (int i = 0; i < 3; i++) {
        testPool.addUnchecked(entry.FromTx(txChild[i]));
        testPool.addUnchecked(entry.FromTx(txGrandChild[i]));
    }
    // Remove Child[0], GrandChild[0] should be removed:
    poolSize = testPool.size();
    testPool.removeRecursive(CTransaction(txChild[0]), REMOVAL_REASON_DUMMY);
    BOOST_CHECK_EQUAL(testPool.size(), poolSize - 2);
    // ... make sure grandchild and child are gone:
    poolSize = testPool.size();
    testPool.removeRecursive(CTransaction(txGrandChild[0]),
                             REMOVAL_REASON_DUMMY);
    BOOST_CHECK_EQUAL(testPool.size(), poolSize);
    poolSize = testPool.size();
    testPool.removeRecursive(CTransaction(txChild[0]), REMOVAL_REASON_DUMMY);
    BOOST_CHECK_EQUAL(testPool.size(), poolSize);
    // Remove parent, all children/grandchildren should go:
    poolSize = testPool.size();
    testPool.removeRecursive(CTransaction(txParent), REMOVAL_REASON_DUMMY);
    BOOST_CHECK_EQUAL(testPool.size(), poolSize - 5);
    BOOST_CHECK_EQUAL(testPool.size(), 0UL);

    // Add children and grandchildren, but NOT the parent (simulate the parent
    // being in a block)
    for (int i = 0; i < 3; i++) {
        testPool.addUnchecked(entry.FromTx(txChild[i]));
        testPool.addUnchecked(entry.FromTx(txGrandChild[i]));
    }

    // Now remove the parent, as might happen if a block-re-org occurs but the
    // parent cannot be put into the mempool (maybe because it is non-standard):
    poolSize = testPool.size();
    testPool.removeRecursive(CTransaction(txParent), REMOVAL_REASON_DUMMY);
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

    CTxMemPool &testPool = *Assert(m_node.mempool);
    LOCK2(cs_main, testPool.cs);

    // Nothing in pool, clear should do nothing:
    testPool.clear();
    BOOST_CHECK_EQUAL(testPool.size(), 0UL);

    // Add the transaction
    testPool.addUnchecked(entry.FromTx(txParent));
    BOOST_CHECK_EQUAL(testPool.size(), 1UL);
    BOOST_CHECK_EQUAL(testPool.mapTx.size(), 1UL);
    BOOST_CHECK_EQUAL(testPool.mapNextTx.size(), 1UL);

    // CTxMemPool's members should be empty after a clear
    testPool.clear();
    BOOST_CHECK_EQUAL(testPool.size(), 0UL);
    BOOST_CHECK_EQUAL(testPool.mapTx.size(), 0UL);
    BOOST_CHECK_EQUAL(testPool.mapNextTx.size(), 0UL);
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
        BOOST_CHECK_MESSAGE((*it)->GetTx().GetId().ToString() ==
                                sortedOrder[count],
                            (*it)->GetTx().GetId().ToString()
                                << " != " << sortedOrder[count] << " in test "
                                << testcase << ":" << count);
    }
}

BOOST_AUTO_TEST_CASE(MempoolIndexingTest) {
    CTxMemPool &pool = *Assert(m_node.mempool);
    LOCK2(cs_main, pool.cs);
    TestMemPoolEntryHelper entry;

    /**
     * Remove the default nonzero sigChecks, since the below tests are
     * focussing on fee-based ordering and involve some artificially very tiny
     * 21-byte transactions without any inputs.
     */
    entry.SigChecks(0);

    /* 3rd highest fee */
    CMutableTransaction tx1 = CMutableTransaction();
    tx1.vout.resize(1);
    tx1.vout[0].scriptPubKey = CScript() << OP_11 << OP_EQUAL;
    tx1.vout[0].nValue = 10 * COIN;

    /* highest fee */
    CMutableTransaction tx2 = CMutableTransaction();
    tx2.vout.resize(1);
    tx2.vout[0].scriptPubKey = CScript() << OP_11 << OP_EQUAL;
    tx2.vout[0].nValue = 2 * COIN;
    pool.addUnchecked(entry.Fee(20000 * SATOSHI).FromTx(tx2));

    /* lowest fee */
    CMutableTransaction tx3 = CMutableTransaction();
    tx3.vout.resize(1);
    tx3.vout[0].scriptPubKey = CScript() << OP_11 << OP_EQUAL;
    tx3.vout[0].nValue = 5 * COIN;
    pool.addUnchecked(entry.Fee(Amount::zero()).FromTx(tx3));

    /* 2nd highest fee */
    CMutableTransaction tx4 = CMutableTransaction();
    tx4.vout.resize(1);
    tx4.vout[0].scriptPubKey = CScript() << OP_11 << OP_EQUAL;
    tx4.vout[0].nValue = 6 * COIN;
    pool.addUnchecked(entry.Fee(15000 * SATOSHI).FromTx(tx4));

    /* equal fee rate to tx1, but arrived later to the mempool */
    CMutableTransaction tx5 = CMutableTransaction();
    tx5.vout.resize(1);
    tx5.vout[0].scriptPubKey = CScript() << OP_11 << OP_EQUAL;
    tx5.vout[0].nValue = 11 * COIN;
    pool.addUnchecked(entry.Fee(10000 * SATOSHI).Time(100).FromTx(tx1));
    pool.addUnchecked(entry.Fee(10000 * SATOSHI).Time(200).FromTx(tx5));
    BOOST_CHECK_EQUAL(pool.size(), 5UL);

    std::vector<std::string> sortedOrder;
    sortedOrder.resize(5);
    sortedOrder[0] = tx2.GetId().ToString(); // 20000
    sortedOrder[1] = tx4.GetId().ToString(); // 15000
    sortedOrder[3] = tx5.GetId().ToString(); // 10000
    sortedOrder[2] = tx1.GetId().ToString(); // 10000
    sortedOrder[4] = tx3.GetId().ToString(); // 0
    CheckSort<modified_feerate>(pool, sortedOrder, "MempoolIndexingTest1");
}

BOOST_AUTO_TEST_CASE(MempoolSizeLimitTest) {
    CTxMemPool &pool = *Assert(m_node.mempool);
    LOCK2(cs_main, pool.cs);
    TestMemPoolEntryHelper entry;
    Amount feeIncrement = MEMPOOL_FULL_FEE_INCREMENT.GetFeePerK();

    CMutableTransaction tx1 = CMutableTransaction();
    tx1.vin.resize(1);
    tx1.vin[0].scriptSig = CScript() << OP_1;
    tx1.vout.resize(1);
    tx1.vout[0].scriptPubKey = CScript() << OP_1 << OP_EQUAL;
    tx1.vout[0].nValue = 10 * COIN;
    pool.addUnchecked(entry.Fee(20000 * SATOSHI).FromTx(tx1));

    CMutableTransaction tx2 = CMutableTransaction();
    tx2.vin.resize(1);
    tx2.vin[0].scriptSig = CScript() << OP_2;
    tx2.vout.resize(1);
    tx2.vout[0].scriptPubKey = CScript() << OP_2 << OP_EQUAL;
    tx2.vout[0].nValue = 10 * COIN;
    pool.addUnchecked(entry.Fee(4000 * SATOSHI).FromTx(tx2));

    // should do nothing
    pool.TrimToSize(pool.DynamicMemoryUsage());
    BOOST_CHECK(pool.exists(tx1.GetId()));
    BOOST_CHECK(pool.exists(tx2.GetId()));

    // should remove the lower-feerate transaction
    pool.TrimToSize(pool.DynamicMemoryUsage() * 3 / 4);
    BOOST_CHECK(pool.exists(tx1.GetId()));
    BOOST_CHECK(!pool.exists(tx2.GetId()));

    pool.addUnchecked(entry.FromTx(tx2));
    CMutableTransaction tx3 = CMutableTransaction();
    tx3.vin.resize(1);
    tx3.vin[0].prevout = COutPoint(tx2.GetId(), 0);
    tx3.vin[0].scriptSig = CScript() << OP_2;
    tx3.vout.resize(1);
    tx3.vout[0].scriptPubKey = CScript() << OP_3 << OP_EQUAL;
    tx3.vout[0].nValue = 10 * COIN;
    pool.addUnchecked(entry.Fee(16000 * SATOSHI).FromTx(tx3));

    // tx2 should be removed, tx3 is a child of tx2, so it should be removed
    // even though it has highest fee.
    pool.TrimToSize(pool.DynamicMemoryUsage() * 3 / 4);
    BOOST_CHECK(pool.exists(tx1.GetId()));
    BOOST_CHECK(!pool.exists(tx2.GetId()));
    BOOST_CHECK(!pool.exists(tx3.GetId()));

    // mempool is limited to tx1's size in memory usage, so nothing fits
    std::vector<COutPoint> vNoSpendsRemaining;
    pool.TrimToSize(CTransaction(tx1).GetTotalSize(), &vNoSpendsRemaining);
    BOOST_CHECK(!pool.exists(tx1.GetId()));
    BOOST_CHECK(!pool.exists(tx2.GetId()));
    BOOST_CHECK(!pool.exists(tx3.GetId()));
    // This vector should only contain 'root' (not unconfirmed) outpoints
    // Though both tx2 and tx3 were removed, tx3's input came from tx2.
    BOOST_CHECK_EQUAL(vNoSpendsRemaining.size(), 1);
    BOOST_CHECK(vNoSpendsRemaining == std::vector<COutPoint>{COutPoint()});

    // maxFeeRateRemoved was set by the transaction with the highest fee,
    // that was not removed because it was a child of another tx.
    CFeeRate maxFeeRateRemoved(20000 * SATOSHI,
                               CTransaction(tx1).GetTotalSize());
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

    pool.addUnchecked(entry.Fee(7000 * SATOSHI).FromTx(tx4));
    pool.addUnchecked(entry.Fee(1000 * SATOSHI).FromTx(tx5));
    pool.addUnchecked(entry.Fee(1100 * SATOSHI).FromTx(tx6));
    pool.addUnchecked(entry.Fee(9000 * SATOSHI).FromTx(tx7));

    // we only require this to remove, at max, 2 txn, because it's not clear
    // what we're really optimizing for aside from that
    pool.TrimToSize(pool.DynamicMemoryUsage() - 1);
    BOOST_CHECK(pool.exists(tx4.GetId()));
    BOOST_CHECK(pool.exists(tx6.GetId()));
    BOOST_CHECK(!pool.exists(tx7.GetId()));

    if (!pool.exists(tx5.GetId())) {
        pool.addUnchecked(entry.Fee(1000 * SATOSHI).FromTx(tx5));
    }
    pool.addUnchecked(entry.Fee(9000 * SATOSHI).FromTx(tx7));

    // should maximize mempool size by only removing 5/7
    pool.TrimToSize(pool.DynamicMemoryUsage() / 2);
    BOOST_CHECK(pool.exists(tx4.GetId()));
    BOOST_CHECK(!pool.exists(tx5.GetId()));
    BOOST_CHECK(pool.exists(tx6.GetId()));
    BOOST_CHECK(!pool.exists(tx7.GetId()));

    pool.addUnchecked(entry.Fee(1000 * SATOSHI).FromTx(tx5));
    pool.addUnchecked(entry.Fee(9000 * SATOSHI).FromTx(tx7));

    std::vector<CTransactionRef> vtx;
    SetMockTime(42);
    SetMockTime(42 + CTxMemPool::ROLLING_FEE_HALFLIFE);
    BOOST_CHECK_EQUAL(pool.GetMinFee(1).GetFeePerK(),
                      maxFeeRateRemoved.GetFeePerK() + feeIncrement);
    // ... we should keep the same min fee until we get a block
    DisconnectedBlockTransactions disconnectedBlockTxs;
    disconnectedBlockTxs.removeForBlock(vtx, pool);
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
            CTxMemPool &testPool = *Assert(m_node.mempool);
            // addForBlock inserts disconnectTxns in disconnectPool. They
            // simulate transactions that were once confirmed in a block
            std::vector<CTransactionRef> vtx;
            for (auto tx : disconnectedTxns) {
                vtx.push_back(MakeTransactionRef(*tx));
            }
            DisconnectedBlockTransactions disconnectPool;
            LOCK2(cs_main, testPool.cs);
            {
                disconnectPool.addForBlock(vtx, testPool);
                CheckDisconnectPoolOrder(disconnectPool, correctlyOrderedIds,
                                         disconnectedTxns.size());

                // If the mempool is empty, importMempool doesn't change
                // disconnectPool
                disconnectPool.importMempool(testPool);
                CheckDisconnectPoolOrder(disconnectPool, correctlyOrderedIds,
                                         disconnectedTxns.size());

                // Add all unconfirmed transactions in testPool
                for (auto tx : unconfTxns) {
                    TestMemPoolEntryHelper entry;
                    testPool.addUnchecked(entry.FromTx(*tx));
                }

                // Now we test importMempool with a non empty mempool
                disconnectPool.importMempool(testPool);
            }
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

BOOST_AUTO_TEST_CASE(GetModifiedFeeRateTest) {
    CMutableTransaction tx = CMutableTransaction();
    tx.vin.resize(1);

    // Make tx exactly 1000 bytes.
    const size_t dummyDataSize =
        1000 -
        (GetSerializeSize(tx, PROTOCOL_VERSION) + 5 /* OP_PUSHDATA2 and ?? */);

    tx.vin[0].scriptSig << std::vector<uint8_t>(dummyDataSize);
    assert(GetSerializeSize(tx, PROTOCOL_VERSION) == 1000);

    TestMemPoolEntryHelper entry;

    auto entryNormal = entry.Fee(1000 * SATOSHI).FromTx(tx);
    BOOST_CHECK_EQUAL(1000 * SATOSHI,
                      entryNormal->GetModifiedFeeRate().GetFee(1000));

    // Add modified fee
    CTxMemPoolEntryRef entryFeeModified = entry.Fee(1000 * SATOSHI).FromTx(tx);
    entryFeeModified->UpdateFeeDelta(1000 * SATOSHI);
    BOOST_CHECK_EQUAL(2000 * SATOSHI,
                      entryFeeModified->GetModifiedFeeRate().GetFee(1000));

    // Excessive sigop count "modifies" size
    CTxMemPoolEntryRef entrySizeModified =
        entry.Fee(1000 * SATOSHI)
            .SigChecks(2000 / DEFAULT_BYTES_PER_SIGCHECK)
            .FromTx(tx);
    BOOST_CHECK_EQUAL(500 * SATOSHI,
                      entrySizeModified->GetModifiedFeeRate().GetFee(1000));
}

BOOST_AUTO_TEST_CASE(CompareTxMemPoolEntryByModifiedFeeRateTest) {
    CTransactionRef a = make_tx(/* output_values */ {1 * COIN});
    CTransactionRef b = make_tx(/* output_values */ {2 * COIN});

    // For this test, we want b to have lower txid.
    if (a->GetId() < b->GetId()) {
        std::swap(a, b);
    }
    BOOST_CHECK_GT(a->GetId(), b->GetId());

    TestMemPoolEntryHelper entry;
    CompareTxMemPoolEntryByModifiedFeeRate compare;

    auto checkOrdering = [&compare](const auto &a, const auto &b) {
        BOOST_CHECK(compare(a, b));
        BOOST_CHECK(!compare(b, a));
    };

    // If the fees and entryId are the same, lower TxId should sort before
    checkOrdering(entry.Fee(100 * SATOSHI).FromTx(b),
                  entry.Fee(100 * SATOSHI).FromTx(a));
    // Earlier entryId, same fee, should sort before
    checkOrdering(entry.Fee(100 * SATOSHI).EntryId(1).FromTx(a),
                  entry.Fee(100 * SATOSHI).EntryId(2).FromTx(b));
    // Higher fee, earlier entryId should sort before
    checkOrdering(entry.Fee(101 * SATOSHI).EntryId(1).FromTx(a),
                  entry.Fee(100 * SATOSHI).EntryId(2).FromTx(b));
    // Higher fee, same entryId should sort before
    checkOrdering(entry.Fee(101 * SATOSHI).FromTx(a),
                  entry.Fee(100 * SATOSHI).FromTx(b));

    // Same with fee delta.
    {
        CTxMemPoolEntryRef entryA = entry.Fee(100 * SATOSHI).FromTx(a);
        CTxMemPoolEntryRef entryB = entry.Fee(200 * SATOSHI).FromTx(b);
        // .. A and B have same modified fee, ordering is by lowest txid
        entryA->UpdateFeeDelta(100 * SATOSHI);
        checkOrdering(entryB, entryA);
    }
    // .. A is first entering the mempool
    CTxMemPoolEntryRef entryA = entry.Fee(100 * SATOSHI).EntryId(1).FromTx(a);
    CTxMemPoolEntryRef entryB = entry.Fee(100 * SATOSHI).EntryId(2).FromTx(b);
    checkOrdering(entryA, entryB);
    // .. B has higher modified fee.
    entryB->UpdateFeeDelta(1 * SATOSHI);
    checkOrdering(entryB, entryA);
}

BOOST_AUTO_TEST_CASE(remove_for_finalized_block) {
    CTxMemPool &pool = *Assert(m_node.mempool);
    TestMemPoolEntryHelper entry;

    LOCK2(cs_main, pool.cs);

    std::vector<CTransactionRef> txs;
    txs.reserve(100);
    for (size_t i = 0; i < 100; i++) {
        CTransactionRef tx = make_tx({int64_t(i + 1) * COIN});
        const TxId &txid = tx->GetId();
        auto mempoolEntry = entry.FromTx(tx);

        pool.addUnchecked(mempoolEntry);
        BOOST_CHECK(pool.exists(txid));

        BOOST_CHECK(pool.setAvalancheFinalized(mempoolEntry));
        BOOST_CHECK(pool.isAvalancheFinalized(txid));

        txs.push_back(std::move(tx));
    }

    std::vector<CTransactionRef> minedTxs(txs.begin(), txs.begin() + 50);
    pool.removeForFinalizedBlock(minedTxs);

    for (const auto &tx : minedTxs) {
        // No longer in the radix tree
        BOOST_CHECK(!pool.isAvalancheFinalized(tx->GetId()));
    }
    // Other txs are still there
    for (size_t i = 50; i < 100; i++) {
        BOOST_CHECK(pool.isAvalancheFinalized(txs[i]->GetId()));
    }

    // Repeat is no op
    pool.removeForFinalizedBlock(minedTxs);
    for (const auto &tx : minedTxs) {
        // No longer in the radix tree
        BOOST_CHECK(!pool.isAvalancheFinalized(tx->GetId()));
    }
    // Other txs are still there
    for (size_t i = 50; i < 100; i++) {
        BOOST_CHECK(pool.isAvalancheFinalized(txs[i]->GetId()));
    }

    // Remove them all
    pool.removeForFinalizedBlock(txs);
    for (const auto &tx : txs) {
        // No longer in the radix tree
        BOOST_CHECK(!pool.isAvalancheFinalized(tx->GetId()));
    }
}

BOOST_AUTO_TEST_SUITE_END()
