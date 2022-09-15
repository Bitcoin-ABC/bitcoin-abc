// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_SCRIPT_SCRIPTCACHE_H
#define BITCOIN_SCRIPT_SCRIPTCACHE_H

#include <array>
#include <cstdint>

#include <kernel/cs_main.h>
#include <sync.h>

class CTransaction;

/**
 * The script cache is a map using a key/value element, that caches the
 * success of executing a specific transaction's input scripts under a
 * specific set of flags, along with any associated information learned
 * during execution.
 *
 * The key is slightly shorter than a power-of-two size to make room for
 * the value.
 */
class ScriptCacheKey {
    std::array<uint8_t, 28> data;

public:
    ScriptCacheKey() = default;
    ScriptCacheKey(const ScriptCacheKey &rhs) = default;
    ScriptCacheKey(const CTransaction &tx, uint32_t flags);

    ScriptCacheKey &operator=(const ScriptCacheKey &rhs) = default;

    bool operator==(const ScriptCacheKey &rhs) const {
        return rhs.data == data;
    }

    friend class ScriptCacheHasher;
};

// DoS prevention: limit cache size to 32MiB (over 1000000 entries on 64-bit
// systems). Due to how we count cache size, actual memory usage is slightly
// more (~32.25 MiB)
static constexpr size_t DEFAULT_MAX_SCRIPT_CACHE_BYTES{32 << 20};

/** Initializes the script-execution cache */
[[nodiscard]] bool InitScriptExecutionCache(size_t max_size_bytes);

/**
 * Check if a given key is in the cache, and if so, return its values.
 * (if not found, nSigChecks may or may not be set to an arbitrary value)
 */
bool IsKeyInScriptCache(ScriptCacheKey key, bool erase, int &nSigChecksOut)
    EXCLUSIVE_LOCKS_REQUIRED(cs_main);

/**
 * Add an entry in the cache.
 */
void AddKeyInScriptCache(ScriptCacheKey key, int nSigChecks)
    EXCLUSIVE_LOCKS_REQUIRED(cs_main);

#endif // BITCOIN_SCRIPT_SCRIPTCACHE_H
