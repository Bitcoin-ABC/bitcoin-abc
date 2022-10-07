// Copyright (c) 2011-2022 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <txorphanage.h>

#include <key.h>
#include <primitives/transaction.h>
#include <primitives/txid.h>
#include <script/sign.h>
#include <script/signingprovider.h>
#include <script/standard.h>

#include <test/util/random.h>
#include <test/util/setup_common.h>

#include <cstdint>
#include <map>

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(orphanage_tests, TestingSetup)

class TxOrphanageTest : public TxOrphanage {
public:
    inline size_t CountOrphans() const EXCLUSIVE_LOCKS_REQUIRED(!m_mutex) {
        LOCK(m_mutex);
        return m_orphans.size();
    }

    CTransactionRef RandomOrphan() EXCLUSIVE_LOCKS_REQUIRED(!m_mutex) {
        LOCK(m_mutex);
        std::map<TxId, OrphanTx>::iterator it;
        it = m_orphans.lower_bound(TxId{InsecureRand256()});
        if (it == m_orphans.end()) {
            it = m_orphans.begin();
        }
        return it->second.tx;
    }
};

BOOST_AUTO_TEST_CASE(DoS_mapOrphans) {
    TxOrphanageTest orphanage;
    CKey key;
    key.MakeNewKey(true);
    FillableSigningProvider keystore;
    BOOST_CHECK(keystore.AddKey(key));

    // 50 orphan transactions:
    for (int i = 0; i < 50; i++) {
        CMutableTransaction tx;
        tx.vin.resize(1);
        tx.vin[0].prevout = COutPoint(TxId(InsecureRand256()), 0);
        tx.vin[0].scriptSig << OP_1;
        tx.vout.resize(1);
        tx.vout[0].nValue = 1 * CENT;
        tx.vout[0].scriptPubKey =
            GetScriptForDestination(PKHash(key.GetPubKey()));

        orphanage.AddTx(MakeTransactionRef(tx), i);
    }

    // ... and 50 that depend on other orphans:
    for (int i = 0; i < 50; i++) {
        CTransactionRef txPrev = orphanage.RandomOrphan();

        CMutableTransaction tx;
        tx.vin.resize(1);
        tx.vin[0].prevout = COutPoint(txPrev->GetId(), 0);
        tx.vout.resize(1);
        tx.vout[0].nValue = 1 * CENT;
        tx.vout[0].scriptPubKey =
            GetScriptForDestination(PKHash(key.GetPubKey()));
        BOOST_CHECK(SignSignature(keystore, *txPrev, tx, 0,
                                  SigHashType().withForkId()));

        orphanage.AddTx(MakeTransactionRef(tx), i);
    }

    // This really-big orphan should be ignored:
    for (int i = 0; i < 10; i++) {
        CTransactionRef txPrev = orphanage.RandomOrphan();

        CMutableTransaction tx;
        tx.vout.resize(1);
        tx.vout[0].nValue = 1 * CENT;
        tx.vout[0].scriptPubKey =
            GetScriptForDestination(PKHash(key.GetPubKey()));
        tx.vin.resize(2777);
        for (size_t j = 0; j < tx.vin.size(); j++) {
            tx.vin[j].prevout = COutPoint(txPrev->GetId(), j);
        }
        BOOST_CHECK(SignSignature(keystore, *txPrev, tx, 0,
                                  SigHashType().withForkId()));
        // Re-use same signature for other inputs
        // (they don't have to be valid for this test)
        for (unsigned int j = 1; j < tx.vin.size(); j++) {
            tx.vin[j].scriptSig = tx.vin[0].scriptSig;
        }

        BOOST_CHECK(!orphanage.AddTx(MakeTransactionRef(tx), i));
    }

    // Test EraseOrphansFor:
    for (NodeId i = 0; i < 3; i++) {
        size_t sizeBefore = orphanage.CountOrphans();
        orphanage.EraseForPeer(i);
        BOOST_CHECK(orphanage.CountOrphans() < sizeBefore);
    }

    // Test LimitOrphanTxSize() function:
    orphanage.LimitOrphans(40);
    BOOST_CHECK(orphanage.CountOrphans() <= 40);
    orphanage.LimitOrphans(10);
    BOOST_CHECK(orphanage.CountOrphans() <= 10);
    orphanage.LimitOrphans(0);
    BOOST_CHECK(orphanage.CountOrphans() == 0);
}

BOOST_AUTO_TEST_SUITE_END()
