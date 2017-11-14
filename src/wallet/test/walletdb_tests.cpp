// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <wallet/walletdb.h>

#include <chainparams.h>
#include <wallet/wallet.h>

#include <test/test_bitcoin.h>
#include <wallet/test/wallet_test_fixture.h>

#include <boost/test/unit_test.hpp>

namespace {
static std::unique_ptr<CWallet> LoadWallet(CWalletDB *db) {
    std::unique_ptr<CWallet> wallet(
        new CWallet(Params(), "dummy", CWalletDBWrapper::CreateDummy()));
    DBErrors res = db->LoadWallet(wallet.get());
    BOOST_CHECK(res == DBErrors::LOAD_OK);
    return wallet;
}
} // namespace

BOOST_FIXTURE_TEST_SUITE(walletdb_tests, WalletTestingSetup)

BOOST_AUTO_TEST_CASE(write_erase_name) {
    CWalletDB walletdb(m_wallet.GetDBHandle(), "cr+");

    CTxDestination dst1 = CKeyID(uint160S("c0ffee"));
    CTxDestination dst2 = CKeyID(uint160S("f00d"));

    BOOST_CHECK(walletdb.WriteName(dst1, "name1"));
    BOOST_CHECK(walletdb.WriteName(dst2, "name2"));
    {
        auto w = LoadWallet(&walletdb);
        BOOST_CHECK_EQUAL(1, w->mapAddressBook.count(dst1));
        BOOST_CHECK_EQUAL("name1", w->mapAddressBook[dst1].name);
        BOOST_CHECK_EQUAL("name2", w->mapAddressBook[dst2].name);
    }

    walletdb.EraseName(dst1);

    {
        auto w = LoadWallet(&walletdb);
        BOOST_CHECK_EQUAL(0, w->mapAddressBook.count(dst1));
        BOOST_CHECK_EQUAL(1, w->mapAddressBook.count(dst2));
    }
}

BOOST_AUTO_TEST_CASE(write_erase_purpose) {
    CWalletDB walletdb(m_wallet.GetDBHandle(), "cr+");

    CTxDestination dst1 = CKeyID(uint160S("c0ffee"));
    CTxDestination dst2 = CKeyID(uint160S("f00d"));

    BOOST_CHECK(walletdb.WritePurpose(dst1, "purpose1"));
    BOOST_CHECK(walletdb.WritePurpose(dst2, "purpose2"));
    {
        auto w = LoadWallet(&walletdb);
        BOOST_CHECK_EQUAL(1, w->mapAddressBook.count(dst1));
        BOOST_CHECK_EQUAL("purpose1", w->mapAddressBook[dst1].purpose);
        BOOST_CHECK_EQUAL("purpose2", w->mapAddressBook[dst2].purpose);
    }

    walletdb.ErasePurpose(dst1);

    {
        auto w = LoadWallet(&walletdb);
        BOOST_CHECK_EQUAL(0, w->mapAddressBook.count(dst1));
        BOOST_CHECK_EQUAL(1, w->mapAddressBook.count(dst2));
    }
}

BOOST_AUTO_TEST_CASE(write_erase_destdata) {
    CWalletDB walletdb(m_wallet.GetDBHandle(), "cr+");

    CTxDestination dst1 = CKeyID(uint160S("c0ffee"));
    CTxDestination dst2 = CKeyID(uint160S("f00d"));

    BOOST_CHECK(walletdb.WriteDestData(dst1, "key1", "value1"));
    BOOST_CHECK(walletdb.WriteDestData(dst1, "key2", "value2"));
    BOOST_CHECK(walletdb.WriteDestData(dst2, "key1", "value3"));
    BOOST_CHECK(walletdb.WriteDestData(dst2, "key2", "value4"));
    {
        auto w = LoadWallet(&walletdb);
        std::string val;
        BOOST_CHECK(w->GetDestData(dst1, "key1", &val));
        BOOST_CHECK_EQUAL("value1", val);
        BOOST_CHECK(w->GetDestData(dst1, "key2", &val));
        BOOST_CHECK_EQUAL("value2", val);
        BOOST_CHECK(w->GetDestData(dst2, "key1", &val));
        BOOST_CHECK_EQUAL("value3", val);
        BOOST_CHECK(w->GetDestData(dst2, "key2", &val));
        BOOST_CHECK_EQUAL("value4", val);
    }

    walletdb.EraseDestData(dst1, "key2");

    {
        auto w = LoadWallet(&walletdb);
        std::string dummy;
        BOOST_CHECK(w->GetDestData(dst1, "key1", &dummy));
        BOOST_CHECK(!w->GetDestData(dst1, "key2", &dummy));
        BOOST_CHECK(w->GetDestData(dst2, "key1", &dummy));
        BOOST_CHECK(w->GetDestData(dst2, "key2", &dummy));
    }
}

BOOST_AUTO_TEST_CASE(no_dest_fails) {
    CWalletDB walletdb(m_wallet.GetDBHandle(), "cr+");

    CTxDestination dst = CNoDestination{};
    BOOST_CHECK(!walletdb.WriteName(dst, "name"));
    BOOST_CHECK(!walletdb.WritePurpose(dst, "purpose"));
    BOOST_CHECK(!walletdb.WriteDestData(dst, "key", "value"));
}

BOOST_AUTO_TEST_SUITE_END()
