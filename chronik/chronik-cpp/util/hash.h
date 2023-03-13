// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CHRONIK_CPP_UTIL_HASH_H
#define BITCOIN_CHRONIK_CPP_UTIL_HASH_H

#include <array>
#include <cstdint>

class uint256;

namespace chronik::util {

std::array<uint8_t, 32> HashToArray(const uint256 &hash);
uint256 ArrayToHash(const std::array<uint8_t, 32> &hash);

} // namespace chronik::util

#endif // BITCOIN_CHRONIK_CPP_UTIL_HASH_H
