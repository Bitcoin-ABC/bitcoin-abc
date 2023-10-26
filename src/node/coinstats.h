// Copyright (c) 2010 Satoshi Nakamoto
// Copyright (c) 2009-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_NODE_COINSTATS_H
#define BITCOIN_NODE_COINSTATS_H

#include <chain.h>
#include <coins.h>
#include <consensus/amount.h>
#include <primitives/blockhash.h>
#include <streams.h>
#include <uint256.h>

#include <cstdint>
#include <functional>
#include <optional>

class CCoinsView;
namespace node {
class BlockManager;
} // namespace node

namespace node {
enum class CoinStatsHashType {
    HASH_SERIALIZED,
    MUHASH,
    NONE,
};

struct CCoinsStats {
    int nHeight{0};
    BlockHash hashBlock{};
    uint64_t nTransactions{0};
    uint64_t nTransactionOutputs{0};
    uint64_t nBogoSize{0};
    uint256 hashSerialized{};
    uint64_t nDiskSize{0};
    Amount nTotalAmount{Amount::zero()};

    //! The number of coins contained.
    uint64_t coins_count{0};

    //! Signals if the coinstatsindex was used to retrieve the statistics.
    bool index_used{false};

    // Following values are only available from coinstats index

    //! Total cumulative amount of block subsidies up to and including this
    //! block
    Amount total_subsidy{Amount::zero()};
    //! Total cumulative amount of unspendable coins up to and including this
    //! block
    Amount total_unspendable_amount{Amount::zero()};
    //! Total cumulative amount of prevouts spent up to and including this block
    Amount total_prevout_spent_amount{Amount::zero()};
    //! Total cumulative amount of outputs created up to and including this
    //! block
    Amount total_new_outputs_ex_coinbase_amount{Amount::zero()};
    //! Total cumulative amount of coinbase outputs up to and including this
    //! block
    Amount total_coinbase_amount{Amount::zero()};
    //! The unspendable coinbase amount from the genesis block
    Amount total_unspendables_genesis_block{Amount::zero()};
    //! The two unspendable coinbase outputs total amount caused by BIP30
    Amount total_unspendables_bip30{Amount::zero()};
    //! Total cumulative amount of outputs sent to unspendable scripts
    //! (OP_RETURN for example) up to and including this block
    Amount total_unspendables_scripts{Amount::zero()};
    //! Total cumulative amount of coins lost due to unclaimed miner rewards up
    //! to and including this block
    Amount total_unspendables_unclaimed_rewards{Amount::zero()};

    CCoinsStats() = default;
    CCoinsStats(int block_height, const BlockHash &block_hash);
};

/**
 * Calculate statistics about the unspent transaction output set
 *
 * @param[in] index_requested Signals if the coinstatsindex should be used (when
 * available).
 */
std::optional<CCoinsStats>
GetUTXOStats(CCoinsView *view, node::BlockManager &blockman,
             CoinStatsHashType hash_type,
             const std::function<void()> &interruption_point = {},
             const CBlockIndex *pindex = nullptr, bool index_requested = true);

uint64_t GetBogoSize(const CScript &script_pub_key);

CDataStream TxOutSer(const COutPoint &outpoint, const Coin &coin);

std::optional<CCoinsStats>
ComputeUTXOStats(CoinStatsHashType hash_type, CCoinsView *view,
                 BlockManager &blockman,
                 const std::function<void()> &interruption_point = {});
} // namespace node

#endif // BITCOIN_NODE_COINSTATS_H
