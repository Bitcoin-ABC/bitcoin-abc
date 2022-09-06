// Copyright (c) 2021 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_AVALANCHE_H
#define BITCOIN_AVALANCHE_AVALANCHE_H

#include <cstddef>
#include <memory>

#include <amount.h>

namespace avalanche {
class Processor;
}

class ArgsManager;

/**
 * Is avalanche enabled by default.
 */
static constexpr bool AVALANCHE_DEFAULT_ENABLED = false;

/**
 * Conflicting proofs cooldown time default value in seconds.
 * Minimal delay between two proofs with at least a common UTXO.
 */
static constexpr size_t AVALANCHE_DEFAULT_CONFLICTING_PROOF_COOLDOWN = 60;

/**
 * Peer replacement cooldown time default value in seconds.
 * Minimal delay before a peer can be replaced due to a conflicting proof.
 */
static constexpr size_t AVALANCHE_DEFAULT_PEER_REPLACEMENT_COOLDOWN =
    24 * 60 * 60;

/**
 * Is proof replacement enabled by default.
 */
static constexpr bool AVALANCHE_DEFAULT_PROOF_REPLACEMENT_ENABLED = false;

/**
 * Avalanche default cooldown in milliseconds.
 */
static constexpr size_t AVALANCHE_DEFAULT_COOLDOWN = 100;

/**
 * Default minimum cumulative stake of all known peers that constitutes a usable
 * quorum.
 */
static constexpr Amount AVALANCHE_DEFAULT_MIN_QUORUM_STAKE =
    int64_t(1'000'000'000'000) * SATOSHI; // 10B XEC

/**
 * Default minimum percentage of stake-weighted peers we must have a node for to
 * constitute a usable quorum.
 *
 * FIXME: The default is set to 0 to allow existing tests to pass for now. We
 * need to set a sane default and update tests later.
 */
static constexpr double AVALANCHE_DEFAULT_MIN_QUORUM_CONNECTED_STAKE_RATIO = 0;

/**
 * Default minimum number of nodes that sent us an avaproofs message before we
 * can consider our quorum suitable for polling.
 *
 * FIXME: The default is set to 0 to allow existing tests to pass for now. We
 * need to set a sane default and update tests later.
 */
static constexpr double AVALANCHE_DEFAULT_MIN_AVAPROOFS_NODE_COUNT = 0;

/**
 * Global avalanche instance.
 */
extern std::unique_ptr<avalanche::Processor> g_avalanche;

bool isAvalancheEnabled(const ArgsManager &argsman);

#endif // BITCOIN_AVALANCHE_AVALANCHE_H
