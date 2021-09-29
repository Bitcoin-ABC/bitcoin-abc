// Copyright (c) 2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <core_io.h>
#include <primitives/block.h>
#include <pubkey.h>
#include <rpc/util.h>
#include <uint256.h>
#include <util/strencodings.h>

#include <univalue.h>

#include <test/fuzz/fuzz.h>

#include <cassert>
#include <cstdint>
#include <string>
#include <vector>

void initialize() {
    static const ECCVerifyHandle verify_handle;
}

void test_one_input(const std::vector<uint8_t> &buffer) {
    const std::string random_hex_string(buffer.begin(), buffer.end());
    const std::vector<uint8_t> data = ParseHex(random_hex_string);
    const std::string hex_data = HexStr(data);
    if (IsHex(random_hex_string)) {
        assert(ToLower(random_hex_string) == hex_data);
    }
    (void)IsHexNumber(random_hex_string);
    uint256 result;
    (void)ParseHashStr(random_hex_string, result);
    (void)uint256S(random_hex_string);
    try {
        (void)HexToPubKey(random_hex_string);
    } catch (const UniValue &) {
    }
    CBlockHeader block_header;
    (void)DecodeHexBlockHeader(block_header, random_hex_string);
    CBlock block;
    (void)DecodeHexBlk(block, random_hex_string);
}
