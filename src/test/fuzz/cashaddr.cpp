// Copyright (c) 2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <cashaddr.h>
#include <test/fuzz/FuzzedDataProvider.h>
#include <test/fuzz/fuzz.h>
#include <test/util/str.h>
#include <util/strencodings.h>

#include <array>
#include <cassert>
#include <cstdint>
#include <iostream>
#include <string>
#include <utility>
#include <vector>

void test_one_input(const std::vector<uint8_t> &buffer) {
    FuzzedDataProvider fuzzed_data_provider(buffer.data(), buffer.size());
    const std::string random_string =
        fuzzed_data_provider.ConsumeRandomLengthString(112);
    const std::string random_prefix =
        fuzzed_data_provider.ConsumeRemainingBytesAsString();
    const std::pair<std::string, std::vector<uint8_t>> r1 =
        cashaddr::Decode(random_prefix, random_string);
    if (r1.first.empty()) {
        assert(r1.second.empty());
    } else {
        const std::string &hrp = r1.first;
        const std::vector<uint8_t> &data = r1.second;
        const std::string reencoded = cashaddr::Encode(hrp, data);
        assert(CaseInsensitiveEqual(random_string, reencoded));
    }

    std::vector<uint8_t> input;
    ConvertBits<8, 5, true>([&](uint8_t c) { input.push_back(c); },
                            buffer.begin(), buffer.end());
    const std::string encoded = cashaddr::Encode(random_prefix, input);
    assert(!encoded.empty());

    const std::pair<std::string, std::vector<uint8_t>> r2 =
        cashaddr::Decode(random_prefix, encoded);
    if (r2.first.empty()) {
        assert(r2.second.empty());
    } else {
        const std::string &hrp = r2.first;
        const std::vector<uint8_t> &data = r2.second;
        assert(hrp == random_prefix);
        assert(data == input);
    }
}
