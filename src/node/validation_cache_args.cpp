// Copyright (c) 2022 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <node/validation_cache_args.h>

#include <kernel/validation_cache_sizes.h>

#include <common/args.h>

#include <algorithm>
#include <cstddef>
#include <cstdint>
#include <memory>
#include <optional>

using kernel::ValidationCacheSizes;

namespace node {
void ApplyArgsManOptions(const ArgsManager &argsman,
                         ValidationCacheSizes &cache_sizes) {
    // When supplied with a max_size of 0, both InitSignatureCache and
    // InitScriptExecutionCache create the minimum possible cache (2
    // elements). Therefore, we can use 0 as a floor here.
    if (auto max_size = argsman.GetIntArg("-maxsigcachesize")) {
        cache_sizes.signature_cache_bytes =
            std::max<int64_t>(*max_size, 0) * (1 << 20);
    }
    if (auto max_size = argsman.GetIntArg("-maxscriptcachesize")) {
        cache_sizes.script_execution_cache_bytes =
            std::max<int64_t>(*max_size, 0) * (1 << 20);
    }
}
} // namespace node
