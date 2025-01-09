// Copyright (c) 2021-2022 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_UTIL_OVERFLOW_H
#define BITCOIN_UTIL_OVERFLOW_H

#include <climits>
#include <limits>
#include <optional>

/**
 * @brief Left bit shift with overflow checking.
 * @param input The input value to be left shifted.
 * @param shift The number of bits to left shift.
 * @return (input * 2^shift) or nullopt if it would not fit in the return type.
 */
// TODO: use template <std::integral T> afer we switch to C++20
template <typename T>
constexpr std::optional<T> CheckedLeftShift(T input, unsigned shift) noexcept {
    if (shift == 0 || input == 0) {
        return input;
    }
    // Avoid undefined c++ behaviour if shift is >= number of bits in T.
    if (shift >= sizeof(T) * CHAR_BIT) {
        return std::nullopt;
    }
    // If input << shift is too big to fit in T, return nullopt.
    if (input > (std::numeric_limits<T>::max() >> shift)) {
        return std::nullopt;
    }
    if (input < (std::numeric_limits<T>::min() >> shift)) {
        return std::nullopt;
    }
    return input << shift;
}

/**
 * @brief Left bit shift with safe minimum and maximum values.
 * @param input The input value to be left shifted.
 * @param shift The number of bits to left shift.
 * @return (input * 2^shift) clamped to fit between the lowest and highest
 *         representable values of the type T.
 */
// TODO: use template <std::integral T> afer we switch to C++20
template <typename T>
constexpr T SaturatingLeftShift(T input, unsigned shift) noexcept {
    if (auto result{CheckedLeftShift(input, shift)}) {
        return *result;
    }
    // If input << shift is too big to fit in T, return biggest positive or
    // negative number that fits.
    return input < 0 ? std::numeric_limits<T>::min()
                     : std::numeric_limits<T>::max();
}

#endif // BITCOIN_UTIL_OVERFLOW_H
