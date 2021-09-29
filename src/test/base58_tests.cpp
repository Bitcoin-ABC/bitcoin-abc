// Copyright (c) 2011-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <test/data/base58_encode_decode.json.h>

#include <base58.h>
#include <test/jsonutil.h>
#include <test/util/setup_common.h>
#include <util/strencodings.h>
#include <util/vector.h>

#include <univalue.h>

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(base58_tests, BasicTestingSetup)

// Goal: test low-level base58 encoding functionality
BOOST_AUTO_TEST_CASE(base58_EncodeBase58) {
    UniValue tests =
        read_json(std::string(json_tests::base58_encode_decode,
                              json_tests::base58_encode_decode +
                                  sizeof(json_tests::base58_encode_decode)));
    for (unsigned int idx = 0; idx < tests.size(); idx++) {
        UniValue test = tests[idx];
        std::string strTest = test.write();
        // Allow for extra stuff (useful for comments)
        if (test.size() < 2) {
            BOOST_ERROR("Bad test: " << strTest);
            continue;
        }
        std::vector<uint8_t> sourcedata = ParseHex(test[0].get_str());
        std::string base58string = test[1].get_str();
        BOOST_CHECK_MESSAGE(EncodeBase58(sourcedata) == base58string, strTest);
    }
}

// Goal: test low-level base58 decoding functionality
BOOST_AUTO_TEST_CASE(base58_DecodeBase58) {
    UniValue tests =
        read_json(std::string(json_tests::base58_encode_decode,
                              json_tests::base58_encode_decode +
                                  sizeof(json_tests::base58_encode_decode)));
    std::vector<uint8_t> result;

    for (unsigned int idx = 0; idx < tests.size(); idx++) {
        UniValue test = tests[idx];
        std::string strTest = test.write();
        // Allow for extra stuff (useful for comments)
        if (test.size() < 2) {
            BOOST_ERROR("Bad test: " << strTest);
            continue;
        }
        std::vector<uint8_t> expected = ParseHex(test[0].get_str());
        std::string base58string = test[1].get_str();
        BOOST_CHECK_MESSAGE(DecodeBase58(base58string, result, 256), strTest);
        BOOST_CHECK_MESSAGE(
            result.size() == expected.size() &&
                std::equal(result.begin(), result.end(), expected.begin()),
            strTest);
    }

    BOOST_CHECK(!DecodeBase58("invalid", result, 100));
    BOOST_CHECK(!DecodeBase58(std::string("invalid"), result, 100));
    BOOST_CHECK(!DecodeBase58(std::string("\0invalid", 8), result, 100));

    BOOST_CHECK(DecodeBase58(std::string("good", 4), result, 100));
    BOOST_CHECK(!DecodeBase58(std::string("bad0IOl", 7), result, 100));
    BOOST_CHECK(!DecodeBase58(std::string("goodbad0IOl", 11), result, 100));
    BOOST_CHECK(!DecodeBase58(std::string("good\0bad0IOl", 12), result, 100));

    // check that DecodeBase58 skips whitespace, but still fails with unexpected
    // non-whitespace at the end.
    BOOST_CHECK(!DecodeBase58(" \t\n\v\f\r skip \r\f\v\n\t a", result, 3));
    BOOST_CHECK(DecodeBase58(" \t\n\v\f\r skip \r\f\v\n\t ", result, 3));
    std::vector<uint8_t> expected = ParseHex("971a55");
    BOOST_CHECK_EQUAL_COLLECTIONS(result.begin(), result.end(),
                                  expected.begin(), expected.end());

    BOOST_CHECK(DecodeBase58Check(std::string("3vQB7B6MrGQZaxCuFg4oh", 21),
                                  result, 100));
    BOOST_CHECK(!DecodeBase58Check(std::string("3vQB7B6MrGQZaxCuFg4oi", 21),
                                   result, 100));
    BOOST_CHECK(!DecodeBase58Check(std::string("3vQB7B6MrGQZaxCuFg4oh0IOl", 25),
                                   result, 100));
    BOOST_CHECK(!DecodeBase58Check(
        std::string("3vQB7B6MrGQZaxCuFg4oh\00IOl", 26), result, 100));
}

BOOST_AUTO_TEST_CASE(base58_random_encode_decode) {
    for (int n = 0; n < 1000; ++n) {
        unsigned int len = 1 + InsecureRandBits(8);
        unsigned int zeroes =
            InsecureRandBool() ? InsecureRandRange(len + 1) : 0;
        auto data = Cat(std::vector<uint8_t>(zeroes, '\000'),
                        g_insecure_rand_ctx.randbytes(len - zeroes));
        auto encoded = EncodeBase58Check(data);
        std::vector<uint8_t> decoded;
        auto ok_too_small =
            DecodeBase58Check(encoded, decoded, InsecureRandRange(len));
        BOOST_CHECK(!ok_too_small);
        auto ok = DecodeBase58Check(encoded, decoded,
                                    len + InsecureRandRange(257 - len));
        BOOST_CHECK(ok);
        BOOST_CHECK(data == decoded);
    }
}

BOOST_AUTO_TEST_SUITE_END()
