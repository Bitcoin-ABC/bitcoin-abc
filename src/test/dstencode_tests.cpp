// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "chainparams.h"
#include "config.h"
#include "dstencode.h"
#include "test/test_bitcoin.h"

#include <boost/test/unit_test.hpp>

namespace {

class DummyCashAddrConfig : public DummyConfig {
public:
    DummyCashAddrConfig()
        : DummyConfig(CBaseChainParams::MAIN)  {}
};

} // namespace

BOOST_FIXTURE_TEST_SUITE(dstencode_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(test_addresses) {
    std::vector<uint8_t> hash = {118, 160, 64,  83,  189, 160, 168,
                                 139, 218, 81,  119, 184, 106, 21,
                                 195, 178, 159, 85,  152, 115};

    const CTxDestination dstKey = CKeyID(uint160(hash));
    const CTxDestination dstScript = CScriptID(uint160(hash));

    std::string cashaddr_pubkey = "devault:qpm2qsznhks23z7629mms6s4cwef74vcwvztjeqp4y";
    std::string cashaddr_script = "devault:ppm2qsznhks23z7629mms6s4cwef74vcwv4w0k8zwe";

    DummyCashAddrConfig config;

    // Check encoding
    BOOST_CHECK_EQUAL(cashaddr_pubkey, EncodeDestination(dstKey, config));
    BOOST_CHECK_EQUAL(cashaddr_script, EncodeDestination(dstScript, config));
 
    // Check decoding
    const CChainParams &params = config.GetChainParams();
    BOOST_CHECK(dstKey == DecodeDestination(cashaddr_pubkey, params));
    BOOST_CHECK(dstScript == DecodeDestination(cashaddr_script, params));

    // Validation
    BOOST_CHECK(IsValidDestinationString(cashaddr_pubkey, params));
    BOOST_CHECK(IsValidDestinationString(cashaddr_script, params));
    BOOST_CHECK(!IsValidDestinationString("notvalid", params));
}

BOOST_AUTO_TEST_SUITE_END()
