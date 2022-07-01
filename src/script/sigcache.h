// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_SCRIPT_SIGCACHE_H
#define BITCOIN_SCRIPT_SIGCACHE_H

#include <script/interpreter.h>
#include <util/hasher.h>

#include <optional>
#include <vector>

// DoS prevention: limit cache size to 32MiB (over 1000000 entries on 64-bit
// systems). Due to how we count cache size, actual memory usage is slightly
// more (~32.25 MiB)
static constexpr size_t DEFAULT_MAX_SIG_CACHE_BYTES{32 << 20};

class CPubKey;

class CachingTransactionSignatureChecker : public TransactionSignatureChecker {
private:
    bool store;

    bool IsCached(const std::vector<uint8_t> &vchSig, const CPubKey &vchPubKey,
                  const uint256 &sighash) const;

public:
    CachingTransactionSignatureChecker(const CTransaction *txToIn,
                                       unsigned int nInIn,
                                       const Amount amountIn, bool storeIn,
                                       PrecomputedTransactionData &txdataIn)
        : TransactionSignatureChecker(txToIn, nInIn, amountIn, txdataIn),
          store(storeIn) {}

    bool VerifySignature(const std::vector<uint8_t> &vchSig,
                         const CPubKey &vchPubKey,
                         const uint256 &sighash) const override;

    friend class TestCachingTransactionSignatureChecker;
};

[[nodiscard]] bool InitSignatureCache(int64_t max_size_bytes);

#endif // BITCOIN_SCRIPT_SIGCACHE_H
