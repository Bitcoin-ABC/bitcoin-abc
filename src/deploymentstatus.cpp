// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <consensus/params.h>

#include <type_traits>

/**
 * ValidDeployment only checks upper bounds for ensuring validity.
 * This checks that the lowest possible value or the type is also a
 * (specific) valid deployment so that lower bounds don't need to be checked.
 */

template <typename T, T x> static constexpr bool is_minimum() {
    using U = typename std::underlying_type<T>::type;
    return x == std::numeric_limits<U>::min();
}

static_assert(
    is_minimum<Consensus::BuriedDeployment, Consensus::DEPLOYMENT_P2SH>(),
    "p2sh is not minimum value for BuriedDeployment");
