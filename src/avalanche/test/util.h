// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_TEST_UTIL_H
#define BITCOIN_AVALANCHE_TEST_UTIL_H

#include <avalanche/proof.h>
#include <pubkey.h>

#include <cstdio>

namespace avalanche {

Proof buildRandomProof(uint32_t score, const CPubKey &master = CPubKey());

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_TEST_UTIL_H
