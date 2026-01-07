// Copyright (c) 2013-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <common/system.h>
#include <consensus/tx_check.h>
#include <consensus/validation.h>
#include <hash.h>
#include <script/interpreter.h>
#include <script/script.h>
#include <serialize.h>
#include <streams.h>
#include <util/strencodings.h>

#include <test/data/sighash.json.h>
#include <test/jsonutil.h>
#include <test/util/random.h>
#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

#include <univalue.h>

#include <iostream>

// Old script.cpp SignatureHash function
static uint256 SignatureHashOld(CScript scriptCode, const CTransaction &txTo,
                                unsigned int nIn, uint32_t nHashType) {
    if (nIn >= txTo.vin.size()) {
        return uint256::ONE;
    }
    CMutableTransaction txTmp(txTo);

    // In case concatenating two scripts ends up with two codeseparators, or an
    // extra one at the end, this prevents all those possible incompatibilities.
    FindAndDelete(scriptCode, CScript(OP_CODESEPARATOR));

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
            return uint256::ONE;
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
    HashWriter ss{};
    ss << txTmp << nHashType;
    return ss.GetHash();
}

struct SigHashTest : BasicTestingSetup {
    void RandomScript(CScript &script) {
        static const opcodetype oplist[] = {
            OP_FALSE, OP_1,        OP_2,
            OP_3,     OP_CHECKSIG, OP_IF,
            OP_VERIF, OP_RETURN,   OP_CODESEPARATOR};
        script = CScript();
        int ops = (m_rng.randrange(10));
        for (int i = 0; i < ops; i++) {
            script << oplist[m_rng.randrange(std::size(oplist))];
        }
    }

    void RandomTransaction(CMutableTransaction &tx, bool fSingle) {
        tx.nVersion = m_rng.rand32();
        tx.vin.clear();
        tx.vout.clear();
        tx.nLockTime = (m_rng.randbool()) ? m_rng.rand32() : 0;
        int ins = (m_rng.randbits(2)) + 1;
        int outs = fSingle ? ins : (m_rng.randbits(2)) + 1;
        for (int in = 0; in < ins; in++) {
            tx.vin.push_back(CTxIn());
            CTxIn &txin = tx.vin.back();
            txin.prevout = COutPoint(TxId(m_rng.rand256()), m_rng.randbits(2));
            RandomScript(txin.scriptSig);
            txin.nSequence = m_rng.randbool()
                                 ? m_rng.rand32()
                                 : std::numeric_limits<uint32_t>::max();
        }
        for (int out = 0; out < outs; out++) {
            tx.vout.push_back(CTxOut());
            CTxOut &txout = tx.vout.back();
            txout.nValue = RandMoney(m_rng);
            RandomScript(txout.scriptPubKey);
        }
    }
}; // struct SigHashTest

BOOST_FIXTURE_TEST_SUITE(sighash_tests, SigHashTest)

BOOST_AUTO_TEST_CASE(sighash_test) {
#if defined(PRINT_SIGHASH_JSON)
    std::cout << "[\n";
    std::cout << "\t[\"raw_transaction, script, input_index, hashType, "
                 "signature_hash (regular), signature_hash(no forkid), "
                 "signature_hash(replay protected)\"],\n";
#endif

    int nRandomTests = 1000;
    for (int i = 0; i < nRandomTests; i++) {
        uint32_t nHashType = m_rng.rand32();
        SigHashType sigHashType(nHashType);

        CMutableTransaction txTo;
        RandomTransaction(txTo, (nHashType & 0x1f) == SIGHASH_SINGLE);
        CScript scriptCode;
        RandomScript(scriptCode);
        int nIn = m_rng.randrange(txTo.vin.size());

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
        uint32_t newForkValue = 0xff0000 | ((nHashType >> 8) ^ 0xdead);
        uint256 manualshrep = SignatureHash(
            scriptCode, CTransaction(txTo), nIn,
            sigHashType.withForkValue(newForkValue), Amount::zero());
        BOOST_CHECK(shrep == manualshrep);

        // Replay protection works even if the hash is of the form 0xffxxxx
        uint256 shrepff = SignatureHash(
            scriptCode, CTransaction(txTo), nIn,
            sigHashType.withForkValue(newForkValue), Amount::zero(), nullptr,
            SCRIPT_ENABLE_SIGHASH_FORKID | SCRIPT_ENABLE_REPLAY_PROTECTION);
        uint256 manualshrepff = SignatureHash(
            scriptCode, CTransaction(txTo), nIn,
            sigHashType.withForkValue(newForkValue ^ 0xdead), Amount::zero());
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
        DataStream ss{};
        ss << txTo;

        std::cout << "\t[\"";
        std::cout << HexStr(ss) << "\", \"";
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
    UniValue tests = read_json(json_tests::sighash);

    for (size_t idx = 0; idx < tests.size(); idx++) {
        const UniValue &test = tests[idx];
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
            nIn = test[2].getInt<int>();
            sigHashType = SigHashType(test[3].getInt<int>());
            sigHashRegHex = test[4].get_str();
            sigHashOldHex = test[5].get_str();
            sigHashRepHex = test[6].get_str();

            DataStream stream{ParseHex(raw_tx)};
            stream >> tx;

            TxValidationState state;
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

BOOST_AUTO_TEST_CASE(sighash_caching) {
    // Get a script, transaction and parameters as inputs to the sighash
    // function.
    CScript scriptcode;
    RandomScript(scriptcode);
    CScript diff_scriptcode{scriptcode};
    diff_scriptcode << OP_1;
    CMutableTransaction tx;
    RandomTransaction(tx, /*fSingle=*/false);
    const auto in_index{static_cast<uint32_t>(m_rng.randrange(tx.vin.size()))};
    const auto amount{RandMoney(m_rng)};

    // Exercise the sighash function under all flag combinations that matter.
    std::vector<uint32_t> relevant_flags{
        0, SCRIPT_ENABLE_REPLAY_PROTECTION, SCRIPT_ENABLE_SIGHASH_FORKID,
        SCRIPT_ENABLE_REPLAY_PROTECTION | SCRIPT_ENABLE_SIGHASH_FORKID};

    for (const uint32_t flags : relevant_flags) {
        // For each, run it against all the 12 standard hash types and a few
        // additional random ones.
        std::vector<uint32_t> hash_types{
            {SIGHASH_ALL, SIGHASH_NONE, SIGHASH_SINGLE,
             SIGHASH_ALL | SIGHASH_ANYONECANPAY,
             SIGHASH_NONE | SIGHASH_ANYONECANPAY,
             SIGHASH_SINGLE | SIGHASH_ANYONECANPAY,
             SIGHASH_ALL | SIGHASH_FORKID, SIGHASH_NONE | SIGHASH_FORKID,
             SIGHASH_SINGLE | SIGHASH_FORKID,
             SIGHASH_ALL | SIGHASH_FORKID | SIGHASH_ANYONECANPAY,
             SIGHASH_NONE | SIGHASH_FORKID | SIGHASH_ANYONECANPAY,
             SIGHASH_SINGLE | SIGHASH_FORKID | SIGHASH_ANYONECANPAY,
             SIGHASH_FORKID, SIGHASH_ANYONECANPAY,
             SIGHASH_FORKID | SIGHASH_ANYONECANPAY, 0,
             std::numeric_limits<int32_t>::max()}};

        for (int i{0}; i < 10; ++i) {
            // TODO: backport core#29625 and use  m_rng.rand<int8_t>()
            hash_types.push_back(
                i % 2 == 0
                    ? m_rng.randrange(std::numeric_limits<int8_t>::max())
                    : m_rng.randrange(std::numeric_limits<int32_t>::max()));
        }
        // Reuse the same cache across script types. This must not cause any
        // issue as the cached value for one hash type must never be confused
        // for another (instantiating the cache within the loop instead would
        // prevent testing this).
        SigHashCache cache;
        for (const auto hash_type : hash_types) {
            const SigHashType sig_hash_type{hash_type};
            const bool expect_one{
                !(sig_hash_type.hasForkId() &&
                  (flags & SCRIPT_ENABLE_SIGHASH_FORKID)) &&
                (sig_hash_type.getBaseType() == BaseSigHashType::SINGLE) &&
                in_index >= tx.vout.size()};

            // The result of computing the sighash should be the same with or
            // without cache.
            const auto sighash_with_cache{
                SignatureHash(scriptcode, tx, in_index, sig_hash_type, amount,
                              nullptr, flags, &cache)};
            const auto sighash_no_cache{SignatureHash(scriptcode, tx, in_index,
                                                      sig_hash_type, amount,
                                                      nullptr, flags, nullptr)};
            BOOST_CHECK_EQUAL(sighash_with_cache, sighash_no_cache);

            // Calling the cached version again should return the same value
            // again.
            BOOST_CHECK_EQUAL(sighash_with_cache,
                              SignatureHash(scriptcode, tx, in_index,
                                            sig_hash_type, amount, nullptr,
                                            flags, &cache));

            // While here we might as well also check that the result for
            // legacy is the same as for the old SignatureHash() function.
            if (flags == 0) {
                BOOST_CHECK_EQUAL(sighash_with_cache,
                                  SignatureHashOld(scriptcode, CTransaction(tx),
                                                   in_index, hash_type));
            }

            // Calling with a different scriptcode (for instance in case a
            // CODESEP is encountered) will not return the cache value but
            // overwrite it. The sighash will always be different except in case
            // of legacy SIGHASH_SINGLE bug.
            const auto sighash_with_cache2{
                SignatureHash(diff_scriptcode, tx, in_index, sig_hash_type,
                              amount, nullptr, flags, &cache)};
            const auto sighash_no_cache2{
                SignatureHash(diff_scriptcode, tx, in_index, sig_hash_type,
                              amount, nullptr, flags, nullptr)};
            BOOST_CHECK_EQUAL(sighash_with_cache2, sighash_no_cache2);
            if (!expect_one) {
                BOOST_CHECK_NE(sighash_with_cache, sighash_with_cache2);
            } else {
                BOOST_CHECK_EQUAL(sighash_with_cache, sighash_with_cache2);
                BOOST_CHECK_EQUAL(sighash_with_cache, uint256::ONE);
            }

            // Calling the cached version again should return the same value
            // again.
            BOOST_CHECK_EQUAL(sighash_with_cache2,
                              SignatureHash(diff_scriptcode, tx, in_index,
                                            sig_hash_type, amount, nullptr,
                                            flags, &cache));

            // And if we store a different value for this scriptcode and hash
            // type it will return that instead.
            {
                HashWriter h{};
                h << 42;
                cache.Store(sig_hash_type, scriptcode, h);
                const auto stored_hash{h.GetHash()};
                BOOST_CHECK(cache.Load(sig_hash_type, scriptcode, h));
                const auto loaded_hash{h.GetHash()};
                BOOST_CHECK_EQUAL(stored_hash, loaded_hash);
            }

            // And using this mutated cache with the sighash function will
            // return the new value (except in the legacy SIGHASH_SINGLE bug
            // case in which it'll return 1).
            if (!expect_one) {
                BOOST_CHECK_NE(SignatureHash(scriptcode, tx, in_index,
                                             sig_hash_type, amount, nullptr,
                                             flags, &cache),
                               sighash_with_cache);
                HashWriter h{};
                BOOST_CHECK(cache.Load(sig_hash_type, scriptcode, h));
                SigHashType sig_hash_type2{sig_hash_type};
                if (flags & SCRIPT_ENABLE_REPLAY_PROTECTION) {
                    // We modify the sig hash type by xoring with 0xdead.
                    // See relevant comment in interpreter.cpp:SignatureHash
                    // This affects the resulting hash, but not the index in
                    // the cache.
                    uint32_t newForkValue =
                        sig_hash_type2.getForkValue() ^ 0xdead;
                    sig_hash_type2 =
                        sig_hash_type2.withForkValue(0xff0000 | newForkValue);
                }
                h << sig_hash_type2;
                const auto new_hash{h.GetHash()};
                BOOST_CHECK_EQUAL(SignatureHash(scriptcode, tx, in_index,
                                                sig_hash_type, amount, nullptr,
                                                flags, &cache),
                                  new_hash);
            } else {
                BOOST_CHECK_EQUAL(SignatureHash(scriptcode, tx, in_index,
                                                sig_hash_type, amount, nullptr,
                                                flags, &cache),
                                  uint256::ONE);
            }

            // Wipe the cache and restore the correct cached value for this
            // scriptcode and hash_type before starting the next iteration.
            HashWriter dummy{};
            cache.Store(sig_hash_type, diff_scriptcode, dummy);
            (void)SignatureHash(scriptcode, tx, in_index, sig_hash_type, amount,
                                nullptr, flags, &cache);
            BOOST_CHECK(cache.Load(sig_hash_type, scriptcode, dummy) ||
                        expect_one);
        }
    }
}

BOOST_AUTO_TEST_SUITE_END()
