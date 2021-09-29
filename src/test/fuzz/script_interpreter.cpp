// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <primitives/transaction.h>
#include <script/interpreter.h>

#include <test/fuzz/FuzzedDataProvider.h>
#include <test/fuzz/fuzz.h>
#include <test/fuzz/util.h>

#include <cstdint>
#include <optional>
#include <string>
#include <vector>

bool CastToBool(const std::vector<uint8_t> &vch);

void test_one_input(const std::vector<uint8_t> &buffer) {
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
