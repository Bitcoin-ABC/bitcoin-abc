// Copyright (c) 2021 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/avalanche.h>

#include <util/system.h>

bool isAvalancheEnabled(const ArgsManager &argsman) {
    return argsman.GetBoolArg("-enableavalanche", AVALANCHE_DEFAULT_ENABLED);
}
