// Copyright (c) 2021 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_NODEID_H
#define BITCOIN_NODEID_H

#include <cstdint>

typedef int64_t NodeId;

/**
 * Special NodeId that represent no node.
 */
static constexpr NodeId NO_NODE = -1;

#endif // BITCOIN_NODEID_H
