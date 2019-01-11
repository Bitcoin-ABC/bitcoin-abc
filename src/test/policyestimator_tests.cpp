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

BOOST_AUTO_TEST_CASE(BlockPolicyEstimates) {
    CTxMemPool mpool;
    TestMemPoolEntryHelper entry;
    Amount basefee = 2000 * SATOSHI;
    Amount deltaFee = 100 * SATOSHI;
    std::vector<Amount> feeV;

    // Populate vectors of increasing fees
    for (int j = 0; j < 10; j++) {
        feeV.push_back((j + 1) * basefee);
    }

    // Store the hashes of transactions that have been added to the mempool by
    // their associate fee txIds[j] is populated with transactions either of
    // fee = basefee * (j+1)
    std::array<std::vector<TxId>, 10> txIds;

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
    CFeeRate baseRate(basefee, CTransaction(tx).GetTotalSize());

    // Create a fake block
    std::vector<CTransactionRef> block;
    int blocknum = 0;

    // Loop through 200 blocks
    // At a decay .998 and 4 fee transactions per block
    // This makes the tx count about 1.33 per bucket, above the 1 threshold
    while (blocknum < 200) {
        // For each fee
        for (size_t j = 0; j < txIds.size(); j++) {
            // add 4 fee txs
            for (int k = 0; k < 4; k++) {
                // make transaction unique
                tx.vin[0].nSequence = 10000 * blocknum + 100 * j + k;
                TxId txid = tx.GetId();
                mpool.addUnchecked(txid, entry.Fee(feeV[j])
                                             .Time(GetTime())
                                             .Priority(0)
                                             .Height(blocknum)
                                             .FromTx(tx, &mpool));
                txIds[j].push_back(txid);
            }
        }
        // Create blocks where higher fee txs are included more often
        for (size_t h = 0; h <= blocknum % txIds.size(); h++) {
            // 10/10 blocks add highest fee transactions
            // 9/10 blocks add 2nd highest and so on until ...
            // 1/10 blocks add lowest fee transactions
            size_t i = txIds.size() - h - 1;
            while (txIds[i].size()) {
                CTransactionRef ptx = mpool.get(txIds[i].back());
                if (ptx) {
                    block.push_back(ptx);
                }
                txIds[i].pop_back();
            }
        }
        mpool.removeForBlock(block, ++blocknum);
        block.clear();
        if (blocknum == 30) {
            // At this point we should need to combine 5 buckets to get enough
            // data points. So estimateFee(1,2,3) should fail and estimateFee(4)
            // should return somewhere around 8*baserate.  estimateFee(4) %'s
            // are 100,100,100,100,90 = average 98%
            BOOST_CHECK(mpool.estimateFee(1) == CFeeRate(Amount::zero()));
            BOOST_CHECK(mpool.estimateFee(2) == CFeeRate(Amount::zero()));
            BOOST_CHECK(mpool.estimateFee(3) == CFeeRate(Amount::zero()));
            BOOST_CHECK(mpool.estimateFee(4).GetFeePerK() <
                        8 * baseRate.GetFeePerK() + deltaFee);
            BOOST_CHECK(mpool.estimateFee(4).GetFeePerK() >
                        8 * baseRate.GetFeePerK() - deltaFee);
            int answerFound;
            BOOST_CHECK(mpool.estimateSmartFee(1, &answerFound) ==
                            mpool.estimateFee(4) &&
                        answerFound == 4);
            BOOST_CHECK(mpool.estimateSmartFee(3, &answerFound) ==
                            mpool.estimateFee(4) &&
                        answerFound == 4);
            BOOST_CHECK(mpool.estimateSmartFee(4, &answerFound) ==
                            mpool.estimateFee(4) &&
                        answerFound == 4);
            BOOST_CHECK(mpool.estimateSmartFee(8, &answerFound) ==
                            mpool.estimateFee(8) &&
                        answerFound == 8);
        }
    }

    std::vector<Amount> origFeeEst;
    // Highest feerate is 10*baseRate and gets in all blocks, second highest
    // feerate is 9*baseRate and gets in 9/10 blocks = 90%, third highest
    // feerate is 8*base rate, and gets in 8/10 blocks = 80%, so estimateFee(1)
    // would return 10*baseRate but is hardcoded to return failure. Second
    // highest feerate has 100% chance of being included by 2 blocks, so
    // estimateFee(2) should return 9*baseRate etc...
    for (int i = 1; i < 10; i++) {
        origFeeEst.push_back(mpool.estimateFee(i).GetFeePerK());
        // Fee estimates should be monotonically decreasing
        if (i > 2) {
            BOOST_CHECK(origFeeEst[i - 1] <= origFeeEst[i - 2]);
        }
        int mult = 11 - i;
        if (i > 1) {
            BOOST_CHECK(origFeeEst[i - 1] <
                        mult * baseRate.GetFeePerK() + deltaFee);
            BOOST_CHECK(origFeeEst[i - 1] >
                        mult * baseRate.GetFeePerK() - deltaFee);
        } else {
            BOOST_CHECK(origFeeEst[i - 1] ==
                        CFeeRate(Amount::zero()).GetFeePerK());
        }
    }

    // Mine 50 more blocks with no transactions happening, estimates shouldn't
    // change. We haven't decayed the moving average enough so we still have
    // enough data points in every bucket
    while (blocknum < 250) {
        mpool.removeForBlock(block, ++blocknum);
    }

    BOOST_CHECK(mpool.estimateFee(1) == CFeeRate(Amount::zero()));
    for (int i = 2; i < 10; i++) {
        BOOST_CHECK(mpool.estimateFee(i).GetFeePerK() <
                    origFeeEst[i - 1] + deltaFee);
        BOOST_CHECK(mpool.estimateFee(i).GetFeePerK() >
                    origFeeEst[i - 1] - deltaFee);
    }

    // Mine 15 more blocks with lots of transactions happening and not getting
    // mined. Estimates should go up
    while (blocknum < 265) {
        // For each fee multiple
        for (size_t j = 0; j < txIds.size(); j++) {
            // add 4 fee txs
            for (int k = 0; k < 4; k++) {
                tx.vin[0].nSequence = 10000 * blocknum + 100 * j + k;
                TxId txid = tx.GetId();
                mpool.addUnchecked(txid, entry.Fee(feeV[j])
                                             .Time(GetTime())
                                             .Priority(0)
                                             .Height(blocknum)
                                             .FromTx(tx, &mpool));
                txIds[j].push_back(txid);
            }
        }
        mpool.removeForBlock(block, ++blocknum);
    }

    int answerFound;
    for (int i = 1; i < 10; i++) {
        BOOST_CHECK(mpool.estimateFee(i) == CFeeRate(Amount::zero()) ||
                    mpool.estimateFee(i).GetFeePerK() >
                        origFeeEst[i - 1] - deltaFee);
        Amount a1 = mpool.estimateSmartFee(i, &answerFound).GetFeePerK();
        Amount a2 = origFeeEst[answerFound - 1] - deltaFee;
        BOOST_CHECK(a1 > a2);
    }

    // Mine all those transactions
    // Estimates should still not be below original
    for (size_t j = 0; j < txIds.size(); j++) {
        while (txIds[j].size()) {
            CTransactionRef ptx = mpool.get(txIds[j].back());
            if (ptx) {
                block.push_back(ptx);
            }
            txIds[j].pop_back();
        }
    }
    mpool.removeForBlock(block, 265);
    block.clear();
    BOOST_CHECK(mpool.estimateFee(1) == CFeeRate(Amount::zero()));
    for (int i = 2; i < 10; i++) {
        BOOST_CHECK(mpool.estimateFee(i).GetFeePerK() >
                    origFeeEst[i - 1] - deltaFee);
    }

    // Mine 200 more blocks where everything is mined every block
    // Estimates should be below original estimates
    while (blocknum < 465) {
        // For each fee multiple
        for (size_t j = 0; j < txIds.size(); j++) {
            // add 4 fee txs
            for (int k = 0; k < 4; k++) {
                tx.vin[0].nSequence = 10000 * blocknum + 100 * j + k;
                TxId txid = tx.GetId();
                mpool.addUnchecked(txid, entry.Fee(feeV[j])
                                             .Time(GetTime())
                                             .Priority(0)
                                             .Height(blocknum)
                                             .FromTx(tx, &mpool));
                CTransactionRef ptx = mpool.get(txid);
                if (ptx) {
                    block.push_back(ptx);
                }
            }
        }
        mpool.removeForBlock(block, ++blocknum);
        block.clear();
    }
    BOOST_CHECK(mpool.estimateFee(1) == CFeeRate(Amount::zero()));
    for (int i = 2; i < 10; i++) {
        BOOST_CHECK(mpool.estimateFee(i).GetFeePerK() <
                    origFeeEst[i - 1] - deltaFee);
    }

    // Test that if the mempool is limited, estimateSmartFee won't return a
    // value below the mempool min
    mpool.addUnchecked(
        tx.GetId(),
        entry.Fee(feeV[5]).Time(GetTime()).Priority(0).Height(blocknum).FromTx(
            tx, &mpool));
    // evict that transaction which should set a mempool min fee of
    // minRelayTxFee + feeV[5]
    mpool.TrimToSize(1);
    BOOST_CHECK(mpool.GetMinFee(1).GetFeePerK() > feeV[5]);
    for (int i = 1; i < 10; i++) {
        BOOST_CHECK(mpool.estimateSmartFee(i).GetFeePerK() >=
                    mpool.estimateFee(i).GetFeePerK());
        BOOST_CHECK(mpool.estimateSmartFee(i).GetFeePerK() >=
                    mpool.GetMinFee(1).GetFeePerK());
    }
}

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
