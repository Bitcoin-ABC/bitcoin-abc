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

#include <boost/thread/shared_mutex.hpp>

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
    boost::shared_mutex cs_sigcache;

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
            .Write(&pubkey[0], pubkey.size())
            .Write(&vchSig[0], vchSig.size())
            .Finalize(entry.begin());
    }

    bool Get(const uint256 &entry, const bool erase) {
        boost::shared_lock<boost::shared_mutex> lock(cs_sigcache);
        return setValid.contains(entry, erase);
    }

    void Set(uint256 &entry) {
        boost::unique_lock<boost::shared_mutex> lock(cs_sigcache);
        setValid.insert(entry);
    }
    uint32_t setup_bytes(size_t n) { return setValid.setup_bytes(n); }
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
void InitSignatureCache() {
    // nMaxCacheSize is unsigned. If -maxsigcachesize is set to zero,
    // setup_bytes creates the minimum possible cache (2 elements).
    size_t nMaxCacheSize =
        std::min(std::max(int64_t(0), gArgs.GetArg("-maxsigcachesize",
                                                   DEFAULT_MAX_SIG_CACHE_SIZE)),
                 MAX_MAX_SIG_CACHE_SIZE) *
        (size_t(1) << 20);
    size_t nElems = signatureCache.setup_bytes(nMaxCacheSize);
    LogPrintf("Using %zu MiB out of %zu requested for signature cache, able to "
              "store %zu elements\n",
              (nElems * sizeof(uint256)) >> 20, nMaxCacheSize >> 20, nElems);
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
