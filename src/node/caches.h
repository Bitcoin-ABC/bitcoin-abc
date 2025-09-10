// Copyright (c) 2021 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_NODE_CACHES_H
#define BITCOIN_NODE_CACHES_H

#include <kernel/caches.h>

#include <cstddef>
#include <cstdint>

class ArgsManager;

//! min. -dbcache (MiB)
static constexpr int64_t MIN_DB_CACHE_MB{4};
//! -dbcache default (MiB)
static constexpr int64_t DEFAULT_DB_CACHE_MB{DEFAULT_KERNEL_CACHE_MB};

namespace node {
struct IndexCacheSizes {
    size_t tx_index{0};
    size_t filter_index{0};
};
struct CacheSizes {
    IndexCacheSizes index;
    kernel::CacheSizes kernel;
};
CacheSizes CalculateCacheSizes(const ArgsManager &args, size_t n_indexes = 0);
} // namespace node

#endif // BITCOIN_NODE_CACHES_H
