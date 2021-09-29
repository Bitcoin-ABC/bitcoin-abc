// Copyright (c) 2009-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <pubkey.h>
#include <script/interpreter.h>

#include <test/fuzz/FuzzedDataProvider.h>
#include <test/fuzz/fuzz.h>

#include <cstdint>
#include <limits>
#include <string>
#include <vector>

void initialize() {
    static const auto verify_handle = std::make_unique<ECCVerifyHandle>();
}

namespace {
class FuzzedSignatureChecker : public BaseSignatureChecker {
    FuzzedDataProvider &m_fuzzed_data_provider;

public:
    FuzzedSignatureChecker(FuzzedDataProvider &fuzzed_data_provider)
        : m_fuzzed_data_provider(fuzzed_data_provider) {}

    bool CheckSig(const std::vector<uint8_t> &scriptSig,
                  const std::vector<uint8_t> &vchPubKey,
                  const CScript &scriptCode, uint32_t flags) const override {
        return m_fuzzed_data_provider.ConsumeBool();
    }

    bool CheckLockTime(const CScriptNum &nLockTime) const override {
        return m_fuzzed_data_provider.ConsumeBool();
    }

    bool CheckSequence(const CScriptNum &nSequence) const override {
        return m_fuzzed_data_provider.ConsumeBool();
    }

    virtual ~FuzzedSignatureChecker() {}
};
} // namespace

void test_one_input(const std::vector<uint8_t> &buffer) {
    FuzzedDataProvider fuzzed_data_provider(buffer.data(), buffer.size());
    const unsigned int flags =
        fuzzed_data_provider.ConsumeIntegral<unsigned int>();
    const std::string script_string_1 =
        fuzzed_data_provider.ConsumeRandomLengthString(65536);
    const std::vector<uint8_t> script_bytes_1{script_string_1.begin(),
                                              script_string_1.end()};
    const std::string script_string_2 =
        fuzzed_data_provider.ConsumeRandomLengthString(65536);
    const std::vector<uint8_t> script_bytes_2{script_string_2.begin(),
                                              script_string_2.end()};
    std::vector<std::vector<uint8_t>> stack;
    ScriptExecutionMetrics metrics;
    ScriptError serror;
    (void)EvalScript(stack, {script_bytes_1.begin(), script_bytes_1.end()},
                     flags, FuzzedSignatureChecker(fuzzed_data_provider),
                     metrics, &serror);
    if ((flags & SCRIPT_VERIFY_CLEANSTACK) != 0 &&
        (flags & SCRIPT_VERIFY_P2SH) == 0) {
        return;
    }
    (void)VerifyScript({script_bytes_1.begin(), script_bytes_1.end()},
                       {script_bytes_2.begin(), script_bytes_2.end()}, flags,
                       FuzzedSignatureChecker(fuzzed_data_provider), metrics,
                       &serror);
}
