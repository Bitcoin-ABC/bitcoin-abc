// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/stakecontendercache.h>

#include <avalanche/rewardrankcomparator.h>

#include <algorithm>

namespace avalanche {

void StakeContenderCache::cleanup(const int requestedMinHeight) {
    // Do not cleanup past the last promoted height, otherwise we lose cached
    // remote proof data.
    const int minHeight = std::min(lastPromotedHeight, requestedMinHeight);

    std::set<BlockHash> hashesToErase;
    auto &mwHeightView = manualWinners.get<by_blockheight>();
    for (auto it = mwHeightView.begin();
         it != mwHeightView.lower_bound(minHeight); it++) {
        hashesToErase.insert(it->prevblockhash);
    }

    auto &cHeightView = contenders.get<by_blockheight>();
    for (auto it = cHeightView.begin();
         it != cHeightView.lower_bound(minHeight); it++) {
        hashesToErase.insert(it->prevblockhash);
    }

    for (const auto &blockhash : hashesToErase) {
        auto &mwHashView = manualWinners.get<by_prevblockhash>();
        auto [mwHashBegin, mwHashEnd] = mwHashView.equal_range(blockhash);
        mwHashView.erase(mwHashBegin, mwHashEnd);

        auto &cHashView = contenders.get<by_prevblockhash>();
        auto [cHashBegin, cHashEnd] = cHashView.equal_range(blockhash);
        cHashView.erase(cHashBegin, cHashEnd);
    }
}

bool StakeContenderCache::add(const CBlockIndex *pindex, const ProofRef &proof,
                              uint8_t status) {
    return contenders
        .emplace(pindex->GetBlockHash(), pindex->nHeight, proof->getId(),
                 status, proof->getPayoutScript(), proof->getScore())
        .second;
}

void StakeContenderCache::promoteToBlock(
    const CBlockIndex *activeTip,
    std::function<bool(const ProofId &proofid)> const &shouldPromote) {
    // "Promote" past contenders to activeTip and check that those contenders
    // are still valid proofs to be stake winners. This is done because new
    // stake contenders are only added when a new proof is seen for the first
    // time. We need to persist the cached payout scripts and proof scores since
    // they are not guaranteed to be stored by peerManager.
    const BlockHash &blockhash = activeTip->GetBlockHash();
    const int height = activeTip->nHeight;
    lastPromotedHeight = height;
    for (auto &contender : contenders) {
        const ProofId &proofid = contender.proofid;
        if (shouldPromote(proofid)) {
            contenders.emplace(blockhash, height, proofid,
                               StakeContenderStatus::UNKNOWN,
                               contender.payoutScriptPubkey, contender.score);
        }
    }
}

bool StakeContenderCache::setWinners(
    const CBlockIndex *pindex, const std::vector<CScript> &payoutScripts) {
    const BlockHash &prevblockhash = pindex->GetBlockHash();
    auto &view = manualWinners.get<by_prevblockhash>();
    auto it = view.find(prevblockhash);
    if (it == view.end()) {
        return manualWinners
            .emplace(prevblockhash, pindex->nHeight, payoutScripts)
            .second;
    }
    return manualWinners.replace(
        it, ManualWinners(prevblockhash, pindex->nHeight, payoutScripts));
}

bool StakeContenderCache::accept(const StakeContenderId &contenderId) {
    auto &view = contenders.get<by_stakecontenderid>();
    auto it = view.find(contenderId);
    if (it == view.end()) {
        return false;
    }

    return contenders.modify(it, [&](StakeContenderCacheEntry &entry) {
        entry.status |= StakeContenderStatus::ACCEPTED;
    });
}

bool StakeContenderCache::finalize(const StakeContenderId &contenderId) {
    auto &view = contenders.get<by_stakecontenderid>();
    auto it = view.find(contenderId);
    if (it == view.end()) {
        return false;
    }

    return contenders.modify(it, [&](StakeContenderCacheEntry &entry) {
        entry.status |= StakeContenderStatus::ACCEPTED |
                        StakeContenderStatus::IN_WINNER_SET;
    });
}

bool StakeContenderCache::reject(const StakeContenderId &contenderId) {
    auto &view = contenders.get<by_stakecontenderid>();
    auto it = view.find(contenderId);
    if (it == view.end()) {
        return false;
    }

    return contenders.modify(it, [&](StakeContenderCacheEntry &entry) {
        entry.status &= ~StakeContenderStatus::ACCEPTED;
    });
}

int StakeContenderCache::getVoteStatus(const StakeContenderId &contenderId,
                                       BlockHash &prevblockhashout) const {
    auto &view = contenders.get<by_stakecontenderid>();
    auto it = view.find(contenderId);
    if (it == view.end()) {
        return -1;
    }

    prevblockhashout = it->prevblockhash;

    // Contender is accepted
    if (it->isAccepted()) {
        return 0;
    }

    // If the contender matches a manual winner, it is accepted.
    auto &manualWinnersView = manualWinners.get<by_prevblockhash>();
    auto manualWinnerIt = manualWinnersView.find(it->prevblockhash);
    if (manualWinnerIt != manualWinners.end()) {
        for (auto &payoutScript : manualWinnerIt->payoutScripts) {
            if (payoutScript == it->payoutScriptPubkey) {
                return 0;
            }
        }
    }

    // Contender is rejected
    return 1;
}

size_t StakeContenderCache::getPollableContenders(
    const BlockHash &prevblockhash, size_t maxPollable,
    std::vector<StakeContenderId> &pollableContenders) const {
    std::vector<const StakeContenderCacheEntry *> rankedContenders;
    auto &view = contenders.get<by_prevblockhash>();
    auto [begin, end] = view.equal_range(prevblockhash);
    for (auto it = begin; it != end; it++) {
        rankedContenders.push_back(&(*it));
    }

    // First sort all contenders with accepted contenders first
    std::sort(rankedContenders.begin(), rankedContenders.end(),
              [](const StakeContenderCacheEntry *left,
                 const StakeContenderCacheEntry *right) {
                  if (left->isAccepted() != right->isAccepted()) {
                      // Accepted contenders sort first
                      return left->isAccepted();
                  }

                  double leftRank = left->computeRewardRank();
                  double rightRank = right->computeRewardRank();
                  const StakeContenderId &leftContenderId =
                      left->getStakeContenderId();
                  const StakeContenderId &rightContenderId =
                      right->getStakeContenderId();
                  return RewardRankComparator()(leftContenderId, leftRank,
                                                left->proofid, rightContenderId,
                                                rightRank, right->proofid);
              });

    // Sort again, only by reward rank, and only up to the max number of
    // pollable contenders.
    size_t numPollable = std::min(rankedContenders.size(), maxPollable);
    std::sort(rankedContenders.begin(), rankedContenders.begin() + numPollable,
              [](const StakeContenderCacheEntry *left,
                 const StakeContenderCacheEntry *right) {
                  double leftRank = left->computeRewardRank();
                  double rightRank = right->computeRewardRank();
                  const StakeContenderId &leftContenderId =
                      left->getStakeContenderId();
                  const StakeContenderId &rightContenderId =
                      right->getStakeContenderId();
                  return RewardRankComparator()(leftContenderId, leftRank,
                                                left->proofid, rightContenderId,
                                                rightRank, right->proofid);
              });

    // Only return up to the maximum number of contenders
    pollableContenders.clear();
    pollableContenders.reserve(numPollable);
    for (size_t i = 0; i < numPollable; i++) {
        pollableContenders.push_back(
            rankedContenders[i]->getStakeContenderId());
    }

    return pollableContenders.size();
}

bool StakeContenderCache::getWinners(
    const BlockHash &prevblockhash,
    std::vector<std::pair<ProofId, CScript>> &winners) const {
    // Winners determined by avalanche are sorted by reward rank
    std::vector<const StakeContenderCacheEntry *> rankedWinners;
    auto &view = contenders.get<by_prevblockhash>();
    auto [begin, end] = view.equal_range(prevblockhash);
    for (auto it = begin; it != end; it++) {
        if (it->isInWinnerSet()) {
            rankedWinners.push_back(&(*it));
        }
    }

    std::sort(rankedWinners.begin(), rankedWinners.end(),
              [](const StakeContenderCacheEntry *left,
                 const StakeContenderCacheEntry *right) {
                  if (left->isAccepted() != right->isAccepted()) {
                      // Accepted contenders sort first
                      return left->isAccepted();
                  }

                  double leftRank = left->computeRewardRank();
                  double rightRank = right->computeRewardRank();
                  const StakeContenderId &leftContenderId =
                      left->getStakeContenderId();
                  const StakeContenderId &rightContenderId =
                      right->getStakeContenderId();
                  return RewardRankComparator()(leftContenderId, leftRank,
                                                left->proofid, rightContenderId,
                                                rightRank, right->proofid);
              });

    winners.clear();

    // Add manual winners first, preserving order
    auto &manualWinnersView = manualWinners.get<by_prevblockhash>();
    auto manualWinnerIt = manualWinnersView.find(prevblockhash);
    if (manualWinnerIt != manualWinners.end()) {
        winners.reserve(manualWinnerIt->payoutScripts.size() +
                        rankedWinners.size());

        for (auto &payoutScript : manualWinnerIt->payoutScripts) {
            winners.push_back({ProofId(), payoutScript});
        }
    } else {
        winners.reserve(rankedWinners.size());
    }

    // Add ranked winners, preserving reward rank order
    for (const auto &rankedWinner : rankedWinners) {
        winners.push_back(
            {rankedWinner->proofid, rankedWinner->payoutScriptPubkey});
    }

    return winners.size() > 0;
}

} // namespace avalanche
