// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <bloom.h>

#include <test/fuzz/FuzzedDataProvider.h>
#include <test/fuzz/fuzz.h>
#include <test/fuzz/util.h>
#include <uint256.h>

#include <cassert>
#include <cstdint>
#include <string>
#include <vector>

void test_one_input(const std::vector<uint8_t> &buffer) {
    FuzzedDataProvider fuzzed_data_provider(buffer.data(), buffer.size());

    CRollingBloomFilter rolling_bloom_filter{
        fuzzed_data_provider.ConsumeIntegralInRange<unsigned int>(1, 1000),
        0.999 / fuzzed_data_provider.ConsumeIntegralInRange<unsigned int>(
                    1, std::numeric_limits<unsigned int>::max())};
    while (fuzzed_data_provider.remaining_bytes() > 0) {
        switch (fuzzed_data_provider.ConsumeIntegralInRange(0, 2)) {
            case 0: {
                const std::vector<uint8_t> b =
                    ConsumeRandomLengthByteVector(fuzzed_data_provider);
                (void)rolling_bloom_filter.contains(b);
                rolling_bloom_filter.insert(b);
                const bool present = rolling_bloom_filter.contains(b);
                assert(present);
                break;
            }
            case 1: {
                const std::optional<uint256> u256 =
                    ConsumeDeserializable<uint256>(fuzzed_data_provider);
                if (!u256) {
                    break;
                }
                (void)rolling_bloom_filter.contains(*u256);
                rolling_bloom_filter.insert(*u256);
                const bool present = rolling_bloom_filter.contains(*u256);
                assert(present);
                break;
            }
            case 2:
                rolling_bloom_filter.reset();
                break;
        }
    }
}
