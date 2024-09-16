// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <txpool.h>

#include <test/util/setup_common.h>

#include <cstdint>

#include <boost/test/unit_test.hpp>

static const CScript REDEEM_SCRIPT = CScript() << OP_DROP << OP_TRUE;
static const CScript SCRIPT_PUB_KEY =
    CScript() << OP_HASH160 << ToByteVector(CScriptID(REDEEM_SCRIPT))
              << OP_EQUAL;
static const CScript SCRIPT_SIG = CScript() << std::vector<uint8_t>(100, 0xff)
                                            << ToByteVector(REDEEM_SCRIPT);

BOOST_FIXTURE_TEST_SUITE(txpool_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(txpool_get_tx) {
    TxPool txpool("testing", 1h, 1h);

    CMutableTransaction txParent;
    txParent.vin.emplace_back(TxId(FastRandomContext(true).rand256()), 0);
    txParent.vin[0].scriptSig = SCRIPT_SIG;
    txParent.vout.resize(2);
    txParent.vout[0].nValue = CENT;
    txParent.vout[0].scriptPubKey = SCRIPT_PUB_KEY;
    txParent.vout[1].nValue = 3 * CENT;
    txParent.vout[1].scriptPubKey = SCRIPT_PUB_KEY;
    BOOST_CHECK(txpool.AddTx(MakeTransactionRef(txParent), 0));

    COutPoint outpoint0{txParent.GetId(), 0};
    COutPoint outpoint1{txParent.GetId(), 1};

    CMutableTransaction txChild0;
    txChild0.vin.emplace_back(outpoint0);
    txChild0.vin[0].scriptSig = SCRIPT_SIG;
    txChild0.vout.resize(1);
    txChild0.vout[0].nValue = CENT;
    txChild0.vout[0].scriptPubKey = SCRIPT_PUB_KEY;
    BOOST_CHECK(txpool.AddTx(MakeTransactionRef(txChild0), 0));

    CMutableTransaction txChild1;
    txChild1.vin.emplace_back(outpoint1);
    txChild1.vin[0].scriptSig = SCRIPT_SIG;
    txChild1.vout.resize(1);
    txChild1.vout[0].nValue = CENT;
    txChild1.vout[0].scriptPubKey = SCRIPT_PUB_KEY;
    BOOST_CHECK(txpool.AddTx(MakeTransactionRef(txChild1), 0));

    BOOST_CHECK_EQUAL(txpool.GetTx(TxId(FastRandomContext(true).rand256())),
                      nullptr);

    BOOST_CHECK(txpool.GetTx(txParent.GetId()));
    BOOST_CHECK(txpool.GetTx(txChild0.GetId()));
    BOOST_CHECK(txpool.GetTx(txChild1.GetId()));

    CMutableTransaction conflicting0;
    conflicting0.vin.emplace_back(outpoint0);
    conflicting0.vin[0].scriptSig = SCRIPT_SIG;
    conflicting0.vout.resize(1);
    conflicting0.vout[0].nValue = 2 * CENT;
    conflicting0.vout[0].scriptPubKey = SCRIPT_PUB_KEY;
    BOOST_CHECK_NE(conflicting0.GetId(), txChild0.GetId());

    {
        auto conflicts =
            txpool.GetConflictTxs(MakeTransactionRef(conflicting0));
        BOOST_CHECK_EQUAL(conflicts.size(), 1);
        BOOST_CHECK_EQUAL(conflicts[0]->GetId(), txChild0.GetId());
    }

    CMutableTransaction conflicting1;
    conflicting1.vin.emplace_back(outpoint1);
    conflicting1.vin[0].scriptSig = SCRIPT_SIG;
    conflicting1.vout.resize(1);
    conflicting1.vout[0].nValue = 2 * CENT;
    conflicting1.vout[0].scriptPubKey = SCRIPT_PUB_KEY;
    BOOST_CHECK_NE(conflicting1.GetId(), txChild1.GetId());

    {
        auto conflicts =
            txpool.GetConflictTxs(MakeTransactionRef(conflicting1));
        BOOST_CHECK_EQUAL(conflicts.size(), 1);
        BOOST_CHECK_EQUAL(conflicts[0]->GetId(), txChild1.GetId());
    }

    CMutableTransaction conflicting01;
    conflicting01.vin.emplace_back(outpoint0);
    conflicting01.vin[0].scriptSig = SCRIPT_SIG;
    conflicting01.vin.emplace_back(outpoint1);
    conflicting01.vin[1].scriptSig = SCRIPT_SIG;
    conflicting01.vout.resize(1);
    conflicting01.vout[0].nValue = 2 * CENT;
    conflicting01.vout[0].scriptPubKey = SCRIPT_PUB_KEY;
    BOOST_CHECK_NE(conflicting01.GetId(), txChild0.GetId());
    BOOST_CHECK_NE(conflicting01.GetId(), txChild1.GetId());

    {
        auto conflicts =
            txpool.GetConflictTxs(MakeTransactionRef(conflicting01));
        BOOST_CHECK_EQUAL(conflicts.size(), 2);
        BOOST_CHECK_EQUAL(conflicts[0]->GetId(), txChild0.GetId());
        BOOST_CHECK_EQUAL(conflicts[1]->GetId(), txChild1.GetId());
    }

    BOOST_CHECK_EQUAL(txpool.EraseTx(txChild0.GetId()), 1);
    BOOST_CHECK(!txpool.GetTx(txChild0.GetId()));

    {
        auto conflicts =
            txpool.GetConflictTxs(MakeTransactionRef(conflicting01));
        BOOST_CHECK_EQUAL(conflicts.size(), 1);
        BOOST_CHECK_EQUAL(conflicts[0]->GetId(), txChild1.GetId());
    }

    BOOST_CHECK_EQUAL(txpool.EraseTx(txChild1.GetId()), 1);
    BOOST_CHECK(!txpool.GetTx(txChild1.GetId()));

    {
        auto conflicts =
            txpool.GetConflictTxs(MakeTransactionRef(conflicting01));
        BOOST_CHECK_EQUAL(conflicts.size(), 0);
    }
}

BOOST_AUTO_TEST_SUITE_END()
