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

// Goal: check that parsed keys match test payload
BOOST_AUTO_TEST_CASE(base58_keys_valid_parse) {
    UniValue tests = read_json(std::string(
        json_tests::base58_keys_valid,
        json_tests::base58_keys_valid + sizeof(json_tests::base58_keys_valid)));
    CBitcoinSecret secret;
    CTxDestination destination;
    SelectParams(CBaseChainParams::MAIN);

    for (unsigned int idx = 0; idx < tests.size(); idx++) {
        UniValue test = tests[idx];
        std::string strTest = test.write();
        // Allow for extra stuff (useful for comments)
        if (test.size() < 3) {
            BOOST_ERROR("Bad test: " << strTest);
            continue;
        }
        std::string exp_base58string = test[0].get_str();
        std::vector<uint8_t> exp_payload = ParseHex(test[1].get_str());
        const UniValue &metadata = test[2].get_obj();
        bool isPrivkey = find_value(metadata, "isPrivkey").get_bool();
        bool isTestnet = find_value(metadata, "isTestnet").get_bool();
        if (isTestnet)
            SelectParams(CBaseChainParams::TESTNET);
        else
            SelectParams(CBaseChainParams::MAIN);
        if (isPrivkey) {
            bool isCompressed = find_value(metadata, "isCompressed").get_bool();
            // Must be valid private key
            BOOST_CHECK_MESSAGE(secret.SetString(exp_base58string),
                                "!SetString:" + strTest);
            BOOST_CHECK_MESSAGE(secret.IsValid(), "!IsValid:" + strTest);
            CKey privkey = secret.GetKey();
            BOOST_CHECK_MESSAGE(privkey.IsCompressed() == isCompressed,
                                "compressed mismatch:" + strTest);
            BOOST_CHECK_MESSAGE(privkey.size() == exp_payload.size() &&
                                    std::equal(privkey.begin(), privkey.end(),
                                               exp_payload.begin()),
                                "key mismatch:" + strTest);

            // Private key must be invalid public key
            destination = DecodeLegacyAddr(exp_base58string, Params());
            BOOST_CHECK_MESSAGE(!IsValidDestination(destination),
                                "IsValid privkey as pubkey:" + strTest);
        } else {
            // "script" or "pubkey"
            std::string exp_addrType =
                find_value(metadata, "addrType").get_str();
            // Must be valid public key
            destination = DecodeLegacyAddr(exp_base58string, Params());
            BOOST_CHECK_MESSAGE(IsValidDestination(destination),
                                "!IsValid:" + strTest);
            BOOST_CHECK_MESSAGE((boost::get<CScriptID>(&destination) !=
                                 nullptr) == (exp_addrType == "script"),
                                "isScript mismatch" + strTest);
            BOOST_CHECK_MESSAGE(
                boost::apply_visitor(TestAddrTypeVisitor(exp_addrType),
                                     destination),
                "addrType mismatch" + strTest);

            // Public key must be invalid private key
            secret.SetString(exp_base58string);
            BOOST_CHECK_MESSAGE(!secret.IsValid(),
                                "IsValid pubkey as privkey:" + strTest);
        }
    }
}

// Goal: check that generated keys match test vectors
BOOST_AUTO_TEST_CASE(base58_keys_valid_gen) {
    UniValue tests = read_json(std::string(
        json_tests::base58_keys_valid,
        json_tests::base58_keys_valid + sizeof(json_tests::base58_keys_valid)));

    for (unsigned int idx = 0; idx < tests.size(); idx++) {
        UniValue test = tests[idx];
        std::string strTest = test.write();
        // Allow for extra stuff (useful for comments)
        if (test.size() < 3) {
            BOOST_ERROR("Bad test: " << strTest);
            continue;
        }
        std::string exp_base58string = test[0].get_str();
        std::vector<uint8_t> exp_payload = ParseHex(test[1].get_str());
        const UniValue &metadata = test[2].get_obj();
        bool isPrivkey = find_value(metadata, "isPrivkey").get_bool();
        bool isTestnet = find_value(metadata, "isTestnet").get_bool();
        if (isTestnet)
            SelectParams(CBaseChainParams::TESTNET);
        else
            SelectParams(CBaseChainParams::MAIN);
        if (isPrivkey) {
            bool isCompressed = find_value(metadata, "isCompressed").get_bool();
            CKey key;
            key.Set(exp_payload.begin(), exp_payload.end(), isCompressed);
            assert(key.IsValid());
            CBitcoinSecret secret;
            secret.SetKey(key);
            BOOST_CHECK_MESSAGE(secret.ToString() == exp_base58string,
                                "result mismatch: " + strTest);
        } else {
            std::string exp_addrType =
                find_value(metadata, "addrType").get_str();
            CTxDestination dest;
            if (exp_addrType == "pubkey") {
                dest = CKeyID(uint160(exp_payload));
            } else if (exp_addrType == "script") {
                dest = CScriptID(uint160(exp_payload));
            } else if (exp_addrType == "none") {
                dest = CNoDestination();
            } else {
                BOOST_ERROR("Bad addrtype: " << strTest);
                continue;
            }
            std::string address = EncodeLegacyAddr(dest, Params());
            BOOST_CHECK_MESSAGE(address == exp_base58string,
                                "mismatch: " + strTest);
        }
    }

    SelectParams(CBaseChainParams::MAIN);
}

// Goal: check that base58 parsing code is robust against a variety of corrupted
// data
BOOST_AUTO_TEST_CASE(base58_keys_invalid) {
    // Negative testcases
    UniValue tests =
        read_json(std::string(json_tests::base58_keys_invalid,
                              json_tests::base58_keys_invalid +
                                  sizeof(json_tests::base58_keys_invalid)));
    CBitcoinSecret secret;
    CTxDestination destination;

    for (unsigned int idx = 0; idx < tests.size(); idx++) {
        UniValue test = tests[idx];
        std::string strTest = test.write();
        // Allow for extra stuff (useful for comments)
        if (test.size() < 1) {
            BOOST_ERROR("Bad test: " << strTest);
            continue;
        }
        std::string exp_base58string = test[0].get_str();

        // must be invalid as public and as private key
        destination = DecodeLegacyAddr(exp_base58string, Params());
        BOOST_CHECK_MESSAGE(!IsValidDestination(destination),
                            "IsValid pubkey:" + strTest);
        secret.SetString(exp_base58string);
        BOOST_CHECK_MESSAGE(!secret.IsValid(), "IsValid privkey:" + strTest);
    }
}

BOOST_AUTO_TEST_SUITE_END()
