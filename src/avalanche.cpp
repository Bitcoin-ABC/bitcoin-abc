// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "avalanche.h"

#include "chain.h"
#include "netmessagemaker.h"
#include "scheduler.h"
#include "validation.h"

bool AvalancheProcessor::addBlockToReconcile(const CBlockIndex *pindex) {
    return vote_records.getWriteView()
        ->insert(std::make_pair(pindex, VoteRecord()))
        .second;
}

static const VoteRecord *GetRecord(
    const RWCollection<std::map<const CBlockIndex *, VoteRecord>> &vote_records,
    const CBlockIndex *pindex) {
    auto r = vote_records.getReadView();
    auto it = r->find(pindex);
    if (it == r.end()) {
        return nullptr;
    }

    return &it->second;
}

bool AvalancheProcessor::isAccepted(const CBlockIndex *pindex) const {
    if (auto vr = GetRecord(vote_records, pindex)) {
        return vr->isValid();
    }

    return false;
}

bool AvalancheProcessor::hasFinalized(const CBlockIndex *pindex) const {
    if (auto vr = GetRecord(vote_records, pindex)) {
        return vr->hasFinalized();
    }

    return false;
}

bool AvalancheProcessor::registerVotes(const AvalancheResponse &response) {
    const std::vector<AvalancheVote> &votes = response.GetVotes();

    std::map<const CBlockIndex *, AvalancheVote> responseIndex;

    {
        LOCK(cs_main);
        for (auto &v : votes) {
            BlockMap::iterator mi = mapBlockIndex.find(v.GetHash());
            if (mi == mapBlockIndex.end()) {
                // This should not happen, but just in case...
                continue;
            }

            responseIndex.insert(std::make_pair(mi->second, v));
        }
    }

    {
        // Register votes.
        auto w = vote_records.getWriteView();
        for (auto &p : responseIndex) {
            const CBlockIndex *pindex = p.first;
            const AvalancheVote &v = p.second;

            w[pindex].registerVote(v.IsValid());
        }
    }

    return true;
}
