// Copyright (c) 2012-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "wallet/wallet.h"

#include "wallet/test/wallet_test_fixture.h"

#include <cstdint>

#include <boost/test/unit_test.hpp>

extern CWallet *pwalletMain;

BOOST_FIXTURE_TEST_SUITE(accounting_tests, WalletTestingSetup)

static void GetResults(std::map<Amount, CAccountingEntry> &results) {
    std::list<CAccountingEntry> aes;

    results.clear();
    BOOST_CHECK(pwalletMain->ReorderTransactions() == DB_LOAD_OK);
    pwalletMain->ListAccountCreditDebit("", aes);
    for (CAccountingEntry &ae : aes) {
        results[ae.nOrderPos * SATOSHI] = ae;
    }
}

BOOST_AUTO_TEST_CASE(acc_orderupgrade) {
    std::vector<CWalletTx *> vpwtx;
    CWalletTx wtx(nullptr /* pwallet */, MakeTransactionRef());
    CAccountingEntry ae;
    std::map<Amount, CAccountingEntry> results;

    LOCK(pwalletMain->cs_wallet);

    ae.strAccount = "";
    ae.nCreditDebit = SATOSHI;
    ae.nTime = 1333333333;
    ae.strOtherAccount = "b";
    ae.strComment = "";
    pwalletMain->AddAccountingEntry(ae);

    wtx.mapValue["comment"] = "z";
    pwalletMain->AddToWallet(wtx);
    vpwtx.push_back(&pwalletMain->mapWallet.at(wtx.GetId()));
    vpwtx[0]->nTimeReceived = (unsigned int)1333333335;
    vpwtx[0]->nOrderPos = -1;

    ae.nTime = 1333333336;
    ae.strOtherAccount = "c";
    pwalletMain->AddAccountingEntry(ae);

    GetResults(results);

    BOOST_CHECK(pwalletMain->nOrderPosNext == 3);
    BOOST_CHECK(2 == results.size());
    BOOST_CHECK(results[Amount::zero()].nTime == 1333333333);
    BOOST_CHECK(results[Amount::zero()].strComment.empty());
    BOOST_CHECK(1 == vpwtx[0]->nOrderPos);
    BOOST_CHECK(results[2 * SATOSHI].nTime == 1333333336);
    BOOST_CHECK(results[2 * SATOSHI].strOtherAccount == "c");

    ae.nTime = 1333333330;
    ae.strOtherAccount = "d";
    ae.nOrderPos = pwalletMain->IncOrderPosNext();
    pwalletMain->AddAccountingEntry(ae);

    GetResults(results);

    BOOST_CHECK(results.size() == 3);
    BOOST_CHECK(pwalletMain->nOrderPosNext == 4);
    BOOST_CHECK(results[Amount::zero()].nTime == 1333333333);
    BOOST_CHECK(1 == vpwtx[0]->nOrderPos);
    BOOST_CHECK(results[2 * SATOSHI].nTime == 1333333336);
    BOOST_CHECK(results[3 * SATOSHI].nTime == 1333333330);
    BOOST_CHECK(results[3 * SATOSHI].strComment.empty());

    wtx.mapValue["comment"] = "y";
    {
        CMutableTransaction tx(wtx);
        // Just to change the hash :)
        --tx.nLockTime;
        wtx.SetTx(MakeTransactionRef(std::move(tx)));
    }
    pwalletMain->AddToWallet(wtx);
    vpwtx.push_back(&pwalletMain->mapWallet.at(wtx.GetId()));
    vpwtx[1]->nTimeReceived = (unsigned int)1333333336;

    wtx.mapValue["comment"] = "x";
    {
        CMutableTransaction tx(wtx);
        // Just to change the hash :)
        --tx.nLockTime;
        wtx.SetTx(MakeTransactionRef(std::move(tx)));
    }
    pwalletMain->AddToWallet(wtx);
    vpwtx.push_back(&pwalletMain->mapWallet.at(wtx.GetId()));
    vpwtx[2]->nTimeReceived = (unsigned int)1333333329;
    vpwtx[2]->nOrderPos = -1;

    GetResults(results);

    BOOST_CHECK(results.size() == 3);
    BOOST_CHECK(pwalletMain->nOrderPosNext == 6);
    BOOST_CHECK(0 == vpwtx[2]->nOrderPos);
    BOOST_CHECK(results[SATOSHI].nTime == 1333333333);
    BOOST_CHECK(2 == vpwtx[0]->nOrderPos);
    BOOST_CHECK(results[3 * SATOSHI].nTime == 1333333336);
    BOOST_CHECK(results[4 * SATOSHI].nTime == 1333333330);
    BOOST_CHECK(results[4 * SATOSHI].strComment.empty());
    BOOST_CHECK(5 == vpwtx[1]->nOrderPos);

    ae.nTime = 1333333334;
    ae.strOtherAccount = "e";
    ae.nOrderPos = -1;
    pwalletMain->AddAccountingEntry(ae);

    GetResults(results);

    BOOST_CHECK(results.size() == 4);
    BOOST_CHECK(pwalletMain->nOrderPosNext == 7);
    BOOST_CHECK(0 == vpwtx[2]->nOrderPos);
    BOOST_CHECK(results[SATOSHI].nTime == 1333333333);
    BOOST_CHECK(2 == vpwtx[0]->nOrderPos);
    BOOST_CHECK(results[3 * SATOSHI].nTime == 1333333336);
    BOOST_CHECK(results[3 * SATOSHI].strComment.empty());
    BOOST_CHECK(results[4 * SATOSHI].nTime == 1333333330);
    BOOST_CHECK(results[4 * SATOSHI].strComment.empty());
    BOOST_CHECK(results[5 * SATOSHI].nTime == 1333333334);
    BOOST_CHECK(6 == vpwtx[1]->nOrderPos);
}

BOOST_AUTO_TEST_SUITE_END()
