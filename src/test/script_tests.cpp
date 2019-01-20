// Copyright (c) 2011-2016 The Bitcoin Core developers
// Copyright (c) 2017-2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "data/script_tests.json.h"

#include "core_io.h"
#include "key.h"
#include "keystore.h"
#include "rpc/server.h"
#include "script/script.h"
#include "script/script_error.h"
#include "script/sighashtype.h"
#include "script/sign.h"
#include "test/jsonutil.h"
#include "test/scriptflags.h"
#include "test/sigutil.h"
#include "test/test_bitcoin.h"
#include "util.h"
#include "utilstrencodings.h"

#if defined(HAVE_CONSENSUS_LIB)
#include "script/bitcoinconsensus.h"
#endif

#include <cstdint>
#include <fstream>
#include <string>
#include <vector>

#include <boost/test/unit_test.hpp>

#include <univalue.h>

// Uncomment if you want to output updated JSON tests.
// #define UPDATE_JSON_TESTS

static const uint32_t gFlags = SCRIPT_VERIFY_P2SH | SCRIPT_VERIFY_STRICTENC;

struct ScriptErrorDesc {
    ScriptError_t err;
    const char *name;
};

static ScriptErrorDesc script_errors[] = {
    {SCRIPT_ERR_OK, "OK"},
    {SCRIPT_ERR_UNKNOWN_ERROR, "UNKNOWN_ERROR"},
    {SCRIPT_ERR_EVAL_FALSE, "EVAL_FALSE"},
    {SCRIPT_ERR_OP_RETURN, "OP_RETURN"},
    {SCRIPT_ERR_SCRIPT_SIZE, "SCRIPT_SIZE"},
    {SCRIPT_ERR_PUSH_SIZE, "PUSH_SIZE"},
    {SCRIPT_ERR_OP_COUNT, "OP_COUNT"},
    {SCRIPT_ERR_STACK_SIZE, "STACK_SIZE"},
    {SCRIPT_ERR_SIG_COUNT, "SIG_COUNT"},
    {SCRIPT_ERR_PUBKEY_COUNT, "PUBKEY_COUNT"},
    {SCRIPT_ERR_INVALID_OPERAND_SIZE, "OPERAND_SIZE"},
    {SCRIPT_ERR_INVALID_NUMBER_RANGE, "INVALID_NUMBER_RANGE"},
    {SCRIPT_ERR_IMPOSSIBLE_ENCODING, "IMPOSSIBLE_ENCODING"},
    {SCRIPT_ERR_INVALID_SPLIT_RANGE, "SPLIT_RANGE"},
    {SCRIPT_ERR_VERIFY, "VERIFY"},
    {SCRIPT_ERR_EQUALVERIFY, "EQUALVERIFY"},
    {SCRIPT_ERR_CHECKMULTISIGVERIFY, "CHECKMULTISIGVERIFY"},
    {SCRIPT_ERR_CHECKSIGVERIFY, "CHECKSIGVERIFY"},
    {SCRIPT_ERR_CHECKDATASIGVERIFY, "CHECKDATASIGVERIFY"},
    {SCRIPT_ERR_NUMEQUALVERIFY, "NUMEQUALVERIFY"},
    {SCRIPT_ERR_BAD_OPCODE, "BAD_OPCODE"},
    {SCRIPT_ERR_DISABLED_OPCODE, "DISABLED_OPCODE"},
    {SCRIPT_ERR_INVALID_STACK_OPERATION, "INVALID_STACK_OPERATION"},
    {SCRIPT_ERR_INVALID_ALTSTACK_OPERATION, "INVALID_ALTSTACK_OPERATION"},
    {SCRIPT_ERR_UNBALANCED_CONDITIONAL, "UNBALANCED_CONDITIONAL"},
    {SCRIPT_ERR_NEGATIVE_LOCKTIME, "NEGATIVE_LOCKTIME"},
    {SCRIPT_ERR_UNSATISFIED_LOCKTIME, "UNSATISFIED_LOCKTIME"},
    {SCRIPT_ERR_SIG_HASHTYPE, "SIG_HASHTYPE"},
    {SCRIPT_ERR_SIG_DER, "SIG_DER"},
    {SCRIPT_ERR_MINIMALDATA, "MINIMALDATA"},
    {SCRIPT_ERR_SIG_PUSHONLY, "SIG_PUSHONLY"},
    {SCRIPT_ERR_SIG_HIGH_S, "SIG_HIGH_S"},
    {SCRIPT_ERR_SIG_NULLDUMMY, "SIG_NULLDUMMY"},
    {SCRIPT_ERR_PUBKEYTYPE, "PUBKEYTYPE"},
    {SCRIPT_ERR_CLEANSTACK, "CLEANSTACK"},
    {SCRIPT_ERR_MINIMALIF, "MINIMALIF"},
    {SCRIPT_ERR_SIG_NULLFAIL, "NULLFAIL"},
    {SCRIPT_ERR_DISCOURAGE_UPGRADABLE_NOPS, "DISCOURAGE_UPGRADABLE_NOPS"},
    {SCRIPT_ERR_NONCOMPRESSED_PUBKEY, "NONCOMPRESSED_PUBKEY"},
    {SCRIPT_ERR_ILLEGAL_FORKID, "ILLEGAL_FORKID"},
    {SCRIPT_ERR_MUST_USE_FORKID, "MISSING_FORKID"},
    {SCRIPT_ERR_DIV_BY_ZERO, "DIV_BY_ZERO"},
    {SCRIPT_ERR_MOD_BY_ZERO, "MOD_BY_ZERO"},
};

const char *FormatScriptError(ScriptError_t err) {
    for (size_t i = 0; i < ARRAYLEN(script_errors); ++i) {
        if (script_errors[i].err == err) {
            return script_errors[i].name;
        }
    }

    BOOST_ERROR("Unknown scripterror enumeration value, update script_errors "
                "in script_tests.cpp.");
    return "";
}

ScriptError_t ParseScriptError(const std::string &name) {
    for (size_t i = 0; i < ARRAYLEN(script_errors); ++i) {
        if (script_errors[i].name == name) {
            return script_errors[i].err;
        }
    }

    BOOST_ERROR("Unknown scripterror \"" << name << "\" in test description");
    return SCRIPT_ERR_UNKNOWN_ERROR;
}

BOOST_FIXTURE_TEST_SUITE(script_tests, BasicTestingSetup)

static CMutableTransaction
BuildCreditingTransaction(const CScript &scriptPubKey, const Amount nValue) {
    CMutableTransaction txCredit;
    txCredit.nVersion = 1;
    txCredit.nLockTime = 0;
    txCredit.vin.resize(1);
    txCredit.vout.resize(1);
    txCredit.vin[0].prevout = COutPoint();
    txCredit.vin[0].scriptSig = CScript() << CScriptNum(0) << CScriptNum(0);
    txCredit.vin[0].nSequence = CTxIn::SEQUENCE_FINAL;
    txCredit.vout[0].scriptPubKey = scriptPubKey;
    txCredit.vout[0].nValue = nValue;

    return txCredit;
}

static CMutableTransaction
BuildSpendingTransaction(const CScript &scriptSig,
                         const CMutableTransaction &txCredit) {
    CMutableTransaction txSpend;
    txSpend.nVersion = 1;
    txSpend.nLockTime = 0;
    txSpend.vin.resize(1);
    txSpend.vout.resize(1);
    txSpend.vin[0].prevout = COutPoint(txCredit.GetId(), 0);
    txSpend.vin[0].scriptSig = scriptSig;
    txSpend.vin[0].nSequence = CTxIn::SEQUENCE_FINAL;
    txSpend.vout[0].scriptPubKey = CScript();
    txSpend.vout[0].nValue = txCredit.vout[0].nValue;

    return txSpend;
}

static void DoTest(const CScript &scriptPubKey, const CScript &scriptSig,
                   uint32_t flags, const std::string &message, int scriptError,
                   const Amount nValue) {
    bool expect = (scriptError == SCRIPT_ERR_OK);
    if (flags & SCRIPT_VERIFY_CLEANSTACK) {
        flags |= SCRIPT_VERIFY_P2SH;
    }

    ScriptError err;
    CMutableTransaction txCredit =
        BuildCreditingTransaction(scriptPubKey, nValue);
    CMutableTransaction tx = BuildSpendingTransaction(scriptSig, txCredit);
    CMutableTransaction tx2 = tx;
    BOOST_CHECK_MESSAGE(VerifyScript(scriptSig, scriptPubKey, flags,
                                     MutableTransactionSignatureChecker(
                                         &tx, 0, txCredit.vout[0].nValue),
                                     &err) == expect,
                        message);
    BOOST_CHECK_MESSAGE(
        err == scriptError,
        std::string(FormatScriptError(err)) + " where " +
            std::string(FormatScriptError((ScriptError_t)scriptError)) +
            " expected: " + message);
#if defined(HAVE_CONSENSUS_LIB)
    CDataStream stream(SER_NETWORK, PROTOCOL_VERSION);
    stream << tx2;
    uint32_t libconsensus_flags =
        flags & bitcoinconsensus_SCRIPT_FLAGS_VERIFY_ALL;
    if (libconsensus_flags == flags) {
        if (flags & bitcoinconsensus_SCRIPT_ENABLE_SIGHASH_FORKID) {
            BOOST_CHECK_MESSAGE(bitcoinconsensus_verify_script_with_amount(
                                    scriptPubKey.data(), scriptPubKey.size(),
                                    txCredit.vout[0].nValue / SATOSHI,
                                    (const uint8_t *)&stream[0], stream.size(),
                                    0, libconsensus_flags, nullptr) == expect,
                                message);
        } else {
            BOOST_CHECK_MESSAGE(bitcoinconsensus_verify_script_with_amount(
                                    scriptPubKey.data(), scriptPubKey.size(), 0,
                                    (const uint8_t *)&stream[0], stream.size(),
                                    0, libconsensus_flags, nullptr) == expect,
                                message);
            BOOST_CHECK_MESSAGE(bitcoinconsensus_verify_script(
                                    scriptPubKey.data(), scriptPubKey.size(),
                                    (const uint8_t *)&stream[0], stream.size(),
                                    0, libconsensus_flags, nullptr) == expect,
                                message);
        }
    }
#endif
}

namespace {
const uint8_t vchKey0[32] = {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                             0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1};
const uint8_t vchKey1[32] = {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                             0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0};
const uint8_t vchKey2[32] = {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                             0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0};

struct KeyData {
    CKey key0, key0C, key1, key1C, key2, key2C;
    CPubKey pubkey0, pubkey0C, pubkey0H;
    CPubKey pubkey1, pubkey1C;
    CPubKey pubkey2, pubkey2C;

    KeyData() {
        key0.Set(vchKey0, vchKey0 + 32, false);
        key0C.Set(vchKey0, vchKey0 + 32, true);
        pubkey0 = key0.GetPubKey();
        pubkey0H = key0.GetPubKey();
        pubkey0C = key0C.GetPubKey();
        *const_cast<uint8_t *>(&pubkey0H[0]) = 0x06 | (pubkey0H[64] & 1);

        key1.Set(vchKey1, vchKey1 + 32, false);
        key1C.Set(vchKey1, vchKey1 + 32, true);
        pubkey1 = key1.GetPubKey();
        pubkey1C = key1C.GetPubKey();

        key2.Set(vchKey2, vchKey2 + 32, false);
        key2C.Set(vchKey2, vchKey2 + 32, true);
        pubkey2 = key2.GetPubKey();
        pubkey2C = key2C.GetPubKey();
    }
};

class TestBuilder {
private:
    //! Actually executed script
    CScript script;
    //! The P2SH redeemscript
    CScript redeemscript;
    CTransactionRef creditTx;
    CMutableTransaction spendTx;
    bool havePush;
    std::vector<uint8_t> push;
    std::string comment;
    uint32_t flags;
    int scriptError;
    Amount nValue;

    void DoPush() {
        if (havePush) {
            spendTx.vin[0].scriptSig << push;
            havePush = false;
        }
    }

    void DoPush(const std::vector<uint8_t> &data) {
        DoPush();
        push = data;
        havePush = true;
    }

    std::vector<uint8_t> DoSign(const CKey &key, const uint256 &hash,
                                unsigned int lenR = 32,
                                unsigned int lenS = 32) const {
        std::vector<uint8_t> vchSig, r, s;
        uint32_t iter = 0;
        do {
            key.SignECDSA(hash, vchSig, iter++);
            if ((lenS == 33) != (vchSig[5 + vchSig[3]] == 33)) {
                NegateSignatureS(vchSig);
            }

            r = std::vector<uint8_t>(vchSig.begin() + 4,
                                     vchSig.begin() + 4 + vchSig[3]);
            s = std::vector<uint8_t>(vchSig.begin() + 6 + vchSig[3],
                                     vchSig.begin() + 6 + vchSig[3] +
                                         vchSig[5 + vchSig[3]]);
        } while (lenR != r.size() || lenS != s.size());

        return vchSig;
    }

public:
    TestBuilder(const CScript &script_, const std::string &comment_,
                uint32_t flags_, bool P2SH = false,
                Amount nValue_ = Amount::zero())
        : script(script_), havePush(false), comment(comment_), flags(flags_),
          scriptError(SCRIPT_ERR_OK), nValue(nValue_) {
        CScript scriptPubKey = script;
        if (P2SH) {
            redeemscript = scriptPubKey;
            scriptPubKey = CScript()
                           << OP_HASH160
                           << ToByteVector(CScriptID(redeemscript)) << OP_EQUAL;
        }
        creditTx =
            MakeTransactionRef(BuildCreditingTransaction(scriptPubKey, nValue));
        spendTx = BuildSpendingTransaction(CScript(), *creditTx);
    }

    TestBuilder &ScriptError(ScriptError_t err) {
        scriptError = err;
        return *this;
    }

    TestBuilder &Add(const CScript &_script) {
        DoPush();
        spendTx.vin[0].scriptSig += _script;
        return *this;
    }

    TestBuilder &Num(int num) {
        DoPush();
        spendTx.vin[0].scriptSig << num;
        return *this;
    }

    TestBuilder &Push(const std::string &hex) {
        DoPush(ParseHex(hex));
        return *this;
    }

    TestBuilder &Push(const uint256 &hash) {
        DoPush(ToByteVector(hash));
        return *this;
    }

    TestBuilder &Push(const CScript &_script) {
        DoPush(std::vector<uint8_t>(_script.begin(), _script.end()));
        return *this;
    }

    TestBuilder &PushSig(const CKey &key,
                         SigHashType sigHashType = SigHashType(),
                         unsigned int lenR = 32, unsigned int lenS = 32,
                         Amount amount = Amount::zero(),
                         uint32_t sigFlags = SCRIPT_ENABLE_SIGHASH_FORKID) {
        uint256 hash = SignatureHash(script, CTransaction(spendTx), 0,
                                     sigHashType, amount, nullptr, sigFlags);
        std::vector<uint8_t> vchSig = DoSign(key, hash, lenR, lenS);
        vchSig.push_back(static_cast<uint8_t>(sigHashType.getRawSigHashType()));
        DoPush(vchSig);
        return *this;
    }

    TestBuilder &PushDataSig(const CKey &key, const std::vector<uint8_t> &data,
                             unsigned int lenR = 32, unsigned int lenS = 32) {
        std::vector<uint8_t> vchHash(32);
        CSHA256().Write(data.data(), data.size()).Finalize(vchHash.data());

        DoPush(DoSign(key, uint256(vchHash), lenR, lenS));
        return *this;
    }

    TestBuilder &Push(const CPubKey &pubkey) {
        DoPush(std::vector<uint8_t>(pubkey.begin(), pubkey.end()));
        return *this;
    }

    TestBuilder &PushRedeem() {
        DoPush(std::vector<uint8_t>(redeemscript.begin(), redeemscript.end()));
        return *this;
    }

    TestBuilder &EditPush(unsigned int pos, const std::string &hexin,
                          const std::string &hexout) {
        assert(havePush);
        std::vector<uint8_t> datain = ParseHex(hexin);
        std::vector<uint8_t> dataout = ParseHex(hexout);
        assert(pos + datain.size() <= push.size());
        BOOST_CHECK_MESSAGE(
            std::vector<uint8_t>(push.begin() + pos,
                                 push.begin() + pos + datain.size()) == datain,
            comment);
        push.erase(push.begin() + pos, push.begin() + pos + datain.size());
        push.insert(push.begin() + pos, dataout.begin(), dataout.end());
        return *this;
    }

    TestBuilder &DamagePush(unsigned int pos) {
        assert(havePush);
        assert(pos < push.size());
        push[pos] ^= 1;
        return *this;
    }

    TestBuilder &Test() {
        // Make a copy so we can rollback the push.
        TestBuilder copy = *this;
        DoPush();
        DoTest(creditTx->vout[0].scriptPubKey, spendTx.vin[0].scriptSig, flags,
               comment, scriptError, nValue);
        *this = copy;
        return *this;
    }

    UniValue GetJSON() {
        DoPush();
        UniValue array(UniValue::VARR);
        if (nValue != Amount::zero()) {
            UniValue amount(UniValue::VARR);
            amount.push_back(ValueFromAmount(nValue));
            array.push_back(amount);
        }

        array.push_back(FormatScript(spendTx.vin[0].scriptSig));
        array.push_back(FormatScript(creditTx->vout[0].scriptPubKey));
        array.push_back(FormatScriptFlags(flags));
        array.push_back(FormatScriptError((ScriptError_t)scriptError));
        array.push_back(comment);
        return array;
    }

    std::string GetComment() const { return comment; }
};

std::string JSONPrettyPrint(const UniValue &univalue) {
    std::string ret = univalue.write(4);
    // Workaround for libunivalue pretty printer, which puts a space between
    // commas and newlines
    size_t pos = 0;
    while ((pos = ret.find(" \n", pos)) != std::string::npos) {
        ret.replace(pos, 2, "\n");
        pos++;
    }

    return ret;
}
} // namespace

BOOST_AUTO_TEST_CASE(script_build) {
    const KeyData keys;

    std::vector<TestBuilder> tests;

    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey0) << OP_CHECKSIG,
                    "P2PK", 0)
            .PushSig(keys.key0));
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey0) << OP_CHECKSIG,
                    "P2PK, bad sig", 0)
            .PushSig(keys.key0)
            .DamagePush(10)
            .ScriptError(SCRIPT_ERR_EVAL_FALSE));

    tests.push_back(TestBuilder(CScript() << OP_DUP << OP_HASH160
                                          << ToByteVector(keys.pubkey1C.GetID())
                                          << OP_EQUALVERIFY << OP_CHECKSIG,
                                "P2PKH", 0)
                        .PushSig(keys.key1)
                        .Push(keys.pubkey1C));
    tests.push_back(TestBuilder(CScript() << OP_DUP << OP_HASH160
                                          << ToByteVector(keys.pubkey2C.GetID())
                                          << OP_EQUALVERIFY << OP_CHECKSIG,
                                "P2PKH, bad pubkey", 0)
                        .PushSig(keys.key2)
                        .Push(keys.pubkey2C)
                        .DamagePush(5)
                        .ScriptError(SCRIPT_ERR_EQUALVERIFY));

    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey1) << OP_CHECKSIG,
                    "P2PK anyonecanpay", 0)
            .PushSig(keys.key1, SigHashType().withAnyoneCanPay()));
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey1) << OP_CHECKSIG,
                    "P2PK anyonecanpay marked with normal hashtype", 0)
            .PushSig(keys.key1, SigHashType().withAnyoneCanPay())
            .EditPush(70, "81", "01")
            .ScriptError(SCRIPT_ERR_EVAL_FALSE));

    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey0C) << OP_CHECKSIG,
                    "P2SH(P2PK)", SCRIPT_VERIFY_P2SH, true)
            .PushSig(keys.key0)
            .PushRedeem());
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey0C) << OP_CHECKSIG,
                    "P2SH(P2PK), bad redeemscript", SCRIPT_VERIFY_P2SH, true)
            .PushSig(keys.key0)
            .PushRedeem()
            .DamagePush(10)
            .ScriptError(SCRIPT_ERR_EVAL_FALSE));

    tests.push_back(TestBuilder(CScript() << OP_DUP << OP_HASH160
                                          << ToByteVector(keys.pubkey0.GetID())
                                          << OP_EQUALVERIFY << OP_CHECKSIG,
                                "P2SH(P2PKH)", SCRIPT_VERIFY_P2SH, true)
                        .PushSig(keys.key0)
                        .Push(keys.pubkey0)
                        .PushRedeem());
    tests.push_back(TestBuilder(CScript() << OP_DUP << OP_HASH160
                                          << ToByteVector(keys.pubkey1.GetID())
                                          << OP_EQUALVERIFY << OP_CHECKSIG,
                                "P2SH(P2PKH), bad sig but no VERIFY_P2SH", 0,
                                true)
                        .PushSig(keys.key0)
                        .DamagePush(10)
                        .PushRedeem());
    tests.push_back(TestBuilder(CScript() << OP_DUP << OP_HASH160
                                          << ToByteVector(keys.pubkey1.GetID())
                                          << OP_EQUALVERIFY << OP_CHECKSIG,
                                "P2SH(P2PKH), bad sig", SCRIPT_VERIFY_P2SH,
                                true)
                        .PushSig(keys.key0)
                        .DamagePush(10)
                        .PushRedeem()
                        .ScriptError(SCRIPT_ERR_EQUALVERIFY));

    tests.push_back(TestBuilder(CScript() << OP_3 << ToByteVector(keys.pubkey0C)
                                          << ToByteVector(keys.pubkey1C)
                                          << ToByteVector(keys.pubkey2C) << OP_3
                                          << OP_CHECKMULTISIG,
                                "3-of-3", 0)
                        .Num(0)
                        .PushSig(keys.key0)
                        .PushSig(keys.key1)
                        .PushSig(keys.key2));
    tests.push_back(TestBuilder(CScript() << OP_3 << ToByteVector(keys.pubkey0C)
                                          << ToByteVector(keys.pubkey1C)
                                          << ToByteVector(keys.pubkey2C) << OP_3
                                          << OP_CHECKMULTISIG,
                                "3-of-3, 2 sigs", 0)
                        .Num(0)
                        .PushSig(keys.key0)
                        .PushSig(keys.key1)
                        .Num(0)
                        .ScriptError(SCRIPT_ERR_EVAL_FALSE));

    tests.push_back(TestBuilder(CScript() << OP_2 << ToByteVector(keys.pubkey0C)
                                          << ToByteVector(keys.pubkey1C)
                                          << ToByteVector(keys.pubkey2C) << OP_3
                                          << OP_CHECKMULTISIG,
                                "P2SH(2-of-3)", SCRIPT_VERIFY_P2SH, true)
                        .Num(0)
                        .PushSig(keys.key1)
                        .PushSig(keys.key2)
                        .PushRedeem());
    tests.push_back(TestBuilder(CScript() << OP_2 << ToByteVector(keys.pubkey0C)
                                          << ToByteVector(keys.pubkey1C)
                                          << ToByteVector(keys.pubkey2C) << OP_3
                                          << OP_CHECKMULTISIG,
                                "P2SH(2-of-3), 1 sig", SCRIPT_VERIFY_P2SH, true)
                        .Num(0)
                        .PushSig(keys.key1)
                        .Num(0)
                        .PushRedeem()
                        .ScriptError(SCRIPT_ERR_EVAL_FALSE));

    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey1C) << OP_CHECKSIG,
                    "P2PK with too much R padding but no DERSIG", 0)
            .PushSig(keys.key1, SigHashType(), 31, 32)
            .EditPush(1, "43021F", "44022000"));
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey1C) << OP_CHECKSIG,
                    "P2PK with too much R padding", SCRIPT_VERIFY_DERSIG)
            .PushSig(keys.key1, SigHashType(), 31, 32)
            .EditPush(1, "43021F", "44022000")
            .ScriptError(SCRIPT_ERR_SIG_DER));
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey1C) << OP_CHECKSIG,
                    "P2PK with too much S padding but no DERSIG", 0)
            .PushSig(keys.key1)
            .EditPush(1, "44", "45")
            .EditPush(37, "20", "2100"));
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey1C) << OP_CHECKSIG,
                    "P2PK with too much S padding", SCRIPT_VERIFY_DERSIG)
            .PushSig(keys.key1)
            .EditPush(1, "44", "45")
            .EditPush(37, "20", "2100")
            .ScriptError(SCRIPT_ERR_SIG_DER));
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey1C) << OP_CHECKSIG,
                    "P2PK with too little R padding but no DERSIG", 0)
            .PushSig(keys.key1, SigHashType(), 33, 32)
            .EditPush(1, "45022100", "440220"));
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey1C) << OP_CHECKSIG,
                    "P2PK with too little R padding", SCRIPT_VERIFY_DERSIG)
            .PushSig(keys.key1, SigHashType(), 33, 32)
            .EditPush(1, "45022100", "440220")
            .ScriptError(SCRIPT_ERR_SIG_DER));
    tests.push_back(
        TestBuilder(
            CScript() << ToByteVector(keys.pubkey2C) << OP_CHECKSIG << OP_NOT,
            "P2PK NOT with bad sig with too much R padding but no DERSIG", 0)
            .PushSig(keys.key2, SigHashType(), 31, 32)
            .EditPush(1, "43021F", "44022000")
            .DamagePush(10));
    tests.push_back(TestBuilder(CScript() << ToByteVector(keys.pubkey2C)
                                          << OP_CHECKSIG << OP_NOT,
                                "P2PK NOT with bad sig with too much R padding",
                                SCRIPT_VERIFY_DERSIG)
                        .PushSig(keys.key2, SigHashType(), 31, 32)
                        .EditPush(1, "43021F", "44022000")
                        .DamagePush(10)
                        .ScriptError(SCRIPT_ERR_SIG_DER));
    tests.push_back(
        TestBuilder(CScript()
                        << ToByteVector(keys.pubkey2C) << OP_CHECKSIG << OP_NOT,
                    "P2PK NOT with too much R padding but no DERSIG", 0)
            .PushSig(keys.key2, SigHashType(), 31, 32)
            .EditPush(1, "43021F", "44022000")
            .ScriptError(SCRIPT_ERR_EVAL_FALSE));
    tests.push_back(TestBuilder(CScript() << ToByteVector(keys.pubkey2C)
                                          << OP_CHECKSIG << OP_NOT,
                                "P2PK NOT with too much R padding",
                                SCRIPT_VERIFY_DERSIG)
                        .PushSig(keys.key2, SigHashType(), 31, 32)
                        .EditPush(1, "43021F", "44022000")
                        .ScriptError(SCRIPT_ERR_SIG_DER));

    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey1C) << OP_CHECKSIG,
                    "BIP66 example 1, without DERSIG", 0)
            .PushSig(keys.key1, SigHashType(), 33, 32)
            .EditPush(1, "45022100", "440220"));
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey1C) << OP_CHECKSIG,
                    "BIP66 example 1, with DERSIG", SCRIPT_VERIFY_DERSIG)
            .PushSig(keys.key1, SigHashType(), 33, 32)
            .EditPush(1, "45022100", "440220")
            .ScriptError(SCRIPT_ERR_SIG_DER));
    tests.push_back(TestBuilder(CScript() << ToByteVector(keys.pubkey1C)
                                          << OP_CHECKSIG << OP_NOT,
                                "BIP66 example 2, without DERSIG", 0)
                        .PushSig(keys.key1, SigHashType(), 33, 32)
                        .EditPush(1, "45022100", "440220")
                        .ScriptError(SCRIPT_ERR_EVAL_FALSE));
    tests.push_back(TestBuilder(CScript() << ToByteVector(keys.pubkey1C)
                                          << OP_CHECKSIG << OP_NOT,
                                "BIP66 example 2, with DERSIG",
                                SCRIPT_VERIFY_DERSIG)
                        .PushSig(keys.key1, SigHashType(), 33, 32)
                        .EditPush(1, "45022100", "440220")
                        .ScriptError(SCRIPT_ERR_SIG_DER));
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey1C) << OP_CHECKSIG,
                    "BIP66 example 3, without DERSIG", 0)
            .Num(0)
            .ScriptError(SCRIPT_ERR_EVAL_FALSE));
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey1C) << OP_CHECKSIG,
                    "BIP66 example 3, with DERSIG", SCRIPT_VERIFY_DERSIG)
            .Num(0)
            .ScriptError(SCRIPT_ERR_EVAL_FALSE));
    tests.push_back(TestBuilder(CScript() << ToByteVector(keys.pubkey1C)
                                          << OP_CHECKSIG << OP_NOT,
                                "BIP66 example 4, without DERSIG", 0)
                        .Num(0));
    tests.push_back(TestBuilder(CScript() << ToByteVector(keys.pubkey1C)
                                          << OP_CHECKSIG << OP_NOT,
                                "BIP66 example 4, with DERSIG",
                                SCRIPT_VERIFY_DERSIG)
                        .Num(0));
    tests.push_back(
        TestBuilder(
            CScript() << ToByteVector(keys.pubkey1C) << OP_CHECKSIG << OP_NOT,
            "BIP66 example 4, with DERSIG, non-null DER-compliant signature",
            SCRIPT_VERIFY_DERSIG)
            .Push("300602010102010101"));
    tests.push_back(TestBuilder(CScript() << ToByteVector(keys.pubkey1C)
                                          << OP_CHECKSIG << OP_NOT,
                                "BIP66 example 4, with DERSIG and NULLFAIL",
                                SCRIPT_VERIFY_DERSIG | SCRIPT_VERIFY_NULLFAIL)
                        .Num(0));
    tests.push_back(TestBuilder(CScript() << ToByteVector(keys.pubkey1C)
                                          << OP_CHECKSIG << OP_NOT,
                                "BIP66 example 4, with DERSIG and NULLFAIL, "
                                "non-null DER-compliant signature",
                                SCRIPT_VERIFY_DERSIG | SCRIPT_VERIFY_NULLFAIL)
                        .Push("300602010102010101")
                        .ScriptError(SCRIPT_ERR_SIG_NULLFAIL));
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey1C) << OP_CHECKSIG,
                    "BIP66 example 5, without DERSIG", 0)
            .Num(1)
            .ScriptError(SCRIPT_ERR_EVAL_FALSE));
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey1C) << OP_CHECKSIG,
                    "BIP66 example 5, with DERSIG", SCRIPT_VERIFY_DERSIG)
            .Num(1)
            .ScriptError(SCRIPT_ERR_SIG_DER));
    tests.push_back(TestBuilder(CScript() << ToByteVector(keys.pubkey1C)
                                          << OP_CHECKSIG << OP_NOT,
                                "BIP66 example 6, without DERSIG", 0)
                        .Num(1));
    tests.push_back(TestBuilder(CScript() << ToByteVector(keys.pubkey1C)
                                          << OP_CHECKSIG << OP_NOT,
                                "BIP66 example 6, with DERSIG",
                                SCRIPT_VERIFY_DERSIG)
                        .Num(1)
                        .ScriptError(SCRIPT_ERR_SIG_DER));
    tests.push_back(TestBuilder(CScript() << OP_2 << ToByteVector(keys.pubkey1C)
                                          << ToByteVector(keys.pubkey2C) << OP_2
                                          << OP_CHECKMULTISIG,
                                "BIP66 example 7, without DERSIG", 0)
                        .Num(0)
                        .PushSig(keys.key1, SigHashType(), 33, 32)
                        .EditPush(1, "45022100", "440220")
                        .PushSig(keys.key2));
    tests.push_back(TestBuilder(CScript() << OP_2 << ToByteVector(keys.pubkey1C)
                                          << ToByteVector(keys.pubkey2C) << OP_2
                                          << OP_CHECKMULTISIG,
                                "BIP66 example 7, with DERSIG",
                                SCRIPT_VERIFY_DERSIG)
                        .Num(0)
                        .PushSig(keys.key1, SigHashType(), 33, 32)
                        .EditPush(1, "45022100", "440220")
                        .PushSig(keys.key2)
                        .ScriptError(SCRIPT_ERR_SIG_DER));
    tests.push_back(TestBuilder(CScript() << OP_2 << ToByteVector(keys.pubkey1C)
                                          << ToByteVector(keys.pubkey2C) << OP_2
                                          << OP_CHECKMULTISIG << OP_NOT,
                                "BIP66 example 8, without DERSIG", 0)
                        .Num(0)
                        .PushSig(keys.key1, SigHashType(), 33, 32)
                        .EditPush(1, "45022100", "440220")
                        .PushSig(keys.key2)
                        .ScriptError(SCRIPT_ERR_EVAL_FALSE));
    tests.push_back(TestBuilder(CScript() << OP_2 << ToByteVector(keys.pubkey1C)
                                          << ToByteVector(keys.pubkey2C) << OP_2
                                          << OP_CHECKMULTISIG << OP_NOT,
                                "BIP66 example 8, with DERSIG",
                                SCRIPT_VERIFY_DERSIG)
                        .Num(0)
                        .PushSig(keys.key1, SigHashType(), 33, 32)
                        .EditPush(1, "45022100", "440220")
                        .PushSig(keys.key2)
                        .ScriptError(SCRIPT_ERR_SIG_DER));
    tests.push_back(TestBuilder(CScript() << OP_2 << ToByteVector(keys.pubkey1C)
                                          << ToByteVector(keys.pubkey2C) << OP_2
                                          << OP_CHECKMULTISIG,
                                "BIP66 example 9, without DERSIG", 0)
                        .Num(0)
                        .Num(0)
                        .PushSig(keys.key2, SigHashType(), 33, 32)
                        .EditPush(1, "45022100", "440220")
                        .ScriptError(SCRIPT_ERR_EVAL_FALSE));
    tests.push_back(TestBuilder(CScript() << OP_2 << ToByteVector(keys.pubkey1C)
                                          << ToByteVector(keys.pubkey2C) << OP_2
                                          << OP_CHECKMULTISIG,
                                "BIP66 example 9, with DERSIG",
                                SCRIPT_VERIFY_DERSIG)
                        .Num(0)
                        .Num(0)
                        .PushSig(keys.key2, SigHashType(), 33, 32)
                        .EditPush(1, "45022100", "440220")
                        .ScriptError(SCRIPT_ERR_SIG_DER));
    tests.push_back(TestBuilder(CScript() << OP_2 << ToByteVector(keys.pubkey1C)
                                          << ToByteVector(keys.pubkey2C) << OP_2
                                          << OP_CHECKMULTISIG << OP_NOT,
                                "BIP66 example 10, without DERSIG", 0)
                        .Num(0)
                        .Num(0)
                        .PushSig(keys.key2, SigHashType(), 33, 32)
                        .EditPush(1, "45022100", "440220"));
    tests.push_back(TestBuilder(CScript() << OP_2 << ToByteVector(keys.pubkey1C)
                                          << ToByteVector(keys.pubkey2C) << OP_2
                                          << OP_CHECKMULTISIG << OP_NOT,
                                "BIP66 example 10, with DERSIG",
                                SCRIPT_VERIFY_DERSIG)
                        .Num(0)
                        .Num(0)
                        .PushSig(keys.key2, SigHashType(), 33, 32)
                        .EditPush(1, "45022100", "440220")
                        .ScriptError(SCRIPT_ERR_SIG_DER));
    tests.push_back(TestBuilder(CScript() << OP_2 << ToByteVector(keys.pubkey1C)
                                          << ToByteVector(keys.pubkey2C) << OP_2
                                          << OP_CHECKMULTISIG,
                                "BIP66 example 11, without DERSIG", 0)
                        .Num(0)
                        .PushSig(keys.key1, SigHashType(), 33, 32)
                        .EditPush(1, "45022100", "440220")
                        .Num(0)
                        .ScriptError(SCRIPT_ERR_EVAL_FALSE));
    tests.push_back(TestBuilder(CScript() << OP_2 << ToByteVector(keys.pubkey1C)
                                          << ToByteVector(keys.pubkey2C) << OP_2
                                          << OP_CHECKMULTISIG,
                                "BIP66 example 11, with DERSIG",
                                SCRIPT_VERIFY_DERSIG)
                        .Num(0)
                        .PushSig(keys.key1, SigHashType(), 33, 32)
                        .EditPush(1, "45022100", "440220")
                        .Num(0)
                        .ScriptError(SCRIPT_ERR_EVAL_FALSE));
    tests.push_back(TestBuilder(CScript() << OP_2 << ToByteVector(keys.pubkey1C)
                                          << ToByteVector(keys.pubkey2C) << OP_2
                                          << OP_CHECKMULTISIG << OP_NOT,
                                "BIP66 example 12, without DERSIG", 0)
                        .Num(0)
                        .PushSig(keys.key1, SigHashType(), 33, 32)
                        .EditPush(1, "45022100", "440220")
                        .Num(0));
    tests.push_back(TestBuilder(CScript() << OP_2 << ToByteVector(keys.pubkey1C)
                                          << ToByteVector(keys.pubkey2C) << OP_2
                                          << OP_CHECKMULTISIG << OP_NOT,
                                "BIP66 example 12, with DERSIG",
                                SCRIPT_VERIFY_DERSIG)
                        .Num(0)
                        .PushSig(keys.key1, SigHashType(), 33, 32)
                        .EditPush(1, "45022100", "440220")
                        .Num(0));
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey2C) << OP_CHECKSIG,
                    "P2PK with multi-byte hashtype, without DERSIG", 0)
            .PushSig(keys.key2)
            .EditPush(70, "01", "0101"));
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey2C) << OP_CHECKSIG,
                    "P2PK with multi-byte hashtype, with DERSIG",
                    SCRIPT_VERIFY_DERSIG)
            .PushSig(keys.key2)
            .EditPush(70, "01", "0101")
            .ScriptError(SCRIPT_ERR_SIG_DER));

    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey2C) << OP_CHECKSIG,
                    "P2PK with high S but no LOW_S", 0)
            .PushSig(keys.key2, SigHashType(), 32, 33));
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey2C) << OP_CHECKSIG,
                    "P2PK with high S", SCRIPT_VERIFY_LOW_S)
            .PushSig(keys.key2, SigHashType(), 32, 33)
            .ScriptError(SCRIPT_ERR_SIG_HIGH_S));

    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey0H) << OP_CHECKSIG,
                    "P2PK with hybrid pubkey but no STRICTENC", 0)
            .PushSig(keys.key0));
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey0H) << OP_CHECKSIG,
                    "P2PK with hybrid pubkey", SCRIPT_VERIFY_STRICTENC)
            .PushSig(keys.key0, SigHashType())
            .ScriptError(SCRIPT_ERR_PUBKEYTYPE));
    tests.push_back(TestBuilder(CScript() << ToByteVector(keys.pubkey0H)
                                          << OP_CHECKSIG << OP_NOT,
                                "P2PK NOT with hybrid pubkey but no STRICTENC",
                                0)
                        .PushSig(keys.key0)
                        .ScriptError(SCRIPT_ERR_EVAL_FALSE));
    tests.push_back(TestBuilder(CScript() << ToByteVector(keys.pubkey0H)
                                          << OP_CHECKSIG << OP_NOT,
                                "P2PK NOT with hybrid pubkey",
                                SCRIPT_VERIFY_STRICTENC)
                        .PushSig(keys.key0)
                        .ScriptError(SCRIPT_ERR_PUBKEYTYPE));
    tests.push_back(
        TestBuilder(CScript()
                        << ToByteVector(keys.pubkey0H) << OP_CHECKSIG << OP_NOT,
                    "P2PK NOT with invalid hybrid pubkey but no STRICTENC", 0)
            .PushSig(keys.key0)
            .DamagePush(10));
    tests.push_back(TestBuilder(CScript() << ToByteVector(keys.pubkey0H)
                                          << OP_CHECKSIG << OP_NOT,
                                "P2PK NOT with invalid hybrid pubkey",
                                SCRIPT_VERIFY_STRICTENC)
                        .PushSig(keys.key0)
                        .DamagePush(10)
                        .ScriptError(SCRIPT_ERR_PUBKEYTYPE));
    tests.push_back(
        TestBuilder(CScript() << OP_1 << ToByteVector(keys.pubkey0H)
                              << ToByteVector(keys.pubkey1C) << OP_2
                              << OP_CHECKMULTISIG,
                    "1-of-2 with the second 1 hybrid pubkey and no STRICTENC",
                    0)
            .Num(0)
            .PushSig(keys.key1));
    tests.push_back(TestBuilder(CScript() << OP_1 << ToByteVector(keys.pubkey0H)
                                          << ToByteVector(keys.pubkey1C) << OP_2
                                          << OP_CHECKMULTISIG,
                                "1-of-2 with the second 1 hybrid pubkey",
                                SCRIPT_VERIFY_STRICTENC)
                        .Num(0)
                        .PushSig(keys.key1));
    tests.push_back(TestBuilder(CScript() << OP_1 << ToByteVector(keys.pubkey1C)
                                          << ToByteVector(keys.pubkey0H) << OP_2
                                          << OP_CHECKMULTISIG,
                                "1-of-2 with the first 1 hybrid pubkey",
                                SCRIPT_VERIFY_STRICTENC)
                        .Num(0)
                        .PushSig(keys.key1)
                        .ScriptError(SCRIPT_ERR_PUBKEYTYPE));

    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey1) << OP_CHECKSIG,
                    "P2PK with undefined hashtype but no STRICTENC", 0)
            .PushSig(keys.key1, SigHashType(5)));
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey1) << OP_CHECKSIG,
                    "P2PK with undefined hashtype", SCRIPT_VERIFY_STRICTENC)
            .PushSig(keys.key1, SigHashType(5))
            .ScriptError(SCRIPT_ERR_SIG_HASHTYPE));

    // Generate P2PKH tests for invalid SigHashType
    tests.push_back(
        TestBuilder(CScript() << OP_DUP << OP_HASH160
                              << ToByteVector(keys.pubkey0.GetID())
                              << OP_EQUALVERIFY << OP_CHECKSIG,
                    "P2PKH with invalid sighashtype", 0)
            .PushSig(keys.key0, SigHashType(0x21), 32, 32, Amount::zero(), 0)
            .Push(keys.pubkey0));
    tests.push_back(TestBuilder(CScript() << OP_DUP << OP_HASH160
                                          << ToByteVector(keys.pubkey0.GetID())
                                          << OP_EQUALVERIFY << OP_CHECKSIG,
                                "P2PKH with invalid sighashtype and STRICTENC",
                                SCRIPT_VERIFY_STRICTENC)
                        .PushSig(keys.key0, SigHashType(0x21), 32, 32,
                                 Amount::zero(), SCRIPT_VERIFY_STRICTENC)
                        .Push(keys.pubkey0)
                        // Should fail for STRICTENC
                        .ScriptError(SCRIPT_ERR_SIG_HASHTYPE));

    // Generate P2SH tests for invalid SigHashType
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey1) << OP_CHECKSIG,
                    "P2SH(P2PK) with invalid sighashtype", SCRIPT_VERIFY_P2SH,
                    true)
            .PushSig(keys.key1, SigHashType(0x21))
            .PushRedeem());
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey1) << OP_CHECKSIG,
                    "P2SH(P2PK) with invalid sighashtype and STRICTENC",
                    SCRIPT_VERIFY_P2SH | SCRIPT_VERIFY_STRICTENC, true)
            .PushSig(keys.key1, SigHashType(0x21))
            .PushRedeem()
            // Should fail for STRICTENC
            .ScriptError(SCRIPT_ERR_SIG_HASHTYPE));

    tests.push_back(
        TestBuilder(
            CScript() << ToByteVector(keys.pubkey1) << OP_CHECKSIG << OP_NOT,
            "P2PK NOT with invalid sig and undefined hashtype but no STRICTENC",
            0)
            .PushSig(keys.key1, SigHashType(5))
            .DamagePush(10));
    tests.push_back(
        TestBuilder(CScript()
                        << ToByteVector(keys.pubkey1) << OP_CHECKSIG << OP_NOT,
                    "P2PK NOT with invalid sig and undefined hashtype",
                    SCRIPT_VERIFY_STRICTENC)
            .PushSig(keys.key1, SigHashType(5))
            .DamagePush(10)
            .ScriptError(SCRIPT_ERR_SIG_HASHTYPE));

    tests.push_back(TestBuilder(CScript() << OP_3 << ToByteVector(keys.pubkey0C)
                                          << ToByteVector(keys.pubkey1C)
                                          << ToByteVector(keys.pubkey2C) << OP_3
                                          << OP_CHECKMULTISIG,
                                "3-of-3 with nonzero dummy but no NULLDUMMY", 0)
                        .Num(1)
                        .PushSig(keys.key0)
                        .PushSig(keys.key1)
                        .PushSig(keys.key2));
    tests.push_back(TestBuilder(CScript() << OP_3 << ToByteVector(keys.pubkey0C)
                                          << ToByteVector(keys.pubkey1C)
                                          << ToByteVector(keys.pubkey2C) << OP_3
                                          << OP_CHECKMULTISIG,
                                "3-of-3 with nonzero dummy",
                                SCRIPT_VERIFY_NULLDUMMY)
                        .Num(1)
                        .PushSig(keys.key0)
                        .PushSig(keys.key1)
                        .PushSig(keys.key2)
                        .ScriptError(SCRIPT_ERR_SIG_NULLDUMMY));
    tests.push_back(
        TestBuilder(
            CScript() << OP_3 << ToByteVector(keys.pubkey0C)
                      << ToByteVector(keys.pubkey1C)
                      << ToByteVector(keys.pubkey2C) << OP_3 << OP_CHECKMULTISIG
                      << OP_NOT,
            "3-of-3 NOT with invalid sig and nonzero dummy but no NULLDUMMY", 0)
            .Num(1)
            .PushSig(keys.key0)
            .PushSig(keys.key1)
            .PushSig(keys.key2)
            .DamagePush(10));
    tests.push_back(
        TestBuilder(CScript() << OP_3 << ToByteVector(keys.pubkey0C)
                              << ToByteVector(keys.pubkey1C)
                              << ToByteVector(keys.pubkey2C) << OP_3
                              << OP_CHECKMULTISIG << OP_NOT,
                    "3-of-3 NOT with invalid sig with nonzero dummy",
                    SCRIPT_VERIFY_NULLDUMMY)
            .Num(1)
            .PushSig(keys.key0)
            .PushSig(keys.key1)
            .PushSig(keys.key2)
            .DamagePush(10)
            .ScriptError(SCRIPT_ERR_SIG_NULLDUMMY));

    tests.push_back(TestBuilder(CScript() << OP_2 << ToByteVector(keys.pubkey1C)
                                          << ToByteVector(keys.pubkey1C) << OP_2
                                          << OP_CHECKMULTISIG,
                                "2-of-2 with two identical keys and sigs "
                                "pushed using OP_DUP but no SIGPUSHONLY",
                                0)
                        .Num(0)
                        .PushSig(keys.key1)
                        .Add(CScript() << OP_DUP));
    tests.push_back(
        TestBuilder(
            CScript() << OP_2 << ToByteVector(keys.pubkey1C)
                      << ToByteVector(keys.pubkey1C) << OP_2
                      << OP_CHECKMULTISIG,
            "2-of-2 with two identical keys and sigs pushed using OP_DUP",
            SCRIPT_VERIFY_SIGPUSHONLY)
            .Num(0)
            .PushSig(keys.key1)
            .Add(CScript() << OP_DUP)
            .ScriptError(SCRIPT_ERR_SIG_PUSHONLY));
    tests.push_back(
        TestBuilder(
            CScript() << ToByteVector(keys.pubkey2C) << OP_CHECKSIG,
            "P2SH(P2PK) with non-push scriptSig but no P2SH or SIGPUSHONLY", 0,
            true)
            .PushSig(keys.key2)
            .Add(CScript() << OP_NOP8)
            .PushRedeem());
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey2C) << OP_CHECKSIG,
                    "P2PK with non-push scriptSig but with P2SH validation", 0)
            .PushSig(keys.key2)
            .Add(CScript() << OP_NOP8));
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey2C) << OP_CHECKSIG,
                    "P2SH(P2PK) with non-push scriptSig but no SIGPUSHONLY",
                    SCRIPT_VERIFY_P2SH, true)
            .PushSig(keys.key2)
            .Add(CScript() << OP_NOP8)
            .PushRedeem()
            .ScriptError(SCRIPT_ERR_SIG_PUSHONLY));
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey2C) << OP_CHECKSIG,
                    "P2SH(P2PK) with non-push scriptSig but not P2SH",
                    SCRIPT_VERIFY_SIGPUSHONLY, true)
            .PushSig(keys.key2)
            .Add(CScript() << OP_NOP8)
            .PushRedeem()
            .ScriptError(SCRIPT_ERR_SIG_PUSHONLY));
    tests.push_back(
        TestBuilder(CScript() << OP_2 << ToByteVector(keys.pubkey1C)
                              << ToByteVector(keys.pubkey1C) << OP_2
                              << OP_CHECKMULTISIG,
                    "2-of-2 with two identical keys and sigs pushed",
                    SCRIPT_VERIFY_SIGPUSHONLY)
            .Num(0)
            .PushSig(keys.key1)
            .PushSig(keys.key1));
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey0) << OP_CHECKSIG,
                    "P2PK with unnecessary input but no CLEANSTACK",
                    SCRIPT_VERIFY_P2SH)
            .Num(11)
            .PushSig(keys.key0));
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey0) << OP_CHECKSIG,
                    "P2PK with unnecessary input",
                    SCRIPT_VERIFY_CLEANSTACK | SCRIPT_VERIFY_P2SH)
            .Num(11)
            .PushSig(keys.key0)
            .ScriptError(SCRIPT_ERR_CLEANSTACK));
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey0) << OP_CHECKSIG,
                    "P2SH with unnecessary input but no CLEANSTACK",
                    SCRIPT_VERIFY_P2SH, true)
            .Num(11)
            .PushSig(keys.key0)
            .PushRedeem());
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey0) << OP_CHECKSIG,
                    "P2SH with unnecessary input",
                    SCRIPT_VERIFY_CLEANSTACK | SCRIPT_VERIFY_P2SH, true)
            .Num(11)
            .PushSig(keys.key0)
            .PushRedeem()
            .ScriptError(SCRIPT_ERR_CLEANSTACK));
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey0) << OP_CHECKSIG,
                    "P2SH with CLEANSTACK",
                    SCRIPT_VERIFY_CLEANSTACK | SCRIPT_VERIFY_P2SH, true)
            .PushSig(keys.key0)
            .PushRedeem());

    static const Amount TEST_AMOUNT(int64_t(12345000000000) * SATOSHI);
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey0) << OP_CHECKSIG,
                    "P2PK FORKID", SCRIPT_ENABLE_SIGHASH_FORKID, false,
                    TEST_AMOUNT)
            .PushSig(keys.key0, SigHashType().withForkId(), 32, 32,
                     TEST_AMOUNT));

    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey0) << OP_CHECKSIG,
                    "P2PK INVALID AMOUNT", SCRIPT_ENABLE_SIGHASH_FORKID, false,
                    TEST_AMOUNT)
            .PushSig(keys.key0, SigHashType().withForkId(), 32, 32,
                     TEST_AMOUNT + SATOSHI)
            .ScriptError(SCRIPT_ERR_EVAL_FALSE));
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey0) << OP_CHECKSIG,
                    "P2PK INVALID FORKID", SCRIPT_VERIFY_STRICTENC, false,
                    TEST_AMOUNT)
            .PushSig(keys.key0, SigHashType().withForkId(), 32, 32, TEST_AMOUNT)
            .ScriptError(SCRIPT_ERR_ILLEGAL_FORKID));

    // Test replay protection
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey0) << OP_CHECKSIG,
                    "P2PK REPLAY PROTECTED",
                    SCRIPT_ENABLE_SIGHASH_FORKID |
                        SCRIPT_ENABLE_REPLAY_PROTECTION,
                    false, TEST_AMOUNT)
            .PushSig(keys.key0, SigHashType().withForkId(), 32, 32, TEST_AMOUNT,
                     SCRIPT_ENABLE_SIGHASH_FORKID |
                         SCRIPT_ENABLE_REPLAY_PROTECTION));

    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey0) << OP_CHECKSIG,
                    "P2PK REPLAY PROTECTED",
                    SCRIPT_ENABLE_SIGHASH_FORKID |
                        SCRIPT_ENABLE_REPLAY_PROTECTION,
                    false, TEST_AMOUNT)
            .PushSig(keys.key0, SigHashType().withForkId(), 32, 32, TEST_AMOUNT,
                     SCRIPT_ENABLE_SIGHASH_FORKID)
            .ScriptError(SCRIPT_ERR_EVAL_FALSE));

    // Test OP_CHECKDATASIG
    const uint32_t checkdatasigflags = SCRIPT_VERIFY_STRICTENC |
                                       SCRIPT_VERIFY_NULLFAIL |
                                       SCRIPT_ENABLE_CHECKDATASIG;

    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey1C) << OP_CHECKDATASIG,
                    "Standard CHECKDATASIG", checkdatasigflags)
            .PushDataSig(keys.key1, {})
            .Num(0));
    tests.push_back(TestBuilder(CScript() << ToByteVector(keys.pubkey1C)
                                          << OP_CHECKDATASIG << OP_NOT,
                                "CHECKDATASIG with NULLFAIL flags",
                                checkdatasigflags)
                        .PushDataSig(keys.key1, {})
                        .Num(1)
                        .ScriptError(SCRIPT_ERR_SIG_NULLFAIL));
    tests.push_back(TestBuilder(CScript() << ToByteVector(keys.pubkey1C)
                                          << OP_CHECKDATASIG << OP_NOT,
                                "CHECKDATASIG without NULLFAIL flags",
                                checkdatasigflags & ~SCRIPT_VERIFY_NULLFAIL)
                        .PushDataSig(keys.key1, {})
                        .Num(1));
    tests.push_back(TestBuilder(CScript() << ToByteVector(keys.pubkey1C)
                                          << OP_CHECKDATASIG << OP_NOT,
                                "CHECKDATASIG empty signature",
                                checkdatasigflags)
                        .Num(0)
                        .Num(0));
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey1C) << OP_CHECKDATASIG,
                    "CHECKDATASIG with High S but no Low S", checkdatasigflags)
            .PushDataSig(keys.key1, {}, 32, 33)
            .Num(0));
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey1C) << OP_CHECKDATASIG,
                    "CHECKDATASIG with High S",
                    checkdatasigflags | SCRIPT_VERIFY_LOW_S)
            .PushDataSig(keys.key1, {}, 32, 33)
            .Num(0)
            .ScriptError(SCRIPT_ERR_SIG_HIGH_S));
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey1C) << OP_CHECKDATASIG,
                    "CHECKDATASIG with too little R padding but no DERSIG",
                    checkdatasigflags & ~SCRIPT_VERIFY_STRICTENC)
            .PushDataSig(keys.key1, {}, 33, 32)
            .EditPush(1, "45022100", "440220")
            .Num(0));
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey1C) << OP_CHECKDATASIG,
                    "CHECKDATASIG with too little R padding", checkdatasigflags)
            .PushDataSig(keys.key1, {}, 33, 32)
            .EditPush(1, "45022100", "440220")
            .Num(0)
            .ScriptError(SCRIPT_ERR_SIG_DER));
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey0H) << OP_CHECKDATASIG,
                    "CHECKDATASIG with hybrid pubkey but no STRICTENC",
                    checkdatasigflags & ~SCRIPT_VERIFY_STRICTENC)
            .PushDataSig(keys.key0, {})
            .Num(0));
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey0H) << OP_CHECKDATASIG,
                    "CHECKDATASIG with hybrid pubkey", checkdatasigflags)
            .PushDataSig(keys.key0, {})
            .Num(0)
            .ScriptError(SCRIPT_ERR_PUBKEYTYPE));
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey0H) << OP_CHECKDATASIG
                              << OP_NOT,
                    "CHECKDATASIG with invalid hybrid pubkey but no STRICTENC",
                    SCRIPT_ENABLE_CHECKDATASIG)
            .PushDataSig(keys.key0, {})
            .DamagePush(10)
            .Num(0));
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey0H) << OP_CHECKDATASIG,
                    "CHECKDATASIG with invalid hybrid pubkey",
                    checkdatasigflags)
            .PushDataSig(keys.key0, {})
            .DamagePush(10)
            .Num(0)
            .ScriptError(SCRIPT_ERR_PUBKEYTYPE));

    // Test OP_CHECKDATASIGVERIFY
    tests.push_back(TestBuilder(CScript() << ToByteVector(keys.pubkey1C)
                                          << OP_CHECKDATASIGVERIFY << OP_TRUE,
                                "Standard CHECKDATASIGVERIFY",
                                checkdatasigflags)
                        .PushDataSig(keys.key1, {})
                        .Num(0));
    tests.push_back(TestBuilder(CScript() << ToByteVector(keys.pubkey1C)
                                          << OP_CHECKDATASIGVERIFY << OP_TRUE,
                                "CHECKDATASIGVERIFY with NULLFAIL flags",
                                checkdatasigflags)
                        .PushDataSig(keys.key1, {})
                        .Num(1)
                        .ScriptError(SCRIPT_ERR_SIG_NULLFAIL));
    tests.push_back(TestBuilder(CScript() << ToByteVector(keys.pubkey1C)
                                          << OP_CHECKDATASIGVERIFY << OP_TRUE,
                                "CHECKDATASIGVERIFY without NULLFAIL flags",
                                checkdatasigflags & ~SCRIPT_VERIFY_NULLFAIL)
                        .PushDataSig(keys.key1, {})
                        .Num(1)
                        .ScriptError(SCRIPT_ERR_CHECKDATASIGVERIFY));
    tests.push_back(TestBuilder(CScript() << ToByteVector(keys.pubkey1C)
                                          << OP_CHECKDATASIGVERIFY << OP_TRUE,
                                "CHECKDATASIGVERIFY empty signature",
                                checkdatasigflags)
                        .Num(0)
                        .Num(0)
                        .ScriptError(SCRIPT_ERR_CHECKDATASIGVERIFY));
    tests.push_back(TestBuilder(CScript() << ToByteVector(keys.pubkey1C)
                                          << OP_CHECKDATASIGVERIFY << OP_TRUE,
                                "CHECKDATASIG with High S but no Low S",
                                checkdatasigflags)
                        .PushDataSig(keys.key1, {}, 32, 33)
                        .Num(0));
    tests.push_back(TestBuilder(CScript() << ToByteVector(keys.pubkey1C)
                                          << OP_CHECKDATASIGVERIFY << OP_TRUE,
                                "CHECKDATASIG with High S",
                                checkdatasigflags | SCRIPT_VERIFY_LOW_S)
                        .PushDataSig(keys.key1, {}, 32, 33)
                        .Num(0)
                        .ScriptError(SCRIPT_ERR_SIG_HIGH_S));
    tests.push_back(
        TestBuilder(
            CScript() << ToByteVector(keys.pubkey1C) << OP_CHECKDATASIGVERIFY
                      << OP_TRUE,
            "CHECKDATASIGVERIFY with too little R padding but no DERSIG",
            checkdatasigflags & ~SCRIPT_VERIFY_STRICTENC)
            .PushDataSig(keys.key1, {}, 33, 32)
            .EditPush(1, "45022100", "440220")
            .Num(0));
    tests.push_back(TestBuilder(CScript() << ToByteVector(keys.pubkey1C)
                                          << OP_CHECKDATASIGVERIFY << OP_TRUE,
                                "CHECKDATASIGVERIFY with too little R padding",
                                checkdatasigflags)
                        .PushDataSig(keys.key1, {}, 33, 32)
                        .EditPush(1, "45022100", "440220")
                        .Num(0)
                        .ScriptError(SCRIPT_ERR_SIG_DER));
    tests.push_back(
        TestBuilder(CScript() << ToByteVector(keys.pubkey0H)
                              << OP_CHECKDATASIGVERIFY << OP_TRUE,
                    "CHECKDATASIGVERIFY with hybrid pubkey but no STRICTENC",
                    checkdatasigflags & ~SCRIPT_VERIFY_STRICTENC)
            .PushDataSig(keys.key0, {})
            .Num(0));
    tests.push_back(TestBuilder(CScript() << ToByteVector(keys.pubkey0H)
                                          << OP_CHECKDATASIGVERIFY << OP_TRUE,
                                "CHECKDATASIGVERIFY with hybrid pubkey",
                                checkdatasigflags)
                        .PushDataSig(keys.key0, {})
                        .Num(0)
                        .ScriptError(SCRIPT_ERR_PUBKEYTYPE));
    tests.push_back(
        TestBuilder(
            CScript() << ToByteVector(keys.pubkey0H) << OP_CHECKDATASIGVERIFY
                      << OP_TRUE,
            "CHECKDATASIGVERIFY with invalid hybrid pubkey but no STRICTENC",
            SCRIPT_ENABLE_CHECKDATASIG)
            .PushDataSig(keys.key0, {})
            .DamagePush(10)
            .Num(0)
            .ScriptError(SCRIPT_ERR_CHECKDATASIGVERIFY));
    tests.push_back(TestBuilder(CScript() << ToByteVector(keys.pubkey0H)
                                          << OP_CHECKDATASIGVERIFY << OP_TRUE,
                                "CHECKDATASIGVERIFY with invalid hybrid pubkey",
                                checkdatasigflags)
                        .PushDataSig(keys.key0, {})
                        .DamagePush(10)
                        .Num(0)
                        .ScriptError(SCRIPT_ERR_PUBKEYTYPE));

    std::set<std::string> tests_set;

    {
        UniValue json_tests = read_json(std::string(
            json_tests::script_tests,
            json_tests::script_tests + sizeof(json_tests::script_tests)));

        for (unsigned int idx = 0; idx < json_tests.size(); idx++) {
            const UniValue &tv = json_tests[idx];
            tests_set.insert(JSONPrettyPrint(tv.get_array()));
        }
    }

    std::string strGen;

    for (TestBuilder &test : tests) {
        test.Test();
        std::string str = JSONPrettyPrint(test.GetJSON());
#ifndef UPDATE_JSON_TESTS
        if (tests_set.count(str) == 0) {
            BOOST_CHECK_MESSAGE(false, "Missing auto script_valid test: " +
                                           test.GetComment());
        }
#endif
        strGen += str + ",\n";
    }

#ifdef UPDATE_JSON_TESTS
    FILE *file = fopen("script_tests.json.gen", "w");
    fputs(strGen.c_str(), file);
    fclose(file);
#endif
}

BOOST_AUTO_TEST_CASE(script_json_test) {
    // Read tests from test/data/script_tests.json
    // Format is an array of arrays
    // Inner arrays are [ ["wit"..., nValue]?, "scriptSig", "scriptPubKey",
    // "flags", "expected_scripterror" ]
    // ... where scriptSig and scriptPubKey are stringified
    // scripts.
    UniValue tests = read_json(std::string(
        json_tests::script_tests,
        json_tests::script_tests + sizeof(json_tests::script_tests)));

    for (unsigned int idx = 0; idx < tests.size(); idx++) {
        UniValue test = tests[idx];
        std::string strTest = test.write();
        Amount nValue = Amount::zero();
        unsigned int pos = 0;
        if (test.size() > 0 && test[pos].isArray()) {
            nValue = AmountFromValue(test[pos][0]);
            pos++;
        }

        // Allow size > 3; extra stuff ignored (useful for comments)
        if (test.size() < 4 + pos) {
            if (test.size() != 1) {
                BOOST_ERROR("Bad test: " << strTest);
            }
            continue;
        }

        std::string scriptSigString = test[pos++].get_str();
        std::string scriptPubKeyString = test[pos++].get_str();
        try {
            CScript scriptSig = ParseScript(scriptSigString);
            CScript scriptPubKey = ParseScript(scriptPubKeyString);
            unsigned int scriptflags = ParseScriptFlags(test[pos++].get_str());
            int scriptError = ParseScriptError(test[pos++].get_str());

            DoTest(scriptPubKey, scriptSig, scriptflags, strTest, scriptError,
                   nValue);
        } catch (std::runtime_error &e) {
            BOOST_TEST_MESSAGE("Script test failed.  scriptSig:  "
                               << scriptSigString
                               << " scriptPubKey: " << scriptPubKeyString);
            BOOST_TEST_MESSAGE("Exception: " << e.what());
            throw;
        }
    }
}

BOOST_AUTO_TEST_CASE(script_PushData) {
    // Check that PUSHDATA1, PUSHDATA2, and PUSHDATA4 create the same value on
    // the stack as the 1-75 opcodes do.
    static const uint8_t direct[] = {1, 0x5a};
    static const uint8_t pushdata1[] = {OP_PUSHDATA1, 1, 0x5a};
    static const uint8_t pushdata2[] = {OP_PUSHDATA2, 1, 0, 0x5a};
    static const uint8_t pushdata4[] = {OP_PUSHDATA4, 1, 0, 0, 0, 0x5a};

    ScriptError err;
    std::vector<std::vector<uint8_t>> directStack;
    BOOST_CHECK(EvalScript(directStack,
                           CScript(&direct[0], &direct[sizeof(direct)]),
                           SCRIPT_VERIFY_P2SH, BaseSignatureChecker(), &err));
    BOOST_CHECK_MESSAGE(err == SCRIPT_ERR_OK, ScriptErrorString(err));

    std::vector<std::vector<uint8_t>> pushdata1Stack;
    BOOST_CHECK(EvalScript(
        pushdata1Stack, CScript(&pushdata1[0], &pushdata1[sizeof(pushdata1)]),
        SCRIPT_VERIFY_P2SH, BaseSignatureChecker(), &err));
    BOOST_CHECK(pushdata1Stack == directStack);
    BOOST_CHECK_MESSAGE(err == SCRIPT_ERR_OK, ScriptErrorString(err));

    std::vector<std::vector<uint8_t>> pushdata2Stack;
    BOOST_CHECK(EvalScript(
        pushdata2Stack, CScript(&pushdata2[0], &pushdata2[sizeof(pushdata2)]),
        SCRIPT_VERIFY_P2SH, BaseSignatureChecker(), &err));
    BOOST_CHECK(pushdata2Stack == directStack);
    BOOST_CHECK_MESSAGE(err == SCRIPT_ERR_OK, ScriptErrorString(err));

    std::vector<std::vector<uint8_t>> pushdata4Stack;
    BOOST_CHECK(EvalScript(
        pushdata4Stack, CScript(&pushdata4[0], &pushdata4[sizeof(pushdata4)]),
        SCRIPT_VERIFY_P2SH, BaseSignatureChecker(), &err));
    BOOST_CHECK(pushdata4Stack == directStack);
    BOOST_CHECK_MESSAGE(err == SCRIPT_ERR_OK, ScriptErrorString(err));
}

CScript sign_multisig(CScript scriptPubKey, std::vector<CKey> keys,
                      CTransaction transaction) {
    uint256 hash = SignatureHash(scriptPubKey, transaction, 0, SigHashType(),
                                 Amount::zero());

    CScript result;
    //
    // NOTE: CHECKMULTISIG has an unfortunate bug; it requires one extra item on
    // the stack, before the signatures. Putting OP_0 on the stack is the
    // workaround; fixing the bug would mean splitting the block chain (old
    // clients would not accept new CHECKMULTISIG transactions, and vice-versa)
    //
    result << OP_0;
    for (const CKey &key : keys) {
        std::vector<uint8_t> vchSig;
        BOOST_CHECK(key.SignECDSA(hash, vchSig));
        vchSig.push_back(uint8_t(SIGHASH_ALL));
        result << vchSig;
    }

    return result;
}

CScript sign_multisig(CScript scriptPubKey, const CKey &key,
                      CTransaction transaction) {
    std::vector<CKey> keys;
    keys.push_back(key);
    return sign_multisig(scriptPubKey, keys, transaction);
}

BOOST_AUTO_TEST_CASE(script_CHECKMULTISIG12) {
    ScriptError err;
    CKey key1, key2, key3;
    key1.MakeNewKey(true);
    key2.MakeNewKey(false);
    key3.MakeNewKey(true);

    CScript scriptPubKey12;
    scriptPubKey12 << OP_1 << ToByteVector(key1.GetPubKey())
                   << ToByteVector(key2.GetPubKey()) << OP_2
                   << OP_CHECKMULTISIG;

    CMutableTransaction txFrom12 =
        BuildCreditingTransaction(scriptPubKey12, Amount::zero());
    CMutableTransaction txTo12 = BuildSpendingTransaction(CScript(), txFrom12);

    CScript goodsig1 =
        sign_multisig(scriptPubKey12, key1, CTransaction(txTo12));
    BOOST_CHECK(VerifyScript(
        goodsig1, scriptPubKey12, gFlags,
        MutableTransactionSignatureChecker(&txTo12, 0, txFrom12.vout[0].nValue),
        &err));
    BOOST_CHECK_MESSAGE(err == SCRIPT_ERR_OK, ScriptErrorString(err));
    txTo12.vout[0].nValue = 2 * SATOSHI;
    BOOST_CHECK(!VerifyScript(
        goodsig1, scriptPubKey12, gFlags,
        MutableTransactionSignatureChecker(&txTo12, 0, txFrom12.vout[0].nValue),
        &err));
    BOOST_CHECK_MESSAGE(err == SCRIPT_ERR_EVAL_FALSE, ScriptErrorString(err));

    CScript goodsig2 =
        sign_multisig(scriptPubKey12, key2, CTransaction(txTo12));
    BOOST_CHECK(VerifyScript(
        goodsig2, scriptPubKey12, gFlags,
        MutableTransactionSignatureChecker(&txTo12, 0, txFrom12.vout[0].nValue),
        &err));
    BOOST_CHECK_MESSAGE(err == SCRIPT_ERR_OK, ScriptErrorString(err));

    CScript badsig1 = sign_multisig(scriptPubKey12, key3, CTransaction(txTo12));
    BOOST_CHECK(!VerifyScript(
        badsig1, scriptPubKey12, gFlags,
        MutableTransactionSignatureChecker(&txTo12, 0, txFrom12.vout[0].nValue),
        &err));
    BOOST_CHECK_MESSAGE(err == SCRIPT_ERR_EVAL_FALSE, ScriptErrorString(err));
}

BOOST_AUTO_TEST_CASE(script_CHECKMULTISIG23) {
    ScriptError err;
    CKey key1, key2, key3, key4;
    key1.MakeNewKey(true);
    key2.MakeNewKey(false);
    key3.MakeNewKey(true);
    key4.MakeNewKey(false);

    CScript scriptPubKey23;
    scriptPubKey23 << OP_2 << ToByteVector(key1.GetPubKey())
                   << ToByteVector(key2.GetPubKey())
                   << ToByteVector(key3.GetPubKey()) << OP_3
                   << OP_CHECKMULTISIG;

    CMutableTransaction txFrom23 =
        BuildCreditingTransaction(scriptPubKey23, Amount::zero());
    CMutableTransaction mutableTxTo23 =
        BuildSpendingTransaction(CScript(), txFrom23);

    // after it has been set up, mutableTxTo23 does not change in this test,
    // so we can convert it to readonly transaction and use
    // TransactionSignatureChecker
    // instead of MutableTransactionSignatureChecker

    const CTransaction txTo23(mutableTxTo23);

    std::vector<CKey> keys;
    keys.push_back(key1);
    keys.push_back(key2);
    CScript goodsig1 = sign_multisig(scriptPubKey23, keys, txTo23);
    BOOST_CHECK(VerifyScript(
        goodsig1, scriptPubKey23, gFlags,
        TransactionSignatureChecker(&txTo23, 0, txFrom23.vout[0].nValue),
        &err));
    BOOST_CHECK_MESSAGE(err == SCRIPT_ERR_OK, ScriptErrorString(err));

    keys.clear();
    keys.push_back(key1);
    keys.push_back(key3);
    CScript goodsig2 = sign_multisig(scriptPubKey23, keys, txTo23);
    BOOST_CHECK(VerifyScript(
        goodsig2, scriptPubKey23, gFlags,
        TransactionSignatureChecker(&txTo23, 0, txFrom23.vout[0].nValue),
        &err));
    BOOST_CHECK_MESSAGE(err == SCRIPT_ERR_OK, ScriptErrorString(err));

    keys.clear();
    keys.push_back(key2);
    keys.push_back(key3);
    CScript goodsig3 = sign_multisig(scriptPubKey23, keys, txTo23);
    BOOST_CHECK(VerifyScript(
        goodsig3, scriptPubKey23, gFlags,
        TransactionSignatureChecker(&txTo23, 0, txFrom23.vout[0].nValue),
        &err));
    BOOST_CHECK_MESSAGE(err == SCRIPT_ERR_OK, ScriptErrorString(err));

    keys.clear();
    keys.push_back(key2);
    keys.push_back(key2); // Can't re-use sig
    CScript badsig1 = sign_multisig(scriptPubKey23, keys, txTo23);
    BOOST_CHECK(!VerifyScript(
        badsig1, scriptPubKey23, gFlags,
        TransactionSignatureChecker(&txTo23, 0, txFrom23.vout[0].nValue),
        &err));
    BOOST_CHECK_MESSAGE(err == SCRIPT_ERR_EVAL_FALSE, ScriptErrorString(err));

    keys.clear();
    keys.push_back(key2);
    keys.push_back(key1); // sigs must be in correct order
    CScript badsig2 = sign_multisig(scriptPubKey23, keys, txTo23);
    BOOST_CHECK(!VerifyScript(
        badsig2, scriptPubKey23, gFlags,
        TransactionSignatureChecker(&txTo23, 0, txFrom23.vout[0].nValue),
        &err));
    BOOST_CHECK_MESSAGE(err == SCRIPT_ERR_EVAL_FALSE, ScriptErrorString(err));

    keys.clear();
    keys.push_back(key3);
    keys.push_back(key2); // sigs must be in correct order
    CScript badsig3 = sign_multisig(scriptPubKey23, keys, txTo23);
    BOOST_CHECK(!VerifyScript(
        badsig3, scriptPubKey23, gFlags,
        TransactionSignatureChecker(&txTo23, 0, txFrom23.vout[0].nValue),
        &err));
    BOOST_CHECK_MESSAGE(err == SCRIPT_ERR_EVAL_FALSE, ScriptErrorString(err));

    keys.clear();
    keys.push_back(key4);
    keys.push_back(key2); // sigs must match pubkeys
    CScript badsig4 = sign_multisig(scriptPubKey23, keys, txTo23);
    BOOST_CHECK(!VerifyScript(
        badsig4, scriptPubKey23, gFlags,
        TransactionSignatureChecker(&txTo23, 0, txFrom23.vout[0].nValue),
        &err));
    BOOST_CHECK_MESSAGE(err == SCRIPT_ERR_EVAL_FALSE, ScriptErrorString(err));

    keys.clear();
    keys.push_back(key1);
    keys.push_back(key4); // sigs must match pubkeys
    CScript badsig5 = sign_multisig(scriptPubKey23, keys, txTo23);
    BOOST_CHECK(!VerifyScript(
        badsig5, scriptPubKey23, gFlags,
        TransactionSignatureChecker(&txTo23, 0, txFrom23.vout[0].nValue),
        &err));
    BOOST_CHECK_MESSAGE(err == SCRIPT_ERR_EVAL_FALSE, ScriptErrorString(err));

    keys.clear(); // Must have signatures
    CScript badsig6 = sign_multisig(scriptPubKey23, keys, txTo23);
    BOOST_CHECK(!VerifyScript(
        badsig6, scriptPubKey23, gFlags,
        TransactionSignatureChecker(&txTo23, 0, txFrom23.vout[0].nValue),
        &err));
    BOOST_CHECK_MESSAGE(err == SCRIPT_ERR_INVALID_STACK_OPERATION,
                        ScriptErrorString(err));
}

BOOST_AUTO_TEST_CASE(script_combineSigs) {
    // Test the CombineSignatures function
    Amount amount = Amount::zero();
    CBasicKeyStore keystore;
    std::vector<CKey> keys;
    std::vector<CPubKey> pubkeys;
    for (int i = 0; i < 3; i++) {
        CKey key;
        key.MakeNewKey(i % 2 == 1);
        keys.push_back(key);
        pubkeys.push_back(key.GetPubKey());
        keystore.AddKey(key);
    }

    CMutableTransaction txFrom = BuildCreditingTransaction(
        GetScriptForDestination(keys[0].GetPubKey().GetID()), Amount::zero());
    CMutableTransaction txTo = BuildSpendingTransaction(CScript(), txFrom);
    CScript &scriptPubKey = txFrom.vout[0].scriptPubKey;
    CScript &scriptSig = txTo.vin[0].scriptSig;

    // Although it looks like CMutableTransaction is not modified after it’s
    // been set up (it is not passed as parameter to any non-const function),
    // it is actually modified when new value is assigned to scriptPubKey,
    // which points to mutableTxFrom.vout[0].scriptPubKey. Therefore we can
    // not use single instance of CTransaction in this test.
    // CTransaction creates a copy of CMutableTransaction and is not modified
    // when scriptPubKey is assigned to.

    SignatureData empty;
    SignatureData combined = CombineSignatures(
        scriptPubKey, MutableTransactionSignatureChecker(&txTo, 0, amount),
        empty, empty);
    BOOST_CHECK(combined.scriptSig.empty());

    // Single signature case:
    SignSignature(keystore, CTransaction(txFrom), txTo, 0,
                  SigHashType()); // changes scriptSig
    combined = CombineSignatures(
        scriptPubKey, MutableTransactionSignatureChecker(&txTo, 0, amount),
        SignatureData(scriptSig), empty);
    BOOST_CHECK(combined.scriptSig == scriptSig);
    combined = CombineSignatures(
        scriptPubKey, MutableTransactionSignatureChecker(&txTo, 0, amount),
        empty, SignatureData(scriptSig));
    BOOST_CHECK(combined.scriptSig == scriptSig);
    CScript scriptSigCopy = scriptSig;
    // Signing again will give a different, valid signature:
    SignSignature(keystore, CTransaction(txFrom), txTo, 0, SigHashType());
    combined = CombineSignatures(
        scriptPubKey, MutableTransactionSignatureChecker(&txTo, 0, amount),
        SignatureData(scriptSigCopy), SignatureData(scriptSig));
    BOOST_CHECK(combined.scriptSig == scriptSigCopy ||
                combined.scriptSig == scriptSig);

    // P2SH, single-signature case:
    CScript pkSingle;
    pkSingle << ToByteVector(keys[0].GetPubKey()) << OP_CHECKSIG;
    keystore.AddCScript(pkSingle);
    scriptPubKey = GetScriptForDestination(CScriptID(pkSingle));
    SignSignature(keystore, CTransaction(txFrom), txTo, 0, SigHashType());
    combined = CombineSignatures(
        scriptPubKey, MutableTransactionSignatureChecker(&txTo, 0, amount),
        SignatureData(scriptSig), empty);
    BOOST_CHECK(combined.scriptSig == scriptSig);
    combined = CombineSignatures(
        scriptPubKey, MutableTransactionSignatureChecker(&txTo, 0, amount),
        empty, SignatureData(scriptSig));
    BOOST_CHECK(combined.scriptSig == scriptSig);
    scriptSigCopy = scriptSig;
    SignSignature(keystore, CTransaction(txFrom), txTo, 0, SigHashType());
    combined = CombineSignatures(
        scriptPubKey, MutableTransactionSignatureChecker(&txTo, 0, amount),
        SignatureData(scriptSigCopy), SignatureData(scriptSig));
    BOOST_CHECK(combined.scriptSig == scriptSigCopy ||
                combined.scriptSig == scriptSig);
    // dummy scriptSigCopy with placeholder, should always choose
    // non-placeholder:
    scriptSigCopy = CScript()
                    << OP_0
                    << std::vector<uint8_t>(pkSingle.begin(), pkSingle.end());
    combined = CombineSignatures(
        scriptPubKey, MutableTransactionSignatureChecker(&txTo, 0, amount),
        SignatureData(scriptSigCopy), SignatureData(scriptSig));
    BOOST_CHECK(combined.scriptSig == scriptSig);
    combined = CombineSignatures(
        scriptPubKey, MutableTransactionSignatureChecker(&txTo, 0, amount),
        SignatureData(scriptSig), SignatureData(scriptSigCopy));
    BOOST_CHECK(combined.scriptSig == scriptSig);

    // Hardest case:  Multisig 2-of-3
    scriptPubKey = GetScriptForMultisig(2, pubkeys);
    keystore.AddCScript(scriptPubKey);
    SignSignature(keystore, CTransaction(txFrom), txTo, 0, SigHashType());
    combined = CombineSignatures(
        scriptPubKey, MutableTransactionSignatureChecker(&txTo, 0, amount),
        SignatureData(scriptSig), empty);
    BOOST_CHECK(combined.scriptSig == scriptSig);
    combined = CombineSignatures(
        scriptPubKey, MutableTransactionSignatureChecker(&txTo, 0, amount),
        empty, SignatureData(scriptSig));
    BOOST_CHECK(combined.scriptSig == scriptSig);

    // A couple of partially-signed versions:
    std::vector<uint8_t> sig1;
    uint256 hash1 = SignatureHash(scriptPubKey, CTransaction(txTo), 0,
                                  SigHashType(), Amount::zero());
    BOOST_CHECK(keys[0].SignECDSA(hash1, sig1));
    sig1.push_back(SIGHASH_ALL);
    std::vector<uint8_t> sig2;
    uint256 hash2 = SignatureHash(
        scriptPubKey, CTransaction(txTo), 0,
        SigHashType().withBaseType(BaseSigHashType::NONE), Amount::zero());
    BOOST_CHECK(keys[1].SignECDSA(hash2, sig2));
    sig2.push_back(SIGHASH_NONE);
    std::vector<uint8_t> sig3;
    uint256 hash3 = SignatureHash(
        scriptPubKey, CTransaction(txTo), 0,
        SigHashType().withBaseType(BaseSigHashType::SINGLE), Amount::zero());
    BOOST_CHECK(keys[2].SignECDSA(hash3, sig3));
    sig3.push_back(SIGHASH_SINGLE);

    // Not fussy about order (or even existence) of placeholders or signatures:
    CScript partial1a = CScript() << OP_0 << sig1 << OP_0;
    CScript partial1b = CScript() << OP_0 << OP_0 << sig1;
    CScript partial2a = CScript() << OP_0 << sig2;
    CScript partial2b = CScript() << sig2 << OP_0;
    CScript partial3a = CScript() << sig3;
    CScript partial3b = CScript() << OP_0 << OP_0 << sig3;
    CScript partial3c = CScript() << OP_0 << sig3 << OP_0;
    CScript complete12 = CScript() << OP_0 << sig1 << sig2;
    CScript complete13 = CScript() << OP_0 << sig1 << sig3;
    CScript complete23 = CScript() << OP_0 << sig2 << sig3;

    combined = CombineSignatures(
        scriptPubKey, MutableTransactionSignatureChecker(&txTo, 0, amount),
        SignatureData(partial1a), SignatureData(partial1b));
    BOOST_CHECK(combined.scriptSig == partial1a);
    combined = CombineSignatures(
        scriptPubKey, MutableTransactionSignatureChecker(&txTo, 0, amount),
        SignatureData(partial1a), SignatureData(partial2a));
    BOOST_CHECK(combined.scriptSig == complete12);
    combined = CombineSignatures(
        scriptPubKey, MutableTransactionSignatureChecker(&txTo, 0, amount),
        SignatureData(partial2a), SignatureData(partial1a));
    BOOST_CHECK(combined.scriptSig == complete12);
    combined = CombineSignatures(
        scriptPubKey, MutableTransactionSignatureChecker(&txTo, 0, amount),
        SignatureData(partial1b), SignatureData(partial2b));
    BOOST_CHECK(combined.scriptSig == complete12);
    combined = CombineSignatures(
        scriptPubKey, MutableTransactionSignatureChecker(&txTo, 0, amount),
        SignatureData(partial3b), SignatureData(partial1b));
    BOOST_CHECK(combined.scriptSig == complete13);
    combined = CombineSignatures(
        scriptPubKey, MutableTransactionSignatureChecker(&txTo, 0, amount),
        SignatureData(partial2a), SignatureData(partial3a));
    BOOST_CHECK(combined.scriptSig == complete23);
    combined = CombineSignatures(
        scriptPubKey, MutableTransactionSignatureChecker(&txTo, 0, amount),
        SignatureData(partial3b), SignatureData(partial2b));
    BOOST_CHECK(combined.scriptSig == complete23);
    combined = CombineSignatures(
        scriptPubKey, MutableTransactionSignatureChecker(&txTo, 0, amount),
        SignatureData(partial3b), SignatureData(partial3a));
    BOOST_CHECK(combined.scriptSig == partial3c);
}

BOOST_AUTO_TEST_CASE(script_standard_push) {
    ScriptError err;
    for (int i = 0; i < 67000; i++) {
        CScript script;
        script << i;
        BOOST_CHECK_MESSAGE(script.IsPushOnly(),
                            "Number " << i << " is not pure push.");
        BOOST_CHECK_MESSAGE(VerifyScript(script, CScript() << OP_1,
                                         SCRIPT_VERIFY_MINIMALDATA,
                                         BaseSignatureChecker(), &err),
                            "Number " << i << " push is not minimal data.");
        BOOST_CHECK_MESSAGE(err == SCRIPT_ERR_OK, ScriptErrorString(err));
    }

    for (unsigned int i = 0; i <= MAX_SCRIPT_ELEMENT_SIZE; i++) {
        std::vector<uint8_t> data(i, '\111');
        CScript script;
        script << data;
        BOOST_CHECK_MESSAGE(script.IsPushOnly(),
                            "Length " << i << " is not pure push.");
        BOOST_CHECK_MESSAGE(VerifyScript(script, CScript() << OP_1,
                                         SCRIPT_VERIFY_MINIMALDATA,
                                         BaseSignatureChecker(), &err),
                            "Length " << i << " push is not minimal data.");
        BOOST_CHECK_MESSAGE(err == SCRIPT_ERR_OK, ScriptErrorString(err));
    }
}

BOOST_AUTO_TEST_CASE(script_IsPushOnly_on_invalid_scripts) {
    // IsPushOnly returns false when given a script containing only pushes that
    // are invalid due to truncation. IsPushOnly() is consensus critical because
    // P2SH evaluation uses it, although this specific behavior should not be
    // consensus critical as the P2SH evaluation would fail first due to the
    // invalid push. Still, it doesn't hurt to test it explicitly.
    static const uint8_t direct[] = {1};
    BOOST_CHECK(!CScript(direct, direct + sizeof(direct)).IsPushOnly());
}

BOOST_AUTO_TEST_CASE(script_GetScriptAsm) {
    BOOST_CHECK_EQUAL("OP_CHECKLOCKTIMEVERIFY",
                      ScriptToAsmStr(CScript() << OP_NOP2, true));
    BOOST_CHECK_EQUAL(
        "OP_CHECKLOCKTIMEVERIFY",
        ScriptToAsmStr(CScript() << OP_CHECKLOCKTIMEVERIFY, true));
    BOOST_CHECK_EQUAL("OP_CHECKLOCKTIMEVERIFY",
                      ScriptToAsmStr(CScript() << OP_NOP2));
    BOOST_CHECK_EQUAL("OP_CHECKLOCKTIMEVERIFY",
                      ScriptToAsmStr(CScript() << OP_CHECKLOCKTIMEVERIFY));

    std::string derSig("304502207fa7a6d1e0ee81132a269ad84e68d695483745cde8b541e"
                       "3bf630749894e342a022100c1f7ab20e13e22fb95281a870f3dcf38"
                       "d782e53023ee313d741ad0cfbc0c5090");
    std::string pubKey(
        "03b0da749730dc9b4b1f4a14d6902877a92541f5368778853d9c4a0cb7802dcfb2");
    std::vector<uint8_t> vchPubKey = ToByteVector(ParseHex(pubKey));

    BOOST_CHECK_EQUAL(
        derSig + "00 " + pubKey,
        ScriptToAsmStr(CScript() << ToByteVector(ParseHex(derSig + "00"))
                                 << vchPubKey,
                       true));
    BOOST_CHECK_EQUAL(
        derSig + "80 " + pubKey,
        ScriptToAsmStr(CScript() << ToByteVector(ParseHex(derSig + "80"))
                                 << vchPubKey,
                       true));
    BOOST_CHECK_EQUAL(
        derSig + "[ALL] " + pubKey,
        ScriptToAsmStr(CScript() << ToByteVector(ParseHex(derSig + "01"))
                                 << vchPubKey,
                       true));
    BOOST_CHECK_EQUAL(
        derSig + "[ALL|ANYONECANPAY] " + pubKey,
        ScriptToAsmStr(CScript() << ToByteVector(ParseHex(derSig + "81"))
                                 << vchPubKey,
                       true));
    BOOST_CHECK_EQUAL(
        derSig + "[ALL|FORKID] " + pubKey,
        ScriptToAsmStr(CScript() << ToByteVector(ParseHex(derSig + "41"))
                                 << vchPubKey,
                       true));
    BOOST_CHECK_EQUAL(
        derSig + "[ALL|FORKID|ANYONECANPAY] " + pubKey,
        ScriptToAsmStr(CScript() << ToByteVector(ParseHex(derSig + "c1"))
                                 << vchPubKey,
                       true));
    BOOST_CHECK_EQUAL(
        derSig + "[NONE] " + pubKey,
        ScriptToAsmStr(CScript() << ToByteVector(ParseHex(derSig + "02"))
                                 << vchPubKey,
                       true));
    BOOST_CHECK_EQUAL(
        derSig + "[NONE|ANYONECANPAY] " + pubKey,
        ScriptToAsmStr(CScript() << ToByteVector(ParseHex(derSig + "82"))
                                 << vchPubKey,
                       true));
    BOOST_CHECK_EQUAL(
        derSig + "[NONE|FORKID] " + pubKey,
        ScriptToAsmStr(CScript() << ToByteVector(ParseHex(derSig + "42"))
                                 << vchPubKey,
                       true));
    BOOST_CHECK_EQUAL(
        derSig + "[NONE|FORKID|ANYONECANPAY] " + pubKey,
        ScriptToAsmStr(CScript() << ToByteVector(ParseHex(derSig + "c2"))
                                 << vchPubKey,
                       true));
    BOOST_CHECK_EQUAL(
        derSig + "[SINGLE] " + pubKey,
        ScriptToAsmStr(CScript() << ToByteVector(ParseHex(derSig + "03"))
                                 << vchPubKey,
                       true));
    BOOST_CHECK_EQUAL(
        derSig + "[SINGLE|ANYONECANPAY] " + pubKey,
        ScriptToAsmStr(CScript() << ToByteVector(ParseHex(derSig + "83"))
                                 << vchPubKey,
                       true));
    BOOST_CHECK_EQUAL(
        derSig + "[SINGLE|FORKID] " + pubKey,
        ScriptToAsmStr(CScript() << ToByteVector(ParseHex(derSig + "43"))
                                 << vchPubKey,
                       true));
    BOOST_CHECK_EQUAL(
        derSig + "[SINGLE|FORKID|ANYONECANPAY] " + pubKey,
        ScriptToAsmStr(CScript() << ToByteVector(ParseHex(derSig + "c3"))
                                 << vchPubKey,
                       true));

    BOOST_CHECK_EQUAL(derSig + "00 " + pubKey,
                      ScriptToAsmStr(CScript()
                                     << ToByteVector(ParseHex(derSig + "00"))
                                     << vchPubKey));
    BOOST_CHECK_EQUAL(derSig + "80 " + pubKey,
                      ScriptToAsmStr(CScript()
                                     << ToByteVector(ParseHex(derSig + "80"))
                                     << vchPubKey));
    BOOST_CHECK_EQUAL(derSig + "01 " + pubKey,
                      ScriptToAsmStr(CScript()
                                     << ToByteVector(ParseHex(derSig + "01"))
                                     << vchPubKey));
    BOOST_CHECK_EQUAL(derSig + "02 " + pubKey,
                      ScriptToAsmStr(CScript()
                                     << ToByteVector(ParseHex(derSig + "02"))
                                     << vchPubKey));
    BOOST_CHECK_EQUAL(derSig + "03 " + pubKey,
                      ScriptToAsmStr(CScript()
                                     << ToByteVector(ParseHex(derSig + "03"))
                                     << vchPubKey));
    BOOST_CHECK_EQUAL(derSig + "81 " + pubKey,
                      ScriptToAsmStr(CScript()
                                     << ToByteVector(ParseHex(derSig + "81"))
                                     << vchPubKey));
    BOOST_CHECK_EQUAL(derSig + "82 " + pubKey,
                      ScriptToAsmStr(CScript()
                                     << ToByteVector(ParseHex(derSig + "82"))
                                     << vchPubKey));
    BOOST_CHECK_EQUAL(derSig + "83 " + pubKey,
                      ScriptToAsmStr(CScript()
                                     << ToByteVector(ParseHex(derSig + "83"))
                                     << vchPubKey));
}

static CScript ScriptFromHex(const char *hex) {
    std::vector<uint8_t> data = ParseHex(hex);
    return CScript(data.begin(), data.end());
}

BOOST_AUTO_TEST_CASE(script_FindAndDelete) {
    // Exercise the FindAndDelete functionality
    CScript s;
    CScript d;
    CScript expect;

    s = CScript() << OP_1 << OP_2;
    // delete nothing should be a no-op
    d = CScript();
    expect = s;
    BOOST_CHECK_EQUAL(s.FindAndDelete(d), 0);
    BOOST_CHECK(s == expect);

    s = CScript() << OP_1 << OP_2 << OP_3;
    d = CScript() << OP_2;
    expect = CScript() << OP_1 << OP_3;
    BOOST_CHECK_EQUAL(s.FindAndDelete(d), 1);
    BOOST_CHECK(s == expect);

    s = CScript() << OP_3 << OP_1 << OP_3 << OP_3 << OP_4 << OP_3;
    d = CScript() << OP_3;
    expect = CScript() << OP_1 << OP_4;
    BOOST_CHECK_EQUAL(s.FindAndDelete(d), 4);
    BOOST_CHECK(s == expect);

    // PUSH 0x02ff03 onto stack
    s = ScriptFromHex("0302ff03");
    d = ScriptFromHex("0302ff03");
    expect = CScript();
    BOOST_CHECK_EQUAL(s.FindAndDelete(d), 1);
    BOOST_CHECK(s == expect);

    // PUSH 0x2ff03 PUSH 0x2ff03
    s = ScriptFromHex("0302ff030302ff03");
    d = ScriptFromHex("0302ff03");
    expect = CScript();
    BOOST_CHECK_EQUAL(s.FindAndDelete(d), 2);
    BOOST_CHECK(s == expect);

    s = ScriptFromHex("0302ff030302ff03");
    d = ScriptFromHex("02");
    expect = s; // FindAndDelete matches entire opcodes
    BOOST_CHECK_EQUAL(s.FindAndDelete(d), 0);
    BOOST_CHECK(s == expect);

    s = ScriptFromHex("0302ff030302ff03");
    d = ScriptFromHex("ff");
    expect = s;
    BOOST_CHECK_EQUAL(s.FindAndDelete(d), 0);
    BOOST_CHECK(s == expect);

    // This is an odd edge case: strip of the push-three-bytes prefix, leaving
    // 02ff03 which is push-two-bytes:
    s = ScriptFromHex("0302ff030302ff03");
    d = ScriptFromHex("03");
    expect = CScript() << ParseHex("ff03") << ParseHex("ff03");
    BOOST_CHECK_EQUAL(s.FindAndDelete(d), 2);
    BOOST_CHECK(s == expect);

    // Byte sequence that spans multiple opcodes:
    // PUSH(0xfeed) OP_1 OP_VERIFY
    s = ScriptFromHex("02feed5169");
    d = ScriptFromHex("feed51");
    expect = s;
    // doesn't match 'inside' opcodes
    BOOST_CHECK_EQUAL(s.FindAndDelete(d), 0);
    BOOST_CHECK(s == expect);

    // PUSH(0xfeed) OP_1 OP_VERIFY
    s = ScriptFromHex("02feed5169");
    d = ScriptFromHex("02feed51");
    expect = ScriptFromHex("69");
    BOOST_CHECK_EQUAL(s.FindAndDelete(d), 1);
    BOOST_CHECK(s == expect);

    s = ScriptFromHex("516902feed5169");
    d = ScriptFromHex("feed51");
    expect = s;
    BOOST_CHECK_EQUAL(s.FindAndDelete(d), 0);
    BOOST_CHECK(s == expect);

    s = ScriptFromHex("516902feed5169");
    d = ScriptFromHex("02feed51");
    expect = ScriptFromHex("516969");
    BOOST_CHECK_EQUAL(s.FindAndDelete(d), 1);
    BOOST_CHECK(s == expect);

    s = CScript() << OP_0 << OP_0 << OP_1 << OP_1;
    d = CScript() << OP_0 << OP_1;
    // FindAndDelete is single-pass
    expect = CScript() << OP_0 << OP_1;
    BOOST_CHECK_EQUAL(s.FindAndDelete(d), 1);
    BOOST_CHECK(s == expect);

    s = CScript() << OP_0 << OP_0 << OP_1 << OP_0 << OP_1 << OP_1;
    d = CScript() << OP_0 << OP_1;
    // FindAndDelete is single-pass
    expect = CScript() << OP_0 << OP_1;
    BOOST_CHECK_EQUAL(s.FindAndDelete(d), 2);
    BOOST_CHECK(s == expect);

    // Another weird edge case:
    // End with invalid push (not enough data)...
    s = ScriptFromHex("0003feed");
    // ... can remove the invalid push
    d = ScriptFromHex("03feed");
    expect = ScriptFromHex("00");
    BOOST_CHECK_EQUAL(s.FindAndDelete(d), 1);
    BOOST_CHECK(s == expect);

    s = ScriptFromHex("0003feed");
    d = ScriptFromHex("00");
    expect = ScriptFromHex("03feed");
    BOOST_CHECK_EQUAL(s.FindAndDelete(d), 1);
    BOOST_CHECK(s == expect);
}

BOOST_AUTO_TEST_SUITE_END()
