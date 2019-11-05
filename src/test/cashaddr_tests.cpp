// Copyright (c) 2017 Pieter Wuille
// Copyright (c) 2017-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <cashaddr.h>

#include <test/util/setup_common.h>
#include <test/util/str.h>

#include <boost/test/unit_test.hpp>

static std::pair<std::string, std::vector<uint8_t>>
CashAddrDecode(const std::string &str) {
    return cashaddr::Decode(str, "");
}

BOOST_FIXTURE_TEST_SUITE(cashaddr_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(cashaddr_testvectors_valid) {
    static const std::string CASES[] = {
        "prefix:x64nx6hz",
        "PREFIX:X64NX6HZ",
        "p:gpf8m4h7",
        "bitcoincash:qpzry9x8gf2tvdw0s3jn54khce6mua7lcw20ayyn",
        "bchtest:testnetaddress4d6njnut",
        "bchreg:555555555555555555555555555555555555555555555udxmlmrz",
    };

    for (const std::string &str : CASES) {
        auto ret = CashAddrDecode(str);
        BOOST_CHECK_MESSAGE(!ret.first.empty(), str);
        std::string recode = cashaddr::Encode(ret.first, ret.second);
        BOOST_CHECK_MESSAGE(!recode.empty(), str);
        BOOST_CHECK_MESSAGE(CaseInsensitiveEqual(str, recode), str);
    }
}

BOOST_AUTO_TEST_CASE(cashaddr_testvectors_invalid) {
    static const std::string CASES[] = {
        "prefix:x32nx6hz",
        "prEfix:x64nx6hz",
        "prefix:x64nx6Hz",
        "pref1x:6m8cxv73",
        "prefix:",
        ":u9wsx07j",
        "bchreg:555555555555555555x55555555555555555555555555udxmlmrz",
        "bchreg:555555555555555555555555555555551555555555555udxmlmrz",
        "pre:fix:x32nx6hz",
        "prefixx64nx6hz",
    };

    for (const std::string &str : CASES) {
        auto ret = CashAddrDecode(str);
        BOOST_CHECK_MESSAGE(ret.first.empty(), str);
    }
}

BOOST_AUTO_TEST_CASE(cashaddr_rawencode) {
    typedef std::pair<std::string, std::vector<uint8_t>> raw;

    raw toEncode;
    toEncode.first = "helloworld";
    toEncode.second = {0x1f, 0x0d};

    std::string encoded = cashaddr::Encode(toEncode.first, toEncode.second);
    raw decoded = CashAddrDecode(encoded);

    BOOST_CHECK_EQUAL(toEncode.first, decoded.first);
    BOOST_CHECK_EQUAL_COLLECTIONS(begin(toEncode.second), end(toEncode.second),
                                  begin(decoded.second), end(decoded.second));
}

BOOST_AUTO_TEST_CASE(cashaddr_testvectors_noprefix) {
    static const std::pair<std::string, std::string> CASES[] = {
        {"bitcoincash", "qpzry9x8gf2tvdw0s3jn54khce6mua7lcw20ayyn"},
        {"prefix", "x64nx6hz"},
        {"PREFIX", "X64NX6HZ"},
        {"p", "gpf8m4h7"},
        {"bitcoincash", "qpzry9x8gf2tvdw0s3jn54khce6mua7lcw20ayyn"},
        {"bchtest", "testnetaddress4d6njnut"},
        {"bchreg", "555555555555555555555555555555555555555555555udxmlmrz"},
    };

    for (const std::pair<std::string, std::string> &c : CASES) {
        std::string prefix = c.first;
        std::string payload = c.second;
        std::string addr = prefix + ":" + payload;
        auto ret = cashaddr::Decode(payload, prefix);
        BOOST_CHECK_MESSAGE(CaseInsensitiveEqual(ret.first, prefix), addr);
        std::string recode = cashaddr::Encode(ret.first, ret.second);
        BOOST_CHECK_MESSAGE(!recode.empty(), addr);
        BOOST_CHECK_MESSAGE(CaseInsensitiveEqual(addr, recode), addr);
    }
}

BOOST_AUTO_TEST_SUITE_END()
