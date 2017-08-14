// Copyright (c) 2012-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "consensus/consensus.h"
#include "consensus/validation.h"
#include "key.h"
#include "pubkey.h"
#include "script/script.h"
#include "script/standard.h"
#include "test/test_bitcoin.h"
#include "uint256.h"
#include "validation.h"

#include <limits>
#include <vector>

#include <boost/test/unit_test.hpp>

// Helpers:
static std::vector<uint8_t> Serialize(const CScript &s) {
    std::vector<uint8_t> sSerialized(s.begin(), s.end());
    return sSerialized;
}

BOOST_FIXTURE_TEST_SUITE(sigopcount_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(GetSigOpCount) {
    // Test CScript::GetSigOpCount()
    CScript s1;
    BOOST_CHECK_EQUAL(s1.GetSigOpCount(false), 0U);
    BOOST_CHECK_EQUAL(s1.GetSigOpCount(true), 0U);

    uint160 dummy;
    s1 << OP_1 << ToByteVector(dummy) << ToByteVector(dummy) << OP_2
       << OP_CHECKMULTISIG;
    BOOST_CHECK_EQUAL(s1.GetSigOpCount(true), 2U);
    s1 << OP_IF << OP_CHECKSIG << OP_ENDIF;
    BOOST_CHECK_EQUAL(s1.GetSigOpCount(true), 3U);
    BOOST_CHECK_EQUAL(s1.GetSigOpCount(false), 21U);

    CScript p2sh = GetScriptForDestination(CScriptID(s1));
    CScript scriptSig;
    scriptSig << OP_0 << Serialize(s1);
    BOOST_CHECK_EQUAL(p2sh.GetSigOpCount(scriptSig), 3U);

    std::vector<CPubKey> keys;
    for (int i = 0; i < 3; i++) {
        CKey k;
        k.MakeNewKey(true);
        keys.push_back(k.GetPubKey());
    }
    CScript s2 = GetScriptForMultisig(1, keys);
    BOOST_CHECK_EQUAL(s2.GetSigOpCount(true), 3U);
    BOOST_CHECK_EQUAL(s2.GetSigOpCount(false), 20U);

    p2sh = GetScriptForDestination(CScriptID(s2));
    BOOST_CHECK_EQUAL(p2sh.GetSigOpCount(true), 0U);
    BOOST_CHECK_EQUAL(p2sh.GetSigOpCount(false), 0U);
    CScript scriptSig2;
    scriptSig2 << OP_1 << ToByteVector(dummy) << ToByteVector(dummy)
               << Serialize(s2);
    BOOST_CHECK_EQUAL(p2sh.GetSigOpCount(scriptSig2), 3U);
}

/**
 * Verifies script execution of the zeroth scriptPubKey of tx output and zeroth
 * scriptSig and witness of tx input.
 */
ScriptError VerifyWithFlag(const CTransaction &output,
                           const CMutableTransaction &input, int flags) {
    ScriptError error;
    CTransaction inputi(input);
    bool ret = VerifyScript(
        inputi.vin[0].scriptSig, output.vout[0].scriptPubKey, flags,
        TransactionSignatureChecker(&inputi, 0, output.vout[0].nValue), &error);
    BOOST_CHECK((ret == true) == (error == SCRIPT_ERR_OK));

    return error;
}

/**
 * Builds a creationTx from scriptPubKey and a spendingTx from scriptSig and
 * witness such that spendingTx spends output zero of creationTx. Also inserts
 * creationTx's output into the coins view.
 */
void BuildTxs(CMutableTransaction &spendingTx, CCoinsViewCache &coins,
              CMutableTransaction &creationTx, const CScript &scriptPubKey,
              const CScript &scriptSig) {
    creationTx.nVersion = 1;
    creationTx.vin.resize(1);
    creationTx.vin[0].prevout.SetNull();
    creationTx.vin[0].scriptSig = CScript();
    creationTx.vout.resize(1);
    creationTx.vout[0].nValue = 1;
    creationTx.vout[0].scriptPubKey = scriptPubKey;

    spendingTx.nVersion = 1;
    spendingTx.vin.resize(1);
    spendingTx.vin[0].prevout.hash = creationTx.GetId();
    spendingTx.vin[0].prevout.n = 0;
    spendingTx.vin[0].scriptSig = scriptSig;
    spendingTx.vout.resize(1);
    spendingTx.vout[0].nValue = 1;
    spendingTx.vout[0].scriptPubKey = CScript();

    AddCoins(coins, creationTx, 0);
}

BOOST_AUTO_TEST_CASE(GetTxSigOpCost) {
    // Transaction creates outputs
    CMutableTransaction creationTx;
    // Transaction that spends outputs and whose sig op cost is going to be
    // tested
    CMutableTransaction spendingTx;

    // Create utxo set
    CCoinsView coinsDummy;
    CCoinsViewCache coins(&coinsDummy);
    // Create key
    CKey key;
    key.MakeNewKey(true);
    CPubKey pubkey = key.GetPubKey();
    // Default flags
    int flags = SCRIPT_VERIFY_P2SH;

    // Multisig script (legacy counting)
    {
        CScript scriptPubKey = CScript() << 1 << ToByteVector(pubkey)
                                         << ToByteVector(pubkey) << 2
                                         << OP_CHECKMULTISIGVERIFY;
        // Do not use a valid signature to avoid using wallet operations.
        CScript scriptSig = CScript() << OP_0 << OP_0;

        BuildTxs(spendingTx, coins, creationTx, scriptPubKey, scriptSig);
        // Legacy counting only includes signature operations in scriptSigs and
        // scriptPubKeys of a transaction and does not take the actual executed
        // sig operations into account. spendingTx in itself does not contain a
        // signature operation.
        assert(GetTransactionSigOpCount(CTransaction(spendingTx), coins,
                                        flags) == 0);
        // creationTx contains two signature operations in its scriptPubKey, but
        // legacy counting is not accurate.
        assert(GetTransactionSigOpCount(CTransaction(creationTx), coins,
                                        flags) == MAX_PUBKEYS_PER_MULTISIG);
        // Sanity check: script verification fails because of an invalid
        // signature.
        assert(VerifyWithFlag(creationTx, spendingTx, flags) ==
               SCRIPT_ERR_CHECKMULTISIGVERIFY);
    }

    // Multisig nested in P2SH
    {
        CScript redeemScript = CScript() << 1 << ToByteVector(pubkey)
                                         << ToByteVector(pubkey) << 2
                                         << OP_CHECKMULTISIGVERIFY;
        CScript scriptPubKey = GetScriptForDestination(CScriptID(redeemScript));
        CScript scriptSig = CScript() << OP_0 << OP_0
                                      << ToByteVector(redeemScript);

        BuildTxs(spendingTx, coins, creationTx, scriptPubKey, scriptSig);
        assert(GetTransactionSigOpCount(CTransaction(spendingTx), coins,
                                        flags) == 2);
        assert(VerifyWithFlag(creationTx, spendingTx, flags) ==
               SCRIPT_ERR_CHECKMULTISIGVERIFY);
    }
}

BOOST_AUTO_TEST_CASE(test_consensus_sigops_limit) {
    BOOST_CHECK_EQUAL(GetMaxBlockSigOpsCount(1), MAX_BLOCK_SIGOPS_PER_MB);
    BOOST_CHECK_EQUAL(GetMaxBlockSigOpsCount(123456), MAX_BLOCK_SIGOPS_PER_MB);
    BOOST_CHECK_EQUAL(GetMaxBlockSigOpsCount(1000000), MAX_BLOCK_SIGOPS_PER_MB);
    BOOST_CHECK_EQUAL(GetMaxBlockSigOpsCount(1000001),
                      2 * MAX_BLOCK_SIGOPS_PER_MB);
    BOOST_CHECK_EQUAL(GetMaxBlockSigOpsCount(1348592),
                      2 * MAX_BLOCK_SIGOPS_PER_MB);
    BOOST_CHECK_EQUAL(GetMaxBlockSigOpsCount(2000000),
                      2 * MAX_BLOCK_SIGOPS_PER_MB);
    BOOST_CHECK_EQUAL(GetMaxBlockSigOpsCount(2000001),
                      3 * MAX_BLOCK_SIGOPS_PER_MB);
    BOOST_CHECK_EQUAL(GetMaxBlockSigOpsCount(2654321),
                      3 * MAX_BLOCK_SIGOPS_PER_MB);
    BOOST_CHECK_EQUAL(
        GetMaxBlockSigOpsCount(std::numeric_limits<uint32_t>::max()),
        4295 * MAX_BLOCK_SIGOPS_PER_MB);
}

BOOST_AUTO_TEST_CASE(test_max_sigops_per_tx) {
    CMutableTransaction tx;
    tx.nVersion = 1;
    tx.vin.resize(1);
    tx.vin[0].prevout.hash = GetRandHash();
    tx.vin[0].prevout.n = 0;
    tx.vin[0].scriptSig = CScript();
    tx.vout.resize(1);
    tx.vout[0].nValue = 1;
    tx.vout[0].scriptPubKey = CScript();

    {
        CValidationState state;
        BOOST_CHECK(CheckRegularTransaction(tx, state, false));
    }

    // Get just before the limit.
    for (size_t i = 0; i < MAX_TX_SIGOPS_COUNT; i++) {
        tx.vout[0].scriptPubKey << OP_CHECKSIG;
    }

    {
        CValidationState state;
        BOOST_CHECK(CheckRegularTransaction(tx, state, false));
    }

    // And go over.
    tx.vout[0].scriptPubKey << OP_CHECKSIG;

    {
        CValidationState state;
        BOOST_CHECK(!CheckRegularTransaction(tx, state, false));
        BOOST_CHECK_EQUAL(state.GetRejectReason(), "bad-txn-sigops");
    }
}

BOOST_AUTO_TEST_SUITE_END()
