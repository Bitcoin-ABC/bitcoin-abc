// Copyright (c) 2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
#include <key.h>

#include <test/gen/crypto_gen.h>
#include <test/test_bitcoin.h>

#include <boost/test/unit_test.hpp>

#include <rapidcheck/Gen.h>
#include <rapidcheck/boost_test.h>
#include <rapidcheck/gen/Arbitrary.h>

#include <cstdint>
#include <vector>

BOOST_FIXTURE_TEST_SUITE(key_properties, BasicTestingSetup)

/** Check CKey uniqueness */
RC_BOOST_PROP(key_uniqueness, (const CKey &key1, const CKey &key2)) {
    RC_ASSERT(!(key1 == key2));
}

/** Verify that a private key generates the correct public key */
RC_BOOST_PROP(key_generates_correct_pubkey, (const CKey &key)) {
    CPubKey pubKey = key.GetPubKey();
    RC_ASSERT(key.VerifyPubKey(pubKey));
}

/** Create a CKey using the 'Set' function must give us the same key */
RC_BOOST_PROP(key_set_symmetry, (const CKey &key)) {
    CKey key1;
    key1.Set(key.begin(), key.end(), key.IsCompressed());
    RC_ASSERT(key1 == key);
}

/**
 *  Create a CKey, sign a piece of data with ECDSA algorithm, then verify it
 *  with the public key.
 */
RC_BOOST_PROP(key_sign_symmetry_ecdsa, (const CKey &key, const uint256 &hash)) {
    std::vector<uint8_t> vchSig;
    key.SignECDSA(hash, vchSig, 0);
    const CPubKey &pubKey = key.GetPubKey();
    RC_ASSERT(pubKey.VerifyECDSA(hash, vchSig));
}

/**
 *  Create a CKey, sign a piece of data with Schnorr algorithm, then verify it
 *  with the public key.
 */
RC_BOOST_PROP(key_sign_symmetry_schnorr,
              (const CKey &key, const uint256 &hash)) {
    std::vector<uint8_t> vchSig;
    key.SignSchnorr(hash, vchSig, 0);
    const CPubKey &pubKey = key.GetPubKey();
    RC_ASSERT(pubKey.VerifySchnorr(hash, vchSig));
}
BOOST_AUTO_TEST_SUITE_END()
