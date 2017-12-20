// Copyright (c) 2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "script/sighashtype.h"
#include "test/test_bitcoin.h"

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(script_sighashtype_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(SigHashTypeTests) {
    BOOST_CHECK(SigHashType().getBaseSigHashType() == BaseSigHashType::ALL);

    BOOST_CHECK(SigHashType(SIGHASH_ALL).getBaseSigHashType() ==
                BaseSigHashType::ALL);

    BOOST_CHECK(SigHashType(SIGHASH_NONE).getBaseSigHashType() ==
                BaseSigHashType::NONE);

    BOOST_CHECK(SigHashType(SIGHASH_SINGLE).getBaseSigHashType() ==
                BaseSigHashType::SINGLE);

    BOOST_CHECK_EQUAL(SigHashType(SIGHASH_ALL | SIGHASH_FORKID).hasForkId(),
                      true);
    BOOST_CHECK_EQUAL(
        SigHashType(SIGHASH_ALL | SIGHASH_FORKID).hasAnyoneCanPay(), false);

    BOOST_CHECK_EQUAL(
        SigHashType(SIGHASH_ALL | SIGHASH_ANYONECANPAY).hasForkId(), false);
    BOOST_CHECK_EQUAL(
        SigHashType(SIGHASH_ALL | SIGHASH_ANYONECANPAY).hasAnyoneCanPay(),
        true);

    BOOST_CHECK(SigHashType()
                    .withBaseSigHash(BaseSigHashType::ALL)
                    .getBaseSigHashType() == BaseSigHashType::ALL);
    BOOST_CHECK(SigHashType()
                    .withBaseSigHash(BaseSigHashType::NONE)
                    .getBaseSigHashType() == BaseSigHashType::NONE);
    BOOST_CHECK(SigHashType()
                    .withBaseSigHash(BaseSigHashType::SINGLE)
                    .getBaseSigHashType() == BaseSigHashType::SINGLE);
    BOOST_CHECK_EQUAL(SigHashType().withForkId(true).hasForkId(), true);
    BOOST_CHECK_EQUAL(SigHashType().withAnyoneCanPay(true).hasAnyoneCanPay(),
                      true);

    BOOST_CHECK_EQUAL(SigHashType()
                          .withBaseSigHash(BaseSigHashType::ALL)
                          .withForkId(true)
                          .getRawSigHashType(),
                      SIGHASH_ALL | SIGHASH_FORKID);
    BOOST_CHECK_EQUAL(SigHashType()
                          .withBaseSigHash(BaseSigHashType::NONE)
                          .withForkId(true)
                          .getRawSigHashType(),
                      SIGHASH_NONE | SIGHASH_FORKID);
    BOOST_CHECK_EQUAL(SigHashType()
                          .withBaseSigHash(BaseSigHashType::SINGLE)
                          .withForkId(true)
                          .getRawSigHashType(),
                      SIGHASH_SINGLE | SIGHASH_FORKID);

    BOOST_CHECK_EQUAL(SigHashType()
                          .withBaseSigHash(BaseSigHashType::ALL)
                          .withAnyoneCanPay(true)
                          .getRawSigHashType(),
                      SIGHASH_ALL | SIGHASH_ANYONECANPAY);
    BOOST_CHECK_EQUAL(SigHashType()
                          .withBaseSigHash(BaseSigHashType::NONE)
                          .withAnyoneCanPay(true)
                          .getRawSigHashType(),
                      SIGHASH_NONE | SIGHASH_ANYONECANPAY);
    BOOST_CHECK_EQUAL(SigHashType()
                          .withBaseSigHash(BaseSigHashType::SINGLE)
                          .withAnyoneCanPay(true)
                          .getRawSigHashType(),
                      SIGHASH_SINGLE | SIGHASH_ANYONECANPAY);

    BOOST_CHECK_EQUAL(SigHashType()
                          .withBaseSigHash(BaseSigHashType::ALL)
                          .withAnyoneCanPay(true)
                          .withForkId(true)
                          .getRawSigHashType(),
                      SIGHASH_ALL | SIGHASH_ANYONECANPAY | SIGHASH_FORKID);

    BOOST_CHECK_EQUAL(SigHashType()
                          .withBaseSigHash(BaseSigHashType::ALL)
                          .withForkId(true)
                          .withForkId(false)
                          .hasForkId(),
                      false);
    BOOST_CHECK_EQUAL(SigHashType()
                          .withBaseSigHash(BaseSigHashType::ALL)
                          .withForkId(false)
                          .withForkId(true)
                          .hasForkId(),
                      true);

    BOOST_CHECK_EQUAL(SigHashType()
                          .withBaseSigHash(BaseSigHashType::ALL)
                          .withAnyoneCanPay(true)
                          .withAnyoneCanPay(false)
                          .hasAnyoneCanPay(),
                      false);
    BOOST_CHECK_EQUAL(SigHashType()
                          .withBaseSigHash(BaseSigHashType::ALL)
                          .withAnyoneCanPay(false)
                          .withAnyoneCanPay(true)
                          .hasAnyoneCanPay(),
                      true);

    BOOST_CHECK(SigHashType()
                    .withBaseSigHash(BaseSigHashType::ALL)
                    .withAnyoneCanPay(true)
                    .withForkId(true)
                    .withBaseSigHash(BaseSigHashType::NONE)
                    .getBaseSigHashType() == BaseSigHashType::NONE);
}

BOOST_AUTO_TEST_SUITE_END()
