// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "data/tx_invalid.json.h"
#include "data/tx_valid.json.h"
#include "test/test_bitcoin.h"

#include "clientversion.h"
#include "consensus/validation.h"
#include "core_io.h"
#include "hash.h"
#include "key.h"
#include "keystore.h"
#include "policy/policy.h"
#include "script/script.h"
#include "script/script_error.h"
#include "script/sign.h"
#include "script/standard.h"
#include "test/scriptflags.h"
#include "utilstrencodings.h"
#include "validation.h" // For CheckRegularTransaction

#include <map>
#include <string>

#include <boost/range/adaptor/reversed.hpp>
#include <boost/test/unit_test.hpp>

#include <univalue.h>

typedef std::vector<uint8_t> valtype;

// In script_tests.cpp
extern UniValue read_json(const std::string &jsondata);

BOOST_FIXTURE_TEST_SUITE(transaction_tests, BasicTestingSetup)

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
            std::map<COutPoint, int64_t> mapprevOutValues;
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
                COutPoint outpoint(utxid_t(uint256S(vinput[0].get_str())),
                                   vinput[1].get_int());
                mapprevOutScriptPubKeys[outpoint] =
                    ParseScript(vinput[2].get_str());
                if (vinput.size() >= 4) {
                    mapprevOutValues[outpoint] = vinput[3].get_int64();
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

            PrecomputedTransactionData txdata(tx);
            for (size_t i = 0; i < tx.vin.size(); i++) {
                if (!mapprevOutScriptPubKeys.count(tx.vin[i].prevout)) {
                    BOOST_ERROR("Bad test: " << strTest);
                    break;
                }

                CAmount amount = 0;
                if (mapprevOutValues.count(tx.vin[i].prevout)) {
                    amount = mapprevOutValues[tx.vin[i].prevout];
                }

                uint32_t verify_flags = ParseScriptFlags(test[2].get_str());
                BOOST_CHECK_MESSAGE(
                    VerifyScript(tx.vin[i].scriptSig,
                                 mapprevOutScriptPubKeys[tx.vin[i].prevout],
                                 verify_flags, TransactionSignatureChecker(
                                                   &tx, i, amount, txdata),
                                 &err),
                    strTest);
                BOOST_CHECK_MESSAGE(err == SCRIPT_ERR_OK,
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
            std::map<COutPoint, int64_t> mapprevOutValues;
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
                COutPoint outpoint(utxid_t(uint256S(vinput[0].get_str())),
                                   vinput[1].get_int());
                mapprevOutScriptPubKeys[outpoint] =
                    ParseScript(vinput[2].get_str());
                if (vinput.size() >= 4) {
                    mapprevOutValues[outpoint] = vinput[3].get_int64();
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

                CAmount amount = 0;
                if (mapprevOutValues.count(tx.vin[i].prevout)) {
                    amount = mapprevOutValues[tx.vin[i].prevout];
                }

                uint32_t verify_flags = ParseScriptFlags(test[2].get_str());
                fValid = VerifyScript(
                    tx.vin[i].scriptSig,
                    mapprevOutScriptPubKeys[tx.vin[i].prevout], verify_flags,
                    TransactionSignatureChecker(&tx, i, amount, txdata), &err);
            }
            BOOST_CHECK_MESSAGE(!fValid, strTest);
            BOOST_CHECK_MESSAGE(err != SCRIPT_ERR_OK, ScriptErrorString(err));
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
    BOOST_CHECK_MESSAGE(CheckRegularTransaction(tx, state) && state.IsValid(),
                        "Simple deserialized transaction should be valid.");

    // Check that duplicate txins fail
    tx.vin.push_back(tx.vin[0]);
    BOOST_CHECK_MESSAGE(!CheckRegularTransaction(tx, state) || !state.IsValid(),
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
    AddCoins(coinsRet, dummyTransactions[0], 0, MALFIX_MODE_LEGACY);

    dummyTransactions[1].vout.resize(2);
    dummyTransactions[1].vout[0].nValue = 21 * CENT;
    dummyTransactions[1].vout[0].scriptPubKey =
        GetScriptForDestination(key[2].GetPubKey().GetID());
    dummyTransactions[1].vout[1].nValue = 22 * CENT;
    dummyTransactions[1].vout[1].scriptPubKey =
        GetScriptForDestination(key[3].GetPubKey().GetID());
    AddCoins(coinsRet, dummyTransactions[1], 0, MALFIX_MODE_LEGACY);

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
    t1.vin[0].prevout.utxid = dummyTransactions[0].GetUtxid(MALFIX_MODE_LEGACY);
    t1.vin[0].prevout.n = 1;
    t1.vin[0].scriptSig << std::vector<uint8_t>(65, 0);
    t1.vin[1].prevout.utxid = dummyTransactions[1].GetUtxid(MALFIX_MODE_LEGACY);
    t1.vin[1].prevout.n = 0;
    t1.vin[1].scriptSig << std::vector<uint8_t>(65, 0)
                        << std::vector<uint8_t>(33, 4);
    t1.vin[2].prevout.utxid = dummyTransactions[1].GetUtxid(MALFIX_MODE_LEGACY);
    t1.vin[2].prevout.n = 1;
    t1.vin[2].scriptSig << std::vector<uint8_t>(65, 0)
                        << std::vector<uint8_t>(33, 4);
    t1.vout.resize(2);
    t1.vout[0].nValue = 90 * CENT;
    t1.vout[0].scriptPubKey << OP_1;

    BOOST_CHECK(AreInputsStandard(t1, coins));
    BOOST_CHECK_EQUAL(coins.GetValueIn(t1), (50 + 21 + 22) * CENT);
}

void CreateCreditAndSpend(const CKeyStore &keystore, const CScript &outscript,
                          CTransactionRef &output, CMutableTransaction &input,
                          bool success = true) {
    CMutableTransaction outputm;
    outputm.nVersion = 1;
    outputm.vin.resize(1);
    outputm.vin[0].prevout.SetNull();
    outputm.vin[0].scriptSig = CScript();
    outputm.vout.resize(1);
    outputm.vout[0].nValue = 1;
    outputm.vout[0].scriptPubKey = outscript;
    CDataStream ssout(SER_NETWORK, PROTOCOL_VERSION);
    ssout << outputm;
    ssout >> output;
    BOOST_CHECK_EQUAL(output->vin.size(), 1);
    BOOST_CHECK(output->vin[0] == outputm.vin[0]);
    BOOST_CHECK_EQUAL(output->vout.size(), 1);
    BOOST_CHECK(output->vout[0] == outputm.vout[0]);

    CMutableTransaction inputm;
    inputm.nVersion = 1;
    inputm.vin.resize(1);
    inputm.vin[0].prevout.utxid = output->GetUtxid(MALFIX_MODE_LEGACY);
    inputm.vin[0].prevout.n = 0;
    inputm.vout.resize(1);
    inputm.vout[0].nValue = 1;
    inputm.vout[0].scriptPubKey = CScript();
    bool ret = SignSignature(keystore, *output, inputm, 0,
                             SIGHASH_ALL | SIGHASH_FORKID);
    BOOST_CHECK_EQUAL(ret, success);
    CDataStream ssin(SER_NETWORK, PROTOCOL_VERSION);
    ssin << inputm;
    ssin >> input;
    BOOST_CHECK_EQUAL(input.vin.size(), 1);
    BOOST_CHECK(input.vin[0] == inputm.vin[0]);
    BOOST_CHECK_EQUAL(input.vout.size(), 1);
    BOOST_CHECK(input.vout[0] == inputm.vout[0]);
}

void CheckWithFlag(const CTransactionRef &output,
                   const CMutableTransaction &input, int flags, bool success) {
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

void ReplaceRedeemScript(CScript &script, const CScript &redeemScript) {
    std::vector<valtype> stack;
    EvalScript(stack, script, SCRIPT_VERIFY_STRICTENC, BaseSignatureChecker());
    BOOST_CHECK(stack.size() > 0);
    stack.back() =
        std::vector<uint8_t>(redeemScript.begin(), redeemScript.end());
    script = PushAll(stack);
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
    SignatureData sigdata;

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
    UpdateTransaction(
        input1, 0, CombineSignatures(output1->vout[0].scriptPubKey,
                                     MutableTransactionSignatureChecker(
                                         &input1, 0, output1->vout[0].nValue),
                                     DataFromTransaction(input1, 0),
                                     DataFromTransaction(input2, 0)));
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
    UpdateTransaction(
        input1, 0, CombineSignatures(output1->vout[0].scriptPubKey,
                                     MutableTransactionSignatureChecker(
                                         &input1, 0, output1->vout[0].nValue),
                                     DataFromTransaction(input1, 0),
                                     DataFromTransaction(input2, 0)));
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
    t.vin[0].prevout.utxid = dummyTransactions[0].GetUtxid(MALFIX_MODE_LEGACY);
    t.vin[0].prevout.n = 1;
    t.vin[0].scriptSig << std::vector<uint8_t>(65, 0);
    t.vout.resize(1);
    t.vout[0].nValue = 90 * CENT;
    CKey key;
    key.MakeNewKey(true);
    t.vout[0].scriptPubKey = GetScriptForDestination(key.GetPubKey().GetID());

    std::string reason;
    BOOST_CHECK(IsStandardTx(t, reason));

    // Check dust with default relay fee:
    CAmount nDustThreshold = 182 * dustRelayFee.GetFeePerK() / 1000 * 3;
    BOOST_CHECK_EQUAL(nDustThreshold, 546);
    // dust:
    t.vout[0].nValue = nDustThreshold - 1;
    BOOST_CHECK(!IsStandardTx(t, reason));
    // not dust:
    t.vout[0].nValue = nDustThreshold;
    BOOST_CHECK(IsStandardTx(t, reason));

    // Check dust with odd relay fee to verify rounding:
    // nDustThreshold = 182 * 1234 / 1000 * 3
    dustRelayFee = CFeeRate(1234);
    // dust:
    t.vout[0].nValue = 672 - 1;
    BOOST_CHECK(!IsStandardTx(t, reason));
    // not dust:
    t.vout[0].nValue = 672;
    BOOST_CHECK(IsStandardTx(t, reason));
    dustRelayFee = CFeeRate(DUST_RELAY_TX_FEE);

    t.vout[0].scriptPubKey = CScript() << OP_1;
    BOOST_CHECK(!IsStandardTx(t, reason));

    // MAX_OP_RETURN_RELAY-byte TX_NULL_DATA (standard)
    t.vout[0].scriptPubKey =
        CScript() << OP_RETURN
                  << ParseHex("04678afdb0fe5548271967f1a67130b7105cd6a828e03909"
                              "a67962e0ea1f61deb649f6bc3f4cef3804678afdb0fe5548"
                              "271967f1a67130b7105cd6a828e03909a67962e0ea1f61de"
                              "b649f6bc3f4cef38");
    BOOST_CHECK_EQUAL(MAX_OP_RETURN_RELAY, t.vout[0].scriptPubKey.size());
    BOOST_CHECK(IsStandardTx(t, reason));

    // MAX_OP_RETURN_RELAY+1-byte TX_NULL_DATA (non-standard)
    t.vout[0].scriptPubKey =
        CScript() << OP_RETURN
                  << ParseHex("04678afdb0fe5548271967f1a67130b7105cd6a828e03909"
                              "a67962e0ea1f61deb649f6bc3f4cef3804678afdb0fe5548"
                              "271967f1a67130b7105cd6a828e03909a67962e0ea1f61de"
                              "b649f6bc3f4cef3800");
    BOOST_CHECK_EQUAL(MAX_OP_RETURN_RELAY + 1, t.vout[0].scriptPubKey.size());
    BOOST_CHECK(!IsStandardTx(t, reason));

    // Data payload can be encoded in any way...
    t.vout[0].scriptPubKey = CScript() << OP_RETURN << ParseHex("");
    BOOST_CHECK(IsStandardTx(t, reason));
    t.vout[0].scriptPubKey = CScript() << OP_RETURN << ParseHex("00")
                                       << ParseHex("01");
    BOOST_CHECK(IsStandardTx(t, reason));
    // OP_RESERVED *is* considered to be a PUSHDATA type opcode by IsPushOnly()!
    t.vout[0].scriptPubKey = CScript() << OP_RETURN << OP_RESERVED << -1 << 0
                                       << ParseHex("01") << 2 << 3 << 4 << 5
                                       << 6 << 7 << 8 << 9 << 10 << 11 << 12
                                       << 13 << 14 << 15 << 16;
    BOOST_CHECK(IsStandardTx(t, reason));
    t.vout[0].scriptPubKey = CScript()
                             << OP_RETURN << 0 << ParseHex("01") << 2
                             << ParseHex("fffffffffffffffffffffffffffffffffffff"
                                         "fffffffffffffffffffffffffffffffffff");
    BOOST_CHECK(IsStandardTx(t, reason));

    // ...so long as it only contains PUSHDATA's
    t.vout[0].scriptPubKey = CScript() << OP_RETURN << OP_RETURN;
    BOOST_CHECK(!IsStandardTx(t, reason));

    // TX_NULL_DATA w/o PUSHDATA
    t.vout.resize(1);
    t.vout[0].scriptPubKey = CScript() << OP_RETURN;
    BOOST_CHECK(IsStandardTx(t, reason));

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
    BOOST_CHECK(!IsStandardTx(t, reason));

    t.vout[0].scriptPubKey =
        CScript() << OP_RETURN
                  << ParseHex("04678afdb0fe5548271967f1a67130b7105cd6a828e03909"
                              "a67962e0ea1f61deb649f6bc3f4cef38");
    t.vout[1].scriptPubKey = CScript() << OP_RETURN;
    BOOST_CHECK(!IsStandardTx(t, reason));

    t.vout[0].scriptPubKey = CScript() << OP_RETURN;
    t.vout[1].scriptPubKey = CScript() << OP_RETURN;
    BOOST_CHECK(!IsStandardTx(t, reason));
}


/** Tests TXIDs and UTXIDs at and around MalFix activation **/
BOOST_AUTO_TEST_CASE(test_utxid) {

    // use some real tx
    auto txdata = ParseHex(
        "01000000018bea4e3b7d7aa69d604dba0a6ad4020ed62bc1f280825188b2361249f0"
        "4487f1000000008c4930460221008949a28ed8aefecf7719b51dafc86e0fb04f4d85"
        "7b3e0851e3d216782d84777e022100a190621ee0b6895b1c9f8e5de46971ce219dc4"
        "eeaaeb45e295c708cecb29f3db014104afe87d055cda9cb9de677e219cbba3a40e5a"
        "a0f9eb778454f152aff5b0c26503e5844beff57796f226a695866624806f91360ae0"
        "ca69aaca831e7b1b7a9c0cbaffffffff03206db008000000001976a9145101805db0"
        "f6ad47cebe74b140fcb965b271c83388ace8b71400000000001976a91404d075b3f5"
        "01deeef5565143282b6cfe8fad5e9488ace10d0000000000001976a91485ba01a16d"
        "5759c7e4833ee0446eb19e0cf79f6588ac00000000");

    {
        CDataStream s(txdata, SER_DISK, CLIENT_VERSION);
        const CTransaction tx(deserialize_type(), s);

        // v1 transaction; all (u)txids are just full hash
        auto expectedHash = Hash(txdata.begin(), txdata.end());

        BOOST_CHECK(tx.GetId() == expectedHash);
        BOOST_CHECK(tx.GetUtxid(MALFIX_MODE_ACTIVE) == expectedHash);
        BOOST_CHECK(tx.GetUtxid(MALFIX_MODE_INACTIVE) == expectedHash);
        BOOST_CHECK(tx.GetUtxid(MALFIX_MODE_LEGACY) == expectedHash);
    }

    // set version= 3
    txdata[0] = 3;
    {
        CDataStream s(txdata, SER_DISK, CLIENT_VERSION);
        const CTransaction tx(deserialize_type(), s);

        // v3 transaction; txids and MALFIX inactive is still full hash
        auto expectedHash = Hash(txdata.begin(), txdata.end());
        BOOST_CHECK(tx.GetId() == expectedHash);
        BOOST_CHECK(tx.GetUtxid(MALFIX_MODE_INACTIVE) == expectedHash);

        // with malfix active, cut out input script
        txdata.erase(txdata.begin()+ 4+1+32+4, txdata.begin()+4+1+32+4+140+1);
        auto expectedUtxid = Hash(txdata.begin(), txdata.end());

        BOOST_CHECK(tx.GetUtxid(MALFIX_MODE_ACTIVE) == expectedUtxid);
        BOOST_CHECK(tx.GetUtxid(MALFIX_MODE_LEGACY) == expectedUtxid);
    }


    // We'll do another one with two inputs
    txdata = ParseHex(
        "0200000002ef641dc6569408bbe980a38511f80da5de37dd08e60618e80d9d538889"
        "68fe00490000006b4830450221008a32e6d488970d6769619d311834deb2e50e877d"
        "b45158911be4922f51a351c30220787edbf4c118b8cec7169626ce9e4b19be7314c3"
        "6191ad3acc2a4c381705c199012102caa3d96f8e4cee70c9e09f6177efe64a14a3f5"
        "df3a472ff49c00fd881ca5aa5cfeffffff41a3083de0e8279d5591073be8fc5d2f2c"
        "acc5c7c4789dfa0e54521da48870e5000000006a47304402203552f9d39c90aa9600"
        "a47fb922feb13823666b3970ef47bdb0be7b4173c324e402200ae5d60dba3f93bba9"
        "e85927f972dcfaddb61336e75166e15a8a79d367010e45012102d2cdc40e350eda7e"
        "c62b30cc9725039ad873d738453da9394c32c2625d9445f7feffffff0200e1f50500"
        "0000001976a9140d8bec3161ce0325100dc08b4b4ccea39846eff788acf5940f0000"
        "0000001976a914f840c86fce837bef7e711eef6951baae69070f8e88ac3d470700");

    {
        CDataStream s(txdata, SER_DISK, CLIENT_VERSION);
        const CTransaction tx(deserialize_type(), s);

        // v2 transaction; all (u)txids are just full hash
        auto expectedHash = Hash(txdata.begin(), txdata.end());

        BOOST_CHECK(tx.GetId() == expectedHash);
        BOOST_CHECK(tx.GetUtxid(MALFIX_MODE_ACTIVE) == expectedHash);
        BOOST_CHECK(tx.GetUtxid(MALFIX_MODE_INACTIVE) == expectedHash);
        BOOST_CHECK(tx.GetUtxid(MALFIX_MODE_LEGACY) == expectedHash);
    }


    // set version= 5
    txdata[0] = 5;
    {
        CDataStream s(txdata, SER_DISK, CLIENT_VERSION);
        const CTransaction tx(deserialize_type(), s);

        // v3 transaction; txids and MALFIX inactive is still full hash
        auto expectedHash = Hash(txdata.begin(), txdata.end());
        BOOST_CHECK(tx.GetId() == expectedHash);
        BOOST_CHECK(tx.GetUtxid(MALFIX_MODE_INACTIVE) == expectedHash);

        // with malfix active, cut out both input scripts
        txdata.erase(txdata.begin()+ 4+1+32+4,
                     txdata.begin()+ 4+1+32+4 +1+107);
        txdata.erase(txdata.begin()+ 4+1+32+4 +4+32+4,
                     txdata.begin()+ 4+1+32+4 +4+32+4 +1+106);
        auto expectedUtxid = Hash(txdata.begin(), txdata.end());

        BOOST_CHECK(tx.GetUtxid(MALFIX_MODE_ACTIVE) == expectedUtxid);
        BOOST_CHECK(tx.GetUtxid(MALFIX_MODE_LEGACY) == expectedUtxid);
    }

}

BOOST_AUTO_TEST_SUITE_END()
