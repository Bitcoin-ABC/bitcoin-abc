// Copyright (c) 2012-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <compressor.h>
#include <script/standard.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

#include <cstdint>

// amounts 0.00000001 .. 0.00100000
#define NUM_MULTIPLES_UNIT 100000

// amounts 0.01 .. 100.00
#define NUM_MULTIPLES_CENT 10000

// amounts 1 .. 10000
#define NUM_MULTIPLES_1BCH 10000

// amounts 50 .. 21000000
#define NUM_MULTIPLES_50BCH 420000

BOOST_FIXTURE_TEST_SUITE(compress_tests, BasicTestingSetup)

static bool TestEncode(Amount in) {
    return in == DecompressAmount(CompressAmount(in));
}

static bool TestDecode(uint64_t in) {
    return in == CompressAmount(DecompressAmount(in));
}

static bool TestPair(Amount dec, uint64_t enc) {
    return CompressAmount(dec) == enc && DecompressAmount(enc) == dec;
}

BOOST_AUTO_TEST_CASE(compress_amounts) {
    BOOST_CHECK(TestPair(Amount::zero(), 0x0));
    BOOST_CHECK(TestPair(SATOSHI, 0x1));
    BOOST_CHECK(TestPair(CENT, 0x7));
    BOOST_CHECK(TestPair(COIN, 0x9));
    BOOST_CHECK(TestPair(50 * COIN, 0x32));
    BOOST_CHECK(TestPair(21000000 * COIN, 0x1406f40));

    for (int64_t i = 1; i <= NUM_MULTIPLES_UNIT; i++) {
        BOOST_CHECK(TestEncode(i * SATOSHI));
    }

    for (int64_t i = 1; i <= NUM_MULTIPLES_CENT; i++) {
        BOOST_CHECK(TestEncode(i * CENT));
    }

    for (int64_t i = 1; i <= NUM_MULTIPLES_1BCH; i++) {
        BOOST_CHECK(TestEncode(i * COIN));
    }

    for (int64_t i = 1; i <= NUM_MULTIPLES_50BCH; i++) {
        BOOST_CHECK(TestEncode(i * 50 * COIN));
    }

    for (int64_t i = 0; i < 100000; i++) {
        BOOST_CHECK(TestDecode(i));
    }
}

BOOST_AUTO_TEST_CASE(compress_script_to_ckey_id) {
    // case CKeyID
    CKey key;
    key.MakeNewKey(true);
    CPubKey pubkey = key.GetPubKey();

    CScript script = CScript()
                     << OP_DUP << OP_HASH160 << ToByteVector(pubkey.GetID())
                     << OP_EQUALVERIFY << OP_CHECKSIG;
    BOOST_CHECK_EQUAL(script.size(), 25U);

    std::vector<uint8_t> out;
    bool done = CompressScript(script, out);
    BOOST_CHECK_EQUAL(done, true);

    // Check compressed script
    BOOST_CHECK_EQUAL(out.size(), 21U);
    BOOST_CHECK_EQUAL(out[0], 0x00);
    // compare the 20 relevant chars of the CKeyId in the script
    BOOST_CHECK_EQUAL(memcmp(&out[1], &script[3], 20), 0);
}

BOOST_AUTO_TEST_CASE(compress_script_to_cscript_id) {
    // case CScriptID
    CScript script, redeemScript;
    script << OP_HASH160 << ToByteVector(CScriptID(redeemScript)) << OP_EQUAL;
    BOOST_CHECK_EQUAL(script.size(), 23U);

    std::vector<uint8_t> out;
    bool done = CompressScript(script, out);
    BOOST_CHECK_EQUAL(done, true);

    // Check compressed script
    BOOST_CHECK_EQUAL(out.size(), 21U);
    BOOST_CHECK_EQUAL(out[0], 0x01);
    // compare the 20 relevant chars of the CScriptId in the script
    BOOST_CHECK_EQUAL(memcmp(&out[1], &script[2], 20), 0);
}

BOOST_AUTO_TEST_CASE(compress_script_to_compressed_pubkey_id) {
    CKey key;
    // case compressed PubKeyID
    key.MakeNewKey(true);

    // COMPRESSED_PUBLIC_KEY_SIZE (33)
    CScript script = CScript() << ToByteVector(key.GetPubKey()) << OP_CHECKSIG;
    BOOST_CHECK_EQUAL(script.size(), 35U);

    std::vector<uint8_t> out;
    bool done = CompressScript(script, out);
    BOOST_CHECK_EQUAL(done, true);

    // Check compressed script
    BOOST_CHECK_EQUAL(out.size(), 33U);
    BOOST_CHECK_EQUAL(memcmp(&out[0], &script[1], 1), 0);
    // compare the 32 chars of the compressed CPubKey
    BOOST_CHECK_EQUAL(memcmp(&out[1], &script[2], 32), 0);
}

BOOST_AUTO_TEST_CASE(compress_script_to_uncompressed_pubkey_id) {
    CKey key;
    // case uncompressed PubKeyID
    key.MakeNewKey(false);
    // PUBLIC_KEY_SIZE (65)
    CScript script = CScript() << ToByteVector(key.GetPubKey()) << OP_CHECKSIG;
    // 1 char code + 65 char pubkey + OP_CHECKSIG
    BOOST_CHECK_EQUAL(script.size(), 67U);

    std::vector<uint8_t> out;
    bool done = CompressScript(script, out);
    BOOST_CHECK_EQUAL(done, true);

    // Check compressed script
    BOOST_CHECK_EQUAL(out.size(), 33U);
    // first 32 chars of CPubKey are copied into out[1:]
    BOOST_CHECK_EQUAL(memcmp(&out[1], &script[2], 32), 0);
    // least significant bit (lsb) of last char of pubkey is mapped into out[0]
    BOOST_CHECK_EQUAL(out[0], 0x04 | (script[65] & 0x01));
}

BOOST_AUTO_TEST_SUITE_END()
