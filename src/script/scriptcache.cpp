// Copyright (c) 2017-2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <script/scriptcache.h>

#include <common/system.h>
#include <crypto/sha256.h>
#include <cuckoocache.h>
#include <primitives/transaction.h>
#include <random.h>
#include <script/sigcache.h>
#include <sync.h>
#include <validation.h>

static CSHA256 g_scriptExecutionCacheHasher;

ValidationCache::ValidationCache(const size_t script_execution_cache_bytes) {
    // Setup the salted hasher
    uint256 nonce = GetRandHash();
    // We want the nonce to be 64 bytes long to force the hasher to process
    // this chunk, which makes later hash computations more efficient. We
    // just write our 32-byte entropy twice to fill the 64 bytes.
    g_scriptExecutionCacheHasher.Write(nonce.begin(), 32);
    g_scriptExecutionCacheHasher.Write(nonce.begin(), 32);

    const auto [num_elems, approx_size_bytes] =
        m_script_execution_cache.setup_bytes(script_execution_cache_bytes);
    LogPrintf("Using %zu MiB out of %zu MiB requested for script execution "
              "cache, able to store %zu elements\n",
              approx_size_bytes >> 20, script_execution_cache_bytes >> 20,
              num_elems);
}

ScriptCacheKey::ScriptCacheKey(const CTransaction &tx, uint32_t flags) {
    std::array<uint8_t, 32> hash;
    CSHA256 hasher = g_scriptExecutionCacheHasher;
    hasher.Write(tx.GetHash().begin(), 32)
        .Write((uint8_t *)&flags, sizeof(flags))
        .Finalize(hash.begin());

    assert(data.size() < hash.size());
    std::copy(hash.begin(), hash.begin() + data.size(), data.begin());
}
