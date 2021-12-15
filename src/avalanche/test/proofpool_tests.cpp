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

BOOST_AUTO_TEST_CASE(add_remove_proof_no_conflict) {
    ProofPool testPool;

    std::vector<ProofRef> proofs;
    for (size_t i = 0; i < 10; i++) {
        // Add a bunch of random proofs
        auto proof = buildRandomProof(MIN_VALID_PROOF_SCORE);
        BOOST_CHECK_EQUAL(testPool.addProofIfNoConflict(proof),
                          ProofPool::AddProofStatus::SUCCEED);

        // Trying to add them again will return a duplicated status
        for (size_t j = 0; j < 10; j++) {
            BOOST_CHECK_EQUAL(testPool.addProofIfNoConflict(proof),
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
    BOOST_CHECK_EQUAL(testPool.addProofIfNoConflict(proof_seq10),
                      ProofPool::AddProofStatus::SUCCEED);
    proofs.push_back(std::move(proof_seq10));

    auto proof_seq20 = buildProofWithSequence(20);
    BOOST_CHECK_EQUAL(testPool.addProofIfNoConflict(proof_seq20),
                      ProofPool::AddProofStatus::REJECTED);

    // Removing proofs which are not in the pool will fail
    for (size_t i = 0; i < 10; i++) {
        BOOST_CHECK(!testPool.removeProof(ProofId(GetRandHash())));
    }

    for (auto proof : proofs) {
        BOOST_CHECK(testPool.removeProof(proof->getId()));
    }
    BOOST_CHECK_EQUAL(testPool.size(), 0);
}

BOOST_AUTO_TEST_CASE(rescan) {
    ProofPool testPool;
    avalanche::PeerManager pm;

    testPool.rescan(pm);
    BOOST_CHECK_EQUAL(testPool.size(), 0);

    // No peer should be created
    bool hasPeer = false;
    pm.forEachPeer([&](const Peer &p) { hasPeer = true; });
    BOOST_CHECK(!hasPeer);

    std::set<ProofRef> poolProofs;
    for (size_t i = 0; i < 10; i++) {
        auto proof = buildRandomProof(MIN_VALID_PROOF_SCORE);
        BOOST_CHECK_EQUAL(testPool.addProofIfNoConflict(proof),
                          ProofPool::AddProofStatus::SUCCEED);
        poolProofs.insert(std::move(proof));
    }

    testPool.rescan(pm);

    // All the proofs should be registered as peer
    std::set<ProofRef> pmProofs;
    pm.forEachPeer([&](const Peer &p) { pmProofs.insert(p.proof); });
    BOOST_CHECK_EQUAL_COLLECTIONS(poolProofs.begin(), poolProofs.end(),
                                  pmProofs.begin(), pmProofs.end());
    BOOST_CHECK_EQUAL(testPool.size(), 0);
}

BOOST_AUTO_TEST_CASE(proof_override) {
    ProofPool testPool;

    const CKey key = CKey::MakeCompressedKey();

    auto buildProofWithSequenceAndOutpoints =
        [&](uint64_t sequence, const std::vector<COutPoint> &outpoints) {
            ProofBuilder pb(sequence, 0, key);
            for (const COutPoint &outpoint : outpoints) {
                BOOST_CHECK(
                    pb.addUTXO(outpoint, 10 * COIN, 123456, false, key));
            }
            return pb.build();
        };

    const COutPoint outpoint1{TxId(GetRandHash()), 0};
    const COutPoint outpoint2{TxId(GetRandHash()), 0};
    const COutPoint outpoint3{TxId(GetRandHash()), 0};

    // Build and register 3 proofs with a single utxo
    auto proof_seq10 = buildProofWithSequenceAndOutpoints(10, {outpoint1});
    auto proof_seq20 = buildProofWithSequenceAndOutpoints(20, {outpoint2});
    auto proof_seq30 = buildProofWithSequenceAndOutpoints(30, {outpoint3});

    BOOST_CHECK_EQUAL(testPool.addProofIfPreferred(proof_seq10),
                      ProofPool::AddProofStatus::SUCCEED);
    BOOST_CHECK(testPool.getProof(proof_seq10->getId()));

    BOOST_CHECK_EQUAL(testPool.addProofIfPreferred(proof_seq20),
                      ProofPool::AddProofStatus::SUCCEED);
    BOOST_CHECK(testPool.getProof(proof_seq20->getId()));

    BOOST_CHECK_EQUAL(testPool.addProofIfPreferred(proof_seq30),
                      ProofPool::AddProofStatus::SUCCEED);
    BOOST_CHECK(testPool.getProof(proof_seq30->getId()));

    // Build a proof that conflicts with the above 3, but has a higher sequence
    auto proof_seq123 = buildProofWithSequenceAndOutpoints(
        123, {outpoint1, outpoint2, outpoint3});
    ProofPool::ConflictingProofSet expectedConflictingProofs = {
        proof_seq10, proof_seq20, proof_seq30};

    // The no conflict call should reject our candidate and not alter the 3
    // conflicting proofs
    ProofPool::ConflictingProofSet conflictingProofs;
    BOOST_CHECK_EQUAL(
        testPool.addProofIfNoConflict(proof_seq123, conflictingProofs),
        ProofPool::AddProofStatus::REJECTED);
    BOOST_CHECK_EQUAL_COLLECTIONS(
        conflictingProofs.begin(), conflictingProofs.end(),
        expectedConflictingProofs.begin(), expectedConflictingProofs.end());
    BOOST_CHECK(!testPool.getProof(proof_seq123->getId()));
    BOOST_CHECK(testPool.getProof(proof_seq10->getId()));
    BOOST_CHECK(testPool.getProof(proof_seq20->getId()));
    BOOST_CHECK(testPool.getProof(proof_seq30->getId()));

    // The conflict handling call will override the 3 conflicting proofs
    conflictingProofs.clear();
    BOOST_CHECK_EQUAL(
        testPool.addProofIfPreferred(proof_seq123, conflictingProofs),
        ProofPool::AddProofStatus::SUCCEED);
    BOOST_CHECK_EQUAL_COLLECTIONS(
        conflictingProofs.begin(), conflictingProofs.end(),
        expectedConflictingProofs.begin(), expectedConflictingProofs.end());
    BOOST_CHECK(testPool.getProof(proof_seq123->getId()));
    BOOST_CHECK(!testPool.getProof(proof_seq10->getId()));
    BOOST_CHECK(!testPool.getProof(proof_seq20->getId()));
    BOOST_CHECK(!testPool.getProof(proof_seq30->getId()));
}

BOOST_AUTO_TEST_CASE(conflicting_proofs_set) {
    ProofPool testPool;

    const CKey key = CKey::MakeCompressedKey();
    const COutPoint conflictingOutpoint{TxId(GetRandHash()), 0};

    auto buildProofWithSequence = [&](uint64_t sequence) {
        ProofBuilder pb(sequence, 0, key);
        BOOST_CHECK(
            pb.addUTXO(conflictingOutpoint, 10 * COIN, 123456, false, key));
        return pb.build();
    };

    auto proofSeq10 = buildProofWithSequence(10);
    auto proofSeq20 = buildProofWithSequence(20);
    auto proofSeq30 = buildProofWithSequence(30);

    BOOST_CHECK_EQUAL(testPool.addProofIfNoConflict(proofSeq20),
                      ProofPool::AddProofStatus::SUCCEED);

    auto getRandomConflictingProofSet = []() {
        return ProofPool::ConflictingProofSet{
            buildRandomProof(MIN_VALID_PROOF_SCORE),
            buildRandomProof(MIN_VALID_PROOF_SCORE),
            buildRandomProof(MIN_VALID_PROOF_SCORE),
        };
    };

    auto checkConflictingProofs =
        [&](const ProofPool::ConflictingProofSet &conflictingProofs,
            const ProofPool::ConflictingProofSet &expectedConflictingProofs) {
            BOOST_CHECK_EQUAL_COLLECTIONS(conflictingProofs.begin(),
                                          conflictingProofs.end(),
                                          expectedConflictingProofs.begin(),
                                          expectedConflictingProofs.end());
        };

    {
        // Without override, duplicated proof
        auto conflictingProofs = getRandomConflictingProofSet();
        BOOST_CHECK_EQUAL(
            testPool.addProofIfNoConflict(proofSeq20, conflictingProofs),
            ProofPool::AddProofStatus::DUPLICATED);
        checkConflictingProofs(conflictingProofs, {});
    }

    {
        // With override, duplicated proof
        auto conflictingProofs = getRandomConflictingProofSet();
        BOOST_CHECK_EQUAL(
            testPool.addProofIfPreferred(proofSeq20, conflictingProofs),
            ProofPool::AddProofStatus::DUPLICATED);
        checkConflictingProofs(conflictingProofs, {});
    }

    {
        // Without override, worst proof
        auto conflictingProofs = getRandomConflictingProofSet();
        BOOST_CHECK_EQUAL(
            testPool.addProofIfNoConflict(proofSeq10, conflictingProofs),
            ProofPool::AddProofStatus::REJECTED);
        checkConflictingProofs(conflictingProofs, {proofSeq20});
    }

    {
        // Without override, better proof
        auto conflictingProofs = getRandomConflictingProofSet();
        BOOST_CHECK_EQUAL(
            testPool.addProofIfNoConflict(proofSeq30, conflictingProofs),
            ProofPool::AddProofStatus::REJECTED);
        checkConflictingProofs(conflictingProofs, {proofSeq20});
    }

    {
        // With override, worst proof
        auto conflictingProofs = getRandomConflictingProofSet();
        BOOST_CHECK_EQUAL(
            testPool.addProofIfPreferred(proofSeq10, conflictingProofs),
            ProofPool::AddProofStatus::REJECTED);
        checkConflictingProofs(conflictingProofs, {proofSeq20});
    }

    {
        // With override, better proof
        auto conflictingProofs = getRandomConflictingProofSet();
        BOOST_CHECK_EQUAL(
            testPool.addProofIfPreferred(proofSeq30, conflictingProofs),
            ProofPool::AddProofStatus::SUCCEED);
        checkConflictingProofs(conflictingProofs, {proofSeq20});
    }
}

BOOST_AUTO_TEST_CASE(get_proof) {
    ProofPool testPool;

    for (size_t i = 0; i < 10; i++) {
        BOOST_CHECK(!testPool.getProof(ProofId(GetRandHash())));
    }

    for (size_t i = 0; i < 10; i++) {
        auto proof = buildRandomProof(MIN_VALID_PROOF_SCORE);
        BOOST_CHECK_EQUAL(testPool.addProofIfNoConflict(proof),
                          ProofPool::AddProofStatus::SUCCEED);

        auto retrievedProof = testPool.getProof(proof->getId());
        BOOST_CHECK_NE(retrievedProof, nullptr);
        BOOST_CHECK_EQUAL(retrievedProof->getId(), proof->getId());
    }
}

BOOST_AUTO_TEST_SUITE_END()
