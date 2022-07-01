// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <script/sigcache.h>

#include <cuckoocache.h>
#include <pubkey.h>
#include <random.h>
#include <uint256.h>
#include <util/system.h>

#include <algorithm>
#include <mutex>
#include <optional>
#include <shared_mutex>
#include <vector>

namespace {

/**
 * Valid signature cache, to avoid doing expensive ECDSA signature checking
 * twice for every transaction (once when accepted into memory pool, and
 * again when accepted into the block chain)
 */
class CSignatureCache {
private:
    //! Entries are SHA256(nonce || signature hash || public key || signature):
    CSHA256 m_salted_hasher;
    typedef CuckooCache::cache<CuckooCache::KeyOnly<uint256>,
                               SignatureCacheHasher>
        map_type;
    map_type setValid;
    std::shared_mutex cs_sigcache;

public:
    CSignatureCache() {
        uint256 nonce = GetRandHash();
        // We want the nonce to be 64 bytes long to force the hasher to process
        // this chunk, which makes later hash computations more efficient. We
        // just write our 32-byte entropy twice to fill the 64 bytes.
        m_salted_hasher.Write(nonce.begin(), 32);
        m_salted_hasher.Write(nonce.begin(), 32);
    }

    void ComputeEntry(uint256 &entry, const uint256 &hash,
                      const std::vector<uint8_t> &vchSig,
                      const CPubKey &pubkey) {
        CSHA256 hasher = m_salted_hasher;
        hasher.Write(hash.begin(), 32)
            .Write(pubkey.data(), pubkey.size())
            .Write(vchSig.data(), vchSig.size())
            .Finalize(entry.begin());
    }

    bool Get(const uint256 &entry, const bool erase) {
        std::shared_lock<std::shared_mutex> lock(cs_sigcache);
        return setValid.contains(entry, erase);
    }

    void Set(const uint256 &entry) {
        std::unique_lock<std::shared_mutex> lock(cs_sigcache);
        setValid.insert(entry);
    }
    std::optional<std::pair<uint32_t, size_t>> setup_bytes(size_t n) {
        return setValid.setup_bytes(n);
    }
};

/**
 * In previous versions of this code, signatureCache was a local static variable
 * in CachingTransactionSignatureChecker::VerifySignature. We initialize
 * signatureCache outside of VerifySignature to avoid the atomic operation per
 * call overhead associated with local static variables even though
 * signatureCache could be made local to VerifySignature.
 */
static CSignatureCache signatureCache;
} // namespace

// To be called once in AppInitMain/BasicTestingSetup to initialize the
// signatureCache.

bool InitSignatureCache(int64_t max_size_bytes) {
    // nMaxCacheSize is unsigned. If -maxsigcachesize is set to zero,
    // setup_bytes creates the minimum possible cache (2 elements).
    size_t nMaxCacheSize = std::max<int64_t>(max_size_bytes, 0);

    auto setup_results = signatureCache.setup_bytes(nMaxCacheSize);
    if (!setup_results) {
        return false;
    }

    const auto [num_elems, approx_size_bytes] = *setup_results;
    LogPrintf("Using %zu MiB out of %zu MiB requested for signature cache, "
              "able to store %zu elements\n",
              approx_size_bytes >> 20, max_size_bytes >> 20, num_elems);
    return true;
}

template <typename F>
bool RunMemoizedCheck(const std::vector<uint8_t> &vchSig, const CPubKey &pubkey,
                      const uint256 &sighash, bool storeOrErase, const F &fun) {
    uint256 entry;
    signatureCache.ComputeEntry(entry, sighash, vchSig, pubkey);
    if (signatureCache.Get(entry, !storeOrErase)) {
        return true;
    }
    if (!fun()) {
        return false;
    }
    if (storeOrErase) {
        signatureCache.Set(entry);
    }
    return true;
}

bool CachingTransactionSignatureChecker::IsCached(
    const std::vector<uint8_t> &vchSig, const CPubKey &pubkey,
    const uint256 &sighash) const {
    return RunMemoizedCheck(vchSig, pubkey, sighash, true,
                            [] { return false; });
}

bool CachingTransactionSignatureChecker::VerifySignature(
    const std::vector<uint8_t> &vchSig, const CPubKey &pubkey,
    const uint256 &sighash) const {
    return RunMemoizedCheck(vchSig, pubkey, sighash, store, [&] {
        return TransactionSignatureChecker::VerifySignature(vchSig, pubkey,
                                                            sighash);
    });
}
