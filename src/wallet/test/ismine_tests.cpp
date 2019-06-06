// Copyright (c) 2017-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <key.h>
#include <keystore.h>
#include <script/script.h>
#include <script/script_error.h>
#include <script/standard.h>
#include <wallet/ismine.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(ismine_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(ismine_standard) {
    CKey keys[2];
    CPubKey pubkeys[2];
    for (int i = 0; i < 2; i++) {
        keys[i].MakeNewKey(true);
        pubkeys[i] = keys[i].GetPubKey();
    }

    CKey uncompressedKey;
    uncompressedKey.MakeNewKey(false);
    CPubKey uncompressedPubkey = uncompressedKey.GetPubKey();

    CScript scriptPubKey;
    isminetype result;

    // P2PK compressed
    {
        CBasicKeyStore keystore;
        scriptPubKey = GetScriptForRawPubKey(pubkeys[0]);

        // Keystore does not have key
        result = IsMine(keystore, scriptPubKey);
        BOOST_CHECK_EQUAL(result, ISMINE_NO);

        // Keystore has key
        keystore.AddKey(keys[0]);
        result = IsMine(keystore, scriptPubKey);
        BOOST_CHECK_EQUAL(result, ISMINE_SPENDABLE);
    }

    // P2PK uncompressed
    {
        CBasicKeyStore keystore;
        scriptPubKey = GetScriptForRawPubKey(uncompressedPubkey);

        // Keystore does not have key
        result = IsMine(keystore, scriptPubKey);
        BOOST_CHECK_EQUAL(result, ISMINE_NO);

        // Keystore has key
        keystore.AddKey(uncompressedKey);
        result = IsMine(keystore, scriptPubKey);
        BOOST_CHECK_EQUAL(result, ISMINE_SPENDABLE);
    }

    // P2PKH compressed
    {
        CBasicKeyStore keystore;
        scriptPubKey = GetScriptForDestination(PKHash(pubkeys[0]));

        // Keystore does not have key
        result = IsMine(keystore, scriptPubKey);
        BOOST_CHECK_EQUAL(result, ISMINE_NO);

        // Keystore has key
        keystore.AddKey(keys[0]);
        result = IsMine(keystore, scriptPubKey);
        BOOST_CHECK_EQUAL(result, ISMINE_SPENDABLE);
    }

    // P2PKH uncompressed
    {
        CBasicKeyStore keystore;
        scriptPubKey = GetScriptForDestination(PKHash(uncompressedPubkey));

        // Keystore does not have key
        result = IsMine(keystore, scriptPubKey);
        BOOST_CHECK_EQUAL(result, ISMINE_NO);

        // Keystore has key
        keystore.AddKey(uncompressedKey);
        result = IsMine(keystore, scriptPubKey);
        BOOST_CHECK_EQUAL(result, ISMINE_SPENDABLE);
    }

    // P2SH
    {
        CBasicKeyStore keystore;

        CScript redeemScript = GetScriptForDestination(PKHash(pubkeys[0]));
        scriptPubKey = GetScriptForDestination(ScriptHash(redeemScript));

        // Keystore does not have redeemScript or key
        result = IsMine(keystore, scriptPubKey);
        BOOST_CHECK_EQUAL(result, ISMINE_NO);

        // Keystore has redeemScript but no key
        keystore.AddCScript(redeemScript);
        result = IsMine(keystore, scriptPubKey);
        BOOST_CHECK_EQUAL(result, ISMINE_NO);

        // Keystore has redeemScript and key
        keystore.AddKey(keys[0]);
        result = IsMine(keystore, scriptPubKey);
        BOOST_CHECK_EQUAL(result, ISMINE_SPENDABLE);
    }

    // (P2PKH inside) P2SH inside P2SH (invalid)
    {
        CBasicKeyStore keystore;

        CScript redeemscript_inner =
            GetScriptForDestination(PKHash(pubkeys[0]));
        CScript redeemscript =
            GetScriptForDestination(ScriptHash(redeemscript_inner));
        scriptPubKey = GetScriptForDestination(ScriptHash(redeemscript));

        keystore.AddCScript(redeemscript);
        keystore.AddCScript(redeemscript_inner);
        keystore.AddCScript(scriptPubKey);
        keystore.AddKey(keys[0]);
        result = IsMine(keystore, scriptPubKey);
        BOOST_CHECK_EQUAL(result, ISMINE_NO);
    }

    // scriptPubKey multisig
    {
        CBasicKeyStore keystore;

        scriptPubKey =
            GetScriptForMultisig(2, {uncompressedPubkey, pubkeys[1]});

        // Keystore does not have any keys
        result = IsMine(keystore, scriptPubKey);
        BOOST_CHECK_EQUAL(result, ISMINE_NO);

        // Keystore has 1/2 keys
        keystore.AddKey(uncompressedKey);

        result = IsMine(keystore, scriptPubKey);
        BOOST_CHECK_EQUAL(result, ISMINE_NO);

        // Keystore has 2/2 keys
        keystore.AddKey(keys[1]);

        result = IsMine(keystore, scriptPubKey);
        BOOST_CHECK_EQUAL(result, ISMINE_NO);

        // Keystore has 2/2 keys and the script
        keystore.AddCScript(scriptPubKey);

        result = IsMine(keystore, scriptPubKey);
        BOOST_CHECK_EQUAL(result, ISMINE_NO);
    }

    // P2SH multisig
    {
        CBasicKeyStore keystore;
        keystore.AddKey(uncompressedKey);
        keystore.AddKey(keys[1]);

        CScript redeemScript =
            GetScriptForMultisig(2, {uncompressedPubkey, pubkeys[1]});
        scriptPubKey = GetScriptForDestination(ScriptHash(redeemScript));

        // Keystore has no redeemScript
        result = IsMine(keystore, scriptPubKey);
        BOOST_CHECK_EQUAL(result, ISMINE_NO);

        // Keystore has redeemScript
        keystore.AddCScript(redeemScript);
        result = IsMine(keystore, scriptPubKey);
        BOOST_CHECK_EQUAL(result, ISMINE_SPENDABLE);
    }

    // OP_RETURN
    {
        CBasicKeyStore keystore;
        keystore.AddKey(keys[0]);

        scriptPubKey.clear();
        scriptPubKey << OP_RETURN << ToByteVector(pubkeys[0]);

        result = IsMine(keystore, scriptPubKey);
        BOOST_CHECK_EQUAL(result, ISMINE_NO);
    }

    // Nonstandard
    {
        CBasicKeyStore keystore;
        keystore.AddKey(keys[0]);

        scriptPubKey.clear();
        scriptPubKey << OP_9 << OP_ADD << OP_11 << OP_EQUAL;

        result = IsMine(keystore, scriptPubKey);
        BOOST_CHECK_EQUAL(result, ISMINE_NO);
    }
}

BOOST_AUTO_TEST_SUITE_END()
