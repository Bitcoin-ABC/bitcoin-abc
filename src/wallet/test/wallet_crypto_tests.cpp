// Copyright (c) 2014-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <utilstrencodings.h>
#include <wallet/crypter.h>

#include <test/test_bitcoin.h>

#include <boost/test/unit_test.hpp>

#include <openssl/aes.h>
#include <openssl/evp.h>

#include <vector>

BOOST_FIXTURE_TEST_SUITE(wallet_crypto_tests, BasicTestingSetup)

bool OldSetKeyFromPassphrase(const SecureString &strKeyData,
                             const std::vector<uint8_t> &chSalt,
                             const unsigned int nRounds,
                             const unsigned int nDerivationMethod,
                             uint8_t *chKey, uint8_t *chIV) {
    if (nRounds < 1 || chSalt.size() != WALLET_CRYPTO_SALT_SIZE) return false;

    int i = 0;
    if (nDerivationMethod == 0)
        i = EVP_BytesToKey(EVP_aes_256_cbc(), EVP_sha512(), &chSalt[0],
                           (uint8_t *)&strKeyData[0], strKeyData.size(),
                           nRounds, chKey, chIV);

    if (i != (int)WALLET_CRYPTO_KEY_SIZE) {
        memory_cleanse(chKey, sizeof(chKey));
        memory_cleanse(chIV, sizeof(chIV));
        return false;
    }
    return true;
}

bool OldEncrypt(const CKeyingMaterial &vchPlaintext,
                std::vector<uint8_t> &vchCiphertext, const uint8_t chKey[32],
                const uint8_t chIV[16]) {
    // max ciphertext len for a n bytes of plaintext is
    // n + AES_BLOCK_SIZE - 1 bytes
    int nLen = vchPlaintext.size();
    int nCLen = nLen + AES_BLOCK_SIZE, nFLen = 0;
    vchCiphertext = std::vector<uint8_t>(nCLen);

    EVP_CIPHER_CTX *ctx = EVP_CIPHER_CTX_new();

    if (!ctx) return false;

    bool fOk = true;

    EVP_CIPHER_CTX_init(ctx);
    if (fOk)
        fOk = EVP_EncryptInit_ex(ctx, EVP_aes_256_cbc(), nullptr, chKey,
                                 chIV) != 0;
    if (fOk)
        fOk = EVP_EncryptUpdate(ctx, &vchCiphertext[0], &nCLen,
                                &vchPlaintext[0], nLen) != 0;
    if (fOk)
        fOk =
            EVP_EncryptFinal_ex(ctx, (&vchCiphertext[0]) + nCLen, &nFLen) != 0;
    EVP_CIPHER_CTX_cleanup(ctx);

    EVP_CIPHER_CTX_free(ctx);

    if (!fOk) return false;

    vchCiphertext.resize(nCLen + nFLen);
    return true;
}

bool OldDecrypt(const std::vector<uint8_t> &vchCiphertext,
                CKeyingMaterial &vchPlaintext, const uint8_t chKey[32],
                const uint8_t chIV[16]) {
    // plaintext will always be equal to or lesser than length of ciphertext
    int nLen = vchCiphertext.size();
    int nPLen = nLen, nFLen = 0;

    vchPlaintext = CKeyingMaterial(nPLen);

    EVP_CIPHER_CTX *ctx = EVP_CIPHER_CTX_new();

    if (!ctx) return false;

    bool fOk = true;

    EVP_CIPHER_CTX_init(ctx);
    if (fOk)
        fOk = EVP_DecryptInit_ex(ctx, EVP_aes_256_cbc(), nullptr, chKey,
                                 chIV) != 0;
    if (fOk)
        fOk = EVP_DecryptUpdate(ctx, &vchPlaintext[0], &nPLen,
                                &vchCiphertext[0], nLen) != 0;
    if (fOk)
        fOk = EVP_DecryptFinal_ex(ctx, (&vchPlaintext[0]) + nPLen, &nFLen) != 0;
    EVP_CIPHER_CTX_cleanup(ctx);

    EVP_CIPHER_CTX_free(ctx);

    if (!fOk) return false;

    vchPlaintext.resize(nPLen + nFLen);
    return true;
}

class TestCrypter {
public:
    static void TestPassphraseSingle(
        const std::vector<uint8_t> &vchSalt, const SecureString &passphrase,
        uint32_t rounds,
        const std::vector<uint8_t> &correctKey = std::vector<uint8_t>(),
        const std::vector<uint8_t> &correctIV = std::vector<uint8_t>()) {
        uint8_t chKey[WALLET_CRYPTO_KEY_SIZE];
        uint8_t chIV[WALLET_CRYPTO_IV_SIZE];

        CCrypter crypt;
        crypt.SetKeyFromPassphrase(passphrase, vchSalt, rounds, 0);

        OldSetKeyFromPassphrase(passphrase, vchSalt, rounds, 0, chKey, chIV);

        BOOST_CHECK_MESSAGE(
            memcmp(chKey, crypt.vchKey.data(), crypt.vchKey.size()) == 0,
            HexStr(chKey, chKey + sizeof(chKey)) + std::string(" != ") +
                HexStr(crypt.vchKey));
        BOOST_CHECK_MESSAGE(
            memcmp(chIV, crypt.vchIV.data(), crypt.vchIV.size()) == 0,
            HexStr(chIV, chIV + sizeof(chIV)) + std::string(" != ") +
                HexStr(crypt.vchIV));

        if (!correctKey.empty())
            BOOST_CHECK_MESSAGE(
                memcmp(chKey, &correctKey[0], sizeof(chKey)) == 0,
                HexStr(chKey, chKey + sizeof(chKey)) + std::string(" != ") +
                    HexStr(correctKey.begin(), correctKey.end()));
        if (!correctIV.empty())
            BOOST_CHECK_MESSAGE(memcmp(chIV, &correctIV[0], sizeof(chIV)) == 0,
                                HexStr(chIV, chIV + sizeof(chIV)) +
                                    std::string(" != ") +
                                    HexStr(correctIV.begin(), correctIV.end()));
    }

    static void TestPassphrase(
        const std::vector<uint8_t> &vchSalt, const SecureString &passphrase,
        uint32_t rounds,
        const std::vector<uint8_t> &correctKey = std::vector<uint8_t>(),
        const std::vector<uint8_t> &correctIV = std::vector<uint8_t>()) {
        TestPassphraseSingle(vchSalt, passphrase, rounds, correctKey,
                             correctIV);
        for (SecureString::const_iterator i(passphrase.begin());
             i != passphrase.end(); ++i)
            TestPassphraseSingle(vchSalt, SecureString(i, passphrase.end()),
                                 rounds);
    }

    static void TestDecrypt(
        const CCrypter &crypt, const std::vector<uint8_t> &vchCiphertext,
        const std::vector<uint8_t> &vchPlaintext = std::vector<uint8_t>()) {
        CKeyingMaterial vchDecrypted1;
        CKeyingMaterial vchDecrypted2;
        int result1, result2;
        result1 = crypt.Decrypt(vchCiphertext, vchDecrypted1);
        result2 = OldDecrypt(vchCiphertext, vchDecrypted2, crypt.vchKey.data(),
                             crypt.vchIV.data());
        BOOST_CHECK(result1 == result2);

        // These two should be equal. However, OpenSSL 1.0.1j introduced a
        // change that would zero all padding except for the last byte for
        // failed decrypts.
        // This behavior was reverted for 1.0.1k.
        if (vchDecrypted1 != vchDecrypted2 &&
            vchDecrypted1.size() >= AES_BLOCK_SIZE && SSLeay() == 0x100010afL) {
            for (CKeyingMaterial::iterator it =
                     vchDecrypted1.end() - AES_BLOCK_SIZE;
                 it != vchDecrypted1.end() - 1; it++)
                *it = 0;
        }

        BOOST_CHECK_MESSAGE(
            vchDecrypted1 == vchDecrypted2,
            HexStr(vchDecrypted1.begin(), vchDecrypted1.end()) +
                " != " + HexStr(vchDecrypted2.begin(), vchDecrypted2.end()));

        if (vchPlaintext.size())
            BOOST_CHECK(CKeyingMaterial(vchPlaintext.begin(),
                                        vchPlaintext.end()) == vchDecrypted2);
    }

    static void
    TestEncryptSingle(const CCrypter &crypt,
                      const CKeyingMaterial &vchPlaintext,
                      const std::vector<uint8_t> &vchCiphertextCorrect =
                          std::vector<uint8_t>()) {
        std::vector<uint8_t> vchCiphertext1;
        std::vector<uint8_t> vchCiphertext2;
        int result1 = crypt.Encrypt(vchPlaintext, vchCiphertext1);

        int result2 = OldEncrypt(vchPlaintext, vchCiphertext2,
                                 crypt.vchKey.data(), crypt.vchIV.data());
        BOOST_CHECK(result1 == result2);
        BOOST_CHECK(vchCiphertext1 == vchCiphertext2);

        if (!vchCiphertextCorrect.empty())
            BOOST_CHECK(vchCiphertext2 == vchCiphertextCorrect);

        const std::vector<uint8_t> vchPlaintext2(vchPlaintext.begin(),
                                                 vchPlaintext.end());

        if (vchCiphertext1 == vchCiphertext2)
            TestDecrypt(crypt, vchCiphertext1, vchPlaintext2);
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
             i != vchPlaintextIn.end(); ++i)
            TestEncryptSingle(crypt, CKeyingMaterial(i, vchPlaintextIn.end()));
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
    GetRandBytes(&vchSalt[0], vchSalt.size());
    uint32_t rounds = insecure_rand();
    if (rounds > 30000) rounds = 30000;
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
