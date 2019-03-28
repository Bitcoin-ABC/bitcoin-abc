// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "policy/fees.h"
#include "policy/policy.h"
#include "txmempool.h"
#include "uint256.h"
#include "util.h"

#include "test/test_bitcoin.h"

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(policyestimator_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(MempoolMinimumFeeEstimate) {
    CTxMemPool mpool;
    TestMemPoolEntryHelper entry;

    // Create a transaction template
    CScript garbage;
    for (unsigned int i = 0; i < 128; i++) {
        garbage.push_back('X');
    }

    CMutableTransaction tx;
    tx.vin.resize(1);
    tx.vin[0].scriptSig = garbage;
    tx.vout.resize(1);
    tx.vout[0].nValue = Amount::zero();

    // Create a fake block
    std::vector<CTransactionRef> block;
    int blocknum = 0;

    // Loop through 200 blocks adding transactions so we have a estimateFee
    // that is calculable.
    while (blocknum < 200) {
        for (int64_t j = 0; j < 100; j++) {
            // make transaction unique
            tx.vin[0].nSequence = 10000 * blocknum + j;
            TxId txid = tx.GetId();
            mpool.addUnchecked(
                txid, entry.Fee((j + 1) * DEFAULT_BLOCK_MIN_TX_FEE_PER_KB)
                          .Time(GetTime())
                          .Priority(0)
                          .Height(blocknum)
                          .FromTx(tx, &mpool));
            CTransactionRef ptx = mpool.get(txid);
            block.push_back(ptx);
        }
        mpool.removeForBlock(block, ++blocknum);
        block.clear();
    }

    // Check that the estimate is above the rolling minimum fee.  This should
    // be true since we have not trimmed the mempool.
    BOOST_CHECK(CFeeRate(Amount::zero()) == mpool.estimateFee(1));
    BOOST_CHECK(mpool.GetMinFee(1) <= mpool.estimateFee(2));
    BOOST_CHECK(mpool.GetMinFee(1) <= mpool.estimateFee(3));
    BOOST_CHECK(mpool.GetMinFee(1) <= mpool.estimateFee(4));
    BOOST_CHECK(mpool.GetMinFee(1) <= mpool.estimateFee(5));

    // Check that estimateFee returns the minimum rolling fee even when the
    // mempool grows very quickly and no blocks have been mined.

    // Add a bunch of low fee transactions which are not in the mempool
    // And have zero fees.
    CMutableTransaction mtx;
    tx.vin.resize(1);
    tx.vin[0].scriptSig = garbage;
    tx.vout.resize(1);
    block.clear();

    // Add tons of transactions to the mempool,
    // but don't mine them.
    for (int64_t i = 0; i < 10000; i++) {
        // Mutate the hash
        tx.vin[0].nSequence = 10000 * blocknum + i;
        // Add new transaction to the mempool with a increasing fee
        // The average should end up as 1/2 * 100 *
        // DEFAULT_BLOCK_MIN_TX_FEE_PER_KB
        mpool.addUnchecked(tx.GetId(),
                           entry.Fee((i + 1) * DEFAULT_BLOCK_MIN_TX_FEE_PER_KB)
                               .Time(GetTime())
                               .Priority(0)
                               .Height(blocknum)
                               .FromTx(tx, &mpool));
    }

    // Trim to size.  GetMinFee should be more than 10000 *
    // DEFAULT_BLOCK_MIN_TX_FEE_PER_KB But the estimateFee should be
    // unchanged.
    mpool.TrimToSize(1);

    BOOST_CHECK(mpool.GetMinFee(1) >=
                CFeeRate(10000 * DEFAULT_BLOCK_MIN_TX_FEE_PER_KB,
                         CTransaction(tx).GetTotalSize()));

    for (int i = 1; i < 10; i++) {
        BOOST_CHECK_MESSAGE(mpool.estimateFee(i) == mpool.GetMinFee(1),
                            "Confirm blocks has failed on iteration " << i);
    }
}

BOOST_AUTO_TEST_SUITE_END()
