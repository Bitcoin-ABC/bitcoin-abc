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

std::vector<uint8_t> insecure_GetRandomByteArray(FastRandomContext &rand,
                                                 size_t n) {
    std::vector<uint8_t> out;
    out.reserve(n);

    for (size_t i = 0; i < n; i++) {
        out.push_back(uint8_t(rand.randbits(8)));
    }
    return out;
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

// Map all possible size bits in the version to the expected size of the
// hash in bytes.
const std::array<std::pair<uint8_t, uint32_t>, 8> valid_sizes = {
    {{0, 20}, {1, 24}, {2, 28}, {3, 32}, {4, 40}, {5, 48}, {6, 56}, {7, 64}}};

} // namespace

BOOST_FIXTURE_TEST_SUITE(cashaddrenc_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(encode_decode_all_sizes) {
    FastRandomContext rand(true);
    const CChainParams &params = Params(CBaseChainParams::MAIN);

    for (auto ps : valid_sizes) {
        std::vector<uint8_t> data =
            insecure_GetRandomByteArray(rand, ps.second);
        CashAddrContent content = {PUBKEY_TYPE, data};
        std::vector<uint8_t> packed_data = PackCashAddrContent(content);

        // Check that the packed size is correct
        BOOST_CHECK_EQUAL(packed_data[1] >> 2, ps.first);
        std::string address =
            cashaddr::Encode(params.CashAddrPrefix(), packed_data);

        // Check that the address decodes properly
        CashAddrContent decoded = DecodeCashAddrContent(address, params);
        BOOST_CHECK_EQUAL_COLLECTIONS(
            std::begin(content.hash), std::end(content.hash),
            std::begin(decoded.hash), std::end(decoded.hash));
    }
}

BOOST_AUTO_TEST_CASE(check_packaddr_throws) {
    FastRandomContext rand(true);

    for (auto ps : valid_sizes) {
        std::vector<uint8_t> data =
            insecure_GetRandomByteArray(rand, ps.second - 1);
        CashAddrContent content = {PUBKEY_TYPE, data};
        BOOST_CHECK_THROW(PackCashAddrContent(content), std::runtime_error);
    }
}

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

/**
 * Cashaddr payload made of 5-bit nibbles. The last one is padded. When
 * converting back to bytes, this extra padding is truncated. In order to ensure
 * cashaddr are cannonicals, we check that the data we truncate is zeroed.
 */
BOOST_AUTO_TEST_CASE(check_padding) {
    uint8_t version = 0;
    std::vector<uint8_t> data = {version};
    for (size_t i = 0; i < 33; ++i) {
        data.push_back(1);
    }

    BOOST_CHECK_EQUAL(data.size(), 34UL);

    const CTxDestination nodst = CNoDestination{};
    const CChainParams params = Params(CBaseChainParams::MAIN);

    for (uint8_t i = 0; i < 32; i++) {
        data[data.size() - 1] = i;
        std::string fake = cashaddr::Encode(params.CashAddrPrefix(), data);
        CTxDestination dst = DecodeCashAddr(fake, params);

        // We have 168 bits of payload encoded as 170 bits in 5 bits nimbles. As
        // a result, we must have 2 zeros.
        if (i & 0x03) {
            BOOST_CHECK(dst == nodst);
        } else {
            BOOST_CHECK(dst != nodst);
        }
    }
}

/**
 * We ensure type is extracted properly from the version.
 */
BOOST_AUTO_TEST_CASE(check_type) {
    std::vector<uint8_t> data;
    data.resize(34);

    const CChainParams params = Params(CBaseChainParams::MAIN);

    for (uint8_t v = 0; v < 16; v++) {
        std::fill(begin(data), end(data), 0);
        data[0] = v;
        auto content = DecodeCashAddrContent(
            cashaddr::Encode(params.CashAddrPrefix(), data), params);
        BOOST_CHECK_EQUAL(content.type, v);
        BOOST_CHECK_EQUAL(content.hash.size(), 20UL);

        // Check that using the reserved bit result in a failure.
        data[0] |= 0x10;
        content = DecodeCashAddrContent(
            cashaddr::Encode(params.CashAddrPrefix(), data), params);
        BOOST_CHECK_EQUAL(content.type, 0);
        BOOST_CHECK_EQUAL(content.hash.size(), 0UL);
    }
}

/**
 * We ensure size is extracted and checked properly.
 */
BOOST_AUTO_TEST_CASE(check_size) {
    const CTxDestination nodst = CNoDestination{};
    const CChainParams params = Params(CBaseChainParams::MAIN);

    std::vector<uint8_t> data;

    for (auto ps : valid_sizes) {
        // Number of bytes required for a 5-bit packed version of a hash, with
        // version byte.  Add half a byte(4) so integer math provides the next
        // multiple-of-5 that would fit all the data.
        size_t expectedSize = (8 * (1 + ps.second) + 4) / 5;
        data.resize(expectedSize);
        std::fill(begin(data), end(data), 0);
        // After conversion from 8 bit packing to 5 bit packing, the size will
        // be in the second 5-bit group, shifted left twice.
        data[1] = ps.first << 2;

        auto content = DecodeCashAddrContent(
            cashaddr::Encode(params.CashAddrPrefix(), data), params);

        BOOST_CHECK_EQUAL(content.type, 0);
        BOOST_CHECK_EQUAL(content.hash.size(), ps.second);

        data.push_back(0);
        content = DecodeCashAddrContent(
            cashaddr::Encode(params.CashAddrPrefix(), data), params);

        BOOST_CHECK_EQUAL(content.type, 0);
        BOOST_CHECK_EQUAL(content.hash.size(), 0UL);

        data.pop_back();
        data.pop_back();
        content = DecodeCashAddrContent(
            cashaddr::Encode(params.CashAddrPrefix(), data), params);

        BOOST_CHECK_EQUAL(content.type, 0);
        BOOST_CHECK_EQUAL(content.hash.size(), 0UL);
    }
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
        BOOST_CHECK_EQUAL(pubkey[i], EncodeCashAddr(dstKey, params));

        const CTxDestination dstScript = CScriptID(uint160(hash[i]));
        BOOST_CHECK_EQUAL(script[i], EncodeCashAddr(dstScript, params));
    }
}

BOOST_AUTO_TEST_SUITE_END()
