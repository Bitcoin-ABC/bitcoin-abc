// Copyright (c) 2021 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/proofpool.h>

#include <avalanche/peermanager.h>
#include <key.h>
#include <primitives/transaction.h>
#include <primitives/txid.h>
#include <random.h>

#include <avalanche/test/util.h>
#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

using namespace avalanche;

BOOST_FIXTURE_TEST_SUITE(proofpool_tests, TestingSetup)

BOOST_AUTO_TEST_CASE(add_remove_proof) {
    ProofPool testPool;

    std::vector<ProofRef> proofs;
    for (size_t i = 0; i < 10; i++) {
        // Add a bunch of random proofs
        auto proof = buildRandomProof(MIN_VALID_PROOF_SCORE);
        BOOST_CHECK_EQUAL(testPool.addProof(proof),
                          ProofPool::AddProofStatus::SUCCEED);

        // Trying to add them again will return a duplicated status
        for (size_t j = 0; j < 10; j++) {
            BOOST_CHECK_EQUAL(testPool.addProof(proof),
                              ProofPool::AddProofStatus::DUPLICATED);
        }
        proofs.push_back(std::move(proof));
    }

    const CKey key = CKey::MakeCompressedKey();
    const COutPoint conflictingOutpoint{TxId(GetRandHash()), 0};

    auto buildProofWithSequence = [&](uint64_t sequence) {
        ProofBuilder pb(sequence, 0, key);
        BOOST_CHECK(
            pb.addUTXO(conflictingOutpoint, 10 * COIN, 123456, false, key));
        return pb.build();
    };

    auto proof_seq10 = buildProofWithSequence(10);
    BOOST_CHECK_EQUAL(testPool.addProof(proof_seq10),
                      ProofPool::AddProofStatus::SUCCEED);
    proofs.push_back(std::move(proof_seq10));

    auto proof_seq20 = buildProofWithSequence(20);
    BOOST_CHECK_EQUAL(testPool.addProof(proof_seq20),
                      ProofPool::AddProofStatus::REJECTED);

    // Removing proofs which are not in the pool will fail
    for (size_t i = 0; i < 10; i++) {
        BOOST_CHECK(
            !testPool.removeProof(buildRandomProof(MIN_VALID_PROOF_SCORE)));
    }

    for (auto proof : proofs) {
        BOOST_CHECK(testPool.removeProof(proof));
    }
    BOOST_CHECK(testPool.pool.empty());
}

BOOST_AUTO_TEST_CASE(rescan) {
    ProofPool testPool;
    avalanche::PeerManager pm;

    testPool.rescan(pm);
    BOOST_CHECK(testPool.pool.empty());

    // No peer should be created
    bool hasPeer = false;
    pm.forEachPeer([&](const Peer &p) { hasPeer = true; });
    BOOST_CHECK(!hasPeer);

    std::set<ProofRef> poolProofs;
    for (size_t i = 0; i < 10; i++) {
        auto proof = buildRandomProof(MIN_VALID_PROOF_SCORE);
        BOOST_CHECK_EQUAL(testPool.addProof(proof),
                          ProofPool::AddProofStatus::SUCCEED);
        poolProofs.insert(std::move(proof));
    }

    testPool.rescan(pm);

    // All the proofs should be registered as peer
    std::set<ProofRef> pmProofs;
    pm.forEachPeer([&](const Peer &p) { pmProofs.insert(p.proof); });
    BOOST_CHECK_EQUAL_COLLECTIONS(poolProofs.begin(), poolProofs.end(),
                                  pmProofs.begin(), pmProofs.end());
    BOOST_CHECK(testPool.pool.empty());
}

BOOST_AUTO_TEST_CASE(get_proof) {
    ProofPool testPool;

    for (size_t i = 0; i < 10; i++) {
        BOOST_CHECK(!testPool.getProof(ProofId(GetRandHash())));
    }

    for (size_t i = 0; i < 10; i++) {
        auto proof = buildRandomProof(MIN_VALID_PROOF_SCORE);
        BOOST_CHECK_EQUAL(testPool.addProof(proof),
                          ProofPool::AddProofStatus::SUCCEED);

        auto retrievedProof = testPool.getProof(proof->getId());
        BOOST_CHECK_NE(retrievedProof, nullptr);
        BOOST_CHECK_EQUAL(retrievedProof->getId(), proof->getId());
    }
}

BOOST_AUTO_TEST_SUITE_END()
