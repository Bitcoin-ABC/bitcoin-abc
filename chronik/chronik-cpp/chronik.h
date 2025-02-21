// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CHRONIK_CPP_CHRONIK_H
#define BITCOIN_CHRONIK_CPP_CHRONIK_H

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

static constexpr size_t MAX_LENGTH_DONATION_ADDRESS{80};

// Registers Chronik indexer as ValidationInterface, listens to HTTP queries
bool Start(const ArgsManager &args, const Config &config,
           const node::NodeContext &node, bool fWipe);

// Unregisters Chronik indexer as ValidationInterface, stops the HTTP server
void Stop();

} // namespace chronik

#endif // BITCOIN_CHRONIK_CPP_CHRONIK_H
