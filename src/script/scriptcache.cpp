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

ScriptCacheKey::ScriptCacheKey(const CTransaction &tx, uint32_t flags,
                               CSHA256 &&hasher) {
    std::array<uint8_t, 32> hash;
    hasher.Write(tx.GetHash().begin(), 32)
        .Write((uint8_t *)&flags, sizeof(flags))
        .Finalize(hash.begin());

    assert(data.size() < hash.size());
    std::copy(hash.begin(), hash.begin() + data.size(), data.begin());
}
