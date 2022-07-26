// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <serialize_intcode.h>
#include <streams.h>
#include <univalue.h>
#include <util/strencodings.h>

#include <test/data/intcode_invalid.json.h>
#include <test/data/intcode_valid.json.h>
#include <test/jsonutil.h>
#include <test/lcg.h>
#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(serialize_intcode_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(example_intcode_valid_json) {
    UniValue tests = read_json(json_tests::intcode_valid);

    for (size_t idx = 0; idx < tests.size(); idx++) {
        const UniValue &test = tests[idx];
        std::string strTest = test.write();
        if (!test.isArray()) {
            BOOST_ERROR("Bad test, expected array: " << strTest);
            continue;
        }
        if (test.size() != 2 || !test[0].isStr() || !test[1].isStr()) {
            BOOST_ERROR("Bad test, expected two strings: " << strTest);
            continue;
        }
        const std::string &integerStr = test[0].get_str();
        const std::string &encodedHex = test[1].get_str();

        if (integerStr.substr(0, 2) != "0x" || integerStr.size() <= 2) {
            BOOST_ERROR(
                "Bad test, expected hex of the form 0x...: " << integerStr);
        }

        // Hex numbers
        if (!IsHex(std::string(integerStr.begin() + 2, integerStr.end()))) {
            BOOST_ERROR("Bad test, invalid hex: '" << integerStr << "'.");
        }

        uint64_t num = 0;
        std::vector<uint8_t> raw =
            ParseHex(std::string(integerStr.begin() + 2, integerStr.end()));
        for (uint8_t byte : raw) {
            num = (num << 8) | byte;
        }

        const std::vector<uint8_t> encoded = ParseHex(encodedHex);

        CDataStream ss(SER_DISK, 0);
        WriteIntcode(ss, num);
        BOOST_CHECK_EQUAL(HexStr(ss), encodedHex);

        ss.clear();
        ss.write(MakeByteSpan(encoded));
        BOOST_CHECK_EQUAL(ReadIntcode(ss), num);
    }
}

BOOST_AUTO_TEST_CASE(example_intcode_invalid_json) {
    UniValue tests = read_json(json_tests::intcode_invalid);

    for (size_t idx = 0; idx < tests.size(); idx++) {
        const std::string &hex = tests[idx].get_str();
        const std::vector<uint8_t> invalid = ParseHex(hex);
        CDataStream ss(invalid, SER_DISK, 0);
        BOOST_CHECK_THROW(ReadIntcode(ss), std::ios_base::failure);
    }
}

BOOST_AUTO_TEST_CASE(rng_roundtrip) {
    MMIXLinearCongruentialGenerator lcg;
    CDataStream ss(SER_DISK, 0);

    for (int i = 0; i < 1000000; ++i) {
        uint64_t bits = (uint64_t(lcg.next()) << 32) | lcg.next();
        bits >>= lcg.next() % 64;

        WriteIntcode(ss, bits);
        BOOST_CHECK_EQUAL(ReadIntcode(ss), bits);
        ss.clear();
    }
}

BOOST_AUTO_TEST_SUITE_END()
