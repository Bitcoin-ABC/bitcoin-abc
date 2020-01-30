// Copyright (c) 2014-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <util/strencodings.h>
#include <wallet/crypter.h>

#include <test/test_bitcoin.h>

#include <boost/test/unit_test.hpp>

#include <vector>

BOOST_FIXTURE_TEST_SUITE(wallet_crypto_tests, BasicTestingSetup)

class TestCrypter {
public:
    static void TestPassphraseSingle(
        const std::vector<uint8_t> &vchSalt, const SecureString &passphrase,
        uint32_t rounds,
        const std::vector<uint8_t> &correctKey = std::vector<uint8_t>(),
        const std::vector<uint8_t> &correctIV = std::vector<uint8_t>()) {
        CCrypter crypt;
        crypt.SetKeyFromPassphrase(passphrase, vchSalt, rounds, 0);

        if (!correctKey.empty()) {
            BOOST_CHECK_MESSAGE(
                memcmp(crypt.vchKey.data(), correctKey.data(),
                       crypt.vchKey.size()) == 0,
                HexStr(crypt.vchKey.begin(), crypt.vchKey.end()) +
                    std::string(" != ") +
                    HexStr(correctKey.begin(), correctKey.end()));
        }
        if (!correctIV.empty()) {
            BOOST_CHECK_MESSAGE(memcmp(crypt.vchIV.data(), correctIV.data(),
                                       crypt.vchIV.size()) == 0,
                                HexStr(crypt.vchIV.begin(), crypt.vchIV.end()) +
                                    std::string(" != ") +
                                    HexStr(correctIV.begin(), correctIV.end()));
        }
    }

    static void TestPassphrase(
        const std::vector<uint8_t> &vchSalt, const SecureString &passphrase,
        uint32_t rounds,
        const std::vector<uint8_t> &correctKey = std::vector<uint8_t>(),
        const std::vector<uint8_t> &correctIV = std::vector<uint8_t>()) {
        TestPassphraseSingle(vchSalt, passphrase, rounds, correctKey,
                             correctIV);
        for (SecureString::const_iterator i(passphrase.begin());
             i != passphrase.end(); ++i) {
            TestPassphraseSingle(vchSalt, SecureString(i, passphrase.end()),
                                 rounds);
        }
    }

    static void TestDecrypt(
        const CCrypter &crypt, const std::vector<uint8_t> &vchCiphertext,
        const std::vector<uint8_t> &vchPlaintext = std::vector<uint8_t>()) {
        CKeyingMaterial vchDecrypted;
        crypt.Decrypt(vchCiphertext, vchDecrypted);
        if (vchPlaintext.size()) {
            BOOST_CHECK(CKeyingMaterial(vchPlaintext.begin(),
                                        vchPlaintext.end()) == vchDecrypted);
        }
    }

    static void
    TestEncryptSingle(const CCrypter &crypt,
                      const CKeyingMaterial &vchPlaintext,
                      const std::vector<uint8_t> &vchCiphertextCorrect =
                          std::vector<uint8_t>()) {
        std::vector<uint8_t> vchCiphertext;
        crypt.Encrypt(vchPlaintext, vchCiphertext);

        if (!vchCiphertextCorrect.empty()) {
            BOOST_CHECK(vchCiphertext == vchCiphertextCorrect);
        }

        const std::vector<uint8_t> vchPlaintext2(vchPlaintext.begin(),
                                                 vchPlaintext.end());
        TestDecrypt(crypt, vchCiphertext, vchPlaintext2);
    }

    static void TestEncrypt(const CCrypter &crypt,
                            const std::vector<uint8_t> &vchPlaintextIn,
                            const std::vector<uint8_t> &vchCiphertextCorrect =
                                std::vector<uint8_t>()) {
        TestEncryptSingle(
            crypt,
            CKeyingMaterial(vchPlaintextIn.begin(), vchPlaintextIn.end()),
            vchCiphertextCorrect);
        for (std::vector<uint8_t>::const_iterator i(vchPlaintextIn.begin());
             i != vchPlaintextIn.end(); ++i) {
            TestEncryptSingle(crypt, CKeyingMaterial(i, vchPlaintextIn.end()));
        }
    }
};

BOOST_AUTO_TEST_CASE(passphrase) {
    // These are expensive.

    TestCrypter::TestPassphrase(
        ParseHex("0000deadbeef0000"), "test", 25000,
        ParseHex(
            "fc7aba077ad5f4c3a0988d8daa4810d0d4a0e3bcb53af662998898f33df0556a"),
        ParseHex("cf2f2691526dd1aa220896fb8bf7c369"));

    std::string hash(GetRandHash().ToString());
    std::vector<uint8_t> vchSalt(8);
    GetRandBytes(vchSalt.data(), vchSalt.size());
    uint32_t rounds = InsecureRand32();
    if (rounds > 30000) {
        rounds = 30000;
    }
    TestCrypter::TestPassphrase(vchSalt, SecureString(hash.begin(), hash.end()),
                                rounds);
}

BOOST_AUTO_TEST_CASE(encrypt) {
    std::vector<uint8_t> vchSalt = ParseHex("0000deadbeef0000");
    BOOST_CHECK(vchSalt.size() == WALLET_CRYPTO_SALT_SIZE);
    CCrypter crypt;
    crypt.SetKeyFromPassphrase("passphrase", vchSalt, 25000, 0);
    TestCrypter::TestEncrypt(crypt,
                             ParseHex("22bcade09ac03ff6386914359cfe885cfeb5f77f"
                                      "f0d670f102f619687453b29d"));

    for (int i = 0; i != 100; i++) {
        uint256 hash(GetRandHash());
        TestCrypter::TestEncrypt(
            crypt, std::vector<uint8_t>(hash.begin(), hash.end()));
    }
}

BOOST_AUTO_TEST_CASE(decrypt) {
    std::vector<uint8_t> vchSalt = ParseHex("0000deadbeef0000");
    BOOST_CHECK(vchSalt.size() == WALLET_CRYPTO_SALT_SIZE);
    CCrypter crypt;
    crypt.SetKeyFromPassphrase("passphrase", vchSalt, 25000, 0);

    // Some corner cases the came up while testing
    TestCrypter::TestDecrypt(crypt,
                             ParseHex("795643ce39d736088367822cdc50535ec6f10371"
                                      "5e3e48f4f3b1a60a08ef59ca"));
    TestCrypter::TestDecrypt(crypt,
                             ParseHex("de096f4a8f9bd97db012aa9d90d74de8cdea779c"
                                      "3ee8bc7633d8b5d6da703486"));
    TestCrypter::TestDecrypt(crypt,
                             ParseHex("32d0a8974e3afd9c6c3ebf4d66aa4e6419f8c173"
                                      "de25947f98cf8b7ace49449c"));
    TestCrypter::TestDecrypt(crypt,
                             ParseHex("e7c055cca2faa78cb9ac22c9357a90b4778ded9b"
                                      "2cc220a14cea49f931e596ea"));
    TestCrypter::TestDecrypt(crypt,
                             ParseHex("b88efddd668a6801d19516d6830da4ae9811988c"
                                      "cbaf40df8fbb72f3f4d335fd"));
    TestCrypter::TestDecrypt(crypt,
                             ParseHex("8cae76aa6a43694e961ebcb28c8ca8f8540b8415"
                                      "3d72865e8561ddd93fa7bfa9"));

    for (int i = 0; i != 100; i++) {
        uint256 hash(GetRandHash());
        TestCrypter::TestDecrypt(
            crypt, std::vector<uint8_t>(hash.begin(), hash.end()));
    }
}

BOOST_AUTO_TEST_SUITE_END()
