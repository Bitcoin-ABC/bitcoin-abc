// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
#ifndef BITCOIN_POLICY_MEMPOOL_H
#define BITCOIN_POLICY_MEMPOOL_H

#include <policy/packages.h>

#include <cstdint>

class CBlockIndex;
namespace Consensus {
struct Params;
}

/**
 * Default for -limitancestorcount, max number of in-mempool ancestors.
 * FIXME: Should be removed, it is no longer relevant since wellington.
 */
static constexpr unsigned int DEFAULT_ANCESTOR_LIMIT = 50;
/**
 * Default for -limitancestorsize, maximum kilobytes of tx + all in-mempool
 * ancestors.
 * FIXME: Should be removed, it is no longer relevant since wellington.
 */
static constexpr unsigned int DEFAULT_ANCESTOR_SIZE_LIMIT = 101;
/**
 * Default for -limitdescendantcount, max number of in-mempool descendants
 * FIXME: Should be removed, it is no longer relevant since wellington.
 */
static constexpr unsigned int DEFAULT_DESCENDANT_LIMIT = 50;
/**
 * Default for -limitdescendantsize, maximum kilobytes of in-mempool
 * descendants.
 * FIXME: Should be removed, it is no longer relevant since wellington.
 */
static const unsigned int DEFAULT_DESCENDANT_SIZE_LIMIT = 101;

// If a package is submitted, it must be within the mempool's
// ancestor/descendant limits. Since a submitted package must be
// child-with-unconfirmed-parents (all of the transactions are an ancestor of
// the child), package limits are ultimately bounded by mempool package limits.
// Ensure that the defaults reflect this constraint.
static_assert(DEFAULT_DESCENDANT_LIMIT >= MAX_PACKAGE_COUNT);
static_assert(DEFAULT_ANCESTOR_LIMIT >= MAX_PACKAGE_COUNT);
static_assert(DEFAULT_ANCESTOR_SIZE_LIMIT >= MAX_PACKAGE_SIZE);
static_assert(DEFAULT_DESCENDANT_SIZE_LIMIT >= MAX_PACKAGE_SIZE);

#endif // BITCOIN_POLICY_MEMPOOL_H
