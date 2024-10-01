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

BOOST_FIXTURE_TEST_SUITE(stakecontendercache_tests, TestChain100Setup)

static void CheckWinners(StakeContenderCache &cache,
                         const BlockHash &prevblockhash,
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

static void CheckVoteStatus(StakeContenderCache &cache,
                            const BlockHash &prevblockhash,
                            const ProofRef &proof, int expected) {
    BOOST_CHECK_EQUAL(
        cache.getVoteStatus(StakeContenderId(prevblockhash, proof->getId())),
        expected);
}

BOOST_AUTO_TEST_CASE(vote_status_tests) {
    Chainstate &active_chainstate = Assert(m_node.chainman)->ActiveChainstate();
    StakeContenderCache cache;

    CBlockIndex *pindex = active_chainstate.m_chain.Tip();
    const BlockHash &blockhash = pindex->GetBlockHash();

    std::vector<int> initialStatuses = {
        StakeContenderStatus::UNKNOWN, StakeContenderStatus::ACCEPTED,
        StakeContenderStatus::IN_WINNER_SET,
        StakeContenderStatus::ACCEPTED | StakeContenderStatus::IN_WINNER_SET};
    for (uint8_t initialStatus : initialStatuses) {
        auto proof = buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE);

        // Unknown contender
        CheckVoteStatus(cache, blockhash, proof, -1);

        // Add the contender and check its vote after avalanche updates
        BOOST_CHECK(cache.add(pindex, proof, initialStatus));
        CheckVoteStatus(cache, blockhash, proof,
                        !(initialStatus & StakeContenderStatus::ACCEPTED));

        cache.accept(StakeContenderId(blockhash, proof->getId()));
        CheckVoteStatus(cache, blockhash, proof, 0);

        cache.reject(StakeContenderId(blockhash, proof->getId()));
        CheckVoteStatus(cache, blockhash, proof, 1);

        cache.finalize(StakeContenderId(blockhash, proof->getId()));
        CheckVoteStatus(cache, blockhash, proof, 0);

        cache.invalidate(StakeContenderId(blockhash, proof->getId()));
        CheckVoteStatus(cache, blockhash, proof, 1);
    }
}

BOOST_AUTO_TEST_CASE(winners_tests) {
    Chainstate &active_chainstate = Assert(m_node.chainman)->ActiveChainstate();
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
    CBlockIndex *pindex = active_chainstate.m_chain.Tip();
    for (int i = 0; i < 5; i++) {
        const BlockHash &blockhash = pindex->GetBlockHash();
        CheckWinners(cache, blockhash, {}, {});

        // Add a winner manually
        BOOST_CHECK(cache.addWinner(pindex, manualWinners[0]));
        CheckWinners(cache, blockhash, {manualWinners[0]}, {});

        // Before adding contenders, check that vote status is unknown
        for (int p = 0; p < 4; p++) {
            CheckVoteStatus(cache, blockhash, proofs[p], -1);
        }

        // Add some contenders
        // Local winner
        BOOST_CHECK(cache.add(pindex, proofs[0],
                              StakeContenderStatus::ACCEPTED |
                                  StakeContenderStatus::IN_WINNER_SET));
        CheckVoteStatus(cache, blockhash, proofs[0], 0);

        // Potential winner other than the local winner
        BOOST_CHECK(
            cache.add(pindex, proofs[1], StakeContenderStatus::ACCEPTED));
        CheckVoteStatus(cache, blockhash, proofs[1], 0);

        // Local winner that has been rejected by avalanche so far
        BOOST_CHECK(
            cache.add(pindex, proofs[2], StakeContenderStatus::IN_WINNER_SET));
        CheckVoteStatus(cache, blockhash, proofs[2], 1);

        // Some other contender
        BOOST_CHECK(cache.add(pindex, proofs[3]));
        CheckVoteStatus(cache, blockhash, proofs[3], 1);

        // Attempting to add duplicates fails, even if status is different than
        // the successfully added entries.
        for (const auto &proof : proofs) {
            BOOST_CHECK(!cache.add(pindex, proof));
            BOOST_CHECK(
                !cache.add(pindex, proof, StakeContenderStatus::ACCEPTED));
            BOOST_CHECK(!cache.add(pindex, proof,
                                   StakeContenderStatus::ACCEPTED |
                                       StakeContenderStatus::IN_WINNER_SET));
            BOOST_CHECK(
                !cache.add(pindex, proof, StakeContenderStatus::IN_WINNER_SET));
        }

        CheckWinners(cache, blockhash, {manualWinners[0]},
                     {proofs[0], proofs[2]});

        // Add another manual winner. It always comes before contenders in the
        // winner set.
        BOOST_CHECK(cache.addWinner(pindex, manualWinners[1]));
        CheckWinners(cache, blockhash, manualWinners, {proofs[0], proofs[2]});

        // Adding manual winners with the same payout scripts as contenders in
        // any state never causes conflicts
        std::vector<CScript> moreManualWinners = manualWinners;
        for (const auto &proof : proofs) {
            const auto &payout = proof->getPayoutScript();
            BOOST_CHECK(cache.addWinner(pindex, payout));
            CheckVoteStatus(cache, blockhash, proof, 0);
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

        pindex = pindex->pprev;
    }

    // All contenders were added as manual winners at some point in this test,
    // so reflect that here.
    for (const auto &proof : proofs) {
        manualWinners.push_back(proof->getPayoutScript());
    }

    // Sanity check that past cached state was not poisoned
    pindex = active_chainstate.m_chain.Tip();
    for (int i = 0; i < 5; i++) {
        CheckWinners(cache, pindex->GetBlockHash(), manualWinners,
                     {proofs[0], proofs[1]});
        for (int p = 0; p < 4; p++) {
            CheckVoteStatus(cache, pindex->GetBlockHash(), proofs[p], 0);
        }
        pindex = pindex->pprev;
    }
}

BOOST_AUTO_TEST_CASE(cleanup_tests) {
    Chainstate &active_chainstate = Assert(m_node.chainman)->ActiveChainstate();
    StakeContenderCache cache;

    std::vector<ProofRef> proofs;
    for (int i = 0; i < 10; i++) {
        proofs.push_back(
            buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE));
    }

    CBlockIndex *pindex = active_chainstate.m_chain.Tip();
    std::vector<BlockHash> blockhashes;
    for (int i = 0; i < 3; i++) {
        BlockHash blockhash = pindex->GetBlockHash();
        blockhashes.push_back(blockhash);
        for (const auto &proof : proofs) {
            cache.add(pindex, proof, StakeContenderStatus::IN_WINNER_SET);
        }
        CheckWinners(cache, blockhash, {}, proofs);
        pindex = pindex->pprev;
    }

    // Cleaning up nonexistant entries has no impact
    for (int height : {0, 10, 50, 90, 98}) {
        cache.cleanup(height);
        CheckWinners(cache, blockhashes[0], {}, proofs);
        CheckWinners(cache, blockhashes[1], {}, proofs);
        CheckWinners(cache, blockhashes[2], {}, proofs);
    }

    // Cleanup oldest block in the cache
    cache.cleanup(99);
    CheckWinners(cache, blockhashes[0], {}, proofs);
    CheckWinners(cache, blockhashes[1], {}, proofs);
    CheckWinners(cache, blockhashes[2], {}, {});

    // Add only a local winner to the recently cleared block
    cache.addWinner(active_chainstate.m_chain.Tip()->pprev->pprev, CScript());
    CheckWinners(cache, blockhashes[0], {}, proofs);
    CheckWinners(cache, blockhashes[1], {}, proofs);
    CheckWinners(cache, blockhashes[2], {CScript()}, {});

    // Clean it up again
    cache.cleanup(99);
    CheckWinners(cache, blockhashes[0], {}, proofs);
    CheckWinners(cache, blockhashes[1], {}, proofs);
    CheckWinners(cache, blockhashes[2], {}, {});

    // Add a local winner to a block with winners already there, then clear it
    cache.addWinner(active_chainstate.m_chain.Tip()->pprev, CScript());
    CheckWinners(cache, blockhashes[0], {}, proofs);
    CheckWinners(cache, blockhashes[1], {CScript()}, proofs);
    CheckWinners(cache, blockhashes[2], {}, {});

    cache.cleanup(100);
    CheckWinners(cache, blockhashes[0], {}, proofs);
    CheckWinners(cache, blockhashes[1], {}, {});
    CheckWinners(cache, blockhashes[2], {}, {});

    // Invalidate proofs so they are no longer in the winner set
    for (const auto &proof : proofs) {
        cache.invalidate(StakeContenderId(blockhashes[0], proof->getId()));
    }
    CheckWinners(cache, blockhashes[0], {}, {});
    BOOST_CHECK(!cache.isEmpty());

    // Clean up the remaining block and the cache should be empty now
    cache.cleanup(101);
    BOOST_CHECK(cache.isEmpty());
    CheckWinners(cache, blockhashes[0], {}, {});
    CheckWinners(cache, blockhashes[1], {}, {});
    CheckWinners(cache, blockhashes[2], {}, {});

    // Cleaning up again has no effect
    cache.cleanup(101);
    BOOST_CHECK(cache.isEmpty());
    CheckWinners(cache, blockhashes[0], {}, {});
    CheckWinners(cache, blockhashes[1], {}, {});
    CheckWinners(cache, blockhashes[2], {}, {});

    // Add winners back with random states and sanity check that higher heights
    // clear the cache as we expect.
    for (int height : {102, 200, 1000, 1000000}) {
        pindex = active_chainstate.m_chain.Tip();
        for (size_t i = 0; i < 2; i++) {
            for (const auto &proof : proofs) {
                cache.add(pindex, proof, InsecureRandBits(2));
                cache.addWinner(pindex, CScript());
            }

            // Sanity check there are some winners
            std::vector<CScript> winners;
            BOOST_CHECK(cache.getWinners(blockhashes[i], winners));
            BOOST_CHECK(winners.size() >= 1);
            pindex = pindex->pprev;
        }

        // Cleaning up the cache at a height higher than any block results in an
        // empty cache and no winners.
        cache.cleanup(height);
        BOOST_CHECK(cache.isEmpty());
        CheckWinners(cache, blockhashes[0], {}, {});
        CheckWinners(cache, blockhashes[1], {}, {});
        CheckWinners(cache, blockhashes[2], {}, {});
    }
}

BOOST_AUTO_TEST_SUITE_END()
