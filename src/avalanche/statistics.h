// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_STATISTICS_H
#define BITCOIN_AVALANCHE_STATISTICS_H

#include <chrono>

/** Refresh period for the avalanche statistics computation */
static constexpr std::chrono::minutes AVALANCHE_STATISTICS_REFRESH_PERIOD{10};
/** Time constant for the avalanche statistics computation */
static constexpr std::chrono::minutes AVALANCHE_STATISTICS_TIME_CONSTANT{10};
/**
 * Pre-computed decay factor for the avalanche statistics computation.
 * There is currently no constexpr variant of std::exp, so use a const.
 */
static const double AVALANCHE_STATISTICS_DECAY_FACTOR =
    1. - std::exp(-1. * AVALANCHE_STATISTICS_REFRESH_PERIOD.count() /
                  AVALANCHE_STATISTICS_TIME_CONSTANT.count());

#endif // BITCOIN_AVALANCHE_STATISTICS_H
