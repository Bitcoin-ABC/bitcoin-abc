// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chainparams.h>
#include <key.h>
#include <pubkey.h>
#include <script/sigcache.h>

#include <test/fuzz/FuzzedDataProvider.h>
#include <test/fuzz/fuzz.h>
#include <test/fuzz/util.h>
#include <test/util/setup_common.h>

#include <cstdint>
#include <optional>
#include <string>
#include <vector>

namespace {
const BasicTestingSetup *g_setup;
SignatureCache *g_signature_cache;
} // namespace

void initialize_script_sigcache() {
    static const auto testing_setup = MakeNoLogFileContext<>();
    static SignatureCache signature_cache{DEFAULT_SIGNATURE_CACHE_BYTES};
    g_setup = testing_setup.get();
    g_signature_cache = &signature_cache;
}

FUZZ_TARGET_INIT(script_sigcache, initialize_script_sigcache) {
    FuzzedDataProvider fuzzed_data_provider(buffer.data(), buffer.size());

    const std::optional<CMutableTransaction> mutable_transaction =
        ConsumeDeserializable<CMutableTransaction>(fuzzed_data_provider);
    const CTransaction tx = mutable_transaction
                                ? CTransaction{*mutable_transaction}
                                : CTransaction{};
    const unsigned int n_in =
        fuzzed_data_provider.ConsumeIntegral<unsigned int>();
    const Amount amount = ConsumeMoney(fuzzed_data_provider);
    const bool store = fuzzed_data_provider.ConsumeBool();
    PrecomputedTransactionData tx_data;
    CachingTransactionSignatureChecker caching_transaction_signature_checker{
        mutable_transaction ? &tx : nullptr,
        n_in,
        amount,
        store,
        *g_signature_cache,
        tx_data};
    const std::optional<CPubKey> pub_key =
        ConsumeDeserializable<CPubKey>(fuzzed_data_provider);
    if (pub_key) {
        const std::vector<uint8_t> random_bytes =
            ConsumeRandomLengthByteVector(fuzzed_data_provider);
        if (!random_bytes.empty()) {
            (void)caching_transaction_signature_checker.VerifySignature(
                random_bytes, *pub_key, ConsumeUInt256(fuzzed_data_provider));
        }
    }
}
