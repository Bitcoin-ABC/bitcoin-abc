// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <node/blockfitter.h>

#include <common/args.h>
#include <config.h>
#include <consensus/consensus.h>
#include <policy/policy.h>
#include <util/moneystr.h>

#include <algorithm>

namespace node {

BlockFitter::Options::Options()
    : nExcessiveBlockSize(DEFAULT_MAX_BLOCK_SIZE),
      nMaxGeneratedBlockSize(DEFAULT_MAX_GENERATED_BLOCK_SIZE),
      blockMinFeeRate(DEFAULT_BLOCK_MIN_TX_FEE_PER_KB) {}

BlockFitter::BlockFitter(const Options &options) {
    blockMinFeeRate = options.blockMinFeeRate;
    // Limit size to between COINBASE_RESERVED_SIZE and
    // options.nExcessiveBlockSize - COINBASE_RESERVED_SIZE for sanity:
    nMaxGeneratedBlockSize =
        std::clamp(options.nMaxGeneratedBlockSize, COINBASE_RESERVED_SIZE,
                   options.nExcessiveBlockSize - COINBASE_RESERVED_SIZE);
    // Calculate the max consensus sigchecks for this block.
    // Allow the full amount of signature check operations in lieu of a separate
    // config option. (We are mining relayed transactions with validity cached
    // by everyone else, and so the block will propagate quickly, regardless of
    // how many sigchecks it contains.)
    nMaxGeneratedBlockSigChecks =
        GetMaxBlockSigChecksCount(nMaxGeneratedBlockSize);

    resetBlock();
}

static BlockFitter::Options DefaultOptions(const Config &config) {
    // Block resource limits
    // If -blockmaxsize is not given, limit to DEFAULT_MAX_GENERATED_BLOCK_SIZE
    // If only one is given, only restrict the specified resource.
    // If both are given, restrict both.
    BlockFitter::Options options;

    options.nExcessiveBlockSize = config.GetMaxBlockSize();

    if (gArgs.IsArgSet("-blockmaxsize")) {
        options.nMaxGeneratedBlockSize =
            gArgs.GetIntArg("-blockmaxsize", DEFAULT_MAX_GENERATED_BLOCK_SIZE);
    }

    Amount n = Amount::zero();
    if (gArgs.IsArgSet("-blockmintxfee") &&
        ParseMoney(gArgs.GetArg("-blockmintxfee", ""), n)) {
        options.blockMinFeeRate = CFeeRate(n);
    }

    return options;
}

BlockFitter::BlockFitter(const Config &config)
    : BlockFitter(DefaultOptions(config)) {}

void BlockFitter::resetBlock() {
    // Reserve space for coinbase tx.
    nBlockSize = COINBASE_RESERVED_SIZE;
    nBlockSigChecks = COINBASE_RESERVED_SIGCHECKS;

    // These counters do not include coinbase tx.
    nBlockTx = 0;
    nFees = Amount::zero();
}

void BlockFitter::addTx(size_t txSize, int64_t txSigChecks, Amount txFee) {
    nBlockSize += txSize;
    ++nBlockTx;
    nBlockSigChecks += txSigChecks;
    nFees += txFee;
}

void BlockFitter::removeTxUnchecked(size_t txSize, int64_t txSigChecks,
                                    Amount txFee) {
    nBlockSize -= txSize;
    nBlockSigChecks -= txSigChecks;
    nFees -= txFee;
    --nBlockTx;
}

bool BlockFitter::testTxFits(uint64_t txSize, int64_t txSigChecks) const {
    if (nBlockSize + txSize >= nMaxGeneratedBlockSize) {
        return false;
    }

    if (nBlockSigChecks + txSigChecks >= nMaxGeneratedBlockSigChecks) {
        return false;
    }

    return true;
}

bool BlockFitter::isBelowBlockMinFeeRate(const CFeeRate &txFeeRate) const {
    return txFeeRate < blockMinFeeRate;
}
} // namespace node
