// Copyright (c) 2014-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <crypto/aes.h>
#include <crypto/chacha20.h>
#include <crypto/chacha_poly_aead.h>
#include <crypto/hkdf_sha256_32.h>
#include <crypto/hmac_sha256.h>
#include <crypto/hmac_sha512.h>
#include <crypto/poly1305.h>
#include <crypto/ripemd160.h>
#include <crypto/sha1.h>
#include <crypto/sha256.h>
#include <crypto/sha3.h>
#include <crypto/sha512.h>

#include <random.h>
#include <util/strencodings.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

#include <vector>

BOOST_FIXTURE_TEST_SUITE(crypto_tests, BasicTestingSetup)

template <typename Hasher, typename In, typename Out>
static void TestVector(const Hasher &h, const In &in, const Out &out) {
    Out hash;
    BOOST_CHECK(out.size() == h.OUTPUT_SIZE);
    hash.resize(out.size());
    {
        // Test that writing the whole input string at once works.
        Hasher(h).Write((uint8_t *)&in[0], in.size()).Finalize(&hash[0]);
        BOOST_CHECK(hash == out);
    }
    for (int i = 0; i < 32; i++) {
        // Test that writing the string broken up in random pieces works.
        Hasher hasher(h);
        size_t pos = 0;
        while (pos < in.size()) {
            size_t len = InsecureRandRange((in.size() - pos + 1) / 2 + 1);
            hasher.Write((uint8_t *)&in[pos], len);
            pos += len;
            if (pos > 0 && pos + 2 * out.size() > in.size() &&
                pos < in.size()) {
                // Test that writing the rest at once to a copy of a hasher
                // works.
                Hasher(hasher)
                    .Write((uint8_t *)&in[pos], in.size() - pos)
                    .Finalize(&hash[0]);
                BOOST_CHECK(hash == out);
            }
        }
        hasher.Finalize(&hash[0]);
        BOOST_CHECK(hash == out);
    }
}

static void TestSHA1(const std::string &in, const std::string &hexout) {
    TestVector(CSHA1(), in, ParseHex(hexout));
}
static void TestSHA256(const std::string &in, const std::string &hexout) {
    TestVector(CSHA256(), in, ParseHex(hexout));
}
static void TestSHA512(const std::string &in, const std::string &hexout) {
    TestVector(CSHA512(), in, ParseHex(hexout));
}
static void TestRIPEMD160(const std::string &in, const std::string &hexout) {
    TestVector(CRIPEMD160(), in, ParseHex(hexout));
}

static void TestHMACSHA256(const std::string &hexkey, const std::string &hexin,
                           const std::string &hexout) {
    std::vector<uint8_t> key = ParseHex(hexkey);
    TestVector(CHMAC_SHA256(key.data(), key.size()), ParseHex(hexin),
               ParseHex(hexout));
}

static void TestHMACSHA512(const std::string &hexkey, const std::string &hexin,
                           const std::string &hexout) {
    std::vector<uint8_t> key = ParseHex(hexkey);
    TestVector(CHMAC_SHA512(key.data(), key.size()), ParseHex(hexin),
               ParseHex(hexout));
}

static void TestAES128(const std::string &hexkey, const std::string &hexin,
                       const std::string &hexout) {
    std::vector<uint8_t> key = ParseHex(hexkey);
    std::vector<uint8_t> in = ParseHex(hexin);
    std::vector<uint8_t> correctout = ParseHex(hexout);
    std::vector<uint8_t> buf, buf2;

    assert(key.size() == 16);
    assert(in.size() == 16);
    assert(correctout.size() == 16);
    AES128Encrypt enc(key.data());
    buf.resize(correctout.size());
    buf2.resize(correctout.size());
    enc.Encrypt(buf.data(), in.data());
    BOOST_CHECK_EQUAL(HexStr(buf), HexStr(correctout));
    AES128Decrypt dec(key.data());
    dec.Decrypt(buf2.data(), buf.data());
    BOOST_CHECK_EQUAL(HexStr(buf2), HexStr(in));
}

static void TestAES256(const std::string &hexkey, const std::string &hexin,
                       const std::string &hexout) {
    std::vector<uint8_t> key = ParseHex(hexkey);
    std::vector<uint8_t> in = ParseHex(hexin);
    std::vector<uint8_t> correctout = ParseHex(hexout);
    std::vector<uint8_t> buf;

    assert(key.size() == 32);
    assert(in.size() == 16);
    assert(correctout.size() == 16);
    AES256Encrypt enc(key.data());
    buf.resize(correctout.size());
    enc.Encrypt(buf.data(), in.data());
    BOOST_CHECK(buf == correctout);
    AES256Decrypt dec(key.data());
    dec.Decrypt(buf.data(), buf.data());
    BOOST_CHECK(buf == in);
}

static void TestAES128CBC(const std::string &hexkey, const std::string &hexiv,
                          bool pad, const std::string &hexin,
                          const std::string &hexout) {
    std::vector<uint8_t> key = ParseHex(hexkey);
    std::vector<uint8_t> iv = ParseHex(hexiv);
    std::vector<uint8_t> in = ParseHex(hexin);
    std::vector<uint8_t> correctout = ParseHex(hexout);
    std::vector<uint8_t> realout(in.size() + AES_BLOCKSIZE);

    // Encrypt the plaintext and verify that it equals the cipher
    AES128CBCEncrypt enc(key.data(), iv.data(), pad);
    int size = enc.Encrypt(in.data(), in.size(), realout.data());
    realout.resize(size);
    BOOST_CHECK(realout.size() == correctout.size());
    BOOST_CHECK_MESSAGE(realout == correctout,
                        HexStr(realout) + std::string(" != ") + hexout);

    // Decrypt the cipher and verify that it equals the plaintext
    std::vector<uint8_t> decrypted(correctout.size());
    AES128CBCDecrypt dec(key.data(), iv.data(), pad);
    size = dec.Decrypt(correctout.data(), correctout.size(), decrypted.data());
    decrypted.resize(size);
    BOOST_CHECK(decrypted.size() == in.size());
    BOOST_CHECK_MESSAGE(decrypted == in,
                        HexStr(decrypted) + std::string(" != ") + hexin);

    // Encrypt and re-decrypt substrings of the plaintext and verify that they
    // equal each-other
    for (std::vector<uint8_t>::iterator i(in.begin()); i != in.end(); ++i) {
        std::vector<uint8_t> sub(i, in.end());
        std::vector<uint8_t> subout(sub.size() + AES_BLOCKSIZE);
        int _size = enc.Encrypt(sub.data(), sub.size(), subout.data());
        if (_size != 0) {
            subout.resize(_size);
            std::vector<uint8_t> subdecrypted(subout.size());
            _size =
                dec.Decrypt(subout.data(), subout.size(), subdecrypted.data());
            subdecrypted.resize(_size);
            BOOST_CHECK(decrypted.size() == in.size());
            BOOST_CHECK_MESSAGE(subdecrypted == sub, HexStr(subdecrypted) +
                                                         std::string(" != ") +
                                                         HexStr(sub));
        }
    }
}

static void TestAES256CBC(const std::string &hexkey, const std::string &hexiv,
                          bool pad, const std::string &hexin,
                          const std::string &hexout) {
    std::vector<uint8_t> key = ParseHex(hexkey);
    std::vector<uint8_t> iv = ParseHex(hexiv);
    std::vector<uint8_t> in = ParseHex(hexin);
    std::vector<uint8_t> correctout = ParseHex(hexout);
    std::vector<uint8_t> realout(in.size() + AES_BLOCKSIZE);

    // Encrypt the plaintext and verify that it equals the cipher
    AES256CBCEncrypt enc(key.data(), iv.data(), pad);
    int size = enc.Encrypt(in.data(), in.size(), realout.data());
    realout.resize(size);
    BOOST_CHECK(realout.size() == correctout.size());
    BOOST_CHECK_MESSAGE(realout == correctout,
                        HexStr(realout) + std::string(" != ") + hexout);

    // Decrypt the cipher and verify that it equals the plaintext
    std::vector<uint8_t> decrypted(correctout.size());
    AES256CBCDecrypt dec(key.data(), iv.data(), pad);
    size = dec.Decrypt(correctout.data(), correctout.size(), decrypted.data());
    decrypted.resize(size);
    BOOST_CHECK(decrypted.size() == in.size());
    BOOST_CHECK_MESSAGE(decrypted == in,
                        HexStr(decrypted) + std::string(" != ") + hexin);

    // Encrypt and re-decrypt substrings of the plaintext and verify that they
    // equal each-other
    for (std::vector<uint8_t>::iterator i(in.begin()); i != in.end(); ++i) {
        std::vector<uint8_t> sub(i, in.end());
        std::vector<uint8_t> subout(sub.size() + AES_BLOCKSIZE);
        int _size = enc.Encrypt(sub.data(), sub.size(), subout.data());
        if (_size != 0) {
            subout.resize(_size);
            std::vector<uint8_t> subdecrypted(subout.size());
            _size =
                dec.Decrypt(subout.data(), subout.size(), subdecrypted.data());
            subdecrypted.resize(_size);
            BOOST_CHECK(decrypted.size() == in.size());
            BOOST_CHECK_MESSAGE(subdecrypted == sub, HexStr(subdecrypted) +
                                                         std::string(" != ") +
                                                         HexStr(sub));
        }
    }
}

static void TestChaCha20(const std::string &hex_message,
                         const std::string &hexkey, uint64_t nonce,
                         uint64_t seek, const std::string &hexout) {
    std::vector<uint8_t> key = ParseHex(hexkey);
    std::vector<uint8_t> m = ParseHex(hex_message);
    ChaCha20 rng(key.data(), key.size());
    rng.SetIV(nonce);
    rng.Seek(seek);
    std::vector<uint8_t> out = ParseHex(hexout);
    std::vector<uint8_t> outres;
    outres.resize(out.size());
    assert(hex_message.empty() || m.size() == out.size());

    // perform the ChaCha20 round(s), if message is provided it will output the
    // encrypted ciphertext otherwise the keystream
    if (!hex_message.empty()) {
        rng.Crypt(m.data(), outres.data(), outres.size());
    } else {
        rng.Keystream(outres.data(), outres.size());
    }
    BOOST_CHECK(out == outres);
    if (!hex_message.empty()) {
        // Manually XOR with the keystream and compare the output
        rng.SetIV(nonce);
        rng.Seek(seek);
        std::vector<uint8_t> only_keystream(outres.size());
        rng.Keystream(only_keystream.data(), only_keystream.size());
        for (size_t i = 0; i != m.size(); i++) {
            outres[i] = m[i] ^ only_keystream[i];
        }
        BOOST_CHECK(out == outres);
    }
}

static void TestPoly1305(const std::string &hexmessage,
                         const std::string &hexkey, const std::string &hextag) {
    std::vector<uint8_t> key = ParseHex(hexkey);
    std::vector<uint8_t> m = ParseHex(hexmessage);
    std::vector<uint8_t> tag = ParseHex(hextag);
    std::vector<uint8_t> tagres;
    tagres.resize(POLY1305_TAGLEN);
    poly1305_auth(tagres.data(), m.data(), m.size(), key.data());
    BOOST_CHECK(tag == tagres);
}

static void TestHKDF_SHA256_32(const std::string &ikm_hex,
                               const std::string &salt_hex,
                               const std::string &info_hex,
                               const std::string &okm_check_hex) {
    std::vector<uint8_t> initial_key_material = ParseHex(ikm_hex);
    std::vector<uint8_t> salt = ParseHex(salt_hex);
    std::vector<uint8_t> info = ParseHex(info_hex);

    // our implementation only supports strings for the "info" and "salt",
    // stringify them
    std::string salt_stringified(reinterpret_cast<char *>(salt.data()),
                                 salt.size());
    std::string info_stringified(reinterpret_cast<char *>(info.data()),
                                 info.size());

    CHKDF_HMAC_SHA256_L32 hkdf32(initial_key_material.data(),
                                 initial_key_material.size(), salt_stringified);
    uint8_t out[32];
    hkdf32.Expand32(info_stringified, out);
    BOOST_CHECK(HexStr(out) == okm_check_hex);
}

static std::string LongTestString() {
    std::string ret;
    for (int i = 0; i < 200000; i++) {
        ret += uint8_t(i);
        ret += uint8_t(i >> 4);
        ret += uint8_t(i >> 8);
        ret += uint8_t(i >> 12);
        ret += uint8_t(i >> 16);
    }
    return ret;
}

const std::string test1 = LongTestString();

BOOST_AUTO_TEST_CASE(ripemd160_testvectors) {
    TestRIPEMD160("", "9c1185a5c5e9fc54612808977ee8f548b2258d31");
    TestRIPEMD160("abc", "8eb208f7e05d987a9b044a8e98c6b087f15a0bfc");
    TestRIPEMD160("message digest", "5d0689ef49d2fae572b881b123a85ffa21595f36");
    TestRIPEMD160("secure hash algorithm",
                  "20397528223b6a5f4cbc2808aba0464e645544f9");
    TestRIPEMD160("RIPEMD160 is considered to be safe",
                  "a7d78608c7af8a8e728778e81576870734122b66");
    TestRIPEMD160("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
                  "12a053384a9c0c88e405a06c27dcf49ada62eb2b");
    TestRIPEMD160(
        "For this sample, this 63-byte string will be used as input data",
        "de90dbfee14b63fb5abf27c2ad4a82aaa5f27a11");
    TestRIPEMD160(
        "This is exactly 64 bytes long, not counting the terminating byte",
        "eda31d51d3a623b81e19eb02e24ff65d27d67b37");
    TestRIPEMD160(std::string(1000000, 'a'),
                  "52783243c1697bdbe16d37f97f68f08325dc1528");
    TestRIPEMD160(test1, "464243587bd146ea835cdf57bdae582f25ec45f1");
}

BOOST_AUTO_TEST_CASE(sha1_testvectors) {
    TestSHA1("", "da39a3ee5e6b4b0d3255bfef95601890afd80709");
    TestSHA1("abc", "a9993e364706816aba3e25717850c26c9cd0d89d");
    TestSHA1("message digest", "c12252ceda8be8994d5fa0290a47231c1d16aae3");
    TestSHA1("secure hash algorithm",
             "d4d6d2f0ebe317513bbd8d967d89bac5819c2f60");
    TestSHA1("SHA1 is considered to be safe",
             "f2b6650569ad3a8720348dd6ea6c497dee3a842a");
    TestSHA1("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
             "84983e441c3bd26ebaae4aa1f95129e5e54670f1");
    TestSHA1("For this sample, this 63-byte string will be used as input data",
             "4f0ea5cd0585a23d028abdc1a6684e5a8094dc49");
    TestSHA1("This is exactly 64 bytes long, not counting the terminating byte",
             "fb679f23e7d1ce053313e66e127ab1b444397057");
    TestSHA1(std::string(1000000, 'a'),
             "34aa973cd4c4daa4f61eeb2bdbad27316534016f");
    TestSHA1(test1, "b7755760681cbfd971451668f32af5774f4656b5");
}

BOOST_AUTO_TEST_CASE(sha256_testvectors) {
    TestSHA256(
        "", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    TestSHA256(
        "abc",
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    TestSHA256(
        "message digest",
        "f7846f55cf23e14eebeab5b4e1550cad5b509e3348fbc4efa3a1413d393cb650");
    TestSHA256(
        "secure hash algorithm",
        "f30ceb2bb2829e79e4ca9753d35a8ecc00262d164cc077080295381cbd643f0d");
    TestSHA256(
        "SHA256 is considered to be safe",
        "6819d915c73f4d1e77e4e1b52d1fa0f9cf9beaead3939f15874bd988e2a23630");
    TestSHA256(
        "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
        "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1");
    TestSHA256(
        "For this sample, this 63-byte string will be used as input data",
        "f08a78cbbaee082b052ae0708f32fa1e50c5c421aa772ba5dbb406a2ea6be342");
    TestSHA256(
        "This is exactly 64 bytes long, not counting the terminating byte",
        "ab64eff7e88e2e46165e29f2bce41826bd4c7b3552f6b382a9e7d3af47c245f8");
    TestSHA256(
        "As Bitcoin relies on 80 byte header hashes, we want to have an "
        "example for that.",
        "7406e8de7d6e4fffc573daef05aefb8806e7790f55eab5576f31349743cca743");
    TestSHA256(
        std::string(1000000, 'a'),
        "cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0");
    TestSHA256(
        test1,
        "a316d55510b49662420f49d145d42fb83f31ef8dc016aa4e32df049991a91e26");
}

BOOST_AUTO_TEST_CASE(sha512_testvectors) {
    TestSHA512(
        "", "cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce"
            "47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e");
    TestSHA512(
        "abc",
        "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a"
        "2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f");
    TestSHA512(
        "message digest",
        "107dbf389d9e9f71a3a95f6c055b9251bc5268c2be16d6c13492ea45b0199f33"
        "09e16455ab1e96118e8a905d5597b72038ddb372a89826046de66687bb420e7c");
    TestSHA512(
        "secure hash algorithm",
        "7746d91f3de30c68cec0dd693120a7e8b04d8073cb699bdce1a3f64127bca7a3"
        "d5db502e814bb63c063a7a5043b2df87c61133395f4ad1edca7fcf4b30c3236e");
    TestSHA512(
        "SHA512 is considered to be safe",
        "099e6468d889e1c79092a89ae925a9499b5408e01b66cb5b0a3bd0dfa51a9964"
        "6b4a3901caab1318189f74cd8cf2e941829012f2449df52067d3dd5b978456c2");
    TestSHA512(
        "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
        "204a8fc6dda82f0a0ced7beb8e08a41657c16ef468b228a8279be331a703c335"
        "96fd15c13b1b07f9aa1d3bea57789ca031ad85c7a71dd70354ec631238ca3445");
    TestSHA512(
        "For this sample, this 63-byte string will be used as input data",
        "b3de4afbc516d2478fe9b518d063bda6c8dd65fc38402dd81d1eb7364e72fb6e"
        "6663cf6d2771c8f5a6da09601712fb3d2a36c6ffea3e28b0818b05b0a8660766");
    TestSHA512(
        "This is exactly 64 bytes long, not counting the terminating byte",
        "70aefeaa0e7ac4f8fe17532d7185a289bee3b428d950c14fa8b713ca09814a38"
        "7d245870e007a80ad97c369d193e41701aa07f3221d15f0e65a1ff970cedf030");
    TestSHA512(
        "abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmno"
        "ijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu",
        "8e959b75dae313da8cf4f72814fc143f8f7779c6eb9f7fa17299aeadb6889018"
        "501d289e4900f7e4331b99dec4b5433ac7d329eeb6dd26545e96e55b874be909");
    TestSHA512(
        std::string(1000000, 'a'),
        "e718483d0ce769644e2e42c7bc15b4638e1f98b13b2044285632a803afa973eb"
        "de0ff244877ea60a4cb0432ce577c31beb009c5c2c49aa2e4eadb217ad8cc09b");
    TestSHA512(
        test1,
        "40cac46c147e6131c5193dd5f34e9d8bb4951395f27b08c558c65ff4ba2de594"
        "37de8c3ef5459d76a52cedc02dc499a3c9ed9dedbfb3281afd9653b8a112fafc");
}

BOOST_AUTO_TEST_CASE(hmac_sha256_testvectors) {
    // test cases 1, 2, 3, 4, 6 and 7 of RFC 4231
    TestHMACSHA256(
        "0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b", "4869205468657265",
        "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7");
    TestHMACSHA256(
        "4a656665", "7768617420646f2079612077616e7420666f72206e6f7468696e673f",
        "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843");
    TestHMACSHA256(
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"
        "dddddddddddddddddddddddddddddddddddd",
        "773ea91e36800e46854db8ebd09181a72959098b3ef8c122d9635514ced565fe");
    TestHMACSHA256(
        "0102030405060708090a0b0c0d0e0f10111213141516171819",
        "cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd"
        "cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd",
        "82558a389a443c0ea4cc819899f2083a85f0faa3e578f8077a2e3ff46729665b");
    TestHMACSHA256(
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        "aaaaaa",
        "54657374205573696e67204c6172676572205468616e20426c6f636b2d53697a"
        "65204b6579202d2048617368204b6579204669727374",
        "60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54");
    TestHMACSHA256(
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        "aaaaaa",
        "5468697320697320612074657374207573696e672061206c6172676572207468"
        "616e20626c6f636b2d73697a65206b657920616e642061206c61726765722074"
        "68616e20626c6f636b2d73697a6520646174612e20546865206b6579206e6565"
        "647320746f20626520686173686564206265666f7265206265696e6720757365"
        "642062792074686520484d414320616c676f726974686d2e",
        "9b09ffa71b942fcb27635fbcd5b0e944bfdc63644f0713938a7f51535c3a35e2");
    // Test case with key length 63 bytes.
    TestHMACSHA256(
        "4a6566654a6566654a6566654a6566654a6566654a6566654a6566654a656665"
        "4a6566654a6566654a6566654a6566654a6566654a6566654a6566654a6566",
        "7768617420646f2079612077616e7420666f72206e6f7468696e673f",
        "9de4b546756c83516720a4ad7fe7bdbeac4298c6fdd82b15f895a6d10b0769a6");
    // Test case with key length 64 bytes.
    TestHMACSHA256(
        "4a6566654a6566654a6566654a6566654a6566654a6566654a6566654a656665"
        "4a6566654a6566654a6566654a6566654a6566654a6566654a6566654a656665",
        "7768617420646f2079612077616e7420666f72206e6f7468696e673f",
        "528c609a4c9254c274585334946b7c2661bad8f1fc406b20f6892478d19163dd");
    // Test case with key length 65 bytes.
    TestHMACSHA256(
        "4a6566654a6566654a6566654a6566654a6566654a6566654a6566654a656665"
        "4a6566654a6566654a6566654a6566654a6566654a6566654a6566654a656665"
        "4a",
        "7768617420646f2079612077616e7420666f72206e6f7468696e673f",
        "d06af337f359a2330deffb8e3cbe4b5b7aa8ca1f208528cdbd245d5dc63c4483");
}

BOOST_AUTO_TEST_CASE(hmac_sha512_testvectors) {
    // test cases 1, 2, 3, 4, 6 and 7 of RFC 4231
    TestHMACSHA512(
        "0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b", "4869205468657265",
        "87aa7cdea5ef619d4ff0b4241a1d6cb02379f4e2ce4ec2787ad0b30545e17cde"
        "daa833b7d6b8a702038b274eaea3f4e4be9d914eeb61f1702e696c203a126854");
    TestHMACSHA512(
        "4a656665", "7768617420646f2079612077616e7420666f72206e6f7468696e673f",
        "164b7a7bfcf819e2e395fbe73b56e0a387bd64222e831fd610270cd7ea250554"
        "9758bf75c05a994a6d034f65f8f0e6fdcaeab1a34d4a6b4b636e070a38bce737");
    TestHMACSHA512(
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"
        "dddddddddddddddddddddddddddddddddddd",
        "fa73b0089d56a284efb0f0756c890be9b1b5dbdd8ee81a3655f83e33b2279d39"
        "bf3e848279a722c806b485a47e67c807b946a337bee8942674278859e13292fb");
    TestHMACSHA512(
        "0102030405060708090a0b0c0d0e0f10111213141516171819",
        "cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd"
        "cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd",
        "b0ba465637458c6990e5a8c5f61d4af7e576d97ff94b872de76f8050361ee3db"
        "a91ca5c11aa25eb4d679275cc5788063a5f19741120c4f2de2adebeb10a298dd");
    TestHMACSHA512(
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        "aaaaaa",
        "54657374205573696e67204c6172676572205468616e20426c6f636b2d53697a"
        "65204b6579202d2048617368204b6579204669727374",
        "80b24263c7c1a3ebb71493c1dd7be8b49b46d1f41b4aeec1121b013783f8f352"
        "6b56d037e05f2598bd0fd2215d6a1e5295e64f73f63f0aec8b915a985d786598");
    TestHMACSHA512(
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        "aaaaaa",
        "5468697320697320612074657374207573696e672061206c6172676572207468"
        "616e20626c6f636b2d73697a65206b657920616e642061206c61726765722074"
        "68616e20626c6f636b2d73697a6520646174612e20546865206b6579206e6565"
        "647320746f20626520686173686564206265666f7265206265696e6720757365"
        "642062792074686520484d414320616c676f726974686d2e",
        "e37b6a775dc87dbaa4dfa9f96e5e3ffddebd71f8867289865df5a32d20cdc944"
        "b6022cac3c4982b10d5eeb55c3e4de15134676fb6de0446065c97440fa8c6a58");
    // Test case with key length 127 bytes.
    TestHMACSHA512(
        "4a6566654a6566654a6566654a6566654a6566654a6566654a6566654a656665"
        "4a6566654a6566654a6566654a6566654a6566654a6566654a6566654a656665"
        "4a6566654a6566654a6566654a6566654a6566654a6566654a6566654a656665"
        "4a6566654a6566654a6566654a6566654a6566654a6566654a6566654a6566",
        "7768617420646f2079612077616e7420666f72206e6f7468696e673f",
        "267424dfb8eeb999f3e5ec39a4fe9fd14c923e6187e0897063e5c9e02b2e624a"
        "c04413e762977df71a9fb5d562b37f89dfdfb930fce2ed1fa783bbc2a203d80e");
    // Test case with key length 128 bytes.
    TestHMACSHA512(
        "4a6566654a6566654a6566654a6566654a6566654a6566654a6566654a656665"
        "4a6566654a6566654a6566654a6566654a6566654a6566654a6566654a656665"
        "4a6566654a6566654a6566654a6566654a6566654a6566654a6566654a656665"
        "4a6566654a6566654a6566654a6566654a6566654a6566654a6566654a656665",
        "7768617420646f2079612077616e7420666f72206e6f7468696e673f",
        "43aaac07bb1dd97c82c04df921f83b16a68d76815cd1a30d3455ad43a3d80484"
        "2bb35462be42cc2e4b5902de4d204c1c66d93b47d1383e3e13a3788687d61258");
    // Test case with key length 129 bytes.
    TestHMACSHA512(
        "4a6566654a6566654a6566654a6566654a6566654a6566654a6566654a656665"
        "4a6566654a6566654a6566654a6566654a6566654a6566654a6566654a656665"
        "4a6566654a6566654a6566654a6566654a6566654a6566654a6566654a656665"
        "4a6566654a6566654a6566654a6566654a6566654a6566654a6566654a656665"
        "4a",
        "7768617420646f2079612077616e7420666f72206e6f7468696e673f",
        "0b273325191cfc1b4b71d5075c8fcad67696309d292b1dad2cd23983a35feb8e"
        "fb29795e79f2ef27f68cb1e16d76178c307a67beaad9456fac5fdffeadb16e2c");
}

BOOST_AUTO_TEST_CASE(aes_testvectors) {
    // AES test vectors from FIPS 197.
    TestAES128("000102030405060708090a0b0c0d0e0f",
               "00112233445566778899aabbccddeeff",
               "69c4e0d86a7b0430d8cdb78070b4c55a");
    TestAES256(
        "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
        "00112233445566778899aabbccddeeff", "8ea2b7ca516745bfeafc49904b496089");

    // AES-ECB test vectors from NIST sp800-38a.
    TestAES128("2b7e151628aed2a6abf7158809cf4f3c",
               "6bc1bee22e409f96e93d7e117393172a",
               "3ad77bb40d7a3660a89ecaf32466ef97");
    TestAES128("2b7e151628aed2a6abf7158809cf4f3c",
               "ae2d8a571e03ac9c9eb76fac45af8e51",
               "f5d3d58503b9699de785895a96fdbaaf");
    TestAES128("2b7e151628aed2a6abf7158809cf4f3c",
               "30c81c46a35ce411e5fbc1191a0a52ef",
               "43b1cd7f598ece23881b00e3ed030688");
    TestAES128("2b7e151628aed2a6abf7158809cf4f3c",
               "f69f2445df4f9b17ad2b417be66c3710",
               "7b0c785e27e8ad3f8223207104725dd4");
    TestAES256(
        "603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4",
        "6bc1bee22e409f96e93d7e117393172a", "f3eed1bdb5d2a03c064b5a7e3db181f8");
    TestAES256(
        "603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4",
        "ae2d8a571e03ac9c9eb76fac45af8e51", "591ccb10d410ed26dc5ba74a31362870");
    TestAES256(
        "603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4",
        "30c81c46a35ce411e5fbc1191a0a52ef", "b6ed21b99ca6f4f9f153e7b1beafed1d");
    TestAES256(
        "603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4",
        "f69f2445df4f9b17ad2b417be66c3710", "23304b7a39f9f3ff067d8d8f9e24ecc7");
}

BOOST_AUTO_TEST_CASE(aes_cbc_testvectors) {
    // NIST AES CBC 128-bit encryption test-vectors
    TestAES128CBC("2b7e151628aed2a6abf7158809cf4f3c",
                  "000102030405060708090A0B0C0D0E0F", false,
                  "6bc1bee22e409f96e93d7e117393172a",
                  "7649abac8119b246cee98e9b12e9197d");
    TestAES128CBC("2b7e151628aed2a6abf7158809cf4f3c",
                  "7649ABAC8119B246CEE98E9B12E9197D", false,
                  "ae2d8a571e03ac9c9eb76fac45af8e51",
                  "5086cb9b507219ee95db113a917678b2");
    TestAES128CBC("2b7e151628aed2a6abf7158809cf4f3c",
                  "5086cb9b507219ee95db113a917678b2", false,
                  "30c81c46a35ce411e5fbc1191a0a52ef",
                  "73bed6b8e3c1743b7116e69e22229516");
    TestAES128CBC("2b7e151628aed2a6abf7158809cf4f3c",
                  "73bed6b8e3c1743b7116e69e22229516", false,
                  "f69f2445df4f9b17ad2b417be66c3710",
                  "3ff1caa1681fac09120eca307586e1a7");

    // The same vectors with padding enabled
    TestAES128CBC(
        "2b7e151628aed2a6abf7158809cf4f3c", "000102030405060708090A0B0C0D0E0F",
        true, "6bc1bee22e409f96e93d7e117393172a",
        "7649abac8119b246cee98e9b12e9197d8964e0b149c10b7b682e6e39aaeb731c");
    TestAES128CBC(
        "2b7e151628aed2a6abf7158809cf4f3c", "7649ABAC8119B246CEE98E9B12E9197D",
        true, "ae2d8a571e03ac9c9eb76fac45af8e51",
        "5086cb9b507219ee95db113a917678b255e21d7100b988ffec32feeafaf23538");
    TestAES128CBC(
        "2b7e151628aed2a6abf7158809cf4f3c", "5086cb9b507219ee95db113a917678b2",
        true, "30c81c46a35ce411e5fbc1191a0a52ef",
        "73bed6b8e3c1743b7116e69e22229516f6eccda327bf8e5ec43718b0039adceb");
    TestAES128CBC(
        "2b7e151628aed2a6abf7158809cf4f3c", "73bed6b8e3c1743b7116e69e22229516",
        true, "f69f2445df4f9b17ad2b417be66c3710",
        "3ff1caa1681fac09120eca307586e1a78cb82807230e1321d3fae00d18cc2012");

    // NIST AES CBC 256-bit encryption test-vectors
    TestAES256CBC(
        "603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4",
        "000102030405060708090A0B0C0D0E0F", false,
        "6bc1bee22e409f96e93d7e117393172a", "f58c4c04d6e5f1ba779eabfb5f7bfbd6");
    TestAES256CBC(
        "603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4",
        "F58C4C04D6E5F1BA779EABFB5F7BFBD6", false,
        "ae2d8a571e03ac9c9eb76fac45af8e51", "9cfc4e967edb808d679f777bc6702c7d");
    TestAES256CBC(
        "603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4",
        "9CFC4E967EDB808D679F777BC6702C7D", false,
        "30c81c46a35ce411e5fbc1191a0a52ef", "39f23369a9d9bacfa530e26304231461");
    TestAES256CBC(
        "603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4",
        "39F23369A9D9BACFA530E26304231461", false,
        "f69f2445df4f9b17ad2b417be66c3710", "b2eb05e2c39be9fcda6c19078c6a9d1b");

    // The same vectors with padding enabled
    TestAES256CBC(
        "603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4",
        "000102030405060708090A0B0C0D0E0F", true,
        "6bc1bee22e409f96e93d7e117393172a",
        "f58c4c04d6e5f1ba779eabfb5f7bfbd6485a5c81519cf378fa36d42b8547edc0");
    TestAES256CBC(
        "603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4",
        "F58C4C04D6E5F1BA779EABFB5F7BFBD6", true,
        "ae2d8a571e03ac9c9eb76fac45af8e51",
        "9cfc4e967edb808d679f777bc6702c7d3a3aa5e0213db1a9901f9036cf5102d2");
    TestAES256CBC(
        "603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4",
        "9CFC4E967EDB808D679F777BC6702C7D", true,
        "30c81c46a35ce411e5fbc1191a0a52ef",
        "39f23369a9d9bacfa530e263042314612f8da707643c90a6f732b3de1d3f5cee");
    TestAES256CBC(
        "603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4",
        "39F23369A9D9BACFA530E26304231461", true,
        "f69f2445df4f9b17ad2b417be66c3710",
        "b2eb05e2c39be9fcda6c19078c6a9d1b3f461796d6b0d6b2e0c2a72b4d80e644");
}

BOOST_AUTO_TEST_CASE(chacha20_testvector) {
    // Test vector from RFC 7539

    // test encryption
    TestChaCha20(
        "4c616469657320616e642047656e746c656d656e206f662074686520636c617373206f"
        "66202739393a204966204920636f756c64206f6666657220796f75206f6e6c79206f6e"
        "652074697020666f7220746865206675747572652c2073756e73637265656e20776f75"
        "6c642062652069742e",
        "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
        0x4a000000UL, 1,
        "6e2e359a2568f98041ba0728dd0d6981e97e7aec1d4360c20a27afccfd9fae0bf91b65"
        "c5524733ab8f593dabcd62b3571639d624e65152ab8f530c359f0861d807ca0dbf500d"
        "6a6156a38e088a22b65e52bc514d16ccf806818ce91ab77937365af90bbf74a35be6b4"
        "0b8eedf2785e42874d");

    // test keystream output
    TestChaCha20(
        "", "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
        0x4a000000UL, 1,
        "224f51f3401bd9e12fde276fb8631ded8c131f823d2c06e27e4fcaec9ef3cf788a3b0a"
        "a372600a92b57974cded2b9334794cba40c63e34cdea212c4cf07d41b769a6749f3f63"
        "0f4122cafe28ec4dc47e26d4346d70b98c73f3e9c53ac40c5945398b6eda1a832c89c1"
        "67eacd901d7e2bf363");

    // Test vectors from
    // https://tools.ietf.org/html/draft-agl-tls-chacha20poly1305-04#section-7
    TestChaCha20(
        "", "0000000000000000000000000000000000000000000000000000000000000000",
        0, 0,
        "76b8e0ada0f13d90405d6ae55386bd28bdd219b8a08ded1aa836efcc8b770dc7da4159"
        "7c5157488d7724e03fb8d84a376a43b8f41518a11cc387b669b2ee6586");
    TestChaCha20(
        "", "0000000000000000000000000000000000000000000000000000000000000001",
        0, 0,
        "4540f05a9f1fb296d7736e7b208e3c96eb4fe1834688d2604f450952ed432d41bbe2a0"
        "b6ea7566d2a5d1e7e20d42af2c53d792b1c43fea817e9ad275ae546963");
    TestChaCha20(
        "", "0000000000000000000000000000000000000000000000000000000000000000",
        0x0100000000000000ULL, 0,
        "de9cba7bf3d69ef5e786dc63973f653a0b49e015adbff7134fcb7df137821031e85a05"
        "0278a7084527214f73efc7fa5b5277062eb7a0433e445f41e3");
    TestChaCha20(
        "", "0000000000000000000000000000000000000000000000000000000000000000",
        1, 0,
        "ef3fdfd6c61578fbf5cf35bd3dd33b8009631634d21e42ac33960bd138e50d32111e4c"
        "af237ee53ca8ad6426194a88545ddc497a0b466e7d6bbdb0041b2f586b");
    TestChaCha20(
        "", "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
        0x0706050403020100ULL, 0,
        "f798a189f195e66982105ffb640bb7757f579da31602fc93ec01ac56f85ac3c134a454"
        "7b733b46413042c9440049176905d3be59ea1c53f15916155c2be8241a38008b9a26bc"
        "35941e2444177c8ade6689de95264986d95889fb60e84629c9bd9a5acb1cc118be563e"
        "b9b3a4a472f82e09a7e778492b562ef7130e88dfe031c79db9d4f7c7a899151b9a4750"
        "32b63fc385245fe054e3dd5a97a5f576fe064025d3ce042c566ab2c507b138db853e3d"
        "6959660996546cc9c4a6eafdc777c040d70eaf46f76dad3979e5c5360c3317166a1c89"
        "4c94a371876a94df7628fe4eaaf2ccb27d5aaae0ad7ad0f9d4b6ad3b54098746d4524d"
        "38407a6deb3ab78fab78c9");
}

BOOST_AUTO_TEST_CASE(hkdf_hmac_sha256_l32_tests) {
    // Use rfc5869 test vectors but trucated to 32 bytes (our implementation
    // only support length 32)
    TestHKDF_SHA256_32(
        /* IKM */ "0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b",
        /* salt */ "000102030405060708090a0b0c",
        /* info */ "f0f1f2f3f4f5f6f7f8f9",
        /* expected OKM */
        "3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf");
    TestHKDF_SHA256_32(
        "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122"
        "232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445"
        "464748494a4b4c4d4e4f",
        "606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182"
        "838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5"
        "a6a7a8a9aaabacadaeaf",
        "b0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2"
        "d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5"
        "f6f7f8f9fafbfcfdfeff",
        "b11e398dc80327a1c8e7f78c596a49344f012eda2d4efad8a050cc4c19afa97c");
    TestHKDF_SHA256_32(
        "0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b", "", "",
        "8da4e775a563c18f715f802a063c5a31b8a11f5c5ee1879ec3454e5f3c738d2d");
}

BOOST_AUTO_TEST_CASE(poly1305_testvector) {
    // RFC 7539, section 2.5.2.
    TestPoly1305(
        "43727970746f6772617068696320466f72756d2052657365617263682047726f7570",
        "85d6be7857556d337f4452fe42d506a80103808afb0db2fd4abff6af4149f51b",
        "a8061dc1305136c6c22b8baf0c0127a9");

    // RFC 7539, section A.3.
    TestPoly1305(
        "0000000000000000000000000000000000000000000000000000000000000000000000"
        "0000000000000000000000000000000000000000000000000000000000",
        "0000000000000000000000000000000000000000000000000000000000000000",
        "00000000000000000000000000000000");

    TestPoly1305(
        "416e79207375626d697373696f6e20746f20746865204945544620696e74656e646564"
        "2062792074686520436f6e7472696275746f7220666f72207075626c69636174696f6e"
        "20617320616c6c206f722070617274206f6620616e204945544620496e7465726e6574"
        "2d4472616674206f722052464320616e6420616e792073746174656d656e74206d6164"
        "652077697468696e2074686520636f6e74657874206f6620616e204945544620616374"
        "697669747920697320636f6e7369646572656420616e20224945544620436f6e747269"
        "627574696f6e222e20537563682073746174656d656e747320696e636c756465206f72"
        "616c2073746174656d656e747320696e20494554462073657373696f6e732c20617320"
        "77656c6c206173207772697474656e20616e6420656c656374726f6e696320636f6d6d"
        "756e69636174696f6e73206d61646520617420616e792074696d65206f7220706c6163"
        "652c207768696368206172652061646472657373656420746f",
        "0000000000000000000000000000000036e5f6b5c5e06070f0efca96227a863e",
        "36e5f6b5c5e06070f0efca96227a863e");

    TestPoly1305(
        "416e79207375626d697373696f6e20746f20746865204945544620696e74656e646564"
        "2062792074686520436f6e7472696275746f7220666f72207075626c69636174696f6e"
        "20617320616c6c206f722070617274206f6620616e204945544620496e7465726e6574"
        "2d4472616674206f722052464320616e6420616e792073746174656d656e74206d6164"
        "652077697468696e2074686520636f6e74657874206f6620616e204945544620616374"
        "697669747920697320636f6e7369646572656420616e20224945544620436f6e747269"
        "627574696f6e222e20537563682073746174656d656e747320696e636c756465206f72"
        "616c2073746174656d656e747320696e20494554462073657373696f6e732c20617320"
        "77656c6c206173207772697474656e20616e6420656c656374726f6e696320636f6d6d"
        "756e69636174696f6e73206d61646520617420616e792074696d65206f7220706c6163"
        "652c207768696368206172652061646472657373656420746f",
        "36e5f6b5c5e06070f0efca96227a863e00000000000000000000000000000000",
        "f3477e7cd95417af89a6b8794c310cf0");

    TestPoly1305(
        "2754776173206272696c6c69672c20616e642074686520736c6974687920746f766573"
        "0a446964206779726520616e642067696d626c6520696e2074686520776162653a0a41"
        "6c6c206d696d737920776572652074686520626f726f676f7665732c0a416e64207468"
        "65206d6f6d65207261746873206f757467726162652e",
        "1c9240a5eb55d38af333888604f6b5f0473917c1402b80099dca5cbc207075c0",
        "4541669a7eaaee61e708dc7cbcc5eb62");

    TestPoly1305(
        "ffffffffffffffffffffffffffffffff",
        "0200000000000000000000000000000000000000000000000000000000000000",
        "03000000000000000000000000000000");

    TestPoly1305(
        "02000000000000000000000000000000",
        "02000000000000000000000000000000ffffffffffffffffffffffffffffffff",
        "03000000000000000000000000000000");

    TestPoly1305(
        "fffffffffffffffffffffffffffffffff0ffffffffffffffffffffffffffffff110000"
        "00000000000000000000000000",
        "0100000000000000000000000000000000000000000000000000000000000000",
        "05000000000000000000000000000000");

    TestPoly1305(
        "fffffffffffffffffffffffffffffffffbfefefefefefefefefefefefefefefe010101"
        "01010101010101010101010101",
        "0100000000000000000000000000000000000000000000000000000000000000",
        "00000000000000000000000000000000");

    TestPoly1305(
        "fdffffffffffffffffffffffffffffff",
        "0200000000000000000000000000000000000000000000000000000000000000",
        "faffffffffffffffffffffffffffffff");

    TestPoly1305(
        "e33594d7505e43b900000000000000003394d7505e4379cd0100000000000000000000"
        "0000000000000000000000000001000000000000000000000000000000",
        "0100000000000000040000000000000000000000000000000000000000000000",
        "14000000000000005500000000000000");

    TestPoly1305(
        "e33594d7505e43b900000000000000003394d7505e4379cd0100000000000000000000"
        "00000000000000000000000000",
        "0100000000000000040000000000000000000000000000000000000000000000",
        "13000000000000000000000000000000");
}

static void
TestChaCha20Poly1305AEAD(bool must_succeed, unsigned int expected_aad_length,
                         const std::string &hex_m, const std::string &hex_k1,
                         const std::string &hex_k2,
                         const std::string &hex_aad_keystream,
                         const std::string &hex_encrypted_message,
                         const std::string &hex_encrypted_message_seq_999) {
    // we need two sequence numbers, one for the payload cipher instance...
    uint32_t seqnr_payload = 0;
    // ... and one for the AAD (length) cipher instance
    uint32_t seqnr_aad = 0;
    // we need to keep track of the position in the AAD cipher instance
    // keystream since we use the same 64byte output 21 times
    // (21 times 3 bytes length < 64)
    int aad_pos = 0;

    std::vector<uint8_t> aead_K_1 = ParseHex(hex_k1);
    std::vector<uint8_t> aead_K_2 = ParseHex(hex_k2);
    std::vector<uint8_t> plaintext_buf = ParseHex(hex_m);
    std::vector<uint8_t> expected_aad_keystream = ParseHex(hex_aad_keystream);
    std::vector<uint8_t> expected_ciphertext_and_mac =
        ParseHex(hex_encrypted_message);
    std::vector<uint8_t> expected_ciphertext_and_mac_sequence999 =
        ParseHex(hex_encrypted_message_seq_999);

    std::vector<uint8_t> ciphertext_buf(plaintext_buf.size() + POLY1305_TAGLEN,
                                        0);
    std::vector<uint8_t> plaintext_buf_new(plaintext_buf.size(), 0);
    std::vector<uint8_t> cmp_ctx_buffer(64);
    uint32_t out_len = 0;

    // create the AEAD instance
    ChaCha20Poly1305AEAD aead(aead_K_1.data(), aead_K_1.size(), aead_K_2.data(),
                              aead_K_2.size());

    // create a chacha20 instance to compare against
    ChaCha20 cmp_ctx(aead_K_2.data(), 32);

    // encipher
    bool res = aead.Crypt(seqnr_payload, seqnr_aad, aad_pos,
                          ciphertext_buf.data(), ciphertext_buf.size(),
                          plaintext_buf.data(), plaintext_buf.size(), true);
    // make sure the operation succeeded if expected to succeed
    BOOST_CHECK_EQUAL(res, must_succeed);
    if (!res) {
        return;
    }

    // verify ciphertext & mac against the test vector
    BOOST_CHECK_EQUAL(expected_ciphertext_and_mac.size(),
                      ciphertext_buf.size());
    BOOST_CHECK(memcmp(ciphertext_buf.data(),
                       expected_ciphertext_and_mac.data(),
                       ciphertext_buf.size()) == 0);

    // manually construct the AAD keystream
    cmp_ctx.SetIV(seqnr_aad);
    cmp_ctx.Seek(0);
    cmp_ctx.Keystream(cmp_ctx_buffer.data(), 64);
    BOOST_CHECK(memcmp(expected_aad_keystream.data(), cmp_ctx_buffer.data(),
                       expected_aad_keystream.size()) == 0);
    // crypt the 3 length bytes and compare the length
    uint32_t len_cmp = 0;
    len_cmp = (ciphertext_buf[0] ^ cmp_ctx_buffer[aad_pos + 0]) |
              (ciphertext_buf[1] ^ cmp_ctx_buffer[aad_pos + 1]) << 8 |
              (ciphertext_buf[2] ^ cmp_ctx_buffer[aad_pos + 2]) << 16;
    BOOST_CHECK_EQUAL(len_cmp, expected_aad_length);

    // encrypt / decrypt 1000 packets
    for (size_t i = 0; i < 1000; ++i) {
        res = aead.Crypt(seqnr_payload, seqnr_aad, aad_pos,
                         ciphertext_buf.data(), ciphertext_buf.size(),
                         plaintext_buf.data(), plaintext_buf.size(), true);
        BOOST_CHECK(res);
        BOOST_CHECK(aead.GetLength(&out_len, seqnr_aad, aad_pos,
                                   ciphertext_buf.data()));
        BOOST_CHECK_EQUAL(out_len, expected_aad_length);
        res = aead.Crypt(seqnr_payload, seqnr_aad, aad_pos,
                         plaintext_buf_new.data(), plaintext_buf_new.size(),
                         ciphertext_buf.data(), ciphertext_buf.size(), false);
        BOOST_CHECK(res);

        // make sure we repetitive get the same plaintext
        BOOST_CHECK(memcmp(plaintext_buf.data(), plaintext_buf_new.data(),
                           plaintext_buf.size()) == 0);

        // compare sequence number 999 against the test vector
        if (seqnr_payload == 999) {
            BOOST_CHECK(
                memcmp(ciphertext_buf.data(),
                       expected_ciphertext_and_mac_sequence999.data(),
                       expected_ciphertext_and_mac_sequence999.size()) == 0);
        }
        // set nonce and block counter, output the keystream
        cmp_ctx.SetIV(seqnr_aad);
        cmp_ctx.Seek(0);
        cmp_ctx.Keystream(cmp_ctx_buffer.data(), 64);

        // crypt the 3 length bytes and compare the length
        len_cmp = 0;
        len_cmp = (ciphertext_buf[0] ^ cmp_ctx_buffer[aad_pos + 0]) |
                  (ciphertext_buf[1] ^ cmp_ctx_buffer[aad_pos + 1]) << 8 |
                  (ciphertext_buf[2] ^ cmp_ctx_buffer[aad_pos + 2]) << 16;
        BOOST_CHECK_EQUAL(len_cmp, expected_aad_length);

        // increment the sequence number(s)
        // always increment the payload sequence number
        // increment the AAD keystream position by its size (3)
        // increment the AAD sequence number if we would hit the 64 byte limit
        seqnr_payload++;
        aad_pos += CHACHA20_POLY1305_AEAD_AAD_LEN;
        if (aad_pos + CHACHA20_POLY1305_AEAD_AAD_LEN > CHACHA20_ROUND_OUTPUT) {
            aad_pos = 0;
            seqnr_aad++;
        }
    }
}

BOOST_AUTO_TEST_CASE(chacha20_poly1305_aead_testvector) {
    /* test chacha20poly1305@bitcoin AEAD */

    // must fail with no message
    TestChaCha20Poly1305AEAD(
        false, 0, "",
        "0000000000000000000000000000000000000000000000000000000000000000",
        "0000000000000000000000000000000000000000000000000000000000000000", "",
        "", "");

    TestChaCha20Poly1305AEAD(
        true, 0,
        /* m  */
        "0000000000000000000000000000000000000000000000000000000000000000",
        /* k1 (payload) */
        "0000000000000000000000000000000000000000000000000000000000000000",
        /* k2 (AAD) */
        "0000000000000000000000000000000000000000000000000000000000000000",
        /* AAD keystream */
        "76b8e0ada0f13d90405d6ae55386bd28bdd219b8a08ded1aa836efcc8b770dc7da4159"
        "7c5157488d7724e03fb8d84a376a43b8f41518a11cc387b669b2ee6586",
        /* encrypted message & MAC */
        "76b8e09f07e7be5551387a98ba977c732d080dcb0f29a048e3656912c6533e32d2fc11"
        "829c1b6c1df1f551cd6131ff08",
        /* encrypted message & MAC at sequence 999 */
        "b0a03d5bd2855d60699e7d3a3133fa47be740fe4e4c1f967555e2d9271f31c3aaa7aa1"
        "6ec62c5e24f040c08bb20c3598");
    TestChaCha20Poly1305AEAD(
        true, 1,
        "0100000000000000000000000000000000000000000000000000000000000000",
        "0000000000000000000000000000000000000000000000000000000000000000",
        "0000000000000000000000000000000000000000000000000000000000000000",
        "76b8e0ada0f13d90405d6ae55386bd28bdd219b8a08ded1aa836efcc8b770dc7da4159"
        "7c5157488d7724e03fb8d84a376a43b8f41518a11cc387b669b2ee6586",
        "77b8e09f07e7be5551387a98ba977c732d080dcb0f29a048e3656912c6533e32baf0c8"
        "5b6dff8602b06cf52a6aefc62e",
        "b1a03d5bd2855d60699e7d3a3133fa47be740fe4e4c1f967555e2d9271f31c3a8bd94d"
        "54b5ecabbc41ffbb0c90924080");
    TestChaCha20Poly1305AEAD(
        true, 255,
        "ff0000f195e66982105ffb640bb7757f579da31602fc93ec01ac56f85ac3c134a4547b"
        "733b46413042c9440049176905d3be59ea1c53f15916155c2be8241a38008b9a26bc35"
        "941e2444177c8ade6689de95264986d95889fb60e84629c9bd9a5acb1cc118be563eb9"
        "b3a4a472f82e09a7e778492b562ef7130e88dfe031c79db9d4f7c7a899151b9a475032"
        "b63fc385245fe054e3dd5a97a5f576fe064025d3ce042c566ab2c507b138db853e3d69"
        "59660996546cc9c4a6eafdc777c040d70eaf46f76dad3979e5c5360c3317166a1c894c"
        "94a371876a94df7628fe4eaaf2ccb27d5aaae0ad7ad0f9d4b6ad3b54098746d4524d38"
        "407a6deb3ab78fab78c9",
        "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
        "ff0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
        "c640c1711e3ee904ac35c57ab9791c8a1c408603a90b77a83b54f6c844cb4b06d94e7f"
        "c6c800e165acd66147e80ec45a567f6ce66d05ec0cae679dceeb890017",
        "3940c1e92da4582ff6f92a776aeb14d014d384eeb30f660dacf70a14a23fd31e912127"
        "01334e2ce1acf5199dc84f4d61ddbe6571bca5af874b4c9226c26e650995d157644e18"
        "48b96ed6c2102d5489a050e71d29a5a66ece11de5fb5c9558d54da28fe45b0bc4db4e5"
        "b88030bfc4a352b4b7068eccf656bae7ad6a35615315fc7c49d4200388d5eca67c2e82"
        "2e069336c69b40db67e0f3c81209c50f3216a4b89fb3ae1b984b7851a2ec6f68ab12b1"
        "01ab120e1ea7313bb93b5a0f71185c7fea017ddb92769861c29dba4fbc432280d5dff2"
        "1b36d1c4c790128b22699950bb18bf74c448cdfe547d8ed4f657d8005fdc0cd7a050c2"
        "d46050a44c4376355858981fbe8b184288276e7a93eabc899c4a",
        "f039c6689eaeef0456685200feaab9d54bbd9acde4410a3b6f4321296f4a8ca2604b49"
        "727d8892c57e005d799b2a38e85e809f20146e08eec75169691c8d4f54a0d51a1e1c7b"
        "381e0474eb02f994be9415ef3ffcbd2343f0601e1f3b172a1d494f838824e4df570f8e"
        "3b0c04e27966e36c82abd352d07054ef7bd36b84c63f9369afe7ed79b94f953873006b"
        "920c3fa251a771de1b63da927058ade119aa898b8c97e42a606b2f6df1e2d957c22f75"
        "93c1e2002f4252f4c9ae4bf773499e5cfcfe14dfc1ede26508953f88553bf4a76a802f"
        "6a0068d59295b01503fd9a600067624203e880fdf53933b96e1f4d9eb3f4e363dd8165"
        "a278ff667a41ee42b9892b077cefff92b93441f7be74cf10e6cd");
}

BOOST_AUTO_TEST_CASE(countbits_tests) {
    FastRandomContext ctx;
    for (unsigned int i = 0; i <= 64; ++i) {
        if (i == 0) {
            // Check handling of zero.
            BOOST_CHECK_EQUAL(CountBits(0), 0U);
        } else if (i < 10) {
            for (uint64_t j = 1 << (i - 1); (j >> i) == 0; ++j) {
                // Exhaustively test up to 10 bits
                BOOST_CHECK_EQUAL(CountBits(j), i);
            }
        } else {
            for (int k = 0; k < 1000; k++) {
                // Randomly test 1000 samples of each length above 10 bits.
                uint64_t j = uint64_t(1) << (i - 1) | ctx.randbits(i - 1);
                BOOST_CHECK_EQUAL(CountBits(j), i);
            }
        }
    }
}

BOOST_AUTO_TEST_CASE(sha256d64) {
    for (int i = 0; i <= 32; ++i) {
        uint8_t in[64 * 32];
        uint8_t out1[32 * 32], out2[32 * 32];
        for (int j = 0; j < 64 * i; ++j) {
            in[j] = InsecureRandBits(8);
        }
        for (int j = 0; j < i; ++j) {
            CHash256().Write({in + 64 * j, 64}).Finalize({out1 + 32 * j, 32});
        }
        SHA256D64(out2, in, i);
        BOOST_CHECK(memcmp(out1, out2, 32 * i) == 0);
    }
}

static void TestSHA3_256(const std::string &input, const std::string &output) {
    const auto in_bytes = ParseHex(input);
    const auto out_bytes = ParseHex(output);

    SHA3_256 sha;
    // Hash the whole thing.
    uint8_t out[SHA3_256::OUTPUT_SIZE];
    sha.Write(in_bytes).Finalize(out);
    assert(out_bytes.size() == sizeof(out));
    BOOST_CHECK(std::equal(std::begin(out_bytes), std::end(out_bytes), out));

    // Reset and split randomly in 3
    sha.Reset();
    int s1 = InsecureRandRange(in_bytes.size() + 1);
    int s2 = InsecureRandRange(in_bytes.size() + 1 - s1);
    int s3 = in_bytes.size() - s1 - s2;
    sha.Write(MakeSpan(in_bytes).first(s1))
        .Write(MakeSpan(in_bytes).subspan(s1, s2));
    sha.Write(MakeSpan(in_bytes).last(s3)).Finalize(out);
    BOOST_CHECK(std::equal(std::begin(out_bytes), std::end(out_bytes), out));
}

BOOST_AUTO_TEST_CASE(keccak_tests) {
    // Start with the zero state.
    uint64_t state[25] = {0};
    CSHA256 tester;
    for (int i = 0; i < 262144; ++i) {
        KeccakF(state);
        for (int j = 0; j < 25; ++j) {
            uint8_t buf[8];
            WriteLE64(buf, state[j]);
            tester.Write(buf, 8);
        }
    }
    uint256 out;
    tester.Finalize(out.begin());
    // Expected hash of the concatenated serialized states after 1...262144
    // iterations of KeccakF. Verified against an independent implementation.
    BOOST_CHECK_EQUAL(
        out.ToString(),
        "5f4a7f2eca7d57740ef9f1a077b4fc67328092ec62620447fe27ad8ed5f7e34f");
}

BOOST_AUTO_TEST_CASE(sha3_256_tests) {
    // Test vectors from
    // https://csrc.nist.gov/CSRC/media/Projects/Cryptographic-Algorithm-Validation-Program/documents/sha3/sha-3bytetestvectors.zip

    // SHA3-256 Short test vectors (SHA3_256ShortMsg.rsp)
    TestSHA3_256(
        "", "a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a");
    TestSHA3_256(
        "e9",
        "f0d04dd1e6cfc29a4460d521796852f25d9ef8d28b44ee91ff5b759d72c1e6d6");
    TestSHA3_256(
        "d477",
        "94279e8f5ccdf6e17f292b59698ab4e614dfe696a46c46da78305fc6a3146ab7");
    TestSHA3_256(
        "b053fa",
        "9d0ff086cd0ec06a682c51c094dc73abdc492004292344bd41b82a60498ccfdb");
    TestSHA3_256(
        "e7372105",
        "3a42b68ab079f28c4ca3c752296f279006c4fe78b1eb79d989777f051e4046ae");
    TestSHA3_256(
        "0296f2c40a",
        "53a018937221081d09ed0497377e32a1fa724025dfdc1871fa503d545df4b40d");
    TestSHA3_256(
        "e6fd42037f80",
        "2294f8d3834f24aa9037c431f8c233a66a57b23fa3de10530bbb6911f6e1850f");
    TestSHA3_256(
        "37b442385e0538",
        "cfa55031e716bbd7a83f2157513099e229a88891bb899d9ccd317191819998f8");
    TestSHA3_256(
        "8bca931c8a132d2f",
        "dbb8be5dec1d715bd117b24566dc3f24f2cc0c799795d0638d9537481ef1e03e");
    TestSHA3_256(
        "fb8dfa3a132f9813ac",
        "fd09b3501888445ffc8c3bb95d106440ceee469415fce1474743273094306e2e");
    TestSHA3_256(
        "71fbacdbf8541779c24a",
        "cc4e5a216b01f987f24ab9cad5eb196e89d32ed4aac85acb727e18e40ceef00e");
    TestSHA3_256(
        "7e8f1fd1882e4a7c49e674",
        "79bef78c78aa71e11a3375394c2562037cd0f82a033b48a6cc932cc43358fd9e");
    TestSHA3_256(
        "5c56a6b18c39e66e1b7a993a",
        "b697556cb30d6df448ee38b973cb6942559de4c2567b1556240188c55ec0841c");
    TestSHA3_256(
        "9c76ca5b6f8d1212d8e6896ad8",
        "69dfc3a25865f3535f18b4a7bd9c0c69d78455f1fc1f4bf4e29fc82bf32818ec");
    TestSHA3_256(
        "687ff7485b7eb51fe208f6ff9a1b",
        "fe7e68ae3e1a91944e4d1d2146d9360e5333c099a256f3711edc372bc6eeb226");
    TestSHA3_256(
        "4149f41be1d265e668c536b85dde41",
        "229a7702448c640f55dafed08a52aa0b1139657ba9fc4c5eb8587e174ecd9b92");
    TestSHA3_256(
        "d83c721ee51b060c5a41438a8221e040",
        "b87d9e4722edd3918729ded9a6d03af8256998ee088a1ae662ef4bcaff142a96");
    TestSHA3_256(
        "266e8cbd3e73d80df2a49cfdaf0dc39cd1",
        "6c2de3c95900a1bcec6bd4ca780056af4acf3aa36ee640474b6e870187f59361");
    TestSHA3_256(
        "a1d7ce5104eb25d6131bb8f66e1fb13f3523",
        "ee9062f39720b821b88be5e64621d7e0ca026a9fe7248d78150b14bdbaa40bed");
    TestSHA3_256(
        "d751ccd2cd65f27db539176920a70057a08a6b",
        "7aaca80dbeb8dc3677d18b84795985463650d72f2543e0ec709c9e70b8cd7b79");
    TestSHA3_256(
        "b32dec58865ab74614ea982efb93c08d9acb1bb0",
        "6a12e535dbfddab6d374058d92338e760b1a211451a6c09be9b61ee22f3bb467");
    TestSHA3_256(
        "4e0cc4f5c6dcf0e2efca1f9f129372e2dcbca57ea6",
        "d2b7717864e9438dd02a4f8bb0203b77e2d3cd8f8ffcf9dc684e63de5ef39f0d");
    TestSHA3_256(
        "d16d978dfbaecf2c8a04090f6eebdb421a5a711137a6",
        "7f497913318defdc60c924b3704b65ada7ca3ba203f23fb918c6fb03d4b0c0da");
    TestSHA3_256(
        "47249c7cb85d8f0242ab240efd164b9c8b0bd3104bba3b",
        "435e276f06ae73aa5d5d6018f58e0f009be351eada47b677c2f7c06455f384e7");
    TestSHA3_256(
        "cf549a383c0ac31eae870c40867eeb94fa1b6f3cac4473f2",
        "cdfd1afa793e48fd0ee5b34dfc53fbcee43e9d2ac21515e4746475453ab3831f");
    TestSHA3_256(
        "9b3fdf8d448680840d6284f2997d3af55ffd85f6f4b33d7f8d",
        "25005d10e84ff97c74a589013be42fb37f68db64bdfc7626efc0dd628077493a");
    TestSHA3_256(
        "6b22fe94be2d0b2528d9847e127eb6c7d6967e7ec8b9660e77cc",
        "157a52b0477639b3bc179667b35c1cdfbb3eef845e4486f0f84a526e940b518c");
    TestSHA3_256(
        "d8decafdad377904a2789551135e782e302aed8450a42cfb89600c",
        "3ddecf5bba51643cd77ebde2141c8545f862067b209990d4cb65bfa65f4fa0c0");
    TestSHA3_256(
        "938fe6afdbf14d1229e03576e532f078898769e20620ae2164f5abfa",
        "9511abd13c756772b852114578ef9b96f9dc7d0f2b8dcde6ea7d1bd14c518890");
    TestSHA3_256(
        "66eb5e7396f5b451a02f39699da4dbc50538fb10678ec39a5e28baa3c0",
        "540acf81810a199996a612e885781308802fe460e9c638cc022e17076be8597a");
    TestSHA3_256(
        "de98968c8bd9408bd562ac6efbca2b10f5769aacaa01365763e1b2ce8048",
        "6b2f2547781449d4fa158180a178ef68d7056121bf8a2f2f49891afc24978521");
    TestSHA3_256(
        "94464e8fafd82f630e6aab9aa339d981db0a372dc5c1efb177305995ae2dc0",
        "ea7952ad759653cd47a18004ac2dbb9cf4a1e7bba8a530cf070570c711a634ea");
    TestSHA3_256(
        "c178ce0f720a6d73c6cf1caa905ee724d5ba941c2e2628136e3aad7d853733ba",
        "64537b87892835ff0963ef9ad5145ab4cfce5d303a0cb0415b3b03f9d16e7d6b");
    TestSHA3_256(
        "14365d3301150d7c5ba6bb8c1fc26e9dab218fc5d01c9ed528b72482aadee9c27bef66"
        "7907797d55514468f68791f053daa2df598d7db7d54beea493bdcbb0c75c7b36ad84b9"
        "996dca96354190bd96d9d7fbe8ff54ffaf77c55eb92985da50825ee3b4179f5ec88b6f"
        "a60bb361d0caf9493494fe4d28ef843f0f498a2a9331b82a",
        "9b690531dee948a9c559a2e0efab2ec824151a9175f2730a030b748d07cbaa7f");
    TestSHA3_256(
        "4a757db93f6d4c6529211d70d5f8491799c0f73ae7f24bbd2138db2eaf2c63a85063b9"
        "f7adaa03fc348f275323248334e3ffdf9798859f9cf6693d29566ff7d50976c505ecb5"
        "8e543c459b39acdf4ce4b5e80a682eaa7c1f1ce5fe4acb864ff91eb6892b23165735ea"
        "49626898b40ceeb78161f5d0ea4a103cb404d937f9d1dc362b",
        "1ac7cc7e2e8ea14fb1b90096f41265100712c5dd41519d78b2786cfb6355af72");
    TestSHA3_256(
        "da11c39c77250f6264dda4b096341ff9c4cc2c900633b20ea1664bf32193f790a92311"
        "2488f882450cf334819bbaca46ffb88eff0265aa803bc79ca42739e4347c6bff0bb9aa"
        "99780261ffe42be0d3b5135d03723338fb2776841a0b4bc26360f9ef769b34c2bec5ed"
        "2feb216e2fa30fa5c37430c0360ecbfba3af6fb6b8dedacbb95c",
        "c163cd43de224ac5c262ae39db746cfcad66074ebaec4a6da23d86b310520f21");
    TestSHA3_256(
        "3341ca020d4835838b0d6c8f93aaaebb7af60730d208c85283f6369f1ee27fd96d38f2"
        "674f316ef9c29c1b6b42dd59ec5236f65f5845a401adceaa4cf5bbd91cac61c2110205"
        "2634e99faedd6cdddcd4426b42b6a372f29a5a5f35f51ce580bb1845a3c7cfcd447d26"
        "9e8caeb9b320bb731f53fe5c969a65b12f40603a685afed86bfe53",
        "6c3e93f2b49f493344cc3eb1e9454f79363032beee2f7ea65b3d994b5cae438f");
    TestSHA3_256(
        "989fc49594afc73405bacee4dbbe7135804f800368de39e2ea3bbec04e59c6c5275292"
        "7ee3aa233ba0d8aab5410240f4c109d770c8c570777c928fce9a0bec9bc5156c821e20"
        "4f0f14a9ab547e0319d3e758ae9e28eb2dbc3d9f7acf51bd52f41bf23aeb6d97b5780a"
        "35ba08b94965989744edd3b1d6d67ad26c68099af85f98d0f0e4fff9",
        "b10adeb6a9395a48788931d45a7b4e4f69300a76d8b716c40c614c3113a0f051");
    TestSHA3_256(
        "e5022f4c7dfe2dbd207105e2f27aaedd5a765c27c0bc60de958b49609440501848ccf3"
        "98cf66dfe8dd7d131e04f1432f32827a057b8904d218e68ba3b0398038d755bd13d5f1"
        "68cfa8a11ab34c0540873940c2a62eace3552dcd6953c683fdb29983d4e417078f1988"
        "c560c9521e6f8c78997c32618fc510db282a985f868f2d973f82351d11",
        "3293a4b9aeb8a65e1014d3847500ffc8241594e9c4564cbd7ce978bfa50767fe");
    TestSHA3_256(
        "b1f6076509938432145bb15dbe1a7b2e007934be5f753908b50fd24333455970a7429f"
        "2ffbd28bd6fe1804c4688311f318fe3fcd9f6744410243e115bcb00d7e039a4fee4c32"
        "6c2d119c42abd2e8f4155a44472643704cc0bc72403b8a8ab0fd4d68e04a059d6e5ed4"
        "5033b906326abb4eb4147052779bad6a03b55ca5bd8b140e131bed2dfada",
        "f82d9602b231d332d902cb6436b15aef89acc591cb8626233ced20c0a6e80d7a");
    TestSHA3_256(
        "56ea14d7fcb0db748ff649aaa5d0afdc2357528a9aad6076d73b2805b53d89e73681ab"
        "fad26bee6c0f3d20215295f354f538ae80990d2281be6de0f6919aa9eb048c26b524f4"
        "d91ca87b54c0c54aa9b54ad02171e8bf31e8d158a9f586e92ffce994ecce9a5185cc80"
        "364d50a6f7b94849a914242fcb73f33a86ecc83c3403630d20650ddb8cd9c4",
        "4beae3515ba35ec8cbd1d94567e22b0d7809c466abfbafe9610349597ba15b45");

    // SHA3-256 Long test vectors (SHA3_256LongMsg.rsp)
    TestSHA3_256(
        "b1caa396771a09a1db9bc20543e988e359d47c2a616417bbca1b62cb02796a888fc6ee"
        "ff5c0b5c3d5062fcb4256f6ae1782f492c1cf03610b4a1fb7b814c057878e1190b9835"
        "425c7a4a0e182ad1f91535ed2a35033a5d8c670e21c575ff43c194a58a82d4a1a44881"
        "dd61f9f8161fc6b998860cbe4975780be93b6f87980bad0a99aa2cb7556b478ca35d1f"
        "3746c33e2bb7c47af426641cc7bbb3425e2144820345e1d0ea5b7da2c3236a52906acd"
        "c3b4d34e474dd714c0c40bf006a3a1d889a632983814bbc4a14fe5f159aa89249e7c73"
        "8b3b73666bac2a615a83fd21ae0a1ce7352ade7b278b587158fd2fabb217aa1fe31d0b"
        "da53272045598015a8ae4d8cec226fefa58daa05500906c4d85e7567",
        "cb5648a1d61c6c5bdacd96f81c9591debc3950dcf658145b8d996570ba881a05");
    TestSHA3_256(
        "712b03d9ebe78d3a032a612939c518a6166ca9a161183a7596aa35b294d19d1f962da3"
        "ff64b57494cb5656e24adcf3b50e16f4e52135d2d9de76e94aa801cf49db10e3840353"
        "29c54c9455bb3a9725fd9a44f44cb9078d18d3783d46ce372c31281aecef2f8b53d570"
        "2b863d71bc5786a33dd15d9256103b5ff7572f703d5cde6695e6c84f239acd1d6512ef"
        "581330590f4ab2a114ea064a693d5f8df5d908587bc7f998cde4a8b43d882159556659"
        "7dc8b3bf9ea78b154bd8907ee6c5d4d8a851f94be510962292b7ddda04d17b79fab4c0"
        "22deb400e5489639dbc448f573d5cf72073a8001b36f73ac6677351b39d9bdb900e9a1"
        "121f488a7fa0aee60682e7dc7c531c85ec0154593ded3ae70e4121cae58445d8896b54"
        "9cacf22d07cdace7625d57158721b44851d796d6511c38dac28dd37cbf2d7073b407fb"
        "c813149adc485e3dacee66755443c389d2d90dc70d8ff91816c0c5d7adbad7e30772a1"
        "f3ce76c72a6a2284ec7f174aefb6e9a895c118717999421b470a9665d2728c3c60c6d3"
        "e048d58b43c0d1b5b2f00be8b64bfe453d1e8fadf5699331f9",
        "095dcd0bc55206d2e1e715fb7173fc16a81979f278495dfc69a6d8f3174eba5a");
    TestSHA3_256(
        "2a459282195123ebc6cf5782ab611a11b9487706f7795e236df3a476404f4b8c1e9904"
        "e2dc5ef29c5e06b179b8649707928c3913d1e53164747f1fa9bba6eeaf8fb759d71e32"
        "adc8c611d061345882f1cdeee3ab4cab3554adb2e43f4b01c37b4546994b25f4dcd6c4"
        "97bc206865643930157cb5b2f4f25be235fa223688535907efcc253bcd083021407ea0"
        "9cb1c34684aa0c1849e7efe2d9af6938c46525af9e5afb4da6e5b83da4b61dc718672a"
        "8090549cbe5aadb44f5bc93a6b3fbdc2e6d32e2eaaae637465179ea17f23ad1e4f1ebc"
        "328e2c6dc90c302b74a1edbbb0676c136b269d70c41040a313af06ab291bf489d97009"
        "50b77f207c1fc41884799931b3bca8b93331a6e96b7a3f0a8bd24cdb64964c377e0512"
        "f36444bb0643a4e3ecb328194cd5428fd89ede167472a14a9bf5730aff1e3b2c708de9"
        "6eff1ebaaf63beb75f9c7d8034d6e5471e8f8a1f7efce37793a958e134619c19c54d3d"
        "42645f7a7263f25471fbaae8be3ea2fbd34ec6d7aacd7d5680948c3cd9a837c9c469a8"
        "8f600d95829f4d1e4e4a5ef4ed4623c07815a1c33d9fb3b91333ff04eac92806a68a46"
        "cf2e9293f8bff466ce87fe66b46fbff7c238c7f9b2c92eb2fdc7d8084167f6f4e680d0"
        "3301e5c33f78f1857d6863b1b8c36c7fce3e07d2a96a8979712079ae0023a1e3970165"
        "bfcf3a5463d2a4fdf1ca0e044f9a247528cd935734cb6d85ba53ceb95325c0eaf0ff5c"
        "d81ecb32e58917eb26bfc52dba3704bf5a927fee3220",
        "cb1c691c87244c0caf733aacd427f83412cd48820b358c1b15dd9fadee54e5af");
    TestSHA3_256(
        "32659902674c94473a283be00835eb86339d394a189a87da41dad500db27da6b6a4753"
        "b2bb219c961a227d88c6df466ba2fc1e9a2d4c982db4398778c76714d5e9940da48bc3"
        "808f3c9989131a07683b8c29d6af336e9aee1dfa57d83c48a86f17146edec07869bb06"
        "550689ebf4788159ed0a921048b4a6e3e3ec272413bec15d8e1f6a40897fa0e11d9df2"
        "23ef9fc270106249ae220fdc6ebdef6d6611805421ccc850f53ee9c836baf657a94005"
        "883b5a85def344d218264f07b2ea8714afcc941096c6ded0bb6bf5b8bf652fd15a2193"
        "1c58c9f526e27363ddff98c0a25bc7af9f469ab35bffea948b333f042cc18a82cec017"
        "7f33c3bdbf185b580353de79e51e675b03b31e195f19ba1f063d44def0441dc5282042"
        "6c2c61cf12974ec249fd3502f017ffa06220075ced7e2d6b86a52677ba3916e8e87260"
        "62aec5bc8ea1c18b1e4137680b2c9d002191b423bee8691bd7e0f93c3b9959bc1c14d5"
        "c5cbe8f7c9c336aa16e9de9faa12f3f048c66d04cb441eb2bbc5e8a91e052c0f900085"
        "6896f9b7ba30c1e2eead36fc7ac30a7d3ddfc65caaba0e3b292d26dfba46b5e2dc9bc9"
        "acadde1c9f52b2969299bd1281ddff65822b629cfba2928613200e73661b803afdcc4a"
        "817d9361389e975e67dfadd22a797bdaf991ddf42db18711c079ecec55925f9978e478"
        "612609bacd900172011c27e24bad639ffc24a23877278318872153aef6893ccb5b68b9"
        "4b33154df7334375aadd3edbb35272cc7b672dec68faa62900873ded52f6049891b77f"
        "2d0311a84b19b73660e09d1f1998095c1da1edecfa9f741b5fd6db048dd68255085d43"
        "529279021d59ed853470d6863b7c8e07fcb0d1e6acfb1eb16f7f60bb1f46ce70493010"
        "e57930a3b4b8b87e065272f6f1dd31df057627f4214e58798b664e1e40960f2789d44c"
        "cacfb3dbd8b02a68a053976711f8034c1ed3a8",
        "5ac9275e02543410359a3f364b2ae3b85763321fd6d374d13fe54314e5561b01");
    TestSHA3_256(
        "a65da8277a3b3738432bca9822d43b3d810cdad3b0ed2468d02bd269f1a416cd773921"
        "90c2dde8630eeb28a297bda786017abe9cf82f14751422ac9fff6322d5d9a33173db49"
        "792d3bc37fff501af667f7ca3dd335d028551e04039ef5a9d42a9443e1b80ea872fd94"
        "5ad8999514ae4a29a35f60b0f7e971b67ae04d1ba1b53470c03847a3225c3ddf593a57"
        "aed3599661ae2d2bb1cddd2fa62c4a94b8704c5c35c33e08e2debe54e567ae21e27e7e"
        "b36593ae1c807a8ef8b5c1495b15412108aaf3fce4130520aa6e2d3bdf7b3ea609fdf9"
        "ea1c64258435aae2e58a7b3abda198f979c17dbe0aa74253e979bf3a5800f388ea11a7"
        "f7454c4e36270a3083a790c77cbe89693205b32880c0d8f79b1c000ee9b5e58f175ba7"
        "696616c17c45673cff25d1221f899836e95cc9e26a887a7115c4537e65ad4eacc319ba"
        "98a9a8860c089cbc76e7ea4c984d900b80622afbbbd1c0cdc670e3a4c523f81c77fed3"
        "8b6aa988876b097da8411cc48e9b25a826460a862aa3fadfe75952aa4347c2effebdac"
        "9138ebcc6c34991e9f5b19fc2b847a87be72ff49c99ecf19d837ee3e23686cd760d9dd"
        "7adc78091bca79e42fdb9bc0120faec1a6ca52913e2a0156ba9850e1f39d712859f7fd"
        "f7daedf0e206dff67e7121e5d1590a8a068947a8657d753e83c7f009b6b2e54acc24af"
        "c9fdc9601a1d6d9d1f17aab0ce96c4d83405d1e3baba1dffa86ecccee7f1c1b80b1bbf"
        "859106ce2b647ae1e4a6a9b584ae1dfc0a4deebb755638f1d95dcc79b1be263177e2a0"
        "5c72bde545d09ba726f41d9547117e876af81bfc672e33c71442eb05675d9552df1b31"
        "3d1f9934f9ddd08955fa21d6edf23000a277f6f149591299a0a96032861ecdc96bb76a"
        "fa05a2bffb445d61dc891bc70c13695920b911cad0df3fa842a3e2318c57556974343f"
        "69794cb8fa18c1ad624835857e4781041198aa705c4d11f3ef82e941be2aee7a770e54"
        "521312fe6facbaf1138eee08fa90fae986a5d93719aeb30ac292a49c1d91bf4574d553"
        "a92a4a6c305ab09db6bbeffd84c7aa707f1c1628a0220d6ba4ee5e960566686228a6e7"
        "66d8a30dddf30ed5aa637c949950c3d0e894a7560670b6879a7d70f3c7e5ab29aed236"
        "cc3527bdea076fec8add12d784fbcf9a",
        "68f62c418a6b97026cc70f6abf8419b671ee373709fa13074e37bd39f0a50fcb");
    TestSHA3_256(
        "460f8c7aac921fa9a55800b1d04cf981717c78217cd43f98f02c5c0e66865c2eea90bc"
        "ce0971a0d22bc1c74d24d9bfea054e558b38b8502fccb85f190d394f2f58f581a02d3b"
        "9cc986f07f5a67d57ab4b707bd964ecc10f94f8cc538b81eeb743746c537407b7b575c"
        "ed0e1ec4c691a72eb0978be798e8be22b278b390be99c730896fdc69b6a44456be5ee2"
        "61366e8b1351cbb22aa53e45ec325ed2bca0bfeeebc867d7d07681581b6d56ed66ac78"
        "280df04053407a7b57561261dd644cc7b20f0a95709e42795b5402dd89fcb11746c597"
        "e0b650a008bc085c681bb24b17db4458e1effba3f414a883ddfc4bccb3ace24d922383"
        "9d4b3ca9185ad5cc24193134b9339b0e205a4cc0fa3d8f7a85b4230d1b3ee101fbae9e"
        "e14c2153da5f337c853573bd004114cb436ee58ab1648373ee07cc39f14198ac5a02a4"
        "dd0585cf83dfd4899df88e8859dae8bc351af286642c1c25737bf8712cb941cbbb741d"
        "540feb9f5d831f901fbe2d6facd7dab626bd705f2fd7c9a7a0e7a9127e3451af2ae850"
        "9dd7b79dce41c1e30b9dba1c38cb4861dad3ac00d68fa5d07ba591c1c3b9d6b7d6e080"
        "99d0572ca4c475240601decba894fa3c4b0ea52ed687281beee268a1c8535e283b1fc7"
        "c51aa31d5ec098c50fec958acdd0d54a49643bef170093a1102a1b3bf5ad42fb55ebaf"
        "7db07385eadcd6e66da8b7b6e6c022a1e3d01f5fccec86365d3014c159a3bff17d6147"
        "51b3fa0e8e89152936e159b7c0ea8d71cd4ffd83adae209b254b793f6f06bb63838a30"
        "3b95c85b4edfa4ddcca0ed952165930bca87140f67f5389d1233fe04f0a3d647050410"
        "c44d389513084ad53155af00de02cc7943a3b988d8e1454f85153aff0816e24b964ec9"
        "1dc514c588a93634ff3dd485c40575faa2f254abdf86fbcf6d381337601a7b1ba5b997"
        "19f045eb7bf6f2e8b9dd9d053ef0b3126f984fc9ea87a2a70b3798fab593b83a4ff44d"
        "9c0c4ec3e570ac537c10d9e3c4996027a813b70d7867b858f31f508aa56e7b08737070"
        "7974b2186f02f5c549112f2158c0d365402e52cba18fe245f77f7e6fbf952ec2dc3c88"
        "0b38be771caea23bc22838b1f70472d558bdf585d9c77088b7ba2dceaeb3e6f96df7d9"
        "1d47da1ec42be03936d621ecf747f24f9073c122923b4161d99bc8190e24f57b6fac95"
        "2ed344c7eae86a5f43c08089c28c7daf3aa7e39c59d6f1e17ece1977caf6b4a77a6ff5"
        "2774521b861f38ebc978005e5763cc97123e4d17c7bc4134c8f139c7d7a9a02646fef9"
        "525d2a6871fc99747e81430b3fec38c677427c6f5e2f16c14eee646ebf6eb16775ad09"
        "57f8684c7045f7826bc3736eca",
        "7d495ddf961cbff060f80b509f2b9e20bed95319eef61c7adb5edeec18e64713");
    TestSHA3_256(
        "c8a2a26587d0126abe9ba8031f37d8a7d18219c41fe639bc7281f32d7c83c376b7d8f9"
        "770e080d98d95b320c0f402d57b7ef680da04e42dd5211aacf4426ecca5050ca596312"
        "cfae79cee0e8c92e14913cc3c66b24ece86c2bfa99078991faad7b513e94f0b601b785"
        "3ddb1eb3c9345f47445a651389d070e482ea5db48d962820257daf1cbe4bb8e5f04a36"
        "37d836c8c1bc4d83d6eda5f165f2c2592be268412712ae324ef054bb812f56b8bc25c1"
        "d59071c64dd3e00df896924c84575817027861faa5f016c5c74142272daa767e8c9dac"
        "ee4c732ab08b5fa9ad65a0b74c73fb5a889169f645e50d70e41d689415f7d0b4ec071e"
        "9238b5a88110856fc6ae9b9944817e21597d1ccd03b60e60472d1e11d3e9063de24a7b"
        "59609b6a2a4ee68238690cf2800614746941c48af9566e07494f0dd236e091e75a8f76"
        "9e3b179b30c10f5277eec7b3f5c97337189b8b82bc5e717ff27355b2009356caa908e9"
        "76ae1d7f7a94d36202a8d5e03641aeac0e453a8168ee5a0858ceecfcbf11fb8c1f0332"
        "01add297a0a89476d2ea8b9a82bda8c3c7ef4f55c3295a4ecb7c607ac73d37eadc13b7"
        "a2494ec1928f7a80c8d534efe38a3d9ccb4ccdab9f092a1def6478532c5ad3cd5c259b"
        "3812600fa89e6d1e228114795d246cedc9c9fff0d1c1297a5ddfc1169c2efb3800df8d"
        "d18a8511214785abcc1bc7eb31bdb2f5f70358dfe860ed5a03ab7e95cc21df5ee7aee6"
        "8be568d6985e5c1e91408e4432663b1c4e6d613d6dc382b5b900a4fc1b7a9c27a1138c"
        "5e2356ab9026c34465006602753daf6ab7427da93c307c901d0bb1ddb21c53bc0493dd"
        "8d857161e8ffa51fdecb75568243205aa979c2e7ed2a77b5f8edc34cffb0321a8c653b"
        "c381f96ab85a86bf0bb2c9518208d636eac40aa7ad754260a75d4a46362f994c90173b"
        "975afb0ee17601311b1c51ba562c1ca7e3c2dd18b90bdebb1858fe876c71b3ad742c4b"
        "cba33e7763c750098de856fde8731cb6d698218be9f0a98298630e5b374957d126cf0b"
        "1c489c48bab6b50f6fb59ee28be6c3916bbd16514234f80e1ac15d0215852b87f9c6e4"
        "29eb9f85007bf6ae3de1af0202861fd177c7c4f51af533f956a051815815c6e51e25af"
        "20d02893e95442991f1de5f86a4397ae20d9f675657bf9f397267831e94cef4e4d287f"
        "759850350ce0898f2e29de3c5c41f4246fe998a8d1359a2bed36ded1e4d6b086820258"
        "43700fee8cab56703e342212870acdd53655255b35e414fa53d9810f47a37195f22d72"
        "f6e555392023a08adc282c585b2ae62e129efccdc9fe9617eecac12b2ecdabd247a116"
        "1a17750740f90ebed3520ceb17676f1fa87259815ff415c2794c5953f689c8d5407dbb"
        "d10d1241a986e265cea901af34ec1ded0323ca3290a317208ba865637af4797e65b9cf"
        "cad3b931bbf6ac896623e2f4408529172911f1b6a9bcae8279ec7e33452d0cd7b026b4"
        "6a99cbe8a69cd4d21cdc6d3a84002fab527c4fd18a121526d49890ced3fb89beb384b5"
        "24015a2e03c049241eb9",
        "b8d4b29b086ef6d6f73802b9e7a4f2001e384c8258e7046e6779662fd958517e");
    TestSHA3_256(
        "3a86a182b54704a3af811e3e660abcfbaef2fb8f39bab09115c1068976ff694bb6f5a3"
        "839ae44590d73e4996d45af5ceb26b03218ab3fef6f5f4ef48d22839fb4371c270f953"
        "5357b22142c4ffb54e854b64cab41932fe888d41ca702e908c63eae244715bfbf69f48"
        "1250f16f848dc881c6996e6f9d76f0e491de2c129f2a2ab22e72b04644f610a2fabc45"
        "aa2d7b3e5d77b87a135d2fd502ca74a207bddaf9a43e945245961a53c7bfcfe73a1ae0"
        "90e6606ffe8ddbf1e0f0d6d4fa94526578c6faf282dd592b10bf4bce00a7b184662569"
        "0623667e83b9b59b465d42c6944e224ad36698f5f2ee938404b7775c2e66207bc41025"
        "adaf07590312f398812d24c0178126fdd334964a54b8353482a83be17cf2ee52d23b72"
        "e5f57fe31eebf8a1a64742eb9459bcb0eca231a1658ab88b7056d8e47554f0a46058d6"
        "565c6cbf6edec45fdde6f051e38255b82493de27ffd3efbe1b179b9642d2166073db6d"
        "4832707420237a00bad7125795e645e5bc3e1431ecbabf0ff5f74416626322545c9662"
        "41cce6d8f2c035a78f100e030741f13b02a9eaf618d468bc40274db98bc342be12ad4d"
        "892c2ba546e571c556ac7cbf4e4c3fd3431efd40457cf65a297845dd8cce09811418c3"
        "cef941ff32c43c375157f6f49c2e893625e4b216b1f985aa0fd25f29a9011d4f59c78b"
        "037ed71f384e5de8116e3fc148c0a3cad07cb119b9829aac55eed9a299edb9abc5d017"
        "be485f690add70ff2efbb889ac6ce0da9b3bdbeb9dd47823116733d58a8d510b7f2e2c"
        "8244a2cbf53816b59e413207fb75f9c5ce1af06e67d182d3250ea3283bcbb45cb07ea6"
        "a6aa486361eb6f69199c0eb8e6490beff82e4ab274b1204e7f2f0ba097fba0332aa4c4"
        "a861771f5b3d45ce43e667581a40fee4bebe7fa9d87b70a5bb876c928f7e6d16ae604b"
        "3a4e9c7f1d616e2deab96b6207705b9a8f87468503cdd20a3c02cc8da43d046da68b5e"
        "d163d926a5a714a4df1b8ef007bca408f68b9e20de86d6398ad81df5e74d5aaac40874"
        "b5d6787211ff88e128cf1676e84ca7f51aee5951efee1915dcc11502a8df74fac4c845"
        "1dda49b631a8fb87470f0ebe9b67449bbd1640ceee6101e8cd82aa1033fa84f75b2845"
        "0e461b93f65da5c43759b0e83660d50961702bb1ad015dad42e600117475237cf6e727"
        "9d4a02d1f67cf59de0108355d03963e3d84ce7647173dd7d77a6b3f275d7de74236d7b"
        "bb2df437d536136dbe1dbe8f307facc7bc7d0cde1abf745cbeb81af1ab2c46138cf007"
        "e901f22668377958bcbbadb7e9905973b27ff0c5baaece25e974c1bd116cc81dd1c81a"
        "30bae86a6fb12c6a5494068e122153128313eb3e628d76e9babc823c9eb9d3b81bacfa"
        "7a6b372abe6b1246a350f23e2e95b09c9037a75aac255ef7d4f267cad3ce869531b416"
        "5db2e5a9792094efea4ae3d9ea4d0efdc712e63df21882a353743190e016b2166e4da8"
        "a2c78e48defc7155d5fdfc4e596624e6a19c91b43719a22c1204b1cefe05989d455773"
        "d3881fa8d3eefc255f81dfe90bd41dc6f1e9c265a753298a6e98c999acd9525a9db5f9"
        "f9456a0f51a93dd9693e1d9c3fa283f7c58a9c752afcaa635abea8dfc80e2c326b9392"
        "60069457fdad68c341852dcb5fcbbd351318defd7ae3b9f827478eb77306a5ae14cf88"
        "95f2bc6f0f361ffc8aa37e286629dc7e59b73a8712525e851c64d363065631edc1609f"
        "3d49a09575876a",
        "b71ec00c0fcc4f8663312711540df1cd236eb52f237409415b749ff9436dc331");
    TestSHA3_256(
        "c041e23b6d55998681802114abc73d2776967cab715572698d3d497ec66a790b0531d3"
        "2f45b3c432f5b2d8039ea47de5c6060a6514f3ff8fb5f58e61fd1b5b80524c812a46da"
        "d56c035a6e95ecb465ea8176d99b836e36f65977b7dbb3932a706d3af415b6f2549b71"
        "20ecb0db1e7d9e6f8df23607eda006436bccd32ef96d431fa434d9de22ca2608ab593e"
        "b50b4d6a57f45c1ce698c3283a77d330b876ad6030324a5c0693be7790a4bd26c0a25e"
        "b403531f37689829c20546d6dc97327131688b3d88766db8f5d1b22050450c37e53951"
        "446dd7155a3e6d7edcbe1354411d8f58154475d74008937e8ba48b706066c296d1a879"
        "36dd023ac8eebe7605a58c6c40da774cf9df189db0050adcf7629e66cbd1cf98243978"
        "34cb13c4066c26e6c8ec950b44fc1c8db8ef976a7ec8c4f4ec9849ca7a07f906223053"
        "b80db24b946b034ee7a30880d0ace348acba0d0ed21ea443816706a216ce9eb682d1fe"
        "9dfc1d2e0bf3b1449247413520b8d8ebc99fc298c6dca949be0ffebe450b9b79a387a6"
        "15d617b8d9da5b3e8d2776208c7cc2a11bdbc387f9d4597b380739b24ae59dcd5fb63b"
        "feefe0746d9266cfda18afa583d6891e483e6d5c0db305f5609beba75bb5b447ccac2d"
        "fb94ede4a94db6eaaf3070d8d5353f107f7bd74528eb913e0b19bed6236a3b48567c46"
        "a9eec28fb6486f92d0d09625452d8f4dd1b89c566533cc2326b820c2b9efed43be8481"
        "cb9ad809e47af7b31795cb0fbdb18fbb12e8853f8bacec366a092daf8f2a55d2911fc7"
        "c70ddd33d33e86c2c4ceeb9390ec506b399f6fa8f35abf7789d0f547fd09cb7e6fb601"
        "6a3fc2a27a762989ae620d234c810777d5a1bb633744af2844495d2963c986ef8540ca"
        "715bed7692c77b9dec90e06acc5986b47dd4a8d3ca3300b2bedf9f26ae6d1c7e7acef0"
        "5c0fc521c3309e1e70771eea6e96b67de5e3fb6833145bb73d46081b07453949830792"
        "9da779e003c27f0a171035458b8c7c86c905b23dda74c040878d5a05be94821537724e"
        "bd5608ec0754c3e3e99a719bbb6d5320eed07323fca637429b18378936364c389de1e9"
        "c6fce8af270a713b4b829b43e7d761e17724c22e84611e1322dde45cbee86a0e16d01c"
        "fb8910d99391c39afd8e5f5567c59f219aa8c19ad158f287cb6807ba1fe46d38d09163"
        "9a217766b3aa9ded73ac14570ba236225218305d68c0be6099c336ba8455c86b7c8c04"
        "542e729ceb84596c33ca6eb7ec1091b406cf64495ccfa2169f47b3b590477d4073537c"
        "14c05015d51ba527b3869ae4ebd603df906323658b04cb11e13bc29b34ac69f18dd49f"
        "8958f7e3f5b05ab8b8ddb34e581bde5eb49dd15698d2d2b68fe7e8baf88d8f395cfcaf"
        "cdff38cf34b59386f6f77333483655ee316f12bfeb00610d8cba9e59e637ca2cab6ed2"
        "4dd584143844e61fcca994ba44a4c029682997ab04285f479a6dc2c854c569073c62cd"
        "68af804aa70f4976d5b9f6b09d3738fcccb6d60e11ba97a4001062195d05a43798d5f2"
        "4e9466f082ac367169f892dfd6cc0adeef82212c867a49cba65e0e636bab91e2176d38"
        "65634aa45b13c1e3e7cdb4e7872b2437f40f3de5493792c06611a9ca97d0baed71bfb4"
        "e9fdd58191198a8b371aea7f65b6e851ce22f4808377d09b6a5a9f04eddc3ff4ef9fd8"
        "bf043bb559e1df5319113cb8beea9e06b0c05c50885873acd19f6e8a109c894403a415"
        "f627cd1e8f7ca54c288c230795aaddde3a787c2a20ac6dee4913da0240d6d971f3fce3"
        "1fc53087afe0c45fa3c8f744c53673bec6231abe2623029053f4be0b1557e00b291ebb"
        "212d876e88bcc81e5bd9eb820691dca5fbdcc1e7a6c58945a2cac8db2d86c2a7d98dc5"
        "908598bda78ce202ac3cd174d48ad9cac9039e27f30658eef6317cd87c199944343e7f"
        "ce1b3ea7",
        "ad635385a289163fbaf04b5850285bfe3759774aee7fd0211d770f63985e1b44");
    TestSHA3_256(
        "01ec0bfc6cc56e4964808e2f1e516416717dad133061e30cb6b66b1dc213103b86b3b0"
        "17fa7935457631c79e801941e3e3a0e1a3016d435e69a390eaac64f3166d944c8eb8df"
        "29fe95fdf27adc34631e4a1f3ff1d5af430f3d6f5908e40c0f83df1447274dfe30bbe7"
        "6b758bd9abb40ed18331c7552dcc6959a1303e11134ec904bd0aab62de33c39703b999"
        "20851afd9d531eeb28f1c4b2e6c17c55db8296320316fbe19e881b5fcb4d266c58ca7f"
        "31d9176e26f70315330b58a516ec60d10404a78393aa03ced7acd225cb2a83caf3ab58"
        "88406a69a534f1ed1346e9b5e68831f90b872d57367361191c803eb7e38b3b9cd60128"
        "2d5efdbf082db07d89bd06b093f986d08d3a7b12aa74513b6eb241b26ebf31da5726d5"
        "9e315d1b4ee53ec6a9fdb6583bacc136e90e9607cab01e5d3853ab9727ede706b6f10b"
        "4e04d0510f45c0abc515bcb5ed0bcce86a92861126f4d502fcb8f988d62ecf9d124853"
        "de2bab633f9506c6fde8a36cd4413cf773e50f7b2d283482f18e2f547c2fc275cd6005"
        "6ed98fb8d0816fd777c1566f0c2ae3b1cd92e344910a75e006106d193e06f7786ae37d"
        "d0e529cacf74176fd4cc1f6500549af5902dbbd56a70c194f5b671372edec425f90add"
        "40b4eb3d55123f3ab62797ad25bf5eecf4f417f86b00e6f76a4f52e44fd949851aae64"
        "9dd0d26d641d4c1f343c7a2c851ca7851bbbdfd57ed6024eabc518a909a1e4689ea7bc"
        "5f83e19872950368a06e93ab41944c3d8befc5705b814e5f33511a7f7ea8a4771c804b"
        "321a3a3f32c18fa127d3c9e6c011337dc100ceb156ed45d0a62f238dacac44a3429f89"
        "bb7f98d09043c42451106e30471cc6fab7a4e1ce0a8202772b0218b631f287ec3ef82b"
        "1aa6299a0b54d6aad06aa9346d28f117d20f3b7f0d462267bd3c685cca8f4584532dfe"
        "e0e8b9bacefa3092d28fcce7953a28f82e4ba6b3a1430ecca58b770dab656bed1b2246"
        "63e196dffc28c96a2c65ef9de1989a125ecf2fed47eb96bef8a636a91bd521c47aeb8b"
        "c011bf81cc688fd8b620446353cbf7692201b5552cb07fb02eb3954dfaa6f5c31bf91e"
        "20b84419dcbbdaba0c31a124d8f4218b2f88da3eba44dbe40eb290052538dccd0ff767"
        "0de5f33a83ff74895b66adcff58c9c21e93b31bb49ccb2e026995ee155b5517b72daa7"
        "6526a2e42aa6fa94357cd42e2a8a1d3e7d4cefc33d5d07d6303d798d2551a21f862b5f"
        "492d0c7cf078a77007a02847b34675dfad4fb457e9f20dc5750fb127a3c31b9d6a3996"
        "d50ac3ffc6ef29cca1d8414d0438bf3271dc4f4e00cfe19a507b447dc310f74aeb2a3c"
        "0b3fae6d7d13f4935bc72c35df3efa6e879164421505ee32d93b030e32a7970b53430b"
        "1643855167278e5058c4a48a7840e2fcdb282e45b5b86c0b2756f19b595f3bcfc926df"
        "35e33ac26dd1e88cd394015a5f54deb4c9f4a0bef0eabcb27c4eb88dc2302f09e92f1b"
        "cc4b4754df1eeb536154543c7dbf181c9979fe6ed08311e5a3acf365ebb5745212b263"
        "0e83b3a5bd5fa4834c727248b165700c7435f8cb6ee455bad16ee0da68fe6acd2062da"
        "e9c8bc178b157b29ade98a9bbbd4c723a3dcb7852c7978b488e4f73a2c9163dbdffae1"
        "75119f812b6f4b70c2b498704bc2b58603f167f277a74e64ec296a6dfdb0de3486c0f3"
        "6ac1b55f80af9fc817ba4f84b898b2a3c5725e2faf466bb26a8a84f91e123d182033a7"
        "ae2029236aa4b673ceb50c1733d7edd60e3f119b7141c882d508e0331689c96fbfb9f7"
        "e888fe88561de427c721123036737c1460b0da00d3f958b948f68fcb321ab4e297290f"
        "781ff8afb06b755d82a7e6ce1963761d799eed786524bf19801b4877b2d856becdf7e8"
        "7d71aa359f2d51f09de64bcbf27d0c3aceac70790e314fd06c2f5216f3d10574b7302d"
        "6bc2775b185145c1b741524567c456d42c5826f93afa20ae7196ca7224c3b69b1eada9"
        "eee752fb6d43f24170fcc02af7e1dea73f0f884f936f900165800acb9d57480a31e409"
        "d3f676ed92b6812cf182a088fc49d68082aa19c7be0711f436db1d7be44d97dc940559"
        "1a8d3e7f6f731c6f3e6c401749829b7624497f5eeac1fc782e7d6988340541f2617a31"
        "7e",
        "2a6283b1c02c6aaf74c4155091ff54a904bb700077f96a9c4bd84e8e51b54d01");
    TestSHA3_256(
        "9271fd111dcf260c04cf4b748f269ac80f7485c41f7724352a7ed40b2e2125b0bf30f3"
        "984ee9d21aab6eb07ec976b557c2426e131ad32bd0485aa57172f0e4f1798760f83520"
        "67ac023fbeca7b9c8bf5851c724e90ffff44195b44ae73c9c317c85e8e585bddac6d0f"
        "2abf812d02e44b62eadb9d0765683aa56af8e9b91588c7b49dc3e146866a02dc18f9ca"
        "680f88006094ef29096c2d5af5700b4aca3dfcab462c48bb8085691671efb5ceb22b3e"
        "bd8702f71a1d7c184b1053c3fa30a7e76b85f3650d9140714fd4993bb496becf2ae01d"
        "3a98ccfdefb6fefd692173bd11af7adb61ffff214a550ffcd3a5993004ee72cb02ca9c"
        "577b42c85444e619e6411e2bca86bb548ebbd12a02c5c945eaa3b246f595d817f38498"
        "75429e72ac894160a2a91a6617f18e6b2b9258472152741d62843cebc537d25f0daebd"
        "edb410d71ee761662bd1b189ca1c93d648b5d141d8d05e3f2b2d8c2c40997fea7eb7e2"
        "cc0000d8b2300936759704ef85f38ad0d08a986de6bfd75b5be3209f6d4d3f67e7adf7"
        "f8469d47e81979ec8dae7127b5eadcc09779cf4b0a28efaaf58e83d307f2ced4a8699b"
        "142f3f19db5598e914e9577652c63f851203580d40699548fc2ab30a9dcf6452f673ad"
        "1ed92f8d84dad5dfff55e18107b3acb6e4e8e3c9c34038f40a5c577fe9771c2c31ef03"
        "d36a00e04a20d2d0877db66f091dac4b741d2a997b75182702881f9284fa23b9b3c20e"
        "715f80d07b9910a4b3185f9489dc7d3fb510f4da273559753d7d207f3975b48df2e7c8"
        "57caffe703dfac53a786490c09f57d2fa93f60810186df4c0b6b616a04caab9f70a500"
        "2c5e5d8da0ed2805f20fbf89cd8d57ca2b4bd37125ce38bf09fb6170ae21f4e6043a94"
        "83ef6e585756d97cfb778e57bc7ddc8dfc54d086d6bcfa1f019c749ff79921ec56e833"
        "ff8660f0959cd4b5277e9f3b1d4880193fefa98a6c2512718e7c139acdcd324303db3a"
        "db70348d09b058baf0e91d52b24952f832b0a3b81fa9bc9a2e9fb276a64e9e0922778b"
        "4992d892f6845b4372a28e47d27b53443586d9015463cacb5b65c617f84e1168b15988"
        "737a7eda8187f1f4165fecbdd032ae04916cc4b6e18a87558d2ce6a5946c65a9446f66"
        "cda139a76506c60d560f56a013b508d6ccbbaa14e24ad0729dd823bf214efcc59e6932"
        "cdc860306687c84a63efb551237223641554940a7a60fa7e6ddad64a21b4a2176b046d"
        "c480b6c5b5ff7ed96e3211df609195b4028756c22479ba278105771493870372abe24d"
        "cc407daa69878b12b845908cf2e220e7fabeeaab88c8f64f864c2bacba0c14b2a693e4"
        "5aacc6b7db76bc1a2195cfce7b68f3c99440477ea4c1ea5ee78c109f4f1b553c76eb51"
        "3dd6e16c383ce7f3187ad66c1d5c982724de8e16299c2fde0a8af22e8de56e50a56ac0"
        "fef1c52e76864c0ad1eeedd8907065b37892b3eca0ddcdf5c8e0917dec78fedd194ea4"
        "b380a059ccc9452e48a9eba2f8b7a4150b7ba17feac83c61604c3cfcfe6655c2be37ef"
        "0ae6fc29072f9b1cfb277b64a8d499dd079ad9aa3d5e9a7ccbec8c100596c6fac51e13"
        "a260d78d8cd9066edc558e2219cfcda1310dc1fbbdd36f348756855349f33eb6b82186"
        "a8c1a55f361305833edd3e4ac8d9b9cf99897c4e06c19ed10765fd0c8c7433851445c5"
        "f87b119ef913b2bcdbf7aa2ad19c672e53a9c6c3c309d549513edd7c1cf8a0a399e6df"
        "0939cc1fb146d6ad460e2ce05144c69eafa3822141d473fbe5927c58a50c1e842f8b8f"
        "ad85540ce9f6d06f7b4dea045248b999d24c5fd4d75631caf73518cc08f73684e2a1cd"
        "4266235d90c08a0d0ce8784c776fd1b80978b83f0705ba8498744884d5496b791f2db3"
        "ffb5377175856b25a643803aa8b9e7f1055e089c1929cf0cbba7674c204c4590fb0769"
        "68e918e0390d268eeef78c2aebcbf58a429f28212a2425c6ad8970b6a09cadddd8336d"
        "519bca4820556d2c4b8cd9f41216de3c728a0774edf47d3489cd29cf1b2a192bc53325"
        "d0bed7d23e51be7684297f9d0ecb14acbf648bc440c5fde997acc464fb45e965e6f0dc"
        "ed6d4568ebcd55e5a64633b05a2cb4d8263b721a252b1710dc84d8a5d4b43fcc875e2e"
        "7281f621b0bf8bb3465be364456bcd990b26b3e474486f864fb85f320f68bc14c37d27"
        "1249b18552bef50dfc385a9f41b831589c5a716357cf5a12520d582d00452a8ab21643"
        "dd180071d2041bbc5972099141c6292009540d02f3252f1f59f8dfcf4488803f3b0df4"
        "1759055559a334e68c98ea491b0984f2f82a35db84ea0779b3801cf06b463a832e",
        "4e75bf3c580474575c96ec7faa03feb732379f95660b77149974133644f5d2a0");
    TestSHA3_256(
        "075997f09ab1980a3179d4da78c2e914a1ff48f34e5d3c2ab157281ef1841052d0b45a"
        "228c3cd6b5028efd2d190d76205e1fdf4cec83c9868fe504f429af1e7c5423267c48a7"
        "b5bc005f30a1980147a3fae5c100b95c7cb23d43af9f21d87311d9cc826598993e0770"
        "15f59ebc476383bb7a78787d915c97039ab188a2a618f7a8d7f64542ba787e9dd7d48c"
        "4c87d2aaea068c1b00c9711b2812901673c11418096d0a850fb36b0acece56d311689d"
        "feceb0835009adc427f6d2d6b05ed26f5a43b6478bc72c1f914a2202dbd393cb69b1a1"
        "e78162e55ca4b3030ac0298131a7a0d934c032cc9dfc5afa600c59b064d2d9013f15d1"
        "184278a8ccb5ad9d7563e666fe5a8c173cec34467ef9cf6d6671208ff714741fee7c8d"
        "1d565edf82570dffde4f3f584024142056d8548ad55df83d1babed06141114c95ac88d"
        "bea0ce35d950f16d8a732a1ea7d22dfaa75a3e0410c546523277261116a64bcbb2be83"
        "e55e040f6c8c79f911b301a8718cc4b19a81d5f0cb6312d87c5b4b079e23a61d247541"
        "cfc2c41a37f52b2c6e43a3db5dc47892d0e1feabcc5c808f2391791e45fb065159f99c"
        "1d8dd2f69baaf75267eb89dd460f1b6c0badb96cbbc8291cefa370fa7ad6997a4ca2b1"
        "fe968216032f02f29837d40215fa219c09161df074e1de8e37056e28c86d1f992a651e"
        "271dfc4b0592ad481c613fd00c3eea4b6deabb9f5aa63a4830ed49ab93624fa7b20896"
        "6eccb1f293f4b9a46411f37d7928e4478dde2f608d3851a8efa68e9d45402bc5124fde"
        "4ddc0f83ef82b31019d0aacb4b5121bbc064c95c5292da97981f58f051df9502054bf7"
        "28e9d4fb7e04787a0890922b30a3f66a760e3d3763855e82be017fa603630a33115a02"
        "f02386982001def905784f6ba307a598c6dbaf2946fe9e978acbaf3e4ba50ab49ae8e9"
        "582520fc2eb6790deafc77e04a8ee75da92d16f0d249403112c74bc09102b573e110cc"
        "b4d8461d249bfe2e85fc9770d606be6fbfd5ec4c30ac306d46412f736e5b696ccc9fbe"
        "4adea730955c55ea5c63678271d34b7bd6f6340e72626d290820eeb96a0d2d25ea8136"
        "1a122ffe8e954cf4ff84f4dafcc5c9d3e7c2ddbdf95ed2c0862d3f2783e4566f450ec4"
        "9e8b01d9d7bf11e92a7903f2b045c57ed8a65ccbfc5b1d2a38e020a57b38f2e4deea8a"
        "52354a7e7be4f977b8f5afe30f6738e955c8bda295064586b6827b245766b217fe3926"
        "3572b0850965c7ae845611b8efb64c36244a39b9fed0ab970ee5ddeb8f2608dd9c9635"
        "24a14050c9101d7f2d5537b24d0b0f7a45703c1e131656ec9edc12cdf71dae1cde2790"
        "b888ef2a589f03201f8bbfad71f0c4430477a6713ad2e50aaefa1f840cbb839e277389"
        "454517e0b9bd76a8ecc5c2e22b854c25ff708f9256d3700adeaec49eb2c4134638ee9b"
        "d649b4982f931ec3b23cc819fbc835ddcb3d65e04585aa005e13b7ef8fcafa36cc1a2c"
        "79ba6c26fc1dc0f6668f9432c578088cd33a41a778ac0b298fcac212edab724c9fb33d"
        "827409fd36bc4b2b0e4e81006fd050d94d3271e0427c61e9ddca599a3c9480cfdd3360"
        "3cb1a196557281ce6a375fef17463893db293dba0704d4bfda25e08beadd4208c58ea0"
        "d8d9066448910b087fc13792fc44075a3fe42e13c5792f093a552aa8ebe0f63e7a8071"
        "02d5bc145468a0cb469263035c5647049054c18199f7da6d6defd51105e2125c605e32"
        "7aca137ca85e3f7f46ca69f92d5252f84418293f4e9afeeb067c79576e88cc3c64f3e6"
        "1d76e1e9e2f72cdfc35261a9679f0c374d7436ff6cfe2ba71650810522fa554a4aded8"
        "7ad23f0b206b1bc63f56bbff8bcc8849d99e209bd519a953f32c667aa8cd874ad99846"
        "ed94b92f88fe0dbf788c8431dc76ca9553692622077da2cdea666c1b3fee7c335da377"
        "37afccd3d400a23d18f5bd3784dbcd0663a38acb5a2beef03fc0a1c52ee0b56bda4493"
        "f2221e35bee59f962f16bc6781133204f032c7a6209dd3dabd6100325ec14e3ab0d05a"
        "add03fdfe9f8737da15edab9d2598046f8c6dd8381aaf244821994d5a956073c733bce"
        "bf9edbc2a6e2676242dc4e6a2e4ba8a7d57ed509340d61fae2c82bee4dedc73b469e20"
        "2cc0916250d40a1718090690a1d3b986cf593b019b7b7f79ae14843b2e7ccf0fd85218"
        "184f7844fbb35e934476841b056b3a75bf20abb6866e19a0614e6a1af0eee4de510535"
        "724363b6598cccf08a99066021653177559c57e5aaff4417670a98fe4bd41a137c384f"
        "98c0324c20ef8bc851a9b975e9440191ff08deb78c9fa6fc29c76b371a4a1fa08c30fc"
        "9d1b3323d897738495086bfd43ef24c650cfa80c42ecbadc0453c4437d1a11b467e93c"
        "a95fbae98d38dcb2da953e657fb7ea6c8493d08cf028c5d3eb0fcbcb205493f4658440"
        "719e076e02deb07332d093e4d256175ca56f4c785d5e7e26c6090a20429f70b3757daa"
        "c54153bc16f5828dc6c1c9f5186e2117754be5f1b46b3631980d9e4a9a5c",
        "2e07737d271b9a0162eb2f4be1be54887118c462317eb6bd9f9baf1e24111848");
    TestSHA3_256(
        "119a356f8c0790bbd5e9f3b4c5c4a70e97f462364c88cad04d5435645342b35484e94e"
        "12df61908fd95546f74859849b817ee92fbd242435c210b7b9bfbffb3f77f965faa1a9"
        "073e8feb5a380f673add8fde32208402fa680c8b3e41d187a15131f1028f9d86feaf3f"
        "d4b6e0e094d2ba0839c67267c9535173ec51645343ad74fcfaae389aa17cca3137e258"
        "8488531c36ba2b8e2f2238d8415c798a0b9a258f1e3cef605fa18977ad3d6707c3ecc5"
        "ea5f86ebdaa4b4b0e5bc023d1bc335138ae0de506cb52f2d9efa0ecc546468310cccc8"
        "8ec08d28c3602e07257f41bb7e4d8a0956c564f3712761d199a931a39e69c5a69aa7b3"
        "257931dd92b91e4ed56fbf64e48bd334945cfa2aaf576df04614eb914899f7df54db40"
        "12cc8261b12bedcab69876feedbbf7009dcf8d076af89b797ad71217d75cf07514dc07"
        "ae34640055c74c9faf560f491f015ac3e167623cfbc67b8e7163e7c1b92debd06e9d28"
        "b049e0298f4c38395a40a0778162af2cfe5abe5b946c4d9a54f2a321660ab521068c49"
        "57cd3f5be0324cc04f50f209fdea7caaa0ac705c1fb30abfa550e844f509074afde1ee"
        "87adda29aa09b7f93e7d064ad2715ee5571ee6e7c9a01672124cc2a22b4354c3844759"
        "c1a6ce3fdf17555cac7df73334073ef3730939410fe6cf37463352ad241958b7fafbc6"
        "6e0d592df48bf55ab2c33428e494c6995826892572d9ab52747b1085fcbef318cfe9cf"
        "acd4cd80c164fba584c1344ae7e321c4f77b44db6b322f2f7831f4d4ede7dc407b065c"
        "6754cf4424f9903adb4c6b675ded58700bc36da83fd95e84e76c404f7342921ef23d7d"
        "07772f5b8ec2f077601cae13448385b04e074f895574be61a831a87efd68a1f6aa67cf"
        "291847fa8f74cbe3b4a78ad780895183bc51c30ad2514255d4e013abc097bc8103c0b1"
        "933b0b303341836ae167c1e31dfe5f1b791cb06ef29cae398065343eecf06e4ae2048d"
        "1547c4bf69ccec5e86c45867c633c62f7d27dc51234b6debb5b9f80a5810716240c644"
        "43d0c098c80220d0520a5f5834369b9eb019325e23e88f237c24440bf27959caf7e7e4"
        "f1671fda710630255a2962f7e9b3625dc243a0177aacf6a758a68aa85dc3f56181a4a5"
        "9a406c7fae5575c9e2c64248f520b5a5f904821661e2e43a5a058f445fd0e55b07476c"
        "4122d18033053b45112201e0bfdcc9e7cb9931155018ca431a0564930aca8defbca954"
        "b2680753a4060bec2cb668d2c15e77cba29589b5c7c07bc7177a8b1adb3a6968732f92"
        "13476fd96901514626fa17243af1d156cd037eea81d773f1f71a018d942b524b851794"
        "b300c7591ecd783ec8066ccb261bdf9b7a183dbda42b92593b614297dcb0fabcc23ae6"
        "9797d0251b8ab57a4da2a544615216b01f4dbe2d8c9b5520c7ed9cd9312e9ec6d05a36"
        "e7f693d1821d727518169b03976394b9d1e1d7fa2daa25529d391eb5d0cf0f07a8160b"
        "e2ee043d9345037c655c4f2023689f14d8d2072dd92c1dba056a5b5d4c4fc4196e25ca"
        "ab05b1701ec666ac9a04d90f7d7575a7ac3970252c18fd3bec0cc448e5ff8f3765d546"
        "a4a8ad1d41a9640c79375b80534b7b50989976f238654fefea981c9413130beae943a3"
        "e9d8f64ce9256d1259d1b2a6b3c02ca5af1a701db8f25a4e9c255dad8785172f323728"
        "c3585a45206ae988c283e30a2f9ea9b47f07a7521b0f36e9c504c14bd96027e8d24161"
        "e70f196576d8a74a5e9c26acda7cc452a90e550e625a49e50829db70de808c827c67d0"
        "0c23ee073d4e72aeed891dd73b86acd6756e753e3975a80cdab1d521052caef6a5380f"
        "8b03023ba0326a6928aa127ffb33b51dcb05bbdd592d0ad9e8321e6ef2f95c401be6a3"
        "7e634425689fe7750e2a0fe05ad89001502b309095ca517b2e2ed0388b9f2c59c45feb"
        "61222539d6e1ccd397344d23708aebacec10ada96a7711f173f7ff1e4b94fceec6a0a0"
        "ea5d814a4581b412063012ff6ac5527b8314d00326b68c2304a276a217fde9fa403475"
        "0a2e47e10f816870d12fc4641a27a1c16c35a953f32685f2b92cae0519848045765591"
        "c42ddc402dc7c6914d74dd38d2b5e7f35358cb1d91a9f681fde7fd6c7af5840663525e"
        "e1d04bf6d3156fed018c44043d95383d92dada3d1cd84af51d9bee814ec8675073e1c4"
        "8632c5f59e257682542e1f7dc20b56b5c92a9e2cb2be30cb1512fb55fa1de99a3f5864"
        "ed3acc19d79e6ffb0da3b08ba0615157747d75c1f308fa0202a4086f34e9eafa3e071d"
        "fbacaca731d228aa0304cf390c0a9e6ad7ce22ade758965cfbfc4c9390d24e41a66744"
        "7fc7b29821464ad98bc5d65dc7f9c42bd4b23e174015592ff92c905660a2722f9fc797"
        "3d3cdad848ef88bf02b1b03dea16699b71dc46b35bc4d96069a0753335ae38685d2449"
        "18e30c5fb0d45283a1281c1659ea591573999d9c2acd2ca9141d55230d41011b70748b"
        "518e1cd2fa58ad8dc05fcbdf0bffaf2c7fd6cb2ac67bb13b8f6d31fad64ac113664223"
        "599dca411270955c95aec06518894dabc352d2b70984727437040d944da7b42e0ef560"
        "ac532de3e4a4891e8509c275b51ed780f8660b0354e12c21b3e11bcc88198980b5f7ff"
        "31ad342182d5a933373164dced3cfb2a081720d7eee676cb7378a3e19326a7ee67fd6c"
        "00521f9de37c66bcea814b6feb6a061b8cdcf7b4bd8f45d48602c5",
        "c26d0b064e409df64819cd7c1a3b8076f19815b9823adac4e3ce0b4d3a29de18");
    TestSHA3_256(
        "72c57c359e10684d0517e46653a02d18d29eff803eb009e4d5eb9e95add9ad1a4ac1f3"
        "8a70296f3a369a16985ca3c957de2084cdc9bdd8994eb59b8815e0debad4ec1f001fea"
        "c089820db8becdaf896aaf95721e8674e5d476b43bd2b873a7d135cd685f545b438210"
        "f9319e4dcd55986c85303c1ddf18dc746fe63a409df0a998ed376eb683e16c09e6e901"
        "8504152b3e7628ef350659fb716e058a5263a18823d2f2f6ee6a8091945a48ae1c5cb1"
        "694cf2c1fe76ef9177953afe8899cfa2b7fe0603bfa3180937dadfb66fbbdd119bbf80"
        "63338aa4a699075a3bfdbae8db7e5211d0917e9665a702fc9b0a0a901d08bea9765416"
        "2d82a9f05622b060b634244779c33427eb7a29353a5f48b07cbefa72f3622ac5900bef"
        "77b71d6b314296f304c8426f451f32049b1f6af156a9dab702e8907d3cd72bb2c50493"
        "f4d593e731b285b70c803b74825b3524cda3205a8897106615260ac93c01c5ec14f5b1"
        "1127783989d1824527e99e04f6a340e827b559f24db9292fcdd354838f9339a5fa1d7f"
        "6b2087f04835828b13463dd40927866f16ae33ed501ec0e6c4e63948768c5aeea3e4f6"
        "754985954bea7d61088c44430204ef491b74a64bde1358cecb2cad28ee6a3de5b752ff"
        "6a051104d88478653339457ac45ba44cbb65f54d1969d047cda746931d5e6a8b48e211"
        "416aefd5729f3d60b56b54e7f85aa2f42de3cb69419240c24e67139a11790a709edef2"
        "ac52cf35dd0a08af45926ebe9761f498ff83bfe263d6897ee97943a4b982fe3404ef0b"
        "4a45e06113c60340e0664f14799bf59cb4b3934b465fabefd87155905ee5309ba41e9e"
        "402973311831ea600b16437f71df39ee77130490c4d0227e5d1757fdc66af3ae6b9953"
        "053ed9aafca0160209858a7d4dd38fe10e0cb153672d08633ed6c54977aa0a6e67f9ff"
        "2f8c9d22dd7b21de08192960fd0e0da68d77c8d810db11dcaa61c725cd4092cbff76c8"
        "e1debd8d0361bb3f2e607911d45716f53067bdc0d89dd4889177765166a424e9fc0cb7"
        "11201099dda213355e6639ac7eb86eca2ae0ab38b7f674f37ef8a6fcca1a6f52f55d9e"
        "1dcd631d2c3c82bba129172feb991d5af51afecd9d61a88b6832e4107480e392aed61a"
        "8644f551665ebff6b20953b635737a4f895e429fddcfe801f606fbda74b3bf6f5767d0"
        "fac14907fcfd0aa1d4c11b9e91b01d68052399b51a29f1ae6acd965109977c14a555cb"
        "cbd21ad8cb9f8853506d4bc21c01e62d61d7b21be1b923be54914e6b0a7ca84dd11f11"
        "59193e1184568a6134a6bbadf5b4df986edcf2019390ae841cfaa44435e28ce877d3da"
        "e4177992fa5d4e5c005876dbe3d1e63bec7dcc0942762b48b1ecc6c1a918409a8a7281"
        "2a1e245c0c67be6e729c2b49bc6ee4d24a8f63e78e75db45655c26a9a78aff36fcd671"
        "17f26b8f654dca664b9f0e30681874cb749e1a692720078856286c2560b0292cc83793"
        "3423147569350955c9571bf8941ba128fd339cb4268f46b94bc6ee203eb7026813706e"
        "a51c4f24c91866fc23a724bf2501327e6ae89c29f8db315dc28d2c7c719514036367e0"
        "18f4835f63fdecd71f9bdced7132b6c4f8b13c69a517026fcd3622d67cb632320d5e73"
        "08f78f4b7cea11f6291b137851dc6cd6366f2785c71c3f237f81a7658b2a8d512b61e0"
        "ad5a4710b7b124151689fcb2116063fbff7e9115fed7b93de834970b838e49f8f8ba5f"
        "1f874c354078b5810a55ae289a56da563f1da6cd80a3757d6073fa55e016e45ac6cec1"
        "f69d871c92fd0ae9670c74249045e6b464787f9504128736309fed205f8df4d90e3329"
        "08581298d9c75a3fa36ab0c3c9272e62de53ab290c803d67b696fd615c260a47bffad1"
        "6746f18ba1a10a061bacbea9369693b3c042eec36bed289d7d12e52bca8aa1c2dff88c"
        "a7816498d25626d0f1e106ebb0b4a12138e00f3df5b1c2f49d98b1756e69b641b7c635"
        "3d99dbff050f4d76842c6cf1c2a4b062fc8e6336fa689b7c9d5c6b4ab8c15a5c20e514"
        "ff070a602d85ae52fa7810c22f8eeffd34a095b93342144f7a98d024216b3d68ed7bea"
        "047517bfcd83ec83febd1ba0e5858e2bdc1d8b1f7b0f89e90ccc432a3f930cb8209462"
        "e64556c5054c56ca2a85f16b32eb83a10459d13516faa4d23302b7607b9bd38dab2239"
        "ac9e9440c314433fdfb3ceadab4b4f87415ed6f240e017221f3b5f7ac196cdf54957be"
        "c42fe6893994b46de3d27dc7fb58ca88feb5b9e79cf20053d12530ac524337b22a3629"
        "bea52f40b06d3e2128f32060f9105847daed81d35f20e2002817434659baff64494c5b"
        "5c7f9216bfda38412a0f70511159dc73bb6bae1f8eaa0ef08d99bcb31f94f6be12c29c"
        "83df45926430b366c99fca3270c15fc4056398fdf3135b7779e3066a006961d1ac0ad1"
        "c83179ce39e87a96b722ec23aabc065badf3e188347a360772ca6a447abac7e6a44f0d"
        "4632d52926332e44a0a86bff5ce699fd063bdda3ffd4c41b53ded49fecec67f40599b9"
        "34e16e3fd1bc063ad7026f8d71bfd4cbaf56599586774723194b692036f1b6bb242e2f"
        "fb9c600b5215b412764599476ce475c9e5b396fbcebd6be323dcf4d0048077400aac75"
        "00db41dc95fc7f7edbe7c9c2ec5ea89943fe13b42217eef530bbd023671509e12dfce4"
        "e1c1c82955d965e6a68aa66f6967dba48feda572db1f099d9a6dc4bc8edade852b5e82"
        "4a06890dc48a6a6510ecaf8cf7620d757290e3166d431abecc624fa9ac2234d2eb7833"
        "08ead45544910c633a94964b2ef5fbc409cb8835ac4147d384e12e0a5e13951f7de0ee"
        "13eafcb0ca0c04946d7804040c0a3cd088352424b097adb7aad1ca4495952f3e6c0158"
        "c02d2bcec33bfda69301434a84d9027ce02c0b9725dad118",
        "d894b86261436362e64241e61f6b3e6589daf64dc641f60570c4c0bf3b1f2ca3");
}

BOOST_AUTO_TEST_SUITE_END()
