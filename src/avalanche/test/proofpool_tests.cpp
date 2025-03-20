// Copyright (c) 2021 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/proofpool.h>

#include <avalanche/peermanager.h>
#include <avalanche/proofcomparator.h>
#include <key.h>
#include <primitives/transaction.h>
#include <primitives/txid.h>
#include <random.h>
#include <validation.h>

#include <avalanche/test/util.h>
#include <test/util/random.h>
#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

using namespace avalanche;

BOOST_FIXTURE_TEST_SUITE(proofpool_tests, TestChain100Setup)

BOOST_AUTO_TEST_CASE(get_proof_ids) {
    ProofPool testPool;
    Chainstate &active_chainstate = Assert(m_node.chainman)->ActiveChainstate();

    BOOST_CHECK_EQUAL(testPool.getProofIds().size(), 0);

    ProofIdSet proofIds;
    for (size_t i = 0; i < 10; i++) {
        auto proof = buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE);
        BOOST_CHECK_EQUAL(testPool.addProofIfNoConflict(proof),
                          ProofPool::AddProofStatus::SUCCEED);
        proofIds.insert(proof->getId());
    }

    auto fetchedProofIds = testPool.getProofIds();
    BOOST_CHECK_EQUAL(testPool.countProofs(), 10);
    BOOST_CHECK_EQUAL(fetchedProofIds.size(), 10);
    for (auto proofid : proofIds) {
        BOOST_CHECK_EQUAL(fetchedProofIds.count(proofid), 1);
    }
}

BOOST_AUTO_TEST_CASE(add_remove_proof_no_conflict) {
    ProofPool testPool;

    Chainstate &active_chainstate = Assert(m_node.chainman)->ActiveChainstate();

    std::vector<ProofRef> proofs;
    for (size_t i = 0; i < 10; i++) {
        // Add a bunch of random proofs
        auto proof = buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE);
        BOOST_CHECK_EQUAL(testPool.addProofIfNoConflict(proof),
                          ProofPool::AddProofStatus::SUCCEED);
        BOOST_CHECK_EQUAL(testPool.countProofs(), i + 1);
        BOOST_CHECK_EQUAL(testPool.getProofIds().size(), i + 1);

        // Trying to add them again will return a duplicated status
        for (size_t j = 0; j < 10; j++) {
            BOOST_CHECK_EQUAL(testPool.addProofIfNoConflict(proof),
                              ProofPool::AddProofStatus::DUPLICATED);
            BOOST_CHECK_EQUAL(testPool.countProofs(), i + 1);
            BOOST_CHECK_EQUAL(testPool.getProofIds().size(), i + 1);
        }
        proofs.push_back(std::move(proof));
    }

    const CKey key = CKey::MakeCompressedKey();
    const COutPoint conflictingOutpoint{TxId(GetRandHash()), 0};

    auto buildProofWithSequence = [&](uint64_t sequence) {
        ProofBuilder pb(sequence, 0, key, UNSPENDABLE_ECREG_PAYOUT_SCRIPT);
        BOOST_CHECK(
            pb.addUTXO(conflictingOutpoint, 10 * COIN, 123456, false, key));
        return pb.build();
    };

    auto proof_seq10 = buildProofWithSequence(10);
    BOOST_CHECK_EQUAL(testPool.addProofIfNoConflict(proof_seq10),
                      ProofPool::AddProofStatus::SUCCEED);
    BOOST_CHECK_EQUAL(testPool.countProofs(), 11);
    BOOST_CHECK_EQUAL(testPool.getProofIds().size(), 11);
    proofs.push_back(std::move(proof_seq10));

    auto proof_seq20 = buildProofWithSequence(20);
    BOOST_CHECK_EQUAL(testPool.addProofIfNoConflict(proof_seq20),
                      ProofPool::AddProofStatus::REJECTED);
    BOOST_CHECK_EQUAL(testPool.countProofs(), 11);
    BOOST_CHECK_EQUAL(testPool.getProofIds().size(), 11);

    // Removing proofs which are not in the pool will fail
    for (size_t i = 0; i < 10; i++) {
        BOOST_CHECK(!testPool.removeProof(ProofId(GetRandHash())));
    }
    BOOST_CHECK_EQUAL(testPool.countProofs(), 11);
    BOOST_CHECK_EQUAL(testPool.getProofIds().size(), 11);

    for (auto proof : proofs) {
        BOOST_CHECK(testPool.removeProof(proof->getId()));
    }
    BOOST_CHECK_EQUAL(testPool.size(), 0);
    BOOST_CHECK_EQUAL(testPool.countProofs(), 0);
    BOOST_CHECK_EQUAL(testPool.getProofIds().size(), 0);
}

BOOST_AUTO_TEST_CASE(rescan) {
    gArgs.ForceSetArg("-avaproofstakeutxoconfirmations", "1");
    ProofPool testPool;
    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, *Assert(m_node.chainman));

    testPool.rescan(pm);
    BOOST_CHECK_EQUAL(testPool.size(), 0);
    BOOST_CHECK_EQUAL(testPool.countProofs(), 0);
    BOOST_CHECK_EQUAL(testPool.getProofIds().size(), 0);

    // No peer should be created
    bool hasPeer = false;
    pm.forEachPeer([&](const Peer &p) { hasPeer = true; });
    BOOST_CHECK(!hasPeer);

    Chainstate &active_chainstate = Assert(m_node.chainman)->ActiveChainstate();

    std::set<ProofRef, ProofRefComparatorByAddress> poolProofs;
    for (size_t i = 0; i < 10; i++) {
        auto proof = buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE);
        BOOST_CHECK_EQUAL(testPool.addProofIfNoConflict(proof),
                          ProofPool::AddProofStatus::SUCCEED);
        poolProofs.insert(std::move(proof));
        BOOST_CHECK_EQUAL(testPool.countProofs(), i + 1);
        BOOST_CHECK_EQUAL(testPool.getProofIds().size(), i + 1);
    }

    testPool.rescan(pm);

    // All the proofs should be registered as peer
    std::set<ProofRef, ProofRefComparatorByAddress> pmProofs;
    pm.forEachPeer([&](const Peer &p) { pmProofs.insert(p.proof); });
    BOOST_CHECK_EQUAL_COLLECTIONS(poolProofs.begin(), poolProofs.end(),
                                  pmProofs.begin(), pmProofs.end());
    BOOST_CHECK_EQUAL(testPool.size(), 0);
    BOOST_CHECK_EQUAL(testPool.countProofs(), 0);
    BOOST_CHECK_EQUAL(testPool.getProofIds().size(), 0);

    gArgs.ClearForcedArg("-avaproofstakeutxoconfirmations");
}

BOOST_AUTO_TEST_CASE(proof_override) {
    ProofPool testPool;

    const CKey key = CKey::MakeCompressedKey();

    auto buildProofWithSequenceAndOutpoints =
        [&](uint64_t sequence, const std::vector<COutPoint> &outpoints) {
            ProofBuilder pb(sequence, 0, key, UNSPENDABLE_ECREG_PAYOUT_SCRIPT);
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
    BOOST_CHECK_EQUAL(testPool.countProofs(), 1);
    BOOST_CHECK_EQUAL(testPool.getProofIds().size(), 1);

    BOOST_CHECK_EQUAL(testPool.addProofIfPreferred(proof_seq20),
                      ProofPool::AddProofStatus::SUCCEED);
    BOOST_CHECK(testPool.getProof(proof_seq20->getId()));
    BOOST_CHECK_EQUAL(testPool.countProofs(), 2);
    BOOST_CHECK_EQUAL(testPool.getProofIds().size(), 2);

    BOOST_CHECK_EQUAL(testPool.addProofIfPreferred(proof_seq30),
                      ProofPool::AddProofStatus::SUCCEED);
    BOOST_CHECK(testPool.getProof(proof_seq30->getId()));
    BOOST_CHECK_EQUAL(testPool.countProofs(), 3);
    BOOST_CHECK_EQUAL(testPool.getProofIds().size(), 3);

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
    BOOST_CHECK_EQUAL(testPool.countProofs(), 3);
    BOOST_CHECK_EQUAL(testPool.getProofIds().size(), 3);
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
    BOOST_CHECK_EQUAL(testPool.countProofs(), 1);
    BOOST_CHECK_EQUAL(testPool.getProofIds().size(), 1);
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
        ProofBuilder pb(sequence, 0, key, UNSPENDABLE_ECREG_PAYOUT_SCRIPT);
        BOOST_CHECK(
            pb.addUTXO(conflictingOutpoint, 10 * COIN, 123456, false, key));
        return pb.build();
    };

    auto proofSeq10 = buildProofWithSequence(10);
    auto proofSeq20 = buildProofWithSequence(20);
    auto proofSeq30 = buildProofWithSequence(30);

    BOOST_CHECK_EQUAL(testPool.addProofIfNoConflict(proofSeq20),
                      ProofPool::AddProofStatus::SUCCEED);

    Chainstate &active_chainstate = Assert(m_node.chainman)->ActiveChainstate();

    auto getRandomConflictingProofSet = [&active_chainstate]() {
        return ProofPool::ConflictingProofSet{
            buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE),
            buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE),
            buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE),
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

    Chainstate &active_chainstate = Assert(m_node.chainman)->ActiveChainstate();

    for (size_t i = 0; i < 10; i++) {
        auto proof = buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE);
        BOOST_CHECK_EQUAL(testPool.addProofIfNoConflict(proof),
                          ProofPool::AddProofStatus::SUCCEED);

        auto retrievedProof = testPool.getProof(proof->getId());
        BOOST_CHECK_NE(retrievedProof, nullptr);
        BOOST_CHECK_EQUAL(retrievedProof->getId(), proof->getId());
    }
}

BOOST_AUTO_TEST_CASE(get_lowest_score_proof) {
    ProofPool testPool;
    BOOST_CHECK_EQUAL(testPool.getLowestScoreProof(), nullptr);

    const CKey key = CKey::MakeCompressedKey();
    auto buildProofWithRandomOutpoints = [&](uint32_t score) {
        int numOutpoints = InsecureRand32() % 10 + 1;
        ProofBuilder pb(0, 0, key, UNSPENDABLE_ECREG_PAYOUT_SCRIPT);
        for (int i = 0; i < numOutpoints; i++) {
            Amount amount = 1 * COIN;
            if (i == numOutpoints - 1) {
                // Last UTXO is the remainder
                amount =
                    (int64_t(score) * COIN) / 100 - (numOutpoints - 1) * COIN;
            }
            const COutPoint outpoint{TxId(GetRandHash()), 0};
            BOOST_CHECK(pb.addUTXO(outpoint, amount, 123456, false, key));
        }
        return pb.build();
    };

    // Add some proofs with different scores and check the lowest scoring proof
    for (int i = 9; i >= 0; i--) {
        auto proof = buildProofWithRandomOutpoints(MIN_VALID_PROOF_SCORE + i);
        BOOST_CHECK_EQUAL(testPool.addProofIfNoConflict(proof),
                          ProofPool::AddProofStatus::SUCCEED);
        auto checkLowestScoreProof = testPool.getLowestScoreProof();
        BOOST_CHECK_EQUAL(checkLowestScoreProof->getScore(),
                          MIN_VALID_PROOF_SCORE + i);
        BOOST_CHECK_EQUAL(checkLowestScoreProof->getId(), proof->getId());
    }
    BOOST_CHECK_EQUAL(testPool.countProofs(), 10);
    BOOST_CHECK_EQUAL(testPool.getProofIds().size(), 10);

    auto lowestScoreProof = testPool.getLowestScoreProof();

    // Adding more proofs doesn't change the lowest scoring proof
    for (size_t i = 1; i < 10; i++) {
        auto proof = buildProofWithRandomOutpoints(MIN_VALID_PROOF_SCORE + i);
        BOOST_CHECK_EQUAL(testPool.addProofIfNoConflict(proof),
                          ProofPool::AddProofStatus::SUCCEED);
        auto checkLowestScoreProof = testPool.getLowestScoreProof();
        BOOST_CHECK_EQUAL(checkLowestScoreProof->getScore(),
                          MIN_VALID_PROOF_SCORE);
        BOOST_CHECK_EQUAL(checkLowestScoreProof->getId(),
                          lowestScoreProof->getId());
    }
    BOOST_CHECK_EQUAL(testPool.countProofs(), 19);
    BOOST_CHECK_EQUAL(testPool.getProofIds().size(), 19);

    // Remove proofs by lowest score, checking the lowest score as we go
    for (int scoreCount = 1; scoreCount < 10; scoreCount++) {
        for (size_t i = 0; i < 2; i++) {
            BOOST_CHECK(
                testPool.removeProof(testPool.getLowestScoreProof()->getId()));
            BOOST_CHECK_EQUAL(testPool.getLowestScoreProof()->getScore(),
                              MIN_VALID_PROOF_SCORE + scoreCount);
        }
    }

    // Remove the last proof
    BOOST_CHECK(testPool.removeProof(testPool.getLowestScoreProof()->getId()));
    BOOST_CHECK_EQUAL(testPool.getLowestScoreProof(), nullptr);
    BOOST_CHECK_EQUAL(testPool.countProofs(), 0);
    BOOST_CHECK_EQUAL(testPool.getProofIds().size(), 0);
}

BOOST_AUTO_TEST_SUITE_END()
