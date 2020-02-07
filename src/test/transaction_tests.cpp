// Copyright (c) 2011-2016 The Bitcoin Core developers
// Copyright (c) 2017-2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chainparams.h> // For CChainParams
#include <checkqueue.h>
#include <clientversion.h>
#include <config.h>
#include <consensus/tx_verify.h>
#include <consensus/validation.h>
#include <core_io.h>
#include <key.h>
#include <keystore.h>
#include <policy/policy.h>
#include <script/script.h>
#include <script/script_error.h>
#include <script/sign.h>
#include <script/standard.h>
#include <streams.h>
#include <util/strencodings.h>
#include <util/system.h>
#include <validation.h>

#include <test/data/tx_invalid.json.h>
#include <test/data/tx_valid.json.h>
#include <test/jsonutil.h>
#include <test/scriptflags.h>
#include <test/test_bitcoin.h>

#include <boost/test/unit_test.hpp>

#include <univalue.h>

#include <map>
#include <string>

typedef std::vector<uint8_t> valtype;

BOOST_FIXTURE_TEST_SUITE(transaction_tests, BasicTestingSetup)

static COutPoint buildOutPoint(const UniValue &vinput) {
    TxId txid;
    txid.SetHex(vinput[0].get_str());
    return COutPoint(txid, vinput[1].get_int());
}

BOOST_AUTO_TEST_CASE(tx_valid) {
    // Read tests from test/data/tx_valid.json
    // Format is an array of arrays
    // Inner arrays are either [ "comment" ]
    // or [[[prevout hash, prevout index, prevout scriptPubKey], [input 2],
    // ...],"], serializedTransaction, verifyFlags
    // ... where all scripts are stringified scripts.
    //
    // verifyFlags is a comma separated list of script verification flags to
    // apply, or "NONE"
    UniValue tests = read_json(
        std::string(json_tests::tx_valid,
                    json_tests::tx_valid + sizeof(json_tests::tx_valid)));

    ScriptError err;
    for (size_t idx = 0; idx < tests.size(); idx++) {
        UniValue test = tests[idx];
        std::string strTest = test.write();
        if (test[0].isArray()) {
            if (test.size() != 3 || !test[1].isStr() || !test[2].isStr()) {
                BOOST_ERROR("Bad test: " << strTest);
                continue;
            }

            std::map<COutPoint, CScript> mapprevOutScriptPubKeys;
            std::map<COutPoint, Amount> mapprevOutValues;
            UniValue inputs = test[0].get_array();
            bool fValid = true;
            for (size_t inpIdx = 0; inpIdx < inputs.size(); inpIdx++) {
                const UniValue &input = inputs[inpIdx];
                if (!input.isArray()) {
                    fValid = false;
                    break;
                }
                UniValue vinput = input.get_array();
                if (vinput.size() < 3 || vinput.size() > 4) {
                    fValid = false;
                    break;
                }
                COutPoint outpoint = buildOutPoint(vinput);
                mapprevOutScriptPubKeys[outpoint] =
                    ParseScript(vinput[2].get_str());
                if (vinput.size() >= 4) {
                    mapprevOutValues[outpoint] =
                        vinput[3].get_int64() * SATOSHI;
                }
            }
            if (!fValid) {
                BOOST_ERROR("Bad test: " << strTest);
                continue;
            }

            std::string transaction = test[1].get_str();
            CDataStream stream(ParseHex(transaction), SER_NETWORK,
                               PROTOCOL_VERSION);
            CTransaction tx(deserialize, stream);

            CValidationState state;
            BOOST_CHECK_MESSAGE(tx.IsCoinBase()
                                    ? CheckCoinbase(tx, state)
                                    : CheckRegularTransaction(tx, state),
                                strTest);
            BOOST_CHECK(state.IsValid());

            // Check that CheckCoinbase reject non-coinbase transactions and
            // vice versa.
            BOOST_CHECK_MESSAGE(!(tx.IsCoinBase()
                                      ? CheckRegularTransaction(tx, state)
                                      : CheckCoinbase(tx, state)),
                                strTest);
            BOOST_CHECK(state.IsInvalid());

            PrecomputedTransactionData txdata(tx);
            for (size_t i = 0; i < tx.vin.size(); i++) {
                if (!mapprevOutScriptPubKeys.count(tx.vin[i].prevout)) {
                    BOOST_ERROR("Bad test: " << strTest);
                    break;
                }

                Amount amount = Amount::zero();
                if (mapprevOutValues.count(tx.vin[i].prevout)) {
                    amount = mapprevOutValues[tx.vin[i].prevout];
                }

                uint32_t verify_flags = ParseScriptFlags(test[2].get_str());
                BOOST_CHECK_MESSAGE(
                    VerifyScript(
                        tx.vin[i].scriptSig,
                        mapprevOutScriptPubKeys[tx.vin[i].prevout],
                        verify_flags,
                        TransactionSignatureChecker(&tx, i, amount, txdata),
                        &err),
                    strTest);
                BOOST_CHECK_MESSAGE(err == ScriptError::OK,
                                    ScriptErrorString(err));
            }
        }
    }
}

BOOST_AUTO_TEST_CASE(tx_invalid) {
    // Read tests from test/data/tx_invalid.json
    // Format is an array of arrays
    // Inner arrays are either [ "comment" ]
    // or [[[prevout hash, prevout index, prevout scriptPubKey], [input 2],
    // ...],"], serializedTransaction, verifyFlags
    // ... where all scripts are stringified scripts.
    //
    // verifyFlags is a comma separated list of script verification flags to
    // apply, or "NONE"
    UniValue tests = read_json(
        std::string(json_tests::tx_invalid,
                    json_tests::tx_invalid + sizeof(json_tests::tx_invalid)));

    // Initialize to ScriptError::OK. The tests expect err to be changed to a
    // value other than ScriptError::OK.
    ScriptError err = ScriptError::OK;
    for (size_t idx = 0; idx < tests.size(); idx++) {
        UniValue test = tests[idx];
        std::string strTest = test.write();
        if (test[0].isArray()) {
            if (test.size() != 3 || !test[1].isStr() || !test[2].isStr()) {
                BOOST_ERROR("Bad test: " << strTest);
                continue;
            }

            std::map<COutPoint, CScript> mapprevOutScriptPubKeys;
            std::map<COutPoint, Amount> mapprevOutValues;
            UniValue inputs = test[0].get_array();
            bool fValid = true;
            for (size_t inpIdx = 0; inpIdx < inputs.size(); inpIdx++) {
                const UniValue &input = inputs[inpIdx];
                if (!input.isArray()) {
                    fValid = false;
                    break;
                }
                UniValue vinput = input.get_array();
                if (vinput.size() < 3 || vinput.size() > 4) {
                    fValid = false;
                    break;
                }
                COutPoint outpoint = buildOutPoint(vinput);
                mapprevOutScriptPubKeys[outpoint] =
                    ParseScript(vinput[2].get_str());
                if (vinput.size() >= 4) {
                    mapprevOutValues[outpoint] =
                        vinput[3].get_int64() * SATOSHI;
                }
            }
            if (!fValid) {
                BOOST_ERROR("Bad test: " << strTest);
                continue;
            }

            std::string transaction = test[1].get_str();
            CDataStream stream(ParseHex(transaction), SER_NETWORK,
                               PROTOCOL_VERSION);
            CTransaction tx(deserialize, stream);

            CValidationState state;
            fValid = CheckRegularTransaction(tx, state) && state.IsValid();

            PrecomputedTransactionData txdata(tx);
            for (size_t i = 0; i < tx.vin.size() && fValid; i++) {
                if (!mapprevOutScriptPubKeys.count(tx.vin[i].prevout)) {
                    BOOST_ERROR("Bad test: " << strTest);
                    break;
                }

                Amount amount = Amount::zero();
                if (0 != mapprevOutValues.count(tx.vin[i].prevout)) {
                    amount = mapprevOutValues[tx.vin[i].prevout];
                }

                uint32_t verify_flags = ParseScriptFlags(test[2].get_str());
                fValid = VerifyScript(
                    tx.vin[i].scriptSig,
                    mapprevOutScriptPubKeys[tx.vin[i].prevout], verify_flags,
                    TransactionSignatureChecker(&tx, i, amount, txdata), &err);
            }
            BOOST_CHECK_MESSAGE(!fValid, strTest);
            BOOST_CHECK_MESSAGE(err != ScriptError::OK, ScriptErrorString(err));
        }
    }
}

BOOST_AUTO_TEST_CASE(basic_transaction_tests) {
    // Random real transaction
    // (e2769b09e784f32f62ef849763d4f45b98e07ba658647343b915ff832b110436)
    uint8_t ch[] = {
        0x01, 0x00, 0x00, 0x00, 0x01, 0x6b, 0xff, 0x7f, 0xcd, 0x4f, 0x85, 0x65,
        0xef, 0x40, 0x6d, 0xd5, 0xd6, 0x3d, 0x4f, 0xf9, 0x4f, 0x31, 0x8f, 0xe8,
        0x20, 0x27, 0xfd, 0x4d, 0xc4, 0x51, 0xb0, 0x44, 0x74, 0x01, 0x9f, 0x74,
        0xb4, 0x00, 0x00, 0x00, 0x00, 0x8c, 0x49, 0x30, 0x46, 0x02, 0x21, 0x00,
        0xda, 0x0d, 0xc6, 0xae, 0xce, 0xfe, 0x1e, 0x06, 0xef, 0xdf, 0x05, 0x77,
        0x37, 0x57, 0xde, 0xb1, 0x68, 0x82, 0x09, 0x30, 0xe3, 0xb0, 0xd0, 0x3f,
        0x46, 0xf5, 0xfc, 0xf1, 0x50, 0xbf, 0x99, 0x0c, 0x02, 0x21, 0x00, 0xd2,
        0x5b, 0x5c, 0x87, 0x04, 0x00, 0x76, 0xe4, 0xf2, 0x53, 0xf8, 0x26, 0x2e,
        0x76, 0x3e, 0x2d, 0xd5, 0x1e, 0x7f, 0xf0, 0xbe, 0x15, 0x77, 0x27, 0xc4,
        0xbc, 0x42, 0x80, 0x7f, 0x17, 0xbd, 0x39, 0x01, 0x41, 0x04, 0xe6, 0xc2,
        0x6e, 0xf6, 0x7d, 0xc6, 0x10, 0xd2, 0xcd, 0x19, 0x24, 0x84, 0x78, 0x9a,
        0x6c, 0xf9, 0xae, 0xa9, 0x93, 0x0b, 0x94, 0x4b, 0x7e, 0x2d, 0xb5, 0x34,
        0x2b, 0x9d, 0x9e, 0x5b, 0x9f, 0xf7, 0x9a, 0xff, 0x9a, 0x2e, 0xe1, 0x97,
        0x8d, 0xd7, 0xfd, 0x01, 0xdf, 0xc5, 0x22, 0xee, 0x02, 0x28, 0x3d, 0x3b,
        0x06, 0xa9, 0xd0, 0x3a, 0xcf, 0x80, 0x96, 0x96, 0x8d, 0x7d, 0xbb, 0x0f,
        0x91, 0x78, 0xff, 0xff, 0xff, 0xff, 0x02, 0x8b, 0xa7, 0x94, 0x0e, 0x00,
        0x00, 0x00, 0x00, 0x19, 0x76, 0xa9, 0x14, 0xba, 0xde, 0xec, 0xfd, 0xef,
        0x05, 0x07, 0x24, 0x7f, 0xc8, 0xf7, 0x42, 0x41, 0xd7, 0x3b, 0xc0, 0x39,
        0x97, 0x2d, 0x7b, 0x88, 0xac, 0x40, 0x94, 0xa8, 0x02, 0x00, 0x00, 0x00,
        0x00, 0x19, 0x76, 0xa9, 0x14, 0xc1, 0x09, 0x32, 0x48, 0x3f, 0xec, 0x93,
        0xed, 0x51, 0xf5, 0xfe, 0x95, 0xe7, 0x25, 0x59, 0xf2, 0xcc, 0x70, 0x43,
        0xf9, 0x88, 0xac, 0x00, 0x00, 0x00, 0x00, 0x00};
    std::vector<uint8_t> vch(ch, ch + sizeof(ch) - 1);
    CDataStream stream(vch, SER_DISK, CLIENT_VERSION);
    CMutableTransaction tx;
    stream >> tx;
    CValidationState state;
    BOOST_CHECK_MESSAGE(CheckRegularTransaction(CTransaction(tx), state) &&
                            state.IsValid(),
                        "Simple deserialized transaction should be valid.");

    // Check that duplicate txins fail
    tx.vin.push_back(tx.vin[0]);
    BOOST_CHECK_MESSAGE(!CheckRegularTransaction(CTransaction(tx), state) ||
                            !state.IsValid(),
                        "Transaction with duplicate txins should be invalid.");
}

//
// Helper: create two dummy transactions, each with
// two outputs.  The first has 11 and 50 CENT outputs
// paid to a TX_PUBKEY, the second 21 and 22 CENT outputs
// paid to a TX_PUBKEYHASH.
//
static std::vector<CMutableTransaction>
SetupDummyInputs(CBasicKeyStore &keystoreRet, CCoinsViewCache &coinsRet) {
    std::vector<CMutableTransaction> dummyTransactions;
    dummyTransactions.resize(2);

    // Add some keys to the keystore:
    CKey key[4];
    for (int i = 0; i < 4; i++) {
        key[i].MakeNewKey(i % 2);
        keystoreRet.AddKey(key[i]);
    }

    // Create some dummy input transactions
    dummyTransactions[0].vout.resize(2);
    dummyTransactions[0].vout[0].nValue = 11 * CENT;
    dummyTransactions[0].vout[0].scriptPubKey
        << ToByteVector(key[0].GetPubKey()) << OP_CHECKSIG;
    dummyTransactions[0].vout[1].nValue = 50 * CENT;
    dummyTransactions[0].vout[1].scriptPubKey
        << ToByteVector(key[1].GetPubKey()) << OP_CHECKSIG;
    AddCoins(coinsRet, CTransaction(dummyTransactions[0]), 0);

    dummyTransactions[1].vout.resize(2);
    dummyTransactions[1].vout[0].nValue = 21 * CENT;
    dummyTransactions[1].vout[0].scriptPubKey =
        GetScriptForDestination(key[2].GetPubKey().GetID());
    dummyTransactions[1].vout[1].nValue = 22 * CENT;
    dummyTransactions[1].vout[1].scriptPubKey =
        GetScriptForDestination(key[3].GetPubKey().GetID());
    AddCoins(coinsRet, CTransaction(dummyTransactions[1]), 0);

    return dummyTransactions;
}

BOOST_AUTO_TEST_CASE(test_Get) {
    CBasicKeyStore keystore;
    CCoinsView coinsDummy;
    CCoinsViewCache coins(&coinsDummy);
    std::vector<CMutableTransaction> dummyTransactions =
        SetupDummyInputs(keystore, coins);

    CMutableTransaction t1;
    t1.vin.resize(3);
    t1.vin[0].prevout = COutPoint(dummyTransactions[0].GetId(), 1);
    t1.vin[0].scriptSig << std::vector<uint8_t>(65, 0);
    t1.vin[1].prevout = COutPoint(dummyTransactions[1].GetId(), 0);
    t1.vin[1].scriptSig << std::vector<uint8_t>(65, 0)
                        << std::vector<uint8_t>(33, 4);
    t1.vin[2].prevout = COutPoint(dummyTransactions[1].GetId(), 1);
    t1.vin[2].scriptSig << std::vector<uint8_t>(65, 0)
                        << std::vector<uint8_t>(33, 4);
    t1.vout.resize(2);
    t1.vout[0].nValue = 90 * CENT;
    t1.vout[0].scriptPubKey << OP_1;

    BOOST_CHECK(AreInputsStandard(CTransaction(t1), coins,
                                  STANDARD_SCRIPT_VERIFY_FLAGS));
    BOOST_CHECK_EQUAL(coins.GetValueIn(CTransaction(t1)),
                      (50 + 21 + 22) * CENT);
}

static void CreateCreditAndSpend(const CKeyStore &keystore,
                                 const CScript &outscript,
                                 CTransactionRef &output,
                                 CMutableTransaction &input,
                                 bool success = true) {
    CMutableTransaction outputm;
    outputm.nVersion = 1;
    outputm.vin.resize(1);
    outputm.vin[0].prevout = COutPoint();
    outputm.vin[0].scriptSig = CScript();
    outputm.vout.resize(1);
    outputm.vout[0].nValue = SATOSHI;
    outputm.vout[0].scriptPubKey = outscript;
    CDataStream ssout(SER_NETWORK, PROTOCOL_VERSION);
    ssout << outputm;
    ssout >> output;
    BOOST_CHECK_EQUAL(output->vin.size(), 1UL);
    BOOST_CHECK(output->vin[0] == outputm.vin[0]);
    BOOST_CHECK_EQUAL(output->vout.size(), 1UL);
    BOOST_CHECK(output->vout[0] == outputm.vout[0]);

    CMutableTransaction inputm;
    inputm.nVersion = 1;
    inputm.vin.resize(1);
    inputm.vin[0].prevout = COutPoint(output->GetId(), 0);
    inputm.vout.resize(1);
    inputm.vout[0].nValue = SATOSHI;
    inputm.vout[0].scriptPubKey = CScript();
    bool ret =
        SignSignature(keystore, *output, inputm, 0, SigHashType().withForkId());
    BOOST_CHECK_EQUAL(ret, success);
    CDataStream ssin(SER_NETWORK, PROTOCOL_VERSION);
    ssin << inputm;
    ssin >> input;
    BOOST_CHECK_EQUAL(input.vin.size(), 1UL);
    BOOST_CHECK(input.vin[0] == inputm.vin[0]);
    BOOST_CHECK_EQUAL(input.vout.size(), 1UL);
    BOOST_CHECK(input.vout[0] == inputm.vout[0]);
}

static void CheckWithFlag(const CTransactionRef &output,
                          const CMutableTransaction &input, int flags,
                          bool success) {
    ScriptError error;
    CTransaction inputi(input);
    bool ret = VerifyScript(
        inputi.vin[0].scriptSig, output->vout[0].scriptPubKey,
        flags | SCRIPT_ENABLE_SIGHASH_FORKID,
        TransactionSignatureChecker(&inputi, 0, output->vout[0].nValue),
        &error);
    BOOST_CHECK_EQUAL(ret, success);
}

static CScript PushAll(const std::vector<valtype> &values) {
    CScript result;
    for (const valtype &v : values) {
        if (v.size() == 0) {
            result << OP_0;
        } else if (v.size() == 1 && v[0] >= 1 && v[0] <= 16) {
            result << CScript::EncodeOP_N(v[0]);
        } else {
            result << v;
        }
    }
    return result;
}

static void ReplaceRedeemScript(CScript &script, const CScript &redeemScript) {
    std::vector<valtype> stack;
    EvalScript(stack, script, SCRIPT_VERIFY_STRICTENC, BaseSignatureChecker());
    BOOST_CHECK(stack.size() > 0);
    stack.back() =
        std::vector<uint8_t>(redeemScript.begin(), redeemScript.end());
    script = PushAll(stack);
}

BOOST_AUTO_TEST_CASE(test_big_transaction) {
    CKey key;
    key.MakeNewKey(false);
    CBasicKeyStore keystore;
    keystore.AddKeyPubKey(key, key.GetPubKey());
    CScript scriptPubKey = CScript()
                           << ToByteVector(key.GetPubKey()) << OP_CHECKSIG;

    std::vector<SigHashType> sigHashes;
    sigHashes.emplace_back(SIGHASH_NONE | SIGHASH_FORKID);
    sigHashes.emplace_back(SIGHASH_SINGLE | SIGHASH_FORKID);
    sigHashes.emplace_back(SIGHASH_ALL | SIGHASH_FORKID);
    sigHashes.emplace_back(SIGHASH_NONE | SIGHASH_FORKID |
                           SIGHASH_ANYONECANPAY);
    sigHashes.emplace_back(SIGHASH_SINGLE | SIGHASH_FORKID |
                           SIGHASH_ANYONECANPAY);
    sigHashes.emplace_back(SIGHASH_ALL | SIGHASH_FORKID | SIGHASH_ANYONECANPAY);

    CMutableTransaction mtx;
    mtx.nVersion = 1;

    // create a big transaction of 4500 inputs signed by the same key.
    const static size_t OUTPUT_COUNT = 4500;
    mtx.vout.reserve(OUTPUT_COUNT);

    for (size_t ij = 0; ij < OUTPUT_COUNT; ij++) {
        size_t i = mtx.vin.size();
        TxId prevId(uint256S("0000000000000000000000000000000000000000000000000"
                             "000000000000100"));
        COutPoint outpoint(prevId, i);

        mtx.vin.resize(mtx.vin.size() + 1);
        mtx.vin[i].prevout = outpoint;
        mtx.vin[i].scriptSig = CScript();

        mtx.vout.emplace_back(1000 * SATOSHI, CScript() << OP_1);
    }

    // sign all inputs
    for (size_t i = 0; i < mtx.vin.size(); i++) {
        bool hashSigned =
            SignSignature(keystore, scriptPubKey, mtx, i, 1000 * SATOSHI,
                          sigHashes.at(i % sigHashes.size()));
        BOOST_CHECK_MESSAGE(hashSigned, "Failed to sign test transaction");
    }

    CTransaction tx(mtx);

    // check all inputs concurrently, with the cache
    PrecomputedTransactionData txdata(tx);
    boost::thread_group threadGroup;
    CCheckQueue<CScriptCheck> scriptcheckqueue(128);
    CCheckQueueControl<CScriptCheck> control(&scriptcheckqueue);

    for (int i = 0; i < 20; i++) {
        threadGroup.create_thread(std::bind(&CCheckQueue<CScriptCheck>::Thread,
                                            std::ref(scriptcheckqueue)));
    }

    std::vector<Coin> coins;
    for (size_t i = 0; i < mtx.vin.size(); i++) {
        CTxOut out;
        out.nValue = 1000 * SATOSHI;
        out.scriptPubKey = scriptPubKey;
        coins.emplace_back(std::move(out), 1, false);
    }

    for (size_t i = 0; i < mtx.vin.size(); i++) {
        std::vector<CScriptCheck> vChecks;
        CTxOut &out = coins[tx.vin[i].prevout.GetN()].GetTxOut();
        CScriptCheck check(out.scriptPubKey, out.nValue, tx, i,
                           STANDARD_SCRIPT_VERIFY_FLAGS, false, txdata);
        vChecks.push_back(CScriptCheck());
        check.swap(vChecks.back());
        control.Add(vChecks);
    }

    bool controlCheck = control.Wait();
    BOOST_CHECK(controlCheck);

    threadGroup.interrupt_all();
    threadGroup.join_all();
}

SignatureData CombineSignatures(const CMutableTransaction &input1,
                                const CMutableTransaction &input2,
                                const CTransactionRef tx) {
    SignatureData sigdata;
    sigdata = DataFromTransaction(input1, 0, tx->vout[0]);
    sigdata.MergeSignatureData(DataFromTransaction(input2, 0, tx->vout[0]));
    ProduceSignature(
        DUMMY_SIGNING_PROVIDER,
        MutableTransactionSignatureCreator(&input1, 0, tx->vout[0].nValue),
        tx->vout[0].scriptPubKey, sigdata);
    return sigdata;
}

BOOST_AUTO_TEST_CASE(test_witness) {
    CBasicKeyStore keystore, keystore2;
    CKey key1, key2, key3, key1L, key2L;
    CPubKey pubkey1, pubkey2, pubkey3, pubkey1L, pubkey2L;
    key1.MakeNewKey(true);
    key2.MakeNewKey(true);
    key3.MakeNewKey(true);
    key1L.MakeNewKey(false);
    key2L.MakeNewKey(false);
    pubkey1 = key1.GetPubKey();
    pubkey2 = key2.GetPubKey();
    pubkey3 = key3.GetPubKey();
    pubkey1L = key1L.GetPubKey();
    pubkey2L = key2L.GetPubKey();
    keystore.AddKeyPubKey(key1, pubkey1);
    keystore.AddKeyPubKey(key2, pubkey2);
    keystore.AddKeyPubKey(key1L, pubkey1L);
    keystore.AddKeyPubKey(key2L, pubkey2L);
    CScript scriptPubkey1, scriptPubkey2, scriptPubkey1L, scriptPubkey2L,
        scriptMulti;
    scriptPubkey1 << ToByteVector(pubkey1) << OP_CHECKSIG;
    scriptPubkey2 << ToByteVector(pubkey2) << OP_CHECKSIG;
    scriptPubkey1L << ToByteVector(pubkey1L) << OP_CHECKSIG;
    scriptPubkey2L << ToByteVector(pubkey2L) << OP_CHECKSIG;
    std::vector<CPubKey> oneandthree;
    oneandthree.push_back(pubkey1);
    oneandthree.push_back(pubkey3);
    scriptMulti = GetScriptForMultisig(2, oneandthree);
    keystore.AddCScript(scriptPubkey1);
    keystore.AddCScript(scriptPubkey2);
    keystore.AddCScript(scriptPubkey1L);
    keystore.AddCScript(scriptPubkey2L);
    keystore.AddCScript(scriptMulti);
    keystore2.AddCScript(scriptMulti);
    keystore2.AddKeyPubKey(key3, pubkey3);

    CTransactionRef output1, output2;
    CMutableTransaction input1, input2;

    // Normal pay-to-compressed-pubkey.
    CreateCreditAndSpend(keystore, scriptPubkey1, output1, input1);
    CreateCreditAndSpend(keystore, scriptPubkey2, output2, input2);
    CheckWithFlag(output1, input1, 0, true);
    CheckWithFlag(output1, input1, SCRIPT_VERIFY_P2SH, true);
    CheckWithFlag(output1, input1, STANDARD_SCRIPT_VERIFY_FLAGS, true);
    CheckWithFlag(output1, input2, 0, false);
    CheckWithFlag(output1, input2, SCRIPT_VERIFY_P2SH, false);
    CheckWithFlag(output1, input2, STANDARD_SCRIPT_VERIFY_FLAGS, false);

    // P2SH pay-to-compressed-pubkey.
    CreateCreditAndSpend(keystore,
                         GetScriptForDestination(CScriptID(scriptPubkey1)),
                         output1, input1);
    CreateCreditAndSpend(keystore,
                         GetScriptForDestination(CScriptID(scriptPubkey2)),
                         output2, input2);
    ReplaceRedeemScript(input2.vin[0].scriptSig, scriptPubkey1);
    CheckWithFlag(output1, input1, 0, true);
    CheckWithFlag(output1, input1, SCRIPT_VERIFY_P2SH, true);
    CheckWithFlag(output1, input1, STANDARD_SCRIPT_VERIFY_FLAGS, true);
    CheckWithFlag(output1, input2, 0, true);
    CheckWithFlag(output1, input2, SCRIPT_VERIFY_P2SH, false);
    CheckWithFlag(output1, input2, STANDARD_SCRIPT_VERIFY_FLAGS, false);

    // Normal pay-to-uncompressed-pubkey.
    CreateCreditAndSpend(keystore, scriptPubkey1L, output1, input1);
    CreateCreditAndSpend(keystore, scriptPubkey2L, output2, input2);
    CheckWithFlag(output1, input1, 0, true);
    CheckWithFlag(output1, input1, SCRIPT_VERIFY_P2SH, true);
    CheckWithFlag(output1, input1, STANDARD_SCRIPT_VERIFY_FLAGS, true);
    CheckWithFlag(output1, input2, 0, false);
    CheckWithFlag(output1, input2, SCRIPT_VERIFY_P2SH, false);
    CheckWithFlag(output1, input2, STANDARD_SCRIPT_VERIFY_FLAGS, false);

    // P2SH pay-to-uncompressed-pubkey.
    CreateCreditAndSpend(keystore,
                         GetScriptForDestination(CScriptID(scriptPubkey1L)),
                         output1, input1);
    CreateCreditAndSpend(keystore,
                         GetScriptForDestination(CScriptID(scriptPubkey2L)),
                         output2, input2);
    ReplaceRedeemScript(input2.vin[0].scriptSig, scriptPubkey1L);
    CheckWithFlag(output1, input1, 0, true);
    CheckWithFlag(output1, input1, SCRIPT_VERIFY_P2SH, true);
    CheckWithFlag(output1, input1, STANDARD_SCRIPT_VERIFY_FLAGS, true);
    CheckWithFlag(output1, input2, 0, true);
    CheckWithFlag(output1, input2, SCRIPT_VERIFY_P2SH, false);
    CheckWithFlag(output1, input2, STANDARD_SCRIPT_VERIFY_FLAGS, false);

    // Normal 2-of-2 multisig
    CreateCreditAndSpend(keystore, scriptMulti, output1, input1, false);
    CheckWithFlag(output1, input1, 0, false);
    CreateCreditAndSpend(keystore2, scriptMulti, output2, input2, false);
    CheckWithFlag(output2, input2, 0, false);
    BOOST_CHECK(*output1 == *output2);
    UpdateInput(input1.vin[0], CombineSignatures(input1, input2, output1));
    CheckWithFlag(output1, input1, STANDARD_SCRIPT_VERIFY_FLAGS, true);

    // P2SH 2-of-2 multisig
    CreateCreditAndSpend(keystore,
                         GetScriptForDestination(CScriptID(scriptMulti)),
                         output1, input1, false);
    CheckWithFlag(output1, input1, 0, true);
    CheckWithFlag(output1, input1, SCRIPT_VERIFY_P2SH, false);
    CreateCreditAndSpend(keystore2,
                         GetScriptForDestination(CScriptID(scriptMulti)),
                         output2, input2, false);
    CheckWithFlag(output2, input2, 0, true);
    CheckWithFlag(output2, input2, SCRIPT_VERIFY_P2SH, false);
    BOOST_CHECK(*output1 == *output2);
    UpdateInput(input1.vin[0], CombineSignatures(input1, input2, output1));
    CheckWithFlag(output1, input1, SCRIPT_VERIFY_P2SH, true);
    CheckWithFlag(output1, input1, STANDARD_SCRIPT_VERIFY_FLAGS, true);
}

BOOST_AUTO_TEST_CASE(test_IsStandard) {
    LOCK(cs_main);
    CBasicKeyStore keystore;
    CCoinsView coinsDummy;
    CCoinsViewCache coins(&coinsDummy);
    std::vector<CMutableTransaction> dummyTransactions =
        SetupDummyInputs(keystore, coins);

    CMutableTransaction t;
    t.vin.resize(1);
    t.vin[0].prevout = COutPoint(dummyTransactions[0].GetId(), 1);
    t.vin[0].scriptSig << std::vector<uint8_t>(65, 0);
    t.vout.resize(1);
    t.vout[0].nValue = 90 * CENT;
    CKey key;
    key.MakeNewKey(true);
    t.vout[0].scriptPubKey = GetScriptForDestination(key.GetPubKey().GetID());

    std::string reason;
    BOOST_CHECK(IsStandardTx(CTransaction(t), reason));

    // Check dust with default relay fee:
    Amount nDustThreshold = 3 * 182 * dustRelayFee.GetFeePerK() / 1000;
    BOOST_CHECK_EQUAL(nDustThreshold, 546 * SATOSHI);
    // dust:
    t.vout[0].nValue = nDustThreshold - SATOSHI;
    BOOST_CHECK(!IsStandardTx(CTransaction(t), reason));
    // not dust:
    t.vout[0].nValue = nDustThreshold;
    BOOST_CHECK(IsStandardTx(CTransaction(t), reason));

    // Check dust with odd relay fee to verify rounding:
    // nDustThreshold = 182 * 1234 / 1000 * 3
    dustRelayFee = CFeeRate(1234 * SATOSHI);
    // dust:
    t.vout[0].nValue = (672 - 1) * SATOSHI;
    BOOST_CHECK(!IsStandardTx(CTransaction(t), reason));
    // not dust:
    t.vout[0].nValue = 672 * SATOSHI;
    BOOST_CHECK(IsStandardTx(CTransaction(t), reason));
    dustRelayFee = CFeeRate(DUST_RELAY_TX_FEE);

    t.vout[0].scriptPubKey = CScript() << OP_1;
    BOOST_CHECK(!IsStandardTx(CTransaction(t), reason));

    // MAX_OP_RETURN_RELAY-byte TX_NULL_DATA (standard)
    t.vout[0].scriptPubKey =
        CScript() << OP_RETURN
                  << ParseHex("646578784062697477617463682e636f2092c558ed52c56d"
                              "8dd14ca76226bc936a84820d898443873eb03d8854b21fa3"
                              "952b99a2981873e74509281730d78a21786d34a38bd1ebab"
                              "822fad42278f7f4420db6ab1fd2b6826148d4f73bb41ec2d"
                              "40a6d5793d66e17074a0c56a8a7df21062308f483dd6e38d"
                              "53609d350038df0a1b2a9ac8332016e0b904f66880dd0108"
                              "81c4e8074cce8e4ad6c77cb3460e01bf0e7e811b5f945f83"
                              "732ba6677520a893d75d9a966cb8f85dc301656b1635c631"
                              "f5d00d4adf73f2dd112ca75cf19754651909becfbe65aed1"
                              "3afb2ab8");
    BOOST_CHECK_EQUAL(MAX_OP_RETURN_RELAY, t.vout[0].scriptPubKey.size());
    BOOST_CHECK(IsStandardTx(CTransaction(t), reason));

    // MAX_OP_RETURN_RELAY+1-byte TX_NULL_DATA (non-standard)
    t.vout[0].scriptPubKey =
        CScript() << OP_RETURN
                  << ParseHex("646578784062697477617463682e636f2092c558ed52c56d"
                              "8dd14ca76226bc936a84820d898443873eb03d8854b21fa3"
                              "952b99a2981873e74509281730d78a21786d34a38bd1ebab"
                              "822fad42278f7f4420db6ab1fd2b6826148d4f73bb41ec2d"
                              "40a6d5793d66e17074a0c56a8a7df21062308f483dd6e38d"
                              "53609d350038df0a1b2a9ac8332016e0b904f66880dd0108"
                              "81c4e8074cce8e4ad6c77cb3460e01bf0e7e811b5f945f83"
                              "732ba6677520a893d75d9a966cb8f85dc301656b1635c631"
                              "f5d00d4adf73f2dd112ca75cf19754651909becfbe65aed1"
                              "3afb2ab800");
    BOOST_CHECK_EQUAL(MAX_OP_RETURN_RELAY + 1, t.vout[0].scriptPubKey.size());
    BOOST_CHECK(!IsStandardTx(CTransaction(t), reason));

    /**
     * Check when a custom value is used for -datacarriersize .
     */
    unsigned newMaxSize = 90;
    gArgs.ForceSetArg("-datacarriersize", std::to_string(newMaxSize));

    // Max user provided payload size is standard
    t.vout[0].scriptPubKey =
        CScript() << OP_RETURN
                  << ParseHex("04678afdb0fe5548271967f1a67130b7105cd6a828e03909"
                              "a67962e0ea1f61deb649f6bc3f4cef3804678afdb0fe5548"
                              "271967f1a67130b7105cd6a828e03909a67962e0ea1f61de"
                              "b649f6bc3f4cef3877696e64657878");
    BOOST_CHECK_EQUAL(t.vout[0].scriptPubKey.size(), newMaxSize);
    BOOST_CHECK(IsStandardTx(CTransaction(t), reason));

    // Max user provided payload size + 1 is non-standard
    t.vout[0].scriptPubKey =
        CScript() << OP_RETURN
                  << ParseHex("04678afdb0fe5548271967f1a67130b7105cd6a828e03909"
                              "a67962e0ea1f61deb649f6bc3f4cef3804678afdb0fe5548"
                              "271967f1a67130b7105cd6a828e03909a67962e0ea1f61de"
                              "b649f6bc3f4cef3877696e6465787800");
    BOOST_CHECK_EQUAL(t.vout[0].scriptPubKey.size(), newMaxSize + 1);
    BOOST_CHECK(!IsStandardTx(CTransaction(t), reason));

    // Clear custom confirguration.
    gArgs.ClearArg("-datacarriersize");

    // Data payload can be encoded in any way...
    t.vout[0].scriptPubKey = CScript() << OP_RETURN << ParseHex("");
    BOOST_CHECK(IsStandardTx(CTransaction(t), reason));
    t.vout[0].scriptPubKey = CScript()
                             << OP_RETURN << ParseHex("00") << ParseHex("01");
    BOOST_CHECK(IsStandardTx(CTransaction(t), reason));
    // OP_RESERVED *is* considered to be a PUSHDATA type opcode by IsPushOnly()!
    t.vout[0].scriptPubKey = CScript() << OP_RETURN << OP_RESERVED << -1 << 0
                                       << ParseHex("01") << 2 << 3 << 4 << 5
                                       << 6 << 7 << 8 << 9 << 10 << 11 << 12
                                       << 13 << 14 << 15 << 16;
    BOOST_CHECK(IsStandardTx(CTransaction(t), reason));
    t.vout[0].scriptPubKey = CScript()
                             << OP_RETURN << 0 << ParseHex("01") << 2
                             << ParseHex("fffffffffffffffffffffffffffffffffffff"
                                         "fffffffffffffffffffffffffffffffffff");
    BOOST_CHECK(IsStandardTx(CTransaction(t), reason));

    // ...so long as it only contains PUSHDATA's
    t.vout[0].scriptPubKey = CScript() << OP_RETURN << OP_RETURN;
    BOOST_CHECK(!IsStandardTx(CTransaction(t), reason));

    // TX_NULL_DATA w/o PUSHDATA
    t.vout.resize(1);
    t.vout[0].scriptPubKey = CScript() << OP_RETURN;
    BOOST_CHECK(IsStandardTx(CTransaction(t), reason));

    // Only one TX_NULL_DATA permitted in all cases
    t.vout.resize(2);
    t.vout[0].scriptPubKey =
        CScript() << OP_RETURN
                  << ParseHex("04678afdb0fe5548271967f1a67130b7105cd6a828e03909"
                              "a67962e0ea1f61deb649f6bc3f4cef38");
    t.vout[1].scriptPubKey =
        CScript() << OP_RETURN
                  << ParseHex("04678afdb0fe5548271967f1a67130b7105cd6a828e03909"
                              "a67962e0ea1f61deb649f6bc3f4cef38");
    BOOST_CHECK(!IsStandardTx(CTransaction(t), reason));

    t.vout[0].scriptPubKey =
        CScript() << OP_RETURN
                  << ParseHex("04678afdb0fe5548271967f1a67130b7105cd6a828e03909"
                              "a67962e0ea1f61deb649f6bc3f4cef38");
    t.vout[1].scriptPubKey = CScript() << OP_RETURN;
    BOOST_CHECK(!IsStandardTx(CTransaction(t), reason));

    t.vout[0].scriptPubKey = CScript() << OP_RETURN;
    t.vout[1].scriptPubKey = CScript() << OP_RETURN;
    BOOST_CHECK(!IsStandardTx(CTransaction(t), reason));
}

BOOST_AUTO_TEST_CASE(txsize_activation_test) {
    const Config &config = GetConfig();
    const Consensus::Params &params = config.GetChainParams().GetConsensus();
    const int32_t magneticAnomalyActivationHeight =
        params.magneticAnomalyHeight;

    // A minimaly sized transction.
    CTransaction minTx;
    CValidationState state;

    BOOST_CHECK(ContextualCheckTransaction(
        params, minTx, state, magneticAnomalyActivationHeight - 1, 5678, 1234));
    BOOST_CHECK(!ContextualCheckTransaction(
        params, minTx, state, magneticAnomalyActivationHeight, 5678, 1234));
    BOOST_CHECK_EQUAL(state.GetRejectCode(), REJECT_INVALID);
    BOOST_CHECK_EQUAL(state.GetRejectReason(), "bad-txns-undersize");
}

BOOST_AUTO_TEST_SUITE_END()
