// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2011 The Bitcoin developers
// Distributed under the MIT/X11 software license, see the accompanying
// file license.txt or http://www.opensource.org/licenses/mit-license.php.

#ifndef __cplusplus
#error This header can only be compiled as C++.
#endif

#ifndef BITCOIN_SEEDER_PROTOCOL_H
#define BITCOIN_SEEDER_PROTOCOL_H

#include <cstdint>

enum ServiceFlags : uint64_t {
    NODE_NETWORK = (1 << 0),
    NODE_BLOOM = (1 << 2),
    NODE_XTHIN = (1 << 4),
    NODE_BITCOIN_CASH = (1 << 5),
};

#endif // BITCOIN_SEEDER_PROTOCOL_H
