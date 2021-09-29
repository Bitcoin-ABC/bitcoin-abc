// Copyright (c) 2010 Satoshi Nakamoto
// Copyright (c) 2009-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_NODE_COINSTATS_H
#define BITCOIN_NODE_COINSTATS_H

#include <amount.h>
#include <primitives/blockhash.h>
#include <uint256.h>

#include <cstdint>
#include <functional>

class CCoinsView;

enum class CoinStatsHashType {
    HASH_SERIALIZED,
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
};

//! Calculate statistics about the unspent transaction output set
bool GetUTXOStats(CCoinsView *view, CCoinsStats &stats,
                  const CoinStatsHashType hash_type,
                  const std::function<void()> &interruption_point = {});

#endif // BITCOIN_NODE_COINSTATS_H
