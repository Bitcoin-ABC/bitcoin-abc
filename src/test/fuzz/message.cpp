// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chainparams.h>
#include <config.h>
#include <key_io.h>
#include <util/message.h>
#include <util/strencodings.h>

#include <test/fuzz/FuzzedDataProvider.h>
#include <test/fuzz/fuzz.h>
#include <test/fuzz/util.h>

#include <cassert>
#include <cstdint>
#include <iostream>
#include <string>
#include <vector>

void initialize() {
    static const ECCVerifyHandle ecc_verify_handle;
    ECC_Start();
    SelectParams(CBaseChainParams::REGTEST);
}

void test_one_input(const std::vector<uint8_t> &buffer) {
    const Config &config = GetConfig();
    const CChainParams &chainparams = config.GetChainParams();
    FuzzedDataProvider fuzzed_data_provider(buffer.data(), buffer.size());
    const std::string random_message =
        fuzzed_data_provider.ConsumeRandomLengthString(1024);
    {
        const std::vector<uint8_t> random_bytes =
            ConsumeRandomLengthByteVector(fuzzed_data_provider);
        CKey private_key;
        private_key.Set(random_bytes.begin(), random_bytes.end(),
                        fuzzed_data_provider.ConsumeBool());
        std::string signature;
        const bool message_signed =
            MessageSign(private_key, random_message, signature);
        if (private_key.IsValid()) {
            assert(message_signed);
            const MessageVerificationResult verification_result = MessageVerify(
                chainparams,
                EncodeDestination(PKHash(private_key.GetPubKey().GetID()),
                                  config),
                signature, random_message);
            assert(verification_result == MessageVerificationResult::OK);
        }
    }
    {
        (void)MessageHash(random_message);
        (void)MessageVerify(
            chainparams, fuzzed_data_provider.ConsumeRandomLengthString(1024),
            fuzzed_data_provider.ConsumeRandomLengthString(1024),
            random_message);
        (void)SigningResultString(fuzzed_data_provider.PickValueInArray(
            {SigningResult::OK, SigningResult::PRIVATE_KEY_NOT_AVAILABLE,
             SigningResult::SIGNING_FAILED}));
    }
}
