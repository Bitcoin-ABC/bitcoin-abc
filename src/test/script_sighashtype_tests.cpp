// Copyright (c) 2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "script/sighashtype.h"
#include "test/test_bitcoin.h"

#include <boost/test/unit_test.hpp>

#include <set>

BOOST_FIXTURE_TEST_SUITE(script_sighashtype_tests, BasicTestingSetup)

static void CheckSigHashType(SigHashType t, BaseSigHashType baseType,
                             bool hasSupportedBaseType, uint32_t forkValue,
                             bool hasForkId, bool hasAnyoneCanPay) {
    BOOST_CHECK(t.getBaseType() == baseType);
    BOOST_CHECK_EQUAL(t.hasSupportedBaseType(), hasSupportedBaseType);
    BOOST_CHECK_EQUAL(t.getForkValue(), forkValue);
    BOOST_CHECK_EQUAL(t.hasForkId(), hasForkId);
    BOOST_CHECK_EQUAL(t.hasAnyoneCanPay(), hasAnyoneCanPay);
}

BOOST_AUTO_TEST_CASE(sighash_construction_test) {
    // Check default values.
    CheckSigHashType(SigHashType(), BaseSigHashType::ALL, true, 0, false,
                     false);

    // Check all possible permutations.
    std::set<BaseSigHashType> baseTypes{
        BaseSigHashType::UNSUPPORTED, BaseSigHashType::ALL,
        BaseSigHashType::NONE, BaseSigHashType::SINGLE};
    std::set<uint32_t> forkValues{0, 1, 0x123456, 0xfedcba, 0xffffff};
    std::set<bool> forkIdFlagValues{false, true};
    std::set<bool> anyoneCanPayFlagValues{false, true};

    for (BaseSigHashType baseType : baseTypes) {
        for (uint32_t forkValue : forkValues) {
            for (bool hasForkId : forkIdFlagValues) {
                for (bool hasAnyoneCanPay : anyoneCanPayFlagValues) {
                    SigHashType t = SigHashType()
                                        .withBaseType(baseType)
                                        .withForkValue(forkValue)
                                        .withForkId(hasForkId)
                                        .withAnyoneCanPay(hasAnyoneCanPay);

                    bool hasSupportedBaseType =
                        baseType != BaseSigHashType::UNSUPPORTED;
                    CheckSigHashType(t, baseType, hasSupportedBaseType,
                                     forkValue, hasForkId, hasAnyoneCanPay);

                    // Also check all possible alterations.
                    CheckSigHashType(t.withForkId(hasForkId), baseType,
                                     hasSupportedBaseType, forkValue, hasForkId,
                                     hasAnyoneCanPay);
                    CheckSigHashType(t.withForkId(!hasForkId), baseType,
                                     hasSupportedBaseType, forkValue,
                                     !hasForkId, hasAnyoneCanPay);
                    CheckSigHashType(t.withAnyoneCanPay(hasAnyoneCanPay),
                                     baseType, hasSupportedBaseType, forkValue,
                                     hasForkId, hasAnyoneCanPay);
                    CheckSigHashType(t.withAnyoneCanPay(!hasAnyoneCanPay),
                                     baseType, hasSupportedBaseType, forkValue,
                                     hasForkId, !hasAnyoneCanPay);

                    for (BaseSigHashType newBaseType : baseTypes) {
                        bool hasSupportedNewBaseType =
                            newBaseType != BaseSigHashType::UNSUPPORTED;
                        CheckSigHashType(t.withBaseType(newBaseType),
                                         newBaseType, hasSupportedNewBaseType,
                                         forkValue, hasForkId, hasAnyoneCanPay);
                    }

                    for (uint32_t newForkValue : forkValues) {
                        CheckSigHashType(t.withForkValue(newForkValue),
                                         baseType, hasSupportedBaseType,
                                         newForkValue, hasForkId,
                                         hasAnyoneCanPay);
                    }
                }
            }
        }
    }
}

BOOST_AUTO_TEST_CASE(sighash_serialization_test) {
    std::set<uint32_t> forkValues{0, 1, 0xab1fe9, 0xc81eea, 0xffffff};

    // Test all possible base sig hash values.
    for (uint32_t baseType = 0; baseType <= 0x1f; baseType++) {
        for (uint32_t forkValue : forkValues) {
            bool hasSupportedBaseType =
                (baseType != 0) && (baseType <= SIGHASH_SINGLE);

            uint32_t rawType = baseType | (forkValue << 8);

            SigHashType tbase(rawType);
            SigHashType tforkid(rawType | SIGHASH_FORKID);
            SigHashType tanyonecanspend(rawType | SIGHASH_ANYONECANPAY);
            SigHashType tboth(rawType | SIGHASH_FORKID | SIGHASH_ANYONECANPAY);

            // Check deserialization.
            CheckSigHashType(tbase, BaseSigHashType(baseType),
                             hasSupportedBaseType, forkValue, false, false);
            CheckSigHashType(tforkid, BaseSigHashType(baseType),
                             hasSupportedBaseType, forkValue, true, false);
            CheckSigHashType(tanyonecanspend, BaseSigHashType(baseType),
                             hasSupportedBaseType, forkValue, false, true);
            CheckSigHashType(tboth, BaseSigHashType(baseType),
                             hasSupportedBaseType, forkValue, true, true);

            // Check raw value.
            BOOST_CHECK_EQUAL(tbase.getRawSigHashType(), rawType);
            BOOST_CHECK_EQUAL(tforkid.getRawSigHashType(),
                              rawType | SIGHASH_FORKID);
            BOOST_CHECK_EQUAL(tanyonecanspend.getRawSigHashType(),
                              rawType | SIGHASH_ANYONECANPAY);
            BOOST_CHECK_EQUAL(tboth.getRawSigHashType(),
                              rawType | SIGHASH_FORKID | SIGHASH_ANYONECANPAY);

            // Check serialization/deserialization.
            uint32_t unserializedOutput;
            (CDataStream(SER_DISK, 0) << tbase) >> unserializedOutput;
            BOOST_CHECK_EQUAL(unserializedOutput, rawType);
            (CDataStream(SER_DISK, 0) << tforkid) >> unserializedOutput;
            BOOST_CHECK_EQUAL(unserializedOutput, rawType | SIGHASH_FORKID);
            (CDataStream(SER_DISK, 0) << tanyonecanspend) >> unserializedOutput;
            BOOST_CHECK_EQUAL(unserializedOutput,
                              rawType | SIGHASH_ANYONECANPAY);
            (CDataStream(SER_DISK, 0) << tboth) >> unserializedOutput;
            BOOST_CHECK_EQUAL(unserializedOutput,
                              rawType | SIGHASH_FORKID | SIGHASH_ANYONECANPAY);
        }
    }
}

BOOST_AUTO_TEST_SUITE_END()
