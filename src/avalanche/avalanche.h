// Copyright (c) 2021 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_AVALANCHE_H
#define BITCOIN_AVALANCHE_AVALANCHE_H

#include <cstddef>
#include <memory>

namespace avalanche {
class Processor;
}

class ArgsManager;

/**
 * Is avalanche enabled by default.
 */
static constexpr bool AVALANCHE_DEFAULT_ENABLED = false;

/**
 * Avalanche default cooldown in milliseconds.
 */
static constexpr size_t AVALANCHE_DEFAULT_COOLDOWN = 100;

/**
 * Global avalanche instance.
 */
extern std::unique_ptr<avalanche::Processor> g_avalanche;

bool isAvalancheEnabled(const ArgsManager &argsman);

#endif // BITCOIN_AVALANCHE_AVALANCHE_H
