// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_TEST_UTIL_H
#define BITCOIN_AVALANCHE_TEST_UTIL_H

#include <avalanche/proof.h>
#include <pubkey.h>

#include <cstdio>

namespace avalanche {

constexpr uint32_t MIN_VALID_PROOF_SCORE = 100 * PROOF_DUST_THRESHOLD / COIN;

Proof buildRandomProof(uint32_t score, const CPubKey &master = CPubKey());

bool hasDustStake(const Proof &proof);

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_TEST_UTIL_H
