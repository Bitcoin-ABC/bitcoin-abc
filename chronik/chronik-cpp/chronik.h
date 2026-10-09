// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CHRONIK_CPP_CHRONIK_H
#define BITCOIN_CHRONIK_CPP_CHRONIK_H

#include <chrono>
#include <string>
#include <vector>

class Config;
namespace node {
struct NodeContext;
} // namespace node

namespace chronik {

static const std::vector<std::string> DEFAULT_BINDS = {"127.0.0.1", "::1"};

// How many buckets of txid -> tx num maps are cached in-memory.
// Don't set this too high, Chronik will do a linear scan over all buckets.
static const size_t DEFAULT_TX_NUM_CACHE_BUCKETS = 10;
// Size of each bucket in the in-memory cache of tx nums.
// Unlike the number of buckets, this may be increased without much danger of
// slowing the indexer down. The total cache size will be
// `num_buckets * bucket_size * 40B`, so by default the cache will require 40MB
// of memory.
static const size_t DEFAULT_TX_NUM_CACHE_BUCKET_SIZE = 100'000;

static const uint32_t DEFAULT_ELECTRUM_MAX_HISTORY{200'000};

// Defaults for Chronik subscription caps.
static constexpr uint64_t DEFAULT_MAX_SUBS{10'000'000};
static constexpr uint64_t DEFAULT_MAX_SUBS_PER_IP{75'000};
// Largest standard locking script a client has a reason to subscribe to: a
// 3-of-3 bare multisig with uncompressed pubkeys (OP_3 <65-byte key>*3 OP_3
// OP_CHECKMULTISIG = 201 bytes).
static constexpr uint64_t DEFAULT_SUBSCRIPTION_MAX_SCRIPT_SIZE{201};
// Default max plugin subscription size. Enough for a hash or a public key plus
// some extra data.
static constexpr uint64_t DEFAULT_SUBSCRIPTION_MAX_PLUGIN_SIZE{100};

static constexpr size_t MAX_LENGTH_DONATION_ADDRESS{80};

// 0 disables Electrum peer validation; server.add_peer rejects peers and
// server.peers.subscribe advertises none.
static constexpr auto DEFAULT_ELECTRUM_PEER_VALIDATION_INTERVAL{0s};

/**
 * Drop Electrum clients that send no data for this long; 0 disables the
 * timeout.
 */
static constexpr auto DEFAULT_ELECTRUM_IDLE_TIMEOUT{10min};

// Registers Chronik indexer as ValidationInterface, listens to HTTP queries
bool Start(const ArgsManager &args, const Config &config,
           const node::NodeContext &node, bool fWipe);

// Stops the HTTP and Electrum servers, keeping the indexer running. Must run
// before the node subsystems the request handlers use are shut down.
void Interrupt();

// Unregisters Chronik indexer as ValidationInterface, tears the indexer down.
// Must run once the validation interface queue is idle.
void Stop();

} // namespace chronik

#endif // BITCOIN_CHRONIK_CPP_CHRONIK_H
