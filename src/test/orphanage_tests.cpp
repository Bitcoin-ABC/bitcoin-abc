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

static void MakeNewKeyWithFastRandomContext(
    CKey &key, FastRandomContext &rand_ctx = g_insecure_rand_ctx) {
    std::vector<uint8_t> keydata;
    keydata = rand_ctx.randbytes(32);
    key.Set(keydata.data(), keydata.data() + keydata.size(),
            /*fCompressedIn=*/true);
    assert(key.IsValid());
}

// Creates a transaction with 2 outputs. Spends all outpoints. If outpoints is
// empty, spends a random one.
static CTransactionRef
MakeTransactionSpending(const std::vector<COutPoint> &outpoints,
                        FastRandomContext &det_rand) {
    CKey key;
    MakeNewKeyWithFastRandomContext(key, det_rand);

    CMutableTransaction tx;
    // If no outpoints are given, create a random one.
    if (outpoints.empty()) {
        tx.vin.emplace_back(TxId(det_rand.rand256()), 0);
    } else {
        for (const auto &outpoint : outpoints) {
            tx.vin.emplace_back(outpoint);
        }
    }

    tx.vin[0].scriptSig = CScript() << OP_TRUE;
    tx.vout.resize(2);
    tx.vout[0].nValue = CENT;
    tx.vout[0].scriptPubKey = GetScriptForDestination(PKHash(key.GetPubKey()));
    tx.vout[1].nValue = 3 * CENT;
    tx.vout[1].scriptPubKey = GetScriptForDestination(PKHash(key.GetPubKey()));

    return MakeTransactionRef(tx);
}

static bool EqualTxns(const std::set<CTransactionRef> &set_txns,
                      const std::vector<CTransactionRef> &vec_txns) {
    if (vec_txns.size() != set_txns.size()) {
        return false;
    }

    for (const auto &tx : vec_txns) {
        if (set_txns.count(tx) <= 0) {
            return false;
        }
    }

    return true;
}
static bool
EqualTxns(const std::set<CTransactionRef> &set_txns,
          const std::vector<std::pair<CTransactionRef, NodeId>> &vec_txns) {
    if (vec_txns.size() != set_txns.size()) {
        return false;
    }

    for (const auto &[tx, nodeid] : vec_txns) {
        if (set_txns.count(tx) <= 0) {
            return false;
        }
    }

    return true;
}

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

BOOST_AUTO_TEST_CASE(get_children) {
    FastRandomContext det_rand{true};
    std::vector<COutPoint> empty_outpoints;

    auto parent1 = MakeTransactionSpending(empty_outpoints, det_rand);
    auto parent2 = MakeTransactionSpending(empty_outpoints, det_rand);

    // Make sure these parents have different txids otherwise this test won't
    // make sense.
    while (parent1->GetId() == parent2->GetId()) {
        parent2 = MakeTransactionSpending(empty_outpoints, det_rand);
    }

    // Create children to go into orphanage.
    auto child_p1n0 =
        MakeTransactionSpending({{parent1->GetId(), 0}}, det_rand);
    auto child_p2n1 =
        MakeTransactionSpending({{parent2->GetId(), 1}}, det_rand);
    // Spends the same tx twice. Should not cause duplicates.
    auto child_p1n0_p1n1 = MakeTransactionSpending(
        {{parent1->GetId(), 0}, {parent1->GetId(), 1}}, det_rand);
    // Spends the same outpoint as previous tx. Should still be returned; don't
    // assume outpoints are unique.
    auto child_p1n0_p2n0 = MakeTransactionSpending(
        {{parent1->GetId(), 0}, {parent2->GetId(), 0}}, det_rand);

    const NodeId node1{1};
    const NodeId node2{2};

    // All orphans provided by node1
    {
        TxOrphanage orphanage;
        BOOST_CHECK(orphanage.AddTx(child_p1n0, node1));
        BOOST_CHECK(orphanage.AddTx(child_p2n1, node1));
        BOOST_CHECK(orphanage.AddTx(child_p1n0_p1n1, node1));
        BOOST_CHECK(orphanage.AddTx(child_p1n0_p2n0, node1));

        std::set<CTransactionRef> expected_parent1_children{
            child_p1n0, child_p1n0_p2n0, child_p1n0_p1n1};
        std::set<CTransactionRef> expected_parent2_children{child_p2n1,
                                                            child_p1n0_p2n0};

        BOOST_CHECK(
            EqualTxns(expected_parent1_children,
                      orphanage.GetChildrenFromSamePeer(parent1, node1)));
        BOOST_CHECK(
            EqualTxns(expected_parent2_children,
                      orphanage.GetChildrenFromSamePeer(parent2, node1)));

        BOOST_CHECK(
            EqualTxns(expected_parent1_children,
                      orphanage.GetChildrenFromDifferentPeer(parent1, node2)));
        BOOST_CHECK(
            EqualTxns(expected_parent2_children,
                      orphanage.GetChildrenFromDifferentPeer(parent2, node2)));

        // The peer must match
        BOOST_CHECK(orphanage.GetChildrenFromSamePeer(parent1, node2).empty());
        BOOST_CHECK(orphanage.GetChildrenFromSamePeer(parent2, node2).empty());

        // There shouldn't be any children of this tx in the orphanage
        BOOST_CHECK(
            orphanage.GetChildrenFromSamePeer(child_p1n0_p2n0, node1).empty());
        BOOST_CHECK(
            orphanage.GetChildrenFromSamePeer(child_p1n0_p2n0, node2).empty());
        BOOST_CHECK(
            orphanage.GetChildrenFromDifferentPeer(child_p1n0_p2n0, node1)
                .empty());
        BOOST_CHECK(
            orphanage.GetChildrenFromDifferentPeer(child_p1n0_p2n0, node2)
                .empty());
    }

    // Orphans provided by node1 and node2
    {
        TxOrphanage orphanage;
        BOOST_CHECK(orphanage.AddTx(child_p1n0, node1));
        BOOST_CHECK(orphanage.AddTx(child_p2n1, node1));
        BOOST_CHECK(orphanage.AddTx(child_p1n0_p1n1, node2));
        BOOST_CHECK(orphanage.AddTx(child_p1n0_p2n0, node2));

        // +----------------+---------------+----------------------------------+
        // |                | sender=node1  |           sender=node2           |
        // +----------------+---------------+----------------------------------+
        // | spends parent1 | child_p1n0    | child_p1n0_p1n1, child_p1n0_p2n0 |
        // | spends parent2 | child_p2n1    | child_p1n0_p2n0                  |
        // +----------------+---------------+----------------------------------+

        // Children of parent1 from node1:
        {
            std::set<CTransactionRef> expected_parent1_node1{child_p1n0};

            BOOST_CHECK(
                EqualTxns(expected_parent1_node1,
                          orphanage.GetChildrenFromSamePeer(parent1, node1)));
            BOOST_CHECK(EqualTxns(
                expected_parent1_node1,
                orphanage.GetChildrenFromDifferentPeer(parent1, node2)));
        }

        // Children of parent2 from node1:
        {
            std::set<CTransactionRef> expected_parent2_node1{child_p2n1};

            BOOST_CHECK(
                EqualTxns(expected_parent2_node1,
                          orphanage.GetChildrenFromSamePeer(parent2, node1)));
            BOOST_CHECK(EqualTxns(
                expected_parent2_node1,
                orphanage.GetChildrenFromDifferentPeer(parent2, node2)));
        }

        // Children of parent1 from node2:
        {
            std::set<CTransactionRef> expected_parent1_node2{child_p1n0_p1n1,
                                                             child_p1n0_p2n0};

            BOOST_CHECK(
                EqualTxns(expected_parent1_node2,
                          orphanage.GetChildrenFromSamePeer(parent1, node2)));
            BOOST_CHECK(EqualTxns(
                expected_parent1_node2,
                orphanage.GetChildrenFromDifferentPeer(parent1, node1)));
        }

        // Children of parent2 from node2:
        {
            std::set<CTransactionRef> expected_parent2_node2{child_p1n0_p2n0};

            BOOST_CHECK(
                EqualTxns(expected_parent2_node2,
                          orphanage.GetChildrenFromSamePeer(parent2, node2)));
            BOOST_CHECK(EqualTxns(
                expected_parent2_node2,
                orphanage.GetChildrenFromDifferentPeer(parent2, node1)));
        }
    }
}

BOOST_AUTO_TEST_SUITE_END()
