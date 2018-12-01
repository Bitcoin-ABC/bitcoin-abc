// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
#ifndef BITCOIN_POLICYESTIMATOR_H
#define BITCOIN_POLICYESTIMATOR_H

#include "amount.h"
#include "random.h"
#include "uint256.h"

#include <map>
#include <string>
#include <vector>

class CAutoFile;
class CFeeRate;
class CTxMemPoolEntry;
class CTxMemPool;

/** \class CBlockPolicyEstimator
 * The BlockPolicyEstimator is used for estimating the feerate needed for a
 * transaction to be included in a block within a certain number of blocks.
 *
 * At a high level the algorithm works by grouping transactions into buckets
 * based on having similar feerates and then tracking how long it takes
 * transactions in the various buckets to be mined. It operates under the
 * assumption that in general transactions of higher feerate will be included in
 * blocks before transactions of lower feerate. So for example if you wanted to
 * know what feerate you should put on a transaction to be included in a block
 * within the next 5 blocks, you would start by looking at the bucket with the
 * highest feerate transactions and verifying that a sufficiently high
 * percentage of them were confirmed within 5 blocks and then you would look at
 * the next highest feerate bucket, and so on, stopping at the last bucket to
 * pass the test. The average feerate of transactions in this bucket will give
 * you an indication of the lowest feerate you can put on a transaction and
 * still have a sufficiently high chance of being confirmed within your desired
 * 5 blocks.
 *
 * Here is a brief description of the implementation:
 * When a transaction enters the mempool, we track the height of the block chain
 * at entry. Whenever a block comes in, we count the number of transactions in
 * each bucket and the total amount of feerate paid in each bucket. Then we
 * calculate how many blocks Y it took each transaction to be mined and we track
 * an array of counters in each bucket for how long it to took transactions to
 * get confirmed from 1 to a max of 25 and we increment all the counters from Y
 * up to 25. This is because for any number Z>=Y the transaction was
 * successfully mined within Z blocks. We want to save a history of this
 * information, so at any time we have a counter of the total number of
 * transactions that happened in a given feerate bucket and the total number
 * that were confirmed in each number 1-25 blocks or less for any bucket. We
 * save this history by keeping an exponentially decaying moving average of each
 * one of these stats. Furthermore we also keep track of the number unmined (in
 * mempool) transactions in each bucket and for how many blocks they have been
 * outstanding and use that to increase the number of transactions we've seen in
 * that feerate bucket when calculating an estimate for any number of
 * confirmations below the number of blocks they've been outstanding.
 */

/**
 * We will instantiate an instance of this class to track transactions that were
 * included in a block. We will lump transactions into a bucket according to
 * their approximate feerate and then track how long it took for those txs to be
 * included in a block.
 *
 * The tracking of unconfirmed (mempool) transactions is completely independent
 * of the historical tracking of transactions that have been confirmed in a
 * block.
 */
class TxConfirmStats {
private:
    // Define the buckets we will group transactions into
    // The upper-bound of the range for the bucket (inclusive)
    std::vector<double> buckets;
    // Map of bucket upper-bound to index into all vectors by bucket
    std::map<double, unsigned int> bucketMap;

    // For each bucket X:
    // Count the total # of txs in each bucket
    // Track the historical moving average of this total over blocks
    std::vector<double> txCtAvg;
    // and calculate the total for the current block to update the moving
    // average
    std::vector<int> curBlockTxCt;

    // Count the total # of txs confirmed within Y blocks in each bucket
    // Track the historical moving average of theses totals over blocks
    // confAvg[Y][X]
    std::vector<std::vector<double>> confAvg;
    // and calculate the totals for the current block to update the moving
    // averages
    // curBlockConf[Y][X]
    std::vector<std::vector<int>> curBlockConf;

    // Sum the total feerate of all tx's in each bucket
    // Track the historical moving average of this total over blocks
    std::vector<double> avg;
    // and calculate the total for the current block to update the moving
    // average
    std::vector<double> curBlockVal;

    // Combine the conf counts with tx counts to calculate the confirmation %
    // for each Y,X. Combine the total value with the tx counts to calculate the
    // avg feerate per bucket
    double decay;

    // Mempool counts of outstanding transactions
    // For each bucket X, track the number of transactions in the mempool that
    // are unconfirmed for each possible confirmation value Y
    // unconfTxs[Y][X]
    std::vector<std::vector<int>> unconfTxs;
    // transactions still unconfirmed after MAX_CONFIRMS for each bucket
    std::vector<int> oldUnconfTxs;

public:
    /**
     * Initialize the data structures. This is called by BlockPolicyEstimator's
     * constructor with default values.
     * @param defaultBuckets contains the upper limits for the bucket boundaries
     * @param maxConfirms max number of confirms to track
     * @param decay how much to decay the historical moving average per block
     */
    void Initialize(std::vector<double> &defaultBuckets,
                    unsigned int maxConfirms, double decay);

    /**
     * Clear the state of the curBlock variables to start counting for the new
     * block.
     */
    void ClearCurrent(unsigned int nBlockHeight);

    /**
     * Record a new transaction data point in the current block stats
     * @param blocksToConfirm the number of blocks it took this transaction to
     * confirm
     * @param val the feerate of the transaction
     * @warning blocksToConfirm is 1-based and has to be >= 1
     */
    void Record(int blocksToConfirm, double val);

    /** Record a new transaction entering the mempool*/
    unsigned int NewTx(unsigned int nBlockHeight, double val);

    /** Remove a transaction from mempool tracking stats*/
    void removeTx(unsigned int entryHeight, unsigned int nBestSeenHeight,
                  unsigned int bucketIndex);

    /**
     * Update our estimates by decaying our historical moving average and
     * updating with the data gathered from the current block.
     */
    void UpdateMovingAverages();

    /**
     * Calculate a feerate estimate.  Find the lowest value bucket (or range of
     * buckets to make sure we have enough data points) whose transactions still
     * have sufficient likelihood of being confirmed within the target number of
     * confirmations
     * @param confTarget target number of confirmations
     * @param sufficientTxVal required average number of transactions per block
     * in a bucket range
     * @param minSuccess the success probability we require
     * @param requireGreater return the lowest feerate such that all higher
     * values pass minSuccess OR
     *        return the highest feerate such that all lower values fail
     * minSuccess
     * @param nBlockHeight the current block height
     */
    double EstimateMedianVal(int confTarget, double sufficientTxVal,
                             double minSuccess, bool requireGreater,
                             unsigned int nBlockHeight);

    /** Return the max number of confirms we're tracking */
    unsigned int GetMaxConfirms() { return confAvg.size(); }

    /** Write state of estimation data to a file*/
    void Write(CAutoFile &fileout);

    /**
     * Read saved state of estimation data from a file and replace all internal
     * data structures and variables with this state.
     */
    void Read(CAutoFile &filein);
};

/** Track confirm delays up to 25 blocks, can't estimate beyond that */
static const unsigned int MAX_BLOCK_CONFIRMS = 25;

/** Decay of .998 is a half-life of 346 blocks or about 2.4 days */
static const double DEFAULT_DECAY = .998;

/** Require greater than 95% of X feerate transactions to be confirmed within Y
 * blocks for X to be big enough */
static const double MIN_SUCCESS_PCT = .95;

/** Require an avg of 1 tx in the combined feerate bucket per block to have stat
 * significance */
static const double SUFFICIENT_FEETXS = 1;

// Minimum and Maximum values for tracking feerates
static constexpr Amount MIN_FEERATE(10 * SATOSHI);
static const Amount MAX_FEERATE(int64_t(1e7) * SATOSHI);
static const Amount INF_FEERATE(MAX_MONEY);
static const Amount INF_PRIORITY(int64_t(1e9) * MAX_MONEY);

// We have to lump transactions into buckets based on feerate, but we want to be
// able to give accurate estimates over a large range of potential feerates.
// Therefore it makes sense to exponentially space the buckets
/** Spacing of FeeRate buckets */
static const double FEE_SPACING = 1.1;

/**
 * We want to be able to estimate feerates that are needed on tx's to be
 * included in a certain number of blocks.  Every time a block is added to the
 * best chain, this class records stats on the transactions included in that
 * block
 */
class CBlockPolicyEstimator {
public:
    /**
     * Create new BlockPolicyEstimator and initialize stats tracking classes
     * with default values.
     */
    CBlockPolicyEstimator();

    /** Process all the transactions that have been included in a block */
    void processBlock(unsigned int nBlockHeight,
                      std::vector<const CTxMemPoolEntry *> &entries);

    /** Process a transaction confirmed in a block*/
    bool processBlockTx(unsigned int nBlockHeight,
                        const CTxMemPoolEntry *entry);

    /** Process a transaction accepted to the mempool*/
    void processTransaction(const CTxMemPoolEntry &entry,
                            bool validFeeEstimate);

    /** Remove a transaction from the mempool tracking stats*/
    bool removeTx(uint256 hash);

    /** Return a feerate estimate */
    CFeeRate estimateFee(int confTarget);

    /** Estimate feerate needed to get be included in a block within
     *  confTarget blocks. If no answer can be given at confTarget, return an
     *  estimate at the lowest target where one can be given.
     */
    CFeeRate estimateSmartFee(int confTarget, int *answerFoundAtTarget,
                              const CTxMemPool &pool);

    /** Write estimation data to a file */
    void Write(CAutoFile &fileout);

    /** Read estimation data from a file */
    void Read(CAutoFile &filein, int nFileVersion);

private:
    //!< Passed to constructor to avoid dependency on main
    unsigned int nBestSeenHeight;
    struct TxStatsInfo {
        unsigned int blockHeight;
        unsigned int bucketIndex;
        TxStatsInfo() : blockHeight(0), bucketIndex(0) {}
    };

    // map of txids to information about that transaction
    std::map<uint256, TxStatsInfo> mapMemPoolTxs;

    /** Classes to track historical data on transaction confirmations */
    TxConfirmStats feeStats;

    unsigned int trackedTxs;
    unsigned int untrackedTxs;
};

class FeeFilterRounder {
public:
    /** Create new FeeFilterRounder */
    FeeFilterRounder(const CFeeRate &minIncrementalFee);

    /** Quantize a minimum fee for privacy purpose before broadcast **/
    Amount round(const Amount currentMinFee);

private:
    std::set<Amount> feeset;
    FastRandomContext insecure_rand;
};
#endif /*BITCOIN_POLICYESTIMATOR_H */
