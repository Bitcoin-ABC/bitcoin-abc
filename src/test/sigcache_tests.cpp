// Copyright (c) 2012-2015 The Bitcoin Core developers
// Copyright (c) 2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
// (based on key_tests.cpp)

#include <script/sigcache.h>

#include <key.h>
#include <key_io.h>
#include <streams.h>
#include <tinyformat.h>
#include <util/strencodings.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

#include <string>
#include <vector>

static const std::string strSecret1 =
    "5HxWvvfubhXpYYpS3tJkw6fq9jE9j18THftkZjHHfmFiWtmAbrj";
static const std::string strSecret1C =
    "Kwr371tjA9u2rFSMZjTNun2PXXP3WPZu2afRHTcta6KxEUdm1vEw";

/**
 * Sigcache is only accessible via CachingTransactionSignatureChecker
 * as friend.
 */
class TestCachingTransactionSignatureChecker {
    CachingTransactionSignatureChecker *pchecker;

public:
    explicit TestCachingTransactionSignatureChecker(
        CachingTransactionSignatureChecker &checkerarg) {
        pchecker = &checkerarg;
    }

    inline bool VerifyAndStore(const std::vector<uint8_t> &vchSig,
                               const CPubKey &pubkey, const uint256 &sighash) {
        return pchecker->VerifySignature(vchSig, pubkey, sighash);
    }

    inline bool IsCached(const std::vector<uint8_t> &vchSig,
                         const CPubKey &pubkey, const uint256 &sighash) {
        return pchecker->IsCached(vchSig, pubkey, sighash);
    }
};

BOOST_FIXTURE_TEST_SUITE(sigcache_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(sig_pubkey_hash_variations) {
    /**
     * Making CachingTransactionSignatureChecker requires a tx. So we make a
     * dummy transaction (doesn't matter what it is) to construct it.
     */
    CDataStream stream(
        ParseHex(
            "010000000122739e70fbee987a8be1788395a2f2e6ad18ccb7ff611cd798071539"
            "dde3c38e000000000151ffffffff010000000000000000016a00000000"),
        SER_NETWORK, PROTOCOL_VERSION);
    CTransaction dummyTx(deserialize, stream);
    PrecomputedTransactionData txdata(dummyTx);
    SignatureCache signature_cache{DEFAULT_SIGNATURE_CACHE_BYTES};
    CachingTransactionSignatureChecker checker(&dummyTx, 0, 0 * SATOSHI, true,
                                               signature_cache, txdata);

    TestCachingTransactionSignatureChecker testChecker(checker);

    CKey key1 = DecodeSecret(strSecret1);
    BOOST_CHECK(key1.IsCompressed() == false);
    CKey key1C = DecodeSecret(strSecret1C);
    BOOST_CHECK(key1C.IsCompressed() == true);

    CPubKey pubkey1 = key1.GetPubKey();
    CPubKey pubkey1C = key1C.GetPubKey();

    for (int n = 0; n < 16; n++) {
        std::string strMsg = strprintf("Sigcache test1 %i: xx", n);
        uint256 hashMsg = Hash(strMsg);
        uint256 hashMsg2 = Hash(Span{strMsg}.last(strMsg.size() - 1));

        std::vector<uint8_t> sig;
        BOOST_CHECK(key1.SignECDSA(hashMsg, sig));
        std::vector<uint8_t> sig2;
        BOOST_CHECK(key1.SignECDSA(hashMsg2, sig2));

        // cross-check
        BOOST_CHECK(!testChecker.VerifyAndStore(sig2, pubkey1, hashMsg));
        BOOST_CHECK(!testChecker.VerifyAndStore(sig, pubkey1, hashMsg2));
        // that should not have put them in cache...
        BOOST_CHECK(!testChecker.IsCached(sig2, pubkey1, hashMsg));
        BOOST_CHECK(!testChecker.IsCached(sig, pubkey1, hashMsg2));

        // check that it's not in cache at start
        BOOST_CHECK(!testChecker.IsCached(sig, pubkey1, hashMsg));
        BOOST_CHECK(!testChecker.IsCached(sig2, pubkey1, hashMsg2));
        // Insert into cache
        BOOST_CHECK(testChecker.VerifyAndStore(sig, pubkey1, hashMsg));
        BOOST_CHECK(testChecker.VerifyAndStore(sig2, pubkey1, hashMsg2));
        // check that it's in
        BOOST_CHECK(testChecker.IsCached(sig, pubkey1, hashMsg));
        BOOST_CHECK(testChecker.IsCached(sig2, pubkey1, hashMsg2));
        // check that different signature hits different entry
        BOOST_CHECK(!testChecker.IsCached(sig2, pubkey1, hashMsg));
        // check that compressed pubkey hits different entry
        BOOST_CHECK(!testChecker.IsCached(sig, pubkey1C, hashMsg));
        // check that different message hits different entry
        BOOST_CHECK(!testChecker.IsCached(sig, pubkey1, hashMsg2));

        // compressed key is for same privkey, so verifying works:
        BOOST_CHECK(testChecker.VerifyAndStore(sig, pubkey1C, hashMsg));
        // now we *should* get a hit
        BOOST_CHECK(testChecker.IsCached(sig, pubkey1C, hashMsg));
    }
}

BOOST_AUTO_TEST_SUITE_END()
