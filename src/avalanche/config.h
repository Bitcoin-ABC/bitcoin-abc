// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_CONFIG_H
#define BITCOIN_AVALANCHE_CONFIG_H

#include <chrono>

namespace avalanche {

struct Config {
    const std::chrono::milliseconds queryTimeoutDuration;

    Config(std::chrono::milliseconds queryTimeoutDurationIn)
        : queryTimeoutDuration(queryTimeoutDurationIn) {}
};

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_CONFIG_H
