// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "cashaddr.h"
#include "cashaddrenc.h"
#include "chainparams.h"
#include "random.h"
#include "test/test_bitcoin.h"
#include "uint256.h"
#include <boost/test/unit_test.hpp>

namespace {

std::vector<std::string> GetNetworks() {
    return {CBaseChainParams::MAIN, CBaseChainParams::TESTNET,
            CBaseChainParams::REGTEST};
}

uint160 insecure_GetRandUInt160(FastRandomContext &rand) {
    uint160 n;
    for (uint8_t *c = n.begin(); c != n.end(); ++c) {
        *c = static_cast<uint8_t>(rand.rand32());
    }
    return n;
}

class DstTypeChecker : public boost::static_visitor<void> {
public:
    void operator()(const CKeyID &id) { isKey = true; }
    void operator()(const CScriptID &id) { isScript = true; }
    void operator()(const CNoDestination &) {}

    static bool IsScriptDst(const CTxDestination &d) {
        DstTypeChecker checker;
        boost::apply_visitor(checker, d);
        return checker.isScript;
    }

    static bool IsKeyDst(const CTxDestination &d) {
        DstTypeChecker checker;
        boost::apply_visitor(checker, d);
        return checker.isKey;
    }

private:
    DstTypeChecker() : isKey(false), isScript(false) {}
    bool isKey;
    bool isScript;
};

} // anon ns

BOOST_FIXTURE_TEST_SUITE(cashaddrenc_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(encode_decode) {
    std::vector<CTxDestination> toTest = {CNoDestination{},
                                          CKeyID(uint160S("badf00d")),
                                          CScriptID(uint160S("f00dbad"))};

    for (auto dst : toTest) {
        for (auto net : GetNetworks()) {
            std::string encoded = EncodeCashAddr(dst, Params(net));
            CTxDestination decoded = DecodeCashAddr(encoded, Params(net));
            BOOST_CHECK(dst == decoded);
        }
    }
}

// Check that an encoded cash address is not valid on another network.
BOOST_AUTO_TEST_CASE(invalid_on_wrong_network) {

    const CTxDestination dst = CKeyID(uint160S("c0ffee"));
    const CTxDestination invalidDst = CNoDestination{};

    for (auto net : GetNetworks()) {
        for (auto otherNet : GetNetworks()) {
            if (net == otherNet) continue;

            std::string encoded = EncodeCashAddr(dst, Params(net));
            CTxDestination decoded = DecodeCashAddr(encoded, Params(otherNet));
            BOOST_CHECK(decoded != dst);
            BOOST_CHECK(decoded == invalidDst);
        }
    }
}

BOOST_AUTO_TEST_CASE(random_dst) {
    FastRandomContext rand(true);

    const size_t NUM_TESTS = 5000;
    const CChainParams &params = Params(CBaseChainParams::MAIN);

    for (size_t i = 0; i < NUM_TESTS; ++i) {
        uint160 hash = insecure_GetRandUInt160(rand);
        const CTxDestination dst_key = CKeyID(hash);
        const CTxDestination dst_scr = CScriptID(hash);

        const std::string encoded_key = EncodeCashAddr(dst_key, params);
        const CTxDestination decoded_key = DecodeCashAddr(encoded_key, params);

        const std::string encoded_scr = EncodeCashAddr(dst_scr, params);
        const CTxDestination decoded_scr = DecodeCashAddr(encoded_scr, params);

        std::string err("cashaddr failed for hash: ");
        err += hash.ToString();

        BOOST_CHECK_MESSAGE(dst_key == decoded_key, err);
        BOOST_CHECK_MESSAGE(dst_scr == decoded_scr, err);

        BOOST_CHECK_MESSAGE(DstTypeChecker::IsKeyDst(decoded_key), err);
        BOOST_CHECK_MESSAGE(DstTypeChecker::IsScriptDst(decoded_scr), err);
    }
}

// Test that a invalid, specially crafted cashaddr stays invalid when truncated.
BOOST_AUTO_TEST_CASE(invalid_when_truncated) {

    // Cashaddr payload is 34 5-bit nibbles. The last one is padded.  When
    // converting back to bytes, there is additional padding.
    //
    // This extra padding truncated. But we should make sure that what we
    // truncate is padding and not data.
    //
    // This test creates a invalid address that leaves data in the byte that
    // should be padding.
    uint8_t version = 0;
    std::vector<uint8_t> data = {version};
    for (size_t i = 0; i < 33; ++i)
        data.push_back(1);
    assert(data.size() == 34);

    const CChainParams params = Params(CBaseChainParams::MAIN);

    std::string fake = cashaddr::Encode(params.CashAddrPrefix(), data);
    CTxDestination nodst = CNoDestination{};
    BOOST_CHECK(nodst == DecodeCashAddr(fake, params));
}

BOOST_AUTO_TEST_CASE(test_addresses) {
    const CChainParams params = Params(CBaseChainParams::MAIN);

    std::vector<std::vector<uint8_t>> hash{
        {118, 160, 64,  83, 189, 160, 168, 139, 218, 81,
         119, 184, 106, 21, 195, 178, 159, 85,  152, 115},
        {203, 72, 18, 50, 41,  156, 213, 116, 49,  81,
         172, 75, 45, 99, 174, 25,  142, 123, 176, 169},
        {1,   31, 40,  228, 115, 201, 95, 64,  19,  215,
         213, 62, 197, 251, 195, 180, 45, 248, 237, 16}};

    std::vector<std::string> pubkey = {
        "bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a",
        "bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy",
        "bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r"};
    std::vector<std::string> script = {
        "bitcoincash:ppm2qsznhks23z7629mms6s4cwef74vcwvn0h829pq",
        "bitcoincash:pr95sy3j9xwd2ap32xkykttr4cvcu7as4yc93ky28e",
        "bitcoincash:pqq3728yw0y47sqn6l2na30mcw6zm78dzq5ucqzc37"};

    for (size_t i = 0; i < hash.size(); ++i) {
        const CTxDestination dstKey = CKeyID(uint160(hash[i]));
        const CTxDestination dstScript = CScriptID(uint160(hash[i]));

        BOOST_CHECK_EQUAL(pubkey[i],
                          EncodeCashAddr(CKeyID(uint160(hash[i])), params));
        BOOST_CHECK_EQUAL(script[i],
                          EncodeCashAddr(CScriptID(uint160(hash[i])), params));
    }
}

BOOST_AUTO_TEST_SUITE_END()
