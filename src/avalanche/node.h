// Copyright (c) 2018-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_NODE_H
#define BITCOIN_AVALANCHE_NODE_H

#include <net.h> // For NodeId
#include <pubkey.h>

#include <chrono>

using TimePoint = std::chrono::time_point<std::chrono::steady_clock>;

struct AvalancheNode {
    NodeId nodeid;
    int64_t score;

    TimePoint nextRequestTime;
    CPubKey pubkey;
};

#endif // BITCOIN_AVALANCHE_NODE_H
