// Copyright (c) 2011-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <policy/fees.h>
#include <policy/policy.h>

#include <txmempool.h>
#include <uint256.h>
#include <util/time.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(policyestimator_tests, TestingSetup)

BOOST_AUTO_TEST_CASE(MempoolMinimumFeeEstimate) {
    CTxMemPool &mpool = *Assert(m_node.mempool);
    LOCK2(cs_main, mpool.cs);
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
                entry.Fee((j + 1) * DEFAULT_BLOCK_MIN_TX_FEE_PER_KB)
                    .Time(GetTime())
                    .Height(blocknum++)
                    .FromTx(tx));
            CTransactionRef ptx = mpool.get(txid);
            block.push_back(ptx);
        }
        DisconnectedBlockTransactions disconnectedBlocktxs;
        disconnectedBlocktxs.removeForBlock(block, mpool);
        block.clear();
    }

    // Check that the estimate is above the rolling minimum fee. This should be
    // true since we have not trimmed the mempool.
    BOOST_CHECK(mpool.GetMinFee(1) <= mpool.estimateFee());

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
        mpool.addUnchecked(entry.Fee((i + 1) * DEFAULT_BLOCK_MIN_TX_FEE_PER_KB)
                               .Time(GetTime())
                               .Height(blocknum)
                               .FromTx(tx));
    }

    // Trim to size. GetMinFee should be more than 10000 *
    // DEFAULT_BLOCK_MIN_TX_FEE_PER_KB, but the estimateFee should remain
    // unchanged.
    mpool.TrimToSize(1);
    BOOST_CHECK(mpool.GetMinFee(1) >=
                CFeeRate(10000 * DEFAULT_BLOCK_MIN_TX_FEE_PER_KB,
                         CTransaction(tx).GetTotalSize()));
    BOOST_CHECK_MESSAGE(mpool.estimateFee() == mpool.GetMinFee(1),
                        "Confirm blocks has failed");
}

BOOST_AUTO_TEST_SUITE_END()
