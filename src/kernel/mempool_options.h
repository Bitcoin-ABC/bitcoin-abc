// Copyright (c) 2022 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
#ifndef BITCOIN_KERNEL_MEMPOOL_OPTIONS_H
#define BITCOIN_KERNEL_MEMPOOL_OPTIONS_H

#include <policy/policy.h>
#include <script/standard.h>

#include <chrono>
#include <cstdint>

/** Default for -maxmempool, maximum megabytes of mempool memory usage */
static constexpr unsigned int DEFAULT_MAX_MEMPOOL_SIZE_MB{300};
/**
 * Default for -mempoolexpiry, expiration time for mempool transactions in hours
 */
static constexpr unsigned int DEFAULT_MEMPOOL_EXPIRY_HOURS{336};

namespace kernel {
/**
 * Options struct containing options for constructing a CTxMemPool. Default
 * constructor populates the struct with sane default values which can be
 * modified.
 *
 * Most of the time, this struct should be referenced as CTxMemPool::Options.
 */
struct MemPoolOptions {
    /** The ratio used to determine how often sanity checks will run. */
    int check_ratio{0};
    int64_t max_size_bytes{DEFAULT_MAX_MEMPOOL_SIZE_MB * 1'000'000};
    std::chrono::seconds expiry{
        std::chrono::hours{DEFAULT_MEMPOOL_EXPIRY_HOURS}};
    /**
     * A fee rate smaller than this is considered zero fee (for relaying,
     * mining and transaction creation)
     */
    CFeeRate min_relay_feerate{DEFAULT_MIN_RELAY_TX_FEE_PER_KB};
    CFeeRate dust_relay_feerate{DUST_RELAY_TX_FEE};
    /**
     * A data carrying output is an unspendable output containing data. The
     * script type is designated as TxoutType::NULL_DATA.
     *
     * Maximum size of TxoutType::NULL_DATA scripts that this node considers
     * standard.
     * If nullopt, any size is nonstandard.
     */
    std::optional<unsigned> max_datacarrier_bytes{
        DEFAULT_ACCEPT_DATACARRIER ? std::optional{MAX_OP_RETURN_RELAY}
                                   : std::nullopt};
    bool permit_bare_multisig{DEFAULT_PERMIT_BAREMULTISIG};
    bool require_standard{true};
};
} // namespace kernel

#endif // BITCOIN_KERNEL_MEMPOOL_OPTIONS_H
