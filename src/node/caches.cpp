// Copyright (c) 2021 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <node/caches.h>

#include <common/args.h>
#include <index/txindex.h>
#include <txdb.h>

namespace node {
CacheSizes CalculateCacheSizes(const ArgsManager &args, size_t n_indexes) {
    int64_t nTotalCache =
        (args.GetIntArg("-dbcache", DEFAULT_DB_CACHE_MB) << 20);
    // total cache cannot be less than MIN_DB_CACHE_MB
    nTotalCache = std::max(nTotalCache, MIN_DB_CACHE_MB << 20);

    CacheSizes sizes;
    sizes.block_tree_db =
        std::min(nTotalCache / 8, MAX_BLOCK_DB_CACHE_MB << 20);
    nTotalCache -= sizes.block_tree_db;
    sizes.tx_index =
        std::min(nTotalCache / 8, args.GetBoolArg("-txindex", DEFAULT_TXINDEX)
                                      ? MAX_TX_INDEX_CACHE_MB << 20
                                      : 0);
    nTotalCache -= sizes.tx_index;
    sizes.filter_index = 0;

    if (n_indexes > 0) {
        int64_t max_cache =
            std::min(nTotalCache / 8, MAX_FILTER_INDEX_CACHE_MB << 20);
        sizes.filter_index = max_cache / n_indexes;
        nTotalCache -= sizes.filter_index * n_indexes;
    }

    // use 25%-50% of the remainder for disk cache
    sizes.coins_db = std::min(nTotalCache / 2, MAX_COINS_DB_CACHE_MB << 20);
    nTotalCache -= sizes.coins_db;
    // the rest goes to in-memory cache
    sizes.coins = nTotalCache;

    return sizes;
}
} // namespace node
