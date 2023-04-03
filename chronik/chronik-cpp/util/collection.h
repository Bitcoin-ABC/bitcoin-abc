// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CHRONIK_CPP_UTIL_COLLECTION_H
#define BITCOIN_CHRONIK_CPP_UTIL_COLLECTION_H

#include <rust/cxx.h>

namespace chronik::util {

/** Convert a container (e.g. a std::vector) to a Rust Vec<T> */
template <typename T, typename C> rust::Vec<T> ToRustVec(const C &container) {
    rust::Vec<T> vec;
    vec.reserve(container.size());
    std::copy(container.begin(), container.end(), std::back_inserter(vec));
    return vec;
}

template <typename T> std::vector<T> FromRustSlice(rust::Slice<const T> slice) {
    std::vector<T> vec;
    vec.reserve(slice.size());
    std::copy(slice.begin(), slice.end(), std::back_inserter(vec));
    return vec;
}

} // namespace chronik::util

#endif // BITCOIN_CHRONIK_CPP_UTIL_COLLECTION_H
