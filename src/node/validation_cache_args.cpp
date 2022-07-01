// Copyright (c) 2022 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <node/validation_cache_args.h>

#include <kernel/validation_cache_sizes.h>

#include <util/system.h>

#include <memory>
#include <optional>

using kernel::ValidationCacheSizes;

namespace node {
void ApplyArgsManOptions(const ArgsManager &argsman,
                         ValidationCacheSizes &cache_sizes) {
    if (auto max_size = argsman.GetIntArg("-maxsigcachesize")) {
        cache_sizes.signature_cache_bytes = *max_size * (1 << 20);
    }
    if (auto max_size = argsman.GetIntArg("-maxscriptcachesize")) {
        cache_sizes.script_execution_cache_bytes = *max_size * (1 << 20);
    }
}
} // namespace node
