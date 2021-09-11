// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <consensus/amount.h>
#include <feerate.h>
#include <test/fuzz/FuzzedDataProvider.h>
#include <test/fuzz/fuzz.h>
#include <test/fuzz/util.h>

#include <cstdint>
#include <limits>
#include <string>
#include <vector>

void test_one_input(const std::vector<uint8_t> &buffer) {
    FuzzedDataProvider fuzzed_data_provider(buffer.data(), buffer.size());
    const Amount satoshis_per_k = ConsumeMoney(fuzzed_data_provider);
    const CFeeRate fee_rate{satoshis_per_k};

    (void)fee_rate.GetFeePerK();
    const size_t bytes = fuzzed_data_provider.ConsumeIntegral<size_t>();
    if (bytes <= uint64_t(std::numeric_limits<int64_t>::max())) {
        (void)fee_rate.GetFee(bytes);
    }
    (void)fee_rate.ToString();

    const Amount another_satoshis_per_k = ConsumeMoney(fuzzed_data_provider);
    CFeeRate larger_fee_rate{another_satoshis_per_k};
    larger_fee_rate += fee_rate;
    if (satoshis_per_k != Amount::zero() &&
        another_satoshis_per_k != Amount::zero()) {
        assert(fee_rate < larger_fee_rate);
        assert(!(fee_rate > larger_fee_rate));
        assert(!(fee_rate == larger_fee_rate));
        assert(fee_rate <= larger_fee_rate);
        assert(!(fee_rate >= larger_fee_rate));
        assert(fee_rate != larger_fee_rate);
    }
}
