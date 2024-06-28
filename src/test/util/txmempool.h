// Copyright (c) 2022 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_TEST_UTIL_TXMEMPOOL_H
#define BITCOIN_TEST_UTIL_TXMEMPOOL_H

#include <policy/packages.h>
#include <txmempool.h>

struct PackageMempoolAcceptResult;

/**
 * Check expected properties for every PackageMempoolAcceptResult, regardless of
 * value. Returns a string if an error occurs with error populated, nullopt
 * otherwise. If mempool is provided, checks that the expected transactions are
 * in mempool (this should be set to nullptr for a test_accept).
 */
std::optional<std::string>
CheckPackageMempoolAcceptResult(const Package &txns,
                                const PackageMempoolAcceptResult &result,
                                bool expect_valid, const CTxMemPool *mempool);
#endif // BITCOIN_TEST_UTIL_TXMEMPOOL_H
