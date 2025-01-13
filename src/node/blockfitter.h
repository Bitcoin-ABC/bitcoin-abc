// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_NODE_BLOCKFITTER_H
#define BITCOIN_NODE_BLOCKFITTER_H

#include <consensus/amount.h>
#include <feerate.h>

#include <cstdint>

class Config;

namespace node {
/** Check for block limits when adding transactions */
class BlockFitter {
    // Configuration parameters for the block size
    uint64_t nMaxGeneratedBlockSize;
    uint64_t nMaxGeneratedBlockSigChecks;
    CFeeRate blockMinFeeRate;

public:
    static constexpr uint64_t COINBASE_RESERVED_SIZE{1000};
    static constexpr uint64_t COINBASE_RESERVED_SIGCHECKS{100};

    // Information on the current status of the block
    uint64_t nBlockSize;
    uint64_t nBlockTx;
    uint64_t nBlockSigChecks;
    Amount nFees;

    struct Options {
        Options();
        uint64_t nExcessiveBlockSize;
        uint64_t nMaxGeneratedBlockSize;
        CFeeRate blockMinFeeRate;
    };

    BlockFitter(const Options &options);
    BlockFitter(const Config &config);

    uint64_t getMaxGeneratedBlockSize() const { return nMaxGeneratedBlockSize; }

    /** Clear the block's state and prepare for assembling a new block */
    void resetBlock();

    /** Account for this tx */
    void addTx(size_t txSize, int64_t txSigChecks, Amount txFee);

    /** Test if a new Tx would "fit" in the block */
    bool testTxFits(uint64_t txSize, int64_t txSigChecks) const;

    /* Check if the tx feerate is enough to be included in the block */
    bool isBelowBlockMinFeeRate(const CFeeRate &txFeeRate) const;
};
} // namespace node

#endif // BITCOIN_NODE_BLOCKFITTER_H
