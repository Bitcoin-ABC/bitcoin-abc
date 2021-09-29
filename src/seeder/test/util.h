// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_SEEDER_TEST_UTIL_H
#define BITCOIN_SEEDER_TEST_UTIL_H

#include <type_traits>

template <typename E>
constexpr typename std::underlying_type<E>::type to_integral(E e) {
    return static_cast<typename std::underlying_type<E>::type>(e);
}

#endif // BITCOIN_SEEDER_TEST_UTIL_H
