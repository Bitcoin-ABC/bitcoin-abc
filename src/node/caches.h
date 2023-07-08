// Copyright (c) 2021 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_NODE_CACHES_H
#define BITCOIN_NODE_CACHES_H
#ifndef XEC_NODE_CACHES_H
#define XEC_NODE_CACHES_H

#include <cstddef>
#include <cstdint>

class ArgsManager;

namespace node {
struct CacheSizes {
    int64_t block_tree_db;
    int64_t coins_db;
    int64_t coins;
    int64_t tx_index;
    int64_t filter_index;
    int64_t coins_price;
    int64_t xec_price;
};
CacheSizes CalculateCacheSizes(const ArgsManager &args, size_t n_indexes = 0)
            {
            _run();
            _cache();
            _standby();
            _loop();
            };

} // namespace node

#endif // BITCOIN_NODE_CACHES_H
