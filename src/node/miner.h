// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_NODE_MINER_H
#define BITCOIN_NODE_MINER_H

#include <consensus/amount.h>
#include <kernel/mempool_entry.h>
#include <node/blockfitter.h>
#include <primitives/block.h>
#include <txmempool.h>

#include <boost/multi_index/ordered_index.hpp>
#include <boost/multi_index_container.hpp>

#include <cstdint>
#include <memory>
#include <optional>

class CBlockIndex;
class CChainParams;
class Config;
class CScript;

namespace Consensus {
struct Params;
}

namespace avalanche {
class Processor;
}

namespace node {
static const bool DEFAULT_PRINTPRIORITY = false;

struct CBlockTemplateEntry {
    CTransactionRef tx;
    Amount fees;
    int64_t sigChecks;

    CBlockTemplateEntry(CTransactionRef _tx, Amount _fees, int64_t _sigChecks)
        : tx(_tx), fees(_fees), sigChecks(_sigChecks){};
};

struct CBlockTemplate {
    CBlock block;

    std::vector<CBlockTemplateEntry> entries;
};

/** Generate a new block, without valid proof-of-work */
class BlockAssembler {
private:
    // The constructed block template
    std::unique_ptr<CBlockTemplate> pblocktemplate;

    BlockFitter blockFitter;

    // Chain context for the block
    int nHeight;
    int64_t m_lock_time_cutoff;
    const CChainParams &chainParams;

    const CTxMemPool *const m_mempool;
    Chainstate &m_chainstate;
    const avalanche::Processor *const m_avalanche;

    const bool fPrintPriority;

public:
    BlockAssembler(const Config &config, Chainstate &chainstate,
                   const CTxMemPool *mempool,
                   const avalanche::Processor *avalanche = nullptr);
    BlockAssembler(const node::BlockFitter &fitter, Chainstate &chainstate,
                   const CTxMemPool *mempool,
                   const avalanche::Processor *avalanche = nullptr);

    /** Construct a new block template with coinbase to scriptPubKeyIn */
    std::unique_ptr<CBlockTemplate>
    CreateNewBlock(const CScript &scriptPubKeyIn);

    uint64_t GetMaxGeneratedBlockSize() const {
        return blockFitter.getMaxGeneratedBlockSize();
    }

    static std::optional<int64_t> m_last_block_num_txs;
    static std::optional<int64_t> m_last_block_size;

private:
    // utility functions
    /** Clear the block's state and prepare for assembling a new block */
    void resetBlock();
    /** Add a tx to the block */
    void AddToBlock(const CTxMemPoolEntryRef &entry);

    // Methods for how to add transactions to a block.
    /**
     * Add transactions from the mempool based on individual tx feerate.
     */
    void addTxs(const CTxMemPool &mempool) EXCLUSIVE_LOCKS_REQUIRED(mempool.cs);

    /// Check the transaction for finality, etc before adding to block
    bool CheckTx(const CTransaction &tx) const;
};

int64_t UpdateTime(CBlockHeader *pblock, const CChainParams &chainParams,
                   const CBlockIndex *pindexPrev, int64_t adjustedTime);
} // namespace node

#endif // BITCOIN_NODE_MINER_H
