// Copyright (c) 2013-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "consensus/tx_verify.h"
#include "consensus/validation.h"
#include "data/sighash.json.h"
#include "hash.h"
#include "script/interpreter.h"
#include "script/script.h"
#include "serialize.h"
#include "streams.h"
#include "test/jsonutil.h"
#include "test/test_bitcoin.h"
#include "util.h"
#include "utilstrencodings.h"
#include "version.h"

#include <iostream>

#include <boost/test/unit_test.hpp>

#include <univalue.h>

// Old script.cpp SignatureHash function
static uint256 SignatureHashOld(CScript scriptCode, const CTransaction &txTo,
                                unsigned int nIn, uint32_t nHashType) {
    static const uint256 one(uint256S(
        "0000000000000000000000000000000000000000000000000000000000000001"));
    if (nIn >= txTo.vin.size()) {
        printf("ERROR: SignatureHash(): nIn=%d out of range\n", nIn);
        return one;
    }
    CMutableTransaction txTmp(txTo);

    // In case concatenating two scripts ends up with two codeseparators, or an
    // extra one at the end, this prevents all those possible incompatibilities.
    scriptCode.FindAndDelete(CScript(OP_CODESEPARATOR));

    // Blank out other inputs' signatures
    for (auto &in : txTmp.vin) {
        in.scriptSig = CScript();
    }
    txTmp.vin[nIn].scriptSig = scriptCode;

    // Blank out some of the outputs
    if ((nHashType & 0x1f) == SIGHASH_NONE) {
        // Wildcard payee
        txTmp.vout.clear();

        // Let the others update at will
        for (size_t i = 0; i < txTmp.vin.size(); i++) {
            if (i != nIn) {
                txTmp.vin[i].nSequence = 0;
            }
        }
    } else if ((nHashType & 0x1f) == SIGHASH_SINGLE) {
        // Only lock-in the txout payee at same index as txin
        unsigned int nOut = nIn;
        if (nOut >= txTmp.vout.size()) {
            printf("ERROR: SignatureHash(): nOut=%d out of range\n", nOut);
            return one;
        }
        txTmp.vout.resize(nOut + 1);
        for (size_t i = 0; i < nOut; i++) {
            txTmp.vout[i].SetNull();
        }

        // Let the others update at will
        for (size_t i = 0; i < txTmp.vin.size(); i++) {
            if (i != nIn) {
                txTmp.vin[i].nSequence = 0;
            }
        }
    }

    // Blank out other inputs completely, not recommended for open transactions
    if (nHashType & SIGHASH_ANYONECANPAY) {
        txTmp.vin[0] = txTmp.vin[nIn];
        txTmp.vin.resize(1);
    }

    // Serialize and hash
    CHashWriter ss(SER_GETHASH, 0);
    ss << txTmp << nHashType;
    return ss.GetHash();
}

static void RandomScript(CScript &script) {
    static const opcodetype oplist[] = {
        OP_FALSE, OP_1,        OP_2,
        OP_3,     OP_CHECKSIG, OP_IF,
        OP_VERIF, OP_RETURN,   OP_CODESEPARATOR};
    script = CScript();
    int ops = (InsecureRandRange(10));
    for (int i = 0; i < ops; i++) {
        script << oplist[InsecureRandRange(sizeof(oplist) / sizeof(oplist[0]))];
    }
}

static void RandomTransaction(CMutableTransaction &tx, bool fSingle) {
    tx.nVersion = insecure_rand();
    tx.vin.clear();
    tx.vout.clear();
    tx.nLockTime = (InsecureRandBool()) ? insecure_rand() : 0;
    int ins = (InsecureRandBits(2)) + 1;
    int outs = fSingle ? ins : (InsecureRandBits(2)) + 1;
    for (int in = 0; in < ins; in++) {
        tx.vin.push_back(CTxIn());
        CTxIn &txin = tx.vin.back();
        txin.prevout = COutPoint(InsecureRand256(), InsecureRandBits(2));
        RandomScript(txin.scriptSig);
        txin.nSequence =
            (InsecureRandBool()) ? insecure_rand() : (unsigned int)-1;
    }
    for (int out = 0; out < outs; out++) {
        tx.vout.push_back(CTxOut());
        CTxOut &txout = tx.vout.back();
        txout.nValue = (int64_t(insecure_rand()) % 100000000) * SATOSHI;
        RandomScript(txout.scriptPubKey);
    }
}

BOOST_FIXTURE_TEST_SUITE(sighash_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(sighash_test) {
    SeedInsecureRand(false);

#if defined(PRINT_SIGHASH_JSON)
    std::cout << "[\n";
    std::cout << "\t[\"raw_transaction, script, input_index, hashType, "
                 "signature_hash (regular), signature_hash(no forkid), "
                 "signature_hash(replay protected)\"],\n";
#endif

    int nRandomTests = 1000;
    for (int i = 0; i < nRandomTests; i++) {
        uint32_t nHashType = insecure_rand();
        SigHashType sigHashType(nHashType);

        CMutableTransaction txTo;
        RandomTransaction(txTo, (nHashType & 0x1f) == SIGHASH_SINGLE);
        CScript scriptCode;
        RandomScript(scriptCode);
        int nIn = InsecureRandRange(txTo.vin.size());

        uint256 shref =
            SignatureHashOld(scriptCode, CTransaction(txTo), nIn, nHashType);
        uint256 shold = SignatureHash(scriptCode, CTransaction(txTo), nIn,
                                      sigHashType, Amount::zero(), nullptr, 0);
        BOOST_CHECK(shold == shref);

        // Check the impact of the forkid flag.
        uint256 shreg = SignatureHash(scriptCode, CTransaction(txTo), nIn,
                                      sigHashType, Amount::zero());
        if (sigHashType.hasForkId()) {
            BOOST_CHECK(nHashType & SIGHASH_FORKID);
            BOOST_CHECK(shreg != shref);
        } else {
            BOOST_CHECK((nHashType & SIGHASH_FORKID) == 0);
            BOOST_CHECK(shreg == shref);
        }

        // Make sure replay protection works as expected.
        uint256 shrep = SignatureHash(scriptCode, CTransaction(txTo), nIn,
                                      sigHashType, Amount::zero(), nullptr,
                                      SCRIPT_ENABLE_SIGHASH_FORKID |
                                          SCRIPT_ENABLE_REPLAY_PROTECTION);
        uint32_t newForValue = 0xff0000 | ((nHashType >> 8) ^ 0xdead);
        uint256 manualshrep = SignatureHash(
            scriptCode, CTransaction(txTo), nIn,
            sigHashType.withForkValue(newForValue), Amount::zero());
        BOOST_CHECK(shrep == manualshrep);

        // Replay protection works even if the hash is of the form 0xffxxxx
        uint256 shrepff = SignatureHash(
            scriptCode, CTransaction(txTo), nIn,
            sigHashType.withForkValue(newForValue), Amount::zero(), nullptr,
            SCRIPT_ENABLE_SIGHASH_FORKID | SCRIPT_ENABLE_REPLAY_PROTECTION);
        uint256 manualshrepff = SignatureHash(
            scriptCode, CTransaction(txTo), nIn,
            sigHashType.withForkValue(newForValue ^ 0xdead), Amount::zero());
        BOOST_CHECK(shrepff == manualshrepff);

        uint256 shrepabcdef = SignatureHash(
            scriptCode, CTransaction(txTo), nIn,
            sigHashType.withForkValue(0xabcdef), Amount::zero(), nullptr,
            SCRIPT_ENABLE_SIGHASH_FORKID | SCRIPT_ENABLE_REPLAY_PROTECTION);
        uint256 manualshrepabcdef =
            SignatureHash(scriptCode, CTransaction(txTo), nIn,
                          sigHashType.withForkValue(0xff1342), Amount::zero());
        BOOST_CHECK(shrepabcdef == manualshrepabcdef);

#if defined(PRINT_SIGHASH_JSON)
        CDataStream ss(SER_NETWORK, PROTOCOL_VERSION);
        ss << txTo;

        std::cout << "\t[\"";
        std::cout << HexStr(ss.begin(), ss.end()) << "\", \"";
        std::cout << HexStr(scriptCode) << "\", ";
        std::cout << nIn << ", ";
        std::cout << int(nHashType) << ", ";
        std::cout << "\"" << shreg.GetHex() << "\", ";
        std::cout << "\"" << shold.GetHex() << "\", ";
        std::cout << "\"" << shrep.GetHex() << "\"]";
        if (i + 1 != nRandomTests) {
            std::cout << ",";
        }
        std::cout << "\n";
#endif
    }
#if defined(PRINT_SIGHASH_JSON)
    std::cout << "]\n";
#endif
}

// Goal: check that SignatureHash generates correct hash
BOOST_AUTO_TEST_CASE(sighash_from_data) {
    UniValue tests = read_json(
        std::string(json_tests::sighash,
                    json_tests::sighash + sizeof(json_tests::sighash)));

    for (size_t idx = 0; idx < tests.size(); idx++) {
        UniValue test = tests[idx];
        std::string strTest = test.write();
        // Allow for extra stuff (useful for comments)
        if (test.size() < 1) {
            BOOST_ERROR("Bad test: " << strTest);
            continue;
        }
        if (test.size() == 1) {
            // comment
            continue;
        }

        std::string sigHashRegHex, sigHashOldHex, sigHashRepHex;
        int nIn;
        SigHashType sigHashType;
        CTransactionRef tx;
        CScript scriptCode = CScript();

        try {
            // deserialize test data
            std::string raw_tx = test[0].get_str();
            std::string raw_script = test[1].get_str();
            nIn = test[2].get_int();
            sigHashType = SigHashType(test[3].get_int());
            sigHashRegHex = test[4].get_str();
            sigHashOldHex = test[5].get_str();
            sigHashRepHex = test[6].get_str();

            CDataStream stream(ParseHex(raw_tx), SER_NETWORK, PROTOCOL_VERSION);
            stream >> tx;

            CValidationState state;
            BOOST_CHECK_MESSAGE(CheckRegularTransaction(*tx, state), strTest);
            BOOST_CHECK(state.IsValid());

            std::vector<uint8_t> raw = ParseHex(raw_script);
            scriptCode.insert(scriptCode.end(), raw.begin(), raw.end());
        } catch (...) {
            BOOST_ERROR("Bad test, couldn't deserialize data: " << strTest);
            continue;
        }

        uint256 shreg =
            SignatureHash(scriptCode, *tx, nIn, sigHashType, Amount::zero());
        BOOST_CHECK_MESSAGE(shreg.GetHex() == sigHashRegHex, strTest);

        uint256 shold = SignatureHash(scriptCode, *tx, nIn, sigHashType,
                                      Amount::zero(), nullptr, 0);
        BOOST_CHECK_MESSAGE(shold.GetHex() == sigHashOldHex, strTest);

        uint256 shrep = SignatureHash(
            scriptCode, *tx, nIn, sigHashType, Amount::zero(), nullptr,
            SCRIPT_ENABLE_SIGHASH_FORKID | SCRIPT_ENABLE_REPLAY_PROTECTION);
        BOOST_CHECK_MESSAGE(shrep.GetHex() == sigHashRepHex, strTest);
    }
}

BOOST_AUTO_TEST_SUITE_END()
