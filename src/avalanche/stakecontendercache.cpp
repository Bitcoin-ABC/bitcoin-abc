// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/stakecontendercache.h>

#include <avalanche/peermanager.h>

namespace avalanche {

void StakeContenderCache::cleanup(const int minHeight) {
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

void StakeContenderCache::promoteToBlock(const CBlockIndex *activeTip,
                                         PeerManager &pm) {
    // "Promote" past contenders to activeTip and check that those contenders
    // are still valid proofs to be stake winners. This is done because new
    // stake contenders are only added when a new proof is seen for the first
    // time. We need to persist the cached payout scripts and proof scores since
    // they are not guaranteed to be stored by peerManager.
    const BlockHash &blockhash = activeTip->GetBlockHash();
    const int height = activeTip->nHeight;
    for (auto &contender : contenders) {
        const ProofId &proofid = contender.proofid;
        if (pm.isRemoteProof(proofid) &&
            (pm.isBoundToPeer(proofid) || pm.isDangling(proofid))) {
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

bool StakeContenderCache::invalidate(const StakeContenderId &contenderId) {
    auto &view = contenders.get<by_stakecontenderid>();
    auto it = view.find(contenderId);
    if (it == view.end()) {
        return false;
    }

    return contenders.modify(it, [&](StakeContenderCacheEntry &entry) {
        entry.status &= ~(StakeContenderStatus::ACCEPTED |
                          StakeContenderStatus::IN_WINNER_SET);
    });
}

int StakeContenderCache::getVoteStatus(
    const StakeContenderId &contenderId) const {
    auto &view = contenders.get<by_stakecontenderid>();
    auto it = view.find(contenderId);
    if (it == view.end()) {
        return -1;
    }

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

bool StakeContenderCache::getWinners(const BlockHash &prevblockhash,
                                     std::vector<CScript> &payouts) const {
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
                  return left->computeRewardRank() < right->computeRewardRank();
              });

    payouts.clear();

    // Add manual winners first, preserving order
    auto &manualWinnersView = manualWinners.get<by_prevblockhash>();
    auto manualWinnerIt = manualWinnersView.find(prevblockhash);
    if (manualWinnerIt != manualWinners.end()) {
        payouts.reserve(manualWinnerIt->payoutScripts.size() +
                        rankedWinners.size());

        payouts.insert(payouts.begin(), manualWinnerIt->payoutScripts.begin(),
                       manualWinnerIt->payoutScripts.end());
    } else {
        payouts.reserve(rankedWinners.size());
    }

    // Add ranked winners, preserving reward rank order
    for (const auto &rankedWinner : rankedWinners) {
        payouts.push_back(rankedWinner->payoutScriptPubkey);
    }

    return payouts.size() > 0;
}

} // namespace avalanche
