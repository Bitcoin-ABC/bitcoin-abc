// Copyright (c) 2021 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/orphanproofpool.h>
#include <avalanche/proofbuilder.h>

#include <validation.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

#include <array>
#include <queue>

using namespace avalanche;

BOOST_FIXTURE_TEST_SUITE(orphanproofpool_tests, TestingSetup)

/** Make a proof with stakes using random txids */
static ProofRef makeProof(const size_t nStakes) {
    const Amount v = 5 * COIN;
    const int height = 1234;
    ProofBuilder pb(0, 0, CKey::MakeCompressedKey());
    for (size_t i = 0; i < nStakes; i++) {
        TxId txid(GetRandHash());
        BOOST_CHECK(pb.addUTXO(COutPoint(txid, 0), v, height, false,
                               CKey::MakeCompressedKey()));
    }
    return std::make_shared<Proof>(pb.build());
}

BOOST_AUTO_TEST_CASE(pool_starts_empty) {
    OrphanProofPool pool{10};
    BOOST_CHECK_EQUAL(pool.getNProofs(), 0);
    BOOST_CHECK_EQUAL(pool.getNStakes(), 0);
}

BOOST_AUTO_TEST_CASE(fail_to_add_same_proof_twice) {
    OrphanProofPool pool{10};
    auto p = makeProof(1);
    BOOST_CHECK(!pool.getProof(p->getId()));

    BOOST_CHECK(pool.addProof(p));
    BOOST_CHECK_EQUAL(pool.getNStakes(), 1);
    BOOST_CHECK_EQUAL(pool.getNProofs(), 1);
    BOOST_CHECK(pool.getProof(p->getId()));

    BOOST_CHECK(!pool.addProof(p));
    BOOST_CHECK_EQUAL(pool.getNStakes(), 1);
    BOOST_CHECK_EQUAL(pool.getNProofs(), 1);
    BOOST_CHECK(pool.getProof(p->getId()));
}

BOOST_AUTO_TEST_CASE(check_eviction_behavior) {
    {
        // Fill the pool
        OrphanProofPool pool{7};
        auto first = makeProof(4);
        pool.addProof(first);
        pool.addProof(makeProof(2));
        pool.addProof(makeProof(1));
        BOOST_CHECK_EQUAL(pool.getNStakes(), 7);
        BOOST_CHECK_EQUAL(pool.getNProofs(), 3);
        BOOST_CHECK(pool.getProof(first->getId()));
    }

    {
        OrphanProofPool pool{6};
        auto first = makeProof(4);
        pool.addProof(first);
        pool.addProof(makeProof(2));
        BOOST_CHECK_EQUAL(pool.getNStakes(), 6);
        BOOST_CHECK_EQUAL(pool.getNProofs(), 2);

        // The oldest proof has to be dropped
        pool.addProof(makeProof(1));
        BOOST_CHECK_EQUAL(pool.getNStakes(), 3);
        BOOST_CHECK_EQUAL(pool.getNProofs(), 2);
        BOOST_CHECK(!pool.getProof(first->getId()));
    }

    {
        OrphanProofPool pool{15};
        auto first = makeProof(1);
        pool.addProof(first);
        auto second = makeProof(2);
        pool.addProof(second);
        pool.addProof(makeProof(4));
        pool.addProof(makeProof(8));
        BOOST_CHECK_EQUAL(pool.getNStakes(), 15);
        BOOST_CHECK_EQUAL(pool.getNProofs(), 4);

        // Multiple proofs are dropped if needed
        pool.addProof(makeProof(2));
        BOOST_CHECK_EQUAL(pool.getNStakes(), 14);
        BOOST_CHECK_EQUAL(pool.getNProofs(), 3);
        BOOST_CHECK(!pool.getProof(first->getId()));
        BOOST_CHECK(!pool.getProof(second->getId()));
    }
}

BOOST_AUTO_TEST_CASE(remove_proofs) {
    OrphanProofPool pool{1337};
    std::array<ProofId, 10> aProofIds;

    // Add 10 proofs
    for (size_t i = 0; i < 10; i++) {
        auto p = makeProof(i + 1);
        aProofIds[i] = p->getId();
        BOOST_CHECK(pool.addProof(p));
    }
    BOOST_CHECK_EQUAL(pool.getNProofs(), 10);
    BOOST_CHECK_EQUAL(pool.getNStakes(), 55);

    // Remove a proof in the middle
    BOOST_CHECK(pool.removeProof(aProofIds[5]));
    BOOST_CHECK_EQUAL(pool.getNProofs(), 9);
    BOOST_CHECK_EQUAL(pool.getNStakes(), 49);

    // Remove a proof at the front
    BOOST_CHECK(pool.removeProof(aProofIds[0]));
    BOOST_CHECK_EQUAL(pool.getNProofs(), 8);
    BOOST_CHECK_EQUAL(pool.getNStakes(), 48);

    // Remove a proof at the back
    BOOST_CHECK(pool.removeProof(aProofIds[9]));
    BOOST_CHECK_EQUAL(pool.getNProofs(), 7);
    BOOST_CHECK_EQUAL(pool.getNStakes(), 38);

    // Fail to remove a proof that is longer in the pool
    BOOST_CHECK(!pool.removeProof(aProofIds[5]));
    BOOST_CHECK_EQUAL(pool.getNProofs(), 7);
    BOOST_CHECK_EQUAL(pool.getNStakes(), 38);

    // Fail to remove a proof that was never in the pool
    auto p = makeProof(11);
    BOOST_CHECK(!pool.getProof(p->getId()));
    BOOST_CHECK(!pool.removeProof(p->getId()));
    BOOST_CHECK_EQUAL(pool.getNProofs(), 7);
    BOOST_CHECK_EQUAL(pool.getNStakes(), 38);
}

BOOST_AUTO_TEST_CASE(add_proof_larger_than_pool) {
    OrphanProofPool pool{AVALANCHE_MAX_PROOF_STAKES - 1};

    // Add a couple of small proofs
    BOOST_CHECK(pool.addProof(makeProof(1)));
    BOOST_CHECK_EQUAL(pool.getNStakes(), 1);
    BOOST_CHECK_EQUAL(pool.getNProofs(), 1);

    BOOST_CHECK(pool.addProof(makeProof(2)));
    BOOST_CHECK_EQUAL(pool.getNStakes(), 3);
    BOOST_CHECK_EQUAL(pool.getNProofs(), 2);

    // Adding a proof larger than the pool causes the pool to be emptied
    BOOST_CHECK(pool.addProof(makeProof(AVALANCHE_MAX_PROOF_STAKES)));
    BOOST_CHECK_EQUAL(pool.getNStakes(), 0);
    BOOST_CHECK_EQUAL(pool.getNProofs(), 0);
}

BOOST_AUTO_TEST_SUITE_END()
