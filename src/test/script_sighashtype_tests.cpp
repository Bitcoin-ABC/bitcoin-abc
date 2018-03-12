// Copyright (c) 2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "script/sighashtype.h"
#include "test/test_bitcoin.h"

#include <boost/test/unit_test.hpp>

#include <set>

BOOST_FIXTURE_TEST_SUITE(script_sighashtype_tests, BasicTestingSetup)

static void CheckSigHashType(SigHashType t, BaseSigHashType baseType,
                             bool hasSupportedBaseType, bool hasForkId,
                             bool hasAnyoneCanPay) {
    BOOST_CHECK(t.getBaseType() == baseType);
    BOOST_CHECK_EQUAL(t.hasSupportedBaseType(), hasSupportedBaseType);
    BOOST_CHECK_EQUAL(t.hasForkId(), hasForkId);
    BOOST_CHECK_EQUAL(t.hasAnyoneCanPay(), hasAnyoneCanPay);
}

BOOST_AUTO_TEST_CASE(sighash_construction_test) {
    // Check default values.
    CheckSigHashType(SigHashType(), BaseSigHashType::ALL, true, false, false);

    // Check all possible permutations.
    std::set<BaseSigHashType> baseTypes{
        BaseSigHashType::UNSUPPORTED, BaseSigHashType::ALL,
        BaseSigHashType::NONE, BaseSigHashType::SINGLE};
    std::set<bool> forkIdFlagValues{false, true};
    std::set<bool> anyoneCanPayFlagValues{false, true};

    for (BaseSigHashType baseType : baseTypes) {
        for (bool hasForkId : forkIdFlagValues) {
            for (bool hasAnyoneCanPay : anyoneCanPayFlagValues) {
                SigHashType t = SigHashType()
                                    .withBaseType(baseType)
                                    .withForkId(hasForkId)
                                    .withAnyoneCanPay(hasAnyoneCanPay);

                bool hasSupportedBaseType =
                    baseType != BaseSigHashType::UNSUPPORTED;
                CheckSigHashType(t, baseType, hasSupportedBaseType, hasForkId,
                                 hasAnyoneCanPay);

                // Also check all possible alterations.
                CheckSigHashType(t.withForkId(hasForkId), baseType,
                                 hasSupportedBaseType, hasForkId,
                                 hasAnyoneCanPay);
                CheckSigHashType(t.withForkId(!hasForkId), baseType,
                                 hasSupportedBaseType, !hasForkId,
                                 hasAnyoneCanPay);
                CheckSigHashType(t.withAnyoneCanPay(hasAnyoneCanPay), baseType,
                                 hasSupportedBaseType, hasForkId,
                                 hasAnyoneCanPay);
                CheckSigHashType(t.withAnyoneCanPay(!hasAnyoneCanPay), baseType,
                                 hasSupportedBaseType, hasForkId,
                                 !hasAnyoneCanPay);

                for (BaseSigHashType newBaseType : baseTypes) {
                    bool hasSupportedNewBaseType =
                        newBaseType != BaseSigHashType::UNSUPPORTED;
                    CheckSigHashType(t.withBaseType(newBaseType), newBaseType,
                                     hasSupportedNewBaseType, hasForkId,
                                     hasAnyoneCanPay);
                }
            }
        }
    }
}

BOOST_AUTO_TEST_CASE(sighash_serialization_test) {
    // Test all possible base sig hash values
    for (uint32_t baseType = 0; baseType <= 0x1f; baseType++) {
        bool hasSupportedBaseType =
            (baseType != 0) && (baseType <= SIGHASH_SINGLE);

        SigHashType tbase(baseType);
        SigHashType tforkid(baseType | SIGHASH_FORKID);
        SigHashType tanyonecanspend(baseType | SIGHASH_ANYONECANPAY);
        SigHashType tboth(baseType | SIGHASH_FORKID | SIGHASH_ANYONECANPAY);

        // Check deserialization.
        CheckSigHashType(tbase, BaseSigHashType(baseType), hasSupportedBaseType,
                         false, false);
        CheckSigHashType(tforkid, BaseSigHashType(baseType),
                         hasSupportedBaseType, true, false);
        CheckSigHashType(tanyonecanspend, BaseSigHashType(baseType),
                         hasSupportedBaseType, false, true);
        CheckSigHashType(tboth, BaseSigHashType(baseType), hasSupportedBaseType,
                         true, true);

        // Check raw value.
        BOOST_CHECK_EQUAL(tbase.getRawSigHashType(), baseType);
        BOOST_CHECK_EQUAL(tforkid.getRawSigHashType(),
                          baseType | SIGHASH_FORKID);
        BOOST_CHECK_EQUAL(tanyonecanspend.getRawSigHashType(),
                          baseType | SIGHASH_ANYONECANPAY);
        BOOST_CHECK_EQUAL(tboth.getRawSigHashType(),
                          baseType | SIGHASH_FORKID | SIGHASH_ANYONECANPAY);

        // Check serialization/deserialization.
        uint32_t unserializedOutput;
        (CDataStream(SER_DISK, 0) << tbase) >> unserializedOutput;
        BOOST_CHECK_EQUAL(unserializedOutput, baseType);
        (CDataStream(SER_DISK, 0) << tforkid) >> unserializedOutput;
        BOOST_CHECK_EQUAL(unserializedOutput, baseType | SIGHASH_FORKID);
        (CDataStream(SER_DISK, 0) << tanyonecanspend) >> unserializedOutput;
        BOOST_CHECK_EQUAL(unserializedOutput, baseType | SIGHASH_ANYONECANPAY);
        (CDataStream(SER_DISK, 0) << tboth) >> unserializedOutput;
        BOOST_CHECK_EQUAL(unserializedOutput,
                          baseType | SIGHASH_FORKID | SIGHASH_ANYONECANPAY);
    }
}

BOOST_AUTO_TEST_SUITE_END()
