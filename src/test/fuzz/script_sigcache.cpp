// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chainparams.h>
#include <chainparamsbase.h>
#include <key.h>
#include <pubkey.h>
#include <script/sigcache.h>

#include <test/fuzz/FuzzedDataProvider.h>
#include <test/fuzz/fuzz.h>
#include <test/fuzz/util.h>

#include <cstdint>
#include <optional>
#include <string>
#include <vector>

void initialize() {
    static const ECCVerifyHandle ecc_verify_handle;
    ECC_Start();
    SelectParams(CBaseChainParams::REGTEST);
    InitSignatureCache();
}

void test_one_input(const std::vector<uint8_t> &buffer) {
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
        mutable_transaction ? &tx : nullptr, n_in, amount, store, tx_data};
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
