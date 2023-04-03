// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Test compress_script and decompress_script.

#include <chronik-bridge/src/ffi.rs.h>
#include <chronik-cpp/chronik_bridge.h>
#include <pubkey.h>
#include <script/script.h>
#include <util/strencodings.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

BOOST_AUTO_TEST_SUITE(bridgecompression_tests)

void CheckRoundtrip(const CScript &script, bool isSmaller) {
    rust::Slice<const uint8_t> script_slice{script.data(), script.size()};
    rust::Vec<uint8_t> compressed =
        chronik_bridge::compress_script(script_slice);
    rust::Slice<const uint8_t> compressed_slice{compressed.data(),
                                                compressed.size()};
    if (isSmaller) {
        BOOST_CHECK(compressed.size() < script.size());
    } else {
        BOOST_CHECK(compressed.size() > script.size());
    }
    BOOST_CHECK_EQUAL(
        HexStr(chronik_bridge::decompress_script(compressed_slice)),
        HexStr(script));
}

BOOST_FIXTURE_TEST_CASE(test_compression, BasicTestingSetup) {
    CheckRoundtrip(CScript()
                       << OP_DUP << OP_HASH160 << std::vector<uint8_t>(20, 0x56)
                       << OP_EQUALVERIFY << OP_CHECKSIG,
                   true);

    CheckRoundtrip(CScript() << OP_HASH160 << std::vector<uint8_t>(20, 0x23)
                             << OP_EQUAL,
                   true);

    CheckRoundtrip(CScript() << std::vector<uint8_t>(33, 0x02) << OP_CHECKSIG,
                   true);

    CPubKey pubkey(std::vector<uint8_t>(33, 0x02));
    assert(pubkey.Decompress());
    CheckRoundtrip(CScript() << std::vector(pubkey.begin(), pubkey.end())
                             << OP_CHECKSIG,
                   true);

    CheckRoundtrip(CScript(), false);
    CheckRoundtrip(CScript() << OP_EQUAL << OP_VERIFY, false);
}

BOOST_AUTO_TEST_SUITE_END()
