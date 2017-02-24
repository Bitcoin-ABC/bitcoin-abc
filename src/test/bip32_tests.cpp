// Copyright (c) 2013-2015 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <boost/test/unit_test.hpp>

#include "base58.h"
#include "key.h"
#include "test/test_bitcoin.h"
#include "uint256.h"
#include "util.h"
#include "utilstrencodings.h"

#include <string>
#include <vector>

struct TestDerivation {
    std::string pub;
    std::string prv;
    unsigned int nChild;
};

struct TestVector {
    std::string strHexMaster;
    std::vector<TestDerivation> vDerive;

    explicit TestVector(std::string strHexMasterIn)
        : strHexMaster(strHexMasterIn) {}

    TestVector &operator()(std::string pub, std::string prv,
                           unsigned int nChild) {
        vDerive.push_back(TestDerivation());
        TestDerivation &der = vDerive.back();
        der.pub = pub;
        der.prv = prv;
        der.nChild = nChild;
        return *this;
    }
};

// clang-format off
TestVector test1 =
  TestVector("000102030405060708090a0b0c0d0e0f")
    ("xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhePY2gZ29ESFjqJoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8",
     "xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi",
     0x80000000)
    ("xpub68Gmy5EdvgibQVfPdqkBBCHxA5htiqg55crXYuXoQRKfDBFA1WEjWgP6LHhwBZeNK1VTsfTFUHCdrfp1bgwQ9xv5ski8PX9rL2dZXvgGDnw",
     "xprv9uHRZZhk6KAJC1avXpDAp4MDc3sQKNxDiPvvkX8Br5ngLNv1TxvUxt4cV1rGL5hj6KCesnDYUhd7oWgT11eZG7XnxHrnYeSvkzY7d2bhkJ7",
     1)
    ("xpub6ASuArnXKPbfEwhqN6e3mwBcDTgzisQN1wXN9BJcM47sSikHjJf3UFHKkNAWbWMiGj7Wf5uMash7SyYq527Hqck2AxYysAA7xmALppuCkwQ",
     "xprv9wTYmMFdV23N2TdNG573QoEsfRrWKQgWeibmLntzniatZvR9BmLnvSxqu53Kw1UmYPxLgboyZQaXwTCg8MSY3H2EU4pWcQDnRnrVA1xe8fs",
     0x80000002)
    ("xpub6D4BDPcP2GT577Vvch3R8wDkScZWzQzMMUm3PWbmWvVJrZwQY4VUNgqFJPMM3No2dFDFGTsxxpG5uJh7n7epu4trkrX7x7DogT5Uv6fcLW5",
     "xprv9z4pot5VBttmtdRTWfWQmoH1taj2axGVzFqSb8C9xaxKymcFzXBDptWmT7FwuEzG3ryjH4ktypQSAewRiNMjANTtpgP4mLTj34bhnZX7UiM",
     2)
    ("xpub6FHa3pjLCk84BayeJxFW2SP4XRrFd1JYnxeLeU8EqN3vDfZmbqBqaGJAyiLjTAwm6ZLRQUMv1ZACTj37sR62cfN7fe5JnJ7dh8zL4fiyLHV",
     "xprvA2JDeKCSNNZky6uBCviVfJSKyQ1mDYahRjijr5idH2WwLsEd4Hsb2Tyh8RfQMuPh7f7RtyzTtdrbdqqsunu5Mm3wDvUAKRHSC34sJ7in334",
     1000000000)
    ("xpub6H1LXWLaKsWFhvm6RVpEL9P4KfRZSW7abD2ttkWP3SSQvnyA8FSVqNTEcYFgJS2UaFcxupHiYkro49S8yGasTvXEYBVPamhGW6cFJodrTHy",
     "xprvA41z7zogVVwxVSgdKUHDy1SKmdb533PjDz7J6N6mV6uS3ze1ai8FHa8kmHScGpWmj4WggLyQjgPie1rFSruoUihUZREPSL39UNdE3BBDu76",
     0);

TestVector test2 =
  TestVector("fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a29f9c999693908d8a8784817e7b7875726f6c696663605d5a5754514e4b484542")
    ("xpub661MyMwAqRbcFW31YEwpkMuc5THy2PSt5bDMsktWQcFF8syAmRUapSCGu8ED9W6oDMSgv6Zz8idoc4a6mr8BDzTJY47LJhkJ8UB7WEGuduB",
     "xprv9s21ZrQH143K31xYSDQpPDxsXRTUcvj2iNHm5NUtrGiGG5e2DtALGdso3pGz6ssrdK4PFmM8NSpSBHNqPqm55Qn3LqFtT2emdEXVYsCzC2U",
     0)
    ("xpub69H7F5d8KSRgmmdJg2KhpAK8SR3DjMwAdkxj3ZuxV27CprR9LgpeyGmXUbC6wb7ERfvrnKZjXoUmmDznezpbZb7ap6r1D3tgFxHmwMkQTPH",
     "xprv9vHkqa6EV4sPZHYqZznhT2NPtPCjKuDKGY38FBWLvgaDx45zo9WQRUT3dKYnjwih2yJD9mkrocEZXo1ex8G81dwSM1fwqWpWkeS3v86pgKt",
     0xFFFFFFFF)
    ("xpub6ASAVgeehLbnwdqV6UKMHVzgqAG8Gr6riv3Fxxpj8ksbH9ebxaEyBLZ85ySDhKiLDBrQSARLq1uNRts8RuJiHjaDMBU4Zn9h8LZNnBC5y4a",
     "xprv9wSp6B7kry3Vj9m1zSnLvN3xH8RdsPP1Mh7fAaR7aRLcQMKTR2vidYEeEg2mUCTAwCd6vnxVrcjfy2kRgVsFawNzmjuHc2YmYRmagcEPdU9",
     1)
    ("xpub6DF8uhdarytz3FWdA8TvFSvvAh8dP3283MY7p2V4SeE2wyWmG5mg5EwVvmdMVCQcoNJxGoWaU9DCWh89LojfZ537wTfunKau47EL2dhHKon",
     "xprv9zFnWC6h2cLgpmSA46vutJzBcfJ8yaJGg8cX1e5StJh45BBciYTRXSd25UEPVuesF9yog62tGAQtHjXajPPdbRCHuWS6T8XA2ECKADdw4Ef",
     0xFFFFFFFE)
    ("xpub6ERApfZwUNrhLCkDtcHTcxd75RbzS1ed54G1LkBUHQVHQKqhMkhgbmJbZRkrgZw4koxb5JaHWkY4ALHY2grBGRjaDMzQLcgJvLJuZZvRcEL",
     "xprvA1RpRA33e1JQ7ifknakTFpgNXPmW2YvmhqLQYMmrj4xJXXWYpDPS3xz7iAxn8L39njGVyuoseXzU6rcxFLJ8HFsTjSyQbLYnMpCqE2VbFWc",
     2)
    ("xpub6FnCn6nSzZAw5Tw7cgR9bi15UV96gLZhjDstkXXxvCLsUXBGXPdSnLFbdpq8p9HmGsApME5hQTZ3emM2rnY5agb9rXpVGyy3bdW6EEgAtqt",
     "xprvA2nrNbFZABcdryreWet9Ea4LvTJcGsqrMzxHx98MMrotbir7yrKCEXw7nadnHM8Dq38EGfSh6dqA9QWTyefMLEcBYJUuekgW4BYPJcr9E7j",
     0);

TestVector test3 =
  TestVector("4b381541583be4423346c643850da4b320e46a87ae3d2a4e6da11eba819cd4acba45d239319ac14f863b8d5ab5a0d0c64d2e8a1e7d1457df2e5a3c51c73235be")
    ("xpub661MyMwAqRbcEZVB4dScxMAdx6d4nFc9nvyvH3v4gJL378CSRZiYmhRoP7mBy6gSPSCYk6SzXPTf3ND1cZAceL7SfJ1Z3GC8vBgp2epUt13",
     "xprv9s21ZrQH143K25QhxbucbDDuQ4naNntJRi4KUfWT7xo4EKsHt2QJDu7KXp1A3u7Bi1j8ph3EGsZ9Xvz9dGuVrtHHs7pXeTzjuxBrCmmhgC6",
      0x80000000)
    ("xpub68NZiKmJWnxxS6aaHmn81bvJeTESw724CRDs6HbuccFQN9Ku14VQrADWgqbhhTHBaohPX4CjNLf9fq9MYo6oDaPPLPxSb7gwQN3ih19Zm4Y",
     "xprv9uPDJpEQgRQfDcW7BkF7eTya6RPxXeJCqCJGHuCJ4GiRVLzkTXBAJMu2qaMWPrS7AANYqdq6vcBcBUdJCVVFceUvJFjaPdGZ2y9WACViL4L",
      0);
// clang-format on

void RunTest(const TestVector &test) {
    std::vector<uint8_t> seed = ParseHex(test.strHexMaster);
    CExtKey key;
    CExtPubKey pubkey;
    key.SetMaster(&seed[0], seed.size());
    pubkey = key.Neuter();
    for (const TestDerivation &derive : test.vDerive) {
        uint8_t data[74];
        key.Encode(data);
        pubkey.Encode(data);

        // Test private key
        CBitcoinExtKey b58key;
        b58key.SetKey(key);
        BOOST_CHECK(b58key.ToString() == derive.prv);

        CBitcoinExtKey b58keyDecodeCheck(derive.prv);
        CExtKey checkKey = b58keyDecodeCheck.GetKey();
        // ensure a base58 decoded key also matches
        assert(checkKey == key);

        // Test public key
        CBitcoinExtPubKey b58pubkey;
        b58pubkey.SetKey(pubkey);
        BOOST_CHECK(b58pubkey.ToString() == derive.pub);

        CBitcoinExtPubKey b58PubkeyDecodeCheck(derive.pub);
        CExtPubKey checkPubKey = b58PubkeyDecodeCheck.GetKey();
        // ensure a base58 decoded pubkey also matches
        assert(checkPubKey == pubkey);

        // Derive new keys
        CExtKey keyNew;
        BOOST_CHECK(key.Derive(keyNew, derive.nChild));
        CExtPubKey pubkeyNew = keyNew.Neuter();
        if (!(derive.nChild & 0x80000000)) {
            // Compare with public derivation
            CExtPubKey pubkeyNew2;
            BOOST_CHECK(pubkey.Derive(pubkeyNew2, derive.nChild));
            BOOST_CHECK(pubkeyNew == pubkeyNew2);
        }
        key = keyNew;
        pubkey = pubkeyNew;

        CDataStream ssPub(SER_DISK, CLIENT_VERSION);
        ssPub << pubkeyNew;
        BOOST_CHECK(ssPub.size() == 75);

        CDataStream ssPriv(SER_DISK, CLIENT_VERSION);
        ssPriv << keyNew;
        BOOST_CHECK(ssPriv.size() == 75);

        CExtPubKey pubCheck;
        CExtKey privCheck;
        ssPub >> pubCheck;
        ssPriv >> privCheck;

        BOOST_CHECK(pubCheck == pubkeyNew);
        BOOST_CHECK(privCheck == keyNew);
    }
}

BOOST_FIXTURE_TEST_SUITE(bip32_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(bip32_test1) {
    RunTest(test1);
}

BOOST_AUTO_TEST_CASE(bip32_test2) {
    RunTest(test2);
}

BOOST_AUTO_TEST_CASE(bip32_test3) {
    RunTest(test3);
}

bool check_key_size_message(const std::runtime_error &e) {
    BOOST_CHECK_EQUAL(e.what(), "Invalid extended key size\n");
    return true;
}

BOOST_AUTO_TEST_CASE(bip32_serialization) {
    std::vector<std::string> pubkeys{
        "013442193e8000000047fdacbd0f1097043b78c63c20c34ef4ed9a111d980047ad1628"
        "2c7ae6236141035a784662a4a20a65bf6aab9ae98a6c068a81c52e4b032c0fb5400c70"
        "6cfccc56",
        "025c1bd648000000012a7857631386ba23dacac34180dd1983734e444fdbf774041578"
        "e9b6adb37c1903501e454bf00751f24b1b489aa925215d66af2234e3891c3b21a52bed"
        "b3cd711c",
        "03bef5a2f98000000204466b9cc8e161e966409ca52986c584f07e9dc81f735db683c3"
        "ff6ec7b1503f0357bfe1e341d01c69fe5654309956cbea516822fba8a601743a012a78"
        "96ee8dc2",
        "04ee7ab90c00000002cfb71883f01676f587d023cc53a35bc7f88f724b1f8c2892ac12"
        "75ac822a3edd02e8445082a72f29b75ca48748a914df60622a609cacfce8ed0e358045"
        "60741d29",
        "05d880d7d83b9aca00c783e67b921d2beb8f6b389cc646d7263b4145701dadd2161548"
        "a8b078e65e9e022a471424da5e657499d1ff51cb43c47481a03b1e77f951fe64cec9f5"
        "a48f7011",
        "06d69aa10200000000739379b40b549fdb7f2439c028dac3192d4706deec3f0fef6816"
        "ea36c8fc3fda028817473b2e81a20b60a24fc7a0d7869368ebc36740cfe08a18a19a9d"
        "dafae67c",
        "01bd16bee500000000f0909affaa7ee7abe5dd4e100598d4dc53cd709d5a5c2cac40e7"
        "412f232f7c9c02fc9e5af0ac8d9b3cecfe2a888e2117ba3d089d8585886c9c826b6b22"
        "a98d12ea",
        "025a61ff8effffffffbe17a268474a6bb9c61e1d720cf6215e2a88c5406c4aee7b3854"
        "7f585c9a37d903c01e7425647bdefa82b12d9bad5e3e6865bee0502694b94ca58b666a"
        "bc0a5c3b",
        "03d8ab493700000001f366f48f1ea9f2d1d3fe958c95ca84ea18e4c4ddb9366c336c92"
        "7eb246fb38cb03a7d1d856deb74c508e05031f9895dab54626251b3806e16b4bd12e78"
        "1a7df5b9",
        "0478412e3afffffffe637807030d55d01f9a0cb3a7839515d796bd07706386a6eddf06"
        "cc29a65a0e2902d2b36900396c9282fa14628566582f206a5dd0bcc8d5e892611806ca"
        "fb0301f0",
        "0531a507b8000000029452b549be8cea3ecb7a84bec10dcfd94afe4d129ebfd3b3cb58"
        "eedf394ed271024d902e1a2fc7a8755ab5b694c575fce742c48d9ff192e63df5193e4c"
        "7afe1f9c",
        "0626132fdb0000000005bcc50a4c1bbfa6d982ae1f410f88ddcbacad781b11b8790c86"
        "f49cdf9e77b0031c0517fff3d483f06ca769bd2326bf30aca1c4de278e676e6ef760c3"
        "301244c6",
        "0141d63b5080000000e5fea12a97b927fc9dc3d2cb0d1ea1cf50aa5a1fdc1f933e8906"
        "bb38df3377bd026557fdda1d5d43d79611f784780471f086d58e8126b8c40acb82272a"
        "7712e7f2",
        "02c61368bb000000007c63ec0429a7324b76014ad222a32b7fdd3ae8755d0d2b2e3dfb"
        "5ede9787af990379e45b3cf75f9c5f9befd8e9506fb962f6a9d185ac87001ec44a8d3d"
        "f8d4a9e3",
    };

    for (const std::string &hex : pubkeys) {
        CDataStream ss(SER_DISK, CLIENT_VERSION);
        ss << ParseHex(hex);
        BOOST_CHECK(ss.size() == 75);

        CExtPubKey pubkey;
        BOOST_CHECK_NO_THROW(ss >> pubkey);

        ss << ParseHex(hex + "00");
        BOOST_CHECK(ss.size() == 76);
        BOOST_CHECK_EXCEPTION(ss >> pubkey, std::runtime_error,
                              check_key_size_message);

        ss.clear();
        ss << ParseHex(hex.substr(0, hex.size() - 1));
        BOOST_CHECK(ss.size() == 74);
        BOOST_CHECK_EXCEPTION(ss >> pubkey, std::runtime_error,
                              check_key_size_message);
    }

    std::vector<std::string> privkeys{
        "013442193e8000000047fdacbd0f1097043b78c63c20c34ef4ed9a111d980047ad1628"
        "2c7ae623614100edb2e14f9ee77d26dd93b4ecede8d16ed408ce149b6cd80b0715a2d9"
        "11a0afea",
        "025c1bd648000000012a7857631386ba23dacac34180dd1983734e444fdbf774041578"
        "e9b6adb37c19003c6cb8d0f6a264c91ea8b5030fadaa8e538b020f0a387421a12de931"
        "9dc93368",
        "03bef5a2f98000000204466b9cc8e161e966409ca52986c584f07e9dc81f735db683c3"
        "ff6ec7b1503f00cbce0d719ecf7431d88e6a89fa1483e02e35092af60c042b1df2ff59"
        "fa424dca",
        "04ee7ab90c00000002cfb71883f01676f587d023cc53a35bc7f88f724b1f8c2892ac12"
        "75ac822a3edd000f479245fb19a38a1954c5c7c0ebab2f9bdfd96a17563ef28a6a4b1a"
        "2a764ef4",
        "05d880d7d83b9aca00c783e67b921d2beb8f6b389cc646d7263b4145701dadd2161548"
        "a8b078e65e9e00471b76e389e528d6de6d816857e012c5455051cad6660850e58372a6"
        "c3e6e7c8",
        "06d69aa10200000000739379b40b549fdb7f2439c028dac3192d4706deec3f0fef6816"
        "ea36c8fc3fda00996cbe292e59ce1c8ee257522ce969b9faa413f7e9aa4a8785b8f574"
        "e0e2f061",
        "01bd16bee500000000f0909affaa7ee7abe5dd4e100598d4dc53cd709d5a5c2cac40e7"
        "412f232f7c9c00abe74a98f6c7eabee0428f53798f0ab8aa1bd37873999041703c742f"
        "15ac7e1e",
        "025a61ff8effffffffbe17a268474a6bb9c61e1d720cf6215e2a88c5406c4aee7b3854"
        "7f585c9a37d900877c779ad9687164e9c2f4f0f4ff0340814392330693ce95a58fe18f"
        "d52e6e93",
        "03d8ab493700000001f366f48f1ea9f2d1d3fe958c95ca84ea18e4c4ddb9366c336c92"
        "7eb246fb38cb00704addf544a06e5ee4bea37098463c23613da32020d604506da8c051"
        "8e1da4b7",
        "0478412e3afffffffe637807030d55d01f9a0cb3a7839515d796bd07706386a6eddf06"
        "cc29a65a0e2900f1c7c871a54a804afe328b4c83a1c33b8e5ff48f5087273f04efa83b"
        "247d6a2d",
        "0531a507b8000000029452b549be8cea3ecb7a84bec10dcfd94afe4d129ebfd3b3cb58"
        "eedf394ed27100bb7d39bdb83ecf58f2fd82b6d918341cbef428661ef01ab97c28a484"
        "2125ac23",
        "0626132fdb0000000005bcc50a4c1bbfa6d982ae1f410f88ddcbacad781b11b8790c86"
        "f49cdf9e77b0004b7e8b1aa263519f7fbed001d5b0c4a5fdac81db8abe14c327e2f534"
        "92e55fa7",
        "0141d63b5080000000e5fea12a97b927fc9dc3d2cb0d1ea1cf50aa5a1fdc1f933e8906"
        "bb38df3377bd00491f7a2eebc7b57028e0d3faa0acda02e75c33b03c48fb288c41e2ea"
        "44e1daef",
        "02c61368bb000000007c63ec0429a7324b76014ad222a32b7fdd3ae8755d0d2b2e3dfb"
        "5ede9787af9900129ee831061c31be7d636fc0402fd2299855f40015a2c60b2e5755c5"
        "7270460d",
    };

    for (const std::string &hex : privkeys) {
        CDataStream ss(SER_DISK, CLIENT_VERSION);
        ss << ParseHex(hex);
        BOOST_CHECK(ss.size() == 75);

        CExtKey privkey;
        BOOST_CHECK_NO_THROW(ss >> privkey);

        ss << ParseHex(hex + "00");
        BOOST_CHECK(ss.size() == 76);
        BOOST_CHECK_EXCEPTION(ss >> privkey, std::runtime_error,
                              check_key_size_message);

        ss.clear();
        ss << ParseHex(hex.substr(0, hex.size() - 1));
        BOOST_CHECK(ss.size() == 74);
        BOOST_CHECK_EXCEPTION(ss >> privkey, std::runtime_error,
                              check_key_size_message);
    }
}

BOOST_AUTO_TEST_SUITE_END()
