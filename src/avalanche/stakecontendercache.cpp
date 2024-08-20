// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/stakecontendercache.h>

namespace avalanche {

bool StakeContenderCache::add(const BlockHash &prevblockhash,
                              const ProofRef &proof, uint8_t status) {
    return contenders
        .emplace(prevblockhash, proof->getId(), status,
                 proof->getPayoutScript(), proof->getScore())
        .second;
}

bool StakeContenderCache::addWinner(const BlockHash &prevblockhash,
                                    const CScript &payoutScript) {
    std::vector<CScript> payoutScripts;
    auto it = manualWinners.find(prevblockhash);
    if (it != manualWinners.end()) {
        payoutScripts = it->second;
    }

    payoutScripts.push_back(payoutScript);

    manualWinners.insert_or_assign(prevblockhash, payoutScripts);
    return true;
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

bool StakeContenderCache::getWinners(const BlockHash &prevblockhash,
                                     std::vector<CScript> &payouts) {
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
    auto manualWinnerIt = manualWinners.find(prevblockhash);
    if (manualWinnerIt != manualWinners.end()) {
        payouts.reserve(manualWinnerIt->second.size() + rankedWinners.size());

        payouts.insert(payouts.begin(), manualWinnerIt->second.begin(),
                       manualWinnerIt->second.end());
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
