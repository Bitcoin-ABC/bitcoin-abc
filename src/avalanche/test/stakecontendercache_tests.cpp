// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/stakecontendercache.h>

#include <avalanche/peermanager.h>
#include <script/script.h>

#include <avalanche/test/util.h>
#include <test/util/random.h>
#include <test/util/setup_common.h>
#include <util/time.h>

#include <boost/test/unit_test.hpp>

#include <limits>

using namespace avalanche;

namespace {
struct PeerManagerFixture : public TestChain100Setup {
    PeerManagerFixture() {
        gArgs.ForceSetArg("-avaproofstakeutxoconfirmations", "1");
    }
    ~PeerManagerFixture() {
        gArgs.ClearForcedArg("-avaproofstakeutxoconfirmations");
    }
};
} // namespace

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
    BlockHash checkprevblockhash;
    BOOST_CHECK_EQUAL(
        cache.getVoteStatus(StakeContenderId(prevblockhash, proof->getId()),
                            checkprevblockhash),
        expected);
    if (expected != -1) {
        BOOST_CHECK_EQUAL(prevblockhash, checkprevblockhash);
    }
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

        // Add the proof as a manual winner. It should always be accepted.
        BOOST_CHECK(cache.setWinners(pindex, {proof->getPayoutScript()}));
        CheckVoteStatus(cache, blockhash, proof, 0);
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
        BOOST_CHECK(cache.setWinners(pindex, {manualWinners[0]}));
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
        BOOST_CHECK(cache.setWinners(pindex, manualWinners));
        CheckWinners(cache, blockhash, manualWinners, {proofs[0], proofs[2]});

        // Adding manual winners with the same payout scripts as contenders in
        // any state never causes conflicts
        std::vector<CScript> moreManualWinners = manualWinners;
        for (const auto &proof : proofs) {
            moreManualWinners.push_back(proof->getPayoutScript());
            BOOST_CHECK(cache.setWinners(pindex, moreManualWinners));
            CheckVoteStatus(cache, blockhash, proof, 0);
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
    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, *Assert(m_node.chainman));

    std::vector<ProofRef> proofs;
    for (int i = 0; i < 10; i++) {
        proofs.push_back(
            buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE));
    }

    CBlockIndex *pindex = active_chainstate.m_chain.Tip();
    std::vector<BlockHash> blockhashes{pindex->GetBlockHash()};
    pindex = pindex->pprev;
    for (int i = 0; i < 3; i++) {
        BlockHash blockhash = pindex->GetBlockHash();
        blockhashes.push_back(blockhash);
        for (const auto &proof : proofs) {
            cache.add(pindex, proof, StakeContenderStatus::IN_WINNER_SET);
        }
        CheckWinners(cache, blockhash, {}, proofs);
        pindex = pindex->pprev;
    }

    // Promote up to the height that we will allow cleanup of the cache. Note
    // that no entries are actually promoted since it uses a dummy peer manager.
    pindex = active_chainstate.m_chain.Tip()->pprev->pprev->pprev;
    BOOST_CHECK_EQUAL(pindex->nHeight, 97);
    cache.promoteToBlock(pindex, pm);

    // Cleaning up nonexistant entries has no impact
    for (int height : {0, 10, 50, 90, 97}) {
        cache.cleanup(height);
        CheckWinners(cache, blockhashes[0], {}, {});
        CheckWinners(cache, blockhashes[1], {}, proofs);
        CheckWinners(cache, blockhashes[2], {}, proofs);
        CheckWinners(cache, blockhashes[3], {}, proofs);
    }

    // Try to cleanup oldest block in the cache, except promotion at that height
    // hasn't happened yet so cleanup has no effect.
    cache.cleanup(98);
    CheckWinners(cache, blockhashes[0], {}, {});
    CheckWinners(cache, blockhashes[1], {}, proofs);
    CheckWinners(cache, blockhashes[2], {}, proofs);
    CheckWinners(cache, blockhashes[3], {}, proofs);

    // Promote up to that height
    cache.promoteToBlock(active_chainstate.m_chain.Tip()->pprev->pprev, pm);

    // Cleaning up the oldest block in the cache succeeds now
    cache.cleanup(98);
    CheckWinners(cache, blockhashes[0], {}, {});
    CheckWinners(cache, blockhashes[1], {}, proofs);
    CheckWinners(cache, blockhashes[2], {}, proofs);
    CheckWinners(cache, blockhashes[3], {}, {});

    // Add only a local winner to the recently cleared block
    cache.setWinners(active_chainstate.m_chain.Tip()->pprev->pprev->pprev,
                     {CScript()});
    CheckWinners(cache, blockhashes[0], {}, {});
    CheckWinners(cache, blockhashes[1], {}, proofs);
    CheckWinners(cache, blockhashes[2], {}, proofs);
    CheckWinners(cache, blockhashes[3], {CScript()}, {});

    // Clean it up again
    cache.cleanup(98);
    CheckWinners(cache, blockhashes[0], {}, {});
    CheckWinners(cache, blockhashes[1], {}, proofs);
    CheckWinners(cache, blockhashes[2], {}, proofs);
    CheckWinners(cache, blockhashes[3], {}, {});

    // Add a local winner to a block with winners already there, then clear it
    cache.setWinners(active_chainstate.m_chain.Tip()->pprev->pprev,
                     {CScript()});
    CheckWinners(cache, blockhashes[0], {}, {});
    CheckWinners(cache, blockhashes[1], {}, proofs);
    CheckWinners(cache, blockhashes[2], {CScript()}, proofs);
    CheckWinners(cache, blockhashes[3], {}, {});

    cache.promoteToBlock(active_chainstate.m_chain.Tip()->pprev, pm);
    cache.cleanup(99);
    CheckWinners(cache, blockhashes[0], {}, {});
    CheckWinners(cache, blockhashes[1], {}, proofs);
    CheckWinners(cache, blockhashes[2], {}, {});
    CheckWinners(cache, blockhashes[3], {}, {});

    // Invalidate proofs so they are no longer in the winner set
    for (const auto &proof : proofs) {
        cache.invalidate(StakeContenderId(blockhashes[1], proof->getId()));
    }
    CheckWinners(cache, blockhashes[0], {}, {});
    CheckWinners(cache, blockhashes[1], {}, {});
    CheckWinners(cache, blockhashes[2], {}, {});
    CheckWinners(cache, blockhashes[3], {}, {});
    BOOST_CHECK(!cache.isEmpty());

    // Clean up the remaining block and the cache should be empty now
    cache.promoteToBlock(active_chainstate.m_chain.Tip(), pm);
    cache.cleanup(100);
    BOOST_CHECK(cache.isEmpty());
    CheckWinners(cache, blockhashes[0], {}, {});
    CheckWinners(cache, blockhashes[1], {}, {});
    CheckWinners(cache, blockhashes[2], {}, {});
    CheckWinners(cache, blockhashes[3], {}, {});

    // Cleaning up again has no effect
    cache.cleanup(100);
    BOOST_CHECK(cache.isEmpty());
    CheckWinners(cache, blockhashes[0], {}, {});
    CheckWinners(cache, blockhashes[1], {}, {});
    CheckWinners(cache, blockhashes[2], {}, {});
    CheckWinners(cache, blockhashes[3], {}, {});

    // Add winners back with random states and sanity check that higher heights
    // clear the cache as we expect.
    for (int height : {102, 200, 1000, 1000000}) {
        pindex = active_chainstate.m_chain.Tip()->pprev;
        for (size_t i = 1; i < 3; i++) {
            for (const auto &proof : proofs) {
                cache.add(pindex, proof, InsecureRandBits(2));
                cache.setWinners(pindex, {CScript()});
            }

            // Sanity check there are some winners
            std::vector<CScript> winners;
            BOOST_CHECK(cache.getWinners(blockhashes[i], winners));
            BOOST_CHECK(winners.size() >= 1);
            pindex = pindex->pprev;
        }

        // Cleaning up the cache at a height higher than any cache entry results
        // in an empty cache and no winners.
        cache.cleanup(height);
        BOOST_CHECK(cache.isEmpty());
        CheckWinners(cache, blockhashes[0], {}, {});
        CheckWinners(cache, blockhashes[1], {}, {});
        CheckWinners(cache, blockhashes[2], {}, {});
        CheckWinners(cache, blockhashes[3], {}, {});
    }

    // But note that the cache will never cleanup higher than the last promoted
    // block.
    cache.add(active_chainstate.m_chain.Tip(), proofs[0],
              StakeContenderStatus::IN_WINNER_SET);
    for (int height : {102, 200, 1000, 1000000}) {
        cache.cleanup(height);
        CheckWinners(cache, blockhashes[0], {}, {proofs[0]});
        CheckWinners(cache, blockhashes[1], {}, {});
        CheckWinners(cache, blockhashes[2], {}, {});
        CheckWinners(cache, blockhashes[3], {}, {});
    }
}

BOOST_FIXTURE_TEST_CASE(promote_tests, PeerManagerFixture) {
    Chainstate &active_chainstate = Assert(m_node.chainman)->ActiveChainstate();
    StakeContenderCache cache;

    avalanche::PeerManager pm(PROOF_DUST_THRESHOLD, *Assert(m_node.chainman));
    std::vector<ProofRef> proofs;
    for (size_t i = 0; i < 3; i++) {
        auto proof = buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE);
        proofs.push_back(proof);
        const ProofId &proofid = proof->getId();

        // Register the proof so that it is a peer
        BOOST_CHECK(pm.registerProof(proof));
        pm.addNode(0, proofid);
        BOOST_CHECK(pm.isBoundToPeer(proofid));

        // Our peers also have this proof
        pm.saveRemoteProof(proofid, 0, true);
    }

    CBlockIndex *pindex = active_chainstate.m_chain.Tip();
    const CBlockIndex *tip = pindex;
    std::vector<BlockHash> blockhashes;
    for (size_t i = 0; i < 3; i++) {
        blockhashes.push_back(pindex->GetBlockHash());
        pindex = pindex->pprev;
    }

    // Add one proof each to the cache for some early blocks
    for (size_t i = 0; i < 3; i++) {
        BlockHash blockhash = pindex->GetBlockHash();
        blockhashes.push_back(blockhash);
        cache.add(pindex, proofs[i], StakeContenderStatus::IN_WINNER_SET);
        CheckWinners(cache, blockhash, {}, {proofs[i]});
        pindex = pindex->pprev;
    }

    // Attempting to cleanup the cache before promotion has occurred has no
    // effect.
    for (int height = 95; height <= 100; height++) {
        cache.cleanup(height);
        CheckWinners(cache, blockhashes[0], {}, {});
        CheckWinners(cache, blockhashes[1], {}, {});
        CheckWinners(cache, blockhashes[2], {}, {});
        CheckWinners(cache, blockhashes[3], {}, {proofs[0]});
        CheckWinners(cache, blockhashes[4], {}, {proofs[1]});
        CheckWinners(cache, blockhashes[5], {}, {proofs[2]});
    }

    // Promote contenders, but they are not winners at that block yet
    cache.promoteToBlock(tip->pprev->pprev, pm);
    CheckWinners(cache, blockhashes[0], {}, {});
    CheckWinners(cache, blockhashes[1], {}, {});
    CheckWinners(cache, blockhashes[2], {}, {});
    for (auto &proof : proofs) {
        // Contenders are unknown for blocks with no cache entries
        CheckVoteStatus(cache, blockhashes[0], proof, -1);
        CheckVoteStatus(cache, blockhashes[1], proof, -1);
        // Contenders are not winners yet at the promoted block
        CheckVoteStatus(cache, blockhashes[2], proof, 1);
    }

    // The contenders are still winners for their respective blocks
    CheckWinners(cache, blockhashes[3], {}, {proofs[0]});
    CheckWinners(cache, blockhashes[4], {}, {proofs[1]});
    CheckWinners(cache, blockhashes[5], {}, {proofs[2]});

    // Cleaning up the cache leaves most recent promoted entries alone
    cache.cleanup(98);
    CheckWinners(cache, blockhashes[0], {}, {});
    CheckWinners(cache, blockhashes[1], {}, {});
    CheckWinners(cache, blockhashes[2], {}, {});
    for (auto &proof : proofs) {
        // Contenders are unknown for blocks with no cache entries
        CheckVoteStatus(cache, blockhashes[0], proof, -1);
        CheckVoteStatus(cache, blockhashes[1], proof, -1);
        // Contenders at the promoted block are rejected
        CheckVoteStatus(cache, blockhashes[2], proof, 1);
    }
    CheckWinners(cache, blockhashes[3], {}, {});
    CheckWinners(cache, blockhashes[4], {}, {});
    CheckWinners(cache, blockhashes[5], {}, {});

    // Finalize those proofs
    for (auto &proof : proofs) {
        cache.finalize(StakeContenderId(blockhashes[2], proof->getId()));
        // Contenders are unknown for blocks with no cache entries
        CheckVoteStatus(cache, blockhashes[0], proof, -1);
        CheckVoteStatus(cache, blockhashes[1], proof, -1);
        // Contenders at the promoted block are now accepted
        CheckVoteStatus(cache, blockhashes[2], proof, 0);
    }
    CheckWinners(cache, blockhashes[0], {}, {});
    CheckWinners(cache, blockhashes[1], {}, {});
    CheckWinners(cache, blockhashes[2], {}, proofs);

    // Now advance the tip and invalidate a proof
    pm.rejectProof(proofs[2]->getId(),
                   avalanche::PeerManager::RejectionMode::INVALIDATE);
    cache.promoteToBlock(tip->pprev, pm);
    for (auto &proof : proofs) {
        // Contenders are unknown for blocks with no cache entries
        CheckVoteStatus(cache, blockhashes[0], proof, -1);
    }
    CheckVoteStatus(cache, blockhashes[1], proofs[0], 1);
    CheckVoteStatus(cache, blockhashes[1], proofs[1], 1);
    CheckVoteStatus(cache, blockhashes[1], proofs[2], -1);

    // Make the other proofs dangling
    pm.removeNode(0);
    SetMockTime(GetTime() + 15 * 60);
    std::unordered_set<ProofRef, SaltedProofHasher> registeredProofs;
    pm.cleanupDanglingProofs(registeredProofs);
    BOOST_CHECK(pm.isDangling(proofs[0]->getId()));
    BOOST_CHECK(pm.isDangling(proofs[1]->getId()));

    // Re-add those proofs as remote proofs
    pm.saveRemoteProof(proofs[0]->getId(), 0, true);
    pm.saveRemoteProof(proofs[1]->getId(), 0, true);

    // Dangling remote proofs still promote like peers do
    cache.promoteToBlock(tip, pm);
    CheckVoteStatus(cache, blockhashes[0], proofs[0], 1);
    CheckVoteStatus(cache, blockhashes[0], proofs[1], 1);
    CheckVoteStatus(cache, blockhashes[0], proofs[2], -1);

    // But they aren't winners yet and that's expected
    CheckWinners(cache, blockhashes[0], {}, {});
}

BOOST_AUTO_TEST_SUITE_END()
