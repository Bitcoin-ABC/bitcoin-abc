// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <flatfile.h>

#include <test/fuzz/FuzzedDataProvider.h>
#include <test/fuzz/fuzz.h>
#include <test/fuzz/util.h>

#include <cassert>
#include <cstdint>
#include <optional>
#include <string>
#include <vector>

void test_one_input(const std::vector<uint8_t> &buffer) {
    FuzzedDataProvider fuzzed_data_provider(buffer.data(), buffer.size());
    std::optional<FlatFilePos> flat_file_pos =
        ConsumeDeserializable<FlatFilePos>(fuzzed_data_provider);
    if (!flat_file_pos) {
        return;
    }
    std::optional<FlatFilePos> another_flat_file_pos =
        ConsumeDeserializable<FlatFilePos>(fuzzed_data_provider);
    if (another_flat_file_pos) {
        assert((*flat_file_pos == *another_flat_file_pos) !=
               (*flat_file_pos != *another_flat_file_pos));
    }
    (void)flat_file_pos->ToString();
    flat_file_pos->SetNull();
    assert(flat_file_pos->IsNull());
}
