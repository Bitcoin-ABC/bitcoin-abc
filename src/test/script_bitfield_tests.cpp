// Copyright (c) 2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <script/bitfield.h>
#include <script/script_error.h>
#include <test/test_bitcoin.h>

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(script_bitfield_tests, BasicTestingSetup)

static void CheckBitFieldFailure(const std::vector<uint8_t> &vch, unsigned size,
                                 ScriptError expected_error) {
    uint32_t bitfield;
    ScriptError serror = ScriptError::OK;

    // First check that size larger than 32 get rejected.
    BOOST_CHECK(!DecodeBitfield(vch, size, bitfield, &serror));
    BOOST_CHECK(serror == expected_error);
}

static void CheckBitFieldSuccess(const std::vector<uint8_t> &vch, unsigned size,
                                 uint32_t result) {
    uint32_t bitfield;
    ScriptError serror = ScriptError::OK;

    // First check that size larger than 32 get rejected.
    BOOST_CHECK(DecodeBitfield(vch, size, bitfield, &serror));
    BOOST_CHECK_EQUAL(bitfield, result);
    BOOST_CHECK(serror == ScriptError::OK);

    // One more byte and the test case is invalid.
    std::vector<uint8_t> copy = vch;
    copy.push_back(0x00);
    CheckBitFieldFailure(copy, size, ScriptError::INVALID_BITFIELD_SIZE);
    copy.pop_back();

    // One less byte and the test case is also invalid.
    while (copy.size() > 0) {
        copy.pop_back();
        CheckBitFieldFailure(copy, size, ScriptError::INVALID_BITFIELD_SIZE);
    }

    // Pop the first element and recurse.
    if (size >= 8) {
        copy = vch;
        copy.erase(copy.begin());
        CheckBitFieldSuccess(copy, size - 8, result >> 8);
    }
}

BOOST_AUTO_TEST_CASE(decode_bitfield) {
    // Size 0 => empty bitfield.
    CheckBitFieldSuccess({}, 0, 0);

    // Size 1 to 8 => 1 byte bitfield.
    for (unsigned i = 1; i <= 8; i++) {
        CheckBitFieldSuccess({0x00}, i, 0);
    }

    // Size 9 to 16 => 2 bytes bitfield.
    for (unsigned i = 9; i <= 16; i++) {
        CheckBitFieldSuccess({0x00, 0x00}, i, 0);
    }

    // Size 17 to 24 => 3 bytes bitfield.
    for (unsigned i = 17; i <= 24; i++) {
        CheckBitFieldSuccess({0x00, 0x00, 0x00}, i, 0);
    }

    // Size 25 to 32 => 3 bytes bitfield.
    for (unsigned i = 25; i <= 32; i++) {
        CheckBitFieldSuccess({0x00, 0x00, 0x00, 0x00}, i, 0);
    }

    // Size greater than 32 => failure.
    for (unsigned i = 33; i <= 100; i++) {
        CheckBitFieldFailure({0x00, 0x00, 0x00, 0x00, 0x00}, i,
                             ScriptError::INVALID_BITFIELD_SIZE);
    }

    // Check various bit patterns.
    CheckBitFieldSuccess({0xff, 0xff, 0xff, 0xff}, 32, 0xffffffff);
    CheckBitFieldSuccess({0x98, 0xba, 0xdc, 0xfe}, 32, 0xfedcba98);
    CheckBitFieldSuccess({0xef, 0xbe, 0xad, 0xde}, 32, 0xdeadbeef);
    CheckBitFieldSuccess({0xa5, 0xa5, 0xa5, 0xa5}, 32, 0xa5a5a5a5);
    CheckBitFieldSuccess({0x5a, 0x5a, 0x5a, 0x5a}, 32, 0x5a5a5a5a);

    // More valid bit patterns.
    for (unsigned i = 1; i <= 8; i++) {
        uint8_t first = (1 << i) - 1;
        CheckBitFieldSuccess({0x56, 0x34, 0x12, first}, 24 + i,
                             (0x123456 | (first << 24)));
    }

    // Out of range bits.
    for (unsigned i = 1; i < 8; i++) {
        const uint8_t first = (1 << i) - 1;
        for (unsigned j = i; j < 8; j++) {
            CheckBitFieldFailure({0x56, 0x34, 0x12, uint8_t(first | (1 << j))},
                                 24 + i, ScriptError::INVALID_BIT_RANGE);
        }
    }
}

BOOST_AUTO_TEST_SUITE_END()
