// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <algorithm>
#include <chronik-cpp/util/hash.h>
#include <uint256.h>

namespace chronik::util {

std::array<uint8_t, 32> HashToArray(const uint256 &hash) {
    std::array<uint8_t, 32> array;
    std::copy_n(hash.begin(), 32, array.begin());
    return array;
}

uint256 ArrayToHash(const std::array<uint8_t, 32> &array) {
    uint256 hash;
    std::copy_n(array.begin(), 32, hash.begin());
    return hash;
}

} // namespace chronik::util
