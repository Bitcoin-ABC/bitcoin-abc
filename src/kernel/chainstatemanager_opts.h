// Copyright (c) 2022 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_KERNEL_CHAINSTATEMANAGER_OPTS_H
#define BITCOIN_KERNEL_CHAINSTATEMANAGER_OPTS_H

#include <kernel/notifications_interface.h>

#include <arith_uint256.h>
#include <avalanche/avalanche.h>
#include <dbwrapper.h>
#include <primitives/blockhash.h>
#include <script/scriptcache.h>
#include <script/sigcache.h>
#include <txdb.h>
#include <util/time.h>

#include <cstdint>
#include <functional>
#include <optional>

class Config;

static constexpr bool DEFAULT_CHECKPOINTS_ENABLED{true};
static constexpr auto DEFAULT_MAX_TIP_AGE{24h};
static constexpr int DEFAULT_STOPATHEIGHT{0};
static constexpr bool DEFAULT_STORE_RECENT_HEADERS_TIME{false};
static constexpr bool DEFAULT_PARK_DEEP_REORG{true};

namespace kernel {

/**
 * An options struct for `ChainstateManager`, more ergonomically referred to as
 * `ChainstateManager::Options` due to the using-declaration in
 * `ChainstateManager`.
 */
struct ChainstateManagerOpts {
    const Config &config;
    fs::path datadir;
    const std::function<NodeClock::time_point()> adjusted_time_callback{
        nullptr};
    std::optional<bool> check_block_index{};
    bool checkpoints_enabled{DEFAULT_CHECKPOINTS_ENABLED};
    bool park_deep_reorg{DEFAULT_PARK_DEEP_REORG};
    bool automatic_unparking{!AVALANCHE_DEFAULT_ENABLED};
    //! If set, it will override the minimum work we will assume exists on some
    //! valid chain.
    std::optional<arith_uint256> minimum_chain_work{};
    //! If set, it will override the block hash whose ancestors we will assume
    //! to have valid scripts without checking them.
    std::optional<BlockHash> assumed_valid_block{};
    //! If the tip is older than this, the node is considered to be in initial
    //! block download.
    std::chrono::seconds max_tip_age{DEFAULT_MAX_TIP_AGE};
    DBOptions block_tree_db{};
    DBOptions coins_db{};
    CoinsViewOptions coins_view{};
    Notifications &notifications;
    size_t script_execution_cache_bytes{DEFAULT_SCRIPT_EXECUTION_CACHE_BYTES};
    size_t signature_cache_bytes{DEFAULT_SIGNATURE_CACHE_BYTES};
    int stop_at_height{DEFAULT_STOPATHEIGHT};
    //! If set, this overwrites the timestamp at which replay protection
    //! activates.
    std::optional<int64_t> replay_protection_activation_time{};

    //! If set, store and load the last few block headers reception time to
    //! speed up RTT bootstraping
    bool store_recent_headers_time{DEFAULT_STORE_RECENT_HEADERS_TIME};
};

} // namespace kernel

#endif // BITCOIN_KERNEL_CHAINSTATEMANAGER_OPTS_H
