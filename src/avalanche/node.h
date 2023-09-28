// Copyright (c) 2018-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_NODE_H
#define BITCOIN_AVALANCHE_NODE_H

#include <nodeid.h>
#include <pubkey.h>
#include <util/time.h>

#include <chrono>
#include <cstdint>

using PeerId = uint32_t;
static constexpr PeerId NO_PEER = -1;

namespace avalanche {

struct Node {
    NodeId nodeid;
    PeerId peerid;
    SteadyMilliseconds nextRequestTime;
    bool avaproofsSent;

    Node(NodeId nodeid_, PeerId peerid_)
        : nodeid(nodeid_), peerid(peerid_),
          nextRequestTime(Now<SteadyMilliseconds>()), avaproofsSent(false) {}
};

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_NODE_H
