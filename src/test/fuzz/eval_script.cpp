// Copyright (c) 2009-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <pubkey.h>
#include <script/interpreter.h>
#include <test/fuzz/FuzzedDataProvider.h>
#include <test/fuzz/fuzz.h>

#include <limits>
#include <memory>

void initialize() {
    static const ECCVerifyHandle verify_handle;
}

void test_one_input(const std::vector<uint8_t> &buffer) {
    FuzzedDataProvider fuzzed_data_provider(buffer.data(), buffer.size());
    const unsigned int flags =
        fuzzed_data_provider.ConsumeIntegral<unsigned int>();
    const std::vector<uint8_t> script_bytes = [&] {
        if (fuzzed_data_provider.remaining_bytes() != 0) {
            return fuzzed_data_provider.ConsumeRemainingBytes<uint8_t>();
        } else {
            // Avoid UBSan warning:
            //   test/fuzz/FuzzedDataProvider.h:212:17: runtime error: null
            //   pointer passed as argument 1, which is declared to never be
            //   null /usr/include/string.h:43:28: note: nonnull attribute
            //   specified here
            return std::vector<uint8_t>();
        }
    }();
    const CScript script(script_bytes.begin(), script_bytes.end());
    std::vector<std::vector<uint8_t>> stack;
    ScriptExecutionMetrics metrics;
    (void)EvalScript(stack, script, flags, BaseSignatureChecker(), metrics);
}
