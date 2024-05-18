// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_SCRIPT_SIGCACHE_H
#define BITCOIN_SCRIPT_SIGCACHE_H

#include <consensus/amount.h>
#include <crypto/sha256.h>
#include <cuckoocache.h>
#include <script/interpreter.h>
#include <uint256.h>
#include <util/hasher.h>

#include <cstddef>
#include <cstdint>
#include <shared_mutex>
#include <utility>
#include <vector>

class CTransaction;

// DoS prevention: limit cache size to 32MiB (over 1000000 entries on 64-bit
// systems). Due to how we count cache size, actual memory usage is slightly
// more (~32.25 MiB)
static constexpr size_t DEFAULT_MAX_SIG_CACHE_BYTES{32 << 20};

class CPubKey;

/**
 * Valid signature cache, to avoid doing expensive ECDSA signature checking
 * twice for every transaction (once when accepted into memory pool, and
 * again when accepted into the block chain)
 */
class SignatureCache {
private:
    //! Entries are SHA256(nonce || signature hash || public key || signature):
    CSHA256 m_salted_hasher;
    typedef CuckooCache::cache<CuckooCache::KeyOnly<uint256>,
                               SignatureCacheHasher>
        map_type;
    map_type setValid;
    std::shared_mutex cs_sigcache;

public:
    SignatureCache();

    void ComputeEntry(uint256 &entry, const uint256 &hash,
                      const std::vector<uint8_t> &vchSig,
                      const CPubKey &pubkey) const;

    bool Get(const uint256 &entry, const bool erase);

    void Set(const uint256 &entry);

    std::pair<uint32_t, size_t> setup_bytes(size_t n);
};

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

[[nodiscard]] bool InitSignatureCache(size_t max_size_bytes);

#endif // BITCOIN_SCRIPT_SIGCACHE_H
