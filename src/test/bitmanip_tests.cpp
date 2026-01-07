// Copyright (c) 2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <test/util/random.h>
#include <test/util/setup_common.h>
#include <util/bitmanip.h>

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(bitmanip_tests, BasicTestingSetup)

static void CheckBitCount(uint32_t value, uint32_t expected_count) {
    // Count are rotation invariant.
    for (int i = 0; i < 32; i++) {
        BOOST_CHECK_EQUAL(countBits(value), expected_count);
        value = (value << 1) | (value >> 31);
    }
}

static uint32_t countBitsNaive(uint32_t value) {
    uint32_t ret = 0;
    while (value != 0) {
        ret += (value & 0x01);
        value >>= 1;
    }

    return ret;
}

#define COUNT 4096

BOOST_AUTO_TEST_CASE(bit_count) {
    // Check various known values.
    CheckBitCount(0, 0);
    CheckBitCount(1, 1);
    CheckBitCount(0xffffffff, 32);
    CheckBitCount(0x01234567, 12);
    CheckBitCount(0x12345678, 13);
    CheckBitCount(0xfedcba98, 20);
    CheckBitCount(0x5a55aaa5, 16);
    CheckBitCount(0xdeadbeef, 24);

    for (uint32_t i = 2; i != 0; i <<= 1) {
        // Check two bit set for all combinations.
        CheckBitCount(i | 0x01, 2);
    }

    // Check many small values against a naive implementation.
    for (uint32_t v = 0; v <= 0xfff; v++) {
        CheckBitCount(v, countBitsNaive(v));
    }

    // Check random values against a naive implementation.
    for (int i = 0; i < COUNT; i++) {
        uint32_t v = m_rng.rand32();
        CheckBitCount(v, countBitsNaive(v));
    }
}

BOOST_AUTO_TEST_SUITE_END()
