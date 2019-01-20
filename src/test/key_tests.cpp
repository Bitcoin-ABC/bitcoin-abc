// Copyright (c) 2012-2015 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "key.h"

#include "base58.h"
#include "dstencode.h"
#include "script/script.h"
#include "test/test_bitcoin.h"
#include "uint256.h"
#include "util.h"
#include "utilstrencodings.h"

#include <string>
#include <vector>

#include <boost/test/unit_test.hpp>

static const std::string strSecret1 =
    "5HxWvvfubhXpYYpS3tJkw6fq9jE9j18THftkZjHHfmFiWtmAbrj";
static const std::string strSecret2 =
    "5KC4ejrDjv152FGwP386VD1i2NYc5KkfSMyv1nGy1VGDxGHqVY3";
static const std::string strSecret1C =
    "Kwr371tjA9u2rFSMZjTNun2PXXP3WPZu2afRHTcta6KxEUdm1vEw";
static const std::string strSecret2C =
    "L3Hq7a8FEQwJkW1M2GNKDW28546Vp5miewcCzSqUD9kCAXrJdS3g";
static const std::string addr1 = "1QFqqMUD55ZV3PJEJZtaKCsQmjLT6JkjvJ";
static const std::string addr2 = "1F5y5E5FMc5YzdJtB9hLaUe43GDxEKXENJ";
static const std::string addr1C = "1NoJrossxPBKfCHuJXT4HadJrXRE9Fxiqs";
static const std::string addr2C = "1CRj2HyM1CXWzHAXLQtiGLyggNT9WQqsDs";

static const std::string strAddressBad = "1HV9Lc3sNHZxwj4Zk6fB38tEmBryq2cBiF";

BOOST_FIXTURE_TEST_SUITE(key_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(key_test1) {
    CBitcoinSecret bsecret1, bsecret2, bsecret1C, bsecret2C, baddress1;
    BOOST_CHECK(bsecret1.SetString(strSecret1));
    BOOST_CHECK(bsecret2.SetString(strSecret2));
    BOOST_CHECK(bsecret1C.SetString(strSecret1C));
    BOOST_CHECK(bsecret2C.SetString(strSecret2C));
    BOOST_CHECK(!baddress1.SetString(strAddressBad));

    CKey key1 = bsecret1.GetKey();
    BOOST_CHECK(key1.IsCompressed() == false);
    CKey key2 = bsecret2.GetKey();
    BOOST_CHECK(key2.IsCompressed() == false);
    CKey key1C = bsecret1C.GetKey();
    BOOST_CHECK(key1C.IsCompressed() == true);
    CKey key2C = bsecret2C.GetKey();
    BOOST_CHECK(key2C.IsCompressed() == true);

    CPubKey pubkey1 = key1.GetPubKey();
    CPubKey pubkey2 = key2.GetPubKey();
    CPubKey pubkey1C = key1C.GetPubKey();
    CPubKey pubkey2C = key2C.GetPubKey();

    BOOST_CHECK(key1.VerifyPubKey(pubkey1));
    BOOST_CHECK(!key1.VerifyPubKey(pubkey1C));
    BOOST_CHECK(!key1.VerifyPubKey(pubkey2));
    BOOST_CHECK(!key1.VerifyPubKey(pubkey2C));

    BOOST_CHECK(!key1C.VerifyPubKey(pubkey1));
    BOOST_CHECK(key1C.VerifyPubKey(pubkey1C));
    BOOST_CHECK(!key1C.VerifyPubKey(pubkey2));
    BOOST_CHECK(!key1C.VerifyPubKey(pubkey2C));

    BOOST_CHECK(!key2.VerifyPubKey(pubkey1));
    BOOST_CHECK(!key2.VerifyPubKey(pubkey1C));
    BOOST_CHECK(key2.VerifyPubKey(pubkey2));
    BOOST_CHECK(!key2.VerifyPubKey(pubkey2C));

    BOOST_CHECK(!key2C.VerifyPubKey(pubkey1));
    BOOST_CHECK(!key2C.VerifyPubKey(pubkey1C));
    BOOST_CHECK(!key2C.VerifyPubKey(pubkey2));
    BOOST_CHECK(key2C.VerifyPubKey(pubkey2C));

    const CChainParams &chainParams = Params();
    BOOST_CHECK(DecodeDestination(addr1, chainParams) ==
                CTxDestination(pubkey1.GetID()));
    BOOST_CHECK(DecodeDestination(addr2, chainParams) ==
                CTxDestination(pubkey2.GetID()));
    BOOST_CHECK(DecodeDestination(addr1C, chainParams) ==
                CTxDestination(pubkey1C.GetID()));
    BOOST_CHECK(DecodeDestination(addr2C, chainParams) ==
                CTxDestination(pubkey2C.GetID()));

    for (int n = 0; n < 16; n++) {
        std::string strMsg = strprintf("Very secret message %i: 11", n);
        uint256 hashMsg = Hash(strMsg.begin(), strMsg.end());

        // normal signatures

        std::vector<uint8_t> sign1, sign2, sign1C, sign2C;

        BOOST_CHECK(key1.SignECDSA(hashMsg, sign1));
        BOOST_CHECK(key2.SignECDSA(hashMsg, sign2));
        BOOST_CHECK(key1C.SignECDSA(hashMsg, sign1C));
        BOOST_CHECK(key2C.SignECDSA(hashMsg, sign2C));

        BOOST_CHECK(pubkey1.VerifyECDSA(hashMsg, sign1));
        BOOST_CHECK(!pubkey1.VerifyECDSA(hashMsg, sign2));
        BOOST_CHECK(pubkey1.VerifyECDSA(hashMsg, sign1C));
        BOOST_CHECK(!pubkey1.VerifyECDSA(hashMsg, sign2C));

        BOOST_CHECK(!pubkey2.VerifyECDSA(hashMsg, sign1));
        BOOST_CHECK(pubkey2.VerifyECDSA(hashMsg, sign2));
        BOOST_CHECK(!pubkey2.VerifyECDSA(hashMsg, sign1C));
        BOOST_CHECK(pubkey2.VerifyECDSA(hashMsg, sign2C));

        BOOST_CHECK(pubkey1C.VerifyECDSA(hashMsg, sign1));
        BOOST_CHECK(!pubkey1C.VerifyECDSA(hashMsg, sign2));
        BOOST_CHECK(pubkey1C.VerifyECDSA(hashMsg, sign1C));
        BOOST_CHECK(!pubkey1C.VerifyECDSA(hashMsg, sign2C));

        BOOST_CHECK(!pubkey2C.VerifyECDSA(hashMsg, sign1));
        BOOST_CHECK(pubkey2C.VerifyECDSA(hashMsg, sign2));
        BOOST_CHECK(!pubkey2C.VerifyECDSA(hashMsg, sign1C));
        BOOST_CHECK(pubkey2C.VerifyECDSA(hashMsg, sign2C));

        // compact signatures (with key recovery)

        std::vector<uint8_t> csign1, csign2, csign1C, csign2C;

        BOOST_CHECK(key1.SignCompact(hashMsg, csign1));
        BOOST_CHECK(key2.SignCompact(hashMsg, csign2));
        BOOST_CHECK(key1C.SignCompact(hashMsg, csign1C));
        BOOST_CHECK(key2C.SignCompact(hashMsg, csign2C));

        CPubKey rkey1, rkey2, rkey1C, rkey2C;

        BOOST_CHECK(rkey1.RecoverCompact(hashMsg, csign1));
        BOOST_CHECK(rkey2.RecoverCompact(hashMsg, csign2));
        BOOST_CHECK(rkey1C.RecoverCompact(hashMsg, csign1C));
        BOOST_CHECK(rkey2C.RecoverCompact(hashMsg, csign2C));

        BOOST_CHECK(rkey1 == pubkey1);
        BOOST_CHECK(rkey2 == pubkey2);
        BOOST_CHECK(rkey1C == pubkey1C);
        BOOST_CHECK(rkey2C == pubkey2C);
    }

    // test deterministic signing

    std::vector<uint8_t> detsig, detsigc;
    std::string strMsg = "Very deterministic message";
    uint256 hashMsg = Hash(strMsg.begin(), strMsg.end());
    BOOST_CHECK(key1.SignECDSA(hashMsg, detsig));
    BOOST_CHECK(key1C.SignECDSA(hashMsg, detsigc));
    BOOST_CHECK(detsig == detsigc);
    BOOST_CHECK(detsig ==
                ParseHex("3045022100c6ab5f8acfccc114da39dd5ad0b1ef4d39df6a721e8"
                         "24c22e00b7bc7944a1f7802206ff23df3802e241ee234a8b66c40"
                         "c82e56a6cc37f9b50463111c9f9229b8f3b3"));
    BOOST_CHECK(key2.SignECDSA(hashMsg, detsig));
    BOOST_CHECK(key2C.SignECDSA(hashMsg, detsigc));
    BOOST_CHECK(detsig == detsigc);
    BOOST_CHECK(detsig ==
                ParseHex("304502210094dc5a77b8d5db6b42b66c29d7033cd873fac7a1272"
                         "4a90373726f60bb9f852a02204eb4c98b9a2f5c017f9417ba7c43"
                         "279c20c84bb058dc05b3beeb9333016b15bb"));
    BOOST_CHECK(key1.SignCompact(hashMsg, detsig));
    BOOST_CHECK(key1C.SignCompact(hashMsg, detsigc));
    BOOST_CHECK(detsig ==
                ParseHex("1b8c56f224d51415e6ce329144aa1e1c1563e297a005f450df015"
                         "14f3d047681760277e79d57502df27b8feebb001a588aa3a8c2bc"
                         "f5b2367273c15f840638cfc8"));
    BOOST_CHECK(detsigc ==
                ParseHex("1f8c56f224d51415e6ce329144aa1e1c1563e297a005f450df015"
                         "14f3d047681760277e79d57502df27b8feebb001a588aa3a8c2bc"
                         "f5b2367273c15f840638cfc8"));
    BOOST_CHECK(key2.SignCompact(hashMsg, detsig));
    BOOST_CHECK(key2C.SignCompact(hashMsg, detsigc));
    BOOST_CHECK(detsig ==
                ParseHex("1c9ffc56b38fbfc0e3eb2c42dff99d2375982449f35019c1b3d56"
                         "ca62bef187c5103e483a0ad481eaacc224fef4ee2995027300d5f"
                         "2457f7a20c43547aeddbae6e"));
    BOOST_CHECK(detsigc ==
                ParseHex("209ffc56b38fbfc0e3eb2c42dff99d2375982449f35019c1b3d56"
                         "ca62bef187c5103e483a0ad481eaacc224fef4ee2995027300d5f"
                         "2457f7a20c43547aeddbae6e"));
}

BOOST_AUTO_TEST_SUITE_END()
