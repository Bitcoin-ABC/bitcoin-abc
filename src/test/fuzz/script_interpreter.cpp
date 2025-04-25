// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <primitives/transaction.h>
#include <script/interpreter.h>

#include <test/fuzz/FuzzedDataProvider.h>
#include <test/fuzz/fuzz.h>
#include <test/fuzz/util.h>
#include <util/check.h>

#include <cstdint>
#include <optional>
#include <string>
#include <vector>

FUZZ_TARGET(script_interpreter) {
    FuzzedDataProvider fuzzed_data_provider(buffer.data(), buffer.size());
    {
        const CScript script_code = ConsumeScript(fuzzed_data_provider);
        const std::optional<CMutableTransaction> mtx =
            ConsumeDeserializable<CMutableTransaction>(fuzzed_data_provider);
        if (mtx) {
            const CTransaction tx_to{*mtx};
            const unsigned int in =
                fuzzed_data_provider.ConsumeIntegral<unsigned int>();
            if (in < tx_to.vin.size()) {
                (void)SignatureHash(
                    script_code, tx_to, in,
                    SigHashType(
                        fuzzed_data_provider.ConsumeIntegral<uint32_t>()),
                    ConsumeMoney(fuzzed_data_provider), nullptr,
                    fuzzed_data_provider.PickValueInArray(
                        {SCRIPT_ENABLE_REPLAY_PROTECTION,
                         SCRIPT_ENABLE_SIGHASH_FORKID}));
                const std::optional<CMutableTransaction> mtx_precomputed =
                    ConsumeDeserializable<CMutableTransaction>(
                        fuzzed_data_provider);
                if (mtx_precomputed) {
                    const CTransaction tx_precomputed{*mtx_precomputed};
                    const PrecomputedTransactionData
                        precomputed_transaction_data{tx_precomputed};
                    (void)SignatureHash(
                        script_code, tx_to, in,
                        SigHashType(
                            fuzzed_data_provider.ConsumeIntegral<uint32_t>()),
                        ConsumeMoney(fuzzed_data_provider),
                        &precomputed_transaction_data,
                        fuzzed_data_provider.PickValueInArray(
                            {SCRIPT_ENABLE_REPLAY_PROTECTION,
                             SCRIPT_ENABLE_SIGHASH_FORKID}));
                }
            }
        }
    }
    (void)CastToBool(ConsumeRandomLengthByteVector(fuzzed_data_provider));
}

/** Differential fuzzing for SignatureHash with and without cache. */
FUZZ_TARGET(sighash_cache) {
    FuzzedDataProvider provider(buffer.data(), buffer.size());

    // Get inputs to the sighash function that won't change across types.
    const auto scriptcode{ConsumeScript(provider)};
    const std::optional<CMutableTransaction> mtx =
        ConsumeDeserializable<CMutableTransaction>(provider);
    if (!mtx) {
        return;
    }
    const CTransaction tx_to{*mtx};
    if (tx_to.vin.empty()) {
        return;
    }
    const auto in_index{
        provider.ConsumeIntegralInRange<uint32_t>(0, tx_to.vin.size() - 1)};
    const auto amount{ConsumeMoney(provider)};
    const auto flags{provider.PickValueInArray(
        {SCRIPT_ENABLE_REPLAY_PROTECTION, SCRIPT_ENABLE_SIGHASH_FORKID})};

    // Check the sighash function will give the same result for 100
    // fuzzer-generated hash types whether or not a cache is
    // provided. The cache is conserved across types to exercise cache hits.
    SigHashCache sighash_cache{};
    for (int i{0}; i < 100; ++i) {
        const SigHashType hash_type{provider.ConsumeIntegral<uint32_t>()};
        const auto nocache_res{SignatureHash(
            scriptcode, tx_to, in_index, hash_type, amount, nullptr, flags)};
        const auto cache_res{SignatureHash(scriptcode, tx_to, in_index,
                                           hash_type, amount, nullptr, flags,
                                           &sighash_cache)};
        Assert(nocache_res == cache_res);
    }
}
