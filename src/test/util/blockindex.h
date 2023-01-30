// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_TEST_UTIL_BLOCKINDEX_H
#define BITCOIN_TEST_UTIL_BLOCKINDEX_H

#include <blockindex.h>

[[maybe_unused]] void SetMTP(std::array<CBlockIndex, 12> &blocks, int64_t mtp);

#endif // BITCOIN_TEST_UTIL_BLOCKINDEX_H
