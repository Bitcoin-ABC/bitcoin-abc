// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CHRONIK_CPP_CHRONIK_H
#define BITCOIN_CHRONIK_CPP_CHRONIK_H

class Config;
struct NodeContext;

namespace chronik {

// Registers Chronik indexer as ValidationInterface, listens to HTTP queries
void Start(const Config &config, const NodeContext &node);

// Unregisters Chronik indexer as ValidationInterface, stops the HTTP server
void Stop();

} // namespace chronik

#endif // BITCOIN_CHRONIK_CPP_CHRONIK_H
