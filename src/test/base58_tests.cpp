// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "base58.h"

#include "data/base58_encode_decode.json.h"
#include "data/base58_keys_invalid.json.h"
#include "data/base58_keys_valid.json.h"

#include "key.h"
#include "script/script.h"
#include "test/jsonutil.h"
#include "test/test_bitcoin.h"
#include "uint256.h"
#include "util.h"
#include "utilstrencodings.h"

#include <boost/test/unit_test.hpp>

#include <univalue.h>

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
        BOOST_CHECK_MESSAGE(
            EncodeBase58(sourcedata.data(),
                         sourcedata.data() + sourcedata.size()) == base58string,
            strTest);
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
        BOOST_CHECK_MESSAGE(DecodeBase58(base58string, result), strTest);
        BOOST_CHECK_MESSAGE(
            result.size() == expected.size() &&
                std::equal(result.begin(), result.end(), expected.begin()),
            strTest);
    }

    BOOST_CHECK(!DecodeBase58("invalid", result));

    // check that DecodeBase58 skips whitespace, but still fails with unexpected
    // non-whitespace at the end.
    BOOST_CHECK(!DecodeBase58(" \t\n\v\f\r skip \r\f\v\n\t a", result));
    BOOST_CHECK(DecodeBase58(" \t\n\v\f\r skip \r\f\v\n\t ", result));
    std::vector<uint8_t> expected = ParseHex("971a55");
    BOOST_CHECK_EQUAL_COLLECTIONS(result.begin(), result.end(),
                                  expected.begin(), expected.end());
}

// Visitor to check address type
class TestAddrTypeVisitor : public boost::static_visitor<bool> {
private:
    std::string exp_addrType;

public:
    explicit TestAddrTypeVisitor(const std::string &_exp_addrType)
        : exp_addrType(_exp_addrType) {}
    bool operator()(const CKeyID &id) const {
        return (exp_addrType == "pubkey");
    }
    bool operator()(const CScriptID &id) const {
        return (exp_addrType == "script");
    }
    bool operator()(const CNoDestination &no) const {
        return (exp_addrType == "none");
    }
};

// Visitor to check address payload
class TestPayloadVisitor : public boost::static_visitor<bool> {
private:
    std::vector<uint8_t> exp_payload;

public:
    explicit TestPayloadVisitor(std::vector<uint8_t> &_exp_payload)
        : exp_payload(_exp_payload) {}
    bool operator()(const CKeyID &id) const {
        uint160 exp_key(exp_payload);
        return exp_key == id;
    }
    bool operator()(const CScriptID &id) const {
        uint160 exp_key(exp_payload);
        return exp_key == id;
    }
    bool operator()(const CNoDestination &no) const {
        return exp_payload.size() == 0;
    }
};



BOOST_AUTO_TEST_SUITE_END()
