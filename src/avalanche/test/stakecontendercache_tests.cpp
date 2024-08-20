// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/stakecontendercache.h>

#include <script/script.h>

#include <avalanche/test/util.h>
#include <test/util/random.h>
#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

#include <limits>

using namespace avalanche;

BOOST_FIXTURE_TEST_SUITE(stakecontendercache_tests, TestingSetup)

static void CheckWinners(StakeContenderCache &cache, BlockHash &prevblockhash,
                         std::vector<CScript> manualWinners,
                         std::vector<ProofRef> avalancheWinners) {
    std::vector<CScript> winners;
    size_t expectedSize = manualWinners.size() + avalancheWinners.size();
    if (expectedSize == 0) {
        BOOST_CHECK(!cache.getWinners(prevblockhash, winners));
        return;
    }

    BOOST_CHECK(cache.getWinners(prevblockhash, winners));
    BOOST_CHECK_EQUAL(winners.size(), expectedSize);

    // Manual winners are always first and in order
    for (size_t i = 0; i < manualWinners.size(); i++) {
        BOOST_CHECK(winners[i] == manualWinners[i]);
    }

    // Rest of the the winners are only those determined by avalanche.
    // For each winning payout script, find all avalancheWinners with the same
    // payout script.
    std::vector<std::vector<ProofRef>> possibleWinningProofs;
    for (auto it = std::next(winners.begin(), manualWinners.size());
         it != winners.end(); it++) {
        possibleWinningProofs.push_back(std::vector<ProofRef>());
        for (const auto &proof : avalancheWinners) {
            if (proof->getPayoutScript() == *it) {
                possibleWinningProofs.back().push_back(proof);
            }
        }
        BOOST_CHECK(possibleWinningProofs.back().size() > 0);
    }
    BOOST_CHECK_EQUAL(possibleWinningProofs.size(), avalancheWinners.size());

    // Verify the winner order such that the best (lowest) reward ranked proof's
    // payout script is always before payout scripts from proofs with worse
    // (higher) reward ranks.
    double previousRank = 0;
    for (auto possibleWinningProofList : possibleWinningProofs) {
        double lowestRank = std::numeric_limits<double>::max();
        for (const auto &proof : possibleWinningProofList) {
            double proofRank = StakeContenderId(prevblockhash, proof->getId())
                                   .ComputeProofRewardRank(proof->getScore());
            if (proofRank < lowestRank) {
                lowestRank = proofRank;
            }
        }

        BOOST_CHECK(previousRank < lowestRank);
        previousRank = lowestRank;
    }
}

BOOST_AUTO_TEST_CASE(winners_tests) {
    ChainstateManager &chainman = *Assert(m_node.chainman);
    Chainstate &active_chainstate = chainman.ActiveChainstate();
    StakeContenderCache cache;

    std::vector<CScript> manualWinners = {
        CScript() << OP_TRUE,
        CScript() << OP_FALSE,
    };

    std::vector<ProofRef> proofs;
    for (int i = 0; i < 4; i++) {
        proofs.push_back(
            buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE));
    }

    // Repeat these tests with multiple block hashes to ensure no unintended
    // modifications are made to other entries
    std::vector<BlockHash> blockhashes;
    for (int i = 0; i < 5; i++) {
        blockhashes.push_back(BlockHash{InsecureRand256()});
    }
    for (BlockHash &blockhash : blockhashes) {
        CheckWinners(cache, blockhash, {}, {});

        // Add a winner manually
        BOOST_CHECK(cache.addWinner(blockhash, manualWinners[0]));
        CheckWinners(cache, blockhash, {manualWinners[0]}, {});

        // Add some contenders
        // Local winner
        BOOST_CHECK(cache.add(blockhash, proofs[0],
                              StakeContenderStatus::ACCEPTED |
                                  StakeContenderStatus::IN_WINNER_SET));
        // Potential winner other than the local winner
        BOOST_CHECK(
            cache.add(blockhash, proofs[1], StakeContenderStatus::ACCEPTED));
        // Local winner that has been rejected by avalanche so far
        BOOST_CHECK(cache.add(blockhash, proofs[2],
                              StakeContenderStatus::IN_WINNER_SET));
        // Some other contender
        BOOST_CHECK(cache.add(blockhash, proofs[3]));

        // Attempting to add duplicates fails, even if status is different than
        // the successfully added entries.
        for (const auto &proof : proofs) {
            BOOST_CHECK(!cache.add(blockhash, proof));
            BOOST_CHECK(
                !cache.add(blockhash, proof, StakeContenderStatus::ACCEPTED));
            BOOST_CHECK(!cache.add(blockhash, proof,
                                   StakeContenderStatus::ACCEPTED |
                                       StakeContenderStatus::IN_WINNER_SET));
            BOOST_CHECK(!cache.add(blockhash, proof,
                                   StakeContenderStatus::IN_WINNER_SET));
        }

        CheckWinners(cache, blockhash, {manualWinners[0]},
                     {proofs[0], proofs[2]});

        // Add another manual winner. It always comes before contenders in the
        // winner set.
        BOOST_CHECK(cache.addWinner(blockhash, manualWinners[1]));
        CheckWinners(cache, blockhash, manualWinners, {proofs[0], proofs[2]});

        // Adding manual winners with the same payout scripts as contenders in
        // any state never causes conflicts
        std::vector<CScript> moreManualWinners = manualWinners;
        for (const auto &proof : proofs) {
            const auto &payout = proof->getPayoutScript();
            BOOST_CHECK(cache.addWinner(blockhash, payout));
            moreManualWinners.push_back(payout);
            CheckWinners(cache, blockhash, moreManualWinners,
                         {proofs[0], proofs[2]});
        }
        CheckWinners(cache, blockhash, moreManualWinners,
                     {proofs[0], proofs[2]});

        // Avalanche accepting all of the contenders does not change the winners
        // yet
        for (const auto &proof : proofs) {
            cache.accept(StakeContenderId(blockhash, proof->getId()));
        }
        CheckWinners(cache, blockhash, moreManualWinners,
                     {proofs[0], proofs[2]});

        // Avalanche rejecting all of the contenders does not change the winners
        // yet
        for (const auto &proof : proofs) {
            cache.reject(StakeContenderId(blockhash, proof->getId()));
        }
        CheckWinners(cache, blockhash, moreManualWinners,
                     {proofs[0], proofs[2]});

        // Avalanche finalizing a contender already in the winner set makes no
        // difference
        cache.finalize(StakeContenderId(blockhash, proofs[0]->getId()));
        CheckWinners(cache, blockhash, moreManualWinners,
                     {proofs[0], proofs[2]});

        // Avalanche invalidating a contender not in the winner set makes no
        // difference
        cache.invalidate(StakeContenderId(blockhash, proofs[3]->getId()));
        CheckWinners(cache, blockhash, moreManualWinners,
                     {proofs[0], proofs[2]});

        // Avalanche finalizing a contender that wasn't in the winner set before
        // makes a new winner
        cache.finalize(StakeContenderId(blockhash, proofs[1]->getId()));
        CheckWinners(cache, blockhash, moreManualWinners,
                     {proofs[0], proofs[1], proofs[2]});

        // Avalanche invalidating a contender that was in the winner set removes
        // it
        cache.invalidate(StakeContenderId(blockhash, proofs[2]->getId()));
        CheckWinners(cache, blockhash, moreManualWinners,
                     {proofs[0], proofs[1]});
    }

    // All contenders were added as manual winners at some point in this test,
    // so reflect that here.
    for (const auto &proof : proofs) {
        manualWinners.push_back(proof->getPayoutScript());
    }

    // Sanity check that past cached state was not poisoned
    for (BlockHash &blockhash : blockhashes) {
        CheckWinners(cache, blockhash, manualWinners, {proofs[0], proofs[1]});
    }
}

BOOST_AUTO_TEST_SUITE_END()
