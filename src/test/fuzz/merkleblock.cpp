// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <merkleblock.h>
#include <uint256.h>

#include <test/fuzz/FuzzedDataProvider.h>
#include <test/fuzz/fuzz.h>
#include <test/fuzz/util.h>

#include <cstdint>
#include <optional>
#include <string>
#include <vector>

void test_one_input(const std::vector<uint8_t> &buffer) {
    FuzzedDataProvider fuzzed_data_provider(buffer.data(), buffer.size());
    std::optional<CPartialMerkleTree> partial_merkle_tree =
        ConsumeDeserializable<CPartialMerkleTree>(fuzzed_data_provider);
    if (!partial_merkle_tree) {
        return;
    }
    (void)partial_merkle_tree->GetNumTransactions();
    std::vector<uint256> matches;
    std::vector<size_t> indices;
    (void)partial_merkle_tree->ExtractMatches(matches, indices);
}
