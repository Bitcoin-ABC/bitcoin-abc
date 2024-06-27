// Copyright (c) 2021 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/proofcomparator.h>

#include <random.h>
#include <validation.h>

#include <avalanche/test/util.h>
#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

#include <cstdint>
#include <limits>
#include <memory>

using namespace avalanche;

BOOST_FIXTURE_TEST_SUITE(proofcomparator_tests, TestingSetup)

BOOST_AUTO_TEST_CASE(proof_shared_pointer_comparator) {
    Chainstate &active_chainstate = Assert(m_node.chainman)->ActiveChainstate();
    uint32_t score = MIN_VALID_PROOF_SCORE;

    auto proofMinScore =
        buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE);
    auto proofMaxScore = buildRandomProof(active_chainstate,
                                          std::numeric_limits<uint32_t>::max());

    const ProofComparatorByScore comparator;

    auto prevProof = proofMinScore;
    for (size_t i = 0; i < 100; i++) {
        score += 1000 + FastRandomContext().randrange<int>(10000);
        auto higherScoreProof = buildRandomProof(active_chainstate, score);
        BOOST_CHECK(comparator(higherScoreProof, proofMinScore));
        BOOST_CHECK(comparator(higherScoreProof, prevProof));
        BOOST_CHECK(!comparator(higherScoreProof, proofMaxScore));
        prevProof = higherScoreProof;
    }

    // Decrement slower than we incremented, so we don't have to check whether
    // the score reached the minimal value.
    for (size_t i = 0; i < 100; i++) {
        score -= 1 + FastRandomContext().randrange<int>(100);
        auto lowerScoreProof = buildRandomProof(active_chainstate, score);
        BOOST_CHECK(comparator(lowerScoreProof, proofMinScore));
        BOOST_CHECK(!comparator(lowerScoreProof, prevProof));
        BOOST_CHECK(!comparator(lowerScoreProof, proofMaxScore));
        prevProof = lowerScoreProof;
    }

    for (size_t i = 0; i < 100; i++) {
        auto anotherProofMinScore =
            buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE);
        BOOST_CHECK_EQUAL(comparator(anotherProofMinScore, proofMinScore),
                          anotherProofMinScore->getId() <
                              proofMinScore->getId());
    }
}

BOOST_AUTO_TEST_CASE(proofref_comparator_by_address) {
    Chainstate &active_chainstate = Assert(m_node.chainman)->ActiveChainstate();
    std::vector<ProofRef> proofs;
    for (size_t i = 0; i < 100; i++) {
        auto proof = buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE);
        proofs.push_back(std::move(proof));
    }

    std::set<ProofRef, ProofRefComparatorByAddress> sortedProofs(proofs.begin(),
                                                                 proofs.end());

    uintptr_t prevAddr = 0;
    for (const auto &p : sortedProofs) {
        BOOST_CHECK_GE(reinterpret_cast<uintptr_t>(p.get()), prevAddr);
        prevAddr = reinterpret_cast<uintptr_t>(p.get());
    }
}

BOOST_AUTO_TEST_SUITE_END()
