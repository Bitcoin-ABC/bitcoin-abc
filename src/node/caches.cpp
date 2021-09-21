// Copyright (c) 2021 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <node/caches.h>

#include <txdb.h>
#include <util/system.h>
#include <validation.h>

CacheSizes CalculateCacheSizes(const ArgsManager &args, size_t n_indexes) {
    int64_t nTotalCache =
        (args.GetIntArg("-dbcache", DEFAULT_DB_CACHE_MB) << 20);
    // total cache cannot be less than MIN_DB_CACHE_MB
    nTotalCache = std::max(nTotalCache, MIN_DB_CACHE_MB << 20);
    // total cache cannot be greater than MAX_DB_CACHE_MB
    nTotalCache = std::min(nTotalCache, MAX_DB_CACHE_MB << 20);
    int64_t nBlockTreeDBCache =
        std::min(nTotalCache / 8, MAX_BLOCK_DB_CACHE_MB << 20);
    nTotalCache -= nBlockTreeDBCache;
    int64_t nTxIndexCache =
        std::min(nTotalCache / 8, args.GetBoolArg("-txindex", DEFAULT_TXINDEX)
                                      ? MAX_TX_INDEX_CACHE_MB << 20
                                      : 0);
    nTotalCache -= nTxIndexCache;
    int64_t filter_index_cache = 0;
    if (n_indexes > 0) {
        int64_t max_cache =
            std::min(nTotalCache / 8, MAX_FILTER_INDEX_CACHE_MB << 20);
        filter_index_cache = max_cache / n_indexes;
        nTotalCache -= filter_index_cache * n_indexes;
    }
    // use 25%-50% of the remainder for disk cache
    int64_t nCoinDBCache =
        std::min(nTotalCache / 2, (nTotalCache / 4) + (1 << 23));
    // cap total coins db cache
    nCoinDBCache = std::min(nCoinDBCache, MAX_COINS_DB_CACHE_MB << 20);
    nTotalCache -= nCoinDBCache;
    // the rest goes to in-memory cache
    int64_t nCoinCacheUsage = nTotalCache;

    return {
        nBlockTreeDBCache, nCoinDBCache,       nCoinCacheUsage,
        nTxIndexCache,     filter_index_cache,
    };
}
