// Copyright (c) 2012-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <key.h>

#include <chainparams.h> // For Params()
#include <key_io.h>
#include <streams.h>
#include <uint256.h>
#include <util/strencodings.h>
#include <util/string.h>
#include <util/system.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

#include <string>
#include <vector>

static const std::string strSecret1 =
    "5HxWvvfubhXpYYpS3tJkw6fq9jE9j18THftkZjHHfmFiWtmAbrj";
static const std::string strSecret2 =
    "5KC4ejrDjv152FGwP386VD1i2NYc5KkfSMyv1nGy1VGDxGHqVY3";
static const std::string strSecret1C =
    "Kwr371tjA9u2rFSMZjTNun2PXXP3WPZu2afRHTcta6KxEUdm1vEw";
static const std::string strTestSecret1C =
    "cND2ZvtabDbJ1gucx9GWH6XT9kgTAqfb6cotPt5Q5CyxVDhid2EN";
static const std::string strSecret2C =
    "L3Hq7a8FEQwJkW1M2GNKDW28546Vp5miewcCzSqUD9kCAXrJdS3g";
static const std::string addr1 = "1QFqqMUD55ZV3PJEJZtaKCsQmjLT6JkjvJ";
static const std::string addr2 = "1F5y5E5FMc5YzdJtB9hLaUe43GDxEKXENJ";
static const std::string addr1C = "1NoJrossxPBKfCHuJXT4HadJrXRE9Fxiqs";
static const std::string addr2C = "1CRj2HyM1CXWzHAXLQtiGLyggNT9WQqsDs";

static const std::string strAddressBad = "1HV9Lc3sNHZxwj4Zk6fB38tEmBryq2cBiF";

// get r value produced by ECDSA signing algorithm
// (assumes ECDSA r is encoded in the canonical manner)
static std::vector<uint8_t> get_r_ECDSA(std::vector<uint8_t> sigECDSA) {
    std::vector<uint8_t> ret(32, 0);

    assert(sigECDSA[2] == 2);
    int rlen = sigECDSA[3];
    assert(rlen <= 33);
    assert(sigECDSA[4 + rlen] == 2);
    if (rlen == 33) {
        assert(sigECDSA[4] == 0);
        std::copy(sigECDSA.begin() + 5, sigECDSA.begin() + 37, ret.begin());
    } else {
        std::copy(sigECDSA.begin() + 4, sigECDSA.begin() + (4 + rlen),
                  ret.begin() + (32 - rlen));
    }
    return ret;
}

BOOST_FIXTURE_TEST_SUITE(key_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(internal_test) {
    // test get_r_ECDSA (defined above) to make sure it's working properly
    BOOST_CHECK(get_r_ECDSA(ParseHex(
                    "3045022100c6ab5f8acfccc114da39dd5ad0b1ef4d39df6a721e8"
                    "24c22e00b7bc7944a1f7802206ff23df3802e241ee234a8b66c40"
                    "c82e56a6cc37f9b50463111c9f9229b8f3b3")) ==
                ParseHex("c6ab5f8acfccc114da39dd5ad0b1ef4d39df6a721e8"
                         "24c22e00b7bc7944a1f78"));
    BOOST_CHECK(get_r_ECDSA(ParseHex(
                    "3045022046ab5f8acfccc114da39dd5ad0b1ef4d39df6a721e8"
                    "24c22e00b7bc7944a1f7802206ff23df3802e241ee234a8b66c40"
                    "c82e56a6cc37f9b50463111c9f9229b8f3b3")) ==
                ParseHex("46ab5f8acfccc114da39dd5ad0b1ef4d39df6a721e8"
                         "24c22e00b7bc7944a1f78"));
    BOOST_CHECK(get_r_ECDSA(ParseHex(
                    "3045021f4b5f8acfccc114da39dd5ad0b1ef4d39df6a721e8"
                    "24c22e00b7bc7944a1f7802206ff23df3802e241ee234a8b66c40"
                    "c82e56a6cc37f9b50463111c9f9229b8f3b3")) ==
                ParseHex("004b5f8acfccc114da39dd5ad0b1ef4d39df6a721e8"
                         "24c22e00b7bc7944a1f78"));
    BOOST_CHECK(get_r_ECDSA(ParseHex(
                    "3045021e5f8acfccc114da39dd5ad0b1ef4d39df6a721e8"
                    "24c22e00b7bc7944a1f7802206ff23df3802e241ee234a8b66c40"
                    "c82e56a6cc37f9b50463111c9f9229b8f3b3")) ==
                ParseHex("00005f8acfccc114da39dd5ad0b1ef4d39df6a721e8"
                         "24c22e00b7bc7944a1f78"));
}

BOOST_AUTO_TEST_CASE(encode_decode_secret_test) {
    const auto mainParams =
        CreateChainParams(*m_node.args, CBaseChainParams::MAIN);
    const auto testParams =
        CreateChainParams(*m_node.args, CBaseChainParams::TESTNET);
    const auto regParams =
        CreateChainParams(*m_node.args, CBaseChainParams::TESTNET);

    {
        // Check the mainnet base58 key
        CKey mainKey = DecodeSecret(strSecret1C, *mainParams);
        BOOST_CHECK(mainKey.IsValid() && mainKey.IsCompressed());

        CKey testKey = DecodeSecret(strSecret1C, *testParams);
        BOOST_CHECK(!testKey.IsValid());

        CKey regKey = DecodeSecret(strSecret1C, *regParams);
        BOOST_CHECK(!regKey.IsValid());
    }

    {
        // Check the testnet and regnet base58 key
        CKey mainKey = DecodeSecret(strTestSecret1C, *mainParams);
        BOOST_CHECK(!mainKey.IsValid());

        CKey testKey = DecodeSecret(strTestSecret1C, *testParams);
        BOOST_CHECK(testKey.IsValid() && testKey.IsCompressed());

        CKey regKey = DecodeSecret(strTestSecret1C, *regParams);
        BOOST_CHECK(regKey.IsValid() && regKey.IsCompressed());
    }

    CKey mainKey = DecodeSecret(strSecret1C, *mainParams);
    CKey testKey = DecodeSecret(strTestSecret1C, *testParams);

    // Check key conversion.
    BOOST_CHECK_EQUAL(EncodeSecret(mainKey, *mainParams), strSecret1C);
    BOOST_CHECK_EQUAL(EncodeSecret(mainKey, *testParams), strTestSecret1C);
    BOOST_CHECK_EQUAL(EncodeSecret(mainKey, *regParams), strTestSecret1C);
    BOOST_CHECK_EQUAL(EncodeSecret(testKey, *mainParams), strSecret1C);
    BOOST_CHECK_EQUAL(EncodeSecret(testKey, *testParams), strTestSecret1C);
    BOOST_CHECK_EQUAL(EncodeSecret(testKey, *regParams), strTestSecret1C);
}

BOOST_AUTO_TEST_CASE(key_test1) {
    CKey key1 = DecodeSecret(strSecret1);
    BOOST_CHECK(key1.IsValid() && !key1.IsCompressed());
    CKey key2 = DecodeSecret(strSecret2);
    BOOST_CHECK(key2.IsValid() && !key2.IsCompressed());
    CKey key1C = DecodeSecret(strSecret1C);
    BOOST_CHECK(key1C.IsValid() && key1C.IsCompressed());
    CKey key2C = DecodeSecret(strSecret2C);
    BOOST_CHECK(key2C.IsValid() && key2C.IsCompressed());
    CKey bad_key = DecodeSecret(strAddressBad);
    BOOST_CHECK(!bad_key.IsValid());

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
                CTxDestination(PKHash(pubkey1)));
    BOOST_CHECK(DecodeDestination(addr2, chainParams) ==
                CTxDestination(PKHash(pubkey2)));
    BOOST_CHECK(DecodeDestination(addr1C, chainParams) ==
                CTxDestination(PKHash(pubkey1C)));
    BOOST_CHECK(DecodeDestination(addr2C, chainParams) ==
                CTxDestination(PKHash(pubkey2C)));

    for (int n = 0; n < 16; n++) {
        std::string strMsg = strprintf("Very secret message %i: 11", n);
        uint256 hashMsg = Hash(strMsg);

        // normal ECDSA signatures

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

        // compact ECDSA signatures (with key recovery)

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

        // Schnorr signatures

        std::vector<uint8_t> ssign1, ssign2, ssign1C, ssign2C;

        BOOST_CHECK(key1.SignSchnorr(hashMsg, ssign1));
        BOOST_CHECK(key2.SignSchnorr(hashMsg, ssign2));
        BOOST_CHECK(key1C.SignSchnorr(hashMsg, ssign1C));
        BOOST_CHECK(key2C.SignSchnorr(hashMsg, ssign2C));

        BOOST_CHECK(pubkey1.VerifySchnorr(hashMsg, ssign1));
        BOOST_CHECK(!pubkey1.VerifySchnorr(hashMsg, ssign2));
        BOOST_CHECK(pubkey1.VerifySchnorr(hashMsg, ssign1C));
        BOOST_CHECK(!pubkey1.VerifySchnorr(hashMsg, ssign2C));

        BOOST_CHECK(!pubkey2.VerifySchnorr(hashMsg, ssign1));
        BOOST_CHECK(pubkey2.VerifySchnorr(hashMsg, ssign2));
        BOOST_CHECK(!pubkey2.VerifySchnorr(hashMsg, ssign1C));
        BOOST_CHECK(pubkey2.VerifySchnorr(hashMsg, ssign2C));

        BOOST_CHECK(pubkey1C.VerifySchnorr(hashMsg, ssign1));
        BOOST_CHECK(!pubkey1C.VerifySchnorr(hashMsg, ssign2));
        BOOST_CHECK(pubkey1C.VerifySchnorr(hashMsg, ssign1C));
        BOOST_CHECK(!pubkey1C.VerifySchnorr(hashMsg, ssign2C));

        BOOST_CHECK(!pubkey2C.VerifySchnorr(hashMsg, ssign1));
        BOOST_CHECK(pubkey2C.VerifySchnorr(hashMsg, ssign2));
        BOOST_CHECK(!pubkey2C.VerifySchnorr(hashMsg, ssign1C));
        BOOST_CHECK(pubkey2C.VerifySchnorr(hashMsg, ssign2C));

        // check deterministicity of ECDSA & Schnorr
        BOOST_CHECK(sign1 == sign1C);
        BOOST_CHECK(sign2 == sign2C);
        BOOST_CHECK(ssign1 == ssign1C);
        BOOST_CHECK(ssign2 == ssign2C);

        // Extract r value from ECDSA and Schnorr. Make sure they are
        // distinct (nonce reuse would be dangerous and can leak private key).
        std::vector<uint8_t> rE1 = get_r_ECDSA(sign1);
        BOOST_CHECK(ssign1.size() == 64);
        std::vector<uint8_t> rS1(ssign1.begin(), ssign1.begin() + 32);
        BOOST_CHECK(rE1.size() == 32);
        BOOST_CHECK(rS1.size() == 32);
        BOOST_CHECK(rE1 != rS1);

        std::vector<uint8_t> rE2 = get_r_ECDSA(sign2);
        BOOST_CHECK(ssign2.size() == 64);
        std::vector<uint8_t> rS2(ssign2.begin(), ssign2.begin() + 32);
        BOOST_CHECK(rE2.size() == 32);
        BOOST_CHECK(rS2.size() == 32);
        BOOST_CHECK(rE2 != rS2);
    }

    // test deterministic signing expected values

    std::vector<uint8_t> detsig, detsigc;
    std::string strMsg = "Very deterministic message";
    uint256 hashMsg = Hash(strMsg);
    // ECDSA
    BOOST_CHECK(key1.SignECDSA(hashMsg, detsig));
    BOOST_CHECK(key1C.SignECDSA(hashMsg, detsigc));
    BOOST_CHECK(detsig == detsigc);
    BOOST_CHECK(detsig ==
                ParseHex("304402200c648ad9936cae4006f0b0d7bcbacdcdf5a14260eb550"
                         "c31ddb1eb1a13b1b58602201b868673bb5926d1610a07cd03692d"
                         "fdcb98ed059314f66b457a794f2c4b8e79"));
    BOOST_CHECK(key2.SignECDSA(hashMsg, detsig));
    BOOST_CHECK(key2C.SignECDSA(hashMsg, detsigc));
    BOOST_CHECK(detsig == detsigc);
    BOOST_CHECK(detsig ==
                ParseHex("304402205fb8ff5dbba6110d877169812f5cd939866d9487c6b62"
                         "5785c6876e4fb8ea69a0220711dc4ecff142f7f808905c04bbd41"
                         "89e3d2c689c4be396ed22883c463d6ad7a"));
    // Compact
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
    // Schnorr
    BOOST_CHECK(key1.SignSchnorr(hashMsg, detsig));
    BOOST_CHECK(key1C.SignSchnorr(hashMsg, detsigc));
    BOOST_CHECK(detsig == detsigc);
    BOOST_CHECK(detsig ==
                ParseHex("2c56731ac2f7a7e7f11518fc7722a166b02438924ca9d8b4d1113"
                         "47b81d0717571846de67ad3d913a8fdf9d8f3f73161a4c48ae81c"
                         "b183b214765feb86e255ce"));
    BOOST_CHECK(key2.SignSchnorr(hashMsg, detsig));
    BOOST_CHECK(key2C.SignSchnorr(hashMsg, detsigc));
    BOOST_CHECK(detsig == detsigc);
    BOOST_CHECK(detsig ==
                ParseHex("e7167ae0afbba6019b4c7fcfe6de79165d555e8295bd72da1b8aa"
                         "1a5b54305880517cace1bcb0cb515e2eeaffd49f1e4dd49fd7282"
                         "6b4b1573c84da49a38405d"));
}

BOOST_AUTO_TEST_CASE(key_signature_tests) {
    // When entropy is specified, we should see at least one high R signature
    // within 20 signatures
    CKey key = DecodeSecret(strSecret1);
    std::string msg = "A message to be signed";
    uint256 msg_hash = Hash(msg);
    std::vector<uint8_t> sig;
    bool found = false;

    for (int i = 1; i <= 20; ++i) {
        sig.clear();
        BOOST_CHECK(key.SignECDSA(msg_hash, sig, false, i));
        found = sig[3] == 0x21 && sig[4] == 0x00;
        if (found) {
            break;
        }
    }
    BOOST_CHECK(found);

    // When entropy is not specified, we should always see low R signatures that
    // are less than 70 bytes in 256 tries We should see at least one signature
    // that is less than 70 bytes.
    found = true;
    bool found_small = false;
    for (int i = 0; i < 256; ++i) {
        sig.clear();
        msg = "A message to be signed" + ToString(i);
        msg_hash = Hash(msg);
        BOOST_CHECK(key.SignECDSA(msg_hash, sig));
        found = sig[3] == 0x20;
        BOOST_CHECK(sig.size() <= 70);
        found_small |= sig.size() < 70;
    }
    BOOST_CHECK(found);
    BOOST_CHECK(found_small);
}

BOOST_AUTO_TEST_CASE(key_key_negation) {
    // create a dummy hash for signature comparison
    uint8_t rnd[8];
    std::string str = "Bitcoin key verification\n";
    GetRandBytes(rnd);
    uint256 hash;
    CHash256().Write(MakeUCharSpan(str)).Write(rnd).Finalize(hash);

    // import the static test key
    CKey key = DecodeSecret(strSecret1C);

    // create a signature
    std::vector<uint8_t> vch_sig;
    std::vector<uint8_t> vch_sig_cmp;
    key.SignECDSA(hash, vch_sig);

    // negate the key twice
    BOOST_CHECK(key.GetPubKey().data()[0] == 0x03);
    key.Negate();
    // after the first negation, the signature must be different
    key.SignECDSA(hash, vch_sig_cmp);
    BOOST_CHECK(vch_sig_cmp != vch_sig);
    BOOST_CHECK(key.GetPubKey().data()[0] == 0x02);
    key.Negate();
    // after the second negation, we should have the original key and thus the
    // same signature
    key.SignECDSA(hash, vch_sig_cmp);
    BOOST_CHECK(vch_sig_cmp == vch_sig);
    BOOST_CHECK(key.GetPubKey().data()[0] == 0x03);
}

static CPubKey UnserializePubkey(const std::vector<uint8_t> &data) {
    CDataStream stream{SER_NETWORK, INIT_PROTO_VERSION};
    stream << data;
    CPubKey pubkey;
    stream >> pubkey;
    return pubkey;
}

static unsigned int GetLen(uint8_t chHeader) {
    if (chHeader == 2 || chHeader == 3) {
        return CPubKey::COMPRESSED_SIZE;
    }
    if (chHeader == 4 || chHeader == 6 || chHeader == 7) {
        return CPubKey::SIZE;
    }
    return 0;
}

static void CmpSerializationPubkey(const CPubKey &pubkey) {
    CDataStream stream{SER_NETWORK, INIT_PROTO_VERSION};
    stream << pubkey;
    CPubKey pubkey2;
    stream >> pubkey2;
    BOOST_CHECK(pubkey == pubkey2);
}

BOOST_AUTO_TEST_CASE(pubkey_unserialize) {
    for (uint8_t i = 2; i <= 7; ++i) {
        CPubKey key = UnserializePubkey({0x02});
        BOOST_CHECK(!key.IsValid());
        CmpSerializationPubkey(key);
        key = UnserializePubkey(std::vector<uint8_t>(GetLen(i), i));
        CmpSerializationPubkey(key);
        if (i == 5) {
            BOOST_CHECK(!key.IsValid());
        } else {
            BOOST_CHECK(key.IsValid());
        }
    }
}

BOOST_AUTO_TEST_SUITE_END()
