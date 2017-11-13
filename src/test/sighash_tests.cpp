// Copyright (c) 2013-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "consensus/validation.h"
#include "data/sighash.json.h"
#include "hash.h"
#include "script/interpreter.h"
#include "script/script.h"
#include "serialize.h"
#include "streams.h"
#include "test/test_bitcoin.h"
#include "test/test_random.h"
#include "util.h"
#include "utilstrencodings.h"
#include "validation.h" // For CheckRegularTransaction
#include "version.h"

#include <iostream>

#include <boost/test/unit_test.hpp>

#include <univalue.h>

extern UniValue read_json(const std::string &jsondata);

// Old script.cpp SignatureHash function
static uint256 SignatureHashOld(CScript scriptCode, const CTransaction &txTo,
                                unsigned int nIn, int nHashType) {
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
    for (unsigned int i = 0; i < txTmp.vin.size(); i++)
        txTmp.vin[i].scriptSig = CScript();
    txTmp.vin[nIn].scriptSig = scriptCode;

    // Blank out some of the outputs
    if ((nHashType & 0x1f) == SIGHASH_NONE) {
        // Wildcard payee
        txTmp.vout.clear();

        // Let the others update at will
        for (unsigned int i = 0; i < txTmp.vin.size(); i++)
            if (i != nIn) txTmp.vin[i].nSequence = 0;
    } else if ((nHashType & 0x1f) == SIGHASH_SINGLE) {
        // Only lock-in the txout payee at same index as txin
        unsigned int nOut = nIn;
        if (nOut >= txTmp.vout.size()) {
            printf("ERROR: SignatureHash(): nOut=%d out of range\n", nOut);
            return one;
        }
        txTmp.vout.resize(nOut + 1);
        for (unsigned int i = 0; i < nOut; i++)
            txTmp.vout[i].SetNull();

        // Let the others update at will
        for (unsigned int i = 0; i < txTmp.vin.size(); i++)
            if (i != nIn) txTmp.vin[i].nSequence = 0;
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
    int ops = (insecure_rand() % 10);
    for (int i = 0; i < ops; i++)
        script
            << oplist[insecure_rand() % (sizeof(oplist) / sizeof(oplist[0]))];
}

static void RandomTransaction(CMutableTransaction &tx, bool fSingle) {
    tx.nVersion = insecure_rand();
    tx.vin.clear();
    tx.vout.clear();
    tx.nLockTime = (insecure_rand() % 2) ? insecure_rand() : 0;
    int ins = (insecure_rand() % 4) + 1;
    int outs = fSingle ? ins : (insecure_rand() % 4) + 1;
    for (int in = 0; in < ins; in++) {
        tx.vin.push_back(CTxIn());
        CTxIn &txin = tx.vin.back();
        txin.prevout.hash = GetRandHash();
        txin.prevout.n = insecure_rand() % 4;
        RandomScript(txin.scriptSig);
        txin.nSequence =
            (insecure_rand() % 2) ? insecure_rand() : (unsigned int)-1;
    }
    for (int out = 0; out < outs; out++) {
        tx.vout.push_back(CTxOut());
        CTxOut &txout = tx.vout.back();
        txout.nValue = Amount(int64_t(insecure_rand()) % 100000000);
        RandomScript(txout.scriptPubKey);
    }
}

BOOST_FIXTURE_TEST_SUITE(sighash_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(sighash_test) {
    seed_insecure_rand(false);

#if defined(PRINT_SIGHASH_JSON)
    std::cout << "[\n";
    std::cout << "\t[\"raw_transaction, script, input_index, hashType, "
                 "signature_hash (result)\"],\n";
#endif
    int nRandomTests = 50000;

#if defined(PRINT_SIGHASH_JSON)
    nRandomTests = 500;
#endif
    for (int i = 0; i < nRandomTests; i++) {
        int nHashType = insecure_rand();

        // Clear forkid
        nHashType &= ~SIGHASH_FORKID;

        CMutableTransaction txTo;
        RandomTransaction(txTo, (nHashType & 0x1f) == SIGHASH_SINGLE);
        CScript scriptCode;
        RandomScript(scriptCode);
        int nIn = insecure_rand() % txTo.vin.size();

        uint256 sh, sho;
        sho = SignatureHashOld(scriptCode, txTo, nIn, nHashType);
        sh = SignatureHash(scriptCode, txTo, nIn, nHashType, 0);
#if defined(PRINT_SIGHASH_JSON)
        CDataStream ss(SER_NETWORK, PROTOCOL_VERSION);
        ss << txTo;

        std::cout << "\t[\"";
        std::cout << HexStr(ss.begin(), ss.end()) << "\", \"";
        std::cout << HexStr(scriptCode) << "\", ";
        std::cout << nIn << ", ";
        std::cout << nHashType << ", \"";
        std::cout << sh.GetHex() << "\"]";
        if (i + 1 != nRandomTests) {
            std::cout << ",";
        }
        std::cout << "\n";
#endif
        BOOST_CHECK(sh == sho);
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

    for (unsigned int idx = 0; idx < tests.size(); idx++) {
        UniValue test = tests[idx];
        std::string strTest = test.write();
        // Allow for extra stuff (useful for comments)
        if (test.size() < 1) {
            BOOST_ERROR("Bad test: " << strTest);
            continue;
        }
        if (test.size() == 1) continue; // comment

        std::string raw_tx, raw_script, sigHashHex;
        int nIn, nHashType;
        uint256 sh;
        CTransactionRef tx;
        CScript scriptCode = CScript();

        try {
            // deserialize test data
            raw_tx = test[0].get_str();
            raw_script = test[1].get_str();
            nIn = test[2].get_int();
            nHashType = test[3].get_int();
            sigHashHex = test[4].get_str();

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

        sh = SignatureHash(scriptCode, *tx, nIn, nHashType, 0);
        BOOST_CHECK_MESSAGE(sh.GetHex() == sigHashHex, strTest);
    }
}

BOOST_AUTO_TEST_SUITE_END()
