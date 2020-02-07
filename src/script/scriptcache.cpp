// Copyright (c) 2017-2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <script/scriptcache.h>

#include <crypto/sha256.h>
#include <cuckoocache.h>
#include <primitives/transaction.h>
#include <random.h>
#include <script/sigcache.h>
#include <sync.h>
#include <util/system.h>
#include <validation.h>

/**
 * In future if many more values are added, it should be considered to
 * expand the element size to 64 bytes (with padding the spare space as
 * needed) so the key can be long. Shortening the key too much risks
 * opening ourselves up to consensus-failing collisions, however it should
 * be noted that our cache nonce is private and unique, so collisions would
 * affect only one node and attackers have no way of offline-preparing a
 * collision attack even on short keys.
 */
struct ScriptCacheElement {
    using KeyType = ScriptCacheKey;

    KeyType key;
    int nSigChecks;

    ScriptCacheElement() = default;

    ScriptCacheElement(const KeyType &keyIn, int nSigChecksIn)
        : key(keyIn), nSigChecks(nSigChecksIn) {}

    const KeyType &getKey() const { return key; }
};

static_assert(sizeof(ScriptCacheElement) == 32,
              "ScriptCacheElement should be 32 bytes");

class ScriptCacheHasher {
public:
    template <uint8_t hash_select>
    uint32_t operator()(const ScriptCacheKey &k) const {
        static_assert(hash_select < 8, "only has 8 hashes available.");

        const auto &d = k.data;

        static_assert(sizeof(d) == 28,
                      "modify the following if key size changes");

        uint32_t u;
        static_assert(sizeof(u) == 4 && sizeof(d[0]) == 1, "basic assumptions");
        if (hash_select < 7) {
            std::memcpy(&u, d.data() + 4 * hash_select, 4);
        } else {
            // We are required to produce 8 subhashes, and all bytes have
            // been used once. We re-use the bytes but mix together different
            // entries (and flip the order) to get a new, distinct value.
            uint8_t arr[4];
            arr[0] = d[3] ^ d[7] ^ d[11] ^ d[15];
            arr[1] = d[6] ^ d[10] ^ d[14] ^ d[18];
            arr[2] = d[9] ^ d[13] ^ d[17] ^ d[21];
            arr[3] = d[12] ^ d[16] ^ d[20] ^ d[24];
            std::memcpy(&u, arr, 4);
        }
        return u;
    }
};

static CuckooCache::cache<ScriptCacheElement, ScriptCacheHasher>
    scriptExecutionCache;
static uint256 scriptExecutionCacheNonce(GetRandHash());

void InitScriptExecutionCache() {
    // nMaxCacheSize is unsigned. If -maxscriptcachesize is set to zero,
    // setup_bytes creates the minimum possible cache (2 elements).
    size_t nMaxCacheSize =
        std::min(
            std::max(int64_t(0), gArgs.GetArg("-maxscriptcachesize",
                                              DEFAULT_MAX_SCRIPT_CACHE_SIZE)),
            MAX_MAX_SCRIPT_CACHE_SIZE) *
        (size_t(1) << 20);
    size_t nElems = scriptExecutionCache.setup_bytes(nMaxCacheSize);
    LogPrintf("Using %zu MiB out of %zu requested for script execution cache, "
              "able to store %zu elements\n",
              (nElems * sizeof(uint256)) >> 20, nMaxCacheSize >> 20, nElems);
}

ScriptCacheKey::ScriptCacheKey(const CTransaction &tx, uint32_t flags) {
    std::array<uint8_t, 32> hash;
    // We only use the first 19 bytes of nonce to avoid a second SHA round -
    // giving us 19 + 32 + 4 = 55 bytes (+ 8 + 1 = 64)
    static_assert(55 - sizeof(flags) - 32 >= 128 / 8,
                  "Want at least 128 bits of nonce for script execution cache");
    CSHA256()
        .Write(scriptExecutionCacheNonce.begin(), 55 - sizeof(flags) - 32)
        .Write(tx.GetHash().begin(), 32)
        .Write((uint8_t *)&flags, sizeof(flags))
        .Finalize(hash.begin());

    assert(data.size() < hash.size());
    std::copy(hash.begin(), hash.begin() + data.size(), data.begin());
}

bool IsKeyInScriptCache(ScriptCacheKey key, bool erase, int &nSigChecksOut) {
    // TODO: Remove this requirement by making CuckooCache not require external
    // locks
    AssertLockHeld(cs_main);

    ScriptCacheElement elem(key, 0);
    bool ret = scriptExecutionCache.get(elem, erase);
    nSigChecksOut = elem.nSigChecks;
    return ret;
}

void AddKeyInScriptCache(ScriptCacheKey key, int nSigChecks) {
    // TODO: Remove this requirement by making CuckooCache not require external
    // locks
    AssertLockHeld(cs_main);

    ScriptCacheElement elem(key, nSigChecks);
    scriptExecutionCache.insert(elem);
}
